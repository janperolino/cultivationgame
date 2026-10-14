// P2.5e: copies you read (design § Cultivation, Reading). Reading time and the lump by rarity and
// tier, the checks before reading, copies counted apart from knowing, the bookcase's unread spines,
// the cards that hand over copies instead of teaching, what's new for a copy, and save v15.
import { describe, expect, it } from 'vitest';
import { CARDS } from '../content/cards/index.ts';
import {
  copyId,
  copyItem,
  copyManual,
  copyOf,
  copyOfManual,
  READ_DAYS,
  READ_LUMP,
  readDays,
  readLump,
} from '../content/copies.ts';
import type { HourKind } from '../content/hours.ts';
import { technique } from '../content/techniques.ts';
import { eventText } from './chronicle.ts';
import { resolveCard } from './cards.ts';
import { cultivateDays, dayRates } from './cultivation.ts';
import { insightMultiplier } from './insight.ts';
import { gainCopy, gainTechnique, readCopy } from './life.ts';
import { graftsOn, heldManuals, manualFinished, shelf } from './manuals.ts';
import {
  addReading,
  bookcaseManuals,
  copyCount,
  copyUnread,
  gainCopy as ownCopy,
  readCheck,
  readingCopy,
  readProgress,
} from './reading.ts';
import { loadSave, makeSave, SAVE_VERSION } from './save/format.ts';
import { gains, heldIds, isNew, seeAll } from './seen.ts';
import { newLife, withPlayer, type Cultivator, type GameState } from './state.ts';
import { learnTechnique, mastery, masteryNeed } from './techniques.ts';

const BREATH = 'manual:garrison-breath-count';
const TIDE = 'manual:tide-counting';
const LANTERN = 'method:still-lantern';
const RAMPART = 'technique:rampart-palm';
const COLLAPSE = 'technique:rampart-collapse-palm';

const base = newLife({ name: 'Han Li', seed: 'reading' });

/** Two study hours on the wheel (寅 and 辰), the rest as a fresh life has them. */
function studious(c: Cultivator): Cultivator {
  const wheel = c.wheel.map((k): HourKind => (k === 'study' ? 'qi' : k));
  wheel[2] = 'study';
  wheel[4] = 'study';
  return { ...c, wheel, flags: [...c.flags, 'hours-study'] };
}

/** Puts a copy at the head of the queue, as reading it next would; unchanged when it can't be read. */
function startReading(c: Cultivator, id: string): { cultivator: Cultivator } {
  if (!readCheck(c, id).ok) return { cultivator: c };
  const queue = [id, ...c.reading.queue.filter((x) => x !== id)];
  return { cultivator: { ...c, reading: { ...c.reading, queue } } };
}

/** Cultivates a day at a time, the way the loop runs, with the notes it wrote. */
function days(c: Cultivator, n: number, from = base.calendar.day) {
  let next = c;
  const notes = [];
  for (let i = 0; i < n; i++) {
    const r = cultivateDays(next, 1, { day: from + i, rng: { next: () => 0.5 } as never });
    next = r.cultivator;
    notes.push(...r.notes);
  }
  return { cultivator: next, notes };
}

describe('copies', () => {
  it('derive one from every manual, method and technique, never from a method’s own manual', () => {
    expect(copyOf(BREATH)).toEqual({ kind: 'manual', id: 'garrison-breath-count' });
    expect(copyOf(LANTERN)).toEqual({ kind: 'method', id: 'still-lantern' });
    expect(copyOf(RAMPART)).toEqual({ kind: 'technique', id: 'rampart-palm' });
    expect(copyOf('manual:garrison-standard')).toBeNull();
    expect(copyOf('manual:nothing')).toBeNull();
    const it = copyItem(TIDE);
    expect(it.kind).toBe('manual');
    expect(it.rarity).toBe('blue');
    expect(it.uses.read).toEqual({ kind: 'manual', id: 'tide-counting' });
  });

  it('stand as their manual, a method’s or an Art, or a bare spine when none is written', () => {
    expect(copyManual(RAMPART).id).toBe('art-rampart-palm');
    expect(copyManual('method:garrison-standard').id).toBe('garrison-standard');
    const lantern = copyManual(LANTERN);
    expect(lantern.kind).toBe('method');
    expect(lantern.nodes).toEqual([]);
    expect(lantern.host).toBe('soul');
    expect(copyOfManual(lantern)).toBe(LANTERN);
    expect(copyOfManual(copyManual(TIDE))).toBe(TIDE);
  });
});

describe('reading time and the lump', () => {
  it('runs by rarity, gray as white, ×3 a tier', () => {
    expect(READ_DAYS.gray).toBe(READ_DAYS.white);
    expect(READ_LUMP.gray).toBe(READ_LUMP.white);
    expect(readDays(BREATH)).toBe(3);
    expect(readDays(TIDE)).toBe(8);
    expect(readLump(BREATH)).toBe(10);
    expect(readLump(TIDE)).toBe(20);
    expect(technique('rampart-collapse-palm').tier).toBe(2);
    expect(readDays(COLLAPSE)).toBe(9);
    expect(readLump(COLLAPSE)).toBe(30);
  });

  it('reads a white formula in 18 days on two study hours, grafting only when done', () => {
    let c = studious(ownCopy(base.player, BREATH));
    expect(dayRates(c, base.calendar.day).study).toBeCloseTo(2 / 12);
    c = startReading(c, BREATH).cultivator;
    const early = days(c, 17);
    expect(readProgress(early.cultivator, BREATH)).toBeCloseTo(17 / 6);
    expect(copyUnread(early.cultivator, BREATH)).toBe(true);
    expect(graftsOn(early.cultivator, 'qi').map((m) => m.id)).not.toContain(
      'garrison-breath-count',
    );
    const done = days(early.cultivator, 1, base.calendar.day + 17);
    const after = done.cultivator;
    expect(after.manuals).toContain('garrison-breath-count');
    expect(graftsOn(after, 'qi').map((m) => m.id)).toContain('garrison-breath-count');
    // The copy stays, its band off; the study hours turn back to study alone.
    expect(copyCount(after, BREATH)).toBe(1);
    expect(copyUnread(after, BREATH)).toBe(false);
    expect(after.reading.queue).toEqual([]);
    expect(after.reading.days[BREATH]).toBeUndefined();
    expect(done.notes).toContainEqual({
      type: 'manual',
      data: { manual: 'garrison-breath-count', how: 'finishes reading' },
    });
  });

  it('keeps the study hours’ insight while reading, and adds the lump at the end', () => {
    const c = studious(ownCopy(base.player, BREATH));
    const reading = startReading(c, BREATH).cultivator;
    const a = days(c, 10).cultivator;
    const b = days(reading, 10).cultivator;
    expect(b.insight.earned).toBeCloseTo(a.insight.earned);
    const finished = addReading(reading, 3);
    expect(finished.cultivator.insight.earned - reading.insight.earned).toBeCloseTo(
      10 * insightMultiplier(reading),
    );
  });

  it('keeps progress with a copy when reading turns to another', () => {
    let c = ownCopy(ownCopy(base.player, BREATH), TIDE);
    c = startReading(c, TIDE).cultivator;
    c = addReading(c, 2).cultivator;
    c = startReading(c, BREATH).cultivator;
    c = addReading(c, 1).cultivator;
    expect(readProgress(c, TIDE)).toBe(2);
    expect(readProgress(c, BREATH)).toBe(1);
    c = startReading(c, TIDE).cultivator;
    expect(readingCopy(c)).toBe(TIDE);
    c = addReading(c, 6).cultivator;
    expect(c.manuals).toContain('tide-counting');
  });

  it('reads a technique to Glimpse and a method to known, as any road gives them', () => {
    let c = ownCopy(base.player, RAMPART);
    c = startReading(c, RAMPART).cultivator;
    c = addReading(c, 3).cultivator;
    expect(c.techniques['rampart-palm']).toEqual({ practice: 0 });
    let d = ownCopy(base.player, LANTERN);
    d = startReading(d, LANTERN).cultivator;
    d = addReading(d, 3).cultivator;
    expect('still-lantern' in d.methods).toBe(true);
  });
});

describe('the checks before reading', () => {
  it('needs a copy owned, and says when it is known already', () => {
    expect(readCheck(base.player, BREATH)).toEqual({ ok: false, reason: 'You own no copy of it.' });
    const taught = gainTechnique(base, 'rampart-palm').player;
    const r = readCheck(ownCopy(taught, RAMPART), RAMPART);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toMatch(/already/);
  });

  it('refuses a next chapter until the one before is at Comprehension', () => {
    const known = learnTechnique(base.player, 'rampart-palm');
    const c = ownCopy(known, COLLAPSE);
    const r = readCheck(c, COLLAPSE);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toMatch(/Rampart Palm at Comprehension/);
    expect(startReading(c, COLLAPSE).cultivator).toBe(c);
    const t = technique('rampart-palm');
    const comprehended = {
      ...c,
      techniques: { ...c.techniques, [t.id]: { practice: masteryNeed(t, 1) } },
    };
    expect(mastery(comprehended, t.id).level).toBe(1);
    expect(readCheck(comprehended, COLLAPSE).ok).toBe(true);
  });

  it('stalls a reading whose copy became known by another road', () => {
    let c = startReading(ownCopy(base.player, RAMPART), RAMPART).cultivator;
    c = learnTechnique(c, 'rampart-palm');
    expect(readingCopy(c)).toBeNull();
    expect(addReading(c, 5).cultivator).toBe(c);
  });
});

describe('copies counted apart from knowing', () => {
  it('leaves a teacher’s lesson with no copy, and counts a second copy on the same spine', () => {
    const taught = gainTechnique(base, 'rampart-palm').player;
    expect(copyCount(taught, RAMPART)).toBe(0);
    const once = ownCopy(taught, RAMPART);
    const twice = ownCopy(once, RAMPART);
    expect(copyCount(twice, RAMPART)).toBe(2);
    const spines = bookcaseManuals(twice).filter((m) => m.id === 'art-rampart-palm');
    expect(spines).toHaveLength(1);
  });

  it('stands an unread copy on the bookcase open, never finished, and off the trees', () => {
    const c = ownCopy(base.player, LANTERN);
    const books = bookcaseManuals(c);
    const lantern = books.find((m) => m.id === 'still-lantern')!;
    expect(lantern).toBeDefined();
    expect(heldManuals(c).some((m) => m.id === 'still-lantern')).toBe(false);
    expect(manualFinished(c, lantern)).toBe(false);
    const plank = shelf(c, 'rarity', books).find((s) => s.plank.id === 'method')!;
    expect(plank.open.map((m) => m.id)).toContain('still-lantern');
    expect(graftsOn(c, 'soul')).toEqual([]);
  });
});

describe('the cards that hand over copies', () => {
  const pend = (s: GameState, id: string): GameState => ({
    ...s,
    cards: { ...s.cards, pending: [{ uid: 1, card: id, day: s.calendar.day }], nextUid: 2 },
  });

  it('turns the two formula cards into copies', () => {
    const rich = withPlayer(base, { ...base.player, stones: 20 });
    const bought = resolveCard(pend(rich, 'breath-count-for-sale'), 1, 1).state.player;
    expect(copyCount(bought, BREATH)).toBe(1);
    expect(bought.manuals).toEqual([]);
    const nursed = resolveCard(pend(base, 'fevered-courier'), 1, 1).state.player;
    expect(copyCount(nursed, TIDE)).toBe(1);
    expect(nursed.manuals).toEqual([]);
  });

  it('teaches the lamp-keeper’s art to one who sits the night, and hands a copy to one who goes', () => {
    const sat = resolveCard(pend(base, 'lamp-keeper'), 1, 0).state.player;
    expect('still-lantern' in sat.methods).toBe(true);
    expect(copyCount(sat, LANTERN)).toBe(0);
    const went = resolveCard(pend(base, 'lamp-keeper'), 1, 1).state.player;
    expect('still-lantern' in went.methods).toBe(false);
    expect(copyCount(went, LANTERN)).toBe(1);
  });

  it('teaches the deserter’s method and the first techniques, and hands the rest over as copies', () => {
    const effectsOf = (k: (typeof CARDS)[number]) =>
      k.choices.flatMap((ch) => [...ch.pass.effects, ...(ch.fail?.effects ?? [])]);
    const firstHour = CARDS.filter((k) => k.deck === 'first-hour');
    const taught = firstHour.filter(
      (k) => k.id === 'night-bridge-offer' || k.id.startsWith('first-technique-'),
    );
    expect(taught.length).toBe(7);
    for (const k of taught)
      expect(
        effectsOf(k).some((e) => e.do === 'copy'),
        k.id,
      ).toBe(false);
    // Jan's call (P2.5f): the errands' tempering art, the bounty office's torn manual and the six
    // Foundation chapters are things handed over, so copies, never a method taught.
    const handed = firstHour.filter(
      (k) =>
        k.id.startsWith('errand-') ||
        k.id === 'bounty-office-job' ||
        (k.id.startsWith('foundation-') && k.id !== 'foundation-again'),
    );
    expect(handed.length).toBe(13);
    for (const k of handed) {
      const effects = effectsOf(k);
      expect(
        effects.some((e) => e.do === 'copy'),
        k.id,
      ).toBe(true);
      expect(
        effects.some((e) => e.do === 'method'),
        k.id,
      ).toBe(false);
    }
    const copies = CARDS.flatMap((k) =>
      k.choices.flatMap((ch) => ch.pass.effects.filter((e) => e.do === 'copy')),
    );
    expect(copies.map((e) => (e.do === 'copy' ? e.id : ''))).toEqual(
      expect.arrayContaining([BREATH, TIDE, LANTERN]),
    );
  });

  it('draws a formula card no more once its copy is owned', () => {
    const k = CARDS.find((x) => x.id === 'breath-count-for-sale')!;
    expect(k.trigger.noManual).toBe('garrison-breath-count');
  });
});

describe('the life around a copy', () => {
  it('writes a line for a copy gained, opens the Trees screen and counts it as new', () => {
    const s = gainCopy(base, TIDE);
    expect(
      eventText(
        s,
        s.chronicle.find((e) => e.type === 'copy')!,
      ),
    ).toBe('Han Li comes by a copy of the Tide-Counting Formula.');
    expect(s.unlocks).toContain('trees');
    const g = gains(base, s).filter((x) => x.kind === 'copy');
    expect(g).toEqual([{ kind: 'copy', id: TIDE, count: 1, fresh: true }]);
    const again = gainCopy(s, TIDE);
    expect(gains(s, again).filter((x) => x.kind === 'copy')[0]!.count).toBe(1);
    expect(heldIds(again, 'copy')).toEqual([TIDE]);
    expect(isNew(seeAll(again), 'copy', TIDE)).toBe(false);
  });

  it('queues through the life, refusing what is known', () => {
    const taught = gainTechnique(base, 'rampart-palm');
    const s = gainCopy(taught, RAMPART);
    const r = readCopy(s, RAMPART);
    expect(r.check.ok).toBe(false);
    expect(r.state).toBe(s);
    // A new copy joins the empty queue by itself.
    expect(gainCopy(base, TIDE).player.reading.queue).toEqual([TIDE]);
  });
});

describe('save v15', () => {
  it('migrates a v14 save: no copies, nothing read, its bookcase as it was', () => {
    let s = gainTechnique(base, 'rampart-palm');
    s = { ...s, player: { ...s.player, manuals: ['tide-counting'] } };
    const raw = JSON.parse(JSON.stringify(makeSave(s, 1))) as {
      version: number;
      state: { player: Record<string, unknown>; seen: Record<string, unknown> };
    };
    delete raw.state.player.copies;
    delete raw.state.player.reading;
    delete raw.state.seen.copy;
    raw.version = 14;
    const loaded = loadSave(raw);
    expect(loaded.version).toBe(SAVE_VERSION);
    const p = loaded.state.player;
    expect(p.copies).toEqual({});
    expect(p.reading).toEqual({ queue: [], days: {}, wheel: null });
    expect(loaded.state.seen.copy).toEqual({});
    expect(bookcaseManuals(p).map((m) => m.id)).toEqual(heldManuals(p).map((m) => m.id));
    expect(p.techniques['rampart-palm']).toBeDefined();
  });

  it('round-trips a life mid-read', () => {
    let c = ownCopy(base.player, TIDE);
    c = addReading(startReading(c, TIDE).cultivator, 2.5).cultivator;
    const loaded = loadSave(makeSave(withPlayer(base, c), 1)).state.player;
    expect(loaded.copies[copyId('manual', 'tide-counting')]).toBe(1);
    expect(loaded.reading).toEqual({ queue: [TIDE], days: { [TIDE]: 2.5 }, wheel: null });
  });
});
