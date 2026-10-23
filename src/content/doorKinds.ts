// Going in: places and people, the door kinds (design § The world, Going in: doors and frames,
// Four layers; P3.9b's talk with Jan, 2026-10-22). Every door a place screen shows is one of these
// kinds once you go in: its features with the tags the resolver reads, the rooms off it and how
// you get in, the special thing it does, and the hours it is busy. A6's doors map to a kind by their
// piece on the sheet (`DOOR_KIND_OF`); the wine house, flower house, den, bathhouse and temple have no
// door card until they are painted, and come only as frames GLM names and the engine fills. Drafted
// in P3.9b for Jan's review (docs/review-queue.md).
import type { LandFeature } from './goin.ts';

/** A way past a room's keeper: invited, paid, by rank, or sneaked or forced past (design § Guarded ground). */
export type WayIn = 'open' | 'invited' | 'paid' | 'rank';

export interface DoorRoom {
  name: string;
  /** How you get in without sneaking or forcing it. */
  way: WayIn;
  /** What a paid room costs, in silver taels. */
  taels?: number;
  /** Warded by arrays at its keeper's realm (a cultivator's ground), not only a lock. */
  warded?: boolean;
  /** A household store sits in it: the table its owner kind fills (content/households.ts). */
  store?: boolean;
}

/** What a door kind does that no other does, read by the engine where it lands. */
export type DoorSpecial =
  | 'room-for-the-night'
  | 'rumor'
  | 'round'
  | 'mat'
  | 'craft-welcome'
  | 'faces-remembered'
  | 'hire'
  | 'watch'
  | 'rank'
  | 'spar-free'
  | 'loose-talk'
  | 'games'
  | 'unarmed'
  | 'sanctuary'
  | 'work-beside'
  | 'arrays'
  | 'household';

/** The hours a door is busy, as a share of its crowd at each double-hour, 子 first (12 values). */
export type Hours = readonly number[];

export interface DoorKind {
  name: string;
  hanzi: string;
  features: readonly LandFeature[];
  rooms: readonly DoorRoom[];
  special: DoorSpecial;
  /** One line on what the special does, for the codex and GLM's context. */
  does: string;
  /** Its share of a place's street crowd at its busiest. */
  crowd: number;
  hours: Hours;
  /** Someone keeps it: a keeper, a deacon, a steward. Null for a home or open ground. */
  keeper: string | null;
  /** Who lives here: a home's frame is a resident's (core/frames.ts). */
  home?: boolean;
}

// 子 丑 寅 卯 辰 巳 午 未 申 酉 戌 亥
const DAY: Hours = [0.05, 0.02, 0.05, 0.3, 0.8, 1, 1, 1, 0.9, 0.6, 0.3, 0.1];
const EVENING: Hours = [0.4, 0.2, 0.05, 0.1, 0.3, 0.5, 0.6, 0.6, 0.7, 1, 1, 0.8];
const NIGHT: Hours = [1, 0.8, 0.3, 0.05, 0.05, 0.1, 0.1, 0.1, 0.2, 0.5, 0.8, 1];
const SHOP: Hours = [0, 0, 0, 0.2, 0.9, 1, 1, 1, 0.9, 0.4, 0, 0];
const ALWAYS: Hours = [0.6, 0.5, 0.5, 0.7, 1, 1, 1, 1, 1, 1, 0.9, 0.7];
const DRILL: Hours = [0, 0, 0.3, 1, 1, 0.7, 0.4, 0.6, 0.8, 0.3, 0, 0];

const KINDS = {
  inn: {
    name: 'Inn',
    hanzi: '客栈',
    features: [
      { name: 'the common room’s tables', tags: ['crowd'] },
      { name: 'the stair up to the guest rooms', tags: ['height', 'narrow'] },
      { name: 'the stable yard', tags: ['cover'] },
    ],
    rooms: [
      { name: 'a guest room', way: 'paid', taels: 3 },
      { name: 'the kitchen', way: 'invited' },
      { name: 'the cellar', way: 'invited', store: true },
    ],
    special: 'room-for-the-night',
    does: 'rents a room: a frame of your own for the night, with a lock',
    crowd: 0.15,
    hours: EVENING,
    keeper: 'the innkeeper',
  },
  teahouse: {
    name: 'Teahouse',
    hanzi: '茶楼',
    features: [
      { name: 'the storyteller’s dais', tags: ['crowd'] },
      { name: 'screened booths upstairs', tags: ['cover', 'height'] },
      { name: 'the kettle stove', tags: ['burnable'] },
    ],
    rooms: [
      { name: 'a private booth', way: 'paid', taels: 2 },
      { name: 'the back kitchen', way: 'invited' },
    ],
    special: 'rumor',
    does: 'sells a rumor for 5 taels: the word going round this place',
    crowd: 0.2,
    hours: EVENING,
    keeper: 'the teahouse keeper',
  },
  'wine-house': {
    name: 'Wine house',
    hanzi: '酒楼',
    features: [
      { name: 'the long tables', tags: ['crowd'] },
      { name: 'a balcony over the street', tags: ['height'] },
      { name: 'the jar cellar door', tags: ['narrow'] },
    ],
    rooms: [
      { name: 'an upstairs room', way: 'paid', taels: 5 },
      { name: 'the jar cellar', way: 'invited', store: true },
    ],
    special: 'round',
    does: 'a round for the room (2 taels a head): everyone present spends an evening with you',
    crowd: 0.2,
    hours: NIGHT,
    keeper: 'the wine house’s master',
  },
  market: {
    name: 'Market street',
    hanzi: '散市',
    features: [
      { name: 'mats spread on the flagstones', tags: ['crowd'] },
      { name: 'the press of buyers', tags: ['cover', 'crowd'] },
      { name: 'the well at the street’s head', tags: [] },
    ],
    rooms: [],
    special: 'mat',
    does: 'set out your mat: whoever drifts by may buy from your Bag',
    crowd: 1,
    hours: DAY,
    keeper: null,
  },
  craft: {
    name: 'Craft shop',
    hanzi: '工坊',
    features: [
      { name: 'the counter', tags: [] },
      { name: 'the furnace or bench through the back door', tags: ['hot'] },
      { name: 'racks of finished work', tags: ['cover'] },
    ],
    rooms: [
      { name: 'the workshop', way: 'rank' },
      { name: 'the store room', way: 'rank', warded: true, store: true },
    ],
    special: 'craft-welcome',
    does: 'a crafter of the same craft is asked into the workshop as a guest',
    crowd: 0.05,
    hours: SHOP,
    keeper: 'the master of the shop',
  },
  trading: {
    name: 'Trading house',
    hanzi: '商号',
    features: [
      { name: 'the long counter', tags: [] },
      { name: 'the factor’s ledger', tags: [] },
      { name: 'the strongroom door', tags: ['narrow'] },
    ],
    rooms: [
      { name: 'the factor’s office', way: 'invited' },
      { name: 'the strongroom', way: 'rank', warded: true, store: true },
    ],
    special: 'faces-remembered',
    does: 'the factor remembers faces: whoever paid fairly here is remembered for it',
    crowd: 0.05,
    hours: SHOP,
    keeper: 'the factor',
  },
  bounty: {
    name: 'Bounty office',
    hanzi: '赏金所',
    features: [
      { name: 'the board, postings three deep', tags: [] },
      { name: 'the core scale', tags: [] },
      { name: 'the hunters’ benches', tags: ['crowd'] },
    ],
    rooms: [{ name: 'the scale room', way: 'rank', store: true }],
    special: 'hire',
    does: 'hire hands: anyone on the benches can be recruited for a job',
    crowd: 0.1,
    hours: ALWAYS,
    keeper: 'the clerk of the board',
  },
  gate: {
    name: 'The gate',
    hanzi: '城门',
    features: [
      { name: 'the gate arch', tags: ['narrow'] },
      { name: 'the toll table', tags: [] },
      { name: 'the wanted posters', tags: [] },
    ],
    rooms: [{ name: 'the guardhouse', way: 'rank' }],
    special: 'watch',
    does: 'the watch’s eyes: your heat and your cover are read as you pass',
    crowd: 0.1,
    hours: ALWAYS,
    keeper: 'the gate captain',
  },
  hall: {
    name: 'A power’s hall',
    hanzi: '殿',
    features: [
      { name: 'the hall steps', tags: ['height'] },
      { name: 'incense before the founder’s tablet', tags: [] },
      { name: 'the steward’s desk', tags: [] },
    ],
    rooms: [
      { name: 'the inner chamber', way: 'rank' },
      { name: 'the treasury', way: 'rank', warded: true, store: true },
    ],
    special: 'rank',
    does: 'rank opens every room; the elders lecture here',
    crowd: 0.1,
    hours: DAY,
    keeper: 'the steward',
  },
  ground: {
    name: 'Drill ground',
    hanzi: '演武场',
    features: [
      { name: 'the sand floor', tags: [] },
      { name: 'the weapon racks', tags: [] },
      { name: 'the seniors’ stand', tags: ['height'] },
    ],
    rooms: [],
    special: 'spar-free',
    does: 'anyone here will spar without being asked twice',
    crowd: 0.2,
    hours: DRILL,
    keeper: 'the drill instructor',
  },
  'flower-house': {
    name: 'Flower house',
    hanzi: '青楼',
    features: [
      { name: 'the painted stair', tags: ['height'] },
      { name: 'the musicians’ screen', tags: ['crowd'] },
      { name: 'curtained alcoves', tags: ['cover'] },
    ],
    rooms: [
      { name: 'a private chamber', way: 'paid', taels: 10 },
      { name: 'the madam’s room', way: 'invited', store: true },
    ],
    special: 'loose-talk',
    does: 'loose talk: asking for a truth here meets less resistance',
    crowd: 0.1,
    hours: NIGHT,
    keeper: 'the madam',
  },
  den: {
    name: 'Gambling den',
    hanzi: '赌坊',
    features: [
      { name: 'the dice tables', tags: ['crowd'] },
      { name: 'the cashier’s cage', tags: ['narrow'] },
      { name: 'lamp smoke', tags: ['dark'] },
    ],
    rooms: [
      { name: 'the back room', way: 'invited' },
      { name: 'the strongbox room', way: 'rank', warded: true, store: true },
    ],
    special: 'games',
    does: 'runs its games: a seeded throw with the house’s edge, cheating your soul against the dealer’s eye',
    crowd: 0.15,
    hours: NIGHT,
    keeper: 'the den’s master',
  },
  bathhouse: {
    name: 'Bathhouse',
    hanzi: '澡堂',
    features: [
      { name: 'steam over the pools', tags: ['cover'] },
      { name: 'the hot pools', tags: [] },
      { name: 'the clothes counter', tags: [] },
    ],
    rooms: [{ name: 'a private bath', way: 'paid', taels: 2 }],
    special: 'unarmed',
    does: 'everyone is unarmed: what they wear and carry waits at the clothes counter',
    crowd: 0.1,
    hours: EVENING,
    keeper: 'the bath master',
  },
  temple: {
    name: 'Temple',
    hanzi: '庙',
    features: [
      { name: 'the altar', tags: [] },
      { name: 'the incense court', tags: ['crowd'] },
      { name: 'the bell tower', tags: ['height'] },
    ],
    rooms: [
      { name: 'the monks’ quarters', way: 'invited' },
      { name: 'the back hall', way: 'rank', store: true },
    ],
    special: 'sanctuary',
    does: 'sanctuary: a fight started here costs twice the karma',
    crowd: 0.05,
    hours: DAY,
    keeper: 'the abbot',
  },
  yard: {
    name: 'The yard',
    hanzi: '场院',
    features: [
      { name: 'open beaten ground', tags: [] },
      { name: 'a tool shed', tags: ['cover'] },
      { name: 'carts waiting to load', tags: ['cover'] },
    ],
    rooms: [{ name: 'the shed', way: 'open' }],
    special: 'work-beside',
    does: 'work beside the hands: talk with them is free and leaves a shared evening',
    crowd: 0.05,
    hours: DRILL,
    keeper: 'the foreman',
  },
  abode: {
    name: 'Cultivator’s abode',
    hanzi: '洞府',
    features: [
      { name: 'the stone door', tags: ['narrow'] },
      { name: 'a spirit spring', tags: [] },
      { name: 'the meditation mat', tags: [] },
    ],
    rooms: [
      { name: 'the meditation chamber', way: 'invited', warded: true },
      { name: 'the store', way: 'invited', warded: true, store: true },
    ],
    special: 'arrays',
    does: 'warded by arrays at its owner’s realm: tripping one wakes them',
    crowd: 0,
    hours: ALWAYS,
    keeper: null,
    home: true,
  },
  home: {
    name: 'Mortal home',
    hanzi: '民居',
    features: [
      { name: 'the main room', tags: [] },
      { name: 'a back room', tags: ['cover'] },
      { name: 'a dog in the yard', tags: [] },
    ],
    rooms: [
      { name: 'the back room', way: 'invited', store: true },
      { name: 'the cellar', way: 'invited' },
    ],
    special: 'household',
    does: 'a lock and a dog, at mortal numbers; the household’s store inside',
    crowd: 0,
    hours: ALWAYS,
    keeper: null,
    home: true,
  },
} as const satisfies Record<string, DoorKind>;

export type DoorKindId = keyof typeof KINDS;
export const DOOR_KINDS: Readonly<Record<DoorKindId, DoorKind>> = KINDS;
export const DOOR_KIND_IDS = Object.keys(KINDS) as [DoorKindId, ...DoorKindId[]];

export function doorKind(id: DoorKindId): DoorKind {
  return DOOR_KINDS[id];
}

/**
 * A6's doors by their piece on the sheet (ui/placeDoors.ts `art`), each a door kind once gone into.
 * A second firm of a kind ("house-2") reads as its kind.
 */
export const DOOR_KIND_OF: Readonly<Record<string, DoorKindId>> = {
  inn: 'inn',
  barn: 'inn',
  teahouse: 'teahouse',
  elder: 'teahouse',
  stall: 'market',
  parts: 'market',
  mortal: 'market',
  'black-market': 'market',
  alchemy: 'craft',
  refiner: 'craft',
  talisman: 'craft',
  house: 'trading',
  changer: 'trading',
  broker: 'trading',
  maps: 'trading',
  guides: 'trading',
  board: 'bounty',
  bounty: 'bounty',
  mission: 'bounty',
  caravans: 'gate',
  sect: 'hall',
  elders: 'hall',
  seat: 'hall',
  join: 'hall',
  gift: 'hall',
  exam: 'hall',
  counter: 'hall',
  pavilion: 'hall',
  'law-hall': 'hall',
  ground: 'ground',
  work: 'yard',
  fields: 'yard',
  farmhouse: 'yard',
};

/** A door's kind by its piece: "house-2" is a house. Open ground's kind when nothing matches. */
export function doorKindOf(piece: string): DoorKindId {
  return DOOR_KIND_OF[piece] ?? DOOR_KIND_OF[piece.replace(/-\d+$/, '')] ?? 'yard';
}

/** Ticks a move inside a place takes (design § Moving): within a door, door to door, district to district. */
export const MOVE_TICKS = { within: 0, door: 1, district: 4 } as const;

/** Made frames a door keeps a scene (design § Frames, not floor plans). */
export const MADE_FRAMES_PER_DOOR = 3;

/** The house edge on the den's throw: you win this share of fair throws (Jan's yes, P3.9b). */
export const DEN_WIN = 0.45;

/** A rumor at the teahouse, in taels; a round at the wine house, a head. */
export const RUMOR_TAELS = 5;
export const ROUND_TAELS = 2;

/** Loose talk at the flower house: an ask for a truth meets this much of its resistance. */
export const LOOSE_TALK = 0.75;
