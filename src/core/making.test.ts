// E4's people make and use (design § Economy, People make and use; What a market holds, a shop's
// purse): the monthly sum's rests, the harvest's swing, pressures and goods from nowhere, makers'
// inputs and the land, a lot measured against a month's use, supplies easing back by thirds,
// purses from what people earn, population offsets, and the place screen's line of why.
import { describe, expect, it } from 'vitest';
import { DAYS_PER_MONTH } from '../content/calendar.ts';
import { shop } from '../content/shops.ts';
import { harvestFactor, marketSum, monthUse, restOf, whyOf } from './making.ts';
import {
  market,
  marketFactor,
  moveSupply,
  populationOf,
  shopPurse,
  supplyOf,
  wanted,
} from './markets.ts';
import { emptyWorld, type World } from './resolver/world.ts';
import { loadSave, makeSave } from './save/format.ts';
import { newLife } from './state.ts';

const m = (id: string) => market(id)!;
const CITY = 'qm-shoukou-cheng';
const FORT = 'pacified-fort';
const TERRACES = 'sinkhole-terraces';
const WALL = 'foot-of-the-wall';
/** Autumn's harvest month, and the month before the next. */
const REAPED = 7;
const BEFORE = 6;
const w = emptyWorld();

describe('the monthly sum', () => {
  it('rests the March’s grain cheap at the Fort and the terraces’ rice dear, swinging with the harvest', () => {
    for (const grain of ['spirit-rice', 'frontier-millet']) {
      expect(restOf(w, m(FORT), grain, REAPED)).toBe(200);
      expect(restOf(w, m(FORT), grain, BEFORE)).toBeCloseTo(90);
    }
    // The terraces use twice what they eat unpressured, and the March carries in that much.
    expect(restOf(w, m(TERRACES), 'spirit-rice', REAPED)).toBeCloseTo(70);
    expect(restOf(w, m(TERRACES), 'spirit-rice', BEFORE)).toBeCloseTo(30);
    expect(marketFactor(w, m(FORT), 'spirit-rice', REAPED * DAYS_PER_MONTH)).toBeLessThan(0.75);
    expect(marketFactor(w, m(TERRACES), 'spirit-rice', BEFORE * DAYS_PER_MONTH)).toBeGreaterThan(
      1.8,
    );
    // The same yearly total: the harvest's twelve months average to one.
    const year = Array.from({ length: 12 }, (_, k) => harvestFactor('grain', k));
    expect(year.reduce((t, x) => t + x, 0) / 12).toBeCloseTo(1);
  });

  it('holds a pressured need at about ×1.4, and a basket good from nowhere at ×2', () => {
    // The Wall's patrols bleed: healing used twice over, carried in at its unpressured use.
    expect(restOf(w, m(WALL), 'spring-returning-pill', 0)).toBeCloseTo(50);
    expect(marketFactor(w, m(WALL), 'spring-returning-pill', 0)).toBeCloseTo(Math.SQRT2);
    // The Wall is a village and reaches nothing, so rice hauled there is from nowhere.
    expect(restOf(w, m(WALL), 'spirit-rice', 0)).toBe(25);
    expect(marketFactor(w, m(WALL), 'spirit-rice', 0)).toBeCloseTo(2);
    // Thin qi raises qi-fuel by half across the Border Wilds; the Fort's written need makes ×3.
    expect(restOf(w, m(CITY), 'qi-gathering-pill', 0)).toBeCloseTo(100 / 1.5);
    expect(restOf(w, m(FORT), 'qi-gathering-pill', 0)).toBeCloseTo(100 / 3);
    expect(wanted(w, m(CITY), 'qi-gathering-pill', 0)).toBe(true);
    // Outside the sum, a good keeps its written supply: the hunt's beast cores.
    expect(restOf(w, m(CITY), 'beast-core', 0)).toBeNull();
  });

  it('makes what its land gives and counts what its makers use', () => {
    // The City's coast gives salt by the land, half again what its eight million use.
    const salt = marketSum(w, m(CITY), 0).goods.get('broken-tide-salt')!;
    expect(salt.land).toBe(true);
    expect(salt.made).toBeCloseTo(1.5 * salt.used);
    // The March's spirit fields want a tenth of a sack of bone meal a sack, doubled by the Fort's
    // written need, carried from the Gate.
    const fort = marketSum(w, m(FORT), 0).goods;
    const meal = fort.get('bone-meal')!;
    expect(meal.used).toBeCloseTo(0.1 * fort.get('spirit-rice')!.made * 2);
    expect(meal.from).toBe('reach');
    expect(restOf(w, m(FORT), 'bone-meal', 0)).toBeCloseTo(50);
    // The Gate makes bone meal its own people don't use, for the markets round it: 200%.
    expect(restOf(w, m('qm-tushou-men'), 'bone-meal', 0)).toBe(200);
    // The City's refiners cut thunderhorn for their blades' grips.
    expect(marketSum(w, m(CITY), 0).goods.get('thunderhorn')!.used).toBeGreaterThan(0);
  });
});

describe('a lot against a month of use', () => {
  it('barely moves the City with a Bag, and moves the Wall’s healing thirty times as far', () => {
    const pill = 'spring-returning-pill';
    // Ten lots of about three pills.
    const city = moveSupply(w, m(CITY), pill, 30, 0);
    const before = marketFactor(w, m(CITY), pill, 0);
    expect(marketFactor(city, m(CITY), pill, 0) / before).toBeGreaterThan(0.99);
    const wall = (n: number) => supplyOf(moveSupply(w, m(WALL), pill, n, 0), m(WALL), pill, 0);
    const cityLot = supplyOf(moveSupply(w, m(CITY), pill, 3, 0), m(CITY), pill, 0) - 50;
    expect((wall(3) - 50) / cityLot).toBeGreaterThan(30);
    // A month's worth of the Wall's healing, about a hundred pills, takes it from 50% to 150%;
    // half of that fills its need.
    const month = monthUse(w, m(WALL), pill, 0)!;
    expect(month).toBeGreaterThan(80);
    expect(month).toBeLessThan(130);
    expect(wanted(moveSupply(w, m(WALL), pill, Math.ceil(month / 2), 0), m(WALL), pill, 0)).toBe(
      false,
    );
  });

  it('eases a moved supply a third of the way back to its rest each month', () => {
    const pill = 'spring-returning-pill';
    const sold = moveSupply(w, m(WALL), pill, 60, 0);
    const now = supplyOf(sold, m(WALL), pill, 0);
    expect(supplyOf(sold, m(WALL), pill, DAYS_PER_MONTH)).toBeCloseTo(now + (50 - now) / 3);
    expect(supplyOf(sold, m(WALL), pill, 6 * DAYS_PER_MONTH)).toBeCloseTo(
      50 + (now - 50) * (2 / 3) ** 6,
    );
  });
});

describe('purses from what people earn', () => {
  it('fills the City’s purses as the design reads them, and the Fort’s', () => {
    const purse = (id: string) => shopPurse(w, shop(id), 0);
    // In low-grade stones' worth (E5, by door): about 32 mid at the Qians' hall, 48 at the bounty
    // office, and Apricot Grove's branch about 3 of Pill Street's 32.
    expect(purse('mouth-guild') / 1000).toBeCloseTo(32, 0);
    expect(purse('mouth-bounty') / 1000).toBeCloseTo(48, 0);
    expect(purse('mouth-alchemy') / 1000).toBeCloseTo(2.9, 0);
    expect(purse('march-stall')).toBeGreaterThan(150);
    expect(purse('march-stall')).toBeLessThan(260);
    // A sect's hall reads its power's members: the Gate's 3,000 Qi Condensation and more.
    expect(purse('gate-sect')).toBeGreaterThan(purse('march-stall'));
  });

  it('moves a market’s sum and purses with its people', () => {
    const grown: World = { ...w, population: { [FORT]: { qi: 1500 } } };
    expect(populationOf(grown, FORT).qi).toBe(3000);
    expect(shopPurse(grown, shop('pacified-fort.house-1'), 0)).toBeGreaterThan(
      1.5 * shopPurse(w, shop('pacified-fort.house-1'), 0),
    );
    const used = (world: World) =>
      marketSum(world, m(FORT), 0).goods.get('qi-gathering-pill')!.used;
    expect(used(grown)).toBeCloseTo(2 * used(w));
  });

  it('keeps no population offsets in a save brought up from v35', () => {
    const raw = JSON.parse(JSON.stringify(makeSave(newLife({ name: 'Han Li', seed: 'e4' }), 1)));
    raw.version = 35;
    delete raw.state.world.population;
    expect(loadSave(raw).state.world.population).toEqual({});
  });
});

describe('the line of why', () => {
  it('says why for the City, the Fort, the Terraces and the Wall', () => {
    expect(whyOf(w, m(CITY), 0)).toBe(
      "Healing pills run short: an army's headquarters bleeds faster than the markets round it carry them in.",
    );
    expect(whyOf(w, m(FORT), 0)).toBe(
      'Gathering pills run short: the cadet school eats them faster than the sutler stocks them, on thin qi.',
    );
    expect(whyOf(w, m(TERRACES), 0)).toMatch(/^Gathering pills run short: the cave clans/);
    expect(whyOf(w, m(WALL), 0)).toBe(
      'Healing pills run short: the patrols bleed along 9,000 li of wall faster than the stall stocks them.',
    );
    // Where nothing written is short, the biggest gap is a surplus: the March's millet.
    expect(whyOf(w, m('grain-ford'), REAPED * DAYS_PER_MONTH)).toBe(
      'Frontier millet is cheap: Grain Ford grows half again what it eats.',
    );
  });
});
