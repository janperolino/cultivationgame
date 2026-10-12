// Rarity (design § Tier, rarity and pedigree): one scale for everything you can own or be born
// with, as a fraction of a realm. A thing of rarity f multiplies by gap^f, where the gap is the one
// out of the thing's own tier (`tierGap` in content/realms.ts): ×3 for a tier 1 thing, ×5.5 at
// tier 2, ×10 from tier 3 up. Every number is a starting value for the sims.

export interface Rarity {
  id: string;
  name: string;
  /** What the rarity says of a thing, for tooltips. */
  note: string;
  /** The exponent: the thing multiplies by gap^f. */
  f: number;
  /** What a technique of this rarity adds to checks with it. */
  check: number;
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
    f: -0.2,
    check: 0,
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
    f: 0,
    check: 0,
    properties: 0,
    unique: false,
    price: 1,
    roll: 0.4,
    breakthrough: plain,
    heavenly: false,
  },
  {
    id: 'green',
    name: 'Green',
    note: 'a little better than plain',
    f: 0.1,
    check: 0,
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
    f: 0.2,
    check: 0,
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
    f: 0.35,
    check: 0,
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
    note: 'heaven-defying: about four-fifths of a realm',
    f: 0.75,
    check: 2,
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
    note: 'heaven-defying: nine-tenths of a realm',
    f: 0.9,
    check: 4,
    properties: 3,
    unique: true,
    price: 200,
    roll: 0.001,
    breakthrough: { odds: 0.16, margin: 0.5, injury: 0.5, keepBar: true },
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

/** gap^f: what a thing of this rarity multiplies by, given the gap out of its own tier. */
export function rarityMultiplier(id: RarityId, gap: number): number {
  return gap ** rarity(id).f;
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
