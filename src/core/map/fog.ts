// The fog (design § The world, The fog): what you know of each place, rising only, Unknown to
// Rumored to Sketched to Seen; sight from where you stand; looking around; rumors in their rings; and
// what every start knows. The map's distances are thirty times a scene's.
import {
  CLOSED_TERRAINS,
  HOME_SEEN_LI,
  LOOK_LI,
  RUMOR_RING_LI,
  SENSE_LI,
  SIGHT_CLOSED,
  SIGHT_OPEN,
} from '../../content/map/travel.ts';
import { REALMS, realmIndex, type RealmId } from '../../content/realms.ts';
import { hashSeed, mulberry32 } from '../rng.ts';
import { inMulti, lineDist, multiDist, ringCentroid, type Pt } from './geometry.ts';
import {
  areaAt,
  inRegion,
  terrainAt,
  type MapArea,
  type MapPlace,
  type RegionMap,
} from './region.ts';
import type { KnowState, MapLife } from './schema.ts';
import { bandAt } from './depth.ts';

/**
 * What it takes to sense a hidden site: its own rating, and never less than the band of the ground
 * it stands on, so a site deep in a heart's rings is as hard to find as the land around it.
 */
export function siteRating(map: RegionMap, q: MapPlace): number {
  return Math.max(q.rating, bandAt(map, [q.x, q.y]));
}

const RANK: Record<KnowState, number> = { unknown: 0, rumored: 1, sketched: 2, seen: 3 };

export function known(life: MapLife, id: string): KnowState {
  return life.know[id] ?? 'unknown';
}

/** Raises what you know of a place, never lowering it; `why` says who told you or which map. */
export function raise(
  life: MapLife,
  id: string,
  st: Exclude<KnowState, 'unknown'>,
  why?: string,
): MapLife {
  if (RANK[st] <= RANK[known(life, id)]) return life;
  const told = why && st !== 'seen' ? { ...life.told, [id]: why } : life.told;
  return { ...life, know: { ...life.know, [id]: st }, told };
}

/** How far you see on the map from a spot: 600 li in the open, 150 in closed country. */
export function sightAt(map: RegionMap, p: Pt): number {
  return CLOSED_TERRAINS.includes(terrainAt(map, p)) ? SIGHT_CLOSED : SIGHT_OPEN;
}

/** Divine sense's sweep on the map for a soul at a realm and stage, from Foundation; 0 below. */
export function senseLi(soulRealm: RealmId, aheadOfRealm = false): number {
  const i = realmIndex(soulRealm) + (aheadOfRealm ? 1 : 0);
  const r = REALMS[Math.min(REALMS.length - 1, i)]!.id;
  if (i <= 0) return 0;
  return SENSE_LI[r] ?? Math.max(...Object.values(SENSE_LI));
}

export interface Seeing {
  life: MapLife;
  /** Places that turned Seen, hidden ones found among them. */
  seen: string[];
  found: string[];
}

/**
 * What a spot shows: every visible place within sight, the kingdom or tract you stand in or see
 * into, the roads you see, and with divine sense the hidden sites in its sweep your soul can find.
 */
export function seeFrom(
  map: RegionMap,
  life: MapLife,
  p: Pt,
  soulBand: number,
  sense: number,
): Seeing {
  const r = sightAt(map, p);
  let next = life;
  const seen: string[] = [];
  const found: string[] = [];
  const see = (id: string) => {
    if (known(next, id) === 'seen') return;
    next = raise(next, id, 'seen');
    seen.push(id);
  };
  for (const q of map.places) {
    const d = Math.hypot(q.x - p[0], q.y - p[1]);
    if (!q.hidden) {
      if (d <= r) see(q.id);
    } else if (
      sense > 0 &&
      d <= sense &&
      soulBand >= siteRating(map, q) &&
      known(next, q.id) !== 'seen'
    ) {
      see(q.id);
      found.push(q.id);
    }
  }
  const here = areaAt(map, p);
  if (here) see(here.id);
  for (const a of map.areas) {
    if (a.kind === 'tract') continue;
    if (multiDist(p, a.outline) <= r) see(a.id);
  }
  // A tract is seen when your sight reaches into it.
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    const q: Pt = [p[0] + Math.cos(ang) * r, p[1] + Math.sin(ang) * r];
    const a = areaAt(map, q);
    if (a && a.kind === 'tract') see(a.id);
  }
  for (const rd of map.roads)
    if (known(next, rd.id) !== 'seen' && lineDist(p, rd.pts) <= r) see(rd.id);
  if (inRegion(map, p)) next = raise(next, map.id, 'sketched');
  return { life: next, seen, found };
}

/**
 * Looking around (an hour on the road wheel, and on arriving): the hidden sites within a look's
 * reach whose rating your soul meets, or your divine sense's sweep when that is wider, and the
 * rumored place whose ring you stand in.
 */
export function lookAround(
  map: RegionMap,
  life: MapLife,
  p: Pt,
  soulBand: number,
  sense: number,
): Seeing {
  const reach = Math.max(LOOK_LI, sense);
  let next = life;
  const found: string[] = [];
  for (const q of map.places) {
    if (known(next, q.id) === 'seen') continue;
    const d = Math.hypot(q.x - p[0], q.y - p[1]);
    const ring = next.rings[q.id];
    const inRing =
      known(next, q.id) === 'rumored' &&
      ring &&
      Math.hypot(ring[0] - p[0], ring[1] - p[1]) <= RUMOR_RING_LI / 2;
    if (
      (q.hidden && d <= reach && soulBand >= siteRating(map, q)) ||
      (inRing && (!q.hidden || soulBand >= siteRating(map, q)))
    ) {
      next = raise(next, q.id, 'seen');
      found.push(q.id);
    }
  }
  return { life: next, seen: found, found };
}

/** A rumor of a place: Rumored, in a ring about it whose centre is seeded from the place. */
export function rumor(life: MapLife, place: MapPlace | MapArea, why: string): MapLife {
  if (known(life, place.id) !== 'unknown') return life;
  const next = raise(life, place.id, 'rumored', why);
  const c: Pt = 'x' in place ? [place.x, place.y] : ringCentroid(place.outline[0]![0]!);
  const rng = mulberry32(hashSeed(`ring:${place.id}`));
  const off = rng() * (RUMOR_RING_LI / 2) * 0.6;
  const ang = rng() * Math.PI * 2;
  return {
    ...next,
    rings: {
      ...next.rings,
      [place.id]: [Math.round(c[0] + Math.cos(ang) * off), Math.round(c[1] + Math.sin(ang) * off)],
    },
  };
}

/** A kingdom map: its outline, its towns and its roads Sketched (design § The world, The fog: Maps). */
export function sketchKingdom(
  map: RegionMap,
  life: MapLife,
  kingdomId: string,
  why: string,
): MapLife {
  const k = map.areas.find((a) => a.id === kingdomId);
  if (!k) return life;
  let next = raise(life, k.id, 'sketched', why);
  for (const q of map.places)
    if ((q.kind === 'town' || q.kind === 'atlas') && !q.hidden && inMulti([q.x, q.y], k.outline))
      next = raise(next, q.id, 'sketched', why);
  for (const rd of map.roads)
    if (rd.pts.some((pt) => inMulti(pt, k.outline))) next = raise(next, rd.id, 'sketched', why);
  return next;
}

/**
 * What every start knows: its home kingdom Sketched, a day's walk round its home Seen, the
 * region's famous places Rumored, and the region's outline.
 */
export function startKnowledge(map: RegionMap, life: MapLife, home: MapPlace): MapLife {
  let next = raise(life, map.id, 'sketched', 'where you were born');
  const at: Pt = [home.x, home.y];
  const kingdom = map.areas.find(
    (a) => a.kind === 'kingdom' && (a.id === home.area || inMulti(at, a.outline)),
  );
  if (kingdom) next = sketchKingdom(map, next, kingdom.id, 'your home kingdom');
  for (const q of map.places)
    if (!q.hidden && Math.hypot(q.x - at[0], q.y - at[1]) <= HOME_SEEN_LI)
      next = raise(next, q.id, 'seen');
  next = raise(next, home.id, 'seen');
  for (const q of [...map.places, ...map.areas])
    if (q.famous && known(next, q.id) === 'unknown')
      next = rumor(next, q, 'everyone in the region has heard of it');
  return next;
}
