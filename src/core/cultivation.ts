// Cultivation rules (design § Cultivation, § Economy): what each hour of the day wheel yields, a
// ladder gaining only with a method on it, at the method's tier × rarity × mastery; methods
// climbing in mastery and fed their upkeep; insight from every hour and every mastery level; bars
// that fill past full; minor and major breakthroughs, the active method's bonuses, the growth each
// stage records and the grades; the last chance at the lifespan edge. Every rule takes a
// Cultivator, not the game, so NPCs and co-op guests run on the same code; randomness and the day
// come in as inputs. The constants live in src/content/cultivation.ts, and core/life.ts applies
// the results to the game.
import {
  AUTO_SETTINGS,
  BAR_CAP,
  BODY_PER_DAY,
  GRADES,
  GRADE_SCORES,
  INJURY_SPEED,
  INSIGHT_ATTENDED,
  INSIGHT_MARGIN_FULL,
  INSIGHT_PER_STUDY_DAY,
  INSIGHT_TRICKLE,
  CLASH_ROLL,
  LADDERS,
  LAST_CHANCE_ODDS,
  MAJOR_FAIL_KEEP,
  MAJOR_INJURY_DAYS,
  MAJOR_ODDS_PER_MARGIN,
  MAX_ODDS,
  MINOR_FAIL_LOSS,
  MINOR_INJURY_DAYS,
  ODDS_PER_TENTH,
  OFFER_INJURY,
  PEAK_MARGIN,
  QI_PER_DAY,
  SCENE_ODDS_CAP,
  SOUL_PER_DAY,
  STONE_QI,
  STONES_PER_QI_DAY,
  UNSETTLED_DAYS,
  type GradeId,
  type LadderId,
} from '../content/cultivation.ts';
import { stepLabel, type EventData } from '../content/chronicle.ts';
import { phaseOf } from '../content/elements.ts';
import { ALL_FIRSTS, type FirstId } from '../content/firsts.ts';
import {
  BRANCHES,
  DAWN_BONUS,
  DAWN_HOUR,
  NIGHT_HOURS,
  DISCIPLINE_BONUS,
  ELEMENT_BONUS,
  HOUR_KIND_IDS,
  HOURS_PER_DAY,
  type HourKind,
} from '../content/hours.ts';
import { METHOD_MASTERY, TECHNIQUE_MASTERY } from '../content/mastery.ts';
import { item } from '../content/items.ts';
import { method } from '../content/methods.ts';
import { rarity } from '../content/rarity.ts';
import {
  nextRealm,
  realm,
  realmIndex,
  realmScale,
  stepSize,
  type Realm,
  type RealmId,
} from '../content/realms.ts';
import { root } from '../content/roots.ts';
import type { Routine } from '../content/routines.ts';
import { technique } from '../content/techniques.ts';
import { AWAY, type Seat } from './attention.ts';
import { gradesOdds, gradesSpeed } from './grades.ts';
import { stageGrowth } from './growth.ts';
import { gainInsight, masteryBurst } from './insight.ts';
import { addReading } from './reading.ts';
import {
  addMethodPractice,
  breakthroughBonus,
  feedMethod,
  inTutorial,
  ladderMethod,
  methodCapped,
  methodFitSpeed,
  methodSpeed,
} from './methods.ts';
import { offerings, type Offerings } from './offerings.ts';
import type { Rng } from './rng.ts';
import { addItem, hasFlag, itemCount, realmOf, type Cultivator, type Ladder } from './state.ts';
import { aptitude, aptitudeMultiplier, stats } from './stats.ts';
import { addPractice, practiceShares, practicingNow } from './techniques.ts';
import { addToxicity, decayToxicity } from './toxicity.ts';
import { effectiveWheel, followedRoutine, openHours } from './wheel.ts';

export { aptitude, aptitudeMultiplier, inTutorial, LADDERS, stepLabel, type LadderId };

/**
 * An event for the chronicle, typed (content/chronicle.ts writes its text); core/life.ts dates it
 * and names the cultivator as its subject.
 */
export interface Note {
  type: string;
  data: EventData;
}

/**
 * What a rule needs from the world: the day, the random stream it may draw from, and the seat,
 * attended or away (core/attention.ts). Away when absent, which is offline time and every sim's
 * away row.
 */
export interface RuleContext {
  day: number;
  rng: Rng;
  seat?: Seat;
  /** The first times the lineage has done (core/firsts.ts); every one when not given. */
  firsts?: readonly FirstId[];
  /** Each hour's share of its work: a ride's jostled half (core/map/travel.ts); whole when not given. */
  hourFactor?: readonly number[];
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

// ---------------------------------------------------------------- grades

/** The grade of the major breakthrough that opened this ladder's realm; none below Foundation. */
export function currentGrade(l: Ladder): GradeId | undefined {
  return l.grades.at(-1);
}

/**
 * The grades' multiplier on the ladder's speed: the latest in full for the realm it opened, each
 * earlier one echoing at a third (core/grades.ts).
 */
export function gradeSpeed(l: Ladder): number {
  return gradesSpeed(l.grades);
}

/** What the grades add to the ladder's next major breakthrough's odds, echoes and all. */
export function gradeNextOdds(l: Ladder): number {
  return gradesOdds(l.grades);
}

// ---------------------------------------------------------------- rates

export interface QiSpeed {
  root: number;
  /** The method part: its tier bonus × rarity × mastery (core/methods.ts). */
  tier: number;
  rarity: number;
  mastery: number;
  fit: number;
  /** Qi density, 1 until abodes and spirit veins arrive in M4. */
  density: number;
  aptitude: number;
  /** Tree nodes' and the method's qi gain, as a multiplier. */
  nodes: number;
  /** Attention: ×1 away, ×1.25 for being there, up to ×2 at full focus (core/attention.ts). */
  attention: number;
  /** The grades on the qi ladder (D2.1): the latest ×0.85 flawed to ×1.35 heavenly, with echoes. */
  grade: number;
  /** The method's tier sits below the qi realm: it gains nothing until the next chapter. */
  capped: boolean;
  total: number;
}

/**
 * Root speed × the method (tier bonus × rarity × mastery) × fit × qi density × Aptitude × nodes ×
 * the realm's grade × attention. Zero without a qi method, or with one past its tier. Layers 1–3
 * ignore the root, the method part and the fit.
 */
export function qiSpeed(c: Cultivator, seat: Seat = AWAY): QiSpeed {
  const m = ladderMethod(c, 'qi');
  const apt = aptitudeMultiplier(c);
  const nodes = 1 + stats(c).qiGain;
  const part = methodSpeed(c, 'qi');
  const grade = gradeSpeed(c.qi);
  if (!m) {
    const none = { root: 0, tier: 0, rarity: 0, mastery: 0, fit: 0 };
    const attention = seat.factor;
    return { ...none, density: 1, aptitude: apt, nodes, attention, grade, capped: false, total: 0 };
  }
  const tutorial = inTutorial(c.qi);
  const rootSpeed = tutorial ? 1 : root(c.root).speed;
  const fit = tutorial ? 1 : methodFitSpeed(c, m);
  const density = 1;
  return {
    root: rootSpeed,
    tier: part.tier,
    rarity: part.rarity,
    mastery: part.mastery,
    fit,
    density,
    aptitude: apt,
    nodes,
    attention: seat.factor,
    grade,
    capped: part.capped,
    total: rootSpeed * part.total * fit * density * apt * nodes * grade * seat.factor,
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
  /** Study days a full day of study gives the copy being read: Aptitude, as comprehension. */
  studyDays: number;
  /** The insight every waking hour leaves, whatever it went to, and a second while attended. */
  trickle: number;
  /** Practice days a full day gives, before the slots split it and kinship lifts each share. */
  practice: number;
}

/**
 * What a full day of each kind of work gives. `unfed` names the ladders whose method's upkeep went
 * unpaid, which stall and gain nothing.
 */
function dayBase(c: Cultivator, day: number, unfed: readonly LadderId[], seat: Seat): DayBase {
  const m = stats(c);
  const apt = aptitudeMultiplier(c);
  const insight = realm(realmOf(c)).insightRate * apt * (1 + m.insightGain);
  const fed = (which: LadderId) => (unfed.includes(which) ? 0 : 1);
  // A ladder gains only with a method on it; until then it grows from the world alone. Body and
  // soul ignore the root, so their speed is the method part alone.
  const art = (which: 'body' | 'soul', perDay: number, gain: number) =>
    perDay *
    realmScale(c[which].realm) *
    methodSpeed(c, which).total *
    gradeSpeed(c[which]) *
    apt *
    (1 + gain) *
    setbackMultiplier(c[which], day) *
    fed(which);
  return {
    qi:
      QI_PER_DAY *
      realmScale(c.qi.realm) *
      qiSpeed(c, seat).total *
      setbackMultiplier(c.qi, day) *
      fed('qi'),
    body: art('body', BODY_PER_DAY, m.bodyGain),
    soul: art('soul', SOUL_PER_DAY, m.soulGain),
    study: INSIGHT_PER_STUDY_DAY * insight,
    studyDays: apt,
    // Circulating Thought grows the attended trickle with focus, half again at full.
    trickle:
      (INSIGHT_TRICKLE +
        (seat.attended
          ? INSIGHT_ATTENDED * (1 + m.circulatingThought * Math.min(1, seat.focus ?? 0))
          : 0)) *
      insight,
    practice: practicingNow(c).length > 0 ? apt * (1 + m.practiceGain) : 0,
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
  /** A method with night qi, in the night hours. */
  night: number;
  discipline: number;
  qi: number;
  body: number;
  soul: number;
  /** Study's stream, and the trickle every waking hour leaves. */
  insight: number;
  /** Practice days, before the slots split them and kinship lifts each share. */
  practice: number;
  /**
   * Study days for the copy being read (core/reading.ts): a study hour's share of a day × Aptitude,
   * before how well the copy suits you.
   */
  study: number;
}

/** What each of the day's twelve hours gives: a twelfth of a day's work, with its bonuses. */
export function hourYields(
  c: Cultivator,
  day: number,
  unfed: readonly LadderId[] = [],
  seat: Seat = AWAY,
  hourFactor?: readonly number[],
): HourYield[] {
  const base = dayBase(c, day, unfed, seat);
  const discipline = followedRoutine(c) ? DISCIPLINE_BONUS : 0;
  const night = stats(c).nightQi;
  return effectiveWheel(c).map((kind, hour) => {
    const y: HourYield = {
      hour,
      kind,
      element: 0,
      dawn: 0,
      night: 0,
      discipline: 0,
      qi: 0,
      body: 0,
      soul: 0,
      insight: 0,
      practice: 0,
      study: 0,
    };
    if (kind === 'sleep') return y;
    y.element = elementMatch(c, kind, hour) ? ELEMENT_BONUS : 0;
    y.dawn = kind === 'qi' && hour === DAWN_HOUR ? DAWN_BONUS : 0;
    y.night = kind === 'qi' && NIGHT_HOURS.includes(hour) ? night : 0;
    y.discipline = discipline;
    const share =
      ((1 + y.element + y.dawn + y.night + y.discipline) * (hourFactor?.[hour] ?? 1)) /
      HOURS_PER_DAY;
    y.insight = base.trickle / HOURS_PER_DAY;
    if (kind === 'qi') y.qi = base.qi * share;
    else if (kind === 'body') y.body = base.body * share;
    else if (kind === 'soul') y.soul = base.soul * share;
    else if (kind === 'study') {
      y.insight += base.study * share;
      y.study = base.studyDays * share;
    } else y.practice = base.practice * share;
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
  /** Practice days a full day gives, before the slots split it; 0 when no slot can practice. */
  practice: number;
  /** Practice days a full day gives each technique practiced: its share, lifted by its kinship. */
  practiceEach: Record<string, number>;
  /**
   * Study days a full day gives the copy being read, whether or not one is, before how well it
   * suits you (core/reading.ts, suitsYou).
   */
  study: number;
  /**
   * Practice days a full day gives each ladder's method: a twelfth for every hour cultivated with
   * it, none past its tier or on an unfed day.
   */
  methodPractice: Record<LadderId, number>;
  /** The ladders whose method stalls today, its upkeep unpaid. */
  unfed: LadderId[];
  /** The most stones a full day can burn, and the qi each one adds. */
  stoneCap: number;
  qiPerStone: number;
}

/**
 * What one full day of seclusion gives on the cultivator's wheel, on a given world day; `unfed`
 * names the ladders whose method's upkeep went unpaid, and `seat` whether you attend (away when
 * absent): attention multiplies the qi hours and leaves a second insight trickle.
 */
export function dayRates(
  c: Cultivator,
  day: number,
  unfed: readonly LadderId[] = [],
  seat: Seat = AWAY,
  hourFactor?: readonly number[],
): DayRates {
  const hours = hourYields(c, day, unfed, seat, hourFactor);
  const count = Object.fromEntries(HOUR_KIND_IDS.map((k) => [k, 0])) as Record<HourKind, number>;
  const sum = { qi: 0, body: 0, soul: 0, insight: 0, practice: 0, study: 0 };
  for (const h of hours) {
    count[h.kind]++;
    sum.qi += h.qi;
    sum.body += h.body;
    sum.soul += h.soul;
    sum.insight += h.insight;
    sum.practice += h.practice;
    sum.study += h.study;
  }
  const qiScale = realmScale(c.qi.realm);
  const qiShare = count.qi / HOURS_PER_DAY;
  // Each stone adds a fifth of a full day of qi hours and a full day takes five, both scaled by the
  // realm curve, so a full burn doubles the day whatever the realm. Fewer qi hours, fewer stones.
  const stoneCap = sum.qi > 0 && c.plan.burnStones ? STONES_PER_QI_DAY * qiScale * qiShare : 0;
  // Attention lifts what you draw from the air, not what a stone holds.
  const qiPerStone =
    stoneCap > 0
      ? ((sum.qi / seat.factor / qiShare) * STONE_QI * (1 + stats(c).stoneQi)) / qiScale
      : 0;
  const methodPractice = Object.fromEntries(
    LADDERS.map((which) => {
      const m = ladderMethod(c, which);
      const counts = m && !methodCapped(c, m) && !unfed.includes(which);
      return [which, counts ? count[which] / HOURS_PER_DAY : 0];
    }),
  ) as Record<LadderId, number>;
  return {
    hours,
    count,
    routine: followedRoutine(c),
    ...sum,
    practiceEach: practiceShares(c, sum.practice),
    methodPractice,
    unfed: [...unfed],
    stoneCap,
    qiPerStone,
  };
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
  const bonus = breakthroughBonus(c, which).odds;
  return clamp(base + overfillBonus(fill) + stats(c).minorOdds + bonus, 0, MAX_ODDS);
}

export interface MajorCheck {
  ladder: LadderId;
  target: Realm;
  fill: number;
  /** Each requirement, true when met. */
  bar: boolean;
  insight: boolean;
  /** Whether this major takes your realm into a new realm: then it needs its path's gate. */
  raises: boolean;
  /** The gate pill this major lays, or null: a ladder catching up below your realm needs none. */
  gateItem: string | null;
  gate: boolean;
  /** What the items laid on the attempt do, the gate pill among them. */
  offerings: Offerings;
  ready: boolean;
  /**
   * The margin you bring, 0 to 4, with what the active method's rarity adds (+0.25 at gold, +0.5
   * at red), and the grade it earns.
   */
  score: number;
  /** What the active method's rarity adds to the margin. */
  methodMargin: number;
  /** Every source of the score, for the grade meter; the parts sum to `score`. */
  parts: MarginPart[];
  /** Whether the grade may reach heavenly: a gold or better method or offering. */
  heavenly: boolean;
  grade: GradeId;
  /** What this ladder's grades add to these odds: the last major's in full, earlier ones echoing. */
  gradeOdds: number;
  odds: number;
}

/** One line of a major breakthrough's checklist. */
export interface Requirement {
  id: 'bar' | 'insight' | 'gate';
  met: boolean;
}

/**
 * The checklist a major breakthrough shows (P2.4): a full bar, the insight ever earned, and the
 * path's gate pill on a major that raises your realm (P3.2).
 */
export function majorRequirements(check: MajorCheck): Requirement[] {
  return [
    { id: 'bar', met: check.bar },
    { id: 'insight', met: check.insight },
    ...(check.gateItem ? [{ id: 'gate' as const, met: check.gate }] : []),
  ];
}

/** The grade a margin score earns; heavenly needs a gold or red method. */
export function gradeFor(score: number, heavenlyMethod: boolean): GradeId {
  let best: GradeId = 'flawed';
  for (const g of GRADES) {
    if (g.id === 'heavenly' && !heavenlyMethod) continue;
    if (score >= GRADE_SCORES[g.id]) best = g.id;
  }
  return best;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const clamp01 = (x: number) => clamp(x, 0, 1);

/** One source of a major breakthrough's margin, as the grade meter labels it. */
export interface MarginPart {
  source: LadderId | 'insight' | 'method' | 'talents' | 'offering';
  /** The item, for an offering. */
  item?: string;
  value: number;
}

/**
 * What another ladder brings to this one's major breakthrough (D2.1): half a point at the peak of
 * the realm being left, a full point once at the new realm or above.
 */
export function ladderMargin(other: Ladder, from: RealmId, target: Realm): number {
  if (realmIndex(other.realm) >= realmIndex(target.id)) return 1;
  if (other.realm === from && other.stage >= realm(from).stages) return PEAK_MARGIN;
  return 0;
}

/**
 * The margin a major breakthrough brings from where you stand (design § Cultivation, grades):
 * fuel past a full bar up to a point at 150%, insight earned past the threshold up to a point at
 * double it, and each other ladder by `ladderMargin`, in the order the meter draws them.
 */
export function standingMargin(c: Cultivator, which: LadderId, target: Realm): MarginPart[] {
  const barPart = clamp01((barFill(c[which]) - 1) / (BAR_CAP - 1));
  const threshold = target.insightThreshold;
  const insightPart =
    threshold > 0 ? clamp01((c.insight.earned / threshold - 1) / (INSIGHT_MARGIN_FULL - 1)) : 1;
  return [
    { source: which, value: barPart },
    { source: 'insight', value: insightPart },
    ...LADDERS.filter((l) => l !== which).map((l) => ({
      source: l,
      value: ladderMargin(c[l], c[which].realm, target),
    })),
  ];
}

/** The margin you bring, 0 to 4, before the method, talents and offerings. */
export function marginScore(c: Cultivator, which: LadderId, target: Realm): number {
  return standingMargin(c, which, target).reduce((sum, p) => sum + p.value, 0);
}

/**
 * Where a ladder stands against its next major breakthrough with these offerings laid (the gate
 * pill is laid on its own); null if its next step is minor.
 */
export function majorCheck(
  c: Cultivator,
  which: LadderId,
  chosen: readonly string[] = [],
): MajorCheck | null {
  const l = c[which];
  const step = nextStep(l);
  if (step.kind !== 'major') return null;
  const target = realm(step.realm);
  const fill = barFill(l);
  // The major that raises your realm needs its path's gate; a ladder catching up below your realm
  // climbs on its fuel alone, so leading costs a gate and catching up stays cheap.
  const raises = realmIndex(target.id) > realmIndex(realmOf(c));
  const gateItem: string | null = raises ? target.gates[which] : null;
  const gate = !gateItem || itemCount(c, gateItem) > 0;
  const laid = offerings(c, which, chosen, gate ? gateItem : null);
  const insight = c.insight.earned >= target.insightThreshold;
  const bar = fill >= 1;
  const standing = standingMargin(c, which, target);
  const brought = standing.reduce((sum, p) => sum + p.value, 0);
  const bonus = breakthroughBonus(c, which);
  const m = ladderMethod(c, which);
  const heavenly = (m ? rarity(m.rarity).heavenly : false) || laid.heavenly;
  const barPart = standing[0]!.value;
  const gradeOdds = gradeNextOdds(l);
  const odds = clamp(
    target.majorOdds +
      overfillBonus(fill) +
      MAJOR_ODDS_PER_MARGIN * (brought - barPart) +
      stats(c).majorOdds +
      bonus.odds +
      gradeOdds +
      laid.odds,
    0,
    MAX_ODDS,
  );
  // Talents like the Unbreakable Dao Heart or Heaven's Jealousy raise the grade, not the odds.
  const talents = stats(c).gradeMargin;
  const parts: MarginPart[] = [
    ...standing,
    { source: 'method', value: bonus.margin },
    { source: 'talents', value: talents },
    ...laid.laid.map((id, i) => ({
      source: 'offering' as const,
      item: id,
      value: laid.margins[i] ?? 0,
    })),
  ];
  const score = brought + bonus.margin + talents + laid.margin;
  return {
    ladder: which,
    target,
    fill,
    bar,
    insight,
    raises,
    gateItem,
    gate,
    offerings: laid,
    ready: bar && insight && gate && laid.valid,
    score,
    methodMargin: bonus.margin,
    parts,
    heavenly,
    grade: gradeFor(score, heavenly),
    gradeOdds,
    odds,
  };
}

/**
 * The odds with an attended scene's bonus (core/scene.ts): never past the scene's cap or the
 * odds' own ceiling, and a step that always holds stays certain.
 */
export function sceneOdds(odds: number, bonus: number): number {
  if (odds >= 1) return 1;
  return Math.min(MAX_ODDS, odds + clamp(bonus, 0, SCENE_ODDS_CAP));
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

function withLadder(c: Cultivator, which: LadderId, l: Ladder): Cultivator {
  return { ...c, [which]: l };
}

/**
 * The ladder after climbing to a new stage: an empty bar, and the stage's growth recorded from
 * the method active at the attempt, a white method's when none is.
 */
function climbed(c: Cultivator, which: LadderId, l: Ladder, realmId: RealmId, stage: number) {
  const m = ladderMethod(c, which);
  const record = stageGrowth(m, m ? methodFitSpeed(c, m) : 1, which, realmId, stage);
  return { ...l, realm: realmId, stage, bar: 0, growth: [...l.growth, record] };
}

/** What a failure costs the bar, after nodes; a red method keeps the bar whole. */
function failedBar(c: Cultivator, which: LadderId, l: Ladder, loss: number): number {
  return breakthroughBonus(c, which).keepBar ? l.bar : l.bar * (1 - failLoss(c, loss));
}

/** How long a failure's injury lasts, after nodes and the method's mercy. */
function injuryDays(c: Cultivator, which: LadderId, days: number): number {
  return setbackDays(c, days) * breakthroughBonus(c, which).injury;
}

/**
 * Attempts this ladder's next breakthrough, minor or major, drawing one roll from `ctx.rng`.
 * A major one needs the full check unless `lastChance` is set, which only drops the full bar and
 * caps the grade at flawed. `scene` is what an attended attempt's scene added to the odds
 * (`sceneOdds` caps it); the roll is the same one either way. The last chance plays no scene and
 * lays the gate pill alone. A major attempt spends its `offerings` and the gate pill either way.
 */
export function attemptBreakthrough(
  c: Cultivator,
  which: LadderId,
  ctx: RuleContext,
  opts: { lastChance?: boolean; scene?: number; offerings?: readonly string[] } = {},
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

  if (step.kind === 'minor') {
    if (barFill(l) < 1) return none;
    const odds = sceneOdds(minorOdds(c, which), opts.scene ?? 0);
    const success = rng.next() < odds;
    if (success) {
      return {
        cultivator: withLadder(c, which, climbed(c, which, l, step.realm, step.stage)),
        attempted: true,
        success,
        major: false,
        odds,
        notes: [
          {
            type: 'breakthrough',
            data: { ladder: which, realm: step.realm, stage: step.stage },
          },
        ],
      };
    }
    const injured = realmIndex(l.realm) >= 1;
    return {
      cultivator: withLadder(c, which, {
        ...l,
        bar: failedBar(c, which, l, MINOR_FAIL_LOSS),
        unsettledUntil: day + setbackDays(c, UNSETTLED_DAYS),
        injuredUntil: injured
          ? Math.max(l.injuredUntil, day + injuryDays(c, which, MINOR_INJURY_DAYS))
          : l.injuredUntil,
      }),
      attempted: true,
      success,
      major: false,
      odds,
      notes: [
        {
          type: 'setback',
          data: { ladder: which, realm: step.realm, stage: step.stage, injured },
        },
      ],
    };
  }

  const last = opts.lastChance === true;
  const check = majorCheck(c, which, last ? [] : (opts.offerings ?? []))!;
  const allowed = last ? check.raises && check.insight && check.gate : check.ready;
  if (!allowed) return none;
  const odds = last ? lastChanceOdds(c, check) : sceneOdds(check.odds, opts.scene ?? 0);
  const roll = rng.next();
  // Two surging offerings clash: a natural 1 fails whatever the odds.
  const clashed = check.offerings.clash && roll >= CLASH_ROLL;
  const success = roll < odds && !clashed;
  const laid = check.offerings;
  let next = laid.laid.reduce((acc, id) => addItem(acc, id, -1), c);
  if (laid.detox > 0) next = addToxicity(next, -laid.detox);
  const target = check.target;
  if (success) {
    const grade: GradeId = last ? 'flawed' : check.grade;
    next = withLadder(next, which, {
      ...climbed(c, which, l, target.id, 1),
      grades: [...l.grades, grade],
    });
    const notes: Note[] = [
      { type: 'major', data: { ladder: which, realm: target.id, grade, lastChance: last } },
    ];
    // The old method runs out at its tier: the ladder waits on the next chapter or a new method.
    const m = ladderMethod(next, which);
    if (m && methodCapped(next, m)) {
      notes.push({ type: 'method-capped', data: { ladder: which, method: m.id } });
    }
    return { cultivator: next, attempted: true, success, major: true, grade, odds, notes };
  }
  const injury = injuryDays(c, which, MAJOR_INJURY_DAYS) * (laid.purifying ? OFFER_INJURY : 1);
  next = withLadder(next, which, {
    ...l,
    bar: laid.guarding ? l.bar : failedBar(c, which, l, 1 - MAJOR_FAIL_KEEP),
    injuredUntil: Math.max(l.injuredUntil, day + injury),
  });
  return {
    cultivator: next,
    attempted: true,
    success,
    major: true,
    odds,
    notes: [
      {
        type: 'major-setback',
        data: {
          ladder: which,
          realm: target.id,
          gateItem: !!check.gateItem,
          offerings: laid.laid.length - (check.gateItem ? 1 : 0),
        },
      },
    ],
  };
}

// ---------------------------------------------------------------- the lifespan edge

function lastChanceOdds(c: Cultivator, check: MajorCheck): number {
  const base =
    check.target.majorOdds +
    stats(c).majorOdds +
    breakthroughBonus(c, check.ladder).odds +
    check.gradeOdds;
  return Math.max(0, base) * Math.min(1, check.fill) * LAST_CHANCE_ODDS;
}

export interface LastChance {
  /** True when a last breakthrough can be tried: peak of the realm, the gate item, the insight. */
  possible: boolean;
  /** The ladder it is tried on: one whose major would raise your realm, the best odds first. */
  ladder: LadderId;
  odds: number;
  /** Why not, when it isn't possible. */
  reason?: string;
}

/**
 * What the lifespan edge offers: a major breakthrough below a full bar, at worse odds, on any
 * ladder whose major would raise your realm, laying that path's gate (P3.2).
 */
export function lastChance(c: Cultivator): LastChance {
  const checks = LADDERS.map((which) => majorCheck(c, which)).filter(
    (m): m is MajorCheck => m !== null && m.raises,
  );
  const first = checks[0];
  if (!first) {
    return {
      possible: false,
      ladder: 'qi',
      odds: 0,
      reason: 'No ladder stands at the peak of your realm.',
    };
  }
  let best: LastChance | null = null;
  for (const check of checks) {
    if (!check.gate || !check.insight) continue;
    // A full bar makes it an ordinary attempt, at its ordinary odds.
    const odds = check.bar ? check.odds : lastChanceOdds(c, check);
    if (!best || odds > best.odds) best = { possible: true, ladder: check.ladder, odds };
  }
  if (best) return best;
  if (!first.gate && first.gateItem) {
    return {
      possible: false,
      ladder: first.ladder,
      odds: 0,
      reason: `You hold no ${item(first.gateItem).name}.`,
    };
  }
  return {
    possible: false,
    ladder: first.ladder,
    odds: 0,
    reason: 'Your insight falls short of the threshold.',
  };
}

// ---------------------------------------------------------------- the day step

function capBar(l: Ladder, bar: number): number {
  return Math.min(bar, barSize(l) * BAR_CAP);
}

/**
 * Adds fuel to a ladder's bar from the world, up to 150%: fights and hardship, baths and beast
 * blood for the body; epiphanies and contemplation for the soul. Cards and items call these.
 */
export function fromWorld(c: Cultivator, which: LadderId, amount: number): Cultivator {
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
export function checkUnlocks(
  c: Cultivator,
  firsts: readonly FirstId[] = ALL_FIRSTS,
): { cultivator: Cultivator; notes: Note[] } {
  const opened = openHours(c, firsts);
  let next = opened.cultivator;
  const notes = [...opened.notes];
  // The first ladder to stand ready at the gate of a new realm marks it, once.
  for (const which of LADDERS) {
    const major = majorCheck(next, which);
    if (!major?.raises || !major.bar || !major.insight) continue;
    if (hasFlag(next, `ready-${major.target.id}`)) break;
    next = { ...next, flags: [...next.flags, `ready-${major.target.id}`] };
    notes.push({ type: 'gate', data: { realm: major.target.id, gate: major.gate, ladder: which } });
    break;
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
 * Practice for a stretch: each technique practiced and each ladder's method climb in
 * mastery, and every level reached releases a burst of insight, with a chronicle line.
 */
function practiceDays(c: Cultivator, rates: DayRates, days: number) {
  const notes: Note[] = [];
  const each = Object.fromEntries(
    Object.entries(rates.practiceEach).map(([id, perDay]) => [id, perDay * days]),
  );
  const practiced = addPractice(c, each);
  let next = practiced.cultivator;
  for (const { technique: id, level } of practiced.levels) {
    const t = technique(id);
    next = gainInsight(next, masteryBurst(next, TECHNIQUE_MASTERY, t.tier, level));
    notes.push({ type: 'mastery', data: { technique: t.id, level } });
  }
  for (const which of LADDERS) {
    const id = c.activeMethods[which];
    if (!id || rates.methodPractice[which] <= 0) continue;
    const r = addMethodPractice(next, id, rates.methodPractice[which] * days);
    next = r.cultivator;
    for (const level of r.levels) {
      const m = method(id);
      next = gainInsight(next, masteryBurst(next, METHOD_MASTERY, m.tier, level));
      notes.push({ type: 'mastery', data: { method: m.id, level } });
    }
  }
  return { cultivator: next, notes };
}

/**
 * A stretch of at most a day in seclusion: sheds pill toxicity, pays methods' upkeep, fills the
 * bars, insight and mastery from the wheel, burns stones in qi hours, opens kinds of hour, and
 * runs minor breakthroughs on the auto setting. Major breakthroughs are always the cultivator's call and
 * never happen here, online or off.
 */
export function cultivateDays(c: Cultivator, days: number, ctx: RuleContext): CultivateResult {
  if (days <= 0) return { cultivator: c, notes: [], breakthroughs: [] };
  // A method that drinks an upkeep is paid first, a day at a time, on the days its ladder has
  // hours; an unfed one stalls, gaining nothing.
  let fed = decayToxicity(c, days);
  const unfed: LadderId[] = [];
  const wheel = effectiveWheel(c);
  for (const which of LADDERS) {
    if (!wheel.includes(which)) continue;
    const r = feedMethod(fed, which, ctx.day, days);
    fed = r.cultivator;
    if (!r.fed) unfed.push(which);
  }
  const rates = dayRates(fed, ctx.day, unfed, ctx.seat ?? AWAY, ctx.hourFactor);
  // No stones burn once the qi bar is at its cap: the qi would be lost.
  const capped = barFill(fed.qi) >= BAR_CAP - 1e-9;
  const burned = capped ? 0 : Math.min(fed.stones, rates.stoneCap * days);
  const qiGain = rates.qi * days + burned * rates.qiPerStone;
  const practiced = practiceDays(
    gainInsight(
      {
        ...fed,
        qi: { ...fed.qi, bar: capBar(fed.qi, fed.qi.bar + qiGain) },
        body: { ...fed.body, bar: capBar(fed.body, fed.body.bar + rates.body * days) },
        soul: { ...fed.soul, bar: capBar(fed.soul, fed.soul.bar + rates.soul * days) },
        stones: fed.stones - burned,
      },
      rates.insight * days,
    ),
    rates,
    days,
  );
  // The study hours read the copy set on them, finishing it once its study days are in.
  const firsts = ctx.firsts ?? ALL_FIRSTS;
  const read = addReading(practiced.cultivator, rates.study * days, firsts);
  const unlocked = checkUnlocks(read.cultivator, firsts);
  let next = unlocked.cultivator;
  const notes = [...practiced.notes, ...read.notes, ...unlocked.notes];
  const breakthroughs: CultivateResult['breakthroughs'] = [];
  // At the figure, a breakthrough is the player's scene: the auto setting leaves the steps that
  // always hold to it, since they teach the scene, and the ladder a scene plays on alone.
  const hold = ctx.seat?.scene;
  const playing = hold === 'playing' ? (ctx.seat?.sceneLadder ?? 'qi') : null;
  for (const which of LADDERS) {
    if (!autoWouldAttempt(next, which)) continue;
    if (which === playing || (hold && minorOdds(next, which) >= 1)) continue;
    const r = attemptBreakthrough(next, which, ctx);
    next = r.cultivator;
    notes.push(...r.notes);
    breakthroughs.push({ ladder: which, success: r.success, major: r.major });
  }
  return { cultivator: next, notes, breakthroughs };
}
