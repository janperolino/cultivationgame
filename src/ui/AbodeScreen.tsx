import { HOUR_KIND_IDS, HOUR_KINDS } from '../content/hours.ts';
import { realm } from '../content/realms.ts';
import { comingBackStory } from '../core/comingBack.ts';
import { dayRates, ladderOpen, majorCheck } from '../core/cultivation.ts';
import { CardFeed } from './CardFeed.tsx';
import { effectiveWheel } from '../core/wheel.ts';
import { WheelStrip } from './DayWheel.tsx';
import { formatDuration, formatLadder, formatNumber } from './format.ts';
import { SeatedFigure } from './SeatedFigure.tsx';
import { useGame, type AwaySummary } from './store.ts';
import { AgeBar, LadderBar, LifeEdgeCard } from './widgets.tsx';

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
      {story.sections.map((x) => (
        <div key={x.heading} className="away-section">
          <h3>{x.heading}</h3>
          <p>{x.lines.join(' ')}</p>
        </div>
      ))}
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
        <SeatedFigure game={game} />
        <div className="abode-info">
          <h2 className="realm-title">
            {formatLadder(game.player.qi)}
            <small>
              {game.player.name} · {game.player.pronouns}
            </small>
          </h2>
          <div className="bars">
            <LadderBar game={game} which="qi" />
            {ladderOpen(game.player, 'body') && <LadderBar game={game} which="body" />}
            {ladderOpen(game.player, 'soul') && <LadderBar game={game} which="soul" />}
            <AgeBar game={game} />
          </div>
          <dl className="stats">
            <div>
              <dt>Insight</dt>
              <dd>{formatNumber(game.player.insight.current)}</dd>
            </div>
            <div>
              <dt>Spirit stones</dt>
              <dd>{formatNumber(game.player.stones)}</dd>
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
