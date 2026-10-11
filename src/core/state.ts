// The whole game state of one life, as plain data that saves, migrates and checks with Zod.
import { z } from 'zod';
import { AUTO_IDS, DEFAULT_SHARES, GRADE_IDS } from '../content/cultivation.ts';
import { REALM_IDS, realm } from '../content/realms.ts';
import { ROOT_IDS, type RootId } from '../content/roots.ts';
import { hashSeed } from './rng.ts';

/** The in-game calendar: twelve months of thirty days. */
export const DAYS_PER_YEAR = 360;
/** Play opens at age 12 on root-testing day (design § Character creation). */
export const START_AGE = 12;

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

const ChronicleEntry = z.object({
  /** World day the entry happened on. */
  day: z.number(),
  kind: z.string(),
  text: z.string(),
});
export type ChronicleEntry = z.infer<typeof ChronicleEntry>;

const share = z.number().min(0);

export const GameStateSchema = z.object({
  lineage: z.object({
    id: z.string(),
    /** 1 for the first life; rebirth (M8) counts up. */
    life: z.number().int().min(1),
  }),
  character: z.object({
    name: z.string(),
    pronouns: z.string(),
    look: z.string(),
    mode: z.enum(['ironman', 'gentle']),
    /** World day of birth. */
    bornDay: z.number(),
    /** Years added to the qi realm's lifespan by talents, pills and the like. */
    lifespanBonus: z.number(),
    root: z.enum(ROOT_IDS),
    /** The cultivation method's id (content/methods.ts); null before you have one. */
    method: z.string().nullable(),
  }),
  /** The three attributes that come from birth (design § Combat); talents move them in P1.4. */
  attributes: z.object({
    agility: z.number(),
    fortune: z.number(),
    aptitude: z.number(),
  }),
  calendar: z.object({
    /** World days since the lineage began, fractional while time runs. */
    day: z.number().min(0),
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
  /** How seclusion days are split, and when minor breakthroughs happen on their own. */
  plan: z.object({
    /** Percent weights, shared among whichever slots are open. */
    shares: z.object({ qi: share, body: share, soul: share, study: share, practice: share }),
    auto: z.enum(AUTO_IDS),
    /** Burn spirit stones as fuel on qi days. */
    burnStones: z.boolean(),
  }),
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
  /** Unlock flags, so screens appear as they're reached. */
  unlocks: z.array(z.string()),
  /** Gentle mode's rewind charge: 1 when a rewind is available. Always 0 in ironman. */
  rewindCharges: z.number().int().min(0).max(1),
  /** The seeded generator's state, so a reload continues the same sequence. */
  rng: z.number().int(),
});
export type GameState = z.infer<typeof GameStateSchema>;

export interface NewLifeOptions {
  name: string;
  pronouns?: string;
  look?: string;
  mode?: 'ironman' | 'gentle';
  /** Seeds the generator; defaults to the name. */
  seed?: string;
  /** Until character creation (P1.4), a true root on the garrison's standard method. */
  root?: RootId;
  method?: string | null;
  aptitude?: number;
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

/** The unlocks a life starts with: the abode, the Cultivate screen and, with a method, qi days. */
export function startingUnlocks(method: string | null): string[] {
  return method ? ['abode', 'cultivate', 'seclusion-qi'] : ['abode', 'cultivate'];
}

/** A fresh life at age 12, every ladder at Qi Condensation layer 1 with an empty bar. */
export function newLife(opts: NewLifeOptions): GameState {
  const mode = opts.mode ?? 'ironman';
  const seed = opts.seed ?? opts.name;
  const startDay = START_AGE * DAYS_PER_YEAR;
  const method = opts.method === undefined ? 'garrison-standard' : opts.method;
  const rng = hashSeed(seed) | 0;
  return {
    lineage: { id: seed, life: 1 },
    character: {
      name: opts.name,
      pronouns: opts.pronouns ?? 'they/them',
      look: opts.look ?? '',
      mode,
      bornDay: 0,
      lifespanBonus: 0,
      root: opts.root ?? 'true',
      method,
    },
    attributes: { agility: 10, fortune: 10, aptitude: opts.aptitude ?? 10 },
    calendar: { day: startDay },
    qi: freshLadder(),
    body: freshLadder(),
    soul: freshLadder(),
    insight: { current: 0, earned: 0 },
    stones: 0,
    items: {},
    plan: { shares: { ...DEFAULT_SHARES }, auto: 'safe', burnStones: true },
    glass: { seed: rng, fractures: 0, flares: 0 },
    ended: null,
    chronicle: [
      { day: startDay, kind: 'birth', text: `${opts.name} comes of age on root-testing day.` },
    ],
    unlocks: startingUnlocks(method),
    rewindCharges: mode === 'gentle' ? 1 : 0,
    rng,
  };
}

/**
 * The next life in the same slot after a death: the world's calendar runs on and the chronicle
 * stays, but nothing else carries over until rebirth arrives in M8.
 */
export function nextLife(prev: GameState, opts: NewLifeOptions): GameState {
  const fresh = newLife({ ...opts, mode: opts.mode ?? prev.character.mode });
  const day = prev.calendar.day;
  const bornDay = day - START_AGE * DAYS_PER_YEAR;
  return {
    ...fresh,
    lineage: { id: prev.lineage.id, life: prev.lineage.life + 1 },
    character: { ...fresh.character, bornDay },
    calendar: { day },
    chronicle: [
      ...prev.chronicle,
      { day, kind: 'birth', text: `A new life: ${opts.name} comes of age on root-testing day.` },
    ],
  };
}

/** Age in years, fractional. */
export function ageYears(s: GameState): number {
  return (s.calendar.day - s.character.bornDay) / DAYS_PER_YEAR;
}

/** Lifespan in years: the qi realm's, plus any bonus. */
export function lifespanYears(s: GameState): number {
  return realm(s.qi.realm).lifespan + s.character.lifespanBonus;
}

/** The world day the life reaches its lifespan edge. */
export function lifespanEdgeDay(s: GameState): number {
  return s.character.bornDay + lifespanYears(s) * DAYS_PER_YEAR;
}

export function atLifespanEdge(s: GameState): boolean {
  return s.calendar.day >= lifespanEdgeDay(s);
}

export function hasUnlock(s: GameState, flag: string): boolean {
  return s.unlocks.includes(flag);
}

/** A copy with the flag set and, the first time, a chronicle line. */
export function unlock(s: GameState, flag: string, text?: string): GameState {
  if (hasUnlock(s, flag)) return s;
  const next = { ...s, unlocks: [...s.unlocks, flag] };
  return text ? addChronicle(next, 'unlock', text) : next;
}

export function addChronicle(s: GameState, kind: string, text: string): GameState {
  return { ...s, chronicle: [...s.chronicle, { day: s.calendar.day, kind, text }] };
}

export function itemCount(s: GameState, id: string): number {
  return s.items[id] ?? 0;
}

/** A copy holding `n` more of the item (negative to use some up), never below zero. */
export function addItem(s: GameState, id: string, n: number): GameState {
  return { ...s, items: { ...s.items, [id]: Math.max(0, itemCount(s, id) + n) } };
}

/**
 * Bookkeeping for any breakthrough: a major one refills gentle mode's rewind charge.
 * The breakthrough rules call this, and the session saves a rewind point after it.
 */
export function noteBreakthrough(s: GameState, major: boolean): GameState {
  if (major && s.character.mode === 'gentle' && s.rewindCharges < 1) {
    return { ...s, rewindCharges: 1 };
  }
  return s;
}
