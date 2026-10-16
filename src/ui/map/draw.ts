// Draws the travel map (design § The world, The travel map) into a canvas: the sea and the land,
// the relief and its painted marks, the dashed depth lines, the roads, the fog as drifting cloud
// (thick over the unknown, a few small soft clouds over what you know), the trail you walked, the sites
// as seals, rumors in their rings, the labels placed by priority, your course, your pins and you.
import { RUMOR_RING_LI } from '../../content/map/travel.ts';
import { fieldFrom, heartBand, peopleLi, pullsIn, warped } from '../../core/map/depth.ts';
import { known, sightAt } from '../../core/map/fog.ts';
import { type Multi, type Pt, ringCentroid } from '../../core/map/geometry.ts';
import { band } from '../../core/map/depth.ts';
import type { MapArea, MapPlace, RegionMap } from '../../core/map/region.ts';
import type { MapLife } from '../../core/map/schema.ts';
import { cloudTile, featuresOf, paintFeature, reliefOf, smallCloudTile } from './land.ts';

export interface View {
  x: number;
  y: number;
  /** Pixels a li. */
  k: number;
}

export interface Frame {
  ctx: CanvasRenderingContext2D;
  /** The fog's own canvases, the size of the map's. */
  fog: CanvasRenderingContext2D;
  mask: CanvasRenderingContext2D;
  W: number;
  H: number;
  dpr: number;
  view: View;
}

export interface Scene {
  map: RegionMap;
  life: MapLife;
  yourBand: number;
  hover: string | null;
  /** Hide the fog (for looking at the land). */
  noFog?: boolean;
}

const C = {
  text: '#e9e5da',
  accent: '#d6ab4c',
  crack: '#7fc7d9',
  warn: '#e08a6a',
  road: '#c2ae8c',
  depth: '208,122,150',
};
const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};

export const toScreen = (v: View, W: number, H: number, p: Pt): [number, number] => [
  (p[0] - v.x) * v.k + W / 2,
  (p[1] - v.y) * v.k + H / 2,
];
export const toWorld = (v: View, W: number, H: number, x: number, y: number): [number, number] => [
  (x - W / 2) / v.k + v.x,
  (y - H / 2) / v.k + v.y,
];

// ---------------------------------------------------------------- caches

const TILES: { big?: HTMLCanvasElement; small?: HTMLCanvasElement } = {};
const PATTERNS = new WeakMap<
  CanvasRenderingContext2D,
  { big: CanvasPattern; small: CanvasPattern }
>();

function patternsFor(ctx: CanvasRenderingContext2D) {
  let p = PATTERNS.get(ctx);
  if (!p) {
    TILES.big ??= cloudTile();
    TILES.small ??= smallCloudTile();
    p = {
      big: ctx.createPattern(TILES.big, 'repeat')!,
      small: ctx.createPattern(TILES.small, 'repeat')!,
    };
    PATTERNS.set(ctx, p);
  }
  return p;
}

const CONTOURS = new WeakMap<RegionMap, { level: number; segs: [Pt, Pt][] }[]>();

/** The dashed depth lines, one for each ring, by marching squares over the depth field. */
export function depthLines(map: RegionMap): { level: number; segs: [Pt, Pt][] }[] {
  const cached = CONTOURS.get(map);
  if (cached) return cached;
  const RES = 400;
  const [bx0, by0, bx1, by1] = map.bbox;
  const w = Math.ceil((bx1 - bx0) / RES) + 1;
  const h = Math.ceil((by1 - by0) / RES) + 1;
  const D = new Float32Array(w * h);
  let top = 1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p: Pt = [bx0 + x * RES, by0 + y * RES];
      let v = NaN;
      if (map.outline.some((poly) => inside(p, poly)))
        v = fieldFrom(map, peopleLi(map, p), warped(p)).f;
      D[y * w + x] = v;
      if (v > top) top = v;
    }
  const out: { level: number; segs: [Pt, Pt][] }[] = [];
  for (let level = 1; level <= Math.floor(top); level++) {
    const segs: [Pt, Pt][] = [];
    for (let y = 0; y < h - 1; y++)
      for (let x = 0; x < w - 1; x++) {
        const a = D[y * w + x]!;
        const b = D[y * w + x + 1]!;
        const c = D[(y + 1) * w + x + 1]!;
        const d = D[(y + 1) * w + x]!;
        if (Number.isNaN(a) || Number.isNaN(b) || Number.isNaN(c) || Number.isNaN(d)) continue;
        const P = (x1: number, y1: number, v1: number, x2: number, y2: number, v2: number): Pt => {
          const t = (level - v1) / (v2 - v1);
          return [bx0 + (x1 + (x2 - x1) * t) * RES, by0 + (y1 + (y2 - y1) * t) * RES];
        };
        const e: Pt[] = [];
        if (a < level !== b < level) e.push(P(x, y, a, x + 1, y, b));
        if (b < level !== c < level) e.push(P(x + 1, y, b, x + 1, y + 1, c));
        if (c < level !== d < level) e.push(P(x + 1, y + 1, c, x, y + 1, d));
        if (d < level !== a < level) e.push(P(x, y + 1, d, x, y, a));
        if (e.length >= 2) segs.push([e[0]!, e[1]!]);
        if (e.length === 4) segs.push([e[2]!, e[3]!]);
      }
    out.push({ level, segs });
  }
  CONTOURS.set(map, out);
  return out;
}

function inside(p: Pt, poly: readonly (readonly Pt[])[]): boolean {
  const ring = poly[0]!;
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// ---------------------------------------------------------------- drawing

function pathMulti(ctx: CanvasRenderingContext2D, f: Frame, m: Multi) {
  ctx.beginPath();
  for (const poly of m)
    for (const ring of poly) {
      ring.forEach((p, i) => {
        const [x, y] = toScreen(f.view, f.W, f.H, p);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.closePath();
    }
}

function pathLine(ctx: CanvasRenderingContext2D, f: Frame, pts: readonly Pt[]) {
  ctx.beginPath();
  pts.forEach((p, i) => {
    const [x, y] = toScreen(f.view, f.W, f.H, p);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  });
}

interface Label {
  pri: number;
  x: number;
  y: number;
  w: number;
  h: number;
  draw: () => void;
}

/** Whether a place's mark is a minor one, a dot until you zoom in. */
const minor = (p: MapPlace) => p.kind === 'site' && p.sub !== 'checkpoint' && p.sub !== 'ferry';

export function drawMap(f: Frame, s: Scene): void {
  const { ctx, W, H, dpr, view } = f;
  const { map, life } = s;
  const k = view.k;
  const at = (p: Pt) => toScreen(view, W, H, p);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // The sea, and the land round the region.
  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, W, H);
  pathMulti(ctx, f, map.land);
  ctx.fillStyle = '#14181d';
  ctx.fill('evenodd');

  // The region: relief, marks, depth lines and rivers of the roads, all clipped to its outline.
  ctx.save();
  pathMulti(ctx, f, map.outline);
  ctx.clip('evenodd');
  const relief = reliefOf(map);
  const [rx, ry] = at([relief.x0, relief.y0]);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(relief.canvas, rx, ry, relief.w * relief.res * k, relief.h * relief.res * k);
  const [wx0, wy0] = toWorld(view, W, H, -200, -200);
  const [wx1, wy1] = toWorld(view, W, H, W + 200, H + 200);
  for (const feat of featuresOf(map)) {
    if (feat.x < wx0 || feat.x > wx1 || feat.y < wy0 || feat.y > wy1) continue;
    const size = feat.size * k;
    if (size < 5) continue;
    const [x, y] = at([feat.x, feat.y]);
    paintFeature(ctx, feat, x, y, Math.min(size, 220), Math.min(1, (size - 5) / 10));
  }
  ctx.lineCap = 'round';
  for (const { level, segs } of depthLines(map)) {
    const i = Math.min(6, level - 1);
    ctx.beginPath();
    for (const [p, q] of segs) {
      const [x1, y1] = at(p);
      const [x2, y2] = at(q);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.strokeStyle = `rgba(${C.depth},${0.22 + i * 0.08})`;
    ctx.lineWidth = 0.8 + i * 0.2;
    ctx.setLineDash([3, 3 + Math.min(i, 3)]);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  // The coast, with a soft wash of surf.
  pathMulti(ctx, f, map.land);
  ctx.lineJoin = 'round';
  for (const [w, a] of [
    [Math.max(6, 900 * k), 0.035],
    [Math.max(3, 400 * k), 0.06],
  ] as const) {
    ctx.strokeStyle = `rgba(127,199,217,${a})`;
    ctx.lineWidth = w;
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(127,199,217,0.3)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // ---- the fog: a mask of what you know cuts thick cloud; small clouds lie over the known.
  if (!s.noFog) drawFog(f, s);

  // ---- over the fog
  const labels: Label[] = [];
  const queue = (pri: number, x: number, y: number, w: number, h: number, draw: () => void) =>
    labels.push({ pri, x, y, w, h, draw });

  // Borders of what you know, the deadly in red.
  for (const a of map.areas) {
    const st = known(life, a.id);
    if (a.kind === 'tract' || st === 'unknown' || st === 'rumored') continue;
    pathMulti(ctx, f, a.outline);
    ctx.save();
    if (st === 'sketched') ctx.setLineDash([5, 5]);
    const deadly = isDeadly(map, a, s.yourBand);
    ctx.strokeStyle = deadly
      ? rgba(C.warn, 0.75)
      : st === 'seen'
        ? 'rgba(233,229,218,0.42)'
        : 'rgba(233,229,218,0.32)';
    ctx.lineWidth = deadly ? 1.6 : 1.2;
    ctx.stroke();
    ctx.restore();
  }
  if (known(life, map.id) !== 'unknown') {
    ctx.save();
    pathMulti(ctx, f, map.outline);
    ctx.setLineDash([2, 5]);
    ctx.strokeStyle = 'rgba(214,171,76,0.32)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  // Roads.
  for (const r of map.roads) {
    const st = known(life, r.id);
    if (st === 'unknown') continue;
    pathLine(ctx, f, r.pts);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3.2;
    ctx.stroke();
    ctx.setLineDash(st === 'sketched' ? [3, 4] : []);
    ctx.strokeStyle = rgba(C.road, st === 'seen' ? 0.72 : 0.45);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }

  // Area labels: a kingdom's name above it when small, a tract's at its heart of ground.
  for (const a of map.areas) {
    const st = known(life, a.id);
    if (st === 'unknown' || st === 'rumored') continue;
    if (a.kind === 'tract' && st !== 'seen') continue;
    const big = a.kind !== 'tract';
    const c =
      a.kind === 'tract'
        ? (map.tracts.find((t) => t.id === a.id)?.seed ?? ringCentroid(a.outline[0]![0]!))
        : ringCentroid(a.outline[0]![0]!);
    const [cx, cy0] = at(c);
    let cy = cy0;
    const size = big ? Math.max(13, Math.min(22, 9000 * k)) : Math.max(11, Math.min(17, 6000 * k));
    if (big) {
      const ys = a.outline[0]![0]!.map((p) => at(p)[1]);
      const topY = Math.min(...ys);
      if (Math.max(...ys) - topY < 220) cy = topY - (isDeadly(map, a, s.yourBand) ? 34 : 22);
    }
    ctx.font = `${big ? '600' : 'italic 500'} ${size}px 'Cormorant Garamond', Georgia, serif`;
    const w = ctx.measureText(a.name).width;
    const alpha = st === 'seen' ? 1 : 0.6;
    queue(big ? 85 : 20, cx - w / 2, cy - size, w, size * 2.1, () => {
      ctx.textAlign = 'center';
      ctx.font = `${big ? '600' : 'italic 500'} ${size}px 'Cormorant Garamond', Georgia, serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(4,5,7,0.8)';
      ctx.strokeText(a.name, cx, cy);
      ctx.fillStyle = `rgba(233,229,218,${alpha * (big ? 0.95 : 0.75)})`;
      ctx.fillText(a.name, cx, cy);
      ctx.font = `${Math.round(size * 0.78)}px 'Ma Shan Zheng', KaiTi, serif`;
      ctx.fillStyle = rgba(C.accent, alpha * (big ? 0.85 : 0.55));
      ctx.fillText(a.hanzi, cx, cy + size * 0.98);
    });
    if (isDeadly(map, a, s.yourBand))
      warnTag(ctx, cx, cy + size * 1.9, `险 deadly · ${a.top ? realmWords(a.top) : ''}`);
  }

  // Rumors: a dashed ring and a diamond, no outline.
  for (const q of [...map.places, ...map.areas]) {
    if (known(life, q.id) !== 'rumored') continue;
    const ringAt =
      life.rings[q.id] ?? ('x' in q ? ([q.x, q.y] as Pt) : ringCentroid(q.outline[0]![0]!));
    const [x, y] = at(ringAt);
    const r = Math.max(9, (RUMOR_RING_LI / 2) * k);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 7);
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = rgba(C.accent, 0.45);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    diamond(ctx, x, y, 8, rgba(C.accent, 0.95));
    ctx.font = 'italic 12px Inter, sans-serif';
    const w = ctx.measureText(q.name).width;
    queue(q.famous ? 55 : 40, x - w / 2, y + r + 3, w, 14, () => {
      ctx.font = 'italic 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(233,229,218,0.68)';
      ctx.fillText(q.name, x, y + r + 14);
    });
    if (!('x' in q) && isDeadly(map, q, s.yourBand))
      warnTag(ctx, x, y + r + 30, `险 deadly · ${q.top ? realmWords(q.top) : ''}`);
  }

  // Sites as seals; the small ones dots until you come close.
  const showNames = k > 0.03;
  for (const q of map.places) {
    const st = known(life, q.id);
    if (st !== 'seen' && st !== 'sketched') continue;
    const [x, y] = at([q.x, q.y]);
    if (x < -40 || y < -40 || x > W + 40 || y > H + 40) continue;
    const dim = st === 'seen' ? 1 : 0.55;
    const major = q.kind === 'atlas';
    if (minor(q) && k < 0.016) {
      const t = Math.max(0, (k - 0.009) / 0.007);
      ctx.beginPath();
      ctx.arc(x, y, 1.6 + t, 0, 7);
      ctx.fillStyle = rgba(q.sub === 'heart' ? '#e6b3c3' : C.text, (0.45 + t * 0.3) * dim);
      ctx.fill();
      continue;
    }
    seal(ctx, q, x, y, dim);
    if (major || q.sub === 'town' || showNames || s.hover === q.id) {
      const font = `${major ? '500 12.5px' : '11.5px'} Inter, sans-serif`;
      ctx.font = font;
      const w = ctx.measureText(q.name).width;
      const pri =
        s.hover === q.id ? 100 : major ? 80 : q.sub === 'town' ? 70 : q.sub === 'village' ? 45 : 30;
      queue(pri, x + 11, y - 7, w, 14, () => {
        ctx.font = font;
        ctx.textAlign = 'left';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(4,5,7,0.75)';
        ctx.strokeText(q.name, x + 11, y + 4);
        ctx.fillStyle = st === 'seen' ? 'rgba(233,229,218,0.88)' : 'rgba(233,229,218,0.55)';
        ctx.fillText(q.name, x + 11, y + 4);
      });
    }
  }

  // Pins.
  life.pins.forEach((p, i) => {
    const [x, y] = at(p);
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 4, y - 8);
    ctx.arc(x, y - 10, 4.2, Math.PI * 0.8, Math.PI * 2.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#040507';
    ctx.beginPath();
    ctx.arc(x, y - 10, 1.6, 0, 7);
    ctx.fill();
    const t = `Pin ${i + 1}`;
    ctx.font = '11.5px Inter, sans-serif';
    const w = ctx.measureText(t).width;
    queue(75, x + 7, y - 18, w, 13, () => {
      ctx.font = '11.5px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = rgba(C.accent, 0.9);
      ctx.fillText(t, x + 7, y - 8);
    });
  });

  // Labels by priority, none over another unless it must show.
  labels.sort((a, b) => b.pri - a.pri);
  const taken: [number, number, number, number][] = [];
  for (const l of labels) {
    const box: [number, number, number, number] = [l.x - 2, l.y - 2, l.x + l.w + 2, l.y + l.h + 2];
    if (
      l.pri < 90 &&
      taken.some((t) => box[0] < t[2] && box[2] > t[0] && box[1] < t[3] && box[3] > t[1])
    )
      continue;
    taken.push(box);
    l.draw();
  }

  // Your course and you.
  const course = life.course;
  if (course) {
    pathLine(ctx, f, [life.at, ...course.pts.slice(course.at)]);
    ctx.save();
    ctx.setLineDash([2, 6]);
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(C.accent, 0.95);
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.restore();
    const [x, y] = at(course.to);
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, 7);
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, 7);
    ctx.fillStyle = C.accent;
    ctx.fill();
  }
  {
    const [x, y] = at(life.at);
    const r = sightAt(map, life.at) * k;
    if (r > 6) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 7);
      ctx.setLineDash([1, 5]);
      ctx.strokeStyle = rgba(C.crack, 0.5);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.beginPath();
    ctx.arc(x, y, 5.5, 0, 7);
    ctx.fillStyle = C.accent;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 7);
    ctx.strokeStyle = rgba(C.accent, 0.6);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

function drawFog(f: Frame, s: Scene) {
  const { fog, mask, W, H, dpr, view } = f;
  const { map, life } = s;
  const k = view.k;
  const at = (p: Pt) => toScreen(view, W, H, p);
  // The mask: what you know, as how much fog it lifts.
  mask.setTransform(dpr, 0, 0, dpr, 0, 0);
  mask.globalCompositeOperation = 'source-over';
  mask.clearRect(0, 0, W, H);
  const hole = (m: Multi, a: number) => {
    pathMulti(mask, f, m);
    mask.fillStyle = `rgba(0,0,0,${a})`;
    mask.fill('evenodd');
    mask.lineJoin = 'round';
    for (const [w, al] of [
      [16, 0.25 * a],
      [8, 0.35 * a],
    ] as const) {
      mask.lineWidth = w;
      mask.strokeStyle = `rgba(0,0,0,${al})`;
      mask.stroke();
    }
  };
  if (known(life, map.id) !== 'unknown') hole(map.outline, 0.3);
  for (const a of map.areas) {
    const st = known(life, a.id);
    if (st === 'unknown' || st === 'rumored') continue;
    if (a.kind === 'tract') {
      mask.save();
      pathMulti(mask, f, map.outline);
      mask.clip('evenodd');
      hole(a.outline, st === 'seen' ? 1 : 0.6);
      mask.restore();
    } else hole(a.outline, st === 'seen' ? 1 : 0.85);
  }
  if (life.trail.length > 1) {
    mask.lineCap = 'round';
    mask.lineJoin = 'round';
    pathLine(mask, f, life.trail);
    const r = Math.max(3, 600 * k);
    for (const [w, a] of [
      [r * 2.4, 0.3],
      [r * 2.1, 0.5],
      [r * 1.8, 1],
    ] as const) {
      mask.lineWidth = w;
      mask.strokeStyle = `rgba(0,0,0,${a})`;
      mask.stroke();
    }
  }
  for (const q of map.places)
    if (known(life, q.id) === 'seen') {
      const [x, y] = at([q.x, q.y]);
      mask.beginPath();
      mask.arc(x, y, Math.max(9, 400 * k), 0, 7);
      mask.fillStyle = 'rgba(0,0,0,0.9)';
      mask.fill();
    }
  {
    const [x, y] = at(life.at);
    const r = Math.max(5, sightAt(map, life.at) * k);
    const g = mask.createRadialGradient(x, y, r * 0.5, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    mask.fillStyle = g;
    mask.beginPath();
    mask.arc(x, y, r, 0, 7);
    mask.fill();
  }
  // The thick cloud over the unknown, pinned to the world. Each layer of a tile is laid at its
  // own size and slant, so zoomed out their sum never lines up into a visible grid.
  const pats = patternsFor(fog);
  const pinned = (pat: CanvasPattern, liPerPx: number, deg: number) =>
    pat.setTransform(
      new DOMMatrix()
        .translate(W / 2 - view.x * k, H / 2 - view.y * k)
        .rotate(deg)
        .scale(liPerPx * k),
    );
  fog.setTransform(dpr, 0, 0, dpr, 0, 0);
  fog.globalCompositeOperation = 'source-over';
  fog.clearRect(0, 0, W, H);
  fog.fillStyle = 'rgba(4,6,9,0.84)';
  fog.fillRect(0, 0, W, H);
  for (const [scale, deg] of [
    [1, 0],
    [0.62, 37],
    [1.6, -61],
  ] as const) {
    pinned(pats.big, 100 * scale, deg);
    fog.fillStyle = pats.big;
    fog.fillRect(0, 0, W, H);
  }
  fog.setTransform(1, 0, 0, 1, 0, 0);
  fog.globalCompositeOperation = 'destination-out';
  fog.drawImage(mask.canvas, 0, 0);
  // Over what you know, small soft clouds far below you, slipped under the fog so they show
  // only where it has lifted; two slanted layers, for the same reason.
  fog.setTransform(dpr, 0, 0, dpr, 0, 0);
  fog.globalCompositeOperation = 'destination-over';
  for (const [li, deg] of [
    [45, 0],
    [62, 53],
  ] as const) {
    pinned(pats.small, li, deg);
    fog.fillStyle = pats.small;
    fog.fillRect(0, 0, W, H);
  }
  fog.globalCompositeOperation = 'source-over';
  f.ctx.setTransform(1, 0, 0, 1, 0, 0);
  f.ctx.drawImage(fog.canvas, 0, 0);
  f.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** A land whose own heart stands a whole realm above you. */
export function isDeadly(map: RegionMap, a: MapArea | MapPlace, yourBand: number): boolean {
  if (!('outline' in a) || a.kind !== 'forbidden') return false;
  const h = map.hearts.find((x) => x.area === a.id);
  return !!h && pullsIn(heartBand(map, h), yourBand);
}

const REALM_WORDS: Record<string, string> = {
  'qi-condensation': 'Qi Condensation',
  'foundation-establishment': 'Foundation',
  'core-formation': 'Core Formation',
  'nascent-soul': 'Nascent Soul',
  'deity-transformation': 'Deity Transformation',
};
export const realmWords = (id: string) => REALM_WORDS[id] ?? band(0)!.name;

function warnTag(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  ctx.font = '600 11px Inter, sans-serif';
  ctx.textAlign = 'center';
  const w = ctx.measureText(text).width + 12;
  ctx.fillStyle = 'rgba(20,8,6,0.85)';
  ctx.fillRect(x - w / 2, y - 11, w, 16);
  ctx.strokeStyle = rgba(C.warn, 0.6);
  ctx.lineWidth = 1;
  ctx.strokeRect(x - w / 2, y - 11, w, 16);
  ctx.fillStyle = C.warn;
  ctx.fillText(text, x, y + 1);
}

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(-s / 2, -s / 2, s, s);
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function seal(ctx: CanvasRenderingContext2D, q: MapPlace, x: number, y: number, dim: number) {
  const major = q.kind === 'atlas';
  const ink = q.sub === 'checkpoint' ? C.road : q.sub === 'heart' ? '#e6b3c3' : C.text;
  const s = major ? 19 : q.sub === 'town' ? 16 : q.sub === 'checkpoint' ? 12 : 14;
  ctx.fillStyle = 'rgba(8,9,12,0.92)';
  ctx.strokeStyle = rgba(major ? C.accent : ink, 0.75 * dim);
  ctx.lineWidth = 1.1;
  roundRect(ctx, x - s / 2, y - s / 2, s, s, 3);
  ctx.fill();
  ctx.stroke();
  if (q.gated) {
    ctx.strokeStyle = rgba(C.accent, 0.6 * dim);
    roundRect(ctx, x - s / 2 - 3, y - s / 2 - 3, s + 6, s + 6, 5);
    ctx.stroke();
  }
  ctx.font = `${Math.round(s * 0.74)}px 'Ma Shan Zheng', KaiTi, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = rgba(major ? C.accent : ink, 0.95 * dim);
  ctx.fillText(q.seal, x, y + 1);
  ctx.textBaseline = 'alphabetic';
}

/** The place under a screen spot, nearest first; areas when no mark is near. */
export function pickAt(f: Pick, s: Scene, sx: number, sy: number): MapPlace | MapArea | null {
  const { map, life } = s;
  let best: MapPlace | MapArea | null = null;
  let bd = 13;
  for (const q of [...map.places, ...map.areas]) {
    const st = known(life, q.id);
    if (st === 'unknown') continue;
    if ('outline' in q && st !== 'rumored') continue;
    const p: Pt =
      st === 'rumored'
        ? (life.rings[q.id] ?? ('x' in q ? [q.x, q.y] : ringCentroid(q.outline[0]![0]!)))
        : [(q as MapPlace).x, (q as MapPlace).y];
    const [x, y] = toScreen(f.view, f.W, f.H, p);
    const d = Math.hypot(x - sx, y - sy);
    if (d < bd) {
      bd = d;
      best = q;
    }
  }
  return best;
}

export interface Pick {
  view: View;
  W: number;
  H: number;
}
