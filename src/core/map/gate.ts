// Going into a place (design § The world: Wherever you like, if you're strong enough): what kind of
// place it is, what its gate does with you, and standing inside it. A city's or a town's watch reads
// the realm you show and your name in the region: renown waives the toll, infamy has you turned away
// unless the sergeant takes a bribe, a persuade check offering greed. A gated place, a sect's gate or
// a secret realm, asks for what opens it. Kept apart from travel.ts so arriving on a course can go in.
import {
  ENTER_LI,
  PLACE_KIND_INFO,
  WATCH_BRIBE_LOW,
  WATCH_REFUSES_AT,
  WATCH_WAIVES_AT,
  type PlaceKindId,
} from '../../content/map/places.ts';
import { realm, stageName, type RealmId } from '../../content/realms.ts';
import { pay, stonesOf, withStones } from '../purse.ts';
import { actorFromCultivator, plainActor } from '../resolver/actor.ts';
import { fameOf, isMember } from '../resolver/names.ts';
import { rollNature } from '../resolver/nature.ts';
import { remember } from '../resolver/opinion.ts';
import { talkCheck } from '../resolver/talk.ts';
import { statesOf, type World } from '../resolver/world.ts';
import { realmOf, withPlayer, type GameState } from '../state.ts';
import { regionData } from '../../content/map/index.ts';
import type { Pt } from './geometry.ts';
import type { MapPlace, RegionMap } from './region.ts';

/** The kind of place a map place is, for its screen; null for what can't be gone into (a heart). */
export function placeKindOf(p: MapPlace): PlaceKindId | null {
  if (p.kind === 'town') return p.sub === 'town' ? 'town' : 'village';
  if (p.kind === 'site') return 'site';
  if (p.kind !== 'atlas') return null;
  if (p.gated) return 'gate';
  if (p.sub === 'city') return 'city';
  return 'hall';
}

/**
 * The bed where you stand, if a place you stand at has one: a city's or a town's inn, a village's
 * barn. Null in the wilds, where a found shelter or a camp is the night.
 */
export function bedAt(
  map: RegionMap,
  at: Pt,
): { place: MapPlace; kind: PlaceKindId; taels: number } | null {
  for (const p of map.places) {
    const kind = placeKindOf(p);
    const taels = kind ? PLACE_KIND_INFO[kind].bed : null;
    if (kind && taels !== null && Math.hypot(p.x - at[0], p.y - at[1]) < ENTER_LI)
      return { place: p, kind, taels };
  }
  return null;
}

/** Whether you stand at a place: within a short walk of it. */
export function standsAt(s: GameState, p: MapPlace): boolean {
  const at = s.map?.at;
  return !!at && Math.hypot(p.x - at[0], p.y - at[1]) < ENTER_LI;
}

/** What opens a gated place, as the atlas writes it. */
export interface Access {
  by: readonly ('token' | 'rank' | 'invitation' | 'toll')[];
  array?: RealmId;
  /** Whose toll and whose token. */
  of?: string;
  toll?: { stones: number; grade: string };
  below?: RealmId;
  needs?: readonly string[];
  cycle?: { every: number; days: number; anchor: number };
}

export function accessOf(map: RegionMap, id: string): Access | null {
  const p = regionData(map.id)?.file.places.find((x) => x.id === id);
  return (p?.access as Access | null | undefined) ?? null;
}

/** What the gate does with you: */
export type GateRead =
  /** Nothing stands in the way (a village, a hall, a wild site, a town's watch that lets you by). */
  | { kind: 'open'; words: string }
  /** The watch takes its toll. */
  | { kind: 'toll'; toll: number; words: string }
  /** Your renown here waives the toll. */
  | { kind: 'waived'; toll: number; words: string }
  /** The watch knows your face: a bribe or nothing. */
  | { kind: 'refused'; bribe: number; words: string }
  /** A gated place you hold the way into. */
  | { kind: 'member'; words: string }
  /** A gated place shut to you: what would open it. */
  | { kind: 'shut'; access: Access; words: string };

/** The realm the watch reads off you: the one you show, your cover's when you travel veiled (P3.7). */
export function shownRealm(s: GameState): string {
  const cover = statesOf(s.world, s.player.id, 'cover', s.calendar.day)[0];
  if (cover) {
    const shown = cover.data.shown;
    return `${realm(shown.realm).name}, ${stageName(shown.realm, shown.stage)}`;
  }
  const r = realmOf(s.player);
  const ladder = ([s.player.qi, s.player.body, s.player.soul] as const).find((l) => l.realm === r);
  return `${realm(r).name}, ${stageName(r, ladder?.stage ?? 1)}`;
}

function watchId(placeId: string): string {
  return `watch:${placeId}`;
}

/** What the gate of a place does with you today. */
export function gateOf(s: GameState, map: RegionMap, p: MapPlace): GateRead {
  const kind = placeKindOf(p);
  if (!kind) return { kind: 'shut', access: { by: [] }, words: 'There is no way in.' };
  if (kind === 'gate') {
    const access = accessOf(map, p.id) ?? { by: ['token'] };
    const power = access.of ?? p.id;
    if (p.sub === 'realm') {
      return {
        kind: 'shut',
        access,
        words: 'The way in opens on its own cycle; going in is P3.11’s.',
      };
    }
    if (isMember(s.world, s.player.id, power) || s.world.known.includes(`token:${power}`)) {
      return { kind: 'member', words: 'You show the token, and the guards step aside.' };
    }
    return {
      kind: 'shut',
      access,
      words: `The guards ask for ${access.by.map((b) => ACCESS_WORDS[b]).join(' or ')}.`,
    };
  }
  const info = PLACE_KIND_INFO[kind];
  if (!info.watch) return { kind: 'open', words: '' };
  const region = map.id;
  const day = s.calendar.day;
  const realm = shownRealm(s);
  if (fameOf(s.world, s.player.id, region, 'infamy', day) >= WATCH_REFUSES_AT) {
    return {
      kind: 'refused',
      bribe: WATCH_BRIBE_LOW,
      words: `The watch reads you at ${realm} and knows your face. They won’t let you in.`,
    };
  }
  if (info.toll > 0 && fameOf(s.world, s.player.id, region, 'renown', day) >= WATCH_WAIVES_AT) {
    return {
      kind: 'waived',
      toll: info.toll,
      words: `The watch reads you at ${realm}, knows your name and waves you through without the toll.`,
    };
  }
  if (info.toll > 0) {
    return {
      kind: 'toll',
      toll: info.toll,
      words: `The watch reads you at ${realm} and takes the toll, ${info.toll} low-grade.`,
    };
  }
  return { kind: 'open', words: `The watch reads you at ${realm} and lets you through.` };
}

const ACCESS_WORDS: Record<string, string> = {
  token: 'a token',
  rank: 'a rank',
  invitation: 'an invitation',
  toll: 'the toll',
};

/** A refusal may still change the world: a sergeant remembers the bribe he turned down. */
export type EnterResult =
  { ok: true; state: GameState } | { ok: false; reason: string; state?: GameState };

function inside(s: GameState, id: string): GameState {
  const life = s.map!;
  return {
    ...s,
    map: {
      ...life,
      inside: id,
      course: null,
      been: life.been.includes(id) ? life.been : [...life.been, id],
    },
  };
}

/** The sergeant of a place's watch: someone the world keeps from the first bribe on. */
function withWatch(w: World, p: MapPlace): World {
  const id = watchId(p.id);
  if (w.kept[id]) return w;
  const nature = rollNature(id, { trade: 'soldier' });
  return {
    ...w,
    kept: {
      ...w.kept,
      [id]: { name: `the sergeant of the watch at ${p.name}`, nature, power: null, home: p.id },
    },
  };
}

/**
 * Goes into a place you stand at, through its gate: the toll paid, or waived, or a bribe offered
 * when the watch turns you away. Going into the place you are already inside costs nothing.
 */
export function enterAt(
  s: GameState,
  map: RegionMap,
  p: MapPlace,
  opts: { bribe?: boolean } = {},
): EnterResult {
  if (!s.map) return { ok: false, reason: 'The map isn’t ready.' };
  if (s.map.inside === p.id) return { ok: true, state: s };
  if (s.map.group) return { ok: false, reason: `${s.map.group.name} keeps moving.` };
  if (!standsAt(s, p)) return { ok: false, reason: `You aren’t at ${p.name}.` };
  const g = gateOf(s, map, p);
  switch (g.kind) {
    case 'open':
    case 'waived':
    case 'member':
      return { ok: true, state: inside(s, p.id) };
    case 'toll': {
      const after = pay(stonesOf(s.player), g.toll);
      if (!after)
        return { ok: false, reason: `The toll is ${g.toll} low-grade, and you can’t pay it.` };
      return { ok: true, state: inside(withPlayer(s, withStones(s.player, after)), p.id) };
    }
    case 'refused': {
      if (!opts.bribe) return { ok: false, reason: g.words };
      const after = pay(stonesOf(s.player), g.bribe);
      if (!after) return { ok: false, reason: `A bribe worth his while is ${g.bribe} low-grade.` };
      const kept = { ...s, world: withWatch(s.world, p) };
      const you = actorFromCultivator(kept);
      const sergeant = plainActor({
        id: watchId(p.id),
        name: 'sergeant',
        side: 'watch',
        power: null,
      });
      const check = talkCheck(
        kept,
        you,
        sergeant,
        { verb: 'talk', act: 'persuade', target: sergeant.id, offer: 'greed' },
        map.id,
      );
      if (check.verdict === 'short') {
        const world = remember(
          kept.world,
          {
            holder: sergeant.id,
            about: s.player.id,
            row: 'bad-turn',
            value: -5,
            note: 'Offered me a bribe',
            known: [sergeant.id],
          },
          s.calendar.day,
        );
        return {
          ok: false,
          reason: 'He looks at the stones, then at you, and shakes his head.',
          state: { ...kept, world },
        };
      }
      return { ok: true, state: inside(withPlayer(kept, withStones(kept.player, after)), p.id) };
    }
    case 'shut':
      return { ok: false, reason: g.words };
  }
}

/** Steps out of the place onto the map where it stands. */
export function stepOut(s: GameState): GameState {
  if (!s.map?.inside) return s;
  return { ...s, map: { ...s.map, inside: null } };
}
