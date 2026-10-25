// The yearly inner trial, its pills, and the gifts a hall has handed out.
import { DAYS_PER_MONTH, DAYS_PER_YEAR } from '../../content/calendar.ts';
import { INNER_TRIAL, YEARS_PILLS } from '../../content/organizations.ts';
import { realmSizeOf, sizeAt, actorFromCultivator } from '../resolver/actor.ts';
import { verdict, type Verdict } from '../resolver/check.ts';
import { type World } from '../resolver/world.ts';
import { gainItem } from '../map/ground.ts';
import { addEvent, type GameState } from '../state.ts';
import { cultivator, fullCultivators, giveTo, heldOf, realmStageOf } from '../who.ts';
import { organization, houseOf } from './identity.ts';
import { seatRanges, rank, seatOf, setSeat } from './seats.ts';
import { membership } from './membership.ts';

export function yearOf(day: number): number {
  return Math.floor(day / DAYS_PER_YEAR);
}

export function monthOfYear(day: number): number {
  return Math.floor((((day % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR) / DAYS_PER_MONTH) + 1;
}

export { realmStageOf } from '../who.ts';

type TrialResult =
  | { ok: false; why: string }
  | {
      ok: true;
      verdict: Verdict;
      passed: boolean;
      yours: number;
      theirs: number;
      /** Your place in the year's ranking, 1 the first, and whether it took one of the year's pills. */
      rank: number;
      pill: boolean;
      state: GameState;
    };

/**
 * Someone's size at a test or the trial: your strongest ladder through your wounds, a cast
 * member's realm.
 */
export function trialSize(s: GameState, who: string): number {
  return cultivator(s, who) ? realmSizeOf(actorFromCultivator(s)) : sizeAt(realmStageOf(s, who));
}

/**
 * The yearly inner trial (design § Seats and the currency; O1's talk): held in the first month,
 * one try a year, by an outer disciple. Their strongest ladder through their wounds faces the size
 * of the outer seat's top stage, and close or better wins the inner seat. A capability against a
 * number, never a roll. The cast's outer members sit it as the first month turns (N1).
 */
export function innerTrial(s: GameState, who: string, power: string): TrialResult {
  const house = houseOf(power);
  const m = membership(s.world, who, house);
  if (!m) return { ok: false, why: 'Only their own sit the trial.' };
  const day = s.calendar.day;
  const r = realmStageOf(s, who);
  const seat = seatOf(s.world, who, house, r)!;
  if (seat !== 'outer') return { ok: false, why: 'The trial is for outer disciples.' };
  if (monthOfYear(day) !== INNER_TRIAL.month)
    return { ok: false, why: 'The trial is held in the first month.' };
  if (m.tried === yearOf(day)) return { ok: false, why: 'You sat it this year.' };
  const yours = trialSize(s, who);
  const you = !!cultivator(s, who);
  const theirs = sizeAt(seatRanges(house).outer.to);
  const v = verdict(yours, theirs);
  const passed = v === 'clear' || (v === 'close' && INNER_TRIAL.pass === 'close');
  let world: World = {
    ...s.world,
    members: s.world.members.map((x) =>
      x === m ? { ...x, tried: yearOf(day), ...(passed ? { won: true } : {}) } : x,
    ),
  };
  if (passed) world = setSeat(world, who, house, 'inner');
  // Investment: the year's Foundation Pills go down the ranking to those who passed; an equal
  // ranks ahead of you, as the senior.
  const rank = 1 + trialField(s, house, who).filter((size) => size >= yours).length;
  const pill = passed && rank <= yearsPills(house);
  let state: GameState = { ...s, world };
  if (you)
    state = addEvent(state, 'power', {
      power: house,
      what: passed ? 'trial-passed' : 'trial-short',
    });
  if (pill) {
    const held = heldOf(state, who, YEARS_PILLS.pill);
    state = giveTo(state, who, YEARS_PILLS.pill, 1, (st, i, n) => gainItem(st, i, n).state);
    if (you) {
      state = { ...state, world: addGiven(state.world, house, YEARS_PILLS.pill, 1, held) };
      state = addEvent(state, 'power', { power: house, what: 'pill' });
    }
  }
  return { ok: true, verdict: v, passed, yours, theirs, rank, pill, state };
}

/**
 * How many Foundation Pills a power hands down its trial's ranking a year (O3's talk): one for
 * every thousand Qi Condensation cultivators it counts, at least one and at most ten.
 */
export function yearsPills(power: string): number {
  const qi = organization(houseOf(power)).row.population?.qi ?? 0;
  return Math.max(YEARS_PILLS.min, Math.min(YEARS_PILLS.max, Math.round(qi / YEARS_PILLS.per)));
}

/**
 * Who else the year's trial ranks: the people the world keeps of the power with a realm in its
 * outer seat, by their size, and you when you hold its outer seat and someone else sits (N1: one
 * ranking for every outer member). The world keeps no roster of the rest (O3's talk).
 */
function trialField(s: GameState, power: string, who: string): number[] {
  const house = houseOf(power);
  const top = seatRanges(house).outer.to;
  const field = Object.entries(s.world.kept)
    .filter(([id, k]) => id !== who && k.realm && houseOf(k.power ?? '') === house)
    .filter(([id]) => s.world.people[id] !== 'dead')
    .filter(([, k]) => rank(k.realm!) <= rank(top))
    .map(([, k]) => sizeAt(k.realm!));
  for (const c of fullCultivators(s)) {
    if (c.id !== who && seatOf(s.world, c.id, house, realmStageOf(s, c.id)) === 'outer')
      field.push(trialSize(s, c.id));
  }
  return field;
}

/** What a power handed someone of a thing: its gift, never bought back at its own hall. */
export function givenBy(w: World, power: string, thing: string): number {
  return w.given?.[houseOf(power) + '|' + thing] ?? 0;
}

/**
 * Counts a gift. What it gave before counts only as far as you still hold the thing (`held`, before
 * this gift), so gifts used up never make the hall refuse the ones you bought.
 */
export function addGiven(w: World, power: string, thing: string, n: number, held: number): World {
  const key = houseOf(power) + '|' + thing;
  const kept = Math.min(w.given?.[key] ?? 0, held);
  return { ...w, given: { ...w.given, [key]: kept + n } };
}
