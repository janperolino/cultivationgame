// The breakthrough scene while you play (design § Cultivation, Breakthroughs; core/scene.ts): an
// attended attempt on any ladder plays on Cultivate's figure, a wind-up and then the race, and
// rolls. Like the seat's attention, the scene is the session's and never saved; the store's loop
// ends it on time, even with the tab hidden, and rolls with what was caught. Drawing only reads
// it. The breakthrough panel (ui/BreakthroughPanel.tsx) that leads to a major one is the
// session's too, and lives here so any screen can open it.
import { guideNow } from '../core/guides.ts';
import { create } from 'zustand';
import { SCENE_OUTCOME_S } from '../content/scene.ts';
import { BAR_CAP, LADDERS, type LadderId } from '../content/cultivation.ts';
import { barFill, lastChance, majorCheck, minorOdds, nextStep } from '../core/cultivation.ts';
import { newScene, sceneOver, tapScene, type Scene } from '../core/scene.ts';
import { atLifespanEdge, type GameState } from '../core/state.ts';

export interface SceneOutcome {
  success: boolean;
  major: boolean;
  odds: number;
  /** Page time it was rolled, in ms. */
  at: number;
}

export interface ScenePlay {
  /** The life it belongs to, the ladder, and the step it was started on. */
  key: string;
  ladder: LadderId;
  from: { realm: string; stage: number };
  major: boolean;
  /** The odds before the scene, and whether the step always holds (layers 1 and 2). */
  odds: number;
  certain: boolean;
  /** Page time it started, in ms. */
  started: number;
  /** How fast its time runs: half for the lineage's first, under its guide's veil. */
  pace?: number;
  scene: Scene;
  /** What a major attempt lays beside the gate pill (core/offerings.ts). */
  offerings: string[];
  outcome: SceneOutcome | null;
}

/** The panel for a major breakthrough, open on a ladder; at the lifespan edge, the last chance. */
export interface PanelOpen {
  ladder: LadderId;
  lastChance: boolean;
}

interface SceneStore {
  play: ScenePlay | null;
  panel: PanelOpen | null;
  /** "Wait, let it fill": a ladder's button stays quiet until its bar passes this fill. */
  quietUntil: Partial<Record<LadderId, { key: string; fill: number }>>;
}

export const useScene = create<SceneStore>()(() => ({ play: null, panel: null, quietUntil: {} }));

export const lifeKey = (s: GameState) => `${s.lineage.id}/${s.lineage.life}/${s.seed}`;
/** The life and the ladder's step, so waiting is forgotten once the step is tried. */
const stepKey = (s: GameState, which: LadderId) => {
  const l = s.player[which];
  return `${lifeKey(s)}/${which}/${l.realm}/${l.stage}/${l.unsettledUntil}/${l.injuredUntil}`;
};

/** Scene seconds now. */
export function sceneTime(p: ScenePlay, now = performance.now()): number {
  return ((now - p.started) / 1000) * (p.pace ?? 1);
}

/** A scene runs and has not rolled yet. */
export function scenePlaying(): boolean {
  const p = useScene.getState().play;
  return !!p && !p.outcome;
}

/**
 * What a ladder's next breakthrough would roll at now, with these offerings on a major one, or
 * null when it can't be tried.
 */
export function attemptOf(
  s: GameState,
  which: LadderId,
  offerings: readonly string[] = [],
): { odds: number; major: boolean } | null {
  if (s.ended) return null;
  const l = s.player[which];
  const step = nextStep(l);
  if (step.kind === 'top') return null;
  if (step.kind === 'minor') {
    return barFill(l) >= 1 ? { odds: minorOdds(s.player, which), major: false } : null;
  }
  const check = majorCheck(s.player, which, offerings);
  return check?.ready ? { odds: check.odds, major: true } : null;
}

/** What a ladder's button under the figure shows: nothing, ready, or a full bar not yet ready. */
export type StepState = 'hidden' | 'ready' | 'not-ready';

/**
 * A ladder's button shows once its bar is full, dimmer when a major's other requirements aren't
 * met. At the lifespan edge the last chance's ladder always shows its button, since it needs no full bar.
 */
export function stepState(s: GameState, which: LadderId): StepState {
  if (s.ended) return 'hidden';
  const l = s.player[which];
  const step = nextStep(l);
  if (step.kind === 'top') return 'hidden';
  if (step.kind === 'major' && atLifespanEdge(s)) {
    const chance = lastChance(s.player);
    if (chance.ladder === which) return chance.possible ? 'ready' : 'not-ready';
  }
  if (barFill(l) < 1) return 'hidden';
  if (step.kind === 'minor') return 'ready';
  return majorCheck(s.player, which)?.ready ? 'ready' : 'not-ready';
}

/** The ladders with a breakthrough you can take now, for Cultivate's mark in the menu. */
export function readyLadders(s: GameState): LadderId[] {
  return LADDERS.filter((which) => stepState(s, which) === 'ready');
}

/** Starts a scene on a ladder's next breakthrough; false when it can't be tried now. */
export function startScene(
  s: GameState,
  which: LadderId,
  offerings: readonly string[] = [],
): boolean {
  if (scenePlaying()) return false;
  const attempt = attemptOf(s, which, offerings);
  if (!attempt) return false;
  const l = s.player[which];
  useScene.setState({
    play: {
      key: lifeKey(s),
      ladder: which,
      from: { realm: l.realm, stage: l.stage },
      major: attempt.major,
      odds: attempt.odds,
      certain: attempt.odds >= 1,
      started: performance.now(),
      // The first minor breakthrough's spark runs at half speed (core/guides.ts, its veil).
      ...(!attempt.major && guideNow(s, { screen: 'cultivate' })?.id === 'first-minor'
        ? { pace: 0.5 }
        : {}),
      scene: newScene(),
      offerings: attempt.major ? [...offerings] : [],
      outcome: null,
    },
    panel: null,
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
  const l = s?.player[p.ladder];
  if (!s || !l || lifeKey(s) !== p.key || l.realm !== p.from.realm || l.stage !== p.from.stage) {
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

/** Opens the breakthrough panel on a ladder, or the last chance at the lifespan edge. */
export function openPanel(which: LadderId, lastChance = false): void {
  useScene.setState({ panel: { ladder: which, lastChance } });
}

export function closePanel(): void {
  useScene.setState({ panel: null });
}

/** "Wait, let it fill": the ladder's button stays quiet until the bar reaches the next tenth. */
export function letFill(s: GameState, which: LadderId): void {
  const next = Math.floor(barFill(s.player[which]) * 10 + 1e-9) / 10 + 0.1;
  useScene.setState((st) => ({
    panel: null,
    quietUntil: {
      ...st.quietUntil,
      [which]: { key: stepKey(s, which), fill: Math.min(BAR_CAP, next) },
    },
  }));
}

/** Whether waiting still keeps a ladder's button quiet. */
export function filling(s: GameState, which: LadderId, quiet: SceneStore['quietUntil']): boolean {
  const q = quiet[which];
  return !!q && q.key === stepKey(s, which) && barFill(s.player[which]) < q.fill - 1e-9;
}
