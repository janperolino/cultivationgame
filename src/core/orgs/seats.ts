// The seat ladder: realms per seat, ranks, titles, and moving a member between seats.
import { DAYS_PER_YEAR } from '../../content/calendar.ts';
import {
  BEAST_TITLES,
  EARLY_TRUE,
  ORG_OVERRIDES,
  type Ladder,
  type SeatId,
  type Title,
} from '../../content/organizations.ts';
import { hasPerson, person } from '../../content/people.ts';
import { realm, realmIndex, REALM_IDS, REALMS, type RealmId } from '../../content/realms.ts';
import { isMember } from '../resolver/names.ts';
import { type RealmStage, type World } from '../resolver/world.ts';
import { addEvent, type Cultivator, type GameState } from '../state.ts';
import { ageOf, cultivator, realmStageOf } from '../who.ts';
import { CRAFTS } from '../../content/crafts.ts';
import { CRAFT_GRADES } from '../../content/styles.ts';
import { capitalize } from '../../content/words.ts';
import { isOrganization, organization, theName, houseOf } from './identity.ts';
import { membership, membershipsOf } from './membership.ts';

/** The population's head count keys, by realm index. */
const POP_KEYS = ['qi', 'foundation', 'core', 'nascent', 'deity', 'void'] as const;

const id = (i: number): RealmId => REALMS[Math.max(0, i)]!.id;

/**
 * The realms a power's seats sit at, read top down from its population (design § Seats and the
 * currency): the head at its top realm; the grand elders there too, or the strongest of the realm
 * below when the head stands alone; elders the realm below the top, or the top with ten or more
 * there; true and inner the realm below the elders; outer everything under, and when nothing is
 * counted under, the inner realm split at layer 7. A power without a population reads its written
 * top as one at the top (O1's talk), and one with neither its vein. A power overrides any of it.
 */
const ladders = new Map<string, Ladder>();

export function ladderOf(power: string): Ladder {
  const hit = ladders.get(power);
  if (hit) return hit;
  const l = readLadder(power);
  ladders.set(power, l);
  return l;
}

/** The ladder as the population reads it: content only, so it is read once a power. */
function readLadder(power: string): Ladder {
  const org = organization(houseOf(power));
  const counts: number[] = REALMS.map(() => 0);
  const pop = org.row.population;
  if (pop) POP_KEYS.forEach((k, i) => (counts[i] = pop[k] ?? 0));
  const written = (REALM_IDS as readonly string[]).includes(org.row.top)
    ? realmIndex(org.row.top as RealmId)
    : -1;
  let top = -1;
  counts.forEach((n, i) => n > 0 && (top = i));
  const counted = top >= 0;
  if (written > top) top = written;
  if (top < 0) top = Math.max(0, (org.row.vein ?? 1) - 1);
  if (counts[top] === 0) counts[top] = 1;
  // The realm below: the next one with anyone counted in it, else the next one down.
  const below = (i: number): number => {
    for (let j = i - 1; j >= 0; j--) if (counts[j]! > 0) return j;
    return Math.max(0, i - 1);
  };
  const grand = counts[top] === 1 ? below(top) : top;
  const elder = counts[top]! >= 10 ? top : below(top);
  const inner = below(elder);
  const under = counts.slice(0, inner).some((n) => n > 0);
  return {
    head: id(top),
    grand: id(grand),
    elder: id(elder),
    inner: id(inner),
    split: inner === 0 || (counted && !under),
    ...ORG_OVERRIDES[org.id]?.ladder,
  };
}

/** A seat's realms: from (null for anyone below) to, both inclusive. */
export interface SeatRange {
  from: RealmStage | null;
  to: RealmStage;
}

/** Where a realm splits when nothing is under it: layer 7 of Qi Condensation's nine. */
function splitAt(r: RealmId): number {
  return Math.round((realm(r).stages * 7) / 9);
}

const whole = (r: RealmId): SeatRange => ({
  from: { realm: r, stage: 1 },
  to: { realm: r, stage: realm(r).stages },
});

export function seatRanges(power: string): Record<SeatId, SeatRange> {
  const l = ladderOf(power);
  const inner: SeatRange = l.split
    ? { from: { realm: l.inner, stage: splitAt(l.inner) }, to: whole(l.inner).to }
    : whole(l.inner);
  const below = realmIndex(l.inner) - 1;
  const outerTo: RealmStage = l.split
    ? { realm: l.inner, stage: splitAt(l.inner) - 1 }
    : { realm: id(below), stage: realm(id(below)).stages };
  return {
    outer: { from: null, to: outerTo },
    inner,
    true: inner,
    elder: whole(l.elder),
    grand: whole(l.grand),
    head: whole(l.head),
  };
}

/** A realm and stage as one number, for comparing. */
export function rank(r: RealmStage): number {
  return realmIndex(r.realm) * 100 + r.stage;
}

const SEAT_ORDER: readonly SeatId[] = ['outer', 'inner', 'true', 'elder', 'grand', 'head'];

export function seatRank(s: SeatId): number {
  return SEAT_ORDER.indexOf(s);
}

/** Whether a realm reaches a seat's: eligible for it. */
export function reaches(power: string, seat: SeatId, r: RealmStage): boolean {
  const from = seatRanges(power)[seat].from;
  return from === null || rank(r) >= rank(from);
}

/** The craft grade a seat asks, 0 for none: a crafting guild's seat, its realm's tier (K6). */
export function seatGrade(power: string, seat: SeatId): number {
  const house = houseOf(power);
  const org = organization(house);
  if (org.type !== 'guild' || !org.row.crafts?.length) return 0;
  const from = seatRanges(house)[seat].from;
  return realmIndex(from?.realm ?? REALMS[0]!.id) + 1;
}

/**
 * What a seat asks beyond its realm (K6, the code review's one gate): a guild that practices
 * crafts seats you only with the craft grade of the seat's realm's tier, certified in any of its
 * crafts (a guild whose elders are Foundation wants 二品 for elder). Why not, or null when it lets
 * you in. Joining, the inner seat taken outright and the true seat offered early all read it.
 */
export function seatGate(c: Cultivator | null, power: string, seat: SeatId): string | null {
  const house = houseOf(power);
  const org = organization(house);
  const crafts = org.row.crafts ?? [];
  const need = seatGrade(house, seat);
  if (need === 0) return null;
  const best = Math.max(0, ...crafts.map((k) => c?.crafts.grades[k]?.grade ?? 0));
  if (best >= need) return null;
  const which = crafts.length > 1 ? 'any of its crafts' : CRAFTS[crafts[0]!].name;
  return `${capitalize(theName(house))} seats a ${org.seats[seat].name} only with a certified ${CRAFT_GRADES[need - 1]!.hanzi} badge, in ${which}.`;
}

/** The seat a cultivator takes on joining: outer, or inner outright when their realm reaches it. */
export function entrySeat(power: string, r: RealmStage): SeatId {
  return reaches(power, 'inner', r) ? 'inner' : 'outer';
}

/**
 * The seat someone the world placed holds by their realm (design: NPCs take their seat by their
 * realm): elder from the elders' realm, a grand elder above it, inner from the inner realm, else
 * outer. The head is written, and a true disciple is made by a master tie.
 */
export function seatByRealm(power: string, r: RealmStage): SeatId {
  const ranges = seatRanges(power);
  if (realmIndex(r.realm) > realmIndex(ranges.elder.to.realm)) return 'grand';
  if (reaches(power, 'elder', r)) return 'elder';
  return entrySeat(power, r);
}

/**
 * A member's seat: the one they hold by deed, or inner outright once their realm reaches it. A
 * named person with no membership keeps the seat written for them; anyone else holds none.
 */
export function seatOf(w: World, who: string, power: string, r?: RealmStage): SeatId | null {
  const house = houseOf(power);
  const m = membership(w, who, house);
  if (!m) {
    if (!hasPerson(who)) return null;
    const p = person(who);
    return p.power === house && p.seat ? p.seat : null;
  }
  // Realm alone never carries a seat past a higher grade's gate (the code review's low 30): that
  // step waits for a promotion that reads `seatGate`.
  if (
    r &&
    seatRank(m.seat) < seatRank('inner') &&
    reaches(house, 'inner', r) &&
    seatGrade(house, 'inner') <= seatGrade(house, m.seat)
  )
    return 'inner';
  return m.seat;
}

/**
 * A seat's title, held to its holder's realm (design: a title that claims greatness needs the
 * realm for it): a beast power's titles are its holders' realms, a great shaman from Nascent Soul,
 * an emperor from Deity Transformation. With no holder's realm, the seat's own top realm.
 */
export function seatTitle(power: string, seat: SeatId, holder?: RealmId): Title {
  const org = organization(houseOf(power));
  const r = holder ?? seatRanges(power)[seat].to.realm;
  if (org.preset.byRealm) {
    const i = realmIndex(r);
    for (let j = i; j >= 0; j--) {
      const t = BEAST_TITLES[id(j)];
      if (t) return t;
    }
    return BEAST_TITLES['qi-condensation'];
  }
  const s = org.seats[seat];
  if (s.great && realmIndex(r) >= realmIndex(s.great.from))
    return { name: s.great.name, hanzi: s.great.hanzi };
  return { name: s.name, hanzi: s.hanzi };
}

/** A member's seat moved by a deed: a trial won, an elder's master tie, an appointment. */
export function setSeat(w: World, who: string, power: string, seat: SeatId): World {
  const house = houseOf(power);
  return {
    ...w,
    members: w.members.map((m) => (m.who === who && m.power === house ? { ...m, seat } : m)),
  };
}

/**
 * Taken as an elder's disciple (design: an elder taking you as their disciple makes you a true
 * disciple): the elder holds the elder seat or above in the same power. The master tie itself is
 * the people layer's (`addTie`).
 */
export function takeAsDisciple(w: World, elder: string, who: string, power: string): World | null {
  const house = houseOf(power);
  const es = seatOf(w, elder, house);
  if (!es || seatRank(es) < seatRank('elder') || !isMember(w, who, house)) return null;
  return setSeat(w, who, house, 'true');
}

/**
 * Investment (design: a member who reaches a realm well before the seat's usual age is offered a
 * true disciple's treatment early): an inner member of a year's standing who has reached the true
 * seat's realm before 15% of that realm's lifespan is raised to the true seat (O3's talk). Where
 * the inner seat is held by realm within one (a split realm), it must have been won by the trial,
 * so the raise never skips it (the checkpoint's fix).
 */
export function raiseEarly(s: GameState, who: string): GameState {
  const r = realmStageOf(s, who);
  // A cast member whose birth year isn't known is never raised early (N1).
  const age = ageOf(s, who, s.calendar.day);
  if (age === null) return s;
  let state = s;
  for (const m of membershipsOf(s.world, who)) {
    if (!isOrganization(m.power) || m.guest || organization(m.power).preset.byRealm) continue;
    const seat = seatOf(s.world, who, m.power, r)!;
    if (seatRank(seat) >= seatRank('true') || seat !== 'inner') continue;
    if (s.calendar.day - m.since < DAYS_PER_YEAR) continue;
    if (ladderOf(m.power).split && !m.won) continue;
    const from = seatRanges(m.power).true.from;
    if (!from || rank(r) < rank(from)) continue;
    if (age >= realm(from.realm).lifespan * EARLY_TRUE.share) continue;
    if (seatGate(cultivator(s, who), m.power, 'true')) continue;
    state = { ...state, world: setSeat(state.world, who, m.power, 'true') };
    if (cultivator(s, who))
      state = addEvent(state, 'power', {
        power: m.power,
        what: 'true',
        title: seatTitle(m.power, 'true', r.realm).name,
      });
  }
  return state;
}

/**
 * The inner seat taken outright on reaching its realm (design: reaching the inner seat's realm
 * makes you an inner disciple outright): kept on the membership, and the chronicle says so.
 */
export function seatsByRealm(s: GameState, who: string): GameState {
  const r = realmStageOf(s, who);
  const c = cultivator(s, who);
  let state = s;
  for (const m of membershipsOf(s.world, who)) {
    if (!isOrganization(m.power) || m.guest || m.seat !== 'outer') continue;
    if (seatOf(s.world, who, m.power, r) !== 'inner') continue;
    if (seatGate(c, m.power, 'inner')) continue;
    state = { ...state, world: setSeat(state.world, who, m.power, 'inner') };
    if (c)
      state = addEvent(state, 'power', {
        power: m.power,
        what: 'raised',
        title: seatTitle(m.power, 'inner', r.realm).name,
      });
  }
  return state;
}

/** A named person's seat as you know it: "outer Gate disciple of the Beast-Butcher Gate", or null. */
export function personSeat(w: World, who: string, holder?: RealmId): string | null {
  if (!hasPerson(who)) return null;
  const power = person(who).power;
  if (!power || !isOrganization(power)) return null;
  const seat = seatOf(w, who, power);
  if (!seat) return null;
  const t = seatTitle(power, seat, holder);
  return `${t.name} ${t.hanzi} of ${theName(houseOf(power))}`;
}
