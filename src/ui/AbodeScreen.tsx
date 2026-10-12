import { HOUR_KIND_IDS, HOUR_KINDS } from '../content/hours.ts';
import { realm } from '../content/realms.ts';
import { comingBackStory, type StorySection } from '../core/comingBack.ts';
import { barSize, dayRates, ladderOpen, majorCheck } from '../core/cultivation.ts';
import { daysPerRealMs } from '../core/loop.ts';
import type { GameState } from '../core/state.ts';
import { CardFeed } from './CardFeed.tsx';
import { effectiveWheel } from '../core/wheel.ts';
import { WheelStrip } from './DayWheel.tsx';
import { formatDays, formatDuration, formatLadder, formatNumber, formatRate } from './format.ts';
import { SeatedFigure, SeatMeter } from './SeatedFigure.tsx';
import { useGame, type AwaySummary } from './store.ts';
import { AgeBar, LadderBar, LifeEdgeCard, Why } from './widgets.tsx';

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
          : 'Nothing fills it today.'}
    </>
  );
}

export function AbodeScreen({ onCultivate }: { onCultivate: () => void }) {
  const game = useGame((s) => s.game);
  const away = useGame((s) => s.away);
  if (!game) return null;

  const rates = dayRates(game.player, game.calendar.day);
  const today = HOUR_KIND_IDS.filter((k) => rates.count[k] > 0)
    .map((k) => `${rates.count[k]} ${HOUR_KINDS[k].name.toLowerCase()}`)
    .join(' · ');
  const ready = majorCheck(game.player, 'qi');

  return (
    <>
      {away && <AwayCard away={away} />}
      <LifeEdgeCard />

      {!game.ended && ready?.ready && (
        <section className="panel card-ready">
          <p>
            Qi presses against the gate of {ready.target.name}. The breakthrough is yours to call.
          </p>
          <div className="actions">
            <button type="button" className="button" onClick={onCultivate}>
              Go to Cultivate
            </button>
          </div>
        </section>
      )}

      <section className="panel abode-hero">
        <div className="abode-seat">
          <SeatedFigure game={game} />
          <SeatMeter game={game} />
        </div>
        <div className="abode-info">
          <h2 className="realm-title">
            {formatLadder(game.player.qi)}
            <small>
              {game.player.name} · {game.player.pronouns}
            </small>
          </h2>
          <div className="bars">
            <LadderBar game={game} which="qi" why={<QiWhy game={game} />} />
            {ladderOpen(game.player, 'body') && <LadderBar game={game} which="body" />}
            {ladderOpen(game.player, 'soul') && <LadderBar game={game} which="soul" />}
            <AgeBar game={game} />
          </div>
          <dl className="stats">
            <div>
              <dt>Insight</dt>
              <dd>
                {formatNumber(game.player.insight.current)}{' '}
                <Why label="Where insight comes from">
                  {formatNumber(game.player.insight.current)} to spend on tree nodes, and{' '}
                  {formatNumber(game.player.insight.earned)} earned in all. Breakthroughs count what
                  you have earned, so spending never delays them. Today&apos;s wheel gives about{' '}
                  {formatRate(rates.insight)} a day.
                </Why>
              </dd>
            </div>
            <div>
              <dt>Spirit stones</dt>
              <dd>
                {formatNumber(game.player.stones)}{' '}
                <Why label="What spirit stones do here">
                  {game.player.plan.burnStones
                    ? `On qi days you burn up to ${rates.stoneCap} stones, each adding ${formatRate(rates.qiPerStone)} qi. Turn burning off on the Cultivate screen.`
                    : 'Burning stones is off: they wait in your pouch. Turn it on from the Cultivate screen.'}
                </Why>
              </dd>
            </div>
            <div>
              <dt>Today</dt>
              <dd>
                <WheelStrip hours={effectiveWheel(game.player)} /> {today}
                {rates.routine && ` · ${rates.routine.name}`}
              </dd>
            </div>
          </dl>
          <p className="caption spaced">
            Lifespan {realm(game.player.qi.realm).lifespan} years at{' '}
            {realm(game.player.qi.realm).name}.
          </p>
        </div>
      </section>
      <CardFeed />
    </>
  );
}
