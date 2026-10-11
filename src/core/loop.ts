// Time: real milliseconds become in-game days at the qi realm's calendar speed.
// The loop ticks a few times a second while you play; on load it applies offline time, capped.
import { realm } from '../content/realms.ts';
import { DAYS_PER_YEAR, lifespanEdgeDay, type GameState } from './state.ts';

export const TICKS_PER_SECOND = 4;
export const TICK_MS = 1000 / TICKS_PER_SECOND;
/** Offline time counts for up to 12 real hours (an abode upgrade raises it later). */
export const OFFLINE_CAP_MS = 12 * 3_600_000;
/** Any realm's full lifespan lasts about this many real hours of play. */
export const REAL_HOURS_PER_LIFESPAN = 120;

const MS_PER_HOUR = 3_600_000;

/** In-game years per real hour: 1 at Qi Condensation, about 1.7 at Foundation, 4 at Core Formation. */
export function yearsPerRealHour(s: GameState): number {
  return realm(s.player.qi.realm).lifespan / REAL_HOURS_PER_LIFESPAN;
}

export function daysPerRealMs(s: GameState): number {
  return (yearsPerRealHour(s) * DAYS_PER_YEAR) / MS_PER_HOUR;
}

export interface StepContext {
  /** True while applying offline time: no major breakthroughs, minor ones on auto. */
  offline: boolean;
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
  opts: { step?: DayStep; offline?: boolean } = {},
): AdvanceResult {
  const step = opts.step ?? passTime;
  const ctx: StepContext = { offline: opts.offline ?? false };
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
