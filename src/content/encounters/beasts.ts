// The Border Wilds' beasts on the map (P3.7), the pattern the other kinds follow: each a scene
// template over the roster's beasts, met where they live and at the band the depth gives. Drafted
// in P3.7 for Jan's review.
import type { Template } from './schema.ts';

const LOOT = [{ do: 'loot' }] as const;

export const BEAST_ENCOUNTERS: readonly Template[] = [
  {
    id: 'ridge-wolves',
    kind: 'beast',
    hostile: true,
    title: 'Ridge wolves on the skyline',
    where: { terrain: ['hills', 'plains'] },
    bands: [0, 4],
    weight: 3,
    moves: true,
    place: {
      traffic: 'wilds',
      features: [
        { name: 'the ridge line', tags: ['height'] },
        { name: 'long grass on the slope', tags: ['cover', 'burnable'] },
      ],
    },
    roles: [
      { id: 'pack', name: 'ridge wolves', who: { roster: 'ridge-wolf' }, motives: ['greed'] },
    ],
    exits: [
      {
        act: 'attack',
        road: 'fight',
        label: 'Hunt them',
        pass: {
          text: 'You take the pack on the slope one by one as they come at you. Their pelts are good.',
          line: 'hunts down a pack of ridge wolves on the skyline',
          stakes: [...LOOT],
        },
      },
      {
        act: 'sneak',
        road: 'slip',
        label: 'Sneak past downwind',
        pass: {
          text: 'You keep the wind in your face and the grass between you. They never lift their heads.',
          line: 'slips past a wolf pack, downwind',
        },
      },
      {
        act: 'flee',
        road: 'slip',
        label: 'Back off the ridge',
        pass: {
          text: 'You drop off the ridge and put a valley between you before they settle on a scent.',
          line: 'backs away from a wolf pack on the ridge',
        },
      },
    ],
    opening:
      'Grey shapes trot the ridge above you, noses low, working the wind toward the goat folds.',
  },
  {
    id: 'stone-skin-boar',
    kind: 'beast',
    hostile: true,
    title: 'A stone-skin boar at the roots',
    where: { terrain: ['forest', 'hills'] },
    bands: [0, 2],
    weight: 2,
    place: {
      traffic: 'wilds',
      features: [
        { name: 'roots over a hollow', tags: ['cover', 'dark'] },
        { name: 'a fallen trunk', tags: ['height', 'burnable'] },
      ],
    },
    roles: [{ id: 'boar', name: 'a stone-skin boar', who: { roster: 'stone-skin-boar' } }],
    exits: [
      {
        act: 'attack',
        road: 'fight',
        label: 'Hunt it',
        pass: {
          text: 'It charges with its head down, and its stone skin cracks before your hands do.',
          line: 'kills a stone-skin boar under the roots',
          stakes: [...LOOT],
        },
      },
      {
        act: 'sneak',
        road: 'slip',
        label: 'Leave it rooting',
        pass: {
          text: 'You step wide round the hollow while it grubs, and it never turns its head.',
          line: 'leaves a stone-skin boar to its rooting',
        },
      },
    ],
    opening:
      'Something heavy grunts in the hollow under the roots, and the bark there is scored to the height of your hip.',
  },
  {
    id: 'cave-bats',
    kind: 'beast',
    hostile: true,
    title: 'Cave bats pouring out at dusk',
    where: { terrain: ['karst', 'hills'], hours: 'night' },
    bands: [0, 2],
    weight: 2,
    moves: true,
    place: {
      traffic: 'wilds',
      features: [
        { name: 'the cave mouth', tags: ['dark', 'narrow'] },
        { name: 'guano under the overhang', tags: ['burnable'] },
      ],
    },
    roles: [{ id: 'swarm', name: 'a cave bat swarm', who: { roster: 'cave-bat-swarm' } }],
    exits: [
      {
        act: 'attack',
        road: 'fight',
        label: 'Fight the swarm',
        pass: {
          text: 'You stand in the cave mouth and cut them out of the air until the screeching stops.',
          line: 'fights off a cave bat swarm at a cave mouth',
          stakes: [...LOOT],
        },
      },
      {
        act: 'flee',
        road: 'slip',
        label: 'Hurry through before they settle',
        pass: {
          text: 'You run the last stretch with your sleeve over your face, and they stream past overhead.',
          line: 'runs under a cave bat swarm at dusk',
        },
      },
    ],
    opening: 'The sky over a cave mouth goes black, and the black is screeching.',
  },
  {
    id: 'tide-crabs',
    kind: 'beast',
    hostile: true,
    title: 'Tide crabs on the wrack line',
    where: { terrain: ['coast'] },
    bands: [0, 2],
    weight: 2,
    place: {
      traffic: 'wilds',
      features: [
        { name: 'the wrack line', tags: ['cover'] },
        { name: 'slick rock at the tide pools', tags: ['fall', 'water'] },
      ],
    },
    roles: [{ id: 'crabs', name: 'tide crabs', who: { roster: 'tide-crab' } }],
    exits: [
      {
        act: 'attack',
        road: 'fight',
        label: 'Crack them',
        pass: {
          text: 'You break shells until the rest scuttle into the surf. The meat is sweet.',
          line: 'cracks a clutch of tide crabs on the wrack line',
          stakes: [...LOOT],
        },
      },
      {
        act: 'sneak',
        road: 'slip',
        label: 'Step round above the tide',
        pass: {
          text: 'You keep to the dry stones above the wrack, and the crabs go on picking at a dead seal.',
          line: 'steps round a clutch of tide crabs',
        },
      },
    ],
    opening:
      'The wrack line is moving: crabs the size of cart wheels, clicking over a seal carcass.',
  },
  {
    id: 'karst-python',
    kind: 'beast',
    hostile: true,
    title: 'A python in the sinkhole',
    where: { terrain: ['karst'] },
    bands: [3, 6],
    weight: 2,
    lurks: true,
    place: {
      traffic: 'wilds',
      features: [
        { name: 'the sinkhole rim', tags: ['height', 'fall'] },
        { name: 'ferns in the sinkhole', tags: ['cover'] },
      ],
    },
    roles: [{ id: 'python', name: 'a karst python', who: { roster: 'karst-python' } }],
    exits: [
      {
        act: 'attack',
        road: 'fight',
        label: 'Fight it',
        pass: {
          text: 'Its eyes try to pull you down into the ferns; you keep your feet and your head, and take it.',
          line: 'kills a karst python on a sinkhole rim',
          stakes: [...LOOT],
        },
      },
      {
        act: 'hide',
        road: 'slip',
        label: 'Hold still on the rim',
        pass: {
          text: 'You stop breathing for the length of it passing. It slides back down into the dark.',
          line: 'holds still while a karst python passes',
        },
      },
      {
        act: 'flee',
        road: 'slip',
        label: 'Back away from the rim',
        pass: {
          text: 'You give it the sinkhole and walk the long way round the karst.',
          line: 'backs away from a python’s sinkhole',
        },
      },
    ],
    opening:
      'What you took for a root across the path is warm. The coils go down into the sinkhole further than you can see.',
  },
  {
    id: 'thunder-deer',
    kind: 'beast',
    title: 'Thunder-horned deer on the move',
    where: { terrain: ['plains'] },
    bands: [0, 2],
    weight: 2,
    moves: true,
    place: {
      traffic: 'wilds',
      features: [
        { name: 'open grass to the horizon', tags: ['witnesses'] },
        { name: 'a dry wash', tags: ['cover', 'fall'] },
      ],
    },
    roles: [{ id: 'herd', name: 'thunder-horned deer', who: { roster: 'thunder-deer' } }],
    exits: [
      {
        act: 'attack',
        road: 'fight',
        label: 'Run one down',
        pass: {
          text: 'You cut the slowest out of the herd before the thunder in its horns lets go.',
          line: 'runs down a thunder-horned deer on the open plain',
          stakes: [{ do: 'loot' }],
        },
        short: {
          text: 'The herd breaks with a crack like a storm, and you are left with singed sleeves.',
          line: 'loses a thunder-horned deer to its own lightning',
          stakes: [{ do: 'wound', share: 0.1, days: 3 }],
        },
      },
      {
        act: 'leave',
        road: 'pass',
        label: 'Watch them pass',
        pass: {
          text: 'They go by a li off, horns sparking, and the grass smells of rain for an hour after.',
          line: 'watches a herd of thunder-horned deer go by',
        },
      },
    ],
    opening:
      'A herd lifts its heads out of the grass, and the air between their horns hums like a plucked string.',
  },
  {
    id: 'marsh-crocodile',
    kind: 'beast',
    hostile: true,
    title: 'A crocodile under the reeds',
    where: { terrain: ['marsh'] },
    bands: [0, 4],
    weight: 3,
    lurks: true,
    place: {
      traffic: 'wilds',
      features: [
        { name: 'black water to the knee', tags: ['water', 'crossing'] },
        { name: 'reed beds', tags: ['cover', 'burnable'] },
      ],
    },
    roles: [
      {
        id: 'croc',
        name: 'a marsh crocodile',
        who: { roster: 'marsh-crocodile' },
        motives: ['greed'],
      },
    ],
    exits: [
      {
        act: 'attack',
        road: 'fight',
        label: 'Fight it in the water',
        pass: {
          text: 'It rolls, and you roll with it, and only one of you comes up.',
          line: 'kills a marsh crocodile in the black water',
          stakes: [...LOOT],
        },
      },
      {
        act: 'flee',
        road: 'slip',
        label: 'Get out of the water',
        pass: {
          text: 'You are up on the hummock before its jaws close where your leg was.',
          line: 'gets out of a crocodile’s water in time',
        },
      },
    ],
    opening:
      'The reeds go still. Two knuckles of bark float in the black water, and they are eyes.',
  },
  {
    id: 'stone-ape-troop',
    kind: 'beast',
    hostile: true,
    title: 'A stone ape troop in the pillars',
    where: { terrain: ['karst'] },
    bands: [3, 6],
    weight: 2,
    place: {
      traffic: 'wilds',
      features: [
        { name: 'stone pillars', tags: ['height', 'cover'] },
        { name: 'loose scree', tags: ['fall', 'fragile'] },
      ],
    },
    roles: [{ id: 'troop', name: 'stone apes', who: { roster: 'stone-ape' }, motives: ['pride'] }],
    exits: [
      {
        act: 'attack',
        road: 'fight',
        label: 'Fight the troop',
        pass: {
          text: 'They come down the pillars at you, and the last of them goes back up alone.',
          line: 'breaks a troop of stone apes in the pillars',
          stakes: [...LOOT],
        },
      },
      {
        act: 'hide',
        road: 'slip',
        label: 'Hold still in the pillars',
        pass: {
          text: 'You stand as still as the stone round you until the troop moves on, hooting, to the east.',
          line: 'holds still among the pillars while a stone ape troop passes',
        },
      },
      {
        act: 'flee',
        road: 'slip',
        label: 'Back away the way you came',
        pass: {
          text: 'You give the troop its pillars and take the long way round.',
          line: 'backs out of a stone ape troop’s pillars',
        },
      },
    ],
    opening:
      'The stone forest goes quiet. High on a pillar, what you took for a weathered boulder turns its head.',
  },
];
