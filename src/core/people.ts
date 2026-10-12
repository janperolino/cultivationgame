// People (design § Professions, people and powers): a cultivator's records of everyone met, the
// slots cards name them by, the updates cards make, and each person's log, which is the typed
// chronicle filtered by their id. In M1 only cards update a record; M5 gives people lives of
// their own.
import type { CardEffect } from '../content/cards/index.ts';
import { origin, PLACE_HANZI, placeName } from '../content/origins.ts';
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
    // Someone new is news until you open their page.
    seen: 0,
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

/** The world day of the newest thing you know of them: a record update or an event naming them. */
export function newsDay(s: GameState, id: string): number {
  const r = s.player.people[id];
  let day = r?.heard ?? 0;
  for (let i = s.chronicle.length - 1; i >= 0; i--) {
    const e = s.chronicle[i]!;
    if (e.day <= day) break;
    if (e.actors.includes(id)) day = e.day;
  }
  return day;
}

/** Whether there is news of them you haven't read on their page: the gold dot. */
export function hasNews(s: GameState, id: string): boolean {
  const r = s.player.people[id];
  return !!r && newsDay(s, id) > r.seen;
}

/** The player has read their page: the news so far is no longer fresh. */
export function seePerson(s: GameState, id: string): GameState {
  const r = s.player.people[id];
  if (!r || !hasNews(s, id)) return s;
  const seen = newsDay(s, id);
  return withPlayer(s, { ...s.player, people: { ...s.player.people, [id]: { ...r, seen } } });
}

/** One group on the People screen: everyone met in one part of your life. */
export interface PeopleCircle {
  /** 'kin', 'road', or the atlas id of the place you met them. */
  key: string;
  label: string;
  hanzi: string;
  people: { id: string; record: PersonRecord }[];
}

/**
 * The People screen's circles (design § UI and screens, The People screen): kin and home first,
 * then everyone else by the place you met them, where you live now leading, and wanderers and
 * the placeless on the road last. From M5 the circles become your sect and factions.
 */
export function peopleCircles(c: Cultivator): PeopleCircle[] {
  const circles = new Map<string, PeopleCircle>();
  const firstMet = new Map<string, number>();
  for (const entry of knownPeople(c)) {
    const { id, record } = entry;
    const key =
      record.bond === 'kin' ? 'kin' : person(id).wanderer || !record.place ? 'road' : record.place;
    let circle = circles.get(key);
    if (!circle) {
      circle =
        key === 'kin'
          ? { key, label: 'Kin and home', hanzi: '家', people: [] }
          : key === 'road'
            ? { key, label: 'Met on the road', hanzi: '江湖', people: [] }
            : {
                key,
                label: `At ${placeName(key)}`,
                hanzi: PLACE_HANZI[key] ?? '',
                people: [],
              };
      circles.set(key, circle);
    }
    circle.people.push(entry);
    firstMet.set(key, Math.min(firstMet.get(key) ?? Infinity, record.met));
  }
  const rank = (k: string) => (k === 'kin' ? 0 : k === 'road' ? 3 : k === c.place ? 1 : 2);
  return [...circles.values()].sort(
    (a, b) => rank(a.key) - rank(b.key) || firstMet.get(a.key)! - firstMet.get(b.key)!,
  );
}
