// The breakthrough scene (design § Cultivation, Breakthroughs): a wind-up where the circulation
// slows and the gates light one by one, then for ten seconds the circulation races and a spark
// passes the gates; each gate tapped on time adds a bounded step to the odds, up to a cap, and a
// miss costs nothing. Then the roll is the ordinary one (`attemptBreakthrough` with the scene's
// bonus). The scene is the session's, never saved, and has no randomness: the gates
// come at the same moments every time, so only the tapping differs. Time is scene seconds.
import { SCENE_ODDS_CAP, SCENE_ODDS_STEP } from '../content/cultivation.ts';
import {
  SCENE_EARLY_S,
  SCENE_GATES,
  SCENE_GATES_PER_LAP,
  SCENE_RACE,
  SCENE_SECONDS,
  SCENE_SPEED,
  SCENE_WINDOW_S,
  SCENE_WINDUP_S,
} from '../content/scene.ts';

/** What became of each gate: caught, spent by an early tap, or not yet tapped (null). */
export type GateResult = 'hit' | 'early' | null;

export interface Scene {
  readonly gates: readonly GateResult[];
}

/** How far round the loop the racing spark is at `t`, in laps; 0 through the wind-up. */
export function sceneLaps(t: number): number {
  const s = Math.max(0, t - SCENE_WINDUP_S);
  return SCENE_SPEED * s + SCENE_RACE * s * s;
}

/** Still winding up at `t`: the race hasn't begun. */
export function windingUp(t: number): boolean {
  return t < SCENE_WINDUP_S;
}

/**
 * How many of the loop's gate marks have lit by `t`: one by one through the wind-up, the last a
 * second before the race, all of them from then on.
 */
export function gatesLit(t: number): number {
  const gap = SCENE_WINDUP_S / (SCENE_GATES_PER_LAP + 1);
  return Math.max(0, Math.min(SCENE_GATES_PER_LAP, Math.floor(t / gap + 1e-9)));
}

/** Where gate `k` sits, in laps from the start: evenly spaced, the first half a gap in. */
export function gateLap(k: number): number {
  return (k + 0.5) / SCENE_GATES_PER_LAP;
}

/** The moment the spark passes each gate, from the spark's laps. */
export const GATE_TIMES: readonly number[] = Array.from({ length: SCENE_GATES }, (_, k) => {
  // SCENE_RACE t² + SCENE_SPEED t = lap, solved for t, after the wind-up.
  const lap = gateLap(k);
  const race =
    (-SCENE_SPEED + Math.sqrt(SCENE_SPEED ** 2 + 4 * SCENE_RACE * lap)) / (2 * SCENE_RACE);
  return SCENE_WINDUP_S + race;
});

export function newScene(): Scene {
  return { gates: GATE_TIMES.map(() => null) };
}

/** The first gate still to come or still in its window at `t`, or null when all have passed. */
export function nextGate(s: Scene, t: number): number | null {
  for (let k = 0; k < GATE_TIMES.length; k++) {
    if (s.gates[k] === null && GATE_TIMES[k]! + SCENE_WINDOW_S >= t) return k;
  }
  return null;
}

export interface Tap {
  scene: Scene;
  /** The gate the tap touched, or null when it came too far from any. */
  gate: number | null;
  hit: boolean;
}

/**
 * A tap at `t`: inside a gate's window it catches the gate; a little before it, it spends the gate
 * for nothing; further off it does nothing. Each gate is judged once.
 */
export function tapScene(s: Scene, t: number): Tap {
  const k = nextGate(s, t);
  if (k === null || t > SCENE_SECONDS) return { scene: s, gate: null, hit: false };
  const d = t - GATE_TIMES[k]!;
  let result: GateResult;
  if (Math.abs(d) <= SCENE_WINDOW_S) result = 'hit';
  else if (d >= -SCENE_EARLY_S) result = 'early';
  else return { scene: s, gate: null, hit: false };
  const gates = s.gates.map((g, i) => (i === k ? result : g));
  return { scene: { gates }, gate: k, hit: result === 'hit' };
}

export function sceneHits(s: Scene): number {
  return s.gates.filter((g) => g === 'hit').length;
}

/** What the scene adds to the odds: a step a gate caught, never past the cap. */
export function sceneBonus(s: Scene): number {
  return Math.min(SCENE_ODDS_CAP, sceneHits(s) * SCENE_ODDS_STEP);
}

/** The scene is over and the roll is due. */
export function sceneOver(t: number): boolean {
  return t >= SCENE_SECONDS;
}
