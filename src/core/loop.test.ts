import { describe, expect, it } from 'vitest';
import {
  advance,
  catchUp,
  catchUpInSlices,
  OFFLINE_CAP_MS,
  offlineMs,
  yearsPerRealHour,
  type DayStep,
} from './loop.ts';
import { cultivate } from './life.ts';
import { ageYears, DAYS_PER_YEAR, lifespanEdgeDay, newLife, START_AGE } from './state.ts';

const HOUR = 3_600_000;

describe('calendar speed', () => {
  it('runs each realm lifespan in about 120 real hours', () => {
    const s = newLife({ name: 'A' });
    expect(yearsPerRealHour(s)).toBe(1);
    const at = (realm: typeof s.player.qi.realm) =>
      yearsPerRealHour({ ...s, player: { ...s.player, qi: { ...s.player.qi, realm } } });
    expect(at('foundation-establishment')).toBeCloseTo(1.67, 2);
    expect(at('core-formation')).toBeCloseTo(4.17, 2);
    expect(at('nascent-soul')).toBeCloseTo(8.33, 2);
  });

  it('turns one real hour into one in-game year at Qi Condensation', () => {
    const r = advance(newLife({ name: 'A' }), HOUR);
    expect(r.days).toBeCloseTo(DAYS_PER_YEAR, 6);
    expect(ageYears(r.state.player, r.state.calendar.day)).toBeCloseTo(START_AGE + 1, 6);
    expect(r.usedMs).toBe(HOUR);
    expect(r.atEdge).toBe(false);
  });

  it('steps at most a day at a time and reads the speed each step', () => {
    const sizes: number[] = [];
    // A breakthrough into Foundation after the first step speeds the clock up from then on.
    const step: DayStep = (s, days) => {
      sizes.push(days);
      return {
        ...s,
        player: { ...s.player, qi: { ...s.player.qi, realm: 'foundation-establishment' } },
      };
    };
    const r = advance(newLife({ name: 'A' }), HOUR, { step });
    expect(Math.max(...sizes)).toBeLessThanOrEqual(1);
    expect(r.days).toBeGreaterThan(DAYS_PER_YEAR * 1.6);
  });
});

describe('offline catch-up', () => {
  it('counts time away, capped at 12 hours and never negative', () => {
    expect(offlineMs(0, 5 * HOUR)).toBe(5 * HOUR);
    expect(offlineMs(0, 20 * HOUR)).toBe(OFFLINE_CAP_MS);
    expect(offlineMs(10 * HOUR, 0)).toBe(0);
  });

  it('applies capped offline time as offline days', () => {
    const offlineFlags = new Set<boolean>();
    const step: DayStep = (s, _d, ctx) => (offlineFlags.add(ctx.offline), s);
    const r = catchUp(newLife({ name: 'A' }), 1000, 1000 + 30 * HOUR, { step });
    expect(r.awayMs).toBe(30 * HOUR);
    expect(r.countedMs).toBe(12 * HOUR);
    expect(r.days).toBeCloseTo(12 * DAYS_PER_YEAR, 6);
    expect([...offlineFlags]).toEqual([true]);
  });

  it('stops time at the lifespan edge instead of killing you offline', () => {
    const s = newLife({ name: 'A' });
    const edge = lifespanEdgeDay(s.player);
    const nearEnd = { ...s, calendar: { day: edge - 90 } }; // three months left
    const r = catchUp(nearEnd, 0, 12 * HOUR);
    expect(r.atEdge).toBe(true);
    expect(r.state.calendar.day).toBe(edge);
    expect(r.days).toBeCloseTo(90, 6);
    expect(r.usedMs).toBeCloseTo(HOUR / 4, 0);
    // Nothing more passes once at the edge.
    expect(advance(r.state, HOUR).days).toBe(0);
  });
});

describe('a long time away in slices', () => {
  it('lands where one catch-up does, pausing between slices', async () => {
    const s = newLife({ name: 'A', seed: 'slices' });
    const whole = catchUp(s, 0, 12 * HOUR, { step: cultivate });
    let pauses = 0;
    const sliced = await catchUpInSlices(s, 0, 12 * HOUR, {
      step: cultivate,
      pause: async () => {
        pauses += 1;
      },
    });
    expect(pauses).toBeGreaterThan(0);
    expect(sliced.days).toBeCloseTo(whole.days, 6);
    expect(sliced.state.calendar.day).toBeCloseTo(whole.state.calendar.day, 6);
    expect(sliced.state.player.qi).toEqual(whole.state.player.qi);
    expect(sliced.state.chronicle.length).toBe(whole.state.chronicle.length);
  });
});
