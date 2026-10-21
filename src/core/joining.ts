// Membership's doors (design § Professions, people and powers, Organizations share one skeleton,
// What membership gives and asks; the organizations checkpoint's fixes). At a power's seat, or
// for a dynasty any town of its kingdom, an outsider asks to join by the type's way in (a test, an
// exam or a trial against the outer seat's bottom, vows, enlisting, buying in, a blood oath, or a
// sponsor once it stands favored with them) and may offer a gift; a member settles their seat at
// its elders' hall: an elder's lesson, a protector, the inner trial in its month, and asking to be
// released, told first what it gives up.
import { copyTitle } from '../content/copies.ts';
import { regionData, parentsOf } from '../content/map/index.ts';
import { wordRank } from '../content/memories.ts';
import {
  BUY_IN,
  ENTRY,
  GIFT,
  INNER_TRIAL,
  SEAT_HALL,
  SPONSOR_FROM,
  type EntryBy,
  type Title,
} from '../content/organizations.ts';
import { realmScale, REALMS } from '../content/realms.ts';
import { hasJob, isHire, job } from '../content/jobs.ts';
import { partWays } from './jobs.ts';
import { guardedBy } from './markets.ts';
import type { MapPlace, RegionMap } from './map/region.ts';
import {
  dwellingDensity,
  elderPrice,
  entrySeat,
  houseOf,
  giftFlaw,
  isOrganization,
  joinPower,
  membership,
  monthIndex,
  monthOfYear,
  organization,
  partingOf,
  realmStageOf,
  seatGate,
  seatOf,
  theName,
  yearOf,
  type Parting,
} from './organizations.ts';
import { priceOf } from './prices.ts';
import { pay, priceWords, stonesOf, withStones } from './purse.ts';
import { actorFromCultivator, realmSizeOf, sizeAt } from './resolver/actor.ts';
import { verdict, type Verdict } from './resolver/check.ts';
import { markFor } from './resolver/marks.ts';
import { addStanding } from './resolver/opinion.ts';
import { standingOf } from './resolver/world.ts';
import { addEvent, addItem, itemCount, realmOf, withPlayer, type GameState } from './state.ts';
import { capitalize } from '../content/words.ts';

// ── Whose seat a place is ────────────────────────────────────────────────────────────────────

/**
 * The power whose doors stand at a place: the power the place is (a sect's gate, a branch hall),
 * the power a town stands for on the map (Pacified Fort for the March), or for a town of a
 * dynasty's kingdom, that dynasty. Null where no power keeps a door.
 */
export function seatPowerAt(map: RegionMap | null, p: MapPlace): string | null {
  if (isOrganization(p.id)) return p.id;
  const homes = map ? (regionData(map.id)?.content.homes ?? {}) : {};
  const stands = Object.entries(homes).find(([k, v]) => v === p.id && isOrganization(k));
  if (stands) return stands[0];
  if (!p.settled) return null;
  for (const id of [p.area, ...parentsOf(p.id)])
    if (id && isOrganization(id) && organization(id).type === 'dynasty') return id;
  return null;
}

// ── The way in ───────────────────────────────────────────────────────────────────────────────

/** The way in as the door shows it: what it is, what it asks, and whether you may ask now. */
interface EntryView {
  power: string;
  by: EntryBy;
  title: Title;
  sub: string;
  /** Why you can't ask, if you can't. */
  shut: string | null;
}

/** The strength a test, an exam or a trial asks: the outer seat's bottom, Qi Condensation 1. */
function entryBar(): number {
  return sizeAt({ realm: REALMS[0]!.id, stage: 1 });
}

/** The stones buying into a guild costs you, on the realm curve by your realm. */
export function buyInPrice(s: GameState): number {
  return BUY_IN * realmScale(realmOf(s.player));
}

/** The way into a power for the player, or null for one they belong to or can't enter by asking. */
export function entryOf(s: GameState, power: string): EntryView | null {
  if (!isOrganization(power)) return null;
  const house = houseOf(power);
  if (membership(s.world, s.player.id, house)) return null;
  const org = organization(house);
  const e = ENTRY[org.type];
  if (e.by === 'kin') return null;
  const day = s.calendar.day;
  const word = standingOf(s.world, house, s.player.id, day).word;
  const subs: Record<EntryBy, string> = {
    test: `a seat as ${org.seats.outer.name} for any rooted child who passes`,
    vows: `a ${org.seats.outer.name}'s robe, by the vows`,
    enlist: `a ${org.seats.outer.name} of ${theName(house)}, ten years' service before retiring`,
    buy: `${priceWords(buyInPrice(s))} to buy in`,
    oath: `a ${org.seats.outer.name}, sworn in blood`,
    sponsor: `a sponsor's word, for one ${theName(house)} favors`,
    kin: '',
  };
  let shut: string | null;
  if (wordRank(word) <= wordRank('hostile')) shut = `${capitalize(theName(house))} won't hear you.`;
  else if (e.by === 'sponsor' && wordRank(word) < wordRank(SPONSOR_FROM))
    shut = `Nobody of ${theName(house)} would vouch for you; they don't know you well enough.`;
  else shut = seatGate(s.player, house, entrySeat(house, realmStageOf(s)));
  return { power: house, by: e.by, title: { name: e.name, hanzi: e.hanzi }, sub: subs[e.by], shut };
}

export type Asked =
  | { ok: true; state: GameState; joined: boolean; verdict?: Verdict; yours?: number; bar?: number }
  | { ok: false; reason: string };

/**
 * Asks to join a power by its way in. A test, an exam or a trial weighs your strongest ladder
 * through your wounds against the outer seat's bottom, passed at close or better (never a roll);
 * a guild takes its buying-in price. Passing joins you at the seat your realm reaches, with its
 * token, and the chronicle says so; falling short says that too.
 */
export function askToJoin(s: GameState, power: string): Asked {
  const e = entryOf(s, power);
  if (!e) return { ok: false, reason: 'There is no asking here.' };
  if (e.shut) return { ok: false, reason: e.shut };
  const house = e.power;
  let st = s;
  if (e.by === 'buy') {
    const after = pay(stonesOf(s.player), buyInPrice(s));
    if (!after) return { ok: false, reason: `Buying in costs ${priceWords(buyInPrice(s))}.` };
    st = withPlayer(s, withStones(s.player, after));
  }
  let tested: { verdict: Verdict; yours: number; bar: number } | null = null;
  if (e.by === 'test') {
    const yours = realmSizeOf(actorFromCultivator(s));
    const bar = entryBar();
    const v = verdict(yours, bar);
    tested = { verdict: v, yours, bar };
    if (v === 'short' || (v === 'close' && INNER_TRIAL.pass !== 'close'))
      return {
        ok: true,
        joined: false,
        ...tested,
        state: addEvent(s, 'power', { power: house, what: 'entry-short' }),
      };
  }
  const r = joinPower(st.world, s.player.id, house, s.calendar.day, {
    you: true,
    realm: realmStageOf(s),
  });
  if (!r.ok) return { ok: false, reason: r.why };
  st = addEvent({ ...st, world: r.world }, 'power', { power: house, what: 'joined' });
  // Joining lifts the mark of a leak: a member may hold its methods (O5).
  if (markFor(s.world, s.player.id, house, s.calendar.day))
    st = addEvent(st, 'power', { power: house, what: 'lifted' });
  return { ok: true, joined: true, ...(tested ?? {}), state: st };
}

// ── A gift ───────────────────────────────────────────────────────────────────────────────────

/** The low-grade stones a gift must be worth to count as tribute, on the realm curve. */
export function giftFloor(s: GameState): number {
  return GIFT.low * realmScale(realmOf(s.player));
}

/** Whether a power has counted a gift of yours this month already. */
export function giftThisMonth(s: GameState, power: string): boolean {
  const house = houseOf(power);
  const day = s.calendar.day;
  return s.world.standing.some(
    (x) =>
      x.power === house &&
      x.about === s.player.id &&
      x.row === 'tribute' &&
      yearOf(x.day) === yearOf(day) &&
      monthOfYear(x.day) === monthOfYear(day),
  );
}

/**
 * A gift at a power's gate or hall (tribute): stones (low's worth) or things from the Bag. Worth
 * the floor or more, it is remembered as "Tribute", +5 for a season, one gift a month; to a member
 * it is a donation instead, paid into the balance.
 */
export function offerGift(
  s: GameState,
  power: string,
  gift: { stones?: number; things?: Readonly<Record<string, number>> },
): { ok: true; state: GameState; counted: boolean } | { ok: false; reason: string } {
  if (!isOrganization(power)) return { ok: false, reason: 'There is nobody to give it to.' };
  const house = houseOf(power);
  if (membership(s.world, s.player.id, house))
    return { ok: false, reason: 'A member donates at the exchange hall.' };
  const flaw = giftFlaw(gift);
  if (flaw) return { ok: false, reason: flaw };
  let player = s.player;
  if (gift.stones) {
    const after = pay(stonesOf(player), gift.stones);
    if (!after) return { ok: false, reason: 'You haven’t the stones.' };
    player = withStones(player, after);
  }
  for (const [thing, n] of Object.entries(gift.things ?? {})) {
    if (itemCount(player, thing) < n) return { ok: false, reason: 'You don’t have that many.' };
    player = addItem(player, thing, -n);
  }
  const worth =
    (gift.stones ?? 0) +
    Object.entries(gift.things ?? {}).reduce((a, [t, n]) => a + priceOf(t) * n, 0);
  const counted = worth >= giftFloor(s) && !giftThisMonth(s, house);
  let world = withPlayer(s, player).world;
  if (counted)
    world = addStanding(
      world,
      { power: house, about: s.player.id, row: 'tribute', value: GIFT.value },
      s.calendar.day,
    );
  return { ok: true, counted, state: { ...withPlayer(s, player), world } };
}

// ── The elders' hall ─────────────────────────────────────────────────────────────────────────

/** What asking to be released gives up, told before you confirm. */
interface ReleaseView {
  parting: Parting;
  balance: number;
  currency: string;
  /** The dwelling's density you leave, if it is more than the open air's. */
  dwelling: number | null;
  posts: string[];
  /** The power's copies you hand back to its pavilion. */
  copies: string[];
}

export function releaseView(s: GameState, power: string): ReleaseView | null {
  const house = houseOf(power);
  const m = membership(s.world, s.player.id, house);
  if (!m) return null;
  const seat = m.guest ? null : seatOf(s.world, s.player.id, house, realmStageOf(s));
  const dwelling = seat ? dwellingDensity(seat, house) : 1;
  return {
    parting: partingOf(s.world, s.player.id, house, s.calendar.day),
    balance: m.balance,
    currency: organization(house).preset.currency.name,
    dwelling: dwelling > 1 ? dwelling : null,
    posts: s.player.jobs
      .filter((h) => hasJob(h.id) && !isHire(job(h.id)) && houseOf(job(h.id).power!) === house)
      .map((h) => job(h.id).name),
    copies: Object.entries(s.player.copies)
      .filter(([t, n]) => n > 0 && guardedBy(t) === house)
      .map(([t]) => copyTitle(t)),
  };
}

/** Asks to be released: leaving by the rule, its copies handed back and its posts dropped. */
export function askRelease(
  s: GameState,
  power: string,
): { ok: true; state: GameState } | { ok: false; reason: string } {
  if (!releaseView(s, power)) return { ok: false, reason: 'You aren’t one of theirs.' };
  return { ok: true, state: partWays(s, power) };
}

/** An elder's time and the trial as the elders' hall shows them to a member. */
export function eldersHall(s: GameState, power: string) {
  const house = houseOf(power);
  const m = membership(s.world, s.player.id, house);
  if (!m) return null;
  const org = organization(house);
  const seat = m.guest ? 'elder' : seatOf(s.world, s.player.id, house, realmStageOf(s))!;
  const day = s.calendar.day;
  const r = realmOf(s.player);
  return {
    title: SEAT_HALL[org.type],
    currency: org.preset.currency.name,
    balance: m.balance,
    guest: !!m.guest,
    lesson: { price: elderPrice('lesson', r), taken: m.taught === monthIndex(day) },
    protector: { price: elderPrice('protector', r), standing: !!m.protector },
    trial:
      seat !== 'outer' || org.preset.byRealm || m.guest
        ? null
        : monthOfYear(day) !== INNER_TRIAL.month
          ? { open: false, words: 'held in the first month of the year' }
          : m.tried === yearOf(day)
            ? { open: false, words: 'you sat it this year' }
            : { open: true, words: 'held this month' },
  };
}

/** Whether the inner trial is held this month for the player at a power: the line under the head. */
export function trialThisMonth(s: GameState, power: string): boolean {
  return eldersHall(s, power)?.trial?.open === true;
}
