// Guarded methods (design § Professions, people and powers, Guarded methods; § Economy, Methods in
// the market; O5). A power learns of a leak when its members see one of its arts used (each member
// knowing its chapters up to their seat), when its copy is offered at its own hall (E3), or when
// it is sold to a black market, which tells it that it leaked and never who, its copy bought out
// within a season. A leak traced to you marks your face (core/resolver/marks.ts): its people fine
// you at cold standing and up, and take you on sight at hostile and below, until a fine,
// restitution, joining or an erasing lifts it. Inside its sphere its law hall walks the roads,
// sized by what leaked, the hunt cooling a chapter a season. Only what you do is seen: an art
// thrown in a fight, never the method you cultivate by (O5's talk, Jan's call).
import { copyChapter, copyId, copyTitle, hasCopy } from '../content/copies.ts';
import { parentsOf, sphereOf } from '../content/map/index.ts';
import { BANDS } from '../content/map/travel.ts';
import { GUARDED, KNOWS_CHAPTER, LAW_HALL_PARTY, type SeatId } from '../content/organizations.ts';
import { realm as realmInfo } from '../content/realms.ts';
import { BORDER_WILDS } from '../content/roster.ts';
import { guardedBy } from './markets.ts';
import { areaAt, type RegionMap } from './map/region.ts';
import {
  headRealm,
  houseOf,
  isOrganization,
  seatByRealm,
  seatOf,
  seatRanges,
  theName,
} from './organizations.ts';
import { COPY_PRICE } from '../content/money.ts';
import { priceOf } from './prices.ts';
import { pay, priceWords, stonesOf, withStones } from './purse.ts';
import { realmOfActor, type Actor } from './resolver/actor.ts';
import {
  isSecrets,
  leakChapter,
  liftMark,
  markFor,
  marksOf,
  oathFor,
  startMark,
  swearOath,
  type Mark,
} from './resolver/marks.ts';
import { isMember } from './resolver/names.ts';
import {
  learn,
  recordDeed,
  standingOf,
  type Learner,
  type RealmStage,
  type World,
} from './resolver/world.ts';
import { addEvent, withPlayer, type GameState } from './state.ts';

/** A point on the map, in li. */
type Pt = readonly [number, number];

// ── Who may use it, and who knows it when they see it ────────────────────────────────────────

/**
 * Whether someone may use a power's own art openly: one of its members, or one who swore its oath
 * at a clean parting, a fine or restitution.
 */
function mayUse(w: World, who: string, power: string, day: number): boolean {
  const house = houseOf(power);
  return isMember(w, who, house) || !!oathFor(w, who, house, day);
}

/**
 * Whether someone seeing a copy's art used knows it for their power's own: a member of it whose
 * seat knows that chapter (an outer disciple chapter 1, an elder all of them), their seat as held
 * or, for the road's people, by their realm.
 */
export function recognizes(w: World, a: Actor, thing: string): boolean {
  const guard = guardedBy(thing);
  if (!guard || !a.power || !isOrganization(a.power)) return false;
  const house = houseOf(guard);
  if (houseOf(a.power) !== house) return false;
  const r = realmOfActor(a);
  const seat: SeatId = seatOf(w, a.id, house, r) ?? seatByRealm(house, r);
  return KNOWS_CHAPTER[seat] >= copyChapter(thing);
}

/** What a power's people saw: whose art, and whether the face went with it. */
interface Sighting {
  power: string;
  thing: string;
  /** They know the face: a mark. */
  marked: boolean;
}

/**
 * The arts someone used where others saw (design: seen in use, the commonest way): each copy of
 * a power's own they may not use is recognized by the power's members among the watchers, who
 * tell it as a leak deed with its copy for evidence. Undisguised, the face goes with it and is
 * marked; disguised, the power learns that it leaked and not who. A face already marked for that
 * chapter or a higher one tells it nothing new.
 */
export function seeUse(
  w: World,
  who: Actor,
  arts: readonly string[],
  watchers: readonly Actor[],
  at: { place: string; region?: string },
  day: number,
): { world: World; seen: Sighting[] } {
  let world = w;
  const seen: Sighting[] = [];
  for (const thing of new Set(arts)) {
    const guard = guardedBy(thing);
    if (!guard) continue;
    const house = houseOf(guard);
    if (mayUse(world, who.id, house, day)) continue;
    const by = watchers.filter(
      (x) => x.id !== who.id && x.state !== 'dead' && recognizes(world, x, thing),
    );
    if (by.length === 0) continue;
    const had = markFor(world, who.id, house, day);
    if (!who.disguised && had && leakChapter(had.data.method!) >= copyChapter(thing)) continue;
    // Veiled, a leak its power already knows of at this chapter or higher is news to no one, so
    // using the art again adds no deed (the review's: one a fight, without end).
    if (who.disguised && knownLeak(world, who.id, house, copyChapter(thing))) continue;
    const learners: Learner[] = by.map((x) => ({ id: x.id, power: house }));
    const r = recordDeed(
      world,
      {
        kind: 'leak',
        actor: who.id,
        place: at.place,
        power: house,
        evidence: [thing],
        witnesses: who.disguised ? [] : learners,
        ...(at.region ? { region: at.region } : {}),
      },
      day,
    );
    world = r.world;
    if (who.disguised) {
      for (const l of learners) world = learn(world, r.id, l, false, day);
    } else {
      world = oneGrudge(world, who.id, house);
      world = startMark(world, who.id, house, thing, headRealm(house), day);
    }
    seen.push({ power: house, thing, marked: !who.disguised });
  }
  return { world, seen };
}

/** Whether a power already knows of a leak by someone at a chapter or higher. */
function knownLeak(w: World, who: string, house: string, chapter: number): boolean {
  return w.deeds.some(
    (d) =>
      d.kind === 'leak' &&
      d.actor === who &&
      d.power === house &&
      !!d.evidence[0] &&
      leakChapter(d.evidence[0]) >= chapter &&
      Object.values(d.knownBy).some((k) => k.power === house),
  );
}

/** One "Stole one of our methods" a power, however many leaks it traced to you. */
function oneGrudge(w: World, who: string, power: string): World {
  let kept = false;
  return {
    ...w,
    standing: w.standing.filter((s) => {
      if (s.power !== power || s.about !== who || s.row !== 'stole-our-method') return true;
      if (kept) return false;
      kept = true;
      return true;
    }),
  };
}

/** The player's arts seen: the world's leak and the chronicle's line for each face marked. */
export function seenUsing(
  s: GameState,
  arts: readonly string[],
  watchers: readonly Actor[],
  you: Actor,
  at: { place: string; region?: string },
): { state: GameState; seen: Sighting[] } {
  const r = seeUse(s.world, you, arts, watchers, at, s.calendar.day);
  let state: GameState = { ...s, world: r.world };
  for (const x of r.seen)
    if (x.marked) state = addEvent(state, 'power', { power: x.power, what: 'marked' });
  return { state, seen: r.seen };
}

/** The copy an art is learned from, as guarded copies are named. */
export function artCopy(technique: string): string {
  return copyId('technique', technique);
}

// ── A black market sale ──────────────────────────────────────────────────────────────────────

/**
 * A guarded copy sold to a black market (design: the power learns that it leaked, never who): a
 * leak deed its hall knows of without a face, so the hunt rises and nobody is marked.
 */
export function leakSold(
  w: World,
  seller: string,
  thing: string,
  place: string,
  day: number,
): World {
  const guard = guardedBy(thing);
  if (!guard) return w;
  const house = houseOf(guard);
  const r = recordDeed(
    w,
    { kind: 'leak', actor: seller, place, power: house, evidence: [thing], witnesses: [] },
    day,
  );
  return learn(r.world, r.id, { id: `hall:${house}`, power: house }, false, day);
}

/**
 * A power's own good sold where its people trade (K6; design: selling its guarded goods where its
 * people trade is seen in use, they know their own pill). Its shopfolk know the pill and the face:
 * a leak deed at the style's chapter, its grudge and the mark, as an art seen used undisguised is.
 * A member, or one sworn to it, sells freely; a face already marked at that chapter tells it
 * nothing new.
 */
export function ownGoodSold(
  w: World,
  seller: string,
  good: { power: string; copy: string },
  place: string,
  day: number,
): { world: World; marked: boolean } {
  const house = houseOf(good.power);
  if (mayUse(w, seller, house, day)) return { world: w, marked: false };
  const had = markFor(w, seller, house, day);
  if (had && leakChapter(had.data.method!) >= copyChapter(good.copy))
    return { world: w, marked: false };
  const r = recordDeed(
    w,
    {
      kind: 'leak',
      actor: seller,
      place,
      power: house,
      evidence: [good.copy],
      witnesses: [{ id: `hall:${house}`, power: house }],
    },
    day,
  );
  let world = oneGrudge(r.world, seller, house);
  world = startMark(world, seller, house, good.copy, headRealm(house), day);
  return { world, marked: true };
}

/** Why someone may not sell a copy: the oath they swore to its power. */
export function oathRefusal(w: World, who: string, thing: string, day: number): string | null {
  const guard = guardedBy(thing);
  if (!guard) return null;
  const house = houseOf(guard);
  if (isMember(w, who, house) || !oathFor(w, who, house, day)) return null;
  return `You swore a heart-demon oath to ${theName(house)} never to teach or sell its methods.`;
}

// ── The hunt ─────────────────────────────────────────────────────────────────────────────────

/**
 * How hard a power's law hall hunts: the highest chapter among the leaks it knows of, a chapter
 * less for each season since (design: the heat cools a step a season, as infamy does). 0 is quiet.
 */
export function huntOf(w: World, power: string, day: number): number {
  const house = houseOf(power);
  let top = 0;
  for (const d of w.deeds) {
    if (d.kind !== 'leak' || d.power !== house || !d.evidence[0]) continue;
    if (!Object.values(d.knownBy).some((k) => k.power === house)) continue;
    const left =
      leakChapter(d.evidence[0]) - Math.floor(Math.max(0, day - d.day) / GUARDED.coolDays);
    top = Math.max(top, left);
  }
  return top;
}

/**
 * Whether a spot lies inside a power's sphere: within its atlas radius of its seat, or for one with
 * no radius (a kingdom read as a dynasty, the March) on its own land, read off the map's areas.
 */
function inSphere(power: string, at: Pt, map?: RegionMap | null): boolean {
  const house = houseOf(power);
  const s = sphereOf(power) ?? sphereOf(house);
  if (s) return Math.hypot(at[0] - s.x, at[1] - s.y) <= s.sphere;
  const area = map ? areaAt(map, at) : null;
  return !!area && (area.id === house || parentsOf(area.id).includes(house));
}

/** The roster template a power's law hall walks the roads as: its own disciples, if written. */
export function lawHallRoster(power: string): string | null {
  const house = houseOf(power);
  return BORDER_WILDS.find((t) => t.kind === 'cultivator' && t.power === house)?.id ?? null;
}

/** The hunt's chapter as the law hall's party reads it: 1, 2, or 3 and up. */
function partyChapter(hunt: number): 1 | 2 | 3 {
  return hunt >= 3 ? 3 : hunt >= 2 ? 2 : 1;
}

/**
 * The law hall walking the roads where you stand, if any: the most hunting power whose sphere
 * holds the spot and whose disciples the roster writes, and its hunt's chapter.
 */
export function lawHallAt(
  w: World,
  powers: readonly string[],
  at: Pt,
  day: number,
  map?: RegionMap | null,
): { power: string; chapter: 1 | 2 | 3 } | null {
  let best: { power: string; hunt: number } | null = null;
  for (const p of powers) {
    if (!isOrganization(p) || houseOf(p) !== p || !lawHallRoster(p) || !inSphere(p, at, map))
      continue;
    const hunt = huntOf(w, p, day);
    if (hunt > 0 && (!best || hunt > best.hunt)) best = { power: p, hunt };
  }
  return best ? { power: best.power, chapter: partyChapter(best.hunt) } : null;
}

/** The band a realm and stage stand in (content/map/travel.ts `BANDS`). */
export function bandOf(r: RealmStage): number {
  const third = Math.min(3, Math.max(1, Math.ceil((r.stage * 3) / realmInfo(r.realm).stages)));
  const i = BANDS.findIndex((b) => b.realm === r.realm && (b.third === null || b.third === third));
  return Math.max(0, i);
}

/** The band the law hall's party comes at: the strongest of its seat (O5's talk). */
export function lawHallBand(power: string, chapter: 1 | 2 | 3): number {
  return bandOf(seatRanges(power)[LAW_HALL_PARTY[chapter].seat].to);
}

// ── The mark and lifting it ──────────────────────────────────────────────────────────────────

/** Whether a power takes a marked face on sight (hostile and below) rather than fining it. */
export function onSight(w: World, who: string, power: string, day: number): boolean {
  return GUARDED.onSight.includes(standingOf(w, houseOf(power), who, day).word);
}

/** What lifting a mark costs, in low-grade stones: the fine (twice) or restitution (three times). */
function liftPrice(mark: Mark, how: 'fine' | 'restitution'): number {
  const m = mark.data.method!;
  return Math.round((isSecrets(m) ? COPY_PRICE.method : priceOf(m)) * GUARDED[how]);
}

/** A mark, read for the place screen and the law hall: whose, what leaked, and what it costs. */
interface MarkView {
  power: string;
  name: string;
  method: string;
  chapter: number;
  onSight: boolean;
  fine: number;
  restitution: number;
  /** "120 low-grade" and so on. */
  fineWords: string;
  restitutionWords: string;
  /** The slip they ask back, if you still hold one. */
  slip: boolean;
}

function markView(s: GameState, m: Mark): MarkView {
  const power = m.data.power!;
  const fine = liftPrice(m, 'fine');
  const restitution = liftPrice(m, 'restitution');
  return {
    power,
    name: theName(power),
    method: isSecrets(m.data.method!) ? 'its secrets' : copyTitle(m.data.method!),
    chapter: leakChapter(m.data.method!),
    onSight: onSight(s.world, s.player.id, power, s.calendar.day),
    fine,
    restitution,
    fineWords: priceWords(fine),
    restitutionWords: priceWords(restitution),
    slip: (s.player.copies[m.data.method!] ?? 0) > 0,
  };
}

/** Your marks whose power's sphere holds a spot, or whose seat it is. */
export function marksHere(
  s: GameState,
  at: Pt | null,
  place?: string,
  map?: RegionMap | null,
): MarkView[] {
  return marksOf(s.world, s.player.id, s.calendar.day)
    .filter((m) => {
      const p = m.data.power!;
      return place === p || (!!at && inSphere(p, at, map));
    })
    .map((m) => markView(s, m));
}

/** Your mark for a power, read. */
export function yourMark(s: GameState, power: string): MarkView | null {
  const m = markFor(s.world, s.player.id, houseOf(power), s.calendar.day);
  return m ? markView(s, m) : null;
}

export type Lifted = { ok: true; state: GameState } | { ok: false; reason: string };

/**
 * Lifts the mark by a fine on the road (twice the copy's price, at cold standing and up) or
 * restitution at the power's law hall (three times): paid in stones, the slip handed back if you
 * hold one, the grudge dropped, and the heart-demon oath sworn never to teach or sell its methods,
 * so the art is yours to use from then on.
 */
export function liftByPaying(s: GameState, power: string, how: 'fine' | 'restitution'): Lifted {
  const house = houseOf(power);
  const day = s.calendar.day;
  const m = markFor(s.world, s.player.id, house, day);
  if (!m) return { ok: false, reason: `${theName(house)} holds no mark on you.` };
  if (how === 'fine' && onSight(s.world, s.player.id, house, day))
    return { ok: false, reason: 'They won’t take a fine from you now.' };
  const price = liftPrice(m, how);
  const after = pay(stonesOf(s.player), price);
  if (!after) return { ok: false, reason: `It costs ${priceWords(price)}.` };
  let player = withStones(s.player, after);
  const slip = m.data.method!;
  if (hasCopy(slip) && (player.copies[slip] ?? 0) > 0)
    player = { ...player, copies: { ...player.copies, [slip]: player.copies[slip]! - 1 } };
  let world = liftMark(s.world, s.player.id, house, day);
  world = swearOath(world, s.player.id, house, day);
  const state = withPlayer({ ...s, world }, player);
  return {
    ok: true,
    state: addEvent(state, 'power', {
      power: house,
      what: how === 'fine' ? 'fined' : 'restitution',
    }),
  };
}
