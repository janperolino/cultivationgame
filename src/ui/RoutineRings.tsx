// Routine's rings (A4, docs/mockups/routine-art-study.html, layout B): each tab has one ring on the
// left of the scene, the same size in the same place, so changing tabs only changes what is in it.
// Day's is the day wheel (DayWheel.tsx), Practice's the mastery of the technique selected as five
// steps round a hub, Study's the copy being read filling toward done. All three sit in a gilt bezel
// drawn in code: the ticks, the studs, and on Day the five phases at the quarters. Still; nothing
// loops. Units are the day wheel's: its hours run out to 132, the bezel to 172.
import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { CaveBackdrop } from './CaveBackdrop.tsx';
import { copyManual, copyTitle, readDays } from '../content/copies.ts';
import { MANUAL_KINDS } from '../content/manuals.ts';
import { MASTERY, TECHNIQUE_MASTERY } from '../content/mastery.ts';
import { rarity } from '../content/rarity.ts';
import type { Technique } from '../content/techniques.ts';
import { masteryBurst } from '../core/insight.ts';
import { readProgress } from '../core/reading.ts';
import type { Cultivator } from '../core/state.ts';
import { mastery, masteryNeed, techniqueSealed } from '../core/techniques.ts';
import { formatNumber } from './format.ts';

/**
 * The screen's scene, kept while the tabs change: the cave and its scrims behind, the tab's ring,
 * page and column, and over them the star. The star lives here, in a layer laid out like the
 * ring, so changing tabs never rebuilds it and its turn runs on unbroken (Jan's note).
 */
export function RoutineStage({ day, children }: { day: number; children: ReactNode }) {
  return (
    <div className="routine">
      <CaveBackdrop />
      <div className="routine-scrim" aria-hidden="true" />
      {children}
      <div className="routine-room routine-orbit-room" aria-hidden="true">
        <div className="routine-ring">
          <OrbitStar day={day} />
        </div>
      </div>
    </div>
  );
}

/**
 * The star marks the hour: 子 starts 15° before the top, and a day is one turn. It glides from tick
 * to tick, and the same star lives all day and night: at midnight, or after a long time away, it
 * steps to its new place for that one change without gliding back round, so its spin never breaks.
 */
function OrbitStar({ day }: { day: number }) {
  const at = (((day % 1) + 1) % 1) * 360 - 15;
  const ref = useRef<HTMLSpanElement>(null);
  const last = useRef(at);
  useLayoutEffect(() => {
    const el = ref.current;
    const jump = Math.abs(at - last.current) > 90;
    last.current = at;
    if (!el || !jump) return;
    // Take the new place with no transition, then let later ticks glide again.
    el.style.transition = 'none';
    void el.offsetWidth;
    el.style.transition = '';
  }, [at]);
  return (
    <span ref={ref} className="ring-orbit" style={{ '--at': `${at}deg` } as CSSProperties}>
      <svg viewBox="-6 -6 12 12">
        <path d="M0 -5.5 L1.1 -1.1 L5.5 0 L1.1 1.1 L0 5.5 L-1.1 1.1 L-5.5 0 L-1.1 -1.1Z" />
      </svg>
    </span>
  );
}

/** A tab's part of the scene: its ring and the ring's page on the left, its column on the right. */
export function RoutineScene({
  ring,
  page,
  column,
}: {
  ring: ReactNode;
  page: ReactNode;
  column: ReactNode;
}) {
  return (
    <>
      <div className="routine-room">
        <div className="routine-ring">{ring}</div>
        <div className="routine-page">{page}</div>
      </div>
      <div className="routine-col">{column}</div>
    </>
  );
}

/** The ring's box: the hours to 132, the bezel to 158, the quarters' hanzi to about 180. */
const RING_VIEWBOX = '-188 -188 376 376';

function polar(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [r * Math.cos(a), r * Math.sin(a)];
}

/** An arc along radius r, clockwise from one clock angle to another, 0 at the top. */
function arcPath(r: number, from: number, to: number): string {
  const [x1, y1] = polar(r, from);
  const [x2, y2] = polar(r, to);
  return `M${x1} ${y1}A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

const TICK_IN = 138;
const BAND = 155;
const QUARTERS: readonly [string, number][] = [
  ['水', 0],
  ['木', 90],
  ['火', 180],
  ['金', 270],
];

/** The gilt bezel round a ring: a dark disc, a ticked inner rule, a double outer one, four studs. */
export function Bezel({ quarters = false }: { quarters?: boolean }) {
  const ticks: ReactNode[] = [];
  for (let d = 0; d < 360; d += 3) {
    const long = d % 15 === 0;
    const [x1, y1] = polar(TICK_IN + 0.5, d);
    const [x2, y2] = polar(TICK_IN + (long ? 5 : 2.6), d);
    ticks.push(
      <line
        key={d}
        className={long ? 'bezel-tick is-long' : 'bezel-tick'}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
      />,
    );
  }
  return (
    <g className="bezel" aria-hidden="true">
      <circle className="bezel-disc" r={BAND + 9} />
      <circle className="bezel-rule" r={BAND} />
      <circle className="bezel-rule is-faint" r={BAND + 3} />
      <circle className="bezel-rule is-inner" r={TICK_IN} />
      {ticks}
      {QUARTERS.map(([hz, d]) => {
        const [sx, sy] = polar(BAND, d);
        const [qx, qy] = polar(BAND + 17, d);
        return (
          <g key={d}>
            <rect
              className="bezel-stud"
              x={sx - 2.6}
              y={sy - 2.6}
              width={5.2}
              height={5.2}
              transform={`rotate(45 ${sx} ${sy})`}
            />
            {quarters && (
              <text className="bezel-quarter hanzi" x={qx} y={qy} dy="0.35em">
                {hz}
              </text>
            )}
          </g>
        );
      })}
      {quarters &&
        [45, 135, 225, 315].map((d) => {
          const [x, y] = polar(BAND + 13, d);
          return (
            <text key={d} className="bezel-quarter is-earth hanzi" x={x} y={y} dy="0.35em">
              土
            </text>
          );
        })}
    </g>
  );
}

const TRACK = 124;

/** A hub's line of text, shrunk to fit when the name is long. */
function fit(text: string, size: number, width: number): number {
  return Math.min(size, (width / Math.max(1, text.length)) * 1.9);
}

/** Practice's ring: Glimpse to Origin as five arcs, each filling within itself, round the technique. */
export function MasteryRing({ c, t }: { c: Cultivator; t: Technique }) {
  const m = mastery(c, t.id);
  const sealed = techniqueSealed(c, t);
  const level = MASTERY[m.level]!;
  return (
    <svg
      className={`ring mastery-ring${sealed ? ' is-sealed' : ''}`}
      viewBox={RING_VIEWBOX}
      role="img"
      aria-label={`${t.name}: ${sealed ? 'sealed' : level.name}${m.next !== null ? `, ${formatNumber(m.practice)} of ${formatNumber(m.next)} practice days to the next level` : ''}`}
    >
      <Bezel />
      {MASTERY.map((lv, i) => {
        const from = i === 0 ? 0 : masteryNeed(t, i - 1);
        const to = masteryNeed(t, i);
        const fill = i <= m.level ? 1 : i === m.level + 1 ? (m.practice - from) / (to - from) : 0;
        const a0 = i * 72 + 1.5;
        const a1 = i * 72 + 70.5;
        const [lx, ly] = polar(88, i * 72 + 36);
        const burst = masteryBurst(c, TECHNIQUE_MASTERY, t.tier, i);
        const state = i === m.level ? ' is-current' : i < m.level ? ' is-reached' : '';
        return (
          <g key={lv.id} className={`mastery-arc${state}`}>
            <path className="ring-track" d={arcPath(TRACK, a0, a1)} />
            {fill > 0 && !sealed && (
              <path className="ring-fill" d={arcPath(TRACK, a0, a0 + (a1 - a0) * fill)} />
            )}
            <text className="mastery-arc-hanzi hanzi" x={lx} y={ly - 9}>
              {lv.hanzi}
            </text>
            <text className="mastery-arc-name" x={lx} y={ly + 4}>
              {lv.name}
            </text>
            <text className="mastery-arc-days" x={lx} y={ly + 14}>
              {to === 0 ? 'at once' : `${formatNumber(to)} days`}
            </text>
            {burst > 0 && (
              <text className="mastery-arc-burst" x={lx} y={ly + 23}>
                +{formatNumber(burst)} insight
              </text>
            )}
          </g>
        );
      })}
      <circle className="ring-hub" r={50} />
      <text className="ring-hub-hanzi hanzi" y={-15}>
        {t.hanzi}
      </text>
      <text
        className={`ring-hub-name rarity-${t.rarity}`}
        y={3}
        style={{ fontSize: `${fit(t.name, 10.5, 92)}px` }}
      >
        {t.name}
      </text>
      <text className="ring-hub-caption" y={17}>
        {sealed
          ? 'Sealed'
          : m.next === null
            ? 'Origin · complete'
            : `${level.name} · ${formatNumber(m.practice)} / ${formatNumber(m.next)} days`}
      </text>
    </svg>
  );
}

/** Study's ring: the copy being read as an arc filling toward done, or an empty ring. */
export function ReadingRing({ c, id }: { c: Cultivator; id: string | null }) {
  if (!id) {
    return (
      <svg
        className="ring reading-ring"
        viewBox={RING_VIEWBOX}
        role="img"
        aria-label="Nothing is being read"
      >
        <Bezel />
        <circle className="ring-track" r={TRACK} />
        <circle className="ring-hub" r={87} />
        <text className="ring-hub-name" y={-2}>
          Nothing being read
        </text>
        <text className="ring-hub-caption" y={14}>
          Queue a copy from the shelf
        </text>
      </svg>
    );
  }
  const m = copyManual(id);
  const need = readDays(id);
  const frac = Math.min(1, readProgress(c, id) / need);
  const [hx, hy] = polar(TRACK, frac * 360);
  return (
    <svg
      className="ring reading-ring"
      viewBox={RING_VIEWBOX}
      role="img"
      aria-label={`Reading ${copyTitle(id)}: ${Math.floor(frac * 100)}%`}
    >
      <Bezel />
      <circle className="ring-track" r={TRACK} />
      {frac >= 1 ? (
        <circle className="ring-fill" r={TRACK} />
      ) : (
        frac > 0 && <path className="ring-fill" d={arcPath(TRACK, 0, frac * 360)} />
      )}
      {frac > 0 && frac < 1 && <circle className="ring-head" cx={hx} cy={hy} r={3.2} />}
      <circle className="ring-hub" r={87} />
      <text className="ring-hub-hanzi hanzi is-large" y={-34}>
        {m.hanzi}
      </text>
      <text
        className={`ring-hub-name is-large rarity-${m.rarity}`}
        y={-12}
        style={{ fontSize: `${fit(m.name, 13, 150)}px` }}
      >
        {m.name}
      </text>
      <text className="ring-hub-caption" y={4}>
        {rarity(m.rarity).name} {MANUAL_KINDS[m.kind].name.toLowerCase()} · tier {m.tier}
      </text>
      <text className="ring-hub-figure" y={30}>
        {Math.floor(frac * 100)}%
      </text>
    </svg>
  );
}
