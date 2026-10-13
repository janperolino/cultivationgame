// Mastery (design § Cultivation, mastery): techniques, methods and recipes each run Glimpse,
// Comprehension, Mastery, Domain, Origin, raised by use. A technique's level adds to checks with
// it; a method's level scales its speed, and its levels come about six times slower, since every
// hour cultivating with it counts. Each level reached releases a burst of insight. Practice days
// and bursts are at tier 1 and three times that per tier above. Starting values for the sims.

export const MASTERY = [
  { id: 'glimpse', name: 'Glimpse', hanzi: '初窥' },
  { id: 'comprehension', name: 'Comprehension', hanzi: '领悟' },
  { id: 'mastery', name: 'Mastery', hanzi: '精通' },
  { id: 'domain', name: 'Domain', hanzi: '化境' },
  { id: 'origin', name: 'Origin', hanzi: '归元' },
] as const;
export type MasteryId = (typeof MASTERY)[number]['id'];

/** 4, Origin. */
export const MAX_MASTERY = MASTERY.length - 1;

/** What a ladder of mastery takes and gives, level by level from Glimpse. */
export interface MasteryTable {
  /** Practice days to reach each level at tier 1, counted from learning. */
  practice: readonly number[];
  /** Insight each level releases when reached, at tier 1. */
  burst: readonly number[];
}

/** Techniques: practice days come from practice hours (assumed in P1.3). */
export const TECHNIQUE_MASTERY: MasteryTable = {
  practice: [0, 4, 30, 150, 600],
  burst: [0, 5, 20, 60, 150],
};

/** Methods: every hour cultivated with one is a twelfth of a practice day. */
export const METHOD_MASTERY: MasteryTable & { speed: readonly number[] } = {
  practice: [0, 30, 180, 720, 2400],
  burst: [0, 10, 40, 120, 300],
  /** The method's speed at each level. */
  speed: [0.6, 0.8, 1.0, 1.1, 1.2],
};

/** Practice days and bursts at tier t are this to the power t − 1 times tier 1's. */
export const MASTERY_TIER_SCALE = 3;

/** Each technique mastery level past Glimpse multiplies Accuracy with it by this: ×1.75 at Origin. */
export const MASTERY_ACCURACY = 1.15;

/**
 * Kinship (design § Cultivation, lines, chapters and kinship): two techniques of different lines
 * that share a Dao and a form speed each other's practice by this while a kin sits at
 * Comprehension or above.
 */
export const KINSHIP_BONUS = 0.25;
export const KINSHIP_LEVEL = 1;

/** A technique's next chapter needs the one before at this level (Comprehension). */
export const CHAPTER_NEEDS_LEVEL = 1;
