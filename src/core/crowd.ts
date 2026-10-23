// A place's crowd (P3.9b; design § The world, Going in: Who is there, A place's air and crowd).
// A frame's crowd is a count and a few faces, each only a seed keyed by the place, the frame, the
// day and the double-hour, so nothing is made until you engage one. Engaging a face makes them from
// its tag at a realm by the general rule (P3.9b's talk with Jan): the land's qi says how many
// cultivate, and each realm up is design's share of the realm below times where it is and its
// prosperity, a realm over the place's top only as a passing visitor. The same face on the same day
// is the same person, so dropping one loses nothing. The cast (People and ties' N3) plugs into the
// "present here" list ahead of the faces.
import {
  ABOVE_TOP,
  CROWD,
  CROWD_TAGS,
  FACES_SHOWN,
  GATHER,
  NIGHT_FLOOR,
  PROSPERITY_STEP,
  QI_CULTIVATORS,
  REALM_STEP,
  STREET_CROWD,
  type CrowdTag,
  type GatherAt,
} from '../content/crowd.ts';
import { DOOR_KINDS, type DoorKindId } from '../content/doorKinds.ts';
import { MORTALS } from '../content/encounters/mortals.ts';
import { REGIONS } from '../content/map/index.ts';
import { PLACE_AIR } from '../content/placeAir.ts';
import { REALMS, realm, realmIndex, type RealmId } from '../content/realms.ts';
import { BORDER_WILDS_NAMES, template } from '../content/roster.ts';
import { DAYS_PER_YEAR } from '../content/calendar.ts';
import { prosperityOf } from './markets.ts';
import { plainActor, rosterActor, type Actor } from './resolver/actor.ts';
import type { RealmStage, World } from './resolver/world.ts';
import { hashSeed, Rng } from './rng.ts';

// ── What a place is, for its crowd ───────────────────────────────────────────────────────────

export interface PlaceFacts {
  id: string;
  /** Where its crowd stands, for the gathering and the street's size. */
  at: GatherAt;
  qi: number;
  /** The written prosperity; the world's moves it (`prosperityOf`). */
  top: RealmId | null;
  /** The power whose seat it is, or that keeps it. */
  power: string | null;
  crowd: Partial<Record<CrowdTag, number>>;
}

const DEFAULT_CROWD: Record<GatherAt, Partial<Record<CrowdTag, number>>> = {
  city: { merchants: 3, crafters: 2, soldiers: 2, servants: 1, beggars: 1 },
  town: { farmers: 2, merchants: 2, soldiers: 1, crafters: 1, hunters: 1 },
  village: { farmers: 3, herders: 1, hunters: 1 },
  seat: { disciples: 3, servants: 2, merchants: 1 },
  wilds: {},
};

const isRealm = (r: string): r is RealmId => REALMS.some((x) => x.id === r);

/** The facts of a place its crowd reads, from the region files and the written towns. */
export function placeFacts(id: string): PlaceFacts {
  for (const r of Object.values(REGIONS)) {
    const town = r.content.towns.find((t) => t.id === id);
    if (town) {
      const above = town.parent ? r.file.places.find((p) => p.id === town.parent) : undefined;
      const at: GatherAt = town.sub === 'town' ? 'town' : 'village';
      return {
        id,
        at,
        qi: above?.qiDensity ?? r.file.qiDensity,
        top: above && isRealm(above.top) ? above.top : null,
        power: above?.kind === 'power' ? above.id : null,
        crowd: PLACE_AIR[id]?.crowd ?? DEFAULT_CROWD[at],
      };
    }
    const p = r.file.places.find((x) => x.id === id);
    if (p) {
      const at: GatherAt = p.kind === 'city' ? 'city' : p.kind === 'power' ? 'seat' : 'town';
      return {
        id,
        at,
        qi: p.qiDensity ?? r.file.qiDensity,
        top: isRealm(p.top) ? p.top : null,
        power: p.kind === 'power' ? p.id : null,
        crowd: PLACE_AIR[id]?.crowd ?? DEFAULT_CROWD[at],
      };
    }
  }
  return { id, at: 'wilds', qi: 5, top: null, power: null, crowd: {} };
}

// ── How many, by the hour ────────────────────────────────────────────────────────────────────

/** The double-hour of a world day, 子 first (0 to 11). */
export function branchOf(day: number): number {
  return Math.floor((((day % 1) + 1) % 1) * 12) % 12;
}

function prosperityPull(p: number): number {
  return p >= 5 ? PROSPERITY_STEP.up ** (p - 5) : PROSPERITY_STEP.down ** (5 - p);
}

/**
 * How many are in a frame at an hour: the street's crowd by where it stands, the door kind's share
 * and its hours, never under the night's floor on a street (Jan's call: a city stays a little alive).
 */
export function crowdCount(
  f: PlaceFacts,
  kind: DoorKindId | 'street',
  day: number,
  prosperity = 5,
): number {
  const base = STREET_CROWD[f.at] * prosperityPull(prosperity);
  const h = branchOf(day);
  if (kind === 'street') {
    const floor = NIGHT_FLOOR[f.at] * prosperityPull(prosperity);
    const day0 = DOOR_KINDS.market.hours[h]!;
    return Math.round(base * Math.max(day0, floor));
  }
  const k = DOOR_KINDS[kind];
  return Math.round(base * k.crowd * k.hours[h]!);
}

// ── Faces ────────────────────────────────────────────────────────────────────────────────────

/** A face in a crowd: a seed, its tag and its line; nobody until engaged. */
export interface Face {
  key: string;
  tag: CrowdTag;
  line: string;
}

function pickTag(rng: Rng, crowd: Partial<Record<CrowdTag, number>>): CrowdTag {
  const tags = CROWD_TAGS.filter((t) => (crowd[t] ?? 0) > 0);
  if (!tags.length) return 'merchants';
  const total = tags.reduce((t, x) => t + crowd[x]!, 0);
  let r = rng.next() * total;
  for (const t of tags) {
    r -= crowd[t]!;
    if (r < 0) return t;
  }
  return tags[tags.length - 1]!;
}

/**
 * The faces a frame shows now: up to four of its count, drawn again each double-hour, keyed by the
 * place, the frame, the day and the hour, so a reload shows the same faces.
 */
export function facesAt(
  f: PlaceFacts,
  frame: string,
  day: number,
  count: number,
  crowd: Partial<Record<CrowdTag, number>> = f.crowd,
): Face[] {
  const out: Face[] = [];
  const stamp = `${Math.floor(day)}/${branchOf(day)}`;
  const used = new Set<string>();
  for (let i = 0; i < Math.min(FACES_SHOWN, count); i++) {
    const key = `${f.id}/${frame}/${stamp}/${i}`;
    const rng = new Rng(hashSeed(`face/${key}`));
    const tag = pickTag(rng, crowd);
    const lines = CROWD[tag].faces.filter((l) => !used.has(l));
    const line = lines.length ? rng.pick(lines) : CROWD[tag].faces[0]!;
    used.add(line);
    out.push({ key, tag, line });
  }
  return out;
}

// ── Making a face ────────────────────────────────────────────────────────────────────────────

/**
 * A realm by the general rule: a step up from Qi Condensation at design's share of the realm below,
 * times where it is and its prosperity, a realm over the place's top only as a passing visitor.
 */
export function crowdRealm(rng: Rng, f: PlaceFacts, prosperity = 5): RealmStage {
  let at: RealmId = 'qi-condensation';
  for (let i = 1; i < REALMS.length; i++) {
    const next = REALMS[i]!.id;
    const step = REALM_STEP[next];
    if (step === undefined) break;
    const over = f.top !== null && realmIndex(next) > realmIndex(f.top);
    const p = step * GATHER[f.at] * prosperityPull(prosperity) * (over ? ABOVE_TOP : 1);
    if (!rng.chance(Math.min(1, p))) break;
    at = next;
  }
  // Most stand low in their realm: the stage leans to its first layers.
  const stages = realm(at).stages;
  const stage = 1 + Math.floor(rng.next() ** 2 * stages);
  return { realm: at, stage: Math.min(stages, stage) };
}

/** Whether a face cultivates: its tag's share times the land's qi, held to one. */
export function cultivates(rng: Rng, tag: CrowdTag, f: PlaceFacts): boolean {
  const share = CROWD[tag].cultivates * (QI_CULTIVATORS[f.qi] ?? 1);
  return rng.chance(Math.min(1, share));
}

/** The template a power's own disciples are made from: the Gate's, the Sect's, else a small sect's. */
const POWER_DISCIPLE: Readonly<Record<string, string>> = {
  'qm-tushou-men': 'beast-butcher-disciple',
  'sea-yuhai-zong': 'sea-taming-disciple',
};

/** Face actors' ids: the face's key, so the same face is the same person. */
export const faceId = (key: string) => `face:${key}`;

export interface MadeFace {
  actor: Actor;
  /** The roster template or mortal kind they were made from. */
  template: string;
  mortal: boolean;
  /** Their seed, the face's key hashed: the kept record rebuilds them from it. */
  seed: number;
  /** The year they were born, so the cast's aging (N3) can read them. */
  born: number;
}

/**
 * Makes a face someone (Jan's call in P3.9b's talk): from their tag's mortal kind or template at a
 * realm by the rule, seeded by the face's key and the world, so the same face is the same person.
 */
export function makeFace(
  w: World,
  face: Face,
  f: PlaceFacts,
  day: number,
  side: string,
  worldSeed: string,
): MadeFace {
  const seed = hashSeed(`made/${worldSeed}/${face.key}`);
  const rng = new Rng(seed);
  const info = CROWD[face.tag];
  const id = faceId(face.key);
  const year = Math.floor(day / DAYS_PER_YEAR);
  const prosperity = prosperityOf(w, f.id, day);
  if (info.template && cultivates(rng, face.tag, f)) {
    const tpl =
      info.template === 'power'
        ? f.power && POWER_DISCIPLE[f.power]
          ? POWER_DISCIPLE[f.power]!
          : 'sect-disciple'
        : info.template;
    const r = crowdRealm(rng, f, prosperity);
    const t = template(tpl);
    const age = 16 + rng.int(0, 40) + realmIndex(r.realm) * 30;
    const actor = rosterActor(tpl, r.realm, r.stage, id, side, {
      looks: face.line,
      face: { key: face.key, born: year - age },
      ...(info.template === 'power' && f.power && t.kind === 'cultivator' && !t.power
        ? { power: f.power }
        : {}),
    });
    return { actor, template: tpl, mortal: false, seed, born: year - age };
  }
  const kind = info.mortal ?? 'merchant';
  const m = MORTALS[kind]!;
  const name = `${rng.pick(BORDER_WILDS_NAMES.surnames)} ${rng.pick(BORDER_WILDS_NAMES.given)}`;
  const taels = rng.int(m.taels[0], m.taels[1]);
  const born = year - (14 + rng.int(0, 50));
  const actor = plainActor({
    id,
    name,
    side,
    stones: 0,
    looks: face.line,
    taels,
    face: { key: face.key, mortal: kind, born },
  });
  return { actor, template: kind, mortal: true, seed, born };
}
