// Trees (design § Cultivation): learn with insight, use with one gate. Learning costs only
// insight. A node above its tree's matching level stays sealed, doing nothing, until that
// ladder reaches the node's tier.
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

/** Nodes to own before a tier counts as held: half of them, rounded up. */
export function tierHoldCount(t: Tree, tier: number): number {
  return Math.ceil(tierNodes(t, tier).length * TIER_HOLD);
}

export function tierOwned(c: Cultivator, t: Tree, tier: number): number {
  return tierNodes(t, tier).filter((n) => hasLearned(c, n.id)).length;
}

/** You hold a tier once you own half its nodes. Tier 0 is always held. */
export function tierHeld(c: Cultivator, t: Tree, tier: number): boolean {
  return tier < 1 || tierOwned(c, t, tier) >= tierHoldCount(t, tier);
}

export type LearnCheck = { ok: true } | { ok: false; reason: string };

/** Whether the cultivator can learn the node now, and why not. Sealed nodes can be learned. */
export function canLearn(c: Cultivator, id: string): LearnCheck {
  if (!hasNode(id)) return { ok: false, reason: 'No such node.' };
  const node = treeNode(id);
  const t = treeOf(id);
  if (hasLearned(c, id)) return { ok: false, reason: 'Already learned.' };
  if (node.kind === 'starter' && !tierHeld(c, t, node.tier - 1)) {
    const need = tierHoldCount(t, node.tier - 1);
    return {
      ok: false,
      reason: `Hold tier ${node.tier - 1} first: learn ${need} of its nodes.`,
    };
  }
  const missing = node.requires.filter((r) => !hasLearned(c, r));
  if (missing.length) {
    return {
      ok: false,
      reason: `Learn ${missing.map((r) => treeNode(r).name).join(' and ')} first.`,
    };
  }
  if (c.insight.current < node.cost) {
    return { ok: false, reason: `Needs ${node.cost} insight.` };
  }
  return { ok: true };
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
