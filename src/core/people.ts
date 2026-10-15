// People (design § Professions, people and powers): a cultivator's records of everyone met, the
// slots cards name them by, the updates cards make, and each person's log, which is the typed
// chronicle filtered by their id. How someone feels is the memories they hold and what they are to
// you a tie, both in the world (resolver/opinion.ts); a record is only what you know of them. M5
// gives people lives of their own.
import type { CardEffect } from '../content/cards/index.ts';
import { origin, PLACE_HANZI, placeName } from '../content/origins.ts';
import { MEMORIES } from '../content/memories.ts';
import {
  hasPerson,
  KIN_INVERSE,
  KIN_OF,
  pathPeople,
  person,
  SHARED_SLOTS,
  TIE_INVERSE,
  TIE_OF,
  type TieId,
} from '../content/people.ts';
import { MOTIVES } from '../content/personality.ts';
import type { TrustWord } from '../content/resolver.ts';
import { realm, REALMS, type RealmId } from '../content/realms.ts';
import {
  withPlayer,
  type ChronicleEvent,
  type Cultivator,
  type GameState,
  type PersonRecord,
} from './state.ts';
import { BONDS } from '../content/bonds.ts';
import { bondOf } from './resolver/followers.ts';
import { fameWord, namesOf } from './resolver/names.ts';
import { knownNature, meetingShows, revealNature, seenNature } from './resolver/nature.ts';
import {
  addTie,
  knowsTie,
  natureOf,
  opinion,
  powersKnowing,
  remember,
  tieOf,
  tiesOf,
  trustLevel,
} from './resolver/opinion.ts';
import { standingOf } from './resolver/world.ts';

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

/** A card's plain mapping until P3.12: each step of its old regard is a memory of ±10. */
const CARD_REGARD_EACH = 10;

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

/**
 * A card's person effect: meeting someone starts their record and shows their outer leans; a tie
 * is what they become to you; the old regard lands as a memory that fades over a season.
 */
export function applyPersonEffect(
  s: GameState,
  e: Extract<CardEffect, { do: 'person' }>,
): GameState {
  const c = s.player;
  const id = resolveWho(c, e.who);
  if (!id) return s;
  const day = s.calendar.day;
  const met = c.people[id];
  const known: PersonRecord = met ?? {
    met: day,
    place: c.place,
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
    realm: realmNow,
    where: e.where ?? known.where,
    heard: day,
  };
  let world = s.world;
  if (!met) world = revealNature(world, id, meetingShows(natureOf(world, id)));
  if (e.tie && tieOf(world, c.id, id) !== e.tie)
    world = addTie(world, { a: id, b: c.id, kind: e.tie });
  if (e.regard) {
    world = remember(
      world,
      {
        holder: id,
        about: c.id,
        row: e.regard > 0 ? 'good-turn' : 'bad-turn',
        value: e.regard * CARD_REGARD_EACH,
        known: [c.id],
      },
      day,
    );
  }
  return { ...withPlayer(s, { ...c, people: { ...c.people, [id]: next } }), world };
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
export function peopleCircles(s: GameState): PeopleCircle[] {
  const c = s.player;
  const circles = new Map<string, PeopleCircle>();
  const firstMet = new Map<string, number>();
  for (const entry of knownPeople(c)) {
    const { id, record } = entry;
    const key =
      tieOf(s.world, c.id, id) === 'kin'
        ? 'kin'
        : person(id).wanderer || !record.place
          ? 'road'
          : record.place;
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

// ── What you see of them ─────────────────────────────────────────────────────────────────────

/** Anyone's name: a named person's, a kept one's, yours, or their id. */
export function nameOf(s: GameState, id: string): string {
  if (id === s.player.id) return s.player.name;
  if (hasPerson(id)) return person(id).name;
  return s.world.kept[id]?.name ?? id;
}

export interface MemoryView {
  text: string;
  /** What it counts as you read it, rounded. */
  value: number;
  /** The share of it left, for the fade bar. */
  share: number;
  fading: boolean;
  never: boolean;
  /** A motive you know that doubles it: "greed". */
  motive?: string;
}

export interface PersonView {
  /** What they are to you, or null. */
  tie: TieId | null;
  /** Their trust as you read it, and as a level −2 to +2. */
  trust: TrustWord;
  level: number;
  memories: MemoryView[];
  /** Memories they hold that you don't know of. */
  unknown: number;
  nature: ReturnType<typeof knownNature>;
  /** Their ties to others, as you know them. */
  ties: { label: string; name: string; id: string }[];
  /** Ties of theirs you haven't learned. */
  hiddenTies: number;
}

/** A person's page as you can read it: only what you know of them. */
export function personView(s: GameState, id: string): PersonView {
  const you = s.player.id;
  const day = s.calendar.day;
  const n = natureOf(s.world, id);
  const seen = seenNature(s.world, id, n);
  const o = opinion(s.world, id, you, day, { viewer: you, nature: seen });
  const memories = o.lines
    .slice()
    .sort((a, b) => Math.abs(b.now) - Math.abs(a.now))
    .map((l) => {
      const tag = MEMORIES[l.memory.row].tag;
      const motive = seen.motives.find(
        (m) => tag && (MOTIVES[m].tags as readonly string[]).includes(tag),
      );
      return {
        text: l.memory.note ?? MEMORIES[l.memory.row].reason,
        value: Math.round(l.now),
        share: l.share,
        fading: l.fading,
        never: l.never,
        ...(motive ? { motive } : {}),
      };
    })
    .filter((m) => m.value !== 0);
  const theirs = tiesOf(s.world, id).filter((t) => t.other !== you);
  const known = theirs.filter((t) => knowsTie(t.tie, you));
  return {
    tie: tieOf(s.world, you, id),
    trust: o.word,
    level: trustLevel(o.word),
    memories,
    unknown: o.unknown,
    nature: knownNature(s.world, id, n),
    // What they are to the other: "Sibling of Sha Wu" reads the tie from their end.
    ties: known.map((t) => {
      const label =
        t.kind === 'kin' && t.relation
          ? KIN_OF[KIN_INVERSE[t.relation]]
          : TIE_OF[TIE_INVERSE[t.kind]];
      return { label, name: nameOf(s, t.other), id: t.other };
    }),
    hiddenTies: theirs.length - known.length,
  };
}

/** The powers that hold reasons about you, and where you stand with each. */
export function powersView(s: GameState) {
  const day = s.calendar.day;
  return powersKnowing(s.world, s.player.id).map((power) => {
    const st = standingOf(s.world, power, s.player.id, day);
    return { power, name: placeName(power), word: st.word, capped: st.cap !== null };
  });
}

/** Why someone follows you, in words, or null if they don't (P3.4b). */
export function bondView(s: GameState, id: string): { words: string; breaks: string } | null {
  const b = bondOf(s.world, id);
  if (!b || b.leader !== s.player.id) return null;
  const words =
    b.kind === 'pay' ? `${BONDS.pay.name}, ${b.wage ?? 0} stones a month` : BONDS[b.kind].name;
  return { words, breaks: BONDS[b.kind].breaks };
}

/** Where your name is known: renown and infamy by region, each with how far it carries (P3.4b). */
export function namesView(s: GameState) {
  return namesOf(s.world, s.player.id, s.calendar.day).map((n) => ({
    region: n.region,
    name: placeName(n.region),
    renown: n.renown,
    infamy: n.infamy,
    words: fameWord(Math.max(n.renown, n.infamy)),
  }));
}
