// One-breath drawing at the talisman desk (design § Professions, Crafts, thin, the hands-on version;
// K5): talismans' steady hand (content/talisman.ts has the rules' numbers). Like fire control's
// and the forge's sittings, it is the session's and never saved: the hand starts at zero each time
// you sit down. Nothing in it is rolled, so it keeps no stream: the paths are written by family.
// The hand it keeps is what the bench reads (core/crafts.ts, `workBench`'s `hand`); it moves only
// a batch's rarity, and a sheet that breaks here spoils no sheet on the bench.
import {
  BAND,
  FLAWLESS,
  HAND_SETTLE,
  LAY_S,
  PACE,
  SHOW_S,
  SLACK,
  SNAP,
  START_REACH,
  STEP,
  STROKES,
  WAIT_S,
} from '../content/talisman.ts';
import type { GameState } from './state.ts';

export type Pt = readonly [number, number];

/** How a sheet ended: drawn to the foot, or broken: the qi snapped, the breath broke, the ink ran dry. */
export type SheetEnd = 'drawn' | 'snapped' | 'lifted' | 'dry';

export type DeskPhase = 'lay' | 'ready' | 'draw' | 'show';

/** A stretch of ink laid down: where, how much ink it was laid with, and whether it held the line. */
export interface Ink {
  at: Pt;
  ink: number;
  on: boolean;
}

export interface Desk {
  /** The cultivator who sits; the brush names them. */
  who: string;
  /** Session time in real seconds. */
  t: number;
  /** The steady hand, 0 to 1. */
  hand: number;
  /** The family whose path the sheet carries. */
  family: string;
  /** The family the next sheet takes up, when the bench's front changed mid-sheet. */
  then?: string;
  phase: DeskPhase;
  /** Session second the phase began. */
  phaseAt: number;
  /** The breath's ink left in the brush, 1 to 0. */
  ink: number;
  /** How far along the path the brush has come, as a sample index. */
  idx: number;
  /** Per stretch of the path, whether it was drawn on the line; null while not yet reached. */
  on: (boolean | null)[];
  /** The ink laid on this sheet, for the canvas. */
  stroke: Ink[];
  /** Sheets finished this sitting, and how the last ended. */
  sheets: number;
  last: { end: SheetEnd; quality: number } | null;
}

/** A path sampled evenly by `STEP`, through its control points on a Catmull-Rom curve. */
function sample(pts: readonly Pt[]): Pt[] {
  const fine: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 1.5));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const at = (j: 0 | 1) =>
        0.5 *
        (2 * p1[j] +
          (p2[j] - p0[j]) * t +
          (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t +
          (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * t * t * t);
      fine.push([at(0), at(1)]);
    }
  }
  fine.push(pts[pts.length - 1]!);
  const out: Pt[] = [fine[0]!];
  let run = 0;
  for (let i = 1; i < fine.length; i++) {
    run += Math.hypot(fine[i]![0] - fine[i - 1]![0], fine[i]![1] - fine[i - 1]![1]);
    if (run >= STEP) {
      out.push(fine[i]!);
      run = 0;
    }
  }
  out.push(fine[fine.length - 1]!);
  return out;
}

const paths = new Map<string, Pt[]>();
/** A family's stroke path, sampled; a family with none written draws the strikes' bolt. */
export function pathOf(family: string): Pt[] {
  const key = STROKES[family] ? family : 'strikes';
  let p = paths.get(key);
  if (!p) {
    p = sample(STROKES[key]!);
    paths.set(key, p);
  }
  return p;
}

/** Seconds the breath lasts on a path: its length at the allowed pace, and the slack. */
export function breathOf(family: string): number {
  return ((pathOf(family).length - 1) * STEP * SLACK) / PACE;
}

/** The line's half-width at an ink: narrower as it thins. */
export function bandAt(ink: number): number {
  return BAND[0] + (BAND[1] - BAND[0]) * ink;
}

const fresh = ({ then, ...d }: Desk): Desk => ({
  ...d,
  family: then ?? d.family,
  phase: 'lay',
  phaseAt: d.t,
  ink: 1,
  idx: 0,
  on: new Array<boolean | null>(pathOf(then ?? d.family).length - 1).fill(null),
  stroke: [],
});

/** Sits down at the desk to draw a family's talismans: no hand yet, a fresh sheet laying. */
export function startDesk(s: GameState, family: string): Desk {
  return fresh({
    who: s.player.id,
    t: 0,
    hand: 0,
    family,
    phase: 'lay',
    phaseAt: 0,
    ink: 1,
    idx: 0,
    on: [],
    stroke: [],
    sheets: 0,
    last: null,
  });
}

/** The desk drawing another family's path from its next sheet on (the bench's front changed). */
export function deskFamily(d: Desk, family: string): Desk {
  if (d.family === family && d.then === undefined) return d;
  // Mid-sheet the brush keeps to the path it is on, and the next sheet takes the new one: a swap
  // under the brush snapped the sheet (review 2026-10-21).
  if (d.phase === 'draw')
    return d.family === family ? { ...d, then: undefined } : { ...d, then: family };
  return fresh({ ...d, family, then: undefined });
}

/** Ends the sheet: its quality the share of the path drawn on the line, 0 if it broke. */
function finish(d: Desk, end: SheetEnd): Desk {
  const good = d.on.filter((v) => v === true).length;
  const quality = end === 'drawn' ? good / d.on.length : 0;
  return {
    ...d,
    hand: d.hand + (quality - d.hand) * HAND_SETTLE,
    phase: 'show',
    phaseAt: d.t,
    sheets: d.sheets + 1,
    last: { end, quality },
  };
}

/** Whether a finished sheet came out flawless 妙. */
export function flawless(d: Desk): boolean {
  return d.last?.end === 'drawn' && d.last.quality >= FLAWLESS;
}

/**
 * The desk after `dt` real seconds: a sheet lays and waits for the brush; while the brush is down
 * the ink drains, and a dry brush breaks the stroke; a sheet left unstarted dries; a finished one
 * shows, then the next lays.
 */
export function tickDesk(d0: Desk, dt: number): Desk {
  if (dt <= 0) return d0;
  let d: Desk = { ...d0, t: d0.t + dt };
  const since = d.t - d.phaseAt;
  if (d.phase === 'lay' && since >= LAY_S) d = { ...d, phase: 'ready', phaseAt: d.t };
  else if (d.phase === 'ready' && since >= WAIT_S) d = finish(d, 'dry');
  else if (d.phase === 'draw') {
    const ink = d.ink - dt / breathOf(d.family);
    d = ink <= 0 ? finish({ ...d, ink: 0 }, 'dry') : { ...d, ink };
  } else if (d.phase === 'show' && since >= SHOW_S) d = fresh(d);
  return d;
}

/** `who` sets the brush down at a place: on the head of a ready sheet, it starts the stroke. */
export function brushDown(d: Desk, who: string, at: Pt): Desk {
  if (who !== d.who || d.phase !== 'ready') return d;
  const head = pathOf(d.family)[0]!;
  if (Math.hypot(at[0] - head[0], at[1] - head[1]) > START_REACH) return d;
  return { ...d, phase: 'draw', phaseAt: d.t, stroke: [{ at, ink: d.ink, on: true }] };
}

/**
 * The brush moves to a place. Its place on the path is the nearest sample a little behind or ahead
 * of where it was, never further ahead than the brush really moved, so a hook folding back on
 * itself can't be skipped; each stretch it passes is on the line if the brush is within the line's
 * half-width. Past `SNAP` half-widths the qi snaps; at the foot the sheet is drawn.
 */
export function brushMove(d: Desk, who: string, at: Pt): Desk {
  if (who !== d.who || d.phase !== 'draw') return d;
  const path = pathOf(d.family);
  const prev = d.stroke[d.stroke.length - 1]!.at;
  const moved = Math.hypot(at[0] - prev[0], at[1] - prev[1]);
  const lo = Math.max(0, d.idx - 15);
  const hi = Math.min(path.length - 1, d.idx + 2 + Math.ceil(moved / STEP));
  let near = d.idx;
  let dist = Infinity;
  for (let i = lo; i <= hi; i++) {
    const p = path[i]!;
    const di = Math.hypot(p[0] - at[0], p[1] - at[1]);
    if (di < dist) {
      dist = di;
      near = i;
    }
  }
  const band = bandAt(d.ink);
  const ok = dist <= band;
  const drawn: Desk = { ...d, stroke: [...d.stroke, { at, ink: d.ink, on: ok }] };
  if (dist > band * SNAP) return finish(drawn, 'snapped');
  if (near <= d.idx) return drawn;
  const on = d.on.slice();
  for (let i = d.idx; i < near; i++) if (on[i] === null) on[i] = ok;
  const next = { ...drawn, on, idx: near };
  if (near < path.length - 3) return next;
  return finish({ ...next, on: on.map((v) => v === true) }, 'drawn');
}

/** `who` lifts the brush: mid-stroke, the breath breaks. */
export function brushUp(d: Desk, who: string): Desk {
  if (who !== d.who || d.phase !== 'draw') return d;
  return finish(d, 'lifted');
}
