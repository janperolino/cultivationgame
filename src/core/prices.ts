// What things cost (design § Economy, Price yardstick; content/money.ts): a white thing of tier 1
// at its kind's price, times its rarity's price (×2 green, ×5 blue, ×15 purple…) against the
// written thing's own, times the realm curve by tier, times what its region does to it. A copy is
// priced by what it teaches. Prices are in low-grade stones; a mortal good is priced in taels.
import { copyOf, hasCopy } from '../content/copies.ts';
import { hasItem, item, itemKind, type Item } from '../content/items.ts';
import { hasManual, manual } from '../content/manuals.ts';
import { method } from '../content/methods.ts';
import {
  BASE_PRICE,
  COPY_PRICE,
  REGION_PRICE,
  STORAGE_PRICE,
  TIER_PRICE,
} from '../content/money.ts';
import { rarity, type RarityId } from '../content/rarity.ts';
import { technique } from '../content/techniques.ts';

function tierPrice(tier: number): number {
  return TIER_PRICE[Math.max(0, Math.min(TIER_PRICE.length - 1, tier - 1))]!;
}

/** The kind's price for a white thing of tier 1. */
function basePrice(it: Item): number {
  const kind = itemKind(it);
  if (kind === 'gear' && it.uses.equip?.squares) return STORAGE_PRICE;
  return BASE_PRICE[kind];
}

/** An item's posted price in low-grade stones, in a region when given. */
export function itemPrice(it: Item, region?: string): number {
  const regional = region ? (REGION_PRICE[region]?.[it.id.split('~')[0]!] ?? 1) : 1;
  // A written price is the thing at its own tier and its worst rarity; the kind's is a white tier 1.
  const own = it.price ?? basePrice(it) * tierPrice(it.tier);
  const ref = it.price !== undefined ? rarity(writtenRarity(it)).price : 1;
  return Math.max(0.1, (own * rarity(it.rarity).price * regional) / ref);
}

/** The rarity a written thing is priced at: its own, before any variant moved it. */
function writtenRarity(it: Item): RarityId {
  const base = it.id.split('~')[0]!;
  return base !== it.id && hasItem(base) ? item(base).rarity : it.rarity;
}

/** A copy's price: what it teaches, by kind, rarity and tier. */
export function copyPrice(id: string): number {
  const of = copyOf(id);
  if (!of) throw new RangeError(`Unknown copy ${id}`);
  const t =
    of.kind === 'method'
      ? method(of.id)
      : of.kind === 'technique'
        ? technique(of.id)
        : hasManual(of.id)
          ? manual(of.id)
          : null;
  if (!t) throw new RangeError(`Unknown copy ${id}`);
  const kind = of.kind === 'manual' ? manual(of.id).kind : of.kind;
  return COPY_PRICE[kind] * rarity(t.rarity).price * tierPrice(t.tier);
}

/** Anything's price in low-grade stones: an item (a variant included) or a copy. */
export function priceOf(thing: string, region?: string): number {
  if (hasCopy(thing)) return copyPrice(thing);
  return itemPrice(item(thing), region);
}

/** Whether a thing is a mortal good, priced in taels. */
export function isMortalGood(thing: string): boolean {
  return !hasCopy(thing) && hasItem(thing) && item(thing).taels !== undefined;
}
