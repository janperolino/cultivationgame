// Every tree, and lookups by id. A new node is an entry in its tree's file, not new code.
// The combat Daos (P2.3) share the shape; the Ways (M3) join the same way.
import { BODY_TREE } from './body.ts';
import { DAO_TREES } from './daos/index.ts';
import { QI_TREE } from './qi.ts';
import type { Branch, Tree, TreeNode } from './schema.ts';
import { SOUL_TREE } from './soul.ts';

export * from './schema.ts';

/** The big three: Qi, Body and Soul, 25 to 30 nodes a tier. */
export const BIG_THREE: readonly Tree[] = [QI_TREE, BODY_TREE, SOUL_TREE];
/** The combat Daos, 12 to 18 nodes a tier. */
export const DAOS: readonly Tree[] = DAO_TREES;
export const TREES: readonly Tree[] = [...BIG_THREE, ...DAOS];

/**
 * The kinds of tree the Trees screen groups by: pick a category, then a tree in it. A category
 * with no trees yet shows as coming, with `opens` saying when: "in M3".
 */
export interface TreeCategory {
  id: string;
  name: string;
  hanzi: string;
  trees: readonly Tree[];
  /** When an empty category fills, for the screen. */
  opens?: string;
}

export const TREE_CATEGORIES: readonly TreeCategory[] = [
  { id: 'cultivation', name: 'Cultivation', hanzi: '修', trees: BIG_THREE },
  { id: 'daos', name: 'Daos', hanzi: '道', trees: DAOS },
  { id: 'ways', name: 'Ways', hanzi: '途', trees: [], opens: 'in M3' },
  { id: 'crafts', name: 'Crafts', hanzi: '艺', trees: [], opens: 'in M4' },
  {
    id: 'manuals',
    name: 'Manuals',
    hanzi: '典',
    trees: [],
    opens: 'once their homes are settled (on the Character screen until then)',
  },
];

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
