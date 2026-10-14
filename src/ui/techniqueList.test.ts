import { describe, expect, it } from 'vitest';
import { newLife, type Cultivator } from '../core/state.ts';
import { learnTechnique } from '../core/techniques.ts';
import {
  knownChapters,
  orderTechniques,
  practiceTime,
  techniqueFilters,
  techniqueRows,
} from './techniqueList.ts';
import { technique, type Technique } from '../content/techniques.ts';

const base = newLife({ name: 'Han Li', seed: 'technique-list' }).player;

const learn = (c: Cultivator, ...ids: string[]) => ids.reduce((x, id) => learnTechnique(x, id), c);
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

// Made-up techniques, in the order learned: a white palm line whose second chapter is gold and
// tier 2, a blue spear, a white fist and a purple saber at tier 2.
const made = (id: string, o: Partial<Technique>): Technique => ({
  ...technique('rampart-palm'),
  id,
  name: id,
  line: id,
  chapter: 1,
  ...o,
});
const LIST = [
  made('palm', { daos: ['fist'] }),
  made('spear', { rarity: 'blue', daos: ['spear'], form: 'thrust' }),
  made('fist', { daos: ['earth', 'fist'], hanzi: '坑石拳' }),
  made('palm-2', { line: 'palm', chapter: 2, rarity: 'gold', tier: 2, daos: ['fist'] }),
  made('saber', { rarity: 'purple', tier: 2, daos: ['saber'], form: 'slash' }),
];
const ids = (rows: { t: Technique; under: boolean }[]) =>
  rows.map((r) => (r.under ? `  ${r.t.id}` : r.t.id));

describe('ordering, search and filters', () => {
  it('sorts lines by their rarest chapter by default, chapters kept under their line', () => {
    expect(ids(orderTechniques(LIST))).toEqual(['palm', '  palm-2', 'saber', 'spear', 'fist']);
  });

  it('sorts by highest tier, ties in the order learned, or keeps the order learned', () => {
    expect(ids(orderTechniques(LIST, { order: 'tier' }))).toEqual([
      'palm',
      '  palm-2',
      'saber',
      'spear',
      'fist',
    ]);
    expect(ids(orderTechniques(LIST, { order: 'learned' }))).toEqual([
      'palm',
      '  palm-2',
      'spear',
      'fist',
      'saber',
    ]);
  });

  it('searches name, hanzi, Dao and form, and filters by tier and Dao', () => {
    expect(ids(orderTechniques(LIST, { query: 'THRUST' }))).toEqual(['spear']);
    expect(ids(orderTechniques(LIST, { query: '石' }))).toEqual(['fist']);
    expect(ids(orderTechniques(LIST, { query: 'earth' }))).toEqual(['fist']);
    expect(ids(orderTechniques(LIST, { dao: 'fist' }))).toEqual(['palm', '  palm-2', 'fist']);
    // A later chapter whose earlier one is filtered out stands on its own.
    expect(ids(orderTechniques(LIST, { tier: 2 }))).toEqual(['palm-2', 'saber']);
  });

  it('offers only the tiers and Daos held, and none for a group of one', () => {
    expect(techniqueFilters(LIST)).toEqual({
      tiers: [1, 2],
      daos: ['earth', 'fist', 'saber', 'spear'],
    });
    expect(techniqueFilters([LIST[0]!])).toEqual({ tiers: [], daos: [] });
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
