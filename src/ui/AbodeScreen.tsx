import { ageYears, atLifespanEdge, lifespanYears } from '../core/state.ts';
import { formatAge, formatDays, formatDuration, formatLadder } from './format.ts';
import { useGame } from './store.ts';

export function AbodeScreen() {
  const game = useGame((s) => s.game);
  const away = useGame((s) => s.away);
  const dismissAway = useGame((s) => s.dismissAway);
  if (!game) return null;

  const age = ageYears(game);
  const lifespan = lifespanYears(game);

  return (
    <>
      {away && (
        <section className="panel card-away">
          <h2 className="panel-heading">While you were in seclusion</h2>
          <p>
            {formatDuration(away.countedMs)} away
            {away.awayMs > away.countedMs &&
              ` (of ${formatDuration(away.awayMs)}; offline time counts up to 12 hours)`}
            : {formatDays(away.days)} passed.
          </p>
          {away.atEdge && <p className="warn">You woke at the edge of your lifespan.</p>}
          <button type="button" className="button" onClick={dismissAway}>
            Continue
          </button>
        </section>
      )}

      <section className="panel">
        <h2 className="realm-title">{game.character.name}</h2>
        <dl className="stats">
          <dt>Qi</dt>
          <dd>{formatLadder(game.qi)}</dd>
          <dt>Body</dt>
          <dd>{formatLadder(game.body)}</dd>
          <dt>Soul</dt>
          <dd>{formatLadder(game.soul)}</dd>
          <dt>Insight</dt>
          <dd>{Math.floor(game.insight.current)}</dd>
          <dt>Spirit stones</dt>
          <dd>{Math.floor(game.stones)}</dd>
        </dl>
      </section>

      <section className="panel">
        <div className="bar-label">
          <span>Age</span>
          <span>
            {formatAge(age)} of {lifespan}
          </span>
        </div>
        <div
          className="bar"
          role="progressbar"
          aria-label="Age against lifespan"
          aria-valuemin={0}
          aria-valuemax={lifespan}
          aria-valuenow={Math.floor(age)}
        >
          <div
            className="bar-fill bar-age"
            style={{ width: `${Math.min(100, (age / lifespan) * 100)}%` }}
          />
        </div>
        {atLifespanEdge(game) && (
          <p className="warn">Your lifespan is spent. Time stands still until you break through.</p>
        )}
      </section>
    </>
  );
}
