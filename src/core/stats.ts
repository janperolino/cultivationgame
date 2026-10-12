// A cultivator's stat totals: every effect from the tree nodes they can use (not sealed), the
// properties of each ladder's active method, and the growth the methods that climbed each stage
// left (core/growth.ts). Talents, gear and pills join here later. The rules read these totals; see
// content/stats.ts for units.
import { APTITUDE_BASE, APTITUDE_STEP, LADDERS } from '../content/cultivation.ts';
import { STAT_IDS, statInfo, type Effect, type StatId } from '../content/stats.ts';
import { ladderGrowth } from './growth.ts';
import { ladderMethod } from './methods.ts';
import type { Cultivator } from './state.ts';
import { activeNodes } from './trees.ts';

export type Stats = Record<StatId, number>;

export function emptyStats(): Stats {
  return Object.fromEntries(STAT_IDS.map((id) => [id, 0])) as Stats;
}

/** Folds one effect into the totals: most add, and a `times` stat multiplies (0.1 is ×1.1). */
export function addEffect(out: Stats, e: Effect): void {
  out[e.stat] =
    statInfo(e.stat).unit === 'times'
      ? (1 + out[e.stat]) * (1 + e.value) - 1
      : out[e.stat] + e.value;
}

// The day step reads stats many times a tick; they change only when the nodes, a ladder's realm,
// an active method or the growth records do, so each nodes list keeps its last result.
interface Cached {
  key: string;
  growth: readonly unknown[];
  stats: Readonly<Stats>;
}
const cache = new WeakMap<readonly string[], Cached>();

/** Every stat's total from nodes, active methods' properties and growth. */
export function stats(c: Cultivator): Readonly<Stats> {
  const key = LADDERS.map((l) => `${c[l].realm}:${c.activeMethods[l] ?? ''}`).join('|');
  const growth = LADDERS.map((l) => c[l].growth);
  const hit = cache.get(c.nodes);
  if (hit?.key === key && hit.growth.every((g, i) => g === growth[i])) return hit.stats;
  const out = emptyStats();
  for (const node of activeNodes(c)) {
    for (const e of node.effects) addEffect(out, e);
  }
  for (const l of LADDERS) {
    for (const p of ladderMethod(c, l)?.properties ?? []) {
      for (const e of p.effects) addEffect(out, e);
    }
    for (const [stat, v] of Object.entries(ladderGrowth(c[l]))) out[stat as StatId] += v;
  }
  cache.set(c.nodes, { key, growth, stats: out });
  return out;
}

/** Aptitude, with what nodes and methods add. */
export function aptitude(c: Cultivator): number {
  return c.attributes.aptitude + stats(c).aptitude;
}

/** Aptitude's multiplier on every seclusion gain: +5% a point above 10. */
export function aptitudeMultiplier(c: Cultivator): number {
  return Math.max(0, 1 + APTITUDE_STEP * (aptitude(c) - APTITUDE_BASE));
}
