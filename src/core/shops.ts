// Shops in play (design § World bible, Stones, silver and shops in play; § Items and gear, Loot
// and shops; § Economy, What a market holds): a month's stock drawn from the shop's catalogs
// (content/catalogs/) and the markets in its reach, buying and selling at its market's prices
// with a purse its prosperity sizes, one haggle a visit, stolen goods recognized, and a refiner's
// repairs. A shop's stock is seeded by its id and the month, so the same stall shows the same lots
// to anyone with the same world, and buying draws no stream. What you have done to a shop this
// month is kept in `world.shops`, and to its market's supplies in `world.supply`. Since E3 a staple
// stands on the shelf where it is made and a copy where its market bought one, sold lot by lot.
import { DAYS_PER_MONTH } from '../content/calendar.ts';
import { CATALOGS } from '../content/catalogs/index.ts';
import { RARE } from '../content/catalogs/rare.ts';
import type { Catalog, Lot } from '../content/catalogs/types.ts';
import { copyChapter, copyManual, copyTitle, hasCopy } from '../content/copies.ts';
import { waitsOn } from './journal.ts';
import { baseOf, hasItem, item, itemKind, variantId } from '../content/items.ts';
import { CRACK_MEND_SHARE, mended } from './crafts.ts';
import {
  HOUSE_TAKE,
  LENT_WEIGHT,
  NEED_RATE,
  SHELF_SHARE,
  OPENING_CHAPTERS,
  TIER_LEAN,
  TIER_LEAN_FROM,
} from '../content/markets.ts';
import { OPEN_COUNTER } from '../content/organizations.ts';
import { RARITY_IDS, rarityRank, type RarityId } from '../content/rarity.ts';
import {
  DAMAGE_REPAIR_SHARE,
  FRIENDLY_BUY_RATE,
  HAGGLE_OFF,
  MAKER_BUY_RATE,
  TOOL_STREET,
  PRICE_SPREAD,
  REPAIR_SHARE,
  doorOf,
  doorsAt,
  keeperName,
  SHOP_KIND_INFO,
  shop as shopById,
  STREET_ORDER,
  STREETS,
  type Shop,
  type ShopKind,
  type Ware,
  shopVein,
} from '../content/shops.ts';
import { rollBiased } from './combat/generate.ts';
import { lotShape } from './loot.ts';
import { roomFor, wornIds } from './gear.ts';
import { gainCopy } from './life.ts';
import {
  copyInto,
  goodOf,
  guardedBy,
  isStaple,
  lentLots,
  lotSize,
  lotTiers,
  marketFactor,
  marketOfShop,
  marketTopTier,
  moveSupply,
  openSupply,
  placeChain,
  shopLots,
  shopPurse,
  shopTiers,
  spreads,
  standingCopies,
  shortAtRest,
  wanted,
  type Market,
} from './markets.ts';
import { counterSells, hallTerms, pavilionKeeps, titheFor } from './halls.ts';
import { marketSum } from './making.ts';
import {
  addBalance,
  givenBy,
  houseOf,
  isOrganization,
  membership,
  monthIndex,
} from './organizations.ts';
import { priceOf } from './prices.ts';
import { pay, paySilver, receive, stonesOf, tierGrade, withStones } from './purse.ts';
import { actorFromCultivator, plainActor } from './resolver/actor.ts';
import { isMember } from './resolver/names.ts';
import { rollNature } from './resolver/nature.ts';
import { addStanding, opinion, remember } from './resolver/opinion.ts';
import { talkCheck } from './resolver/talk.ts';
import { addHeat, emptyWorld, standingOf, type ShopMonth, type World } from './resolver/world.ts';
import { leakSold, oathRefusal, ownGoodSold } from './guarded.ts';
import { craftLevel, markedHeld, markLift, soldMarked, unmark } from './craftRenown.ts';
import { ownGood, styleLines, tradesAt } from './styles.ts';
import { recipeFor, type CraftId } from '../content/crafts.ts';
import { hashSeed, Rng } from './rng.ts';
import { addEvent, addItem, itemCount, type GameState } from './state.ts';
import { cultivator, giveTo, payFrom, withCultivator } from './who.ts';

/** A staple: the `trade` tag (core/markets.ts). */
export { isStaple } from './markets.ts';

/** One lot on a shop's shelf this month: what, how many, and the posted price of one. */
export interface StockLot {
  /** Its place on the shelf, which buying it marks. */
  slot: number;
  thing: string;
  n: number;
  /** In low-grade stones, or taels at a mortal shop. */
  price: number;
  /**
   * A line that stands on the shelf all month (E3): a staple made here or a copy its market made,
   * bought by the lot as often as you like, its price climbing as the supply falls.
   */
  standing?: boolean;
  /** A standing line that never runs out: a copy, or a staple a sect's hall makes (E3). */
  endless?: boolean;
}

/**
 * A price as a shelf posts it (the code review's `askAt`): a standing line to the hundredth, a
 * display lot to the tenth, never under its step.
 */
export function askAt(price: number, standing = false): number {
  const step = standing ? 100 : 10;
  return Math.max(1 / step, Math.round(price * step) / step);
}

/** A shop's prices against the posted rate, drawn once from its id: 0.9 to 1.15. */
export function priceFactor(s: Shop): number {
  const u = hashSeed(`price/${s.id}`) / 4294967296;
  return PRICE_SPREAD[0] + u * (PRICE_SPREAD[1] - PRICE_SPREAD[0]);
}

/**
 * The catalogs a shop draws on: its place's and its kingdom's, its region's, its continent's and
 * the imports.
 */
export function catalogsFor(s: Shop): Catalog[] {
  const at = placeChain(s.at);
  return CATALOGS.filter(
    (c) =>
      (c.layer === 'place' && at.includes(c.at)) ||
      (c.layer === 'region' && c.at === s.region) ||
      (c.layer === 'continent' && c.at === s.continent) ||
      (c.layer === 'import' && c.at === s.region),
  );
}

/** A lot's thing at a tier, the rarities it comes at, and its weight on the shelf. */
interface Candidate {
  lot: Lot;
  w: number;
  tier: number;
  rarities: RarityId[];
  /** Its good at its lowest rarity: what a shelf may already stand (E5). */
  floor: string;
}

/**
 * Higher tiers are rare on a shelf (content/markets.ts `TIER_LEAN`): a tenth for each tier above
 * Foundation's and one more when its maker raised it, a step less for a good made here.
 */
export function tierLean(tier: number, written: number, made: boolean): number {
  const steps = Math.max(0, tier - TIER_LEAN_FROM) + (tier > written ? 1 : 0) - (made ? 1 : 0);
  return TIER_LEAN ** Math.max(0, steps);
}

/** Whether a catalog line is the market's (E5): sold by some shop, not only a power's hall or a black market. */
function honest(l: Lot): boolean {
  return l.shops.some((k) => k !== 'sect' && k !== 'black-market');
}

/**
 * The district that claims a thing (`STREET_ORDER`): a mortal good the grain and cloth market, then
 * a tag (ink, ore, hide or horn, grain), then its kind; anything else the free market.
 */
const claimCache = new Map<string, ShopKind>();
export function claimOf(thing: string): ShopKind {
  let k = claimCache.get(thing);
  if (!k) {
    k = claimFresh(thing);
    claimCache.set(thing, k);
  }
  return k;
}

function claimFresh(thing: string): ShopKind {
  if (hasCopy(thing)) return 'stall';
  const it = item(thing);
  if (it.taels !== undefined) return 'mortal';
  const tags: readonly string[] = it.tags ?? [];
  const streets = STREET_ORDER.filter((k) => k !== 'mortal');
  for (const k of streets) if (STREETS[k]!.tags.some((t) => tags.includes(t))) return k;
  const kind = itemKind(it);
  // A craft's tool sells on its craft's street (the crafts play checkpoint): a furnace on Pill Street.
  const tool = it.uses.tool?.craft;
  if (kind === 'tool' && tool && TOOL_STREET[tool]) return TOOL_STREET[tool]!;
  for (const k of streets) if (STREETS[k]!.wares.includes(kind)) return k;
  return 'stall';
}

/**
 * The district at a market that sells a thing (E5): its own, else the free market, else none, when
 * only a trading house carries it. A mortal good has only the grain and cloth market.
 */
const sellerCache = new Map<string, ShopKind | null>();
function sellerAt(m: Market, thing: string): ShopKind | null {
  const key = `${m.id}|${thing}`;
  let seller = sellerCache.get(key);
  if (seller === undefined) {
    seller = sellerFresh(m, thing);
    sellerCache.set(key, seller);
  }
  return seller;
}

function sellerFresh(m: Market, thing: string): ShopKind | null {
  const kinds = new Set(doorsAt(m.id).map((d) => d.kind));
  const k = claimOf(thing);
  if (kinds.has(k)) return k;
  if (k === 'mortal') return null;
  return kinds.has('stall') ? 'stall' : null;
}

/** Whether a district shop or a trading house deals in a thing at its market. */
function sellsHere(s: Shop, m: Market | undefined, thing: string): boolean {
  if (!m) return false;
  if (s.kind === 'house') return hasCopy(thing) || item(thing).taels === undefined;
  return sellerAt(m, thing) === s.kind;
}

/** A shop that keeps its own written stock (a sect's hall, a black market), not a window on its market's. */
const keepsOwn = (s: Shop) => s.kind === 'sect' || s.kind === 'black-market';

/** One good a market's shelves can stand: a thing at its lowest rarity and a tier, and whether it is imported. */
interface PoolGood {
  thing: string;
  good: string;
  tier: number;
  imported: boolean;
}

/**
 * What a market's shops can stand (E5, Shelves): every honest line of its catalogs and the gold and
 * red list, and all its reach lends, at its lowest rarity and each tier the market stocks.
 */
const poolCache = new Map<string, PoolGood[]>();
function poolOf(m: Market): PoolGood[] {
  let out = poolCache.get(m.id);
  if (out) return out;
  out = [];
  const seen = new Set<string>();
  const tiers = Array.from({ length: marketTopTier(m) }, (_, i) => i + 1);
  const at = placeChain(m.place);
  const add = (lots: readonly Lot[], imported: boolean, lent = false) => {
    for (const lot of lots) {
      if ((!lent && !honest(lot)) || hasCopy(lot.thing)) continue;
      const shape = lotShape(lot.thing, { mortal: true });
      if (!shape) continue;
      for (const tier of lotTiers(lot.thing, shape.tier, tiers)) {
        const thing = variantId(lot.thing, shape.rarities[0], { tier });
        const good = goodOf(thing);
        if (seen.has(good)) continue;
        seen.add(good);
        out!.push({ thing, good, tier, imported });
      }
    }
  };
  for (const c of CATALOGS) {
    const mine =
      (c.layer === 'place' && at.includes(c.at)) ||
      (c.layer === 'region' && c.at === m.region) ||
      (c.layer === 'continent' && c.at === m.continent);
    if (mine) add(c.lots, false);
  }
  add(RARE.lots, false);
  // What a market in reach lends is the market's here, whoever sells it at home (E2).
  add(
    lentLots(m).map((l) => l.lot),
    false,
    true,
  );
  for (const c of CATALOGS) if (c.layer === 'import' && c.at === m.region) add(c.lots, true);
  poolCache.set(m.id, out);
  return out;
}

/**
 * Whether a shop of a district carries a good (E5): every shop of a district listed whole and the
 * small shops carry everything; a notable shop beside the small shops carries its district's
 * biggest good (a grain store its grain) and each other on an even chance seeded by its id.
 */
function carries(sh: Shop, good: string, biggest: string | null): boolean {
  const door = doorOf(sh.id);
  if (!door || sh.small || good === biggest || !door.shops.some((id) => shopById(id).small))
    return true;
  return hashSeed(`carry/${sh.id}/${good}`) / 4294967296 < SPECIALTY;
}

/**
 * A market's shelves for a month, worked out once a world: each pool good's month (what its people
 * use of it, or make where nobody here uses it) and the goods that stand, those its sum counts.
 */
interface ShelfPlan {
  flow: Map<string, number>;
  stands: Set<string>;
}
const planCache = new WeakMap<World, Map<string, ShelfPlan>>();
function planOf(w: World, m: Market, month: number): ShelfPlan {
  let byKey = planCache.get(w);
  if (!byKey) {
    byKey = new Map();
    planCache.set(w, byKey);
  }
  const key = `${m.id}|${month}`;
  let plan = byKey.get(key);
  if (!plan) {
    const sum = marketSum(w, m, month);
    const flow = new Map<string, number>();
    for (const g of poolOf(m)) {
      const gs = sum.goods.get(g.good);
      flow.set(g.good, gs ? (gs.used > 0 ? gs.used : gs.made) : 0);
    }
    const stands = new Set([...flow].filter(([, f]) => f > 0).map(([good]) => good));
    plan = { flow, stands };
    byKey.set(key, plan);
  }
  return plan;
}

/** The goods in a market's pool that stand on its shelves this month: those its sum counts. */
export function standsAt(w: World, m: Market, month: number): ReadonlySet<string> {
  return planOf(w, m, month).stands;
}

/** The share of a good a notable shop beside the small shops carries. */
const SPECIALTY = 0.5;

/**
 * The goods a district shop or a trading house stands on its shelf this month (E5, Shelves): of each
 * good in its market's sum that it sells, a tenth of the month's use (or making, where nobody here
 * uses it) times its supply as the month opened, a trading house taking a fifth off the top (two
 * fifths of an import) and the district's shops sharing the rest by their weights among those that
 * carry it.
 */
function standingGoods(s: Shop, w: World, month: number): { thing: string; n: number }[] {
  const m = marketOfShop(s.id);
  if (!m || keepsOwn(s) || s.kind === 'bounty') return [];
  const tiers = shopTiers(s);
  const houses = doorsAt(m.id).filter((d) => d.kind === 'house').length;
  const door = doorOf(s.id);
  const plan = planOf(w, m, month);
  const mine = poolOf(m).filter((g) => sellsHere(s, m, g.thing));
  let biggest: string | null = null;
  let most = 0;
  for (const g of mine) {
    const f = plan.flow.get(g.good)!;
    if (f > most) [biggest, most] = [g.good, f];
  }
  const out: { thing: string; n: number }[] = [];
  for (const g of mine) {
    if (!tiers.includes(g.tier)) continue;
    const good = g.good;
    const flow = plan.flow.get(good)!;
    if (flow <= 0) continue;
    const onHand = (flow * openSupply(w, m, g.thing, month) * SHELF_SHARE) / 100;
    const take = houses ? HOUSE_TAKE[g.imported ? 'import' : 'plain'] : 0;
    let n: number;
    if (s.kind === 'house') n = (onHand * take) / houses;
    else {
      const carriers = (door?.shops ?? [s.id])
        .map((id) => shopById(id))
        .filter((x) => carries(x, good, biggest));
      if (!carriers.some((x) => x.id === s.id)) continue;
      const weights = carriers.reduce((t, x) => t + x.weight, 0);
      n = (onHand * (1 - take) * s.weight) / weights;
    }
    n = Math.floor(n);
    if (n >= 1) out.push({ thing: g.thing, n });
  }
  return out;
}

/**
 * What a shop could roll for its display lots: each lot of its catalogs weighted by its layer's
 * share and its own weight, at each tier it comes at, and what the markets in its reach lend,
 * sharing 15 of the place weight. A district shop or a trading house takes the honest lines its
 * door sells (E5), never at the rarity it already stands on the shelf; a sect's hall and a black
 * market take the lines that name their kind, and neither borrows.
 */
function candidates(s: Shop, standing: ReadonlySet<string>): Candidate[] {
  const out: Candidate[] = [];
  for (const c of everyCandidate(s)) {
    if (!standing.has(c.floor)) out.push(c);
    else if (c.rarities.length > 1) out.push({ ...c, rarities: c.rarities.slice(1) });
  }
  return out;
}

/** Everything a shop could roll, before what its market stands this month: worked out once. */
const candidateCache = new Map<string, Candidate[]>();
function everyCandidate(s: Shop): Candidate[] {
  const kept = candidateCache.get(s.id);
  if (kept) return kept;
  const info = SHOP_KIND_INFO[s.kind];
  const tiers = shopTiers(s);
  const m = marketOfShop(s.id);
  const own = keepsOwn(s);
  const out: Candidate[] = [];
  const add = (
    lots: readonly Lot[],
    layerWeight: number,
    o: { made?: boolean; lent?: boolean } = {},
  ) => {
    const fit = lots.filter((l) => {
      // A style's later chapters are a sect's, a ruin's or an auction's, never a market's.
      if (s.kind !== 'sect' && hasCopy(l.thing) && copyChapter(l.thing) > OPENING_CHAPTERS)
        return false;
      if (own) {
        // A staple made here stands in the hall all month (`hallLines`).
        if (o.made && isStaple(l.thing)) return false;
        return l.shops.includes(s.kind);
      }
      return (o.lent || honest(l)) && hasStock(l.thing) && sellsHere(s, m, l.thing);
    });
    const sum = fit.reduce((t, l) => t + (l.weight ?? 1), 0);
    for (const lot of fit) {
      const shape = lotShape(lot.thing, { mortal: true });
      if (!shape) continue;
      // A mortal shop deals in mortal goods and nothing else does, lent or not (E3).
      if (!hasCopy(lot.thing) && (s.kind === 'mortal') !== (item(lot.thing).taels !== undefined))
        continue;
      const lean = info.leans?.[wareOf(lot.thing) ?? 'copy'] ?? 1;
      const w = (layerWeight * (lot.weight ?? 1) * lean) / sum;
      for (const tier of lotTiers(lot.thing, shape.tier, tiers)) {
        const floor = hasCopy(lot.thing)
          ? lot.thing
          : goodOf(variantId(lot.thing, shape.rarities[0], { tier }));
        const rarities = shape.rarities;
        out.push({ lot, w: w * tierLean(tier, shape.tier, !!o.made), tier, rarities, floor });
      }
    }
  };
  for (const c of catalogsFor(s)) add(c.lots, info.layers[c.layer], { made: c.layer === 'place' });
  // The gold and red list: a shop that stocks such a thing at all rolls for it like any other.
  add(RARE.lots, info.layers.continent);
  if (m && !own)
    add(
      lentLots(m).map((l) => l.lot),
      LENT_WEIGHT,
      { lent: true },
    );
  candidateCache.set(s.id, out);
  return out;
}

/** The lines a shop always stands (a catalog line's `stands`): a craft's starter tool at its floor. */
function toolLines(s: Shop): { thing: string; n: number }[] {
  const out = new Map<string, number>();
  for (const c of everyCandidate(s))
    if (c.lot.stands && !out.has(c.floor)) out.set(c.floor, c.lot.stands);
  return [...out].map(([thing, n]) => ({ thing, n }));
}

/** A thing a shelf can hold: a copy or an item. */
const hasStock = (thing: string) => hasCopy(thing) || hasItem(thing);

function weighted(rng: Rng, cs: readonly Candidate[]): Candidate {
  const total = cs.reduce((t, c) => t + c.w, 0);
  let u = rng.next() * total;
  for (const c of cs) {
    u -= c.w;
    if (u < 0) return c;
  }
  return cs[cs.length - 1]!;
}

/** The world nothing has happened in: a shop's stock read without one. */
const EMPTY = emptyWorld();

/** Where the standing lines start on the shelf, past any month's rolled lots. */
const STANDING_SLOT = 1000;

/**
 * The lines a sect's hall or a black market stands all month (E3's talk): each staple its place
 * makes that its kind sells, at each tier it stocks, a lot of its catalog count, bought as often as
 * you like.
 */
function hallLines(s: Shop): { thing: string; n: number }[] {
  const out: { thing: string; n: number }[] = [];
  const tiers = shopTiers(s);
  for (const c of catalogsFor(s)) {
    if (c.layer !== 'place') continue;
    for (const lot of c.lots) {
      if (!isStaple(lot.thing) || !lot.shops.includes(s.kind)) continue;
      const it = item(lot.thing);
      const [lo, hi] = lot.count ?? [1, 1];
      const n = Math.max(1, Math.round((lo + hi) / 2));
      for (const tier of lotTiers(lot.thing, it.tier, tiers))
        out.push({ thing: variantId(lot.thing, it.rarity, { tier }), n });
    }
  }
  return out;
}

/**
 * A rarity rolled on the shared table at the shop's bias, then the nearest rarity anything it
 * stocks comes at: down first (a gold roll with nothing gold lands purple), then up.
 */
function settleRarity(r: RarityId, cs: readonly Candidate[]): RarityId | null {
  const has = (x: RarityId) => cs.some((c) => c.rarities.includes(x));
  const at = rarityRank(r);
  for (let i = at; i >= 0; i--) if (has(RARITY_IDS[i]!)) return RARITY_IDS[i]!;
  for (let i = at + 1; i < RARITY_IDS.length; i++) if (has(RARITY_IDS[i]!)) return RARITY_IDS[i]!;
  return null;
}

/** A shop's prices against the posted rate: its own spread and its kind's markup; the small shops at the posted rate. */
function shopFactor(s: Shop): number {
  return (s.small ? 1 : priceFactor(s)) * SHOP_KIND_INFO[s.kind].markup;
}

/**
 * A shop's stock for a month, at its posted prices (E5): the goods standing on its shelf by the
 * count, then its display lots, the same for the same shop and month in the same world.
 */
export function stockOf(shopId: string, month: number, w: World = EMPTY): StockLot[] {
  const s = shopById(shopId);
  const info = SHOP_KIND_INFO[s.kind];
  const rng = new Rng(hashSeed(`stock/${s.id}/${month}`));
  const goods = standingGoods(s, w, month);
  const tools = keepsOwn(s) ? [] : toolLines(s);
  const m = marketOfShop(s.id);
  // A display lot is a better rarity, or a thing the sum doesn't stand: never a shelf's own.
  const stands = new Set([
    ...(m && !keepsOwn(s) ? standsAt(w, m, month) : []),
    ...tools.map((t) => t.thing),
  ]);
  let pool = candidates(s, stands);
  const factor = shopFactor(s);
  const posted = (thing: string) => (s.kind === 'mortal' ? item(thing).taels! : priceOf(thing));
  const out: StockLot[] = [];
  const lots = shopLots(w, s, month * DAYS_PER_MONTH);
  for (let slot = 0; slot < lots && pool.length > 0; slot++) {
    const rolled = s.kind === 'mortal' ? 'white' : rollBiased(rng, info.bias);
    const r = settleRarity(rolled, pool);
    if (!r) break;
    const pick = weighted(
      rng,
      pool.filter((c) => c.rarities.includes(r)),
    );
    pool = pool.filter((c) => c !== pick);
    const thing = hasCopy(pick.lot.thing)
      ? pick.lot.thing
      : variantId(pick.lot.thing, r, { tier: pick.tier });
    const [lo, hi] = pick.lot.count ?? [1, 1];
    const n = rng.int(lo, hi);
    out.push({
      slot,
      thing,
      n,
      price: askAt(posted(thing) * factor),
    });
  }
  const lines: { thing: string; n: number; endless?: boolean }[] = [
    ...goods,
    ...tools,
    ...(keepsOwn(s) ? hallLines(s).map((l) => ({ ...l, endless: true })) : []),
    // A power's shop stands the goods of the styles it holds, brewed in its own hall (K6).
    ...styleLines(s),
    ...standingCopies(w, s, month).map((thing) => ({ thing, n: 1, endless: true })),
  ];
  lines.forEach(({ thing, n, endless }, i) => {
    const price = askAt(posted(thing) * factor, true);
    out.push({
      slot: STANDING_SLOT + i,
      thing,
      n,
      price,
      standing: true,
      ...(endless ? { endless } : {}),
    });
  });
  return out;
}

const stocking = new Map<string, boolean>();

/**
 * Whether a shop could ever stock a thing, in any month: a display lot it can roll, a good its
 * market stands with it as the seller, a hall's or a style's own line. The regional cast reads only
 * those shelves for their pill (N2).
 */
export function mayStock(shopId: string, thing: string): boolean {
  const key = `${shopId}|${thing}`;
  let may = stocking.get(key);
  if (may === undefined) {
    const s = shopById(shopId);
    const is = (l: { thing: string }) => baseOf(l.thing) === thing;
    may =
      everyCandidate(s).some((c) => is(c.lot)) ||
      styleLines(s).some(is) ||
      (keepsOwn(s) ? hallLines(s).some(is) : sellsHere(s, marketOfShop(s.id), thing));
    stocking.set(key, may);
  }
  return may;
}

/** What you have done to a shop this month: nothing, when the month has turned. */
export function shopMonth(w: World, shopId: string, day: number): ShopMonth {
  const m = monthIndex(day);
  const kept = w.shops[shopId];
  return kept && kept.month === m
    ? kept
    : { month: m, bought: [], took: {}, paid: 0, haggle: null };
}

function withShopMonth(s: GameState, shopId: string, sm: ShopMonth): GameState {
  return { ...s, world: { ...s.world, shops: { ...s.world.shops, [shopId]: sm } } };
}

/**
 * The lots still on the shelf today, priced by its market's supply of each: a standing line less
 * what you bought of it this month, a display lot until it is bought.
 */
export function shelf(s: GameState, who: string, shopId: string): StockLot[] {
  const sm = shopMonth(s.world, shopId, s.calendar.day);
  const m = marketOfShop(shopId);
  const day = s.calendar.day;
  // A sect's hall leaves its own chapters to the pavilion, and its open counter shows an outsider
  // neither the members' lines nor a copy (O2).
  const sh = shopById(shopId);
  const counter = hallTerms(s, who, sh)?.as === 'counter';
  return stockOf(shopId, sm.month, s.world)
    .filter((l) => !pavilionKeeps(sh, l.thing) && (!counter || counterSells(sh, l.thing)))
    .filter((l) => l.standing || !sm.bought.includes(l.slot))
    .map((l) => (l.standing && !l.endless ? { ...l, n: l.n - (sm.took[l.thing] ?? 0) } : l))
    .filter((l) => l.n > 0)
    .map((l) => {
      if (!m) return l;
      return { ...l, price: askAt(l.price * marketFactor(s.world, m, l.thing, day), l.standing) };
    });
}

/** The share a haggle won today, if you haggled here today. */
function haggleOff(sm: ShopMonth, day: number): number {
  return sm.haggle && sm.haggle.day === Math.floor(day) ? sm.haggle.off : 0;
}

/**
 * How many of a line a buy takes: a display lot whole, a standing line `count` (one, ten or a Bag
 * square) up to what stands, an endless line a lot of its catalog count unless told.
 */
function buyCount(lot: StockLot, count?: number): number {
  if (!lot.standing) return lot.n;
  // A count that isn't a whole number (a typed "abc") is no count: the lot's own.
  if (count !== undefined && !Number.isFinite(count)) count = undefined;
  else if (count !== undefined) count = Math.floor(count);
  if (lot.endless) return Math.max(1, count ?? lot.n);
  return Math.min(lot.n, Math.max(1, count ?? 1));
}

/**
 * A buy's price to you today: posted, less what haggling won this visit. A keeper won't haggle over
 * what the market is short of at rest, so a wanted thing bought cheap never sells back at the 80% it
 * fetches.
 */
export function priceToYou(
  s: GameState,
  who: string,
  shopId: string,
  lot: StockLot,
  count?: number,
): number {
  const sh = shopById(shopId);
  const terms = hallTerms(s, who, sh);
  if (terms?.as === 'member') return hallPoints(sh, lot) * buyCount(lot, count);
  const sm = shopMonth(s.world, shopId, s.calendar.day);
  const m = marketOfShop(shopId);
  const short = !!m && shortAtRest(s.world, m, lot.thing, s.calendar.day);
  const counter = terms?.as === 'counter' ? OPEN_COUNTER.markup : 1;
  return (
    lot.price * counter * buyCount(lot, count) * (1 - (short ? 0 : haggleOff(sm, s.calendar.day)))
  );
}

/**
 * A lot's price to a member at their hall, in the power's currency (design: at the market's price
 * and never above it): a point a low-grade stone, the shelf's price without the hall's own markup.
 */
export function hallPoints(sh: Shop, lot: StockLot): number {
  return askAt(lot.price / Math.max(1, priceFactor(sh)), lot.standing);
}

/** A shop's answer; a refusal may still change the world (a stolen thing recognized). */
export type ShopResult =
  { ok: true; state: GameState } | { ok: false; reason: string; state?: GameState };

/** Whether the shop serves you: a sect's hall its own, and from friendly an outsider at its counter. */
function serves(s: GameState, who: string, sh: Shop): string | null {
  const terms = hallTerms(s, who, sh);
  return terms?.as === 'shut' ? terms.why : null;
}

/**
 * Buys off the shelf: a display lot whole, or `count` of a standing line (E5: one, ten or a Bag
 * square). What you buy lowers its market's supply, so every shop's price there climbs.
 */
export function buy(
  s: GameState,
  who: string,
  shopId: string,
  slot: number,
  count?: number,
): ShopResult {
  const sh = shopById(shopId);
  const refused = serves(s, who, sh);
  if (refused) return { ok: false, reason: refused };
  const lot = shelf(s, who, shopId).find((l) => l.slot === slot);
  if (!lot) return { ok: false, reason: 'That lot is gone.' };
  const k = buyCount(lot, count);
  const c = cultivator(s, who);
  // A cast member buys what their purse saves for and holds it (N1): never a copy, never in taels.
  if (!c && hasCopy(lot.thing))
    return { ok: false, reason: 'Only a cultivator who reads buys a copy.' };
  if (!c && SHOP_KIND_INFO[sh.kind].money === 'silver')
    return { ok: false, reason: 'A mortal shop deals in taels.' };
  // The Bag holds no more than its squares (Sean's playtest): a buy that won't fit is refused.
  if (c && !hasCopy(lot.thing)) {
    const room = roomFor(c, lot.thing);
    if (room < k)
      return {
        ok: false,
        reason: room > 0 ? `Your pack holds only ${room} more.` : 'Your pack has no room for it.',
      };
  }
  const price = priceToYou(s, who, shopId, lot, k);
  let next: GameState;
  if (c && hallTerms(s, who, sh)?.as === 'member') {
    // A member pays in the power's currency, from their balance (O2).
    const house = houseOf(sh.power!);
    const m = membership(s.world, who, house)!;
    if (m.balance + 1e-9 < price) return { ok: false, reason: 'Your balance won’t cover it.' };
    next = { ...s, world: addBalance(s.world, who, house, -price) };
  } else if (c && SHOP_KIND_INFO[sh.kind].money === 'silver') {
    const paid = paySilver(c, price);
    if (!paid) return { ok: false, reason: `It costs ${price} taels.` };
    next = withCultivator(s, paid);
  } else {
    // A cast member pays from their purse, at their own hall a point a low (Jan's call in N1's
    // talk: the purse is what saves for the pill).
    const paid = payFrom(s, who, price);
    if (!paid) return { ok: false, reason: 'You can’t pay that.' };
    next = paid;
  }
  if (hasCopy(lot.thing)) {
    for (let i = 0; i < k; i++) next = gainCopy(next, lot.thing, 'buys');
  } else {
    next = giveTo(next, who, lot.thing, k);
  }
  // Each piece bought lowers its market's supply.
  const m = marketOfShop(shopId);
  if (m) next = { ...next, world: moveSupply(next.world, m, lot.thing, -k, s.calendar.day) };
  const sm = shopMonth(next.world, shopId, s.calendar.day);
  const bought = lot.standing ? sm.bought : [...sm.bought, slot];
  const took =
    lot.standing && !lot.endless
      ? { ...sm.took, [lot.thing]: (sm.took[lot.thing] ?? 0) + k }
      : sm.took;
  next = withShopMonth(next, shopId, { ...sm, bought, took });
  // A quest's step that waits on a buy hears of it (the origin's board quest).
  if (c && waitsOn(next, 'bought')) {
    const what = hasCopy(lot.thing) ? copyTitle(lot.thing) : item(lot.thing).name;
    next = addEvent(next, 'bought', {
      what,
      where: sh.name,
      thing: lot.thing,
      at: sh.at,
      kind: sh.kind,
    });
  }
  return { ok: true, state: next };
}

/** What the shop deals in, for a thing you hold: its Bag kind, or a copy. */
function wareOf(thing: string): Ware | null {
  if (hasCopy(thing)) return 'copy';
  return hasItem(thing) ? itemKind(item(thing)) : null;
}

/**
 * The rate a shop buys at from you: 40%, 60% once you are friendly with its keeper or its power
 * favors you, a bounty office's posted 50%.
 */
export function buyRate(s: GameState, who: string, sh: Shop): number {
  const info = SHOP_KIND_INFO[sh.kind];
  if (info.posted) return info.buyRate;
  const favored =
    sh.power !== null &&
    ['favored', 'honored'].includes(standingOf(s.world, sh.power, who, s.calendar.day).word);
  // The keeper is someone the world keeps from your first haggle on; a stranger has no opinion.
  const keeper = keeperId(sh.id);
  const friendly =
    !!s.world.kept[keeper] &&
    ['friendly', 'trusting'].includes(opinion(s.world, keeper, who, s.calendar.day).word);
  return Math.max(info.buyRate, favored || friendly ? FRIENDLY_BUY_RATE : info.buyRate);
}

/**
 * What a shop offers for one of a thing, or the reason it won't buy: its rate of its market's
 * price, and 80% of it for what the market needs (`wanted`), except at a black market.
 */
export function offerFor(
  s: GameState,
  who: string,
  shopId: string,
  thing: string,
  opts: { plain?: boolean } = {},
): { ok: true; each: number; wanted: boolean } | { ok: false; reason: string } {
  const sh = shopById(shopId);
  const info = SHOP_KIND_INFO[sh.kind];
  const ware = wareOf(thing);
  if (!ware || !info.buys.includes(ware))
    return { ok: false, reason: `The ${info.name} doesn’t buy that.` };
  // A mortal shop deals in taels and mortal goods, and a cultivator's shop in neither (E3).
  const mortalGood = !hasCopy(thing) && item(thing).taels !== undefined;
  if (mortalGood !== (info.money === 'silver'))
    return { ok: false, reason: `The ${info.name} doesn’t buy that.` };
  if (hasCopy(thing) && copyManual(thing).kind === 'inheritance')
    return { ok: false, reason: 'An inheritance passes to one heir. No shop buys it.' };
  // A power's own method is known for what it is: an honest shop won't touch it.
  const guard = guardedBy(thing);
  if (guard && info.recognizes)
    return {
      ok: false,
      reason:
        sh.power === guard
          ? 'The hall keeps its own methods.'
          : 'No honest shop buys a sect’s own method.',
    };
  // A posted rate is the posted rate: the bounty office's 50% doesn't drift with the shop.
  const drift = info.posted ? 1 : priceFactor(sh);
  const m = marketOfShop(shopId);
  const day = s.calendar.day;
  const needs = !!m && sh.kind !== 'black-market' && wanted(s.world, m, thing, day);
  // Your own make sells at the maker's rate at an honest shop (the crafts checkpoint); `plain`
  // asks the rate anyone gets, so a sale pays the maker's only on its marked pieces.
  const c = cultivator(s, who);
  const maker =
    !opts.plain && !info.posted && sh.kind !== 'black-market' && !!c && markedHeld(c, thing) > 0;
  const own = maker ? Math.max(MAKER_BUY_RATE, buyRate(s, who, sh)) : buyRate(s, who, sh);
  const rate = needs ? Math.max(NEED_RATE, own) : own;
  const posted = mortalGood ? item(thing).taels! : priceOf(thing);
  const price = posted * (m ? marketFactor(s.world, m, thing, day) : 1);
  const round = mortalGood ? 100 : 10;
  let each = Math.round(price * rate * drift * round) / round;
  // No loop pays: an offer never tops the cheapest it could be bought for in the same market, so a
  // thing bought from one shop never sells back to another for more. A haggle can take a fifth off
  // that, so a thing the market isn't short of at rest is capped a fifth under; one it is short of
  // is never haggled.
  const short = !!m && shortAtRest(s.world, m, thing, day);
  const ask = m ? cheapestAsk(m.shops, ware, mortalGood, posted, price / posted) : null;
  if (ask !== null)
    each = Math.min(
      each,
      Math.floor(ask * (short ? 1 : 1 - HAGGLE_OFF.clear) * round + 1e-9) / round,
    );
  return { ok: true, each, wanted: needs };
}

/**
 * The lowest price one of this thing could stand on a shelf at in the market, by any shop dealing
 * in its ware, rounded as `stockOf` and `shelf` round a display lot or a standing line, whichever
 * is lower; null where none sells it. The bounty office, which only buys, never counts.
 */
function cheapestAsk(
  shops: readonly string[],
  ware: Ware,
  mortalGood: boolean,
  posted: number,
  market: number,
): number | null {
  let low: number | null = null;
  for (const id of shops) {
    const sh = shopById(id);
    const info = SHOP_KIND_INFO[sh.kind];
    if (info.posted || !info.buys.includes(ware)) continue;
    if ((info.money === 'silver') !== mortalGood) continue;
    const f = shopFactor(sh);
    const display = askAt(askAt(posted * f) * market);
    const standing = askAt(askAt(posted * f, true) * market, true);
    const ask = Math.min(display, standing);
    if (low === null || ask < low) low = ask;
  }
  return low;
}

/**
 * Sells `n` of a thing, lot by lot: each lot raises its market's supply before the next is priced
 * (E3's talk). A shop pays out of its month's purse, a mortal shop in taels; a stolen thing, or a
 * copy of a power's own method, offered to that power's own shop is recognized: the sale is
 * refused, and that power's heat rises (and its standing falls, for a method). A copy a market
 * buys it copies (core/markets.ts `spreads`), so it is paid its scarce price once.
 */
export function sell(s: GameState, who: string, shopId: string, thing: string, n = 1): ShopResult {
  const c = cultivator(s, who);
  if (!c) return { ok: false, reason: 'Only a cultivator with a Bag sells.' };
  const sh = shopById(shopId);
  const info = SHOP_KIND_INFO[sh.kind];
  const day = s.calendar.day;
  const guard = guardedBy(thing);
  // A clean parting, a fine or restitution swore never to sell its methods (O5).
  const sworn = oathRefusal(s.world, who, thing, day);
  if (sworn) return { ok: false, reason: sworn };
  if (guard && guard === sh.power && info.recognizes && !isMember(s.world, who, guard)) {
    let world = addHeat(s.world, guard, 2, day);
    world = addStanding(world, { power: guard, about: who, row: 'sold-our-method' }, day);
    return {
      ok: false,
      reason: 'The keeper knows that method for the hall’s own.',
      state: { ...s, world },
    };
  }
  const refused = serves(s, who, sh);
  if (refused) return { ok: false, reason: refused };
  const held = hasCopy(thing) ? (c.copies[thing] ?? 0) : itemCount(c, thing);
  if (!Number.isInteger(n) || n <= 0) return { ok: false, reason: 'Name how many.' };
  if (held < n) return { ok: false, reason: 'You don’t have that many.' };
  const offer = offerFor(s, who, shopId, thing, { plain: true });
  if (!offer.ok) return offer;
  // What its power handed you, its own hall won't buy back (the checkpoint's fix).
  const gift =
    sh.power && isOrganization(sh.power) ? Math.min(held, givenBy(s.world, sh.power, thing)) : 0;
  if (gift > 0 && n > held - gift)
    return { ok: false, reason: 'The hall won’t buy back what it gave you.' };
  const owner = s.world.taken[thing];
  if (owner && info.recognizes && owner === sh.power) {
    const world = addHeat(s.world, owner, 2, day);
    return { ok: false, reason: 'The keeper knows whose that was.', state: { ...s, world } };
  }
  // Lot by lot: what you sell raises its market's supply, so the next lot fetches less.
  const m = marketOfShop(shopId);
  const size = lotSize(thing);
  let world = s.world;
  let total = 0;
  for (let left = n; left > 0;) {
    const k = Math.min(size, left);
    const o = left === n ? offer : offerFor({ ...s, world }, who, shopId, thing, { plain: true });
    if (!o.ok) return o;
    total += o.each * k;
    if (m) world = moveSupply(world, m, thing, k, day);
    left -= k;
  }
  // Your mark (K6): what you made sells by your name in its craft where you are known there.
  const mark = markOn(s, who, shopId, thing, n);
  // The marked pieces at the maker's rate over the plain one, then the mark's lift on their worth.
  total += Math.max(0, mark.value - offer.each * mark.n) + mark.value * mark.lift;
  total = Math.round(total * 100) / 100;
  // A harsh power takes its tithe of what its lower seats bring in (O2): a bounty, loot at its hall.
  const kept = Math.round(total * (1 - titheFor(s, who, sh)) * 100) / 100;
  const sm = shopMonth(s.world, shopId, day);
  if (sm.paid + total > shopPurse(s.world, sh, day))
    return { ok: false, reason: 'The shop hasn’t the money this month.' };
  // Paid as the shop counts it: a mortal shop in taels, any other in its vein's grade at most.
  let player =
    info.money === 'silver'
      ? { ...c, silver: c.silver + kept }
      : withStones(c, receive(stonesOf(c), kept, tierGrade(shopVein(sh))));
  if (hasCopy(thing)) player = { ...player, copies: { ...player.copies, [thing]: held - n } };
  else player = addItem(player, thing, -n);
  if (mark.n > 0 && mark.craft) {
    player = unmark(player, thing, mark.n);
    player = soldMarked(player, sh.region, mark.craft, mark.value * (1 + mark.lift), day);
  }
  if (m && spreads(thing, sh.kind === 'black-market')) world = copyInto(world, m, thing, day);
  // A power's own sold to a black market: it learns that it leaked, never who (O5).
  if (guard && sh.kind === 'black-market') world = leakSold(world, who, thing, sh.at, day);
  // A power's own good sold where its people trade: they know their own pill (K6).
  const own = ownGood(thing);
  let marked = false;
  if (own && m && tradesAt(own.power).has(m.id)) {
    const r = ownGoodSold(world, who, own, sh.at, day);
    world = r.world;
    marked = r.marked;
  }
  let state = withShopMonth(withCultivator({ ...s, world }, player), shopId, {
    ...sm,
    paid: sm.paid + total,
  });
  if (marked) state = addEvent(state, 'power', { power: houseOf(own!.power), what: 'marked' });
  return { ok: true, state };
}

/**
 * Your mark on a sale (K6): how many of `n` you made, the craft they are of, their share of the
 * sale's worth at the shop's offer, and what your name in that craft lifts it by in the shop's region.
 */
export function markOn(
  s: GameState,
  who: string,
  shopId: string,
  thing: string,
  n: number,
): { n: number; craft: CraftId | null; value: number; lift: number } {
  const c = cultivator(s, who);
  if (!c) return { n: 0, craft: null, value: 0, lift: 0 };
  const none = { n: 0, craft: null, value: 0, lift: 0 };
  if (hasCopy(thing) || !hasItem(thing)) return none;
  const r = recipeFor(baseOf(thing));
  const k = Math.min(n, markedHeld(c, thing));
  if (!r || k <= 0) return none;
  const offer = offerFor(s, who, shopId, thing);
  if (!offer.ok) return none;
  const level = craftLevel(c, shopById(shopId).region, r.craft, s.calendar.day);
  return { n: k, craft: r.craft, value: offer.each * k, lift: markLift(level) };
}

/** The keeper you haggle with: someone the world keeps from the first haggle on. */
export function keeperId(shopId: string): string {
  return `keeper:${shopId}`;
}

export function withKeeper(w: World, sh: Shop): World {
  const id = keeperId(sh.id);
  if (w.kept[id]) return w;
  const nature = rollNature(sh.id, { trade: 'merchant' });
  return {
    ...w,
    kept: {
      ...w.kept,
      [id]: {
        name: keeperName(sh),
        nature,
        power: sh.power,
        home: sh.at,
      },
    },
  };
}

/**
 * Haggles once this visit (the `bargain` act, a people check against the keeper): a clear pass
 * takes 20% off everything you buy today and a close one 10%; falling short wins nothing, and the
 * keeper remembers being pressed. A bounty office posts its rates.
 */
export function haggle(s: GameState, who: string, shopId: string): ShopResult & { off?: number } {
  const c = cultivator(s, who);
  if (!c) return { ok: false, reason: 'Only a cultivator at the counter haggles.' };
  const sh = shopById(shopId);
  if (SHOP_KIND_INFO[sh.kind].posted) return { ok: false, reason: 'The rates are posted.' };
  const day = Math.floor(s.calendar.day);
  const sm = shopMonth(s.world, shopId, s.calendar.day);
  if (sm.haggle?.day === day) return { ok: false, reason: 'You have haggled here today.' };
  const kept = { ...s, world: withKeeper(s.world, sh) };
  const you = actorFromCultivator(kept);
  const keeper = plainActor({ id: keeperId(sh.id), name: 'keeper', side: 'shop', power: sh.power });
  const check = talkCheck(
    kept,
    you,
    keeper,
    { verb: 'talk', act: 'bargain', target: keeper.id },
    sh.region,
  );
  const off = check.verdict === 'short' ? 0 : HAGGLE_OFF[check.verdict];
  let world = kept.world;
  if (check.verdict === 'short') {
    world = remember(
      world,
      {
        holder: keeper.id,
        about: who,
        row: 'bad-turn',
        value: -5,
        note: 'Haggled hard',
        known: [keeper.id],
      },
      s.calendar.day,
    );
  }
  const next = withShopMonth({ ...kept, world }, shopId, { ...sm, haggle: { day, off } });
  return { ok: true, state: next, off };
}

/**
 * What a refiner asks to mend a piece: worn armor at a fifth of its price for a full bar, a
 * damaged piece back to its rarity at half the price between the two, and a cracked tool at a
 * tenth of its worth (K1). Null when nothing needs it.
 */
export function repairCost(s: GameState, who: string, thing: string): number | null {
  const c = cultivator(s, who);
  if (!c) return null;
  if (!hasItem(thing)) return null;
  const it = item(thing);
  if (it.cracked)
    return Math.round(priceOf(variantId(baseOf(thing), it.rarity)) * CRACK_MEND_SHARE * 10) / 10;
  if (it.damaged) {
    const up = RARITY_IDS[rarityRank(it.rarity) + 1]!;
    const mended = variantId(thing.split('~')[0]!, up);
    return Math.round((priceOf(mended) - priceOf(thing)) * DAMAGE_REPAIR_SHARE * 10) / 10;
  }
  const wear = c.wear[thing] ?? 0;
  return wear > 0 ? Math.round(priceOf(thing) * REPAIR_SHARE * wear * 10) / 10 : null;
}

/** A refiner mends a piece you hold or wear: the refining action you'd do at your own forge (K4). */
export function repair(s: GameState, who: string, shopId: string, thing: string): ShopResult {
  const c = cultivator(s, who);
  if (!c) return { ok: false, reason: 'Only a cultivator who wears gear has it mended.' };
  const sh = shopById(shopId);
  if (!SHOP_KIND_INFO[sh.kind].repairs) return { ok: false, reason: 'Only a refiner mends gear.' };
  if (itemCount(c, thing) <= 0 && !wornIds(c).includes(thing))
    return { ok: false, reason: 'You don’t have that piece.' };
  const cost = repairCost(s, who, thing);
  if (cost === null) return { ok: false, reason: 'It needs no mending.' };
  const after = pay(stonesOf(c), cost);
  if (!after) return { ok: false, reason: 'You can’t pay that.' };
  return { ok: true, state: withCultivator(s, mended(withStones(c, after), thing)) };
}
