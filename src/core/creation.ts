// Character creation (design § Character creation): the five-talent roll (a spirit root with its
// elements, a body, soul and fate talent, and an origin, a third each in v1), three free rerolls
// of all five at once, and the life the choices make: name, look and pronouns, ironman or gentle,
// and testing day's choice, which sets the starting method, routines, stones, flags and place.
// The roll is seeded, so the same seed and reroll count give the same talents.
import {
  ORIGIN_IDS,
  originPath,
  type Origin,
  type OriginChoice,
  type OriginId,
} from '../content/origins.ts';
import { hasPerson, person } from '../content/people.ts';
import { rollRarity } from '../content/rarity.ts';
import type { Element } from '../content/elements.ts';
import { rollElements, rollRoot, type RootId } from '../content/roots.ts';
import { talentsOf, TALENT_KINDS, type Talent, type TalentKind } from '../content/talents.ts';
import { hasJob, job } from '../content/jobs.ts';
import { startChain } from './chains.ts';
import { guidedStart } from './guides.ts';
import { gainMethod } from './life.ts';
import { joinPower, realmStageOf } from './organizations.ts';
import { hashSeed, Rng } from './rng.ts';
import { seeAll } from './seen.ts';
import { addEvent, newLife, nextLife, type GameState, type NewLifeOptions } from './state.ts';

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
    // The origin's method is handed over known, not taken up (handMethod, below).
    method: null,
    routines: [...path.routines],
    stones: path.stones,
    flags: [...path.flags],
    // A new lineage has done nothing for the first time yet (core/firsts.ts); the next life in a
    // slot keeps its lineage's record instead (nextLife).
    firsts: [],
    guides: [],
  };
}

/**
 * The origin path's method, known from the first breath but not yet taken up (Jan's call in The
 * opening, built's talk, 2026-10-20: a start handed its method skips reading it, and the study
 * page is met with a later copy instead).
 */
function handMethod(s: GameState, c: Creation): GameState {
  const id = originPath(c.roll.origin, c.choice).method;
  return id ? gainMethod(s, id, 'is handed') : s;
}

/**
 * The origin path's oath (O4): it seats you in the post's power at the outer seat. The post itself
 * is taken at its Work door, a step of the chain's last quest (Jan's playtest after S1: a post held
 * from the first day never taught Duty).
 */
function swearOath(s: GameState, c: Creation): GameState {
  const id = originPath(c.roll.origin, c.choice).job;
  if (!id || !hasJob(id)) return s;
  const power = job(id).power;
  let st = s;
  if (power) {
    const joined = joinPower(st.world, st.player.id, power, st.calendar.day, {
      you: true,
      realm: realmStageOf(st, st.player.id),
    });
    if (!joined.ok) return st;
    st = addEvent({ ...st, world: joined.world }, 'power', { power, what: 'joined' });
  }
  return st;
}

/**
 * An origin's text at creation, its roles filled with whoever holds them for a first life: a
 * named person's name, or the role's own words (design § NPC basics, Origin people are roles).
 */
export function originWords(o: Origin, text: string): string {
  return text.replace(/\{(\w+)\}/g, (whole, slot: string) => {
    const who = o.people[slot];
    if (!who) return whole;
    return hasPerson(who) ? person(who).name : who;
  });
}

/** A first life from creation's choices, holding nothing new. */
export function createLife(c: Creation): GameState {
  return seeAll(guidedStart(startChain(swearOath(handMethod(newLife(lifeOptions(c)), c), c))));
}

/** The next life in a slot after a death, from creation's choices; the chronicle carries on. */
export function createNextLife(prev: GameState, c: Creation): GameState {
  return seeAll(
    guidedStart(startChain(swearOath(handMethod(nextLife(prev, lifeOptions(c)), c), c))),
  );
}
