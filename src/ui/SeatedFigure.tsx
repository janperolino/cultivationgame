// The Abode's cultivator (design § UI and screens, less spreadsheet): a silhouette whose pose
// follows the current hour of the day wheel: seated cross-legged in seclusion on qi, body and soul
// hours, bowed over a scroll in a study hour, standing in a stance drilling a technique in a
// practice hour, and slumped asleep at 子 and 丑. The dantian glows below the navel in the crack
// light, since it is qi: it grows and brightens as the qi bar fills, quickens once the bar is
// full, dims while qi is unsettled and in sleep, and barely shows without a method.
import type { HourKind } from '../content/hours.ts';
import { barFill } from '../core/cultivation.ts';
import type { GameState } from '../core/state.ts';
import { effectiveWheel, hourOfDay } from '../core/wheel.ts';
import { formatPercent } from './format.ts';

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

export function SeatedFigure({ game }: { game: GameState }) {
  const c = game.player;
  const pose: Pose = game.ended
    ? 'seated'
    : POSES[effectiveWheel(c)[hourOfDay(game.calendar.day)] ?? 'qi'];
  const fill = Math.min(1.5, Math.max(0, barFill(c.qi)));
  const level = Math.min(1, fill);
  const over = Math.max(0, fill - 1) / 0.5;
  const state = !c.activeMethods.qi
    ? 'is-dormant'
    : game.calendar.day < c.qi.unsettledUntil
      ? 'is-unsettled'
      : fill >= 1
        ? 'is-full'
        : '';
  const core = 2.4 + 1.8 * level + 0.8 * over;
  const halo = 9 + 10 * level + 6 * over;
  const standing = pose === 'practice';
  // The dantian sits below the navel, just above the folded hands; higher when standing.
  const dantianY = standing ? -4 : 9;

  return (
    <svg
      className={`seated pose-${pose} ${state}`}
      viewBox="-64 -64 128 116"
      role="img"
      aria-label={`${c.name} ${POSE_WORDS[pose]}; the dantian holds qi at ${formatPercent(fill)} of the bar.`}
    >
      <defs>
        <radialGradient id="dantian-glow">
          <stop offset="0%" className="dantian-stop-core" />
          <stop offset="35%" className="dantian-stop-mid" />
          <stop offset="100%" className="dantian-stop-edge" />
        </radialGradient>
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
      <circle className="dantian-halo" cx={0} cy={dantianY} r={halo} />
      <circle className="dantian-core" cx={0} cy={dantianY} r={core} />
    </svg>
  );
}
