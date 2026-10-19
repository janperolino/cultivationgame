// Reading (design § Cultivation, Reading): a copy is read on the study hours, one at a time, from a
// queue, over study days by its rarity and tier, while those hours still give their insight. The
// first readable copy in the queue is read; one that can't be read yet stays, skipped, saying what
// it waits on; a new copy joins an empty queue by itself. Reading runs at the study days × Aptitude
// × how well the copy suits you. Finishing makes what it teaches yours as any road does, gives a
// lump of insight and writes a chronicle line; the copy stays, so knowing a thing and owning copies
// of it are counted apart. An unread copy grafts nowhere: it stands on the bookcase alone until read.
import {
  copyManual,
  copyOf,
  copyOfManual,
  copyTitle,
  hasCopy,
  readDays,
  readLump,
  SUITS_CAP,
  SUITS_DAO_TIER,
  SUITS_ELEMENT,
} from '../content/copies.ts';
import { ELEMENTS, ELEMENT_INFO, type Element } from '../content/elements.ts';
import { ALL_FIRSTS, type FirstId } from '../content/firsts.ts';
import type { Manual } from '../content/manuals.ts';
import { KINSHIP_BONUS } from '../content/mastery.ts';
import { manual } from '../content/manuals.ts';
import { method } from '../content/methods.ts';
import { technique } from '../content/techniques.ts';
import { tree } from '../content/trees/index.ts';
import { daoTiers } from './combat/combatant.ts';
import type { Note } from './cultivation.ts';
import { gainInsight, insightMultiplier } from './insight.ts';
import { gainManual, heldManuals, holdsManual } from './manuals.ts';
import { knowsMethod, learnMethod, methodFitSpeed } from './methods.ts';
import type { Cultivator } from './state.ts';
import { canLearnTechnique, knowsTechnique, learnTechnique, techniqueKin } from './techniques.ts';

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

/** Study days put into the copy so far. */
export function readProgress(c: Cultivator, id: string): number {
  return c.reading.days[id] ?? 0;
}

// ---------------------------------------------------------------- the queue

/**
 * The reading queue, in order, without copies no longer written or owned, or whose content you
 * have since learned another way (a senior taught it, a card gave it).
 */
export function readingQueue(c: Cultivator): string[] {
  return c.reading.queue.filter((id) => hasCopy(id) && copyCount(c, id) > 0 && !knowsCopy(c, id));
}

/** The copy the study hours read now: the first in the queue that can be read. */
export function readingCopy(c: Cultivator): string | null {
  return readingQueue(c).find((id) => readCheck(c, id).ok) ?? null;
}

/** What a queued copy waits on, or null when it can be read. */
export function waitsOn(c: Cultivator, id: string): string | null {
  const check = readCheck(c, id);
  return check.ok ? null : check.reason;
}

/** Copies owned and unread that aren't in the queue: the shelf's, each with Queue. */
export function unqueuedCopies(c: Cultivator): string[] {
  const queued = new Set(c.reading.queue);
  return ownedCopies(c).filter((id) => !queued.has(id) && copyUnread(c, id));
}

/**
 * Whether a copy can join the queue: owned, unread and not queued yet. A next chapter can wait in
 * the queue for the chapter before it; the queue says so.
 */
export function queueCheck(c: Cultivator, id: string): ReadCheck {
  if (!hasCopy(id)) return { ok: false, reason: 'There is no such copy.' };
  if (copyCount(c, id) <= 0) return { ok: false, reason: 'You own no copy of it.' };
  if (knowsCopy(c, id)) return { ok: false, reason: `You know ${copyTitle(id)} already.` };
  if (c.reading.queue.includes(id)) return { ok: false, reason: 'It is in the queue already.' };
  return { ok: true };
}

/** Adds a copy to the end of the queue. */
export function queueCopy(c: Cultivator, id: string): { cultivator: Cultivator; check: ReadCheck } {
  const check = queueCheck(c, id);
  if (!check.ok) return { cultivator: c, check };
  return {
    cultivator: { ...c, reading: { ...c.reading, queue: [...c.reading.queue, id] } },
    check,
  };
}

/** Takes a copy out of the queue; it keeps its progress. */
export function unqueueCopy(c: Cultivator, id: string): Cultivator {
  if (!c.reading.queue.includes(id)) return c;
  return { ...c, reading: { ...c.reading, queue: c.reading.queue.filter((x) => x !== id) } };
}

/** Moves a queued copy one place up (−1) or down (+1). */
export function moveInQueue(c: Cultivator, id: string, by: -1 | 1): Cultivator {
  const queue = [...c.reading.queue];
  const at = queue.indexOf(id);
  const to = at + by;
  if (at < 0 || to < 0 || to >= queue.length) return c;
  [queue[at], queue[to]] = [queue[to]!, queue[at]!];
  return { ...c, reading: { ...c.reading, queue } };
}

/**
 * A copy just gained joins an empty queue by itself, so nothing waits unread for want of a click;
 * the note is the chronicle's "begins reading". A queue already holding something is left alone,
 * and so is every copy until the lineage has queued one itself (core/firsts.ts).
 */
export function queueIfIdle(
  c: Cultivator,
  id: string,
  firsts: readonly FirstId[] = ALL_FIRSTS,
): { cultivator: Cultivator; notes: Note[] } {
  if (!firsts.includes('copy')) return { cultivator: c, notes: [] };
  if (readingQueue(c).length > 0 || !copyUnread(c, id)) return { cultivator: c, notes: [] };
  const r = queueCopy(c, id);
  if (!r.check.ok) return { cultivator: c, notes: [] };
  const notes: Note[] = readCheck(r.cultivator, id).ok
    ? [{ type: 'reading', data: { copy: id } }]
    : [];
  return { cultivator: r.cultivator, notes };
}

// ---------------------------------------------------------------- suits you

export interface SuitsYou {
  /** The multiplier on reading speed, capped. */
  total: number;
  /** Each reason with its factor, for the "?". */
  reasons: { label: string; factor: number }[];
  /** True when the reasons multiply past the cap. */
  capped: boolean;
}

/** The element a copy carries: a method's, a technique's damage type, a formula grafted on an element Dao. */
function copyElement(id: string): Element | null {
  const of = copyOf(id);
  if (!of) return null;
  const isElement = (x: string | null | undefined): x is Element =>
    !!x && (ELEMENTS as readonly string[]).includes(x);
  if (of.kind === 'method') return method(of.id).element ?? null;
  if (of.kind === 'technique') {
    const d = technique(of.id).damage;
    return isElement(d) ? d : null;
  }
  const host = manual(of.id).host;
  return isElement(host) ? host : null;
}

/**
 * How well a copy suits you (design § Cultivation, Reading): one multiplier on its reading speed
 * with its reasons, from a method's fit to your root, a technique's kin at Comprehension, an
 * element your root holds, and each tier you hold in a technique's first Dao; capped at ×1.5.
 */
export function suitsYou(c: Cultivator, id: string): SuitsYou {
  const of = copyOf(id);
  const reasons: SuitsYou['reasons'] = [];
  if (of?.kind === 'method') {
    const fit = methodFitSpeed(c, method(of.id));
    if (fit !== 1) reasons.push({ label: 'its fit to your root', factor: fit });
  }
  if (of?.kind === 'technique') {
    const kin = techniqueKin(c, of.id);
    if (kin.length > 0) {
      reasons.push({ label: `kin to ${kin[0]!.name}`, factor: 1 + KINSHIP_BONUS });
    }
    const dao = technique(of.id).daos[0];
    const tiers = dao ? (daoTiers(c)[dao] ?? 0) : 0;
    if (dao && tiers > 0) {
      const name = tree(dao).name;
      reasons.push({
        label: `${tiers === 1 ? 'a tier' : `${tiers} tiers`} of the ${name} Dao`,
        factor: SUITS_DAO_TIER ** tiers,
      });
    }
  }
  const el = copyElement(id);
  if (el && c.rootElements.includes(el)) {
    reasons.push({ label: `${ELEMENT_INFO[el].name}, in your root`, factor: SUITS_ELEMENT });
  }
  const product = reasons.reduce((acc, r) => acc * r.factor, 1);
  return { total: Math.min(SUITS_CAP, product), reasons, capped: product > SUITS_CAP };
}

// ---------------------------------------------------------------- reading

/**
 * Finishes a copy: what it teaches becomes yours (a manual held, a method known, a technique at
 * Glimpse or where the chapter rule starts it), its lump of insight lands, it leaves the queue, and
 * the next readable copy begins. What it teaches arrives as learning would, a first time switched
 * off (core/firsts.ts).
 */
export function finishReading(
  c: Cultivator,
  id: string,
  firsts: readonly FirstId[] = ALL_FIRSTS,
): { cultivator: Cultivator; notes: Note[] } {
  const of = copyOf(id);
  if (!of || !readCheck(c, id).ok) return { cultivator: c, notes: [] };
  const learned =
    of.kind === 'method'
      ? learnMethod(c, of.id, firsts)
      : of.kind === 'technique'
        ? learnTechnique(c, of.id, firsts)
        : gainManual(c, of.id);
  const days = { ...c.reading.days };
  delete days[id];
  const read = {
    ...learned,
    reading: { ...c.reading, queue: c.reading.queue.filter((x) => x !== id), days },
  };
  const next = readingCopy(read);
  const notes: Note[] = [{ type: of.kind, data: { [of.kind]: of.id, how: 'finishes reading' } }];
  if (next) notes.push({ type: 'reading', data: { copy: next } });
  return { cultivator: gainInsight(read, readLump(id) * insightMultiplier(c)), notes };
}

/** Study days a day of study puts into a copy: the day's (Aptitude counted) × how well it suits you. */
export function readRate(c: Cultivator, id: string, studyPerDay: number): number {
  return studyPerDay * suitsYou(c, id).total;
}

/**
 * Study days into the copy being read, × how well it suits you, finishing it when they reach its
 * reading time; study days past the end of a read are lost.
 */
export function addReading(
  c: Cultivator,
  studyDays: number,
  firsts: readonly FirstId[] = ALL_FIRSTS,
): { cultivator: Cultivator; notes: Note[] } {
  const id = readingCopy(c);
  if (!id || studyDays <= 0) return { cultivator: c, notes: [] };
  const done = readProgress(c, id) + readRate(c, id, studyDays);
  if (done < readDays(id) - 1e-9) {
    return {
      cultivator: { ...c, reading: { ...c.reading, days: { ...c.reading.days, [id]: done } } },
      notes: [],
    };
  }
  return finishReading(c, id, firsts);
}
