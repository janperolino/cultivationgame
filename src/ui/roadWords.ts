// What the road wheel's hours are called (design § Travel, the road wheel): the short name on the
// wheel and its buttons, and the words for what you do then, on the Map's bar and in tooltips.
import { HOUR_KINDS } from '../content/hours.ts';
import type { RoadHour } from '../content/map/travel.ts';

const homeWords = Object.fromEntries(
  Object.entries(HOUR_KINDS).map(([k, v]) => [k, v.name.toLowerCase()]),
) as Record<keyof typeof HOUR_KINDS, string>;

/** What you do in an hour of the road. */
export const ROAD_WORD: Record<RoadHour, string> = {
  travel: 'travel',
  look: 'look around and make camp',
  guard: 'guard the caravan',
  home: 'as at home',
  ...homeWords,
};

/** An hour's name on the wheel and its buttons. */
export const ROAD_NAME: Record<RoadHour, string> = {
  travel: 'Travel',
  look: 'Look around',
  guard: 'Guard',
  home: 'As at home',
  ...(Object.fromEntries(Object.entries(HOUR_KINDS).map(([k, v]) => [k, v.name])) as Record<
    keyof typeof HOUR_KINDS,
    string
  >),
};
