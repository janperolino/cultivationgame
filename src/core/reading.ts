// Reading (design § Cultivation, Reading): a copy is read on the study hours, one at a time, over
// study days by its rarity and tier, while those hours still give their insight. Finishing makes
// what it teaches yours as any road does, gives a lump of insight and writes a chronicle line; the
// copy stays, so knowing a thing and owning copies of it are counted apart. An unread copy grafts
// nowhere: it stands on the bookcase alone until read.
import {
  copyManual,
  copyOf,
  copyOfManual,
  copyTitle,
  hasCopy,
  readDays,
  readLump,
} from '../content/copies.ts';
import type { Manual } from '../content/manuals.ts';
import type { Note } from './cultivation.ts';
import { gainInsight, insightMultiplier } from './insight.ts';
import { gainManual, heldManuals, holdsManual } from './manuals.ts';
import { knowsMethod, learnMethod } from './methods.ts';
import type { Cultivator } from './state.ts';
import { canLearnTechnique, knowsTechnique, learnTechnique } from './techniques.ts';

/** How many copies of it the cultivator owns. */
export function copyCount(c: Cultivator, id: string): number {
  return c.copies[id] ?? 0;
}

/** The copies owned, in the order first gained; one no longer written is skipped. */
export function ownedCopies(c: Cultivator): string[] {
  return Object.keys(c.copies).filter((id) => copyCount(c, id) > 0 && hasCopy(id));
}

/** Whether what the copy teaches is already yours, by reading it or any other road. */
export function knowsCopy(c: Cultivator, id: string): boolean {
  const of = copyOf(id);
  if (!of) return false;
  if (of.kind === 'method') return knowsMethod(c, of.id);
  if (of.kind === 'technique') return knowsTechnique(c, of.id);
  return holdsManual(c, of.id);
}

/** An unread copy: owned, and what it teaches not yet known. It wears a paper band. */
export function copyUnread(c: Cultivator, id: string): boolean {
  return copyCount(c, id) > 0 && !knowsCopy(c, id);
}

/** Whether the manual stands on the bookcase as an unread copy, grafting nowhere. */
export function manualUnread(c: Cultivator, m: Manual): boolean {
  return copyUnread(c, copyOfManual(m));
}

/** A copy holding `n` more copies of it; unknown ids are ignored. */
export function gainCopy(c: Cultivator, id: string, n = 1): Cultivator {
  if (!hasCopy(id) || n === 0) return c;
  return { ...c, copies: { ...c.copies, [id]: Math.max(0, copyCount(c, id) + n) } };
}

/**
 * Everything on the bookcase: every manual held, then the manual each owned copy stands as, read
 * or not, with no spine twice. A method with no manual of its own stands only with a copy.
 */
export function bookcaseManuals(c: Cultivator): Manual[] {
  const held = heldManuals(c);
  const ids = new Set(held.map((m) => m.id));
  const copies = ownedCopies(c)
    .map(copyManual)
    .filter((m) => !ids.has(m.id) && ids.add(m.id));
  return [...held, ...copies];
}

export type ReadCheck = { ok: true } | { ok: false; reason: string };

/**
 * Whether the copy can be read: one is owned, and it checks what learning would, so a line's next
 * chapter needs the one before at Comprehension and something known says so.
 */
export function readCheck(c: Cultivator, id: string): ReadCheck {
  const of = copyOf(id);
  if (!of) return { ok: false, reason: 'There is no such copy.' };
  if (copyCount(c, id) <= 0) return { ok: false, reason: 'You own no copy of it.' };
  if (knowsCopy(c, id)) {
    const title = copyTitle(id);
    return { ok: false, reason: `You know ${title} already.` };
  }
  if (of.kind === 'technique') {
    const t = canLearnTechnique(c, of.id);
    if (!t.ok) return { ok: false, reason: t.reason };
  }
  return { ok: true };
}

/** Sets the study hours on a copy; the one read before keeps its progress. */
export function startReading(
  c: Cultivator,
  id: string,
): { cultivator: Cultivator; check: ReadCheck } {
  const check = readCheck(c, id);
  if (!check.ok) return { cultivator: c, check };
  return { cultivator: { ...c, reading: { ...c.reading, copy: id } }, check };
}

/** Turns the study hours back to study alone; the copy keeps its progress. */
export function stopReading(c: Cultivator): Cultivator {
  return c.reading.copy === null ? c : { ...c, reading: { ...c.reading, copy: null } };
}

/** Study days put into the copy so far. */
export function readProgress(c: Cultivator, id: string): number {
  return c.reading.days[id] ?? 0;
}

/** The copy the study hours read now: the one set, while it can still be read. */
export function readingCopy(c: Cultivator): string | null {
  const id = c.reading.copy;
  return id && readCheck(c, id).ok ? id : null;
}

/**
 * Finishes a copy: what it teaches becomes yours (a manual held, a method known, a technique at
 * Glimpse or where the chapter rule starts it), its lump of insight lands, and the study hours
 * turn back to study alone.
 */
export function finishReading(
  c: Cultivator,
  id: string,
): { cultivator: Cultivator; notes: Note[] } {
  const of = copyOf(id);
  if (!of || !readCheck(c, id).ok) return { cultivator: c, notes: [] };
  const learned =
    of.kind === 'method'
      ? learnMethod(c, of.id)
      : of.kind === 'technique'
        ? learnTechnique(c, of.id)
        : gainManual(c, of.id);
  const days = { ...c.reading.days };
  delete days[id];
  const read = {
    ...learned,
    reading: { copy: c.reading.copy === id ? null : c.reading.copy, days },
  };
  return {
    cultivator: gainInsight(read, readLump(id) * insightMultiplier(c)),
    notes: [{ type: of.kind, data: { [of.kind]: of.id, how: 'finishes reading' } }],
  };
}

/** Study days into the copy being read, finishing it when they reach its reading time. */
export function addReading(
  c: Cultivator,
  studyDays: number,
): { cultivator: Cultivator; notes: Note[] } {
  const id = readingCopy(c);
  if (!id || studyDays <= 0) return { cultivator: c, notes: [] };
  const done = readProgress(c, id) + studyDays;
  if (done < readDays(id) - 1e-9) {
    return {
      cultivator: { ...c, reading: { ...c.reading, days: { ...c.reading.days, [id]: done } } },
      notes: [],
    };
  }
  return finishReading(c, id);
}
