// The purse (design § World bible, Stones, silver and shops in play): stones held by grade, each
// its own count, and silver as the mortal purse. A price reads in the largest grade that reads
// cleanly ("2.4 mid"); paying it in a lower grade costs the premium a step (1,200 a stone above),
// and a shop breaks a higher stone into 1,100 of the grade below to make change. A money changer
// does the same for a fee-free count, and turns stones to silver and back. Nothing here reads the
// world: it is the arithmetic every shop, toll and wage uses.
import {
  DOWN_GIVES,
  GRADE_FACE,
  GRADES,
  SILVER_TO_STONE,
  STONE_TO_SILVER,
  UP_COST,
  type Grade,
} from '../content/money.ts';
import type { Cultivator } from './state.ts';

/** Every grade's count, low first. Low may be fractional: Cultivate burns it by the hour. */
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

/** The purse at face value, in low-grade stones: what it is worth on the yardstick. */
export function faceValue(s: Stones): number {
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

/** The purse in words, largest grade first: "3 mid · 240 low · 85 taels". */
export function purseWords(c: Pick<Cultivator, 'stones' | 'higherStones' | 'silver'>): string {
  const s = stonesOf(c);
  const parts: string[] = [];
  for (let g = GRADES.length - 1; g >= 0; g--) {
    const n = g === 0 ? Math.floor(s[g]!) : s[g]!;
    if (n > 0) parts.push(`${n} ${GRADES[g]}`);
  }
  if (parts.length === 0) parts.push('0 low');
  if (c.silver > 0) parts.push(`${Math.floor(c.silver)} taels`);
  return parts.join(' · ');
}

const EPS = 1e-9;

/**
 * The purse after paying a price in low-grade stones, or null when it can't be paid: the posted
 * grade's whole stones first, then each grade below at the premium a step, then a higher stone
 * broken to make change, as often as it takes.
 */
export function pay(s: Stones, price: number): Stones | null {
  const g = postedGrade(price);
  const out = [...s] as Stones;
  // What is still owed, in stones of the posted grade.
  let owed = price / GRADE_FACE ** g;
  for (let guard = 0; guard < 64; guard++) {
    for (let j = g; j >= 0 && owed > EPS; j--) {
      // One stone of grade j covers this much of the posted grade.
      const covers = j === g ? 1 : 1 / UP_COST ** (g - j);
      const want = owed / covers;
      const use = j === 0 ? Math.min(out[0], want) : Math.min(out[j]!, Math.floor(want + EPS));
      out[j] = out[j]! - use;
      owed -= use * covers;
    }
    if (owed <= EPS) {
      // Low stones are fractional; keep the count clean of float dust.
      out[0] = Math.round(out[0] * 1e6) / 1e6;
      return out;
    }
    // Break the smallest stone at or above the posted grade into the grade below.
    const h = [1, 2, 3].find((x) => x >= Math.max(g, 1) && out[x]! >= 1);
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

/** Low-grade stones into the purse: what shops, bounties and wages pay out. */
export function receive(s: Stones, low: number): Stones {
  return [s[0] + low, s[1], s[2], s[3]];
}

/** Buys one stone of a grade with UP_COST of the grade below, or null when short. */
export function changeUp(s: Stones, to: Exclude<Grade, 'low'>, n = 1): Stones | null {
  const g = GRADES.indexOf(to);
  if (s[g - 1]! + EPS < UP_COST * n) return null;
  const out = [...s] as Stones;
  out[g - 1] = out[g - 1]! - UP_COST * n;
  out[g] = out[g]! + n;
  return out;
}

/** Breaks stones of a grade into DOWN_GIVES each of the grade below, or null when short. */
export function changeDown(s: Stones, from: Exclude<Grade, 'low'>, n = 1): Stones | null {
  const g = GRADES.indexOf(from);
  if (s[g]! < n) return null;
  const out = [...s] as Stones;
  out[g] = out[g]! - n;
  out[g - 1] = out[g - 1]! + DOWN_GIVES * n;
  return out;
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
