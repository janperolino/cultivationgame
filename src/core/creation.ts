// Character creation (design § Character creation): the five-talent roll (a spirit root with its
// elements, a body, soul and fate talent, and an origin, a third each in v1), three free rerolls
// of all five at once, and the life the choices make: name, look and pronouns, ironman or gentle,
// and testing day's choice, which sets the starting method, routines, stones, flags and place.
// The roll is seeded, so the same seed and reroll count give the same talents.
import { ORIGIN_IDS, originPath, type OriginChoice, type OriginId } from '../content/origins.ts';
import { rollRarity } from '../content/rarity.ts';
import type { Element } from '../content/elements.ts';
import { rollElements, rollRoot, type RootId } from '../content/roots.ts';
import { talentsOf, TALENT_KINDS, type Talent, type TalentKind } from '../content/talents.ts';
import { hashSeed, Rng } from './rng.ts';
import { newLife, nextLife, type GameState, type NewLifeOptions } from './state.ts';

/** Free rerolls at creation; later lives earn more (design § Death and rebirth, M8). */
export const FREE_REROLLS = 3;

export interface TalentRoll {
  root: RootId;
  elements: Element[];
  body: string;
  soul: string;
  fate: string;
  origin: OriginId;
}

/** Picks a talent of a kind: its rarity on the shared table, then one of that rarity by weight. */
function rollTalent(kind: TalentKind, rng: Rng): Talent {
  let pool = talentsOf(kind, rollRarity(rng.next()));
  if (!pool.length) pool = talentsOf(kind, 'white');
  const total = pool.reduce((sum, t) => sum + (t.weight ?? 1), 0);
  let roll = rng.next() * total;
  for (const t of pool) {
    roll -= t.weight ?? 1;
    if (roll < 0) return t;
  }
  return pool.at(-1)!;
}

/** One roll of all five talents. */
export function rollTalents(rng: Rng): TalentRoll {
  const root = rollRoot(rng.next());
  const elements = rollElements(root, rng);
  const [body, soul, fate] = TALENT_KINDS.map((k) => rollTalent(k, rng).id) as [
    string,
    string,
    string,
  ];
  const origin = ORIGIN_IDS[Math.floor(rng.next() * ORIGIN_IDS.length)]!;
  return { root, elements, body, soul, fate, origin };
}

/** The roll a creation seed gives on its nth try (0 is the first, then each reroll). */
export function rollFor(seed: string, attempt: number): TalentRoll {
  return rollTalents(new Rng(hashSeed(`${seed}:talents:${attempt}`)));
}

/** Everything creation decides. */
export interface Creation {
  name: string;
  pronouns: string;
  look: string;
  mode: 'ironman' | 'gentle';
  roll: TalentRoll;
  choice: OriginChoice;
  /** Seeds the life's random streams. */
  seed: string;
}

/** The options a new life takes from creation's choices and the origin path. */
export function lifeOptions(c: Creation): NewLifeOptions {
  const path = originPath(c.roll.origin, c.choice);
  return {
    name: c.name.trim() || 'Nameless',
    pronouns: c.pronouns.trim() || 'they/them',
    look: c.look.trim(),
    mode: c.mode,
    seed: c.seed,
    root: c.roll.root,
    elements: c.roll.elements,
    talents: [c.roll.body, c.roll.soul, c.roll.fate],
    origin: { id: c.roll.origin, choice: c.choice },
    place: path.place,
    method: path.method,
    routines: [...path.routines],
    stones: path.stones,
    flags: [...path.flags],
  };
}

/** A first life from creation's choices. */
export function createLife(c: Creation): GameState {
  return newLife(lifeOptions(c));
}

/** The next life in a slot after a death, from creation's choices; the chronicle carries on. */
export function createNextLife(prev: GameState, c: Creation): GameState {
  return nextLife(prev, lifeOptions(c));
}
