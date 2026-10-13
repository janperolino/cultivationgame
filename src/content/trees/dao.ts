// The combat Daos' shape (design § The combat Daos): narrower than the big three. Tier 1 is a
// starter, three gating branches of two minors and a notable, one side path of two or three, and a
// capstone; tier 2 adds a node to each gating branch and a second side path, two nodes each. A Dao
// file writes only what each node is (name, hanzi, effects, text); this helper fills in the kind,
// the requirements, the default cost by tier and the place on the canvas, so the nine Daos share one
// silhouette, mirrored by `lean`: the gating branches bulge round a straight middle column, and the
// side paths fly out from the starter.
import type { CombatDaoId } from '../daos.ts';
import type { Effect } from '../stats.ts';
import { defineTree, TIER_DEPTH, type Branch, type Tree, type TreeNode } from './schema.ts';

export interface DaoNodeDef {
  id: string;
  name: string;
  hanzi: string;
  effects: readonly Effect[];
  text: string;
  /** Insight to learn it; the tier's default for its place when absent. */
  cost?: number;
}

/** A branch: its nodes in order, every one a minor but the last, its notable. */
export interface DaoBranchDef {
  id: string;
  name: string;
  nodes: readonly DaoNodeDef[];
}

export interface DaoTierDef {
  starter: DaoNodeDef;
  /** The three branches that open the capstone. */
  gates: readonly [DaoBranchDef, DaoBranchDef, DaoBranchDef];
  /** Side paths: one at tier 1, two at tier 2. */
  sides: readonly DaoBranchDef[];
  capstone: DaoNodeDef;
}

export interface DaoDef {
  id: CombatDaoId;
  name: string;
  hanzi: string;
  what: string;
  /** Which side tier 1's side path flies out to. */
  lean: 'left' | 'right';
  tiers: readonly DaoTierDef[];
}

/**
 * Default insight costs by tier (design § Cultivation, every tree): the starter, each minor by its
 * place on the branch, a notable, the capstone. A Dao tier is cheaper than a big-three tier only
 * because it holds fewer nodes.
 */
export const DAO_COSTS: Record<
  number,
  { starter: number; minors: readonly number[]; notable: number; capstone: number }
> = {
  1: { starter: 10, minors: [25, 40], notable: 130, capstone: 300 },
  2: { starter: 150, minors: [180, 230, 280], notable: 620, capstone: 1500 },
};

/** How far the outer gating branches bulge from the middle column, and where side paths sit. */
const GATE_X = 3.3;
const SIDE_X = 4.7;
const SIDE_STEP_X = 0.6;
const SIDE_TOP = 1.3;
const SIDE_STEP_Y = 2.2;

const round = (x: number) => Math.round(x * 100) / 100;

export function defineDao(d: DaoDef): Tree {
  const branches: Branch[] = [];
  const nodes: Omit<TreeNode, 'home'>[] = [];
  let below: string | null = null;

  d.tiers.forEach((t, i) => {
    const tier = i + 1;
    const costs = DAO_COSTS[tier] ?? DAO_COSTS[2]!;
    const node = (
      n: DaoNodeDef,
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
      at: [round(at[0]), round(at[1])],
      cost: n.cost ?? fallback,
      requires,
      effects: n.effects,
      text: n.text,
    });

    nodes.push(node(t.starter, 'starter', [0, 0], below ? [below] : [], costs.starter));

    // The gating branches: left, middle, right, each bulging out and closing on the capstone.
    const ends: string[] = [];
    t.gates.forEach((b, g) => {
      branches.push({ id: b.id, name: b.name, tier, gate: true });
      const x = (g - 1) * GATE_X;
      let prev = t.starter.id;
      b.nodes.forEach((n, k) => {
        const y = (TIER_DEPTH * (k + 1)) / (b.nodes.length + 1);
        const notable = k === b.nodes.length - 1;
        const at = [x * Math.sin((Math.PI * y) / TIER_DEPTH), y] as const;
        const fallback = notable ? costs.notable : (costs.minors[k] ?? costs.minors.at(-1)!);
        nodes.push(node(n, notable ? 'notable' : 'minor', at, [prev], fallback, b.id));
        prev = n.id;
      });
      ends.push(prev);
    });

    // Side paths fly out from the starter: tier 1's to the lean, tier 2's one to each side.
    const lean = d.lean === 'left' ? -1 : 1;
    t.sides.forEach((b, s) => {
      branches.push({ id: b.id, name: b.name, tier, gate: false });
      const sign = t.sides.length === 1 ? lean : s === 0 ? lean : -lean;
      let prev = t.starter.id;
      b.nodes.forEach((n, k) => {
        const notable = k === b.nodes.length - 1;
        const at = [
          sign * (SIDE_X + SIDE_STEP_X * k),
          SIDE_TOP + SIDE_STEP_Y * k + 0.3 * (tier - 1),
        ] as const;
        const fallback = notable ? costs.notable - 10 : (costs.minors[k] ?? costs.minors.at(-1)!);
        nodes.push(node(n, notable ? 'notable' : 'minor', at, [prev], fallback, b.id));
        prev = n.id;
      });
    });

    nodes.push(node(t.capstone, 'capstone', [0, TIER_DEPTH], ends, costs.capstone));
    below = t.capstone.id;
  });

  return defineTree({
    id: d.id,
    name: d.name,
    hanzi: d.hanzi,
    ladder: 'qi',
    what: d.what,
    dao: d.id,
    branches,
    nodes,
  });
}
