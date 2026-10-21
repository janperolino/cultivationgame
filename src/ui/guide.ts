// The guide standing now (core/guides.ts) needs to know where the player looks: the screen, the
// Routine tab, an orb on Cultivate to draw, a place's doors, a shop's counter. Screens tell this
// store as they show, and the guide layer (GuideLayer.tsx) reads the guide from it. The game's
// loop reads `guideHold` so a veil holds the clock (the first orb's breath runs at half instead).
import { create } from 'zustand';
import {
  finishGuide,
  guideNow,
  GUIDES,
  type Guide,
  type GuideContext,
  type GuideId,
} from '../core/guides.ts';
import { go, type RoutineTab } from './nav.ts';
import type { ScreenId } from './screens.ts';
import type { GameState } from '../core/state.ts';
import { useGame } from './store.ts';

export const useGuideCtx = create<GuideContext & { replay?: GuideId }>()(() => ({
  screen: 'cultivate',
}));

/** Tells the guides where the player looks, merged into what they knew. */
export function lookAt(patch: Partial<GuideContext>): void {
  const now = useGuideCtx.getState();
  if (Object.entries(patch).every(([k, v]) => now[k as keyof GuideContext] === v)) return;
  useGuideCtx.setState(patch);
}

/** The guide standing for this state and where the player looks. */
export function currentGuide(s: GameState | null): Guide | null {
  return s ? guideNow(s, useGuideCtx.getState()) : null;
}

/** How a standing guide holds the clock: a veil holds it, the first orb's runs it at half. */
export function guideHold(s: GameState | null): 'held' | 'half' | null {
  const g = currentGuide(s);
  if (!g || g.form !== 'veil') return null;
  return g.id === 'first-orb' ? 'half' : 'held';
}

/** Ends a guide from a control the UI saw used (a door opened, a buy, a fight's first move). */
export function endGuide(id: Parameters<typeof finishGuide>[1]): void {
  const { game, applyLife } = useGame.getState();
  if (game && !game.lineage.guides.includes(id)) applyLife((s) => finishGuide(s, id));
}

/**
 * Replays a guide from Settings: its screen opens and its lines show at its control as a ring,
 * closed by Got it. Nothing is held or recorded.
 */
export function replayGuide(id: GuideId): void {
  const g = GUIDES[id];
  const screen = (g.id === 'place-doors' || g.id === 'first-buy' ? 'map' : g.screen) as ScreenId;
  go(screen, undefined, undefined, g.tab as RoutineTab | undefined);
  useGuideCtx.setState({ replay: id });
}

export function endReplay(): void {
  useGuideCtx.setState({ replay: undefined });
}
