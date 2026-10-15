// The catalog format (design § Catalogs by place, P3.5; Jan's call in its talk: written by hand,
// one place at a time, rather than generated). A catalog belongs to one atlas entry, a continent,
// a region or a place, or carries imports into a region along a tie, and holds two things: the
// things it writes (items, methods, techniques, their Arts, and loose manuals) and its lots, which
// say which shops stock each thing and how often. A shop draws on its place's catalog, its region's,
// its continent's and the region's imports, weighted by its kind (content/shops.ts). A new place is
// a new catalog file, not new code.
import type { Item } from '../items.ts';
import type { ArtNodeDef, ManualDef } from '../manuals.ts';
import type { Method } from '../methods.ts';
import type { ShopKind } from '../shops.ts';
import type { Technique } from '../techniques.ts';

export const LAYERS = ['continent', 'region', 'place', 'import'] as const;
export type Layer = (typeof LAYERS)[number];

/**
 * One thing a catalog offers: an item id (whose rarity is rolled inside its range when it has
 * `upTo`) or a copy id ("method:pine-wind", "technique:undertow-palm", "manual:tide-counting").
 */
export interface Lot {
  thing: string;
  /** The shops that stock it; empty for a thing found only as loot, in rings and in ruins. */
  shops: readonly ShopKind[];
  /** How often it comes up against the other lots of its layer: 1 unless set. */
  weight?: number;
  /** How many come in one lot: pills and herbs by the handful. One unless set. */
  count?: readonly [min: number, max: number];
}

/** A technique's Art, written beside the technique: its passives, waking as it masters. */
export interface ArtDef {
  technique: string;
  nodes: readonly ArtNodeDef[];
}

export interface Catalog {
  /** The atlas entry it belongs to: the continent, region or place; for imports, the region they reach. */
  at: string;
  layer: Layer;
  /** For imports: the atlas entry the goods come from, and how they travel. */
  from?: string;
  via?: string;
  items?: readonly Item[];
  methods?: readonly Method[];
  techniques?: readonly Technique[];
  arts?: readonly ArtDef[];
  manuals?: readonly ManualDef[];
  lots: readonly Lot[];
}
