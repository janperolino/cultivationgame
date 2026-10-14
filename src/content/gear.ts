// Gear's numbers (design § Items and gear): the pack on foot, bonding on the mastery scale, and
// what a weapon above your realm costs you. core/gear.ts reads them. Starting values for the sims.
import type { MasteryTable } from './mastery.ts';
import type { RarityId } from './rarity.ts';

/** Squares the pack holds on foot, before a pouch or ring (design § UI, the Bag: small). */
export const PACK_SQUARES = 10;

/** Artifacts from this rarity up bond to their owner; below it, every property simply works. */
export const BOND_FROM: RarityId = 'blue';

/**
 * Bonding runs Glimpse to Origin like a technique (content/mastery.ts), in bond days at tier 1
 * and three times that a tier above. Bonding releases no insight.
 */
export const BOND_MASTERY: MasteryTable = {
  practice: [0, 4, 30, 150, 600],
  burst: [0, 0, 0, 0, 0],
};

/** Bond days each fight turn adds to everything worn from blue up. */
export const BOND_PER_TURN = 0.25;
/** Low-grade spirit stones fed in seclusion for one bond day, at tier 1. */
export const BOND_STONES_PER_DAY = 5;
/** The bond level an artifact spirit wakes at, gold and red; pristine is born with it awake. */
export const SPIRIT_WAKES = 3;

/**
 * A weapon or armor a tier above your realm: its Accuracy multiplier and how much of the tier's
 * step it counts, by bond level (Glimpse to Origin). At Perfection the penalty is gone; at Origin
 * the whole step counts (design § Items and gear, bonding). Two tiers above, it won't wake.
 */
export const ABOVE_ACCURACY = [0.8, 0.8, 0.9, 1, 1] as const;
export const ABOVE_STEP_SHARE = [0.5, 0.5, 0.5, 0.5, 1] as const;
/** A weapon above your realm drinks this share of your qi pool with every strike. */
export const ABOVE_QI = 0.05;
