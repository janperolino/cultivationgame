// Hidden veins and geomancy (design § Sites and formations; K9's talk). Bare land seeds hidden local
// veins with the world, about three to each wild tract and one to each kingdom (Jan's call: three
// times as thick in undeveloped land), most at tier 1 and one in six a tier above the region's.
// They are seeded from the world and the region's id on their own stream, so they never move another
// system's rolls, and every life in the slot finds the same ones. Nothing finds a vein but geomancy
// 堪舆: your soul's band and a band for each Earth Dao tier held, against the vein's rating (the
// land's band at its spot and its tier), a comparison and no roll.
import { GEOMANCY, VEINS } from '../../content/dwellings.ts';
import { realmIndex } from '../../content/realms.ts';
import { SENSE_STEP } from '../../content/farming.ts';
import { daoTiers } from '../combat/combatant.ts';
import { hashSeed, mulberry32 } from '../rng.ts';
import type { Cultivator } from '../state.ts';
import { bandAt, bandOfRealm } from './depth.ts';
import { bboxOf, inMulti, type Pt } from './geometry.ts';
import { gatherLines } from './gather.ts';
import { areaAt, onLand, type MapArea, type RegionMap } from './region.ts';
import type { MapLife } from './schema.ts';

export interface Vein {
  id: string;
  x: number;
  y: number;
  area: string;
  tier: number;
  /** The band a geomancer's reading must reach to find it. */
  rating: number;
}

/** Seeded once a region and world: what a life builds on the land never moves them. */
const SEEDED = new Map<string, Vein[]>();

/** The region's own vein tier, which a rich vein stands a tier above. */
export const REGION_VEIN = 1;

/** The hidden veins of a region in a world: seeded once, the same for every life in the slot. */
export function veinsOf(map: RegionMap, world: string): Vein[] {
  const key = `${world}/${map.id}`;
  const kept = SEEDED.get(key);
  if (kept) return kept;
  const rng = mulberry32(hashSeed(`${world}/${map.id}/veins`));
  // The world's own places, not the sites lives made (K9), which stand on the veins themselves.
  const taken: Pt[] = map.places.filter((p) => !p.id.startsWith('made:')).map((p) => [p.x, p.y]);
  const out: Vein[] = [];
  const seedIn = (a: MapArea, n: number) => {
    const box = bboxOf(a.outline.map((poly) => poly[0]!));
    let made = 0;
    for (let guard = 0; made < n && guard < 400; guard++) {
      const p: Pt = [box[0] + rng() * (box[2] - box[0]), box[1] + rng() * (box[3] - box[1])];
      if (!inMulti(p, a.outline) || !onLand(map, p) || areaAt(map, p)?.id !== a.id) continue;
      if (taken.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < VEINS.spacing)) continue;
      const tier = REGION_VEIN + (rng() < VEINS.richShare ? 1 : 0);
      const x = Math.round(p[0]);
      const y = Math.round(p[1]);
      out.push({ id: `${a.id}:vein:${made}`, x, y, area: a.id, tier, rating: 0 });
      taken.push(p);
      made++;
    }
  };
  for (const a of map.areas) {
    if (a.kind === 'tract') seedIn(a, VEINS.perTract);
    else if (a.kind === 'kingdom') seedIn(a, VEINS.perKingdom);
  }
  for (const v of out) v.rating = Math.max(0, bandAt(map, [v.x, v.y])) + v.tier;
  SEEDED.set(key, out);
  return out;
}

export function veinById(map: RegionMap, world: string, id: string): Vein | null {
  return veinsOf(map, world).find((v) => v.id === id) ?? null;
}

/** A geomancer's reading: your soul's band, and a band for each Earth Dao tier you hold. */
export function geomancyOf(c: Cultivator): number {
  return bandOfRealm(c.soul.realm, c.soul.stage) + (daoTiers(c).earth ?? 0);
}

/** How far a reading reaches: 60 li, ×3 a soul realm from Foundation's divine sense. */
export function geomancyLi(c: Cultivator): number {
  return GEOMANCY.li * SENSE_STEP ** realmIndex(c.soul.realm);
}

export interface Reading {
  life: MapLife;
  /** Veins read within reach, now on the map. */
  found: Vein[];
  /** The nearest vein past your reading or your reach, marked as a rumor ring. */
  hint: Vein | null;
  /** What the land grows where you stand. */
  lines: string[];
}

export const veinsKnown = (life: MapLife): readonly string[] => life.veins ?? [];

/**
 * Reads the land where you stand: every vein within reach your reading meets is found, and the
 * nearest one still hidden within 600 li is marked as a ring to walk to. Once a day (`read`).
 */
export function readLand(
  map: RegionMap,
  world: string,
  life: MapLife,
  c: Cultivator,
  day: number,
): Reading {
  const reading = geomancyOf(c);
  const reach = geomancyLi(c);
  const at = life.at;
  const known = new Set(veinsKnown(life));
  const found: Vein[] = [];
  let hint: Vein | null = null;
  let hintLi = Infinity;
  for (const v of veinsOf(map, world)) {
    if (known.has(v.id)) continue;
    const li = Math.hypot(v.x - at[0], v.y - at[1]);
    if (li <= reach && reading >= v.rating) {
      found.push(v);
      continue;
    }
    if (li <= GEOMANCY.hintLi && li < hintLi && !life.veinRings?.[v.id]) {
      hint = v;
      hintLi = li;
    }
  }
  const veins = [...known, ...found.map((v) => v.id)];
  const rings = { ...life.veinRings };
  for (const v of found) delete rings[v.id];
  if (hint) {
    // The ring's centre is seeded from the vein, so it lies near and never on it.
    const r = mulberry32(hashSeed(`vein-ring:${hint.id}`));
    const a = r() * Math.PI * 2;
    const d = r() * 400;
    rings[hint.id] = [Math.round(hint.x + Math.cos(a) * d), Math.round(hint.y + Math.sin(a) * d)];
  }
  return {
    life: { ...life, veins, veinRings: rings, read: { day, at: [at[0], at[1]] } },
    found,
    hint,
    lines: gatherLines(map, at),
  };
}

/** Whether you have read the land today where you stand. */
export function readToday(life: MapLife, day: number): boolean {
  const r = life.read;
  return (
    !!r && Math.floor(r.day) === Math.floor(day) && r.at[0] === life.at[0] && r.at[1] === life.at[1]
  );
}
