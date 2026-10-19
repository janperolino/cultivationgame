// Money (design § World bible, Stones, silver and shops in play; § Economy, Price yardstick):
// spirit stones by grade, each held as its own count, and silver as the mortal purse. Changing
// money always costs the one who changes it, both ways (Jan's call in P3.5's talk): 1,200 of a
// grade buy one of the next, and one stone breaks into 1,100 of the grade below, so a round trip
// loses about 8% and no loop pays. Every number is a starting value; M6's markets tune them.
import type { ItemKind } from './items.ts';
import type { ManualKind } from './manuals.ts';

export const GRADES = ['low', 'mid', 'high', 'top'] as const;
export type Grade = (typeof GRADES)[number];

/** A grade's face value in the grade below: 1 mid is 1,000 low on the yardstick. */
export const GRADE_FACE = 1000;
/** Stones of a grade that buy one of the next grade up. */
export const UP_COST = 1200;
/** Stones of the grade below that one stone breaks into. */
export const DOWN_GIVES = 1100;

/**
 * The grade a purse deals in by tier (design § Economy, Money; Stones, silver and shops in play):
 * tier n is realm n's, and a vein of tier n keeps realm n, so a person and a market read the same
 * row. Low to Foundation, mid at Core Formation, high to Deity Transformation, top above; index 0
 * is no vein, which deals in low. An index into GRADES.
 */
export const GRADE_BY_TIER = [0, 0, 0, 1, 2, 2, 3, 3, 3, 3] as const;

/** Taels a low-grade stone breaks into at a money changer. */
export const STONE_TO_SILVER = 110;
/** Taels that buy one low-grade stone. */
export const SILVER_TO_STONE = 120;

/**
 * What a white thing of tier 1 costs in low-grade stones, by what it is (design § Economy, Price
 * yardstick: Qi Condensation goods 1–10 low, a Foundation blade about 400). Rarity multiplies it
 * by its `price` (content/rarity.ts) and tier by the realm curve below. An item may set its own.
 */
export const BASE_PRICE: Record<ItemKind, number> = {
  pill: 3,
  talisman: 4,
  herb: 2,
  material: 1,
  'beast-part': 1,
  gear: 45,
  treasure: 80,
  manual: 30,
  vessel: 50,
  mount: 100,
  beast: 100,
  // A map sets its own price (content/map/places.ts): a kingdom's 30, a region's 360.
  map: 30,
};

/** Gear that carries squares is dearer than a blade. */
export const STORAGE_PRICE = 60;

/** A copy's price by what it teaches: a loose manual by its kind, a method, a technique. */
export const COPY_PRICE: Record<ManualKind | 'method' | 'technique', number> = {
  formula: 20,
  art: 30,
  method: 60,
  style: 40,
  scripture: 120,
  inheritance: 300,
  technique: 30,
};

/**
 * What a region does to an item's price, by region and item id (Jan's note in P3.2's talk): in
 * the Border Wilds the Foundation Pill is dearer, the Soul-Condensing Pill rarer and dearer still,
 * and the Marrow-Washing Pill cheaper, since the Gate brews it.
 */
export const REGION_PRICE: Record<string, Record<string, number>> = {
  'qm-bianhuang': {
    'foundation-pill': 1.5,
    'soul-condensing-pill': 2,
    'marrow-washing-pill': 0.6,
  },
};
