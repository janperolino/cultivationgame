// Cuts a square of the painted map round a fixed place (A5.1, Jan's call): the land as the map
// shows it close in, from the upscaled detail tile that holds the place most centrally, its tone
// applied. Jan gives the square to ChatGPT to paint the place into its very centre, at the land's
// own scale and light, and a later tool lays the result back into the map. Seeded sites
// move between worlds, so only the atlas places and the written towns are painted in.
//   npx tsx tools/map-crop.ts <region-id> <place-id> [<place-id> ...]
// Writes art/map/<region>/places/<place>-crop.png and <place>.json (the square's frame in the world).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { REGIONS } from '../src/content/map/index.ts';
import { generateRegion, regionMap } from '../src/core/map/region.ts';
import { tilesJson, workDir } from './map-paths.ts';

/** The square's side in li: a fort comes out a few hundred li across, as the land's scale has it. */
export const CROP_LI = 6000;
/** The square's side in pixels, as ChatGPT paints it. */
export const CROP_PX = 1024;

type Fit = [number, number, number, number, number, number];
interface Tile {
  id: string;
  W: number;
  H: number;
  k: number;
  x0: number;
  y0: number;
  fit?: number[];
  tone?: number[];
}

const [region, ...ids] = process.argv.slice(2);
if (!region || !ids.length || !REGIONS[region])
  throw new Error('usage: tsx tools/map-crop.ts <region-id> <place-id> ...');
const map = regionMap(generateRegion(region, 'crop'));
const tiles = (JSON.parse(readFileSync(tilesJson(region), 'utf8')) as { tiles: Tile[] }).tiles;
const out = `${workDir(region)}/places`;
mkdirSync(out, { recursive: true });

/** The feathered edge, as a share of a tile's short side (tools/map-chunks.ts). */
const FEATHER = 0.07;

interface Source {
  t: Tile;
  fit: Fit;
  scale: number;
  W: number;
  H: number;
  data: Buffer;
}
const sources = new Map<string, Source>();
async function sourceOf(t: Tile): Promise<Source> {
  const held = sources.get(t.id);
  if (held) return held;
  // The upscaled tile, 4× the painting the fit was made for, else the tile itself.
  const x4 = `${workDir(region!)}/tile-${t.id}-x4.png`;
  const scale = existsSync(x4) ? 4 : 1;
  const img = await sharp(scale === 4 ? x4 : `${workDir(region!)}/tile-${t.id}.png`)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const s: Source = {
    t,
    fit: (t.fit ?? [1, 0, 0, 1, 0, 0]) as Fit,
    scale,
    W: img.info.width,
    H: img.info.height,
    data: img.data,
  };
  sources.set(t.id, s);
  return s;
}

/** A tile's colour at a world spot, toned, and its weight there: 1 inside, fading over its feather. */
function sample(s: Source, wx: number, wy: number, rgb: number[]): number {
  const { t, fit, scale } = s;
  const ux = (wx - t.x0) * t.k;
  const uy = (wy - t.y0) * t.k;
  if (ux < 0 || uy < 0 || ux >= t.W || uy >= t.H) return 0;
  const f = Math.min(t.W, t.H) * FEATHER;
  const w = Math.min(1, ux / f, uy / f, (t.W - ux) / f, (t.H - uy) / f);
  const sx = (fit[0] * ux + fit[2] * uy + fit[4]) * scale;
  const sy = (fit[1] * ux + fit[3] * uy + fit[5]) * scale;
  const x1 = Math.floor(sx);
  const y1 = Math.floor(sy);
  if (x1 < 0 || y1 < 0 || x1 >= s.W - 1 || y1 >= s.H - 1) return 0;
  const fx = sx - x1;
  const fy = sy - y1;
  for (let c = 0; c < 3; c++) {
    const at = (xx: number, yy: number) => s.data[(yy * s.W + xx) * 3 + c]!;
    let v =
      (at(x1, y1) * (1 - fx) + at(x1 + 1, y1) * fx) * (1 - fy) +
      (at(x1, y1 + 1) * (1 - fx) + at(x1 + 1, y1 + 1) * fx) * fy;
    if (t.tone) v = t.tone[c * 2]! * v + t.tone[c * 2 + 1]!;
    rgb[c] = v;
  }
  return w;
}

for (const id of ids) {
  const p = map.places.find((q) => q.id === id);
  if (!p) throw new Error(`${region} has no place ${id}`);
  const x0 = p.x - CROP_LI / 2;
  const y0 = p.y - CROP_LI / 2;
  // Every tile the square touches, blended by their feathers as the map draws them.
  const over = tiles.filter(
    (t) => t.x0 < x0 + CROP_LI && t.x0 + t.W / t.k > x0 && t.y0 < y0 + CROP_LI && t.y0 + t.H / t.k > y0,
  );
  const srcs = await Promise.all(over.map(sourceOf));
  const px = Buffer.alloc(CROP_PX * CROP_PX * 3);
  const rgb = [0, 0, 0];
  let bare = 0;
  for (let y = 0; y < CROP_PX; y++)
    for (let x = 0; x < CROP_PX; x++) {
      const wx = x0 + ((x + 0.5) / CROP_PX) * CROP_LI;
      const wy = y0 + ((y + 0.5) / CROP_PX) * CROP_LI;
      const acc = [0, 0, 0];
      let wsum = 0;
      for (const s of srcs) {
        const w = sample(s, wx, wy, rgb);
        if (w <= 0) continue;
        for (let c = 0; c < 3; c++) acc[c]! += rgb[c]! * w;
        wsum += w;
      }
      if (wsum <= 0) bare++;
      for (let c = 0; c < 3; c++)
        px[(y * CROP_PX + x) * 3 + c] = wsum > 0 ? Math.max(0, Math.min(255, acc[c]! / wsum)) : 0;
    }
  if (bare) console.warn(`${id}: ${bare} pixels of the square lie past every tile`);
  await sharp(px, { raw: { width: CROP_PX, height: CROP_PX, channels: 3 } })
    .png()
    .toFile(`${out}/${id}-crop.png`);
  writeFileSync(
    `${out}/${id}.json`,
    `${JSON.stringify({ place: id, name: p.name, x0, y0, li: CROP_LI, px: CROP_PX, tiles: over.map((t) => t.id) })}\n`,
  );
  console.log(`${id}: ${out}/${id}-crop.png (${p.name}, tiles ${over.map((t) => t.id).join(', ')})`);
}
