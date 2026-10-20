// Cuts a square of the painted map round a fixed place (A5.1, A5.3; Jan's call): the land as the map
// shows it close in, from every upscaled detail tile that covers it, blended by their feathers and
// toned, as the map draws them. Jan gives the square to ChatGPT to paint the place into its very
// centre, at the land's own scale and light, and tools/map-place.ts lays the result back into the
// map. Seeded sites move between worlds, so only the atlas places and the written towns are painted in.
//   npx tsx tools/map-crop.ts <region-id> <place-id> [<place-id> ...] [--size <w>x<h>]
// A square is 6,000 li at 1,024 px. --size cuts a frame of w × h li instead, at the size ChatGPT
// paints its shape (1,024 × 1,536 px tall, 1,536 × 1,024 wide), for a place longer than a square
// (the Wall of Piled Bones, 9,000 li, as a strip of 7,000 × 10,500).
// Writes the place's folder, places/To paint/<English name>/ (tools/map-paths.ts): crop.png,
// place.json (the frame in the world) and prompt.txt (the prompt to paint it with, from its data:
// tools/map-prompt.ts); a place cut again keeps the folder it has. Cut a
// place before it is painted in: once laid back, the land under it is the painted place.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { REGIONS } from '../src/content/map/index.ts';
import { generateRegion, regionMap } from '../src/core/map/region.ts';
import { placePrompt } from './map-prompt.ts';
import { folderName, placeFolder, placesDir, TO_PAINT, tilesJson, workDir } from './map-paths.ts';

/** A square's side in li: a fort comes out a few hundred li across, as the land's scale has it. */
export const CROP_LI = 6000;
/** A square's side in pixels, as ChatGPT paints it. */
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

const args = process.argv.slice(2);
const sized = args.indexOf('--size');
const size = sized >= 0 ? args.splice(sized, 2)[1]!.split('x').map(Number) : [CROP_LI, CROP_LI];
const [wLi, hLi] = size as [number, number];
if (!(wLi > 0 && hLi > 0)) throw new Error('--size is <w>x<h> in li, e.g. 7000x10500');
const [wPx, hPx] = wLi === hLi ? [CROP_PX, CROP_PX] : wLi < hLi ? [1024, 1536] : [1536, 1024];
const [region, ...ids] = args;
if (!region || !ids.length || !REGIONS[region])
  throw new Error('usage: tsx tools/map-crop.ts <region-id> <place-id> ... [--size <w>x<h>]');
const map = regionMap(generateRegion(region, 'crop'));
const tiles = (JSON.parse(readFileSync(tilesJson(region), 'utf8')) as { tiles: Tile[] }).tiles;

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
  // A point on the map, else an area's own spot in the atlas (a forbidden land, a kingdom).
  const p =
    map.places.find((q) => q.id === id) ??
    REGIONS[region]!.file.places.find((q) => q.id === id && q.x !== null && q.y !== null);
  if (!p || p.x === null || p.y === null) throw new Error(`${region} has no place ${id}`);
  const held = placeFolder(region, id);
  const out = held?.dir ?? `${placesDir(region)}/${TO_PAINT}/${folderName(p.name)}`;
  mkdirSync(out, { recursive: true });
  if (held?.done)
    console.warn(`${id}: already painted in; the cut shows the painted place, not the land under it`);
  const x0 = Math.round(p.x - wLi / 2);
  const y0 = Math.round(p.y - hLi / 2);
  // Every tile the square touches, blended by their feathers as the map draws them.
  const over = tiles.filter(
    (t) => t.x0 < x0 + wLi && t.x0 + t.W / t.k > x0 && t.y0 < y0 + hLi && t.y0 + t.H / t.k > y0,
  );
  const srcs = await Promise.all(over.map(sourceOf));
  const px = Buffer.alloc(wPx * hPx * 3);
  const rgb = [0, 0, 0];
  let bare = 0;
  for (let y = 0; y < hPx; y++)
    for (let x = 0; x < wPx; x++) {
      const wx = x0 + ((x + 0.5) / wPx) * wLi;
      const wy = y0 + ((y + 0.5) / hPx) * hLi;
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
        px[(y * wPx + x) * 3 + c] = wsum > 0 ? Math.max(0, Math.min(255, acc[c]! / wsum)) : 0;
    }
  if (bare) console.warn(`${id}: ${bare} pixels of the square lie past every tile`);
  await sharp(px, { raw: { width: wPx, height: hPx, channels: 3 } })
    .png()
    .toFile(`${out}/crop.png`);
  writeFileSync(
    `${out}/place.json`,
    `${JSON.stringify({ place: id, name: p.name, x0, y0, w: wLi, h: hLi, pw: wPx, ph: hPx, tiles: over.map((t) => t.id) })}\n`,
  );
  writeFileSync(`${out}/prompt.txt`, placePrompt(region, id, { w: wLi, h: hLi, pw: wPx, ph: hPx }));
  console.log(`${id}: ${out}/ (${p.name}, tiles ${over.map((t) => t.id).join(', ')})`);
}
