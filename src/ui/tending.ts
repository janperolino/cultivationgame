// Sitting at a plot (K8; design § Spirit farming, tending): the session's tending hand, kept apart
// from the game like the furnace's, so it is never saved and starts at nothing each time you sit.
// Standing up hands the sitting's hand to every sown bed of the plot (core/farming.ts `tendPlot`),
// once the sitting has run long enough to count; leaving the page stands you up.
import { create } from 'zustand';

/** A sitting counts once it has run this long, in seconds: a knot or two risen and dealt with. */
export const SITTING_COUNTS = 10;

interface TendingStore {
  /** The plot you sit at, or null. */
  plot: string | null;
  hand: number;
  /** Seconds sat this sitting. */
  t: number;
}

export const useTending = create<TendingStore>()(() => ({ plot: null, hand: 0, t: 0 }));

export function sitAtPlot(plot: string): void {
  useTending.setState({ plot, hand: 0, t: 0 });
}

/** The scene keeps the hand and the time sat as it plays. */
export function setTending(hand: number, t: number): void {
  useTending.setState({ hand: Math.max(0, Math.min(1, hand)), t });
}

/** Stands up from the plot: the sitting's hand, if it counts, and nothing sat from here. */
export function leavePlot(): { plot: string; hand: number } | null {
  const { plot, hand, t } = useTending.getState();
  useTending.setState({ plot: null, hand: 0, t: 0 });
  return plot && t >= SITTING_COUNTS ? { plot, hand } : null;
}
