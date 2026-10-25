// The currency: donating, balances, monthly allowances and tithes.
import { DAYS_PER_MONTH } from '../../content/calendar.ts';
import {
  ALLOWANCE,
  ALLOWANCE_PILL,
  ALLOWANCE_STEP,
  DONATION,
  ELDER_ALLOWANCE,
  TREATMENT_RULES,
  type SeatId,
} from '../../content/organizations.ts';
import { realmScale, type RealmId } from '../../content/realms.ts';
import { priceOf } from '../prices.ts';
import { realmGrade } from '../purse.ts';
import { isMember } from '../resolver/names.ts';
import { type RealmStage, type World } from '../resolver/world.ts';
import { gainItem } from '../map/ground.ts';
import { type GameState } from '../state.ts';
import { cultivator, giveTo, heldOf, payFrom, realmStageOf, receiveInto } from '../who.ts';
import { isOrganization, organization, houseOf } from './identity.ts';
import { seatRank, seatOf } from './seats.ts';
import { membership } from './membership.ts';
import { addGiven } from './trial.ts';

/** The points a gift is worth (design: stones at 2 low a point, goods at half their sell price). */
export function donationPoints(gift: {
  stones?: number;
  things?: Readonly<Record<string, number>>;
}): number {
  let points = (gift.stones ?? 0) / DONATION.stonesPerPoint;
  for (const [thing, n] of Object.entries(gift.things ?? {}))
    points += priceOf(thing) * DONATION.sellRate * DONATION.goodsShare * n;
  return Math.round(points * 10) / 10;
}

/** A member's balance moved: earned, donated or spent, never below nothing. */
export function addBalance(w: World, who: string, power: string, n: number): World {
  const house = houseOf(power);
  if (!Number.isFinite(n)) return w;
  // To a hundredth, as a standing line's price is posted: a tenth would make one under 0.05 free.
  return {
    ...w,
    members: w.members.map((m) =>
      m.who === who && m.power === house
        ? { ...m, balance: Math.max(0, Math.round((m.balance + n) * 100) / 100) }
        : m,
    ),
  };
}

/** The player donates stones (low's worth) and things to a power they belong to. */
/** What is wrong with a gift's counts, or null: stones a number above nothing, things whole. */
export function giftFlaw(gift: {
  stones?: number;
  things?: Readonly<Record<string, number>>;
}): string | null {
  if (gift.stones !== undefined && !(Number.isFinite(gift.stones) && gift.stones >= 0))
    return 'Name how many stones.';
  for (const n of Object.values(gift.things ?? {}))
    if (!Number.isInteger(n) || n <= 0) return 'Name how many.';
  return null;
}

export function donate(
  s: GameState,
  who: string,
  power: string,
  gift: { stones?: number; things?: Readonly<Record<string, number>> },
): { ok: true; points: number; state: GameState } | { ok: false; why: string } {
  const house = houseOf(power);
  if (!isMember(s.world, who, house)) return { ok: false, why: 'Only their own donate.' };
  const flaw = giftFlaw(gift);
  if (flaw) return { ok: false, why: flaw };
  let state = s;
  if (gift.stones) {
    const paid = payFrom(state, who, gift.stones);
    if (!paid) return { ok: false, why: 'You haven’t the stones.' };
    state = paid;
  }
  for (const [thing, n] of Object.entries(gift.things ?? {})) {
    if (heldOf(state, who, thing) < n) return { ok: false, why: 'You don’t have that many.' };
    state = giveTo(state, who, thing, -n);
  }
  const points = donationPoints(gift);
  return {
    ok: true,
    points,
    state: { ...state, world: addBalance(state.world, who, house, points) },
  };
}

/** The month a day falls in, counted from day 0: what an allowance is paid by. */
export function monthIndex(day: number): number {
  return Math.floor(day / DAYS_PER_MONTH);
}

/** True disciple and up: the seats a harsh power pays ×1.5 and never tithes. */
export function isTop(seat: SeatId): boolean {
  return seatRank(seat) >= seatRank('true');
}

/**
 * A seat's monthly allowance 月例 (design § What membership gives and asks): outer 3 low and a
 * Qi-Gathering Pill, inner 15 low and three, from true up 60 low on the realm curve from
 * Foundation by the holder's realm, each seat at least ×1.5 the one below; scaled by how the power
 * treats its own. A guest elder
 * draws an elder's at their realm, as a fair power pays it.
 */
export function allowanceOf(
  power: string,
  seat: SeatId,
  holder: RealmId,
  guest = false,
): { stones: number; pills: number } {
  // From the true seat up, 60 low on the realm curve by the holder's realm, and every seat at
  // least ×1.5 the one below it (the checkpoint's fix), so a head never draws a disciple's.
  const curve = (ELDER_ALLOWANCE.stones * realmScale(holder)) / realmScale(ELDER_ALLOWANCE.at);
  let stones: number = ALLOWANCE.inner.stones;
  for (let k = seatRank('true'); k <= seatRank(seat); k++)
    stones = Math.max(curve, stones * ALLOWANCE_STEP);
  const base =
    seat === 'outer' || seat === 'inner'
      ? ALLOWANCE[seat]
      : { stones, pills: ALLOWANCE.true.pills };
  const round = (n: number) => Math.round(n * 10) / 10;
  if (guest) return { stones: round(base.stones), pills: base.pills };
  const t = TREATMENT_RULES[organization(houseOf(power)).treatment];
  const top = isTop(seat);
  return {
    stones: round(base.stones * (top ? t.top : t.low)),
    pills: Math.floor(base.pills * (top ? t.top : t.lowPills)),
  };
}

/**
 * The share of what a member brings in that their power takes (design: harsh, a tithe of 30% on
 * the bounties and loot its outer and inner seats bring in); nothing at a fair or generous power,
 * from the true seat up, or for a guest.
 */
export function titheOf(w: World, who: string, power: string, r: RealmStage): number {
  const house = houseOf(power);
  const m = membership(w, who, house);
  if (!m || m.guest) return 0;
  const seat = seatOf(w, who, house, r)!;
  return isTop(seat) ? 0 : TREATMENT_RULES[organization(house).treatment].tithe;
}

/**
 * Someone's allowances come as each month turns, from every power they belong to, for each month
 * since the last one paid: stones in their realm's grade and below (a cast member's purse, N1), and
 * the pills (their held). A membership with no month kept starts counting now.
 */
export function payAllowances(s: GameState, who: string): GameState {
  const month = monthIndex(s.calendar.day);
  const mine = s.world.members.filter((m) => m.who === who && isOrganization(m.power));
  if (!mine.some((m) => m.paid === undefined || m.paid < month)) return s;
  const r = realmStageOf(s, who);
  let state = s;
  const pills: Record<string, number> = {};
  for (const m of mine) {
    const months = m.paid === undefined ? 0 : month - m.paid;
    if (months <= 0) continue;
    const seat = m.guest ? 'elder' : seatOf(s.world, who, m.power, r)!;
    const a = allowanceOf(m.power, seat, r.realm, m.guest);
    if (a.stones > 0) state = receiveInto(state, who, a.stones * months, realmGrade(r.realm));
    if (a.pills > 0) {
      pills[ALLOWANCE_PILL] = (pills[ALLOWANCE_PILL] ?? 0) + a.pills * months;
      // What a power gave is counted for the hall that won't buy it back, and only a full
      // cultivator sells (`given` is keyed by power, so it stays yours).
      if (cultivator(s, who)) {
        const held = heldOf(s, who, ALLOWANCE_PILL);
        const world = addGiven(state.world, m.power, ALLOWANCE_PILL, a.pills * months, held);
        state = { ...state, world };
      }
    }
  }
  const members = state.world.members.map((m) =>
    m.who === who && isOrganization(m.power) ? { ...m, paid: month } : m,
  );
  state = { ...state, world: { ...state.world, members } };
  for (const [id, n] of Object.entries(pills))
    state = giveTo(state, who, id, n, (st, i, k) => gainItem(st, i, k).state);
  return state;
}
