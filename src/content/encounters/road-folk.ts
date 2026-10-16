// The mortals of the Border Wilds' roads (P3.7): peddlers, refugees, bandits who are no match,
// post riders, hunters and pilgrims. A mortal is never a real threat to a cultivator except by
// numbers or law, so these are mostly trade, news and small kindnesses. Drafted for Jan's review.
import type { Template } from './schema.ts';

export const MORTAL_ENCOUNTERS: readonly Template[] = [
  {
    id: 'salt-mule-train',
    kind: 'mortal',
    title: 'A salt peddler’s mule train',
    where: { road: 'on', terrain: ['plains', 'steppe', 'hills', 'coast'] },
    bands: [0, 5],
    weight: 3,
    moves: true,
    place: {
      traffic: 'road',
      features: [
        { name: 'six mules roped nose to tail', tags: ['witnesses'] },
        { name: 'sacks of grey salt on the packs', tags: ['burnable', 'fragile'] },
      ],
    },
    roles: [
      {
        id: 'peddler',
        name: 'a salt peddler',
        who: { mortal: 'salt-peddler' },
        motives: ['greed'],
      },
    ],
    exits: [
      {
        act: 'buy',
        road: 'deal',
        label: 'Buy rations off the mules',
        cost: { stones: 6 },
        pass: {
          text: 'He weighs your stones on a thumb scale and counts out three days of rations, grumbling at the price he named himself.',
          line: 'buys travel rations from a salt peddler on the road',
          stakes: [{ do: 'item', id: 'travel-rations', n: 3 }],
        },
      },
      {
        act: 'ask',
        road: 'talk',
        label: 'Ask the road ahead',
        against: 'peddler',
        pass: {
          text: 'He has been three weeks on the beacon road and tells you which wells are bitter and which fords are up.',
          line: 'gets the road ahead from a salt peddler',
          stakes: [{ do: 'memory', role: 'peddler', row: 'told-new' }],
        },
      },
      {
        act: 'leave',
        road: 'pass',
        label: 'Let the mules by',
        pass: {
          text: 'You step onto the verge and the train goes past in a haze of salt dust and mule sweat.',
          line: 'steps aside for a salt peddler’s mule train',
        },
      },
    ],
    opening:
      'A bell rings ahead, and then six mules come over the rise under grey sacks, a thin man in a sun hat walking at their head.',
  },
  {
    id: 'raided-village-refugees',
    kind: 'mortal',
    title: 'Refugees from a raided village',
    where: { road: 'on', terrain: ['plains', 'hills', 'steppe'] },
    bands: [0, 3],
    weight: 2,
    moves: true,
    place: {
      traffic: 'road',
      features: [
        { name: 'a handcart with a broken wheel', tags: ['fragile', 'burnable'] },
        { name: 'the road’s dry verge', tags: ['witnesses'] },
      ],
    },
    roles: [
      {
        id: 'family',
        name: 'refugees from a burnt village',
        who: { mortal: 'refugee' },
        count: [4, 7],
        motives: ['fear', 'family'],
      },
    ],
    exits: [
      {
        act: 'gift',
        road: 'deal',
        label: 'Give them food',
        cost: { item: 'millet-cake' },
        big: true,
        pass: {
          text: 'A woman breaks the cake into seven pieces without a word, and the smallest child gets the biggest.',
          line: 'feeds refugees from a raided village',
          stakes: [
            { do: 'karma', n: 3 },
            { do: 'memory', role: 'family', row: 'good-turn' },
          ],
        },
      },
      {
        act: 'ask',
        road: 'talk',
        label: 'Ask who burnt them out',
        against: 'family',
        pass: {
          text: 'They say riders came from the grass at dusk, on horses too big, and that the raiders’ camp is a day south by the dry wash.',
          line: 'learns from refugees where the raiders went',
          stakes: [{ do: 'site' }],
        },
      },
      {
        act: 'leave',
        road: 'pass',
        label: 'Walk on',
        pass: {
          text: 'You give the cart a wide berth. Nobody asks you for anything, and that is worse.',
          line: 'walks past refugees on the beacon road',
        },
      },
    ],
    opening:
      'A handcart lies tipped on the verge, and seven people in singed clothes are trying to put the wheel back on it.',
  },
  {
    id: 'ditch-bandits',
    kind: 'mortal',
    title: 'Mortal bandits in a ditch',
    where: { road: 'on', terrain: ['hills', 'plains', 'forest', 'marsh'] },
    bands: [0, 1],
    weight: 2,
    lurks: true,
    place: {
      traffic: 'road',
      features: [
        { name: 'a ditch beside the road', tags: ['cover'] },
        { name: 'a rope strung across the way', tags: ['fall', 'narrow'] },
      ],
    },
    roles: [
      {
        id: 'gang',
        name: 'mortal bandits',
        who: { mortal: 'mortal-bandit' },
        count: [3, 5],
        motives: ['greed'],
      },
    ],
    exits: [
      {
        act: 'attack',
        road: 'fight',
        label: 'Teach them better',
        pass: {
          text: 'The first rushes you with a cudgel and finds your hand already on his wrist. The rest are over the ditch before he lands.',
          line: 'beats off mortal bandits waiting in a ditch',
          stakes: [{ do: 'loot' }],
        },
        short: {
          text: 'Five against one, and a net thrown from behind. They are poor fighters, but you are tired, and a cudgel finds your ribs.',
          line: 'is mobbed by mortal bandits in a roadside ditch',
          stakes: [{ do: 'wound', share: 0.05, days: 2 }],
        },
      },
      {
        act: 'threaten',
        road: 'talk',
        label: 'Let them feel what you are',
        against: 'gang',
        pass: {
          text: 'You do not even draw. The one with the rope drops it, and the ditch empties like a spilled sack.',
          line: 'stares down mortal bandits with a glance',
        },
      },
      {
        act: 'leave',
        road: 'pass',
        label: 'Step over the rope',
        pass: {
          text: 'You step over it as though it were a twig and walk on. Nobody in the ditch breathes until you are far off.',
          line: 'steps over a bandits’ rope and walks on',
        },
      },
    ],
    opening:
      'A rope lies slack across the road, and five heads in the ditch beside it are trying very hard not to be heads.',
  },
  {
    id: 'jing-post-rider',
    kind: 'mortal',
    title: 'A post rider of the Jing',
    where: { road: 'on' },
    bands: [0, 5],
    weight: 2,
    moves: true,
    place: {
      traffic: 'road',
      features: [
        { name: 'a post station with a lamp and a trough', tags: ['witnesses', 'fire'] },
        { name: 'the beacon road’s paving', tags: ['crossing'] },
      ],
    },
    roles: [
      {
        id: 'rider',
        name: 'a post rider of the Jing',
        who: { mortal: 'post-rider' },
        motives: ['duty'],
      },
    ],
    exits: [
      {
        act: 'ask',
        road: 'talk',
        label: 'Ask for news off the wall',
        against: 'rider',
        pass: {
          text: 'He waters his horse while he talks: a wolf king on the ridge, a toll doubled at the fort, and an old lodge the garrison gave up last winter.',
          line: 'gets news from a post rider of the Jing',
          stakes: [{ do: 'site' }, { do: 'memory', role: 'rider', row: 'told-new' }],
        },
      },
      {
        act: 'leave',
        road: 'pass',
        label: 'Clear the road for him',
        pass: {
          text: 'You step aside and he goes by without slowing, a sealed tube bouncing on his saddle.',
          line: 'clears the road for a post rider of the Jing',
        },
      },
    ],
    opening:
      'Hooves come hard down the paved road, and a man in the Jing’s grey pulls up at the trough, his horse blowing steam.',
  },
  {
    id: 'hunters-blind',
    kind: 'mortal',
    title: 'A hunter’s blind in the brush',
    where: { road: 'off', terrain: ['forest', 'hills', 'marsh'] },
    bands: [0, 2],
    weight: 2,
    lurks: true,
    place: {
      traffic: 'wilds',
      features: [
        { name: 'a blind of woven brush', tags: ['cover', 'burnable'] },
        { name: 'a game trail with a baited snare', tags: ['narrow'] },
      ],
    },
    roles: [
      {
        id: 'hunter',
        name: 'a hunter in the blind',
        who: { mortal: 'hunter' },
        motives: ['greed', 'fear'],
      },
    ],
    exits: [
      {
        act: 'buy',
        road: 'deal',
        label: 'Buy a hide and meat',
        cost: { stones: 8 },
        pass: {
          text: 'He whistles low and a boy comes out of the brush with a rolled hide and a haunch wrapped in leaves. He does not ask what you want it for.',
          line: 'buys a hide and venison from a hunter in a blind',
          stakes: [
            { do: 'item', id: 'beast-hide', n: 1 },
            { do: 'item', id: 'beast-meat', n: 1 },
          ],
        },
      },
      {
        act: 'sneak',
        road: 'slip',
        label: 'Go wide of his snares',
        pass: {
          text: 'You skirt the baited trail by thirty paces, and the blind stays quiet, its owner relieved or insulted.',
          line: 'skirts a hunter’s blind and its snares',
        },
        short: {
          text: 'A bowstring thrums and a bolt thuds into the tree by your head. "Thought you were a deer," he calls, not sounding sorry.',
          line: 'is shot at by a hunter who took them for a deer',
          stakes: [{ do: 'wound', share: 0.05, days: 2 }],
        },
      },
    ],
    opening:
      'A mat of brush that is too neat to be natural sits beside the trail, and a bowstring creaks inside it as you come level.',
  },
  {
    id: 'shrine-pilgrims',
    kind: 'mortal',
    title: 'Pilgrims on the way to a shrine',
    where: { road: 'on', terrain: ['hills', 'plains', 'coast'] },
    bands: [0, 5],
    weight: 2,
    moves: true,
    place: {
      traffic: 'road',
      features: [
        { name: 'a roadside cairn hung with prayer strips', tags: ['witnesses', 'fire'] },
        { name: 'a stone bench worn smooth', tags: ['cover'] },
      ],
    },
    roles: [
      {
        id: 'pilgrims',
        name: 'pilgrims bound for a shrine',
        who: { mortal: 'pilgrim' },
        count: [3, 6],
        motives: ['duty'],
      },
    ],
    exits: [
      {
        act: 'ask',
        road: 'talk',
        label: 'Walk a li with them',
        against: 'pilgrims',
        pass: {
          text: 'They are going to the earth shrine on the ridge to ask for a dry spring, and an old man shares a millet cake with you and talks of the thin years.',
          line: 'walks a li with pilgrims bound for a shrine',
          stakes: [
            { do: 'item', id: 'millet-cake', n: 1 },
            { do: 'hours', n: 1 },
          ],
        },
      },
      {
        act: 'gift',
        road: 'deal',
        label: 'Leave a few stones for the shrine',
        cost: { stones: 3 },
        big: true,
        pass: {
          text: 'You drop the stones in the old man’s bowl. He bows three times, and the others turn to bow too.',
          line: 'leaves an offering with pilgrims bound for a shrine',
          stakes: [
            { do: 'karma', n: 2 },
            { do: 'memory', role: 'pilgrims', row: 'good-turn' },
          ],
        },
      },
      {
        act: 'leave',
        road: 'pass',
        label: 'Let them go by',
        pass: {
          text: 'They go by in a slow line, murmuring, and not one looks up from the dust.',
          line: 'lets a line of pilgrims go by',
        },
      },
    ],
    opening:
      'A line of people in white are walking the road with their eyes on the ground, murmuring in time with their steps.',
  },
];
