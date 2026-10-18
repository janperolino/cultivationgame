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
  'site',
] as const;

export type EntryKind = (typeof ENTRY_KINDS)[number];

/** Kinds that are places on the map: they may carry terrain, hidden, access, features and famous. */
export const PLACE_KINDS: readonly EntryKind[] = [
  'continent',
  'sea',
  'region',
  'kingdom',
  'power',
  'city',
  'landmark',
  'forbidden',
  'realm',
  'site',
];

/** Places on land, which always have a terrain, their own or their nearest ancestor's. */
export const LAND_KINDS: readonly EntryKind[] = PLACE_KINDS.filter((k) => k !== 'sea');

/** A site's sub-kind: the small places each kingdom seeds, or a hand-written one (design § The world map). */
export const SITE_KINDS = [
  'town',
  'village',
  'cave',
  'den',
  'ruin',
  'shrine',
  'herb-valley',
  // The travel map's kinds (P3.6's talk): wild sites seeded from the tables, a wild's hearts, and
  // the posts and crossings on its roads.
  'spring',
  'falls',
  'peak',
  'camp',
  'hut',
  'mine',
  'tomb',
  'tree',
  'stele',
  'heart',
  'checkpoint',
  'ferry',
] as const;

export const TIE_KINDS = [
  'enemy',
  'ally',
  'trade',
  'kin',
  'patron',
  'debt',
  'feud',
  'secret',
] as const;

/**
 * Tags on a scene feature (design § The world, Scene templates). A starting list from the design's
 * examples, plus `narrow` for a chokepoint; P3.6 and P3.7 grow it as their tables need.
 */
export const FEATURE_TAGS = [
  'fire',
  'burnable',
  'height',
  'fall',
  'water',
  'crossing',
  'cover',
  'witnesses',
  'fragile',
  'dark',
  'narrow',
] as const;

/** What opens a gated place; forcing it is always open to a realm above the array's rating. */
export const ACCESS_BY = ['token', 'rank', 'invitation', 'toll'] as const;

/** What a secret realm can ask of whoever enters, any one sufficing. Grows with the realms. */
export const ACCESS_NEEDS = ['beast-blood', 'bonded-beast'] as const;

export const STONE_GRADES = ['low', 'mid', 'high', 'top'] as const;

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

const realmId = z.enum(REALM_IDS);

export const tieSchema = z
  .object({
    /** The other entry's id; it carries the same tie back. */
    to: z.string().min(1),
    kind: z.enum(TIE_KINDS),
    /** False for a tie nobody outside knows of. */
    open: z.boolean(),
    /** This side's one-line view of the tie: who wants what from whom. */
    why: z.string(),
  })
  .strict();

export type Tie = z.infer<typeof tieSchema>;

export const featureSchema = z
  .object({
    name: z.string().min(1),
    tags: z.array(z.enum(FEATURE_TAGS)).min(1),
  })
  .strict();

export type Feature = z.infer<typeof featureSchema>;

export const accessSchema = z
  .object({
    /** What opens it. Left out for a secret realm that only asks `below` or `needs`. */
    by: z.array(z.enum(ACCESS_BY)).optional(),
    /** Whose token, rank or invitation, or who takes the toll; the entry itself when left out. */
    of: z.string().optional(),
    /** The rank that opens it, free text until M5's ranks. */
    rank: z.string().optional(),
    toll: z
      .object({ stones: z.number().int().positive(), grade: z.enum(STONE_GRADES) })
      .strict()
      .optional(),
    /** The array's realm rating: forcing the way in needs a realm above it. */
    array: realmId.optional(),
    /** Secret realms: only cultivators below this realm may enter. */
    below: realmId.optional(),
    /** Secret realms: any one of these lets you in. */
    needs: z.array(z.enum(ACCESS_NEEDS)).min(1).optional(),
    /** Secret realms: open `days` days every `every` years, counted from an opening in world year `anchor`. */
    cycle: z
      .object({
        every: z.number().int().positive(),
        days: z.number().int().positive(),
        anchor: z.number().int(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine((a) => (a.by?.includes('toll') ?? false) === (a.toll !== undefined), {
    message: 'a toll comes with "toll" in by, and the other way round',
  })
  .refine((a) => (a.by?.includes('rank') ?? false) === (a.rank !== undefined), {
    message: 'a rank comes with "rank" in by, and the other way round',
  })
  .refine((a) => a.by?.length || a.below || a.needs || a.cycle, {
    message: 'access needs something that opens it',
  });

export type Access = z.infer<typeof accessSchema>;

const headcount = z.number().int().nonnegative();

/** About how many live in a place or belong to a power, mortals and cultivators by realm. */
export const populationSchema = z
  .object({
    mortals: headcount.optional(),
    qi: headcount.optional(),
    foundation: headcount.optional(),
    core: headcount.optional(),
    nascent: headcount.optional(),
    deity: headcount.optional(),
    void: headcount.optional(),
  })
  .strict();

export type Population = z.infer<typeof populationSchema>;

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
  /**
   * How rich the land's spirit qi runs, 1 (barren) to 9 (heaven-touched); a place without one takes
   * its nearest ancestor's (design § The world, Depth and qi density). It sets the band of what lives
   * at a land's edge; the generated atlas carries it resolved on every place.
   */
  qiDensity: z.number().int().min(1).max(9).optional(),
  /**
   * The scale fields (A5.2; design § World bible, The world at its true size), on places and powers.
   * Prosperity is 1 (ruined) to 9 (opulent), a place without one taking its parent's.
   */
  prosperity: z.number().int().min(1).max(9).optional(),
  /** About how many live there: mortals, and cultivators by realm. */
  population: populationSchema.optional(),
  /** Li across, or li long for a wall, a road or a river work. */
  size: z.number().positive().optional(),
  /** What shows from the map's height; a place painted into the map is painted from it. */
  fromAbove: z.string().min(1).optional(),
  /** A site's sub-kind, on kind `site` only. */
  site: z.enum(SITE_KINDS).optional(),
  /** `true` when a Soul check or divine sense finds it, or the realm a soul must reach to find it. */
  hidden: z.union([z.literal(true), realmId]).optional(),
  access: accessSchema.optional(),
  ties: z.array(tieSchema).optional(),
  features: z.array(featureSchema).optional(),
  map: mapSchema.optional(),
  years: yearsSchema.optional(),
};

/** Rules one entry can check on its own; the ones across entries are in checks.ts. */
function entryRules(
  e: {
    kind: EntryKind;
    site?: unknown;
    hidden?: unknown;
    access?: Access;
    features?: unknown;
    prosperity?: unknown;
    population?: unknown;
    size?: unknown;
    fromAbove?: unknown;
    tags: string[];
  },
  ctx: z.RefinementCtx,
) {
  const issue = (path: string, message: string) =>
    ctx.addIssue({ code: 'custom', path: [path], message });
  const place = PLACE_KINDS.includes(e.kind);
  if (e.kind === 'site' && e.site === undefined) issue('site', 'a site needs its sub-kind');
  if (e.kind !== 'site' && e.site !== undefined) issue('site', 'only a site has a sub-kind');
  if (!place) {
    for (const k of [
      'hidden',
      'access',
      'features',
      'prosperity',
      'population',
      'size',
      'fromAbove',
    ] as const)
      if (e[k] !== undefined) issue(k, `${e.kind} is not a place`);
    if (e.tags.includes('famous')) issue('tags', `${e.kind} is not a place, so it can't be famous`);
  }
  if (e.access && e.kind !== 'realm' && (e.access.below || e.access.needs || e.access.cycle))
    issue('access', 'an entry cap, needs and a cycle are for secret realms');
}

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
  .strict()
  .superRefine(entryRules);

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

/**
 * One entry in the generated atlas: bookkeeping dropped, `top` parsed, and `terrain` resolved on
 * every land place (its own, or its nearest ancestor's). `truth` stays for the narrator.
 */
export const atlasEntrySchema = z
  .object({ ...baseFields, top: topSchema })
  .strict()
  .superRefine(entryRules);

export type AtlasEntry = z.infer<typeof atlasEntrySchema>;

/**
 * The record a generated site shares with the atlas (design § The world map): kind `site` with its
 * sub-kind, kept in the save. A hand-written site in the atlas parses the same way.
 */
export const siteSchema = atlasEntrySchema.refine((e) => e.kind === 'site', 'a site has kind site');

export type Site = AtlasEntry & { kind: 'site'; site: (typeof SITE_KINDS)[number] };

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

export const GENERATED_ATLAS_VERSION = 3;

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
