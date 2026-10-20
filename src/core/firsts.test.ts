// P2.8: you do it the first time (design § UI and screens). The lineage's record of first times,
// each first switched off until the player does it and the default after it, a reborn life walked
// through nothing, and save v18's record of what an old life has passed.
import { describe, expect, it } from 'vitest';
import { FRESH_WHEEL, type HourKind } from '../content/hours.ts';
import { playDay } from './cards.ts';
import { eventText } from './chronicle.ts';
import { createLife, createNextLife, type Creation } from './creation.ts';
import { ALL_FIRSTS, firstsPassed, firstsWaiting, noteFirsts } from './firsts.ts';
import {
  gainMethod,
  gainTechnique,
  giveHours,
  learn,
  playFirsts,
  practice,
  readCopy,
  setPlan,
  switchMethod,
} from './life.ts';
import { advance } from './loop.ts';
import { loadSave, makeSave, SAVE_VERSION } from './save/format.ts';
import { newLife, withPlayer, type GameState } from './state.ts';
import { stopPractice } from './techniques.ts';
import { freeWheel, hourToFlip } from './wheel.ts';

const METHOD = 'method:garrison-standard';

const creation = (over: Partial<Creation> = {}): Creation => ({
  name: 'Han Li',
  pronouns: 'they/them',
  look: '',
  mode: 'ironman',
  seed: 'firsts',
  choice: 'along',
  roll: {
    root: 'true',
    elements: ['wood', 'fire'],
    body: 'farmhands-frame',
    soul: 'plain-mind',
    fate: 'ordinary-fate',
    origin: 'cave-orphan',
  },
  ...over,
});

/** Some real minutes of play, the cards left waiting. */
const run = (s: GameState, minutes: number): GameState =>
  advance(s, minutes * 60_000, { step: (x, d, ctx) => playDay(x, d, ctx) }).state;

const hours = (s: GameState, kind: HourKind) => s.player.wheel.filter((k) => k === kind).length;
const waiting = (s: GameState) => firstsWaiting(s).map((w) => w.hint);

/** Turns the qi hour the default rule would pick to a kind of work. */
const give = (s: GameState, kind: HourKind): GameState =>
  giveHours(s, [hourToFlip(freeWheel(s.player), s.player.rootElements)!], kind).state;

describe('a new lineage', () => {
  it('starts all qi with its method unread, and nothing moves until it is read and taken up', () => {
    let s = createLife(creation());
    expect(s.player.wheel).toEqual(FRESH_WHEEL);
    expect(s.player.copies[METHOD]).toBe(1);
    expect(s.player.reading.queue).toEqual([]);
    expect(s.player.plan.burnStones).toBe(false);
    expect(waiting(s)).toEqual(['copy', 'study-hour']);
    // Left alone, nothing is read and the qi hours give nothing.
    s = run(s, 3);
    expect(s.player.reading.days[METHOD] ?? 0).toBe(0);
    expect(s.player.qi.bar).toBe(0);
    // Read now queues it, but with no study hour it still waits.
    s = readCopy(s, METHOD).state;
    expect(s.lineage.firsts).toContain('copy');
    expect(waiting(s)).toEqual(['study-hour']);
    s = run(s, 1);
    expect(s.player.reading.days[METHOD] ?? 0).toBe(0);
    // An hour turned to study reads it; read, the method is known but nothing climbs with it.
    s = give(s, 'study');
    expect(s.lineage.firsts).toContain('study-hour');
    s = run(s, 10);
    expect('garrison-standard' in s.player.methods).toBe(true);
    expect(s.player.activeMethods.qi).toBeNull();
    expect(waiting(s)).toContain('method');
    const bar = s.player.qi.bar;
    s = run(s, 1);
    expect(s.player.qi.bar).toBe(bar);
    // Taken up under Climb with, the qi climbs.
    s = switchMethod(s, 'qi', 'garrison-standard').state;
    expect(s.lineage.firsts).toContain('method');
    expect(waiting(s)).not.toContain('method');
    s = run(s, 1);
    expect(s.player.qi.bar).toBeGreaterThan(bar);
  });

  it('gives a technique no slot and no hour the first time, then the default after it', () => {
    let s = playFirsts(createLife(creation()));
    s = gainTechnique(s, 'rampart-palm');
    expect(s.player.practicing).toEqual([]);
    expect(hours(s, 'practice')).toBe(0);
    // Its kind of hour opens, saying to give it one.
    const line = s.chronicle.findLast((e) => e.type === 'hours')!;
    expect(eventText(s, line)).toMatch(/Give it an hour on the wheel\.$/);
    expect(waiting(s)).toContain('technique');
    s = practice(s, 'rampart-palm').state;
    expect(waiting(s)).toContain('technique-hour');
    expect(s.lineage.firsts).not.toContain('technique');
    s = give(s, 'practice');
    expect(s.lineage.firsts).toContain('technique');
    expect(waiting(s)).not.toContain('technique-hour');
    // After the first, an empty slot takes the next technique learned by itself.
    s = withPlayer(s, stopPractice(s.player, 'rampart-palm'));
    s = gainTechnique(s, 'sinkhole-stone-fist');
    expect(s.player.practicing).toEqual(['sinkhole-stone-fist']);
  });

  it('leaves an art untaken and hourless the first time, and takes up the second by itself', () => {
    let s = playFirsts(createLife(creation()));
    s = gainMethod(s, 'stone-bearing');
    expect(s.player.activeMethods.body).toBeNull();
    expect(hours(s, 'body')).toBe(0);
    expect(waiting(s)).toContain('art');
    s = switchMethod(s, 'body', 'stone-bearing').state;
    // Taken up, its hours open without one flipped: the player gives it its hour.
    expect(hours(s, 'body')).toBe(0);
    expect(firstsWaiting(s).find((w) => w.first === 'art')).toMatchObject({
      hint: 'art-hour',
      ladder: 'body',
    });
    s = give(s, 'body');
    expect(s.lineage.firsts).toContain('art');
    // The soul's art, after: taken up with an hour flipped, as the defaults do.
    s = gainMethod(s, 'still-lantern');
    expect(s.player.activeMethods.soul).toBe('still-lantern');
    expect(hours(s, 'soul')).toBe(1);
  });

  it('waits on stones worth burning from layer 2, and a node within reach', () => {
    let s = playFirsts(createLife(creation()));
    // Stones in the pouch wait for the second layer, after the method and the orbs.
    expect(s.player.stones).toBeGreaterThanOrEqual(5);
    expect(s.player.plan.burnStones).toBe(false);
    s = withPlayer(s, { ...s.player, qi: { ...s.player.qi, stage: 2 } });
    expect(waiting(s)).toContain('stones');
    s = playFirsts(s);
    expect(s.player.plan.burnStones).toBe(true);
    expect(s.lineage.firsts).toContain('stones');
    // Insight enough to open the Trees isn't yet a nudge to buy: the node waits from 50.
    s = withPlayer(s, { ...s.player, insight: { current: 40, earned: 40 } });
    expect(waiting(s)).not.toContain('node');
    s = withPlayer(s, { ...s.player, insight: { current: 50, earned: 50 } });
    expect(waiting(s)).toContain('node');
    s = learn(s, 'qi-sensing-breath').state;
    expect(s.lineage.firsts).toContain('node');
    expect(waiting(s)).not.toContain('node');
    // A life with no stones to speak of isn't asked to burn them.
    const poor = createLife(creation({ choice: 'refuse' }));
    expect(poor.player.stones).toBeLessThan(5);
    expect(waiting(poor)).not.toContain('stones');
  });

  it('keeps the record on the lineage, and notes it once', () => {
    const s = createLife(creation());
    expect(noteFirsts(s)).toBe(s);
    const set = setPlan(s, { burnStones: true });
    expect(set.lineage.firsts).toEqual(['stones']);
    expect(noteFirsts(set)).toBe(set);
    expect(firstsPassed(set.player)).toEqual(['stones']);
  });
});

describe('a reborn life', () => {
  it('gets no first times: its method queued, a study hour set, stones burning', () => {
    const done = { ...playFirsts(createLife(creation())), ended: { day: 0, cause: 'test' } };
    const all = {
      ...done,
      lineage: { ...done.lineage, firsts: [...ALL_FIRSTS] },
      hints: { on: false, shown: ['orbs'] },
    };
    const next = createNextLife(all, creation({ seed: 'firsts-2' }));
    expect(next.lineage.life).toBe(2);
    expect(next.lineage.firsts).toEqual(ALL_FIRSTS);
    // Hints are each life's own: on again, none shown.
    expect(next.hints).toEqual({ on: true, shown: [] });
    expect(next.player.reading.queue).toEqual([METHOD]);
    expect(hours(next, 'study')).toBe(1);
    expect(next.player.plan.burnStones).toBe(true);
    expect(firstsWaiting(next)).toEqual([]);
    // Read, the method is taken up by itself.
    const read = run(next, 10);
    expect(read.player.activeMethods.qi).toBe('garrison-standard');
  });

  it('runs NPCs and tests on the defaults: a life made without creation has done every first', () => {
    const s = newLife({ name: 'Elder Mo' });
    expect(s.lineage.firsts).toEqual(ALL_FIRSTS);
    expect(hours(s, 'study')).toBe(1);
    expect(firstsWaiting(s)).toEqual([]);
  });
});

describe('save v18', () => {
  /** A save of the state as v17 had it: no record, and maybe a wheel put aside by a first copy. */
  function v17(s: GameState, aside: HourKind[] | null = null) {
    const raw = JSON.parse(JSON.stringify(makeSave(s, 1))) as {
      version: number;
      state: { lineage: Record<string, unknown>; player: Record<string, unknown>; hints?: unknown };
    };
    raw.version = 17;
    delete raw.state.lineage.firsts;
    delete raw.state.hints;
    const reading = raw.state.player.reading as Record<string, unknown>;
    raw.state.player.reading = { ...reading, wheel: aside };
    return raw;
  }

  it('v19 keeps the hints with the life: on, with the ones the lineage was shown', () => {
    const s = newLife({ name: 'Han Li', seed: 'v19' });
    const raw = JSON.parse(JSON.stringify(makeSave(s, 1))) as {
      version: number;
      state: Record<string, unknown> & { lineage: Record<string, unknown> };
    };
    raw.version = 18;
    delete raw.state.hints;
    raw.state.lineage.hints = ['copy', 'cards'];
    const loaded = loadSave(raw).state;
    expect(loaded.hints).toEqual({ on: true, shown: ['copy', 'cards'] });
    expect('hints' in loaded.lineage).toBe(false);
  });

  it('counts every first an old life has passed as done, and nothing else changes', () => {
    let s = newLife({ name: 'Han Li', seed: 'v18', techniques: ['rampart-palm'] });
    s = setPlan(s, { burnStones: true });
    s = withPlayer(s, { ...s.player, flags: [...s.player.flags, 'drew-orb'] });
    const loaded = loadSave(v17(s)).state;
    expect(loaded.player.wheel).toEqual(s.player.wheel);
    expect(loaded.player.reading).toEqual({ queue: [], days: {} });
    expect(loaded.lineage.firsts).toEqual(['study-hour', 'method', 'technique', 'stones']);
    expect(loaded.hints).toEqual({ on: true, shown: ['orbs'] });
    expect('hints' in loaded.lineage).toBe(false);
    expect(loadSave(makeSave(loaded, 2)).version).toBe(SAVE_VERSION);
  });

  it('gives back a wheel put aside by a first copy, with a study hour', () => {
    const s = newLife({ name: 'Han Li', seed: 'v18-aside', method: null });
    const study = s.player.wheel.map((k) => (k === 'sleep' ? k : 'study'));
    const all = withPlayer(s, { ...s.player, wheel: study });
    const loaded = loadSave(v17(all, [...FRESH_WHEEL])).state;
    expect(loaded.player.wheel.filter((k) => k === 'study')).toHaveLength(1);
    expect(loaded.player.wheel.filter((k) => k === 'qi')).toHaveLength(9);
    expect(loaded.lineage.firsts).toContain('study-hour');
    expect(loaded.lineage.firsts).not.toContain('method');
  });
});
