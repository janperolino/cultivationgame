// Methods known and active (design § Cultivation, every ladder needs a method): qi climbs only with
// a cultivation method, the body with a tempering art and the soul with a nourishing art. A
// cultivator knows any number and climbs each ladder with one.
import type { LadderId } from '../content/cultivation.ts';
import { hasMethod, method, type Method } from '../content/methods.ts';
import type { Cultivator } from './state.ts';

/** The method a ladder climbs with, or null when it has none. */
export function ladderMethod(c: Cultivator, which: LadderId): Method | null {
  const id = c.activeMethods[which];
  if (!id || !hasMethod(id)) return null;
  const m = method(id);
  return m.ladder === which ? m : null;
}

export function knowsMethod(c: Cultivator, id: string): boolean {
  return c.methods.includes(id);
}

/** Learns a method; a ladder with nothing active takes it up at once. */
export function learnMethod(c: Cultivator, id: string): Cultivator {
  if (knowsMethod(c, id) || !hasMethod(id)) return c;
  const ladder = method(id).ladder;
  return {
    ...c,
    methods: [...c.methods, id],
    activeMethods: c.activeMethods[ladder] ? c.activeMethods : { ...c.activeMethods, [ladder]: id },
  };
}

/** Climbs a ladder with a known method of that ladder, or with nothing. */
export function setActiveMethod(c: Cultivator, which: LadderId, id: string | null): Cultivator {
  if (id !== null && (!knowsMethod(c, id) || !hasMethod(id) || method(id).ladder !== which)) {
    return c;
  }
  return { ...c, activeMethods: { ...c.activeMethods, [which]: id } };
}
