// The one fixed list of effects (design § The resolver, What lasts): everything a step, a scene
// or the narrator can change. GLM picks from this list and can't add to it, and a new system adds
// an effect only when it brings a new kind of state. Memories, standing and ties land (P3.4);
// bonds, karma, renown and infamy are on the list and land in P3.4b, which gives them their home:
// until then applying one hands it back as deferred.
import { z } from 'zod';
import { MEMORY_IDS, STANDING_IDS } from '../../content/memories.ts';
import { KIN_RELATIONS, TIE_IDS } from '../../content/people.ts';
import { GIFT_KINDS } from '../../content/personality.ts';
import { PERSON_STATES, PLACE_STATES, TICKS_PER_DAY } from '../../content/resolver.ts';
import { addItem, withPlayer, type GameState } from '../state.ts';
import { addStanding, addTie, remember } from './opinion.ts';
import type { Scene } from './scene.ts';
import {
  addHeat,
  addProject,
  endState,
  projectById,
  LastingStateSchema,
  startState,
} from './world.ts';

const Who = z.string();

export const EffectSchema = z.discriminatedUnion('do', [
  /** Scene time, in ticks; it joins the world's clock when the scene ends. */
  z.object({ do: z.literal('time'), ticks: z.number().int().min(0) }),
  z.object({ do: z.literal('hp'), who: Who, n: z.number() }),
  z.object({ do: z.literal('qi'), who: Who, n: z.number() }),
  z.object({ do: z.literal('wound'), who: Who, share: z.number().min(0).max(1), days: z.number() }),
  z.object({ do: z.literal('stones'), who: Who, n: z.number().int() }),
  z.object({
    do: z.literal('item'),
    who: Who,
    id: z.string(),
    n: z.number().int(),
    how: z.enum(['gained', 'lost', 'broken', 'spent']),
  }),
  /** A memory in a person's opinion of someone: a row of the memory table, never a new reason. */
  z.object({
    do: z.literal('memory'),
    who: Who,
    about: Who,
    row: z.enum(MEMORY_IDS),
    /** For a row whose value is its own: a gift's worth. */
    value: z.number().optional(),
    note: z.string().optional(),
    like: z.enum(GIFT_KINDS).optional(),
  }),
  /** A reason in a power's standing with someone. */
  z.object({
    do: z.literal('standing'),
    power: z.string(),
    about: Who,
    row: z.enum(STANDING_IDS),
    value: z.number().optional(),
  }),
  /** A tie made: what `a` is to `b`. */
  z.object({
    do: z.literal('tie'),
    a: Who,
    b: Who,
    kind: z.enum(TIE_IDS),
    relation: z.enum(KIN_RELATIONS).optional(),
  }),
  /** Why a follower follows (P3.4b). */
  z.object({
    do: z.literal('bond'),
    who: Who,
    with: Who,
    bond: z.enum(['pay', 'loyalty', 'fear', 'goal']),
  }),
  z.object({ do: z.literal('heat'), holder: z.string(), n: z.number().int() }),
  /** Heaven's ledger (P3.4). */
  z.object({ do: z.literal('karma'), who: Who, n: z.number().int() }),
  z.object({ do: z.literal('renown'), who: Who, region: z.string(), n: z.number().int() }),
  z.object({ do: z.literal('infamy'), who: Who, region: z.string(), n: z.number().int() }),
  /** A name, a place or a truth learned. */
  z.object({
    do: z.literal('knowledge'),
    kind: z.enum(['name', 'place', 'truth']),
    id: z.string(),
  }),
  z.object({ do: z.literal('state-start'), state: LastingStateSchema.omit({ id: true }) }),
  z.object({ do: z.literal('state-break'), id: z.number().int(), why: z.string() }),
  z.object({ do: z.literal('project'), id: z.string(), steps: z.number().int() }),
  z.object({ do: z.literal('place'), id: z.string(), state: z.enum(PLACE_STATES) }),
  z.object({ do: z.literal('person'), id: z.string(), state: z.enum(PERSON_STATES) }),
]);
export type Effect = z.infer<typeof EffectSchema>;

/** The effects P3.4b gives a home; until then they come back unapplied. */
const DEFERRED = new Set<Effect['do']>(['bond', 'karma', 'renown', 'infamy']);

export function isDeferred(e: Effect): boolean {
  return DEFERRED.has(e.do);
}

export interface Applied {
  state: GameState;
  scene: Scene | null;
  /** Effects waiting for P3.4b. */
  deferred: Effect[];
}

/** Changes one actor in the scene. */
function withActor(
  scene: Scene | null,
  id: string,
  f: (a: Scene['actors'][number]) => Scene['actors'][number],
) {
  if (!scene) return scene;
  return { ...scene, actors: scene.actors.map((a) => (a.id === id ? f(a) : a)) };
}

/** Applies effects in order: to the player and the world, and to the scene's actors. */
export function applyEffects(
  s: GameState,
  scene: Scene | null,
  effects: readonly Effect[],
): Applied {
  let state = s;
  let sc = scene;
  const deferred: Effect[] = [];
  const day = s.calendar.day;
  const you = s.player.id;
  for (const e of effects) {
    if (isDeferred(e)) {
      deferred.push(e);
      continue;
    }
    switch (e.do) {
      case 'time':
        if (sc) sc = { ...sc, tick: sc.tick + e.ticks };
        else state = { ...state, calendar: { day: state.calendar.day + e.ticks / TICKS_PER_DAY } };
        break;
      case 'hp':
      case 'qi':
        sc = withActor(sc, e.who, (a) => {
          if (!a.combatant) return a;
          const c = a.combatant;
          return e.do === 'hp'
            ? { ...a, combatant: { ...c, hp: Math.min(c.maxHp, Math.max(0, c.hp + e.n)) } }
            : { ...a, combatant: { ...c, qi: Math.min(c.maxQi, Math.max(0, c.qi + e.n)) } };
        });
        break;
      case 'wound': {
        const started = startState(
          state.world,
          e.who,
          { kind: 'wound', share: e.share, until: day + e.days },
          day,
        );
        state = { ...state, world: started.world };
        sc = withActor(sc, e.who, (a) => ({ ...a, wound: Math.max(a.wound, e.share) }));
        break;
      }
      case 'stones':
        if (e.who === you) {
          state = withPlayer(state, {
            ...state.player,
            stones: Math.max(0, state.player.stones + e.n),
          });
        }
        sc = withActor(sc, e.who, (a) => ({ ...a, stones: Math.max(0, a.stones + e.n) }));
        break;
      case 'item':
        if (e.who === you) state = withPlayer(state, addItem(state.player, e.id, e.n));
        sc = withActor(sc, e.who, (a) => ({
          ...a,
          items: { ...a.items, [e.id]: Math.max(0, (a.items[e.id] ?? 0) + e.n) },
        }));
        break;
      case 'memory':
        state = {
          ...state,
          world: remember(
            state.world,
            {
              holder: e.who,
              about: e.about,
              row: e.row,
              value: e.value,
              note: e.note,
              like: e.like,
              // Whoever is in the scene sees it land.
              known: sc ? sc.players : [],
            },
            day,
          ),
        };
        break;
      case 'standing':
        state = {
          ...state,
          world: addStanding(
            state.world,
            { power: e.power, about: e.about, row: e.row, value: e.value },
            day,
          ),
        };
        break;
      case 'tie':
        state = {
          ...state,
          world: addTie(state.world, { a: e.a, b: e.b, kind: e.kind, relation: e.relation }),
        };
        break;
      case 'heat':
        state = { ...state, world: addHeat(state.world, e.holder, e.n, day) };
        break;
      case 'knowledge': {
        const id = `${e.kind}:${e.id}`;
        if (!state.world.known.includes(id)) {
          state = { ...state, world: { ...state.world, known: [...state.world.known, id] } };
        }
        break;
      }
      case 'state-start': {
        const started = startState(state.world, e.state.holder, e.state.data, e.state.since);
        state = { ...state, world: started.world };
        break;
      }
      case 'state-break':
        state = { ...state, world: endState(state.world, e.id) };
        break;
      case 'project': {
        const p = projectById(state.world, e.id);
        if (p) {
          const progress = Math.min(p.size, Math.max(0, p.progress + e.steps));
          state = { ...state, world: addProject(state.world, { ...p, progress }) };
        }
        break;
      }
      case 'place':
        state = {
          ...state,
          world: { ...state.world, places: { ...state.world.places, [e.id]: e.state } },
        };
        break;
      case 'person':
        state = {
          ...state,
          world: { ...state.world, people: { ...state.world.people, [e.id]: e.state } },
        };
        sc = withActor(sc, e.id, (a) =>
          e.state === 'dead'
            ? { ...a, state: 'dead' }
            : e.state === 'gone'
              ? { ...a, state: 'gone' }
              : a,
        );
        break;
    }
  }
  return { state, scene: sc, deferred };
}
