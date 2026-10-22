// The tokens the roster's people carry (P3.9, riding along from the code review: the roster's
// `carries` as items): a power's token is proof of whose you are, a prop that backs a talk ×1.5
// and the thing a frame is made with. What a carried string comes home as is `CARRIED_ITEM`.
// Drafted for Jan's review.
import type { Item } from './items.ts';

export const TOKENS: readonly Item[] = [
  {
    id: 'march-token',
    name: 'Token of the March',
    pinyin: 'Anbian Ling',
    hanzi: '安边令',
    tier: 1,
    rarity: 'white',
    kind: 'treasure',
    price: 2,
    uses: { proof: { power: 'qm-anbian-fu' } },
    source:
      'the Pacified March, which hands one to every conscript at muster and docks his pay when he loses it',
    text: 'A bronze tally stamped with the March’s seal and a number. Gate wardens read it before they read the face above it.',
  },
  {
    id: 'gate-token',
    name: 'Beast-Butcher Gate Token',
    pinyin: 'Tushou Men Ling',
    hanzi: '屠兽门令',
    tier: 1,
    rarity: 'white',
    kind: 'treasure',
    price: 3,
    uses: { proof: { power: 'qm-tushou-men' } },
    source: 'the Beast-Butcher Gate, whose disciples carry it on a thong of boar hide',
    text: 'A disc of beast bone with the Gate’s cleaver burned into it. In the Border Wilds’ markets it gets you served first, or watched.',
  },
  {
    id: 'sea-taming-token',
    name: 'Sea-Taming Sect Token',
    pinyin: 'Yuhai Zong Ling',
    hanzi: '驭海宗令',
    tier: 1,
    rarity: 'white',
    kind: 'treasure',
    price: 3,
    uses: { proof: { power: 'sea-yuhai-zong' } },
    source: 'the Sea-Taming Sect, cut for each disciple from the same block of salt-white jade',
    text: 'A sliver of pale jade cold as seawater. Hold it to the light and a wave moves inside it.',
  },
  {
    id: 'white-fang-token',
    name: 'White Fang Stockade Token',
    pinyin: 'Baiya Zhai Ling',
    hanzi: '白牙寨令',
    tier: 1,
    rarity: 'white',
    kind: 'treasure',
    price: 1,
    uses: { proof: { power: 'sea-baiya-zhai' } },
    source:
      'the White Fang Stockade of the Raider Isles, a shark’s tooth with the stockade’s notch filed in it',
    text: 'A shark’s tooth on a cord, notched three times. Shown on the coast, it buys silence or a knife.',
  },
];

/** What a roster template's carried thing comes home as, when it is a thing (core/loot.ts). */
export const CARRIED_ITEM: Readonly<Record<string, string>> = {
  'token of the March': 'march-token',
  "the Gate's token": 'gate-token',
  "the Sect's token": 'sea-taming-token',
  "White Fang Stockade's token": 'white-fang-token',
  'escape talisman': 'earth-escape-talisman',
};
