import { describe, expect, it } from 'vitest';
import { eventText } from './chronicle.ts';
import { MASTERY, TECHNIQUE_MASTERY } from '../content/mastery.ts';
import { firstTechnique, technique, TECHNIQUES } from '../content/techniques.ts';
import { cultivateDays, dayRates } from './cultivation.ts';
import { gainTechnique, practice, stopPracticing } from './life.ts';
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
  practiceShares,
  practiceSlots,
  startPractice,
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
    const at = { ...withPractice(c, 'rampart-palm', 599), practicing: ['rampart-palm'] };
    const origin = addPractice(at, { 'rampart-palm': 50 }).cultivator;
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
    const none = cultivateDays({ ...c, practicing: [] }, 1, { day: DAY, rng: new Rng(1) });
    expect(none.cultivator.techniques['rampart-palm']!.practice).toBe(0);
  });

  it('go to the technique the player picks; the first opens the screen and practice hours', () => {
    let s = gainTechnique(base, 'rampart-palm', 'is taught');
    expect(s.unlocks).toContain('techniques');
    expect(eventText(s, s.chronicle.at(-2)!)).toBe('Han Li is taught Rampart Palm.');
    // Practice hours open with it at once, by the default rule.
    expect(eventText(s, s.chronicle.at(-1)!)).toMatch(/turns from qi to practice/);
    expect(s.player.practicing).toEqual(['rampart-palm']);
    s = gainTechnique(s, 'alley-wind-palm');
    expect(s.player.practicing).toEqual(['rampart-palm']);
    // One slot: the second waits until the first is stopped.
    expect(practice(s, 'alley-wind-palm').check).toEqual({
      ok: false,
      reason: 'All slots in use.',
    });
    s = practice(stopPracticing(s, 'rampart-palm'), 'alley-wind-palm').state;
    expect(s.player.practicing).toEqual(['alley-wind-palm']);
    expect(practice(s, 'not-known').state.player.practicing).toEqual(['alley-wind-palm']);
  });
});

describe('practice slots', () => {
  // Three techniques of three lines with nothing in common, so no kinship between them.
  const three = ['rampart-palm', 'piled-bones-thrust', 'bone-splitting-cleave'];
  const knows = three.reduce((c, id) => learnTechnique(c, id), base.player);
  const twin = (n: number): Cultivator => ({ ...knows, talents: Array(n).fill('twin-soul') });
  const fill = (c: Cultivator, ids: string[]) =>
    ids.reduce<Cultivator>((acc, id) => startPractice(acc, id).cultivator, {
      ...c,
      practicing: [],
    });

  it('start at one, and Split Attention and the Twin Soul each open another, never a fourth', () => {
    expect(practiceSlots(knows)).toBe(1);
    expect(practiceSlots(twin(1))).toBe(2);
    const split = {
      ...twin(1),
      nodes: ['soul-split-attention'],
      soul: { ...knows.soul, realm: 'foundation-establishment' as const },
    };
    expect(practiceSlots(split)).toBe(3);
    expect(practiceSlots(twin(3))).toBe(3);
    expect(startPractice(fill(twin(3), three), 'sinkhole-stone-fist').check.ok).toBe(false);
  });

  it('split a day evenly: whole on one, half on two, a third on three', () => {
    const total = 0.6;
    expect(practiceShares(fill(knows, three), total)).toEqual({ 'rampart-palm': 0.6 });
    const two = practiceShares(fill(twin(1), three), total);
    expect(Object.keys(two)).toEqual(three.slice(0, 2));
    for (const v of Object.values(two)) expect(v).toBeCloseTo(0.3);
    const thirds = practiceShares(fill(twin(2), three), total);
    for (const v of Object.values(thirds)) expect(v).toBeCloseTo(0.2);
    // The day's total doesn't grow with the slots.
    const day = (c: Cultivator) => dayRates(gainTechnique(withP(c), 'rampart-palm').player, DAY);
    expect(day(fill(twin(2), three)).practice).toBeCloseTo(day(fill(knows, three)).practice);
  });

  it("lifts only the kin technique's own share", () => {
    const fist = technique('sinkhole-stone-fist');
    let c = learnTechnique(twin(1), 'sinkhole-stone-fist');
    c = withPractice(c, fist.id, masteryNeed(fist, 1));
    c = fill(c, ['rampart-palm', 'piled-bones-thrust']);
    const shares = practiceShares(c, 1);
    expect(shares['rampart-palm']).toBeCloseTo(0.5 * 1.25);
    expect(shares['piled-bones-thrust']).toBeCloseTo(0.5);
  });

  it('refuse a sealed technique or one at Origin', () => {
    const t = technique('rampart-palm');
    const origin = withPractice({ ...knows, practicing: [] }, t.id, masteryNeed(t, 4));
    expect(startPractice(origin, t.id).check).toEqual({
      ok: false,
      reason: 'It is at Origin: there is nothing left to drill.',
    });
    const collapse = learnTechnique(
      withPractice(knows, t.id, masteryNeed(t, 1)),
      'rampart-collapse-palm',
    );
    expect(techniqueSealed(collapse, technique('rampart-collapse-palm'))).toBe(true);
    expect(startPractice({ ...collapse, practicing: [] }, 'rampart-collapse-palm').check.ok).toBe(
      false,
    );
  });

  it('leave a technique reaching Origin out of its slot, which stays empty', () => {
    const t = technique('rampart-palm');
    const c = fill(withPractice(twin(1), t.id, masteryNeed(t, 4) - 1), three);
    expect(c.practicing).toEqual(three.slice(0, 2));
    const r = addPractice(c, { [t.id]: 5, 'piled-bones-thrust': 5 });
    expect(r.levels).toContainEqual({ technique: t.id, level: 4 });
    expect(r.left).toEqual([t.id]);
    expect(r.cultivator.practicing).toEqual(['piled-bones-thrust']);
    expect(r.cultivator.techniques['piled-bones-thrust']!.practice).toBe(5);
  });
});

/** A life with the cultivator in it, for the life-level helpers. */
function withP(c: Cultivator) {
  return { ...base, player: c };
}

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
