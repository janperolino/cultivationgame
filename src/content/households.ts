// Going in: places and people, the six household tables (design § The world, Going in: What the
// engine makes). A resident's frame holds its owner's kit and a household store from the table of
// its owner kind, filled from the place's catalog at its prosperity: the table says which shops'
// lots it draws on and how many picks, and only the pick and the rarity are rolled. Silver and
// stones come by the owner kind too. Drafted in P3.9b for Jan's review (docs/review-queue.md).
import type { CrowdTag } from './crowd.ts';
import type { ShopKind } from './shops.ts';

export const OWNER_KINDS = [
  'mortal-family',
  'merchant',
  'official',
  'workshop',
  'cultivator',
  'sect-store',
] as const;
export type OwnerKind = (typeof OWNER_KINDS)[number];

export interface Household {
  name: string;
  /** The shops whose lots at the place fill the store. */
  draws: readonly ShopKind[];
  /** Picks from those lots, fewest to most, times the place's prosperity's lots. */
  picks: readonly [number, number];
  /** Silver taels kept in the house. */
  taels: readonly [number, number];
  /** Spirit stones kept, in low-grade worth. */
  stones: readonly [number, number];
  /** What always stands in it, by item id: a sect's store holds the year's Foundation Pills. */
  always?: readonly string[];
  /** Mortal or cultivating owner: a mortal's door is a lock and a dog, a cultivator's ground warded. */
  cultivates: boolean;
}

export const HOUSEHOLDS: Readonly<Record<OwnerKind, Household>> = {
  'mortal-family': {
    name: 'a mortal family',
    draws: ['mortal'],
    picks: [1, 3],
    taels: [5, 40],
    stones: [0, 0],
    cultivates: false,
  },
  merchant: {
    name: 'a merchant’s house',
    draws: ['mortal', 'house', 'stall'],
    picks: [2, 5],
    taels: [80, 400],
    stones: [0, 6],
    cultivates: false,
  },
  official: {
    name: 'an official’s house',
    draws: ['mortal', 'house'],
    picks: [1, 3],
    taels: [60, 250],
    stones: [0, 4],
    cultivates: false,
  },
  workshop: {
    name: 'a crafter’s workshop',
    draws: ['alchemy', 'refiner', 'talisman', 'parts'],
    picks: [2, 5],
    taels: [20, 90],
    stones: [2, 15],
    cultivates: true,
  },
  cultivator: {
    name: 'a cultivator’s dwelling',
    draws: ['stall', 'alchemy', 'refiner'],
    picks: [1, 4],
    taels: [0, 30],
    stones: [10, 60],
    cultivates: true,
  },
  'sect-store': {
    name: 'a sect’s store',
    draws: ['sect', 'alchemy', 'refiner'],
    picks: [4, 8],
    taels: [0, 0],
    stones: [100, 400],
    always: ['foundation-pill'],
    cultivates: true,
  },
};

/** Who lives in a district's houses, by its crowd's tags: a wealthy quarter holds courtyards. */
export const OWNER_OF_TAG: Readonly<Record<CrowdTag, OwnerKind>> = {
  soldiers: 'mortal-family',
  conscripts: 'mortal-family',
  officials: 'official',
  merchants: 'merchant',
  caravaneers: 'merchant',
  crafters: 'workshop',
  disciples: 'cultivator',
  servants: 'mortal-family',
  farmers: 'mortal-family',
  hunters: 'mortal-family',
  herders: 'mortal-family',
  smugglers: 'merchant',
  beggars: 'mortal-family',
  pilgrims: 'mortal-family',
  rogues: 'cultivator',
  'beast-hunters': 'cultivator',
};

/** Who is home by the hour (design § What the engine makes): 3 in 4 by night, asleep, 1 in 2 by day. */
export const HOME_BY = { night: 3 / 4, day: 1 / 2 } as const;
