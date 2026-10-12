// The Abode's cultivator: a silhouette seated cross-legged in seclusion, with the dantian glowing
// below the navel. The glow is the crack light, since it is qi: it grows and brightens as the qi
// bar fills, quickens once the bar is full, dims while qi is unsettled, and barely shows without
// a method.
import { barFill } from '../core/cultivation.ts';
import type { GameState } from '../core/state.ts';
import { formatPercent } from './format.ts';

// One closed shape, head apart: shoulders, arms resting into the lap, and crossed legs. The two
// small inner shapes are the gaps between arm and waist, cut out by the even-odd fill.
const BODY =
  'M0 -31 L-5 -31 C-7 -27 -13 -26 -19 -24 C-26 -21 -28 -14 -28 -6 C-28 2 -30 9 -33 15 ' +
  'C-37 20 -44 22 -49 26 C-54 30 -53 37 -46 39 C-32 43 -14 42 0 42 ' +
  'C14 42 32 43 46 39 C53 37 54 30 49 26 C44 22 37 20 33 15 C30 9 28 2 28 -6 ' +
  'C28 -14 26 -21 19 -24 C13 -26 7 -27 5 -31 Z ' +
  'M-20 -13 C-18 -5 -17 2 -14 8 C-18 6 -21 -3 -20 -13 Z ' +
  'M20 -13 C18 -5 17 2 14 8 C18 6 21 -3 20 -13 Z';

/** Where the dantian sits: below the navel, just above the folded hands. */
const DANTIAN_Y = 9;

export function SeatedFigure({ game }: { game: GameState }) {
  const c = game.player;
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

  return (
    <svg
      className={`seated ${state}`}
      viewBox="-64 -64 128 116"
      role="img"
      aria-label={`${c.name} sits in seclusion; the dantian holds qi at ${formatPercent(fill)} of the bar.`}
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
      <circle className="seated-aura" cx={0} cy={DANTIAN_Y} r={38 + 14 * level} />
      <circle className="seated-head" cx={0} cy={-41} r={10.5} />
      <path className="seated-body" d={BODY} fillRule="evenodd" />
      <circle className="dantian-halo" cx={0} cy={DANTIAN_Y} r={halo} />
      <circle className="dantian-core" cx={0} cy={DANTIAN_Y} r={core} />
    </svg>
  );
}
