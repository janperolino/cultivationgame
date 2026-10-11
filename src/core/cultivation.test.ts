import { describe, expect, it } from 'vitest';
import { BAR_CAP, UNSETTLED_DAYS } from '../content/cultivation.ts';
import { realmScale, stepSize } from '../content/realms.ts';
import {
  attemptBreakthrough,
  attemptLastChance,
  autoWouldAttempt,
  barFill,
  cultivate,
  dayRates,
  dayShares,
  gradeFor,
  lastChance,
  majorCheck,
  minorOdds,
  overfillBonus,
  qiSpeed,
} from './cultivation.ts';
import { advance } from './loop.ts';
import {
  addItem,
  lifespanEdgeDay,
  newLife,
  nextLife,
  type GameState,
  type Ladder,
} from './state.ts';

const life = (opts: Partial<Parameters<typeof newLife>[0]> = {}) =>
  newLife({ name: 'Han Li', seed: 'test', ...opts });

function at(s: GameState, which: 'qi' | 'body' | 'soul', l: Partial<Ladder>): GameState {
  return { ...s, [which]: { ...s[which], ...l } };
}

/** Fills a ladder's bar to `fill` of its current step. */
function filled(s: GameState, which: 'qi' | 'body' | 'soul', fill: number): GameState {
  const l = s[which];
  return at(s, which, { bar: stepSize(l.realm, l.stage) * fill });
}

/** Qi at the peak of Qi Condensation, with every slot open. */
function atLayer9(opts: Partial<Parameters<typeof newLife>[0]> = {}): GameState {
  const s = life(opts);
  return {
    ...at(s, 'qi', { stage: 9 }),
    unlocks: [...s.unlocks, 'seclusion-body', 'seclusion-soul', 'seclusion-study'],
  };
}

describe('the seclusion plan', () => {
  it('shares each day among the open slots', () => {
    const s = life();
    expect(dayShares(s)).toEqual({ qi: 1, body: 0, soul: 0, study: 0, practice: 0 });
    const open = atLayer9();
    const shares = dayShares(open);
    expect(shares.qi).toBeCloseTo(60 / 95);
    expect(shares.body).toBeCloseTo(15 / 95);
    expect(shares.practice).toBe(0);
  });

  it('opens body and study at layer 2 and soul halfway through it', () => {
    let s = at(life(), 'qi', { stage: 2 });
    s = cultivate(s, 0.01, { offline: false });
    expect(s.unlocks).toEqual(expect.arrayContaining(['seclusion-body', 'seclusion-study']));
    expect(s.unlocks).not.toContain('seclusion-soul');
    s = cultivate(filled(s, 'qi', 0.5), 0.01, { offline: false });
    expect(s.unlocks).toContain('seclusion-soul');
  });
});

describe('qi speed', () => {
  it('ignores root speed and fit in layers 1 to 3', () => {
    expect(qiSpeed(life({ root: 'heavenly' })).total).toBe(1);
    expect(qiSpeed(at(life({ root: 'mixed' }), 'qi', { stage: 3 })).total).toBe(1);
  });

  it('multiplies root speed, method fit and Aptitude from layer 4', () => {
    expect(qiSpeed(at(life({ root: 'heavenly' }), 'qi', { stage: 4 })).total).toBe(2.5);
    // Common methods fit mutated roots poorly: ×2.0 × 0.6.
    expect(qiSpeed(at(life({ root: 'mutated' }), 'qi', { stage: 4 })).total).toBeCloseTo(1.2);
    // Each Aptitude point above 10 is worth 5%.
    expect(qiSpeed(at(life({ aptitude: 12 }), 'qi', { stage: 4 })).total).toBeCloseTo(1.1);
  });

  it('gives nothing without a method', () => {
    const s = life({ method: null });
    expect(qiSpeed(s).total).toBe(0);
    expect(cultivate(s, 1, { offline: false }).qi.bar).toBe(0);
  });
});

describe('stones as fuel', () => {
  it('doubles a day of qi at five stones and burns no more', () => {
    const s = { ...life(), stones: 100 };
    const plain = cultivate({ ...s, stones: 0 }, 1, { offline: false });
    const fuelled = cultivate(s, 1, { offline: false });
    expect(fuelled.stones).toBeCloseTo(95);
    expect(fuelled.qi.bar).toBeCloseTo(plain.qi.bar * 2);
  });

  it('is worth a ninth as much at Foundation, where a full burn takes 45', () => {
    const s = at({ ...life(), stones: 1000 }, 'qi', { realm: 'foundation-establishment' });
    const r = dayRates(s);
    expect(r.stoneCap).toBeCloseTo(45);
    expect(r.qiPerStone).toBeCloseTo(dayRates(life()).qiPerStone);
    expect(r.qi).toBeCloseTo(9 * dayRates(life()).qi);
  });

  it('keeps stones when burning is off or the bar is capped', () => {
    const s = { ...life(), stones: 10 };
    const off = { ...s, plan: { ...s.plan, burnStones: false } };
    expect(cultivate(off, 1, { offline: false }).stones).toBe(10);
    expect(cultivate(filled(s, 'qi', BAR_CAP), 1, { offline: false }).stones).toBe(10);
  });
});

describe('minor breakthroughs', () => {
  it('raises the odds a step for each whole 10% past full', () => {
    expect(overfillBonus(1)).toBe(0);
    expect(overfillBonus(1.19)).toBeCloseTo(0.07);
    expect(overfillBonus(1.5)).toBeCloseTo(0.35);
    const l3 = at(life(), 'qi', { stage: 2 });
    expect(minorOdds(filled(l3, 'qi', 0.99).qi)).toBe(0);
    expect(minorOdds(filled(l3, 'qi', 1).qi)).toBeCloseTo(0.75);
    expect(minorOdds(filled(l3, 'qi', 1.3).qi)).toBeCloseTo(0.96);
  });

  it('always succeeds into layer 2', () => {
    expect(minorOdds(filled(life(), 'qi', 1).qi)).toBe(1);
    const r = attemptBreakthrough(filled(life(), 'qi', 1), 'qi');
    expect(r.success).toBe(true);
    expect(r.state.qi).toMatchObject({ stage: 2, bar: 0 });
    expect(r.state.glass).toMatchObject({ fractures: 1, flares: 1 });
  });

  it('caps the bar at 150%', () => {
    const s = cultivate(filled(life({ method: 'garrison-standard' }), 'qi', 1.49), 30, {
      offline: false,
    });
    // Layer 1 always succeeds, so the auto setting took it; check the cap on a held bar instead.
    expect(s.qi.stage).toBe(2);
    const held = { ...filled(at(life(), 'qi', { stage: 2 }), 'qi', 1.49) };
    const off = { ...held, plan: { ...held.plan, auto: 'off' as const } };
    expect(barFill(cultivate(off, 1, { offline: true }).qi)).toBeCloseTo(BAR_CAP);
  });

  it('runs on the auto setting: safe waits for 90% or the cap, off never', () => {
    const s = filled(at(life(), 'qi', { stage: 2 }), 'qi', 1.1);
    expect(autoWouldAttempt(s, 'qi')).toBe(false);
    expect(autoWouldAttempt(filled(s, 'qi', 1.3), 'qi')).toBe(true);
    expect(autoWouldAttempt({ ...s, plan: { ...s.plan, auto: 'bold' } }, 'qi')).toBe(true);
    const off = filled({ ...s, plan: { ...s.plan, auto: 'off' } }, 'qi', BAR_CAP);
    expect(autoWouldAttempt(off, 'qi')).toBe(false);
  });

  it('costs a fifth of the bar and a few unsettled days on a failure', () => {
    // Search seeds for a failure at 75%.
    let failed;
    for (let i = 0; i < 50 && !failed; i++) {
      const s = { ...filled(at(life(), 'qi', { stage: 2 }), 'qi', 1), rng: i };
      const r = attemptBreakthrough(s, 'qi');
      if (!r.success) failed = r;
    }
    expect(failed).toBeDefined();
    const s = failed!.state;
    expect(barFill(s.qi)).toBeCloseTo(0.8);
    expect(s.qi.unsettledUntil).toBeCloseTo(s.calendar.day + UNSETTLED_DAYS);
    expect(s.qi.injuredUntil).toBe(0);
    // Unsettled qi gains nothing.
    expect(dayRates(s).qi).toBe(0);
  });

  it('replays the same roll from the same seed', () => {
    const s = filled(at(life(), 'qi', { stage: 5 }), 'qi', 1);
    expect(attemptBreakthrough(s, 'qi')).toEqual(attemptBreakthrough(s, 'qi'));
  });
});

describe('major breakthroughs', () => {
  it('need a full bar, the insight threshold and the Foundation Pill', () => {
    let s = filled(atLayer9(), 'qi', 1);
    const check = () => majorCheck(s, 'qi')!;
    expect(check()).toMatchObject({ bar: true, insight: false, gate: false, ready: false });
    s = { ...s, insight: { current: 0, earned: 500 } };
    expect(check()).toMatchObject({ insight: true, gate: false, ready: false });
    s = addItem(s, 'foundation-pill', 1);
    expect(check().ready).toBe(true);
    expect(attemptBreakthrough(filled(s, 'qi', 0.99), 'qi').attempted).toBe(false);
  });

  it('never happen on their own, online or off', () => {
    let s = addItem(filled(atLayer9(), 'qi', 1.5), 'foundation-pill', 1);
    s = { ...s, insight: { current: 0, earned: 5000 } };
    for (const offline of [true, false]) {
      const after = advance(s, 3_600_000, { step: cultivate, offline }).state;
      expect(after.qi.realm).toBe('qi-condensation');
      expect(after.items['foundation-pill']).toBe(1);
    }
  });

  it('grade by the margin you bring', () => {
    const base = addItem(
      { ...filled(atLayer9(), 'qi', 1), insight: { current: 0, earned: 500 } },
      'foundation-pill',
      1,
    );
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
    const s = addItem(
      { ...filled(atLayer9(), 'qi', 1), insight: { current: 0, earned: 500 } },
      'foundation-pill',
      1,
    );
    const results = Array.from({ length: 40 }, (_, i) =>
      attemptBreakthrough({ ...s, rng: i }, 'qi'),
    );
    const win = results.find((r) => r.success)!;
    const loss = results.find((r) => !r.success)!;
    expect(win.state.qi).toMatchObject({ realm: 'foundation-establishment', stage: 1, bar: 0 });
    expect(win.state.qi.grades).toEqual(['flawed']);
    expect(win.state.items['foundation-pill']).toBe(0);
    expect(loss.state.items['foundation-pill']).toBe(0);
    expect(barFill(loss.state.qi)).toBeCloseTo(0.5);
    expect(loss.state.qi.injuredUntil).toBeGreaterThan(s.calendar.day + 360);
  });

  it("refill gentle mode's rewind charge", () => {
    const s = addItem(
      {
        ...filled(atLayer9({ mode: 'gentle' }), 'qi', 1.5),
        insight: { current: 0, earned: 900 },
        rewindCharges: 0,
      },
      'foundation-pill',
      1,
    );
    const win = Array.from({ length: 20 }, (_, i) =>
      attemptBreakthrough({ ...s, rng: i }, 'qi'),
    ).find((r) => r.success)!;
    expect(win.state.rewindCharges).toBe(1);
  });

  it('let body run at most one realm ahead of qi', () => {
    const s = { ...life(), insight: { current: 0, earned: 1e6 } };
    const bodyFE = filled(
      at(s, 'body', { realm: 'foundation-establishment', stage: 4 }),
      'body',
      1,
    );
    expect(majorCheck(bodyFE, 'body')).toMatchObject({ cap: false, ready: false });
    const bodyQC = filled(at(s, 'body', { stage: 9 }), 'body', 1);
    expect(majorCheck(bodyQC, 'body')).toMatchObject({ cap: true, gate: true, ready: true });
  });
});

describe('the lifespan edge', () => {
  const edge = (s: GameState) => ({ ...s, calendar: { day: lifespanEdgeDay(s) } });

  it('offers a last chance below a full bar with the pill, at worse odds', () => {
    const s = edge(
      addItem(
        { ...filled(atLayer9(), 'qi', 0.5), insight: { current: 0, earned: 500 } },
        'foundation-pill',
        1,
      ),
    );
    const lc = lastChance(s);
    expect(lc.possible).toBe(true);
    expect(lc.odds).toBeCloseTo(0.55 * 0.5 * 0.6);
    const results = Array.from({ length: 40 }, (_, i) => attemptLastChance({ ...s, rng: i }));
    const win = results.find((r) => r.success)!;
    expect(win.state.qi.grades).toEqual(['flawed']);
    expect(win.state.ended).toBeNull();
    expect(advance(win.state, 60_000).days).toBeGreaterThan(0);
    const loss = results.find((r) => !r.success)!;
    expect(loss.state.ended).toMatchObject({ cause: 'lifespan' });
  });

  it('ends the life without the pill, and the clock stops', () => {
    const s = edge(at(life(), 'qi', { stage: 7 }));
    expect(lastChance(s).possible).toBe(false);
    const r = attemptLastChance(s);
    expect(r.state.ended).not.toBeNull();
    expect(r.state.chronicle.at(-1)?.kind).toBe('death');
    expect(advance(r.state, 3_600_000, { step: cultivate }).days).toBe(0);
  });

  it('starts a new life in the slot with the chronicle kept and nothing else', () => {
    const dead = attemptLastChance(edge(at({ ...life(), stones: 50 }, 'qi', { stage: 7 }))).state;
    const next = nextLife(dead, { name: 'Lin Mo' });
    expect(next.lineage.life).toBe(2);
    expect(next.calendar.day).toBe(dead.calendar.day);
    expect(next.stones).toBe(0);
    expect(next.qi.stage).toBe(1);
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
