// Membership’s day and the words the Character and People screens read.
import {
  GUEST_ELDER,
  INNER_TRIAL,
  TREATMENT_RULES,
  type SeatId,
} from '../../content/organizations.ts';
import { realm, realmIndex, type RealmId } from '../../content/realms.ts';
import { priceWords } from '../purse.ts';
import { type Member } from '../resolver/world.ts';
import { type GameState } from '../state.ts';
import { isOrganization, organization, houseOf } from './identity.ts';
import { type SeatRange, seatOf, seatTitle, raiseEarly, seatsByRealm } from './seats.ts';
import { membershipsOf } from './membership.ts';
import { yearOf, monthOfYear, realmStageOf } from './trial.ts';
import { isTop, allowanceOf, payAllowances } from './contribution.ts';
import { dwellingDensity } from './dwelling.ts';
import { quotaOf, settleQuotas, leaveOf, atSeat, countLeave } from './duty.ts';

/**
 * Membership's day (O2, O3): the allowances as the month turns, then the quotas, the true seat for
 * a member well ahead of their years, and the leave the days away have taken; `home` says where a
 * member is home (core/jobs.ts `atHome`, which knows the posts and the map).
 */
export function membershipDay(
  s: GameState,
  days: number,
  home: (s: GameState, power: string) => boolean = atSeat,
): GameState {
  let next = payAllowances(s);
  next = settleQuotas(next);
  next = seatsByRealm(next);
  next = raiseEarly(next);
  return countLeave(next, days, home);
}

/** A seat's realms in words: "Qi Condensation 7–9", "Foundation Establishment", "Core Formation and below". */
export function rangeWords(r: SeatRange): string {
  const name = (x: RealmId) => realm(x).name;
  const layers = (a: number, b: number) =>
    a === 1 && b === realm(r.to.realm).stages ? '' : ` ${a}–${b}`;
  if (r.from === null) {
    const all = r.to.stage === realm(r.to.realm).stages;
    // Nothing stands below the first realm, and a split realm has nothing under it.
    if (!all) return `${name(r.to.realm)} 1–${r.to.stage}`;
    return realmIndex(r.to.realm) === 0 ? name(r.to.realm) : `${name(r.to.realm)} and below`;
  }
  return `${name(r.from.realm)}${layers(r.from.stage, r.to.stage)}`;
}

/** When the next inner trial is held, in words, or null for a seat past it. */
function trialWords(m: Member, seat: SeatId, day: number): string | null {
  if (seat !== 'outer' || organization(m.power).preset.byRealm) return null;
  const months = (12 + INNER_TRIAL.month - monthOfYear(day)) % 12;
  if (months === 0)
    return m.tried === yearOf(day) ? 'inner trial next year' : 'inner trial this month';
  return `inner trial in ${months} month${months === 1 ? '' : 's'}`;
}

/**
 * How a power treats your seat, in words (the checkpoint's fix): "a harsh gate: half the allowance,
 * a 30% tithe on what you bring in", or null at a fair one.
 */
export function treatmentWords(power: string, seat: SeatId): string | null {
  const org = organization(houseOf(power));
  const t = TREATMENT_RULES[org.treatment];
  const kind = org.preset.name.split(/[ ,]/)[0]!.toLowerCase();
  if (org.treatment === 'generous')
    return `a generous ${kind}: the allowance ×${t.low}${t.tithe ? '' : ' and no quota'}`;
  if (org.treatment !== 'harsh') return null;
  if (isTop(seat)) return `a harsh ${kind}, but your seat draws ×${t.top} and pays no tithe`;
  return `a harsh ${kind}: half the allowance, a ${Math.round(t.tithe * 100)}% tithe on what you bring in`;
}

/** Your memberships as the Character and People screens show them. */
export function membershipsView(s: GameState) {
  const r = realmStageOf(s);
  return membershipsOf(s.world, s.player.id)
    .filter((m) => isOrganization(m.power))
    .map((m) => {
      const org = organization(m.power);
      const seat = m.guest ? 'elder' : seatOf(s.world, s.player.id, m.power, r)!;
      const a = allowanceOf(m.power, seat, r.realm, m.guest);
      const pills = a.pills > 0 ? ` and ${a.pills === 1 ? 'a pill' : `${a.pills} pills`}` : '';
      const dwelling = m.guest ? null : dwellingDensity(seat, m.power);
      // What it asks (O3): the quota, and the leave left this year where a house counts it.
      const quota = quotaOf(m.power, seat, m.guest);
      const missed = m.missed ? `, ${m.missed} missed` : '';
      const allowed = m.guest ? Infinity : leaveOf(m.power, seat);
      const taken = m.leave?.year === yearOf(s.calendar.day) ? m.leave.days : 0;
      return {
        power: m.power,
        name: org.name,
        title: m.guest
          ? { name: GUEST_ELDER.name, hanzi: GUEST_ELDER.hanzi }
          : seatTitle(m.power, seat, r.realm),
        balance: m.balance,
        currency: org.preset.currency.name,
        trial: m.guest ? null : trialWords(m, seat, s.calendar.day),
        treatment: m.guest ? null : treatmentWords(m.power, seat),
        allowance:
          a.stones > 0 || a.pills > 0 ? `${priceWords(a.stones)}${pills} a month` : 'no allowance',
        dwelling: dwelling && dwelling > 1 ? `qi ×${dwelling} secluding there` : null,
        quota: quota > 0 ? `quota ${quota} a month${missed}` : null,
        leave:
          allowed === Infinity
            ? null
            : taken > allowed
              ? `leave overstayed by ${Math.ceil(taken - allowed)} days`
              : `${Math.floor(allowed - taken)} days' leave left`,
        protector: !!m.protector,
      };
    });
}
