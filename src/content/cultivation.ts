// The seclusion and breakthrough constants (design § Cultivation and § Economy). Starting values
// that sim/pacing.ts tunes; rules that read them live in src/core/cultivation.ts.

/** The big three: each climbs its own ladder of realms and stages. */
export const LADDERS = ['qi', 'body', 'soul'] as const;
export type LadderId = (typeof LADDERS)[number];

/**
 * Qi units a full day of qi seclusion, twelve qi hours, gives at Qi Condensation before every
 * multiplier. Each hour on the wheel is a twelfth of a day (content/hours.ts).
 */
export const QI_PER_DAY = 1;
/** Tempering and nourishment per full day, in the same units; body and soul ignore the root. */
export const BODY_PER_DAY = 1.6;
export const SOUL_PER_DAY = 1.6;
/** Insight per full day of study, times the qi realm's insight rate. */
export const INSIGHT_PER_STUDY_DAY = 1;
/** Insight every waking hour leaves behind, whatever it went to, per full day of them. */
export const INSIGHT_TRICKLE = 0.05;
/**
 * Attended hours leave a second trickle away hours never do (design § Cultivation, insight), a
 * rate like the first, so a weekend away costs a node or two, never a tier.
 */
export const INSIGHT_ATTENDED = 0.05;

/** Each point of Aptitude above 10 adds 5% to every seclusion gain (design § Combat). */
export const APTITUDE_BASE = 10;
export const APTITUDE_STEP = 0.05;

/**
 * Qi Condensation layers up to this one are the tutorial: they ignore root speed, method fit and
 * the element hours. Dawn, discipline, Aptitude and nodes still count.
 */
export const TUTORIAL_LAYERS = 3;

/**
 * Stones as fuel (design § Economy): each low-grade stone burned on a day of qi seclusion adds a
 * fifth of the qi a Qi Condensation day gives, up to five a day, both scaled by the realm curve.
 * A day here is a full day of qi hours; with fewer qi hours on the wheel, the cap shrinks in step.
 */
export const STONE_QI = 0.2;
export const STONES_PER_QI_DAY = 5;

/** The bar keeps filling past full up to this, and each extra 10% raises the odds. */
export const BAR_CAP = 1.5;
export const ODDS_PER_TENTH = 0.07;
export const MAX_ODDS = 0.98;
/**
 * An attended attempt's scene (content/scene.ts): each gate caught on time adds a step to the
 * odds, like overfill, and all of them together never more than the cap; a miss costs nothing.
 */
export const SCENE_ODDS_STEP = 0.02;
export const SCENE_ODDS_CAP = 0.1;

/** A failed minor breakthrough: a fifth of the bar, and a few days of unsettled qi. */
export const MINOR_FAIL_LOSS = 0.2;
export const UNSETTLED_DAYS = 5;
/** From Foundation up, a failed minor breakthrough also leaves a light injury. */
export const MINOR_INJURY_DAYS = 180;
/**
 * The gate item a major body or soul breakthrough uses up. Which items they are is settled with
 * items and gear (D2); until then the world supplies none, so in M1 body and soul stop at layer 9
 * (design § Character creation).
 */
export function ladderGateItem(which: 'body' | 'soul', realm: string): string {
  return `${which}-gate-${realm}`;
}

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
