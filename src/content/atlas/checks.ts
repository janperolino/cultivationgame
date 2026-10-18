// The atlas rules that read across entries: terrain falling back to an ancestor's, ties written
// on both ends (content/atlas/README.md, How things connect), and a top above what its place
// keeps. Pure, so the build and the tests share them.
import { realmIndex } from '../realms.ts';
import {
  LAND_KINDS,
  PLACE_KINDS,
  TERRAINS,
  parseTop,
  type EntryKind,
  type Tie,
  type Top,
} from './schema.ts';

type Terrain = (typeof TERRAINS)[number];

/** The fields these checks read; source and generated entries both fit. */
export interface CheckedEntry {
  id: string;
  kind: EntryKind;
  parent: string | null;
  status: 'draft' | 'canon';
  terrain?: Terrain | '';
  qiDensity?: number;
  map?: unknown;
  access?: { of?: string };
  ties?: Tie[];
  vein?: number;
  /** As written in the source, or parsed in the generated atlas. */
  top?: string | Top;
}

/**
 * The vein tier that keeps a realm (design § The world map, The atlas as data): tier n keeps realm
 * n, 1 for Qi Condensation up to 9 for Tribulation Transcendence.
 */
export function veinKeeping(top: Top): number | null {
  if (top.realm === '' || top.realm === 'unknown') return null;
  return realmIndex(top.realm) + 1;
}

/** The kinds whose vein is their strongest place's, never written. */
export const VEIN_FROM_PLACES: readonly EntryKind[] = ['continent', 'region'];

/**
 * Each entry's vein: its own, or for a region or continent the strongest written anywhere
 * under it. Entries with none are left out.
 */
export function resolveVein(entries: readonly CheckedEntry[]): Map<string, number> {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const out = new Map<string, number>();
  for (const e of entries) {
    if (e.vein === undefined || VEIN_FROM_PLACES.includes(e.kind)) continue;
    out.set(e.id, Math.max(out.get(e.id) ?? 0, e.vein));
    const seen = new Set<string>([e.id]);
    for (let at = e.parent === null ? undefined : byId.get(e.parent); at && !seen.has(at.id);) {
      seen.add(at.id);
      if (VEIN_FROM_PLACES.includes(at.kind)) out.set(at.id, Math.max(out.get(at.id) ?? 0, e.vein));
      at = at.parent === null ? undefined : byId.get(at.parent);
    }
  }
  return out;
}

/**
 * Each place's terrain: its own, or else its nearest ancestor's (a kingdom takes its region's, a
 * region its continent's). Places with none anywhere up the chain are left out.
 */
export function resolveTerrain(entries: readonly CheckedEntry[]): Map<string, Terrain> {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const out = new Map<string, Terrain>();
  for (const e of entries) {
    if (!PLACE_KINDS.includes(e.kind)) continue;
    const seen = new Set<string>();
    for (let at: CheckedEntry | undefined = e; at && !seen.has(at.id);) {
      seen.add(at.id);
      if (at.terrain) {
        out.set(e.id, at.terrain);
        break;
      }
      at = at.parent === null ? undefined : byId.get(at.parent);
    }
  }
  return out;
}

/** Qi density where none is written anywhere up the parents: ordinary. */
export const DEFAULT_QI_DENSITY = 5;

/** Every place's qi density: its own, or its nearest ancestor's, or ordinary (5). */
export function resolveQiDensity(entries: readonly CheckedEntry[]): Map<string, number> {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const out = new Map<string, number>();
  for (const e of entries) {
    if (!PLACE_KINDS.includes(e.kind)) continue;
    let v = DEFAULT_QI_DENSITY;
    const seen = new Set<string>();
    for (let at: CheckedEntry | undefined = e; at && !seen.has(at.id);) {
      seen.add(at.id);
      if (at.qiDensity !== undefined) {
        v = at.qiDensity;
        break;
      }
      at = at.parent === null ? undefined : byId.get(at.parent);
    }
    out.set(e.id, v);
  }
  return out;
}

export interface AtlasReport {
  /** Broken references: the build stops on these. */
  errors: string[];
  /** One-sided or mismatched ties, empty whys, untied canon entries, land with no terrain. */
  warnings: string[];
  /** Draft entries with no tie yet, by kind, waiting for the atlas fill. */
  untiedDrafts: Partial<Record<EntryKind, number>>;
}

export function checkAtlas(entries: readonly CheckedEntry[]): AtlasReport {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const errors: string[] = [];
  const warnings: string[] = [];
  const untiedDrafts: Partial<Record<EntryKind, number>> = {};

  const terrain = resolveTerrain(entries);
  for (const e of entries)
    if (LAND_KINDS.includes(e.kind) && e.map && !terrain.has(e.id))
      warnings.push(`${e.id}: on the map with no terrain, and none up its parents`);

  const veins = resolveVein(entries);
  for (const e of entries) {
    if (e.vein !== undefined && VEIN_FROM_PLACES.includes(e.kind))
      errors.push(`${e.id}: a ${e.kind}'s vein is its strongest place's, so don't write one`);
    const vein = veins.get(e.id);
    if (vein !== undefined) {
      const parsed =
        typeof e.top === 'object' ? { ok: true as const, top: e.top } : parseTop(e.top);
      const needs = parsed.ok ? veinKeeping(parsed.top) : null;
      if (parsed.ok && needs !== null && needs > vein && !parsed.top.note)
        warnings.push(
          `${e.id}: its top needs a tier ${needs} vein and it sits on tier ${vein}; say why in the top's note (duty, gain, a dead end, hiding, a beast's lair)`,
        );
    }
    if (e.access?.of !== undefined && !byId.has(e.access.of))
      errors.push(`${e.id}: access.of "${e.access.of}" doesn't exist`);

    const ties = e.ties ?? [];
    if (ties.length === 0) {
      if (e.status === 'canon') warnings.push(`${e.id}: no ties`);
      else untiedDrafts[e.kind] = (untiedDrafts[e.kind] ?? 0) + 1;
    }
    const seen = new Set<string>();
    for (const t of ties) {
      if (t.to === e.id) errors.push(`${e.id}: tied to itself`);
      if (seen.has(t.to)) errors.push(`${e.id}: two ties to ${t.to}; keep one a pair`);
      seen.add(t.to);
      if (!t.why.trim()) warnings.push(`${e.id} → ${t.to}: the why is empty`);
      const other = byId.get(t.to);
      if (!other) {
        errors.push(`${e.id}: tie to "${t.to}", which doesn't exist`);
        continue;
      }
      const back = other.ties?.find((b) => b.to === e.id);
      if (!back) warnings.push(`${e.id} → ${t.to}: written on one end only`);
      // Report a mismatch once, from the end whose id sorts first.
      else if (e.id < other.id && (back.kind !== t.kind || back.open !== t.open))
        warnings.push(
          `${e.id} ↔ ${t.to}: the ends disagree (${t.kind}, ${t.open ? 'open' : 'hidden'} against ${back.kind}, ${back.open ? 'open' : 'hidden'})`,
        );
    }
  }
  return { errors, warnings, untiedDrafts };
}
