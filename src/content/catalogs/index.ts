// Every catalog (content/catalogs/types.ts), and the things they write, for the content modules
// to add to their lookups. A new place is a new file here and a line in this list.
import { BORDER_WILDS } from './border-wilds.ts';
import { BORDER_WILDS_IMPORTS } from './imports.ts';
import { BUTCHER_GATE } from './gate.ts';
import { GUARDED_MOUTH } from './guarded-mouth.ts';
import { SPIRIT_HERDERS } from './herders.ts';
import { MARCH, PILED_BONES_WALL } from './march.ts';
import { MORNING_STAR } from './morning-star.ts';
import { NIGHT_BRIDGE } from './night-bridge.ts';
import { RARE } from './rare.ts';
import {
  EBB_HARBOR,
  HEAVENS_EYE,
  NAMELESS_MARKET,
  RIVER_BEND,
  THOUSAND_PADDOCKS,
} from './seats.ts';
import { BOUND_BONES, FRONTIER_HALL, HUNDRED_REINS, LAMP_KEEPERS, RED_MARROW } from './sects.ts';
import { STONE_EYES, STONE_FOREST } from './stone-eyes.ts';
import { CROPS, seedId } from '../farming.ts';
import type { Catalog, Lot, Recipe } from './types.ts';

/** A recipe's slip 丹方 as a manual id (content/manuals.ts writes it from the recipe, K1). */
export const slipId = (output: string) => `recipe-${output}`;

/**
 * A recipe's slip stands where its good is sold, by the same doors and a third as often (K1's
 * talk), so a sect's own pill's slip is guarded as its methods are (core/markets.ts `guardedBy`).
 */
function withSlips(c: Catalog): Catalog {
  if (!c.recipes?.length) return c;
  const slips: Lot[] = c.recipes.map((r) => {
    const line = c.lots.find((l) => l.thing === r.output);
    return {
      thing: `manual:${slipId(r.output)}`,
      shops: line?.shops ?? [],
      weight: (line?.weight ?? 1) / 3,
    };
  });
  return { ...c, lots: [...c.lots, ...slips] };
}

/**
 * A crop's recipe and its packet (K8): written beside the first line that sells it, sown from one
 * packet, and the packet sold by the same doors as often as its crop.
 */
const cropsWritten = new Set<string>();
function withCrops(c: Catalog): Catalog {
  const recipes: Recipe[] = [];
  const lots: Lot[] = [];
  for (const l of c.lots) {
    const crop = CROPS[l.thing];
    if (!crop || !l.shops.length || cropsWritten.has(l.thing)) continue;
    cropsWritten.add(l.thing);
    const seed = seedId(l.thing);
    recipes.push({
      output: l.thing,
      craft: 'farming',
      family: crop.family,
      inputs: [{ thing: seed, count: 1 }],
    });
    lots.push({
      thing: seed,
      shops: l.shops,
      ...(l.weight !== undefined ? { weight: l.weight } : {}),
    });
  }
  if (!recipes.length) return c;
  return { ...c, recipes: [...(c.recipes ?? []), ...recipes], lots: [...c.lots, ...lots] };
}

export const CATALOGS: readonly Catalog[] = [
  MORNING_STAR,
  BORDER_WILDS,
  ...BORDER_WILDS_IMPORTS,
  GUARDED_MOUTH,
  MARCH,
  PILED_BONES_WALL,
  BUTCHER_GATE,
  SPIRIT_HERDERS,
  NIGHT_BRIDGE,
  STONE_EYES,
  STONE_FOREST,
  RIVER_BEND,
  THOUSAND_PADDOCKS,
  HEAVENS_EYE,
  EBB_HARBOR,
  NAMELESS_MARKET,
  HUNDRED_REINS,
  BOUND_BONES,
  LAMP_KEEPERS,
  RED_MARROW,
  FRONTIER_HALL,
]
  .map(withCrops)
  .map(withSlips);

/** Everything written, catalogs and the gold and red list alike. */
const WRITERS = [...CATALOGS, RARE];

export const CATALOG_RECIPES = WRITERS.flatMap((c) => c.recipes ?? []);

export const CATALOG_ITEMS = WRITERS.flatMap((c) => c.items ?? []);
export const CATALOG_METHODS = WRITERS.flatMap((c) => c.methods ?? []);
export const CATALOG_TECHNIQUES = WRITERS.flatMap((c) => c.techniques ?? []);
export const CATALOG_ARTS = WRITERS.flatMap((c) => c.arts ?? []);
export const CATALOG_MANUALS = WRITERS.flatMap((c) => c.manuals ?? []);
