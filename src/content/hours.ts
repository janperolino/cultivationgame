// The day is twelve double-hours (design § Cultivation): the earthly branches from 子 at midnight
// round to 亥, each with its element, the kinds of hour you can give your own time to, and the
// bonuses an hour can carry. Starting values that sim/pacing.ts tunes; core/wheel.ts and
// core/cultivation.ts read them.
import type { PhaseElement } from './elements.ts';

export const HOURS_PER_DAY = 12;

export interface Branch {
  id: string;
  /** Pinyin, for the tooltip. */
  name: string;
  hanzi: string;
  element: PhaseElement;
  /** The clock hours it covers, "23–1". */
  clock: string;
  /** The time of day in words, for the seat's caption. */
  time: string;
}

export const BRANCHES: readonly Branch[] = [
  { id: 'zi', name: 'Zi', hanzi: '子', element: 'water', clock: '23–1', time: 'midnight' },
  {
    id: 'chou',
    name: 'Chou',
    hanzi: '丑',
    element: 'earth',
    clock: '1–3',
    time: 'the small hours',
  },
  { id: 'yin', name: 'Yin', hanzi: '寅', element: 'wood', clock: '3–5', time: 'before dawn' },
  { id: 'mao', name: 'Mao', hanzi: '卯', element: 'wood', clock: '5–7', time: 'dawn' },
  { id: 'chen', name: 'Chen', hanzi: '辰', element: 'earth', clock: '7–9', time: 'morning' },
  { id: 'si', name: 'Si', hanzi: '巳', element: 'fire', clock: '9–11', time: 'late morning' },
  { id: 'wu', name: 'Wu', hanzi: '午', element: 'fire', clock: '11–13', time: 'noon' },
  { id: 'wei', name: 'Wei', hanzi: '未', element: 'earth', clock: '13–15', time: 'afternoon' },
  {
    id: 'shen',
    name: 'Shen',
    hanzi: '申',
    element: 'metal',
    clock: '15–17',
    time: 'late afternoon',
  },
  { id: 'you', name: 'You', hanzi: '酉', element: 'metal', clock: '17–19', time: 'dusk' },
  { id: 'xu', name: 'Xu', hanzi: '戌', element: 'earth', clock: '19–21', time: 'evening' },
  { id: 'hai', name: 'Hai', hanzi: '亥', element: 'water', clock: '21–23', time: 'night' },
];

/**
 * What an hour can go to. Furnace, forge, garden, beast and shop hours join as those systems
 * arrive (M4 to M6). Duty 值 is never set by hand: a job you hold puts it on its shift's hours,
 * locked like sleep and named for the work (O4).
 */
export const HOUR_KINDS = {
  qi: { name: 'Qi', what: 'cultivate qi with your method' },
  body: { name: 'Body', what: 'temper the body with your tempering art' },
  soul: { name: 'Soul', what: 'nourish the soul with your nourishing art' },
  study: { name: 'Study', what: 'study for insight' },
  practice: { name: 'Practice', what: 'practice a technique' },
  sleep: { name: 'Sleep', what: 'sleep; it gives nothing' },
  duty: { name: 'Duty', what: "a job's shift: its pay, not your cultivation" },
} as const;
export type HourKind = keyof typeof HOUR_KINDS;
export const HOUR_KIND_IDS = Object.keys(HOUR_KINDS) as [HourKind, ...HourKind[]];

/** Work that matches its hour's element pays this much more, from layer 4. */
export const ELEMENT_BONUS = 0.25;
/** Dawn's purple qi at 卯 adds this to everyone's qi, tutorial included. */
export const DAWN_HOUR = 3;
export const DAWN_BONUS = 0.1;
/** The night hours, 亥, 子 and 丑, where a method with night qi (the `nightQi` stat) gains more. */
export const NIGHT_HOURS: readonly number[] = [11, 0, 1];
/** Following a learned routine exactly, all twelve hours, adds this to every hour. */
export const DISCIPLINE_BONUS = 0.1;

/** 子 and 丑 are locked to sleep at Qi Condensation; Foundation frees them. */
export const SLEEP_HOURS: readonly number[] = [0, 1];
export const SLEEP_FREED_TEXT = 'You no longer need sleep; two more hours are yours.';

/**
 * The wheel a fresh life is built from: all qi, with 子 and 丑 asleep. A new cultivator gives one
 * of its hours to study by the default rule (core/state.ts), since study is open from the start.
 */
export const FRESH_WHEEL: readonly HourKind[] = BRANCHES.map((_, i) =>
  SLEEP_HOURS.includes(i) ? 'sleep' : 'qi',
);

/** The Duty hour's seal on the wheel. */
export const DUTY_HANZI = '值';

/** Kinds of hour open from the start: qi, study and sleep. */
export const ALWAYS_OPEN_HOURS: readonly HourKind[] = ['qi', 'study', 'sleep'];

/**
 * Kinds of hour that open as you reach them (design § Cultivation, the day is twelve double-hours),
 * in the order the default rule flips an hour to each: practice with the first technique you can
 * use, body and soul with their art. Study is open from the start; its line stays for the chronicle
 * of older lives, which opened it at layer 2.
 */
export const HOUR_OPENINGS: readonly { kind: HourKind; text: string }[] = [
  {
    kind: 'study',
    text: 'The first insight trickles in. Study hours turn seclusion into understanding.',
  },
  { kind: 'practice', text: 'A technique to drill: practice hours now raise its mastery.' },
  { kind: 'body', text: 'A tempering art in hand: body hours open beside qi.' },
  { kind: 'soul', text: 'A nourishing art in hand: soul hours open.' },
];
