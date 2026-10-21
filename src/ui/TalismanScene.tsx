// Sitting at the talisman desk (design § Professions, Crafts, thin, the hands-on version; K5, its
// talk and `docs/mockups/talisman-one-breath-study.html`): one-breath drawing 一笔符. A strip of
// yellow paper with the talisman's path on it, faint; press on the vermilion head and draw the
// whole talisman without lifting, as the brush's qi ink thins and the line narrows. The ink left
// stands as a stem beside the paper; the hand is the seat's gold ring round it. The rules live in
// core/talisman.ts; this draws them and hands the hand to the bench (ui/furnace.ts). One canvas,
// the middle panel's, with no blur: it runs while you sit and the tab is visible, and stops
// otherwise. Under reduced motion a sheet doesn't slide in or away and the flawless gold doesn't
// run along the line. The art overhaul paints it properly.
import { useEffect, useRef, useState } from 'react';
import { DESK_BOX, LAY_S, PAPER, SHOW_S } from '../content/talisman.ts';
import {
  bandAt,
  brushDown,
  brushMove,
  brushUp,
  deskFamily,
  flawless,
  pathOf,
  startDesk,
  tickDesk,
  type Desk,
  type Pt,
  type SheetEnd,
} from '../core/talisman.ts';
import type { GameState } from '../core/state.ts';
import { setHand } from './furnace.ts';
import { reducedMotion, useSettings } from './settings.ts';
import { canvasDensity } from './stage.ts';
import { cue } from './cues.ts';

const { w: W, h: H } = DESK_BOX;
const CX = PAPER.x + PAPER.w / 2;
const CY = PAPER.y + PAPER.h / 2;
/** The seat's ring: 65% of a circle, open toward the floor, round the paper. */
const RING = 270;
const SPAN = Math.PI * 2 * 0.65;
const START = Math.PI / 2 + (Math.PI * 2 - SPAN) / 2;
const ang = (v: number) => START + SPAN * v;
/** The brush's ink, a stem right of the paper. */
const STEM = { x: PAPER.x + PAPER.w + 34, y: PAPER.y + 60, h: PAPER.h - 120 } as const;

/** How the last sheet's end reads on it. */
const ENDS: Record<SheetEnd, string> = {
  drawn: '成',
  snapped: '断 the qi snapped',
  lifted: '散 the breath broke',
  dry: '枯 the ink ran dry',
};

interface Palette {
  gilt: string;
  muted: string;
  text: string;
  warn: string;
}

function palette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, or: string) => css.getPropertyValue(name).trim() || or;
  return {
    gilt: v('--gilt', '#d9b46a'),
    muted: v('--muted', '#8d949d'),
    text: v('--text', '#e9e5da'),
    warn: v('--shift-missed', '#e0503f'),
  };
}

/** The desk scene: draws talismans of the family at the bench's front while mounted. */
export function TalismanScene({ game, family }: { game: GameState; family: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sat] = useState(() => startDesk(game, family ?? 'strikes'));
  const desk = useRef<Desk>(sat);
  const who = game.player.id;
  const settings = useSettings();
  const reduced = reducedMotion(settings);
  const reducedRef = useRef(reduced);
  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);
  // The bench's front changed family: its path from the next sheet on.
  useEffect(() => {
    desk.current = deskFamily(desk.current, family ?? 'strikes');
  }, [family]);

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
      desk.current = tickDesk(desk.current, dt);
      setHand(desk.current.hand);
      draw(g, canvas, desk.current, pal, reducedRef.current);
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

  const at = (ev: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const rect = ev.currentTarget.getBoundingClientRect();
    return [
      ((ev.clientX - rect.left) / rect.width) * W,
      ((ev.clientY - rect.top) / rect.height) * H,
    ];
  };
  const onDown = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const d = brushDown(desk.current, who, at(ev));
    if (d.phase === 'draw') {
      ev.currentTarget.setPointerCapture(ev.pointerId);
      cue('craft-brush');
    }
    desk.current = d;
  };
  const onMove = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    if (desk.current.phase !== 'draw') return;
    desk.current = brushMove(desk.current, who, at(ev));
    setHand(desk.current.hand);
    // The sheet drawn whole in one breath snaps alight.
    if (desk.current.phase === 'show' && desk.current.last?.end === 'drawn') cue('craft-talisman');
  };
  const onUp = () => {
    desk.current = brushUp(desk.current, who);
    setHand(desk.current.hand);
  };

  return (
    <canvas
      ref={canvasRef}
      className="furnace-canvas"
      width={W}
      height={H}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      aria-label="The talisman desk: press on the vermilion head and draw the whole talisman in one breath, without lifting."
    />
  );
}

function draw(
  g: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  d: Desk,
  pal: Palette,
  reduced: boolean,
) {
  const k = canvasDensity();
  if (canvas.width !== Math.round(W * k)) {
    canvas.width = Math.round(W * k);
    canvas.height = Math.round(H * k);
  }
  g.setTransform(k, 0, 0, k, 0, 0);
  g.clearRect(0, 0, W, H);
  // The seat's ring, the hand filling it in gold.
  g.lineCap = 'round';
  g.lineWidth = 3;
  g.strokeStyle = 'rgba(255,255,255,0.07)';
  g.beginPath();
  g.arc(CX, CY, RING, ang(0), ang(1));
  g.stroke();
  if (d.hand > 0.005) {
    g.strokeStyle = pal.gilt;
    g.beginPath();
    g.arc(CX, CY, RING, ang(0), ang(d.hand));
    g.stroke();
  }
  // The ink left in the brush, a stem right of the paper.
  g.fillStyle = 'rgba(255,255,255,0.06)';
  g.fillRect(STEM.x, STEM.y, 6, STEM.h);
  g.fillStyle = d.ink > 0.25 ? '#c8402c' : pal.warn;
  g.fillRect(STEM.x, STEM.y + STEM.h * (1 - d.ink), 6, STEM.h * d.ink);
  g.fillStyle = pal.muted;
  g.font = '13px Inter, system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText('墨', STEM.x + 3, STEM.y + STEM.h + 22);

  // The sheet slides in as it lays and away once it has shown.
  const since = d.t - d.phaseAt;
  const slide = reduced
    ? 0
    : d.phase === 'lay'
      ? (1 - Math.min(1, since / LAY_S)) * 300
      : d.phase === 'show' && since > SHOW_S * 0.6
        ? -((since - SHOW_S * 0.6) / (SHOW_S * 0.4)) * 300
        : 0;
  const alpha = Math.max(0, 1 - Math.abs(slide) / 300);
  g.save();
  g.globalAlpha = alpha;
  g.translate(slide, 0);
  const broke = d.phase === 'show' && d.last?.end !== 'drawn';
  g.fillStyle = broke ? '#6d6450' : '#d8b65e';
  g.fillRect(PAPER.x, PAPER.y, PAPER.w, PAPER.h);
  g.strokeStyle = 'rgba(120,70,20,0.35)';
  g.lineWidth = 2;
  g.strokeRect(PAPER.x + 8, PAPER.y + 8, PAPER.w - 16, PAPER.h - 16);
  // The path's ghost.
  const path = pathOf(d.family);
  g.strokeStyle = 'rgba(160,60,30,0.24)';
  g.lineWidth = 2;
  g.setLineDash([3, 6]);
  line(g, path);
  g.setLineDash([]);
  // The head, while the sheet waits for the brush.
  if (d.phase === 'ready') {
    g.fillStyle = '#c8402c';
    g.beginPath();
    g.arc(path[0]![0], path[0]![1], 9, 0, Math.PI * 2);
    g.fill();
  }
  // The ink laid: as wide as the ink it was laid with; off the line brown and thin.
  for (let i = 1; i < d.stroke.length; i++) {
    const a = d.stroke[i - 1]!;
    const b = d.stroke[i]!;
    g.strokeStyle = broke ? '#3b332a' : b.on ? '#a3241a' : '#7a5a3a';
    g.lineWidth = b.on ? 3 + b.ink * 8 : 2;
    g.beginPath();
    g.moveTo(a.at[0], a.at[1]);
    g.lineTo(b.at[0], b.at[1]);
    g.stroke();
  }
  // Flawless: one gold pass along the finished line.
  if (d.phase === 'show' && flawless(d) && !reduced && since < SHOW_S * 0.6) {
    const end = Math.floor((since / (SHOW_S * 0.6)) * path.length);
    g.strokeStyle = 'rgba(255,215,120,0.9)';
    g.lineWidth = 4;
    line(g, path.slice(Math.max(0, end - 30), end));
  }
  g.restore();
  // The band round the brush while it draws.
  const tip = d.stroke[d.stroke.length - 1];
  if (d.phase === 'draw' && tip) {
    g.strokeStyle = 'rgba(217,180,106,0.45)';
    g.lineWidth = 1;
    g.beginPath();
    g.arc(tip.at[0], tip.at[1], bandAt(d.ink), 0, Math.PI * 2);
    g.stroke();
  }
  // How the last sheet came out.
  if (d.phase === 'show' && d.last) {
    g.fillStyle = d.last.end === 'drawn' ? pal.gilt : pal.warn;
    g.font = '22px "Cormorant Garamond", Georgia, serif';
    g.textAlign = 'center';
    const word = flawless(d) ? '妙 flawless' : ENDS[d.last.end];
    g.fillText(word, CX, PAPER.y + PAPER.h + 20);
  } else if (d.phase === 'ready' || d.phase === 'lay') {
    g.fillStyle = pal.muted;
    g.font = '14px Inter, system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText(`Sheet ${d.sheets + 1}`, CX, PAPER.y + PAPER.h + 20);
  }
}

function line(g: CanvasRenderingContext2D, pts: readonly Pt[]) {
  if (pts.length < 2) return;
  g.beginPath();
  g.moveTo(pts[0]![0], pts[0]![1]);
  for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
  g.stroke();
}
