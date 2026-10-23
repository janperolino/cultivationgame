// Around you 周遭 (People and ties' design, Street time and Around you; P3.9b builds it): a place's
// pulse, a templated line every 15 to 30 seconds while you are on its screens, from its crowd, its
// hours, the kept who live there and what your deeds stirred; about one line in four a small place
// card you can take up by its choices, or by Go in with a key. Never GLM, never a popup: the lines
// scroll off and nothing waits on you. The cast's own lines come with N3. Drafted for Jan's review.
import type { CapabilityId } from './resolver.ts';
import type { CrowdTag } from './crowd.ts';

/** Street time: on a place's screens the clock runs this many times slower (a day in about 2 minutes). */
export const STREET_SLOW = 12;

/** Real seconds between Around you's lines, fewest to most. */
export const AROUND_SECONDS = [15, 30] as const;

/** One line in this many is a small place card. */
export const CARD_EVERY = 4;

/** What a face of each tag is doing, after the face's own line: "a conscript … dozes in the shade". */
export const DOING: Readonly<Record<CrowdTag, readonly string[]>> = {
  soldiers: [
    'argues with a sutler over the weight of his rations',
    'whistles at nobody in particular',
  ],
  conscripts: ['counts his tally of cores twice', 'asks the way to the bounty office'],
  officials: [
    'chalks a mark on a doorpost and moves on',
    'reads a notice aloud to nobody listening',
  ],
  merchants: ['shouts a price and then a lower one', 'bites a tael to see if it is silver'],
  caravaneers: ['loads a wagon with half the care it needs', 'asks if anyone has seen a lame mule'],
  crafters: ['hurries past with a tray of something still smoking', 'curses a cracked mould'],
  disciples: [
    'bows to someone senior and glares once they pass',
    'shows off a sword form to a vendor’s girl',
  ],
  servants: ['haggles hard for a master who will never know', 'runs, late for something'],
  farmers: [
    'sells eggs out of a basket lined with straw',
    'stares at the cultivators as if at weather',
  ],
  hunters: ['skins a hare on the step of a shut shop', 'trades a story for a cup of tea'],
  herders: ['drives three goats through the thick of the street', 'sleeps standing against a wall'],
  smugglers: ['hands someone a parcel without stopping', 'watches the watch'],
  beggars: ['sings for coppers, well', 'follows a fat purse at a careful distance'],
  pilgrims: ['asks the way to the temple', 'lights incense at a crossroads shrine'],
  rogues: ['buys a pill and checks it against the light', 'sizes up everyone who passes'],
  'beast-hunters': ['drops a sack that moves', 'boasts of a kill to anyone who stops'],
};

/** Lines a place's hours bring, by double-hour (子 = 0): the drill horn, the market, the lanterns. */
export const HOUR_LINES: readonly { branch: number; line: string; needs?: CrowdTag }[] = [
  { branch: 3, line: 'The first carts creak in through the gate.' },
  { branch: 4, line: 'The drill horn sounds, and boots answer it.', needs: 'soldiers' },
  { branch: 4, line: 'Shutters come down and the market opens, all its voices at once.' },
  { branch: 6, line: 'The noon bell. Half the street stops to eat.' },
  { branch: 9, line: 'Lanterns are lit, one street after another.' },
  { branch: 10, line: 'Shutters go up on the shops; the wine houses fill.' },
  { branch: 0, line: 'The watch passes, rattling its clappers.' },
  { branch: 1, line: 'A dog barks at something nobody else can see.' },
];

export interface CardChoice {
  label: string;
  /** Your capability against the card's people, at the place's crowd realm plus `up` layers. */
  check?: { yours: CapabilityId; up: number };
  pass: { text: string; karma?: number; renown?: number; taels?: number };
  fail?: { text: string; karma?: number; renown?: number; taels?: number; hurt?: boolean };
}

export interface AroundCard {
  id: string;
  line: string;
  /** The crowd tag it needs in the place, if any. */
  needs?: CrowdTag;
  choices: readonly CardChoice[];
}

export const AROUND_CARDS: readonly AroundCard[] = [
  {
    id: 'bullied-son',
    line: 'Two disciples are pushing a farmer’s son around by the well.',
    needs: 'disciples',
    choices: [
      {
        label: 'Step in',
        check: { yours: 'presence', up: 2 },
        pass: {
          text: 'They take one look at you and find somewhere else to be.',
          karma: 1,
          renown: 1,
        },
        fail: { text: 'They laugh, shove you aside, and go back to the boy.', hurt: true },
      },
      { label: 'Look away', pass: { text: 'The boy’s cries follow you down the street.' } },
    ],
  },
  {
    id: 'cutpurse',
    line: 'A cutpurse’s hand is deep in a merchant’s sleeve.',
    choices: [
      {
        label: 'Grab the wrist',
        check: { yours: 'speed', up: 0 },
        pass: {
          text: 'You catch the wrist. The merchant presses three taels on you.',
          karma: 1,
          taels: 3,
        },
        fail: { text: 'The wrist twists free and is gone into the crowd.' },
      },
      {
        label: 'Shout',
        pass: { text: 'The cutpurse bolts; the merchant clutches his sleeve and nods to you.' },
      },
      { label: 'Let it be', pass: { text: 'Not your purse.' } },
    ],
  },
  {
    id: 'cart',
    line: 'A peddler’s cart has tipped over, melons rolling everywhere.',
    choices: [
      {
        label: 'Help gather them',
        pass: {
          text: 'You chase down melons for a while. The peddler gives you the bruised one.',
          karma: 1,
        },
      },
      { label: 'Walk on', pass: { text: 'Someone steps on a melon behind you.' } },
    ],
  },
  {
    id: 'drunk-rogue',
    line: 'A drunk rogue cultivator is shoving people to see who shoves back.',
    needs: 'rogues',
    choices: [
      {
        label: 'Shove back',
        check: { yours: 'force', up: 1 },
        pass: { text: 'He sits down hard in the dust, and the street laughs.', renown: 1 },
        fail: { text: 'He shoves harder. You end up in the gutter.', hurt: true },
      },
      {
        label: 'Talk him down',
        check: { yours: 'presence', up: 1 },
        pass: { text: 'He decides you are his friend, and wanders off singing.' },
        fail: { text: 'He takes offence at your face and spits on your shoes.' },
      },
      { label: 'Step around him', pass: { text: 'You give him the street.' } },
    ],
  },
  {
    id: 'lost-child',
    line: 'A child is crying for her mother at the crossing.',
    choices: [
      {
        label: 'Find her mother',
        check: { yours: 'perception', up: 0 },
        pass: {
          text: 'You spot the frantic woman two streets over. She bows to you three times.',
          karma: 1,
        },
        fail: { text: 'You search until the watch takes the child off your hands.' },
      },
      { label: 'Leave it to the watch', pass: { text: 'The watch will see to it. Probably.' } },
    ],
  },
  {
    id: 'core-dispute',
    line: 'Two beast hunters are about to draw on each other over a core.',
    needs: 'beast-hunters',
    choices: [
      {
        label: 'Settle it',
        check: { yours: 'presence', up: 2 },
        pass: {
          text: 'You weigh the core and split the price. Both grumble; neither draws.',
          renown: 1,
        },
        fail: { text: 'Both tell you to keep out of it, and draw anyway. You step back.' },
      },
      { label: 'Watch', pass: { text: 'One of them walks away bleeding, the core in his fist.' } },
    ],
  },
];
