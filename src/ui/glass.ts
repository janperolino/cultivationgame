// The cracked glass behind the game (design § UI and screens, Look; docs/mockups/glass-study.html):
// a few long fractures from impact points, a fine web only around the impacts, and qi light
// leaking through every crack. Seeded per life, redrawn to fit the screen.
import { mulberry32 } from '../core/rng.ts';

type Point = [number, number];
interface CrackPath {
  pts: Point[];
  /** Weight: 1 for a main fracture, smaller for branches and web. */
  k: number;
  /** The newest fracture, from the latest breakthrough, glows brighter. */
  fresh?: boolean;
}

export interface GlassOptions {
  seed: number;
  /** Fractures opened by breakthroughs; only the latest few are drawn. */
  fractures: number;
  /** How much fine web the glass carries, 0 to 3. */
  web: number;
  /** 1 at rest; a breakthrough flares it up for a moment. */
  glow: number;
  /** The crack light: any #rrggbb color. */
  color: string;
}

/** At most this many breakthrough fractures are drawn, newest last. */
const MAX_FRACTURES = 12;

function walk(
  rng: () => number,
  x: number,
  y: number,
  angle: number,
  len: number,
  step: number,
  wobble: number,
): Point[] {
  const pts: Point[] = [[x, y]];
  let a = angle;
  let l = 0;
  while (l < len) {
    a += (rng() - 0.5) * wobble;
    const s = step * (0.6 + rng() * 0.8);
    x += Math.cos(a) * s;
    y += Math.sin(a) * s;
    pts.push([x, y]);
    l += s;
  }
  return pts;
}

function pointAt(pts: Point[], d: number): Point | null {
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]!;
    const [x1, y1] = pts[i]!;
    const seg = Math.hypot(x1 - x0, y1 - y0);
    if (acc + seg >= d) {
      const t = (d - acc) / seg;
      return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
    }
    acc += seg;
  }
  return null;
}

/** Every crack for a screen of this size. Impacts sit in corners, away from the text. */
export function buildCracks(
  w: number,
  h: number,
  o: Pick<GlassOptions, 'seed' | 'web' | 'fractures'>,
): CrackPath[] {
  const rng = mulberry32(o.seed);
  const diag = Math.hypot(w, h);
  const narrow = w < 900;
  const impacts: Point[] = narrow
    ? [
        [0.9, 0.04],
        [0.06, 0.97],
      ]
    : [
        [0.97, 0.06],
        [0.11, 0.95],
      ];
  const paths: CrackPath[] = [];
  const add = (pts: Point[], k: number) => paths.push({ pts, k });

  impacts.forEach(([ix, iy], idx) => {
    const cx = ix * w;
    const cy = iy * h;
    const longs = idx === 0 ? 2 : 1;
    for (let i = 0; i < longs; i++) {
      const toward = Math.atan2(h * 0.5 - cy, w * 0.5 - cx) + (rng() - 0.5) * 1.6;
      const f = walk(rng, cx, cy, toward, diag * (0.45 + rng() * 0.45), 22, 0.32);
      add(f, 1);
      for (let b = 0; b < 2; b++) {
        const p = f[Math.floor(f.length * (0.25 + rng() * 0.6))];
        if (p) {
          const turn = (rng() < 0.5 ? -1 : 1) * (0.5 + rng() * 0.6);
          add(walk(rng, p[0], p[1], toward + turn, 40 + rng() * 140, 12, 0.5), 0.55);
        }
      }
    }
    if (o.web > 0) {
      const n = 7 + o.web * 3 - idx * 2;
      const R = Math.min(w, h) * (0.12 + o.web * 0.035) * (idx === 0 ? 1 : 0.7);
      const spokes: Point[][] = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (rng() - 0.5) * 0.4;
        const s = walk(rng, cx, cy, a, R * (0.45 + rng() * 0.6), 7, 0.45);
        spokes.push(s);
        add(s, 0.42);
      }
      const rings = o.web + (idx === 0 ? 1 : 0);
      for (let r = 1; r <= rings; r++) {
        const d = (R * 0.85 * r) / (rings + 0.6);
        for (let i = 0; i < n; i++) {
          if (rng() < 0.28) continue;
          const p = pointAt(spokes[i]!, d * (0.85 + rng() * 0.3));
          const q = pointAt(spokes[(i + 1) % n]!, d * (0.85 + rng() * 0.3));
          if (p && q) {
            const mx = (p[0] + q[0]) / 2 + (cx - (p[0] + q[0]) / 2) * 0.08;
            const my = (p[1] + q[1]) / 2 + (cy - (p[1] + q[1]) / 2) * 0.08;
            add([p, [mx, my], q], 0.32);
          }
        }
      }
    }
  });

  const edgeRng = mulberry32(o.seed + 101);
  add(
    walk(edgeRng, -10, h * (0.55 + edgeRng() * 0.3), -0.35 + edgeRng() * 0.2, diag * 0.9, 26, 0.22),
    0.85,
  );

  // One fracture per breakthrough, each from its own seed so earlier ones never move.
  const first = Math.max(0, o.fractures - MAX_FRACTURES);
  for (let e = first; e < o.fractures; e++) {
    const r = mulberry32(o.seed * 31 + e * 977);
    const sx = w * (0.15 + r() * 0.7);
    const sy = h * (0.15 + r() * 0.7);
    paths.push({
      pts: walk(r, sx, sy, r() * Math.PI * 2, diag * (0.3 + r() * 0.3), 18, 0.35),
      k: 0.9,
      fresh: e === o.fractures - 1,
    });
  }
  return paths;
}

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

function mixWhite(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * t));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

function stroke(
  ctx: CanvasRenderingContext2D,
  pts: Point[],
  width: number,
  style: string,
  dx = 0,
  dy = 0,
) {
  ctx.beginPath();
  ctx.moveTo(pts[0]![0] + dx, pts[0]![1] + dy);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0] + dx, pts[i]![1] + dy);
  ctx.lineWidth = width;
  ctx.strokeStyle = style;
  ctx.stroke();
}

/** A #rrggbb color from any CSS color the canvas understands, falling back to qi cyan. */
export function toHex(ctx: CanvasRenderingContext2D, color: string): string {
  ctx.fillStyle = '#7fc7d9';
  ctx.fillStyle = color;
  const v = ctx.fillStyle;
  return /^#[0-9a-f]{6}$/i.test(v) ? v : '#7fc7d9';
}

/** Paints the glass: the void, a faint sheen, then every crack with its light. */
export function drawGlass(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  background: string,
  paths: CrackPath[],
  o: Pick<GlassOptions, 'glow' | 'color'>,
) {
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);
  const sheen = ctx.createLinearGradient(0, 0, w, h);
  sheen.addColorStop(0, 'rgba(255,255,255,0.025)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(255,255,255,0.015)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);

  const core = mixWhite(o.color, 0.55);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const { pts, k, fresh } of paths) {
    const g = o.glow * (fresh ? 1.4 : 1);
    ctx.globalCompositeOperation = 'source-over';
    stroke(ctx, pts, 1.1 * k + 0.4, 'rgba(0,0,0,0.55)', 1.2, 1.2);
    ctx.globalCompositeOperation = 'lighter';
    stroke(ctx, pts, 9 * k, rgba(o.color, Math.min(0.5, 0.035 * g)));
    stroke(ctx, pts, 3 * k, rgba(o.color, Math.min(0.8, 0.11 * g)));
    stroke(ctx, pts, Math.max(0.6, 0.95 * k), rgba(core, Math.min(1, 0.5 * g)));
  }
  ctx.globalCompositeOperation = 'source-over';
}
