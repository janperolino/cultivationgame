// Checks (design § Combat): d20 plus bonuses against a target number. Beat it by 10, or roll a
// critical face, for a critical; miss by 1–3 for a half-damage graze; a natural 1 is qi deviation,
// which backfires when the action used qi and is a plain miss when it didn't. Crits start on a
// natural 20, and every 4 points of Fortune above 10 adds a face.
import {
  CRIT_MARGIN,
  DIE,
  FORTUNE_BASE,
  FORTUNE_PER_FACE,
  GRAZE_MARGIN,
} from '../../content/combat.ts';
import type { Rng } from '../rng.ts';

export type CheckResult = 'critical' | 'hit' | 'graze' | 'miss' | 'backfire';

/** How many faces of the d20 crit: 1 at Fortune 10, 2 at 14, 3 at 18. */
export function critFaces(fortune: number): number {
  return 1 + Math.floor(Math.max(0, fortune - FORTUNE_BASE) / FORTUNE_PER_FACE);
}

/** One d20 from the stream. */
export function rollD20(rng: Rng): number {
  return rng.int(1, DIE);
}

/** Judges a rolled check: the natural roll, the total with bonuses, the target number. */
export function judge(
  roll: number,
  total: number,
  tn: number,
  opts: { fortune?: number; qi?: boolean } = {},
): CheckResult {
  if (roll === 1) return opts.qi ? 'backfire' : 'miss';
  if (roll > DIE - critFaces(opts.fortune ?? FORTUNE_BASE)) return 'critical';
  if (total - tn >= CRIT_MARGIN) return 'critical';
  if (total >= tn) return 'hit';
  if (tn - total <= GRAZE_MARGIN) return 'graze';
  return 'miss';
}
