// The seat while you play (design § Attended seclusion): the session's attention, kept apart from
// the game so focus is never saved and the figure can read it every frame without re-rendering
// the screens. You attend while the tab is visible and you have touched it in the last few
// minutes; the store's loop ticks it with the game and hands the seat to the day step.
import { create } from 'zustand';
import { ATTENDED_INPUT_MS } from '../content/attention.ts';
import {
  AWAY,
  catchAt,
  keepOrbStream,
  seatOf,
  setStill,
  startAttention,
  tickAttention,
  type Attention,
  type Breath,
  type Seat,
} from '../core/attention.ts';
import { firstBreath } from '../core/life.ts';
import { lifeKey, scenePlaying, useScene } from './scene.ts';
import type { GameState } from '../core/state.ts';
import { hourOfDay } from '../core/wheel.ts';

interface SeatStore {
  /** The life the attention belongs to, so a new life or slot starts a fresh seat. */
  key: string | null;
  attention: Attention | null;
}

export const useSeat = create<SeatStore>()(() => ({ key: null, attention: null }));

let lastInput = 0;
/** When the seat's clock last moved, in page time; the figure runs it on between ticks. */
let tickedAt = 0;
/** The game ticks four times a second; never run the clock on further than this past a tick. */
const MAX_LEAD_S = 0.5;
let abodeShown = 0;
const breathListeners = new Set<(b: Breath) => void>();

/** Every touch, key or wheel counts as being there. */
function noteInput() {
  lastInput = Date.now();
}

/** Listens for input once, so attending knows when you last touched the game. */
export function startSeatInput(): void {
  for (const type of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart']) {
    window.addEventListener(type, noteInput, { passive: true, capture: true });
  }
  noteInput();
}

/** Whether you attend now: the tab is visible and you touched it lately. */
export function attendingNow(now = Date.now()): boolean {
  const visible = typeof document === 'undefined' || document.visibilityState === 'visible';
  return visible && now - lastInput < ATTENDED_INPUT_MS;
}

/** The Abode's figure mounts and unmounts; orbs come only while it is on screen. */
export function showAbode(on: boolean): void {
  abodeShown = Math.max(0, abodeShown + (on ? 1 : -1));
}

/** The attention for this life, started fresh when the life changes. */
function attentionFor(s: GameState): Attention {
  const { key, attention } = useSeat.getState();
  if (attention && key === lifeKey(s) && attention.who === s.player.id) return attention;
  const fresh = startAttention(s);
  useSeat.setState({ key: lifeKey(s), attention: fresh });
  return fresh;
}

/**
 * Moves the seat on by `dt` real seconds and returns the seat the day step reads, with the game's
 * orbs stream brought up to date. A life that has ended sits away.
 */
export function tickSeat(s: GameState, dt: number): { seat: Seat; state: GameState } {
  const playing = scenePlaying();
  const attended = !s.ended && attendingNow();
  const atFigure = abodeShown > 0 && !s.ended;
  // No new orbs come while a breakthrough scene holds the figure.
  const a = tickAttention(attentionFor(s), s.player, dt, {
    attended,
    abode: atFigure && !playing,
    hour: hourOfDay(s.calendar.day),
  });
  tickedAt = performance.now();
  useSeat.setState({ attention: a });
  if (s.ended) return { seat: AWAY, state: keepOrbStream(s, a) };
  const seat = seatOf(a, s.player);
  const scene = playing ? 'playing' : attended && atFigure ? 'ready' : undefined;
  const sceneLadder = playing ? useScene.getState().play?.ladder : undefined;
  return {
    seat: scene ? { ...seat, scene, ...(sceneLadder ? { sceneLadder } : {}) } : seat,
    state: keepOrbStream(s, a),
  };
}

/** A catch's result: the seat, the figure's animation, and the first catch's chronicle line. */
function apply(s: GameState, r: Breath): GameState {
  useSeat.setState({ attention: r.attention });
  for (const listen of breathListeners) listen(r);
  return r.caught.length && !r.wasted ? firstBreath(s) : s;
}

/**
 * The seat's clock now, in session seconds: the last tick's, run on by the page time since, so
 * orbs move smoothly every frame rather than in the loop's quarter-second steps.
 */
export function seatTime(a: Attention, now = performance.now()): number {
  return a.t + Math.min(MAX_LEAD_S, Math.max(0, (now - tickedAt) / 1000));
}

/** The world day the figure last saw, when, and how fast it was moving, in days a second. */
let dayAt = { day: 0, at: 0, perSecond: 0 };

/** The figure notes each new world day, so the sun can run on smoothly between ticks. */
export function noteDay(day: number, now = performance.now()): void {
  if (day === dayAt.day) return;
  const dd = day - dayAt.day;
  const dt = (now - dayAt.at) / 1000;
  // A jump (a new life, a rewind, offline time) or a long stall moves the sun without running it on.
  const perSecond = dd > 0 && dd < 1 && dt > 0 && dt < 2 ? dd / dt : 0;
  dayAt = { day, at: now, perSecond };
}

/** The world day now, for the sun: the last day seen, run on for at most half a second. */
export function sunDay(now = performance.now()): number {
  return dayAt.day + dayAt.perSecond * Math.min(MAX_LEAD_S, Math.max(0, (now - dayAt.at) / 1000));
}

/** The pointer or a finger passes (x, y) in figure units; `inPlace` when orbs are drawn still. */
export function catchNow(s: GameState, x: number, y: number, inPlace: boolean): GameState {
  const a = attentionFor(s);
  if (!a.orbs.length) return s;
  // Catch where the orbs are drawn now, then hand the clock back to the loop.
  const r0 = catchAt({ ...a, t: seatTime(a) }, s.player, x, y, inPlace);
  const r = { ...r0, attention: { ...r0.attention, t: a.t } };
  return r.caught.length ? apply(s, r) : s;
}

/** Resting the pointer on the dantian. */
export function holdStill(s: GameState, still: boolean): void {
  const a = useSeat.getState().attention;
  if (a && a.who === s.player.id) useSeat.setState({ attention: setStill(a, still) });
}

/** The figure listens for breaths to draw the caught orbs flying in. */
export function onBreath(listen: (b: Breath) => void): () => void {
  breathListeners.add(listen);
  return () => breathListeners.delete(listen);
}
