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
import { copyChapter, copyManual, hasCopy } from '../content/copies.ts';
import { hasItem, item, itemKind, variantId, type ItemKind } from '../content/items.ts';
import {
  LENT_WEIGHT,
  NEED_RATE,
  OPENING_CHAPTERS,
  TIER_LEAN,
  TIER_LEAN_FROM,
} from '../content/markets.ts';
import { RARITY_IDS, rarityRank, type RarityId } from '../content/rarity.ts';
import {
  DAMAGE_REPAIR_SHARE,
  FRIENDLY_BUY_RATE,
  HAGGLE_OFF,
  PRICE_SPREAD,
  REPAIR_SHARE,
  SHOP_KIND_INFO,
  SHOP_KINDS,
  shop as shopById,
  type Shop,
  type ShopKind,
  type Ware,
  shopVein,
} from '../content/shops.ts';
import { rollBiased } from './combat/generate.ts';
import { lotShape } from './loot.ts';
import { wornIds } from './gear.ts';
import { gainCopy } from './life.ts';
import {
  copyInto,
  guardedBy,
  lentLots,
  lotSize,
  marketFactor,
  marketOfShop,
  moveSupply,
  placeChain,
  shopLots,
  shopPurse,
  shopTiers,
  spreads,
  standingCopies,
  wanted,
} from './markets.ts';
import { priceOf } from './prices.ts';
import { pay, paySilver, receive, stonesOf, tierGrade, withStones } from './purse.ts';
import { actorFromCultivator, plainActor } from './resolver/actor.ts';
import { isMember } from './resolver/names.ts';
import { rollNature } from './resolver/nature.ts';
import { addStanding, opinion, remember } from './resolver/opinion.ts';
import { talkCheck } from './resolver/talk.ts';
import { addHeat, emptyWorld, standingOf, type ShopMonth, type World } from './resolver/world.ts';
import { hashSeed, Rng } from './rng.ts';
import { addItem, itemCount, withPlayer, type GameState } from './state.ts';

export function monthOf(day: number): number {
  return Math.floor(day / DAYS_PER_MONTH);
}

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
}

/** What takes its maker's tier on a shelf (design § Catalogs by place, Rarity as quality). */
const MAKER_TIERED: readonly ItemKind[] = ['pill', 'talisman', 'beast-part'];

/**
 * The tiers a lot comes at in a shop: its written one, and for a pill, a talisman or a beast part
 * any tier above it the shop stocks, since those take their maker's or their beast's. A gate pill,
 * a hiding talisman and a mortal good keep their own.
 */
function lotTiers(thing: string, written: number, tiers: readonly number[]): number[] {
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

/** A staple: the `trade` tag, the bulk end of a kind (design § Economy, Trading yourself). */
export function isStaple(thing: string): boolean {
  return !hasCopy(thing) && hasItem(thing) && (item(thing).tags ?? []).includes('trade');
}

/**
 * Higher tiers are rare on a shelf (content/markets.ts `TIER_LEAN`): a tenth for each tier above
 * Foundation's and one more when its maker raised it, a step less for a good made here.
 */
export function tierLean(tier: number, written: number, made: boolean): number {
  const steps = Math.max(0, tier - TIER_LEAN_FROM) + (tier > written ? 1 : 0) - (made ? 1 : 0);
  return TIER_LEAN ** Math.max(0, steps);
}

/** The wares each kind of shop stocks somewhere in the catalogs: what a lent lot may go to. */
let sells: Map<ShopKind, Set<Ware>> | null = null;
function dealsIn(kind: ShopKind, ware: Ware): boolean {
  if (!sells) {
    sells = new Map(SHOP_KINDS.map((k) => [k, new Set<Ware>()]));
    for (const c of [...CATALOGS, RARE])
      for (const l of c.lots) {
        const w = wareOf(l.thing);
        if (w) for (const k of l.shops) sells.get(k)!.add(w);
      }
  }
  return sells.get(kind)!.has(ware);
}

/**
 * What a shop could stock: each lot of its catalogs weighted by its layer's share and its own
 * weight, at each tier it comes at, and what the markets in its reach lend, sharing 15 of the
 * place weight. A sect shop stocks only its power's, and a black market takes imports first, so
 * neither borrows.
 */
function candidates(s: Shop): Candidate[] {
  const info = SHOP_KIND_INFO[s.kind];
  const tiers = shopTiers(s);
  const out: Candidate[] = [];
  const add = (
    lots: readonly Lot[],
    layerWeight: number,
    o: { made?: boolean; lent?: boolean } = {},
  ) => {
    const fit = lots.filter((l) => {
      // A staple made here stands on the shelf (`standingLines`), and a style's later chapters
      // are a sect's, a ruin's or an auction's, never a market's (Methods in the market).
      if (o.made && isStaple(l.thing)) return false;
      if (s.kind !== 'sect' && hasCopy(l.thing) && copyChapter(l.thing) > OPENING_CHAPTERS)
        return false;
      if (!o.lent) return l.shops.includes(s.kind);
      const ware = wareOf(l.thing);
      return !!ware && dealsIn(s.kind, ware);
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
      for (const tier of lotTiers(lot.thing, shape.tier, tiers))
        out.push({
          lot,
          w: w * tierLean(tier, shape.tier, !!o.made),
          tier,
          rarities: shape.rarities,
        });
    }
  };
  for (const c of catalogsFor(s)) add(c.lots, info.layers[c.layer], { made: c.layer === 'place' });
  // The gold and red list: a shop that stocks such a thing at all rolls for it like any other.
  add(RARE.lots, info.layers.continent);
  const m = marketOfShop(s.id);
  if (m && s.kind !== 'sect' && s.kind !== 'black-market')
    add(
      lentLots(m).map((l) => l.lot),
      LENT_WEIGHT,
      { lent: true },
    );
  return out;
}

function weighted(rng: Rng, cs: readonly Candidate[]): Candidate {
  const total = cs.reduce((t, c) => t + c.w, 0);
  let u = rng.next() * total;
  for (const c of cs) {
    u -= c.w;
    if (u < 0) return c;
  }
  return cs[cs.length - 1]!;
}

/** Where the standing lines start on the shelf, past any month's rolled lots. */
const STANDING_SLOT = 1000;

/**
 * The lines a shop stands all month (E3's talk): each staple its place makes that its kind sells,
 * at each tier it stocks, a lot of its catalog count; then the copies its market made (core/
 * markets.ts `standingCopies`), one at a time.
 */
function standingLines(s: Shop, w: World, month: number): { thing: string; n: number }[] {
  const out: { thing: string; n: number }[] = [];
  const tiers = shopTiers(s);
  for (const c of catalogsFor(s)) {
    if (c.layer !== 'place') continue;
    for (const lot of c.lots) {
      if (!isStaple(lot.thing) || !lot.shops.includes(s.kind)) continue;
      const it = item(lot.thing);
      if ((s.kind === 'mortal') !== (it.taels !== undefined)) continue;
      const [lo, hi] = lot.count ?? [1, 1];
      const n = Math.max(1, Math.round((lo + hi) / 2));
      for (const tier of lotTiers(lot.thing, it.tier, tiers))
        out.push({ thing: variantId(lot.thing, it.rarity, { tier }), n });
    }
  }
  for (const thing of standingCopies(w, s, month)) out.push({ thing, n: 1 });
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

/**
 * A shop's stock for a month, at its posted prices: the same lots for the same shop and month in
 * the same world, as many as its prosperity gives it as the month opens.
 */
export function stockOf(shopId: string, month: number, w: World = emptyWorld()): StockLot[] {
  const s = shopById(shopId);
  const info = SHOP_KIND_INFO[s.kind];
  const rng = new Rng(hashSeed(`stock/${s.id}/${month}`));
  let pool = candidates(s);
  const factor = priceFactor(s) * info.markup;
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
    const base = s.kind === 'mortal' ? item(thing).taels! : priceOf(thing);
    out.push({ slot, thing, n, price: Math.max(0.1, Math.round(base * factor * 10) / 10) });
  }
  standingLines(s, w, month).forEach(({ thing, n }, i) => {
    const base = s.kind === 'mortal' ? item(thing).taels! : priceOf(thing);
    const price = Math.max(0.01, Math.round(base * factor * 100) / 100);
    out.push({ slot: STANDING_SLOT + i, thing, n, price, standing: true });
  });
  return out;
}

/** What you have done to a shop this month: nothing, when the month has turned. */
export function shopMonth(w: World, shopId: string, day: number): ShopMonth {
  const m = monthOf(day);
  const kept = w.shops[shopId];
  return kept && kept.month === m ? kept : { month: m, bought: [], paid: 0, haggle: null };
}

function withShopMonth(s: GameState, shopId: string, sm: ShopMonth): GameState {
  return { ...s, world: { ...s.world, shops: { ...s.world.shops, [shopId]: sm } } };
}

/** The lots still on the shelf today, priced by its market's supply of each. */
export function shelf(s: GameState, shopId: string): StockLot[] {
  const sm = shopMonth(s.world, shopId, s.calendar.day);
  const m = marketOfShop(shopId);
  const day = s.calendar.day;
  return stockOf(shopId, sm.month, s.world)
    .filter((l) => l.standing || !sm.bought.includes(l.slot))
    .map((l) => {
      if (!m) return l;
      const price = l.price * marketFactor(s.world, m, l.thing, day);
      const floor = l.standing ? 0.01 : 0.1;
      const round = l.standing ? 100 : 10;
      return { ...l, price: Math.max(floor, Math.round(price * round) / round) };
    });
}

/** The share a haggle won today, if you haggled here today. */
function haggleOff(sm: ShopMonth, day: number): number {
  return sm.haggle && sm.haggle.day === Math.floor(day) ? sm.haggle.off : 0;
}

/** A lot's price to you today: posted, less what haggling won this visit. */
export function priceToYou(s: GameState, shopId: string, lot: StockLot): number {
  const sm = shopMonth(s.world, shopId, s.calendar.day);
  return lot.price * lot.n * (1 - haggleOff(sm, s.calendar.day));
}

/** A shop's answer; a refusal may still change the world (a stolen thing recognized). */
export type ShopResult =
  { ok: true; state: GameState } | { ok: false; reason: string; state?: GameState };

/** Whether the shop serves you: a sect shop only its own members. */
function serves(s: GameState, sh: Shop): string | null {
  if (SHOP_KIND_INFO[sh.kind].members && sh.power && !isMember(s.world, s.player.id, sh.power)) {
    return 'It sells only to its own.';
  }
  return null;
}

/** Buys a whole lot off the shelf. */
export function buy(s: GameState, shopId: string, slot: number): ShopResult {
  const sh = shopById(shopId);
  const refused = serves(s, sh);
  if (refused) return { ok: false, reason: refused };
  const lot = shelf(s, shopId).find((l) => l.slot === slot);
  if (!lot) return { ok: false, reason: 'That lot is gone.' };
  const price = priceToYou(s, shopId, lot);
  let next: GameState;
  if (SHOP_KIND_INFO[sh.kind].money === 'silver') {
    const paid = paySilver(s.player, price);
    if (!paid) return { ok: false, reason: `It costs ${price} taels.` };
    next = withPlayer(s, paid);
  } else {
    const after = pay(stonesOf(s.player), price);
    if (!after) return { ok: false, reason: 'You can’t pay that.' };
    next = withPlayer(s, withStones(s.player, after));
  }
  if (hasCopy(lot.thing)) {
    for (let i = 0; i < lot.n; i++) next = gainCopy(next, lot.thing, 'buys');
  } else {
    next = withPlayer(next, addItem(next.player, lot.thing, lot.n));
  }
  // Each lot bought lowers its market's supply of it.
  const m = marketOfShop(shopId);
  if (m) next = { ...next, world: moveSupply(next.world, m, lot.thing, -lot.n, s.calendar.day) };
  const sm = shopMonth(next.world, shopId, s.calendar.day);
  const bought = lot.standing ? sm.bought : [...sm.bought, slot];
  return { ok: true, state: withShopMonth(next, shopId, { ...sm, bought }) };
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
export function buyRate(s: GameState, sh: Shop): number {
  const info = SHOP_KIND_INFO[sh.kind];
  if (info.posted) return info.buyRate;
  const favored =
    sh.power !== null &&
    ['favored', 'honored'].includes(
      standingOf(s.world, sh.power, s.player.id, s.calendar.day).word,
    );
  // The keeper is someone the world keeps from your first haggle on; a stranger has no opinion.
  const keeper = keeperId(sh.id);
  const friendly =
    !!s.world.kept[keeper] &&
    ['friendly', 'trusting'].includes(opinion(s.world, keeper, s.player.id, s.calendar.day).word);
  return Math.max(info.buyRate, favored || friendly ? FRIENDLY_BUY_RATE : info.buyRate);
}

/**
 * What a shop offers for one of a thing, or the reason it won't buy: its rate of its market's
 * price, and 80% of it for what the market needs (`wanted`), except at a black market.
 */
export function offerFor(
  s: GameState,
  shopId: string,
  thing: string,
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
  const rate = needs ? Math.max(NEED_RATE, buyRate(s, sh)) : buyRate(s, sh);
  const posted = mortalGood ? item(thing).taels! : priceOf(thing);
  const price = posted * (m ? marketFactor(s.world, m, thing, day) : 1);
  const round = mortalGood ? 100 : 10;
  const each = Math.round(price * rate * drift * round) / round;
  return { ok: true, each, wanted: needs };
}

/**
 * Sells `n` of a thing, lot by lot: each lot raises its market's supply before the next is priced
 * (E3's talk). A shop pays out of its month's purse, a mortal shop in taels; a stolen thing, or a
 * copy of a power's own method, offered to that power's own shop is recognized: the sale is
 * refused, and that power's heat rises (and its standing falls, for a method). A copy a market
 * buys it copies (core/markets.ts `spreads`), so it is paid its scarce price once.
 */
export function sell(s: GameState, shopId: string, thing: string, n = 1): ShopResult {
  const sh = shopById(shopId);
  const info = SHOP_KIND_INFO[sh.kind];
  const day = s.calendar.day;
  const guard = guardedBy(thing);
  if (guard && guard === sh.power && info.recognizes && !isMember(s.world, s.player.id, guard)) {
    let world = addHeat(s.world, guard, 2, day);
    world = addStanding(world, { power: guard, about: s.player.id, row: 'sold-our-method' }, day);
    return {
      ok: false,
      reason: 'The keeper knows that method for the hall’s own.',
      state: { ...s, world },
    };
  }
  const refused = serves(s, sh);
  if (refused) return { ok: false, reason: refused };
  const held = hasCopy(thing) ? (s.player.copies[thing] ?? 0) : itemCount(s.player, thing);
  if (held < n || n <= 0) return { ok: false, reason: 'You don’t have that many.' };
  const offer = offerFor(s, shopId, thing);
  if (!offer.ok) return offer;
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
    const o = left === n ? offer : offerFor({ ...s, world }, shopId, thing);
    if (!o.ok) return o;
    total += o.each * k;
    if (m) world = moveSupply(world, m, thing, k, day);
    left -= k;
  }
  total = Math.round(total * 100) / 100;
  const sm = shopMonth(s.world, shopId, day);
  if (sm.paid + total > shopPurse(s.world, sh, day))
    return { ok: false, reason: 'The shop hasn’t the money this month.' };
  // Paid as the shop counts it: a mortal shop in taels, any other in its vein's grade at most.
  let player =
    info.money === 'silver'
      ? { ...s.player, silver: s.player.silver + total }
      : withStones(s.player, receive(stonesOf(s.player), total, tierGrade(shopVein(sh))));
  if (hasCopy(thing)) player = { ...player, copies: { ...player.copies, [thing]: held - n } };
  else player = addItem(player, thing, -n);
  if (m && spreads(thing, sh.kind === 'black-market')) world = copyInto(world, m, thing, day);
  return {
    ok: true,
    state: withShopMonth(withPlayer({ ...s, world }, player), shopId, {
      ...sm,
      paid: sm.paid + total,
    }),
  };
}

/** The keeper you haggle with: someone the world keeps from the first haggle on. */
export function keeperId(shopId: string): string {
  return `keeper:${shopId}`;
}

function withKeeper(w: World, sh: Shop): World {
  const id = keeperId(sh.id);
  if (w.kept[id]) return w;
  const nature = rollNature(sh.id, { trade: 'merchant' });
  return {
    ...w,
    kept: {
      ...w.kept,
      [id]: {
        name: `the ${SHOP_KIND_INFO[sh.kind].name}'s keeper`,
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
export function haggle(s: GameState, shopId: string): ShopResult & { off?: number } {
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
        about: s.player.id,
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
 * damaged piece back to its rarity at half the price between the two. Null when nothing needs it.
 */
export function repairCost(s: GameState, thing: string): number | null {
  if (!hasItem(thing)) return null;
  const it = item(thing);
  if (it.damaged) {
    const up = RARITY_IDS[rarityRank(it.rarity) + 1]!;
    const mended = variantId(thing.split('~')[0]!, up);
    return Math.round((priceOf(mended) - priceOf(thing)) * DAMAGE_REPAIR_SHARE * 10) / 10;
  }
  const wear = s.player.wear[thing] ?? 0;
  return wear > 0 ? Math.round(priceOf(thing) * REPAIR_SHARE * wear * 10) / 10 : null;
}

/** A refiner mends a piece you hold or wear. */
export function repair(s: GameState, shopId: string, thing: string): ShopResult {
  const sh = shopById(shopId);
  if (!SHOP_KIND_INFO[sh.kind].repairs) return { ok: false, reason: 'Only a refiner mends gear.' };
  if (itemCount(s.player, thing) <= 0 && !wornIds(s.player).includes(thing))
    return { ok: false, reason: 'You don’t have that piece.' };
  const cost = repairCost(s, thing);
  if (cost === null) return { ok: false, reason: 'It needs no mending.' };
  const after = pay(stonesOf(s.player), cost);
  if (!after) return { ok: false, reason: 'You can’t pay that.' };
  let c = withStones(s.player, after);
  const it = item(thing);
  if (it.damaged) {
    const up = RARITY_IDS[rarityRank(it.rarity) + 1]!;
    const mended = variantId(thing.split('~')[0]!, up);
    const worn = Object.entries(c.gear).find(([, v]) => v === thing)?.[0];
    if (worn && worn !== 'treasures') c = { ...c, gear: { ...c.gear, [worn]: mended } };
    else c = addItem(addItem(c, thing, -1), mended, 1);
  } else {
    const wear = { ...c.wear };
    delete wear[thing];
    c = { ...c, wear };
  }
  return { ok: true, state: withPlayer(s, c) };
}
