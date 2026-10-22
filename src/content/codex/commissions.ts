// The codex's entries for commissions and the craft deck (K12), one a row of docs/features.md;
// drafted, awaiting Jan's review.
import type { CodexEntry } from './schema.ts';

export const COMMISSIONS: readonly CodexEntry[] = [
  {
    id: 'commissions',
    title: 'Commissions',
    hanzi: '委托',
    area: 'crafts',
    text: [
      'Each alchemy shop, refiner and talisman shop pins one notice a month for what its market runs shortest of that its craft makes, the market’s line of why written on it. It asks for rare work, green or better, so a shelf can’t fill it: one batch of the thing, by the month’s end, at half again the market’s price, fixed when you take it. Anything of it at the rarity fills it, whoever made it. A notable shop’s notice now and then asks for your certified grade, and pays double.',
      'Once your name in a craft reaches 3 in a region, a person in the market asks the keeper for you by name: a batch of what you make most, with your mark’s lift on the price. A commission handed in adds a point to your name there and the keeper remembers the promise kept; one left past its month, the promise broken.',
    ],
    numbers: [
      ['Posted', '×1.5 the market, ×2 graded'],
      ['Asks for', 'green 65%, blue 30%, purple 5%, held to the thing’s range'],
      ['By name', 'From craft renown 3, ×1.5 and your mark'],
      ['Held at once', '3'],
    ],
    where: { screen: 'world', label: 'A craft shop’s counter › Commission 托' },
    met: { test: 'commission' },
    way: 'quest',
    feature:
      'Commissions 托: a shop’s notice for its market’s shortage, and by name from craft renown 3',
  },
  {
    id: 'made-to-order',
    title: 'Made to order',
    hanzi: '订做',
    area: 'crafts',
    text: [
      'An alchemy shop or a refiner makes what it sells to your wants: pick the recipe, bring your inputs or use theirs, and pay a quarter over the market for what comes out, less what your inputs are worth. It is ready at the counter after the crafter’s hours, and it always holds.',
      'Its rarity comes from the house’s hand: the small shops work at Comprehension, a shop at Mastery, a notable shop at Perfection. Inputs a rarity above the floor add their lift, as at your own bench.',
    ],
    numbers: [
      ['Price', '×1.25 the market, your inputs’ worth off, never under a quarter'],
      ['Ready', 'The recipe’s hours at 8 craft hours a day'],
      ['The house', 'Small shops +0.25 lift, a shop +0.5, a notable shop +0.75'],
    ],
    where: { screen: 'world', label: 'An alchemy shop or refiner › Commission 托' },
    met: { test: 'order' },
    way: 'codex',
    feature:
      'Made to order 订做: a recipe made at an alchemy shop or refiner, your inputs or theirs',
  },
  {
    id: 'craft-deck',
    title: 'The craft deck',
    hanzi: '艺事',
    area: 'crafts',
    text: [
      'Once you hold a tool or a field, the craft deck joins the cards that come while you seclude. It takes the share of them that your day gives to Craft hours, at most half, so a crafter’s days fill with the bench and the market: a hundred-year root at the herb hall, a fire that leaps in the furnace, a steward’s order, a thief in your field.',
      'Each is set where its field or market is and names someone there you can go and see. A card about your bench or your field marks its page on the Crafts screen; the urgent ones settle on their own if left.',
    ],
    numbers: [
      ['Share of the cards', 'Craft hours ÷ the day’s hours, at most half'],
      ['Cards', 'Thirteen'],
    ],
    where: { screen: 'cultivate', label: 'Cultivate, the tray' },
    met: { test: 'craft-card' },
    way: 'codex',
    feature:
      'The craft deck: cards of the bench, the field and the market, at your Craft hours’ share',
  },
];
