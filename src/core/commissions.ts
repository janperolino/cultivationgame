// Commissions (K12, design § Professions, people and powers: Production, commissions and the craft
// deck). Each alchemy shop, refiner and talisman shop posts one a month for its market's biggest
// shortage that its craft makes, at the recipe's own tier, the shortage's line of why on the
// notice: a rarity a shelf can't fill (green or better), a share of a notable shop's asking for
// the certified grade. Taken, its price is fixed at ×1.5 the market (×2 graded); anything of the
// thing at the asked rarity fills it by the month's end, at that counter (Jan's call in the talk:
// a bounty board, not your own make). From craft renown 3 a person in the market asks the keeper
// for you by name, for something you make. Commissions you place at an alchemy shop or a refiner
// are made to your wants: a recipe it sells, its inputs or yours, ×1.25 the market less what yours
// are worth, ready after the crafter's hours, its rarity from the house's mastery and your rarer
// inputs, rolled once from the shop and the day. The world rolls the posting; nothing is kept but
// what you took and ordered (`crafts.commissions`, `crafts.orders`).
import { DAYS_PER_MONTH } from '../content/calendar.ts';
import { ASKERS, COMMISSION, MAKES_TO_ORDER, ORDER, POSTS_FOR } from '../content/commissions.ts';
import {
  LIFT,
  recipeFor,
  recipeHours,
  recipeTier,
  recipeYield,
  type CraftId,
} from '../content/crafts.ts';
import type { Recipe } from '../content/catalogs/types.ts';
import { baseOf, item, rarityRange, variantId } from '../content/items.ts';
import { rarityRank, type RarityId } from '../content/rarity.ts';
import { BORDER_WILDS_NAMES } from '../content/roster.ts';
import { shop as shopById, shopVein, type Shop } from '../content/shops.ts';
import { gradeCertified } from './craftGrade.ts';
import { addCraftFame, craftLevel, markedHeld, markLift, unmark } from './craftRenown.ts';
import { heldOf, liftOdds, planInputs } from './crafts.ts';
import { gainItem } from './map/ground.ts';
import { shortages, shortLine } from './making.ts';
import { marketFactor, marketOfShop, moveSupply, shopTiers, type Market } from './markets.ts';
import { priceOf } from './prices.ts';
import { pay, receive, stonesOf, tierGrade, withStones } from './purse.ts';
import { remember } from './resolver/opinion.ts';
import type { World } from './resolver/world.ts';
import { hashSeed, Rng } from './rng.ts';
import { askAt, catalogsFor, keeperId, withKeeper } from './shops.ts';
import {
  addItem,
  withPlayer,
  type Commission,
  type Cultivator,
  type GameState,
  type Order,
} from './state.ts';

/** A commission a shop offers: what it asks, what it pays each, and why. */
export interface Offered extends Commission {
  /** The shortage's line of why, for a posted one. */
  why: string | null;
}

export type CommissionResult = { ok: true; state: GameState } | { ok: false; reason: string };

const monthOf = (day: number) => Math.floor(day / DAYS_PER_MONTH);

/** The craft a shop posts for in its market, if any: a stall only where no talisman shop stands. */
export function postsFor(shopId: string): CraftId | null {
  const sh = shopById(shopId);
  const craft = POSTS_FOR[sh.kind] ?? null;
  if (sh.kind !== 'stall') return craft;
  const m = marketOfShop(shopId);
  if (!m) return null;
  const kinds = m.shops.map((id) => shopById(id).kind);
  if (kinds.includes('talisman')) return null;
  return m.shops.find((id) => shopById(id).kind === 'stall') === shopId ? craft : null;
}

/** The thing a shop's craft makes in a shortage: goods with a recipe of it, at the recipe's tier. */
function craftable(goods: readonly string[], craft: CraftId): string[] {
  const out: string[] = [];
  for (const g of goods) {
    const r = recipeFor(g);
    if (!r || r.craft !== craft || item(g).tier !== recipeTier(r)) continue;
    if (!out.includes(r.output)) out.push(r.output);
  }
  return out;
}

/** The floor a thing's commission asks: the roll held inside the thing's range. */
function floorIn(base: string, roll: RarityId): RarityId {
  const range = rarityRange(item(base));
  if (rarityRank(roll) < rarityRank(range[0]!)) return range[0]!;
  return rarityRank(roll) > rarityRank(range.at(-1)!) ? range.at(-1)! : roll;
}

/** One of a thing at its floor at a shop's market today, times the share it pays. */
function eachAt(w: World, m: Market, base: string, floor: RarityId, day: number, share: number) {
  return askAt(priceOf(variantId(base, floor)) * marketFactor(w, m, base, day) * share, true);
}

/**
 * The commission a shop posts this month (K12): the first of its market's shortages its craft
 * makes, the shops of one craft spreading over its goods, one batch of it at a rolled floor.
 */
export function postedAt(w: World, shopId: string, day: number): Offered | null {
  const craft = postsFor(shopId);
  const m = marketOfShop(shopId);
  if (!craft || !m) return null;
  const month = monthOf(day);
  const short = shortages(w, m, month).find((s) => craftable(s.goods, craft).length > 0);
  if (!short) return null;
  const goods = craftable(short.goods, craft);
  const peers = m.shops.filter((id) => postsFor(id) === craft);
  const base = goods[Math.max(0, peers.indexOf(shopId)) % goods.length]!;
  const r = recipeFor(base)!;
  const rng = new Rng(hashSeed(`commission/${shopId}/${month}`));
  let roll = rng.next();
  let floor: RarityId = COMMISSION.floor[0]![0];
  for (const [rarity, share] of COMMISSION.floor) {
    floor = rarity;
    if ((roll -= share) < 0) break;
  }
  floor = floorIn(base, floor);
  const sh = shopById(shopId);
  const graded = !sh.small && sh.weight >= 3 && rng.next() < COMMISSION.gradedShare;
  return {
    shop: shopId,
    month,
    kind: 'posted',
    thing: base,
    n: recipeYield(r),
    floor,
    ...(graded ? { grade: recipeTier(r) } : {}),
    each: eachAt(w, m, base, floor, day, graded ? COMMISSION.graded : COMMISSION.pay),
    why: shortLine(m, short),
  };
}

/** The recipe of a craft you have made most of late, or the first you know of it. */
function yourMake(c: Cultivator, craft: CraftId): Recipe | null {
  const count = new Map<string, number>();
  for (const b of c.crafts.recent) {
    const r = b.made ? recipeFor(b.made) : null;
    if (r?.craft === craft && !b.mend && !b.experiment)
      count.set(r.output, (count.get(r.output) ?? 0) + 1);
  }
  const top = [...count].sort((a, b) => b[1] - a[1])[0];
  return top ? recipeFor(top[0]) : null;
}

/** A person in the market who asks for you: a name and a role, rolled from what they ask. */
export function askerFor(key: string, craft: CraftId): string {
  const rng = new Rng(hashSeed(`asker/${key}`));
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(rng.next() * xs.length)]!;
  const name = `${pick(BORDER_WILDS_NAMES.surnames)} ${pick(BORDER_WILDS_NAMES.given)}`;
  return `${name}, ${pick(ASKERS[craft])}`;
}

/**
 * The commission a person asks of you by name at a shop this month (design: from craft renown 3,
 * the shops you stand in offer some by name): a batch of what you make most, green or better, at
 * ×1.5 the market and your mark's lift.
 */
export function namedAt(s: GameState, shopId: string): Offered | null {
  const craft = postsFor(shopId) ?? MAKES_TO_ORDER[shopById(shopId).kind] ?? null;
  const m = marketOfShop(shopId);
  if (!craft || !m) return null;
  const sh = shopById(shopId);
  const day = s.calendar.day;
  const level = craftLevel(s.player, sh.region, craft, day);
  if (level < COMMISSION.nameFrom) return null;
  const r = yourMake(s.player, craft);
  if (!r) return null;
  const month = monthOf(day);
  const floor = floorIn(r.output, COMMISSION.byName);
  return {
    shop: shopId,
    month,
    kind: 'named',
    thing: r.output,
    n: recipeYield(r),
    floor,
    each: eachAt(s.world, m, r.output, floor, day, COMMISSION.pay * (1 + markLift(level))),
    asker: askerFor(`${shopId}/${month}/${craft}`, craft),
    why: null,
  };
}

/** The commissions you hold, this month's and any lapsed but not yet settled. */
export function commissionsOf(c: Cultivator): Commission[] {
  return c.crafts.commissions ?? [];
}

/** The ones still open: taken and not handed in. */
export function openCommissions(c: Cultivator): Commission[] {
  return commissionsOf(c).filter((k) => !k.done);
}

/** A shop's own commission you took this month, open or done, of a kind. */
function tookAt(c: Cultivator, shopId: string, kind: Commission['kind'], month: number) {
  return commissionsOf(c).find((k) => k.shop === shopId && k.kind === kind && k.month === month);
}

/** What a shop offers you today, posted and by name, that you haven't taken. */
export function offeredAt(s: GameState, shopId: string): Offered[] {
  const month = monthOf(s.calendar.day);
  return [postedAt(s.world, shopId, s.calendar.day), namedAt(s, shopId)].filter(
    (o): o is Offered => !!o && !tookAt(s.player, shopId, o.kind, month),
  );
}

/** The craft a commission's thing is of. */
export function craftOf(k: Commission): CraftId {
  return recipeFor(k.thing)!.craft;
}

/** Whether you can take an offer: room among your open ones, and the grade it asks. */
export function cantTake(c: Cultivator, o: Commission): string | null {
  if (openCommissions(c).length >= COMMISSION.most)
    return `You hold ${COMMISSION.most} commissions already.`;
  if (o.grade && gradeCertified(c, craftOf(o)) < o.grade)
    return 'It asks for a certified grade you don’t hold.';
  return null;
}

/** Takes a shop's commission, posted or by name: its price is fixed now. */
export function takeCommission(s: GameState, shopId: string, kind: 'posted' | 'named') {
  const o = offeredAt(s, shopId).find((x) => x.kind === kind);
  if (!o) return { ok: false, reason: 'Nothing is offered.' } as CommissionResult;
  return holdCommission(s, o);
}

/** Holds a commission, wherever it was offered (a shop's counter, or a card). */
export function holdCommission(s: GameState, o: Commission): CommissionResult {
  const why = cantTake(s.player, o);
  if (why) return { ok: false, reason: why };
  const { why: _why, ...k } = o as Offered;
  void _why;
  const commissions = [...commissionsOf(s.player), k];
  return {
    ok: true,
    state: withPlayer(s, { ...s.player, crafts: { ...s.player.crafts, commissions } }),
  };
}

/** The pieces you carry that fill a commission: its thing at its tier and floor or better, worst first. */
export function fillers(c: Cultivator, k: Commission): { id: string; n: number }[] {
  const floor = rarityRank(k.floor);
  return heldOf(c, k.thing, item(k.thing).tier)
    .filter((h) => h.rank >= floor)
    .map(({ id, n }) => ({ id, n }));
}

/** How many of a commission's count you carry. */
export function carried(c: Cultivator, k: Commission): number {
  return fillers(c, k).reduce((t, h) => t + h.n, 0);
}

/**
 * Hands in an open commission at its counter: its count from the Bag, worst first, paid at its
 * fixed price, sold into the market; a point of craft renown in the region, and the keeper
 * remembers a promise kept.
 */
export function handIn(s: GameState, at: number): CommissionResult {
  const all = commissionsOf(s.player);
  const k = all[at];
  if (!k || k.done) return { ok: false, reason: 'No such commission open.' };
  if (carried(s.player, k) < k.n) return { ok: false, reason: `It asks for ${k.n}.` };
  const sh = shopById(k.shop);
  const m = marketOfShop(k.shop);
  const day = s.calendar.day;
  let player = s.player;
  let world = s.world;
  let left = k.n;
  for (const f of fillers(s.player, k)) {
    if (left <= 0) break;
    const n = Math.min(left, f.n);
    // What you made leaves your hands with its mark (K6), so the mark never outruns what you hold.
    const marked = Math.min(n, markedHeld(player, f.id));
    if (marked > 0) player = unmark(player, f.id, marked);
    player = addItem(player, f.id, -n);
    if (m) world = moveSupply(world, m, f.id, n, day);
    left -= n;
  }
  const total = Math.round(k.each * k.n * 100) / 100;
  player = withStones(player, receive(stonesOf(player), total, tierGrade(shopVein(sh))));
  player = addCraftFame(player, sh.region, craftOf(k), COMMISSION.point, day);
  const commissions = all.map((x, i) => (i === at ? { ...x, done: true } : x));
  player = { ...player, crafts: { ...player.crafts, commissions } };
  world = remember(
    withKeeper(world, sh),
    { holder: keeperId(sh.id), about: s.player.id, row: 'kept-promise', known: [keeperId(sh.id)] },
    day,
  );
  return { ok: true, state: withPlayer({ ...s, world }, player) };
}

/**
 * The month turns on your commissions (the day step): one left unfilled past its month costs its
 * keeper's regard and goes, and last month's done ones are forgotten.
 */
export function commissionsDay(s: GameState): GameState {
  const all = commissionsOf(s.player);
  if (all.length === 0) return s;
  const month = monthOf(s.calendar.day);
  const old = all.filter((k) => k.month < month);
  if (old.length === 0) return s;
  let world = s.world;
  for (const k of old) {
    if (k.done) continue;
    const sh = shopById(k.shop);
    world = remember(
      withKeeper(world, sh),
      {
        holder: keeperId(sh.id),
        about: s.player.id,
        row: 'broke-promise',
        value: COMMISSION.regard,
        note: 'A commission left unfilled',
        known: [keeperId(sh.id)],
      },
      s.calendar.day,
    );
  }
  const commissions = all.filter((k) => k.month >= month);
  return withPlayer({ ...s, world }, { ...s.player, crafts: { ...s.player.crafts, commissions } });
}

/**
 * A commission by name a card brings (the craft deck: a steward's order, a person who heard your
 * name): `batches` of what you make most of the craft at a shop, at ×1.5 the market and the floor.
 */
export function askedCommission(
  s: GameState,
  shopId: string,
  craft: CraftId,
  batches: number,
  floor: RarityId,
  asker: string,
): Commission | null {
  const m = marketOfShop(shopId);
  const r = yourMake(s.player, craft);
  if (!m || !r) return null;
  const f = floorIn(r.output, floor);
  return {
    shop: shopId,
    month: monthOf(s.calendar.day),
    kind: 'card',
    thing: r.output,
    n: recipeYield(r) * batches,
    floor: f,
    each: eachAt(s.world, m, r.output, f, s.calendar.day, COMMISSION.pay),
    asker,
  };
}

// ---------------------------------------------------------------- made to order

/** The craft a shop makes to order, if any. */
export function makesToOrder(shopId: string): CraftId | null {
  return MAKES_TO_ORDER[shopById(shopId).kind] ?? null;
}

/** The recipes a shop makes to order: what its catalogs sell of its craft, at tiers it stocks. */
export function orderable(shopId: string): Recipe[] {
  const sh: Shop = shopById(shopId);
  const craft = makesToOrder(shopId);
  if (!craft) return [];
  const tiers = shopTiers(sh);
  const out = new Map<string, Recipe>();
  for (const c of catalogsFor(sh))
    for (const l of c.lots) {
      if (!l.shops.includes(sh.kind)) continue;
      const r = recipeFor(l.thing);
      if (r && r.craft === craft && tiers.includes(recipeTier(r))) out.set(r.output, r);
    }
  return [...out.values()].sort((a, b) => (item(a.output).name < item(b.output).name ? -1 : 1));
}

/** The house's family mastery: the small shops Comprehension, a shop Mastery, a notable shop Perfection. */
export function houseMastery(sh: Shop): number {
  return sh.small
    ? ORDER.mastery.small
    : sh.weight >= 3
      ? ORDER.mastery.notable
      : ORDER.mastery.shop;
}

export interface Quote {
  recipe: Recipe;
  n: number;
  /** The price in low-grade stones: ×1.25 the market, less your inputs' worth. */
  price: number;
  /** What your inputs are worth, when you bring them. */
  inputs: number;
  /** What your inputs take from the Bag, when you bring them. */
  take: Record<string, number>;
  /** The lift: the house's mastery, and your inputs above the floor. */
  lift: number;
  odds: { rarity: RarityId; chance: number }[];
  /** Days until it is ready at the counter. */
  days: number;
  /** Why it can't be ordered, if it can't. */
  cant: string | null;
}

/** What an order of a recipe at a shop would cost and come out as, its inputs or yours. */
export function quote(s: GameState, shopId: string, output: string, yours: boolean): Quote | null {
  const r = orderable(shopId).find((x) => x.output === output);
  const m = marketOfShop(shopId);
  if (!r || !m) return null;
  const day = s.calendar.day;
  const sh = shopById(shopId);
  const n = recipeYield(r);
  const worth = priceOf(r.output) * marketFactor(s.world, m, r.output, day) * n;
  const plan = yours ? planInputs(s.player, r) : null;
  const inputs = plan
    ? Object.entries(plan.take).reduce(
        (t, [id, k]) => t + priceOf(id) * marketFactor(s.world, m, baseOf(id), day) * k,
        0,
      )
    : 0;
  const price = askAt(Math.max(worth * ORDER.least, worth * ORDER.pay - inputs), true);
  const lift = LIFT.mastery[houseMastery(sh)]! + (plan?.above ? LIFT.inputs : 0);
  const days = Math.max(1, Math.ceil(recipeHours(r) / ORDER.hours));
  let cant: string | null = null;
  if (plan && plan.short.length > 0) cant = 'You don’t carry its inputs.';
  else if (!pay(stonesOf(s.player), price)) cant = `It costs ${price} low.`;
  return {
    recipe: r,
    n,
    price,
    inputs: Math.round(inputs * 100) / 100,
    take: plan?.take ?? {},
    lift,
    odds: liftOdds(r, lift),
    days,
    cant,
  };
}

/** Orders a recipe made at a shop: paid now, your inputs taken, its rarity rolled from the shop and day. */
export function placeOrder(
  s: GameState,
  shopId: string,
  output: string,
  yours: boolean,
): CommissionResult {
  const q = quote(s, shopId, output, yours);
  if (!q) return { ok: false, reason: 'The shop doesn’t make that.' };
  if (q.cant) return { ok: false, reason: q.cant };
  const paid = pay(stonesOf(s.player), q.price)!;
  let player = withStones(s.player, paid);
  for (const [id, k] of Object.entries(q.take)) player = addItem(player, id, -k);
  const day = s.calendar.day;
  const rng = new Rng(hashSeed(`order/${shopId}/${Math.floor(day)}/${output}`));
  let roll = rng.next();
  let rarity = q.odds[0]!.rarity;
  for (const o of q.odds) {
    rarity = o.rarity;
    if ((roll -= o.chance) < 0) break;
  }
  const order: Order = {
    shop: shopId,
    made: variantId(output, rarity),
    n: q.n,
    ready: Math.floor(day) + q.days,
    paid: q.price,
  };
  const orders = [...(player.crafts.orders ?? []), order];
  return {
    ok: true,
    state: withPlayer(s, { ...player, crafts: { ...player.crafts, orders } }),
  };
}

/** Your orders at a shop, by their place in your list. */
export function ordersAt(c: Cultivator, shopId: string): { order: Order; at: number }[] {
  return (c.crafts.orders ?? [])
    .map((order, at) => ({ order, at }))
    .filter((x) => x.order.shop === shopId);
}

/** Collects a ready order at its counter into the Bag. */
export function collectOrder(s: GameState, at: number): CommissionResult {
  const orders = s.player.crafts.orders ?? [];
  const o = orders[at];
  if (!o) return { ok: false, reason: 'No such order.' };
  if (s.calendar.day < o.ready) return { ok: false, reason: 'It isn’t ready yet.' };
  const kept = withPlayer(s, {
    ...s.player,
    crafts: { ...s.player.crafts, orders: orders.filter((_, i) => i !== at) },
  });
  return { ok: true, state: gainItem(kept, o.made, o.n).state };
}
