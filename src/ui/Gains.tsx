// The +n (F1, Jan's calls in its talk): every change a card's or an encounter's choice makes to
// stones, insight, the qi bar or the bag, rising by the figure on Cultivate, and held still in a
// row where the outcome is read (the square, a fight's hand-back). Losses show as −n in the
// warning's color. Each rises once and is gone (theme.css, `gain-rise`), so nothing loops.
import type { CSSProperties } from 'react';
import { deltaWords, useFloats, type Delta } from './feel.ts';
import { InsightGlyph, StoneGlyph } from './icons.tsx';

function Glyph({ d }: { d: Delta }) {
  if (d.kind === 'stones') return <StoneGlyph />;
  if (d.kind === 'insight') return <InsightGlyph />;
  return null;
}

/** A choice's changes as a still row: "+20 ◆ · +3 ✦ · +1 Qi Gathering Pill". */
export function GainRow({ gains }: { gains: readonly Delta[] }) {
  if (gains.length === 0) return null;
  return (
    <p className="gain-row" aria-label="What it gave and took">
      {gains.map((d, i) => (
        <span key={i} className={`gain${d.n < 0 ? ' is-loss' : ''}`}>
          {deltaWords(d)}
          <Glyph d={d} />
        </span>
      ))}
    </p>
  );
}

/** Where a +n rises from: stones and insight from their numbers, the rest over the figure. */
const anchorOf = (d: Delta) => (d.kind === 'stones' || d.kind === 'insight' ? d.kind : 'over');

/** The +n rising by the figure, inside the purse row under it; a burst stacks up its anchor. */
export function GainFloats() {
  const floats = useFloats((s) => s.floats);
  const seen: Record<string, number> = {};
  return (
    <div className="gain-floats" aria-live="polite">
      {floats.map((f) => {
        const anchor = anchorOf(f.d);
        const at = (seen[anchor] = (seen[anchor] ?? -1) + 1);
        return (
          <span
            key={f.key}
            className={`gain-float is-${anchor}${f.d.n < 0 ? ' is-loss' : ''}`}
            style={{ '--at': at } as CSSProperties}
          >
            {deltaWords(f.d)}
            <Glyph d={f.d} />
          </span>
        );
      })}
    </div>
  );
}
