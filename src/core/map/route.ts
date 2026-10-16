// Routing (design § The world, Going somewhere): along the roads where they serve and cross-country
// where they don't, the cheapest way by time. Off the road the terrain slows you; a flyer goes
// straight over it. The night road keeps off the roads; caravan guards keep to them.
import { OFFROAD_FACTOR } from '../../content/map/travel.ts';
import { densify, lineLength, type Pt } from './geometry.ts';
import { inRegion, onLand, placeById, terrainAt, type MapRoad, type RegionMap } from './region.ts';

export interface RouteOptions {
  /** Keep off the roads (the night road). */
  hidden?: boolean;
  /** Keep to the roads (caravan guard): cross-country only to reach one and to leave it. */
  roadsOnly?: boolean;
  /** Over the land, never slowed by it. */
  flies?: boolean;
}

export interface Route {
  pts: Pt[];
  roadLi: number;
  crossLi: number;
  /** Cross-country li as road li: what the terrain made of them. */
  crossCost: number;
  /** The checkpoints on the roads it takes. */
  tolls: string[];
}

export type RouteResult = { ok: true; route: Route } | { ok: false; reason: string };

/** Your pace off the road on a stretch, as a share of the road's: the harmonic mean over its terrain. */
export function crossFactor(map: RegionMap, a: Pt, b: Pt): number {
  const n = Math.max(4, Math.min(24, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1500)));
  let s = 0;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const tr = terrainAt(map, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    if (tr === 'sea') return 0;
    s += 1 / (OFFROAD_FACTOR[tr] ?? 0.5);
  }
  return n / s;
}

interface Edge {
  to: string;
  cost: number;
  li: number;
  road: MapRoad | null;
}

/** The cheapest way from one spot to another inside the region. */
export function planRoute(map: RegionMap, from: Pt, to: Pt, opts: RouteOptions = {}): RouteResult {
  if (!inRegion(map, to))
    return { ok: false, reason: 'That lies past the region’s edge: long travel is M6’s.' };
  if (!onLand(map, to))
    return { ok: false, reason: 'That is open sea. The low-tide chain needs a smuggler.' };
  const pos = new Map<string, Pt>([
    ['start', from],
    ['end', to],
  ]);
  const useRoads = !opts.hidden && !opts.flies;
  if (useRoads)
    for (const r of map.roads)
      for (const id of [r.a, r.b]) {
        const p = placeById(map, id);
        if (p) pos.set(id, [p.x, p.y]);
      }
  const edges = new Map<string, Edge[]>([...pos.keys()].map((k) => [k, []]));
  const cross = (a: string, b: string) => {
    const A = pos.get(a)!;
    const B = pos.get(b)!;
    const li = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const f = opts.flies ? 1 : crossFactor(map, A, B);
    if (!f) return;
    edges.get(a)!.push({ to: b, cost: li / f, li, road: null });
    edges.get(b)!.push({ to: a, cost: li / f, li, road: null });
  };
  if (!opts.roadsOnly) cross('start', 'end');
  if (useRoads) {
    for (const n of pos.keys()) {
      if (n === 'start' || n === 'end') continue;
      cross('start', n);
      cross(n, 'end');
    }
    for (const r of map.roads) {
      if (!edges.has(r.a) || !edges.has(r.b)) continue;
      edges.get(r.a)!.push({ to: r.b, cost: r.li, li: r.li, road: r });
      edges.get(r.b)!.push({ to: r.a, cost: r.li, li: r.li, road: r });
    }
  }
  const dist = new Map<string, number>([...pos.keys()].map((k) => [k, Infinity]));
  const prev = new Map<string, { from: string; e: Edge }>();
  dist.set('start', 0);
  const open = new Set(pos.keys());
  while (open.size) {
    let u: string | null = null;
    for (const n of open) if (u === null || dist.get(n)! < dist.get(u)!) u = n;
    if (u === null) break;
    open.delete(u);
    if (u === 'end' || dist.get(u) === Infinity) break;
    for (const e of edges.get(u)!) {
      const d = dist.get(u)! + e.cost;
      if (d < dist.get(e.to)!) {
        dist.set(e.to, d);
        prev.set(e.to, { from: u, e });
      }
    }
  }
  if (!prev.has('end')) return { ok: false, reason: 'There is no way there over land.' };
  const legs: { from: string; to: string; e: Edge }[] = [];
  for (let cur = 'end'; cur !== 'start';) {
    const { from: f, e } = prev.get(cur)!;
    legs.unshift({ from: f, to: cur, e });
    cur = f;
  }
  const pts: Pt[] = [];
  let roadLi = 0;
  let crossLi = 0;
  let crossCost = 0;
  const tolls: string[] = [];
  for (const L of legs) {
    let seg: readonly Pt[];
    if (L.e.road) {
      seg = L.e.road.a === L.from ? L.e.road.pts : [...L.e.road.pts].reverse();
      roadLi += L.e.li;
      for (const p of map.places)
        if (p.sub === 'checkpoint' && p.road === L.e.road.id && !tolls.includes(p.id))
          tolls.push(p.id);
    } else {
      seg = [pos.get(L.from)!, pos.get(L.to)!];
      crossLi += L.e.li;
      crossCost += L.e.cost;
    }
    pts.push(...(pts.length ? seg.slice(1) : seg));
  }
  return { ok: true, route: { pts: densify(pts, 60), roadLi, crossLi, crossCost, tolls } };
}

/** The li along a route from its point `at` to its end. */
export function liLeft(pts: readonly Pt[], at: number, here: Pt): number {
  return lineLength([here, ...pts.slice(at)]);
}
