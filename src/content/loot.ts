// What the dead leave (design § Enemies, What the dead leave; § Items and gear, Loot and shops):
// the tables loot reads (core/loot.ts). A dead cultivator drops their real kit, their stones and,
// from Foundation up, a storage ring with lots in it; a beast drops its parts and its core. Every
// number is a starting value for the economy sims.
import { item, rarityRange, variantId } from './items.ts';
import { rarityRank, type RarityId } from './rarity.ts';

/** Stones a cultivator carries, by realm from Qi Condensation, in low-grade stones. */
export const CARRIED_STONES: readonly (readonly [number, number])[] = [
  [5, 30],
  [50, 300],
  [1_500, 9_000],
  [150_000, 900_000],
];

/** Lots in an elder's ring, from Foundation up: three to eight, at their pedigree's bias. */
export const RING_LOTS = [3, 8] as const;

/** The NPC consumables' shapes (content/enemies.ts, CONSUMABLES) as the written pills they are. */
export const CONSUMABLE_ITEM: Record<string, string> = {
  'mending-pill': 'spring-returning-pill',
  'qi-pill': 'qi-restoring-pill',
  'strike-talisman': 'ember-talisman',
};

/** A species' part (content/beasts.ts, `parts`) as the item it drops. */
export const PART_ITEM: Record<string, string> = {
  wings: 'beast-wing',
  guano: 'bat-guano',
  hide: 'beast-hide',
  skin: 'beast-hide',
  marrow: 'beast-marrow',
  shell: 'beast-shell',
  meat: 'beast-meat',
  gall: 'beast-gall',
  fang: 'beast-fang',
  fists: 'beast-fist',
  fin: 'beast-fin',
  blood: 'beast-blood',
  'beast core': 'beast-core',
  'beast cores': 'beast-core',
};

/** The written pill or talisman an NPC's consumable shape is, at the rarity they rolled, held in its range. */
export function consumableId(key: string, r: RarityId): string {
  const base = CONSUMABLE_ITEM[key];
  if (!base) throw new RangeError(`No written item for the consumable ${key}`);
  const range = rarityRange(item(base));
  const lo = range[0]!;
  const hi = range[range.length - 1]!;
  const at = range.includes(r) ? r : rarityRank(r) < rarityRank(lo) ? lo : hi;
  return variantId(base, at);
}
