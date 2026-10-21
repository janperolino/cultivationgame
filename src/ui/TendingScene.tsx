// Tending a plot, the sleeve's ring 拂袖 (K8; Jan's pick, take A of
// `docs/mockups/tending-study.html`): the plot's nine beds from above, six sprouts of light on each
// sown bed. Knots of foul qi rise from the beds and drift together; press and drag a closed ring
// round them and your sleeve sweeps them up. A ring that crosses a sprout bruises it, and a knot left
// too long sinks into the roots. The hand is the seat's gold ring at the top right. The rules live in
// core/tending.ts; this draws them and keeps the hand (ui/tending.ts). One canvas, the middle
// panel's, with no blur: it runs while you sit and the tab is visible. Under reduced motion the
// knots hold still where they rise, and the marks don't float.
import { useEffect, useRef, useState } from 'react';
import { item } from '../content/items.ts';
import { TEND } from '../content/farming.ts';
import { hashSeed, Rng } from '../core/rng.ts';
import type { Plot } from '../core/state.ts';
import {
  BOARD,
  letGo,
  pathLength,
  startTending,
  stepTending,
  strokeLasts,
  type Pt,
  type Tending,
} from '../core/tending.ts';
import { reducedMotion, useSettings } from './settings.ts';
import { canvasDensity } from './stage.ts';
import { setTending } from './tending.ts';

const { w: W, h: H } = BOARD;
/** The seat's ring: 65% of a circle, open toward the floor. */
const SPAN = Math.PI * 2 * 0.65;
const START = Math.PI / 2 + (Math.PI * 2 - SPAN) / 2;

const MARK = {
  ring: ['妙', '#d6ab4c'],
  bruise: ['伤', '#e08a6a'],
  sank: ['浊', '#8a7a9a'],
} as const;

/** The scene at a plot: plays its sown beds while mounted, on a seed keyed by the plot and the day. */
export function TendingScene({ plot, day }: { plot: Plot; day: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rng] = useState(() => new Rng(hashSeed(`tend/${plot.id}/${Math.floor(day)}`)));
  const [board] = useState(() =>
    startTending(
      plot.beds.map((b) => !!b),
      rng,
    ),
  );
  const crops = useRef(plot.beds.map((b) => (b ? item(b.crop).name : '')));
  const tending = useRef<Tending>(board);
  const stroke = useRef<Pt[] | null>(null);
  const sweeps = useRef<{ from: Pt[]; to: Pt; t: number }[]>([]);
  const settings = useSettings();
  const reduced = reducedMotion(settings);
  const reducedRef = useRef(reduced);
  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const g = canvas?.getContext('2d');
    if (!canvas || !g) return;
    let raf = 0;
    let last = 0;
    const frame = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      const s = stepTending(tending.current, dt, rng, reducedRef.current);
      setTending(s.hand, s.t);
      sweeps.current = sweeps.current.filter((x) => s.t - x.t < 0.5);
      draw(g, canvas, s, crops.current, stroke.current, sweeps.current, reducedRef.current);
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const visibility = () => (document.visibilityState === 'visible' ? start() : stop());
    visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [rng]);

  const at = (ev: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const rect = ev.currentTarget.getBoundingClientRect();
    return [
      ((ev.clientX - rect.left) / rect.width) * W,
      ((ev.clientY - rect.top) / rect.height) * H,
    ];
  };
  const onDown = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    ev.currentTarget.setPointerCapture(ev.pointerId);
    stroke.current = [at(ev)];
  };
  const onMove = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const p = stroke.current;
    if (!p) return;
    const q = at(ev);
    const last = p[p.length - 1]!;
    if (Math.hypot(q[0] - last[0], q[1] - last[1]) < 4) return;
    p.push(q);
    // The sleeve's qi runs out: the stroke breaks.
    if (!strokeLasts(p)) stroke.current = null;
  };
  const onUp = () => {
    const p = stroke.current;
    stroke.current = null;
    if (!p) return;
    const r = letGo(tending.current, p);
    if (r.to) sweeps.current.push({ from: r.swept, to: r.to, t: tending.current.t });
    setTending(tending.current.hand, tending.current.t);
  };

  return (
    <canvas
      ref={canvasRef}
      className="tending-canvas"
      width={W}
      height={H}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={() => (stroke.current = null)}
      aria-label="The plot: draw a closed ring round the knots of foul qi to sweep them up, keeping the line off the sprouts."
    />
  );
}

function draw(
  g: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  s: Tending,
  crops: string[],
  stroke: Pt[] | null,
  sweeps: { from: Pt[]; to: Pt; t: number }[],
  reduced: boolean,
) {
  const k = canvasDensity();
  if (canvas.width !== Math.round(W * k)) {
    canvas.width = Math.round(W * k);
    canvas.height = Math.round(H * k);
  }
  g.setTransform(k, 0, 0, k, 0, 0);
  g.clearRect(0, 0, W, H);
  const t = s.t;
  const b0 = s.beds[0]!;
  const b8 = s.beds[8]!;
  // The earth between the beds, one fill.
  g.fillStyle = '#0d0f0b';
  g.fillRect(b0.x - 22, b0.y - 22, b8.x + b8.w - b0.x + 44, b8.y + b8.h - b0.y + 44);
  for (const b of s.beds) {
    g.fillStyle = b.sown ? 'rgb(62,54,40)' : 'rgb(34,31,26)';
    g.fillRect(b.x, b.y, b.w, b.h);
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    g.lineWidth = 1;
    for (let r = 0; r < 2; r++) {
      const y = b.y + 60 + r * 58;
      g.beginPath();
      g.moveTo(b.x + 10, y);
      g.lineTo(b.x + b.w - 10, y);
      g.stroke();
    }
    g.fillStyle = 'rgba(233,229,218,0.55)';
    g.font = '12px Inter, system-ui, sans-serif';
    g.textAlign = 'left';
    g.fillText(b.sown ? crops[b.i]! : 'bare', b.x + 8, b.y + 16);
  }
  // A knot that sank darkens its bed for a moment.
  for (const m of s.marks)
    if (m.what === 'sank') {
      const b = s.beds.find(
        (x) =>
          m.at[0] >= x.x - 10 &&
          m.at[0] <= x.x + x.w + 10 &&
          m.at[1] >= x.y - 10 &&
          m.at[1] <= x.y + x.h + 10,
      );
      if (b) {
        g.fillStyle = `rgba(40,20,50,${0.5 * (1 - (t - m.t) / 0.9)})`;
        g.fillRect(b.x, b.y, b.w, b.h);
      }
    }
  for (const sp of s.sprouts) {
    const hurt = t - sp.hurt < TEND.heal;
    const c = hurt ? '224,138,106' : '134,209,154';
    const gr = g.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, 16);
    gr.addColorStop(0, `rgba(${c},0.55)`);
    gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr;
    g.beginPath();
    g.arc(sp.x, sp.y, 16, 0, Math.PI * 2);
    g.fill();
    const droop = hurt ? 5 : 0;
    g.strokeStyle = `rgb(${c})`;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(sp.x, sp.y + 7);
    g.quadraticCurveTo(sp.x - 1, sp.y, sp.x - 6, sp.y - 5 + droop);
    g.moveTo(sp.x, sp.y + 2);
    g.quadraticCurveTo(sp.x + 2, sp.y - 4, sp.x + 6, sp.y - 7 + droop);
    g.stroke();
  }
  for (const kn of s.knots) {
    const age = t - kn.born;
    const rise = Math.min(1, age / 0.6);
    const sink = Math.max(0, Math.min(1, (age - TEND.sinkFrom) / (TEND.life - TEND.sinkFrom)));
    const r = (14 + (reduced ? 0 : Math.sin(t * 3 + kn.ph) * 1.5)) * rise * (1 - sink * 0.5);
    const gr = g.createRadialGradient(kn.x, kn.y, 0, kn.x, kn.y, r * 2 + 0.1);
    gr.addColorStop(
      0,
      `rgba(${Math.round(120 - 50 * sink)},${Math.round(96 - 46 * sink)},${Math.round(140 - 60 * sink)},0.95)`,
    );
    gr.addColorStop(0.45, 'rgba(70,52,88,0.55)');
    gr.addColorStop(1, 'rgba(40,30,50,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(kn.x, kn.y, r * 2 + 0.1, 0, Math.PI * 2);
    g.fill();
    const spin = kn.ph + (reduced ? 0 : t * 0.6);
    g.strokeStyle = `rgba(200,180,220,${0.5 * (1 - sink)})`;
    g.lineWidth = 1.2;
    g.beginPath();
    g.ellipse(kn.x, kn.y, r * 0.7 + 0.1, r * 0.35 + 0.1, spin, 0, Math.PI * 2);
    g.ellipse(kn.x, kn.y, r * 0.35 + 0.1, r * 0.7 + 0.1, spin, 0, Math.PI * 2);
    g.stroke();
  }
  // Knots going into the sleeve.
  for (const sw of sweeps) {
    const q = (t - sw.t) / 0.5;
    g.fillStyle = `rgba(214,171,76,${1 - q})`;
    for (const p of sw.from) {
      g.beginPath();
      g.arc(
        p[0] + (sw.to[0] - p[0]) * q,
        p[1] + (sw.to[1] - p[1]) * q,
        5 * (1 - q) + 1,
        0,
        Math.PI * 2,
      );
      g.fill();
    }
  }
  if (stroke && stroke.length > 1) {
    const left = 1 - pathLength(stroke) / TEND.most;
    g.strokeStyle = `rgba(214,171,76,${0.35 + 0.55 * left})`;
    g.lineWidth = 2.5;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    stroke.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.stroke();
    const a = stroke[0]!;
    const z = stroke[stroke.length - 1]!;
    if (stroke.length > 6 && Math.hypot(z[0] - a[0], z[1] - a[1]) < TEND.close) {
      g.strokeStyle = 'rgba(214,171,76,0.9)';
      g.beginPath();
      g.arc(a[0], a[1], 9, 0, Math.PI * 2);
      g.stroke();
    }
  }
  // The hand as the seat's ring.
  const cx = W - 54;
  const cy = 46;
  g.lineWidth = 4;
  g.strokeStyle = 'rgba(255,255,255,0.08)';
  g.beginPath();
  g.arc(cx, cy, 26, START, START + SPAN);
  g.stroke();
  g.strokeStyle = '#d6ab4c';
  g.beginPath();
  g.arc(cx, cy, 26, START, START + SPAN * Math.max(0.002, s.hand));
  g.stroke();
  g.fillStyle = '#e9e5da';
  g.font = '13px Inter, system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText(s.hand.toFixed(2), cx, cy + 5);
  for (const m of s.marks) {
    const q = (t - m.t) / 0.9;
    const [ch, col] = MARK[m.what];
    g.globalAlpha = Math.max(0, 1 - q);
    g.fillStyle = col;
    g.font = '28px KaiTi, serif';
    g.fillText(ch, m.at[0], m.at[1] - (reduced ? 0 : q * 16));
    g.globalAlpha = 1;
  }
}
