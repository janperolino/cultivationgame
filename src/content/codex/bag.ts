// The codex entries for Bag and gear, one a row of docs/features.md; drafted, awaiting Jan's review.
import type { CodexEntry } from './schema.ts';

export const BAG: readonly CodexEntry[] = [
  {
    id: 'pack',
    title: 'The pack',
    hanzi: '行囊',
    area: 'bag',
    text: [
      'Your pack is a grid of squares. Each stack of an item fills a square, and a bulky item fills more than one. You start with ten squares, and a pouch or a ring you wear can add more.',
      'Items come in kinds: gear, pills, talismans, herbs, materials, beast parts, manuals, treasures, vessels, mounts, beasts, maps and tools. A kind decides how many share a square. Select a stack to split it in two (it needs a free square), put the halves back on one pile, or set it down.',
    ],
    numbers: [
      ['Squares on foot', '10'],
      ['Pills, talismans, herbs, materials', '99 to a square'],
      ['Beast parts and ores', '20 to a square'],
      ['Gear, manuals, tools and the rest', '1 to a square'],
    ],
    where: { screen: 'bag', label: 'Bag' },
    met: { test: 'item' },
    way: 'codex',
    feature:
      "The pack's grid, stacks, its squares; kinds (pill, herb, material, beast part, map, tool, mount)",
  },
  {
    id: 'wearing-gear',
    title: 'Wearing gear',
    hanzi: '穿戴',
    area: 'bag',
    text: [
      'Four squares on the Worn panel take a weapon, an armor, a ring and a pouch. Pick an item and the squares it fits glow. A weapon’s kind sizes your Attack and sets the Dao it counts. Armor sizes your Defense and is a bar of its own that wears down, between your shield and your body. A pouch or ring adds squares to your pack. A square that won’t take an item gives its reason.',
      'A ring opens only to a soul or a qi realm at its tier. A weapon or armor a tier above your realm counts only part of its step, and a weapon drinks some of your qi with every strike, until your bond with it grows. Two tiers above, it won’t wake. What you wear leaves the pack, and taking it off needs the room.',
    ],
    numbers: [
      ['Armor durability', '3 points for each point of its size'],
      ['A weapon a tier above you', 'Accuracy ×0.8, ×0.9 at Mastery, none lost from Perfection'],
      ['Its qi drink', '5% of your pool a strike, until Origin'],
      ['Two tiers above', 'it won’t wake'],
    ],
    where: { screen: 'bag', label: 'Bag › Worn' },
    met: { test: 'gear' },
    way: 'quest',
    feature: 'Wearing gear: weapon, armor, ring, pouch; requirements',
  },
  {
    id: 'pills-toxicity',
    title: 'Eating pills and toxicity',
    hanzi: '丹毒',
    area: 'bag',
    text: [
      'Eat a pill from the pack and it feeds a ladder’s bar. Every pill also adds its dose to one meter, called Residue in the Bag, from 0 to 100. Every pill’s effect is scaled by what is already in you, so the fuller the meter, the less each pill gives. Pills are a boost and never the road.',
      'A plain pill doses 10 at your own tier, three times that for each tier above you and a third for each below. A purer pill doses less. The meter drains a little each day, faster by realm. At 100, the ladder the last pill fed is unsettled for {unsettledDays} days. A detox pill cuts the meter, and a qi technique can backfire in a fight in proportion to it.',
    ],
    numbers: [
      ['The meter', '0 to 100'],
      ['A pill’s effect', '× (1 − toxicity ÷ 100)'],
      ['Drain', '1 a day at Qi Condensation, +1 for each realm above'],
      ['Dose by tier', '×3 for each tier above you, ×⅓ for each below'],
      [
        'Dose by rarity',
        'gray ×1.5, white ×1, green ×0.9, blue ×0.8, purple ×0.65, gold ×0.4, red ×0.25, pristine ×0.15',
      ],
      ['A qi technique backfires', '25% of the time at a full meter'],
    ],
    where: { screen: 'bag', label: 'Bag › Residue' },
    met: { test: 'pill' },
    way: 'codex',
    feature: 'Eating pills and the toxicity meter',
  },
  {
    id: 'bonding',
    title: 'Bonding and properties',
    hanzi: '器契',
    area: 'bag',
    text: [
      'Artifacts from blue up bond to their owner. Below blue, every property simply works. From blue up, only the first property works, and each bond level, Glimpse to Origin, wakes one more, in the order the item lists them. Bonding releases no insight.',
      'A bond grows by use: the exchanges of a fight with the artifact worn, and spirit stones you feed it in seclusion from the item’s detail. A weapon or armor above your realm eases its penalty as the bond grows. At gold and red, the artifact’s spirit wakes at Perfection. A pristine one is born awake.',
    ],
    numbers: [
      [
        'Bond days to each level at tier 1',
        'Comprehension 4, Mastery 30, Perfection 150, Origin 600',
      ],
      ['Each tier above', '×3 the bond days'],
      ['Each fight exchange', '0.25 of a bond day'],
      ['Feeding', '5 low-grade stones for a bond day at tier 1, ×3 for each tier above'],
      ['Spirit wakes', 'at Perfection, for gold and red'],
    ],
    where: { screen: 'bag', label: 'Bag › the item’s detail, the bond line' },
    met: { test: 'bonded' },
    way: 'codex',
    feature: 'Bonding and properties on blue-and-up artifacts, feeding stones',
  },
  {
    id: 'ground-piles',
    title: 'Ground piles',
    hanzi: '遗落',
    area: 'bag',
    text: [
      'The pack holds no more than its squares. What can’t fit falls where you stand, with a line on the road saying so, and so does anything you set down. A pile is marked on the map and listed on the Bag screen.',
      'You pick a pile up from near where it lies, as far as the pack has room. It lies there for a month and is then swept away. Buying checks for room first, so a purchase never spills.',
    ],
    numbers: [
      ['A pile lies', '30 days'],
      ['Pick up from within', '250 li of the pile'],
    ],
    where: { screen: 'bag', label: 'Bag › on the ground; map marks' },
    met: { test: 'ground' },
    way: 'codex',
    feature: 'Ground piles: picking up what overflowed',
  },
  {
    id: 'offerings',
    title: 'Offerings',
    hanzi: '供奉',
    area: 'bag',
    text: [
      'At a major breakthrough you can lay up to three items that have an offering use. They are spent whether the attempt succeeds or fails. The gate pill that a major raising your realm needs is always laid and counts as one of the three.',
      'What an offering does is its tags. Steadying adds odds. Surging adds to the grade’s margin but costs the same odds. Purifying halves a failure’s injury and clears toxicity. Guarding keeps your bar on a failure. A ladder tag doubles an item on its own ladder, and an item of your root’s element adds a step of odds. A gold or red offering lets the grade reach heavenly.',
    ],
    numbers: [
      ['Items laid', 'three at most, the gate pill included'],
      ['Steadying', '2% odds for a gray item up to 20% for a pristine one'],
      ['Purifying', 'clears 20 toxicity for a gray item up to 100'],
      ['On its own ladder', '×2'],
      ['Your root’s element', '+{oddsPerTenth} odds'],
    ],
    where: { screen: 'cultivate', label: 'Cultivate › the breakthrough panel, Offerings' },
    met: { test: 'offering' },
    way: 'codex',
    feature: 'Offerings laid at a major breakthrough',
  },
];
