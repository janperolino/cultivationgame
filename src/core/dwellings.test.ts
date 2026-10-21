// Dwellings and sites (design § Sites and formations, Dwellings are sites; K9): a life finds a hidden
// vein in the Border Wilds, makes its abode there, a raid comes when its worth outruns its guard and
// concealment keeps a thief away; a broker in a city rents a chamber that seclusion feels, and the
// Dwelling screen shows it there and greys it elsewhere. And the rest of the rules.
import { describe, expect, it } from 'vitest';
import { DAYS_PER_MONTH } from '../content/calendar.ts';
import { VEINS } from '../content/dwellings.ts';
import { resolveByDefault } from './cards.ts';
import {
  claim,
  claimsHere,
  densityOf,
  dwellingHere,
  dwellingOpens,
  fromStore,
  giveUp,
  layOutPlot,
  makeAbode,
  offersAt,
  readSite,
  startWork,
  stepMult,
  storeUsed,
  takeFromBroker,
  toStore,
} from './dwellings.ts';
import { cultivate } from './life.ts';
import { densityHere } from './organizations.ts';
import { joinPower, leavePower } from './orgs/membership.ts';
import { setSeat } from './orgs/seats.ts';
import { bandAt } from './map/depth.ts';
import { placeById } from './map/region.ts';
import { ensureMap, homeOf, mapOf } from './map/travel.ts';
import { geomancyOf, readLand, veinsOf, type Vein } from './map/veins.ts';
import { loadSave, makeSave } from './save/format.ts';
import { addItem, newLife, PLAYER_ID, withPlayer, type GameState } from './state.ts';

const CITY = 'qm-shoukou-cheng';
const GATE = 'qm-tushou-men';

const life = (seed = 'dwell'): GameState => {
  const s = ensureMap(newLife({ name: 'Han Li', seed }));
  return withPlayer(s, { ...s.player, stones: 10_000 });
};
const inside = (s: GameState, place: string): GameState => {
  const p = placeById(mapOf(s)!, place)!;
  return { ...s, map: { ...s.map!, at: [p.x, p.y], inside: place, course: null } };
};
const standAt = (s: GameState, at: readonly [number, number]): GameState => ({
  ...s,
  map: { ...s.map!, at: [at[0], at[1]], inside: null, course: null },
});
const ok = (r: { ok: true; state: GameState } | { ok: false; reason: string }): GameState => {
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};
/** The day step, a day at a time. */
const days = (s: GameState, n: number): GameState => {
  let next = s;
  for (let i = 0; i < n; i++) {
    next = { ...next, calendar: { ...next.calendar, day: next.calendar.day + 1 } };
    next = cultivate(next, 1, { offline: true });
  }
  return next;
};
const soulAt = (s: GameState, stage: number): GameState =>
  withPlayer(s, { ...s.player, soul: { ...s.player.soul, stage } });
const veins = (s: GameState): Vein[] => veinsOf(mapOf(s)!, s.lineage.id);
/** A vein a cultivator can read where it lies, and one bare of any power's sphere when asked. */
function aVein(s: GameState, where: (v: Vein) => boolean = () => true): Vein {
  const v = veins(s).find((x) => x.tier === 1 && where(x));
  if (!v) throw new Error('no vein');
  return v;
}
/** Reads the land at a vein with a soul strong enough, and claims what it offers. */
function claimVein(s: GameState, v: Vein): GameState {
  let t = standAt(soulAt(s, 9), [v.x, v.y]);
  t = { ...t, map: readLand(mapOf(t)!, t.lineage.id, t.map!, t.player, t.calendar.day).life };
  const i = claimsHere(t).findIndex((c) => c.vein?.id === v.id);
  return ok(claim(t, i));
}

describe('a broker in a city', () => {
  it('lets rooms, chambers and courtyards, and the spirit hill’s caves on the City’s tier 4 vein', () => {
    const s = inside(life(), CITY);
    const offers = offersAt(s, placeById(mapOf(s)!, CITY)!);
    const by = (k: string) => offers.find((o) => o.kind === k)!;
    expect(by('room').rent).toEqual([{ period: 'month', price: 3 }]);
    expect(by('chamber').rent).toEqual([
      { period: 'day', price: 0.6 },
      { period: 'month', price: 15 },
    ]);
    expect(by('courtyard')).toMatchObject({ slots: 1, buy: 300 });
    expect(by('mansion').buy).toBe(2400);
    expect(by('hill-cave')).toMatchObject({ steps: 2, slots: 3 });
    expect(by('crown-cave')).toMatchObject({ steps: 4, slots: 5 });
    expect(by('crown-cave').rent[0]!.price).toBe(810);
    expect(offers.some((o) => o.kind === 'garden')).toBe(false);
  });

  it('rents a chamber that seclusion feels, and the screen shows it there and greys it elsewhere', () => {
    const s = inside(life(), CITY);
    const t = ok(takeFromBroker(s, placeById(mapOf(s)!, CITY)!, 'chamber', 'month'));
    expect(t.player.stones).toBeLessThan(s.player.stones);
    expect(t.player.dwellings[0]).toMatchObject({ kind: 'chamber', held: 'rented', steps: 1 });
    expect(t.player.abode).toBe(t.player.dwellings[0]!.id);
    expect(dwellingOpens(t)).toBe(true);
    expect(dwellingHere(t)?.kind).toBe('chamber');
    expect(densityHere(t)).toBe(1.1);
    // Out on the road it is greyed: no dwelling where you stand, and the open air's qi.
    const road = standAt(t, [0, 0]);
    expect(dwellingHere(road)).toBeNull();
    expect(densityHere(road)).toBe(1);
    // A day's qi at the chamber against the street.
    const day = (x: GameState) => days(x, 1).player.qi.bar - x.player.qi.bar;
    const street = day(s);
    expect(street).toBeGreaterThan(0);
    expect(day(t) / street).toBeCloseTo(1.1, 2);
  });

  it('holds one dwelling a place, and the abode is home', () => {
    const s = inside(life(), CITY);
    const p = placeById(mapOf(s)!, CITY)!;
    const t = ok(takeFromBroker(s, p, 'room', 'month'));
    expect(takeFromBroker(t, p, 'chamber', 'day')).toMatchObject({ ok: false });
    expect(homeOf(t, mapOf(t)!).id).toBe(CITY);
  });

  it('takes the rent as its time turns, and lets a lapsed one go, its store kept a month', () => {
    const s = inside(life(), CITY);
    let t = ok(takeFromBroker(s, placeById(mapOf(s)!, CITY)!, 'room', 'month'));
    t = withPlayer(t, addItem(t.player, 'red-rocks-iron-ore', 5));
    t = ok(toStore(t, t.player.dwellings[0]!.id, 'red-rocks-iron-ore', 0));
    expect(t.player.dwellings[0]!.items['red-rocks-iron-ore']).toBe(5);
    const paid = days(t, 31);
    expect(paid.player.dwellings[0]!.until).toBeGreaterThan(t.player.dwellings[0]!.until!);
    const broke = days(withPlayer(t, { ...t.player, stones: 0 }), 31);
    const d = broke.player.dwellings[0]!;
    expect(d.until).toBeLessThanOrEqual(broke.calendar.day);
    expect(dwellingHere(broke)).toBeNull();
    expect(
      ok(fromStore(broke, d.id, 'red-rocks-iron-ore')).player.items['red-rocks-iron-ore'],
    ).toBe(5);
    expect(days(broke, 31).player.dwellings).toHaveLength(0);
  });
});

describe('hidden veins and geomancy', () => {
  it('seeds about three to a wild tract and one to a kingdom, the same for every life in the world', () => {
    const s = life();
    const map = mapOf(s)!;
    const v = veins(s);
    const tracts = map.areas.filter((a) => a.kind === 'tract').length;
    const kingdoms = map.areas.filter((a) => a.kind === 'kingdom').length;
    expect(v.length).toBeGreaterThan(tracts * 2);
    expect(v.length).toBeLessThanOrEqual(tracts * VEINS.perTract + kingdoms * VEINS.perKingdom);
    expect(v.filter((x) => x.tier === 1).length).toBeGreaterThan(v.length / 2);
    for (const x of v) expect(x.rating).toBe(Math.max(0, bandAt(map, [x.x, x.y])) + x.tier);
    expect(veinsOf(map, s.lineage.id)).toBe(v);
    const spots = (xs: Vein[]) => xs.map((x) => `${x.x},${x.y}`);
    expect(spots(veinsOf(map, 'another world'))).not.toEqual(spots(v));
  });

  it('is read by soul and Earth Dao against the vein’s rating, with no roll', () => {
    const s = life();
    const v = aVein(s, (x) => x.rating <= 2);
    const weak = standAt(soulAt(s, 1), [v.x, v.y]);
    expect(geomancyOf(weak.player)).toBe(0);
    const miss = readLand(mapOf(s)!, s.lineage.id, weak.map!, weak.player, 0);
    expect(miss.found).toHaveLength(0);
    // Unread, it is the nearest hidden vein: a ring to walk to.
    expect(miss.hint?.id).toBe(v.id);
    const strong = standAt(soulAt(s, 9), [v.x, v.y]);
    const hit = readLand(mapOf(s)!, s.lineage.id, strong.map!, strong.player, 0);
    expect(geomancyOf(strong.player)).toBe(2);
    expect(hit.found.map((x) => x.id)).toContain(v.id);
    expect(hit.lines.length).toBeGreaterThan(0);
  });
});

describe('claiming in the wild', () => {
  it('finds a hidden vein, makes a cave abode on it, and secludes at the vein’s step', () => {
    const s = life();
    const v = aVein(s, (x) => x.rating <= 2);
    const t = claimVein(s, v);
    const d = t.player.dwellings[0]!;
    expect(d).toMatchObject({ kind: 'cave', held: 'claimed', steps: 1, slots: 3 });
    expect(t.player.abode).toBe(d.id);
    // The site dug in on the vein never moves the region's veins.
    expect(veins(t).map((x) => `${x.id}@${x.x},${x.y}`)).toEqual(
      veins(s).map((x) => `${x.id}@${x.x},${x.y}`),
    );
    expect(claimsHere(t).find((c) => c.vein?.id === v.id)?.why).toBe('You hold it already.');
    // The world keeps the site after the life.
    expect(t.mapgen[t.map!.region]!.made?.some((m) => m.id === d.place)).toBe(true);
    const there = inside(t, d.place);
    expect(densityHere(there)).toBe(stepMult(1));
    expect(densityOf(there, d)).toBe(4);
    // Its land is slots, each a plot by K8's rules, at the dwelling's density.
    const laid = ok(layOutPlot(there, d.id));
    expect(laid.player.crafts.plots[0]).toMatchObject({ held: 'slot', density: 4 });
  });

  it('claims bare land as a hut, free where no power holds it and a deed inside a sphere', () => {
    const s = life();
    const map = mapOf(s)!;
    const wild = aVein(s, (x) => map.areas.find((a) => a.id === x.area)?.kind === 'tract');
    const t = standAt(s, [wild.x, wild.y]);
    const hut = claimsHere(t).findIndex((c) => c.kind === 'hut');
    const claimed = ok(claim(t, hut));
    const d = claimed.player.dwellings[0]!;
    expect(d.kind).toBe('hut');
    if (d.power)
      expect(claimed.world.standing.some((x) => x.row === 'squatting' && x.power === d.power)).toBe(
        true,
      );
    const gone = ok(giveUp(claimed, d.id));
    expect(gone.player.dwellings).toHaveLength(0);
    expect(gone.world.standing.some((x) => x.row === 'squatting')).toBe(false);
  });
});

describe('raids', () => {
  /** A hut on open land in a tract, its store filled worth more than a raider’s month. */
  function richHut(): GameState {
    const s = life();
    const map = mapOf(s)!;
    // Near people the land's thieves are of Qi Condensation, and a month of theirs is 30 low.
    const v = aVein(s, (x) => Math.max(0, bandAt(map, [x.x, x.y])) === 0);
    let t = standAt(s, [v.x, v.y]);
    t = ok(
      claim(
        t,
        claimsHere(t).findIndex((c) => c.kind === 'hut'),
      ),
    );
    const d = t.player.dwellings[0]!;
    t = inside(t, d.place);
    t = withPlayer(t, addItem(t.player, 'qi-gathering-pill', 40));
    for (let i = 0; i < 5; i++) {
      const r = toStore(t, d.id, 'qi-gathering-pill', 0);
      if (!r.ok) break;
      t = r.state;
    }
    return t;
  }

  it('come when a site’s worth outruns its guard, and take a third of it, dearest first', () => {
    const t = richHut();
    const d = t.player.dwellings[0]!;
    const read = readSite(t, d)!;
    expect(read.thievesFind).toBe(true);
    expect(read.worth).toBeGreaterThan(read.wage);
    expect(read.thievesCome).toBe(true);
    // Away when the month turns: the card comes and waits.
    const away = standAt({ ...t, calendar: { ...t.calendar, day: DAYS_PER_MONTH - 1 } }, [0, 0]);
    const next = days(away, 2);
    const card = next.cards.pending.find((p) => p.card === 'raid-thieves')!;
    expect(card).toBeDefined();
    expect(card.vars?.here).toBe(0);
    const pills = (x: GameState) => x.player.dwellings[0]!.items['qi-gathering-pill'] ?? 0;
    const after = resolveByDefault(next, card.uid);
    expect(after.player.dwellings[0]!.raid).toBeNull();
    expect(pills(after)).toBe(pills(next) - Math.ceil(pills(next) / 3));
    expect(storeUsed(after.player.dwellings[0]!.items)).toBe(1);
    expect(after.chronicle.some((e) => e.type === 'dwelling' && e.data.what === 'robbed')).toBe(
      true,
    );
  });

  it('never find a site whose concealment stands above the land’s band', () => {
    const s = life();
    const v = aVein(s, (x) => x.rating === 1);
    let t = claimVein(s, v);
    const d = t.player.dwellings[0]!;
    t = inside(t, d.place);
    t = withPlayer(t, addItem(t.player, 'qi-gathering-pill', 40));
    t = ok(toStore(t, d.id, 'qi-gathering-pill', 0));
    const read = readSite(t, t.player.dwellings[0]!)!;
    expect(read.land).toBe(0);
    expect(read.concealment).toBeGreaterThan(0);
    expect(read.worth).toBeGreaterThan(read.wage);
    expect(read.thievesCome).toBe(false);
    // Beasts smell the raised qi: a band closer for the vein's step, and drawn by it.
    expect(read.againstBeasts).toBe(read.concealment - 1);
    expect(read.beastsDrawn).toBe(true);
  });
});

describe('your seat’s quarters', () => {
  it('house a member by seat, open the screen after a month, and hand the footlocker back on a clean parting', () => {
    const s = life();
    const j = joinPower(s.world, PLAYER_ID, GATE, s.calendar.day);
    if (!j.ok) throw new Error(j.why);
    let t: GameState = { ...s, world: setSeat(j.world, PLAYER_ID, GATE, 'outer') };
    t = days(t, 1);
    const q = t.player.dwellings.find((d) => d.kind === 'quarters')!;
    expect(q).toMatchObject({ place: GATE, held: 'seat', steps: 1, store: 16 });
    expect(t.player.abode).toBe(q.id);
    expect(dwellingOpens(t)).toBe(false);
    expect(dwellingOpens(days(t, 30))).toBe(true);
    t = inside(t, GATE);
    t = withPlayer(t, addItem(t.player, 'red-rocks-iron-ore', 3));
    t = ok(toStore(t, q.id, 'red-rocks-iron-ore', 0));
    expect(t.player.items['red-rocks-iron-ore'] ?? 0).toBe(0);
    const left = leavePower(t.world, PLAYER_ID, GATE, t.calendar.day, { you: true });
    const parted = days({ ...t, world: left.world }, 1);
    expect(parted.player.dwellings.some((d) => d.kind === 'quarters')).toBe(false);
    expect(parted.player.items['red-rocks-iron-ore']).toBe(3);
  });
});

describe('building your own base', () => {
  it('clears land on the days you spend there, up to its cap', () => {
    const s = life();
    let t = claimVein(
      s,
      aVein(s, (x) => x.rating <= 2),
    );
    const d = t.player.dwellings[0]!;
    t = inside(t, d.place);
    t = ok(startWork(t, d.id, 'clear'));
    expect(t.player.dwellings[0]!.work).toEqual({ id: 'clear', left: 6 });
    // Away, it waits.
    expect(days(standAt(t, [0, 0]), 6).player.dwellings[0]!.slots).toBe(d.slots);
    const done = days(t, 6);
    expect(done.player.dwellings[0]!.slots).toBe(d.slots + 1);
    expect(done.player.dwellings[0]!.work).toBeNull();
  });
});

describe('the save', () => {
  it('keeps dwellings, the abode, the made site and the veins read (v49)', () => {
    const s = life();
    const t = claimVein(
      s,
      aVein(s, (x) => x.rating <= 2),
    );
    const back = loadSave(makeSave(t, 1));
    expect(back.version).toBe(49);
    expect(back.state.player.dwellings).toEqual(t.player.dwellings);
    expect(back.state.player.abode).toBe(t.player.abode);
    expect(back.state.map!.veins).toEqual(t.map!.veins);
    expect(makeAbode(back.state, t.player.dwellings[0]!.id)).toMatchObject({ ok: false });
  });
});
