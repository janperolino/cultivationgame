// Time: real milliseconds become in-game days at the qi realm's calendar speed.
// The loop ticks a few times a second while you play; on load it applies offline time, capped.
import { realm, REALMS, realmIndex, type RealmId } from '../content/realms.ts';
import type { Seat } from './attention.ts';
import { DAYS_PER_YEAR, lifespanEdgeDay, realmOf, type GameState } from './state.ts';

export const TICKS_PER_SECOND = 4;
export const TICK_MS = 1000 / TICKS_PER_SECOND;
/** Offline time counts for up to 12 real hours (an abode upgrade raises it later). */
export const OFFLINE_CAP_MS = 12 * 3_600_000;
/** Any realm's full lifespan lasts about this many real hours of play. */
export const REAL_HOURS_PER_LIFESPAN = 120;

const MS_PER_HOUR = 3_600_000;

/**
 * The realm whose calendar the life runs on: its own realm, or a slower one it has reached
 * and chosen (design § How the two halves connect, running the clock slower).
 */
export function clockRealm(s: GameState): RealmId {
  const own = realmOf(s.player);
  return s.clock && realmIndex(s.clock) < realmIndex(own) ? s.clock : own;
}

/** The calendar speeds a life can choose: every realm reached, slowest first. */
export function clockChoices(s: GameState): RealmId[] {
  return REALMS.slice(0, realmIndex(realmOf(s.player)) + 1).map((r) => r.id);
}

/** Runs the life at a reached realm's speed; its own realm (or null) follows the realm. */
export function setClock(s: GameState, id: RealmId | null): GameState {
  if (id !== null && !clockChoices(s).includes(id)) return s;
  const clock = id === null || id === realmOf(s.player) ? null : id;
  return clock === s.clock ? s : { ...s, clock };
}

/** In-game years per real hour of a realm's calendar: 1 at Qi Condensation, about 1.7 at Foundation. */
export function realmYearsPerHour(id: RealmId): number {
  return realm(id).lifespan / REAL_HOURS_PER_LIFESPAN;
}

/** In-game years per real hour on the life's clock: 1 at Qi Condensation, 4 at Core Formation. */
export function yearsPerRealHour(s: GameState): number {
  return realmYearsPerHour(clockRealm(s));
}

export function daysPerRealMs(s: GameState): number {
  return (yearsPerRealHour(s) * DAYS_PER_YEAR) / MS_PER_HOUR;
}

export interface StepContext {
  /** True while applying offline time: no major breakthroughs, minor ones on auto. */
  offline: boolean;
  /** The seat while you play: attended or away (core/attention.ts). Away when absent or offline. */
  seat?: Seat;
}

/**
 * What happens over a stretch of in-game days, at most one day at a time. The calendar has
 * already moved when it is called. core/life.ts's `cultivate` is the game's step.
 */
export type DayStep = (s: GameState, days: number, ctx: StepContext) => GameState;

const passTime: DayStep = (s) => s;

export interface AdvanceResult {
  state: GameState;
  /** In-game days that passed. */
  days: number;
  /** Real milliseconds that were used; less than asked when the life reached its edge. */
  usedMs: number;
  /** Time stopped at the lifespan edge. Death never comes from the clock alone. */
  atEdge: boolean;
}

/** Runs `realMs` of real time through the calendar, one in-game day or less per step. */
export function advance(
  s: GameState,
  realMs: number,
  opts: { step?: DayStep; offline?: boolean; seat?: Seat } = {},
): AdvanceResult {
  const step = opts.step ?? passTime;
  // Offline time is away by definition: going in or closing the tab never counts as attending.
  const offline = opts.offline ?? false;
  const ctx: StepContext = offline ? { offline } : { offline, seat: opts.seat };
  let state = s;
  let remaining = Math.max(0, realMs);
  let days = 0;

  while (remaining > 0) {
    // A life that has ended stands still until a new one begins.
    if (state.ended) break;
    const edge = lifespanEdgeDay(state.player);
    const room = edge - state.calendar.day;
    if (room <= 0) break;
    // Speed is read each step, so a breakthrough mid-run changes the clock from then on.
    const rate = daysPerRealMs(state);
    const chunkDays = Math.min(1, room, remaining * rate);
    const chunkMs = Math.min(remaining, chunkDays / rate);
    if (chunkDays <= 0 || chunkMs <= 0) break;
    const day = Math.min(edge, state.calendar.day + chunkDays);
    state = step({ ...state, calendar: { ...state.calendar, day } }, chunkDays, ctx);
    days += chunkDays;
    remaining -= chunkMs;
    // Float dust left by the division would otherwise run a whole extra step for nothing.
    if (remaining < 1e-6) remaining = 0;
  }

  return {
    state,
    days,
    usedMs: Math.max(0, realMs) - remaining,
    atEdge: state.calendar.day >= lifespanEdgeDay(state.player),
  };
}

export interface OfflineResult extends AdvanceResult {
  /** Real time since the last save. */
  awayMs: number;
  /** The part of it that counted, after the cap. */
  countedMs: number;
}

/** Real time away that counts: never negative (clock changes), at most the cap. */
export function offlineMs(savedAt: number, now: number, capMs = OFFLINE_CAP_MS): number {
  return Math.min(Math.max(0, now - savedAt), capMs);
}

/** Applies the time since `savedAt`, capped, as offline time. */
export function catchUp(
  s: GameState,
  savedAt: number,
  now: number,
  opts: { step?: DayStep; capMs?: number } = {},
): OfflineResult {
  const countedMs = offlineMs(savedAt, now, opts.capMs);
  const result = advance(s, countedMs, { step: opts.step, offline: true });
  return { ...result, awayMs: Math.max(0, now - savedAt), countedMs };
}
