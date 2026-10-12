// The whole game state of one life, as plain data that saves, migrates and checks with Zod.
// What belongs to a cultivator (ladders, insight, attributes, root, talents, origin, methods, the
// day wheel, items, nodes and techniques) lives in a `Cultivator`, so NPCs and co-op guests later
// run on the same rules. The chronicle is a typed event log (content/chronicle.ts writes the text).
import { z } from 'zod';
import type { EventData } from '../content/chronicle.ts';
import { AUTO_IDS, GRADE_IDS } from '../content/cultivation.ts';
import { ELEMENTS, type Element } from '../content/elements.ts';
import { FRESH_WHEEL, HOUR_KIND_IDS, HOURS_PER_DAY } from '../content/hours.ts';
import {
  ORIGIN_CHOICES,
  ORIGIN_IDS,
  type OriginChoice,
  type OriginId,
} from '../content/origins.ts';
import { BOND_IDS, pathPeople, person, REGARD_MAX, REGARD_MIN } from '../content/people.ts';
import { RARITY_IDS } from '../content/rarity.ts';
import { REALM_IDS, realm } from '../content/realms.ts';
import { defaultElements, ROOT_IDS, type RootId } from '../content/roots.ts';
import { hashSeed, Rng, streamSeed, type StreamName } from './rng.ts';
import { stats } from './stats.ts';

/** The in-game calendar: twelve months of thirty days. */
export const DAYS_PER_YEAR = 360;
/** Play opens at age 12 on root-testing day (design § Character creation). */
export const START_AGE = 12;
/** The player's cultivator id; NPCs get their own. */
export const PLAYER_ID = 'player';

/**
 * What one climbed stage recorded (design § Cultivation, growth): the method active at the
 * breakthrough that reached it, or none, and the growth it left, set for good.
 */
const StageGrowth = z.object({
  realm: z.enum(REALM_IDS),
  stage: z.number().int().min(1),
  /** The method active at the attempt, or null when the world alone climbed it. */
  method: z.string().nullable(),
  rarity: z.enum(RARITY_IDS),
  /** What the stage added to each growth stat (content/methods.ts, GROWTH_STATS): 0.05 is +5%. */
  growth: z.record(z.string(), z.number()),
});
export type StageGrowth = z.infer<typeof StageGrowth>;

const Ladder = z.object({
  realm: z.enum(REALM_IDS),
  /** Layer 1–9 at Qi Condensation, stage 1–4 above it. */
  stage: z.number().int().min(1),
  /** Fuel toward the next step: qi, tempering or nourishment, in qi units (realms.stepSize). */
  bar: z.number().min(0),
  /** The grade of each major breakthrough on this ladder, oldest first. */
  grades: z.array(z.enum(GRADE_IDS)),
  /** World day until which a failed breakthrough leaves this ladder unsettled: no gains. */
  unsettledUntil: z.number(),
  /** World day until which an injury slows this ladder. */
  injuredUntil: z.number(),
  /** Every stage climbed, oldest first, with the growth its method left. */
  growth: z.array(StageGrowth),
});
export type Ladder = z.infer<typeof Ladder>;

/** Twelve hours, from 子 round to 亥, each given to one kind of work (content/hours.ts). */
const Wheel = z.array(z.enum(HOUR_KIND_IDS)).length(HOURS_PER_DAY);

const activeMethod = z.string().nullable();

/**
 * What a cultivator knows of someone they've met (design § Professions, people and powers): what
 * they are to you, how they feel (−3 to +3, shown only in words), their realm as last seen or
 * heard and where they were, which is only what you've seen or heard. Their log is the chronicle
 * filtered by their id.
 */
const PersonRecord = z.object({
  /** World day you met, and where. */
  met: z.number(),
  place: z.string().nullable(),
  bond: z.enum(BOND_IDS),
  regard: z.number().int().min(REGARD_MIN).max(REGARD_MAX),
  realm: z.object({ realm: z.enum(REALM_IDS), stage: z.number().int().min(1) }).nullable(),
  /** Where they were when you last heard: an atlas entry id, or null when unknown. */
  where: z.string().nullable(),
  /** World day you last heard of them. */
  heard: z.number(),
  /** The `heard` day you last read on their page; newer news shows a gold dot. */
  seen: z.number(),
});
export type PersonRecord = z.infer<typeof PersonRecord>;

export const CultivatorSchema = z.object({
  id: z.string(),
  name: z.string(),
  pronouns: z.string(),
  look: z.string(),
  /** World day of birth. */
  bornDay: z.number(),
  /** Years added to the qi realm's lifespan by pills and the like; talents and nodes add theirs as stats. */
  lifespanBonus: z.number(),
  root: z.enum(ROOT_IDS),
  /** The elements the root holds; the element hours read them. */
  rootElements: z.array(z.enum(ELEMENTS)),
  /** The body, soul and fate talents rolled at birth, by id (content/talents.ts). */
  talents: z.array(z.string()),
  /** Where the cultivator comes from and what they chose on testing day; null for a placeholder. */
  origin: z.object({ id: z.enum(ORIGIN_IDS), choice: z.enum(ORIGIN_CHOICES) }).nullable(),
  /** Where the cultivator lives: an atlas entry id, or null when unknown. */
  place: z.string().nullable(),
  /**
   * Methods known, by id (content/methods.ts): qi methods, tempering and nourishing arts, each
   * with the practice days cultivated with it, which set its mastery, and the world day its
   * upkeep is paid through.
   */
  methods: z.record(z.string(), z.object({ practice: z.number().min(0), fedUntil: z.number() })),
  /** The method each ladder climbs with; a ladder gains nothing from its hours without one. */
  activeMethods: z.object({ qi: activeMethod, body: activeMethod, soul: activeMethod }),
  /** The three attributes that come from birth (design § Combat), at their base; talents add as stats. */
  attributes: z.object({
    agility: z.number(),
    fortune: z.number(),
    aptitude: z.number(),
  }),
  qi: Ladder,
  body: Ladder,
  soul: Ladder,
  insight: z.object({
    /** Spendable on tree nodes. */
    current: z.number().min(0),
    /** Insight ever earned; breakthrough thresholds count this, so spending never delays them. */
    earned: z.number().min(0),
  }),
  /** Spirit stones, counted in low-grade stones (each grade is worth 1,000 of the one below). */
  stones: z.number().min(0),
  /** Item counts by id, such as the Foundation Pill; the bag arrives in M2. */
  items: z.record(z.string(), z.number().int().min(0)),
  /** Pill toxicity, 0 to 100 (design § Items and gear): every pill's effect scales by 1 − this/100. */
  toxicity: z.number().min(0).max(100),
  /** What each of the day's twelve hours goes to. */
  wheel: Wheel,
  /** Routines learned from teachers, manuals and sects (content/routines.ts), by id. */
  routines: z.array(z.string()),
  /** Wheels the cultivator saved under a name; they earn no discipline bonus. */
  savedRoutines: z.array(z.object({ name: z.string(), hours: Wheel })),
  /** When minor breakthroughs happen on their own, and whether qi hours burn stones. */
  plan: z.object({
    auto: z.enum(AUTO_IDS),
    /** Burn spirit stones as fuel on qi days. */
    burnStones: z.boolean(),
  }),
  /** Milestones and story: kinds of hour opened, sleep freed, gates reached, talents woken, a bounty. */
  flags: z.array(z.string()),
  /** Nodes learned, from trees and manuals alike, in the order they were learned. */
  nodes: z.array(z.string()),
  /**
   * Loose manuals held (content/manuals.ts), by id, in the order gained. A known method's own
   * manual is held with the method and isn't listed here.
   */
  manuals: z.array(z.string()),
  /** Techniques known, with the practice days put into each. */
  techniques: z.record(z.string(), z.object({ practice: z.number().min(0) })),
  /** The technique practice days go to, or null. */
  practicing: z.string().nullable(),
  /** Insight drawn from each contemplation source (content/contemplation.ts), before Aptitude. */
  contemplation: z.record(z.string(), z.number().min(0)),
  /** Everyone this cultivator has met, by person id (content/people.ts). */
  people: z.record(z.string(), PersonRecord),
});
export type Cultivator = z.infer<typeof CultivatorSchema>;

const EventValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);

/**
 * One event in the chronicle: when, what type, who (cultivator ids, the subject first), where (an
 * atlas id) and the details. The text comes from its type's template (content/chronicle.ts).
 */
const ChronicleEvent = z.object({
  /** World day it happened on. */
  day: z.number(),
  type: z.string(),
  actors: z.array(z.string()),
  place: z.string().nullable(),
  data: z.record(z.string(), EventValue),
});
export type ChronicleEvent = z.infer<typeof ChronicleEvent>;

/** A card waiting in the feed (core/cards.ts). */
const PendingCard = z.object({
  /** Unique within the life, so the same card drawn twice is two entries. */
  uid: z.number().int(),
  card: z.string(),
  /** World day it was drawn. */
  day: z.number(),
  /** A multi-step card's current step, absent at its opening. */
  step: z.string().optional(),
  /** The card's own variables, set by earlier steps. */
  vars: z.record(z.string(), z.number()).optional(),
  /** The choices taken so far, one per step. */
  path: z.array(z.number().int()).optional(),
});
export type PendingCard = z.infer<typeof PendingCard>;

const Cards = z.object({
  /** Cards waiting for a choice, oldest first. */
  pending: z.array(PendingCard),
  /** The world day each card was last drawn, for once-only cards and cooldowns. */
  drawn: z.record(z.string(), z.number()),
  /** Days the story marked, for later cards' triggers: a failed Foundation attempt. */
  marks: z.record(z.string(), z.number()),
  /** The last whole world day the decks were checked on. */
  checked: z.number(),
  nextUid: z.number().int(),
});
export type CardsState = z.infer<typeof Cards>;

export const GameStateSchema = z.object({
  lineage: z.object({
    id: z.string(),
    /** 1 for the first life; rebirth (M8) counts up. */
    life: z.number().int().min(1),
  }),
  mode: z.enum(['ironman', 'gentle']),
  calendar: z.object({
    /** World days since the lineage began, fractional while time runs. */
    day: z.number().min(0),
  }),
  player: CultivatorSchema,
  /** The background glass: its seed, the fractures breakthroughs opened, and a flare count. */
  glass: z.object({
    seed: z.number().int(),
    /** Qi breakthroughs so far; each opened a new fracture. */
    fractures: z.number().int().min(0),
    /** Every breakthrough so far, on any ladder; the UI flares when it rises. */
    flares: z.number().int().min(0),
  }),
  /**
   * The calendar speed the life runs at: a qi realm it has reached, or null to follow its own
   * realm (design § How the two halves connect, running the clock slower).
   */
  clock: z.enum(REALM_IDS).nullable(),
  /** Set when the life is over; the slot keeps the chronicle and offers a new life. */
  ended: z.object({ day: z.number(), cause: z.string() }).nullable(),
  chronicle: z.array(ChronicleEvent),
  /** The card feed and the decks' memory. */
  cards: Cards,
  /** Unlock flags for the screens, so they appear as they're reached. */
  unlocks: z.array(z.string()),
  /** Gentle mode's rewind charge: 1 when a rewind is available. Always 0 in ironman. */
  rewindCharges: z.number().int().min(0).max(1),
  /** The life's seed; every random stream starts from it and its own name. */
  seed: z.number().int(),
  /** Where each named random stream stands, so a reload continues the same sequences. */
  rng: z.record(z.string(), z.number().int()),
});
export type GameState = z.infer<typeof GameStateSchema>;

export interface NewLifeOptions {
  name: string;
  pronouns?: string;
  look?: string;
  mode?: 'ironman' | 'gentle';
  /** Seeds the generators; defaults to the name. */
  seed?: string;
  /** A true root unless creation rolled another. */
  root?: RootId;
  /** The root's elements; the root's defaults unless creation rolled them. */
  elements?: Element[];
  /** Body, soul and fate talents, by id. */
  talents?: string[];
  origin?: { id: OriginId; choice: OriginChoice } | null;
  place?: string | null;
  /** The qi method; null for the refusals that start without one. */
  method?: string | null;
  /** Routines known from the start: the origin path's. */
  routines?: string[];
  stones?: number;
  /** Story flags from the start: the origin path's. */
  flags?: string[];
  aptitude?: number;
  /** Techniques known from the start; tests and sims only, since the first one comes as a card. */
  techniques?: string[];
}

/** An empty ladder at Qi Condensation layer 1. */
export function freshLadder(): Ladder {
  return {
    realm: 'qi-condensation',
    stage: 1,
    bar: 0,
    grades: [],
    unsettledUntil: 0,
    injuredUntil: 0,
    growth: [],
  };
}

/** The screens a life starts with. */
export const STARTING_UNLOCKS = ['abode', 'cultivate', 'character', 'people', 'chronicle'];

/** A cultivator at age 12, every ladder at Qi Condensation layer 1 with an empty bar. */
export function newCultivator(
  id: string,
  opts: Omit<NewLifeOptions, 'mode' | 'seed'> & { bornDay: number },
): Cultivator {
  const method = opts.method === undefined ? 'garrison-standard' : opts.method;
  const techniques = opts.techniques ?? [];
  return {
    id,
    name: opts.name,
    pronouns: opts.pronouns ?? 'they/them',
    look: opts.look ?? '',
    bornDay: opts.bornDay,
    lifespanBonus: 0,
    root: opts.root ?? 'true',
    rootElements: opts.elements ?? defaultElements(opts.root ?? 'true'),
    talents: opts.talents ?? [],
    origin: opts.origin ?? null,
    place: opts.place ?? null,
    methods: method ? { [method]: { practice: 0, fedUntil: 0 } } : {},
    activeMethods: { qi: method, body: null, soul: null },
    attributes: { agility: 10, fortune: 10, aptitude: opts.aptitude ?? 10 },
    qi: freshLadder(),
    body: freshLadder(),
    soul: freshLadder(),
    insight: { current: 0, earned: 0 },
    stones: opts.stones ?? 0,
    items: {},
    toxicity: 0,
    wheel: [...FRESH_WHEEL],
    routines: opts.routines ?? [],
    savedRoutines: [],
    plan: { auto: 'safe', burnStones: true },
    flags: opts.flags ?? [],
    nodes: [],
    manuals: [],
    techniques: Object.fromEntries(techniques.map((t) => [t, { practice: 0 }])),
    practicing: techniques[0] ?? null,
    contemplation: {},
    people: startingPeople(
      opts.origin ?? null,
      opts.bornDay + START_AGE * DAYS_PER_YEAR,
      opts.place ?? null,
    ),
  };
}

/** The people an origin path knows on testing day, met that day where the life begins. */
export function startingPeople(
  origin: Cultivator['origin'],
  day: number,
  place: string | null,
): Record<string, PersonRecord> {
  return Object.fromEntries(
    pathPeople(origin).knows.map((a) => [
      a.id,
      {
        met: day,
        place,
        bond: a.bond,
        regard: a.regard,
        realm: a.realm,
        where: person(a.id).home ?? place,
        heard: day,
        seen: day,
      },
    ]),
  );
}

/** An empty card feed, checked up to the given day. */
export function freshCards(day: number): CardsState {
  return { pending: [], drawn: {}, marks: {}, checked: Math.floor(day), nextUid: 1 };
}

/** A new event for the chronicle; the subject is the first actor. */
export function chronicleEvent(
  day: number,
  type: string,
  data: EventData,
  actors: string[],
  place: string | null,
): ChronicleEvent {
  return { day, type, actors, place, data: { ...data } };
}

/** The events a life opens with: coming of age, and testing day when there is an origin. */
function openingEvents(c: Cultivator, day: number, next: boolean): ChronicleEvent[] {
  const out = [chronicleEvent(day, 'birth', next ? { next: true } : {}, [c.id], c.place)];
  if (c.origin) {
    out.push(
      chronicleEvent(
        day,
        'testing',
        { origin: c.origin.id, choice: c.origin.choice },
        [c.id, ...Object.keys(c.people)],
        c.place,
      ),
    );
  }
  return out;
}

/** A fresh life at age 12, every ladder at Qi Condensation layer 1 with an empty bar. */
export function newLife(opts: NewLifeOptions): GameState {
  const mode = opts.mode ?? 'ironman';
  const seed = hashSeed(opts.seed ?? opts.name) | 0;
  const startDay = START_AGE * DAYS_PER_YEAR;
  const player = newCultivator(PLAYER_ID, { ...opts, bornDay: 0 });
  return {
    lineage: { id: opts.seed ?? opts.name, life: 1 },
    mode,
    calendar: { day: startDay },
    player,
    glass: { seed, fractures: 0, flares: 0 },
    clock: null,
    ended: null,
    chronicle: openingEvents(player, startDay, false),
    cards: freshCards(startDay),
    unlocks: Object.keys(player.techniques).length
      ? [...STARTING_UNLOCKS, 'techniques']
      : [...STARTING_UNLOCKS],
    rewindCharges: mode === 'gentle' ? 1 : 0,
    seed,
    rng: {},
  };
}

/**
 * The next life in the same slot after a death: the world's calendar runs on and the chronicle
 * stays, but nothing else carries over until rebirth arrives in M8.
 */
export function nextLife(prev: GameState, opts: NewLifeOptions): GameState {
  const fresh = newLife({ ...opts, mode: opts.mode ?? prev.mode });
  const day = prev.calendar.day;
  const bornDay = day - START_AGE * DAYS_PER_YEAR;
  const player = {
    ...fresh.player,
    bornDay,
    people: startingPeople(fresh.player.origin, day, fresh.player.place),
  };
  return {
    ...fresh,
    lineage: { id: prev.lineage.id, life: prev.lineage.life + 1 },
    player,
    calendar: { day },
    chronicle: [...prev.chronicle, ...openingEvents(player, day, true)],
    cards: freshCards(day),
  };
}

// ---------------------------------------------------------------- a cultivator's years

/** Age in years on a world day, fractional. */
export function ageYears(c: Cultivator, day: number): number {
  return (day - c.bornDay) / DAYS_PER_YEAR;
}

/** Days lived since root-testing day at 12, when play begins. */
export function daysLived(c: Cultivator, day: number): number {
  return day - c.bornDay - START_AGE * DAYS_PER_YEAR;
}

/** Lifespan in years: the qi realm's, plus bonuses, talents and tree nodes. */
export function lifespanYears(c: Cultivator): number {
  return realm(c.qi.realm).lifespan + c.lifespanBonus + stats(c).lifespan;
}

/** The world day the cultivator reaches their lifespan edge. */
export function lifespanEdgeDay(c: Cultivator): number {
  return c.bornDay + lifespanYears(c) * DAYS_PER_YEAR;
}

export function atLifespanEdge(s: GameState): boolean {
  return s.calendar.day >= lifespanEdgeDay(s.player);
}

// ---------------------------------------------------------------- items and flags

export function itemCount(c: Cultivator, id: string): number {
  return c.items[id] ?? 0;
}

/** A copy holding `n` more of the item (negative to use some up), never below zero. */
export function addItem(c: Cultivator, id: string, n: number): Cultivator {
  return { ...c, items: { ...c.items, [id]: Math.max(0, itemCount(c, id) + n) } };
}

export function hasFlag(c: Cultivator, flag: string): boolean {
  return c.flags.includes(flag);
}

/** A copy with the flag set. */
export function addFlag(c: Cultivator, flag: string): Cultivator {
  return hasFlag(c, flag) ? c : { ...c, flags: [...c.flags, flag] };
}

// ---------------------------------------------------------------- the game around the player

export function withPlayer(s: GameState, player: Cultivator): GameState {
  return { ...s, player };
}

export function hasUnlock(s: GameState, flag: string): boolean {
  return s.unlocks.includes(flag);
}

/** A copy with the screen flag set and, the first time, a chronicle event if `announce`. */
export function unlock(s: GameState, flag: string, announce = false): GameState {
  if (hasUnlock(s, flag)) return s;
  const next = { ...s, unlocks: [...s.unlocks, flag] };
  return announce ? addEvent(next, 'screen', { screen: flag }) : next;
}

/** Adds an event to the chronicle, dated today, with the player as its subject unless named. */
export function addEvent(
  s: GameState,
  type: string,
  data: EventData = {},
  actors: string[] = [s.player.id],
): GameState {
  const e = chronicleEvent(s.calendar.day, type, data, actors, s.player.place);
  return { ...s, chronicle: [...s.chronicle, e] };
}

/** Marks today under a name, for a later card's trigger. */
export function setMark(s: GameState, id: string): GameState {
  return { ...s, cards: { ...s.cards, marks: { ...s.cards.marks, [id]: s.calendar.day } } };
}

/**
 * Runs `use` on a named random stream and stores where it stopped. Each system draws from its
 * own stream, so one system's rolls never shift another's.
 */
export function withStream<T>(
  s: GameState,
  name: StreamName,
  use: (rng: Rng) => T,
): { value: T; state: GameState } {
  const rng = new Rng(s.rng[name] ?? streamSeed(s.seed, name));
  const value = use(rng);
  return { value, state: { ...s, rng: { ...s.rng, [name]: rng.state } } };
}

/**
 * Bookkeeping for any breakthrough: a major one refills gentle mode's rewind charge.
 * The breakthrough rules call this, and the session saves a rewind point after it.
 */
export function noteBreakthrough(s: GameState, major: boolean): GameState {
  if (major && s.mode === 'gentle' && s.rewindCharges < 1) {
    return { ...s, rewindCharges: 1 };
  }
  return s;
}

/**
 * A new pattern for the glass behind the life (Settings): the next seed in a fixed chain, so it
 * never touches a random stream. The season's weather follows the glass, so it changes too.
 */
export function rerollGlass(s: GameState): GameState {
  return { ...s, glass: { ...s.glass, seed: hashSeed(`glass:${s.glass.seed}`) | 0 } };
}
