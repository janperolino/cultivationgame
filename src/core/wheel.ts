// The day wheel (design § Cultivation, the day is twelve double-hours): which kinds of hour are
// open, 子 and 丑 locked to sleep at Qi Condensation, setting hours, routines and the discipline
// they earn, and the default rule that flips an hour to each new kind as it opens. What each hour
// yields lives with the other rates in core/cultivation.ts.
import { phaseOf, type Element } from '../content/elements.ts';
import {
  ALWAYS_OPEN_HOURS,
  BRANCHES,
  DAWN_BONUS,
  DAWN_HOUR,
  ELEMENT_BONUS,
  HOUR_KIND_IDS,
  HOUR_KINDS,
  HOUR_OPENINGS,
  HOURS_PER_DAY,
  SLEEP_HOURS,
  type HourKind,
} from '../content/hours.ts';
import { hasMethod, method } from '../content/methods.ts';
import { hasRoutine, routine, type Routine } from '../content/routines.ts';
import type { Note } from './cultivation.ts';
import { readingCopy } from './reading.ts';
import { hasFlag, type Cultivator } from './state.ts';
import { knownTechniques, techniqueSealed } from './techniques.ts';

/** How many wheels a cultivator can keep under a name. */
export const SAVED_ROUTINES_MAX = 8;

/** At Qi Condensation the body is still mostly mortal: 子 and 丑 are locked to sleep. */
export function sleepLocked(c: Cultivator): boolean {
  return c.qi.realm === 'qi-condensation';
}

export function hourLocked(c: Cultivator, hour: number): boolean {
  return sleepLocked(c) && SLEEP_HOURS.includes(hour);
}

/** What each hour goes to: the wheel, with locked hours asleep whatever it says. */
/** The hour of the day wheel a world day stands in: 0 at 子 (midnight), 11 at 亥. */
export function hourOfDay(day: number): number {
  return Math.floor((((day % 1) + 1) % 1) * HOURS_PER_DAY) % HOURS_PER_DAY;
}

export function effectiveWheel(c: Cultivator): HourKind[] {
  return c.wheel.map((kind, i) => (hourLocked(c, i) ? 'sleep' : kind));
}

const openFlag = (kind: HourKind) => `hours-${kind}`;

/** Whether hours can be given to this kind yet: qi, study and sleep always, the rest once opened. */
export function hourKindOpen(c: Cultivator, kind: HourKind): boolean {
  return ALWAYS_OPEN_HOURS.includes(kind) || hasFlag(c, openFlag(kind));
}

export function openHourKinds(c: Cultivator): HourKind[] {
  return HOUR_KIND_IDS.filter((k) => hourKindOpen(c, k));
}

export type WheelCheck = { ok: true } | { ok: false; reason: string };

const kindName = (kind: HourKind) => HOUR_KINDS[kind].name.toLowerCase();

/** Whether an hour can be given to a kind of work now, and why not. */
export function canSetHour(c: Cultivator, hour: number, kind: HourKind): WheelCheck {
  if (!Number.isInteger(hour) || hour < 0 || hour >= c.wheel.length) {
    return { ok: false, reason: 'There is no such hour.' };
  }
  if (hourLocked(c, hour) && kind !== 'sleep') {
    return { ok: false, reason: 'At Qi Condensation the body still needs its sleep at 子 and 丑.' };
  }
  if (!hourKindOpen(c, kind)) {
    return { ok: false, reason: `You have no ${kindName(kind)} hours yet.` };
  }
  return { ok: true };
}

export function setHour(
  c: Cultivator,
  hour: number,
  kind: HourKind,
): { cultivator: Cultivator; check: WheelCheck } {
  const check = canSetHour(c, hour, kind);
  if (!check.ok) return { cultivator: c, check };
  const wheel = [...c.wheel];
  wheel[hour] = kind;
  return { cultivator: { ...c, wheel }, check };
}

/** Whether a whole wheel can be followed now: every kind open, and sleep where it is locked. */
export function canFollow(c: Cultivator, hours: readonly HourKind[]): WheelCheck {
  if (hours.length !== c.wheel.length) return { ok: false, reason: 'A routine has twelve hours.' };
  if (SLEEP_HOURS.some((h) => hourLocked(c, h) && hours[h] !== 'sleep')) {
    return { ok: false, reason: 'It keeps 子 and 丑 awake, which only Foundation frees.' };
  }
  const closed = [...new Set(hours.filter((k) => !hourKindOpen(c, k)))];
  if (closed.length > 0) {
    return { ok: false, reason: `It needs ${closed.map(kindName).join(' and ')} hours.` };
  }
  return { ok: true };
}

/** Sets the whole wheel to a routine's hours, if it can be followed now. */
export function followWheel(
  c: Cultivator,
  hours: readonly HourKind[],
): { cultivator: Cultivator; check: WheelCheck } {
  const check = canFollow(c, hours);
  if (!check.ok) return { cultivator: c, check };
  return { cultivator: { ...c, wheel: [...hours] }, check };
}

/** The learned routine the wheel follows exactly, all twelve hours, if any. */
export function followedRoutine(c: Cultivator): Routine | null {
  const wheel = effectiveWheel(c);
  for (const id of c.routines) {
    if (!hasRoutine(id)) continue;
    const r = routine(id);
    if (r.hours.every((k, i) => wheel[i] === k)) return r;
  }
  return null;
}

/** Learns a routine from a teacher, manual or sect. */
export function learnRoutine(c: Cultivator, id: string): Cultivator {
  if (c.routines.includes(id) || !hasRoutine(id)) return c;
  return { ...c, routines: [...c.routines, id] };
}

/** Saves the wheel under a name, replacing a saved wheel of the same name. */
export function saveRoutine(
  c: Cultivator,
  name: string,
): { cultivator: Cultivator; check: WheelCheck } {
  const trimmed = name.trim();
  if (!trimmed) return { cultivator: c, check: { ok: false, reason: 'Give the routine a name.' } };
  const others = c.savedRoutines.filter((r) => r.name !== trimmed);
  if (others.length >= SAVED_ROUTINES_MAX) {
    return {
      cultivator: c,
      check: {
        ok: false,
        reason: `You can keep ${SAVED_ROUTINES_MAX} routines; forget one first.`,
      },
    };
  }
  return {
    cultivator: { ...c, savedRoutines: [...others, { name: trimmed, hours: [...c.wheel] }] },
    check: { ok: true },
  };
}

export function forgetSavedRoutine(c: Cultivator, name: string): Cultivator {
  return { ...c, savedRoutines: c.savedRoutines.filter((r) => r.name !== name) };
}

// ---------------------------------------------------------------- the default rule

/** What a qi hour is worth to a root beyond the plain hour: its element, and dawn's purple qi. */
export function qiHourValue(elements: readonly Element[], hour: number): number {
  const matches = elements.some((e) => phaseOf(e) === BRANCHES[hour]!.element);
  return (matches ? ELEMENT_BONUS : 0) + (hour === DAWN_HOUR ? DAWN_BONUS : 0);
}

/**
 * The qi hour worth least to you: one that matches neither your root's elements nor dawn,
 * latest in the day first. Null when no qi hour is left.
 */
export function hourToFlip(
  wheel: readonly HourKind[],
  elements: readonly Element[],
): number | null {
  let best: number | null = null;
  let bestValue = Infinity;
  for (let h = wheel.length - 1; h >= 0; h--) {
    if (wheel[h] !== 'qi') continue;
    const value = qiHourValue(elements, h);
    if (value < bestValue) {
      best = h;
      bestValue = value;
    }
  }
  return best;
}

/** Flips the qi hour worth least to a new kind of work. */
export function flipHour(
  wheel: readonly HourKind[],
  elements: readonly Element[],
  kind: HourKind,
): { wheel: HourKind[]; hour: number | null } {
  const hour = hourToFlip(wheel, elements);
  const next = [...wheel];
  if (hour !== null) next[hour] = kind;
  return { wheel: next, hour };
}

/** Whether the cultivator can now do a kind of work, opened or not. */
function kindPossible(c: Cultivator, kind: HourKind): boolean {
  switch (kind) {
    case 'practice':
      return knownTechniques(c).some((t) => !techniqueSealed(c, t));
    case 'body':
    case 'soul':
      return c.activeMethods[kind] !== null;
    default:
      return true;
  }
}

/**
 * The wheel the default rule flips on: the one put aside while a first copy holds every waking
 * hour, so a kind opened meanwhile gets its hour back with the rest, else the wheel itself.
 */
function flipTarget(c: Cultivator): readonly HourKind[] {
  return c.reading.wheel ?? c.wheel;
}

/** Whether the cultivator knows any qi method, read or taught. */
function knowsQiMethod(c: Cultivator): boolean {
  return Object.keys(c.methods).some((id) => hasMethod(id) && method(id).ladder === 'qi');
}

/**
 * Before you know a qi method, qi hours give nothing, so a copy to read takes every waking hour
 * (design § Cultivation, the day is twelve double-hours) and the wheel as it was is put aside.
 */
function studyTakesAll(c: Cultivator): Cultivator {
  const wheel = c.wheel.map((k, i) => (hourLocked(c, i) ? k : 'study'));
  return { ...c, wheel, reading: { ...c.reading, wheel: [...c.wheel] } };
}

/**
 * Once a qi method is known, or nothing is left to read, the wheel put aside comes back with a study
 * hour kept: its own, or one turned by the default rule.
 */
function studyGivesBack(c: Cultivator): { cultivator: Cultivator; notes: Note[] } {
  if (!c.reading.wheel || (readingCopy(c) !== null && !knowsQiMethod(c))) {
    return { cultivator: c, notes: [] };
  }
  const kept = c.reading.wheel.indexOf('study');
  const { wheel, hour } =
    kept >= 0
      ? { wheel: [...c.reading.wheel], hour: kept }
      : flipHour(c.reading.wheel, c.rootElements, 'study');
  return {
    cultivator: { ...c, wheel, reading: { ...c.reading, wheel: null } },
    notes: [{ type: 'study-back', data: { hour } }],
  };
}

/**
 * The default rule (design § Cultivation): when a new kind of hour becomes possible, one qi hour
 * flips to it with a chronicle line. Before you know a qi method, a copy to read takes every waking
 * hour until one is known, then gives the wheel back. At Foundation, sleep is freed and its hours
 * turn to qi.
 */
export function openHours(c: Cultivator): { cultivator: Cultivator; notes: Note[] } {
  const back = studyGivesBack(c);
  let next = back.cultivator;
  const notes: Note[] = [...back.notes];
  if (!next.reading.wheel && !knowsQiMethod(next) && readingCopy(next) !== null) {
    next = studyTakesAll(next);
    notes.push({ type: 'study-all', data: { copy: readingCopy(next) } });
  }
  for (const o of HOUR_OPENINGS) {
    if (hourKindOpen(next, o.kind) || !kindPossible(next, o.kind)) continue;
    const flags = [...next.flags, openFlag(o.kind)];
    const { wheel, hour } = flipHour(flipTarget(next), next.rootElements, o.kind);
    next = next.reading.wheel
      ? { ...next, flags, reading: { ...next.reading, wheel } }
      : { ...next, wheel, flags };
    notes.push({ type: 'hours', data: { kind: o.kind, hour } });
  }
  if (!sleepLocked(next) && !hasFlag(next, 'sleep-freed')) {
    const wheel = next.wheel.map((k, i) => (SLEEP_HOURS.includes(i) && k === 'sleep' ? 'qi' : k));
    next = { ...next, wheel, flags: [...next.flags, 'sleep-freed'] };
    notes.push({ type: 'sleep-freed', data: {} });
  }
  return { cultivator: next, notes };
}
