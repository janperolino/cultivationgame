// Shops (design § World bible, Stones, silver and shops in play; § Items and gear, Loot and
// shops): the kinds of shop, what each stocks and buys, its bias on the shared rarity table, its
// purse, and the Border Wilds' shops where they stand. A shop's stock comes from the catalogs of
// its place, its region, its continent and the imports along their ties (content/catalogs/),
// weighted by the layer weights below. Stock and money are kept per shop, so M6's markets by reach
// and standing orders grow from these. P3.6 stands them in its towns. Every number is a starting
// value; M6 tunes them.
import type { Population } from './atlas/schema.ts';
import type { Layer } from './catalogs/types.ts';
import type { ItemKind } from './items.ts';
import { REGIONS, veinAt } from './map/index.ts';

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
}

/**
 * The Border Wilds' written shops: the ones with a keeper or a power of their own; each market's
 * people open the rest (`SHOPS_BY_PEOPLE`). The City's merchant guild hall is the Qian Clan's, who
 * take a cut of every core that leaves the region (E2). Where a Core Formation cultivator lives on
 * a tier 3 vein or better, the shops stock tier 3 too, rarely (core/markets.ts `shopTiers`,
 * `tierLean`; E2's talk).
 */
const BW = { region: 'qm-bianhuang', continent: 'qiming' } as const;

const WRITTEN: readonly Shop[] = [
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
    kind: 'guild',
    at: 'qm-shoukou-cheng',
    ...BW,
    power: 'qm-qian-shi',
    name: 'the merchant guild hall',
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
    kind: 'guild',
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
    kind: 'guild',
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
    kind: 'guild',
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
    kind: 'guild',
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

// ── Shops by people ───────────────────────────────────────────────────────────────────────────

/** A rule for how many shops of a kind a market keeps: one each `per` of its people, from `from`. */
export interface ShopsByPeople {
  of: 'cultivators' | 'mortals';
  per: number;
  from: number;
  max: number;
}

/**
 * How many shops of each kind a market keeps by who lives there (E2.2, Jan's call: a place with a
 * lot of people has a lot of shops): one for each `per` of its cultivators (a mortal shop, of its
 * mortals), rounded and never under one, from `from` of them up, at most `max`. Its written shops
 * count toward these and the rest open under the names below, so the City of 8 million keeps five
 * stalls where a village of a hundred cultivators keeps one. A sect's hall and a black market are
 * written only: who keeps one is a power's business, not a crowd's.
 */
export const SHOPS_BY_PEOPLE: Partial<Record<ShopKind, ShopsByPeople>> = {
  stall: { of: 'cultivators', per: 1000, from: 100, max: 5 },
  alchemy: { of: 'cultivators', per: 2500, from: 500, max: 3 },
  refiner: { of: 'cultivators', per: 2500, from: 500, max: 3 },
  guild: { of: 'cultivators', per: 5000, from: 1000, max: 2 },
  bounty: { of: 'cultivators', per: 10_000, from: 1000, max: 1 },
  mortal: { of: 'mortals', per: 2_000_000, from: 100_000, max: 3 },
};

/** The names a market's shops by people open under, taken in turn from a place in the list. */
export const SHOP_NAMES: Partial<Record<ShopKind, readonly string[]>> = {
  stall: [
    'a pill stall in the morning market',
    'a talisman stall by the gate',
    'a herb stall in the side lanes',
    'a stall in the covered arcade',
    'a stall at the crossroads',
    'a stall at the temple fair',
    'a stall on the lantern street',
    'a stall by the caravan yard',
  ],
  alchemy: [
    'an alchemy shop under a green banner',
    'a family alchemy shop off the main street',
    'an alchemy shop by the herb market',
    'a furnace house behind the temple',
  ],
  refiner: [
    'a refiner by the quench pools',
    'a refiner of secondhand gear',
    'a refiner in the back lanes',
    'a refiner who works to order',
  ],
  guild: ['a merchant guild branch', 'a trading house by the warehouses'],
  bounty: ['the bounty office'],
  mortal: [
    'a rice merchant',
    'a salt-and-oil shop',
    'a dry-goods store',
    'a cloth-and-sundries store',
    'a grain store by the gate',
  ],
};

/** A market's head count of one sort: its mortals, or its cultivators of every realm. */
export function headcount(pop: Population, of: ShopsByPeople['of']): number {
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

/** How many shops of a kind a market of these people keeps (`SHOPS_BY_PEOPLE`). */
export function shopsWanted(pop: Population, kind: ShopKind): number {
  const rule = SHOPS_BY_PEOPLE[kind];
  if (!rule) return 0;
  const n = headcount(pop, rule.of);
  if (n < rule.from) return 0;
  return Math.min(rule.max, Math.max(1, Math.round(n / rule.per)));
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

/** The shops a seat's people open beyond its written ones: `pacified-fort.stall-2`, and so on. */
function grown(seat: Seat): Shop[] {
  if (!seat.grows) return [];
  const out: Shop[] = [];
  const used = new Set(seat.written.map((id) => writtenById.get(id)?.name));
  for (const kind of SHOP_KINDS) {
    const have = seat.written.filter((id) => writtenById.get(id)?.kind === kind).length;
    const names = SHOP_NAMES[kind] ?? [];
    const start = spot(seat.id, Math.max(1, names.length));
    let j = 0;
    const next = () => names[(start + j++) % names.length]!;
    for (let k = have + 1; k <= shopsWanted(seat.people, kind); k++) {
      let name = next();
      for (let tries = 1; used.has(name) && tries < names.length; tries++) name = next();
      used.add(name);
      out.push({
        id: `${seat.id}.${kind}-${k}`,
        kind,
        at: seat.at,
        region: seat.region,
        continent: seat.continent,
        power: null,
        name,
      });
    }
  }
  return out;
}

const SEATS = seats();
const shopsAtSeat = new Map<string, string[]>();
const marketOf = new Map<string, string>();
const all: Shop[] = [...WRITTEN];
for (const seat of SEATS) {
  const more = grown(seat);
  all.push(...more);
  // Grouped by kind, the written one first: the City's five stalls stand together.
  const rank = (id: string) =>
    SHOP_KINDS.indexOf((writtenById.get(id) ?? more.find((x) => x.id === id))!.kind);
  const ids = [...seat.written, ...more.map((s) => s.id)].sort((x, y) => rank(x) - rank(y));
  shopsAtSeat.set(seat.id, ids);
  for (const id of ids) marketOf.set(id, seat.id);
}

/** Every shop: the written ones, then those each market's people open (`SHOPS_BY_PEOPLE`). */
export const SHOPS: readonly Shop[] = all;

/** The shops that stand at a written town or an atlas place, by kind, the written ones first. */
export function shopsAt(id: string): readonly string[] {
  return shopsAtSeat.get(id) ?? [];
}

/** The written town or atlas place a shop stands at. */
export function shopSeat(shopId: string): string | undefined {
  return marketOf.get(shopId);
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

export function shop(id: string): Shop {
  const s = byId.get(id);
  if (!s) throw new RangeError(`Unknown shop ${id}`);
  return s;
}
