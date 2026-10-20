// The painted land under the travel map (A5, A5.1; design § The travel map, The look; the pipeline
// in docs/art-pipeline.md § The travel map). Each painted region is its painting, laid on the world
// through its fit, and its detail tiles over it at every zoom, each drawn from the level of its chunk
// pyramid the zoom needs and only the chunks on screen, so the land is one picture near and far.
// The frames come from art/map/<region>/ at build time; the images from public/map/<region>/, a
// chunk at a time. A region is painted once its painting has been fitted (tools/map-fit.ts).

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

interface Pyramid {
  chunk: number;
  /** Chunk pixels a pixel of the painting the fit was made for. */
  scale: number;
  levels: { cols: number; rows: number; w: number; h: number }[];
}

interface TileFrame extends Frame {
  id: string;
  pyramid?: Pyramid;
}

interface RegionArt {
  id: string;
  guide: Frame;
  tiles: TileFrame[];
  painting: HTMLImageElement | null;
}

const GUIDES = import.meta.glob<Frame & { region: string }>('../../../art/map/*/guide.json', {
  eager: true,
  import: 'default',
});
const TILES = import.meta.glob<{ region: string; tiles: TileFrame[] }>(
  '../../../art/map/*/tiles.json',
  { eager: true, import: 'default' },
);

const ART: RegionArt[] = Object.values(GUIDES)
  .filter((g) => g.fit)
  .map((g) => ({
    id: g.region,
    guide: g,
    tiles: (Object.values(TILES).find((t) => t.region === g.region)?.tiles ?? []).filter(
      (t) => t.pyramid,
    ),
    painting: null,
  }));

const url = (path: string) => `${import.meta.env.BASE_URL}map/${path}`;

/** Called when a picture arrives, so the map draws again. */
let onLoad: () => void = () => {};
export function onArtLoad(cb: () => void): () => void {
  onLoad = cb;
  return () => {
    if (onLoad === cb) onLoad = () => {};
  };
}

/** Something the map draws has arrived (a painting, a chunk, the cloud sheet): draw again. */
export function artArrived(): void {
  onLoad();
}

/** How much the painted land is lifted under the fog: a gain on its colors (Jan's call in A5.1). */
export const LAND_GAIN = 1.5;

/**
 * Each picture lifted by LAND_GAIN once, as it arrives, rather than the whole canvas copied onto
 * itself every frame. Its colors scale and black stays black, as the old lift did; alpha is kept.
 */
export function lifted(
  img: CanvasImageSource & { width: number; height: number },
): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d')!;
  g.filter = `brightness(${LAND_GAIN})`;
  g.drawImage(img, 0, 0);
  return c;
}

/**
 * Pictures decoded and lifted, ready to draw. An image is drawn only once the browser has decoded
 * it off the main thread (`decode()`), so a chunk arriving mid-pan never stalls a frame.
 */
const READY = new WeakMap<HTMLImageElement, HTMLCanvasElement>();

function load(src: string): HTMLImageElement {
  const img = new Image();
  img.src = src;
  const ready = () => {
    READY.set(img, lifted(img));
    artArrived();
  };
  // A decode that fails still leaves a loaded image the canvas can draw; a broken one draws nothing.
  img.decode().then(ready, () => {
    if (img.complete && img.naturalWidth) ready();
  });
  return img;
}

function paintingOf(r: RegionArt): HTMLCanvasElement | null {
  r.painting ??= load(url(`${r.id}/painting.webp`));
  return READY.get(r.painting) ?? null;
}

/** Fetches every region's painting ahead of the Map, so its first visit shows painted land. */
export function prefetchPaintings(): void {
  for (const r of ART) paintingOf(r);
}

/** The chunks loaded, oldest first, held to a few hundred so a long session never grows. */
const CHUNKS = new Map<string, HTMLImageElement>();
const MAX_CHUNKS = 400;
function chunk(region: string, id: string, l: number, c: number, r: number) {
  const key = `${region}/chunks/${id}/L${l}/${c}-${r}.webp`;
  let img = CHUNKS.get(key);
  if (img) {
    CHUNKS.delete(key);
    CHUNKS.set(key, img);
  } else {
    if (CHUNKS.size >= MAX_CHUNKS) CHUNKS.delete(CHUNKS.keys().next().value!);
    img = load(url(key));
    CHUNKS.set(key, img);
  }
  return READY.get(img) ?? null;
}

/** From a painting's own pixels to the world: its frame, then the inverse of its fit. */
function intoFrame(ctx: CanvasRenderingContext2D, f: Frame) {
  ctx.transform(1 / f.k, 0, 0, 1 / f.k, f.x0, f.y0);
  if (f.fit) {
    const [a, b, c, d, e, g] = f.fit as [number, number, number, number, number, number];
    const det = a * d - b * c;
    ctx.transform(d / det, -b / det, -c / det, a / det, (c * g - d * e) / det, (b * e - a * g) / det);
  }
}

/** A tile's pyramid: the level the zoom needs, only the chunks on screen, over its smallest level. */
function drawPyramid(ctx: CanvasRenderingContext2D, region: string, t: TileFrame) {
  const p = t.pyramid!;
  ctx.save();
  intoFrame(ctx, t);
  ctx.scale(1 / p.scale, 1 / p.scale);
  const m = ctx.getTransform();
  const s = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
  const top = p.levels.length - 1;
  const want = Math.max(0, Math.min(top, Math.floor(Math.log2(1 / s))));
  const inv = m.inverse();
  const corners = [
    [0, 0],
    [ctx.canvas.width, 0],
    [0, ctx.canvas.height],
    [ctx.canvas.width, ctx.canvas.height],
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
        const img = chunk(region, t.id, l, c, r);
        if (!img) continue;
        // A hair larger than the chunk, so neighbours meet without a seam.
        const z = 2 ** l;
        ctx.drawImage(
          img,
          c * span,
          r * span,
          img.width * z + z * 0.6,
          img.height * z + z * 0.6,
        );
      }
  }
  ctx.restore();
}

/**
 * Draws every painted region that falls on screen, in world space (the context's transform set to
 * the view): the painting through its fit, its tiles over it, and the painted sea fading into the
 * void at the frame's edges. The land round the region is painted too and stays, faint under the
 * fog's dark. Returns whether any painting was drawn.
 */
export function drawPainted(
  ctx: CanvasRenderingContext2D,
  view: readonly [number, number, number, number],
): boolean {
  let any = false;
  for (const r of ART) {
    const g = r.guide;
    const gw = g.W / g.k;
    const gh = g.H / g.k;
    if (g.x0 > view[2] || g.y0 > view[3] || g.x0 + gw < view[0] || g.y0 + gh < view[1]) continue;
    const img = paintingOf(r);
    if (!img) continue;
    any = true;
    ctx.save();
    ctx.beginPath();
    ctx.rect(g.x0, g.y0, gw, gh);
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.save();
    intoFrame(ctx, g);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
    for (const t of r.tiles) {
      const tw = t.W / t.k;
      const th = t.H / t.k;
      if (t.x0 > view[2] || t.y0 > view[3] || t.x0 + tw < view[0] || t.y0 + th < view[1]) continue;
      drawPyramid(ctx, r.id, t);
    }
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
  return any;
}
