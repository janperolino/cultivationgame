// Tempering 淬炼 at the forge (design § Professions, Crafts, thin, the hands-on version; K4, its
// talk and `docs/mockups/forge-tempering-study.html`): struck as the glow passes the right color
// and quenched at the end. The piece hangs over the forge's true fire 真火 and rises out of it a
// heat at a time with rune points 禁制 raised on it; a hand seal 法诀 pressed into a point as the
// metal under it passes orange takes, too hot it blurs, too cold it won't take. Every fourth heat
// is the quench, in a basin of spirit-spring water as the whole piece passes cherry. core/forge.ts
// reads these. Times are real seconds; places are the scene's own frame, 760 by 560. Starting
// values, measured with a bot (core/forge.test.ts): attentive play holds about 0.8, sloppy 0.6,
// greedy 0.2 and idle 0.

/** The scene's frame, and the piece in it: from its hilt to its point, at its height. */
export const FORGE_BOX = { w: 760, h: 560 } as const;
export const PIECE = { x0: 250, x1: 540, y: 262 } as const;
/** Rune points stand this far above the piece, and a seal reaches one within this. */
export const RUNE_RISE = 26;
export const SEAL_REACH = 24;

/** Seconds the piece sinks back into the fire between heats. */
export const FIRE_S = 1;
/**
 * A heat's glow along the piece, 0 dark to 1 white: a base, and a hot spot on top of it where the
 * fire bit hardest this time, rolled anywhere along the piece.
 */
export const HEAT_BASE = 0.7;
export const HOT = 0.28;
export const HOT_WIDTH = 120;
/** Cooling: the glow falls as `−COOLING × (glow + COOL_FLOOR)`, so the hottest cools fastest. */
export const COOLING = 0.3;
export const COOL_FLOOR = 0.15;

/** Rune points a heat, at least and at most, and how far apart along the piece. */
export const RUNES: readonly [min: number, max: number] = [2, 4];
export const RUNE_GAP = 52;
/** The runes the points show: edge, firmness, spirit, command, breaking, gathering, holding, keenness. */
export const RUNE_GLYPHS = ['锋', '坚', '灵', '御', '破', '凝', '固', '利'] as const;

/** Seal a point as its glow passes orange; quench the piece as it passes cherry. */
export const SEAL_BAND: readonly [lo: number, hi: number] = [0.5, 0.64];
export const QUENCH_BAND: readonly [lo: number, hi: number] = [0.34, 0.44];
/** A point still raised when the metal under it goes this dark is left in the piece. */
export const DARK = 0.26;

/** Every this many heats is the quench: no points, the whole piece out at one glow. */
export const QUENCH_EVERY = 4;
export const QUENCH_GLOW: readonly [min: number, max: number] = [0.86, 0.94];
/** After the last point or the quench, the piece rests this long before it sinks again. */
export const REST_S = 0.35;
export const QUENCH_REST_S = 0.9;

/** A hand seal takes this long to form, so no faster; it knocks this much cooling into the piece. */
export const SEAL_S = 0.3;
export const SEAL_COOLS_S = 0.07;

/**
 * Each outcome moves the hand this share of the way toward it (fire control's): a rune that
 * takes toward 1, a blurred one toward a tenth, one that won't take or is left toward 0. The
 * quench counts three times. Doing nothing leaves every point and every quench, so it falls to 0.
 */
export const HAND_SETTLE = 0.09;
export const BLURRED = 0.1;
export const QUENCH_COUNTS = 3;
