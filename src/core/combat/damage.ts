// Damage once a hit lands (design § Combat):
//   base × Attack ÷ Defense × m_element × (1 − resist) × m_crit × spread
// rounded to the nearest whole number. Attack and Defense come off the two sheets, and a combo
// multiplies, 1 when absent. The five-element cycle: an element that overcomes the target's deals
// ×1.25, one the target's overcomes ×0.8, and chaining elements in generating order (wood, then
// fire) builds a combo.
import {
  COMBO_MAX,
  COMBO_STEP,
  CRIT_DAMAGE,
  DAMAGE_SPREAD,
  ELEMENT_ADVANTAGE,
  ELEMENT_DISADVANTAGE,
  GENERATES,
  MAX_RESIST,
  OVERCOMES,
  type DamageType,
} from '../../content/combat.ts';
import { phaseOf, type Element, type PhaseElement } from '../../content/elements.ts';
import type { Rng } from '../rng.ts';

export interface DamageInput {
  /** The technique's base, sized by its tier. */
  base: number;
  attack: number;
  defense: number;
  element: number;
  resist: number;
  result: 'critical' | 'hit';
  /** The combo multiplier, 1 with no chain. */
  combo?: number;
  /** The spread roll, 1 for the formula's own value. */
  spread?: number;
}

export function damage(i: DamageInput): number {
  const resist = Math.min(MAX_RESIST, i.resist);
  return Math.round((force(i) / i.defense) * (1 - resist));
}

/**
 * A hit's force before any Defense or resist meets it: base × Attack × element × crit × combo ×
 * spread. Each bar it meets divides it by its own Defense (core/combat/fight.ts, P3.2).
 */
export function force(i: Omit<DamageInput, 'defense' | 'resist'>): number {
  return (
    i.base *
    i.attack *
    i.element *
    (i.result === 'critical' ? CRIT_DAMAGE : 1) *
    (i.combo ?? 1) *
    (i.spread ?? 1)
  );
}

/** A spread roll: anywhere from 0.85 to 1.15. */
export function rollSpread(rng: Rng): number {
  return 1 - DAMAGE_SPREAD + 2 * DAMAGE_SPREAD * rng.next();
}

const ELEMENTAL = new Set<string>([
  'metal',
  'wood',
  'water',
  'fire',
  'earth',
  'lightning',
  'wind',
  'ice',
]);

/** The phase a damage type counts as, or null for physical, soul and poison. */
export function damagePhase(type: DamageType): PhaseElement | null {
  return ELEMENTAL.has(type) ? phaseOf(type as Element) : null;
}

/** ×1.25 when the attack's phase overcomes the target's, ×0.8 the other way, else 1. */
export function elementMultiplier(
  attack: PhaseElement | null,
  target: PhaseElement | null,
): number {
  if (!attack || !target) return 1;
  if (OVERCOMES[attack] === target) return ELEMENT_ADVANTAGE;
  if (OVERCOMES[target] === attack) return ELEMENT_DISADVANTAGE;
  return 1;
}

/** A combo: the last elemental action's phase and how many links the chain holds. */
export interface Combo {
  element: PhaseElement;
  chain: number;
}

/**
 * The combo after an action of this phase: a link more when the last phase generates it, a fresh
 * start otherwise, and nothing after an action with no phase.
 */
export function nextCombo(prev: Combo | null, phase: PhaseElement | null): Combo | null {
  if (!phase) return null;
  if (prev && GENERATES[prev.element] === phase) {
    return { element: phase, chain: Math.min(COMBO_MAX, prev.chain + 1) };
  }
  return { element: phase, chain: 0 };
}

/** What a combo multiplies damage by. */
export function comboMultiplier(c: Combo | null): number {
  return 1 + COMBO_STEP * (c?.chain ?? 0);
}
