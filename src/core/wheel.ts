// The day wheel (design § Cultivation, the day is twelve double-hours): which kinds of hour are
// open, 子 and 丑 locked to sleep at Qi Condensation, setting hours, routines and the discipline
// they earn, and the default rule that flips an hour to each new kind as it opens. What each hour
// yields lives with the other rates in core/cultivation.ts.
import { phaseOf, type Element } from '../content/elements.ts';
import {
  BRANCHES,
  DAWN_BONUS,
  DAWN_HOUR,
  ELEMENT_BONUS,
  HOUR_KIND_IDS,
  HOUR_KINDS,
  HOUR_OPENINGS,
  SLEEP_HOURS,
  STUDY_LAYER,
  type HourKind,
} from '../content/hours.ts';
import { realmIndex } from '../content/realms.ts';
import { hasRoutine, routine, type Routine } from '../content/routines.ts';
import type { Note } from './cultivation.ts';
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
export function effectiveWheel(c: Cultivator): HourKind[] {
  return c.wheel.map((kind, i) => (hourLocked(c, i) ? 'sleep' : kind));
}

const openFlag = (kind: HourKind) => `hours-${kind}`;

/** Whether hours can be given to this kind yet: qi and sleep always, the rest once opened. */
export function hourKindOpen(c: Cultivator, kind: HourKind): boolean {
  return kind === 'qi' || kind === 'sleep' || hasFlag(c, openFlag(kind));
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
    case 'study':
      return realmIndex(c.qi.realm) > 0 || c.qi.stage >= STUDY_LAYER;
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
 * The default rule (design § Cultivation): when a new kind of hour becomes possible, one qi hour
 * flips to it with a chronicle line. At Foundation, sleep is freed and its hours turn to qi.
 */
export function openHours(c: Cultivator): { cultivator: Cultivator; notes: Note[] } {
  let next = c;
  const notes: Note[] = [];
  for (const o of HOUR_OPENINGS) {
    if (hasFlag(next, openFlag(o.kind)) || !kindPossible(next, o.kind)) continue;
    const { wheel, hour } = flipHour(next.wheel, next.rootElements, o.kind);
    next = { ...next, wheel, flags: [...next.flags, openFlag(o.kind)] };
    notes.push({ type: 'hours', data: { kind: o.kind, hour } });
  }
  if (!sleepLocked(next) && !hasFlag(next, 'sleep-freed')) {
    const wheel = next.wheel.map((k, i) => (SLEEP_HOURS.includes(i) && k === 'sleep' ? 'qi' : k));
    next = { ...next, wheel, flags: [...next.flags, 'sleep-freed'] };
    notes.push({ type: 'sleep-freed', data: {} });
  }
  return { cultivator: next, notes };
}
