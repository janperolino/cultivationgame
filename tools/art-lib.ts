// The art pipeline's ingest (docs/art-pipeline.md): art/manifest.json names every asset, Jan drops
// GPT's PNGs in art/inbox/ named by id, and `npm run art` moves them to art/source/, writes the
// webp the manifest asks for, cuts sheets into pieces, keys out a green screen and checks budgets.
// Node only, with sharp, so it runs in PowerShell.

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import sharp from 'sharp';
import { z } from 'zod';

// sharp's cache holds files open, which on Windows blocks moving or removing them after.
sharp.cache(false);

export const ART_KINDS = ['frame', 'surface', 'scene', 'ornament', 'concept'] as const;
export type ArtKind = (typeof ART_KINDS)[number];

/** Each kind's budget ceiling in KB; an asset may ask for less, never more. */
export const KIND_BUDGET_KB: Record<ArtKind, number> = {
  frame: 150,
  surface: 120,
  scene: 300,
  ornament: 60,
  concept: 600,
};

/** A screen's art stays under this, shared assets counted once. */
export const SCREEN_BUDGET_KB = 800;

/**
 * A place's art (A6): its banner and up to three sheets of nine door pictures, of which a screen
 * shows the banner and one tab's nine at a time (the cards load lazily). Raised over a screen's as
 * loading hygiene, never a reason to cut art (Jan's call).
 */
export const PLACE_BUDGET_KB = 1600;

/**
 * A travel map region's art (A5.1): its painting and its tiles' chunk pyramids, made by the map
 * tools (docs/art-pipeline.md § The travel map) and shipped in public/map/<region>/, loaded a chunk
 * at a time as you zoom, so it has a budget of its own rather than the screen's.
 * Raised from 25 to 60 MB in A5.3 as places were painted in: loading hygiene, never a reason to
 * cut art (Jan's call); the real limit is the repository's, and the art moves to its own host first.
 */
export const MAP_BUDGET_MB = 60;

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const assetSchema = z
  .object({
    id: z.string().regex(ID, 'ids are kebab-case, the screen first'),
    kind: z.enum(ART_KINDS),
    /** Where the webp lands, from the project root; for a sheet, the folder its pieces land in. */
    out: z.string().min(1),
    /** Shipped width in pixels: a frame's or scene's long side, a surface's side, a piece's side. */
    width: z.number().int().positive(),
    /** A frame's corner in the shipped file's pixels. */
    slice: z.number().int().positive().optional(),
    quality: z.number().int().min(1).max(100),
    budgetKB: z.number().positive(),
    /** The concept the asset was drawn from. */
    concept: z.string().optional(),
    prompt: z.string().min(1),
    /** A sheet: columns and rows, and a name for each piece, left to right, top to bottom. */
    cells: z.tuple([z.number().int().positive(), z.number().int().positive()]).optional(),
    pieces: z.array(z.string().regex(ID)).optional(),
    /**
     * Painted as Jan's ChatGPT time allows (A6's place sheets, trickling like A5.4): a missing
     * source waits, listed, rather than failing the run; the game shows the plain card till then.
     */
    trickle: z.boolean().optional(),
    /** A green screen to key out, as #rrggbb. */
    key: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
  })
  .strict();
export type ArtAsset = z.infer<typeof assetSchema>;

export const mapArtSchema = z
  .object({
    /** The atlas region, its folder in art/map/ and public/map/. */
    region: z.string().regex(ID),
    budgetMB: z.number().positive(),
  })
  .strict();

export const manifestSchema = z
  .object({ assets: z.array(assetSchema), maps: z.array(mapArtSchema).optional() })
  .strict();
export type ArtManifest = z.infer<typeof manifestSchema>;

/** What is wrong with a manifest beyond its shape; empty when it is sound. */
export function checkManifest(m: ArtManifest): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  const outs = new Set<string>();
  for (const a of m.assets) {
    if (ids.has(a.id)) out.push(`${a.id}: the id is used twice`);
    ids.add(a.id);
    const target = posix.normalize(a.out.replaceAll('\\', '/'));
    if (outs.has(target)) out.push(`${a.id}: ${a.out} is written by another asset too`);
    outs.add(target);
    if (a.kind === 'concept') {
      if (!target.startsWith('art/concepts/') || !target.endsWith('.webp'))
        out.push(`${a.id}: a concept is written to art/concepts/<name>.webp`);
    } else if (!target.startsWith('src/ui/art/')) {
      out.push(`${a.id}: art ships under src/ui/art/, so Vite hashes it`);
    } else if (!a.cells) {
      if (!target.endsWith('.webp')) out.push(`${a.id}: the file is a .webp`);
    }
    if (a.budgetKB > KIND_BUDGET_KB[a.kind])
      out.push(`${a.id}: ${a.budgetKB} KB is over a ${a.kind}'s ${KIND_BUDGET_KB[a.kind]} KB`);
    if (a.kind === 'frame') {
      if (!a.slice) out.push(`${a.id}: a frame names its slice`);
      else if (a.slice * 2 >= a.width) out.push(`${a.id}: the slice leaves no band to stretch`);
    } else if (a.slice) {
      out.push(`${a.id}: only a frame has a slice`);
    }
    if (a.cells || a.pieces) {
      if (a.kind !== 'ornament' && a.kind !== 'scene')
        out.push(`${a.id}: only an ornament or a scene sheet has cells`);
      else if (!a.cells || !a.pieces) out.push(`${a.id}: a sheet names both its cells and pieces`);
      else if (a.pieces.length > a.cells[0] * a.cells[1])
        out.push(`${a.id}: ${a.pieces.length} pieces don't fit ${a.cells[0]}×${a.cells[1]} cells`);
      else if (new Set(a.pieces).size !== a.pieces.length)
        out.push(`${a.id}: a piece's name is used twice`);
    }
  }
  const regions = new Set<string>();
  for (const r of m.maps ?? []) {
    if (regions.has(r.region)) out.push(`map ${r.region}: the region is listed twice`);
    regions.add(r.region);
    if (r.budgetMB > MAP_BUDGET_MB)
      out.push(`map ${r.region}: ${r.budgetMB} MB is over a region's ${MAP_BUDGET_MB} MB`);
  }
  return out;
}

/** A shipped map region's files, in bytes, walked from its folder. */
function folderBytes(dir: string): number {
  let n = 0;
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const st = statSync(p);
    n += st.isDirectory() ? folderBytes(p) : st.size;
  }
  return n;
}

/** Each listed map region shipped in public/map/<region>/, its painting there, under its budget. */
export function checkMaps(root: string, m: ArtManifest): string[] {
  const out: string[] = [];
  for (const r of m.maps ?? []) {
    const dir = join(root, 'public', 'map', r.region);
    if (!existsSync(join(dir, 'painting.webp'))) {
      out.push(
        `map ${r.region}: no public/map/${r.region}/painting.webp (npx tsx tools/map-chunks.ts ${r.region})`,
      );
      continue;
    }
    const mb = folderBytes(dir) / 1e6;
    if (mb > r.budgetMB)
      out.push(`map ${r.region}: its art is ${mb.toFixed(1)} MB, over its ${r.budgetMB} MB`);
  }
  return out;
}

/** The files an asset writes, from the project root. */
export function outputsOf(a: ArtAsset): string[] {
  if (a.cells && a.pieces) return a.pieces.map((p) => posix.join(a.out, `${p}.webp`));
  return [a.out];
}

export interface ArtReport {
  /** Inbox files moved into source/. */
  moved: string[];
  written: { id: string; file: string; kb: number; budgetKB: number }[];
  /** Missing sources, files over budget, a broken manifest: any of these fails the run. */
  errors: string[];
  /** Trickle assets still to be painted, by id. */
  waiting: string[];
}

/**
 * Runs the ingest in a project folder: inbox to source, source to webp, budgets checked. Every
 * asset is rebuilt from its source each run, so the output always matches the manifest.
 */
export async function runArt(root: string): Promise<ArtReport> {
  const report: ArtReport = { moved: [], written: [], errors: [], waiting: [] };
  const manifestPath = join(root, 'art', 'manifest.json');
  if (!existsSync(manifestPath)) {
    report.errors.push('art/manifest.json is missing');
    return report;
  }
  const parsed = manifestSchema.safeParse(JSON.parse(readFileSync(manifestPath, 'utf8')));
  if (!parsed.success) {
    report.errors.push(
      ...parsed.error.issues.map((i) => `manifest ${i.path.join('.')}: ${i.message}`),
    );
    return report;
  }
  const m = parsed.data;
  report.errors.push(...checkManifest(m));
  if (report.errors.length) return report;

  const inbox = join(root, 'art', 'inbox');
  const source = join(root, 'art', 'source');
  mkdirSync(source, { recursive: true });
  const known = new Set(m.assets.map((a) => a.id));
  if (existsSync(inbox)) {
    for (const f of readdirSync(inbox)) {
      if (!f.toLowerCase().endsWith('.png')) continue;
      const id = f.slice(0, -4);
      if (!known.has(id)) {
        report.errors.push(`inbox/${f} names no asset in the manifest`);
        continue;
      }
      renameSync(join(inbox, f), join(source, `${id}.png`));
      report.moved.push(f);
    }
  }

  for (const a of m.assets) {
    const src = join(source, `${a.id}.png`);
    if (!existsSync(src)) {
      if (a.trickle) report.waiting.push(a.id);
      else report.errors.push(`${a.id}: no source (drop ${a.id}.png in art/inbox/)`);
      continue;
    }
    const files = await build(a, src, root);
    for (const file of files) {
      const kb = statSync(join(root, file)).size / 1024;
      report.written.push({ id: a.id, file, kb, budgetKB: a.budgetKB });
      if (kb > a.budgetKB)
        report.errors.push(`${a.id}: ${file} is ${kb.toFixed(1)} KB, over its ${a.budgetKB} KB`);
    }
  }
  report.errors.push(...checkScreens(m, report.written));
  report.errors.push(...checkMaps(root, m));
  return report;
}

/**
 * The screen an asset belongs to: its id's first word (`common` for the shared kit). A place's own
 * art is its own screen (A6: each place paints its banner and doors, `place-<place>-banner`), so
 * the budget reads a place at a time.
 */
export function screenOf(id: string): string {
  if (id.startsWith('place-')) return id.replace(/-(banner|doors-\d+)$/, '');
  // The wilds' paintings for going in: a region's terrain at a time (tools/land-request.ts).
  if (id.startsWith('land-')) return id.replace(/-\d+$/, '');
  return id.split('-')[0]!;
}

/** Each screen's art, and the shared kit, under 800 KB; concepts are reference, never shipped. */
export function checkScreens(m: ArtManifest, written: ArtReport['written']): string[] {
  const kinds = new Map(m.assets.map((a) => [a.id, a.kind]));
  const totals = new Map<string, number>();
  for (const w of written) {
    if (kinds.get(w.id) === 'concept') continue;
    const s = screenOf(w.id);
    totals.set(s, (totals.get(s) ?? 0) + w.kb);
  }
  return [...totals]
    .map(
      ([s, kb]) => [s, kb, /^(place|land)-/.test(s) ? PLACE_BUDGET_KB : SCREEN_BUDGET_KB] as const,
    )
    .filter(([, kb, most]) => kb > most)
    .map(([s, kb, most]) => `${s}: its art is ${kb.toFixed(0)} KB, over ${most} KB`);
}

/** Writes one asset's webp files from its source. */
async function build(a: ArtAsset, src: string, root: string): Promise<string[]> {
  const files = outputsOf(a);
  for (const f of files) mkdirSync(dirname(join(root, f)), { recursive: true });
  const webp = { quality: a.quality, alphaQuality: 100, effort: 6 };

  if (a.cells && a.pieces) {
    const sheet = await keyed(a, src);
    const { width, height } = await sharp(sheet.data, { raw: sheet.info }).metadata();
    const cw = Math.floor(width! / a.cells[0]);
    const ch = Math.floor(height! / a.cells[1]);
    // GPT draws a scene sheet's seams up to a few dozen pixels off the even thirds (A6), so its cuts
    // follow the seams it drew (`seams`), and a door's picture is cut 3% inside its cell besides.
    const xs =
      a.kind === 'scene'
        ? seams(sheet.data, width!, height!, a.cells[0], 'x')
        : even(width!, a.cells[0]);
    const ys =
      a.kind === 'scene'
        ? seams(sheet.data, width!, height!, a.cells[1], 'y')
        : even(height!, a.cells[1]);
    const trim = a.kind === 'scene' ? Math.round(Math.min(cw, ch) * 0.03) : 0;
    for (const [i, file] of files.entries()) {
      const col = i % a.cells[0];
      const row = Math.floor(i / a.cells[0]);
      await sharp(sheet.data, { raw: sheet.info })
        .extract({
          left: xs[col]! + trim,
          top: ys[row]! + trim,
          width: xs[col + 1]! - xs[col]! - 2 * trim,
          height: ys[row + 1]! - ys[row]! - 2 * trim,
        })
        // An ornament sits in a square; a scene's piece (a door's picture) keeps its cell's shape.
        .resize(
          a.kind === 'scene'
            ? { width: a.width, withoutEnlargement: true }
            : {
                width: a.width,
                height: a.width,
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 },
              },
        )
        .webp(webp)
        .toFile(join(root, file));
    }
    return files;
  }

  const file = files[0]!;
  const img = a.key ? await keyed(a, src) : null;
  const base = img ? sharp(img.data, { raw: img.info }) : sharp(src);
  const sized =
    a.kind === 'surface'
      ? base.resize(a.width, a.width, { fit: 'cover' })
      : a.kind === 'concept'
        ? base.resize(1920, 1080, { fit: 'cover' })
        : a.kind === 'scene'
          ? base.resize(a.width, a.width, { fit: 'inside', withoutEnlargement: true })
          : base.resize({ width: a.width });
  await sized.webp(webp).toFile(join(root, file));
  return files;
}

/** A sheet's cell edges, evenly: 0, a third, two thirds, the whole. */
function even(size: number, n: number): number[] {
  return Array.from({ length: n + 1 }, (_, k) => Math.round((size * k) / n));
}

/**
 * A painted sheet's cell edges where GPT drew them: near each even division (within 6% of the
 * side), the line across which the picture changes most, the seam between two scenes. Raw RGBA.
 */
export function seams(
  data: Uint8Array,
  width: number,
  height: number,
  n: number,
  axis: 'x' | 'y',
): number[] {
  const size = axis === 'x' ? width : height;
  const along = axis === 'x' ? height : width;
  const at = (u: number, v: number) => (axis === 'x' ? (v * width + u) * 4 : (u * width + v) * 4);
  const step = (u: number) => {
    let d = 0;
    for (let v = 0; v < along; v += 2) {
      const a = at(u - 1, v);
      const b = at(u, v);
      d +=
        Math.abs(data[a]! - data[b]!) +
        Math.abs(data[a + 1]! - data[b + 1]!) +
        Math.abs(data[a + 2]! - data[b + 2]!);
    }
    return d;
  };
  const out = even(size, n);
  const reach = Math.round(size * 0.06);
  for (let k = 1; k < n; k++) {
    let best = out[k]!;
    let most = -1;
    for (let u = Math.max(1, out[k]! - reach); u <= Math.min(size - 1, out[k]! + reach); u++) {
      const d = step(u);
      if (d > most) [most, best] = [d, u];
    }
    out[k] = best;
  }
  return out;
}

/** The source as raw RGBA, with its green screen keyed out when the asset names one. */
async function keyed(a: ArtAsset, src: string) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (a.key) keyOut(data, info.channels, a.key);
  return { data, info: { width: info.width, height: info.height, channels: info.channels } };
}

/**
 * Keys a flat screen color out of raw RGBA in place: near it turns clear, and the edge a little
 * tinted by it loses the tint (despill), so gold on green keeps no green fringe.
 */
export function keyOut(data: Uint8Array, channels: number, hex: string): void {
  const kr = parseInt(hex.slice(1, 3), 16);
  const kg = parseInt(hex.slice(3, 5), 16);
  const kb = parseInt(hex.slice(5, 7), 16);
  for (let i = 0; i + 3 < data.length; i += channels) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const d = Math.hypot(r - kr, g - kg, b - kb);
    if (d < 90) {
      data[i + 3] = 0;
      continue;
    }
    if (d < 180) data[i + 3] = Math.min(data[i + 3]!, Math.round(((d - 90) / 90) * 255));
    // Despill toward the key's own dominant channel (green for #00FF00).
    if (kg >= kr && kg >= kb && g > Math.max(r, b)) data[i + 1] = Math.max(r, b);
  }
}
