// The law hall on the road (O5, design § Guarded methods: the hunt never seeks you out). Inside a
// power's sphere, while it hunts a leak, its law hall 执法堂 walks the roads looking at faces, its
// party sized by what leaked: a chapter 1 leak two outer disciples, a chapter 2 leak two inner
// disciples, a chapter 3 leak and up an elder. Its people are the power's own roster disciples.
// They wave on a face they don't know; a marked face pays the fine at cold standing and up, or
// has to slip or fight them at hostile and below. Drafted for Jan's review.
import type { Template } from './schema.ts';

const exits = (who: string): Template['exits'] => [
  {
    act: 'leave',
    road: 'pass',
    label: 'Answer them and walk on',
    pass: {
      text: `${who} look you over, ask whether you have seen anyone using their sect's arts, and wave you on.`,
      line: 'is questioned by a law hall on the road and waved on',
    },
  },
  {
    act: 'pay',
    road: 'deal',
    label: 'Pay the fine',
    big: true,
    pass: {
      text: 'You pay what they name, hand over the slip if you carry it, and swear the heart-demon oath on the road never to teach what you learned. They let you go.',
      line: 'pays a law hall’s fine on the road and swears the oath',
      stakes: [{ do: 'fine' }],
    },
  },
  {
    act: 'flee',
    road: 'slip',
    label: 'Slip away',
    pass: {
      text: 'You are off the road before they finish their question, and they don’t catch you.',
      line: 'slips away from a law hall on the road',
    },
  },
  {
    act: 'attack',
    road: 'fight',
    label: 'Fight the law hall',
    big: true,
    pass: {
      text: 'You beat them on the road and leave them to carry the tale home.',
      line: 'beats a law hall’s party on the road',
      stakes: [{ do: 'their-standing', row: 'attacked-ours' }],
    },
  },
];

const place: Template['place'] = {
  traffic: 'road',
  features: [
    { name: 'the road, watched both ways', tags: ['witnesses'] },
    { name: 'a roadside shrine', tags: ['cover'] },
  ],
};

export const LAW_HALL_ENCOUNTERS: readonly Template[] = [
  {
    id: 'law-hall-outer',
    kind: 'cultivator',
    title: 'A law hall’s disciples on the road',
    where: { road: 'on', lawHall: 1 },
    bands: [0, 30],
    weight: 4,
    place,
    roles: [
      {
        id: 'law',
        name: 'two law hall disciples',
        who: { lawHall: true },
        motives: ['duty', 'loyalty'],
      },
    ],
    exits: exits('The two disciples'),
    opening:
      'Two outer disciples with a law hall’s 执法 token at their belts stand across the road, looking at every face that passes.',
  },
  {
    id: 'law-hall-inner',
    kind: 'cultivator',
    title: 'A law hall’s inner disciples on the road',
    where: { road: 'on', lawHall: 2 },
    bands: [0, 30],
    weight: 4,
    place,
    roles: [
      {
        id: 'law',
        name: 'two inner disciples of a law hall',
        who: { lawHall: true },
        motives: ['duty', 'loyalty'],
      },
    ],
    exits: exits('The two inner disciples'),
    opening:
      'Two inner disciples of a law hall wait at the crossing, and their divine sense brushes every traveller who comes up the road.',
  },
  {
    id: 'law-hall-elder',
    kind: 'cultivator',
    title: 'A law hall elder on the road',
    where: { road: 'on', lawHall: 3 },
    bands: [0, 30],
    weight: 4,
    place,
    roles: [
      {
        id: 'law',
        name: 'a law hall elder',
        who: { lawHall: true },
        motives: ['duty', 'pride'],
      },
    ],
    exits: exits('The elder and the road'),
    opening:
      'An elder of a law hall sits by the road with his eyes half closed, and the whole road goes quiet as it passes him.',
  },
];
