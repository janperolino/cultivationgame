// The fog's look on the travel map (A5, A5.1; design § The travel map, The fog's look; the study,
// docs/mockups/map-ground-study.ts). What you know is baked into a few soft fields over the land:
// seen land is clear to its edge; sketched land you haven't seen wears a light veil, a little dark
// and drained; past what you know the dark comes on slowly, outward only, over some 7,000 li, with
// the land beyond faint under it, drained of color. Painted cloud banks heap where the dark comes on
// and thin out with distance, each placed, sized and turned by a seed on its spot of a grid fixed to
// the world, so the same knowledge always gives the same clouds. Nothing drifts (Jan's pick).
import { SIGHT_OPEN } from '../../content/map/travel.ts';
import { known, sightAt } from '../../core/map/fog.ts';
import { smoothstep as smooth, type Multi, type Pt } from '../../core/map/geometry.ts';
import type { RegionMap } from '../../core/map/region.ts';
import type { MapLife } from '../../core/map/schema.ts';
import { hashSeed, mulberry32 } from '../../core/rng.ts';
import cloudsUrl from '../art/map/clouds.webp';
import { artArrived } from './art.ts';

/** The fields' li a pixel, and how far round what is charted they reach. */
const FIELD_RES = 300;
const FIELD_PAD = 45000;
/** How far the known fades into the dark, in li. */
const FADE_LI = 7000;
/** The banks' grid in li, fixed to the world. */
const STEP = 4600;
/** While you travel, the fog is baked again at most this often. */
const REBAKE_MS = 1500;

interface Field {
  x0: number;
  y0: number;
  w: number;
  h: number;
  res: number;
  v: Float32Array;
}

interface Bank {
  x: number;
  y: number;
  /** Across, in li. */
  size: number;
  sprite: number;
  turn: number;
  alpha: number;
  flip: boolean;
  /** A wisp over sketched land, the one cloud allowed over what you know. */
  wisp: boolean;
}

export interface Fog {
  sig: string;
  /** Everything you have charted, the places at least sketched and your trail: [x0, y0, x1, y1]. */
  charted: readonly [number, number, number, number];
  /** Where the field images lie in the world. */
  box: readonly [number, number, number, number];
  dark: HTMLCanvasElement;
  drain: HTMLCanvasElement;
  veilDrain: HTMLCanvasElement;
  veilDim: HTMLCanvasElement;
  banks: Bank[];
}

function pathOf(m: Multi): Path2D {
  const p = new Path2D();
  for (const poly of m)
    for (const r of poly) {
      r.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
      p.closePath();
    }
  return p;
}

/**
 * A field over the land, 0 to 1: what `paint` fills, faded outward only past its edge (Jan's note:
 * what you know stays clear to its edge, the dark comes on past it). It grows the shape by half the
 * fade (the brightest of copies laid round a ring), blurs that by the other half, and keeps the
 * brighter of it and the shape.
 */
function bakeField(
  box: readonly [number, number, number, number],
  res: number,
  fadeLi: number,
  paint: (g: CanvasRenderingContext2D) => void,
): Field {
  const w = Math.ceil((box[2] - box[0]) / res);
  const h = Math.ceil((box[3] - box[1]) / res);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, h);
  g.setTransform(1 / res, 0, 0, 1 / res, -box[0] / res, -box[1] / res);
  g.fillStyle = '#fff';
  g.strokeStyle = '#fff';
  paint(g);
  const r = fadeLi / res / 2;
  const grown = document.createElement('canvas');
  grown.width = w;
  grown.height = h;
  const gg = grown.getContext('2d')!;
  gg.drawImage(c, 0, 0);
  gg.globalCompositeOperation = 'lighten';
  for (const rr of [r / 2, r])
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      gg.drawImage(c, Math.cos(a) * rr, Math.sin(a) * rr);
    }
  const b = document.createElement('canvas');
  b.width = w;
  b.height = h;
  const bg = b.getContext('2d')!;
  bg.filter = `blur(${r}px)`;
  bg.drawImage(grown, 0, 0);
  const soft = bg.getImageData(0, 0, w, h).data;
  const raw = g.getImageData(0, 0, w, h).data;
  const v = new Float32Array(w * h);
  for (let i = 0; i < v.length; i++) v[i] = Math.max(raw[i * 4]!, soft[i * 4]!) / 255;
  return { x0: box[0], y0: box[1], w, h, res, v };
}

const at = (f: Field, x: number, y: number) => {
  const i = Math.floor((x - f.x0) / f.res);
  const j = Math.floor((y - f.y0) / f.res);
  return i < 0 || j < 0 || i >= f.w || j >= f.h ? 0 : f.v[j * f.w + i]!;
};

/**
 * The four images over the fields, made in one pass, since they are made again as you travel:
 * the dark over the unknown and the grey that drains its color, and the veil over sketched land you
 * haven't seen (Jan's pick over the ink), a little dark and a little drained.
 */
function fieldImages(field: Field, seen: Field) {
  const { w, h } = field;
  const make = (rgb: readonly [number, number, number]) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d')!;
    const img = g.createImageData(w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = rgb[0];
      d[i + 1] = rgb[1];
      d[i + 2] = rgb[2];
    }
    return { c, g, img, d };
  };
  const dark = make([4, 5, 8]);
  const drain = make([122, 122, 122]);
  const veilDrain = make([122, 122, 122]);
  const veilDim = make([4, 5, 8]);
  for (let i = 0; i < field.v.length; i++) {
    const k = field.v[i]!;
    const veil = k * (1 - seen.v[i]!) * 0.3 * 255;
    // The dark comes on as smoothstep(0.03, 0.97) of how unknown a spot is.
    const t = Math.max(0, Math.min(1, (1 - k - 0.03) / 0.94));
    const darkness = t * t * (3 - 2 * t) * 255;
    const a = i * 4 + 3;
    dark.d[a] = darkness * 0.94;
    drain.d[a] = darkness * 0.95;
    veilDrain.d[a] = veil;
    veilDim.d[a] = veil;
  }
  for (const x of [dark, drain, veilDrain, veilDim]) x.g.putImageData(x.img, 0, 0);
  return { dark: dark.c, drain: drain.c, veilDrain: veilDrain.c, veilDim: veilDim.c };
}

/** What the fog is built from; it changes only when what you know does. */
function signature(map: RegionMap, life: MapLife): string {
  let seen = 0;
  let sketched = 0;
  for (const st of Object.values(life.know))
    if (st === 'seen') seen++;
    else if (st === 'sketched') sketched++;
  return `${map.id}|${seen}|${sketched}|${life.trail.length}|${Math.round(life.at[0] / 1000)},${Math.round(life.at[1] / 1000)}`;
}

/**
 * Bakes the fog in steps, yielding between them, so a bake while you travel is spread over a few
 * frames rather than held in one (each step is a field, the images or the banks).
 */
function* bake(map: RegionMap, life: MapLife, sig: string): Generator<void, Fog> {
  const isKnown = (id: string) => {
    const st = known(life, id);
    return st === 'seen' || st === 'sketched';
  };
  // Everything charted: what is sketched or seen, your trail and where you stand.
  let [cx0, cy0, cx1, cy1] = [life.at[0], life.at[1], life.at[0], life.at[1]];
  const take = ([x, y]: Pt) => {
    cx0 = Math.min(cx0, x);
    cy0 = Math.min(cy0, y);
    cx1 = Math.max(cx1, x);
    cy1 = Math.max(cy1, y);
  };
  life.trail.forEach(take);
  for (const a of map.areas)
    if (isKnown(a.id)) for (const poly of a.outline) for (const ring of poly) ring.forEach(take);
  for (const q of map.places) if (isKnown(q.id)) take([q.x, q.y]);
  const charted = [cx0, cy0, cx1, cy1] as const;
  const box = [
    charted[0] - FIELD_PAD,
    charted[1] - FIELD_PAD,
    charted[2] + FIELD_PAD,
    charted[3] + FIELD_PAD,
  ] as const;

  const region = pathOf(map.outline);
  const trail = new Path2D();
  life.trail.forEach(([x, y], i) => (i ? trail.lineTo(x, y) : trail.moveTo(x, y)));
  const sight = sightAt(map, life.at);
  const seenPaint = (g: CanvasRenderingContext2D) => {
    g.save();
    g.clip(region, 'evenodd');
    for (const a of map.areas)
      if (known(life, a.id) === 'seen') g.fill(pathOf(a.outline), 'evenodd');
    g.restore();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.lineWidth = SIGHT_OPEN * 2;
    g.stroke(trail);
    g.beginPath();
    g.arc(life.at[0], life.at[1], sight * 1.5, 0, 7);
    g.fill();
  };
  // What you know: the region faintly once you know of it, what is sketched or seen wholly.
  const knownPaint = (g: CanvasRenderingContext2D) => {
    if (known(life, map.id) !== 'unknown') {
      g.fillStyle = 'rgb(40,40,40)';
      g.fill(region, 'evenodd');
      g.fillStyle = '#fff';
    }
    g.save();
    g.clip(region, 'evenodd');
    for (const a of map.areas) if (isKnown(a.id)) g.fill(pathOf(a.outline), 'evenodd');
    g.restore();
    seenPaint(g);
  };
  const field = bakeField(box, FIELD_RES, FADE_LI, knownPaint);
  yield;
  // How near each spot lies to what you know, over a long way: the banks thin out with it. Coarse,
  // since it only places clouds.
  const near = bakeField(box, FIELD_RES * 4, 40000, knownPaint);
  const seen = bakeField(box, FIELD_RES, 2400, seenPaint);
  yield;

  const fog: Fog = { sig, charted, box, ...fieldImages(field, seen), banks: [] };
  yield;

  // The banks, heaped in irregular clumps where the dark begins: each spot on a jittered grid fixed
  // to the world takes a bank by how far past what you know it lies, most just where the dark comes
  // on, few deep in, now and then a thin wisp over sketched land you haven't seen.
  for (let j = Math.floor(box[1] / STEP); j * STEP < box[3]; j++)
    for (let i = Math.floor(box[0] / STEP); i * STEP < box[2]; i++) {
      const rng = mulberry32(hashSeed(`fog-bank:${i}:${j}`));
      const px = (i + 0.5 + (rng() - 0.5)) * STEP;
      const py = (j + 0.5 + (rng() - 0.5)) * STEP;
      const u = 1 - at(field, px, py);
      const frontier = Math.exp(-(((u - 0.68) / 0.18) ** 2));
      const deep = u > 0.9 ? 0.32 * smooth(0.05, 0.6, at(near, px, py)) : 0;
      const wisp = u < 0.2 && at(seen, px, py) < 0.3 ? 0.07 : 0;
      const p = Math.max(frontier * 0.9, deep, wisp);
      if (rng() >= p) continue;
      const big = u > 0.85;
      fog.banks.push({
        x: px,
        y: py,
        size: (wisp ? 8000 : big ? 26000 : 17000) * (0.7 + rng() * 0.8),
        sprite: Math.floor(rng() * 8),
        turn: (rng() - 0.5) * 0.8,
        // Bright and heaped where the dark comes on, dim deeper in, faint over sketched land.
        alpha: wisp ? 0.32 : big ? 0.42 : 0.88,
        flip: rng() < 0.5,
        wisp: wisp > 0,
      });
    }
  fog.banks.sort((a, b) => a.y - b.y);
  return fog;
}

/**
 * Each map's fog, when its bake began, and the bake under way, if any. Keyed by the map itself:
 * every lineage generates its own, so two lives on one region never share a fog.
 */
const FOGS = new WeakMap<RegionMap, { fog: Fog; at: number; baking: boolean }>();

/** Runs a bake a step a task, so the frames between its steps still draw; then draws again. */
function bakeLater(map: RegionMap, steps: Generator<void, Fog>) {
  const step = () => {
    const r = steps.next();
    const held = FOGS.get(map)!;
    if (r.done) {
      FOGS.set(map, { ...held, fog: r.value, baking: false });
      artArrived();
    } else setTimeout(step, 0);
  };
  setTimeout(step, 0);
}

/**
 * The fog for a life on a region's map. The first is baked at once; after that a change in what
 * you know bakes it again in steps between frames, at most once every REBAKE_MS, the last one
 * standing meanwhile, and `stale` says to draw again later.
 */
export function fogOf(map: RegionMap, life: MapLife): { fog: Fog; stale: boolean } {
  const sig = signature(map, life);
  const held = FOGS.get(map);
  const now = performance.now();
  if (!held) {
    const steps = bake(map, life, sig);
    let r = steps.next();
    while (!r.done) r = steps.next();
    FOGS.set(map, { fog: r.value, at: now, baking: false });
    return { fog: r.value, stale: false };
  }
  if (held.fog.sig === sig) return { fog: held.fog, stale: false };
  if (!held.baking && now - held.at >= REBAKE_MS) {
    FOGS.set(map, { ...held, at: now, baking: true });
    bakeLater(map, bake(map, life, sig));
  }
  return { fog: held.fog, stale: true };
}

/** The 8 cloud banks of GPT's sheet (two across, four down), their brightness made their alpha. */
let sprites: HTMLCanvasElement[] = [];
let asked = false;
function bankSprites(): HTMLCanvasElement[] {
  if (!asked) {
    asked = true;
    const sheet = new Image();
    sheet.onload = () => {
      const cw = Math.floor(sheet.naturalWidth / 2);
      const ch = Math.floor(sheet.naturalHeight / 4);
      sprites = Array.from({ length: 8 }, (_, n) => {
        const c = document.createElement('canvas');
        c.width = cw;
        c.height = ch;
        const g = c.getContext('2d', { willReadFrequently: true })!;
        g.drawImage(sheet, (n % 2) * cw, Math.floor(n / 2) * ch, cw, ch, 0, 0, cw, ch);
        const px = g.getImageData(0, 0, cw, ch);
        for (let i = 0; i < px.data.length; i += 4) {
          const lum = 0.3 * px.data[i]! + 0.59 * px.data[i + 1]! + 0.11 * px.data[i + 2]!;
          // The cell's edge fades too, so a cloud that touches it never shows a straight cut.
          const x = (i / 4) % cw;
          const y = Math.floor(i / 4 / cw);
          const edge = smooth(0, 0.12, Math.min(x / cw, 1 - x / cw, y / ch, 1 - y / ch));
          px.data[i + 3] = Math.min(255, Math.max(0, (lum - 10) * 1.6)) * edge;
        }
        g.putImageData(px, 0, 0);
        return c;
      });
      artArrived();
    };
    sheet.src = cloudsUrl;
  }
  return sprites;
}

/**
 * Draws the fog in world space (the context's transform set to the view): the veil over sketched
 * land, the drained dark past what you know, all dark past the fields, then the banks on screen.
 */
export function drawFog(
  ctx: CanvasRenderingContext2D,
  fog: Fog,
  view: readonly [number, number, number, number],
): void {
  const [x0, y0, x1, y1] = fog.box;
  const w = x1 - x0;
  const h = y1 - y0;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.globalCompositeOperation = 'saturation';
  ctx.drawImage(fog.veilDrain, x0, y0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(fog.veilDim, x0, y0, w, h);
  ctx.globalCompositeOperation = 'saturation';
  ctx.drawImage(fog.drain, x0, y0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(fog.dark, x0, y0, w, h);
  ctx.fillStyle = 'rgba(4,5,8,0.94)';
  const far = 1e7;
  ctx.fillRect(x0 - far, y0 - far, far, h + 2 * far);
  ctx.fillRect(x1, y0 - far, far, h + 2 * far);
  ctx.fillRect(x0, y0 - far, w, far);
  ctx.fillRect(x0, y1, w, far);
  const imgs = bankSprites();
  if (imgs.length) {
    // The banks, then the wisps over sketched land on top.
    for (const wisps of [false, true])
      for (const bk of fog.banks) {
        if (bk.wisp !== wisps) continue;
        const r = bk.size;
        if (bk.x + r < view[0] || bk.x - r > view[2] || bk.y + r < view[1] || bk.y - r > view[3])
          continue;
        const img = imgs[bk.sprite]!;
        const bh = (r * img.height) / img.width;
        ctx.save();
        ctx.translate(bk.x, bk.y);
        ctx.rotate(bk.turn);
        if (bk.flip) ctx.scale(-1, 1);
        ctx.globalAlpha = bk.alpha;
        ctx.drawImage(img, -r / 2, -bh / 2, r, bh);
        ctx.restore();
      }
  }
  ctx.restore();
}
