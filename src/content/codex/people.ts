// The codex's People entries, one a row of docs/features.md; drafted, awaiting Jan's review.
import type { CodexEntry } from './schema.ts';

export const PEOPLE: readonly CodexEntry[] = [
  {
    id: 'people-screen',
    title: 'The People screen',
    hanzi: '人物',
    area: 'people',
    text: [
      'Everyone you have met is listed here, shown two ways: Circles, which groups them by kin and home, by the place you met them, and the road for wanderers, or the Web of threads, where closer to the centre means closer to you. Click anyone to open their page.',
      'A person’s page shows only what you know of them: their nature, what they want, what they like, how far they trust you, the memories they hold of you and the ties of theirs you have learned. It also shows their realm, where they are, when you met and a log of the chronicle lines about them. Memories fade at their own pace, and some never do. A word you have not learned is shown as one more you haven’t seen.',
    ],
    numbers: [
      ['Views', 'Circles, Web of threads'],
      ['Trust', 'A word and a level from −2 to +2'],
      ['A memory', 'A value and a bar showing how much of it is left'],
    ],
    where: { screen: 'people', label: 'People' },
    met: { screen: 'people' },
    way: 'codex',
    feature:
      'The People screen: circles or web, a person’s page (nature, wants, likes, trust, memories, ties, log)',
  },
  {
    id: 'news-dot',
    title: 'The fresh-news dot',
    hanzi: '新闻',
    area: 'people',
    text: [
      'A gold dot on someone means there is news about them you have not read: a change to what you know of them, or a chronicle line that names them. It clears when you open their page.',
      'The screen opens on whoever has news, or on whoever you heard of last.',
    ],
    where: { screen: 'people', label: 'People' },
    met: { screen: 'people' },
    way: 'codex',
    feature: 'The fresh-news dot',
  },
  {
    id: 'powers-know-you',
    title: 'The powers that know you, and your name',
    hanzi: '名声',
    area: 'people',
    text: [
      'Under the list, the screen shows each power that holds reasons about you and where you stand with it, in one word. Powers you belong to show your seat and contribution instead. A power whose standing is held down by heat is marked so.',
      'Your name has its own count, by region: renown and infamy apart, each from 0 to 9. A point fades a season after its last gain. Strangers know your name in a region from level 3, and anyone honors renown in a check.',
    ],
    numbers: [
      ['Standing words', 'Hunted, hostile, cold, unknown, known, favored, honored'],
      ['Known, favored, honored from', '+10, +30, +60'],
      ['Heat caps standing at', 'Heat 3: −10; heat 6: −30; heat 9: −60'],
      ['Points for levels 1 to 9', '1, 2, 4, 7, 11, 16, 22, 29, 37'],
      ['A name’s reach', 'Level 3: across a town; 6: the region; 9: beyond it'],
      ['Fame fades', 'A point each 90 days'],
    ],
    where: { screen: 'people', label: 'People › under the list' },
    met: { screen: 'people' },
    way: 'codex',
    feature: 'The powers that know you, your name’s reach by region',
  },
  {
    id: 'ties-opinion',
    title: 'Ties and opinion',
    hanzi: '人情',
    area: 'people',
    text: [
      'What you choose in a card or a scene is remembered by whoever it touched, and by those close to them. A person’s opinion of you is the sum of what they remember. A memory fades unless it is one that never does.',
      'A deed done to someone counts in full for those who love them: kin, a sworn sibling, a lover, a betrothed, a dao companion, a master or disciple, a guardian or ward, a backer or their charge. It counts at half for friends and fellow members of one power.',
    ],
    numbers: [
      ['Healed me', '+20, fading over a year'],
      ['A tie that carries a deed in full', 'Kin, sworn, lover, master and the rest listed above'],
      ['Friends and fellow members', '×0.5'],
    ],
    where: { screen: 'cultivate', label: "Cultivate's tray, and a person's page" },
    met: { test: 'card' },
    way: 'codex',
    feature: 'Ties and opinion moving through cards and scenes',
  },
  {
    id: 'followers-bonds',
    title: 'Followers and their bonds',
    hanzi: '随从',
    area: 'people',
    text: [
      'Someone can follow you, and a recruit is made in a scene, never at a door. The bond is why they follow, and it is also how it breaks. A person who follows you shows a Follows you line on their page, with the bond and what ends it.',
      'A paid follower leaves when the pay stops. A loyal one needs to trust you at friendly or better to start with, and stays while their opinion holds. How far it can fall depends on their Fidelity. A frightened one runs or turns when you look weak or are out of reach. A shared goal lasts until it is done or dropped, and wants an ambition or a revenge in them. A treacherous follower may turn on you instead of leaving.',
    ],
    numbers: [
      ['Pay', 'A month’s wage: 30 low-grade stones at Qi Condensation, 270 at Foundation'],
      [
        'Loyalty holds while opinion is at least',
        '+10 at middling Fidelity, up to +40 for the fickle, down to −40 for the loyal',
      ],
      ['Fear breaks after', '7 days out of your reach'],
      ['You look weak', 'Below half HP, or down'],
    ],
    where: { screen: 'people', label: "A person's page › Follows you" },
    met: { test: 'follower' },
    way: 'codex',
    feature: 'Followers and their bonds (pay, loyalty, fear, a goal)',
  },
  {
    id: 'rumors-talk',
    title: 'Rumors and talk',
    hanzi: '传闻',
    area: 'people',
    text: [
      'A teahouse or a village elder will talk to you once a day, and the talk is a rumor: one place near them that you have not heard of. A place you have heard of shows in its ring on the map, and a rumor starts it as Rumored. Take the tea, or sit with the elder, from the place’s Hear door.',
      'News about people comes another way: a gold dot on their page, and the chronicle lines that name them.',
    ],
    numbers: [
      ['A pot of tea at a teahouse', '5 taels'],
      ['A village elder', 'Free'],
      ['A rumor', 'One a day, from the nearest 3 unknown places'],
      ['Reach', 'Teahouse 6,000 li; elder 4,500 li'],
    ],
    where: { screen: 'world', label: 'A place › Hear' },
    met: { test: 'place' },
    way: 'codex',
    feature: 'Rumors about people and places',
  },
];
