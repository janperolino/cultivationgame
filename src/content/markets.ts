// Markets (design § Economy, Prosperity, What a market holds, Supply and prices, Markets by reach):
// prosperity's rows, how far a market reaches, the supply a good stands at seen from a market, how
// far a lot moves it and how fast it eases back. The rules that read these are core/markets.ts;
// each market's needs are its region's (content/map/border-wilds.ts `needs`). Every number is the
// design's; the play checkpoint tunes them.

/** One step of prosperity: its word, and what it does to a market's purses, lots and wages. */
interface ProsperityRow {
  word: string;
  purse: number;
  lots: number;
  wages: number;
}

/** Prosperity 1 to 9, ruined to golden; index 0 is unused. */
export const PROSPERITY: readonly ProsperityRow[] = [
  { word: '', purse: 0, lots: 0, wages: 0 },
  { word: 'ruined', purse: 0.25, lots: 0.5, wages: 0.6 },
  { word: 'poor', purse: 0.4, lots: 0.6, wages: 0.7 },
  { word: 'lean', purse: 0.6, lots: 0.75, wages: 0.8 },
  { word: 'modest', purse: 0.8, lots: 0.9, wages: 0.9 },
  { word: 'ordinary', purse: 1, lots: 1, wages: 1 },
  { word: 'thriving', purse: 1.3, lots: 1.15, wages: 1.1 },
  { word: 'rich', purse: 1.7, lots: 1.3, wages: 1.2 },
  { word: 'flourishing', purse: 2.2, lots: 1.5, wages: 1.3 },
  { word: 'golden', purse: 3, lots: 1.75, wages: 1.4 },
];

/** A place eases back toward its written prosperity a step each this many days: a year. */
export const PROSPERITY_EASE_DAYS = 360;

/** A day's work at an ordinary place at Qi Condensation, in low-grade stones; the realm curve scales it. */
export const WAGE_LOW = 1;
/** A mortal laborer's day at an ordinary place, in taels. */
export const WAGE_TAELS = 0.1;

/** What kind of market a place is, by how far it reaches. */
export type MarketKind = 'village' | 'town' | 'seat' | 'city';

/** How far a market draws on the markets round it, in li, in a straight line (Markets by reach). */
export const REACH_LI: Record<MarketKind, number> = {
  village: 0,
  town: 15_000,
  seat: 15_000,
  city: 30_000,
};

/**
 * A market's size by who lives there (E2.2): a lot sold or bought moves its supply less by this,
 * so a city takes a Bag that floods a village. log10 of its cultivators ÷ 50, from ×0.5 (under
 * about 150) to ×2 (5,000 and up): ×1 at 500, about ×1.5 at 1,600.
 */
export const SIZE = { per: 50, min: 0.5, max: 2 } as const;

/**
 * The highest tier a market's people buy, within its vein (E2.2): tier 3 where a Core Formation
 * cultivator lives, tier 2 where twenty Foundation cultivators do, tier 1 otherwise. Nobody stocks
 * tier 4, which three Nascent Souls don't make a market for.
 */
export const TIER_BY_PEOPLE = { core: 1, foundation: 20 } as const;

/** The place weight the markets in reach share between them, beside the market's own 50. */
export const LENT_WEIGHT = 15;

/** How a good stands seen from a market, by where it comes from. */
export type Source = 'made' | 'local' | 'reach' | 'import' | 'need' | 'none';

/** The supply a good is written at, in %, by where it comes from (Supply and prices). */
export const SOURCE_SUPPLY: Record<Source, number> = {
  made: 150,
  local: 100,
  reach: 100,
  import: 100,
  need: 50,
  none: 50,
};
/** A coveted thing where it is made: no maker keeps up. */
export const COVETED_MADE_SUPPLY = 100;

/** The road's share on top of the price. */
export const ROAD: Record<Source, number> = {
  made: 1,
  local: 1,
  reach: 1.1,
  import: 1.2,
  need: 1,
  none: 1,
};

/** Supply never leaves this band. */
export const SUPPLY_MIN = 25;
export const SUPPLY_MAX = 200;

/** Supply points a lot moves, by kind of good, before prosperity's lots divide it. */
export const DEPTH = { staple: 2, common: 10, rare: 25 } as const;

/** Supply eases back this share of the way to its written value each month. */
export const SUPPLY_EASE = 0.1;

/**
 * A style's opening chapters, the ones a market sells (design § Economy, Methods in the market,
 * Fragments; E3's talk): Qi Condensation's and Foundation's. Later chapters are a sect's for
 * contribution, a ruin's or an auction's, so a market neither stocks nor copies them.
 */
export const OPENING_CHAPTERS = 2;

/** What a market pays for what it needs, of its own price; never a black market. */
export const NEED_RATE = 0.8;

/**
 * Higher tiers are rare on a shelf (Jan's call in E2's talk, for every region): a lot weighs a
 * tenth for each tier it stands above Foundation's and a tenth more when its maker raised it above
 * its written one, and a good made here a step less. So in the Border Wilds a tier 3 lot turns up
 * three to five times a year in each shop that stocks tier 3.
 */
export const TIER_LEAN = 0.1;
/** The highest tier that weighs in full. */
export const TIER_LEAN_FROM = 2;

// ── People make and use (E4) ──────────────────────────────────────────────────────────────────

/**
 * What a head uses a month by need (design § Economy, People make and use, the monthly basket):
 * a mortal, then a cultivator at tiers 1 to 3 (Qi Condensation, Foundation, Core Formation), each
 * filled by goods at their own level, a mortal's in taels. Prosperity's wages scale it.
 */
export const BASKET = {
  grain: [0.8, 2, 1, 0],
  salt: [0.05, 0, 0, 0],
  oil: [0.1, 0, 0, 0],
  cloth: [0.02, 0, 0, 0],
  'qi-fuel': [0, 2, 2, 2],
  'qi-restoring': [0, 1, 1, 1],
  healing: [0, 1, 1, 1],
  talisman: [0, 1, 1, 1],
  detox: [0, 0.2, 0.2, 0.2],
  'body-fuel': [0, 0.3, 0.3, 0.3],
  'soul-fuel': [0, 0.2, 0.2, 0.2],
  weapon: [0, 0.03, 0.03, 0.03],
  armor: [0, 0.03, 0.03, 0.03],
} as const satisfies Record<string, readonly [number, number, number, number]>;
export type BasketNeed = keyof typeof BASKET;

/** The tags that fill a need, when not its own name: cloth is wool or hide. */
export const FILLED_BY: Partial<Record<string, readonly string[]>> = { cloth: ['wool', 'hide'] };

/**
 * What a maker uses a piece, by what it makes (design § Economy, What makers use): a pill a herb of
 * its tier, a talisman its ink, a weapon or armor 5 ore, a sack of spirit grain 0.1 of bone meal.
 * A catalog line may write its own (`Lot.uses`). Inputs use nothing.
 */
export const MAKER_USES = {
  pill: { herb: 1 },
  talisman: { ink: 1 },
  gear: { ore: 5 },
  grain: { 'bone-meal': 0.1 },
} as const satisfies Record<string, Record<string, number>>;

/**
 * Pressures turn a need up (People make and use): a written need ×2, marsh or jungle land doubles
 * detox, thin qi (a density of 3 or less) raises qi-fuel by half; together at most ×3.
 */
export const PRESSURE = {
  written: 2,
  wet: { lands: ['marsh', 'jungle'], tag: 'detox', x: 2 },
  thin: { qi: 3, tag: 'qi-fuel', x: 1.5 },
  max: 3,
} as const;

/** A maker makes half again what its own people use (or, using none, what its reach uses). */
export const MAKE_SHARE = 1.5;

/**
 * Harvests (People make and use): a seasonal good is made at ×1.4 the month after its harvest,
 * falling evenly to ×0.6 the month before the next, at the same yearly total. Grain is reaped in
 * autumn's middle month, herbs picked through spring and summer, counted from midsummer. Months
 * count from the year's first, spring's first.
 */
export const HARVEST = {
  months: { grain: 7, herb: 4 },
  high: 1.4,
  low: 0.6,
} as const;

/** A supply in the sum moves this share of the way to its rest each month. */
export const REST_STEP = 1 / 3;

/**
 * Half of what a market's people earn passes through its shops (What a market holds, a shop's
 * purse), shared among its doors by `DOOR_SHARE` (E5); the mortals' money is their basket's.
 */
export const PURSE_SHARE = 0.5;

/**
 * A mortal's month in the shops (E5): their basket's worth, about 0.2 taels at an ordinary place,
 * not half their earnings, since a farmer eats what he grows. The grain and cloth market's money.
 */
export const MORTAL_SPEND_TAELS = 0.2;

/**
 * What stands on a district's shelves of a good in the monthly sum (E5, Shelves): this share of its
 * market's month of use, about three days' trade, times its supply.
 */
export const SHELF_SHARE = 0.1;

/** A trading house takes this share of every good it sells off the top, before the district's split. */
export const HOUSE_TAKE = { plain: 0.2, import: 0.4 } as const;

/** What the line of why calls a need, and whether it reads as one thing ("salt runs short"). */
export const NEED_WORDS: Readonly<Record<string, { word: string; one?: boolean }>> = {
  grain: { word: 'grain', one: true },
  salt: { word: 'salt', one: true },
  oil: { word: 'lamp oil', one: true },
  cloth: { word: 'cloth', one: true },
  'qi-fuel': { word: 'gathering pills' },
  'qi-restoring': { word: 'restoring pills' },
  healing: { word: 'healing pills' },
  talisman: { word: 'talismans' },
  detox: { word: 'detox pills' },
  'body-fuel': { word: 'body-tempering pills' },
  'soul-fuel': { word: 'soul pills' },
  weapon: { word: 'weapons' },
  armor: { word: 'armor', one: true },
  herb: { word: 'herbs' },
  ink: { word: 'talisman ink', one: true },
  ore: { word: 'ore', one: true },
  'bone-meal': { word: 'bone meal', one: true },
  horn: { word: 'horn', one: true },
};
