// Street time (People and ties' design, Street time and Around you; P3.9b): while a place's screens
// are open the clock runs ×12 slower, a day in about two real minutes, so a place is somewhere you
// stand rather than a menu. The place screen says when it is open; the clock's tick reads it.
import { STREET_SLOW } from '../content/aroundYou.ts';

let onStreet = false;

/** The place screen opened or closed. */
export function setStreet(on: boolean): void {
  onStreet = on;
}

/** What the clock's real time is divided by now: 12 on a place's screens, else 1. */
export function streetSlow(): number {
  return onStreet ? STREET_SLOW : 1;
}
