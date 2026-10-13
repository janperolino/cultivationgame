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
  | 'stages'
  /** Multiplies with every other source instead of adding: 0.1 means ×1.1. */
  | 'times';

export interface StatInfo {
  name: string;
  unit: StatUnit;
  /** What it changes, for the tooltip. */
  what: string;
  /** The system that will read it, when none does yet. */
  arrives?:
    'combat' | 'crafting' | 'the map' | 'the Daos' | 'the Ways' | 'encounters' | 'tribulations';
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
  // The Breath branch: read by attended seclusion (core/attention.ts) while you attend.
  breathReach: { name: 'Catch reach', unit: 'percent', what: 'how far you draw orbs in from' },
  focusDrain: { name: 'Focus drain', unit: 'percent', what: 'how fast focus drains to the floor' },
  focusCeiling: {
    name: 'Focus ceiling',
    unit: 'percent',
    what: 'the most attention adds to qi speed at full focus',
  },
  twinBreath: { name: 'Twin streams', unit: 'points', what: 'more orbs drawn in with each breath' },
  heatLimit: { name: 'Cool channels', unit: 'percent', what: 'how much heat before unsettling' },
  stillPool: {
    name: 'Still Pool',
    unit: 'points',
    what: 'resting the pointer on the dantian stops focus draining',
  },
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
  gradeMargin: {
    name: 'Grade margin',
    unit: 'points',
    what: 'the margin a major breakthrough brings, which sets its grade',
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
  fortune: {
    name: 'Fortune',
    unit: 'points',
    what: 'Fortune: critical hits and extra drops',
    arrives: 'combat',
  },
  fireDamage: {
    name: 'Fire damage',
    unit: 'percent',
    what: 'the damage of fire techniques',
    arrives: 'combat',
  },
  fireResist: {
    name: 'Fire resistance',
    unit: 'percent',
    what: 'fire damage turned aside',
    arrives: 'combat',
  },
  yinResist: {
    name: 'Yin resistance',
    unit: 'percent',
    what: 'yin chill and ghost damage turned aside',
    arrives: 'combat',
  },
  // The sheet's lines (design § Combat), carried by capstones and a few late notables: Hit
  // multiplies Accuracy, Harm multiplies Attack, Hold multiplies HP.
  hit: { name: 'Hit', unit: 'points', what: 'Accuracy, 5% a point', arrives: 'combat' },
  harm: {
    name: 'Harm',
    unit: 'times',
    what: 'Attack: all the damage you deal',
    arrives: 'combat',
  },
  hold: {
    name: 'Hold',
    unit: 'times',
    what: 'your HP, and the damage it takes to bring you down',
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
  arraySight: {
    name: 'Array sight',
    unit: 'points',
    what: 'seeing the eye of an array at your soul tier',
    arrives: 'crafting',
  },
  // Read once the Daos and Ways arrive (M2, M3). Talents that touch a Dao store them now.
  swordInsight: {
    name: 'Sword Dao insight',
    unit: 'percent',
    what: 'insight toward the Sword Dao',
    arrives: 'the Daos',
  },
  swordChecks: {
    name: 'Sword checks',
    unit: 'points',
    what: 'checks made with a sword',
    arrives: 'the Daos',
  },
  swordPractice: {
    name: 'Sword practice',
    unit: 'percent',
    what: 'mastery from practicing sword techniques',
    arrives: 'the Daos',
  },
  formationInsight: {
    name: 'Formation Dao insight',
    unit: 'percent',
    what: 'insight toward the Formation Dao',
    arrives: 'the Daos',
  },
  ghostWay: {
    name: 'Ghost Way',
    unit: 'percent',
    what: 'how fast the Ghost Way grows',
    arrives: 'the Ways',
  },
  // Read once encounters and tribulations arrive (M3, Core Formation).
  encounterLuck: {
    name: 'Fortuitous encounters',
    unit: 'percent',
    what: 'how often the world turns lucky for you rather than against you',
    arrives: 'encounters',
  },
  tribulation: {
    name: 'Tribulation strength',
    unit: 'percent',
    what: 'how hard heavenly tribulations strike you',
    arrives: 'tribulations',
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
