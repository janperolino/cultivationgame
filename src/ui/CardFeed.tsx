// The cards in Cultivate's band (design § Story cards and events; A3,
// docs/mockups/cultivate-bottom-study.html): the oldest card waits in the band's middle as a stub,
// with how many wait behind it and Open, and is read in the square (F1, ui/Square.tsx), so nothing
// pulls you off the orbs. Something that comes first, the coming-back story, takes the stub's
// place until it is cleared. Cultivate never scrolls (Jan's call in A3).
import type { ReactNode } from 'react';
import { viewCard } from '../core/cards.ts';
import { formatNumber } from './format.ts';
import { openSquare, useSquare } from './square.ts';
import { useGame } from './store.ts';

/** A card or an encounter where it waits: its kicker, its title and Open (F1). */
export function Stub({
  kicker,
  count,
  title,
  onOpen,
  guide,
}: {
  kicker: string;
  count?: string;
  title: string;
  onOpen: () => void;
  guide?: string;
}) {
  return (
    <article className="stub is-arriving" data-guide={guide}>
      <div className="stub-text">
        <p className="band-kicker">
          <span>{kicker}</span>
          {count && <span className="accent">{count}</span>}
        </p>
        <h3>{title}</h3>
      </div>
      <button type="button" className="button" onClick={onOpen}>
        Open
      </button>
    </article>
  );
}

/** The band's middle: the waiting card's stub, `first` while it shows, or `quiet` while nothing waits. */
export function CardFeed({ first, quiet }: { first?: ReactNode; quiet?: ReactNode }) {
  const game = useGame((s) => s.game);
  const outcome = useGame((s) => s.cardOutcome);
  const reading = useSquare((s) => s.open?.kind === 'card');
  const pending = !game || game.ended ? [] : game.cards.pending;
  const top = pending[0] && game ? viewCard(game, pending[0]) : null;
  const waiting = pending.length > 0 || !!outcome;

  const open = first ? (
    first
  ) : !game || game.ended ? null : !waiting ? (
    (quiet ?? <p className="tray-quiet">Seclusion is quiet.</p>)
  ) : (
    <Stub
      key={top?.uid ?? 'outcome'}
      kicker={reading ? 'Reading' : 'Waiting'}
      count={pending.length > 0 ? `1 of ${formatNumber(pending.length)}` : undefined}
      title={outcome?.title ?? top?.title ?? ''}
      onOpen={() => openSquare({ kind: 'card' })}
      // The first card's guide rings the stub, then the square once it is open.
      {...(reading ? {} : { guide: 'card' })}
    />
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
