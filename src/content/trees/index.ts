// Every tree, and lookups by id. A new node is an entry in its tree's file, not new code.
// The Daos (M2) and Ways (M3) join this list in the same shape.
import { BODY_TREE } from './body.ts';
import { QI_TREE } from './qi.ts';
import type { Branch, Tree, TreeNode } from './schema.ts';
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

export function tierBranches(t: Tree, tier: number): Branch[] {
  return t.branches.filter((b) => b.tier === tier);
}

export function branchNodes(t: Tree, branchId: string): TreeNode[] {
  return t.nodes.filter((n) => n.branch === branchId);
}

/** A branch's last node: the one no other node on the branch grows from. */
export function branchEnd(t: Tree, branchId: string): TreeNode | undefined {
  const nodes = branchNodes(t, branchId);
  return nodes.find((n) => !nodes.some((o) => o.requires.includes(n.id)));
}

/** The tier's node of the given kind: its starter or its capstone. */
export function tierNode(
  t: Tree,
  tier: number,
  kind: 'starter' | 'capstone',
): TreeNode | undefined {
  return t.nodes.find((n) => n.tier === tier && n.kind === kind);
}

/** The branch a node grows on, if any. */
export function branchOf(n: TreeNode): Branch | undefined {
  return n.branch ? treeOf(n.id).branches.find((b) => b.id === n.branch) : undefined;
}
