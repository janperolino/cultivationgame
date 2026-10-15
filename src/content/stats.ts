// The numbers tree nodes move, and later talents, gear and pills. Each effect names one of these
// and a value; src/core/stats.ts adds them up and the rules read the totals. A stat with
// `arrives` set has no rule reading it yet: it counts once that system ships.
import {
  COMBAT_DAO_IDS,
  COMBAT_DAOS,
  DAO_STAT_KINDS,
  type CombatDaoId,
  type DaoStatKind,
} from './daos.ts';

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
    | 'combat'
    | 'crafting'
    | 'the map'
    | 'the Daos'
    | 'the Ways'
    | 'encounters'
    | 'tribulations'
    | 'the storm card';
}

const BASE_STATS = {
  // Read by the cultivation rules now.
  qiGain: { name: 'Qi gain', unit: 'percent', what: 'qi from each day of qi seclusion' },
  nightQi: { name: 'Night qi', unit: 'percent', what: 'qi in the night hours, from 亥 to 丑' },
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
  // The Breath branch's second tier (design § Cultivation, the Breath branch): read by attended
  // seclusion while you attend.
  attunedBreath: {
    name: 'Attuned Breath',
    unit: 'percent',
    what: "the worth of an orb of your root's elements",
  },
  resonance: {
    name: 'Heaven and Earth Resonance',
    unit: 'points',
    what: "dawn's purple orbs and the night's yin orbs worth double, and dawn's come more often",
  },
  circulatingThought: {
    name: 'Circulating Thought',
    unit: 'percent',
    what: 'the attended insight trickle at full focus',
  },
  longBreath: {
    name: 'Long Breath',
    unit: 'percent',
    what: 'a slower breath cycle that catches more each breath',
  },
  unknotting: {
    name: 'Unknotting',
    unit: 'points',
    what: 'knots harmless, and a caught one gives a little',
    arrives: 'the storm card',
  },
  // Combat (design § Combat): the sheet and the fight read these.
  qiPool: { name: 'Qi pool', unit: 'percent', what: 'the qi you carry into a fight' },
  qiRecovery: {
    name: 'Qi recovery',
    unit: 'percent',
    what: 'qi regained mid-fight when you defend',
  },
  techniqueCost: { name: 'Technique cost', unit: 'percent', what: 'the qi each technique costs' },
  techniquePower: { name: 'Technique power', unit: 'percent', what: 'the power of qi techniques' },
  hp: { name: 'HP', unit: 'percent', what: 'your HP' },
  physicalDamage: {
    name: 'Physical damage',
    unit: 'percent',
    what: 'the damage of physical strikes and techniques',
  },
  physicalResist: {
    name: 'Physical resistance',
    unit: 'percent',
    what: 'physical damage turned aside',
  },
  poisonResist: { name: 'Poison resistance', unit: 'percent', what: 'poison damage turned aside' },
  lightningResist: {
    name: 'Lightning resistance',
    unit: 'percent',
    what: 'lightning damage turned aside, tribulations included',
  },
  fireDamage: { name: 'Fire damage', unit: 'percent', what: 'the damage of fire actions' },
  fireResist: { name: 'Fire resistance', unit: 'percent', what: 'fire damage turned aside' },
  poisonDamage: { name: 'Poison damage', unit: 'percent', what: 'the damage of poison actions' },
  regeneration: {
    name: 'Regeneration',
    unit: 'percent',
    what: 'HP regained after and between fights',
    arrives: 'encounters',
  },
  agility: { name: 'Agility', unit: 'points', what: 'Agility: turn order, evasion, fleeing' },
  fortune: { name: 'Fortune', unit: 'points', what: 'Fortune: critical hits and extra drops' },
  yinResist: {
    name: 'Yin resistance',
    unit: 'percent',
    what: 'yin chill and ghost damage turned aside',
    arrives: 'the Ways',
  },
  // The sheet's lines (design § Combat), carried by capstones and a few late notables: Hit
  // multiplies Accuracy, Harm multiplies Attack, Hold multiplies HP.
  hit: { name: 'Hit', unit: 'points', what: 'Accuracy, 5% a point' },
  harm: { name: 'Harm', unit: 'times', what: 'Attack: all the damage you deal' },
  hold: {
    name: 'Hold',
    unit: 'times',
    what: 'your HP, and the damage it takes to bring you down',
  },
  evasion: { name: 'Evasion', unit: 'percent', what: 'Evasion against every attack' },
  initiative: { name: 'Reach', unit: 'points', what: 'turn order, as Agility counts it' },
  critDamage: { name: 'Critical damage', unit: 'percent', what: 'what a critical hit deals' },
  woundedCrit: {
    name: "Butcher's Nerve",
    unit: 'odds',
    what: 'critical chance against a foe under half their HP',
  },
  defendGuard: { name: 'Guard', unit: 'percent', what: 'the Evasion a defend adds' },
  fightRegen: {
    name: 'Mending',
    unit: 'percent',
    what: 'HP regained at the start of each turn of a fight, as a share of your HP',
  },
  qiOnHit: {
    name: 'Breath of Blows',
    unit: 'percent',
    what: 'qi regained on each hit you land, as a share of your pool',
  },
  intimidate: {
    name: 'Intimidation',
    unit: 'percent',
    what: 'bluffing and intimidating in a fight',
  },
  burnTurns: { name: 'Lasting flame', unit: 'points', what: 'turns a burn lasts' },
  burnBite: { name: 'Searing', unit: 'percent', what: 'what a burn deals each turn' },
  bleedBite: { name: 'Deep cuts', unit: 'percent', what: 'what a bleed deals each turn' },
  rootTurns: { name: 'Rooting', unit: 'points', what: 'turns a root holds' },
  chillTurns: { name: 'Lasting chill', unit: 'points', what: 'turns a chill holds' },
  staggerResist: {
    name: 'Stagger resistance',
    unit: 'odds',
    what: 'the chance a stagger slides off you',
  },
  // Rule twists the Dao nodes carry (design § The combat Daos): a value above zero turns the rule
  // on, and a percent or times value sizes it. core/combat/fight.ts reads them.
  spreadBurn: {
    name: 'Rising Flame',
    unit: 'points',
    what: 'a critical that burns spreads the burn to a second foe',
  },
  stackBurn: { name: 'Lasting Burn', unit: 'points', what: 'your burns stack on a foe' },
  seaOfFlame: {
    name: 'Sea of Flame',
    unit: 'points',
    what: 'every burn ticks on every burning foe at once',
  },
  chillSlow: { name: 'Chill', unit: 'points', what: 'a foe you chill acts last' },
  undertow: { name: 'Undertow', unit: 'points', what: 'a foe you chill loses its minor action' },
  freezingEdge: {
    name: 'Freezing Edge',
    unit: 'points',
    what: 'a critical on a chilled foe freezes it',
  },
  mistStep: {
    name: 'Mist Step',
    unit: 'points',
    what: 'the first hit against you each fight does half',
  },
  riptide: { name: 'Riptide', unit: 'times', what: 'water damage against a chilled foe' },
  deepRoots: { name: 'Deep Roots', unit: 'percent', what: 'mending while a foe is rooted' },
  bindingVines: {
    name: 'Binding Vines',
    unit: 'points',
    what: 'a foe you root loses a fifth of its Evasion besides',
  },
  evergreen: {
    name: 'Evergreen',
    unit: 'points',
    what: 'once a fight, a blow that would fell you leaves a quarter of your HP',
  },
  stackBleed: { name: 'Bleed', unit: 'points', what: 'your bleeds stack on a foe' },
  severing: {
    name: 'Severing',
    unit: 'points',
    what: 'a metal hit bleeds on any hit, not only a critical',
  },
  temperedEdge: {
    name: 'Tempered Edge',
    unit: 'times',
    what: 'metal damage against a bleeding foe',
  },
  unbreaking: {
    name: 'Unbreaking',
    unit: 'points',
    what: "a bleeding foe's armor counts a rarity step lower",
  },
  staggerSlow: { name: 'Stagger', unit: 'points', what: 'a foe you stagger acts last' },
  unmoved: {
    name: 'Unmoved',
    unit: 'points',
    what: 'the first hit against you each turn does half',
  },
  crush: { name: 'Crush', unit: 'times', what: 'earth damage against a staggered foe' },
  mountainFalls: { name: 'Mountain Falls', unit: 'points', what: 'a critical staggers every foe' },
  oneSword: {
    name: 'One Sword',
    unit: 'percent',
    what: 'the first sword strike or technique of a fight',
  },
  swordRain: {
    name: 'Sword Rain',
    unit: 'points',
    what: 'once a fight, a sword technique strikes every foe',
  },
  swordAura: {
    name: 'Sword pressure',
    unit: 'percent',
    what: "the Accuracy your foes lose to your sword's pressure",
  },
  clearHeart: { name: 'Clear Heart', unit: 'points', what: 'daze cannot touch you' },
  momentum: {
    name: 'Momentum',
    unit: 'percent',
    what: 'saber damage added by each hit in a row',
  },
  cleavingTide: { name: 'Cleaving Tide', unit: 'points', what: 'momentum carries over a miss' },
  executioner: {
    name: 'Executioner',
    unit: 'times',
    what: 'criticals against a foe under half their HP',
  },
  cleave: {
    name: 'Unstoppable Cleave',
    unit: 'percent',
    what: 'the share of a saber critical carried to a second foe',
  },
  firstBlood: { name: 'First Blood', unit: 'points', what: 'you act first in the first turn' },
  firstStrike: {
    name: 'Long Reach',
    unit: 'percent',
    what: 'your first attack of each fight',
  },
  sweep: {
    name: 'Sweep',
    unit: 'percent',
    what: 'the share of a spear hit a second foe takes',
  },
  whirl: { name: 'Whirl', unit: 'points', what: 'a sweep reaches every other foe' },
  shieldWall: {
    name: 'Shield Wall',
    unit: 'percent',
    what: 'the Evasion your defend lends each ally',
  },
  banner: { name: 'Banner', unit: 'percent', what: "your allies' Accuracy" },
  dragonThrust: {
    name: 'Dragon Thrust',
    unit: 'points',
    what: 'your first thrust each turn cannot miss',
  },
  flurry: {
    name: 'Flurry',
    unit: 'percent',
    what: 'a fist strike as your minor action, at this share of a strike',
  },
  hundredFists: {
    name: 'Hundred Fists',
    unit: 'points',
    what: 'once a fight, a critical grants a second main action',
  },
  steady: { name: 'Immovable', unit: 'points', what: 'stagger and unbalance cannot touch you' },
  bodyAsOne: {
    name: 'Fist and Body as One',
    unit: 'stages',
    what: 'unarmed and fist strikes count your body this many stages higher',
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
    what: 'noticing the hidden, reading a realm, seeing through a veil or a disguise',
  },
  // The resolver's capabilities (content/resolver.ts): a stat naming one helps its checks.
  stealth: { name: 'Stealth', unit: 'percent', what: 'sneaking, hiding, stealing and tailing' },
  force: { name: 'Force', unit: 'percent', what: 'breaking, lifting, holding and enduring' },
  speed: { name: 'Speed', unit: 'percent', what: 'chasing, fleeing and outrunning' },
  find: { name: 'Finding', unit: 'percent', what: 'searching and tracking' },
  // Gear (design § Items and gear): treasure slots open from the Qi and Soul trees.
  treasureSlots: {
    name: 'Treasure slot',
    unit: 'points',
    what: 'a slot for an artifact that is properties alone',
  },
  // Concealment is read by the resolver (P3.3); the rest once the map and crafting arrive (M3, M4).
  concealment: {
    name: 'Concealment',
    unit: 'stages',
    what: 'how many stages below your realm you can show',
  },
  // Read by the resolver's erase (P3.4b): a trace on a soul weaker than yours can be cut away.
  traceSevering: {
    name: 'Severing the trace',
    unit: 'points',
    what: 'erasing a trace left on a soul, if your soul is stronger than the trace',
  },
  flight: { name: 'Flight', unit: 'percent', what: 'how far you fly in a day', arrives: 'the map' },
  divineSense: {
    name: 'Divine sense',
    unit: 'percent',
    what: 'how far your senses reach, and how much map they reveal',
    arrives: 'the map',
  },
  // Not attended seclusion's attention (core/attention.ts): a point of this is one more practice
  // slot now, and one more production queue, puppet or flying sword as those arrive.
  splitAttention: {
    name: 'Split attention',
    unit: 'points',
    what: 'one more practice slot, production queue, puppet or flying sword',
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
  // The element Daos' craft and travel side paths (design § The combat Daos), read once crafting,
  // the map and encounters arrive.
  fireControl: {
    name: 'Fire control',
    unit: 'percent',
    what: "heat, and alchemy's fire control",
    arrives: 'crafting',
  },
  forgeSense: {
    name: 'Forge sense',
    unit: 'percent',
    what: 'precision at the forge, and ore found',
    arrives: 'crafting',
  },
  herbSense: {
    name: 'Herb sense',
    unit: 'percent',
    what: 'spirit farming, and herbs found',
    arrives: 'crafting',
  },
  herbAge: {
    name: 'Old growth',
    unit: 'percent',
    what: 'how fast herbs age in your garden',
    arrives: 'crafting',
  },
  veinSense: {
    name: 'Vein sense',
    unit: 'percent',
    what: 'geomancy, spirit veins and abode sites found',
    arrives: 'the map',
  },
  seaSense: {
    name: 'Tide sense',
    unit: 'percent',
    what: 'perception and travel at sea',
    arrives: 'the map',
  },
  restQi: {
    name: 'Deep Spring',
    unit: 'percent',
    what: 'qi recovered between fights',
    arrives: 'encounters',
  },
  burrow: {
    name: 'Burrow',
    unit: 'points',
    what: 'cover anywhere, and escape underground',
    arrives: 'encounters',
  },
} as const satisfies Record<string, StatInfo>;

const DAO_STAT_INFO: Record<DaoStatKind, { unit: StatUnit; what: string }> = {
  Power: { unit: 'percent', what: 'Attack' },
  Hit: { unit: 'percent', what: 'Accuracy' },
  Crit: { unit: 'odds', what: 'critical chance' },
  Cost: { unit: 'percent', what: 'qi cost' },
  Pierce: { unit: 'percent', what: "the share of the target's resistance ignored" },
};

type DaoStatId = `${CombatDaoId}${DaoStatKind}`;

/**
 * Each combat Dao's own stats, on the actions it counts (content/daos.ts): firePower, swordHit,
 * metalCrit, fireCost, spearPierce and so on.
 */
const DAO_STATS = Object.fromEntries(
  COMBAT_DAO_IDS.flatMap((d) =>
    DAO_STAT_KINDS.map((k) => [
      `${d}${k}`,
      {
        name: `${COMBAT_DAOS[d].name} ${k === 'Power' ? 'power' : k.toLowerCase()}`,
        unit: DAO_STAT_INFO[k].unit,
        what: `${DAO_STAT_INFO[k].what} on ${COMBAT_DAOS[d].name} Dao actions`,
      },
    ]),
  ),
) as Record<DaoStatId, StatInfo>;

export const STATS = { ...BASE_STATS, ...DAO_STATS };

/** A combat Dao's own stat: `daoStat('fire', 'Power')` is firePower. */
export function daoStat(d: CombatDaoId, k: DaoStatKind): StatId {
  return `${d}${k}`;
}

export type StatId = keyof typeof STATS;
export const STAT_IDS = Object.keys(STATS) as StatId[];

export function statInfo(id: StatId): StatInfo {
  return STATS[id] as StatInfo;
}

/** One change a node, talent or item makes. */
export interface Effect {
  stat: StatId;
  value: number;
}
