// The toasts in the corner (ui/toasts.ts): bottom right on desktop, under the top bar on a phone,
// each gone after about six seconds unless hovered or focused, read out politely. A hint stays
// until its action is done or it is dismissed, and its link leaves it showing.
import { useEffect, useState, type CSSProperties } from 'react';
import { go } from './nav.ts';
import { useGame } from './store.ts';
import { dismissToast, TOAST_MS, useToasts, type Toast } from './toasts.ts';

function ToastCard({ t }: { t: Toast }) {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (held || t.hint) return;
    const timer = setTimeout(() => dismissToast(t.key), TOAST_MS);
    return () => clearTimeout(timer);
  }, [held, t.key, t.hint]);
  const dismiss = () => {
    dismissToast(t.key);
    if (t.hint) useGame.getState().hintDone(t.hint);
  };
  const style = t.rarity
    ? ({ '--rarity-color': `var(--rarity-${t.rarity})` } as CSSProperties)
    : undefined;
  const to = t.to;
  return (
    <li
      className={`toast${t.hint ? ' is-hint' : ''}`}
      style={style}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false);
      }}
    >
      <span className="toast-glyph hanzi" aria-hidden="true">
        {t.glyph}
      </span>
      <span className="toast-text">
        <span className="toast-label">{t.label} · </span>
        {t.hint ? (
          <>
            <span className="toast-name">{t.name}</span>
            {to && (
              <>
                {' '}
                <button
                  type="button"
                  className="link-button toast-go"
                  onClick={() => go(to.screen, to.trees, to.select, to.tab)}
                >
                  Show me
                </button>
              </>
            )}
          </>
        ) : to ? (
          <button
            type="button"
            className={`link-button toast-name${t.rarity ? ` rarity-${t.rarity}` : ''}`}
            onClick={() => {
              go(to.screen, to.trees, to.select, to.tab);
              dismissToast(t.key);
            }}
          >
            {t.name}
          </button>
        ) : (
          <span className={`toast-name${t.rarity ? ` rarity-${t.rarity}` : ''}`}>{t.name}</span>
        )}
        {t.more > 0 && <span className="toast-more caption"> +{t.more} more</span>}
      </span>
      <button
        type="button"
        className="icon-button toast-close"
        aria-label={t.hint ? 'Dismiss the hint' : 'Dismiss'}
        onClick={dismiss}
      >
        ×
      </button>
    </li>
  );
}

export function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <ol className="toasts" aria-live="polite" aria-label="What's new">
      {toasts.map((t) => (
        <ToastCard key={t.key} t={t} />
      ))}
    </ol>
  );
}
