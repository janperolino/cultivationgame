// A region on the travel map (design § The world, The travel map and The fog): the atlas's outline
// and places, the towns and roads written below it, and what the world seeds once and keeps in the
// save: the wild tracts' cells, the wild sites, the hearts, the roads' bends and the checkpoints.
// Generation reads only the region's data and the world's id, so every life in a slot finds the
// same places, and a region is built the same way whatever its content.
import { possessive } from '../../content/words.ts';
import { regionData, type RegionData, type RegionPlace } from '../../content/map/index.ts';
import { shopsAt } from '../../content/shops.ts';
import {
  BANDS,
  HEART_BASE_RINGS,
  HEART_LARGE_TRACT,
  HEART_MID_TRACT,
  HEART_MIN_LI,
  HEART_SPACING_LI,
  HIDDEN_SHARE,
  SITE_SPACING_LI,
  SITES_PER_AREA,
} from '../../content/map/travel.ts';
import {
  HEART_NAMES,
  PLACE_SEAL,
  SITE_FEATURES,
  SITE_SEAL,
  WILD_SITES,
  type FeatureTag,
  type SiteKind,
} from '../../content/map/sites.ts';
import { hashSeed, mulberry32 } from '../rng.ts';
import {
  bboxOf,
  densify,
  inMulti,
  inRing,
  lineLength,
  ringArea,
  ringCentroid,
  voronoiCell,
  type Multi,
  type Pt,
} from './geometry.ts';

// ---------------------------------------------------------------- what the save keeps

export interface GenTract {
  id: string;
  name: string;
  hanzi: string;
  terrain: string;
  seed: [number, number];
  cell: [number, number][];
}

export interface GenSite {
  id: string;
  sub: SiteKind;
  name: string;
  x: number;
  y: number;
  /** The area it stands in: a kingdom, a forbidden land or a tract. */
  area: string | null;
  terrain: string;
  hidden: boolean;
  /** The band a soul must reach to find it when hidden. */
  rating: number;
  features: { name: string; tags: FeatureTag[] }[];
  /** A checkpoint's road and the kingdom it guards. */
  road?: string;
  guards?: string;
}

export interface GenHeart {
  id: string;
  name: string;
  hanzi: string;
  x: number;
  y: number;
  area: string;
  /** A seeded heart's rings above the land's edge, before qi density adds to them. */
  rings: number;
  /** A named heart's band, fixed by the atlas. */
  fixedBand: number | null;
}

export interface GenRoad {
  id: string;
  a: string;
  b: string;
  pts: [number, number][];
}

export interface RegionGen {
  version: 1;
  region: string;
  tracts: GenTract[];
  roads: GenRoad[];
  sites: GenSite[];
  hearts: GenHeart[];
}

// ---------------------------------------------------------------- the built map

export type AreaKind = 'kingdom' | 'forbidden' | 'tract';

export interface MapArea {
  id: string;
  kind: AreaKind;
  name: string;
  hanzi: string;
  terrain: string;
  outline: Multi;
  qiDensity: number;
  /** Its own hazard: a forbidden land's top realm. */
  top: string | null;
  famous: boolean;
  lore: string;
}

export type PlaceKind = 'atlas' | 'town' | 'site' | 'heart';

export interface MapPlace {
  id: string;
  kind: PlaceKind;
  /** The atlas kind (city, power, landmark, realm) or the site's sub-kind. */
  sub: string;
  name: string;
  /** Its pinyin, as flavor under the English name; empty for a seeded site. */
  pinyin: string;
  hanzi: string;
  seal: string;
  x: number;
  y: number;
  area: string | null;
  terrain: string;
  hidden: boolean;
  rating: number;
  famous: boolean;
  lore: string;
  top: string | null;
  /** Gated by an access (a sect's gate, a secret realm). */
  gated: boolean;
  /** P3.5's shops standing here. */
  shops: readonly string[];
  features: readonly { name: string; tags: readonly string[] }[];
  /** A town or a place people live and travel from: depth is measured from these and the roads. */
  settled: boolean;
  road?: string;
  guards?: string;
}

export interface MapRoad {
  id: string;
  a: string;
  b: string;
  pts: readonly Pt[];
  li: number;
}

export interface RegionMap {
  id: string;
  name: string;
  hanzi: string;
  terrain: string;
  qiDensity: number;
  outline: Multi;
  land: Multi;
  bbox: readonly [number, number, number, number];
  areas: readonly MapArea[];
  places: readonly MapPlace[];
  roads: readonly MapRoad[];
  hearts: readonly GenHeart[];
  tracts: readonly GenTract[];
  byId: ReadonlyMap<string, MapPlace | MapArea>;
  gen: RegionGen;
}

// ---------------------------------------------------------------- reading a spot

export function inRegion(map: RegionMap, p: Pt): boolean {
  return inMulti(p, map.outline);
}

export function onLand(map: RegionMap, p: Pt): boolean {
  return inMulti(p, map.land);
}

/** The kingdom or forbidden land at a spot, if any. */
export function atlasAreaAt(map: RegionMap, p: Pt): MapArea | null {
  for (const a of map.areas) if (a.kind !== 'tract' && inMulti(p, a.outline)) return a;
  return null;
}

/** The area a spot is in: a kingdom or forbidden land first, else the tract of wilds. */
export function areaAt(map: RegionMap, p: Pt): MapArea | null {
  const a = atlasAreaAt(map, p);
  if (a) return a;
  if (!inRegion(map, p)) return null;
  let best: GenTract | null = null;
  let bd = Infinity;
  for (const t of map.tracts) {
    const d = Math.hypot(t.seed[0] - p[0], t.seed[1] - p[1]);
    if (d < bd) {
      bd = d;
      best = t;
    }
  }
  return best ? (map.byId.get(best.id) as MapArea) : null;
}

/** The terrain under a spot: its area's, the region's in the open, `sea` off the land. */
export function terrainAt(map: RegionMap, p: Pt): string {
  if (!onLand(map, p)) return 'sea';
  return areaAt(map, p)?.terrain ?? map.terrain;
}

export function placeById(map: RegionMap, id: string): MapPlace | undefined {
  const x = map.byId.get(id);
  return x && 'seal' in x ? x : undefined;
}

export function areaById(map: RegionMap, id: string): MapArea | undefined {
  const x = map.byId.get(id);
  return x && 'outline' in x ? x : undefined;
}

// ---------------------------------------------------------------- building

const atlasPlace = (p: RegionPlace, shops: readonly string[]): MapPlace | null => {
  if (p.x === null || p.y === null || p.outline) return null;
  return {
    id: p.id,
    kind: 'atlas',
    sub: p.kind,
    name: p.name,
    pinyin: p.pinyin,
    hanzi: p.hanzi,
    seal: PLACE_SEAL[p.kind] ?? '·',
    x: p.x,
    y: p.y,
    area: null,
    terrain: p.terrain ?? 'plains',
    hidden: p.hidden !== null && p.hidden !== false,
    rating: p.hidden === true ? 0 : 3,
    famous: p.famous,
    lore: plainLore(p.lore),
    top: p.top,
    gated: p.access !== null,
    shops,
    features: p.features,
    settled: p.kind === 'city',
  };
};

function buildFrom(data: RegionData, gen: RegionGen): RegionMap {
  const { file, content } = data;
  const areas: MapArea[] = [];
  for (const p of file.places) {
    if (!p.outline || (p.kind !== 'kingdom' && p.kind !== 'forbidden')) continue;
    areas.push({
      id: p.id,
      kind: p.kind,
      name: p.name,
      hanzi: p.hanzi,
      terrain: p.terrain ?? file.terrain,
      outline: p.outline as Multi,
      qiDensity: p.qiDensity ?? file.qiDensity,
      top: p.kind === 'forbidden' ? p.top : null,
      famous: p.famous,
      lore: plainLore(p.lore),
    });
  }
  for (const t of gen.tracts)
    areas.push({
      id: t.id,
      kind: 'tract',
      name: t.name,
      hanzi: t.hanzi,
      terrain: t.terrain,
      outline: [[t.cell]],
      qiDensity: file.qiDensity,
      top: null,
      famous: false,
      lore: '',
    });
  const places: MapPlace[] = [];
  for (const p of file.places) {
    const mp = atlasPlace(p, shopsAt(p.id));
    if (mp) places.push(mp);
  }
  for (const t of content.towns)
    places.push({
      id: t.id,
      kind: 'town',
      sub: t.sub,
      name: t.name,
      pinyin: t.pinyin,
      hanzi: t.hanzi,
      seal: SITE_SEAL[t.sub],
      x: t.x,
      y: t.y,
      area: t.parent,
      terrain: '',
      hidden: false,
      rating: 0,
      famous: false,
      lore: t.lore,
      top: null,
      gated: false,
      shops: shopsAt(t.id),
      features: t.features,
      settled: true,
    });
  for (const s of gen.sites)
    places.push({
      id: s.id,
      kind: 'site',
      sub: s.sub,
      name: s.name,
      pinyin: '',
      hanzi: SITE_SEAL[s.sub],
      seal: SITE_SEAL[s.sub],
      x: s.x,
      y: s.y,
      area: s.area,
      terrain: s.terrain,
      hidden: s.hidden,
      rating: s.rating,
      famous: false,
      lore: '',
      top: null,
      gated: false,
      shops: [],
      features: s.features,
      // A seeded hamlet is a wild site: depth is measured from the written towns and the roads.
      settled: false,
      road: s.road,
      guards: s.guards,
    });
  for (const h of gen.hearts)
    places.push({
      id: h.id,
      kind: 'heart',
      sub: 'heart',
      name: h.name,
      pinyin: '',
      hanzi: h.hanzi,
      seal: SITE_SEAL.heart,
      x: h.x,
      y: h.y,
      area: h.area,
      terrain: '',
      hidden: false,
      rating: 0,
      famous: false,
      lore: 'A heart of the wild: what rules it dens here, and the rings count up to it.',
      top: null,
      gated: false,
      shops: [],
      features: SITE_FEATURES.heart ?? [],
      settled: false,
    });
  const roads = gen.roads.map((r) => ({ ...r, li: lineLength(r.pts) }));
  const byId = new Map<string, MapPlace | MapArea>();
  for (const a of areas) byId.set(a.id, a);
  for (const p of places) byId.set(p.id, p);
  const map: RegionMap = {
    id: file.id,
    name: file.name,
    hanzi: file.hanzi,
    terrain: file.terrain,
    qiDensity: file.qiDensity,
    outline: file.outline as Multi,
    land: file.land as Multi,
    bbox: bboxOf((file.outline as Multi).map((poly) => poly[0]!)),
    areas,
    places,
    roads,
    hearts: gen.hearts,
    tracts: gen.tracts,
    byId,
    gen,
  };
  // Towns take the terrain under them once the map can read it.
  for (const p of places) if (!p.terrain) p.terrain = terrainAt(map, [p.x, p.y]);
  return map;
}

const BUILT = new WeakMap<RegionGen, RegionMap>();

/** The region's map from its kept generation; built once per generation. */
export function regionMap(gen: RegionGen): RegionMap {
  const cached = BUILT.get(gen);
  if (cached) return cached;
  const data = regionData(gen.region);
  if (!data) throw new Error(`No map for region ${gen.region}`);
  const map = buildFrom(data, gen);
  BUILT.set(gen, map);
  return map;
}

// ---------------------------------------------------------------- generating

/** Where a written town or an atlas place stands. */
function anchorOf(data: RegionData, id: string): Pt {
  const t = data.content.towns.find((x) => x.id === id);
  if (t) return [t.x, t.y];
  const p = data.file.places.find((x) => x.id === id);
  if (p && p.x !== null && p.y !== null) return [p.x, p.y];
  throw new Error(`${data.file.id}: no place ${id} for a road`);
}

/** A road between two places, its bends seeded from their ids. */
function bendRoad(a: Pt, b: Pt, seed: number): [number, number][] {
  const rng = mulberry32(seed);
  let pts: Pt[] = [a, b];
  for (let pass = 0; pass < 4; pass++) {
    const next: Pt[] = [pts[0]!];
    for (let j = 1; j < pts.length; j++) {
      const p = pts[j - 1]!;
      const q = pts[j]!;
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
      const nx = -(q[1] - p[1]) / len;
      const ny = (q[0] - p[0]) / len;
      const off = (rng() - 0.5) * len * 0.22;
      next.push([(p[0] + q[0]) / 2 + nx * off, (p[1] + q[1]) / 2 + ny * off], q);
    }
    pts = next;
  }
  return pts.map(([x, y]) => [Math.round(x), Math.round(y)]);
}

const short = (name: string) => name.replace(/^(The |Kingdom of |March of )/, '');

/**
 * Seeds a region's wilds for a world (`world` is the lineage's id): its tracts' cells, roads'
 * bends, checkpoints, hearts and wild sites, in that order. The same world and region always give
 * the same places. The tracts' cells, and so the land's terrain, are the region's own and the same
 * in every world (A5, Jan's call), seeded by the region's `landSeed`, since the map's painting is
 * of one land; what stands on it varies by world.
 */
export function generateRegion(regionId: string, world: string): RegionGen {
  const data = regionData(regionId);
  if (!data) throw new Error(`No map for region ${regionId}`);
  const { file, content } = data;
  const outline = file.outline as Multi;
  const box = bboxOf(outline.map((poly) => poly[0]!));
  const kingdoms = file.places.filter(
    (p) => p.outline && (p.kind === 'kingdom' || p.kind === 'forbidden'),
  );
  const inAtlasArea = (p: Pt) => kingdoms.some((k) => inMulti(p, k.outline as Multi));
  const seedOf = (what: string) => hashSeed(`${world}/${regionId}/${what}`);

  // Tracts: one cell to each written name, the wet names to the cells nearest the sea.
  const rt = mulberry32(hashSeed(`${content.landSeed}/${regionId}/tracts`));
  const seeds: Pt[] = [];
  const spacing = Math.sqrt(((box[2] - box[0]) * (box[3] - box[1])) / content.tracts.length) * 0.55;
  for (let guard = 0; seeds.length < content.tracts.length && guard < 20000; guard++) {
    const p: Pt = [box[0] + rt() * (box[2] - box[0]), box[1] + rt() * (box[3] - box[1])];
    if (!inMulti(p, outline)) continue;
    const near = guard < 15000 ? spacing : spacing * 0.5;
    if (seeds.some((s) => Math.hypot(s[0] - p[0], s[1] - p[1]) < near)) continue;
    seeds.push(p);
  }
  const coastRings = (file.land as Multi).flatMap((poly) => poly);
  const seaLi = (p: Pt) => {
    let d = Infinity;
    for (const r of coastRings)
      for (let i = 0; i < r.length; i += 2)
        d = Math.min(d, Math.hypot(r[i]![0] - p[0], r[i]![1] - p[1]));
    return d;
  };
  const order = seeds.map((s, i) => [seaLi(s), i] as const).sort((a, b) => a[0] - b[0]);
  const wet = content.tracts.filter((t) => t.terrain === 'coast' || t.terrain === 'marsh');
  const dry = content.tracts.filter((t) => t.terrain !== 'coast' && t.terrain !== 'marsh');
  const named: (typeof content.tracts)[number][] = [];
  order.forEach(([, si], rank) => {
    named[si] = rank < wet.length ? wet[rank]! : dry[rank - wet.length]!;
  });
  const tracts: GenTract[] = seeds.map((s, i) => ({
    id: `${regionId}:tract:${i}`,
    name: named[i]!.name,
    hanzi: named[i]!.hanzi,
    terrain: named[i]!.terrain,
    seed: [Math.round(s[0]), Math.round(s[1])],
    cell: voronoiCell(seeds, i, [box[0] - 2000, box[1] - 2000, box[2] + 2000, box[3] + 2000]).map(
      ([x, y]) => [Math.round(x), Math.round(y)] as [number, number],
    ),
  }));
  const tractAt = (p: Pt) => {
    let best = -1;
    let bd = Infinity;
    seeds.forEach((s, i) => {
      const d = Math.hypot(s[0] - p[0], s[1] - p[1]);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return tracts[best]!;
  };

  // Roads, and a checkpoint where one crosses into a kingdom.
  const roads: GenRoad[] = content.roads.map(([a, b], i) => ({
    id: `${regionId}:road:${i}`,
    a,
    b,
    pts: bendRoad(anchorOf(data, a), anchorOf(data, b), hashSeed(`${a}|${b}`)),
  }));
  const sites: GenSite[] = [];
  const kingdomAt = (p: Pt) =>
    file.places.find((k) => k.kind === 'kingdom' && k.outline && inMulti(p, k.outline as Multi));
  for (const r of roads) {
    for (let j = 1; j < r.pts.length; j++) {
      const k0 = kingdomAt(r.pts[j - 1]!);
      const k1 = kingdomAt(r.pts[j]!);
      if (k0 === k1) continue;
      const inside = k1 ? r.pts[j]! : r.pts[j - 1]!;
      const k = (k1 ?? k0)!;
      sites.push({
        id: `${r.id}:post:${j}`,
        sub: 'checkpoint',
        name: `${possessive(short(k.name), '’')} border post`,
        x: inside[0],
        y: inside[1],
        area: k.id,
        terrain: k.terrain ?? file.terrain,
        hidden: false,
        rating: 0,
        features: [...(SITE_FEATURES.checkpoint ?? [])],
        road: r.id,
        guards: k.id,
      });
    }
  }

  // Distance from people: the roads and every settled place.
  const anchors: Pt[] = [];
  for (const r of roads) anchors.push(...densify(r.pts, 500));
  for (const t of content.towns) anchors.push([t.x, t.y]);
  for (const p of file.places)
    if (p.kind === 'city' && p.x !== null && p.y !== null) anchors.push([p.x, p.y]);
  const peopleLi = (p: Pt) => {
    let d = Infinity;
    for (const q of anchors) d = Math.min(d, Math.hypot(q[0] - p[0], q[1] - p[1]));
    return d;
  };

  // Hearts: one or two to a tract by its size, and one to each forbidden land, named by the atlas.
  const rh = mulberry32(seedOf('hearts'));
  const hearts: GenHeart[] = [];
  const tractArea = (t: GenTract) => {
    const [x0, y0, x1, y1] = bboxOf([t.cell]);
    let inside = 0;
    const n = 200;
    for (let k = 0; k < n; k++) {
      const p: Pt = [x0 + rh() * (x1 - x0), y0 + rh() * (y1 - y0)];
      if (inRing(p, t.cell) && inMulti(p, outline) && !inAtlasArea(p)) inside++;
    }
    return ringArea(t.cell) * (inside / n);
  };
  for (const t of tracts) {
    const area = tractArea(t);
    const n = area > HEART_LARGE_TRACT ? 2 : 1;
    const [x0, y0, x1, y1] = bboxOf([t.cell]);
    for (let j = 0; j < n; j++) {
      let best: { s: number; p: Pt } | null = null;
      for (let k = 0; k < 80; k++) {
        const p: Pt = [x0 + rh() * (x1 - x0), y0 + rh() * (y1 - y0)];
        if (!inRing(p, t.cell) || !inMulti(p, outline) || inAtlasArea(p)) continue;
        if (hearts.some((h) => Math.hypot(h.x - p[0], h.y - p[1]) < HEART_SPACING_LI)) continue;
        const s = peopleLi(p) + rh() * 1500;
        if (!best || s > best.s) best = { s, p };
      }
      if (!best || peopleLi(best.p) < HEART_MIN_LI) continue;
      const rings =
        HEART_BASE_RINGS +
        (area > HEART_LARGE_TRACT ? 2 : area > HEART_MID_TRACT ? 1 : 0) +
        (rh() < 0.5 ? 0 : 1);
      const [name, hanzi] = HEART_NAMES_FOR(t.terrain);
      hearts.push({
        id: `${regionId}:heart:${hearts.length}`,
        name: n > 1 ? `${name}, ${j ? 'east' : 'west'}` : name,
        hanzi,
        x: Math.round(best.p[0]),
        y: Math.round(best.p[1]),
        area: t.id,
        rings,
        fixedBand: null,
      });
    }
  }
  for (const f of file.places) {
    if (f.kind !== 'forbidden' || !f.outline) continue;
    const c = ringCentroid((f.outline as Multi)[0]![0]!);
    const [name, hanzi] = content.namedHearts[f.id] ?? [`the heart of ${f.name}`, '王'];
    hearts.push({
      id: `${regionId}:heart:${hearts.length}`,
      name,
      hanzi,
      x: Math.round(c[0]),
      y: Math.round(c[1]),
      area: f.id,
      rings: 0,
      fixedBand: firstBandOf(f.top),
    });
  }

  // Wild sites, by each area's terrain.
  const rs = mulberry32(seedOf('sites'));
  const taken: Pt[] = content.towns.map((t) => [t.x, t.y] as Pt);
  for (const p of file.places) if (p.x !== null && p.y !== null) taken.push([p.x, p.y]);
  for (const h of hearts) taken.push([h.x, h.y]);
  const placeIn = (
    areaId: string,
    terrain: string,
    contains: (p: Pt) => boolean,
    bb: number[],
    bandAtSpot: (p: Pt) => number,
  ) => {
    let made = 0;
    for (let guard = 0; made < SITES_PER_AREA && guard < 600; guard++) {
      const p: Pt = [bb[0]! + rs() * (bb[2]! - bb[0]!), bb[1]! + rs() * (bb[3]! - bb[1]!)];
      if (!contains(p)) continue;
      if (taken.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < SITE_SPACING_LI)) continue;
      const table = WILD_SITES[terrain] ?? WILD_SITES.karst!;
      const [sub, name] = table[Math.floor(rs() * table.length)]!;
      const hidden = sub !== 'village' && rs() < HIDDEN_SHARE;
      sites.push({
        id: `${areaId}:site:${made}`,
        sub,
        name: name[0]!.toUpperCase() + name.slice(1),
        x: Math.round(p[0]),
        y: Math.round(p[1]),
        area: areaId,
        terrain,
        hidden,
        rating: hidden ? Math.max(0, bandAtSpot(p)) : 0,
        features: [...(SITE_FEATURES[sub] ?? [])],
      });
      taken.push(p);
      made++;
    }
  };
  // A hidden site's rough rating, the edge's band plus a ring away from people; the fog reads it
  // as never less than the ground's own band where the site stands (fog.ts, siteRating).
  const edge = file.qiDensity - 3;
  const roughBand = (p: Pt) => edge + (peopleLi(p) > 1500 ? 1 : 0);
  for (const k of file.places) {
    if (k.kind !== 'kingdom' || !k.outline) continue;
    const m = k.outline as Multi;
    placeIn(
      k.id,
      k.terrain ?? file.terrain,
      (p) => inMulti(p, m) && inMulti(p, outline),
      bboxOf(m.map((poly) => poly[0]!)),
      roughBand,
    );
  }
  for (const t of tracts)
    placeIn(
      t.id,
      t.terrain,
      (p) => inRing(p, t.cell) && inMulti(p, outline) && !inAtlasArea(p) && tractAt(p) === t,
      bboxOf([t.cell]),
      roughBand,
    );

  return { version: 1, region: regionId, tracts, roads, sites, hearts };
}

/** The first band of a realm (its early third), from the atlas's top realm; Qi Condensation's is 0. */
export function firstBandOf(realm: string): number {
  return Math.max(
    0,
    BANDS.findIndex((b) => b.realm === realm),
  );
}

function HEART_NAMES_FOR(terrain: string): readonly [string, string] {
  return HEART_NAMES[terrain] ?? HEART_NAMES.karst!;
}

/** Atlas lore for the map: its [[links]] read as plain names (the checkpoint's small words). */
export function plainLore(t: string): string {
  return t.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, a: string, b?: string) => b ?? a);
}
