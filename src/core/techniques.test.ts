import { describe, expect, it } from 'vitest';
import { eventText } from './chronicle.ts';
import { MASTERY, TECHNIQUE_MASTERY } from '../content/mastery.ts';
import { firstTechnique, technique, TECHNIQUES } from '../content/techniques.ts';
import { cultivateDays, dayRates } from './cultivation.ts';
import { gainTechnique, practice } from './life.ts';
import { Rng } from './rng.ts';
import { newLife, type Cultivator } from './state.ts';
import {
  addPractice,
  canPractice,
  daysToNextLevel,
  learnTechnique,
  mastery,
  masteryAccuracy,
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

  it('starts at Glimpse, ×1 to Accuracy, and climbs with practice days', () => {
    expect(mastery(c, 'rampart-palm')).toMatchObject({ level: 0, practice: 0, next: 4 });
    expect(masteryAccuracy(c, 'rampart-palm')).toBe(1);
    const comprehension = withPractice(c, 'rampart-palm', 4);
    expect(mastery(comprehension, 'rampart-palm').level).toBe(1);
    // The design's worked turn: a technique at Comprehension multiplies Accuracy by 1.15.
    expect(masteryAccuracy(comprehension, 'rampart-palm')).toBeCloseTo(1.15);
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
    expect(eventText(s, s.chronicle.at(-2)!)).toBe('Han Li is taught Rampart Palm.');
    // Practice hours open with it at once, by the default rule.
    expect(eventText(s, s.chronicle.at(-1)!)).toMatch(/turns from qi to practice/);
    expect(s.player.practicing).toBe('rampart-palm');
    s = gainTechnique(s, 'alley-wind-palm');
    expect(s.player.practicing).toBe('rampart-palm');
    s = practice(s, 'alley-wind-palm');
    expect(s.player.practicing).toBe('alley-wind-palm');
    expect(practice(s, 'not-known').player.practicing).toBe('alley-wind-palm');
  });
});

describe('days to the next level', () => {
  const c = learnTechnique(learnTechnique(base.player, 'rampart-palm'), 'sinkhole-stone-fist');

  it('divides the practice days left by the rate', () => {
    // Comprehension is 4 practice days at tier 1: 3 left at half a day a day.
    const at = withPractice(c, 'rampart-palm', 1);
    expect(daysToNextLevel(at, 'rampart-palm', 0.5)).toBeCloseTo(6);
    expect(daysToNextLevel(at, 'rampart-palm', 0)).toBe(Infinity);
  });

  it("counts the technique's kinship", () => {
    // Sinkhole Stone Fist shares the Fist Dao and the palm form; at Comprehension it is kin.
    const kin = withPractice(c, 'sinkhole-stone-fist', 4);
    expect(daysToNextLevel(kin, 'rampart-palm', 1)).toBeCloseTo(4 / 1.25);
    expect(daysToNextLevel(c, 'rampart-palm', 1)).toBeCloseTo(4);
  });

  it('is null at Origin and while sealed', () => {
    expect(daysToNextLevel(withPractice(c, 'rampart-palm', 600), 'rampart-palm', 1)).toBeNull();
    const collapse = withPractice(withPractice(c, 'rampart-palm', 30), 'rampart-collapse-palm', 0);
    expect(daysToNextLevel(collapse, 'rampart-collapse-palm', 1)).toBeNull();
    const foundation = {
      ...collapse,
      qi: { ...collapse.qi, realm: 'foundation-establishment' as const },
    };
    // Tier 2 needs three times tier 1's 4 days.
    expect(daysToNextLevel(foundation, 'rampart-collapse-palm', 1)).toBeCloseTo(12);
  });
});
