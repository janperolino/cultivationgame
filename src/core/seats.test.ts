// E2.1's markets (design § Economy, What a market holds, Markets by reach; § Catalogs by place):
// A5.2's five seats and three sects stock and buy, a seat sells its kingdom's goods as made there,
// and a sect's hall serves only its own.
import { describe, expect, it } from 'vitest';
import { baseOf, item } from '../content/items.ts';
import { BORDER_WILDS } from '../content/map/border-wilds.ts';
import { shop } from '../content/shops.ts';
import { market, prosperityOf, seenFrom } from './markets.ts';
import { joinPower } from './organizations.ts';
import { emptyWorld } from './resolver/world.ts';
import { buy, offerFor, shelf, stockOf } from './shops.ts';
import { addItem, newLife, withPlayer, type GameState } from './state.ts';

const life = (seed = 'seats'): GameState => newLife({ name: 'Han Li', seed });
const m = (id: string) => market(id)!;
const NEW = ['qm-hewan-cheng', 'qm-qianlan-cheng', 'qm-tianyan', 'qm-tuichao-gang', 'qm-wuming-ji'];
const SECTS = ['qm-baijiang-zong', 'qm-fugu-ge', 'qm-shoudeng-zong'];
const PLACE_SHOPS_E21 = Object.fromEntries(
  [...NEW, ...SECTS].map((id) => [id, BORDER_WILDS.placeShops[id] ?? []]),
);

describe('A5.2’s seats and sects keep markets', () => {
  it('every new market stocks something within a year', () => {
    for (const [place, shops] of Object.entries(PLACE_SHOPS_E21)) {
      expect(market(place), place).toBeDefined();
      for (const id of shops) {
        const lots = Array.from({ length: 12 }, (_, month) => stockOf(id, month)).flat();
        expect(lots.length, id).toBeGreaterThan(0);
      }
    }
  });

  it('buys what its kind deals in, and the Nameless Market pays for healing it needs', () => {
    const s = withPlayer(life(), addItem(life().player, 'spring-returning-pill', 3));
    const offer = offerFor(s, 'nameless-stall', 'spring-returning-pill');
    expect(offer.ok && offer.wanted).toBe(true);
    expect(offerFor(s, 'bend-refiner', 'spring-returning-pill').ok).toBe(false);
  });

  it('reads its written prosperity: River-Bend thriving in a modest March', () => {
    const w = emptyWorld();
    expect(prosperityOf(w, 'qm-hewan-cheng', 0)).toBe(6);
    expect(prosperityOf(w, 'pacified-fort', 0)).toBe(4);
    expect(prosperityOf(w, 'qm-shoudeng-zong', 0)).toBe(4);
  });
});

describe('a seat sells its kingdom’s goods as its own', () => {
  it('River-Bend makes the March’s nettle, and its stall stocks it', () => {
    expect(seenFrom(m('qm-hewan-cheng'), 'pit-edge-nettle').source).toBe('made');
    expect(seenFrom(m('qm-tianyan'), 'stone-milk-pill').source).toBe('made');
    const march = new Set(['pit-edge-nettle', 'garrison-ration-pill', 'iron-rain-talisman']);
    const seen = Array.from({ length: 24 }, (_, month) => stockOf('bend-stall', month))
      .flat()
      .some((l) => march.has(baseOf(l.thing)));
    expect(seen).toBe(true);
  });

  it('a seat’s own things are its own, not its kingdom’s towns’', () => {
    expect(seenFrom(m('qm-hewan-cheng'), 'levy-halberd').source).toBe('made');
    expect(seenFrom(m('pacified-fort'), 'levy-halberd').source).toBe('reach');
    expect(item('levy-halberd').tier).toBe(1);
  });
});

describe('a sect’s hall serves its own', () => {
  it('the Hundred Reins sells only to a member', () => {
    expect(shop('reins-sect').power).toBe('qm-baijiang-zong');
    let s = life();
    s = { ...s, player: { ...s.player, stones: 100_000 } };
    const day = s.calendar.day;
    const lot = shelf(s, 'reins-sect')[0]!;
    const out = buy(s, 'reins-sect', lot.slot);
    expect(out.ok).toBe(false);
    const member = { ...s, world: joinPower(s.world, s.player.id, 'qm-baijiang-zong', day).world };
    expect(buy(member, 'reins-sect', lot.slot).ok).toBe(true);
  });
});
