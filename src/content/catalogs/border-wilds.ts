// The Border Wilds (qm-bianhuang): what the whole frontier sells, whatever town you stand in. Wall
// issue (the ash-wood spear, the boar-hide vest), the frontier's origin methods and their Foundation
// chapters, the body and soul gates (the Gate brews the Marrow-Washing Pill, so it is cheap here;
// the Soul-Condensing Pill is rare and dear, Jan's note in P3.2's talk), the shrines' soul arts,
// the guard arts and the loose formulas of the frontier's schools.
import type { Catalog } from './types.ts';

export const BORDER_WILDS: Catalog = {
  at: 'qm-bianhuang',
  layer: 'region',
  techniques: [
    {
      id: 'porters-sweep',
      name: "Porter's Sweep",
      pinyin: 'Tiaofu Hengsao',
      hanzi: '挑夫横扫',
      ladder: 'body',
      tier: 1,
      rarity: 'white',
      line: 'porters-sweep',
      chapter: 1,
      daos: [],
      form: 'slash',
      damage: 'physical',
      power: 40,
      qiCost: 0,
      targets: 3,
      source:
        'the porters and wall crews of the Border Wilds, who clear a lane through a crowd with the carrying pole',
      text: 'Swing the carrying pole round at hip height with a full load’s weight in the turn. Everything in the lane goes down; the porters call it clearing the road. It costs no qi.',
    },
    {
      id: 'quiet-bell-roar',
      name: 'Quiet Bell Roar',
      pinyin: 'Jingzhong Hou',
      hanzi: '静钟吼',
      ladder: 'soul',
      tier: 1,
      rarity: 'white',
      line: 'quiet-bell-roar',
      chapter: 1,
      daos: [],
      form: 'aura',
      damage: 'soul',
      power: 13,
      qiCost: 6,
      targets: 5,
      source: 'the monks of the Temple of the Quiet Bell, who quiet the Wall each Ghost Month',
      text: 'A deep roar pitched to the bell that is struck once a year. Whatever hears it, living or dead, loses its footing in itself for a breath.',
    },
    {
      id: 'skull-haulers-whirl',
      name: "Skull-Hauler's Whirl",
      pinyin: 'Banlu Xuan',
      hanzi: '搬颅旋',
      ladder: 'body',
      tier: 1,
      rarity: 'green',
      line: 'skull-haulers-whirl',
      chapter: 1,
      daos: [],
      form: 'slash',
      damage: 'physical',
      power: 44,
      qiCost: 0,
      targets: 3,
      source:
        'the wall crews who haul beast-king skulls up the scaffolds, spinning with the load to bring it round a corner',
      text: 'Turn all the way round with a skull’s weight hung from the shoulders and let the load swing wide. It clears a scaffold, and it costs no qi.',
    },
  ],
  arts: [
    {
      technique: 'porters-sweep',
      nodes: [
        {
          id: 'art-pole-at-the-hip',
          name: 'The Pole at the Hip',
          hanzi: '腰间杠',
          kind: 'minor',
          cost: 30,
          requires: [],
          effects: [],
          own: [{ stat: 'techniquePower', value: 0.08 }],
          text: 'The turn starts in the hip and the pole only follows it.',
        },
      ],
    },
    {
      technique: 'quiet-bell-roar',
      nodes: [
        {
          id: 'art-one-note-a-year',
          name: 'One Note a Year',
          hanzi: '一岁一声',
          kind: 'minor',
          cost: 30,
          requires: [],
          effects: [],
          own: [{ stat: 'techniquePower', value: 0.08 }],
          text: 'A bell struck once a year has had a long time to practise.',
        },
      ],
    },
    {
      technique: 'skull-haulers-whirl',
      nodes: [
        {
          id: 'art-the-full-turn',
          name: 'The Full Turn',
          hanzi: '满转',
          kind: 'minor',
          cost: 30,
          requires: [],
          effects: [{ stat: 'physicalDamage', value: 0.04 }],
          text: 'A load that is carried round once is a load that has learned to be thrown.',
        },
      ],
    },
  ],
  // Its gear's recipes (K4), each refined from what its line tells of.
  recipes: [
    {
      output: 'ash-wood-spear',
      craft: 'refining',
      family: 'blades',
      inputs: [
        { thing: 'red-rocks-iron-ore', count: 3 },
        { thing: 'ash-spear-shaft', count: 1 },
      ],
    },
    {
      output: 'boar-hide-vest',
      craft: 'refining',
      family: 'armor',
      inputs: [{ thing: 'beast-hide', count: 3 }],
    },
  ],
  lots: [
    // Wall issue
    { thing: 'ash-wood-spear', shops: ['refiner', 'house', 'stall'] },
    { thing: 'boar-hide-vest', shops: ['refiner', 'house'] },
    // The gates for Foundation
    { thing: 'marrow-washing-pill', shops: ['alchemy', 'house'], weight: 0.4 },
    { thing: 'soul-condensing-pill', shops: ['alchemy', 'house'], weight: 0.1 },
    // Methods and their chapters
    { thing: 'method:crude-cave', shops: ['stall'], weight: 0.5 },
    { thing: 'method:cadet-spear', shops: ['stall', 'house'], weight: 0.5 },
    { thing: 'method:cadet-spear-foundation', shops: ['house'], weight: 0.15 },
    { thing: 'method:crude-cave-foundation', shops: ['house'], weight: 0.1 },
    { thing: 'method:bounty-scrap', shops: ['house'], weight: 0.4 },
    { thing: 'method:bounty-scrap-foundation', shops: ['house'], weight: 0.15 },
    { thing: 'method:stone-bearing', shops: ['stall', 'house'], weight: 0.6 },
    { thing: 'method:still-lantern', shops: ['stall', 'house'], weight: 0.6 },
    { thing: 'method:stone-bearing-foundation', shops: ['house'], weight: 0.15 },
    { thing: 'method:still-lantern-foundation', shops: ['house'], weight: 0.15 },
    // Techniques: the guard arts and the frontier's first strikes
    { thing: 'technique:bulwark-of-breath', shops: ['stall', 'house'], weight: 0.4 },
    { thing: 'technique:iron-cloth-shirt', shops: ['stall', 'house'], weight: 0.4 },
    { thing: 'technique:lamp-shadow-step', shops: ['stall', 'house'], weight: 0.4 },
    { thing: 'technique:lamp-snuffing-glance', shops: ['stall'], weight: 0.3 },
    { thing: 'technique:porters-charge', shops: ['stall', 'house'], weight: 0.4 },
    { thing: 'technique:rampart-palm', shops: ['stall', 'house'], weight: 0.5 },
    { thing: 'technique:piled-bones-thrust', shops: ['stall', 'house'], weight: 0.5 },
    { thing: 'technique:alley-wind-palm', shops: ['stall'], weight: 0.4 },
    { thing: 'technique:rampart-collapse-palm', shops: ['house'], weight: 0.15 },
    // The frontier schools' formulas
    { thing: 'manual:garrison-breath-count', shops: ['stall'], weight: 0.4 },
    { thing: 'manual:butcher-sinew', shops: ['stall'], weight: 0.3 },
    { thing: 'manual:bone-wall-watch', shops: ['stall'], weight: 0.3 },
    { thing: 'manual:tide-counting', shops: ['stall', 'house'], weight: 0.3 },
    { thing: 'technique:porters-sweep', shops: ['stall', 'house'], weight: 0.4 },
    { thing: 'technique:quiet-bell-roar', shops: ['stall', 'house'], weight: 0.4 },
    { thing: 'technique:skull-haulers-whirl', shops: ['house'], weight: 0.25 },
  ],
};
