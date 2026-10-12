// The web of threads on the People screen (design § UI and screens, The People screen;
// docs/mockups/people-study.html, C): you at the centre, everyone joined to you by a crack of qi
// light. Distance is how they feel, the bond sets the side of the web, and past a dozen people
// only your nearest show. Pure layout, so it has tests.
import type { BondId } from '../content/people.ts';
import { REGARD_MAX } from '../content/people.ts';
import { hashSeed, mulberry32 } from '../core/rng.ts';
import type { PersonRecord } from '../core/state.ts';

export const WEB_SIZE = { w: 620, h: 560 } as const;
export const WEB_CENTRE = { x: 310, y: 268 } as const;
/** The ring for "would bleed for you", and the step out for each notch of feeling below it. */
export const RING_START = 64;
export const RING_STEP = 28;
/** Past this many people the web shows the nearest; the circles keep everyone. */
export const WEB_MAX = 12;

/** Where each bond sits round the web, in degrees from the right, clockwise. */
const SIDE: Record<BondId, number> = {
  master: -90,
  patron: -90,
  superior: -90,
  senior: -60,
  junior: -25,
  friend: 15,
  'sworn-sibling': 40,
  'dao-companion': 60,
  acquaintance: 95,
  kin: 145,
  rival: 200,
  enemy: 225,
};
/** How far apart two people on the same side sit, as an arc in px, so their names never touch. */
const SPREAD_PX = 100;

export interface WebNode {
  id: string;
  x: number;
  y: number;
  regard: number;
  /** Degrees round the web from the right, clockwise. */
  angle: number;
  /** The thread from you to them: a few kinks, like a crack. */
  thread: string;
}

/** Distance from the centre for a feeling: the warm close, the hostile at the rim. */
export function ringFor(regard: number): number {
  return RING_START + (REGARD_MAX - regard) * RING_STEP;
}

/** A crack-like path between two points, the same every time for the same id. */
function jag(x1: number, y1: number, x2: number, y2: number, id: string): string {
  const rng = mulberry32(hashSeed(id));
  const nx = -(y2 - y1);
  const ny = x2 - x1;
  const len = Math.hypot(nx, ny) || 1;
  let d = `M${x1} ${y1}`;
  for (let i = 1; i < 5; i++) {
    const t = i / 5;
    const off = (rng() - 0.5) * 14;
    d += ` L${(x1 + (x2 - x1) * t + (nx / len) * off).toFixed(1)} ${(y1 + (y2 - y1) * t + (ny / len) * off).toFixed(1)}`;
  }
  return `${d} L${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

/** The nearest people, warmest first and then the most recently heard of. */
export function nearest(people: { id: string; record: PersonRecord }[], max = WEB_MAX) {
  return [...people]
    .sort((a, b) => b.record.regard - a.record.regard || b.record.heard - a.record.heard)
    .slice(0, max);
}

/**
 * The part of the web worth showing: out to the farthest person, and at least to the indifferent
 * ring, so a web of friends fills the panel rather than sitting small in the middle.
 */
export function webViewBox(nodes: readonly WebNode[]): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  const lowest = Math.min(0, ...nodes.map((n) => n.regard));
  const r = ringFor(lowest) + 24;
  const x = Math.max(0, WEB_CENTRE.x - r - 50);
  const y = Math.max(0, WEB_CENTRE.y - r - 8);
  const right = Math.min(WEB_SIZE.w, WEB_CENTRE.x + r + 50);
  const bottom = Math.min(WEB_SIZE.h, WEB_CENTRE.y + r + 40);
  return { x, y, w: right - x, h: bottom - y };
}

/** Where everyone sits on the web. People on the same side fan out round it. */
export function webLayout(people: { id: string; record: PersonRecord }[]): WebNode[] {
  const bySide = new Map<number, { id: string; record: PersonRecord }[]>();
  for (const p of people) {
    const side = SIDE[p.record.bond];
    bySide.set(side, [...(bySide.get(side) ?? []), p]);
  }
  const out: WebNode[] = [];
  for (const [side, group] of bySide) {
    const meanR = group.reduce((n, p) => n + ringFor(p.record.regard), 0) / group.length;
    const step = (SPREAD_PX / meanR) * (180 / Math.PI);
    group.forEach((p, i) => {
      const deg = side + (i - (group.length - 1) / 2) * step;
      const angle = (deg * Math.PI) / 180;
      const r = ringFor(p.record.regard);
      const x = WEB_CENTRE.x + r * Math.cos(angle);
      const y = WEB_CENTRE.y + r * Math.sin(angle);
      out.push({
        id: p.id,
        x,
        y,
        regard: p.record.regard,
        angle: deg,
        thread: jag(WEB_CENTRE.x, WEB_CENTRE.y, x, y, p.id),
      });
    });
  }
  return out;
}

/** Where the ring labels go: the middle of the widest empty stretch of the web, in degrees. */
export function labelAngle(nodes: readonly WebNode[]): number {
  if (!nodes.length) return -118;
  const angles = nodes.map((n) => ((n.angle % 360) + 360) % 360).sort((a, b) => a - b);
  let best = { gap: -1, at: 0 };
  angles.forEach((a, i) => {
    const next = i + 1 < angles.length ? angles[i + 1]! : angles[0]! + 360;
    if (next - a > best.gap) best = { gap: next - a, at: a + (next - a) / 2 };
  });
  return best.at;
}
