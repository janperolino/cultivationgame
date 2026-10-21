// Jobs, posts and duty hours (design § Cultivation, Duty hours; § Professions, people and powers,
// Posts; O4). A job you hold puts its shift on your wheel as Duty hours, locked like sleep. A shift
// is kept when you stand at the job's place with no course set as its hours pass: each duty day
// pays on the realm curve, in the power's currency, in stones where its type pays them, or all in
// stones for a hire. A shift missed costs standing with its giver, unless a house's leave covers
// it; a month with half its shifts kept is remembered, and counts as the quota kept. Leaving is
// the giver's own way out: a sect's post is dropped freely, a dynasty's soldier deserts.
import { DAYS_PER_MONTH } from '../content/calendar.ts';
import { HOURS_PER_DAY } from '../content/hours.ts';
import {
  DUTY_PAY,
  HIRE_LETS_GO,
  KEPT_MONTH,
  MISSED_SHIFT,
  PAYS_STONES,
  hasJob,
  isHire,
  job,
  JOBS,
  type Job,
} from '../content/jobs.ts';
import { STANDING_ROWS } from '../content/memories.ts';
import { parentsOf, veinAt } from '../content/map/index.ts';
import { ENTER_LI } from '../content/map/places.ts';
import { realm as realmInfo, realmScale, stageName, type RealmId } from '../content/realms.ts';
import { mapOf, mapPlaceOf } from './map/travel.ts';
import { contact } from './map/encounters.ts';
import type { Encounter } from './map/schema.ts';
import { bandOf } from './guarded.ts';
import { hashSeed } from './rng.ts';
import { areaAt, type RegionMap } from './map/region.ts';
import { drilling } from './wheel.ts';
import { guardedBy } from './markets.ts';
import {
  addBalance,
  atSeat,
  houseOf,
  isOrganization,
  leaveOf,
  leavePower,
  guardedKnown,
  membership,
  monthIndex,
  organization,
  rank,
  realmStageOf,
  seatOf,
  seatRanges,
  seatRank,
  theName,
  yearOf,
} from './organizations.ts';
import { receive, stonesOf, tierGrade, withStones } from './purse.ts';
import { addStanding } from './resolver/opinion.ts';
import type { World } from './resolver/world.ts';
import { addEvent, realmOf, withPlayer, type Cultivator, type GameState } from './state.ts';

export type Held = Cultivator['jobs'][number];

/** What a duty day pays at a realm: points of the power's currency and low-grade stones. */
export function jobPay(j: Job, r: RealmId): { points: number; stones: number } {
  const day = DUTY_PAY * realmScale(r) * (j.danger?.pay ?? 1);
  if (isHire(j)) return { points: 0, stones: day };
  const type = organization(houseOf(j.power!)).type;
  return PAYS_STONES.includes(type)
    ? { points: day / 2, stones: day / 2 }
    : { points: day, stones: 0 };
}

function heldJob(c: Cultivator, id: string): Held | undefined {
  return c.jobs.find((h) => h.id === id);
}

/** The jobs taken at a place: its posts and hires, a kingdom's at the town that stands for it. */
export function jobsAt(place: string, map?: RegionMap | null): Job[] {
  return JOBS.filter(
    (j) => j.place === place || (!!j.place && !!map && mapPlaceOf(map, j.place)?.id === place),
  );
}

/**
 * Whether you stand at a job's place to keep its shift: inside it, or at it with no course set.
 * Before the map has opened, you are at home.
 */
export function atPost(s: GameState, j: Job): boolean {
  if (!j.place) return false;
  const life = s.map;
  if (!life) return true;
  if (life.course) return false;
  const map = mapOf(s);
  const p = map ? mapPlaceOf(map, j.place) : null;
  if (life.inside) return life.inside === j.place || life.inside === p?.id;
  return !!p && Math.hypot(p.x - life.at[0], p.y - life.at[1]) < ENTER_LI;
}

/**
 * Whether a house member is home, not on leave (the checkpoint's first finding): at the power's
 * seat or a branch hall, at a post of its they hold, or, for a dynasty, at any town or garrison of
 * its kingdom with no course set.
 */
export function atHome(s: GameState, power: string): boolean {
  if (atSeat(s, power)) return true;
  const house = houseOf(power);
  const posts = s.player.jobs.filter((h) => hasJob(h.id) && !isHire(job(h.id)));
  if (posts.some((h) => houseOf(job(h.id).power!) === house && atPost(s, job(h.id)))) return true;
  if (organization(house).type !== 'dynasty') return false;
  const life = s.map;
  const map = mapOf(s);
  if (!life || life.course || !map) return false;
  const inLand = (id: string | null) => !!id && (id === house || parentsOf(id).includes(house));
  return map.places.some(
    (p) =>
      p.settled &&
      Math.hypot(p.x - life.at[0], p.y - life.at[1]) < ENTER_LI &&
      (inLand(p.id) || inLand(p.area) || inLand(areaAt(map, [p.x, p.y])?.id ?? null)),
  );
}

/** The jobs whose shift you can keep where you stand: their hours are Duty on the wheel today. */
export function onShift(s: GameState): Cultivator {
  const c = s.player;
  const jobs = c.jobs.filter((h) => hasJob(h.id) && atPost(s, job(h.id)));
  return jobs.length === c.jobs.length ? c : { ...c, jobs };
}

type JobCheck = { ok: true; state: GameState } | { ok: false; reason: string };

/**
 * What a job asks of whoever takes it, as its posting says it before you take it: a post's seat,
 * a hire's realm and stage; null when it asks nothing.
 */
export function jobAsks(j: Job): string | null {
  if (!isHire(j) && j.seat && j.power) {
    return `from the ${organization(houseOf(j.power)).seats[j.seat].name}'s seat`;
  }
  if (j.from)
    return `from ${realmInfo(j.from.realm).name}, ${stageName(j.from.realm, j.from.stage)}`;
  return null;
}

/**
 * Whether you may take a job: a hire's realm, a post's seat, no shift on top of another's, not
 * held already.
 */
export function canTakeJob(s: GameState, id: string): { ok: true } | { ok: false; reason: string } {
  if (!hasJob(id)) return { ok: false, reason: 'There is no such work.' };
  const j = job(id);
  const c = s.player;
  if (heldJob(c, id)) return { ok: false, reason: 'You hold it already.' };
  if (j.from && rank(realmStageOf(s)) < rank(j.from)) {
    return { ok: false, reason: `It is given ${jobAsks(j)}.` };
  }
  if (!isHire(j)) {
    const m = membership(s.world, c.id, houseOf(j.power!));
    if (!m || m.guest) return { ok: false, reason: `Only ${theName(j.power!)}'s own hold it.` };
    const seat = seatOf(s.world, c.id, m.power, realmStageOf(s))!;
    if (j.seat && seatRank(seat) < seatRank(j.seat)) {
      const t = organization(m.power).seats[j.seat];
      return { ok: false, reason: `It is held from the ${t.name}'s seat.` };
    }
  }
  const clash = c.jobs.find(
    (h) => hasJob(h.id) && job(h.id).shift.some((x) => j.shift.includes(x)),
  );
  if (clash) return { ok: false, reason: `Its hours fall on your shift: ${job(clash.id).name}.` };
  return { ok: true };
}

/** Takes a job: its shift goes on your wheel as Duty from today. */
export function takeJob(s: GameState, id: string): JobCheck {
  const can = canTakeJob(s, id);
  if (!can.ok) return can;
  const day = s.calendar.day;
  const held: Held = {
    id,
    since: day,
    month: monthIndex(day),
    kept: 0,
    missed: 0,
    owed: { stones: 0, points: 0 },
  };
  const st = withPlayer(s, { ...s.player, jobs: [...s.player.jobs, held] });
  return { ok: true, state: addEvent(st, 'job', { job: id, what: 'taken' }) };
}

/** What leaving a job costs, in words, by its giver's rule. */
function leavingWords(j: Job): string {
  if (j.leave === 'free' || !j.power) return 'You may leave it freely.';
  return `Leaving it is leaving ${theName(houseOf(j.power))}.`;
}

/**
 * Leaves a job by its giver's way out: one held freely just goes; a soldier's post goes only with
 * the power, as leaving it by its rule (a dynasty's deserter before ten years' service, a betrayal).
 */
export function quitJob(s: GameState, id: string): JobCheck {
  const held = heldJob(s.player, id);
  if (!held) return { ok: false, reason: 'You hold no such work.' };
  const j = job(id);
  let st: GameState = withPlayer(s, {
    ...s.player,
    jobs: s.player.jobs.filter((h) => h.id !== id),
  });
  if (j.leave === 'power' && j.power) st = partWays(st, j.power);
  return { ok: true, state: addEvent(st, 'job', { job: id, what: 'left' }) };
}

/**
 * The player leaves a power by its rule, as asking to be released or quitting a soldier's post
 * does: its copies handed back to its pavilion (the novels' sect takes its book back), the
 * membership and its balance gone, its posts dropped, and the chronicle's line.
 */
export function partWays(s: GameState, power: string, o: { to?: string } = {}): GameState {
  const house = houseOf(power);
  const knows = guardedKnown(s.player, house);
  const copies = { ...s.player.copies };
  for (const thing of Object.keys(copies)) if (guardedBy(thing) === house) delete copies[thing];
  let st = withPlayer(s, { ...s.player, copies });
  const left = leavePower(st.world, s.player.id, house, s.calendar.day, {
    you: true,
    knows,
    ...(o.to ? { to: o.to } : {}),
  });
  if (!left.parting) return s;
  st = dropLost({ ...st, world: left.world });
  return addEvent(st, 'power', {
    power: house,
    what: left.parting.kind === 'clean' ? 'left' : 'betrayed',
  });
}

/** A post goes with its power: one whose membership is gone (struck off, left) is dropped. */
function dropLost(s: GameState): GameState {
  const c = s.player;
  const jobs = c.jobs.filter((h) => {
    if (!hasJob(h.id)) return false;
    const j = job(h.id);
    return isHire(j) || !!membership(s.world, c.id, houseOf(j.power!));
  });
  return jobs.length === c.jobs.length ? s : withPlayer(s, { ...c, jobs });
}

/** Rows of a kind about you, still unfaded: what a stacking row is capped by. */
function liveRows(
  w: World,
  power: string,
  who: string,
  row: keyof typeof STANDING_ROWS,
  day: number,
) {
  const fade = STANDING_ROWS[row].fade ?? Infinity;
  return w.standing.filter(
    (x) => x.power === power && x.about === who && x.row === row && day - x.day < fade,
  ).length;
}

/** Duty-hours of a shift falling between two world days, as a share of its duty day. */
/** A shift's hours you put Duty on yourself, at drill. */
function dutyHours(c: Cultivator, j: Job): number[] {
  return j.shift.filter((h) => c.wheel[h] === 'duty');
}

function shiftShare(j: Job, from: number, to: number, worked: readonly number[] = j.shift): number {
  if (!j.shift.length || !worked.length || to <= from) return 0;
  let hours = 0;
  const h0 = from * HOURS_PER_DAY;
  const h1 = to * HOURS_PER_DAY;
  for (let h = Math.floor(h0); h < h1; h++) {
    const hour = ((h % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY;
    if (!worked.includes(hour)) continue;
    hours += Math.min(h + 1, h1) - Math.max(h, h0);
  }
  return hours / j.shift.length;
}

/** Whether a house's leave covers you this year: days away still within the seat's allowance. */
function onLeave(s: GameState, power: string): boolean {
  const m = membership(s.world, s.player.id, houseOf(power));
  if (!m || m.guest) return false;
  const allowed = leaveOf(m.power, seatOf(s.world, s.player.id, m.power, realmStageOf(s))!);
  if (allowed === Infinity) return false;
  const taken = m.leave?.year === yearOf(s.calendar.day) ? m.leave.days : 0;
  return taken < allowed;
}

/**
 * The month turns for a job: its tally becomes last month's, and a month with half its shifts
 * kept is remembered by its power ("Keeps our watch", +2, up to +10).
 */
function turnMonth(s: GameState, held: Held, month: number): { state: GameState; held: Held } {
  if (held.month >= month) return { state: s, held };
  const j = job(held.id);
  let st = s;
  const day = s.calendar.day;
  const who = s.player.id;
  if (j.power && held.kept >= KEPT_MONTH.share * DAYS_PER_MONTH) {
    const power = houseOf(j.power);
    if (liveRows(st.world, power, who, KEPT_MONTH.row, day) < KEPT_MONTH.most)
      st = { ...st, world: addStanding(st.world, { power, about: who, row: KEPT_MONTH.row }, day) };
  }
  // The shifts missed are one line a month, with their count (the checkpoint's fix).
  const missed = Math.floor(held.missed + 1e-9);
  if (j.power && !isHire(j) && missed > 0)
    st = addEvent(st, 'job', { job: held.id, what: 'missed', count: missed });
  const last = { month: held.month, kept: held.kept, missed: held.missed };
  return { state: st, held: { ...held, month, kept: 0, missed: 0, last } };
}

/**
 * Jobs' days between two world days: each shift's hours kept where you stand at its place pay
 * their share of a duty day; missed ones, past a house's leave, cost standing ("Missed our shifts",
 * −1 a duty day, to −10). A hire lets you go after seven days missed in a month. Stones are paid in
 * the place's vein's grade as whole stones come due; points go to the power's balance. A stretch
 * that began on the road (`walked`) kept no shift, though it ends at the post.
 */
export function jobsDay(s: GameState, from: number, to: number, walked = false): GameState {
  let st = dropLost(s);
  if (!st.player.jobs.length) return st;
  const who = st.player.id;
  const month = monthIndex(to);
  const realm = realmOf(st.player);
  const kept: Held[] = [];
  for (const h0 of st.player.jobs) {
    if (!hasJob(h0.id)) continue;
    const j = job(h0.id);
    const turned = turnMonth(st, h0, month);
    st = turned.state;
    let held = turned.held;
    // A dangerous post's raid, met once for each month its shifts were kept.
    if (j.danger && held.month !== h0.month && h0.kept >= KEPT_MONTH.share * DAYS_PER_MONTH)
      st = raid(st, j, h0.month);
    // Through the tutorial layers you are at drill: a shift is worked, or missed, only on the
    // hours you put Duty on yourself.
    const share = shiftShare(j, from, to, drilling(st.player) ? dutyHours(st.player, j) : j.shift);
    if (share > 0) {
      if (!walked && atPost(st, j)) {
        const pay = jobPay(j, realm);
        // Pay comes due a whole stone and a whole point at a time; the rest waits on the next shift.
        const owed = {
          stones: held.owed.stones + pay.stones * share,
          points: held.owed.points + pay.points * share,
        };
        const stones = Math.floor(owed.stones + 1e-9);
        const points = Math.floor(owed.points + 1e-9);
        if (stones > 0) {
          const purse = receive(stonesOf(st.player), stones, tierGrade(veinAt(j.place ?? '')));
          st = withPlayer(st, withStones(st.player, purse));
        }
        if (points > 0 && j.power)
          st = { ...st, world: addBalance(st.world, who, houseOf(j.power), points) };
        held = {
          ...held,
          kept: held.kept + share,
          // Held at 0, as a sum just under a whole leaves float dust below it, which the save refuses.
          owed: {
            stones: Math.max(0, owed.stones - stones),
            points: Math.max(0, owed.points - points),
          },
        };
      } else if (!(j.power && !isHire(j) && onLeave(st, j.power))) {
        const before = held.missed;
        held = { ...held, missed: before + share };
        const days = Math.floor(held.missed + 1e-9) - Math.floor(before + 1e-9);
        if (j.power && days > 0) {
          const power = houseOf(j.power);
          for (let i = 0; i < days; i++) {
            if (
              liveRows(st.world, power, who, MISSED_SHIFT.row, st.calendar.day) >= MISSED_SHIFT.most
            )
              break;
            const row = { power, about: who, row: MISSED_SHIFT.row } as const;
            st = { ...st, world: addStanding(st.world, row, st.calendar.day) };
          }
        }
        if (isHire(j) && held.missed >= HIRE_LETS_GO) {
          st = addEvent(st, 'job', { job: j.id, what: 'let-go' });
          continue;
        }
      }
    }
    kept.push(held);
  }
  return withPlayer(st, { ...st.player, jobs: kept });
}

/**
 * A dangerous post's raid (the organizations checkpoint): its template met at the post, at the
 * strongest band of the post's seat, settled by your stance as a road card is or waiting for you.
 */
function raid(s: GameState, j: Job, month: number): GameState {
  const life = s.map;
  const map = mapOf(s);
  if (!life || !map || !j.danger || !j.power) return s;
  // The raid comes to the post: away from it at the month's turn, those on watch meet it.
  if (!atPost(s, j)) return s;
  const id = `raid-${j.id}-${month}`;
  if (life.encounters.some((e) => e.id === id)) return s;
  const seat = seatRanges(houseOf(j.power))[j.seat ?? 'outer'].to;
  const place = j.place ? mapPlaceOf(map, j.place) : null;
  const enc: Encounter = {
    id,
    template: j.danger.raid,
    seed: hashSeed(id),
    band: bandOf(seat),
    at: [life.at[0], life.at[1]],
    meetAt: null,
    state: 'sensed',
    how: 'seen',
    tried: [],
    day: s.calendar.day,
    where: place?.name ?? map.name,
  };
  return contact({ ...s, map: { ...life, encounters: [...life.encounters, enc] } }, id);
}

/** Your jobs as the Routine and Character screens show them. */
export function jobsView(s: GameState) {
  const realm = realmOf(s.player);
  return s.player.jobs
    .filter((h) => hasJob(h.id))
    .map((h) => {
      const j = job(h.id);
      const pay = jobPay(j, realm);
      const currency =
        j.power && !isHire(j) ? organization(houseOf(j.power)).preset.currency.name : null;
      const parts = [
        pay.points > 0 && currency ? `${round(pay.points)} ${currency}` : null,
        pay.stones > 0 ? `${round(pay.stones)} low` : null,
      ].filter(Boolean);
      return {
        id: j.id,
        name: j.name,
        hanzi: j.hanzi,
        giver: j.power && isOrganization(j.power) ? theName(houseOf(j.power)) : j.hall,
        hall: j.hall,
        shift: j.shift,
        pay: `${parts.join(' and ')} a duty day`,
        perk: j.perk,
        kept: Math.floor(h.kept + 1e-9),
        missed: Math.floor(h.missed + 1e-9),
        here: atPost(s, j),
        drilling: drilling(s.player),
        leaving: leavingWords(j),
        hire: isHire(j),
      };
    });
}

const round = (n: number) => Math.round(n * 100) / 100;
