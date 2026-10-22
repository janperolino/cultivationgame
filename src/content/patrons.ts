// Who sits in a teahouse today (A6.1's talk, Jan's yes; design § Who stays): besides today's teller
// and the people you know who live there, a few passers seeded by the place and the day, transient
// until a thread keeps them (P3.9's Sit with them). The kinds are A11's portraits' eight. Drafted in
// A6.1 for Jan's review (docs/review-queue.md).

export type PatronKind =
  'cultivator' | 'merchant' | 'scholar' | 'farmer' | 'guard' | 'elder' | 'rogue' | 'beast-tamer';

export interface PatronKindInfo {
  /** What they're called before their surname: Peddler Gou, Clerk Fan. */
  titles: readonly string[];
  /** Why they sit here today, one picked a day. */
  why: readonly string[];
  /** A cultivator's realm shows at the table; a mortal's doesn't. */
  cultivates: boolean;
  /** How often a passer is this kind, out of the eight's sum. */
  weight: number;
}

export const PATRON_KINDS: Readonly<Record<PatronKind, PatronKindInfo>> = {
  cultivator: {
    titles: ['Brother', 'Sister', 'Young Master', 'Fellow Daoist'],
    why: [
      'resting between bounties',
      'down from a sect hall, sipping alone',
      'waiting on a friend who is late',
      'counting cores under the table',
    ],
    cultivates: true,
    weight: 3,
  },
  merchant: {
    titles: ['Peddler', 'Factor', 'Merchant'],
    why: [
      'his cart of pills outside the door',
      'haggling over a bolt of spirit silk',
      'waiting on tomorrow’s caravan',
      'writing up the day’s accounts',
    ],
    cultivates: false,
    weight: 3,
  },
  scholar: {
    titles: ['Scholar', 'Clerk', 'Master'],
    why: [
      'copying a map by lamplight',
      'off his shift at the bounty office',
      'reading a slip he won’t show anyone',
    ],
    cultivates: false,
    weight: 1,
  },
  farmer: {
    titles: ['Old', 'Uncle', 'Auntie'],
    why: [
      'in town to sell the harvest',
      'come about a beast in the fields',
      'spending the season’s silver',
    ],
    cultivates: false,
    weight: 1,
  },
  guard: {
    titles: ['Guard', 'Sergeant', 'Caravan guard'],
    why: [
      'off the night watch',
      'waiting on tomorrow’s caravan',
      'drinking to a friend lost on the road',
    ],
    cultivates: false,
    weight: 2,
  },
  elder: {
    titles: ['Grandfather', 'Granny', 'Old Master'],
    why: [
      'at the same table as every day',
      'telling the old war stories to anyone near',
      'watching the door',
    ],
    cultivates: false,
    weight: 1,
  },
  rogue: {
    titles: ['Brother', 'Third Brother', 'Little'],
    why: [
      'watching the purses more than the tea',
      'selling something under the table',
      'keeping to the back corner',
    ],
    cultivates: false,
    weight: 1,
  },
  'beast-tamer': {
    titles: ['Tamer', 'Herder', 'Hunter'],
    why: [
      'a spirit hound asleep under the bench',
      'back from the wilds with a hide to sell',
      'asking after a lost mount',
    ],
    cultivates: false,
    weight: 1,
  },
};

/** How many passers sit in a teahouse a day. */
export const PASSERS = { least: 3, most: 5 } as const;
