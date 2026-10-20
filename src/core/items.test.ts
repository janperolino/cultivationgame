import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { UNSETTLED_DAYS } from '../content/cultivation.ts';
import { item, itemKind, ITEMS } from '../content/items.ts';
import { RARITY_IDS } from '../content/rarity.ts';
import { cultivateDays } from './cultivation.ts';
import { consumeItem } from './items.ts';
import { takeItem } from './life.ts';
import { Rng } from './rng.ts';
import { loadSave } from './save/format.ts';
import { addItem, newLife, type Cultivator } from './state.ts';
import { decayToxicity, doseAt, pillDose, toxicityDecay } from './toxicity.ts';

const life = () => newLife({ name: 'Han Li', seed: 'pills' });
const DAY = life().calendar.day;
const withPills = (c: Cultivator, id: string, n = 1) => addItem(c, id, n);

describe('pill toxicity', () => {
  it('doses 10 for a white pill at your tier, ×3 a tier up and ÷3 a tier down', () => {
    const pill = item('qi-gathering-pill');
    expect(doseAt(pill, 1)).toBe(10);
    expect(doseAt({ ...pill, tier: 2 }, 1)).toBe(30);
    expect(doseAt(pill, 2)).toBeCloseTo(10 / 3);
    expect(pillDose(life().player, pill)).toBe(10);
    // Clean herbs and offerings carry no dose.
    expect(doseAt(item('calm-heart-grass'), 1)).toBe(0);
  });

  it('runs purer with rarity, gray to pristine', () => {
    const pill = item('qi-gathering-pill');
    expect(RARITY_IDS.map((r) => doseAt({ ...pill, rarity: r }, 1))).toEqual([
      15, 10, 9, 8, 6.5, 4, 2.5, 1.5,
    ]);
  });

  it('scales every pill by 1 − toxicity/100, and adds the dose after', () => {
    const c = withPills(life().player, 'qi-gathering-pill', 2);
    const clean = consumeItem(c, 'qi-gathering-pill', DAY);
    expect(clean).toMatchObject({ used: true, fuel: 3, dose: 10 });
    expect(clean.cultivator).toMatchObject({ toxicity: 10, items: { 'qi-gathering-pill': 1 } });
    expect(clean.cultivator.qi.bar).toBe(3);
    const second = consumeItem(clean.cultivator, 'qi-gathering-pill', DAY);
    expect(second.fuel).toBeCloseTo(2.7);
    expect(second.cultivator.toxicity).toBe(20);
    expect(consumeItem(second.cultivator, 'qi-gathering-pill', DAY).used).toBe(false);
  });

  it('unsettles the ladder the pill fed on reaching 100', () => {
    const c = { ...withPills(life().player, 'qi-gathering-pill'), toxicity: 95 };
    const r = consumeItem(c, 'qi-gathering-pill', DAY);
    expect(r.cultivator.toxicity).toBe(100);
    expect(r.cultivator.qi.unsettledUntil).toBe(DAY + UNSETTLED_DAYS);
    expect(r.notes).toEqual([{ type: 'toxic', data: { ladder: 'qi', item: 'qi-gathering-pill' } }]);
    const s = takeItem({ ...life(), player: c }, 'qi-gathering-pill');
    expect(s.chronicle.at(-1)?.type).toBe('toxic');
  });

  it('decays a point a day at Qi Condensation, faster by realm, and detox pills cut it', () => {
    const c = { ...life().player, toxicity: 30 };
    expect(toxicityDecay(c)).toBe(1);
    expect(decayToxicity(c, 10).toxicity).toBe(20);
    const fe = { ...c, qi: { ...c.qi, realm: 'foundation-establishment' as const, stage: 1 } };
    expect(toxicityDecay(fe)).toBe(2);
    expect(decayToxicity(c, 100).toxicity).toBe(0);
    expect(cultivateDays(c, 1, { day: DAY, rng: new Rng(1) }).cultivator.toxicity).toBe(29);
    const detox = consumeItem(withPills(c, 'poison-purging-pill'), 'poison-purging-pill', DAY);
    expect(detox.cultivator.toxicity).toBe(0);
  });
});

describe('items', () => {
  it('have unique ids, English names with pinyin and hanzi, and a use unless a mortal good', () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
    for (const i of ITEMS) {
      expect(i.name && i.pinyin && i.hanzi, i.id).toBeTruthy();
      // Mortal goods (rations, a saddle blanket) are bought for silver and do nothing yet.
      if (i.taels === undefined) expect(Object.keys(i.uses).length, i.id).toBeGreaterThan(0);
    }
  });

  it('file by their own kind or a use that names one, and refuse to guess past that', () => {
    for (const i of ITEMS) expect(() => itemKind(i), i.id).not.toThrow();
    const pill = item('qi-gathering-pill');
    expect(itemKind({ ...pill, kind: undefined })).toBe('pill');
    // A thing with no kind and only an ingredient's use (a furnace written carelessly) is no pill.
    const loose = { ...pill, id: 'loose-furnace', kind: undefined, uses: { ingredient: {} } };
    expect(() => itemKind(loose as typeof pill)).toThrow(/names no kind/);
  });
});

describe('save v11', () => {
  it('migrates a v10 save: an empty toxicity meter', () => {
    const raw = JSON.parse(
      readFileSync(new URL('./save/fixtures/v10.json', import.meta.url), 'utf8'),
    );
    expect(raw.version).toBe(10);
    const p = loadSave(raw).state.player;
    expect(p.toxicity).toBe(0);
    expect(p.items).toEqual({ 'foundation-pill': 1 });
  });
});
