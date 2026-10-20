// Cultivate's cultivator (design § UI and screens; § Cultivation, Attended seclusion): a
// silhouette seated cross-legged, whatever the hour (Jan's call after P1.10; the hour will show
// another way). The dantian glows below the navel in the crack light, since it is qi. Over the
// silhouette a canvas (ui/qiCanvas.ts) draws the qi drifting in, circulating and settling, and the
// orbs to draw in by hover or a finger. Beside it, the seat's meter: qi speed, focus and heat. An
// attended breakthrough on any ladder plays here as a scene (ui/scene.ts), a wind-up and then the
// race: a tap or click on the figure as the spark passes each gate, and the meter tells the scene
// instead. Behind it all, over the whole seat panel, the sun of the hour (ui/sunCanvas.ts): the
// figure is a sundial, and the caption under it names the hour in words.
import { ratesHere } from '../core/life.ts';
import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { HEAT_UNSETTLED_S, POINTER_REACH } from '../content/attention.ts';
import { circulation, RARITY_SPARKS } from '../content/circulation.ts';
import { MAX_ODDS, SCENE_ODDS_CAP, SCENE_ODDS_STEP } from '../content/cultivation.ts';
import { methodCirculation } from '../content/methods.ts';
import { realm } from '../content/realms.ts';
import {
  attentionCeiling,
  breathCycle,
  heatLimit,
  heatUnsettled,
  hourTint,
  onDantian,
  seatOf,
  type Attention,
} from '../core/attention.ts';
import { barFill, barSize } from '../core/cultivation.ts';
import { daysPerRealMs } from '../core/loop.ts';
import { ladderMethod } from '../core/methods.ts';
import { sceneBonus, windingUp } from '../core/scene.ts';
import type { Cultivator, GameState } from '../core/state.ts';
import { stats } from '../core/stats.ts';
import { hourOfDay } from '../core/wheel.ts';
import { formatLadder, formatPercent, LADDER_LABELS } from './format.ts';
import {
  FIGURE_BOX,
  FIGURE_HEAD,
  FIGURE_PATH,
  QI_PAD,
  QiCanvas,
  type FigureFrame,
  type FigureState,
} from './qiCanvas.ts';
import { attemptOf, sceneTime, tapGate, useScene, type ScenePlay } from './scene.ts';
import { holdStill, noteDay, onBreath, seatTime, showFigure, useSeat } from './seat.ts';
import { reducedMotion, useSettings } from './settings.ts';
import { SunCanvas } from './sunCanvas.ts';
import { useGame } from './store.ts';
import { Why } from './widgets.tsx';

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
  const qiPerDay = ratesHere(game, seat).qi;
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
    breath: breathCycle(c),
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
  const boxRef = useRef<HTMLDivElement>(null);
  const engine = useRef<QiCanvas | null>(null);
  const sunRef = useRef<HTMLCanvasElement>(null);
  const sunEngine = useRef<SunCanvas | null>(null);

  const fill = Math.min(1.5, Math.max(0, barFill(c.qi)));
  const level = Math.min(1, fill);
  const state = figureState(game, useSeat.getState().attention);

  // Orbs come only while the figure is on screen.
  useEffect(() => {
    showFigure(true);
    return () => showFigure(false);
  }, []);

  // The canvases run while the tab is visible, and stop drawing when it is hidden.
  useEffect(() => {
    const canvas = canvasRef.current;
    const sunCanvas = sunRef.current;
    if (!canvas || !sunCanvas) return;
    const sun = new SunCanvas(sunCanvas, () => boxRef.current);
    sunEngine.current = sun;
    const e = new QiCanvas(
      canvas,
      () => useSeat.getState().attention,
      (a) => seatTime(a),
      () => useScene.getState().play,
      () => sun.light(),
    );
    engine.current = e;
    const visibility = () => {
      if (document.visibilityState === 'visible') {
        e.start();
        sun.start();
      } else {
        e.stop();
        sun.stop();
      }
    };
    visibility();
    document.addEventListener('visibilitychange', visibility);
    const off = onBreath((b) => e.breath(b));
    return () => {
      e.stop();
      sun.stop();
      sunEngine.current = null;
      off();
      document.removeEventListener('visibilitychange', visibility);
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    noteDay(game.calendar.day);
    if (sunEngine.current) sunEngine.current.fill = barFill(game.player.qi);
    engine.current?.setFrame(frameOf(game, useSeat.getState().attention, speed, reduced));
  }, [game, speed, reduced]);

  useEffect(() => {
    engine.current?.refreshPalette();
    sunEngine.current?.refreshPalette();
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
    // While a scene plays, a tap or click is a try at the gate, and nothing else.
    if (useScene.getState().play) {
      if (down) tapGate();
      return;
    }
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
    <>
      <canvas ref={sunRef} className="seat-sun" aria-hidden="true" />
      <div
        ref={boxRef}
        className="seat-figure"
        onPointerMove={(ev) => onPointer(ev)}
        onPointerDown={(ev) => onPointer(ev, true)}
        onPointerLeave={onLeave}
        onPointerUp={(ev) => ev.pointerType !== 'mouse' && onLeave()}
        onPointerCancel={onLeave}
      >
        <FocusRing game={game} box={box} />
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
        <canvas
          ref={canvasRef}
          className="seat-canvas"
          style={{ '--qi-pad': QI_PAD } as CSSProperties}
          aria-hidden="true"
        />
      </div>
    </>
  );
}

/** The words for the seat now, under the meter; `why` adds the "?" on the inhale and the heat. */
function seatHint(c: Cultivator, a: Attention): { text: string; why: boolean } {
  const say = (text: string) => ({ text, why: false });
  if (!ladderMethod(c, 'qi')) return say('Without a method the qi drifts close and slides off.');
  if (!a.attended) {
    return say('Away: the seat runs as it always has. Touch the game to sit with it.');
  }
  if (heatUnsettled(a)) {
    const s = Math.ceil(a.unsettledUntil - a.t);
    return say(`Your meridians burn and the bonus is gone for ${s} s. Breathe steadily.`);
  }
  return { text: 'Draw orbs in by hovering over them.', why: true };
}

/** What the scene says as it ends: the step taken, or what the gate holding cost. */
function outcomeLine(game: GameState, play: ScenePlay): string {
  const o = play.outcome!;
  const l = game.player[play.ladder];
  const label = LADDER_LABELS[play.ladder];
  if (o.success) {
    return o.major
      ? `Through the gate: ${label}, ${realm(l.realm).name}.`
      : `Through: ${label}, ${formatLadder(l)}.`;
  }
  const fuel = play.ladder === 'qi' ? 'qi' : play.ladder === 'body' ? 'tempering' : 'nourishment';
  if (!o.major) {
    return `The gate holds. A fifth of the ${fuel} scatters, and it will not settle for a few days.`;
  }
  return `The gate holds. ${play.ladder === 'qi' ? 'The pill and the offerings are' : 'The offerings are'} spent, half the ${fuel} scatters, and it will take years to mend.`;
}

/** The meter during a scene: the gates as six marks, the odds, and what to do. */
function SceneMeter({ game, play }: { game: GameState; play: ScenePlay }) {
  const bonus = sceneBonus(play.scene);
  // The bar fills on while the scene plays, so the odds are read live, as the roll will be.
  const odds = play.outcome
    ? play.outcome.odds
    : (attemptOf(game, play.ladder, play.offerings)?.odds ?? play.odds) + bonus;
  // The meter renders with the game's ticks, often enough to tell the wind-up from the race.
  const winding = !play.outcome && windingUp(sceneTime(play));
  const label = LADDER_LABELS[play.ladder].toLowerCase();
  return (
    <div className={`seat-meter scene-meter is-${play.ladder}`} aria-live="polite">
      <div className="seat-speed">
        <span className="caption">
          {play.major ? 'Breaking through the gate' : 'Breaking through'} · {label}
        </span>
        <strong>{play.certain ? 'certain' : formatPercent(Math.min(MAX_ODDS, odds))}</strong>
      </div>
      <ol className="scene-gates" aria-label="Gates">
        {play.scene.gates.map((g, k) => (
          <li
            key={k}
            className={g === 'hit' ? 'is-hit' : g === 'early' ? 'is-early' : undefined}
            aria-label={`Gate ${k + 1}: ${g === 'hit' ? 'caught' : g === 'early' ? 'too early' : 'to come'}`}
          />
        ))}
      </ol>
      <p className="caption">
        {play.outcome
          ? outcomeLine(game, play)
          : winding
            ? 'The circulation slows and the gates light round the loop. Be ready: the race comes next.'
            : play.certain
              ? 'This step always holds. Tap the figure as the spark crosses each gate; from the third layer, every gate caught raises the odds.'
              : `Tap the figure as the spark crosses each gate: each one caught adds ${formatPercent(SCENE_ODDS_STEP)}, up to ${formatPercent(SCENE_ODDS_CAP)}. A miss costs nothing.`}
      </p>
    </div>
  );
}

/** Qi speed, focus and heat beside the figure; during a scene, the scene. */
export function SeatMeter({ game }: { game: GameState }) {
  const play = useScene((s) => s.play);
  return play ? <SceneMeter game={game} play={play} /> : <FocusMeter game={game} />;
}

/**
 * Focus and heat as a ring round the figure (A3, Jan's call): most of a circle about the dantian,
 * open toward the floor so its ends stay clear of the band, outside the sun's hand. Focus is the outer arc in gold,
 * rising clockwise from the lower left, where the factor stands, toward the ceiling at the lower
 * right; heat is a fainter arc just inside it, in red, brighter as it nears its limit.
 */
const RING = { cx: 0, cy: 9, r: 255, heat: 8 } as const;
/** How far below the level the ring's ends stand, in degrees; the rest of the circle is the ring. */
const RING_END_DEG = 20;
const RING_SWEEP = (180 + 2 * RING_END_DEG) / 360;
const RING_START_DEG = 180 - RING_END_DEG;

function FocusRing({ game, box }: { game: GameState; box: string }) {
  const c = game.player;
  const a = useSeat((s) => s.attention);
  const play = useScene((s) => s.play);
  if (!a || play || game.ended || !ladderMethod(c, 'qi')) return null;
  const seat = seatOf(a, c);
  const heat = Math.min(1, a.heat / heatLimit(c));
  const ceiling = 1 + attentionCeiling(c);
  const arc = (r: number, fill: number, className: string) => {
    const C = 2 * Math.PI * r;
    return (
      <circle
        className={className}
        cx={RING.cx}
        cy={RING.cy}
        r={r}
        strokeDasharray={`${C * RING_SWEEP * Math.min(1, Math.max(0, fill))} ${C}`}
        transform={`rotate(${RING_START_DEG} ${RING.cx} ${RING.cy})`}
      />
    );
  };
  // Beside the ring's two ends, outward.
  const t = (RING_END_DEG * Math.PI) / 180;
  const end = (side: -1 | 1) => ({
    x: RING.cx + side * (RING.r * Math.cos(t) + 4),
    y: RING.cy + RING.r * Math.sin(t) + 2,
  });
  const from = end(-1);
  const to = end(1);
  return (
    <svg
      className="focus-ring"
      viewBox={box}
      role="meter"
      aria-label={`Attention ×${seat.factor.toFixed(2)} of ×${ceiling.toFixed(2)}, heat ${Math.round(heat * 100)}%`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(a.focus * 100)}
    >
      {arc(RING.r, 1, 'focus-track')}
      {arc(RING.r, a.focus, 'focus-arc')}
      {arc(RING.r - RING.heat, 1, 'focus-track')}
      {arc(RING.r - RING.heat, heat, `heat-arc${heat > 0.75 ? ' is-near' : ''}`)}
      <text className="focus-label" x={from.x} y={from.y} textAnchor="end">
        ×{seat.factor.toFixed(2)}
      </text>
      <text className="focus-label is-ceiling" x={to.x} y={to.y} textAnchor="start">
        ×{ceiling.toFixed(2)}
      </text>
    </svg>
  );
}

/** Under the figure, the seat's one line of words; the ring carries the numbers. */
function FocusMeter({ game }: { game: GameState }) {
  const c = game.player;
  const a = useSeat((s) => s.attention);
  const hint = useMemo(() => (a ? seatHint(c, a) : null), [a, c]);
  if (!hint || game.ended) return null;
  return (
    <div className="seat-meter">
      <p className="caption">
        {hint.text}
        {hint.why && (
          <Why label="How drawing orbs works">
            The ring round the figure is your attention: focus on the outer arc, lifting your qi
            toward the ceiling at its end, and heat just inside it. An orb drawn on the inhale, as
            the figure breathes in, fills more focus. Each breath warms the meridians, less on the
            inhale: past the end of the heat arc they burn, and the bonus is gone for{' '}
            {HEAT_UNSETTLED_S} s. Breathe steadily, not greedily. Focus fades once you leave.
          </Why>
        )}
      </p>
    </div>
  );
}
