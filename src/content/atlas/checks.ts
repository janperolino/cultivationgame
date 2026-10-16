// The atlas rules that read across entries: terrain falling back to an ancestor's, and ties
// written on both ends (content/atlas/README.md, How things connect). Pure, so the build and
// the tests share them.
import { LAND_KINDS, PLACE_KINDS, TERRAINS, type EntryKind, type Tie } from './schema.ts';

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

  for (const e of entries) {
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
