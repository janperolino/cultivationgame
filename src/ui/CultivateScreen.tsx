import { ratesHere } from '../core/life.ts';
import { HOUR_KIND_IDS, HOUR_KINDS } from '../content/hours.ts';
import { useState, type CSSProperties } from 'react';
import { eventKind, KIND_WORDS } from '../content/chronicle.ts';
import { comingBackStory, type StorySection } from '../core/comingBack.ts';
import { barSize, ladderOpen, stonesQi } from '../core/cultivation.ts';
import { daysPerRealMs } from '../core/loop.ts';
import { ageYears, lifespanYears, type GameState } from '../core/state.ts';
import { CardFeed } from './CardFeed.tsx';
import { effectiveWheel } from '../core/wheel.ts';
import { CaveBackdrop } from './CaveBackdrop.tsx';
import { WheelStrip } from './DayWheel.tsx';
import {
  formatAgeShort,
  formatDays,
  formatDuration,
  formatLadder,
  formatNumber,
  formatRate,
} from './format.ts';
import { BreakthroughPanel, BreakthroughRow, StepNeeds } from './BreakthroughPanel.tsx';
import { useScene } from './scene.ts';
import { SeatedFigure, SeatMeter } from './SeatedFigure.tsx';
import { TodayPanel } from './TodayPanel.tsx';
import { useGame, type AwaySummary } from './store.ts';
import { technique } from '../content/techniques.ts';
import { readingLine } from './bookcase.ts';
import { EventLine, LadderBar, LifeEdgeCard } from './widgets.tsx';
import { go, goToTab } from './nav.ts';
import { built } from '../core/guides.ts';
import { knownMethods } from '../core/methods.ts';

/** Up to this many settled cards are told in full; past it, one a kind and the rest folded away. */
const SHORT_TELLING = 5;
/** The chronicle's last lines in the band's right column. */
const RECENT_LINES = 5;

function Sections({ sections }: { sections: StorySection[] }) {
  return (
    <>
      {sections.map((x) => (
        <div key={x.heading} className="away-section">
          <h3>{x.heading}</h3>
          <p>{x.lines.join(' ')}</p>
        </div>
      ))}
    </>
  );
}

/** The coming-back story in the band: its opening and what grew, the rest raised over the scene. */
function AwayCard({ away, onRead }: { away: AwaySummary; onRead: () => void }) {
  const dismissAway = useGame((s) => s.dismissAway);
  const story = comingBackStory(away.before, away.state);
  return (
    <article className="story story-away" aria-labelledby="away-heading">
      <p className="band-kicker">
        <span>While you were in seclusion</span>
        <span>
          {formatDuration(away.countedMs)} away
          {away.awayMs > away.countedMs && ` of ${formatDuration(away.awayMs)}`}
        </span>
      </p>
      <h3 id="away-heading">{story.opening}</h3>
      {story.growth.length > 0 && <p className="away-growth">{story.growth.join(' ')}</p>}
      {story.waiting && <p className="away-waiting">{story.waiting}</p>}
      {away.atEdge && <p className="warn">You woke at the edge of your lifespan.</p>}
      <div className="actions">
        <button type="button" className="button" onClick={dismissAway}>
          Continue
        </button>
        {(story.sections.length > 0 || story.firsts.length > 0) && (
          <button type="button" className="button button-quiet" onClick={onRead}>
            Read it all
          </button>
        )}
      </div>
    </article>
  );
}

/** The whole coming-back story, risen over the scene while you read it. */
function AwayStory({ away, onClose }: { away: AwaySummary; onClose: () => void }) {
  const story = comingBackStory(away.before, away.state);
  return (
    <section className="panel card-away" aria-label="The whole story">
      <h2 className="panel-heading">{story.opening}</h2>
      {story.growth.length > 0 && <p>{story.growth.join(' ')}</p>}
      {story.settled > SHORT_TELLING ? (
        <>
          <div className="away-section">
            <h3>Among what happened</h3>
            <p>{story.highlights.join(' ')}</p>
          </div>
          <p className="caption">
            {formatNumber(story.settled)} things settled on their own; the Chronicle keeps them all.
          </p>
        </>
      ) : (
        <Sections sections={story.sections} />
      )}
      {story.firsts.length > 0 && <p className="spaced accent">{story.firsts.join(' ')}</p>}
      {away.awayMs > away.countedMs && (
        <p className="caption">Offline time counts up to 12 hours.</p>
      )}
      <div className="actions">
        <button type="button" className="button button-quiet" onClick={onClose}>
          Close
        </button>
        <button type="button" className="link-button" onClick={() => go('chronicle')}>
          Read it in the Chronicle →
        </button>
      </div>
    </section>
  );
}

/** How the qi bar fills: the day's qi, the stones burned, and how long it takes at this clock. */
function QiWhy({ game }: { game: GameState }) {
  const c = game.player;
  const rates = ratesHere(game);
  const stones = c.plan.burnStones ? Math.min(rates.stoneCap, Math.floor(c.stones)) : 0;
  const perDay = rates.qi + stonesQi(rates, 1, stones);
  const left = Math.max(0, barSize(c.qi) - c.qi.bar);
  const days = perDay > 0 ? left / perDay : Infinity;
  return (
    <>
      {formatRate(rates.qi)} qi a day from today&apos;s wheel
      {stones > 0 && `, and ${formatRate(stonesQi(rates, 1, stones))} from ${stones} stones`}.{' '}
      {left <= 0
        ? 'The bar is full; past full raises the odds of the breakthrough.'
        : Number.isFinite(days)
          ? `Full in about ${formatDays(days)}, ${formatDuration(days / daysPerRealMs(game))} at this clock.`
          : 'Nothing fills it today.'}{' '}
      <StepNeeds game={game} which="qi" />
    </>
  );
}

/**
 * The seat panel's class while a breakthrough lands: it shakes and flares on a success, harder for
 * a major, and dims on a failure; under reduced motion the flash stands still (theme.css).
 */
function useBreakClass(): string {
  return useScene((s) => {
    const o = s.play?.outcome;
    if (!o) return '';
    if (!o.success) return ' is-held';
    return ` is-breaking is-${s.play!.ladder}${o.major ? ' is-major' : ''}`;
  });
}

export function CultivateScreen() {
  const game = useGame((s) => s.game);
  const away = useGame((s) => s.away);
  const breaking = useBreakClass();
  // A great realm's panel, open, takes the band's middle before anything else (Jan's call).
  const gate = useScene((s) => !!s.panel && !s.play);
  const [reading, setReading] = useState(false);
  const setMethod = useGame((s) => s.setMethod);
  if (!game) return null;

  const c = game.player;
  const rates = ratesHere(game);
  const studying = rates.study > 0 ? readingLine(c) : null;
  const drilled = Object.keys(rates.practiceEach).map((id) => technique(id).name);
  const today = [
    ...HOUR_KIND_IDS.filter((k) => rates.count[k] > 0).map(
      (k) => `${rates.count[k]} ${HOUR_KINDS[k].name.toLowerCase()}`,
    ),
    ...(drilled.length > 0 ? [`practicing ${drilled.join(' and ')}`] : []),
    ...(studying ? [studying] : []),
  ].join(' · ');

  const recent = game.chronicle.slice(-RECENT_LINES).reverse();
  const age = ageYears(c, game.calendar.day);
  // The first seclusion builds the screen a piece at a time (core/guides.ts): the figure and the
  // qi bar alone at first, with the method to take up; the band's rest once its guides are done.
  const whole = built(game, 'band');
  const toTakeUp = c.activeMethods.qi === null ? knownMethods(c, 'qi')[0] : undefined;

  // The scene (A3; docs/mockups/cultivate-bottom-study.html): the seat fills the screen with the
  // figure low in its middle, the sun's hand behind it; along the foot a band of three columns,
  // you, the open card and the chronicle's last lines. What matters only for a while (a
  // breakthrough's panel, the lifespan's edge, the whole coming-back story) rises over the scene's
  // right. Nothing on the screen scrolls (Jan's call).
  return (
    <div className="cultivate">
      <section className={`cultivate-seat${breaking}`} aria-label="The seat">
        <CaveBackdrop />
        <div className="seat-flash" aria-hidden="true" />
        <SeatedFigure game={game} />
        <SeatMeter game={game} />
        <BreakthroughRow game={game} />
      </section>

      <div className="cultivate-rise">
        <LifeEdgeCard />
        {away && reading && <AwayStory away={away} onClose={() => setReading(false)} />}
      </div>

      <div className="cultivate-band">
        <section className="band-who" aria-label="The cultivator">
          <h1 className="visually-hidden">Cultivate</h1>
          {whole && (
            <>
              <p className="cultivate-name">
                {c.name} <small>{c.pronouns}</small>
              </p>
              <p className="cultivate-realm">
                {formatLadder(c.qi)}
                <span className="cultivate-age" title="Age against lifespan">
                  {formatAgeShort(age)} <small>of {lifespanYears(c)}</small>
                </span>
              </p>
            </>
          )}
          {toTakeUp && (
            <button
              type="button"
              className="button take-up"
              data-guide="take-up"
              onClick={() => setMethod('qi', toTakeUp.id)}
            >
              Take up the {toTakeUp.name}
            </button>
          )}
          <div className="bars cultivate-bars" data-guide="qi-bar">
            <LadderBar game={game} which="qi" why={<QiWhy game={game} />} />
            {ladderOpen(c, 'body') && (
              <LadderBar game={game} which="body" why={<StepNeeds game={game} which="body" />} />
            )}
            {ladderOpen(c, 'soul') && (
              <LadderBar game={game} which="soul" why={<StepNeeds game={game} which="soul" />} />
            )}
          </div>
          {whole && (
            <div className="cultivate-routine">
              <div className="cultivate-routine-head">
                <h2>Today&apos;s routine</h2>
                <small>{rates.routine ? rates.routine.name : 'Your own day'}</small>
                <button type="button" className="link-button" onClick={() => goToTab('day')}>
                  Arrange your day →
                </button>
              </div>
              <WheelStrip hours={effectiveWheel(c)} />
              <p className="cultivate-today">{today}</p>
            </div>
          )}
        </section>

        {whole && (
          <CardFeed
            quiet={<TodayPanel game={game} />}
            first={
              gate && !game.ended ? (
                <BreakthroughPanel game={game} />
              ) : away && !game.ended ? (
                <AwayCard away={away} onRead={() => setReading((r) => !r)} />
              ) : undefined
            }
          />
        )}

        {whole && (
          <section className="band-recent" aria-label="Recent events">
            <h2>
              Recent{' '}
              <button type="button" className="link-button" onClick={() => go('chronicle')}>
                Read all →
              </button>
            </h2>
            {recent.length === 0 ? (
              <p className="caption">Nothing has happened yet.</p>
            ) : (
              <ol className="chronicle">
                {recent.map((e, i) => {
                  // Each line led by its kind's brush mark, as on the Chronicle.
                  const k = eventKind(e.type, e.data);
                  return (
                    <li key={`${e.day}-${i}`}>
                      <span
                        className="cr-mk"
                        style={{ '--kc': `var(--k-${k})` } as CSSProperties}
                        title={KIND_WORDS[k].name}
                      >
                        {KIND_WORDS[k].hanzi}
                      </span>
                      <EventLine game={game} e={e} />
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
