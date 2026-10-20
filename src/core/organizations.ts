// Organizations (design § Professions, people and powers, Organizations share one skeleton, Seats
// and the currency; § NPC basics, Membership; O1). Every atlas power is one, and so is every
// kingdom no power rules, read as a dynasty. A power's six seats sit at realms read top down from
// its population; rank is realm and a deed (the inner trial, an elder's master tie, an
// appointment), and the currency only buys. You serve one house at a time; leaving by the type's
// rule is a clean parting, and betrayal is a hunted rule, going over to a foe or carrying off its
// guarded methods. The same rules take any cultivator: actions name who acts.
import { DAYS_PER_MONTH, DAYS_PER_YEAR } from '../content/calendar.ts';
import { copyChapter, copyId } from '../content/copies.ts';
import {
  ALLOWANCE,
  ALLOWANCE_PILL,
  BEAST_TITLES,
  DONATION,
  DWELLING,
  EARLY_TRUE,
  ELDER_ALLOWANCE,
  ELDER_TIME,
  GUEST_ELDER,
  HUMAN_BLOOD,
  INNER_TRIAL,
  LEAVE,
  LEAVE_OVER,
  ORG_OVERRIDES,
  ORG_PRESETS,
  ORG_ROWS,
  QUOTA,
  QUOTA_MISSED,
  RETIRE_YEARS,
  RULED_KINGDOMS,
  TALISMAN,
  TREATMENT_RULES,
  TYPE_BLOOD,
  VEIN_DENSITY,
  YEARS_PILLS,
  type Ladder,
  type OrgPreset,
  type OrgRow,
  type OrgType,
  type SeatId,
  type SeatName,
  type Title,
  type Treatment,
} from '../content/organizations.ts';
import { hasJob, job, KEPT_MONTH } from '../content/jobs.ts';
import { hasPerson, person } from '../content/people.ts';
import { veinAt } from '../content/map/index.ts';
import {
  realm,
  realmIndex,
  realmScale,
  REALM_IDS,
  REALMS,
  type RealmId,
} from '../content/realms.ts';
import { INSIGHT_PER_STUDY_DAY } from '../content/cultivation.ts';
import { HOME_REGION } from '../content/resolver.ts';
import { insightMultiplier, gainInsight } from './insight.ts';
import { guardedBy } from './markets.ts';
import { priceOf } from './prices.ts';
import { pay, priceWords, realmGrade, receive, stonesOf, withStones } from './purse.ts';
import {
  realmOfActor,
  realmSizeOf,
  sizeAt,
  actorFromCultivator,
  type Actor,
} from './resolver/actor.ts';
import { higher } from './resolver/backers.ts';
import { breakOath, liftMark, startMark, swearOath } from './resolver/marks.ts';
import { verdict, type Verdict } from './resolver/check.ts';
import { currentPlaces, powerPrivate } from './resolver/knows.ts';
import { isMember } from './resolver/names.ts';
import { addStanding, powerOf } from './resolver/opinion.ts';
import { standingOf, type Member, type RealmStage, type World } from './resolver/world.ts';
import {
  addEvent,
  addItem,
  ageYears,
  itemCount,
  realmOf,
  stageOf,
  withPlayer,
  type Cultivator,
  type GameState,
} from './state.ts';

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
  if (!isOrganization(id)) return id;
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
    // A guest elder's seat is an outsider's, and binds no house (O2).
    const held = membershipsOf(w, who).find(
      (m) =>
        !m.guest &&
        isOrganization(m.power) &&
        organization(m.power).preset.bond === org.preset.bond,
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
    members: [
      ...w.members,
      {
        who,
        power: house,
        since: day,
        seat,
        balance: 0,
        paid: monthIndex(day),
        quota: monthIndex(day),
      },
    ],
  };
  world = addStanding(world, { power: house, about: who, row: 'member' }, day);
  // A member may hold its methods: joining lifts the mark of a leak (O5).
  world = liftMark(world, who, house, day);
  if ((o.blood ?? HUMAN_BLOOD) !== org.blood)
    world = addStanding(world, { power: house, about: who, row: 'not-our-blood' }, day);
  if (o.you) {
    // Its token, its region map and its private tier: its places and its people (O3).
    const region = o.region ?? org.row.region ?? HOME_REGION;
    const learned = [
      ...new Set([`token:${house}`, `token:${power}`]),
      `map:${region}`,
      ...powerPrivate(currentPlaces(), house),
    ];
    const fresh = learned.filter((k) => !world.known.includes(k));
    world = {
      ...world,
      known: [...world.known, ...fresh],
      heard: world.heard.filter((h) => !fresh.includes(h.fact)),
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
  /** The copies of its guarded methods and arts they know (`guardedKnown`), for the parting (O5). */
  knows?: readonly string[];
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
  // What they learned (O5, design § Guarded methods): a clean parting keeps it under the
  // heart-demon oath never to teach or sell it; a betrayal guards all of it against them, marked
  // for the highest chapter they know.
  const known = (o.knows ?? []).filter((c) => guardedBy(c) === house);
  if (parting.kind === 'clean') world = swearOath(world, who, house, day);
  else world = breakOath(world, who, house, day);
  if (parting.kind === 'betrayal' && known.length > 0) {
    const top = [...known].sort((a, b) => copyChapter(b) - copyChapter(a))[0]!;
    world = startMark(world, who, house, top, headRealm(house), day);
  }
  return { world, parting };
}

/** The copies of a power's guarded methods and arts someone knows: those its hall alone sells. */
export function guardedKnown(c: Cultivator, power: string): string[] {
  const house = houseOf(power);
  const ids = [
    ...Object.keys(c.methods).map((m) => copyId('method', m)),
    ...Object.keys(c.techniques).map((t) => copyId('technique', t)),
  ];
  return ids.filter((id) => guardedBy(id) === house || guardedBy(id) === power);
}

/** Whether the player carries off a power's guarded methods: any method or art its hall alone sells. */
export function carriesGuarded(s: GameState, power: string): boolean {
  return guardedKnown(s.player, power).length > 0;
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
      /** Your place in the year's ranking, 1 the first, and whether it took one of the year's pills. */
      rank: number;
      pill: boolean;
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
  // Investment: the year's Foundation Pills go down the ranking to those who passed; an equal
  // ranks ahead of you, as the senior.
  const rank = 1 + trialField(s.world, house, who).filter((size) => size >= yours).length;
  const pill = passed && rank <= yearsPills(house);
  let state: GameState = { ...s, world };
  if (pill) {
    state = withPlayer(state, addItem(state.player, YEARS_PILLS.pill, 1));
    state = addEvent(state, 'power', { power: house, what: 'pill' });
  }
  return { ok: true, verdict: v, passed, yours, theirs, rank, pill, state };
}

/**
 * How many Foundation Pills a power hands down its trial's ranking a year (O3's talk): one for
 * every thousand Qi Condensation cultivators it counts, at least one and at most ten.
 */
export function yearsPills(power: string): number {
  const qi = organization(houseOf(power)).row.population?.qi ?? 0;
  return Math.max(YEARS_PILLS.min, Math.min(YEARS_PILLS.max, Math.round(qi / YEARS_PILLS.per)));
}

/**
 * Who else the year's trial ranks: the people the world keeps of the power with a realm in its
 * outer seat, by their size. The world keeps no roster of the rest (O3's talk).
 */
export function trialField(w: World, power: string, you: string): number[] {
  const house = houseOf(power);
  const top = seatRanges(house).outer.to;
  return Object.entries(w.kept)
    .filter(([id, k]) => id !== you && k.realm && houseOf(k.power ?? '') === house)
    .filter(([, k]) => rank(k.realm!) <= rank(top))
    .map(([, k]) => sizeAt(k.realm!));
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

// ── What membership gives (O2) ───────────────────────────────────────────────────────────────

/** The month a day falls in, counted from day 0: what an allowance is paid by. */
export function monthIndex(day: number): number {
  return Math.floor(day / DAYS_PER_MONTH);
}

/** True disciple and up: the seats a harsh power pays ×1.5 and never tithes. */
function isTop(seat: SeatId): boolean {
  return seatRank(seat) >= seatRank('true');
}

/**
 * A seat's monthly allowance 月例 (design § What membership gives and asks): outer 3 low and a
 * Qi-Gathering Pill, inner 15 low and three, true 60 low, from elder up 60 low on the realm curve
 * from Foundation by the holder's realm; scaled by how the power treats its own. A guest elder
 * draws an elder's at their realm, as a fair power pays it.
 */
export function allowanceOf(
  power: string,
  seat: SeatId,
  holder: RealmId,
  guest = false,
): { stones: number; pills: number } {
  const base =
    seat === 'outer' || seat === 'inner' || seat === 'true'
      ? ALLOWANCE[seat]
      : {
          stones: (ELDER_ALLOWANCE.stones * realmScale(holder)) / realmScale(ELDER_ALLOWANCE.at),
          pills: 0,
        };
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
 * The player's allowances come as each month turns, from every power they belong to, for each
 * month since the last one paid: stones in their realm's grade and below, and the pills. A
 * membership with no month kept starts counting now.
 */
export function payAllowances(s: GameState): GameState {
  const month = monthIndex(s.calendar.day);
  const who = s.player.id;
  const mine = s.world.members.filter((m) => m.who === who && isOrganization(m.power));
  if (!mine.some((m) => m.paid === undefined || m.paid < month)) return s;
  const r = realmStageOf(s);
  let player = s.player;
  for (const m of mine) {
    const months = m.paid === undefined ? 0 : month - m.paid;
    if (months <= 0) continue;
    const seat = m.guest ? 'elder' : seatOf(s.world, who, m.power, r)!;
    const a = allowanceOf(m.power, seat, r.realm, m.guest);
    if (a.stones > 0)
      player = withStones(
        player,
        receive(stonesOf(player), a.stones * months, realmGrade(r.realm)),
      );
    if (a.pills > 0) player = addItem(player, ALLOWANCE_PILL, a.pills * months);
  }
  const members = s.world.members.map((m) =>
    m.who === who && isOrganization(m.power) ? { ...m, paid: month } : m,
  );
  return { ...withPlayer(s, player), world: { ...s.world, members } };
}

/** Where the player dwells by seat while secluding: the power, the seat and its qi density. */
export interface Dwelling {
  power: string;
  seat: SeatId;
  density: number;
}

/** A power's dwelling's density at a place: its seat's, capped by the place's vein (O2's talk). */
export function dwellingDensity(seat: SeatId, place: string): number {
  const vein = Math.max(0, Math.min(VEIN_DENSITY.length - 1, veinAt(place)));
  return Math.min(DWELLING[seat], VEIN_DENSITY[vein]!);
}

/**
 * The dwelling the player secludes in (design: a dwelling by seat, qi density's first use in
 * seclusion): inside the seat of a power they belong to, or a branch hall of it, the density their
 * seat holds there. Only while they seclude there: on the road, or anywhere else, none. A guest
 * elder keeps no dwelling.
 */
export function dwellingOf(s: GameState): Dwelling | null {
  const place = s.map?.inside;
  if (!place) return null;
  const r = realmStageOf(s);
  let best: Dwelling | null = null;
  for (const m of membershipsOf(s.world, s.player.id)) {
    if (m.guest || !isOrganization(m.power)) continue;
    const branch = isOrganization(place) && organization(place).branchOf === m.power;
    if (place !== m.power && !branch) continue;
    const seat = seatOf(s.world, s.player.id, m.power, r)!;
    const density = dwellingDensity(seat, place);
    if (!best || density > best.density) best = { power: m.power, seat, density };
  }
  return best;
}

/**
 * Whether a power offers the player its guest elder 客卿 seat (design: an honored outsider): they
 * aren't its member and stand honored with it. A beast power keeps no outsiders' seats.
 */
export function guestOffered(s: GameState, power: string): boolean {
  if (!isOrganization(power)) return false;
  const house = houseOf(power);
  if (organization(house).type === 'beast' || membership(s.world, s.player.id, house)) return false;
  return standingOf(s.world, house, s.player.id, s.calendar.day).word === GUEST_ELDER.from;
}

/**
 * Taking the guest elder seat: an allowance and access to the hall at members' terms, no quota,
 * backing both ways; never the pavilion's chapters or a dwelling, and no house is bound by it.
 */
export function becomeGuest(
  s: GameState,
  power: string,
): { ok: true; state: GameState } | { ok: false; why: string } {
  if (!guestOffered(s, power)) return { ok: false, why: 'They offer you no seat.' };
  const house = houseOf(power);
  const day = s.calendar.day;
  const guest: Member = {
    who: s.player.id,
    power: house,
    since: day,
    seat: 'elder',
    balance: 0,
    paid: monthIndex(day),
    guest: true,
  };
  const known = s.world.known.includes(`token:${house}`)
    ? s.world.known
    : [...s.world.known, `token:${house}`];
  return {
    ok: true,
    state: { ...s, world: { ...s.world, members: [...s.world.members, guest], known } },
  };
}

// ── Backing (O3) ─────────────────────────────────────────────────────────────────────────────

/**
 * The power someone answers to: a house they serve first, then their blood, then any other they
 * belong to, a guest elder's seat last (backing both ways); for anyone the world keeps without a
 * membership, the power written for them.
 */
export function powerHeld(w: World, who: string): string | null {
  const order = { house: 0, kin: 1, stack: 2 } as const;
  const mine = membershipsOf(w, who)
    .filter((m) => isOrganization(m.power))
    .sort(
      (a, b) =>
        Number(!!a.guest) - Number(!!b.guest) ||
        order[organization(a.power).preset.bond] - order[organization(b.power).preset.bond],
    );
  return mine[0]?.power ?? powerOf(w, who);
}

/** What stands behind a member: their power's head, at the foot of its realm. */
export function headRealm(power: string): RealmStage {
  return { realm: ladderOf(power).head, stage: 1 };
}

/** Whether a seat carries the power's death talisman: from the true seat up, under a Core-led head. */
export function carriesTalisman(power: string, seat: SeatId | null): boolean {
  return (
    !!seat &&
    seatRank(seat) >= seatRank(TALISMAN.seat) &&
    realmIndex(ladderOf(power).head) >= realmIndex(TALISMAN.from)
  );
}

/**
 * Someone as their power stands behind them in a scene (design § What membership gives and asks,
 * Backing): they answer to it, so a deed done to them lands on it as one of its own; threatened,
 * they name it, on the backer rule by its head's realm; and from the true seat up in a Core-led
 * power they carry its death talisman, as strong as its head.
 */
export function asMember(w: World, a: Actor): Actor {
  const held = a.power ?? powerHeld(w, a.id);
  if (!held || !isOrganization(held)) return a;
  const house = houseOf(held);
  const head = headRealm(house);
  const seat = seatOf(w, a.id, house, realmOfActor(a));
  const talisman = carriesTalisman(house, seat) ? higher(a.talisman, head) : a.talisman;
  return {
    ...a,
    power: a.power ?? house,
    backing: { power: house, realm: head },
    ...(talisman ? { talisman } : {}),
  };
}

// ── Tutelage (O3) ────────────────────────────────────────────────────────────────────────────

/** An elder's time in the power's currency, on the realm curve by the buyer's realm (O3's talk). */
export function elderPrice(kind: keyof typeof ELDER_TIME, r: RealmId): number {
  return ELDER_TIME[kind].points * realmScale(r);
}

type Bought = { ok: true; state: GameState } | { ok: false; why: string };

/** A member, not a guest, with the points for an elder's time. */
function buyer(s: GameState, power: string, price: number): Member | string {
  const m = membership(s.world, s.player.id, houseOf(power));
  if (!m || m.guest) return 'Only their own buy an elder’s time.';
  if (m.balance < price) return `You haven’t the ${organization(m.power).preset.currency.name}.`;
  return m;
}

/** The insight an elder's lesson gives: three days of your own study's. */
export function lessonInsight(s: GameState): number {
  const c = s.player;
  return (
    INSIGHT_PER_STUDY_DAY *
    realm(realmOf(c)).insightRate *
    insightMultiplier(c) *
    ELDER_TIME.lesson.studyDays
  );
}

/** A membership changed in place. */
function withMember(w: World, m: Member, change: Partial<Member>): World {
  return {
    ...w,
    members: w.members.map((x) =>
      x.who === m.who && x.power === m.power ? { ...x, ...change } : x,
    ),
  };
}

/**
 * An elder's lesson (design: any member buys an elder's time with contribution, insight hours):
 * a day of their teaching, worth three days of your own study, one a month.
 */
export function takeLesson(s: GameState, power: string): Bought {
  const price = elderPrice('lesson', realmOf(s.player));
  const m = buyer(s, power, price);
  if (typeof m === 'string') return { ok: false, why: m };
  const month = monthIndex(s.calendar.day);
  if (m.taught === month) return { ok: false, why: 'An elder has taught you this month.' };
  const player = gainInsight(s.player, lessonInsight(s));
  const world = withMember(addBalance(s.world, m.who, m.power, -price), m, { taught: month });
  return { ok: true, state: { ...withPlayer(s, player), world } };
}

/**
 * An elder as protector 护法 at your next breakthrough (design: +5% to the odds and a failure
 * softened a step): paid now, standing by until you next attempt one.
 */
export function engageProtector(s: GameState, power: string): Bought {
  const price = elderPrice('protector', realmOf(s.player));
  const m = buyer(s, power, price);
  if (typeof m === 'string') return { ok: false, why: m };
  if (protectorOf(s)) return { ok: false, why: 'An elder already stands by you.' };
  const world = withMember(addBalance(s.world, m.who, m.power, -price), m, { protector: true });
  return { ok: true, state: { ...s, world } };
}

/** The power whose elder stands by your next breakthrough, if any. */
export function protectorOf(s: GameState): string | null {
  return membershipsOf(s.world, s.player.id).find((m) => m.protector)?.power ?? null;
}

/** A protector's watch is over once the breakthrough is tried, whatever came of it. */
export function protectorSpent(s: GameState): GameState {
  const power = protectorOf(s);
  const m = power ? membership(s.world, s.player.id, power) : undefined;
  return m ? { ...s, world: withMember(s.world, m, { protector: false }) } : s;
}

// ── What it asks (O3) ────────────────────────────────────────────────────────────────────────

/** A seat's monthly quota in the power's currency: none at a generous power or for a guest. */
export function quotaOf(power: string, seat: SeatId, guest = false): number {
  if (guest || organization(houseOf(power)).treatment === 'generous') return 0;
  return QUOTA[seat];
}

/**
 * Struck off the rolls for three missed quotas: the membership goes as leaving by the rule would,
 * kept as "Struck from our rolls" in place of the parting.
 */
function strikeOff(s: GameState, power: string): GameState {
  const day = s.calendar.day;
  const who = s.player.id;
  const left = leavePower(s.world, who, power, day, { you: true }).world;
  // The parting's row is the last one leaving adds; being struck off is its own.
  const world: World = { ...left, standing: left.standing.slice(0, -1) };
  const struck = addStanding(world, { power, about: who, row: 'struck-off' }, day);
  return addEvent({ ...s, world: struck }, 'power', { power, what: 'struck-off' });
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
      // A post kept the month before counts as the quota kept (O4).
      const met = due === 0 || postKeptFor(state.player, m.power, k - 1) || m.balance >= due;
      const missed = met ? 0 : (m.missed ?? 0) + 1;
      let world = met && due > 0 ? addBalance(state.world, who, m.power, -due) : state.world;
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

/**
 * Investment (design: a member who reaches a realm well before the seat's usual age is offered a
 * true disciple's treatment early): an outer or inner member who has reached the true seat's realm
 * before 15% of that realm's lifespan is raised to the true seat (O3's talk).
 */
export function raiseEarly(s: GameState): GameState {
  const who = s.player.id;
  const r = realmStageOf(s);
  const age = ageYears(s.player, s.calendar.day);
  let state = s;
  for (const m of membershipsOf(s.world, who)) {
    if (!isOrganization(m.power) || m.guest || organization(m.power).preset.byRealm) continue;
    const seat = seatOf(s.world, who, m.power, r)!;
    if (seatRank(seat) >= seatRank('true')) continue;
    const from = seatRanges(m.power).true.from;
    if (!from || rank(r) < rank(from)) continue;
    if (age >= realm(from.realm).lifespan * EARLY_TRUE.share) continue;
    state = { ...state, world: setSeat(state.world, who, m.power, 'true') };
    state = addEvent(state, 'power', { power: m.power, what: 'true' });
  }
  return state;
}

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
  next = raiseEarly(next);
  return countLeave(next, days, home);
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
