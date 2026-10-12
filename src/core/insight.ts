// Insight from everything (design § Cultivation, insight): beside cultivation's trickle and
// study's stream (core/cultivation.ts), each mastery level a technique or method reaches releases
// a burst, and contemplation sources give lumps or trickles until they run dry. Aptitude and
// talents multiply all of it. Insight is one currency whatever it came from.
import { contemplationSource } from '../content/contemplation.ts';
import type { MasteryTable } from '../content/mastery.ts';
import { burstAt } from './mastery.ts';
import type { Cultivator } from './state.ts';
import { aptitudeMultiplier, stats } from './stats.ts';

/** What Aptitude and talents multiply every insight gain by. */
export function insightMultiplier(c: Cultivator): number {
  return aptitudeMultiplier(c) * (1 + stats(c).insightGain);
}

/** Adds insight, spendable and ever earned alike. */
export function gainInsight(c: Cultivator, amount: number): Cultivator {
  if (amount <= 0) return c;
  return {
    ...c,
    insight: { current: c.insight.current + amount, earned: c.insight.earned + amount },
  };
}

/** The burst a mastery level releases for this cultivator: the table's, by tier, times Aptitude. */
export function masteryBurst(
  c: Cultivator,
  table: MasteryTable,
  tier: number,
  level: number,
): number {
  return burstAt(table, tier, level) * insightMultiplier(c);
}

/** Insight a source still holds before it runs dry, or Infinity when it never does. */
export function contemplationLeft(c: Cultivator, id: string): number {
  const s = contemplationSource(id);
  return s.supply === null ? Infinity : Math.max(0, s.supply - (c.contemplation[id] ?? 0));
}

export interface Contemplation {
  cultivator: Cultivator;
  /** Insight gained, after Aptitude. */
  gained: number;
  /** True once the source has nothing left to give. */
  dry: boolean;
}

/**
 * Contemplates a source: a lump all at once, or a trickle for some days, up to what it still
 * holds. Story cards call this (P1.7).
 */
export function contemplate(c: Cultivator, id: string, days = 1): Contemplation {
  const s = contemplationSource(id);
  const left = contemplationLeft(c, id);
  const raw = Math.min(left, s.kind === 'lump' ? s.yield : s.yield * Math.max(0, days));
  if (raw <= 0) return { cultivator: c, gained: 0, dry: left <= 0 };
  const gained = raw * insightMultiplier(c);
  const next = gainInsight(
    { ...c, contemplation: { ...c.contemplation, [id]: (c.contemplation[id] ?? 0) + raw } },
    gained,
  );
  return { cultivator: next, gained, dry: contemplationLeft(next, id) <= 0 };
}
