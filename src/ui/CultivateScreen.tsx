import { HOUR_KIND_IDS, HOUR_KINDS } from '../content/hours.ts';
import { realm } from '../content/realms.ts';
import { comingBackStory, type StorySection } from '../core/comingBack.ts';
import { barSize, dayRates, ladderOpen } from '../core/cultivation.ts';
import { daysPerRealMs } from '../core/loop.ts';
import { realmOf, type GameState } from '../core/state.ts';
import { CardFeed } from './CardFeed.tsx';
import { effectiveWheel } from '../core/wheel.ts';
import { WheelStrip } from './DayWheel.tsx';
import { formatDays, formatDuration, formatLadder, formatNumber, formatRate } from './format.ts';
import { BreakthroughPanel, BreakthroughRow, StepNeeds } from './BreakthroughPanel.tsx';
import { useScene } from './scene.ts';
import { SeatedFigure, SeatMeter } from './SeatedFigure.tsx';
import { useGame, type AwaySummary } from './store.ts';
import { technique } from '../content/techniques.ts';
import { readingLine } from './bookcase.ts';
import { AgeBar, EventLine, LadderBar, LifeEdgeCard } from './widgets.tsx';
import { go, goToTab } from './nav.ts';

/** Up to this many settled cards are told in full; past it, one a kind and the rest folded away. */
const SHORT_TELLING = 5;

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

function AwayCard({ away }: { away: AwaySummary }) {
  const dismissAway = useGame((s) => s.dismissAway);
  const story = comingBackStory(away.before, away.state);
  return (
    <section className="panel card-away story-away">
      <h2 className="panel-heading">While you were in seclusion</h2>
      <p className="away-opening">
        {story.opening}{' '}
        <span className="caption">
          {formatDuration(away.countedMs)} away
          {away.awayMs > away.countedMs &&
            ` of ${formatDuration(away.awayMs)}; offline time counts up to 12 hours`}
          .
        </span>
      </p>
      {story.growth.length > 0 && <p>{story.growth.join(' ')}</p>}
      {story.settled > SHORT_TELLING ? (
        <>
          <div className="away-section">
            <h3>Among what happened</h3>
            <p>{story.highlights.join(' ')}</p>
          </div>
          <details className="away-more">
            <summary>Everything that settled on its own · {formatNumber(story.settled)}</summary>
            <Sections sections={story.sections} />
          </details>
        </>
      ) : (
        <Sections sections={story.sections} />
      )}
      {story.waiting && <p className="spaced">{story.waiting}</p>}
      {story.firsts.length > 0 && <p className="spaced accent">{story.firsts.join(' ')}</p>}
      {away.atEdge && <p className="warn">You woke at the edge of your lifespan.</p>}
      <div className="actions">
        <button type="button" className="button" onClick={dismissAway}>
          Continue
        </button>
      </div>
    </section>
  );
}

/** How the qi bar fills: the day's qi, the stones burned, and how long it takes at this clock. */
function QiWhy({ game }: { game: GameState }) {
  const c = game.player;
  const rates = dayRates(c, game.calendar.day);
  const stones = c.plan.burnStones ? Math.min(rates.stoneCap, Math.floor(c.stones)) : 0;
  const perDay = rates.qi + stones * rates.qiPerStone;
  const left = Math.max(0, barSize(c.qi) - c.qi.bar);
  const days = perDay > 0 ? left / perDay : Infinity;
  return (
    <>
      {formatRate(rates.qi)} qi a day from today&apos;s wheel
      {stones > 0 && `, and ${formatRate(stones * rates.qiPerStone)} from ${stones} stones`}.{' '}
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
  if (!game) return null;

  const rates = dayRates(game.player, game.calendar.day);
  const reading = rates.study > 0 ? readingLine(game.player) : null;
  const drilled = Object.keys(rates.practiceEach).map((id) => technique(id).name);
  const today = [
    ...HOUR_KIND_IDS.filter((k) => rates.count[k] > 0).map(
      (k) => `${rates.count[k]} ${HOUR_KINDS[k].name.toLowerCase()}`,
    ),
    ...(drilled.length > 0 ? [`practicing ${drilled.join(' and ')}`] : []),
    ...(reading ? [reading] : []),
  ].join(' · ');

  const recent = game.chronicle.slice(-3).reverse();
  const r = realm(realmOf(game.player));

  // The scene (A2; docs/mockups/shell-study.html): the seat fills the screen, the figure in its
  // middle, and over it the cultivator low on the left, what waits on you on the right and the
  // last few lines of the chronicle at its foot. A3 paints the place behind the seat.
  return (
    <div className="cultivate">
      <section className={`cultivate-seat${breaking}`} aria-label="The seat">
        <div className="seat-flash" aria-hidden="true" />
        <SeatedFigure game={game} />
        <SeatMeter game={game} />
        <BreakthroughRow game={game} />
      </section>

      <section className="cultivate-who" aria-label="The cultivator">
        <h1 className="cultivate-title">
          Cultivate <span className="hanzi">修炼</span>
        </h1>
        <p className="cultivate-name">
          {game.player.name} <small>{game.player.pronouns}</small>
        </p>
        <p className="cultivate-realm">{formatLadder(game.player.qi)}</p>
        <div className="bars cultivate-bars">
          <LadderBar game={game} which="qi" why={<QiWhy game={game} />} />
          {ladderOpen(game.player, 'body') && (
            <LadderBar game={game} which="body" why={<StepNeeds game={game} which="body" />} />
          )}
          {ladderOpen(game.player, 'soul') && (
            <LadderBar game={game} which="soul" why={<StepNeeds game={game} which="soul" />} />
          )}
          <AgeBar game={game} />
        </div>
        <div className="cultivate-routine">
          <div className="cultivate-routine-head">
            <h2>Today&apos;s routine</h2>
            <small>{rates.routine ? rates.routine.name : 'Your own day'}</small>
            <span className="caption">
              Lifespan {r.lifespan} years at {r.name}.
            </span>
            <button type="button" className="link-button" onClick={() => goToTab('day')}>
              Arrange your day →
            </button>
          </div>
          <WheelStrip hours={effectiveWheel(game.player)} />
          <p className="cultivate-today">{today}</p>
        </div>
      </section>

      <div className="cultivate-side">
        <BreakthroughPanel game={game} />
        {away && <AwayCard away={away} />}
        <LifeEdgeCard />
        <CardFeed />
        <section className="cultivate-recent" aria-label="Recent events">
          <h2>
            Recent events{' '}
            <button type="button" className="link-button" onClick={() => go('chronicle')}>
              Read all →
            </button>
          </h2>
          {recent.length === 0 ? (
            <p className="caption">Nothing has happened yet.</p>
          ) : (
            <ol className="chronicle">
              {recent.map((e, i) => (
                <li key={`${e.day}-${i}`}>
                  <EventLine game={game} e={e} />
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
