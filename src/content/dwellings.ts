// Dwellings and sites (design § Professions, people and powers: Sites and formations, Dwellings are
// sites; K9's talk, 2026-10-20, Jan's yes to the table). One record for every place you live and
// cultivate: a broker's room or chamber, a courtyard, a farmhouse, a medicine garden, a mansion, a
// cave on a city's spirit hill, your seat's quarters, and the hut, cave abode, hidden valley or
// spirit mountain you claim in the wild. Prices are written at Qi Condensation where the qi density
// is 3 (the Border Wilds), and a richer place's run up the realm curve by its band.
import type { SeatId } from './organizations.ts';

export const DWELLING_KINDS = [
  'room',
  'chamber',
  'farmhouse',
  'courtyard',
  'garden',
  'mansion',
  'hill-cave',
  'crown-cave',
  'quarters',
  'hut',
  'cave',
  'valley',
  'mountain',
] as const;
export type DwellingKind = (typeof DWELLING_KINDS)[number];

/** How a dwelling is held. A seat's quarters go with the membership. */
export const DWELLING_HELD = ['rented', 'bought', 'claimed', 'seat'] as const;
export type DwellingHeld = (typeof DWELLING_HELD)[number];

/** A rent's period, in days. */
export const RENT_PERIODS = { day: 1, month: 30, season: 90 } as const;
export type RentPeriod = keyof typeof RENT_PERIODS;

/** A store's squares: small, a store, large (the Bag's pack is 10). */
export const STORE = { small: 16, store: 36, large: 64 } as const;

export interface DwellingInfo {
  id: DwellingKind;
  name: string;
  hanzi: string;
  /** Its seal on the Dwelling screen. */
  seal: string;
  /** Where it is had: a town's or city's broker, a farming village, the wild, or your seat. */
  where: 'broker' | 'village' | 'wild' | 'seat';
  /** Only in a city, or only in a town, for a broker's. */
  only?: 'city' | 'town';
  /** Rent by the period, in low-grade stones at the base price. */
  rent?: Partial<Record<RentPeriod, number>>;
  /** Bought outright, in low-grade stones at the base price. */
  buy?: number;
  /** The store's squares to start; 0 for none. */
  store: number;
  /** Plot slots to start (the rows that read their vein or seat work them out in core). */
  slots: number;
  /** The most slots clearing land raises it to; equal to `slots` when it doesn't grow. */
  grows?: number;
  /** Qi density steps above the land: a chamber's small array. A vein's tier adds its own. */
  steps: number;
  /** Bands of concealment its spot gives above the land's edge (claimed only). */
  hides?: number;
  /** One line for the broker's counter. */
  line: string;
}

export const DWELLINGS: Readonly<Record<DwellingKind, DwellingInfo>> = {
  room: {
    id: 'room',
    name: 'Rented room',
    hanzi: '租房',
    seal: '房',
    where: 'broker',
    rent: { month: 3 },
    store: STORE.small,
    slots: 0,
    steps: 0,
    line: 'a bed and a lock',
  },
  chamber: {
    id: 'chamber',
    name: 'Cultivation chamber',
    hanzi: '静室',
    seal: '静',
    where: 'broker',
    rent: { day: 0.6, month: 15 },
    store: 0,
    slots: 0,
    steps: 1,
    line: 'its small gathering array keeps it a step up',
  },
  farmhouse: {
    id: 'farmhouse',
    name: 'Farmhouse',
    hanzi: '农舍',
    seal: '舍',
    where: 'village',
    rent: { season: 15 },
    buy: 150,
    store: STORE.small,
    slots: 2,
    steps: 0,
    line: 'a house and two fields of its own',
  },
  courtyard: {
    id: 'courtyard',
    name: 'Courtyard',
    hanzi: '小院',
    seal: '院',
    where: 'broker',
    // A town's for 20 a season, a city's for 30 (core reads the place).
    rent: { season: 20 },
    buy: 200,
    store: STORE.store,
    slots: 2,
    steps: 0,
    line: 'a gate of your own',
  },
  garden: {
    id: 'garden',
    name: 'Medicine garden',
    hanzi: '药园',
    seal: '园',
    where: 'broker',
    only: 'town',
    buy: 400,
    store: STORE.small,
    slots: 4,
    steps: 0,
    line: 'just outside the walls, a hut and four beds of land',
  },
  mansion: {
    id: 'mansion',
    name: 'Mansion',
    hanzi: '宅邸',
    seal: '宅',
    where: 'broker',
    only: 'city',
    buy: 2400,
    store: STORE.large,
    slots: 2,
    steps: 0,
    line: 'a servants’ wing and a name on the gate',
  },
  'hill-cave': {
    id: 'hill-cave',
    name: 'Cave on the spirit hill’s slope',
    hanzi: '洞府',
    seal: '洞',
    where: 'broker',
    only: 'city',
    rent: { season: 90 },
    store: STORE.store,
    slots: 3,
    steps: 2,
    line: 'let by the hill’s keeper, a step off the vein’s heart',
  },
  'crown-cave': {
    id: 'crown-cave',
    name: 'Cave at the spirit hill’s crown',
    hanzi: '洞府',
    seal: '峰',
    where: 'broker',
    only: 'city',
    // Up the realm curve a tier of vein past 2 (core): 270 at tier 3, 810 at tier 4.
    rent: { season: 90 },
    store: STORE.store,
    slots: 1,
    steps: 0,
    line: 'on the vein itself, an elder’s peak for rent',
  },
  quarters: {
    id: 'quarters',
    name: 'Your quarters',
    hanzi: '居所',
    seal: '居',
    where: 'seat',
    store: STORE.small,
    slots: 0,
    steps: 0,
    line: 'your seat’s, while you belong',
  },
  hut: {
    id: 'hut',
    name: 'Thatched hut',
    hanzi: '茅屋',
    seal: '茅',
    where: 'wild',
    store: STORE.small,
    slots: 2,
    grows: 4,
    steps: 0,
    hides: 0,
    line: 'claimed on wild land',
  },
  cave: {
    id: 'cave',
    name: 'Wild cave abode',
    hanzi: '洞府',
    seal: '洞',
    where: 'wild',
    store: STORE.store,
    // 2 + the vein's tier, and two more cleared.
    slots: 2,
    steps: 0,
    hides: 1,
    line: 'dug in on a vein you found',
  },
  valley: {
    id: 'valley',
    name: 'Hidden valley',
    hanzi: '秘谷',
    seal: '谷',
    where: 'wild',
    store: STORE.store,
    slots: 4,
    grows: 6,
    steps: 0,
    hides: 2,
    line: 'behind falling water or down a sinkhole',
  },
  mountain: {
    id: 'mountain',
    name: 'Spirit mountain',
    hanzi: '灵山',
    seal: '山',
    where: 'wild',
    store: STORE.large,
    slots: 6,
    grows: 9,
    steps: 0,
    hides: 0,
    line: 'a vein a tier above the land’s, and the mountain over it',
  },
};

/**
 * Seclusion by density steps above the land: O2's dwelling ladder (×1.1, ×1.3, ×1.6, ×2), then
 * ×1.25 a step (K9's talk: one ladder for seats, chambers, veins and, from K10, arrays).
 */
export const STEP_MULT = [1, 1.1, 1.3, 1.6, 2] as const;
export const STEP_PAST = 1.25;

/** A seat's quarters: its steps (capped by the vein), store and plot slots (K9's talk). */
export const QUARTERS: Readonly<Record<SeatId, { steps: number; store: number; slots: number }>> = {
  outer: { steps: 1, store: STORE.small, slots: 0 },
  inner: { steps: 2, store: STORE.store, slots: 0 },
  true: { steps: 3, store: STORE.store, slots: 1 },
  elder: { steps: 4, store: STORE.large, slots: 2 },
  grand: { steps: 4, store: STORE.large, slots: 3 },
  head: { steps: 4, store: STORE.large, slots: 3 },
};

/** The quarters' names by seat, a dynasty's bunk at its post. */
export const QUARTERS_NAMES: Readonly<Record<SeatId, string>> = {
  outer: 'A bunk in the outer disciples’ hall',
  inner: 'A cave of your own',
  true: 'A true disciple’s cave',
  elder: 'An elder’s peak',
  grand: 'A grand elder’s peak',
  head: 'The head’s peak',
};
export const BUNK_NAME = 'A barracks bunk';

/** The Dwelling screen opens after a month at your seat's quarters (or at once for one you take). */
export const QUARTERS_OPEN_DAYS = 30;

/** A lease run out: what's in the store is kept a month, then sold for the debt. */
export const LAPSED_KEEP_DAYS = 30;

/** Building your own base: the works and what they cost (K9's talk, kept thin). */
export const WORKS = {
  /** Clearing land: a slot, six days' work at the site. */
  clear: { days: 6, low: 0 },
  /** Digging the store deeper: small to a store, a store to large. */
  store: [
    { from: STORE.small, to: STORE.store, days: 10, low: 12 },
    { from: STORE.store, to: STORE.large, days: 20, low: 40 },
  ],
  /** A quiet chamber: injuries mend ×1.5 while you stay. */
  chamber: { days: 8, low: 6, mend: 1.5 },
} as const;
export type WorkId = 'clear' | 'store' | 'chamber';

/** A wild cave abode's land grows by this much past its 2 + the vein's tier. */
export const CAVE_GROWS = 2;

/** Hidden veins (Jan's call: three times as thick in undeveloped land), seeded with the world. */
export const VEINS = {
  perTract: 3,
  perKingdom: 1,
  /** One in six a tier above the region's own. */
  richShare: 1 / 6,
  /** Kept apart from each other and from places. */
  spacing: 1200,
} as const;

/** Geomancy 堪舆 (K9's talk): a reading of the spot, once a day, within 60 li (×3 a soul realm). */
export const GEOMANCY = {
  li: 60,
  /** Past your reading but within this reach, the nearest unread vein becomes a rumor ring. */
  hintLi: 600,
} as const;

/** Raids (K9's talk): a thief's month, the age a bed draws beasts, and what's taken. */
export const RAIDS = {
  /** Raiders come for a store worth more than a month's wage at their band (30 low at Qi Condensation). */
  wage: 30,
  /** A bed this many years old draws the land's beasts; at the next a beast a band stronger. */
  oldBed: [10, 100],
  /** Thieves left alone take this share of the store's worth, dearest first. */
  share: 1 / 3,
  /** Days the card waits before it settles: thieves, a beast. */
  thievesDays: 5,
  beastDays: 3,
} as const;

/** The roster templates a raid's fight reads: thieves of the land and a beast at its beds. */
export const RAIDERS = { thieves: 'garrison-deserter', beast: 'thunder-deer' } as const;
