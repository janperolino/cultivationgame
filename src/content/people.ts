// Named people (design § Professions, people and powers, People from the first hour and NPC
// basics): everyone the first hour and the seclusion deck name, with their nature written rather
// than rolled, and what each origin path knows of them on testing day. A cultivator keeps a record
// of each person met (core/people.ts): where you met, their realm as last seen or heard and where
// they are, under the same fog as places. How they feel is the memories they hold of you and what
// they are to you is a tie, both in the world (core/resolver/opinion.ts). Cards name people through
// slots ({aunt}, {senior}, {mentor}). Drafted in P1.8, natures and starting memories in P3.4, for
// Jan's review.
import type { MemoryId } from './memories.ts';
import { pathKey, type OriginChoice, type OriginId } from './origins.ts';
import type { Nature } from './personality.ts';
import type { RealmId } from './realms.ts';

// ── Ties ─────────────────────────────────────────────────────────────────────────────────────

/**
 * What someone is to another, apart from how they feel (design § NPC basics, Ties). A tie reads
 * from one end: "a is b's master". The pairs read back the other way: b is a's disciple.
 */
export const TIE_IDS = [
  'kin',
  'master',
  'disciple',
  'senior',
  'junior',
  'superior',
  'subordinate',
  'patron',
  'protege',
  'guardian',
  'ward',
  'benefactor',
  'beneficiary',
  'sworn-sibling',
  'friend',
  'rival',
  'enemy',
  'sworn-enemy',
  'lover',
  'betrothed',
  'former-lover',
  'dao-companion',
  'follower',
  'leader',
  'debtor',
  'creditor',
  'backer',
  'backed',
] as const;
export type TieId = (typeof TIE_IDS)[number];

/** Kin, more closely: a parent, child, sibling, spouse or cousin. */
export const KIN_RELATIONS = ['parent', 'child', 'sibling', 'spouse', 'cousin'] as const;
export type KinRelation = (typeof KIN_RELATIONS)[number];
export const KIN_INVERSE: Record<KinRelation, KinRelation> = {
  parent: 'child',
  child: 'parent',
  sibling: 'sibling',
  spouse: 'spouse',
  cousin: 'cousin',
};

/** The tie read from the other end. */
export const TIE_INVERSE: Record<TieId, TieId> = {
  kin: 'kin',
  master: 'disciple',
  disciple: 'master',
  senior: 'junior',
  junior: 'senior',
  superior: 'subordinate',
  subordinate: 'superior',
  patron: 'protege',
  protege: 'patron',
  guardian: 'ward',
  ward: 'guardian',
  benefactor: 'beneficiary',
  beneficiary: 'benefactor',
  'sworn-sibling': 'sworn-sibling',
  friend: 'friend',
  rival: 'rival',
  enemy: 'enemy',
  'sworn-enemy': 'sworn-enemy',
  lover: 'lover',
  betrothed: 'betrothed',
  'former-lover': 'former-lover',
  'dao-companion': 'dao-companion',
  follower: 'leader',
  leader: 'follower',
  debtor: 'creditor',
  creditor: 'debtor',
  backer: 'backed',
  backed: 'backer',
};

/** What they are to you, in words: "your master". */
export const TIES: Record<TieId, string> = {
  kin: 'family',
  master: 'your master',
  disciple: 'your disciple',
  senior: 'your senior',
  junior: 'your junior',
  superior: 'your superior',
  subordinate: 'under you',
  patron: 'your patron',
  protege: 'your protégé',
  guardian: 'your guardian',
  ward: 'your ward',
  benefactor: 'your benefactor',
  beneficiary: 'in your debt for a life',
  'sworn-sibling': 'your sworn sibling',
  friend: 'a friend',
  rival: 'your rival',
  enemy: 'your enemy',
  'sworn-enemy': 'your sworn enemy',
  lover: 'your lover',
  betrothed: 'your betrothed',
  'former-lover': 'your former lover',
  'dao-companion': 'your dao companion',
  follower: 'your follower',
  leader: 'whom you follow',
  debtor: 'in your debt',
  creditor: 'whom you owe',
  backer: 'your backer',
  backed: 'under your protection',
};

/** What they are to a third person, before that person's name: "Master of Little Ning". */
export const TIE_OF: Record<TieId, string> = {
  kin: 'Kin of',
  master: 'Master of',
  disciple: 'Disciple of',
  senior: 'Senior of',
  junior: 'Junior of',
  superior: 'Superior of',
  subordinate: 'Under',
  patron: 'Patron of',
  protege: 'Protégé of',
  guardian: 'Guardian of',
  ward: 'Ward of',
  benefactor: 'Benefactor of',
  beneficiary: 'Owes a life to',
  'sworn-sibling': 'Sworn sibling of',
  friend: 'Friend of',
  rival: 'Rival of',
  enemy: 'Enemy of',
  'sworn-enemy': 'Sworn enemy of',
  lover: 'Lover of',
  betrothed: 'Betrothed to',
  'former-lover': 'Once the lover of',
  'dao-companion': 'Dao companion of',
  follower: 'Follows',
  leader: 'Leads',
  debtor: 'Owes',
  creditor: 'Is owed by',
  backer: 'Backs',
  backed: 'Backed by',
};

/** Kin with its relation, to a third person: "Uncle of" is beyond us; "Parent of". */
export const KIN_OF: Record<KinRelation, string> = {
  parent: 'Parent of',
  child: 'Child of',
  sibling: 'Sibling of',
  spouse: 'Spouse of',
  cousin: 'Cousin of',
};

/** The ties that carry a deed in full as "someone I love". */
export const LOVE_TIES: readonly TieId[] = [
  'kin',
  'sworn-sibling',
  'lover',
  'betrothed',
  'dao-companion',
  'master',
  'disciple',
  'guardian',
  'ward',
  // A backer stands behind their charge as kin would (P3.4b).
  'backer',
  'backed',
];
/** The ties that carry it at half; members of the same power do too. */
export const HALF_TIES: readonly TieId[] = ['friend'];
export const RIPPLE_HALF = 0.5;

// ── People ───────────────────────────────────────────────────────────────────────────────────

export interface Person {
  id: string;
  /** Pinyin names, as people keep them: Aunt Yan, Senior Brother Zhao. */
  name: string;
  /** Their surname in hanzi: the seal on the People screen until portraits arrive. */
  hanzi: string;
  pronouns: string;
  /** Who they are, one line, in the second person. */
  summary: string;
  /** A mortal has no realm to know. */
  mortal?: boolean;
  /** Met on the road wherever you meet them: the People screen's circles keep them there. */
  wanderer?: boolean;
  /** Where they are when you meet them: an atlas entry id, or null for wherever you are. */
  home: string | null;
  /** The power they answer to, an atlas id. */
  power?: string;
  /** Written, not rolled: named people are kept with everything pinned. */
  nature: Nature;
}

export const PEOPLE: readonly Person[] = [
  {
    id: 'aunt-yan',
    hanzi: '严',
    name: 'Aunt Yan',
    pronouns: 'she/her',
    summary: 'The cave-clan aunt who fed you bat-guano rice and taught you which caves breathe.',
    mortal: true,
    home: 'qm-shiyan-guo',
    nature: {
      motives: ['family'],
      axes: { heart: 2, temper: 1 },
      quirks: [],
      trade: 'farmer',
      voice: {
        register: 'plain',
        habit: 'tells everything as a story about the caves',
        topic: 'which caves breathe, and whether you are eating',
      },
    },
  },
  {
    id: 'tester-qiu',
    hanzi: '邱',
    name: 'Tester Qiu',
    pronouns: 'he/him',
    summary: 'The imperial tester who came down to the sinkholes with a grey stone and a ledger.',
    home: 'qm-anbian-fu',
    power: 'great-jing',
    nature: {
      motives: ['duty', 'ambition'],
      axes: { pride: 1, trust: -1 },
      quirks: [],
      trade: 'tester',
      path: 'qi',
      voice: {
        register: 'courtly',
        habit: 'never uses your name, only "you"',
        topic: 'roots, and how rare a good one is',
      },
    },
  },
  {
    id: 'sergeant-hou',
    hanzi: '侯',
    name: 'Sergeant Hou',
    pronouns: 'he/him',
    summary: "The garrison school's drill sergeant, missing two fingers and none of his patience.",
    home: 'qm-anbian-fu',
    power: 'great-jing',
    nature: {
      motives: ['duty'],
      axes: { temper: 2, heart: 1, fidelity: 1 },
      quirks: ['drinker'],
      trade: 'soldier',
      path: 'body',
      voice: {
        register: 'clipped',
        habit: 'swears by his ancestors',
        topic: 'the two fingers, and the beast that took them',
      },
    },
  },
  {
    id: 'sergeant-lei',
    hanzi: '雷',
    name: 'Sergeant Lei',
    pronouns: 'she/her',
    summary: 'The sergeant who keeps the list of lit children and walks the Wall of Piled Bones.',
    home: 'qm-duigu-qiang',
    power: 'great-jing',
    nature: {
      motives: ['duty', 'loyalty'],
      axes: { memory: 2, conscience: 1 },
      quirks: [],
      trade: 'soldier',
      path: 'qi',
      voice: {
        register: 'clipped',
        habit: 'reads names off her list when she is angry',
        topic: 'the lit children, and who is missing',
      },
    },
  },
  {
    id: 'old-sha',
    hanzi: '沙',
    name: 'Old Sha',
    pronouns: 'he/him',
    summary:
      'A half-blood ferryman with gills behind his ears, who rows for the Night Bridge Society.',
    home: 'qm-yeqiao-hui',
    power: 'qm-yeqiao-hui',
    nature: {
      motives: ['greed'],
      axes: { bearing: 2, memory: 1, hand: -1 },
      quirks: ['gambler'],
      trade: 'ferryman',
      path: 'body',
      voice: {
        register: 'coarse',
        habit: 'talks in river sayings',
        topic: 'the river and its prices',
      },
    },
  },
  {
    id: 'senior-zhao',
    hanzi: '赵',
    name: 'Senior Brother Zhao',
    pronouns: 'he/him',
    summary: 'An outer disciple of the Beast-Butcher Gate who counts contribution in cores.',
    home: 'qm-tushou-men',
    power: 'qm-tushou-men',
    nature: {
      motives: ['ambition', 'pride'],
      axes: { pride: 2, hand: -1 },
      quirks: [],
      trade: 'disciple',
      path: 'body',
      voice: {
        register: 'courtly',
        habit: 'counts contribution aloud',
        topic: 'contribution, and who has more of it',
      },
    },
  },
  {
    id: 'clerk-fan',
    hanzi: '范',
    name: 'Clerk Fan',
    pronouns: 'she/her',
    summary: 'The bounty office clerk who always needs runners and never asks why.',
    mortal: true,
    home: 'qm-shoukou-cheng',
    nature: {
      motives: ['greed', 'curiosity'],
      axes: { bearing: -1, conscience: -1 },
      quirks: [],
      trade: 'clerk',
      voice: {
        register: 'clipped',
        habit: 'answers in as few words as possible',
        topic: 'the ledger and its rules',
      },
    },
  },
  {
    id: 'peddler-gou',
    hanzi: '苟',
    name: 'Peddler Gou',
    pronouns: 'he/him',
    summary: 'A travelling peddler with a cart of pills, half of them real.',
    wanderer: true,
    home: 'qm-bianhuang',
    nature: {
      motives: ['greed'],
      axes: { honesty: 2, bearing: 1, trust: 1 },
      quirks: ['superstitious'],
      trade: 'peddler',
      path: 'qi',
      voice: {
        register: 'florid',
        habit: 'swears oaths too easily',
        topic: 'the next town on the road',
      },
    },
  },
  {
    id: 'little-ning',
    hanzi: '宁',
    name: 'Little Ning',
    pronouns: 'she/her',
    summary: 'A junior who came begging help with a knotted meridian.',
    home: null,
    nature: {
      motives: ['ambition', 'fear'],
      axes: { nerve: -1, trust: 2 },
      quirks: [],
      trade: 'disciple',
      path: 'qi',
      voice: {
        register: 'plain',
        habit: 'apologizes before she speaks',
        topic: 'the next realm, and whether she will ever reach it',
      },
    },
  },
  {
    id: 'fang-tie',
    hanzi: '方',
    name: 'Fang Tie',
    pronouns: 'he/him',
    summary: 'A cultivator of your year who measures himself against you.',
    home: null,
    nature: {
      motives: ['pride', 'ambition'],
      axes: { pride: 1, temper: 1, fidelity: -1 },
      quirks: [],
      trade: 'swordsman',
      path: 'qi',
      voice: {
        register: 'clipped',
        habit: 'raises his voice at the first doubt',
        topic: 'who is ahead, you or him',
      },
    },
  },
];

const byId = new Map(PEOPLE.map((p) => [p.id, p]));

export function person(id: string): Person {
  const p = byId.get(id);
  if (!p) throw new RangeError(`Unknown person ${id}`);
  return p;
}

export function hasPerson(id: string): boolean {
  return byId.has(id);
}

/** People any path can meet through the seclusion deck, by slot. */
export const SHARED_SLOTS: Readonly<Record<string, string>> = {
  peddler: 'peddler-gou',
  junior: 'little-ning',
  rival: 'fang-tie',
};

/** Someone a path knows on testing day: what they are to you, what they remember, what you know. */
export interface Acquaintance {
  id: string;
  /** What they are to you; none for an acquaintance. */
  tie?: TieId;
  /** What they bring to testing day: a memory of you, with its own value and words. */
  memory?: { row: MemoryId; value?: number; note?: string };
  /** Their realm as you know it, or null when you don't. */
  realm: { realm: RealmId; stage: number } | null;
}

export interface PathPeople {
  /** The slot of whoever looks out for you on this path: the {mentor} slot fills from it. */
  mentor: string;
  knows: readonly Acquaintance[];
}

const QC = 'qi-condensation' as const;

/** Who each origin path knows on testing day, by path key ("cave-orphan/along"). */
export const PATH_PEOPLE: Readonly<Record<string, PathPeople>> = {
  'cave-orphan/along': {
    mentor: 'sergeant',
    knows: [
      {
        id: 'aunt-yan',
        tie: 'kin',
        memory: { row: 'from-before', value: 25, note: 'Raised you in the caves' },
        realm: null,
      },
      { id: 'tester-qiu', realm: null },
      { id: 'sergeant-hou', tie: 'superior', realm: { realm: QC, stage: 8 } },
    ],
  },
  'cave-orphan/refuse': {
    mentor: 'aunt',
    knows: [
      {
        id: 'aunt-yan',
        tie: 'kin',
        memory: { row: 'from-before', value: 50, note: 'Raised you, and you stayed' },
        realm: null,
      },
      {
        id: 'tester-qiu',
        memory: { row: 'from-before', value: -12, note: 'Turned down the dynasty' },
        realm: null,
      },
    ],
  },
  'conscript/along': {
    mentor: 'sergeant',
    knows: [
      {
        id: 'sergeant-lei',
        tie: 'superior',
        memory: { row: 'from-before', value: 12, note: 'Answered the levy' },
        realm: { realm: QC, stage: 7 },
      },
    ],
  },
  'conscript/refuse': {
    mentor: 'fixer',
    knows: [
      {
        id: 'sergeant-lei',
        tie: 'enemy',
        memory: { row: 'from-before', value: -25, note: 'Ran from the levy' },
        realm: { realm: QC, stage: 7 },
      },
      { id: 'old-sha', realm: null },
    ],
  },
  'frontier-orphan/along': {
    mentor: 'senior',
    knows: [
      { id: 'senior-zhao', tie: 'senior', realm: { realm: QC, stage: 6 } },
      {
        id: 'clerk-fan',
        memory: { row: 'from-before', value: 12, note: 'Ran errands for the office' },
        realm: null,
      },
    ],
  },
  'frontier-orphan/refuse': {
    mentor: 'clerk',
    knows: [
      {
        id: 'clerk-fan',
        tie: 'patron',
        memory: { row: 'from-before', value: 12, note: 'Ran errands for the office' },
        realm: null,
      },
      {
        id: 'senior-zhao',
        tie: 'rival',
        memory: { row: 'from-before', value: -12, note: 'Said no to the Gate' },
        realm: { realm: QC, stage: 6 },
      },
    ],
  },
};

/** Who a path knows on testing day; nobody for a life without an origin. */
export function pathPeople(o: { id: OriginId; choice: OriginChoice } | null): PathPeople {
  return (o && PATH_PEOPLE[pathKey(o.id, o.choice)]) || { mentor: '', knows: [] };
}

/** The old regard (−3 to +3) as a memory's value, for the v21 migration and cards' plain mapping. */
export const REGARD_VALUES: Readonly<Record<number, number>> = {
  [-3]: -50,
  [-2]: -25,
  [-1]: -12,
  0: 0,
  1: 12,
  2: 25,
  3: 50,
};
