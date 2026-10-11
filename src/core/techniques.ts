// Techniques and mastery (design § Cultivation): mastery runs Glimpse, Comprehension, Mastery,
// Domain, Origin, raised by practice days. A technique above its matching level is sealed: you
// know it, but can neither use nor practice it until you grow into it.
import { realmIndex } from '../content/realms.ts';
import {
  hasTechnique,
  MASTERY,
  MASTERY_CHECK_BONUS,
  MASTERY_TIER_SCALE,
  technique,
  type Technique,
} from '../content/techniques.ts';
import type { Cultivator } from './state.ts';

export const MAX_MASTERY = MASTERY.length - 1;

/** Practice days a technique needs to reach a mastery level, counted from learning it. */
export function masteryNeed(t: Technique, level: number): number {
  return MASTERY[level]!.practice * MASTERY_TIER_SCALE ** (t.tier - 1);
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

export interface Mastery {
  /** 0 for Glimpse up to 4 for Origin. */
  level: number;
  practice: number;
  /** Practice days the next level needs, or null at Origin. */
  next: number | null;
  /** How far from this level to the next, 0 to 1; 1 at Origin. */
  fraction: number;
}

export function mastery(c: Cultivator, id: string): Mastery {
  const t = technique(id);
  const practice = c.techniques[id]?.practice ?? 0;
  let level = 0;
  while (level < MAX_MASTERY && practice >= masteryNeed(t, level + 1)) level++;
  if (level === MAX_MASTERY) return { level, practice, next: null, fraction: 1 };
  const from = masteryNeed(t, level);
  const next = masteryNeed(t, level + 1);
  return { level, practice, next, fraction: (practice - from) / (next - from) };
}

/** What the technique adds to checks: +2 a level, so +2 at Glimpse and +4 at Comprehension. */
export function masteryCheckBonus(c: Cultivator, id: string): number {
  return (mastery(c, id).level + 1) * MASTERY_CHECK_BONUS;
}

/** Known, unsealed and short of Origin: practice days would count. */
export function canPractice(c: Cultivator, id: string): boolean {
  if (!knowsTechnique(c, id) || !hasTechnique(id)) return false;
  return !techniqueSealed(c, technique(id)) && mastery(c, id).level < MAX_MASTERY;
}

/** Learns a technique at Glimpse; with nothing being practiced, practice turns to it. */
export function learnTechnique(c: Cultivator, id: string): Cultivator {
  if (knowsTechnique(c, id)) return c;
  return {
    ...c,
    techniques: { ...c.techniques, [id]: { practice: 0 } },
    practicing: c.practicing ?? id,
  };
}

/** Points practice days at a known technique, or at nothing. */
export function setPracticing(c: Cultivator, id: string | null): Cultivator {
  if (id !== null && !knowsTechnique(c, id)) return c;
  return { ...c, practicing: id };
}

/** Adds practice days to the technique being practiced, up to what Origin needs. */
export function addPractice(c: Cultivator, days: number): Cultivator {
  const id = c.practicing;
  if (!id || days <= 0 || !canPractice(c, id)) return c;
  const cap = masteryNeed(technique(id), MAX_MASTERY);
  const practice = Math.min(cap, (c.techniques[id]?.practice ?? 0) + days);
  return { ...c, techniques: { ...c.techniques, [id]: { practice } } };
}
