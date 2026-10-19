// Manuals in words, for the screens that show them: when a sealed node wakes, how a manual's
// nodes wake.
import type { Manual } from '../content/manuals.ts';
import { technique } from '../content/techniques.ts';
import { LADDER_LABELS } from './format.ts';

/** How a manual's nodes wake, in a line. */
export function wakeWords(m: Manual): string {
  if (m.technique) {
    return `The technique is the jewel; these passives wake as ${technique(m.technique).name} masters, the first at Comprehension.`;
  }
  if (m.method) return 'Its nodes unseal as the method masters, the first at Comprehension.';
  return `Its nodes unseal as your ${LADDER_LABELS[m.ladder].toLowerCase()} reaches their tier.`;
}
