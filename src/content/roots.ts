// Spirit roots (design § Character creation): odds, grade and qi speed. Starting values for the
// pacing sim. Character creation (P1.7) rolls them; cultivation reads the speed and the kind.

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
  },
] as const;

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
