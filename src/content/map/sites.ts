// The written tables wild sites are seeded from (design § The world, The fog: Sites): by terrain,
// the kinds of site the land holds and their names, and by kind the features its scenes build from.
// Only the placement and the picks are seeded. Drafted in P3.6 for Jan's review.
import type { FEATURE_TAGS, SITE_KINDS } from '../atlas/schema.ts';

export type SiteKind = (typeof SITE_KINDS)[number];
export type FeatureTag = (typeof FEATURE_TAGS)[number];

/** The seal each kind of site is marked with on the map. */
export const SITE_SEAL: Record<SiteKind, string> = {
  town: '镇',
  village: '村',
  cave: '洞',
  den: '穴',
  ruin: '墟',
  shrine: '祠',
  'herb-valley': '谷',
  spring: '泉',
  falls: '瀑',
  peak: '峰',
  camp: '寨',
  hut: '庐',
  mine: '矿',
  tomb: '冢',
  tree: '木',
  stele: '碑',
  heart: '王',
  checkpoint: '卡',
  ferry: '渡',
};

/** The seals of the atlas's own places on the map. */
export const PLACE_SEAL: Record<string, string> = {
  city: '城',
  power: '门',
  landmark: '墙',
  realm: '境',
  kingdom: '国',
  forbidden: '险',
};

/** What each terrain's wilds hold: a kind of site and its name. */
export const WILD_SITES: Readonly<Record<string, readonly [SiteKind, string][]>> = {
  karst: [
    ['cave', 'a cave behind a sinkhole'],
    ['den', 'a stone-ape den'],
    ['ruin', 'a collapsed cave temple'],
    ['herb-valley', 'a herb ledge in a sinkhole'],
    ['spring', 'a spirit spring in a grotto'],
    ['peak', 'a thunder-struck spire'],
    ['hut', 'a hermit’s cliff hut'],
    ['tomb', 'cliff coffins on a rock face'],
    ['camp', 'a bandit hold among the pillars'],
  ],
  hills: [
    ['den', 'a wolf den on a ridge'],
    ['shrine', 'a roadside earth shrine'],
    ['ruin', 'a burnt watch post'],
    ['cave', 'a hillside cave'],
    ['mine', 'an abandoned iron mine'],
    ['tomb', 'barrow mounds'],
    ['camp', 'a deserters’ camp'],
    ['village', 'a goatherds’ hamlet'],
    ['falls', 'a waterfall in a ravine'],
  ],
  plains: [
    ['den', 'a thunder-deer wallow'],
    ['shrine', 'a herders’ cairn shrine'],
    ['herb-valley', 'a hollow of spirit grass'],
    ['village', 'a yurt camp'],
    ['tree', 'a lone ancient elm'],
    ['camp', 'raiders’ horse lines'],
    ['ruin', 'a field of rusted spears'],
  ],
  forest: [
    ['den', 'a boar den under the roots'],
    ['herb-valley', 'a mushroom glade'],
    ['ruin', 'an overgrown hermitage'],
    ['shrine', 'a tree shrine'],
    ['tree', 'a spirit-touched camphor'],
    ['hut', 'a woodcutters’ lodge'],
    ['falls', 'a mossy waterfall'],
    ['camp', 'a poachers’ camp'],
  ],
  marsh: [
    ['den', 'a crocodile wallow'],
    ['ruin', 'a sunken village'],
    ['herb-valley', 'a lotus pool'],
    ['spring', 'a will-o’-wisp spring'],
    ['village', 'a stilt village'],
    ['tomb', 'a drowned bone shrine'],
  ],
  coast: [
    ['cave', 'a sea cave'],
    ['ruin', 'a wrecked junk'],
    ['shrine', 'a sea-goddess shrine'],
    ['village', 'a fishing hamlet'],
    ['camp', 'a wreckers’ camp'],
    ['spring', 'a tide spring'],
  ],
};

/** The features each kind of site gives its scenes (design § The world, Scene templates). */
export const SITE_FEATURES: Readonly<
  Partial<Record<SiteKind, readonly { name: string; tags: FeatureTag[] }[]>>
> = {
  cave: [
    { name: 'the cave mouth', tags: ['dark', 'narrow'] },
    { name: 'a drip-water pool', tags: ['water'] },
  ],
  den: [
    { name: 'the den’s mouth, gnawed bones round it', tags: ['dark', 'cover'] },
    { name: 'a game trail', tags: ['narrow'] },
  ],
  ruin: [
    { name: 'tumbled walls', tags: ['cover', 'fragile'] },
    { name: 'a fallen roof beam', tags: ['burnable', 'fall'] },
  ],
  shrine: [
    { name: 'the altar and its offerings', tags: ['witnesses', 'fire'] },
    { name: 'the shrine’s eaves', tags: ['cover'] },
  ],
  'herb-valley': [
    { name: 'the herb beds', tags: ['cover', 'fragile'] },
    { name: 'a stream through the valley', tags: ['water', 'crossing'] },
  ],
  spring: [
    { name: 'the spring’s pool', tags: ['water'] },
    { name: 'wet stone round it', tags: ['fall'] },
  ],
  falls: [
    { name: 'the plunge pool', tags: ['water', 'fall'] },
    { name: 'the spray behind the falls', tags: ['cover'] },
  ],
  peak: [
    { name: 'the summit', tags: ['height', 'fall'] },
    { name: 'a lightning-scarred rock', tags: ['fragile'] },
  ],
  camp: [
    { name: 'the cook fire', tags: ['fire', 'witnesses'] },
    { name: 'a palisade of stakes', tags: ['cover', 'burnable'] },
  ],
  hut: [
    { name: 'the hut', tags: ['burnable', 'cover'] },
    { name: 'a path up to it', tags: ['narrow'] },
  ],
  mine: [
    { name: 'the shaft', tags: ['dark', 'narrow', 'fall'] },
    { name: 'rotten pit props', tags: ['fragile', 'burnable'] },
  ],
  tomb: [
    { name: 'the grave mounds', tags: ['cover'] },
    { name: 'a sealed tomb door', tags: ['dark'] },
  ],
  tree: [
    { name: 'the great trunk', tags: ['height', 'burnable'] },
    { name: 'roots over a hollow', tags: ['cover', 'dark'] },
  ],
  village: [
    { name: 'the village square', tags: ['witnesses'] },
    { name: 'thatched roofs', tags: ['burnable'] },
  ],
  town: [
    { name: 'the market street', tags: ['witnesses', 'cover'] },
    { name: 'the town gate', tags: ['narrow'] },
  ],
  heart: [
    { name: 'the lair at the heart', tags: ['dark', 'cover'] },
    { name: 'ground no one walks', tags: ['fall'] },
  ],
  stele: [{ name: 'the stele', tags: ['fragile'] }],
  checkpoint: [{ name: 'the barrier pole and the guard hut', tags: ['narrow', 'witnesses'] }],
  ferry: [{ name: 'the rope ferry', tags: ['water', 'crossing'] }],
};

/** A heart's name by its tract's terrain: the beast king or the old thing that rules it. */
export const HEART_NAMES: Readonly<Record<string, readonly [string, string]>> = {
  karst: ['the Stone-Ape King’s pillars', '猿王'],
  hills: ['the Wolf King’s ridge', '狼王'],
  plains: ['the bison kings’ grass', '牛王'],
  forest: ['the old camphor’s grove', '樟王'],
  marsh: ['the drowned heart of the fens', '泽心'],
  coast: ['the tide drake’s reef', '蛟礁'],
};
