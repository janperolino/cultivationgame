// The shape every tree shares (design § Cultivation): nine tiers, one per realm, each opening with
// a starter node and ending in a capstone. Nodes cost insight. A node above its tree's matching
// level can be learned but stays sealed, doing nothing, until you grow into it.
import type { LadderId } from '../cultivation.ts';
import type { Effect } from '../stats.ts';

/** One tier per realm. */
export const TIER_COUNT = 9;
/** Columns and rows of a tier band on the Trees screen. */
export const TIER_COLS = 5;
export const TIER_ROWS = 4;
/**
 * You hold a tier once you own half its nodes, rounded up. A tier's starter needs the tier below
 * held; every other node names the nodes it grows from.
 */
export const TIER_HOLD = 0.5;

export interface TreeNode {
  /** Unique across every tree. */
  id: string;
  name: string;
  hanzi: string;
  /** 1 at Qi Condensation, 2 at Foundation, and so on. */
  tier: number;
  /** Column and row inside the tier band, from the top left. */
  at: readonly [col: number, row: number];
  /** Insight to learn it. */
  cost: number;
  kind?: 'starter' | 'capstone';
  /** Nodes that must be learned first; a starter's requirement is the tier below, held. */
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
  nodes: readonly TreeNode[];
}
