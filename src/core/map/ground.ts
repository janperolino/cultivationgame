// The ground (C2, Jan's call after Sean's playtest): the Bag holds no more than its squares, and
// what it can't hold falls where you stand, as does anything you set down. A pile lies on the map
// where it fell, marked there and listed on the Bag screen, for GROUND_DAYS (a month), and is
// picked up from within GROUND_LI of it as far as the Bag has room. With no map yet, it is lost.
import { GROUND_DAYS, GROUND_LI } from '../../content/gear.ts';
import { hasItem, item } from '../../content/items.ts';
import { bagStacks, splitsOf, stow } from '../gear.ts';
import { addItem, withPlayer, type Cultivator, type GameState } from '../state.ts';
import type { Pt } from './geometry.ts';
import type { MapLife } from './schema.ts';

type Pile = NonNullable<MapLife['ground']>[number];

const live = (day: number) => (p: Pile) => day - p.day < GROUND_DAYS;

/** The piles still lying on the map today. */
export function groundPiles(s: GameState): Pile[] {
  return (s.map?.ground ?? []).filter(live(s.calendar.day));
}

const near = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]) <= GROUND_LI;

/** The piles within reach of where you stand, with their index among groundPiles. */
export function pilesHere(s: GameState): { pile: Pile; i: number }[] {
  const at = s.map?.at;
  if (!at) return [];
  return groundPiles(s)
    .map((pile, i) => ({ pile, i }))
    .filter(({ pile }) => near(pile.at, at));
}

/**
 * Sets things down on the ground of a map life: onto a pile within reach of the spot, which then
 * lies from today, or as a new one. Piles past their days are swept away.
 */
function dropOn(life: MapLife, at: Pt, day: number, items: Record<string, number>): MapLife {
  const piles = (life.ground ?? []).filter(live(day));
  // The nearest pile in reach, not the first written.
  let i = -1;
  for (let j = 0; j < piles.length; j++) {
    const d = Math.hypot(piles[j]!.at[0] - at[0], piles[j]!.at[1] - at[1]);
    const best = i < 0 ? Infinity : Math.hypot(piles[i]!.at[0] - at[0], piles[i]!.at[1] - at[1]);
    if (near(piles[j]!.at, at) && d < best) i = j;
  }
  const into = i >= 0 ? piles[i]!.items : {};
  const merged = { ...into };
  for (const [id, n] of Object.entries(items)) if (n > 0) merged[id] = (merged[id] ?? 0) + n;
  const pile: Pile = { at: i >= 0 ? piles[i]!.at : [at[0], at[1]], day, items: merged };
  const ground = i >= 0 ? piles.map((p, j) => (j === i ? pile : p)) : [...piles, pile];
  return { ...life, ground };
}

const roadLine = (s: GameState, life: MapLife, text: string): MapLife => ({
  ...life,
  road: [...life.road, { day: s.calendar.day, kind: 'ground', text }].slice(-40),
});

/** "3 Iron Ore" or "a Qi-Gathering Pill". */
function countWords(id: string, n: number): string {
  const name = hasItem(id) ? item(id).name : id;
  return n === 1 ? name : `${n} ${name}`;
}

/**
 * Something gained into the Bag: what fits goes in, and the rest falls where you stand with a
 * line on the road saying so. Every way a thing comes to you goes through here; buying asks
 * for room first instead (core/shops.ts).
 */
export function gainItem(s: GameState, id: string, n: number): { state: GameState; left: number } {
  if (n <= 0) return { state: withPlayer(s, addItem(s.player, id, n)), left: 0 };
  const { c, left } = stow(s.player, id, n);
  let state = withPlayer(s, c);
  // A thing no catalog writes could never be picked up again: it is never set down.
  if (left > 0 && state.map && hasItem(id)) {
    const life = dropOn(state.map, state.map.at, s.calendar.day, { [id]: left });
    state = {
      ...state,
      map: roadLine(s, life, `No room in your pack: ${countWords(id, left)} left on the ground.`),
    };
  }
  return { state, left };
}

/** gainItem for a cultivator and a map life, where a step works on those rather than the state. */
export function gainInto(
  c: Cultivator,
  life: MapLife,
  day: number,
  id: string,
  n: number,
): { c: Cultivator; life: MapLife } {
  const r = stow(c, id, n);
  return { c: r.c, life: r.left > 0 ? dropOn(life, life.at, day, { [id]: r.left }) : life };
}

type GroundCheck = { ok: true; state: GameState } | { ok: false; reason: string };

/** Sets one of the Bag's stacks down where you stand: the `at`-th stack of the item, whole. */
export function dropStack(s: GameState, id: string, at: number): GroundCheck {
  if (!s.map) return { ok: false, reason: 'There is no ground here to set it on.' };
  const stack = bagStacks(s.player).filter((x) => x.id === id)[at];
  if (!stack) return { ok: false, reason: 'You hold no such stack.' };
  let c = addItem(s.player, id, -stack.n);
  if (stack.split !== null) {
    const splits = splitsOf(s.player, id).filter((_, i) => i !== stack.split);
    c = { ...c, splits: { ...c.splits, [id]: splits } };
  }
  const life = dropOn(s.map, s.map.at, s.calendar.day, { [id]: stack.n });
  return { ok: true, state: { ...withPlayer(s, c), map: life } };
}

/** Picks up a pile within reach (its index among groundPiles) as far as the Bag has room. */
export function pickUp(s: GameState, i: number): GroundCheck {
  const life = s.map;
  const piles = groundPiles(s);
  const pile = piles[i];
  if (!life || !pile) return { ok: false, reason: 'Nothing lies there now.' };
  if (!near(pile.at, life.at))
    return { ok: false, reason: 'It lies too far from where you stand.' };
  let c = s.player;
  const rest: Record<string, number> = {};
  for (const [id, n] of Object.entries(pile.items)) {
    const r = stow(c, id, n);
    c = r.c;
    if (r.left > 0) rest[id] = r.left;
  }
  if (c === s.player) return { ok: false, reason: 'Your pack has no room for any of it.' };
  const ground = Object.keys(rest).length
    ? piles.map((p, j) => (j === i ? { ...p, items: rest } : p))
    : piles.filter((_, j) => j !== i);
  return { ok: true, state: { ...withPlayer(s, c), map: { ...life, ground } } };
}
