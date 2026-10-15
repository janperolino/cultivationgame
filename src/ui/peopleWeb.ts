// The web of threads on the People screen (design § UI and screens, The People screen;
// docs/mockups/people-study.html, C): you at the centre, everyone joined to you by a crack of qi
// light. Distance is how they feel, the trust word their memories of you read as you know them,
// the tie sets the side of the web, and past a dozen people only your nearest show. Each person is a small disc with their name under it, and no disc or
// name ever sits on another's. Pure layout, so it has tests; the screen pans and zooms over it.
import type { TieId } from '../content/people.ts';
import { hashSeed, mulberry32 } from '../core/rng.ts';

export const WEB_SIZE = { w: 620, h: 560 } as const;
export const WEB_CENTRE = { x: 310, y: 268 } as const;
/** Trust as a level, hostile −2 to trusting +2. */
export const LEVEL_MAX = 2;
/** The ring for "trusting", and the step out for each trust word below it. */
export const RING_START = 72;
export const RING_STEP = 36;
/** Past this many people the web shows the nearest; the circles keep everyone. */
export const WEB_MAX = 12;

/** A person's disc, and yours at the centre. */
export const DISC_R = 14;
export const YOU_R = 18;
/** The name and bond lines under a disc: their baselines below the centre. */
export const NAME_Y = DISC_R + 13;
export const BOND_Y = DISC_R + 25;
const LABEL_H = 30;
const NAME_CHAR = 6.2;
const BOND_CHAR = 5.2;
/** Space kept clear between any two people, and how far one nudge turns them, in degrees. */
const GAP = 4;
const NUDGE = 2.5;
/** A crowded web may also ease people in or out from their ring, but never closer to the next. */
const DRIFT = 1.5;
const DRIFT_MAX = RING_STEP * 0.45;
const PASSES = 120;

/** Where each tie sits round the web, in degrees from the right, clockwise; no tie at 95. */
const SIDE: Record<TieId | 'none', number> = {
  master: -90,
  patron: -90,
  superior: -90,
  guardian: -90,
  backer: -90,
  benefactor: -75,
  creditor: -75,
  senior: -60,
  leader: -60,
  junior: -25,
  disciple: -25,
  subordinate: -25,
  protege: -25,
  ward: -25,
  follower: -10,
  backed: -10,
  beneficiary: 0,
  debtor: 0,
  friend: 15,
  'sworn-sibling': 40,
  lover: 60,
  betrothed: 60,
  'dao-companion': 60,
  'former-lover': 75,
  none: 95,
  kin: 145,
  rival: 200,
  enemy: 225,
  'sworn-enemy': 235,
};
/** How far apart two people on the same side start, as an arc in px, before any nudging. */
const SPREAD_PX = 80;

export interface WebPerson {
  id: string;
  /** What they are to you, or null for no tie. */
  tie: TieId | null;
  /** Their trust as you read it: −2 hostile to +2 trusting. */
  level: number;
  /** World day you last heard of them. */
  heard: number;
  /** The two lines under the disc, for measuring how wide they run. */
  name?: string;
  bond?: string;
}

export interface WebNode {
  id: string;
  x: number;
  y: number;
  level: number;
  /** Degrees round the web from the right, clockwise. */
  angle: number;
  /** How wide the name and bond lines run, centred under the disc. */
  labelW: number;
  /** The thread from you to them: a few kinks, like a crack. */
  thread: string;
}

export interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

/** Distance from the centre for a trust: the trusting close, the hostile at the rim. */
export function ringFor(level: number): number {
  return RING_START + (LEVEL_MAX - level) * RING_STEP;
}

/** What a person takes up on the web: their disc and the lines under it. */
export function nodeBox(n: Pick<WebNode, 'x' | 'y' | 'labelW'>): Box {
  const half = Math.max(DISC_R, n.labelW / 2);
  return { l: n.x - half, t: n.y - DISC_R, r: n.x + half, b: n.y + DISC_R + LABEL_H };
}

const YOU_BOX: Box = {
  l: WEB_CENTRE.x - YOU_R,
  t: WEB_CENTRE.y - YOU_R,
  r: WEB_CENTRE.x + YOU_R,
  b: WEB_CENTRE.y + YOU_R,
};

export function overlaps(a: Box, b: Box, gap = GAP): boolean {
  return a.l < b.r + gap && b.l < a.r + gap && a.t < b.b + gap && b.t < a.b + gap;
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
    const off = (rng() - 0.5) * 12;
    d += ` L${(x1 + (x2 - x1) * t + (nx / len) * off).toFixed(1)} ${(y1 + (y2 - y1) * t + (ny / len) * off).toFixed(1)}`;
  }
  return `${d} L${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

/** The nearest people, warmest first and then the most recently heard of. */
export function nearest<T extends { level: number; heard: number }>(
  people: T[],
  max = WEB_MAX,
): T[] {
  return [...people].sort((a, b) => b.level - a.level || b.heard - a.heard).slice(0, max);
}

const place = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: WEB_CENTRE.x + r * Math.cos(a), y: WEB_CENTRE.y + r * Math.sin(a) };
};

/** Signed degrees from a to b, the short way round. */
const turn = (a: number, b: number) => ((((b - a) % 360) + 540) % 360) - 180;

/**
 * Where everyone sits on the web. People start on their bond's side, fanned out, and are then
 * nudged round their own ring, never in or out, until no two discs or names touch.
 */
export function webLayout(people: WebPerson[]): WebNode[] {
  const bySide = new Map<number, WebPerson[]>();
  for (const p of people) {
    const side = SIDE[p.tie ?? 'none'];
    bySide.set(side, [...(bySide.get(side) ?? []), p]);
  }
  const nodes: (WebNode & { r: number; ring: number })[] = [];
  for (const [side, group] of bySide) {
    const meanR = group.reduce((n, p) => n + ringFor(p.level), 0) / group.length;
    const step = (SPREAD_PX / meanR) * (180 / Math.PI);
    group.forEach((p, i) => {
      const angle = side + (i - (group.length - 1) / 2) * step;
      const r = ringFor(p.level);
      const labelW =
        Math.max((p.name?.length ?? 14) * NAME_CHAR, (p.bond?.length ?? 14) * BOND_CHAR) + 6;
      nodes.push({
        id: p.id,
        level: p.level,
        angle,
        labelW,
        r,
        ring: r,
        thread: '',
        ...place(angle, r),
      });
    });
  }

  for (let pass = 0; pass < PASSES; pass++) {
    let clear = true;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]!;
        const b = nodes[j]!;
        if (!overlaps(nodeBox(a), nodeBox(b))) continue;
        clear = false;
        // Turn them apart; a tie turns by id, so the result never depends on luck.
        const d = turn(a.angle, b.angle) || (a.id < b.id ? 1 : -1);
        const sign = d > 0 ? 1 : -1;
        a.angle -= sign * NUDGE;
        b.angle += sign * NUDGE;
        // Ease the outer one out and the inner one in, a little, within their ring's band.
        const [outer, inner] = a.r >= b.r ? [a, b] : [b, a];
        outer.r = Math.min(outer.ring + DRIFT_MAX, outer.r + DRIFT);
        inner.r = Math.max(inner.ring - DRIFT_MAX, inner.r - DRIFT);
        Object.assign(a, place(a.angle, a.r));
        Object.assign(b, place(b.angle, b.r));
      }
    }
    if (clear) break;
  }

  return nodes.map((n) => ({
    id: n.id,
    x: n.x,
    y: n.y,
    level: n.level,
    angle: n.angle,
    labelW: n.labelW,
    thread: jag(WEB_CENTRE.x, WEB_CENTRE.y, n.x, n.y, n.id),
  }));
}

/** Whether anyone's disc or name sits on another's, or on you: the layout's promise. */
export function anyOverlap(nodes: readonly WebNode[]): boolean {
  for (let i = 0; i < nodes.length; i++) {
    if (overlaps(nodeBox(nodes[i]!), YOU_BOX, 0)) return true;
    for (let j = i + 1; j < nodes.length; j++) {
      if (overlaps(nodeBox(nodes[i]!), nodeBox(nodes[j]!), 0)) return true;
    }
  }
  return false;
}

/**
 * The part of the web the view opens on: everyone, their names, you, and any `extra` boxes such
 * as the ring labels, with a margin.
 */
export function webBounds(
  nodes: readonly WebNode[],
  extra: readonly Box[] = [],
): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  let { l, t, r, b } = YOU_BOX;
  for (const box of [...nodes.map(nodeBox), ...extra]) {
    l = Math.min(l, box.l);
    t = Math.min(t, box.t);
    r = Math.max(r, box.r);
    b = Math.max(b, box.b);
  }
  const m = 16;
  return { x: l - m, y: t - m, w: r - l + 2 * m, h: b - t + 2 * m };
}

export const RING_LABELS: readonly [number, string][] = [
  [2, 'trusting'],
  [1, 'friendly'],
  [0, 'neutral'],
  [-1, 'wary, or worse'],
];
const RING_LABEL_CHAR = 5;

/**
 * The ring labels that show, out to the farthest person, set in the widest empty stretch of the
 * web and centred on their ring: where each one's text sits, and the box it takes up.
 */
export function ringLabels(nodes: readonly WebNode[]) {
  const at = (labelAngle(nodes) * Math.PI) / 180;
  const [cos, sin] = [Math.cos(at), Math.sin(at)];
  const lowest = Math.min(0, ...nodes.map((n) => n.level));
  return RING_LABELS.filter(([level]) => level >= lowest).map(([level, text]) => {
    const r = ringFor(level);
    const x = WEB_CENTRE.x + r * cos;
    const y = WEB_CENTRE.y + r * sin + (sin < 0 ? -3 : 9);
    const half = (text.length * RING_LABEL_CHAR) / 2;
    return { level, text, x, y, box: { l: x - half, t: y - 9, r: x + half, b: y + 2 } };
  });
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

/** The faint threads between two people on the web you know are tied, as straight lines. */
export function tieLinks(
  nodes: readonly WebNode[],
  pairs: readonly { a: string; b: string }[],
): { key: string; x1: number; y1: number; x2: number; y2: number }[] {
  const at = new Map(nodes.map((n) => [n.id, n]));
  const out: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const { a, b } of pairs) {
    const na = at.get(a);
    const nb = at.get(b);
    if (na && nb) out.push({ key: `${a}~${b}`, x1: na.x, y1: na.y, x2: nb.x, y2: nb.y });
  }
  return out;
}
