// Setting a course while today's Duty hours are still to come asks first, once a day (Jan's
// playtest after S1): "You're on watch at the Wall today. Leave anyway?" The map shows the ask;
// the Dwelling's Set course goes to the map and asks there. The session's, never saved.
import { create } from 'zustand';
import { dutyAhead } from '../core/jobs.ts';
import type { GameState } from '../core/state.ts';

interface DutyAskStore {
  /** The ask standing now: its words, and the course it holds back. */
  ask: { text: string; go: () => void } | null;
  /** The world day you last chose to leave anyway: the ask doesn't come again that day. */
  left: number | null;
}

export const useDutyAsk = create<DutyAskStore>()(() => ({ ask: null, left: null }));

/** Sets the course at once, or asks first while today's Duty hours are still to come here. */
export function courseOrAsk(s: GameState, go: () => void): void {
  const j = dutyAhead(s);
  const today = Math.floor(s.calendar.day);
  if (!j || useDutyAsk.getState().left === today) return go();
  useDutyAsk.setState({
    ask: { text: `You’re on duty here today (${j.name}). Leave anyway?`, go },
  });
}

/** Leave anyway: the course is set, and the ask is done for the day. */
export function leaveAnyway(s: GameState): void {
  const ask = useDutyAsk.getState().ask;
  useDutyAsk.setState({ ask: null, left: Math.floor(s.calendar.day) });
  ask?.go();
}

export function stayOnDuty(): void {
  useDutyAsk.setState({ ask: null });
}
