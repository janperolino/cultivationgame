// Pieces the screens share: the ladder bars, the lifespan-edge card, and the "?" that shows how a
// number was worked out.
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { stageName } from '../content/realms.ts';
import { barFill, barSize, lastChance, type LadderId } from '../core/cultivation.ts';
import { eventText, settledItself } from '../core/chronicle.ts';
import { atLifespanEdge, type ChronicleEvent, type GameState } from '../core/state.ts';
import { formatNumber, formatPercent, LADDER_LABELS } from './format.ts';
import { openPanel } from './scene.ts';
import { rectIn, toggleFullscreen, useStage } from './stage.ts';
import { useGame } from './store.ts';
import { useCloseOutside } from './useCloseOutside.ts';

/** Fullscreen on and off (Settings and the foot of the menu); F11 works as well. */
export function FullscreenButton({ className = '' }: { className?: string }) {
  const [full, setFull] = useState(() => !!document.fullscreenElement);
  useEffect(() => {
    const sync = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  return (
    <button type="button" className={`button ${className}`} onClick={toggleFullscreen}>
      {full ? 'Leave fullscreen' : 'Fullscreen'}
    </button>
  );
}

/** One ladder's bar: the crack light fills it, and the part past full glows brighter. */
export function LadderBar({
  game,
  which,
  why,
}: {
  game: GameState;
  which: LadderId;
  /** How the bar fills, behind a "?". */
  why?: ReactNode;
}) {
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
      <span className="value">
        {value}
        {why && (
          <>
            {' '}
            <Why label={`How the ${LADDER_LABELS[which].toLowerCase()} bar fills`}>{why}</Why>
          </>
        )}
      </span>
    </div>
  );
}

/** At the lifespan edge: the last chance, or the end. After a death: a new life. */
export function LifeEdgeCard() {
  const game = useGame((s) => s.game);
  const { letGo, beginNextLife } = useGame.getState();
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
          <button type="button" className="button" onClick={() => openPanel('qi', true)}>
            The last breakthrough · {formatPercent(chance.odds)}
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
  // Low on the stage the tip opens upward, so it never runs off its foot (A4).
  const [up, setUp] = useState(false);
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
    if (!button.current) return;
    // The room to the stage's edge, in stage pixels.
    const stage = useStage.getState();
    const r = rectIn(button.current);
    const left = r.left - stage.left / stage.factor;
    const right = left > stage.width / 2;
    setSide(right ? 'right' : 'left');
    setRoom(Math.floor(right ? left + r.width - 2 : stage.width - left - 2));
    setUp(r.top - stage.top / stage.factor > stage.height * 0.6);
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
        className={`why-tip why-${side}${up ? ' is-up' : ''}`}
        style={{ '--tip-room': `${room}px` } as CSSProperties}
      >
        {children}
      </span>
    </span>
  );
}

/** One chronicle line, with a quiet mark when a card settled itself without you. */
export function EventLine({ game, e }: { game: GameState; e: ChronicleEvent }) {
  return (
    <>
      {eventText(game, e)}
      {settledItself(e) && <span className="settled-mark"> · settled without you</span>}
    </>
  );
}

/**
 * A quiet picker in place of a native select (A4, Jan's call: the system's lists can't be dressed):
 * a chip naming the choice, opening an obsidian slip of the options like the tips. An option can be
 * shown but not open to you, greyed, with a line saying why (the Map's Mode of Travel, A5.1).
 */
export function Picker<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { id: T; name: string; disabled?: boolean; note?: string }[];
  onChange: (id: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useCloseOutside<HTMLSpanElement>(open, () => setOpen(false));
  const current = options.find((o) => o.id === value) ?? options[0];
  return (
    <span ref={ref} className={`picker${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="picker-chip"
        aria-label={`${label}: ${current?.name ?? ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {current?.name}
      </button>
      {open && (
        <ul className="picker-menu" role="listbox" aria-label={label}>
          {options.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                role="option"
                aria-selected={o.id === value}
                className={o.id === value ? 'is-on' : undefined}
                disabled={o.disabled}
                title={o.note}
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
              >
                {o.name}
                {o.note && <span className="picker-note">{o.note}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}
