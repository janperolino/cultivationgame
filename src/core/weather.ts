// Weather from the calendar (design § UI and screens, the glass carries a season tint and
// weather): each spell of a few days draws its weather from the season's odds, seeded by the
// life's glass and the spell, so it is the same on every reload and never touches a random stream.
import { hashSeed, Rng } from './rng.ts';
import { seasonOf, type Season } from './chronicle.ts';

export type Weather = 'clear' | 'rain' | 'storm' | 'mist' | 'wind' | 'snow';

/** Days a spell of weather lasts. */
export const SPELL_DAYS = 5;

const ODDS: Record<Season, readonly [Weather, number][]> = {
  spring: [
    ['clear', 0.4],
    ['rain', 0.35],
    ['mist', 0.25],
  ],
  summer: [
    ['clear', 0.55],
    ['rain', 0.2],
    ['storm', 0.25],
  ],
  autumn: [
    ['clear', 0.45],
    ['wind', 0.3],
    ['mist', 0.25],
  ],
  winter: [
    ['clear', 0.35],
    ['snow', 0.5],
    ['mist', 0.15],
  ],
};

/** The weather on a world day, for a glass seed. */
export function weatherOn(seed: number, day: number): Weather {
  const spell = Math.floor(day / SPELL_DAYS);
  const season = seasonOf(spell * SPELL_DAYS);
  const roll = new Rng(hashSeed(`weather-${seed}-${spell}`)).next();
  let acc = 0;
  for (const [w, p] of ODDS[season]) {
    acc += p;
    if (roll < acc) return w;
  }
  return 'clear';
}
