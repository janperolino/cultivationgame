// The bounty board (P3.7's talk, in P3.6b's slot): a city's or town's postings, three a month from
// the goal templates, each a goal met at a spot on the map like any encounter and paid at the board
// on your return. P3.9 makes the goal a scene; the posting stays the same.
import { ENCOUNTERS, encounterTemplate } from '../../content/encounters/index.ts';
import {
  POSTING_LI,
  POSTING_PAY,
  POSTING_PAY_STEP,
  POSTINGS_PER_MONTH,
} from '../../content/encounters/pace.ts';
import type { Template, TripGoal } from '../../content/encounters/schema.ts';
import { PLACE_KINDS } from '../../content/map/places.ts';
import { hashSeed, Rng } from '../rng.ts';
import { monthOf } from '../shops.ts';
import { addEvent, withPlayer, type GameState } from '../state.ts';
import { bandAt } from './depth.ts';
import { contact } from './encounters.ts';
import { placeKindOf } from './gate.ts';
import { areaAt, placeById, type MapPlace, type RegionMap } from './region.ts';
import type { Encounter, Posting } from './schema.ts';

/** The goals a board posts; an escort is a caravan's, joined at the guild (P3.6b). */
export const POSTED_GOALS: readonly TripGoal[] = [
  'bounty',
  'herb-run',
  'core-hunt',
  'delivery',
  'patrol',
];
/** At most this many postings taken at once. */
export const MAX_TAKEN = 3;
/** You reach a posting's spot within this many li. */
export const SPOT_LI = 250;
/** A goal met and fallen short can be met again after this many days. */
export const RETRY_DAYS = 30;

export function hasBoard(p: MapPlace): boolean {
  const k = placeKindOf(p);
  return !!k && PLACE_KINDS[k].board;
}

/** Ordered by id, code point by code point: a seeded pick must not lean on the machine's locale. */
const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function goalTemplates(): Template[] {
  return ENCOUNTERS.filter((t) => t.goal && POSTED_GOALS.includes(t.goal));
}

function spotFor(map: RegionMap, board: MapPlace, t: Template, rng: Rng): MapPlace | null {
  const d = (p: MapPlace) => Math.hypot(p.x - board.x, p.y - board.y);
  const inRange = map.places.filter(
    (p) => p.id !== board.id && d(p) >= POSTING_LI[0] && d(p) <= POSTING_LI[1],
  );
  const wanted =
    t.goal === 'delivery'
      ? inRange.filter((p) => p.settled)
      : inRange.filter((p) => p.kind === 'site');
  // A goal at a kind of site needs one in reach: the patrol's border post, the bounty's camp.
  const bySite = t.where.site
    ? wanted.filter((p) => t.where.site!.includes(p.sub as never))
    : wanted;
  const pool = bySite.filter((p) => !p.hidden);
  return pool.length ? rng.pick([...pool].sort(byId)) : null;
}

function payFor(band: number): number {
  return Math.round(POSTING_PAY * POSTING_PAY_STEP ** Math.max(0, band));
}

const DIRS = [
  'east',
  'south-east',
  'south',
  'south-west',
  'west',
  'north-west',
  'north',
  'north-east',
];

function bearing(from: MapPlace, to: MapPlace): string {
  const a = Math.atan2(to.y - from.y, to.x - from.x);
  return DIRS[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8]!;
}

/** This month's postings on a board: seeded by the place and the month, the same for every visit. */
export function postingsAt(s: GameState, map: RegionMap, board: MapPlace): Posting[] {
  if (!hasBoard(board)) return [];
  const month = monthOf(s.calendar.day);
  const rng = new Rng(hashSeed(`board/${board.id}/${month}`));
  const pool = goalTemplates();
  const out: Posting[] = [];
  // A month's postings are different goals, each with a spot of its kind in reach.
  const order = [...pool].sort(byId);
  for (let i = order.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  for (const t of order) {
    if (out.length >= POSTINGS_PER_MONTH) break;
    const spot = spotFor(map, board, t, rng);
    if (!spot) continue;
    const i = out.length;
    const band = Math.max(0, bandAt(map, [spot.x, spot.y]));
    const li = Math.round(Math.hypot(spot.x - board.x, spot.y - board.y) / 100) * 100;
    const where =
      spot.kind === 'site' ? (areaAt(map, [spot.x, spot.y])?.name ?? map.name) : spot.name;
    out.push({
      id: `${board.id}/${month}/${i}`,
      board: board.id,
      template: t.id,
      title: t.title,
      text: `${spot.kind === 'site' ? spot.name.charAt(0).toUpperCase() + spot.name.slice(1) : spot.name}, ${where === spot.name ? '' : `in ${where}, `}${li.toLocaleString('en')} li ${bearing(board, spot)}.`,
      spot: [spot.x, spot.y],
      place: spot.id,
      band,
      pay: payFor(band),
      taken: s.calendar.day,
      done: false,
    });
  }
  return out;
}

export type BoardCheck = { ok: true; state: GameState } | { ok: false; reason: string };

/** Takes a posting: it pins on the map, and its goal waits at its spot. */
export function takePosting(s: GameState, map: RegionMap, board: MapPlace, id: string): BoardCheck {
  const life = s.map;
  if (!life) return { ok: false, reason: 'The map isn’t ready.' };
  if (life.postings.some((p) => p.id === id)) return { ok: false, reason: 'You hold it already.' };
  if (life.postings.filter((p) => !p.done).length >= MAX_TAKEN)
    return { ok: false, reason: `You can hold ${MAX_TAKEN} postings at once.` };
  const p = postingsAt(s, map, board).find((x) => x.id === id);
  if (!p) return { ok: false, reason: 'It is gone from the board.' };
  return {
    ok: true,
    state: {
      ...s,
      map: { ...life, postings: [...life.postings, { ...p, taken: s.calendar.day }] },
    },
  };
}

/** Claims a done posting's pay at its board, standing inside it. */
export function claimPosting(s: GameState, map: RegionMap, id: string): BoardCheck {
  const life = s.map;
  const p = life?.postings.find((x) => x.id === id);
  if (!life || !p) return { ok: false, reason: 'You hold no such posting.' };
  if (!p.done) return { ok: false, reason: 'Its goal isn’t met yet.' };
  if (life.inside !== p.board) {
    const b = placeById(map, p.board);
    return {
      ok: false,
      reason: `It is paid at the board in ${b?.name ?? 'the town that posted it'}.`,
    };
  }
  let st = withPlayer(s, { ...s.player, stones: s.player.stones + p.pay });
  st = { ...st, map: { ...st.map!, postings: st.map!.postings.filter((x) => x.id !== id) } };
  const b = placeById(map, p.board);
  return {
    ok: true,
    state: addEvent(st, 'encounter', {
      line: `is paid ${p.pay} low-grade stones at the bounty board for ${p.title.charAt(0).toLowerCase()}${p.title.slice(1)}`,
      where: b?.name ?? map.name,
      kind: 'choice',
    }),
  };
}

/** Drops a posting you hold. */
export function dropPosting(s: GameState, id: string): GameState {
  if (!s.map) return s;
  return { ...s, map: { ...s.map, postings: s.map.postings.filter((p) => p.id !== id) } };
}

/** At a posting's spot its goal is met, once until a month after it fell short. */
export function reachPostings(s: GameState, map: RegionMap): GameState {
  let st = s;
  const life = st.map;
  if (!life) return st;
  for (const p of life.postings) {
    if (p.done || st.map!.encounters.some((e) => e.posting === p.id)) continue;
    if (Math.hypot(p.spot[0] - st.map!.at[0], p.spot[1] - st.map!.at[1]) > SPOT_LI) continue;
    if (p.met !== undefined && st.calendar.day - p.met < RETRY_DAYS) continue;
    encounterTemplate(p.template);
    const enc: Encounter = {
      id: `goal-${p.id}`,
      template: p.template,
      seed: hashSeed(p.id),
      band: p.band,
      at: [p.spot[0], p.spot[1]],
      meetAt: null,
      state: 'sensed',
      how: 'seen',
      tried: [],
      day: st.calendar.day,
      where: placeById(map, p.place ?? '')?.name ?? areaAt(map, p.spot)?.name ?? map.name,
      posting: p.id,
    };
    st = {
      ...st,
      map: {
        ...st.map!,
        encounters: [...st.map!.encounters, enc],
        postings: st.map!.postings.map((x) => (x.id === p.id ? { ...x, met: st.calendar.day } : x)),
      },
    };
    st = contact(st, enc.id);
  }
  return st;
}
