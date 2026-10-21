// Commissions (K12, design § Production, commissions and the craft deck): a shop posting for its
// market's biggest shortage its craft makes, with the line of why; taking and handing one in at
// ×1.5 the market; the grade a graded one asks; by name from craft renown 3; one left unfilled
// costing the keeper's regard; a piece made to order; the code review's `askAt` and fixed offer;
// and the alchemy hall's furnace lent to the bench by its perk's id.
import { describe, expect, it } from 'vitest';
import { DAYS_PER_MONTH } from '../content/calendar.ts';
import { COMMISSION, ORDER } from '../content/commissions.ts';
import { item, variantId } from '../content/items.ts';
import { shop } from '../content/shops.ts';
import {
  cantTake,
  carried,
  collectOrder,
  commissionsDay,
  handIn,
  holdCommission,
  namedAt,
  offeredAt,
  placeOrder,
  postedAt,
  postsFor,
  quote,
  takeCommission,
} from './commissions.ts';
import { addCraftFame } from './craftRenown.ts';
import { toolAt } from './crafts.ts';
import { goodTags, marketFactor, MARKETS } from './markets.ts';
import { shortages, whyOf } from './making.ts';
import { priceOf } from './prices.ts';
import { stonesOf, worthOf } from './purse.ts';
import { keeperId, askAt, offerFor } from './shops.ts';
import { addItem, newLife, withPlayer, type GameState } from './state.ts';

const CITY = 'City of the Guarded Mouth';
const marketNamed = (name: string) => MARKETS.find((m) => m.name === name)!;
const shopsOf = (name: string, kind: string) =>
  marketNamed(name).shops.filter((id) => shop(id).kind === kind);

function life(): GameState {
  const s = newLife({ name: 'Han Li', seed: 'commissions' });
  return withPlayer(s, { ...s.player, stones: 2000 });
}

const worth = (s: GameState) => worthOf(stonesOf(s.player));

describe('a commission posted', () => {
  const s = life();
  const day = s.calendar.day;

  it('asks for the market’s biggest shortage its craft makes, with the line of why', () => {
    const m = marketNamed(CITY);
    const healing = shortages(s.world, m, Math.floor(day / DAYS_PER_MONTH))[0]!;
    expect(healing.need).toBe('healing');
    const posts = shopsOf(CITY, 'alchemy').map((id) => postedAt(s.world, id, day)!);
    for (const p of posts) {
      expect(goodTags(p.thing)).toContain('healing');
      expect(p.why).toBe(whyOf(s.world, m, day));
      expect(p.n).toBe(10);
    }
    // The shops of one craft spread over the shortage's goods.
    expect(new Set(posts.map((p) => p.thing)).size).toBeGreaterThan(1);
  });

  it('asks for rare work a shelf can’t fill, at ×1.5 the market (×2 graded)', () => {
    for (const m of MARKETS)
      for (const id of m.shops) {
        const p = postedAt(s.world, id, day);
        if (!p) continue;
        expect(p.floor, id).not.toBe('white');
        const share = p.grade ? COMMISSION.graded : COMMISSION.pay;
        const market =
          priceOf(variantId(p.thing, p.floor)) * marketFactor(s.world, m, p.thing, day);
        expect(p.each).toBeCloseTo(market * share, 1);
      }
  });

  it('posts nothing at a refiner where no gear runs short, and armor where it does', () => {
    for (const id of shopsOf('Pacified Fort', 'refiner'))
      expect(postedAt(s.world, id, day)).toBeNull();
    const paddocks = shopsOf('Thousand Paddocks', 'refiner').map((id) =>
      postedAt(s.world, id, day),
    );
    expect(paddocks.every((p) => p && item(p.thing).kind === 'gear')).toBe(true);
  });

  it('lets one stall post talismans where no talisman shop stands', () => {
    const stalls = shopsOf('River-Bend City', 'stall');
    expect(stalls.map(postsFor)).toEqual(['talismans', ...stalls.slice(1).map(() => null)]);
    expect(postsFor(shopsOf(CITY, 'stall')[0]!)).toBeNull();
  });
});

describe('taking and handing in', () => {
  // An ungraded one: the first of the City's alchemy shops whose notice asks no grade.
  const shopId = shopsOf(CITY, 'alchemy').find(
    (id) => !postedAt(life().world, id, life().calendar.day)!.grade,
  )!;

  it('pays the fixed price for anything of the thing at the floor, a point of name, and the keeper’s thanks', () => {
    let s = life();
    const p = postedAt(s.world, shopId, s.calendar.day)!;
    const r = takeCommission(s, shopId, 'posted');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;
    expect(offeredAt(s, shopId).some((o) => o.kind === 'posted')).toBe(false);
    // Bought, not made: a bounty board takes any make (Jan's call).
    s = withPlayer(s, addItem(s.player, variantId(p.thing, 'white'), p.n));
    expect(carried(s.player, s.player.crafts.commissions![0]!)).toBe(0);
    expect(handIn(s, 0).ok).toBe(false);
    s = withPlayer(s, addItem(s.player, variantId(p.thing, p.floor), p.n + 2));
    const before = worth(s);
    const done = handIn(s, 0);
    expect(done.ok).toBe(true);
    if (!done.ok) return;
    expect(worth(done.state) - before).toBeCloseTo(p.each * p.n, 1);
    expect(done.state.player.crafts.commissions![0]!.done).toBe(true);
    expect(done.state.player.crafts.renown['qm-bianhuang']?.alchemy?.n).toBe(COMMISSION.point);
    expect(done.state.world.memories.some((m) => m.holder === keeperId(shopId))).toBe(true);
    expect(handIn(done.state, 0).ok).toBe(false);
  });

  it('holds at most three at once, and a graded one asks for the grade', () => {
    let s = life();
    const base = postedAt(s.world, shopId, s.calendar.day)!;
    for (let i = 0; i < COMMISSION.most; i++) {
      const r = holdCommission(s, { ...base, shop: `${shopId}-${i}` });
      expect(r.ok).toBe(true);
      if (r.ok) s = r.state;
    }
    expect(cantTake(s.player, base)).toMatch(/already/);
    expect(cantTake(life().player, { ...base, grade: 1 })).toMatch(/grade/);
  });

  it('costs the keeper’s regard when left past its month', () => {
    let s = life();
    const r = takeCommission(s, shopId, 'posted');
    if (!r.ok) throw new Error(r.reason);
    s = {
      ...r.state,
      calendar: { ...r.state.calendar, day: r.state.calendar.day + DAYS_PER_MONTH },
    };
    s = commissionsDay(s);
    expect(s.player.crafts.commissions).toEqual([]);
    const m = s.world.memories.find((x) => x.holder === keeperId(shopId));
    expect(m?.row).toBe('broke-promise');
    expect(m?.value).toBe(COMMISSION.regard);
  });

  it('asks for you by name from craft renown 3, for what you make', () => {
    let s = life();
    expect(namedAt(s, shopId)).toBeNull();
    let c = addCraftFame(s.player, 'qm-bianhuang', 'alchemy', 4, s.calendar.day);
    c = {
      ...c,
      crafts: {
        ...c.crafts,
        recent: [
          {
            day: 0,
            recipe: 'qi-gathering-pill',
            made: 'qi-gathering-pill',
            count: 10,
            blew: false,
          },
        ],
      },
    };
    s = withPlayer(s, c);
    const named = namedAt(s, shopId)!;
    expect(named.thing).toBe('qi-gathering-pill');
    expect(named.asker).toMatch(/, /);
    expect(named.floor).toBe('green');
  });
});

describe('made to order', () => {
  const refiner = shopsOf('Thousand Paddocks', 'refiner')[1]!;

  it('quotes ×1.25 the market with its inputs, less with yours, and makes it after the crafter’s hours', () => {
    let s = life();
    const q = quote(s, refiner, 'boar-hide-vest', false)!;
    const m = marketNamed('Thousand Paddocks');
    const market =
      priceOf('boar-hide-vest') * marketFactor(s.world, m, 'boar-hide-vest', s.calendar.day);
    expect(q.price).toBeCloseTo(market * ORDER.pay, 1);
    expect(q.days).toBe(1);
    const r = placeOrder(s, refiner, 'boar-hide-vest', false);
    if (!r.ok) throw new Error(r.reason);
    s = r.state;
    expect(collectOrder(s, 0).ok).toBe(false);
    s = { ...s, calendar: { ...s.calendar, day: s.calendar.day + q.days } };
    const got = collectOrder(s, 0);
    if (!got.ok) throw new Error(got.reason);
    const made = Object.keys(got.state.player.items).find((id) => id.startsWith('boar-hide-vest'));
    expect(made).toBeTruthy();
    expect(got.state.player.crafts.orders).toEqual([]);
  });

  it('refuses your inputs when you don’t carry them', () => {
    expect(quote(life(), refiner, 'boar-hide-vest', true)!.cant).toMatch(/inputs/);
  });
});

describe('the code review’s asks', () => {
  it('rounds a posted price in one place', () => {
    expect(askAt(1.234)).toBe(1.2);
    expect(askAt(1.234, true)).toBe(1.23);
    expect(askAt(0.001)).toBe(0.1);
    expect(askAt(0.001, true)).toBe(0.01);
  });

  it('pays a fixed price past the rate', () => {
    const s = life();
    const id = shopsOf(CITY, 'alchemy')[0]!;
    const o = offerFor(s, id, 'qi-gathering-pill', 9);
    expect(o.ok && o.each).toBe(9);
  });

  it('lends the alchemy hall’s furnace to the bench while you hold its post', () => {
    const s = life();
    expect(toolAt(s.player, 'alchemy', 1)).toBeNull();
    const held = {
      ...s.player,
      jobs: [
        {
          id: 'gate-alchemy-hall',
          since: 0,
          month: 0,
          kept: 0,
          missed: 0,
          owed: { stones: 0, points: 0 },
        },
      ],
    };
    expect(toolAt(held, 'alchemy', 1)?.id).toBe('bronze-pill-furnace');
  });
});
