// The journal 志 (design § UI and screens, The journal; the opening redone, 2026-10-20): the quests
// you've taken. A quest is offered where it lives, by its giver; taken, its steps finish themselves
// as the engine sees the thing happen (`noteQuests`, run each day and on every action), and it
// ends when you go back to its giver and hand it in. You follow one at a time: its next step's
// place is a seal on the map and Cultivate's Today line names it.
import {
  hasQuest,
  quest,
  QUESTS,
  type Quest,
  type Deed,
  type QuestPlace,
  type StepGoal,
} from '../content/quests.ts';
import { MET } from './codex.ts';
import { hasShop, shop } from '../content/shops.ts';
import { contemplate } from './insight.ts';
import { gainCopy, gainMethod, gainTechnique } from './life.ts';
import { postingReached } from './map/board.ts';
import { membershipsOf } from './orgs/membership.ts';
import { effectiveWheel } from './wheel.ts';
import { standsAt } from './map/gate.ts';
import { placeById, type MapPlace } from './map/region.ts';
import { homeOf, mapOf } from './map/travel.ts';
import { receive, stonesOf, withStones } from './purse.ts';
import {
  addEvent,
  addItem,
  hasFlag,
  withPlayer,
  type GameState,
  unlock,
  type QuestState,
} from './state.ts';

export type JournalCheck = { ok: true; state: GameState } | { ok: false; reason: string };

/** The home place's id, once the map is made. */
function homeAt(s: GameState): string | null {
  const map = mapOf(s);
  return map ? homeOf(s, map).id : null;
}

/** A quest place on the life's map: `@home` is the start's home place. */
export function questPlace(s: GameState, at: QuestPlace): MapPlace | null {
  const map = mapOf(s);
  if (!map) return null;
  return at === '@home' ? homeOf(s, map) : (placeById(map, at) ?? null);
}

/** Whether you stand at a quest place, or inside it. */
function standsAtPlace(s: GameState, at: QuestPlace): boolean {
  const p = questPlace(s, at);
  return !!p && (s.map?.inside === p.id || standsAt(s, p));
}

/** The record of a quest taken, or undefined. */
export function questState(s: GameState, id: string): QuestState | undefined {
  return s.journal.quests.find((q) => q.id === id);
}

/** Quests under way: taken and not handed in. */
export function questsUnderway(s: GameState): QuestState[] {
  return s.journal.quests.filter((q) => q.handed === null);
}

/** Whether every step of a quest taken is done, so it waits to be handed in. */
export function stepsDone(q: QuestState): boolean {
  return q.step >= quest(q.id).steps.length;
}

/**
 * The quests a giver offers here: at this place (and from this person, for a person), not yet
 * taken. The test quest only on the dev console.
 */
export function offersAt(
  s: GameState,
  where: { kind: Quest['giver']['kind']; place: string; who?: string },
  opts: { dev?: boolean } = {},
): Quest[] {
  return QUESTS.filter((q) => {
    if (q.test && !opts.dev) return false;
    // Your origin's chain comes to you on Cultivate (core/chains.ts), never at a counter.
    if (q.chain) return false;
    if (questState(s, q.id)) return false;
    if (q.unless && MET[q.unless](s)) return false;
    if (q.giver.kind !== where.kind) return false;
    if (q.giver.place === ANY) return anyGiverHere(q, where);
    if (where.who !== undefined && q.giver.who !== where.who) return false;
    const p = questPlace(s, q.giver.place);
    return !!p && p.id === where.place;
  });
}

/** A giver of its kind anywhere (an introduction quest): handed in where it was taken. */
const ANY = '@any';

function anyGiverHere(q: Quest, where: { kind: Quest['giver']['kind']; who?: string }): boolean {
  const k = q.giver.shopKind;
  if (!k) return true;
  return !!where.who && hasShop(where.who) && shop(where.who).kind === k;
}

/** Where a quest is handed in: its giver's place, or for `@any` where it was taken. */
export function giverPlace(s: GameState, q: QuestState): MapPlace | null {
  const at = quest(q.id).giver.place;
  return at === ANY ? (q.at ? questPlace(s, q.at) : null) : questPlace(s, at);
}

/** Whether a step's goal holds now, counting events from the day the step opened. */
export function goalMet(s: GameState, goal: StepGoal, opened: number, id?: string): boolean {
  const p = s.player;
  if ('reach' in goal) return standsAtPlace(s, goal.reach);
  if ('flag' in goal) return hasFlag(p, goal.flag);
  if ('active' in goal) return p.activeMethods[goal.active] !== null;
  if ('hour' in goal) return effectiveWheel(p).includes(goal.hour);
  if ('kept' in goal) return p.jobs.some((h) => h.kept + (h.last?.kept ?? 0) >= goal.kept - 1e-9);
  if ('balance' in goal) return membershipsOf(s.world, p.id).some((m) => m.balance >= goal.balance);
  if ('posting' in goal) return id !== undefined && postingReached(s, id, goal.posting, opened);
  if ('met' in goal) return MET[goal.met](s);
  if ('craft' in goal) {
    const done = p.crafts.recent.filter((r) => r.day >= opened);
    const n =
      goal.craft === 'mended'
        ? done.filter((r) => r.mend).length
        : done.filter((r) => !r.mend && (goal.craft === 'batch' || (r.hand ?? 0) > 0)).length;
    return n >= goal.n;
  }
  if ('deed' in goal)
    return s.chronicle.some(
      (e) => e.type === 'did' && e.data.deed === goal.deed && e.day >= opened,
    );
  if ('hold' in goal) return (p.items[goal.hold] ?? 0) >= goal.n;
  if ('nodes' in goal) return p.nodes.length >= goal.nodes;
  if ('knows' in goal) return goal.knows in p.methods || goal.knows in p.techniques;
  if ('layer' in goal) {
    const l = p[goal.layer.ladder];
    const realm = goal.layer.realm ?? 'qi-condensation';
    if (l.realm !== realm) return l.realm !== 'qi-condensation' && realm === 'qi-condensation';
    return l.stage >= goal.layer.stage;
  }
  const match = goal.match ?? {};
  return s.chronicle.some(
    (e) =>
      e.type === goal.event &&
      e.day >= opened &&
      Object.entries(match).every(([k, v]) => e.data[k] === v),
  );
}

/** Whether a quest under way stands at a step waiting on this chronicle event (a buy). */
export function waitsOn(s: GameState, event: string): boolean {
  return s.journal.quests.some((q) => {
    if (q.handed !== null || !hasQuest(q.id)) return false;
    const g = quest(q.id).steps[q.step]?.goal;
    return !!g && 'event' in g && g.event === event;
  });
}

/**
 * A deed a quest's step waits on (changing money, a night at an inn, an elder's lesson): it writes
 * its line only while some step waits on it, so the chronicle isn't filled with every one.
 */
export function didDeed(s: GameState, deed: Deed): GameState {
  const waits = s.journal.quests.some((q) => {
    if (q.handed !== null || !hasQuest(q.id)) return false;
    const g = quest(q.id).steps[q.step]?.goal;
    return !!g && 'deed' in g && g.deed === deed;
  });
  return waits ? noteQuests(addEvent(s, 'did', { deed })) : s;
}

/** Moves every quest under way past the steps whose goals now hold; the same state if none. */
export function noteQuests(s: GameState): GameState {
  if (!s.journal.quests.some((q) => q.handed === null)) return s;
  let changed = false;
  const quests = s.journal.quests.map((q) => {
    if (q.handed !== null) return q;
    const steps = quest(q.id).steps;
    let { step, opened } = q;
    while (step < steps.length && goalMet(s, steps[step]!.goal, opened, q.id)) {
      step += 1;
      opened = s.calendar.day;
    }
    if (step === q.step) return q;
    changed = true;
    return { ...q, step, opened };
  });
  return changed ? { ...s, journal: { ...s.journal, quests } } : s;
}

/** Takes a quest offered to you; the first taken is the one followed. */
export function takeQuest(s: GameState, id: string): JournalCheck {
  if (questState(s, id)) return { ok: false, reason: 'You have taken it already.' };
  const q = quest(id);
  const here = s.map?.inside ?? homeAt(s);
  const record: QuestState = {
    id,
    taken: s.calendar.day,
    step: 0,
    opened: s.calendar.day,
    handed: null,
    ...(q.giver.place === ANY && here ? { at: here } : {}),
  };
  const journal = {
    quests: [...s.journal.quests, record],
    followed: s.journal.followed ?? id,
  };
  const opened = unlock({ ...s, journal }, 'journal', true);
  const next = addEvent(opened, 'quest', { quest: id, what: 'taken', title: q.title });
  return { ok: true, state: noteQuests(next) };
}

/** Follows a quest under way: its next step gets the map's seal and the Today line. */
export function followQuest(s: GameState, id: string): GameState {
  const q = questState(s, id);
  if (!q || q.handed !== null) return s;
  return { ...s, journal: { ...s.journal, followed: id } };
}

/** Drops a quest under way, any but your origin's; another under way is followed in its place. */
export function dropQuest(s: GameState, id: string): JournalCheck {
  const q = questState(s, id);
  if (!q || q.handed !== null) return { ok: false, reason: 'It isn’t under way.' };
  if (quest(id).origin) return { ok: false, reason: 'Your origin’s quests can’t be dropped.' };
  const quests = s.journal.quests.filter((x) => x.id !== id);
  return { ok: true, state: { ...s, journal: { quests, followed: nextFollowed(quests, s, id) } } };
}

function nextFollowed(quests: readonly QuestState[], s: GameState, gone: string): string | null {
  if (s.journal.followed !== gone) return s.journal.followed;
  return quests.find((x) => x.handed === null)?.id ?? null;
}

/** Whether a quest can be handed in now: every step done, and you stand where its giver is. */
export function handInCheck(
  s: GameState,
  id: string,
): { ok: true } | { ok: false; reason: string } {
  const q = questState(s, id);
  if (!q || q.handed !== null) return { ok: false, reason: 'It isn’t under way.' };
  if (!stepsDone(q)) return { ok: false, reason: 'Its steps aren’t done yet.' };
  const def = quest(id);
  const at = giverPlace(s, q);
  if (!at || !standsAtPlace(s, at.id))
    return { ok: false, reason: `Go back to ${def.giver.name}.` };
  return { ok: true };
}

/** Hands a quest in to its giver: its reward paid, and the next under way followed. */
export function handIn(s: GameState, id: string): JournalCheck {
  const check = handInCheck(s, id);
  if (!check.ok) return check;
  const def = quest(id);
  const r = def.reward;
  let next = s;
  let c = next.player;
  if (r.stones) c = withStones(c, receive(stonesOf(c), r.stones));
  for (const it of r.items ?? []) c = addItem(c, it.id, it.n);
  next = withPlayer(next, c);
  if (r.copy) next = gainCopy(next, r.copy, 'is given');
  if (r.technique) next = gainTechnique(next, r.technique, 'is taught');
  if (r.method) next = gainMethod(next, r.method, 'is taught');
  if (r.contemplate) next = withPlayer(next, contemplate(next.player, r.contemplate).cultivator);
  const quests = next.journal.quests.map((x) =>
    x.id === id ? { ...x, handed: next.calendar.day } : x,
  );
  next = { ...next, journal: { quests, followed: nextFollowed(quests, next, id) } };
  return {
    ok: true,
    state: addEvent(next, 'quest', { quest: id, what: 'handed', title: def.title }),
  };
}

/** The quest you follow, its next step, and where it goes: the step's place, or the giver's. */
export interface Following {
  quest: Quest;
  state: QuestState;
  /** What to do next: the step's text, or going back to the giver. */
  text: string;
  place: MapPlace | null;
}

export function following(s: GameState): Following | null {
  const id = s.journal.followed;
  const q = id ? questState(s, id) : undefined;
  if (!q || q.handed !== null) return null;
  const def = quest(q.id);
  const step = def.steps[q.step];
  if (!step) {
    return {
      quest: def,
      state: q,
      text: `Hand it in to ${def.giver.name}.`,
      place: giverPlace(s, q),
    };
  }
  return {
    quest: def,
    state: q,
    text: step.text,
    place: step.where ? questPlace(s, step.where) : null,
  };
}
