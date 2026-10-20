// Breakthrough grades and their echoes (design § Cultivation, grades): a ladder's latest major
// breakthrough gives its grade in full, and every earlier one keeps echoing at a third on
// cultivation speed and the next major's odds, so a foundation laid well stays under everything
// built on it and a flawed one stays a scar. A grade's worth in a fight is a share of the step out
// of its realm (the realm gap's design, 2026-10-20), from the latest grade alone, since the
// fighting-up ledger is a cliff that a third of a grade tips (Jan's call after P2.4). One rule for
// the player and for every generated cultivator.
import { GRADE_SHARE } from '../content/realms.ts';
import {
  GRADE_ECHO,
  GRADE_NEXT_ODDS,
  GRADE_SPEED,
  GRADES,
  type GradeId,
} from '../content/cultivation.ts';

/** The share of the step out of its realm a grade is worth in a fight: −0.27 flawed to +0.8 heavenly. */
export function gradeShareOf(g: GradeId): number {
  return GRADES.find((x) => x.id === g)!.shares * GRADE_SHARE;
}

/** A grade-sized effect over a ladder's grades: the latest in full, each earlier at the echo. */
export function echoed(grades: readonly GradeId[], of: (g: GradeId) => number): number {
  const last = grades.length - 1;
  return grades.reduce((sum, g, i) => sum + of(g) * (i === last ? 1 : GRADE_ECHO), 0);
}

/** The multiplier on a ladder's cultivation speed from its grades: ×1 before the first. */
export function gradesSpeed(grades: readonly GradeId[]): number {
  return 1 + echoed(grades, (g) => GRADE_SPEED[g] - 1);
}

/** What a ladder's grades add to its next major breakthrough's odds. */
export function gradesOdds(grades: readonly GradeId[]): number {
  return echoed(grades, (g) => GRADE_NEXT_ODDS[g]);
}

/** The share of the step a ladder's grades add on every line of the sheet: the latest grade's, no echo. */
export function gradesShare(grades: readonly GradeId[]): number {
  const last = grades.at(-1);
  return last ? gradeShareOf(last) : 0;
}
