// Manuals a cultivator holds (design § Cultivation, Manuals): loose manuals found, bought or given,
// kept in `manuals`; and each known method's own manual, held as long as the method is known. A
// manual's nodes are learned with insight like any node and owned apart from the trees.
import { hasManual, manual, methodManual, type Manual } from '../content/manuals.ts';
import { knowsMethod } from './methods.ts';
import type { Cultivator } from './state.ts';

/** Whether the cultivator holds a manual: a loose one they were given, or a known method's. */
export function holdsManual(c: Cultivator, id: string): boolean {
  if (!hasManual(id)) return false;
  const m = manual(id);
  return m.method ? knowsMethod(c, m.method) : c.manuals.includes(id);
}

/** Every manual the cultivator holds: the loose ones in the order gained, then the methods'. */
export function heldManuals(c: Cultivator): Manual[] {
  const loose = c.manuals.filter(hasManual).map(manual);
  const methods = Object.keys(c.methods)
    .map(methodManual)
    .filter((m): m is Manual => m !== undefined);
  return [...loose, ...methods];
}

/** A copy holding a loose manual; methods' manuals come with the method. */
export function gainManual(c: Cultivator, id: string): Cultivator {
  if (!hasManual(id) || manual(id).method || c.manuals.includes(id)) return c;
  return { ...c, manuals: [...c.manuals, id] };
}
