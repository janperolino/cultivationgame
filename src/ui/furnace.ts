// Sitting at the bench (design § Professions, Crafts, thin, the hands-on version; K3): the session's
// steady hand, kept apart from the game like the seat's focus, so it is never saved and starts at
// zero on load. While you sit at the furnace and attend, the store's loop hands it to the day step
// (ui/seat.ts), and every batch reads its mean over its hours; standing up, leaving the page or
// going away hands none, and the furnace runs itself. The forge's tempering (K4) sits the same way.
import { create } from 'zustand';
import type { CraftId } from '../content/crafts.ts';

interface FurnaceStore {
  /** You sit at the furnace on the Crafts page. */
  sitting: boolean;
  /** The steady hand, 0 to 1, as the minigame keeps it. */
  hand: number;
  /** The recipe you sat down to, played on if the bench empties while you sit. */
  recipe: string | null;
  /** The craft you sat down at: the furnace or the forge. */
  craft: CraftId | null;
  /** Whether the sitting feeds your own bench: the guild's exam keeps its hand to itself. */
  bench: boolean;
}

export const useFurnace = create<FurnaceStore>()(() => ({
  sitting: false,
  hand: 0,
  recipe: null,
  craft: null,
  bench: false,
}));

/** Sits down at the furnace or the forge for the work at its front: the hand starts from nothing. */
export function sitDown(
  recipe: string,
  craft: CraftId = 'alchemy',
  o: { bench?: boolean } = {},
): void {
  useFurnace.setState({ sitting: true, hand: 0, recipe, craft, bench: o.bench ?? true });
}

/** Stands up: no hand from here on. */
export function standUp(): void {
  useFurnace.setState({ sitting: false, hand: 0, recipe: null, craft: null, bench: false });
}

/** The minigame sets the hand as it plays. */
export function setHand(hand: number): void {
  useFurnace.setState({ hand: Math.max(0, Math.min(1, hand)) });
}

/**
 * The hand the day step reads now: the store's while you sit at your bench and attend, else none.
 * An exam's sitting is the examiners', never your bench's (review 2026-10-21).
 */
export function handNow(attended: boolean): number | undefined {
  const { sitting, hand, bench } = useFurnace.getState();
  return sitting && bench && attended ? hand : undefined;
}
