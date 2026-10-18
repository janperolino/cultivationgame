// The Border Wilds below the atlas (design § The world, The fog: Sites): the towns and villages
// written by hand, the roads that join them, the names of its wild tracts, and where each start
// stands. The wild sites are seeded from content/map/sites.ts; the outlines are the atlas's.
// Drafted in P3.6 for Jan's review; best reviewed on the map.
import type { Population } from '../atlas/schema.ts';
import type { FeatureTag } from './sites.ts';

export interface WrittenTown {
  id: string;
  name: string;
  pinyin: string;
  hanzi: string;
  sub: 'town' | 'village';
  x: number;
  y: number;
  /** The atlas place it stands in; null for the wilds between the kingdoms. */
  parent: string | null;
  /** P3.5's shops that stand here (content/shops.ts). */
  shops: readonly string[];
  lore: string;
  features: readonly { name: string; tags: FeatureTag[] }[];
  /** The scale fields, as on an atlas place (design § World bible, The world at its true size). */
  prosperity: number;
  /** About how many live in the seat itself, mortals and cultivators by realm. */
  population: Population;
  /** Li across. */
  size: number;
  /** What shows from the map's height. */
  fromAbove: string;
}

export interface RegionContent {
  region: string;
  /**
   * Seeds the land, the wild tracts' cells, the same in every world (A5): the seed the region's
   * map painting was made from, so the painting and the rules agree.
   */
  landSeed: string;
  towns: readonly WrittenTown[];
  /** Roads as pairs of places they join, a written town or an atlas place. */
  roads: readonly (readonly [string, string])[];
  /** The atlas places that keep shops of their own (a city, a sect's gate, a society's hall). */
  placeShops: Readonly<Record<string, readonly string[]>>;
  /** The wild tracts' names; their cells are seeded, and the wet names go to the cells nearest the sea. */
  tracts: readonly { name: string; hanzi: string; terrain: string }[];
  /** The hearts the atlas names, by the forbidden land they rule: their name and hanzi. */
  namedHearts: Readonly<Record<string, readonly [string, string]>>;
  /** Where a life whose origin is at an atlas place starts: the town or place it stands in. */
  homes: Readonly<Record<string, string>>;
  /** Where a life with no home of its own starts. */
  defaultHome: string;
}

const F = (name: string, ...tags: FeatureTag[]) => ({ name, tags });

export const BORDER_WILDS: RegionContent = {
  region: 'qm-bianhuang',
  landSeed: 'guide',
  towns: [
    // The March of Pacified Borders, hills
    {
      id: 'pacified-fort',
      name: 'Pacified Fort',
      pinyin: 'Anbian Bao',
      hanzi: '安边堡',
      sub: 'town',
      x: 183600,
      y: 217200,
      parent: 'qm-anbian-fu',
      shops: ['march-stall'],
      lore: 'The Gongsun garrison’s seat and its cadet school, cut into the crown of a hill the first general flattened with one stroke. Its walls are the hill’s own rock, raised by formation to the height of cliffs, and a lockdown array rises over it as a dome of pale light when beasts come.',
      features: [
        F('the beacon bastion', 'height', 'fire'),
        F('the drill ground on the cut plateau', 'witnesses'),
      ],
      prosperity: 4,
      population: { mortals: 1_500_000, qi: 1500, foundation: 120 },
      size: 40,
      fromAbove:
        'A hill crown cut flat and ringed by walls of its own rock as tall as cliffs, a pale lockdown dome over it, and the March’s beacon as a pillar of spirit-fire on the highest bastion.',
    },
    {
      id: 'spear-plow',
      name: 'Spear-Plow Village',
      pinyin: 'Qiangli Cun',
      hanzi: '枪犁村',
      sub: 'village',
      x: 179400,
      y: 220600,
      parent: 'qm-anbian-fu',
      shops: ['march-mortal'],
      lore: 'The seat of a farming county two thousand li across, six million strong, where fields are plowed with spears at hand; the county store sells to the patrols.',
      features: [F('fields plowed with spears at hand', 'witnesses'), F('a beast-pit', 'fall')],
      prosperity: 3,
      population: { mortals: 150_000, qi: 40 },
      size: 15,
      fromAbove:
        'The county’s fields in a patchwork down the valleys, and a beacon peak over the seat.',
    },
    {
      id: 'ninth-beacon',
      name: 'Ninth Beacon',
      pinyin: 'Jiu Feng',
      hanzi: '九烽',
      sub: 'village',
      x: 188300,
      y: 214600,
      parent: 'qm-anbian-fu',
      shops: [],
      lore: 'The last of the March’s beacon peaks before Stone Eyes, its spirit-fire seen a thousand li off, and the March’s border post on the road.',
      features: [F('the beacon tower', 'height', 'fire')],
      prosperity: 3,
      population: { mortals: 40_000, qi: 30 },
      size: 5,
      fromAbove:
        'A lone peak with a pillar of spirit-fire standing on it, the ninth of the March’s beacons.',
    },
    {
      id: 'grain-ford',
      name: 'Grain Ford',
      pinyin: 'Liangdu Zhen',
      hanzi: '粮渡镇',
      sub: 'town',
      x: 184500,
      y: 221800,
      parent: 'qm-anbian-fu',
      shops: [],
      lore: 'Where the March’s grain is counted, taxed and stolen, in that order: granaries for forty million mouths in tiers along the ford.',
      features: [F('the granaries', 'burnable', 'cover'), F('the ford', 'water', 'crossing')],
      prosperity: 4,
      population: { mortals: 600_000, qi: 150, foundation: 5 },
      size: 25,
      fromAbove:
        'Granary terraces in tiers along a river crossing, their warding talismans a faint gold net over them.',
    },
    // The Kingdom of Stone Eyes, karst
    {
      id: 'sinkhole-terraces',
      name: 'Sinkhole Terraces',
      pinyin: 'Tiankeng Tai',
      hanzi: '天坑台',
      sub: 'town',
      x: 192600,
      y: 211300,
      parent: 'qm-shiyan-guo',
      shops: ['eyes-stall', 'eyes-alchemy', 'eyes-mortal'],
      lore: 'A town of two million terraced down the walls of a sinkhole thirty li across, its farms at the bottom, and the Registry’s testing stone on the top terrace.',
      features: [F('the sinkhole rim', 'height', 'fall'), F('the testing stone', 'witnesses')],
      prosperity: 3,
      population: { mortals: 2_000_000, qi: 600, foundation: 20 },
      size: 30,
      fromAbove:
        'A sinkhole thirty li across, dark as an eye from above, terraced all the way down its walls, with cloud pooling in it at dawn.',
    },
    {
      id: 'bat-roost',
      name: 'Bat Roost',
      pinyin: 'Fuqi Cun',
      hanzi: '蝠栖村',
      sub: 'village',
      x: 195600,
      y: 214300,
      parent: 'qm-shiyan-guo',
      shops: [],
      lore: 'Guano diggers and their ropes in a cave mouth a li high, the swarms pouring out at dusk, and a smell you stop noticing on the third day.',
      features: [F('bat roosts heaped with guano', 'dark', 'burnable')],
      prosperity: 2,
      population: { mortals: 80_000 },
      size: 8,
      fromAbove:
        'A cave mouth in a cliff, bat swarms pouring out of it at dusk like smoke a hundred li long.',
    },
    {
      id: 'lower-caves',
      name: 'Lower Caves',
      pinyin: 'Xiadong Cun',
      hanzi: '下洞村',
      sub: 'village',
      x: 189500,
      y: 209800,
      parent: 'qm-shiyan-guo',
      shops: [],
      lore: 'Cave clans who guide the Night Bridge’s runners through passages no map shows.',
      features: [F('caves no map shows', 'dark', 'cover', 'narrow')],
      prosperity: 2,
      population: { mortals: 50_000, qi: 40 },
      size: 6,
      fromAbove: 'Nothing: it is all underground.',
    },
    // The Kingdom of Spirit Herders, plains
    {
      id: 'corral-town',
      name: 'Corral Town',
      pinyin: 'Weilan Zhen',
      hanzi: '围栏镇',
      sub: 'town',
      x: 168200,
      y: 191300,
      parent: 'qm-muling-guo',
      shops: ['herders-stall', 'herders-guild', 'herders-mortal'],
      lore: 'The herders’ trading post, where thunder-horned deer and scale-horses are sold by the hundred head and the empire’s buyers keep a standing hall.',
      features: [F('the corrals', 'witnesses', 'fragile'), F('the auction ring', 'witnesses')],
      prosperity: 5,
      population: { mortals: 700_000, qi: 200, foundation: 10 },
      size: 30,
      fromAbove:
        'Rings of array-fenced paddock a few li wide each, and the herds moving between them like cloud shadow.',
    },
    {
      id: 'hatchling-barns',
      name: 'Hatchling Barns',
      pinyin: 'Chupeng Cun',
      hanzi: '雏棚村',
      sub: 'village',
      x: 166300,
      y: 195600,
      parent: 'qm-muling-guo',
      shops: [],
      lore: 'The Night Bridge’s crates come in after dark, and nobody asks what hatches.',
      features: [F('the hatchling barns', 'burnable', 'cover')],
      prosperity: 4,
      population: { mortals: 60_000, qi: 80 },
      size: 6,
      fromAbove:
        'Long barns sunk into a valley under a warmth array that keeps the frost off them, a faint amber haze.',
    },
    {
      id: 'thunderhorn-camp',
      name: 'Thunderhorn Camp',
      pinyin: 'Leijiao Ying',
      hanzi: '雷角营',
      sub: 'village',
      x: 169800,
      y: 188200,
      parent: 'qm-muling-guo',
      shops: [],
      lore: 'A summer camp of yurts where the deer are broken to the saddle, beside a herd a hundred thousand strong.',
      features: [F('open grass to the horizon', 'crossing')],
      prosperity: 4,
      population: { mortals: 30_000, qi: 40 },
      size: 20,
      fromAbove:
        'A herd of thunder-horned deer a hundred thousand strong on the open grass, sparks off their horns flickering over it on stormy nights.',
    },
    // The wilds between
    {
      id: 'foot-of-the-wall',
      name: 'Foot of the Wall',
      pinyin: 'Qiangjiao Cun',
      hanzi: '墙脚村',
      sub: 'village',
      x: 176800,
      y: 199200,
      parent: null,
      shops: ['wall-stall'],
      lore: 'Bone-carters and the women who feed the patrols, in the Wall’s long shadow.',
      features: [F('bone heaps waiting to be built in', 'cover', 'fragile')],
      prosperity: 2,
      population: { mortals: 120_000, qi: 60 },
      size: 10,
      fromAbove: 'A sprawl in the Wall’s shadow under the smoke of the bone-carters’ kilns.',
    },
    {
      id: 'reedwater',
      name: 'Reedwater',
      pinyin: 'Weishui Cun',
      hanzi: '苇水村',
      sub: 'village',
      x: 157500,
      y: 229000,
      parent: null,
      shops: [],
      lore: 'Salt-reed cutters on the last dry ground before the fens.',
      features: [F('reed beds', 'cover', 'burnable'), F('the salt pans', 'water')],
      prosperity: 2,
      population: { mortals: 40_000 },
      size: 10,
      fromAbove: 'Salt-reed beds silvering the last dry ground before the fens.',
    },
    {
      id: 'thornpost',
      name: 'Thornpost',
      pinyin: 'Cizha',
      hanzi: '刺栅',
      sub: 'village',
      x: 171000,
      y: 226000,
      parent: null,
      shops: [],
      lore: 'A hunters’ post on the way to the fens, ringed by a thorn hedge as tall as a tower that a wood-root cultivator grew a century ago against what comes out of them.',
      features: [F('the thorn hedge', 'cover', 'burnable', 'height')],
      prosperity: 2,
      population: { mortals: 15_000, qi: 20 },
      size: 4,
      fromAbove: 'A ring of dark thorn hedge forty li round, plain against the fen.',
    },
  ],
  roads: [
    ['qm-shoukou-cheng', 'qm-tushou-men'],
    ['qm-tushou-men', 'pacified-fort'],
    ['pacified-fort', 'ninth-beacon'],
    ['ninth-beacon', 'sinkhole-terraces'],
    ['sinkhole-terraces', 'bat-roost'],
    ['sinkhole-terraces', 'lower-caves'],
    ['pacified-fort', 'spear-plow'],
    ['pacified-fort', 'grain-ford'],
    ['qm-shoukou-cheng', 'hatchling-barns'],
    ['hatchling-barns', 'corral-town'],
    ['corral-town', 'thunderhorn-camp'],
    ['qm-tushou-men', 'foot-of-the-wall'],
    ['foot-of-the-wall', 'qm-duigu-qiang'],
    ['corral-town', 'foot-of-the-wall'],
    ['foot-of-the-wall', 'qm-yeqiao-hui'],
    ['qm-shoukou-cheng', 'thornpost'],
    ['thornpost', 'reedwater'],
  ],
  placeShops: {
    'qm-shoukou-cheng': [
      'mouth-stall',
      'mouth-alchemy',
      'mouth-refiner',
      'mouth-guild',
      'mouth-bounty',
      'mouth-mortal',
    ],
    'qm-tushou-men': ['gate-sect'],
    'qm-yeqiao-hui': ['bridge-black', 'bridge-stall'],
  },
  tracts: [
    { name: 'Saltreed Flats', hanzi: '盐苇滩', terrain: 'coast' },
    { name: 'the Tidewrack Shore', hanzi: '潮骸岸', terrain: 'coast' },
    { name: 'Marsh of Drowned Lanterns', hanzi: '溺灯泽', terrain: 'marsh' },
    { name: 'the Ghost-Lamp Fens', hanzi: '鬼灯泽', terrain: 'marsh' },
    { name: 'Grey Karst Reaches', hanzi: '灰岩野', terrain: 'karst' },
    { name: 'Needle Peaks', hanzi: '针峰野', terrain: 'karst' },
    { name: 'the Sinkhole Country', hanzi: '天坑野', terrain: 'karst' },
    { name: 'the Southern Karst', hanzi: '南岩野', terrain: 'karst' },
    { name: 'the Howling Downs', hanzi: '啸风岗', terrain: 'hills' },
    { name: 'Bonefields', hanzi: '白骨野', terrain: 'hills' },
    { name: 'Broken Teeth Hills', hanzi: '断齿岗', terrain: 'hills' },
    { name: 'Blackpine Forest', hanzi: '黑松林', terrain: 'forest' },
    { name: 'Mistbamboo Hollows', hanzi: '雾竹谷', terrain: 'forest' },
    { name: 'the Long Grass', hanzi: '长草原', terrain: 'plains' },
    { name: 'Redclay Barrens', hanzi: '赤土野', terrain: 'plains' },
  ],
  namedHearts: { 'qm-mihun-shilin': ['the python’s den', '蟒穴'] },
  homes: {
    'qm-shiyan-guo': 'sinkhole-terraces',
    'qm-anbian-fu': 'pacified-fort',
    'qm-shoukou-cheng': 'qm-shoukou-cheng',
    'qm-muling-guo': 'corral-town',
  },
  defaultHome: 'qm-shoukou-cheng',
};
