// The breakthrough scene (design § Cultivation, Breakthroughs): an attended attempt plays on the
// figure, a wind-up of four seconds where the circulation slows, the gates light round the loop
// one by one and the glass darkens, then ten seconds of the race. A spark races the circulation,
// faster every lap, and passes the gates on the loop; a tap timed on a gate catches it. The odds steps and their cap sit beside
// ODDS_PER_TENTH in content/cultivation.ts. Starting values, to tune by feel.

/** The wind-up before the race (P2.4), so the first gate comes around the fifth or sixth second. */
export const SCENE_WINDUP_S = 4;
/** The race, from the spark's first lap to the roll. */
export const SCENE_RACE_S = 10;
/** The whole scene, wind-up and race. */
export const SCENE_SECONDS = SCENE_WINDUP_S + SCENE_RACE_S;
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
