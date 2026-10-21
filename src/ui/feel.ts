// The feel pass (F1, design § Still to design, Art and sound): what a card's or an encounter's
// choice changed, as the +n by the figure, and the day's burn the low-stones hint reads. UI only:
// both read two states, or one, and change nothing.
import { create } from 'zustand';
import { GRADES } from '../content/money.ts';
import { hasItem, item } from '../content/items.ts';
import { LADDERS } from '../content/cultivation.ts';
import { ratesHere } from '../core/life.ts';
import { ladderMethod, methodCapped, upkeepDays } from '../core/methods.ts';
import { burnable, realmGrade, stonesOf } from '../core/purse.ts';
import type { GameState } from '../core/state.ts';
import { cue } from './cues.ts';
import { formatNumber } from './format.ts';

/** One thing a choice changed: stones by grade, insight, qi poured into the bar, or an item. */
export interface Delta {
  kind: 'stones' | 'insight' | 'qi' | 'item';
  n: number;
  /** Stones: the grade, 0 for low; an item: its id. */
  grade?: number;
  id?: string;
}

/** Below this a change is a part-drunk stone or a rounding, not something a choice handed over. */
const EPS = 0.5;

/** What one state to the next gave or took, stones and insight first. */
export function deltas(before: GameState, after: GameState): Delta[] {
  const a = before.player;
  const b = after.player;
  const out: Delta[] = [];
  const was = stonesOf(a);
  stonesOf(b).forEach((n, g) => {
    const d = Math.round(n - was[g]!);
    if (Math.abs(n - was[g]!) >= EPS && d !== 0) out.push({ kind: 'stones', n: d, grade: g });
  });
  const insight = Math.round(b.insight.current - a.insight.current);
  if (insight !== 0) out.push({ kind: 'insight', n: insight });
  // Qi poured into the bar, while the step is the same one; a breakthrough's bar is another bar.
  if (a.qi.realm === b.qi.realm && a.qi.stage === b.qi.stage) {
    const qi = Math.round(b.qi.bar - a.qi.bar);
    if (qi !== 0) out.push({ kind: 'qi', n: qi });
  }
  for (const id of new Set([...Object.keys(a.items), ...Object.keys(b.items)])) {
    const d = (b.items[id] ?? 0) - (a.items[id] ?? 0);
    if (d !== 0 && hasItem(id)) out.push({ kind: 'item', n: d, id });
  }
  return out;
}

/** Changes to the same thing summed, in first-seen order; those that cancel out are dropped. */
export function mergeDeltas(ds: readonly Delta[]): Delta[] {
  const out = new Map<string, Delta>();
  for (const d of ds) {
    const k = `${d.kind}/${d.grade ?? ''}/${d.id ?? ''}`;
    const was = out.get(k);
    out.set(k, was ? { ...was, n: was.n + d.n } : { ...d });
  }
  return [...out.values()].filter((d) => d.n !== 0);
}

/** A change's words: "+20", "+2 mid", "+40 qi", "+1 Qi Gathering Pill", "−20". */
export function deltaWords(d: Delta): string {
  const sign = d.n > 0 ? '+' : '−';
  const n = `${sign}${formatNumber(Math.abs(d.n))}`;
  switch (d.kind) {
    case 'stones':
      return d.grade ? `${n} ${GRADES[d.grade]}` : n;
    case 'insight':
      return n;
    case 'qi':
      return `${n} qi`;
    case 'item':
      return `${n} ${item(d.id!).name}`;
  }
}

/**
 * A day's burn (F1, Jan's call in its talk): what a full qi day burns from the pouch, when burning
 * is on, and the day's upkeep in stones of the methods that eat them.
 */
export function dayBurn(s: GameState): number {
  const c = s.player;
  let burn = c.plan.burnStones ? ratesHere(s).stoneCap : 0;
  for (const which of LADDERS) {
    const m = ladderMethod(c, which);
    if (m?.upkeep?.stones && !methodCapped(c, m)) burn += m.upkeep.stones / upkeepDays(c);
  }
  return burn;
}

/** What the pouch can spend on a day's burn: the stones of your grade and below. */
export function burnableNow(s: GameState): number {
  return burnable(stonesOf(s.player), realmGrade(s.player.qi.realm));
}

/**
 * The low-stones hint's words when the pouch has just fallen under a day's burn, or null. It
 * fires once on the way down; `armed` says it may fire again, which it may once the pouch has
 * climbed back past two days' burn.
 */
export function lowStonesWords(before: GameState, after: GameState, armed: boolean): string | null {
  const burn = dayBurn(after);
  if (!armed || burn <= 0) return null;
  const now = burnableNow(after);
  if (burnableNow(before) < burn || now >= burn) return null;
  const left = Math.floor(now);
  return `${formatNumber(left)} ${left === 1 ? 'stone' : 'stones'} left, less than a day's burn (${formatNumber(Math.ceil(burn))}). Qi slows to the wheel alone once they're gone.`;
}

/** Whether the hint may fire again: the pouch is back past two days' burn. */
export function lowStonesRearms(s: GameState): boolean {
  return burnableNow(s) >= 2 * dayBurn(s);
}

// ---------------------------------------------------------------- the +n by the figure

/** A +n showing: it rises about 40 px and fades over 1.2 s, once (theme.css, `gain-rise`). */
export interface GainFloat {
  key: number;
  d: Delta;
  /** Its place in the burst it came with, so a burst stacks. */
  at: number;
}

/** How long a +n stays mounted: its 1.2 s rise and a breath. */
const FLOAT_MS = 1300;

export const useFloats = create<{ floats: GainFloat[] }>()(() => ({ floats: [] }));

let floatKey = 1;

/** S1's cue for a choice's changes, as its outcome is read: a gain's, else a loss's. */
export function cueGains(ds: readonly Delta[]): void {
  if (ds.length > 0) cue(ds.some((d) => d.n > 0) ? 'feel-gain' : 'feel-loss');
}

/**
 * The changes rise as +n by the figure, once the outcome they came with is closed (the square's
 * Go on, a fight's hand-back), so they rise over the scene rather than under the square's shade.
 */
export function riseGains(ds: readonly Delta[]): void {
  const merged = mergeDeltas(ds);
  if (merged.length === 0) return;
  const fresh = merged.map((d, at) => ({ key: floatKey++, d, at }));
  useFloats.setState((s) => ({ floats: [...s.floats, ...fresh] }));
  const keys = new Set(fresh.map((f) => f.key));
  window.setTimeout(
    () => useFloats.setState((s) => ({ floats: s.floats.filter((f) => !keys.has(f.key)) })),
    FLOAT_MS,
  );
}
