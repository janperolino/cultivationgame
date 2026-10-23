// Going in: places and people, the crowd (design § The world, Going in: Who is there, A place's air
// and crowd; P3.9b's talk with Jan, 2026-10-22). A frame's crowd is faces, not people: a count and
// a few one-line faces drawn from the place's crowd tags, each only a seed until you engage it.
// Engaging one (talking, asking a name, reading a realm, any act at them, or them acting on you)
// makes them from the tag's mortal kind or roster template, at a realm by the general rule below:
// the land's qi says how many are cultivators, and each realm up is design's share of the realm
// below (How many live there) times where it is and its prosperity. Drafted for Jan's review.
import type { RealmId } from './realms.ts';

export const CROWD_TAGS = [
  'soldiers',
  'conscripts',
  'officials',
  'merchants',
  'caravaneers',
  'crafters',
  'disciples',
  'servants',
  'farmers',
  'hunters',
  'herders',
  'smugglers',
  'beggars',
  'pilgrims',
  'rogues',
  'beast-hunters',
] as const;
export type CrowdTag = (typeof CROWD_TAGS)[number];

export interface CrowdInfo {
  /** A mortal kind (content/encounters/mortals.ts) they are when no cultivator. */
  mortal: string | null;
  /** The roster template they are when a cultivator; `power` for the place's power's own disciple. */
  template: string | 'power' | null;
  /** The share of them who cultivate, on land of ordinary qi (density 5). */
  cultivates: number;
  /** One-line faces, drawn by the face's seed. */
  faces: readonly string[];
}

export const CROWD: Readonly<Record<CrowdTag, CrowdInfo>> = {
  soldiers: {
    mortal: 'soldier',
    template: 'march-conscript',
    cultivates: 1 / 4,
    faces: [
      'an off-duty spearman haggling over salt',
      'two soldiers sharing a jar in the shade',
      'a sergeant with a scar across both lips',
      'a soldier mending a strap with his teeth',
    ],
  },
  conscripts: {
    mortal: null,
    template: 'march-conscript',
    cultivates: 1,
    faces: [
      'a conscript with a bandaged hand',
      'three conscripts comparing their tallies of cores',
      'a conscript asleep on his spear',
      'a young conscript who keeps touching his token',
    ],
  },
  officials: {
    mortal: 'clerk',
    template: 'rogue-cultivator',
    cultivates: 1 / 10,
    faces: [
      'a tally clerk with ink to the wrist',
      'a magistrate’s runner in a black cap',
      'a tax assessor counting doorways',
    ],
  },
  merchants: {
    mortal: 'merchant',
    template: 'rogue-cultivator',
    cultivates: 1 / 10,
    faces: [
      'a cloth merchant counting on his fingers',
      'a pill peddler with a tray on a strap',
      'a woman weighing silver on a pocket scale',
      'a fat merchant fanning himself with a ledger',
    ],
  },
  caravaneers: {
    mortal: 'merchant',
    template: 'caravan-guard',
    cultivates: 1 / 3,
    faces: [
      'a caravan guard asleep against a wagon wheel',
      'a drover shouting at an ox that won’t move',
      'a caravan master reading a route on a hide',
    ],
  },
  crafters: {
    mortal: 'craftsman',
    template: 'rogue-cultivator',
    cultivates: 1 / 4,
    faces: [
      'a refiner’s boy with a burnt sleeve',
      'a talisman maker with cinnabar under her nails',
      'a herb sorter with a basket on each hip',
      'a tanner reeking of the vats',
    ],
  },
  disciples: {
    mortal: null,
    template: 'power',
    cultivates: 1,
    faces: [
      'two outer disciples arguing over a core',
      'a disciple running an errand at a sprint',
      'an inner disciple whom the others step aside for',
      'a disciple practising forms in a doorway',
    ],
  },
  servants: {
    mortal: 'servant',
    template: null,
    cultivates: 0,
    faces: [
      'a maid carrying a lacquered box',
      'a houseboy sent for wine, dawdling',
      'an old steward bargaining for eels',
    ],
  },
  farmers: {
    mortal: 'farmer',
    template: null,
    cultivates: 0,
    faces: [
      'a farmer with a hen under each arm',
      'a farm wife selling millet by the scoop',
      'a boy driving geese the wrong way',
    ],
  },
  hunters: {
    mortal: 'hunter',
    template: null,
    cultivates: 0,
    faces: ['a hunter selling a brace of hares', 'a trapper with a coil of snares on his shoulder'],
  },
  herders: {
    mortal: 'herder',
    template: null,
    cultivates: 0,
    faces: ['a herder in felt, smelling of goat', 'a herd girl leading a lame horse'],
  },
  smugglers: {
    mortal: 'mortal-bandit',
    template: 'night-bridge-smuggler',
    cultivates: 1 / 2,
    faces: [
      'a boatman who won’t meet your eye',
      'a woman with a sack too heavy for what she says is in it',
      'a man with three purses and no trade',
    ],
  },
  beggars: {
    mortal: 'beggar',
    template: null,
    cultivates: 0,
    faces: [
      'an orphan watching your purse',
      'a beggar with one leg and a good voice',
      'two children selling a lizard on a string',
    ],
  },
  pilgrims: {
    mortal: 'pilgrim',
    template: 'rogue-cultivator',
    cultivates: 1 / 20,
    faces: ['a pilgrim counting prayer beads', 'an old woman carrying her husband’s tablet'],
  },
  rogues: {
    mortal: null,
    template: 'rogue-cultivator',
    cultivates: 1,
    faces: [
      'a lone cultivator in a patched robe',
      'a rogue cultivator eating standing up, sword on his back',
      'a woman with a gourd of spirit wine and nobody to share it',
    ],
  },
  'beast-hunters': {
    mortal: null,
    template: 'beast-hunter',
    cultivates: 1,
    faces: [
      'a beast hunter with a wolf pelt over one shoulder',
      'a hunting party splitting a core’s price',
      'a beast hunter with fresh claw marks down his arm',
    ],
  },
};

/** The land's qi against density 5, from the rooted children's rate (How many live there). */
export const QI_CULTIVATORS: Readonly<Record<number, number>> = {
  1: 0.4,
  2: 0.5,
  3: 0.67,
  4: 0.8,
  5: 1,
  6: 1.33,
  7: 2,
  8: 2.9,
  9: 4,
};

/** Each realm a share of the one below (How many live there): the chance of a step up. */
export const REALM_STEP: Readonly<Partial<Record<RealmId, number>>> = {
  'foundation-establishment': 1 / 30,
  'core-formation': 1 / 60,
  'nascent-soul': 1 / 50,
  'deity-transformation': 1 / 20,
  'void-refinement': 1 / 10,
};

/** Where cultivators gather: the step up's chance times this, by where the crowd stands. */
export const GATHER = { village: 0.5, town: 1.5, city: 3, seat: 5, wilds: 0.5 } as const;
export type GatherAt = keyof typeof GATHER;

/** Prosperity's pull on the step: ×1.25 a step above ordinary (5), ×0.8 a step below. */
export const PROSPERITY_STEP = { up: 1.25, down: 0.8 } as const;

/** A realm above the place's top comes only as a passing visitor, at this share. */
export const ABOVE_TOP = 0.1;

/** A street's crowd at its busiest, by where it stands (Jan's yes, P3.9b). */
export const STREET_CROWD = { city: 60, town: 20, village: 6, seat: 20, wilds: 0 } as const;

/**
 * What stays out at night, by size (Jan's call: a city of millions stays a little alive): the
 * floor under a door's own hours, raised ×1.25 a step of prosperity above ordinary.
 */
export const NIGHT_FLOOR = { city: 0.25, town: 0.1, village: 0.02, seat: 0.05, wilds: 0 } as const;

/** The faces a frame shows by name; the rest is the count. */
export const FACES_SHOWN = 4;

/**
 * The crowd turns over each double-hour: its faces are drawn again by the hour. Where no watch keeps
 * the frame, a face may come at you once a double-hour at this chance (a cutpurse, a drunk).
 */
export const HOSTILE_FACE = 1 / 8;
