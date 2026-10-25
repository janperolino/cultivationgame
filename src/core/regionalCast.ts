// The regional cast (design § Professions, people and powers, The regional cast: Who, Their season,
// Where they are; N2). About 200 notables a region, seeded from its powers' populations, each a
// cast member (Who acts): a seed and pins whose kit regenerates from their roster template. The
// region you stand in ticks a season at a time, the rest a year in summary. A season: cultivate at
// pedigree's pace, break through once the stage's years have passed and the gate is in hand, take at
// most one act by the strongest want whose moment has come, die at the lifespan's edge or in a fight
// above them. Capability and wants, never dice: a roll only picks between equal options, seeded by
// the person and the season, or rolls world content (a seeded cast member, a beast met). The cast
// never seeks you out: every act names someone of the cast or a place, never you.
import { BORDER_WILDS_NAMES, template as rosterTemplate } from '../content/roster.ts';
import { DAYS_PER_YEAR, ERA_START_YEAR } from '../content/calendar.ts';
import {
  ACTS,
  CAST_SEEDING,
  CAST_TEMPLATE,
  CAST_UPKEEP,
  DEED_YEARS,
  GREAT_SECT_FROM,
  LIFESPAN_EDGE,
  PEDIGREE_STEP,
  PROSPECT_TYPES,
  SEASON_DAYS,
  STAGE_YEARS_PAST_FOUNDATION,
  TRIBULATION_AFTER,
  WANT_IDS,
  WANT_MOTIVES,
  WANT_POINTS,
  type WantId,
} from '../content/cast.ts';
import type { PedigreeId } from '../content/enemies.ts';
import { priceOf } from './prices.ts';
import { LECTURERS } from '../content/happenings.ts';
import { STANDING_ROWS } from '../content/memories.ts';
import { HOME_MAP_REGION, regionData } from '../content/map/index.ts';
import { ORG_ROWS, type OrgRow } from '../content/organizations.ts';
import { NPC_PACE, NPC_STAGE_YEARS, PACE_AGES } from '../content/pace.ts';
import { realm, realmIndex, realmScale, REALMS, type RealmId } from '../content/realms.ts';
import { fightEdge } from './combat/edge.ts';
import { generateBeast } from './combat/generate.ts';
import { castPills, homeMarket } from './cast.ts';
import { npcFrom, threaded } from './kept.ts';
import { monthIndex } from './orgs/contribution.ts';
import { houseOf, isOrganization, organization } from './orgs/identity.ts';
import { canJoin } from './orgs/membership.ts';
import { ladderOf, seatByRealm, seatRank, seatOf, rank } from './orgs/seats.ts';
import { rollNature } from './resolver/nature.ts';
import { addTie, lean, memoryShare, natureOf, remember, tiesOf } from './resolver/opinion.ts';
import type { Kept } from './resolver/opinion.ts';
import { recordDeed, type RealmStage, type World } from './resolver/world.ts';
import { hashSeed, Rng } from './rng.ts';
import type { GameState } from './state.ts';
import { giveTo, heldOf, purseOf } from './who.ts';

const YEAR = DAYS_PER_YEAR;

/** The season a world day falls in, counted from day 0. */
export function seasonIndex(day: number): number {
  return Math.floor(day / SEASON_DAYS);
}

const yearOf = (day: number) => Math.floor(day / YEAR);

// ── Stages and the clock ─────────────────────────────────────────────────────────────────────

/** A stage's key on the pace tables: q1..q9, f1..f4, c1..c4, n1..n4. */
export function stageKey(r: RealmStage): string {
  return `${'qfcndvbmt'[realmIndex(r.realm)]}${r.stage}`;
}

/** The stage after this one, or null at the top the cast can reach (Nascent Soul's peak). */
export function nextStage(r: RealmStage): RealmStage | null {
  if (r.stage < realm(r.realm).stages) return { realm: r.realm, stage: r.stage + 1 };
  if (r.realm === 'nascent-soul') return null;
  const up = REALMS[realmIndex(r.realm) + 1];
  return up ? { realm: up.id, stage: 1 } : null;
}

/**
 * Years from reaching a stage to the next, by pedigree: the pace table through Foundation, the
 * flat years past it, and the Nascent Soul tribulation's years after Core's peak (null: never).
 */
export function stageYears(ped: PedigreeId, r: RealmStage): number | null {
  const next = nextStage(r);
  if (!next) return null;
  const table = NPC_STAGE_YEARS[ped];
  const at = (k: string, fallback: number) => table[k] ?? fallback;
  const i = realmIndex(r.realm);
  if (i <= 1 && realmIndex(next.realm) <= 1) {
    const from = r.stage === 1 && i === 0 ? 12 : at(stageKey(r), 12);
    return Math.max(0.1, at(stageKey(next), from + 1) - from);
  }
  if (r.realm === 'core-formation' && next.realm === 'nascent-soul') return TRIBULATION_AFTER[ped];
  const past = STAGE_YEARS_PAST_FOUNDATION[ped];
  // Forming a core takes a Core stage's years; each stage past it its own realm's.
  return past[next.realm === 'core-formation' ? 'core-formation' : r.realm] ?? null;
}

/** The age in years at which a pedigree reaches a stage, at its pace with no waiting. */
export function stageAge(ped: PedigreeId, r: RealmStage): number {
  let age = 12;
  let at: RealmStage = { realm: 'qi-condensation', stage: 1 };
  while (rank(at) < rank(r)) {
    const y = stageYears(ped, at);
    if (y === null) break;
    age += y;
    at = nextStage(at)!;
  }
  return age;
}

/** The gate pill a breakthrough into this realm needs, or null. */
function gatePill(into: RealmId): string | null {
  return REALMS[realmIndex(into)]?.gates.qi ?? null;
}

/** The lifespan's edge, keyed to the seed: 90% to 100% of the realm's lifespan. */
export function lifespanEdge(id: string, r: RealmId): number {
  const u = new Rng(hashSeed(`edge/${id}`)).next();
  return realm(r).lifespan * (LIFESPAN_EDGE.from + (LIFESPAN_EDGE.to - LIFESPAN_EDGE.from) * u);
}

// ── Who is the cast ──────────────────────────────────────────────────────────────────────────

/** A region's cast, alive: their ids in a fixed order. */
export function castIn(w: World, region: string): string[] {
  return Object.keys(w.kept)
    .filter((id) => w.kept[id]!.region === region && w.people[id] !== 'dead')
    .sort();
}

/** Whether someone is a region's cast. */
export function isCast(w: World, id: string): boolean {
  return !!w.kept[id]?.region;
}

const ageAt = (k: Kept, day: number) => day / YEAR - (k.born ?? 0);

// ── Seeding ──────────────────────────────────────────────────────────────────────────────────

interface Slot {
  power: string | null;
  realm: RealmStage;
  ped: PedigreeId;
  home: string;
  /** A written person (a lecturer), their id and name. */
  id?: string;
  name?: string;
}

/** The region's powers, and its kingdoms that aren't organizations (a council of clans). */
const rowsByRegion = new Map<string, OrgRow[]>();
function regionRows(region: string): OrgRow[] {
  let rows = rowsByRegion.get(region);
  if (!rows) {
    rows = ORG_ROWS.filter((r) => r.region === region && r.population);
    rowsByRegion.set(region, rows);
  }
  return rows;
}

/** Splits `total` by weights, at least `min(i)` each, the remainder to the largest shares first. */
function split(total: number, weights: number[], min: (i: number) => number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const exact = weights.map((w) => (total * w) / sum);
  const out = exact.map((x, i) => Math.max(min(i), Math.floor(x)));
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r);
  for (let j = 0; left > 0 && j < order.length; j++, left--) out[order[j]!.i]! += 1;
  return out;
}

/** A power's pedigree: a great sect under a Nascent Soul's head, else a small sect. */
function pedigreeOf(power: string | null): PedigreeId {
  if (!power || !isOrganization(power)) return 'rogue';
  return realmIndex(ladderOf(power).head) >= realmIndex(GREAT_SECT_FROM)
    ? 'great-sect'
    : 'small-sect';
}

/** The places of a region by kind, from its generated file (empty when the region has none). */
const placesByKind = new Map<string, string[]>();
function placesOf(region: string, kinds: readonly string[], sites?: readonly string[]): string[] {
  const key = `${region}|${kinds.join()}|${sites?.join() ?? ''}`;
  const hit = placesByKind.get(key);
  if (hit) return hit;
  const file = regionData(region)?.file;
  if (!file) return [];
  const out = file.places
    .filter((p) => kinds.includes(p.kind) && (!sites || !p.site || sites.includes(p.site)))
    .map((p) => p.id);
  placesByKind.set(key, out);
  return out;
}

/** Where someone of a row lives: an organization's seat, else a city of the kingdom, else it. */
function homeOf(region: string, row: OrgRow | null, rng: Rng): string {
  if (row && isOrganization(row.id)) return houseOf(row.id);
  const file = regionData(region)?.file;
  if (row) {
    const cities = file?.places.filter((p) => p.kind === 'city' && p.parent === row.id) ?? [];
    return cities.length ? rng.pick(cities).id : row.id;
  }
  const cities = placesOf(region, ['city']);
  return cities.length ? rng.pick(cities) : region;
}

/** A hermit's home: a forbidden land or a secret realm, else a city. */
function hermitHome(region: string, rng: Rng): string {
  const wild = placesOf(region, ['forbidden', 'realm']);
  return wild.length ? rng.pick(wild) : homeOf(region, null, rng);
}

const QC = (stage: number): RealmStage => ({ realm: 'qi-condensation', stage });
const FE = (stage: number): RealmStage => ({ realm: 'foundation-establishment', stage });

/** Every slot a region seeds: its powers' Core and Nascent Soul, its Foundation, its rising. */
function slotsOf(region: string, rng: Rng): Slot[] {
  const rows = regionRows(region);
  const slots: Slot[] = [];
  const pop = (r: OrgRow, k: 'qi' | 'foundation' | 'core' | 'nascent') => r.population?.[k] ?? 0;
  const power = (r: OrgRow) => (isOrganization(r.id) ? houseOf(r.id) : null);
  for (const r of rows) {
    const home = homeOf(region, r, rng);
    for (let i = 0; i < pop(r, 'nascent'); i++)
      slots.push({
        power: power(r),
        realm: { realm: 'nascent-soul', stage: rng.int(1, 4) },
        ped: pedigreeOf(power(r)),
        home,
      });
    for (let i = 0; i < pop(r, 'core'); i++)
      slots.push({
        power: power(r),
        realm: { realm: 'core-formation', stage: rng.int(1, 4) },
        ped: pedigreeOf(power(r)),
        home,
      });
  }
  const f = split(
    CAST_SEEDING.foundation,
    rows.map((r) => pop(r, 'foundation')),
    () => 1,
  );
  const isKingdom = (r: OrgRow) => !r.type;
  const prospect = (r: OrgRow) => !!r.type && PROSPECT_TYPES.includes(r.type);
  const q = split(
    CAST_SEEDING.rising,
    rows.map((r) => pop(r, 'qi') * (isKingdom(r) ? CAST_SEEDING.kingdomShare : 1)),
    (i) => (prospect(rows[i]!) ? CAST_SEEDING.risingSect : 1),
  );
  rows.forEach((r, i) => {
    const home = homeOf(region, r, rng);
    for (let n = 0; n < f[i]!; n++)
      slots.push({ power: power(r), realm: FE(rng.int(1, 4)), ped: pedigreeOf(power(r)), home });
    for (let n = 0; n < q[i]!; n++)
      slots.push({ power: power(r), realm: QC(rng.int(4, 9)), ped: pedigreeOf(power(r)), home });
  });
  const u = CAST_SEEDING.unaffiliated;
  for (let i = 0; i < u.nascent; i++)
    slots.push({
      power: null,
      realm: { realm: 'nascent-soul', stage: rng.int(1, 4) },
      ped: 'rogue',
      home: hermitHome(region, rng),
    });
  for (let i = 0; i < u.core; i++)
    slots.push({
      power: null,
      realm: { realm: 'core-formation', stage: rng.int(1, 4) },
      ped: 'rogue',
      home: hermitHome(region, rng),
    });
  for (let i = 0; i < u.foundation; i++)
    slots.push({
      power: null,
      realm: FE(rng.int(1, 4)),
      ped: 'rogue',
      home: homeOf(region, null, rng),
    });
  for (let i = 0; i < u.rising; i++)
    slots.push({
      power: null,
      realm: QC(rng.int(4, 9)),
      ped: 'rogue',
      home: homeOf(region, null, rng),
    });
  // The geniuses: the rising seeded last in a shuffled order stand a pedigree up.
  const rising = slots.filter((s) => s.realm.realm === 'qi-condensation');
  const order = rising.map((s) => ({ s, k: rng.next() })).sort((a, b) => a.k - b.k);
  for (const { s } of order.slice(0, CAST_SEEDING.geniuses))
    s.ped = PEDIGREE_STEP[Math.min(PEDIGREE_STEP.length - 1, PEDIGREE_STEP.indexOf(s.ped) + 1)]!;
  // The written people stand in for a slot of their power at their realm.
  for (const l of lecturersOf(region)) {
    const i = slots.findIndex(
      (s) => !s.id && s.power === houseOf(l.power) && s.realm.realm === l.realm,
    );
    const at: Slot = {
      power: houseOf(l.power),
      realm: { realm: l.realm, stage: rng.int(2, 4) },
      ped: pedigreeOf(houseOf(l.power)),
      home: houseOf(l.power),
      id: l.id,
      name: l.name,
    };
    if (i >= 0) slots[i] = at;
    else slots.push(at);
  }
  return slots;
}

/** The lecturers (content/happenings.ts) of a region's powers: written people of the cast. */
function lecturersOf(
  region: string,
): { id: string; name: string; power: string; realm: RealmId }[] {
  return Object.entries(LECTURERS)
    .filter(([power]) => ORG_ROWS.find((r) => r.id === power)?.region === region)
    .map(([power, l]) => ({ id: `elder:${power}`, name: l.elder, power, realm: l.realm }));
}

/** A Border Wilds name, rolled from the seed. */
function nameFor(id: string): string {
  const rng = new Rng(hashSeed(`name/${id}`));
  return `${rng.pick(BORDER_WILDS_NAMES.surnames)} ${rng.pick(BORDER_WILDS_NAMES.given)}`;
}

/**
 * Years someone has stood at a stage when seeded: inside its span; at a realm's last stage, waiting
 * at its gate any share of the life left them (a rising Qi Condensation a few years at most, and a
 * Core who would have cleared the tribulation no longer than its years).
 */
function seededWait(id: string, ped: PedigreeId, r: RealmStage, at: number, rng: Rng): number {
  const y = stageYears(ped, r);
  if (r.stage < realm(r.realm).stages && y !== null) return rng.next() * y;
  if (r.realm === 'qi-condensation') return rng.next() * 8;
  const left = Math.max(0, lifespanEdge(id, r.realm) - at - 1);
  // Only the tribulation is cleared by years alone; a pill's gate can be waited on a whole life.
  const clears = r.realm === 'core-formation' && y !== null;
  return rng.next() * (clears ? Math.min(left, y) : left);
}

/** A seeded cast member's record, as the world day finds them. */
function seededKept(id: string, slot: Slot, region: string, day: number, rng: Rng): Kept {
  // Before Core they waited at Foundation's peak for the pill; before Nascent Soul, at Core's.
  const before = realmIndex(slot.realm.realm) >= 2 ? rng.next() * 40 : 0;
  const reached = stageAge(slot.ped, slot.realm) + before;
  const wait = seededWait(id, slot.ped, slot.realm, reached, rng);
  const age = Math.min(lifespanEdge(id, slot.realm.realm) - 1, reached + wait);
  const next = nextStage(slot.realm);
  const pill = next && next.realm !== slot.realm.realm ? gatePill(next.realm) : null;
  const purse = pill ? Math.floor(rng.next() * 0.9 * priceOf(pill)) : 0;
  return {
    name: slot.name ?? nameFor(id),
    nature: rollNature(id),
    power: slot.power,
    home: slot.home,
    template: CAST_TEMPLATE[slot.ped],
    seed: hashSeed(id),
    realm: slot.realm,
    born: Math.floor(day / YEAR - age),
    purse,
    region,
    pedigree: slot.ped,
    since: day - wait * YEAR,
    at: slot.home,
  };
}

/** A member's record for a seeded power, at the seat their realm holds (the top, its head). */
function seededMember(who: string, power: string, r: RealmStage, day: number, head: boolean) {
  return {
    who,
    power,
    since: day,
    seat: head ? ('head' as const) : seatByRealm(power, r),
    balance: 0,
    paid: monthIndex(day),
    quota: monthIndex(day),
  };
}

/**
 * Seeds a region's cast as the world day finds it (design § The regional cast, Who): every slot a
 * kept cast member, a member of their power at the seat their realm holds, the strongest its head;
 * one leading with revenge holds an enemy tie to someone of a power their own is at odds with.
 */
export function seedRegion(s: GameState, region: string): GameState {
  const day = s.calendar.day;
  const rng = new Rng(hashSeed(`cast/${s.lineage.id}/${region}`));
  const slots = slotsOf(region, rng);
  let w = s.world;
  const kept = { ...w.kept };
  const members = [...w.members];
  const tops = new Map<string, number>();
  slots.forEach((slot) => {
    if (!slot.power) return;
    tops.set(slot.power, Math.max(tops.get(slot.power) ?? 0, rank(slot.realm)));
  });
  const headed = new Set<string>();
  slots.forEach((slot, n) => {
    const id = slot.id ?? `cast:${region}:${n}`;
    if (kept[id]) return;
    kept[id] = seededKept(id, slot, region, day, rng);
    if (slot.power && isOrganization(slot.power)) {
      const head = !headed.has(slot.power) && rank(slot.realm) === tops.get(slot.power);
      if (head) headed.add(slot.power);
      members.push(seededMember(id, slot.power, slot.realm, day, head));
    }
  });
  w = { ...w, kept, members, cast: { ...(w.cast ?? {}), [region]: seasonIndex(day) } };
  w = seedFeuds(w, region);
  return { ...s, world: w };
}

/** The enemy ties a region's cast is seeded with: from revenge, toward a foe power's own. */
function seedFeuds(w: World, region: string): World {
  const ids = castIn(w, region);
  let out = w;
  for (const id of ids) {
    const k = out.kept[id]!;
    if (natureOf(out, id).motives[0] !== 'revenge' || !k.power) continue;
    const foes = ORG_ROWS.find((r) => r.id === k.power)?.foes ?? [];
    const near = ids.filter((o) => {
      const ko = out.kept[o]!;
      return (
        o !== id &&
        !!ko.power &&
        foes.includes(ko.power) &&
        Math.abs(realmIndex(ko.realm!.realm) - realmIndex(k.realm!.realm)) === 0
      );
    });
    if (!near.length) continue;
    const pick = new Rng(hashSeed(`feud/${id}`)).pick(near);
    out = addTie(out, { a: pick, b: id, kind: 'enemy' });
  }
  return out;
}

// ── The season ───────────────────────────────────────────────────────────────────────────────

function setKept(w: World, id: string, change: Partial<Kept>): World {
  const k = w.kept[id];
  return k ? { ...w, kept: { ...w.kept, [id]: { ...k, ...change } } } : w;
}

/** A cast member climbs while their stage's years have passed and its gate is in hand. */
function climb(s: GameState, id: string, day: number): GameState {
  let state = s;
  for (let n = 0; n < 8; n++) {
    const k = state.world.kept[id]!;
    const r = k.realm!;
    const next = nextStage(r);
    const y = stageYears(k.pedigree!, r);
    if (!next || y === null) break;
    const due = (k.since ?? day) + y * YEAR;
    if (day < due) break;
    let since = due;
    if (next.realm !== r.realm) {
      const pill = gatePill(next.realm);
      if (pill) {
        if (heldOf(state, id, pill) < 1) break;
        state = giveTo(state, id, pill, -1);
        // A gate waited on is broken through the season the pill came.
        since = day;
      }
    }
    state = { ...state, world: setKept(state.world, id, { realm: next, since }) };
  }
  return state;
}

function die(
  s: GameState,
  id: string,
  how: 'age' | 'hunt' | 'duel',
  place: string,
  day: number,
  by?: string,
): GameState {
  const k = s.world.kept[id]!;
  let w: World = {
    ...s.world,
    people: { ...s.world.people, [id]: 'dead' },
    members: s.world.members.filter((m) => m.who !== id),
  };
  w = setKept(w, id, { died: { day, how, place, ...(by ? { by } : {}) }, at: place });
  w = recordDeed(
    w,
    {
      kind: 'death',
      actor: by ?? id,
      victim: id,
      place,
      power: k.power,
      witnesses: [],
      region: k.region,
    },
    day,
  ).world;
  // A death by someone's hand is a loved one killed to their companion and kin.
  if (by) {
    for (const t of tiesOf(w, id)) {
      if (t.other === by || w.people[t.other] === 'dead') continue;
      if (t.kind === 'kin' || t.kind === 'dao-companion')
        w = remember(w, { holder: t.other, about: by, row: 'killed-loved' }, day);
    }
  }
  return { ...s, world: w };
}

/** The next pill someone's purse saves for: the gate into the realm above, if it has one. */
function savingFor(k: Kept): string | null {
  const r = k.realm!;
  const up = REALMS[realmIndex(r.realm) + 1];
  return up ? gatePill(up.id) : null;
}

const hasTie = (w: World, id: string, kinds: readonly string[]) =>
  tiesOf(w, id).filter(
    (t) => kinds.includes(t.kind) && w.people[t.other] !== 'dead' && !!w.kept[t.other],
  );

/** Someone's want's points (content/cast.ts `WANT_POINTS`). */
export function wantPoints(s: GameState, id: string, day: number): Record<WantId, number> {
  const k = s.world.kept[id]!;
  const n = natureOf(s.world, id);
  const out = Object.fromEntries(WANT_IDS.map((w) => [w, 0])) as Record<WantId, number>;
  for (const want of WANT_IDS) {
    for (const m of WANT_MOTIVES[want]) {
      const i = n.motives.indexOf(m);
      if (i >= 0) out[want] += i === 0 ? WANT_POINTS.first : WANT_POINTS.motive;
    }
  }
  out.home += WANT_POINTS.homeFloor;
  if (k.realm!.stage === realm(k.realm!.realm).stages) out.ambition += WANT_POINTS.lastStage;
  const pill = savingFor(k);
  if (pill && purseOf(s, id) < priceOf(pill)) out.greed += WANT_POINTS.short;
  out.revenge += WANT_POINTS.enemy * hasTie(s.world, id, ['enemy', 'sworn-enemy']).length;
  if (ageAt(k, day) >= WANT_POINTS.lonely.age && !hasTie(s.world, id, ['dao-companion']).length)
    out.family += WANT_POINTS.lonely.points;
  return out;
}

/** What a season's act is: its want and what it reaches for. */
export interface CastAct {
  want: WantId;
  /** The power joined, the enemy duelled, the companion taken. */
  target?: string;
  /** Where the act takes them. */
  place: string;
  /** A hunt a stage up, a trade instead of a hunt. */
  up?: boolean;
  trade?: boolean;
  /** A child, for a family act with a companion already. */
  child?: boolean;
}

/** A greater power their realm would sit inside: a house led a realm higher, its inner seat reached. */
function greaterPower(s: GameState, id: string): string | null {
  const k = s.world.kept[id]!;
  const mine = k.power && isOrganization(k.power) ? realmIndex(ladderOf(k.power).head) : -1;
  const rows = regionRows(k.region!).filter(
    (r) => r.type && isOrganization(r.id) && organization(r.id).preset.bond === 'house',
  );
  const fits = rows
    .map((r) => houseOf(r.id))
    .filter((p) => realmIndex(ladderOf(p).head) > mine)
    .filter((p) => seatOf(s.world, id, p) === null)
    .filter((p) => seatByRealm(p, k.realm!) !== 'outer')
    .filter((p) => canJoin(withoutHouse(s.world, id), id, p).ok)
    .sort(
      (a, b) => realmIndex(ladderOf(b).head) - realmIndex(ladderOf(a).head) || (a < b ? -1 : 1),
    );
  return fits[0] ?? null;
}

/** The world with someone's house membership set aside: joining another means leaving it. */
function withoutHouse(w: World, id: string): World {
  return {
    ...w,
    members: w.members.filter(
      (m) =>
        !(m.who === id && isOrganization(m.power) && organization(m.power).preset.bond === 'house'),
    ),
  };
}

/** The companion someone would take: unpartnered, of age, within a realm, nearest first. */
function companionFor(s: GameState, id: string, day: number, rng: Rng): string | null {
  const w = s.world;
  const k = w.kept[id]!;
  const ri = realmIndex(k.realm!.realm);
  const kin = new Set(tiesOf(w, id).map((t) => t.other));
  const free = castIn(w, k.region!).filter((o) => {
    const ko = w.kept[o]!;
    return (
      o !== id &&
      !!ko.realm &&
      ageAt(ko, day) >= ACTS.companionFrom &&
      Math.abs(realmIndex(ko.realm.realm) - ri) <= 1 &&
      !kin.has(o) &&
      !hasTie(w, o, ['dao-companion']).length
    );
  });
  if (!free.length) return null;
  const score = (o: string) => {
    const ko = w.kept[o]!;
    return (ko.power === k.power ? 0 : 10) + Math.abs(realmIndex(ko.realm!.realm) - ri);
  };
  const best = Math.min(...free.map(score));
  return rng.pick(free.filter((o) => score(o) === best));
}

/** Their youngest child's birth year, or null with none: those still a seed, and those kept. */
function lastChild(w: World, id: string): number | null {
  const born = [
    ...(w.kept[id]?.children ?? []),
    ...tiesOf(w, id)
      .filter((t) => t.kind === 'kin' && t.tie.a === id && t.relation === 'parent')
      .map((t) => w.kept[t.other]?.born)
      .filter((b): b is number => b !== undefined),
  ];
  return born.length ? Math.max(...born) : null;
}

/**
 * The season's act (design § Their season): the strongest want whose moment has come, equal points
 * broken by a roll seeded by the person and the season; home when nothing else has come.
 */
export function chooseAct(s: GameState, id: string, season: number, day: number): CastAct {
  const w = s.world;
  const k = w.kept[id]!;
  const rng = new Rng(hashSeed(`season/${id}/${season}`));
  const points = wantPoints(s, id, day);
  const home: CastAct = { want: 'home', place: k.home ?? k.region! };
  const moment = (want: WantId): CastAct | null => {
    switch (want) {
      case 'ambition': {
        const p = greaterPower(s, id);
        return p ? { want, target: p, place: p } : null;
      }
      case 'greed': {
        const pill = savingFor(k);
        if (!pill || purseOf(s, id) >= priceOf(pill)) return null;
        const n = natureOf(w, id);
        if (lean(n, 'nerve') < 0) {
          const m = homeMarket(k.home ?? '');
          return { want, trade: true, place: m?.place ?? k.home ?? k.region! };
        }
        const grounds = placesOf(k.region!, ['site'], ['den', 'cave']);
        const place = grounds.length ? rng.pick(grounds) : k.region!;
        return { want, place, up: lean(n, 'nerve') > 0 || lean(n, 'pride') > 0 };
      }
      case 'revenge': {
        const foes = hasTie(w, id, ['enemy', 'sworn-enemy']).filter(
          (t) => w.kept[t.other]!.region === k.region && !!w.kept[t.other]!.realm,
        );
        if (!foes.length) return null;
        const t = rng.pick(foes.map((f) => f.other).sort());
        const tk = w.kept[t]!;
        return { want, target: t, place: tk.at ?? tk.home ?? k.region! };
      }
      case 'family': {
        if (ageAt(k, day) < ACTS.companionFrom) return null;
        const mate = hasTie(w, id, ['dao-companion'])[0];
        if (!mate) {
          const c = companionFor(s, id, day, rng);
          return c ? { want, target: c, place: k.home ?? k.region! } : null;
        }
        const last = lastChild(w, id) ?? lastChild(w, mate.other);
        if (last !== null && yearOf(day) - last < ACTS.childEvery) return null;
        return { want, target: mate.other, child: true, place: k.home ?? k.region! };
      }
      case 'curiosity': {
        const far = placesOf(k.region!, ['forbidden', 'landmark', 'realm', 'site']);
        return { want, place: far.length ? rng.pick(far) : k.region! };
      }
      case 'home':
        return home;
    }
  };
  // The strongest points first: a weaker want's moment is never read once a stronger one has come.
  const levels = [...new Set(WANT_IDS.map((w) => points[w]))].sort((a, b) => b - a);
  for (const level of levels) {
    const best = WANT_IDS.filter((w) => points[w] === level)
      .map((want) => moment(want))
      .filter((a): a is CastAct => !!a);
    if (best.length) return best.length === 1 ? best[0]! : rng.pick(best);
  }
  return home;
}

/** A cast member as a fighter at their realm: their kit from their seed. */
function fighter(w: World, id: string) {
  const k = w.kept[id]!;
  // Their own id, so two of the cast never share one in a fight however their seeds fall.
  return { ...npcFrom(k.template!, k.seed!, k.realm!.realm, k.realm!.stage).combatant, id };
}

/** A season's take on the realm curve, in low. */
function take(r: RealmStage): number {
  return ACTS.huntTake * realmScale(r.realm);
}

function deed(
  s: GameState,
  kind: 'join' | 'hunt' | 'trade' | 'duel' | 'wed' | 'birth' | 'journey',
  id: string,
  place: string,
  day: number,
  victim?: string,
): GameState {
  const k = s.world.kept[id]!;
  const r = recordDeed(
    s.world,
    {
      kind,
      actor: id,
      victim: victim ?? null,
      place,
      power: k.power,
      witnesses: [],
      region: k.region,
    },
    day,
  );
  return { ...s, world: r.world };
}

/** Does a season's act: each a deed on the resolver, their whereabouts where it took them. */
export function doAct(
  s: GameState,
  id: string,
  act: CastAct,
  season: number,
  day: number,
): GameState {
  let state = { ...s, world: setKept(s.world, id, { at: act.place }) };
  const k = state.world.kept[id]!;
  switch (act.want) {
    case 'ambition': {
      const p = act.target!;
      let w = withoutHouse(state.world, id);
      w = {
        ...w,
        members: [...w.members, seededMember(id, p, k.realm!, day, false)],
      };
      w = setKept(w, id, { power: p, home: p, at: p });
      state = deed({ ...state, world: w }, 'join', id, p, day);
      break;
    }
    case 'greed': {
      if (act.trade) {
        state = {
          ...state,
          world: setKept(state.world, id, {
            purse: (k.purse ?? 0) + take(k.realm!) * ACTS.tradeTake,
          }),
        };
        state = deed(state, 'trade', id, act.place, day);
        break;
      }
      if (act.up) {
        const up = nextStage(k.realm!) ?? k.realm!;
        const beasts = rosterBeasts(up.realm);
        const rng = new Rng(hashSeed(`hunt/${id}/${season}`));
        const beast = generateBeast(rng.pick(beasts), up.realm, up.stage, rng).combatant;
        const edge = fightEdge(fighter(state.world, id), [beast]);
        state = deed(state, 'hunt', id, act.place, day);
        if (edge.verdict === 'short') return die(state, id, 'hunt', act.place, day);
      }
      const gain = take(k.realm!) * (act.up ? ACTS.upTake : 1);
      state = {
        ...state,
        world: setKept(state.world, id, { purse: (state.world.kept[id]!.purse ?? 0) + gain }),
      };
      if (!act.up) state = deed(state, 'hunt', id, act.place, day);
      break;
    }
    case 'revenge': {
      const foe = act.target!;
      const sworn = tiesOf(state.world, id).some(
        (t) => t.other === foe && t.kind === 'sworn-enemy',
      );
      const edge = fightEdge(fighter(state.world, id), [fighter(state.world, foe)]);
      const won = edge.verdict !== 'short';
      const [winner, loser] = won ? [id, foe] : [foe, id];
      state = deed(state, 'duel', id, act.place, day, foe);
      if (sworn) return die(state, loser, 'duel', act.place, day, winner);
      let w = remember(state.world, { holder: loser, about: winner, row: 'beat-me-duel' }, day);
      w = setKept(w, loser, { hurt: season + 1 });
      state = { ...state, world: w };
      break;
    }
    case 'family': {
      const mate = act.target!;
      if (!act.child) {
        state = { ...state, world: addTie(state.world, { a: mate, b: id, kind: 'dao-companion' }) };
        state = deed(state, 'wed', id, act.place, day, mate);
        break;
      }
      state = bear(state, id, day);
      state = deed(state, 'birth', id, act.place, day, mate);
      break;
    }
    case 'curiosity':
      state = deed(state, 'journey', id, act.place, day);
      break;
    case 'home':
      break;
  }
  return state;
}

const rosterBeasts = (r: RealmId) => {
  const all = CAST_BEASTS();
  const inBand = all.filter((t) => (t.band as readonly string[]).includes(r));
  return inBand.length ? inBand : all;
};

function CAST_BEASTS() {
  return BEAST_IDS.map((id) => rosterTemplate(id)).filter(
    (t): t is Extract<ReturnType<typeof rosterTemplate>, { kind: 'beast' }> => t.kind === 'beast',
  );
}

/** The roster's lone beasts, which a cast member's hunt meets. */
const BEAST_IDS = [
  'stone-skin-boar',
  'karst-python',
  'ridge-wolf',
  'thunder-deer',
  'marsh-crocodile',
  'stone-ape',
  'reef-ape',
  'strait-shark',
] as const;

/**
 * A child born to two of the cast: only a seed until 12 (a birth year on the parent who acts), then
 * tested: rooted, a cast member climbing from layer 1 in the parent's house with the higher
 * pedigree; not, a mortal the world doesn't keep.
 */
function bear(s: GameState, a: string, day: number): GameState {
  const k = s.world.kept[a]!;
  return { ...s, world: setKept(s.world, a, { children: [...(k.children ?? []), yearOf(day)] }) };
}

/** The children a parent bore who come of age this year: tested, and the rooted kept. */
function comeOfAge(s: GameState, parent: string, day: number): GameState {
  const k = s.world.kept[parent]!;
  const due = (k.children ?? []).filter((y) => yearOf(day) - y >= ACTS.childTested);
  if (!due.length) return s;
  let w = setKept(s.world, parent, {
    children: (k.children ?? []).filter((y) => !due.includes(y)),
  });
  const mate = tiesOf(w, parent).find((t) => t.kind === 'dao-companion')?.other;
  for (const born of due) {
    const id = `cast:${k.region}:child:${parent}:${born}`;
    if (w.kept[id] || new Rng(hashSeed(`rooted/${id}`)).int(1, ACTS.rootedOneIn) !== 1) continue;
    const km = mate ? w.kept[mate] : undefined;
    const ped =
      PEDIGREE_STEP[
        Math.max(
          PEDIGREE_STEP.indexOf(k.pedigree!),
          km?.pedigree ? PEDIGREE_STEP.indexOf(km.pedigree) : 0,
        )
      ]!;
    const child: Kept = {
      name: `${k.name.split(' ')[0]} ${new Rng(hashSeed(`name/${id}`)).pick(BORDER_WILDS_NAMES.given)}`,
      nature: rollNature(id),
      power: k.power,
      home: k.home,
      template: CAST_TEMPLATE[ped],
      seed: hashSeed(id),
      realm: QC(1),
      born,
      region: k.region,
      pedigree: ped,
      since: day,
      at: k.home ?? undefined,
    };
    w = { ...w, kept: { ...w.kept, [id]: child } };
    w = addTie(w, { a: parent, b: id, kind: 'kin', relation: 'parent' });
    if (mate) w = addTie(w, { a: mate, b: id, kind: 'kin', relation: 'parent' });
    if (k.power && isOrganization(k.power)) {
      const by = organization(k.power).preset.bond === 'kin' ? ('birth' as const) : undefined;
      if (canJoin(w, id, k.power, by ? { by } : {}).ok)
        w = { ...w, members: [...w.members, seededMember(id, k.power, QC(1), day, false)] };
    }
  }
  return { ...s, world: w };
}

/** Someone leaves the cast for the world: no record, no seat, no ties kept. */
function drop(s: GameState, id: string): GameState {
  const w = s.world;
  const kept = { ...w.kept };
  delete kept[id];
  const people = { ...w.people };
  delete people[id];
  return {
    ...s,
    world: {
      ...w,
      kept,
      people,
      members: w.members.filter((m) => m.who !== id),
      ties: w.ties.filter((t) => t.a !== id && t.b !== id),
      memories: w.memories.filter((m) => m.holder !== id),
      standing: w.standing.filter((r) => r.about !== id),
    },
  };
}

/**
 * One season of a cast member: the edge, the climb, then one act (or none, hurt). In summary, a
 * year's climb and one act, back home after it.
 */
function liveSeason(
  s: GameState,
  id: string,
  season: number,
  day: number,
  summary: boolean,
): GameState {
  const k = s.world.kept[id]!;
  if (!k.realm) return s;
  if (ageAt(k, day) >= lifespanEdge(id, k.realm.realm))
    return die(s, id, 'age', k.home ?? k.region!, day);
  let state = comeOfAge(s, id, day);
  state = climb(state, id, day);
  if ((k.hurt ?? -1) >= season) {
    return { ...state, world: setKept(state.world, id, { at: k.home ?? undefined }) };
  }
  const act = chooseAct(state, id, season, day);
  state = doAct(state, id, act, season, day);
  if (summary && state.world.people[id] !== 'dead')
    state = {
      ...state,
      world: setKept(state.world, id, { at: state.world.kept[id]!.home ?? undefined }),
    };
  return state;
}

/** A season of a region's cast, everyone in a fixed order. */
export function castSeason(
  s: GameState,
  region: string,
  season: number,
  summary = false,
): GameState {
  const day = season * SEASON_DAYS;
  let state = s;
  for (const id of castIn(s.world, region)) {
    if (!state.world.kept[id] || state.world.people[id] === 'dead') continue;
    state = liveSeason(state, id, season, day, summary);
  }
  if (season % 4 === 0) state = yearTurn(state, region, day);
  return state;
}

// ── The year's turn: the cast kept to its size, its old deeds folded ─────────────────────────

/** How many rising prospects a power seeds: the same split as the seeding's. */
function prospectsOf(region: string): Map<string | null, number> {
  const rows = regionRows(region);
  const isKingdom = (r: OrgRow) => !r.type;
  const prospect = (r: OrgRow) => !!r.type && PROSPECT_TYPES.includes(r.type);
  const q = split(
    CAST_SEEDING.rising,
    rows.map((r) => (r.population?.qi ?? 0) * (isKingdom(r) ? CAST_SEEDING.kingdomShare : 1)),
    (i) => (prospect(rows[i]!) ? CAST_SEEDING.risingSect : 1),
  );
  const out = new Map<string | null, number>();
  rows.forEach((r, i) => {
    const p = isOrganization(r.id) ? houseOf(r.id) : null;
    out.set(p, (out.get(p) ?? 0) + q[i]!);
  });
  out.set(null, (out.get(null) ?? 0) + CAST_SEEDING.unaffiliated.rising);
  return out;
}

const band = (k: Kept) => (k.realm ? realmIndex(k.realm.realm) : -1);

function yearTurn(s: GameState, region: string, day: number): GameState {
  let state = refill(s, region, day);
  state = trim(state, region, 1, CAST_SEEDING.foundation + CAST_SEEDING.unaffiliated.foundation);
  state = trim(state, region, 0, CAST_SEEDING.rising + CAST_SEEDING.unaffiliated.rising);
  state = fold(state, region, day);
  return state;
}

/** A power whose rising have dropped below its count takes new prospects of 14 to 16. */
function refill(s: GameState, region: string, day: number): GameState {
  const want = prospectsOf(region);
  const w = s.world;
  const ids = castIn(w, region);
  let state = s;
  for (const [power, n] of want) {
    const have = ids.filter(
      (id) => band(w.kept[id]!) === 0 && (w.kept[id]!.power ?? null) === power,
    ).length;
    for (let i = have; i < n; i++) {
      const id = `cast:${region}:p:${yearOf(day)}:${power ?? 'none'}:${i}`;
      if (state.world.kept[id]) continue;
      const rng = new Rng(hashSeed(id));
      const ped = pedigreeOf(power);
      const age = rng.int(CAST_UPKEEP.prospectAge[0], CAST_UPKEEP.prospectAge[1]);
      let r = QC(1);
      while (stageAge(ped, nextStage(r)!) <= age && r.stage < 9) r = nextStage(r)!;
      const home = power ?? homeOf(region, null, rng);
      const k: Kept = {
        name: nameFor(id),
        nature: rollNature(id),
        power,
        home,
        template: CAST_TEMPLATE[ped],
        seed: hashSeed(id),
        realm: r,
        born: yearOf(day) - age,
        region,
        pedigree: ped,
        since: day - (age - stageAge(ped, r)) * YEAR,
        at: home,
      };
      let ws: World = { ...state.world, kept: { ...state.world.kept, [id]: k } };
      if (power && isOrganization(power))
        ws = { ...ws, members: [...ws.members, seededMember(id, power, r, day, false)] };
      state = { ...state, world: ws };
    }
  }
  return state;
}

/**
 * A band past its count by more than a tenth lets its least notable fall out of the cast into the
 * world: the lowest seat, then the lowest stage, then the youngest. Never one tied to you, a written
 * person, or a Core Formation and above.
 */
function trim(s: GameState, region: string, realmBand: number, count: number): GameState {
  const w = s.world;
  const ids = castIn(w, region).filter((id) => band(w.kept[id]!) === realmBand);
  if (ids.length <= count * CAST_UPKEEP.over) return s;
  const seat = (id: string) => {
    const p = w.kept[id]!.power;
    return p && isOrganization(p) ? seatRank(seatOf(w, id, p) ?? 'outer') : -1;
  };
  const out = ids
    .filter((id) => !id.startsWith('elder:') && !threaded(w, id, s.player.id))
    .sort(
      (a, b) =>
        seat(a) - seat(b) ||
        w.kept[a]!.realm!.stage - w.kept[b]!.realm!.stage ||
        (w.kept[b]!.born ?? 0) - (w.kept[a]!.born ?? 0) ||
        (a < b ? -1 : 1),
    )
    .slice(0, ids.length - count);
  let state = s;
  for (const id of out) state = drop(state, id);
  return state;
}

/**
 * Deeds between the cast are kept whole a year (a death three), then folded into each actor's
 * tally; one you are in or know of never folds. A dead stranger's record goes with their death's
 * deed, and their faded memories with them.
 */
function fold(s: GameState, region: string, day: number): GameState {
  const w = s.world;
  const you = s.player.id;
  const cast = (id: string | null) => !id || (!!w.kept[id]?.region && id !== you);
  const tally: Record<string, Record<string, number>> = {};
  const keep = w.deeds.filter((d) => {
    if (d.region !== region || !cast(d.actor) || !cast(d.victim) || d.knownBy[you]) return true;
    const dead = d.kind === 'death' || (!!d.victim && w.people[d.victim] === 'dead');
    const years = dead ? DEED_YEARS.death : DEED_YEARS.kept;
    if (day - d.day < years * YEAR) return true;
    const t = (tally[d.actor] ??= {});
    t[d.kind] = (t[d.kind] ?? 0) + 1;
    return false;
  });
  let kept = w.kept;
  if (Object.keys(tally).length) {
    kept = { ...kept };
    for (const [id, t] of Object.entries(tally)) {
      const k = kept[id];
      if (!k) continue;
      const sum = { ...(k.tally ?? {}) };
      for (const [kind, n] of Object.entries(t)) sum[kind] = (sum[kind] ?? 0) + n;
      kept[id] = { ...k, tally: sum };
    }
  }
  const memories = w.memories.filter((m) => {
    if (!cast(m.holder) || !cast(m.about)) return true;
    const holder = kept[m.holder];
    if (!holder) return false;
    return memoryShare(m, holder.nature as never, day) > 0;
  });
  // A power's faded rows about one of the cast (a month's overstayed leave) go as they fade.
  const standing = w.standing.filter((r) => {
    if (!cast(r.about)) return true;
    const fade = STANDING_ROWS[r.row].fade;
    return fade === null || day - r.day < fade;
  });
  let state: GameState = { ...s, world: { ...w, deeds: keep, kept, memories, standing } };
  for (const id of Object.keys(kept)) {
    const k = kept[id]!;
    if (k.region !== region || !k.died) continue;
    if (day - k.died.day < DEED_YEARS.death * YEAR || threaded(state.world, id, you)) continue;
    state = drop(state, id);
  }
  return state;
}

// ── Made people and promotion (P3.9b's note, Jan's yes) ──────────────────────────────────

/** What a made person is when you next meet them: their realm, alive or not, and where they went. */
export interface WorkedOut {
  realm: RealmStage | null;
  alive: boolean;
  /** Where they went or how they died, one line; null while they stand where they were. */
  gone: string | null;
}

/** The stage on the encounters' pace table (content/pace.ts `NPC_PACE`) at an age. */
function pacedAt(ped: PedigreeId, age: number): RealmStage {
  let key = 'q1';
  PACE_AGES.forEach((a, i) => {
    if (age >= a) key = NPC_PACE[ped][i]!;
  });
  const stage = Number(key.slice(1));
  return key.startsWith('f') ? FE(stage) : QC(stage);
}

/**
 * A made person worked out from their seed and the time gone by, never ticked (P3.9b's note): their
 * realm at their pedigree's pace (never below the one they were met at), alive or dead by a
 * lifespan's edge keyed to the seed (a mortal's at 80 years), and still at home or gone, one decade
 * in four since the world first kept them. The same every time; null for the cast or someone the
 * world keeps without a birth year.
 */
export function workedOut(s: GameState, id: string): WorkedOut | null {
  const k = s.world.kept[id];
  if (!k || k.region || k.born === undefined) return null;
  const day = s.calendar.day;
  const age = ageAt(k, day);
  let realmNow: RealmStage | null = null;
  let edge: number;
  if (k.mortal || !k.template) {
    const u = new Rng(hashSeed(`edge/${id}`)).next();
    edge =
      CAST_UPKEEP.mortalYears * (LIFESPAN_EDGE.from + (LIFESPAN_EDGE.to - LIFESPAN_EDGE.from) * u);
  } else {
    const t = rosterTemplate(k.template);
    const ped: PedigreeId = t.kind === 'cultivator' ? t.pedigree : 'rogue';
    const paced = pacedAt(ped, age);
    realmNow = k.realm && rank(k.realm) > rank(paced) ? k.realm : paced;
    edge = lifespanEdge(id, realmNow.realm);
  }
  if (age >= edge) {
    const year = ERA_START_YEAR + Math.floor(k.born + edge);
    return { realm: realmNow, alive: false, gone: `died of age in ${year}` };
  }
  const since = k.made ?? day;
  const decades = Math.floor((day - since) / (10 * YEAR));
  for (let d = 1; d <= decades; d++) {
    const rng = new Rng(hashSeed(`gone/${id}/${d}`));
    if (rng.int(1, CAST_UPKEEP.goneOneIn) !== 1) continue;
    const region = s.map?.region ?? HOME_MAP_REGION;
    const cities = placesOf(region, ['city']).filter((c) => c !== k.home);
    const to = cities.length ? rng.pick(cities) : null;
    const name = to ? regionData(region)?.file.places.find((p) => p.id === to)?.name : null;
    return { realm: realmNow, alive: true, gone: name ? `left for ${name}` : 'left these parts' };
  }
  return { realm: realmNow, alive: true, gone: null };
}

/** Whether something ties a made person to you: a tie, or a memory of you worth 20 either way. */
function tiedToYou(w: World, id: string, you: string, day: number): boolean {
  if (w.ties.some((t) => (t.a === id && t.b === you) || (t.b === id && t.a === you))) return true;
  const n = w.kept[id]!.nature as Parameters<typeof memoryShare>[1];
  return w.memories.some(
    (m) =>
      m.holder === id &&
      m.about === you &&
      Math.abs(m.value) >= CAST_UPKEEP.promoteAt &&
      memoryShare(m, n, day) > 0,
  );
}

/**
 * Made people are promoted into the region's cast once something ties them to you (P3.9b's note):
 * worked out as of today, then ticked from here on, so the one you robbed who swore revenge lives
 * on while the soldier who only saw it is worked out when next met. A mortal stays made (the cast
 * cultivates), and the world stamps the day it first kept a made person.
 */
export function promoteMade(s: GameState, region: string): GameState {
  const day = s.calendar.day;
  const you = s.player.id;
  let w = s.world;
  for (const id of Object.keys(w.kept)) {
    const k = w.kept[id]!;
    if (k.region || k.born === undefined || w.people[id] === 'dead') continue;
    if (k.made === undefined) w = setKept(w, id, { made: day });
    if (k.mortal || !k.template || !tiedToYou(w, id, you, day)) continue;
    const now = workedOut({ ...s, world: w }, id)!;
    if (!now.alive) {
      w = { ...w, people: { ...w.people, [id]: 'dead' } };
      w = setKept(w, id, { died: { day, how: 'age', place: k.home ?? region } });
      continue;
    }
    const t = rosterTemplate(k.template);
    w = setKept(w, id, {
      region,
      pedigree: t.kind === 'cultivator' ? t.pedigree : 'rogue',
      realm: now.realm!,
      since: day,
      at: k.home ?? region,
    });
  }
  return w === s.world ? s : { ...s, world: w };
}

// ── The day step ─────────────────────────────────────────────────────────────────────────────

/**
 * The cast through a stretch of days (`from` the day it began): a region is seeded the first time
 * you stand in it, the Border Wilds with the world; as a season turns the purses shop for their
 * pills, then the region you stand in lives each season, the rest a year at a time in summary.
 */
export function castDay(s: GameState, from: number): GameState {
  const day = s.calendar.day;
  const here = s.map?.region ?? HOME_MAP_REGION;
  let state = s;
  for (const region of [HOME_MAP_REGION, here]) {
    if (state.world.cast?.[region] === undefined) state = seedRegion(state, region);
  }
  const now = seasonIndex(day);
  if (seasonIndex(from) === now && Object.values(state.world.cast ?? {}).every((x) => x >= now))
    return state;
  // The purses go looking for their pills as the season turns (N1's rule, read a season at a time),
  // and the made people something ties to you join the cast.
  state = castPills(state, from);
  state = promoteMade(state, here);
  for (const [region, last] of Object.entries(state.world.cast ?? {})) {
    for (let season = last + 1; season <= now; season++) {
      if (region === here) state = castSeason(state, region, season);
      else if (season % 4 === 0) state = castSeason(state, region, season, true);
    }
    state = { ...state, world: { ...state.world, cast: { ...state.world.cast, [region]: now } } };
  }
  return state;
}
