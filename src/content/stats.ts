// The numbers tree nodes move, and later talents, gear and pills. Each effect names one of these
// and a value; src/core/stats.ts adds them up and the rules read the totals. A stat with
// `arrives` set has no rule reading it yet: it counts once that system ships.

export type StatUnit =
  /** 0.1 means +10% on whatever the stat multiplies. */
  | 'percent'
  /** Added straight to a chance: 0.03 means +3 points of odds. */
  | 'odds'
  | 'years'
  | 'points'
  | 'stages';

export interface StatInfo {
  name: string;
  unit: StatUnit;
  /** What it changes, for the tooltip. */
  what: string;
  /** The system that will read it, when none does yet. */
  arrives?: 'combat' | 'crafting' | 'the map';
}

export const STATS = {
  // Read by the cultivation rules now.
  qiGain: { name: 'Qi gain', unit: 'percent', what: 'qi from each day of qi seclusion' },
  bodyGain: { name: 'Tempering', unit: 'percent', what: 'tempering from each day of body work' },
  soulGain: { name: 'Nourishment', unit: 'percent', what: 'nourishment from each soul day' },
  insightGain: { name: 'Insight', unit: 'percent', what: 'insight from study and seclusion' },
  practiceGain: { name: 'Practice', unit: 'percent', what: 'mastery from each practice day' },
  stoneQi: { name: 'Stone fuel', unit: 'percent', what: 'qi from each spirit stone burned' },
  minorOdds: { name: 'Minor odds', unit: 'odds', what: 'the odds of minor breakthroughs' },
  majorOdds: { name: 'Major odds', unit: 'odds', what: 'the odds of major breakthroughs' },
  failLoss: { name: 'Failure loss', unit: 'percent', what: 'the bar a failed breakthrough costs' },
  setbackTime: {
    name: 'Setbacks',
    unit: 'percent',
    what: 'how long unsettled qi and injuries last',
  },
  lifespan: { name: 'Lifespan', unit: 'years', what: 'years added to your lifespan' },
  aptitude: {
    name: 'Aptitude',
    unit: 'points',
    what: 'Aptitude, which speeds every seclusion day',
  },
  // Read once combat arrives (M2).
  qiPool: {
    name: 'Qi pool',
    unit: 'percent',
    what: 'the qi you carry into a fight',
    arrives: 'combat',
  },
  qiRecovery: {
    name: 'Qi recovery',
    unit: 'percent',
    what: 'qi regained mid-fight when you defend',
    arrives: 'combat',
  },
  techniqueCost: {
    name: 'Technique cost',
    unit: 'percent',
    what: 'the qi each technique costs',
    arrives: 'combat',
  },
  techniquePower: {
    name: 'Technique power',
    unit: 'percent',
    what: 'the power of qi techniques',
    arrives: 'combat',
  },
  hp: { name: 'HP', unit: 'percent', what: 'your HP', arrives: 'combat' },
  physicalDamage: {
    name: 'Physical damage',
    unit: 'percent',
    what: 'the damage of physical strikes and techniques',
    arrives: 'combat',
  },
  physicalResist: {
    name: 'Physical resistance',
    unit: 'percent',
    what: 'physical damage turned aside',
    arrives: 'combat',
  },
  poisonResist: {
    name: 'Poison resistance',
    unit: 'percent',
    what: 'poison damage turned aside',
    arrives: 'combat',
  },
  lightningResist: {
    name: 'Lightning resistance',
    unit: 'percent',
    what: 'lightning damage turned aside, tribulations included',
    arrives: 'combat',
  },
  regeneration: {
    name: 'Regeneration',
    unit: 'percent',
    what: 'HP regained after and between fights',
    arrives: 'combat',
  },
  agility: {
    name: 'Agility',
    unit: 'points',
    what: 'Agility: turn order, evasion, fleeing',
    arrives: 'combat',
  },
  soulDefense: {
    name: 'Soul defense',
    unit: 'percent',
    what: 'resistance to realm pressure, illusions and heart demons',
    arrives: 'combat',
  },
  perception: {
    name: 'Perception',
    unit: 'percent',
    what: 'seeing through feints, ambushes and concealment',
    arrives: 'combat',
  },
  // Read once the map and crafting arrive (M3, M4).
  concealment: {
    name: 'Concealment',
    unit: 'stages',
    what: 'stages your realm reads lower to others',
    arrives: 'the map',
  },
  flight: { name: 'Flight', unit: 'percent', what: 'how far you fly in a day', arrives: 'the map' },
  divineSense: {
    name: 'Divine sense',
    unit: 'percent',
    what: 'how far your senses reach, and how much map they reveal',
    arrives: 'the map',
  },
  attention: {
    name: 'Split attention',
    unit: 'points',
    what: 'one more flying sword, puppet or production queue',
    arrives: 'crafting',
  },
  craftPrecision: {
    name: 'Steady hands',
    unit: 'percent',
    what: 'precision at the furnace, forge, array and talisman desk',
    arrives: 'crafting',
  },
} as const satisfies Record<string, StatInfo>;

export type StatId = keyof typeof STATS;
export const STAT_IDS = Object.keys(STATS) as StatId[];

export function statInfo(id: StatId): StatInfo {
  return STATS[id];
}

/** One change a node, talent or item makes. */
export interface Effect {
  stat: StatId;
  value: number;
}
