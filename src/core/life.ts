// The player's life around the cultivator rules: runs them on `state.player` with the right
// random stream, dates their notes into the chronicle as typed events, flares the glass at
// breakthroughs, keeps gentle mode's rewind, opens screens, wakes sleeping talents, marks a failed
// Foundation attempt for the cards, and ends the life at the lifespan edge.
import { hasCopy } from '../content/copies.ts';
import type { HourKind } from '../content/hours.ts';
import { hasManual } from '../content/manuals.ts';
import { hasMethod } from '../content/methods.ts';
import { realmIndex } from '../content/realms.ts';
import { hasRoutine } from '../content/routines.ts';
import {
  attemptBreakthrough,
  dayRates,
  type DayRates,
  checkUnlocks,
  cultivateDays,
  lastChance,
  majorCheck,
  type LadderId,
  type Note,
} from './cultivation.ts';
import type { Seat } from './attention.ts';
import type { DayStep } from './loop.ts';
import { gainInsight } from './insight.ts';
import type { EquipSlot } from '../content/items.ts';
import { equip, feedArtifact, unequip, wornIds, type GearCheck } from './gear.ts';
import { consumeItem } from './items.ts';
import { gainManual as holdManual, holdsManual } from './manuals.ts';
import { knowsMethod, learnMethod, setActiveMethod, type MethodCheck } from './methods.ts';
import {
  gainCopy as ownCopy,
  moveInQueue,
  ownedCopies,
  queueCopy,
  queueIfIdle,
  unqueueCopy,
  type ReadCheck,
} from './reading.ts';
import {
  addEvent,
  addFlag,
  ageYears,
  atLifespanEdge,
  noteBreakthrough,
  realmOf,
  setMark,
  stageOf,
  unlock,
  withPlayer,
  withStream,
  type GameState,
} from './state.ts';
import { stats, talentAwake, talentsOf, wokeFlag } from './stats.ts';
import {
  canLearnTechnique,
  learnTechnique,
  startPractice,
  stopPractice,
  type TechniqueCheck,
} from './techniques.ts';
import { FIRST_IDS, firstsWaiting, noteFirsts, type FirstStep } from './firsts.ts';
import { noteQuests } from './journal.ts';
import { learnNode, type LearnCheck } from './trees.ts';
import {
  followWheel,
  freeWheel,
  hourToFlip,
  learnRoutine,
  setHours,
  type WheelCheck,
} from './wheel.ts';
import { followersDay } from './resolver/followers.ts';
import { openRings } from './loot.ts';
import {
  densityHere,
  dwellingOf,
  membershipDay,
  protectorOf,
  protectorSpent,
} from './organizations.ts';
import { bedNights } from './map/place.ts';
import { setCopyGain } from './map/encounters.ts';
import { benchSpot, cultivationWheel, ensureMap, travelDays } from './map/travel.ts';
import { atHome, jobsDay, onShift } from './jobs.ts';
import { craftsOpen, workBench } from './crafts.ts';
import { growPlots } from './farming.ts';
import { farmHere, plotPlaceName } from './map/fields.ts';
import { heatOf } from './resolver/world.ts';
import { addCraftFame } from './craftRenown.ts';
import { CRAFT_RENOWN } from '../content/styles.ts';
import { HOME_REGION } from '../content/resolver.ts';

/**
 * The Trees screen opens with anything that lives there (design § UI and screens, Only what you
 * have touched shows): insight enough for a first node, a method (its manual grafts on its tree)
 * or a copy (it stands on the bookcase).
 */
export const TREES_SCREEN_INSIGHT = 10;

/** The mark a failed qi Foundation attempt leaves, for the card ten years on. */
export const FOUNDATION_FAILED = 'foundation-failed';

function addNotes(s: GameState, notes: readonly Note[]): GameState {
  return notes.reduce((acc, n) => addEvent(acc, n.type, n.data), s);
}

/**
 * Wakes the talents that sleep until a realm the qi ladder has reached: each gives its lump of
 * insight and a chronicle line, and its effects count from now on.
 */
export function wakeTalents(s: GameState): GameState {
  let next = s;
  for (const t of talentsOf(s.player)) {
    if (!t.sleeps || talentAwake(next.player, t)) continue;
    if (realmIndex(realmOf(next.player)) < realmIndex(t.sleeps.realm)) continue;
    const woken = addFlag(next.player, wokeFlag(t.id));
    next = addEvent(withPlayer(next, gainInsight(woken, t.sleeps.insight)), 'talent-wakes', {
      talent: t.id,
    });
  }
  return next;
}

/** A breakthrough flares the glass, and a qi one opens a new fracture. */
function flare(s: GameState, ladder: LadderId, major: boolean): GameState {
  const glass = {
    ...s.glass,
    flares: s.glass.flares + 1,
    fractures: s.glass.fractures + (ladder === 'qi' ? 1 : 0),
  };
  return noteBreakthrough({ ...s, glass }, major);
}

/** Opens the screens the player has reached. */
export function checkScreens(s: GameState): GameState {
  let next = s;
  // Things open where they live: a method grafts its manual on its ladder's tree, a copy stands
  // on the bookcase, and insight enough for a node has something to buy there.
  const p0 = s.player;
  if (
    p0.insight.earned >= TREES_SCREEN_INSIGHT ||
    ownedCopies(p0).length > 0 ||
    Object.keys(p0.methods).length > 0
  ) {
    next = unlock(next, 'trees', true);
  }
  if (Object.keys(s.player.techniques).length > 0) {
    next = unlock(next, 'techniques');
  }
  const p = s.player;
  const holds = Object.values(p.items).some((n) => n > 0) || wornIds(p).length > 0;
  if (holds) next = unlock(next, 'bag');
  // The crafts open where they live: the first time you hold a tool or know a recipe (K1).
  if (craftsOpen(p)) next = unlock(next, 'crafts', true);
  return next;
}

/**
 * A day's rates as the day step plays them where you stand: a shift is Duty only at its post (O4),
 * and a power's dwelling counts while you seclude in its seat (O2). Every screen that shows what a
 * day gives reads this, so the screens and `cultivate` agree; the crafts' bench joins here.
 */
export function ratesHere(s: GameState, seat?: Seat): DayRates {
  return dayRates(onShift(s), s.calendar.day, [], seat, undefined, densityHere(s));
}

/**
 * The bench's share of a stretch (core/crafts.ts, K1): the Craft hours of the wheel as played
 * where you stand, a shift's hours Duty at its post, worked from the front of the queue, at the
 * steady hand you sit with (K3; none away) and with what the land lends.
 */
function benchDay(s: GameState, days: number, hand = 0): GameState {
  if (s.player.crafts.bench.length === 0 && !s.player.crafts.front) return s;
  const hours = ratesHere(s).count.craft * days;
  if (hours <= 0) return s;
  const { value: r, state } = withStream(s, 'craft', (rng) =>
    workBench(s.player, hours, s.calendar.day, rng, { hand, spot: benchSpot(s) }),
  );
  let next = withPlayer(state, r.cultivator);
  for (const e of r.events) {
    // A gold piece or better is talked of where it was made (K6): craft renown, no line of its own.
    if (e.type === 'made-rare') {
      const region = next.map?.region ?? HOME_REGION;
      next = withPlayer(
        next,
        addCraftFame(next.player, region, e.data.craft, CRAFT_RENOWN.rare, next.calendar.day),
      );
      continue;
    }
    next = addEvent(next, e.type === 'craft-level' ? 'mastery' : e.type, e.data);
  }
  return next;
}

/**
 * The plots across a stretch (K8): they grow wherever you are, tended where you stand, and the
 * pests, a thief or a lease run out get a line in the chronicle.
 */
function fieldsDay(s: GameState, from: number, to: number): GameState {
  if (!s.player.crafts.plots.length) return s;
  const here = farmHere(s)?.place ?? null;
  const r = growPlots(s.player, from, to, here, (place) => heatOf(s.world, place, to));
  let next = withPlayer(s, r.cultivator);
  for (const e of r.events) {
    if (e.type === 'plot-pests' || e.type === 'plot-thief' || e.type === 'plot-lost')
      next = addEvent(next, e.type, { ...e.data, name: plotPlaceName(next, e.data.place) });
  }
  return next;
}

/**
 * The game's day step for `advance`: the player cultivates for a stretch of at most a day, and
 * minor breakthroughs run on the auto setting. Major breakthroughs never happen here.
 */
export const cultivate: DayStep = (s0, days, ctx) => {
  if (s0.ended || days <= 0) return s0;
  const s = ensureMap(s0);
  // On the road the road wheel's hours are spent travelling, and a ride's at a jostled half.
  const road = cultivationWheel(s);
  const { value: r, state } = withStream(s, 'breakthrough', (rng) =>
    // A shift is Duty only where it is kept: at its place, with no course set (O4).
    cultivateDays(road ? { ...s.player, wheel: road.wheel, jobs: [] } : onShift(s), days, {
      day: s.calendar.day,
      rng,
      seat: ctx?.seat,
      firsts: s.lineage.firsts,
      hourFactor: road?.factor,
      // A power's dwelling by your seat, while you seclude inside its seat (O2).
      density: road ? 1 : (dwellingOf(s)?.density ?? 1),
    }),
  );
  const cultivated = {
    ...r.cultivator,
    wheel: road ? s.player.wheel : r.cultivator.wheel,
    jobs: s.player.jobs,
  };
  let next = addNotes(withPlayer(state, cultivated), r.notes);
  // The hours on the road carry you along your course; a fight you're there for is played.
  next = travelDays(next, s.calendar.day - days, s.calendar.day, ctx?.seat?.attended === true);
  // Nights inside a town away from home are paid at its inn by rule (P3.6b).
  next = bedNights(next, s.calendar.day - days, s.calendar.day);
  for (const b of r.breakthroughs) if (b.success) next = flare(next, b.ladder, b.major);
  // Your followers' wages and bonds run on through the days (P3.4b).
  next = followersDay(next);
  // The jobs you hold: shifts kept at their place pay, missed ones cost standing (O4).
  // A stretch walked in on the road kept no shift, though it ends at the post.
  next = jobsDay(next, s.calendar.day - days, s.calendar.day, !!road);
  // Each power you belong to pays its allowance as the month turns (O2), takes its quota and
  // counts your leave (O3).
  next = membershipDay(next, days, atHome);
  // The bench works its Craft hours wherever you seclude, never on the road (K1).
  if (!road) next = benchDay(next, days, ctx?.seat?.hand);
  // The plots grow wherever you are, tended where you stand (K8).
  next = fieldsDay(next, s.calendar.day - days, s.calendar.day);
  return noteQuests(noteFirsts(checkScreens(next)));
};

export interface LifeBreakthrough {
  state: GameState;
  /** False when the attempt wasn't allowed; the state is unchanged. */
  attempted: boolean;
  success: boolean;
  major: boolean;
  odds: number;
}

/**
 * The player attempts a ladder's next breakthrough, minor or major; `scene` is what an attended
 * attempt's scene added to the odds (core/scene.ts), and `offerings` the items laid on a major
 * one beside the gate pill (core/offerings.ts).
 */
export function breakThrough(
  s: GameState,
  which: LadderId,
  opts: { lastChance?: boolean; scene?: number; offerings?: readonly string[] } = {},
): LifeBreakthrough {
  const none = { state: s, attempted: false, success: false, major: false, odds: 0 };
  if (s.ended) return none;
  // An elder your power sent stands by as protector (O3), and their watch ends with the attempt.
  const protector = !!protectorOf(s);
  const { value: r, state } = withStream(s, 'breakthrough', (rng) =>
    attemptBreakthrough(s.player, which, { day: s.calendar.day, rng }, { ...opts, protector }),
  );
  if (!r.attempted) return none;
  let next = addNotes(withPlayer(protectorSpent(state), r.cultivator), r.notes);
  if (r.success) next = wakeTalents(flare(next, which, r.major));
  else if (r.major && which === 'qi') next = setMark(next, FOUNDATION_FAILED);
  return { state: next, attempted: true, success: r.success, major: r.major, odds: r.odds };
}

/** Tries the last chance at the lifespan edge; if it fails, or isn't possible, the life ends. */
export function attemptLastChance(s: GameState): LifeBreakthrough {
  if (!atLifespanEdge(s) || s.ended) {
    return { state: s, attempted: false, success: false, major: true, odds: 0 };
  }
  const which = lastChance(s.player).ladder;
  const check = majorCheck(s.player, which);
  const result = breakThrough(s, which, { lastChance: !check?.bar });
  if (result.success) return result;
  return { ...result, state: endLife(result.state) };
}

/** The life ends at the lifespan edge. The slot keeps the chronicle and offers a new life. */
export function endLife(s: GameState, cause = 'lifespan'): GameState {
  if (s.ended) return s;
  const p = s.player;
  const age = Math.floor(ageYears(p, s.calendar.day));
  const data = { age, realm: realmOf(p), stage: stageOf(p), cause };
  return { ...addEvent(s, 'death', data), ended: { day: s.calendar.day, cause } };
}

/** The player learns a tree node with insight. */
export function learn(s: GameState, nodeId: string): { state: GameState; check: LearnCheck } {
  if (s.ended) return { state: s, check: { ok: false, reason: 'This life is over.' } };
  const r = learnNode(s.player, nodeId);
  if (!r.check.ok) return { state: s, check: r.check };
  const next = addEvent(withPlayer(s, r.cultivator), 'node', { node: nodeId });
  return { state: noteFirsts(next), check: r.check };
}

/**
 * Opens what the player has just reached, kinds of hour and screens, without waiting for a tick,
 * and records any first time it shows done.
 */
function settle(before: GameState): GameState {
  // A ring taken sealed opens once the realm reaches it (core/loot.ts).
  const s = openRings(before);
  const r = checkUnlocks(s.player, s.lineage.firsts);
  return noteFirsts(checkScreens(addNotes(withPlayer(s, r.cultivator), r.notes)));
}

/** The player gives hours of the day wheel to a kind of work; the reason when they can't. */
export function giveHours(
  s: GameState,
  hours: readonly number[],
  kind: HourKind,
): { state: GameState; check: WheelCheck } {
  const r = setHours(s.player, hours, kind);
  return { state: r.check.ok ? noteFirsts(withPlayer(s, r.cultivator)) : s, check: r.check };
}

/** The player sets the whole wheel to a routine's hours; the reason when they can't. */
export function followRoutine(
  s: GameState,
  hours: readonly HourKind[],
): { state: GameState; check: WheelCheck } {
  const r = followWheel(s.player, hours);
  return { state: r.check.ok ? noteFirsts(withPlayer(s, r.cultivator)) : s, check: r.check };
}

/** The player changes the auto setting for minor breakthroughs, or burning stones in qi hours. */
export function setPlan(s: GameState, patch: Partial<GameState['player']['plan']>): GameState {
  const p = s.player;
  return noteFirsts(withPlayer(s, { ...p, plan: { ...p.plan, ...patch } }));
}

/**
 * The player gains a technique, at Glimpse, or below the chapter before it for a line's next
 * chapter, which needs that one at Comprehension. The Techniques screen opens with the first, and
 * practice hours with the first one they can use.
 */
export function gainTechnique(s: GameState, id: string, how = 'learns'): GameState {
  if (!canLearnTechnique(s.player, id).ok) return s;
  const learned = learnTechnique(s.player, id, s.lineage.firsts);
  const next = addEvent(withPlayer(s, learned), 'technique', {
    technique: id,
    how,
  });
  return settle(next);
}

/**
 * The player gains a method; a ladder with none takes it up, and a first tempering or nourishing
 * art opens body or soul hours. P1.7's cards hand them out.
 */
export function gainMethod(s: GameState, id: string, how = 'learns'): GameState {
  if (!hasMethod(id) || knowsMethod(s.player, id)) return s;
  const learned = learnMethod(s.player, id, s.lineage.firsts);
  const next = addEvent(withPlayer(s, learned), 'method', { method: id, how });
  return settle(next);
}

/**
 * The player climbs a ladder with another known method, or with none. A chapter catches up to
 * its floor as it is taken up; the bar is never touched.
 */
export function switchMethod(
  s: GameState,
  which: LadderId,
  id: string | null,
): { state: GameState; check: MethodCheck } {
  if (s.ended) return { state: s, check: { ok: false, reason: 'This life is over.' } };
  if (s.player.activeMethods[which] === id) return { state: s, check: { ok: true } };
  const r = setActiveMethod(s.player, which, id);
  if (!r.check.ok) return { state: s, check: r.check };
  const data = { ladder: which, method: id, from: s.player.activeMethods[which] };
  return {
    state: settle(addEvent(withPlayer(s, r.cultivator), 'method-switch', data)),
    check: r.check,
  };
}

/** The player comes by a loose manual: a formula, a style, a scripture (content/manuals.ts). */
export function gainManual(s: GameState, id: string, how = 'comes by'): GameState {
  if (!hasManual(id) || holdsManual(s.player, id)) return s;
  const next = withPlayer(s, holdManual(s.player, id));
  if (next.player === s.player) return s;
  return addEvent(next, 'manual', { manual: id, how });
}

/**
 * The player comes by a copy (content/copies.ts): a manual, method or technique handed over as a
 * thing. It stands unread on the bookcase until read on the study hours, and stays after.
 */
export function gainCopy(s: GameState, id: string, how = 'comes by'): GameState {
  if (!hasCopy(id)) return s;
  const owned = addEvent(withPlayer(s, ownCopy(s.player, id)), 'copy', { copy: id, how });
  // A new copy joins an empty queue by itself, once the lineage has queued one itself.
  const queued = queueIfIdle(owned.player, id, s.lineage.firsts);
  return settle(addNotes(withPlayer(owned, queued.cultivator), queued.notes));
}

// A copy in the road's loot comes home as a copy, never into the Bag (P3.7).
setCopyGain((s, id) => gainCopy(s, id, 'finds on the road'));

/** The player adds a copy to the end of the reading queue; the reason when it can't join. */
export function readCopy(s: GameState, id: string): { state: GameState; check: ReadCheck } {
  if (s.ended) return { state: s, check: { ok: false, reason: 'This life is over.' } };
  const r = queueCopy(s.player, id);
  return { state: r.check.ok ? settle(withPlayer(s, r.cultivator)) : s, check: r.check };
}

/** The player takes a copy out of the reading queue; it keeps its progress. */
export function unqueueRead(s: GameState, id: string): GameState {
  return settle(withPlayer(s, unqueueCopy(s.player, id)));
}

/** The player moves a queued copy one place up or down. */
export function moveRead(s: GameState, id: string, by: -1 | 1): GameState {
  return withPlayer(s, moveInQueue(s.player, id, by));
}

/** The flag the first orb drawn in sets, with its chronicle line. */
export const FIRST_BREATH = 'drew-orb';

/** The first orb a life draws in opens attended seclusion with a line in the chronicle. */
export function firstBreath(s: GameState): GameState {
  if (s.ended || s.player.flags.includes(FIRST_BREATH)) return s;
  return addEvent(withPlayer(s, addFlag(s.player, FIRST_BREATH)), 'first-breath');
}

/** The player learns a routine from a teacher, manual or sect. */
export function gainRoutine(s: GameState, id: string, how = 'learns'): GameState {
  if (!hasRoutine(id) || s.player.routines.includes(id)) return s;
  return addEvent(withPlayer(s, learnRoutine(s.player, id)), 'routine', { routine: id, how });
}

/** The player puts a technique in the first free practice slot; the reason when it can't go. */
export function practice(s: GameState, id: string): { state: GameState; check: TechniqueCheck } {
  if (s.ended) return { state: s, check: { ok: false, reason: 'This life is over.' } };
  const r = startPractice(s.player, id);
  return { state: r.check.ok ? noteFirsts(withPlayer(s, r.cultivator)) : s, check: r.check };
}

/** The player takes a technique out of its practice slot. */
export function stopPracticing(s: GameState, id: string): GameState {
  return withPlayer(s, stopPractice(s.player, id));
}

/** The player wears an item from the Bag (core/gear.ts); the reason when they can't. */
export function wearItem(s: GameState, id: string): { state: GameState; check: GearCheck } {
  if (s.ended) return { state: s, check: { ok: false, reason: 'This life is over.' } };
  const r = equip(s.player, id, stats(s.player).treasureSlots);
  return { state: r.check.ok ? withPlayer(s, r.cultivator) : s, check: r.check };
}

/** The player takes off what a gear square or a treasure slot holds. */
export function takeOff(s: GameState, slot: EquipSlot, id?: string): GameState {
  if (s.ended) return s;
  return withPlayer(s, unequip(s.player, slot, id));
}

/** The player feeds an artifact spirit stones in seclusion, bonding by the day's worth. */
export function feedStones(s: GameState, id: string, stones: number): GameState {
  if (s.ended) return s;
  return withPlayer(s, feedArtifact(s.player, id, stones));
}

/** The player eats or drinks one of an item (core/items.ts); unchanged if they can't. */
export function takeItem(s: GameState, id: string): GameState {
  if (s.ended) return s;
  const r = consumeItem(s.player, id, s.calendar.day);
  if (!r.used) return s;
  return addNotes(withPlayer(s, r.cultivator), r.notes);
}

// ---------------------------------------------------------------- the first times, played

/** Gives a kind of work the hour the default rule would: the qi hour worth least. */
function giveHourTo(s: GameState, kind: HourKind): GameState {
  const hour = hourToFlip(freeWheel(s.player), s.player.rootElements);
  return hour === null ? s : giveHours(s, [hour], kind).state;
}

function playStep(s: GameState, step: FirstStep): GameState {
  switch (step.hint) {
    case 'copy':
      return readCopy(s, step.id!).state;
    case 'study-hour':
      return giveHourTo(s, 'study');
    case 'method':
      return switchMethod(s, 'qi', step.id!).state;
    case 'technique':
      return practice(s, step.id!).state;
    case 'technique-hour':
      return giveHourTo(s, 'practice');
    case 'art':
      return switchMethod(s, step.ladder!, step.id!).state;
    case 'art-hour':
      return giveHourTo(s, step.ladder!);
    case 'stones':
      return setPlan(s, { burnStones: true });
    case 'node':
      return s;
  }
}

/**
 * Does every first time waiting at once, as a player would (the sims): queues the copy, turns the
 * hour the default rule would to study, takes up the method or art, slots the technique, gives each
 * its hour, and burns stones. A node is the sim's own choice, so it is left alone.
 */
export function playFirsts(s: GameState): GameState {
  let next = s;
  // Each step clears its first or moves it on (a slot, then its hour); a step that can't be done
  // ends the round, and the cap stops a step that would be done again and again.
  for (let i = 0; i < 2 * FIRST_IDS.length; i++) {
    const step = firstsWaiting(next).find((x) => x.first !== 'node');
    if (!step) break;
    const played = playStep(next, step);
    if (played === next) break;
    next = played;
  }
  return next;
}
