// Links between screens: a screen asks for another, and the app shows it. The Trees screen also
// takes a target, a tree or the Manuals category and a manual to centre on, so the Character
// screen's manuals line and Cultivate › Practice's Arts open on the right graft; the Cultivate
// screen takes a tab, and Practice and the Bag a thing to select, so a toast lands on what it names.
import { create } from 'zustand';
import type { ScreenId } from './screens.ts';

/** Cultivate's three tabs, one per kind of work (design § UI and screens, the Cultivate row). */
export type CultivateTab = 'cultivation' | 'practice' | 'study';

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
  /** A technique or an item to select on arrival. */
  select: string | null;
  /** The Cultivate tab to open on arrival. */
  tab: CultivateTab | null;
}

export const useNav = create<NavStore>()(() => ({
  seq: 0,
  screen: null,
  trees: null,
  select: null,
  tab: null,
}));

/**
 * Shows a screen; the Trees screen opens on `trees` when given, `select` picks a thing, and
 * Cultivate opens on `tab`.
 */
export function go(
  screen: ScreenId,
  trees?: TreesTarget,
  select?: string,
  tab?: CultivateTab,
): void {
  useNav.setState((s) => ({
    seq: s.seq + 1,
    screen,
    trees: trees ?? null,
    select: select ?? null,
    tab: tab ?? null,
  }));
}

/** Opens a Cultivate tab, with a technique selected on Practice. */
export function goToTab(tab: CultivateTab, select?: string): void {
  go('cultivate', undefined, select, tab);
}

/** Opens the Trees screen on a manual: beside its host tree, or under Manuals when it has none. */
export function goToManual(id: string, host: string | null): void {
  go('trees', { pick: host ?? 'manuals', focus: id });
}
