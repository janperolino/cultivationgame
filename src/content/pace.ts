// NPC pace (design § Enemies, beasts and the people you meet): the qi stage an NPC stands at by
// age, per pedigree, on its pedigree's typical method at the away rate. A sim output: `npm run
// sim -- npcs` measures it and says when this table needs refreshing. M3's encounters and M5's
// rivals read it. Stages are q2..q9 for the Qi Condensation layers and f1..f4 for Foundation;
// past Foundation's peak waits on tier 3 methods (M5).
import type { PedigreeId } from './enemies.ts';

export const PACE_AGES = [14, 16, 18, 20, 25, 30, 40, 60, 80, 120] as const;

export const NPC_PACE: Record<PedigreeId, readonly string[]> = {
  rogue: ['q4', 'q6', 'q7', 'q7', 'q9', 'q9', 'q9', 'q9', 'q9', 'q9'],
  'small-sect': ['q4', 'q6', 'q7', 'q8', 'f1', 'f2', 'f4', 'f4', 'f4', 'f4'],
  'great-sect': ['q5', 'q6', 'q8', 'q9', 'f2', 'f3', 'f4', 'f4', 'f4', 'f4'],
  'sacred-land': ['q6', 'q8', 'f1', 'f2', 'f4', 'f4', 'f4', 'f4', 'f4', 'f4'],
  chosen: ['q6', 'q9', 'f1', 'f3', 'f4', 'f4', 'f4', 'f4', 'f4', 'f4'],
};

/**
 * The regional cast's clock (N2; design § Professions, people and powers, The regional cast): the
 * age in years at which each qi stage arrives, per pedigree, read off the same away life. A cast
 * member climbs a stage once the years between two keys have passed since they reached the last,
 * and the realm's last stage waits on its gate pill as well. A rogue's Foundation is measured too:
 * a cast member's purse can buy the pill an encounter's rogue never holds.
 */
export const NPC_STAGE_YEARS: Record<PedigreeId, Readonly<Record<string, number>>> = {
  rogue: {
    q2: 12.2,
    q3: 12.6,
    q4: 13.4,
    q5: 14.5,
    q6: 16,
    q7: 17.8,
    q8: 20.2,
    q9: 23.1,
    f1: 24.3,
    f2: 29,
    f3: 35.1,
    f4: 42.5,
  },
  'small-sect': {
    q2: 12.2,
    q3: 12.6,
    q4: 13.3,
    q5: 14.2,
    q6: 15.4,
    q7: 17,
    q8: 18.9,
    q9: 21.3,
    f1: 22.4,
    f2: 26.3,
    f3: 31.4,
    f4: 37.5,
  },
  'great-sect': {
    q2: 12.2,
    q3: 12.6,
    q4: 13.1,
    q5: 13.9,
    q6: 14.8,
    q7: 16.1,
    q8: 17.7,
    q9: 19.6,
    f1: 20.4,
    f2: 23.6,
    f3: 27.6,
    f4: 32.6,
  },
  'sacred-land': {
    q2: 12.2,
    q3: 12.6,
    q4: 12.9,
    q5: 13.4,
    q6: 14,
    q7: 14.7,
    q8: 15.7,
    q9: 16.8,
    f1: 17.4,
    f2: 18.8,
    f3: 20.6,
    f4: 22.8,
  },
  chosen: {
    q2: 12.2,
    q3: 12.6,
    q4: 12.9,
    q5: 13.2,
    q6: 13.7,
    q7: 14.3,
    q8: 15.1,
    q9: 16,
    f1: 17.4,
    f2: 18.4,
    f3: 19.8,
    f4: 21.4,
  },
};
