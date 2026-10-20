// Every tree, and lookups by id. A new node is an entry in its tree's file, not new code.
// The combat Daos (P2.3) and the craft Daos (K2) share the shape; the Ways (M3) join the same way.
import { BODY_TREE } from './body.ts';
import { CRAFT_TREES } from './crafts/index.ts';
import { DAO_TREES } from './daos/index.ts';
import { QI_TREE } from './qi.ts';
import type { Branch, Tree, TreeNode } from './schema.ts';
import { SOUL_TREE } from './soul.ts';

export * from './schema.ts';

/** The big three: Qi, Body and Soul, 25 to 30 nodes a tier. */
export const BIG_THREE: readonly Tree[] = [QI_TREE, BODY_TREE, SOUL_TREE];
/** The combat Daos, 12 to 18 nodes a tier. */
export const DAOS: readonly Tree[] = DAO_TREES;
/** The craft Daos, a root seal and three branches of four a tier, Hand, Line and Lore (K2). */
export const CRAFT_DAOS: readonly Tree[] = CRAFT_TREES;
export const TREES: readonly Tree[] = [...BIG_THREE, ...DAOS, ...CRAFT_DAOS];

/**
 * The kinds of tree the Trees screen groups by: pick a category, then a tree in it. A category
 * shows once it holds a tree you've touched (core/seen.ts), so Ways and Crafts stay out of sight
 * until their milestones fill them.
 */
export interface TreeCategory {
  id: string;
  name: string;
  hanzi: string;
  trees: readonly Tree[];
}

export const TREE_CATEGORIES: readonly TreeCategory[] = [
  { id: 'cultivation', name: 'Cultivation', hanzi: '修', trees: BIG_THREE },
  { id: 'daos', name: 'Daos', hanzi: '道', trees: DAOS },
  { id: 'ways', name: 'Ways', hanzi: '途', trees: [] },
  { id: 'crafts', name: 'Crafts', hanzi: '艺', trees: CRAFT_DAOS },
  // The Manuals category holds no tree of its own: the manuals with no host and a shelf of every
  // manual held (design § Cultivation, Where manuals live). It shows with a first manual.
  { id: 'manuals', name: 'Manuals', hanzi: '典', trees: [] },
];

const trees = new Map(TREES.map((t) => [t.id, t]));
const nodes = new Map<string, { node: TreeNode; tree: Tree }>();
for (const tree of TREES) for (const node of tree.nodes) nodes.set(node.id, { node, tree });

export function tree(id: string): Tree {
  const t = trees.get(id);
  if (!t) throw new RangeError(`Unknown tree ${id}`);
  return t;
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
