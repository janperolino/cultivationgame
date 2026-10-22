// An item's hover card in the Bag and at a shop's counter (Jan's playtest after S1): which thing
// the pointer rests on, and where, for ui/ItemTip.tsx to draw. The session's, never saved.
import { create } from 'zustand';

interface TipStore {
  /** The thing hovered, an item or a copy, and the box it shows beside, in stage pixels. */
  tip: { thing: string; x: number; y: number; w: number; sw: number } | null;
}

export const useItemTip = create<TipStore>()(() => ({ tip: null }));

/** How long the pointer rests before the card shows, so a sweep across the grid stays quiet. */
const REST_MS = 260;
let timer: number | undefined;

/** What a hovered square or row spreads onto itself to show its card. */
export function itemTipProps(thing: string) {
  const show = (el: HTMLElement) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const stage = document.querySelector('.stage');
      if (!stage || !el.isConnected) return;
      const sr = stage.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const k = sr.height / 1080 || 1;
      useItemTip.setState({
        tip: {
          thing,
          x: (r.left - sr.left) / k,
          y: (r.top - sr.top) / k,
          w: r.width / k,
          sw: sr.width / k,
        },
      });
    }, REST_MS);
  };
  const hide = clearItemTip;
  return {
    onMouseEnter: (e: { currentTarget: HTMLElement }) => show(e.currentTarget),
    onMouseLeave: hide,
    onFocus: (e: { currentTarget: HTMLElement }) => show(e.currentTarget),
    onBlur: hide,
  };
}

/** A screen change takes the hovered square with it, and its card. */
export function clearItemTip(): void {
  window.clearTimeout(timer);
  useItemTip.setState({ tip: null });
}
