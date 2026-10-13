// Where things sit on the Trees screen's canvas, in world pixels at zoom 1: a tree's nine tier
// bands and its nodes, and the manuals grafted beside it (design § Cultivation, Where manuals
// live). A graft is a cluster in a column right of the tree, in the tier band its nodes unseal in,
// with a name plate on top and a dotted bracket to the band, joined to none of the tree's nodes.
// Its nodes lay out from their `requires`, the chain running down and siblings across, unless a
// node names its own `at`; several manuals in one band sit side by side, outward.
import type { Manual, ManualNode } from '../content/manuals.ts';
import {
  TIER_COUNT,
  TIER_DEPTH,
  TIER_HALF_WIDTH,
  tierNodes,
  type Tree,
  type TreeNode,
} from '../content/trees/index.ts';

export interface Point {
  x: number;
  y: number;
}

/** Pixels per layout unit at zoom 1. */
export const UNIT = 60;
/** Room either side of a tier's widest node, in units. */
const SIDE = 1.3;
/** A charted band: its heading, the gap above the starter, the nodes, the gap below. */
export const HEAD = 1.1;
const ABOVE = 1;
const BELOW = 1.1;
export const CHARTED = HEAD + ABOVE + TIER_DEPTH + BELOW;
export const UNCHARTED = 1.2;
/** The tree's own width, its bands' full span when nothing is grafted. */
export const TREE_W = (TIER_HALF_WIDTH + SIDE) * 2 * UNIT;
/** Half a node button's width: its name wraps inside 110 px. */
export const NODE_HALF_W = 55;

/** Units between a graft's sibling columns and between its rows. */
const COL = 2;
const ROW = 1.5;
/** A name plate's least width and its height with the gap under it, in units. */
const PLATE_W = 3.4;
const PLATE_H = 1.1;
/** The gap from the tree to the first graft, and between grafts in a band, in units. */
const GAP = 0.7;
/** How far below the band's top a graft's plate starts, in units. */
const GRAFT_TOP = HEAD + 0.1;

/** A manual's nodes as a cluster: its size and each node's spot from its top-left, in pixels. */
export interface Cluster {
  manual: Manual;
  width: number;
  height: number;
  nodes: { node: ManualNode; at: Point }[];
}

/** Each node's column and row: hand-placed by `at`, else the chain down and siblings across. */
function cells(m: Manual): Map<string, readonly [number, number]> {
  const depth = new Map<string, number>();
  const own = new Map(m.nodes.map((n) => [n.id, n]));
  const depthOf = (n: ManualNode): number => {
    const known = depth.get(n.id);
    if (known !== undefined) return known;
    const parents = n.requires.map((r) => own.get(r)).filter((p) => p !== undefined);
    const d = parents.length ? Math.max(...parents.map(depthOf)) + 1 : 0;
    depth.set(n.id, d);
    return d;
  };
  const out = new Map<string, readonly [number, number]>();
  const perRow = new Map<number, number>();
  for (const n of m.nodes) {
    if (n.at) {
      out.set(n.id, n.at);
      continue;
    }
    const row = depthOf(n);
    const col = perRow.get(row) ?? 0;
    perRow.set(row, col + 1);
    out.set(n.id, [col, row]);
  }
  return out;
}

/** A manual laid out on its own: a name plate on top and its nodes under it. */
export function cluster(m: Manual): Cluster {
  const at = cells(m);
  const cols = Math.max(1, ...[...at.values()].map(([c]) => c + 1));
  const rows = Math.max(1, ...[...at.values()].map(([, r]) => r + 1));
  const width = Math.max(PLATE_W, cols * COL) * UNIT;
  // The columns sit centred under the plate.
  const left = (width - cols * COL * UNIT) / 2;
  return {
    manual: m,
    width,
    height: (PLATE_H + 0.6 + (rows - 1) * ROW + 0.6) * UNIT,
    nodes: m.nodes.map((node) => {
      const [c, r] = at.get(node.id)!;
      return {
        node,
        at: { x: left + (COL / 2 + c * COL) * UNIT, y: (PLATE_H + 0.6 + r * ROW) * UNIT },
      };
    }),
  };
}

/** A manual grafted on a tree's canvas: where its cluster and its bracket sit, in world pixels. */
export interface Graft extends Cluster {
  tier: number;
  /** The cluster's top-left. */
  x: number;
  y: number;
  /** The dotted bracket down its left side, spanning the band's nodes. */
  bracket: { x: number; top: number; bottom: number };
}

export interface Layout {
  /** Each tier's band top, index 1..9. */
  top: number[];
  /** Each tier's band height, index 1..9. */
  bandHeight: number[];
  width: number;
  height: number;
  pos: (n: TreeNode) => Point;
  grafts: Graft[];
  /** A grafted node's centre, by id. */
  graftPos: Map<string, Point>;
}

/** The tree's bands and nodes, and the manuals grafted beside it in their tier bands. */
export function layout(t: Tree, grafts: readonly Manual[] = []): Layout {
  const top: number[] = [0];
  const bandHeight: number[] = [0];
  let y = 0;
  for (let tier = 1; tier <= TIER_COUNT; tier++) {
    top[tier] = y;
    const charted = tierNodes(t, tier).length > 0 || grafts.some((m) => m.tier === tier);
    const h = (charted ? CHARTED : UNCHARTED) * UNIT;
    bandHeight[tier] = h;
    y += h;
  }

  const placed: Graft[] = [];
  const graftPos = new Map<string, Point>();
  let width = TREE_W;
  for (let tier = 1; tier <= TIER_COUNT; tier++) {
    let x = TREE_W + GAP * UNIT;
    for (const m of grafts.filter((g) => g.tier === tier)) {
      const c = cluster(m);
      const gy = top[tier]! + GRAFT_TOP * UNIT;
      placed.push({
        ...c,
        tier,
        x,
        y: gy,
        bracket: {
          x: x - 0.2 * UNIT,
          top: gy,
          bottom: top[tier]! + bandHeight[tier]! - BELOW * UNIT,
        },
      });
      for (const n of c.nodes) graftPos.set(n.node.id, { x: x + n.at.x, y: gy + n.at.y });
      x += c.width + GAP * UNIT;
    }
    width = Math.max(width, x);
  }

  return {
    top,
    bandHeight,
    width,
    height: y,
    pos: (n) => ({
      x: (n.at[0] + TIER_HALF_WIDTH + SIDE) * UNIT,
      y: top[n.tier]! + (HEAD + ABOVE + n.at[1]) * UNIT,
    }),
    grafts: placed,
    graftPos,
  };
}
