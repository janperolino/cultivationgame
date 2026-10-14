// Where things sit on the Trees screen, in world pixels at zoom 1 (design § UI and screens, The
// trees are opening fans, and § Cultivation, Where manuals live). Every tree is a fan opening
// upward from its root at the hub: each realm a band further out and wider, a node's across an
// angle and its down a distance out. The manuals grafted on a tree are jewels in the crown on the
// rim of the band their nodes unseal in, the rarest by the peak; a jewel blooms in place into a
// small ring of its nodes. A manual with no host draws as a small fan of its own.
// Kept apart from the screen, as plain math, so its bounds stay tested.
import type { Manual, ManualNode } from '../content/manuals.ts';
import { method } from '../content/methods.ts';
import { rarityRank, type RarityId } from '../content/rarity.ts';
import { technique } from '../content/techniques.ts';
import { TIER_COUNT, TIER_DEPTH, type Tree, type TreeNode } from '../content/trees/index.ts';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** A point at an angle from straight up (clockwise, in degrees) and a distance from the hub. */
export function polar(angle: number, r: number): Point {
  return { x: r * Math.sin(rad(angle)), y: -r * Math.cos(rad(angle)) };
}

/**
 * Half a band's opening in degrees: 75 at Qi Condensation, 6.25 more a tier, until the bands are
 * a half circle from Nascent Soul on (Jan's call after P2.7): nothing ever sits below the root.
 */
export const LEVEL = 90;
export const halfOpening = (tier: number) => Math.min(LEVEL, 75 + (tier - 1) * 6.25);
/** Px for each step of a node's `at` down: the far bands are wide enough to pack tighter. */
export const depthStep = (tier: number) => (tier === 1 ? 54 : tier === 2 ? 46 : 34);
/** The tier's widest node sits at this share of its half-opening. */
const WIDEST = 0.9;
/** Where a band's nodes start before any crown below steps it out: 460 px a tier from tier 3. */
const firstRing = (tier: number) => (tier === 1 ? 150 : tier === 2 ? 840 : 1460 + (tier - 3) * 460);
/** The crown's rim lies this far past the capstone's ring, and the band's edge this far past it. */
const RIM_GAP = 52;
const EDGE_GAP = 30;

/**
 * The crown (design § Cultivation, Where manuals live): a slot every PITCH px of rim, CROWN_PAST
 * degrees past the band on each side, a PEAK_GAP either side of the peak for the climb, and another
 * row ROW px out when one fills. 42 px rather than the design's starting 44, so Qi Condensation
 * holds 80 in two rows.
 */
export const PITCH = 42;
export const ROW = 46;
export const PEAK_GAP = 3;
export const CROWN_PAST = 16;
export const crownSpan = (tier: number) => Math.min(LEVEL, halfOpening(tier) + CROWN_PAST);

/** A node's drawn size in px, by kind: the starter and capstone are medallions. */
export const NODE_SIZE: Record<TreeNode['kind'], number> = {
  minor: 16,
  notable: 24,
  starter: 40,
  capstone: 40,
};
/** A jewel's button, and its pips under it. */
export const JEWEL = 26;

/** A node's label: its box width, its line height, and about how many letters fit a line. */
export const LABEL_W = 96;
export const LABEL_LINE = 13;
const LABEL_CHARS = 16;

/** The lines a name wraps to in a label, by words: an estimate the bounds and tests lean on. */
export function labelLines(name: string): number {
  let lines = 1;
  let len = 0;
  for (const word of name.split(' ')) {
    const add = len === 0 ? word.length : len + 1 + word.length;
    if (add > LABEL_CHARS && len > 0) {
      lines++;
      len = word.length;
    } else len = add;
  }
  return lines;
}

/** One manual as the crown sees it: its band, its rarity, and the line its chapters climb. */
export interface CrownItem {
  id: string;
  tier: number;
  rarity: RarityId;
  /** A line's chapters keep one angle as they climb: the method's or the technique's line. */
  line?: string;
}

/** A jewel's place: its band, its row out from the rim, its angle, and its point from the hub. */
export interface Jewel {
  id: string;
  tier: number;
  row: number;
  angle: number;
  r: number;
  x: number;
  y: number;
}

/** The line a manual's chapters share: its method's or its technique's. */
export function lineOf(m: Manual): string | undefined {
  if (m.method) return `method:${method(m.method).line}`;
  if (m.technique) return `technique:${technique(m.technique).line}`;
  return undefined;
}

export function crownItem(m: Manual): CrownItem {
  return { id: m.id, tier: m.tier, rarity: m.rarity, line: lineOf(m) };
}

/** The radius of each band's first ring, given the crown rows of the bands below (index 1..9). */
function ringsFor(rows: readonly number[]): number[] {
  const out = [0];
  let shift = 0;
  for (let t = 1; t <= TIER_COUNT; t++) {
    out[t] = firstRing(t) + shift;
    shift += ((rows[t] ?? 1) - 1) * ROW;
  }
  return out;
}

const rimOf = (ring: number, tier: number) => ring + TIER_DEPTH * depthStep(tier) + RIM_GAP;

/**
 * Every band's crown, from the hub out (design § Cultivation, Where manuals live). The rarest takes
 * the slot just right of the peak, the next just left, and so on outward, the inner row filling
 * before the next; the order given (the order held) breaks ties, so a new white lands at the end
 * and moves nothing. A line's next chapter keeps the angle of the chapter before, on the inner
 * row, and the slots beside it step round it. A full row grows another ROW px out, and every band
 * above steps out by it. `rows` is index 1..9.
 */
export function crown(items: readonly CrownItem[]): { rows: number[]; jewels: Map<string, Jewel> } {
  const rows = [0];
  const jewels = new Map<string, Jewel>();
  const lineAngle = new Map<string, number>();
  let shift = 0;
  for (let t = 1; t <= TIER_COUNT; t++) {
    const rim = rimOf(firstRing(t) + shift, t);
    const span = crownSpan(t);
    const list = items.filter((m) => m.tier === t);
    const place = (m: CrownItem, row: number, angle: number) => {
      const r = rim + row * ROW;
      jewels.set(m.id, { id: m.id, tier: t, row, angle, r, ...polar(angle, r) });
      if (m.line) lineAngle.set(m.line, angle);
    };
    const kept: number[] = [];
    const fresh: CrownItem[] = [];
    for (const m of list) {
      const a = m.line !== undefined ? lineAngle.get(m.line) : undefined;
      if (a !== undefined && Math.abs(a) <= span) {
        kept.push(a);
        place(m, 0, a);
      } else fresh.push(m);
    }
    // Rarest first, the order held within a rarity (a stable sort).
    fresh.sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity));
    let n = 0;
    let row = 0;
    for (; n < fresh.length; row++) {
      const r = rim + row * ROW;
      const step = deg(PITCH / r);
      for (let s = 0; n < fresh.length; s++) {
        const a = (s % 2 ? -1 : 1) * (PEAK_GAP + step * (Math.floor(s / 2) + 0.5));
        if (Math.abs(a) > span) break;
        if (row === 0 && kept.some((k) => Math.abs(k - a) < step * 0.8)) continue;
        place(fresh[n++]!, row, a);
      }
    }
    rows[t] = Math.max(1, row);
    shift += (rows[t]! - 1) * ROW;
  }
  return { rows, jewels };
}

/** One band of a fan: where its nodes start, its crown's rim and rows, and its outer edge. */
export interface Band {
  tier: number;
  /** The inner edge: the band below's outer edge, or the hub. */
  inner: number;
  /** The ring its nodes start on: `at` 0 down. */
  ring: number;
  rim: number;
  rows: number;
  outer: number;
  half: number;
  span: number;
  /** Whether the tree writes any nodes here; an unwritten band is drawn empty. */
  charted: boolean;
  /** The band's name at its left end, right-aligned to this point, and its size. */
  name: Point;
  nameSize: number;
  /** A band opening past level reads its name inward from its point, not out past the band. */
  nameInward: boolean;
  /** Where the capstone stands, or would stand. */
  capstone: Point;
}

/** A tree node placed on the fan: its point, its angle and ring, and its label's box. */
export interface FanNode {
  node: TreeNode;
  x: number;
  y: number;
  r: number;
  angle: number;
  size: number;
  /** The label sits beside the node on an upright spoke, under it on a level one or at the hub. */
  beside: Beside;
  label: Rect;
}

/** Where a node's label sits: beside it on the outward side, or under or over it. */
export type Beside = 'left' | 'right' | 'under' | 'over';

export interface FanEdge {
  from: string;
  to: string;
  d: string;
}

export interface Fan {
  width: number;
  height: number;
  /** The hub, in world px; every other point here is in world px too. */
  hub: Point;
  bands: Band[];
  nodes: Map<string, FanNode>;
  edges: FanEdge[];
  jewels: Map<string, Jewel>;
}

/** The band names grow with their rings, so the far realms read when zoomed out to see them. */
export const bandNameSize = (ring: number) => Math.round(11 * Math.max(1, ring / 640));

/** A circle's arc from one angle to another at radius r, as an SVG command, hub-relative. */
function arcTo(r: number, from: number, to: number, o: Point): string {
  const p = polar(to, r);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  const sweep = to > from ? 1 : 0;
  return ` A${r} ${r} 0 ${large} ${sweep} ${p.x + o.x} ${p.y + o.y}`;
}

/** A band's whole arc from one end to the other, for the edge and the crown rows. */
export function bandArc(r: number, span: number, hub: Point): string {
  const a = polar(-span, r);
  return `M${a.x + hub.x} ${a.y + hub.y}${arcTo(r, -span, span, hub)}`;
}

/**
 * Edges follow the rings: a branch runs round its parent's ring and then straight out, branches
 * that meet (or a step inward) run straight out and then round the ring they meet on, and nodes
 * on one spoke join straight.
 */
function edgePath(a: FanNode, b: FanNode, merge: boolean, hub: Point): string {
  const start = `M${a.x} ${a.y}`;
  if (a.r === 0 || Math.abs(a.angle - b.angle) < 0.5) return `${start} L${b.x} ${b.y}`;
  if (merge || b.r < a.r) {
    const m = polar(a.angle, b.r);
    return `${start} L${m.x + hub.x} ${m.y + hub.y}${arcTo(b.r, a.angle, b.angle, hub)}`;
  }
  return `${start}${arcTo(a.r, a.angle, b.angle, hub)} L${b.x} ${b.y}`;
}

/**
 * A node's label box from its point: beside an upright spoke on its outward side (left of a node
 * left of the peak), under a level spoke's node or the hub's.
 */
function labelBox(n: TreeNode, p: Point, size: number, beside: Beside): Rect {
  const h = (labelLines(n.name) + 1) * LABEL_LINE;
  if (beside === 'right') return { x: p.x + size / 2 + 6, y: p.y - h / 2, w: LABEL_W, h };
  if (beside === 'left') return { x: p.x - size / 2 - 6 - LABEL_W, y: p.y - h / 2, w: LABEL_W, h };
  if (beside === 'over') return { x: p.x - LABEL_W / 2, y: p.y - size / 2 - 2 - h, w: LABEL_W, h };
  return { x: p.x - LABEL_W / 2, y: p.y + size / 2 + 2, w: LABEL_W, h };
}

const overlap = (a: Rect, b: Rect) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/**
 * Sets each node's label across its spoke (design § UI and screens, Edges and labels): beside an
 * upright spoke on its outward side, under a level spoke's node, the peak's own spoke and the hub
 * under too, since both sides of the peak have neighbours. From the hub out, a label that would
 * cover another label or a node tries the other places in turn and keeps the one that covers
 * least, so nodes along one spoke never share a place.
 */
function placeLabels(ps: Omit<FanNode, 'label'>[]): void {
  const shapes = ps.map((p) => ({
    x: p.x - p.size / 2,
    y: p.y - p.size / 2,
    w: p.size,
    h: p.size,
  }));
  const taken: Rect[] = [];
  for (const p of [...ps].sort((a, b) => a.r - b.r || a.angle - b.angle)) {
    const upright = Math.abs(Math.cos(rad(p.angle))) >= Math.abs(Math.sin(rad(p.angle)));
    const out: Beside = p.angle < 0 ? 'left' : 'right';
    const prefer: Beside[] =
      p.r === 0 || Math.abs(p.angle) < 0.5
        ? ['under', 'right', 'left', 'over']
        : upright
          ? [out, 'under', 'over', out === 'left' ? 'right' : 'left']
          : ['under', 'over', out];
    let best = prefer[0]!;
    let least = Infinity;
    for (const b of prefer) {
      const box = labelBox(p.node, p, p.size, b);
      const own = { x: p.x - p.size / 2, y: p.y - p.size / 2, w: p.size, h: p.size };
      const cover =
        taken.reduce((s, t) => s + overlap(box, t), 0) +
        shapes.reduce((s, t) => s + (t.x === own.x && t.y === own.y ? 0 : overlap(box, t)), 0);
      if (cover < least) {
        least = cover;
        best = b;
      }
      if (cover === 0) break;
    }
    p.beside = best;
    taken.push(labelBox(p.node, p, p.size, best));
  }
}

const PAD = 60;
/** The lowest a band's name sits, in degrees from straight up: just above level. */
const NAME_LOWEST = 84;

/** The tree as an opening fan, all nine bands drawn, with its grafts' jewels in their crowns. */
export function fan(t: Tree, grafts: readonly Manual[] = []): Fan {
  const { rows, jewels: rel } = crown(grafts.map(crownItem));
  const rings = ringsFor(rows);
  // Every authored tier's widest node sets how far its angles open.
  const widest = new Map<number, number>();
  for (const n of t.nodes) widest.set(n.tier, Math.max(widest.get(n.tier) ?? 1, Math.abs(n.at[0])));

  // First everything hub-relative, then shifted so the world starts at PAD.
  const bands: Band[] = [];
  for (let tier = 1; tier <= TIER_COUNT; tier++) {
    const ring = rings[tier]!;
    const rim = rimOf(ring, tier);
    const outer = rim + (rows[tier]! - 1) * ROW + EDGE_GAP;
    const half = halfOpening(tier);
    bands.push({
      tier,
      inner: tier === 1 ? 0 : bands[tier - 2]!.outer,
      ring,
      rim,
      rows: rows[tier]!,
      outer,
      half,
      span: crownSpan(tier),
      charted: t.nodes.some((n) => n.tier === tier),
      // At the band's left end, but never below the hub's level, where the world stops.
      name: polar(-Math.min(half + 9, NAME_LOWEST), ring + (tier > 2 ? 110 : depthStep(tier) * 5)),
      nameSize: bandNameSize(ring),
      nameInward: half + 9 > NAME_LOWEST,
      capstone: polar(0, ring + TIER_DEPTH * depthStep(tier)),
    });
  }
  const placed = new Map<string, Omit<FanNode, 'label'>>();
  for (const n of t.nodes) {
    const angle = (n.at[0] * WIDEST * halfOpening(n.tier)) / widest.get(n.tier)!;
    const r =
      n.tier === 1 && n.kind === 'starter' ? 0 : rings[n.tier]! + n.at[1] * depthStep(n.tier);
    placed.set(n.id, {
      node: n,
      ...polar(angle, r),
      r,
      angle,
      size: NODE_SIZE[n.kind],
      beside: 'under',
    });
  }
  placeLabels([...placed.values()]);

  // The world's bounds: every band's outer arc down to the hub's level, every label and name,
  // every jewel. The far bands open past level, but below the hub they hold nothing yet, so the
  // world stops there and their arcs are cut at its edge: a world half the size paints far less.
  const boxes: Rect[] = [];
  for (const b of bands) {
    const r = b.outer;
    const sideways = b.span + 4 >= LEVEL ? r : r * Math.sin(rad(b.span + 4));
    boxes.push({ x: -sideways, y: -r, w: sideways * 2, h: r });
    boxes.push(nameBox(b));
  }
  for (const p of placed.values()) boxes.push(labelBox(p.node, p, p.size, p.beside));
  for (const j of rel.values())
    boxes.push({ x: j.x - 30, y: j.y - JEWEL, w: 60, h: JEWEL * 2 + 10 });
  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.w));
  const maxY = Math.max(...boxes.map((b) => b.y + b.h));
  const hub = { x: PAD - minX, y: PAD - minY };
  const at = (p: Point) => ({ x: p.x + hub.x, y: p.y + hub.y });

  for (const b of bands) {
    b.name = at(b.name);
    b.capstone = at(b.capstone);
  }
  const nodes = new Map<string, FanNode>();
  for (const [id, p] of placed) {
    const w = at(p);
    nodes.set(id, { ...p, ...w, label: labelBox(p.node, w, p.size, p.beside) });
  }
  const jewels = new Map<string, Jewel>();
  for (const [id, j] of rel) jewels.set(id, { ...j, ...at(j) });
  const edges: FanEdge[] = [];
  for (const n of t.nodes) {
    for (const req of n.requires) {
      const a = nodes.get(req);
      if (!a) continue;
      edges.push({
        from: req,
        to: n.id,
        d: edgePath(a, nodes.get(n.id)!, n.requires.length > 1, hub),
      });
    }
  }
  return {
    width: maxX - minX + PAD * 2,
    height: maxY - minY + PAD * 2,
    hub,
    bands,
    nodes,
    edges,
    jewels,
  };
}

/** About how wide a band's name runs, in px: "Tier 3 · Core Formation 结丹 · 12 manuals". */
export const nameWidth = (size: number) => size * 26;

/** A band's name box, right-aligned to its point (left-aligned when it reads inward), a line of its size and a caption under it. */
export function nameBox(b: Pick<Band, 'name' | 'nameSize' | 'nameInward'>): Rect {
  const w = nameWidth(b.nameSize);
  const x = b.nameInward ? b.name.x : b.name.x - w;
  return { x, y: b.name.y - b.nameSize, w, h: b.nameSize * 3 };
}

/** Where a band's realm is looked at: its peak, between its first ring and its outer edge. */
export function bandFocus(f: Fan, tier: number): Point {
  const b = f.bands[tier - 1]!;
  if (tier === 1) return f.hub;
  const p = polar(0, (b.ring + b.outer) / 2);
  return { x: p.x + f.hub.x, y: p.y + f.hub.y };
}

/** How wide and tall a band shows, for fitting it to the screen: its outer arc's box. */
export function bandSize(f: Fan, tier: number): { w: number; h: number } {
  const b = f.bands[tier - 1]!;
  const sideways = b.span >= 90 ? b.outer : b.outer * Math.sin(rad(b.span));
  return { w: sideways * 2, h: b.outer - b.inner + 120 };
}

/** A bloom (design § Cultivation, Where manuals live): a disc over its neighbours, nodes on a ring. */
export const BLOOM_DISC = 176;
export const BLOOM_RING = 36;
/** A bloom node's label sits this far out from the heart. */
export const BLOOM_LABEL = 62;

export interface BloomNode {
  node: ManualNode;
  /** From the heart, in px. */
  x: number;
  y: number;
  /** The direction out from the heart, for its label (degrees, 0 is right, −90 up). */
  out: number;
}

export interface Bloom {
  nodes: BloomNode[];
  /** Paths from the heart: a root from the heart itself, the rest round the ring or straight. */
  edges: FanEdge[];
}

/** The order round the ring: a chain along it, a fork's parent between its children's arcs. */
function bloomOrder(m: Manual): ManualNode[] {
  const own = new Map(m.nodes.map((n) => [n.id, n]));
  const kids = new Map<string, ManualNode[]>();
  const roots: ManualNode[] = [];
  for (const n of m.nodes) {
    const parent = n.requires.find((r) => own.has(r));
    if (parent) kids.set(parent, [...(kids.get(parent) ?? []), n]);
    else roots.push(n);
  }
  const out: ManualNode[] = [];
  const walk = (n: ManualNode) => {
    const ks = kids.get(n.id) ?? [];
    const left = ks.length > 1 ? ks.slice(0, Math.floor(ks.length / 2)) : [];
    left.forEach(walk);
    out.push(n);
    ks.slice(left.length).forEach(walk);
  };
  roots.forEach(walk);
  return out;
}

/** The angles round the ring's upper arc: one at the top, two at ±45°, three at −60°, 0°, +60°. */
function bloomAngles(n: number): number[] {
  if (n === 1) return [-90];
  if (n === 2) return [-135, -45];
  if (n === 3) return [-150, -90, -30];
  return Array.from({ length: n }, (_, i) => -170 + (160 * i) / (n - 1));
}

/**
 * A manual opened in place: its nodes on the upper arc of a ring round the heart in requirement
 * order, or, for a hand-written manual from purple up whose nodes all name their `at`, where it
 * lays them, scaled into the disc.
 */
export function bloom(m: Manual): Bloom {
  const placed = new Map<string, BloomNode>();
  const own = m.nodes.every((n) => n.at) && rarityRank(m.rarity) >= rarityRank('purple');
  if (own) {
    const cols = Math.max(...m.nodes.map((n) => n.at![0]));
    const rowsUp = Math.max(...m.nodes.map((n) => n.at![1]));
    const gap = Math.min(40, 120 / Math.max(1, cols), 50 / Math.max(1, rowsUp));
    for (const n of m.nodes) {
      const x = (n.at![0] - cols / 2) * gap;
      const y = -26 - (rowsUp - n.at![1]) * gap;
      placed.set(n.id, { node: n, x, y, out: deg(Math.atan2(y, x)) });
    }
  } else {
    const order = bloomOrder(m);
    const angles = bloomAngles(order.length);
    order.forEach((n, i) => {
      const a = angles[i]!;
      placed.set(n.id, {
        node: n,
        x: BLOOM_RING * Math.cos(rad(a)),
        y: BLOOM_RING * Math.sin(rad(a)),
        out: a,
      });
    });
  }
  const edges: FanEdge[] = [];
  for (const b of placed.values()) {
    const parents = b.node.requires.filter((r) => placed.has(r));
    if (parents.length === 0) {
      edges.push({ from: m.id, to: b.node.id, d: `M0 0 L${b.x} ${b.y}` });
      continue;
    }
    for (const r of parents) {
      const a = placed.get(r)!;
      const d = own
        ? `M${a.x} ${a.y} L${b.x} ${b.y}`
        : `M${a.x} ${a.y} A${BLOOM_RING} ${BLOOM_RING} 0 0 ${b.out > a.out ? 1 : 0} ${b.x} ${b.y}`;
      edges.push({ from: r, to: b.node.id, d });
    }
  }
  return { nodes: m.nodes.map((n) => placed.get(n.id)!), edges };
}

/** A hostless manual's own fan: px between rings, between its bands, and between siblings' labels. */
export const OWN_STEP = 72;
const OWN_BAND_GAP = 20;
const OWN_ARC = 100;
/** The widest the leaves may spread, in degrees either side of straight up. */
const OWN_SPREAD = 75;
export const OWN_LABEL_W = 88;
/** A node's radius there. */
export const OWN_R = 11;
/** A band's name: two short lines, right-aligned to the band's left end. */
export const OWN_NAME_W = 112;

export interface OwnBand {
  tier: number;
  /** Its outer edge, from the hub, and how far it opens either side. */
  outer: number;
  half: number;
  /** Its name's top right, just under the band's left end, in px from the box's top-left. */
  name: Point;
}

export interface OwnFan {
  width: number;
  height: number;
  hub: Point;
  bands: OwnBand[];
  nodes: { node: ManualNode; x: number; y: number }[];
  edges: FanEdge[];
}

/**
 * A manual with no host, as a small fan of its own (design § UI and screens, A manual's own tree):
 * a radial tree opening upward from its first node at the hub, one band a tier in ascending order,
 * tier 1 innermost. A node sits a ring past every node it needs, and never inside its own tier's
 * band. Each branch keeps its own wedge: the outermost nodes share the opening evenly in the
 * order the branches grow, and a node stands at the middle of the nodes that grow from it, so no
 * two branches cross. An edge leaves its parent straight out, runs round just past the parent's
 * ring and goes straight out to the child, so a fork opens as arcs from one node. Labels sit under
 * their nodes. In px from the box's top-left.
 */
export function ownFan(m: Manual): OwnFan {
  const own = new Map(m.nodes.map((n) => [n.id, n]));
  const parentsOf = (n: ManualNode) => n.requires.flatMap((r) => own.get(r) ?? []);
  // The tree the wedges follow: each node under its first parent.
  const kids = new Map<string, ManualNode[]>();
  const roots: ManualNode[] = [];
  for (const n of m.nodes) {
    const p = parentsOf(n)[0];
    if (p) kids.set(p.id, [...(kids.get(p.id) ?? []), n]);
    else roots.push(n);
  }

  // Rings, tier by tier: past every parent, and past the band below.
  const tiers = [...new Set(m.nodes.map((n) => n.tier))].sort((a, b) => a - b);
  const ring = new Map<string, number>();
  let floor = roots.length === 1 ? 0 : 1;
  for (const tier of tiers) {
    const inBand = m.nodes.filter((n) => n.tier === tier);
    const ringOf = (n: ManualNode, seen: Set<string>): number => {
      const known = ring.get(n.id);
      if (known !== undefined) return known;
      if (seen.has(n.id)) return floor;
      seen.add(n.id);
      const r = Math.max(
        n.tier === tier ? floor : 0,
        ...parentsOf(n).map((p) => ringOf(p, seen) + 1),
      );
      ring.set(n.id, r);
      return r;
    };
    for (const n of inBand) ringOf(n, new Set());
    floor = Math.max(...inBand.map((n) => ring.get(n.id)!)) + 1;
  }
  const band = (tier: number) => tiers.indexOf(tier);
  const radiusOf = (n: ManualNode) =>
    ring.get(n.id)! === 0 ? 0 : ring.get(n.id)! * OWN_STEP + band(n.tier) * OWN_BAND_GAP;

  // Wedges: the outermost nodes in branch order, evenly; each other node at its branches' middle.
  const leaves: ManualNode[] = [];
  const walk = (n: ManualNode) => {
    const ks = kids.get(n.id) ?? [];
    if (ks.length === 0) leaves.push(n);
    ks.forEach(walk);
  };
  roots.forEach(walk);
  const nearest = Math.min(...leaves.map(radiusOf).filter((r) => r > 0), Infinity);
  const step =
    leaves.length > 1
      ? Math.min(
          deg(OWN_ARC / (Number.isFinite(nearest) ? nearest : OWN_STEP)),
          (OWN_SPREAD * 2) / (leaves.length - 1),
        )
      : 0;
  const angle = new Map<string, number>();
  leaves.forEach((n, i) => angle.set(n.id, (i - (leaves.length - 1) / 2) * step));
  const place = (n: ManualNode): number => {
    const known = angle.get(n.id);
    if (known !== undefined) return known;
    const as = (kids.get(n.id) ?? []).map(place);
    const a = as.reduce((s, x) => s + x, 0) / as.length;
    angle.set(n.id, a);
    return a;
  };
  m.nodes.forEach(place);
  // Nodes sharing a ring keep at least a label's width apart, the ring's middle held.
  const byRadius = new Map<number, ManualNode[]>();
  for (const n of m.nodes) {
    const r = radiusOf(n);
    if (r > 0) byRadius.set(r, [...(byRadius.get(r) ?? []), n]);
  }
  for (const [r, ns] of byRadius) {
    // A chord, not an arc: labels sit apart in a straight line.
    const gap = 2 * deg(Math.asin(Math.min(1, OWN_ARC / (2 * r))));
    const sorted = [...ns].sort((a, b) => angle.get(a.id)! - angle.get(b.id)!);
    const before = sorted.reduce((s, n) => s + angle.get(n.id)!, 0) / sorted.length;
    for (let i = 1; i < sorted.length; i++) {
      const prev = angle.get(sorted[i - 1]!.id)!;
      if (angle.get(sorted[i]!.id)! < prev + gap) angle.set(sorted[i]!.id, prev + gap);
    }
    const after = sorted.reduce((s, n) => s + angle.get(n.id)!, 0) / sorted.length;
    for (const n of sorted) angle.set(n.id, angle.get(n.id)! - after + before);
  }

  const rel = m.nodes.map((node) => ({ node, ...polar(angle.get(node.id)!, radiusOf(node)) }));
  // Each band's edge half a ring past its last nodes, opening as wide as its nodes and the ones
  // inside it, with room for their labels.
  const bands = tiers.map((tier) => {
    const upTo = m.nodes.filter((n) => band(n.tier) <= band(tier));
    const last = Math.max(...m.nodes.filter((n) => n.tier === tier).map(radiusOf));
    const outer = last + OWN_STEP / 2 + OWN_BAND_GAP / 2;
    const half = Math.max(
      30,
      ...upTo.map((n) => Math.abs(angle.get(n.id)!) + deg(OWN_LABEL_W / 2 / Math.max(outer, 1))),
    );
    return { tier, outer, half: Math.min(half, 100) };
  });
  // The name just inside the band's left end.
  const names = bands.map((b) => {
    const end = polar(-b.half, b.outer);
    return { x: end.x - 4, y: end.y + 4 };
  });
  const boxes: Rect[] = [
    ...rel.map((p) => ({
      x: p.x - OWN_LABEL_W / 2,
      y: p.y - OWN_R,
      w: OWN_LABEL_W,
      h: OWN_R * 2 + 6 + 3 * LABEL_LINE,
    })),
    ...bands.map((b) => {
      const side = b.half >= 90 ? b.outer : b.outer * Math.sin(rad(b.half));
      const low = Math.max(0, -b.outer * Math.cos(rad(b.half)));
      return { x: -side, y: -b.outer, w: side * 2, h: b.outer + low };
    }),
    ...names.map((p) => ({ x: p.x - OWN_NAME_W, y: p.y, w: OWN_NAME_W, h: 28 })),
  ];
  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.w));
  const maxY = Math.max(...boxes.map((b) => b.y + b.h));
  const hub = { x: 8 - minX, y: 8 - minY };
  const nodes = rel.map((p) => ({ node: p.node, x: p.x + hub.x, y: p.y + hub.y }));
  const at = new Map(nodes.map((p) => [p.node.id, p]));
  const edges: FanEdge[] = [];
  for (const n of m.nodes) {
    for (const q of parentsOf(n)) {
      const a = at.get(q.id)!;
      const b = at.get(n.id)!;
      const ra = radiusOf(q);
      const ga = angle.get(q.id)!;
      const gb = angle.get(n.id)!;
      let d: string;
      if (ra === 0 || Math.abs(ga - gb) < 0.5) d = `M${a.x} ${a.y} L${b.x} ${b.y}`;
      else {
        const bend = ra + OWN_STEP / 2;
        const out = polar(ga, bend);
        d = `M${a.x} ${a.y} L${out.x + hub.x} ${out.y + hub.y}${arcTo(bend, ga, gb, hub)} L${b.x} ${b.y}`;
      }
      edges.push({ from: q.id, to: n.id, d });
    }
  }
  return {
    width: maxX - minX + 16,
    height: maxY - minY + 16,
    hub,
    bands: bands.map((b, i) => ({
      ...b,
      name: { x: names[i]!.x + hub.x, y: names[i]!.y + hub.y },
    })),
    nodes,
    edges,
  };
}

/** A node's card: its width, and about how tall it runs with Learn under it. */
export const TIP_W = 248;
export const TIP_TALL = 230;

/**
 * Where a node's card sits in an area, in its px: right of the node, else left of it, else under
 * it (over it near the bottom), always inside the area's sides and top.
 */
export function placeTip(
  at: Point,
  half: number,
  area: { w: number; h: number },
): { left: number; top: number; width: number } {
  const width = Math.min(TIP_W, area.w - 16);
  let left: number;
  let top = at.y - 16;
  if (at.x + half + 14 + width <= area.w - 8) left = at.x + half + 14;
  else if (at.x - half - 14 - width >= 8) left = at.x - half - 14 - width;
  else {
    left = at.x - width / 2;
    top = at.y + half + 10 + TIP_TALL > area.h ? at.y - half - 10 - TIP_TALL : at.y + half + 10;
  }
  return {
    width,
    left: Math.min(Math.max(8, left), area.w - width - 8),
    top: Math.max(8, Math.min(top, area.h - TIP_TALL)),
  };
}
