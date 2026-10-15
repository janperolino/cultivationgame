// What lasts (design § The resolver, What lasts): heat on places and powers, the deeds done and
// who knows of them, lasting states, projects as clocks, what you have learned, and the states of
// places and kept people. The save carries it as `world` (v20; memories, standing, ties and the kept in v21). A deed spreads only through those
// who know it: witnesses, the telling, soul lamps, evidence and divine sense; heat lands on a place
// when someone there sees it done, and on a power when one of its people learns who did it.
// Knowing who did a deed lands it as a memory and as standing (opinion.ts); karma, renown and
// infamy wait for P3.4b.
import { z } from 'zod';
import {
  CAPABILITY_IDS,
  DEED_KINDS,
  DEEDS,
  HEAT_COOL_DAYS,
  HEAT_MAX,
  HEAT_WORDS,
  PERSON_STATES,
  PLACE_STATES,
  type DeedKind,
  type LastingKind,
} from '../../content/resolver.ts';
import { REALM_IDS } from '../../content/realms.ts';
import {
  KeptSchema,
  landDeed,
  MemorySchema,
  readStanding,
  StandingSchema,
  TieSchema,
  type Standing,
} from './opinion.ts';

const RealmStage = z.object({ realm: z.enum(REALM_IDS), stage: z.number().int().min(1) });
export type RealmStage = z.infer<typeof RealmStage>;

/** Heat on one place or power: the value at its last rise, and the day of that rise. */
const Heat = z.object({ n: z.number().int().min(0).max(HEAT_MAX), day: z.number() });

/** Someone who knows of a deed: whether they know who did it, and the power they tell. */
const Knower = z.object({ who: z.boolean(), power: z.string().nullable() });

export const DeedSchema = z.object({
  id: z.number().int(),
  kind: z.enum(DEED_KINDS),
  /** World day it was done. */
  day: z.number(),
  /** Who did it, and to whom. */
  actor: z.string(),
  victim: z.string().nullable(),
  /** Where: an atlas or site id. */
  place: z.string(),
  /** The power the victim or the place answers to, if any. */
  power: z.string().nullable(),
  /** What it left: "body", "technique:<id>". */
  evidence: z.array(z.string()),
  /** Everyone who knows of it, by id. */
  knownBy: z.record(z.string(), Knower),
  /** The places and powers its heat has landed on, once each. */
  landed: z.array(z.string()),
});
export type Deed = z.infer<typeof DeedSchema>;

/** Each lasting state's own data. */
const StateData = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('cover'),
    /** The realm you show, and the people who have read it and believed it. */
    shown: RealmStage,
    story: z.string().optional(),
    fooled: z.array(z.string()),
  }),
  z.object({ kind: z.literal('disguise'), as: z.string() }),
  z.object({ kind: z.literal('false-name'), name: z.string() }),
  z.object({ kind: z.literal('hidden-intent'), target: z.string(), intent: z.string() }),
  z.object({ kind: z.literal('vow'), vow: z.string(), way: z.string().optional() }),
  z.object({
    kind: z.literal('debt'),
    to: z.string(),
    stones: z.number().min(0),
    /** World day it falls due. */
    due: z.number(),
  }),
  z.object({
    kind: z.literal('wound'),
    /** The share off every line until the day it heals. */
    share: z.number().min(0).max(1),
    until: z.number(),
  }),
  z.object({ kind: z.literal('captive'), held: z.string(), by: z.string() }),
]);
export type StateData = z.infer<typeof StateData>;

export const LastingStateSchema = z.object({
  id: z.number().int(),
  /** Whose state it is. */
  holder: z.string(),
  since: z.number(),
  data: StateData,
});
export type LastingState = z.infer<typeof LastingStateSchema>;

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  owner: z.string(),
  /** Steps to finish: 4, 6 or 8. */
  size: z.union([z.literal(4), z.literal(6), z.literal(8)]),
  progress: z.number().int().min(0),
  /** A hidden project carries its own heat, 0 to 9. */
  hidden: z.boolean(),
  heat: z.number().int().min(0).max(HEAT_MAX),
  /** What a failed step costs: a step back, or heat. */
  onFail: z.enum(['step', 'heat']),
  /** Each step's check: a capability against a realm, or none when every step goes through. */
  check: z.object({ yours: z.enum(CAPABILITY_IDS), faces: RealmStage }).nullable(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const WorldSchema = z.object({
  heat: z.record(z.string(), Heat),
  deeds: z.array(DeedSchema),
  states: z.array(LastingStateSchema),
  projects: z.array(ProjectSchema),
  /** What you have learned: "name:<id>", "place:<id>", "truth:<id>". */
  known: z.array(z.string()),
  places: z.record(z.string(), z.enum(PLACE_STATES)),
  people: z.record(z.string(), z.enum(PERSON_STATES)),
  /** What people remember of each other (opinion.ts). */
  memories: z.array(MemorySchema),
  /** What powers remember of people. */
  standing: z.array(StandingSchema),
  /** What people are to each other. */
  ties: z.array(TieSchema),
  /** People the world keeps who aren't named in content: their natures, by id. */
  kept: z.record(z.string(), KeptSchema),
  /** The next deed's, lasting state's and memory's id. */
  next: z.number().int().min(1),
});
export type World = z.infer<typeof WorldSchema>;

export function emptyWorld(): World {
  return {
    heat: {},
    deeds: [],
    states: [],
    projects: [],
    known: [],
    places: {},
    people: {},
    memories: [],
    standing: [],
    ties: [],
    kept: {},
    next: 1,
  };
}

// ── Heat ─────────────────────────────────────────────────────────────────────────────────────

/** Heat on a place or a power today: its last value, one less for each month since it rose. */
export function heatOf(w: World, holder: string, day: number): number {
  const h = w.heat[holder];
  if (!h) return 0;
  return Math.max(0, h.n - Math.floor(Math.max(0, day - h.day) / HEAT_COOL_DAYS));
}

/** A power's standing with someone today, held under the cap its heat sets. */
export function standingOf(w: World, power: string, about: string, day: number): Standing {
  return readStanding(w, power, about, day, heatOf(w, power, day));
}

/** Raises (or lowers) heat on a place or power, 0 to 9, from what it stands at today. */
export function addHeat(w: World, holder: string, n: number, day: number): World {
  const value = Math.min(HEAT_MAX, Math.max(0, heatOf(w, holder, day) + n));
  return { ...w, heat: { ...w.heat, [holder]: { n: value, day } } };
}

/** The word for a heat: quiet, watched (3), hunted locally (6), hunted by the power (9). */
export function heatWord(n: number): string {
  let word: string = HEAT_WORDS[0].word;
  for (const h of HEAT_WORDS) if (n >= h.at) word = h.word;
  return word;
}

// ── Deeds and who knows ──────────────────────────────────────────────────────────────────────

/** Someone who comes to know: their id and the power they answer to. */
export interface Learner {
  id: string;
  power?: string | null;
}

export interface NewDeed {
  kind: DeedKind;
  actor: string;
  victim?: string | null;
  place: string;
  power?: string | null;
  evidence?: string[];
  /** Who saw it done, and so know who did it. */
  witnesses: readonly Learner[];
}

/**
 * Records a deed, with its witnesses knowing who did it. A deed someone saw heats the place; each
 * witness's power is heated as they learn. Returns the world and the deed's id.
 */
export function recordDeed(w: World, d: NewDeed, day: number): { world: World; id: number } {
  const deed: Deed = {
    id: w.next,
    kind: d.kind,
    day,
    actor: d.actor,
    victim: d.victim ?? null,
    place: d.place,
    power: d.power ?? null,
    evidence: [...(d.evidence ?? [])],
    knownBy: {},
    landed: [],
  };
  let world: World = { ...w, deeds: [...w.deeds, deed], next: w.next + 1 };
  if (d.witnesses.length > 0) world = landHeat(world, deed.id, d.place, day);
  for (const who of d.witnesses) world = learn(world, deed.id, who, true, day, true);
  return { world, id: deed.id };
}

export function deedById(w: World, id: number): Deed | undefined {
  return w.deeds.find((d) => d.id === id);
}

/** Puts a deed's heat on a place or a power, once. */
function landHeat(w: World, id: number, holder: string, day: number): World {
  const d = deedById(w, id)!;
  if (d.landed.includes(holder)) return w;
  const heat = DEEDS[d.kind].heat;
  const marked = replaceDeed(w, { ...d, landed: [...d.landed, holder] });
  return heat > 0 ? addHeat(marked, holder, heat, day) : marked;
}

function replaceDeed(w: World, d: Deed): World {
  return { ...w, deeds: w.deeds.map((x) => (x.id === d.id ? d : x)) };
}

/**
 * Someone comes to know of a deed: that it happened, or who did it as well. Knowing who lands its
 * heat on their power, and lands it on them as a memory and on their power as standing; `seen`
 * is that they saw it done, so the doer knows they know.
 */
export function learn(
  w: World,
  id: number,
  by: Learner,
  who: boolean,
  day: number,
  seen = false,
): World {
  const d = deedById(w, id);
  if (!d || by.id === d.actor) return w;
  const had = d.knownBy[by.id];
  const knows = { who: who || (had?.who ?? false), power: by.power ?? had?.power ?? null };
  let world = replaceDeed(w, { ...d, knownBy: { ...d.knownBy, [by.id]: knows } });
  if (knows.who && knows.power) world = landHeat(world, id, knows.power, day);
  if (knows.who)
    world = landDeed(world, deedById(world, id)!, { ...by, power: knows.power }, day, seen);
  return world;
}

/** Whether someone knows of a deed, and whether they know who did it. */
export function knows(w: World, id: number, who: string): { deed: boolean; who: boolean } {
  const k = deedById(w, id)?.knownBy[who];
  return { deed: !!k, who: !!k?.who };
}

/** The deeds someone knows an actor did. */
export function knownDeeds(w: World, knower: string, actor: string): Deed[] {
  return w.deeds.filter((d) => d.actor === actor && d.knownBy[knower]?.who);
}

/** A kept person tells someone they meet everything they know. */
export function tell(w: World, from: string, to: Learner, day: number): World {
  let world = w;
  for (const d of w.deeds) {
    const k = d.knownBy[from];
    if (k) world = learn(world, d.id, to, k.who, day);
  }
  return world;
}

/**
 * Someone looks over a place and finds what its deeds left: a body tells them a deed was done; a
 * technique's mark tells anyone who knows that technique who did it.
 */
export function discover(
  w: World,
  place: string,
  by: Learner & { techniques?: readonly string[] },
  day: number,
): World {
  let world = w;
  for (const d of w.deeds) {
    if (d.place !== place || d.evidence.length === 0) continue;
    const marked = d.evidence.some(
      (e) => e.startsWith('technique:') && by.techniques?.includes(e.slice('technique:'.length)),
    );
    world = learn(world, d.id, by, marked, day);
  }
  return world;
}

/** Divine sense swept over a place: whoever swept it knows who did everything done there since. */
export function sweep(w: World, place: string, by: Learner, since: number, day: number): World {
  let world = w;
  for (const d of w.deeds) {
    if (d.place === place && d.day >= since) world = learn(world, d.id, by, true, day);
  }
  return world;
}

/**
 * A soul lamp: a sect knows at once when one of its people dies, and a Core Formation elder's lamp
 * shows the killer's face.
 */
export function soulLamp(w: World, id: number, power: string, face: boolean, day: number): World {
  return learn(w, id, { id: `lamp:${power}`, power }, face, day);
}

// ── Lasting states ───────────────────────────────────────────────────────────────────────────

export function startState(
  w: World,
  holder: string,
  data: StateData,
  day: number,
): { world: World; id: number } {
  const state: LastingState = { id: w.next, holder, since: day, data };
  return { world: { ...w, states: [...w.states, state], next: w.next + 1 }, id: state.id };
}

export function endState(w: World, id: number): World {
  return { ...w, states: w.states.filter((s) => s.id !== id) };
}

export function updateState(w: World, s: LastingState): World {
  return { ...w, states: w.states.map((x) => (x.id === s.id ? s : x)) };
}

/** A holder's lasting states of one kind, wounds that have healed left out. */
export function statesOf<K extends LastingKind>(
  w: World,
  holder: string,
  kind: K,
  day: number,
): (LastingState & { data: Extract<StateData, { kind: K }> })[] {
  return w.states.filter(
    (s) =>
      s.holder === holder &&
      s.data.kind === kind &&
      !(s.data.kind === 'wound' && s.data.until <= day),
  ) as (LastingState & { data: Extract<StateData, { kind: K }> })[];
}

/** The share off every line a holder's wounds take today, the worst of them. */
export function woundShare(w: World, holder: string, day: number): number {
  return Math.max(0, ...statesOf(w, holder, 'wound', day).map((s) => s.data.share));
}

/** Healed wounds leave the list. */
export function healWounds(w: World, day: number): World {
  const states = w.states.filter((s) => !(s.data.kind === 'wound' && s.data.until <= day));
  return states.length === w.states.length ? w : { ...w, states };
}

/** Debts past due: each full month late, and who holds it, for the opinion it costs (P3.4). */
export function lateDebts(
  w: World,
  day: number,
): { state: LastingState; to: string; months: number }[] {
  const out: { state: LastingState; to: string; months: number }[] = [];
  for (const s of w.states) {
    if (s.data.kind !== 'debt' || day < s.data.due) continue;
    out.push({ state: s, to: s.data.to, months: Math.floor((day - s.data.due) / 30) });
  }
  return out;
}

// ── Projects ─────────────────────────────────────────────────────────────────────────────────

export function addProject(w: World, p: Project): World {
  return { ...w, projects: [...w.projects.filter((x) => x.id !== p.id), p] };
}

export function projectById(w: World, id: string): Project | undefined {
  return w.projects.find((p) => p.id === id);
}

export function projectDone(p: Project): boolean {
  return p.progress >= p.size;
}

/**
 * One step of a project by its verdict: clear goes a step on; close goes a step on and adds heat
 * to a hidden project; short costs a step back or adds heat, as the project says.
 */
export function workProject(p: Project, verdict: 'clear' | 'close' | 'short'): Project {
  const heat = (n: number) => Math.min(HEAT_MAX, p.heat + n);
  if (verdict === 'clear') return { ...p, progress: Math.min(p.size, p.progress + 1) };
  if (verdict === 'close') {
    return { ...p, progress: Math.min(p.size, p.progress + 1), heat: p.hidden ? heat(1) : p.heat };
  }
  return p.onFail === 'step'
    ? { ...p, progress: Math.max(0, p.progress - 1) }
    : { ...p, heat: heat(1) };
}
