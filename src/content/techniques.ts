// Techniques: the moves you actually use (design § Cultivation, § Combat). Mastery runs Glimpse to
// Origin, raised by practice days, and each level adds +2 to checks with the technique. These are
// the first technique of each origin path, which character creation (P1.7) hands out. A new
// technique is an entry here, not new code. Power and qi cost are starting values for M2's
// combat engine and balance sim; Dao requirements arrive with the Daos in M2.
import type { LadderId } from './cultivation.ts';

/** Mastery levels, with the practice days each needs at tier 1 (counted from learning). */
export const MASTERY = [
  { id: 'glimpse', name: 'Glimpse', hanzi: '初窥', practice: 0 },
  { id: 'comprehension', name: 'Comprehension', hanzi: '领悟', practice: 4 },
  { id: 'mastery', name: 'Mastery', hanzi: '精通', practice: 30 },
  { id: 'domain', name: 'Domain', hanzi: '化境', practice: 150 },
  { id: 'origin', name: 'Origin', hanzi: '归元', practice: 600 },
] as const;
export type MasteryId = (typeof MASTERY)[number]['id'];

/** Each mastery level above Glimpse adds this to checks with the technique. */
export const MASTERY_CHECK_BONUS = 2;
/** A technique of tier t needs this to the power t − 1 times the practice. */
export const MASTERY_TIER_SCALE = 3;

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

/** A technique's shape, which the combat effects draw (design § Combat, effects fill the wait). */
export type Form = 'slash' | 'thrust' | 'palm' | 'projectile' | 'aura';

export interface Technique {
  id: string;
  name: string;
  pinyin: string;
  hanzi: string;
  /** The level that unseals it: qi techniques check your realm, body arts your body level. */
  ladder: LadderId;
  /** 1 at Qi Condensation, 2 at Foundation, and so on. */
  tier: number;
  /** Dao tags: each tier you hold in one adds to checks with it, from M2. */
  daos: readonly string[];
  form: Form;
  damage: DamageType;
  power: number;
  qiCost: number;
  /** The origin path that hands it out, as origin/choice; P1.7 reads this. */
  firstFor?: string;
  /** Where it comes from, for the tooltip. */
  source: string;
  text: string;
}

export const TECHNIQUES: readonly Technique[] = [
  {
    id: 'rampart-palm',
    name: 'Rampart Palm',
    pinyin: 'Shouyuan Zhang',
    hanzi: '守垣掌',
    ladder: 'qi',
    tier: 1,
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
    daos: ['wind'],
    form: 'palm',
    damage: 'wind',
    power: 36,
    qiCost: 8,
    firstFor: 'frontier-orphan/refuse',
    source: 'picked up running errands for the bounty office in the City of the Guarded Mouth',
    text: 'A quick palm that rides the draft down a narrow street.',
  },
];

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

/** Until character creation (P1.7), every life is the cave orphan who went along. */
export const PLACEHOLDER_TECHNIQUE = 'rampart-palm';
