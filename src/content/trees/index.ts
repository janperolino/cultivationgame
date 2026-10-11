// Every tree, and lookups by id. A new node is an entry in its tree's file, not new code.
// The Daos (M2) and Ways (M3) join this list in the same shape.
import { BODY_TREE } from './body.ts';
import { QI_TREE } from './qi.ts';
import type { Tree, TreeNode } from './schema.ts';
import { SOUL_TREE } from './soul.ts';

export * from './schema.ts';

export const TREES: readonly Tree[] = [QI_TREE, BODY_TREE, SOUL_TREE];

const trees = new Map(TREES.map((t) => [t.id, t]));
const nodes = new Map<string, { node: TreeNode; tree: Tree }>();
for (const tree of TREES) for (const node of tree.nodes) nodes.set(node.id, { node, tree });

export function tree(id: string): Tree {
  const t = trees.get(id);
  if (!t) throw new RangeError(`Unknown tree ${id}`);
  return t;
}

export function hasNode(id: string): boolean {
  return nodes.has(id);
}

export function treeNode(id: string): TreeNode {
  const n = nodes.get(id);
  if (!n) throw new RangeError(`Unknown tree node ${id}`);
  return n.node;
}

/** The tree a node belongs to. */
export function treeOf(id: string): Tree {
  const n = nodes.get(id);
  if (!n) throw new RangeError(`Unknown tree node ${id}`);
  return n.tree;
}

export function tierNodes(t: Tree, tier: number): TreeNode[] {
  return t.nodes.filter((n) => n.tier === tier);
}
