// Commissions (K12, design § Professions, people and powers: Production, commissions and the
// craft deck). Each alchemy shop, refiner and talisman shop posts one a month for its market's
// biggest shortage that its craft makes, the shortage's line of why on the notice; anything of the
// thing at the asked rarity fills it, so the ask is rare work a shelf can't fill (Jan's call in the
// talk: a bounty board, not your own make). From craft renown 3 a person asks the keeper for you by
// name. Commissions you place at an alchemy shop or a refiner are made to your wants. Every number
// is a starting value, for the crafts play checkpoint.
import type { CraftId } from './crafts.ts';
import type { RarityId } from './rarity.ts';
import type { ShopKind } from './shops.ts';

/** The craft each kind of shop posts for; a stall posts talismans where no talisman shop stands. */
export const POSTS_FOR: Partial<Record<ShopKind, CraftId>> = {
  alchemy: 'alchemy',
  refiner: 'refining',
  talisman: 'talismans',
  stall: 'talismans',
};

/** The crafts a shop makes to order (design: at a refiner or an alchemy shop). */
export const MAKES_TO_ORDER: Partial<Record<ShopKind, CraftId>> = {
  alchemy: 'alchemy',
  refiner: 'refining',
};

export const COMMISSION = {
  /** A posted commission pays this times the market's price, fixed when you take it. */
  pay: 1.5,
  /** A graded one, asking for the certified grade of the thing's tier. */
  graded: 2,
  /** The share of a notable shop's commissions that ask for the grade. */
  gradedShare: 0.25,
  /** The rarity a posted one asks for at least, rolled by the shop and month: never white. */
  floor: [
    ['green', 0.65],
    ['blue', 0.3],
    ['purple', 0.05],
  ] as readonly (readonly [RarityId, number])[],
  /** What a by-name one asks for at least. */
  byName: 'green' as RarityId,
  /** Commissions you hold at once, taken and not handed in. */
  most: 3,
  /** Craft renown points a commission done adds in its region. */
  point: 1,
  /** What leaving a taken one unfilled past the month costs the keeper's regard. */
  regard: -10,
  /** The craft renown level from which a person asks for you by name. */
  nameFrom: 3,
} as const;

/** Commissions you place (made to order): the price against the market, and the crafter's day. */
export const ORDER = {
  pay: 1.25,
  /** Your inputs take their market worth off, never below this share of what is made. */
  least: 0.25,
  /** Craft hours a shop's crafter works a day. */
  hours: 8,
  /** The house's family mastery by its weight: the small shops, a shop, a notable shop. */
  mastery: { small: 1, shop: 2, notable: 3 },
} as const;

/**
 * Who asks for you by name (Jan's call in the talk: people come to a crafter whose name is known,
 * the novels' trope): a role in the market, its name rolled from the shop, month and craft.
 */
export const ASKERS: Readonly<Record<CraftId, readonly string[]>> = {
  alchemy: [
    'a garrison surgeon',
    'a caravan master',
    'an outer disciple sent by a hall',
    'a clan steward',
  ],
  refining: [
    'a caravan guard captain',
    'a bounty hunter',
    'a clan heir before a trial',
    'a garrison quartermaster',
  ],
  talismans: ['a barge master', 'a bounty hunter', 'a garrison scout captain', 'a clan steward'],
  formations: ['a clan steward'],
  farming: ['a herb-hall buyer'],
};
