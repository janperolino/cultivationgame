// Sitting at the forge (design § Professions, Crafts, thin, the hands-on version; K4, its talk and
// `docs/mockups/forge-tempering-study.html`): tempering 淬炼. The piece hangs in the air over the
// forge's true fire 真火, inside a faint array, and rises out of the flames a heat at a time with
// rune points 禁制 raised on it; click a point to press a hand seal 法诀 into it as its glow passes
// orange, and on the last heat click to quench the piece in the spirit spring 灵泉 as it passes
// cherry. A strip of the glow's colors marks both bands. The hand is the seat's gold ring round it.
// The rules live in core/forge.ts; this draws them and hands the hand to the bench (ui/furnace.ts).
// One canvas, the middle panel's, with no blur: it runs while you sit and the tab is visible, and
// stops otherwise. Under reduced motion the piece doesn't bob or sink, the fire doesn't flicker and
// the marks and motes keep still; the glow still changes, since it is the game. The art overhaul
// paints it properly.
import { useEffect, useRef, useState } from 'react';
import type { FamilyId } from '../content/crafts.ts';
import {
  FIRE_S,
  FORGE_BOX,
  PIECE,
  QUENCH_BAND,
  QUENCH_REST_S,
  SEAL_BAND,
  SEAL_REACH,
  SEAL_S,
} from '../content/forge.ts';
import {
  glowAt,
  keepForgeStream,
  press,
  runeAt,
  startForge,
  tickForge,
  type Forge,
  type Temper,
} from '../core/forge.ts';
import type { GameState } from '../core/state.ts';
import { setHand } from './furnace.ts';
import { reducedMotion, useSettings } from './settings.ts';
import { canvasDensity } from './stage.ts';
import { useGame } from './store.ts';
import { cue } from './cues.ts';

const { w: W, h: H } = FORGE_BOX;
const CX = W / 2;
const CY = 300;
/** The seat's ring: 65% of a circle, open toward the floor. */
const SPAN = Math.PI * 2 * 0.65;
const START = Math.PI / 2 + (Math.PI * 2 - SPAN) / 2;
const ang = (v: number) => START + SPAN * v;
/** The cauldron's mouth, and where the piece hangs in its flames between heats. */
const MOUTH_Y = 390;
const IN_FIRE_Y = 352;
/** The spirit spring's basin, right of the cauldron. */
const BASIN = { x: 612, y: 400, w: 112 } as const;

/** The glow a refiner reads, dark to white, as colors along 0 to 1. */
const STOPS: readonly (readonly [number, readonly [number, number, number]])[] = [
  [0, [24, 20, 18]],
  [0.2, [70, 18, 14]],
  [0.34, [150, 26, 30]],
  [0.44, [200, 50, 40]],
  [0.57, [255, 140, 50]],
  [0.72, [255, 200, 80]],
  [0.86, [255, 240, 170]],
  [1, [255, 255, 245]],
];

function glowColor(t: number, alpha = 1): string {
  const v = Math.max(0, Math.min(1, t));
  let i = 1;
  while (i < STOPS.length - 1 && v > STOPS[i]![0]) i++;
  const [a, ca] = STOPS[i - 1]!;
  const [b, cb] = STOPS[i]!;
  const k = (v - a) / (b - a);
  const c = ca.map((x, j) => Math.round(x + (cb[j]! - x) * k));
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}

interface Palette {
  gilt: string;
  warn: string;
  muted: string;
  essence: string;
  text: string;
  water: string;
}

function palette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, or: string) => css.getPropertyValue(name).trim() || or;
  return {
    gilt: v('--gilt', '#d9b46a'),
    warn: v('--shift-missed', '#e0503f'),
    muted: v('--muted', '#8d949d'),
    essence: v('--gilt-core', '#fff1c9'),
    text: v('--text', '#e9e5da'),
    water: v('--qi-water', '#7fc7d9'),
  };
}

interface Mark {
  at: [number, number];
  how: Temper;
  t: number;
}

/** The shape the piece takes: a plate for armor and vessels, else a blade (an empty forge too). */
type Shape = 'blade' | 'plate';

/** The forge scene: tempers whatever piece is on the bench while mounted. */
export function ForgeScene({ game, family }: { game: GameState; family: FamilyId | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sat] = useState(() => startForge(game));
  const forge = useRef<Forge>(sat);
  const marks = useRef<Mark[]>([]);
  const motes = useRef<{ x: number; t: number; glow: number }[]>([]);
  const applyLife = useGame((s) => s.applyLife);
  const settings = useSettings();
  const reduced = reducedMotion(settings);
  const reducedRef = useRef(reduced);
  const shape: Shape = family === 'armor' || family === 'vessels' ? 'plate' : 'blade';
  const shapeRef = useRef(shape);
  useEffect(() => {
    reducedRef.current = reduced;
    shapeRef.current = shape;
  }, [reduced, shape]);

  // Standing up keeps the forge stream's place in the game, so a reload continues it.
  useEffect(
    () => () => {
      const f = forge.current;
      applyLife((s) => keepForgeStream(s, f));
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
      const r = tickForge(forge.current, dt);
      forge.current = r.forge;
      for (const e of r.events)
        if (e.type === 'quenched') marks.current.push({ at: [CX, 200], how: e.how, t: r.forge.t });
      setHand(r.forge.hand);
      draw(
        g,
        canvas,
        r.forge,
        pal,
        marks.current,
        motes.current,
        shapeRef.current,
        reducedRef.current,
      );
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
    const f = forge.current;
    const rect = ev.currentTarget.getBoundingClientRect();
    const at: [number, number] = [
      ((ev.clientX - rect.left) / rect.width) * W,
      ((ev.clientY - rect.top) / rect.height) * H,
    ];
    const r = press(f, game.player.id, at);
    forge.current = r.forge;
    setHand(r.forge.hand);
    if (r.sealed) {
      cue('craft-hammer');
      const [x, y] = runeAt(r.sealed.rune);
      marks.current.push({ at: [x, y - 32], how: r.sealed.how, t: f.t });
      motes.current.push({ x, t: f.t, glow: glowAt(f, x) });
    }
    if (r.quenched) {
      cue('craft-quench');
      marks.current.push({ at: [CX, 200], how: r.quenched, t: f.t });
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="furnace-canvas"
      width={W}
      height={H}
      onPointerDown={onDown}
      aria-label="The forge: press a seal into each rune point as its glow passes orange; quench the piece as it passes cherry."
    />
  );
}

/** Where the piece hangs: over the fire to be worked, down in its flames between heats. */
function pieceY(f: Forge, reduced: boolean): number {
  const bob = reduced ? 0 : Math.sin(f.t * 1.6) * 3;
  if (f.phase !== 'fire') return PIECE.y + bob;
  if (reduced) return IN_FIRE_Y;
  const into = f.t - f.phaseAt;
  const sink = Math.min(1, into / 0.35);
  const rise = Math.max(0, (into - (FIRE_S - 0.3)) / 0.3);
  const k = ease(sink) * (1 - ease(Math.min(1, rise)));
  return PIECE.y + (IN_FIRE_Y - PIECE.y) * k + bob;
}

const ease = (k: number) => k * k * (3 - 2 * k);

/** The piece's glow at a place along it: the rules' while worked, the fire's while in it. */
function shown(f: Forge, x: number): number {
  if (f.phase !== 'fire') return glowAt(f, x);
  return 0.55 + 0.35 * Math.min(1, (f.t - f.phaseAt) / FIRE_S);
}

function draw(
  g: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  f: Forge,
  pal: Palette,
  marks: Mark[],
  motes: { x: number; t: number; glow: number }[],
  shape: Shape,
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
  const fire = f.phase === 'fire' ? 1 : 0.5;
  // The hand as the seat's ring.
  arc(g, 262, 0, 1, 3, pal.gilt, 0.14);
  arc(g, 262, 0, Math.max(0.002, f.hand), 3, pal.gilt, 0.85);
  array(g, pal);
  // The true fire's light, then its flames, the piece in them between heats.
  const light = g.createRadialGradient(CX, MOUTH_Y - 70, 10, CX, MOUTH_Y - 70, 220);
  light.addColorStop(0, `rgba(120,200,230,${0.1 + 0.18 * fire})`);
  light.addColorStop(1, 'rgba(120,200,230,0)');
  g.fillStyle = light;
  g.fillRect(0, 0, W, H);
  flames(g, t, fire, reduced, 1);
  const quenchedAway = f.phase === 'quench' && !!f.quenched;
  // The last seal that went into a point, for its flash.
  const lastMote = motes[motes.length - 1];
  const sealX = lastMote && lastMote.t >= f.sealAt ? lastMote.x : null;
  if (!quenchedAway) piece(g, f, shape, pieceY(f, reduced), pal, sealX);
  if (f.phase === 'fire') flames(g, t, fire, reduced, 0.55);
  cauldron(g, fire, pal);
  basin(g, f, pal, reduced);
  // Qi motes rising off a sealed rune.
  prune(motes, t, 0.7);
  for (const m of motes) {
    const q = (t - m.t) / 0.7;
    g.globalAlpha = 1 - q;
    g.fillStyle = glowColor(m.glow);
    for (let i = 0; i < 6; i++) {
      const dx = (i - 2.5) * 7 * (1 + q);
      circle(g, m.x + dx, PIECE.y - 26 - (reduced ? 0 : q * 50) - (i % 3) * 5, 2);
    }
    g.globalAlpha = 1;
  }
  strip(g, f, pal);
  // 妙 a rune that took, 粗 one that blurred, 失 one that failed; the quench's the same.
  prune(marks, t, 0.8);
  g.font = '30px KaiTi, STKaiti, serif';
  g.textAlign = 'center';
  for (const m of marks) {
    const q = (t - m.t) / 0.8;
    g.globalAlpha = 1 - q;
    g.fillStyle = m.how === 'took' ? pal.essence : m.how === 'blurred' ? pal.muted : pal.warn;
    g.fillText(
      m.how === 'took' ? '妙' : m.how === 'blurred' ? '粗' : '失',
      m.at[0],
      m.at[1] - (reduced ? 0 : q * 16),
    );
    g.globalAlpha = 1;
  }
  g.fillStyle = pal.text;
  g.font = '500 17px Georgia, serif';
  const head =
    f.phase === 'fire'
      ? 'In the fire'
      : f.phase === 'quench'
        ? f.quenched
          ? ''
          : 'The last heat: quench it on the cherry'
        : `Heat ${f.heats}`;
  g.fillText(head, CX, 150);
  g.font = '13px Inter, system-ui, sans-serif';
  g.fillStyle = pal.muted;
  g.textAlign = 'left';
  g.fillText(`hand ${f.hand.toFixed(2)}`, 40, 540);
  g.textAlign = 'right';
  g.fillText('seal on the orange · quench on the cherry', 720, 540);
}

/** The array under the piece: two rings of runes, still. */
function array(g: CanvasRenderingContext2D, pal: Palette) {
  g.save();
  g.translate(CX, PIECE.y);
  g.scale(1, 0.32);
  g.globalAlpha = 0.16;
  g.strokeStyle = pal.gilt;
  g.lineWidth = 2;
  for (const r of [190, 150]) {
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.stroke();
  }
  g.globalAlpha = 0.22;
  g.fillStyle = pal.gilt;
  g.font = '26px KaiTi, STKaiti, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const glyphs = '锋坚灵御破凝固利';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.fillText(glyphs[i % 8]!, Math.cos(a) * 170, Math.sin(a) * 170);
  }
  g.restore();
}

/** The true fire's tongues: pale blue at the heart, gold at the edges. */
function flames(
  g: CanvasRenderingContext2D,
  t: number,
  fire: number,
  reduced: boolean,
  alpha: number,
) {
  for (let i = -3; i <= 3; i++) {
    const flicker = reduced ? 1 : 0.85 + 0.15 * Math.sin(t * 6 + i * 1.9);
    const h = (60 + 110 * fire) * (1 - Math.abs(i) * 0.18) * flicker;
    g.beginPath();
    g.moveTo(CX + i * 17 - 13, MOUTH_Y);
    g.quadraticCurveTo(CX + i * 17, MOUTH_Y - h * 1.2, CX + i * 17 + 13, MOUTH_Y);
    g.fillStyle =
      Math.abs(i) <= 1
        ? `rgba(190,235,255,${(0.25 + 0.35 * fire) * alpha})`
        : `rgba(255,205,120,${(0.18 + 0.3 * fire) * alpha})`;
    g.fill();
  }
}

/** The forge's cauldron 炼器炉, on two legs, its mouth full of true fire. */
function cauldron(g: CanvasRenderingContext2D, fire: number, pal: Palette) {
  const y = MOUTH_Y;
  g.fillStyle = '#1f2a2a';
  g.strokeStyle = '#5b7a6e';
  g.lineWidth = 2;
  for (const lx of [-58, 58]) {
    g.beginPath();
    g.moveTo(CX + lx - 6, y + 60);
    g.lineTo(CX + lx - 9, y + 106);
    g.lineTo(CX + lx + 9, y + 106);
    g.lineTo(CX + lx + 6, y + 60);
    g.fill();
    g.stroke();
  }
  g.beginPath();
  g.moveTo(CX - 96, y);
  g.bezierCurveTo(CX - 104, y + 50, CX - 80, y + 76, CX, y + 78);
  g.bezierCurveTo(CX + 80, y + 76, CX + 104, y + 50, CX + 96, y);
  g.closePath();
  g.fill();
  g.stroke();
  g.beginPath();
  g.ellipse(CX, y, 96, 13, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = `rgba(190,235,255,${0.2 + 0.4 * fire})`;
  g.beginPath();
  g.ellipse(CX, y, 80, 8, 0, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 0.55;
  g.fillStyle = pal.gilt;
  g.font = '22px KaiTi, STKaiti, serif';
  g.textAlign = 'center';
  g.fillText('器', CX, y + 46);
  g.globalAlpha = 1;
}

/** The jade basin of spirit-spring water the last heat is quenched in. */
function basin(g: CanvasRenderingContext2D, f: Forge, pal: Palette, reduced: boolean) {
  const { x, y, w } = BASIN;
  const ready = f.phase === 'quench' && !f.quenched;
  g.fillStyle = '#16302a';
  g.strokeStyle = '#6fae96';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x + w / 2, y + 54, x + w, y);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = ready ? 'rgba(160,230,240,0.6)' : 'rgba(127,199,217,0.25)';
  g.beginPath();
  g.ellipse(x + w / 2, y, w / 2 - 3, 7, 0, 0, Math.PI * 2);
  g.fill();
  if (f.quenched && !reduced) {
    const q = (f.t - f.quenched.t) / QUENCH_REST_S;
    if (q < 1) {
      g.globalAlpha = 0.5 * (1 - q);
      g.fillStyle = '#d8f1f5';
      for (let i = 0; i < 6; i++)
        circle(g, x + 20 + i * 15, y - 10 - q * 70 - (i % 3) * 10, 6 + q * 10);
      g.globalAlpha = 1;
    }
  }
  g.fillStyle = pal.muted;
  g.font = '13px Inter, system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText('spirit spring 灵泉', x + w / 2, y + 52);
}

/** The piece by its glow along it, its rune points above it, and the seal as it forms. */
function piece(
  g: CanvasRenderingContext2D,
  f: Forge,
  shape: Shape,
  y: number,
  pal: Palette,
  sealX: number | null,
) {
  const { x0, x1 } = PIECE;
  const half = shape === 'blade' ? 8 : 18;
  const steps = 40;
  // The qi it gives off, tinted by its glow.
  const mid = shown(f, (x0 + x1) / 2);
  const halo = g.createRadialGradient(CX, y, 20, CX, y, 220);
  halo.addColorStop(0, glowColor(mid, 0.22));
  halo.addColorStop(1, glowColor(mid, 0));
  g.fillStyle = halo;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < steps; i++) {
    const xa = x0 + ((x1 - x0) * i) / steps;
    const xb = x0 + ((x1 - x0) * (i + 1)) / steps;
    g.fillStyle = glowColor(shown(f, (xa + xb) / 2));
    const taper = shape === 'blade' && i > steps - 6 ? (steps - i) / 6 : 1;
    g.fillRect(xa, y - half * taper, xb - xa + 0.5, half * 2 * taper);
  }
  if (shape === 'blade') {
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fillRect(x0, y - 1, x1 - x0 - 30, 2);
    g.fillStyle = '#6b5638';
    g.fillRect(x0 - 8, y - 18, 8, 36);
    g.fillStyle = '#2f3a3a';
    g.fillRect(x0 - 58, y - 4, 50, 8);
    g.fillStyle = pal.gilt;
    circle(g, x0 - 62, y, 5);
  } else {
    // The plate's lacing, so it reads as armor or a vessel's body.
    g.strokeStyle = 'rgba(10,8,6,0.35)';
    g.lineWidth = 1;
    for (let x = x0 + 36; x < x1; x += 36) {
      g.beginPath();
      g.moveTo(x, y - half);
      g.lineTo(x, y + half);
      g.stroke();
    }
  }
  if (f.phase !== 'work') return;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const lift = y - PIECE.y;
  for (const r of f.runes) {
    const [x, ry0] = runeAt(r);
    const ry = ry0 + lift;
    if (r.state === 'took') {
      g.fillStyle = 'rgba(255,217,138,0.75)';
      g.font = '15px KaiTi, STKaiti, serif';
      g.fillText(r.glyph, x, y + 1);
      continue;
    }
    if (r.state === 'failed') {
      g.strokeStyle = '#0a0806';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x - 6, y - 6);
      g.lineTo(x + 2, y + 2);
      g.lineTo(x - 2, y + 7);
      g.stroke();
      continue;
    }
    if (r.state === 'blurred' || r.state === 'left') {
      g.fillStyle = 'rgba(141,148,157,0.45)';
      g.font = '18px KaiTi, STKaiti, serif';
      g.fillText(r.glyph, x, ry);
      continue;
    }
    const glow = glowAt(f, x);
    const inBand = glow >= SEAL_BAND[0] && glow <= SEAL_BAND[1];
    g.strokeStyle = inBand ? pal.essence : 'rgba(255,255,255,0.2)';
    g.lineWidth = inBand ? 2 : 1;
    g.beginPath();
    g.arc(x, ry, SEAL_REACH - 6, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = glowColor(glow, 0.6);
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, ry + SEAL_REACH - 6);
    g.lineTo(x, y - half);
    g.stroke();
    g.fillStyle = glowColor(glow);
    g.font = '20px KaiTi, STKaiti, serif';
    g.fillText(r.glyph, x, ry + 1);
  }
  // The hand seal 印 pressed down onto the point it went into.
  const since = f.t - f.sealAt;
  if (since < SEAL_S && sealX !== null) {
    const x = sealX;
    const s = 46 * (1 - (since / SEAL_S) * 0.6);
    g.globalAlpha = 1 - since / SEAL_S;
    g.strokeStyle = pal.gilt;
    g.lineWidth = 2;
    g.strokeRect(x - s / 2, PIECE.y - 26 + lift - s / 2, s, s);
    g.globalAlpha = 1;
  }
  g.textBaseline = 'alphabetic';
}

/** The glow's colors, dark to white, with the seal's band and the quench's marked. */
function strip(g: CanvasRenderingContext2D, f: Forge, pal: Palette) {
  const x0 = 150;
  const w = 460;
  const y = 54;
  for (let i = 0; i < 92; i++) {
    g.fillStyle = glowColor(i / 91);
    g.fillRect(x0 + (w * i) / 92, y, w / 92 + 0.6, 12);
  }
  const X = (v: number) => x0 + w * v;
  g.lineWidth = 2;
  g.strokeStyle = pal.essence;
  g.strokeRect(X(SEAL_BAND[0]), y - 4, X(SEAL_BAND[1]) - X(SEAL_BAND[0]), 20);
  g.strokeStyle = pal.water;
  g.strokeRect(X(QUENCH_BAND[0]), y - 4, X(QUENCH_BAND[1]) - X(QUENCH_BAND[0]), 20);
  g.font = '15px KaiTi, STKaiti, serif';
  g.textAlign = 'center';
  g.fillStyle = pal.essence;
  g.fillText('印 seal', X((SEAL_BAND[0] + SEAL_BAND[1]) / 2), y + 38);
  g.fillStyle = pal.water;
  g.fillText('淬 quench', X((QUENCH_BAND[0] + QUENCH_BAND[1]) / 2), y + 38);
  g.fillStyle = pal.muted;
  g.font = '12px Inter, system-ui, sans-serif';
  g.textAlign = 'left';
  g.fillText('dark', x0, y - 10);
  g.textAlign = 'right';
  g.fillText('white', x0 + w, y - 10);
  // A tick for each live point's glow, or the whole piece's at the quench.
  const ticks =
    f.phase === 'quench'
      ? f.quenched
        ? []
        : [glowAt(f, 0)]
      : f.phase === 'work'
        ? f.runes.filter((r) => r.state === 'raised').map((r) => glowAt(f, r.x))
        : [];
  g.fillStyle = pal.text;
  for (const v of ticks) {
    if (v < 0) continue;
    g.beginPath();
    g.moveTo(X(v), y + 14);
    g.lineTo(X(v) - 5, y + 24);
    g.lineTo(X(v) + 5, y + 24);
    g.fill();
  }
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
