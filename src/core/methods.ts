// Methods known and active (design § Cultivation, methods): qi climbs only with a cultivation
// method, the body with a tempering art and the soul with a nourishing art. A cultivator knows any
// number and climbs each ladder with one. A method's part of the speed is its tier bonus × rarity ×
// mastery; it gains nothing above its tier, so after a major breakthrough the ladder waits on the
// next chapter or a new method. Mastery climbs with every hour cultivated with it, and switching is
// paid in mastery, never in bar. Some methods drink an upkeep and stall on an unfed day.
import { TUTORIAL_LAYERS, type LadderId } from '../content/cultivation.ts';
import { ALL_FIRSTS, type FirstId } from '../content/firsts.ts';
import { METHOD_MASTERY } from '../content/mastery.ts';
import { baseOf, hasItem, item, itemKind } from '../content/items.ts';
import {
  FIT_SPEED,
  hasMethod,
  method,
  methodFit,
  previousChapter,
  UPKEEP_BANDS,
  type Method,
  type Upkeep,
} from '../content/methods.ts';
import {
  rarity,
  rarityMultiplier,
  rarityRank,
  RARITY_IDS,
  type Rarity,
  type RarityId,
} from '../content/rarity.ts';
import { realmIndex, stepOut, tierStep } from '../content/realms.ts';
import { root } from '../content/roots.ts';
import {
  chapterStartLevel,
  masteryAt,
  MAX_MASTERY,
  practiceNeed,
  type Mastery,
} from './mastery.ts';
import { canPay, pay, stonesOf, withStones } from './purse.ts';
import { addItem, type Cultivator, type Ladder } from './state.ts';
import { stats } from './stats.ts';

export type MethodCheck = { ok: true } | { ok: false; reason: string };

/**
 * Qi Condensation layers 1–3 are the tutorial: root speed, method fit, the method's tier, rarity
 * and mastery, and the element hours don't count there. The same holds for body and soul.
 */
export function inTutorial(l: Ladder): boolean {
  return l.realm === 'qi-condensation' && l.stage <= TUTORIAL_LAYERS;
}

/** The method a ladder climbs with, or null when it has none. */
export function ladderMethod(c: Cultivator, which: LadderId): Method | null {
  const id = c.activeMethods[which];
  if (!id || !hasMethod(id)) return null;
  const m = method(id);
  return m.ladder === which ? m : null;
}

export function knowsMethod(c: Cultivator, id: string): boolean {
  return id in c.methods;
}

/** The methods the cultivator knows for a ladder, in the order learned. */
export function knownMethods(c: Cultivator, which: LadderId): Method[] {
  return Object.keys(c.methods)
    .filter(hasMethod)
    .map(method)
    .filter((m) => m.ladder === which);
}

// ---------------------------------------------------------------- mastery

/** Practice days a method needs to reach a mastery level, counted from learning it. */
export function methodNeed(m: Method, level: number): number {
  return practiceNeed(METHOD_MASTERY, m.tier, level);
}

export function methodMastery(c: Cultivator, id: string): Mastery {
  return masteryAt(METHOD_MASTERY, method(id).tier, c.methods[id]?.practice ?? 0);
}

/**
 * The practice a chapter starts from: one level below the chapter before it in its line, two
 * when it is rarer, never below Glimpse. A method of a new line starts at Glimpse.
 */
export function chapterFloor(c: Cultivator, m: Method): number {
  const prev = previousChapter(m);
  if (!prev || !knowsMethod(c, prev.id)) return 0;
  const level = chapterStartLevel(methodMastery(c, prev.id).level, prev.rarity, m.rarity);
  return methodNeed(m, level);
}

/**
 * Adds practice days to a method, up to what Origin needs, and says which levels it reached on
 * the way; each releases a burst of insight (core/cultivation.ts).
 */
export function addMethodPractice(
  c: Cultivator,
  id: string,
  days: number,
): { cultivator: Cultivator; levels: number[] } {
  const rec = c.methods[id];
  if (!rec || days <= 0 || !hasMethod(id)) return { cultivator: c, levels: [] };
  const before = methodMastery(c, id).level;
  const practice = Math.min(methodNeed(method(id), MAX_MASTERY), rec.practice + days);
  const next = { ...c, methods: { ...c.methods, [id]: { ...rec, practice } } };
  const after = methodMastery(next, id).level;
  const levels = Array.from({ length: after - before }, (_, i) => before + 1 + i);
  return { cultivator: next, levels };
}

// ---------------------------------------------------------------- speed

/** True when the method's tier sits below its ladder's realm: it gains nothing there. */
export function methodCapped(c: Cultivator, m: Method): boolean {
  return realmIndex(c[m.ladder].realm) + 1 > m.tier;
}

/**
 * A method whose tier sits above its ladder's realm cultivates faster by one realm's step, out of
 * the ladder's realm: ×3.1 at Qi Condensation. It counts once, however far above the tier sits.
 */
export function tierBonus(c: Cultivator, m: Method): number {
  const l = c[m.ladder];
  return m.tier > realmIndex(l.realm) + 1 ? stepOut(l.realm) : 1;
}

export interface MethodSpeed {
  tier: number;
  /** The rarity band it climbs as (fed upkeep lifts it), in the step out of its own tier. */
  rarity: number;
  mastery: number;
  /** The method's tier sits below the ladder's realm, so it gains nothing. */
  capped: boolean;
  /** tier × rarity × mastery, or 0 when capped or without a method. */
  total: number;
}

/** The method part of a ladder's speed; the tutorial layers ignore it. */
export function methodSpeed(c: Cultivator, which: LadderId): MethodSpeed {
  const m = ladderMethod(c, which);
  if (!m) return { tier: 0, rarity: 0, mastery: 0, capped: false, total: 0 };
  const capped = methodCapped(c, m);
  if (inTutorial(c[which])) {
    return { tier: 1, rarity: 1, mastery: 1, capped, total: capped ? 0 : 1 };
  }
  const tier = tierBonus(c, m);
  const rar = rarityMultiplier(runningRarity(c, m), tierStep(m.tier));
  const mastery = METHOD_MASTERY.speed[methodMastery(c, m.id).level]!;
  return { tier, rarity: rar, mastery, capped, total: capped ? 0 : tier * rar * mastery };
}

/** How well a method fits the cultivator: qi methods by the root's kind; body and soul ignore it. */
export function methodFitSpeed(c: Cultivator, m: Method): number {
  return m.ladder === 'qi' ? FIT_SPEED[methodFit(m, root(c.root).kind)] : 1;
}

/** What the method active at an attempt adds to a breakthrough, by its rarity; plain without one. */
export function breakthroughBonus(c: Cultivator, which: LadderId): Rarity['breakthrough'] {
  return rarity(ladderMethod(c, which)?.rarity ?? 'white').breakthrough;
}

// ---------------------------------------------------------------- learning and switching

/** Whether the cultivator meets a method's requirements: its roots, its flags. */
export function meetsRequirements(c: Cultivator, m: Method): MethodCheck {
  const { roots, flags } = m.requirements;
  if (roots && !roots.includes(root(c.root).kind)) {
    return { ok: false, reason: `It needs a ${roots.join(' or ')} root.` };
  }
  const missing = (flags ?? []).filter((f) => !c.flags.includes(f));
  if (missing.length > 0) return { ok: false, reason: `It needs ${missing.join(' and ')}.` };
  return { ok: true };
}

/**
 * Learns a method, starting from its chapter floor; a ladder with nothing active takes it up at
 * once if it can, unless the lineage has never taken up one of its kind (a qi method, or a
 * tempering or nourishing art): the first time, it waits to be taken up (core/firsts.ts).
 */
export function learnMethod(
  c: Cultivator,
  id: string,
  firsts: readonly FirstId[] = ALL_FIRSTS,
): Cultivator {
  if (knowsMethod(c, id) || !hasMethod(id)) return c;
  const m = method(id);
  const next = {
    ...c,
    methods: { ...c.methods, [id]: { practice: chapterFloor(c, m), fedUntil: 0 } },
  };
  if (!firsts.includes(m.ladder === 'qi' ? 'method' : 'art')) return next;
  if (c.activeMethods[m.ladder] || !meetsRequirements(c, m).ok) return next;
  return { ...next, activeMethods: { ...c.activeMethods, [m.ladder]: id } };
}

/** Whether a ladder can climb with this method now. */
export function canTakeUp(c: Cultivator, which: LadderId, id: string): MethodCheck {
  if (!hasMethod(id) || !knowsMethod(c, id))
    return { ok: false, reason: 'You know no such method.' };
  const m = method(id);
  if (m.ladder !== which) return { ok: false, reason: `The ${m.name} does not climb that ladder.` };
  return meetsRequirements(c, m);
}

/**
 * Climbs a ladder with a known method of that ladder, or with nothing. A chapter taken up after
 * the one before it rose catches up to its floor: switching is paid in mastery, never in bar.
 */
export function setActiveMethod(
  c: Cultivator,
  which: LadderId,
  id: string | null,
): { cultivator: Cultivator; check: MethodCheck } {
  if (id === null) {
    return {
      cultivator: { ...c, activeMethods: { ...c.activeMethods, [which]: null } },
      check: { ok: true },
    };
  }
  const check = canTakeUp(c, which, id);
  if (!check.ok) return { cultivator: c, check };
  const rec = c.methods[id]!;
  const practice = Math.max(rec.practice, chapterFloor(c, method(id)));
  return {
    cultivator: {
      ...c,
      methods: { ...c.methods, [id]: { ...rec, practice } },
      activeMethods: { ...c.activeMethods, [which]: id },
    },
    check,
  };
}

// ---------------------------------------------------------------- upkeep

/**
 * The things in the Bag that pay an upkeep's goods, plainest first: a written thing at any rarity
 * (its variants), or any thing of the kind and tier asked.
 */
function upkeepGoods(c: Cultivator, up: Upkeep): { ids: string[]; n: number }[] {
  const held = Object.keys(c.items).filter((id) => (c.items[id] ?? 0) > 0 && hasItem(id));
  const plainest = (ids: string[]) =>
    ids.sort((a, b) => rarityRank(item(a).rarity) - rarityRank(item(b).rarity));
  const asks = Object.entries(up.items ?? {}).map(([base, n]) => ({
    ids: plainest(held.filter((id) => baseOf(id) === base)),
    n,
  }));
  if (up.any) {
    const { kind, tier, n } = up.any;
    const fits = held.filter((id) => itemKind(item(id)) === kind && item(id).tier === tier);
    asks.push({ ids: plainest(fits), n });
  }
  return asks;
}

// The stones are paid as any price is (core/purse.ts), across the grades.
function canFeed(c: Cultivator, up: Upkeep): boolean {
  if (!canPay(stonesOf(c), up.stones ?? 0)) return false;
  return upkeepGoods(c, up).every(({ ids, n }) => ids.reduce((t, id) => t + c.items[id]!, 0) >= n);
}

function payUpkeep(c: Cultivator, up: Upkeep): Cultivator {
  let next = withStones(c, pay(stonesOf(c), up.stones ?? 0)!);
  for (const { ids, n } of upkeepGoods(c, up)) {
    let left = n;
    for (const id of ids) {
      const take = Math.min(left, next.items[id] ?? 0);
      next = addItem(next, id, -take);
      left -= take;
      if (left <= 0) break;
    }
  }
  return next;
}

/** The days one day's upkeep feeds, after Frugal upkeep (K11): 1 ÷ (1 − the cut). */
export function upkeepDays(c: Cultivator): number {
  return 1 / Math.max(0.2, 1 - stats(c).upkeepCut);
}

/**
 * The rarity a method climbs as (design § Professions, people and powers, What upkeep buys): its
 * written rarity, a band rarer fed on light upkeep and two on heavy. Unfed it stalls, gaining
 * nothing, so only a starved method's growth reads the written band.
 */
export function runningRarity(c: Cultivator, m: Method): RarityId {
  if (!m.upkeep || c.methods[m.id]?.starved) return m.rarity;
  const at = Math.min(RARITY_IDS.length - 1, rarityRank(m.rarity) + UPKEEP_BANDS[m.upkeep.weight]);
  return RARITY_IDS[at]!;
}

/**
 * Feeds a ladder's method for a stretch of days, paying a whole day's upkeep at a time from
 * stones and items. A method with no upkeep, or one past its tier that gains nothing anyway, is
 * always fed. When a day can't be paid, the method stalls for the stretch and is starved.
 */
export function feedMethod(
  c: Cultivator,
  which: LadderId,
  day: number,
  days: number,
): { cultivator: Cultivator; fed: boolean } {
  const m = ladderMethod(c, which);
  if (!m?.upkeep || methodCapped(c, m) || days <= 0) return { cultivator: c, fed: true };
  let next = c;
  let until = Math.max(c.methods[m.id]!.fedUntil, day);
  let fed = true;
  const each = upkeepDays(c);
  while (until < day + days - 1e-9) {
    if (!canFeed(next, m.upkeep)) {
      fed = false;
      break;
    }
    next = payUpkeep(next, m.upkeep);
    until += each;
  }
  const rec = { ...next.methods[m.id]!, fedUntil: until };
  if (fed) delete rec.starved;
  else rec.starved = true;
  return { cultivator: { ...next, methods: { ...next.methods, [m.id]: rec } }, fed };
}

/** Whether the ladder's method will be fed on this day: paid through it, or affordable. */
export function methodFed(c: Cultivator, which: LadderId, day: number): boolean {
  const m = ladderMethod(c, which);
  if (!m?.upkeep || methodCapped(c, m)) return true;
  return c.methods[m.id]!.fedUntil > day || canFeed(c, m.upkeep);
}
