// N1 Who acts: the rules take who acts, so a kept cast member lives the same month you do. Lan, a
// made-up inner disciple of the Lamp-Keeper Sect (a fair power, its inner seat Qi Condensation
// 7–9), draws her month, is struck off after three missed quotas and buys her Foundation Pill
// the month her purse holds it, through the functions you run.
import { describe, expect, it } from 'vitest';
import { DAYS_PER_MONTH, DAYS_PER_YEAR } from '../content/calendar.ts';
import { baseOf } from '../content/items.ts';
import { ALLOWANCE, ALLOWANCE_PILL, YEARS_PILLS } from '../content/organizations.ts';
import { SHOP_KIND_INFO, SHOPS } from '../content/shops.ts';
import { hasCopy } from '../content/copies.ts';
import { castPills, nextPill, pillShops } from './cast.ts';
import { atHome, canTakeJob, jobsDay, jobsView } from './jobs.ts';
import { askToJoin, offerGift } from './joining.ts';
import { cultivate } from './life.ts';
import { marketOfShop } from './markets.ts';
import {
  atSeat,
  donate,
  joinPower,
  membership,
  membershipDay,
  monthIndex,
  takeLesson,
  yearOf,
} from './organizations.ts';
import { hallTerms } from './halls.ts';
import { buy, priceToYou, sell, shelf, stockOf } from './shops.ts';
import { loadSave, makeSave } from './save/format.ts';
import { rollNature } from './resolver/nature.ts';
import type { RealmStage } from './resolver/world.ts';
import { newLife, type GameState } from './state.ts';
import {
  acts,
  cultivator,
  giveTo,
  heldOf,
  monthHolders,
  payFrom,
  purseOf,
  realmStageOf,
  receiveInto,
} from './who.ts';

const LAMPS = 'qm-shoudeng-zong';
const LAN = 'made:lan';
const QC = 'qi-condensation' as const;

/** Lan as the world keeps her: a seed and pins, at a realm, living at `home`, a member of `power`. */
function withLan(
  s: GameState,
  o: { realm?: RealmStage; home?: string; power?: string; purse?: number; join?: boolean } = {},
): GameState {
  const power = o.power ?? LAMPS;
  const realm = o.realm ?? { realm: QC, stage: 8 };
  const kept = {
    name: 'Lan',
    nature: rollNature(LAN),
    power,
    home: o.home ?? power,
    realm,
    born: -18,
    ...(o.purse ? { purse: o.purse } : {}),
  };
  const world = { ...s.world, kept: { ...s.world.kept, [LAN]: kept } };
  if (o.join === false) return { ...s, world };
  const r = joinPower(world, LAN, power, s.calendar.day, { realm });
  if (!r.ok) throw new Error(r.why);
  return { ...s, world: r.world };
}

const life = (seed = 'who'): GameState => newLife({ name: 'Han Li', seed });
const months = (s: GameState, n = 1): GameState => ({
  ...s,
  calendar: { ...s.calendar, day: s.calendar.day + n * DAYS_PER_MONTH },
});
/** A month's turn through the organizations' day, as `cultivate` runs it. */
const turn = (s: GameState, n = 1): GameState => {
  let next = s;
  for (let i = 0; i < n; i++) next = membershipDay(months(next), DAYS_PER_MONTH, atHome);
  return next;
};

describe('who acts: the pocket', () => {
  it('reads and pays a cast member’s purse and held, and your stones and Bag', () => {
    const s = withLan(life(), { purse: 40 });
    expect(acts(s, LAN)).toBe(true);
    expect(acts(s, 'nobody')).toBe(false);
    expect(cultivator(s, LAN)).toBeNull();
    expect(cultivator(s, s.player.id)).toBe(s.player);
    expect(realmStageOf(s, LAN)).toEqual({ realm: QC, stage: 8 });
    expect(purseOf(s, LAN)).toBe(40);
    expect(payFrom(s, LAN, 41)).toBeNull();
    const paid = payFrom(s, LAN, 15)!;
    expect(purseOf(paid, LAN)).toBe(25);
    expect(purseOf(receiveInto(paid, LAN, 5), LAN)).toBe(30);
    const given = giveTo(s, LAN, ALLOWANCE_PILL, 2);
    expect(heldOf(given, LAN, ALLOWANCE_PILL)).toBe(2);
    expect(heldOf(giveTo(given, LAN, ALLOWANCE_PILL, -2), LAN, ALLOWANCE_PILL)).toBe(0);
    // Yours run through the same calls.
    const you = s.player.id;
    expect(purseOf(receiveInto(s, you, 7), you)).toBeCloseTo(purseOf(s, you) + 7);
    expect(heldOf(giveTo(s, you, ALLOWANCE_PILL, 1), you, ALLOWANCE_PILL)).toBe(
      heldOf(s, you, ALLOWANCE_PILL) + 1,
    );
  });

  it('runs the month over you and every kept member with a realm', () => {
    const s = withLan(life());
    expect(monthHolders(s)).toEqual([s.player.id, LAN]);
  });
});

describe('who acts: a power’s month over the cast', () => {
  it('Lan draws her 15 low and three Qi-Gathering Pills as the month turns', () => {
    const s = turn(withLan(life()));
    expect(purseOf(s, LAN)).toBe(ALLOWANCE.inner.stones);
    expect(heldOf(s, LAN, ALLOWANCE_PILL)).toBe(ALLOWANCE.inner.pills);
    // Two more months pay two more, and nothing lands in your Bag.
    const later = turn(s, 2);
    expect(purseOf(later, LAN)).toBe(3 * ALLOWANCE.inner.stones);
    expect(heldOf(later, LAN, ALLOWANCE_PILL)).toBe(3 * ALLOWANCE.inner.pills);
  });

  it('at home her post keeps the quota; away from the seat she is struck off on the third', () => {
    const home = turn(withLan(life()), 4);
    expect(membership(home.world, LAN, LAMPS)).toBeDefined();
    expect(atSeat(home, LAN, LAMPS)).toBe(true);

    const away = withLan(life(), { home: 'pacified-fort' });
    expect(atHome(away, LAN, LAMPS)).toBe(false);
    const two = turn(away, 2);
    expect(membership(two.world, LAN, LAMPS)?.missed).toBe(2);
    expect(two.world.standing.some((x) => x.about === LAN && x.row === 'missed-quota')).toBe(true);
    const three = turn(two);
    expect(membership(three.world, LAN, LAMPS)).toBeUndefined();
    expect(three.world.standing.some((x) => x.about === LAN && x.row === 'struck-off')).toBe(true);
    // The cast's month leaves no line in your chronicle.
    expect(three.chronicle.length).toBe(away.chronicle.length);
  });

  it('counts her leave away from the seat', () => {
    const s = turn(withLan(life(), { home: 'pacified-fort' }));
    expect(membership(s.world, LAN, LAMPS)?.leave?.days).toBe(DAYS_PER_MONTH);
  });

  it('takes the inner seat outright when her realm reaches it, and sits the trial in its month', () => {
    const raised = turn(withLan(life(), { realm: { realm: QC, stage: 5 } }));
    expect(membership(raised.world, LAN, LAMPS)?.seat).toBe('outer');
    const climbed = {
      ...raised,
      world: {
        ...raised.world,
        kept: {
          ...raised.world.kept,
          [LAN]: { ...raised.world.kept[LAN]!, realm: { realm: QC, stage: 7 } },
        },
      },
    };
    expect(membership(turn(climbed).world, LAN, LAMPS)?.seat).toBe('inner');

    // An outer disciple at the outer seat's top sits the trial as the year's first month turns.
    const start = life();
    const year = yearOf(start.calendar.day) + 1;
    const s = withLan(
      { ...start, calendar: { day: year * DAYS_PER_YEAR - DAYS_PER_MONTH } },
      { realm: { realm: QC, stage: 6 } },
    );
    const sat = turn(s);
    const m = membership(sat.world, LAN, LAMPS)!;
    expect(m.tried).toBe(year);
    expect(m.seat).toBe('inner');
    // The year's pill goes down the ranking to her, into what she holds.
    expect(heldOf(sat, LAN, YEARS_PILLS.pill)).toBe(1);
  });
});

describe('who acts: the wheel runs only on a full cultivator', () => {
  it('a cast member keeps no shift, bench or plot', () => {
    const s = withLan(life());
    const take = canTakeJob(s, LAN, 'gate-garden');
    expect(take.ok).toBe(false);
    expect(jobsDay(s, LAN, 0, 1)).toBe(s);
    expect(jobsView(s, LAN)).toEqual([]);
    expect(takeLesson(s, LAN, LAMPS).ok).toBe(false);
  });
});

describe('who acts: actions name who acts', () => {
  it('her hall serves her as its own, and she pays from her purse a point a low', () => {
    const s = withLan(life(), { purse: 5000 });
    const hall = SHOPS.find((sh) => sh.power === LAMPS && SHOP_KIND_INFO[sh.kind].members)!;
    expect(hallTerms(s, LAN, hall)?.as).toBe('member');
    const lot = shelf(s, LAN, hall.id).find((l) => !hasCopy(l.thing))!;
    const price = priceToYou(s, LAN, hall.id, lot, 1);
    const r = buy(s, LAN, hall.id, lot.slot, 1);
    if (!r.ok) throw new Error(r.reason);
    expect(purseOf(r.state, LAN)).toBeCloseTo(5000 - price);
    expect(heldOf(r.state, LAN, lot.thing)).toBe(1);
    // Her balance is untouched, and she sells nothing (only a full cultivator has a Bag).
    expect(membership(r.state.world, LAN, LAMPS)?.balance).toBe(0);
    expect(sell(r.state, LAN, hall.id, lot.thing, 1).ok).toBe(false);
  });

  it('she donates, gives and joins by the rules you do', () => {
    const s = withLan(life(), { purse: 100 });
    const d = donate(s, LAN, LAMPS, { stones: 20 });
    if (!d.ok) throw new Error(d.why);
    expect(membership(d.state.world, LAN, LAMPS)?.balance).toBe(10);
    expect(purseOf(d.state, LAN)).toBe(80);
    const gift = offerGift(s, LAN, 'qm-tushou-men', { stones: 100 });
    if (!gift.ok) throw new Error(gift.reason);
    expect(purseOf(gift.state, LAN)).toBe(0);
    // Not yet a member, she sits its entrance test by her realm and joins at the inner seat.
    const outsider = withLan(life(), { join: false });
    const join = askToJoin(outsider, LAN, LAMPS);
    if (!join.ok) throw new Error(join.reason);
    expect(membership(join.state.world, LAN, LAMPS)?.seat).toBe('inner');
    expect(join.state.chronicle.length).toBe(outsider.chronicle.length);
  });
});

describe('who acts: the purse buys the next breakthrough pill', () => {
  /** The first month and shop (never a black market) whose shelf carries a Foundation Pill. */
  /** A month the pill is on a shelf; with `season`, one that opens a season (the day step's). */
  function pillOnSale(s: GameState, season = false): { month: number; shop: string } {
    for (
      let month = monthIndex(s.calendar.day) + 1;
      month < monthIndex(s.calendar.day) + 120;
      month++
    ) {
      if (season && month % 3 !== 0) continue;
      for (const sh of SHOPS) {
        if (sh.kind === 'black-market' || SHOP_KIND_INFO[sh.kind].money === 'silver') continue;
        if (SHOP_KIND_INFO[sh.kind].members || !marketOfShop(sh.id)) continue;
        if (stockOf(sh.id, month, s.world).some((l) => baseOf(l.thing) === 'foundation-pill'))
          return { month, shop: sh.id };
      }
    }
    throw new Error('No Foundation Pill on sale in ten years.');
  }

  it('wants the gate pill only at her realm’s last stage', () => {
    expect(nextPill(withLan(life()), LAN)).toBeNull();
    expect(nextPill(withLan(life(), { realm: { realm: QC, stage: 9 } }), LAN)).toBe(
      'foundation-pill',
    );
  });

  it('buys a Foundation Pill the month her purse holds it, at the market nearest her home', () => {
    const base = life();
    const sale = pillOnSale(base);
    const home = marketOfShop(sale.shop)!.id;
    const s0 = withLan(base, { realm: { realm: QC, stage: 9 }, home, purse: 5000 });
    expect(pillShops(s0, LAN)[0]!.power).toBe(LAMPS);
    expect(pillShops(s0, LAN).some((sh) => sh.kind === 'black-market')).toBe(false);
    const day = sale.month * DAYS_PER_MONTH;
    const s = { ...s0, calendar: { ...s0.calendar, day } };
    const r = castPills(s, day - 1);
    expect(heldOf(r, LAN, 'foundation-pill')).toBe(1);
    expect(purseOf(r, LAN)).toBeLessThan(5000);
    // Within the month nothing turns, so nothing more is bought; a poor purse buys nothing.
    expect(castPills(r, day)).toBe(r);
    const poor = withLan(base, { realm: { realm: QC, stage: 9 }, home, purse: 100 });
    const p = castPills({ ...poor, calendar: { ...poor.calendar, day } }, day - 1);
    expect(heldOf(p, LAN, 'foundation-pill')).toBe(0);
  });

  it('runs inside the day step you live by, as the season turns (N2)', () => {
    const base = life();
    const sale = pillOnSale(base, true);
    const home = marketOfShop(sale.shop)!.id;
    const day = sale.month * DAYS_PER_MONTH;
    // She joins the day before, so the months away from her seat don't strike her off first.
    const eve = { ...base, calendar: { ...base.calendar, day: day - 0.5 } };
    const before = withLan(eve, { realm: { realm: QC, stage: 9 }, home, purse: 5000 });
    const after = cultivate({ ...before, calendar: { ...before.calendar, day } }, 0.5, {
      offline: true,
    });
    expect(heldOf(after, LAN, 'foundation-pill')).toBe(1);
  });
});

describe('who acts: the save', () => {
  it('keeps a cast member’s purse and held items (v57), and an old save starts them empty', () => {
    const s = giveTo(withLan(life(), { purse: 12.5 }), LAN, ALLOWANCE_PILL, 3);
    const back = loadSave(JSON.parse(JSON.stringify(makeSave(s, 0))));
    expect(back.version).toBe(58);
    expect(back.state.world.kept[LAN]?.purse).toBe(12.5);
    expect(back.state.world.kept[LAN]?.held).toEqual({ [ALLOWANCE_PILL]: 3 });
    const old = { ...makeSave(withLan(life()), 0), version: 56 };
    expect(loadSave(JSON.parse(JSON.stringify(old))).state.world.kept[LAN]?.purse).toBeUndefined();
  });
});
