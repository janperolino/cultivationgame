// Markets (design § Economy, Prosperity, What a market holds, Supply and prices, Markets by reach):
// prosperity's rows, how far a market reaches, the supply a good stands at seen from a market, how
// far a lot moves it and how fast it eases back. The rules that read these are core/markets.ts;
// each market's needs are its region's (content/map/border-wilds.ts `needs`). Every number is the
// design's; the play checkpoint tunes them.

/** One step of prosperity: its word, and what it does to a market's purses, lots and wages. */
export interface ProsperityRow {
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
