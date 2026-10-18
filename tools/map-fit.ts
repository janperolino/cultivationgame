// Fits GPT's painting of a region back onto its guide (A5). GPT keeps a guide's layout only
// roughly (the Border Wilds came back squashed 12% and shifted down), so this finds the stretch,
// rotation and shift that best lay the painting's sea and the land beyond the region onto the
// guide's, and writes it to the guide's json as `fit`: guide pixel to painting pixel, as a canvas
// matrix [a, b, c, d, e, f]. The map draws the painting through its inverse.
// A detail tile (--tile) has no sea to go by in the land's middle, so it is fitted to its reference,
// the region's painting cut to the tile, by color; its fit lands in the tiles' json.
//   npx tsx tools/map-fit.ts <region-id> [--tile <c-r>]
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const args = process.argv.slice(2);
const region = args[0];
if (!region) throw new Error('usage: tsx tools/map-fit.ts <region-id> [--tile <c-r>]');
const tile = args.includes('--tile') ? args[args.indexOf('--tile') + 1]! : null;
const tileDir = `docs/mockups/map-tiles/${region}`;
const guideFile = `docs/mockups/map-guide-${region}.png`;
const paintFile = `docs/mockups/map-painting-${region}.png`;
const jsonFile = `docs/mockups/map-guide-${region}.json`;

/** Work at a quarter size. */
const D = 4;

interface Masks {
  w: number;
  h: number;
  sea: Uint8Array;
  beyond: Uint8Array;
}

const near = (v: number, c: number, tol: number) => Math.abs(v - c) < tol;

/** The guide's sea (#0d1b2e) and the land beyond (#3b3b3b), read by their flat colors. */
async function guideMasks(): Promise<Masks> {
  const m = await sharp(guideFile).metadata();
  const w = Math.round(m.width! / D);
  const h = Math.round(m.height! / D);
  const { data } = await sharp(guideFile)
    .removeAlpha()
    .resize(w, h, { kernel: 'nearest' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sea = new Uint8Array(w * h);
  const beyond = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const [r, g, b] = [data[i * 3]!, data[i * 3 + 1]!, data[i * 3 + 2]!];
    if (near(r, 13, 8) && near(g, 27, 8) && near(b, 46, 8)) sea[i] = 1;
    else if (near(r, 59, 6) && near(g, 59, 6) && near(b, 59, 6)) beyond[i] = 1;
  }
  return { w, h, sea, beyond };
}

/** The painting's sea (dark blue water joined to the frame's edge) and the land beyond (dark and grey). */
async function paintMasks(): Promise<Masks> {
  const m = await sharp(paintFile).metadata();
  const w = Math.round(m.width! / D);
  const h = Math.round(m.height! / D);
  const { data } = await sharp(paintFile)
    .removeAlpha()
    .resize(w, h)
    .blur(3)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const water = new Uint8Array(w * h);
  const beyond = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const [r, g, b] = [data[i * 3]!, data[i * 3 + 1]!, data[i * 3 + 2]!];
    const lum = 0.3 * r + 0.59 * g + 0.11 * b;
    const hi = Math.max(r, g, b);
    const sat = hi ? (hi - Math.min(r, g, b)) / hi : 0;
    if (b > r + 18 && b > g && lum < 70) water[i] = 1;
    else if (lum < 62 && sat < 0.3) beyond[i] = 1;
  }
  // Inland lakes are not the sea: keep only the water that reaches the frame.
  const sea = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const i = stack.pop()!;
    if (sea[i] || !water[i]) continue;
    sea[i] = 1;
    const x = i % w;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (i >= w) stack.push(i - w);
    if (i < w * (h - 1)) stack.push(i + w);
  }
  return { w, h, sea, beyond };
}

/** [scale, x stretch, rotation, x shift, y shift], about the frame's centre, in quarter pixels. */
type Q = [number, number, number, number, number];

/** A guide pixel (in quarters) to the painting's, under q. */
function warp([s, ax, rot, tx, ty]: Q, w: number, h: number) {
  const c = Math.cos(rot) * s;
  const sn = Math.sin(rot) * s;
  const cx = w / 2;
  const cy = h / 2;
  return (x: number, y: number): [number, number] => [
    Math.round(cx + c * (x - cx) * ax - sn * (y - cy) + tx),
    Math.round(cy + sn * (x - cx) * ax + c * (y - cy) + ty),
  ];
}

/** The region: its painted sea and land beyond against the guide's. */
async function regionScore(): Promise<{ w: number; h: number; score: (q: Q) => number }> {
  const G = await guideMasks();
  const P = await paintMasks();
  return {
    w: G.w,
    h: G.h,
    score(q) {
      const to = warp(q, G.w, G.h);
      let seaBoth = 0;
      let seaAny = 0;
      let beyondBoth = 0;
      let beyondAny = 0;
      for (let y = 0; y < G.h; y++)
        for (let x = 0; x < G.w; x++) {
          const [px, py] = to(x, y);
          let ps = 0;
          let pb = 0;
          if (px >= 0 && py >= 0 && px < P.w && py < P.h) {
            ps = P.sea[py * P.w + px]!;
            pb = P.beyond[py * P.w + px]!;
          }
          const gs = G.sea[y * G.w + x]!;
          const gb = G.beyond[y * G.w + x]!;
          if (gs && ps) seaBoth++;
          if (gs || ps) seaAny++;
          if (gb && pb) beyondBoth++;
          if (gb || pb) beyondAny++;
        }
      return seaBoth / seaAny + 0.6 * (beyondBoth / beyondAny);
    },
  };
}

/** A tile: its painting's colors against its reference's, blurred so detail doesn't count. */
async function tileScore(): Promise<{
  w: number;
  h: number;
  score: (q: Q) => number;
  tone: (q: Q) => number[];
}> {
  const load = async (file: string, w: number, h: number) =>
    (await sharp(file).removeAlpha().resize(w, h).blur(2).raw().toBuffer()) as Buffer;
  const m = await sharp(`${tileDir}/tile-${tile}-ref.png`).metadata();
  const w = Math.round(m.width! / D);
  const h = Math.round(m.height! / D);
  const ref = await load(`${tileDir}/tile-${tile}-ref.png`, w, h);
  const pm = await sharp(`${tileDir}/tile-${tile}.png`).metadata();
  const pw = Math.round(pm.width! / D);
  const ph = Math.round(pm.height! / D);
  const paint = await load(`${tileDir}/tile-${tile}.png`, pw, ph);
  return {
    w,
    h,
    score(q) {
      const to = warp(q, w, h);
      let sum = 0;
      let n = 0;
      for (let y = 0; y < h; y += 2)
        for (let x = 0; x < w; x += 2) {
          const i = (y * w + x) * 3;
          if (ref[i]! + ref[i + 1]! + ref[i + 2]! < 15) continue;
          const [px, py] = to(x, y);
          n++;
          if (px < 0 || py < 0 || px >= pw || py >= ph) {
            sum += 3 * 255 * 255;
            continue;
          }
          const j = (py * pw + px) * 3;
          for (let ch = 0; ch < 3; ch++) sum += (ref[i + ch]! - paint[j + ch]!) ** 2;
        }
      return -sum / Math.max(1, n);
    },
    // GPT paints a tile darker or cooler than the region's painting it came from: a gain and an
    // offset a channel, [gain r, offset r, gain g, ...], bring its colors back to the reference's.
    tone(q) {
      const to = warp(q, w, h);
      const stats = [0, 1, 2].map(() => ({ r: 0, rr: 0, p: 0, pp: 0, n: 0 }));
      for (let y = 0; y < h; y += 2)
        for (let x = 0; x < w; x += 2) {
          const i = (y * w + x) * 3;
          if (ref[i]! + ref[i + 1]! + ref[i + 2]! < 15) continue;
          const [px, py] = to(x, y);
          if (px < 0 || py < 0 || px >= pw || py >= ph) continue;
          const j = (py * pw + px) * 3;
          for (let ch = 0; ch < 3; ch++) {
            const st = stats[ch]!;
            st.r += ref[i + ch]!;
            st.rr += ref[i + ch]! ** 2;
            st.p += paint[j + ch]!;
            st.pp += paint[j + ch]! ** 2;
            st.n++;
          }
        }
      return stats.flatMap(({ r, rr, p, pp, n }) => {
        const mr = r / n;
        const mp = p / n;
        const sr = Math.sqrt(Math.max(1, rr / n - mr * mr));
        const sp = Math.sqrt(Math.max(1, pp / n - mp * mp));
        const gain = Math.max(0.5, Math.min(2, sr / sp));
        return [+gain.toFixed(4), +(mr - gain * mp).toFixed(2)];
      });
    },
  };
}

const scorer: { w: number; h: number; score: (q: Q) => number; tone?: (q: Q) => number[] } = tile
  ? await tileScore()
  : await regionScore();
const { w: GW, h: GH, score } = scorer;

let q: Q = [1, 1, 0, 0, 0];
const before = score(q);
let best = before;
const steps = [0.04, 0.04, 0.02, 6, 6];
for (let round = 0; round < 80 && steps[3]! >= 0.25; round++) {
  let improved = false;
  for (let k = 0; k < 5; k++)
    for (const sign of [1, -1]) {
      const t = [...q] as Q;
      t[k]! += sign * steps[k]!;
      const v = score(t);
      if (v > best) {
        best = v;
        q = t;
        improved = true;
      }
    }
  if (!improved) for (let k = 0; k < 5; k++) steps[k]! /= 2;
}

// Back to full pixels: painting = M · guide, as a canvas matrix.
const [s, ax, rot, tx, ty] = q;
const c = Math.cos(rot) * s;
const sn = Math.sin(rot) * s;
const cx = (GW * D) / 2;
const cy = (GH * D) / 2;
const a = c * ax;
const b = sn * ax;
const fit = [a, b, -sn, c, cx + tx * D - (a * cx - sn * cy), cy + ty * D - (b * cx + c * cy)].map(
  (v) => +v.toFixed(5),
);

if (tile) {
  const file = `${tileDir}/tiles.json`;
  const list = JSON.parse(readFileSync(file, 'utf8')) as {
    tiles: { id: string; fit?: number[]; tone?: number[] }[];
  };
  const t = list.tiles.find((x) => x.id === tile);
  if (!t) throw new Error(`no tile ${tile} in ${file}`);
  t.fit = fit;
  if (scorer.tone) t.tone = scorer.tone(q);
  writeFileSync(file, `${JSON.stringify(list, null, 1)}\n`);
} else {
  const guide = JSON.parse(readFileSync(jsonFile, 'utf8')) as Record<string, unknown>;
  writeFileSync(jsonFile, `${JSON.stringify({ ...guide, fit })}\n`);
}
console.log(
  `${region}${tile ? ` tile ${tile}` : ''}: match ${before.toFixed(3)} → ${best.toFixed(3)}; fit ${JSON.stringify(fit)}`,
);
