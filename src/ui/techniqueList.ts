// The Techniques screen's list (design § UI and screens): every known technique, a line's later
// chapters right under the earlier one, ordered by rarity, tier or the order learned, a line by its
// best chapter; searched and filtered by tier and Dao once the list is long, and the finished ones
// hidden on a chip (A4, Jan's call). Also the words for
// how long the next mastery level is away. Kept apart from the screen so the order is tested.
import { rarityRank } from '../content/rarity.ts';
import { type Technique } from '../content/techniques.ts';
import { DAYS_PER_YEAR, type Cultivator } from '../core/state.ts';
import { knownTechniques, mastery } from '../core/techniques.ts';

export interface TechniqueRow {
  t: Technique;
  /** A later chapter of a line whose earlier chapter shows above it, drawn indented with a hook. */
  under: boolean;
}

export type TechniqueOrder = 'rarity' | 'tier' | 'learned';

export const TECHNIQUE_ORDERS: { id: TechniqueOrder; name: string }[] = [
  { id: 'rarity', name: 'Rarity' },
  { id: 'tier', name: 'Tier' },
  { id: 'learned', name: 'Order learned' },
];

export interface TechniqueView {
  order?: TechniqueOrder;
  /** Matched against name, hanzi, pinyin, Daos and form. */
  query?: string;
  tier?: number | null;
  dao?: string | null;
  /** Leave out the techniques whose mastery is complete, at Origin. */
  hideFinished?: boolean;
}

/** The search and the filters show once the list holds more than this many techniques. */
export const TOOLBAR_FROM = 8;

/** The known chapters of a technique's line, first chapter first. */
export function knownChapters(c: Cultivator, t: Technique): Technique[] {
  return knownTechniques(c)
    .filter((k) => k.line === t.line)
    .sort((a, b) => a.chapter - b.chapter);
}

const matches = (t: Technique, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [t.name, t.hanzi, t.pinyin, t.form, ...t.daos].some((s) => s.toLowerCase().includes(q));
};

/**
 * Orders and filters techniques, given in the order learned: lines are kept together with their
 * chapters in order, and a line sorts by its best chapter, rarest or highest tier first, ties in
 * the order learned. A chapter shows under its line only when an earlier chapter shows too.
 */
export function orderTechniques(
  list: readonly Technique[],
  view: TechniqueView = {},
): TechniqueRow[] {
  const { order = 'rarity', query = '', tier = null, dao = null } = view;
  const lines = new Map<string, Technique[]>();
  for (const t of list) lines.set(t.line, [...(lines.get(t.line) ?? []), t]);
  const best = (chapters: Technique[]) =>
    order === 'rarity'
      ? Math.max(...chapters.map((t) => rarityRank(t.rarity)))
      : order === 'tier'
        ? Math.max(...chapters.map((t) => t.tier))
        : 0;
  const groups = [...lines.values()].map((chapters) => ({
    chapters: [...chapters].sort((a, b) => a.chapter - b.chapter),
    best: best(chapters),
  }));
  // Array sort is stable, so ties keep the order learned.
  groups.sort((a, b) => b.best - a.best);
  return groups.flatMap(({ chapters }) =>
    chapters
      .filter(
        (t) =>
          matches(t, query) &&
          (tier === null || t.tier === tier) &&
          (dao === null || t.daos.includes(dao)),
      )
      .map((t, i) => ({ t, under: i > 0 })),
  );
}

/** The list's rows for a cultivator. */
export function techniqueRows(c: Cultivator, view: TechniqueView = {}): TechniqueRow[] {
  const known = knownTechniques(c);
  return orderTechniques(view.hideFinished ? known.filter((t) => !finished(c, t)) : known, view);
}

/** A technique at Origin: its mastery is complete and practice gives it nothing more. */
export function finished(c: Cultivator, t: Technique): boolean {
  return mastery(c, t.id).next === null;
}

/** The tiers and Daos the techniques hold, for the filter chips; a group with one value shows none. */
export function techniqueFilters(list: readonly Technique[]): { tiers: number[]; daos: string[] } {
  const tiers = [...new Set(list.map((t) => t.tier))].sort((a, b) => a - b);
  const daos = [...new Set(list.flatMap((t) => t.daos))].sort();
  return { tiers: tiers.length > 1 ? tiers : [], daos: daos.length > 1 ? daos : [] };
}

/** "9 days" under 400 days, "about 1.4 years" or "about 10 years" above, on the 360-day year. */
export function practiceTime(days: number): string {
  if (days < 400) {
    const n = Math.max(1, Math.ceil(days));
    return `${n} ${n === 1 ? 'day' : 'days'}`;
  }
  const years = days / DAYS_PER_YEAR;
  return `about ${years < 10 ? Number(years.toFixed(1)) : Math.round(years)} years`;
}
