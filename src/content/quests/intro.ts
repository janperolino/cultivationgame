// The introduction quests (design § UI and screens, Introductions; docs/features.md, the Way in
// column): a feature of the world is introduced by a small quest offered where it lives, never in
// the first hour. Four of the fourteen rows marked for a quest are every origin's chain's to teach,
// so they have none here: sparring (the first lesson), the stance and the board's postings (the
// board's road), and posts and hires (Your place, or Your own way). The other ten are offered at
// any giver of their kind (`@any`), handed in where they were taken. Drafted in The opening, built
// (chains, rogue, knobs) for Jan's review.
import type { Quest } from '../quests.ts';

const any = (kind: Quest['giver']['kind'], name: string, shopKind?: Quest['giver']['shopKind']) =>
  ({ kind, place: '@any', name, ...(shopKind ? { shopKind } : {}) }) as const;

export const INTRO_QUESTS: readonly Quest[] = [
  {
    id: 'intro-gear',
    title: 'Try the Fit',
    giver: any('shop', 'the refiner', 'refiner'),
    reason:
      'The refiner has a rack of pieces nobody came back for, and says a cultivator who fights in their sleeves dies in them. Buy something off the counter and wear it out the door.',
    steps: [
      { text: 'Buy a piece at this counter.', goal: { event: 'bought', here: true } },
      { text: 'Wear a piece of gear: drag it onto its square in the Bag.', goal: { met: 'gear' } },
    ],
    reward: { stones: 3, text: '3 low-grade stones back on the price' },
    thanks: '“It sits right. Come back when it doesn’t.”',
    codex: ['wearing-gear'],
  },
  {
    id: 'intro-changer',
    title: 'A Mixed Purse',
    giver: any('shop', 'the bounty office’s clerk', 'bounty'),
    reason:
      'The bounty office pays mortal hunters in silver and cultivators in stones, and its clerk is always short of change. Take a stone to the money changer and bring back the silver it breaks into.',
    steps: [
      {
        text: 'Change money at a money changer: a stone into taels, or back.',
        goal: { deed: 'changed' },
      },
    ],
    reward: { stones: 2, text: '2 low-grade stones for the trouble' },
    thanks: '“Silver for the mortals, stones for you. Now neither of us has to haggle.”',
    codex: ['money-grades'],
  },
  {
    id: 'intro-caravan',
    title: 'A Hand for the Caravan',
    giver: any('shop', 'the trading house’s factor', 'house'),
    reason:
      'The trading house’s weekly caravan is a hand short, and the factor would rather a cultivator walk beside the wagons than lose a load to the road. Join one for its leg; it goes at the wagons’ pace, safer for it.',
    steps: [{ text: 'Travel with a caravan: its door is under Hear.', goal: { met: 'group' } }],
    reward: { stones: 5, text: '5 low-grade stones from the factor' },
    thanks: '“The wagons came in whole. You can walk with us again.”',
    codex: ['caravans', 'travel-groups'],
  },
  {
    id: 'intro-inn',
    title: 'A Bed, Not a Ditch',
    giver: any('shop', 'the store’s keeper', 'mortal'),
    reason:
      'The village store’s keeper lets beds over the shop and says a traveller who sleeps in ditches wakes up robbed. Spend a night away from home under a roof: you sleep by rule wherever you stay, and pay for it.',
    steps: [{ text: 'Sleep a night at an inn or a barn away from home.', goal: { deed: 'slept' } }],
    reward: { stones: 1, text: 'a low-grade stone, and breakfast' },
    thanks: '“You look like you slept. That’s rarer than you’d think on this road.”',
    codex: ['inn-bed'],
  },
  {
    id: 'intro-join',
    title: 'Knock at the Gate',
    giver: any('board', 'the bounty board'),
    reason:
      'Beside the postings the board carries which powers are taking people this year and what each one asks at its gate: a test, a buy-in, a trial or a sponsor. Belonging costs a quota and leave; it pays a stipend, a dwelling and someone behind you.',
    steps: [
      {
        text: 'Be taken in by a power: ask its way in at its seat’s Join door.',
        goal: { met: 'member' },
      },
    ],
    reward: { stones: 5, text: '5 low-grade stones from the board for the news' },
    thanks: 'The clerk crosses a name off the list of powers taking people.',
    codex: ['join-power', 'seats-contribution'],
    unless: 'member',
  },
  {
    id: 'intro-elders',
    title: 'Pay Your Respects',
    giver: any('hall', 'the hall’s steward', 'sect'),
    reason:
      'The hall’s steward says a disciple who never sits at an elder’s feet is a disciple the elders forget at the year’s ranking. A lesson costs contribution and is worth days of your own study.',
    steps: [{ text: 'Take a lesson in the elders’ hall.', goal: { deed: 'lesson' } }],
    reward: { stones: 3, text: '3 low-grade stones, and the elders know your face' },
    thanks: '“The elder remembered your name afterward. That is worth more than the lesson.”',
    codex: ['elders-hall'],
  },
  {
    id: 'intro-sect-shop',
    title: 'The Members’ Price',
    giver: any('hall', 'the hall’s steward', 'sect'),
    reason:
      'Members buy at the hall in contribution at the members’ price, lines no outsider sees. The steward wants every new disciple to spend something here once, so they know what their work buys.',
    steps: [{ text: 'Buy something at this hall.', goal: { event: 'bought', here: true } }],
    reward: { stones: 2, text: '2 low-grade stones' },
    thanks: '“Now you know what a month of your work is worth here.”',
    codex: ['sect-shop'],
  },
  {
    id: 'intro-bench',
    title: 'Three Batches',
    giver: any('shop', 'the alchemy shop’s master', 'alchemy'),
    reason:
      'The alchemy shop’s master buys apprentices’ pills at a fair price and says the only way to learn a furnace is to run one. Get a furnace and a recipe, give your day Craft hours, and let the bench run three batches.',
    steps: [
      {
        text: 'Finish three batches at your own bench, queued on your Craft hours.',
        goal: { craft: 'batch', n: 3 },
      },
    ],
    reward: { stones: 10, text: '10 low-grade stones for the pills' },
    thanks: '“Lumpy. Sellable. Run thirty more.”',
    codex: ['bench-queue', 'crafts-screen', 'craft-mastery'],
  },
  {
    id: 'intro-furnace',
    title: 'Watch the Fire',
    giver: any('shop', 'the alchemy shop’s master', 'alchemy'),
    reason:
      'A batch left to the bench comes out as the bench makes it. The master says to sit at the furnace while one runs and burn the dross out by hand: a steady hand lifts what comes out.',
    steps: [
      {
        text: 'Sit at the furnace through a batch, burning out the dross.',
        goal: { craft: 'played', n: 1 },
      },
    ],
    reward: { stones: 5, text: '5 low-grade stones' },
    thanks: '“That one’s cleaner. Your hand is in it.”',
    codex: ['furnace-sitting'],
  },
  {
    id: 'intro-commission',
    title: 'A Notice on the Counter',
    giver: any('shop', 'the alchemy shop’s master', 'alchemy'),
    reason:
      'The alchemy shop’s master pins a notice on the counter each month for what the market runs short of, and pays half again for it. Take one, here or at any shop of a craft, and hand it in before the month turns.',
    steps: [
      {
        text: 'Take a commission at a craft shop’s counter and hand it in by its month’s end.',
        goal: { met: 'commission-done' },
      },
    ],
    reward: { stones: 5, text: '5 low-grade stones' },
    thanks: '“On time, and the right grade. I’ll pin another next month.”',
    codex: ['commissions'],
  },
  {
    id: 'intro-mend',
    title: 'A Worn Edge',
    giver: any('shop', 'the refiner', 'refiner'),
    reason:
      'Gear wears in every fight, and the refiner mends it for a fee or teaches you to mend your own at a forge of its tier. A refiner who mends their own pieces never pays a refiner again.',
    steps: [{ text: 'Mend a worn piece at your own bench.', goal: { craft: 'mended', n: 1 } }],
    reward: { stones: 5, text: '5 low-grade stones' },
    thanks: '“Good as it was. Better than some I’ve sold.”',
    codex: ['mending-bench'],
  },
];
