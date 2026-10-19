// Shops (design § World bible, Stones, silver and shops in play; § Items and gear, Loot and
// shops): the kinds of shop, what each stocks and buys, its bias on the shared rarity table, its
// purse, and the Border Wilds' shops where they stand. A shop's stock comes from the catalogs of
// its place, its region, its continent and the imports along their ties (content/catalogs/),
// weighted by the layer weights below. Stock and money are kept per shop, so M6's markets by reach
// and standing orders grow from these. P3.6 stands them in its towns. Every number is a starting
// value; M6 tunes them.
import type { Layer } from './catalogs/types.ts';
import type { ItemKind } from './items.ts';

export const SHOP_KINDS = [
  'stall',
  'alchemy',
  'refiner',
  'sect',
  'guild',
  'black-market',
  'bounty',
  'mortal',
] as const;
export type ShopKind = (typeof SHOP_KINDS)[number];

/** What a shop deals in: the Bag's kinds, and copies of manuals, methods and techniques. */
export type Ware = ItemKind | 'copy';

export interface ShopKindInfo {
  name: string;
  hanzi: string;
  /** The bias on the shared rarity table (Items and gear): a stall 0.6, a vault 1.6. */
  bias: number;
  /** Lots in a month's stock at an ordinary place; prosperity's lots multiply it. */
  lots: number;
  /** What it buys from you, and at what share of its own price. */
  buys: readonly Ware[];
  buyRate: number;
  /**
   * Its purse a month at tier 1 and ordinary, in its own money: what it can pay out buying from
   * you. A shop's own is this times the realm curve at its top tier and its prosperity's purse
   * (core/markets.ts `shopPurse`).
   */
  purse: number;
  money: 'stones' | 'silver';
  /** Its prices against the posted rate: the black market's risk. */
  markup: number;
  /** How a lot draws from each layer of catalogs (they need not add up to anything). */
  layers: Record<Layer, number>;
  /** Whether it knows stolen goods for what they are. A black market never asks. */
  recognizes: boolean;
  /** It mends worn and damaged armor and gear for stones. */
  repairs?: boolean;
  /** It sells only to members of its power. */
  members?: boolean;
  /** What it leans toward stocking, against its other wares: a stall's few copies and blades. */
  leans?: Partial<Record<Ware, number>>;
  /** It posts its rates and never haggles: the bounty office. */
  posted?: boolean;
}

const BY_PLACE: Record<Layer, number> = { place: 50, region: 25, continent: 15, import: 10 };

export const SHOP_KIND_INFO: Record<ShopKind, ShopKindInfo> = {
  stall: {
    name: 'stall',
    hanzi: '摊',
    bias: 0.6,
    lots: 6,
    // It deals in pills, talismans and herbs (Items and gear), so it buys them too (E2's talk).
    buys: ['pill', 'talisman', 'herb', 'beast-part', 'material'],
    buyRate: 0.4,
    purse: 150,
    money: 'stones',
    markup: 1,
    layers: BY_PLACE,
    recognizes: true,
    // A stall sells pills, talismans and herbs (Items and gear); a copy or a blade is the odd lot.
    leans: { copy: 0.25, gear: 0.5, treasure: 0.5 },
  },
  alchemy: {
    name: 'alchemy shop',
    hanzi: '丹铺',
    bias: 1,
    lots: 8,
    buys: ['pill', 'herb', 'beast-part', 'material'],
    buyRate: 0.4,
    purse: 1500,
    money: 'stones',
    markup: 1,
    layers: BY_PLACE,
    recognizes: true,
  },
  refiner: {
    name: 'refiner',
    hanzi: '器坊',
    bias: 1,
    lots: 6,
    buys: ['gear', 'treasure', 'material'],
    buyRate: 0.4,
    purse: 1500,
    money: 'stones',
    markup: 1,
    layers: BY_PLACE,
    recognizes: true,
    repairs: true,
  },
  sect: {
    name: 'sect shop',
    hanzi: '宗门坊',
    bias: 1,
    lots: 12,
    buys: ['pill', 'talisman', 'herb', 'beast-part', 'material', 'gear', 'treasure', 'copy'],
    buyRate: 0.4,
    purse: 5000,
    money: 'stones',
    markup: 1,
    layers: BY_PLACE,
    recognizes: true,
    members: true,
  },
  guild: {
    name: 'merchant guild',
    hanzi: '商会',
    bias: 1,
    lots: 16,
    buys: ['pill', 'talisman', 'herb', 'beast-part', 'material', 'gear', 'treasure', 'copy'],
    buyRate: 0.4,
    purse: 8000,
    money: 'stones',
    markup: 1,
    // A guild carries goods from region to region, so its imports count double.
    layers: { place: 40, region: 25, continent: 15, import: 20 },
    recognizes: true,
  },
  'black-market': {
    name: 'black market',
    hanzi: '黑市',
    bias: 1.3,
    lots: 10,
    buys: ['pill', 'talisman', 'herb', 'beast-part', 'material', 'gear', 'treasure', 'copy'],
    buyRate: 0.3,
    purse: 4000,
    money: 'stones',
    markup: 1.5,
    // Contraband comes from elsewhere: imports first.
    layers: { place: 25, region: 15, continent: 10, import: 50 },
    recognizes: false,
  },
  bounty: {
    name: 'bounty office',
    hanzi: '赏榜',
    bias: 1,
    lots: 0,
    buys: ['beast-part', 'material'],
    buyRate: 0.5,
    purse: 20_000,
    money: 'stones',
    markup: 1,
    layers: BY_PLACE,
    recognizes: true,
    posted: true,
  },
  mortal: {
    name: 'mortal shop',
    hanzi: '铺',
    bias: 0.6,
    lots: 4,
    buys: [],
    buyRate: 0.4,
    purse: 30,
    money: 'silver',
    markup: 1,
    layers: BY_PLACE,
    recognizes: true,
  },
};

/** A shop's price against the posted rate, drawn once from its id: two guild branches disagree. */
export const PRICE_SPREAD = [0.9, 1.15] as const;

/** Haggling (a people check, the `bargain` act): off the whole visit on a clear or a close pass. */
export const HAGGLE_OFF = { clear: 0.2, close: 0.1 } as const;

/** Selling at the better rate once the keeper is friendly or their power favors you. */
export const FRIENDLY_BUY_RATE = 0.6;

/** A refiner mends a full bar of wear for this share of the armor's price. */
export const REPAIR_SHARE = 0.2;
/** It mends a damaged piece back to its rarity for this share of the price between the two. */
export const DAMAGE_REPAIR_SHARE = 0.5;

/** A shop where it stands: an atlas place, the power that owns it if any, and its own name. */
export interface Shop {
  id: string;
  kind: ShopKind;
  /** The atlas place it stands in, and the region and continent above it, whose catalogs it reads too. */
  at: string;
  region: string;
  continent: string;
  /** The power that owns it: whose stolen goods it knows, whose members a sect shop serves. */
  power: string | null;
  name: string;
  /** The tiers it may stock, within its place's vein (core/markets.ts `shopTiers`). */
  tiers: readonly number[];
}

/**
 * The Border Wilds' shops. The City's merchant guild hall is the Qian Clan's, who take a cut of
 * every core that leaves the region (E2). The vein-rich markets, the City, the Gate and the Night
 * Bridge, stock tier 3 too, rarely (core/markets.ts `tierLean`; E2's talk).
 */
const BW = { region: 'qm-bianhuang', continent: 'qiming' } as const;

export const SHOPS: readonly Shop[] = [
  {
    id: 'mouth-stall',
    kind: 'stall',
    at: 'qm-shoukou-cheng',
    ...BW,
    power: null,
    name: 'a stall under the skull walls',
    tiers: [1],
  },
  {
    id: 'mouth-alchemy',
    kind: 'alchemy',
    at: 'qm-shoukou-cheng',
    ...BW,
    power: 'xinglin',
    name: 'the Apricot Grove branch shop',
    tiers: [1, 2, 3],
  },
  {
    id: 'mouth-refiner',
    kind: 'refiner',
    at: 'qm-shoukou-cheng',
    ...BW,
    power: null,
    name: 'a refiner by the beast-part market',
    tiers: [1],
  },
  {
    id: 'mouth-guild',
    kind: 'guild',
    at: 'qm-shoukou-cheng',
    ...BW,
    power: 'qm-qian-shi',
    name: 'the merchant guild hall',
    tiers: [1, 2, 3],
  },
  {
    id: 'mouth-bounty',
    kind: 'bounty',
    at: 'qm-shoukou-cheng',
    ...BW,
    power: null,
    name: 'the bounty office',
    tiers: [1, 2, 3],
  },
  {
    id: 'mouth-mortal',
    kind: 'mortal',
    at: 'qm-shoukou-cheng',
    ...BW,
    power: null,
    name: 'a chandler on the harbor street',
    tiers: [1],
  },
  {
    id: 'bridge-black',
    kind: 'black-market',
    at: 'qm-yeqiao-hui',
    ...BW,
    power: 'qm-yeqiao-hui',
    name: 'the sea-cave market',
    tiers: [1, 2, 3],
  },
  {
    id: 'bridge-stall',
    kind: 'stall',
    at: 'qm-yeqiao-hui',
    ...BW,
    power: null,
    name: 'a tide-pool stall',
    tiers: [1],
  },
  {
    id: 'gate-sect',
    kind: 'sect',
    at: 'qm-tushou-men',
    ...BW,
    power: 'qm-tushou-men',
    name: 'the Gate’s exchange hall',
    tiers: [1, 2, 3],
  },
  {
    id: 'march-stall',
    kind: 'stall',
    at: 'qm-anbian-fu',
    ...BW,
    power: null,
    name: 'a sutler’s stall by the watchtower',
    tiers: [1],
  },
  {
    id: 'march-mortal',
    kind: 'mortal',
    at: 'qm-anbian-fu',
    ...BW,
    power: null,
    name: 'the village store',
    tiers: [1],
  },
  {
    id: 'wall-stall',
    kind: 'stall',
    at: 'qm-duigu-qiang',
    ...BW,
    power: null,
    name: 'a stall at the foot of the Wall',
    tiers: [1],
  },
  {
    id: 'eyes-stall',
    kind: 'stall',
    at: 'qm-shiyan-guo',
    ...BW,
    power: null,
    name: 'a stall on the sinkhole rim',
    tiers: [1],
  },
  {
    id: 'eyes-alchemy',
    kind: 'alchemy',
    at: 'qm-shiyan-guo',
    ...BW,
    power: null,
    name: 'a cave alchemy shop',
    tiers: [1],
  },
  {
    id: 'eyes-mortal',
    kind: 'mortal',
    at: 'qm-shiyan-guo',
    ...BW,
    power: null,
    name: 'a terrace store',
    tiers: [1],
  },
  {
    id: 'herders-stall',
    kind: 'stall',
    at: 'qm-muling-guo',
    ...BW,
    power: null,
    name: 'a stall at the corrals',
    tiers: [1],
  },
  {
    id: 'herders-guild',
    kind: 'guild',
    at: 'qm-muling-guo',
    ...BW,
    power: null,
    name: 'the herders’ trading post',
    tiers: [1],
  },
  {
    id: 'herders-mortal',
    kind: 'mortal',
    at: 'qm-muling-guo',
    ...BW,
    power: null,
    name: 'a herders’ store',
    tiers: [1],
  },
  // A5.2's seats and the sects that keep a shop (E2.1, awaiting Jan's review). River-Bend's
  // buying office is the Qians', and Ebb Harbor's east quay the Night Bridge's through fronts.
  {
    id: 'bend-stall',
    kind: 'stall',
    at: 'qm-hewan-cheng',
    ...BW,
    power: null,
    name: 'a stall in the grain market',
    tiers: [1, 2],
  },
  {
    id: 'bend-refiner',
    kind: 'refiner',
    at: 'qm-hewan-cheng',
    ...BW,
    power: null,
    name: 'a refiner by the muster yards',
    tiers: [1, 2],
  },
  {
    id: 'bend-guild',
    kind: 'guild',
    at: 'qm-hewan-cheng',
    ...BW,
    power: 'qm-qian-shi',
    name: 'the Qians’ buying office on the wharves',
    tiers: [1, 2],
  },
  {
    id: 'bend-mortal',
    kind: 'mortal',
    at: 'qm-hewan-cheng',
    ...BW,
    power: null,
    name: 'a chandler on the tax wharves',
    tiers: [1],
  },
  {
    id: 'paddocks-stall',
    kind: 'stall',
    at: 'qm-qianlan-cheng',
    ...BW,
    power: null,
    name: 'a stall in the outer paddocks',
    tiers: [1, 2],
  },
  {
    id: 'paddocks-refiner',
    kind: 'refiner',
    at: 'qm-qianlan-cheng',
    ...BW,
    power: null,
    name: 'a barding-maker by the riding court',
    tiers: [1, 2],
  },
  {
    id: 'paddocks-guild',
    kind: 'guild',
    at: 'qm-qianlan-cheng',
    ...BW,
    power: null,
    name: 'a herd-broker’s hall',
    tiers: [1, 2],
  },
  {
    id: 'paddocks-mortal',
    kind: 'mortal',
    at: 'qm-qianlan-cheng',
    ...BW,
    power: null,
    name: 'a felt-and-tack store',
    tiers: [1],
  },
  {
    id: 'eye-stall',
    kind: 'stall',
    at: 'qm-tianyan',
    ...BW,
    power: null,
    name: 'a stall on the middle terraces',
    tiers: [1, 2],
  },
  {
    id: 'eye-alchemy',
    kind: 'alchemy',
    at: 'qm-tianyan',
    ...BW,
    power: null,
    name: 'an alchemy shop under the council stairs',
    tiers: [1, 2],
  },
  {
    id: 'eye-mortal',
    kind: 'mortal',
    at: 'qm-tianyan',
    ...BW,
    power: null,
    name: 'a rope-walk store',
    tiers: [1],
  },
  {
    id: 'ebb-stall',
    kind: 'stall',
    at: 'qm-tuichao-gang',
    ...BW,
    power: null,
    name: 'a stall on the west quay',
    tiers: [1, 2],
  },
  {
    id: 'ebb-guild',
    kind: 'guild',
    at: 'qm-tuichao-gang',
    ...BW,
    power: null,
    name: 'a shipping house on the breakwater',
    tiers: [1, 2],
  },
  {
    id: 'ebb-black',
    kind: 'black-market',
    at: 'qm-tuichao-gang',
    ...BW,
    power: 'qm-yeqiao-hui',
    name: 'a warehouse on the east quay',
    tiers: [1, 2],
  },
  {
    id: 'ebb-mortal',
    kind: 'mortal',
    at: 'qm-tuichao-gang',
    ...BW,
    power: null,
    name: 'a net loft',
    tiers: [1],
  },
  {
    id: 'nameless-stall',
    kind: 'stall',
    at: 'qm-wuming-ji',
    ...BW,
    power: null,
    name: 'a stall under the pillars',
    tiers: [1, 2],
  },
  {
    id: 'nameless-refiner',
    kind: 'refiner',
    at: 'qm-wuming-ji',
    ...BW,
    power: null,
    name: 'a refiner in a rented cave',
    tiers: [1, 2],
  },
  {
    id: 'nameless-black',
    kind: 'black-market',
    at: 'qm-wuming-ji',
    ...BW,
    power: null,
    name: 'Uncle Ash’s stalls',
    tiers: [1, 2, 3],
  },
  {
    id: 'reins-sect',
    kind: 'sect',
    at: 'qm-baijiang-zong',
    ...BW,
    power: 'qm-baijiang-zong',
    name: 'the Hundred Reins’ stable hall',
    tiers: [1, 2, 3],
  },
  {
    id: 'bones-sect',
    kind: 'sect',
    at: 'qm-fugu-ge',
    ...BW,
    power: 'qm-fugu-ge',
    name: 'the Pavilion’s plate hall',
    tiers: [1, 2, 3],
  },
  {
    id: 'lamps-sect',
    kind: 'sect',
    at: 'qm-shoudeng-zong',
    ...BW,
    power: 'qm-shoudeng-zong',
    name: 'the Lamp-Keepers’ stilt hall',
    tiers: [1, 2],
  },
];

const byId = new Map(SHOPS.map((s) => [s.id, s]));

export function shop(id: string): Shop {
  const s = byId.get(id);
  if (!s) throw new RangeError(`Unknown shop ${id}`);
  return s;
}
