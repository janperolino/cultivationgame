// The canvas over Cultivate's figure (design § Cultivation, Attended seclusion and Circulation on
// the figure): motes drift in from the edge of the cave at the real qi rate, tinted by the hour,
// enter at the crown and the palms, run the active method's circulation and settle in the dantian,
// which breathes with the figure. Without a method the qi drifts close and slides off; unsettled,
// the loop jitters and sparks leak; at a full bar it runs fast and the dantian overflows. Orbs float
// where the seat (core/attention.ts) says they are, and a caught one flies in as a bright spark.
// Under reduced motion the orbs pulse in place and the loop glows steadily. The loop stops while
// the tab is hidden, and particles are capped. During a breakthrough scene (ui/scene.ts) the
// circulation slows through the wind-up while the gates light round the first loop one by one,
// then races, and a bright spark runs the gates; under reduced motion the spark stays away and
// each gate lights in turn. A body or soul scene recolors the loop in its ladder's color. The
// break lands hard: a flash through the whole figure, a ring of light and a spray of sparks, with
// the ring left out under reduced motion. The sun (ui/sunCanvas.ts) puts a soft
// blurred rim on the figure's lit side, so the body agrees with its shadow. Drawing only: every
// rule lives in core.
import { DANTIAN, INHALE_SHARE, ORB_EDGE, type QiTint } from '../content/attention.ts';
import { ENTRY_POINTS, type Circulation } from '../content/circulation.ts';
import type { LadderId } from '../content/cultivation.ts';
import { SCENE_GATES_PER_LAP, SCENE_GATES } from '../content/scene.ts';
import {
  breathPhase,
  heatUnsettled,
  orbAlpha,
  orbPosition,
  type Attention,
  type Breath,
} from '../core/attention.ts';
import { GATE_TIMES, gateLap, gatesLit, sceneLaps, windingUp } from '../core/scene.ts';
import type { Sun } from '../core/sun.ts';
import { sceneTime, type ScenePlay } from './scene.ts';
import { canvasDensity } from './stage.ts';

/** The figure's box in its own units: x from −96, y from −92, 192 by 156. */
export const FIGURE_BOX = { x: -96, y: -92, w: 192, h: 156 } as const;

/**
 * The seated silhouette, head apart: shoulders, arms resting into the lap, and crossed legs. The
 * two small inner shapes are the gaps between arm and waist, cut out by the even-odd fill.
 */
export const FIGURE_PATH =
  'M0 -31 L-5 -31 C-7 -27 -13 -26 -19 -24 C-26 -21 -28 -14 -28 -6 C-28 2 -30 9 -33 15 ' +
  'C-37 20 -44 22 -49 26 C-54 30 -53 37 -46 39 C-32 43 -14 42 0 42 ' +
  'C14 42 32 43 46 39 C53 37 54 30 49 26 C44 22 37 20 33 15 C30 9 28 2 28 -6 ' +
  'C28 -14 26 -21 19 -24 C13 -26 7 -27 5 -31 Z ' +
  'M-20 -13 C-18 -5 -17 2 -14 8 C-18 6 -21 -3 -20 -13 Z ' +
  'M20 -13 C18 -5 17 2 14 8 C18 6 21 -3 20 -13 Z';
export const FIGURE_HEAD = { x: 0, y: -41, r: 10.5 } as const;

type Point = readonly [number, number];

/** The sun on the figure now, and the color of its light. */
export interface SunLight {
  sun: Sun;
  color: string;
}

export type FigureState = 'settled' | 'dormant' | 'unsettled' | 'full';

/** What the figure shows, refreshed with the game a few times a second. */
export interface FigureFrame {
  state: FigureState;
  /** The qi bar's fill, 0 to 1.5. */
  fill: number;
  /** Motes a second, from the real qi rate. */
  motes: number;
  circulation: Circulation;
  sparks: { count: number; glow: number };
  /** The tint of the hour now. */
  tint: QiTint;
  /** Heat over its limit, 0 to 1, for the loop's reddening. */
  heat: number;
  /** Catch reach for the pointer ring, in figure units. */
  reach: number;
  /** Seconds a breath takes: Long Breath slows it. */
  breath: number;
  reduced: boolean;
}

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  tint: QiTint;
}
interface Spark {
  loop: number;
  i: number;
  run: number;
  tint: QiTint;
  big: boolean;
  leak: boolean;
}
interface Flyer {
  x: number;
  y: number;
  tint: QiTint;
}
interface Pop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  color: string;
}
/** A ring of light opening from the dantian as a breakthrough lands. */
interface Wave {
  t: number;
  color: string;
  reach: number;
}

const MAX_MOTES = 70;
const MAX_SPARKS = 40;
const MAX_POPS = 60;
/** The break may spray more than the everyday cap, for a moment. */
const MAX_BREAK_POPS = 200;
/** The flash through the figure and the ring of light, in seconds. */
const FLASH_S = 0.9;
const WAVE_S = 1.1;
const SAMPLES = 22;

/** Smooth closed curve through the points (Catmull–Rom), as many samples a segment. */
function smooth(points: readonly Point[], n = SAMPLES): Point[] {
  const out: Point[] = [];
  const L = points.length;
  for (let i = 0; i < L; i++) {
    const p0 = points[(i - 1 + L) % L]!;
    const p1 = points[i]!;
    const p2 = points[(i + 1) % L]!;
    const p3 = points[(i + 2) % L]!;
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const at = (a: number, b: number, c: number, d: number) =>
        0.5 *
        (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([at(p0[0], p1[0], p2[0], p3[0]), at(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}

const loopsCache = new Map<string, Point[][]>();
function loopsOf(c: Circulation): Point[][] {
  let loops = loopsCache.get(c.id);
  if (!loops) {
    loops = c.loops.map((l) => smooth(l));
    loopsCache.set(c.id, loops);
  }
  return loops;
}

function nearestEntry(x: number, y: number): Point {
  let best = ENTRY_POINTS[0]!;
  let d = Infinity;
  for (const p of ENTRY_POINTS) {
    const q = (p[0] - x) ** 2 + (p[1] - y) ** 2;
    if (q < d) {
      d = q;
      best = p;
    }
  }
  return best;
}

/** The palette the canvas reads from the page's tokens, so the player's colors carry over. */
interface Palette {
  crack: string;
  warn: string;
  core: string;
  tints: Record<QiTint, string>;
  /** Each ladder's color in a scene: qi is the crack light, body and soul their hours' colors. */
  ladders: Record<LadderId, string>;
}

function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, d: string) => css.getPropertyValue(name).trim() || d;
  const crack = v('--crack', '#7fc7d9');
  return {
    crack,
    warn: v('--warn', '#e08a6a'),
    core: '#e2f4f8',
    tints: {
      water: v('--qi-water', crack),
      wood: v('--qi-wood', '#86d19a'),
      fire: v('--qi-fire', '#ee9670'),
      earth: v('--qi-earth', '#dcb359'),
      metal: v('--qi-metal', '#e4e7ee'),
      dawn: v('--dawn', '#ab9cf0'),
      yin: v('--qi-yin', '#7d84d6'),
    },
    ladders: {
      qi: crack,
      body: v('--hour-body', '#c98a5f'),
      soul: v('--hour-soul', '#a28fdc'),
    },
  };
}

export class QiCanvas {
  private ctx: CanvasRenderingContext2D;
  private frame: FigureFrame | null = null;
  private attention: () => Attention | null;
  private palette: Palette = readPalette();
  private sprites = new Map<string, HTMLCanvasElement>();
  private motes: Mote[] = [];
  private sparks: Spark[] = [];
  private flyers: Flyer[] = [];
  private pops: Pop[] = [];
  private waves: Wave[] = [];
  /** The flash through the figure as a breakthrough lands, 1 down to 0, and its color. */
  private flash = 0;
  private flashColor = '#ffffff';
  private moteDebt = 0;
  private pulse = 0;
  private raf = 0;
  private last = 0;
  private running = false;
  /** What of the scene has been drawn: its start, the gates lit and judged, and its outcome. */
  private seen = { started: 0, lit: 0, gates: '', outcome: 0 };
  /** The pointer, in figure units, while it is over the canvas. */
  pointer: Point | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    attention: () => Attention | null,
    /** The seat's clock this frame, run on smoothly between the game's ticks. */
    private clock: (a: Attention) => number,
    /** The breakthrough scene, while one plays or shows its outcome. */
    private scene: () => ScenePlay | null = () => null,
    /** The sun, for the rim on the figure's lit side. */
    private sun: () => SunLight | null = () => null,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.attention = attention;
  }

  setFrame(f: FigureFrame): void {
    this.frame = f;
    if (f.reduced) {
      this.motes = [];
      this.sparks = [];
    }
    if (!this.running) this.draw(0);
  }

  /** Re-reads the page's colors, after a settings change. */
  refreshPalette(): void {
    this.palette = readPalette();
    this.sprites.clear();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const step = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.draw(dt);
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** A breath drew orbs in: they fly to the figure, or scatter if the meridians are unsettled. */
  breath(b: Breath): void {
    for (const { orb, at } of b.caught) {
      // Drawn in while the meridians burn, an orb only scatters.
      if (b.wasted && heatUnsettled(b.attention)) {
        this.burst(at[0], at[1], this.tint(orb.tint), 10);
      } else if (this.frame?.reduced) {
        this.burst(at[0], at[1], this.tint(orb.tint), 6);
        this.pulse = Math.min(1, this.pulse + 0.5);
      } else {
        this.flyers.push({ x: at[0], y: at[1], tint: orb.tint });
      }
    }
    if (b.overheated) this.burst(DANTIAN[0], DANTIAN[1], this.palette.warn, 24);
  }

  private bodyPath: Path2D | null = null;

  /**
   * The silhouette and head as one clip path, by the non-zero rule: the head winds the same way as
   * the body, so where they overlap at the neck stays inside, and the waist gaps wind the other way,
   * so they stay out.
   */
  private body(): Path2D {
    if (!this.bodyPath) {
      const p = new Path2D(FIGURE_PATH);
      p.moveTo(FIGURE_HEAD.x + FIGURE_HEAD.r, FIGURE_HEAD.y);
      p.arc(FIGURE_HEAD.x, FIGURE_HEAD.y, FIGURE_HEAD.r, 0, Math.PI * 2, true);
      this.bodyPath = p;
    }
    return this.bodyPath;
  }

  private tint(t: QiTint): string {
    return this.palette.tints[t];
  }

  private sprite(color: string): HTMLCanvasElement {
    let s = this.sprites.get(color);
    if (!s) {
      s = document.createElement('canvas');
      s.width = s.height = 64;
      const g = s.getContext('2d')!;
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      this.sprites.set(color, s);
    }
    return s;
  }

  private glow(x: number, y: number, r: number, color: string, alpha: number): void {
    if (alpha <= 0 || r <= 0) return;
    this.ctx.globalAlpha = Math.min(1, alpha);
    this.ctx.drawImage(this.sprite(color), x - r, y - r, r * 2, r * 2);
  }

  private burst(x: number, y: number, color: string, n: number, speed = 50, cap = MAX_POPS): void {
    for (let k = 0; k < n && this.pops.length < cap; k++) {
      this.pops.push({
        x,
        y,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        t: 0,
        color,
      });
    }
  }

  /** The flash through the figure and the rings of light, while a breakthrough lands. */
  private drawBreak(dt: number): void {
    const ctx = this.ctx;
    if (this.flash > 0) {
      ctx.save();
      ctx.clip(this.body());
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55 * this.flash;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(FIGURE_BOX.x, FIGURE_BOX.y, FIGURE_BOX.w, FIGURE_BOX.h);
      ctx.restore();
      ctx.globalCompositeOperation = 'lighter';
      this.glow(DANTIAN[0], DANTIAN[1], 30 + 50 * this.flash, this.flashColor, 0.6 * this.flash);
      this.flash = Math.max(0, this.flash - dt / FLASH_S);
    }
    this.waves = this.waves.filter((w) => {
      w.t += dt;
      if (w.t < 0) return true;
      const p = Math.min(1, w.t / WAVE_S);
      const ease = 1 - (1 - p) ** 3;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.8 * (1 - p);
      ctx.strokeStyle = w.color;
      ctx.lineWidth = 3.5 * (1 - p) + 0.4;
      ctx.beginPath();
      ctx.arc(DANTIAN[0], DANTIAN[1], 6 + w.reach * ease, 0, Math.PI * 2);
      ctx.stroke();
      return p < 1;
    });
    ctx.globalAlpha = 1;
  }

  private toSpark(x: number, y: number, tint: QiTint, big: boolean): void {
    const f = this.frame!;
    const loops = loopsOf(f.circulation);
    let bl = 0;
    let bi = 0;
    let bd = Infinity;
    loops.forEach((l, li) =>
      l.forEach((q, qi) => {
        const d = (q[0] - x) ** 2 + (q[1] - y) ** 2;
        if (d < bd) {
          bd = d;
          bl = li;
          bi = qi;
        }
      }),
    );
    if (!big && this.sparks.length >= Math.min(MAX_SPARKS, f.sparks.count * 4)) {
      this.pulse = Math.min(1, this.pulse + 0.08);
      return;
    }
    const leak = f.state === 'unsettled' && Math.random() < 0.35;
    this.sparks.push({ loop: bl, i: bi, run: 0, tint, big, leak });
  }

  private draw(dt: number): void {
    const f = this.frame;
    const ctx = this.ctx;
    const dpr = canvasDensity(3);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    const s = w / FIGURE_BOX.w;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!f) return;
    ctx.setTransform(dpr * s, 0, 0, dpr * s, -FIGURE_BOX.x * s * dpr, -FIGURE_BOX.y * s * dpr);

    const a = this.attention();
    const t = a ? this.clock(a) : performance.now() / 1000;
    const level = Math.min(1, f.fill);
    const over = Math.max(0, f.fill - 1) / 0.5;
    const loops = loopsOf(f.circulation);
    const play = this.scene();
    const st = play && !play.outcome ? sceneTime(play) : null;
    const winding = st !== null && windingUp(st);
    const loopColor =
      f.state === 'unsettled' || f.heat >= 1
        ? this.palette.warn
        : play
          ? this.palette.ladders[play.ladder]
          : this.palette.crack;

    const light = this.sun();
    if (light && light.sun.light > 0) this.drawRim(light, s * dpr);

    // The circulation itself, faint, reddening with heat, and kept inside the silhouette.
    if (f.state !== 'dormant') {
      ctx.save();
      ctx.clip(this.body());
      const flicker = f.state === 'unsettled' && !f.reduced ? 0.5 + 0.5 * Math.random() : 1;
      // The wind-up slows the loop and dims it; the race brightens it.
      const race = st === null ? 0 : winding ? -0.04 : 0.25;
      ctx.globalAlpha =
        (0.1 + 0.14 * level + race + (f.reduced ? 0.12 : 0)) * f.sparks.glow * flicker;
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = loopColor;
      for (const l of loops) {
        ctx.beginPath();
        l.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
        ctx.closePath();
        ctx.stroke();
      }
      if (f.heat > 0 && f.heat < 1) {
        ctx.globalAlpha = 0.35 * f.heat;
        ctx.strokeStyle = this.palette.warn;
        for (const l of loops) {
          ctx.beginPath();
          l.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
          ctx.closePath();
          ctx.stroke();
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    ctx.globalCompositeOperation = 'lighter';
    if (!f.reduced) this.moveMotes(dt, f);
    if (!f.reduced) this.moveSparks(dt, loops, f, st === null ? 1 : winding ? 0.35 : 2.4);
    this.moveFlyers(dt, f);

    if (play) this.drawScene(dt, play, st, loops[0]!, f);
    this.drawBreak(dt);

    // Orbs: drifting in and floating, or pulsing in place under reduced motion. A scene hides them.
    if (a && !play) {
      for (const o of a.orbs) {
        const [x, y] = orbPosition(o, f.reduced ? o.arrives : t);
        const alpha = orbAlpha(o, t);
        const beat = 1 + 0.25 * Math.sin((t - o.born) * (f.reduced ? 2 : 4));
        const c = this.tint(o.tint);
        this.glow(x, y, 11 * beat, c, 0.4 * alpha);
        this.glow(x, y, 5, c, 0.95 * alpha);
        this.glow(x, y, 3.5, '#ffffff', 0.8 * alpha);
      }
    }

    // The dantian breathes with the figure: it swells on the inhale. Steady under reduced motion.
    const phase = breathPhase(t, f.breath);
    const breath = f.reduced
      ? 0.5
      : phase < INHALE_SHARE
        ? Math.sin((phase / INHALE_SHARE) * (Math.PI / 2))
        : Math.cos(((phase - INHALE_SHARE) / (1 - INHALE_SHARE)) * (Math.PI / 2));
    const dim = f.state === 'dormant' ? 0.25 : f.state === 'unsettled' ? 0.45 : 1;
    const halo = (9 + 10 * level + 6 * over + 5 * this.pulse) * (0.9 + 0.22 * breath);
    if (f.state !== 'dormant') {
      this.glow(
        DANTIAN[0],
        DANTIAN[1],
        halo,
        f.state === 'unsettled' ? this.palette.warn : this.palette.crack,
        0.7 * dim,
      );
    }
    this.glow(
      DANTIAN[0],
      DANTIAN[1],
      (2.4 + 1.8 * level + 0.8 * over + 1.5 * this.pulse) * 1.6,
      this.palette.core,
      0.9 * dim,
    );
    if (f.state === 'full' && !f.reduced && Math.random() < dt * 6 && this.pops.length < MAX_POPS) {
      this.pops.push({
        x: DANTIAN[0],
        y: DANTIAN[1],
        vx: (Math.random() - 0.5) * 50,
        vy: -20 - Math.random() * 40,
        t: 0,
        color: this.palette.crack,
      });
    }
    this.pops = this.pops.filter((p) => {
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      this.glow(p.x, p.y, 2, p.color, 0.7 * (1 - p.t / 0.8));
      return p.t < 0.8;
    });
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // The breath ring: a thin circle that opens on the inhale, so a breath can be timed by eye.
    if (f.state !== 'dormant' && a?.attended) {
      ctx.globalAlpha = f.reduced ? 0.18 : 0.12 + 0.2 * breath;
      ctx.strokeStyle = this.palette.crack;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(DANTIAN[0], DANTIAN[1], 16 + 10 * breath, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (this.pointer && !play) {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = getComputedStyle(this.canvas).getPropertyValue('--accent') || '#d6ab4c';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(this.pointer[0], this.pointer[1], f.reach, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    this.pulse = Math.max(0, this.pulse - dt * 0.6);
  }

  /**
   * The lit side of the figure: a faint light across the whole body from the sun's direction,
   * with a constant span and blurred, so near noon it comes from above rather than collapsing to a
   * hard line down the middle, and it never reads as a bar half filled.
   */
  private drawRim({ sun, color }: SunLight, px: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.clip(this.body());
    const len = Math.hypot(sun.dx, sun.dy) || 1;
    const lx = (sun.dx / len) * 55;
    const ly = (-sun.dy / len) * 55;
    const g = ctx.createLinearGradient(lx, ly, -lx, -ly);
    g.addColorStop(0, color);
    g.addColorStop(0.7, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = (0.1 + 0.08 * sun.elevation) * sun.light;
    ctx.fillStyle = g;
    ctx.filter = `blur(${(10 * px) / 2.1}px)`;
    ctx.fillRect(FIGURE_BOX.x, FIGURE_BOX.y, FIGURE_BOX.w, FIGURE_BOX.h);
    ctx.restore();
  }

  /**
   * The scene: the gates on the first loop, brightening as their moment nears; the racing spark
   * and its trail (none under reduced motion); a burst for each gate caught; and the outcome, the
   * dantian blazing on a success or the qi scattering on a failure.
   */
  private drawScene(
    dt: number,
    play: ScenePlay,
    st: number | null,
    loop: Point[],
    f: FigureFrame,
  ): void {
    const accent = getComputedStyle(this.canvas).getPropertyValue('--accent').trim() || '#d6ab4c';
    const at = (laps: number): Point => {
      const frac = ((laps % 1) + 1) % 1;
      return loop[Math.floor(frac * loop.length) % loop.length]!;
    };
    const color = this.palette.ladders[play.ladder];
    if (this.seen.started !== play.started) {
      this.seen = { started: play.started, lit: 0, gates: '', outcome: 0 };
    }
    // Through the wind-up the gates light one by one, each with a small flare as it wakes.
    const lit = st === null ? SCENE_GATES_PER_LAP : gatesLit(st);
    for (let m = this.seen.lit; m < lit; m++) {
      const [x, y] = at(gateLap(m));
      this.burst(x, y, accent, f.reduced ? 3 : 8);
    }
    this.seen.lit = Math.max(this.seen.lit, lit);

    // Each gate judged since the last frame: a gold burst for a catch, a small grey puff for an
    // early tap, which costs nothing.
    const judged = play.scene.gates.map((g) => g ?? '-').join(',');
    if (judged !== this.seen.gates) {
      const before = this.seen.gates.split(',');
      play.scene.gates.forEach((g, k) => {
        if (!g || before[k] === g) return;
        const [x, y] = at(gateLap(k));
        if (g === 'hit') {
          this.burst(x, y, accent, 12);
          this.pulse = Math.min(1, this.pulse + 0.3);
        } else this.burst(x, y, '#8a8f98', 4);
      });
      this.seen.gates = judged;
    }

    if (st !== null) {
      // The gates: one marker for each place on the loop, lit by the next gate to pass there.
      for (let m = 0; m < lit; m++) {
        const [x, y] = at(gateLap(m));
        let near = 0;
        for (let k = m; k < SCENE_GATES; k += SCENE_GATES_PER_LAP) {
          if (play.scene.gates[k]) continue;
          near = Math.max(near, 1 - Math.min(1, Math.abs(st - GATE_TIMES[k]!) / 0.8));
        }
        this.glow(x, y, 6 + 4 * near, accent, 0.25 + 0.7 * near);
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = 0.45 + 0.5 * near;
        this.ctx.strokeStyle = accent;
        this.ctx.lineWidth = 0.7;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 3.4, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.globalCompositeOperation = 'lighter';
      }

      // The racing spark, with a short trail, until it comes home to the dantian.
      const laps = sceneLaps(st);
      const home = Math.ceil(gateLap(SCENE_GATES - 1));
      if (!f.reduced && !windingUp(st) && laps < home) {
        for (let i = 5; i >= 0; i--) {
          const [x, y] = at(sceneLaps(Math.max(0, st - i * 0.035)));
          this.glow(x, y, i ? 4 - i * 0.5 : 8, i ? color : '#ffffff', i ? 0.5 - i * 0.07 : 0.95);
        }
      } else if (laps >= home) {
        this.pulse = Math.min(1, this.pulse + dt * 1.5);
      }
    }

    // The break: a flash through the whole figure, rings of light and a wide spray of sparks,
    // a second ring for a major one. A failure scatters in the warning color. Reduced motion
    // keeps the flash, which only fades, and a few sparks.
    if (play.outcome && this.seen.outcome !== play.outcome.at) {
      this.seen.outcome = play.outcome.at;
      const { success, major } = play.outcome;
      const n = f.reduced ? 12 : major ? 90 : 60;
      const speed = f.reduced ? 40 : major ? 150 : 110;
      const [x, y] = DANTIAN;
      if (success) {
        this.burst(x, y, color, n, speed, MAX_BREAK_POPS);
        this.burst(x, y, accent, n / 2, speed * 0.7, MAX_BREAK_POPS);
        this.burst(x, y, '#ffffff', n / 3, speed * 0.4, MAX_BREAK_POPS);
        this.flash = 1;
        this.flashColor = color;
        this.pulse = 1;
        if (!f.reduced) {
          this.waves.push({ t: 0, color, reach: major ? 150 : 95 });
          if (major) this.waves.push({ t: -0.22, color: accent, reach: 120 });
        }
      } else {
        this.burst(x, y, this.palette.warn, n, speed * 0.8, MAX_BREAK_POPS);
        this.flash = 0.45;
        this.flashColor = this.palette.warn;
      }
    }
  }

  private moveMotes(dt: number, f: FigureFrame): void {
    this.moteDebt += dt * f.motes;
    while (this.moteDebt > 1) {
      this.moteDebt--;
      if (this.motes.length >= MAX_MOTES) continue;
      const ang = Math.random() * Math.PI * 2;
      this.motes.push({
        x: Math.cos(ang) * ORB_EDGE[0] * 1.05,
        y: Math.sin(ang) * ORB_EDGE[1] * 1.05 - 6,
        vx: 0,
        vy: 0,
        t: 0,
        tint: f.tint,
      });
    }
    this.motes = this.motes.filter((m) => {
      m.t += dt;
      const c = this.tint(m.tint);
      if (f.state === 'dormant') {
        // No method: the qi drifts close, then slides off.
        const r = Math.hypot(m.x, m.y + 5) || 1;
        const k = r < 48 ? 30 : -6;
        m.vx += (m.x / r) * k * dt;
        m.vy += ((m.y + 5) / r) * k * dt;
        m.x += m.vx * dt * 4;
        m.y += m.vy * dt * 4;
        this.glow(m.x, m.y, 2.2, c, 0.5 * Math.max(0, 1 - m.t / 6));
        return m.t < 6;
      }
      const [tx, ty] = nearestEntry(m.x, m.y);
      const dx = tx - m.x;
      const dy = ty - m.y;
      const d = Math.hypot(dx, dy) || 1;
      const sp = (14 + 40 * Math.min(1, m.t / 3)) * (f.state === 'full' ? 1.4 : 1);
      const sw = Math.sin(m.t * 3 + m.x) * 0.6;
      m.x += ((dx / d) * sp + (-dy / d) * sw * 8) * dt;
      m.y += ((dy / d) * sp + (dx / d) * sw * 8) * dt;
      this.glow(m.x, m.y, 2.2, c, Math.min(0.6, m.t));
      if (d < 3) {
        this.toSpark(m.x, m.y, m.tint, false);
        return false;
      }
      return m.t < 12;
    });
  }

  private moveSparks(dt: number, loops: Point[][], f: FigureFrame, pace: number): void {
    const speed = (f.state === 'full' ? 90 : 50) * pace * dt;
    this.sparks = this.sparks.filter((s) => {
      const l = loops[s.loop] ?? loops[0]!;
      const v = speed * (s.big ? 1.3 : 1);
      s.i = (s.i + v) % l.length;
      s.run += v;
      const q = l[Math.floor(s.i)]!;
      let [x, y] = q;
      if (f.state === 'unsettled') {
        x += (Math.random() - 0.5) * 2.4;
        y += (Math.random() - 0.5) * 2.4;
      }
      if (s.leak && s.run > l.length * 0.4) {
        this.burst(x, y, this.palette.warn, 4);
        return false;
      }
      const c = this.tint(s.tint);
      this.glow(x, y, (s.big ? 7 : 4) * f.sparks.glow, c, s.big ? 0.9 : 0.6);
      this.glow(x, y, 1.6, '#ffffff', 0.6);
      if (s.run >= l.length) {
        this.pulse = Math.min(1, this.pulse + (s.big ? 0.5 : 0.12));
        return false;
      }
      return true;
    });
  }

  private moveFlyers(dt: number, f: FigureFrame): void {
    this.flyers = this.flyers.filter((o) => {
      const [tx, ty] = nearestEntry(o.x, o.y);
      const dx = tx - o.x;
      const dy = ty - o.y;
      const d = Math.hypot(dx, dy) || 1;
      o.x += (dx / d) * Math.min(d, 150 * dt);
      o.y += (dy / d) * Math.min(d, 150 * dt);
      const c = this.tint(o.tint);
      this.glow(o.x, o.y, 9, c, 0.5);
      this.glow(o.x, o.y, 3.5, '#ffffff', 0.8);
      if (d < 4) {
        if (f.state === 'dormant') this.burst(o.x, o.y, c, 10);
        else {
          this.toSpark(o.x, o.y, o.tint, true);
          this.burst(o.x, o.y, c, 6);
        }
        return false;
      }
      return true;
    });
  }
}
