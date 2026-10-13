// Links between screens: a screen asks for another, and the app shows it. The Trees screen also
// takes a target, a tree or the Manuals category and a manual to centre on, so the Character
// screen's manuals line and the Techniques screen's Arts open on the right graft.
import { create } from 'zustand';
import type { ScreenId } from './screens.ts';

/** Where the Trees screen opens: a tree id or 'manuals', and a manual's graft to centre on. */
export interface TreesTarget {
  pick: string;
  focus?: string;
}

interface NavStore {
  /** Counts up with every request, so the same request twice still moves. */
  seq: number;
  screen: ScreenId | null;
  trees: TreesTarget | null;
}

export const useNav = create<NavStore>()(() => ({ seq: 0, screen: null, trees: null }));

/** Shows a screen; the Trees screen opens on `trees` when given. */
export function go(screen: ScreenId, trees?: TreesTarget): void {
  useNav.setState((s) => ({ seq: s.seq + 1, screen, trees: trees ?? null }));
}

/** Opens the Trees screen on a manual: beside its host tree, or under Manuals when it has none. */
export function goToManual(id: string, host: string | null): void {
  go('trees', { pick: host ?? 'manuals', focus: id });
}
