// Pieces the screens share: the ladder bars, the lifespan-edge card, and the "?" that shows how a
// number was worked out.
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { stageName } from '../content/realms.ts';
import { barFill, barSize, lastChance, type LadderId } from '../core/cultivation.ts';
import { eventText } from '../core/chronicle.ts';
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
    const last = game.chronicle.findLast((e) => e.type === 'death');
    return (
      <section className="panel card-edge" aria-labelledby="ended-heading">
        <h2 id="ended-heading" className="panel-heading">
          This life is over
        </h2>
        <p>{last && eventText(game, last)}</p>
        <p className="muted">
          The chronicle stays with this slot. Nothing else carries over until rebirth is found.
        </p>
        <div className="actions">
          <button type="button" className="button" onClick={beginNextLife}>
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

/**
 * A small "?" that shows how a number was worked out, so the sums stay out of the way: on hover,
 * on keyboard focus, or on a tap, which a tap anywhere else or Escape closes. It opens toward
 * whichever side of the screen has room.
 */
export function Why({
  label = 'How this is worked out',
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<'left' | 'right'>('left');
  /** How wide the tip may grow on its side before it would leave the screen. */
  const [room, setRoom] = useState(290);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const wrap = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (
        e instanceof KeyboardEvent ? e.key === 'Escape' : !wrap.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  const place = () => {
    const r = button.current?.getBoundingClientRect();
    if (!r) return;
    const right = r.left > window.innerWidth / 2;
    setSide(right ? 'right' : 'left');
    setRoom(Math.floor(right ? r.right - 2 : window.innerWidth - r.left - 2));
  };
  return (
    <span ref={wrap} className={`why${open ? ' is-open' : ''}`} onMouseEnter={place}>
      <button
        ref={button}
        type="button"
        className="why-button"
        aria-label={label}
        aria-describedby={id}
        aria-expanded={open}
        onFocus={place}
        onBlur={() => setOpen(false)}
        onClick={() => {
          place();
          setOpen((o) => !o);
        }}
      >
        ?
      </button>
      <span
        role="tooltip"
        id={id}
        className={`why-tip why-${side}`}
        style={{ '--tip-room': `${room}px` } as CSSProperties}
      >
        {children}
      </span>
    </span>
  );
}
