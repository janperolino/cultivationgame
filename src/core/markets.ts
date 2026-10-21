// Markets (design § Economy, Prosperity, What a market holds, Supply and prices, Markets by reach):
// a place's shops together, how well-off the place is, the supply it keeps of each good and the
// price that follows it, and the markets round it that lend their goods. A market is a written town
// with shops or an atlas place that keeps its own (content/map/). Prosperity and supply move by
// what happens and ease back with time, and the world keeps only what differs from the written.
import { GUARDED } from '../content/organizations.ts';
import { DAYS_PER_MONTH } from '../content/calendar.ts';
import { CATALOGS } from '../content/catalogs/index.ts';
import { RARE } from '../content/catalogs/rare.ts';
import type { Lot } from '../content/catalogs/types.ts';
import { copyChapter, copyForm, copyOf, hasCopy } from '../content/copies.ts';
import { hasMethod, method } from '../content/methods.ts';
import { hasManual, manual } from '../content/manuals.ts';
import { recipeFor, recipeYield } from '../content/crafts.ts';
import {
  baseOf,
  hasItem,
  item,
  itemKind,
  variantId,
  type Item,
  type ItemKind,
} from '../content/items.ts';
import type { Population } from '../content/atlas/schema.ts';
import { peopleAt, REGIONS } from '../content/map/index.ts';
import {
  COVETED_MADE_SUPPLY,
  DEPTH,
  OPENING_CHAPTERS,
  PROSPERITY,
  PROSPERITY_EASE_DAYS,
  MORTAL_SPEND_TAELS,
  PURSE_SHARE,
  REST_STEP,
  REACH_LI,
  ROAD,
  SIZE,
  SOURCE_SUPPLY,
  SUPPLY_EASE,
  SUPPLY_MAX,
  SUPPLY_MIN,
  TIER_BY_PEOPLE,
  WAGE_LOW,
  WAGE_TAELS,
  type MarketKind,
  type Source,
} from '../content/markets.ts';
import { monthUse, restOf } from './making.ts';
import { rarityRank } from '../content/rarity.ts';
import { realmScale, tierRealm } from '../content/realms.ts';
import {
  DOOR_SHARE,
  doorOf,
  doorsAt,
  headcount,
  SHOP_KIND_INFO,
  SHOPS,
  shop as shopById,
  shopPeople,
  shopsAt,
  shopVein,
  STREET_ORDER,
  type Shop,
  type ShopKind,
} from '../content/shops.ts';
import { lotShape } from './loot.ts';
import type { World } from './resolver/world.ts';

const DEFAULT_PROSPERITY = 5;

/** A market: a place's shops together. */
export interface Market {
  /** The written town or the atlas place it stands at. */
  id: string;
  name: string;
  kind: MarketKind;
  x: number;
  y: number;
  /** The atlas place whose catalog is its own: what it makes. */
  place: string;
  region: string;
  continent: string;
  shops: readonly string[];
  /** Item kinds and tags it needs (`goodTags`). */
  needs: readonly string[];
  /** Each need's written reason: the place screen's line of why (People make and use). */
  why: Readonly<Record<string, string>>;
}

function buildMarkets(): Market[] {
  const out: Market[] = [];
  for (const r of Object.values(REGIONS)) {
    const needs = r.content.needs;
    for (const t of r.content.towns) {
      const shops = shopsAt(t.id);
      if (shops.length === 0) continue;
      const first = shopById(shops[0]!);
      out.push({
        id: t.id,
        name: t.name,
        kind: t.sub,
        x: t.x,
        y: t.y,
        place: first.at,
        region: first.region,
        continent: first.continent,
        shops,
        needs: Object.keys(needs[t.id] ?? {}),
        why: needs[t.id] ?? {},
      });
    }
    for (const p of r.file.places) {
      const id = p.id;
      const shops = shopsAt(id);
      if (p.x === null || p.y === null || shops.length === 0) continue;
      const first = shopById(shops[0]!);
      out.push({
        id,
        name: p.name,
        kind: p.kind === 'city' ? 'city' : 'seat',
        x: p.x,
        y: p.y,
        place: id,
        region: first.region,
        continent: first.continent,
        shops,
        needs: Object.keys(needs[id] ?? {}),
        why: needs[id] ?? {},
      });
    }
  }
  return out;
}

export const MARKETS: readonly Market[] = buildMarkets();
const marketById = new Map(MARKETS.map((m) => [m.id, m]));

export function market(id: string): Market | undefined {
  return marketById.get(id);
}

const shopMarket = new Map<string, Market | undefined>();

/** The market a shop stands in, looked up once a shop (every price and purse asks). */
export function marketOfShop(shopId: string): Market | undefined {
  if (!shopMarket.has(shopId))
    shopMarket.set(
      shopId,
      MARKETS.find((m) => m.shops.includes(shopId)),
    );
  return shopMarket.get(shopId);
}

// ── Prosperity ────────────────────────────────────────────────────────────────────────────────

/** A written town, an atlas place in a region file, or a region: its written prosperity and parent. */
function written(id: string): { prosperity: number; parent: string | null } | null {
  for (const r of Object.values(REGIONS)) {
    if (r.file.id === id) return { prosperity: r.file.prosperity, parent: null };
    const t = r.content.towns.find((x) => x.id === id);
    if (t) {
      const above = t.parent ? r.file.places.find((x) => x.id === t.parent) : undefined;
      return {
        prosperity: t.prosperity ?? above?.prosperity ?? r.file.prosperity,
        parent: t.parent ?? r.file.id,
      };
    }
    const p = r.file.places.find((x) => x.id === id);
    if (p) return { prosperity: p.prosperity, parent: p.parent };
  }
  return null;
}

/** A place's written prosperity, 1 to 9: ordinary when nothing is written. */
export function writtenProsperity(id: string): number {
  return written(id)?.prosperity ?? DEFAULT_PROSPERITY;
}

/** The place and the places above it, nearest first. */
function chain(id: string): string[] {
  const out: string[] = [];
  for (let at: string | null = id; at && !out.includes(at); at = written(at)?.parent ?? null)
    out.push(at);
  return out;
}

const isRegion = (id: string) => Object.values(REGIONS).some((r) => r.file.id === id);

/**
 * A place and the places above it short of its region, nearest first: the place catalogs a shop
 * there reads, so a seat sells its kingdom's goods as its own (River-Bend the March's).
 */
const chainCache = new Map<string, string[]>();
export function placeChain(place: string): string[] {
  let out = chainCache.get(place);
  if (!out) {
    out = chain(place).filter((id) => !isRegion(id));
    chainCache.set(place, out);
  }
  return out;
}

/** The whole years a place's offset has eased by a day. */
function easedYears(o: { day: number }, day: number): number {
  return Math.floor(Math.max(0, day - o.day) / PROSPERITY_EASE_DAYS);
}

/** What a deed did to one place's prosperity, eased back a step a year. */
function offsetOf(w: World, id: string, day: number): number {
  const o = w.prosperity[id];
  if (!o) return 0;
  return Math.sign(o.n) * Math.max(0, Math.abs(o.n) - easedYears(o, day));
}

/** Whether any place's prosperity stands off its written value on a day. */
export function prosperityMoved(w: World, day: number): boolean {
  for (const id in w.prosperity) if (offsetOf(w, id, day) !== 0) return true;
  return false;
}

const clampProsperity = (n: number) => Math.min(9, Math.max(1, Math.round(n)));

/**
 * A place's prosperity today: its written value moved by what was done to it and to the places
 * above it (a war on the March drains its towns), 1 to 9.
 */
export function prosperityOf(w: World, id: string, day: number): number {
  const off = chain(id).reduce((t, at) => t + offsetOf(w, at, day), 0);
  return clampProsperity(writtenProsperity(id) + off);
}

/**
 * Moves a place's prosperity by `n` from where it stands today (the `prosperity` effect). The
 * year it is easing through carries on, so a second deed within a year doesn't restart the clock;
 * offsets eased all the way back are dropped.
 */
export function addProsperity(w: World, id: string, n: number, day: number): World {
  const base = writtenProsperity(id);
  const off = Math.min(9 - base, Math.max(1 - base, offsetOf(w, id, day) + n));
  const prosperity: World['prosperity'] = {};
  for (const k in w.prosperity) if (offsetOf(w, k, day) !== 0) prosperity[k] = w.prosperity[k]!;
  const was = w.prosperity[id];
  if (off === 0) delete prosperity[id];
  else
    prosperity[id] = {
      n: off,
      day: was ? was.day + easedYears(was, day) * PROSPERITY_EASE_DAYS : Math.floor(day),
    };
  return { ...w, prosperity };
}

/** Prosperity's word: lean, thriving. */
export function prosperityWord(p: number): string {
  return PROSPERITY[clampProsperity(p)]!.word;
}

/**
 * A day's work in low-grade stones at a realm's tier and a place's prosperity: 1 low at Qi
 * Condensation where it is ordinary, 9 at Foundation, 270 at Core Formation (What a market holds).
 */
export function wages(tier: number, prosperity: number): number {
  return WAGE_LOW * realmScale(tierRealm(tier).id) * PROSPERITY[clampProsperity(prosperity)]!.wages;
}

/** A mortal laborer's day in taels at a place's prosperity. */
export function mortalWages(prosperity: number): number {
  return WAGE_TAELS * PROSPERITY[clampProsperity(prosperity)]!.wages;
}

// ── Who lives there ───────────────────────────────────────────────────────────────────────────

/** A population's head count keys, mortals first, then the realms in order. */
const POPULATION_KEYS = [
  'mortals',
  'qi',
  'foundation',
  'core',
  'nascent',
  'deity',
  'void',
] as const;

/**
 * Who lives at a written town or an atlas place today (People make and use): its written people
 * moved by what the world did to them (`world.population`), never under none. The monthly sum and
 * the purses read it; the shops a market keeps and its tiers still read the written people until
 * something sets an offset.
 */
export function populationOf(w: World, id: string): Population {
  const pop = peopleAt(id);
  const off = w.population[id];
  if (!off) return pop;
  const out: Population = {};
  for (const k of POPULATION_KEYS) {
    const n = Math.max(0, (pop[k] ?? 0) + (off[k] ?? 0));
    if (n > 0) out[k] = n;
  }
  return out;
}

// ── Shops by prosperity and vein ──────────────────────────────────────────────────────────────

/** The prosperity a shop reads: a sect shop its power's, any other its market's. */
function shopProsperity(w: World, sh: Shop, day: number): number {
  if (SHOP_KIND_INFO[sh.kind].members && sh.power) return prosperityOf(w, sh.power, day);
  return prosperityOf(w, marketOfShop(sh.id)?.id ?? sh.at, day);
}

/**
 * The highest tier a place's people buy (`TIER_BY_PEOPLE`): tier 3 where a Core Formation
 * cultivator lives, tier 2 where twenty Foundation cultivators do, tier 1 otherwise.
 */
function peopleTier(pop: Population): number {
  const core = (pop.core ?? 0) + (pop.nascent ?? 0) + (pop.deity ?? 0) + (pop.void ?? 0);
  if (core >= TIER_BY_PEOPLE.core) return 3;
  if ((pop.foundation ?? 0) >= TIER_BY_PEOPLE.foundation) return 2;
  return 1;
}

/**
 * The tiers a shop stocks (E2.2): up to the highest its place's people buy, within the vein (tier 1
 * on no vein) and its kind's top (a stall's stop at Foundation's).
 */
export function shopTiers(sh: Shop): number[] {
  const top = Math.min(
    Math.max(1, shopVein(sh)),
    peopleTier(shopPeople(sh)),
    SHOP_KIND_INFO[sh.kind].top ?? 3,
  );
  return Array.from({ length: Math.max(1, top) }, (_, i) => i + 1);
}

/** What takes its maker's tier on a shelf (design § Catalogs by place, Rarity as quality). */
const MAKER_TIERED: readonly ItemKind[] = ['pill', 'talisman', 'beast-part'];

/** A staple: the `trade` tag, the bulk end of a kind (design § Economy, Trading yourself). */
export function isStaple(thing: string): boolean {
  return !hasCopy(thing) && hasItem(thing) && (item(thing).tags ?? []).includes('trade');
}

/**
 * The tiers a lot comes at among `tiers`: its written one, and for a pill, a talisman, a beast
 * part or a staple any tier above it, since those take their maker's or their beast's. A gate
 * pill, a hiding talisman and a mortal good keep their own.
 */
export function lotTiers(thing: string, written: number, tiers: readonly number[]): number[] {
  if (hasCopy(thing)) return tiers.includes(written) ? [written] : [];
  const it = item(thing);
  // A staple is tiered like anything else, so a Foundation trader hauls tier 2 ore (E3).
  const fixed =
    (!MAKER_TIERED.includes(itemKind(it)) && !isStaple(thing)) ||
    !!it.uses.offer ||
    !!it.uses.hide ||
    it.taels !== undefined ||
    (it.tags ?? []).includes('coveted');
  return tiers.filter((t) => t === written || (!fixed && t > written));
}

/**
 * A market's size by who lives there (`SIZE`): log10 of its cultivators ÷ 50, ×0.5 to ×2. A lot
 * moves its supply less by this, so the City takes a Bag that floods a village.
 */
export function marketSize(m: Market): number {
  const n = headcount(peopleAt(m.id), 'cultivators');
  const x = n > 0 ? Math.log10(n / SIZE.per) : SIZE.min;
  return Math.min(SIZE.max, Math.max(SIZE.min, x));
}

/**
 * What a market's people earn in a month (What a market holds, a shop's purse): each cultivator a
 * month of wages at their realm and its prosperity, counting only the realms whose tier its shops
 * stock (a Nascent Soul's spending doesn't pass through tier 3 shops), in low-grade stones.
 */
export function earnings(w: World, m: Market, prosperity: number): number {
  const pop = populationOf(w, m.id);
  const top = stoneTopTier(m);
  return POPULATION_KEYS.slice(1, top + 1).reduce(
    (t, k, i) => t + (pop[k] ?? 0) * wages(i + 1, prosperity) * DAYS_PER_MONTH,
    0,
  );
}

/** The highest tier a market's stone shops stock (a mortal shop aside). */
function stoneTopTier(m: Market): number {
  const tiers = m.shops
    .map((id) => shopById(id))
    .filter((sh) => SHOP_KIND_INFO[sh.kind].money === 'stones')
    .map((sh) => Math.max(...shopTiers(sh)));
  return tiers.length ? Math.max(...tiers) : 1;
}

/**
 * Each door's share of its market's stone money (E5, `DOOR_SHARE`): a missing district's share
 * goes to the free market where the market grows its own shops, and the shares present are scaled
 * to the whole. Two trading houses split theirs.
 */
const shareCache = new Map<string, Map<string, number>>();
function doorShares(m: Market): Map<string, number> {
  let out = shareCache.get(m.id);
  if (out) return out;
  out = new Map<string, number>();
  const doors = doorsAt(m.id).filter((d) => SHOP_KIND_INFO[d.kind].money === 'stones');
  const has = (k: ShopKind) => doors.some((d) => d.kind === k);
  const grows = SHOPS.some((sh) => sh.id.startsWith(`${m.id}.`));
  let spare = 0;
  if (grows && has('stall'))
    for (const k of STREET_ORDER)
      if (k !== 'mortal' && k !== 'stall' && !has(k)) spare += DOOR_SHARE[k];
  const houses = doors.filter((d) => d.kind === 'house').length;
  for (const d of doors) {
    let x = DOOR_SHARE[d.kind];
    if (d.kind === 'house') x /= houses;
    if (d.kind === 'stall') x += spare;
    out.set(d.id, x);
  }
  const total = [...out.values()].reduce((t, x) => t + x, 0);
  for (const [k, x] of out) out.set(k, x / total);
  shareCache.set(m.id, out);
  return out;
}

/**
 * A shop's purse a month (E4, E5): half of what its market's people earn passes through its shops,
 * shared among its doors (`DOOR_SHARE`: the bounty office 0.3, a trading house 0.2, Pill Street
 * 0.2, Refiners' Row 0.15, a black market 0.3, the rest 0.05), and a door's among its shops as its
 * stock is, a shop 1 and a notable one 3, the small shops sharing the rest; never under its kind's
 * weight times prosperity's purse. The grain and cloth market shares a month of its mortals'
 * basket in taels. So Pill Street in the City holds about 32 mid, of which Apricot Grove's branch
 * can pay out about 3.
 */
export function shopPurse(w: World, sh: Shop, day: number): number {
  const info = SHOP_KIND_INFO[sh.kind];
  const p = shopProsperity(w, sh, day);
  const floor = info.purse * PROSPERITY[p]!.purse;
  const m = marketOfShop(sh.id);
  if (!m) return Math.round(floor);
  const door = doorOf(sh.id);
  const weights = (door?.shops ?? [sh.id]).reduce((t, id) => t + shopById(id).weight, 0);
  const mortal = info.money === 'silver';
  const money = mortal
    ? (populationOf(w, m.id).mortals ?? 0) * MORTAL_SPEND_TAELS * PROSPERITY[p]!.wages
    : earnings(w, m, p) * PURSE_SHARE * (doorShares(m).get(door?.id ?? sh.id) ?? 0);
  return Math.round(Math.max(floor, (money * sh.weight) / weights));
}

/** A shop's display lots a month (E5): a notable shop's kind's times prosperity's, the small shops none. */
export function shopLots(w: World, sh: Shop, day: number): number {
  const n = SHOP_KIND_INFO[sh.kind].lots;
  if (n === 0 || sh.small) return 0;
  return Math.max(1, Math.round(n * PROSPERITY[shopProsperity(w, sh, day)]!.lots));
}

// ── Reach ─────────────────────────────────────────────────────────────────────────────────────

/** The markets a market draws on: those within its kind's reach, in a straight line. */
export function reachOf(m: Market): Market[] {
  const li = REACH_LI[m.kind];
  return MARKETS.filter((o) => o.id !== m.id && Math.hypot(o.x - m.x, o.y - m.y) <= li);
}

const placeCache = new Map<string, Lot[]>();
/** A place's catalogs' lots that are made for sale: its own and its kingdom's (`placeChain`). */
export function placeLots(place: string): Lot[] {
  let lots = placeCache.get(place);
  if (!lots) {
    const at = placeChain(place);
    lots = CATALOGS.filter((c) => c.layer === 'place' && at.includes(c.at)).flatMap((c) =>
      c.lots.filter((l) => l.shops.length > 0),
    );
    placeCache.set(place, lots);
  }
  return lots;
}

/** A lent lot: what a market in reach makes and its own shops stock, and which market lends it. */
interface LentLot {
  lot: Lot;
  from: string;
}

/**
 * What the markets in reach lend: each one's place catalog as its own shops stock it, a method's
 * copy aside (a copy spreads by `standingCopies`), and nothing this market makes itself.
 */
const lentCache = new Map<string, LentLot[]>();
export function lentLots(m: Market): LentLot[] {
  const kept = lentCache.get(m.id);
  if (kept) return kept;
  const out: LentLot[] = [];
  const seen = new Set(placeLots(m.place).map((l) => l.thing));
  for (const o of reachOf(m)) {
    if (o.place === m.place) continue;
    const kinds = new Set(o.shops.map((id) => shopById(id).kind));
    for (const lot of placeLots(o.place)) {
      if (hasCopy(lot.thing) || seen.has(lot.thing)) continue;
      if (!lot.shops.some((k) => kinds.has(k))) continue;
      seen.add(lot.thing);
      out.push({ lot, from: o.id });
    }
  }
  lentCache.set(m.id, out);
  return out;
}

// ── Supply ────────────────────────────────────────────────────────────────────────────────────

/**
 * What a good is called in a market's ledger: its written thing, and its tier when a maker raised
 * it, so a tier 3 pill keeps its own supply. Rarities share one.
 */
export function goodOf(thing: string): string {
  if (hasCopy(thing)) return thing;
  const base = baseOf(thing);
  const t = item(thing).tier;
  return t === item(base).tier ? base : `${base}@t${t}`;
}

/**
 * The words a need can name a thing by (design § Economy, Supply and prices): its kind, its
 * market tags, and what it does: `healing`, `qi-restoring`, `qi-fuel` (and `body-fuel`,
 * `soul-fuel`), `detox`, `weapon`, `armor`, `hiding`. A copy is `copy`.
 */
export function goodTags(thing: string): string[] {
  if (hasCopy(thing)) return ['copy'];
  const it = item(thing);
  // A talisman for the road (Earth Escape, Divine Travel) is no month's wear: it fills no talisman
  // need (K5's passage talismans tipped the stones sim, review 2026-10-21).
  const road = itemKind(it) === 'talisman' && (!!it.uses.escape || !!it.uses.swift);
  const tags: string[] = [road ? 'road-talisman' : itemKind(it), ...(it.tags ?? [])];
  for (const e of it.uses.consume?.effects ?? []) {
    if (e.effect === 'restore') tags.push(e.what === 'hp' ? 'healing' : 'qi-restoring');
    if (e.effect === 'fuel') tags.push(`${e.ladder}-fuel`);
    if (e.effect === 'detox') tags.push('detox');
  }
  const slot = it.uses.equip?.slot;
  if (slot === 'weapon' || slot === 'armor') tags.push(slot);
  if (it.uses.hide) tags.push('hiding');
  return tags;
}

const isCoveted = (thing: string) =>
  !hasCopy(thing) && (item(thing).tags ?? []).includes('coveted');

/** The highest tier any of a market's shops stocks. */
export function marketTopTier(m: Market): number {
  return Math.max(...m.shops.map((id) => Math.max(...shopTiers(shopById(id)))));
}

function tierOf(thing: string): number {
  return hasCopy(thing) ? (lotShape(thing)?.tier ?? 1) : item(thing).tier;
}

/** How a good stands seen from a market: where it comes from, its written supply, who lends it. */
export interface Seen {
  source: Source;
  supply: number;
  /** The market in reach that lends it. */
  from?: string;
}

const inLots = (lots: readonly Lot[], base: string) => lots.some((l) => l.thing === base);

/**
 * A good seen from a market (Supply and prices): made here at 150% (a coveted thing 100%), then a
 * thing above every tier it stocks, a need or a coveted thing at 50%, then its region's and
 * continent's goods, then what the markets in reach lend (×1.1), then imports (×1.2), and anything
 * else at 50%.
 */
const seenCache = new Map<string, Seen>();
export function seenFrom(m: Market, thing: string): Seen {
  const key = `${m.id}|${thing}`;
  let seen = seenCache.get(key);
  if (!seen) {
    seen = seeFresh(m, thing);
    seenCache.set(key, seen);
  }
  return seen;
}

function seeFresh(m: Market, thing: string): Seen {
  const base = hasCopy(thing) ? thing : baseOf(thing);
  const coveted = isCoveted(thing);
  if (inLots(placeLots(m.place), base))
    return { source: 'made', supply: coveted ? COVETED_MADE_SUPPLY : SOURCE_SUPPLY.made };
  const at = (s: Source): Seen => ({ source: s, supply: SOURCE_SUPPLY[s] });
  if (tierOf(thing) > marketTopTier(m)) return at('none');
  if (coveted || goodTags(thing).some((t) => m.needs.includes(t))) return at('need');
  const local = CATALOGS.filter(
    (c) =>
      (c.layer === 'region' && c.at === m.region) ||
      (c.layer === 'continent' && c.at === m.continent),
  ).flatMap((c) => c.lots.filter((l) => l.shops.length > 0));
  if (
    inLots(local, base) ||
    inLots(
      RARE.lots.filter((l) => l.shops.length > 0),
      base,
    )
  )
    return at('local');
  const lent = lentLots(m).find((l) => l.lot.thing === base);
  if (lent) return { ...at('reach'), from: lent.from };
  const imports = CATALOGS.filter((c) => c.layer === 'import' && c.at === m.region).flatMap(
    (c) => c.lots,
  );
  if (inLots(imports, base)) return at('import');
  return at('none');
}

/**
 * A good seen from a market in a world (Methods in the market): a copy the market bought is made
 * there now, and one a market in whose reach it stands bought is lent at ×1.1; anything else is as
 * written (`seenFrom`). A guarded copy a black market took leaks only there, so it lends nowhere.
 */
export function seenIn(w: World, m: Market, thing: string): Seen {
  if (!hasCopy(thing)) return seenFrom(m, thing);
  if (w.copied[m.id]?.[thing] !== undefined) return { source: 'made', supply: SOURCE_SUPPLY.made };
  if (!guardedBy(thing)) {
    const from = lendersOf(m).find((o) => w.copied[o.id]?.[thing] !== undefined);
    if (from) return { source: 'reach', supply: SOURCE_SUPPLY.reach, from: from.id };
  }
  return seenFrom(m, thing);
}

/** The markets whose reach takes this one in: where a market's copies are lent from. */
const lenderCache = new Map<string, Market[]>();
function lendersOf(m: Market): Market[] {
  let out = lenderCache.get(m.id);
  if (!out) {
    out = MARKETS.filter((o) => o.id !== m.id && reachOf(o).includes(m));
    lenderCache.set(m.id, out);
  }
  return out;
}

// ── Methods in the market ─────────────────────────────────────────────────────────────────────

/**
 * Whose own method a copy is, if a power's (design § Economy, Methods in the market): a copy that
 * only a power's own hall stocks, as the Gate's Butcher Saber is, and nobody else in the catalogs.
 * It is recognized as stolen goods are.
 */
const guardCache = new Map<string, string | null>();
export function guardedBy(thing: string): string | null {
  if (!hasCopy(thing)) return null;
  let owner = guardCache.get(thing);
  if (owner === undefined) {
    // A method written as a power's own is its, whoever sells it (the checkpoint's fix).
    const of = copyOf(thing);
    owner =
      of?.kind === 'method' && hasMethod(of.id)
        ? (method(of.id).guardedBy ?? null)
        : of?.kind === 'manual' && hasManual(of.id)
          ? (manual(of.id).guardedBy ?? null)
          : null;
    const lines = [...CATALOGS, RARE].flatMap((c) =>
      c.lots.filter((l) => l.thing === thing && l.shops.length > 0).map((l) => ({ c, l })),
    );
    if (
      !owner &&
      lines.length > 0 &&
      lines.every(({ c, l }) => c.layer === 'place' && l.shops.every((k) => k === 'sect'))
    ) {
      const powers = new Set(
        lines.map(({ c }) => SHOPS.find((sh) => sh.kind === 'sect' && sh.at === c.at)?.power),
      );
      const [only] = [...powers];
      if (powers.size === 1 && only) owner = only;
    }
    guardCache.set(thing, owner ?? null);
  }
  return owner ?? null;
}

/**
 * Whether a copy a market buys turns common there: it is copied unless it is a sealed slip or a
 * later chapter, and a power's own only where a black market takes it (the leak).
 */
export function spreads(thing: string, blackMarket: boolean): boolean {
  if (!hasCopy(thing)) return false;
  if (copyForm(thing) === 'sealed' || copyChapter(thing) > OPENING_CHAPTERS) return false;
  return !guardedBy(thing) || blackMarket;
}

/** A market copies a copy it bought: on its own shelves from next month, and lent through its reach. */
export function copyInto(w: World, m: Market, thing: string, day: number): World {
  const month = Math.floor(day / DAYS_PER_MONTH);
  const had = w.copied[m.id]?.[thing];
  // A leaked copy its power bought out leaks again with the next one sold (O5).
  if (had !== undefined && !(guardedBy(thing) && boughtOut(had, month))) return w;
  return { ...w, copied: { ...w.copied, [m.id]: { ...(w.copied[m.id] ?? {}), [thing]: month } } };
}

/**
 * Whether a leaked copy is gone from the black market's shelf: its power, told it leaked, buys the
 * copy out within a season (design § Guarded methods), three months after the month it was sold.
 */
function boughtOut(soldMonth: number, month: number): boolean {
  return month - soldMonth >= GUARDED.buyoutMonths;
}

/** The shops that stand a market's copies: the kinds that sell copies, a sect's hall aside. */
const COPY_SHOPS: readonly Shop['kind'][] = ['stall', 'house', 'black-market'];

/**
 * The copies a shop stands on its shelf this month: its market's own, bought before this month,
 * and those lent by the markets whose reach takes it in, at the tiers the shop stocks. An honest
 * stall or guild hall stocks the honest ones; a black market only the guarded copies it leaked; a
 * sect's hall none of them.
 */
export function standingCopies(w: World, sh: Shop, month: number): string[] {
  const m = marketOfShop(sh.id);
  if (!m || !COPY_SHOPS.includes(sh.kind)) return [];
  const black = sh.kind === 'black-market';
  const tiers = shopTiers(sh);
  const out: string[] = [];
  const take = (ledger: Record<string, number> | undefined, lent: boolean) => {
    for (const [thing, at] of Object.entries(ledger ?? {})) {
      if (at >= month || out.includes(thing) || !hasCopy(thing)) continue;
      if (!tiers.includes(tierOf(thing))) continue;
      const guarded = !!guardedBy(thing);
      if (black ? !guarded || lent : guarded) continue;
      if (guarded && boughtOut(at, month)) continue;
      out.push(thing);
    }
  };
  take(w.copied[m.id], false);
  if (!black) for (const o of lendersOf(m)) take(w.copied[o.id], true);
  return out;
}

/**
 * A good's supply in a market today. A good in the monthly sum (core/making.ts) rests where the sum
 * says, and what was done to it moves a third of the way back to that rest each month, the rest
 * moving with the harvest as it goes; any other good eases a tenth of the way back to its written
 * supply.
 */
export function supplyOf(w: World, m: Market, thing: string, day: number): number {
  const month = Math.floor(day / DAYS_PER_MONTH);
  const kept = w.supply[m.id]?.[goodOf(thing)];
  const rest = restOf(w, m, thing, month);
  if (rest !== null) {
    // Two years of thirds leave nothing of the old supply worth counting.
    if (!kept || month - kept.month > REST_MONTHS) return rest;
    let n = kept.n;
    for (let k = kept.month + 1; k <= month; k++) n += (restOf(w, m, thing, k)! - n) * REST_STEP;
    return n;
  }
  const base = seenIn(w, m, thing).supply;
  if (!kept) return base;
  const months = Math.max(0, month - kept.month);
  return base + (kept.n - base) * (1 - SUPPLY_EASE) ** months;
}

/**
 * A good's supply as this month opened, before your trade this month moved it (E5): what a
 * district's shelves hold of it.
 */
export function openSupply(w: World, m: Market, thing: string, month: number): number {
  const kept = w.supply[m.id]?.[goodOf(thing)];
  if (kept && kept.month === month && kept.open !== undefined) return kept.open;
  return supplyOf(w, m, thing, month * DAYS_PER_MONTH);
}

/** How many months a kept supply is followed back to its rest before it is read as at rest. */
const REST_MONTHS = 24;

/** What a market's price does to a good's posted price: √(100 ÷ supply), and the road's share. */
export function marketFactor(w: World, m: Market, thing: string, day: number): number {
  return Math.sqrt(100 / supplyOf(w, m, thing, day)) * ROAD[seenIn(w, m, thing).source];
}

/**
 * Whether a market needs a good: one in the monthly sum while it stands under 100%, and any other
 * while it is written at half supply (a need, a coveted thing, or in none of its layers) and still
 * stands under 100%. Once filled, it pays only the shop's rate.
 */
export function wanted(w: World, m: Market, thing: string, day: number): boolean {
  if (restOf(w, m, thing, Math.floor(day / DAYS_PER_MONTH)) !== null)
    return supplyOf(w, m, thing, day) < 100;
  return seenIn(w, m, thing).supply < 100 && supplyOf(w, m, thing, day) < 100;
}

/**
 * Whether a market is short of a good at rest, whatever you have bought or sold of it: one in the
 * monthly sum resting under 100%, and any other written at half supply. A keeper won't haggle over
 * it (core/shops.ts `priceToYou`), and no shop's offer for it tops the cheapest asking price.
 */
export function shortAtRest(w: World, m: Market, thing: string, day: number): boolean {
  const rest = restOf(w, m, thing, Math.floor(day / DAYS_PER_MONTH));
  if (rest !== null) return rest < 100;
  return seenIn(w, m, thing).supply < 100;
}

/** Supply points a lot of this good moves, before prosperity's lots divide it. */
function depthOf(thing: string): number {
  if (hasCopy(thing)) {
    const shape = lotShape(thing);
    if (copyForm(thing) === 'sealed') return DEPTH.rare;
    return shape && rarityRank(shape.rarities[0]!) >= rarityRank('purple')
      ? DEPTH.rare
      : DEPTH.common;
  }
  const it: Item = item(thing);
  if ((it.tags ?? []).includes('trade')) return DEPTH.staple;
  if (itemKind(it) === 'treasure' || rarityRank(it.rarity) >= rarityRank('purple'))
    return DEPTH.rare;
  return DEPTH.common;
}

/**
 * How many come in one lot of a thing: its catalog line's count, at its middle, else a batch of
 * its recipe (K1), so a batch sold moves a market as one lot does.
 */
export function lotSize(thing: string): number {
  const base = hasCopy(thing) ? thing : baseOf(thing);
  const line = [...CATALOGS.flatMap((c) => c.lots), ...RARE.lots].find((l) => l.thing === base);
  if (!line?.count) {
    const r = hasCopy(thing) ? null : recipeFor(thing);
    return r ? recipeYield(r) : 1;
  }
  return Math.max(1, Math.round((line.count[0] + line.count[1]) / 2));
}

/**
 * Moves a good's supply by `pieces` sold to the market (negative when bought from it). A good in
 * the monthly sum moves by its share of the market's month of use, 100 points for a month's worth,
 * at most its depth a lot, so a Bag barely moves the City; any other good moves by its depth a lot,
 * divided by prosperity's lots and the market's size.
 */
export function moveSupply(w: World, m: Market, thing: string, pieces: number, day: number): World {
  if (pieces === 0) return w;
  const month = Math.floor(day / DAYS_PER_MONTH);
  const rest = restOf(w, m, thing, month);
  const base = rest ?? seenIn(w, m, thing).supply;
  const perLot = depthOf(thing) / lotSize(thing);
  const delta =
    rest !== null
      ? pieces * Math.min(perLot, 100 / monthUse(w, m, thing, month)!)
      : (pieces * perLot) / (PROSPERITY[prosperityOf(w, m.id, day)]!.lots * marketSize(m));
  const now = supplyOf(w, m, thing, day);
  const n = Math.min(SUPPLY_MAX, Math.max(SUPPLY_MIN, now + delta));
  const good = goodOf(thing);
  const ledger = { ...(w.supply[m.id] ?? {}) };
  const was = ledger[good];
  // What the month opened at, kept the first time this month moves it.
  const open =
    was && was.month === month && was.open !== undefined
      ? was.open
      : openSupply(w, m, thing, month);
  if (Math.abs(n - base) < 0.5 && Math.abs(open - base) < 0.5) delete ledger[good];
  else ledger[good] = { n, month, open };
  const supply = { ...w.supply };
  if (Object.keys(ledger).length) supply[m.id] = ledger;
  else delete supply[m.id];
  return { ...w, supply };
}

/** A good back as a thing: its written thing, at the tier its ledger name gives. */
export function thingOfGood(good: string): string {
  const [base, t] = good.split('@t');
  if (!t || !hasItem(base!)) return base!;
  return variantId(base!, item(base!).rarity, { tier: Number(t) });
}

/** A copy's title or an item's name, for the dev console's `market`. */
export function goodName(thing: string): string {
  if (hasCopy(thing)) return copyOf(thing)!.id;
  return hasItem(thing) ? item(thing).name : thing;
}
