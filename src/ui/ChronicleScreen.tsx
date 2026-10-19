// The Chronicle screen (design § UI and screens, The Chronicle screen; P2.9; the Chapters setting
// of docs/mockups/chronicle-river.html). Two views share the chips and link to each other: the
// river, newest at the top, the milestones as stations on one still gilt hairline and everything
// else a season's paragraph of prose beside it, a chapter where each qi realm begins; and the
// almanac, a row per year and a column per season. Earlier lives in the slot are a picker, each
// on the one world calendar. The cutting into lives, years and stretches is ui/chronicleRiver.ts.
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { ERA, SEASON_HANZI } from '../content/calendar.ts';
import {
  CHRONICLE_KINDS,
  KIND_WORDS,
  STATION_KINDS,
  eventKind,
  type ChronicleKind,
} from '../content/chronicle.ts';
import { realm, type RealmId } from '../content/realms.ts';
import { worldYear, yearDigits } from '../core/chronicle.ts';
import type { ChronicleEvent } from '../core/state.ts';
import {
  almanacRows,
  lastSeason,
  levelWords,
  lifeLabel,
  lineOf,
  livesOf,
  qiAfterSeason,
  riverItems,
  shows,
  shownIn,
  yearsOf,
  type Chapter,
  type KindsOff,
  type Life,
  type YearRow,
} from './chronicleRiver.ts';
import { useGame } from './store.ts';
import { reducedMotion } from './settings.ts';

/** Years a page of the river holds; "Further back" adds as many again. */
const PAGE_YEARS = 40;
const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;

type View = 'river' | 'almanac';
interface Picked {
  year: number;
  season: number;
}

const kc = (k: ChronicleKind) => ({ '--kc': `var(--k-${k})` }) as CSSProperties;
const sc = (s: number) => ({ '--sc': `var(--s-${SEASONS[s]})` }) as CSSProperties;

/** Scrolls an element into view and flashes it once. */
function flashTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
  el.classList.remove('cr-flash');
  void el.offsetWidth;
  el.classList.add('cr-flash');
}

export function ChronicleScreen() {
  const game = useGame((s) => s.game);
  const [view, setView] = useState<View>('river');
  const [lifeIndex, setLifeIndex] = useState<number | null>(null);
  const [off, setOff] = useState<KindsOff>(() => new Set());
  const [limit, setLimit] = useState(PAGE_YEARS);
  const [picked, setPicked] = useState<Picked | null>(null);
  // Where a link between the views lands, flashed once the view has drawn.
  const jump = useRef<string | null>(null);

  // The game changes every tick; the lives only when a line is written, a life ends or the
  // world's year turns, so the river isn't redrawn while time runs.
  const chronicle = game?.chronicle;
  const ended = game?.ended;
  const yearNow = game ? worldYear(game.calendar.day) : 0;
  const lives = useMemo(
    () => (game ? livesOf(game) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chronicle, ended, yearNow, game?.player.name, game?.player.pronouns, game?.player.bornDay],
  );
  const life = lives[lifeIndex ?? lives.length - 1];
  const rows = useMemo(() => (life ? yearsOf(life) : []), [life]);
  const items = useMemo(() => (life ? riverItems(life, rows, limit) : []), [life, rows, limit]);

  useEffect(() => {
    if (!jump.current) return;
    flashTo(jump.current);
    jump.current = null;
  });

  const toRiver = useCallback(
    (p: Picked) => {
      // Show enough years that the season is on the page.
      const back = (rows.at(-1)?.year ?? p.year) - p.year + 1;
      setLimit((n) => (back > n ? Math.ceil(back / PAGE_YEARS) * PAGE_YEARS : n));
      setView('river');
      jump.current = `cr-r-${p.year}-${p.season}`;
    },
    [rows],
  );
  const toAlmanac = useCallback(
    (r: YearRow) => {
      setPicked({ year: r.year, season: lastSeason(r, off) });
      setView('almanac');
      jump.current = `cr-a-${r.year}`;
    },
    [off],
  );

  if (!game || !life) return null;

  const pickLife = (i: number) => {
    setLifeIndex(i === lives.length - 1 ? null : i);
    setLimit(PAGE_YEARS);
    setPicked(null);
  };
  const toggle = (k: ChronicleKind) => {
    const next = new Set(off);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setOff(next);
  };

  return (
    <section className="panel chron">
      <div className="chron-head">
        <h2 className="panel-heading">The life of {life.name ?? 'one before'}</h2>
        <div className="chron-controls">
          <div className="seg" role="group" aria-label="View">
            <button type="button" aria-pressed={view === 'river'} onClick={() => setView('river')}>
              River
            </button>
            <button
              type="button"
              aria-pressed={view === 'almanac'}
              onClick={() => setView('almanac')}
            >
              Almanac
            </button>
          </div>
          {lives.length > 1 && (
            <select
              className="chron-lives"
              aria-label="Which life"
              value={life.index}
              onChange={(e) => pickLife(Number(e.target.value))}
            >
              {lives
                .slice()
                .reverse()
                .map((l) => (
                  <option key={l.index} value={l.index}>
                    {lifeLabel(l, lives.length)}
                  </option>
                ))}
            </select>
          )}
        </div>
      </div>
      <div className="cr-chips" role="group" aria-label="Kinds of line shown">
        {CHRONICLE_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            className="cr-chip"
            aria-pressed={!off.has(k)}
            onClick={() => toggle(k)}
          >
            <span className="cr-glyph" style={kc(k)} aria-hidden="true">
              {KIND_WORDS[k].hanzi}
            </span>
            {KIND_WORDS[k].name}
          </button>
        ))}
      </div>
      {view === 'river' ? (
        <River life={life} items={items} off={off} onAlmanac={toAlmanac} />
      ) : (
        <Almanac
          life={life}
          rows={rows}
          items={items}
          off={off}
          picked={picked}
          onPick={setPicked}
          onRiver={toRiver}
        />
      )}
      {limit < rows.length && (
        <div className="actions">
          <button
            type="button"
            className="button button-quiet"
            onClick={() => setLimit((n) => n + PAGE_YEARS)}
          >
            Further back
          </button>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- the river

function Mark({ k }: { k: ChronicleKind }) {
  return (
    <span className="cr-mk" style={kc(k)} title={KIND_WORDS[k].name}>
      {KIND_WORDS[k].hanzi}
    </span>
  );
}

function Row({
  className,
  m,
  c,
  t,
  id,
  style,
}: {
  className: string;
  m?: ReactNode;
  c?: ReactNode;
  t?: ReactNode;
  id?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`cr-row ${className}`} id={id} style={style}>
      <div className="cr-m">{m}</div>
      <div className="cr-c">{c}</div>
      <div className="cr-t">{t}</div>
    </div>
  );
}

const span = (a: number, b: number) =>
  a === b ? yearDigits(a) : `${yearDigits(a)}–${yearDigits(b)}`;
const ages = (a: number, b: number) => (a === b ? `age ${a}` : `ages ${a}–${b}`);

function ChapterRow({ ch }: { ch: Chapter }) {
  const r = realm(ch.realm);
  return (
    <Row
      className="cr-chapter"
      m={<span className="cr-ch-hz">{r.hanzi}</span>}
      c={<span className="cr-knot" />}
      t={
        <>
          <b>{r.name}</b>
          <small>
            {ages(ch.ages[0], ch.ages[1])} · {ERA.name} {span(ch.years[0], ch.years[1])}
            {ch.now ? ' · now' : ''}
          </small>
        </>
      }
    />
  );
}

/** A station: a ringed brush mark on the line, or a major breakthrough's large one. */
function Station({ life, e }: { life: Life; e: ChronicleEvent }) {
  const k = eventKind(e.type, e.data);
  if (e.type === 'major') {
    const r = realm(e.data.realm as RealmId);
    return (
      <Row
        className={`cr-station cr-realm${k === 'qi' ? ' cr-realm-qi' : ''}`}
        style={k === 'qi' ? undefined : kc(k)}
        c={<span className="cr-stop">{r.hanzi}</span>}
        t={
          <>
            <b>{r.name}</b>
            <span>{lineOf(life, e)}</span>
          </>
        }
      />
    );
  }
  return (
    <Row
      className="cr-station"
      style={kc(k)}
      c={
        <span className="cr-stop" title={KIND_WORDS[k].name}>
          {KIND_WORDS[k].hanzi}
        </span>
      }
      t={lineOf(life, e)}
    />
  );
}

function YearRows({
  life,
  row,
  off,
  onAlmanac,
}: {
  life: Life;
  row: YearRow;
  off: KindsOff;
  onAlmanac: (r: YearRow) => void;
}) {
  if (shownIn(row, off).length === 0) {
    return <Row className="cr-tick" id={`cr-ry-${row.year}`} m={row.age} />;
  }
  const out: ReactNode[] = [];
  for (let s = 3; s >= 0; s--) {
    const es = row.seasons[s]!.filter((e) => shows(e, off));
    if (!es.length) continue;
    const anchor = `cr-r-${row.year}-${s}`;
    const stations = es.filter((e) => STATION_KINDS.has(eventKind(e.type, e.data))).reverse();
    const prose = es.filter((e) => !STATION_KINDS.has(eventKind(e.type, e.data)));
    out.push(
      <div key={s} id={anchor} className="cr-season">
        {stations.map((e, i) => (
          <Station key={`st-${i}`} life={life} e={e} />
        ))}
        {prose.length > 0 && (
          <Row
            className="cr-para"
            style={sc(s)}
            m={<span title={SEASONS[s]}>{SEASON_HANZI[SEASONS[s]!]}</span>}
            c={<span className="cr-bead" />}
            t={prose.map((e, i) => {
              const k = eventKind(e.type, e.data);
              return (
                <span key={i} className={k === 'settled' ? 'cr-settled' : undefined}>
                  <Mark k={k} />
                  {lineOf(life, e)}{' '}
                </span>
              );
            })}
          />
        )}
      </div>,
    );
  }
  return (
    <>
      <Row
        className="cr-yr"
        id={`cr-ry-${row.year}`}
        m={<span title={`Age ${row.age}`}>{row.age}</span>}
        c={<span className="cr-notch" />}
        t={
          <>
            {ERA.name} {yearDigits(row.year)}
            <small>
              {levelWords(row.qi)} ·{' '}
              <button type="button" className="cr-link" onClick={() => onAlmanac(row)}>
                almanac
              </button>
            </small>
          </>
        }
      />
      {out}
    </>
  );
}

function FoldRow({ a, years }: { a: [number, number]; years: [number, number] }) {
  return (
    <Row
      className="cr-chapter cr-fold"
      m={<span className="cr-ch-hz">凡人</span>}
      c={<span className="cr-knot" />}
      t={
        <>
          <b>Before the path</b>
          <small>
            {ages(a[0], a[1])} · {ERA.name} {span(years[0], years[1])}, nothing written
          </small>
        </>
      }
    />
  );
}

const River = memo(function River({
  life,
  items,
  off,
  onAlmanac,
}: {
  life: Life;
  items: ReturnType<typeof riverItems>;
  off: KindsOff;
  onAlmanac: (r: YearRow) => void;
}) {
  return (
    <div className="cr-river">
      <Row className="cr-key" m="age" t="the world’s year" />
      {items.map((it, i) => {
        if (it.kind === 'chapter') return <ChapterRow key={`ch-${i}`} ch={it.chapter} />;
        if (it.kind === 'fold') return <FoldRow key="fold" a={it.ages} years={it.years} />;
        if (it.kind === 'year') {
          return (
            <YearRows key={it.row.year} life={life} row={it.row} off={off} onAlmanac={onAlmanac} />
          );
        }
        const n = it.years[1] - it.years[0] + 1;
        return (
          <div key={`secl-${it.years[0]}`} className="cr-secl">
            <Row
              className="cr-secl-head"
              t={
                <>
                  <b>In seclusion</b>
                  {span(it.years[0], it.years[1])}, {ages(it.ages[0], it.ages[1])} · {n} years
                  {it.gave ? `: ${it.gave}` : ''}
                </>
              }
            />
            {it.rows.map((r) => (
              <YearRows key={r.year} life={life} row={r} off={off} onAlmanac={onAlmanac} />
            ))}
          </div>
        );
      })}
    </div>
  );
});

// ---------------------------------------------------------------- the almanac

const Almanac = memo(function Almanac({
  life,
  rows,
  items,
  off,
  picked,
  onPick,
  onRiver,
}: {
  life: Life;
  rows: readonly YearRow[];
  items: ReturnType<typeof riverItems>;
  off: KindsOff;
  picked: Picked | null;
  onPick: (p: Picked) => void;
  onRiver: (p: Picked) => void;
}) {
  const table = almanacRows(items, off);
  const pickedRow = picked ? rows.find((r) => r.year === picked.year) : undefined;
  return (
    <div className="cr-alm">
      <table className="cr-almanac">
        <thead>
          <tr>
            <th className="cr-yrc" />
            {SEASONS.map((s, i) => (
              <th key={s} style={sc(i)}>
                <span className="cr-b">{SEASON_HANZI[s]}</span>
                {s}
              </th>
            ))}
            <th className="cr-end">By year’s end</th>
          </tr>
        </thead>
        <tbody>
          {table.map((r, i) => {
            if (r.kind === 'band') {
              return (
                <tr key={`band-${i}`} className="cr-band">
                  <td />
                  <td className="cr-span" colSpan={4}>
                    <b>In seclusion</b>
                    {span(r.years[0], r.years[1])} · {r.years[1] - r.years[0] + 1} years
                    {r.gave ? `: ${r.gave}` : ''}
                  </td>
                  <td className="cr-end" />
                </tr>
              );
            }
            if (r.kind === 'fold') {
              return (
                <tr key="fold" className="cr-afold">
                  <td className="cr-yrc">
                    {r.ages[0]}–{r.ages[1]}
                  </td>
                  <td className="cr-span" colSpan={4}>
                    Before the path, {span(r.years[0], r.years[1])}
                  </td>
                  <td className="cr-end" />
                </tr>
              );
            }
            const y = r.row;
            return (
              <tr
                key={y.year}
                id={`cr-a-${y.year}`}
                className={`${r.quiet ? 'cr-quiet' : ''}${r.inStretch ? ' cr-in-secl' : ''}`}
              >
                <td className="cr-yrc" title={`Age ${y.age}, ${ERA.name} ${yearDigits(y.year)}`}>
                  {y.age}
                  {!r.quiet && <small>{yearDigits(y.year)}</small>}
                </td>
                {r.cells.map((cell) => {
                  const sel = picked?.year === y.year && picked.season === cell.season;
                  const edge = cell.newRealm ? ' cr-realmc' : cell.rise ? ' cr-rise' : '';
                  return (
                    <td
                      key={cell.season}
                      className={`cr-cell${edge}${sel ? ' is-sel' : ''}`}
                      style={sc(cell.season)}
                    >
                      <button
                        type="button"
                        aria-pressed={sel}
                        aria-label={`${SEASONS[cell.season]} ${yearDigits(y.year)}: ${cell.kinds.length} lines`}
                        onClick={() => onPick({ year: y.year, season: cell.season })}
                      >
                        {cell.kinds.map((k, j) => (
                          <span
                            key={j}
                            className={`cr-pip${k === 'settled' ? ' is-dim' : ''}`}
                            style={kc(k)}
                          >
                            {KIND_WORDS[k].hanzi}
                          </span>
                        ))}
                      </button>
                    </td>
                  );
                })}
                <td className="cr-end">{r.end}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Readout life={life} row={pickedRow} picked={picked} off={off} onRiver={onRiver} />
    </div>
  );
});

function Readout({
  life,
  row,
  picked,
  off,
  onRiver,
}: {
  life: Life;
  row: YearRow | undefined;
  picked: Picked | null;
  off: KindsOff;
  onRiver: (p: Picked) => void;
}) {
  if (!picked || !row) {
    return (
      <div className="cr-readout">
        <h3 className="sub-heading">Pick a season</h3>
        <p className="caption">Each square is a season; its marks are what happened in it.</p>
      </div>
    );
  }
  const es = row.seasons[picked.season]!.filter((e) => shows(e, off));
  const after = qiAfterSeason(row, picked.season);
  const season = SEASONS[picked.season]!;
  return (
    <div className="cr-readout" aria-live="polite">
      <h3 className="sub-heading">
        {season.charAt(0).toUpperCase() + season.slice(1)} {yearDigits(row.year)}
      </h3>
      <p className="caption">
        {life.name ?? 'The one before'} at {row.age}
      </p>
      {es.length ? (
        es.map((e, i) => {
          const k = eventKind(e.type, e.data);
          return (
            <div key={i} className={`cr-ln${k === 'settled' ? ' cr-settled' : ''}`}>
              <span className={`cr-pip${k === 'settled' ? ' is-dim' : ''}`} style={kc(k)}>
                {KIND_WORDS[k].hanzi}
              </span>
              <span>{lineOf(life, e)}</span>
            </div>
          );
        })
      ) : (
        <p className="caption">A quiet season.</p>
      )}
      <div className="cr-after">
        <span>After it: {levelWords(after)}</span>
        <button type="button" className="cr-link" onClick={() => onRiver(picked)}>
          Read it in the river →
        </button>
      </div>
    </div>
  );
}
