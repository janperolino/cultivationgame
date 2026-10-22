// An item's hover card in the Bag and at a shop's counter (Jan's playtest after S1): its name in its
// rarity's color, its rarity and tier, what it is and what it does, beside the square or row the
// pointer rests on. One card on the stage, drawn still, with no blur (Paint cost).
import type { CSSProperties } from 'react';
import { copyItem, hasCopy } from '../content/copies.ts';
import { item, type Item } from '../content/items.ts';
import { formatEffect } from './format.ts';
import { useItemTip } from './itemTip.ts';
import * as words from './itemWords.ts';

/** The item a shop's or the Bag's thing is: a copy's book or slip, or the item itself. */
function itemOf(thing: string): Item {
  return hasCopy(thing) ? copyItem(thing) : item(thing);
}

const CARD_W = 320;

/** The card itself, once on the stage. */
export function ItemTipLayer() {
  const tip = useItemTip((s) => s.tip);
  if (!tip) return null;
  let it: Item;
  try {
    it = itemOf(tip.thing);
  } catch {
    return null;
  }
  const right = tip.x + tip.w + 12;
  const left = right + CARD_W <= tip.sw - 16 ? right : Math.max(16, tip.x - 12 - CARD_W);
  const style: CSSProperties = {
    left,
    top: Math.max(16, Math.min(tip.y, 1080 - 280)),
    width: CARD_W,
  };
  const uses = words.useLines(it);
  const props = it.properties ?? [];
  return (
    <div className="item-tip" style={style} role="tooltip">
      <p className={`item-tip-name rarity-${it.rarity}`}>
        {it.name} <span className="hanzi">{it.hanzi}</span>
      </p>
      <p className="caption">{words.itemTag(it)}</p>
      {it.text && <p>{it.text}</p>}
      {uses.length > 0 && (
        <ul>
          {uses.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
      {props.length > 0 && (
        <ul>
          {props.map((p) => (
            <li key={p.name}>
              <strong>{p.name}</strong>: {p.effects.map(formatEffect).join(', ')}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
