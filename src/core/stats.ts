// A cultivator's stat totals: every effect from the tree nodes they can use, added up. Talents,
// gear and pills join here later. The rules read these totals; see content/stats.ts for units.
import { STAT_IDS, type StatId } from '../content/stats.ts';
import type { Cultivator } from './state.ts';
import { activeNodes } from './trees.ts';

export type Stats = Record<StatId, number>;

export function emptyStats(): Stats {
  return Object.fromEntries(STAT_IDS.map((id) => [id, 0])) as Stats;
}

// The day step reads stats many times a tick; they change only when the nodes or a ladder's
// realm do, so each nodes list keeps its last result, keyed by the realms that unseal nodes.
const cache = new WeakMap<readonly string[], { key: string; stats: Readonly<Stats> }>();

/** Every stat's total from the nodes the cultivator has learned and can use (not sealed). */
export function stats(c: Cultivator): Readonly<Stats> {
  const key = `${c.qi.realm}|${c.body.realm}|${c.soul.realm}`;
  const hit = cache.get(c.nodes);
  if (hit?.key === key) return hit.stats;
  const out = emptyStats();
  for (const node of activeNodes(c)) {
    for (const e of node.effects) out[e.stat] += e.value;
  }
  cache.set(c.nodes, { key, stats: out });
  return out;
}
