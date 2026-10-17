import { describe, expect, it } from 'vitest';
import { BRANCHES, HOURS_PER_DAY } from '../content/hours.ts';
import { shadowOf, sunAt } from './sun.ts';
import { hourOfDay } from './wheel.ts';

/** The world day at the middle of a double-hour. */
const at = (hour: number) => (hour + 0.5) / HOURS_PER_DAY;
const MAO = BRANCHES.findIndex((b) => b.hanzi === '卯');
const WU = BRANCHES.findIndex((b) => b.hanzi === '午');
const YOU = BRANCHES.findIndex((b) => b.hanzi === '酉');
const ZI = BRANCHES.findIndex((b) => b.hanzi === '子');

describe('the sun on the seat', () => {
  it('rises on the left at dawn, in the middle of 卯', () => {
    const s = sunAt(at(MAO));
    expect(hourOfDay(at(MAO))).toBe(MAO);
    expect(s.elevation).toBeCloseTo(0);
    expect(s.dx).toBeCloseTo(-1);
    expect(s.twilight).toBeCloseTo(1);
    expect(s.light).toBeCloseTo(1);
  });

  it('stands overhead at noon, in the middle of 午', () => {
    const s = sunAt(at(WU));
    expect(s.elevation).toBeCloseTo(1);
    expect(s.dx).toBeCloseTo(0);
    expect(s.twilight).toBe(0);
    expect(s.night).toBe(0);
  });

  it('sets on the right at dusk, in the middle of 酉', () => {
    const s = sunAt(at(YOU));
    expect(s.elevation).toBeCloseTo(0);
    expect(s.dx).toBeCloseTo(1);
    expect(s.twilight).toBeCloseTo(1);
  });

  it('is gone at midnight, in the middle of 子, leaving the floor to the dantian', () => {
    const s = sunAt(at(ZI));
    expect(s.altitude).toBeCloseTo(-1);
    expect(s.light).toBe(0);
    expect(s.night).toBe(1);
    expect(s.twilight).toBe(0);
    expect(shadowOf(s)).toBeNull();
  });

  it('casts the shadow away from the sun: long right at dawn, a pool at noon, long left at dusk', () => {
    const dawn = shadowOf(sunAt(at(MAO)))!;
    const noon = shadowOf(sunAt(at(WU)))!;
    const dusk = shadowOf(sunAt(at(YOU)))!;
    expect(dawn.dirX).toBeCloseTo(1);
    expect(dusk.dirX).toBeCloseTo(-1);
    expect(noon.dirX).toBeCloseTo(0);
    expect(dawn.length).toBeGreaterThan(noon.length * 5);
    expect(dusk.length).toBeCloseTo(dawn.length);
    for (const sh of [dawn, noon, dusk]) expect(sh.dirY).toBeLessThan(0);
  });

  it('moves smoothly and the same on every day', () => {
    for (let h = 0; h < HOURS_PER_DAY; h += 0.25) {
      const a = sunAt(h / HOURS_PER_DAY);
      const b = sunAt(h / HOURS_PER_DAY + 0.01 / HOURS_PER_DAY);
      expect(Math.abs(a.dx - b.dx)).toBeLessThan(0.01);
      expect(Math.abs(a.light - b.light)).toBeLessThan(0.1);
      expect(sunAt(41 + h / HOURS_PER_DAY).dx).toBeCloseTo(a.dx);
    }
  });

  it('lights the floor only between a little before sunrise and a little after sunset', () => {
    expect(sunAt(at(WU - 1)).light).toBe(1);
    expect(sunAt(at(YOU + 1)).light).toBe(0);
    expect(sunAt(at(MAO - 1)).light).toBe(0);
    expect(sunAt(at(YOU) + 0.1 / HOURS_PER_DAY).light).toBeGreaterThan(0);
  });
});
