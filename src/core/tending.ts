// Tending, the sleeve's ring 拂袖 (K8; Jan's pick, take A of `docs/mockups/tending-study.html`):
// knots of foul qi rise from a plot's sown beds and drift together; a closed ring drawn round them
// sweeps them into your sleeve. The rules as numbers on a 760 × 640 board, so the scene draws them
// (ui/TendingScene.tsx) and a test plays them with a bot. Knots rise on a seed keyed by the plot and
// the day, so a sitting replays; nothing in a sitting touches the game until you stand up, when its
// hand joins every sown bed's mean (core/farming.ts `tendPlot`).
import { TEND } from '../content/farming.ts';
import { Rng } from './rng.ts';

export const BOARD = { w: 760, h: 640 } as const;
const BED = { w: 196, h: 150, gap: 26, top: 96 } as const;
const LEFT = (BOARD.w - (BED.w * 3 + BED.gap * 2)) / 2;

export type Pt = readonly [number, number];

export interface BedRect {
  i: number;
  x: number;
  y: number;
  w: number;
  h: number;
  sown: boolean;
}

export interface Sprout {
  x: number;
  y: number;
  bed: number;
  /** When it was last bruised, in the sitting's seconds. */
  hurt: number;
}

export interface Knot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  bed: number;
  ph: number;
}

/** What a ring or a sinking knot did, for the scene's marks: 妙, 伤, 浊. */
export interface Mark {
  at: Pt;
  what: 'ring' | 'bruise' | 'sank';
  t: number;
}

export interface Tending {
  t: number;
  hand: number;
  beds: BedRect[];
  sprouts: Sprout[];
  knots: Knot[];
  nextKnot: number;
  marks: Mark[];
  tally: { swept: number; rings: number; sank: number; bruised: number };
}

/** The board's nine beds, as the plot's beds sit, and which are sown. */
export function bedRects(sown: readonly boolean[]): BedRect[] {
  return Array.from({ length: 9 }, (_, i) => ({
    i,
    x: LEFT + (i % 3) * (BED.w + BED.gap),
    y: BED.top + Math.floor(i / 3) * (BED.h + BED.gap),
    w: BED.w,
    h: BED.h,
    sown: !!sown[i],
  }));
}

/** The board at the sitting's start: six sprouts a sown bed, no knots yet, the hand at nothing. */
export function startTending(sown: readonly boolean[], rng: Rng): Tending {
  const beds = bedRects(sown);
  const sprouts: Sprout[] = [];
  for (const b of beds) {
    if (!b.sown) continue;
    for (let r = 0; r < 2; r++)
      for (let c = 0; c < 3; c++)
        sprouts.push({
          x: b.x + 36 + c * 62 + (rng.next() - 0.5) * 14,
          y: b.y + 46 + r * 58 + (rng.next() - 0.5) * 12,
          bed: b.i,
          hurt: -99,
        });
  }
  return {
    t: 0,
    hand: 0,
    beds,
    sprouts,
    knots: [],
    nextKnot: 0.4,
    marks: [],
    tally: { swept: 0, rings: 0, sank: 0, bruised: 0 },
  };
}

const toward = (s: Tending, q: number) => {
  s.hand += (q - s.hand) * TEND.share;
};

const field = (s: Tending) => {
  const b0 = s.beds[0]!;
  const b8 = s.beds[8]!;
  return { x0: b0.x, y0: b0.y, x1: b8.x + b8.w, y1: b8.y + b8.h };
};

function rise(s: Tending, rng: Rng): void {
  const sown = s.beds.filter((b) => b.sown);
  if (!sown.length) return;
  const b = sown[Math.floor(rng.next() * sown.length)]!;
  let p: Pt = [b.x + b.w / 2, b.y + b.h / 2];
  for (let k = 0; k < 8; k++) {
    p = [b.x + 14 + rng.next() * (b.w - 28), b.y + 22 + rng.next() * (b.h - 34)];
    const q = p;
    if (s.sprouts.every((sp) => Math.hypot(sp.x - q[0], sp.y - q[1]) > 22)) break;
  }
  const a = rng.next() * Math.PI * 2;
  s.knots.push({
    x: p[0],
    y: p[1],
    vx: Math.cos(a) * TEND.drift,
    vy: Math.sin(a) * TEND.drift,
    born: s.t,
    bed: b.i,
    ph: rng.next() * Math.PI * 2,
  });
}

/**
 * The board a step on: knots rise every 0.9–1.7 s from a sown bed, drift and draw toward the
 * nearest within reach (held still under reduced motion), and a knot `life` seconds old sinks into
 * the roots, the hand moving toward 0. Mutates and returns the board.
 */
export function stepTending(s: Tending, dt: number, rng: Rng, still = false): Tending {
  s.t += dt;
  if (s.t >= s.nextKnot) {
    rise(s, rng);
    s.nextKnot = s.t + TEND.every[0] + rng.next() * (TEND.every[1] - TEND.every[0]);
  }
  const f = field(s);
  for (const k of s.knots) {
    if (still) continue;
    let near: Knot | null = null;
    let nd: number = TEND.pullR;
    for (const o of s.knots) {
      if (o === k) continue;
      const d = Math.hypot(o.x - k.x, o.y - k.y);
      if (d < nd) {
        nd = d;
        near = o;
      }
    }
    const px = near && nd > 18 ? ((near.x - k.x) / nd) * TEND.pull : 0;
    const py = near && nd > 18 ? ((near.y - k.y) / nd) * TEND.pull : 0;
    k.x += (k.vx + px) * dt;
    k.y += (k.vy + py) * dt;
    if (k.x < f.x0 - 10 || k.x > f.x1 + 10) k.vx *= -1;
    if (k.y < f.y0 - 10 || k.y > f.y1 + 10) k.vy *= -1;
  }
  const sank = s.knots.filter((k) => s.t - k.born >= TEND.life);
  for (const k of sank) {
    toward(s, 0);
    s.tally.sank += 1;
    s.marks.push({ at: [k.x, k.y], what: 'sank', t: s.t });
  }
  s.knots = s.knots.filter((k) => s.t - k.born < TEND.life);
  s.marks = s.marks.filter((m) => s.t - m.t < 0.9);
  return s;
}

export const pathLength = (p: readonly Pt[]): number =>
  p.reduce((sum, q, i) => (i ? sum + Math.hypot(q[0] - p[i - 1]![0], q[1] - p[i - 1]![1]) : 0), 0);

/** Whether a stroke still has sleeve left: its line runs out past `most`. */
export const strokeLasts = (p: readonly Pt[]): boolean => pathLength(p) <= TEND.most;

/** Whether a stroke closes: its end comes back within reach of its start. */
export function closes(p: readonly Pt[]): boolean {
  if (p.length < 6) return false;
  const a = p[0]!;
  const b = p[p.length - 1]!;
  return Math.hypot(b[0] - a[0], b[1] - a[1]) < TEND.close;
}

function inside(poly: readonly Pt[], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function segDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = dx * dx + dy * dy || 1;
  const k = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l));
  return Math.hypot(p[0] - a[0] - k * dx, p[1] - a[1] - k * dy);
}

/**
 * A ring drawn and let go: an open or spent stroke does nothing. A closed one bruises every sprout
 * its line crosses (the hand toward 0 twice each) and sweeps the knots inside (toward 1 each, and
 * once more for three or more). Returns the knots swept, where they went into the sleeve.
 */
export function letGo(s: Tending, p: readonly Pt[]): { swept: Pt[]; to: Pt | null } {
  if (!closes(p) || !strokeLasts(p)) return { swept: [], to: null };
  for (const sp of s.sprouts) {
    if (s.t - sp.hurt < TEND.heal) continue;
    for (let i = 1; i < p.length; i++) {
      if (segDist([sp.x, sp.y], p[i - 1]!, p[i]!) < TEND.bruiseR) {
        sp.hurt = s.t;
        s.tally.bruised += 1;
        toward(s, 0);
        toward(s, 0);
        s.marks.push({ at: [sp.x, sp.y - 12], what: 'bruise', t: s.t });
        break;
      }
    }
  }
  const caught = s.knots.filter((k) => inside(p, k.x, k.y));
  if (!caught.length) return { swept: [], to: null };
  s.knots = s.knots.filter((k) => !caught.includes(k));
  for (let i = 0; i < caught.length; i++) toward(s, 1);
  s.tally.swept += caught.length;
  const end = p[p.length - 1]!;
  if (caught.length >= TEND.ring) {
    toward(s, 1);
    s.tally.rings += 1;
    s.marks.push({ at: end, what: 'ring', t: s.t });
  }
  return { swept: caught.map((k) => [k.x, k.y] as Pt), to: end };
}
