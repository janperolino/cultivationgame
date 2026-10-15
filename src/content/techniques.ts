// Techniques: the moves you actually use (design § Cultivation, § Combat). Mastery runs Glimpse to
// Origin, raised by practice days (content/mastery.ts), and each level adds +2 to checks with the
// technique. Techniques belong to lines, whose chapters climb the realms. These are the first
// technique of each origin path, which its card hands out at minute 20–35, and the garrison
// palm's second chapter. A new technique is an entry here, not new code. Power and qi cost are
// starting values for M2's combat engine and balance sim; Dao requirements arrive with the Daos
// in M2.
import type { LadderId } from './cultivation.ts';
import type { RarityId } from './rarity.ts';
import { CATALOG_TECHNIQUES } from './catalogs/index.ts';

/** The eleven damage types (design § Combat). */
export const DAMAGE_TYPES = [
  'physical',
  'metal',
  'wood',
  'water',
  'fire',
  'earth',
  'lightning',
  'wind',
  'ice',
  'soul',
  'poison',
] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

/**
 * A technique's shape, which the combat effects draw (design § Combat, effects fill the wait): the
 * five a cultivator's arts take, then the five a beast's natural attacks and abilities take, which
 * a bloodline's body techniques share.
 */
export type Form =
  | 'slash'
  | 'thrust'
  | 'palm'
  | 'projectile'
  | 'aura'
  | 'bite'
  | 'claw'
  | 'charge'
  | 'tail'
  | 'breath';

/**
 * A guard art's guard (design § Combat, The sheet; P3.2): each path guards its own way, reading its
 * ladder at half and its guard art for the other half. The shield is the qi's (its Defense), the
 * hardening the body's (its Defense) and the movement the soul's (its share of Evasion).
 */
export const GUARDS = ['shield', 'hardening', 'movement'] as const;
export type GuardId = (typeof GUARDS)[number];

/** The ladder each guard reads. */
export const GUARD_LADDER: Record<GuardId, LadderId> = {
  shield: 'qi',
  hardening: 'body',
  movement: 'soul',
};

export interface Technique {
  id: string;
  name: string;
  pinyin: string;
  hanzi: string;
  /** The level that unseals it: qi techniques check your realm, body arts your body level. */
  ladder: LadderId;
  /** 1 at Qi Condensation, 2 at Foundation, and so on. */
  tier: number;
  /** Rarity multiplies its power and, at gold and red, adds to checks (content/rarity.ts). */
  rarity: RarityId;
  /** The line it belongs to, and its chapter in that line, from 1 (design § Cultivation, lines). */
  line: string;
  chapter: number;
  /** Dao tags: each tier you hold in one adds to checks with it, from M2. */
  daos: readonly string[];
  form: Form;
  damage: DamageType;
  power: number;
  qiCost: number;
  /**
   * A guard art: known, it gives its guard's half at its band and is never cast, so its form,
   * damage, power and cost are unused (power 0, cost 0).
   */
  guard?: GuardId;
  /** The origin path that hands it out, as origin/choice; its first-technique card reads this. */
  firstFor?: string;
  /** Where it comes from, for the tooltip. */
  source: string;
  text: string;
}

const WRITTEN: readonly Technique[] = [
  {
    id: 'rampart-palm',
    name: 'Rampart Palm',
    pinyin: 'Shouyuan Zhang',
    hanzi: '守垣掌',
    ladder: 'qi',
    tier: 1,
    rarity: 'white',
    line: 'rampart-palm',
    chapter: 1,
    daos: ['fist'],
    form: 'palm',
    damage: 'physical',
    power: 40,
    qiCost: 8,
    firstFor: 'cave-orphan/along',
    source: "drilled at the March's garrison school",
    text: 'A flat-handed shove with qi behind it, taught to knock climbers off the wall.',
  },
  {
    id: 'sinkhole-stone-fist',
    name: 'Sinkhole Stone Fist',
    pinyin: 'Kengshi Quan',
    hanzi: '坑石拳',
    ladder: 'qi',
    tier: 1,
    rarity: 'white',
    line: 'sinkhole-stone-fist',
    chapter: 1,
    daos: ['earth', 'fist'],
    form: 'palm',
    damage: 'earth',
    power: 38,
    qiCost: 9,
    firstFor: 'cave-orphan/refuse',
    source: 'taught by the cave clans of the Kingdom of Stone Eyes',
    text: 'A fist that borrows the weight of the rock you stand on.',
  },
  {
    id: 'piled-bones-thrust',
    name: 'Piled Bones Thrust',
    pinyin: 'Jigu Ci',
    hanzi: '积骨刺',
    ladder: 'qi',
    tier: 1,
    rarity: 'white',
    line: 'piled-bones-thrust',
    chapter: 1,
    daos: ['spear'],
    form: 'thrust',
    damage: 'physical',
    power: 45,
    qiCost: 10,
    firstFor: 'conscript/along',
    source: "the Gongsun garrison's cadet drill on the Wall of Piled Bones",
    text: 'The first thrust every cadet learns, and the last one many of them use.',
  },
  {
    id: 'undertow-palm',
    name: 'Undertow Palm',
    pinyin: 'Anliu Zhang',
    hanzi: '暗流掌',
    ladder: 'qi',
    tier: 1,
    rarity: 'white',
    line: 'undertow-palm',
    chapter: 1,
    daos: ['water'],
    form: 'palm',
    damage: 'water',
    power: 38,
    qiCost: 9,
    firstFor: 'conscript/refuse',
    source: 'the Night Bridge Society, for the deserter it smuggles out',
    text: 'A soft palm that drags like a river current under a night bridge.',
  },
  {
    id: 'bone-splitting-cleave',
    name: 'Bone-Splitting Cleave',
    pinyin: 'Pigu Zhan',
    hanzi: '劈骨斩',
    ladder: 'qi',
    tier: 1,
    rarity: 'white',
    line: 'bone-splitting-cleave',
    chapter: 1,
    daos: ['saber'],
    form: 'slash',
    damage: 'physical',
    power: 48,
    qiCost: 11,
    firstFor: 'frontier-orphan/along',
    source: "the Beast-Butcher Gate's outer disciples",
    text: 'A butcher’s downward cut, meant for joints, that works as well on people.',
  },
  {
    id: 'alley-wind-palm',
    name: 'Alley Wind Palm',
    pinyin: 'Xiangfeng Zhang',
    hanzi: '巷风掌',
    ladder: 'qi',
    tier: 1,
    rarity: 'white',
    line: 'alley-wind-palm',
    chapter: 1,
    daos: ['wind'],
    form: 'palm',
    damage: 'wind',
    power: 36,
    qiCost: 8,
    firstFor: 'frontier-orphan/refuse',
    source: 'picked up running errands for the bounty office in the City of the Guarded Mouth',
    text: 'A quick palm that rides the draft down a narrow street.',
  },
  // The second chapter of the garrison's palm, for a wall officer. Drafted in P1.5 for review.
  {
    id: 'rampart-collapse-palm',
    name: 'Rampart Collapse Palm',
    pinyin: 'Bengyuan Zhang',
    hanzi: '崩垣掌',
    ladder: 'qi',
    tier: 2,
    rarity: 'white',
    line: 'rampart-palm',
    chapter: 2,
    daos: ['fist'],
    form: 'palm',
    damage: 'physical',
    power: 130,
    qiCost: 30,
    source: "the March's garrison school, for the officers who hold a stretch of wall",
    text: 'The same shove, with the whole wall behind it; what it hits comes down.',
  },
  // The three paths' first arts (P3.2, drafted for Jan's review): a strike for the body and the
  // soul, which had none, and a guard art for each path (design § Combat, The sheet).
  {
    id: 'porters-charge',
    name: "Porter's Charge",
    pinyin: 'Tiaofu Zhuang',
    hanzi: '挑夫撞',
    ladder: 'body',
    tier: 1,
    rarity: 'white',
    line: 'porters-charge',
    chapter: 1,
    daos: [],
    form: 'charge',
    damage: 'physical',
    power: 42,
    qiCost: 0,
    source: 'the porters and wall crews of the Border Wilds, beside their tempering art',
    text: 'Drop the shoulder you carry stone on and run it through whatever stands in the road. It costs no qi; it costs the body.',
  },
  {
    id: 'lamp-snuffing-glance',
    name: 'Lamp-Snuffing Glance',
    pinyin: 'Miedeng Yipie',
    hanzi: '灭灯一瞥',
    ladder: 'soul',
    tier: 1,
    rarity: 'white',
    line: 'lamp-snuffing-glance',
    chapter: 1,
    daos: [],
    form: 'aura',
    damage: 'soul',
    // A soul strike passes the qi shield and the armor, so it carries a third of an art's power
    // (SOUL_ART_POWER in content/enemies.ts, as the fight sim's path rows hold it).
    power: 13,
    qiCost: 6,
    source:
      "the frontier shrines' lamp-keepers, for the night something comes to put the flame out",
    text: 'A look that reaches past the eyes and pinches out the small flame behind them.',
  },
  {
    id: 'bulwark-of-breath',
    name: 'Bulwark of Breath',
    pinyin: 'Xiyuan Jue',
    hanzi: '息垣诀',
    ladder: 'qi',
    tier: 1,
    rarity: 'white',
    line: 'bulwark-of-breath',
    chapter: 1,
    daos: [],
    form: 'aura',
    damage: 'physical',
    power: 0,
    qiCost: 0,
    guard: 'shield',
    source: "the March's garrison school, taught to whoever stands the wall at night",
    text: 'Qi held a finger off the skin, packed the way the wall is packed, so a blow spends itself on breath before it finds flesh.',
  },
  {
    id: 'iron-cloth-shirt',
    name: 'Iron Cloth Shirt',
    pinyin: 'Tiebu Shan',
    hanzi: '铁布衫',
    ladder: 'body',
    tier: 1,
    rarity: 'white',
    line: 'iron-cloth-shirt',
    chapter: 1,
    daos: [],
    form: 'aura',
    damage: 'physical',
    power: 0,
    qiCost: 0,
    guard: 'hardening',
    source: 'every street boxer of the Border Wilds claims to teach it; the garrison actually does',
    text: 'Years of being struck with sticks, then stones, until the skin takes a blow the way cloth soaked in iron would.',
  },
  {
    id: 'lamp-shadow-step',
    name: 'Lamp-Shadow Step',
    pinyin: 'Dengying Bu',
    hanzi: '灯影步',
    ladder: 'soul',
    tier: 1,
    rarity: 'white',
    line: 'lamp-shadow-step',
    chapter: 1,
    daos: [],
    form: 'aura',
    damage: 'physical',
    power: 0,
    qiCost: 0,
    guard: 'movement',
    source:
      "the frontier shrines' lamp-keepers, who learn to move as a shadow does when the flame bends",
    text: 'The soul sees the blow begin; the step is only the body agreeing with it, a shadow sliding off the wall.',
  },
];

/** The written list and every catalog's (content/catalogs/). */
export const TECHNIQUES: readonly Technique[] = [...WRITTEN, ...CATALOG_TECHNIQUES];

const byId = new Map(TECHNIQUES.map((t) => [t.id, t]));

export function technique(id: string): Technique {
  const t = byId.get(id);
  if (!t) throw new RangeError(`Unknown technique ${id}`);
  return t;
}

export function hasTechnique(id: string): boolean {
  return byId.has(id);
}

/** The first technique an origin path hands out, as origin/choice. */
export function firstTechnique(path: string): Technique | undefined {
  return TECHNIQUES.find((t) => t.firstFor === path);
}

/** The chapter of a line, if there is one. */
export function techniqueChapter(line: string, chapter: number): Technique | undefined {
  return TECHNIQUES.find((t) => t.line === line && t.chapter === chapter);
}

/** The chapter before this one in its line, if any. */
export function previousTechniqueChapter(t: Technique): Technique | undefined {
  return t.chapter > 1 ? techniqueChapter(t.line, t.chapter - 1) : undefined;
}
