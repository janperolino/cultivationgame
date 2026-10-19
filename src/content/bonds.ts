// Bonds (design § Professions, people and powers, NPC basics; P3.4b): why a follower follows,
// pay, loyalty, fear or a shared goal, and the way each one breaks. A bond is made by recruiting
// someone, which names the bond, and keeps the follower tie while it holds. Wages follow the realm
// curve: a day's work at Qi Condensation is a low-grade stone (design § Economy).
import { DAYS_PER_MONTH } from './calendar.ts';
import type { RealmId } from './realms.ts';
import { realmScale } from './realms.ts';
import type { MotiveId } from './personality.ts';

export const BOND_IDS = ['pay', 'loyalty', 'fear', 'goal'] as const;
export type BondId = (typeof BOND_IDS)[number];

export interface BondInfo {
  name: string;
  /** How it breaks, for the People screen. */
  breaks: string;
}

export const BONDS: Record<BondId, BondInfo> = {
  pay: { name: 'paid', breaks: 'leaves when the pay stops' },
  loyalty: { name: 'loyal', breaks: 'leaves when their opinion of you falls too far' },
  fear: { name: 'afraid', breaks: 'runs or turns when you look weak or are out of reach' },
  goal: { name: 'a shared goal', breaks: 'leaves when the goal is done or dropped' },
};

/** Days in a wage's month, the calendar's; wages fall due on each. */
export const WAGE_DAYS = DAYS_PER_MONTH;

/** A day's wage at a realm, in low-grade stones: 1 at Qi Condensation, 9 at Foundation. */
export function dayWage(realm: RealmId): number {
  return realmScale(realm);
}

/** A month's wage at a realm: 30 low-grade at Qi Condensation, 270 at Foundation. */
export function monthWage(realm: RealmId): number {
  return dayWage(realm) * WAGE_DAYS;
}

/**
 * Loyalty holds while their opinion of you stays at or above this, by their Fidelity: the design's
 * "below friendly" at 0, the loyal staying to hostile, the fickle held only by trust.
 */
export const LOYALTY_FLOOR: Record<-2 | -1 | 0 | 1 | 2, number> = {
  [-2]: 40,
  [-1]: 25,
  0: 10,
  1: -10,
  2: -40,
};

/** A loyalty bond needs this trust to make. */
export const LOYALTY_NEEDS = 'friendly' as const;

/** The motives a shared goal meets: something they want out of it. */
export const GOAL_MOTIVES: readonly MotiveId[] = ['ambition', 'revenge'];

/** A fear bond breaks after this many days out of your reach. */
export const FEAR_APART_DAYS = 7;

/** Below half HP or down, you look weak: your presence counts at this share. */
export const WEAK_PRESENCE = 0.5;
export const WEAK_HP = 0.5;

/**
 * The treacherous turn when a bond breaks instead of leaving: Fidelity at −2, or −1 with a cruel
 * Heart or a hostile opinion of you.
 */
export const TREACHEROUS = { fickle: -2, fickleWith: -1, cruel: -1 } as const;
