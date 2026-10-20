// Draws the travel map (design § The world, The travel map) into a canvas: the painted land (A5.1,
// ui/map/art.ts; plain land for a region not painted yet), the dashed depth lines, the fog (ui/map/
// fog.ts), the regions and seas next door, the roads, the sites as seals, rumors in their rings, the
// labels placed by priority, your course, your pins and you.
import { regionData } from '../../content/map/index.ts';
import { RUMOR_RING_LI } from '../../content/map/travel.ts';
import { fieldFrom, heartBand, peopleLi, pullsIn, warped } from '../../core/map/depth.ts';
import { known, sightAt } from '../../core/map/fog.ts';
import { type Multi, type Pt, ringCentroid, smoothstep } from '../../core/map/geometry.ts';
import { parseHex, rgba } from '../colors.ts';
import { band } from '../../core/map/depth.ts';
import type { MapArea, MapPlace, RegionMap } from '../../core/map/region.ts';
import type { MapLife } from '../../core/map/schema.ts';
import { hashSeed } from '../../core/rng.ts';
import { artArrived, drawPainted, LAND_GAIN } from './art.ts';
import { drawFog, fogOf } from './fog.ts';

export interface View {
  x: number;
  y: number;
  /** Pixels a li. */
  k: number;
}

export interface Frame {
  ctx: CanvasRenderingContext2D;
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
  /** What lies on the ground today (core/map/ground.ts), each pile marked where it fell. */
  ground?: readonly { at: Pt }[];
}

const C = {
  text: '#e9e5da',
  accent: '#d6ab4c',
  crack: '#7fc7d9',
  warn: '#e08a6a',
  road: '#c2ae8c',
  depth: '208,122,150',
};

export const toScreen = (v: View, W: number, H: number, p: Pt): [number, number] => [
  (p[0] - v.x) * v.k + W / 2,
  (p[1] - v.y) * v.k + H / 2,
];
export const toWorld = (v: View, W: number, H: number, x: number, y: number): [number, number] => [
  (x - W / 2) / v.k + v.x,
  (y - H / 2) / v.k + v.y,
];

/** A color lifted by the land's gain (art.ts, LAND_GAIN), as the pictures are. */
const lift = (hex: string) => {
  const c = parseHex(hex)!;
  return `rgb(${c.map((v) => Math.min(255, Math.round(v * LAND_GAIN))).join(',')})`;
};

/**
 * The guide's terrain colors (tools/map-guide.ts), darkened: the plain land a region shows until
 * it is painted (Jan's call in A5.1), already lifted.
 */
const PLAIN: Record<string, string> = Object.fromEntries(
  Object.entries({
    mountains: '#30323a',
    karst: '#222a33',
    hills: '#3a3122',
    plains: '#3d3a29',
    forest: '#14251c',
    jungle: '#142a18',
    marsh: '#182d30',
    coast: '#45402f',
    blight: '#322937',
  }).map(([k, v]) => [k, lift(v)]),
);
/** The sea, the land round the region and the plain land's fallback, lifted. */
const SEA = lift('#05070a');
const AROUND = lift('#101317');
const PLAIN_ELSE = lift('#1a1d22');

// ---------------------------------------------------------------- the places' pieces

/**
 * The pieces that stand at places (A5.1, A5.3; design § The travel map, The look): cut from the
 * sheets Jan paints in ChatGPT (`map-places-*` in art/manifest.json, painted on transparent). A
 * place shows its own piece, else one of its kind's variants (`map-place-<kind>-<n>`), picked by
 * its seed so the land doesn't repeat, else its kind's, else only its seal. The fixed places are
 * painted into the land instead (tools/map-place.ts), and most kinds of site stay seals (Jan's call
 * in A5.3: only what reads as land from that height has a piece).
 */
const PIECE_URLS: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('../art/map/places/**/*.webp', {
      eager: true,
      query: '?url',
      import: 'default',
    }),
  ).map(([path, url]) => [path.replace(/^.*\/(.+)\.webp$/, '$1'), url]),
);
/** Each kind's variants, `map-place-<kind>-<n>`, in order. */
const VARIANTS = new Map<string, string[]>();
for (const id of Object.keys(PIECE_URLS).sort()) {
  const m = /^map-place-(.+)-\d+$/.exec(id);
  if (m) VARIANTS.set(m[1]!, [...(VARIANTS.get(m[1]!) ?? []), id]);
}
const PIECE_IMGS = new Map<string, HTMLImageElement>();
/** The zoom, in px a li, over which a piece fades in and its seal out. */
const PIECE_FADE = [0.035, 0.06] as const;
/** How far down the piece its place's spot lies: the mark is centred in its cell. */
const PIECE_FOOT = 0.5;

/** Each piece softened once: its edge feathered out and its colour drained a little, to sit in the land. */
const PIECE_SOFT = new Map<string, HTMLCanvasElement>();

/** The piece a place shows, its variant picked by the place's id and spot, which a site keeps in its world. */
function pieceOf(q: MapPlace): HTMLCanvasElement | null {
  const kinds = VARIANTS.get(q.sub);
  const variant = kinds?.[hashSeed(`${q.id}@${q.x},${q.y}`) % kinds.length];
  const id = [`map-place-${q.id}`, variant, `map-place-${q.sub}`].find((x) => x && PIECE_URLS[x]);
  if (!id) return null;
  const done = PIECE_SOFT.get(id);
  if (done) return done;
  let img = PIECE_IMGS.get(id);
  if (!img) {
    img = new Image();
    img.onload = () => artArrived();
    img.src = PIECE_URLS[id]!;
    PIECE_IMGS.set(id, img);
  }
  if (!img.complete || !img.naturalWidth) return null;
  // Jan's note in A5.1: the pieces stuck out like stickers. A piece has no ground of its own (A5.3);
  // its cell fades out in an ellipse from 70% of the way to its edge, so nothing ends in a line,
  // and its colour is drained a little toward the painting's.
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d')!;
  // Lifted with the land (art.ts, LAND_GAIN): colors only, so the feathered edge stays as it is.
  g.filter = `saturate(0.75) brightness(${LAND_GAIN})`;
  g.drawImage(img, 0, 0);
  g.filter = 'none';
  g.globalCompositeOperation = 'destination-in';
  const r = c.width / 2;
  g.translate(r, c.height / 2);
  g.scale(1, c.height / c.width);
  const fade = g.createRadialGradient(0, 0, r * 0.7, 0, 0, r);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = fade;
  g.fillRect(-r, -r, 2 * r, 2 * r);
  PIECE_SOFT.set(id, c);
  return c;
}

/**
 * A piece's width on the map, in li: a city's or a famous place's widest, a site's least. Larger
 * than life, as the painting draws its peaks (Jan's call in A5.3: readable, not the lore's size).
 */
function pieceLi(q: MapPlace): number {
  if (q.sub === 'city') return 2400;
  if (q.kind === 'atlas') return 2000;
  if (q.sub === 'town') return 1700;
  return 1000;
}

// ---------------------------------------------------------------- the painted places

/** A place painted into the land (tools/map-place.ts): its crop's frame in li. */
interface Painted {
  id: string;
  x0: number;
  y0: number;
  w: number;
  h: number;
}
const PAINTED = new Map<string, Painted & { region: string }>(
  Object.values(
    import.meta.glob<{ region: string; places: Painted[] }>('../../../art/map/*/places.json', {
      eager: true,
      import: 'default',
    }),
  ).flatMap((f) => f.places.map((p) => [p.id, { ...p, region: f.region }] as const)),
);
/** The glow's gold. */
const GLOW = '#e2b65a';
/** How strong the glow is close in, and on hover from afar. */
const GLOW_CLOSE = 0.45;
const GLOW_HOVER = 0.7;
const GLOWS = new Map<string, HTMLCanvasElement | HTMLImageElement>();

/**
 * A painted place's glow (A5.3, Jan's call over an outline): baked by the tool as a white picture
 * whose alpha is the glow, tinted gold here once it arrives. Null until then.
 */
function glowOf(p: Painted & { region: string }): HTMLCanvasElement | null {
  const held = GLOWS.get(p.id);
  if (held instanceof HTMLCanvasElement) return held;
  if (!held) {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const g = c.getContext('2d')!;
      g.drawImage(img, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = GLOW;
      g.fillRect(0, 0, c.width, c.height);
      GLOWS.set(p.id, c);
      artArrived();
    };
    img.src = `${import.meta.env.BASE_URL}map/${p.region}/places/${p.id}-glow.webp`;
    GLOWS.set(p.id, img);
  }
  return null;
}

// ---------------------------------------------------------------- caches

const PATHS = new WeakMap<object, Path2D>();
/** A shape as a path in world coordinates, made once. */
function worldPath(m: Multi): Path2D {
  let p = PATHS.get(m);
  if (!p) {
    const path = new Path2D();
    for (const poly of m)
      for (const r of poly) {
        r.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
        path.closePath();
      }
    PATHS.set(m, path);
    p = path;
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

/**
 * Draws the map. Returns true when the fog stood in from a moment ago (it is baked again at most
 * every second and a half while you travel), so the caller draws again shortly.
 */
export function drawMap(f: Frame, s: Scene): boolean {
  const { ctx, W, H, dpr, view } = f;
  const { map, life } = s;
  const k = view.k;
  const at = (p: Pt) => toScreen(view, W, H, p);
  const [vx0, vy0] = toWorld(view, W, H, 0, 0);
  const [vx1, vy1] = toWorld(view, W, H, W, H);
  const box = [vx0, vy0, vx1, vy1] as const;
  /** Drawing in li from here: the view's transform on the context. */
  const inWorld = () =>
    ctx.setTransform(
      k * dpr,
      0,
      0,
      k * dpr,
      (W / 2 - view.x * k) * dpr,
      (H / 2 - view.y * k) * dpr,
    );
  const onScreen = () => ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // The sea, the land round the region, and the region as plain land by its terrains; then the
  // painting over it where the region has one (A5.1). All of it lifted already: the colors here
  // and each picture as it arrived (art.ts), never the whole canvas a frame.
  onScreen();
  ctx.fillStyle = SEA;
  ctx.fillRect(0, 0, W, H);
  inWorld();
  ctx.fillStyle = AROUND;
  ctx.fill(worldPath(map.land), 'evenodd');
  ctx.save();
  ctx.clip(worldPath(map.outline), 'evenodd');
  ctx.fillStyle = PLAIN[map.terrain] ?? PLAIN_ELSE;
  ctx.fill(worldPath(map.outline), 'evenodd');
  for (const tracts of [true, false])
    for (const a of map.areas)
      if ((a.kind === 'tract') === tracts && PLAIN[a.terrain]) {
        ctx.fillStyle = PLAIN[a.terrain]!;
        ctx.fill(worldPath(a.outline), 'evenodd');
      }
  ctx.restore();
  if (!drawPainted(ctx, box)) {
    ctx.strokeStyle = 'rgba(191,255,255,0.3)'; // the coast line, lifted
    ctx.lineWidth = 1.2 / k;
    ctx.stroke(worldPath(map.land));
  }
  // The places' pieces (A5.1), part of the land: under the lift and the fog, so they take the
  // painting's light and the veil as it does, fading in as you come close.
  const pieceIn = smoothstep(PIECE_FADE[0], PIECE_FADE[1], k);
  if (pieceIn > 0) {
    onScreen();
    for (const q of map.places) {
      const st = known(life, q.id);
      if (st !== 'seen' && st !== 'sketched') continue;
      const img = pieceOf(q);
      if (!img) continue;
      const side = pieceLi(q) * k;
      const tall = (side * img.height) / img.width;
      const [x, y] = at([q.x, q.y]);
      if (x + side < 0 || x - side > W || y + tall < 0 || y - tall > H) continue;
      ctx.globalAlpha = pieceIn;
      ctx.drawImage(img, x - side / 2, y - tall * PIECE_FOOT, side, tall);
      ctx.globalAlpha = 1;
    }
  }

  // The dashed depth lines, under the fog: you see how deep a land runs only as far as you know it.
  ctx.save();
  inWorld();
  ctx.clip(worldPath(map.outline), 'evenodd');
  onScreen();
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

  // ---- the fog, from what you know (ui/map/fog.ts)
  let stale = false;
  if (!s.noFog) {
    const got = fogOf(map, life);
    stale = got.stale;
    inWorld();
    drawFog(ctx, got.fog, box);
    onScreen();
  }

  // The regions and seas next door, faint through the dark, a region's edge dotted (A5).
  for (const n of regionData(map.id)?.file.nextDoor ?? []) {
    if (n.outline) {
      inWorld();
      ctx.setLineDash([2 / k, 5 / k]);
      ctx.strokeStyle = 'rgba(214,171,76,0.22)';
      ctx.lineWidth = 1 / k;
      ctx.stroke(worldPath(n.outline as Multi));
      ctx.setLineDash([]);
      onScreen();
    }
    const [sx, sy] = at(n.at);
    if (sx < -200 || sy < -50 || sx > W + 200 || sy > H + 50) continue;
    const sea = n.kind === 'sea';
    ctx.save();
    ctx.globalAlpha = sea ? 0.55 : 0.5;
    ctx.textAlign = 'center';
    ctx.font = "italic 500 18px 'Cormorant Garamond', Georgia, serif";
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(4,5,7,0.8)';
    ctx.strokeText(n.name, sx, sy);
    ctx.fillStyle = sea ? 'rgba(150,200,215,0.85)' : 'rgba(233,229,218,0.8)';
    ctx.fillText(n.name, sx, sy);
    ctx.font = "15px 'Ma Shan Zheng', KaiTi, serif";
    ctx.fillStyle = sea ? 'rgba(127,199,217,0.75)' : 'rgba(214,171,76,0.8)';
    ctx.fillText(n.hanzi, sx, sy + 19);
    ctx.restore();
  }

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

  // Roads: a dark casing under a pale core, so they read on the lit painting (Jan's note in A5.1).
  for (const r of map.roads) {
    const st = known(life, r.id);
    if (st === 'unknown') continue;
    pathLine(ctx, f, r.pts);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(4,5,7,0.78)';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.setLineDash(st === 'sketched' ? [4, 4] : []);
    ctx.strokeStyle = st === 'seen' ? 'rgba(244,232,204,0.95)' : 'rgba(244,232,204,0.6)';
    ctx.lineWidth = 2;
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

  // The places painted into the land (A5.3), each in a soft gold glow where its seal gives way to
  // it, and on hover from afar (Jan's call): so the eye finds the place in the paint.
  inWorld();
  ctx.globalCompositeOperation = 'screen';
  for (const q of map.places) {
    const p = PAINTED.get(q.id);
    if (!p) continue;
    const st = known(life, q.id);
    if (st !== 'seen' && st !== 'sketched') continue;
    if (p.x0 > box[2] || p.y0 > box[3] || p.x0 + p.w < box[0] || p.y0 + p.h < box[1]) continue;
    const show = Math.max(pieceIn * GLOW_CLOSE, s.hover === q.id ? GLOW_HOVER : 0) * (st === 'seen' ? 1 : 0.55);
    const img = show > 0 ? glowOf(p) : null;
    if (!img) continue;
    ctx.globalAlpha = show;
    ctx.drawImage(img, p.x0, p.y0, p.w, p.h);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  onScreen();

  // Sites as seals; the small ones dots until you come close. A seal gives way to its place's piece,
  // or to the place painted in.
  const showNames = k > 0.03;
  for (const q of map.places) {
    const st = known(life, q.id);
    if (st !== 'seen' && st !== 'sketched') continue;
    const [x, y] = at([q.x, q.y]);
    if (x < -40 || y < -40 || x > W + 40 || y > H + 40) continue;
    const dim = st === 'seen' ? 1 : 0.55;
    // Close in, the seal goes, box and all, where a piece or the painted place stands for it.
    const fade = PAINTED.has(q.id) || pieceOf(q) ? 1 - pieceIn : 1;
    const major = q.kind === 'atlas';
    if (minor(q) && k < 0.016) {
      const t = Math.max(0, (k - 0.009) / 0.007);
      ctx.beginPath();
      ctx.arc(x, y, 1.6 + t, 0, 7);
      ctx.fillStyle = rgba(q.sub === 'heart' ? '#e6b3c3' : C.text, (0.45 + t * 0.3) * dim * fade);
      ctx.fill();
      continue;
    }
    if (fade > 0.01) {
      ctx.globalAlpha = fade;
      seal(ctx, q, x, y, dim);
      ctx.globalAlpha = 1;
    }
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

  // What lies on the ground: a small bundle where it fell, until it is picked up or taken.
  (s.ground ?? []).forEach((g) => {
    const [x, y] = at(g.at);
    ctx.fillStyle = 'rgba(4,5,7,0.8)';
    ctx.beginPath();
    ctx.arc(x, y, 6.5, 0, 7);
    ctx.fill();
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 3.5, y - 3, 7, 6);
    ctx.beginPath();
    ctx.moveTo(x - 1.5, y - 3);
    ctx.lineTo(x, y - 5.5);
    ctx.lineTo(x + 1.5, y - 3);
    ctx.stroke();
  });

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
    // The course's dots, each on a dark bead so it reads over gold grass (Jan's note in A5.1).
    pathLine(ctx, f, [life.at, ...course.pts.slice(course.at)]);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.setLineDash([2, 7]);
    ctx.strokeStyle = 'rgba(4,5,7,0.85)';
    ctx.lineWidth = 6.5;
    ctx.stroke();
    ctx.strokeStyle = '#f5c95a';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    const [x, y] = at(course.to);
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, 7);
    ctx.strokeStyle = 'rgba(4,5,7,0.85)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = '#f5c95a';
    ctx.lineWidth = 1.8;
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
      ctx.setLineDash([2, 5]);
      ctx.strokeStyle = 'rgba(4,5,7,0.7)';
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.strokeStyle = rgba(C.crack, 0.9);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 7);
    ctx.fillStyle = 'rgba(4,5,7,0.75)';
    ctx.fill();
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
  return stale;
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
