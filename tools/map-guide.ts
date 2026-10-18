// A region's layout guide for GPT's map painting (A5): the region and its neighbours from the atlas,
// each terrain a flat color, the sea, roads red and each kind of place its own white symbol, with a
// json saying where the picture sits in the world so a painting from it lines up with the map.
//   npx tsx tools/map-guide.ts <region-id> [--draft docs/mockups/<region>-draft.json ...]
//   npx tsx tools/map-guide.ts <region-id> --tiles [--li 25] [--draft ...]
// A built region (src/content/generated/regions/) draws its tracts, towns and roads from the game;
// one not built yet draws from a draft json (docs/mockups/medicine-ridges-draft.json is the shape).
// With --tiles it cuts the region into overlapping detail tiles at --li li a pixel, for the map's
// close zoom: each a guide and a reference, the region's own fitted painting cut to the tile, so
// GPT paints the same land closer (art/map/<region>/, tools/map-paths.ts).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { guideJson, paintingPng, tilesJson, workDir } from './map-paths.ts';
import atlas from '../src/content/generated/atlas.json' with { type: 'json' };
import { REGIONS } from '../src/content/map/index.ts';
import { generateRegion, regionMap } from '../src/core/map/region.ts';

type Pt = [number, number];
type Multi = Pt[][][];
interface Draft {
  region: string;
  terrain: string;
  /** The region's own ground color, when its terrain alone would read like a neighbour's. */
  color?: string;
  areas: Record<string, { terrain: string }>;
  towns: { id: string; sub: 'town' | 'village'; x: number; y: number }[];
  roads: [string, string][];
}
interface Entry {
  id: string;
  kind: string;
  parent?: string;
  terrain?: string;
  map?: { x?: number; y?: number; r?: number; path?: Pt[]; style?: string };
}
/** Where a picture sits in the world: W×H pixels, k pixels a li, its corner at x0, y0. */
interface Frame {
  W: number;
  H: number;
  k: number;
  x0: number;
  y0: number;
}

const COLOR: Record<string, string> = {
  mountains: '#8a8f99',
  karst: '#5d7790',
  hills: '#a88a5c',
  plains: '#b9b07a',
  forest: '#2f5e46',
  jungle: '#2d6b3a',
  marsh: '#3f7a80',
  coast: '#d3c39a',
  blight: '#8a6f93',
  land: '#3b3b3b',
  sea: '#0d1b2e',
  river: '#2f6fa8',
};

const args = process.argv.slice(2);
const target = args[0];
if (!target)
  throw new Error(
    'usage: tsx tools/map-guide.ts <region-id> [--tiles] [--li 25] [--draft <file>...]',
  );
const drafts: Draft[] = [];
let tiles = false;
let liPerPx = 25;
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--draft') drafts.push(JSON.parse(readFileSync(args[++i]!, 'utf8')) as Draft);
  else if (args[i] === '--tiles') tiles = true;
  else if (args[i] === '--li') liPerPx = Number(args[++i]);
}

const entries = atlas.entries as Entry[];
const shapes = atlas.shapes as unknown as Record<string, { type: string; polygons?: Multi }>;
const areaOf = (id: string) => (shapes[id]?.type === 'area' ? shapes[id].polygons! : null);
const regionIds = entries.filter((e) => e.kind === 'region').map((e) => e.id);
const outline = areaOf(target);
if (!outline) throw new Error(`${target} has no outline in the atlas`);
const ring = outline.flat(2);
const box = [
  Math.min(...ring.map((p) => p[0])),
  Math.min(...ring.map((p) => p[1])),
  Math.max(...ring.map((p) => p[0])),
  Math.max(...ring.map((p) => p[1])),
] as const;

/** The guide for one frame, as SVG. */
function render(f: Frame): string {
  const { W, H, k, x0, y0 } = f;
  const P = (x: number, y: number) => `${((x - x0) * k).toFixed(1)},${((y - y0) * k).toFixed(1)}`;
  const d = (m: Multi) =>
    m.map((poly) => poly.map((r) => `M${r.map(([x, y]) => P(x, y)).join('L')}Z`).join('')).join('');
  const fill = (m: Multi, terrain: string) =>
    `<path d="${d(m)}" fill="${COLOR[terrain] ?? COLOR.land}" fill-rule="evenodd"/>`;
  const parts: string[] = [];
  const top: string[] = [];
  const spots = new Map<string, { x: number; y: number; kind: string }>();

  // The sea, the land, then each region with its own terrains, clipped to its outline.
  parts.push(`<rect width="${W}" height="${H}" fill="${COLOR.sea}"/>`);
  for (const e of entries)
    if (e.kind === 'continent' && areaOf(e.id)) parts.push(fill(areaOf(e.id)!, 'land'));
  for (const id of regionIds) {
    const o = areaOf(id);
    if (!o) continue;
    const built = REGIONS[id];
    const draft = drafts.find((x) => x.region === id);
    if (!built && !draft) continue;
    const clip = `clip-${id}`;
    parts.push(
      `<clipPath id="${clip}"><path d="${d(o)}" clip-rule="evenodd"/></clipPath><g clip-path="url(#${clip})">`,
    );
    if (built) {
      // The land is the same in every world (its content's landSeed), so any world draws it.
      const m = regionMap(generateRegion(id, 'guide'));
      parts.push(fill(o, m.terrain));
      for (const tracts of [true, false])
        for (const a of m.areas)
          if ((a.kind === 'tract') === tracts) parts.push(fill(a.outline as Multi, a.terrain));
      for (const r of m.roads)
        top.push(
          `<path d="M${r.pts.map(([x, y]) => P(x, y)).join('L')}" fill="none" stroke="#e03030" stroke-width="2.4"/>`,
        );
      for (const q of m.places) {
        const kind = q.kind === 'atlas' ? q.sub : q.kind === 'town' ? q.sub : '';
        spots.set(q.id, { x: q.x, y: q.y, kind });
      }
    } else if (draft) {
      parts.push(
        draft.color
          ? `<path d="${d(o)}" fill="${draft.color}" fill-rule="evenodd"/>`
          : fill(o, draft.terrain),
      );
      for (const [aid, a] of Object.entries(draft.areas)) {
        const s = areaOf(aid);
        const e = entries.find((x) => x.id === aid);
        if (s) parts.push(fill(s, a.terrain));
        else if (e?.map?.r) {
          const [cx, cy] = P(e.map.x!, e.map.y!).split(',');
          parts.push(
            `<circle cx="${cx}" cy="${cy}" r="${e.map.r * k}" fill="${COLOR[a.terrain]}"/>`,
          );
        }
      }
      for (const e of entries)
        if (e.parent === id && e.map?.x != null && !e.map.r)
          spots.set(e.id, { x: e.map.x, y: e.map.y!, kind: e.kind });
      for (const t of draft.towns) spots.set(t.id, { x: t.x, y: t.y, kind: t.sub });
    }
    parts.push('</g>');
  }
  // The atlas's ridges and rivers, whichever region files them: a ridge or a river crosses borders
  // (Jade Screen Ridge runs from the Medicine Ridges into the Border Wilds).
  for (const e of entries) {
    const path = e.map?.path;
    const style = e.map?.style;
    if (!path || (style !== 'ridge' && style !== 'river')) continue;
    const width = Math.max(style === 'ridge' ? 7 : 3, (style === 'ridge' ? 4500 : 1500) * k);
    parts.push(
      `<path d="M${path.map(([x, y]) => P(x, y)).join('L')}" fill="none" stroke="${style === 'ridge' ? COLOR.mountains : COLOR.river}" stroke-width="${width.toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`,
    );
  }
  // Draft roads last, once every place they join is known.
  for (const draft of drafts)
    for (const [a, b] of draft.roads) {
      const p = spots.get(a);
      const q = spots.get(b);
      if (!p || !q)
        throw new Error(`${draft.region}: a road joins ${a} and ${b}, and one isn't on the map`);
      top.push(
        `<path d="M${P(p.x, p.y)}L${P(q.x, q.y)}" fill="none" stroke="#e03030" stroke-width="2.4"/>`,
      );
    }
  // Borders between regions, thin and dark.
  for (const id of regionIds) {
    const o = areaOf(id);
    if (o) top.push(`<path d="${d(o)}" fill="none" stroke="#000" stroke-width="1.6"/>`);
  }
  // Places: a city a square, a sect or society a triangle, a secret realm a diamond, a landmark a
  // star, a town a circle, a village a dot.
  for (const s of spots.values()) {
    const [cx, cy] = P(s.x, s.y).split(',').map(Number) as [number, number];
    if (cx < -20 || cy < -20 || cx > W + 20 || cy > H + 20) continue;
    const white = 'fill="#fff" stroke="#000" stroke-width="1.5"';
    if (s.kind === 'city')
      top.push(`<rect x="${cx - 10}" y="${cy - 10}" width="20" height="20" ${white}/>`);
    else if (s.kind === 'power')
      top.push(`<path d="M${cx},${cy - 12}L${cx + 11},${cy + 8}L${cx - 11},${cy + 8}Z" ${white}/>`);
    else if (s.kind === 'realm')
      top.push(
        `<path d="M${cx},${cy - 11}L${cx + 9},${cy}L${cx},${cy + 11}L${cx - 9},${cy}Z" fill="#c9a0ff" stroke="#000" stroke-width="1.5"/>`,
      );
    else if (s.kind === 'landmark') {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const r = i % 2 ? 5 : 12;
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
      });
      top.push(`<path d="M${pts.join('L')}Z" ${white}/>`);
    } else if (s.kind === 'town') top.push(`<circle cx="${cx}" cy="${cy}" r="7" ${white}/>`);
    else if (s.kind === 'village') top.push(`<circle cx="${cx}" cy="${cy}" r="4" fill="#fff"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${parts.join('')}${top.join('')}</svg>`;
}

function inside(p: Pt): boolean {
  let c = false;
  for (const poly of outline!)
    for (const r of poly)
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const [xi, yi] = r[i]!;
        const [xj, yj] = r[j]!;
        if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
      }
  return c;
}

if (!tiles) {
  // The whole region: its box and a margin, portrait or landscape by its shape.
  const portrait = box[3] - box[1] > box[2] - box[0];
  const W = portrait ? 1024 : 1536;
  const H = portrait ? 1536 : 1024;
  const k = Math.min((W * 0.86) / (box[2] - box[0]), (H * 0.86) / (box[3] - box[1]));
  const f: Frame = {
    W,
    H,
    k,
    x0: (box[0] + box[2]) / 2 - W / 2 / k,
    y0: (box[1] + box[3]) / 2 - H / 2 / k,
  };
  mkdirSync(workDir(target), { recursive: true });
  const out = `${workDir(target)}/guide`;
  await sharp(Buffer.from(render(f)))
    .png()
    .toFile(`${out}.png`);
  writeFileSync(`${out}.json`, JSON.stringify({ region: target, ...f }) + '\n');
  console.log(`wrote ${out}.png and .json (${f.W}x${f.H}, ${(1 / k).toFixed(0)} li a pixel)`);
} else {
  // Detail tiles: landscape 1536×1024 at liPerPx, overlapping a tenth, over the region's box; a
  // tile that misses the region is skipped. The reference is the region's painting through its fit.
  const region = JSON.parse(
    readFileSync(guideJson(target), 'utf8'),
  ) as Frame & {
    fit?: number[];
  };
  const fit = region.fit ?? [1, 0, 0, 1, 0, 0];
  const paint = await sharp(paintingPng(target))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pw = paint.info.width;
  const ph = paint.info.height;
  const W = 1536;
  const H = 1024;
  const k = 1 / liPerPx;
  /** The least share of a tile the region must cover for the tile to be painted. */
  const MIN_COVER = 0.08;
  const stepX = (W / k) * 0.9;
  const stepY = (H / k) * 0.9;
  const cols = Math.max(1, Math.ceil((box[2] - box[0] - W / k) / stepX) + 1);
  const rows = Math.max(1, Math.ceil((box[3] - box[1] - H / k) / stepY) + 1);
  // Centre the grid on the region's box.
  const gx0 = (box[0] + box[2]) / 2 - ((cols - 1) * stepX + W / k) / 2;
  const gy0 = (box[1] + box[3]) / 2 - ((rows - 1) * stepY + H / k) / 2;
  const dir = workDir(target);
  mkdirSync(dir, { recursive: true });
  const list: (Frame & { id: string })[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const f: Frame = { W, H, k, x0: gx0 + c * stepX, y0: gy0 + r * stepY };
      // A tile holding only a sliver of the region isn't worth a painting: its sliver stays the
      // region painting's, with the neighbouring tiles' overlap over its edge.
      let inn = 0;
      for (let i = 0; i <= 20; i++)
        for (let j = 0; j <= 20; j++)
          if (inside([f.x0 + (i / 20) * (W / k), f.y0 + (j / 20) * (H / k)])) inn++;
      if (inn / 441 < MIN_COVER) continue;
      const id = `${c}-${r}`;
      await sharp(Buffer.from(render(f)))
        .png()
        .toFile(`${dir}/tile-${id}-guide.png`);
      // The reference: each tile pixel's world spot, to the region guide's pixel, through the fit
      // to the painting's, sampled bilinearly.
      const ref = Buffer.alloc(W * H * 3);
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const gx = (f.x0 + x / k - region.x0) * region.k;
          const gy = (f.y0 + y / k - region.y0) * region.k;
          const px = fit[0]! * gx + fit[2]! * gy + fit[4]!;
          const py = fit[1]! * gx + fit[3]! * gy + fit[5]!;
          const x1 = Math.floor(px);
          const y1 = Math.floor(py);
          if (x1 < 0 || y1 < 0 || x1 >= pw - 1 || y1 >= ph - 1) continue;
          const tx = px - x1;
          const ty = py - y1;
          for (let ch = 0; ch < 3; ch++) {
            const at = (xx: number, yy: number) => paint.data[(yy * pw + xx) * 3 + ch]!;
            ref[(y * W + x) * 3 + ch] =
              (at(x1, y1) * (1 - tx) + at(x1 + 1, y1) * tx) * (1 - ty) +
              (at(x1, y1 + 1) * (1 - tx) + at(x1 + 1, y1 + 1) * tx) * ty;
          }
        }
      await sharp(ref, { raw: { width: W, height: H, channels: 3 } })
        .png()
        .toFile(`${dir}/tile-${id}-ref.png`);
      list.push({ id, ...f });
    }
  writeFileSync(
    tilesJson(target),
    JSON.stringify({ region: target, liPerPx, tiles: list }, null, 1) + '\n',
  );
  console.log(`wrote ${list.length} tiles of ${cols}×${rows} to ${dir} (${liPerPx} li a pixel)`);
}
