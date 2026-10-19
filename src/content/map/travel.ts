// The travel map's numbers (design § The world: The travel map, Depth and qi density, The fog), as
// settled in P3.6's talk on the look study (docs/mockups/travel-map-study.html). Starting values;
// core/map reads them.
import type { HourKind } from '../hours.ts';
import type { RealmId } from '../realms.ts';

// ---------------------------------------------------------------- distances

/** The map reads every sensing distance at thirty times a scene's: a map day is a day of looking. */
export const MAP_SCALE = 30;
/** Sight on the map, in li: open ground, and forest, jungle, karst or marsh. */
export const SIGHT_OPEN = 20 * MAP_SCALE;
export const SIGHT_CLOSED = 5 * MAP_SCALE;
export const CLOSED_TERRAINS: readonly string[] = ['forest', 'jungle', 'karst', 'marsh'];
/** A look around covers this many li. */
export const LOOK_LI = 2 * MAP_SCALE;
/** Divine sense's sweep on the map by realm, from Foundation; a soul ahead uses the next row. */
export const SENSE_LI: Partial<Record<RealmId, number>> = {
  'foundation-establishment': 2 * MAP_SCALE,
  'core-formation': 20 * MAP_SCALE,
  'nascent-soul': 200 * MAP_SCALE,
};
/** A rumor's ring, across. */
export const RUMOR_RING_LI = 100 * MAP_SCALE;
/** What every start has Seen round its home: a day's walk. */
export const HOME_SEEN_LI = 240;

// ---------------------------------------------------------------- pace

/** Off the road your pace is this share of the road's, by the terrain under you. */
export const OFFROAD_FACTOR: Readonly<Record<string, number>> = {
  plains: 0.8,
  steppe: 0.8,
  coast: 0.8,
  desert: 0.6,
  plateau: 0.6,
  hills: 0.6,
  tundra: 0.6,
  canyon: 0.5,
  forest: 0.5,
  volcanic: 0.45,
  karst: 0.45,
  marsh: 0.4,
  jungle: 0.4,
  ice: 0.4,
  islands: 0.5,
  twilight: 0.5,
  mountains: 0.35,
};
/** The terrain in words, for where you stand and where you camp. */
export const TERRAIN_NAMES: Readonly<Record<string, string>> = {
  plains: 'plains',
  steppe: 'steppe',
  coast: 'coast',
  desert: 'desert',
  plateau: 'high plateau',
  hills: 'hills',
  tundra: 'tundra',
  canyon: 'canyons',
  forest: 'forest',
  volcanic: 'ash fields',
  karst: 'karst',
  marsh: 'marsh',
  jungle: 'jungle',
  ice: 'ice',
  islands: 'islands',
  twilight: 'twilight lands',
  mountains: 'mountains',
  sea: 'sea',
};

/** A spot within this many li of a road counts as on it. */
export const ON_ROAD_LI = 80;

/** The road wheel's own kinds of hour, beside the home wheel's; `home` takes the home wheel's hour. */
export const ROAD_HOUR_KINDS = ['travel', 'look', 'guard', 'home'] as const;
export type RoadHourKind = (typeof ROAD_HOUR_KINDS)[number];
export type RoadHour = RoadHourKind | HourKind;

export interface RoadRoutine {
  id: string;
  name: string;
  short: string;
  note: string;
  /** Twelve hours, from 子 round to 亥. */
  hours: readonly RoadHour[];
  /** Keeps off the roads and goes round the checkpoints. */
  hidden?: boolean;
  /** Keeps to the roads. */
  roadsOnly?: boolean;
  /** Kept only while you travel with a group that asks it (a paid caravan guard); never picked. */
  groupOnly?: boolean;
}

const h = 'home';
const t = 'travel';
const l = 'look';
const g = 'guard';
const z = 'sleep';

/** The four saved road routines (design § The world, Travel is a kind of hour). */
export const ROAD_ROUTINES: readonly RoadRoutine[] = [
  {
    id: 'by-day',
    name: 'Travel by day, cultivate by night',
    short: 'By day',
    note: 'open, on the roads; you look around at dusk',
    //      子 丑 寅 卯 辰 巳 午 未 申 酉 戌 亥
    hours: [z, z, h, h, t, t, t, t, t, t, l, h],
  },
  {
    id: 'pressed',
    name: 'Pressed march',
    short: 'Pressed march',
    note: 'every waking hour on the road',
    hours: [z, z, t, t, t, t, t, t, t, t, t, t],
  },
  {
    id: 'night',
    name: 'The night road',
    short: 'Night road',
    note: 'hidden: off the roads and round the checkpoints; you look around at dawn',
    hours: [z, z, t, l, h, h, h, h, h, t, t, t],
    hidden: true,
  },
  {
    id: 'caravan',
    name: 'Caravan guard',
    short: 'Caravan guard',
    note: 'paid a low-grade stone a day; slow, safe, and on the roads',
    hours: [z, z, h, h, g, g, g, g, g, g, l, h],
    roadsOnly: true,
    groupOnly: true,
  },
];

/** A guard keeps the caravan's pace, and is paid for the day. */
export const GUARD_PACE = 20;
export const GUARD_PAY_LOW = 1;

// ---------------------------------------------------------------- ways of going

export type WayId = 'light-step' | 'horse' | 'mount' | 'boat' | 'fly' | 'ride' | 'ship' | 'wagon';

export interface Way {
  id: WayId;
  name: string;
  /** Li a double-hour. */
  pace: number;
  /** Riding moves you without your hours: the hours it runs, from 辰 when fewer than twelve. */
  rideHours?: number;
  /** The share of qi, body and soul an hour gives while riding; study keeps its own. */
  jostle?: number;
  /** Study is untouched (a boat's deck). */
  studyWhole?: boolean;
  /** Goes over the land, never slowed by it. */
  flies?: boolean;
  /** The item that lets you go this way. */
  needs?: string;
  /** Never offered to choose: a group's way. */
  groupOnly?: boolean;
  note: string;
}

export const WAYS: readonly Way[] = [
  {
    id: 'light-step',
    name: 'Light step',
    pace: 40,
    note: "a cultivator's run (轻功), past a horse's pace: your travel hours move you",
  },
  {
    id: 'horse',
    name: 'Horse',
    pace: 30,
    rideHours: 6,
    jostle: 0.5,
    needs: 'mortal-horse',
    note: 'a bought horse: six hours a day, your hours free at half',
  },
  {
    id: 'mount',
    name: 'Mount',
    pace: 45,
    rideHours: 8,
    jostle: 0.5,
    needs: 'scale-horse',
    note: 'a spirit mount, bought from the Herders (tamed in M6): eight hours a day, your hours free at half',
  },
  {
    id: 'boat',
    name: 'Passage',
    pace: 30,
    rideHours: 12,
    jostle: 0.5,
    studyWhole: true,
    note: 'passage along a coast or a river: none charted in the Border Wilds yet',
  },
  {
    id: 'fly',
    name: 'Fly',
    pace: 200,
    flies: true,
    note: 'from Foundation on your sword, stopping to refill your qi; sustained from Core Formation at 300 li; seen from afar',
  },
  {
    id: 'ride',
    name: 'Someone’s sword',
    pace: 200,
    rideHours: 6,
    jostle: 0.5,
    flies: true,
    note: 'a flight on someone’s sword, hired for stones (M6)',
  },
  {
    id: 'ship',
    name: 'A cloud ship',
    pace: 250,
    rideHours: 12,
    jostle: 0.5,
    flies: true,
    groupOnly: true,
    note: 'a sect’s flying ship, sailing through the night',
  },
  {
    id: 'wagon',
    name: 'A caravan’s wagon',
    pace: 20,
    rideHours: 6,
    jostle: 0.5,
    groupOnly: true,
    note: 'riding with a caravan: its six hours a day from 辰, yours free at half',
  },
];

export function way(id: WayId): Way {
  const w = WAYS.find((x) => x.id === id);
  if (!w) throw new Error(`Unknown way: ${id}`);
  return w;
}

/** Flight on your own sword: hours a day at Foundation before you must stop for your qi, and Core's pace. */
export const FOUNDATION_FLIGHT_HOURS = 4;
export const CORE_FLIGHT_PACE = 300;

// ---------------------------------------------------------------- sleep and groups

/** A cave, hut or shrine you have found within this many li shelters you for the night. */
export const SHELTER_LI = 300;
/** A caravan guard who walks off loses the pay owed, and this much standing with the guild. */
export const CARAVAN_LEAVE_STANDING = -5;

// ---------------------------------------------------------------- depth and qi density

export const QI_NAMES = [
  '',
  'barren',
  'sparse',
  'thin',
  'modest',
  'ordinary',
  'rich',
  'abundant',
  'blessed',
  'heaven-touched',
] as const;

/** A land's edge band is its qi density less this. */
export const EDGE_BAND_OFFSET = 3;
/** Within this many li of a road or settlement is the edge. */
export const EDGE_LI = 1500;
/** Each this many li from the nearest road or settlement allows one more ring. */
export const RING_LI = 1200;
/** A heart's ground: this many li, and this many more for each ring it holds. */
export const HEART_REACH_LI = 5000;
export const HEART_REACH_PER_RING = 2200;
/** A seeded heart holds two to three rings, more in a large tract (in square li). */
export const HEART_BASE_RINGS = 2;
export const HEART_LARGE_TRACT = 240e6;
export const HEART_MID_TRACT = 150e6;
/** Two hearts sit no nearer than this. */
export const HEART_SPACING_LI = 10000;
/** A heart sits at least this far from people. */
export const HEART_MIN_LI = 3000;

/** A band is a third of a realm; what lives in it, and the rarity of what you find there. */
export interface Band {
  realm: RealmId;
  /** Which third: 1 early (layers 1 to 3), 2 middle, 3 late; null for a realm taken whole. */
  third: 1 | 2 | 3 | null;
  name: string;
  finds: string;
}

const third = (realm: RealmId, words: string, finds: [string, string, string]): Band[] =>
  ([1, 2, 3] as const).map((n) => ({
    realm,
    third: n,
    name: `${words}, ${['early', 'middle', 'late'][n - 1]}`,
    finds: finds[n - 1]!,
  }));

export const BANDS: readonly Band[] = [
  { realm: 'qi-condensation', third: 1, name: 'layers 1 to 3', finds: 'white and green' },
  { realm: 'qi-condensation', third: 2, name: 'layers 4 to 6', finds: 'green' },
  { realm: 'qi-condensation', third: 3, name: 'layers 7 to 9', finds: 'green and blue' },
  ...third('foundation-establishment', 'Foundation', ['blue', 'blue', 'blue and purple']),
  ...third('core-formation', 'Core Formation', ['purple', 'purple', 'purple and gold']),
  ...third('nascent-soul', 'Nascent Soul', ['gold', 'gold', 'gold and red']),
  ...third('deity-transformation', 'Deity Transformation', ['red', 'red', 'red']),
  ...third('void-refinement', 'Void Refinement', ['red', 'red', 'red']),
  { realm: 'body-integration', third: null, name: 'Body Integration', finds: 'red' },
  { realm: 'mahayana', third: null, name: 'Mahayana', finds: 'red' },
  {
    realm: 'tribulation-transcendence',
    third: null,
    name: 'Tribulation Transcendence',
    finds: 'red',
  },
];

/** Ground a whole realm (three bands) above you finds you first. */
export const PULL_IN_BANDS = 3;

// ---------------------------------------------------------------- sites

/** Wild sites seeded to a tract or a kingdom, and the share hidden. */
export const SITES_PER_AREA = 9;
export const HIDDEN_SHARE = 0.2;
/** No two sites nearer than this. */
export const SITE_SPACING_LI = 1700;
