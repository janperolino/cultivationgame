// Named people (design § Professions, people and powers, People from the first hour): everyone
// the first hour and the seclusion deck name, with what each origin path knows of them on testing
// day. A cultivator keeps a record of each person met (core/people.ts): what they are to you, how
// they feel in words, their realm as last seen or heard and where they are, under the same fog as
// places. Cards name people through slots ({aunt}, {senior}, {mentor}); in M1 only cards update a
// record, and from M5 their lives tick on their own. Drafted in P1.8 for Jan's review.
import { pathKey, type OriginChoice, type OriginId } from './origins.ts';
import type { RealmId } from './realms.ts';

/** What a person is to you. */
export type BondId =
  | 'kin'
  | 'acquaintance'
  | 'friend'
  | 'senior'
  | 'junior'
  | 'superior'
  | 'patron'
  | 'master'
  | 'rival'
  | 'enemy'
  | 'sworn-sibling'
  | 'dao-companion';

export const BOND_IDS = [
  'kin',
  'acquaintance',
  'friend',
  'senior',
  'junior',
  'superior',
  'patron',
  'master',
  'rival',
  'enemy',
  'sworn-sibling',
  'dao-companion',
] as const satisfies readonly BondId[];

export const BONDS: Record<BondId, string> = {
  kin: 'family',
  acquaintance: 'an acquaintance',
  friend: 'a friend',
  senior: 'your senior',
  junior: 'your junior',
  superior: 'your superior',
  patron: 'your patron',
  master: 'your master',
  rival: 'your rival',
  enemy: 'your enemy',
  'sworn-sibling': 'your sworn sibling',
  'dao-companion': 'your dao companion',
};

/** How someone feels about you, in words: regard runs −3 to +3 and is never shown as a number. */
export const REGARD_MIN = -3;
export const REGARD_MAX = 3;
const REGARD_WORDS = [
  'wants you dead',
  'holds a grudge against you',
  'is wary of you',
  'is indifferent to you',
  'thinks well of you',
  'is fond of you',
  'would bleed for you',
] as const;

export function regardWords(regard: number): string {
  const r = Math.round(Math.min(REGARD_MAX, Math.max(REGARD_MIN, regard)));
  return REGARD_WORDS[r - REGARD_MIN]!;
}

export interface Person {
  id: string;
  /** Pinyin names, as people keep them: Aunt Yan, Senior Brother Zhao. */
  name: string;
  pronouns: string;
  /** Who they are, one line, in the second person. */
  summary: string;
  /** A mortal has no realm to know. */
  mortal?: boolean;
  /** Where they are when you meet them: an atlas entry id, or null for wherever you are. */
  home: string | null;
}

export const PEOPLE: readonly Person[] = [
  {
    id: 'aunt-yan',
    name: 'Aunt Yan',
    pronouns: 'she/her',
    summary: 'The cave-clan aunt who fed you bat-guano rice and taught you which caves breathe.',
    mortal: true,
    home: 'qm-shiyan-guo',
  },
  {
    id: 'tester-qiu',
    name: 'Tester Qiu',
    pronouns: 'he/him',
    summary: 'The imperial tester who came down to the sinkholes with a grey stone and a ledger.',
    home: 'qm-anbian-fu',
  },
  {
    id: 'sergeant-hou',
    name: 'Sergeant Hou',
    pronouns: 'he/him',
    summary: "The garrison school's drill sergeant, missing two fingers and none of his patience.",
    home: 'qm-anbian-fu',
  },
  {
    id: 'sergeant-lei',
    name: 'Sergeant Lei',
    pronouns: 'she/her',
    summary: 'The sergeant who keeps the list of lit children and walks the Wall of Piled Bones.',
    home: 'qm-duigu-qiang',
  },
  {
    id: 'old-sha',
    name: 'Old Sha',
    pronouns: 'he/him',
    summary:
      'A half-blood ferryman with gills behind his ears, who rows for the Night Bridge Society.',
    home: 'qm-yeqiao-hui',
  },
  {
    id: 'senior-zhao',
    name: 'Senior Brother Zhao',
    pronouns: 'he/him',
    summary: 'An outer disciple of the Beast-Butcher Gate who counts contribution in cores.',
    home: 'qm-tushou-men',
  },
  {
    id: 'clerk-fan',
    name: 'Clerk Fan',
    pronouns: 'she/her',
    summary: 'The bounty office clerk who always needs runners and never asks why.',
    mortal: true,
    home: 'qm-shoukou-cheng',
  },
  {
    id: 'peddler-gou',
    name: 'Peddler Gou',
    pronouns: 'he/him',
    summary: 'A travelling peddler with a cart of pills, half of them real.',
    home: 'qm-bianhuang',
  },
  {
    id: 'little-ning',
    name: 'Little Ning',
    pronouns: 'she/her',
    summary: 'A junior who came begging help with a knotted meridian.',
    home: null,
  },
  {
    id: 'fang-tie',
    name: 'Fang Tie',
    pronouns: 'he/him',
    summary: 'A cultivator of your year who measures himself against you.',
    home: null,
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

/** Someone a path knows on testing day: what they are to you, how they feel, what you know. */
export interface Acquaintance {
  id: string;
  bond: BondId;
  regard: number;
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
      { id: 'aunt-yan', bond: 'kin', regard: 2, realm: null },
      { id: 'tester-qiu', bond: 'acquaintance', regard: 0, realm: null },
      { id: 'sergeant-hou', bond: 'superior', regard: 0, realm: { realm: QC, stage: 8 } },
    ],
  },
  'cave-orphan/refuse': {
    mentor: 'aunt',
    knows: [
      { id: 'aunt-yan', bond: 'kin', regard: 3, realm: null },
      { id: 'tester-qiu', bond: 'acquaintance', regard: -1, realm: null },
    ],
  },
  'conscript/along': {
    mentor: 'sergeant',
    knows: [{ id: 'sergeant-lei', bond: 'superior', regard: 1, realm: { realm: QC, stage: 7 } }],
  },
  'conscript/refuse': {
    mentor: 'fixer',
    knows: [
      { id: 'sergeant-lei', bond: 'enemy', regard: -2, realm: { realm: QC, stage: 7 } },
      { id: 'old-sha', bond: 'acquaintance', regard: 0, realm: null },
    ],
  },
  'frontier-orphan/along': {
    mentor: 'senior',
    knows: [
      { id: 'senior-zhao', bond: 'senior', regard: 0, realm: { realm: QC, stage: 6 } },
      { id: 'clerk-fan', bond: 'acquaintance', regard: 1, realm: null },
    ],
  },
  'frontier-orphan/refuse': {
    mentor: 'clerk',
    knows: [
      { id: 'clerk-fan', bond: 'patron', regard: 1, realm: null },
      { id: 'senior-zhao', bond: 'rival', regard: -1, realm: { realm: QC, stage: 6 } },
    ],
  },
};

/** Who a path knows on testing day; nobody for a life without an origin. */
export function pathPeople(o: { id: OriginId; choice: OriginChoice } | null): PathPeople {
  return (o && PATH_PEOPLE[pathKey(o.id, o.choice)]) || { mentor: '', knows: [] };
}
