// The mortals a template's roles name (P3.7): who they are on the road, what they carry and how
// hard they are to fool or frighten. A mortal stands at Qi Condensation layer 1, below any
// cultivator, so a mortal's threat is numbers, a bow from cover or a law behind them.

export interface MortalKind {
  name: string;
  /** Stealth help (things used) when they lie in wait: a hunter's blind, a bandit's ditch. */
  hides?: number;
  /** Silver taels they carry, fewest to most. */
  taels: readonly [number, number];
  /** What they'd sell you on the road, by item id. */
  sells?: readonly string[];
}

export const MORTALS: Readonly<Record<string, MortalKind>> = {
  'salt-peddler': {
    name: 'a salt peddler',
    taels: [20, 60],
    sells: ['travel-rations', 'millet-cake', 'dried-deer-meat'],
  },
  herder: { name: 'a herder', taels: [5, 20], sells: ['dried-deer-meat', 'felt-saddle-blanket'] },
  refugee: { name: 'a refugee', taels: [0, 3] },
  'mortal-bandit': { name: 'a mortal bandit', hides: 2, taels: [5, 30] },
  hunter: { name: 'a hunter', hides: 2, taels: [5, 25], sells: ['beast-hide', 'beast-meat'] },
  'grave-robber': { name: 'a grave robber', hides: 1, taels: [10, 40] },
  'post-rider': { name: 'a post rider of the Jing', taels: [10, 30] },
  pilgrim: { name: 'a pilgrim', taels: [2, 15] },
};
