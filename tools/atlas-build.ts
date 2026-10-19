// npm run atlas:build: validates content/atlas/entries.json and its ties, parses each `top` into a
// strict realm, resolves each place's terrain, computes fixed outlines with tools/atlas-geo.cjs and writes src/content/generated/atlas.json.
// Rerun it after any atlas edit and commit the generated file, so tests and builds never need d3.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import polygonClipping, { type MultiPolygon, type Polygon } from 'polygon-clipping';
import {
  checkAtlas,
  resolveQiDensity,
  resolveTerrain,
  resolveVein,
} from '../src/content/atlas/checks.ts';
import {
  atlasIndex,
  GENERATED_ATLAS_VERSION,
  generatedAtlasSchema,
  parseTop,
  sourceEntrySchema,
  type AtlasEntry,
  type GeneratedAtlas,
  type Shape,
  type SourceEntry,
} from '../src/content/atlas/schema.ts';

type Pt = [number, number];
interface Geo {
  conts: Map<string, Pt[]>;
  cells: Map<string, { poly: Pt[]; cont: string }>;
  seaZones: Map<string, { x: number; y: number; r: number }>;
  kingdoms: Map<string, Pt[]>;
  forbidden: Map<string, Pt[]>;
}

const require = createRequire(import.meta.url);
const atlasGeo = require('./atlas-geo.cjs') as { build: (E: Map<string, unknown>) => Geo };

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'content', 'atlas', 'entries.json');
const OUT = join(ROOT, 'src', 'content', 'generated', 'atlas.json');
const INDEX_OUT = join(ROOT, 'src', 'content', 'generated', 'atlas-index.json');
/** Outlines are rounded to this many li. */
const PRECISION = 10;
const DROPPED = new Set(['notes', 'order', 'editedBy', 'editedAt']);

function fail(lines: string[]): never {
  console.error(lines.join('\n'));
  process.exit(1);
}

// --- Load and validate. ---

const raw: unknown = JSON.parse(readFileSync(SOURCE, 'utf8'));
if (!Array.isArray(raw)) fail(['entries.json must hold an array of entries.']);

const problems: string[] = [];
const source: SourceEntry[] = [];
raw.forEach((item: unknown, i) => {
  const parsed = sourceEntrySchema.safeParse(item);
  const id = (item as { id?: unknown })?.id ?? `#${i}`;
  if (parsed.success) source.push(parsed.data);
  else
    for (const issue of parsed.error.issues)
      problems.push(`  ${String(id)}: ${issue.path.join('.') || '(entry)'}: ${issue.message}`);
});

const byId = new Map<string, SourceEntry>();
for (const e of source) {
  if (byId.has(e.id)) problems.push(`  ${e.id}: duplicate id`);
  byId.set(e.id, e);
}
for (const e of source) {
  if (e.parent !== null && !byId.has(e.parent))
    problems.push(`  ${e.id}: parent "${e.parent}" doesn't exist`);
  // Walk up the parents to catch loops.
  const seen = new Set([e.id]);
  for (let p = e.parent; p !== null; p = byId.get(p)?.parent ?? null) {
    if (seen.has(p)) {
      problems.push(`  ${e.id}: parent loop through "${p}"`);
      break;
    }
    seen.add(p);
  }
}
if (source.filter((e) => e.kind === 'world').length !== 1)
  problems.push('  (atlas): needs exactly one world entry');
const report = checkAtlas(source);
problems.push(...report.errors.map((p) => `  ${p}`));
if (problems.length) fail([`entries.json failed validation (${problems.length}):`, ...problems]);
const terrain = resolveTerrain(source);
const qiDensity = resolveQiDensity(source);
const veins = resolveVein(source);

// --- Parse `top`. ---

const unparsed: string[] = [];
const entries: AtlasEntry[] = source.map((e) => {
  const parsed = parseTop(e.top);
  let top = parsed.ok ? parsed.top : null;
  if (!top) {
    unparsed.push(`  ${e.id}: ${(parsed as { error: string }).error}`);
    // Keep the text as the note, so nothing is lost while the entry waits for a fix.
    top = { realm: 'unknown', note: e.top ?? '' };
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(e)) if (!DROPPED.has(k)) out[k] = v;
  out.top = top;
  // A place with no terrain of its own takes its nearest ancestor's.
  delete out.terrain;
  const t = terrain.get(e.id);
  if (t) out.terrain = t;
  // Qi density too, so the map reads it straight off every place.
  delete out.qiDensity;
  const q = qiDensity.get(e.id);
  if (q !== undefined) out.qiDensity = q;
  // And a region's or continent's vein, its strongest place's.
  const v = veins.get(e.id);
  if (v !== undefined) out.vein = v;
  return out as AtlasEntry;
});

// --- Outlines. ---

const round = (v: number) => Math.round(v / PRECISION) * PRECISION;

/** Rounds a ring, drops repeated points and the closing point. */
function cleanRing(points: readonly Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const [x, y] of points) {
    const p: Pt = [round(x), round(y)];
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  const first = out[0];
  const last = out[out.length - 1];
  if (out.length > 1 && first && last && first[0] === last[0] && first[1] === last[1]) out.pop();
  return out;
}

function area(polygons: MultiPolygon): Shape | null {
  const cleaned = polygons
    .map((poly) => poly.map((r) => cleanRing(r as Pt[])).filter((r) => r.length >= 3))
    .filter((poly) => poly.length > 0);
  return cleaned.length ? { type: 'area', polygons: cleaned } : null;
}

const geo = atlasGeo.build(new Map(source.map((e) => [e.id, e])));
const shapes: Record<string, Shape> = {};
const missing: string[] = [];
const put = (id: string, shape: Shape | null) => {
  if (shape) shapes[id] = shape;
  else missing.push(id);
};

for (const [id, pts] of geo.conts) put(id, area([[pts]]));
for (const [id, cell] of geo.cells) {
  const coast = geo.conts.get(cell.cont);
  if (!coast) throw new Error(`${id}: no coast for ${cell.cont}`);
  put(id, area(polygonClipping.intersection([cell.poly] as Polygon, [coast] as Polygon)));
}
for (const [id, z] of geo.seaZones)
  put(id, { type: 'circle', x: round(z.x), y: round(z.y), r: round(z.r) });
for (const [id, pts] of geo.kingdoms) put(id, area([[pts]]));
for (const [id, pts] of geo.forbidden) put(id, area([[pts]]));

// The tool skips The Scar and the Rim on purpose; the page draws them as a circle and a ring.
for (const e of source) {
  const m = e.map;
  if (e.kind !== 'forbidden' || !m || m.x === undefined || m.y === undefined || !m.r) continue;
  if (m.inner) {
    shapes[e.id] = {
      type: 'annulus',
      x: round(m.x),
      y: round(m.y),
      r: round(m.r),
      inner: round(m.inner),
    };
  } else if (e.id === 'the-scar') {
    shapes[e.id] = { type: 'circle', x: round(m.x), y: round(m.y), r: round(m.r) };
  }
}

// --- Write, one entry or shape per line so diffs stay readable. ---

const atlas: GeneratedAtlas = generatedAtlasSchema.parse({
  version: GENERATED_ATLAS_VERSION,
  precision: PRECISION,
  entries,
  shapes,
});
const shapeIds = Object.keys(atlas.shapes).sort();
const text =
  `{"version":${atlas.version},"precision":${atlas.precision},\n"entries":[\n` +
  atlas.entries.map((e) => JSON.stringify(e)).join(',\n') +
  `\n],\n"shapes":{\n` +
  shapeIds.map((id) => `${JSON.stringify(id)}:${JSON.stringify(atlas.shapes[id])}`).join(',\n') +
  `\n}}\n`;
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, text);
// What the game reads at start to know its places: a tenth of the atlas (core/resolver/knows.ts).
writeFileSync(
  INDEX_OUT,
  '[\n' +
    atlasIndex(atlas.entries)
      .map((e) => JSON.stringify(e))
      .join(',\n') +
    '\n]\n',
);

// --- Region maps. ---
// Each canon region gets a small file of what its travel map draws and reads (design § The world,
// The travel map): its outline, the coast round it, and its places with their outlines and fields,
// so the game never loads the whole atlas to draw one region.

/**
 * Next door (A5, design § The travel map): every region whose edge runs within 800 li of a point on
 * this region's edge, walked every 1,000 li, and every sea whose reach comes within 8,000 li of it.
 * The map names each faintly through the fog, in its middle, a region's edge dotted.
 */
function nextDoor(id: string, ring: Pt[]) {
  const edge: Pt[] = [];
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length]!;
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1000));
    for (let s = 0; s < n; s++)
      edge.push([a[0] + ((b[0] - a[0]) * s) / n, a[1] + ((b[1] - a[1]) * s) / n]);
  });
  const segDist = (p: Pt, a: Pt, b: Pt) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const t = Math.max(
      0,
      Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)),
    );
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  };
  const out: {
    id: string;
    kind: 'region' | 'sea';
    name: string;
    hanzi: string;
    at: Pt;
    outline?: unknown;
  }[] = [];
  for (const e of atlas.entries) {
    const s = atlas.shapes[e.id];
    if (e.kind === 'region' && e.id !== id && s && s.type === 'area') {
      const r = s.polygons[0]![0]! as Pt[];
      if (!edge.some((p) => r.some((a, i) => segDist(p, a, r[(i + 1) % r.length]!) < 800)))
        continue;
      const cx = r.reduce((n, p) => n + p[0], 0) / r.length;
      const cy = r.reduce((n, p) => n + p[1], 0) / r.length;
      out.push({
        id: e.id,
        kind: 'region',
        name: e.name,
        hanzi: e.hanzi,
        at: [Math.round(cx), Math.round(cy)],
        outline: s.polygons,
      });
    } else if (e.kind === 'sea' && e.map?.x != null && e.map.y != null && e.map.r) {
      const { x, y, r } = e.map;
      if (!edge.some(([px, py]) => Math.hypot(px - x, py - y) < r + 8000)) continue;
      out.push({ id: e.id, kind: 'sea', name: e.name, hanzi: e.hanzi, at: [x, y] });
    }
  }
  return out;
}

const REGIONS_OUT = join(ROOT, 'src', 'content', 'generated', 'regions');
mkdirSync(REGIONS_OUT, { recursive: true });
const MARGIN = 30000;
const regionsWritten: string[] = [];
for (const region of atlas.entries) {
  if (region.kind !== 'region' || region.status !== 'canon') continue;
  const outline = atlas.shapes[region.id];
  if (!outline || outline.type !== 'area') continue;
  const ring = outline.polygons.flat(1).flat(1);
  const xs = ring.map((p) => p[0]);
  const ys = ring.map((p) => p[1]);
  const bbox: [number, number, number, number] = [
    Math.min(...xs) - MARGIN,
    Math.min(...ys) - MARGIN,
    Math.max(...xs) + MARGIN,
    Math.max(...ys) + MARGIN,
  ];
  const box: Polygon = [
    [
      [bbox[0], bbox[1]],
      [bbox[2], bbox[1]],
      [bbox[2], bbox[3]],
      [bbox[0], bbox[3]],
    ],
  ];
  // The land round the region, clipped to its box: the coast the map draws the sea against.
  const land: Pt[][][] = [];
  for (const e of atlas.entries) {
    const s = atlas.shapes[e.id];
    if (e.kind !== 'continent' || !s || s.type !== 'area') continue;
    for (const poly of polygonClipping.intersection(s.polygons as MultiPolygon, box))
      land.push(poly.map((r) => cleanRing(r as Pt[])).filter((r) => r.length >= 3));
  }
  const inside = new Set<string>([region.id]);
  for (let grew = true; grew;) {
    grew = false;
    for (const e of atlas.entries)
      if (e.parent && inside.has(e.parent) && !inside.has(e.id)) {
        inside.add(e.id);
        grew = true;
      }
  }
  const places = atlas.entries
    .filter((e) => e.id !== region.id && inside.has(e.id))
    .map((e) => {
      const s = atlas.shapes[e.id];
      return {
        id: e.id,
        name: e.name,
        pinyin: e.pinyin,
        hanzi: e.hanzi,
        kind: e.kind,
        terrain: e.terrain ?? null,
        qiDensity: e.qiDensity ?? null,
        vein: e.vein ?? null,
        hidden: e.hidden ?? null,
        access: e.access ?? null,
        top: e.top.realm,
        famous: e.tags.includes('famous'),
        summary: e.summary,
        lore: e.lore,
        features: e.features ?? [],
        x: e.map?.x ?? null,
        y: e.map?.y ?? null,
        sphere: e.map?.sphere ?? null,
        outline: s && s.type === 'area' ? s.polygons : null,
      };
    });
  const file = {
    version: 1,
    id: region.id,
    name: region.name,
    hanzi: region.hanzi,
    terrain: region.terrain ?? 'plains',
    qiDensity: region.qiDensity ?? 5,
    top: region.top.realm,
    bbox,
    outline: outline.polygons,
    land,
    places,
    nextDoor: nextDoor(region.id, outline.polygons[0]![0]! as Pt[]),
  };
  writeFileSync(join(REGIONS_OUT, `${region.id}.json`), JSON.stringify(file) + '\n');
  regionsWritten.push(region.id);
}

// --- Report. ---

const count = (list: AtlasEntry[]) => {
  const byKind: Record<string, number> = {};
  for (const e of list) byKind[e.kind] = (byKind[e.kind] ?? 0) + 1;
  return Object.entries(byKind)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k} ${n}`)
    .join(', ');
};
const shapeCounts: Record<string, number> = {};
for (const s of Object.values(atlas.shapes)) shapeCounts[s.type] = (shapeCounts[s.type] ?? 0) + 1;
const noRealm = entries.filter((e) => e.top.realm === '');
const unknown = entries.filter((e) => e.top.realm === 'unknown');

console.log(`Wrote ${relative(ROOT, OUT)} (${(text.length / 1024).toFixed(0)} KB)`);
console.log(`  ${entries.length} entries; shapes: ${JSON.stringify(shapeCounts)}`);
console.log(
  unparsed.length
    ? `top: ${unparsed.length} failed to parse (kept as unknown, text in the note):\n${unparsed.join('\n')}`
    : 'top: every entry parsed',
);
console.log(`No realm (empty top), ${noRealm.length}: ${count(noRealm) || 'none'}`);
console.log(`Unknown realm, ${unknown.length}: ${count(unknown) || 'none'}`);
if (missing.length) console.log(`Outlines that came out empty: ${missing.join(', ')}`);
const ends = entries.reduce((n, e) => n + (e.ties?.length ?? 0), 0);
console.log(`Ties: ${entries.filter((e) => e.ties?.length).length} entries tied, ${ends} ends`);
const drafts = Object.entries(report.untiedDrafts)
  .sort((a, b) => b[1] - a[1])
  .map(([k, n]) => `${k} ${n}`)
  .join(', ');
if (drafts) console.log(`Untied drafts, waiting for the atlas fill: ${drafts}`);
if (report.warnings.length)
  console.log(
    `Warnings (${report.warnings.length}):\n${report.warnings.map((w) => `  ${w}`).join('\n')}`,
  );
