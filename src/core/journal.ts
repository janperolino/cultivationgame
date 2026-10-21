// The journal 志 (design § UI and screens, The journal; the opening redone, 2026-10-20): the quests
// you've taken. A quest is offered where it lives, by its giver; taken, its steps finish themselves
// as the engine sees the thing happen (`noteQuests`, run each day and on every action), and it
// ends when you go back to its giver and hand it in. You follow one at a time: its next step's
// place is a seal on the map and Cultivate's Today line names it.
import { quest, QUESTS, type Quest, type QuestPlace, type StepGoal } from '../content/quests.ts';
import { gainCopy, gainTechnique } from './life.ts';
import { standsAt } from './map/gate.ts';
import { placeById, type MapPlace } from './map/region.ts';
import { homeOf, mapOf } from './map/travel.ts';
import { receive, stonesOf, withStones } from './purse.ts';
import { addEvent, addItem, withPlayer, type GameState, unlock, type QuestState } from './state.ts';

export type JournalCheck = { ok: true; state: GameState } | { ok: false; reason: string };

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
    if (questState(s, q.id)) return false;
    if (q.giver.kind !== where.kind) return false;
    if (where.who !== undefined && q.giver.who !== where.who) return false;
    const p = questPlace(s, q.giver.place);
    return !!p && p.id === where.place;
  });
}

/** Whether a step's goal holds now, counting events from the day the step opened. */
export function goalMet(s: GameState, goal: StepGoal, opened: number): boolean {
  const p = s.player;
  if ('reach' in goal) return standsAtPlace(s, goal.reach);
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

/** Moves every quest under way past the steps whose goals now hold; the same state if none. */
export function noteQuests(s: GameState): GameState {
  if (!s.journal.quests.some((q) => q.handed === null)) return s;
  let changed = false;
  const quests = s.journal.quests.map((q) => {
    if (q.handed !== null) return q;
    const steps = quest(q.id).steps;
    let { step, opened } = q;
    while (step < steps.length && goalMet(s, steps[step]!.goal, opened)) {
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
  const record: QuestState = {
    id,
    taken: s.calendar.day,
    step: 0,
    opened: s.calendar.day,
    handed: null,
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
  if (!standsAtPlace(s, def.giver.place))
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
      place: questPlace(s, def.giver.place),
    };
  }
  return {
    quest: def,
    state: q,
    text: step.text,
    place: step.where ? questPlace(s, step.where) : null,
  };
}
