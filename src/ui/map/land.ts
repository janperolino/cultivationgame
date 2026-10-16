// The land under the travel map (design § The world, The travel map: The look): a shaded relief
// lit from the north-west, built once per region from its terrain with ragged blended borders, and
// the painted marks placed once by the world's seed and fixed in the world, so zooming brings them
// closer and never adds more. Both are cached per region.
import { fbm, valueNoise, type Pt } from '../../core/map/geometry.ts';
import { inRegion, terrainAt, type RegionMap } from '../../core/map/region.ts';
import { hashSeed, mulberry32 } from '../../core/rng.ts';

const TERRAIN_IDS = [
  'none',
  'karst',
  'hills',
  'plains',
  'forest',
  'marsh',
  'coast',
  'mountains',
  'jungle',
];
/** How tall each terrain stands in the relief. */
const AMP = [0, 1, 0.55, 0.12, 0.3, 0.04, 0.1, 1.2, 0.35];
/** Each terrain's tint, before the light. */
const TINT: [number, number, number][] = [
  [0, 0, 0],
  [44, 56, 64],
  [64, 54, 43],
  [58, 61, 45],
  [34, 54, 42],
  [36, 51, 62],
  [62, 57, 47],
  [58, 58, 62],
  [30, 52, 38],
];
/** The ink of each terrain's painted marks. */
export const TERRAIN_INK: Record<string, string> = {
  karst: '#a9bcc6',
  hills: '#cfa77a',
  plains: '#c4c08a',
  forest: '#83b892',
  marsh: '#8ab9c6',
  coast: '#d2bb90',
  mountains: '#b8bcc4',
  jungle: '#7fb88a',
};

export interface Relief {
  canvas: HTMLCanvasElement;
  x0: number;
  y0: number;
  res: number;
  w: number;
  h: number;
}

function boxBlur(
  src: Float32Array<ArrayBuffer>,
  w: number,
  h: number,
  r: number,
): Float32Array<ArrayBuffer> {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    let acc = 0;
    let n = 0;
    for (let x = -r; x < w + r; x++) {
      if (x + r < w) {
        acc += src[y * w + x + r]!;
        n++;
      }
      if (x - r - 1 >= 0) {
        acc -= src[y * w + x - r - 1]!;
        n--;
      }
      if (x >= 0 && x < w) tmp[y * w + x] = acc / n;
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    let n = 0;
    for (let y = -r; y < h + r; y++) {
      if (y + r < h) {
        acc += tmp[(y + r) * w + x]!;
        n++;
      }
      if (y - r - 1 >= 0) {
        acc -= tmp[(y - r - 1) * w + x]!;
        n--;
      }
      if (y >= 0 && y < h) out[y * w + x] = acc / n;
    }
  }
  return out;
}

const RELIEFS = new WeakMap<RegionMap, Relief>();

/** The region's shaded relief, a canvas in world space at 60 li a pixel. */
export function reliefOf(map: RegionMap): Relief {
  const cached = RELIEFS.get(map);
  if (cached) return cached;
  const res = 60;
  const [bx0, by0, bx1, by1] = map.bbox;
  const x0 = bx0;
  const y0 = by0;
  const w = Math.ceil((bx1 - bx0) / res);
  const h = Math.ceil((by1 - by0) / res);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d')!;
  const ring = (pts: readonly Pt[]) => {
    pts.forEach(([x, y], i) =>
      i ? g.lineTo((x - x0) / res, (y - y0) / res) : g.moveTo((x - x0) / res, (y - y0) / res),
    );
    g.closePath();
  };
  const fillMulti = (m: RegionMap['outline'], id: number) => {
    g.beginPath();
    for (const poly of m) for (const r of poly) ring(r);
    g.fillStyle = `rgb(${id * 28},0,0)`;
    g.fill('evenodd');
  };
  const idOf = (t: string) => Math.max(1, TERRAIN_IDS.indexOf(t));
  g.save();
  g.beginPath();
  for (const poly of map.outline) for (const r of poly) ring(r);
  g.clip('evenodd');
  fillMulti(map.outline, idOf(map.terrain));
  for (const a of map.areas) if (a.kind === 'tract') fillMulti(a.outline, idOf(a.terrain));
  for (const a of map.areas) if (a.kind !== 'tract') fillMulti(a.outline, idOf(a.terrain));
  g.restore();
  const px = g.getImageData(0, 0, w, h).data;
  const N = w * h;
  // Borders read through a warp, so terrains meet along ragged edges.
  const idAt = (x: number, y: number) => {
    const xi = Math.max(0, Math.min(w - 1, Math.round(x)));
    const yi = Math.max(0, Math.min(h - 1, Math.round(y)));
    const j = (yi * w + xi) * 4;
    return px[j + 3]! > 0 ? Math.round(px[j]! / 28) : 0;
  };
  let A = new Float32Array(N);
  let K = new Float32Array(N);
  let R = new Float32Array(N);
  let G = new Float32Array(N);
  let B = new Float32Array(N);
  const L = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const x = i % w;
    const y = (i / w) | 0;
    const wx = x0 + x * res;
    const wy = y0 + y * res;
    const ox =
      (fbm(wx / 6000, wy / 6000, 51) - 0.5) * 60 +
      (valueNoise(wx / 1500, wy / 1500, 52) - 0.5) * 16;
    const oy =
      (fbm(wx / 6000, wy / 6000, 53) - 0.5) * 60 +
      (valueNoise(wx / 1500, wy / 1500, 54) - 0.5) * 16;
    const t = idAt(x + ox, y + oy) || Math.round(px[i * 4]! / 28);
    L[i] = px[i * 4 + 3]! / 255;
    A[i] = AMP[t] ?? 0;
    K[i] = t === 1 ? 1 : 0;
    const c = TINT[t] ?? TINT[0]!;
    R[i] = c[0];
    G[i] = c[1];
    B[i] = c[2];
  }
  A = boxBlur(boxBlur(A, w, h, 7), w, h, 7);
  K = boxBlur(K, w, h, 4);
  R = boxBlur(boxBlur(R, w, h, 6), w, h, 6);
  G = boxBlur(boxBlur(G, w, h, 6), w, h, 6);
  B = boxBlur(boxBlur(B, w, h, 6), w, h, 6);
  const H = new Float32Array(N);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const wx = x0 + x * res;
      const wy = y0 + y * res;
      const base = fbm(wx / 9000, wy / 9000, 11) * 0.55 + fbm(wx / 2600, wy / 2600, 23) * 0.45;
      const ridge = 1 - Math.abs(2 * valueNoise(wx / 640, wy / 640, 37) - 1);
      H[i] =
        A[i]! * base +
        K[i]! * Math.pow(ridge, 4) * 0.32 * (0.6 + 0.8 * fbm(wx / 5000, wy / 5000, 41));
    }
  const img = g.createImageData(w, h);
  const o = img.data;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (L[i]! <= 0) continue;
      const dx = H[i + 1]! - H[i - 1]!;
      const dy = H[i + w]! - H[i - w]!;
      const lit = 0.55 + 0.75 * Math.max(0, Math.min(1.25, 0.6 - (dx + dy) * 3.2));
      o[i * 4] = Math.min(255, R[i]! * lit);
      o[i * 4 + 1] = Math.min(255, G[i]! * lit);
      o[i * 4 + 2] = Math.min(255, B[i]! * lit);
      o[i * 4 + 3] = 255 * L[i]!;
    }
  g.putImageData(img, 0, 0);
  const relief = { canvas, x0, y0, res, w, h };
  RELIEFS.set(map, relief);
  return relief;
}

export interface Feature {
  x: number;
  y: number;
  t: string;
  size: number;
  seed: number;
}

const FEATURE_SIZE: Record<string, [number, number]> = {
  karst: [1600, 2800],
  hills: [2400, 4200],
  forest: [1800, 3200],
  plains: [1400, 2200],
  marsh: [1800, 2800],
  coast: [1400, 2200],
  mountains: [2600, 4400],
  jungle: [1800, 3200],
};

const FEATURES = new WeakMap<RegionMap, Feature[]>();

/** The painted marks: a fixed set placed once for the region, a few big shapes with room between. */
export function featuresOf(map: RegionMap): Feature[] {
  const cached = FEATURES.get(map);
  if (cached) return cached;
  const rng = mulberry32(hashSeed(`features:${map.id}`));
  const [bx0, by0, bx1, by1] = map.bbox;
  const out: Feature[] = [];
  for (let guard = 0; out.length < 260 && guard < 20000; guard++) {
    const p: Pt = [bx0 + rng() * (bx1 - bx0), by0 + rng() * (by1 - by0)];
    if (!inRegion(map, p)) continue;
    const t = terrainAt(map, p);
    const [lo, hi] = FEATURE_SIZE[t] ?? FEATURE_SIZE.karst!;
    const size = lo + rng() * (hi - lo);
    if (out.some((f) => Math.hypot(f.x - p[0], f.y - p[1]) < (f.size + size) * 0.62)) continue;
    if (
      map.places.some((q) => q.kind !== 'site' && Math.hypot(q.x - p[0], q.y - p[1]) < size * 0.45)
    )
      continue;
    out.push({ x: p[0], y: p[1], t, size, seed: Math.floor(rng() * 1e9) });
  }
  out.sort((a, b) => a.y - b.y);
  FEATURES.set(map, out);
  return out;
}

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};

function wash(
  ctx: CanvasRenderingContext2D,
  ink: string,
  top: number,
  bottom: number,
  a: number,
): CanvasGradient {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, rgba(ink, a));
  g.addColorStop(0.55, rgba(ink, a * 0.45));
  g.addColorStop(1, rgba(ink, 0));
  return g;
}

/** Paints one mark at a screen spot, `s` pixels across. */
export function paintFeature(
  ctx: CanvasRenderingContext2D,
  f: Feature,
  x: number,
  y: number,
  s: number,
  fade: number,
): void {
  const r = mulberry32(f.seed);
  const ink = TERRAIN_INK[f.t] ?? TERRAIN_INK.karst!;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (f.t === 'karst' || f.t === 'mountains') {
    const n = 3 + Math.floor(r() * 4);
    const cols: { ox: number; w: number; h: number; back: boolean }[] = [];
    for (let i = 0; i < n; i++)
      cols.push({
        ox: (r() - 0.5) * s * 0.9,
        w: s * (0.09 + r() * 0.08),
        h: s * (0.35 + r() * 0.55),
        back: r() < 0.4,
      });
    cols.sort((a, b) => Number(b.back) - Number(a.back));
    for (const c of cols) {
      const bx = x + c.ox;
      const top = y - c.h;
      const a = c.back ? 0.22 : 0.4;
      ctx.beginPath();
      ctx.moveTo(bx - c.w / 2, y);
      ctx.bezierCurveTo(bx - c.w * 0.62, y - c.h * 0.55, bx - c.w * 0.5, top, bx, top);
      ctx.bezierCurveTo(bx + c.w * 0.5, top, bx + c.w * 0.62, y - c.h * 0.55, bx + c.w / 2, y);
      ctx.closePath();
      ctx.fillStyle = wash(ctx, ink, top, y, a);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(bx - c.w * 0.42, y - c.h * 0.35);
      ctx.bezierCurveTo(bx - c.w * 0.55, y - c.h * 0.7, bx - c.w * 0.35, top + 1, bx, top);
      ctx.strokeStyle = rgba(ink, a * 1.3);
      ctx.lineWidth = Math.max(0.8, s * 0.008);
      ctx.stroke();
    }
  } else if (f.t === 'hills') {
    const n = 2 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const ox = x + (i - (n - 1) / 2) * s * 0.36 + (r() - 0.5) * s * 0.1;
      const w = s * (0.45 + r() * 0.25);
      const h = s * (0.16 + r() * 0.12);
      const top = y - h;
      ctx.beginPath();
      ctx.moveTo(ox - w / 2, y);
      ctx.quadraticCurveTo(ox - w * 0.1, top - h * 0.5, ox + w / 2, y);
      ctx.closePath();
      ctx.fillStyle = wash(ctx, ink, top, y, 0.32);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(ox - w / 2, y);
      ctx.quadraticCurveTo(ox - w * 0.1, top - h * 0.5, ox + w / 2, y);
      ctx.strokeStyle = rgba(ink, 0.42);
      ctx.lineWidth = Math.max(0.8, s * 0.007);
      ctx.stroke();
    }
  } else if (f.t === 'forest' || f.t === 'jungle') {
    const n = 7 + Math.floor(r() * 7);
    const crowns: [number, number, number][] = [];
    for (let i = 0; i < n; i++)
      crowns.push([x + (r() - 0.5) * s * 0.8, y - r() * s * 0.25, s * (0.07 + r() * 0.06)]);
    crowns.sort((a, b) => a[1] - b[1]);
    ctx.beginPath();
    for (const [cx, cy, cr] of crowns) {
      ctx.moveTo(cx + cr, cy);
      ctx.arc(cx, cy, cr, 0, 7);
    }
    ctx.fillStyle = wash(ctx, ink, y - s * 0.4, y + s * 0.1, 0.38);
    ctx.fill();
    for (const [cx, cy, cr] of crowns) {
      ctx.beginPath();
      ctx.arc(cx, cy, cr, Math.PI * 1.05, Math.PI * 1.75);
      ctx.strokeStyle = rgba(ink, 0.5);
      ctx.lineWidth = Math.max(0.7, s * 0.006);
      ctx.stroke();
    }
  } else if (f.t === 'plains') {
    for (let i = 0; i < 5; i++) {
      const ox = x + (r() - 0.5) * s;
      const oy = y + (r() - 0.5) * s * 0.3;
      const l = s * (0.15 + r() * 0.2);
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.quadraticCurveTo(ox + l * 0.2, oy - l * 0.5, ox + l * 0.55, oy - l * 0.6);
      ctx.strokeStyle = rgba(ink, 0.3);
      ctx.lineWidth = Math.max(0.7, s * 0.008);
      ctx.stroke();
    }
  } else if (f.t === 'marsh') {
    for (let i = 0; i < 4; i++) {
      const oy = y + (i - 1.5) * s * 0.07;
      const ox = x + (r() - 0.5) * s * 0.3;
      const l = s * (0.25 + r() * 0.3);
      ctx.beginPath();
      ctx.moveTo(ox - l / 2, oy);
      ctx.lineTo(ox + l / 2, oy);
      ctx.strokeStyle = rgba(ink, 0.3);
      ctx.lineWidth = Math.max(0.7, s * 0.006);
      ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const ox = x + (r() - 0.5) * s * 0.6;
      const oy = y - s * 0.02;
      for (let j = -2; j <= 2; j++) {
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.quadraticCurveTo(ox + j * s * 0.01, oy - s * 0.08, ox + j * s * 0.03, oy - s * 0.12);
        ctx.strokeStyle = rgba(ink, 0.4);
        ctx.stroke();
      }
    }
  } else {
    for (let i = 0; i < 3; i++) {
      const oy = y + i * s * 0.08;
      const ox = x + (r() - 0.5) * s * 0.2;
      const l = s * 0.5;
      ctx.beginPath();
      ctx.moveTo(ox - l / 2, oy);
      for (let j = 0; j < 4; j++)
        ctx.quadraticCurveTo(
          ox - l / 2 + (l * (j + 0.5)) / 4,
          oy - s * 0.04,
          ox - l / 2 + (l * (j + 1)) / 4,
          oy,
        );
      ctx.strokeStyle = rgba(ink, 0.3);
      ctx.lineWidth = Math.max(0.7, s * 0.006);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** A tile of thick cloud for the fog over the unknown, wrapping at its edges. */
export function cloudTile(big: boolean): HTMLCanvasElement {
  const size = big ? 640 : 512;
  const t = document.createElement('canvas');
  t.width = t.height = size;
  const g = t.getContext('2d')!;
  const rng = mulberry32(big ? 31 : 57);
  const puff = (x: number, y: number, r: number, a: number, lit: boolean) => {
    for (const [dx, dy] of [
      [0, 0],
      [size, 0],
      [-size, 0],
      [0, size],
      [0, -size],
    ] as const) {
      const gr = g.createRadialGradient(x + dx, y + dy - (lit ? r * 0.3 : 0), 0, x + dx, y + dy, r);
      gr.addColorStop(0, `rgba(${lit ? '215,226,234' : '190,205,215'},${a})`);
      if (lit) gr.addColorStop(0.7, `rgba(190,205,215,${a * 0.6})`);
      gr.addColorStop(1, 'rgba(190,205,215,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x + dx, y + dy, r, 0, 7);
      g.fill();
    }
  };
  if (big) {
    for (let i = 0; i < 70; i++) {
      const cl = Math.floor(i / 7);
      const cx = mulberry32(cl * 17 + 3)() * size;
      const cy = mulberry32(cl * 29 + 5)() * size;
      puff(
        cx + (rng() - 0.5) * 150,
        cy + (rng() - 0.5) * 70,
        22 + rng() * 48,
        0.07 + rng() * 0.07,
        false,
      );
    }
  } else {
    for (let c = 0; c < 45; c++) {
      const cx = rng() * size;
      const cy = rng() * size;
      const n = 3 + Math.floor(rng() * 3);
      const a = 0.26 + rng() * 0.14;
      for (let i = 0; i < n; i++)
        puff(
          cx + (i - n / 2) * (7 + rng() * 4),
          cy + (rng() - 0.5) * 6 - (i === Math.floor(n / 2) ? 4 : 0),
          6 + rng() * 7,
          a,
          true,
        );
    }
  }
  return t;
}
