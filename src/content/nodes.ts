// Every node a cultivator can own, wherever it lives: a tree's (content/trees) or a manual's
// (content/manuals.ts). Each carries its `home`, so a learned node's id finds its rules: a tree
// node unseals with its tree's ladder, a manual node with its manual's ladder or method mastery.
import { MANUALS, type ManualNode } from './manuals.ts';
import { TREES, type TreeNode } from './trees/index.ts';

export type AnyNode = TreeNode | ManualNode;

const nodes = new Map<string, AnyNode>();
for (const t of TREES) for (const n of t.nodes) nodes.set(n.id, n);
for (const m of MANUALS) for (const n of m.nodes) nodes.set(n.id, n);

export function hasAnyNode(id: string): boolean {
  return nodes.has(id);
}

/** A tree's or a manual's node by id. */
export function anyNode(id: string): AnyNode {
  const n = nodes.get(id);
  if (!n) throw new RangeError(`Unknown node ${id}`);
  return n;
}
