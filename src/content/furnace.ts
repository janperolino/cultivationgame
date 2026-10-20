// Fire control 火候 at the furnace (design § Professions, Crafts, thin, the hands-on version; K3,
// Jan's take F in its talk, `docs/mockups/furnace-dross-side-study.html`): burning out the dross
// 去杂. The furnace stands side on; each time its lid lifts on its breath it throws a puff of specks
// up out of its mouth, and a herb going in throws a bigger one. Flick the dark dross to ash in the
// air; let the gold essence fall back into the pill. Every flick heats the furnace, which cools on
// its own; at the top it roars. core/furnace.ts reads these. Times are real seconds and places are
// the furnace's own frame, 760 by 560, the mouth at its middle. Starting values, measured with a
// bot (core/furnace.test.ts): attentive play holds about 0.85, greedy and idle play near 0.

/** The furnace's frame: the canvas it plays on, and its mouth, where specks rise and fall. */
export const FURNACE_BOX = { w: 760, h: 560 } as const;
export const MOUTH: readonly [number, number] = [380, 288];

/** The furnace's breath: the lid lifts on the inhale, its first part, and a puff goes up. */
export const FURNACE_BREATH_S = 3.2;
export const FURNACE_INHALE = 0.35;
/** Specks a breath throws up, at least and at most. */
export const PUFF: readonly [min: number, max: number] = [1, 3];
/** A herb going in throws a bigger puff, one every this many seconds, in the recipe's order. */
export const HERB_PUFF = 5;
export const HERB_EVERY_S = 9;
/** The first herb goes in this long after you sit down; its name shows this long before. */
export const FIRST_HERB_S = 3;
export const HERB_WARN_S = 1.2;
/** Specks in one puff leave this far apart. */
export const PUFF_GAP_S = 0.12;

/** Seconds a speck is in the air, up and back into the mouth. */
export const FLIGHT_S = 2.4;
/** How high a speck rises, how far it drifts sideways, how far off the mouth's middle it starts. */
export const RISE: readonly [min: number, max: number] = [150, 230];
export const DRIFT = 126;
export const MOUTH_SPREAD = 35;
/** The share of specks that are essence; the rest are dross. */
export const ESSENCE = 0.35;

/** A flick reaches a speck within this, and none can be flicked in its first moments. */
export const FLICK_REACH = 22;
export const FLICK_AFTER_S = 0.2;
/** Every flick heats the furnace, hit or miss; it cools on its own. */
export const FLICK_HEAT = 0.1;
export const COOLING = 0.1;
/** At the top the furnace roars: nothing can be flicked for a while, and the hand takes a blow. */
export const ROAR_AT = 1;
export const ROAR_S = 2.2;
export const ROAR_HEAT = 0.7;
export const ROAR_HIT = 0.2;
/** Heat past this shows red. */
export const HEAT_WARN = 0.8;

/**
 * Each speck's outcome moves the hand this share of the way toward it: dross burned toward 1,
 * dross falling back toward 0, essence burned toward 0 twice. Essence left alone counts for
 * nothing, so idle play falls to 0.
 */
export const HAND_SETTLE = 0.09;
export const ESSENCE_BURNED_COUNTS = 2;
