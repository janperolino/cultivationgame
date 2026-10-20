// Routine's three tabs (design § UI and screens, the Routine row): which kind of hour opens
// which tab, and which tabs show, each once it holds something.
import type { HourKind } from '../content/hours.ts';
import type { GameState } from '../core/state.ts';
import type { RoutineTab } from './nav.ts';

/** The tab each kind of hour belongs to. */
export const TAB_OF: Record<HourKind, RoutineTab> = {
  qi: 'day',
  body: 'day',
  soul: 'day',
  sleep: 'day',
  duty: 'day',
  practice: 'practice',
  study: 'study',
};

export const ROUTINE_TABS: readonly { id: RoutineTab; name: string; hanzi: string }[] = [
  { id: 'day', name: 'Day', hanzi: '日' },
  { id: 'practice', name: 'Practice', hanzi: '练' },
  { id: 'study', name: 'Study', hanzi: '读' },
];

/**
 * The tabs that show: Day and Study always, since qi and study hours are open from the
 * start, and Practice with the unlock that opened the Techniques screen (a first technique).
 */
export function routineTabs(game: GameState): RoutineTab[] {
  const shown: RoutineTab[] = ['day'];
  if (game.unlocks.includes('techniques')) shown.push('practice');
  shown.push('study');
  return shown;
}
