// Pieces the Abode and Cultivate screens share: the ladder bars and the lifespan-edge card.
import { stageName } from '../content/realms.ts';
import { barFill, barSize, lastChance, type LadderId } from '../core/cultivation.ts';
import { ageYears, atLifespanEdge, lifespanYears, type GameState } from '../core/state.ts';
import { formatAgeShort, formatNumber, formatPercent, LADDER_LABELS } from './format.ts';
import { useGame } from './store.ts';

/** One ladder's bar: the crack light fills it, and the part past full glows brighter. */
export function LadderBar({ game, which }: { game: GameState; which: LadderId }) {
  const l = game.player[which];
  const fill = barFill(l);
  const over = Math.max(0, Math.min(1, (fill - 1) / 0.5));
  const value =
    which === 'qi'
      ? `${formatNumber(l.bar)} / ${formatNumber(barSize(l))}`
      : `${stageName(l.realm, l.stage)} · ${formatPercent(fill)}`;
  return (
    <div className="bar-row">
      <span className="label">{LADDER_LABELS[which]}</span>
      <div
        className="bar"
        role="progressbar"
        aria-label={`${LADDER_LABELS[which]} toward the next breakthrough`}
        aria-valuemin={0}
        aria-valuemax={150}
        aria-valuenow={Math.round(fill * 100)}
        title={fill > 1 ? `${formatPercent(fill)}: past full raises the odds` : undefined}
      >
        <div className="bar-fill" style={{ width: `${Math.min(1, fill) * 100}%` }} />
        {over > 0 && <div className="bar-fill bar-over" style={{ width: `${over * 100}%` }} />}
      </div>
      <span className="value">{value}</span>
    </div>
  );
}

export function AgeBar({ game }: { game: GameState }) {
  const age = ageYears(game.player, game.calendar.day);
  const lifespan = lifespanYears(game.player);
  return (
    <div className="bar-row">
      <span className="label">Age</span>
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
      <span className="value">
        {formatAgeShort(age)} of {lifespan}
      </span>
    </div>
  );
}

/** At the lifespan edge: the last chance, or the end. After a death: a new life. */
export function LifeEdgeCard() {
  const game = useGame((s) => s.game);
  const { lastChance: tryLast, letGo, beginNextLife } = useGame.getState();
  if (!game) return null;

  if (game.ended) {
    return (
      <section className="panel card-edge" aria-labelledby="ended-heading">
        <h2 id="ended-heading" className="panel-heading">
          This life is over
        </h2>
        <p>{game.chronicle.at(-1)?.text}</p>
        <p className="muted">
          The chronicle stays with this slot. Nothing else carries over until rebirth is found.
        </p>
        <div className="actions">
          <button type="button" className="button" onClick={() => void beginNextLife()}>
            Begin a new life
          </button>
        </div>
      </section>
    );
  }

  if (!atLifespanEdge(game)) return null;
  const chance = lastChance(game.player);
  return (
    <section className="panel card-edge" aria-labelledby="edge-heading">
      <h2 id="edge-heading" className="panel-heading">
        The edge of your lifespan
      </h2>
      <p>
        Time stands still at the edge. Only a breakthrough to the next realm buys more years; if it
        fails, the life ends.
      </p>
      {chance.possible ? (
        <p>
          You can try once more, at {formatPercent(chance.odds)}, for a flawed foundation at best.
        </p>
      ) : (
        <p className="warn">{chance.reason} No last chance remains.</p>
      )}
      <div className="actions">
        {chance.possible && (
          <button type="button" className="button" onClick={tryLast}>
            Last breakthrough · {formatPercent(chance.odds)}
          </button>
        )}
        <button type="button" className="button button-danger" onClick={letGo}>
          Let go
        </button>
      </div>
    </section>
  );
}
