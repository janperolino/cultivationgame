// Places and omens on the Border Wilds' map (P3.7): herb finds by terrain, a dead cultivator's
// bones, a spirit spring, an old battlefield, a qi tide and a beast-tide warning. No one stands in
// them, so their exits are takes, passes and the odd slip. Drafted for Jan's review.
import type { Template } from './schema.ts';

export const PLACE_ENCOUNTERS: readonly Template[] = [
  {
    id: 'clover-in-the-grass',
    kind: 'place',
    title: 'Spirit clover in the long grass',
    where: { terrain: ['plains', 'steppe', 'hills'], road: 'off' },
    bands: [0, 3],
    weight: 3,
    place: {
      traffic: 'wilds',
      features: [
        { name: 'a hollow of long grass', tags: ['cover', 'burnable'] },
        { name: 'a dry wash', tags: ['fall', 'cover'] },
      ],
    },
    roles: [],
    exits: [
      {
        act: 'gather',
        road: 'take',
        label: 'Gather it',
        pass: {
          text: 'The grass is greener in the hollow, and the thunderhead clover grows in a tight ring where a herd once bedded. You cut it at the root, a handful at a time.',
          line: 'gathers thunderhead clover from a hollow in the long grass',
          stakes: [{ do: 'find', things: ['thunderhead-clover', 'pit-edge-nettle'], n: [2, 4] }],
        },
      },
      {
        act: 'leave',
        road: 'pass',
        label: 'Leave it for the herders',
        pass: {
          text: 'You leave the ring as you found it. The herders will want it for their deer in autumn.',
          line: 'leaves a ring of clover to the herders',
        },
      },
    ],
    opening:
      'The grass in one hollow is a shade too green, and a tang like rain on hot iron hangs over it.',
  },
  {
    id: 'wrack-and-reed-herbs',
    kind: 'place',
    title: 'Kelp and grapes where the tide leaves them',
    where: { terrain: ['coast', 'marsh'] },
    bands: [0, 3],
    weight: 2,
    place: {
      traffic: 'wilds',
      features: [
        { name: 'the wrack line', tags: ['cover'] },
        { name: 'slick rock at the tide pools', tags: ['fall', 'water'] },
      ],
    },
    roles: [],
    exits: [
      {
        act: 'gather',
        road: 'take',
        label: 'Wade out and gather',
        pass: {
          text: 'The kelp is dark red where the salt has bitten it, and moon sea grapes cling to the rock in beads. You fill your pack before the tide turns.',
          line: 'gathers blood-salt kelp and moon sea grapes at the tide line',
          stakes: [{ do: 'find', things: ['blood-salt-kelp', 'moon-sea-grape'], n: [2, 3] }],
        },
      },
      {
        act: 'leave',
        road: 'pass',
        label: 'Walk the dry stones above',
        pass: {
          text: 'You keep to the dry shingle. The tide will take it by dawn.',
          line: 'walks past a tide line’s wrack',
        },
      },
    ],
    opening:
      'The tide has gone out and left a long red-black line of weed, and in it things shine like wet jewels.',
  },
  {
    id: 'cultivators-bones',
    kind: 'place',
    title: 'A dead cultivator’s bones',
    where: { road: 'off', terrain: ['hills', 'karst', 'forest', 'marsh', 'mountains'] },
    bands: [0, 4],
    weight: 2,
    place: {
      traffic: 'wilds',
      features: [
        { name: 'a skeleton propped against a rock', tags: ['cover'] },
        { name: 'a rotted pack with its straps still tied', tags: ['burnable', 'fragile'] },
      ],
    },
    roles: [],
    exits: [
      {
        act: 'loot',
        road: 'take',
        label: 'Take the pouch at his belt',
        pass: {
          text: 'He died sitting up, a hand on his belt. The pouch holds a few stones gone dull with damp, and a pill in wax that is still good.',
          line: 'takes a dead cultivator’s pouch from his bones',
          stakes: [
            { do: 'stones', n: 14 },
            { do: 'find', things: ['wound-knitting-pill', 'garrison-ration-pill'], n: [1, 1] },
          ],
        },
      },
      {
        act: 'search',
        road: 'take',
        label: 'Read the oilskin in his other hand',
        pass: {
          text: 'It is a map scrap in a dead man’s brush, with a cross by a crooked pillar and three words: not worth it. You are not so sure.',
          line: 'follows a dead man’s map scrap to a hidden place',
          stakes: [{ do: 'site' }, { do: 'hours', n: 1 }],
        },
      },
      {
        act: 'leave',
        road: 'pass',
        label: 'Leave him be',
        pass: {
          text: 'You stand a moment and move on. He has been here long enough that he will keep.',
          line: 'leaves a dead cultivator’s bones undisturbed',
          stakes: [{ do: 'karma', n: 1 }],
        },
      },
    ],
    opening:
      'A skeleton in a rotted robe sits against a rock with its skull on its chest, and beside it, an oilskin scrap in a bony hand.',
  },
  {
    id: 'spirit-seep',
    kind: 'place',
    title: 'A spirit spring seeping from the rock',
    where: { terrain: ['karst', 'hills', 'mountains', 'forest'], road: 'off' },
    bands: [0, 5],
    weight: 2,
    place: {
      traffic: 'wilds',
      features: [
        { name: 'the spring’s pool', tags: ['water'] },
        { name: 'wet stone round it', tags: ['fall'] },
      ],
    },
    roles: [],
    exits: [
      {
        act: 'sit',
        road: 'take',
        label: 'Sit by the water and draw on it',
        pass: {
          text: 'The air by the pool is thick and cool, and your breath comes slow. When you open your eyes the sun has moved and your dantian is warm.',
          line: 'sits by a spirit spring in the rock and breathes it in',
          stakes: [
            { do: 'fuel', share: 0.06 },
            { do: 'hours', n: 2 },
          ],
        },
      },
      {
        act: 'leave',
        road: 'pass',
        label: 'Drink and go on',
        pass: {
          text: 'You drink from your cupped hands and go on feeling lighter than you should.',
          line: 'drinks at a spirit spring and goes on',
        },
      },
    ],
    opening:
      'Water seeps from a crack in the rock and pools in a bowl of white stone, and the moss round it glows faintly even at noon.',
  },
  {
    id: 'old-battlefield',
    kind: 'place',
    title: 'An old battlefield of broken weapons',
    where: { terrain: ['plains', 'steppe', 'hills', 'karst'] },
    bands: [0, 4],
    weight: 2,
    place: {
      traffic: 'wilds',
      features: [
        { name: 'rusted spear shafts in the grass', tags: ['fragile', 'cover'] },
        { name: 'a collapsed trench', tags: ['fall', 'dark'] },
      ],
    },
    roles: [],
    exits: [
      {
        act: 'search',
        road: 'take',
        label: 'Pick through the broken weapons',
        pass: {
          text: 'Most of it is rust, but under a split shield you find a scorched talisman case and a handful of bent stones that a scavenger missed.',
          line: 'picks over the broken weapons of an old battlefield',
          stakes: [
            { do: 'stones', n: 9 },
            { do: 'find', things: ['iron-rain-talisman', 'hiding-talisman'], n: [1, 1] },
            { do: 'hours', n: 1 },
          ],
        },
      },
      {
        act: 'hide',
        road: 'slip',
        label: 'Cross it quickly',
        pass: {
          text: 'You cross at a trot, not looking at the shapes in the grass.',
          line: 'crosses an old battlefield at a trot',
        },
        short: {
          text: 'A rotted trench wall gives way under you, and you land hard among old spear points.',
          line: 'falls into a collapsed trench on an old battlefield',
          stakes: [{ do: 'wound', share: 0.08, days: 3 }],
        },
      },
    ],
    opening:
      'The grass here grows in rows, and the rows are the lines of an army long gone, spears and shields rusting where they fell.',
  },
];

export const OMEN_ENCOUNTERS: readonly Template[] = [
  {
    id: 'qi-tide-off-the-downs',
    kind: 'omen',
    title: 'A qi tide rolling off the Howling Downs',
    where: { terrain: ['plains', 'steppe', 'hills'] },
    bands: [0, 5],
    weight: 2,
    moves: true,
    place: {
      traffic: 'wilds',
      features: [
        { name: 'open grass to the horizon', tags: ['witnesses'] },
        { name: 'a wind-scoured knoll', tags: ['height'] },
      ],
    },
    roles: [],
    exits: [
      {
        act: 'sit',
        road: 'take',
        label: 'Sit in the tide and draw',
        pass: {
          text: 'The wind off the downs hums, and every breath comes in lit. You sit with your hands on your knees until it thins, and rise full.',
          line: 'sits in a qi tide rolling off the Howling Downs',
          stakes: [
            { do: 'fuel', share: 0.08 },
            { do: 'hours', n: 2 },
          ],
        },
      },
      {
        act: 'leave',
        road: 'pass',
        label: 'Walk on through it',
        pass: {
          text: 'The tide goes through you like warm water and is gone behind you, as if it had never been.',
          line: 'walks through a qi tide off the Howling Downs',
        },
      },
    ],
    opening:
      'The grass bends the wrong way against the wind, and the air tastes of metal and rain, though the sky is clear.',
  },
  {
    id: 'beast-tide-warning',
    kind: 'omen',
    title: 'Birds fleeing ahead of a beast tide',
    where: { terrain: ['hills', 'forest', 'plains', 'karst'] },
    bands: [0, 5],
    weight: 2,
    moves: true,
    place: {
      traffic: 'wilds',
      features: [
        { name: 'a gully with overhanging banks', tags: ['cover', 'dark'] },
        { name: 'trampled game trails', tags: ['narrow'] },
      ],
    },
    roles: [],
    exits: [
      {
        act: 'hide',
        road: 'slip',
        label: 'Go to ground in a gully',
        pass: {
          text: 'You press into the gully’s bank while hooves and claws pour overhead for a quarter hour. Dust drifts down and you do not breathe.',
          line: 'goes to ground in a gully while a beast tide passes',
          stakes: [{ do: 'hours', n: 3 }],
        },
        short: {
          text: 'The gully was a game trail. A boar clips you at full speed, and the rest go over your back.',
          line: 'is trampled in a gully by a beast tide',
          stakes: [
            { do: 'wound', share: 0.1, days: 4 },
            { do: 'hours', n: 3 },
          ],
        },
      },
      {
        act: 'leave',
        road: 'pass',
        label: 'Turn aside and go round',
        pass: {
          text: 'You swing a long way to the east of the tide’s track, and the day is half gone before you cut the road again.',
          line: 'goes round a beast tide’s track',
          stakes: [{ do: 'hours', n: 4 }],
        },
      },
    ],
    opening:
      'Every bird in the valley goes up at once, and the ground begins to hum under your feet like a drum skin.',
  },
];
