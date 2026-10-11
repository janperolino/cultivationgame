// Cultivation rules (design § Cultivation, § Economy): seclusion days split among qi, body, soul,
// study and practice; bars that fill past full; minor and major breakthroughs and their grades;
// the last chance at the lifespan edge. The constants live in src/content/cultivation.ts.
import {
  APTITUDE_BASE,
  APTITUDE_STEP,
  AUTO_SETTINGS,
  BAR_CAP,
  BODY_PER_DAY,
  GRADES,
  GRADE_SCORES,
  INJURY_SPEED,
  INSIGHT_MARGIN_FULL,
  INSIGHT_PER_STUDY_DAY,
  INSIGHT_TRICKLE,
  LAST_CHANCE_ODDS,
  MAJOR_FAIL_KEEP,
  MAJOR_INJURY_DAYS,
  MAJOR_ODDS_PER_MARGIN,
  MAX_ODDS,
  MINOR_FAIL_LOSS,
  MINOR_INJURY_DAYS,
  ODDS_PER_TENTH,
  QI_PER_DAY,
  SLOT_UNLOCKS,
  SLOTS,
  SOUL_PER_DAY,
  STONE_QI,
  STONES_PER_QI_DAY,
  TUTORIAL_LAYERS,
  UNSETTLED_DAYS,
  type GradeId,
  type SlotId,
} from '../content/cultivation.ts';
import { FIT_SPEED, hasMethod, method, methodFit } from '../content/methods.ts';
import {
  nextRealm,
  realm,
  realmIndex,
  realmScale,
  stageName,
  stepSize,
  type Realm,
  type RealmId,
} from '../content/realms.ts';
import { root } from '../content/roots.ts';
import type { DayStep } from './loop.ts';
import { Rng } from './rng.ts';
import {
  addChronicle,
  addItem,
  ageYears,
  atLifespanEdge,
  hasUnlock,
  itemCount,
  noteBreakthrough,
  unlock,
  type GameState,
  type Ladder,
} from './state.ts';

export type LadderId = 'qi' | 'body' | 'soul';
export const LADDERS: readonly LadderId[] = ['qi', 'body', 'soul'];

const LADDER_NAMES: Record<LadderId, string> = { qi: 'Qi', body: 'Body', soul: 'Soul' };
const FUEL: Record<LadderId, string> = { qi: 'qi', body: 'tempering', soul: 'nourishment' };

// ---------------------------------------------------------------- the seclusion plan

/** The slots that have opened, in plan order. */
export function openSlots(s: GameState): SlotId[] {
  return SLOTS.filter((slot) => hasUnlock(s, `seclusion-${slot}`));
}

/** The fraction of each day each slot gets: the plan's weights shared among the open slots. */
export function dayShares(s: GameState): Record<SlotId, number> {
  const open = openSlots(s);
  const total = open.reduce((sum, slot) => sum + s.plan.shares[slot], 0);
  const out = { qi: 0, body: 0, soul: 0, study: 0, practice: 0 };
  if (total <= 0) return out;
  for (const slot of open) out[slot] = s.plan.shares[slot] / total;
  return out;
}

// ---------------------------------------------------------------- rates

/** Aptitude's multiplier on every seclusion gain: +5% a point above 10. */
export function aptitudeMultiplier(s: GameState): number {
  return Math.max(0, 1 + APTITUDE_STEP * (s.attributes.aptitude - APTITUDE_BASE));
}

/** Qi Condensation layers 1–3 are the tutorial: root speed and method fit don't count yet. */
export function inTutorial(l: Ladder): boolean {
  return l.realm === 'qi-condensation' && l.stage <= TUTORIAL_LAYERS;
}

export interface QiSpeed {
  root: number;
  fit: number;
  /** Qi density, 1 until abodes and spirit veins arrive in M4. */
  density: number;
  aptitude: number;
  total: number;
}

/** Root speed × method fit × qi density × Aptitude. Zero without a method. */
export function qiSpeed(s: GameState): QiSpeed {
  const id = s.character.method;
  const aptitude = aptitudeMultiplier(s);
  if (!id || !hasMethod(id)) return { root: 0, fit: 0, density: 1, aptitude, total: 0 };
  const r = root(s.character.root);
  const tutorial = inTutorial(s.qi);
  const rootSpeed = tutorial ? 1 : r.speed;
  const fit = tutorial ? 1 : FIT_SPEED[methodFit(method(id), r.kind)];
  const density = 1;
  return { root: rootSpeed, fit, density, aptitude, total: rootSpeed * fit * density * aptitude };
}

/** A setback's multiplier on a ladder's gains: none while unsettled, slowed while injured. */
export function setbackMultiplier(l: Ladder, day: number): number {
  if (day < l.unsettledUntil) return 0;
  if (day < l.injuredUntil) return INJURY_SPEED;
  return 1;
}

export interface DayRates {
  shares: Record<SlotId, number>;
  /** Fuel per full day, in qi units, before stones. */
  qi: number;
  body: number;
  soul: number;
  insight: number;
  /** The most stones a full day can burn, and the qi each one adds. */
  stoneCap: number;
  qiPerStone: number;
}

/** What one full day of seclusion gives under the current plan. */
export function dayRates(s: GameState): DayRates {
  const shares = dayShares(s);
  const day = s.calendar.day;
  const apt = aptitudeMultiplier(s);
  const qiScale = realmScale(s.qi.realm);
  const qi = QI_PER_DAY * qiScale * qiSpeed(s).total * shares.qi * setbackMultiplier(s.qi, day);
  const body =
    BODY_PER_DAY * realmScale(s.body.realm) * apt * shares.body * setbackMultiplier(s.body, day);
  const soul =
    SOUL_PER_DAY * realmScale(s.soul.realm) * apt * shares.soul * setbackMultiplier(s.soul, day);
  const secluded = SLOTS.reduce((sum, slot) => sum + shares[slot], 0);
  const insight =
    (INSIGHT_PER_STUDY_DAY * shares.study + INSIGHT_TRICKLE * secluded) *
    realm(s.qi.realm).insightRate *
    apt;
  // Each stone adds a fifth of a plain Qi Condensation day's qi, and a day takes five, both
  // scaled by the realm curve, so a full burn doubles the day whatever the realm.
  const stoneCap = qi > 0 && s.plan.burnStones ? STONES_PER_QI_DAY * qiScale * shares.qi : 0;
  const qiPerStone = stoneCap > 0 ? (qi * STONE_QI) / qiScale / shares.qi : 0;
  return { shares, qi, body, soul, insight, stoneCap, qiPerStone };
}

// ---------------------------------------------------------------- steps and odds

export type NextStep =
  | { kind: 'minor'; realm: RealmId; stage: number }
  | { kind: 'major'; realm: RealmId; stage: 1 }
  | { kind: 'top' };

/** Where this ladder's next breakthrough leads. */
export function nextStep(l: Ladder): NextStep {
  const r = realm(l.realm);
  if (l.stage < r.stages) return { kind: 'minor', realm: l.realm, stage: l.stage + 1 };
  const up = nextRealm(l.realm);
  return up ? { kind: 'major', realm: up.id, stage: 1 } : { kind: 'top' };
}

/** The bar this ladder fills before its next breakthrough. */
export function barSize(l: Ladder): number {
  return stepSize(l.realm, l.stage);
}

/** How full the bar is: 1 at full, up to 1.5. */
export function barFill(l: Ladder): number {
  return l.bar / barSize(l);
}

/** The odds bonus from filling past full: each whole extra 10% adds a step. */
export function overfillBonus(fill: number): number {
  const tenths = Math.floor((fill - 1) * 10 + 1e-9);
  return Math.max(0, Math.min(5, tenths)) * ODDS_PER_TENTH;
}

/** The chance a minor breakthrough succeeds now; 0 before the bar is full or at a major step. */
export function minorOdds(l: Ladder): number {
  const step = nextStep(l);
  if (step.kind !== 'minor') return 0;
  const fill = barFill(l);
  if (fill < 1) return 0;
  const base = realm(l.realm).minorOdds[step.stage - 1] ?? 0.5;
  if (base >= 1) return 1;
  return Math.min(MAX_ODDS, base + overfillBonus(fill));
}

export interface MajorCheck {
  ladder: LadderId;
  target: Realm;
  fill: number;
  /** Each requirement, true when met. */
  bar: boolean;
  insight: boolean;
  /** The gate item, or null when this breakthrough needs none (yet). */
  gateItem: string | null;
  gate: boolean;
  /** Body and soul can run at most one major realm ahead of qi. */
  cap: boolean;
  ready: boolean;
  /** The margin you bring, 0 to 4, and the grade it earns. */
  score: number;
  grade: GradeId;
  odds: number;
}

/** The grade a margin score earns; heavenly needs a rare method. */
export function gradeFor(score: number, rareMethod: boolean): GradeId {
  let best: GradeId = 'flawed';
  for (const g of GRADES) {
    if (g.id === 'heavenly' && !rareMethod) continue;
    if (score >= GRADE_SCORES[g.id]) best = g.id;
  }
  return best;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * The margin a major breakthrough brings (design § Cultivation): fuel past a full bar, insight
 * earned past the threshold, and the other two ladders at or above the new realm, a point each.
 */
export function marginScore(s: GameState, which: LadderId, target: Realm): number {
  const barPart = clamp01((barFill(s[which]) - 1) / (BAR_CAP - 1));
  const threshold = target.insightThreshold;
  const insightPart =
    threshold > 0 ? clamp01((s.insight.earned / threshold - 1) / (INSIGHT_MARGIN_FULL - 1)) : 1;
  const others = LADDERS.filter((l) => l !== which).reduce(
    (sum, l) => sum + (realmIndex(s[l].realm) >= realmIndex(target.id) ? 1 : 0),
    0,
  );
  return barPart + insightPart + others;
}

/** Where a ladder stands against its next major breakthrough; null if its next step is minor. */
export function majorCheck(s: GameState, which: LadderId): MajorCheck | null {
  const l = s[which];
  const step = nextStep(l);
  if (step.kind !== 'major') return null;
  const target = realm(step.realm);
  const fill = barFill(l);
  // Body and soul gate items are settled with items and gear (D2); until then they need none.
  const gateItem = which === 'qi' ? target.gateItem : null;
  const gate = !gateItem || itemCount(s, gateItem) > 0;
  const insight = s.insight.earned >= target.insightThreshold;
  const cap = which === 'qi' || realmIndex(target.id) <= realmIndex(s.qi.realm) + 1;
  const bar = fill >= 1;
  const score = marginScore(s, which, target);
  const rare = s.character.method
    ? hasMethod(s.character.method) && method(s.character.method).rare
    : false;
  const barPart = clamp01((fill - 1) / (BAR_CAP - 1));
  const odds = Math.min(
    MAX_ODDS,
    target.majorOdds + overfillBonus(fill) + MAJOR_ODDS_PER_MARGIN * (score - barPart),
  );
  return {
    ladder: which,
    target,
    fill,
    bar,
    insight,
    gateItem,
    gate,
    cap,
    ready: bar && insight && gate && cap,
    score,
    grade: gradeFor(score, rare),
    odds,
  };
}

/** Whether the auto setting would attempt this ladder's minor breakthrough now. */
export function autoWouldAttempt(s: GameState, which: LadderId): boolean {
  const l = s[which];
  if (nextStep(l).kind !== 'minor' || barFill(l) < 1) return false;
  const odds = minorOdds(l);
  const { minOdds } = AUTO_SETTINGS[s.plan.auto];
  if (minOdds === Infinity) return false;
  return odds >= minOdds || barFill(l) >= BAR_CAP - 1e-9;
}

// ---------------------------------------------------------------- breakthroughs

export interface BreakthroughResult {
  state: GameState;
  /** False when the attempt wasn't allowed; the state is unchanged. */
  attempted: boolean;
  success: boolean;
  major: boolean;
  grade?: GradeId;
  odds: number;
}

function stepLabel(id: RealmId, stage: number): string {
  return stage === 1 && id !== 'qi-condensation'
    ? realm(id).name
    : `${stageName(id, stage)}${id === 'qi-condensation' ? '' : ` ${realm(id).name}`}`;
}

function withLadder(s: GameState, which: LadderId, l: Ladder): GameState {
  return { ...s, [which]: l };
}

/**
 * Attempts this ladder's next breakthrough, minor or major. A major one needs the full check
 * unless `lastChance` is set, which only drops the full bar and caps the grade at flawed.
 */
export function attemptBreakthrough(
  s: GameState,
  which: LadderId,
  opts: { lastChance?: boolean } = {},
): BreakthroughResult {
  const l = s[which];
  const step = nextStep(l);
  const none = { state: s, attempted: false, success: false, major: false, odds: 0 };
  if (step.kind === 'top' || s.ended) return none;
  const rng = new Rng(s.rng);
  const day = s.calendar.day;
  const name = LADDER_NAMES[which];

  if (step.kind === 'minor') {
    if (barFill(l) < 1) return none;
    const odds = minorOdds(l);
    const success = rng.next() < odds;
    let next: GameState = { ...s, rng: rng.state };
    const label = stepLabel(step.realm, step.stage);
    if (success) {
      next = withLadder(next, which, { ...l, stage: step.stage, bar: 0 });
      next = {
        ...next,
        glass: {
          ...next.glass,
          flares: next.glass.flares + 1,
          fractures: next.glass.fractures + (which === 'qi' ? 1 : 0),
        },
      };
      next = noteBreakthrough(next, false);
      next = addChronicle(
        next,
        'breakthrough',
        which === 'qi' ? `Qi breaks through to ${label}.` : `${name} reaches ${label}.`,
      );
    } else {
      const injured = realmIndex(l.realm) >= 1;
      next = withLadder(next, which, {
        ...l,
        bar: l.bar * (1 - MINOR_FAIL_LOSS),
        unsettledUntil: day + UNSETTLED_DAYS,
        injuredUntil: injured ? Math.max(l.injuredUntil, day + MINOR_INJURY_DAYS) : l.injuredUntil,
      });
      next = addChronicle(
        next,
        'setback',
        `The ${FUEL[which]} breaks against ${label} and scatters${injured ? ', leaving a light injury' : ''}.`,
      );
    }
    return { state: next, attempted: true, success, major: false, odds };
  }

  const check = majorCheck(s, which)!;
  const last = opts.lastChance === true;
  const allowed = last ? check.insight && check.gate && check.cap && which === 'qi' : check.ready;
  if (!allowed) return none;
  const odds = last ? lastChanceOdds(check) : check.odds;
  const success = rng.next() < odds;
  let next: GameState = { ...s, rng: rng.state };
  if (check.gateItem) next = addItem(next, check.gateItem, -1);
  const target = check.target;
  if (success) {
    const grade: GradeId = last ? 'flawed' : check.grade;
    next = withLadder(next, which, {
      ...l,
      realm: target.id,
      stage: 1,
      bar: 0,
      grades: [...l.grades, grade],
    });
    next = {
      ...next,
      glass: {
        ...next.glass,
        flares: next.glass.flares + 1,
        fractures: next.glass.fractures + (which === 'qi' ? 1 : 0),
      },
    };
    next = noteBreakthrough(next, true);
    const gradeName = GRADES.find((g) => g.id === grade)!.name.toLowerCase();
    next = addChronicle(
      next,
      'major',
      which === 'qi'
        ? `${last ? 'At the edge of death, ' : ''}${s.character.name} breaks through to ${target.name}: a ${gradeName} foundation.`
        : `${name} breaks through to ${target.name}, a ${gradeName} breakthrough.`,
    );
    return { state: next, attempted: true, success, major: true, grade, odds };
  }
  next = withLadder(next, which, {
    ...l,
    bar: l.bar * MAJOR_FAIL_KEEP,
    injuredUntil: Math.max(l.injuredUntil, day + MAJOR_INJURY_DAYS),
  });
  next = addChronicle(
    next,
    'setback',
    `The breakthrough to ${target.name} fails${check.gateItem ? ', the pill wasted,' : ''} and leaves ${name.toLowerCase()} injured for years.`,
  );
  return { state: next, attempted: true, success, major: true, odds };
}

// ---------------------------------------------------------------- the lifespan edge

function lastChanceOdds(check: MajorCheck): number {
  return check.target.majorOdds * Math.min(1, check.fill) * LAST_CHANCE_ODDS;
}

export interface LastChance {
  /** True when a last breakthrough can be tried: peak of the realm, the gate item, the insight. */
  possible: boolean;
  odds: number;
  /** Why not, when it isn't possible. */
  reason?: string;
}

/** What the lifespan edge offers: a major breakthrough below a full bar, at worse odds. */
export function lastChance(s: GameState): LastChance {
  const check = majorCheck(s, 'qi');
  if (!check)
    return { possible: false, odds: 0, reason: 'Your qi is not at the peak of its realm.' };
  if (!check.gate) {
    return {
      possible: false,
      odds: 0,
      reason: `You hold no ${check.target.gate.replace(/^an? /, '')}.`,
    };
  }
  if (!check.insight) {
    return { possible: false, odds: 0, reason: 'Your insight falls short of the threshold.' };
  }
  // A full bar makes it an ordinary attempt, at its ordinary odds.
  return { possible: true, odds: check.bar ? check.odds : lastChanceOdds(check) };
}

/** Tries the last chance; if it fails, or isn't possible, the life ends. */
export function attemptLastChance(s: GameState): BreakthroughResult {
  if (!atLifespanEdge(s) || s.ended) {
    return { state: s, attempted: false, success: false, major: true, odds: 0 };
  }
  const check = majorCheck(s, 'qi');
  const result = attemptBreakthrough(s, 'qi', { lastChance: !check?.bar });
  if (result.success) return result;
  return { ...result, state: endLife(result.state) };
}

/** The life ends at the lifespan edge. The slot keeps the chronicle and offers a new life. */
export function endLife(s: GameState, cause = 'lifespan'): GameState {
  if (s.ended) return s;
  const age = Math.floor(ageYears(s));
  const where = stepLabel(s.qi.realm, s.qi.stage);
  const text = `${s.character.name} dies at ${age}, at ${where}${s.qi.realm === 'qi-condensation' ? ' of Qi Condensation' : ''}.`;
  return { ...addChronicle(s, 'death', text), ended: { day: s.calendar.day, cause } };
}

// ---------------------------------------------------------------- the day step

function capBar(l: Ladder, bar: number): number {
  return Math.min(bar, barSize(l) * BAR_CAP);
}

/** Opens seclusion slots as qi reaches them, with a chronicle hint each. */
export function checkUnlocks(s: GameState): GameState {
  let next = s;
  const qi = s.qi;
  for (const u of SLOT_UNLOCKS) {
    if (u.slot === 'qi' && !s.character.method) continue;
    const reached =
      realmIndex(qi.realm) > 0 ||
      qi.stage > u.layer ||
      (qi.stage === u.layer && barFill(qi) >= u.bar);
    if (reached) next = unlock(next, u.flag, u.text || undefined);
  }
  const major = majorCheck(next, 'qi');
  if (major?.bar && major.insight) {
    next = unlock(
      next,
      `ready-${major.target.id}`,
      major.gate
        ? `Qi presses against the gate of ${major.target.name}. The breakthrough waits on you.`
        : `Qi presses against the gate of ${major.target.name}, but you hold no ${major.target.gate.replace(/^an? /, '')}.`,
    );
  }
  return next;
}

/**
 * The cultivation day step for `advance`: fills the bars and insight for a stretch of at most a
 * day, burns stones on qi days, opens slots, and runs minor breakthroughs on the auto setting.
 * Major breakthroughs are always the player's call and never happen here, online or off.
 */
export const cultivate: DayStep = (s, days) => {
  if (s.ended || days <= 0) return s;
  const rates = dayRates(s);
  // No stones burn once the qi bar is at its cap: the qi would be lost.
  const capped = barFill(s.qi) >= BAR_CAP - 1e-9;
  const burned = capped ? 0 : Math.min(s.stones, rates.stoneCap * days);
  const qiGain = rates.qi * days + burned * rates.qiPerStone;
  let next: GameState = {
    ...s,
    qi: { ...s.qi, bar: capBar(s.qi, s.qi.bar + qiGain) },
    body: { ...s.body, bar: capBar(s.body, s.body.bar + rates.body * days) },
    soul: { ...s.soul, bar: capBar(s.soul, s.soul.bar + rates.soul * days) },
    insight: {
      current: s.insight.current + rates.insight * days,
      earned: s.insight.earned + rates.insight * days,
    },
    stones: s.stones - burned,
  };
  next = checkUnlocks(next);
  for (const which of LADDERS) {
    if (autoWouldAttempt(next, which)) next = attemptBreakthrough(next, which).state;
  }
  return next;
};
