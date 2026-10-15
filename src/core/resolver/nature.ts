// A person's nature (design § NPC basics, A person's nature; P3.4's talk): rolled from a seed for
// anyone the world keeps, written for named people. Two or three leans on the eleven axes, a role's
// trade leaning the roll, one to three motives, now and then a quirk, and a voice from the pools so
// a person sounds the same each time. Likes are read from who they are, never rolled. What you
// know of someone is learned: the outer leans and quirks at first meeting, the inner ones when they
// act on them, a motive when they show it. The world's own content, so its seed is its own.
import {
  AXES,
  AXIS_IDS,
  AXIS_REGISTERS,
  HABITS_BY,
  HABITS_COMMON,
  LEANS_ODDS,
  LIKES_COUNTED,
  MOTIVE_IDS,
  MOTIVE_LIKES,
  MOTIVE_ODDS,
  MOTIVE_TOPICS,
  MOTIVES,
  PATH_LIKES,
  QUIRK_IDS,
  QUIRK_LIKES,
  QUIRK_ODDS,
  QUIRKS,
  STRONG_LEAN_ODDS,
  TRADE_AXIS_WEIGHT,
  TRADE_LEAN_ODDS,
  TRADES,
  type AxisId,
  type GiftKind,
  type Lean,
  type MotiveId,
  type Nature,
  type QuirkId,
  type Register,
  type TradeId,
} from '../../content/personality.ts';
import type { LadderId } from '../../content/cultivation.ts';
import { Rng } from '../rng.ts';
import type { World } from './world.ts';

export interface NatureInit {
  trade?: TradeId;
  path?: LadderId;
}

/** Picks from weighted choices. */
function weighted<T>(rng: Rng, items: readonly { item: T; w: number }[]): T {
  const total = items.reduce((t, x) => t + x.w, 0);
  let r = rng.next() * total;
  for (const x of items) {
    r -= x.w;
    if (r < 0) return x.item;
  }
  return items[items.length - 1]!.item;
}

/**
 * A nature rolled from a seed: two or three leans (a trade's axes three times as likely, leaning
 * its way three times in four), one to three motives, a quirk now and then, and a voice.
 */
export function rollNature(seed: string, init: NatureInit = {}): Nature {
  const rng = Rng.fromString(`nature/${seed}`);
  const trade = init.trade ? TRADES[init.trade] : undefined;
  const tradeLeans = (trade?.leans ?? {}) as Partial<Record<AxisId, -1 | 1>>;
  const count = rng.int(1, 100) <= LEANS_ODDS.two ? 2 : 3;
  const axes: Partial<Record<AxisId, Lean>> = {};
  let pool = AXIS_IDS.map((a) => ({ item: a, w: tradeLeans[a] ? TRADE_AXIS_WEIGHT : 1 }));
  for (let i = 0; i < count; i++) {
    const axis = weighted(rng, pool);
    pool = pool.filter((x) => x.item !== axis);
    const bias = tradeLeans[axis];
    const sign = bias
      ? rng.int(1, 100) <= TRADE_LEAN_ODDS
        ? bias
        : -bias
      : rng.chance(0.5)
        ? 1
        : -1;
    const size = rng.int(1, 100) <= STRONG_LEAN_ODDS ? 2 : 1;
    axes[axis] = (sign * size) as Lean;
  }
  const mRoll = rng.int(1, 100);
  const mCount = mRoll <= MOTIVE_ODDS.one ? 1 : mRoll <= MOTIVE_ODDS.one + MOTIVE_ODDS.two ? 2 : 3;
  const motives: MotiveId[] = [];
  while (motives.length < mCount) {
    const m = rng.pick(MOTIVE_IDS);
    if (!motives.includes(m)) motives.push(m);
  }
  const qRoll = rng.int(1, 100);
  const qCount = qRoll <= QUIRK_ODDS.none ? 0 : qRoll <= QUIRK_ODDS.none + QUIRK_ODDS.one ? 1 : 2;
  const quirks: QuirkId[] = [];
  while (quirks.length < qCount) {
    const q = rng.pick(QUIRK_IDS);
    const not = (QUIRKS[q] as { not?: QuirkId }).not;
    if (!quirks.includes(q) && !(not && quirks.includes(not))) quirks.push(q);
  }
  const nature: Nature = {
    motives,
    axes,
    quirks,
    ...(init.trade ? { trade: init.trade } : {}),
    ...(init.path ? { path: init.path } : {}),
    voice: { register: 'plain', habit: '', topic: '' },
  };
  return { ...nature, voice: rollVoice(rng, nature) };
}

/** A voice from the pools: a register by their strongest lean or trade, a habit, a topic. */
function rollVoice(rng: Rng, n: Nature): Nature['voice'] {
  const strongest = (Object.entries(n.axes) as [AxisId, Lean][]).sort(
    (a, b) => Math.abs(b[1]) - Math.abs(a[1]),
  );
  let register: Register | undefined;
  for (const [axis, l] of strongest) {
    const r = AXIS_REGISTERS[axis];
    register ??= l > 0 ? r?.high : r?.low;
  }
  register ??= n.trade ? TRADES[n.trade].register : 'plain';
  const own: string[] = [];
  for (const q of n.quirks) own.push(...(HABITS_BY[q] ?? []));
  for (const [axis, l] of strongest) own.push(...(HABITS_BY[`${axis}${l > 0 ? '+' : '-'}`] ?? []));
  const habit = own.length > 0 && rng.chance(0.7) ? rng.pick(own) : rng.pick(HABITS_COMMON);
  const topic = n.trade
    ? TRADES[n.trade].topic
    : n.motives[0]
      ? MOTIVE_TOPICS[n.motives[0]]
      : 'the weather';
  return { register, habit, topic };
}

/** What a gift kind they like comes from, so you know it once you know that. */
export interface Like {
  kind: GiftKind;
  /** A key in what you can know of them: "quirk:drinker", "motive:greed", or always known. */
  from: string | null;
}

/** What someone likes, read from who they are: quirks, trade, motives, path; the first two count. */
export function likesWithReasons(n: Nature): Like[] {
  const out: Like[] = [];
  const add = (kind: GiftKind | undefined, from: string | null) => {
    if (kind && !out.some((l) => l.kind === kind)) out.push({ kind, from });
  };
  for (const q of n.quirks) add(QUIRK_LIKES[q], `quirk:${q}`);
  if (n.trade) add(TRADES[n.trade].likes, null);
  for (const m of n.motives) add(MOTIVE_LIKES[m], `motive:${m}`);
  if (n.path) add(PATH_LIKES[n.path], null);
  return out.slice(0, LIKES_COUNTED);
}

export function likesOf(n: Nature): GiftKind[] {
  return likesWithReasons(n).map((l) => l.kind);
}

/** A lean in words: "gregarious", or "a little vengeful". */
export function leanWord(axis: AxisId, l: number): string {
  const word = l < 0 ? AXES[axis].low : AXES[axis].high;
  return Math.abs(l) >= 2 ? word : `a little ${word}`;
}

// ── What you know of them ────────────────────────────────────────────────────────────────────

/** The key for one thing about someone in what you have learned. */
export function natureKey(id: string, what: string): string {
  return `nature:${id}:${what}`;
}

/** Learns things about someone: "temper", "motive:greed", "quirk:gambler". */
export function revealNature(w: World, id: string, what: readonly string[]): World {
  const keys = what.map((x) => natureKey(id, x)).filter((k) => !w.known.includes(k));
  return keys.length ? { ...w, known: [...w.known, ...keys] } : w;
}

/** What first meeting shows: the outer leans and the quirks. */
export function meetingShows(n: Nature): string[] {
  return [
    ...(Object.keys(n.axes) as AxisId[]).filter((a) => AXES[a].shows === 'outer'),
    ...n.quirks.map((q) => `quirk:${q}`),
  ];
}

export function knowsNature(w: World, id: string, what: string): boolean {
  return w.known.includes(natureKey(id, what));
}

/** Someone's nature as far as you know it: their leans, motives, quirks and likes you've learned. */
export function knownNature(w: World, id: string, n: Nature) {
  const leans = (Object.entries(n.axes) as [AxisId, Lean][]).filter(([a]) => knowsNature(w, id, a));
  const motives = n.motives.filter((m) => knowsNature(w, id, `motive:${m}`));
  const quirks = n.quirks.filter((q) => knowsNature(w, id, `quirk:${q}`));
  const likes = likesWithReasons(n).filter((l) => l.from === null || knowsNature(w, id, l.from));
  const hidden = Object.keys(n.axes).length - leans.length + (n.quirks.length - quirks.length);
  return {
    words: [...leans.map(([a, l]) => leanWord(a, l)), ...quirks.map((q) => QUIRKS[q].name)],
    motives: motives.map((m) => MOTIVES[m].name),
    unknownMotives: n.motives.length - motives.length,
    likes: likes.map((l) => l.kind),
    /** Leans and quirks you haven't seen yet. */
    hidden,
  };
}

/** Their nature as someone who knows only what they've learned of it can weigh it. */
export function seenNature(w: World, id: string, n: Nature): Nature {
  const axes: Nature['axes'] = {};
  for (const [a, l] of Object.entries(n.axes) as [AxisId, Lean][]) {
    if (knowsNature(w, id, a)) axes[a] = l;
  }
  return {
    ...n,
    axes,
    motives: n.motives.filter((m) => knowsNature(w, id, `motive:${m}`)),
    quirks: n.quirks.filter((q) => knowsNature(w, id, `quirk:${q}`)),
  };
}
