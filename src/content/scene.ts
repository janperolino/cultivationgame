// The breakthrough scene (design § Cultivation, Breakthroughs): an attended attempt plays for ten
// seconds on the figure. A spark races the circulation, faster every lap, and passes the gates on
// the loop; a tap timed on a gate catches it. The odds steps and their cap sit beside
// ODDS_PER_TENTH in content/cultivation.ts. Starting values, to tune by feel.

/** The whole scene, from the first lap to the roll. */
export const SCENE_SECONDS = 10;
/** The racing spark's way round the loop, in laps: SCENE_SPEED t + SCENE_RACE t². */
export const SCENE_SPEED = 0.1;
export const SCENE_RACE = 0.012;
/** Gates on the loop, evenly spaced, and how many the spark passes in a scene (two laps). */
export const SCENE_GATES_PER_LAP = 3;
export const SCENE_GATES = 6;
/** A tap this close to a gate's moment, either side, catches it. */
export const SCENE_WINDOW_S = 0.25;
/** A tap up to this far ahead of a gate is early: that gate is spent, so tapping fast never pays. */
export const SCENE_EARLY_S = 0.6;
/** After the roll, the outcome stays on the figure this long. */
export const SCENE_OUTCOME_S = 3;
