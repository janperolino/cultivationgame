// A fight you play (design § Combat; § The world, The Combat screen leaves the rail; Fights you
// play): a fight that happens to you takes the stage and holds the clock until it ends, by a win,
// a flight, a surrender, a talk or a fall. Where it came from (a spar, a road encounter, a card)
// builds its start and takes its end back (core/playFight.ts); this holds what every fight shares.
// The save keeps the fight as its start on the `combat` stream and the actions you took, so a reload
// replays it to the same turn. The foes act on their profiles, so the same actions replay the same
// fight.
import {
  combatantIn,
  fightOver,
  resolveTurn,
  type Action,
  type Fight,
  type TurnResult,
} from './combat/fight.ts';
import { chooseAction, profile } from './combat/profile.ts';
import { wearFrom } from './combat/combatant.ts';
import { bondFromFight } from './gear.ts';
import { Rng } from './rng.ts';
import { withPlayer, withStream, type FightFrom, type GameState } from './state.ts';

/** A fight that runs this long ends with both sides drawing off. */
export const FIGHT_TURNS = 60;

/** How a fight ended for you. Talked: every foe yielded or fled, at least one to your words. */
export type FightEnd = 'won' | 'lost' | 'fled' | 'yielded' | 'talked' | 'draw';

/** Your action, without who acts: the fight knows it is yours. */
export type YourAction = Omit<Action, 'actor'>;

/**
 * Opens a fight on the stage: its rolls start from one drawn off the life's `combat` stream. The
 * caller passes the start it built (core/playFight.ts `fightStart`); without one it refuses, null.
 */
export function openFight(s: GameState, from: FightFrom, start: Fight | null): GameState | null {
  if (!start) return null;
  const { value: seed, state } = withStream(s, 'combat', (rng) => rng.int(0, 0x7fffffff));
  return { ...state, fight: { from, start: seed, now: seed, actions: [] } };
}

function foesAct(f: Fight, me: string): Action[] {
  const side = combatantIn(f, me)?.side;
  return f.combatants
    .filter((c) => c.side !== side && c.state === 'fighting')
    .map((c) => chooseAction(f, c.id, profile(c.profile ?? 'fanatical')));
}

/**
 * One turn: your action and every foe's on its profile. A foe whose tempo earns it a second action
 * picks it on its profile; yours repeats your main action (design § Combat, Speed is tempo).
 */
function turnOf(f: Fight, me: string, action: YourAction, rng: Rng): TurnResult {
  return resolveTurn(f, [{ ...action, actor: me }, ...foesAct(f, me)], rng, (at, id) => {
    const c = combatantIn(at, id);
    return c && id !== me ? chooseAction(at, id, profile(c.profile ?? 'fanatical')) : undefined;
  });
}

/** Plays your action in the open fight; null when no fight is open or it has ended. */
export function playTurn(
  s: GameState,
  fight: Fight,
  action: YourAction,
): { state: GameState; turn: TurnResult } | null {
  const rec = s.fight;
  if (!rec || fightEnd(fight, s.player.id)) return null;
  const rng = new Rng(rec.now);
  const turn = turnOf(fight, s.player.id, action, rng);
  const actions = [...rec.actions, action as Record<string, unknown>];
  return { state: { ...s, fight: { ...rec, now: rng.state, actions } }, turn };
}

/** The open fight as it stands, replayed from its start: what a reload puts back on the stage. */
export function replay(s: GameState, start: Fight): Fight {
  const rec = s.fight;
  if (!rec) return start;
  const rng = new Rng(rec.start);
  let f = start;
  for (const a of rec.actions) f = turnOf(f, s.player.id, a as YourAction, rng).fight;
  return f;
}

/** How the fight stands for you: null while it runs. */
export function fightEnd(f: Fight, me: string): FightEnd | null {
  const you = combatantIn(f, me);
  if (!you) return null;
  if (you.state === 'fled') return 'fled';
  if (you.state === 'yielded') return 'yielded';
  if (you.state === 'down') return 'lost';
  if (fightOver(f)) {
    const foes = f.combatants.filter((c) => c.side !== you.side);
    if (foes.some((c) => c.state === 'fighting')) return 'lost';
    // Talked only when a foe yielded to your side's words: a coward's own surrender is a win.
    const toWords = (c: (typeof foes)[number]) =>
      c.state === 'yielded' && !!c.yieldedTo && combatantIn(f, c.yieldedTo)?.side === you.side;
    if (foes.every((c) => c.state !== 'down') && foes.some(toWords)) return 'talked';
    return 'won';
  }
  if (f.turn >= FIGHT_TURNS) return 'draw';
  return null;
}

/** The share of your HP the fight took. */
export function hpLost(f: Fight, me: string): number {
  const you = combatantIn(f, me);
  return you && you.maxHp > 0 ? Math.max(0, 1 - you.hp / you.maxHp) : 0;
}

/**
 * What every fight leaves on you, whatever it was: the pills and talismans used leave the Bag, the
 * toxicity the pills left stays, every worn artifact bonds by the turns fought and the armor keeps
 * its wear. Closes the fight.
 */
export function afterFight(s: GameState, f: Fight): GameState {
  const p = s.player;
  const me = combatantIn(f, p.id);
  if (!me) return { ...s, fight: null };
  const items = { ...p.items };
  for (const [id, held] of Object.entries(me.items)) if (id in items) items[id] = held.n;
  const back = wearFrom(bondFromFight({ ...p, items, toxicity: me.toxicity }, f.turn), me);
  return { ...withPlayer(s, back), fight: null };
}
