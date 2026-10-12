// The elements (design § Cultivation, element hours; § Combat): the five phases the earthly
// branches carry, and the three mutated elements, which count as one of the five.

export const FIVE_PHASES = ['wood', 'fire', 'earth', 'metal', 'water'] as const;
export type PhaseElement = (typeof FIVE_PHASES)[number];

export const MUTATED_ELEMENTS = ['lightning', 'wind', 'ice'] as const;

export const ELEMENTS = [...FIVE_PHASES, ...MUTATED_ELEMENTS] as const;
export type Element = (typeof ELEMENTS)[number];

export const ELEMENT_INFO: Record<Element, { name: string; hanzi: string }> = {
  wood: { name: 'Wood', hanzi: '木' },
  fire: { name: 'Fire', hanzi: '火' },
  earth: { name: 'Earth', hanzi: '土' },
  metal: { name: 'Metal', hanzi: '金' },
  water: { name: 'Water', hanzi: '水' },
  lightning: { name: 'Lightning', hanzi: '雷' },
  wind: { name: 'Wind', hanzi: '风' },
  ice: { name: 'Ice', hanzi: '冰' },
};

const PHASE_OF: Record<Element, PhaseElement> = {
  wood: 'wood',
  fire: 'fire',
  earth: 'earth',
  metal: 'metal',
  water: 'water',
  lightning: 'wood',
  wind: 'wood',
  ice: 'water',
};

/** The phase an element counts as: lightning and wind as wood, ice as water, as combat does. */
export function phaseOf(e: Element): PhaseElement {
  return PHASE_OF[e];
}
