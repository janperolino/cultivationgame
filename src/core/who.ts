// Who acts (design § Professions, people and powers, Who acts; N1): the rules take an actor id and
// read that cultivator, never "the player". Two records stand behind an id: a full cultivator
// (wheel, Bag, benches and plots; only the one you play has one) and a cast member, the kept record
// whose purse and held items are its pocket. The pocket is one set of calls over both, so a hall's
// buy or an allowance pays a cast member's purse as it pays yours.
import { DAYS_PER_YEAR } from '../content/calendar.ts';
import { addItem, itemCount, realmOf, stageOf, withPlayer, type Cultivator } from './state.ts';
import type { GameState } from './state.ts';
import type { Kept } from './resolver/opinion.ts';
import type { RealmStage } from './resolver/world.ts';
import { pay, receive, stonesOf, withStones, worthOf } from './purse.ts';

/** The full cultivator behind an id: yours, or null for a cast member (until co-op adds friends). */
export function cultivator(s: GameState, who: string): Cultivator | null {
  return s.player.id === who ? s.player : null;
}

/** Every full cultivator: you, and from M8 a co-op friend. */
export function fullCultivators(s: GameState): Cultivator[] {
  return [s.player];
}

/**
 * Everyone a power's month runs over (N1): the full cultivators, then every kept cast member with
 * a realm pinned who holds a membership.
 */
export function monthHolders(s: GameState): string[] {
  const ids = fullCultivators(s).map((c) => c.id);
  const cast = new Set(s.world.members.map((m) => m.who).filter((id) => !!castOf(s, id)?.realm));
  return [...ids, ...[...cast].filter((id) => !ids.includes(id))];
}

/** Puts a full cultivator back. */
export function withCultivator(s: GameState, c: Cultivator): GameState {
  return c.id === s.player.id ? withPlayer(s, c) : s;
}

/** A cast member's kept record, or null for a full cultivator or someone the world doesn't keep. */
export function castOf(s: GameState, who: string): Kept | null {
  return cultivator(s, who) ? null : (s.world.kept[who] ?? null);
}

export function withKept(s: GameState, who: string, change: Partial<Kept>): GameState {
  const k = s.world.kept[who];
  if (!k) return s;
  return { ...s, world: { ...s.world, kept: { ...s.world.kept, [who]: { ...k, ...change } } } };
}

/**
 * Whether the rules run for someone: a full cultivator, or a cast member with a realm pinned.
 * Anyone else (a named person's written seat, a face never made) has no record to pay into.
 */
export function acts(s: GameState, who: string): boolean {
  return !!cultivator(s, who) || !!castOf(s, who)?.realm;
}

const UNKNOWN: RealmStage = { realm: 'qi-condensation', stage: 1 };

/** Someone's realm and stage: a full cultivator's highest ladder's, a cast member's pinned one. */
export function realmStageOf(s: GameState, who: string): RealmStage {
  const c = cultivator(s, who);
  if (c) return { realm: realmOf(c), stage: stageOf(c) };
  return castOf(s, who)?.realm ?? UNKNOWN;
}

/** Someone's age in years on a day, or null for a cast member whose birth year isn't known. */
export function ageOf(s: GameState, who: string, day: number): number | null {
  const c = cultivator(s, who);
  if (c) return (day - c.bornDay) / DAYS_PER_YEAR;
  const born = castOf(s, who)?.born;
  return born === undefined ? null : day / DAYS_PER_YEAR - born;
}

// ── The pocket ───────────────────────────────────────────────────────────────────────────────

/** What someone's stones are worth in low: your purse by grade, a cast member's one count. */
export function purseOf(s: GameState, who: string): number {
  const c = cultivator(s, who);
  return c ? worthOf(stonesOf(c)) : (castOf(s, who)?.purse ?? 0);
}

/** Pays a price in low from someone's stones, or null when they can't. */
export function payFrom(s: GameState, who: string, price: number): GameState | null {
  const c = cultivator(s, who);
  if (c) {
    const after = pay(stonesOf(c), price);
    return after ? withPlayer(s, withStones(c, after)) : null;
  }
  const k = castOf(s, who);
  const purse = k?.purse ?? 0;
  if (!k || purse + 1e-9 < price) return null;
  return withKept(s, who, { purse: Math.max(0, purse - price) });
}

/** Stones come to someone: yours in a grade up to `upTo`, a cast member's purse by their worth. */
export function receiveInto(s: GameState, who: string, low: number, upTo = 0): GameState {
  const c = cultivator(s, who);
  if (c) return withPlayer(s, withStones(c, receive(stonesOf(c), low, upTo)));
  const k = castOf(s, who);
  return k ? withKept(s, who, { purse: (k.purse ?? 0) + low }) : s;
}

/** How many of an item someone holds: your Bag's count, a cast member's held. */
export function heldOf(s: GameState, who: string, id: string): number {
  const c = cultivator(s, who);
  return c ? itemCount(c, id) : (castOf(s, who)?.held?.[id] ?? 0);
}

/**
 * Hands someone items (negative takes them): into your Bag through `stow`'s caller, who passes
 * `bag` (core/map/ground.ts `gainItem`, which knows the pack's room), or into a cast member's held.
 */
export function giveTo(
  s: GameState,
  who: string,
  id: string,
  n: number,
  bag: (s: GameState, id: string, n: number) => GameState = (st, i, k) =>
    withPlayer(st, addItem(st.player, i, k)),
): GameState {
  if (cultivator(s, who)) return bag(s, id, n);
  const k = castOf(s, who);
  if (!k || n === 0) return s;
  const held = { ...(k.held ?? {}) };
  const left = (held[id] ?? 0) + n;
  if (left > 0) held[id] = left;
  else delete held[id];
  return withKept(s, who, { held });
}
