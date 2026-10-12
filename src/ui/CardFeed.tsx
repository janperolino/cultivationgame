// The card tray under the figure (design § Story cards and events; docs/mockups/obsidian-study.html):
// a panel holding the waiting cards, one open at a time. A card rises in when it arrives, and its
// rim walks faster while it waits; what a choice led to stays until you send it into the chronicle,
// when it slides out. Resolved cards fall into the Chronicle.
import { useState } from 'react';
import { statInfo } from '../content/stats.ts';
import { viewCard } from '../core/cards.ts';
import { useGame } from './store.ts';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function CardFeed() {
  const game = useGame((s) => s.game);
  const outcome = useGame((s) => s.cardOutcome);
  const { chooseCard, dismissCardOutcome } = useGame.getState();
  const [openUid, setOpenUid] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  if (!game || game.ended) return null;
  const pending = game.cards.pending.map((p) => viewCard(game, p));
  // One open at a time: the one picked, or the oldest.
  const open = pending.find((v) => v.uid === openUid) ?? pending[0];
  const waiting = pending.length > 0;

  const sendAway = () => {
    if (reducedMotion()) {
      dismissCardOutcome();
      return;
    }
    setLeaving(true);
  };

  return (
    <section className={`panel tray ${waiting ? 'is-waiting' : ''}`} aria-label="Cards">
      <div className="tray-head">
        <h2 className="panel-heading">Waiting</h2>
        <span className="caption">
          {waiting ? `${pending.length} ${pending.length === 1 ? 'card' : 'cards'}` : 'nothing'}
        </span>
      </div>

      {outcome ? (
        <article
          className={`story is-result ${leaving ? 'is-leaving' : ''}`}
          aria-live="polite"
          onAnimationEnd={(e) => {
            if (e.animationName !== 'card-leave') return;
            setLeaving(false);
            dismissCardOutcome();
          }}
        >
          <h3>{outcome.title}</h3>
          <p className="result">{outcome.text}</p>
          {outcome.roll && (
            <p className="caption spaced">
              {outcome.pass ? 'Passed' : 'Failed'}: rolled {outcome.roll.d20}, {outcome.roll.total}{' '}
              against {outcome.roll.dc}.
            </p>
          )}
          <div className="actions">
            <button type="button" className="button button-quiet" onClick={sendAway}>
              Into the chronicle
            </button>
          </div>
        </article>
      ) : open ? (
        // Keyed by card, so each new one mounts fresh and rises in.
        <article key={open.uid} className="story is-arriving" aria-labelledby={`card-${open.uid}`}>
          <h3 id={`card-${open.uid}`}>{open.title}</h3>
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
        </article>
      ) : (
        <p className="tray-quiet">Seclusion is quiet.</p>
      )}

      {!outcome && pending.length > 1 && (
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
    </section>
  );
}
