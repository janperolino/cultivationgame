// Entering places (design § The world: Wherever you like, if you're strong enough; The fog: Maps,
// Rumors), as settled in P3.6b's talk on the look study (docs/mockups/place-screen-study.html):
// what each kind of place holds, the watch at a gate, the teahouse's rumors, guides, caravans and the
// maps for sale. Starting values; core/map/place.ts reads them.
import type { Item } from '../items.ts';

/** The kinds of place you can go into, each with its own screen. */
export type PlaceKindId = 'city' | 'town' | 'village' | 'hall' | 'gate' | 'site';

export interface PlaceKindInfo {
  name: string;
  /** A watch at the gate reads your realm and your name. */
  watch: boolean;
  /** The gate's toll for a cultivator, in low-grade stones. */
  toll: number;
  /** A money changer: stones to silver and back, and grades up and down. */
  changer: boolean;
  /** Where rumors come from: a teahouse for silver, a village elder for news of your own. */
  rumors: 'teahouse' | 'elder' | null;
  /** A night's bed, in taels: an inn, or a barn in a village. */
  bed: number | null;
  /** The maps sold: the region's and every kingdom's, or the kingdom it stands in. */
  maps: 'region' | 'kingdom' | null;
  guides: number;
  /** Caravans leaving a week. */
  caravans: number;
  /** The bounty board's slot, filled in P3.7. */
  board: boolean;
}

export const PLACE_KINDS: Record<PlaceKindId, PlaceKindInfo> = {
  city: {
    name: 'city',
    watch: true,
    toll: 1,
    changer: true,
    rumors: 'teahouse',
    bed: 20,
    maps: 'region',
    guides: 2,
    caravans: 3,
    board: true,
  },
  town: {
    name: 'town',
    watch: true,
    toll: 0,
    changer: true,
    rumors: 'teahouse',
    bed: 20,
    maps: 'kingdom',
    guides: 1,
    caravans: 1,
    board: true,
  },
  village: {
    name: 'village',
    watch: false,
    toll: 0,
    changer: false,
    rumors: 'elder',
    bed: 5,
    maps: null,
    guides: 0,
    caravans: 0,
    board: false,
  },
  // A power's hall or a landmark that keeps no gate: its shops, if it has any.
  hall: {
    name: 'hall',
    watch: false,
    toll: 0,
    changer: false,
    rumors: null,
    bed: null,
    maps: null,
    guides: 0,
    caravans: 0,
    board: false,
  },
  gate: {
    name: 'gate',
    watch: false,
    toll: 0,
    changer: false,
    rumors: null,
    bed: null,
    maps: null,
    guides: 0,
    caravans: 0,
    board: false,
  },
  site: {
    name: 'site',
    watch: false,
    toll: 0,
    changer: false,
    rumors: null,
    bed: null,
    maps: null,
    guides: 0,
    caravans: 0,
    board: false,
  },
};

/** You stand at a place, and can go in, within this many li of it. */
export const ENTER_LI = 250;

// ---------------------------------------------------------------- the watch

/** Renown at this level in the region and the watch waves you through without the toll. */
export const WATCH_WAIVES_AT = 3;
/** Infamy at this level and the watch knows your face and turns you away. */
export const WATCH_REFUSES_AT = 3;
/** What a bribe at the gate costs, when the sergeant takes it (a persuade check offering greed). */
export const WATCH_BRIBE_LOW = 5;

// ---------------------------------------------------------------- rumors

/** A pot of tea, in taels: a teahouse tells one rumor a day. */
export const TEAHOUSE_TAELS = 5;
/** How far a teahouse's talk reaches, and a village elder's. */
export const RUMOR_LI = 6000;
export const ELDER_RUMOR_LI = 4500;
/** The talk picks among this many of the nearest places you don't know. */
export const RUMOR_CHOICES = 3;

/** Who tells a rumor of a kind of place. */
export const TELLERS: Readonly<Record<string, string>> = {
  cave: 'a beast hunter',
  den: 'a beast hunter',
  peak: 'a beast hunter',
  'herb-valley': 'a herb-gatherer',
  spring: 'a herb-gatherer',
  falls: 'a herb-gatherer',
  tree: 'a herb-gatherer',
  ruin: 'an old scholar',
  tomb: 'a grave-robber, drunk',
  stele: 'an old scholar',
  shrine: 'a pilgrim',
  mine: 'a prospector',
  camp: 'a caravan guard',
  hut: 'a caravan guard',
  town: 'a peddler',
  village: 'a peddler',
  checkpoint: 'a carter',
  ferry: 'a carter',
};

/** What they say, by the kind of place: {name}, {dir} and {days} are filled in. */
export const RUMOR_LINES: Readonly<Record<string, string>> = {
  cave: 'There’s a cave {dir}, {days} out. Something lairs near it, and something’s inside.',
  den: 'Stay off the ground {dir}, {days} out. There’s a den there, and the bones go back a way.',
  peak: 'A peak {dir}, {days} out. You can see half the wilds from the top, if what nests there lets you.',
  'herb-valley': 'A valley {dir}, {days} out, where the herbs grow knee-high. Nobody goes twice.',
  spring: 'There’s a spring {dir}, {days} out, that doesn’t freeze. Swear on my mother.',
  falls: 'Falls {dir}, {days} out. Sit under them long enough and the qi beats on you like rain.',
  tree: 'An old tree {dir}, {days} out, older than the Wall. The bark bleeds red.',
  ruin: 'Stones {dir}, {days} out, cut by someone who knew what they were doing. A sect, once.',
  tomb: 'Graves {dir}, {days} out. Old ones. Somebody dug at them and didn’t come back.',
  stele: 'A stele {dir}, {days} out. The marks on it hurt to look at.',
  shrine: 'A shrine {dir}, {days} out. Nobody tends it, and the incense still burns.',
  mine: 'An old mine {dir}, {days} out. Spirit iron, they say, before it flooded.',
  camp: 'Someone’s camped {dir}, {days} out. Too many fires for hunters.',
  hut: 'A hermit’s hut {dir}, {days} out. Smoke some mornings, nobody seen.',
  town: '{name}, {dir}, {days} out. Good market, if you’ve the stones.',
  village: '{name}, {dir}, {days} out. Small, quiet, sells to anyone.',
  checkpoint: 'There’s a post on the road {dir}, {days} out. They charge.',
  ferry: 'There’s a ferry {dir}, {days} out.',
};
export const RUMOR_LINE_ELSE = 'Something {dir}, {days} out. I’d not go alone.';

// ---------------------------------------------------------------- guides

/**
 * A guide knows the sites of their trade within this many li, about a month on foot (wild sites lie
 * 1,700 li and more apart), and is paid by the day of the trip.
 */
export const GUIDE_LI = 8000;
export const GUIDE_PAY_LOW = 1;

export interface GuideTrade {
  id: string;
  name: string;
  /** The site kinds they know. */
  knows: readonly string[];
}

export const GUIDE_TRADES: readonly GuideTrade[] = [
  { id: 'hunter', name: 'beast hunter', knows: ['den', 'cave', 'peak'] },
  { id: 'herbalist', name: 'herb-gatherer', knows: ['herb-valley', 'spring', 'falls', 'tree'] },
  {
    id: 'digger',
    name: 'grave-robber turned guide',
    knows: ['ruin', 'tomb', 'stele', 'shrine', 'mine'],
  },
];

// ---------------------------------------------------------------- caravans

/** Riding with a caravan, in low-grade stones; guarding pays the Caravan guard routine's wage. */
export const CARAVAN_FARE_LOW = 2;
/** A caravan leaves at 辰 on its day. */
export const CARAVAN_LEAVES_HOUR = 4;
/** The days to a week, for the caravans' listing. */
export const DAYS_PER_WEEK = 7;

// ---------------------------------------------------------------- maps for sale

export interface MapForSale {
  /** The Bag's item id. */
  id: string;
  /** The region or kingdom it charts. */
  of: string;
  scope: 'region' | 'kingdom';
  name: string;
  pinyin: string;
  hanzi: string;
  /** In low-grade stones: a kingdom's about a month's wage, a region's about a year's. */
  price: number;
}

export const MAPS: readonly MapForSale[] = [
  {
    id: 'map-qm-bianhuang',
    of: 'qm-bianhuang',
    scope: 'region',
    name: 'Map of the Border Wilds',
    pinyin: 'Bianhuang Yutu',
    hanzi: '边荒舆图',
    price: 360,
  },
  {
    id: 'map-qm-anbian-fu',
    of: 'qm-anbian-fu',
    scope: 'kingdom',
    name: 'Map of the March of Pacified Borders',
    pinyin: 'Anbian Fu Tu',
    hanzi: '安边府图',
    price: 30,
  },
  {
    id: 'map-qm-shiyan-guo',
    of: 'qm-shiyan-guo',
    scope: 'kingdom',
    name: 'Map of the Kingdom of Stone Eyes',
    pinyin: 'Shiyan Guo Tu',
    hanzi: '石眼国图',
    price: 30,
  },
  {
    id: 'map-qm-muling-guo',
    of: 'qm-muling-guo',
    scope: 'kingdom',
    name: 'Map of the Kingdom of Spirit Herders',
    pinyin: 'Muling Guo Tu',
    hanzi: '牧灵国图',
    price: 30,
  },
];

/** The maps as items: they stay in the Bag, and Sketch their places when used. */
export const MAP_ITEMS: readonly Item[] = MAPS.map((m) => ({
  id: m.id,
  name: m.name,
  pinyin: m.pinyin,
  hanzi: m.hanzi,
  tier: 1,
  rarity: 'white',
  kind: 'map',
  price: m.price,
  uses: { chart: { of: m.of, scope: m.scope } },
  source: m.scope === 'region' ? 'a city’s map seller' : 'a map seller in its towns',
  text:
    m.scope === 'region'
      ? 'The region’s kingdoms and its named places, inked on oiled hide.'
      : 'The kingdom’s outline, its towns and the roads that join them.',
}));
