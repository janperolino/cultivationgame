// The card tray under the figure (design § Story cards and events; docs/mockups/obsidian-study.html):
// waiting cards as a stack, the top one open and the rest fanned behind it with their titles
// showing, so any of them can be lifted to the top. A new card rises onto the stack, and its rim
// walks faster while it waits; what a choice led to stays until you send it on, when it slides
// off the stack into the chronicle, or, on a card with further steps, turns to the next step.
// Under reduced motion nothing moves. The tray sits at the foot of the Abode, so a choice must not
// shrink it: the stack keeps its height while the outcome shows, and the next card is brought into
// view once you send the outcome on.
import { useLayoutEffect, useRef, useState } from 'react';
import { statInfo } from '../content/stats.ts';
import { viewCard, type CardView } from '../core/cards.ts';
import type { GameState } from '../core/state.ts';
import { reducedMotion } from './settings.ts';
import { useGame, type CardOutcomeView } from './store.ts';

/** A check's verdict after the choice: your attribute against the card's number, no roll. */
const VERDICT_WORDS = { clear: 'Clear', close: 'Close', short: 'Short' } as const;

/** How many cards show behind the top one; the rest are counted. */
const FANNED = 3;

/** What the tray shows, as a key: an outcome, a card at its step, or nothing. */
function showing(game: GameState, outcome: CardOutcomeView | null, topUid: number | null) {
  if (outcome) return `outcome-${outcome.uid}`;
  const pending = game.cards.pending;
  const top = pending.find((p) => p.uid === topUid) ?? pending[0];
  return top ? `card-${top.uid}-${top.path?.length ?? 0}` : 'quiet';
}

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
          {c.choice.check && c.comparison && (
            <span className="caption">
              {statInfo(c.choice.check.attribute).name} {c.comparison.yours} against{' '}
              {c.comparison.against} · {c.comparison.verdict}
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
  const stack = useRef<HTMLDivElement>(null);
  // The stack's height when a choice was made, kept as its least height while the outcome shows.
  const [hold, setHold] = useState<number | null>(null);
  // Set when the outcome is sent on, so the card that follows is scrolled into view.
  const follow = useRef(false);
  const shown = !game || game.ended ? 'none' : showing(game, outcome, topUid);
  useLayoutEffect(() => {
    if (!follow.current || shown.startsWith('outcome')) return;
    follow.current = false;
    stack.current?.scrollIntoView({
      block: 'nearest',
      behavior: reducedMotion() ? 'auto' : 'smooth',
    });
  }, [shown]);
  if (!game || game.ended) return null;
  const pending = game.cards.pending.map((p) => viewCard(game, p));
  // The top card: the one lifted, the one a step goes on with, or the oldest.
  const top = pending.find((v) => v.uid === (outcome?.goesOn ? outcome.uid : topUid)) ?? pending[0];
  const behind = pending.filter((v) => v.uid !== top?.uid);
  const fanned = behind.slice(0, FANNED);
  const waiting = pending.length > 0;

  const sendOn = () => {
    follow.current = true;
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
        <div
          className="stack"
          ref={stack}
          style={outcome && hold ? { minHeight: hold } : undefined}
        >
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
              {outcome.check && (
                <p className="caption spaced">
                  {VERDICT_WORDS[outcome.check.verdict]}: {outcome.check.yours} against{' '}
                  {outcome.check.against}.
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
                  setHold(stack.current?.offsetHeight ?? null);
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
