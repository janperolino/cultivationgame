// Who acts in a scene (design § The resolver): the player, a follower or anyone the world puts
// there, all read the same way, since the rules take a cultivator and actions name who acts. An
// actor carries the rungs its lines are sized from, its Agility, the stats that name capabilities,
// the techniques it knows at their mastery, what it holds, the realm it shows if it veils it, and
// what stands behind it (a power, a sect, a soul lamp). Its combatant is how a fight takes it.
import { LADDERS, type LadderId } from '../../content/cultivation.ts';
import { item, hasItem } from '../../content/items.ts';
import { rarityRank } from '../../content/rarity.ts';
import { REALMS, realmIndex, type RealmId } from '../../content/realms.ts';
import type { StatId } from '../../content/stats.ts';
import { generateCultivator, type Npc } from '../combat/generate.ts';
import { fromCultivator, topRung, type Combatant } from '../combat/combatant.ts';
import { rungSize, type Rung } from '../combat/sheet.ts';
import { Rng } from '../rng.ts';
import { stats } from '../stats.ts';
import { mastery } from '../techniques.ts';
import type { GameState } from '../state.ts';
import { template } from '../../content/roster.ts';
import { statesOf, woundShare, type RealmStage } from './world.ts';
import type { Step } from './plan.ts';

/** Where an actor stands in a scene. */
export type ActorState = 'present' | 'hidden' | 'down' | 'dead' | 'fled' | 'gone';

export interface Actor {
  id: string;
  name: string;
  /** Everyone on a side acts together; the player's side is "you". */
  side: string;
  rungs: Record<LadderId, Rung>;
  agility: number;
  /** The stats that name capabilities (content/resolver.ts): perception, stealth, intimidate. */
  stats: Partial<Record<StatId, number>>;
  /** Techniques known, at their mastery level: 0 Glimpse to 4 Origin. */
  techniques: Record<string, number>;
  /** Items held, by id. */
  items: Record<string, number>;
  stones: number;
  /** The weapon they can draw: none, an ordinary one, or one of gold or better. */
  weapon: 'none' | 'plain' | 'gold';
  /** The share off every line their wounds take. */
  wound: number;
  /** The realm they show, when they veil their own (a cover). */
  shown?: RealmStage;
  /** Whether they wear another face. */
  disguised?: boolean;
  /** The power they answer to (an atlas id), and what kind stands behind them. */
  power?: string | null;
  backing?: 'sect' | 'great-sect' | null;
  /** A soul lamp kept for them: their power learns when they die, and with `face` who killed them. */
  lamp?: 'lamp' | 'face';
  /** Cornered: a desperate man doesn't scare. */
  desperate?: boolean;
  /** The people they know by sight, who a disguise doesn't fool if they see through it. */
  knows?: string[];
  /** Steps they take on their own, one a round: an NPC's stub until P3.4's motives, or a follower's orders. */
  plan?: Step[];
  /** Whose orders they keep. */
  follows?: string;
  state: ActorState;
  /** How a fight takes them; built when absent. */
  combatant?: Combatant;
}

/** The player's side. */
export const YOU = 'you';

/** Their realm and stage: their highest rung's. */
export function realmOfActor(a: Pick<Actor, 'rungs'>): RealmStage {
  const r = topRung(a);
  return { realm: r.realm, stage: r.stage };
}

/** The size of one of their lines, through their wounds. */
export function lineSize(a: Actor, l: LadderId): number {
  return rungSize(a.rungs[l]) * (1 - a.wound);
}

/** The size of their realm: their highest rung's, through their wounds. */
export function realmSizeOf(a: Actor): number {
  return Math.max(...LADDERS.map((l) => lineSize(a, l)));
}

/** The size a realm and stage stand at, with no grade. */
export function sizeAt(r: RealmStage): number {
  return rungSize({ realm: r.realm, stage: r.stage, grade: 0 });
}

/** A realm and stage moved down by stages, across realms: Foundation early less one is QC 9. */
export function stagesDown(r: RealmStage, n: number): RealmStage {
  let ri = realmIndex(r.realm);
  let stage = r.stage - Math.max(0, Math.floor(n));
  while (stage < 1 && ri > 0) {
    ri -= 1;
    stage += REALMS[ri]!.stages;
  }
  return { realm: REALMS[ri]!.id, stage: Math.max(1, stage) };
}

/** The lowest realm a cultivator can show: as many stages down as their concealment allows. */
export function lowestShown(a: Actor): RealmStage {
  return stagesDown(realmOfActor(a), a.stats.concealment ?? 0);
}

const STAT_KEYS: StatId[] = [
  'perception',
  'stealth',
  'force',
  'speed',
  'find',
  'intimidate',
  'concealment',
];

/** The player, or any cultivator the game keeps, as an actor; their world states read in. */
export function actorFromCultivator(s: GameState, id = s.player.id, side = YOU): Actor {
  const c = s.player;
  const all = stats(c);
  const statsHeld: Actor['stats'] = {};
  for (const k of STAT_KEYS) if (all[k]) statsHeld[k] = all[k];
  const techniques: Record<string, number> = {};
  for (const t of Object.keys(c.techniques)) techniques[t] = mastery(c, t).level;
  const weaponId = c.gear.weapon;
  const weapon = !weaponId
    ? 'none'
    : hasItem(weaponId) && rarityRank(item(weaponId).rarity) >= rarityRank('gold')
      ? 'gold'
      : 'plain';
  const day = s.calendar.day;
  const cover = statesOf(s.world, id, 'cover', day)[0];
  const combatant = fromCultivator(c, side);
  return {
    id,
    name: c.name,
    side,
    rungs: combatant.rungs,
    agility: combatant.agility,
    stats: statsHeld,
    techniques,
    items: { ...c.items },
    stones: c.stones,
    weapon,
    wound: woundShare(s.world, id, day),
    shown: cover?.data.shown,
    disguised: statesOf(s.world, id, 'disguise', day).length > 0,
    state: 'present',
    combatant,
  };
}

/** A generated NPC as an actor, on their side; mastery is their rolled one on every technique. */
export function actorFromNpc(n: Npc, extra: Partial<Actor> = {}): Actor {
  const c = n.combatant;
  const techniques: Record<string, number> = {};
  for (const t of Object.keys(c.techniques)) techniques[t] = n.rolls.mastery;
  const statsHeld: Actor['stats'] = {};
  for (const k of STAT_KEYS) if (c.mods[k]) statsHeld[k] = c.mods[k];
  return {
    id: c.id,
    name: n.name,
    side: c.side,
    rungs: c.rungs,
    agility: c.agility,
    stats: statsHeld,
    techniques,
    items: Object.fromEntries(Object.entries(c.items).map(([k, v]) => [k, v.n])),
    stones: 0,
    weapon: rarityRank(n.rolls.weapon) >= rarityRank('gold') ? 'gold' : 'plain',
    wound: 0,
    state: 'present',
    combatant: c,
    ...extra,
  };
}

/**
 * Someone from the Border Wilds roster at a realm and stage, rolled from a seed: the bandit at the
 * gate, the watch captain, a Gate disciple. The world's content, so its seed is its own.
 */
export function rosterActor(
  templateId: string,
  realm: RealmId,
  stage: number,
  id: string,
  side: string,
  extra: Partial<Actor> = {},
): Actor {
  const t = template(templateId);
  if (t.kind !== 'cultivator') throw new RangeError(`${templateId} is not a cultivator`);
  const npc = generateCultivator(t, realm, stage, Rng.fromString(id), { id, side });
  return actorFromNpc(npc, extra);
}

/**
 * An actor from parts: everyone at a realm and stage on every ladder, unless told otherwise. A
 * mortal is Qi Condensation layer 1 with a soul at it.
 */
export function plainActor(
  init: Pick<Actor, 'id' | 'name' | 'side'> & {
    realm?: RealmStage;
    rungs?: Partial<Record<LadderId, Rung>>;
  } & Partial<Omit<Actor, 'rungs'>>,
): Actor {
  const { realm, rungs, ...rest } = init;
  const r = realm ?? { realm: 'qi-condensation', stage: 1 };
  const at: Rung = { realm: r.realm, stage: r.stage, grade: 0 };
  return {
    agility: 10,
    stats: {},
    techniques: {},
    items: {},
    stones: 0,
    weapon: 'none',
    wound: 0,
    state: 'present',
    ...rest,
    rungs: { qi: rungs?.qi ?? at, body: rungs?.body ?? at, soul: rungs?.soul ?? at },
  };
}
