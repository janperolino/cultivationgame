// Depth and qi density (design § The world, Depth and qi density): a spot's band is its land's edge
// band, set by qi density, plus how many rings deep it is toward a heart. Near people it stays at the
// edge; each 1,200 li from the nearest road or settlement allows one more ring; and a heart's ground
// is a ragged shape that fills its wild, read through a warp.
import { realm as realmInfo, type RealmId } from '../../content/realms.ts';
import {
  BANDS,
  EDGE_BAND_OFFSET,
  EDGE_LI,
  HEART_REACH_LI,
  HEART_REACH_PER_RING,
  PULL_IN_BANDS,
  RING_LI,
  type Band,
} from '../../content/map/travel.ts';
import { densify, fbm, type Pt } from './geometry.ts';
import { atlasAreaAt, type RegionMap } from './region.ts';
import type { GenHeart } from './region.ts';

const ANCHORS = new WeakMap<RegionMap, Pt[]>();

function anchorsOf(map: RegionMap): Pt[] {
  let a = ANCHORS.get(map);
  if (!a) {
    a = [];
    for (const r of map.roads) a.push(...densify(r.pts, 500));
    for (const p of map.places) if (p.settled) a.push([p.x, p.y]);
    ANCHORS.set(map, a);
  }
  return a;
}

/** How far a spot is from people: the nearest road or settled place, in li. */
export function peopleLi(map: RegionMap, p: Pt): number {
  let d = Infinity;
  for (const q of anchorsOf(map)) d = Math.min(d, Math.hypot(q[0] - p[0], q[1] - p[1]));
  return d;
}

/** The qi density where a spot stands: its kingdom's or forbidden land's, else its region's. */
export function qiAt(map: RegionMap, p: Pt): number {
  return atlasAreaAt(map, p)?.qiDensity ?? map.qiDensity;
}

/** What lives at a land's edge, near people: its qi density less three. */
export function edgeBand(map: RegionMap, p: Pt): number {
  return qiAt(map, p) - EDGE_BAND_OFFSET;
}

/** A heart's rings above its land's edge: fixed by the atlas, or its own and more as the qi rises. */
export function heartRings(map: RegionMap, h: GenHeart): number {
  const at: Pt = [h.x, h.y];
  if (h.fixedBand !== null) return Math.max(1, h.fixedBand - edgeBand(map, at));
  return h.rings + Math.max(0, Math.floor((qiAt(map, at) - 3) / 2));
}

export function heartBand(map: RegionMap, h: GenHeart): number {
  return edgeBand(map, [h.x, h.y]) + heartRings(map, h);
}

/** The ground a heart holds, in li: the stronger it is, the more. */
export function heartReach(map: RegionMap, h: GenHeart): number {
  return HEART_REACH_LI + HEART_REACH_PER_RING * heartRings(map, h);
}

/** The spot read through a warp, so a heart's ground is ragged rather than round. */
export function warped(p: Pt): Pt {
  return [
    p[0] + (fbm(p[0] / 7000, p[1] / 7000, 61) - 0.5) * 9000,
    p[1] + (fbm(p[0] / 7000, p[1] / 7000, 67) - 0.5) * 9000,
  ];
}

export interface DepthField {
  /** Below 1 at the edge, 1 across the open wilds, rising toward a heart's rings. */
  f: number;
  heart: GenHeart | null;
}

/** The depth field from a spot's distance to people and its warped place; split so a grid can cache the parts. */
export function fieldFrom(map: RegionMap, people: number, w: Pt): DepthField {
  if (people < EDGE_LI) return { f: people / EDGE_LI, heart: null };
  let best: DepthField = { f: 1, heart: null };
  for (const h of map.hearts) {
    const reach = heartReach(map, h);
    const d = Math.hypot(h.x - w[0], h.y - w[1]);
    if (d >= reach) continue;
    const rings = heartRings(map, h);
    const f = Math.min(rings * (1 - d / reach) * 1.25, rings, people / RING_LI);
    if (f > best.f) best = { f, heart: h };
  }
  return best;
}

export function depthField(map: RegionMap, p: Pt): DepthField {
  return fieldFrom(map, peopleLi(map, p), warped(p));
}

export interface DepthInfo {
  /** 0 at the edge, then the ring you stand in. */
  ring: number;
  /** The rings toward the heart you stand under, or 1 in the open wilds. */
  of: number;
  heart: GenHeart | null;
  /** "the edge", "the wilds", "ring 2 of 5 toward the Wolf King's ridge", "the heart of …". */
  name: string;
}

export function depthInfo(map: RegionMap, p: Pt): DepthInfo {
  const { f, heart } = depthField(map, p);
  const ring = f < 1 ? 0 : Math.max(1, Math.ceil(f - 1e-9));
  const of = heart ? heartRings(map, heart) : 1;
  const name =
    ring === 0
      ? 'the edge'
      : !heart
        ? 'the wilds'
        : ring >= of
          ? `the heart of ${heart.name}`
          : `ring ${ring} of ${of} toward ${heart.name}`;
  return { ring, of, heart, name };
}

/** The band of what lives at a spot: its land's edge band plus its ring. */
export function bandAt(map: RegionMap, p: Pt): number {
  return edgeBand(map, p) + depthInfo(map, p).ring;
}

export function band(i: number): Band | null {
  if (i < 0) return null;
  return BANDS[Math.min(BANDS.length - 1, i)]!;
}

/** The band a realm and stage stand in: a third of the realm, or the realm whole past Void Refinement. */
export function bandOfRealm(realm: RealmId, stage: number): number {
  const i = BANDS.findIndex((b) => b.realm === realm);
  if (i < 0) return 0;
  const first = BANDS[i]!;
  if (first.third === null) return i;
  const stages = realmInfo(realm).stages;
  const third = Math.min(3, Math.max(1, Math.ceil((stage * 3) / stages)));
  return i + third - 1;
}

/** Ground a whole realm above you finds you before you find it. */
export function pullsIn(spotBand: number, yourBand: number): boolean {
  return spotBand - yourBand >= PULL_IN_BANDS;
}
