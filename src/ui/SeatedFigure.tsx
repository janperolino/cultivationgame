// The Abode's cultivator (design § UI and screens, less spreadsheet; § Cultivation, Attended
// seclusion): a silhouette whose pose follows the current hour of the day wheel: seated
// cross-legged in seclusion on qi, body and soul hours, bowed over a scroll in a study hour,
// standing in a stance drilling a technique in a practice hour, and slumped asleep at 子 and 丑.
// The dantian glows below the navel in the crack light, since it is qi. Over the silhouette a
// canvas (ui/qiCanvas.ts) draws the qi drifting in, circulating and settling, and the orbs to draw
// in by hover, a finger or the breathe key (space or B). Beside it, the seat's meter: qi speed,
// focus, heat and a Breathe button.
import { useEffect, useMemo, useRef } from 'react';
import { POINTER_REACH } from '../content/attention.ts';
import { circulation, RARITY_SPARKS } from '../content/circulation.ts';
import type { HourKind } from '../content/hours.ts';
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
import { effectiveWheel, hourOfDay } from '../core/wheel.ts';
import { formatPercent } from './format.ts';
import { FIGURE_BOX, QiCanvas, type FigureFrame, type FigureState } from './qiCanvas.ts';
import { holdStill, onBreath, showAbode, useSeat } from './seat.ts';
import { reducedMotion, useSettings } from './settings.ts';
import { useGame } from './store.ts';

// One closed shape, head apart: shoulders, arms resting into the lap, and crossed legs. The two
// small inner shapes are the gaps between arm and waist, cut out by the even-odd fill.
const SEATED =
  'M0 -31 L-5 -31 C-7 -27 -13 -26 -19 -24 C-26 -21 -28 -14 -28 -6 C-28 2 -30 9 -33 15 ' +
  'C-37 20 -44 22 -49 26 C-54 30 -53 37 -46 39 C-32 43 -14 42 0 42 ' +
  'C14 42 32 43 46 39 C53 37 54 30 49 26 C44 22 37 20 33 15 C30 9 28 2 28 -6 ' +
  'C28 -14 26 -21 19 -24 C13 -26 7 -27 5 -31 Z ' +
  'M-20 -13 C-18 -5 -17 2 -14 8 C-18 6 -21 -3 -20 -13 Z ' +
  'M20 -13 C18 -5 17 2 14 8 C18 6 21 -3 20 -13 Z';

// Standing in a horse stance: one palm thrust out level, the other fist drawn back to the hip.
const STANDING =
  'M-6 -41 L6 -41 C10 -40 14 -39 17 -37 L50 -37 C55 -37 55 -30 50 -30 L18 -29 ' +
  'C15 -18 14 -8 13 -2 C20 4 28 14 34 28 L37 42 L26 42 C23 30 16 18 8 12 ' +
  'C4 10 -4 10 -8 12 C-16 18 -23 30 -26 42 L-37 42 L-34 28 C-28 14 -20 4 -13 -2 ' +
  'L-20 -4 C-25 -10 -26 -24 -22 -33 C-19 -38 -12 -40 -6 -41 Z';

type Pose = 'seated' | 'study' | 'practice' | 'asleep' | 'tempering' | 'nourishing';

const POSES: Record<HourKind, Pose> = {
  qi: 'seated',
  body: 'tempering',
  soul: 'nourishing',
  study: 'study',
  practice: 'practice',
  sleep: 'asleep',
};

const POSE_WORDS: Record<Pose, string> = {
  seated: 'sits in seclusion',
  study: 'bends over a scroll',
  practice: 'drills a technique',
  asleep: 'sleeps',
  tempering: 'tempers the body',
  nourishing: 'nourishes the soul',
};

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

/** Holding breathe, with whatever life is open now. */
function stillNow(still: boolean) {
  const g = useGame.getState().game;
  if (g) holdStill(g, still);
}

/** Whether a key press belongs to a field or a control rather than to the figure. */
function typing(target: EventTarget | null, key: string): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  if (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return true;
  // Space presses a focused button or link; B never does.
  return key === ' ' && ['BUTTON', 'A', 'SUMMARY'].includes(el.tagName);
}

export function SeatedFigure({ game }: { game: GameState }) {
  const c = game.player;
  const speed = useGame((s) => s.speed);
  const breatheKey = useGame((s) => s.breathe);
  const catchOrb = useGame((s) => s.catchOrb);
  const settings = useSettings();
  const reduced = reducedMotion(settings);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef<QiCanvas | null>(null);

  const pose: Pose = game.ended
    ? 'seated'
    : POSES[effectiveWheel(c)[hourOfDay(game.calendar.day)] ?? 'qi'];
  const fill = Math.min(1.5, Math.max(0, barFill(c.qi)));
  const level = Math.min(1, fill);
  const state = figureState(game, useSeat.getState().attention);
  const standing = pose === 'practice';
  // The dantian sits below the navel, just above the folded hands; higher when standing.
  const dantianY = standing ? -4 : 9;

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

  // The breathe key: space or B draws in the nearest orb; holding it is Still Pool's rest.
  useEffect(() => {
    const down = (ev: KeyboardEvent) => {
      const key = ev.key.toLowerCase();
      if ((key !== ' ' && key !== 'b') || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (typing(ev.target, ev.key)) return;
      ev.preventDefault();
      if (ev.repeat) stillNow(true);
      else breatheKey();
    };
    const up = (ev: KeyboardEvent) => {
      const key = ev.key.toLowerCase();
      if (key === ' ' || key === 'b') stillNow(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [breatheKey]);

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
        className={`seated pose-${pose} is-${state}`}
        viewBox={box}
        role="img"
        aria-label={`${c.name} ${POSE_WORDS[pose]}; the dantian holds qi at ${formatPercent(fill)} of the bar.`}
      >
        <defs>
          <radialGradient id="dantian-aura">
            <stop offset="0%" className="dantian-stop-mid" />
            <stop offset="100%" className="dantian-stop-edge" />
          </radialGradient>
        </defs>
        <circle className="seated-aura" cx={0} cy={dantianY} r={38 + 14 * level} />
        {pose === 'nourishing' && <circle className="soul-halo" cx={0} cy={-41} r={17} />}
        <g className="figure-head">
          <circle
            className="seated-head"
            cx={0}
            cy={standing ? -51 : -41}
            r={standing ? 9.5 : 10.5}
          />
        </g>
        <path className="seated-body" d={standing ? STANDING : SEATED} fillRule="evenodd" />
        {pose === 'study' && (
          <rect className="figure-scroll" x={-15} y={3} width={30} height={7} rx={3} />
        )}
        {pose === 'asleep' && (
          <text className="figure-sleep" x={16} y={-50}>
            z
          </text>
        )}
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
  return 'Draw orbs in by hovering, with a finger, or with space or B. On the inhale they are worth more.';
}

/** Qi speed, focus and heat beside the figure, and a Breathe button for every hand. */
export function SeatMeter({ game }: { game: GameState }) {
  const c = game.player;
  const a = useSeat((s) => s.attention);
  const breathe = useGame((s) => s.breathe);
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
      <button type="button" className="button button-small" onClick={breathe}>
        Breathe <kbd>B</kbd>
      </button>
    </div>
  );
}
