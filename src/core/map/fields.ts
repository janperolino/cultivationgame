// Spirit farming on the map (K8): a plot is held at a written village or town (cities have none),
// and you plant, harvest and tend it only while you stand there with no course set. The land and
// qi density it lies on are read where the place stands.
import type { PlotSpot } from '../farming.ts';
import type { GameState } from '../state.ts';
import { qiAt } from './depth.ts';
import { placeKindOf, standsAt } from './gate.ts';
import { terrainAt, type MapPlace } from './region.ts';
import { mapOf } from './travel.ts';

/** A place that rents plots: a written village or town. */
export function farmsAt(p: MapPlace): boolean {
  const k = placeKindOf(p);
  return k === 'village' || k === 'town';
}

/** Where a plot would lie at a place: its land and the qi density there. */
export function plotSpot(s: GameState, p: MapPlace): PlotSpot | null {
  const map = mapOf(s);
  if (!map || !farmsAt(p)) return null;
  return { place: p.id, land: terrainAt(map, [p.x, p.y]), density: qiAt(map, [p.x, p.y]) };
}

/** The farming place you stand at, with no course set, or null. */
export function farmHere(s: GameState): (PlotSpot & { name: string }) | null {
  if (!s.map || s.map.course) return null;
  const map = mapOf(s);
  if (!map) return null;
  for (const p of map.places) {
    if (!farmsAt(p) || !standsAt(s, p)) continue;
    const spot = plotSpot(s, p);
    if (spot) return { ...spot, name: p.name };
  }
  return null;
}

/** A plot's place by name, for the page and the chronicle. */
export function plotPlaceName(s: GameState, place: string): string {
  const map = mapOf(s);
  return map?.places.find((p) => p.id === place)?.name ?? place;
}
