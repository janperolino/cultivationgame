// Methods that eat resources, and arts that burn goods (K11, design § Professions, people and
// powers): the Border Wilds' upkeep methods, three qi, three body and two soul at tiers 1 and 2,
// each at its own place, and the goods the arts burn. Fed, an upkeep method climbs a band rarer on
// light upkeep and two on heavy; its slip is priced at its written rarity. Light is about half a
// day's wage a day (0.5 low at tier 1, 4.5 at tier 2), heavy about two days' (2 and 18), and a
// thing a day stands in for the stones: an herb, a vial of blood, a stick of incense, a pill.
// Drafted in K11's talk for Jan's review; the blue one that climbs to gold fed is a rare find
// (Jan's call). **Awaiting Jan's review.**
import type { Catalog } from './types.ts';

/** The continent's: the goods the methods drink and the arts burn, and the volley arts. */
export const UPKEEP_GOODS: Catalog = {
  at: 'qiming',
  layer: 'continent',
  items: [
    {
      id: 'calm-soul-incense',
      name: 'Calm-Soul Incense',
      pinyin: 'Anshen Xiang',
      hanzi: '安神香',
      tier: 1,
      rarity: 'white',
      kind: 'material',
      price: 0.5,
      uses: { ingredient: { properties: ['soul-calming'] } },
      source: 'the shrine-keepers’ rolling tables, where calm-heart grass is ground into lamp fat',
      text: 'A grey stick that burns for one night and smells of graves and cold oil. A nourishing art that drinks incense drinks one of these a day.',
    },
    {
      id: 'black-iron-powder',
      name: 'Black Iron Powder',
      pinyin: 'Xuantie Fen',
      hanzi: '玄铁粉',
      tier: 2,
      rarity: 'white',
      element: 'metal',
      kind: 'material',
      uses: { ingredient: { properties: ['hard', 'tempering'] } },
      source:
        'a refiner’s forge, where Foundation ore is burned and ground until it runs like sand',
      text: 'A pouch of iron ground so fine it pours. A metal body drinks it with its herbs, and the skin goes grey where it settles.',
    },
    {
      id: 'blood-burning-pill',
      name: 'Blood-Burning Pill',
      pinyin: 'Ranxue Dan',
      hanzi: '燃血丹',
      tier: 1,
      rarity: 'white',
      upTo: 'blue',
      kind: 'pill',
      price: 10,
      uses: { burn: { turns: 3 } },
      source:
        'the Beast-Butcher Gate’s boiling room, which sells it to disciples going out against something they cannot beat',
      text: 'Swallowed in a fight, it sets the blood alight: for three breaths you fight a realm above yourself, and for the rest of the day you can barely lift a saber.',
    },
    {
      id: 'marrow-burning-pill',
      name: 'Marrow-Burning Pill',
      pinyin: 'Ransui Dan',
      hanzi: '燃髓丹',
      tier: 2,
      rarity: 'white',
      upTo: 'blue',
      kind: 'pill',
      price: 10,
      uses: { burn: { turns: 3 } },
      source: 'Foundation elders who will not say what it costs them to brew',
      text: 'The Foundation cultivator’s burning pill: the marrow catches where the blood did, and the fall afterward is longer.',
    },
  ],
  techniques: [
    {
      id: 'three-talisman-volley',
      name: 'Three-Talisman Volley',
      pinyin: 'Sanfu Qifa',
      hanzi: '三符齐发',
      ladder: 'qi',
      tier: 1,
      rarity: 'white',
      line: 'three-talisman-volley',
      chapter: 1,
      daos: [],
      form: 'projectile',
      damage: 'physical',
      power: 0,
      qiCost: 10,
      volley: 3,
      source:
        'Talisman Lane’s masters, who teach it to a pupil the day the pupil’s sheets stop failing',
      text: 'Three sheets fanned between the fingers and loosed on one breath. Each burns as if it were thrown alone.',
    },
    {
      id: 'five-pearl-talisman-chain',
      name: 'Five-Pearl Talisman Chain',
      pinyin: 'Wufu Lianzhu',
      hanzi: '五符连珠',
      ladder: 'qi',
      tier: 1,
      rarity: 'blue',
      line: 'five-pearl-talisman-chain',
      chapter: 1,
      daos: [],
      form: 'projectile',
      damage: 'physical',
      power: 0,
      qiCost: 10,
      volley: 5,
      source: 'a talisman master of the Lane who kept it from her own pupils for thirty years',
      text: 'Five sheets go out strung on one thread of qi like pearls on a cord, and each bursts where it lands.',
    },
    {
      id: 'ten-quarter-talisman-rain',
      name: 'Ten-Quarter Talisman Rain',
      pinyin: 'Shifang Fuyu',
      hanzi: '十方符雨',
      ladder: 'qi',
      tier: 2,
      rarity: 'green',
      line: 'ten-quarter-talisman-rain',
      chapter: 1,
      daos: [],
      form: 'projectile',
      damage: 'physical',
      power: 0,
      qiCost: 10,
      volley: 10,
      source:
        'the Foundation talisman masters, who throw the paper up and let it fall where the qi tells it',
      text: 'A stack thrown into the air comes down as ten talismans from ten quarters at once.',
    },
  ],
  arts: [
    {
      technique: 'three-talisman-volley',
      nodes: [
        {
          id: 'art-fanned-fingers',
          name: 'Fanned Fingers',
          hanzi: '扇指',
          kind: 'minor',
          cost: 30,
          requires: [],
          effects: [],
          own: [{ stat: 'techniqueCost', value: -0.1 }],
          text: 'The sheets sit between the fingers before the hand has finished reaching for them.',
        },
      ],
    },
    {
      technique: 'five-pearl-talisman-chain',
      nodes: [
        {
          id: 'art-one-thread',
          name: 'One Thread',
          hanzi: '一线',
          kind: 'minor',
          cost: 30,
          requires: [],
          effects: [],
          own: [{ stat: 'techniqueCost', value: -0.12 }],
          text: 'One breath of qi strings them all, and none of it is wasted between the pearls.',
        },
        {
          id: 'art-pearls-find-the-gap',
          name: 'Pearls Find the Gap',
          hanzi: '珠寻隙',
          kind: 'minor',
          cost: 30,
          requires: [],
          effects: [],
          own: [{ stat: 'hit', value: 1 }],
          text: 'The cord bends round a guard, and the next pearl goes where the last one opened it.',
        },
      ],
    },
    {
      technique: 'ten-quarter-talisman-rain',
      nodes: [
        {
          id: 'art-ten-quarters',
          name: 'Ten Quarters',
          hanzi: '十方',
          kind: 'minor',
          cost: 150,
          requires: [],
          effects: [],
          own: [{ stat: 'techniqueCost', value: -0.12 }],
          text: 'The stack goes up already knowing where each sheet will fall.',
        },
      ],
    },
  ],
  recipes: [
    {
      output: 'calm-soul-incense',
      craft: 'alchemy',
      family: 'soul-pills',
      inputs: [
        { thing: 'calm-heart-grass', count: 3 },
        { thing: 'bat-fat-lamp-oil', count: 1 },
      ],
      yield: 10,
    },
    {
      output: 'blood-burning-pill',
      craft: 'alchemy',
      family: 'tempering-pills',
      inputs: [
        { thing: 'beast-blood', count: 5 },
        { thing: 'cinnabar-ore', count: 2 },
      ],
    },
    {
      output: 'marrow-burning-pill',
      craft: 'alchemy',
      family: 'tempering-pills',
      inputs: [
        { thing: 'beast-blood', count: 6 },
        { thing: 'cinnabar-ore', count: 2 },
      ],
    },
    {
      output: 'black-iron-powder',
      craft: 'refining',
      family: 'vessels',
      inputs: [{ thing: 'red-rocks-iron-ore', count: 3 }],
      yield: 10,
    },
  ],
  lots: [
    { thing: 'calm-soul-incense', shops: ['stall', 'alchemy'], weight: 0.4, count: [5, 20] },
    { thing: 'black-iron-powder', shops: ['refiner'], weight: 0.3, count: [2, 10] },
    { thing: 'blood-burning-pill', shops: ['black-market'], weight: 0.3, count: [1, 2] },
    { thing: 'marrow-burning-pill', shops: ['black-market'], weight: 0.15, count: [1, 2] },
    { thing: 'technique:three-talisman-volley', shops: ['talisman'], weight: 0.4 },
    { thing: 'technique:five-pearl-talisman-chain', shops: ['talisman'], weight: 0.1 },
    { thing: 'technique:ten-quarter-talisman-rain', shops: ['talisman'], weight: 0.2 },
  ],
};

/** The City of the Guarded Mouth's: a merchant's breathing, counted stone by stone. */
export const GUARDED_MOUTH_UPKEEP: Catalog = {
  at: 'qm-shoukou-cheng',
  layer: 'place',
  methods: [
    {
      id: 'counting-stone-breathing',
      name: 'Counting-Stone Breathing Method',
      pinyin: 'Shushi Tuna Fa',
      hanzi: '数石吐纳法',
      source:
        'the City’s money-changers, who breathe over the day’s stones and keep a little of each for themselves',
      ladder: 'qi',
      tier: 1,
      rarity: 'white',
      line: 'counting-stone-breathing',
      chapter: 1,
      fit: 'full',
      fitBy: { mutated: 'poor' },
      requirements: {},
      upkeep: { weight: 'light', stones: 0.5 },
      growth: { qiPool: 0.4, techniquePower: 0.3, qiRecovery: 0.3 },
      properties: [],
    },
  ],
  lots: [{ thing: 'method:counting-stone-breathing', shops: ['house'], weight: 0.5 }],
};

/** The Night Bridge Society's: the crossers' pill-fed breathing, theirs alone. */
export const NIGHT_BRIDGE_UPKEEP: Catalog = {
  at: 'qm-yeqiao-hui',
  layer: 'place',
  methods: [
    {
      id: 'pill-fed-tide-breathing',
      name: 'Pill-Fed Tide Breathing',
      pinyin: 'Fudan Chaoxi Fa',
      hanzi: '服丹潮息法',
      source:
        'the Night Bridge Society, whose crossers swallow a pill at every tide and breathe it down before the water turns',
      ladder: 'qi',
      tier: 1,
      rarity: 'green',
      guardedBy: 'qm-yeqiao-hui',
      line: 'pill-fed-tide-breathing',
      chapter: 1,
      fit: 'full',
      fitBy: { mutated: 'poor' },
      requirements: {},
      upkeep: { weight: 'heavy', items: { 'qi-gathering-pill': 1 } },
      growth: { qiPool: 0.5, techniquePower: 0.2, qiRecovery: 0.3 },
      properties: [
        {
          name: 'Tide-Melted',
          text: 'A pill goes down on the in-breath and is gone before the out.',
          effects: [{ stat: 'pillFuel', value: 0.05 }],
        },
      ],
    },
  ],
  lots: [{ thing: 'method:pill-fed-tide-breathing', shops: ['black-market'], weight: 0.3 }],
};

/** The Nameless Market's: a stone-swallowing scripture, sold under the counter now and then. */
export const NAMELESS_MARKET_UPKEEP: Catalog = {
  at: 'qm-wuming-ji',
  layer: 'place',
  methods: [
    {
      id: 'whale-swallowing-stone-scripture',
      name: 'Whale-Swallowing Stone Scripture',
      pinyin: 'Jingtun Lingshi Jing',
      hanzi: '鲸吞灵石经',
      source:
        'a merchant prince’s private scripture, sold off a piece at a time by the heirs who could not afford to run it',
      ladder: 'qi',
      tier: 2,
      rarity: 'green',
      line: 'whale-swallowing-stone-scripture',
      chapter: 1,
      fit: 'full',
      fitBy: { mutated: 'poor' },
      requirements: {},
      upkeep: { weight: 'heavy', stones: 18 },
      growth: { qiPool: 0.5, techniquePower: 0.2, qiRecovery: 0.3 },
      properties: [
        {
          name: 'Stone Swallowing',
          text: 'The dantian opens like a whale’s mouth: twice the stones a day go down, those past the old cap at half their worth.',
          effects: [{ stat: 'stoneCap', value: 1 }],
        },
      ],
    },
  ],
  lots: [
    { thing: 'method:whale-swallowing-stone-scripture', shops: ['black-market'], weight: 0.1 },
  ],
};

/** The Beast-Butcher Gate's: tempering in the day's blood, and its burning pills. */
export const BUTCHER_GATE_UPKEEP: Catalog = {
  at: 'qm-tushou-men',
  layer: 'place',
  methods: [
    {
      id: 'butcher-yard-blood-tempering',
      name: 'Butcher-Yard Blood Tempering',
      pinyin: 'Tuchang Xuelian Jue',
      hanzi: '屠场血炼诀',
      source:
        'the Gate’s butchering yards, where an outer disciple drinks a vial of the day’s blood before the drill',
      ladder: 'body',
      tier: 1,
      rarity: 'white',
      line: 'butcher-yard-blood-tempering',
      chapter: 1,
      fit: 'full',
      fitBy: { mutated: 'poor' },
      requirements: {},
      upkeep: { weight: 'light', items: { 'beast-blood': 1 } },
      growth: { hp: 0.4, physicalDamage: 0.4, regeneration: 0.2 },
      properties: [],
    },
  ],
  lots: [
    { thing: 'method:butcher-yard-blood-tempering', shops: ['sect'], weight: 0.5 },
    { thing: 'blood-burning-pill', shops: ['sect'], count: [1, 3], members: true },
    {
      thing: 'marrow-burning-pill',
      shops: ['sect'],
      weight: 0.3,
      count: [1, 2],
      members: true,
    },
  ],
};

/** The Kingdom of Spirit Herders': the herb bath their beast-doctors sit in. */
export const SPIRIT_HERDERS_UPKEEP: Catalog = {
  at: 'qm-muling-guo',
  layer: 'place',
  methods: [
    {
      id: 'hundred-herb-bath-art',
      name: 'Hundred-Herb Bath Art',
      pinyin: 'Baicao Yaoyu Gong',
      hanzi: '百草药浴功',
      source:
        'the herders’ beast-doctors, who learned on sick colts what a tub of herbs does to flesh and then climbed in themselves',
      ladder: 'body',
      tier: 1,
      rarity: 'green',
      line: 'hundred-herb-bath-art',
      chapter: 1,
      element: 'wood',
      fit: 'full',
      fitBy: { mutated: 'poor' },
      requirements: {},
      upkeep: { weight: 'heavy', any: { kind: 'herb', tier: 1, n: 3 } },
      growth: { hp: 0.4, physicalDamage: 0.2, regeneration: 0.4 },
      properties: [
        {
          name: 'Steeped Flesh',
          text: 'The herbs stay in the skin long after the bath is cold.',
          effects: [{ stat: 'regeneration', value: 0.05 }],
        },
      ],
    },
  ],
  lots: [{ thing: 'method:hundred-herb-bath-art', shops: ['house'], weight: 0.4 }],
};

/** The March's: a metal body found, never sold (Jan's call: the blue that climbs to gold is rare). */
export const MARCH_UPKEEP: Catalog = {
  at: 'qm-anbian-fu',
  layer: 'place',
  methods: [
    {
      id: 'black-iron-body-art',
      name: 'Black Iron Body Art',
      pinyin: 'Xuantie Duanshen Jue',
      hanzi: '玄铁锻身诀',
      source:
        'a dead garrison general’s chest, found under the Wall with his armor rusted to the shape of him',
      ladder: 'body',
      tier: 2,
      rarity: 'blue',
      line: 'black-iron-body-art',
      chapter: 1,
      element: 'metal',
      fit: 'full',
      fitBy: { mutated: 'poor' },
      requirements: {},
      upkeep: { weight: 'heavy', items: { 'black-iron-powder': 2 } },
      growth: { hp: 0.3, physicalDamage: 0.5, regeneration: 0.2 },
      properties: [
        {
          name: 'Iron Under the Skin',
          text: 'A blade that finds the skin finds iron a finger below it.',
          effects: [{ stat: 'physicalResist', value: 0.05 }],
        },
      ],
    },
  ],
  lots: [{ thing: 'method:black-iron-body-art', shops: [], weight: 0.2 }],
};

/** The Lamp-Keeper Sect's: nourishing the soul in incense smoke. */
export const LAMP_KEEPERS_UPKEEP: Catalog = {
  at: 'qm-shoudeng-zong',
  layer: 'place',
  methods: [
    {
      id: 'lamp-smoke-nourishing-art',
      name: 'Lamp-Smoke Nourishing Art',
      pinyin: 'Dengyan Yangshen Jue',
      hanzi: '灯烟养神诀',
      source:
        'the Lamp-Keepers’ novices, who sit a night with one stick of incense and follow the smoke up out of themselves',
      ladder: 'soul',
      tier: 1,
      rarity: 'white',
      line: 'lamp-smoke-nourishing-art',
      chapter: 1,
      fit: 'full',
      fitBy: { mutated: 'poor' },
      requirements: {},
      upkeep: { weight: 'light', items: { 'calm-soul-incense': 1 } },
      growth: { soulDefense: 0.3, divineSense: 0.4, perception: 0.3 },
      properties: [],
    },
  ],
  lots: [
    { thing: 'method:lamp-smoke-nourishing-art', shops: ['sect'], weight: 0.5 },
    { thing: 'calm-soul-incense', shops: ['sect'], count: [10, 30] },
  ],
};

/** The Soul-Lost Stone Forest's: a sutra found among the pillars, fed on calm-heart grass. */
export const STONE_FOREST_UPKEEP: Catalog = {
  at: 'qm-mihun-shilin',
  layer: 'place',
  methods: [
    {
      id: 'dream-grass-soul-sutra',
      name: 'Dream-Grass Soul Sutra',
      pinyin: 'Mengcao Yanghun Jing',
      hanzi: '梦草养魂经',
      source:
        'a hermit’s bones in the Stone Forest, a bed of calm-heart grass grown up through the ribs',
      ladder: 'soul',
      tier: 1,
      rarity: 'green',
      line: 'dream-grass-soul-sutra',
      chapter: 1,
      fit: 'full',
      fitBy: { mutated: 'poor' },
      requirements: {},
      upkeep: { weight: 'heavy', items: { 'calm-heart-grass': 3 } },
      growth: { soulDefense: 0.5, divineSense: 0.2, perception: 0.3 },
      properties: [
        {
          name: 'Dreamless',
          text: 'The grass takes the dreams, and what is left is hard to reach.',
          effects: [{ stat: 'soulDefense', value: 0.04 }],
        },
      ],
    },
  ],
  lots: [{ thing: 'method:dream-grass-soul-sutra', shops: [], weight: 0.3 }],
};

export const UPKEEP_CATALOGS: readonly Catalog[] = [
  UPKEEP_GOODS,
  GUARDED_MOUTH_UPKEEP,
  NIGHT_BRIDGE_UPKEEP,
  NAMELESS_MARKET_UPKEEP,
  BUTCHER_GATE_UPKEEP,
  SPIRIT_HERDERS_UPKEEP,
  MARCH_UPKEEP,
  LAMP_KEEPERS_UPKEEP,
  STONE_FOREST_UPKEEP,
];
