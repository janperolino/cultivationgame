// Belonging: joining, leaving, guest seats and how a member stands behind them.
import { craftLevel } from '../craftRenown.ts';
import { CRAFT_RENOWN } from '../../content/styles.ts';
import { DAYS_PER_YEAR } from '../../content/calendar.ts';
import { copyChapter, copyId } from '../../content/copies.ts';
import {
  GUEST_ELDER,
  HUMAN_BLOOD,
  RETIRE_YEARS,
  TALISMAN,
  type SeatId,
} from '../../content/organizations.ts';
import { realmIndex } from '../../content/realms.ts';
import { HOME_REGION } from '../../content/resolver.ts';
import { guardedBy } from '../markets.ts';
import { realmOfActor, type Actor } from '../resolver/actor.ts';
import { higher, traceFor } from '../resolver/backers.ts';
import { breakOath, liftMark, secretsOf, startMark, swearOath } from '../resolver/marks.ts';
import { currentPlaces, powerPrivate } from '../resolver/knows.ts';
import { isMember } from '../resolver/names.ts';
import { addStanding, powerOf } from '../resolver/opinion.ts';
import {
  recordDeed,
  standingOf,
  type Member,
  type RealmStage,
  type World,
} from '../resolver/world.ts';
import { type Cultivator, type GameState } from '../state.ts';
import { isOrganization, organization, theName, houseOf, headRealm } from './identity.ts';
import { ladderOf, seatRank, entrySeat, seatOf } from './seats.ts';
import { monthIndex } from './contribution.ts';

export function membership(w: World, who: string, power: string): Member | undefined {
  return w.members.find((m) => m.who === who && m.power === power);
}

export function membershipsOf(w: World, who: string): Member[] {
  return w.members.filter((m) => m.who === who);
}

/** Why a join is refused: already one of theirs, another house or clan held, or the wrong way in. */
type Refusal = { ok: false; why: string; holds?: string };

interface JoinOpts {
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

interface LeaveOpts {
  you?: boolean;
  /** The power they go over to, if any. */
  to?: string;
  /** The copies of its guarded methods and arts they know (`guardedKnown`), for the parting (O5). */
  knows?: readonly string[];
  /** Struck from its rolls for three missed quotas: a parting by the rule, kept as its own row. */
  struck?: boolean;
}

/**
 * How leaving reads (design: leaving is not betrayal by itself): betrayal where the type's rule
 * is hunted (a gang, a society, assassins, a beast power), deserting a dynasty before its years of
 * service, or going over to a power it is hostile to.
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
  if (o.struck) return { kind: 'clean', why: 'struck from its rolls' };
  // A guest elder's seat is an outsider's and binds no house: its leaving is always clean.
  if (membership(w, who, house)?.guest) return { kind: 'clean', why: org.preset.leave.clean };
  if (org.preset.leave.hunted) return { kind: 'betrayal', why: org.preset.leave.words };
  const m = membership(w, who, house);
  if (org.type === 'dynasty' && m && day - m.since < RETIRE_YEARS * DAYS_PER_YEAR)
    return { kind: 'betrayal', why: 'deserting' };
  if (o.to && isOrganization(o.to)) {
    const to = houseOf(o.to);
    if (org.row.foes.includes(to) || organization(to).row.foes.includes(house))
      return { kind: 'betrayal', why: `going over to ${theName(to)}` };
  }
  return { kind: 'clean', why: org.preset.leave.clean };
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
    {
      power: house,
      about: who,
      row: o.struck ? 'struck-off' : parting.kind === 'clean' ? 'parted' : 'betrayed-us',
    },
    day,
  );
  // What they learned (O5, design § Guarded methods): a clean parting keeps it under the
  // heart-demon oath never to teach or sell it; a betrayal guards all of it against them, marked
  // for the highest chapter they know.
  const known = (o.knows ?? []).filter((c) => guardedBy(c) === house);
  if (parting.kind === 'clean') world = swearOath(world, who, house, day);
  else world = breakOath(world, who, house, day);
  if (parting.kind === 'betrayal') {
    // A traitor is hunted (the checkpoint's fix): a leak its law hall knows of, at the highest
    // chapter of its own they know, or "its secrets" at chapter 1 when they know none.
    const top = [...known].sort((a, b) => copyChapter(b) - copyChapter(a))[0] ?? secretsOf(house);
    const r = recordDeed(
      world,
      {
        kind: 'leak',
        actor: who,
        place: house,
        power: house,
        evidence: [top],
        witnesses: [{ id: 'hall:' + house, power: house }],
      },
      day,
    );
    world = startMark(r.world, who, house, top, headRealm(house), day);
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

/**
 * Whether a power offers the player its guest elder 客卿 seat (design: an honored outsider): they
 * aren't its member and stand honored with it, or are famed across its region (craft renown 6) in
 * a craft it practices (K6). A beast power keeps no outsiders' seats.
 */
export function guestOffered(s: GameState, power: string): boolean {
  if (!isOrganization(power)) return false;
  const house = houseOf(power);
  if (organization(house).type === 'beast' || membership(s.world, s.player.id, house)) return false;
  const word = standingOf(s.world, house, s.player.id, s.calendar.day).word;
  if (word === GUEST_ELDER.from) return true;
  // A crafter famed across its region in a craft it practices (K6: craft renown 6), never by a
  // house that hunts or holds a trace on them (review 2026-10-21).
  if (word === 'hunted' || word === 'hostile') return false;
  if (traceFor(s.world, s.player.id, house, s.calendar.day)) return false;
  const region = organization(house).row.region;
  return (
    !!region &&
    (organization(house).row.crafts ?? []).some(
      (k) => craftLevel(s.player, region, k, s.calendar.day) >= CRAFT_RENOWN.guest,
    )
  );
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

/**
 * The power someone answers to: a house they serve first, then their blood, then any other they
 * belong to, a guest elder's seat last (backing both ways); for anyone the world keeps without a
 * membership, the power written for them.
 */
function powerHeld(w: World, who: string): string | null {
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

/** Whether a seat carries the power's death talisman: from the true seat up, under a Core-led head. */
function carriesTalisman(power: string, seat: SeatId | null): boolean {
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
