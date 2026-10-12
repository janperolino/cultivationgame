// Mastery for anything with practice (design § Cultivation, mastery): techniques and methods,
// recipes from M4. A level is reached at its practice days, three times as many per tier, and a
// new chapter of a line starts below the old one's level. The tables live in content/mastery.ts.
import { MASTERY_TIER_SCALE, MAX_MASTERY, type MasteryTable } from '../content/mastery.ts';
import { rarityRank, type RarityId } from '../content/rarity.ts';

export { MAX_MASTERY };

export interface Mastery {
  /** 0 for Glimpse up to 4 for Origin. */
  level: number;
  practice: number;
  /** Practice days the next level needs, or null at Origin. */
  next: number | null;
  /** How far from this level to the next, 0 to 1; 1 at Origin. */
  fraction: number;
}

/** Practice days a thing of this tier needs to reach a level, counted from learning it. */
export function practiceNeed(table: MasteryTable, tier: number, level: number): number {
  return table.practice[level]! * MASTERY_TIER_SCALE ** (tier - 1);
}

/** Where practice days put a thing of this tier on its mastery table. */
export function masteryAt(table: MasteryTable, tier: number, practice: number): Mastery {
  let level = 0;
  while (level < MAX_MASTERY && practice >= practiceNeed(table, tier, level + 1)) level++;
  if (level === MAX_MASTERY) return { level, practice, next: null, fraction: 1 };
  const from = practiceNeed(table, tier, level);
  const next = practiceNeed(table, tier, level + 1);
  return { level, practice, next, fraction: (practice - from) / (next - from) };
}

/** The insight a level releases when reached, at the thing's tier, before Aptitude. */
export function burstAt(table: MasteryTable, tier: number, level: number): number {
  return (table.burst[level] ?? 0) * MASTERY_TIER_SCALE ** (tier - 1);
}

/**
 * The level a new chapter starts at (design § Cultivation, lines, chapters and kinship): one
 * below the old chapter's, two when the new chapter is rarer, never below Glimpse.
 */
export function chapterStartLevel(oldLevel: number, oldRarity: RarityId, newRarity: RarityId) {
  const drop = rarityRank(newRarity) > rarityRank(oldRarity) ? 2 : 1;
  return Math.max(0, oldLevel - drop);
}
