// The travel map (P3.6): the region seeded once for a world, the fog's states rising only, sight
// on the map, looking around, rumors, what a start knows, routing, depth and qi density, the travel
// step on the day loop, riding at a jostled half, groups, and the v24 migration.
import { describe, expect, it } from 'vitest';
import { regionData } from '../../content/map/index.ts';
import { LOOK_LI, SIGHT_CLOSED, SIGHT_OPEN } from '../../content/map/travel.ts';
import { advance } from '../loop.ts';
import { cultivate } from '../life.ts';
import { loadSave, makeSave } from '../save/format.ts';
import { addItem, newLife, withPlayer, type GameState } from '../state.ts';
import {
  bandAt,
  bandOfRealm,
  depthInfo,
  edgeBand,
  heartBand,
  heartRings,
  peopleLi,
  pullsIn,
} from './depth.ts';
import { known, lookAround, raise, rumor, seeFrom, siteRating, sightAt } from './fog.ts';
import type { Pt } from './geometry.ts';
import {
  areaAt,
  generateRegion,
  placeById,
  regionMap,
  terrainAt,
  type MapPlace,
  type RegionMap,
} from './region.ts';
import { planRoute } from './route.ts';
import {
  canGoBy,
  cultivationWheel,
  ensureMap,
  followRoadRoutine,
  goBy,
  goToPlace,
  joinGroup,
  leaveGroup,
  burnSwift,
  liPerDay,
  mapOf,
  setCourse,
  setRoadHours,
  forgetRoadRoutine,
  renameRoadRoutine,
  travelDays,
} from './travel.ts';

const BW = 'qm-bianhuang';

const life = (
  origin: 'cave-orphan' | 'conscript' | 'frontier-orphan' = 'cave-orphan',
  seed = 'map',
): GameState =>
  quiet(ensureMap(newLife({ name: 'Han Li', seed, origin: { id: origin, choice: 'along' } })));

/** A quiet road: the travel tests meet no encounters (core/map/encounters.test.ts meets them). */
const quiet = (s: GameState): GameState => ({
  ...s,
  map: { ...s.map!, notice: { n: 0, next: 1e9 } },
});

const mapFor = (s: GameState): RegionMap => mapOf(s)!;

/** Runs real time through the day loop. */
const run = (s: GameState, days: number): GameState => {
  const msPerDay = 10_000; // a day is ten real seconds at Qi Condensation
  return advance(s, days * msPerDay, { step: cultivate }).state;
};

describe('the region, seeded once for a world', () => {
  it('gives the same places to the same world, and others to another', () => {
    const a = generateRegion(BW, 'world-a');
    const b = generateRegion(BW, 'world-a');
    const c = generateRegion(BW, 'world-b');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a.sites)).not.toBe(JSON.stringify(c.sites));
  });

  it('keeps the land the same in every world, so the painting fits each (A5)', () => {
    const a = generateRegion(BW, 'world-a');
    const c = generateRegion(BW, 'world-b');
    expect(JSON.stringify(a.tracts)).toBe(JSON.stringify(c.tracts));
  });

  it('names fifteen tracts, seeds wild sites to every area, hides about one in five', () => {
    const g = generateRegion(BW, 'world-a');
    expect(g.tracts).toHaveLength(15);
    const wild = g.sites.filter((s) => s.sub !== 'checkpoint');
    expect(wild.length).toBeGreaterThan(100);
    const hidden = wild.filter((s) => s.hidden).length / wild.length;
    expect(hidden).toBeGreaterThan(0.1);
    expect(hidden).toBeLessThan(0.3);
    const map = regionMap(g);
    for (const s of wild) expect(areaAt(map, [s.x, s.y])?.id).toBe(s.area);
  });

  it('puts a checkpoint where a road crosses into a kingdom', () => {
    const map = regionMap(generateRegion(BW, 'world-a'));
    const posts = map.places.filter((p) => p.sub === 'checkpoint');
    expect(posts.length).toBeGreaterThan(0);
    for (const p of posts) expect(p.guards).toMatch(/^qm-/);
  });

  it('gives each tract a heart away from people, and the Stone Forest its named one at Nascent Soul', () => {
    const map = regionMap(generateRegion(BW, 'world-a'));
    expect(map.hearts.length).toBeGreaterThanOrEqual(10);
    for (const h of map.hearts)
      if (h.fixedBand === null) expect(peopleLi(map, [h.x, h.y])).toBeGreaterThan(3000);
    const python = map.hearts.find((h) => h.area === 'qm-mihun-shilin')!;
    expect(python.name).toBe('the python’s den');
    expect(heartBand(map, python)).toBe(9);
  });
});

describe('what you know', () => {
  it('only rises: a sketched place never falls back to a rumor', () => {
    const s = life();
    let m = raise(s.map!, 'x', 'sketched');
    m = raise(m, 'x', 'rumored');
    expect(known(m, 'x')).toBe('sketched');
    m = raise(m, 'x', 'seen');
    expect(known(m, 'x')).toBe('seen');
  });

  it('starts a cave orphan with Stone Eyes seen from the door, home seen and the famous places rumored', () => {
    const s = life('cave-orphan');
    const m = s.map!;
    // The kingdom you stand in is seen from your door before the first step (C2, Sean's playtest).
    expect(known(m, 'qm-shiyan-guo')).toBe('seen');
    expect(known(m, 'sinkhole-terraces')).toBe('seen');
    expect(known(m, 'qm-shoukou-cheng')).toBe('rumored');
    expect(known(m, 'qm-mihun-shilin')).toBe('rumored');
    expect(m.rings['qm-shoukou-cheng']).toBeDefined();
    expect(known(m, BW)).toBe('sketched');
    expect(m.at).toEqual([192600, 211300]);
  });

  it('starts a conscript at Pacified Fort and a frontier orphan in the City', () => {
    expect(life('conscript').map!.at).toEqual([183600, 217200]);
    const city = placeById(mapFor(life('frontier-orphan')), 'qm-shoukou-cheng')!;
    expect(life('frontier-orphan').map!.at).toEqual([city.x, city.y]);
  });

  it('sees 600 li in the open and 150 in closed country', () => {
    const s = life();
    const map = mapFor(s);
    const karst = map.places.find(
      (p) => p.kind === 'site' && terrainAt(map, [p.x, p.y]) === 'karst',
    )!;
    expect(sightAt(map, [karst.x, karst.y])).toBe(SIGHT_CLOSED);
    const open = map.places.find(
      (p) => p.kind === 'site' && ['plains', 'hills', 'coast'].includes(terrainAt(map, [p.x, p.y])),
    )!;
    expect(sightAt(map, [open.x, open.y])).toBe(SIGHT_OPEN);
  });

  it('turns visible places in sight Seen, never hidden ones, and finds hidden ones by divine sense', () => {
    const s = life();
    const map = mapFor(s);
    const site = map.places.find((p) => p.kind === 'site' && !p.hidden && p.sub !== 'checkpoint')!;
    const hidden = map.places.find((p) => p.kind === 'site' && p.hidden)!;
    const near: Pt = [site.x + 50, site.y];
    expect(known(seeFrom(map, s.map!, near, 0).life, site.id)).toBe('seen');
    const far: Pt = [site.x + 5000, site.y];
    expect(known(seeFrom(map, s.map!, far, 0).life, site.id)).toBe('unknown');
    const atHidden: Pt = [hidden.x + 10, hidden.y];
    expect(known(seeFrom(map, s.map!, atHidden, 0).life, hidden.id)).toBe('unknown');
    const sensed = seeFrom(map, s.map!, atHidden, 60);
    expect(known(sensed.life, hidden.id)).toBe('seen');
    expect(sensed.found).toContain(hidden.id);
  });

  it('looks around: finds a hidden site within reach that the soul meets, not one rated above it', () => {
    const s = life();
    const map = mapFor(s);
    const hidden = map.places.find((p) => p.kind === 'site' && p.hidden)!;
    const by: Pt = [hidden.x + LOOK_LI / 2, hidden.y];
    // Its rating is never under the band of the ground it stands on.
    const rating = siteRating(map, hidden);
    expect(rating).toBeGreaterThanOrEqual(hidden.rating);
    expect(known(lookAround(map, s.map!, by, rating, 0).life, hidden.id)).toBe('seen');
    expect(known(lookAround(map, s.map!, by, rating - 1, 0).life, hidden.id)).toBe('unknown');
    const off: Pt = [hidden.x + LOOK_LI * 3, hidden.y];
    expect(known(lookAround(map, s.map!, off, 99, 0).life, hidden.id)).toBe('unknown');
  });

  it('finds a rumored place by looking around inside its ring', () => {
    const s = life();
    const map = mapFor(s);
    const site = map.places.find(
      (p) => p.kind === 'site' && !p.hidden && known(s.map!, p.id) === 'unknown',
    )!;
    const m = rumor(s.map!, site, 'a storyteller');
    expect(known(m, site.id)).toBe('rumored');
    expect(m.told[site.id]).toBe('a storyteller');
    const ring = m.rings[site.id]!;
    expect(known(lookAround(map, m, ring, 0, 0).life, site.id)).toBe('seen');
  });
});

describe('routing', () => {
  it('keeps to the roads where they serve, and passes the March’s border post', () => {
    const s = life();
    const map = mapFor(s);
    const city = placeById(map, 'qm-shoukou-cheng')!;
    const r = planRoute(map, s.map!.at, [city.x, city.y]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.route.roadLi).toBeGreaterThan(r.route.crossLi);
    expect(r.route.tolls.length).toBeGreaterThan(0);
  });

  it('arrives about when the course card says: planned and walked by one ground rule', () => {
    const go = goToPlace(life(), 'qm-shoukou-cheng');
    if (!go.ok) throw new Error(go.reason);
    const planned = go.state.map!.course!.days;
    let s = go.state;
    let days = 0;
    while (s.map!.course && days < planned * 2) {
      s = run(s, 1);
      days += 1;
    }
    expect(s.map!.course).toBeNull();
    expect(Math.abs(days - planned) / planned).toBeLessThan(0.1);
  });

  it('takes each checkpoint’s toll once, as you pass it', () => {
    const go = goToPlace(life(), 'qm-shoukou-cheng');
    if (!go.ok) throw new Error(go.reason);
    const n = go.state.map!.course!.tolls.length;
    expect(n).toBeGreaterThan(0);
    const s = run(go.state, Math.ceil(go.state.map!.course!.days) + 2);
    expect(s.map!.course).toBeNull();
    const tolls = s.chronicle.filter((e) => e.type === 'toll');
    expect(tolls).toHaveLength(n);
    expect(String(tolls[0]!.data.how)).toMatch(/toll|waved/);
  });

  it('breaks a purse of one mid for a toll’s change (E1)', () => {
    const base = life();
    const mid = withPlayer(base, {
      ...base.player,
      stones: 0,
      higherStones: { mid: 1, high: 0, top: 0 },
    });
    const go = goToPlace(mid, 'qm-shoukou-cheng');
    if (!go.ok) throw new Error(go.reason);
    const n = go.state.map!.course!.tolls.length;
    const s = run(go.state, Math.ceil(go.state.map!.course!.days) + 2);
    const paid = s.chronicle.filter((e) => e.type === 'toll' && /pays/.test(String(e.data.how)));
    expect(paid).toHaveLength(n);
    expect(s.player.higherStones.mid).toBe(0);
    expect(s.player.stones).toBe(1100 - n);
  });

  it('keeps off them on the night road, and flies straight over the land', () => {
    const s = life();
    const map = mapFor(s);
    const city = placeById(map, 'qm-shoukou-cheng')!;
    const night = planRoute(map, s.map!.at, [city.x, city.y], { hidden: true });
    const fly = planRoute(map, s.map!.at, [city.x, city.y], { flies: true });
    expect(night.ok && night.route.roadLi).toBe(0);
    expect(fly.ok && fly.route.crossCost).toBeCloseTo(fly.ok ? fly.route.crossLi : 0, 6);
  });

  it('refuses the sea and the land past the region’s edge', () => {
    const s = life();
    const map = mapFor(s);
    expect(planRoute(map, s.map!.at, [120000, 230000]).ok).toBe(false);
    expect(planRoute(map, s.map!.at, [230000, 214000]).ok).toBe(false);
  });

  it('times a course by the road wheel: a pressed march is faster than travelling by day', () => {
    let s = life();
    const walk = goToPlace(s, 'qm-shoukou-cheng');
    expect(walk.ok).toBe(true);
    if (!walk.ok) return;
    s = followRoadRoutine(walk.state, 'pressed');
    expect(s.map!.course!.days).toBeLessThan(walk.state.map!.course!.days);
    expect(liPerDay(walk.state)).toBe(40 * 6);
    expect(liPerDay(s)).toBe(40 * 10);
  });
});

describe('Divine Travel (K5)', () => {
  it('doubles your pace on foot for a day, burned from the Bag', () => {
    const s = life();
    const walk = goToPlace(s, 'qm-shoukou-cheng');
    if (!walk.ok) throw new Error(walk.reason);
    const w = walk.state;
    expect(burnSwift(w, 'divine-travel-talisman')).toMatchObject({ ok: false });
    const r = burnSwift(
      withPlayer(w, addItem(w.player, 'divine-travel-talisman', 1)),
      'divine-travel-talisman',
    );
    if (!r.ok) throw new Error(r.reason);
    expect(r.state.player.items['divine-travel-talisman'] ?? 0).toBe(0);
    expect(liPerDay(r.state)).toBe(2 * liPerDay(w));
    const next = { ...r.state, calendar: { ...r.state.calendar, day: r.state.calendar.day + 1 } };
    expect(liPerDay(next)).toBe(liPerDay(w));
  });
});

describe('depth and qi density', () => {
  it('reads the Border Wilds’ edge as band 0 and the Stone Forest’s two higher', () => {
    const s = life();
    const map = mapFor(s);
    expect(edgeBand(map, s.map!.at)).toBe(0);
    const forest = map.areas.find((a) => a.id === 'qm-mihun-shilin')!;
    const p = forest.outline[0]![0]![0]!;
    expect(edgeBand(map, [p[0] - 1, p[1]]) === 0 || edgeBand(map, p) === 2).toBe(true);
  });

  it('stands at the edge in a town, and in the heart at a heart', () => {
    const s = life();
    const map = mapFor(s);
    expect(depthInfo(map, s.map!.at).ring).toBe(0);
    const h = map.hearts.find((x) => x.fixedBand === null)!;
    const d = depthInfo(map, [h.x, h.y]);
    expect(d.heart).not.toBeNull();
    expect(d.ring).toBeGreaterThanOrEqual(
      Math.min(heartRings(map, h), Math.floor(peopleLi(map, [h.x, h.y]) / 1200)),
    );
    expect(bandAt(map, [h.x, h.y])).toBe(edgeBand(map, [h.x, h.y]) + d.ring);
  });

  it('bands a realm by its third, and pulls you in a whole realm up', () => {
    expect(bandOfRealm('qi-condensation', 3)).toBe(0);
    expect(bandOfRealm('qi-condensation', 7)).toBe(2);
    expect(bandOfRealm('foundation-establishment', 1)).toBe(3);
    expect(pullsIn(3, 0)).toBe(true);
    expect(pullsIn(2, 0)).toBe(false);
  });
});

describe('travel on the day loop', () => {
  it('walks a cave orphan to the City by clicks, seeing the road and arriving', () => {
    let s = life();
    const go = goToPlace(s, 'qm-shoukou-cheng');
    expect(go.ok).toBe(true);
    if (!go.ok) return;
    s = go.state;
    const days = Math.ceil(s.map!.course!.days) + 2;
    s = run(s, days);
    const map = mapFor(s);
    const city = placeById(map, 'qm-shoukou-cheng')!;
    expect(s.map!.course).toBeNull();
    expect(Math.hypot(s.map!.at[0] - city.x, s.map!.at[1] - city.y)).toBeLessThan(1);
    expect(known(s.map!, 'qm-shoukou-cheng')).toBe('seen');
    expect(known(s.map!, 'qm-anbian-fu')).toBe('seen');
    expect(s.map!.trail.length).toBeGreaterThan(20);
    expect(s.chronicle.some((e) => e.type === 'arrived')).toBe(true);
  });

  it('crosses the Border Wilds from the Herders to Bat Roost', () => {
    let s = life('frontier-orphan');
    const go = goToPlace(s, 'thunderhorn-camp');
    if (!go.ok) throw new Error(go.reason);
    s = run(go.state, Math.ceil(go.state.map!.course!.days) + 2);
    const east = goToPlace(s, 'bat-roost');
    if (!east.ok) throw new Error(east.reason);
    s = run(east.state, Math.ceil(east.state.map!.course!.days) + 2);
    const bat = placeById(mapFor(s), 'bat-roost')!;
    expect(Math.hypot(s.map!.at[0] - bat.x, s.map!.at[1] - bat.y)).toBeLessThan(1);
  });

  it('spends travel hours on foot and gives riding hours back at half', () => {
    let s = life();
    const go = goToPlace(s, 'qm-shoukou-cheng');
    if (!go.ok) throw new Error(go.reason);
    s = go.state;
    const foot = cultivationWheel(s)!;
    expect(foot.wheel[5]).toBe('sleep');
    expect(foot.factor.every((f) => f === 1)).toBe(true);
    expect(canGoBy(s, 'horse').ok).toBe(false);
    s = withPlayer(s, addItem(s.player, 'mortal-horse', 1));
    expect(canGoBy(s, 'horse').ok).toBe(true);
    s = goBy(s, 'horse');
    const ride = cultivationWheel(s)!;
    expect(ride.wheel[5]).toBe(s.player.wheel[5]);
    expect(ride.factor[5]).toBe(0.5);
    expect(ride.factor[0]).toBe(1);
  });

  it('keeps flight for Foundation', () => {
    expect(canGoBy(life(), 'fly').ok).toBe(false);
  });

  it('lets you edit the road wheel into a routine of your own', () => {
    let s = life();
    s = setRoadHours(s, [11], 'travel');
    expect(s.map!.roadRoutine).toBe('own-1');
    expect(s.map!.ownRoutines[0]!.hours[11]).toBe('travel');
    expect(setRoadHours(s, [0], 'travel')).toBe(s); // 子 is locked to sleep at Qi Condensation
  });

  it('never lets you pick the Caravan guard routine alone: a caravan sets it', () => {
    const s = life();
    expect(followRoadRoutine(s, 'caravan')).toBe(s);
    expect(followRoadRoutine(s, 'pressed').map!.roadRoutine).toBe('pressed');
  });

  it('sets several road hours at once, passing over the locked ones', () => {
    let s = setRoadHours(life(), [0, 1, 2, 3], 'qi');
    expect(s.map!.ownRoutines[0]!.hours.slice(0, 4)).toEqual(['sleep', 'sleep', 'qi', 'qi']);
    s = setRoadHours(s, [4, 5], 'look');
    expect(s.map!.ownRoutines).toHaveLength(1); // your own is edited in place
    expect(s.map!.ownRoutines[0]!.hours.slice(4, 6)).toEqual(['look', 'look']);
  });

  it('forgets a road routine of your own and never reuses its id', () => {
    let s = setRoadHours(life(), [11], 'travel');
    s = followRoadRoutine(s, 'by-day');
    s = setRoadHours(s, [10], 'qi');
    expect(s.map!.ownRoutines.map((o) => o.id)).toEqual(['own-1', 'own-2']);
    s = forgetRoadRoutine(s, 'own-1');
    s = followRoadRoutine(s, 'pressed');
    s = setRoadHours(s, [9], 'qi');
    expect(s.map!.ownRoutines.map((o) => o.id)).toEqual(['own-2', 'own-3']);
    s = forgetRoadRoutine(s, 'own-3');
    expect(s.map!.roadRoutine).toBe('by-day'); // forgetting the one you follow goes back to travelling by day
    s = renameRoadRoutine(s, 'own-2', '  Herb road  ');
    expect(s.map!.ownRoutines[0]!.name).toBe('Herb road');
    expect(renameRoadRoutine(s, 'own-2', '   ')).toBe(s);
  });

  it('travels with a group on its course, refuses a course of your own, and pays on arriving', () => {
    let s = life('frontier-orphan');
    const j = joinGroup(s, {
      kind: 'caravan',
      name: 'the Iron-Shod caravan',
      leader: 'caravan master Lu',
      bound: 'corral-town',
      stops: [],
      pay: 1,
      canLeave: true,
      leaveCost: 'You lose the pay owed.',
      leading: false,
    });
    if (!j.ok) throw new Error(j.reason);
    s = j.state;
    expect(s.map!.roadRoutine).toBe('caravan');
    expect(setCourse(s, [180000, 215000]).ok).toBe(false);
    const stones = s.player.stones;
    s = run(s, Math.ceil(s.map!.course!.days) + 2);
    expect(s.map!.group).toBeNull();
    expect(s.player.stones).toBeGreaterThan(stones);
  });

  it('pays a caravan guard as the town it arrives at counts it (E1)', () => {
    const go = (bound: string, from: 'cave-orphan' | 'frontier-orphan') => {
      const j = joinGroup(life(from), {
        kind: 'caravan',
        name: 'the Iron-Shod caravan',
        leader: 'caravan master Lu',
        bound,
        stops: [],
        pay: 500,
        canLeave: true,
        leaveCost: 'You lose the pay owed.',
        leading: false,
      });
      if (!j.ok) throw new Error(j.reason);
      return run(j.state, Math.ceil(j.state.map!.course!.days) + 2);
    };
    // Corral Town sits on a tier 2 vein and pays all in low; the City, on a tier 4, in mid.
    const corral = go('corral-town', 'frontier-orphan');
    expect(corral.map!.group).toBeNull();
    expect(corral.player.stones).toBeGreaterThan(1000);
    expect(corral.player.higherStones.mid).toBe(0);
    const city = go('qm-shoukou-cheng', 'cave-orphan');
    expect(city.map!.group).toBeNull();
    expect(city.player.higherStones.mid).toBeGreaterThan(0);
    expect(city.player.stones).toBeLessThan(1000);
  });

  it('won’t let you step off a ship without flight of your own', () => {
    let s = life();
    const j = joinGroup(
      s,
      {
        kind: 'ship',
        name: 'the Gate’s cloud ship',
        leader: 'Elder Tu',
        bound: 'qm-shoukou-cheng',
        stops: [],
        pay: 0,
        canLeave: false,
        leaveCost: 'You are two thousand li up.',
        leading: false,
      },
      'ship',
    );
    if (!j.ok) throw new Error(j.reason);
    s = j.state;
    expect(leaveGroup(s).ok).toBe(false);
  });

  it('does nothing on the step without a course', () => {
    const s = life();
    expect(travelDays(s, s.calendar.day, s.calendar.day + 3)).toBe(s);
  });
});

describe('the v24 save', () => {
  it('migrates a v23 save to no map yet and opens the Map screen', () => {
    const s = newLife({ name: 'Han Li', seed: 'old' });
    const raw = JSON.parse(JSON.stringify(makeSave(s, 0))) as {
      version: number;
      state: Record<string, unknown>;
    };
    raw.version = 23;
    delete raw.state.map;
    delete raw.state.mapgen;
    raw.state.unlocks = (raw.state.unlocks as string[]).filter((u) => u !== 'map');
    const loaded = loadSave(raw);
    expect(loaded.state.map).toBeNull();
    expect(loaded.state.mapgen).toEqual({});
    expect(loaded.state.unlocks).toContain('map');
  });

  it('round-trips a life with its map', () => {
    const s = life();
    const back = loadSave(JSON.parse(JSON.stringify(makeSave(s, 0))));
    expect(back.state.map).toEqual(s.map);
    expect(back.state.mapgen[BW]).toEqual(s.mapgen[BW]);
  });
});

describe('the v29 save', () => {
  it('seeds a v28 save’s region again on the land every world shares, and drops its course', () => {
    const s = life();
    const raw = JSON.parse(JSON.stringify(makeSave(s, 0))) as {
      version: number;
      state: {
        mapgen: Record<string, { tracts: { cell: unknown[] }[] }>;
        map: Record<string, unknown>;
      };
    };
    raw.version = 28;
    // A v28 world seeded its own tracts.
    for (const t of raw.state.mapgen[BW]!.tracts) t.cell = [...t.cell].reverse();
    raw.state.map.course = { stale: true };
    raw.state.map.encounters = [{ state: 'sensed', meetAt: 3 }];
    const loaded = loadSave(raw);
    expect(loaded.state.mapgen[BW]).toEqual(generateRegion(BW, s.lineage.id));
    expect(loaded.state.mapgen[BW]!.tracts).toEqual(generateRegion(BW, 'any-other-world').tracts);
    expect(loaded.state.map!.course).toBeNull();
    expect(loaded.state.map!.encounters).toEqual([]);
  });
});

describe('the v30 save', () => {
  it('moves a life standing at the old City to the City on the coast, and reroutes its roads', () => {
    const s = life();
    const raw = JSON.parse(JSON.stringify(makeSave(s, 0))) as {
      version: number;
      state: { map: Record<string, unknown> };
    };
    raw.version = 29;
    raw.state.map.at = [166000, 210000];
    raw.state.map.course = { stale: true };
    const loaded = loadSave(raw);
    const city = placeById(mapOf(loaded.state)!, 'qm-shoukou-cheng')!;
    expect(loaded.state.map!.at).toEqual([city.x, city.y]);
    expect(loaded.state.map!.course).toBeNull();
    expect(loaded.state.mapgen[BW]).toEqual(generateRegion(BW, s.lineage.id));
  });
});

describe('next door (A5)', () => {
  it('names the regions and seas round the Border Wilds, and not itself', () => {
    const near = regionData('qm-bianhuang')!.file.nextDoor!;
    const names = near.map((n) => n.name);
    expect(names).toContain('Jade Strait');
    expect(names).toContain('The Medicine Ridges');
    expect(near.map((n) => n.id)).not.toContain('qm-bianhuang');
    // A region carries its edge to draw dotted; a sea only where its name sits.
    for (const n of near) expect(!!n.outline).toBe(n.kind === 'region');
  });
});

export type { MapPlace };
