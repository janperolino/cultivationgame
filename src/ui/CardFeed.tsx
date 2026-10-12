// The card tray under the figure (design § Story cards and events; docs/mockups/obsidian-study.html):
// waiting cards as a stack, the top one open and the rest fanned behind it with their titles
// showing, so any of them can be lifted to the top. A new card rises onto the stack, and its rim
// walks faster while it waits; what a choice led to stays until you send it on, when it slides
// off the stack into the chronicle, or, on a card with further steps, turns to the next step.
// Under reduced motion nothing moves.
import { useState } from 'react';
import { statInfo } from '../content/stats.ts';
import { viewCard, type CardView } from '../core/cards.ts';
import { reducedMotion } from './settings.ts';
import { useGame } from './store.ts';

/** How many cards show behind the top one; the rest are counted. */
const FANNED = 3;

function Choices({ open, onChose }: { open: CardView; onChose: (error: string | null) => void }) {
  const { chooseCard } = useGame.getState();
  return (
    <div className="choices">
      {open.choices.map((c) => (
        <button
          key={c.index}
          type="button"
          className="button choice"
          disabled={!c.check.ok}
          onClick={() => onChose(chooseCard(open.uid, c.index, open.title))}
        >
          <strong>{c.label}</strong>
          {c.choice.cost?.stones ? (
            <span className="caption">{c.choice.cost.stones} spirit stones</span>
          ) : null}
          {c.choice.check && (
            <span className="caption">
              {statInfo(c.choice.check.attribute).name} check, {c.choice.check.dc} or more on a d20
            </span>
          )}
          {!c.check.ok && <span className="caption warn">{c.check.reason}</span>}
        </button>
      ))}
    </div>
  );
}

export function CardFeed() {
  const game = useGame((s) => s.game);
  const outcome = useGame((s) => s.cardOutcome);
  const { dismissCardOutcome } = useGame.getState();
  const [topUid, setTopUid] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  if (!game || game.ended) return null;
  const pending = game.cards.pending.map((p) => viewCard(game, p));
  // The top card: the one lifted, the one a step goes on with, or the oldest.
  const top = pending.find((v) => v.uid === (outcome?.goesOn ? outcome.uid : topUid)) ?? pending[0];
  const behind = pending.filter((v) => v.uid !== top?.uid);
  const fanned = behind.slice(0, FANNED);
  const waiting = pending.length > 0;

  const sendOn = () => {
    // A card with a next step turns in place; a finished one slides off the stack.
    if (outcome?.goesOn || reducedMotion()) {
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

      {!outcome && !top ? (
        <p className="tray-quiet">Seclusion is quiet.</p>
      ) : (
        <div className="stack">
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
                  {outcome.pass ? 'Passed' : 'Failed'}: rolled {outcome.roll.d20},{' '}
                  {outcome.roll.total} against {outcome.roll.dc}.
                </p>
              )}
              <div className="actions">
                <button
                  type="button"
                  className={`button ${outcome.goesOn ? '' : 'button-quiet'}`}
                  onClick={sendOn}
                >
                  {outcome.goesOn ? 'Go on' : 'Into the chronicle'}
                </button>
              </div>
            </article>
          ) : top ? (
            // Keyed by card and step, so each new card or step mounts fresh and rises in.
            <article
              key={`${top.uid}-${top.stepNumber}`}
              className={`story is-arriving ${top.stepNumber > 1 ? 'is-step' : ''}`}
              aria-labelledby={`card-${top.uid}`}
            >
              <h3 id={`card-${top.uid}`}>{top.title}</h3>
              <p>{top.text}</p>
              <Choices
                open={top}
                onChose={(e) => {
                  setError(e);
                  setTopUid(null);
                }}
              />
              {error && <p className="warn spaced">{error}</p>}
            </article>
          ) : null}

          {!outcome &&
            fanned.map((v, i) => (
              <button
                key={v.uid}
                type="button"
                className="stack-sheet"
                style={{ ['--depth' as string]: i + 1 }}
                onClick={() => {
                  setError(null);
                  setTopUid(v.uid);
                }}
                aria-label={`Lift ${v.title} to the top`}
              >
                <span>{v.title}</span>
              </button>
            ))}
        </div>
      )}
      {!outcome && behind.length > FANNED && (
        <p className="caption spaced">and {behind.length - FANNED} more beneath.</p>
      )}
    </section>
  );
}
