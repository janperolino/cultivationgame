// The whole game state of one life, as plain data that saves, migrates and checks with Zod.
import { z } from 'zod';
import { REALM_IDS, realm } from '../content/realms.ts';
import { hashSeed } from './rng.ts';

/** The in-game calendar: twelve months of thirty days. */
export const DAYS_PER_YEAR = 360;
/** Play opens at age 12 on root-testing day (design § Character creation). */
export const START_AGE = 12;

const Ladder = z.object({
  realm: z.enum(REALM_IDS),
  /** Layer 1–9 at Qi Condensation, stage 1–4 above it. */
  stage: z.number().int().min(1),
  /** Fuel toward the next step: qi, tempering or nourishment. P1.2 sets how much each step needs. */
  bar: z.number().min(0),
});
export type Ladder = z.infer<typeof Ladder>;

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
  character: z.object({
    name: z.string(),
    pronouns: z.string(),
    look: z.string(),
    mode: z.enum(['ironman', 'gentle']),
    /** World day of birth. */
    bornDay: z.number(),
    /** Years added to the qi realm's lifespan by talents, pills and the like. */
    lifespanBonus: z.number(),
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
}

/** A fresh life at age 12, every ladder at Qi Condensation layer 1 with an empty bar. */
export function newLife(opts: NewLifeOptions): GameState {
  const mode = opts.mode ?? 'ironman';
  const seed = opts.seed ?? opts.name;
  const startDay = START_AGE * DAYS_PER_YEAR;
  const ladder = (): Ladder => ({ realm: 'qi-condensation', stage: 1, bar: 0 });
  return {
    lineage: { id: seed, life: 1 },
    character: {
      name: opts.name,
      pronouns: opts.pronouns ?? 'they/them',
      look: opts.look ?? '',
      mode,
      bornDay: 0,
      lifespanBonus: 0,
    },
    calendar: { day: startDay },
    qi: ladder(),
    body: ladder(),
    soul: ladder(),
    insight: { current: 0, earned: 0 },
    stones: 0,
    chronicle: [
      { day: startDay, kind: 'birth', text: `${opts.name} comes of age on root-testing day.` },
    ],
    unlocks: ['abode'],
    rewindCharges: mode === 'gentle' ? 1 : 0,
    rng: hashSeed(seed) | 0,
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

/**
 * Bookkeeping for any breakthrough: a major one refills gentle mode's rewind charge.
 * P1.2's breakthrough rules call this, and the session saves a rewind point after it.
 */
export function noteBreakthrough(s: GameState, major: boolean): GameState {
  if (major && s.character.mode === 'gentle' && s.rewindCharges < 1) {
    return { ...s, rewindCharges: 1 };
  }
  return s;
}
