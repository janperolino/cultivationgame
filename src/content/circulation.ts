// Circulation on the figure (design § Cultivation): the pattern the sparks run is the active qi
// method's `circulation`, with a default by rarity: gray a crude, uneven loop; white and green the
// small orbit; blue the orbit with the two arm channels; purple the full meridian net; gold the
// great orbit with a second ring through the limbs; red a named pattern of its own. Rarity also
// sets how many sparks run and how brightly. Each realm changes the vocabulary, not the count; M1
// draws Qi Condensation's alone (motes from the edge of the cave and the small orbit). A new
// pattern is an entry here. Points are in the figure's units: head at (0, −41), dantian (0, 9).
import type { RarityId } from './rarity.ts';

type Point = readonly [number, number];

export interface Circulation {
  id: string;
  name: string;
  /** Closed loops through these points, drawn as smooth curves; every loop runs through the dantian. */
  loops: readonly (readonly Point[])[];
}

const ORBIT: readonly Point[] = [
  [0, 9],
  [-5, 27],
  [-14, 12],
  [-13, -12],
  [-7, -33],
  [0, -50],
  [7, -33],
  [13, -12],
  [14, 12],
  [5, 27],
];

const mirror = (loop: readonly Point[]): Point[] => loop.map(([x, y]) => [-x, y]);

const LEFT_ARM: readonly Point[] = [
  [0, 9],
  [-8, -6],
  [-17, -21],
  [-25, -14],
  [-27, 2],
  [-21, 15],
  [-11, 14],
];
const LEFT_LEG: readonly Point[] = [
  [0, 9],
  [-14, 20],
  [-32, 24],
  [-47, 31],
  [-36, 39],
  [-14, 37],
];

export const CIRCULATIONS = {
  crude: {
    id: 'crude',
    name: 'a crude, uneven loop',
    loops: [
      [
        [0, 9],
        [-9, 23],
        [-16, 5],
        [-10, -18],
        [-9, -35],
        [3, -47],
        [6, -29],
        [16, -9],
        [9, 15],
        [7, 25],
      ],
    ],
  },
  orbit: { id: 'orbit', name: 'the small orbit', loops: [ORBIT] },
  'orbit-arms': {
    id: 'orbit-arms',
    name: 'the small orbit and the two arm channels',
    loops: [ORBIT, LEFT_ARM, mirror(LEFT_ARM)],
  },
  meridians: {
    id: 'meridians',
    name: 'the full meridian net',
    loops: [ORBIT, LEFT_ARM, mirror(LEFT_ARM), LEFT_LEG, mirror(LEFT_LEG)],
  },
  'great-orbit': {
    id: 'great-orbit',
    name: 'the great orbit, with a second ring through the limbs',
    loops: [
      ORBIT,
      [
        [0, 9],
        [-20, -2],
        [-24, -22],
        [-8, -50],
        [8, -50],
        [24, -22],
        [20, -2],
      ],
      [
        [0, 9],
        [-26, 6],
        [-45, 30],
        [0, 41],
        [45, 30],
        [26, 6],
      ],
    ],
  },
  // Red methods each have their own. The Primordial Origin Scripture turns two lobes round the
  // dantian like the first split of heaven and earth, inside the great orbit.
  primordial: {
    id: 'primordial',
    name: 'two lobes turning round the dantian, inside the great orbit',
    loops: [
      ORBIT,
      [
        [0, 9],
        [-14, -2],
        [-20, 14],
        [-8, 24],
      ],
      [
        [0, 9],
        [14, 20],
        [20, 4],
        [8, -6],
      ],
      [
        [0, 9],
        [-26, 6],
        [-45, 30],
        [0, 41],
        [45, 30],
        [26, 6],
      ],
    ],
  },
  // The Night Bridge breathing method arches from palm to palm over the crown, a bridge at night.
  'night-bridge': {
    id: 'night-bridge',
    name: 'an arch from palm to palm over the crown',
    loops: [
      [
        [0, 9],
        [-14, 14],
        [-30, 10],
        [-30, -14],
        [-20, -42],
        [0, -60],
        [20, -42],
        [30, -14],
        [30, 10],
        [14, 14],
      ],
    ],
  },
} as const satisfies Record<string, Circulation>;

export type CirculationId = keyof typeof CIRCULATIONS;

/** Each rarity's pattern when a method names none. */
export const RARITY_CIRCULATION: Record<RarityId, CirculationId> = {
  gray: 'crude',
  white: 'orbit',
  green: 'orbit',
  blue: 'orbit-arms',
  purple: 'meridians',
  gold: 'great-orbit',
  red: 'primordial',
};

/** How many sparks run at once and how brightly, by rarity: more detail inside the same realm. */
export const RARITY_SPARKS: Record<RarityId, { count: number; glow: number }> = {
  gray: { count: 3, glow: 0.7 },
  white: { count: 4, glow: 0.8 },
  green: { count: 5, glow: 0.9 },
  blue: { count: 6, glow: 1 },
  purple: { count: 8, glow: 1.05 },
  gold: { count: 11, glow: 1.15 },
  red: { count: 14, glow: 1.25 },
};

/** Where qi enters the figure: the crown and the two palms. */
export const ENTRY_POINTS: readonly Point[] = [
  [0, -52],
  [-16, 16],
  [16, 16],
];

export function circulation(id: CirculationId): Circulation {
  return CIRCULATIONS[id];
}
