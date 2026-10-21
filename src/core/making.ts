// People make and use (design § Economy, People make and use; E4): once a month each market adds
// up what its people use by need, what its makers make and use of their inputs, and what is
// carried in from the markets in its reach, along its ties and from its region's and continent's
// trade, and each good's supply rests at 100 × (made + carried) ÷ used, within 25% and 200%.
// Arithmetic per market, never simulated shoppers: the whole world's sum is worked out at once
// from who lives where and how well-off they are, and kept until either moves.
import { DAYS_PER_MONTH } from '../content/calendar.ts';
import { CATALOGS } from '../content/catalogs/index.ts';
import type { Catalog, Lot } from '../content/catalogs/types.ts';
import { hasCopy } from '../content/copies.ts';
import { recipeFor as anyRecipe, recipeYield } from '../content/crafts.ts';
import { hasItem, item, itemKind, STAPLE_TAGS, variantId, type Item } from '../content/items.ts';
import { REGIONS, veinAt } from '../content/map/index.ts';
import { SHOPS, shopsAt } from '../content/shops.ts';
import {
  BASKET,
  FILLED_BY,
  HARVEST,
  BREWED_HERE,
  MAKE_SHARE,
  MAKER_USES,
  WORKSHOP,
  NEED_WORDS,
  PRESSURE,
  PROSPERITY,
  SUPPLY_MAX,
  SUPPLY_MIN,
  type BasketNeed,
} from '../content/markets.ts';
import {
  goodOf,
  goodTags,
  isStaple,
  lentLots,
  lotTiers,
  marketTopTier,
  MARKETS,
  placeLots,
  populationOf,
  prosperityMoved,
  prosperityOf,
  reachOf,
  type Market,
} from './markets.ts';
import { priceOf } from './prices.ts';
import type { World } from './resolver/world.ts';
import { capitalize } from '../content/words.ts';

const shopKindOf = new Map(SHOPS.map((sh) => [sh.id, sh.kind]));

/** Who a basket is for: a mortal (0) or a cultivator of a tier (1 to 3). */
type Who = 0 | 1 | 2 | 3;
const WHO_KEYS = ['mortals', 'qi', 'foundation', 'core'] as const;

/** How a good not made here reaches a market: from a market in reach, a tie, or the wider land. */
type Carrier = 'reach' | 'import' | 'local';

/** One good in a market's sum, a month's worth, before the harvest. */
interface GoodSum {
  /** Its ledger name (`goodOf`) and a thing of it at its tier. */
  good: string;
  thing: string;
  /** The basket or maker's need it fills: the line of why's word for it. */
  need: string;
  /** What its people and makers use, with the pressures on and without them. */
  used: number;
  plain: number;
  pressure: number;
  /** What its makers make, before the harvest, and whether the land gives it. */
  made: number;
  land: boolean;
  /** What is carried in, before the harvest, and from where. */
  carried: number;
  from: Carrier | null;
  /** The harvest it follows, if any. */
  season: keyof typeof HARVEST.months | null;
}

/** A market's whole sum: its goods, and what each need uses among how many goods. */
interface MarketSum {
  goods: Map<string, GoodSum>;
  /** A basket or maker's need at a tier, mortal or not: its use and the goods that fill it. */
  needs: Map<string, { used: number; plain: number; fillers: number }>;
}

// ── The lines a market can fill a need from ───────────────────────────────────────────────────

/** A catalog's region: its own, or its place's, or the one its imports reach. */
function catalogRegion(c: Catalog): string | null {
  if (c.layer === 'continent') return null;
  if (c.layer === 'region' || c.layer === 'import') return c.at;
  for (const r of Object.values(REGIONS))
    if (r.file.places.some((p) => p.id === c.at)) return r.file.id;
  return null;
}

/** A market's land: its atlas place's terrain and qi density, else its region's. */
function landOf(m: Market): { terrain: string; qi: number } {
  const r = REGIONS[m.region];
  const p = r?.file.places.find((x) => x.id === m.place);
  return {
    terrain: p?.terrain || r?.file.terrain || '',
    qi: p?.qiDensity ?? r?.file.qiDensity ?? 5,
  };
}

/**
 * The lines the land makes at a market (Making): a herb, material or staple line that names the
 * market's terrain, written in its continent's catalog or in a catalog of its region, on a vein
 * at least as strong as the line asks.
 */
const landCache = new Map<string, Lot[]>();
function landLots(m: Market): Lot[] {
  let out = landCache.get(m.id);
  if (!out) {
    const { terrain } = landOf(m);
    const vein = veinAt(m.id);
    out = CATALOGS.filter((c) =>
      c.layer === 'continent' ? c.at === m.continent : catalogRegion(c) === m.region,
    ).flatMap((c) =>
      c.lots.filter(
        (l) => l.land?.includes(terrain) && vein >= (l.landVein ?? 0) && l.shops.length > 0,
      ),
    );
    landCache.set(m.id, out);
  }
  return out;
}

/** The lines of a market's region's and continent's catalogs, and its region's imports. */
function wideLots(m: Market, layer: 'local' | 'import'): Lot[] {
  return CATALOGS.filter((c) =>
    layer === 'import'
      ? c.layer === 'import' && c.at === m.region
      : (c.layer === 'region' && c.at === m.region) ||
        (c.layer === 'continent' && c.at === m.continent),
  ).flatMap((c) => c.lots);
}

/**
 * Whether a written thing can fill a need: an item sold by a shop that isn't only a black market,
 * not coveted, a treasure, a mount, a vessel, or a beast part from the hunt (a staple's hide and
 * horn are made, the rest wait for the living world's hunters).
 */
function inSum(l: Lot): Item | null {
  if (hasCopy(l.thing) || l.shops.every((k) => k === 'black-market')) return null;
  const it = item(l.thing);
  const kind = itemKind(it);
  if ((it.tags ?? []).includes('coveted')) return null;
  if (kind === 'treasure' || kind === 'mount' || kind === 'vessel') return null;
  if (kind === 'beast-part' && !isStaple(l.thing)) return null;
  return it;
}

/** A line a market draws on, and whether its own catalogs or its land make it. */
interface Line {
  lot: Lot;
  it: Item;
  made: 'catalog' | 'land' | null;
}

const lineCache = new Map<string, Line[]>();
function linesOf(m: Market): Line[] {
  let out = lineCache.get(m.id);
  if (!out) {
    const seen = new Map<string, Line>();
    const add = (lots: readonly Lot[], made: Line['made']) => {
      for (const lot of lots) {
        if (lot.shops.length === 0) continue;
        const it = inSum(lot);
        const had = seen.get(lot.thing);
        if (!it || (had && (had.made || !made))) continue;
        seen.set(lot.thing, { lot, it, made });
      }
    };
    add(placeLots(m.place), 'catalog');
    add(landLots(m), 'land');
    add(wideLots(m, 'local'), null);
    add(
      lentLots(m).map((l) => l.lot),
      null,
    );
    add(wideLots(m, 'import'), null);
    out = [...seen.values()];
    lineCache.set(m.id, out);
  }
  return out;
}

/** The tags that fill a need. */
const fillTags = (need: string) => FILLED_BY[need] ?? [need];

/** The goods at a market that fill a need at a tier, for mortals or for cultivators. */
function fillersOf(m: Market, need: string, tier: number, mortal: boolean): Line[] {
  const tags = fillTags(need);
  return linesOf(m).filter(
    ({ lot, it }) =>
      (it.taels !== undefined) === mortal &&
      goodTags(lot.thing).some((t) => tags.includes(t)) &&
      lotTiers(lot.thing, it.tier, [tier]).length > 0,
  );
}

/** A written thing at a tier, and its ledger name. */
function atTier(thing: string, tier: number): { thing: string; good: string } {
  const it = item(thing);
  const t = tier === it.tier ? thing : variantId(thing, it.rarity, { tier });
  return { thing: t, good: goodOf(t) };
}

/** The harvest a good follows: grain's, a herb's, or none. */
function seasonOf(it: Item): GoodSum['season'] {
  if ((it.tags ?? []).includes('grain')) return 'grain';
  if (itemKind(it) === 'herb') return 'herb';
  return null;
}

/**
 * The pressures on a good at a market (Pressures): a written need that names it ×2, marsh or
 * jungle detox ×2, thin qi's qi-fuel ×1.5, together at most ×3. A mortal good is pressed only by
 * its staple's own need (grain, salt), never by a cultivator's kind (the City's makers' material).
 */
function pressureOn(m: Market, thing: string): number {
  const all = goodTags(thing);
  const tags =
    item(thing).taels !== undefined
      ? all.filter((t) => (STAPLE_TAGS as readonly string[]).includes(t))
      : all;
  const land = landOf(m);
  let x = 1;
  if (tags.some((t) => m.needs.includes(t))) x *= PRESSURE.written;
  if (
    tags.includes(PRESSURE.wet.tag) &&
    (PRESSURE.wet.lands as readonly string[]).includes(land.terrain)
  )
    x *= PRESSURE.wet.x;
  if (tags.includes(PRESSURE.thin.tag) && land.qi <= PRESSURE.thin.qi) x *= PRESSURE.thin.x;
  return Math.min(PRESSURE.max, x);
}

/**
 * The recipe a market's makers make a thing by (K1): a crop's (K8) is a farmer's, and the land
 * that grows it keeps its family's defaults (a sack of spirit grain, its bone meal).
 */
function recipeFor(thing: string) {
  const r = anyRecipe(thing);
  return r && r.craft !== 'farming' ? r : null;
}

/**
 * What a maker uses a piece of a thing, by need: its line's own, else its family's. A thing with a
 * recipe uses its recipe's inputs by thing instead (`recipeUses`, K1).
 */
function makerUses(l: Line): Readonly<Record<string, number>> {
  if (l.lot.uses) return l.lot.uses;
  if (recipeFor(l.lot.thing)) return {};
  const kind = itemKind(l.it);
  if (kind === 'pill') return MAKER_USES.pill;
  if (kind === 'talisman') return MAKER_USES.talisman;
  const slot = l.it.uses.equip?.slot;
  if (kind === 'gear' && (slot === 'weapon' || slot === 'armor')) return MAKER_USES.gear;
  if ((l.it.tags ?? []).includes('grain') && l.it.taels === undefined) return MAKER_USES.grain;
  return {};
}

// ── The sum ───────────────────────────────────────────────────────────────────────────────────

/**
 * What a maker uses a piece of a thing by its recipe (K1): each input by thing, a batch's count
 * over its yield, at the made thing's tier where the input comes at it, else its own.
 */
function recipeUses(l: Line, tier: number): { thing: string; each: number }[] {
  if (l.lot.uses) return [];
  const r = recipeFor(l.lot.thing);
  if (!r) return [];
  return r.inputs.map((i) => {
    const at = variantId(i.thing, undefined, { tier });
    return { thing: hasItem(at) ? at : i.thing, each: i.count / recipeYield(r) };
  });
}

/** Adds a maker's use of one thing at a market, into that thing's own good. */
function addThingUse(sum: MarketSum, m: Market, thing: string, plain: number): void {
  if (plain <= 0) return;
  const it = item(thing);
  const g = goodIn(sum, goodOf(thing), thing, needOf(thing, it), it);
  const pressure = pressureOn(m, thing);
  g.plain += plain;
  g.used += plain * pressure;
  g.pressure = pressure;
}

/** The tiers a market's sum counts: those its shops stock. */
const tiersOf = (m: Market) => Array.from({ length: marketTopTier(m) }, (_, i) => i + 1);

/** Adds a need's use at a market, shared evenly among the goods that fill it. */
function addUse(
  sum: MarketSum,
  m: Market,
  need: string,
  tier: number,
  mortal: boolean,
  plain: number,
): void {
  if (plain <= 0) return;
  const fillers = fillersOf(m, need, tier, mortal);
  const key = needKey(need, tier, mortal);
  const n = sum.needs.get(key) ?? { used: 0, plain: 0, fillers: fillers.length };
  sum.needs.set(key, n);
  n.plain += plain;
  for (const l of fillers) {
    const { thing, good } = atTier(l.lot.thing, tier);
    const g = goodIn(sum, good, thing, need, l.it);
    const share = plain / fillers.length;
    const pressure = pressureOn(m, thing);
    g.plain += share;
    g.used += share * pressure;
    g.pressure = pressure;
    n.used += share * pressure;
  }
  // A need nothing here fills is still counted, for a good sold to it from nowhere.
  if (fillers.length === 0) n.used += plain * pressureOnNeed(m, need);
}

function pressureOnNeed(m: Market, need: string): number {
  let x = 1;
  if (fillTags(need).some((t) => m.needs.includes(t))) x *= PRESSURE.written;
  return Math.min(PRESSURE.max, x);
}

const needKey = (need: string, tier: number, mortal: boolean) => `${need}|${mortal ? 'm' : tier}`;

function goodIn(sum: MarketSum, good: string, thing: string, need: string, it: Item): GoodSum {
  let g = sum.goods.get(good);
  if (!g) {
    g = {
      good,
      thing,
      need,
      used: 0,
      plain: 0,
      pressure: 1,
      made: 0,
      land: false,
      carried: 0,
      from: null,
      season: seasonOf(it),
    };
    sum.goods.set(good, g);
  }
  return g;
}

/** What a market can make at each tier: its catalog's lines at the tiers it stocks, its land's within its vein. */
function makes(m: Market, line: Line, tier: number): boolean {
  if (!line.made) return false;
  const top = line.made === 'land' ? Math.min(veinAt(m.id), marketTopTier(m)) : marketTopTier(m);
  return tier <= top && lotTiers(line.lot.thing, line.it.tier, [tier]).length > 0;
}

/** Whether a market makes a good at all: one of its lines made here, at the good's tier. */
function makerOf(m: Market, good: string): Line | null {
  const [base, t] = good.split('@t');
  const line = linesOf(m).find((l) => l.lot.thing === base);
  if (!line) return null;
  return makes(m, line, t ? Number(t) : line.it.tier) ? line : null;
}

/** Works out the world's sum: every market's baskets, its makers and their inputs, and what is carried. */
function sumWorld(w: World, month: number): Map<string, MarketSum> {
  const day = month * DAYS_PER_MONTH;
  const sums = new Map<string, MarketSum>(
    MARKETS.map((m) => [m.id, { goods: new Map(), needs: new Map() }]),
  );
  // The baskets.
  for (const m of MARKETS) {
    const sum = sums.get(m.id)!;
    const pop = populationOf(w, m.id);
    const scale = PROSPERITY[prosperityOf(w, m.id, day)]!.wages;
    const tiers = tiersOf(m);
    for (const need of Object.keys(BASKET) as BasketNeed[]) {
      BASKET[need].forEach((each, who) => {
        if (each <= 0 || (who > 0 && !tiers.includes(who))) return;
        const heads = pop[WHO_KEYS[who as Who]] ?? 0;
        addUse(sum, m, need, Math.max(1, who), who === 0, each * heads * scale);
      });
    }
  }
  // What a maker makes: half again what its own people use, or what its reach's use when its own
  // use none of it.
  const makeAll = () => {
    for (const m of MARKETS) {
      const sum = sums.get(m.id)!;
      for (const line of linesOf(m)) {
        for (const tier of tiersOf(m)) {
          if (!makes(m, line, tier)) continue;
          const { thing, good } = atTier(line.lot.thing, tier);
          const own = sum.goods.get(good)?.used ?? 0;
          const theirs =
            own > 0
              ? 0
              : reachOf(m).reduce((t, o) => t + (sums.get(o.id)!.goods.get(good)?.used ?? 0), 0);
          const made = MAKE_SHARE * (own || theirs);
          if (made <= 0) continue;
          const g = goodIn(sum, good, thing, needOf(line.lot.thing, line.it), line.it);
          g.made = made;
          g.land = line.made === 'land';
        }
      }
    }
  };
  makeAll();
  // What the makers use, one step deep: inputs use nothing.
  for (const m of MARKETS) {
    const sum = sums.get(m.id)!;
    const made = [...sum.goods.values()].filter((g) => g.made > 0);
    for (const g of made) {
      const line = makerOf(m, g.good);
      if (!line) continue;
      const tier = item(g.thing).tier;
      for (const [need, each] of Object.entries(makerUses(line)))
        addUse(sum, m, need, tier, false, each * g.made);
      for (const u of recipeUses(line, tier)) addThingUse(sum, m, u.thing, u.each * g.made);
    }
  }
  // A market's own workshops brew a share of the recipe goods it uses but doesn't make (K1), so
  // their inputs are used here too and stand on its shelves.
  for (const m of MARKETS) {
    const sum = sums.get(m.id)!;
    const kinds = new Set(shopsAt(m.id).map((id) => shopKindOf.get(id)));
    for (const g of [...sum.goods.values()]) {
      if (g.made > 0 || g.plain <= 0) continue;
      const r = recipeFor(g.thing);
      const shop = r && WORKSHOP[r.craft];
      if (!r || !shop || !kinds.has(shop)) continue;
      const tier = item(g.thing).tier;
      for (const i of r.inputs) {
        const at = variantId(i.thing, undefined, { tier });
        const thing = hasItem(at) ? at : i.thing;
        addThingUse(sum, m, thing, (BREWED_HERE * g.plain * i.count) / recipeYield(r));
      }
    }
  }
  makeAll();
  // What is carried in: a good a market doesn't make comes from a market in its reach that makes
  // it, along a tie, or from its region's and continent's trade, up to its unpressured use.
  for (const m of MARKETS) {
    const sum = sums.get(m.id)!;
    for (const g of sum.goods.values()) {
      if (g.made > 0 || g.used <= 0) continue;
      g.from = carrierOf(m, g.good);
      if (g.from) g.carried = g.plain;
    }
  }
  return sums;
}

/** The need a thing's good is filed under, for the line of why. */
function needOf(thing: string, it: Item): string {
  const tags = goodTags(thing);
  const fills = Object.keys(BASKET).find((n) => fillTags(n).some((t) => tags.includes(t)));
  if (fills) return fills;
  return Object.keys(NEED_WORDS).find((n) => tags.includes(n)) ?? itemKind(it);
}

/** Where a good a market doesn't make comes from. */
function carrierOf(m: Market, good: string): Carrier | null {
  const base = good.split('@t')[0]!;
  if (reachOf(m).some((o) => makerOf(o, good))) return 'reach';
  if (wideLots(m, 'import').some((l) => l.thing === base)) return 'import';
  if (wideLots(m, 'local').some((l) => l.thing === base)) return 'local';
  return null;
}

// ── Reading the sum ───────────────────────────────────────────────────────────────────────────

/** The world's sums, kept until who lives where or how well-off they are moves. */
const sumCache = new Map<string, Map<string, MarketSum>>();

function worldKey(w: World, month: number): string {
  const day = month * DAYS_PER_MONTH;
  // Offsets eased all the way back move nothing, so the written sums still hold.
  if (!prosperityMoved(w, day) && Object.keys(w.population).length === 0) return 'written';
  return `${MARKETS.map((m) => prosperityOf(w, m.id, day)).join(',')}|${JSON.stringify(w.population)}`;
}

/** A market's monthly sum in a world. */
export function marketSum(w: World, m: Market, month: number): MarketSum {
  const key = worldKey(w, month);
  let sums = sumCache.get(key);
  if (!sums) {
    if (sumCache.size > 32) sumCache.clear();
    sums = sumWorld(w, month);
    sumCache.set(key, sums);
  }
  return sums.get(m.id)!;
}

/**
 * The harvest's share of a seasonal good's yearly making in a month (Harvests): ×1.4 in its harvest
 * month, falling evenly to ×0.6 the month before the next; ×1 for anything else.
 */
export function harvestFactor(season: GoodSum['season'], month: number): number {
  if (!season) return 1;
  const since = (((month - HARVEST.months[season]) % 12) + 12) % 12;
  return HARVEST.high - ((HARVEST.high - HARVEST.low) * since) / 11;
}

/** Where a good in the sum rests this month: 100 × (made + carried) ÷ used, 25% to 200%. */
export function restAt(g: GoodSum, month: number): number {
  const h = harvestFactor(g.season, month);
  if (g.used <= 0) return SUPPLY_MAX;
  const n = (100 * (g.made + g.carried) * h) / g.used;
  return Math.min(SUPPLY_MAX, Math.max(SUPPLY_MIN, n));
}

/**
 * A good a market's people would use but nobody in its layers makes or carries (a basket good from
 * nowhere): the need it fills here at its tier, if any, and its share of that need's use.
 */
function outsider(sum: MarketSum, thing: string): { used: number } | null {
  if (hasCopy(thing)) return null;
  const it = item(thing);
  if (!inSum({ thing, shops: ['stall'] })) return null;
  const tags = goodTags(thing);
  const mortal = it.taels !== undefined;
  for (const [key, n] of sum.needs) {
    const [need, at] = key.split('|');
    if (mortal ? at !== 'm' : at !== String(it.tier)) continue;
    if (fillTags(need!).some((t) => tags.includes(t)) && n.used > 0)
      return { used: n.used / Math.max(1, n.fillers) };
  }
  return null;
}

/**
 * Where a good rests at a market this month, if the monthly sum counts it: one its people or
 * makers use or its makers make, or one sold to it that fills a need nobody here makes or carries,
 * which rests at 25%. Null for a good outside the sum (gear above wear, treasures, coveted things,
 * copies, mounts, the hunt's beast parts), which keeps its written supply.
 */
export function restOf(w: World, m: Market, thing: string, month: number): number | null {
  if (hasCopy(thing)) return null;
  const sum = marketSum(w, m, month);
  const g = sum.goods.get(goodOf(thing));
  if (g && (g.used > 0 || g.made > 0)) return restAt(g, month);
  return outsider(sum, thing) ? SUPPLY_MIN : null;
}

/** A market's month of use of a good in the sum, pressures on: what a lot is measured against. */
export function monthUse(w: World, m: Market, thing: string, month: number): number | null {
  const sum = marketSum(w, m, month);
  const g = sum.goods.get(goodOf(thing));
  if (g && g.used > 0) return g.used;
  if (g && g.made > 0) return g.made;
  return outsider(sum, thing)?.used ?? null;
}

// ── The line of why ───────────────────────────────────────────────────────────────────────────

/** A good's worth a piece in low-grade stones, a mortal good's taels counted at 100 to the stone. */
function worth(thing: string): number {
  const it = item(thing);
  return it.taels !== undefined ? it.taels / 100 : priceOf(thing);
}

/** A need a market runs short of this month, from the monthly sum. */
export interface Shortage {
  need: string;
  /** The gap's worth a month in low-grade stones: what is used less what is made and carried in. */
  worth: number;
  /** The goods short in it, biggest gap first. */
  goods: string[];
  /** Some of it is carried in from reach, so it isn't for want of a maker. */
  carried: boolean;
  /** Short only by the season: unpressured, it is made and carried in enough. */
  seasonal: boolean;
  /** A written need of the market's, with its reason. */
  written: boolean;
}

/** Each good's gap this month: short by need, and the biggest surplus of a good made here. */
function gaps(sum: MarketSum, m: Market, month: number) {
  const short = new Map<string, Shortage & { by: Map<string, number> }>();
  let surplus: { g: GoodSum; worth: number } | null = null;
  for (const g of sum.goods.values()) {
    const h = harvestFactor(g.season, month);
    const gap = (g.used - (g.made + g.carried) * h) * worth(g.thing);
    if (gap > 0 && restAt(g, month) < 100) {
      const s = short.get(g.need) ?? {
        need: g.need,
        worth: 0,
        goods: [],
        carried: false,
        seasonal: false,
        written: !!reasonFor(m, g.need),
        by: new Map<string, number>(),
      };
      s.worth += gap;
      s.by.set(g.thing, (s.by.get(g.thing) ?? 0) + gap);
      s.carried ||= g.carried > 0;
      s.seasonal ||= g.pressure === 1 && g.made + g.carried >= g.plain;
      short.set(g.need, s);
    } else if (gap < 0 && g.made > 0 && (!surplus || -gap > surplus.worth))
      surplus = { g, worth: -gap };
  }
  return { short: [...short.values()], surplus };
}

/**
 * A market's shortages this month, a written need's ahead of the rest and each by its gap's worth
 * (the line of why's order). The first is the market's biggest shortage, which K12's commissions
 * post for.
 */
export function shortages(w: World, m: Market, month: number): Shortage[] {
  return ranked(gaps(marketSum(w, m, month), m, month).short);
}

function ranked(short: ReturnType<typeof gaps>['short']): Shortage[] {
  return short
    .sort((a, b) => Number(b.written) - Number(a.written) || b.worth - a.worth)
    .map(({ by, ...s }) => ({ ...s, goods: [...by].sort((a, b) => b[1] - a[1]).map(([t]) => t) }));
}

/**
 * The place screen's line of why (The guards, One line of why): a market's biggest gap and its
 * cause, from the sum's own terms. A shortage of a written need comes first, with its written
 * reason; otherwise the biggest gap by worth, a shortage or a surplus. Null where nothing is off.
 */
export function whyOf(w: World, m: Market, day: number): string | null {
  const month = Math.floor(day / DAYS_PER_MONTH);
  const { short, surplus } = gaps(marketSum(w, m, month), m, month);
  const top = ranked(short)[0];
  if (top && (top.written || !surplus || top.worth >= surplus.worth)) return shortLine(m, top);
  return surplus ? surplusLine(m, surplus.g) : null;
}

/** A written need's reason for a need word, matched by the tags that fill it. */
function reasonFor(m: Market, need: string): string | undefined {
  for (const t of [need, ...fillTags(need)]) if (m.why[t]) return m.why[t];
  return undefined;
}

export function shortLine(m: Market, s: Shortage): string {
  const need = s.need;
  const word = NEED_WORDS[need] ?? { word: need };
  const head = `${capitalize(word.word)} ${word.one ? 'runs' : 'run'} short`;
  const land = landOf(m);
  const thin = need === PRESSURE.thin.tag && land.qi <= PRESSURE.thin.qi;
  const wet =
    need === PRESSURE.wet.tag && (PRESSURE.wet.lands as readonly string[]).includes(land.terrain);
  const reason = reasonFor(m, need);
  const more = thin && !reason?.includes('thin qi') ? ', on thin qi' : wet ? ', in the damp' : '';
  if (reason) return `${head}: ${reason}${more}.`;
  if (thin)
    return `${head}: thin qi burns ${word.one ? 'it' : 'them'} faster than ${word.one ? 'it comes' : 'they come'} in.`;
  if (wet) return `${head}: the damp breeds poisons faster than the pills come in.`;
  if (!s.carried) return `${head}: nobody within reach makes ${word.one ? 'it' : 'them'}.`;
  return `${head} before the harvest.`;
}

function surplusLine(m: Market, g: GoodSum): string {
  const it = item(g.thing);
  const name = it.name.toLowerCase();
  const one = isStaple(g.thing);
  const is = one ? 'is' : 'are';
  const it_ = one ? 'it' : 'them';
  if (g.used <= 0)
    return `${capitalize(name)} ${one ? 'piles' : 'pile'} up: ${m.name} makes ${it_} for the markets round it.`;
  if (g.land)
    return `${capitalize(name)} ${is} cheap: the ${landOf(m).terrain} round ${m.name} gives half again what it uses.`;
  const grain = g.season === 'grain';
  return `${capitalize(name)} ${is} cheap: ${m.name} ${grain ? 'grows' : 'makes'} half again what it ${grain ? 'eats' : 'uses'}.`;
}

/**
 * What the land grows at a spot in the wilds (O4, the gather hour): the herb, material and staple
 * lines naming its terrain in its region's catalogs and its continent's, on a vein at least as
 * strong as the line asks. Sorted by thing, so a seeded pick holds on any machine.
 */
export function landLines(region: string, terrain: string, vein: number): string[] {
  const continent = SHOPS.find((sh) => sh.region === region)?.continent ?? null;
  const things = new Set<string>();
  for (const c of CATALOGS) {
    const mine = c.layer === 'continent' ? c.at === continent : catalogRegion(c) === region;
    if (!mine) continue;
    for (const l of c.lots)
      if (l.land?.includes(terrain) && vein >= (l.landVein ?? 0)) things.add(l.thing);
  }
  return [...things].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
