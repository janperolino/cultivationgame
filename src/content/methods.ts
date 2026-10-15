// Methods: the manuals each ladder climbs with (design § Cultivation, methods): cultivation
// methods for qi, tempering arts for the body, nourishing arts for the soul. A method is a bundle
// of independent fields, and any combination is legal; there are no kinds. Rarity sets its speed,
// the growth it leaves on every stage climbed with it, its breakthrough bonuses and its properties
// (content/rarity.ts); its tier is how far it carries you. A new method is an entry here, not new
// code.
import { RARITY_CIRCULATION, type CirculationId } from './circulation.ts';
import type { LadderId } from './cultivation.ts';
import type { Element } from './elements.ts';
import type { RarityId } from './rarity.ts';
import type { RootKind } from './roots.ts';
import type { Effect, StatId } from './stats.ts';

export type Fit = 'full' | 'partial' | 'poor';

/** How fast a method cultivates for a root that fits it this well; growth scales the same way. */
export const FIT_SPEED: Record<Fit, number> = { full: 1.0, partial: 0.8, poor: 0.6 };

/**
 * What each ladder's growth builds (design § Cultivation, growth): a qi method leaves pool, purity
 * and recovery; a tempering art HP, physical damage and regeneration; a nourishing art soul
 * defense, divine sense and perception. Combat reads them from M2.
 */
export const GROWTH_STATS = {
  qi: ['qiPool', 'techniquePower', 'qiRecovery'],
  body: ['hp', 'physicalDamage', 'regeneration'],
  soul: ['soulDefense', 'divineSense', 'perception'],
} as const satisfies Record<LadderId, readonly StatId[]>;

/** How a method splits its growth among its ladder's three stats; the shares add up to 1. */
export type GrowthProfile = Partial<Record<StatId, number>>;

/** One of rarity's special properties: a gear-like extra while the method is active. */
export interface MethodProperty {
  name: string;
  text: string;
  effects: readonly Effect[];
  /** Gold and red methods carry one unique property; red's is named. */
  unique?: boolean;
}

/** What it takes to cultivate with a method, beyond knowing it. Empty for most. */
export interface MethodRequirements {
  /** Root kinds it can be cultivated on; any root when absent. */
  roots?: readonly RootKind[];
  /** Flags the cultivator must hold: a sect rank, a ritual done, a physique woken. */
  flags?: readonly string[];
}

/** What a method drinks every day it is cultivated; an unfed day stalls it. */
export interface Upkeep {
  /** Low-grade spirit stones a day. */
  stones?: number;
  /** Items a day, by id. */
  items?: Readonly<Record<string, number>>;
}

export interface Method {
  id: string;
  name: string;
  pinyin: string;
  hanzi: string;
  /** Where it comes from, for the tooltip. */
  source: string;
  /** The ladder it climbs: a qi method, a tempering art (body) or a nourishing art (soul). */
  ladder: LadderId;
  /** The realm it carries you to the peak of: 1 for Qi Condensation, 2 for Foundation. */
  tier: number;
  rarity: RarityId;
  /** The line it belongs to, and its chapter in that line, from 1 (design § Cultivation, lines). */
  line: string;
  chapter: number;
  /** A tempering or nourishing art may carry an element; its hours then match that element. */
  element?: Element;
  /** Fit for every root kind not listed in `fitBy`. Body and soul ignore the root. */
  fit: Fit;
  fitBy: Partial<Record<RootKind, Fit>>;
  requirements: MethodRequirements;
  upkeep: Upkeep | null;
  growth: GrowthProfile;
  properties: readonly MethodProperty[];
  /**
   * The pattern a qi method's sparks run on the figure (content/circulation.ts); its rarity's
   * default when absent.
   */
  circulation?: CirculationId;
}

/** Common methods fit every root fully, except mutated roots, which they fit poorly. */
const common = { fit: 'full', fitBy: { mutated: 'poor' } } as const;
/** No requirements, no upkeep and no properties: a plain white method. */
const plain = { rarity: 'white', requirements: {}, upkeep: null, properties: [] } as const;

export const METHODS: readonly Method[] = [
  // The origins' qi methods (design § Character creation), each with the Foundation chapter the
  // origin's layer 9 card hands over with the pill (P1.7).
  {
    id: 'garrison-standard',
    name: 'Garrison Standard Method',
    pinyin: 'Junzhen Tongfa',
    hanzi: '军镇通法',
    source: "the March's garrison school, for the cave orphan who goes along",
    ladder: 'qi',
    tier: 1,
    line: 'garrison-standard',
    chapter: 1,
    growth: { qiPool: 0.4, techniquePower: 0.3, qiRecovery: 0.3 },
    ...plain,
    ...common,
  },
  {
    id: 'garrison-standard-foundation',
    name: 'Garrison Standard Method, Foundation Chapter',
    pinyin: 'Junzhen Tongfa, Zhuji Pian',
    hanzi: '军镇通法·筑基篇',
    source: 'the garrison school, for a cadet who reaches the peak of Qi Condensation',
    ladder: 'qi',
    tier: 2,
    line: 'garrison-standard',
    chapter: 2,
    growth: { qiPool: 0.4, techniquePower: 0.3, qiRecovery: 0.3 },
    ...plain,
    ...common,
  },
  {
    id: 'crude-cave',
    name: 'Crude Cave Method',
    pinyin: 'Kuxue Cufa',
    hanzi: '窟穴粗法',
    source: 'the cave clans of the Kingdom of Stone Eyes, for the orphan they hide',
    ladder: 'qi',
    tier: 1,
    line: 'crude-cave',
    chapter: 1,
    growth: { qiPool: 0.5, techniquePower: 0.2, qiRecovery: 0.3 },
    ...plain,
    ...common,
  },
  {
    id: 'crude-cave-foundation',
    name: 'Crude Cave Method, Foundation Chapter',
    pinyin: 'Kuxue Cufa, Zhuji Pian',
    hanzi: '窟穴粗法·筑基篇',
    source: 'the cave clans, scratched on the wall of a sinkhole no tester has found',
    ladder: 'qi',
    tier: 2,
    line: 'crude-cave',
    chapter: 2,
    growth: { qiPool: 0.5, techniquePower: 0.2, qiRecovery: 0.3 },
    ...plain,
    ...common,
  },
  {
    id: 'cadet-spear',
    name: 'Cadet Spear Method',
    pinyin: 'Xueqiang Fa',
    hanzi: '学枪法',
    source: "the Gongsun garrison's cadet school on the Wall of Piled Bones",
    ladder: 'qi',
    tier: 1,
    line: 'cadet-spear',
    chapter: 1,
    growth: { qiPool: 0.3, techniquePower: 0.5, qiRecovery: 0.2 },
    ...plain,
    ...common,
  },
  {
    id: 'cadet-spear-foundation',
    name: 'Cadet Spear Method, Foundation Chapter',
    pinyin: 'Xueqiang Fa, Zhuji Pian',
    hanzi: '学枪法·筑基篇',
    source: 'the Gongsun garrison, for a cadet fit to lead a patrol on the Wall',
    ladder: 'qi',
    tier: 2,
    line: 'cadet-spear',
    chapter: 2,
    growth: { qiPool: 0.3, techniquePower: 0.5, qiRecovery: 0.2 },
    ...plain,
    ...common,
  },
  {
    id: 'butcher-saber',
    name: 'Beast-Butcher Saber Method',
    pinyin: 'Tushou Daofa',
    hanzi: '屠兽刀法',
    source: "the Beast-Butcher Gate's outer disciples",
    ladder: 'qi',
    tier: 1,
    line: 'butcher-saber',
    chapter: 1,
    growth: { qiPool: 0.3, techniquePower: 0.4, qiRecovery: 0.3 },
    ...plain,
    ...common,
  },
  {
    id: 'butcher-saber-foundation',
    name: 'Beast-Butcher Saber Method, Foundation Chapter',
    pinyin: 'Tushou Daofa, Zhuji Pian',
    hanzi: '屠兽刀法·筑基篇',
    source: 'the Beast-Butcher Gate, for an outer disciple who has earned the inner hall',
    ladder: 'qi',
    tier: 2,
    line: 'butcher-saber',
    chapter: 2,
    growth: { qiPool: 0.3, techniquePower: 0.4, qiRecovery: 0.3 },
    ...plain,
    ...common,
  },
  {
    id: 'night-bridge',
    name: 'Night Bridge Breathing Method',
    pinyin: 'Yeqiao Tuna Fa',
    hanzi: '夜桥吐纳法',
    source: 'the Night Bridge Society, for the deserter it smuggles out',
    ladder: 'qi',
    tier: 1,
    line: 'night-bridge',
    chapter: 1,
    growth: { qiPool: 0.3, techniquePower: 0.2, qiRecovery: 0.5 },
    circulation: 'night-bridge',
    ...plain,
    ...common,
  },
  {
    id: 'night-bridge-foundation',
    name: 'Night Bridge Breathing Method, Foundation Chapter',
    pinyin: 'Yeqiao Tuna Fa, Zhuji Pian',
    hanzi: '夜桥吐纳法·筑基篇',
    source: 'the Night Bridge Society, once you are worth the next chapter to them',
    ladder: 'qi',
    tier: 2,
    line: 'night-bridge',
    chapter: 2,
    growth: { qiPool: 0.3, techniquePower: 0.2, qiRecovery: 0.5 },
    circulation: 'night-bridge',
    ...plain,
    ...common,
  },
  {
    id: 'bounty-scrap',
    name: 'Bounty Office Scrap Manual',
    pinyin: 'Shangbang Canjuan',
    hanzi: '赏榜残卷',
    source: 'a torn manual taken as pay at the bounty office in the City of the Guarded Mouth',
    ladder: 'qi',
    tier: 1,
    line: 'bounty-scrap',
    chapter: 1,
    growth: { qiPool: 0.34, techniquePower: 0.33, qiRecovery: 0.33 },
    ...plain,
    ...common,
  },
  {
    id: 'bounty-scrap-foundation',
    name: 'Bounty Office Scrap Manual, Foundation Chapter',
    pinyin: 'Shangbang Canjuan, Zhuji Pian',
    hanzi: '赏榜残卷·筑基篇',
    source: "the torn manual's missing half, tracked down through the bounty office",
    ladder: 'qi',
    tier: 2,
    line: 'bounty-scrap',
    chapter: 2,
    growth: { qiPool: 0.34, techniquePower: 0.33, qiRecovery: 0.33 },
    ...plain,
    ...common,
  },
  // The first arts, for P1.7's errand card and the later card after it (reviewed 2026-10-11).
  {
    id: 'stone-bearing',
    name: 'Stone-Bearing Tempering Art',
    pinyin: 'Fushi Duanti Jue',
    hanzi: '负石锻体诀',
    source:
      'the porters and wall crews of the Border Wilds, who temper themselves hauling stone; an earth art',
    ladder: 'body',
    tier: 1,
    line: 'stone-bearing',
    chapter: 1,
    element: 'earth',
    growth: { hp: 0.5, physicalDamage: 0.3, regeneration: 0.2 },
    ...plain,
    ...common,
  },
  {
    id: 'still-lantern',
    name: 'Still Lantern Nourishing Art',
    pinyin: 'Jingdeng Yangshen Jue',
    hanzi: '静灯养神诀',
    source: "the frontier shrines' lamp-keepers, who sit with one flame until the mind is as still",
    ladder: 'soul',
    tier: 1,
    line: 'still-lantern',
    chapter: 1,
    growth: { soulDefense: 0.4, divineSense: 0.2, perception: 0.4 },
    ...plain,
    ...common,
  },
  // Their Foundation chapters (P3.2, drafted for Jan's review), so a body refiner or a soul
  // cultivator climbs Foundation on their own path.
  {
    id: 'stone-bearing-foundation',
    name: 'Stone-Bearing Tempering Art, Foundation Chapter',
    pinyin: 'Fushi Duanti Jue, Zhuji Pian',
    hanzi: '负石锻体诀·筑基篇',
    source:
      'the wall crews who carry the great blocks of the Wall of Piled Bones, two porters to a stone, or one who has washed the marrow',
    ladder: 'body',
    tier: 2,
    line: 'stone-bearing',
    chapter: 2,
    element: 'earth',
    growth: { hp: 0.5, physicalDamage: 0.3, regeneration: 0.2 },
    ...plain,
    ...common,
  },
  {
    id: 'still-lantern-foundation',
    name: 'Still Lantern Nourishing Art, Foundation Chapter',
    pinyin: 'Jingdeng Yangshen Jue, Zhuji Pian',
    hanzi: '静灯养神诀·筑基篇',
    source:
      "the shrine's elder keepers, who sit with the lamp unlit and keep the flame in mind alone",
    ladder: 'soul',
    tier: 2,
    line: 'still-lantern',
    chapter: 2,
    growth: { soulDefense: 0.4, divineSense: 0.2, perception: 0.4 },
    ...plain,
    ...common,
  },
  // Methods off the first hour's path, one a rarity from gray to red, for the world to hand out
  // from M3 (sect vaults, inheritances, ruins). Drafted in P1.5 for Jan's review.
  {
    id: 'market-stall',
    name: 'Market-Stall Breathing Manual',
    pinyin: 'Ditan Tuna Jue',
    hanzi: '地摊吐纳诀',
    source: 'a mat in any market town, a copy of a copy with its middle pages missing',
    ladder: 'qi',
    tier: 1,
    rarity: 'gray',
    line: 'market-stall',
    chapter: 1,
    ...common,
    requirements: {},
    upkeep: null,
    growth: { qiPool: 0.34, techniquePower: 0.33, qiRecovery: 0.33 },
    properties: [],
  },
  {
    id: 'pine-wind',
    name: 'Pine Wind Breathing Method',
    pinyin: 'Songfeng Tuna Fa',
    hanzi: '松风吐纳法',
    source: 'a hermit’s grave on a ridge above the Wall of Piled Bones',
    ladder: 'qi',
    tier: 1,
    rarity: 'green',
    line: 'pine-wind',
    chapter: 1,
    ...common,
    requirements: {},
    upkeep: null,
    growth: { qiPool: 0.3, techniquePower: 0.2, qiRecovery: 0.5 },
    properties: [
      {
        name: 'Unhurried Breath',
        text: 'Breath as slow as wind in pines leaves room to understand.',
        effects: [{ stat: 'insightGain', value: 0.03 }],
      },
    ],
  },
  {
    id: 'ember-furnace',
    name: 'Ember Furnace Method',
    pinyin: 'Jinlu Fa',
    hanzi: '烬炉法',
    source: 'the furnace room of a dead alchemist under the City of the Guarded Mouth',
    ladder: 'qi',
    tier: 1,
    rarity: 'blue',
    line: 'ember-furnace',
    chapter: 1,
    fit: 'full',
    fitBy: { mixed: 'partial', mutated: 'poor' },
    requirements: {},
    upkeep: { stones: 1 },
    growth: { qiPool: 0.3, techniquePower: 0.5, qiRecovery: 0.2 },
    properties: [
      {
        name: 'Furnace Draw',
        text: 'The dantian burns stones like a furnace burns charcoal.',
        effects: [{ stat: 'stoneQi', value: 0.15 }],
      },
    ],
  },
  {
    id: 'thunder-swallowing',
    name: 'Nine Heavens Thunder-Swallowing Method',
    pinyin: 'Jiutian Tunlei Fa',
    hanzi: '九天吞雷法',
    source: 'an inheritance in a lightning-struck ruin, open only to a root that can hold thunder',
    ladder: 'qi',
    tier: 1,
    rarity: 'gold',
    line: 'thunder-swallowing',
    chapter: 1,
    fit: 'poor',
    fitBy: { mutated: 'full', chaos: 'full' },
    requirements: { roots: ['mutated', 'chaos'] },
    upkeep: null,
    growth: { qiPool: 0.3, techniquePower: 0.6, qiRecovery: 0.1 },
    properties: [
      {
        name: 'Grounded Meridians',
        text: 'Lightning runs through you to the earth.',
        effects: [{ stat: 'lightningResist', value: 0.1 }],
      },
      {
        name: 'Storm Patience',
        text: 'You wait for the strike, and it comes.',
        effects: [{ stat: 'minorOdds', value: 0.02 }],
      },
      {
        name: 'Swallowed Thunder',
        text: 'Every tribulation bolt you have eaten is still in you.',
        effects: [
          { stat: 'lightningResist', value: 0.2 },
          { stat: 'majorOdds', value: 0.03 },
        ],
        unique: true,
      },
    ],
  },
  {
    id: 'primordial-origin',
    name: 'Primordial Origin Scripture',
    pinyin: 'Taichu Hunyuan Jing',
    hanzi: '太初混元经',
    source:
      'an inheritance sealed before the heavens were severed; no sect admits to having seen it',
    ladder: 'qi',
    tier: 1,
    rarity: 'red',
    line: 'primordial-origin',
    chapter: 1,
    fit: 'full',
    fitBy: {},
    requirements: {},
    upkeep: null,
    growth: { qiPool: 0.4, techniquePower: 0.4, qiRecovery: 0.2 },
    properties: [
      {
        name: 'Boundless Sea',
        text: 'The dantian widens with every breath.',
        effects: [{ stat: 'qiGain', value: 0.05 }],
      },
      {
        name: 'Clear Mirror',
        text: 'What you see, you understand.',
        effects: [{ stat: 'insightGain', value: 0.05 }],
      },
      {
        name: 'Rooted Mountain',
        text: 'Setbacks pass over you like weather.',
        effects: [{ stat: 'setbackTime', value: -0.2 }],
      },
      {
        name: 'Breath Before Heaven',
        text: 'You breathe as the world did before it was cut.',
        effects: [{ stat: 'aptitude', value: 2 }],
        unique: true,
      },
    ],
  },
  {
    id: 'glazed-heaven-sutra',
    name: 'Glazed Heaven Sutra',
    pinyin: 'Liuli Tian Jing',
    hanzi: '琉璃天经',
    source:
      'said to be cut from the glass of the heavens before they were severed; a sutra with no sect, no master and no second copy',
    ladder: 'qi',
    tier: 1,
    rarity: 'pristine',
    line: 'glazed-heaven-sutra',
    chapter: 1,
    fit: 'full',
    fitBy: {},
    requirements: {},
    upkeep: null,
    growth: { qiPool: 0.4, techniquePower: 0.4, qiRecovery: 0.2 },
    properties: [
      {
        name: 'Clear Sea',
        text: 'The dantian is glass: it holds more, and loses nothing.',
        effects: [
          { stat: 'qiGain', value: 0.08 },
          { stat: 'qiRecovery', value: 0.1 },
        ],
      },
      {
        name: 'Unclouded',
        text: 'Nothing muddies what you see.',
        effects: [{ stat: 'insightGain', value: 0.08 }],
      },
      {
        name: 'Flawless Step',
        text: 'Every breakthrough finds its footing.',
        effects: [
          { stat: 'majorOdds', value: 0.04 },
          { stat: 'gradeMargin', value: 0.25 },
        ],
      },
      {
        name: 'Uncracked',
        text: 'Setbacks slide off the glass.',
        effects: [{ stat: 'setbackTime', value: -0.3 }],
      },
      {
        name: 'The Heaven Before the Cut',
        text: 'For a breath each day you cultivate under the sky as it was, whole.',
        effects: [
          { stat: 'aptitude', value: 3 },
          { stat: 'lifespan', value: 0.1 },
        ],
        unique: true,
      },
    ],
  },
];

const byId = new Map(METHODS.map((m) => [m.id, m]));

export function method(id: string): Method {
  const m = byId.get(id);
  if (!m) throw new RangeError(`Unknown method ${id}`);
  return m;
}

/** The pattern a method's sparks run on the figure: its own, or its rarity's. */
export function methodCirculation(m: Method): CirculationId {
  return m.circulation ?? RARITY_CIRCULATION[m.rarity];
}

export function hasMethod(id: string): boolean {
  return byId.has(id);
}

export function methodFit(m: Method, kind: RootKind): Fit {
  return m.fitBy[kind] ?? m.fit;
}

/** The chapter of a line, if there is one. */
export function methodChapter(line: string, chapter: number): Method | undefined {
  return METHODS.find((m) => m.line === line && m.chapter === chapter);
}

/** The chapter before this one in its line, if any. */
export function previousChapter(m: Method): Method | undefined {
  return m.chapter > 1 ? methodChapter(m.line, m.chapter - 1) : undefined;
}

/** The chapter after this one in its line, if any. */
export function nextChapter(m: Method): Method | undefined {
  return methodChapter(m.line, m.chapter + 1);
}

/** The common tempering and nourishing arts the first hour's cards hand out (P1.7). */
export const FIRST_ARTS = { body: 'stone-bearing', soul: 'still-lantern' } as const;
