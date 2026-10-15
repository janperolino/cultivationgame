// Button fights for the player (design § Combat): the Combat screen's flow, on the rules in
// core/combat/. Until M3's encounters bring fights into the world, the player spars: a foe rolled
// from the Border Wilds roster at their own realm and stage on the `people` stream, fought turn by
// turn on the life's `combat` stream. Nothing dies in a spar and nothing drops; what the fight
// spends comes home: the pills and talismans used, the toxicity the pills left, and the bond
// every worn artifact gained. A spar won from the brink is a moment on the Intent ladder.
import { BORDER_WILDS, template, type Template } from '../content/roster.ts';
import { realm } from '../content/realms.ts';
import { fromCultivator, wearFrom, type Combatant } from './combat/combatant.ts';
import {
  brinkDaos,
  combatantIn,
  fightOver,
  resolveTurn,
  startFight,
  winner,
  type Action,
  type Fight,
  type TurnResult,
} from './combat/fight.ts';
import { generateCultivator, generatePack } from './combat/generate.ts';
import { chooseAction, profile } from './combat/profile.ts';
import { bondFromFight } from './gear.ts';
import { intentMoment } from './intent.ts';
import { addEvent, realmOf, stageOf, withPlayer, withStream, type GameState } from './state.ts';

/** The player's side and the foe's in a spar. */
export const YOU = 'you';
export const FOES = 'foes';
/** A spar that runs this long is called a draw. */
export const SPAR_TURNS = 60;

export type SparResult = 'won' | 'lost' | 'fled' | 'yielded' | 'draw';

/** The roster's templates met at the player's realm, sparring partners for now. */
export function sparFoes(s: GameState): Template[] {
  const at = realmOf(s.player);
  return BORDER_WILDS.filter((t) => t.band.includes(at));
}

export interface SparStart {
  state: GameState;
  fight: Fight;
  /** Who the player faces, as the screen and the chronicle name them. */
  foe: string;
}

/**
 * Rolls a foe from a roster template at the player's realm and stage, on the `people` stream,
 * and opens the fight with the player first in the fight's order. A beast template rolls its
 * whole pack. Null when the template isn't met at the player's realm.
 */
export function startSpar(s: GameState, templateId: string): SparStart | null {
  const t = template(templateId);
  const at = realmOf(s.player);
  if (s.ended || !t.band.includes(at)) return null;
  const stage = Math.min(stageOf(s.player), realm(at).stages);
  const { value: npcs, state } = withStream(s, 'people', (rng) =>
    t.kind === 'beast'
      ? generatePack(t, at, stage, rng, FOES)
      : [generateCultivator(t, at, stage, rng, { id: `${t.id}-1`, side: FOES })],
  );
  const me = fromCultivator(s.player, YOU);
  const fight = startFight([me, ...npcs.map((n) => n.combatant)]);
  const foe = npcs.length > 1 ? `${t.name.toLowerCase()} (${npcs.length})` : npcs[0]!.name;
  return { state, fight, foe };
}

/**
 * One turn: the player's action, every foe's on its profile, resolved on the `combat` stream so
 * a seed replays the same fight.
 */
export function playTurn(
  s: GameState,
  fight: Fight,
  action: Action,
): { state: GameState; turn: TurnResult } {
  const foes = fight.combatants
    .filter((c) => c.side !== YOU && c.state === 'fighting')
    .map((c) => chooseAction(fight, c.id, profile(c.profile ?? 'fanatical')));
  const { value: turn, state } = withStream(s, 'combat', (rng) =>
    resolveTurn(fight, [action, ...foes], rng),
  );
  return { state, turn };
}

/** The player in the fight. */
export function you(fight: Fight, id: string): Combatant {
  return combatantIn(fight, id)!;
}

/** How the spar stands for the player: null while it runs. */
export function sparResult(fight: Fight, id: string): SparResult | null {
  const me = you(fight, id);
  if (me.state === 'fled') return 'fled';
  if (me.state === 'yielded') return 'yielded';
  if (me.state === 'down') return 'lost';
  if (fightOver(fight)) return winner(fight) === YOU ? 'won' : 'lost';
  if (fight.turn >= SPAR_TURNS) return 'draw';
  return null;
}

/**
 * Closes a spar: the pills and talismans the player used leave the Bag, the toxicity the pills
 * left stays, every worn artifact bonds by the turns fought, and the chronicle gets a line.
 */
export function endSpar(s: GameState, fight: Fight, foe: string): GameState {
  const p = s.player;
  const me = you(fight, p.id);
  const items = { ...p.items };
  for (const [id, held] of Object.entries(me.items)) if (id in items) items[id] = held.n;
  const back = wearFrom(bondFromFight({ ...p, items, toxicity: me.toxicity }, fight.turn), me);
  const result = sparResult(fight, p.id) ?? 'draw';
  let next = addEvent(withPlayer(s, back), 'spar', { foe, result, turns: fight.turn });
  // A fight won after acting with a Dao from the brink is that Dao's moment (core/intent.ts).
  if (result === 'won') for (const d of brinkDaos(me)) next = intentMoment(next, d, 'brink');
  return next;
}
