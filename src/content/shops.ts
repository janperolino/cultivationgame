// Shops (design § World bible, Stones, silver and shops in play; § Items and gear, Loot and
// shops): the kinds of shop, what each stocks and buys, its bias on the shared rarity table, its
// purse, the Border Wilds' written shops, and since E5 the districts a market keeps them in (city →
// district → shop: the stock lives in the market and a shop is a window onto it). A shop's display
// lots come from the catalogs of its place, its region, its continent and the imports along their
// ties (content/catalogs/), weighted by the layer weights below. Every number is a starting value.
import type { CraftId } from './crafts.ts';
import type { Population } from './atlas/schema.ts';
import type { Layer } from './catalogs/types.ts';
import type { ItemKind } from './items.ts';
import { REGIONS, veinAt } from './map/index.ts';

export const SHOP_KINDS = [
  'stall',
  'alchemy',
  'refiner',
  'talisman',
  'parts',
  'sect',
  'house',
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
   * The least it can pay out a month at an ordinary place, in its own money, times prosperity's
   * purse; above that its purse is its share of its market's money (core/markets.ts `shopPurse`).
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
  /**
   * The highest tier it stocks wherever it stands (E2.2): a stall's wares stop at Foundation's,
   * and a mortal shop deals in mortal goods.
   */
  top?: number;
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
    top: 2,
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
    buys: ['gear', 'treasure', 'material', 'tool'],
    buyRate: 0.4,
    purse: 1500,
    money: 'stones',
    markup: 1,
    layers: BY_PLACE,
    recognizes: true,
    repairs: true,
  },
  talisman: {
    name: 'talisman shop',
    hanzi: '符铺',
    bias: 1,
    lots: 6,
    buys: ['talisman', 'material'],
    buyRate: 0.4,
    purse: 150,
    money: 'stones',
    markup: 1,
    layers: BY_PLACE,
    recognizes: true,
  },
  parts: {
    name: 'part dealer',
    hanzi: '兽材行',
    bias: 1,
    lots: 6,
    buys: ['beast-part', 'material'],
    buyRate: 0.4,
    purse: 1500,
    money: 'stones',
    markup: 1,
    layers: BY_PLACE,
    recognizes: true,
  },
  sect: {
    name: 'sect shop',
    hanzi: '宗门坊',
    bias: 1,
    lots: 12,
    buys: [
      'pill',
      'talisman',
      'herb',
      'beast-part',
      'material',
      'gear',
      'treasure',
      'tool',
      'copy',
    ],
    buyRate: 0.4,
    purse: 5000,
    money: 'stones',
    markup: 1,
    layers: BY_PLACE,
    recognizes: true,
    members: true,
  },
  // A big general firm (E5: the guild kind, renamed; a door named for its owner or its family).
  house: {
    name: 'trading house',
    hanzi: '商行',
    bias: 1,
    lots: 8,
    buys: [
      'pill',
      'talisman',
      'herb',
      'beast-part',
      'material',
      'gear',
      'treasure',
      'tool',
      'copy',
    ],
    buyRate: 0.4,
    purse: 8000,
    money: 'stones',
    markup: 1,
    // A trading house carries goods from region to region, so its imports count double.
    layers: { place: 40, region: 25, continent: 15, import: 20 },
    recognizes: true,
  },
  'black-market': {
    name: 'black market',
    hanzi: '黑市',
    bias: 1.3,
    lots: 10,
    buys: [
      'pill',
      'talisman',
      'herb',
      'beast-part',
      'material',
      'gear',
      'treasure',
      'tool',
      'copy',
    ],
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
    // It buys the mortal staples, in taels (E3): salt, millet, wool and lamp oil.
    buys: ['material'],
    buyRate: 0.4,
    // A hundred taels a month, five farm families' living for a year: enough to take a hauler's
    // Bag of mortal staples (E3; it was 30).
    purse: 100,
    money: 'silver',
    top: 1,
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

/**
 * What an honest shop pays for your own make (the crafts play checkpoint, Jan's call): a maker's
 * work is bought at this share of the market, and the need rate still above it where it runs short.
 */
export const MAKER_BUY_RATE = 0.6;

/** The street a craft's tools sell on, where a market has it, else the free market. */
export const TOOL_STREET: Partial<Record<CraftId, ShopKind>> = {
  alchemy: 'alchemy',
  refining: 'refiner',
  talismans: 'talisman',
  formations: 'talisman',
};

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
  /**
   * The door it stands behind (E5): its district, `<market>/<kind>`, or itself for a door of one
   * (a trading house, the bounty office, a black market, a sect's hall).
   */
  door: string;
  /** Its weight in its district's stock and purse: a shop 1, a notable shop 3, the small shops their count. */
  weight: number;
  /** The small shops: one counter for the rest of a district. */
  small?: boolean;
  /** The keeper a shop is named for (Old Liu), if any. */
  keeper?: string;
}

/** A shop as written: where it stands, its owner and its name; its door and weight are worked out. */
type WrittenShop = Omit<Shop, 'door' | 'weight' | 'small' | 'keeper'>;

/**
 * The Border Wilds' written shops: the ones with a keeper or a power of their own; each market's
 * people open the rest (`STREETS`, `FIRMS`). The City's trading hall is the Qian Clan's, who
 * take a cut of every core that leaves the region (E2). Where a Core Formation cultivator lives on
 * a tier 3 vein or better, the shops stock tier 3 too, rarely (core/markets.ts `shopTiers`,
 * `tierLean`; E2's talk).
 */
const BW = { region: 'qm-bianhuang', continent: 'qiming' } as const;

const WRITTEN: readonly WrittenShop[] = [
  {
    id: 'mouth-stall',
    kind: 'stall',
    at: 'qm-shoukou-cheng',
    ...BW,
    power: null,
    name: 'a stall under the skull walls',
  },
  {
    id: 'mouth-alchemy',
    kind: 'alchemy',
    at: 'qm-shoukou-cheng',
    ...BW,
    power: 'xinglin',
    name: 'the Apricot Grove branch shop',
  },
  {
    id: 'mouth-refiner',
    kind: 'refiner',
    at: 'qm-shoukou-cheng',
    ...BW,
    power: null,
    name: 'a refiner by the beast-part market',
  },
  {
    id: 'mouth-guild',
    kind: 'house',
    at: 'qm-shoukou-cheng',
    ...BW,
    power: 'qm-qian-shi',
    name: 'the Qian Clan’s trading hall',
  },
  {
    id: 'mouth-bounty',
    kind: 'bounty',
    at: 'qm-shoukou-cheng',
    ...BW,
    power: null,
    name: 'the bounty office',
  },
  {
    id: 'mouth-mortal',
    kind: 'mortal',
    at: 'qm-shoukou-cheng',
    ...BW,
    power: null,
    name: 'a chandler on the harbor street',
  },
  {
    id: 'bridge-black',
    kind: 'black-market',
    at: 'qm-yeqiao-hui',
    ...BW,
    power: 'qm-yeqiao-hui',
    name: 'the sea-cave market',
  },
  {
    id: 'bridge-stall',
    kind: 'stall',
    at: 'qm-yeqiao-hui',
    ...BW,
    power: null,
    name: 'a tide-pool stall',
  },
  {
    id: 'gate-sect',
    kind: 'sect',
    at: 'qm-tushou-men',
    ...BW,
    power: 'qm-tushou-men',
    name: 'the Gate’s exchange hall',
  },
  {
    id: 'march-stall',
    kind: 'stall',
    at: 'qm-anbian-fu',
    ...BW,
    power: null,
    name: 'a sutler’s stall by the watchtower',
  },
  {
    id: 'wall-sutler',
    kind: 'stall',
    at: 'qm-duigu-qiang',
    ...BW,
    power: null,
    name: 'the sutler’s stall under the skull gate',
  },
  {
    id: 'march-mortal',
    kind: 'mortal',
    at: 'qm-anbian-fu',
    ...BW,
    power: null,
    name: 'the village store',
  },
  {
    id: 'wall-stall',
    kind: 'stall',
    at: 'qm-duigu-qiang',
    ...BW,
    power: null,
    name: 'a stall at the foot of the Wall',
  },
  {
    id: 'eyes-stall',
    kind: 'stall',
    at: 'qm-shiyan-guo',
    ...BW,
    power: null,
    name: 'a stall on the sinkhole rim',
  },
  {
    id: 'eyes-alchemy',
    kind: 'alchemy',
    at: 'qm-shiyan-guo',
    ...BW,
    power: null,
    name: 'a cave alchemy shop',
  },
  {
    id: 'eyes-mortal',
    kind: 'mortal',
    at: 'qm-shiyan-guo',
    ...BW,
    power: null,
    name: 'a terrace store',
  },
  {
    id: 'herders-stall',
    kind: 'stall',
    at: 'qm-muling-guo',
    ...BW,
    power: null,
    name: 'a stall at the corrals',
  },
  {
    id: 'herders-guild',
    kind: 'house',
    at: 'qm-muling-guo',
    ...BW,
    power: null,
    name: 'the herders’ trading post',
  },
  {
    id: 'herders-mortal',
    kind: 'mortal',
    at: 'qm-muling-guo',
    ...BW,
    power: null,
    name: 'a herders’ store',
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
  },
  {
    id: 'bend-refiner',
    kind: 'refiner',
    at: 'qm-hewan-cheng',
    ...BW,
    power: null,
    name: 'a refiner by the muster yards',
  },
  {
    id: 'bend-guild',
    kind: 'house',
    at: 'qm-hewan-cheng',
    ...BW,
    power: 'qm-qian-shi',
    name: 'the Qians’ buying office on the wharves',
  },
  {
    id: 'bend-mortal',
    kind: 'mortal',
    at: 'qm-hewan-cheng',
    ...BW,
    power: null,
    name: 'a chandler on the tax wharves',
  },
  {
    id: 'paddocks-stall',
    kind: 'stall',
    at: 'qm-qianlan-cheng',
    ...BW,
    power: null,
    name: 'a stall in the outer paddocks',
  },
  {
    id: 'paddocks-refiner',
    kind: 'refiner',
    at: 'qm-qianlan-cheng',
    ...BW,
    power: null,
    name: 'a barding-maker by the riding court',
  },
  {
    id: 'paddocks-guild',
    kind: 'house',
    at: 'qm-qianlan-cheng',
    ...BW,
    power: null,
    name: 'a herd-broker’s hall',
  },
  {
    id: 'paddocks-mortal',
    kind: 'mortal',
    at: 'qm-qianlan-cheng',
    ...BW,
    power: null,
    name: 'a felt-and-tack store',
  },
  {
    id: 'eye-stall',
    kind: 'stall',
    at: 'qm-tianyan',
    ...BW,
    power: null,
    name: 'a stall on the middle terraces',
  },
  {
    id: 'eye-alchemy',
    kind: 'alchemy',
    at: 'qm-tianyan',
    ...BW,
    power: null,
    name: 'an alchemy shop under the council stairs',
  },
  {
    id: 'eye-mortal',
    kind: 'mortal',
    at: 'qm-tianyan',
    ...BW,
    power: null,
    name: 'a rope-walk store',
  },
  {
    id: 'ebb-stall',
    kind: 'stall',
    at: 'qm-tuichao-gang',
    ...BW,
    power: null,
    name: 'a stall on the west quay',
  },
  {
    id: 'ebb-guild',
    kind: 'house',
    at: 'qm-tuichao-gang',
    ...BW,
    power: null,
    name: 'a shipping house on the breakwater',
  },
  {
    id: 'ebb-black',
    kind: 'black-market',
    at: 'qm-tuichao-gang',
    ...BW,
    power: 'qm-yeqiao-hui',
    name: 'a warehouse on the east quay',
  },
  {
    id: 'ebb-mortal',
    kind: 'mortal',
    at: 'qm-tuichao-gang',
    ...BW,
    power: null,
    name: 'a net loft',
  },
  {
    id: 'nameless-stall',
    kind: 'stall',
    at: 'qm-wuming-ji',
    ...BW,
    power: null,
    name: 'a stall under the pillars',
  },
  {
    id: 'nameless-refiner',
    kind: 'refiner',
    at: 'qm-wuming-ji',
    ...BW,
    power: null,
    name: 'a refiner in a rented cave',
  },
  {
    id: 'nameless-black',
    kind: 'black-market',
    at: 'qm-wuming-ji',
    ...BW,
    power: null,
    name: 'Uncle Ash’s stalls',
  },
  {
    id: 'reins-sect',
    kind: 'sect',
    at: 'qm-baijiang-zong',
    ...BW,
    power: 'qm-baijiang-zong',
    name: 'the Hundred Reins’ stable hall',
  },
  {
    id: 'bones-sect',
    kind: 'sect',
    at: 'qm-fugu-ge',
    ...BW,
    power: 'qm-fugu-ge',
    name: 'the Pavilion’s plate hall',
  },
  {
    id: 'lamps-sect',
    kind: 'sect',
    at: 'qm-shoudeng-zong',
    ...BW,
    power: 'qm-shoudeng-zong',
    name: 'the Lamp-Keepers’ stilt hall',
  },
];

// ── Districts and shops ───────────────────────────────────────────────────────────────────────

/**
 * A district (E5, design § Economy, Districts and shops): a street of a market named by what it
 * sells, with as many shops as its people keep, three of them notable and the rest one counter.
 */
export interface Street {
  name: string;
  hanzi: string;
  /** What it sells: Bag kinds (and `copy`), and tags that claim a thing whatever its kind. */
  wares: readonly Ware[];
  tags: readonly string[];
  /** It opens from this many of its people: cultivators, or mortals for the grain and cloth market. */
  of: 'cultivators' | 'mortals';
  from: number;
  /** One shop each so many of them: how many it really has, for a scene to seed. */
  per: number;
  /** Its notable shops' names: `{K}` the keeper (Old Liu), `{S}` the keeper's surname. */
  names: readonly string[];
  /** What its keepers are called before their surname. */
  titles: readonly string[];
  /** What its door says it sells. */
  sells: string;
}

/**
 * The districts a market keeps, by its people (E5). A ware with no district of its own at a market
 * falls to the free market, so Pacified Fort's talismans sell on stalls and the City's in Talisman
 * Lane. A power's seat keeps only its written shops.
 */
export const STREETS: Partial<Record<ShopKind, Street>> = {
  stall: {
    name: 'the free market',
    hanzi: '散市',
    wares: ['copy', 'mount'],
    tags: ['grain'],
    of: 'cultivators',
    from: 100,
    per: 25,
    names: ['{K}’s mat', '{K}’s stall', 'the {S} brothers’ stall'],
    titles: ['Old', 'Granny', 'Third Brother', 'Auntie', 'Young'],
    sells: 'copies and odd lots',
  },
  alchemy: {
    name: 'Pill Street',
    hanzi: '丹街',
    wares: ['pill', 'herb', 'material'],
    tags: [],
    of: 'cultivators',
    from: 500,
    per: 200,
    names: ['{K}’s furnace house', 'the {S} family pill shop', '{K}’s herb hall'],
    titles: ['Old', 'Widow', 'Elder Brother', 'Auntie'],
    sells: 'pills and herbs',
  },
  refiner: {
    name: 'Refiners’ Row',
    hanzi: '器街',
    wares: ['gear', 'treasure'],
    tags: ['ore'],
    of: 'cultivators',
    from: 500,
    per: 200,
    names: ['{K}’s refinery', 'the {S} artifact hall', '{K}’s quench house'],
    titles: ['Master'],
    sells: 'gear and mending',
  },
  talisman: {
    name: 'Talisman Lane',
    hanzi: '符巷',
    wares: ['talisman'],
    tags: ['ink'],
    of: 'cultivators',
    from: 2500,
    per: 400,
    names: ['{K}’s talisman shop', 'the {S} ink house'],
    titles: ['Old', 'Master', 'Widow'],
    sells: 'talismans and ink',
  },
  parts: {
    name: 'the beast-part market',
    hanzi: '兽市',
    wares: ['beast-part'],
    tags: ['hide', 'horn'],
    of: 'cultivators',
    from: 2500,
    per: 400,
    names: ['the {S} bone-and-hide house', '{K}’s hide stall'],
    titles: ['Old', 'Big', 'Butcher'],
    sells: 'beast parts and hides',
  },
  mortal: {
    name: 'the grain and cloth market',
    hanzi: '粮布市',
    wares: [],
    tags: [],
    of: 'mortals',
    from: 100_000,
    per: 50_000,
    names: ['the {S} grain store', '{K}’s salt-and-oil shop', 'the {S} cloth shop'],
    titles: ['Old', 'Widow', 'Auntie'],
    sells: 'mortal goods, in silver',
  },
};

/**
 * Which district claims a thing first: a mortal good the grain and cloth market, then a tag
 * (ink, ore, hide or horn, grain), then its kind. Anything no district claims is the free market's.
 */
export const STREET_ORDER: readonly ShopKind[] = [
  'mortal',
  'talisman',
  'refiner',
  'parts',
  'stall',
  'alchemy',
];

/**
 * A firm is a door of its own: a trading house each 5,000 cultivators from 1,000 (two at most), the
 * bounty office from 1,000.
 */
const FIRMS: Partial<Record<ShopKind, { per: number; from: number; max: number }>> = {
  house: { per: 5000, from: 1000, max: 2 },
  bounty: { per: Infinity, from: 1000, max: 1 },
};

/**
 * Each door's share of its market's stone money (E5): what passes through its shops, a missing
 * district's going to the free market, and all of it shared out among the doors there. A sect's
 * hall stands alone at its seat, and the grain and cloth market has the mortals' money to itself.
 */
export const DOOR_SHARE: Record<ShopKind, number> = {
  stall: 0.05,
  alchemy: 0.2,
  refiner: 0.15,
  talisman: 0.05,
  parts: 0.05,
  house: 0.2,
  bounty: 0.3,
  'black-market': 0.3,
  sect: 1,
  mortal: 1,
};

/** A district lists at most three notable shops, each weighing three of the small ones. */
const NOTABLE = { most: 3, weight: 3 } as const;

/** The surnames keepers are named by: none a power's (no Qian). */
const KEEPER_SURNAMES = [
  'Liu',
  'Hu',
  'Zhou',
  'Gu',
  'Wen',
  'Fang',
  'Lin',
  'Xu',
  'Song',
  'Pan',
  'Yan',
  'Cao',
  'Dong',
  'Jiang',
  'Luo',
  'Meng',
  'Tang',
  'Xie',
  'Yao',
  'Bai',
  'Ma',
  'Guo',
  'Du',
  'Gao',
] as const;

/** A market's head count of one sort: its mortals, or its cultivators of every realm. */
export function headcount(pop: Population, of: Street['of']): number {
  if (of === 'mortals') return pop.mortals ?? 0;
  return (
    (pop.qi ?? 0) +
    (pop.foundation ?? 0) +
    (pop.core ?? 0) +
    (pop.nascent ?? 0) +
    (pop.deity ?? 0) +
    (pop.void ?? 0)
  );
}

/** How many shops a district of these people really has, from its threshold up; none below it. */
export function streetCount(pop: Population, kind: ShopKind): number {
  const st = STREETS[kind];
  if (!st) return 0;
  const n = headcount(pop, st.of);
  if (n < st.from) return 0;
  return Math.max(1, Math.round(n / st.per));
}

/** How many of a firm a market of these people keeps. */
function firmCount(pop: Population, kind: ShopKind): number {
  const f = FIRMS[kind];
  if (!f) return 0;
  const n = headcount(pop, 'cultivators');
  if (n < f.from) return 0;
  return Math.min(f.max, Math.max(1, Math.round(n / f.per)));
}

/** A place that keeps a market: a written town, or an atlas city or seat with shops of its own. */
interface Seat {
  id: string;
  /** The atlas place whose catalogs its shops read. */
  at: string;
  region: string;
  continent: string;
  people: Population;
  written: readonly string[];
  /** Whether its people open shops beyond the written ones: a power's seat keeps only its own. */
  grows: boolean;
}

const writtenById = new Map(WRITTEN.map((s) => [s.id, s]));

function seats(): Seat[] {
  const out: Seat[] = [];
  for (const r of Object.values(REGIONS)) {
    const where = { region: r.content.region, continent: r.content.continent };
    for (const t of r.content.towns) {
      const first = t.shops[0] ? writtenById.get(t.shops[0]) : undefined;
      out.push({
        id: t.id,
        at: first?.at ?? t.parent ?? r.content.region,
        ...where,
        people: t.population,
        written: t.shops,
        grows: true,
      });
    }
    for (const p of r.file.places) {
      const written = r.content.placeShops[p.id] ?? [];
      const city = p.kind === 'city';
      if (p.x === null || p.y === null || (!city && written.length === 0)) continue;
      out.push({
        id: p.id,
        at: p.id,
        ...where,
        people: p.population ?? {},
        written,
        grows: city,
      });
    }
  }
  return out;
}

/** A string's spot in a list of names, the same in every world. */
function spot(text: string, n: number): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % n;
}

/** A door in a market: a district and its shops, or a firm, a hall or the office alone. */
export interface Door {
  id: string;
  kind: ShopKind;
  name: string;
  /** Its shops, the notable ones first and the small shops last. */
  shops: readonly string[];
  /** How many shops it really has. */
  count: number;
}

/** A notable shop's name and keeper, seeded by its id, with a surname nobody else here has. */
function named(id: string, kind: ShopKind, used: Set<string>): { name: string; keeper: string } {
  const st = STREETS[kind];
  let i = spot(id, KEEPER_SURNAMES.length);
  for (let tries = 0; used.has(KEEPER_SURNAMES[i]!) && tries < KEEPER_SURNAMES.length; tries++)
    i = (i + 1) % KEEPER_SURNAMES.length;
  const surname = KEEPER_SURNAMES[i]!;
  used.add(surname);
  if (!st) return { name: `the ${surname} trading house`, keeper: `Master ${surname}` };
  const keeper = `${st.titles[spot(`${id}/title`, st.titles.length)]!} ${surname}`;
  const form = st.names[spot(`${id}/name`, st.names.length)]!;
  return { name: form.replace('{K}', keeper).replace('{S}', surname), keeper };
}

/** A seat's doors and every shop behind them: the written ones, then those its people keep. */
function open(seat: Seat): { doors: Door[]; shops: Shop[] } {
  const doors: Door[] = [];
  const shops: Shop[] = [];
  const where = { at: seat.at, region: seat.region, continent: seat.continent };
  const used = new Set<string>();
  const written = (kind: ShopKind) =>
    seat.written.map((id) => writtenById.get(id)!).filter((w) => w.kind === kind);
  for (const kind of SHOP_KINDS) {
    const mine = written(kind);
    const st = STREETS[kind];
    if (st) {
      const count = Math.max(mine.length, seat.grows ? streetCount(seat.people, kind) : 0);
      if (count === 0) continue;
      const door = `${seat.id}/${kind}`;
      const listed: Shop[] = mine.map((w) => ({ ...w, door, weight: NOTABLE.weight }));
      for (let k = listed.length + 1; k <= Math.min(NOTABLE.most, count); k++) {
        const id = `${seat.id}.${kind}-${k}`;
        listed.push({
          id,
          kind,
          ...where,
          power: null,
          door,
          weight: NOTABLE.weight,
          ...named(id, kind, used),
        });
      }
      // Three or fewer it lists whole, each a shop of one.
      if (count <= listed.length) for (const x of listed) x.weight = 1;
      else
        listed.push({
          id: `${seat.id}.${kind}-small`,
          kind,
          ...where,
          power: null,
          name: `the small shops of ${st.name}`,
          door,
          weight: count - listed.length,
          small: true,
        });
      shops.push(...listed);
      doors.push({ id: door, kind, name: st.name, shops: listed.map((x) => x.id), count });
      continue;
    }
    const firms: Shop[] = mine.map((w) => ({ ...w, door: w.id, weight: 1 }));
    const want = seat.grows ? firmCount(seat.people, kind) : 0;
    for (let k = firms.length + 1; k <= want; k++) {
      const id = `${seat.id}.${kind}-${k}`;
      const name = kind === 'bounty' ? { name: 'the bounty office' } : named(id, kind, used);
      firms.push({ id, kind, ...where, power: null, door: id, weight: 1, ...name });
    }
    for (const f of firms) {
      shops.push(f);
      doors.push({ id: f.id, kind, name: f.name, shops: [f.id], count: 1 });
    }
  }
  return { doors, shops };
}

const SEATS = seats();
const shopsAtSeat = new Map<string, string[]>();
const doorsAtSeat = new Map<string, Door[]>();
const marketOf = new Map<string, string>();
const all: Shop[] = [];
for (const seat of SEATS) {
  const { doors, shops } = open(seat);
  all.push(...shops);
  doorsAtSeat.set(seat.id, doors);
  shopsAtSeat.set(
    seat.id,
    shops.map((s) => s.id),
  );
  for (const s of shops) marketOf.set(s.id, seat.id);
}

/** Every shop: the written ones and those each market's people keep, by door. */
export const SHOPS: readonly Shop[] = all;

/** The shops that stand at a written town or an atlas place, by door. */
export function shopsAt(id: string): readonly string[] {
  return shopsAtSeat.get(id) ?? [];
}

/** The doors of a written town's or an atlas place's market: its districts and firms (E5). */
export function doorsAt(id: string): readonly Door[] {
  return doorsAtSeat.get(id) ?? [];
}

/** The door a shop stands behind. */
export function doorOf(shopId: string): Door | undefined {
  const seat = marketOf.get(shopId);
  return seat ? doorsAt(seat).find((d) => d.shops.includes(shopId)) : undefined;
}

/** The vein a shop's place sits on: the written town it stands in, else its atlas place. */
export function shopVein(sh: { id: string; at: string }): number {
  return veinAt(marketOf.get(sh.id) ?? sh.at);
}

/** Who lives where a shop stands. */
export function shopPeople(sh: { id: string; at: string }): Population {
  const seat = SEATS.find((x) => x.id === (marketOf.get(sh.id) ?? sh.at));
  return seat?.people ?? {};
}

const byId = new Map(SHOPS.map((s) => [s.id, s]));

/**
 * What the world calls a shop's keeper (E5): the keeper a shop is named for (Old Liu), else its
 * kind's ("the alchemy shop's keeper"), or a shopkeeper on the street for the small shops.
 */
export function keeperName(sh: Shop): string {
  if (sh.keeper) return sh.keeper;
  if (sh.small) return `a shopkeeper on ${STREETS[sh.kind]?.name ?? 'the street'}`;
  return `the ${SHOP_KIND_INFO[sh.kind].name}'s keeper`;
}

export function hasShop(id: string): boolean {
  return byId.has(id);
}

export function shop(id: string): Shop {
  const s = byId.get(id);
  if (!s) throw new RangeError(`Unknown shop ${id}`);
  return s;
}
