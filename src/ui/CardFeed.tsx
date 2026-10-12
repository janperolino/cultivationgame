// The card feed under the figure (design § Story cards and events): the waiting cards, one open at
// a time, each with its choices; what the last choice led to stays until dismissed. Resolved cards
// fall into the Chronicle.
import { useState } from 'react';
import { statInfo } from '../content/stats.ts';
import { viewCard } from '../core/cards.ts';
import { useGame } from './store.ts';

export function CardFeed() {
  const game = useGame((s) => s.game);
  const outcome = useGame((s) => s.cardOutcome);
  const { chooseCard, dismissCardOutcome } = useGame.getState();
  const [openUid, setOpenUid] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!game) return null;
  const pending = game.cards.pending.map((p) => viewCard(game, p));
  if (!pending.length && !outcome) return null;
  // One open at a time: the one picked, or the oldest.
  const open = pending.find((v) => v.uid === openUid) ?? pending[0];

  return (
    <div className="feed">
      {outcome && (
        <section className="panel story-card is-result" aria-live="polite">
          <h2 className="panel-heading">{outcome.title}</h2>
          <p>{outcome.text}</p>
          {outcome.roll && (
            <p className="caption">
              {outcome.pass ? 'Passed' : 'Failed'}: rolled {outcome.roll.d20}, {outcome.roll.total}{' '}
              against {outcome.roll.dc}.
            </p>
          )}
          <div className="actions">
            <button type="button" className="button button-quiet" onClick={dismissCardOutcome}>
              Close
            </button>
          </div>
        </section>
      )}
      {open && !game.ended && (
        <section className="panel story-card" aria-labelledby={`card-${open.uid}`}>
          <h2 id={`card-${open.uid}`} className="panel-heading">
            {open.title}
          </h2>
          <p>{open.text}</p>
          <div className="choices">
            {open.choices.map((c, i) => (
              <button
                key={i}
                type="button"
                className="button choice"
                disabled={!c.check.ok}
                onClick={() => {
                  setError(chooseCard(open.uid, i, open.title));
                  setOpenUid(null);
                }}
              >
                <strong>{c.label}</strong>
                {c.choice.cost?.stones ? (
                  <span className="caption">{c.choice.cost.stones} spirit stones</span>
                ) : null}
                {c.choice.check && (
                  <span className="caption">
                    {statInfo(c.choice.check.attribute).name} check, {c.choice.check.dc} or more on
                    a d20
                  </span>
                )}
                {!c.check.ok && <span className="caption warn">{c.check.reason}</span>}
              </button>
            ))}
          </div>
          {error && <p className="warn spaced">{error}</p>}
        </section>
      )}
      {pending.length > 1 && (
        <div className="feed-tabs" role="group" aria-label="Waiting cards">
          {pending.map((v) => (
            <button
              key={v.uid}
              type="button"
              className="button button-quiet"
              aria-pressed={v.uid === open?.uid}
              onClick={() => setOpenUid(v.uid)}
            >
              {v.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
