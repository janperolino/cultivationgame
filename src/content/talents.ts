// Talents (design § Cultivation, talents; § Tier, rarity and pedigree): rolled at birth, one of
// each kind. Spirit roots are content/roots.ts and origins content/origins.ts; this file holds the
// body, soul and fate talents. Each has a rarity on the shared scale, and its kind's attribute
// moves by that rarity (design § Combat: body talents move Agility, soul talents Aptitude, fate
// talents Fortune; gray −2 up to red +5), beside the stat changes under its flavor. Some sleep
// until the cultivator reaches a realm. Drafted in P1.7 for Jan's review.
import type { RarityId } from './rarity.ts';
import type { RealmId } from './realms.ts';
import type { Effect, StatId } from './stats.ts';

export type TalentKind = 'body' | 'soul' | 'fate';
export const TALENT_KINDS: readonly TalentKind[] = ['body', 'soul', 'fate'];

export interface Talent {
  id: string;
  kind: TalentKind;
  name: string;
  hanzi: string;
  rarity: RarityId;
  /** One line of flavor, for the roll and the Character screen. */
  text: string;
  /** What it changes beyond its kind's attribute. */
  effects: readonly Effect[];
  /** A talent that sleeps until a realm, then wakes with a lump of insight and a chronicle line. */
  sleeps?: { realm: RealmId; insight: number; text: string };
  /** How often it comes up against the others of its kind and rarity; 1 when absent. */
  weight?: number;
}

/** How far a talent's rarity moves its kind's attribute from the base of 10 (design § Combat). */
export const GRADE_MODIFIER: Record<RarityId, number> = {
  gray: -2,
  white: 0,
  green: 1,
  blue: 2,
  purple: 3,
  gold: 4,
  red: 5,
  pristine: 6,
};

/** The attribute each kind of talent moves by its rarity. */
export const KIND_ATTRIBUTE: Record<TalentKind, StatId> = {
  body: 'agility',
  soul: 'aptitude',
  fate: 'fortune',
};

export const TALENTS: readonly Talent[] = [
  // ------------------------------------------------------------ body
  {
    id: 'frail-meridians',
    kind: 'body',
    name: 'Frail Meridians',
    hanzi: '经脉孱弱',
    rarity: 'gray',
    text: 'Your channels are thin as reeds; tempering comes slowly.',
    effects: [
      { stat: 'bodyGain', value: -0.1 },
      { stat: 'hp', value: -0.05 },
    ],
  },
  {
    id: 'brittle-bones',
    kind: 'body',
    name: 'Brittle Bones',
    hanzi: '骨脆',
    rarity: 'gray',
    text: 'You broke an arm falling off a wall at seven, and it never set quite right.',
    effects: [{ stat: 'physicalResist', value: -0.05 }],
  },
  {
    id: 'farmhands-frame',
    kind: 'body',
    name: "Farmhand's Frame",
    hanzi: '农家筋骨',
    rarity: 'white',
    text: 'Ordinary shoulders, used to carrying.',
    effects: [{ stat: 'hp', value: 0.03 }],
  },
  {
    id: 'wiry-build',
    kind: 'body',
    name: 'Wiry Build',
    hanzi: '瘦韧',
    rarity: 'white',
    text: 'Thin, and slow to stay down.',
    effects: [{ stat: 'regeneration', value: 0.05 }],
  },
  {
    id: 'iron-bone-frame',
    kind: 'body',
    name: 'Iron-Bone Frame',
    hanzi: '铁骨',
    rarity: 'green',
    text: 'Heavy bones that take a blow and give it back.',
    effects: [
      { stat: 'hp', value: 0.08 },
      { stat: 'physicalResist', value: 0.03 },
    ],
  },
  {
    id: 'goat-legs',
    kind: 'body',
    name: 'Karst-Goat Legs',
    hanzi: '岩羊腿',
    rarity: 'green',
    text: 'You grew up climbing sinkhole walls, and your legs remember.',
    effects: [{ stat: 'bodyGain', value: 0.05 }],
  },
  {
    id: 'bitter-gut',
    kind: 'body',
    name: 'Bitter Gut',
    hanzi: '苦胆',
    rarity: 'green',
    text: 'You have eaten worse than any poison.',
    effects: [{ stat: 'poisonResist', value: 0.1 }],
  },
  {
    id: 'blazing-yang-body',
    kind: 'body',
    name: 'Blazing-Yang Body',
    hanzi: '炽阳之体',
    rarity: 'blue',
    text: 'You run hot in winter, and tempering burns through you quickly.',
    effects: [
      { stat: 'bodyGain', value: 0.1 },
      { stat: 'fireDamage', value: 0.05 },
    ],
  },
  {
    id: 'beast-bloodline',
    kind: 'body',
    name: 'Beast Bloodline',
    hanzi: '兽血',
    rarity: 'blue',
    text: 'Someone in your family had scales under the sleeve, and nobody says who.',
    effects: [
      { stat: 'hp', value: 0.1 },
      { stat: 'regeneration', value: 0.1 },
      { stat: 'physicalDamage', value: 0.05 },
    ],
  },
  {
    id: 'thunder-tempered-body',
    kind: 'body',
    name: 'Thunder-Tempered Body',
    hanzi: '雷淬之体',
    rarity: 'purple',
    text: 'Lightning struck you as a baby, and you laughed.',
    effects: [
      { stat: 'lightningResist', value: 0.25 },
      { stat: 'bodyGain', value: 0.1 },
    ],
  },
  {
    id: 'nine-yin-body',
    kind: 'body',
    name: 'Nine Yin Body',
    hanzi: '九阴之体',
    rarity: 'purple',
    text: 'Cold to the touch, at home in the dark; ghosts grow tame near you, and fire hurts.',
    effects: [
      { stat: 'ghostWay', value: 0.25 },
      { stat: 'yinResist', value: 0.25 },
      { stat: 'fireResist', value: -0.15 },
    ],
  },
  {
    id: 'pure-yang-body',
    kind: 'body',
    name: 'Pure Yang Body',
    hanzi: '纯阳之体',
    rarity: 'gold',
    text: 'Fire hits harder in your hands, yin chill cannot touch you, and lightning bites less.',
    effects: [
      { stat: 'fireDamage', value: 0.15 },
      { stat: 'yinResist', value: 1 },
      { stat: 'lightningResist', value: 0.15 },
    ],
  },
  {
    id: 'innate-dao-body',
    kind: 'body',
    name: 'Innate Dao Body',
    hanzi: '先天道体',
    rarity: 'red',
    text: 'Born already half way to the Dao: every ladder trains faster, and breakthroughs come easier.',
    effects: [
      { stat: 'qiGain', value: 0.15 },
      { stat: 'bodyGain', value: 0.15 },
      { stat: 'soulGain', value: 0.15 },
      { stat: 'minorOdds', value: 0.05 },
      { stat: 'majorOdds', value: 0.05 },
    ],
  },
  {
    id: 'glazed-glass-body',
    kind: 'body',
    name: 'Glazed Glass Body',
    hanzi: '琉璃之体',
    rarity: 'pristine',
    text: 'Flesh like the uncracked glass of the heavens: clear, hard, and nothing foul stays in it.',
    effects: [
      { stat: 'bodyGain', value: 0.25 },
      { stat: 'hp', value: 0.3 },
      { stat: 'physicalResist', value: 0.15 },
      { stat: 'poisonResist', value: 0.5 },
      { stat: 'regeneration', value: 0.2 },
    ],
  },

  // ------------------------------------------------------------ soul
  {
    id: 'scarred-soul',
    kind: 'soul',
    name: 'Scarred Soul',
    hanzi: '残魂',
    rarity: 'gray',
    text: 'Something tore your soul in a past life, and the seam still pulls.',
    effects: [{ stat: 'soulDefense', value: -0.1 }],
  },
  {
    id: 'clouded-mind',
    kind: 'soul',
    name: 'Clouded Mind',
    hanzi: '浊念',
    rarity: 'gray',
    text: 'Thoughts come slowly and leave quickly.',
    effects: [{ stat: 'insightGain', value: -0.1 }],
  },
  {
    id: 'plain-mind',
    kind: 'soul',
    name: 'Plain Mind',
    hanzi: '常心',
    rarity: 'white',
    text: 'Nothing remarkable, and nothing in the way.',
    effects: [{ stat: 'perception', value: 0.03 }],
  },
  {
    id: 'daydreamer',
    kind: 'soul',
    name: 'Daydreamer',
    hanzi: '神游',
    rarity: 'white',
    text: 'Your mind wanders, and sometimes it brings something back.',
    effects: [{ stat: 'insightGain', value: 0.03 }],
  },
  {
    id: 'keen-senses',
    kind: 'soul',
    name: 'Keen Senses',
    hanzi: '灵觉',
    rarity: 'green',
    text: 'You hear the beast before the dogs do.',
    effects: [{ stat: 'perception', value: 0.08 }],
  },
  {
    id: 'quiet-heart',
    kind: 'soul',
    name: 'Quiet Heart',
    hanzi: '静心',
    rarity: 'green',
    text: 'You can sit still while the wall burns.',
    effects: [{ stat: 'soulGain', value: 0.08 }],
  },
  {
    id: 'innate-divine-sense',
    kind: 'soul',
    name: 'Innate Divine Sense',
    hanzi: '天生神识',
    rarity: 'blue',
    text: 'You felt the shape of the room with your eyes shut before you could walk.',
    effects: [
      { stat: 'divineSense', value: 0.15 },
      { stat: 'soulGain', value: 0.05 },
    ],
  },
  {
    id: 'steady-hands',
    kind: 'soul',
    name: 'Steady Hands',
    hanzi: '稳手',
    rarity: 'blue',
    text: 'You can thread a needle in a cart on a karst road.',
    effects: [{ stat: 'craftPrecision', value: 0.1 }],
  },
  {
    id: 'twin-soul',
    kind: 'soul',
    name: 'Twin Soul',
    hanzi: '双魂',
    rarity: 'purple',
    text: 'Two minds share the one skull, and both pay attention.',
    effects: [
      { stat: 'splitAttention', value: 1 },
      { stat: 'soulGain', value: 0.1 },
    ],
  },
  {
    id: 'unbreakable-dao-heart',
    kind: 'soul',
    name: 'Unbreakable Dao Heart',
    hanzi: '道心如铁',
    rarity: 'purple',
    text: 'Heart demons and illusions lose their grip, and your breakthroughs edge up a grade.',
    effects: [
      { stat: 'soulDefense', value: 0.2 },
      { stat: 'gradeMargin', value: 0.25 },
    ],
  },
  {
    id: 'formation-eyes',
    kind: 'soul',
    name: 'Formation Eyes',
    hanzi: '阵眼之瞳',
    rarity: 'gold',
    text: 'You see the eye of any array at your soul tier, and the Formation Dao comes easily.',
    effects: [
      { stat: 'arraySight', value: 1 },
      { stat: 'formationInsight', value: 0.25 },
    ],
  },
  {
    id: 'sword-heart',
    kind: 'soul',
    name: 'Sword Heart',
    hanzi: '剑心',
    rarity: 'gold',
    text: 'Sword techniques master faster in your hands, and sword intent cannot shake you.',
    effects: [
      { stat: 'swordPractice', value: 0.3 },
      { stat: 'soulDefense', value: 0.1 },
    ],
  },
  {
    id: 'ten-thousand-mirrors',
    kind: 'soul',
    name: 'Mind of Ten Thousand Mirrors',
    hanzi: '万镜心',
    rarity: 'red',
    text: 'Every thought reflects every other; you understand things twice over.',
    effects: [
      { stat: 'insightGain', value: 0.25 },
      { stat: 'soulDefense', value: 0.25 },
    ],
  },
  {
    id: 'dao-seeing-eyes',
    kind: 'soul',
    name: 'Dao-Seeing Eyes',
    hanzi: '观道之眼',
    rarity: 'pristine',
    text: 'You see the pattern under things the way others see color. Nothing hides from you, and little escapes your understanding.',
    effects: [
      { stat: 'insightGain', value: 0.35 },
      { stat: 'soulGain', value: 0.2 },
      { stat: 'perception', value: 0.3 },
      { stat: 'soulDefense', value: 0.2 },
      { stat: 'aptitude', value: 1 },
    ],
  },

  // ------------------------------------------------------------ fate
  {
    id: 'calamity-star',
    kind: 'fate',
    name: 'Calamity Star',
    hanzi: '灾星',
    rarity: 'gray',
    text: 'Born the night the beasts broke the wall; trouble finds you.',
    effects: [{ stat: 'encounterLuck', value: -0.15 }],
  },
  {
    id: 'karmic-debt',
    kind: 'fate',
    name: 'Karmic Debt',
    hanzi: '业债',
    rarity: 'gray',
    text: 'Someone in a past life owes nothing more, because you paid it all; heaven took some years.',
    effects: [{ stat: 'lifespan', value: -5 }],
  },
  {
    id: 'ordinary-fate',
    kind: 'fate',
    name: 'Ordinary Fate',
    hanzi: '寻常命',
    rarity: 'white',
    text: 'Heaven has not noticed you yet.',
    effects: [],
    weight: 2,
  },
  {
    id: 'good-star',
    kind: 'fate',
    name: 'Born Under a Good Star',
    hanzi: '吉星',
    rarity: 'green',
    text: 'Small luck, often.',
    effects: [{ stat: 'encounterLuck', value: 0.1 }],
  },
  {
    id: 'late-bloomer',
    kind: 'fate',
    name: 'Late Bloomer',
    hanzi: '大器晚成',
    rarity: 'green',
    text: 'Nothing comes early to you. It comes.',
    effects: [{ stat: 'aptitude', value: 2 }],
    sleeps: {
      realm: 'foundation-establishment',
      insight: 50,
      text: 'At Foundation, something long asleep in {name} stirs: the late bloomer blooms.',
    },
  },
  {
    id: 'heavens-favored',
    kind: 'fate',
    name: "Heaven's Favored",
    hanzi: '天眷',
    rarity: 'blue',
    text: 'Heaven glances your way now and then, kindly.',
    effects: [
      { stat: 'encounterLuck', value: 0.15 },
      { stat: 'minorOdds', value: 0.02 },
    ],
  },
  {
    id: 'long-lived-line',
    kind: 'fate',
    name: 'Long-Lived Line',
    hanzi: '长寿',
    rarity: 'blue',
    text: 'Your grandmother buried three husbands and a tiger.',
    effects: [{ stat: 'lifespan', value: 10 }],
  },
  {
    id: 'heavens-jealousy',
    kind: 'fate',
    name: "Heaven's Jealousy",
    hanzi: '天妒',
    rarity: 'purple',
    text: 'Heaven resents you: tribulations strike harder, and your breakthroughs run higher.',
    effects: [
      { stat: 'tribulation', value: 0.3 },
      { stat: 'gradeMargin', value: 0.5 },
    ],
  },
  {
    id: 'seven-lives-luck',
    kind: 'fate',
    name: "Seven Lives' Luck",
    hanzi: '七世福',
    rarity: 'purple',
    text: 'Seven past lives of good deeds came due at once.',
    effects: [
      { stat: 'encounterLuck', value: 0.2 },
      { stat: 'setbackTime', value: -0.15 },
    ],
  },
  {
    id: 'child-of-fortune',
    kind: 'fate',
    name: 'Child of Fortune',
    hanzi: '气运之子',
    rarity: 'gold',
    text: 'Fortune up, and encounters lean lucky.',
    effects: [
      { stat: 'fortune', value: 2 },
      { stat: 'encounterLuck', value: 0.3 },
    ],
  },
  {
    id: 'old-soul',
    kind: 'fate',
    name: 'Old Soul',
    hanzi: '转世之魂',
    rarity: 'red',
    text: 'Something in you is older than you are. It sleeps until Foundation.',
    effects: [{ stat: 'insightGain', value: 0.2 }],
    sleeps: {
      realm: 'foundation-establishment',
      insight: 500,
      text: 'At Foundation, a past life wakes in {name}, and remembers a great deal.',
    },
  },
  {
    id: 'child-of-the-severed-heaven',
    kind: 'fate',
    name: 'Child of the Severed Heaven',
    hanzi: '断天之子',
    rarity: 'pristine',
    text: 'The cut heavens have a stake in you. Luck bends your way, tribulations go easier, and the world keeps putting things in your path.',
    effects: [
      { stat: 'fortune', value: 3 },
      { stat: 'encounterLuck', value: 0.5 },
      { stat: 'majorOdds', value: 0.05 },
      { stat: 'tribulation', value: -0.2 },
    ],
  },
  {
    id: 'unsevered-thread',
    kind: 'fate',
    name: 'Unsevered Thread',
    hanzi: '不断之缘',
    rarity: 'pristine',
    text: 'One thread from before the cut still runs through you. It sleeps until Core Formation, then pulls.',
    effects: [{ stat: 'insightGain', value: 0.15 }],
    sleeps: {
      realm: 'core-formation',
      insight: 2000,
      text: 'At Core Formation the thread in {name} draws taut, and something on the far side of the cut answers.',
    },
  },
];

const byId = new Map(TALENTS.map((t) => [t.id, t]));

export function talent(id: string): Talent {
  const t = byId.get(id);
  if (!t) throw new RangeError(`Unknown talent ${id}`);
  return t;
}

export function hasTalent(id: string): boolean {
  return byId.has(id);
}

/** Every change a talent makes: its kind's attribute by its rarity, then its own effects. */
export function talentEffects(t: Talent): Effect[] {
  const mod = GRADE_MODIFIER[t.rarity];
  const attr: Effect[] = mod ? [{ stat: KIND_ATTRIBUTE[t.kind], value: mod }] : [];
  return [...attr, ...t.effects];
}

/** The talents of a kind and rarity, to pick among once the rarity is rolled. */
export function talentsOf(kind: TalentKind, rarity: RarityId): Talent[] {
  return TALENTS.filter((t) => t.kind === kind && t.rarity === rarity);
}
