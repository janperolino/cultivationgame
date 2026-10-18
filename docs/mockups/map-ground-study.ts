// A5 study: the Map's land as GPT paints it, on the real Border Wilds from the atlas. Each region's
// painting (tools/map-paint.ts, take D) is cut to its outline and the sea; its detail tiles, upscaled
// and cut into chunk pyramids (tools/map-chunks.ts), stand over it at every zoom, so the land never
// changes as you zoom; the code's roads and names lie on top. Served by the dev server:
// http://localhost:5173/docs/mockups/map-ground-study.html. Nothing here is the game's yet.
import { densify, segDist, type Multi, type Pt } from '../../src/core/map/geometry.ts';
import { areaAt, generateRegion, regionMap, type RegionMap } from '../../src/core/map/region.ts';
import { sightAt } from '../../src/core/map/fog.ts';
import { hashSeed, mulberry32 } from '../../src/core/rng.ts';
import { depthLines } from '../../src/ui/map/draw.ts';
import atlas from '../../src/content/generated/atlas.json';
import mrDraft from './medicine-ridges-draft.json';

/** A frame is asked for; set before anything loads, since a cached image can call redraw at once. */
let queued = false;
const opts = { tiles: 'on', upscaled: 'on', fit: 'on', labels: 'on', fog: 'on', ink: 'off', erase: 'off', drift: 'off', limit: 'charted' };

// ---------------------------------------------------------------- the paintings

/** Where a picture sits in the world: W×H pixels, k pixels a li, its corner at x0, y0. */
interface Frame {
  W: number;
  H: number;
  k: number;
  x0: number;
  y0: number;
  /** tools/map-fit.ts: guide pixel to painting pixel, a canvas matrix. */
  fit?: number[];
}
interface Guide extends Frame {
  region: string;
}
interface TileFrame extends Frame {
  id: string;
  /** tools/map-fit.ts: a gain and an offset a channel, to the region painting's colors. */
  tone?: number[];
}
interface ChunkPyramid {
  id: string;
  chunk: number;
  /** Chunk pixels a pixel of the painting the fit was made for. */
  scale: number;
  levels: { cols: number; rows: number; w: number; h: number }[];
}

const shapeOf = (id: string) =>
  (atlas.shapes as unknown as Record<string, { type: string; polygons?: Multi }>)[id];
function outlinePath(m: Multi): Path2D {
  const p = new Path2D();
  for (const poly of m)
    for (const r of poly) {
      r.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
      p.closePath();
    }
  return p;
}

const guides = import.meta.glob('./map-guide-qm-*.json', { eager: true, import: 'default' }) as Record<string, Guide>;
const tileLists = import.meta.glob('./map-tiles/*/tiles.json', { eager: true, import: 'default' }) as Record<
  string,
  { region: string; tiles: TileFrame[] }
>;
const pyramids = import.meta.glob('./map-tiles/*/chunks/*/chunks.json', { eager: true, import: 'default' }) as Record<
  string,
  ChunkPyramid
>;
const pyramidOf = (region: string, id: string) =>
  Object.entries(pyramids).find(([path]) => path.includes(`/${region}/chunks/${id}/`))?.[1];

/** A tile without chunks yet: its painting with its tone and feathered edges, made once. */
function feathered(img: HTMLImageElement, tone?: number[]): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d')!;
  g.drawImage(img, 0, 0);
  if (tone) {
    const px = g.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < px.data.length; i += 4)
      for (let ch = 0; ch < 3; ch++) px.data[i + ch] = tone[ch * 2]! * px.data[i + ch]! + tone[ch * 2 + 1]!;
    g.putImageData(px, 0, 0);
  }
  g.globalCompositeOperation = 'destination-in';
  const f = Math.min(c.width, c.height) * 0.07;
  for (const [x1, y1, x2, y2, len] of [
    [0, 0, c.width, 0, c.width],
    [c.width, 0, 0, 0, c.width],
    [0, 0, 0, c.height, c.height],
    [0, c.height, 0, 0, c.height],
  ] as const) {
    const grad = g.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(f / len, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = grad;
    g.fillRect(0, 0, c.width, c.height);
  }
  return c;
}

const REGIONS = ['qm-bianhuang', 'qm-yaoling'].map((id) => {
  const img = new Image();
  const r = {
    id,
    img,
    ok: false,
    // The current guide, not a saved earlier one (map-guide-<id>-v1.json).
    guide: Object.entries(guides).find(([path, g]) => g.region === id && !/-v\d/.test(path))?.[1],
    outline: outlinePath(shapeOf(id)!.polygons!),
    tiles: (Object.values(tileLists).find((l) => l.region === id)?.tiles ?? []).map((t) => {
      const tile = { ...t, canvas: null as HTMLCanvasElement | null, pyramid: pyramidOf(id, t.id) };
      const timg = new Image();
      timg.onload = () => {
        tile.canvas = feathered(timg, t.tone);
        redraw();
      };
      timg.src = `./map-tiles/${id}/tile-${t.id}.png`;
      return tile;
    }),
  };
  img.onload = () => {
    r.ok = true;
    redraw();
  };
  img.src = `./map-painting-${id}.png`;
  return r;
});
const continent = outlinePath(shapeOf('qiming')!.polygons!);
/**
 * Your region and every region that touches its border (Jan's note: heard of, so named, but only
 * the ones next door): its edge, and where its name sits. A region touches when its edge runs
 * within 800 li of a point on your region's edge, walked every 1,000 li.
 */
const HOME = 'qm-bianhuang';
const homeRing = densify(shapeOf(HOME)!.polygons![0]![0]!, 1000);
const ALL_REGIONS = (atlas.entries as { id: string; kind: string; name: string; hanzi: string }[])
  .filter((e) => e.kind === 'region' && shapeOf(e.id)?.type === 'area')
  .map((e) => {
    const ring = shapeOf(e.id)!.polygons![0]![0]!;
    let cx = 0;
    let cy = 0;
    for (const [x, y] of ring) {
      cx += x;
      cy += y;
    }
    const touching = homeRing.filter((p) => ring.some((a, i) => segDist(p, a, ring[(i + 1) % ring.length]!) < 800));
    const near = touching.length;
    // Its name sits in the middle of it (Jan's pick).
    const lx = cx / ring.length;
    const ly = cy / ring.length;
    return {
      id: e.id,
      name: e.name,
      hanzi: e.hanzi,
      outline: outlinePath(shapeOf(e.id)!.polygons!),
      cx: lx,
      cy: ly,
      near,
    };
  });
const NEIGHBOURS = [
  ALL_REGIONS.find((r) => r.id === HOME)!,
  ...ALL_REGIONS.filter((r) => r.id !== HOME && r.near > 0),
];
/**
 * The seas next door, named too (the Jade Strait off the Border Wilds' coast). The atlas keeps a
 * sea as a centre and a reach, so one is next door when its reach comes within 8,000 li of your
 * region's edge; its name sits at its centre.
 */
const NEAR_SEAS = (atlas.entries as { id: string; kind: string; name: string; hanzi: string; map?: { x?: number; y?: number; r?: number } }[])
  .filter((e) => e.kind === 'sea' && e.map?.x != null && e.map.r)
  .filter((e) => homeRing.some(([x, y]) => Math.hypot(x - e.map!.x!, y - e.map!.y!) < e.map!.r! + 8000))
  .map((e) => ({ name: e.name, hanzi: e.hanzi, cx: e.map!.x!, cy: e.map!.y! }));

// ---------------------------------------------------------------- what the code draws on top

const map: RegionMap = regionMap(generateRegion('qm-bianhuang', 'study'));
const land = outlinePath(map.land);
const mrSpots = new Map<string, { x: number; y: number; name: string; big: boolean }>();
for (const e of atlas.entries as { id: string; parent?: string; name: string; map?: { x?: number; y?: number; r?: number } }[])
  if (e.parent === 'qm-yaoling' && e.map?.x != null && !e.map.r)
    mrSpots.set(e.id, { x: e.map.x, y: e.map.y!, name: e.name, big: true });
for (const t of mrDraft.towns) mrSpots.set(t.id, { x: t.x, y: t.y, name: t.name, big: t.sub === 'town' });

// ---------------------------------------------------------------- the fog

// Samples of what one save knows, picked in the bar (?sample=…), to show the fog building itself
// round any knowledge (design § The world, The fog). In each you walked from the City of the
// Guarded Mouth past Beast-Butcher Gate to Pacified Fort, so the March and the tracts you crossed
// are seen, and the rest of the region is known only to be there, faintly lifted.
// arrived: that is all. map: a bought map sketched Stone Eyes and the Spirit Herders (Jan's first pick).
// region: the whole region is sketched (the default, Jan's pick). far: the whole region sketched, and you went on to Sinkhole Terraces and saw Stone Eyes.
const SAMPLE = new URLSearchParams(location.search).get('sample') ?? 'region';
const roadBetween = (a: string, b: string) =>
  map.roads.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a))!.pts;
const trail: Pt[] = [
  ...roadBetween('qm-shoukou-cheng', 'qm-tushou-men'),
  ...roadBetween('qm-tushou-men', 'pacified-fort'),
  ...(SAMPLE === 'far'
    ? [...roadBetween('pacified-fort', 'ninth-beacon'), ...roadBetween('ninth-beacon', 'sinkhole-terraces')]
    : []),
];
const you = trail.at(-1)!;
/** A sample course you have set, from where you stand down the next road. */
const course: Pt[] =
  SAMPLE === 'far' ? roadBetween('sinkhole-terraces', 'bat-roost') : roadBetween('pacified-fort', 'grain-ford');
const seen = new Set<string>(['qm-anbian-fu', ...(SAMPLE === 'far' ? ['qm-shiyan-guo'] : [])]);
for (const p of trail) {
  const a = areaAt(map, p);
  if (a) seen.add(a.id);
}
const sketched = new Set(
  SAMPLE === 'region' || SAMPLE === 'far'
    ? map.areas.map((a) => a.id)
    : SAMPLE === 'arrived'
      ? []
      : ['qm-shiyan-guo', 'qm-muling-guo'],
);
/** The map reads sight at thirty times a scene's, by the terrain you stand on (design § The travel map). */
const SIGHT_LI = 600;
const sightHere = sightAt(map, you);

/**
 * Everything you have charted: the places at least sketched, and your trail. The farthest zoom
 * fits it (Jan's call in A5), and the fog is baked round it.
 */
const charted = (() => {
  const pts: Pt[] = [...trail];
  for (const a of map.areas)
    if (seen.has(a.id) || sketched.has(a.id))
      for (const poly of a.outline) for (const ring of poly) pts.push(...ring);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] as const;
})();

// The fog, from Jan's mockups (docs/mockups/map-fog/inspo-*.jpg): what you know fades slowly into
// the dark past its edge, the land beyond still faint under it and drained of color; painted cloud
// banks pile up just outside what you know and thin out deeper in. Every bank is placed, sized and
// turned on its own, so nothing repeats. Sketched land is the painting drained to ink, as a map
// shows it; seen land is the living painting, its color and its detail tiles (Jan's call).

/** The knowledge fields, li a pixel, and how far round what is charted they reach. */
const FIELD_RES = 250;
const FIELD_PAD = 45000;
/** How far the known fades into the dark, in li. */
const FADE_LI = 7000;
const fx0 = charted[0] - FIELD_PAD;
const fy0 = charted[1] - FIELD_PAD;
const fw = Math.ceil((charted[2] - charted[0] + 2 * FIELD_PAD) / FIELD_RES);
const fh = Math.ceil((charted[3] - charted[1] + 2 * FIELD_PAD) / FIELD_RES);

/**
 * A field over the land, 0 to 1, baked once: what `paint` fills, faded outward only past its edge
 * (Jan's note: what you know stays clear to its edge, the dark comes on past it). It grows the
 * shape by half the fade (the brightest of copies laid round a ring), blurs that by the other half,
 * and keeps the brighter of it and the shape.
 */
function bakeField(paint: (g: CanvasRenderingContext2D) => void, fadeLi: number): Float32Array {
  const c = document.createElement('canvas');
  c.width = fw;
  c.height = fh;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, fw, fh);
  g.setTransform(1 / FIELD_RES, 0, 0, 1 / FIELD_RES, -fx0 / FIELD_RES, -fy0 / FIELD_RES);
  g.fillStyle = '#fff';
  g.strokeStyle = '#fff';
  paint(g);
  const r = fadeLi / FIELD_RES / 2;
  const grown = document.createElement('canvas');
  grown.width = fw;
  grown.height = fh;
  const gg = grown.getContext('2d')!;
  gg.drawImage(c, 0, 0);
  gg.globalCompositeOperation = 'lighten';
  for (const rr of [r / 2, r])
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      gg.drawImage(c, Math.cos(a) * rr, Math.sin(a) * rr);
    }
  const b = document.createElement('canvas');
  b.width = fw;
  b.height = fh;
  const bg = b.getContext('2d', { willReadFrequently: true })!;
  bg.filter = `blur(${r}px)`;
  bg.drawImage(grown, 0, 0);
  const soft = bg.getImageData(0, 0, fw, fh).data;
  const raw = g.getImageData(0, 0, fw, fh).data;
  const k = new Float32Array(fw * fh);
  for (let i = 0; i < k.length; i++) k[i] = Math.max(raw[i * 4]!, soft[i * 4]!) / 255;
  return k;
}
const regionOutline = outlinePath(map.outline);
const seenPaint = (g: CanvasRenderingContext2D) => {
  g.save();
  g.clip(regionOutline, 'evenodd');
  for (const a of map.areas) if (seen.has(a.id)) g.fill(outlinePath(a.outline as Multi), 'evenodd');
  g.restore();
  const t = new Path2D();
  trail.forEach(([x, y], i) => (i ? t.lineTo(x, y) : t.moveTo(x, y)));
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = SIGHT_LI * 2;
  g.stroke(t);
  g.beginPath();
  g.arc(you[0], you[1], sightHere * 1.5, 0, 7);
  g.fill();
};
/** What you know: the region faintly, what is sketched or seen wholly. */
const knownPaint = (g: CanvasRenderingContext2D) => {
  g.fillStyle = 'rgb(40,40,40)';
  g.fill(regionOutline, 'evenodd');
  g.fillStyle = '#fff';
  g.save();
  g.clip(regionOutline, 'evenodd');
  for (const a of map.areas)
    if (seen.has(a.id) || sketched.has(a.id)) g.fill(outlinePath(a.outline as Multi), 'evenodd');
  g.restore();
  seenPaint(g);
};
/** How well each spot is known: sketched or seen. */
const field = bakeField(knownPaint, FADE_LI);
/**
 * How near each spot lies to what you know, over a long way (40,000 li): the banks thin out with it,
 * heaped near the edge and giving way to empty dark far out, whatever shape your knowledge has.
 */
const nearField = bakeField(knownPaint, 40000);
const nearAt = (x: number, y: number) => {
  const i = Math.floor((x - fx0) / FIELD_RES);
  const j = Math.floor((y - fy0) / FIELD_RES);
  return i < 0 || j < 0 || i >= fw || j >= fh ? 0 : nearField[j * fw + i]!;
};
/** Which of it you have seen with your own eyes; its edge fades into ink over a shorter way. */
const seenField = bakeField(seenPaint, 2400);
const seenAt = (x: number, y: number) => {
  const i = Math.floor((x - fx0) / FIELD_RES);
  const j = Math.floor((y - fy0) / FIELD_RES);
  return i < 0 || j < 0 || i >= fw || j >= fh ? 0 : seenField[j * fw + i]!;
};
const knownAt = (x: number, y: number) => {
  const i = Math.floor((x - fx0) / FIELD_RES);
  const j = Math.floor((y - fy0) / FIELD_RES);
  return i < 0 || j < 0 || i >= fw || j >= fh ? 0 : field[j * fw + i]!;
};
const smooth = (a: number, b: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** An image over the fields: a color with an alpha a spot, from how known and how seen it is. */
function fieldImage(rgb: [number, number, number], alpha: (known: number, seen: number) => number) {
  const c = document.createElement('canvas');
  c.width = fw;
  c.height = fh;
  const cx = c.getContext('2d')!;
  const img = cx.createImageData(fw, fh);
  for (let i = 0; i < field.length; i++) {
    img.data[i * 4] = rgb[0];
    img.data[i * 4 + 1] = rgb[1];
    img.data[i * 4 + 2] = rgb[2];
    img.data[i * 4 + 3] = 255 * alpha(field[i]!, seenField[i]!);
  }
  cx.putImageData(img, 0, 0);
  return c;
}
/** The dark over the unknown, and the grey that drains its color. */
const darkness = (k: number) => smooth(0.03, 0.97, 1 - k);
const darkImg = fieldImage([4, 5, 8], (k) => darkness(k) * 0.94);
const drainImg = fieldImage([122, 122, 122], (k) => darkness(k) * 0.95);
/** The ink over sketched land you haven't seen: drained, warmed toward old ink, a little dimmed. */
const inkDrainImg = fieldImage([122, 122, 122], (k, s) => k * (1 - s) * 0.92);
const inkToneImg = fieldImage([150, 122, 84], (k, s) => k * (1 - s) * 0.5);
const inkDimImg = fieldImage([10, 9, 8], (k, s) => k * (1 - s) * 0.22);
/** The veil over sketched land you haven't seen (Jan's pick over the ink): a little dark, a little drained. */
const veilDrainImg = fieldImage([122, 122, 122], (k, s) => k * (1 - s) * 0.3);
const veilDimImg = fieldImage([4, 5, 8], (k, s) => k * (1 - s) * 0.3);
/** What you know, as alpha: it erases the banks over your land, softly through the fade. */
const knownImg = fieldImage([0, 0, 0], (k) => smooth(0.35, 0.97, k));
/** How seen each spot is, as alpha: the detail tiles' mask. */
const seenImg = fieldImage([255, 255, 255], (_k, s) => s);

/** The 8 cloud banks of GPT's sheet (map-fog/clouds-sheet.png), their brightness made their alpha. */
let banks: HTMLCanvasElement[] = [];
const sheet = new Image();
sheet.onload = () => {
  // GPT laid it out two across and four down.
  const cw = Math.floor(sheet.naturalWidth / 2);
  const ch = Math.floor(sheet.naturalHeight / 4);
  banks = Array.from({ length: 8 }, (_, n) => {
    const c = document.createElement('canvas');
    c.width = cw;
    c.height = ch;
    const g = c.getContext('2d')!;
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
  redraw();
};
sheet.src = './map-fog/clouds-sheet.png';

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
  speed: number;
}
/**
 * The banks, heaped in irregular clumps where the dark begins (Jan's pick over a ring of walls and
 * over a noise-heaped take). Each spot on a jittered grid takes a bank by how far past what you know
 * it lies: most just where the dark comes on, few deep in, now and then a thin wisp over sketched
 * land you haven't seen. Seeded, so the same knowledge always gives the same clouds, and as you
 * chart more they move out with it.
 */
const BANKS: Bank[] = (() => {
  const rng = mulberry32(hashSeed('fog-banks:study'));
  const out: Bank[] = [];
  const STEP = 4600;
  for (let y = fy0; y < fy0 + fh * FIELD_RES; y += STEP)
    for (let x = fx0; x < fx0 + fw * FIELD_RES; x += STEP) {
      const px = x + (rng() - 0.5) * STEP;
      const py = y + (rng() - 0.5) * STEP;
      const u = 1 - knownAt(px, py);
      const frontier = Math.exp(-(((u - 0.68) / 0.18) ** 2));
      const deep = u > 0.9 ? 0.32 * smooth(0.05, 0.6, nearAt(px, py)) : 0;
      const wisp = u < 0.2 && seenAt(px, py) < 0.3 ? 0.07 : 0;
      const p = Math.max(frontier * 0.9, deep, wisp);
      if (rng() >= p) continue;
      const big = u > 0.85;
      out.push({
        x: px,
        y: py,
        size: (wisp ? 8000 : big ? 26000 : 17000) * (0.7 + rng() * 0.8),
        sprite: Math.floor(rng() * 8),
        turn: (rng() - 0.5) * 0.8,
        // Bright and heaped where the dark comes on, dim deeper in, faint over sketched land.
        alpha: wisp ? 0.32 : big ? 0.42 : 0.88,
        flip: rng() < 0.5,
        speed: 0.6 + rng() * 0.8,
        wisp: wisp > 0,
      });
    }
  out.sort((a, b) => a.y - b.y);
  return out;
})();

function drawFog(t: number) {
  if (opts.fog === 'off') return;
  worldTransform();
  ctx.imageSmoothingEnabled = true;
  // Sketched land you haven't seen, as a map shows it: drained, warmed toward old ink, dimmed.
  if (opts.ink === 'on') {
    const [x, y, w, h] = [fx0, fy0, fw * FIELD_RES, fh * FIELD_RES];
    ctx.globalCompositeOperation = 'saturation';
    ctx.drawImage(inkDrainImg, x, y, w, h);
    ctx.globalCompositeOperation = 'color';
    ctx.drawImage(inkToneImg, x, y, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(inkDimImg, x, y, w, h);
  } else {
    const [x, y, w, h] = [fx0, fy0, fw * FIELD_RES, fh * FIELD_RES];
    ctx.globalCompositeOperation = 'saturation';
    ctx.drawImage(veilDrainImg, x, y, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(veilDimImg, x, y, w, h);
  }
  // Drain the color of what you don't know, then darken it; past the field, all dark.
  ctx.globalCompositeOperation = 'saturation';
  ctx.drawImage(drainImg, fx0, fy0, fw * FIELD_RES, fh * FIELD_RES);
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(darkImg, fx0, fy0, fw * FIELD_RES, fh * FIELD_RES);
  ctx.fillStyle = 'rgba(4,5,8,0.94)';
  const far = 1e7;
  const fx1 = fx0 + fw * FIELD_RES;
  const fy1 = fy0 + fh * FIELD_RES;
  ctx.fillRect(fx0 - far, fy0 - far, far, fy1 - fy0 + 2 * far);
  ctx.fillRect(fx1, fy0 - far, far, fy1 - fy0 + 2 * far);
  ctx.fillRect(fx0, fy0 - far, fx1 - fx0, far);
  ctx.fillRect(fx0, fy1, fx1 - fx0, far);
  // The banks, each on its own, culled to the screen.
  if (!banks.length) return;
  const [vx0, vy0] = [view.x - W / 2 / view.k, view.y - H / 2 / view.k];
  const [vx1, vy1] = [view.x + W / 2 / view.k, view.y + H / 2 / view.k];
  const lay = (c: CanvasRenderingContext2D, wisps: boolean) => {
    for (const bk of BANKS) {
      if (bk.wisp !== wisps) continue;
      const x = bk.x + t * 60 * bk.speed;
      const y = bk.y + t * 18 * bk.speed;
      const r = bk.size;
      if (x + r < vx0 || x - r > vx1 || y + r < vy0 || y - r > vy1) continue;
      const img = banks[bk.sprite]!;
      const h = (r * img.height) / img.width;
      c.save();
      c.translate(x, y);
      c.rotate(bk.turn);
      if (bk.flip) c.scale(-1, 1);
      c.globalAlpha = bk.alpha;
      c.drawImage(img, -r / 2, -h / 2, r, h);
      c.restore();
    }
    c.globalAlpha = 1;
  };
  // The banks on a layer of their own, erased wherever you know the land (Jan's note: they heap up
  // to the edge, never over it), softly through the fade.
  if (bankCanvas.width !== canvas.width || bankCanvas.height !== canvas.height) {
    bankCanvas.width = canvas.width;
    bankCanvas.height = canvas.height;
  }
  const m = ctx.getTransform();
  bankCtx.setTransform(1, 0, 0, 1, 0, 0);
  bankCtx.clearRect(0, 0, bankCanvas.width, bankCanvas.height);
  bankCtx.setTransform(m);
  lay(bankCtx, false);
  if (opts.erase === 'on') {
    bankCtx.globalCompositeOperation = 'destination-out';
    bankCtx.drawImage(knownImg, fx0, fy0, fw * FIELD_RES, fh * FIELD_RES);
    bankCtx.globalCompositeOperation = 'source-over';
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(bankCanvas, 0, 0);
  ctx.setTransform(m);
  // The wisps over sketched land, on top.
  lay(ctx, true);
}
const bankCanvas = document.createElement('canvas');
const bankCtx = bankCanvas.getContext('2d')!;

// ---------------------------------------------------------------- drawing

const canvas = document.getElementById('map') as HTMLCanvasElement;
const main = canvas.getContext('2d')!;
/** Where drawing goes: the map, or for a moment the detail tiles' own layer. */
let ctx = main;
const tileCanvas = document.createElement('canvas');
const tileCtx = tileCanvas.getContext('2d')!;
const readout = document.getElementById('readout')!;
const [bx0, by0, bx1, by1] = map.bbox;
const fort = map.places.find((q) => /Pacified Fort/.test(q.name)) ?? map.places[0]!;
const view = { x: (bx0 + bx1) / 2, y: (by0 + by1) / 2, k: 0.01 };
let W = 0;
let H = 0;
let dpr = 1;

const at = (x: number, y: number): [number, number] => [(x - view.x) * view.k + W / 2, (y - view.y) * view.k + H / 2];
const worldTransform = () => {
  const k = view.k * dpr;
  ctx.setTransform(k, 0, 0, k, (W / 2 - view.x * view.k) * dpr, (H / 2 - view.y * view.k) * dpr);
};

/** From a painting's own pixels to the world: its frame, then the inverse of its fit. */
function intoFrame(f: Frame) {
  ctx.transform(1 / f.k, 0, 0, 1 / f.k, f.x0, f.y0);
  if (opts.fit === 'on' && f.fit) {
    const [a, b, c, d, e, g] = f.fit as [number, number, number, number, number, number];
    const det = a * d - b * c;
    ctx.transform(d / det, -b / det, -c / det, a / det, (c * g - d * e) / det, (b * e - a * g) / det);
  }
}

const CHUNKS = new Map<string, HTMLImageElement>();
function chunk(region: string, id: string, l: number, c: number, r: number): HTMLImageElement | null {
  const key = `${region}/${id}/L${l}/${c}-${r}`;
  let img = CHUNKS.get(key);
  if (!img) {
    if (CHUNKS.size > 400) CHUNKS.delete(CHUNKS.keys().next().value!);
    img = new Image();
    img.onload = () => redraw();
    img.src = `./map-tiles/${region}/chunks/${id}/L${l}/${c}-${r}.webp`;
    CHUNKS.set(key, img);
  }
  return img.complete && img.naturalWidth ? img : null;
}

/** A tile's pyramid: the level the zoom needs, only the chunks on screen, over its smallest level. */
function drawPyramid(region: string, p: ChunkPyramid, f: Frame) {
  ctx.save();
  intoFrame(f);
  ctx.scale(1 / p.scale, 1 / p.scale);
  const m = ctx.getTransform();
  const s = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
  const top = p.levels.length - 1;
  const want = Math.max(0, Math.min(top, Math.floor(Math.log2(1 / s))));
  const inv = m.inverse();
  const corners = [
    [0, 0],
    [canvas.width, 0],
    [0, canvas.height],
    [canvas.width, canvas.height],
  ].map(([x, y]) => inv.transformPoint({ x, y }));
  const xs = corners.map((q) => q.x);
  const ys = corners.map((q) => q.y);
  for (const l of want === top ? [top] : [top, want]) {
    const lv = p.levels[l]!;
    const span = p.chunk * 2 ** l;
    const c0 = Math.max(0, Math.floor(Math.min(...xs) / span));
    const c1 = Math.min(lv.cols - 1, Math.floor(Math.max(...xs) / span));
    const r0 = Math.max(0, Math.floor(Math.min(...ys) / span));
    const r1 = Math.min(lv.rows - 1, Math.floor(Math.max(...ys) / span));
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) {
        const img = chunk(region, p.id, l, c, r);
        if (!img) continue;
        // A hair larger than the chunk, so neighbours meet without a seam.
        const z = 2 ** l;
        ctx.drawImage(img, c * span, r * span, img.naturalWidth * z + z * 0.6, img.naturalHeight * z + z * 0.6);
      }
  }
  ctx.restore();
}

function label(text: string, x: number, y: number, font: string, fill: string, align: CanvasTextAlign = 'left') {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(4,5,7,0.8)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function draw() {
  const t0 = performance.now();
  const k = view.k;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#040507';
  ctx.fillRect(0, 0, W, H);
  worldTransform();
  ctx.fillStyle = '#101317';
  ctx.fill(land, 'evenodd');

  for (const r of REGIONS) {
    if (!r.ok || !r.guide) {
      // A region with no painting yet: with the fog on, the neighbour's painted land shows instead.
      if (opts.fog === 'off') {
        ctx.fillStyle = '#28301f';
        ctx.fill(r.outline, 'evenodd');
      }
      continue;
    }
    const g = r.guide;
    const gw = g.W / g.k;
    const gh = g.H / g.k;
    ctx.save();
    // The region and the sea, inside its frame: the sea once, the land beyond twice, the region three times.
    const frame = new Path2D();
    frame.rect(g.x0, g.y0, gw, gh);
    const keep = new Path2D(frame);
    keep.addPath(continent);
    keep.addPath(r.outline);
    ctx.clip(frame);
    // With the fog on, the land painted round the region stays too, faint under the dark (Jan's
    // mockups); with it off, only the region and its sea.
    if (opts.fog === 'off') ctx.clip(keep, 'evenodd');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.save();
    intoFrame(g);
    ctx.drawImage(r.img, 0, 0);
    ctx.restore();
    // The detail tiles at every zoom, so the land is the same picture near and far.
    // With ink on, only where you have seen: they draw on a layer of their own, which the seen
    // field then fades out, so the detail softens into the plain painting where your sight ended.
    if (opts.tiles === 'on') {
      if (tileCanvas.width !== canvas.width || tileCanvas.height !== canvas.height) {
        tileCanvas.width = canvas.width;
        tileCanvas.height = canvas.height;
      }
      tileCtx.setTransform(1, 0, 0, 1, 0, 0);
      tileCtx.clearRect(0, 0, tileCanvas.width, tileCanvas.height);
      const m = main.getTransform();
      tileCtx.setTransform(m);
      tileCtx.imageSmoothingEnabled = true;
      tileCtx.imageSmoothingQuality = 'high';
      ctx = tileCtx;
      for (const t of r.tiles) {
        if (t.pyramid && opts.upscaled === 'on') drawPyramid(r.id, t.pyramid, t);
        else if (t.canvas) {
          ctx.save();
          intoFrame(t);
          ctx.drawImage(t.canvas, 0, 0);
          ctx.restore();
        }
      }
      ctx = main;
      if (opts.ink === 'on') {
        tileCtx.setTransform(m);
        tileCtx.globalCompositeOperation = 'destination-in';
        tileCtx.drawImage(seenImg, fx0, fy0, fw * FIELD_RES, fh * FIELD_RES);
        tileCtx.globalCompositeOperation = 'source-over';
      }
      main.setTransform(1, 0, 0, 1, 0, 0);
      main.drawImage(tileCanvas, 0, 0);
      main.setTransform(m);
    }
    // The painted sea fades into the void at the frame's edges.
    const fade = Math.min(gw, gh) * 0.06;
    for (const [ax, ay, bx, by, x, y, w, h] of [
      [g.x0, 0, g.x0 + fade, 0, g.x0, g.y0, fade, gh],
      [g.x0 + gw, 0, g.x0 + gw - fade, 0, g.x0 + gw - fade, g.y0, fade, gh],
      [0, g.y0, 0, g.y0 + fade, g.x0, g.y0, gw, fade],
      [0, g.y0 + gh, 0, g.y0 + gh - fade, g.x0, g.y0 + gh - fade, gw, fade],
    ] as const) {
      const grad = ctx.createLinearGradient(ax, ay, bx, by);
      grad.addColorStop(0, '#040507');
      grad.addColorStop(1, 'rgba(4,5,7,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
  }

  drawFog(opts.drift === 'on' ? performance.now() / 1000 : 0);

  if (opts.labels === 'on') {
    // Your region's edge, dotted gilt; the neighbouring regions' edges and names faint through the
    // dark, so you see where the next lands lie without seeing into them (Jan's note).
    worldTransform();
    ctx.setLineDash([2 / k, 5 / k]);
    for (const n of NEIGHBOURS) {
      ctx.strokeStyle = n.id === 'qm-bianhuang' ? 'rgba(214,171,76,0.5)' : 'rgba(214,171,76,0.22)';
      ctx.lineWidth = (n.id === 'qm-bianhuang' ? 1.3 : 1) / k;
      ctx.stroke(n.outline);
    }
    ctx.setLineDash([]);
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const n of NEIGHBOURS) {
      if (n.id === 'qm-bianhuang') continue;
      const [sx, sy] = at(n.cx, n.cy);
      if (sx < -200 || sy < -50 || sx > W + 200 || sy > H + 50) continue;
      ctx.globalAlpha = 0.5;
      label(n.name, sx, sy, "italic 500 18px 'Cormorant Garamond', Georgia, serif", 'rgba(233,229,218,0.8)', 'center');
      ctx.font = "15px 'Ma Shan Zheng', KaiTi, serif";
      ctx.fillStyle = 'rgba(214,171,76,0.8)';
      ctx.fillText(n.hanzi, sx, sy + 19);
      ctx.globalAlpha = 1;
    }
    for (const n of NEAR_SEAS) {
      const [sx, sy] = at(n.cx, n.cy);
      if (sx < -200 || sy < -50 || sx > W + 200 || sy > H + 50) continue;
      ctx.globalAlpha = 0.55;
      label(n.name, sx, sy, "italic 500 18px 'Cormorant Garamond', Georgia, serif", 'rgba(150,200,215,0.85)', 'center');
      ctx.font = "15px 'Ma Shan Zheng', KaiTi, serif";
      ctx.fillStyle = 'rgba(127,199,217,0.75)';
      ctx.fillText(n.hanzi, sx, sy + 19);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // The depth rings toward the wilds' hearts, dashed, as the game's map draws them.
    ctx.save();
    ctx.clip(regionOutline, 'evenodd');
    ctx.lineCap = 'round';
    for (const { level, segs } of depthLines(map)) {
      const i = Math.min(6, level - 1);
      const p = new Path2D();
      for (const [a, b] of segs) {
        p.moveTo(a[0], a[1]);
        p.lineTo(b[0], b[1]);
      }
      ctx.setLineDash([3 / k, (3 + Math.min(i, 3)) / k]);
      ctx.strokeStyle = `rgba(208,122,150,${0.22 + i * 0.08})`;
      ctx.lineWidth = (0.8 + i * 0.2) / k;
      ctx.stroke(p);
    }
    ctx.setLineDash([]);
    ctx.restore();
    // Roads.
    ctx.lineCap = 'round';
    const roads: Path2D[] = map.roads.map((rd) => {
      const p = new Path2D();
      rd.pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
      return p;
    });
    // The Medicine Ridges' draft towns and roads only with the fog off: in this save it is unknown.
    for (const [a, b] of opts.fog === 'off' ? mrDraft.roads : []) {
      const p = mrSpots.get(a) ?? map.places.find((q) => q.id === a);
      const q = mrSpots.get(b) ?? map.places.find((q2) => q2.id === b);
      if (!p || !q) continue;
      const path = new Path2D();
      path.moveTo(p.x, p.y);
      path.lineTo(q.x, q.y);
      roads.push(path);
    }
    for (const p of roads) {
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 3.2 / k;
      ctx.stroke(p);
      ctx.strokeStyle = 'rgba(194,174,140,0.75)';
      ctx.lineWidth = 1.4 / k;
      ctx.stroke(p);
    }
    // Names: kingdoms, then places as seals.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const a of map.areas) {
      if (a.kind === 'tract') continue;
      const ring = a.outline[0]![0]!;
      let cx = 0;
      let cy = 0;
      for (const [x, y] of ring) {
        cx += x;
        cy += y;
      }
      const [sx, sy] = at(cx / ring.length, cy / ring.length);
      label(a.name, sx, sy, "600 20px 'Cormorant Garamond', Georgia, serif", 'rgba(233,229,218,0.92)', 'center');
      ctx.font = "16px 'Ma Shan Zheng', KaiTi, serif";
      ctx.fillStyle = 'rgba(214,171,76,0.85)';
      ctx.fillText(a.hanzi, sx, sy + 20);
    }
    for (const q of map.places) {
      const big = q.kind === 'atlas' || q.sub === 'town';
      if (!big && k < 0.03) continue;
      const [x, y] = at(q.x, q.y);
      if (x < -40 || y < -40 || x > W + 40 || y > H + 40) continue;
      const s = big ? 17 : 13;
      ctx.fillStyle = 'rgba(8,9,12,0.92)';
      ctx.strokeStyle = big ? 'rgba(214,171,76,0.8)' : 'rgba(233,229,218,0.6)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.roundRect(x - s / 2, y - s / 2, s, s, 3);
      ctx.fill();
      ctx.stroke();
      ctx.font = `${Math.round(s * 0.74)}px 'Ma Shan Zheng', KaiTi, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = big ? '#d6ab4c' : '#e9e5da';
      ctx.fillText(q.seal, x, y + 1);
      ctx.textBaseline = 'alphabetic';
      if (big || k > 0.06)
        label(q.name, x + 11, y + 4, `${big ? '500 12.5px' : '11.5px'} Inter, sans-serif`, 'rgba(233,229,218,0.88)');
    }
    for (const q of opts.fog === 'off' ? mrSpots.values() : []) {
      const [x, y] = at(q.x, q.y);
      if (x < -40 || y < -40 || x > W + 40 || y > H + 40) continue;
      ctx.beginPath();
      ctx.arc(x, y, q.big ? 4.5 : 3, 0, 7);
      ctx.fillStyle = q.big ? '#d6ab4c' : '#e9e5da';
      ctx.fill();
      label(q.name, x + 9, y + 4, `${q.big ? '500 12.5px' : '11.5px'} Inter, sans-serif`, 'rgba(233,229,218,0.88)');
    }
  }
  // Your course, then you and how far you see from where you stand (by its terrain).
  if (opts.labels === 'on') {
    worldTransform();
    const cp = new Path2D();
    [you, ...course].forEach(([x, y], i) => (i ? cp.lineTo(x, y) : cp.moveTo(x, y)));
    ctx.setLineDash([2 / k, 6 / k]);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(214,171,76,0.95)';
    ctx.lineWidth = 2.2 / k;
    ctx.stroke(cp);
    ctx.setLineDash([]);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const [ex, ey] = at(...course.at(-1)!);
    ctx.beginPath();
    ctx.arc(ex, ey, 6, 0, 7);
    ctx.strokeStyle = '#d6ab4c';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const [x, y] = at(you[0], you[1]);
    const r = sightHere * k;
    if (r > 6) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 7);
      ctx.setLineDash([1, 5]);
      ctx.strokeStyle = 'rgba(127,199,217,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.beginPath();
    ctx.arc(x, y, 5.5, 0, 7);
    ctx.fillStyle = '#d6ab4c';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 7);
    ctx.strokeStyle = 'rgba(214,171,76,0.6)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  readout.textContent = `${(performance.now() - t0).toFixed(1)} ms a frame · ${(k * 1000).toFixed(1)} px per 1,000 li`;
}

// ---------------------------------------------------------------- the page

/** The drift: a frame loop, only while it is on. */
function driftLoop() {
  if (opts.drift !== 'on') return;
  draw();
  requestAnimationFrame(driftLoop);
}
function redraw() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    draw();
  });
}

function resize() {
  dpr = window.devicePixelRatio || 1;
  const r = canvas.getBoundingClientRect();
  W = r.width;
  H = r.height;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  redraw();
}
new ResizeObserver(resize).observe(canvas);

/** The closest zoom: the upscaled tiles are sharp to about 0.12 px a li. */
const MAX_K = 0.16;
/** The farthest zoom (Jan's call in A5): what you have charted, with a little room round it. */
const ROOM = 1.15;
const minK = () =>
  opts.limit === 'charted'
    ? Math.min(W / ((charted[2] - charted[0]) * ROOM), H / ((charted[3] - charted[1]) * ROOM))
    : 0.004;
const clampK = (k: number) => Math.max(minK(), Math.min(MAX_K, k));
let drag: { x: number; y: number } | null = null;
canvas.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  view.x -= (e.clientX - drag.x) / view.k;
  view.y -= (e.clientY - drag.y) / view.k;
  drag = { x: e.clientX, y: e.clientY };
  redraw();
});
canvas.addEventListener('pointerup', () => (drag = null));
canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;
    const bx = (sx - W / 2) / view.k + view.x;
    const by = (sy - H / 2) / view.k + view.y;
    view.k = clampK(view.k * Math.exp(-e.deltaY * 0.0015));
    view.x = bx - (sx - W / 2) / view.k;
    view.y = by - (sy - H / 2) / view.k;
    redraw();
  },
  { passive: false },
);

const zooms: Record<string, () => void> = {
  charted: () =>
    Object.assign(view, { x: (charted[0] + charted[2]) / 2, y: (charted[1] + charted[3]) / 2, k: minK() }),
  region: () =>
    Object.assign(view, {
      x: (bx0 + bx1) / 2,
      y: (by0 + by1) / 2,
      k: Math.min(W / (bx1 - bx0), H / (by1 - by0)) * 0.92,
    }),
  both: () => Object.assign(view, { x: 191210, y: 199625, k: Math.min(W / 90760, H / 119370) * 0.95 }),
  fort: () => Object.assign(view, { x: fort.x, y: fort.y, k: 0.05 }),
  // The middle of the first painted tile (1-1): the forest and the lake north-east of Pacified Fort.
  tile: () => Object.assign(view, { x: 196800, y: 205000, k: 0.035 }),
  tileClose: () => Object.assign(view, { x: 196800, y: 205000, k: 0.12 }),
};

document.querySelectorAll<HTMLButtonElement>('[data-k]').forEach((b) => {
  b.onclick = () => {
    const key = b.dataset.k!;
    const val = b.dataset.v!;
    if (key === 'zoom') {
      zooms[val]!();
      view.k = clampK(view.k);
    }
    else {
      (opts as Record<string, string>)[key] = val;
      if (key === 'drift' && val === 'on') requestAnimationFrame(driftLoop);
      if (key === 'limit') view.k = clampK(view.k);
      document.querySelectorAll<HTMLButtonElement>(`[data-k="${key}"]`).forEach((x) => x.classList.toggle('on', x === b));
    }
    redraw();
  };
});

document.fonts.ready.then(redraw);
resize();
zooms.charted!();
redraw();
