// The origin's chain (design § Character creation and the first hour, The origin's chain; The rogue
// start): four quests on the journal, offered on Cultivate one after another rather than at a
// counter, since they are your origin's. Testing day takes the first; handing one in offers the next.
// A step can carry an act done from Cultivate's Today line (the rogue's first work, the spar that
// always teaches, the rogue's first big job), and the board quest's road holds one fixed beast,
// Avoid round it or Bold through it, met once.
import { pathKey } from '../content/origins.ts';
import { CHAINS, quest, type Quest, type QuestAct } from '../content/quests.ts';
import { applyEffect, pushCard } from './cards.ts';
import {
  handIn,
  handInCheck,
  noteQuests,
  questState,
  takeQuest,
  type JournalCheck,
} from './journal.ts';
import { questPostingId } from './map/board.ts';
import { bandAt } from './map/depth.ts';
import { placeAhead } from './map/encounters.ts';
import type { RegionMap } from './map/region.ts';
import { askSpar } from './playFight.ts';
import { readCopy } from './life.ts';
import { addEvent, addFlag, hasFlag, withPlayer, type GameState } from './state.ts';

/** The life's chain, its quests' ids in order; empty for a start with none (or an old life). */
export function chainOf(s: GameState): readonly string[] {
  const o = s.player.origin;
  return o ? (CHAINS[pathKey(o.id, o.choice)] ?? []) : [];
}

/** Testing day takes the chain's first quest (core/creation.ts). */
export function startChain(s: GameState): GameState {
  const first = chainOf(s)[0];
  if (!first || questState(s, first)) return s;
  const r = takeQuest(s, first);
  // The journal still waits for the first seclusion's screen to be built (core/codex.ts).
  return r.ok ? { ...r.state, unlocks: s.unlocks } : s;
}

/** The chain's next quest, offered on Cultivate once the one before it is handed in; else null. */
export function chainOffer(s: GameState): Quest | null {
  const ids = chainOf(s);
  // A life whose chain never began (made before the chains) is offered nothing.
  if (!ids.length || !questState(s, ids[0]!)) return null;
  for (let i = 1; i < ids.length; i++) {
    const before = questState(s, ids[i - 1]!);
    if (questState(s, ids[i]!)) continue;
    return before && before.handed !== null ? quest(ids[i]!) : null;
  }
  return null;
}

/** Takes the chain's offer, and follows it. */
export function takeChainOffer(s: GameState): JournalCheck {
  const q = chainOffer(s);
  if (!q) return { ok: false, reason: 'Nothing is offered.' };
  const r = takeQuest(s, q.id);
  if (!r.ok) return r;
  return { ok: true, state: { ...r.state, journal: { ...r.state.journal, followed: q.id } } };
}

/** The act the quest's step under way offers, or null. */
export function stepAct(s: GameState, id: string): QuestAct | null {
  const q = questState(s, id);
  if (!q || q.handed !== null) return null;
  return quest(id).steps[q.step]?.act ?? null;
}

/** The chain's quest whose step under way has an act, or null: what Today's line offers to do. */
export function actNow(s: GameState): { quest: Quest; act: QuestAct } | null {
  for (const id of chainOf(s)) {
    const act = stepAct(s, id);
    if (act) return { quest: quest(id), act };
  }
  return null;
}

/**
 * Does a step's act: the work and its pay at once, the spar opened on the stage, or the card
 * brought to the feed. Returns why not as a string.
 */
export function doAct(s: GameState, id: string): GameState | string {
  const act = stepAct(s, id);
  if (!act) return 'Nothing to do for it now.';
  if ('work' in act) {
    let next = s;
    for (const e of act.effects) next = applyEffect(next, e);
    // A copy the work pays goes on the reading stand at once: it is read before it is any use.
    for (const e of act.effects) if (e.do === 'copy') next = readCopy(next, e.id).state;
    next = addEvent(next, 'work', { work: act.work, quest: id, line: workLine(act.label) });
    return noteQuests(next);
  }
  if ('spar' in act) {
    const o = s.player.origin!;
    return askSpar(s, `chain:${pathKey(o.id, o.choice)}`);
  }
  return pushCard(s, act.card);
}

/** "Carry the message" → "carries the message", for the chronicle. */
function workLine(label: string): string {
  const [verb = '', ...rest] = label.split(' ');
  const v = verb.toLowerCase();
  const third = /(s|sh|ch|x)$/.test(v)
    ? `${v}es`
    : v.endsWith('y')
      ? `${v.slice(0, -1)}ies`
      : `${v}s`;
  return [third, ...rest].join(' ');
}

/** Hands a chain quest in from Cultivate, where its giver stands with you. */
export function handInHere(s: GameState, id: string): JournalCheck {
  const check = handInCheck(s, id);
  return check.ok ? handIn(s, id) : check;
}

/** The flag that marks a quest's road beast as placed, so it comes once. */
function roadFlag(id: string): string {
  return `road-met:${id}`;
}

/**
 * The board quest's road (design § The origin's chain, The board's road teaches the stances): once
 * its posting is taken and a course is set toward its spot, one beast stands ahead at the road's
 * middle, seen at the edge of your sight: Avoid goes round it, Careful leaves it waiting, Bold goes
 * into it.
 */
export function questRoad(s: GameState, map: RegionMap): GameState {
  const life = s.map;
  const course = life?.course;
  if (!life || !course) return s;
  let st = s;
  for (const q of st.journal.quests) {
    if (q.handed !== null) continue;
    const qp = quest(q.id).posting;
    if (!qp?.road || hasFlag(st.player, roadFlag(q.id))) continue;
    const held = life.postings.find((p) => p.id === questPostingId(q.id));
    if (!held || held.done) continue;
    const end = course.pts.at(-1)!;
    if (Math.hypot(end[0] - held.spot[0], end[1] - held.spot[1]) > 400) continue;
    const i = Math.floor(course.pts.length / 2);
    if (course.at >= i) continue;
    const at = course.pts[i]!;
    st = withPlayer(st, addFlag(st.player, roadFlag(q.id)));
    st = placeAhead(st, map, qp.road, Math.max(0, bandAt(map, at)), i, `road-${q.id}`);
  }
  return st;
}

/**
 * A life played as before the chains: its chain's records gone, so the seclusion deck isn't held
 * and nothing is offered. For tests and sims that aren't about the opening, as `finishAllGuides`.
 */
export function withoutChain(s: GameState): GameState {
  const quests = s.journal.quests.filter((q) => !q.id.startsWith('chain-'));
  const followed = quests.some((q) => q.id === s.journal.followed) ? s.journal.followed : null;
  return { ...s, journal: { quests, followed } };
}
