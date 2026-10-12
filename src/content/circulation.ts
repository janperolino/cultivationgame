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

// Every loop stays inside the seated silhouette (ui/qiCanvas.ts, FIGURE_PATH): the torso runs
// x −11 to 11 between the gaps at the waist, the neck is ±5 wide at y −31, the arms sit between the
// gaps and the outline, and the crossed legs fill the lap below y 15. The canvas also clips to it.

/** The small orbit: up the back and over the crown, down the front to the dantian. */
const ORBIT: readonly Point[] = [
  [0, 9],
  [-5, 21],
  [-10, 12],
  [-10, -8],
  [-8, -19],
  [-3, -27],
  [-3, -38],
  [0, -47],
  [3, -38],
  [3, -27],
  [8, -19],
  [10, -8],
  [10, 12],
  [5, 21],
];

const mirror = (loop: readonly Point[]): Point[] => loop.map(([x, y]) => [-x, y]);

/** Up the chest to the shoulder, down the arm and back across the lap. */
const LEFT_ARM: readonly Point[] = [
  [0, 9],
  [-6, -4],
  [-12, -17],
  [-19, -20],
  [-24, -10],
  [-25, 2],
  [-25, 12],
  [-14, 14],
];
/** Out along the crossed leg and back under it. */
const LEFT_LEG: readonly Point[] = [
  [0, 12],
  [-14, 19],
  [-30, 25],
  [-43, 31],
  [-40, 37],
  [-22, 38],
  [-8, 31],
];
/** The great orbit's second ring, round through the crossed legs; the arms carry their channels. */
const LIMB_RING: readonly Point[] = [
  [0, 14],
  [-22, 17],
  [-44, 31],
  [-30, 38],
  [0, 39],
  [30, 38],
  [44, 31],
  [22, 17],
];

export const CIRCULATIONS = {
  crude: {
    id: 'crude',
    name: 'a crude, uneven loop',
    loops: [
      [
        [0, 9],
        [-7, 20],
        [-10, 7],
        [-10, -10],
        [-7, -21],
        [-3, -29],
        [-2, -43],
        [3, -45],
        [3, -30],
        [9, -17],
        [10, -3],
        [8, 14],
        [4, 21],
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
    loops: [ORBIT, LEFT_ARM, mirror(LEFT_ARM), LIMB_RING],
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
        [-8, 1],
        [-10, 13],
        [-4, 18],
      ],
      [
        [0, 9],
        [8, 17],
        [10, 5],
        [4, 0],
      ],
      LIMB_RING,
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
        [-24, 11],
        [-25, -6],
        [-20, -19],
        [-8, -23],
        [-3, -28],
        [-3, -37],
        [0, -47],
        [3, -37],
        [3, -28],
        [8, -23],
        [20, -19],
        [25, -6],
        [24, 11],
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
