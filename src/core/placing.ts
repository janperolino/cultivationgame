// Placing 布阵 (K10; Jan's take A of `docs/mockups/formation-study.html`, "reading the currents"):
// laying an array is reading the ground and committing flags. The ground is a lattice with the eye
// at its middle; the vein's currents run across it, seen only within your divine sense round your
// hand and round each flag already planted. A flag draws on what runs under it and its line on what
// the line rides along; the last flag closes the ring, which must not cross itself or a stone and
// must hold the eye. Nothing is timed and nothing rolled: the ground is seeded by the spot it is
// played on, so a site's land reads the same each time, and the hand is what you read. The scene
// (ui/PlacingScene.tsx) draws it and a test plays it with a bot.
import { PLACING } from '../content/formations.ts';
import { Rng } from './rng.ts';

export type Pt = readonly [number, number];
/** A lattice point, by column and row. */
export type Node = readonly [number, number];

export interface Current {
  pts: Pt[];
  w: number;
}

export interface PlacingGround {
  /** The scene's square side, in its own units. */
  size: number;
  eye: Node;
  currents: Current[];
  rocks: readonly string[];
  /** Flags to plant: a set's eight, a disc's four. */
  nodes: number;
  /** The fair scale: what a strong point of this ground draws, so a hand of 1 is reachable. */
  norm: number;
}

export interface Placing {
  flags: Node[];
  spilt: number;
  closed: boolean;
}

export const EMPTY: Placing = { flags: [], spilt: 0, closed: false };

const key = (n: Node) => `${n[0]},${n[1]}`;
const MID = (PLACING.side - 1) / 2;

/** A lattice point's place in the scene. */
export function pointOf(n: Node): Pt {
  const o = PLACING.gap * 0.8;
  return [o + n[0] * PLACING.gap, o + n[1] * PLACING.gap];
}

export const SCENE = pointOf([PLACING.side - 1, PLACING.side - 1])[0] + PLACING.gap * 0.8;

/** The ground of a spot: its currents and stones, seeded by the spot (`seed`) alone. */
export function placingGround(seed: string, form: 'flags' | 'disc'): PlacingGround {
  const rng = Rng.fromString(`placing/${seed}`);
  const c = SCENE / 2;
  const currents: Current[] = [];
  for (let k = 0; k < PLACING.currents; k++) {
    // A current: a gentle curve across the ground, passing near the eye more often than not.
    const a = rng.next() * Math.PI;
    const cx = c + (rng.next() - 0.5) * SCENE * 0.34;
    const cy = c + (rng.next() - 0.5) * SCENE * 0.34;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const bend = (rng.next() - 0.5) * 0.006;
    const pts: Pt[] = [];
    for (let t = -SCENE * 0.72; t <= SCENE * 0.72; t += 10) {
      const off = bend * t * t;
      pts.push([cx + dx * t - dy * off, cy + dy * t + dx * off]);
    }
    currents.push({ pts, w: 0.6 + rng.next() * 0.4 });
  }
  const rocks = new Set<string>();
  while (rocks.size < PLACING.rocks) {
    const n: Node = [rng.int(0, PLACING.side - 1), rng.int(0, PLACING.side - 1)];
    if (Math.abs(n[0] - MID) + Math.abs(n[1] - MID) > 1) rocks.add(key(n));
  }
  const ground: PlacingGround = {
    size: SCENE,
    eye: [MID, MID],
    currents,
    rocks: [...rocks],
    nodes: PLACING.nodes[form],
    norm: 1,
  };
  // The fair scale: the strength of the node-th strongest point, a little under it.
  const all: number[] = [];
  for (let i = 0; i < PLACING.side; i++)
    for (let j = 0; j < PLACING.side; j++) all.push(fieldAt(ground, pointOf([i, j])));
  all.sort((x, y) => y - x);
  ground.norm = Math.max(0.3, (all[ground.nodes] ?? 1) * PLACING.fair);
  return ground;
}

/** What runs at a point: each current's strength falling off across its width. */
export function fieldAt(g: PlacingGround, p: Pt): number {
  let f = 0;
  const w2 = 2 * PLACING.width * PLACING.width;
  for (const c of g.currents) {
    let d = Infinity;
    for (const q of c.pts) d = Math.min(d, (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2);
    f += c.w * Math.exp(-d / w2);
  }
  return Math.min(1.4, f);
}

/** What a line rides along: the mean of what runs under it, at seventeen points. */
export function lineWorth(g: PlacingGround, a: Pt, b: Pt): number {
  let s = 0;
  for (let k = 0; k <= 16; k++) {
    const t = k / 16;
    s += fieldAt(g, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return s / 17;
}

/** A point's or a line's worth against the ground's fair scale, 0 to 1. */
export const share = (g: PlacingGround, v: number): number => Math.min(1, v / g.norm);

function crosses(p1: Pt, p2: Pt, p3: Pt, p4: Pt): boolean {
  const d = (a: Pt, b: Pt, c: Pt) => (c[0] - a[0]) * (b[1] - a[1]) - (b[0] - a[0]) * (c[1] - a[1]);
  const d1 = d(p3, p4, p1);
  const d2 = d(p3, p4, p2);
  const d3 = d(p1, p2, p3);
  const d4 = d(p1, p2, p4);
  return d1 > 0 !== d2 > 0 && d3 > 0 !== d4 > 0;
}

function hitsStone(g: PlacingGround, a: Pt, b: Pt): boolean {
  for (const r of g.rocks) {
    const [i, j] = r.split(',').map(Number) as [number, number];
    const q = pointOf([i, j]);
    const vx = b[0] - a[0];
    const vy = b[1] - a[1];
    const len = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * vx + (q[1] - a[1]) * vy) / len));
    if (Math.hypot(a[0] + vx * t - q[0], a[1] + vy * t - q[1]) < PLACING.stone) return true;
  }
  return false;
}

/** Whether a polygon holds a point. */
function inside(pt: Pt, poly: readonly Pt[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** Why a line from the last flag to here can't be drawn: a stone, or a line it would cross. */
function lineWhy(g: PlacingGround, flags: readonly Node[], a: Pt, b: Pt, closing: boolean): string {
  if (hitsStone(g, a, b)) return 'a stone stands in the way';
  const pts = flags.map(pointOf);
  // The lines already drawn, leaving out the one this line meets at its start (and at its end, closing).
  for (let k = 0; k + 1 < pts.length; k++) {
    if (k === pts.length - 2) continue;
    if (closing && k === 0) continue;
    if (crosses(a, b, pts[k]!, pts[k + 1]!)) return 'the line would cross another';
  }
  return '';
}

/** Why a flag can't go here, or '' when it can. */
export function cantPlant(g: PlacingGround, p: Placing, n: Node): string {
  if (p.closed) return 'the ring is closed';
  // A set has its count of flags: past it the hand would read more than the set holds (review
  // 2026-10-21).
  if (p.flags.length >= g.nodes) return 'every flag of the set stands: pull one up';
  if (n[0] < 0 || n[1] < 0 || n[0] >= PLACING.side || n[1] >= PLACING.side) return 'off the ground';
  if (g.rocks.includes(key(n))) return 'a stone: no flag stands there';
  if (n[0] === g.eye[0] && n[1] === g.eye[1]) return 'the disc sits in the eye';
  if (p.flags.some((f) => f[0] === n[0] && f[1] === n[1])) return 'a flag already stands there';
  const last = p.flags[p.flags.length - 1];
  return last ? lineWhy(g, p.flags, pointOf(last), pointOf(n), false) : '';
}

/**
 * Plants the next flag. The last one closes the ring when it can: its closing line clear and the
 * eye inside; else the flag stands and the ring waits open, to be pulled up and tried again.
 */
export function plant(g: PlacingGround, p: Placing, n: Node): { placing: Placing; why: string } {
  const why = cantPlant(g, p, n);
  if (why) return { placing: p, why };
  const flags = [...p.flags, n];
  if (flags.length < g.nodes) return { placing: { ...p, flags }, why: '' };
  const pts = flags.map(pointOf);
  const shut = lineWhy(g, flags, pts[pts.length - 1]!, pts[0]!, true);
  if (shut) return { placing: { ...p, flags }, why: `The ring will not close: ${shut}.` };
  if (!inside(pointOf(g.eye), pts))
    return { placing: { ...p, flags }, why: 'The ring closes, but the eye lies outside it.' };
  return { placing: { ...p, flags, closed: true }, why: '' };
}

/** Pulls the last flag up; a little qi spills. */
export function pull(p: Placing): Placing {
  if (!p.flags.length) return p;
  return { flags: p.flags.slice(0, -1), spilt: p.spilt + PLACING.spill, closed: false };
}

/**
 * The hand: each flag's share of what runs under it and each line's of what it rides along, the
 * flags weighing 0.4 and the lines 0.6, over the set's whole count; a ring left open counts 0.9 of
 * it; less what was spilt.
 */
export function placingHand(g: PlacingGround, p: Placing): number {
  if (!p.flags.length) return 0;
  const pts = p.flags.map(pointOf);
  const flags = pts.reduce((n, q) => n + share(g, fieldAt(g, q)), 0) / g.nodes;
  let lines = 0;
  for (let k = 1; k < pts.length; k++) lines += share(g, lineWorth(g, pts[k - 1]!, pts[k]!));
  if (p.closed) lines += share(g, lineWorth(g, pts[pts.length - 1]!, pts[0]!));
  lines /= g.nodes;
  const h =
    (PLACING.flagShare * flags + (1 - PLACING.flagShare) * lines) * (p.closed ? 1 : PLACING.open);
  return Math.max(0, Math.min(1, h - p.spilt));
}

/** How far your sense shows the currents round your hand: ×1.5 a soul realm past Qi Condensation. */
export function senseRadius(soulRealm: number): number {
  return PLACING.sense * 1.5 ** Math.max(0, soulRealm);
}
