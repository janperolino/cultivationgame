// E1: money by grade (design § Economy, Stones, silver and shops in play). One rule pays everything
// across the grades; what you are paid arrives as the payer counts it, never above the payer's
// grade (a shop's or a power's its place's vein's, a person's their realm's); a part-drunk stone is
// kept as a fraction, and the save carries it (v33).
import { describe, expect, it } from 'vitest';
import { ITEMS, item, itemKind } from '../content/items.ts';
import { veinAt } from '../content/map/index.ts';
import { shop, shopVein } from '../content/shops.ts';
import { openRings } from './loot.ts';
import {
  burnable,
  burnedGradesWords,
  canPay,
  pay,
  purseWords,
  realmGrade,
  receive,
  spend,
  stonesOf,
  takeShare,
  tierGrade,
  worthOf,
  type Stones,
} from './purse.ts';
import { applyEffects } from './resolver/effects.ts';
import { loadSave, makeSave } from './save/format.ts';
import { offerFor, sell } from './shops.ts';
import { addItem, newLife, withPlayer, type GameState } from './state.ts';

const life = (seed = 'money'): GameState => newLife({ name: 'Han Li', seed });
const at = (low: number, mid = 0, high = 0, top = 0): Stones => [low, mid, high, top];

describe('the grades', () => {
  it('read a realm’s and a vein’s grade off one row: low to Foundation, mid at Core, high above', () => {
    expect(realmGrade('qi-condensation')).toBe(0);
    expect(realmGrade('foundation-establishment')).toBe(0);
    expect(realmGrade('core-formation')).toBe(1);
    expect(realmGrade('nascent-soul')).toBe(2);
    expect(realmGrade('deity-transformation')).toBe(2);
    expect(realmGrade('void-refinement')).toBe(3);
    expect([0, 1, 2, 3, 4].map(tierGrade)).toEqual([0, 0, 0, 1, 2]);
    expect(burnedGradesWords(0)).toBe('low');
    expect(burnedGradesWords(2)).toBe('high, mid and low');
  });

  it('arrive as the payer counts them, never above the payer’s grade', () => {
    expect(receive(at(0), 2400)).toEqual(at(2400));
    expect(receive(at(0), 2400, 1)).toEqual(at(400, 2));
    expect(receive(at(5), 2_400_500, 3)).toEqual(at(505, 400, 2));
    // A sum under a whole stone of the grade stays in the grade below.
    expect(receive(at(0), 900, 2)).toEqual(at(900));
  });

  it('pay a part-drunk stone at what is left in it, but break only a whole one', () => {
    expect(pay(at(0, 2.3), 2000)).toEqual(at(0, 0.3));
    // 1.3 mid and the last 0.2 mid in low at the premium.
    expect(pay(at(240, 1.3), 1500)).toEqual(at(0, 0));
    expect(pay(at(0, 0.3), 200)).toBeNull();
    // Owing more of the last stone than breaking it would cover at the premium, it goes whole.
    expect(pay(at(0, 2), 1935.9)).toEqual(at(0, 0));
    expect(pay(at(0, 2), 1900)).toEqual(at(20, 0));
    expect(canPay(at(0, 0, 1), 5)).toBe(true);
    expect(worthOf(at(240, 2.5))).toBe(2740);
    expect(
      purseWords({ stones: 40, higherStones: { mid: 2.34, high: 0, top: 0 }, silver: 0 }),
    ).toBe('2.3 mid · 40 low');
  });

  it('take a debt as far as the purse reaches, and a robbery’s share of every grade', () => {
    expect(spend(at(1, 0, 0.5), 5)).toEqual(at(0, 0, 0.5));
    expect(spend(at(10, 1), 5)).toEqual(at(5, 1));
    expect(takeShare(at(41, 3, 1), 0.5)).toEqual(at(21, 2, 1));
  });

  it('count fuel by the burner’s grade at the premium, and never a higher stone', () => {
    expect(burnable(at(1200, 1, 1), 1)).toBeCloseTo(2000);
    expect(burnable(at(10, 1), 0)).toBe(10);
  });
});

describe('sales by the vein', () => {
  it('find a shop’s vein where it stands: a written town’s, else its atlas place’s', () => {
    expect(veinAt('foot-of-the-wall')).toBe(1);
    expect(veinAt('qm-shoukou-cheng')).toBe(4);
    expect(veinAt('nowhere')).toBe(0);
    expect(shopVein(shop('wall-stall'))).toBe(1);
    expect(shopVein(shop('mouth-guild'))).toBe(4);
    expect(shopVein(shop('bridge-black'))).toBe(3);
  });

  it('pay a big sale at a village on a tier 1 vein all in low, and at the City in mid', () => {
    const s = life();
    // Something the City's guild pays well for, sold in a lot worth more than a mid.
    const thing = ITEMS.map((x) => x.id).find((id) => {
      const o = offerFor(s, 'mouth-guild', id);
      return o.ok && o.each >= 100 && o.each <= 1000;
    })!;
    const each = (offerFor(s, 'mouth-guild', thing) as { each: number }).each;
    // Lot by lot the price falls as the City fills (E3), so offer well past 2,400.
    const n = Math.ceil(10_000 / each);
    const held = withPlayer(s, addItem(s.player, thing, n));
    const city = sell(held, 'mouth-guild', thing, n);
    if (!city.ok) throw new Error(city.reason);
    // Sold lot by lot (E3), the price falls as the City fills, so the total is under each × n.
    const total = worthOf(stonesOf(city.state.player)) - worthOf(stonesOf(held.player));
    expect(total).toBeGreaterThan(2000);
    expect(city.state.player.higherStones.mid).toBe(Math.floor(total / 1000));
    expect(city.state.player.stones - held.player.stones).toBeCloseTo(total % 1000, 6);
    // The Wall's stall, in a village on a tier 1 vein, pays in low whatever it buys.
    const herb = ITEMS.map((x) => x.id).find(
      (id) => itemKind(item(id)) === 'herb' && offerFor(s, 'wall-stall', id).ok,
    )!;
    const village = sell(withPlayer(s, addItem(s.player, herb, 10)), 'wall-stall', herb, 10);
    if (!village.ok) throw new Error(village.reason);
    expect(village.state.player.higherStones).toEqual({ mid: 0, high: 0, top: 0 });
    expect(village.state.player.stones).toBeGreaterThan(0);
    expect(receive(at(0), 2400, tierGrade(shopVein(shop('wall-stall'))))).toEqual(at(2400));
  });
});

describe('what a person pays', () => {
  it('arrives in their realm’s grade: a scene’s stones, a ring opened', () => {
    const s = life();
    const you = s.player.id;
    // An elder's purse taken, counted in mid; a cost paid from a purse of one mid.
    const took = applyEffects(s, null, [{ do: 'stones', who: you, n: 2400, grade: 1 }]).state;
    expect(stonesOf(took.player)).toEqual(at(400, 2));
    const mid = withPlayer(s, {
      ...s.player,
      stones: 0,
      higherStones: { mid: 1, high: 0, top: 0 },
    });
    const paid = applyEffects(mid, null, [{ do: 'stones', who: you, n: -30 }]).state;
    expect(stonesOf(paid.player)).toEqual(at(1070));
    // A Core Formation elder's ring, opened, pays out in mid.
    const core = withPlayer(s, { ...s.player, qi: { ...s.player.qi, realm: 'core-formation' } });
    const sealed = {
      ...core,
      world: {
        ...core.world,
        sealed: [{ from: 'elder', name: 'Elder Mo', tier: 3, items: {}, stones: 2500 }],
      },
    };
    expect(stonesOf(openRings(sealed).player)).toEqual(at(500, 2));
  });
});

describe('the v33 save', () => {
  it('keeps a part-drunk stone, and a v32 save loads with its whole counts', () => {
    const s = life();
    const part = withPlayer(s, { ...s.player, higherStones: { mid: 2.4375, high: 1, top: 0 } });
    const loaded = loadSave(JSON.parse(JSON.stringify(makeSave(part, 1))));
    expect(loaded.version).toBe(56);
    expect(loaded.state.player.higherStones).toEqual({ mid: 2.4375, high: 1, top: 0 });
    const raw = JSON.parse(JSON.stringify(makeSave(s, 1))) as { version: number };
    raw.version = 32;
    expect(loadSave(raw).state.player.higherStones).toEqual(s.player.higherStones);
  });
});
