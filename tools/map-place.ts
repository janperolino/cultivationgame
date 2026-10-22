// Lays places Jan had ChatGPT paint into their crops (tools/map-crop.ts) back into the map (A5.3;
// design § The travel map, The look): the detail tiles and their x4, the region's painting, then
// the chunks. GPT shifts and re-tones an image a little, so the painted crop is first fitted back
// onto the crop it was painted from, by shift, scale and tone over its untouched edge. What is laid
// back is the middle of the crop and whatever GPT changed (the place), fading out well short of the
// crop's edge, so the land round the place is GPT's own close paint too. What changed is also the
// place's shape, from which a soft gold glow is baked (Jan's call: an outline needs a silhouette GPT's
// redrawn mist won't give, a glow forgives it), shipped as public/map/<region>/places/<place>-glow.webp
// and drawn by the map close in and on hover (src/ui/map/draw.ts); art/map/<region>/places.json says
// where each place's crop lies.
//   npx tsx tools/map-place.ts <region-id> [--check]
// --check stops once each place is fitted and found, writing places/unpainted/<place>-check.jpg (the
// painted crop as it would be laid, with its glow) and laying nothing.
// Every painted place of the region is laid, each folder with a painted.png beside its crop
// (tools/map-paths.ts), in the order they were painted, so a place cut from land already holding an
// earlier one keeps it; each run starts from the unpainted tiles and painting kept in
// places/unpainted/ (git-ignored), so a run is repeatable, and a tile painted or upscaled again since
// is taken as the new unpainted one. A folder laid in moves from "To paint" to "Done". Then it ships
// the painting and the tiles touched (tools/map-chunks.ts).
import { execSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import sharp, { type Sharp } from 'sharp';
import {
  DONE,
  TO_PAINT,
  guideJson,
  paintingPng,
  type PlaceFolder,
  placeFolders,
  placesDir as placesOf,
  shipDir,
  tilesJson,
  workDir,
} from './map-paths.ts';

type Fit = [number, number, number, number, number, number];
interface Frame {
  W: number;
  H: number;
  k: number;
  x0: number;
  y0: number;
  fit?: number[];
}
interface Tile extends Frame {
  id: string;
  tone?: number[];
}
/** A crop's frame in the world (tools/map-crop.ts): w × h li at pw × ph pixels. */
interface Crop {
  place: string;
  x0: number;
  y0: number;
  w: number;
  h: number;
  pw: number;
  ph: number;
}

/** The middle laid back whole, as a share of the way from the centre to the crop's edge. */
const CORE = 0.55;
/** Where the middle has faded out. */
const CORE_OUT = 0.8;
/** The crop's own edge, never laid: a share of its short side. */
const EDGE = 0.05;
/** How far GPT's change must reach, colour distance after softening both, to count as the place. */
const CHANGE = [18, 40] as const;
/** The softening, in crop pixels, that drowns GPT's redrawn texture. */
const SOFTEN = 8;

const region = process.argv[2];
if (!region) throw new Error('usage: tsx tools/map-place.ts <region-id>');
const dir = workDir(region);
const placesDir = placesOf(region);
const keep = `${placesDir}/unpainted`;
mkdirSync(keep, { recursive: true });

const apply = (m: Fit, x: number, y: number): [number, number] => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
];
const invert = (m: Fit): Fit => {
  const [a, b, c, d, e, f] = m;
  const det = a * d - b * c;
  return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det];
};
const smooth = (a: number, b: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

interface Raw {
  w: number;
  h: number;
  c: number;
  data: Buffer | Float32Array;
}
const raw = async (img: Sharp): Promise<Raw> => {
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, c: info.channels, data };
};
/** Bilinear sample of channel c at (x, y) in pixel centres; NaN off the image. */
function at(r: Raw, x: number, y: number, c: number): number {
  const sx = x - 0.5;
  const sy = y - 0.5;
  const x1 = Math.floor(sx);
  const y1 = Math.floor(sy);
  if (x1 < 0 || y1 < 0 || x1 >= r.w - 1 || y1 >= r.h - 1) return NaN;
  const fx = sx - x1;
  const fy = sy - y1;
  const g = (xx: number, yy: number) => r.data[(yy * r.w + xx) * r.c + c]!;
  return (
    (g(x1, y1) * (1 - fx) + g(x1 + 1, y1) * fx) * (1 - fy) +
    (g(x1, y1 + 1) * (1 - fx) + g(x1 + 1, y1 + 1) * fx) * fy
  );
}

/** How far a crop pixel lies from its middle, 0 at the centre and 1 where the ellipse meets an edge. */
const fromMiddle = (cr: Crop, x: number, y: number) =>
  Math.hypot((x / cr.pw - 0.5) * 2, (y / cr.ph - 0.5) * 2);
/** 1 inside the crop, fading to 0 over its edge. */
const edgeIn = (cr: Crop, x: number, y: number) => {
  const f = Math.min(cr.pw, cr.ph) * EDGE;
  return Math.max(0, Math.min(1, x / f, y / f, (cr.pw - x) / f, (cr.ph - y) / f));
};

interface Laid {
  crop: Crop;
  /** The painted crop, fitted and toned to the crop, RGB at the crop's size. */
  paint: Raw;
  /** How much of each pixel is laid back, 0 to 1, at the crop's size. */
  weight: Raw;
  /** The place's glow, its alpha 0 to 255 at a quarter of the crop's size. */
  glow: Raw;
}

/** Fits a painted crop to its crop and finds what GPT painted in. */
async function prepare(f: PlaceFolder): Promise<Laid> {
  const id = f.id;
  const crop = JSON.parse(readFileSync(`${f.dir}/place.json`, 'utf8')) as Crop;
  const { pw, ph } = crop;
  const base = await raw(sharp(`${f.dir}/crop.png`).removeAlpha());
  const painted = await raw(sharp(`${f.dir}/painted.png`).removeAlpha().resize(pw, ph, { fit: 'fill' }));

  // The fit, on brightness, over the edge GPT was told to leave alone: the scale about the middle and
  // the shift that lay the painted crop's land on the crop's best, by correlation, since GPT re-tones
  // too. Coarse at a quarter size, then fine.
  const lum = async (file: string, D: number) =>
    raw(sharp(file).removeAlpha().resize(pw / D, ph / D, { fit: 'fill' }).greyscale().blur(1).extractChannel(0));
  let best = { e: -Infinity, s: 1, dx: 0, dy: 0 };
  for (const [D, ss, shifts, step] of [
    [4, [-0.04, -0.03, -0.02, -0.01, 0, 0.01, 0.02, 0.03, 0.04], [-24, 24, 4], 2],
    [1, [-0.0075, -0.005, -0.0025, 0, 0.0025, 0.005, 0.0075], [-4, 4, 1], 4],
  ] as const) {
    const a = await lum(`${f.dir}/crop.png`, D);
    const b = await lum(`${f.dir}/painted.png`, D);
    const around = { ...best };
    for (const sc of ss.map((d) => around.s + d))
      for (let dy = around.dy + shifts[0]; dy <= around.dy + shifts[1]; dy += shifts[2])
        for (let dx = around.dx + shifts[0]; dx <= around.dx + shifts[1]; dx += shifts[2]) {
          let n = 0, sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
          for (let y = 2; y < a.h - 2; y += step)
            for (let x = 2; x < a.w - 2; x += step) {
              if (Math.hypot((x / a.w - 0.5) * 2, (y / a.h - 0.5) * 2) < CORE_OUT) continue;
              const v = at(b, (x + 0.5 - a.w / 2) * sc + a.w / 2 + dx / D, (y + 0.5 - a.h / 2) * sc + a.h / 2 + dy / D, 0);
              if (Number.isNaN(v)) continue;
              const u = a.data[y * a.w + x] as number;
              n++; sa += u; sb += v; saa += u * u; sbb += v * v; sab += u * v;
            }
          const e = (n * sab - sa * sb) / Math.sqrt((n * saa - sa * sa) * (n * sbb - sb * sb) || 1);
          if (n && e > best.e) best = { e, s: sc, dx, dy };
        }
    best.e = -Infinity;
  }
  const sx = (x: number) => (x - pw / 2) * best.s + pw / 2 + best.dx;
  const sy = (y: number) => (y - ph / 2) * best.s + ph / 2 + best.dy;

  // The painted crop through the fit, then its tone, per channel over the same edge.
  const fitted = new Float32Array(pw * ph * 3);
  for (let y = 0; y < ph; y++)
    for (let x = 0; x < pw; x++)
      for (let c = 0; c < 3; c++) {
        const v = at(painted, sx(x + 0.5), sy(y + 0.5), c);
        fitted[(y * pw + x) * 3 + c] = Number.isNaN(v) ? (base.data[(y * pw + x) * 3 + c] as number) : v;
      }
  const tone: number[] = [];
  for (let c = 0; c < 3; c++) {
    let n = 0, sp = 0, sb = 0, spp = 0, spb = 0;
    for (let y = 0; y < ph; y += 2)
      for (let x = 0; x < pw; x += 2) {
        if (fromMiddle(crop, x, y) < CORE_OUT) continue;
        const p = fitted[(y * pw + x) * 3 + c]!;
        const q = base.data[(y * pw + x) * 3 + c] as number;
        n++; sp += p; sb += q; spp += p * p; spb += p * q;
      }
    const gain = Math.max(0.75, Math.min(1.33, (n * spb - sp * sb) / (n * spp - sp * sp || 1)));
    tone.push(gain, (sb - gain * sp) / n);
  }
  for (let i = 0; i < fitted.length; i++)
    fitted[i] = Math.max(0, Math.min(255, tone[(i % 3) * 2]! * fitted[i]! + tone[(i % 3) * 2 + 1]!));
  const paint: Raw = { w: pw, h: ph, c: 3, data: fitted };

  // What GPT changed: the colour distance between the two softened, since GPT redraws the land's
  // texture everywhere and only the place changes its colour and light; and of that only what joins
  // the middle, so a stray repainted rock out in the edge isn't taken for the place.
  const soft = (data: Buffer | Float32Array) =>
    raw(sharp(Buffer.from(data), { raw: { width: pw, height: ph, channels: 3 } }).blur(SOFTEN));
  const [fs, bs] = await Promise.all([soft(fitted), soft(base.data)]);
  const changed = new Float32Array(pw * ph);
  for (let i = 0; i < pw * ph; i++) {
    let d = 0;
    for (let c = 0; c < 3; c++) d += ((fs.data[i * 3 + c] as number) - (bs.data[i * 3 + c] as number)) ** 2;
    changed[i] = smooth(CHANGE[0], CHANGE[1], Math.sqrt(d));
  }
  const joined = new Uint8Array(pw * ph);
  const stack: number[] = [];
  for (let y = 0; y < ph; y++)
    for (let x = 0; x < pw; x++)
      if (fromMiddle(crop, x, y) < 0.2 && changed[y * pw + x]! > 0.5) stack.push(y * pw + x);
  while (stack.length) {
    const i = stack.pop()!;
    if (joined[i]) continue;
    joined[i] = 1;
    const x = i % pw;
    const y = (i - x) / pw;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const)
      if (nx >= 0 && ny >= 0 && nx < pw && ny < ph && !joined[ny * pw + nx] && changed[ny * pw + nx]! > 0.5)
        stack.push(ny * pw + nx);
  }
  // The place, grown and softened a little so its laid edge doesn't show.
  const place = await raw(
    sharp(Buffer.from(joined.map((v) => v * 255)), { raw: { width: pw, height: ph, channels: 1 } })
      .blur(10)
      .extractChannel(0),
  );
  const weight = new Float32Array(pw * ph);
  for (let y = 0; y < ph; y++)
    for (let x = 0; x < pw; x++) {
      const i = y * pw + x;
      const core = 1 - smooth(CORE, CORE_OUT, fromMiddle(crop, x + 0.5, y + 0.5));
      const grown = Math.min(1, ((place.data[i] as number) / 255) * 2);
      weight[i] = Math.max(core, grown) * edgeIn(crop, x + 0.5, y + 0.5);
    }

  const glow = await glowOf(crop, joined);
  // A check to look at: the painted crop as laid, dimmed where it isn't, with its glow.
  const check = Buffer.alloc(pw * ph * 3);
  for (let y = 0; y < ph; y++)
    for (let x = 0; x < pw; x++) {
      const i = y * pw + x;
      const g = at(glow, (x + 0.5) / GLOW_DOWN, (y + 0.5) / GLOW_DOWN, 0) / 255 || 0;
      for (let c = 0; c < 3; c++) {
        const v = fitted[i * 3 + c]! * (0.35 + 0.65 * weight[i]!);
        check[i * 3 + c] = 255 - ((255 - v) * (255 - GOLD[c]! * g * 0.6)) / 255;
      }
    }
  await sharp(check, { raw: { width: pw, height: ph, channels: 3 } })
    .jpeg({ quality: 80 })
    .toFile(`${keep}/${id}-check.jpg`);
  const found = joined.reduce((s, v) => s + v, 0);
  console.log(
    `${id}: fitted ×${best.s.toFixed(4)} shift ${best.dx},${best.dy} px; the place ${((100 * found) / (pw * ph)).toFixed(1)}% of the crop`,
  );
  if (!found) console.warn(`${id}: nothing painted at the middle was found; is the place in its centre?`);
  return { crop, paint, weight: { w: pw, h: ph, c: 1, data: weight }, glow };
}

/** The glow is baked at this share of the crop's size. */
const GLOW_DOWN = 4;
/** How far the glow spreads past the place, as a share of the crop's short side. */
const GLOW_SPREAD = 0.035;
/** The glow's gold, as the check shows it; the map tints it its own way. */
const GOLD = [230, 180, 70];

/**
 * The place's glow: its shape spread wide and softened, the place itself held to about half so the
 * glow gathers at its rim, a halo rather than a wash.
 */
async function glowOf(cr: Crop, joined: Uint8Array): Promise<Raw> {
  const w = Math.round(cr.pw / GLOW_DOWN);
  const h = Math.round(cr.ph / GLOW_DOWN);
  const spread = (sigma: number) =>
    raw(
      sharp(Buffer.from(joined.map((v) => v * 255)), { raw: { width: cr.pw, height: cr.ph, channels: 1 } })
        .resize(w, h)
        .blur(sigma)
        .extractChannel(0),
    );
  const wide = await spread(Math.max(0.3, (Math.min(cr.pw, cr.ph) * GLOW_SPREAD) / GLOW_DOWN));
  const narrow = await spread(1);
  const data = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) {
    const g = Math.min(1, ((wide.data[i] as number) / 255) * 1.6);
    data[i] = Math.round(255 * g * (1 - 0.55 * ((narrow.data[i] as number) / 255)));
  }
  return { w, h, c: 1, data };
}

// ---------------------------------------------------------------- laying back

const guide = JSON.parse(readFileSync(guideJson(region), 'utf8')) as Frame;
const tiles = (JSON.parse(readFileSync(tilesJson(region), 'utf8')) as { tiles: Tile[] }).tiles;

/** The working file to lay into, from its unpainted copy, unless it was made again since the last run. */
const state: Record<string, number> = existsSync(`${keep}/state.json`)
  ? JSON.parse(readFileSync(`${keep}/state.json`, 'utf8'))
  : {};
function unpainted(file: string): string {
  const name = file.split('/').pop()!;
  const kept = `${keep}/${name}`;
  if (!existsSync(kept) || state[name] !== statSync(file).mtimeMs) copyFileSync(file, kept);
  return kept;
}

/**
 * Lays the places into one picture. `toWorld` takes a pixel of the picture to li; `tone` is the
 * picture's own tone (a tile's, which the crops have in them), undone on the way in.
 */
async function layInto(
  file: string,
  laid: Laid[],
  toWorld: (x: number, y: number) => [number, number],
  fromWorld: (wx: number, wy: number) => [number, number],
  tone?: number[],
) {
  const pic = await raw(sharp(unpainted(file)).removeAlpha());
  const px = pic.data as Buffer;
  let n = 0;
  for (const l of laid) {
    const cr = l.crop;
    // The picture's pixels the crop covers, and how many crop pixels make one of them.
    const corners = [
      [cr.x0, cr.y0],
      [cr.x0 + cr.w, cr.y0],
      [cr.x0, cr.y0 + cr.h],
      [cr.x0 + cr.w, cr.y0 + cr.h],
    ].map(([x, y]) => fromWorld(x!, y!));
    const xs = corners.map((p) => p[0]);
    const ys = corners.map((p) => p[1]);
    const x0 = Math.max(0, Math.floor(Math.min(...xs)));
    const x1 = Math.min(pic.w, Math.ceil(Math.max(...xs)));
    const y0 = Math.max(0, Math.floor(Math.min(...ys)));
    const y1 = Math.min(pic.h, Math.ceil(Math.max(...ys)));
    if (x0 >= x1 || y0 >= y1) continue;
    // Shrunk to about the picture's own density first, so a coarse picture takes an average.
    const per = Math.max(1, cr.pw / (Math.max(...xs) - Math.min(...xs)));
    const sw = Math.max(2, Math.round(cr.pw / per));
    const sh = Math.max(2, Math.round(cr.ph / per));
    const shrink = (r: Raw) =>
      per > 1.2
        ? raw(sharp(Buffer.from(r.c === 1 ? (r.data as Float32Array).map((v) => v * 255) : r.data), {
            raw: { width: r.w, height: r.h, channels: r.c as 1 | 3 },
          }).resize(sw, sh))
        : Promise.resolve(r.c === 1 ? { ...r, data: (r.data as Float32Array).map((v) => v * 255) } : r);
    const paint = await shrink(l.paint);
    const weight = await shrink(l.weight);
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const [wx, wy] = toWorld(x + 0.5, y + 0.5);
        const u = ((wx - cr.x0) / cr.w) * paint.w;
        const v = ((wy - cr.y0) / cr.h) * paint.h;
        const w = at(weight, u, v, 0) / 255;
        if (!(w > 0.002)) continue;
        const i = (y * pic.w + x) * 3;
        for (let c = 0; c < 3; c++) {
          let p = at(paint, u, v, c);
          if (tone) p = (p - tone[c * 2 + 1]!) / tone[c * 2]!;
          px[i + c] = Math.max(0, Math.min(255, px[i + c]! * (1 - w) + p * w));
        }
        n++;
      }
  }
  await sharp(px, { raw: { width: pic.w, height: pic.h, channels: 3 } }).png().toFile(file);
  state[file.split('/').pop()!] = statSync(file).mtimeMs;
  console.log(`${file}: ${n} pixels laid`);
}

/**
 * Jan's paintings dropped loose in "To paint" under ChatGPT's own names: each is matched to the
 * place whose crop it was painted from, by its edge (which the prompt keeps), and filed as that
 * folder's painted.png; a done place's old painting goes to places/takes/ (git-ignored) first.
 */
async function fileLoose() {
  const root = `${placesDir}/${TO_PAINT}`;
  if (!existsSync(root)) return;
  const loose = readdirSync(root).filter((f) => /\.png$/i.test(f));
  if (!loose.length) return;
  const S = 64;
  // The edge's brightness, beyond 75% of the way out, at a small size, normalised.
  const edge = async (file: string) => {
    const m = await sharp(file).metadata();
    const r = await raw(sharp(file).removeAlpha().resize(S, S, { fit: 'fill' }).greyscale().extractChannel(0));
    const v: number[] = [];
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++)
        if (Math.hypot(((x + 0.5) / S - 0.5) * 2, ((y + 0.5) / S - 0.5) * 2) > 0.75)
          v.push(r.data[y * S + x] as number);
    const mean = v.reduce((s, a) => s + a, 0) / v.length;
    const sd = Math.sqrt(v.reduce((s, a) => s + (a - mean) ** 2, 0) / v.length) || 1;
    return { aspect: m.width! / m.height!, v: v.map((a) => (a - mean) / sd) };
  };
  const crops = await Promise.all(
    placeFolders(region!).map(async (f) => ({ f, e: await edge(`${f.dir}/crop.png`) })),
  );
  for (const file of loose) {
    const e = await edge(`${root}/${file}`);
    let best: { f: PlaceFolder; r: number } | null = null;
    for (const c of crops) {
      if (Math.abs(c.e.aspect - e.aspect) > 0.1) continue;
      const r = c.e.v.reduce((s, a, i) => s + a * e.v[i]!, 0) / e.v.length;
      if (!best || r > best.r) best = { f: c.f, r };
    }
    if (!best || best.r < 0.5) {
      console.warn(`${file}: matches no place's crop (best ${best?.r.toFixed(2) ?? 'none'}); left where it is`);
      continue;
    }
    const to = `${best.f.dir}/painted.png`;
    if (existsSync(to)) {
      mkdirSync(`${placesDir}/takes`, { recursive: true });
      renameSync(to, `${placesDir}/takes/${best.f.id}-${statSync(to).mtimeMs.toFixed(0)}.png`);
    }
    renameSync(`${root}/${file}`, to);
    console.log(`${file}: ${best.f.name} (edge match ${best.r.toFixed(2)})`);
  }
}
await fileLoose();

const painted = placeFolders(region)
  .filter((f) => existsSync(`${f.dir}/painted.png`))
  .sort((a, b) => statSync(`${a.dir}/painted.png`).mtimeMs - statSync(`${b.dir}/painted.png`).mtimeMs);
if (!painted.length) throw new Error(`no painted places in ${placesDir} (a painted.png in a place's folder)`);
const laid = await Promise.all(painted.map(prepare));
if (process.argv.includes('--check')) {
  console.log(`checks in ${keep}/`);
  process.exit(0);
}

// The region's painting: its pixel to its guide's, through the fit, to the world.
const gFit = (guide.fit ?? [1, 0, 0, 1, 0, 0]) as Fit;
const toGuide = invert(gFit);
await layInto(
  paintingPng(region),
  laid,
  (x, y) => {
    const [gx, gy] = apply(toGuide, x, y);
    return [gx / guide.k + guide.x0, gy / guide.k + guide.y0];
  },
  (wx, wy) => apply(gFit, (wx - guide.x0) * guide.k, (wy - guide.y0) * guide.k),
);

// Each tile a crop touches, and its x4: the tile's pixel to its guide's, to the world.
const touched: string[] = [];
for (const t of tiles) {
  const over = laid.filter(
    (l) =>
      t.x0 < l.crop.x0 + l.crop.w &&
      t.x0 + t.W / t.k > l.crop.x0 &&
      t.y0 < l.crop.y0 + l.crop.h &&
      t.y0 + t.H / t.k > l.crop.y0,
  );
  if (!over.length) continue;
  touched.push(t.id);
  const tFit = (t.fit ?? [1, 0, 0, 1, 0, 0]) as Fit;
  const back = invert(tFit);
  for (const scale of [1, 4]) {
    const file = `${dir}/tile-${t.id}${scale === 4 ? '-x4' : ''}.png`;
    if (!existsSync(file)) continue;
    await layInto(
      file,
      over,
      (x, y) => {
        const [ux, uy] = apply(back, x / scale, y / scale);
        return [ux / t.k + t.x0, uy / t.k + t.y0];
      },
      (wx, wy) => {
        const [sx, sy] = apply(tFit, (wx - t.x0) * t.k, (wy - t.y0) * t.k);
        return [sx * scale, sy * scale];
      },
      t.tone,
    );
  }
}
writeFileSync(`${keep}/state.json`, JSON.stringify(state));

// What the map reads: each painted place's frame, and its glow, white with the glow as its alpha.
mkdirSync(`${shipDir(region)}/places`, { recursive: true });
for (const l of laid) {
  const { w, h, data } = l.glow;
  const rgba = Buffer.alloc(w * h * 4, 255);
  for (let i = 0; i < w * h; i++) rgba[i * 4 + 3] = data[i] as number;
  await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .webp({ quality: 80, alphaQuality: 70 })
    .toFile(`${shipDir(region)}/places/${l.crop.place}-glow.webp`);
}

/** The glow's alpha from which a place counts as drawn, for its footprint. */
const FOOT_ALPHA = 100;

/**
 * The place's footprint on the map, [x0, y0, x1, y1] in li: where its glow is strong, the place
 * itself and a little round it. Claims never sit on it (core/dwellings.ts, Jan's playtest after S1).
 */
function footOf(l: (typeof laid)[number]): [number, number, number, number] {
  const { w, h, data } = l.glow;
  let [x0, y0, x1, y1] = [w, h, 0, 0];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if ((data[y * w + x] as number) >= FOOT_ALPHA) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x + 1);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y + 1);
      }
  const kx = l.crop.w / w;
  const ky = l.crop.h / h;
  return [
    Math.round(l.crop.x0 + x0 * kx),
    Math.round(l.crop.y0 + y0 * ky),
    Math.round(l.crop.x0 + x1 * kx),
    Math.round(l.crop.y0 + y1 * ky),
  ];
}

writeFileSync(
  `${dir}/places.json`,
  `${JSON.stringify({
    region,
    places: laid.map((l) => ({
      id: l.crop.place,
      x0: l.crop.x0,
      y0: l.crop.y0,
      w: l.crop.w,
      h: l.crop.h,
      foot: footOf(l),
    })),
  })}\n`,
);
console.log(`wrote ${dir}/places.json`);

// The places laid in for the first time move to Done.
mkdirSync(`${placesDir}/${DONE}`, { recursive: true });
for (const f of painted.filter((f) => !f.done)) {
  const to = `${placesDir}/${DONE}/${f.dir.split('/').pop()}`;
  renameSync(f.dir, to);
  console.log(`${f.name}: done, now in ${to}`);
}

// Ship the painting and the touched tiles' chunks.
// One command line, as npm scripts run it on Windows too; the region and tile ids are plain words.
execSync(`npx tsx tools/map-chunks.ts ${region} ${touched.join(' ')}`, { stdio: 'inherit' });
