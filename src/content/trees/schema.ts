// The shape every tree shares (design § Cultivation): nine tiers, one per realm. Each tier opens
// with a starter, spreads into 4 or 5 branches of minor and notable nodes, and closes on a
// capstone. Two or three branches are the capstone's: each ends in a notable that links into it,
// and owning those ends unlocks it. The others are side paths. The capstone links to the next
// tier's starter, so a tree climbs as one path. Nodes cost insight; a node above its tree's
// matching level can be learned but stays sealed, doing nothing, until you grow into it.
import type { LadderId } from '../cultivation.ts';
import type { Effect } from '../stats.ts';

/** One tier per realm. */
export const TIER_COUNT = 9;
/**
 * A Dao's tier bonus counts once you own half that tier's nodes, rounded up (design § Cultivation).
 * The big three don't use it: their tiers open through the capstone.
 */
export const TIER_HOLD = 0.5;
/** How far a tier's nodes sit from the centre line, either way, in layout units. */
export const TIER_HALF_WIDTH = 6.5;
/** The capstone's depth below the starter, in layout units; every node sits between. */
export const TIER_DEPTH = 10;

export type NodeKind = 'starter' | 'minor' | 'notable' | 'capstone';

export interface Branch {
  /** Unique across every tree. */
  id: string;
  name: string;
  tier: number;
  /** One of the capstone's branches: its end links into the capstone. */
  gate: boolean;
  /**
   * The Qi tree's Breath branch (design § Cultivation): a side path that pays only while you
   * attend, beside the tier's own 25 to 30 nodes rather than one of them.
   */
  breath?: boolean;
}

export interface TreeNode {
  /** Unique across every tree and manual. */
  id: string;
  /** Where the node lives: a tree, or a manual (content/manuals.ts, content/nodes.ts). */
  home: 'tree';
  name: string;
  hanzi: string;
  /** 1 at Qi Condensation, 2 at Foundation, and so on. */
  tier: number;
  kind: NodeKind;
  /** The branch a minor or notable node belongs to; starters and capstones have none. */
  branch?: string;
  /**
   * Where it sits in its tier, in layout units: across from the centre line (negative is left),
   * and down from the starter at 0 to the capstone at TIER_DEPTH.
   */
  at: readonly [x: number, y: number];
  /** Insight to learn it. */
  cost: number;
  /**
   * Nodes that must all be learned first: the node before it on its branch, the gating branches'
   * ends for a capstone, and the tier below's capstone for a starter above tier 1.
   */
  requires: readonly string[];
  effects: readonly Effect[];
  /** One line of flavor. */
  text: string;
}

export interface Tree {
  id: string;
  name: string;
  hanzi: string;
  /** The level that unseals its nodes: tier n needs this ladder at the nth realm. */
  ladder: LadderId;
  /** What it shapes, for the screen. */
  what: string;
  branches: readonly Branch[];
  nodes: readonly TreeNode[];
}

/** A tree as its file writes it: every node lives in the tree, so `home` is filled in here. */
export type TreeDef = Omit<Tree, 'nodes'> & { nodes: readonly Omit<TreeNode, 'home'>[] };

export function defineTree(t: TreeDef): Tree {
  return { ...t, nodes: t.nodes.map((n) => ({ ...n, home: 'tree' })) };
}
