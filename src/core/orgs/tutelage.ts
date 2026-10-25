// What an elder’s time buys: lessons and a protector at a breakthrough.
import { didDeed } from '../journal.ts';
import { ELDER_TIME } from '../../content/organizations.ts';
import { realm, realmScale, type RealmId } from '../../content/realms.ts';
import { INSIGHT_PER_STUDY_DAY } from '../../content/cultivation.ts';
import { insightMultiplier, gainInsight } from '../insight.ts';
import { type Member, type World } from '../resolver/world.ts';
import { realmOf, type Cultivator, type GameState } from '../state.ts';
import { cultivator, withCultivator } from '../who.ts';
import { organization, houseOf } from './identity.ts';
import { membership, membershipsOf } from './membership.ts';
import { addBalance, monthIndex } from './contribution.ts';

/** An elder's time in the power's currency, on the realm curve by the buyer's realm (O3's talk). */
export function elderPrice(kind: keyof typeof ELDER_TIME, r: RealmId): number {
  return ELDER_TIME[kind].points * realmScale(r);
}

type Bought = { ok: true; state: GameState } | { ok: false; why: string };

/** A member, not a guest, with the points for an elder's time. */
function buyer(s: GameState, who: string, power: string, price: number): Member | string {
  const m = membership(s.world, who, houseOf(power));
  if (!m || m.guest) return 'Only their own buy an elder’s time.';
  if (m.balance < price) return `You haven’t the ${organization(m.power).preset.currency.name}.`;
  return m;
}

/** The insight an elder's lesson gives a cultivator: three days of their own study's. */
export function lessonInsight(c: Cultivator): number {
  return (
    INSIGHT_PER_STUDY_DAY *
    realm(realmOf(c)).insightRate *
    insightMultiplier(c) *
    ELDER_TIME.lesson.studyDays
  );
}

/** A membership changed in place. */
export function withMember(w: World, m: Member, change: Partial<Member>): World {
  return {
    ...w,
    members: w.members.map((x) =>
      x.who === m.who && x.power === m.power ? { ...x, ...change } : x,
    ),
  };
}

/**
 * An elder's lesson (design: any member buys an elder's time with contribution, insight hours):
 * a day of their teaching, worth three days of your own study, one a month.
 */
export function takeLesson(s: GameState, who: string, power: string): Bought {
  // A lesson is taken into study, which only a full cultivator keeps (N1).
  const c = cultivator(s, who);
  if (!c) return { ok: false, why: 'Only a cultivator at their own study takes a lesson.' };
  const price = elderPrice('lesson', realmOf(c));
  const m = buyer(s, who, power, price);
  if (typeof m === 'string') return { ok: false, why: m };
  const month = monthIndex(s.calendar.day);
  if (m.taught === month) return { ok: false, why: 'An elder has taught you this month.' };
  const taught = gainInsight(c, lessonInsight(c));
  const world = withMember(addBalance(s.world, m.who, m.power, -price), m, { taught: month });
  return { ok: true, state: didDeed({ ...withCultivator(s, taught), world }, 'lesson') };
}

/**
 * An elder as protector 护法 at your next breakthrough (design: +5% to the odds and a failure
 * softened a step): paid now, standing by until you next attempt one.
 */
export function engageProtector(s: GameState, who: string, power: string): Bought {
  // A protector stands by a breakthrough, which only a full cultivator attempts yet (N1).
  const c = cultivator(s, who);
  if (!c)
    return { ok: false, why: 'Only a cultivator at their own breakthrough asks a protector.' };
  const price = elderPrice('protector', realmOf(c));
  const m = buyer(s, who, power, price);
  if (typeof m === 'string') return { ok: false, why: m };
  if (protectorOf(s, who)) return { ok: false, why: 'An elder already stands by you.' };
  const world = withMember(addBalance(s.world, m.who, m.power, -price), m, { protector: true });
  return { ok: true, state: { ...s, world } };
}

/** The power whose elder stands by someone's next breakthrough, if any. */
export function protectorOf(s: GameState, who: string): string | null {
  return membershipsOf(s.world, who).find((m) => m.protector)?.power ?? null;
}

/** A protector's watch is over once the breakthrough is tried, whatever came of it. */
export function protectorSpent(s: GameState, who: string): GameState {
  const power = protectorOf(s, who);
  const m = power ? membership(s.world, who, power) : undefined;
  return m ? { ...s, world: withMember(s.world, m, { protector: false }) } : s;
}
