// Zod schemas for the Severed Heaven atlas: the source entries in content/atlas/entries.json
// (fields in content/atlas/README.md) and the generated file src/content/generated/atlas.json.
import { z } from 'zod';
import { REALM_IDS, realmIdFromName } from '../realms.ts';

export const ENTRY_KINDS = [
  'world',
  'continent',
  'sea',
  'region',
  'kingdom',
  'power',
  'city',
  'landmark',
  'forbidden',
  'realm',
  'route',
  'era',
  'event',
  'race',
  'cosmos',
] as const;

export const WAYS = [
  'orthodox',
  'demonic',
  'buddhist',
  'ghost',
  'wild',
  'sea',
  'neutral',
  'void',
] as const;

export const TERRAINS = [
  'plains',
  'hills',
  'mountains',
  'forest',
  'jungle',
  'marsh',
  'desert',
  'steppe',
  'ice',
  'tundra',
  'volcanic',
  'plateau',
  'twilight',
  'islands',
  'coast',
  'canyon',
  'karst',
  'sea',
] as const;

export const LINE_STYLES = ['river', 'ridge', 'span', 'array', 'wall', 'road'] as const;

const point = z.tuple([z.number(), z.number()]);

export const mapSchema = z
  .object({
    x: z.number().optional(),
    y: z.number().optional(),
    /** Radius in li. */
    r: z.number().positive().optional(),
    /** Continents: the noisy ellipse's radii, rotation in degrees, seed and roughness. */
    rx: z.number().positive().optional(),
    ry: z.number().positive().optional(),
    rot: z.number().optional(),
    seed: z.number().int().optional(),
    rough: z.number().min(0).optional(),
    /** Powers: the radius of their influence in li. */
    sphere: z.number().nonnegative().optional(),
    /** Lines: rivers, ridges, spans, arrays, walls and roads. */
    path: z.array(point).min(2).optional(),
    style: z.enum(LINE_STYLES).optional(),
    width: z.number().positive().optional(),
    /** The Rim: the inner radius of its ring. */
    inner: z.number().positive().optional(),
  })
  .strict()
  .refine((m) => (m.x === undefined) === (m.y === undefined), 'x and y come together')
  .refine((m) => m.x !== undefined || m.path !== undefined, 'map needs x and y or a path');

export const yearsSchema = z
  .object({
    /** Years, negative meaning years ago; null for the Unrecorded. */
    from: z.number().nullable(),
    to: z.number(),
  })
  .strict();

const baseFields = {
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  name: z.string().min(1),
  pinyin: z.string(),
  hanzi: z.string(),
  meaning: z.string().optional(),
  kind: z.enum(ENTRY_KINDS),
  parent: z.string().nullable(),
  status: z.enum(['draft', 'canon']),
  summary: z.string(),
  lore: z.string(),
  truth: z.string(),
  tags: z.array(z.string()),
  way: z.enum(WAYS).or(z.literal('')).optional(),
  terrain: z.enum(TERRAINS).or(z.literal('')).optional(),
  map: mapSchema.optional(),
  years: yearsSchema.optional(),
};

/** One entry as it sits in content/atlas/entries.json. */
export const sourceEntrySchema = z
  .object({
    ...baseFields,
    top: z.string().optional(),
    notes: z.string().optional(),
    order: z.number().optional(),
    editedBy: z.string(),
    editedAt: z.string(),
  })
  .strict();

export type SourceEntry = z.infer<typeof sourceEntrySchema>;

// --- The strongest being awake: free-text `top` parsed into a realm and a note. ---

export const topSchema = z
  .object({
    /** A major realm, "unknown" for a deliberate mystery, or "" for no cultivator of note. */
    realm: z.enum(REALM_IDS).or(z.enum(['unknown', ''])),
    note: z.string(),
  })
  .strict();

export type Top = z.infer<typeof topSchema>;

export type TopParse = { ok: true; top: Top } | { ok: false; error: string };

/**
 * Parses "Realm (note)", "Realm", "unknown (note)", "unknown" or "" into a strict realm and a note.
 * A missing `top` counts as empty.
 */
export function parseTop(text: string | undefined): TopParse {
  const s = (text ?? '').trim();
  if (s === '') return { ok: true, top: { realm: '', note: '' } };
  const m = /^([^()]+?)\s*(?:\((.*)\))?$/s.exec(s);
  if (!m) return { ok: false, error: `can't split "${s}" into a realm and a note` };
  const head = m[1] ?? '';
  const note = (m[2] ?? '').trim();
  if (head === 'unknown') return { ok: true, top: { realm: 'unknown', note } };
  const realm = realmIdFromName(head);
  if (!realm) return { ok: false, error: `"${head}" is not a realm name` };
  return { ok: true, top: { realm, note } };
}

// --- The generated file. ---

/** One entry in the generated atlas: bookkeeping dropped, `top` parsed. `truth` stays for the narrator. */
export const atlasEntrySchema = z.object({ ...baseFields, top: topSchema }).strict();

export type AtlasEntry = z.infer<typeof atlasEntrySchema>;

/** A ring of [x, y] points in li, not closed (the last point doesn't repeat the first). */
const ring = z.array(point).min(3);
/** An outer ring followed by any holes. */
const polygon = z.array(ring).min(1);

export const shapeSchema = z.discriminatedUnion('type', [
  /** Continent coasts, land region cells clipped to the coast, kingdoms and forbidden lands. */
  z.object({ type: z.literal('area'), polygons: z.array(polygon).min(1) }).strict(),
  /** Sea zones and the Scar. */
  z.object({ type: z.literal('circle'), x: z.number(), y: z.number(), r: z.number() }).strict(),
  /** The Rim: a ring between `inner` and `r`. */
  z
    .object({
      type: z.literal('annulus'),
      x: z.number(),
      y: z.number(),
      r: z.number(),
      inner: z.number(),
    })
    .strict(),
]);

export type Shape = z.infer<typeof shapeSchema>;

export const GENERATED_ATLAS_VERSION = 1;

export const generatedAtlasSchema = z
  .object({
    version: z.literal(GENERATED_ATLAS_VERSION),
    /** Coordinates in shapes are rounded to this many li. */
    precision: z.number(),
    entries: z.array(atlasEntrySchema),
    /** Fixed outlines by entry id. */
    shapes: z.record(z.string(), shapeSchema),
  })
  .strict();

export type GeneratedAtlas = z.infer<typeof generatedAtlasSchema>;
