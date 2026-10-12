// The whole game state of one life, as plain data that saves, migrates and checks with Zod.
// What belongs to a cultivator (ladders, insight, attributes, root, methods, the day wheel, items,
// nodes and techniques) lives in a `Cultivator`, so NPCs and co-op guests later run on the same
// rules.
import { z } from 'zod';
import { AUTO_IDS, GRADE_IDS } from '../content/cultivation.ts';
import { ELEMENTS, type Element } from '../content/elements.ts';
import { FRESH_WHEEL, HOUR_KIND_IDS, HOURS_PER_DAY } from '../content/hours.ts';
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
});
export type Ladder = z.infer<typeof Ladder>;

/** Twelve hours, from 子 round to 亥, each given to one kind of work (content/hours.ts). */
const Wheel = z.array(z.enum(HOUR_KIND_IDS)).length(HOURS_PER_DAY);

const activeMethod = z.string().nullable();

export const CultivatorSchema = z.object({
  id: z.string(),
  name: z.string(),
  pronouns: z.string(),
  look: z.string(),
  /** World day of birth. */
  bornDay: z.number(),
  /** Years added to the qi realm's lifespan by talents, pills and the like. */
  lifespanBonus: z.number(),
  root: z.enum(ROOT_IDS),
  /** The elements the root holds; the element hours read them. */
  rootElements: z.array(z.enum(ELEMENTS)),
  /** Methods known, by id (content/methods.ts): qi methods, tempering and nourishing arts. */
  methods: z.array(z.string()),
  /** The method each ladder climbs with; a ladder gains nothing from its hours without one. */
  activeMethods: z.object({ qi: activeMethod, body: activeMethod, soul: activeMethod }),
  /** The three attributes that come from birth (design § Combat); talents move them in P1.7. */
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
  /** Milestones the rules have passed: kinds of hour opened, sleep freed, gates reached. */
  flags: z.array(z.string()),
  /** Tree nodes learned, in the order they were learned. */
  nodes: z.array(z.string()),
  /** Techniques known, with the practice days put into each. */
  techniques: z.record(z.string(), z.object({ practice: z.number().min(0) })),
  /** The technique practice days go to, or null. */
  practicing: z.string().nullable(),
});
export type Cultivator = z.infer<typeof CultivatorSchema>;

const ChronicleEntry = z.object({
  /** World day the entry happened on. */
  day: z.number(),
  kind: z.string(),
  text: z.string(),
});
export type ChronicleEntry = z.infer<typeof ChronicleEntry>;

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
  /** Set when the life is over; the slot keeps the chronicle and offers a new life. */
  ended: z.object({ day: z.number(), cause: z.string() }).nullable(),
  chronicle: z.array(ChronicleEntry),
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
  /** Until character creation (P1.7), a true root on the garrison's standard method. */
  root?: RootId;
  /** The root's elements; until P1.7 rolls them, the root's defaults. */
  elements?: Element[];
  /** The qi method; null for the refusals that start without one. */
  method?: string | null;
  /** Routines known from the start; P1.7 hands the origin's over at creation. */
  routines?: string[];
  aptitude?: number;
  /** Techniques known from the start; P1.7 hands the first one over at creation. */
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
  };
}

/** The screens a life starts with. */
export const STARTING_UNLOCKS = ['abode', 'cultivate'];

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
    methods: method ? [method] : [],
    activeMethods: { qi: method, body: null, soul: null },
    attributes: { agility: 10, fortune: 10, aptitude: opts.aptitude ?? 10 },
    qi: freshLadder(),
    body: freshLadder(),
    soul: freshLadder(),
    insight: { current: 0, earned: 0 },
    stones: 0,
    items: {},
    wheel: [...FRESH_WHEEL],
    routines: opts.routines ?? [],
    savedRoutines: [],
    plan: { auto: 'safe', burnStones: true },
    flags: [],
    nodes: [],
    techniques: Object.fromEntries(techniques.map((t) => [t, { practice: 0 }])),
    practicing: techniques[0] ?? null,
  };
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
    ended: null,
    chronicle: [
      { day: startDay, kind: 'birth', text: `${opts.name} comes of age on root-testing day.` },
    ],
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
  return {
    ...fresh,
    lineage: { id: prev.lineage.id, life: prev.lineage.life + 1 },
    player: { ...fresh.player, bornDay },
    calendar: { day },
    chronicle: [
      ...prev.chronicle,
      { day, kind: 'birth', text: `A new life: ${opts.name} comes of age on root-testing day.` },
    ],
  };
}

// ---------------------------------------------------------------- a cultivator's years

/** Age in years on a world day, fractional. */
export function ageYears(c: Cultivator, day: number): number {
  return (day - c.bornDay) / DAYS_PER_YEAR;
}

/** Lifespan in years: the qi realm's, plus bonuses and tree nodes. */
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

// ---------------------------------------------------------------- items

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

// ---------------------------------------------------------------- the game around the player

export function withPlayer(s: GameState, player: Cultivator): GameState {
  return { ...s, player };
}

export function hasUnlock(s: GameState, flag: string): boolean {
  return s.unlocks.includes(flag);
}

/** A copy with the screen flag set and, the first time, a chronicle line. */
export function unlock(s: GameState, flag: string, text?: string): GameState {
  if (hasUnlock(s, flag)) return s;
  const next = { ...s, unlocks: [...s.unlocks, flag] };
  return text ? addChronicle(next, 'unlock', text) : next;
}

export function addChronicle(s: GameState, kind: string, text: string): GameState {
  return { ...s, chronicle: [...s.chronicle, { day: s.calendar.day, kind, text }] };
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
