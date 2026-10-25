// The hour on a Go in before you go in (P3.9w, from P3.9t's playtest): "丑 the small hours · shut",
// the door's own state by its kind, the streets and the land with the hour alone. Read as a string
// from the store, so it renders once a double-hour, not every tick of street time.
import { goInHour } from '../core/goinPlace.ts';
import { useGame } from './store.ts';

export function GoInHour({ piece = null }: { piece?: string | null }) {
  const words = useGame((s) => (s.game ? goInHour(s.game.calendar.day, piece) : ''));
  return words ? <span className="goin-door-hour">{words}</span> : null;
}
