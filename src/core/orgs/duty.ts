// What a power asks: monthly quotas, striking off, and the year’s leave.
import { drilling } from '../wheel.ts';
import { DAYS_PER_MONTH } from '../../content/calendar.ts';
import {
  LEAVE,
  LEAVE_OVER,
  QUOTA,
  QUOTA_MISSED,
  type SeatId,
} from '../../content/organizations.ts';
import { hasJob, job, KEPT_MONTH } from '../../content/jobs.ts';
import { guardedBy } from '../markets.ts';
import { addStanding } from '../resolver/opinion.ts';
import { addEvent, type Cultivator, type GameState } from '../state.ts';
import { castOf, cultivator, realmStageOf, withCultivator } from '../who.ts';
import { isOrganization, organization, houseOf } from './identity.ts';
import { seatOf } from './seats.ts';
import { membership, membershipsOf, leavePower, guardedKnown } from './membership.ts';
import { yearOf } from './trial.ts';
import { addBalance, monthIndex } from './contribution.ts';
import { withMember } from './tutelage.ts';

/** A seat's monthly quota in the power's currency: none at a generous power or for a guest. */
export function quotaOf(power: string, seat: SeatId, guest = false): number {
  if (guest || organization(houseOf(power)).treatment === 'generous') return 0;
  return QUOTA[seat];
}

/**
 * Struck off the rolls for three missed quotas: a parting by the rule, never a betrayal whatever
 * the type, kept as "Struck from our rolls" in place of the parting. Its copies go back to its
 * pavilion as they do when you ask to be released, and what you learned stays under the oath.
 */
function strikeOff(s: GameState, who: string, power: string): GameState {
  const house = houseOf(power);
  const c = cultivator(s, who);
  const knows = guardedKnown(c, house);
  const opts = { you: !!c, knows, struck: true };
  const left = leavePower(s.world, who, house, s.calendar.day, opts);
  if (!c) return { ...s, world: left.world };
  const copies = { ...c.copies };
  for (const thing of Object.keys(copies)) if (guardedBy(thing) === house) delete copies[thing];
  const st = { ...withCultivator(s, { ...c, copies }), world: left.world };
  return addEvent(st, 'power', { power: house, what: 'struck-off' });
}

/** A power's chronicle line, for the one who plays: the cast's month leaves none (N3 words it). */
function note(s: GameState, who: string, data: Record<string, string>): GameState {
  return cultivator(s, who) ? addEvent(s, 'power', data) : s;
}

/**
 * The monthly quota (design: a post kept or contribution paid in): as each month turns, each
 * power takes its seat's quota from the balance. Short, the month is missed: the second running
 * costs standing, the third strikes them off. A quota met clears the count. A cast member's post
 * is kept while they are at home (`home`, N1), as yours is by the shifts you keep.
 */
export function settleQuotas(
  s: GameState,
  who: string,
  home: (s: GameState, who: string, power: string) => boolean = atSeat,
): GameState {
  const month = monthIndex(s.calendar.day);
  const r = realmStageOf(s, who);
  let state = s;
  for (const first of membershipsOf(s.world, who)) {
    if (!isOrganization(first.power)) continue;
    const from = first.quota ?? first.paid;
    if (from === undefined || from >= month) continue;
    for (let k = from + 1; k <= month; k++) {
      const m = membership(state.world, who, first.power);
      if (!m) break;
      const seat = m.guest ? 'elder' : seatOf(state.world, who, m.power, r)!;
      const due = quotaOf(m.power, seat, m.guest);
      // A post kept the month before meets the quota by the work (O4); otherwise it is paid in
      // from the balance.
      const c = cultivator(state, who);
      const kept = c ? postKeptFor(c, m.power, k - 1) : home(state, who, m.power);
      // A post isn't worked through the tutorial layers (`drilling`), so no quota is asked of a
      // member who is still drilling (The opening, built: the cadets were struck off by minute 15).
      const met = due === 0 || kept || m.balance >= due || (!!c && drilling(c));
      const missed = met ? 0 : (m.missed ?? 0) + 1;
      const paid = met && !kept && due > 0 && m.balance >= due;
      let world = paid ? addBalance(state.world, who, m.power, -due) : state.world;
      world = withMember(world, m, { quota: k, missed });
      state = { ...state, world };
      if (missed >= QUOTA_MISSED.struck) {
        state = strikeOff(state, who, m.power);
        break;
      }
      if (missed === QUOTA_MISSED.standing) {
        const row = { power: m.power, about: who, row: 'missed-quota' } as const;
        state = { ...state, world: addStanding(state.world, row, state.calendar.day) };
        state = note(state, who, { power: m.power, what: 'quota-missed' });
      }
    }
  }
  return state;
}

/** Whether a power's post was kept a month: half its shifts or more (core/jobs.ts keeps the tally). */
function postKeptFor(c: Cultivator, power: string, month: number): boolean {
  return c.jobs.some((h) => {
    if (!hasJob(h.id)) return false;
    const j = job(h.id);
    if (!j.power || j.hire || houseOf(j.power) !== houseOf(power)) return false;
    return h.last?.month === month && h.last.kept >= KEPT_MONTH.share * DAYS_PER_MONTH;
  });
}

/** A seat's leave a year in days, counted only by a house; Infinity where none is counted. */
export function leaveOf(power: string, seat: SeatId, guest = false): number {
  const org = organization(houseOf(power));
  if (guest || org.preset.bond !== 'house') return Infinity;
  return LEAVE[seat];
}

/**
 * Whether someone is at a power's seat or a branch hall of it: home, not on leave. You stand where
 * the map has you; a cast member is where this season finds them (N2), else where they live.
 */
export function atSeat(s: GameState, who: string, power: string): boolean {
  const k = castOf(s, who);
  if (!k && !s.map) return true;
  const place = k ? (k.at ?? k.home) : s.map!.inside;
  if (!place) return false;
  return place === power || (isOrganization(place) && organization(place).branchOf === power);
}

/** How many standing rows an overstay of so many days has earned: one a month begun. */
function overstayRows(days: number): number {
  return days <= 0 ? 0 : Math.ceil(days / LEAVE_OVER.rowEvery);
}

/**
 * Leave (design: three months a year at the outer and inner seats, more as you climb): days away
 * from the power's seat count against the year's leave. Past it each day costs a point of the
 * balance, and each month overstayed a standing row ("Overstayed our leave"). The count starts
 * over as the year turns.
 */
export function countLeave(
  s: GameState,
  who: string,
  days: number,
  home: (s: GameState, who: string, power: string) => boolean = atSeat,
): GameState {
  if (days <= 0) return s;
  const day = s.calendar.day;
  const year = yearOf(day);
  const r = realmStageOf(s, who);
  let state = s;
  for (const m of membershipsOf(s.world, who)) {
    if (!isOrganization(m.power) || m.guest || home(s, who, m.power)) continue;
    const allowed = leaveOf(m.power, seatOf(s.world, who, m.power, r)!);
    if (allowed === Infinity) continue;
    const before = m.leave?.year === year ? m.leave.days : 0;
    const after = before + days;
    let world = withMember(state.world, m, { leave: { year, days: after } });
    const over = Math.max(0, after - allowed) - Math.max(0, before - allowed);
    if (over > 0) {
      world = addBalance(world, who, m.power, -over * LEAVE_OVER.pointsPerDay);
      const rows = overstayRows(after - allowed) - overstayRows(before - allowed);
      for (let i = 0; i < rows; i++)
        world = addStanding(world, { power: m.power, about: who, row: 'overstayed' }, day);
    }
    state = { ...state, world };
    if (over > 0 && before <= allowed)
      state = note(state, who, { power: m.power, what: 'leave-over' });
  }
  return state;
}
