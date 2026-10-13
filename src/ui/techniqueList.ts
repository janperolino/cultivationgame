// The Techniques screen's list (design § UI and screens): every known technique in the order
// learned, a line's later chapters right under the earlier one rather than sorted on their own,
// and the words for how long the next mastery level is away. Kept apart from the screen so the
// order is tested.
import { type Technique } from '../content/techniques.ts';
import { DAYS_PER_YEAR, type Cultivator } from '../core/state.ts';
import { knownTechniques } from '../core/techniques.ts';

export interface TechniqueRow {
  t: Technique;
  /** A later chapter of a line whose earlier chapter sits above it, drawn indented with a hook. */
  under: boolean;
}

/** The known chapters of a technique's line, first chapter first. */
export function knownChapters(c: Cultivator, t: Technique): Technique[] {
  return knownTechniques(c)
    .filter((k) => k.line === t.line)
    .sort((a, b) => a.chapter - b.chapter);
}

/** The list's rows: lines in the order their first chapter was learned, chapters together. */
export function techniqueRows(c: Cultivator): TechniqueRow[] {
  const seen = new Set<string>();
  const rows: TechniqueRow[] = [];
  for (const t of knownTechniques(c)) {
    if (seen.has(t.line)) continue;
    seen.add(t.line);
    knownChapters(c, t).forEach((k, i) => rows.push({ t: k, under: i > 0 }));
  }
  return rows;
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
