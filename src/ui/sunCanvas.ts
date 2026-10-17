// The hour on the seat (design § Cultivation, The hour on the figure): a canvas behind the figure,
// over the whole seat panel, with the sun's light on it. A faint wash on the glass from where the
// sun stands (warm from the horizon at dawn, pale from above at noon, an orange band along the floor
// at twilight, the yin blue low at night); a patch of lit floor round the seat with the figure's
// shadow cut out of it, since on black glass a shadow has nothing else to darken; and at night the
// dantian's own light on the floor, brighter as the bar fills. The sun moves with the clock, not on
// its own, so reduced motion changes nothing here. `docs/mockups/abode-hour-study.html` is the
// reference, and its numbers are kept: the mock's seat is 267 by 230 figure units round the figure.
// Behind the figure, the sun's hand (A3, Jan's call): a faint gilt line from the dantian toward
// where the sun stands, round the day like a clock's, dimmer below the floor at night.
import {
  shadowOf,
  SUN_SHADOW_STRENGTH,
  SUN_SIDE,
  SUN_WASH_STRENGTH,
  sunAt,
  type Sun,
} from '../core/sun.ts';
import { hashSeed, mulberry32 } from '../core/rng.ts';
import { parseHex } from './colors.ts';
import { FIGURE_BOX, FIGURE_HEAD, FIGURE_PATH, type SunLight } from './qiCanvas.ts';
import { sunDay } from './seat.ts';
import { canvasDensity, rectIn } from './stage.ts';

/** The study's seat, in figure units: the wash and the floor are sized from it. */
const SEAT_W = 267;
const SEAT_H = 230;
/** Where the figure sits on its floor, in figure units. */
const BASE_Y = 42;
/** How much the night dims the painted cave, and how dark the shadow lies on its floor (A3). */
const NIGHT_DIM = 0.22;
const SHADOW_ON_PAINT = 0.4;
/**
 * The night's stars in the cave mouth's sky, in the painting's own pixels (1536 by 1024, centred on
 * the figure): an ellipse of open sky above the peaks, a seeded scatter, still, brightening as the
 * light goes (Jan's call after A3).
 */
const PAINTING = { w: 1536, h: 1024 } as const;
const STAR_SKY = { cx: 768, cy: 130, rx: 470, ry: 190, floor: 290 } as const;
const STAR_COUNT = 90;
const STARS = (() => {
  const rng = mulberry32(hashSeed('cultivate-cave-stars'));
  const out: { x: number; y: number; r: number; warm: boolean }[] = [];
  while (out.length < STAR_COUNT) {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng());
    const x = STAR_SKY.cx + Math.cos(a) * d * STAR_SKY.rx;
    const y = STAR_SKY.cy + Math.sin(a) * d * STAR_SKY.ry;
    if (y < 8 || y > STAR_SKY.floor) continue;
    const big = rng();
    out.push({ x, y, r: big > 0.93 ? 1.9 : big > 0.7 ? 1.2 : 0.7, warm: rng() > 0.85 });
  }
  return out;
})();
/** How far out the sun's glow stands, in seat widths and heights from the figure, and its size. */
const SUN_REACH = { x: 1.75, y: 1.55, r: 1.9, strength: 1.35 } as const;
/** The sun's hand: from the dantian, this long, in figure units, and this bright at its tip. */
const HAND_FROM = { x: 0, y: 9 } as const;
const HAND_LENGTH = 165;
const HAND_ALPHA = 0.34;
const HAND_NIGHT = 0.35;

/** The colors the sun reads from the page's tokens. */
export interface SunPalette {
  warm: string;
  pale: string;
  dusk: string;
  yin: string;
  crack: string;
  gilt: string;
}

export function readSunPalette(): SunPalette {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, d: string) => css.getPropertyValue(name).trim() || d;
  return {
    warm: v('--sun-warm', '#e8a874'),
    pale: v('--sun-pale', '#e9e5da'),
    dusk: v('--sun-dusk', '#e07a4a'),
    yin: v('--qi-yin', '#7d84d6'),
    crack: v('--crack', '#7fc7d9'),
    gilt: v('--gilt', '#d9b46a'),
  };
}

function mix(a: string, b: string, k: number): string {
  const A = parseHex(a);
  const B = parseHex(b);
  if (!A || !B) return k < 0.5 ? a : b;
  return `rgb(${A.map((v, i) => Math.round(v + (B[i]! - v) * k)).join(',')})`;
}

/** The sun's light: warm at the horizon, pale high up, the yin blue once it has gone. */
export function sunColor(s: Sun, p: SunPalette): string {
  if (s.light <= 0) return p.yin;
  return mix(p.warm, p.pale, Math.min(1, s.elevation * 1.4));
}

const CLEAR = 'rgba(0,0,0,0)';

export class SunCanvas {
  private ctx: CanvasRenderingContext2D;
  private floor = document.createElement('canvas');
  private fctx = this.floor.getContext('2d')!;
  private figure = new Path2D(FIGURE_PATH);
  private palette = readSunPalette();
  private raf = 0;
  private running = false;
  /** What the last frame drew, so a still sun costs nothing. */
  private drawn = '';
  /** The qi bar's fill, for the dantian's light at night. */
  fill = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    /** The figure's box, which the sun's geometry is laid out from. */
    private figureBox: () => HTMLElement | null,
  ) {
    this.ctx = canvas.getContext('2d')!;
  }

  /** The sun now and its color, for the rim the qi canvas lays on the figure. */
  light(): SunLight {
    const sun = sunAt(sunDay());
    return { sun, color: sunColor(sun, this.palette) };
  }

  refreshPalette(): void {
    this.palette = readSunPalette();
    this.drawn = '';
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const step = () => {
      if (!this.running) return;
      this.draw();
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  draw(): void {
    const box = this.figureBox();
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!box || !w || !h) return;
    const dpr = canvasDensity();
    const panel = rectIn(this.canvas);
    const fig = rectIn(box);
    // Figure units to the panel's pixels: k pixels a unit, the figure's origin at (ox, oy).
    const k = fig.width / FIGURE_BOX.w;
    const ox = fig.left - panel.left - FIGURE_BOX.x * k;
    const oy = fig.top - panel.top - FIGURE_BOX.y * k;
    const s = sunAt(sunDay());
    const fill = Math.min(1.1, Math.max(0, this.fill));
    const key = [
      s.hour.toFixed(3),
      w,
      h,
      ox.toFixed(1),
      oy.toFixed(1),
      k.toFixed(3),
      fill.toFixed(2),
    ];
    if (key.join() === this.drawn) return;
    this.drawn = key.join();

    const cw = Math.round(w * dpr);
    const ch = Math.round(h * dpr);
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const W = SEAT_W * k;
    const H = SEAT_H * k;
    this.drawWash(s, ox, oy, W, H, w, h);
    this.drawStars(s, ox, h);
    this.drawHand(s, ox, oy, k);
    this.drawPool(s, ox, oy + (BASE_Y + 1) * k, k, fill);
    this.drawFloor(s, ox, oy + BASE_Y * k, k, W, w, h, dpr);
  }

  private glow(
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    color: string,
    alpha: number,
  ): void {
    if (alpha <= 0 || r <= 0) return;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, CLEAR);
    c.globalAlpha = Math.min(1, alpha);
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
  }

  /**
   * A band of light along the floor: rising from `top` to its brightest at `peak`, where the
   * study's seat ended, and fading out as far again below, so the meter under the figure stays clear.
   */
  private band(top: number, peak: number, color: string, alpha: number, w: number, h: number) {
    if (alpha <= 0) return;
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, top, 0, peak + (peak - top));
    g.addColorStop(0, CLEAR);
    g.addColorStop(0.5, color);
    g.addColorStop(1, CLEAR);
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  /**
   * The wash on the glass, from where the sun stands; the yin blue low along the floor at night,
   * and the painted cave dimmed as the light goes (A3: the hour is a still wash over the scene).
   */
  private drawWash(s: Sun, ox: number, oy: number, W: number, H: number, w: number, h: number) {
    const strength = SUN_WASH_STRENGTH;
    if (s.light < 1) {
      this.ctx.fillStyle = `rgba(2, 3, 9, ${NIGHT_DIM * (1 - s.light)})`;
      this.ctx.fillRect(0, 0, w, h);
    }
    if (s.light > 0) {
      // Far out past the ring, so it reads as a distant sun, not a lamp on the dial.
      const sx = ox + s.dx * W * SUN_REACH.x;
      const sy = oy - s.dy * H * SUN_REACH.y + H * 0.3;
      const a =
        SUN_REACH.strength *
        strength *
        (0.12 + 0.12 * s.elevation) *
        (1 - 0.3 * s.twilight) *
        s.light;
      this.glow(this.ctx, sx, sy, Math.max(W, H) * SUN_REACH.r, sunColor(s, this.palette), a);
    }
    this.band(oy, oy + H / 2, this.palette.dusk, strength * 0.16 * s.twilight, w, h);
    this.band(oy + H * 0.05, oy + H / 2, this.palette.yin, strength * 0.2 * (1 - s.light), w, h);
  }

  /** The stars in the cave mouth's sky, the painting's scale, gone by full day. */
  private drawStars(s: Sun, ox: number, h: number) {
    const dark = Math.min(1, (1 - s.light) * 0.85 + s.twilight * 0.25);
    if (dark <= 0) return;
    const ctx = this.ctx;
    const k = h / PAINTING.h;
    for (const st of STARS) {
      const x = ox + (st.x - PAINTING.w / 2) * k;
      const y = st.y * k;
      const color = st.warm ? '#f1dcb4' : '#dce8ff';
      if (st.r > 1.5) this.glow(ctx, x, y, st.r * 5 * k, color, 0.35 * dark);
      ctx.globalAlpha = Math.min(1, (0.55 + st.r * 0.25) * dark);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, st.r * k, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** The sun's hand, from the dantian toward the sun on its round, behind the figure. */
  private drawHand(s: Sun, ox: number, oy: number, k: number) {
    const ctx = this.ctx;
    const x0 = ox + HAND_FROM.x * k;
    const y0 = oy + HAND_FROM.y * k;
    const dx = Math.cos(s.phi) * SUN_SIDE;
    const dy = -Math.sin(s.phi);
    const L = HAND_LENGTH * k;
    const x1 = x0 + dx * L;
    const y1 = y0 + dy * L;
    const alpha = HAND_ALPHA * (s.altitude >= 0 ? 1 : HAND_NIGHT);
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, CLEAR);
    g.addColorStop(0.2, CLEAR);
    g.addColorStop(1, this.palette.gilt);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = g;
    ctx.lineWidth = Math.max(1, 0.5 * k);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    // A small diamond at the tip, hollow, turned along the hand.
    const r = 2 * k;
    ctx.globalAlpha = Math.min(1, alpha * 1.6);
    ctx.strokeStyle = this.palette.gilt;
    ctx.lineWidth = Math.max(1, 0.4 * k);
    ctx.translate(x1, y1);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(0, r * 0.75);
    ctx.lineTo(-r, 0);
    ctx.lineTo(0, -r * 0.75);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  /** At night the dantian's own light on the floor; by day the sun drowns it. */
  private drawPool(s: Sun, x: number, y: number, k: number, fill: number) {
    if (s.night <= 0) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.3);
    const r = ((40 + 40 * fill) / 2.2) * k;
    this.glow(ctx, 0, 0, r, this.palette.crack, s.night * (0.08 + 0.18 * fill));
    ctx.restore();
  }

  /**
   * The sundial: the lit floor drawn offscreen, the figure's shadow and the contact shadow under
   * the legs erased from it, and the rest laid on the seat.
   */
  private drawFloor(
    s: Sun,
    bx: number,
    by: number,
    k: number,
    W: number,
    w: number,
    h: number,
    dpr: number,
  ) {
    const shadow = shadowOf(s);
    if (!shadow) return;
    const strength = SUN_SHADOW_STRENGTH;
    const floor = this.floor;
    const f = this.fctx;
    if (floor.width !== this.canvas.width || floor.height !== this.canvas.height) {
      floor.width = this.canvas.width;
      floor.height = this.canvas.height;
    }
    f.setTransform(dpr, 0, 0, dpr, 0, 0);
    f.clearRect(0, 0, w, h);

    // The lit floor: an ellipse of sunlight, pulled toward the sun, stronger the higher the sun.
    f.save();
    f.translate(bx + s.dx * W * 0.08, by + 3 * k);
    f.scale(1, 0.36);
    const lit = strength * (0.1 + 0.16 * Math.min(1, s.elevation * 1.6)) * s.light;
    this.glow(f, 0, 0, W * 0.62, sunColor(s, this.palette), lit);
    f.restore();

    // The shadow: the figure projected along the floor away from the sun, erased from the light.
    const L = shadow.length;
    f.save();
    f.globalCompositeOperation = 'destination-out';
    f.translate(bx, by);
    f.transform(k, 0, -L * shadow.dirX * k, -L * shadow.dirY * 0.5 * k, 0, 0);
    f.translate(0, -BASE_Y);
    f.fillStyle = 'rgba(0,0,0,0.9)';
    // Canvas filters ignore the transform, so the blur is in device pixels.
    f.filter = `blur(${((1 + L * 1.2) * k * dpr) / 2.1}px)`;
    f.fill(this.figure, 'evenodd');
    f.beginPath();
    f.arc(FIGURE_HEAD.x, FIGURE_HEAD.y, FIGURE_HEAD.r, 0, Math.PI * 2);
    f.fill();
    f.restore();

    // The contact shadow under the legs, at any hour the sun is up.
    f.save();
    f.globalCompositeOperation = 'destination-out';
    f.translate(bx, by + k);
    f.scale(1, 0.28);
    const r = (50 / 2.2) * k;
    const c = f.createRadialGradient(0, 0, 0, 0, 0, r);
    c.addColorStop(0, 'rgba(0,0,0,0.9)');
    c.addColorStop(1, CLEAR);
    f.fillStyle = c;
    f.beginPath();
    f.arc(0, 0, r, 0, Math.PI * 2);
    f.fill();
    f.restore();

    this.ctx.drawImage(floor, 0, 0, w, h);

    // On a painted floor the shadow also darkens the paint, so it reads with or without the patch.
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(bx, by);
    ctx.transform(k, 0, -L * shadow.dirX * k, -L * shadow.dirY * 0.5 * k, 0, 0);
    ctx.translate(0, -BASE_Y);
    ctx.globalAlpha = SHADOW_ON_PAINT * strength * s.light;
    ctx.fillStyle = '#000';
    ctx.filter = `blur(${((1 + L * 1.2) * k * dpr) / 2.1}px)`;
    ctx.fill(this.figure, 'evenodd');
    ctx.beginPath();
    ctx.arc(FIGURE_HEAD.x, FIGURE_HEAD.y, FIGURE_HEAD.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
