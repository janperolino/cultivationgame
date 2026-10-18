// Ships a region's map art to public/map/<region>/ (A5, A5.1): the painting as webp, and each detail
// tile cut into a pyramid of 512 px chunks, so the map loads only what is on screen at the
// resolution the zoom needs, like a web map: level 0 is the full image, each level after it half
// the size, down to one chunk. The tile's tone (tools/map-fit.ts) and its feathered edges are baked
// in first, so the chunks draw as they are.
//   npx tsx tools/map-chunks.ts <region-id> [<tile-id> ...]
// With no tile it ships the painting alone. A tile reads tile-<id>-x4.png (tools/map-upscale.ts)
// when there is one, else tile-<id>.png, writes chunks/<id>/L<level>/<col>-<row>.webp, and records
// its pyramid in the region's tiles.json, which the game reads.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { paintingPng, shipDir, tilesJson, workDir } from './map-paths.ts';

const CHUNK = 512;
/** The feathered edge, as a share of the tile's short side; the tiles overlap a tenth. */
const FEATHER = 0.07;

const [region, ...ids] = process.argv.slice(2);
if (!region) throw new Error('usage: tsx tools/map-chunks.ts <region-id> [<tile-id> ...]');
const dir = workDir(region);
const ship = shipDir(region);
mkdirSync(ship, { recursive: true });

// The painting, as the map draws it under the tiles.
const painted = await sharp(paintingPng(region))
  .removeAlpha()
  .webp({ quality: 86, effort: 6 })
  .toFile(`${ship}/painting.webp`);
console.log(`${region}: painting.webp, ${(painted.size / 1e6).toFixed(2)} MB`);

for (const id of ids) await cut(region, id);

async function cut(region: string, id: string) {
  const upscaled = existsSync(`${dir}/tile-${id}-x4.png`);
  const source = upscaled ? `${dir}/tile-${id}-x4.png` : `${dir}/tile-${id}.png`;
  const list = JSON.parse(readFileSync(tilesJson(region), 'utf8')) as {
    tiles: { id: string; tone?: number[]; pyramid?: unknown }[];
  };
  const entry = list.tiles.find((t) => t.id === id);
  if (!entry) throw new Error(`${region} has no tile ${id} in tiles.json`);
  const tone = entry.tone;

  const { data, info } = await sharp(source)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const f = Math.min(W, H) * FEATHER;
  const rgba = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    const fy = Math.min(1, (y + 0.5) / f, (H - y - 0.5) / f);
    for (let x = 0; x < W; x++) {
      const fx = Math.min(1, (x + 0.5) / f, (W - x - 0.5) / f);
      const i = y * W + x;
      for (let c = 0; c < 3; c++) {
        const v = data[i * 3 + c]!;
        rgba[i * 4 + c] = tone
          ? Math.max(0, Math.min(255, tone[c * 2]! * v + tone[c * 2 + 1]!))
          : v;
      }
      rgba[i * 4 + 3] = Math.round(255 * fx * fy);
    }
  }

  const out = `${ship}/chunks/${id}`;
  rmSync(out, { recursive: true, force: true });
  const levels: { cols: number; rows: number; w: number; h: number }[] = [];
  let level = sharp(rgba, { raw: { width: W, height: H, channels: 4 } });
  let w = W;
  let h = H;
  let bytes = 0;
  for (let l = 0; ; l++) {
    const img = await level.raw().toBuffer();
    const cols = Math.ceil(w / CHUNK);
    const rows = Math.ceil(h / CHUNK);
    mkdirSync(`${out}/L${l}`, { recursive: true });
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const cw = Math.min(CHUNK, w - c * CHUNK);
        const ch = Math.min(CHUNK, h - r * CHUNK);
        const file = `${out}/L${l}/${c}-${r}.webp`;
        const written = await sharp(img, { raw: { width: w, height: h, channels: 4 } })
          .extract({ left: c * CHUNK, top: r * CHUNK, width: cw, height: ch })
          .webp({ quality: 82, alphaQuality: 80, effort: 4 })
          .toFile(file);
        bytes += written.size;
      }
    levels.push({ cols, rows, w, h });
    if (cols === 1 && rows === 1) break;
    w = Math.max(1, Math.round(w / 2));
    h = Math.max(1, Math.round(h / 2));
    level = sharp(img, {
      raw: { width: levels.at(-1)!.w, height: levels.at(-1)!.h, channels: 4 },
    }).resize(w, h);
  }
  // `scale`: chunk pixels a pixel of the painting the fit was made for (4 when upscaled).
  entry.pyramid = { chunk: CHUNK, scale: upscaled ? 4 : 1, levels };
  writeFileSync(tilesJson(region), JSON.stringify(list, null, 1) + '\n');
  console.log(
    `${region} tile ${id}: ${levels.length} levels from ${W}x${H}, ${(bytes / 1e6).toFixed(1)} MB`,
  );
}
