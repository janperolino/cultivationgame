// The breakthrough scene while you play (design § Cultivation, Breakthroughs; core/scene.ts): an
// attended qi attempt plays for ten seconds on the Abode's figure, then rolls. Like the seat's
// attention, the scene is the session's and never saved; the store's loop ends it on time, even
// with the tab hidden, and rolls with what was caught. Drawing only reads it.
import { create } from 'zustand';
import { SCENE_OUTCOME_S } from '../content/scene.ts';
import { BAR_CAP } from '../content/cultivation.ts';
import { barFill, majorCheck, minorOdds, nextStep } from '../core/cultivation.ts';
import { newScene, sceneOver, tapScene, type Scene } from '../core/scene.ts';
import type { GameState } from '../core/state.ts';

export interface SceneOutcome {
  success: boolean;
  major: boolean;
  odds: number;
  /** Page time it was rolled, in ms. */
  at: number;
}

export interface ScenePlay {
  /** The life it belongs to, and the step it was started on. */
  key: string;
  from: { realm: string; stage: number };
  major: boolean;
  /** The odds before the scene, and whether the step always holds (layers 1 and 2). */
  odds: number;
  certain: boolean;
  /** Page time it started, in ms. */
  started: number;
  scene: Scene;
  outcome: SceneOutcome | null;
}

interface SceneStore {
  play: ScenePlay | null;
  /** "Consolidate": the moment stays quiet on this step until the bar passes this fill. */
  quietUntil: { key: string; fill: number } | null;
}

export const useScene = create<SceneStore>()(() => ({ play: null, quietUntil: null }));

export const lifeKey = (s: GameState) => `${s.lineage.id}/${s.lineage.life}/${s.seed}`;
/** The life and the qi's step, so consolidating is forgotten once the step is tried. */
const stepKey = (s: GameState) =>
  `${lifeKey(s)}/${s.player.qi.realm}/${s.player.qi.stage}/${s.player.qi.unsettledUntil}`;

/** Scene seconds now. */
export function sceneTime(p: ScenePlay, now = performance.now()): number {
  return (now - p.started) / 1000;
}

/** A scene runs and has not rolled yet. */
export function scenePlaying(): boolean {
  const p = useScene.getState().play;
  return !!p && !p.outcome;
}

/** What the qi's next breakthrough would roll at now, or null when it can't be tried. */
export function qiAttempt(s: GameState): { odds: number; major: boolean } | null {
  if (s.ended) return null;
  const step = nextStep(s.player.qi);
  if (step.kind === 'minor') {
    return barFill(s.player.qi) >= 1 ? { odds: minorOdds(s.player, 'qi'), major: false } : null;
  }
  const check = majorCheck(s.player, 'qi');
  return check?.ready ? { odds: check.odds, major: true } : null;
}

/** Starts a scene on the qi's next breakthrough; false when it can't be tried now. */
export function startScene(s: GameState): boolean {
  if (scenePlaying()) return false;
  const attempt = qiAttempt(s);
  if (!attempt) return false;
  useScene.setState({
    play: {
      key: lifeKey(s),
      from: { realm: s.player.qi.realm, stage: s.player.qi.stage },
      major: attempt.major,
      odds: attempt.odds,
      certain: attempt.odds >= 1,
      started: performance.now(),
      scene: newScene(),
      outcome: null,
    },
  });
  return true;
}

/** A tap or click on the figure while the scene runs; returns whether it caught a gate. */
export function tapGate(now = performance.now()): boolean {
  const p = useScene.getState().play;
  if (!p || p.outcome) return false;
  const r = tapScene(p.scene, sceneTime(p, now));
  if (r.scene !== p.scene) useScene.setState({ play: { ...p, scene: r.scene } });
  return r.hit;
}

/**
 * The scene due to roll now, if one is: the loop rolls it. A scene whose life or step has moved on
 * (a rewind, a new slot, the step taken some other way) ends quietly instead.
 */
export function sceneDue(s: GameState | null, now = performance.now()): ScenePlay | null {
  const p = useScene.getState().play;
  if (!p) return null;
  if (p.outcome) {
    if (now - p.outcome.at > SCENE_OUTCOME_S * 1000) useScene.setState({ play: null });
    return null;
  }
  if (!sceneOver(sceneTime(p, now))) return null;
  const q = s?.player.qi;
  if (!s || lifeKey(s) !== p.key || q!.realm !== p.from.realm || q!.stage !== p.from.stage) {
    useScene.setState({ play: null });
    return null;
  }
  return p;
}

export function sceneRolled(outcome: Omit<SceneOutcome, 'at'>): void {
  const p = useScene.getState().play;
  if (p) useScene.setState({ play: { ...p, outcome: { ...outcome, at: performance.now() } } });
}

export function endScene(): void {
  useScene.setState({ play: null });
}

/** "Consolidate": let the bar fill on, and say nothing until it reaches the next tenth. */
export function consolidate(s: GameState): void {
  const next = Math.floor(barFill(s.player.qi) * 10 + 1e-9) / 10 + 0.1;
  useScene.setState({ quietUntil: { key: stepKey(s), fill: Math.min(BAR_CAP, next) } });
}

/** Whether "Consolidate" still keeps the moment quiet. */
export function consolidating(s: GameState, quiet: SceneStore['quietUntil']): boolean {
  return !!quiet && quiet.key === stepKey(s) && barFill(s.player.qi) < quiet.fill - 1e-9;
}
