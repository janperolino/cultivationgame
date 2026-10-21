// What a power asks: monthly quotas, striking off, and the year’s leave.
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
import { addEvent, withPlayer, type GameState } from '../state.ts';
import { isOrganization, organization, houseOf } from './identity.ts';
import { seatOf } from './seats.ts';
import { membership, membershipsOf, leavePower, guardedKnown } from './membership.ts';
import { yearOf, realmStageOf } from './trial.ts';
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
function strikeOff(s: GameState, power: string): GameState {
  const house = houseOf(power);
  const knows = guardedKnown(s.player, house);
  const copies = { ...s.player.copies };
  for (const thing of Object.keys(copies)) if (guardedBy(thing) === house) delete copies[thing];
  const opts = { you: true, knows, struck: true };
  const left = leavePower(s.world, s.player.id, house, s.calendar.day, opts);
  const st = { ...withPlayer(s, { ...s.player, copies }), world: left.world };
  return addEvent(st, 'power', { power: house, what: 'struck-off' });
}

/**
 * The monthly quota (design: a post kept or contribution paid in): as each month turns, each
 * power takes its seat's quota from the balance. Short, the month is missed: the second running
 * costs standing, the third strikes you off. A quota met clears the count.
 */
export function settleQuotas(s: GameState): GameState {
  const month = monthIndex(s.calendar.day);
  const who = s.player.id;
  const r = realmStageOf(s);
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
      const kept = postKeptFor(state.player, m.power, k - 1);
      const met = due === 0 || kept || m.balance >= due;
      const missed = met ? 0 : (m.missed ?? 0) + 1;
      const paid = met && !kept && due > 0;
      let world = paid ? addBalance(state.world, who, m.power, -due) : state.world;
      world = withMember(world, m, { quota: k, missed });
      state = { ...state, world };
      if (missed >= QUOTA_MISSED.struck) {
        state = strikeOff(state, m.power);
        break;
      }
      if (missed === QUOTA_MISSED.standing) {
        const row = { power: m.power, about: who, row: 'missed-quota' } as const;
        state = { ...state, world: addStanding(state.world, row, state.calendar.day) };
        state = addEvent(state, 'power', { power: m.power, what: 'quota-missed' });
      }
    }
  }
  return state;
}

/** Whether a power's post was kept a month: half its shifts or more (core/jobs.ts keeps the tally). */
function postKeptFor(c: GameState['player'], power: string, month: number): boolean {
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

/** Whether the player is at a power's seat or a branch hall of it: home, not on leave. */
export function atSeat(s: GameState, power: string): boolean {
  if (!s.map) return true;
  const place = s.map.inside;
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
  days: number,
  home: (s: GameState, power: string) => boolean = atSeat,
): GameState {
  if (days <= 0) return s;
  const who = s.player.id;
  const day = s.calendar.day;
  const year = yearOf(day);
  const r = realmStageOf(s);
  let state = s;
  for (const m of membershipsOf(s.world, who)) {
    if (!isOrganization(m.power) || m.guest || home(s, m.power)) continue;
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
      state = addEvent(state, 'power', { power: m.power, what: 'leave-over' });
  }
  return state;
}
