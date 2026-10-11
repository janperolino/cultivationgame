// The player's life around the cultivator rules: runs them on `state.player` with the right
// random stream, dates their notes into the chronicle, flares the glass at breakthroughs, keeps
// gentle mode's rewind, opens screens, and ends the life at the lifespan edge.
import { treeNode } from '../content/trees/index.ts';
import { technique } from '../content/techniques.ts';
import {
  attemptBreakthrough,
  cultivateDays,
  majorCheck,
  stepLabel,
  type LadderId,
  type Note,
} from './cultivation.ts';
import type { DayStep } from './loop.ts';
import {
  addChronicle,
  ageYears,
  atLifespanEdge,
  noteBreakthrough,
  unlock,
  withPlayer,
  withStream,
  type GameState,
} from './state.ts';
import { learnTechnique, setPracticing } from './techniques.ts';
import { learnNode, type LearnCheck } from './trees.ts';

/** The Trees screen opens once there is insight enough for a first node (design, the first hour). */
export const TREES_SCREEN_INSIGHT = 10;

function addNotes(s: GameState, notes: readonly Note[]): GameState {
  return notes.reduce((acc, n) => addChronicle(acc, n.kind, n.text), s);
}

/** A breakthrough flares the glass, and a qi one opens a new fracture. */
function flare(s: GameState, ladder: LadderId, major: boolean): GameState {
  const glass = {
    ...s.glass,
    flares: s.glass.flares + 1,
    fractures: s.glass.fractures + (ladder === 'qi' ? 1 : 0),
  };
  return noteBreakthrough({ ...s, glass }, major);
}

/** Opens the screens the player has reached. */
export function checkScreens(s: GameState): GameState {
  let next = s;
  if (s.player.insight.earned >= TREES_SCREEN_INSIGHT) {
    next = unlock(
      next,
      'trees',
      'Enough insight gathers to grasp a first principle: the trees open.',
    );
  }
  if (Object.keys(s.player.techniques).length > 0) next = unlock(next, 'techniques');
  return next;
}

/**
 * The game's day step for `advance`: the player cultivates for a stretch of at most a day, and
 * minor breakthroughs run on the auto setting. Major breakthroughs never happen here.
 */
export const cultivate: DayStep = (s, days) => {
  if (s.ended || days <= 0) return s;
  const { value: r, state } = withStream(s, 'breakthrough', (rng) =>
    cultivateDays(s.player, days, { day: s.calendar.day, rng }),
  );
  let next = addNotes(withPlayer(state, r.cultivator), r.notes);
  for (const b of r.breakthroughs) if (b.success) next = flare(next, b.ladder, b.major);
  return checkScreens(next);
};

export interface LifeBreakthrough {
  state: GameState;
  /** False when the attempt wasn't allowed; the state is unchanged. */
  attempted: boolean;
  success: boolean;
  major: boolean;
  odds: number;
}

/** The player attempts a ladder's next breakthrough, minor or major. */
export function breakThrough(
  s: GameState,
  which: LadderId,
  opts: { lastChance?: boolean } = {},
): LifeBreakthrough {
  const none = { state: s, attempted: false, success: false, major: false, odds: 0 };
  if (s.ended) return none;
  const { value: r, state } = withStream(s, 'breakthrough', (rng) =>
    attemptBreakthrough(s.player, which, { day: s.calendar.day, rng }, opts),
  );
  if (!r.attempted) return none;
  let next = addNotes(withPlayer(state, r.cultivator), r.notes);
  if (r.success) next = flare(next, which, r.major);
  return { state: next, attempted: true, success: r.success, major: r.major, odds: r.odds };
}

/** Tries the last chance at the lifespan edge; if it fails, or isn't possible, the life ends. */
export function attemptLastChance(s: GameState): LifeBreakthrough {
  if (!atLifespanEdge(s) || s.ended) {
    return { state: s, attempted: false, success: false, major: true, odds: 0 };
  }
  const check = majorCheck(s.player, 'qi');
  const result = breakThrough(s, 'qi', { lastChance: !check?.bar });
  if (result.success) return result;
  return { ...result, state: endLife(result.state) };
}

/** The life ends at the lifespan edge. The slot keeps the chronicle and offers a new life. */
export function endLife(s: GameState, cause = 'lifespan'): GameState {
  if (s.ended) return s;
  const p = s.player;
  const age = Math.floor(ageYears(p, s.calendar.day));
  const where = stepLabel(p.qi.realm, p.qi.stage);
  const text = `${p.name} dies at ${age}, at ${where}${p.qi.realm === 'qi-condensation' ? ' of Qi Condensation' : ''}.`;
  return { ...addChronicle(s, 'death', text), ended: { day: s.calendar.day, cause } };
}

/** The player learns a tree node with insight. */
export function learn(s: GameState, nodeId: string): { state: GameState; check: LearnCheck } {
  if (s.ended) return { state: s, check: { ok: false, reason: 'This life is over.' } };
  const r = learnNode(s.player, nodeId);
  if (!r.check.ok) return { state: s, check: r.check };
  const node = treeNode(nodeId);
  const next = addChronicle(
    withPlayer(s, r.cultivator),
    'node',
    `${s.player.name} comprehends ${node.name}.`,
  );
  return { state: next, check: r.check };
}

/** The player gains a technique, at Glimpse; the Techniques screen opens with the first. */
export function gainTechnique(s: GameState, id: string, how = 'learns'): GameState {
  if (id in s.player.techniques) return s;
  const t = technique(id);
  const next = addChronicle(
    withPlayer(s, learnTechnique(s.player, id)),
    'technique',
    `${s.player.name} ${how} ${t.name}.`,
  );
  return checkScreens(next);
}

/** Points the player's practice days at a technique, or at nothing. */
export function practice(s: GameState, id: string | null): GameState {
  return withPlayer(s, setPracticing(s.player, id));
}
