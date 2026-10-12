// The seat while you play (design § Attended seclusion): the session's attention, kept apart from
// the game so focus is never saved and the figure can read it every frame without re-rendering
// the screens. You attend while the tab is visible and you have touched it in the last few
// minutes; the store's loop ticks it with the game and hands the seat to the day step.
import { create } from 'zustand';
import { ATTENDED_INPUT_MS } from '../content/attention.ts';
import {
  AWAY,
  breathe,
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
import type { GameState } from '../core/state.ts';
import { hourOfDay } from '../core/wheel.ts';

interface SeatStore {
  /** The life the attention belongs to, so a new life or slot starts a fresh seat. */
  key: string | null;
  attention: Attention | null;
}

export const useSeat = create<SeatStore>()(() => ({ key: null, attention: null }));

let lastInput = 0;
let abodeShown = 0;
const breathListeners = new Set<(b: Breath) => void>();

const lifeKey = (s: GameState) => `${s.lineage.id}/${s.lineage.life}/${s.seed}`;

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
  const a = tickAttention(attentionFor(s), s.player, dt, {
    attended: !s.ended && attendingNow(),
    abode: abodeShown > 0 && !s.ended,
    hour: hourOfDay(s.calendar.day),
  });
  useSeat.setState({ attention: a });
  return { seat: s.ended ? AWAY : seatOf(a, s.player), state: keepOrbStream(s, a) };
}

function apply(s: GameState, r: Breath): GameState {
  useSeat.setState({ attention: r.attention });
  for (const listen of breathListeners) listen(r);
  return r.caught.length && !r.wasted ? firstBreath(s) : s;
}

/** The player presses breathe; returns the game, with the first catch's chronicle line. */
export function breatheNow(s: GameState): GameState {
  noteInput();
  return apply(s, breathe(attentionFor(s), s.player));
}

/** The pointer or a finger passes (x, y) in figure units; `inPlace` when orbs are drawn still. */
export function catchNow(s: GameState, x: number, y: number, inPlace: boolean): GameState {
  const a = attentionFor(s);
  if (!a.orbs.length) return s;
  const r = catchAt(a, s.player, x, y, inPlace);
  return r.caught.length ? apply(s, r) : s;
}

/** Resting on the dantian, or holding breathe. */
export function holdStill(s: GameState, still: boolean): void {
  const a = useSeat.getState().attention;
  if (a && a.who === s.player.id) useSeat.setState({ attention: setStill(a, still) });
}

/** The figure listens for breaths to draw the caught orbs flying in. */
export function onBreath(listen: (b: Breath) => void): () => void {
  breathListeners.add(listen);
  return () => breathListeners.delete(listen);
}
