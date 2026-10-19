// Entering places (P3.6b): the gate's toll and the watch, a sect's gate, going in on arriving, the
// City's shops through the shop screen's calls, the teahouse's rumor a day, maps for sale, guides,
// caravans, the money changer, the inn by rule, and the v25 migration.
import { describe, expect, it } from 'vitest';
import { advance } from '../loop.ts';
import { cultivate } from '../life.ts';
import { join, addFame } from '../resolver/names.ts';
import { loadSave, makeSave } from '../save/format.ts';
import { buy, haggle, sell, shelf } from '../shops.ts';
import { addItem, itemCount, newLife, withPlayer, type GameState } from '../state.ts';
import { known } from './fog.ts';
import { enterAt, gateOf, placeKindOf, stepOut } from './gate.ts';
import {
  bedNights,
  buyMap,
  caravansAt,
  changeMoney,
  guideKnows,
  guidesAt,
  hearRumor,
  hireGuide,
  insideOf,
  joinCaravan,
  mapsAt,
  rumorWords,
} from './place.ts';
import { placeById, type MapPlace } from './region.ts';
import { ensureMap, goToPlace, leaveGroup, mapOf } from './travel.ts';

const BW = 'qm-bianhuang';
const CITY = 'qm-shoukou-cheng';
const GATE = 'qm-tushou-men';

const life = (seed = 'place'): GameState => {
  const s = ensureMap(
    newLife({ name: 'Han Li', seed, origin: { id: 'cave-orphan', choice: 'along' } }),
  );
  // A quiet road: these tests meet no encounters (core/map/encounters.test.ts meets them).
  const q = { ...s, map: { ...s.map!, notice: { n: 0, next: 1e9 } } };
  return withPlayer(q, { ...q.player, stones: 600, silver: 100 });
};

const place = (s: GameState, id: string): MapPlace => placeById(mapOf(s)!, id)!;

/** Stands you at a place, as if you had walked there. */
const at = (s: GameState, id: string): GameState => {
  const p = place(s, id);
  return { ...s, map: { ...s.map!, at: [p.x, p.y], course: null } };
};

const enter = (s: GameState, id: string): GameState => {
  const r = enterAt(at(s, id), mapOf(s)!, place(s, id));
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};

const run = (s: GameState, days: number): GameState =>
  advance(s, days * 10_000, { step: cultivate }).state;

describe('the gate and the watch', () => {
  it('knows each kind of place', () => {
    const s = life();
    expect(placeKindOf(place(s, CITY))).toBe('city');
    expect(placeKindOf(place(s, 'pacified-fort'))).toBe('town');
    expect(placeKindOf(place(s, 'spear-plow'))).toBe('village');
    expect(placeKindOf(place(s, GATE))).toBe('gate');
    expect(placeKindOf(place(s, 'qm-yeqiao-hui'))).toBe('hall');
  });

  it('takes the City’s toll, and lets you into a town for nothing', () => {
    const s = life();
    const inCity = enter(s, CITY);
    expect(inCity.map!.inside).toBe(CITY);
    expect(inCity.player.stones).toBe(599);
    const inFort = enter(s, 'pacified-fort');
    expect(inFort.player.stones).toBe(600);
  });

  it('won’t let you in from afar, or with no stone for the toll', () => {
    const s = life();
    expect(enterAt(s, mapOf(s)!, place(s, CITY)).ok).toBe(false);
    const broke = withPlayer(at(s, CITY), { ...s.player, stones: 0 });
    expect(enterAt(broke, mapOf(s)!, place(s, CITY)).ok).toBe(false);
  });

  it('waives the toll for the renowned and turns the infamous away', () => {
    const s = life();
    const famous = { ...s, world: addFame(s.world, s.player.id, BW, 'renown', 4, s.calendar.day) };
    expect(gateOf(famous, mapOf(s)!, place(s, CITY)).kind).toBe('waived');
    expect(enter(famous, CITY).player.stones).toBe(600);
    const wanted = { ...s, world: addFame(s.world, s.player.id, BW, 'infamy', 4, s.calendar.day) };
    expect(gateOf(wanted, mapOf(s)!, place(s, CITY)).kind).toBe('refused');
    expect(enterAt(at(wanted, CITY), mapOf(s)!, place(s, CITY)).ok).toBe(false);
  });

  it('lets a bribe the sergeant takes through, or he remembers it', () => {
    const s = life();
    const wanted = at(
      { ...s, world: addFame(s.world, s.player.id, BW, 'infamy', 4, s.calendar.day) },
      CITY,
    );
    const r = enterAt(wanted, mapOf(s)!, place(s, CITY), { bribe: true });
    if (r.ok) {
      expect(r.state.map!.inside).toBe(CITY);
      expect(r.state.player.stones).toBe(595);
    } else {
      expect(r.state!.world.memories.some((m) => m.holder === `watch:${CITY}`)).toBe(true);
    }
  });

  it('keeps a sect’s gate shut until you carry its token', () => {
    const s = at(life(), GATE);
    expect(gateOf(s, mapOf(s)!, place(s, GATE)).kind).toBe('shut');
    expect(enterAt(s, mapOf(s)!, place(s, GATE)).ok).toBe(false);
    const member = { ...s, world: join(s.world, s.player.id, GATE, s.calendar.day, { you: true }) };
    expect(gateOf(member, mapOf(s)!, place(s, GATE)).kind).toBe('member');
    expect(enterAt(member, mapOf(s)!, place(s, GATE)).ok).toBe(true);
  });

  it('goes in on arriving when the course says to, and setting off leaves', () => {
    let s = at(life(), 'pacified-fort');
    const c = goToPlace(s, CITY, true);
    if (!c.ok) throw new Error(c.reason);
    s = run(c.state, Math.ceil(c.state.map!.course!.days) + 2);
    expect(s.map!.inside).toBe(CITY);
    const away = goToPlace(s, 'pacified-fort');
    if (!away.ok) throw new Error(away.reason);
    expect(away.state.map!.inside).toBeNull();
    expect(stepOut(s).map!.inside).toBeNull();
  });
});

describe('inside the City', () => {
  it('buys, haggles and sells through the shop screen’s calls', () => {
    let s = enter(life(), CITY);
    const lot = shelf(s, 'mouth-stall')[0]!;
    const b = buy(s, 'mouth-stall', lot.slot);
    if (!b.ok) throw new Error(b.reason);
    s = b.state;
    expect(shelf(s, 'mouth-stall').some((l) => l.slot === lot.slot)).toBe(false);
    const h = haggle(s, 'mouth-alchemy');
    expect(h.ok).toBe(true);
    s = withPlayer(s, addItem(s.player, 'beast-core', 2));
    const before = s.player.stones;
    const sold = sell(s, 'mouth-bounty', 'beast-core', 1);
    if (!sold.ok) throw new Error(sold.reason);
    expect(sold.state.player.stones).toBeGreaterThan(before);
  });

  it('tells one rumor a day in the teahouse, for a pot of tea', () => {
    let s = enter(life(), CITY);
    const r = hearRumor(s, CITY);
    if (!r.ok) throw new Error(r.reason);
    s = r.state;
    expect(known(s.map!, r.heard!)).toBe('rumored');
    expect(s.player.silver).toBe(95);
    expect(hearRumor(s, CITY).ok).toBe(false);
    const words = rumorWords(place(s, CITY), place(s, r.heard!));
    expect(words.line).not.toContain('{');
  });

  it('sells the region’s map and each kingdom’s, and a bought map sketches its ground', () => {
    let s = enter(life(), CITY);
    expect(mapsAt(s, CITY).map((m) => m.id)).toEqual(
      expect.arrayContaining(['map-qm-bianhuang', 'map-qm-anbian-fu', 'map-qm-muling-guo']),
    );
    const r = buyMap(s, CITY, 'map-qm-anbian-fu');
    if (!r.ok) throw new Error(r.reason);
    s = r.state;
    expect(itemCount(s.player, 'map-qm-anbian-fu')).toBe(1);
    expect(s.player.stones).toBe(599 - 30);
    expect(known(s.map!, 'qm-anbian-fu')).not.toBe('unknown');
    expect(known(s.map!, 'pacified-fort')).not.toBe('unknown');
    const town = enter(life(), 'pacified-fort');
    expect(mapsAt(town, 'pacified-fort').map((m) => m.id)).toEqual(['map-qm-anbian-fu']);
  });

  it('leaves by caravan: riding it on its day to where it’s bound', () => {
    let s = enter(life(), CITY);
    const cs = caravansAt(s, CITY);
    expect(cs.length).toBe(3);
    const c = cs[0]!;
    const r = joinCaravan(s, CITY, c.id, 'ride');
    if (!r.ok) throw new Error(r.reason);
    s = r.state;
    expect(s.map!.group?.bound).toBe(c.bound);
    expect(s.map!.way).toBe('wagon');
    expect(s.map!.inside).toBeNull();
    const wait = c.departs - s.calendar.day;
    s = run(s, Math.ceil(wait + s.map!.course!.days) + 3);
    expect(s.map!.group).toBeNull();
    // Off the wagon, you go on your own legs again.
    expect(s.map!.way).toBe('light-step');
    const b = place(s, c.bound);
    expect(Math.hypot(s.map!.at[0] - b.x, s.map!.at[1] - b.y)).toBeLessThan(250);
  });

  it('waits in town for a caravan that hasn’t left', () => {
    let s = enter(life(), CITY);
    const c = caravansAt(s, CITY).find((x) => x.departs - s.calendar.day > 0.5);
    if (!c) throw new Error('no caravan leaving later');
    const r = joinCaravan(s, CITY, c.id, 'guard');
    if (!r.ok) throw new Error(r.reason);
    s = r.state;
    const start = s.map!.at;
    s = run(s, 0.5);
    expect(s.map!.at).toEqual(start);
    expect(s.map!.roadRoutine).toBe('caravan');
    // Walking off leaves the caravan's routine with it.
    const left = leaveGroup(s);
    if (!left.ok) throw new Error(left.reason);
    expect(left.state.map!.roadRoutine).toBe('by-day');
  });

  it('hires a guide to a place they know, paid for the days', () => {
    const s = enter(life(), CITY);
    const gs = guidesAt(s, CITY);
    expect(gs.length).toBe(2);
    const g = gs.find((x) => guideKnows(s, CITY, x).length > 0);
    if (!g) throw new Error('no guide knows a place');
    const site = guideKnows(s, CITY, g)[0]!;
    const r = hireGuide(s, CITY, g.id, site.id);
    if (!r.ok) throw new Error(r.reason);
    expect(r.state.map!.course?.target).toBe(site.id);
    expect(known(r.state.map!, site.id)).toBe('sketched');
    expect(r.state.player.stones).toBeLessThan(s.player.stones);
  });

  it('changes money at the money changer', () => {
    const s = enter(life(), CITY);
    const r = changeMoney(s, CITY, 'break-low');
    if (!r.ok) throw new Error(r.reason);
    expect(r.state.player.silver).toBe(210);
    expect(changeMoney(enter(life(), 'spear-plow'), 'spear-plow', 'break-low').ok).toBe(false);
  });

  it('charges the inn by rule for nights away from home, and nothing in the wilds', () => {
    const s = enter(life(), CITY);
    expect(insideOf(s)?.info.bed).toBe(20);
    const after = bedNights(s, Math.floor(s.calendar.day) + 0.5, Math.floor(s.calendar.day) + 2.5);
    expect(after.player.silver).toBe(60);
    expect(bedNights(life(), 0.5, 2.5)).toEqual(life());
  });
});

describe('the v25 save', () => {
  it('migrates a v24 map to standing outside, with no rumors heard', () => {
    const s = life();
    const raw = JSON.parse(JSON.stringify(makeSave(s, 0))) as {
      version: number;
      state: { map: Record<string, unknown> };
    };
    raw.version = 24;
    delete raw.state.map.inside;
    delete raw.state.map.heard;
    const loaded = loadSave(raw);
    expect(loaded.state.map!.inside).toBeNull();
    expect(loaded.state.map!.heard).toEqual({});
  });

  it('round-trips the place you are in', () => {
    const s = enter(life(), CITY);
    const back = loadSave(JSON.parse(JSON.stringify(makeSave(s, 0))));
    expect(back.state.map!.inside).toBe(CITY);
  });
});
