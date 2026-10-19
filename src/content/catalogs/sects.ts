// A5.2's sects that keep a shop (E2.1): the Hundred Reins Sect (qm-baijiang-zong), the Pavilion of
// Bound Bones (qm-fugu-ge) and the Lamp-Keeper Sect (qm-shoudeng-zong). Each sells to its own
// members out of its own hall, as the Beast-Butcher Gate does; their methods wait for the
// organizations layer, where a sect shop prices in contribution. The Temple of the Quiet Bell asks
// no fee, the Hu Clan trades in Heaven's Eye and Red Marrow Cave through the Nameless Market, so
// they keep none. Drafted in E2.1. **Awaiting Jan's review.**
import type { Catalog } from './types.ts';

export const HUNDRED_REINS: Catalog = {
  at: 'qm-baijiang-zong',
  layer: 'place',
  items: [
    {
      id: 'paired-rider-lance',
      name: 'Paired Rider’s Lance',
      pinyin: 'Shuangqi Qiang',
      hanzi: '双骑枪',
      tier: 2,
      rarity: 'green',
      upTo: 'purple',
      kind: 'gear',
      uses: { equip: { slot: 'weapon', weapon: 'spear' }, inscribe: { slots: 2 } },
      properties: [
        { name: 'Bond-Carried', effects: [{ stat: 'spearPower', value: 0.05 }] },
        { name: 'Two Breaths as One', effects: [{ stat: 'initiative', value: 1 }] },
      ],
      source: 'the bonding stables, where a lance is cut to a disciple and the beast they ride',
      text: 'A lance balanced for a rider whose mount moves before they ask it to. Out of the saddle it feels a step slow.',
    },
    {
      id: 'storm-hawk-pinion-talisman',
      name: 'Storm-Hawk Pinion Talisman',
      pinyin: 'Leiying Yu Fu',
      hanzi: '雷鹰羽符',
      tier: 1,
      rarity: 'white',
      upTo: 'blue',
      kind: 'talisman',
      uses: { fight: { form: 'projectile', damage: 'wind', power: 46 } },
      source: 'the sect’s scribes, who ink them on the flight feathers the storm-hawks moult',
      text: 'A hawk’s pinion written over in fine script. Thrown, it stoops on its mark like the bird it came from.',
    },
    {
      id: 'shared-blood-pill',
      name: 'Shared-Blood Pill',
      pinyin: 'Gongxue Dan',
      hanzi: '共血丹',
      tier: 1,
      rarity: 'white',
      upTo: 'blue',
      kind: 'pill',
      uses: { consume: { effects: [{ effect: 'restore', what: 'hp', share: 0.3 }], dose: 10 } },
      source: 'the sect’s alchemists, who brew a rider’s and a beast’s dose from the same cauldron',
      text: 'A red pill brewed in pairs, one for the rider and one for the beast. Taken alone, it still closes a wound.',
    },
  ],
  lots: [
    { thing: 'paired-rider-lance', shops: ['sect'], weight: 0.5 },
    { thing: 'storm-hawk-pinion-talisman', shops: ['sect'], count: [1, 3] },
    { thing: 'shared-blood-pill', shops: ['sect'], count: [1, 4] },
  ],
};

export const BOUND_BONES: Catalog = {
  at: 'qm-fugu-ge',
  layer: 'place',
  items: [
    {
      id: 'skull-socket-robe',
      name: 'Skull-Socket Robe',
      pinyin: 'Lukong Pao',
      hanzi: '颅孔袍',
      tier: 2,
      rarity: 'green',
      upTo: 'purple',
      kind: 'gear',
      uses: { equip: { slot: 'armor', material: 'physical' }, inscribe: { slots: 2 } },
      properties: [
        { name: 'Array-Thread Hem', effects: [{ stat: 'soulDefense', value: 0.05 }] },
        { name: 'Bone-Dust Weave', effects: [{ stat: 'physicalResist', value: 0.04 }] },
      ],
      source: 'the hall in the great skull’s eye socket, where the relay walkers are robed',
      text: 'A bone-white robe hemmed with the same array thread that runs along the Wall’s top. The spirits in the bones take it for one of the arrays.',
    },
    {
      id: 'bone-binding-talisman',
      name: 'Bone-Binding Talisman',
      pinyin: 'Fugu Fu',
      hanzi: '缚骨符',
      tier: 1,
      rarity: 'white',
      upTo: 'blue',
      kind: 'talisman',
      uses: { fight: { form: 'projectile', damage: 'soul', power: 46 } },
      source: 'the bone-reading room, where the binding the Wall wears is copied small',
      text: 'A strip of the Wall’s own binding, written on bone paper. Thrown, it holds a soul still as the Wall holds its dead.',
    },
    {
      id: 'array-plate-blank',
      name: 'Array-Plate Blank',
      pinyin: 'Zhenpan Pi',
      hanzi: '阵盘坯',
      tier: 1,
      rarity: 'white',
      upTo: 'green',
      kind: 'material',
      uses: { ingredient: { tags: ['earth', 'array'], age: 1 } },
      source: 'the Pavilion’s plate cutters, who work grey jade for want of the Black Jade Vein’s',
      text: 'A palm-sized disc of grey jade, faced and ready to be cut with an array. The Pavilion goes through ten thousand a year along the Wall.',
    },
  ],
  lots: [
    { thing: 'skull-socket-robe', shops: ['sect'], weight: 0.5 },
    { thing: 'bone-binding-talisman', shops: ['sect'], count: [1, 3] },
    { thing: 'array-plate-blank', shops: ['sect'], count: [2, 6] },
  ],
};

export const LAMP_KEEPERS: Catalog = {
  at: 'qm-shoudeng-zong',
  layer: 'place',
  items: [
    {
      id: 'yin-fire-lantern',
      name: 'Yin-Fire Lantern',
      pinyin: 'Yinhuo Deng',
      hanzi: '阴火灯',
      tier: 1,
      rarity: 'green',
      upTo: 'purple',
      kind: 'treasure',
      uses: { equip: { slot: 'treasure' } },
      properties: [
        { name: 'The Drowned Circle It', effects: [{ stat: 'soulDefense', value: 0.04 }] },
        { name: 'Green Light Far Out', effects: [{ stat: 'perception', value: 0.05 }] },
      ],
      source: 'the stilt hall, where the lamps for the fens are trimmed and the spares are sold',
      text: 'A small pole-lamp of the fens’ pattern, burning a cold green flame. What has died near water walks round it rather than toward you.',
    },
    {
      id: 'drowned-word-talisman',
      name: 'Drowned-Word Talisman',
      pinyin: 'Niyu Fu',
      hanzi: '溺语符',
      tier: 1,
      rarity: 'white',
      upTo: 'blue',
      kind: 'talisman',
      uses: { fight: { form: 'projectile', damage: 'soul', power: 44 } },
      source: 'the Lamp Mother’s disciples, who write down what the drowned say and burn it',
      text: 'A wet strip of paper with a drowned man’s last words on it. Burned, it says them into a foe’s soul.',
    },
    {
      id: 'fen-yin-pill',
      name: 'Fen-Yin Pill',
      pinyin: 'Zeyin Dan',
      hanzi: '泽阴丹',
      tier: 1,
      rarity: 'white',
      upTo: 'blue',
      kind: 'pill',
      uses: { consume: { effects: [{ effect: 'fuel', ladder: 'soul', days: 3 }], dose: 10 } },
      source: 'the sect’s alchemists, who condense it from the fens’ yin qi under the lamps',
      text: 'Three days of the soul’s nourishment drawn from black water. It tastes of the fens, which is to say of the dead.',
    },
  ],
  lots: [
    { thing: 'yin-fire-lantern', shops: ['sect'], weight: 0.5 },
    { thing: 'drowned-word-talisman', shops: ['sect'], count: [1, 3] },
    { thing: 'fen-yin-pill', shops: ['sect'], count: [1, 4] },
  ],
};
