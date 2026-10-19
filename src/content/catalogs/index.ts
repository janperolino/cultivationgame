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
import { BOUND_BONES, HUNDRED_REINS, LAMP_KEEPERS } from './sects.ts';
import { STONE_EYES, STONE_FOREST } from './stone-eyes.ts';
import type { Catalog } from './types.ts';

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
];

/** Everything written, catalogs and the gold and red list alike. */
const WRITERS = [...CATALOGS, RARE];

export const CATALOG_ITEMS = WRITERS.flatMap((c) => c.items ?? []);
export const CATALOG_METHODS = WRITERS.flatMap((c) => c.methods ?? []);
export const CATALOG_TECHNIQUES = WRITERS.flatMap((c) => c.techniques ?? []);
export const CATALOG_ARTS = WRITERS.flatMap((c) => c.arts ?? []);
export const CATALOG_MANUALS = WRITERS.flatMap((c) => c.manuals ?? []);
