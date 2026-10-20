// Sitting at the bench (design § Professions, Crafts, thin, the hands-on version; K3): the session's
// steady hand, kept apart from the game like the seat's focus, so it is never saved and starts at
// zero on load. While you sit at the furnace and attend, the store's loop hands it to the day step
// (ui/seat.ts), and every batch reads its mean over its hours; standing up, leaving the page or
// going away hands none, and the furnace runs itself.
import { create } from 'zustand';

interface FurnaceStore {
  /** You sit at the furnace on the Crafts page. */
  sitting: boolean;
  /** The steady hand, 0 to 1, as the minigame keeps it. */
  hand: number;
  /** The recipe you sat down to, played on if the bench empties while you sit. */
  recipe: string | null;
}

export const useFurnace = create<FurnaceStore>()(() => ({
  sitting: false,
  hand: 0,
  recipe: null,
}));

/** Sits down at the furnace for the batch at its front: the hand starts from nothing. */
export function sitDown(recipe: string): void {
  useFurnace.setState({ sitting: true, hand: 0, recipe });
}

/** Stands up: no hand from here on. */
export function standUp(): void {
  useFurnace.setState({ sitting: false, hand: 0, recipe: null });
}

/** The minigame sets the hand as it plays. */
export function setHand(hand: number): void {
  useFurnace.setState({ hand: Math.max(0, Math.min(1, hand)) });
}

/** The hand the day step reads now: the store's while you sit and attend, else none. */
export function handNow(attended: boolean): number | undefined {
  const { sitting, hand } = useFurnace.getState();
  return sitting && attended ? hand : undefined;
}
