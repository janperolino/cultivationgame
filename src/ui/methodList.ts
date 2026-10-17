// The methods known for a ladder, as Climb with lists them (A4): a line's later chapters right
// under the earlier, lines rarest first and ties in the order learned, searched and filtered by
// tier once the list is long. Kept apart from the screen so the order is tested.
import { rarityRank } from '../content/rarity.ts';
import type { Method } from '../content/methods.ts';

export interface MethodListRow {
  m: Method;
  /** A later chapter shown under its line's earlier one. */
  under: boolean;
}

/** The search and the tier chips show once a ladder holds more than this many methods. */
export const METHOD_SEARCH_FROM = 6;

export function orderMethods(
  list: readonly Method[],
  view: { query?: string; tier?: number | null } = {},
): MethodListRow[] {
  const q = (view.query ?? '').trim().toLowerCase();
  const tier = view.tier ?? null;
  const lines = new Map<string, Method[]>();
  for (const m of list) lines.set(m.line, [...(lines.get(m.line) ?? []), m]);
  const groups = [...lines.values()].map((chapters) => ({
    chapters: [...chapters].sort((a, b) => a.chapter - b.chapter),
    best: Math.max(...chapters.map((m) => rarityRank(m.rarity))),
  }));
  // Array sort is stable, so ties keep the order learned.
  groups.sort((a, b) => b.best - a.best);
  return groups.flatMap(({ chapters }) =>
    chapters
      .filter(
        (m) =>
          (!q || [m.name, m.hanzi, m.pinyin].some((s) => s.toLowerCase().includes(q))) &&
          (tier === null || m.tier === tier),
      )
      .map((m, i) => ({ m, under: i > 0 })),
  );
}

/** The tiers the methods hold, for the chips; one tier alone shows none. */
export function methodTiers(list: readonly Method[]): number[] {
  const tiers = [...new Set(list.map((m) => m.tier))].sort((a, b) => a - b);
  return tiers.length > 1 ? tiers : [];
}
