// The cast's purse (design § Professions, people and powers, Who acts; N1): it has one job, saving
// for the cast member's next breakthrough pill, bought at their power's hall or the nearest market
// that sells it once it holds the price, through the same `buy` you run. They spend it on nothing
// else for now, and never at a black market (Jan's call in N1's talk).
import { baseOf } from '../content/items.ts';
import { REACH_LI } from '../content/markets.ts';
import { priceOf as postedPrice } from './prices.ts';
import { realm, realmIndex, REALMS } from '../content/realms.ts';
import { SHOP_KIND_INFO, SHOPS, type Shop } from '../content/shops.ts';
import { MARKETS, placeChain, type Market } from './markets.ts';
import { houseOf, isOrganization, membershipsOf, monthIndex } from './organizations.ts';
import { buy, mayStock, priceToYou, shelf, type StockLot } from './shops.ts';
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
export function homeMarket(home: string): Market | undefined {
  return (
    MARKETS.find((m) => m.id === home || m.place === home) ??
    MARKETS.find((m) => placeChain(m.place).includes(home))
  );
}

/**
 * Where someone looks for their pill, in order: their powers' halls, then every shop of the
 * markets their home's market reaches, nearest their home first, never a black market.
 */
export function pillShops(s: GameState, who: string): Shop[] {
  const houses = membershipsOf(s.world, who)
    .filter((m) => isOrganization(m.power) && !m.guest)
    .map((m) => m.power);
  const halls = SHOPS.filter(
    (sh) => SHOP_KIND_INFO[sh.kind].members && !!sh.power && houses.includes(houseOf(sh.power)),
  );
  const home = castOf(s, who)?.home;
  if (!home) return halls;
  return [...halls, ...nearShops(home).filter((sh) => !halls.includes(sh))];
}

const nearBy = new Map<string, Shop[]>();

/**
 * Every shop of the markets a home's market reaches (its own, and those within its reach, content
 * markets.ts `REACH_LI`), nearest the home first, never a black market (N2: a region's cast
 * reading every shelf of the region each month cost a long seclusion a minute).
 */
function nearShops(home: string): Shop[] {
  let out = nearBy.get(home);
  if (out) return out;
  const from = homeMarket(home);
  out = !from
    ? []
    : MARKETS.filter((m) => m.region === from.region)
        .map((m) => ({ m, d: Math.hypot(m.x - from.x, m.y - from.y) }))
        .filter(({ m, d }) => m === from || d <= REACH_LI[from.kind])
        .sort((a, b) => a.d - b.d)
        .flatMap(({ m }) => m.shops.map((id) => SHOPS.find((sh) => sh.id === id)!))
        // A cast member never buys in taels (N1), so a mortal's shop is never read.
        .filter(
          (sh) => !!sh && sh.kind !== 'black-market' && SHOP_KIND_INFO[sh.kind].money !== 'silver',
        );
  nearBy.set(home, out);
  return out;
}

/**
 * A cast member's purse buys their next breakthrough pill: the first lot of it on a shelf they
 * look at that the purse covers, bought through `buy`. Null when they buy nothing this month.
 * `seen` remembers, across one month's shoppers, the pill's lot on each shelf already read (a
 * hall's by the house that sees its members' lines), so a region's cast doesn't read every shelf
 * each (N2); a buy forgets its shelf.
 */
export function buyPill(
  s: GameState,
  who: string,
  seen = new Map<string, StockLot | null>(),
): GameState | null {
  const pill = nextPill(s, who);
  if (!pill || purseOf(s, who) < postedPrice(pill) * LOOKS_FROM) return null;
  const purse = purseOf(s, who);
  for (const sh of pillShops(s, who)) {
    if (!mayStock(sh.id, pill)) continue;
    const key = `${pill}|${sh.id}|${SHOP_KIND_INFO[sh.kind].members ? (sh.power ?? '') : ''}`;
    if (!seen.has(key))
      seen.set(key, shelf(s, who, sh.id).find((l) => baseOf(l.thing) === pill) ?? null);
    const lot = seen.get(key);
    if (!lot || priceToYou(s, who, sh.id, lot, 1) > purse + 1e-9) continue;
    const r = buy(s, who, sh.id, lot.slot, 1);
    seen.delete(key);
    if (r.ok) return r.state;
  }
  return null;
}

/**
 * As a month turns (`from` the day the stretch began), every cast member whose purse holds the
 * price of their next pill buys it. The day step reads it as each season turns (N2).
 */
export function castPills(s: GameState, from: number): GameState {
  if (monthIndex(from) === monthIndex(s.calendar.day)) return s;
  let next = s;
  const seen = new Map<string, StockLot | null>();
  for (const who of monthHolders(s)) {
    if (!castOf(next, who)) continue;
    next = buyPill(next, who, seen) ?? next;
  }
  return next;
}
