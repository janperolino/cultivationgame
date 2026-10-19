// Plane geometry for the travel map, in li: points in polygons, distances to lines and outlines,
// Voronoi cells by half-planes, and the value noise the depth field and the land read. Pure.

export type Pt = readonly [number, number];
export type Ring = readonly Pt[];
/** Polygons, each an outer ring and its holes, as the atlas's outlines are. */
export type Multi = readonly (readonly Ring[])[];

/** Each ring's bounding box, [minX, minY, maxX, maxY], worked out once: rings never change. */
const BOXES = new WeakMap<Ring, readonly [number, number, number, number]>();

function boxOf(ring: Ring): readonly [number, number, number, number] {
  let b = BOXES.get(ring);
  if (!b) {
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const [x, y] of ring) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    b = [x0, y0, x1, y1];
    BOXES.set(ring, b);
  }
  return b;
}

/** The smooth ease from 0 at a to 1 at b. */
export function smoothstep(a: number, b: number, v: number): number {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function inRing(p: Pt, ring: Ring): boolean {
  // Outside its box a point is outside the ring; the travel hours ask this of every outline.
  const b = boxOf(ring);
  if (p[0] < b[0] || p[0] > b[2] || p[1] < b[1] || p[1] > b[3]) return false;
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** Inside an outline: in some polygon's outer ring and none of its holes. */
export function inMulti(p: Pt, m: Multi): boolean {
  for (const poly of m) {
    if (!inRing(p, poly[0]!)) continue;
    let inHole = false;
    for (let i = 1; i < poly.length && !inHole; i++) inHole = inRing(p, poly[i]!);
    if (!inHole) return true;
  }
  return false;
}

export function segDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = dx * dx + dy * dy;
  let t = l ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

export function lineDist(p: Pt, pts: readonly Pt[]): number {
  let d = Infinity;
  for (let i = 1; i < pts.length; i++) d = Math.min(d, segDist(p, pts[i - 1]!, pts[i]!));
  return d;
}

/** Distance to an outline: 0 inside it. */
export function multiDist(p: Pt, m: Multi): number {
  if (inMulti(p, m)) return 0;
  let d = Infinity;
  for (const poly of m)
    for (const ring of poly)
      for (let i = 0; i < ring.length; i++)
        d = Math.min(d, segDist(p, ring[i]!, ring[(i + 1) % ring.length]!));
  return d;
}

export function ringArea(ring: Ring): number {
  let s = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[(i + 1) % ring.length]!;
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s / 2);
}

export function ringCentroid(ring: Ring): Pt {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[(i + 1) % ring.length]!;
    const f = x1 * y2 - x2 * y1;
    a += f;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
  }
  if (Math.abs(a) < 1e-9) return ring[0] ?? [0, 0];
  return [cx / (3 * a), cy / (3 * a)];
}

export function bboxOf(rings: readonly Ring[]): [number, number, number, number] {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const r of rings)
    for (const [x, y] of r) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  return [x0, y0, x1, y1];
}

/** Points every `step` li along a line, ends included. */
export function densify(pts: readonly Pt[], step: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let j = 0; j < n; j++)
      out.push([a[0] + ((b[0] - a[0]) * j) / n, a[1] + ((b[1] - a[1]) * j) / n]);
  }
  if (pts.length) out.push(pts[pts.length - 1]!);
  return out;
}

export function lineLength(pts: readonly Pt[]): number {
  let li = 0;
  for (let i = 1; i < pts.length; i++)
    li += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
  return li;
}

/** Keeps the part of a ring on the side of the line through `a` facing `n` (Sutherland–Hodgman). */
function clipHalf(ring: Pt[], a: Pt, n: Pt): Pt[] {
  const side = (p: Pt) => (p[0] - a[0]) * n[0] + (p[1] - a[1]) * n[1];
  const out: Pt[] = [];
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i]!;
    const q = ring[(i + 1) % ring.length]!;
    const sp = side(p);
    const sq = side(q);
    if (sp >= 0) out.push(p);
    if (sp >= 0 !== sq >= 0) {
      const t = sp / (sp - sq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}

/** The Voronoi cell of `seeds[i]` inside a box: every point nearer it than any other seed. */
export function voronoiCell(
  seeds: readonly Pt[],
  i: number,
  box: readonly [number, number, number, number],
): Pt[] {
  let ring: Pt[] = [
    [box[0], box[1]],
    [box[2], box[1]],
    [box[2], box[3]],
    [box[0], box[3]],
  ];
  const s = seeds[i]!;
  for (let j = 0; j < seeds.length && ring.length; j++) {
    if (j === i) continue;
    const o = seeds[j]!;
    const mid: Pt = [(s[0] + o[0]) / 2, (s[1] + o[1]) / 2];
    ring = clipHalf(ring, mid, [s[0] - o[0], s[1] - o[1]]);
  }
  return ring;
}

/** Where two segments cross, or null. */
export function crossing(a: Pt, b: Pt, c: Pt, d: Pt): Pt | null {
  const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
  if (!den) return null;
  const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den;
  const u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1
    ? [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]
    : null;
}

// ---------------------------------------------------------------- noise

/** A hashed lattice value in [0, 1), the same everywhere for the same point and seed. */
function lattice(ix: number, iy: number, s: number): number {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(s, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function valueNoise(x: number, y: number, s: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = lattice(ix, iy, s);
  const b = lattice(ix + 1, iy, s);
  const c = lattice(ix, iy + 1, s);
  const d = lattice(ix + 1, iy + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Four octaves of value noise, in [0, 1). */
export function fbm(x: number, y: number, s: number): number {
  let t = 0;
  let a = 0.5;
  let f = 1;
  for (let o = 0; o < 4; o++) {
    t += a * valueNoise(x * f, y * f, s + o);
    f *= 2;
    a *= 0.5;
  }
  return t / 0.9375;
}
