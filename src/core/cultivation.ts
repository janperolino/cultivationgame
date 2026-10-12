// Cultivation rules (design § Cultivation, § Economy): what each hour of the day wheel yields, a
// ladder gaining only with a method on it; bars that fill past full; minor and major breakthroughs
// and their grades; the last chance at the lifespan edge. Every rule takes a Cultivator, not the game, so NPCs and
// co-op guests run on the same code; randomness and the day come in as inputs. The constants live
// in src/content/cultivation.ts, and core/life.ts applies the results to the game.
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
  LADDERS,
  LAST_CHANCE_ODDS,
  MAJOR_FAIL_KEEP,
  MAJOR_INJURY_DAYS,
  MAJOR_ODDS_PER_MARGIN,
  MAX_ODDS,
  MINOR_FAIL_LOSS,
  MINOR_INJURY_DAYS,
  ODDS_PER_TENTH,
  QI_PER_DAY,
  SOUL_PER_DAY,
  STONE_QI,
  STONES_PER_QI_DAY,
  TUTORIAL_LAYERS,
  UNSETTLED_DAYS,
  type GradeId,
  type LadderId,
} from '../content/cultivation.ts';
import { phaseOf } from '../content/elements.ts';
import {
  BRANCHES,
  DAWN_BONUS,
  DAWN_HOUR,
  DISCIPLINE_BONUS,
  ELEMENT_BONUS,
  HOUR_KIND_IDS,
  HOURS_PER_DAY,
  type HourKind,
} from '../content/hours.ts';
import { FIT_SPEED, methodFit } from '../content/methods.ts';
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
import type { Routine } from '../content/routines.ts';
import { ladderMethod } from './methods.ts';
import type { Rng } from './rng.ts';
import { addItem, hasFlag, itemCount, type Cultivator, type Ladder } from './state.ts';
import { stats } from './stats.ts';
import { addPractice, canPractice } from './techniques.ts';
import { effectiveWheel, followedRoutine, openHours } from './wheel.ts';

export { LADDERS, type LadderId };

const LADDER_NAMES: Record<LadderId, string> = { qi: 'Qi', body: 'Body', soul: 'Soul' };
const FUEL: Record<LadderId, string> = { qi: 'qi', body: 'tempering', soul: 'nourishment' };

/** A line for the chronicle; core/life.ts dates it and adds it. */
export interface Note {
  kind: string;
  text: string;
}

/** What a rule needs from the world: the day, and the random stream it may draw from. */
export interface RuleContext {
  day: number;
  rng: Rng;
}

// ---------------------------------------------------------------- the ladders

/**
 * Whether a ladder shows on the screens: qi always; body and soul once they have a method, an
 * opened hour, or any growth from the world.
 */
export function ladderOpen(c: Cultivator, which: LadderId): boolean {
  if (which === 'qi') return true;
  const l = c[which];
  return (
    c.activeMethods[which] !== null ||
    hasFlag(c, `hours-${which}`) ||
    realmIndex(l.realm) > 0 ||
    l.stage > 1 ||
    l.bar > 0
  );
}

// ---------------------------------------------------------------- rates

/** Aptitude, with what nodes add. */
export function aptitude(c: Cultivator): number {
  return c.attributes.aptitude + stats(c).aptitude;
}

/** Aptitude's multiplier on every seclusion gain: +5% a point above 10. */
export function aptitudeMultiplier(c: Cultivator): number {
  return Math.max(0, 1 + APTITUDE_STEP * (aptitude(c) - APTITUDE_BASE));
}

/** Qi Condensation layers 1–3 are the tutorial: root speed, fit and element hours don't count. */
export function inTutorial(l: Ladder): boolean {
  return l.realm === 'qi-condensation' && l.stage <= TUTORIAL_LAYERS;
}

export interface QiSpeed {
  root: number;
  fit: number;
  /** Qi density, 1 until abodes and spirit veins arrive in M4. */
  density: number;
  aptitude: number;
  /** Tree nodes' qi gain, as a multiplier. */
  nodes: number;
  total: number;
}

/** Root speed × method fit × qi density × Aptitude × nodes. Zero without a qi method. */
export function qiSpeed(c: Cultivator): QiSpeed {
  const m = ladderMethod(c, 'qi');
  const apt = aptitudeMultiplier(c);
  const nodes = 1 + stats(c).qiGain;
  if (!m) {
    return { root: 0, fit: 0, density: 1, aptitude: apt, nodes, total: 0 };
  }
  const r = root(c.root);
  const tutorial = inTutorial(c.qi);
  const rootSpeed = tutorial ? 1 : r.speed;
  const fit = tutorial ? 1 : FIT_SPEED[methodFit(m, r.kind)];
  const density = 1;
  return {
    root: rootSpeed,
    fit,
    density,
    aptitude: apt,
    nodes,
    total: rootSpeed * fit * density * apt * nodes,
  };
}

/** A setback's multiplier on a ladder's gains: none while unsettled, slowed while injured. */
export function setbackMultiplier(l: Ladder, day: number): number {
  if (day < l.unsettledUntil) return 0;
  if (day < l.injuredUntil) return INJURY_SPEED;
  return 1;
}

/** What a full day of each kind of work gives, before the hour's own bonuses. */
interface DayBase {
  qi: number;
  body: number;
  soul: number;
  study: number;
  /** The insight every waking hour leaves, whatever it went to. */
  trickle: number;
  practice: number;
}

function dayBase(c: Cultivator, day: number): DayBase {
  const m = stats(c);
  const apt = aptitudeMultiplier(c);
  const insight = realm(c.qi.realm).insightRate * apt * (1 + m.insightGain);
  // A ladder gains only with a method on it; until then it grows from the world alone.
  const art = (which: 'body' | 'soul', perDay: number, gain: number) =>
    ladderMethod(c, which)
      ? perDay * realmScale(c[which].realm) * apt * (1 + gain) * setbackMultiplier(c[which], day)
      : 0;
  return {
    qi: QI_PER_DAY * realmScale(c.qi.realm) * qiSpeed(c).total * setbackMultiplier(c.qi, day),
    body: art('body', BODY_PER_DAY, m.bodyGain),
    soul: art('soul', SOUL_PER_DAY, m.soulGain),
    study: INSIGHT_PER_STUDY_DAY * insight,
    trickle: INSIGHT_TRICKLE * insight,
    practice: c.practicing && canPractice(c, c.practicing) ? apt * (1 + m.practiceGain) : 0,
  };
}

/**
 * Whether an hour's work matches the hour's element: qi by the root's elements, body and soul by
 * their art's, if it carries one. Lightning and wind count as wood, ice as water. A ladder in its
 * tutorial layers ignores element hours.
 */
export function elementMatch(c: Cultivator, kind: HourKind, hour: number): boolean {
  const el = BRANCHES[hour]!.element;
  if (kind === 'qi') return !inTutorial(c.qi) && c.rootElements.some((e) => phaseOf(e) === el);
  if (kind === 'body' || kind === 'soul') {
    const art = ladderMethod(c, kind);
    return !!art?.element && !inTutorial(c[kind]) && phaseOf(art.element) === el;
  }
  return false;
}

export interface HourYield {
  hour: number;
  kind: HourKind;
  /** The bonuses on the hour's work, added together: its element, dawn's purple qi, discipline. */
  element: number;
  dawn: number;
  discipline: number;
  qi: number;
  body: number;
  soul: number;
  /** Study's stream, and the trickle every waking hour leaves. */
  insight: number;
  /** Practice days for the technique being practiced. */
  practice: number;
}

/** What each of the day's twelve hours gives: a twelfth of a day's work, with its bonuses. */
export function hourYields(c: Cultivator, day: number): HourYield[] {
  const base = dayBase(c, day);
  const discipline = followedRoutine(c) ? DISCIPLINE_BONUS : 0;
  return effectiveWheel(c).map((kind, hour) => {
    const y: HourYield = {
      hour,
      kind,
      element: 0,
      dawn: 0,
      discipline: 0,
      qi: 0,
      body: 0,
      soul: 0,
      insight: 0,
      practice: 0,
    };
    if (kind === 'sleep') return y;
    y.element = elementMatch(c, kind, hour) ? ELEMENT_BONUS : 0;
    y.dawn = kind === 'qi' && hour === DAWN_HOUR ? DAWN_BONUS : 0;
    y.discipline = discipline;
    const share = (1 + y.element + y.dawn + y.discipline) / HOURS_PER_DAY;
    y.insight = base.trickle / HOURS_PER_DAY;
    if (kind === 'qi') y.qi = base.qi * share;
    else if (kind === 'body') y.body = base.body * share;
    else if (kind === 'soul') y.soul = base.soul * share;
    else if (kind === 'study') y.insight += base.study * share;
    else y.practice = base.practice * share;
    return y;
  });
}

export interface DayRates {
  hours: HourYield[];
  /** Hours given to each kind of work. */
  count: Record<HourKind, number>;
  /** The learned routine the wheel follows exactly, which earns the discipline bonus. */
  routine: Routine | null;
  /** Fuel per full day, in qi units, before stones. */
  qi: number;
  body: number;
  soul: number;
  insight: number;
  /** Practice days a full day gives the technique being practiced; 0 when none can be. */
  practice: number;
  /** The most stones a full day can burn, and the qi each one adds. */
  stoneCap: number;
  qiPerStone: number;
}

/** What one full day of seclusion gives on the cultivator's wheel, on a given world day. */
export function dayRates(c: Cultivator, day: number): DayRates {
  const hours = hourYields(c, day);
  const count = Object.fromEntries(HOUR_KIND_IDS.map((k) => [k, 0])) as Record<HourKind, number>;
  const sum = { qi: 0, body: 0, soul: 0, insight: 0, practice: 0 };
  for (const h of hours) {
    count[h.kind]++;
    sum.qi += h.qi;
    sum.body += h.body;
    sum.soul += h.soul;
    sum.insight += h.insight;
    sum.practice += h.practice;
  }
  const qiScale = realmScale(c.qi.realm);
  const qiShare = count.qi / HOURS_PER_DAY;
  // Each stone adds a fifth of a full day of qi hours and a full day takes five, both scaled by the
  // realm curve, so a full burn doubles the day whatever the realm. Fewer qi hours, fewer stones.
  const stoneCap = sum.qi > 0 && c.plan.burnStones ? STONES_PER_QI_DAY * qiScale * qiShare : 0;
  const qiPerStone =
    stoneCap > 0 ? ((sum.qi / qiShare) * STONE_QI * (1 + stats(c).stoneQi)) / qiScale : 0;
  return { hours, count, routine: followedRoutine(c), ...sum, stoneCap, qiPerStone };
}

/** How long a setback lasts, after what nodes take off. */
function setbackDays(c: Cultivator, days: number): number {
  return days * Math.max(0, 1 + stats(c).setbackTime);
}

/** The share of the bar a failure costs, after what nodes save. */
function failLoss(c: Cultivator, loss: number): number {
  return loss * Math.max(0, 1 + stats(c).failLoss);
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
export function minorOdds(c: Cultivator, which: LadderId): number {
  const l = c[which];
  const step = nextStep(l);
  if (step.kind !== 'minor') return 0;
  const fill = barFill(l);
  if (fill < 1) return 0;
  const base = realm(l.realm).minorOdds[step.stage - 1] ?? 0.5;
  if (base >= 1) return 1;
  return Math.min(MAX_ODDS, base + overfillBonus(fill) + stats(c).minorOdds);
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
export function marginScore(c: Cultivator, which: LadderId, target: Realm): number {
  const barPart = clamp01((barFill(c[which]) - 1) / (BAR_CAP - 1));
  const threshold = target.insightThreshold;
  const insightPart =
    threshold > 0 ? clamp01((c.insight.earned / threshold - 1) / (INSIGHT_MARGIN_FULL - 1)) : 1;
  const others = LADDERS.filter((l) => l !== which).reduce(
    (sum, l) => sum + (realmIndex(c[l].realm) >= realmIndex(target.id) ? 1 : 0),
    0,
  );
  return barPart + insightPart + others;
}

/** Where a ladder stands against its next major breakthrough; null if its next step is minor. */
export function majorCheck(c: Cultivator, which: LadderId): MajorCheck | null {
  const l = c[which];
  const step = nextStep(l);
  if (step.kind !== 'major') return null;
  const target = realm(step.realm);
  const fill = barFill(l);
  // Body and soul gate items are settled with items and gear (D2); until then they need none.
  const gateItem = which === 'qi' ? target.gateItem : null;
  const gate = !gateItem || itemCount(c, gateItem) > 0;
  const insight = c.insight.earned >= target.insightThreshold;
  const cap = which === 'qi' || realmIndex(target.id) <= realmIndex(c.qi.realm) + 1;
  const bar = fill >= 1;
  const score = marginScore(c, which, target);
  const rare = ladderMethod(c, which)?.rare ?? false;
  const barPart = clamp01((fill - 1) / (BAR_CAP - 1));
  const odds = Math.min(
    MAX_ODDS,
    target.majorOdds +
      overfillBonus(fill) +
      MAJOR_ODDS_PER_MARGIN * (score - barPart) +
      stats(c).majorOdds,
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
export function autoWouldAttempt(c: Cultivator, which: LadderId): boolean {
  const l = c[which];
  if (nextStep(l).kind !== 'minor' || barFill(l) < 1) return false;
  const odds = minorOdds(c, which);
  const { minOdds } = AUTO_SETTINGS[c.plan.auto];
  if (minOdds === Infinity) return false;
  return odds >= minOdds || barFill(l) >= BAR_CAP - 1e-9;
}

// ---------------------------------------------------------------- breakthroughs

export interface BreakthroughResult {
  cultivator: Cultivator;
  /** False when the attempt wasn't allowed; the cultivator is unchanged. */
  attempted: boolean;
  success: boolean;
  major: boolean;
  grade?: GradeId;
  odds: number;
  notes: Note[];
}

/** "Layer 4", "Middle Foundation Establishment" or "Foundation Establishment". */
export function stepLabel(id: RealmId, stage: number): string {
  return stage === 1 && id !== 'qi-condensation'
    ? realm(id).name
    : `${stageName(id, stage)}${id === 'qi-condensation' ? '' : ` ${realm(id).name}`}`;
}

function withLadder(c: Cultivator, which: LadderId, l: Ladder): Cultivator {
  return { ...c, [which]: l };
}

/**
 * Attempts this ladder's next breakthrough, minor or major, drawing one roll from `ctx.rng`.
 * A major one needs the full check unless `lastChance` is set, which only drops the full bar and
 * caps the grade at flawed.
 */
export function attemptBreakthrough(
  c: Cultivator,
  which: LadderId,
  ctx: RuleContext,
  opts: { lastChance?: boolean } = {},
): BreakthroughResult {
  const l = c[which];
  const step = nextStep(l);
  const none = {
    cultivator: c,
    attempted: false,
    success: false,
    major: false,
    odds: 0,
    notes: [],
  };
  if (step.kind === 'top') return none;
  const { day, rng } = ctx;
  const name = LADDER_NAMES[which];

  if (step.kind === 'minor') {
    if (barFill(l) < 1) return none;
    const odds = minorOdds(c, which);
    const success = rng.next() < odds;
    const label = stepLabel(step.realm, step.stage);
    if (success) {
      return {
        cultivator: withLadder(c, which, { ...l, stage: step.stage, bar: 0 }),
        attempted: true,
        success,
        major: false,
        odds,
        notes: [
          {
            kind: 'breakthrough',
            text: which === 'qi' ? `Qi breaks through to ${label}.` : `${name} reaches ${label}.`,
          },
        ],
      };
    }
    const injured = realmIndex(l.realm) >= 1;
    return {
      cultivator: withLadder(c, which, {
        ...l,
        bar: l.bar * (1 - failLoss(c, MINOR_FAIL_LOSS)),
        unsettledUntil: day + setbackDays(c, UNSETTLED_DAYS),
        injuredUntil: injured
          ? Math.max(l.injuredUntil, day + setbackDays(c, MINOR_INJURY_DAYS))
          : l.injuredUntil,
      }),
      attempted: true,
      success,
      major: false,
      odds,
      notes: [
        {
          kind: 'setback',
          text: `The ${FUEL[which]} breaks against ${label} and scatters${injured ? ', leaving a light injury' : ''}.`,
        },
      ],
    };
  }

  const check = majorCheck(c, which)!;
  const last = opts.lastChance === true;
  const allowed = last ? check.insight && check.gate && check.cap && which === 'qi' : check.ready;
  if (!allowed) return none;
  const odds = last ? lastChanceOdds(c, check) : check.odds;
  const success = rng.next() < odds;
  let next = check.gateItem ? addItem(c, check.gateItem, -1) : c;
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
    const gradeName = GRADES.find((g) => g.id === grade)!.name.toLowerCase();
    const text =
      which === 'qi'
        ? `${last ? 'At the edge of death, ' : ''}${c.name} breaks through to ${target.name}: a ${gradeName} foundation.`
        : `${name} breaks through to ${target.name}, a ${gradeName} breakthrough.`;
    return {
      cultivator: next,
      attempted: true,
      success,
      major: true,
      grade,
      odds,
      notes: [{ kind: 'major', text }],
    };
  }
  next = withLadder(next, which, {
    ...l,
    bar: l.bar * (1 - failLoss(c, 1 - MAJOR_FAIL_KEEP)),
    injuredUntil: Math.max(l.injuredUntil, day + setbackDays(c, MAJOR_INJURY_DAYS)),
  });
  return {
    cultivator: next,
    attempted: true,
    success,
    major: true,
    odds,
    notes: [
      {
        kind: 'setback',
        text: `The breakthrough to ${target.name} fails${check.gateItem ? ', the pill wasted,' : ''} and leaves ${name.toLowerCase()} injured for years.`,
      },
    ],
  };
}

// ---------------------------------------------------------------- the lifespan edge

function lastChanceOdds(c: Cultivator, check: MajorCheck): number {
  return (check.target.majorOdds + stats(c).majorOdds) * Math.min(1, check.fill) * LAST_CHANCE_ODDS;
}

export interface LastChance {
  /** True when a last breakthrough can be tried: peak of the realm, the gate item, the insight. */
  possible: boolean;
  odds: number;
  /** Why not, when it isn't possible. */
  reason?: string;
}

/** What the lifespan edge offers: a major breakthrough below a full bar, at worse odds. */
export function lastChance(c: Cultivator): LastChance {
  const check = majorCheck(c, 'qi');
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
  return { possible: true, odds: check.bar ? check.odds : lastChanceOdds(c, check) };
}

// ---------------------------------------------------------------- the day step

function capBar(l: Ladder, bar: number): number {
  return Math.min(bar, barSize(l) * BAR_CAP);
}

/**
 * Adds fuel to a ladder's bar from the world, up to 150%: fights and hardship, baths and beast
 * blood for the body; epiphanies and contemplation for the soul. Cards and items call these.
 */
function fromWorld(c: Cultivator, which: LadderId, amount: number): Cultivator {
  if (amount <= 0) return c;
  return { ...c, [which]: { ...c[which], bar: capBar(c[which], c[which].bar + amount) } };
}

/** Tempering from the world, in the body bar's units; no art needed. */
export function temper(c: Cultivator, amount: number): Cultivator {
  return fromWorld(c, 'body', amount);
}

/** Nourishment from the world, in the soul bar's units; no art needed. */
export function nourish(c: Cultivator, amount: number): Cultivator {
  return fromWorld(c, 'soul', amount);
}

/**
 * Opens kinds of hour as the cultivator reaches them, flipping an hour to each by the default
 * rule, frees sleep at Foundation, and marks a gate reached, with a chronicle line each.
 */
export function checkUnlocks(c: Cultivator): { cultivator: Cultivator; notes: Note[] } {
  const opened = openHours(c);
  let next = opened.cultivator;
  const notes = [...opened.notes];
  const major = majorCheck(next, 'qi');
  if (major?.bar && major.insight && !hasFlag(next, `ready-${major.target.id}`)) {
    next = { ...next, flags: [...next.flags, `ready-${major.target.id}`] };
    notes.push({
      kind: 'unlock',
      text: major.gate
        ? `Qi presses against the gate of ${major.target.name}. The breakthrough waits on you.`
        : `Qi presses against the gate of ${major.target.name}, but you hold no ${major.target.gate.replace(/^an? /, '')}.`,
    });
  }
  return { cultivator: next, notes };
}

export interface CultivateResult {
  cultivator: Cultivator;
  notes: Note[];
  /** The breakthroughs the auto setting attempted, in order. */
  breakthroughs: { ladder: LadderId; success: boolean; major: boolean }[];
}

/**
 * A stretch of at most a day in seclusion: fills the bars, insight and practice from the wheel,
 * burns stones in qi hours, opens kinds of hour, and runs minor breakthroughs on the auto setting. Major breakthroughs are
 * always the cultivator's call and never happen here, online or off.
 */
export function cultivateDays(c: Cultivator, days: number, ctx: RuleContext): CultivateResult {
  if (days <= 0) return { cultivator: c, notes: [], breakthroughs: [] };
  const rates = dayRates(c, ctx.day);
  // No stones burn once the qi bar is at its cap: the qi would be lost.
  const capped = barFill(c.qi) >= BAR_CAP - 1e-9;
  const burned = capped ? 0 : Math.min(c.stones, rates.stoneCap * days);
  const qiGain = rates.qi * days + burned * rates.qiPerStone;
  let next: Cultivator = addPractice(
    {
      ...c,
      qi: { ...c.qi, bar: capBar(c.qi, c.qi.bar + qiGain) },
      body: { ...c.body, bar: capBar(c.body, c.body.bar + rates.body * days) },
      soul: { ...c.soul, bar: capBar(c.soul, c.soul.bar + rates.soul * days) },
      insight: {
        current: c.insight.current + rates.insight * days,
        earned: c.insight.earned + rates.insight * days,
      },
      stones: c.stones - burned,
    },
    rates.practice * days,
  );
  const unlocked = checkUnlocks(next);
  next = unlocked.cultivator;
  const notes = [...unlocked.notes];
  const breakthroughs: CultivateResult['breakthroughs'] = [];
  for (const which of LADDERS) {
    if (!autoWouldAttempt(next, which)) continue;
    const r = attemptBreakthrough(next, which, ctx);
    next = r.cultivator;
    notes.push(...r.notes);
    breakthroughs.push({ ladder: which, success: r.success, major: r.major });
  }
  return { cultivator: next, notes, breakthroughs };
}
