// The day wheel (design § Cultivation, § UI and screens): the twelve double-hours from 子 at the top
// round to 亥, each coloured by what it goes to, with element and dawn markers and locked sleep.
// Tap an hour to pick it, then pick what it goes to; every hour's yield is in its tooltip.
import { useState } from 'react';
import { ELEMENT_INFO, phaseOf } from '../content/elements.ts';
import { BRANCHES, HOUR_KIND_IDS, HOUR_KINDS, type HourKind } from '../content/hours.ts';
import { dayRates, type HourYield } from '../core/cultivation.ts';
import type { GameState } from '../core/state.ts';
import { hourKindOpen, hourLocked } from '../core/wheel.ts';
import { formatPercent, formatRate } from './format.ts';
import { useGame } from './store.ts';
import { readingLine } from './bookcase.ts';
import { useBeacons } from './useBeacons.ts';
import { Why } from './widgets.tsx';

const R_OUTER = 132;
const R_INNER = 66;
const GAP_DEG = 1.2;

function polar(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [r * Math.cos(a), r * Math.sin(a)];
}

/** Where dawn's marker sits: inside 卯's segment, near its outer edge. */
const DAWN_AT = polar(122, 30 * 3 + 9);

/** The ring segment for hour `i`, centred on its clock angle, 子 at the top. */
function segmentPath(i: number): string {
  const from = i * 30 - 15 + GAP_DEG / 2;
  const to = i * 30 + 15 - GAP_DEG / 2;
  const [x1, y1] = polar(R_OUTER, from);
  const [x2, y2] = polar(R_OUTER, to);
  const [x3, y3] = polar(R_INNER, to);
  const [x4, y4] = polar(R_INNER, from);
  return `M${x1} ${y1}A${R_OUTER} ${R_OUTER} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${R_INNER} ${R_INNER} 0 0 0 ${x4} ${y4}Z`;
}

const YIELD_UNITS: Record<HourKind, (y: HourYield) => string> = {
  qi: (y) => `+${formatRate(y.qi)} qi`,
  body: (y) => `+${formatRate(y.body)} tempering`,
  soul: (y) => `+${formatRate(y.soul)} nourishment`,
  study: (y) => `+${formatRate(y.insight)} insight`,
  practice: (y) => `+${formatRate(y.practice)} practice days`,
  sleep: () => 'nothing',
};

/** The bonuses on an hour's work: "element +25%", "dawn +10%", "discipline +10%". */
function hourBonuses(y: HourYield): string[] {
  return [
    y.element > 0 && `element +${formatPercent(y.element)}`,
    y.dawn > 0 && `dawn +${formatPercent(y.dawn)}`,
    y.discipline > 0 && `discipline +${formatPercent(y.discipline)}`,
  ].filter((b): b is string => !!b);
}

/** "+0.104 qi (element +25%, dawn +10%)", what one hour gives each day. */
function hourYieldText(y: HourYield): string {
  const bonuses = hourBonuses(y);
  return `${YIELD_UNITS[y.kind](y)}${bonuses.length ? ` (${bonuses.join(', ')})` : ''}`;
}

/** Why an hour gives nothing, when it does; a study hour also names the copy it reads. */
function hourNote(game: GameState, y: HourYield): string | null {
  const c = game.player;
  if (y.kind === 'qi' && y.qi === 0) {
    return c.activeMethods.qi
      ? 'Unsettled qi gains nothing for now.'
      : 'No cultivation method yet.';
  }
  if (y.kind === 'body' && y.body === 0) return 'No tempering art: body hours give nothing.';
  if (y.kind === 'soul' && y.soul === 0) return 'No nourishing art: soul hours give nothing.';
  if (y.kind === 'practice' && y.practice === 0) return 'No technique being practiced.';
  if (y.kind === 'study') {
    const reading = readingLine(game.player);
    return reading ? `Also ${reading}.` : null;
  }
  return null;
}

function LockIcon({ x, y }: { x: number; y: number }) {
  return (
    <g className="wheel-lock" transform={`translate(${x - 5} ${y - 6})`} aria-hidden="true">
      <path d="M2.5 5V3.5a2.5 2.5 0 0 1 5 0V5" fill="none" strokeWidth="1.3" />
      <rect x="1" y="5" width="8" height="6" rx="1.2" />
    </g>
  );
}

export function DayWheel({ game }: { game: GameState }) {
  const setHour = useGame((s) => s.setHour);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const c = game.player;
  const rates = dayRates(c, game.calendar.day);
  const pick = selected === null ? null : rates.hours[selected]!;
  // A first time waiting on an hour (ui/beacons.ts): the free qi hours wear the ring, and so does
  // the kind it wants once an hour is picked.
  const wants = new Set(
    useBeacons()
      .filter((b) => b.control === 'wheel' && b.kind)
      .map((b) => b.kind!),
  );

  const choose = (i: number) => {
    setSelected(i === selected ? null : i);
    setError(null);
  };

  return (
    <div className="wheel-wrap">
      <svg
        className={`wheel${wants.size > 0 ? ' is-beacon' : ''}`}
        viewBox="-160 -160 320 320"
        role="group"
        aria-label="The day wheel: twelve double-hours, 子 at midnight at the top"
      >
        {rates.hours.map((y, i) => {
          const b = BRANCHES[i]!;
          const locked = hourLocked(c, i);
          const [hx, hy] = polar(112, i * 30);
          const [kx, ky] = polar(86, i * 30);
          const [ex, ey] = polar(146, i * 30);
          const matches = c.rootElements.some((e) => phaseOf(e) === b.element);
          const label = `${b.hanzi} ${b.name}, ${b.clock}, ${ELEMENT_INFO[b.element].name.toLowerCase()} hour: ${HOUR_KINDS[y.kind].name.toLowerCase()}${locked ? ', locked' : ''}`;
          return (
            <g
              key={b.id}
              className={`wheel-hour hour-${y.kind}${selected === i ? ' is-selected' : ''}${wants.size > 0 && y.kind === 'qi' && !locked ? ' is-beckoning' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={label}
              aria-pressed={selected === i}
              onClick={() => choose(i)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  choose(i);
                }
              }}
            >
              <title>{`${b.hanzi} ${b.name} (${b.clock}), ${ELEMENT_INFO[b.element].name.toLowerCase()}: ${HOUR_KINDS[y.kind].name} · ${hourYieldText(y)}${locked ? ' · locked to sleep at Qi Condensation' : ''}`}</title>
              <path className="wheel-seg" d={segmentPath(i)} />
              <text className="wheel-branch hanzi" x={hx} y={hy} dy="0.35em">
                {b.hanzi}
              </text>
              {locked ? (
                <LockIcon x={kx} y={ky} />
              ) : (
                <text className="wheel-kind" x={kx} y={ky} dy="0.35em">
                  {HOUR_KINDS[y.kind].name}
                </text>
              )}
              <text
                className={`wheel-element hanzi${matches ? ' is-match' : ''}`}
                x={ex}
                y={ey}
                dy="0.35em"
              >
                {ELEMENT_INFO[b.element].hanzi}
              </text>
              {i === 3 && (
                <circle className="wheel-dawn" cx={DAWN_AT[0]} cy={DAWN_AT[1]} r={3.2}>
                  <title>Dawn's purple qi: +10% to qi at 卯</title>
                </circle>
              )}
            </g>
          );
        })}
        <text className="wheel-center-title" x={0} y={-8}>
          {rates.routine ? rates.routine.name : 'Your own day'}
        </text>
        <text className="wheel-center-caption" x={0} y={12}>
          {rates.routine ? 'discipline +10%' : `+${formatRate(rates.qi)} qi a day`}
        </text>
      </svg>

      <div className="wheel-editor">
        {pick ? (
          <>
            <h3>
              <span className="hanzi">{BRANCHES[pick.hour]!.hanzi}</span>{' '}
              {BRANCHES[pick.hour]!.name} · {BRANCHES[pick.hour]!.clock} ·{' '}
              {ELEMENT_INFO[BRANCHES[pick.hour]!.element].name.toLowerCase()} hour
            </h3>
            <p className="caption">
              {HOUR_KINDS[pick.kind].name}: {YIELD_UNITS[pick.kind](pick)} a day
              {hourBonuses(pick).length > 0 && (
                <Why label="This hour's bonuses">
                  A twelfth of a day's {HOUR_KINDS[pick.kind].name.toLowerCase()}, with{' '}
                  {hourBonuses(pick).join(', ')}.
                </Why>
              )}
              {hourNote(game, pick) ? `. ${hourNote(game, pick)}` : ''}
            </p>
            <div className="seg wheel-kinds" role="group" aria-label="What this hour goes to">
              {HOUR_KIND_IDS.filter((k) => hourKindOpen(c, k)).map((k) => (
                <button
                  key={k}
                  type="button"
                  className={wants.has(k) && pick.kind !== k ? 'beacon-ring' : undefined}
                  aria-pressed={pick.kind === k}
                  disabled={!!game.ended || (hourLocked(c, pick.hour) && k !== 'sleep')}
                  title={HOUR_KINDS[k].what}
                  onClick={() => setError(setHour(pick.hour, k))}
                >
                  {HOUR_KINDS[k].name}
                </button>
              ))}
            </div>
            {hourLocked(c, pick.hour) && (
              <p className="caption">
                At Qi Condensation the body is still mostly mortal: 子 and 丑 are for sleep until
                Foundation.
              </p>
            )}
            {error && <p className="warn">{error}</p>}
          </>
        ) : (
          <p className="muted">
            Tap an hour to change what it goes to
            {wants.size > 0 &&
              `, then give it to ${[...wants].map((k) => HOUR_KINDS[k].name).join(' or ')}`}
            .
            <Why label="How the hours pay">
              Qi, study, practice and sleep are yours from the start; body and soul hours open with
              their arts. An hour whose element matches your root pays a quarter more from layer 4,
              and dawn's purple qi at 卯 adds a tenth to qi.
            </Why>
          </p>
        )}
      </div>
    </div>
  );
}

/** A routine's twelve hours as a strip of colour, for the routines list. */
export function WheelStrip({ hours }: { hours: readonly HourKind[] }) {
  return (
    <span className="wheel-strip" aria-hidden="true">
      {hours.map((k, i) => (
        <span
          key={i}
          className={`hour-${k}`}
          title={`${BRANCHES[i]!.hanzi}: ${HOUR_KINDS[k].name}`}
        />
      ))}
    </span>
  );
}
