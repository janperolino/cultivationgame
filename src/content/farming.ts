// Spirit farming (design § Professions, people and powers: Spirit farming; K8's talk, Jan's calls):
// a plot of nine beds however it is held, plants on the qi density where it lies, a bed sown from
// one packet and giving by its crop's floor, herb age in bands, the boosters, hardiness, pests and
// thieves, and tending's minigame, the sleeve's ring 拂袖. One engine reads them (core/farming.ts).
// Every number is the design's; the sims and the play checkpoint tune them.
import type { RarityId } from './rarity.ts';

/**
 * What can be planted (K8): spirit rice, frontier millet and the catalogs' herbs a shop sells, each a
 * recipe of the Grain or Herbs family written beside its line in the first catalog that lots it
 * (content/catalogs/index.ts `withCrops`), its packet sold by the same doors. `count` is a bed's
 * own, where its story tells one. A herb nobody sells (the thousand-year ginseng) waits for one.
 */
export const CROPS: Readonly<Record<string, { family: 'grain' | 'herbs'; count?: number }>> = {
  'spirit-rice': { family: 'grain' },
  'frontier-millet': { family: 'grain' },
  'calm-heart-grass': { family: 'herbs' },
  'ridge-bitterroot': { family: 'herbs' },
  'old-apricot-kernel': { family: 'herbs' },
  'clear-spring-lotus': { family: 'herbs' },
  'blood-salt-kelp': { family: 'herbs' },
  'pit-edge-nettle': { family: 'herbs' },
  'beast-blood-vine': { family: 'herbs' },
  'thunderhead-clover': { family: 'herbs' },
  'moon-sea-grape': { family: 'herbs' },
  'glow-cap-mushroom': { family: 'herbs' },
  'bend-water-lotus-seed': { family: 'herbs' },
  'horse-heart-grass': { family: 'herbs' },
  'never-noon-fern': { family: 'herbs' },
  'ash-leaf-tea': { family: 'herbs' },
};

/** A plot (K8's talk): nine beds, rented by the season or bought for ten seasons' rent. */
export const PLOT = {
  beds: 9,
  /** A season's rent in low-grade stones where the plot grows tier 1, up the realm curve a tier. */
  rent: 6,
  buySeasons: 10,
  season: 90,
} as const;

/** How a plot is held: rented by the season, bought, or laid out in a dwelling's slot (K9). */
export const HELD = ['rented', 'bought', 'slot'] as const;
export type Held = (typeof HELD)[number];

/**
 * The qi density a plant needs (Jan's call: density, not the vein): twice its tier. Below it a bed
 * grows at a quarter; each step above it ×1.15, seclusion's step.
 */
export const DENSITY = { perTier: 2, below: 0.25, step: 1.15 } as const;

/** A crop of the plot's element grows ×1.25; each soil tier above plain earth ×1.25. */
export const ELEMENT_MATCH = 1.25;
export const SOIL_STEP = 1.25;

/** A tier 1 crop ripens in a season of growth, each tier up ×1.5. */
export const RIPEN = { days: 90, perTier: 1.5 } as const;

/**
 * Pieces a bed gives at harvest by its crop's written floor (Jan's call: a rare plant grows in a
 * smaller batch), each bed about the same worth at its floor. A crop may write its own.
 */
export const BED_YIELD: Record<RarityId, number> = {
  gray: 30,
  white: 30,
  green: 15,
  blue: 6,
  purple: 2,
  gold: 1,
  red: 1,
  pristine: 1,
};

/** Herb age in years, a band up at each (never thinning); a farmable herb ages two bands past its written top. */
export const AGE_BANDS = [10, 100, 1000] as const;
export const AGED_PAST_TOP = 2;

/** Untended, a plant grows at its hardiness by age in years (Jan's call). */
export const HARDINESS = [
  { from: 0, grows: 0.5, word: 'needs tending' },
  { from: 10, grows: 0.75, word: 'hardy' },
  { from: 100, grows: 1, word: 'stands alone' },
] as const;

/**
 * Pests (Jan's call): the months a plot goes untended before they come, by its land, a month more a
 * soil tier above plain earth; past it they take a bed a month.
 */
export const PEST_MONTHS: Readonly<Record<string, number>> = {
  forest: 1,
  jungle: 1,
  marsh: 1,
  plains: 3,
};
export const PEST_MONTHS_ELSE = 2;

/** Thieves leave a rented or bought plot alone until your heat at its place reaches this. */
export const THIEF_HEAT = 3;

/** A harvest gives back two packets at the bed's floor; past a hundred years one comes a band up. */
export const PACKETS_BACK = 2;
export const BRED_AT = 100;

/** A packet sows one bed and costs about three of its crop (K8's talk). */
export const PACKET_PRICE = 3;

/** One gathered find in ten comes as a live cutting, a packet of its herb (K8's talk). */
export const CUTTING_SHARE = 0.1;

/**
 * Boosters (design § Spirit farming): a season of Spring-Rain or a Wood spell ×1.5 on a plot. A
 * growing array lifts a dwelling's density by its steps and tends its slots (K10, core/arrays.ts),
 * where design.md wrote ×2. Earth milk adds its years at once, its rarity setting them.
 */
export const BOOST = { rain: 1.5, wood: 1.5, days: 90 } as const;
export const EARTH_MILK_YEARS: Partial<Record<RarityId, number>> = {
  white: 3,
  green: 10,
  blue: 30,
  purple: 100,
};
/** The Wood Dao node that casts the Wood spell on a plot (its Herb Sense path). */
export const WOOD_SPELL_NODE = 'wood-rooting-hand';

/**
 * The gather hour on divine sense (K8's talk, Jan's call): pieces an hour × your sense by your
 * soul's realm, ×3 a realm from Qi Condensation's ×1, and the Herbs family's mastery, +25% a level.
 */
export const SENSE_STEP = 3;
export const GATHER_MASTERY = 0.25;

// ---------------------------------------------------------------- packets

const SEED = 'seed.';

/** A crop's packet of seeds or cuttings, built from its id (content/items.ts). */
export const seedId = (crop: string) => `${SEED}${crop}`;

/** The crop a packet sows, or null when the id is no packet. */
export function cropOfSeed(id: string): string | null {
  const base = id.split('~')[0]!;
  return base.startsWith(SEED) ? base.slice(SEED.length) : null;
}

// ---------------------------------------------------------------- tending, the sleeve's ring 拂袖

/**
 * Tending (Jan's pick of the study, take A, `docs/mockups/tending-study.html`): knots of foul qi
 * 浊气 rise from the beds and drift together; draw a closed ring round them and your sleeve sweeps
 * them up. Each knot swept moves the hand toward 1, a ring of three or more toward 1 again (妙); a
 * ring whose line crosses a sprout bruises it (伤, toward 0 twice); a knot left `life` seconds
 * sinks into the roots (浊, toward 0). The ring's line runs out past `most`. Lengths in the scene's
 * pixels (760 × 640).
 */
export const TEND = {
  /** Seconds between knots rising. */
  every: [0.9, 1.7] as const,
  life: 8,
  sinkFrom: 6,
  drift: 9,
  pull: 7,
  pullR: 130,
  close: 48,
  most: 1100,
  bruiseR: 10,
  /** A bruised sprout can't be bruised again for this long. */
  heal: 3,
  ring: 3,
  /** The hand moves this share of the gap toward each outcome. */
  share: 0.09,
} as const;
