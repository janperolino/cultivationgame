// The Cultivate screen (design § UI and screens, the Cultivate row; P2.5f, from the "Cultivate as
// three tabs" canvas): what your hours do. A strip of the day's twelve hours with their counts
// across the top, then three tabs, one per kind of work, which an hour on the strip opens:
// Cultivation (the day wheel and its routines, the method on each ladder, the auto setting for minor
// breakthroughs and stone burning), Practice (what was the Techniques screen) and Study (the reading
// queue). A tab shows once it holds something. Breakthroughs are called at the Abode (P2.4).
import { useEffect, useState } from 'react';
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
import { DayWheel, WheelStrip } from './DayWheel.tsx';
import { MethodRow } from './MethodCard.tsx';
import { formatNumber, formatPercent, formatRate } from './format.ts';
import { CULTIVATE_TABS, cultivateTabs, TAB_OF } from './cultivateTabs.ts';
import { useNav, type CultivateTab } from './nav.ts';
import { PracticeTab } from './PracticeTab.tsx';
import { useGame } from './store.ts';
import { StudyTab } from './StudyTab.tsx';
import { readingLine } from './bookcase.ts';
import { useBeacons } from './useBeacons.ts';
import { rings } from './beacons.ts';
import { LifeEdgeCard, Why } from './widgets.tsx';

function DayPanel({ game }: { game: GameState }) {
  const setPlan = useGame((s) => s.setPlan);
  const burnRing = rings(useBeacons(), 'burn-stones');
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
        there, up to ×{(1 + attentionCeiling(c)).toFixed(2)} at full focus (the meter by the
        Abode&apos;s figure).
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
      <h2 id="day-heading" className="panel-heading">
        The day
      </h2>
      <DayWheel game={game} />
      <p className="rates spaced">
        A day of seclusion: +{formatRate(rates.qi)} qi
        <Why label="How qi is worked out">{qiWhy}</Why>
        {day.length > 0 && ` · ${day.join(' · ')}`}
      </p>
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
              Major breakthroughs are always yours to call, at the Abode, and never happen offline.
            </Why>
          </span>
          <div className="seg" role="group" aria-labelledby="auto-label">
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

function RoutinesPanel({ game }: { game: GameState }) {
  const { followRoutine, saveRoutine, forgetRoutine } = useGame.getState();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const c = game.player;
  const following = dayRates(c, game.calendar.day).routine;
  const learned = c.routines.filter(hasRoutine).map(routine);
  const same = (hours: readonly string[]) => hours.every((k, i) => c.wheel[i] === k);

  return (
    <section className="panel" aria-labelledby="routines-heading">
      <h2 id="routines-heading" className="panel-heading">
        Routines
      </h2>
      <p className="muted">
        Keep a learned routine to the hour for a discipline bonus.
        <Why label="How discipline works">
          Follow a routine learned from a teacher, manual or sect exactly, all twelve hours, and
          every waking hour pays a tenth more. A wheel you save yourself earns no discipline.
        </Why>
      </p>
      {learned.length > 0 && (
        <ul className="routines">
          {learned.map((r) => {
            const check = canFollow(c, r.hours);
            const isFollowed = following?.id === r.id;
            return (
              <li key={r.id} className="routine">
                <div className="routine-head">
                  <strong>
                    {r.name} <span className="hanzi">{r.hanzi}</span>
                  </strong>
                  <WheelStrip hours={r.hours} />
                </div>
                <p className="caption">From {r.source}.</p>
                <div className="actions">
                  {isFollowed ? (
                    <span className="accent">Following</span>
                  ) : (
                    <button
                      type="button"
                      className="button"
                      disabled={!check.ok || !!game.ended}
                      onClick={() => setError(followRoutine(r.hours))}
                    >
                      Follow
                    </button>
                  )}
                  {!check.ok && <span className="caption">{check.reason}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {c.savedRoutines.length > 0 && (
        <ul className="routines">
          {c.savedRoutines.map((r) => (
            <li key={r.name} className="routine">
              <div className="routine-head">
                <strong>{r.name}</strong>
                <WheelStrip hours={r.hours} />
              </div>
              <div className="actions">
                <button
                  type="button"
                  className="button"
                  disabled={same(r.hours) || !!game.ended}
                  onClick={() => setError(followRoutine(r.hours))}
                >
                  {same(r.hours) ? 'In use' : 'Use'}
                </button>
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => forgetRoutine(r.name)}
                >
                  Forget
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form
        className="routine-save"
        onSubmit={(e) => {
          e.preventDefault();
          const why = saveRoutine(name);
          setError(why);
          if (!why) setName('');
        }}
      >
        <label className="field">
          <span>Save this wheel as a routine</span>
          <input
            type="text"
            value={name}
            maxLength={40}
            placeholder="A name"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button type="submit" className="button" disabled={!!game.ended}>
          Save
        </button>
      </form>
      {error && <p className="warn">{error}</p>}
    </section>
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
  tab: CultivateTab;
  tabs: readonly CultivateTab[];
  onTab: (tab: CultivateTab) => void;
}) {
  const wheel = effectiveWheel(game.player);
  const counts = HOUR_KIND_IDS.map((k) => [k, wheel.filter((x) => x === k).length] as const);
  return (
    <section className="hour-strip" aria-label="Today's hours">
      <div className="hour-strip-cells">
        {wheel.map((kind, i) => {
          const b = BRANCHES[i]!;
          const to = tabs.includes(TAB_OF[kind]) ? TAB_OF[kind] : 'cultivation';
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

function CultivationTab({ game }: { game: GameState }) {
  return (
    <>
      <div className="cultivate-split">
        <DayPanel game={game} />
        <MethodsPanel game={game} />
      </div>
      <RoutinesPanel game={game} />
    </>
  );
}

export function CultivateScreen() {
  const game = useGame((s) => s.game);
  const [chosen, setChosen] = useState<CultivateTab>('cultivation');
  // A link lands on its tab: a toast's technique on Practice, a method row's copy on Study.
  const navTab = useNav((s) => (s.screen === 'cultivate' ? s.tab : null));
  const navSeq = useNav((s) => s.seq);
  const [arrived, setArrived] = useState(-1);
  if (navTab && navSeq !== arrived) {
    setArrived(navSeq);
    setChosen(navTab);
  }
  const beaconsNow = useBeacons();
  const tabs = game ? cultivateTabs(game) : [];
  const tab = tabs.includes(chosen) ? chosen : 'cultivation';
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
        <div className="seg cultivate-tabs" role="tablist" aria-label="Kind of work">
          {CULTIVATE_TABS.filter((t) => tabs.includes(t.id)).map((t) => (
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
      {tab === 'cultivation' && <CultivationTab game={game} />}
      {tab === 'practice' && <PracticeTab />}
      {tab === 'study' && <StudyTab game={game} />}
    </>
  );
}
