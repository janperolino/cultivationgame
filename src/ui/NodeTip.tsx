// The card beside a node or a manual's jewel on a fan (design § UI and screens, The trees are
// opening fans): what it is, what it gives, where it stands, and for a node the Learn button, so
// learning happens where you are looking. Its words are in fanWords.ts; where it sits is
// `placeTip` in treeLayout.ts.
import type { CSSProperties } from 'react';
import type { AnyNode } from '../content/nodes.ts';
import type { Cultivator } from '../core/state.ts';
import type { TipWords } from './fanWords.ts';
import { LearnAction } from './ManualNodes.tsx';

export function NodeTip({
  c,
  words,
  node,
  style,
  pinned,
  onClose,
  handlers,
}: {
  c: Cultivator;
  words: TipWords;
  /** A node's card carries Learn; a jewel's doesn't. */
  node?: AnyNode;
  style: CSSProperties;
  pinned: boolean;
  onClose: () => void;
  handlers: {
    onPointerEnter: () => void;
    onPointerLeave: () => void;
    onFocus: () => void;
    onBlur: () => void;
  };
}) {
  return (
    <div
      className={`fan-tip${pinned ? ' is-pinned' : ''}`}
      role={pinned ? 'dialog' : 'tooltip'}
      aria-label={words.title}
      style={style}
      {...handlers}
    >
      <span className="fan-tip-head">
        <span className={`fan-tip-title${words.rarity ? ` rarity-${words.rarity}` : ''}`}>
          {words.title} <span className="hanzi muted">{words.hanzi}</span>
        </span>
        {pinned && (
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        )}
      </span>
      <span className="fan-tip-sub">{words.sub}</span>
      {words.effects && <span className="fan-tip-effects">{words.effects}</span>}
      <span className={`fan-tip-status is-${words.tone}`}>{words.status}</span>
      {words.text && <span className="fan-tip-text">{words.text}</span>}
      {node && (
        <span className="fan-tip-actions">
          <LearnAction c={c} n={node} />
        </span>
      )}
    </div>
  );
}
