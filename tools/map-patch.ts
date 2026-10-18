// Lays repainted detail tiles back into their region's painting (A5.1, Stone Eyes' lake): each
// painting pixel the tile covers takes the tile's colour, through both fits and the tile's tone,
// feathered at the tile's edges as its chunks are, so the painting under the tiles agrees with them
// where they fade. Run tools/map-chunks.ts <region> after, to ship the painting.
//   npx tsx tools/map-patch.ts <region-id> <tile-id> [<tile-id> ...]
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { guideJson, paintingPng, tilesJson, workDir } from './map-paths.ts';

/** The feathered edge, as a share of the tile's short side (tools/map-chunks.ts). */
const FEATHER = 0.07;

type Fit = [number, number, number, number, number, number];
interface Frame {
  W: number;
  H: number;
  k: number;
  x0: number;
  y0: number;
  fit?: number[];
}

const [region, ...ids] = process.argv.slice(2);
if (!region || !ids.length) throw new Error('usage: tsx tools/map-patch.ts <region-id> <tile-id> ...');
const guide = JSON.parse(readFileSync(guideJson(region), 'utf8')) as Frame;
const tiles = (JSON.parse(readFileSync(tilesJson(region), 'utf8')) as {
  tiles: (Frame & { id: string; tone?: number[] })[];
}).tiles;

const apply = (m: Fit, x: number, y: number): [number, number] => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
];
const invert = (m: Fit): Fit => {
  const [a, b, c, d, e, f] = m;
  const det = a * d - b * c;
  return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det];
};

const paint = await sharp(paintingPng(region)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const PW = paint.info.width;
const PH = paint.info.height;
const px = paint.data;
const toGuide = invert((guide.fit ?? [1, 0, 0, 1, 0, 0]) as Fit);

for (const id of ids) {
  const t = tiles.find((x) => x.id === id);
  if (!t) throw new Error(`${region} has no tile ${id}`);
  // A little blur first, since the painting samples the tile about three times coarser.
  const img = await sharp(`${workDir(region)}/tile-${id}.png`)
    .removeAlpha()
    .blur(1.2)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const TW = img.info.width;
  const TH = img.info.height;
  const tfit = (t.fit ?? [1, 0, 0, 1, 0, 0]) as Fit;
  const tone = t.tone;
  const f = Math.min(t.W, t.H) * FEATHER;
  let n = 0;
  for (let y = 0; y < PH; y++)
    for (let x = 0; x < PW; x++) {
      // Painting pixel to guide pixel to the world, then to the tile's guide pixel.
      const [gx, gy] = apply(toGuide, x + 0.5, y + 0.5);
      const wx = gx / guide.k + guide.x0;
      const wy = gy / guide.k + guide.y0;
      const ux = (wx - t.x0) * t.k;
      const uy = (wy - t.y0) * t.k;
      if (ux < 0 || uy < 0 || ux >= t.W || uy >= t.H) continue;
      const w = Math.min(1, ux / f, uy / f, (t.W - ux) / f, (t.H - uy) / f);
      // The tile's guide pixel to its painting's pixel, sampled bilinearly.
      const [sx, sy] = apply(tfit, ux, uy);
      const x1 = Math.floor(sx);
      const y1 = Math.floor(sy);
      if (x1 < 0 || y1 < 0 || x1 >= TW - 1 || y1 >= TH - 1) continue;
      const fx = sx - x1;
      const fy = sy - y1;
      const i = (y * PW + x) * 3;
      for (let c = 0; c < 3; c++) {
        const s = (xx: number, yy: number) => img.data[(yy * TW + xx) * 3 + c]!;
        let v =
          (s(x1, y1) * (1 - fx) + s(x1 + 1, y1) * fx) * (1 - fy) +
          (s(x1, y1 + 1) * (1 - fx) + s(x1 + 1, y1 + 1) * fx) * fy;
        if (tone) v = tone[c * 2]! * v + tone[c * 2 + 1]!;
        px[i + c] = Math.max(0, Math.min(255, px[i + c]! * (1 - w) + v * w));
      }
      n++;
    }
  console.log(`${region} tile ${id}: ${n} painting pixels patched`);
}
await sharp(px, { raw: { width: PW, height: PH, channels: 3 } }).png().toFile(paintingPng(region));
console.log(`wrote ${paintingPng(region)}`);
