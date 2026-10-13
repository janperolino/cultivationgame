// NPC pace (design § Enemies, beasts and the people you meet): the qi stage an NPC stands at by
// age, per pedigree, on its pedigree's typical method at the away rate. A sim output: `npm run
// sim -- npcs` measures it and says when this table needs refreshing. M3's encounters and M5's
// rivals read it. Stages are q2..q9 for the Qi Condensation layers and f1..f4 for Foundation;
// past Foundation's peak waits on tier 3 methods (M5).
import type { PedigreeId } from './enemies.ts';

export const PACE_AGES = [14, 16, 18, 20, 25, 30, 40, 60, 80, 120] as const;

export const NPC_PACE: Record<PedigreeId, readonly string[]> = {
  rogue: ['q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q9', 'q9', 'q9', 'q9'],
  'small-sect': ['q4', 'q5', 'q6', 'q7', 'q9', 'f1', 'f3', 'f4', 'f4', 'f4'],
  'great-sect': ['q4', 'q6', 'q7', 'q8', 'f1', 'f2', 'f3', 'f4', 'f4', 'f4'],
  'sacred-land': ['q5', 'q7', 'q8', 'f1', 'f3', 'f4', 'f4', 'f4', 'f4', 'f4'],
  chosen: ['q5', 'q7', 'f1', 'f2', 'f4', 'f4', 'f4', 'f4', 'f4', 'f4'],
};
