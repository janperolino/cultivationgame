// Manuals in words, for the screens that show them: when a sealed node wakes, how a manual's
// nodes wake, and where it stands.
import { manual, type Manual, type ManualNode } from '../content/manuals.ts';
import { MASTERY } from '../content/mastery.ts';
import { REALMS } from '../content/realms.ts';
import { technique } from '../content/techniques.ts';
import { tree } from '../content/trees/index.ts';
import { methodMastery } from '../core/methods.ts';
import type { Cultivator } from '../core/state.ts';
import { mastery } from '../core/techniques.ts';
import { LADDER_LABELS } from './format.ts';

/** When a sealed manual node will work, in words. */
export function sealWords(c: Cultivator, n: ManualNode): string {
  const m = manual(n.manual);
  if (m.method && n.mastery !== undefined) {
    const now = MASTERY[methodMastery(c, m.method).level]!.name;
    return `Sealed until the method reaches ${MASTERY[n.mastery]!.name} (it stands at ${now}).`;
  }
  if (m.technique && n.mastery !== undefined) {
    const t = technique(m.technique);
    const now = MASTERY[mastery(c, t.id).level]!.name;
    return `Sealed until ${t.name} reaches ${MASTERY[n.mastery]!.name} (it stands at ${now}).`;
  }
  return `Sealed until your ${LADDER_LABELS[m.ladder].toLowerCase()} reaches ${REALMS[n.tier - 1]!.name}.`;
}

/** How a manual's nodes wake, in a line. */
export function wakeWords(m: Manual): string {
  if (m.technique) {
    return `The technique sits on the name plate; these passives wake as ${technique(m.technique).name} masters, the first at Comprehension.`;
  }
  if (m.method) return 'Its nodes unseal as the method masters, the first at Comprehension.';
  return `Its nodes unseal as your ${LADDER_LABELS[m.ladder].toLowerCase()} reaches their tier.`;
}

/** Where a manual stands: beside its host tree, or under Manuals alone. */
export function hostWords(m: Manual): string {
  return m.host
    ? `Grafted beside the ${tree(m.host).name} tree, tier ${m.tier} (${REALMS[m.tier - 1]!.name})`
    : 'No host tree: it stands under Manuals on its own';
}
