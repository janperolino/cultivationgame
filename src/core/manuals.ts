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
  type ManualKind,
} from '../content/manuals.ts';
import { RARITY_IDS, rarityRank, type RarityId } from '../content/rarity.ts';
import { TREES } from '../content/trees/index.ts';
import { knowsMethod } from './methods.ts';
import type { Cultivator } from './state.ts';
import { knowsTechnique } from './techniques.ts';
import { nodeReady } from './trees.ts';

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

/**
 * Whether what the manual teaches is yours: its method or technique known, a loose one held. An
 * unread copy on the bookcase isn't (core/reading.ts).
 */
export function knowsManual(c: Cultivator, m: Manual): boolean {
  if (m.method) return knowsMethod(c, m.method);
  if (m.technique) return knowsTechnique(c, m.technique);
  return c.manuals.includes(m.id);
}

/** Whether it is yours and every one of its nodes learned: it lies flat on the bookcase. */
export function manualFinished(c: Cultivator, m: Manual): boolean {
  return knowsManual(c, m) && m.nodes.every((n) => c.nodes.includes(n.id));
}

/** Whether one of the manual's nodes can be bought now and works once bought. */
export function manualReady(c: Cultivator, m: Manual): boolean {
  return m.nodes.some((n) => nodeReady(c, n));
}

/**
 * The bookcase's planks in order (design § Cultivation, Where manuals live): Scriptures and
 * Inheritances together as Above the trees, then Methods, Formulas, Arts and Styles.
 */
export const PLANKS = [
  { id: 'above', name: 'Above the trees', kinds: ['scripture', 'inheritance'] },
  { id: 'method', name: 'Methods', kinds: ['method'] },
  { id: 'formula', name: 'Formulas', kinds: ['formula'] },
  { id: 'art', name: 'Arts', kinds: ['art'] },
  { id: 'style', name: 'Styles', kinds: ['style'] },
] as const satisfies readonly { id: string; name: string; kinds: readonly ManualKind[] }[];
export type Plank = (typeof PLANKS)[number];
export type PlankId = Plank['id'];

export type ShelfOrder = 'rarity' | 'host' | 'newest' | 'waiting';
export const SHELF_ORDERS: readonly { id: ShelfOrder; name: string }[] = [
  { id: 'rarity', name: 'Rarity, rarest first' },
  { id: 'host', name: 'Host tree' },
  { id: 'newest', name: 'Newest first' },
  { id: 'waiting', name: 'Waiting nodes first' },
];

/** One plank's shelf: its open manuals in the order asked, and its finished ones, rarest first. */
export interface Shelf {
  plank: Plank;
  open: Manual[];
  finished: Manual[];
}

/**
 * The bookcase: the kinds in plank order, each with its open manuals sorted and its finished
 * ones apart, rarest first; a kind with nothing held shows no shelf. `held` defaults to every
 * manual held, in the order gained, which "newest" reverses and every order keeps on a tie.
 */
export function shelf(
  c: Cultivator,
  order: ShelfOrder = 'rarity',
  held: readonly Manual[] = heldManuals(c),
): Shelf[] {
  const index = new Map(held.map((m, i) => [m.id, i]));
  const at = (m: Manual) => index.get(m.id)!;
  const rarest = (a: Manual, b: Manual) => rarityRank(b.rarity) - rarityRank(a.rarity);
  const trees = TREES.map((t) => t.id);
  const hostAt = (m: Manual) => (m.host ? trees.indexOf(m.host) : -1);
  const ready = new Map(held.map((m) => [m.id, manualReady(c, m)]));
  const sorts: Record<ShelfOrder, (a: Manual, b: Manual) => number> = {
    rarity: (a, b) => rarest(a, b) || at(a) - at(b),
    host: (a, b) => hostAt(a) - hostAt(b) || rarest(a, b) || at(a) - at(b),
    newest: (a, b) => at(b) - at(a),
    waiting: (a, b) =>
      Number(ready.get(b.id)) - Number(ready.get(a.id)) || rarest(a, b) || at(a) - at(b),
  };
  return PLANKS.flatMap((plank) => {
    const mine = held.filter((m) => (plank.kinds as readonly ManualKind[]).includes(m.kind));
    if (mine.length === 0) return [];
    const finished = mine.filter((m) => manualFinished(c, m));
    const open = mine.filter((m) => !finished.includes(m));
    return [
      {
        plank,
        open: open.sort(sorts[order]),
        finished: finished.sort(sorts.rarity),
      },
    ];
  });
}

/** What the strip over the bookcase counts: open and finished, and how many of each rarity. */
export interface ShelfTally {
  open: number;
  finished: number;
  /** The rarities held, commonest first, each with its count. */
  rarities: { rarity: RarityId; count: number }[];
}

export function shelfTally(shelves: readonly Shelf[]): ShelfTally {
  const all = shelves.flatMap((s) => [...s.open, ...s.finished]);
  return {
    open: shelves.reduce((n, s) => n + s.open.length, 0),
    finished: shelves.reduce((n, s) => n + s.finished.length, 0),
    rarities: RARITY_IDS.flatMap((rarity) => {
      const count = all.filter((m) => m.rarity === rarity).length;
      return count ? [{ rarity, count }] : [];
    }),
  };
}

/** A copy holding a loose manual; methods' manuals and Arts come with what they belong to. */
export function gainManual(c: Cultivator, id: string): Cultivator {
  if (!hasManual(id)) return c;
  const m = manual(id);
  if (m.method || m.technique || c.manuals.includes(id)) return c;
  return { ...c, manuals: [...c.manuals, id] };
}
