// O2's halls and gifts (design § Professions, people and powers, What membership gives and asks;
// § Economy, Methods in the market, Sect contribution; § Cultivation, Lines, chapters and kinship):
// the exchange hall in contribution, the open counter in stones, the scripture pavilion by seat,
// the monthly allowance by seat and treatment, the dwelling in seclusion, the tithe and the guest
// elder's seat.
import { describe, expect, it } from 'vitest';
import { DAYS_PER_MONTH } from '../content/calendar.ts';
import { copyChapter } from '../content/copies.ts';
import { shop } from '../content/shops.ts';
import type { SeatId } from '../content/organizations.ts';
import type { RealmId } from '../content/realms.ts';
import {
  buyChapter,
  counterSells,
  hallTerms,
  membersLine,
  pavilion,
  pavilionChapters,
  titheFor,
} from './halls.ts';
import { cultivate } from './life.ts';
import { ensureMap } from './map/travel.ts';
import {
  addBalance,
  allowanceOf,
  becomeGuest,
  canJoin,
  densityHere,
  dwellingOf,
  dwellingWords,
  givenBy,
  guestOffered,
  joinPower,
  membership,
  payAllowances,
  setSeat,
} from './organizations.ts';
import { worthOf, stonesOf } from './purse.ts';
import { addStanding } from './resolver/opinion.ts';
import { emptyWorld } from './resolver/world.ts';
import { loadSave, makeSave } from './save/format.ts';
import { buy, hallPoints, sell, shelf, stockOf } from './shops.ts';
import { itemCount, newLife, PLAYER_ID, withPlayer, type GameState } from './state.ts';

const GATE = 'qm-tushou-men';
const LAMPS = 'qm-shoudeng-zong';
const REINS = 'qm-baijiang-zong';
const BELL = 'qm-jingzhong-si';
const YOU = PLAYER_ID;
const QC = 'qi-condensation';
const CF = 'core-formation';

const life = (seed = 'halls'): GameState => {
  const s = newLife({ name: 'Han Li', seed });
  return withPlayer(s, { ...s.player, stones: 100_000 });
};
const atRealm = (s: GameState, realm: RealmId, stage: number): GameState =>
  withPlayer(s, { ...s.player, qi: { ...s.player.qi, realm, stage } });
/** The player joined to a power, at a seat, with a balance. */
const member = (s: GameState, power: string, seat: SeatId = 'outer', balance = 1000) => {
  const r = joinPower(s.world, YOU, power, s.calendar.day);
  if (!r.ok) throw new Error(r.why);
  let world = setSeat(r.world, YOU, power, seat);
  world = addBalance(world, YOU, power, balance);
  return { ...s, world };
};
/** A power's people know you: "A mission done for us", +10, or a value of your own. */
const known = (s: GameState, power: string, value = 10): GameState => ({
  ...s,
  world: addStanding(s.world, { power, about: YOU, row: 'mission', value }, s.calendar.day),
});
const balance = (s: GameState, power: string) => membership(s.world, YOU, power)?.balance ?? 0;
const nextMonth = (s: GameState, months = 1): GameState => ({
  ...s,
  calendar: { ...s.calendar, day: s.calendar.day + months * DAYS_PER_MONTH },
});

describe('the exchange hall', () => {
  it('sells to an outer Gate disciple in contribution, at the market’s price and never above', () => {
    const s = member(life(), GATE);
    expect(hallTerms(s, shop('gate-sect'))).toEqual({ as: 'member' });
    const lot = shelf(s, 'gate-sect').find((l) => !l.standing)!;
    const points = hallPoints(shop('gate-sect'), lot);
    expect(points).toBeLessThanOrEqual(lot.price);
    const r = buy(s, 'gate-sect', lot.slot);
    if (!r.ok) throw new Error(r.reason);
    expect(balance(r.state, GATE)).toBeCloseTo(1000 - points, 1);
    expect(worthOf(stonesOf(r.state.player))).toBe(worthOf(stonesOf(s.player)));
  });

  it('refuses a member whose balance won’t cover it', () => {
    const s = member(life(), GATE, 'outer', 0);
    const lot = shelf(s, 'gate-sect')[0]!;
    expect(buy(s, 'gate-sect', lot.slot)).toMatchObject({ ok: false });
  });

  it('leaves the Gate’s own chapters to its pavilion', () => {
    const s = member(life(), GATE);
    for (let month = 0; month < 12; month++) {
      const t = { ...s, calendar: { ...s.calendar, day: month * DAYS_PER_MONTH } };
      const own = pavilionChapters(GATE);
      expect(shelf(t, 'gate-sect').some((l) => own.includes(l.thing))).toBe(false);
    }
  });
});

describe('the open counter', () => {
  it('shuts to a stranger and opens at friendly, in stones at ×1.25', () => {
    const s = life();
    expect(hallTerms(s, shop('gate-sect'))?.as).toBe('shut');
    const t = known(s, GATE);
    expect(hallTerms(t, shop('gate-sect'))).toEqual({ as: 'counter' });
    const lot = shelf(t, 'gate-sect')[0]!;
    const posted = shelf(member(life(), GATE), 'gate-sect').find((l) => l.slot === lot.slot)!;
    const r = buy(t, 'gate-sect', lot.slot);
    if (!r.ok) throw new Error(r.reason);
    const paid = worthOf(stonesOf(t.player)) - worthOf(stonesOf(r.state.player));
    expect(paid).toBeCloseTo(posted.price * 1.25, 0);
  });

  it('never shows the members’ lines or a chapter', () => {
    const sh = shop('gate-sect');
    expect(membersLine(sh, 'beast-blood-pill')).toBe(true);
    expect(membersLine(sh, 'gutting-saber')).toBe(false);
    let theirs = 0;
    for (let month = 0; month < 12; month++) {
      const day = month * DAYS_PER_MONTH;
      const t = { ...known(life(), GATE), calendar: { day } };
      for (const l of shelf(t, 'gate-sect')) expect(counterSells(sh, l.thing)).toBe(true);
      theirs += stockOf('gate-sect', month, emptyWorld()).filter((l) =>
        membersLine(sh, l.thing),
      ).length;
    }
    // The members' lines do stand on the shelf, for members.
    expect(theirs).toBeGreaterThan(0);
  });

  it('the three trading sects keep members’ lines too', () => {
    expect(membersLine(shop('reins-sect'), 'shared-blood-pill')).toBe(true);
    expect(membersLine(shop('bones-sect'), 'bone-binding-talisman')).toBe(true);
    expect(membersLine(shop('lamps-sect'), 'fen-yin-pill')).toBe(true);
    expect(membersLine(shop('lamps-sect'), 'yin-fire-lantern')).toBe(false);
  });
});

describe('the scripture pavilion', () => {
  const CH2 = 'method:butcher-saber-foundation';

  it('keeps the Gate’s own chapters', () => {
    const own = pavilionChapters(GATE);
    expect(own).toContain('method:butcher-saber');
    expect(own).toContain(CH2);
    expect(copyChapter(CH2)).toBe(2);
  });

  it('sells chapter 2 only from the inner seat', () => {
    const outer = member(life(), GATE);
    expect(pavilion(outer, GATE)!.find((l) => l.thing === CH2)!.open).toBe(false);
    expect(buyChapter(outer, GATE, CH2).ok).toBe(false);
    expect(buyChapter(outer, GATE, 'method:butcher-saber').ok).toBe(true);
    const inner = member(life(), GATE, 'inner');
    const r = buyChapter(inner, GATE, CH2);
    if (!r.ok) throw new Error(r.reason);
    expect(r.state.player.copies[CH2]).toBe(1);
    expect(balance(r.state, GATE)).toBeLessThan(1000);
  });

  it('is shut to an outsider', () => {
    expect(pavilion(known(life(), GATE), GATE)).toBeNull();
  });
});

describe('the monthly allowance', () => {
  it('reads the seat and the treatment', () => {
    expect(allowanceOf(REINS, 'outer', QC)).toEqual({ stones: 3, pills: 1 });
    expect(allowanceOf(REINS, 'inner', QC)).toEqual({ stones: 15, pills: 3 });
    // From true up on the realm curve, each seat at least ×1.5 the one below: a Qi Condensation
    // true disciple 22.5, a Foundation one 60.
    expect(allowanceOf(REINS, 'true', QC)).toEqual({ stones: 22.5, pills: 0 });
    expect(allowanceOf(REINS, 'true', 'foundation-establishment')).toEqual({
      stones: 60,
      pills: 0,
    });
    expect(allowanceOf(REINS, 'head', 'foundation-establishment').stones).toBeGreaterThan(
      allowanceOf(REINS, 'elder', 'foundation-establishment').stones * 1.4,
    );
    // Harsh: half the stones and none of the pills below true, ×1.5 above.
    expect(allowanceOf(GATE, 'outer', QC)).toEqual({ stones: 1.5, pills: 0 });
    expect(allowanceOf(GATE, 'inner', QC)).toEqual({ stones: 7.5, pills: 0 });
    expect(allowanceOf(GATE, 'true', QC)).toEqual({ stones: 33.8, pills: 0 });
    // A Core Formation elder ×1.5 a Core Formation true disciple's 60 × 30, at fair.
    expect(allowanceOf(REINS, 'elder', CF)).toEqual({ stones: 2700, pills: 0 });
    // Generous: ×1.5, the pills rounded down.
    expect(allowanceOf(BELL, 'inner', QC)).toEqual({ stones: 22.5, pills: 4 });
  });

  it('hands out pills its own hall won’t buy back', () => {
    const s = member(life(), REINS);
    const paid = payAllowances(nextMonth(s));
    const pill = 'qi-gathering-pill';
    const held = itemCount(paid.player, pill);
    expect(givenBy(paid.world, REINS, pill)).toBe(1);
    const back = sell({ ...paid, map: { ...paid.map!, inside: REINS } }, 'reins-sect', pill, 1);
    expect(back).toMatchObject({ ok: false, reason: expect.stringContaining('gave you') });
    // One bought elsewhere sells: only what it gave is refused.
    const more = withPlayer(paid, {
      ...paid.player,
      items: { ...paid.player.items, [pill]: held + 1 },
    });
    const r = sell({ ...more, map: { ...more.map!, inside: REINS } }, 'reins-sect', pill, 1);
    if (!r.ok) expect(r.reason).not.toContain('gave you');
  });

  it('arrives as the month turns, once', () => {
    const s = member(life(), REINS);
    expect(payAllowances(s)).toBe(s);
    const paid = payAllowances(nextMonth(s));
    expect(worthOf(stonesOf(paid.player)) - worthOf(stonesOf(s.player))).toBeCloseTo(3);
    expect(itemCount(paid.player, 'qi-gathering-pill')).toBe(
      itemCount(s.player, 'qi-gathering-pill') + 1,
    );
    expect(payAllowances(paid)).toBe(paid);
  });

  it('comes on the day step, by seat at a harsh power', () => {
    const outer = member(life(), GATE);
    const inner = member(life(), GATE, 'inner');
    const gain = (s: GameState) => {
      const t = nextMonth(s);
      return (
        worthOf(stonesOf(cultivate(t, 0.01, { offline: true }).player)) -
        worthOf(stonesOf(s.player))
      );
    };
    expect(gain(outer)).toBeCloseTo(1.5, 1);
    expect(gain(inner)).toBeCloseTo(7.5, 1);
  });
});

describe('the dwelling', () => {
  const inside = (s: GameState, place: string): GameState => {
    const m = ensureMap(s);
    return { ...m, map: { ...m.map!, inside: place, course: null } };
  };

  it('is the seat’s density inside the power’s seat, capped by its vein', () => {
    expect(dwellingOf(inside(member(life(), GATE), GATE))?.density).toBe(1.1);
    expect(dwellingOf(inside(member(life(), GATE, 'inner'), GATE))?.density).toBe(1.3);
    expect(dwellingOf(inside(member(life(), GATE, 'true'), GATE))?.density).toBe(1.6);
    expect(dwellingOf(inside(member(life(), GATE, 'elder'), GATE))?.density).toBe(2);
    // The Lamp-Keepers' tier 2 vein holds no more than a cave's.
    expect(dwellingOf(inside(member(life(), LAMPS, 'true'), LAMPS))?.density).toBe(1.3);
    // Only while you seclude there.
    expect(dwellingOf(inside(member(life(), GATE), REINS))).toBeNull();
    expect(dwellingOf(member(life(), GATE))).toBeNull();
  });

  it('is named where you stand, and the day’s qi reads it', () => {
    const cave = inside(member(life(), GATE, 'inner'), GATE);
    expect(dwellingWords(cave)).toBe(
      'Your cave on the Beast-Butcher Gate’s vein: qi ×1.3 while you seclude here.',
    );
    expect(densityHere(cave)).toBe(1.3);
    expect(dwellingWords(member(life(), GATE))).toBeNull();
  });

  it('runs seclusion at the Gate faster by seat', () => {
    const day = (s: GameState) => {
      const t = atRealm(inside(s, GATE), QC, 5);
      const next = { ...t, calendar: { ...t.calendar, day: t.calendar.day + 1 } };
      return cultivate(next, 1, { offline: true }).player.qi.bar - t.player.qi.bar;
    };
    const plain = day(life());
    const outer = day(member(life(), GATE));
    const inner = day(member(life(), GATE, 'inner'));
    expect(plain).toBeGreaterThan(0);
    expect(outer / plain).toBeCloseTo(1.1, 2);
    expect(inner / plain).toBeCloseTo(1.3, 2);
  });
});

describe('the tithe', () => {
  it('a harsh power takes 30% of what its lower seats bring in', () => {
    const outer = member(life(), GATE);
    expect(titheFor(outer, shop('mouth-bounty'))).toBe(0.3);
    expect(titheFor(outer, shop('gate-sect'))).toBe(0.3);
    expect(titheFor(outer, shop('mouth-refiner'))).toBe(0);
    expect(titheFor(member(life(), GATE, 'true'), shop('mouth-bounty'))).toBe(0);
    expect(titheFor(member(life(), REINS), shop('mouth-bounty'))).toBe(0);
  });
});

describe('the guest elder', () => {
  it('is offered to an honored outsider, opens the hall but not the pavilion, and binds no house', () => {
    const s = known(life(), GATE, 60);
    expect(guestOffered(known(life(), GATE), GATE)).toBe(false);
    expect(guestOffered(s, GATE)).toBe(true);
    const r = becomeGuest(s, GATE);
    if (!r.ok) throw new Error(r.why);
    expect(hallTerms(r.state, shop('gate-sect'))).toEqual({ as: 'member' });
    expect(pavilion(r.state, GATE)).toBeNull();
    expect(canJoin(r.state.world, YOU, REINS).ok).toBe(true);
    expect(allowanceOf(GATE, 'elder', QC, true)).toEqual({ stones: 33.8, pills: 0 });
  });
});

describe('the save', () => {
  it('brings a v38 membership up paid for its month', () => {
    const s = member(life(), GATE);
    const raw = JSON.parse(JSON.stringify(makeSave(s, 1))) as {
      version: number;
      state: { world: { members: { paid?: number }[] } };
    };
    raw.version = 38;
    delete raw.state.world.members[0]!.paid;
    const back = loadSave(raw);
    expect(back.version).toBe(42);
    expect(back.state.world.members[0]!.paid).toBe(Math.floor(s.calendar.day / DAYS_PER_MONTH));
  });
});
