// Crafts (design § Professions, people and powers: Crafts, thin; Recipes; A batch; The effect
// table and experimentation): the five crafts, the recipe families each one's mastery is kept by,
// the eighteen properties an ingredient carries and what they make, and a batch's numbers. One
// engine reads them all (core/crafts.ts); a recipe is data written beside its catalog line
// (content/catalogs/types.ts, `Recipe`). K1 builds alchemy; the other crafts' families are named
// so their phases add recipes, not shapes. Every number is the design's; the sims tune them.
import { CATALOG_RECIPES } from './catalogs/index.ts';
import type { Recipe } from './catalogs/types.ts';
import type { Element } from './elements.ts';
import { baseOf, item, type ItemKind } from './items.ts';

export const CRAFTS = {
  alchemy: { name: 'Alchemy', hanzi: '丹', tool: 'furnace', page: 'Alchemy' },
  refining: { name: 'Artifact Refining', hanzi: '器', tool: 'forge', page: 'Refining' },
  talismans: { name: 'Talisman Drawing', hanzi: '符', tool: 'brush', page: 'Talismans' },
  formations: {
    name: 'Formation Inscribing',
    hanzi: '阵',
    tool: 'array plate',
    page: 'Formations',
  },
  farming: { name: 'Spirit Farming', hanzi: '植', tool: 'field', page: 'Farming' },
} as const;
export type CraftId = keyof typeof CRAFTS;
export const CRAFT_IDS = Object.keys(CRAFTS) as [CraftId, ...CraftId[]];

/**
 * The families mastery is kept by (Jan's call in D4: per family, not per recipe; K1's talk named
 * sixteen). Every recipe in a family works at the family's level. Alchemy's are built in K1; the
 * Breakthrough pills wait on Core Formation's design session, and the rest on their crafts' phases.
 */
export const FAMILIES = {
  'qi-pills': { craft: 'alchemy', name: 'Qi pills', hanzi: '聚气' },
  'tempering-pills': { craft: 'alchemy', name: 'Tempering pills', hanzi: '炼体' },
  'soul-pills': { craft: 'alchemy', name: 'Soul pills', hanzi: '养魂' },
  'healing-pills': { craft: 'alchemy', name: 'Healing pills', hanzi: '疗伤' },
  'breakthrough-pills': { craft: 'alchemy', name: 'Breakthrough pills', hanzi: '破境' },
  blades: { craft: 'refining', name: 'Blades', hanzi: '兵' },
  armor: { craft: 'refining', name: 'Armor', hanzi: '甲' },
  vessels: { craft: 'refining', name: 'Vessels and treasures', hanzi: '宝' },
  strikes: { craft: 'talismans', name: 'Strikes', hanzi: '攻' },
  wards: { craft: 'talismans', name: 'Wards', hanzi: '护' },
  passage: { craft: 'talismans', name: 'Passage', hanzi: '行' },
  gathering: { craft: 'formations', name: 'Gathering arrays', hanzi: '聚' },
  guarding: { craft: 'formations', name: 'Guarding and concealing', hanzi: '守' },
  trapping: { craft: 'formations', name: 'Trapping and killing', hanzi: '杀' },
  grain: { craft: 'farming', name: 'Grain', hanzi: '谷' },
  herbs: { craft: 'farming', name: 'Herbs', hanzi: '药' },
} as const satisfies Record<string, { craft: CraftId; name: string; hanzi: string }>;
export type FamilyId = keyof typeof FAMILIES;
export const FAMILY_IDS = Object.keys(FAMILIES) as [FamilyId, ...FamilyId[]];

/** The eighteen properties an ingredient carries one or two of (The effect table). */
export const PROPERTIES = [
  'nourishing',
  'tempering',
  'soul-calming',
  'restoring',
  'mending',
  'purging',
  'toxic',
  'sharp',
  'hard',
  'light',
  'swift',
  'binding',
  'burning',
  'chilling',
  'concealing',
  'spatial',
  'resonant',
  'illusory',
] as const;
export type Property = (typeof PROPERTIES)[number];

/**
 * Alchemy's row of the effect table: the property a pill's effect is made of. A written recipe
 * holds an input carrying it, which a test checks (content/crafts.test.ts).
 */
export const ALCHEMY_MAKES = {
  'fuel:qi': 'nourishing',
  'fuel:body': 'tempering',
  'fuel:soul': 'soul-calming',
  'restore:qi': 'restoring',
  'restore:hp': 'mending',
  detox: 'purging',
} as const satisfies Record<string, Property>;

/** The kind of tool each craft works with: a furnace, a forge, a brush and an array plate. */
export const TOOL_KIND: ItemKind = 'tool';

/**
 * A batch (A batch): craft hours and yield at tier 1, each tier up ×1.5 the hours. A furnace brews
 * 10 pills in 3 craft hours, a talisman desk 5 sheets in 2, a weapon or armor piece takes 8.
 */
export const BATCH = {
  alchemy: { hours: 3, yield: 10 },
  refining: { hours: 8, yield: 1 },
  talismans: { hours: 2, yield: 5 },
  formations: { hours: 4, yield: 1 },
  farming: { hours: 0, yield: 0 },
} as const satisfies Record<CraftId, { hours: number; yield: number }>;
export const TIER_HOURS = 1.5;

/** Whether a batch holds at your tier, by the family's mastery, Glimpse to Origin. */
export const HOLDS = [0.5, 0.7, 0.85, 0.95, 0.99] as const;
/**
 * The tier against yours: a recipe a tier below adds 15 points, two or more below 25, one above
 * (where your soul reaches it) takes 30. A matched soul multiplies, and nothing passes 99%.
 */
export const TIER_ODDS = { below: 0.15, farBelow: 0.25, above: -0.3 } as const;
export const MATCHED_SOUL = 1.25;
export const MAX_HOLD = 0.99;

/**
 * A failed batch loses its inputs; one in five is a blow-up that cracks the tool (one in ten with
 * a matched soul), a tenth of its worth to mend at a refiner.
 */
export const BLOW_UP = { share: 0.2, matched: 0.1, mend: 0.1 } as const;

/**
 * Rarity is lift in bands from the recipe's floor (only the fraction rolled): +0.25 a mastery
 * level past Glimpse and +1 at Origin, +0.5 when every input is a rarity above the floor, +0.25 a
 * band of the tool above white. The steady hand and the land add theirs (K3, below).
 */
export const LIFT = { mastery: [0, 0.25, 0.5, 0.75, 1], inputs: 0.5, toolBand: 0.25 } as const;

/**
 * The steady hand (K3; design § Crafts, thin, the hands-on version): played at the bench, a hand
 * from 0 to 1 adds the hand times Steady hands' reach to the lift, never to whether a batch holds.
 * The reach is one band at the base, raised by the craft's Hand nodes, `craftPrecision` one for
 * one and a matched soul, never past two (Jan's guardrail). Hand's lift and the element Daos'
 * craft side paths count only by hand too (K3's talk).
 */
export const HAND = { base: 1, matched: 0.25, most: 2 } as const;

/**
 * Places lend a hand (design § A batch, Jan's call): earth fire 地火 on volcanic land adds lift
 * and holding to alchemy and refining; a land whose element is a recipe's does the same for it;
 * a written site may give up to half a band.
 */
export const LAND = { lift: 0.25, hold: 0.1, siteMost: 0.5 } as const;
export const EARTH_FIRE_CRAFTS: readonly CraftId[] = ['alchemy', 'refining'];
export const EARTH_FIRE_TERRAIN = 'volcanic';

/**
 * The element a land carries, by its terrain (K3's small call; spirit farming's plots read it
 * too). Only lands with a plain element of their own carry one: hills, plains and the like don't.
 */
export const LAND_ELEMENT: Readonly<Record<string, Element>> = {
  volcanic: 'fire',
  marsh: 'water',
  coast: 'water',
  islands: 'water',
  sea: 'water',
  forest: 'wood',
  jungle: 'wood',
  karst: 'earth',
  canyon: 'earth',
  ice: 'ice',
  tundra: 'ice',
};

/**
 * Written sites that lend a hand: a famous furnace cave, a sect's earth-fire hall. Keyed by the
 * atlas place they stand at, each with its lift (up to `LAND.siteMost`) and the crafts it serves.
 * None in the Border Wilds yet; sites (K9) write them.
 */
export const CRAFT_SITES: Readonly<
  Record<string, { name: string; lift: number; crafts: readonly CraftId[] }>
> = {};

/** Yield: +10% a mastery level past Glimpse, +40% at Origin. The Dao's +5% a tier is K2's. */
export const YIELD_BY_MASTERY = [0, 0.1, 0.2, 0.3, 0.4] as const;

/**
 * Mastery grows by batches: Comprehension at 10, Mastery at 40, Perfection at 120, Origin at 300.
 * A batch at your tier counts 1, one below a quarter, a failed one half. Each level reached
 * releases insight, as a technique's does.
 */
export const CRAFT_MASTERY = {
  batches: [0, 10, 40, 120, 300],
  burst: [0, 5, 20, 60, 150],
  below: 0.25,
  failed: 0.5,
} as const;

/** How many of a family's batches the Crafts page lists as the bench's recent work. */
export const RECENT_BATCHES = 8;

/**
 * A recipe slip 丹方 (Recipes): a manual of one node read on study hours; its node costs this much
 * insight at white tier 1, ×1.5 a rarity step and ×3 a tier.
 */
export const SLIP_INSIGHT = 25;

// ---------------------------------------------------------------- the recipes

const byOutput = new Map(CATALOG_RECIPES.map((r) => [r.output, r]));

/** Every written recipe, by the catalogs' order. */
export const RECIPES: readonly Recipe[] = CATALOG_RECIPES;

export function hasRecipe(id: string): boolean {
  return byOutput.has(id);
}

/** A recipe by its id, which is its output's. */
export function recipe(id: string): Recipe {
  const r = byOutput.get(id);
  if (!r) throw new RangeError(`Unknown recipe ${id}`);
  return r;
}

/** The recipe a made thing (a variant included) is brewed by, if any. */
export function recipeFor(thing: string): Recipe | null {
  return byOutput.get(baseOf(thing)) ?? null;
}

/** A recipe's tier: its output's. */
export function recipeTier(r: Recipe): number {
  return item(r.output).tier;
}

/** Craft hours a batch takes: its own, or its craft's at tier 1 ×1.5 a tier up. */
export function recipeHours(r: Recipe): number {
  return r.hours ?? BATCH[r.craft].hours * TIER_HOURS ** (recipeTier(r) - 1);
}

/** Pieces a batch makes before mastery: its own, or its craft's. */
export function recipeYield(r: Recipe): number {
  return r.yield ?? BATCH[r.craft].yield;
}

/**
 * A recipe's element (K3's small call): the element most of its inputs carry, counted by
 * pieces, or none when no element leads or none carries one.
 */
export function recipeElement(r: Recipe): Element | null {
  const count = new Map<Element, number>();
  for (const i of r.inputs) {
    const e = item(i.thing).element;
    if (e) count.set(e, (count.get(e) ?? 0) + i.count);
  }
  const ranked = [...count].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0 || ranked[1]?.[1] === ranked[0]![1]) return null;
  return ranked[0]![0];
}
