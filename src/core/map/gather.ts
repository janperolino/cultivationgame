// The gather hour 采 (O4; Jan's call after A5.1): an hour of the road wheel spent searching the
// land where you stand, in place of the stances gathering as you walk. You stop for the hour and
// gain nothing on the wheel. What it finds is what the land grows there (its terrain's herb,
// material and staple lines); how much is the land's yield, deep wilds over the wilds over the
// picked-over ground near people, times (1 + your Perception), a part carried to the next hour;
// how good is your soul against the land's band, a comparison, not a roll. Which line it finds is
// seeded by the spot and the hour, as world content is.
import { GATHER } from '../../content/map/travel.ts';
import { BANDS, EDGE_LI, RING_LI } from '../../content/map/travel.ts';
import { hasItem, item, rarityRange, variantId } from '../../content/items.ts';
import { veinAt } from '../../content/map/index.ts';
import { RARITY_IDS, type RarityId } from '../../content/rarity.ts';
import { realmIndex } from '../../content/realms.ts';
import { landLines } from '../making.ts';
import { hashSeed, Rng } from '../rng.ts';
import { stats } from '../stats.ts';
import { realmOf, type Cultivator } from '../state.ts';
import { bandAt, peopleLi } from './depth.ts';
import type { Pt } from './geometry.ts';
import { atlasAreaAt, terrainAt, type RegionMap } from './region.ts';
import { gainInto } from './ground.ts';
import type { MapLife } from './schema.ts';

/** What the land yields an hour where you stand, before Perception. */
export function landYield(map: RegionMap, at: Pt): number {
  const li = peopleLi(map, at);
  if (li < EDGE_LI) return GATHER.near;
  return li < EDGE_LI + RING_LI ? GATHER.wild : GATHER.deep;
}

/** The lines the land grows where you stand. */
export function gatherLines(map: RegionMap, at: Pt): string[] {
  const area = atlasAreaAt(map, at);
  return landLines(map.id, terrainAt(map, at), veinAt(area?.id ?? map.id));
}

/** A band's rarities, lowest first: "green and blue" at layers 7 to 9. */
function bandRarities(band: number): RarityId[] {
  const words = BANDS[Math.max(0, Math.min(BANDS.length - 1, band))]!.finds.split(/ and |, /);
  const ids = words
    .map((w) => w.trim())
    .filter((w): w is RarityId => (RARITY_IDS as readonly string[]).includes(w));
  return ids.length ? ids : ['white'];
}

/**
 * The rarity your soul finds in a land (O4's talk): at or above its band, the band's best; a band
 * below, its lesser; further below, a step under that. Gold and better only while your soul is
 * ahead of your realm.
 */
export function gatherRarity(c: Cultivator, soulBand: number, landBand: number): RarityId {
  const rs = bandRarities(landBand);
  let i: number;
  if (soulBand >= landBand) i = RARITY_IDS.indexOf(rs[rs.length - 1]!);
  else if (soulBand === landBand - 1) i = RARITY_IDS.indexOf(rs[0]!);
  else i = Math.max(0, RARITY_IDS.indexOf(rs[0]!) - 1);
  const ahead = realmIndex(c.soul.realm) > realmIndex(realmOf(c));
  if (!ahead) i = Math.min(i, RARITY_IDS.indexOf('purple'));
  return RARITY_IDS[i]!;
}

/** A found thing at a rarity, held in its own range. */
function found(id: string, r: RarityId): string {
  if (!hasItem(id)) return id;
  const range = rarityRange(item(id));
  const at = range.includes(r)
    ? r
    : RARITY_IDS.indexOf(r) < RARITY_IDS.indexOf(range[0]!)
      ? range[0]!
      : range[range.length - 1]!;
  return variantId(id, at, {});
}

export interface Gathered {
  life: MapLife;
  player: Cultivator;
  /** What was found this hour, by id and count. */
  finds: Record<string, number>;
}

/**
 * A share of a gather hour where you stand: the land's yield times (1 + Perception) toward the next
 * find; each whole piece is a line the land grows there, at the rarity your soul reaches.
 */
export function gatherHour(
  map: RegionMap,
  life: MapLife,
  c: Cultivator,
  soulBand: number,
  hourIndex: number,
  share: number,
): Gathered {
  const lines = gatherLines(map, life.at);
  if (!lines.length) return { life, player: c, finds: {} };
  const perception = Math.max(0, stats(c).perception ?? 0);
  const dug = life.gathered + landYield(map, life.at) * (1 + perception) * share;
  const whole = Math.floor(dug + 1e-9);
  // Held at 0: a sum just under a whole leaves float dust below it, which the save refuses.
  const next = { ...life, gathered: Math.max(0, dug - whole) };
  if (whole <= 0) return { life: next, player: c, finds: {} };
  const rarity = gatherRarity(c, soulBand, Math.max(0, bandAt(map, life.at)));
  const rng = new Rng(
    hashSeed(`gather/${Math.round(life.at[0])}/${Math.round(life.at[1])}/${hourIndex}`),
  );
  let player = c;
  const finds: Record<string, number> = {};
  for (let i = 0; i < whole; i++) {
    const id = found(rng.pick(lines), rarity);
    finds[id] = (finds[id] ?? 0) + 1;
  }
  // What the Bag can't hold falls where you stand (core/map/ground.ts).
  let ground = next;
  for (const [id, n] of Object.entries(finds)) {
    const r = gainInto(player, ground, Math.floor(hourIndex / 12), id, n);
    player = r.c;
    ground = r.life;
  }
  return { life: ground, player, finds };
}
