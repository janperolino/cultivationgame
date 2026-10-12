// The Abode's cultivator (design § UI and screens; § Cultivation, Attended seclusion): a
// silhouette seated cross-legged, whatever the hour (Jan's call after P1.10; the hour will show
// another way). The dantian glows below the navel in the crack light, since it is qi. Over the
// silhouette a canvas (ui/qiCanvas.ts) draws the qi drifting in, circulating and settling, and the
// orbs to draw in by hover or a finger. Beside it, the seat's meter: qi speed, focus and heat.
import { useEffect, useMemo, useRef } from 'react';
import { POINTER_REACH } from '../content/attention.ts';
import { circulation, RARITY_SPARKS } from '../content/circulation.ts';
import { methodCirculation } from '../content/methods.ts';
import {
  attentionCeiling,
  heatLimit,
  heatUnsettled,
  hourTint,
  onDantian,
  seatOf,
  seatTutorial,
  type Attention,
} from '../core/attention.ts';
import { barFill, barSize, dayRates } from '../core/cultivation.ts';
import { daysPerRealMs } from '../core/loop.ts';
import { ladderMethod } from '../core/methods.ts';
import type { Cultivator, GameState } from '../core/state.ts';
import { stats } from '../core/stats.ts';
import { hourOfDay } from '../core/wheel.ts';
import { formatPercent } from './format.ts';
import {
  FIGURE_BOX,
  FIGURE_HEAD,
  FIGURE_PATH,
  QiCanvas,
  type FigureFrame,
  type FigureState,
} from './qiCanvas.ts';
import { holdStill, onBreath, showAbode, useSeat } from './seat.ts';
import { reducedMotion, useSettings } from './settings.ts';
import { useGame } from './store.ts';

/** One mote stands for this share of the bar, so motes come at the real qi rate. */
const MOTES_PER_BAR = 400;

function figureState(game: GameState, a: Attention | null): FigureState {
  const c = game.player;
  if (!ladderMethod(c, 'qi')) return 'dormant';
  if (game.calendar.day < c.qi.unsettledUntil || (a && heatUnsettled(a))) return 'unsettled';
  return barFill(c.qi) >= 1 ? 'full' : 'settled';
}

/** What the canvas draws, from the game and the seat. */
function frameOf(
  game: GameState,
  a: Attention | null,
  speed: number,
  reduced: boolean,
): FigureFrame {
  const c = game.player;
  const m = ladderMethod(c, 'qi');
  const state = figureState(game, a);
  const seat = a ? seatOf(a, c) : undefined;
  const qiPerDay = dayRates(c, game.calendar.day, [], seat).qi;
  const barPerSecond = (qiPerDay * daysPerRealMs(game) * 1000 * speed) / barSize(c.qi);
  const motes = state === 'dormant' ? 3 : Math.min(12, Math.max(0.6, barPerSecond * MOTES_PER_BAR));
  return {
    state,
    fill: Math.min(1.5, Math.max(0, barFill(c.qi))),
    motes: game.ended ? 0 : motes,
    circulation: circulation(m ? methodCirculation(m) : 'orbit'),
    sparks: RARITY_SPARKS[m?.rarity ?? 'white'],
    tint: hourTint(hourOfDay(game.calendar.day)).tint,
    heat: a ? Math.min(1, a.heat / heatLimit(c)) : 0,
    reach: POINTER_REACH * (1 + stats(c).breathReach),
    reduced,
  };
}

export function SeatedFigure({ game }: { game: GameState }) {
  const c = game.player;
  const speed = useGame((s) => s.speed);
  const catchOrb = useGame((s) => s.catchOrb);
  const settings = useSettings();
  const reduced = reducedMotion(settings);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef<QiCanvas | null>(null);

  const fill = Math.min(1.5, Math.max(0, barFill(c.qi)));
  const level = Math.min(1, fill);
  const state = figureState(game, useSeat.getState().attention);

  // Orbs come only while the figure is on screen.
  useEffect(() => {
    showAbode(true);
    return () => showAbode(false);
  }, []);

  // The canvas runs while the tab is visible, and stops drawing when it is hidden.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const e = new QiCanvas(canvas, () => useSeat.getState().attention);
    engine.current = e;
    const visibility = () => (document.visibilityState === 'visible' ? e.start() : e.stop());
    visibility();
    document.addEventListener('visibilitychange', visibility);
    const off = onBreath((b) => e.breath(b));
    return () => {
      e.stop();
      off();
      document.removeEventListener('visibilitychange', visibility);
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    engine.current?.setFrame(frameOf(game, useSeat.getState().attention, speed, reduced));
  }, [game, speed, reduced]);

  useEffect(() => {
    engine.current?.refreshPalette();
  }, [settings]);

  /** The pointer in the figure's units. */
  const toFigure = (ev: React.PointerEvent): [number, number] => {
    const r = ev.currentTarget.getBoundingClientRect();
    return [
      FIGURE_BOX.x + ((ev.clientX - r.left) / r.width) * FIGURE_BOX.w,
      FIGURE_BOX.y + ((ev.clientY - r.top) / r.height) * FIGURE_BOX.h,
    ];
  };

  const onPointer = (ev: React.PointerEvent, down = false) => {
    const mouse = ev.pointerType === 'mouse';
    if (!mouse && !down && ev.buttons === 0) return;
    const [x, y] = toFigure(ev);
    if (engine.current) engine.current.pointer = mouse ? [x, y] : null;
    holdStill(game, onDantian(x, y));
    catchOrb(x, y, reduced);
  };

  const onLeave = () => {
    if (engine.current) engine.current.pointer = null;
    holdStill(game, false);
  };

  const box = `${FIGURE_BOX.x} ${FIGURE_BOX.y} ${FIGURE_BOX.w} ${FIGURE_BOX.h}`;
  return (
    <div
      className="seat-figure"
      onPointerMove={(ev) => onPointer(ev)}
      onPointerDown={(ev) => onPointer(ev, true)}
      onPointerLeave={onLeave}
      onPointerUp={(ev) => ev.pointerType !== 'mouse' && onLeave()}
      onPointerCancel={onLeave}
    >
      <svg
        className={`seated is-${state}`}
        viewBox={box}
        role="img"
        aria-label={`${c.name} sits in seclusion; the dantian holds qi at ${formatPercent(fill)} of the bar.`}
      >
        <defs>
          <radialGradient id="dantian-aura">
            <stop offset="0%" className="dantian-stop-mid" />
            <stop offset="100%" className="dantian-stop-edge" />
          </radialGradient>
        </defs>
        <circle className="seated-aura" cx={0} cy={9} r={38 + 14 * level} />
        <circle className="seated-head" cx={FIGURE_HEAD.x} cy={FIGURE_HEAD.y} r={FIGURE_HEAD.r} />
        <path className="seated-body" d={FIGURE_PATH} fillRule="evenodd" />
      </svg>
      <canvas ref={canvasRef} className="seat-canvas" aria-hidden="true" />
    </div>
  );
}

/** The words for the seat now, under the meter. */
function seatHint(c: Cultivator, a: Attention): string {
  if (!ladderMethod(c, 'qi')) return 'Without a method the qi drifts close and slides off.';
  if (!a.attended) return 'Away: the seat runs as it always has. Touch the game to sit with it.';
  if (heatUnsettled(a)) {
    const s = Math.ceil(a.unsettledUntil - a.t);
    return `Your meridians burn and the bonus is gone for ${s} s. Breathe steadily, not greedily.`;
  }
  if (seatTutorial(c)) {
    return 'Your meridians are too new to hold more than being here gives. From the fourth layer, every orb you draw in counts.';
  }
  return 'Draw orbs in by hovering over them or with a finger. On the inhale they are worth more.';
}

/** Qi speed, focus and heat beside the figure. */
export function SeatMeter({ game }: { game: GameState }) {
  const c = game.player;
  const a = useSeat((s) => s.attention);
  const view = useMemo(() => {
    if (!a) return null;
    const seat = seatOf(a, c);
    return {
      factor: seat.factor,
      focus: a.focus,
      heat: Math.min(1, a.heat / heatLimit(c)),
      ceiling: 1 + attentionCeiling(c),
      hint: seatHint(c, a),
    };
  }, [a, c]);
  if (!view || game.ended) return null;
  return (
    <div className="seat-meter">
      <div className="seat-speed">
        <span className="caption">Attention</span>
        <strong>×{view.factor.toFixed(2)}</strong>
        <span className="caption">of ×{view.ceiling.toFixed(2)}</span>
      </div>
      <div
        className="seat-bar"
        role="meter"
        aria-label="Focus"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(view.focus * 100)}
      >
        <div className="seat-bar-fill" style={{ width: `${view.focus * 100}%` }} />
      </div>
      <div className="seat-bar is-heat" aria-label={`Heat ${Math.round(view.heat * 100)}%`}>
        <div className="seat-bar-fill" style={{ width: `${view.heat * 100}%` }} />
      </div>
      <p className="caption">{view.hint}</p>
    </div>
  );
}
