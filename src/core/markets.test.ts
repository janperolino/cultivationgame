// E2's markets (design § Economy, Prosperity, What a market holds, Supply and prices, Markets by
// reach): prices by where a thing is made and needed, a flooded market recovering, purses by
// prosperity and tier, reach lending, prosperity moved and easing back, and tier 3 kept rare; and
// E2.2's shops, tiers and depth by who lives there.
import { describe, expect, it } from 'vitest';
import { CATALOGS } from '../content/catalogs/index.ts';
import { hasCopy } from '../content/copies.ts';
import { baseOf, item } from '../content/items.ts';
import { peopleAt } from '../content/map/index.ts';
import { shop, SHOP_KINDS, shopsWanted } from '../content/shops.ts';
import {
  addProsperity,
  lentLots,
  market,
  marketFactor,
  MARKETS,
  marketSize,
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
    // The March makes the Garrison Ration Pill; the City, an army's seat, needs healing. Since E4
    // the sum says so: the Fort makes half again what it uses (150%), and the City's healing is
    // carried in at its unpressured use and used twice over (50%); the March's own pill reaches
    // nothing in the City's layers, so it is a basket good from nowhere there (25%).
    expect(seenFrom(m('pacified-fort'), 'garrison-ration-pill')).toMatchObject({ source: 'made' });
    expect(seenFrom(m(CITY), 'garrison-ration-pill')).toMatchObject({ source: 'need', supply: 50 });
    const made = marketFactor(w, m('pacified-fort'), 'garrison-ration-pill', 0);
    const needed = marketFactor(w, m(CITY), 'spring-returning-pill', 0);
    const nowhere = marketFactor(w, m(CITY), 'garrison-ration-pill', 0);
    expect(made).toBeCloseTo(Math.sqrt(100 / 150));
    expect(needed).toBeCloseTo(Math.SQRT2);
    expect(nowhere).toBeCloseTo(2);
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
    // The City needs material: root-binding jade fills no basket and no maker's need, so it stays
    // outside the monthly sum, written at half supply and moved by the depth table.
    const thing = 'root-binding-jade';
    const s = withPlayer(life(), addItem(life().player, thing, 70));
    const before = offerFor(s, 'mouth-alchemy', thing);
    if (!before.ok) throw new Error(before.reason);
    expect(before.wanted).toBe(true);
    const r = sell(s, 'mouth-alchemy', thing, 20);
    if (!r.ok) throw new Error(r.reason);
    const day = r.state.calendar.day;
    // Twenty lots at 10 points each take it from 50% to 150%: the City is ordinary, and twice an
    // ordinary market's size, so each lot moves it 5.
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
    const s = withPlayer(life(), addItem(life().player, 'beast-core', 3));
    // The Wall's stall, lean (lots ×0.75) and small (sixty cultivators, ×0.5): a beast core, the
    // hunt's and outside the monthly sum, rises 10 ÷ 0.375 a lot from its written 100%.
    const r = sell(s, 'wall-stall', 'beast-core', 1);
    if (!r.ok) throw new Error(r.reason);
    expect(
      supplyOf(r.state.world, m('foot-of-the-wall'), 'beast-core', r.state.calendar.day),
    ).toBeCloseTo(100 + 10 / 0.375);
  });
});

describe('purses, lots and tiers', () => {
  it('size a purse by its tier and prosperity: the Wall’s stall can’t buy a Foundation Pill', () => {
    const w = emptyWorld();
    // Half of what a market's people earn, split by the kinds' weights (E4): the Wall's sixty
    // cultivators keep one stall, so it holds about 720; the City's alchemy shop about 7 mid.
    expect(shopPurse(w, shop('wall-stall'), 0)).toBe(720);
    expect(shopPurse(w, shop('mouth-alchemy'), 0)).toBeCloseTo(7000, -3);
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
        if (!hasCopy(l.thing)) expect(item(l.thing).tier).toBeLessThan(3);
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

describe('markets sized by who lives there (E2.2)', () => {
  const lotsOf = (id: string) =>
    m(id).shops.reduce((t, sid) => t + shopLots(emptyWorld(), shop(sid), 0), 0);
  const kinds = (id: string) => m(id).shops.map((sid) => shop(sid).kind);

  it('open as many shops of each kind as the market’s people keep', () => {
    for (const mk of MARKETS)
      for (const kind of SHOP_KINDS)
        expect(
          kinds(mk.id).filter((k) => k === kind).length,
          `${mk.id}: ${kind}`,
        ).toBeGreaterThanOrEqual(mk.kind === 'seat' ? 0 : shopsWanted(peopleAt(mk.id), kind));
    // The City of 8 million keeps five stalls and three mortal shops; Spear-Plow one store.
    expect(kinds(CITY).filter((k) => k === 'stall')).toHaveLength(5);
    expect(kinds(CITY).filter((k) => k === 'mortal')).toHaveLength(3);
    expect(kinds('spear-plow')).toEqual(['mortal']);
  });

  it('stock Foundation goods at Pacified Fort, beside a mortal shop for its farmers', () => {
    expect(shopTiers(shop('march-stall'))).toEqual([1, 2]);
    expect(kinds('pacified-fort')).toContain('mortal');
    expect(kinds('pacified-fort')).toContain('alchemy');
    // A stall's wares stop at Foundation's even in the City; its alchemy shop reaches tier 3.
    expect(shopTiers(shop('mouth-stall'))).toEqual([1, 2]);
    expect(shopTiers(shop('mouth-alchemy'))).toEqual([1, 2, 3]);
    // Corral Town's ten Foundation cultivators don't make a tier 2 market.
    expect(shopTiers(shop('herders-stall'))).toEqual([1]);
  });

  it('give a city more lots than a village at the same prosperity, and move it less a lot', () => {
    // The March's three, all modest: the fort of 1,620 cultivators, the ford of 155, the village of 40.
    for (const id of ['pacified-fort', 'grain-ford', 'spear-plow'])
      expect(prosperityOf(emptyWorld(), id, 0)).toBe(4);
    expect(lotsOf('pacified-fort')).toBeGreaterThan(lotsOf('grain-ford'));
    expect(lotsOf('grain-ford')).toBeGreaterThan(lotsOf('spear-plow'));
    expect(lotsOf(CITY)).toBeGreaterThan(3 * lotsOf('foot-of-the-wall'));
    expect(marketSize(m(CITY))).toBe(2);
    expect(marketSize(m('foot-of-the-wall'))).toBe(0.5);
    expect(marketSize(m('pacified-fort'))).toBeCloseTo(1.5, 1);
  });
});

describe('markets by reach', () => {
  it('reach as the design names it', () => {
    const names = (id: string) => reachOf(m(id)).map((o) => o.id);
    // E2.1's seats stand beside the written towns: River-Bend 3,400 li from Pacified Fort,
    // Heaven's Eye 2,700 from Sinkhole Terraces, Thousand Paddocks 2,100 from Corral Town.
    expect(names('pacified-fort').sort()).toEqual(
      [
        'grain-ford',
        'qm-hewan-cheng',
        'qm-tianyan',
        'qm-tushou-men',
        'sinkhole-terraces',
        'spear-plow',
      ].sort(),
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
      ['grain-ford', 'pacified-fort', 'qm-hewan-cheng', 'spear-plow'].sort(),
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
    expect(old.version).toBe(36);
    expect(old.state.world.supply).toEqual({});
    expect(old.state.world.prosperity).toEqual({});
  });
});
