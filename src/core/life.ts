// The player's life around the cultivator rules: runs them on `state.player` with the right
// random stream, dates their notes into the chronicle as typed events, flares the glass at
// breakthroughs, keeps gentle mode's rewind, opens screens, wakes sleeping talents, marks a failed
// Foundation attempt for the cards, and ends the life at the lifespan edge.
import { hasManual } from '../content/manuals.ts';
import { hasMethod } from '../content/methods.ts';
import { realmIndex } from '../content/realms.ts';
import { hasRoutine } from '../content/routines.ts';
import {
  attemptBreakthrough,
  checkUnlocks,
  cultivateDays,
  majorCheck,
  type LadderId,
  type Note,
} from './cultivation.ts';
import type { DayStep } from './loop.ts';
import { gainInsight } from './insight.ts';
import type { EquipSlot } from '../content/items.ts';
import { equip, feedArtifact, unequip, wornIds, type GearCheck } from './gear.ts';
import { consumeItem } from './items.ts';
import { gainManual as holdManual, holdsManual } from './manuals.ts';
import { knowsMethod, learnMethod, setActiveMethod, type MethodCheck } from './methods.ts';
import {
  addEvent,
  addFlag,
  ageYears,
  atLifespanEdge,
  noteBreakthrough,
  setMark,
  unlock,
  withPlayer,
  withStream,
  type GameState,
} from './state.ts';
import { stats, talentAwake, talentsOf, wokeFlag } from './stats.ts';
import { canLearnTechnique, learnTechnique, setPracticing } from './techniques.ts';
import { learnNode, type LearnCheck } from './trees.ts';
import { learnRoutine } from './wheel.ts';

/** The Trees screen opens once there is insight enough for a first node (design, the first hour). */
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
    if (realmIndex(next.player.qi.realm) < realmIndex(t.sleeps.realm)) continue;
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
  if (s.player.insight.earned >= TREES_SCREEN_INSIGHT) {
    next = unlock(next, 'trees', true);
  }
  if (Object.keys(s.player.techniques).length > 0) {
    next = unlock(next, 'techniques');
    next = unlock(next, 'combat');
  }
  const p = s.player;
  const holds = Object.values(p.items).some((n) => n > 0) || wornIds(p).length > 0;
  if (holds) next = unlock(next, 'bag');
  return next;
}

/**
 * The game's day step for `advance`: the player cultivates for a stretch of at most a day, and
 * minor breakthroughs run on the auto setting. Major breakthroughs never happen here.
 */
export const cultivate: DayStep = (s, days, ctx) => {
  if (s.ended || days <= 0) return s;
  const { value: r, state } = withStream(s, 'breakthrough', (rng) =>
    cultivateDays(s.player, days, { day: s.calendar.day, rng, seat: ctx?.seat }),
  );
  let next = addNotes(withPlayer(state, r.cultivator), r.notes);
  for (const b of r.breakthroughs) if (b.success) next = flare(next, b.ladder, b.major);
  return checkScreens(next);
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
  const { value: r, state } = withStream(s, 'breakthrough', (rng) =>
    attemptBreakthrough(s.player, which, { day: s.calendar.day, rng }, opts),
  );
  if (!r.attempted) return none;
  let next = addNotes(withPlayer(state, r.cultivator), r.notes);
  if (r.success) next = wakeTalents(flare(next, which, r.major));
  else if (r.major && which === 'qi') next = setMark(next, FOUNDATION_FAILED);
  return { state: next, attempted: true, success: r.success, major: r.major, odds: r.odds };
}

/** Tries the last chance at the lifespan edge; if it fails, or isn't possible, the life ends. */
export function attemptLastChance(s: GameState): LifeBreakthrough {
  if (!atLifespanEdge(s) || s.ended) {
    return { state: s, attempted: false, success: false, major: true, odds: 0 };
  }
  const check = majorCheck(s.player, 'qi');
  const result = breakThrough(s, 'qi', { lastChance: !check?.bar });
  if (result.success) return result;
  return { ...result, state: endLife(result.state) };
}

/** The life ends at the lifespan edge. The slot keeps the chronicle and offers a new life. */
export function endLife(s: GameState, cause = 'lifespan'): GameState {
  if (s.ended) return s;
  const p = s.player;
  const age = Math.floor(ageYears(p, s.calendar.day));
  const data = { age, realm: p.qi.realm, stage: p.qi.stage, cause };
  return { ...addEvent(s, 'death', data), ended: { day: s.calendar.day, cause } };
}

/** The player learns a tree node with insight. */
export function learn(s: GameState, nodeId: string): { state: GameState; check: LearnCheck } {
  if (s.ended) return { state: s, check: { ok: false, reason: 'This life is over.' } };
  const r = learnNode(s.player, nodeId);
  if (!r.check.ok) return { state: s, check: r.check };
  const next = addEvent(withPlayer(s, r.cultivator), 'node', { node: nodeId });
  return { state: next, check: r.check };
}

/** Opens what the player has just reached, kinds of hour and screens, without waiting for a tick. */
function settle(s: GameState): GameState {
  const r = checkUnlocks(s.player);
  return checkScreens(addNotes(withPlayer(s, r.cultivator), r.notes));
}

/**
 * The player gains a technique, at Glimpse, or below the chapter before it for a line's next
 * chapter, which needs that one at Comprehension. The Techniques screen opens with the first, and
 * practice hours with the first one they can use.
 */
export function gainTechnique(s: GameState, id: string, how = 'learns'): GameState {
  if (!canLearnTechnique(s.player, id).ok) return s;
  const next = addEvent(withPlayer(s, learnTechnique(s.player, id)), 'technique', {
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
  const next = addEvent(withPlayer(s, learnMethod(s.player, id)), 'method', { method: id, how });
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
    state: addEvent(withPlayer(s, r.cultivator), 'method-switch', data),
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

/** Points the player's practice days at a technique, or at nothing. */
export function practice(s: GameState, id: string | null): GameState {
  return withPlayer(s, setPracticing(s.player, id));
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
