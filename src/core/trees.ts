// Trees and manuals (design § Cultivation): learn with insight, use with one gate. Learning costs
// only insight. A node needs every node it grows from: on a tree, the one before it on its branch,
// the gating branches' ends for a capstone, and the tier below's capstone for a starter; in a
// manual, only that manual's own nodes, and you must hold the manual. A tree node above its tree's
// matching level stays sealed, doing nothing, until that ladder reaches the node's tier; a loose
// manual's node waits on the manual's ladder the same way, a method's node on the method's
// mastery, and an Art's on its technique's.
import { manual, techniqueArt } from '../content/manuals.ts';
import { anyNode, hasAnyNode, type AnyNode } from '../content/nodes.ts';
import { realmIndex } from '../content/realms.ts';
import { TIER_HOLD, tierNodes, treeOf, type Tree } from '../content/trees/index.ts';
import { holdsManual } from './manuals.ts';
import { knowsMethod, methodMastery } from './methods.ts';
import type { Cultivator } from './state.ts';
import { knowsTechnique, mastery as techniqueMastery } from './techniques.ts';

/**
 * True while the node can't work yet: a tree node while its tree's ladder sits below its tier; a
 * loose manual's node the same on the manual's ladder; a method's node until the method reaches
 * its mastery level, and an Art's until its technique does.
 */
export function nodeSealed(c: Cultivator, node: AnyNode): boolean {
  if (node.home === 'tree') return realmIndex(c[treeOf(node.id).ladder].realm) + 1 < node.tier;
  const m = manual(node.manual);
  if (m.method && node.mastery !== undefined) {
    return !knowsMethod(c, m.method) || methodMastery(c, m.method).level < node.mastery;
  }
  if (m.technique && node.mastery !== undefined) {
    return !knowsTechnique(c, m.technique) || techniqueMastery(c, m.technique).level < node.mastery;
  }
  return realmIndex(c[m.ladder].realm) + 1 < node.tier;
}

export function hasLearned(c: Cultivator, id: string): boolean {
  return c.nodes.includes(id);
}

/** The learned nodes that work now, from trees and manuals alike. */
export function activeNodes(c: Cultivator): AnyNode[] {
  return c.nodes
    .filter(hasAnyNode)
    .map(anyNode)
    .filter((n) => !nodeSealed(c, n));
}

/**
 * What an Art's awake passives put on its technique alone, summed: power and qi cost as shares
 * (0.08 is +8%) and Hit in points.
 */
export function artOwn(
  c: Cultivator,
  techniqueId: string,
): { power: number; cost: number; hit: number } {
  const out = { power: 0, cost: 0, hit: 0 };
  for (const n of techniqueArt(techniqueId)?.nodes ?? []) {
    if (!hasLearned(c, n.id) || nodeSealed(c, n)) continue;
    for (const e of n.own ?? []) {
      if (e.stat === 'techniquePower') out.power += e.value;
      else if (e.stat === 'techniqueCost') out.cost += e.value;
      else if (e.stat === 'hit') out.hit += e.value;
    }
  }
  return out;
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
  if (!hasAnyNode(id)) return { ok: false, reason: 'No such node.' };
  const node = anyNode(id);
  if (hasLearned(c, id)) return { ok: false, reason: 'Already learned.' };
  if (node.home === 'manual' && !holdsManual(c, node.manual)) {
    return { ok: false, reason: `You don't hold ${manual(node.manual).name}.` };
  }
  const missing = node.requires.filter((r) => !hasLearned(c, r));
  if (missing.length) {
    return {
      ok: false,
      reason: `Learn ${listNames(missing.map((r) => anyNode(r).name))} first.`,
    };
  }
  if (c.insight.current < node.cost) {
    return { ok: false, reason: `Needs ${node.cost} insight.` };
  }
  return { ok: true };
}

/**
 * A node you can buy now and that works once bought: learnable, and not waiting on a mastery
 * level or a realm. The bookcase and the hostless trees make these glow.
 */
export function nodeReady(c: Cultivator, n: AnyNode): boolean {
  return canLearn(c, n.id).ok && !nodeSealed(c, n);
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
  const node = anyNode(id);
  return {
    cultivator: {
      ...c,
      nodes: [...c.nodes, id],
      insight: { ...c.insight, current: c.insight.current - node.cost },
    },
    check,
  };
}
