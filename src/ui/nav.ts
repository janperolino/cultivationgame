// Links between screens: a screen asks for another, and the app shows it. The Trees screen also
// takes a target, a tree or the Manuals category and a manual to centre on, so the Character
// screen's manuals line and Routine › Practice's Arts open on the right graft; the Routine
// screen takes a tab, or a wheel and an hour on it, and Practice and the Bag a thing to select, so
// a toast lands on what it names.
import { create } from 'zustand';
import type { ScreenId } from './screens.ts';

/** Routine's three tabs, one per kind of work (design § UI and screens, the Routine row). */
export type RoutineTab = 'day' | 'practice' | 'study';

/** Where Routine's Day tab opens: on the home or the road wheel, with an hour picked. */
export interface WheelTarget {
  road: boolean;
  hour: number;
}

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
  /** The Routine tab to open on arrival. */
  tab: RoutineTab | null;
  /** The wheel and hour Routine's Day tab opens on. */
  wheel: WheelTarget | null;
}

export const useNav = create<NavStore>()(() => ({
  seq: 0,
  screen: null,
  trees: null,
  select: null,
  tab: null,
  wheel: null,
}));

/**
 * Shows a screen; the Trees screen opens on `trees` when given, `select` picks a thing, and
 * Routine opens on `tab`.
 */
export function go(screen: ScreenId, trees?: TreesTarget, select?: string, tab?: RoutineTab): void {
  useNav.setState((s) => ({
    seq: s.seq + 1,
    screen,
    trees: trees ?? null,
    select: select ?? null,
    tab: tab ?? null,
    wheel: null,
  }));
}

/** Opens a Routine tab, with a technique selected on Practice. */
export function goToTab(tab: RoutineTab, select?: string): void {
  go('routine', undefined, select, tab);
}

/** Opens Routine's Day tab on a wheel, home or road, with that hour picked (the Map bar's wheel). */
export function goToWheel(road: boolean, hour: number): void {
  useNav.setState((s) => ({
    seq: s.seq + 1,
    screen: 'routine',
    trees: null,
    select: null,
    tab: 'day',
    wheel: { road, hour },
  }));
}

/** Opens the Trees screen on a manual: beside its host tree, or under Manuals when it has none. */
export function goToManual(id: string, host: string | null): void {
  go('trees', { pick: host ?? 'manuals', focus: id });
}
