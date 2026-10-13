// What's new (design § UI and screens, Only what you have touched shows). The game state keeps
// `seen`: by kind, the ids the player has looked at. Anything held and not yet seen is new: a toast
// names it as it comes, its screen's menu item wears a dot until that screen is opened (which
// "notices" it), and on the screen it glows until selected (which "sees" it). Which trees show is
// decided here too: a combat Dao once something of it is held, and any tree a held manual grafts
// on, even before that tree's ladder opens.
import { actionDaos } from '../content/daos.ts';
import { hasItem, item } from '../content/items.ts';
import { BIG_THREE, DAOS, type Tree } from '../content/trees/index.ts';
import { ladderOpen } from './cultivation.ts';
import { wornIds } from './gear.ts';
import { graftsOn, heldManuals } from './manuals.ts';
import type { Cultivator, GameState } from './state.ts';
import { knownTechniques } from './techniques.ts';

export const SEEN_KINDS = ['technique', 'method', 'manual', 'item', 'tree', 'screen'] as const;
export type SeenKind = (typeof SEEN_KINDS)[number];

/** Noticed: its screen was opened since it came, so the menu's dot is gone. Seen: selected. */
export type Look = 'noticed' | 'seen';
/** The save's record: by kind, each id looked at and how far. */
export type Seen = Record<string, Record<string, Look>>;

export function emptySeen(): Seen {
  return Object.fromEntries(SEEN_KINDS.map((k) => [k, {}]));
}

// ---------------------------------------------------------------- which trees show

/** Whether the tree's own nodes are drawn: a Dao's always, Qi, Body and Soul once their ladder opens. */
export function treeOpen(c: Cultivator, t: Tree): boolean {
  return t.dao !== undefined || ladderOpen(c, t.ladder);
}

/**
 * Whether the Trees screen shows the tree. Any tree a held manual grafts on shows, whatever its
 * ladder; Qi, Body and Soul show with their ladders; a combat Dao once you know a technique that
 * counts it, carry or wear a weapon of its kind, or own a node in it. A root's element doesn't
 * count.
 */
export function treeShown(c: Cultivator, t: Tree): boolean {
  if (graftsOn(c, t.id).length > 0) return true;
  if (!t.dao) return ladderOpen(c, t.ladder);
  const dao = t.dao;
  if (t.nodes.some((n) => c.nodes.includes(n.id))) return true;
  if (knownTechniques(c).some((k) => actionDaos(k.daos, k.damage).includes(dao))) return true;
  const things = [...Object.keys(c.items).filter((id) => (c.items[id] ?? 0) > 0), ...wornIds(c)];
  return things.some((id) => hasItem(id) && item(id).uses.equip?.weapon === dao);
}

/** The trees the screen shows, the big three first, then the Daos, in the content's order. */
export function shownTrees(c: Cultivator): Tree[] {
  return [...BIG_THREE, ...DAOS].filter((t) => treeShown(c, t));
}

// ---------------------------------------------------------------- what is held, and what is new

/** How many of an item the cultivator has, in the Bag and worn. */
function itemTotal(c: Cultivator, id: string): number {
  return (c.items[id] ?? 0) + wornIds(c).filter((w) => w === id).length;
}

/** Every id the player holds of a kind: what the seen record is kept against. */
export function heldIds(s: GameState, kind: SeenKind): string[] {
  const c = s.player;
  switch (kind) {
    case 'technique':
      return Object.keys(c.techniques);
    case 'method':
      return Object.keys(c.methods);
    case 'manual':
      return heldManuals(c).map((m) => m.id);
    case 'item':
      return [...new Set([...Object.keys(c.items), ...wornIds(c)])].filter(
        (id) => itemTotal(c, id) > 0,
      );
    case 'tree':
      return shownTrees(c).map((t) => t.id);
    case 'screen':
      return [...s.unlocks];
  }
}

export function look(s: GameState, kind: SeenKind, id: string): Look | undefined {
  return s.seen[kind]?.[id];
}

/** Whether the thing is new: held and not yet selected. Its glow stays until it is. */
export function isNew(s: GameState, kind: SeenKind, id: string): boolean {
  return look(s, kind, id) !== 'seen';
}

/** The ids of a kind held and still new. */
export function newIds(s: GameState, kind: SeenKind): string[] {
  return heldIds(s, kind).filter((id) => isNew(s, kind, id));
}

function mark(s: GameState, kind: SeenKind, ids: readonly string[], to: Look): GameState {
  const was = s.seen[kind] ?? {};
  const change = ids.filter((id) => was[id] !== 'seen' && was[id] !== to);
  if (change.length === 0) return s;
  const next = { ...was };
  for (const id of change) next[id] = to;
  return { ...s, seen: { ...s.seen, [kind]: next } };
}

/** Marks things seen: selected on their screen, so their glow goes. */
export function see(s: GameState, kind: SeenKind, ids: readonly string[]): GameState {
  return mark(s, kind, ids, 'seen');
}

/** Marks everything held as seen: a new life, or an old save, starts with nothing new. */
export function seeAll(s: GameState): GameState {
  return SEEN_KINDS.reduce((acc, k) => see(acc, k, heldIds(acc, k)), s);
}

// ---------------------------------------------------------------- the menu's dots

/** The kinds of new thing each screen holds, for its dot. */
export const SCREEN_KINDS: Readonly<Record<string, readonly SeenKind[]>> = {
  techniques: ['technique'],
  bag: ['item'],
  trees: ['tree', 'manual'],
  cultivate: ['method'],
};

/** Kinds nothing on their screen glows for: opening the screen sees them. */
const SEEN_ON_OPEN: readonly SeenKind[] = ['method'];

/** Whether the screen's menu item wears a dot: it is new itself, or holds a thing not yet noticed. */
export function screenDot(s: GameState, screen: string): boolean {
  if (s.unlocks.includes(screen) && isNew(s, 'screen', screen)) return true;
  return (SCREEN_KINDS[screen] ?? []).some((k) =>
    heldIds(s, k).some((id) => look(s, k, id) === undefined),
  );
}

/** Opening a screen: it is seen, its dot clears, and what is new on it keeps its glow. */
export function openScreen(s: GameState, screen: string): GameState {
  let next = s.unlocks.includes(screen) ? see(s, 'screen', [screen]) : s;
  for (const k of SCREEN_KINDS[screen] ?? []) {
    const fresh = heldIds(next, k).filter((id) => look(next, k, id) === undefined);
    next = mark(next, k, fresh, SEEN_ON_OPEN.includes(k) ? 'seen' : 'noticed');
  }
  return next;
}

// ---------------------------------------------------------------- what a moment brought

/** Something gained between two states: a toast's worth. Items count up; the rest are new ids. */
export interface Gain {
  kind: SeenKind;
  id: string;
  /** How many more: items only, 1 for the rest. */
  count: number;
  /** Never seen before, as opposed to more of an item already known. */
  fresh: boolean;
}

/** What the player gained from one state to the next, by kind in `SEEN_KINDS` order. */
export function gains(before: GameState, after: GameState): Gain[] {
  const out: Gain[] = [];
  for (const kind of SEEN_KINDS) {
    if (kind === 'item') {
      for (const id of heldIds(after, 'item')) {
        const more = itemTotal(after.player, id) - itemTotal(before.player, id);
        if (more > 0) out.push({ kind, id, count: more, fresh: isNew(after, kind, id) });
      }
      continue;
    }
    const had = new Set(heldIds(before, kind));
    for (const id of heldIds(after, kind)) {
      if (!had.has(id)) out.push({ kind, id, count: 1, fresh: isNew(after, kind, id) });
    }
  }
  return out;
}
