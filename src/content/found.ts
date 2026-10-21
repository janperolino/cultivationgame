// Experimentation and generated recipes (design § Professions, Experimentation; The effect table
// and experimentation; K7). Throwing things in reads what they carry most: the property the craft's
// row makes (The effect table) and the element. When nothing written lies close, the furnace makes
// its own: a generated recipe whose effect, element, tier and lowest rarity are its id, so the
// thing it makes is built from the id alone (`foundItem`, read by content/items.ts) and only the
// recipe's inputs are kept in the save. Each is the common written one of its effect at its tier,
// named once from a pattern (element word, effect word, kind), and never past blue: gold, red and
// pristine are written by hand. Every number is K7's talk's; the sims tune them.
import type { FamilyId } from './crafts.ts';
import type { Element } from './elements.ts';
import type { ConsumeEffect, Item, ItemUses } from './items.ts';
import type { RarityId } from './rarity.ts';
import type { DamageType } from './techniques.ts';

/** The crafts that experiment, with their benches: Formations and Spirit Farming wait on theirs. */
export const EXPERIMENT_CRAFTS = ['alchemy', 'refining', 'talismans'] as const;
export type ExperimentCraft = (typeof EXPERIMENT_CRAFTS)[number];

/**
 * A throw (K7's talk): up to four things, ten of each at most, in up to four sets at once. A
 * written recipe lies close when it shares half or more of the things on both sides (the sheet not
 * counted), and a miss that close is a near one. The odds are the design's (Experimentation, The
 * odds per attempt): by your craft Dao's tiers held against the recipe's tier, times mastery, +20%
 * a realm you sit above it and +10% a tier of its element's Dao; a miss adds a point on that set,
 * never past 95%; n sets are √n tries in one batch's hours.
 */
export const EXPERIMENT = {
  kinds: 4,
  most: 10,
  sets: 4,
  close: 0.5,
  near: 0.75,
  odds: { farBelow: 0.25, below: 0.15, at: 0.06, above: 0.015 },
  mastery: [1, 1.25, 1.5, 1.75, 2],
  realm: 0.2,
  elementTier: 0.1,
  pity: 0.01,
  cap: 0.95,
} as const;

/** What a talisman always takes (K5's recipes): the sheet, five papers and the cinnabar ink. */
export const TALISMAN_SHEET: readonly { thing: string; count: number }[] = [
  { thing: 'yellow-talisman-paper', count: 5 },
  { thing: 'cinnabar-ore', count: 1 },
];
/** How many things go into a talisman's ink beside the sheet. */
export const INK_KINDS = 2;

/** What a generated recipe makes: its effect. */
export const FOUND_EFFECTS = [
  'qi',
  'body',
  'soul',
  'replenish',
  'mend',
  'cleanse',
  'searing',
  'freezing',
  'piercing',
  'ward',
  'bind',
  'flee',
  'stride',
  'veil',
  'blade',
  'armor',
  'pouch',
  'rope',
] as const;
export type FoundEffect = (typeof FOUND_EFFECTS)[number];

/**
 * The effect table's rows as far as their systems are built (K7's talk): the property a throw
 * carries most, among those its craft makes, picks the effect. Swift on a talisman goes through
 * the ground when the throw is of earth or water (an escape), else it strides. The rest of the
 * table (lightness, ghosts, messages, decoys, blinks, flying swords, bells, needles, runes) waits
 * for its system, and toxic is no pill of its own: it makes a pill stronger and more poisonous.
 */
export const FOUND_MAKES: Record<ExperimentCraft, Partial<Record<string, FoundEffect>>> = {
  alchemy: {
    nourishing: 'qi',
    tempering: 'body',
    'soul-calming': 'soul',
    restoring: 'replenish',
    mending: 'mend',
    purging: 'cleanse',
  },
  talismans: {
    burning: 'searing',
    chilling: 'freezing',
    sharp: 'piercing',
    hard: 'ward',
    binding: 'bind',
    swift: 'stride',
    concealing: 'veil',
  },
  refining: { sharp: 'blade', hard: 'armor', spatial: 'pouch', binding: 'rope' },
};
export const FLEE_THROUGH: readonly Element[] = ['earth', 'water'];

/** The family each effect's mastery is kept by (content/crafts.ts `FAMILIES`). */
export const FOUND_FAMILY: Record<FoundEffect, FamilyId> = {
  qi: 'qi-pills',
  body: 'tempering-pills',
  soul: 'soul-pills',
  replenish: 'healing-pills',
  mend: 'healing-pills',
  cleanse: 'healing-pills',
  searing: 'strikes',
  freezing: 'strikes',
  piercing: 'strikes',
  ward: 'wards',
  bind: 'wards',
  flee: 'passage',
  stride: 'passage',
  veil: 'passage',
  blade: 'blades',
  armor: 'armor',
  pouch: 'vessels',
  rope: 'vessels',
};

/** Each effect's craft: an escape is a talisman's, as striding is. */
export function foundCraft(e: FoundEffect): ExperimentCraft {
  if (e === 'flee') return 'talismans';
  return EXPERIMENT_CRAFTS.find((k) => Object.values(FOUND_MAKES[k]).includes(e))!;
}

/**
 * The sizes (K7's talk): the common written one of each effect at its tier, at its floor, before
 * rarity's band. Fuel 3 days as the Bone-Meal Pill, 30% back, a strike of 44 at one foe, half a qi
 * shield, a breath's hold, twice the pace a day, a pouch of 20 squares (×3 a tier, as the ring).
 * What is special stays written: more foes, longer holds, extra days, gold and up.
 */
export const FOUND_SIZE = {
  days: 3,
  share: 0.3,
  detox: 30,
  dose: 10,
  power: 44,
  ward: 0.5,
  turns: 1,
  pace: 2,
  paceDays: 1,
  squares: 20,
  squaresTier: 3,
} as const;

/** Toxic in a pill (K7's talk): its effect ×(1 + 2 × the toxic share) and its dose +50 × the share. */
export const TOXIC = { potency: 2, dose: 50 } as const;

/** A strike of no element takes its property's damage. */
const STRIKE_DAMAGE: Record<string, DamageType> = {
  searing: 'fire',
  freezing: 'ice',
  piercing: 'physical',
};

/**
 * The lowest rarity a generated recipe comes at, rolled once (K7's talk): the shared table with
 * gray read as white and purple up as blue. A furnace above white, and inputs all above white,
 * each move ten points of it a step up. It makes up to blue.
 */
export const FOUND_FLOOR: readonly { rarity: RarityId; chance: number }[] = [
  { rarity: 'white', chance: 0.5 },
  { rarity: 'green', chance: 0.35 },
  { rarity: 'blue', chance: 0.15 },
];
export const FLOOR_SHIFT = 0.1;
export const FOUND_UP_TO: RarityId = 'blue';

/** The floor a uniform roll lands on, shifted `steps` up. */
export function rollFloor(roll: number, steps: number): RarityId {
  const shift = FLOOR_SHIFT * steps;
  const white = Math.max(0, FOUND_FLOOR[0]!.chance - shift);
  const blue = Math.min(1, FOUND_FLOOR[2]!.chance + shift);
  if (roll < white) return 'white';
  if (roll < 1 - blue) return 'green';
  return 'blue';
}

// ---------------------------------------------------------------- names

interface Word {
  en: string;
  hz: string;
  py: string;
}
const w = (en: string, hz: string, py: string): Word => ({ en, hz, py });

/** Two words an element, the recipe always taking the same one of the two. */
export const ELEMENT_WORDS: Record<Element | 'none', readonly [Word, Word]> = {
  fire: [w('Ember', '烬', 'jin'), w('Blaze', '焰', 'yan')],
  water: [w('Tide', '潮', 'chao'), w('Dew', '露', 'lu')],
  wood: [w('Verdant', '青', 'qing'), w('Spring', '春', 'chun')],
  metal: [w('Iron', '铁', 'tie'), w('Keen', '锐', 'rui')],
  earth: [w('Stone', '石', 'shi'), w('Loam', '壤', 'rang')],
  wind: [w('Gale', '风', 'feng'), w('Cloud', '云', 'yun')],
  lightning: [w('Thunder', '雷', 'lei'), w('Storm', '霆', 'ting')],
  ice: [w('Frost', '霜', 'shuang'), w('Rime', '凇', 'song')],
  none: [w('Plain', '素', 'su'), w('Primal', '元', 'yuan')],
};

/** Each effect's word and the kind of thing it makes. */
export const EFFECT_WORDS: Record<FoundEffect, { word: Word; kind: Word }> = {
  qi: { word: w('Nourishing', '养气', 'yangqi'), kind: w('Pill', '丹', 'Dan') },
  body: { word: w('Tempering', '锻体', 'duanti'), kind: w('Pill', '丹', 'Dan') },
  soul: { word: w('Soul-Calming', '宁神', 'ningshen'), kind: w('Pill', '丹', 'Dan') },
  replenish: { word: w('Replenishing', '回元', 'huiyuan'), kind: w('Pill', '丹', 'Dan') },
  mend: { word: w('Mending', '续骨', 'xugu'), kind: w('Pill', '丹', 'Dan') },
  cleanse: { word: w('Cleansing', '清毒', 'qingdu'), kind: w('Pill', '丹', 'Dan') },
  searing: { word: w('Searing', '灼', 'zhuo'), kind: w('Talisman', '符', 'Fu') },
  freezing: { word: w('Freezing', '冻', 'dong'), kind: w('Talisman', '符', 'Fu') },
  piercing: { word: w('Piercing', '穿', 'chuan'), kind: w('Talisman', '符', 'Fu') },
  ward: { word: w('Warding', '护', 'hu'), kind: w('Talisman', '符', 'Fu') },
  bind: { word: w('Binding', '缚', 'fu'), kind: w('Talisman', '符', 'Fu') },
  flee: { word: w('Fleeing', '遁', 'dun'), kind: w('Talisman', '符', 'Fu') },
  stride: { word: w('Striding', '行', 'xing'), kind: w('Talisman', '符', 'Fu') },
  veil: { word: w('Veiling', '隐', 'yin'), kind: w('Talisman', '符', 'Fu') },
  blade: { word: w('Edged', '锋', 'feng'), kind: w('Sword', '剑', 'Jian') },
  armor: { word: w('Warded', '护', 'hu'), kind: w('Coat', '甲', 'Jia') },
  pouch: { word: w('Folding', '纳', 'na'), kind: w('Pouch', '袋', 'Dai') },
  rope: { word: w('Binding', '缚', 'fu'), kind: w('Rope', '绳', 'Sheng') },
};
/** A pill with toxic in it is a fierce one. */
export const FIERCE = w('Fierce', '烈', 'lie');

/** A small string hash, so a recipe always takes the same of its element's two words. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// ---------------------------------------------------------------- the id

/** What a generated recipe is: the fields its id carries. */
export interface FoundKey {
  effect: FoundEffect;
  element: Element | null;
  tier: number;
  /** Its lowest rarity, rolled once. */
  floor: RarityId;
  /** Tenths of the throw that were toxic, for a pill. */
  toxic: number;
}

const PREFIX = 'found.';

/** Whether an id names a generated recipe or its thing. */
export function isFound(id: string): boolean {
  return id.startsWith(PREFIX);
}

/**
 * A generated thing's id: "found.body.wood.t1.white", "found.qi.none.t1.green.x3". Two throws with
 * the same effect, element, tier and toxic share are one recipe (its signature, `foundSignature`).
 */
export function foundId(k: FoundKey): string {
  const parts = [k.effect, k.element ?? 'none', `t${k.tier}`, k.floor];
  if (k.toxic > 0) parts.push(`x${k.toxic}`);
  return PREFIX + parts.join('.');
}

/** What one generated recipe is apart from its rolled floor: one a cultivator finds once. */
export function foundSignature(k: Omit<FoundKey, 'floor'>): string {
  return [k.effect, k.element ?? 'none', `t${k.tier}`, `x${k.toxic}`].join('.');
}

const RARITIES_FOUND: readonly RarityId[] = ['white', 'green', 'blue'];
const ELEMENT_KEYS = Object.keys(ELEMENT_WORDS);

/** The fields a generated id carries, or null when it is no generated id. */
export function parseFound(id: string): FoundKey | null {
  if (!isFound(id)) return null;
  const [effect, element, tier, floor, x, ...rest] = id.slice(PREFIX.length).split('.');
  if (rest.length > 0) return null;
  if (!FOUND_EFFECTS.includes(effect as FoundEffect)) return null;
  if (!element || !ELEMENT_KEYS.includes(element)) return null;
  if (!tier || !/^t[1-9]$/.test(tier)) return null;
  if (!RARITIES_FOUND.includes(floor as RarityId)) return null;
  if (x !== undefined && !/^x([1-9]|10)$/.test(x)) return null;
  return {
    effect: effect as FoundEffect,
    element: element === 'none' ? null : (element as Element),
    tier: Number(tier.slice(1)),
    floor: floor as RarityId,
    toxic: x ? Number(x.slice(1)) : 0,
  };
}

/** A generated recipe's name, pinyin and hanzi: element word, effect word, kind. */
export function foundName(k: Omit<FoundKey, 'floor'>): {
  name: string;
  pinyin: string;
  hanzi: string;
} {
  const pair = ELEMENT_WORDS[k.element ?? 'none'];
  const el = pair[hash(foundSignature(k)) % 2]!;
  const { word, kind } = EFFECT_WORDS[k.effect];
  const fierce = k.toxic > 0;
  const py = `${fierce ? FIERCE.py : ''}${el.py}${word.py}`;
  return {
    name: `${fierce ? `${FIERCE.en} ` : ''}${el.en}-${word.en} ${kind.en}`,
    pinyin: `${py[0]!.toUpperCase()}${py.slice(1)} ${kind.py}`,
    hanzi: `${fierce ? FIERCE.hz : ''}${el.hz}${word.hz}${kind.hz}`,
  };
}

/** What a generated thing does, by its effect, sized by the common written one. */
function foundUses(k: FoundKey): { uses: ItemUses; kind: Item['kind']; glyph?: string } {
  const toxic = k.toxic / 10;
  const potent = 1 + TOXIC.potency * toxic;
  const dose = Math.round(FOUND_SIZE.dose + TOXIC.dose * toxic);
  const pill = (e: ConsumeEffect) => ({
    uses: { consume: { effects: [e], dose } },
    kind: 'pill' as const,
  });
  const days = Math.round(FOUND_SIZE.days * potent);
  const share = Math.round(FOUND_SIZE.share * potent * 100) / 100;
  switch (k.effect) {
    case 'qi':
      return pill({ effect: 'fuel', ladder: 'qi', days });
    case 'body':
      return pill({ effect: 'fuel', ladder: 'body', days });
    case 'soul':
      return pill({ effect: 'fuel', ladder: 'soul', days });
    case 'replenish':
      return pill({ effect: 'restore', what: 'qi', share });
    case 'mend':
      return pill({ effect: 'restore', what: 'hp', share });
    case 'cleanse':
      return pill({ effect: 'detox', amount: Math.round(FOUND_SIZE.detox * potent) });
    case 'searing':
    case 'freezing':
    case 'piercing':
      return {
        uses: {
          fight: {
            form: 'projectile',
            damage: k.element ?? STRIKE_DAMAGE[k.effect]!,
            power: FOUND_SIZE.power,
          },
        },
        kind: 'talisman',
      };
    case 'ward':
      return { uses: { ward: { share: FOUND_SIZE.ward } }, kind: 'talisman' };
    case 'bind':
      return { uses: { fix: { turns: FOUND_SIZE.turns } }, kind: 'talisman' };
    case 'flee':
      return { uses: { escape: { through: k.element ?? 'earth' } }, kind: 'talisman' };
    case 'stride':
      return {
        uses: { swift: { pace: FOUND_SIZE.pace, days: FOUND_SIZE.paceDays } },
        kind: 'talisman',
      };
    case 'veil':
      return { uses: { hide: { tier: k.tier } }, kind: 'talisman' };
    case 'blade':
      return { uses: { equip: { slot: 'weapon', weapon: 'sword' } }, kind: 'gear' };
    case 'armor':
      return {
        uses: { equip: { slot: 'armor', material: k.element ?? 'physical' } },
        kind: 'gear',
      };
    case 'pouch':
      return {
        uses: {
          equip: {
            slot: 'pouch',
            squares: FOUND_SIZE.squares * FOUND_SIZE.squaresTier ** (k.tier - 1),
          },
        },
        kind: 'gear',
        glyph: '袋',
      };
    case 'rope':
      return { uses: { fix: { turns: FOUND_SIZE.turns, keep: true } }, kind: 'treasure' };
  }
}

/** The thing a generated recipe makes, built from its id alone; null for any other id. */
export function foundItem(id: string): Item | null {
  const k = parseFound(id);
  if (!k) return null;
  const { uses, kind, glyph } = foundUses(k);
  return {
    id,
    ...foundName(k),
    tier: k.tier,
    rarity: k.floor,
    ...(k.floor !== FOUND_UP_TO ? { upTo: FOUND_UP_TO } : {}),
    ...(k.element ? { element: k.element } : {}),
    kind,
    ...(glyph ? { glyph } : {}),
    uses,
    source: 'your own experiments at the bench',
    text: 'A recipe nobody wrote: you found it by throwing things in until something took.',
  };
}
