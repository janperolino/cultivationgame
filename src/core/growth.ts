// Growth (design § Cultivation, methods): every stage a ladder climbs records the growth of the
// method active at the breakthrough that reached it, and it stays. Over a full realm a method
// leaves its rarity on the shared curve less one, scaled by fit, split by its growth profile; a
// stage climbed with no method takes a white method's, which is nothing. Across realms the
// stages count as a weighted average with the realm curve as the weights, so the current realm
// dominates. Growth is set, never rolled. core/stats.ts folds it in beside the nodes.
import type { LadderId } from '../content/cultivation.ts';
import { GROWTH_STATS, type Method } from '../content/methods.ts';
import { rarityMultiplier, type RarityId } from '../content/rarity.ts';
import {
  climbsIn,
  REALMS,
  realmIndex,
  realmScale,
  tierStep,
  type RealmId,
} from '../content/realms.ts';
import type { StatId } from '../content/stats.ts';
import type { Ladder, StageGrowth } from './state.ts';

export type Growth = Partial<Record<StatId, number>>;

/**
 * What a method leaves over a full realm, as a fraction: the rarity band × fit − 1. A fed upkeep
 * method leaves the band it climbs as (core/methods.ts, `runningRarity`).
 */
export function realmGrowthTotal(m: Method | null, fit: number, as?: RarityId): number {
  return m ? rarityMultiplier(as ?? m.rarity, tierStep(m.tier)) * fit - 1 : 0;
}

/** The record one stage leaves, climbed with this method (or none) at this fit. */
export function stageGrowth(
  m: Method | null,
  fit: number,
  which: LadderId,
  realmId: RealmId,
  stage: number,
  as?: RarityId,
): StageGrowth {
  const share = realmGrowthTotal(m, fit, as) / climbsIn(realmId);
  const stats = GROWTH_STATS[which];
  const growth: Record<string, number> = {};
  for (const stat of stats) growth[stat] = share * (m ? (m.growth[stat] ?? 0) : 1 / stats.length);
  return {
    realm: realmId,
    stage,
    method: m?.id ?? null,
    rarity: as ?? m?.rarity ?? 'white',
    growth,
  };
}

/** Every stage a ladder has climbed, oldest first: layers 2–9, then each realm's stages. */
export function climbedStages(l: Ladder): { realm: RealmId; stage: number }[] {
  const out: { realm: RealmId; stage: number }[] = [];
  const top = realmIndex(l.realm);
  for (let i = 0; i <= top; i++) {
    const r = REALMS[i]!;
    const first = r.id === 'qi-condensation' ? 2 : 1;
    const last = i < top ? r.stages : l.stage;
    for (let stage = first; stage <= last; stage++) out.push({ realm: r.id, stage });
  }
  return out;
}

export interface RealmGrowth {
  realm: RealmId;
  /** The stages climbed in this realm so far, out of how many it has. */
  climbed: number;
  of: number;
  /** The realm's growth so far: its stages added up. */
  growth: Growth;
  /** The methods that climbed its stages, by id, with null for the world alone, in order. */
  methods: (string | null)[];
}

/** A ladder's growth realm by realm, from Qi Condensation to the one it stands in. */
export function realmGrowth(l: Ladder): RealmGrowth[] {
  return REALMS.slice(0, realmIndex(l.realm) + 1).map((r) => {
    const stages = l.growth.filter((g) => g.realm === r.id);
    const growth: Growth = {};
    for (const s of stages) {
      for (const [stat, v] of Object.entries(s.growth)) {
        growth[stat as StatId] = (growth[stat as StatId] ?? 0) + v;
      }
    }
    const methods = [...new Set(stages.map((s) => s.method))];
    return { realm: r.id, climbed: stages.length, of: climbsIn(r.id), growth, methods };
  });
}

/**
 * A ladder's growth as one total per stat: each realm's growth weighted by the realm curve, so
 * the current realm dominates, an earlier foundation still shows a little, and the total never
 * passes the best realm's.
 */
export function ladderGrowth(l: Ladder): Growth {
  const realms = realmGrowth(l);
  const total = realms.reduce((sum, r) => sum + realmScale(r.realm), 0);
  const out: Growth = {};
  for (const r of realms) {
    for (const [stat, v] of Object.entries(r.growth)) {
      out[stat as StatId] = (out[stat as StatId] ?? 0) + (v * realmScale(r.realm)) / total;
    }
  }
  return out;
}
