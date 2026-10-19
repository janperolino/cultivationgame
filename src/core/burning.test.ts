// E1: burning by grade (design § Economy, Stones as fuel). Your realm's grade burns first, then the
// grades below at the premium, a stone part drunk kept as a fraction and a higher one never broken.
// No written qi method reaches Core Formation yet, so a made-up tier 3 chapter stands in for one.
import { describe, expect, it, vi } from 'vitest';
import { method } from '../content/methods.ts';
import { comingBackStory } from './comingBack.ts';
import { cultivateDays, dayRates } from './cultivation.ts';
import { learnMethod, methodNeed, setActiveMethod } from './methods.ts';
import { ranOutWords, stonesOf } from './purse.ts';
import { Rng } from './rng.ts';
import { newLife, withPlayer, type Cultivator } from './state.ts';

vi.mock('../content/methods.ts', async (orig) => {
  const m = await orig<typeof import('../content/methods.ts')>();
  const core = { ...m.method('garrison-standard-foundation'), id: 'made-up-core', tier: 3 };
  return {
    ...m,
    method: (id: string) => (id === core.id ? core : m.method(id)),
    hasMethod: (id: string) => id === core.id || m.hasMethod(id),
  };
});

const s0 = newLife({ name: 'Han Li', seed: 'burning' });
const DAY = s0.calendar.day;
const ctx = (day = DAY) => ({ day, rng: new Rng(1) });
const purse = (low: number, mid = 0, high = 0) => ({
  stones: low,
  higherStones: { mid, high, top: 0 },
});

/** A burner whose every hour is qi, at a realm, holding a purse. */
function burner(realm: Cultivator['qi']['realm'], p: ReturnType<typeof purse>): Cultivator {
  const c0 = s0.player;
  let c: Cultivator = {
    ...c0,
    ...p,
    qi: { ...c0.qi, realm, stage: realm === 'qi-condensation' ? 5 : 1 },
    plan: { ...c0.plan, burnStones: true },
    wheel: c0.wheel.map(() => 'qi' as const),
  };
  if (realm === 'core-formation') {
    c = setActiveMethod(learnMethod(c, 'made-up-core'), 'qi', 'made-up-core').cultivator;
    const rec = { ...c.methods['made-up-core']!, practice: methodNeed(method('made-up-core'), 2) };
    c = { ...c, methods: { ...c.methods, 'made-up-core': rec } };
  }
  return c;
}

describe('burning by grade', () => {
  it('burns mid-grade stones by the hour at Core Formation and leaves a high one whole', () => {
    const c = burner('core-formation', purse(0, 3, 1));
    const cap = dayRates(c, DAY).stoneCap;
    // A full day's burn is 1,350 low's worth: a mid-grade stone is about three quarters of one.
    expect(cap).toBe(1350);
    const hour = cultivateDays(c, 1 / 24, ctx()).cultivator;
    expect(hour.higherStones.mid).toBeCloseTo(3 - cap / 24 / 1000, 6);
    expect(hour.higherStones.high).toBe(1);
    expect(hour.qi.bar).toBeGreaterThan(c.qi.bar);
    // Three days drink the three mid; the high stays whole and the burning stops.
    let d = hour;
    for (let i = 0; i < 4; i++) d = cultivateDays(d, 1, ctx(DAY + i)).cultivator;
    expect(stonesOf(d)).toEqual([0, 0, 1, 0]);
    const spent = cultivateDays(d, 1, ctx(DAY + 5)).cultivator;
    expect(spent.higherStones.high).toBe(1);
  });

  it('burns the grades below at the premium: 1,200 low for a mid-grade stone’s worth', () => {
    const c = burner('core-formation', purse(1620));
    const day = cultivateDays(c, 1, ctx()).cultivator;
    // 1,350 low's worth a day costs 1,620 low stones at Core Formation.
    expect(day.stones).toBeCloseTo(0, 6);
    // The same worth held in mid gathers the same qi.
    const inMid = burner('core-formation', purse(0, 1.62));
    const gained = (x: Cultivator) => cultivateDays(x, 1, ctx()).cultivator.qi.bar - x.qi.bar;
    expect(gained(c)).toBeCloseTo(gained(inMid), 3);
  });

  it('never breaks a higher stone: a mid-grade stone saved at Qi Condensation stays whole', () => {
    const c = burner('qi-condensation', purse(3, 1));
    const after = cultivateDays(c, 1, ctx()).cultivator;
    expect(after.stones).toBe(0);
    expect(after.higherStones.mid).toBe(1);
  });

  it('says so when burning runs dry at your grade while a higher stone waits', () => {
    const before = withPlayer(s0, burner('core-formation', purse(0, 0.5, 1)));
    const after = withPlayer(before, cultivateDays(before.player, 1, ctx()).cultivator);
    expect(ranOutWords(before.player, after.player)).toBe(
      'your mid and low are burned; 1 high waits whole, unbroken',
    );
    expect(comingBackStory(before, after).growth).toContain(
      'Your mid and low stones burned out: 1 high waits whole, unbroken, and the qi hours burn none until you break it or have more.',
    );
    // With nothing higher waiting, the old words.
    const plain = withPlayer(s0, burner('qi-condensation', purse(2)));
    const dry = withPlayer(plain, cultivateDays(plain.player, 1, ctx()).cultivator);
    expect(ranOutWords(plain.player, dry.player)).toBe('none left to burn');
  });
});
