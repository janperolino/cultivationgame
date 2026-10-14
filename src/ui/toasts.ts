// Toasts (design § UI and screens, Only what you have touched shows): each gift the game hands
// over names itself in the corner with a link to where it lives. The store raises them from what
// a moment gained (core/seen.ts, `gains`), never from time away, which the coming-back card tells.
// At most three show at once: a burst of more folds into the third ("+4 more"), and a later
// moment's wait their turn. A moment that isn't something held (a technique reaching Origin and
// leaving its slot) raises its own toast by hand (`raiseToast`), and so does a hint (ui/hints.ts),
// which stays until its action is done or it is dismissed.
import { create } from 'zustand';
import { copyManual, hasCopy } from '../content/copies.ts';
import type { HintId } from '../content/firsts.ts';
import { itemGlyph, item, hasItem } from '../content/items.ts';
import { hasManual, manual, MANUAL_KINDS } from '../content/manuals.ts';
import { hasMethod, method } from '../content/methods.ts';
import type { RarityId } from '../content/rarity.ts';
import { hasTechnique, technique } from '../content/techniques.ts';
import { tree } from '../content/trees/index.ts';
import type { Gain } from '../core/seen.ts';
import type { GameState } from '../core/state.ts';
import { mastery, MAX_MASTERY } from '../core/techniques.ts';
import type { CultivateTab, TreesTarget } from './nav.ts';
import { screens, type ScreenId } from './screens.ts';

/** At most this many toasts at once. */
export const TOASTS_MAX = 3;
/** How long a toast stays, unless hovered or focused. */
export const TOAST_MS = 6000;

/** Where a toast's link goes: a screen, the Trees screen's target, Cultivate's tab, a thing to select there. */
export interface ToastLink {
  screen: ScreenId;
  trees?: TreesTarget;
  tab?: CultivateTab;
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
  /** A hint: it stays until its action is done or it is dismissed. */
  hint?: HintId;
}

type ToastView = Omit<Toast, 'key' | 'more' | 'hint'>;

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
        to: link({ screen: 'cultivate', tab: 'practice', select: g.id }),
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
      // The Techniques screen is Cultivate's Practice tab now; its unlock keeps the old id.
      if (g.id === 'techniques') {
        return {
          glyph: '练',
          label: 'New tab',
          name: 'Cultivate › Practice',
          to: link({ screen: 'cultivate', tab: 'practice' }),
        };
      }
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

/** Kinds of toast raised by hand, for a moment that isn't something held. */
export const HAND_TOASTS = {
  /** A technique reached Origin and left its practice slot. */
  slot: { glyph: '练', label: 'Practice' },
  /** Spirit stones handed over: a counter, not a thing held, so no gain toasts them. */
  stones: { glyph: '灵', label: 'Spirit stones' },
  /** A stage of the Intent ladder opened: a thing earned, not held (core/intent.ts). */
  intent: { glyph: '意', label: 'Intent' },
  /** A hint toward a first time's control (ui/hints.ts). */
  hint: { glyph: '指', label: 'Hint' },
} as const;
export type HandToast = keyof typeof HAND_TOASTS;

/**
 * Shows a toast for a moment that isn't a gain: its kind's glyph and label, the text, a link; a
 * hint names its id and stays. A hint goes ahead of the toasts waiting, so it is never kept back.
 */
export function raiseToast(
  kind: HandToast,
  text: string,
  link: ToastLink | null = null,
  hint?: HintId,
): void {
  const t: Toast = {
    key: nextKey++,
    ...HAND_TOASTS[kind],
    name: text,
    more: 0,
    to: link,
    ...(hint ? { hint } : {}),
  };
  useToasts.setState((st) =>
    settle(
      hint
        ? { toasts: st.toasts, waiting: [t, ...st.waiting] }
        : { toasts: st.toasts, waiting: [...st.waiting, t] },
    ),
  );
}

/** The hint showing or waiting its turn, if any. */
export function shownHint(): Toast | null {
  const st = useToasts.getState();
  return [...st.toasts, ...st.waiting].find((t) => t.hint) ?? null;
}

/**
 * What a new life starts with, toasted once after testing day: a created life holds everything
 * seen, so no gain names its method (a copy, until read), technique, items or stones on its own.
 */
export function startingGains(s: GameState): Gain[] {
  const p = s.player;
  const held = (kind: Gain['kind'], ids: string[]) =>
    ids.map((id) => ({ kind, id, count: 1, fresh: true }));
  return [
    ...held('method', Object.keys(p.methods)),
    ...held('technique', Object.keys(p.techniques)),
    ...Object.entries(p.copies)
      .filter(([, n]) => n > 0)
      .map(([id, n]) => ({ kind: 'copy' as const, id, count: n, fresh: true })),
    ...Object.entries(p.items)
      .filter(([, n]) => n > 0)
      .map(([id, n]) => ({ kind: 'item' as const, id, count: n, fresh: true })),
  ];
}

/** Toasts what a new life starts with, its stones last. */
export function raiseStartToasts(s: GameState): void {
  raiseToasts(startingGains(s), s);
  const stones = Math.floor(s.player.stones);
  if (stones > 0) raiseToast('stones', `${stones} low-grade ${stones === 1 ? 'stone' : 'stones'}`);
}

/** Whether burning emptied the pouch between two states: the last stone went into a qi hour. */
export function stonesRanOut(before: GameState, after: GameState): boolean {
  return after.player.plan.burnStones && before.player.stones > 0 && after.player.stones <= 1e-9;
}

/** The techniques that reached Origin and left their slot between two states. */
export function leftSlots(before: GameState, after: GameState): string[] {
  const now = new Set(after.player.practicing);
  return before.player.practicing.filter(
    (id) =>
      !now.has(id) &&
      hasTechnique(id) &&
      id in after.player.techniques &&
      mastery(after.player, id).level >= MAX_MASTERY,
  );
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
