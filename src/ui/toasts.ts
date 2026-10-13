// Toasts (design § UI and screens, Only what you have touched shows): each gift the game hands
// over names itself in the corner with a link to where it lives. The store raises them from what
// a moment gained (core/seen.ts, `gains`), never from time away, which the coming-back card tells.
// At most three show at once: a burst of more folds into the third ("+4 more"), and a later
// moment's wait their turn.
import { create } from 'zustand';
import { copyManual, hasCopy } from '../content/copies.ts';
import { itemGlyph, item, hasItem } from '../content/items.ts';
import { hasManual, manual, MANUAL_KINDS } from '../content/manuals.ts';
import { hasMethod, method } from '../content/methods.ts';
import type { RarityId } from '../content/rarity.ts';
import { hasTechnique, technique } from '../content/techniques.ts';
import { tree } from '../content/trees/index.ts';
import type { Gain } from '../core/seen.ts';
import type { GameState } from '../core/state.ts';
import type { TreesTarget } from './nav.ts';
import { screens, type ScreenId } from './screens.ts';

/** At most this many toasts at once. */
export const TOASTS_MAX = 3;
/** How long a toast stays, unless hovered or focused. */
export const TOAST_MS = 6000;

/** Where a toast's link goes: a screen, the Trees screen's target, a thing to select there. */
export interface ToastLink {
  screen: ScreenId;
  trees?: TreesTarget;
  select?: string;
}

export interface Toast {
  key: number;
  glyph: string;
  /** "New technique", "New tree". */
  label: string;
  name: string;
  rarity?: RarityId;
  /** Gains folded into this one, past the three shown. */
  more: number;
  to: ToastLink | null;
}

type ToastView = Omit<Toast, 'key' | 'more'>;

/** A Dao's tree reads "the Fist Dao"; the big three "the Soul tree". */
function treeName(id: string): string {
  const t = tree(id);
  return t.dao ? `${t.name} Dao` : `${t.name} tree`;
}

/** One gain as a toast, or null when another toast already says it or nothing can show it. */
function toastFor(g: Gain, s: GameState): ToastView | null {
  const open = (screen: ScreenId) => screen === 'settings' || s.unlocks.includes(screen);
  const link = (to: ToastLink) => (open(to.screen) ? to : null);
  switch (g.kind) {
    case 'technique': {
      if (!hasTechnique(g.id)) return null;
      const t = technique(g.id);
      return {
        glyph: '招',
        label: 'New technique',
        name: t.name,
        rarity: t.rarity,
        to: link({ screen: 'techniques', select: g.id }),
      };
    }
    case 'method': {
      if (!hasMethod(g.id)) return null;
      const m = method(g.id);
      return {
        glyph: '法',
        label: 'New method',
        name: m.name,
        rarity: m.rarity,
        to: link({ screen: 'cultivate' }),
      };
    }
    case 'manual': {
      // A method's own manual and a technique's Art come with it, and its toast says so.
      if (!hasManual(g.id)) return null;
      const m = manual(g.id);
      if (m.method || m.technique) return null;
      return {
        glyph: MANUAL_KINDS[m.kind].glyph,
        label: `New ${MANUAL_KINDS[m.kind].name.toLowerCase()}`,
        name: m.name,
        rarity: m.rarity,
        to: link({ screen: 'trees', trees: { pick: m.host ?? 'manuals', focus: m.id } }),
      };
    }
    case 'copy': {
      // A copy stands on the bookcase, read or not; the link lands on its spine.
      if (!hasCopy(g.id)) return null;
      const m = copyManual(g.id);
      return {
        glyph: '书',
        label: g.fresh ? 'New copy' : 'Copy',
        name: g.count > 1 ? `${m.name} ×${g.count}` : m.name,
        rarity: m.rarity,
        to: link({ screen: 'trees', trees: { pick: 'manuals', focus: m.id } }),
      };
    }
    case 'item': {
      if (!hasItem(g.id)) return null;
      const it = item(g.id);
      return {
        glyph: itemGlyph(it),
        label: g.fresh ? 'New item' : 'Item',
        name: g.count > 1 ? `${it.name} ×${g.count}` : it.name,
        rarity: it.rarity,
        to: link({ screen: 'bag', select: g.id }),
      };
    }
    case 'tree': {
      // A tree is news only once the Trees screen is there to show it.
      if (!s.unlocks.includes('trees')) return null;
      return {
        glyph: tree(g.id).hanzi,
        label: 'New tree',
        name: treeName(g.id),
        to: link({ screen: 'trees', trees: { pick: g.id } }),
      };
    }
    case 'screen': {
      const screen = screens.find((x) => x.id === g.id);
      if (!screen) return null;
      return {
        glyph: screen.hanzi.charAt(0),
        label: 'New screen',
        name: screen.name,
        to: link({ screen: screen.id }),
      };
    }
  }
}

/** The toasts one moment's gains raise: three at most, the third carrying how many more. */
export function toastsFor(gained: readonly Gain[], s: GameState): Omit<Toast, 'key'>[] {
  const all = gained.map((g) => toastFor(g, s)).filter((t): t is ToastView => t !== null);
  return all.slice(0, TOASTS_MAX).map((t, i) => ({
    ...t,
    more: i === TOASTS_MAX - 1 ? all.length - TOASTS_MAX : 0,
  }));
}

interface ToastStore {
  /** The toasts showing, three at most, oldest first. */
  toasts: Toast[];
  /** Toasts from later moments waiting for a place, so none is lost to the next burst. */
  waiting: Toast[];
}

export const useToasts = create<ToastStore>()(() => ({ toasts: [], waiting: [] }));

let nextKey = 1;

/** Fills the free places from the waiting line. */
function settle(st: ToastStore): ToastStore {
  const room = Math.max(0, TOASTS_MAX - st.toasts.length);
  return { toasts: [...st.toasts, ...st.waiting.slice(0, room)], waiting: st.waiting.slice(room) };
}

/** Shows the toasts a moment raised, or lines them up behind the three already showing. */
export function raiseToasts(gained: readonly Gain[], s: GameState): void {
  const fresh = toastsFor(gained, s).map((t) => ({ ...t, key: nextKey++ }));
  if (fresh.length === 0) return;
  useToasts.setState((st) => settle({ toasts: st.toasts, waiting: [...st.waiting, ...fresh] }));
}

export function dismissToast(key: number): void {
  useToasts.setState((st) =>
    settle({
      toasts: st.toasts.filter((t) => t.key !== key),
      waiting: st.waiting.filter((t) => t.key !== key),
    }),
  );
}

/** Clears every toast: another life or slot opened. */
export function clearToasts(): void {
  useToasts.setState({ toasts: [], waiting: [] });
}
