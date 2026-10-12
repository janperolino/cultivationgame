// Items (design § Items and gear): one record for everything you can carry, and what an item can
// do is a list of uses rather than a kind. P2.1 brings the uses the rules read so far: offer (at
// a major breakthrough), consume (pills and their toxicity) and fight (one-shot actions). P2.3
// adds equip, the bag's kinds and bulk, and the rest of the uses table. A new item is an entry
// here, not new code. **Awaiting Jan's review:** the offerings and pills below are drafts.
import type { LadderId } from './cultivation.ts';
import type { Element } from './elements.ts';
import type { RarityId } from './rarity.ts';
import type { DamageType, Form } from './techniques.ts';

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
  uses: { offer?: OfferUse; consume?: ConsumeUse; fight?: FightUse };
  source: string;
  text: string;
}

export const ITEMS: readonly Item[] = [
  {
    id: 'foundation-pill',
    name: 'Foundation Pill',
    pinyin: 'Zhuji Dan',
    hanzi: '筑基丹',
    tier: 1,
    rarity: 'white',
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
    uses: { offer: { tags: ['steadying'] } },
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
    uses: { offer: { tags: ['surging'] } },
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
    uses: { offer: { tags: ['purifying'] } },
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
    uses: { offer: { tags: ['steadying'] } },
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
    uses: { offer: { tags: ['steadying'], ladder: 'soul' } },
    source: 'grown in old river clams of the Border Wilds',
    text: "The soul's offering: a cold pearl that keeps the mind from scattering.",
  },
  {
    id: 'qi-gathering-pill',
    name: 'Qi-Gathering Pill',
    pinyin: 'Juqi Dan',
    hanzi: '聚气丹',
    tier: 1,
    rarity: 'white',
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
    uses: { consume: { effects: [{ effect: 'restore', what: 'qi', share: 0.3 }], dose: 10 } },
    source: 'every herb stall that sells pills',
    text: 'Swallowed mid-fight, it fills a third of an empty pool.',
  },
  {
    id: 'poison-purging-pill',
    name: 'Poison-Purging Pill',
    pinyin: 'Qudu Dan',
    hanzi: '祛毒丹',
    tier: 1,
    rarity: 'green',
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
    uses: { fight: { form: 'projectile', damage: 'fire', power: 45 } },
    source: 'talisman stalls',
    text: 'A strip of yellow paper that bursts into a fist of flame when thrown.',
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
