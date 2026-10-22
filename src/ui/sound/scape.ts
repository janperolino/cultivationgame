// The soundscape (S1): what music and ambience play for where you are. The cave's screens play the
// cave, the Map plays the road and the place you stand in, and every other screen keeps what was
// playing. Night lays insects under it, a storm lays rain over it, and while an encounter waits or a
// fight runs a low drone stands in for the rest; an encounter ducks the music and a fight plays its
// own. Pure, so the tests read it.
import type { PlaceKindId } from '../../content/map/places.ts';
import type { ScreenId } from '../screens.ts';
import type { AmbienceId, MusicSet } from './table.ts';

/** What the soundscape reads: the screen, where you stand, the hour and the weather. */
export interface Where {
  /** The screen showing, `fight` while a fight has the stage, null with no life open. */
  screen: ScreenId | 'fight' | null;
  /** The kind of place you stand inside on the Map, if any. */
  place: PlaceKindId | null;
  night: boolean;
  storm: boolean;
  /** An encounter waits on your road, or one is open in the square. */
  tense: boolean;
}

/** The ground the soundscape stands on, kept while a screen with none of its own shows. */
export type Base = 'cave' | 'wilds' | 'market' | 'sect';

export interface Layer {
  id: AmbienceId;
  level: number;
}

export interface Scape {
  base: Base | null;
  music: MusicSet | null;
  ambience: Layer[];
  /** What the music plays at, as a share of its volume. */
  duck: number;
}

const CAVE_SCREENS: ReadonlySet<string> = new Set(['cultivate', 'routine', 'crafts', 'dwelling']);

const PLACE_BASE: Record<PlaceKindId, Base> = {
  city: 'market',
  town: 'market',
  village: 'wilds',
  gate: 'sect',
  hall: 'sect',
  site: 'wilds',
};

const BASE_AMBIENCE: Record<Base, AmbienceId> = {
  cave: 'amb-cave',
  wilds: 'amb-wilds',
  market: 'amb-market',
  sect: 'amb-sect',
};

/** How loud the ground plays at night, and the insects under it. */
const NIGHT: Record<Base, [number, number]> = {
  cave: [1, 0.35],
  wilds: [0.5, 1],
  market: [0.3, 0.6],
  sect: [0.6, 0.5],
};

/** The ground for where you are, or the last one when this screen has none. */
export function baseOf(w: Where, last: Base | null): Base | null {
  if (w.screen === null) return null;
  if (CAVE_SCREENS.has(w.screen)) return 'cave';
  if (w.screen === 'world') return w.place ? PLACE_BASE[w.place] : 'wilds';
  return last;
}

export function scapeOf(w: Where, last: Base | null): Scape {
  const base = baseOf(w, last);
  if (base === null) return { base, music: null, ambience: [], duck: 1 };
  const music: MusicSet = base === 'cave' ? 'cave' : 'map';
  const storm: Layer[] = w.storm ? [{ id: 'amb-storm', level: 0.8 }] : [];
  const fight = w.screen === 'fight';
  if (fight || w.tense) {
    return {
      base,
      // A fight plays its own track; the engine keeps what was playing while it has none.
      music: fight ? 'fight' : music,
      ambience: [{ id: 'amb-tense', level: 1 }, ...storm.map((l) => ({ ...l, level: 0.5 }))],
      duck: fight ? 1 : 0.3,
    };
  }
  const [ground, insects] = w.night ? NIGHT[base] : [1, 0];
  const under = w.storm ? 0.6 : 1;
  const ambience: Layer[] = [{ id: BASE_AMBIENCE[base], level: ground * under }];
  if (insects > 0) ambience.push({ id: 'amb-night', level: insects * under });
  return { base, music, ambience: [...ambience, ...storm], duck: 1 };
}

/** The music's break between tracks: one to three minutes of ambience alone. */
export function breakMs(roll: number): number {
  return 60_000 + Math.floor(roll * 120_000);
}

/** The next track in a set: any but the last, so a set of several never repeats one twice. */
export function nextTrack<T>(set: readonly T[], last: T | null, roll: number): T | null {
  const pool = set.length > 1 ? set.filter((t) => t !== last) : set;
  return pool.length ? pool[Math.min(pool.length - 1, Math.floor(roll * pool.length))]! : null;
}

/** Night on the day wheel: 戌 to 寅, about seven in the evening to five in the morning. */
export function isNight(hour: number): boolean {
  return hour >= 10 || hour <= 2;
}
