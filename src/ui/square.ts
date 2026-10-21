// The square (design § Story cards and events, The square; docs/mockups/card-popout-study.html;
// built in F1): a card or an encounter read in one square popped out over Cultivate or the Map.
// Where it waits it shows as a stub with Open; only what you can't avoid pops up by itself, an
// urgent card or an encounter that has stopped your road, and Later puts it back as a stub. Like
// the scene, the square is the session's and never saved.
import { create } from 'zustand';
import { card } from '../content/cards/index.ts';
import type { GameState } from '../core/state.ts';
import { cue } from './cues.ts';
import { riseGains, type Delta } from './feel.ts';

/** What the square holds: the card that waits first, or one that won't wait; or one encounter. */
export type SquareOpen = { kind: 'card'; uid?: number } | { kind: 'encounter'; id: string };

/** An encounter's outcome, read in the square until Go on. */
export interface SquareResult {
  title: string;
  text: string;
  gains: Delta[];
}

interface SquareStore {
  open: SquareOpen | null;
  result: SquareResult | null;
  /** What has popped up by itself or been put back, so it never pops twice: `card:uid`, `enc:id`. */
  popped: string[];
  /** The encounters the Map has shown, so its glyph's alert goes out. */
  seen: string[];
  /** What the choices read in the square gave and took, rising by the figure once it closes. */
  carried: Delta[];
}

export const useSquare = create<SquareStore>()(() => ({
  open: null,
  result: null,
  popped: [],
  seen: [],
  carried: [],
}));

export function openSquare(open: SquareOpen): void {
  if (!useSquare.getState().open) cue('ui-open');
  useSquare.setState((s) => ({ open, result: null, popped: addKey(s.popped, keyOf(open)) }));
}

/** Go on, Later, or a fight taking the stage: the square closes; what waits shows as a stub. */
export function closeSquare(): void {
  const { carried, open } = useSquare.getState();
  if (open) cue('ui-close');
  useSquare.setState({ open: null, result: null, carried: [] });
  riseGains(carried);
}

/** An outcome read: its changes wait to rise until the square closes, past a card's next steps. */
export function carryGains(ds: readonly Delta[]): void {
  if (ds.length > 0) useSquare.setState((s) => ({ carried: [...s.carried, ...ds] }));
}

export function showResult(result: SquareResult): void {
  useSquare.setState({ result });
}

/** The Map was looked at: the road's encounters there now are seen. */
export function seeEncounters(ids: readonly string[]): void {
  useSquare.setState((s) =>
    ids.every((id) => s.seen.includes(id)) ? s : { seen: [...new Set([...s.seen, ...ids])] },
  );
}

/** Another life or slot opened: the square forgets the last one's. */
export function clearSquare(): void {
  useSquare.setState({ open: null, result: null, popped: [], seen: [], carried: [] });
}

function keyOf(open: SquareOpen): string | null {
  return open.kind === 'encounter' ? `enc:${open.id}` : null;
}

function addKey(keys: string[], key: string | null): string[] {
  return key && !keys.includes(key) ? [...keys, key] : keys;
}

/**
 * What pops up by itself now, or null: an encounter that has stopped your road, then an urgent
 * card, the first of either not popped before; the square opens on that one.
 */
export function popNow(
  s: GameState,
  popped: readonly string[],
): { open: SquareOpen; key: string } | null {
  if (s.ended || s.fight) return null;
  const enc = s.map?.encounters.find(
    (e) => e.state === 'waiting' && !popped.includes(`enc:${e.id}`),
  );
  if (enc) return { open: { kind: 'encounter', id: enc.id }, key: `enc:${enc.id}` };
  const urgent = s.cards.pending.find(
    (p) => card(p.card).urgent && !popped.includes(`card:${p.uid}`),
  );
  if (urgent) return { open: { kind: 'card', uid: urgent.uid }, key: `card:${urgent.uid}` };
  return null;
}

/** Pops what `popNow` names, marking it popped. */
export function popUp(s: GameState): boolean {
  const st = useSquare.getState();
  if (st.open) return false;
  const p = popNow(s, st.popped);
  if (!p) return false;
  useSquare.setState({ open: p.open, result: null, popped: addKey(st.popped, p.key) });
  return true;
}

/** The encounters on the road not yet seen on the Map: its glyph glows while there are any. */
export function unseenEncounters(s: GameState, seen: readonly string[]): string[] {
  return (s.map?.encounters ?? []).filter((e) => !seen.includes(e.id)).map((e) => e.id);
}
