// Trees (design § Cultivation): learn with insight, use with one gate. Learning costs only
// insight. A node needs every node it grows from: the one before it on its branch, the gating
// branches' ends for a capstone, and the tier below's capstone for a starter. A node above its
// tree's matching level stays sealed, doing nothing, until that ladder reaches the node's tier.
import { realmIndex } from '../content/realms.ts';
import {
  hasNode,
  TIER_HOLD,
  tierNodes,
  treeNode,
  treeOf,
  type Tree,
  type TreeNode,
} from '../content/trees/index.ts';
import type { Cultivator } from './state.ts';

/** True while the node's tree ladder sits below the node's tier. */
export function nodeSealed(c: Cultivator, node: TreeNode): boolean {
  return realmIndex(c[treeOf(node.id).ladder].realm) + 1 < node.tier;
}

export function hasLearned(c: Cultivator, id: string): boolean {
  return c.nodes.includes(id);
}

/** The learned nodes that work now. */
export function activeNodes(c: Cultivator): TreeNode[] {
  return c.nodes
    .filter(hasNode)
    .map(treeNode)
    .filter((n) => !nodeSealed(c, n));
}

export function tierOwned(c: Cultivator, t: Tree, tier: number): number {
  return tierNodes(t, tier).filter((n) => hasLearned(c, n.id)).length;
}

/** Nodes to own before a Dao's tier counts for its bonus: half of them, rounded up. */
export function tierHoldCount(t: Tree, tier: number): number {
  return Math.ceil(tierNodes(t, tier).length * TIER_HOLD);
}

/** A Dao's tier bonus counts once you own half its nodes (M2). Tier 0 is always held. */
export function tierHeld(c: Cultivator, t: Tree, tier: number): boolean {
  return tier < 1 || tierOwned(c, t, tier) >= tierHoldCount(t, tier);
}

export type LearnCheck = { ok: true } | { ok: false; reason: string };

/** Whether the cultivator can learn the node now, and why not. Sealed nodes can be learned. */
export function canLearn(c: Cultivator, id: string): LearnCheck {
  if (!hasNode(id)) return { ok: false, reason: 'No such node.' };
  const node = treeNode(id);
  if (hasLearned(c, id)) return { ok: false, reason: 'Already learned.' };
  const missing = node.requires.filter((r) => !hasLearned(c, r));
  if (missing.length) {
    return {
      ok: false,
      reason: `Learn ${listNames(missing.map((r) => treeNode(r).name))} first.`,
    };
  }
  if (c.insight.current < node.cost) {
    return { ok: false, reason: `Needs ${node.cost} insight.` };
  }
  return { ok: true };
}

/** "A", "A and B", "A, B and C". */
function listNames(names: readonly string[]): string {
  return names.length < 3
    ? names.join(' and ')
    : `${names.slice(0, -1).join(', ')} and ${names.at(-1)!}`;
}

/** Learns the node, spending its insight; the cultivator is unchanged when it can't. */
export function learnNode(
  c: Cultivator,
  id: string,
): { cultivator: Cultivator; check: LearnCheck } {
  const check = canLearn(c, id);
  if (!check.ok) return { cultivator: c, check };
  const node = treeNode(id);
  return {
    cultivator: {
      ...c,
      nodes: [...c.nodes, id],
      insight: { ...c.insight, current: c.insight.current - node.cost },
    },
    check,
  };
}
