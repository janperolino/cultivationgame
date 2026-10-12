// The hour on the seat (design § Cultivation, The hour on the figure): a canvas behind the figure,
// over the whole seat panel, with the sun's light on it. A faint wash on the glass from where the
// sun stands (warm from the horizon at dawn, pale from above at noon, an orange band along the floor
// at twilight, the yin blue low at night); a patch of lit floor round the seat with the figure's
// shadow cut out of it, since on black glass a shadow has nothing else to darken; and at night the
// dantian's own light on the floor, brighter as the bar fills. The sun moves with the clock, not on
// its own, so reduced motion changes nothing here. `docs/mockups/abode-hour-study.html` is the
// reference, and its numbers are kept: the mock's seat is 267 by 230 figure units round the figure.
import { shadowOf, SUN_SHADOW_STRENGTH, SUN_WASH_STRENGTH, sunAt, type Sun } from '../core/sun.ts';
import { parseHex } from './colors.ts';
import { FIGURE_BOX, FIGURE_HEAD, FIGURE_PATH, type SunLight } from './qiCanvas.ts';
import { sunDay } from './seat.ts';

/** The study's seat, in figure units: the wash and the floor are sized from it. */
const SEAT_W = 267;
const SEAT_H = 230;
/** Where the figure sits on its floor, in figure units. */
const BASE_Y = 42;

/** The colors the sun reads from the page's tokens. */
export interface SunPalette {
  warm: string;
  pale: string;
  dusk: string;
  yin: string;
  crack: string;
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
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const panel = this.canvas.getBoundingClientRect();
    const fig = box.getBoundingClientRect();
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

  /** The wash on the glass, from where the sun stands; the yin blue low along the floor at night. */
  private drawWash(s: Sun, ox: number, oy: number, W: number, H: number, w: number, h: number) {
    const strength = SUN_WASH_STRENGTH;
    if (s.light > 0) {
      const sx = ox + s.dx * W * 0.75;
      const sy = oy - s.dy * H * 0.95 + H * 0.2;
      const a = strength * (0.12 + 0.12 * s.elevation) * (1 - 0.3 * s.twilight) * s.light;
      this.glow(this.ctx, sx, sy, Math.max(W, H) * 1.1, sunColor(s, this.palette), a);
    }
    this.band(oy, oy + H / 2, this.palette.dusk, strength * 0.16 * s.twilight, w, h);
    this.band(oy + H * 0.05, oy + H / 2, this.palette.yin, strength * 0.2 * (1 - s.light), w, h);
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
  }
}
