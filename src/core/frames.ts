// Frames, not floor plans (P3.9b; design § The world, Going in: doors and frames). Where you stand
// inside a place is a frame: a name, what it opens off, whose ground it is, its eyes, its traffic
// and its features. A place screen's streets and doors are frames already written; anywhere else is
// made on the spot, GLM naming it and the engine giving it everything else, three a door a scene,
// kept on its door when something happened there. Guarded ground names its keeper and the ways in;
// a resident's frame is seeded by the place, the district and its name, so the same house is the same
// when you come back. Moving is free within a door, a tick door to door and four between districts.
import { CROWD_TAGS, type CrowdTag } from '../content/crowd.ts';
import {
  DOOR_KINDS,
  doorKindOf,
  MADE_FRAMES_PER_DOOR,
  MOVE_TICKS,
  type DoorKindId,
} from '../content/doorKinds.ts';
import { HOME_BY, HOUSEHOLDS, OWNER_OF_TAG, type OwnerKind } from '../content/households.ts';
import { PROSPERITY } from '../content/markets.ts';
import { BORDER_WILDS_NAMES } from '../content/roster.ts';
import { DAYS_PER_YEAR } from '../content/calendar.ts';
import { placeLots, prosperityOf } from './markets.ts';
import { crowdRealm, placeFacts, branchOf, type PlaceFacts } from './crowd.ts';
import type { RealmStage, World } from './resolver/world.ts';
import { hashSeed, Rng } from './rng.ts';
import type { Frame, Resident, Store } from './frameSchema.ts';

export type { Body, Frame, Resident, Store } from './frameSchema.ts';

/** A written door as the place screen lays it out: its counter's key, name, piece and group. */
export interface DoorRef {
  id: string;
  name: string;
  art: string;
  group: string;
}

// ── A place's written frames ─────────────────────────────────────────────────────────────────

const DISTRICTS: Readonly<Record<string, { id: string; name: string }>> = {
  market: { id: 'market', name: 'the market quarter' },
  hear: { id: 'hear', name: 'the teahouse lanes' },
  work: { id: 'work', name: 'the work yards' },
  land: { id: 'work', name: 'the work yards' },
  power: { id: 'hall', name: 'the hall’s grounds' },
  hall: { id: 'hall', name: 'the hall’s grounds' },
};

/** A door's district: a city's doors by their group, a town's and a village's all one street. */
export function districtOf(city: boolean, group: string): { id: string; name: string } {
  if (!city) return { id: 'streets', name: 'the streets' };
  return DISTRICTS[group] ?? { id: 'streets', name: 'the streets' };
}

function eyesOf(kind: DoorKindId | 'street' | 'alley'): Frame['eyes'] {
  if (kind === 'street' || kind === 'market' || kind === 'gate') return 'crowd';
  if (kind === 'alley') return 'few';
  const k = DOOR_KINDS[kind];
  return k.home ? 'none' : k.crowd >= 0.1 ? 'crowd' : 'few';
}

/**
 * A place's written frames: one street a district at the head of its screen, each door as a door,
 * and the rooms behind each door with their ways in (design § Guarded ground). The power's own rooms
 * are warded at its top realm; a shop's store room at its keeper's, a Foundation master's by default.
 */
export function placeFrames(
  city: boolean,
  doors: readonly DoorRef[],
  power: string | null,
  powerRealm: RealmStage | null,
): Frame[] {
  const out: Frame[] = [];
  const seen = new Set<string>();
  for (const d of doors) {
    const dist = districtOf(city, d.group);
    if (!seen.has(dist.id)) {
      seen.add(dist.id);
      out.push({
        id: `street:${dist.id}`,
        name: dist.name,
        kind: 'street',
        district: dist.id,
        off: null,
        ground: 'public',
        keeper: null,
        way: 'open',
        warded: null,
        eyes: 'crowd',
        made: false,
      });
    }
    const kind = doorKindOf(d.art);
    const k = DOOR_KINDS[kind];
    const hall = kind === 'hall';
    const id = `door:${d.id}`;
    out.push({
      id,
      name: d.name,
      kind,
      district: dist.id,
      off: `street:${dist.id}`,
      ground: hall && power ? 'power' : 'public',
      keeper: k.keeper,
      way: 'open',
      warded: null,
      eyes: eyesOf(kind),
      made: false,
      door: d.art,
    });
    k.rooms.forEach((r, i) => {
      const owner = hall && power ? 'power' : 'public';
      out.push({
        id: `room:${d.id}:${i}`,
        name: `${r.name} of ${d.name}`,
        kind,
        district: dist.id,
        off: id,
        ground: owner,
        keeper: k.keeper,
        way: r.way,
        ...(r.taels !== undefined ? { taels: r.taels } : {}),
        warded: r.warded
          ? hall && powerRealm
            ? powerRealm
            : { realm: 'foundation-establishment', stage: 1 }
          : null,
        eyes: 'none',
        made: false,
        door: d.art,
        ...(r.store ? { stocked: true } : {}),
      });
    });
  }
  return out;
}

// ── Moving ───────────────────────────────────────────────────────────────────────────────────

/** The door a frame belongs to: itself for a door or a street, the door it opens off for a room. */
function doorOf(frames: readonly Frame[], f: Frame): Frame {
  let at: Frame = f;
  for (
    let i = 0;
    i < 4 && at.off && !at.id.startsWith('door:') && !at.id.startsWith('street:');
    i++
  ) {
    const up = frames.find((x) => x.id === at.off);
    if (!up) break;
    at = up;
  }
  return at;
}

/** Ticks a move takes (design § Moving): within a door free, door to door 1, district to district 4. */
export function moveTicks(frames: readonly Frame[], from: Frame, to: Frame): number {
  if (from.id === to.id) return 0;
  if (doorOf(frames, from).id === doorOf(frames, to).id) return MOVE_TICKS.within;
  if (from.district === to.district) return MOVE_TICKS.door;
  return MOVE_TICKS.district;
}

/** Why you can't simply walk in: a guarded room's way, or null. */
export function barredBy(
  f: Frame,
  o: { member: boolean; taels: number; craft: boolean },
): string | null {
  if (f.open || f.way === 'open' || f.ground === 'yours') return null;
  if (f.way === 'paid') {
    return o.taels >= (f.taels ?? 0) ? null : `${f.name} is paid for: ${f.taels} taels`;
  }
  if (f.way === 'rank') {
    if (o.member && f.ground === 'power') return null;
    if (o.craft && f.kind === 'craft' && !f.name.startsWith('the store')) return null;
    return `${f.name} is ${f.ground === 'power' ? 'for those of rank' : 'kept by its master'}: sneak or force it`;
  }
  return `${f.name} is kept by ${f.keeper ?? 'its owner'}: you need to be asked in, or to sneak or force it`;
}

// ── Made frames ──────────────────────────────────────────────────────────────────────────────

/** The kind a made frame's name reads as: GLM names it, the engine fills it. */
const NAMED: readonly [RegExp, DoorKindId | 'alley'][] = [
  [/gambl|dice|\bden\b/i, 'den'],
  [/wine|tavern|drink/i, 'wine-house'],
  [/flower|brothel|pleasure|courtesan/i, 'flower-house'],
  [/bath/i, 'bathhouse'],
  [/temple|shrine|monaster/i, 'temple'],
  [/abode|cave dwelling|cultivator’s|cultivator's|courtyard/i, 'abode'],
  [/house|home|hut|shack|cottage|family|dwelling|quarters/i, 'home'],
  [/alley|lane|corner|back street|behind|rooftop|roof/i, 'alley'],
  [/inn\b|lodging/i, 'inn'],
  [/tea/i, 'teahouse'],
];

export function madeKind(name: string): DoorKindId | 'alley' {
  for (const [re, k] of NAMED) if (re.test(name)) return k;
  return 'alley';
}

/** The frames made this scene off a door. */
export function madeOff(frames: readonly Frame[], door: string): Frame[] {
  return frames.filter((f) => f.made && doorOf(frames, f).id === door);
}

/**
 * A frame GLM named, made by the engine (design § Frames, not floor plans): it opens off where you
 * stand, its kind read from its name, its ground public, or a resident the engine makes for a home
 * or a stranger's house; it holds nothing but what the engine puts there. Three a door a scene.
 */
export function makeFrame(
  w: World,
  place: string,
  frames: readonly Frame[],
  at: Frame,
  name: string,
  day: number,
  worldSeed: string,
): Frame | string {
  const door = doorOf(frames, at);
  const same = frames.find((f) => f.name.toLowerCase() === name.toLowerCase());
  if (same) return same;
  if (madeOff(frames, door.id).length >= MADE_FRAMES_PER_DOOR)
    return `Nowhere more off ${door.name} to go to this time.`;
  const kind = madeKind(name);
  const n = frames.filter((f) => f.made).length + 1;
  const id = `made:${n}`;
  const base: Frame = {
    id,
    name,
    kind,
    district: at.district,
    off: at.id,
    ground: 'public',
    keeper: kind === 'alley' ? null : DOOR_KINDS[kind].keeper,
    way: 'open',
    warded: null,
    eyes: eyesOf(kind),
    made: true,
  };
  if (kind === 'home' || kind === 'abode') {
    const r = residentOf(w, place, at.district, name, worldSeed, day, kind === 'abode');
    return {
      ...base,
      ground: 'resident',
      keeper: r.name,
      way: 'invited',
      warded: HOUSEHOLDS[r.owner].cultivates ? r.realm : null,
      resident: r,
    };
  }
  return base;
}

// ── Residents ────────────────────────────────────────────────────────────────────────────────

function pickTag(rng: Rng, f: PlaceFacts): CrowdTag {
  const tags = CROWD_TAGS.filter((t) => (f.crowd[t] ?? 0) > 0);
  if (!tags.length) return 'farmers';
  const total = tags.reduce((t, x) => t + f.crowd[x]!, 0);
  let r = rng.next() * total;
  for (const t of tags) {
    r -= f.crowd[t]!;
    if (r < 0) return t;
  }
  return tags[0]!;
}

/**
 * A resident's frame's owner (design § What the engine makes), seeded by the place, the district
 * and the frame's name: drawn from the district's crowd, a cultivator's courtyard at a realm by the
 * crowd's rule, so a wealthy quarter holds more of them; their birth year rides along for N3.
 */
export function residentOf(
  w: World,
  place: string,
  district: string,
  name: string,
  worldSeed: string,
  day: number,
  cultivator = false,
): Resident {
  const seed = hashSeed(`resident/${worldSeed}/${place}/${district}/${name.toLowerCase()}`);
  const rng = new Rng(seed);
  const f = placeFacts(place);
  const tag = pickTag(rng, f);
  let owner: OwnerKind = cultivator ? 'cultivator' : OWNER_OF_TAG[tag];
  if (!cultivator && owner === 'cultivator') owner = 'mortal-family';
  const cultivates = HOUSEHOLDS[owner].cultivates;
  const prosperity = prosperityOf(w, place, day);
  const realm: RealmStage = cultivates
    ? crowdRealm(rng, f, prosperity)
    : { realm: 'qi-condensation', stage: 1 };
  const year = Math.floor(day / DAYS_PER_YEAR);
  return {
    seed,
    owner,
    tag,
    realm,
    name: `the ${rng.pick(BORDER_WILDS_NAMES.surnames)} household`,
    born: year - (20 + rng.int(0, 45)),
  };
}

/** Whether the owner is home at a day's hour (3 in 4 by night, asleep; 1 in 2 by day), a world roll. */
export function ownerHome(r: Resident, day: number): { home: boolean; asleep: boolean } {
  const h = branchOf(day);
  const night = h <= 2 || h >= 11;
  const rng = new Rng(hashSeed(`home/${r.seed}/${Math.floor(day)}/${h}`));
  const home = rng.chance(night ? HOME_BY.night : HOME_BY.day);
  return { home, asleep: home && night };
}

/**
 * A household's store (design § What the engine makes): its owner kind's table filled from the
 * place's catalog at its prosperity, only the pick rolled, with its silver and stones.
 */
export function storeOf(
  w: World,
  place: string,
  owner: OwnerKind,
  seed: number,
  day: number,
): Store {
  const t = HOUSEHOLDS[owner];
  const rng = new Rng(hashSeed(`store/${seed}`));
  const lots = placeLots(place).filter(
    (l) => l.shops.some((k) => t.draws.includes(k)) && !l.thing.includes(':'),
  );
  const p = PROSPERITY[prosperityOf(w, place, day)]!;
  const picks = Math.max(1, Math.round(rng.int(t.picks[0], t.picks[1]) * p.lots));
  const items: Record<string, number> = {};
  for (const id of t.always ?? []) items[id] = (items[id] ?? 0) + 1;
  for (let i = 0; i < picks && lots.length; i++) {
    const total = lots.reduce((s, l) => s + (l.weight ?? 1), 0);
    let r = rng.next() * total;
    let lot = lots[0]!;
    for (const l of lots) {
      r -= l.weight ?? 1;
      if (r < 0) {
        lot = l;
        break;
      }
    }
    const n = lot.count ? rng.int(lot.count[0], lot.count[1]) : 1;
    items[lot.thing] = (items[lot.thing] ?? 0) + n;
  }
  return {
    items,
    taels: Math.round(rng.int(t.taels[0], t.taels[1]) * p.purse),
    stones: Math.round(rng.int(t.stones[0], t.stones[1]) * p.purse),
  };
}

/** A power's own store, its treasury: the sect's table, seeded by the power and the year. */
export function powerStore(w: World, place: string, power: string, day: number): Store {
  const year = Math.floor(day / DAYS_PER_YEAR);
  return storeOf(w, place, 'sect-store', hashSeed(`treasury/${power}/${year}`), day);
}
