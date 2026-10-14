// Techniques and mastery (design § Cultivation): mastery runs Glimpse, Comprehension, Mastery,
// Perfection, Origin, raised by practice days. A technique above its matching level is sealed: you
// know it, but can neither use nor practice it until you grow into it. A line's next chapter
// needs the one before at Comprehension and starts below it, and kin techniques of other lines
// speed each other's practice. A day's practice days split evenly among the practice slots.
import {
  CHAPTER_NEEDS_LEVEL,
  KINSHIP_BONUS,
  KINSHIP_LEVEL,
  MASTERY,
  MASTERY_ACCURACY,
  PRACTICE_SLOTS_MAX,
  TECHNIQUE_MASTERY,
} from '../content/mastery.ts';
import { ALL_FIRSTS, type FirstId } from '../content/firsts.ts';
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
import { stats } from './stats.ts';

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
 * before (two when rarer); with nothing being practiced, the first slot takes it, unless the
 * lineage has never put a technique in a slot itself (core/firsts.ts).
 */
export function learnTechnique(
  c: Cultivator,
  id: string,
  firsts: readonly FirstId[] = ALL_FIRSTS,
): Cultivator {
  if (!canLearnTechnique(c, id).ok) return c;
  const t = technique(id);
  const prev = previousTechniqueChapter(t);
  const start = prev
    ? masteryNeed(t, chapterStartLevel(mastery(c, prev.id).level, prev.rarity, t.rarity))
    : 0;
  const learned = { ...c, techniques: { ...c.techniques, [id]: { practice: start } } };
  return firsts.includes('technique') && c.practicing.length === 0 && canPractice(learned, id)
    ? { ...learned, practicing: [id] }
    : learned;
}

// ---------------------------------------------------------------- practice slots

/**
 * How many techniques can be practiced at once (design § Cultivation, Practice slots): one, and
 * one more for each point of split attention, at most `PRACTICE_SLOTS_MAX`.
 */
export function practiceSlots(c: Cultivator): number {
  const extra = Math.max(0, Math.floor(stats(c).splitAttention));
  return Math.min(PRACTICE_SLOTS_MAX, 1 + extra);
}

/** The techniques in the slots, in slot order, at most as many as there are slots. */
export function practiced(c: Cultivator): string[] {
  return c.practicing.slice(0, practiceSlots(c));
}

/** The practiced techniques practice days count on now: known, unsealed and short of Origin. */
export function practicingNow(c: Cultivator): string[] {
  return practiced(c).filter((id) => canPractice(c, id));
}

/**
 * Practice days a full day gives each technique practiced, from the day's `total` before kinship:
 * split evenly among the slots that can practice, each share lifted by its own kinship.
 */
export function practiceShares(c: Cultivator, total: number): Record<string, number> {
  const now = practicingNow(c);
  if (now.length === 0 || total <= 0) return {};
  return Object.fromEntries(
    now.map((id) => [id, (total / now.length) * (1 + kinshipBonus(c, id))]),
  );
}

/** Whether a technique can take a slot: one free, and the technique known, unsealed, short of Origin. */
export function canStartPractice(c: Cultivator, id: string): TechniqueCheck {
  if (!knowsTechnique(c, id) || !hasTechnique(id)) {
    return { ok: false, reason: 'You do not know it.' };
  }
  if (practiced(c).includes(id)) return { ok: false, reason: 'You practice it already.' };
  if (techniqueSealed(c, technique(id))) {
    return { ok: false, reason: 'It is sealed until your realm grows into it.' };
  }
  if (mastery(c, id).level >= MAX_MASTERY) {
    return { ok: false, reason: 'It is at Origin: there is nothing left to drill.' };
  }
  if (practiced(c).length >= practiceSlots(c)) return { ok: false, reason: 'All slots in use.' };
  return { ok: true };
}

/** Puts a technique in the first free practice slot. */
export function startPractice(
  c: Cultivator,
  id: string,
): { cultivator: Cultivator; check: TechniqueCheck } {
  const check = canStartPractice(c, id);
  if (!check.ok) return { cultivator: c, check };
  return { cultivator: { ...c, practicing: [...practiced(c), id] }, check };
}

/** Takes a technique out of its slot; the slots after it move up. */
export function stopPractice(c: Cultivator, id: string): Cultivator {
  if (!c.practicing.includes(id)) return c;
  return { ...c, practicing: c.practicing.filter((x) => x !== id) };
}

export interface PracticeResult {
  cultivator: Cultivator;
  /** Each level reached on the way, in slot order; each releases a burst of insight. */
  levels: { technique: string; level: number }[];
  /** The techniques that reached Origin and left their slot, which stays empty. */
  left: string[];
}

/**
 * Adds practice days to each technique practiced, by `days` per technique (practiceShares × the
 * stretch), up to what Origin needs, and says which levels each reached. One reaching Origin
 * leaves its slot: practice is never queued or picked for you.
 */
export function addPractice(c: Cultivator, days: Readonly<Record<string, number>>): PracticeResult {
  let next = c;
  const levels: PracticeResult['levels'] = [];
  const left: string[] = [];
  for (const id of practicingNow(c)) {
    const d = days[id] ?? 0;
    if (d <= 0) continue;
    const before = mastery(next, id).level;
    const cap = masteryNeed(technique(id), MAX_MASTERY);
    const practice = Math.min(cap, (next.techniques[id]?.practice ?? 0) + d);
    next = { ...next, techniques: { ...next.techniques, [id]: { practice } } };
    const after = mastery(next, id).level;
    for (let l = before + 1; l <= after; l++) levels.push({ technique: id, level: l });
    if (after >= MAX_MASTERY) left.push(id);
  }
  if (left.length > 0) {
    next = { ...next, practicing: next.practicing.filter((id) => !left.includes(id)) };
  }
  return { cultivator: next, levels, left };
}
