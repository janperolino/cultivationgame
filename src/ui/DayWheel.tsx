// The day wheel (design § Cultivation, § UI and screens): the twelve double-hours from 子 at the top
// round to 亥, each coloured by what it goes to, with element and dawn markers and locked sleep.
// Routine shows it twice over, the day at home and the day on the road (design § Travel, the road
// wheel). Pick hours, which build up (A4: a tap adds or drops one, a drag adds those it crosses,
// shift adds a run), then pick what they go to; every home hour's yield is in its tooltip. On
// Routine (A4) the wheel sits in a gilt bezel on the left of the scene and its editor under it,
// which the screen places through `layout`.
import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { ELEMENT_INFO, phaseOf } from '../content/elements.ts';
import {
  BRANCHES,
  DUTY_HANZI,
  HOUR_KIND_IDS,
  HOUR_KINDS,
  type HourKind,
} from '../content/hours.ts';
import { ROAD_ROUTINES, type RoadHour } from '../content/map/travel.ts';
import { dayRates, type HourYield } from '../core/cultivation.ts';
import { Bezel } from './RoutineRings.tsx';
import { roadRoutine, setRoadHours } from '../core/map/travel.ts';
import type { GameState } from '../core/state.ts';
import { dutyAt, hourKindOpen, hourLocked } from '../core/wheel.ts';
import { jobsView } from '../core/jobs.ts';
import { formatPercent, formatRate } from './format.ts';
import { hourRun, joinPicks, pressHour, type HourPick } from './hourPick.ts';
import { ROAD_NAME, ROAD_WORD } from './roadWords.ts';
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

/** An arc along the bezel from one clock angle to another, the short way, as a path. */
function arcPath(r: number, from: number, to: number, reverse = false): string {
  const [x0, y0] = polar(r, reverse ? to : from);
  const [x1, y1] = polar(r, reverse ? from : to);
  return `M ${x0} ${y0} A ${r} ${r} 0 0 ${reverse ? 0 : 1} ${x1} ${y1}`;
}

/** A job's shift on the ring (O4): its hours, the work's name, and whether it goes unkept today. */
export interface Shift {
  id: string;
  hours: readonly number[];
  name: string;
  missed?: boolean;
}

/** Where a shift's arc runs on the bezel, and its name outside it. */
const SHIFT_R = 160;
const SHIFT_NAME_R = 179;

/** A shift as an arc on the bezel naming the work, or ticked red while it goes unkept. */
function ShiftArc({ shift }: { shift: Shift }) {
  const id = `shift-${useId()}`;
  if (!shift.hours.length) return null;
  const from = shift.hours[0]! * 30 - 15 + GAP_DEG;
  const to = shift.hours[shift.hours.length - 1]! * 30 + 15 - GAP_DEG;
  const mid = ((((from + to) / 2) % 360) + 360) % 360;
  // Names in the lower half run the other way, so they read left to right.
  const lower = mid > 90 && mid < 270;
  return (
    <g className={`wheel-shift${shift.missed ? ' is-missed' : ''}`} aria-hidden="true">
      <path className="wheel-shift-arc" d={arcPath(SHIFT_R, from, to)} />
      <path id={id} d={arcPath(SHIFT_NAME_R, from, to, lower)} fill="none" />
      <text className="wheel-shift-name" dy={lower ? '0.7em' : '0'}>
        <textPath href={`#${id}`} startOffset="50%">
          {shift.missed ? `${shift.name}: missed` : shift.name}
        </textPath>
      </text>
    </g>
  );
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
  duty: () => "the job's pay",
};

/** The bonuses on an hour's work: "element +25%", "dawn +10%", "discipline +10%". */
function hourBonuses(y: HourYield): string[] {
  return [
    y.element > 0 && `element +${formatPercent(y.element)}`,
    y.dawn > 0 && `dawn +${formatPercent(y.dawn)}`,
    y.night > 0 && `night +${formatPercent(y.night)}`,
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

/** Whether the hour's element matches the root, which lights its marker. */
function matches(c: GameState['player'], i: number): boolean {
  return c.rootElements.some((e) => phaseOf(e) === BRANCHES[i]!.element);
}

function LockIcon({ x, y }: { x: number; y: number }) {
  return (
    <g className="wheel-lock" transform={`translate(${x - 5} ${y - 6})`} aria-hidden="true">
      <path d="M2.5 5V3.5a2.5 2.5 0 0 1 5 0V5" fill="none" strokeWidth="1.3" />
      <rect x="1" y="5" width="8" height="6" rx="1.2" />
    </g>
  );
}

// ---------------------------------------------------------------- picking hours

interface Cell {
  /** The class its colour comes from: an hour kind, a road kind, or `home`. */
  tint: string;
  /** What the segment says, or null for the lock. */
  label: string | null;
  title: string;
  aria: string;
  /** The hour's element matches your root, so its marker is lit. */
  match: boolean;
  beckoning?: boolean;
  /** A shift's Duty hour: the 值 seal over a lock. */
  duty?: boolean;
}

/**
 * The ring and its pick. Picks build up (A4): a press adds an hour or drops it, shift adds the run
 * from the last press, and a drag from an hour just added adds every hour it crosses, the short way
 * round, to what was picked before.
 */
function Ring({
  cells,
  pick,
  onPick,
  title,
  caption,
  label,
  beacon,
  shifts = [],
}: {
  shifts?: readonly Shift[];
  cells: readonly Cell[];
  pick: HourPick;
  onPick: (pick: number[]) => void;
  title: string;
  caption: string;
  label: string;
  beacon: boolean;
}) {
  const anchor = useRef<number | null>(null);
  const drag = useRef<number | null>(null);
  const pool = `${useId()}-pool`;
  // What was picked when the drag began, which the drag's run adds to.
  const base = useRef<HourPick>([]);
  useEffect(() => {
    const up = () => {
      drag.current = null;
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, []);

  // A pick let go of from outside (a tap off the wheel, Escape) starts the next shift-run afresh.
  useEffect(() => {
    if (pick.length === 0) anchor.current = null;
  }, [pick]);

  const press = (i: number, shift: boolean) => {
    const r = pressHour(pick, anchor.current, i, { shift });
    anchor.current = r.anchor;
    onPick(r.pick);
    return r.pick;
  };
  const sweep = (i: number) => {
    if (drag.current === null) return;
    const next = joinPicks(base.current, hourRun(drag.current, i));
    if (next.length !== pick.length || next.some((h, k) => pick[k] !== h)) onPick(next);
  };
  // A finger keeps its first target, so a touch drag asks which hour is under it.
  const touchMove = (e: PointerEvent<SVGSVGElement>) => {
    if (drag.current === null || e.pointerType !== 'touch') return;
    const at = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-hour]');
    if (at) sweep(Number(at.getAttribute('data-hour')));
  };

  return (
    <svg
      className={`wheel ring${beacon ? ' is-beacon' : ''}`}
      viewBox="-188 -188 376 376"
      role="group"
      aria-label={label}
      onPointerMove={touchMove}
    >
      <Bezel quarters />
      {/* The light pooling in from the rim: held on a picked hour, breathing on one a hint wants
          (Jan's call after A4). */}
      <defs>
        <radialGradient id={pool} cx={0} cy={0} r={R_OUTER} gradientUnits="userSpaceOnUse">
          <stop offset={R_INNER / R_OUTER + 0.12} className="wheel-pool-stop" stopOpacity={0} />
          <stop offset={0.8} className="wheel-pool-stop" stopOpacity={0.3} />
          <stop offset={1} className="wheel-pool-stop" stopOpacity={0.95} />
        </radialGradient>
      </defs>
      {cells.map((cell, i) => {
        const b = BRANCHES[i]!;
        const [hx, hy] = polar(112, i * 30);
        const [kx, ky] = polar(86, i * 30);
        const [ex, ey] = polar(148, i * 30);
        const picked = pick.includes(i);
        return (
          <g
            key={b.id}
            data-hour={i}
            className={`wheel-hour hour-${cell.tint}${picked ? ' is-selected' : ''}${cell.beckoning ? ' is-beckoning' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={cell.aria}
            aria-pressed={picked}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              const next = press(i, e.shiftKey);
              // A drag runs from an hour just added; a press that dropped one starts none.
              const added = !e.shiftKey && next.includes(i);
              drag.current = added ? i : null;
              base.current = next;
            }}
            onPointerEnter={(e) => {
              if (e.pointerType !== 'touch') sweep(i);
            }}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                press(i, e.shiftKey);
              } else if (e.key === 'Escape' && pick.length > 0) {
                anchor.current = null;
                onPick([]);
              }
            }}
          >
            <title>{cell.title}</title>
            <path className="wheel-seg" d={segmentPath(i)} />
            {(picked || (beacon && cell.beckoning)) && (
              <path className="wheel-pool" d={segmentPath(i)} fill={`url(#${pool})`} />
            )}
            <text className="wheel-branch hanzi" x={hx} y={hy} dy="0.35em">
              {b.hanzi}
            </text>
            {cell.duty ? (
              <>
                <text
                  className="wheel-duty hanzi"
                  x={polar(94, i * 30)[0]}
                  y={polar(94, i * 30)[1]}
                  dy="0.35em"
                >
                  {DUTY_HANZI}
                </text>
                <LockIcon x={polar(76, i * 30)[0]} y={polar(76, i * 30)[1]} />
              </>
            ) : cell.label === null ? (
              <LockIcon x={kx} y={ky} />
            ) : (
              <text className="wheel-kind" x={kx} y={ky} dy="0.35em">
                {cell.label}
              </text>
            )}
            <text
              className={`wheel-element hanzi${cell.match ? ' is-match' : ''}`}
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
      {shifts.map((sh) => (
        <ShiftArc key={sh.id} shift={sh} />
      ))}
      <circle className="wheel-centre" r={R_INNER - 6} />
      <text className="wheel-center-title" x={0} y={-8}>
        {title}
      </text>
      <text className="wheel-center-caption" x={0} y={12}>
        {caption}
      </text>
    </svg>
  );
}

/** The editor's head: one hour by name, or how many and which. */
function PickHead({ pick }: { pick: HourPick }) {
  if (pick.length === 1) {
    const b = BRANCHES[pick[0]!]!;
    return (
      <h3>
        <span className="hanzi">{b.hanzi}</span> {b.name} · {b.clock} ·{' '}
        {ELEMENT_INFO[b.element].name.toLowerCase()} hour
      </h3>
    );
  }
  return (
    <h3>
      {pick.length} hours ·{' '}
      <span className="hanzi">{pick.map((i) => BRANCHES[i]!.hanzi).join(' ')}</span>
    </h3>
  );
}

/** The picked hours on a shift, which no kind can take while the job is held (O4). */
function DutyNote({ game, pick }: { game: GameState; pick: HourPick }) {
  const on = pick.filter((i) => dutyAt(game.player, i));
  if (on.length === 0) return null;
  const names = [...new Set(on.map((i) => dutyAt(game.player, i)!.name))];
  return (
    <p className="caption">
      {on.map((i) => BRANCHES[i]!.hanzi).join(' and ')} {on.length === 1 ? 'is' : 'are'} your shift
      ({names.join(', ')}): Duty, locked while you hold the work.
    </p>
  );
}

/** The wheel's shifts: each job you hold, missed while you are away from its post. */
function shiftsOf(game: GameState, road = false): Shift[] {
  return jobsView(game)
    .filter((j) => j.shift.length > 0)
    .map((j) => ({
      id: j.id,
      hours: j.shift,
      name: j.drilling ? `${j.name} from layer 4` : j.name,
      missed: !j.drilling && (road || !j.here),
    }));
}

/** The picked hours locked to sleep, which a kind other than sleep passes over. */
function LockedNote({ game, pick }: { game: GameState; pick: HourPick }) {
  const locked = pick.filter((i) => hourLocked(game.player, i));
  if (locked.length === 0) return null;
  const names = locked.map((i) => BRANCHES[i]!.hanzi).join(' and ');
  return (
    <p className="caption">
      {pick.length === locked.length
        ? 'At Qi Condensation the body is still mostly mortal: 子 and 丑 are for sleep until Foundation.'
        : `${names} ${locked.length === 1 ? 'stays' : 'stay'} asleep: at Qi Condensation the body still needs ${locked.length === 1 ? 'it' : 'them'}, until Foundation.`}
    </p>
  );
}

// ---------------------------------------------------------------- the day at home

export function DayWheel({
  game,
  pick,
  onPick,
  error,
  onError,
  layout,
}: {
  game: GameState;
  pick: HourPick;
  onPick: (pick: number[]) => void;
  error: string | null;
  onError: (error: string | null) => void;
  /** Places the wheel and its editor. */
  layout: (wheel: ReactNode, editor: ReactNode) => ReactNode;
}) {
  const setHours = useGame((s) => s.setHours);
  const c = game.player;
  const rates = dayRates(c, game.calendar.day);
  // A first time waiting on an hour (ui/beacons.ts): the free qi hours wear the ring, and so does
  // the kind it wants once an hour is picked.
  const wants = new Set(
    useBeacons()
      .filter((b) => b.control === 'wheel' && b.kind)
      .map((b) => b.kind!),
  );
  const cells: Cell[] = rates.hours.map((y, i) => {
    const b = BRANCHES[i]!;
    const locked = hourLocked(c, i);
    const element = ELEMENT_INFO[b.element].name.toLowerCase();
    const duty = y.kind === 'duty' ? dutyAt(c, i) : null;
    return {
      tint: y.kind,
      label: locked ? null : HOUR_KINDS[y.kind].name,
      duty: !!duty,
      title: duty
        ? `${b.hanzi} ${b.name} (${b.clock}), ${element}: Duty · ${duty.name}, your shift`
        : `${b.hanzi} ${b.name} (${b.clock}), ${element}: ${HOUR_KINDS[y.kind].name} · ${hourYieldText(y)}${locked ? ' · locked to sleep at Qi Condensation' : ''}`,
      aria: `${b.hanzi} ${b.name}, ${b.clock}, ${element} hour: ${HOUR_KINDS[y.kind].name.toLowerCase()}${locked ? ', locked' : ''}`,
      match: matches(c, i),
      beckoning: wants.size > 0 && y.kind === 'qi' && !locked,
    };
  });
  const kinds = new Set(pick.map((i) => rates.hours[i]!.kind));
  const allLocked = pick.length > 0 && pick.every((i) => hourLocked(c, i));
  const one = pick.length === 1 ? rates.hours[pick[0]!]! : null;
  return layout(
    <Ring
      cells={cells}
      pick={pick}
      onPick={(p) => {
        onPick(p);
        onError(null);
      }}
      title={rates.routine ? rates.routine.name : 'Your own day'}
      caption={rates.routine ? 'discipline +10%' : `+${formatRate(rates.qi)} qi a day`}
      label="The day wheel: twelve double-hours, 子 at midnight at the top"
      beacon={wants.size > 0}
      shifts={shiftsOf(game)}
    />,
    <div className="wheel-editor">
      {pick.length > 0 ? (
        <>
          <PickHead pick={pick} />
          {one ? (
            <p className="caption">
              {HOUR_KINDS[one.kind].name}: {YIELD_UNITS[one.kind](one)} a day
              {hourBonuses(one).length > 0 && (
                <Why label="This hour's bonuses">
                  A twelfth of a day's {HOUR_KINDS[one.kind].name.toLowerCase()}, with{' '}
                  {hourBonuses(one).join(', ')}.
                </Why>
              )}
              {hourNote(game, one) ? `. ${hourNote(game, one)}` : ''}
            </p>
          ) : (
            <p className="caption">
              Now {kinds.size === 1 ? HOUR_KINDS[[...kinds][0]!].name.toLowerCase() : 'a mix'}. A
              kind sets them all.
            </p>
          )}
          <div className="seg wheel-kinds" role="group" aria-label="What these hours go to">
            {HOUR_KIND_IDS.filter((k) => hourKindOpen(c, k)).map((k) => (
              <button
                key={k}
                type="button"
                className={
                  wants.has(k) && !(kinds.size === 1 && kinds.has(k)) ? 'beacon-ring' : undefined
                }
                aria-pressed={kinds.size === 1 && kinds.has(k)}
                disabled={!!game.ended || (allLocked && k !== 'sleep')}
                title={HOUR_KINDS[k].what}
                onClick={() => onError(setHours(pick, k))}
              >
                {HOUR_KINDS[k].name}
              </button>
            ))}
          </div>
          <LockedNote game={game} pick={pick} />
          <DutyNote game={game} pick={pick} />
          {error && <p className="warn">{error}</p>}
        </>
      ) : (
        <>
          <p className="muted">
            Tap hours to change what they go to
            {wants.size > 0 &&
              `, then give them to ${[...wants].map((k) => HOUR_KINDS[k].name).join(' or ')}`}
            . Each tap adds or drops one, and a drag takes all it crosses.
            <Why label="How the hours pay">
              Qi, study, practice and sleep are yours from the start; body and soul hours open with
              their arts. An hour whose element matches your root pays a quarter more from layer 4,
              and dawn's purple qi at 卯 adds a tenth to qi. Shift-click adds the run from the last
              hour tapped; a tap off the wheel lets them all go.
            </Why>
          </p>
        </>
      )}
    </div>,
  );
}

// ---------------------------------------------------------------- the day on the road

/** What a road hour can be set to: the road's own, then the home kinds that are open. */
function roadKinds(game: GameState): RoadHour[] {
  return [
    'travel',
    'look',
    'gather',
    'home',
    ...HOUR_KIND_IDS.filter((k) => hourKindOpen(game.player, k)),
  ];
}

export function RoadWheel({
  game,
  pick,
  onPick,
  layout,
}: {
  game: GameState;
  pick: HourPick;
  onPick: (pick: number[]) => void;
  layout: (wheel: ReactNode, editor: ReactNode) => ReactNode;
}) {
  const mapAct = useGame((s) => s.mapAct);
  const c = game.player;
  const life = game.map;
  const r = life ? roadRoutine(life) : ROAD_ROUTINES[0]!;
  const group = life?.group ?? null;
  const shown = r.hours.map((h, i): RoadHour => (hourLocked(c, i) ? 'sleep' : h));
  const cells: Cell[] = shown.map((h, i) => {
    const b = BRANCHES[i]!;
    const locked = hourLocked(c, i);
    const what =
      h === 'home'
        ? `as at home: ${HOUR_KINDS[c.wheel[i] ?? 'qi'].name.toLowerCase()}`
        : ROAD_WORD[h];
    return {
      tint: h,
      label: locked ? null : h === 'home' ? 'Home' : h === 'look' ? 'Look' : ROAD_NAME[h],
      title: `${b.hanzi} ${b.name} (${b.clock}): ${what}${locked ? ' · locked to sleep at Qi Condensation' : ''}`,
      aria: `${b.hanzi} ${b.name}, ${b.clock}: ${what}${locked ? ', locked' : ''}`,
      match: matches(c, i),
    };
  });
  const travelling = shown.filter((h) => h === 'travel' || h === 'guard').length;
  const kinds = new Set(pick.map((i) => shown[i]!));
  const allLocked = pick.length > 0 && pick.every((i) => hourLocked(c, i));
  const own = !!life?.ownRoutines.some((o) => o.id === r.id);

  return layout(
    <Ring
      cells={cells}
      pick={pick}
      onPick={onPick}
      title={r.short}
      caption={own ? 'your own road' : `${travelling} hours on the road`}
      label="The road wheel: twelve double-hours, 子 at midnight at the top"
      beacon={false}
      shifts={shiftsOf(game, true)}
    />,
    <div className="wheel-editor">
      {pick.length > 0 ? (
        <>
          <PickHead pick={pick} />
          <p className="caption">
            {pick.length === 1
              ? cells[pick[0]!]!.title.split(': ').slice(1).join(': ')
              : `Now ${kinds.size === 1 ? ROAD_WORD[[...kinds][0]!] : 'a mix'}. A kind sets them all.`}
            {!own && !group && ' Changing a way of the road makes it a road of your own.'}
          </p>
          <div className="seg wheel-kinds" role="group" aria-label="What these road hours go to">
            {roadKinds(game).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={kinds.size === 1 && kinds.has(k)}
                disabled={!!game.ended || !!group || (allLocked && k !== 'sleep')}
                title={k === 'home' ? 'do what the home wheel does at this hour' : ROAD_WORD[k]}
                onClick={() => mapAct((s) => setRoadHours(s, pick, k))}
              >
                {ROAD_NAME[k]}
              </button>
            ))}
          </div>
          {group && (
            <p className="caption">{group.name} keeps these hours while you travel with it.</p>
          )}
          <LockedNote game={game} pick={pick} />
        </>
      ) : (
        <p className="muted">
          The day you keep while a course is set. Tap hours to change them: each tap adds or drops
          one, and a drag takes all it crosses.
          <Why label="How the road hours work">
            Travel hours move you; looking around makes camp and shows what is near; a gather hour
            stops to search the land where you stand, more the deeper the wilds and the sharper your
            perception, and only a road with one takes the finds you pass. An hour kept as at home
            does what your home wheel does then. A job's shift goes unkept while you travel. Riding
            moves you without your hours, which cultivate at half.
          </Why>
        </p>
      )}
    </div>,
  );
}

/** A routine's twelve hours as a strip of colour, for the routines list. */
export function WheelStrip({ hours }: { hours: readonly RoadHour[] }) {
  return (
    <span className="wheel-strip" aria-hidden="true">
      {hours.map((k, i) => (
        <span key={i} className={`hour-${k}`} title={`${BRANCHES[i]!.hanzi}: ${ROAD_NAME[k]}`} />
      ))}
    </span>
  );
}
