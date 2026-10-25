// The cast's purse (design § Professions, people and powers, Who acts; N1): it has one job, saving
// for the cast member's next breakthrough pill, bought at their power's hall or the nearest market
// that sells it once it holds the price, through the same `buy` you run. They spend it on nothing
// else for now, and never at a black market (Jan's call in N1's talk).
import { baseOf } from '../content/items.ts';
import { priceOf as postedPrice } from './prices.ts';
import { realm, realmIndex, REALMS } from '../content/realms.ts';
import { SHOP_KIND_INFO, SHOPS, type Shop } from '../content/shops.ts';
import { MARKETS, placeChain, type Market } from './markets.ts';
import { houseOf, isOrganization, membershipsOf, monthIndex } from './organizations.ts';
import { buy, priceToYou, shelf } from './shops.ts';
import type { GameState } from './state.ts';
import { castOf, heldOf, monthHolders, purseOf, realmStageOf } from './who.ts';

/** The share of a pill's posted price a purse must hold before its holder goes looking. */
const LOOKS_FROM = 0.5;

/**
 * Someone's next breakthrough pill: the gate pill of the realm above, once they stand at their
 * realm's last stage and don't hold one; null otherwise. The cast cultivate qi, so its gate.
 */
export function nextPill(s: GameState, who: string): string | null {
  const r = realmStageOf(s, who);
  if (r.stage < realm(r.realm).stages) return null;
  const next = REALMS[realmIndex(r.realm) + 1];
  const pill = next?.gates?.qi;
  if (!pill || heldOf(s, who, pill) > 0) return null;
  return pill;
}

/** The market a home stands in or holds: where the search for a pill starts from. */
function homeMarket(home: string): Market | undefined {
  return (
    MARKETS.find((m) => m.id === home || m.place === home) ??
    MARKETS.find((m) => placeChain(m.place).includes(home))
  );
}

/**
 * Where someone looks for their pill, in order: their powers' halls, then every shop of the
 * markets in their home's region, nearest their home first, never a black market.
 */
export function pillShops(s: GameState, who: string): Shop[] {
  const houses = membershipsOf(s.world, who)
    .filter((m) => isOrganization(m.power) && !m.guest)
    .map((m) => m.power);
  const halls = SHOPS.filter(
    (sh) => SHOP_KIND_INFO[sh.kind].members && !!sh.power && houses.includes(houseOf(sh.power)),
  );
  const home = castOf(s, who)?.home;
  const from = home ? homeMarket(home) : undefined;
  if (!from) return halls;
  const near = MARKETS.filter((m) => m.region === from.region)
    .map((m) => ({ m, d: Math.hypot(m.x - from.x, m.y - from.y) }))
    .sort((a, b) => a.d - b.d)
    .flatMap(({ m }) => m.shops.map((id) => SHOPS.find((sh) => sh.id === id)!))
    .filter((sh) => !!sh && sh.kind !== 'black-market' && !halls.includes(sh));
  return [...halls, ...near];
}

/**
 * A cast member's purse buys their next breakthrough pill: the first lot of it on a shelf they
 * look at that the purse covers, bought through `buy`. Null when they buy nothing this month.
 */
export function buyPill(s: GameState, who: string): GameState | null {
  const pill = nextPill(s, who);
  if (!pill || purseOf(s, who) < postedPrice(pill) * LOOKS_FROM) return null;
  const purse = purseOf(s, who);
  for (const sh of pillShops(s, who)) {
    const lot = shelf(s, who, sh.id).find((l) => baseOf(l.thing) === pill);
    if (!lot || priceToYou(s, who, sh.id, lot, 1) > purse + 1e-9) continue;
    const r = buy(s, who, sh.id, lot.slot, 1);
    if (r.ok) return r.state;
  }
  return null;
}

/**
 * As a month turns (`from` the day the stretch began), every cast member whose purse holds the
 * price of their next pill buys it.
 */
export function castPills(s: GameState, from: number): GameState {
  if (monthIndex(from) === monthIndex(s.calendar.day)) return s;
  let next = s;
  for (const who of monthHolders(s)) {
    if (!castOf(next, who)) continue;
    next = buyPill(next, who) ?? next;
  }
  return next;
}
