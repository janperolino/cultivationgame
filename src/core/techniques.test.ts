import { describe, expect, it } from 'vitest';
import { MASTERY, TECHNIQUE_MASTERY } from '../content/mastery.ts';
import { firstTechnique, technique, TECHNIQUES } from '../content/techniques.ts';
import { cultivateDays, dayRates } from './cultivation.ts';
import { gainTechnique, practice } from './life.ts';
import { Rng } from './rng.ts';
import { newLife, type Cultivator } from './state.ts';
import {
  addPractice,
  canPractice,
  learnTechnique,
  mastery,
  masteryCheckBonus,
  masteryNeed,
  techniqueSealed,
} from './techniques.ts';

const base = newLife({ name: 'Han Li', seed: 'techniques' });
const DAY = base.calendar.day;

const withPractice = (c: Cultivator, id: string, days: number): Cultivator => ({
  ...c,
  techniques: { ...c.techniques, [id]: { practice: days } },
});

describe('technique content', () => {
  it('has a first technique for each of the six origin paths', () => {
    for (const origin of ['cave-orphan', 'conscript', 'frontier-orphan']) {
      for (const choice of ['along', 'refuse']) {
        expect(firstTechnique(`${origin}/${choice}`), `${origin}/${choice}`).toBeDefined();
      }
    }
    expect(new Set(TECHNIQUES.map((t) => t.id)).size).toBe(TECHNIQUES.length);
  });

  it('runs mastery Glimpse to Origin with rising practice', () => {
    expect(MASTERY.map((m) => m.name)).toEqual([
      'Glimpse',
      'Comprehension',
      'Mastery',
      'Domain',
      'Origin',
    ]);
    for (let i = 1; i < MASTERY.length; i++) {
      expect(TECHNIQUE_MASTERY.practice[i]!).toBeGreaterThan(TECHNIQUE_MASTERY.practice[i - 1]!);
    }
  });
});

describe('mastery', () => {
  const c = learnTechnique(base.player, 'rampart-palm');

  it('starts at Glimpse, +2 to checks, and climbs with practice days', () => {
    expect(mastery(c, 'rampart-palm')).toMatchObject({ level: 0, practice: 0, next: 4 });
    expect(masteryCheckBonus(c, 'rampart-palm')).toBe(2);
    const comprehension = withPractice(c, 'rampart-palm', 4);
    expect(mastery(comprehension, 'rampart-palm').level).toBe(1);
    // The design's example: a technique at Comprehension adds +4.
    expect(masteryCheckBonus(comprehension, 'rampart-palm')).toBe(4);
    expect(mastery(withPractice(c, 'rampart-palm', 17), 'rampart-palm').fraction).toBeCloseTo(0.5);
  });

  it('stops at Origin', () => {
    const t = technique('rampart-palm');
    const origin = addPractice(withPractice(c, 'rampart-palm', 599), 50).cultivator;
    expect(origin.techniques['rampart-palm']!.practice).toBe(masteryNeed(t, 4));
    expect(mastery(origin, 'rampart-palm')).toMatchObject({ level: 4, next: null, fraction: 1 });
    expect(canPractice(origin, 'rampart-palm')).toBe(false);
  });

  it('needs three times the practice per tier above the first', () => {
    const t = technique('rampart-palm');
    expect(masteryNeed({ ...t, tier: 2 }, 2)).toBe(3 * masteryNeed(t, 2));
  });

  it('seals a technique above its ladder level', () => {
    const t = technique('rampart-palm');
    expect(techniqueSealed(c, t)).toBe(false);
    expect(techniqueSealed(c, { ...t, tier: 2 })).toBe(true);
    const foundation = { ...c, qi: { ...c.qi, realm: 'foundation-establishment' as const } };
    expect(techniqueSealed(foundation, { ...t, tier: 2 })).toBe(false);
  });
});

describe('practice days', () => {
  it('raise mastery of the technique being practiced, a twelfth of a day per practice hour', () => {
    // The first technique opens practice hours, and the default rule gives it one.
    const c = gainTechnique(base, 'rampart-palm').player;
    expect(dayRates(c, DAY).count.practice).toBe(1);
    const after = cultivateDays(c, 1, { day: DAY, rng: new Rng(1) }).cultivator;
    expect(after.techniques['rampart-palm']!.practice).toBeCloseTo(1 / 12);
    const none = cultivateDays({ ...c, practicing: null }, 1, { day: DAY, rng: new Rng(1) });
    expect(none.cultivator.techniques['rampart-palm']!.practice).toBe(0);
  });

  it('go to the technique the player picks; the first opens the screen and practice hours', () => {
    let s = gainTechnique(base, 'rampart-palm', 'is taught');
    expect(s.unlocks).toContain('techniques');
    expect(s.chronicle.at(-2)?.text).toBe('Han Li is taught Rampart Palm.');
    // Practice hours open with it at once, by the default rule.
    expect(s.chronicle.at(-1)?.text).toMatch(/turns from qi to practice/);
    expect(s.player.practicing).toBe('rampart-palm');
    s = gainTechnique(s, 'alley-wind-palm');
    expect(s.player.practicing).toBe('rampart-palm');
    s = practice(s, 'alley-wind-palm');
    expect(s.player.practicing).toBe('alley-wind-palm');
    expect(practice(s, 'not-known').player.practicing).toBe('alley-wind-palm');
  });
});
