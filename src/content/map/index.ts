// The regions the travel map can draw: each one's atlas outline and places (written by
// `npm run atlas:build` into src/content/generated/regions/) beside the content written below the
// atlas. A new region is a generated file and a content entry, not new code.
import type { Population } from '../atlas/schema.ts';
import bianhuang from '../generated/regions/qm-bianhuang.json';
import { BORDER_WILDS, type RegionContent } from './border-wilds.ts';

type Ring = [number, number][];

/** An atlas place as the region file carries it. */
export interface RegionPlace {
  id: string;
  name: string;
  pinyin: string;
  hanzi: string;
  kind: string;
  /** A hand-written site's sub-kind (the atlas's `site`), null for any other kind. */
  site?: string | null;
  terrain: string | null;
  qiDensity: number | null;
  /** The tier of the strongest spirit vein it sits on, null when it names none. */
  vein: number | null;
  /** The atlas entry it stands under. */
  parent: string | null;
  /** How well-off it is, 1 to 9: its own or its nearest ancestor's (design § Economy, Prosperity). */
  prosperity: number;
  /** Who lives there, as the atlas counts them (design § World bible, How many live there). */
  population: Population | null;
  hidden: boolean | string | null;
  access: unknown;
  top: string;
  famous: boolean;
  summary: string;
  lore: string;
  features: readonly { name: string; tags: readonly string[] }[];
  x: number | null;
  y: number | null;
  sphere: number | null;
  outline: Ring[][] | null;
}

/** A region's generated file: its outline, the land round it, and its places. */
export interface RegionFile {
  version: number;
  id: string;
  name: string;
  hanzi: string;
  terrain: string;
  qiDensity: number;
  prosperity: number;
  top: string;
  bbox: [number, number, number, number];
  outline: Ring[][];
  land: Ring[][];
  places: RegionPlace[];
  /** The regions and seas next door, named faintly through the fog (A5, design § The travel map). */
  nextDoor?: NextDoor[];
}

/** A region or sea next door: its name sits at `at`; a region's edge is drawn dotted. */
export interface NextDoor {
  id: string;
  kind: 'region' | 'sea';
  name: string;
  hanzi: string;
  at: [number, number];
  outline?: Ring[][];
}

export interface RegionData {
  file: RegionFile;
  content: RegionContent;
}

export const REGIONS: Readonly<Record<string, RegionData>> = {
  'qm-bianhuang': { file: bianhuang as unknown as RegionFile, content: BORDER_WILDS },
};

export const HOME_MAP_REGION = 'qm-bianhuang';

export function regionData(id: string): RegionData | undefined {
  return REGIONS[id];
}

/**
 * The vein a written town or an atlas place sits on, 0 for none (design § Economy, Prosperity: the
 * vein sets the grade its market pays in).
 */
export function veinAt(id: string | null | undefined): number {
  if (!id) return 0;
  for (const r of Object.values(REGIONS)) {
    const t = r.content.towns.find((x) => x.id === id);
    if (t) return t.vein;
    const p = r.file.places.find((x) => x.id === id);
    if (p) return p.vein ?? 0;
  }
  return 0;
}

/**
 * The atlas entries a written town or an atlas place stands under, nearest first: the March for
 * Pacified Fort, then the Border Wilds. Empty for a place the regions don't write.
 */
export function parentsOf(id: string | null | undefined): string[] {
  const out: string[] = [];
  let at = id ?? null;
  for (let i = 0; at && i < 12; i++) {
    let parent: string | null | undefined;
    for (const r of Object.values(REGIONS)) {
      parent = r.content.towns.find((x) => x.id === at)?.parent;
      if (parent === undefined) parent = r.file.places.find((x) => x.id === at)?.parent;
      if (parent !== undefined) break;
    }
    if (!parent || out.includes(parent)) break;
    out.push(parent);
    at = parent;
  }
  return out;
}

/** A power's seat and the radius of its influence in li, where the atlas writes one (O5). */
export function sphereOf(id: string): { x: number; y: number; sphere: number } | null {
  for (const r of Object.values(REGIONS)) {
    const p = r.file.places.find((x) => x.id === id);
    if (p && p.x !== null && p.y !== null && p.sphere) return { x: p.x, y: p.y, sphere: p.sphere };
  }
  return null;
}

/** Who lives at a written town or an atlas place: its mortals and its cultivators by realm. */
export function peopleAt(id: string | null | undefined): Population {
  if (!id) return {};
  for (const r of Object.values(REGIONS)) {
    const t = r.content.towns.find((x) => x.id === id);
    if (t) return t.population;
    const p = r.file.places.find((x) => x.id === id);
    if (p) return p.population ?? {};
  }
  return {};
}
