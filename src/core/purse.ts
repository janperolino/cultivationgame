// The purse (design § Economy, Stones, silver and shops in play): stones held by grade, each its
// own count, and silver as the mortal purse. A price reads in the largest grade that reads cleanly
// ("2.4 mid"); paying it in a lower grade costs the premium a step (1,200 a stone above), and a
// shop breaks a higher stone into 1,100 of the grade below to make change. A money changer does
// the same for a fee-free count, and turns stones to silver and back. What you are paid arrives as
// the payer counts it, never above the payer's grade, and burning drinks your realm's grade and
// the grades below but never breaks a higher stone. Nothing here reads the world: it is the
// arithmetic every shop, toll, wage and qi hour uses.
import {
  DOWN_GIVES,
  GRADE_BY_TIER,
  GRADE_FACE,
  GRADES,
  SILVER_TO_STONE,
  STONE_TO_SILVER,
  UP_COST,
  type Grade,
} from '../content/money.ts';
import { realmIndex, type RealmId } from '../content/realms.ts';
import type { Cultivator } from './state.ts';

/**
 * Every grade's count, low first. Any may be fractional: qi hours burn by the hour, and a stone
 * part drunk is kept as a fraction of its grade.
 */
export type Stones = [low: number, mid: number, high: number, top: number];

export function stonesOf(c: Pick<Cultivator, 'stones' | 'higherStones'>): Stones {
  return [c.stones, c.higherStones.mid, c.higherStones.high, c.higherStones.top];
}

export function withStones<C extends Pick<Cultivator, 'stones' | 'higherStones'>>(
  c: C,
  s: Stones,
): C {
  return { ...c, stones: s[0], higherStones: { mid: s[1], high: s[2], top: s[3] } };
}

/** The grade a purse at a tier deals in: a realm's (tier n is realm n) or a vein's, 0 for none. */
export function tierGrade(tier: number): number {
  return GRADE_BY_TIER[Math.max(0, Math.min(GRADE_BY_TIER.length - 1, Math.round(tier)))]!;
}

/** The grade a cultivator at a realm holds, burns and pays out in. */
export function realmGrade(realm: RealmId): number {
  return tierGrade(realmIndex(realm) + 1);
}

/** The purse's worth in low-grade stones at face, every grade and part-drunk stone counted. */
export function worthOf(s: Stones): number {
  return s.reduce((sum, n, g) => sum + n * GRADE_FACE ** g, 0);
}

/** The grade a price is posted in: the largest one it is at least a whole stone of. */
export function postedGrade(price: number): number {
  let g = 0;
  while (g < GRADES.length - 1 && price >= GRADE_FACE ** (g + 1)) g++;
  return g;
}

function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
}

/** A price in words, in its posted grade: "40 low", "2.4 mid". */
export function priceWords(price: number): string {
  const g = postedGrade(price);
  const n = price / GRADE_FACE ** g;
  return `${trim(Math.round(n * 10) / 10)} ${GRADES[g]}`;
}

/**
 * A grade's count as the purse shows it: low in whole stones, a higher grade to a tenth, so a
 * stone part drunk reads "2.3 mid".
 */
export function gradeCount(s: Stones, g: number): number {
  return g === 0 ? Math.floor(s[0] + EPS) : Math.floor(s[g]! * 10 + EPS) / 10;
}

/** The stones in words, largest grade first: "2.3 mid · 240 low", "0 low" when empty. */
export function stonesWords(s: Stones, count: (n: number) => string = String): string {
  const parts: string[] = [];
  for (let g = GRADES.length - 1; g >= 0; g--) {
    const n = gradeCount(s, g);
    if (n > 0) parts.push(`${count(n)} ${GRADES[g]}`);
  }
  return parts.length ? parts.join(' · ') : `${count(0)} low`;
}

/** The purse in words, largest grade first: "3 mid · 240 low · 85 taels". */
export function purseWords(c: Pick<Cultivator, 'stones' | 'higherStones' | 'silver'>): string {
  const words = stonesWords(stonesOf(c));
  return c.silver > 0 ? `${words} · ${Math.floor(c.silver)} taels` : words;
}

const EPS = 1e-9;

/** Every count rounded clean of float dust, so tenths of a stone never leave 0.9999… for a 1. */
function clean(s: Stones): Stones {
  return s.map((n) => Math.max(0, Math.round(n * 1e6) / 1e6)) as Stones;
}

/**
 * The purse after paying a price in low-grade stones, or null when it can't be paid: the posted
 * grade's whole stones first, then each grade below at the premium a step, then a higher stone
 * broken to make change, as often as it takes. A stone part drunk pays at what is left in it, but
 * only a whole stone breaks.
 */
export function pay(s: Stones, price: number): Stones | null {
  if (price <= 0) return [...s] as Stones;
  const g = postedGrade(price);
  const out = [...s] as Stones;
  // What is still owed, in stones of the posted grade.
  let owed = price / GRADE_FACE ** g;
  for (let guard = 0; guard < 64; guard++) {
    for (let j = g; j >= 0 && owed > EPS; j--) {
      // One stone of grade j covers this much of the posted grade.
      const covers = j === g ? 1 : 1 / UP_COST ** (g - j);
      const want = owed / covers;
      // Whole stones of a higher grade, so no change is owed back, and the part-drunk one at what
      // is left in it when that is no more than the rest owed.
      const whole = Math.floor(want + EPS);
      const use =
        j === 0
          ? Math.min(out[0], want)
          : Math.min(out[j]!, whole + Math.min(out[j]! % 1, want - whole));
      out[j] = out[j]! - use;
      owed -= use * covers;
    }
    if (owed <= EPS) return clean(out);
    // Break the smallest whole stone at or above the posted grade into the grade below.
    const h = [1, 2, 3].find((x) => x >= Math.max(g, 1) && out[x]! >= 1 - EPS);
    if (h === undefined) return null;
    out[h] = out[h]! - 1;
    out[h - 1] = out[h - 1]! + DOWN_GIVES;
  }
  return null;
}

/** Whether the purse can pay a price. */
export function canPay(s: Stones, price: number): boolean {
  return pay(s, price) !== null;
}

/**
 * A price taken as far as the purse reaches (a debt, a card's or a scene's cost): paid in full
 * when it can be, else every stone at or below the price's grade is gone, and a higher stone's
 * part drunk stays.
 */
export function spend(s: Stones, price: number): Stones {
  const paid = pay(s, price);
  if (paid) return paid;
  const g = postedGrade(price);
  return s.map((n, j) => (j <= g ? 0 : n)) as Stones;
}

/**
 * Stones into the purse as the payer counts them: whole stones of the largest grade the sum reads
 * in, never above the payer's grade (`upTo`, an index into GRADES; low by default), and the rest
 * in the grades below.
 */
export function receive(s: Stones, low: number, upTo = 0): Stones {
  if (low <= 0) return [...s] as Stones;
  const out = [...s] as Stones;
  let rest = low;
  for (let g = Math.min(postedGrade(low), upTo); g > 0; g--) {
    const n = Math.floor(rest / GRADE_FACE ** g + EPS);
    out[g] = out[g]! + n;
    rest -= n * GRADE_FACE ** g;
  }
  out[0] += rest;
  return clean(out);
}

/** A share of every grade taken (a robbery), whole stones of each, as the low count always was. */
export function takeShare(s: Stones, share: number): Stones {
  return clean(s.map((n) => n - Math.floor(n * share + EPS)) as Stones);
}

/** What one stone of grade j is worth as fuel to a burner of `grade`: its face less the premium. */
function fuelOf(j: number, grade: number): number {
  return GRADE_FACE ** j / (UP_COST / GRADE_FACE) ** (grade - j);
}

/**
 * The fuel the purse holds for a burner of a grade, in low-grade stones' worth: that grade and the
 * grades below at the premium a step (1,200 low burn as one mid at Core Formation); a higher stone
 * is never counted, since burning never breaks one.
 */
export function burnable(s: Stones, grade: number): number {
  let sum = 0;
  for (let j = 0; j <= grade; j++) sum += s[j]! * fuelOf(j, grade);
  return sum;
}

/**
 * Burns a worth of fuel (low-grade stones' worth, at most `burnable`): the burner's grade first,
 * then the grades below at the premium a step, a stone part drunk kept as a fraction of its grade.
 */
export function burn(s: Stones, worth: number, grade: number): Stones {
  const out = [...s] as Stones;
  let left = worth;
  for (let j = grade; j >= 0 && left > EPS; j--) {
    const each = fuelOf(j, grade);
    const use = Math.min(out[j]!, left / each);
    out[j] = out[j]! - use;
    left -= use * each;
  }
  return clean(out);
}

type Burner = Pick<Cultivator, 'stones' | 'higherStones' | 'plan'> & {
  qi: Pick<Cultivator['qi'], 'realm'>;
};

/**
 * Whether burning ran dry between two moments of a cultivator: fuel at their grade and below was
 * held and none is now. `waits` names the higher stones left whole ("1 high"), or is null.
 */
export function fuelRanOut(before: Burner, after: Burner): { waits: string | null } | null {
  if (!after.plan.burnStones) return null;
  const g = realmGrade(after.qi.realm);
  if (burnable(stonesOf(before), g) <= EPS || burnable(stonesOf(after), g) > EPS) return null;
  const higher = stonesOf(after).map((n, j) => (j > g ? n : 0)) as Stones;
  return { waits: worthOf(higher) >= GRADE_FACE ** (g + 1) * 0.1 ? stonesWords(higher) : null };
}

/** The grades a burner of a grade drinks, in words: "low", "mid and low", "high, mid and low". */
export function burnedGradesWords(grade: number): string {
  const names = GRADES.slice(0, grade + 1).reverse();
  return names.length === 1 ? names[0]! : `${names.slice(0, -1).join(', ')} and ${names.at(-1)!}`;
}

/** The toast when burning runs dry, or null: what burned and a higher stone that waits whole. */
export function ranOutWords(before: Burner, after: Burner): string | null {
  const out = fuelRanOut(before, after);
  if (!out) return null;
  if (!out.waits) return 'none left to burn';
  const burned = burnedGradesWords(realmGrade(after.qi.realm));
  return `your ${burned} are burned; ${out.waits} waits whole, unbroken`;
}

/** Buys one stone of a grade with UP_COST of the grade below, or null when short. */
export function changeUp(s: Stones, to: Exclude<Grade, 'low'>, n = 1): Stones | null {
  const g = GRADES.indexOf(to);
  if (s[g - 1]! + EPS < UP_COST * n) return null;
  const out = [...s] as Stones;
  out[g - 1] = out[g - 1]! - UP_COST * n;
  out[g] = out[g]! + n;
  return clean(out);
}

/** Breaks whole stones of a grade into DOWN_GIVES each of the grade below, or null when short. */
export function changeDown(s: Stones, from: Exclude<Grade, 'low'>, n = 1): Stones | null {
  const g = GRADES.indexOf(from);
  if (s[g]! + EPS < n) return null;
  const out = [...s] as Stones;
  out[g] = out[g]! - n;
  out[g - 1] = out[g - 1]! + DOWN_GIVES * n;
  return clean(out);
}

/** A money changer: low-grade stones into silver, STONE_TO_SILVER taels each. */
export function toSilver<C extends Pick<Cultivator, 'stones' | 'silver'>>(
  c: C,
  n: number,
): C | null {
  if (n <= 0 || c.stones + EPS < n || !Number.isInteger(n)) return null;
  return { ...c, stones: c.stones - n, silver: c.silver + STONE_TO_SILVER * n };
}

/** A money changer: silver into low-grade stones, SILVER_TO_STONE taels each. */
export function toStones<C extends Pick<Cultivator, 'stones' | 'silver'>>(
  c: C,
  n: number,
): C | null {
  if (n <= 0 || c.silver + EPS < SILVER_TO_STONE * n || !Number.isInteger(n)) return null;
  return { ...c, silver: c.silver - SILVER_TO_STONE * n, stones: c.stones + n };
}

/** Pays a price in silver, or null when short: mortal shops make no change for a stone. */
export function paySilver<C extends Pick<Cultivator, 'silver'>>(c: C, taels: number): C | null {
  if (c.silver + EPS < taels) return null;
  return { ...c, silver: c.silver - taels };
}
