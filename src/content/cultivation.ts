// The seclusion and breakthrough constants (design § Cultivation and § Economy). Starting values
// that sim/pacing.ts tunes; rules that read them live in src/core/cultivation.ts.

/** The five things a seclusion day can go to. */
export const SLOTS = ['qi', 'body', 'soul', 'study', 'practice'] as const;
export type SlotId = (typeof SLOTS)[number];

/** The default seclusion plan, in percent, shared among whichever slots are open. */
export const DEFAULT_SHARES: Record<SlotId, number> = {
  qi: 60,
  body: 15,
  soul: 10,
  study: 10,
  practice: 5,
};

/** Qi units a full day of qi seclusion gives at Qi Condensation, before every multiplier. */
export const QI_PER_DAY = 1;
/** Tempering and nourishment per full day, in the same units; body and soul ignore the root. */
export const BODY_PER_DAY = 1.6;
export const SOUL_PER_DAY = 1.6;
/** Insight per full day of study, times the qi realm's insight rate. */
export const INSIGHT_PER_STUDY_DAY = 1;
/** Insight every seclusion day leaves behind, whatever it went to. */
export const INSIGHT_TRICKLE = 0.05;

/** Each point of Aptitude above 10 adds 5% to every seclusion gain (design § Combat). */
export const APTITUDE_BASE = 10;
export const APTITUDE_STEP = 0.05;

/** Qi Condensation layers up to this one ignore root speed and method fit: the tutorial. */
export const TUTORIAL_LAYERS = 3;

/**
 * Stones as fuel (design § Economy): each low-grade stone burned on a day of qi seclusion adds a
 * fifth of the qi a Qi Condensation day gives, up to five a day, both scaled by the realm curve.
 */
export const STONE_QI = 0.2;
export const STONES_PER_QI_DAY = 5;

/** The bar keeps filling past full up to this, and each extra 10% raises the odds. */
export const BAR_CAP = 1.5;
export const ODDS_PER_TENTH = 0.07;
export const MAX_ODDS = 0.98;

/** A failed minor breakthrough: a fifth of the bar, and a few days of unsettled qi. */
export const MINOR_FAIL_LOSS = 0.2;
export const UNSETTLED_DAYS = 5;
/** From Foundation up, a failed minor breakthrough also leaves a light injury. */
export const MINOR_INJURY_DAYS = 180;
/** A failed major breakthrough halves the bar and injures for a few in-game years. */
export const MAJOR_FAIL_KEEP = 0.5;
export const MAJOR_INJURY_DAYS = 3 * 360;
/** An injured ladder cultivates at this fraction of its pace. */
export const INJURY_SPEED = 0.5;

/** The last chance at the lifespan edge: the odds shrink with the bar and then by this. */
export const LAST_CHANCE_ODDS = 0.6;

/**
 * Auto settings for minor breakthroughs: attempt once the odds reach this, or the bar is at the
 * cap. Off never attempts on its own. Safe is the default, and what offline time uses.
 */
export const AUTO_SETTINGS = {
  safe: { name: 'Safe', minOdds: 0.9 },
  balanced: { name: 'Balanced', minOdds: 0.75 },
  bold: { name: 'Bold', minOdds: 0 },
  off: { name: 'Only when I say', minOdds: Infinity },
} as const;
export type AutoSetting = keyof typeof AUTO_SETTINGS;
export const AUTO_IDS = Object.keys(AUTO_SETTINGS) as [AutoSetting, ...AutoSetting[]];

/** Breakthrough grades, worth −1 to +3 stages in a fight (design § Cultivation). */
export const GRADES = [
  { id: 'flawed', name: 'Flawed', stages: -1 },
  { id: 'ordinary', name: 'Ordinary', stages: 0 },
  { id: 'superior', name: 'Superior', stages: 1 },
  { id: 'perfect', name: 'Perfect', stages: 2 },
  { id: 'heavenly', name: 'Heavenly', stages: 3 },
] as const;
export type GradeId = (typeof GRADES)[number]['id'];
export const GRADE_IDS = GRADES.map((g) => g.id) as unknown as readonly [GradeId, ...GradeId[]];
/**
 * The margin score runs 0 to 4: a quarter each for qi past full, insight past the threshold, and
 * each of the other two ladders at or above the new realm. These are the scores each grade needs.
 */
export const GRADE_SCORES: Record<GradeId, number> = {
  flawed: 0,
  ordinary: 0.75,
  superior: 1.75,
  perfect: 2.75,
  heavenly: 3.5,
};
/** Insight earned at this multiple of the threshold counts as the full insight margin. */
export const INSIGHT_MARGIN_FULL = 2;
/** Each point of margin score adds this to a major breakthrough's odds. */
export const MAJOR_ODDS_PER_MARGIN = 0.08;

/**
 * Seclusion slots open as you reach them, each with one line of hint (design § Character
 * creation, the first hour). Practice opens with techniques in P1.3.
 */
export const SLOT_UNLOCKS: readonly {
  flag: string;
  slot: SlotId;
  /** Opens once qi reaches this Qi Condensation layer with at least this much of its bar. */
  layer: number;
  bar: number;
  text: string;
}[] = [
  { flag: 'seclusion-qi', slot: 'qi', layer: 1, bar: 0, text: '' },
  {
    flag: 'seclusion-body',
    slot: 'body',
    layer: 2,
    bar: 0,
    text: 'Qi settles into flesh and bone: body tempering opens beside qi.',
  },
  {
    flag: 'seclusion-study',
    slot: 'study',
    layer: 2,
    bar: 0,
    text: 'The first insight trickles in. Study days turn seclusion into understanding.',
  },
  {
    flag: 'seclusion-soul',
    slot: 'soul',
    layer: 2,
    bar: 0.5,
    text: 'In the stillness you sense your own mind: soul nourishment opens.',
  },
];
