// npm run atlas:build: validates content/atlas/entries.json, parses each `top` into a strict realm,
// computes fixed outlines with tools/atlas-geo.cjs and writes src/content/generated/atlas.json.
// Rerun it after any atlas edit and commit the generated file, so tests and builds never need d3.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import polygonClipping, { type MultiPolygon, type Polygon } from 'polygon-clipping';
import {
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
if (problems.length) fail([`entries.json failed validation (${problems.length}):`, ...problems]);

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
