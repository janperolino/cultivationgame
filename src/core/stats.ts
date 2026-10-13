// A cultivator's stat totals: every effect from the tree nodes they can use (not sealed), the
// properties of each ladder's active method, the growth the methods that climbed each stage left
// (core/growth.ts), a named root's effects, the talents (a sleeping one counts once it wakes) and
// the working properties of worn gear (core/gear.ts). The rules read these totals; see content/stats.ts for units.
import { APTITUDE_BASE, APTITUDE_STEP, LADDERS } from '../content/cultivation.ts';
import { root } from '../content/roots.ts';
import { STAT_IDS, statInfo, type Effect, type StatId } from '../content/stats.ts';
import { hasTalent, talent, talentEffects, type Talent } from '../content/talents.ts';
import { gearEffects } from './gear.ts';
import { ladderGrowth } from './growth.ts';
import { methodManual, techniqueArt } from '../content/manuals.ts';
import { ladderMethod, methodMastery } from './methods.ts';
import type { Cultivator } from './state.ts';
import { mastery } from './techniques.ts';
import { activeNodes } from './trees.ts';

export type Stats = Record<StatId, number>;

export function emptyStats(): Stats {
  return Object.fromEntries(STAT_IDS.map((id) => [id, 0])) as Stats;
}

/** Folds one effect into the totals: most add, and a `times` stat multiplies (0.1 is ×1.1). */
export function addEffect(out: Stats, e: Effect): void {
  out[e.stat] =
    statInfo(e.stat).unit === 'times'
      ? (1 + out[e.stat]) * (1 + e.value) - 1
      : out[e.stat] + e.value;
}

/** The flag a sleeping talent sets when it wakes. */
export const wokeFlag = (id: string) => `woke-${id}`;

/** Whether a talent counts: one that sleeps counts once it has woken. */
export function talentAwake(c: Cultivator, t: Talent): boolean {
  return !t.sleeps || c.flags.includes(wokeFlag(t.id));
}

/** The cultivator's talents, known ids only, in the order rolled. */
export function talentsOf(c: Cultivator): Talent[] {
  return c.talents.filter(hasTalent).map(talent);
}

// The day step reads stats many times a tick; they change only when the nodes, a ladder's realm,
// an active method, the talents, the growth records or the mastery that unseals a method's own
// nodes or an Art's do, so each nodes list keeps its last result.
interface Cached {
  key: string;
  growth: readonly unknown[];
  stats: Readonly<Stats>;
}
const cache = new WeakMap<readonly string[], Cached>();

function cacheKey(c: Cultivator): string {
  const ladders = LADDERS.map((l) => `${c[l].realm}:${c.activeMethods[l] ?? ''}`).join('|');
  const woke = c.talents.filter((t) => c.flags.includes(wokeFlag(t))).join(',');
  const unsealing = Object.keys(c.methods)
    .filter((id) => methodManual(id))
    .map((id) => `${id}:${methodMastery(c, id).level}`)
    .join(',');
  const arts = Object.keys(c.techniques)
    .filter((id) => techniqueArt(id))
    .map((id) => `${id}:${mastery(c, id).level}`)
    .join(',');
  const gear = JSON.stringify(c.gear);
  const bonded = Object.entries(c.bonds)
    .map(([id, days]) => `${id}:${Math.floor(days)}`)
    .join(',');
  return `${ladders}|${c.root}|${c.talents.join(',')}|${woke}|${unsealing}|${arts}|${gear}|${bonded}`;
}

/** Every stat's total from nodes, active methods' properties, growth, the root and talents. */
export function stats(c: Cultivator): Readonly<Stats> {
  const key = cacheKey(c);
  const growth = LADDERS.map((l) => c[l].growth);
  const hit = cache.get(c.nodes);
  if (hit?.key === key && hit.growth.every((g, i) => g === growth[i])) return hit.stats;
  const out = emptyStats();
  for (const node of activeNodes(c)) {
    for (const e of node.effects) addEffect(out, e);
  }
  for (const l of LADDERS) {
    for (const p of ladderMethod(c, l)?.properties ?? []) {
      for (const e of p.effects) addEffect(out, e);
    }
    for (const [stat, v] of Object.entries(ladderGrowth(c[l]))) out[stat as StatId] += v;
  }
  for (const e of root(c.root).effects ?? []) addEffect(out, e);
  for (const t of talentsOf(c)) {
    if (!talentAwake(c, t)) continue;
    for (const e of talentEffects(t)) addEffect(out, e);
  }
  for (const e of gearEffects(c, out.treasureSlots)) addEffect(out, e);
  cache.set(c.nodes, { key, growth, stats: out });
  return out;
}

/** Aptitude, with what talents, nodes and methods add. */
export function aptitude(c: Cultivator): number {
  return c.attributes.aptitude + stats(c).aptitude;
}

/** Agility, with what talents add. Combat reads it from M2. */
export function agility(c: Cultivator): number {
  return c.attributes.agility + stats(c).agility;
}

/** Fortune, with what talents add. Combat reads it from M2; cards' checks read it now. */
export function fortune(c: Cultivator): number {
  return c.attributes.fortune + stats(c).fortune;
}

/** Aptitude's multiplier on every seclusion gain: +5% a point above 10. */
export function aptitudeMultiplier(c: Cultivator): number {
  return Math.max(0, 1 + APTITUDE_STEP * (aptitude(c) - APTITUDE_BASE));
}
