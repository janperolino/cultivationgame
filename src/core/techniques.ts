// Techniques and mastery (design § Cultivation): mastery runs Glimpse, Comprehension, Mastery,
// Domain, Origin, raised by practice days. A technique above its matching level is sealed: you
// know it, but can neither use nor practice it until you grow into it. A line's next chapter
// needs the one before at Comprehension and starts below it, and kin techniques of other lines
// speed each other's practice.
import {
  CHAPTER_NEEDS_LEVEL,
  KINSHIP_BONUS,
  KINSHIP_LEVEL,
  MASTERY,
  MASTERY_ACCURACY,
  TECHNIQUE_MASTERY,
} from '../content/mastery.ts';
import { rarityAccuracy } from '../content/rarity.ts';
import { realmIndex } from '../content/realms.ts';
import {
  hasTechnique,
  previousTechniqueChapter,
  technique,
  type Technique,
} from '../content/techniques.ts';
import {
  chapterStartLevel,
  masteryAt,
  MAX_MASTERY,
  practiceNeed,
  type Mastery,
} from './mastery.ts';
import type { Cultivator } from './state.ts';

export { MAX_MASTERY, type Mastery };

/** Practice days a technique needs to reach a mastery level, counted from learning it. */
export function masteryNeed(t: Technique, level: number): number {
  return practiceNeed(TECHNIQUE_MASTERY, t.tier, level);
}

/** True while the technique's ladder sits below its tier. */
export function techniqueSealed(c: Cultivator, t: Technique): boolean {
  return realmIndex(c[t.ladder].realm) + 1 < t.tier;
}

export function knowsTechnique(c: Cultivator, id: string): boolean {
  return id in c.techniques;
}

/** The techniques the cultivator knows, in the order learned. */
export function knownTechniques(c: Cultivator): Technique[] {
  return Object.keys(c.techniques).filter(hasTechnique).map(technique);
}

export function mastery(c: Cultivator, id: string): Mastery {
  return masteryAt(TECHNIQUE_MASTERY, technique(id).tier, c.techniques[id]?.practice ?? 0);
}

/** What mastery adds to checks with it: +2 a level, so +2 at Glimpse and +4 at Comprehension. */
export function masteryAccuracy(c: Cultivator, id: string): number {
  return MASTERY_ACCURACY ** mastery(c, id).level;
}

/** Everything the technique multiplies Accuracy by: its mastery, and ×1.2 or ×1.4 at gold or red. */
export function techniqueAccuracy(c: Cultivator, id: string): number {
  return masteryAccuracy(c, id) * rarityAccuracy(technique(id).rarity);
}

/** Known, unsealed and short of Origin: practice days would count. */
export function canPractice(c: Cultivator, id: string): boolean {
  if (!knowsTechnique(c, id) || !hasTechnique(id)) return false;
  return !techniqueSealed(c, technique(id)) && mastery(c, id).level < MAX_MASTERY;
}

// ---------------------------------------------------------------- lines, chapters and kinship

/**
 * Known techniques kin to this one: of another line, sharing a Dao and its form, at Comprehension
 * or above.
 */
export function techniqueKin(c: Cultivator, id: string): Technique[] {
  const t = technique(id);
  return knownTechniques(c).filter(
    (k) =>
      k.line !== t.line &&
      k.form === t.form &&
      k.daos.some((d) => t.daos.includes(d)) &&
      mastery(c, k.id).level >= KINSHIP_LEVEL,
  );
}

/** Kinship's lift on practice: a quarter while any kin sits at Comprehension or above. */
export function kinshipBonus(c: Cultivator, id: string): number {
  return techniqueKin(c, id).length > 0 ? KINSHIP_BONUS : 0;
}

/**
 * Practice days it takes to reach the next mastery level, at `rate` practice days a day before
 * kinship, the technique's own kinship counted; null at Origin or while sealed, Infinity with no
 * rate at all.
 */
export function daysToNextLevel(c: Cultivator, id: string, rate: number): number | null {
  const t = technique(id);
  const m = mastery(c, id);
  if (techniqueSealed(c, t) || m.next === null) return null;
  const perDay = rate * (1 + kinshipBonus(c, id));
  return perDay > 0 ? (m.next - m.practice) / perDay : Infinity;
}

export type TechniqueCheck = { ok: true } | { ok: false; reason: string };

/** Whether a technique can be learned: a line's next chapter needs the one before at Comprehension. */
export function canLearnTechnique(c: Cultivator, id: string): TechniqueCheck {
  if (!hasTechnique(id)) return { ok: false, reason: 'There is no such technique.' };
  if (knowsTechnique(c, id)) return { ok: false, reason: 'You know it already.' };
  const prev = previousTechniqueChapter(technique(id));
  if (prev && (!knowsTechnique(c, prev.id) || mastery(c, prev.id).level < CHAPTER_NEEDS_LEVEL)) {
    const level = MASTERY[CHAPTER_NEEDS_LEVEL]!.name;
    return { ok: false, reason: `It needs ${prev.name} at ${level} first.` };
  }
  return { ok: true };
}

/**
 * Learns a technique, at Glimpse or, for a line's next chapter, one level below the chapter
 * before (two when rarer); with nothing being practiced, practice turns to it.
 */
export function learnTechnique(c: Cultivator, id: string): Cultivator {
  if (!canLearnTechnique(c, id).ok) return c;
  const t = technique(id);
  const prev = previousTechniqueChapter(t);
  const start = prev
    ? masteryNeed(t, chapterStartLevel(mastery(c, prev.id).level, prev.rarity, t.rarity))
    : 0;
  return {
    ...c,
    techniques: { ...c.techniques, [id]: { practice: start } },
    practicing: c.practicing ?? id,
  };
}

/** Points practice days at a known technique, or at nothing. */
export function setPracticing(c: Cultivator, id: string | null): Cultivator {
  if (id !== null && !knowsTechnique(c, id)) return c;
  return { ...c, practicing: id };
}

/**
 * Adds practice days to the technique being practiced, up to what Origin needs, and says which
 * levels it reached on the way; each releases a burst of insight.
 */
export function addPractice(
  c: Cultivator,
  days: number,
): { cultivator: Cultivator; levels: number[] } {
  const id = c.practicing;
  if (!id || days <= 0 || !canPractice(c, id)) return { cultivator: c, levels: [] };
  const before = mastery(c, id).level;
  const cap = masteryNeed(technique(id), MAX_MASTERY);
  const practice = Math.min(cap, (c.techniques[id]?.practice ?? 0) + days);
  const next = { ...c, techniques: { ...c.techniques, [id]: { practice } } };
  const after = mastery(next, id).level;
  const levels = Array.from({ length: after - before }, (_, i) => before + 1 + i);
  return { cultivator: next, levels };
}
