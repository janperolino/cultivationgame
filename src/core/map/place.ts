// Inside a place (design § The world: The fog: Maps, Rumors; Wherever you like; § Economy, Stones,
// silver and shops in play), as settled in P3.6b's talk: what each kind of place holds, the
// teahouse's rumor a day, the maps for sale, guides who take you to a place they know, caravans to
// ride or guard with, the money changer, and the bed you sleep in by rule. Guides and caravans are
// seeded by the place and the month or week, like a shop's stock, so the same town shows the same
// faces and draws no stream; only what you join is kept.
import { didDeed } from '../journal.ts';
import {
  CARAVAN_FARE_LOW,
  CARAVAN_LEAVES_HOUR,
  DAYS_PER_WEEK,
  ELDER_RUMOR_LI,
  GUIDE_LI,
  GUIDE_PAY_LOW,
  GUIDE_TRADES,
  MAPS,
  PLACE_KIND_INFO,
  RUMOR_CHOICES,
  RUMOR_LI,
  RUMOR_LINE_ELSE,
  RUMOR_LINES,
  TEAHOUSE_TAELS,
  TELLERS,
  type MapForSale,
  type PlaceKindInfo,
} from '../../content/map/places.ts';
import { job } from '../../content/jobs.ts';
import { jobPay } from '../jobs.ts';
import { HOURS_PER_DAY } from '../../content/hours.ts';
import { item } from '../../content/items.ts';
import { BORDER_WILDS_NAMES } from '../../content/roster.ts';
import {
  changeDown,
  changeUp,
  pay,
  paySilver,
  stonesOf,
  toSilver,
  toStones,
  withStones,
} from '../purse.ts';
import { Rng } from '../rng.ts';
import { monthIndex } from '../organizations.ts';
import { addItem, realmOf, withPlayer, type GameState } from '../state.ts';
import { known, raise, rumor, sketchKingdom, sketchRegion } from './fog.ts';
import { placeKindOf, standsAt } from './gate.ts';
import { areaById, placeById, type MapPlace, type RegionMap } from './region.ts';
import type { KnowState, MapLife } from './schema.ts';
import { roomFor } from '../gear.ts';
import { goToPlace, homeOf, joinGroup, mapOf, soulBand } from './travel.ts';

export type PlaceResult = { ok: true; state: GameState } | { ok: false; reason: string };

/** The place you are inside, with its map and what its kind holds. */
export function insideOf(
  s: GameState,
): { map: RegionMap; place: MapPlace; info: PlaceKindInfo } | null {
  const map = mapOf(s);
  const id = s.map?.inside;
  const place = map && id ? placeById(map, id) : undefined;
  const kind = place && placeKindOf(place);
  if (!map || !place || !kind) return null;
  return { map, place, info: PLACE_KIND_INFO[kind] };
}

function inPlace(
  s: GameState,
  placeId: string,
): { map: RegionMap; place: MapPlace; info: PlaceKindInfo } | string {
  const here = insideOf(s);
  if (!here || here.place.id !== placeId) return 'You aren’t inside.';
  return here;
}

function withLife(s: GameState, life: MapLife): GameState {
  return { ...s, map: life };
}

// ---------------------------------------------------------------- the teahouse

const COMPASS = [
  'east',
  'south-east',
  'south',
  'south-west',
  'west',
  'north-west',
  'north',
  'north-east',
];

/** Which way and how far, as a teller would say it: "south-west", "three days". */
export function wayWords(
  from: { x: number; y: number },
  to: { x: number; y: number },
): { dir: string; days: string } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const a = Math.atan2(dy, dx);
  const dir = COMPASS[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8]!;
  // A day's walk on the road at Qi Condensation.
  const d = Math.max(1, Math.round(Math.hypot(dx, dy) / 240));
  const words = ['a day', 'two days', 'three days', 'four days', 'five days', 'six days', 'a week'];
  const days =
    d <= words.length ? words[d - 1]! : d < 25 ? `${Math.round(d / 7)} weeks` : 'a month and more';
  return { dir, days };
}

/** What a rumor says, in a teller's voice. */
export function rumorWords(from: MapPlace, to: MapPlace): { teller: string; line: string } {
  const { dir, days } = wayWords(from, to);
  const line = (RUMOR_LINES[to.sub] ?? RUMOR_LINE_ELSE)
    .replace('{name}', to.name)
    .replace('{dir}', dir)
    .replace('{days}', days);
  return { teller: TELLERS[to.sub] ?? 'a traveller', line };
}

/** Whether a place's talk has a rumor for you today, or why not. */
export function rumorToday(
  s: GameState,
  placeId: string,
): { ok: true; place: MapPlace } | { ok: false; reason: string } {
  const here = inPlace(s, placeId);
  if (typeof here === 'string') return { ok: false, reason: here };
  const { map, place, info } = here;
  if (!info.rumors) return { ok: false, reason: 'Nobody here trades talk.' };
  const day = Math.floor(s.calendar.day);
  if (s.map!.heard[placeId] === day)
    return { ok: false, reason: 'You’ve heard today’s talk. More tomorrow.' };
  const reach = info.rumors === 'elder' ? ELDER_RUMOR_LI : RUMOR_LI;
  const near = map.places
    .filter(
      (q) =>
        q.id !== place.id &&
        q.kind !== 'heart' &&
        known(s.map!, q.id) === 'unknown' &&
        Math.hypot(q.x - place.x, q.y - place.y) <= reach,
    )
    .sort(
      (a, b) => Math.hypot(a.x - place.x, a.y - place.y) - Math.hypot(b.x - place.x, b.y - place.y),
    )
    .slice(0, RUMOR_CHOICES);
  if (near.length === 0) return { ok: false, reason: 'Nothing anyone here knows that you don’t.' };
  const rng = Rng.fromString(`rumor/${placeId}/${day}`);
  return { ok: true, place: near[rng.int(0, near.length - 1)]! };
}

/**
 * An hour of the place's talk: a teahouse's pot of tea or a village elder's ear. One rumor a day,
 * of one of the nearest places you don't know, Rumored now in its ring.
 */
export function hearRumor(s: GameState, placeId: string): PlaceResult & { heard?: string } {
  const r = rumorToday(s, placeId);
  if (!r.ok) return r;
  const { place, info } = insideOf(s)!;
  let next = s;
  if (info.rumors === 'teahouse') {
    const paid = paySilver(s.player, TEAHOUSE_TAELS);
    if (!paid) return { ok: false, reason: `A pot of tea is ${TEAHOUSE_TAELS} taels.` };
    next = withPlayer(s, paid);
  }
  const why =
    info.rumors === 'teahouse' ? `the teahouse in ${place.name}` : `the elder of ${place.name}`;
  const life = rumor(next.map!, r.place, why);
  const day = Math.floor(s.calendar.day);
  next = withLife(next, { ...life, heard: { ...life.heard, [placeId]: day } });
  return { ok: true, state: next, heard: r.place.id };
}

// ---------------------------------------------------------------- maps

/** The maps a place sells: a city the region's and each kingdom's, a town the kingdom it stands in. */
export function mapsAt(s: GameState, placeId: string): MapForSale[] {
  const here = insideOf(s);
  if (!here || here.place.id !== placeId || !here.info.maps) return [];
  const { map, place, info } = here;
  const ofRegion = MAPS.filter((m) => m.of === map.id || areaById(map, m.of));
  if (info.maps === 'region') return ofRegion;
  return ofRegion.filter((m) => m.of === place.area);
}

/** How much of a map's ground you know already, in a word. */
export function mapKnown(s: GameState, m: MapForSale): KnowState {
  return s.map ? known(s.map, m.of) : 'unknown';
}

/** Uses a map: its kingdom's outline, towns and roads, or the region's kingdoms and named places, Sketched. */
export function useChart(s: GameState, itemId: string): GameState {
  const map = mapOf(s);
  const chart = item(itemId).uses.chart;
  if (!map || !s.map || !chart) return s;
  const why = item(itemId).name.replace(/^Map/, 'the map');
  if (chart.scope === 'kingdom') return withLife(s, sketchKingdom(map, s.map, chart.of, why));
  return withLife(s, sketchRegion(map, s.map, why));
}

/** Buys a map from the place's seller: it goes in the Bag and Sketches its ground at once. */
export function buyMap(s: GameState, placeId: string, itemId: string): PlaceResult {
  const m = mapsAt(s, placeId).find((x) => x.id === itemId);
  if (!m) return { ok: false, reason: 'No one here sells that map.' };
  if (roomFor(s.player, m.id) < 1) return { ok: false, reason: 'Your pack has no room for it.' };
  const after = pay(stonesOf(s.player), m.price);
  if (!after) return { ok: false, reason: `It costs ${m.price} low-grade.` };
  const bought = withPlayer(s, addItem(withStones(s.player, after), m.id, 1));
  return { ok: true, state: useChart(bought, m.id) };
}

// ---------------------------------------------------------------- guides

export interface Guide {
  id: string;
  name: string;
  trade: string;
  knows: readonly string[];
  /** Low-grade stones a day of the trip. */
  pay: number;
}

/** The guides for hire at a place this month: the same faces for anyone with the same world. */
export function guidesAt(s: GameState, placeId: string): Guide[] {
  const here = insideOf(s);
  if (!here || here.place.id !== placeId) return [];
  const month = monthIndex(s.calendar.day);
  const rng = Rng.fromString(`guides/${placeId}/${month}`);
  const trades = [...GUIDE_TRADES];
  const out: Guide[] = [];
  for (let i = 0; i < here.info.guides && trades.length > 0; i++) {
    const t = trades.splice(rng.int(0, trades.length - 1), 1)[0]!;
    const name = `${rng.pick(BORDER_WILDS_NAMES.surnames)} ${rng.pick(BORDER_WILDS_NAMES.given)}`;
    out.push({
      id: `guide:${placeId}:${month}:${i}`,
      name,
      trade: t.name,
      knows: t.knows,
      pay: GUIDE_PAY_LOW,
    });
  }
  return out;
}

/**
 * The places a guide could take you: sites of their trade within a few days of the town that you
 * haven't seen, a hidden one only if your soul could find it once you are there.
 */
export function guideKnows(s: GameState, placeId: string, g: Guide): MapPlace[] {
  const here = insideOf(s);
  if (!here || here.place.id !== placeId) return [];
  const { map, place } = here;
  const sb = soulBand(s.player);
  return map.places
    .filter(
      (q) =>
        q.kind === 'site' &&
        g.knows.includes(q.sub) &&
        known(s.map!, q.id) !== 'seen' &&
        (!q.hidden || sb >= q.rating) &&
        Math.hypot(q.x - place.x, q.y - place.y) <= GUIDE_LI,
    )
    .sort(
      (a, b) => Math.hypot(a.x - place.x, a.y - place.y) - Math.hypot(b.x - place.x, b.y - place.y),
    );
}

/**
 * Hires a guide to a place they know: it turns Sketched, the course is set, and they lead you there,
 * paid up front for the days it takes.
 */
export function hireGuide(
  s: GameState,
  placeId: string,
  guideId: string,
  siteId: string,
): PlaceResult {
  const g = guidesAt(s, placeId).find((x) => x.id === guideId);
  if (!g) return { ok: false, reason: 'That guide isn’t here.' };
  const site = guideKnows(s, placeId, g).find((q) => q.id === siteId);
  if (!site) return { ok: false, reason: `${g.name} doesn’t know the way there.` };
  const sketched = withLife(s, raise(s.map!, site.id, 'sketched', `${g.name}, a guide`));
  const course = goToPlace(sketched, site.id);
  if (!course.ok) return course;
  const fee = Math.max(1, Math.ceil(course.state.map!.course!.days)) * g.pay;
  const after = pay(stonesOf(s.player), fee);
  if (!after)
    return { ok: false, reason: `${g.name} asks ${fee} low-grade for the days it takes.` };
  return { ok: true, state: withPlayer(course.state, withStones(course.state.player, after)) };
}

// ---------------------------------------------------------------- caravans

export interface Caravan {
  id: string;
  bound: string;
  name: string;
  leader: string;
  /** The world day it sets off, at 辰. */
  departs: number;
}

/** The towns and cities a road joins to this place, a step or two away. */
function roadTowns(map: RegionMap, from: string): string[] {
  const seen = new Set([from]);
  let edge = [from];
  const out: string[] = [];
  for (let step = 0; step < 3 && edge.length > 0; step++) {
    const nextEdge: string[] = [];
    for (const id of edge)
      for (const r of map.roads) {
        const other = r.a === id ? r.b : r.b === id ? r.a : null;
        if (!other || seen.has(other)) continue;
        seen.add(other);
        nextEdge.push(other);
        const p = placeById(map, other);
        if (p && ((p.kind === 'town' && p.sub === 'town') || p.sub === 'city')) out.push(other);
      }
    edge = nextEdge;
  }
  return out;
}

/** The caravans leaving a place this week and next that haven't left yet. */
export function caravansAt(s: GameState, placeId: string): Caravan[] {
  const here = insideOf(s);
  if (!here || here.place.id !== placeId || here.info.caravans === 0) return [];
  const { map, info } = here;
  const towns = roadTowns(map, placeId);
  if (towns.length === 0) return [];
  const now = s.calendar.day;
  const week = Math.floor(now / DAYS_PER_WEEK);
  const out: Caravan[] = [];
  for (const w of [week, week + 1]) {
    const rng = Rng.fromString(`caravans/${placeId}/${w}`);
    // A week's caravans go different ways while there are ways enough.
    let ways = [...towns];
    for (let i = 0; i < info.caravans; i++) {
      if (ways.length === 0) ways = [...towns];
      const bound = ways.splice(rng.int(0, ways.length - 1), 1)[0]!;
      const departs =
        w * DAYS_PER_WEEK + rng.int(0, DAYS_PER_WEEK - 1) + CARAVAN_LEAVES_HOUR / HOURS_PER_DAY;
      const leader = `${rng.pick(BORDER_WILDS_NAMES.surnames)} ${rng.pick(BORDER_WILDS_NAMES.given)}`;
      if (departs <= now) continue;
      out.push({
        id: `caravan:${placeId}:${w}:${i}`,
        bound,
        name: `The merchant guild’s caravan to ${placeById(map, bound)!.name}`,
        leader: `Factor ${leader}`,
        departs,
      });
    }
  }
  return out.sort((a, b) => a.departs - b.departs).slice(0, info.caravans);
}

/**
 * Joins a caravan: riding its wagon for the fare, your hours free at half, or guarding it on the
 * Caravan guard routine, paid a hire's day on arriving (O4). It owns the course, and sets off on its day.
 */
export function joinCaravan(
  s: GameState,
  placeId: string,
  caravanId: string,
  as: 'ride' | 'guard',
): PlaceResult {
  const c = caravansAt(s, placeId).find((x) => x.id === caravanId);
  if (!c) return { ok: false, reason: 'That caravan has gone.' };
  let next = s;
  if (as === 'ride') {
    const after = pay(stonesOf(s.player), CARAVAN_FARE_LOW);
    if (!after) return { ok: false, reason: `The fare is ${CARAVAN_FARE_LOW} low-grade.` };
    next = withPlayer(s, withStones(s.player, after));
  }
  return joinGroup(
    next,
    {
      kind: 'caravan',
      name: c.name,
      leader: c.leader,
      bound: c.bound,
      stops: [],
      // Guarding is a hire (O4): a duty day's stones at your realm.
      pay: as === 'guard' ? jobPay(job('caravan-guard'), realmOf(s.player)).stones : 0,
      canLeave: true,
      leaveCost:
        as === 'guard'
          ? 'A guard who walks off loses the pay owed, and the guild remembers it.'
          : 'You lose the fare.',
      leading: false,
      departs: c.departs,
    },
    as === 'ride' ? 'wagon' : 'light-step',
  );
}

// ---------------------------------------------------------------- the money changer

export type Change = 'break-low' | 'buy-low' | 'break-mid' | 'buy-mid';

/** The money changer: a stone for 110 taels and 120 back, a mid-grade for 1,100 low and 1,200 back. */
export function changeMoney(s: GameState, placeId: string, how: Change): PlaceResult {
  const r = change(s, placeId, how);
  // An introduction quest's step may wait on it (core/journal.ts).
  return r.ok ? { ...r, state: didDeed(r.state, 'changed') } : r;
}

function change(s: GameState, placeId: string, how: Change): PlaceResult {
  const here = inPlace(s, placeId);
  if (typeof here === 'string') return { ok: false, reason: here };
  if (!here.info.changer) return { ok: false, reason: 'There’s no money changer here.' };
  const c = s.player;
  if (how === 'break-low') {
    const after = toSilver(c, 1);
    return after
      ? { ok: true, state: withPlayer(s, after) }
      : { ok: false, reason: 'You have no low-grade stone.' };
  }
  if (how === 'buy-low') {
    const after = toStones(c, 1);
    return after
      ? { ok: true, state: withPlayer(s, after) }
      : { ok: false, reason: 'A stone is 120 taels.' };
  }
  const after = how === 'break-mid' ? changeDown(stonesOf(c), 'mid') : changeUp(stonesOf(c), 'mid');
  if (!after)
    return {
      ok: false,
      reason: how === 'break-mid' ? 'You have no mid-grade stone.' : 'A mid-grade is 1,200 low.',
    };
  return { ok: true, state: withPlayer(s, withStones(c, after)) };
}

// ---------------------------------------------------------------- the bed

/**
 * The nights you sleep inside a place away from home: each one paid from your silver at its bed's
 * price, by rule. With no silver you sleep rough, for nothing.
 */
export function bedNights(s: GameState, fromDay: number, toDay: number): GameState {
  const here = insideOf(s);
  const nights = Math.floor(toDay) - Math.floor(fromDay);
  if (!here || nights <= 0 || here.info.bed === null) return s;
  const map = here.map;
  if (homeOf(s, map).id === here.place.id) return s;
  let c = s.player;
  for (let i = 0; i < nights; i++) c = paySilver(c, here.info.bed) ?? c;
  return c === s.player ? s : didDeed(withPlayer(s, c), 'slept');
}

/** Whether you stand at a place, so its Enter is offered. */
export { standsAt };
