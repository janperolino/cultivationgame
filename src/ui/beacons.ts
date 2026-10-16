// The beacon (design § UI and screens, You do it the first time): while a first-time action waits,
// its screen's menu button glows with motes drifting along its edges (the phone's ☰ too), the tab
// it lives in glows the same, and the exact control wears a soft ring. Each first waiting
// (core/firsts.ts) maps here to its screen, tab and control; all clear the moment you act, since
// they are read from the live state. A beacon outranks the "new screen" glow.
import type { HourKind } from '../content/hours.ts';
import type { LadderId } from '../content/cultivation.ts';
import { firstsWaiting, type FirstStep } from '../core/firsts.ts';
import type { GameState } from '../core/state.ts';
import type { RoutineTab } from './nav.ts';
import type { ScreenId } from './screens.ts';

/** The control a beacon rings. */
export type BeaconControl =
  'wheel' | 'read-now' | 'climb-with' | 'practice-this' | 'node' | 'burn-stones' | 'auto';

export interface Beacon {
  screen: ScreenId;
  /** Routine's tab it lives in, when it lives on Routine. */
  tab?: RoutineTab;
  control: BeaconControl;
  /** The copy, method or technique the control is for. */
  id?: string;
  /** Climb with: the ladder. */
  ladder?: LadderId;
  /** The wheel: the kind of hour it wants. */
  kind?: HourKind;
}

/** Where a waiting first's beacon stands. */
export function beaconFor(step: FirstStep): Beacon {
  const on = (tab: RoutineTab, control: BeaconControl, more: Partial<Beacon> = {}): Beacon => ({
    screen: 'routine',
    tab,
    control,
    ...more,
  });
  switch (step.hint) {
    case 'copy':
      return on('study', 'read-now', { id: step.id });
    case 'study-hour':
      return on('day', 'wheel', { kind: 'study' });
    case 'method':
      return on('day', 'climb-with', { id: step.id, ladder: 'qi' });
    case 'technique':
      return on('practice', 'practice-this', { id: step.id });
    case 'technique-hour':
      return on('day', 'wheel', { kind: 'practice' });
    case 'art':
      return on('day', 'climb-with', { id: step.id, ladder: step.ladder });
    case 'art-hour':
      return on('day', 'wheel', { kind: step.ladder });
    case 'stones':
      return on('day', 'burn-stones');
    case 'node':
      return { screen: 'trees', control: 'node' };
  }
}

/**
 * The auto setting's hint (ui/hints.ts) is the one hint that also lights its control: after the
 * life's first step on any ladder, until dismissed, while hints are on. Nothing switches off for
 * it, since minor breakthroughs already run at safe odds.
 */
export function autoHintWaiting(s: GameState): boolean {
  const p = s.player;
  const climbed = (['qi', 'body', 'soul'] as const).some(
    (k) => p[k].realm !== 'qi-condensation' || p[k].stage > 1,
  );
  return climbed && !s.ended;
}

export function beacons(s: GameState): Beacon[] {
  const out = firstsWaiting(s).map(beaconFor);
  if (s.hints.on && !s.hints.shown.includes('auto') && autoHintWaiting(s)) {
    out.push({ screen: 'routine', tab: 'day', control: 'auto' });
  }
  return out;
}

/** Whether a control wears the ring: any beacon on it, or the one for this id or ladder. */
export function rings(
  bs: readonly Beacon[],
  control: BeaconControl,
  match: { id?: string; ladder?: LadderId } = {},
): boolean {
  return bs.some(
    (b) =>
      b.control === control &&
      (match.id === undefined || b.id === match.id) &&
      (match.ladder === undefined || b.ladder === match.ladder),
  );
}
