// Items (design § Items and gear): one record for everything you can carry, and what an item can
// do is a list of uses rather than a kind. P2.1 brought offer, consume and fight; P2.3 adds equip,
// the Bag's kinds, bulk and stacks, properties by rarity, and the rest of the uses table as fields
// (contemplate, ingredient, read, carry, key, inscribe), which their systems read as they arrive.
// A new item is an entry here, not new code. **Awaiting Jan's review:** the offerings and pills
// (P2.1) and the gear (P2.3) below are drafts.
import type { WeaponKind } from './combat.ts';
import type { LadderId } from './cultivation.ts';
import type { Element } from './elements.ts';
import type { RarityId } from './rarity.ts';
import type { Effect } from './stats.ts';
import type { DamageType, Form } from './techniques.ts';

/** What the Bag draws and stacks it as (design § Items and gear, the item record). */
export const ITEM_KINDS = [
  'gear',
  'pill',
  'talisman',
  'herb',
  'material',
  'beast-part',
  'manual',
  'treasure',
  'vessel',
  'mount',
  'beast',
] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

/**
 * How many share a square, by kind (design § UI, the Bag): pills, talismans, herbs and materials
 * stack to 99, ores and bulk materials to 20 (an item sets its own `stack`), and gear takes one.
 */
export const STACK_BY_KIND: Record<ItemKind, number> = {
  gear: 1,
  pill: 99,
  talisman: 99,
  herb: 99,
  material: 99,
  'beast-part': 20,
  manual: 1,
  treasure: 1,
  vessel: 1,
  mount: 1,
  beast: 1,
};

/** The glyph a square shows for a kind, until design-time art arrives. */
export const KIND_GLYPH: Record<ItemKind, string> = {
  gear: '器',
  pill: '丹',
  talisman: '符',
  herb: '草',
  material: '材',
  'beast-part': '骨',
  manual: '书',
  treasure: '宝',
  vessel: '鼎',
  mount: '骑',
  beast: '兽',
};

/**
 * What an offering does at a major attempt (design § Cultivation, Offerings): steadying adds
 * odds, surging adds grade margin and costs odds, purifying halves a failure's injury and clears
 * toxicity, guarding keeps the bar on failure. A ladder tag doubles the item on its own ladder.
 */
export const OFFER_TAGS = ['steadying', 'surging', 'purifying', 'guarding'] as const;
export type OfferTag = (typeof OFFER_TAGS)[number];

export interface OfferUse {
  tags: readonly OfferTag[];
  /** The ladder it doubles on: Tempered Marrow for the body, a Soul-Settling Pearl for the soul. */
  ladder?: LadderId;
}

/** What eating or drinking it does. A pill's dose adds to the toxicity meter. */
export type ConsumeEffect =
  /** Fuel for a ladder's bar: this many days of its seclusion at the item's tier. */
  | { effect: 'fuel'; ladder: LadderId; days: number }
  /** Cuts the toxicity meter by this much. */
  | { effect: 'detox'; amount: number }
  /** Mid-fight: restores this share of the qi pool or HP. */
  | { effect: 'restore'; what: 'qi' | 'hp'; share: number };

export interface ConsumeUse {
  effects: readonly ConsumeEffect[];
  /** The dose at your own tier for a white item; 10 for a pill. Absent for clean food and herbs. */
  dose?: number;
}

/** A one-shot action in a fight, spent on use; it strikes at its own tier. */
export interface FightUse {
  form: Form;
  damage: DamageType;
  power: number;
}

/** Where a worn thing goes: the four gear squares, or a treasure slot the trees open. */
export const EQUIP_SLOTS = ['weapon', 'armor', 'ring', 'pouch', 'treasure'] as const;
export type EquipSlot = (typeof EQUIP_SLOTS)[number];

/**
 * Worn (design § Items and gear): a weapon of a kind sizes Attack, armor sizes Defense and its
 * material turns a quarter of one damage type, a pouch or ring carries squares, a treasure is its
 * properties alone. A ring opens to divine sense, so it needs a soul or a qi realm at its tier.
 */
export interface EquipUse {
  slot: EquipSlot;
  weapon?: WeaponKind;
  material?: DamageType;
  /** Squares a pouch or ring adds. */
  squares?: number;
}

/** A contemplation source (content/contemplation.ts) the item carries. */
export interface ContemplateUse {
  source: string;
}

/** Recipe tags for the furnace, forge and brush (M4), and an age for herbs. */
export interface IngredientUse {
  tags: readonly string[];
  /** Years, for herbs. */
  age?: number;
}

/** A manual's nodes (content/manuals.ts). */
export interface ReadUse {
  manual: string;
}

/** Squares it adds while it is with you: a cart, a mount. */
export interface CarryUse {
  squares: number;
}

/** What it opens: a place, a card or a lock. */
export interface KeyUse {
  opens: string;
}

/** Formation slots for M4's enchantments. */
export interface InscribeUse {
  slots: number;
}

export interface ItemUses {
  equip?: EquipUse;
  consume?: ConsumeUse;
  fight?: FightUse;
  contemplate?: ContemplateUse;
  ingredient?: IngredientUse;
  read?: ReadUse;
  offer?: OfferUse;
  carry?: CarryUse;
  key?: KeyUse;
  inscribe?: InscribeUse;
}

/**
 * A special property its rarity grants (design § Tier, rarity and pedigree): none at white, a
 * minor one at green, one at blue, two at purple, two and a unique at gold, three and a named
 * unique at red. An artifact from blue up unlocks them one a bond level, in this order.
 */
export interface ItemProperty {
  name: string;
  effects: readonly Effect[];
  /** The gold or red unique; at red it is named. */
  unique?: boolean;
}

export interface Item {
  id: string;
  name: string;
  pinyin: string;
  hanzi: string;
  /** The realm it belongs to: 1 at Qi Condensation. */
  tier: number;
  rarity: RarityId;
  /** Its element, if it has one; an offering of your root's element adds a step of odds. */
  element?: Element;
  /** The Bag's glyph and stack size; generated consumables leave it to their uses. */
  kind?: ItemKind;
  /** Squares it takes; 1 unless bulky. */
  bulk?: number;
  /** How many share a square, when not the kind's. */
  stack?: number;
  /** The glyph its square shows, when not the kind's or the weapon's. */
  glyph?: string;
  properties?: readonly ItemProperty[];
  uses: ItemUses;
  source: string;
  text: string;
}

export const ITEMS: readonly Item[] = [
  // ------------------------------------------------------------ gate pills and offerings
  {
    id: 'foundation-pill',
    name: 'Foundation Pill',
    pinyin: 'Zhuji Dan',
    hanzi: '筑基丹',
    tier: 1,
    rarity: 'white',
    kind: 'pill',
    uses: { offer: { tags: [] } },
    source: 'sect treasuries and the black market',
    text: 'The gate pill for Foundation (realms.ts names each gate): every qi attempt lays one down.',
  },
  {
    id: 'core-forming-pill',
    name: 'Core-Forming Pill',
    pinyin: 'Jiedan Dan',
    hanzi: '结丹丹',
    tier: 2,
    rarity: 'white',
    kind: 'pill',
    uses: { offer: { tags: [] } },
    source: 'great sects and old alchemists',
    text: 'The gate pill for Core Formation.',
  },
  {
    id: 'calm-heart-grass',
    name: 'Calm-Heart Grass',
    pinyin: 'Anxin Cao',
    hanzi: '安心草',
    tier: 1,
    rarity: 'white',
    element: 'wood',
    kind: 'herb',
    uses: { offer: { tags: ['steadying'] }, ingredient: { tags: ['calming', 'wood'], age: 3 } },
    source: 'Border Wilds herb stalls',
    text: 'A pale grass that grows in the shade of old graves. Burned at an attempt, it slows the heart.',
  },
  {
    id: 'storm-peach-stone',
    name: 'Storm Peach Stone',
    pinyin: 'Leitao He',
    hanzi: '雷桃核',
    tier: 1,
    rarity: 'green',
    element: 'lightning',
    kind: 'material',
    uses: { offer: { tags: ['surging'] }, ingredient: { tags: ['lightning', 'surging'] } },
    source: 'peach trees the lightning struck',
    text: 'A pit still crackling from the strike. It drives an attempt harder and less safely.',
  },
  {
    id: 'clear-spring-lotus',
    name: 'Clear Spring Lotus',
    pinyin: 'Qingquan Lian',
    hanzi: '清泉莲',
    tier: 1,
    rarity: 'blue',
    element: 'water',
    kind: 'herb',
    uses: { offer: { tags: ['purifying'] }, ingredient: { tags: ['cleansing', 'water'], age: 10 } },
    source: 'spring pools in the hills',
    text: 'Laid at an attempt, it washes the channels clean and softens a fall.',
  },
  {
    id: 'root-binding-jade',
    name: 'Root-Binding Jade',
    pinyin: 'Guyuan Yu',
    hanzi: '固元玉',
    tier: 1,
    rarity: 'green',
    element: 'earth',
    kind: 'material',
    uses: { offer: { tags: ['guarding'] } },
    source: 'jade cutters at the river markets',
    text: 'A plain jade disc that holds what you have gathered if the attempt breaks.',
  },
  {
    id: 'thousand-year-ginseng',
    name: 'Thousand-Year Spirit Ginseng',
    pinyin: 'Qiannian Lingshen',
    hanzi: '千年灵参',
    tier: 1,
    rarity: 'gold',
    element: 'wood',
    kind: 'herb',
    uses: {
      offer: { tags: ['steadying'] },
      ingredient: { tags: ['vitality', 'wood'], age: 1000 },
    },
    source: 'a ruin or an inheritance, never a stall',
    text: 'A root shaped like a sleeping child. Laid at an attempt, it lets heaven itself take notice.',
  },
  {
    id: 'tempered-marrow',
    name: 'Tempered Marrow',
    pinyin: 'Cuisui',
    hanzi: '淬髓',
    tier: 2,
    rarity: 'blue',
    kind: 'material',
    uses: { offer: { tags: ['steadying'], ladder: 'body' } },
    source: "refined from a Foundation beast's marrow",
    text: "The body's offering: a beast's strength boiled down to a grey paste.",
  },
  {
    id: 'soul-settling-pearl',
    name: 'Soul-Settling Pearl',
    pinyin: 'Dinghun Zhu',
    hanzi: '定魂珠',
    tier: 2,
    rarity: 'blue',
    kind: 'material',
    uses: { offer: { tags: ['steadying'], ladder: 'soul' } },
    source: 'grown in old river clams of the Border Wilds',
    text: "The soul's offering: a cold pearl that keeps the mind from scattering.",
  },

  // ------------------------------------------------------------ pills and talismans
  {
    id: 'qi-gathering-pill',
    name: 'Qi-Gathering Pill',
    pinyin: 'Juqi Dan',
    hanzi: '聚气丹',
    tier: 1,
    rarity: 'white',
    kind: 'pill',
    uses: { consume: { effects: [{ effect: 'fuel', ladder: 'qi', days: 3 }], dose: 10 } },
    source: 'every herb stall that sells pills',
    text: 'Three days of qi in a pill, and a little poison with it.',
  },
  {
    id: 'qi-restoring-pill',
    name: 'Qi-Restoring Pill',
    pinyin: 'Huiqi Dan',
    hanzi: '回气丹',
    tier: 1,
    rarity: 'white',
    kind: 'pill',
    uses: { consume: { effects: [{ effect: 'restore', what: 'qi', share: 0.3 }], dose: 10 } },
    source: 'every herb stall that sells pills',
    text: 'Swallowed mid-fight, it fills a third of an empty pool.',
  },
  {
    id: 'mending-pill',
    name: 'Mending Pill',
    pinyin: 'Huichun Dan',
    hanzi: '回春丹',
    tier: 1,
    rarity: 'white',
    kind: 'pill',
    uses: { consume: { effects: [{ effect: 'restore', what: 'hp', share: 0.3 }], dose: 10 } },
    source: 'every herb stall that sells pills',
    text: 'Swallowed mid-fight, it closes a third of what was opened.',
  },
  {
    id: 'poison-purging-pill',
    name: 'Poison-Purging Pill',
    pinyin: 'Qudu Dan',
    hanzi: '祛毒丹',
    tier: 1,
    rarity: 'green',
    kind: 'pill',
    uses: { consume: { effects: [{ effect: 'detox', amount: 30 }] } },
    source: 'herb stalls and sect infirmaries',
    text: 'Bitter enough to make the eyes water; it draws the residue of other pills out.',
  },
  {
    id: 'ember-talisman',
    name: 'Ember Talisman',
    pinyin: 'Huo Fu',
    hanzi: '火符',
    tier: 1,
    rarity: 'white',
    element: 'fire',
    kind: 'talisman',
    uses: { fight: { form: 'projectile', damage: 'fire', power: 45 } },
    source: 'talisman stalls',
    text: 'A strip of yellow paper that bursts into a fist of flame when thrown.',
  },

  // ------------------------------------------------------------ weapons
  {
    id: 'iron-sword',
    name: 'Iron Sword',
    pinyin: 'Tie Jian',
    hanzi: '铁剑',
    tier: 1,
    rarity: 'white',
    kind: 'gear',
    uses: { equip: { slot: 'weapon', weapon: 'sword' }, inscribe: { slots: 1 } },
    source: 'any smithy in the Border Wilds',
    text: 'Plain iron, honestly forged, the edge a little soft.',
  },
  {
    id: 'green-steel-saber',
    name: 'Green-Steel Saber',
    pinyin: 'Qinggang Dao',
    hanzi: '青钢刀',
    tier: 1,
    rarity: 'green',
    kind: 'gear',
    properties: [{ name: 'Heavy Spine', effects: [{ stat: 'saberPower', value: 0.03 }] }],
    uses: { equip: { slot: 'weapon', weapon: 'saber' }, inscribe: { slots: 1 } },
    source: 'garrison armories along the chain',
    text: 'A broad saber of green-tempered steel with a spine thick enough to break a spear.',
  },
  {
    id: 'ash-wood-spear',
    name: 'Ash-Wood Spear',
    pinyin: 'Bailajiang Qiang',
    hanzi: '白蜡枪',
    tier: 1,
    rarity: 'white',
    kind: 'gear',
    bulk: 2,
    uses: { equip: { slot: 'weapon', weapon: 'spear' }, inscribe: { slots: 1 } },
    source: 'any smithy in the Border Wilds',
    text: 'A long ash shaft that bends before it breaks, with an iron head.',
  },
  {
    id: 'iron-knuckles',
    name: 'Iron Knuckles',
    pinyin: 'Tie Quantao',
    hanzi: '铁拳套',
    tier: 1,
    rarity: 'white',
    kind: 'gear',
    uses: { equip: { slot: 'weapon', weapon: 'fist' }, inscribe: { slots: 1 } },
    source: 'pit fighters in the river markets',
    text: 'Four iron rings joined over the knuckles, worn smooth by somebody else first.',
  },
  {
    id: 'cold-moon-sword',
    name: 'Cold Moon Sword',
    pinyin: 'Hanyue Jian',
    hanzi: '寒月剑',
    tier: 1,
    rarity: 'purple',
    kind: 'gear',
    properties: [
      { name: 'Moonlit Edge', effects: [{ stat: 'swordHit', value: 0.06 }] },
      { name: 'Cold Light', effects: [{ stat: 'swordCrit', value: 0.03 }] },
    ],
    uses: { equip: { slot: 'weapon', weapon: 'sword' }, inscribe: { slots: 1 } },
    source: 'a dead sect elder, or a vault',
    text: 'A pale blade that frosts in the hand at night. It warms to one owner over many fights.',
  },
  {
    id: 'azure-cloud-sword',
    name: 'Azure Cloud Sword',
    pinyin: 'Qingyun Jian',
    hanzi: '青云剑',
    tier: 2,
    rarity: 'blue',
    kind: 'gear',
    properties: [{ name: 'Cloud-Cutting', effects: [{ stat: 'swordPower', value: 0.05 }] }],
    uses: { equip: { slot: 'weapon', weapon: 'sword' }, inscribe: { slots: 1 } },
    source: "a Foundation cultivator's sword",
    text: 'A Foundation blade. In Qi Condensation hands it drinks qi with every stroke and turns sluggish.',
  },

  // ------------------------------------------------------------ armor
  {
    id: 'boar-hide-vest',
    name: 'Boar-Hide Vest',
    pinyin: 'Zhupi Jia',
    hanzi: '猪皮甲',
    tier: 1,
    rarity: 'white',
    kind: 'gear',
    uses: { equip: { slot: 'armor', material: 'physical' }, inscribe: { slots: 1 } },
    source: "a stone-skin boar's hide, boiled and stitched",
    text: 'Stiff, heavy and ugly, and a blade skids off it.',
  },
  {
    id: 'water-silk-robe',
    name: 'Water-Silk Robe',
    pinyin: 'Shuisi Pao',
    hanzi: '水丝袍',
    tier: 1,
    rarity: 'green',
    kind: 'gear',
    properties: [{ name: 'Light Weave', effects: [{ stat: 'evasion', value: 0.02 }] }],
    uses: { equip: { slot: 'armor', material: 'fire' }, inscribe: { slots: 1 } },
    source: 'river-market tailors',
    text: 'Silk spun wet and never quite dry; fire hisses where it touches.',
  },

  // ------------------------------------------------------------ storage
  {
    id: 'storage-pouch',
    name: 'Storage Pouch',
    pinyin: 'Chuwu Dai',
    hanzi: '储物袋',
    tier: 1,
    rarity: 'white',
    kind: 'gear',
    glyph: '袋',
    uses: { equip: { slot: 'pouch', squares: 20 } },
    source: 'any Qi Condensation cultivator worth robbing',
    text: 'Cloth folded on itself: twenty squares in a bag the size of a fist. Anyone can open it.',
  },
  {
    id: 'storage-ring',
    name: 'Storage Ring',
    pinyin: 'Chuwu Jie',
    hanzi: '储物戒',
    tier: 2,
    rarity: 'white',
    kind: 'gear',
    glyph: '戒',
    uses: { equip: { slot: 'ring', squares: 60 } },
    source: "a Foundation cultivator's finger",
    text: 'Sixty squares behind a plain band. It opens to divine sense at Foundation, and not before.',
  },

  // ------------------------------------------------------------ treasures
  {
    id: 'warding-jade',
    name: 'Warding Jade',
    pinyin: 'Hushen Yu',
    hanzi: '护身玉',
    tier: 1,
    rarity: 'green',
    kind: 'treasure',
    glyph: '玉',
    properties: [{ name: 'Warding', effects: [{ stat: 'physicalResist', value: 0.03 }] }],
    uses: { equip: { slot: 'treasure' } },
    source: 'temple stalls',
    text: 'A thumb of green jade on a cord, carved with a ward that mostly works.',
  },
  {
    id: 'fire-bead',
    name: 'Fire Bead',
    pinyin: 'Huo Zhu',
    hanzi: '火珠',
    tier: 1,
    rarity: 'blue',
    element: 'fire',
    kind: 'treasure',
    glyph: '珠',
    properties: [{ name: 'Inner Flame', effects: [{ stat: 'fireDamage', value: 0.06 }] }],
    uses: { equip: { slot: 'treasure' } },
    source: "a fire beast's core, polished",
    text: 'A red bead, warm as a held hand. Fire you throw leans toward it first.',
  },
  {
    id: 'soul-calming-bell',
    name: 'Soul-Calming Bell',
    pinyin: 'Zhenhun Ling',
    hanzi: '镇魂铃',
    tier: 1,
    rarity: 'gold',
    kind: 'treasure',
    glyph: '铃',
    properties: [
      { name: 'Clear Note', effects: [{ stat: 'clearHeart', value: 1 }] },
      { name: 'Ringing Silence', effects: [{ stat: 'intimidate', value: 0.1 }] },
      {
        name: 'The Bell That Was Heard Before Heaven Broke',
        unique: true,
        effects: [{ stat: 'hit', value: 2 }],
      },
    ],
    uses: { equip: { slot: 'treasure' } },
    source: 'an inheritance, never a stall',
    text: 'A bronze bell no bigger than a plum. Its spirit sleeps until it knows your hand.',
  },
];

const byId = new Map(ITEMS.map((i) => [i.id, i]));

export function hasItem(id: string): boolean {
  return byId.has(id);
}

export function item(id: string): Item {
  const i = byId.get(id);
  if (!i) throw new RangeError(`Unknown item ${id}`);
  return i;
}

/** The kind the Bag files it under: its own, or read off its uses. */
export function itemKind(it: Item): ItemKind {
  if (it.kind) return it.kind;
  if (it.uses.equip) return it.uses.equip.slot === 'treasure' ? 'treasure' : 'gear';
  if (it.uses.fight) return 'talisman';
  if (it.uses.read) return 'manual';
  return 'pill';
}

/** How many share a square. */
export function stackSize(it: Item): number {
  return it.stack ?? STACK_BY_KIND[itemKind(it)];
}

/** The glyph its square shows. */
export function itemGlyph(it: Item): string {
  if (it.glyph) return it.glyph;
  const w = it.uses.equip?.weapon;
  if (w) return { sword: '剑', saber: '刀', spear: '枪', fist: '拳' }[w];
  if (it.uses.equip?.slot === 'armor') return '甲';
  return KIND_GLYPH[itemKind(it)];
}
