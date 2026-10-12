import { describe, expect, it } from 'vitest';
import { BAR_CAP, ladderGateItem, UNSETTLED_DAYS } from '../content/cultivation.ts';
import { method } from '../content/methods.ts';
import { realmScale, stepSize } from '../content/realms.ts';
import {
  attemptBreakthrough,
  autoWouldAttempt,
  barFill,
  cultivateDays,
  dayRates,
  gradeFor,
  lastChance,
  majorCheck,
  minorOdds,
  overfillBonus,
  qiSpeed,
  type LadderId,
} from './cultivation.ts';
import { attemptLastChance, breakThrough, cultivate } from './life.ts';
import { advance } from './loop.ts';
import { learnMethod, methodNeed, setActiveMethod } from './methods.ts';
import { Rng } from './rng.ts';
import {
  addItem,
  lifespanEdgeDay,
  newLife,
  nextLife,
  withPlayer,
  type Cultivator,
  type GameState,
  type Ladder,
} from './state.ts';

type LifeOpts = Partial<Parameters<typeof newLife>[0]>;

const life = (opts: LifeOpts = {}) => newLife({ name: 'Han Li', seed: 'test', ...opts });
/** Puts every known method at Mastery, where its speed is ×1, so a test sees the rest of the sum. */
const mastered = (c: Cultivator): Cultivator => ({
  ...c,
  methods: Object.fromEntries(
    Object.entries(c.methods).map(([id, r]) => [id, { ...r, practice: methodNeed(method(id), 2) }]),
  ),
});
const player = (opts: LifeOpts = {}) => mastered(life(opts).player);

/** Qi at Foundation on the garrison method's Foundation chapter, since the first runs out there. */
function atFoundation(c: Cultivator): Cultivator {
  const chapter = setActiveMethod(
    learnMethod(c, 'garrison-standard-foundation'),
    'qi',
    'garrison-standard-foundation',
  );
  return at(mastered(chapter.cultivator), 'qi', { realm: 'foundation-establishment' });
}
const DAY = life().calendar.day;
const ctx = (seed = 0, day = DAY) => ({ day, rng: new Rng(seed) });

function at(c: Cultivator, which: LadderId, l: Partial<Ladder>): Cultivator {
  return { ...c, [which]: { ...c[which], ...l } };
}

/** Fills a ladder's bar to `fill` of its current step. */
function filled(c: Cultivator, which: LadderId, fill: number): Cultivator {
  const l = c[which];
  return at(c, which, { bar: stepSize(l.realm, l.stage) * fill });
}

/** Qi at the peak of Qi Condensation. */
function atLayer9(opts: LifeOpts = {}): Cultivator {
  return at(player(opts), 'qi', { stage: 9 });
}

/** Ready for Foundation: a full bar, the insight and the pill. */
function readyForFoundation(fill = 1, opts: LifeOpts = {}): Cultivator {
  return addItem(
    { ...filled(atLayer9(opts), 'qi', fill), insight: { current: 0, earned: 500 } },
    'foundation-pill',
    1,
  );
}

const step = (c: Cultivator, days: number) => cultivateDays(c, days, ctx()).cultivator;

describe('qi speed', () => {
  it('ignores root speed and fit in layers 1 to 3', () => {
    expect(qiSpeed(player({ root: 'heavenly' })).total).toBe(1);
    expect(qiSpeed(at(player({ root: 'mixed' }), 'qi', { stage: 3 })).total).toBe(1);
  });

  it('multiplies root speed, method fit and Aptitude from layer 4', () => {
    expect(qiSpeed(at(player({ root: 'heavenly' }), 'qi', { stage: 4 })).total).toBe(2.5);
    // Common methods fit mutated roots poorly: ×2.0 × 0.6.
    expect(qiSpeed(at(player({ root: 'mutated' }), 'qi', { stage: 4 })).total).toBeCloseTo(1.2);
    // Each Aptitude point above 10 is worth 5%.
    expect(qiSpeed(at(player({ aptitude: 12 }), 'qi', { stage: 4 })).total).toBeCloseTo(1.1);
  });

  it('gives nothing without a method', () => {
    const c = player({ method: null });
    expect(qiSpeed(c).total).toBe(0);
    expect(step(c, 1).qi.bar).toBe(0);
  });
});

describe('stones as fuel', () => {
  it('doubles a day of qi at five stones a full day of qi hours, fewer with fewer hours', () => {
    const c = { ...player(), stones: 100 };
    const plain = step({ ...c, stones: 0 }, 1);
    const fuelled = step(c, 1);
    // A fresh wheel has ten qi hours of twelve, so the day takes five-sixths of five stones.
    expect(fuelled.stones).toBeCloseTo(100 - (5 * 10) / 12);
    expect(fuelled.qi.bar).toBeCloseTo(plain.qi.bar * 2);
    const allQi = { ...c, wheel: c.wheel.map(() => 'qi' as const) };
    expect(dayRates(atFoundation(allQi), DAY).stoneCap).toBe(45);
  });

  it('is worth a ninth as much at Foundation, where a full burn takes nine times the stones', () => {
    const c = atFoundation({ ...player(), stones: 1000 });
    // Layer 4 is past the tutorial too, so both count the same element hours.
    const qc = dayRates(at(player(), 'qi', { stage: 4 }), DAY);
    const r = dayRates(c, DAY);
    expect(r.stoneCap).toBeCloseTo(9 * qc.stoneCap);
    expect(r.qiPerStone).toBeCloseTo(qc.qiPerStone);
    expect(r.qi).toBeCloseTo(9 * qc.qi);
  });

  it('keeps stones when burning is off or the bar is capped', () => {
    const c = { ...player(), stones: 10 };
    const off = { ...c, plan: { ...c.plan, burnStones: false } };
    expect(step(off, 1).stones).toBe(10);
    expect(step(filled(c, 'qi', BAR_CAP), 1).stones).toBe(10);
  });
});

describe('minor breakthroughs', () => {
  it('raises the odds a step for each whole 10% past full', () => {
    expect(overfillBonus(1)).toBe(0);
    expect(overfillBonus(1.19)).toBeCloseTo(0.07);
    expect(overfillBonus(1.5)).toBeCloseTo(0.35);
    const l3 = at(player(), 'qi', { stage: 2 });
    expect(minorOdds(filled(l3, 'qi', 0.99), 'qi')).toBe(0);
    expect(minorOdds(filled(l3, 'qi', 1), 'qi')).toBeCloseTo(0.75);
    expect(minorOdds(filled(l3, 'qi', 1.3), 'qi')).toBeCloseTo(0.96);
  });

  it('always succeeds into layer 2, and flares the glass', () => {
    expect(minorOdds(filled(player(), 'qi', 1), 'qi')).toBe(1);
    const s = life();
    const r = breakThrough(withPlayer(s, filled(s.player, 'qi', 1)), 'qi');
    expect(r.success).toBe(true);
    expect(r.state.player.qi).toMatchObject({ stage: 2, bar: 0 });
    expect(r.state.glass).toMatchObject({ fractures: 1, flares: 1 });
  });

  it('caps the bar at 150%', () => {
    // Layer 1 always succeeds, so the auto setting takes it; check the cap on a held bar instead.
    expect(step(filled(player(), 'qi', 1.49), 30).qi.stage).toBe(2);
    const held = filled(at(player(), 'qi', { stage: 2 }), 'qi', 1.49);
    const off = { ...held, plan: { ...held.plan, auto: 'off' as const } };
    expect(barFill(step(off, 1).qi)).toBeCloseTo(BAR_CAP);
  });

  it('runs on the auto setting: safe waits for 90% or the cap, off never', () => {
    const c = filled(at(player(), 'qi', { stage: 2 }), 'qi', 1.1);
    expect(autoWouldAttempt(c, 'qi')).toBe(false);
    expect(autoWouldAttempt(filled(c, 'qi', 1.3), 'qi')).toBe(true);
    expect(autoWouldAttempt({ ...c, plan: { ...c.plan, auto: 'bold' } }, 'qi')).toBe(true);
    const off = filled({ ...c, plan: { ...c.plan, auto: 'off' } }, 'qi', BAR_CAP);
    expect(autoWouldAttempt(off, 'qi')).toBe(false);
  });

  it('costs a fifth of the bar and a few unsettled days on a failure', () => {
    const c = filled(at(player(), 'qi', { stage: 2 }), 'qi', 1);
    // Search seeds for a failure at 75%.
    const failed = Array.from({ length: 50 }, (_, i) => attemptBreakthrough(c, 'qi', ctx(i))).find(
      (r) => !r.success,
    )!;
    expect(failed).toBeDefined();
    const f = failed.cultivator;
    expect(barFill(f.qi)).toBeCloseTo(0.8);
    expect(f.qi.unsettledUntil).toBeCloseTo(DAY + UNSETTLED_DAYS);
    expect(f.qi.injuredUntil).toBe(0);
    // Unsettled qi gains nothing.
    expect(dayRates(f, DAY).qi).toBe(0);
  });

  it('replays the same roll from the same seed', () => {
    const c = filled(at(player(), 'qi', { stage: 5 }), 'qi', 1);
    expect(attemptBreakthrough(c, 'qi', ctx(7))).toEqual(attemptBreakthrough(c, 'qi', ctx(7)));
    const s = withPlayer(life(), c);
    expect(breakThrough(s, 'qi')).toEqual(breakThrough(s, 'qi'));
  });
});

describe('major breakthroughs', () => {
  it('need a full bar, the insight threshold and the Foundation Pill', () => {
    let c = filled(atLayer9(), 'qi', 1);
    const check = () => majorCheck(c, 'qi')!;
    expect(check()).toMatchObject({ bar: true, insight: false, gate: false, ready: false });
    c = { ...c, insight: { current: 0, earned: 500 } };
    expect(check()).toMatchObject({ insight: true, gate: false, ready: false });
    c = addItem(c, 'foundation-pill', 1);
    expect(check().ready).toBe(true);
    expect(attemptBreakthrough(filled(c, 'qi', 0.99), 'qi', ctx()).attempted).toBe(false);
  });

  it('never happen on their own, online or off', () => {
    const c = { ...readyForFoundation(1.5), insight: { current: 0, earned: 5000 } };
    const s = withPlayer(life(), c);
    for (const offline of [true, false]) {
      const after = advance(s, 3_600_000, { step: cultivate, offline }).state;
      expect(after.player.qi.realm).toBe('qi-condensation');
      expect(after.player.items['foundation-pill']).toBe(1);
    }
  });

  it('grade by the margin you bring', () => {
    const base = readyForFoundation();
    expect(majorCheck(base, 'qi')).toMatchObject({ score: 0, grade: 'flawed' });
    const full = at(
      at({ ...filled(base, 'qi', 1.5), insight: { current: 0, earned: 1000 } }, 'body', {
        realm: 'foundation-establishment',
      }),
      'soul',
      { realm: 'foundation-establishment' },
    );
    expect(majorCheck(full, 'qi')).toMatchObject({ score: 4, grade: 'perfect' });
    expect(gradeFor(4, true)).toBe('heavenly');
    expect(gradeFor(1, false)).toBe('ordinary');
    expect(majorCheck(full, 'qi')!.odds).toBeGreaterThan(majorCheck(base, 'qi')!.odds);
  });

  it('use the pill either way; success moves the realm, failure halves the bar and injures', () => {
    const c = readyForFoundation();
    const results = Array.from({ length: 40 }, (_, i) => attemptBreakthrough(c, 'qi', ctx(i)));
    const win = results.find((r) => r.success)!.cultivator;
    const loss = results.find((r) => !r.success)!.cultivator;
    expect(win.qi).toMatchObject({ realm: 'foundation-establishment', stage: 1, bar: 0 });
    expect(win.qi.grades).toEqual(['flawed']);
    expect(win.items['foundation-pill']).toBe(0);
    expect(loss.items['foundation-pill']).toBe(0);
    expect(barFill(loss.qi)).toBeCloseTo(0.5);
    expect(loss.qi.injuredUntil).toBeGreaterThan(DAY + 360);
  });

  it("refill gentle mode's rewind charge", () => {
    const c = { ...readyForFoundation(1.5), insight: { current: 0, earned: 900 } };
    const win = Array.from({ length: 20 }, (_, i) => {
      const s: GameState = { ...withPlayer(life({ mode: 'gentle' }), c), rewindCharges: 0 };
      return breakThrough({ ...s, rng: { breakthrough: i } }, 'qi');
    }).find((r) => r.success)!;
    expect(win.state.rewindCharges).toBe(1);
  });

  it('let body run at most one realm ahead of qi, with a gate item the world does not supply yet', () => {
    const c = { ...player(), insight: { current: 0, earned: 1e6 } };
    const bodyFE = filled(
      at(c, 'body', { realm: 'foundation-establishment', stage: 4 }),
      'body',
      1,
    );
    expect(majorCheck(bodyFE, 'body')).toMatchObject({ cap: false, ready: false });
    const bodyQC = filled(at(c, 'body', { stage: 9 }), 'body', 1);
    // In M1 no body gate item exists, so the body stops at layer 9.
    expect(majorCheck(bodyQC, 'body')).toMatchObject({ cap: true, gate: false, ready: false });
    const gated = addItem(bodyQC, ladderGateItem('body', 'foundation-establishment'), 1);
    expect(majorCheck(gated, 'body')).toMatchObject({ gate: true, ready: true });
  });
});

describe('the lifespan edge', () => {
  const edge = (c: Cultivator, opts: LifeOpts = {}) => {
    const s = withPlayer(life(opts), c);
    return { ...s, calendar: { day: lifespanEdgeDay(c) } };
  };

  it('offers a last chance below a full bar with the pill, at worse odds', () => {
    const s = edge(readyForFoundation(0.5));
    const lc = lastChance(s.player);
    expect(lc.possible).toBe(true);
    expect(lc.odds).toBeCloseTo(0.55 * 0.5 * 0.6);
    const results = Array.from({ length: 40 }, (_, i) =>
      attemptLastChance({ ...s, rng: { breakthrough: i } }),
    );
    const win = results.find((r) => r.success)!;
    expect(win.state.player.qi.grades).toEqual(['flawed']);
    expect(win.state.ended).toBeNull();
    expect(advance(win.state, 60_000).days).toBeGreaterThan(0);
    const loss = results.find((r) => !r.success)!;
    expect(loss.state.ended).toMatchObject({ cause: 'lifespan' });
  });

  it('ends the life without the pill, and the clock stops', () => {
    const s = edge(at(player(), 'qi', { stage: 7 }));
    expect(lastChance(s.player).possible).toBe(false);
    const r = attemptLastChance(s);
    expect(r.state.ended).not.toBeNull();
    expect(r.state.chronicle.at(-1)?.type).toBe('death');
    expect(advance(r.state, 3_600_000, { step: cultivate }).days).toBe(0);
  });

  it('starts a new life in the slot with the chronicle kept and nothing else', () => {
    const dead = attemptLastChance(edge(at({ ...player(), stones: 50 }, 'qi', { stage: 7 }))).state;
    const next = nextLife(dead, { name: 'Lin Mo' });
    expect(next.lineage.life).toBe(2);
    expect(next.calendar.day).toBe(dead.calendar.day);
    expect(next.player.stones).toBe(0);
    expect(next.player.qi.stage).toBe(1);
    expect(next.ended).toBeNull();
    expect(next.chronicle.length).toBe(dead.chronicle.length + 1);
  });
});

describe('the realm curve', () => {
  it('scales qi needs by about 9x into Foundation and 30x more into Core Formation', () => {
    expect(realmScale('qi-condensation')).toBe(1);
    expect(realmScale('foundation-establishment')).toBe(9);
    expect(realmScale('core-formation')).toBe(270);
    expect(realmScale('nascent-soul')).toBe(27_000);
  });
});
