// The Abode's cultivator (design § UI and screens; § Cultivation, Attended seclusion): a
// silhouette seated cross-legged, whatever the hour (Jan's call after P1.10; the hour will show
// another way). The dantian glows below the navel in the crack light, since it is qi. Over the
// silhouette a canvas (ui/qiCanvas.ts) draws the qi drifting in, circulating and settling, and the
// orbs to draw in by hover or a finger. Beside it, the seat's meter: qi speed, focus and heat. An
// attended qi breakthrough plays here as a ten-second scene (ui/scene.ts): a tap or click on the
// figure as the spark passes each gate, and the meter tells the scene instead. Behind it all, over
// the whole seat panel, the sun of the hour (ui/sunCanvas.ts): the figure is a sundial, and the
// caption under it names the hour in words.
import { useEffect, useMemo, useRef } from 'react';
import { POINTER_REACH } from '../content/attention.ts';
import { circulation, RARITY_SPARKS } from '../content/circulation.ts';
import {
  AUTO_SETTINGS,
  BAR_CAP,
  GRADES,
  MAX_ODDS,
  ODDS_PER_TENTH,
  SCENE_ODDS_CAP,
  SCENE_ODDS_STEP,
} from '../content/cultivation.ts';
import { BRANCHES, HOUR_KINDS } from '../content/hours.ts';
import { methodCirculation } from '../content/methods.ts';
import { realm } from '../content/realms.ts';
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
import { barFill, barSize, dayRates, majorCheck } from '../core/cultivation.ts';
import { daysPerRealMs } from '../core/loop.ts';
import { ladderMethod } from '../core/methods.ts';
import { sceneBonus } from '../core/scene.ts';
import type { Cultivator, GameState } from '../core/state.ts';
import { stats } from '../core/stats.ts';
import { effectiveWheel, hourOfDay } from '../core/wheel.ts';
import { formatLadder, formatPercent } from './format.ts';
import {
  FIGURE_BOX,
  FIGURE_HEAD,
  FIGURE_PATH,
  QiCanvas,
  type FigureFrame,
  type FigureState,
} from './qiCanvas.ts';
import {
  consolidate,
  consolidating,
  qiAttempt,
  tapGate,
  useScene,
  type ScenePlay,
} from './scene.ts';
import { holdStill, noteDay, onBreath, seatTime, showAbode, useSeat } from './seat.ts';
import { reducedMotion, useSettings } from './settings.ts';
import { SunCanvas } from './sunCanvas.ts';
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
  const boxRef = useRef<HTMLDivElement>(null);
  const sceneStarted = useScene((s) => s.play?.started ?? 0);
  const engine = useRef<QiCanvas | null>(null);
  const sunRef = useRef<HTMLCanvasElement>(null);
  const sunEngine = useRef<SunCanvas | null>(null);

  const fill = Math.min(1.5, Math.max(0, barFill(c.qi)));
  const level = Math.min(1, fill);
  const state = figureState(game, useSeat.getState().attention);

  // Orbs come only while the figure is on screen.
  useEffect(() => {
    showAbode(true);
    return () => showAbode(false);
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

  // A scene called from another screen, or further down this one, brings the figure into view.
  useEffect(() => {
    if (!sceneStarted) return;
    const behavior = reducedMotion() ? 'auto' : 'smooth';
    boxRef.current?.scrollIntoView({ block: 'nearest', behavior });
  }, [sceneStarted]);

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
  const hour = hourOfDay(game.calendar.day);
  const branch = BRANCHES[hour]!;
  const kind = HOUR_KINDS[effectiveWheel(c)[hour]!].name.toLowerCase();
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
      <p className="caption seat-hour">
        <span className="hanzi">{branch.hanzi}</span>{' '}
        {branch.time[0]!.toUpperCase() + branch.time.slice(1)}, the hour of {branch.name} · {kind}
      </p>
    </>
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

/** What the scene says as it ends: the step taken, or what the gate holding cost. */
function outcomeLine(game: GameState, play: ScenePlay): string {
  const o = play.outcome!;
  if (o.success) {
    return o.major
      ? `Through the gate: ${realm(game.player.qi.realm).name}.`
      : `Through: ${formatLadder(game.player.qi)}.`;
  }
  return o.major
    ? 'The gate holds. The pill is spent, half the qi scatters, and the meridians will take years to mend.'
    : 'The gate holds. A fifth of the qi scatters, and it will not settle for a few days.';
}

/** The meter during a scene: the gates as six marks, the odds, and what to do. */
function SceneMeter({ game, play }: { game: GameState; play: ScenePlay }) {
  const bonus = sceneBonus(play.scene);
  // The bar fills on while the scene plays, so the odds are read live, as the roll will be.
  const odds = play.outcome ? play.outcome.odds : (qiAttempt(game)?.odds ?? play.odds) + bonus;
  return (
    <div className="seat-meter scene-meter" aria-live="polite">
      <div className="seat-speed">
        <span className="caption">
          {play.major ? 'Breaking through the gate' : 'Breaking through'}
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
          : play.certain
            ? 'This step always holds. Tap the figure as the spark crosses each gate; from the third layer, every gate caught raises the odds.'
            : `Tap the figure as the spark crosses each gate: each one caught adds ${formatPercent(SCENE_ODDS_STEP)}, up to ${formatPercent(SCENE_ODDS_CAP)}. A miss costs nothing.`}
      </p>
    </div>
  );
}

/**
 * The "now or consolidate" moment under the figure: the qi is ready, and the call is yours. Now
 * plays the scene; consolidating lets the bar fill on, raising the odds, and the moment comes back
 * at the next tenth.
 */
export function BreakthroughMoment({
  game,
  onDetails,
}: {
  game: GameState;
  onDetails: () => void;
}) {
  const playing = useScene((s) => !!s.play);
  const quiet = useScene((s) => s.quietUntil);
  const beginScene = useGame((s) => s.beginScene);
  const attempt = qiAttempt(game);
  if (!attempt || playing || consolidating(game, quiet)) return null;
  const c = game.player;
  const fill = barFill(c.qi);
  const atCap = fill >= BAR_CAP - 1e-9;
  const check = attempt.major ? majorCheck(c, 'qi') : null;
  const auto = AUTO_SETTINGS[c.plan.auto];

  let text: string;
  if (check) {
    const grade = GRADES.find((g) => g.id === check.grade)!.name.toLowerCase();
    text =
      `Qi presses against the gate of ${check.target.name}. Now, ${grade === 'ordinary' ? 'an' : 'a'} ${grade} ` +
      `breakthrough at ${formatPercent(attempt.odds)}` +
      (atCap
        ? '; the sea can hold no more.'
        : ', or consolidate for better odds and a better grade.');
  } else if (attempt.odds >= 1) {
    text = 'The qi sea is full, and this step always holds.';
  } else {
    text =
      `The qi sea is full at ${formatPercent(fill)}. Now at ${formatPercent(attempt.odds)}` +
      (atCap
        ? '; it can hold no more.'
        : `, or consolidate: each 10% more adds ${formatPercent(ODDS_PER_TENTH)}, up to 150%.`) +
      (auto.minOdds === Infinity
        ? ''
        : ` On ${auto.name}, it goes on its own at ${formatPercent(auto.minOdds)} odds or a full 150%.`);
  }
  return (
    <div className="moment">
      <p>{text}</p>
      <div className="actions">
        <button type="button" className="button" onClick={() => beginScene()}>
          Break through now · {formatPercent(attempt.odds)}
        </button>
        {!atCap && attempt.odds < 1 && (
          <button type="button" className="button button-quiet" onClick={() => consolidate(game)}>
            Consolidate
          </button>
        )}
        {check && (
          <button type="button" className="button button-quiet" onClick={onDetails}>
            Details
          </button>
        )}
      </div>
    </div>
  );
}

/** Qi speed, focus and heat beside the figure; during a scene, the scene. */
export function SeatMeter({ game }: { game: GameState }) {
  const play = useScene((s) => s.play);
  return play ? <SceneMeter game={game} play={play} /> : <FocusMeter game={game} />;
}

function FocusMeter({ game }: { game: GameState }) {
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
