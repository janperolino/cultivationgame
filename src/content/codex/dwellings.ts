// The codex's Dwellings and sites entries (K9), one a row of docs/features.md; drafted, awaiting
// Jan's review.
import type { CodexEntry } from './schema.ts';

export const DWELLINGS: readonly CodexEntry[] = [
  {
    id: 'dwelling-screen',
    title: 'The Dwelling screen',
    hanzi: '居',
    area: 'dwellings',
    text: [
      'Every place you live is a dwelling: a room or chamber from a broker, a courtyard, your seat’s quarters, a cave you dug into a vein. You hold at most one in a place, and one of them is your abode.',
      'The screen shows the dwelling where you stand: its qi on the density ladder, its vein, how well it is hidden, what guards it, what it is worth, the nearest market and what lives around it, with its store, land, array slots and works. Anywhere else it is greyed, listing what you hold.',
    ],
    numbers: [
      ['Seclusion a step up', '×1.1, then ×1.3, ×1.6, ×2, then ×1.25 a step'],
      ['A dwelling’s density', 'Its land’s, plus a chamber’s array or a vein’s tier'],
    ],
    where: { screen: 'dwelling', label: 'Dwelling' },
    met: { screen: 'dwelling' },
    way: 'codex',
    feature:
      'The Dwelling screen 居: the one where you stand (its qi on the ladder, vein, concealment, defenses, worth, reach, neighbors), greyed elsewhere with the ones you hold',
  },
  {
    id: 'quarters',
    title: 'Your seat’s quarters',
    hanzi: '居所',
    area: 'dwellings',
    text: [
      'A member is housed by seat: a bunk in the outer hall, a cave from inner, a peak from elder, each richer in qi and capped by the power’s vein. A dynasty houses you where your post is, in a barracks bunk.',
      'The quarters keep a footlocker. It comes back to you if you part cleanly, and stays if you betray the power or are struck off.',
    ],
    numbers: [
      ['Outer', 'A bunk, a step up, 16 squares'],
      ['Inner', 'A cave, two steps, 36 squares'],
      ['True', 'A cave, three steps, 36 squares, a plot slot'],
      ['Elder and up', 'A peak, four steps, 64 squares, two or three slots'],
    ],
    where: { screen: 'dwelling', label: 'Dwelling' },
    met: { test: 'member' },
    way: 'codex',
    feature:
      "Your seat's quarters: a bunk or cave by seat, its footlocker, a dynasty's at your post",
  },
  {
    id: 'broker',
    title: 'The broker',
    hanzi: '牙行',
    area: 'dwellings',
    text: [
      'Every town and city has a broker who lets and sells dwellings: more and better in a bigger and richer place. A cultivation chamber’s small gathering array keeps it a step above the street. A city on a vein lets caves on its spirit hill. A village lets its farmhouses itself.',
      'Rent comes off your purse as its time turns. Leave it unpaid, and the dwelling is let to someone else, its store kept a month, then sold for the debt.',
    ],
    numbers: [
      ['A rented room', '3 low a month, a store of 16'],
      ['A cultivation chamber', '0.6 low a day or 15 a month, ×1.1'],
      ['A courtyard', '20 low a season in a town, 30 in a city; ten seasons to buy'],
      ['A medicine garden', '400 low, four plot slots'],
      ['A mansion', '2,400 low, a store of 64'],
      ['The spirit hill', 'Its slope 90 a season at ×1.3; its crown on the vein, 810 at tier 4'],
    ],
    where: { screen: 'map', label: 'A town’s place › Hear and hire › Broker' },
    met: { test: 'place' },
    way: 'quest',
    feature:
      "The broker 牙行: rooms, cultivation chambers, courtyards, a medicine garden, a mansion, the spirit hill's caves; a village's farmhouse",
  },
  {
    id: 'store',
    title: 'The store',
    hanzi: '库',
    area: 'dwellings',
    text: [
      'A dwelling’s store is a second grid, opened only where it stands. Your Bag goes with you, and the store stays. Moving your abode moves nothing: carry what you want.',
    ],
    numbers: [['Sizes', 'Small 16 squares, a store 36, large 64']],
    where: { screen: 'dwelling', label: 'Dwelling › The store' },
    met: { test: 'dwelling' },
    way: 'codex',
    feature: 'The store, a second grid opened only at its dwelling',
  },
  {
    id: 'dwelling-land',
    title: 'A dwelling’s land',
    hanzi: '田',
    area: 'dwellings',
    text: [
      'A dwelling holds land as plot slots. Lay out a plot in an empty one and it is a plot like any other, worked on the Spirit Farming page, growing at the dwelling’s density. A rented dwelling’s plots end with its lease.',
    ],
    numbers: [
      ['A courtyard', '2 slots in a town, 1 in a city'],
      ['A wild cave abode', '2 + its vein’s tier, two more cleared'],
      ['A spirit mountain', '6, growing to 9'],
    ],
    where: { screen: 'dwelling', label: 'Dwelling › Land' },
    met: { test: 'dwelling' },
    way: 'codex',
    feature: "A dwelling's land as plot slots, each a farming plot",
  },
  {
    id: 'abode',
    title: 'Your abode',
    hanzi: '家',
    area: 'dwellings',
    text: [
      'One dwelling is your abode: where the map’s Go home takes you, and a bed that costs nothing. Make another your abode on its Dwelling screen whenever you like.',
    ],
    where: { screen: 'dwelling', label: 'Dwelling › Yours' },
    met: { test: 'dwelling' },
    way: 'codex',
    feature: 'Your abode: home, a free bed, moving it',
  },
  {
    id: 'veins',
    title: 'Hidden veins and reading the land',
    hanzi: '堪舆',
    area: 'dwellings',
    text: [
      'Bare land hides local spirit veins, most in the undeveloped wilds. Only geomancy finds them. Read the land where you stand, once a day: your reading is your soul’s band and a band for each Earth Dao tier you hold, against a vein’s rating, the land’s band where it lies plus its tier.',
      'Every vein your reading meets within reach turns up on the map. The nearest one still hidden is marked as a ring to walk to.',
    ],
    numbers: [
      ['Reach', '60 li, ×3 a soul realm from Foundation'],
      ['Seeded', 'About three a wild tract, one a kingdom; one in six a tier richer'],
    ],
    where: { screen: 'map', label: 'Map › Journey, where you stand' },
    met: { test: 'travelled' },
    way: 'codex',
    feature: 'Hidden veins and reading the land 堪舆 (soul and Earth Dao, once a day)',
  },
  {
    id: 'claiming',
    title: 'Claiming land',
    hanzi: '占地',
    area: 'dwellings',
    text: [
      'Stand there and claim it. Bare land becomes a thatched hut. A vein you have read becomes a wild cave abode, or a spirit mountain over a richer vein. A waterfall, sinkhole or herb valley you stand in becomes a hidden valley.',
      'It is free where no power holds the land. Inside a power’s sphere it is a deed against it, "Squatting on our land", for as long as you hold it. What you build stays in the world after you.',
    ],
    numbers: [
      ['A thatched hut', '2 slots, growing to 4; a store of 16'],
      ['A wild cave abode', 'The vein’s tier in steps; a store of 36'],
      ['A hidden valley', '4 slots, growing to 6; two bands of concealment'],
      ['Squatting', '−10 with the power'],
    ],
    where: { screen: 'map', label: 'Map › Journey and right-click' },
    met: { test: 'claimed' },
    way: 'codex',
    feature:
      "Claiming: a thatched hut on bare land, a cave abode or spirit mountain on a vein read, a hidden valley at falls or a sinkhole; a deed inside a power's sphere",
  },
  {
    id: 'building',
    title: 'Building your base',
    hanzi: '建',
    area: 'dwellings',
    text: [
      'Land you claimed in the wild grows as you work it. A work runs on the days you spend there, one at a time.',
    ],
    numbers: [
      ['Clearing land', 'A plot slot, six days'],
      ['Digging the store', '16 to 36 squares in ten days and 12 low; to 64 in twenty and 40'],
      ['A quiet chamber', 'Injuries mend ×1.5 while you stay; eight days, 6 low'],
    ],
    where: { screen: 'dwelling', label: 'Dwelling › Build' },
    met: { test: 'claimed' },
    way: 'codex',
    feature: 'Building your base: clearing land, digging the store, a quiet chamber',
  },
  {
    id: 'raids',
    title: 'Raids',
    hanzi: '劫',
    area: 'dwellings',
    text: [
      'Once a month the world asks of each site you hold in the wild. Thieves must find it first: their soul’s band, the land’s, against its concealment. Then it must be worth more than its guard and more than a raider’s month. Beasts come for raised qi and old herbs. Each step of raised qi takes a band off its concealment against them.',
      'A raid comes as a card. Away, thieves take a third of the store’s worth, the dearest things first, and a beast eats the oldest bed. There, or back before it settles, you can drive them off. A town’s dwelling is the watch’s, and a seat’s the power’s.',
    ],
    numbers: [
      ['A raider’s month', '30 low at Qi Condensation, up the realm curve'],
      ['Beds that draw beasts', 'Ten years; a band stronger at a hundred'],
      ['The card waits', 'Five days for thieves, three for a beast'],
    ],
    where: { screen: 'dwelling', label: 'Dwelling › The place' },
    met: { test: 'claimed' },
    way: 'codex',
    feature: 'Raids by thieves and beasts on a site in the wild',
  },
  {
    id: 'rent',
    title: 'Rent',
    hanzi: '租',
    area: 'dwellings',
    text: [
      'A rented dwelling is paid by its period, taken from your purse as each one turns, or paid ahead on its Dwelling screen. When the purse can’t cover it, the lease runs out: its plots end, and its store is kept a month for you to empty, then sold for the debt.',
    ],
    where: { screen: 'dwelling', label: 'Dwelling › Yours' },
    met: { test: 'dwelling' },
    way: 'codex',
    feature: "Rent taken as its time turns, a lapsed lease's store kept a month",
  },
];
