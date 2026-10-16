// The Routine screen (design § UI and screens, the Routine row; P2.5f, from the "Cultivate as
// three tabs" canvas, renamed in P3.7's fix): what your hours do. A strip of the day's twelve hours
// with their counts across the top, then three tabs, one per kind of work, which an hour on the
// strip opens: Day (the day wheel at home or on the road, its routines folded under it, the method
// on each ladder, the auto setting for minor breakthroughs and stone burning), Practice (what was
// the Techniques screen) and Study (the reading queue). A tab shows once it holds something.
// Breakthroughs are called on Cultivate (P2.4).
import { useEffect, useState, type ReactNode } from 'react';
import { AUTO_IDS, AUTO_SETTINGS } from '../content/cultivation.ts';
import { ELEMENT_INFO } from '../content/elements.ts';
import { BRANCHES, HOUR_KIND_IDS, HOUR_KINDS } from '../content/hours.ts';
import { root } from '../content/roots.ts';
import { hasRoutine, routine } from '../content/routines.ts';
import { technique } from '../content/techniques.ts';
import { isNew, newIds } from '../core/seen.ts';
import { practicingNow } from '../core/techniques.ts';
import { attentionCeiling } from '../core/attention.ts';
import { dayRates, inTutorial, qiSpeed } from '../core/cultivation.ts';
import { ladderMethod } from '../core/methods.ts';
import type { GameState } from '../core/state.ts';
import { canFollow, effectiveWheel } from '../core/wheel.ts';
import { ROAD_ROUTINES, WAYS, type RoadHour } from '../content/map/travel.ts';
import {
  followRoadRoutine,
  forgetRoadRoutine,
  liPerDay,
  renameRoadRoutine,
  roadRoutine,
  roadRoutines,
} from '../core/map/travel.ts';
import { DayWheel, RoadWheel, WheelStrip } from './DayWheel.tsx';
import { MethodRow } from './MethodCard.tsx';
import { formatNumber, formatPercent, formatRate } from './format.ts';
import { ROUTINE_TABS, routineTabs, TAB_OF } from './routineTabs.ts';
import { useNav, type RoutineTab } from './nav.ts';
import { PracticeTab } from './PracticeTab.tsx';
import { useGame } from './store.ts';
import { StudyTab } from './StudyTab.tsx';
import { readingLine } from './bookcase.ts';
import { useBeacons } from './useBeacons.ts';
import { rings } from './beacons.ts';
import { LifeEdgeCard, Why } from './widgets.tsx';

/** A note's first letter raised, for a line of its own. */
const raise = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function DayPanel({ game }: { game: GameState }) {
  const setPlan = useGame((s) => s.setPlan);
  // The wheel shown: the road's while a course is set, the home one otherwise, until you switch; a
  // link from the Map's bar opens a wheel with its hour picked.
  const [road, setRoad] = useState(() => !!game.map?.course);
  const [pick, setPick] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navWheel = useNav((s) => (s.screen === 'routine' ? s.wheel : null));
  const [taken, setTaken] = useState<typeof navWheel>(null);
  if (navWheel && navWheel !== taken) {
    setTaken(navWheel);
    setRoad(navWheel.road);
    setPick([navWheel.hour]);
    setError(null);
  }
  // Taken once: coming back to Routine later opens as you left it.
  useEffect(() => {
    if (navWheel) useNav.setState({ wheel: null });
  }, [navWheel]);
  const show = (onRoad: boolean) => {
    setRoad(onRoad);
    setPick([]);
    setError(null);
  };
  const bs = useBeacons();
  const burnRing = rings(bs, 'burn-stones');
  const autoRing = rings(bs, 'auto');
  const c = game.player;
  const rates = dayRates(c, game.calendar.day);
  const speed = qiSpeed(c);
  const r = root(c.root);
  const m = ladderMethod(c, 'qi');
  const elements = c.rootElements.map((e) => ELEMENT_INFO[e].name.toLowerCase()).join(' and ');
  const qiWhy = !m ? (
    'No cultivation method yet: qi hours give nothing.'
  ) : speed.capped ? (
    `The ${m.name} carries you no further than its tier: qi hours give nothing until you take up its next chapter or a new method.`
  ) : (
    <>
      <span>
        {m.name} on a {r.name.toLowerCase()} of {elements}.
      </span>
      <span>
        Qi speed ×{speed.total.toFixed(2)}: root ×{speed.root}, method ×
        {(speed.tier * speed.rarity * speed.mastery).toFixed(2)} (tier ×{speed.tier}, rarity ×
        {speed.rarity.toFixed(2)}, mastery ×{speed.mastery}), fit ×{speed.fit}, qi density ×
        {speed.density}, Aptitude ×{speed.aptitude.toFixed(2)}
        {speed.nodes !== 1 && `, tree nodes and method ×${speed.nodes.toFixed(2)}`}
        {speed.grade !== 1 &&
          `, the grades of your breakthroughs, the latest in full and earlier ones echoing, ×${speed.grade.toFixed(2)}`}
        .
      </span>
      <span>
        That is the away rate. While you attend, attention multiplies it again: ×1.25 for being
        there, up to ×{(1 + attentionCeiling(c)).toFixed(2)} at full focus (the meter by
        Cultivate&apos;s figure).
      </span>
      <span>
        {rates.count.qi} qi hours, each a twelfth of a day, with their element, dawn and discipline
        bonuses.
      </span>
      {inTutorial(c.qi) && (
        <span>
          Layers 1–3 ignore the root, the method's tier, rarity and mastery, its fit and the element
          hours.
        </span>
      )}
      {rates.unfed.includes('qi') && <span>Its upkeep went unpaid: it stalls today.</span>}
    </>
  );
  const day = [
    rates.body > 0 && `+${formatRate(rates.body)} tempering`,
    rates.soul > 0 && `+${formatRate(rates.soul)} nourishment`,
    `+${formatRate(rates.insight)} insight`,
    rates.practice > 0 &&
      `+${formatRate(rates.practice)} practice days on ${practicingNow(c)
        .map((id) => technique(id).name)
        .join(' and ')}`,
    rates.study > 0 && readingLine(c),
  ].filter(Boolean);

  return (
    <section className="panel" aria-labelledby="day-heading">
      <div className="day-head">
        <h2 id="day-heading" className="panel-heading">
          {road ? 'The day on the road' : 'The day at home'}
        </h2>
        <div className="seg" role="group" aria-label="Which day">
          <button type="button" aria-pressed={!road} onClick={() => show(false)}>
            Home <span className="hanzi">居</span>
          </button>
          <button type="button" aria-pressed={road} onClick={() => show(true)}>
            Road <span className="hanzi">途</span>
          </button>
        </div>
      </div>
      {road ? (
        <RoadWheel game={game} pick={pick} onPick={setPick} />
      ) : (
        <DayWheel game={game} pick={pick} onPick={setPick} error={error} onError={setError} />
      )}
      {road ? (
        <p className="rates spaced">{roadLine(game)}</p>
      ) : (
        <p className="rates spaced">
          A day of seclusion: +{formatRate(rates.qi)} qi
          <Why label="How qi is worked out">{qiWhy}</Why>
          {day.length > 0 && ` · ${day.join(' · ')}`}
        </p>
      )}
      {road ? <RoadFold game={game} /> : <HomeFold game={game} />}
      <div className="settings-row">
        <div className="field">
          <span>
            <span id="auto-label">Minor breakthroughs</span>
            <Why label="How minor breakthroughs run">
              {c.plan.auto === 'off'
                ? 'Minor breakthroughs wait for you; offline, a full bar holds.'
                : c.plan.auto === 'bold'
                  ? 'Minor breakthroughs go the moment a bar is full.'
                  : `Minor breakthroughs go on their own at ${formatPercent(AUTO_SETTINGS[c.plan.auto].minOdds)} odds or a bar at 150%, online and off.`}{' '}
              Major breakthroughs are always yours to call, on Cultivate, and never happen offline.
            </Why>
          </span>
          <div
            className={`seg${autoRing ? ' beacon-ring' : ''}`}
            role="group"
            aria-labelledby="auto-label"
          >
            {AUTO_IDS.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={c.plan.auto === id}
                onClick={() => setPlan({ auto: id })}
              >
                {AUTO_SETTINGS[id].name}
              </button>
            ))}
          </div>
        </div>
        <label className={`check${burnRing ? ' beacon-ring' : ''}`}>
          <input
            type="checkbox"
            checked={c.plan.burnStones}
            onChange={(e) => setPlan({ burnStones: e.target.checked })}
          />
          Burn spirit stones in qi hours
          <Why label="How stones burn">
            Each stone burned in a qi hour adds a fifth of a full day of qi hours, so a full burn
            doubles the day.
            {rates.stoneCap > 0
              ? ` Today that is up to ${formatNumber(rates.stoneCap)} stones; you hold ${formatNumber(c.stones)}.`
              : ''}
          </Why>
        </label>
      </div>
    </section>
  );
}

/** What the road wheel's day comes to: its routine's note, the way you go, and the li. */
function roadLine(game: GameState): string {
  const life = game.map;
  const r = life ? roadRoutine(life) : ROAD_ROUTINES[0]!;
  if (!life) return `${raise(r.note)}.`;
  const w = WAYS.find((x) => x.id === life.way)!;
  return `${raise(r.note)} · ${w.name.toLowerCase()}, ${Math.round(liPerDay(game)).toLocaleString('en-US')} li a day`;
}

/**
 * Routines fold under the wheel (P3.7's fix): one line names the routine you keep, and Change opens
 * the list, then closes it to the one line again.
 */
function Fold({
  label,
  name,
  note,
  children,
}: {
  label: string;
  name: string;
  note: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`routine-fold${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="routine-fold-head"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="routine-fold-label">{label}</span>
        <b>{name}</b>
        <span className="muted">· {note}</span>
        <span className="routine-fold-chev">{open ? 'Close' : 'Change'}</span>
      </button>
      {open && <div className="routine-fold-body">{children}</div>}
    </div>
  );
}

function FoldRow({
  name,
  hours,
  now,
  note,
  children,
}: {
  name: ReactNode;
  hours: readonly RoadHour[];
  now: boolean;
  note?: string;
  children: ReactNode;
}) {
  return (
    <li className={`routine-fold-row${now ? ' is-now' : ''}`}>
      <span className="routine-fold-name">{name}</span>
      <WheelStrip hours={hours} />
      <span className="routine-fold-act">
        {now && <span className="accent">Following</span>}
        {children}
      </span>
      {note && <span className="routine-fold-note">{note}</span>}
    </li>
  );
}

function HomeFold({ game }: { game: GameState }) {
  const { followRoutine, saveRoutine, forgetRoutine } = useGame.getState();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const c = game.player;
  const following = dayRates(c, game.calendar.day).routine;
  const learned = c.routines.filter(hasRoutine).map(routine);
  const same = (hours: readonly string[]) => hours.every((k, i) => c.wheel[i] === k);
  const saved = c.savedRoutines.find((r) => same(r.hours));

  return (
    <Fold
      label="Routine"
      name={following?.name ?? saved?.name ?? 'Your own day'}
      note={following ? 'discipline +10%' : 'no discipline'}
    >
      {learned.length > 0 && (
        <>
          <p className="routine-fold-group">
            Learned · keep one to the hour for discipline
            <Why label="How discipline works">
              Follow a routine learned from a teacher, manual or sect exactly, all twelve hours, and
              every waking hour pays a tenth more. A wheel you save yourself earns no discipline.
            </Why>
          </p>
          <ul className="routine-fold-list">
            {learned.map((r) => {
              const check = canFollow(c, r.hours);
              const now = following?.id === r.id;
              return (
                <FoldRow
                  key={r.id}
                  name={
                    <>
                      {r.name} <span className="hanzi">{r.hanzi}</span>
                    </>
                  }
                  hours={r.hours}
                  now={now}
                  note={check.ok ? `From ${r.source}.` : `From ${r.source}. ${check.reason}`}
                >
                  {!now && (
                    <button
                      type="button"
                      className="button"
                      disabled={!check.ok || !!game.ended}
                      onClick={() => setError(followRoutine(r.hours))}
                    >
                      Follow
                    </button>
                  )}
                </FoldRow>
              );
            })}
          </ul>
        </>
      )}
      {c.savedRoutines.length > 0 && (
        <>
          <p className="routine-fold-group">Your own</p>
          <ul className="routine-fold-list">
            {c.savedRoutines.map((r) => (
              <FoldRow key={r.name} name={r.name} hours={r.hours} now={same(r.hours)}>
                {!same(r.hours) && (
                  <button
                    type="button"
                    className="button"
                    disabled={!!game.ended}
                    onClick={() => setError(followRoutine(r.hours))}
                  >
                    Use
                  </button>
                )}
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => forgetRoutine(r.name)}
                >
                  Forget
                </button>
              </FoldRow>
            ))}
          </ul>
        </>
      )}
      <form
        className="routine-fold-save"
        onSubmit={(e) => {
          e.preventDefault();
          const why = saveRoutine(name);
          setError(why);
          if (!why) setName('');
        }}
      >
        <input
          type="text"
          value={name}
          maxLength={40}
          placeholder="Save this wheel as…"
          aria-label="Save this wheel as a routine"
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="button" disabled={!!game.ended}>
          Save
        </button>
      </form>
      {error && <p className="warn">{error}</p>}
    </Fold>
  );
}

function RoadFold({ game }: { game: GameState }) {
  const mapAct = useGame((s) => s.mapAct);
  const [naming, setNaming] = useState<{ id: string; name: string } | null>(null);
  const life = game.map;
  const current = life ? roadRoutine(life) : ROAD_ROUTINES[0]!;
  const own = life ? roadRoutines(life).filter((r) => r.own) : [];
  const group = life?.group ?? null;
  const done = () => {
    if (naming) mapAct((s) => renameRoadRoutine(s, naming.id, naming.name));
    setNaming(null);
  };
  const mine = own.some((r) => r.id === current.id);

  return (
    <Fold
      label="Road routine"
      name={current.name}
      note={group ? `kept by ${group.name}` : mine ? 'your own' : 'a way of the road'}
    >
      <p className="routine-fold-group">Ways of the road</p>
      <ul className="routine-fold-list">
        {ROAD_ROUTINES.map((r) => (
          <FoldRow
            key={r.id}
            name={r.name}
            hours={r.hours}
            now={current.id === r.id}
            note={`${raise(r.note)}.`}
          >
            {current.id !== r.id && (
              <button
                type="button"
                className="button"
                disabled={!!group || !!game.ended}
                onClick={() => mapAct((s) => followRoadRoutine(s, r.id))}
              >
                Follow
              </button>
            )}
          </FoldRow>
        ))}
      </ul>
      <p className="routine-fold-group">Your own · change an hour of a way and it becomes yours</p>
      {own.length > 0 ? (
        <ul className="routine-fold-list">
          {own.map((r) => (
            <FoldRow
              key={r.id}
              name={
                naming?.id === r.id ? (
                  <input
                    type="text"
                    value={naming.name}
                    maxLength={40}
                    aria-label="The road's name"
                    autoFocus
                    onChange={(e) => setNaming({ id: r.id, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') done();
                      if (e.key === 'Escape') setNaming(null);
                    }}
                  />
                ) : (
                  r.name
                )
              }
              hours={r.hours}
              now={current.id === r.id}
            >
              {current.id !== r.id && (
                <button
                  type="button"
                  className="button"
                  disabled={!!group || !!game.ended}
                  onClick={() => mapAct((s) => followRoadRoutine(s, r.id))}
                >
                  Follow
                </button>
              )}
              <button
                type="button"
                className="button button-quiet"
                onClick={() =>
                  naming?.id === r.id ? done() : setNaming({ id: r.id, name: r.name })
                }
              >
                {naming?.id === r.id ? 'Done' : 'Rename'}
              </button>
              <button
                type="button"
                className="button button-quiet"
                disabled={!!group && current.id === r.id}
                onClick={() => mapAct((s) => forgetRoadRoutine(s, r.id))}
              >
                Forget
              </button>
            </FoldRow>
          ))}
        </ul>
      ) : (
        <p className="caption">None yet.</p>
      )}
    </Fold>
  );
}

function MethodsPanel({ game }: { game: GameState }) {
  return (
    <section className="panel" aria-labelledby="methods-heading">
      <h2 id="methods-heading" className="panel-heading">
        Methods
      </h2>
      <ul className="methods">
        {(['qi', 'body', 'soul'] as const).map((which) => (
          <MethodRow key={which} game={game} which={which} />
        ))}
      </ul>
    </section>
  );
}

/** The day's twelve hours colored by kind, the open tab's outlined; tapping one opens its tab. */
function HourStrip({
  game,
  tab,
  tabs,
  onTab,
}: {
  game: GameState;
  tab: RoutineTab;
  tabs: readonly RoutineTab[];
  onTab: (tab: RoutineTab) => void;
}) {
  const wheel = effectiveWheel(game.player);
  const counts = HOUR_KIND_IDS.map((k) => [k, wheel.filter((x) => x === k).length] as const);
  return (
    <section className="hour-strip" aria-label="Today's hours">
      <div className="hour-strip-cells">
        {wheel.map((kind, i) => {
          const b = BRANCHES[i]!;
          const to = tabs.includes(TAB_OF[kind]) ? TAB_OF[kind] : 'day';
          return (
            <button
              key={b.id}
              type="button"
              className={`hour-cell hour-${kind}${TAB_OF[kind] === tab ? ' is-open' : ''}`}
              aria-label={`${b.hanzi} ${b.name}, ${b.clock}: ${HOUR_KINDS[kind].name.toLowerCase()}`}
              title={`${b.hanzi} ${b.name} (${b.clock}): ${HOUR_KINDS[kind].name}`}
              onClick={() => onTab(to)}
            >
              <span className="hanzi">{b.hanzi}</span>
            </button>
          );
        })}
      </div>
      <p className="hour-strip-counts caption">
        {counts
          .filter(([, n]) => n > 0)
          .map(([k, n]) => (
            <span key={k} className={`hour-count hour-${k}`}>
              <span className="hour-swatch" aria-hidden="true" />
              {HOUR_KINDS[k].name} {n}
            </span>
          ))}
        <span className="hour-strip-hint">Tap an hour to open its tab</span>
      </p>
    </section>
  );
}

function DayTab({ game }: { game: GameState }) {
  return (
    <div className="routine-split">
      <DayPanel game={game} />
      <MethodsPanel game={game} />
    </div>
  );
}

export function RoutineScreen() {
  const game = useGame((s) => s.game);
  const [chosen, setChosen] = useState<RoutineTab>('day');
  // A link lands on its tab: a toast's technique on Practice, a method row's copy on Study.
  const navTab = useNav((s) => (s.screen === 'routine' ? s.tab : null));
  const navSeq = useNav((s) => s.seq);
  const [arrived, setArrived] = useState(-1);
  if (navTab && navSeq !== arrived) {
    setArrived(navSeq);
    setChosen(navTab);
  }
  const beaconsNow = useBeacons();
  const tabs = game ? routineTabs(game) : [];
  const tab = tabs.includes(chosen) ? chosen : 'day';
  // Opening Practice looks at what was the Techniques screen, so its own newness clears.
  const openScreen = useGame((s) => s.openScreen);
  useEffect(() => {
    if (tab === 'practice') openScreen('techniques');
  }, [tab, openScreen]);
  if (!game) return null;
  const practiceNew =
    newIds(game, 'technique').length > 0 ||
    (game.unlocks.includes('techniques') && isNew(game, 'screen', 'techniques'));
  // A first time waiting on a tab glows it with motes, over the new glow (ui/beacons.ts).
  const beaconTabs = new Set(beaconsNow.map((b) => b.tab));

  return (
    <>
      <LifeEdgeCard />
      <HourStrip game={game} tab={tab} tabs={tabs} onTab={setChosen} />
      {tabs.length > 1 && (
        <div className="seg routine-tabs" role="tablist" aria-label="Kind of work">
          {ROUTINE_TABS.filter((t) => tabs.includes(t.id)).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              aria-pressed={tab === t.id}
              className={
                beaconTabs.has(t.id) && tab !== t.id
                  ? 'is-beacon'
                  : t.id === 'practice' && practiceNew && tab !== t.id
                    ? 'is-new'
                    : undefined
              }
              onClick={() => setChosen(t.id)}
            >
              {t.name} <span className="hanzi">{t.hanzi}</span>
              {t.id === 'practice' && practiceNew && tab !== t.id && (
                <span className="menu-mark is-new" role="img" aria-label="something new" />
              )}
            </button>
          ))}
        </div>
      )}
      {tab === 'day' && <DayTab game={game} />}
      {tab === 'practice' && <PracticeTab />}
      {tab === 'study' && <StudyTab game={game} />}
    </>
  );
}
