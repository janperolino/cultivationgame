// Sitting at the furnace (design § Professions, Crafts, thin, the hands-on version; K3, Jan's take F,
// `docs/mockups/furnace-dross-side-study.html`): the bronze furnace side on, burning out the dross
// 去杂. Each lift of its lid throws specks up out of its mouth and a herb going in throws more;
// click the dark dross to flick fire at it, and let the gold essence fall back. The hand is the
// seat's gold ring round it, heat an inner arc that reddens near the top, and the pill's glow in
// the mouth brightens with the hand. The rules live in core/furnace.ts; this draws them and hands
// the hand to the bench (ui/furnace.ts). One canvas, the middle panel's, with no blur: it runs
// while you sit and the tab is visible, and stops otherwise. Under reduced motion the specks stand
// still at their peak, fading in and out, and the lid, the fire and the marks keep still.
import { useEffect, useRef, useState } from 'react';
import type { Recipe } from '../content/catalogs/types.ts';
import { FURNACE_BOX, HEAT_WARN, HERB_WARN_S, MOUTH } from '../content/furnace.ts';
import { item } from '../content/items.ts';
import {
  changeRecipe,
  flick,
  keepFurnaceStream,
  lidLift,
  nextHerb,
  roaring,
  speckAt,
  speckFlight,
  startFurnace,
  tickFurnace,
  type Furnace,
} from '../core/furnace.ts';
import type { GameState } from '../core/state.ts';
import { setHand } from './furnace.ts';
import { reducedMotion, useSettings } from './settings.ts';
import { canvasDensity } from './stage.ts';
import { useGame } from './store.ts';
import { cue } from './cues.ts';

const { w: W, h: H } = FURNACE_BOX;
const CX = W / 2;
const CY = 280;
/** The seat's ring: 65% of a circle, open toward the floor. */
const SPAN = Math.PI * 2 * 0.65;
const START = Math.PI / 2 + (Math.PI * 2 - SPAN) / 2;
const ang = (v: number) => START + SPAN * v;

interface Palette {
  gilt: string;
  fire: string;
  warn: string;
  muted: string;
  essence: string;
  shift: string;
}

function palette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, or: string) => css.getPropertyValue(name).trim() || or;
  return {
    gilt: v('--gilt', '#d9b46a'),
    fire: v('--qi-fire', '#ee9670'),
    warn: v('--shift-missed', '#e0503f'),
    muted: v('--muted', '#8d949d'),
    essence: v('--gilt-core', '#fff1c9'),
    shift: v('--text', '#e9e5da'),
  };
}

interface Mark {
  at: [number, number];
  good: boolean;
  t: number;
}

/** The furnace scene: plays `recipe`'s dose while mounted. */
export function FurnaceScene({ game, recipe }: { game: GameState; recipe: Recipe }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sat] = useState(() => startFurnace(game, recipe));
  const furnace = useRef<Furnace>(sat);
  const marks = useRef<Mark[]>([]);
  const ash = useRef<{ at: [number, number]; t: number }[]>([]);
  const applyLife = useGame((s) => s.applyLife);
  const settings = useSettings();
  const reduced = reducedMotion(settings);
  const reducedRef = useRef(reduced);
  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  // A new batch at the front takes its own herbs into the dose; the hand and heat stay.
  useEffect(() => {
    furnace.current = changeRecipe(furnace.current, recipe);
  }, [recipe]);

  // Standing up keeps the furnace stream's place in the game, so a reload continues it.
  useEffect(
    () => () => {
      const f = furnace.current;
      applyLife((s) => keepFurnaceStream(s, f));
    },
    [applyLife],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const g = canvas?.getContext('2d');
    if (!canvas || !g) return;
    const pal = palette();
    let raf = 0;
    let last = 0;
    const frame = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      const r = tickFurnace(furnace.current, dt);
      furnace.current = r.furnace;
      setHand(r.furnace.hand);
      draw(g, canvas, r.furnace, pal, marks.current, ash.current, reducedRef.current);
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
  }, []);

  const onDown = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const f = furnace.current;
    const rect = ev.currentTarget.getBoundingClientRect();
    const at: [number, number] = [
      ((ev.clientX - rect.left) / rect.width) * W,
      ((ev.clientY - rect.top) / rect.height) * H,
    ];
    const r = flick(f, game.player.id, at, reduced);
    furnace.current = r.furnace;
    setHand(r.furnace.hand);
    if (r.burned) {
      cue('craft-furnace');
      const good = r.burned.speck.kind === 'dross';
      marks.current.push({ at: r.burned.at, good, t: f.t });
      if (good) ash.current.push({ at: r.burned.at, t: f.t });
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="furnace-canvas"
      width={W}
      height={H}
      onPointerDown={onDown}
      aria-label="The furnace: click the dark dross to burn it; let the gold essence fall back."
    />
  );
}

function draw(
  g: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  f: Furnace,
  pal: Palette,
  marks: Mark[],
  ash: { at: [number, number]; t: number }[],
  reduced: boolean,
) {
  const k = canvasDensity();
  if (canvas.width !== Math.round(W * k)) {
    canvas.width = Math.round(W * k);
    canvas.height = Math.round(H * k);
  }
  g.setTransform(k, 0, 0, k, 0, 0);
  g.clearRect(0, 0, W, H);
  const t = f.t;
  // The floor's glow, warmer with heat.
  const glow = g.createRadialGradient(CX, CY + 130, 10, CX, CY + 130, 240);
  glow.addColorStop(0, `rgba(238,150,112,${0.08 + Math.min(1, f.heat) * 0.3})`);
  glow.addColorStop(1, 'rgba(238,150,112,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  // The hand as the seat's ring; heat an inner arc.
  arc(g, 262, 0, 1, 3, pal.gilt, 0.14);
  arc(g, 262, 0, Math.max(0.002, f.hand), 3, pal.gilt, 0.85);
  arc(g, 228, 0, 1, 7, '#ffffff', 0.05);
  arc(
    g,
    228,
    0,
    Math.max(0.002, Math.min(1, f.heat)),
    7,
    f.heat > HEAT_WARN ? pal.warn : pal.fire,
    0.7,
  );
  const lift = reduced ? 6 : 10 + lidLift(t) * 22;
  ding(g, CX, CY + 60, 1.25, Math.min(1, f.heat), lift, t, reduced);
  // The pill's glow in the mouth, brighter with the hand.
  g.fillStyle = `rgba(255,217,138,${0.15 + f.hand * 0.35})`;
  g.beginPath();
  g.ellipse(MOUTH[0], MOUTH[1] + 6, 70, 9, 0, 0, Math.PI * 2);
  g.fill();
  for (const s of f.specks) {
    if (t < s.born) continue;
    const [x, y] = speckAt(s, t, reduced);
    const p = speckFlight(s, t);
    g.globalAlpha = Math.max(0, Math.min(1, p / 0.08, (1 - p) / 0.08));
    if (s.kind === 'dross') {
      g.fillStyle = 'rgba(40,34,30,0.5)';
      circle(g, x, y + 6, 7);
      g.fillStyle = '#0a0806';
      g.strokeStyle = 'rgba(160,140,120,0.55)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(x, y, 9, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    } else {
      g.fillStyle = 'rgba(255,220,140,0.25)';
      circle(g, x, y, 13);
      g.fillStyle = '#ffd98a';
      circle(g, x, y, 6);
    }
    g.globalAlpha = 1;
  }
  // Dross burned to ash drifts up and fades.
  prune(ash, t, 1.2);
  for (const a of ash) {
    const q = (t - a.t) / 1.2;
    g.globalAlpha = 0.5 * (1 - q);
    g.fillStyle = pal.muted;
    for (let i = 0; i < 5; i++)
      circle(g, a.at[0] + (i - 2) * 6 * (1 + q), a.at[1] - (reduced ? 0 : q * 40) - i * 3, 2);
    g.globalAlpha = 1;
  }
  // 妙 over a dross burned, 失 over an essence.
  prune(marks, t, 0.8);
  g.font = '28px KaiTi, STKaiti, serif';
  g.textAlign = 'center';
  for (const m of marks) {
    const q = (t - m.t) / 0.8;
    g.globalAlpha = 1 - q;
    g.fillStyle = m.good ? pal.essence : pal.warn;
    g.fillText(m.good ? '妙' : '失', m.at[0], m.at[1] - (reduced ? 0 : q * 16));
    g.globalAlpha = 1;
  }
  g.font = '500 20px Georgia, serif';
  if (roaring(f)) {
    g.fillStyle = pal.warn;
    g.fillText('The furnace roars', CX, 50);
  }
  const herb = nextHerb(f);
  if (herb && herb.in < HERB_WARN_S) {
    g.globalAlpha = 0.75 * (1 - herb.in / HERB_WARN_S);
    g.fillStyle = pal.shift;
    g.font = '500 16px Georgia, serif';
    g.fillText(`${item(herb.thing).name} going in`, CX, 80);
    g.globalAlpha = 1;
  }
  g.font = '13px Inter, system-ui, sans-serif';
  g.fillStyle = pal.muted;
  g.textAlign = 'left';
  g.fillText(`hand ${f.hand.toFixed(2)}`, 40, 540);
}

function prune<T extends { t: number }>(list: T[], t: number, life: number) {
  for (let i = list.length - 1; i >= 0; i--) if (t - list[i]!.t >= life) list.splice(i, 1);
}

function circle(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}

function arc(
  g: CanvasRenderingContext2D,
  r: number,
  v0: number,
  v1: number,
  width: number,
  color: string,
  alpha: number,
) {
  g.beginPath();
  g.arc(CX, CY, r, ang(v0), ang(v1));
  g.strokeStyle = color;
  g.globalAlpha = alpha;
  g.lineWidth = width;
  g.lineCap = 'round';
  g.stroke();
  g.globalAlpha = 1;
}

/** The bronze ding on three legs, side on, its fire under it by heat, its lid lifted by `lid`. */
function ding(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  heat: number,
  lid: number,
  t: number,
  reduced: boolean,
) {
  g.save();
  g.translate(x, y);
  g.scale(scale, scale);
  for (let i = -2; i <= 2; i++) {
    const flicker = reduced ? 1 : 0.85 + 0.15 * Math.sin(t * 9 + i * 1.7);
    const h = (20 + 50 * heat) * (1 - Math.abs(i) * 0.2) * flicker;
    g.beginPath();
    g.moveTo(i * 16 - 10, 92);
    g.quadraticCurveTo(i * 16, 92 - h * 1.2, i * 16 + 10, 92);
    g.fillStyle = `rgba(${200 + heat * 55},${150 - heat * 50},70,${0.3 + heat * 0.45})`;
    g.fill();
  }
  g.fillStyle = '#2a2219';
  g.strokeStyle = '#6b5638';
  g.lineWidth = 2;
  for (const lx of [-48, 0, 48]) {
    g.beginPath();
    g.moveTo(lx - 5, 40);
    g.lineTo(lx - 7, 92);
    g.lineTo(lx + 7, 92);
    g.lineTo(lx + 5, 40);
    g.fill();
    g.stroke();
  }
  g.beginPath();
  g.moveTo(-82, -40);
  g.bezierCurveTo(-90, 10, -70, 50, 0, 52);
  g.bezierCurveTo(70, 50, 90, 10, 82, -40);
  g.closePath();
  g.fill();
  g.stroke();
  g.strokeStyle = '#8a7046';
  g.beginPath();
  g.moveTo(-84, -22);
  g.lineTo(84, -22);
  g.stroke();
  g.fillStyle = `rgba(238,150,112,${0.15 + heat * 0.55})`;
  g.font = '20px KaiTi, STKaiti, serif';
  g.textAlign = 'center';
  g.fillText('丹', 0, 18);
  g.fillStyle = '#2a2219';
  g.strokeStyle = '#6b5638';
  for (const ex of [-70, 70]) {
    g.beginPath();
    g.rect(ex - 9, -66, 18, 26);
    g.fill();
    g.stroke();
  }
  g.beginPath();
  g.ellipse(0, -44 - lid, 78, 12, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.beginPath();
  g.arc(0, -58 - lid, 9, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.restore();
}
