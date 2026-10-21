// The cards in Cultivate's band (design § Story cards and events; A3,
// docs/mockups/cultivate-bottom-study.html): the oldest card open in the band's middle, with how
// many wait behind it; the rest come up one at a time (Jan's call: no tray). A new card rises in;
// what a choice led to stays until you send it on, when it slides out into the chronicle, or, on a
// card with further steps, turns to the next step. Something that comes first, the coming-back
// story, takes the open card's place until it is cleared. Under reduced motion nothing moves. A
// choice must not shrink the card: it keeps its height while the outcome shows. Cultivate never
// scrolls (Jan's call in A3), so nothing here scrolls into view.
import { endGuide } from './guide.ts';
import { useRef, useState, type ReactNode } from 'react';
import { statInfo } from '../content/stats.ts';
import { viewCard, type CardView } from '../core/cards.ts';
import { reducedMotion } from './settings.ts';
import { formatNumber } from './format.ts';
import { useGame } from './store.ts';

/** A check's verdict after the choice: your attribute against the card's number, no roll. */
const VERDICT_WORDS = { clear: 'Clear', close: 'Close', short: 'Short' } as const;

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
          onClick={() => {
            endGuide('first-card');
            onChose(chooseCard(open.uid, c.index, open.title));
          }}
          onContextMenu={(e) => {
            // A sure fight plays on the stage anyway on a right-click (Fights you play).
            if (!c.fight?.sure || !c.check.ok) return;
            e.preventDefault();
            endGuide('first-card');
            onChose(chooseCard(open.uid, c.index, open.title, true));
          }}
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
          {c.fight && (
            <span className="caption">
              Fight · {c.fight.words} ·{' '}
              {c.fight.sure ? 'sure: right-click to play it' : 'you play it'}
            </span>
          )}
          {!c.check.ok && <span className="caption warn">{c.check.reason}</span>}
        </button>
      ))}
    </div>
  );
}

/** The band's middle: the open card, `first` while it shows, or `quiet` while nothing waits. */
export function CardFeed({ first, quiet }: { first?: ReactNode; quiet?: ReactNode }) {
  const game = useGame((s) => s.game);
  const outcome = useGame((s) => s.cardOutcome);
  const { dismissCardOutcome } = useGame.getState();
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const stack = useRef<HTMLDivElement>(null);
  // The stack's height when a choice was made, kept as its least height while the outcome shows.
  const [hold, setHold] = useState<number | null>(null);
  const pending = !game || game.ended ? [] : game.cards.pending.map((p) => viewCard(game, p));
  // The top card: the one a step goes on with, or the oldest.
  const top = (outcome?.goesOn && pending.find((v) => v.uid === outcome.uid)) || pending[0];
  const waiting = pending.length > 0;

  const sendOn = () => {
    // A card with a next step turns in place; a finished one slides off the stack.
    if (outcome?.goesOn || reducedMotion()) {
      dismissCardOutcome();
      return;
    }
    setLeaving(true);
  };

  const open = first ? (
    first
  ) : !game || game.ended ? null : !outcome && !top ? (
    (quiet ?? <p className="tray-quiet">Seclusion is quiet.</p>)
  ) : (
    <div className="stack" ref={stack} style={outcome && hold ? { minHeight: hold } : undefined}>
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
          data-guide="card"
          aria-labelledby={`card-${top.uid}`}
        >
          <p className="band-kicker">
            <span>Waiting</span>
            <span className="accent">1 of {formatNumber(pending.length)}</span>
          </p>
          <h3 id={`card-${top.uid}`}>{top.title}</h3>
          <p>{top.text}</p>
          <Choices
            open={top}
            onChose={(e) => {
              setHold(stack.current?.offsetHeight ?? null);
              setError(e);
            }}
          />
          {error && <p className="warn spaced">{error}</p>}
        </article>
      ) : null}
    </div>
  );

  return (
    <section
      className={`band-now ${waiting && !first ? 'is-waiting' : ''}`}
      aria-label="What waits on you"
    >
      {open}
    </section>
  );
}
