// Formation Inscribing (design § Professions, people and powers: Sites and formations; the effect
// table's Formations row; K10, its talk with Jan and `docs/mockups/formation-study.html`). Flags
// 阵旗 and discs 阵盘 are made at the bench like any recipe, queued; the hands-on part is placing
// 布阵, when an array is laid at a site's slot or on open ground. core/arrays.ts reads an array,
// core/formations.ts lays, feeds and runs them, core/placing.ts is the placing game. Every number
// is a starting value for the sims.

/**
 * An array's eye holds its stones: a tier 1 eye 30 low, up the realm curve a tier. It burns 0.5
 * low a day at tier 1 while it runs (design: against about 1.25 low of qi a gathering array adds),
 * up the realm curve a tier; a binding or killing array waiting for something burns a tenth of it,
 * holding a beast five times it, and each turn of a fight on its ground burns a day's.
 */
export const EYE = {
  stones: 30,
  burn: 0.5,
  asleep: 0.1,
  holding: 5,
  /** A step past the vein's cap costs double upkeep (Jan's call in D4). */
  pastCap: 2,
} as const;

/** The arrays that sleep until something comes: what a trap or a killing array burns waiting. */
export const SLEEPS: readonly string[] = ['binding', 'killing', 'maze'];

/**
 * Gathering, growing and concealing: a step (a band) at tier 1, a step more a tier, and a step
 * more at gold or better (design § Sites and formations).
 */
export const STEPS = { tier: 1, gold: 1 } as const;

/**
 * The vein is a soft cap (Jan's call in K10's talk): a vein holds as many steps again as its own
 * tier, so a cave on a tier 1 vein at 4 lifts to 5. Only a gold array or better reaches past it.
 */
export const VEIN_HOLDS = 1;

/** Each array's own numbers default to these when it writes none. */
export const ARRAY_DEFAULTS = {
  steps: 1,
  /** Warding: a full qi shield at its rung over your side. */
  share: 1,
  /** Binding: held one turn in two. */
  every: 2,
  /** Maze: a third of their Accuracy. */
  dull: 1 / 3,
} as const;

/** An alarm's raid card waits twice as long, and reaches you wherever you are. */
export const ALARM_DAYS = 2;

/**
 * A passive trap on open ground (prepared ground): each day something of the land's band where it
 * stands walks across it about one day in ten, on the world's roll keyed by the spot and the day.
 * One at the trap's band or under is held until you come; a stronger one breaks through and spends
 * the eye's stones. Within this of where you stand you check it.
 */
export const TRAP = { chance: 0.1, reachLi: 60 } as const;

/** Prepared ground can't stand inside a town or a seat: open ground only, this far from a place. */
export const GROUND_CLEAR_LI = 30;

// ---------------------------------------------------------------- placing 布阵

/**
 * Placing (Jan's take A of the study, "reading the currents"): the site's ground is a lattice with
 * the eye at its middle; the vein's currents run across it, seen only within your divine sense of
 * your hand and round each flag you have planted. Flags go in one at a time, each drawing on what
 * runs under it and its line on what the line rides along; the last closes the ring, which must
 * not cross itself or a stone and must hold the eye. A flag pulled up spills a little qi. No timer
 * and nothing rolled: the hand is what you read and where you commit.
 */
export const PLACING = {
  /** The lattice: points a side, the gap between them in the scene's units. */
  side: 11,
  gap: 56,
  /** Flags a set plants, a disc's nodes. */
  nodes: { flags: 8, disc: 4 },
  currents: 3,
  rocks: 7,
  /** How far a current reaches either side, in the scene's units. */
  width: 26,
  /** Your sense round your hand at the base, and a band more a soul realm (×1.5); round a flag. */
  sense: 150,
  flagSense: 70,
  /** A flag's share of the hand, the rest the lines'. */
  flagShare: 0.4,
  /** Qi spilt by each flag pulled up. */
  spill: 0.04,
  /** A ring left open counts this much of what it holds. */
  open: 0.9,
  /** The fair scale: this share of the strongest points the ground offers, one a node. */
  fair: 0.85,
  /** A stone stands this close to a line and breaks it. */
  stone: 14,
} as const;
