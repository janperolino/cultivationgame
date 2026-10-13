// Checks (design § Combat): no dice. A hit lands with chance Accuracy ÷ (Accuracy + Evasion), a
// landed hit crits with 5% plus 1% per point of Fortune above 10, and a qi technique first risks
// qi deviation, a backfire, at a quarter of the toxicity meter's share. Every roll comes from the
// stream passed in.
import {
  BACKFIRE_PER_TOXICITY,
  CRIT_BASE,
  CRIT_PER_FORTUNE,
  FORTUNE_BASE,
} from '../../content/combat.ts';
import { TOXICITY_MAX } from '../../content/cultivation.ts';
import type { Rng } from '../rng.ts';
import { hitChance } from './sheet.ts';

export type CheckResult = 'critical' | 'hit' | 'miss' | 'backfire';

/** The chance a landed hit is a critical: 5% at Fortune 10, 9% at 14. */
export function critChance(fortune: number): number {
  return CRIT_BASE + CRIT_PER_FORTUNE * Math.max(0, fortune - FORTUNE_BASE);
}

/** The chance a qi technique deviates: 0 on a clean meter, 25% on a full one. */
export function backfireChance(toxicity: number): number {
  return BACKFIRE_PER_TOXICITY * Math.min(1, Math.max(0, toxicity / TOXICITY_MAX));
}

export interface Judged {
  result: CheckResult;
  /** The chance the hit had of landing. */
  chance: number;
}

/**
 * Rolls one check: the backfire first when the action used qi and the meter isn't clean, then
 * the hit, then the crit on a landed hit.
 */
export function judge(
  rng: Rng,
  accuracy: number,
  evasion: number,
  opts: { fortune?: number; qi?: boolean; toxicity?: number } = {},
): Judged {
  const chance = hitChance(accuracy, evasion);
  const backfire = opts.qi ? backfireChance(opts.toxicity ?? 0) : 0;
  if (backfire > 0 && rng.chance(backfire)) return { result: 'backfire', chance };
  if (!rng.chance(chance)) return { result: 'miss', chance };
  if (rng.chance(critChance(opts.fortune ?? FORTUNE_BASE))) return { result: 'critical', chance };
  return { result: 'hit', chance };
}
