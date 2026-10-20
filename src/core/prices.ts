// What things cost (design § Economy, Price yardstick; content/money.ts): a white thing of tier 1
// at its kind's price, times its rarity's price (×2 green, ×5 blue, ×15 purple…) against the
// written thing's own, times the realm curve by tier. A copy is priced by what it teaches. This is
// the posted price; a market's supply moves it (core/markets.ts). Prices are in low-grade stones;
// a mortal good is priced in taels.
import { copyOf, hasCopy } from '../content/copies.ts';
import { hasItem, item, itemKind, type Item } from '../content/items.ts';
import { hasManual, manual } from '../content/manuals.ts';
import { method } from '../content/methods.ts';
import { BASE_PRICE, COPY_PRICE, STORAGE_PRICE } from '../content/money.ts';
import { rarity } from '../content/rarity.ts';
import { realmScale, tierRealm } from '../content/realms.ts';
import { technique } from '../content/techniques.ts';

function tierPrice(tier: number): number {
  return realmScale(tierRealm(tier).id);
}

/** The kind's price for a white thing of tier 1. */
function basePrice(it: Item): number {
  const kind = itemKind(it);
  if (kind === 'gear' && it.uses.equip?.squares) return STORAGE_PRICE;
  return BASE_PRICE[kind];
}

/** An item's posted price in low-grade stones. */
function itemPrice(it: Item): number {
  // A written price is the thing at its own tier and its worst rarity; the kind's is a white tier 1.
  // A variant at another tier or rarity moves from the written thing's.
  const w = written(it);
  const own =
    it.price !== undefined
      ? (it.price * tierPrice(it.tier)) / tierPrice(w.tier)
      : basePrice(it) * tierPrice(it.tier);
  const ref = it.price !== undefined ? rarity(w.rarity).price : 1;
  return Math.max(0.1, (own * rarity(it.rarity).price) / ref);
}

/** The written thing a variant is priced from, at the tier and rarity it was written at. */
function written(it: Item): Item {
  const base = it.id.split('~')[0]!;
  return base !== it.id && hasItem(base) ? item(base) : it;
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

/** Anything's posted price in low-grade stones: an item (a variant included) or a copy. */
export function priceOf(thing: string): number {
  if (hasCopy(thing)) return copyPrice(thing);
  return itemPrice(item(thing));
}
