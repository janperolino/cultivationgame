// Organizations (design § Professions, people and powers, Organizations share one skeleton, Seats
// and the currency; § NPC basics, Membership; O1). Every atlas power is one, and so is every
// kingdom no power rules, read as a dynasty. A power's six seats sit at realms read top down from
// its population; rank is realm and a deed (the inner trial, an elder's master tie, an
// appointment), and the currency only buys. You serve one house at a time; leaving by the type's
// rule is a clean parting, and betrayal is a hunted rule, going over to a foe or carrying off its
// guarded methods. The same rules take any cultivator: actions name who acts.
import { DAYS_PER_MONTH, DAYS_PER_YEAR } from '../content/calendar.ts';
import { copyId } from '../content/copies.ts';
import {
  BEAST_TITLES,
  DONATION,
  HUMAN_BLOOD,
  INNER_TRIAL,
  ORG_OVERRIDES,
  ORG_PRESETS,
  ORG_ROWS,
  RETIRE_YEARS,
  RULED_KINGDOMS,
  TYPE_BLOOD,
  type Ladder,
  type OrgPreset,
  type OrgRow,
  type OrgType,
  type SeatId,
  type SeatName,
  type Title,
  type Treatment,
} from '../content/organizations.ts';
import { hasPerson, person } from '../content/people.ts';
import { realm, realmIndex, REALM_IDS, REALMS, type RealmId } from '../content/realms.ts';
import { HOME_REGION } from '../content/resolver.ts';
import { guardedBy } from './markets.ts';
import { priceOf } from './prices.ts';
import { pay, stonesOf, withStones } from './purse.ts';
import { realmSizeOf, sizeAt, actorFromCultivator } from './resolver/actor.ts';
import { verdict, type Verdict } from './resolver/check.ts';
import { isMember } from './resolver/names.ts';
import { addStanding } from './resolver/opinion.ts';
import type { Member, RealmStage, World } from './resolver/world.ts';
import { addItem, itemCount, realmOf, stageOf, withPlayer, type GameState } from './state.ts';

// ── The record ───────────────────────────────────────────────────────────────────────────────

/** An organization: its atlas row, its type's preset with the power's overrides laid over it. */
export interface Organization {
  id: string;
  name: string;
  hanzi: string;
  type: OrgType;
  preset: OrgPreset;
  seats: Record<SeatId, SeatName>;
  gives: readonly string[];
  treatment: Treatment;
  blood: string;
  /** The power a branch hall answers to, where its members belong. */
  branchOf?: string;
  row: OrgRow;
}

const rows = new Map(ORG_ROWS.map((r) => [r.id, r]));
const cache = new Map<string, Organization>();

/** Whether an atlas id is an organization: a power, or a kingdom no power or council rules. */
export function isOrganization(id: string): boolean {
  const r = rows.get(id);
  return !!r && (r.type !== undefined || RULED_KINGDOMS[id] === undefined);
}

export function organization(id: string): Organization {
  const hit = cache.get(id);
  if (hit) return hit;
  const row = rows.get(id);
  if (!row || !isOrganization(id)) throw new RangeError(`Not an organization: ${id}`);
  const type: OrgType = row.type ?? 'dynasty';
  const preset = ORG_PRESETS[type];
  const o = ORG_OVERRIDES[id] ?? {};
  const org: Organization = {
    id,
    name: row.name,
    hanzi: row.hanzi,
    type,
    preset,
    seats: { ...preset.seats, ...o.seats },
    gives: [...preset.gives, ...(o.gives ?? [])],
    treatment: o.treatment ?? 'fair',
    blood: o.blood ?? TYPE_BLOOD[type] ?? HUMAN_BLOOD,
    ...(o.branchOf ? { branchOf: o.branchOf } : {}),
    row,
  };
  cache.set(id, org);
  return org;
}

/** Its name with "the" before it, unless it carries one: "the Beast-Butcher Gate", "The Hu Clan". */
export function theName(id: string): string {
  const n = organization(id).name;
  return n.startsWith('The ') ? n : `the ${n}`;
}

/** Where a membership is held: a branch hall's is its parent power's. */
export function houseOf(id: string): string {
  return organization(id).branchOf ?? id;
}

// ── Seats ────────────────────────────────────────────────────────────────────────────────────

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
export function ladderOf(power: string): Ladder {
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
  if (r && seatRank(m.seat) < seatRank('inner') && reaches(house, 'inner', r)) return 'inner';
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

// ── Membership ───────────────────────────────────────────────────────────────────────────────

export function membership(w: World, who: string, power: string): Member | undefined {
  return w.members.find((m) => m.who === who && m.power === power);
}

export function membershipsOf(w: World, who: string): Member[] {
  return w.members.filter((m) => m.who === who);
}

/** Why a join is refused: already one of theirs, another house or clan held, or the wrong way in. */
export type Refusal = { ok: false; why: string; holds?: string };

export interface JoinOpts {
  /** The one joining is the player, who learns its token and region map. */
  you?: boolean;
  region?: string;
  /** Their realm, which sets the seat they join at. */
  realm?: RealmStage;
  /** Their blood, an atlas race: human unless said. */
  blood?: string;
  /** How a clan takes them. */
  by?: 'birth' | 'adoption' | 'marriage';
}

/**
 * Whether someone may join: one house at a time (a sect, academy, temple, dynasty or assassins'
 * house), one clan or blood power at a time, and a clan only by birth, adoption or marriage.
 */
export function canJoin(
  w: World,
  who: string,
  power: string,
  o: JoinOpts = {},
): { ok: true } | Refusal {
  if (!isOrganization(power)) return { ok: false, why: 'That is no organization.' };
  const house = houseOf(power);
  if (isMember(w, who, house)) return { ok: false, why: 'Already one of theirs.' };
  const org = organization(house);
  if (org.type === 'clan' && !o.by)
    return { ok: false, why: 'A clan takes you by birth, adoption or marriage.' };
  if (org.preset.bond !== 'stack') {
    const held = membershipsOf(w, who).find(
      (m) => isOrganization(m.power) && organization(m.power).preset.bond === org.preset.bond,
    );
    if (held) {
      const word = org.preset.bond === 'house' ? 'serve' : 'are of';
      return {
        ok: false,
        why: `You ${word} ${theName(held.power)}; leave it first.`,
        holds: held.power,
      };
    }
  }
  return { ok: true };
}

/**
 * Joining a power (a branch hall joins its parent): a seat by the realm, a balance of nothing,
 * standing as one of its own (+10 while they belong) and "not of our blood" (−15, never fading)
 * for a member of other blood; the player learns its token ("token:<power>", a branch's too) and
 * its region map ("map:<region>").
 */
export function joinPower(
  w: World,
  who: string,
  power: string,
  day: number,
  o: JoinOpts = {},
): { ok: true; world: World } | (Refusal & { world: World }) {
  const can = canJoin(w, who, power, o);
  if (!can.ok) return { ...can, world: w };
  const house = houseOf(power);
  const org = organization(house);
  const seat = o.realm ? entrySeat(house, o.realm) : 'outer';
  let world: World = {
    ...w,
    members: [...w.members, { who, power: house, since: day, seat, balance: 0 }],
  };
  world = addStanding(world, { power: house, about: who, row: 'member' }, day);
  if ((o.blood ?? HUMAN_BLOOD) !== org.blood)
    world = addStanding(world, { power: house, about: who, row: 'not-our-blood' }, day);
  if (o.you) {
    const region = o.region ?? org.row.region ?? HOME_REGION;
    const learned = [...new Set([`token:${house}`, `token:${power}`]), `map:${region}`];
    world = {
      ...world,
      known: [...world.known, ...learned.filter((k) => !world.known.includes(k))],
    };
  }
  return { ok: true, world };
}

/** How a parting reads: clean by the type's rule, or a betrayal, and why. */
export interface Parting {
  kind: 'clean' | 'betrayal';
  why: string;
}

export interface LeaveOpts {
  you?: boolean;
  /** The power they go over to, if any. */
  to?: string;
  /** They carry off its guarded methods (`carriesGuarded`). */
  carries?: boolean;
}

/**
 * How leaving reads (design: leaving is not betrayal by itself): betrayal where the type's rule
 * is hunted (a gang, a society, assassins, a beast power), deserting a dynasty before its years of
 * service, going over to a power it is hostile to, or carrying off its guarded methods.
 */
export function partingOf(
  w: World,
  who: string,
  power: string,
  day: number,
  o: LeaveOpts = {},
): Parting {
  const house = houseOf(power);
  const org = organization(house);
  if (org.preset.leave.hunted) return { kind: 'betrayal', why: org.preset.leave.words };
  const m = membership(w, who, house);
  if (org.type === 'dynasty' && m && day - m.since < RETIRE_YEARS * DAYS_PER_YEAR)
    return { kind: 'betrayal', why: 'deserting' };
  if (o.to && isOrganization(o.to)) {
    const to = houseOf(o.to);
    if (org.row.foes.includes(to) || organization(to).row.foes.includes(house))
      return { kind: 'betrayal', why: `going over to ${theName(to)}` };
  }
  if (o.carries) return { kind: 'betrayal', why: 'carrying off its guarded methods' };
  return { kind: 'clean', why: org.preset.leave.words };
}

/**
 * Leaving a power: the membership goes with its balance and seat, its standing rows with it, and
 * the parting is kept: a memory ("Left us by our rule") or a grudge ("Betrayed us", −30, never
 * fading). The player gives back its token.
 */
export function leavePower(
  w: World,
  who: string,
  power: string,
  day: number,
  o: LeaveOpts = {},
): { world: World; parting: Parting | null } {
  const house = houseOf(power);
  if (!isMember(w, who, house)) return { world: w, parting: null };
  const parting = partingOf(w, who, house, day, o);
  let world: World = {
    ...w,
    members: w.members.filter((m) => !(m.who === who && m.power === house)),
    standing: w.standing.filter(
      (s) =>
        !(
          s.power === house &&
          s.about === who &&
          (s.row === 'member' || s.row === 'not-our-blood')
        ),
    ),
    known: o.you
      ? w.known.filter((k) => k !== `token:${house}` && k !== `token:${power}`)
      : w.known,
  };
  world = addStanding(
    world,
    { power: house, about: who, row: parting.kind === 'clean' ? 'parted' : 'betrayed-us' },
    day,
  );
  return { world, parting };
}

/** Whether the player carries off a power's guarded methods: any method or art its hall alone sells. */
export function carriesGuarded(s: GameState, power: string): boolean {
  const house = houseOf(power);
  const ids = [
    ...Object.keys(s.player.methods).map((m) => copyId('method', m)),
    ...Object.keys(s.player.techniques).map((t) => copyId('technique', t)),
  ];
  return ids.some((c) => guardedBy(c) === house || guardedBy(c) === power);
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

// ── The inner trial ──────────────────────────────────────────────────────────────────────────

export function yearOf(day: number): number {
  return Math.floor(day / DAYS_PER_YEAR);
}

export function monthOfYear(day: number): number {
  return Math.floor((((day % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR) / DAYS_PER_MONTH) + 1;
}

/** The player's realm and stage: their highest ladder's. */
export function realmStageOf(s: GameState): RealmStage {
  return { realm: realmOf(s.player), stage: stageOf(s.player) };
}

export type TrialResult =
  | { ok: false; why: string }
  | {
      ok: true;
      verdict: Verdict;
      passed: boolean;
      yours: number;
      theirs: number;
      state: GameState;
    };

/**
 * The yearly inner trial (design § Seats and the currency; O1's talk): held in the first month,
 * one try a year, by an outer disciple. Their strongest ladder through their wounds faces the size
 * of the outer seat's top stage, and close or better wins the inner seat. A capability against a
 * number, never a roll.
 */
export function innerTrial(s: GameState, power: string): TrialResult {
  const house = houseOf(power);
  const who = s.player.id;
  const m = membership(s.world, who, house);
  if (!m) return { ok: false, why: 'Only their own sit the trial.' };
  const day = s.calendar.day;
  const r = realmStageOf(s);
  const seat = seatOf(s.world, who, house, r)!;
  if (seat !== 'outer') return { ok: false, why: 'The trial is for outer disciples.' };
  if (monthOfYear(day) !== INNER_TRIAL.month)
    return { ok: false, why: 'The trial is held in the first month.' };
  if (m.tried === yearOf(day)) return { ok: false, why: 'You sat it this year.' };
  const yours = realmSizeOf(actorFromCultivator(s));
  const theirs = sizeAt(seatRanges(house).outer.to);
  const v = verdict(yours, theirs);
  const passed = v === 'clear' || (v === 'close' && INNER_TRIAL.pass === 'close');
  let world: World = {
    ...s.world,
    members: s.world.members.map((x) => (x === m ? { ...x, tried: yearOf(day) } : x)),
  };
  if (passed) world = setSeat(world, who, house, 'inner');
  return { ok: true, verdict: v, passed, yours, theirs, state: { ...s, world } };
}

// ── The currency ─────────────────────────────────────────────────────────────────────────────

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
  return {
    ...w,
    members: w.members.map((m) =>
      m.who === who && m.power === house
        ? { ...m, balance: Math.max(0, Math.round((m.balance + n) * 10) / 10) }
        : m,
    ),
  };
}

/** The player donates stones (low's worth) and things to a power they belong to. */
export function donate(
  s: GameState,
  power: string,
  gift: { stones?: number; things?: Readonly<Record<string, number>> },
): { ok: true; points: number; state: GameState } | { ok: false; why: string } {
  const house = houseOf(power);
  if (!isMember(s.world, s.player.id, house)) return { ok: false, why: 'Only their own donate.' };
  let player = s.player;
  if (gift.stones) {
    const paid = pay(stonesOf(player), gift.stones);
    if (!paid) return { ok: false, why: 'You haven’t the stones.' };
    player = withStones(player, paid);
  }
  for (const [thing, n] of Object.entries(gift.things ?? {})) {
    if (itemCount(player, thing) < n) return { ok: false, why: 'You don’t have that many.' };
    player = addItem(player, thing, -n);
  }
  const points = donationPoints(gift);
  const state = withPlayer(s, player);
  return {
    ok: true,
    points,
    state: { ...state, world: addBalance(state.world, s.player.id, house, points) },
  };
}

// ── Views ────────────────────────────────────────────────────────────────────────────────────

/** A seat's realms in words: "Qi Condensation 7–9", "Foundation Establishment", "Core Formation and below". */
export function rangeWords(r: SeatRange): string {
  const name = (x: RealmId) => realm(x).name;
  const layers = (a: number, b: number) =>
    a === 1 && b === realm(r.to.realm).stages ? '' : ` ${a}–${b}`;
  if (r.from === null) {
    const all = r.to.stage === realm(r.to.realm).stages;
    return all ? `${name(r.to.realm)} and below` : `${name(r.to.realm)} 1–${r.to.stage} and below`;
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

/** Your memberships as the Character and People screens show them. */
export function membershipsView(s: GameState) {
  const r = realmStageOf(s);
  return membershipsOf(s.world, s.player.id)
    .filter((m) => isOrganization(m.power))
    .map((m) => {
      const org = organization(m.power);
      const seat = seatOf(s.world, s.player.id, m.power, r)!;
      return {
        power: m.power,
        name: org.name,
        title: seatTitle(m.power, seat, r.realm),
        balance: m.balance,
        currency: org.preset.currency.name,
        trial: trialWords(m, seat, s.calendar.day),
      };
    });
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
