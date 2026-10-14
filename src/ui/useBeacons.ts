// The beacons standing on the open life (ui/beacons.ts), for the menu, tabs and controls.
import { beacons, type Beacon } from './beacons.ts';
import { useGame } from './store.ts';

let lastKey = '';
let lastBeacons: Beacon[] = [];

/** The beacons standing now; a component re-renders only when they change. */
export function useBeacons(): Beacon[] {
  const key = useGame((s) => (s.game && !s.game.ended ? JSON.stringify(beacons(s.game)) : ''));
  if (key !== lastKey) {
    lastKey = key;
    lastBeacons = key ? (JSON.parse(key) as Beacon[]) : [];
  }
  return lastBeacons;
}
