// P2.5f: study on the hours you set, the reading queue and how well a copy suits you (design
// § Cultivation, the day is twelve double-hours and Reading), and save v16's reading. P2.8 dropped
// the whole-wheel reading: a copy reads on the study hours the wheel holds, however few.
import { describe, expect, it } from 'vitest';
import { readDays, SUITS_CAP } from '../content/copies.ts';
import { masteryNeed } from './techniques.ts';
import { technique } from '../content/techniques.ts';
import { eventText } from './chronicle.ts';
import { cultivateDays, dayRates } from './cultivation.ts';
import { gainCopy, gainTechnique, moveRead, readCopy, unqueueRead } from './life.ts';
import {
  queueCopy,
  readingCopy,
  readingQueue,
  suitsYou,
  unqueuedCopies,
  waitsOn,
} from './reading.ts';
import { loadSave, makeSave, SAVE_VERSION } from './save/format.ts';
import { newLife, withPlayer, type Cultivator, type GameState } from './state.ts';
import { effectiveWheel } from './wheel.ts';

const SCRAP = 'method:bounty-scrap';
const TEMPERING = 'method:stone-bearing';
const BREATH = 'manual:garrison-breath-count';
const TIDE = 'manual:tide-counting';
const RAMPART = 'technique:rampart-palm';
const COLLAPSE = 'technique:rampart-collapse-palm';

const base = newLife({ name: 'Han Li', seed: 'queue' });

/** The street cultivator before the bounty office: no method on any ladder, layer 1. */
const street: GameState = withPlayer(base, {
  ...base.player,
  methods: {},
  activeMethods: { qi: null, body: null, soul: null },
});

/** Cultivates a day at a time, the way the loop runs. */
function days(c: Cultivator, n: number, from = base.calendar.day): Cultivator {
  let next = c;
  for (let i = 0; i < n; i++) {
    next = cultivateDays(next, 1, { day: from + i, rng: { next: () => 0.5 } as never }).cultivator;
  }
  return next;
}

const count = (c: Cultivator, kind: string) => effectiveWheel(c).filter((k) => k === kind).length;

describe('study on the hours you set', () => {
  it('reads the torn manual on the one study hour, the rest of the wheel left alone', () => {
    expect(street.player.qi.stage).toBeLessThan(2);
    const wheelBefore = [...street.player.wheel];
    const s = gainCopy(street, SCRAP);
    const c = s.player;
    // No shortcut fills the wheel: it is as it was, one study hour and qi on the rest.
    expect(c.wheel).toEqual(wheelBefore);
    expect(count(c, 'study')).toBe(1);
    expect(s.chronicle.map((e) => eventText(s, e))).not.toContainEqual(
      expect.stringMatching(/every waking hour/),
    );
    // A white copy, three study days, on one study hour: 36 days.
    const perDay = dayRates(c, base.calendar.day).study;
    expect(perDay).toBeCloseTo(1 / 12);
    expect(readDays(SCRAP) / perDay).toBeCloseTo(36);
    const most = days(c, 35);
    expect('bounty-scrap' in most.methods).toBe(false);
    const read = days(most, 2, base.calendar.day + 35);
    expect(read.activeMethods.qi).toBe('bounty-scrap');
    expect(read.wheel).toEqual(wheelBefore);
  });

  it('flips a kind opened while a copy is read on the wheel itself', () => {
    let s = gainCopy(street, SCRAP);
    s = gainTechnique(s, 'rampart-palm');
    expect(count(s.player, 'study')).toBe(1);
    expect(count(s.player, 'practice')).toBe(1);
  });

  it('opens body hours only once an errand’s tempering art is read', () => {
    const layer3 = withPlayer(base, { ...base.player, qi: { ...base.player.qi, stage: 3 } });
    let c = days(layer3.player, 1);
    expect(count(c, 'study')).toBe(1);
    c = gainCopy(withPlayer(layer3, c), TEMPERING).player;
    expect(c.activeMethods.body).toBeNull();
    expect(count(c, 'body')).toBe(0);
    expect(readingCopy(c)).toBe(TEMPERING);
    const need = Math.ceil(readDays(TEMPERING) / dayRates(c, base.calendar.day).study) + 1;
    c = days(c, need);
    expect(c.activeMethods.body).toBe('stone-bearing');
    expect(count(c, 'body')).toBe(1);
  });
});

describe('the reading queue', () => {
  it('starts a new copy on an empty queue by itself, with a line, and leaves a busy one alone', () => {
    const s = gainCopy(base, TIDE);
    expect(readingQueue(s.player)).toEqual([TIDE]);
    expect(s.chronicle.map((e) => eventText(s, e))).toContain(
      'Han Li begins reading the Tide-Counting Formula.',
    );
    const two = gainCopy(s, BREATH);
    expect(readingQueue(two.player)).toEqual([TIDE]);
    expect(unqueuedCopies(two.player)).toEqual([BREATH]);
    const r = readCopy(two, BREATH);
    expect(r.check.ok).toBe(true);
    expect(readingQueue(r.state.player)).toEqual([TIDE, BREATH]);
    expect(readCopy(r.state, BREATH).check).toEqual({
      ok: false,
      reason: 'It is in the queue already.',
    });
  });

  it('reads three in order, skipping a next chapter until the one before is at Comprehension', () => {
    let s = gainTechnique(base, 'rampart-palm');
    s = gainCopy(s, COLLAPSE);
    s = gainCopy(s, BREATH);
    s = readCopy(s, BREATH).state;
    s = gainCopy(s, TIDE);
    s = readCopy(s, TIDE).state;
    let c = s.player;
    expect(readingQueue(c)).toEqual([COLLAPSE, BREATH, TIDE]);
    expect(waitsOn(c, COLLAPSE)).toMatch(/Rampart Palm at Comprehension/);
    // The head waits, so the breath-count is read first.
    expect(readingCopy(c)).toBe(BREATH);
    c = moveRead(withPlayer(s, c), TIDE, -1).player;
    expect(readingQueue(c)).toEqual([COLLAPSE, TIDE, BREATH]);
    expect(readingCopy(c)).toBe(TIDE);
    // Rampart Palm reaches Comprehension: the chapter at the head is read next.
    const palm = technique('rampart-palm');
    c = { ...c, techniques: { ...c.techniques, [palm.id]: { practice: masteryNeed(palm, 1) } } };
    expect(waitsOn(c, COLLAPSE)).toBeNull();
    expect(readingCopy(c)).toBe(COLLAPSE);
  });

  it('moves on to the next readable copy when one is done, and keeps each copy’s progress', () => {
    let c = gainCopy(gainCopy(street, BREATH), TIDE).player;
    c = queueCopy(c, TIDE).cultivator;
    c = { ...c, reading: { ...c.reading, days: { [TIDE]: 2 } } };
    expect(readingCopy(c)).toBe(BREATH);
    // One study hour: a twelfth of a study day a day, so the three-day formula takes 36.
    const read = days(c, 36);
    expect(read.manuals).toContain('garrison-breath-count');
    expect(readingQueue(read)).toEqual([TIDE]);
    expect(readingCopy(read)).toBe(TIDE);
    expect(read.reading.days[TIDE]).toBe(2);
  });

  it('refuses a copy known already, and takes one out without losing its days', () => {
    const taught = gainTechnique(base, 'rampart-palm');
    expect(readCopy(gainCopy(taught, RAMPART), RAMPART).check.ok).toBe(false);
    let s = gainCopy(base, TIDE);
    s = withPlayer(s, { ...s.player, reading: { ...s.player.reading, days: { [TIDE]: 3 } } });
    const out = unqueueRead(s, TIDE).player;
    expect(readingQueue(out)).toEqual([]);
    expect(out.reading.days[TIDE]).toBe(3);
  });
});

describe('suits you', () => {
  it('is ×1 with no reason, and says each reason it finds', () => {
    expect(suitsYou(base.player, BREATH)).toEqual({ total: 1, reasons: [], capped: false });
    const earth = { ...base.player, rootElements: ['earth' as const] };
    const tempering = suitsYou(earth, TEMPERING);
    expect(tempering.total).toBeCloseTo(1.25);
    expect(tempering.reasons[0]!.label).toMatch(/Earth/);
  });

  it('reads a method by its fit to the root', () => {
    const mutated = { ...base.player, root: 'mutated' as const, rootElements: ['ice' as const] };
    expect(suitsYou(mutated, SCRAP).total).toBeCloseTo(0.6);
  });

  it('lifts a technique with a kin at Comprehension, and caps the product at ×1.5', () => {
    const fist = technique('sinkhole-stone-fist');
    let c = gainTechnique(base, 'sinkhole-stone-fist').player;
    c = { ...c, techniques: { ...c.techniques, [fist.id]: { practice: masteryNeed(fist, 1) } } };
    const kin = suitsYou(c, RAMPART);
    expect(kin.reasons.map((r) => r.label)).toContain('kin to Sinkhole Stone Fist');
    expect(kin.total).toBeCloseTo(1.25);
  });

  it('caps the product at ×1.5', () => {
    // Sinkhole Stone Fist, with Rampart Palm at Comprehension as its kin and earth in the root:
    // ×1.25 kin and ×1.25 earth make ×1.5625, read at ×1.5.
    const palm = technique('rampart-palm');
    let c = gainTechnique(base, 'rampart-palm').player;
    c = { ...c, techniques: { ...c.techniques, [palm.id]: { practice: masteryNeed(palm, 1) } } };
    const fist = suitsYou({ ...c, rootElements: ['earth'] }, 'technique:sinkhole-stone-fist');
    expect(fist.reasons.map((r) => r.factor)).toEqual([1.25, 1.25]);
    expect(fist.capped).toBe(true);
    expect(fist.total).toBe(SUITS_CAP);
  });
});

describe('save v16', () => {
  it('moves an old life’s technique into the first slot and its copy to the head of the queue', () => {
    const s = gainCopy(gainTechnique(base, 'rampart-palm'), TIDE);
    const raw = JSON.parse(JSON.stringify(makeSave(s, 1))) as {
      version: number;
      state: { player: Record<string, unknown> };
    };
    raw.version = 15;
    raw.state.player.practicing = 'rampart-palm';
    raw.state.player.reading = { copy: TIDE, days: { [TIDE]: 1.5 } };
    const loaded = loadSave(raw);
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.state.player.practicing).toEqual(['rampart-palm']);
    expect(loaded.state.player.reading).toEqual({ queue: [TIDE], days: { [TIDE]: 1.5 } });
    raw.state.player.practicing = null;
    raw.state.player.reading = { copy: null, days: {} };
    const none = loadSave(raw).state.player;
    expect(none.practicing).toEqual([]);
    expect(none.reading.queue).toEqual([]);
    // A technique already at Origin can sit in no slot, so it stays out.
    const palm = technique('rampart-palm');
    raw.state.player.practicing = palm.id;
    raw.state.player.techniques = { [palm.id]: { practice: masteryNeed(palm, 4) } };
    expect(loadSave(raw).state.player.practicing).toEqual([]);
  });
});
