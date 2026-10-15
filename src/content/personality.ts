// A person's nature (design § Professions, people and powers, NPC basics; P3.4's talk, Jan's call
// that every kind of person should exist): motives, what they want; eleven personality axes, how
// they are, each from −2 to +2 with most people 0 on most, two or three leans a person; quirks,
// what really is on or off; likes read from who they are; and a voice, so the narrator can't make
// everyone sound alike. Each axis owns one area: the tags it weights, and what it moves in a
// check or a scene. core/resolver/nature.ts rolls and reads them.
import type { LadderId } from './cultivation.ts';
import type { MemoryId, MemoryTag } from './memories.ts';

// ── Motives ──────────────────────────────────────────────────────────────────────────────────

export const MOTIVES = {
  greed: { name: 'greed', tags: ['payment', 'theft'] },
  ambition: { name: 'ambition', tags: ['service', 'prize'] },
  fear: { name: 'fear', tags: ['threat', 'rescue'] },
  loyalty: { name: 'loyalty to their power', tags: ['power'] },
  family: { name: 'family', tags: ['kin'] },
  revenge: { name: 'revenge', tags: ['harm'] },
  duty: { name: 'duty or faith', tags: ['deceit'] },
  pride: { name: 'pride', tags: ['insult', 'threat', 'face'] },
  curiosity: { name: 'curiosity', tags: ['knowledge'] },
} as const satisfies Record<string, { name: string; tags: readonly MemoryTag[] }>;
export type MotiveId = keyof typeof MOTIVES;
export const MOTIVE_IDS = Object.keys(MOTIVES) as MotiveId[];

/** What an offer can meet: one of their motives, or a quirk's way in. */
export const OFFERS = [...MOTIVE_IDS, 'wager', 'flattery'] as const;
export type OfferId = (typeof OFFERS)[number];

// ── The axes ─────────────────────────────────────────────────────────────────────────────────

/** When you learn a lean: at first meeting, only by their deeds, or when it comes up. */
export type AxisShows = 'outer' | 'inner' | 'when';

export interface Axis {
  name: string;
  /** The word at −2 and at +2; ±1 reads "a little …". */
  low: string;
  high: string;
  shows: AxisShows;
}

export const AXES = {
  temper: { name: 'Temper', low: 'calm', high: 'hot-tempered', shows: 'outer' },
  nerve: { name: 'Nerve', low: 'craven', high: 'reckless', shows: 'when' },
  honesty: { name: 'Honesty', low: 'honest', high: 'deceitful', shows: 'when' },
  heart: { name: 'Heart', low: 'cruel', high: 'merciful', shows: 'inner' },
  hand: { name: 'Hand', low: 'stingy', high: 'generous', shows: 'when' },
  trust: { name: 'Trust', low: 'guarded', high: 'open', shows: 'when' },
  memory: { name: 'Memory', low: 'forgiving', high: 'vengeful', shows: 'inner' },
  pride: { name: 'Pride', low: 'humble', high: 'arrogant', shows: 'outer' },
  bearing: { name: 'Bearing', low: 'reticent', high: 'gregarious', shows: 'outer' },
  conscience: { name: 'Conscience', low: 'ruthless', high: 'righteous', shows: 'inner' },
  fidelity: { name: 'Fidelity', low: 'fickle', high: 'loyal', shows: 'inner' },
} as const satisfies Record<string, Axis>;
export type AxisId = keyof typeof AXES;
export const AXIS_IDS = Object.keys(AXES) as AxisId[];
export const LEANS = [-2, -1, 1, 2] as const;
export type Lean = (typeof LEANS)[number];

/** A factor an axis sets: its value at −2 and at +2, halfway to 1 at ±1, 1 at 0. */
export interface AxisFactor {
  axis: AxisId;
  low: number;
  high: number;
}

/** How the axes weight a memory's tag. */
export const TAG_AXES: Partial<Record<MemoryTag, readonly AxisFactor[]>> = {
  insult: [
    { axis: 'temper', low: 0.5, high: 1.5 },
    { axis: 'pride', low: 0.75, high: 1.25 },
  ],
  face: [
    { axis: 'temper', low: 0.5, high: 1.5 },
    { axis: 'pride', low: 0.75, high: 1.25 },
  ],
  deceit: [{ axis: 'honesty', low: 1.5, high: 0.5 }],
  rescue: [{ axis: 'heart', low: 0.5, high: 1.5 }],
  payment: [{ axis: 'hand', low: 1.5, high: 0.75 }],
  company: [{ axis: 'bearing', low: 0.5, high: 1.5 }],
  knowledge: [{ axis: 'bearing', low: 0.5, high: 1.5 }],
};

/** How long memories last, by the Memory axis: bad ones and good ones the other way round. */
export const FADE_BAD: AxisFactor = { axis: 'memory', low: 0.5, high: 2 };
export const FADE_GOOD: AxisFactor = { axis: 'memory', low: 2, high: 0.5 };
/** A first impression, a point of value a lean of Trust: −10 to +10. */
export const FIRST_LOOK_EACH = 5;
/** "Beneath me", a lean of Pride above 0, while you show a lower realm. */
export const BENEATH_EACH = -5;
/** What the axes do in checks. */
export const COMPOSURE_AXIS: AxisFactor = { axis: 'nerve', low: 0.75, high: 1.25 };
export const BARGAIN_AXIS: AxisFactor = { axis: 'hand', low: 1.5, high: 0.75 };
export const LIE_AXIS: AxisFactor = { axis: 'trust', low: 1.5, high: 0.5 };
/** At this lean of Trust they are always suspicious. */
export const ALWAYS_SUSPICIOUS = -2;
/** The righteous feel "did evil" at half and in full. */
export const EVIL_BY_CONSCIENCE = { 1: 0.5, 2: 1 } as const;

// ── Quirks ───────────────────────────────────────────────────────────────────────────────────

export interface Quirk {
  name: string;
  /** A memory row it multiplies, and by how much. */
  row?: { id: MemoryId; by: number };
  /** An offer that meets them as a motive would. */
  offer?: OfferId;
  /** A confession's resistance. */
  confess?: number;
  /** What gifts count. */
  gifts?: number;
  /** An item kind shown that counts as proof. */
  prop?: string;
  /** Can't be held with this one. */
  not?: string;
}

export const QUIRKS = {
  gambler: { name: 'gambler', offer: 'wager' },
  drinker: { name: 'drinker', row: { id: 'shared-drink', by: 3 } },
  glutton: { name: 'glutton', row: { id: 'shared-drink', by: 2 } },
  superstitious: { name: 'superstitious', prop: 'talisman' },
  vain: { name: 'vain', offer: 'flattery' },
  amorous: { name: 'amorous', confess: 0.5, not: 'chaste' },
  chaste: { name: 'chaste', confess: 2, gifts: 0.5, not: 'amorous' },
  pious: { name: 'pious', row: { id: 'kept-promise', by: 2 } },
  collector: { name: 'collector' },
  bookish: { name: 'bookish', row: { id: 'told-new', by: 2 } },
} as const satisfies Record<string, Quirk>;
export type QuirkId = keyof typeof QUIRKS;
export const QUIRK_IDS = Object.keys(QUIRKS) as QuirkId[];

/** Out of a hundred, how many people have none, one or two quirks. */
export const QUIRK_ODDS = { none: 55, one: 38 } as const;

// ── Likes ────────────────────────────────────────────────────────────────────────────────────

export const GIFT_KINDS = [
  'stones',
  'jade',
  'wine',
  'tea',
  'delicacies',
  'blades',
  'armor',
  'herbs',
  'pills',
  'manuals',
  'books',
  'talismans',
  'beast-cores',
  'incense',
  'curios',
  'trinkets',
] as const;
export type GiftKind = (typeof GIFT_KINDS)[number];

/** Likes are read from who they are, in this order, the first two counting. */
export const QUIRK_LIKES: Partial<Record<QuirkId, GiftKind>> = {
  drinker: 'wine',
  glutton: 'delicacies',
  superstitious: 'talismans',
  pious: 'incense',
  collector: 'curios',
  bookish: 'books',
};
export const MOTIVE_LIKES: Partial<Record<MotiveId, GiftKind>> = {
  greed: 'jade',
  ambition: 'manuals',
  curiosity: 'curios',
  fear: 'talismans',
  pride: 'blades',
  family: 'trinkets',
  duty: 'tea',
};
export const PATH_LIKES: Record<LadderId, GiftKind> = {
  qi: 'pills',
  body: 'beast-cores',
  soul: 'incense',
};
export const LIKES_COUNTED = 2;

// ── Trades and roles ─────────────────────────────────────────────────────────────────────────

/** A voice's register. */
export const REGISTERS = ['courtly', 'plain', 'coarse', 'clipped', 'florid'] as const;
export type Register = (typeof REGISTERS)[number];

export interface Trade {
  name: string;
  likes: GiftKind;
  register: Register;
  /** What they keep coming back to. */
  topic: string;
  /** How the trade leans a nature's roll: the axes it favors, and which way. */
  leans: Partial<Record<AxisId, -1 | 1>>;
}

export const TRADES = {
  ferryman: {
    name: 'ferryman',
    likes: 'wine',
    register: 'coarse',
    topic: 'the river and its prices',
    leans: { bearing: 1 },
  },
  soldier: {
    name: 'soldier',
    likes: 'blades',
    register: 'clipped',
    topic: 'the Wall, and who held it',
    leans: { fidelity: 1, nerve: 1 },
  },
  swordsman: {
    name: 'sword cultivator',
    likes: 'blades',
    register: 'clipped',
    topic: 'a sword they once saw',
    leans: { pride: 1 },
  },
  disciple: {
    name: 'sect disciple',
    likes: 'pills',
    register: 'courtly',
    topic: 'contribution, and who has more of it',
    leans: { pride: 1, fidelity: 1 },
  },
  elder: {
    name: 'sect elder',
    likes: 'manuals',
    register: 'courtly',
    topic: 'the sect as it used to be',
    leans: { pride: 1 },
  },
  alchemist: {
    name: 'alchemist',
    likes: 'herbs',
    register: 'florid',
    topic: 'a furnace and what it nearly made',
    leans: { bearing: -1 },
  },
  scholar: {
    name: 'scholar',
    likes: 'books',
    register: 'courtly',
    topic: 'what the old texts say',
    leans: { honesty: -1 },
  },
  merchant: {
    name: 'merchant',
    likes: 'jade',
    register: 'florid',
    topic: 'what things cost this season',
    leans: { hand: -1, bearing: 1 },
  },
  peddler: {
    name: 'peddler',
    likes: 'trinkets',
    register: 'florid',
    topic: 'the next town on the road',
    leans: { honesty: 1, bearing: 1 },
  },
  hunter: {
    name: 'beast hunter',
    likes: 'beast-cores',
    register: 'plain',
    topic: 'tracks, and what made them',
    leans: { nerve: 1 },
  },
  farmer: {
    name: 'farmer',
    likes: 'delicacies',
    register: 'plain',
    topic: 'the weather and the harvest',
    leans: { heart: 1 },
  },
  smith: {
    name: 'smith',
    likes: 'blades',
    register: 'plain',
    topic: 'good iron, and bad',
    leans: { honesty: -1 },
  },
  clerk: {
    name: 'clerk',
    likes: 'tea',
    register: 'clipped',
    topic: 'the ledger and its rules',
    leans: { trust: -1 },
  },
  official: {
    name: 'official',
    likes: 'jade',
    register: 'courtly',
    topic: 'the dynasty and its decrees',
    leans: { pride: 1, hand: -1 },
  },
  monk: {
    name: 'monk',
    likes: 'incense',
    register: 'plain',
    topic: 'karma, and what it asks',
    leans: { heart: 1, honesty: -1, conscience: 1 },
  },
  healer: {
    name: 'healer',
    likes: 'herbs',
    register: 'plain',
    topic: 'who is sick and why',
    leans: { heart: 1 },
  },
  smuggler: {
    name: 'smuggler',
    likes: 'wine',
    register: 'coarse',
    topic: 'who is watching the crossings',
    leans: { honesty: 1, trust: -1 },
  },
  bandit: {
    name: 'bandit',
    likes: 'stones',
    register: 'coarse',
    topic: 'the last job, and the next',
    leans: { heart: -1, conscience: -1 },
  },
  herder: {
    name: 'herder',
    likes: 'beast-cores',
    register: 'plain',
    topic: 'the herds and the grass',
    leans: { bearing: -1 },
  },
  tester: {
    name: 'imperial tester',
    likes: 'tea',
    register: 'courtly',
    topic: 'roots, and how rare a good one is',
    leans: { pride: 1 },
  },
} as const satisfies Record<string, Trade>;
export type TradeId = keyof typeof TRADES;
export const TRADE_IDS = Object.keys(TRADES) as TradeId[];

/** The site kinds a trade knows along its way, the private tier of what they know (P3.4b). */
export const TRADE_SITES: Record<TradeId, readonly string[]> = {
  ferryman: ['village', 'town'],
  soldier: ['den', 'village'],
  swordsman: ['cave'],
  disciple: ['cave'],
  elder: ['ruin', 'cave'],
  alchemist: ['herb-valley'],
  scholar: ['ruin', 'shrine'],
  merchant: ['town'],
  peddler: ['village', 'town'],
  hunter: ['den', 'cave'],
  farmer: ['village'],
  smith: ['town'],
  clerk: ['town'],
  official: ['town', 'village'],
  monk: ['shrine'],
  healer: ['herb-valley'],
  smuggler: ['cave', 'town'],
  bandit: ['cave', 'village'],
  herder: ['den', 'village'],
  tester: ['village', 'town'],
};

/** A trade's lean wins its axis's direction this many times out of a hundred. */
export const TRADE_LEAN_ODDS = 75;
/** A trade's axes are this many times as likely to be one of the person's leans. */
export const TRADE_AXIS_WEIGHT = 3;

// ── Voices ───────────────────────────────────────────────────────────────────────────────────

/** Registers the axes push toward, before the trade's own. */
export const AXIS_REGISTERS: Partial<Record<AxisId, { low?: Register; high?: Register }>> = {
  temper: { high: 'clipped' },
  pride: { high: 'courtly' },
  bearing: { low: 'clipped', high: 'florid' },
};

/** Speech habits, by what someone is: a quirk's or a lean's first, then the common pool. */
export const HABITS_BY: Partial<Record<QuirkId | `${AxisId}+` | `${AxisId}-`, readonly string[]>> =
  {
    gambler: ['offers odds on everything', 'calls a risk "a throw of the bones"'],
    drinker: ['raises a cup at every turn', 'measures time in jars of wine'],
    vain: ['mentions their own looks', 'waits to be complimented'],
    superstitious: ['knocks on wood at bad words', 'reads omens in small things'],
    bookish: ['quotes old texts, often wrongly', 'corrects your words'],
    'bearing+': ['never lets a silence stand', 'tells you gossip you did not ask for'],
    'bearing-': ['answers in as few words as possible', 'lets silences run long'],
    'temper+': ['swears by their ancestors', 'raises their voice at the first doubt'],
    'temper-': ['speaks slowly and evenly', 'smiles when they should not'],
    'pride+': ['never uses your name, only "you"', 'speaks of themselves in the third person'],
    'pride-': ['apologizes before they speak', 'calls everyone "elder"'],
    'honesty+': ['answers a question with a question', 'swears oaths too easily'],
    'honesty-': ['says plainly what others hint', 'will not soften bad news'],
    'trust-': ['asks why you want to know', 'watches your hands'],
  };
export const HABITS_COMMON = [
  'talks in river sayings',
  'counts coins aloud',
  'calls everyone "little brother"',
  'repeats the last thing you said',
  'hums when thinking',
  'tells everything as a story about their village',
  'uses proverbs nobody else knows',
  'laughs at their own jokes',
  'speaks of the weather before anything else',
  'calls cultivators "immortals", even the weakest',
] as const;
/** Topics their strongest motive brings up, when their trade doesn't. */
export const MOTIVE_TOPICS: Record<MotiveId, string> = {
  greed: 'the price of things',
  ambition: 'the next realm, and who reached it first',
  fear: 'what is coming, and how to be elsewhere',
  loyalty: 'their power and its honor',
  family: 'their kin',
  revenge: 'an old wrong',
  duty: 'what is owed, and to whom',
  pride: 'their own name',
  curiosity: 'whatever you just mentioned',
};

// ── Rolling a nature ─────────────────────────────────────────────────────────────────────────

/** Leans a person rolls: two or three, out of a hundred. */
export const LEANS_ODDS = { two: 60 } as const;
/** A lean is ±2 rather than ±1 this many times out of a hundred. */
export const STRONG_LEAN_ODDS = 35;
/** Motives a person rolls: one, two or three, out of a hundred. */
export const MOTIVE_ODDS = { one: 35, two: 45 } as const;

// ── A nature ─────────────────────────────────────────────────────────────────────────────────

/** How someone talks: kept, so they sound the same each time you meet them. */
export interface Voice {
  register: Register;
  habit: string;
  topic: string;
}

/** Who someone is: what they want, how they lean, their quirks, their trade, path and voice. */
export interface Nature {
  /** One to three, the strongest first. */
  motives: MotiveId[];
  /** Two or three leans; every other axis stands at 0. */
  axes: Partial<Record<AxisId, Lean>>;
  quirks: QuirkId[];
  trade?: TradeId;
  /** The path they walk, for what they like; a mortal walks none. */
  path?: LadderId;
  voice: Voice;
}

/** Someone with no nature drawn: no motives, no leans, a plain voice. */
export const PLAIN_NATURE: Nature = {
  motives: [],
  axes: {},
  quirks: [],
  voice: { register: 'plain', habit: '', topic: '' },
};
