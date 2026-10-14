// The Intent ladder (design § The combat Daos, The Intent ladder): beside its tiers every combat
// Dao climbs Qi, Intent, Domain and Law, earned and never bought. A Dao's tier 2 capstone makes
// you ready for Intent and its tier 4 capstone for Domain, a tier lower for a genius in that Dao,
// and a moment breaks through. core/intent.ts holds the rules, core/combat/fight.ts the effects.
// Every number is a starting value the fight sim (sim/fights.ts) holds to the ledger.
import type { CombatDaoId } from './daos.ts';
import type { RarityId } from './rarity.ts';

/** The stages, from the Dao's tier 1 up. A cultivator stores the stage earned: 1 or 2. */
export const INTENT_STAGES = [
  { id: 'qi', name: 'Qi' },
  { id: 'intent', name: 'Intent' },
  { id: 'domain', name: 'Domain' },
  { id: 'law', name: 'Law' },
] as const;
export type IntentStageId = (typeof INTENT_STAGES)[number]['id'];

export const INTENT = 1;
export const DOMAIN = 2;
/** The highest stage built in v1: Law is written, not built. */
export const INTENT_TOP = DOMAIN;

/** Each stage's name in each Dao's own words, Qi to Law: Sword's 剑气, 剑意, 剑域, 剑之法则. */
export const INTENT_HANZI: Record<CombatDaoId, readonly [string, string, string, string]> = {
  fire: ['火气', '火意', '火域', '火之法则'],
  water: ['水气', '水意', '水域', '水之法则'],
  wood: ['木气', '木意', '木域', '木之法则'],
  metal: ['金气', '金意', '金域', '金之法则'],
  earth: ['土气', '土意', '土域', '土之法则'],
  sword: ['剑气', '剑意', '剑域', '剑之法则'],
  saber: ['刀气', '刀意', '刀域', '刀之法则'],
  spear: ['枪气', '枪意', '枪域', '枪之法则'],
  fist: ['拳气', '拳意', '拳域', '拳之法则'],
};

/** The Dao tier whose capstone readies each stage, by stage: Intent at tier 2, Domain at tier 4. */
export const INTENT_CAPSTONE_TIER: Readonly<Record<number, number>> = { 1: 2, 2: 4 };

/**
 * A genius takes each stage on the capstone this many tiers lower: a talent or root of this
 * rarity or better tied to the Dao (content/talents.ts and roots.ts, `intent`).
 */
export const GENIUS_TIERS_EARLY = 1;
export const GENIUS_RARITY: RarityId = 'gold';

/** A fight won after acting with a Dao's actions under this share of your HP is a moment. */
export const BRINK_HP = 0.1;

// ---------------------------------------------------------------- in a fight

/** Intent: the Dao's actions at this Accuracy and Attack against a foe below your stage. */
export const INTENT_ACCURACY = 1.15;
export const INTENT_ATTACK = 1.15;
/** Intent: a foe below your stage aims at you at this Accuracy. */
export const INTENT_FOE_ACCURACY = 0.9;
/** Domain adds: that foe's Evasion, and their Defense against the Dao's actions. */
export const DOMAIN_FOE_EVASION = 0.9;
export const DOMAIN_FOE_DEFENSE = 0.95;
