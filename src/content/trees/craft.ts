// The craft Daos' shape (design § Professions, The craft Dao trees; K2): five trees, each in the
// same three branches, Hand 手 (lift, Steady hands' reach), Line 炉 (whether a batch holds, yield,
// speed, fewer blow-ups) and Lore 方 (recipes, experimentation). Tier 1 opens on a root seal, the
// craft's starter recipe; each branch is two minors side by side, a notable that joins them and
// its own capstone, and a branch's capstone opens that branch's next tier, so a branch climbs on its own while a tier is
// still held at half of all its nodes. A craft file writes only what each node is (name, hanzi,
// effects, text, and the recipe a seal teaches); this helper fills in the kind, the requirements,
// the default cost by tier and the place on the canvas: each branch a wedge of the fan (Jan's call
// in K2's talk, take B), Hand left, Line up the middle, Lore right.
import type { CraftId } from '../crafts.ts';
import type { Effect } from '../stats.ts';
import { DAO_COSTS } from './dao.ts';
import {
  defineTree,
  TIER_DEPTH,
  type Branch,
  type PlannedCapstone,
  type Tree,
  type TreeNode,
} from './schema.ts';

export interface CraftNodeDef {
  id: string;
  name: string;
  hanzi: string;
  /** A seal teaches its recipe and may carry no effect. */
  effects?: readonly Effect[];
  text: string;
  /** The output's id of the recipe a seal teaches; a node without one is a perk. */
  recipe?: string;
  /** Insight to learn it; the tier's default for its place when absent. */
  cost?: number;
}

/** A branch's tier: two minors and a notable, then the capstone that opens its next tier. */
export interface CraftBranchDef {
  nodes: readonly [CraftNodeDef, CraftNodeDef, CraftNodeDef];
  capstone: CraftNodeDef;
}

export interface CraftTierDef {
  hand: CraftBranchDef;
  line: CraftBranchDef;
  lore: CraftBranchDef;
}

/** A capstone of a tier still to be written: only its name, hanzi and one line. */
export interface CraftLaterDef {
  name: string;
  hanzi: string;
  text: string;
}

export interface CraftDaoDef {
  id: CraftId;
  name: string;
  hanzi: string;
  what: string;
  /** The root seal at the hub: the craft's starter recipe. */
  starter: CraftNodeDef;
  /** Tiers 1 and 2, written in full. */
  tiers: readonly CraftTierDef[];
  /** The three capstones of each later tier, from tier 3 to tier 9. */
  later: readonly { hand: CraftLaterDef; line: CraftLaterDef; lore: CraftLaterDef }[];
}

/** Where a branch's nodes sit in its wedge: the minors a fork apart, the notable behind them. */
const FORK = 0.5;
const MINOR_Y = 3.3;
const NOTABLE_Y = 6.6;

export const CRAFT_BRANCHES = ['hand', 'line', 'lore'] as const;
export type CraftBranch = (typeof CRAFT_BRANCHES)[number];
export const CRAFT_BRANCH_INFO: Record<CraftBranch, { name: string; hanzi: string; x: number }> = {
  hand: { name: 'Hand', hanzi: '手', x: -3 },
  line: { name: 'Line', hanzi: '炉', x: 0 },
  lore: { name: 'Lore', hanzi: '方', x: 3 },
};

/** A branch's id at a tier: `alchemy1-hand`. */
export const craftBranchId = (craft: string, tier: number, b: CraftBranch) =>
  `${craft}${tier}-${b}`;

/** Which of the three a craft Dao's branch id is, or null for any other tree's. */
export function craftBranchOf(branchId: string | undefined): CraftBranch | null {
  const b = branchId?.split('-').at(-1);
  return (CRAFT_BRANCHES as readonly string[]).includes(b ?? '') ? (b as CraftBranch) : null;
}

export function defineCraft(d: CraftDaoDef): Tree {
  const branches: Branch[] = [];
  const nodes: Omit<TreeNode, 'home'>[] = [];
  const node = (
    n: CraftNodeDef,
    tier: number,
    kind: TreeNode['kind'],
    at: readonly [number, number],
    requires: readonly string[],
    fallback: number,
    branch?: string,
  ): Omit<TreeNode, 'home'> => ({
    id: n.id,
    name: n.name,
    hanzi: n.hanzi,
    tier,
    kind,
    ...(branch ? { branch } : {}),
    at,
    cost: n.cost ?? fallback,
    requires,
    effects: n.effects ?? [],
    text: n.text,
    ...(n.recipe ? { recipe: n.recipe } : {}),
  });

  nodes.push(node(d.starter, 1, 'starter', [0, 0], [], DAO_COSTS[1]!.starter));
  const below: Record<CraftBranch, string> = {
    hand: d.starter.id,
    line: d.starter.id,
    lore: d.starter.id,
  };
  d.tiers.forEach((t, i) => {
    const tier = i + 1;
    const costs = DAO_COSTS[tier] ?? DAO_COSTS[2]!;
    for (const b of CRAFT_BRANCHES) {
      const id = craftBranchId(d.id, tier, b);
      const { x } = CRAFT_BRANCH_INFO[b];
      branches.push({ id, name: CRAFT_BRANCH_INFO[b].name, tier, gate: true });
      // The two minors fork side by side from the branch's root; the notable joins them.
      const [a, c, notable] = t[b].nodes;
      const root = below[b];
      nodes.push(node(a, tier, 'minor', [x - FORK, MINOR_Y], [root], costs.minors[0]!, id));
      nodes.push(node(c, tier, 'minor', [x + FORK, MINOR_Y], [root], costs.minors[1]!, id));
      nodes.push(node(notable, tier, 'notable', [x, NOTABLE_Y], [a.id, c.id], costs.notable, id));
      const cap = t[b].capstone;
      nodes.push(node(cap, tier, 'capstone', [x, TIER_DEPTH], [notable.id], costs.capstone, id));
      below[b] = cap.id;
    }
  });

  const planned: PlannedCapstone[] = d.later.flatMap((t, i) =>
    CRAFT_BRANCHES.map((b) => ({
      tier: d.tiers.length + 1 + i,
      branch: craftBranchId(d.id, d.tiers.length + 1 + i, b),
      ...t[b],
    })),
  );

  return defineTree({
    id: d.id,
    name: d.name,
    hanzi: d.hanzi,
    // The soul gate (design § Cultivation, Learn with insight, use with one gate): every craft
    // answers to the soul, and core/trees.ts reads a craft Dao's seal by the craft reach.
    ladder: 'soul',
    what: d.what,
    craft: d.id,
    planned,
    branches,
    nodes,
  });
}
