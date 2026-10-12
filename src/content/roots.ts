// Spirit roots (design § Character creation): odds, grade, qi speed and the elements each kind
// holds. Starting values for the pacing sim. Character creation (P1.7) rolls the root and its
// elements; until then every root holds its fixed default elements. Cultivation reads the speed,
// the kind, and the elements for the element hours.
import type { Element } from './elements.ts';

/** How many elements a root holds, and whether they come from the five phases or the mutated three. */
export interface RootElements {
  count: readonly [min: number, max: number];
  from: 'phases' | 'mutated';
  /** What a root of this kind holds until P1.7 rolls them. */
  defaults: readonly Element[];
}

interface RootDef {
  id: string;
  name: string;
  hanzi: string;
  note: string;
  grade: string;
  odds: number;
  speed: number;
  kind: string;
  elements: RootElements;
}

export const ROOTS = [
  {
    id: 'mixed',
    name: 'Mixed root',
    hanzi: '杂灵根',
    note: 'four or five elements',
    grade: 'white',
    odds: 0.499,
    speed: 0.6,
    kind: 'mixed',
    elements: { count: [4, 5], from: 'phases', defaults: ['wood', 'fire', 'metal', 'water'] },
  },
  {
    id: 'true',
    name: 'True root',
    hanzi: '真灵根',
    note: 'two or three elements',
    grade: 'green',
    odds: 0.35,
    speed: 1.0,
    kind: 'true',
    elements: { count: [2, 3], from: 'phases', defaults: ['wood', 'fire'] },
  },
  {
    id: 'single',
    name: 'Single-element root',
    hanzi: '单灵根',
    note: 'sects compete for you',
    grade: 'blue',
    odds: 0.1,
    speed: 1.5,
    kind: 'single',
    elements: { count: [1, 1], from: 'phases', defaults: ['fire'] },
  },
  {
    id: 'mutated',
    name: 'Mutated root',
    hanzi: '异灵根',
    note: 'lightning, ice or wind; rare methods fit it, ordinary ones fit badly',
    grade: 'purple',
    odds: 0.04,
    speed: 2.0,
    kind: 'mutated',
    elements: { count: [1, 1], from: 'mutated', defaults: ['lightning'] },
  },
  {
    id: 'heavenly',
    name: 'Heavenly single root',
    hanzi: '天灵根',
    note: 'great sects send people for you',
    grade: 'gold',
    odds: 0.009,
    speed: 2.5,
    kind: 'single',
    elements: { count: [1, 1], from: 'phases', defaults: ['fire'] },
  },
  {
    id: 'chaos',
    name: 'Chaos root',
    hanzi: '混沌灵根',
    note: 'every element in balance; fits every method fully',
    grade: 'red',
    odds: 0.001,
    speed: 3.0,
    kind: 'chaos',
    elements: {
      count: [5, 5],
      from: 'phases',
      defaults: ['wood', 'fire', 'earth', 'metal', 'water'],
    },
  },
] as const satisfies readonly RootDef[];

export type RootId = (typeof ROOTS)[number]['id'];
export type Root = (typeof ROOTS)[number];
export type RootKind = Root['kind'];

export const ROOT_IDS = ROOTS.map((r) => r.id) as unknown as readonly [RootId, ...RootId[]];

const byId = new Map<RootId, Root>(ROOTS.map((r) => [r.id, r]));

export function root(id: RootId): Root {
  const r = byId.get(id);
  if (!r) throw new RangeError(`Unknown spirit root ${id}`);
  return r;
}

/** The elements a root holds until character creation (P1.7) rolls them. */
export function defaultElements(id: RootId): Element[] {
  return [...root(id).elements.defaults];
}
