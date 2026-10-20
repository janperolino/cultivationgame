// Rarity (design § Tier, rarity and pedigree): one scale for everything you can own or be born
// with, as a band: the stage the thing is sized at in its own tier's realm. White is the realm's
// first stage, blue its middle, purple the half-step past its peak, gold the next realm's first
// stage, red the next realm's middle and pristine its half-step, one roll in ten thousand (the
// realm gap's design moved the words, not the numbers). In numbers, with s the step out of the thing's tier (`tierStep` in
// content/realms.ts, ×3.1 at tier 1): mult × s^exponent. Every number is a starting value for the sims.

export interface Rarity {
  id: string;
  name: string;
  /** What the rarity says of a thing, for tooltips. */
  note: string;
  /** The band in stage words, for tooltips. */
  band: string;
  /** The fixed part of the band's multiplier. */
  mult: number;
  /** The banded part: the step out of the thing's tier to this power. */
  exponent: number;
  /** What a technique of this rarity multiplies Accuracy by; a weapon takes the square root. */
  accuracy: number;
  /** Special properties a thing carries, besides its unique one; green's is a minor one. */
  properties: number;
  /** Gold and red things also carry a unique property, and red's is named. */
  unique: boolean;
  /** Price within a tier, against a white thing. */
  price: number;
  /** The talent and loot roll table (design § Cultivation, talents): the chance of each rarity. */
  roll: number;
  /** What a method of this rarity adds at a breakthrough attempt (design § Cultivation, methods). */
  breakthrough: {
    /** Added to the odds of any breakthrough, minor or major. */
    odds: number;
    /** Added to a major breakthrough's grade margin. */
    margin: number;
    /** A failure's injury lasts this fraction as long. */
    injury: number;
    /** A failure costs no bar. */
    keepBar: boolean;
  };
  /** Whether a method of this rarity can carry a major breakthrough to the heavenly grade. */
  heavenly: boolean;
}

const plain = { odds: 0, margin: 0, injury: 1, keepBar: false };

export const RARITIES = [
  {
    id: 'gray',
    name: 'Gray',
    note: 'flawed',
    band: 'below early',
    mult: 0.8,
    exponent: 0,
    accuracy: 1,
    properties: 0,
    unique: false,
    price: 0.5,
    roll: 0.1,
    breakthrough: { ...plain, odds: -0.02 },
    heavenly: false,
  },
  {
    id: 'white',
    name: 'White',
    note: 'plain',
    band: 'early',
    mult: 1,
    exponent: 0,
    accuracy: 1,
    properties: 0,
    unique: false,
    price: 1,
    roll: 0.3999,
    breakthrough: plain,
    heavenly: false,
  },
  {
    id: 'green',
    name: 'Green',
    note: 'a little better than plain',
    band: 'early-middle',
    mult: 1.2,
    exponent: 0,
    accuracy: 1,
    properties: 1,
    unique: false,
    price: 2,
    roll: 0.35,
    breakthrough: { ...plain, odds: 0.02 },
    heavenly: false,
  },
  {
    id: 'blue',
    name: 'Blue',
    note: 'fine',
    band: 'middle',
    mult: 1.5,
    exponent: 0,
    accuracy: 1,
    properties: 1,
    unique: false,
    price: 5,
    roll: 0.1,
    breakthrough: { ...plain, odds: 0.04 },
    heavenly: false,
  },
  {
    id: 'purple',
    name: 'Purple',
    note: 'rare',
    band: 'the half-step',
    mult: 1,
    exponent: 0.8,
    accuracy: 1,
    properties: 2,
    unique: false,
    price: 15,
    roll: 0.04,
    breakthrough: { ...plain, odds: 0.07, injury: 0.5 },
    heavenly: false,
  },
  {
    id: 'gold',
    name: 'Gold',
    note: 'heaven-defying: sized at the next realm',
    band: 'the next realm, early',
    mult: 1,
    exponent: 1,
    accuracy: 1.2,
    properties: 2,
    unique: true,
    price: 50,
    roll: 0.009,
    breakthrough: { odds: 0.12, margin: 0.25, injury: 0.5, keepBar: false },
    heavenly: true,
  },
  {
    id: 'red',
    name: 'Red',
    note: 'heaven-defying: sized past the next realm’s first stage',
    band: 'the next realm, middle',
    mult: 1,
    exponent: 1.3,
    accuracy: 1.4,
    properties: 3,
    unique: true,
    price: 200,
    roll: 0.001,
    breakthrough: { odds: 0.16, margin: 0.5, injury: 0.5, keepBar: true },
    heavenly: true,
  },
  {
    id: 'pristine',
    name: 'Pristine',
    note: 'without a flaw: sized at the next realm’s half-step',
    band: 'the next realm’s half-step',
    mult: 1,
    exponent: 1.8,
    accuracy: 1.6,
    properties: 4,
    unique: true,
    price: 1000,
    roll: 0.0001,
    breakthrough: { odds: 0.2, margin: 0.75, injury: 0.5, keepBar: true },
    heavenly: true,
  },
] as const satisfies readonly Rarity[];

export type RarityId = (typeof RARITIES)[number]['id'];
export const RARITY_IDS = RARITIES.map((r) => r.id) as unknown as readonly [
  RarityId,
  ...RarityId[],
];

const byId = new Map<RarityId, Rarity>(RARITIES.map((r) => [r.id, r]));

export function rarity(id: RarityId): Rarity {
  const r = byId.get(id);
  if (!r) throw new RangeError(`Unknown rarity ${id}`);
  return r;
}

/** The band's multiplier, given the step out of the thing's own tier (`tierStep`): purple ×2.5 at tier 1. */
export function rarityMultiplier(id: RarityId, step: number): number {
  const r = rarity(id);
  return r.mult * step ** r.exponent;
}

/** What a technique of this rarity multiplies Accuracy by: ×1.2 at gold, ×1.4 at red, ×1.6 at pristine. */
export function rarityAccuracy(id: RarityId): number {
  return rarity(id).accuracy;
}

/** Where a rarity sits on the scale: 0 for gray up to 6 for red. */
export function rarityRank(id: RarityId): number {
  return RARITY_IDS.indexOf(id);
}

/** The rarity a uniform roll in [0, 1) lands on, on the talent and loot table. */
export function rollRarity(roll: number): RarityId {
  let acc = 0;
  for (const r of RARITIES) {
    acc += r.roll;
    if (roll < acc) return r.id;
  }
  return 'white';
}
