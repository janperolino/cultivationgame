// Spirit roots (design § Character creation): odds, grade, qi speed and the elements each kind
// holds. Starting values for the pacing sim. Character creation rolls the root on these odds and
// its elements from its kind; a named root (the Innate Sword Root, the Yin-Yang Twin Root) holds
// fixed elements and carries effects beyond its speed, like any talent. Cultivation reads the
// speed, the kind (which methods fit), and the elements for the element hours.
import { FIVE_PHASES, MUTATED_ELEMENTS, type Element } from './elements.ts';
import type { CombatDaoId } from './daos.ts';
import type { Effect } from './stats.ts';

/** How many elements a root holds, and whether they come from the five phases or the mutated three. */
export interface RootElements {
  count: readonly [min: number, max: number];
  from: 'phases' | 'mutated';
  /** What a root of this kind holds when none were rolled: tests, the sims and old saves. */
  defaults: readonly Element[];
  /** A named root always holds its defaults; nothing is rolled. */
  fixed?: boolean;
}

interface RootDef {
  id: string;
  name: string;
  hanzi: string;
  note: string;
  /** Its rarity on the shared scale (content/rarity.ts); white is the floor for roots. */
  grade: 'white' | 'green' | 'blue' | 'purple' | 'gold' | 'red' | 'pristine';
  odds: number;
  speed: number;
  /** Which methods fit it (content/methods.ts, fitBy). */
  kind: string;
  elements: RootElements;
  /** What a named root changes beyond its speed. */
  effects?: readonly Effect[];
  /** The combat Dao a named root is tied to: from gold up, its Intent opens a tier early. */
  intent?: CombatDaoId;
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
    odds: 0.03,
    speed: 2.0,
    kind: 'mutated',
    elements: { count: [1, 1], from: 'mutated', defaults: ['lightning'] },
  },
  {
    id: 'yin-yang',
    name: 'Yin-Yang Twin Root',
    hanzi: '阴阳双生根',
    note: 'water and fire in balance, with no clash between them',
    grade: 'purple',
    odds: 0.01,
    speed: 2.0,
    kind: 'true',
    elements: { count: [2, 2], from: 'phases', defaults: ['fire', 'water'], fixed: true },
    effects: [{ stat: 'setbackTime', value: -0.2 }],
  },
  {
    id: 'heavenly',
    name: 'Heavenly single root',
    hanzi: '天灵根',
    note: 'great sects send people for you',
    grade: 'gold',
    odds: 0.007,
    speed: 2.5,
    kind: 'single',
    elements: { count: [1, 1], from: 'phases', defaults: ['fire'] },
  },
  {
    id: 'sword',
    name: 'Innate Sword Root',
    hanzi: '天生剑根',
    note: "a metal root with a sword's edge",
    grade: 'gold',
    odds: 0.002,
    speed: 2.5,
    kind: 'single',
    elements: { count: [1, 1], from: 'phases', defaults: ['metal'], fixed: true },
    intent: 'sword',
    effects: [
      { stat: 'swordInsight', value: 0.3 },
      { stat: 'swordChecks', value: 2 },
    ],
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
  {
    id: 'primordial',
    name: 'Primordial Root',
    hanzi: '鸿蒙灵根',
    note: 'the qi of before the heavens were cut; every element, and the world leans in to teach you',
    grade: 'pristine',
    odds: 0.0001,
    speed: 3.5,
    kind: 'chaos',
    elements: {
      count: [5, 5],
      from: 'phases',
      defaults: ['wood', 'fire', 'earth', 'metal', 'water'],
      fixed: true,
    },
    effects: [
      { stat: 'aptitude', value: 1 },
      { stat: 'insightGain', value: 0.1 },
    ],
  },
] as const satisfies readonly RootDef[];

export type RootId = (typeof ROOTS)[number]['id'];
export type Root = RootDef & (typeof ROOTS)[number];
export type RootKind = (typeof ROOTS)[number]['kind'];

export const ROOT_IDS = ROOTS.map((r) => r.id) as unknown as readonly [RootId, ...RootId[]];

const byId = new Map<RootId, Root>(ROOTS.map((r) => [r.id, r as Root]));

export function root(id: RootId): Root {
  const r = byId.get(id);
  if (!r) throw new RangeError(`Unknown spirit root ${id}`);
  return r;
}

/** The elements a root holds when none were rolled: tests, the sims and old saves. */
export function defaultElements(id: RootId): Element[] {
  return [...root(id).elements.defaults];
}

/** A uniform draw in [0, 1); core/rng.ts's `Rng` is one. */
export interface Draw {
  next(): number;
}

/** The root a uniform roll in [0, 1) lands on, on the odds above. */
export function rollRoot(roll: number): RootId {
  let acc = 0;
  for (const r of ROOTS) {
    acc += r.odds;
    if (roll < acc) return r.id;
  }
  return 'mixed';
}

const ELEMENT_ORDER: readonly Element[] = [...FIVE_PHASES, ...MUTATED_ELEMENTS];

/**
 * The elements a root of this kind holds (design § Character creation): one for a single or
 * heavenly root, two or three for a true root, four or five for a mixed root, one of lightning,
 * ice or wind for a mutated root, all five for the chaos root; a named root's are fixed.
 */
export function rollElements(id: RootId, rng: Draw): Element[] {
  const e: RootElements = root(id).elements;
  if (e.fixed) return [...e.defaults];
  const pool: Element[] = e.from === 'mutated' ? [...MUTATED_ELEMENTS] : [...FIVE_PHASES];
  const [min, max] = e.count;
  const n = min + Math.floor(rng.next() * (max - min + 1));
  const out: Element[] = [];
  while (out.length < n && pool.length) {
    out.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]!);
  }
  // Kept in one order, so the same set always reads the same.
  return ELEMENT_ORDER.filter((x) => out.includes(x));
}
