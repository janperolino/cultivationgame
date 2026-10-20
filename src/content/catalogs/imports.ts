// What reaches the Border Wilds from elsewhere, along the ties the atlas draws (P3.5): Red Rocks
// steel and ore and the Medicine Ridges' herbs by the merchant guild's road, a Sword Domain blade
// now and then, and the Vast Wilds' and the Ink Marsh's contraband over the Night Bridge to the
// black market. A shop weighs the imports by its kind: a guild double, a black market first.
// **Awaiting Jan's review** (P3.5): the new items below.
import type { Catalog } from './types.ts';

const AT = 'qm-bianhuang';

export const BORDER_WILDS_IMPORTS: readonly Catalog[] = [
  {
    at: AT,
    layer: 'import',
    from: 'qm-chiyan',
    via: 'the merchant guild’s caravans down from the Red Rocks’ forges',
    items: [
      // A staple (E3): bulk goods sold by the lot, a Bag square of twenty, standing on the shelf
      // where they are made. **Awaiting Jan’s review.**
      {
        id: 'red-rocks-iron-ore',
        name: 'Red Rocks Iron Ore',
        pinyin: 'Chiyan Tiekuang',
        hanzi: '赤岩铁矿',
        tier: 1,
        rarity: 'white',
        element: 'metal',
        kind: 'material',
        stack: 20,
        tags: ['trade', 'ore'],
        price: 2,
        uses: { ingredient: { properties: ['hard', 'sharp'], age: 1 } },
        source: 'the Red Rocks’ open pits, carted to the frontier by the merchant guild',
        text: 'A crate of red-streaked iron ore. The Border Wilds’ karst gives up little iron, so every edge on the frontier starts in someone else’s mountain.',
      },
      {
        id: 'black-iron-saber',
        name: 'Black Iron Saber',
        pinyin: 'Heitie Dao',
        hanzi: '黑铁刀',
        tier: 1,
        rarity: 'white',
        upTo: 'purple',
        kind: 'gear',
        uses: { equip: { slot: 'weapon', weapon: 'saber' }, inscribe: { slots: 1 } },
        properties: [
          { name: 'Forge-Black', effects: [{ stat: 'saberPower', value: 0.03 }] },
          { name: 'Convict-Quenched', effects: [{ stat: 'critDamage', value: 0.06 }] },
        ],
        source: 'the Red Rocks’ forges, quenched in the convict pits’ water',
        text: 'Plain black iron, heavy at the tip. The Red Rocks make a thousand a year and every one cuts.',
      },
      {
        id: 'cinnabar-ore',
        name: 'Cinnabar Ore',
        pinyin: 'Zhusha Kuang',
        hanzi: '朱砂矿',
        tier: 1,
        rarity: 'white',
        element: 'fire',
        upTo: 'blue',
        kind: 'material',
        stack: 20,
        // Talisman ink (E4): what a talisman's maker uses a piece.
        tags: ['ink'],
        uses: { ingredient: { properties: ['burning'] } },
        source: 'the Red Rocks’ mines',
        text: 'Red ore that stains the fingers. Refiners want it for edges, talisman-makers for ink.',
      },
    ],
    // Its gear's recipes (K4), each refined from what its line tells of.
    recipes: [
      {
        output: 'black-iron-saber',
        craft: 'refining',
        family: 'blades',
        inputs: [{ thing: 'red-rocks-iron-ore', count: 5 }],
      },
      {
        output: 'fire-bead',
        craft: 'refining',
        family: 'vessels',
        inputs: [
          { thing: 'beast-core', count: 1 },
          { thing: 'cinnabar-ore', count: 1 },
        ],
      },
    ],
    lots: [
      { thing: 'red-rocks-iron-ore', shops: ['refiner', 'house'], count: [20, 20] },
      { thing: 'black-iron-saber', shops: ['refiner', 'house'] },
      { thing: 'cinnabar-ore', shops: ['refiner', 'house'], count: [2, 10] },
      { thing: 'fire-bead', shops: ['house', 'refiner'], weight: 0.3 },
      { thing: 'method:ember-furnace', shops: ['house'], weight: 0.3 },
    ],
  },
  {
    at: AT,
    layer: 'import',
    from: 'qm-yaoling',
    via: 'the Apricot Grove Valley’s herb carts, by the guild',
    items: [
      // A staple (E3): bulk goods sold by the lot, a Bag square of twenty, standing on the shelf
      // where they are made. **Awaiting Jan’s review.**
      {
        id: 'ridge-bitterroot',
        name: 'Ridge Bitterroot',
        pinyin: 'Ling Kugen',
        hanzi: '岭苦根',
        tier: 1,
        rarity: 'white',
        element: 'wood',
        kind: 'herb',
        stack: 20,
        tags: ['trade'],
        // At a herb's 1 low since K1, so the commonest pill's herbs leave its brewer a living.
        price: 1,
        uses: { ingredient: { properties: ['purging'], age: 1 } },
        source: 'the Medicine Ridges’ terraced herb gardens, dried and baled for the guild’s carts',
        text: 'A bale of dried bitterroot, the commonest herb in a common pill. The Ridges grow it by the hillside; the frontier has none.',
      },
      {
        id: 'old-apricot-kernel',
        name: 'Old Apricot Kernel',
        pinyin: 'Lao Xingren',
        hanzi: '老杏仁',
        tier: 1,
        rarity: 'white',
        element: 'wood',
        upTo: 'blue',
        kind: 'herb',
        uses: { ingredient: { properties: ['nourishing'], age: 30 } },
        source: 'the Apricot Grove Valley’s old orchards',
        text: 'A kernel from a tree older than the dynasty. Half the continent’s pills start with one.',
      },
    ],
    lots: [
      { thing: 'ridge-bitterroot', shops: ['alchemy', 'house'], count: [20, 20] },
      { thing: 'old-apricot-kernel', shops: ['alchemy', 'house'], count: [1, 5] },
      { thing: 'clear-spring-lotus', shops: ['alchemy', 'house'], weight: 0.4 },
    ],
  },
  {
    at: AT,
    layer: 'import',
    from: 'qm-jianyu',
    via: 'a Clear Heaven Sword Sect blade the guild bought off someone who needed money more',
    // Its gear's recipes (K4), each refined from what its line tells of.
    recipes: [
      {
        output: 'azure-cloud-sword',
        craft: 'refining',
        family: 'blades',
        inputs: [
          { thing: 'red-rocks-iron-ore', count: 6 },
          { thing: 'beast-wing', count: 1 },
        ],
      },
    ],
    lots: [{ thing: 'azure-cloud-sword', shops: ['house'], weight: 0.15 }],
  },
  {
    at: AT,
    layer: 'import',
    from: 'cangmang',
    via: 'smuggled over the Night Bridge from the Pushed Frontier and Shared Roost City',
    items: [
      {
        id: 'roc-feather-talisman',
        name: 'Roc-Feather Talisman',
        pinyin: 'Pengyu Fu',
        hanzi: '鹏羽符',
        tier: 1,
        rarity: 'green',
        upTo: 'blue',
        kind: 'talisman',
        uses: { fight: { form: 'projectile', damage: 'wind', power: 46 } },
        source: 'a Shared Roost City scribe who draws with a storm roc’s moulted pinion',
        text: 'Thrown, it is a blade of wind the length of a spear. Selling them on the Morning Star coast is a crime.',
      },
      {
        id: 'raider-beast-blood',
        name: 'Vast Wilds Beast Blood',
        pinyin: 'Cangmang Shouxue',
        hanzi: '苍莽兽血',
        tier: 1,
        rarity: 'blue',
        upTo: 'purple',
        kind: 'beast-part',
        uses: { ingredient: { properties: ['nourishing', 'toxic'] } },
        source:
          'the Vast Wilds’ older, better-blooded beasts, bled by half-bloods who can get close',
        text: 'Thick and nearly black. The Wall burns anyone it catches carrying it.',
      },
    ],
    // Its talisman's recipe (K5), drawn with the moulted pinion its line tells of.
    recipes: [
      {
        output: 'roc-feather-talisman',
        craft: 'talismans',
        family: 'strikes',
        inputs: [
          { thing: 'yellow-talisman-paper', count: 5 },
          { thing: 'cinnabar-ore', count: 1 },
          { thing: 'beast-wing', count: 1 },
        ],
      },
    ],
    lots: [
      { thing: 'roc-feather-talisman', shops: ['black-market'], count: [1, 2] },
      { thing: 'raider-beast-blood', shops: ['black-market'], weight: 0.6 },
    ],
  },
  {
    at: AT,
    layer: 'import',
    from: 'qm-mozhao',
    via: 'the Night Banquet Sect’s brokers, by boat around the coast and over the Night Bridge',
    items: [
      {
        id: 'blood-feast-pill',
        name: 'Blood-Feast Pill',
        pinyin: 'Xueyan Dan',
        hanzi: '血宴丹',
        tier: 1,
        rarity: 'green',
        upTo: 'purple',
        kind: 'pill',
        uses: { consume: { effects: [{ effect: 'fuel', ladder: 'qi', days: 6 }], dose: 30 } },
        source: 'the Ink Marsh, from what the Night Banquet will not say',
        text: 'Six days of qi in one red pill, and a poison that takes most of a month to leave.',
      },
    ],
    // The recipes for its pills (K1), each brewed by the inputs its line tells of.
    recipes: [
      {
        output: 'blood-feast-pill',
        craft: 'alchemy',
        family: 'qi-pills',
        inputs: [
          { thing: 'raider-beast-blood', count: 3 },
          { thing: 'old-apricot-kernel', count: 7 },
        ],
      },
    ],
    lots: [{ thing: 'blood-feast-pill', shops: ['black-market'], count: [1, 3] }],
  },
];
