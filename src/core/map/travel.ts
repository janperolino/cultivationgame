// Travel (design § The world: The travel map, Travel is a kind of hour, Going somewhere): the life's
// map made on first need, a course set by a click, the road wheel that moves you hour by hour as the
// clock turns, looking around at its look-around hour and on arriving, the ways of going, where you
// sleep, and travelling with a group. Riding hands your hours back at a jostled half; the day step
// cultivates on the wheel this returns.
import { HOME_MAP_REGION, regionData } from '../../content/map/index.ts';
import { ENTER_LI, WATCH_WAIVES_AT } from '../../content/map/places.ts';
import {
  CHECKPOINT_TOLL_LOW,
  CORE_FLIGHT_PACE,
  FOUNDATION_FLIGHT_HOURS,
  GUARD_PACE,
  MERCHANT_GUILD,
  OFFROAD_FACTOR,
  ROAD_ROUTINES,
  SHELTER_LI,
  TERRAIN_NAMES,
  way,
  WAYS,
  type RoadHour,
  type RoadRoutine,
  type Way,
  type WayId,
} from '../../content/map/travel.ts';
import { HOURS_PER_DAY, type HourKind } from '../../content/hours.ts';
import { origin } from '../../content/origins.ts';
import { realmIndex } from '../../content/realms.ts';
import { pay, stonesOf, withStones } from '../purse.ts';
import { fameOf } from '../resolver/names.ts';
import { addStanding } from '../resolver/opinion.ts';
import { addEvent, itemCount, realmOf, type Cultivator, type GameState } from '../state.ts';
import { hourLocked } from '../wheel.ts';
import { bandAt, bandOfRealm } from './depth.ts';
import type { Pt } from './geometry.ts';
import { known, lookAround, seeFrom, senseLi, startKnowledge, type Seeing } from './fog.ts';
import { roadHour, setMapOf, waiting } from './encounters.ts';
import { reachPostings } from './board.ts';
import { bedAt, enterAt } from './gate.ts';
import {
  areaAt,
  generateRegion,
  placeById,
  regionMap,
  terrainAt,
  type MapPlace,
  type RegionMap,
} from './region.ts';
import { groundFactor, planRoute } from './route.ts';
import type { Course, Group, MapLife } from './schema.ts';

// ---------------------------------------------------------------- the life's map

/** The map the life stands on, or null before it is made. */
export function mapOf(s: GameState): RegionMap | null {
  if (!s.map) return null;
  const gen = s.mapgen[s.map.region];
  return gen ? regionMap(gen) : null;
}

/** Where a life starts: its origin's home town, or the region's default. */
export function homeOf(s: GameState, map: RegionMap): MapPlace {
  const content = regionData(map.id)!.content;
  const atlasHome = s.player.origin ? origin(s.player.origin.id).home : s.player.place;
  const id = (atlasHome && content.homes[atlasHome]) || content.defaultHome;
  return placeById(map, id) ?? placeById(map, content.defaultHome)!;
}

/**
 * Makes the life's map on first need: the region seeded for the world if it isn't yet (kept, so
 * every life in the slot shares it), and the start's knowledge round its home.
 */
export function ensureMap(s: GameState): GameState {
  if (s.map) return s;
  const region = HOME_MAP_REGION;
  const mapgen = s.mapgen[region]
    ? s.mapgen
    : { ...s.mapgen, [region]: generateRegion(region, s.lineage.id) };
  const map = regionMap(mapgen[region]!);
  const home = homeOf({ ...s, mapgen }, map);
  const blank: MapLife = {
    region,
    at: [home.x, home.y],
    know: {},
    told: {},
    rings: {},
    trail: [[home.x, home.y]],
    been: [home.id],
    pins: [],
    course: null,
    roadRoutine: 'by-day',
    ownRoutines: [],
    way: 'light-step',
    group: null,
    lookedAt: -1,
    flown: { day: -1, hours: 0 },
    inside: null,
    heard: {},
    stance: 'careful',
    veiled: false,
    notice: { n: 0, next: 1 },
    encounters: [],
    detour: 0,
    hidden: null,
    postings: [],
    road: [],
  };
  return { ...s, mapgen, map: startKnowledge(map, blank, home) };
}

setMapOf(mapOf);

function withLife(s: GameState, life: MapLife): GameState {
  return { ...s, map: life };
}

// ---------------------------------------------------------------- bands you stand in

/** The band your realm stands in. */
export function yourBand(c: Cultivator): number {
  const r = realmOf(c);
  const ladder = ([c.qi, c.body, c.soul] as const).find((l) => l.realm === r) ?? c.qi;
  return bandOfRealm(r, ladder.stage);
}

/** The band your soul stands in: what it can find. */
export function soulBand(c: Cultivator): number {
  return bandOfRealm(c.soul.realm, c.soul.stage);
}

export function senseOf(c: Cultivator): number {
  return senseLi(c.soul.realm, realmIndex(c.soul.realm) > realmIndex(realmOf(c)));
}

// ---------------------------------------------------------------- the road wheel

export function roadRoutines(life: MapLife): (RoadRoutine & { own?: boolean })[] {
  return [
    ...ROAD_ROUTINES,
    ...life.ownRoutines.map((r) => ({
      id: r.id,
      name: r.name,
      short: r.name,
      note: 'your own',
      hours: r.hours,
      own: true,
    })),
  ];
}

export function roadRoutine(life: MapLife): RoadRoutine {
  return roadRoutines(life).find((r) => r.id === life.roadRoutine) ?? ROAD_ROUTINES[0]!;
}

/** The road wheel's hours as you follow it: `home` reads the home wheel, and locked sleep sleeps. */
export function roadHours(life: MapLife, c: Cultivator): RoadHour[] {
  return roadRoutine(life).hours.map((h, i) => {
    if (hourLocked(c, i)) return 'sleep';
    return h === 'home' ? (c.wheel[i] ?? 'qi') : h;
  });
}

/**
 * Sets one or several hours of the road wheel; editing a saved routine makes it your own. Hours
 * locked to sleep are passed over, and a group's road is the group's to keep.
 */
export function setRoadHours(s: GameState, at: readonly number[], kind: RoadHour): GameState {
  const life = s.map;
  if (!life || life.group) return s;
  const set = at.filter((h) => h >= 0 && h < HOURS_PER_DAY && !hourLocked(s.player, h));
  if (set.length === 0) return s;
  const r = roadRoutine(life);
  const hours = [...r.hours];
  for (const h of set) hours[h] = kind;
  if (hours.every((k, i) => k === r.hours[i])) return s;
  const mine = life.ownRoutines.find((o) => o.id === life.roadRoutine);
  // A new one takes the next number never used, so a forgotten one's id stays its own.
  const n = 1 + Math.max(0, ...life.ownRoutines.map((o) => Number(o.id.slice(4)) || 0));
  const ownRoutines = mine
    ? life.ownRoutines.map((o) => (o.id === mine.id ? { ...o, hours } : o))
    : [...life.ownRoutines, { id: `own-${n}`, name: `My road ${n}`, hours }];
  const id = mine ? mine.id : `own-${n}`;
  return replan(withLife(s, { ...life, ownRoutines, roadRoutine: id }));
}

/** Follows a road routine you can pick: a way of the road or your own, never a group's. */
export function followRoadRoutine(s: GameState, id: string): GameState {
  const r = s.map ? roadRoutines(s.map).find((x) => x.id === id) : undefined;
  if (!s.map || !r || r.groupOnly || s.map.group) return s;
  return replan(withLife(s, { ...s.map, roadRoutine: id }));
}

/** Forgets a road routine of your own; following it, you go back to travelling by day. */
export function forgetRoadRoutine(s: GameState, id: string): GameState {
  if (!s.map || !s.map.ownRoutines.some((o) => o.id === id)) return s;
  const ownRoutines = s.map.ownRoutines.filter((o) => o.id !== id);
  const roadRoutine = s.map.roadRoutine === id ? ROAD_ROUTINES[0]!.id : s.map.roadRoutine;
  return replan(withLife(s, { ...s.map, ownRoutines, roadRoutine }));
}

/** Names a road routine of your own; a blank name keeps the old one. */
export function renameRoadRoutine(s: GameState, id: string, name: string): GameState {
  const named = name.trim().slice(0, 40);
  if (!s.map || !named) return s;
  return withLife(s, {
    ...s.map,
    ownRoutines: s.map.ownRoutines.map((o) => (o.id === id ? { ...o, name: named } : o)),
  });
}

// ---------------------------------------------------------------- ways of going

export type WayCheck = { ok: true } | { ok: false; reason: string };

/** Whether you can go this way now, and why not. */
export function canGoBy(s: GameState, id: WayId): WayCheck {
  const w = way(id);
  if (w.groupOnly) return { ok: false, reason: 'Only while you travel with a group that has one.' };
  if (id === 'fly' && realmIndex(realmOf(s.player)) < 1)
    return { ok: false, reason: 'Flight on your own sword comes at Foundation.' };
  if (id === 'boat')
    return { ok: false, reason: 'No passage is charted along a coast or a river here yet.' };
  if (id === 'ride')
    return { ok: false, reason: 'A flight on someone’s sword is hired for stones in M6.' };
  if (w.needs && itemCount(s.player, w.needs) <= 0)
    return { ok: false, reason: `You have no ${w.id === 'horse' ? 'horse' : 'mount'}.` };
  return { ok: true };
}

export function goBy(s: GameState, id: WayId): GameState {
  if (!s.map || s.map.group || !canGoBy(s, id).ok) return s;
  return replan(withLife(s, { ...s.map, way: id }));
}

export function wayOf(life: MapLife): Way {
  return way(life.way);
}

/** Li a double-hour on the way you go: a guard keeps the caravan's, and Core flies faster. */
export function paceOf(s: GameState): number {
  const life = s.map!;
  const w = wayOf(life);
  if (w.id === 'fly' && realmIndex(realmOf(s.player)) >= 2) return CORE_FLIGHT_PACE;
  if (!w.rideHours && roadRoutine(life).hours.includes('guard')) return GUARD_PACE;
  return w.pace;
}

/** The double-hours a ride runs: six from 辰, or all twelve. */
function rideHour(w: Way, hour: number): boolean {
  if (!w.rideHours) return false;
  if (w.rideHours >= HOURS_PER_DAY) return true;
  return hour >= 4 && hour < 4 + w.rideHours;
}

/** Whether an hour moves you, by the way you go and the road wheel. */
export function movesAt(s: GameState, hour: number): boolean {
  const life = s.map!;
  const w = wayOf(life);
  if (w.rideHours) return rideHour(w, hour);
  const k = roadHours(life, s.player)[hour];
  return k === 'travel' || k === 'guard';
}

/** Double-hours a day that move you. */
export function movingHours(s: GameState): number {
  let n = 0;
  for (let i = 0; i < HOURS_PER_DAY; i++) if (movesAt(s, i)) n++;
  if (wayOf(s.map!).id === 'fly' && realmIndex(realmOf(s.player)) === 1)
    n = Math.min(n, FOUNDATION_FLIGHT_HOURS);
  return n;
}

/** Li a day on the road at your pace. */
export function liPerDay(s: GameState): number {
  return paceOf(s) * movingHours(s);
}

// ---------------------------------------------------------------- courses

export type CourseCheck = { ok: true; state: GameState } | { ok: false; reason: string };

function courseFrom(
  s: GameState,
  map: RegionMap,
  to: Pt,
  target: string | null,
  enter: boolean,
): CourseCheck {
  const life = s.map!;
  const r = roadRoutine(life);
  const w = wayOf(life);
  const res = planRoute(map, life.at, to, {
    hidden: r.hidden,
    roadsOnly: r.roadsOnly,
    flies: w.flies,
  });
  if (!res.ok) return res;
  const perDay = liPerDay(s);
  if (perDay <= 0) return { ok: false, reason: 'Your road wheel gives no hours to travel.' };
  const cost = w.flies
    ? res.route.roadLi + res.route.crossLi
    : res.route.roadLi + res.route.crossCost;
  let maxBand = -9;
  for (let i = 0; i < res.route.pts.length; i += 10)
    maxBand = Math.max(maxBand, bandAt(map, res.route.pts[i]!));
  // The sampling can step past the end, and where you are going is often the deepest ground.
  maxBand = Math.max(maxBand, bandAt(map, res.route.pts.at(-1)!));
  const course: Course = {
    to: [to[0], to[1]],
    target,
    pts: res.route.pts.map(([x, y]) => [x, y] as [number, number]),
    at: 0,
    roadLi: res.route.roadLi,
    crossLi: res.route.crossLi,
    days: cost / perDay,
    startDay: s.calendar.day,
    tolls: res.route.tolls,
    maxBand,
    enter,
  };
  // Setting off leaves the place you were in, and what was sensed ahead on the old course.
  const encounters = life.encounters.filter((e) => e.state === 'waiting');
  return { ok: true, state: withLife(s, { ...life, course, inside: null, encounters }) };
}

/** Sets a course to a spot or a place; a group owns its course, so you can't while with one. */
export function setCourse(
  s: GameState,
  to: Pt,
  target: string | null = null,
  enter = false,
): CourseCheck {
  const map = mapOf(s);
  if (!map || !s.map) return { ok: false, reason: 'The map isn’t ready.' };
  if (s.map.group) return { ok: false, reason: `${s.map.group.name} sets the course.` };
  // A way round owed on this trip stays owed if you set the same course again; going somewhere
  // else leaves the encounter, and the detour, behind.
  const was = s.map.course?.to;
  const same = !!was && Math.hypot(was[0] - to[0], was[1] - to[1]) < ENTER_LI;
  const fresh = same || s.map.detour === 0 ? s : withLife(s, { ...s.map, detour: 0 });
  return courseFrom(fresh, map, to, target, enter);
}

export function goToPlace(s: GameState, id: string, enter = false): CourseCheck {
  const map = mapOf(s);
  const p = map && placeById(map, id);
  if (!p) return { ok: false, reason: 'No such place.' };
  return setCourse(s, [p.x, p.y], id, enter);
}

/** Stops where you stand: the home wheel turns here. */
export function stopHere(s: GameState): GameState {
  if (!s.map || s.map.group) return s;
  return withLife(s, { ...s.map, course: null });
}

/** Plans the course again from where you stand, after a change of routine or way. */
function replan(s: GameState): GameState {
  const life = s.map;
  const map = mapOf(s);
  if (!life?.course || !map) return s;
  const r = courseFrom(s, map, life.course.to, life.course.target, life.course.enter);
  return r.ok ? r.state : s;
}

export function pin(s: GameState, at: Pt): GameState {
  if (!s.map) return s;
  return withLife(s, { ...s.map, pins: [...s.map.pins, [Math.round(at[0]), Math.round(at[1])]] });
}

export function unpin(s: GameState, i: number): GameState {
  if (!s.map) return s;
  return withLife(s, { ...s.map, pins: s.map.pins.filter((_, j) => j !== i) });
}

// ---------------------------------------------------------------- groups

/**
 * Joins a group bound for a place; it owns the course from now on (P3.6b's caravans, M5's ships). A
 * paid guard keeps the Caravan guard routine; a rider keeps their own, the group's way moving them.
 */
export function joinGroup(
  s: GameState,
  group: Omit<Group, 'owed'>,
  wayId: WayId | null = null,
): CourseCheck {
  const map = mapOf(s);
  if (!map || !s.map) return { ok: false, reason: 'The map isn’t ready.' };
  const target = placeById(map, group.bound);
  if (!target) return { ok: false, reason: 'It is bound nowhere on this map.' };
  const life: MapLife = {
    ...s.map,
    group: null,
    way: wayId ?? s.map.way,
    roadRoutine: group.kind === 'caravan' && group.pay > 0 ? 'caravan' : s.map.roadRoutine,
  };
  const r = courseFrom(withLife(s, life), map, [target.x, target.y], target.id, false);
  if (!r.ok) return r;
  return { ok: true, state: withLife(r.state, { ...r.state.map!, group: { ...group, owed: 0 } }) };
}

/**
 * A checkpoint passed: its toll paid, or waived for a name the region knows. A cultivator with
 * nothing to pay is waved through: no guard stops a cultivator over one stone.
 */
function payToll(s: GameState, map: RegionMap, id: string): GameState {
  const p = placeById(map, id);
  if (!p) return s;
  const day = s.calendar.day;
  const region = s.map?.region ?? map.id;
  if (fameOf(s.world, s.player.id, region, 'renown', day) >= WATCH_WAIVES_AT)
    return addEvent(s, 'toll', { place: p.name, how: 'is known by name and waved through' });
  const after = pay(stonesOf(s.player), CHECKPOINT_TOLL_LOW);
  if (!after)
    return addEvent(s, 'toll', { place: p.name, how: 'has nothing to pay and is waved through' });
  const next = { ...s, player: withStones(s.player, after) };
  return addEvent(next, 'toll', {
    place: p.name,
    how: `pays the checkpoint's toll, ${CHECKPOINT_TOLL_LOW} low-grade`,
  });
}

/**
 * Leaves the group where it stands, if you can: the pay owed is lost, and a guard who walks off a
 * caravan on the road loses standing with its guild.
 */
export function leaveGroup(s: GameState): CourseCheck {
  const g = s.map?.group;
  if (!g) return { ok: false, reason: 'You travel alone.' };
  const flies = realmIndex(realmOf(s.player)) >= 1;
  if (!g.canLeave && !flies) return { ok: false, reason: g.leaveCost };
  const day = s.calendar.day;
  const walkedOff = g.kind === 'caravan' && g.pay > 0 && day >= (g.departs ?? 0);
  const world = walkedOff
    ? addStanding(s.world, { power: MERCHANT_GUILD, about: s.player.id, row: 'walked-off' }, day)
    : s.world;
  return {
    ok: true,
    state: withLife(
      { ...s, world },
      {
        ...s.map!,
        group: null,
        course: null,
        ...alone(s.map!),
      },
    ),
  };
}

/** Travelling alone again: a group's own way and routine stay with the group. */
function alone(life: MapLife): Pick<MapLife, 'way' | 'roadRoutine'> {
  const routine = ROAD_ROUTINES.find((r) => r.id === life.roadRoutine);
  return {
    way: way(life.way).groupOnly ? 'light-step' : life.way,
    roadRoutine: routine?.groupOnly ? 'by-day' : life.roadRoutine,
  };
}

// ---------------------------------------------------------------- where you sleep

export function sleepPlace(s: GameState): string {
  const map = mapOf(s);
  const life = s.map;
  if (!map || !life) return 'at home';
  const at = life.at;
  const bed = bedAt(map, at);
  if (bed) {
    const where = bed.kind === 'village' ? 'in a barn' : 'at an inn';
    return `${where} in ${bed.place.name} · ${bed.taels} taels`;
  }
  const shelter = map.places.find(
    (p) =>
      ['cave', 'hut', 'shrine'].includes(p.sub) &&
      known(life, p.id) === 'seen' &&
      Math.hypot(p.x - at[0], p.y - at[1]) < SHELTER_LI,
  );
  if (shelter) return `in ${shelter.name.replace(/^A /, 'a ')}`;
  return `at a camp in the ${TERRAIN_NAMES[terrainAt(map, at)] ?? 'wilds'}`;
}

// ---------------------------------------------------------------- the day step

/**
 * The wheel you cultivate on while a course is set, and each hour's share: travel, look-around and
 * guard hours give nothing; a ride's hours keep their kind at the jostled half (study whole on a
 * boat).
 */
export function cultivationWheel(s: GameState): { wheel: HourKind[]; factor: number[] } | null {
  const life = s.map;
  if (!life?.course) return null;
  const w = wayOf(life);
  const hours = roadHours(life, s.player);
  const wheel: HourKind[] = [];
  const factor: number[] = [];
  for (let i = 0; i < HOURS_PER_DAY; i++) {
    const k = hours[i]!;
    const kind: HourKind =
      k === 'travel' || k === 'guard'
        ? w.rideHours
          ? (s.player.wheel[i] ?? 'qi')
          : 'sleep'
        : k === 'look' || k === 'home'
          ? 'sleep'
          : k;
    wheel.push(kind);
    factor.push(rideHour(w, i) && !(w.studyWhole && kind === 'study') ? (w.jostle ?? 1) : 1);
  }
  return { wheel, factor };
}

function waitingOn(life: MapLife): boolean {
  return waiting(life).length > 0;
}

export interface TravelNote {
  type: 'arrived' | 'found';
  place: string;
}

/**
 * Time on the road between two world days: each moving hour carries you along the course at your
 * pace (the terrain slowing you off the road, unless you fly), what comes into sight turns Seen, a
 * look-around hour looks once, and on arriving you look around and stop. A guard's wage runs.
 */
export function travelDays(s: GameState, fromDay: number, toDay: number): GameState {
  const map = mapOf(s);
  const start = s.map;
  if (!map || !start?.course || toDay <= fromDay) return s;
  let life: MapLife = start;
  let next = s;
  const c = s.player;
  const sb = soulBand(c);
  const yb = yourBand(c);
  const sense = senseOf(c);
  const pace = paceOf(s);
  const w = wayOf(life);
  const foundationFlight = w.id === 'fly' && realmIndex(realmOf(c)) === 1;
  const notes: TravelNote[] = [];
  let paid = 0;
  const passed: string[] = [];
  let enterTarget: MapPlace | null = null;
  const take = (r: Seeing) => {
    life = r.life;
    for (const id of r.found) notes.push({ type: 'found', place: id });
  };
  let h0 = fromDay * HOURS_PER_DAY;
  const h1 = toDay * HOURS_PER_DAY;
  while (h0 < h1 - 1e-9 && life.course) {
    const hourIndex = Math.floor(h0 + 1e-9);
    const end = Math.min(h1, hourIndex + 1);
    const hour = ((hourIndex % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY;
    const dayInt = Math.floor(hourIndex / HOURS_PER_DAY);
    const kind = roadHours(life, c)[hour];
    if (kind === 'look' && life.lookedAt !== hourIndex) {
      take(lookAround(map, { ...life, lookedAt: hourIndex }, life.at, sb, sense));
    }
    // A group you joined before it left waits for its day.
    const waiting = !!life.group?.departs && h0 < life.group.departs * HOURS_PER_DAY - 1e-9;
    // A card waiting on the road stops you: you camp and cultivate where you stand.
    const halted = waitingOn(life);
    let moving = !waiting && !halted && movesAt({ ...next, map: life }, hour);
    if (moving && foundationFlight) {
      const flown: number = life.flown.day === dayInt ? life.flown.hours : 0;
      if (flown >= FOUNDATION_FLIGHT_HOURS) moving = false;
      else life = { ...life, flown: { day: dayInt, hours: flown + (end - h0) } };
    }
    if (moving) {
      if (life.group && life.group.pay > 0)
        life = {
          ...life,
          group: {
            ...life.group,
            owed:
              life.group.owed +
              (life.group.pay * (end - h0)) / Math.max(1, movingHours({ ...next, map: life })),
          },
        };
      let budget = pace * (end - h0);
      // Going round something sensed: those li are walked cross-country before the course moves on.
      if (life.detour > 0) {
        const f = w.flies ? 1 : (OFFROAD_FACTOR[terrainAt(map, life.at)] ?? 0.5);
        const used = Math.min(life.detour, budget * f);
        life = { ...life, detour: life.detour - used };
        budget -= used / f;
      }
      const course: Course = life.course!;
      let at: Pt = life.at;
      let i = course.at;
      // The ground rule the course was planned by (route.ts); the night road gets no road speed,
      // and a course point that samples as sea is a coastline's edge, walked at the coast's pace.
      const roads = !roadRoutine(life).hidden;
      while (budget > 1e-6 && i < course.pts.length) {
        const nextPt = course.pts[i]!;
        const f = w.flies ? 1 : groundFactor(map, nextPt, roads) || OFFROAD_FACTOR.coast!;
        const d = Math.hypot(nextPt[0] - at[0], nextPt[1] - at[1]);
        const can = budget * f;
        if (d <= can) {
          at = nextPt;
          i++;
          budget -= d / f;
        } else {
          at = [at[0] + ((nextPt[0] - at[0]) * can) / d, at[1] + ((nextPt[1] - at[1]) * can) / d];
          budget = 0;
        }
      }
      const last: Pt | undefined = life.trail[life.trail.length - 1];
      const trail: [number, number][] =
        !last || Math.hypot(last[0] - at[0], last[1] - at[1]) > 150
          ? [...life.trail, [Math.round(at[0]), Math.round(at[1])] as [number, number]]
          : life.trail;
      life = { ...life, at: [at[0], at[1]], trail, course: { ...course, at: i } };
      // A checkpoint on the course takes its toll as you pass it, once.
      const reached = life.course!.tolls.filter((id) => {
        const p = placeById(map, id);
        return !!p && Math.hypot(p.x - at[0], p.y - at[1]) < ENTER_LI;
      });
      if (reached.length) {
        passed.push(...reached);
        const tolls = life.course!.tolls.filter((id) => !reached.includes(id));
        life = { ...life, course: { ...life.course!, tolls } };
      }
      take(seeFrom(map, life, life.at, sb, sense));
      if (i >= course.pts.length) {
        // Arrived: a look round, and the course is done.
        take(lookAround(map, life, life.at, sb, sense));
        const target = course.target ? placeById(map, course.target) : null;
        if (
          target &&
          !life.been.includes(target.id) &&
          // A rumor's ring is near the place, not at it: only standing there counts.
          Math.hypot(target.x - life.at[0], target.y - life.at[1]) < 250 &&
          (target.kind === 'town' || target.kind === 'atlas')
        ) {
          notes.push({ type: 'arrived', place: target.id });
          life = { ...life, been: [...life.been, target.id] };
        }
        if (
          course.enter &&
          target &&
          Math.hypot(target.x - life.at[0], target.y - life.at[1]) < 250
        )
          enterTarget = target;
        // A group pays what it owes on arriving.
        if (life.group && life.group.owed > 0) paid += Math.round(life.group.owed);
        life = {
          ...life,
          course: null,
          group: null,
          ...alone(life),
          encounters: life.encounters.filter((e) => e.state === 'waiting'),
        };
      }
    }
    // The road's hour: its notice fills and what it brings is met; a posting's spot reached meets its goal.
    if (life.course && !waiting) {
      const st = reachPostings(
        roadHour({ ...next, map: life }, map, hour, end - h0, moving, !!w.flies, yb, sense),
        map,
      );
      next = st;
      life = st.map!;
    }
    h0 = end;
  }
  next = { ...next, map: life };
  if (paid > 0) next = { ...next, player: { ...next.player, stones: next.player.stones + paid } };
  for (const id of passed) next = payToll(next, map, id);
  for (const n of notes) {
    const p = placeById(map, n.place);
    if (p) next = addEvent(next, n.type, { place: p.name });
  }
  // A course marked to go in goes in on arriving, through the gate (a refusal leaves you outside).
  if (enterTarget) {
    const r = enterAt(next, map, enterTarget);
    if (r.ok) next = r.state;
  }
  return next;
}

/** Where you stand on the map, for the line under the date. */
export function hereWords(s: GameState): string {
  const map = mapOf(s);
  if (!map || !s.map) return '';
  const at = s.map.at;
  const near = map.places.find(
    (p) => (p.kind === 'town' || p.kind === 'atlas') && Math.hypot(p.x - at[0], p.y - at[1]) < 250,
  );
  if (near) return near.name;
  if (terrainAt(map, at) === 'sea') return 'at sea';
  return areaAt(map, at)?.name ?? map.name;
}

export { WAYS };
