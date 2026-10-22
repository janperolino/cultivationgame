// A place's footprint on the map (Jan's playtest after S1): the land its art covers, larger than
// life as A5.3 draws it, so nothing of yours (a hut, a cave abode) is ever claimed on a city's or a
// sect's picture. A place painted into the land (tools/map-place.ts) has the box its glow says it
// covers, baked into art/map/<region>/places.json; a town, city or power drawn as a piece covers
// the middle of its piece (ui/map/draw.ts fades a piece out from 70% of the way to its edge).
import bianhuang from '../../../art/map/qm-bianhuang/places.json';
import type { MapPlace } from './region.ts';

/** Each painted region's places.json; a newly painted region adds its file here. */
const PAINTED_FILES: readonly { places: readonly { id: string; foot?: readonly number[] }[] }[] = [
  bianhuang,
];

/** The painted places' footprints, [x0, y0, x1, y1] in li, by place id. */
const PAINTED_FEET = new Map<string, readonly number[]>(
  PAINTED_FILES.flatMap((f) => f.places.flatMap((p) => (p.foot ? [[p.id, p.foot] as const] : []))),
);

/**
 * A piece's width on the map, in li: a city's or a famous place's widest, a site's least. Larger
 * than life, as the painting draws its peaks (Jan's call in A5.3: readable, not the lore's size).
 */
export function pieceLi(q: MapPlace): number {
  if (q.sub === 'city') return 2400;
  if (q.kind === 'atlas') return 2000;
  if (q.sub === 'town') return 1700;
  return 1000;
}

/** How much of a piece's width its drawing covers: the solid middle, inside its faded rim. */
const PIECE_SOLID = 0.7;

/** How far a place's drawing reaches from its pin, in li, its footprint's half-width; 0 for a seal. */
export function footprintLi(q: MapPlace): number {
  const foot = PAINTED_FEET.get(q.id);
  if (foot) return Math.min(foot[2]! - foot[0]!, foot[3]! - foot[1]!) / 2;
  if (q.kind === 'site' || q.kind === 'heart') return 0;
  return (pieceLi(q) / 2) * PIECE_SOLID;
}

/** Whether a spot lies on a place's drawn footprint; a site drawn as a seal has none. */
export function onFootprint(q: MapPlace, at: readonly [number, number]): boolean {
  const foot = PAINTED_FEET.get(q.id);
  if (foot) return at[0] >= foot[0]! && at[0] <= foot[2]! && at[1] >= foot[1]! && at[1] <= foot[3]!;
  if (q.kind === 'site' || q.kind === 'heart') return false;
  return Math.hypot(q.x - at[0], q.y - at[1]) <= (pieceLi(q) / 2) * PIECE_SOLID;
}
