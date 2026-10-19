// The resolver's numbers and tables (design § The resolver; P3.3, Jan's calls in its talk). A check
// is a capability against a number, never a roll: your capability is a line sized as the sheet
// sizes it, times the sources that name it, and it faces their capability, a feature's own realm
// or the site's danger realm. Two tables carry everything a later phase adds: CAPABILITIES (what
// can be measured, from which line, and the stat that names it) and ACTS (what can be done, under
// which of the twelve verbs, which capability it reads against what, what a close pass costs and
// what a short one means). A new act or capability is a row here; core/resolver/ never changes for
// one. core/resolver/ holds the rules.
import type { TieId } from './people.ts';
import type { RealmId } from './realms.ts';
import type { StatId } from './stats.ts';

/** The twelve verbs under everything you can try (design § The world, Do whatever you want). */
export const VERBS = [
  'go',
  'look',
  'talk',
  'fight',
  'evade',
  'take',
  'give',
  'use',
  'cultivate',
  'work',
  'rest',
  'make',
] as const;
export type Verb = (typeof VERBS)[number];

// ── The verdict ──────────────────────────────────────────────────────────────────────────────

/** Yours at least this times theirs is clear: you pass. */
export const CLEAR_RATIO = 1.25;
/**
 * Theirs at least this times yours, a whole realm's step, is beyond you: the step can't be tried
 * at all, the one "you can't" scale says (design § The world, Priced, not gated).
 */
export const BEYOND_RATIO = 3.1;

/** Everything that helps a capability multiplies it by at most this (design § The resolver). */
export const HELP_CAP = 2;
/** Each scene feature or item used, three at most, as combat's creativity. */
export const USE_EACH = 1.1;
export const USE_MAX = 3;
/** Each helper, two at most. */
export const HELPER_EACH = 1.2;
export const HELPER_MAX = 2;
/** A technique the step uses: ×1.05 a mastery level past Glimpse, ×1.25 at Origin. */
export const MASTERY_EACH = 1.05;
export const MASTERY_ORIGIN = 1.25;

// ── Capabilities ─────────────────────────────────────────────────────────────────────────────

/**
 * What a capability starts from: a ladder's size; the realm someone shows (what intimidation
 * reads); their own realm; or 1, for people checks, which are not sized by realm.
 */
export type CapabilityBase = 'body' | 'qi' | 'soul' | 'shown' | 'realm' | 'one';

export interface CapabilityInfo {
  name: string;
  base: CapabilityBase;
  /** Multiplied by the Agility factor, outside the help cap. */
  agility?: boolean;
  /** The stat that names it: a node, talent, Way or item moving it counts as help. */
  stat?: StatId;
  what: string;
}

export const CAPABILITIES = {
  perception: {
    name: 'Perception',
    base: 'soul',
    stat: 'perception',
    what: 'noticing the hidden, reading a realm, seeing through a disguise',
  },
  stealth: {
    name: 'Stealth',
    base: 'body',
    agility: true,
    stat: 'stealth',
    what: 'sneaking, hiding, stealing, tailing',
  },
  force: {
    name: 'Force',
    base: 'body',
    stat: 'force',
    what: 'breaking, lifting, holding, enduring',
  },
  speed: {
    name: 'Speed',
    base: 'qi',
    agility: true,
    stat: 'speed',
    what: 'chasing, fleeing, outrunning',
  },
  find: {
    name: 'Finding',
    base: 'soul',
    stat: 'find',
    what: 'searching a place without divine sense, tracking',
  },
  presence: {
    name: 'Presence',
    base: 'shown',
    stat: 'intimidate',
    what: 'how dangerous you look: the realm they read on you and what backs it',
  },
  composure: {
    name: 'Composure',
    base: 'realm',
    what: 'how safe they feel: their realm and what stands behind them',
  },
  leverage: {
    name: 'Leverage',
    base: 'one',
    what: 'what you bring to a talk: trust, an offer, proof, standing',
  },
  resistance: {
    name: 'Resistance',
    base: 'one',
    what: 'what stands against a talk: a motive against it, suspicion of you',
  },
} as const satisfies Record<string, CapabilityInfo>;
export type CapabilityId = keyof typeof CAPABILITIES;
export const CAPABILITY_IDS = Object.keys(CAPABILITIES) as CapabilityId[];

// ── Costs ────────────────────────────────────────────────────────────────────────────────────

/** What a close pass costs (design § The resolver): the act's first unless the step names one. */
export const COSTS = {
  time: 'it takes twice as long',
  witness: 'someone sees',
  wound: 'you are hurt',
  heat: 'the place grows warier of you',
  spent: 'something you used is spent or broken',
  trust: 'they trust you a little less',
  noise: 'it makes noise',
} as const;
export type CostId = keyof typeof COSTS;
export const COST_IDS = Object.keys(COSTS) as CostId[];

/** A close pass's wound: this share off your lines for this many days. */
export const CLOSE_WOUND = { share: 0.1, days: 3 } as const;

// ── Deeds ────────────────────────────────────────────────────────────────────────────────────

/**
 * What a deed is, for heat and who knows. Heat lands on a place when someone there sees it done
 * and on a power when one of its people learns who did it (design § The resolver, What lasts).
 * Karma is heaven's ledger and lands as the deed is done, seen or not; a `weaker` deed costs it
 * only when done to someone of a lower realm (P3.4b). Infamy and renown are the points it carries
 * across its region once someone learns who did it.
 */
export const DEEDS = {
  theft: { name: 'a theft', heat: 1, karma: -1, weaker: true, infamy: 1 },
  robbery: { name: 'a robbery', heat: 1, karma: -1, weaker: true, infamy: 1 },
  assault: { name: 'an attack', heat: 1 },
  /** Finishing the fallen: a life that didn't need taking. A fair fight's dead are not a deed. */
  killing: { name: 'a killing', heat: 3, karma: -5, infamy: 2 },
  massacre: { name: 'a massacre', heat: 5, karma: -50, infamy: 8 },
  lie: { name: 'a lie', heat: 0 },
  threat: { name: 'a threat', heat: 0, karma: -1, weaker: true },
  trespass: { name: 'a trespass', heat: 0 },
  exposure: { name: 'a cover blown', heat: 1 },
  frame: { name: 'a frame', heat: 0, karma: -1, weaker: true, infamy: 3 },
  betrayal: { name: 'a betrayal', heat: 0, karma: -20, infamy: 3 },
  kidnapping: { name: 'a kidnapping', heat: 3, karma: -1, weaker: true, infamy: 3 },
  /** A life saved: someone who was down healed. */
  rescue: { name: 'a life saved', heat: 0, karma: 5, renown: 2 },
  /** A duel or a spar won in front of people. */
  victory: { name: 'a win', heat: 0, renown: 1 },
  /** A mission done for a power (its trips come with P3.7, its posts with M5). */
  mission: { name: 'a mission', heat: 0, renown: 1 },
  /** A death, real or staged: a decoy believed is a death the hunter knows of and tells. */
  death: { name: 'a death', heat: 0 },
} as const satisfies Record<string, DeedInfo>;
export type DeedKind = keyof typeof DEEDS;
export const DEED_KINDS = Object.keys(DEEDS) as DeedKind[];

export interface DeedInfo {
  name: string;
  heat: number;
  karma?: number;
  weaker?: boolean;
  infamy?: number;
  renown?: number;
}

export function deedInfo(kind: DeedKind): DeedInfo {
  return DEEDS[kind];
}

/** Karma a deed moves, done to someone weaker or not (design § The resolver, What lasts). */
export function deedKarma(kind: DeedKind, weaker: boolean): number {
  const d = deedInfo(kind);
  if (!d.karma) return 0;
  return d.weaker && !weaker ? 0 : d.karma;
}
/** Healing someone who is up: a small mercy, to someone weaker. */
export const MERCY_KARMA = 1;
/** Paying a ransom for someone else, or freeing a captive. */
export const FREED_KARMA = 5;

// ── Renown and infamy (P3.4b) ────────────────────────────────────────────────────────────────

/** The points each level needs, 1 to 9, per region (P3.4b's talk). */
export const FAME_LEVELS = [1, 2, 4, 7, 11, 16, 22, 29, 37] as const;
/** A point fades each season after the last gain. */
export const FAME_COOL_DAYS = 90;
/** How far a level carries your name: 3 across a town, 6 across the region. */
export const FAME_WORDS = [
  { at: 0, word: 'unknown' },
  { at: 1, word: 'a few have heard' },
  { at: 3, word: 'known across a town' },
  { at: 6, word: 'known across the region' },
  { at: 9, word: 'a name beyond the region' },
] as const;
/** Strangers know your name from this level up in their region. */
export const NAME_KNOWN_AT = 3;
/** Killing someone this infamous there is renown, not infamy. */
export const VILLAIN_AT = 3;
export const VILLAIN_RENOWN = 3;
/** Renown in a people check, to anyone who knows your name: anyone honors renown. */
export const RENOWN_LEVERAGE = 1.25;
/** The region a scene stands in when it names none. */
export const HOME_REGION = 'qm-bianhuang';

// ── Traces (P3.4b) ───────────────────────────────────────────────────────────────────────────

/**
 * A death talisman's trace: a great sect's core disciple carries one, and killing them marks the
 * killer's face for their elders. Its strength is the sect's or the backer's, whichever is
 * greater; these are the sect's by pedigree when nothing names it.
 */
export const TRACE_BY_PEDIGREE: Partial<Record<string, { realm: RealmId; stage: number }>> = {
  'great-sect': { realm: 'core-formation', stage: 1 },
  'sacred-land': { realm: 'nascent-soul', stage: 1 },
};
/** A soul erasing a trace needs at least this realm, and the Soul tree's Severing to do it. */
export const ERASE_FROM: RealmId = 'foundation-establishment';

// ── Backers (P3.4b) ──────────────────────────────────────────────────────────────────────────

/** A backer a realm above their charge makes them feel safe as a sect does; two or more, a great sect. */
export const BACKER_COMPOSURE = { one: 1.5, two: 2 } as const;
/**
 * A backer's projection, played in P3.9: it arrives when its charge falls under this share of HP,
 * fights at a third of the backer's lines for three turns, and opens by asking for face.
 */
export const PROJECTION = {
  below: 0.25,
  share: 1 / 3,
  turns: 3,
  line: 'Fellow daoist, give me some face.',
} as const;
/** One generated great-sect young master in this many has a backer. */
export const BACKER_ONE_IN = 5;
/** One rogue in this many has found something (design § NPC basics, The lucky rogue). */
export const LUCKY_ROGUE_ONE_IN = 50;

// ── Acts ─────────────────────────────────────────────────────────────────────────────────────

/** What an act's check faces: their capability, the targeted feature's own realm, or the site's. */
export type Faces = CapabilityId | 'feature' | 'site';

/** What a short verdict means for an act, in the step's result. */
export const SHORTS = {
  caught: 'you are caught',
  noticed: 'you are noticed',
  nothing: 'you find nothing',
  refused: 'they refuse',
  'seen-through': 'they see through it',
  holds: 'it holds',
  'caught-up': 'they catch you',
  'stands-firm': 'they stand firm',
  missed: 'you lose them',
} as const;
export type ShortId = keyof typeof SHORTS;

export interface ActInfo {
  verb: Verb;
  name: string;
  /** The check, when the act has one: your capability against what it faces. */
  check?: { yours: CapabilityId; faces: Faces };
  /** A people check: leverage against resistance, sized by no realm. */
  people?: boolean;
  /** A lie: a soul two realms above yours reads it, so it fails and they know. */
  lie?: boolean;
  /** Ticks it takes, a quarter of a wheel hour each; 1 when absent. */
  ticks?: number;
  /** What a close pass costs, the first unless the step names another. */
  costs?: readonly CostId[];
  short?: ShortId;
  /** The deed it makes, done or caught at. */
  deed?: DeedKind;
  /** What it needs aimed at. */
  target?: 'person' | 'feature' | 'item' | 'place' | 'project';
  /** Hands over to the combat engine. */
  fight?: boolean;
  /** Starts a lasting state on the actor. */
  starts?: LastingKind;
  /** It makes noise at the actor's realm, as techniques and talismans do. */
  loud?: boolean;
  /** The milestone that makes it real; until then it can't be tried. */
  waits?: string;
  /** A trust they must hold: below it they refuse whatever you bring (P3.4). */
  needs?: TrustWord;
  /** The tie a pass makes: what the target becomes to the actor. */
  makes?: TieId;
  /** The ties to the target it can only be tried from. */
  from?: readonly TieId[];
  /** A realm above the target it needs, as a master over a disciple. */
  above?: boolean;
  /** The lean or quirk that resists it: Hand a bargain, a quirk a confession. */
  resist?: 'bargain' | 'confess';
}

const PEOPLE = { people: true, costs: ['trust', 'witness'], short: 'refused' } as const;

/**
 * The acts under each verb, the menu the interpreter knows (design § The world, What you can do).
 * Go, Rest, Give and Cultivate carry no check: they are time and things. Make waits for M4.
 */
export const ACTS = {
  // Go
  travel: { verb: 'go', name: 'travel', ticks: 4, target: 'place' },
  enter: { verb: 'go', name: 'enter', target: 'place' },
  leave: { verb: 'go', name: 'leave' },
  follow: {
    verb: 'go',
    name: 'tail',
    check: { yours: 'stealth', faces: 'perception' },
    target: 'person',
    costs: ['time', 'witness'],
    short: 'noticed',
  },
  'go-home': { verb: 'go', name: 'go home', ticks: 4 },
  // Look
  'look-around': { verb: 'look', name: 'look around', ticks: 4 },
  search: {
    verb: 'look',
    name: 'search',
    check: { yours: 'find', faces: 'site' },
    ticks: 2,
    costs: ['time', 'noise'],
    short: 'nothing',
  },
  watch: {
    verb: 'look',
    name: 'watch',
    check: { yours: 'perception', faces: 'stealth' },
    target: 'person',
    costs: ['time'],
    short: 'missed',
  },
  track: {
    verb: 'look',
    name: 'track',
    check: { yours: 'find', faces: 'stealth' },
    target: 'person',
    ticks: 2,
    costs: ['time', 'noise'],
    short: 'missed',
  },
  'read-realm': { verb: 'look', name: 'read their realm', target: 'person' },
  // Talk
  ask: { verb: 'talk', name: 'ask', target: 'person', ...PEOPLE },
  persuade: { verb: 'talk', name: 'persuade', target: 'person', ...PEOPLE },
  lie: {
    verb: 'talk',
    name: 'lie',
    target: 'person',
    lie: true,
    deed: 'lie',
    ...PEOPLE,
    short: 'seen-through',
  },
  bargain: { verb: 'talk', name: 'bargain', target: 'person', ...PEOPLE, resist: 'bargain' },
  recruit: { verb: 'talk', name: 'recruit', target: 'person', ...PEOPLE },
  calm: { verb: 'talk', name: 'calm', target: 'person', ...PEOPLE },
  beg: { verb: 'talk', name: 'beg', target: 'person', ...PEOPLE },
  report: { verb: 'talk', name: 'report', target: 'person', ...PEOPLE },
  // Ties made by a deed at trust (design § NPC basics, Ties).
  swear: {
    verb: 'talk',
    name: 'swear brotherhood',
    target: 'person',
    ...PEOPLE,
    needs: 'trusting',
    makes: 'sworn-sibling',
  },
  confess: {
    verb: 'talk',
    name: 'confess',
    target: 'person',
    ...PEOPLE,
    needs: 'trusting',
    makes: 'lover',
    resist: 'confess',
  },
  oath: {
    verb: 'talk',
    name: "swear a dao companion's oath",
    target: 'person',
    ...PEOPLE,
    needs: 'trusting',
    makes: 'dao-companion',
    from: ['lover', 'betrothed'],
  },
  'take-disciple': {
    verb: 'talk',
    name: 'take as a disciple',
    target: 'person',
    ...PEOPLE,
    needs: 'friendly',
    makes: 'disciple',
    above: true,
  },
  threaten: {
    verb: 'talk',
    name: 'threaten',
    check: { yours: 'presence', faces: 'composure' },
    target: 'person',
    costs: ['heat', 'witness'],
    short: 'stands-firm',
    deed: 'threat',
  },
  challenge: { verb: 'talk', name: 'challenge', target: 'person' },
  // Fight
  attack: { verb: 'fight', name: 'attack', target: 'person', fight: true, deed: 'assault' },
  ambush: {
    verb: 'fight',
    name: 'ambush',
    check: { yours: 'stealth', faces: 'perception' },
    target: 'person',
    fight: true,
    deed: 'assault',
    costs: ['noise'],
    short: 'noticed',
  },
  duel: { verb: 'fight', name: 'duel', target: 'person', fight: true },
  spar: { verb: 'fight', name: 'spar', target: 'person', fight: true },
  finish: { verb: 'fight', name: 'finish the fallen', target: 'person', deed: 'killing' },
  // Evade
  sneak: {
    verb: 'evade',
    name: 'sneak past',
    check: { yours: 'stealth', faces: 'perception' },
    costs: ['witness', 'noise'],
    short: 'caught',
    deed: 'trespass',
  },
  hide: {
    verb: 'evade',
    name: 'hide',
    check: { yours: 'stealth', faces: 'perception' },
    costs: ['time', 'witness'],
    short: 'noticed',
  },
  flee: {
    verb: 'evade',
    name: 'flee',
    check: { yours: 'speed', faces: 'speed' },
    costs: ['wound', 'noise'],
    short: 'caught-up',
  },
  disguise: { verb: 'evade', name: 'disguise yourself', ticks: 2, starts: 'disguise' },
  veil: { verb: 'evade', name: 'hide your realm', starts: 'cover' },
  decoy: {
    verb: 'evade',
    name: 'leave a decoy',
    check: { yours: 'stealth', faces: 'perception' },
    ticks: 2,
    costs: ['time', 'witness'],
    short: 'seen-through',
  },
  // Take
  loot: { verb: 'take', name: 'loot', ticks: 2, target: 'person' },
  gather: { verb: 'take', name: 'gather', ticks: 4, target: 'feature' },
  steal: {
    verb: 'take',
    name: 'steal',
    check: { yours: 'stealth', faces: 'perception' },
    target: 'person',
    costs: ['witness', 'heat'],
    short: 'caught',
    deed: 'theft',
  },
  burgle: {
    verb: 'take',
    name: 'burgle',
    check: { yours: 'stealth', faces: 'site' },
    ticks: 2,
    costs: ['witness', 'noise'],
    short: 'caught',
    deed: 'theft',
  },
  rob: {
    verb: 'take',
    name: 'rob',
    check: { yours: 'presence', faces: 'composure' },
    target: 'person',
    costs: ['heat', 'witness'],
    short: 'stands-firm',
    deed: 'robbery',
  },
  seize: {
    verb: 'take',
    name: 'seize',
    check: { yours: 'force', faces: 'force' },
    target: 'person',
    costs: ['wound', 'noise'],
    short: 'holds',
    deed: 'kidnapping',
    starts: 'captive',
  },
  // Give
  buy: { verb: 'give', name: 'buy', target: 'person' },
  sell: { verb: 'give', name: 'sell', target: 'person' },
  pay: { verb: 'give', name: 'pay', target: 'person' },
  gift: { verb: 'give', name: 'give a gift', target: 'person' },
  bribe: { verb: 'give', name: 'bribe', target: 'person' },
  ransom: { verb: 'give', name: 'pay a ransom', target: 'person' },
  deliver: { verb: 'give', name: 'deliver', target: 'person' },
  slip: {
    verb: 'give',
    name: 'slip it onto them',
    check: { yours: 'stealth', faces: 'perception' },
    target: 'person',
    costs: ['witness'],
    short: 'caught',
    deed: 'frame',
  },
  // Use
  break: {
    verb: 'use',
    name: 'break',
    check: { yours: 'force', faces: 'feature' },
    target: 'feature',
    costs: ['noise', 'wound'],
    short: 'holds',
    loud: true,
  },
  lift: {
    verb: 'use',
    name: 'lift',
    check: { yours: 'force', faces: 'feature' },
    target: 'feature',
    costs: ['wound'],
    short: 'holds',
  },
  hold: {
    verb: 'use',
    name: 'hold',
    check: { yours: 'force', faces: 'force' },
    target: 'person',
    costs: ['wound'],
    short: 'holds',
  },
  endure: {
    verb: 'use',
    name: 'endure',
    check: { yours: 'force', faces: 'site' },
    costs: ['wound', 'time'],
    short: 'holds',
  },
  item: { verb: 'use', name: 'use an item', target: 'item' },
  technique: { verb: 'use', name: 'use a technique', loud: true },
  heal: { verb: 'use', name: 'heal', target: 'person' },
  /** A trace erased from a soul: your soul against the trace's strength (P3.4b). */
  erase: {
    verb: 'use',
    name: 'erase a trace',
    target: 'person',
    ticks: 4,
    costs: ['wound', 'time'],
    short: 'holds',
  },
  open: { verb: 'use', name: 'open', target: 'feature' },
  // Cultivate
  sit: { verb: 'cultivate', name: 'sit and cultivate', ticks: 4 },
  comprehend: { verb: 'cultivate', name: 'comprehend', ticks: 4, target: 'feature' },
  seclude: { verb: 'cultivate', name: 'seclude', ticks: 4 },
  // Work
  step: {
    verb: 'work',
    name: 'work on a project',
    ticks: 4,
    target: 'project',
    costs: ['time', 'heat'],
  },
  job: { verb: 'work', name: 'take a job', ticks: 4 },
  // Rest
  wait: { verb: 'rest', name: 'wait' },
  camp: { verb: 'rest', name: 'camp', ticks: 4 },
  recover: { verb: 'rest', name: 'recover', ticks: 4 },
  // Make
  brew: { verb: 'make', name: 'brew', waits: 'M4' },
  refine: { verb: 'make', name: 'refine', waits: 'M4' },
  inscribe: { verb: 'make', name: 'inscribe', waits: 'M4' },
  plant: { verb: 'make', name: 'plant', waits: 'M4' },
} as const satisfies Record<string, ActInfo>;
export type ActId = keyof typeof ACTS;
export const ACT_IDS = Object.keys(ACTS) as ActId[];

export function act(id: ActId): ActInfo {
  return ACTS[id];
}

/** How a step is done: it shades the narration, and `quiet` keeps a loud act's noise down. */
export const MANNERS = ['quiet', 'quick', 'careful', 'open', 'veiled'] as const;
export type Manner = (typeof MANNERS)[number];

// ── People checks (P3.4: trust from opinion, offers from motives, standing from the power) ──

/** Trust, the word opinion reads, as leverage (design § The resolver, People checks). */
export const TRUST = {
  hostile: 0.25,
  wary: 0.5,
  neutral: 1,
  friendly: 1.5,
  trusting: 2,
} as const;
export type TrustWord = keyof typeof TRUST;
/** An offer that meets one of their motives. */
export const MOTIVE_MET = 2;
/** Proof or a prop: a token, a sect's robe. */
export const PROP = 1.5;
/** Standing with their power, from its worst to its best. */
export const STANDING_RANGE = [0.5, 1.5] as const;
/** A motive against it; suspicion of you. */
export const MOTIVE_AGAINST = 2;
export const SUSPICION = 2;
/** A soul this many realms above yours reads your lies. */
export const LIE_READ_REALMS = 2;

// ── Intimidation ─────────────────────────────────────────────────────────────────────────────

export const PRESENCE = {
  /** A weapon drawn; ×1.5 from gold. */
  weapon: 1.2,
  goldWeapon: 1.5,
  technique: 1.25,
  /** Your infamy, to anyone who knows your name. */
  infamy: 1.5,
  /** Each follower at your back, three at most. */
  follower: 1.1,
  followers: 3,
} as const;
export const COMPOSURE = {
  sect: 1.5,
  greatSect: 2,
  /** Each of their crew, three at most. */
  crew: 1.1,
  crews: 3,
  /** A cornered man doesn't scare. */
  desperate: 2,
} as const;
/** Shown this many realms above them, realm pressure pins them outright. */
export const PIN_REALMS = 2;

// ── Scenes and time ──────────────────────────────────────────────────────────────────────────

/** A tick is a quarter of a wheel hour: 48 to a day. */
export const TICKS_PER_DAY = 48;

/** How far a fight is heard, in li, by its loudest fighter's realm. */
export const NOISE_LI: Partial<Record<RealmId, number>> = {
  'qi-condensation': 1,
  'foundation-establishment': 5,
  'core-formation': 25,
  'nascent-soul': 120,
};
/** Past Nascent Soul a fight is heard across a region. */
export const NOISE_LI_MAX = 500;
/** Ticks a noise rings after the act that made it; a fight rings while it lasts. */
export const NOISE_TICKS = 2;

/**
 * Arrivals by the place's traffic (Jan's call in P3.3's talk, in place of a roll each tick):
 * while a noise rings, and always in an open scene, someone arrives every this many ticks. Who
 * comes is drawn from the place's people table on the `scene` stream, as world content.
 */
export const TRAFFIC = { busy: 2, road: 6, wilds: 12 } as const;
export type Traffic = keyof typeof TRAFFIC;

/** The law of a place, from its kind (design § The resolver, Scenes and time). */
export const LAW = {
  wilds: null,
  village: { who: 'the headman and a guard', realm: 'qi-condensation', stage: 3, ticks: 2 },
  town: { who: 'the watch and its captain', realm: 'qi-condensation', stage: 6, ticks: 1 },
  city: { who: 'the garrison', realm: 'foundation-establishment', stage: 1, ticks: 1 },
  sect: { who: 'an elder', realm: 'foundation-establishment', stage: 3, ticks: 1 },
} as const satisfies Record<
  string,
  { who: string; realm: RealmId; stage: number; ticks: number } | null
>;
export type PlaceKind = keyof typeof LAW;

// ── What lasts ───────────────────────────────────────────────────────────────────────────────

/** Heat on a place or a power, 0 to 9 (design § The resolver, What lasts). */
export const HEAT_MAX = 9;
/** Heat falls by one for each this many days without a new rise. */
export const HEAT_COOL_DAYS = 30;
export const HEAT_WORDS = [
  { at: 0, word: 'quiet' },
  { at: 3, word: 'watched' },
  { at: 6, word: 'hunted locally' },
  { at: 9, word: 'hunted by the power' },
] as const;

/** The lasting states (design § The resolver, What lasts): each, what tests it, what breaking costs. */
export const LASTING = {
  cover: {
    name: 'Cover',
    tested: 'a perception at or above your soul; every act above your shown realm',
    breaks: 'exposure: heat with whoever was fooled',
  },
  disguise: {
    name: 'Disguise',
    tested: 'people who know you; perception against your stealth',
    breaks: 'you are recognized',
  },
  'false-name': {
    name: 'False name',
    tested: "someone checking it: a sect's register, a person who knew you",
    breaks: 'your real name is known',
  },
  'hidden-intent': {
    name: 'Hidden intent',
    tested: 'a soul two realms above yours; acting on it too early',
    breaks: 'your target learns it, and remembers',
  },
  vow: {
    name: 'Vow',
    tested: "keeping it, which pays its Way's reward",
    breaks: "−10 karma and the Way's price",
  },
  debt: {
    name: 'Debt',
    tested: 'its due date',
    breaks: '−5 a month with whoever holds it; at hostile, they collect',
  },
  wound: {
    name: 'Wound',
    tested: 'time and pills',
    breaks: 'a share off your lines for days',
  },
  captive: {
    name: 'Captive',
    tested: 'held by you or holding you',
    breaks: 'a ransom or an escape',
  },
  trace: {
    name: 'Trace',
    tested: "any of the power's people who sees your face",
    breaks: 'erased by a soul stronger than the trace, or a formation (M4)',
  },
} as const;
export type LastingKind = keyof typeof LASTING;

/** Karma a broken vow costs. */
export const VOW_KARMA = -10;
/** Opinion a debt past due costs each month with whoever holds it. */
export const DEBT_OPINION = -5;

/** Project clocks: small, middling and big ambitions. */
export const PROJECT_SIZES = { small: 4, middling: 6, big: 8 } as const;
export type ProjectSize = keyof typeof PROJECT_SIZES;

/** What a place or a kept person can become. */
export const PLACE_STATES = ['thriving', 'damaged', 'ruined', 'scarred', 'taken'] as const;
export type PlaceState = (typeof PLACE_STATES)[number];
export const PERSON_STATES = ['well', 'wounded', 'crippled', 'captured', 'dead', 'gone'] as const;
export type PersonState = (typeof PERSON_STATES)[number];
