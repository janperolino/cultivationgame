import { describe, expect, it } from 'vitest';
import { method, type Method } from '../content/methods.ts';
import { methodTiers, orderMethods } from './methodList.ts';

// Made-up methods, in the order learned: a white line whose second chapter is tier 2, a blue one,
// a white one, and a purple one at tier 2.
const made = (id: string, o: Partial<Method>): Method => ({
  ...method('cadet-spear'),
  id,
  name: id,
  hanzi: '法',
  pinyin: id,
  line: id,
  chapter: 1,
  tier: 1,
  rarity: 'white',
  ...o,
});
const LIST = [
  made('cave', {}),
  made('tide', { rarity: 'blue', hanzi: '潮' }),
  made('cave-2', { line: 'cave', chapter: 2, tier: 2 }),
  made('pine', {}),
  made('furnace', { rarity: 'purple', tier: 2 }),
];
const ids = (rows: { m: Method; under: boolean }[]) =>
  rows.map((r) => (r.under ? `  ${r.m.id}` : r.m.id));

describe('Climb with, ordered', () => {
  it('puts lines rarest first, a later chapter under its line, ties in the order learned', () => {
    expect(ids(orderMethods(LIST))).toEqual(['furnace', 'tide', 'cave', '  cave-2', 'pine']);
  });

  it('searches name, hanzi and pinyin, and filters by tier', () => {
    expect(ids(orderMethods(LIST, { query: '潮' }))).toEqual(['tide']);
    expect(ids(orderMethods(LIST, { query: 'PINE' }))).toEqual(['pine']);
    // A later chapter whose first is filtered out stands on its own.
    expect(ids(orderMethods(LIST, { tier: 2 }))).toEqual(['furnace', 'cave-2']);
  });

  it('offers the tiers held, and none for one tier alone', () => {
    expect(methodTiers(LIST)).toEqual([1, 2]);
    expect(methodTiers([LIST[0]!])).toEqual([]);
  });
});
