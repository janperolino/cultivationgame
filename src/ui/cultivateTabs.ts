// Cultivate's three tabs (design § UI and screens, the Cultivate row): which kind of hour opens
// which tab, and which tabs show, each once it holds something.
import type { HourKind } from '../content/hours.ts';
import { ownedCopies } from '../core/reading.ts';
import type { GameState } from '../core/state.ts';
import { hourKindOpen } from '../core/wheel.ts';
import type { CultivateTab } from './nav.ts';

/** The tab each kind of hour belongs to. */
export const TAB_OF: Record<HourKind, CultivateTab> = {
  qi: 'cultivation',
  body: 'cultivation',
  soul: 'cultivation',
  sleep: 'cultivation',
  practice: 'practice',
  study: 'study',
};

export const CULTIVATE_TABS: readonly { id: CultivateTab; name: string; hanzi: string }[] = [
  { id: 'cultivation', name: 'Cultivation', hanzi: '修' },
  { id: 'practice', name: 'Practice', hanzi: '练' },
  { id: 'study', name: 'Study', hanzi: '读' },
];

/**
 * The tabs that show: Cultivation always, Practice with the unlock that opened the Techniques
 * screen, Study with the first copy or the first study hour.
 */
export function cultivateTabs(game: GameState): CultivateTab[] {
  const c = game.player;
  const shown: CultivateTab[] = ['cultivation'];
  if (game.unlocks.includes('techniques')) shown.push('practice');
  if (ownedCopies(c).length > 0 || hourKindOpen(c, 'study')) shown.push('study');
  return shown;
}
