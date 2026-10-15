// Pill toxicity (design § Items and gear): one meter, 0 to 100. A pill adds its dose: 10 at your
// own tier for a white pill, triple for each tier above you and a third for each below, scaled by
// its rarity's purity. Every pill's effect scales by 1 − toxicity/100, the meter decays day by day
// and faster by realm, and reaching 100 unsettles the ladder the last pill fed. Toxicity is why
// pills are a boost and never the road.
import {
  TOXICITY_DECAY,
  TOXICITY_MAX,
  TOXICITY_PURITY,
  TOXICITY_TIER_STEP,
} from '../content/cultivation.ts';
import type { Item } from '../content/items.ts';
import { rarityRank } from '../content/rarity.ts';
import { realmIndex } from '../content/realms.ts';
import { realmOf, type Cultivator } from './state.ts';

/** The cultivator's own tier: 1 at Qi Condensation, from your realm (your highest ladder). */
export function ownTier(c: Cultivator): number {
  return realmIndex(realmOf(c)) + 1;
}

/** The toxicity a consumable adds to someone of this tier; 0 for clean food and herbs. */
export function doseAt(it: Item, tier: number): number {
  const dose = it.uses.consume?.dose ?? 0;
  if (dose <= 0) return 0;
  return dose * TOXICITY_TIER_STEP ** (it.tier - tier) * TOXICITY_PURITY[rarityRank(it.rarity)]!;
}

/** The toxicity a consumable adds for this cultivator. */
export function pillDose(c: Cultivator, it: Item): number {
  return doseAt(it, ownTier(c));
}

/** What every pill's effect scales by: 1 − toxicity/100. */
export function toxicityScale(c: Cultivator): number {
  return Math.max(0, 1 - c.toxicity / TOXICITY_MAX);
}

/** The meter after a dose (or a cut, if negative), held to 0..100. */
export function addToxicity(c: Cultivator, amount: number): Cultivator {
  const toxicity = Math.min(TOXICITY_MAX, Math.max(0, c.toxicity + amount));
  return toxicity === c.toxicity ? c : { ...c, toxicity };
}

/** Toxicity shed a day: 1 at Qi Condensation, and 1 more for each realm above. */
export function toxicityDecay(c: Cultivator): number {
  return TOXICITY_DECAY * ownTier(c);
}

/** The meter after `days` of decay. */
export function decayToxicity(c: Cultivator, days: number): Cultivator {
  if (c.toxicity <= 0 || days <= 0) return c;
  return addToxicity(c, -toxicityDecay(c) * days);
}
