// Markets (design § Economy, Prosperity, What a market holds, Supply and prices, Markets by reach):
// a place's shops together, how well-off the place is, the supply it keeps of each good and the
// price that follows it, and the markets round it that lend their goods. A market is a written town
// with shops or an atlas place that keeps its own (content/map/). Prosperity and supply move by
// what happens and ease back with time, and the world keeps only what differs from the written.
import { DAYS_PER_MONTH } from '../content/calendar.ts';
import { CATALOGS } from '../content/catalogs/index.ts';
import { RARE } from '../content/catalogs/rare.ts';
import type { Lot } from '../content/catalogs/types.ts';
import { copyOf, hasCopy } from '../content/copies.ts';
import { baseOf, hasItem, item, itemKind, variantId, type Item } from '../content/items.ts';
import { REGIONS, shopVein } from '../content/map/index.ts';
import {
  COVETED_MADE_SUPPLY,
  DEPTH,
  PROSPERITY,
  PROSPERITY_EASE_DAYS,
  REACH_LI,
  ROAD,
  SOURCE_SUPPLY,
  SUPPLY_EASE,
  SUPPLY_MAX,
  SUPPLY_MIN,
  WAGE_LOW,
  WAGE_TAELS,
  type MarketKind,
  type Source,
} from '../content/markets.ts';
import { rarityRank } from '../content/rarity.ts';
import { realmScale, tierRealm } from '../content/realms.ts';
import { SHOP_KIND_INFO, shop as shopById, type Shop } from '../content/shops.ts';
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
}

function buildMarkets(): Market[] {
  const out: Market[] = [];
  for (const r of Object.values(REGIONS)) {
    const needs = r.content.needs;
    for (const t of r.content.towns) {
      if (t.shops.length === 0) continue;
      const first = shopById(t.shops[0]!);
      out.push({
        id: t.id,
        name: t.name,
        kind: t.sub,
        x: t.x,
        y: t.y,
        place: first.at,
        region: first.region,
        continent: first.continent,
        shops: t.shops,
        needs: needs[t.id] ?? [],
      });
    }
    for (const [id, shops] of Object.entries(r.content.placeShops)) {
      const p = r.file.places.find((x) => x.id === id);
      if (!p || p.x === null || p.y === null || shops.length === 0) continue;
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
        needs: needs[id] ?? [],
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

/** The market a shop stands in. */
export function marketOfShop(shopId: string): Market | undefined {
  return MARKETS.find((m) => m.shops.includes(shopId));
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

/** What a deed did to one place's prosperity, eased back a step a year. */
function offsetOf(w: World, id: string, day: number): number {
  const o = w.prosperity[id];
  if (!o) return 0;
  const eased = Math.floor(Math.max(0, day - o.day) / PROSPERITY_EASE_DAYS);
  return Math.sign(o.n) * Math.max(0, Math.abs(o.n) - eased);
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

/** Moves a place's prosperity by `n` from where it stands today (the `prosperity` effect). */
export function addProsperity(w: World, id: string, n: number, day: number): World {
  const base = writtenProsperity(id);
  const off = Math.min(9 - base, Math.max(1 - base, offsetOf(w, id, day) + n));
  const prosperity = { ...w.prosperity };
  if (off === 0) delete prosperity[id];
  else prosperity[id] = { n: off, day: Math.floor(day) };
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

// ── Shops by prosperity and vein ──────────────────────────────────────────────────────────────

/** The prosperity a shop reads: a sect shop its power's, any other its market's. */
export function shopProsperity(w: World, sh: Shop, day: number): number {
  if (SHOP_KIND_INFO[sh.kind].members && sh.power) return prosperityOf(w, sh.power, day);
  return prosperityOf(w, marketOfShop(sh.id)?.id ?? sh.at, day);
}

/** The tiers a shop stocks: its written ones within its place's vein, tier 1 on no vein. */
export function shopTiers(sh: Shop): number[] {
  const top = Math.max(1, shopVein(sh));
  const tiers = sh.tiers.filter((t) => t <= top);
  return tiers.length ? tiers : [1];
}

/**
 * A shop's purse a month: its kind's at tier 1, times the realm curve at the highest tier it
 * stocks, times prosperity's purse. The City's alchemy shop, to tier 3 and ordinary, holds 405 mid.
 */
export function shopPurse(w: World, sh: Shop, day: number): number {
  const info = SHOP_KIND_INFO[sh.kind];
  const top = Math.max(...shopTiers(sh));
  const curve = info.money === 'silver' ? 1 : realmScale(tierRealm(top).id);
  return Math.round(info.purse * curve * PROSPERITY[shopProsperity(w, sh, day)]!.purse);
}

/** A shop's lots a month: its kind's times prosperity's lots, never under one. */
export function shopLots(w: World, sh: Shop, day: number): number {
  const n = SHOP_KIND_INFO[sh.kind].lots;
  if (n === 0) return 0;
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
function placeLots(place: string): Lot[] {
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
export interface LentLot {
  lot: Lot;
  from: string;
}

/**
 * What the markets in reach lend: each one's place catalog as its own shops stock it, a method's
 * copy aside (methods in the market are E3's), and nothing this market makes itself.
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
  const tags: string[] = [itemKind(it), ...(it.tags ?? [])];
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

/** A good's supply in a market today: its written supply, with what was done to it easing back. */
export function supplyOf(w: World, m: Market, thing: string, day: number): number {
  const base = seenFrom(m, thing).supply;
  const kept = w.supply[m.id]?.[goodOf(thing)];
  if (!kept) return base;
  const months = Math.max(0, Math.floor(day / DAYS_PER_MONTH) - kept.month);
  return base + (kept.n - base) * (1 - SUPPLY_EASE) ** months;
}

/** What a market's price does to a good's posted price: √(100 ÷ supply), and the road's share. */
export function marketFactor(w: World, m: Market, thing: string, day: number): number {
  return Math.sqrt(100 / supplyOf(w, m, thing, day)) * ROAD[seenFrom(m, thing).source];
}

/**
 * Whether a market needs a good: it is written at half supply (a need, a coveted thing, or in none
 * of its layers) and still stands under 100%. Once filled, it pays only the shop's rate.
 */
export function wanted(w: World, m: Market, thing: string, day: number): boolean {
  return seenFrom(m, thing).supply < 100 && supplyOf(w, m, thing, day) < 100;
}

/** Supply points a lot of this good moves, before prosperity's lots divide it. */
function depthOf(thing: string): number {
  if (hasCopy(thing)) {
    const shape = lotShape(thing);
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

/** How many come in one lot of a thing: its catalog line's count, at its middle. */
export function lotSize(thing: string): number {
  const base = hasCopy(thing) ? thing : baseOf(thing);
  const line = [...CATALOGS.flatMap((c) => c.lots), ...RARE.lots].find((l) => l.thing === base);
  if (!line?.count) return 1;
  return Math.max(1, Math.round((line.count[0] + line.count[1]) / 2));
}

/**
 * Moves a good's supply by `pieces` sold to the market (negative when bought from it): by its
 * depth a lot, divided by prosperity's lots, so a bigger market moves less.
 */
export function moveSupply(w: World, m: Market, thing: string, pieces: number, day: number): World {
  if (pieces === 0) return w;
  const base = seenFrom(m, thing).supply;
  const lots = PROSPERITY[prosperityOf(w, m.id, day)]!.lots;
  const delta = ((pieces / lotSize(thing)) * depthOf(thing)) / lots;
  const n = Math.min(SUPPLY_MAX, Math.max(SUPPLY_MIN, supplyOf(w, m, thing, day) + delta));
  const good = goodOf(thing);
  const ledger = { ...(w.supply[m.id] ?? {}) };
  if (Math.abs(n - base) < 0.5) delete ledger[good];
  else ledger[good] = { n, month: Math.floor(day / DAYS_PER_MONTH) };
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
