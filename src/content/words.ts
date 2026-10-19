// Words for numbers, so realms, layers and years read as words (design § UI, less spreadsheet).
import { DAYS_PER_MONTH, DAYS_PER_YEAR } from './calendar.ts';

const ONES = [
  '',
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
];
const TEENS = [
  'tenth',
  'eleventh',
  'twelfth',
  'thirteenth',
  'fourteenth',
  'fifteenth',
  'sixteenth',
  'seventeenth',
  'eighteenth',
  'nineteenth',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const TENS_TH = [
  '',
  '',
  'twentieth',
  'thirtieth',
  'fortieth',
  'fiftieth',
  'sixtieth',
  'seventieth',
  'eightieth',
  'ninetieth',
];

/** 14 → "fourteenth", 32 → "thirty-second"; past 99, "137th". */
export function ordinal(n: number): string {
  if (n < 1 || n > 99 || !Number.isInteger(n)) {
    const k = Math.round(n);
    const suffix =
      k % 100 >= 11 && k % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][k % 10] ?? 'th');
    return `${k}${suffix}`;
  }
  if (n < 10) return ONES[n]!;
  if (n < 20) return TEENS[n - 10]!;
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o === 0 ? TENS_TH[t]! : `${TENS[t]}-${ONES[o]}`;
}

const COUNT_WORDS = [
  'no',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
];

/** 3 → "three"; past twelve, the numeral. */
export function countWord(n: number): string {
  return COUNT_WORDS[n] ?? String(n);
}

/** 1 → "once", 2 → "twice", 5 → "five times". */
export function timesWord(n: number): string {
  return n === 1 ? 'once' : n === 2 ? 'twice' : `${countWord(n)} times`;
}

/**
 * A stretch of in-game days in words, for a story: "a few days", "a season", "two years". Plural
 * says whether it takes "pass" or "passes".
 */
export function spanWords(days: number): { text: string; plural: boolean } {
  if (days < 2) return { text: 'a day', plural: false };
  if (days < 7) return { text: 'a few days', plural: true };
  if (days < 20) return { text: 'half a month', plural: false };
  if (days < 45) return { text: 'a month', plural: false };
  if (days < 90) return { text: `${countWord(Math.round(days / DAYS_PER_MONTH))} months`, plural: true };
  if (days < DAYS_PER_YEAR) {
    const seasons = Math.floor(days / 90);
    return seasons === 1
      ? { text: 'a season', plural: false }
      : { text: `${countWord(seasons)} seasons`, plural: true };
  }
  if (days < 540) return { text: 'a year', plural: false };
  if (days < 720) return { text: 'a year and a half', plural: false };
  return { text: `${countWord(Math.round(days / DAYS_PER_YEAR))} years`, plural: true };
}
