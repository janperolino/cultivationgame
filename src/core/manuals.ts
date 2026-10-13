// Manuals a cultivator holds (design § Cultivation, Manuals): loose manuals found, bought or given,
// kept in `manuals`; each known method's own manual, held as long as the method is known; and each
// known technique's Art, given by whatever road taught the technique. A manual's nodes are learned
// with insight like any node and owned apart from the trees. Each grafts beside its host tree, or
// stands under the Manuals category when it has none (design § Cultivation, Where manuals live).
import {
  hasManual,
  manual,
  MANUAL_KIND_IDS,
  MANUAL_KINDS,
  methodManual,
  techniqueArt,
  type Manual,
} from '../content/manuals.ts';
import { knowsMethod } from './methods.ts';
import type { Cultivator } from './state.ts';
import { knowsTechnique } from './techniques.ts';

/** Whether the cultivator holds a manual: a loose one they were given, a method's or an Art. */
export function holdsManual(c: Cultivator, id: string): boolean {
  if (!hasManual(id)) return false;
  const m = manual(id);
  if (m.method) return knowsMethod(c, m.method);
  if (m.technique) return knowsTechnique(c, m.technique);
  return c.manuals.includes(id);
}

/** Every manual the cultivator holds: the loose ones in the order gained, the methods', the Arts. */
export function heldManuals(c: Cultivator): Manual[] {
  const loose = c.manuals.filter(hasManual).map(manual);
  const methods = Object.keys(c.methods)
    .map(methodManual)
    .filter((m): m is Manual => m !== undefined);
  const arts = Object.keys(c.techniques)
    .map(techniqueArt)
    .filter((m): m is Manual => m !== undefined);
  return [...loose, ...methods, ...arts];
}

/** The manuals held that graft beside a tree, in the order held. */
export function graftsOn(c: Cultivator, treeId: string): Manual[] {
  return heldManuals(c).filter((m) => m.host === treeId);
}

/** The manuals held that have no host tree and stand under Manuals on their own. */
export function hostlessManuals(c: Cultivator): Manual[] {
  return heldManuals(c).filter((m) => m.host === null);
}

/** "7 (5 formulas, 1 method, 1 art)", or "none yet". */
export function manualCount(c: Cultivator): string {
  const held = heldManuals(c);
  if (held.length === 0) return 'none yet';
  const kinds = MANUAL_KIND_IDS.flatMap((k) => {
    const n = held.filter((m) => m.kind === k).length;
    if (n === 0) return [];
    const word = MANUAL_KINDS[k][n === 1 ? 'name' : 'plural'].toLowerCase();
    return [`${n} ${word}`];
  });
  return `${held.length} (${kinds.join(', ')})`;
}

/** A copy holding a loose manual; methods' manuals and Arts come with what they belong to. */
export function gainManual(c: Cultivator, id: string): Cultivator {
  if (!hasManual(id)) return c;
  const m = manual(id);
  if (m.method || m.technique || c.manuals.includes(id)) return c;
  return { ...c, manuals: [...c.manuals, id] };
}
