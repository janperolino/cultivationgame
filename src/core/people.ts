// People (design § Professions, people and powers): a cultivator's records of everyone met, the
// slots cards name them by, the updates cards make, and each person's log, which is the typed
// chronicle filtered by their id. In M1 only cards update a record; M5 gives people lives of
// their own.
import type { CardEffect } from '../content/cards/index.ts';
import { origin } from '../content/origins.ts';
import {
  hasPerson,
  pathPeople,
  person,
  REGARD_MAX,
  REGARD_MIN,
  SHARED_SLOTS,
} from '../content/people.ts';
import { realm, REALMS, type RealmId } from '../content/realms.ts';
import {
  withPlayer,
  type ChronicleEvent,
  type Cultivator,
  type GameState,
  type PersonRecord,
} from './state.ts';

/** The person a slot names for this cultivator: {aunt}, {senior}, {mentor}, {peddler}; or none. */
export function slotPerson(c: Cultivator, slot: string): string | undefined {
  if (slot === 'mentor') {
    const mentor = pathPeople(c.origin).mentor;
    return mentor ? slotPerson(c, mentor) : undefined;
  }
  const own = c.origin ? origin(c.origin.id).people[slot] : undefined;
  if (own !== undefined) return hasPerson(own) ? own : undefined;
  return SHARED_SLOTS[slot];
}

/** The text every slot fills with: a person's name, or the origin's phrase for someone unnamed. */
export function personSlots(c: Cultivator): Record<string, string> {
  const out: Record<string, string> = {};
  const own = c.origin ? origin(c.origin.id).people : {};
  for (const [slot, v] of Object.entries(own)) out[slot] = hasPerson(v) ? person(v).name : v;
  for (const [slot, id] of Object.entries(SHARED_SLOTS)) out[slot] ??= person(id).name;
  const mentor = slotPerson(c, 'mentor');
  if (mentor) out.mentor = person(mentor).name;
  return out;
}

/** A slot or a person id, as a person id; undefined when it names nobody. */
export function resolveWho(c: Cultivator, who: string): string | undefined {
  return hasPerson(who) ? who : slotPerson(c, who);
}

/** The people a text names through its slots, in the order they appear. */
export function peopleIn(c: Cultivator, texts: readonly string[]): string[] {
  const ids: string[] = [];
  for (const t of texts) {
    for (const m of t.matchAll(/\{(\w+)\}/g)) {
      const id = slotPerson(c, m[1]!);
      if (id && !ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

/** Whether a path knows someone in the slot. */
export function knowsSlot(c: Cultivator, slot: string): boolean {
  const id = slotPerson(c, slot);
  return !!id && (id in c.people || Object.values(SHARED_SLOTS).includes(id));
}

const clampRegard = (r: number) => Math.round(Math.min(REGARD_MAX, Math.max(REGARD_MIN, r)));

/** A realm and stage a number of steps up, stopping at the top of the realms. */
function stepUp(r: RealmId, stage: number, by: number) {
  let i = REALMS.findIndex((x) => x.id === r);
  let st = stage;
  for (let k = 0; k < by; k++) {
    if (st < realm(REALMS[i]!.id).stages) st++;
    else if (i < REALMS.length - 1) {
      i++;
      st = 1;
    }
  }
  return { realm: REALMS[i]!.id, stage: st };
}

/** A card's person effect on the player's records: meeting someone starts their record. */
export function applyPersonEffect(
  s: GameState,
  e: Extract<CardEffect, { do: 'person' }>,
): GameState {
  const c = s.player;
  const id = resolveWho(c, e.who);
  if (!id) return s;
  const day = s.calendar.day;
  const known: PersonRecord = c.people[id] ?? {
    met: day,
    place: c.place,
    bond: 'acquaintance',
    regard: 0,
    realm: null,
    where: person(id).home ?? c.place,
    heard: day,
  };
  let realmNow = e.realm ?? known.realm;
  if (e.advance && realmNow) realmNow = stepUp(realmNow.realm, realmNow.stage, e.advance);
  if (person(id).mortal) realmNow = null;
  const next: PersonRecord = {
    ...known,
    bond: e.bond ?? known.bond,
    regard: clampRegard(known.regard + (e.regard ?? 0)),
    realm: realmNow,
    where: e.where ?? known.where,
    heard: day,
  };
  return withPlayer(s, { ...c, people: { ...c.people, [id]: next } });
}

/** A person's log: every event of the chronicle they were part of, oldest first. */
export function personLog(s: GameState, id: string): ChronicleEvent[] {
  return s.chronicle.filter((e) => e.actors.includes(id));
}

/** The newest events that name anyone besides the player, newest first: the People feed. */
export function peopleFeed(s: GameState, n = 8): ChronicleEvent[] {
  const out: ChronicleEvent[] = [];
  for (let i = s.chronicle.length - 1; i >= 0 && out.length < n; i--) {
    const e = s.chronicle[i]!;
    if (e.actors.some((a) => a !== s.player.id && a in s.player.people)) out.push(e);
  }
  return out;
}

/** The people the cultivator knows, the most recently heard of first. */
export function knownPeople(c: Cultivator): { id: string; record: PersonRecord }[] {
  return Object.entries(c.people)
    .map(([id, record]) => ({ id, record }))
    .sort((a, b) => b.record.heard - a.record.heard || a.record.met - b.record.met);
}
