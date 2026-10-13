import { describe, expect, it } from 'vitest';
import { newLife, type Cultivator } from '../core/state.ts';
import { learnTechnique } from '../core/techniques.ts';
import { knownChapters, practiceTime, techniqueRows } from './techniqueList.ts';
import { technique } from '../content/techniques.ts';

const base = newLife({ name: 'Han Li', seed: 'technique-list' }).player;

const learn = (c: Cultivator, ...ids: string[]) => ids.reduce(learnTechnique, c);
const withPractice = (c: Cultivator, id: string, days: number): Cultivator => ({
  ...c,
  techniques: { ...c.techniques, [id]: { practice: days } },
});

describe('the Techniques list', () => {
  it('keeps the order learned, one row each', () => {
    const c = learn(base, 'undertow-palm', 'rampart-palm', 'alley-wind-palm');
    expect(techniqueRows(c).map((r) => [r.t.id, r.under])).toEqual([
      ['undertow-palm', false],
      ['rampart-palm', false],
      ['alley-wind-palm', false],
    ]);
  });

  it("puts a line's later chapter right under the earlier one, learned later or not", () => {
    // Rampart Palm, then Undertow Palm, then the palm's second chapter once at Comprehension.
    let c = learn(base, 'rampart-palm', 'undertow-palm');
    c = learnTechnique(withPractice(c, 'rampart-palm', 4), 'rampart-collapse-palm');
    expect(c.techniques['rampart-collapse-palm']).toBeDefined();
    expect(techniqueRows(c).map((r) => [r.t.id, r.under])).toEqual([
      ['rampart-palm', false],
      ['rampart-collapse-palm', true],
      ['undertow-palm', false],
    ]);
    expect(knownChapters(c, technique('rampart-collapse-palm')).map((t) => t.chapter)).toEqual([
      1, 2,
    ]);
    expect(knownChapters(c, technique('undertow-palm'))).toHaveLength(1);
  });
});

describe('practice time', () => {
  it('reads days under 400 and years above, on the 360-day year', () => {
    expect(practiceTime(0.2)).toBe('1 day');
    expect(practiceTime(8.4)).toBe('9 days');
    expect(practiceTime(399)).toBe('399 days');
    expect(practiceTime(504)).toBe('about 1.4 years');
    expect(practiceTime(720)).toBe('about 2 years');
    expect(practiceTime(3700)).toBe('about 10 years');
  });
});
