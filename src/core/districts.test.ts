// E5, markets as districts (design § Economy, Districts and shops; What a market holds, a shop's
// purse): the stock lives in the market and a shop is a window onto it. The City's districts show
// full shelves, keepers' purses read at their level, buying from one shop draws on the market's
// supply, and a v36 save comes up with its shops' months and keepers sorted.
import { describe, expect, it } from 'vitest';
import { DAYS_PER_MONTH } from '../content/calendar.ts';
import { hasCopy } from '../content/copies.ts';
import { baseOf, item } from '../content/items.ts';
import { lotShape } from './loot.ts';
import {
  DOOR_SHARE,
  doorsAt,
  HAGGLE_OFF,
  keeperName,
  shop,
  SHOP_KIND_INFO,
} from '../content/shops.ts';
import {
  goodOf,
  market,
  MARKETS,
  moveSupply,
  shopPurse,
  shortAtRest,
  supplyOf,
} from './markets.ts';
import { emptyWorld } from './resolver/world.ts';
import { loadSave, makeSave } from './save/format.ts';
import { buy, claimOf, haggle, offerFor, shelf, standsAt, stockOf } from './shops.ts';
import { newLife, withPlayer, type GameState } from './state.ts';

const CITY = 'qm-shoukou-cheng';
const w = emptyWorld();
const life = (): GameState => {
  const s = newLife({ name: 'Han Li', seed: 'districts' });
  return withPlayer(s, { ...s.player, stones: 50_000, silver: 500, items: {} });
};
const floor = (thing: string) => lotShape(baseOf(thing), { mortal: true })!.rarities[0];
const standing = (id: string, thing: string, month = 0) =>
  stockOf(id, month).find((l) => l.standing && l.thing === thing);

describe('shelves as slices of the market', () => {
  it('stands the City’s pills by the dozen, and the small shops by the hundred', () => {
    expect(standing('mouth-alchemy', 'qi-gathering-pill')!.n).toBeGreaterThanOrEqual(20);
    expect(standing(`${CITY}.alchemy-small`, 'qi-gathering-pill')!.n).toBeGreaterThan(200);
    // A grain store always carries its street's biggest good: thousands of sacks of millet.
    const grain = doorsAt(CITY).find((d) => d.kind === 'mortal')!;
    for (const id of grain.shops)
      expect(standing(id, 'frontier-millet')!.n, id).toBeGreaterThan(1000);
  });

  it('sells each ware in its own district, or the free market where it has none', () => {
    expect(claimOf('qi-gathering-pill')).toBe('alchemy');
    expect(claimOf('cinnabar-ore')).toBe('talisman');
    expect(claimOf('red-rocks-iron-ore')).toBe('refiner');
    expect(claimOf('spirit-rice')).toBe('stall');
    expect(claimOf('frontier-millet')).toBe('mortal');
    // The City's talismans stand in Talisman Lane; Pacified Fort's on its free market's stalls.
    expect(standing(`${CITY}.talisman-small`, 'ember-talisman')).toBeDefined();
    expect(standing('pacified-fort.stall-small', 'ember-talisman')).toBeDefined();
  });

  it('rolls display lots only for what no shelf there stands at that rarity', () => {
    for (const mk of MARKETS) {
      for (let month = 0; month < 3; month++) {
        const stands = standsAt(w, mk, month);
        for (const id of mk.shops) {
          const k = shop(id).kind;
          if (k === 'sect' || k === 'black-market') continue;
          for (const l of stockOf(id, month))
            if (!l.standing && !hasCopy(l.thing) && stands.has(goodOf(l.thing)))
              expect(item(l.thing).rarity, `${id} ${l.thing}`).not.toBe(floor(l.thing));
        }
      }
    }
  });

  it('draws on the pool: a shop’s count falls by what you bought, and the market’s supply with it', () => {
    let s = life();
    const line = shelf(s, 'mouth-alchemy').find((l) => l.thing === 'qi-gathering-pill')!;
    const city = market(CITY)!;
    const before = supplyOf(s.world, city, 'qi-gathering-pill', s.calendar.day);
    const r = buy(s, 'mouth-alchemy', line.slot, 10);
    if (!r.ok) throw new Error(r.reason);
    s = r.state;
    expect(shelf(s, 'mouth-alchemy').find((l) => l.slot === line.slot)!.n).toBe(line.n - 10);
    expect(s.player.items['qi-gathering-pill']).toBe(10);
    // Two hundred off the small shops move the City's supply of 7,500 a month a few points, and
    // the price at every shop with it; the branch's count stands, since a shelf holds what the
    // month opened with.
    const small = `${CITY}.alchemy-small`;
    const bulk = shelf(s, small).find((l) => l.thing === 'qi-gathering-pill')!;
    expect(bulk.n).toBe(
      standing(small, 'qi-gathering-pill', Math.floor(s.calendar.day / DAYS_PER_MONTH))!.n,
    );
    const r2 = buy(s, small, bulk.slot, 200);
    if (!r2.ok) throw new Error(r2.reason);
    s = r2.state;
    expect(supplyOf(s.world, city, 'qi-gathering-pill', s.calendar.day)).toBeLessThan(before - 2);
    const after = shelf(s, 'mouth-alchemy').find((l) => l.slot === line.slot)!;
    expect(after.n).toBe(line.n - 10);
    expect(after.price).toBeGreaterThan(line.price);
    // You can't buy more than stands.
    const rest = shelf(s, 'mouth-alchemy').find((l) => l.slot === line.slot)!;
    const all = buy(s, 'mouth-alchemy', line.slot, 10_000);
    if (!all.ok) throw new Error(all.reason);
    expect(all.state.player.items['qi-gathering-pill']).toBe(210 + rest.n);
    expect(shelf(all.state, 'mouth-alchemy').some((l) => l.slot === line.slot)).toBe(false);
  });
});

describe('purses, owners and names', () => {
  it('shares a market’s money among its doors as the design lists them', () => {
    // design § Economy, a shop's purse: the bounty office 0.3, a black market 0.3, a trading
    // house 0.2, Pill Street 0.2, Refiners' Row 0.15, the small markets 0.05.
    expect(DOOR_SHARE).toMatchObject({
      bounty: 0.3,
      'black-market': 0.3,
      house: 0.2,
      alchemy: 0.2,
      refiner: 0.15,
      talisman: 0.05,
      parts: 0.05,
      stall: 0.05,
    });
  });

  it('reads a keeper’s purse as a share of the district’s', () => {
    const purse = (id: string) => shopPurse(w, shop(id), 0);
    const pills = doorsAt(CITY).find((d) => d.kind === 'alchemy')!;
    const street = pills.shops.reduce((t, id) => t + purse(id), 0);
    expect(street / 1000).toBeCloseTo(32, 0);
    expect(purse('mouth-alchemy') / 1000).toBeCloseTo(2.9, 0);
    // The mortal shops share a month of their mortals' basket: thousands of taels, not millions.
    expect(purse('mouth-mortal')).toBeGreaterThan(10_000);
    expect(purse('mouth-mortal')).toBeLessThan(50_000);
    for (const mk of MARKETS)
      for (const id of mk.shops) {
        const sh = shop(id);
        if (SHOP_KIND_INFO[sh.kind].money === 'silver' && !sh.small)
          expect(purse(id), id).toBeLessThan(100_000);
      }
  });

  it('names a notable shop for its keeper, and the keeper you haggle with by it', () => {
    const notable = doorsAt(CITY)
      .find((d) => d.kind === 'alchemy')!
      .shops.map((id) => shop(id))
      .find((sh) => sh.keeper)!;
    expect(notable.name).toContain(notable.keeper!.split(' ').at(-1)!);
    const r = haggle(life(), notable.id);
    if (!r.ok) throw new Error(r.reason);
    expect(r.state.world.kept[`keeper:${notable.id}`]!.name).toBe(notable.keeper);
    expect(keeperName(shop('mouth-alchemy'))).toBe("the alchemy shop's keeper");
  });
});

describe('the save', () => {
  it('brings a v36 save up: a gone shop’s month and keeper go, a standing keeper takes its name', () => {
    const raw = JSON.parse(JSON.stringify(makeSave(life(), 1))) as {
      version: number;
      state: { world: { shops: Record<string, unknown>; kept: Record<string, unknown> } };
    };
    raw.version = 36;
    const month = { month: 0, bought: [1], paid: 3, haggle: null };
    raw.state.world.shops = { 'mouth-alchemy': month, [`${CITY}.stall-5`]: month };
    // A keeper as v36 kept one, under a shop that stands and one that no longer does.
    const haggled = haggle(life(), 'mouth-alchemy');
    if (!haggled.ok) throw new Error(haggled.reason);
    const keeper = haggled.state.world.kept['keeper:mouth-alchemy']!;
    raw.state.world.kept = {
      [`keeper:${CITY}.alchemy-2`]: keeper,
      [`keeper:${CITY}.stall-5`]: keeper,
    };
    const back = loadSave(raw);
    expect(back.version).toBe(50);
    expect(back.state.world.shops).toEqual({ 'mouth-alchemy': { ...month, took: {} } });
    expect(Object.keys(back.state.world.kept)).toEqual([`keeper:${CITY}.alchemy-2`]);
    expect(back.state.world.kept[`keeper:${CITY}.alchemy-2`]!.name).toBe(
      shop(`${CITY}.alchemy-2`).keeper,
    );
  });
});

describe('no loop pays', () => {
  // The cheapest each thing can be bought for in a market today: a clear haggle off, except what the
  // market is short of at rest, which no keeper haggles over.
  const loopsIn = (s: GameState, markets = MARKETS): string[] => {
    const out: string[] = [];
    for (const m of markets) {
      const cheapest = new Map<string, number>();
      for (const id of m.shops)
        for (const l of shelf(s, id)) {
          const short = shortAtRest(s.world, m, l.thing, s.calendar.day);
          const ask = l.price * (short ? 1 : 1 - HAGGLE_OFF.clear);
          if (ask < (cheapest.get(l.thing) ?? Infinity)) cheapest.set(l.thing, ask);
        }
      for (const [thing, ask] of cheapest)
        for (const id of m.shops) {
          const o = offerFor(s, id, thing);
          if (o.ok && o.each > ask + 1e-9) out.push(`${m.id} ${id} ${thing} ${o.each} > ${ask}`);
        }
    }
    return out;
  };

  it('never offers more for a thing than its market sells it for, in spring or after the harvest', () => {
    const s = life();
    expect(loopsIn(s)).toEqual([]);
    expect(
      loopsIn({ ...s, calendar: { ...s.calendar, day: s.calendar.day + 7 * DAYS_PER_MONTH } }),
    ).toEqual([]);
  });

  it('pays no loop when buying drops a made good under 100% and the market starts to want it', () => {
    const s0 = life();
    const fort = market('pacified-fort')!;
    // Bought down hard: the Fort's own rice, resting at 150%, now stands short and wanted.
    const world = moveSupply(s0.world, fort, 'spirit-rice', -1e9, s0.calendar.day);
    const s = { ...s0, world };
    expect(supplyOf(world, fort, 'spirit-rice', s.calendar.day)).toBeLessThan(100);
    expect(shortAtRest(world, fort, 'spirit-rice', s.calendar.day)).toBe(false);
    expect(loopsIn(s, [fort])).toEqual([]);
  });
});
