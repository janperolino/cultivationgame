// E2's markets (design § Economy, Prosperity, What a market holds, Supply and prices, Markets by
// reach): prices by where a thing is made and needed, a flooded market recovering, purses by
// prosperity and tier, reach lending, prosperity moved and easing back, and tier 3 kept rare.
import { describe, expect, it } from 'vitest';
import { CATALOGS } from '../content/catalogs/index.ts';
import { hasCopy } from '../content/copies.ts';
import { baseOf, item } from '../content/items.ts';
import { shop } from '../content/shops.ts';
import {
  addProsperity,
  lentLots,
  market,
  marketFactor,
  prosperityOf,
  reachOf,
  seenFrom,
  shopLots,
  shopPurse,
  shopTiers,
  supplyOf,
  wages,
  wanted,
} from './markets.ts';
import { applyEffects } from './resolver/effects.ts';
import { emptyWorld } from './resolver/world.ts';
import { loadSave, makeSave } from './save/format.ts';
import { offerFor, sell, stockOf, tierLean } from './shops.ts';
import { addItem, newLife, withPlayer, type GameState } from './state.ts';

const life = (seed = 'markets'): GameState => newLife({ name: 'Han Li', seed });
const later = (s: GameState, days: number): GameState => ({
  ...s,
  calendar: { ...s.calendar, day: s.calendar.day + days },
});
const m = (id: string) => market(id)!;
const CITY = 'qm-shoukou-cheng';

describe('prices by where a thing is made and needed', () => {
  it('sell the same healing pill cheap where it is made and dear where it is needed', () => {
    const w = emptyWorld();
    // The March makes the Garrison Ration Pill; the City, an army's seat, needs healing.
    expect(seenFrom(m('pacified-fort'), 'garrison-ration-pill')).toMatchObject({ source: 'made' });
    expect(seenFrom(m(CITY), 'garrison-ration-pill')).toMatchObject({ source: 'need', supply: 50 });
    const made = marketFactor(w, m('pacified-fort'), 'garrison-ration-pill', 0);
    const needed = marketFactor(w, m(CITY), 'garrison-ration-pill', 0);
    expect(made).toBeCloseTo(Math.sqrt(100 / 150));
    expect(needed).toBeCloseTo(Math.SQRT2);
    // The City buys what it needs at 80% of its own price, the black market never.
    const s = withPlayer(life(), addItem(life().player, 'garrison-ration-pill', 1));
    const city = offerFor(s, 'mouth-alchemy', 'garrison-ration-pill');
    expect(city).toMatchObject({ ok: true, wanted: true });
    const bridge = offerFor(s, 'bridge-black', 'garrison-ration-pill');
    expect(bridge).toMatchObject({ ok: true, wanted: false });
  });

  it('read a region’s dear and cheap gate pills off tags, not a price table', () => {
    // Coveted, so needed everywhere; where the Gate makes it, no maker keeps up: 100%.
    expect(seenFrom(m('qm-tushou-men'), 'marrow-washing-pill')).toMatchObject({ supply: 100 });
    expect(seenFrom(m(CITY), 'marrow-washing-pill')).toMatchObject({ supply: 50 });
    expect(seenFrom(m(CITY), 'foundation-pill')).toMatchObject({ supply: 50 });
    // A good from a market in reach pays the road; an import pays more.
    expect(seenFrom(m(CITY), 'horn-head-lance')).toMatchObject({
      source: 'reach',
      from: 'corral-town',
    });
    expect(marketFactor(emptyWorld(), m(CITY), 'horn-head-lance', 0)).toBeCloseTo(1.1);
    expect(seenFrom(m(CITY), 'black-iron-saber')).toMatchObject({ source: 'import' });
  });
});

describe('supply moves and eases back', () => {
  it('drop the offer when ten lots are sold, and recover over months', () => {
    // The City needs herbs: Medicine Ridges kernels come in lots of about three.
    const thing = 'old-apricot-kernel';
    const s = withPlayer(life(), addItem(life().player, thing, 40));
    const before = offerFor(s, 'mouth-alchemy', thing);
    if (!before.ok) throw new Error(before.reason);
    expect(before.wanted).toBe(true);
    const r = sell(s, 'mouth-alchemy', thing, 30);
    if (!r.ok) throw new Error(r.reason);
    const day = r.state.calendar.day;
    // Ten lots at 10 points each take it from 50% to 150% at an ordinary market.
    expect(supplyOf(r.state.world, m(CITY), thing, day)).toBeCloseTo(150);
    const after = offerFor(r.state, 'mouth-alchemy', thing);
    if (!after.ok) throw new Error(after.reason);
    expect(after.wanted).toBe(false);
    expect(after.each).toBeLessThan(before.each / 2);
    // A tenth of the way back each month.
    const half = later(r.state, 6 * 30);
    expect(supplyOf(half.world, m(CITY), thing, half.calendar.day)).toBeCloseTo(
      50 + 100 * 0.9 ** 6,
    );
    const back = offerFor(later(r.state, 60 * 30), 'mouth-alchemy', thing);
    expect(back.ok && back.each).toBeCloseTo(before.each, 0);
  });

  it('move a lean market further than an ordinary one', () => {
    const s = withPlayer(life(), addItem(life().player, 'calm-heart-grass', 30));
    // The Wall's stall, lean (lots ×0.75): its own herb, made there, rises 10 ÷ 0.75 a lot.
    const r = sell(s, 'wall-stall', 'calm-heart-grass', 4);
    if (!r.ok) throw new Error(r.reason);
    expect(
      supplyOf(r.state.world, m('foot-of-the-wall'), 'calm-heart-grass', r.state.calendar.day),
    ).toBeCloseTo(150 + 10 / 0.75);
  });
});

describe('purses, lots and tiers', () => {
  it('size a purse by its tier and prosperity: the Wall’s stall can’t buy a Foundation Pill', () => {
    const w = emptyWorld();
    expect(shopPurse(w, shop('wall-stall'), 0)).toBe(90);
    // The City's alchemy shop stocks to tier 3 now, and is ordinary: 1,500 × 270.
    expect(shopPurse(w, shop('mouth-alchemy'), 0)).toBe(405_000);
    const s = withPlayer(life(), addItem(life().player, 'foundation-pill', 1));
    expect(sell(s, 'wall-stall', 'foundation-pill', 1)).toMatchObject({ ok: false });
    const city = sell(s, 'mouth-alchemy', 'foundation-pill', 1);
    expect(city.ok).toBe(true);
    expect(wanted(w, m(CITY), 'foundation-pill', 0)).toBe(true);
  });

  it('show fewer lots at a lean stall, and stock tiers within the vein', () => {
    const w = emptyWorld();
    expect(shopLots(w, shop('wall-stall'), 0)).toBe(5);
    expect(shopLots(w, shop('mouth-stall'), 0)).toBe(6);
    expect(stockOf('wall-stall', 40)).toHaveLength(5);
    expect(shopTiers(shop('mouth-alchemy'))).toEqual([1, 2, 3]);
    expect(shopTiers(shop('wall-stall'))).toEqual([1]);
  });

  it('keep tier 3 rare: a few lots a year in the City’s alchemy shop, never at a stall', () => {
    expect(tierLean(3, 1, false)).toBeCloseTo(0.01);
    expect(tierLean(3, 1, true)).toBeCloseTo(0.1);
    expect(tierLean(2, 2, false)).toBe(1);
    let t3 = 0;
    let all = 0;
    for (let month = 0; month < 120; month++) {
      for (const l of stockOf('mouth-alchemy', month).filter((x) => !hasCopy(x.thing))) {
        all++;
        if (item(l.thing).tier === 3) t3++;
      }
      for (const l of stockOf('mouth-stall', month))
        if (!hasCopy(l.thing)) expect(item(l.thing).tier).toBe(1);
    }
    expect(t3).toBeGreaterThan(0);
    expect(t3 / 10).toBeLessThan(6);
    expect(t3 / all).toBeLessThan(0.05);
  });

  it('pay a day’s wages by the realm curve and prosperity', () => {
    expect(wages(1, 5)).toBe(1);
    expect(wages(2, 5)).toBe(9);
    expect(wages(3, 5)).toBe(270);
    expect(wages(1, 3)).toBeCloseTo(0.8);
  });
});

describe('markets by reach', () => {
  it('reach as the design names it', () => {
    const names = (id: string) => reachOf(m(id)).map((o) => o.id);
    // E2.1's seats stand beside the written towns: River-Bend 3,400 li from Pacified Fort,
    // Heaven's Eye 2,700 from Sinkhole Terraces, Thousand Paddocks 2,100 from Corral Town.
    expect(names('pacified-fort').sort()).toEqual(
      ['qm-hewan-cheng', 'qm-tianyan', 'qm-tushou-men', 'sinkhole-terraces', 'spear-plow'].sort(),
    );
    expect(names('corral-town').sort()).toEqual(
      [
        'foot-of-the-wall',
        'qm-baijiang-zong',
        'qm-fugu-ge',
        'qm-qianlan-cheng',
        'qm-tuichao-gang',
      ].sort(),
    );
    expect(names('qm-wuming-ji').sort()).toEqual(
      ['pacified-fort', 'qm-hewan-cheng', 'spear-plow'].sort(),
    );
    expect(names(CITY)).toEqual(
      expect.arrayContaining(['qm-tushou-men', 'corral-town', 'foot-of-the-wall']),
    );
    expect(names('spear-plow')).toEqual([]);
  });

  it('carry the Gate’s sabers in the City, and only its own at Spear-Plow', () => {
    const lent = lentLots(m(CITY));
    expect(lent.some((l) => l.lot.thing === 'gutting-saber' && l.from === 'qm-tushou-men')).toBe(
      true,
    );
    let seen = false;
    for (let month = 0; month < 240 && !seen; month++)
      for (const id of ['mouth-stall', 'mouth-refiner', 'mouth-guild'])
        if (
          stockOf(id, month).some(
            (l) => baseOf(l.thing).endsWith('-saber') && l.thing.startsWith('gutting'),
          )
        )
          seen = true;
    expect(seen).toBe(true);
    // A village draws on nothing round it: no other place's goods on its shelf.
    expect(lentLots(m('spear-plow'))).toEqual([]);
    const others = new Set(
      CATALOGS.filter((c) => c.layer === 'place' && c.at !== 'qm-anbian-fu').flatMap((c) =>
        c.lots.map((l) => l.thing),
      ),
    );
    for (let month = 0; month < 60; month++)
      for (const l of stockOf('march-mortal', month))
        expect(others.has(baseOf(l.thing))).toBe(false);
  });
});

describe('prosperity', () => {
  it('move a town’s purses and lots with `prosperity`, and ease back a step a year', () => {
    const s = life();
    const day = s.calendar.day;
    const sh = shop('herders-stall');
    const purse = shopPurse(s.world, sh, day);
    const lots = shopLots(s.world, sh, day);
    expect(prosperityOf(s.world, 'corral-town', day)).toBe(4);
    const up = applyEffects(s, null, [{ do: 'prosperity', place: 'corral-town', n: 3 }]).state;
    expect(prosperityOf(up.world, 'corral-town', day)).toBe(7);
    expect(shopPurse(up.world, sh, day)).toBeGreaterThan(purse);
    expect(shopLots(up.world, sh, day)).toBeGreaterThan(lots);
    expect(prosperityOf(up.world, 'corral-town', day + 360)).toBe(6);
    expect(prosperityOf(up.world, 'corral-town', day + 3 * 360)).toBe(4);
    // A war on the March drains its towns too.
    const war = addProsperity(s.world, 'qm-anbian-fu', -2, day);
    expect(prosperityOf(war, 'pacified-fort', day)).toBe(2);
    expect(prosperityOf(war, 'corral-town', day)).toBe(4);
  });

  it('save prosperity and supplies, and bring a v33 save up with none moved', () => {
    const s = life();
    const moved = { ...s, world: addProsperity(s.world, 'corral-town', 2, s.calendar.day) };
    const loaded = loadSave(JSON.parse(JSON.stringify(makeSave(moved, 1))));
    expect(loaded.state.world.prosperity['corral-town']?.n).toBe(2);
    const raw = JSON.parse(JSON.stringify(makeSave(s, 1))) as {
      version: number;
      state: { world: Record<string, unknown> };
    };
    raw.version = 33;
    delete raw.state.world.prosperity;
    delete raw.state.world.supply;
    const old = loadSave(raw);
    expect(old.version).toBe(35);
    expect(old.state.world.supply).toEqual({});
    expect(old.state.world.prosperity).toEqual({});
  });
});
