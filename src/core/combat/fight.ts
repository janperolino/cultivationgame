// A fight, turn by turn (design § Combat). A turn takes one action from any number of actors on
// any number of sides, and every action names its actor, so allies, beasts and co-op parties need
// no rewrite. Each action is one main (technique, strike, defend, item, command, talk, flee) and
// one minor (move, take cover, swap artifact, interact). Actors go in Agility order, ties in the
// fight's own order, the minor before the main. Every roll comes from the rng passed in, the
// life's `combat` stream, so a seed replays the same fight. An attack is two sheets compared:
// the actor's Accuracy against the target's Evasion for the hit, the actor's Attack over the
// target's Defense for the damage. Every outcome carries the five tags (form, damage type, realm,
// result, status) that effects, sound and the log line read.
import {
  BACKFIRE_DAMAGE,
  COVER_EVASION,
  CREATIVITY_STEP,
  DAO_STEP,
  DEFEND_EVASION,
  DEFEND_QI,
  DEFEND_SHIELD,
  DETONATE_ATTACK,
  EVERGREEN_HP,
  FIRST_BLOOD_ORDER,
  FLAGS_EYE_SHARE,
  HALVED_HIT,
  MAX_CREATIVITY,
  MAX_RESIST,
  PROTECTIVE_DEEP,
  PROTECTIVE_DEEP_AT,
  PROTECTIVE_FULL,
  PROTECTIVE_QI,
  SHIELD_PER_SIZE,
  QI_REGEN,
  RESOLVE_BASE,
  SLOWED_ORDER,
  SOFT_GAP,
  STRIKE_FORM,
  STRIKE_POWER,
  TEMPO_BANK,
  TEMPO_MOST,
  UNBREAKING_DEFENSE,
  fullCount,
  reachCost,
  reachOf,
  statusInfo,
  statusOf,
  type DamageType,
  type OutcomeForm,
  type OutcomeResult,
  type StatusId,
  type Targets,
} from '../../content/combat.ts';
import { LADDERS, TOXICITY_MAX, type LadderId } from '../../content/cultivation.ts';
import { actionDaos, isCombatDao, type DaoStatKind } from '../../content/daos.ts';
import { baseOf, type Item } from '../../content/items.ts';
import { rarityAccuracy, rarityMultiplier, rarityRank } from '../../content/rarity.ts';
import { realm as realmInfo, realmIndex, tierStep, type RealmId } from '../../content/realms.ts';
import {
  BRINK_HP,
  DOMAIN,
  DOMAIN_FOE_DEFENSE,
  DOMAIN_FOE_EVASION,
  INTENT,
  INTENT_ACCURACY,
  INTENT_ATTACK,
  INTENT_FOE_ACCURACY,
} from '../../content/intent.ts';
import { daoStat } from '../../content/stats.ts';
import type { Form, Technique } from '../../content/techniques.ts';
import type { Rng } from '../rng.ts';
import { eyeHolds, fightArrays } from '../arrays.ts';
import { topStage } from '../intent.ts';
import { doseAt } from '../toxicity.ts';
import { backfireChance, judge } from './check.ts';
import {
  defense,
  evasion,
  mod,
  shieldDefense,
  graded,
  soulWound,
  statusFactor,
  statusFlag,
  tempo,
  weaken,
  type Combatant,
} from './combatant.ts';
import {
  comboMultiplier,
  damage,
  damagePhase,
  force,
  elementMultiplier,
  nextCombo,
  rollSpread,
  type Combo,
} from './damage.ts';
import { hitChance, rungSize, tierRung, tierScale, type Rung } from './sheet.ts';

export const TALK_STYLES = ['bluff', 'intimidate', 'bargain', 'surrender'] as const;
export type TalkStyle = (typeof TALK_STYLES)[number];

export type MainAction =
  | { type: 'technique'; id: string; target: string }
  | { type: 'strike'; target: string }
  | { type: 'defend' }
  /** A fight item strikes the target; a consume item restores the actor. */
  | { type: 'item'; id: string; target?: string }
  /**
   * A talisman volley (K11): a volley art throws this many of one stack of talismans, each a cast
   * of its own at full power.
   */
  | { type: 'volley'; id: string; item: string; target: string }
  /** Artifact detonation 自爆法宝 (K11): a piece from the Bag blown apart at the target. */
  | { type: 'detonate'; id: string; target: string }
  /** Flags set mid-fight (K11): an array from the Bag stands for your side to the fight's end. */
  | { type: 'flags'; id: string }
  /** Lets a beast on your side act this turn. */
  | { type: 'command'; id: string }
  | { type: 'talk'; style: TalkStyle; target: string }
  | { type: 'flee' };

export type MinorAction =
  | { type: 'move' }
  | { type: 'take_cover' }
  | { type: 'swap_artifact'; id?: string }
  /** The Fist Dao's Flurry: a fist strike at part of a strike's force. */
  | { type: 'flurry'; target: string }
  /** Knocks a feature onto another: a brazier onto dry grass sets it burning. */
  | { type: 'interact'; feature: string; onto?: string };

export interface Action {
  actor: string;
  main?: MainAction | null;
  minor?: MinorAction | null;
  /** 0 to +3 from the interpreter, counted only for real things and only once per trick. */
  creativity?: number;
  /** The scene features, techniques and items the action leans on. */
  uses?: readonly string[];
}

/** A thing in the scene a trick can use (design § Combat, free text): tagged, and maybe burning. */
export interface Feature {
  id: string;
  /** How the log names it: "grass". */
  name: string;
  /** flammable, fire, water, cover, high ground, fragile, dark. */
  tags: readonly string[];
  /** Turns left burning, if it burns. */
  burning?: number;
  /** The turn it caught, so it burns that turn out in full. */
  since?: number;
}

/**
 * An array on the fight's ground (K10, design § Sites and formations, Prepared ground; Jan's call
 * in K10's talk): laid at your site or set on open ground, it works for the side that laid it, each
 * by its own numbers. Binding and maze read its band against a foe's soul, Body-Fixing's rule:
 * binding holds a foe at its band or under one turn in `every`, maze takes `dull` of their
 * Accuracy. Killing strikes every foe inside at each turn's start and never misses. Warding stands
 * over its side as shield from the start (`onGround`).
 */
export interface FightArray {
  id: string;
  name: string;
  side: string;
  does: 'warding' | 'binding' | 'killing' | 'maze';
  /** Its band, as the land's are counted: (tier − 1) × 3 and its rarity's third. */
  band: number;
  every?: number;
  dull?: number;
  /** Bands more against a beast; or beasts alone. */
  beasts?: number;
  beastsOnly?: boolean;
  /** Killing: its strike's base, its Attack (rung size × rarity × strength) and type. */
  base?: number;
  attack?: number;
  type?: DamageType;
  /** Warding: the shield it stood over its side. */
  ward?: number;
}

/** What an array on the ground did at a turn's start: a strike, or a foe held. */
export interface GroundLine {
  array: string;
  name: string;
  does: FightArray['does'];
  target: string;
  damage?: number;
  hp?: { id: string; hp: number; max: number };
}

export interface Fight {
  /** Turns resolved so far. */
  turn: number;
  combatants: Combatant[];
  features: Feature[];
  /** The arrays on its ground (K10). */
  arrays?: FightArray[];
  /** Who joins it on a later turn (P3.9c, core/combat/joins.ts): the law, followers, a projection. */
  joins?: readonly Join[];
}

/**
 * Someone who joins a fight under way (P3.9c): on a set turn, or, for a backer's projection, the
 * turn after their charge's life is at stake.
 */
export interface Join {
  /** The turn they fight from; null for a projection, which comes when its charge falls low. */
  turn: number | null;
  who: Combatant;
  why: 'law' | 'follower' | 'bystander' | 'projection';
  /** A projection's charge. */
  charge?: string;
}

/** What one action did to one target: the five tags, then the numbers the log line shows. */
export interface Outcome {
  turn: number;
  actor: string;
  target: string | null;
  action: MainAction['type'];
  /** The technique or item used, if any. */
  id: string | null;
  form: OutcomeForm;
  type: DamageType | null;
  /** The actor's realm on the ladder the action used. */
  realm: RealmId;
  result: OutcomeResult;
  status: StatusId | null;
  /** The chance the action had: of landing, of escaping, of swaying. */
  chance?: number;
  damage?: number;
  /** Qi spent (or, negative, restored). */
  qi?: number;
  /** Who took the damage, HP after and their max: the target, or the actor on a backfire. */
  hp?: { id: string; hp: number; max: number };
  /**
   * The target's qi shield and armor after the hit, with what each took (P3.2); `damage` is
   * everything the hit dealt, bars and body together. On a defend, the actor's shield refilled.
   */
  bars?: Bars;
  /** The actor's qi after, and their pool. */
  pool?: { qi: number; max: number };
  /** Features this action's minor set burning. */
  features?: { id: string; name: string; burning: number }[];
}

/** Someone's qi shield and armor bars, and what a hit took from each. */
export interface Bars {
  id: string;
  shield: number;
  maxShield: number;
  armor: number | null;
  maxArmor: number | null;
  took: { shield: number; armor: number };
}

/** Damage a status dealt at the start of a turn. */
export interface Tick {
  id: string;
  status: StatusId;
  damage: number;
}

export interface TurnResult {
  fight: Fight;
  outcomes: Outcome[];
  ticks: Tick[];
  /** What the arrays on the ground did as the turn began (K10). */
  ground?: GroundLine[];
  /** Actions that did nothing, and why: a down actor, a frozen one, a technique they can't pay. */
  skipped: { actor: string; reason: string }[];
}

/** A fight between these combatants, in this order (ties in Agility go by it). */
export function startFight(combatants: Combatant[], features: Feature[] = []): Fight {
  return { turn: 0, combatants: combatants.map((c) => ({ ...c })), features: [...features] };
}

/**
 * The fight on ground where these arrays stand (K10). A warding array stands its shield over its
 * side's fighters at once, past their caps, shared among them; one that wards off beasts alone
 * stands only when every foe is a beast.
 */
export function onGround(f: Fight, arrays: readonly FightArray[]): Fight {
  if (!arrays.length) return f;
  const combatants = f.combatants.map((c) => ({ ...c }));
  for (const a of arrays) {
    if (a.does !== 'warding' || !a.ward) continue;
    const foes = combatants.filter((c) => c.side !== a.side);
    if (a.beastsOnly && !foes.every((c) => c.beast)) continue;
    const mine = combatants.filter((c) => c.side === a.side);
    for (const c of mine) c.shield += Math.round(a.ward / mine.length);
  }
  return { ...f, combatants, arrays: arrays.map((a) => ({ ...a })) };
}

/** A soul's band, as the land's are counted: three to a realm, by which third its stage stands in. */
function soulBand(c: Combatant): number {
  const r = c.rungs.soul;
  const stages = realmInfo(r.realm).stages;
  const third = Math.min(2, Math.floor(((r.stage - 1) * 3) / Math.max(1, stages)));
  return realmIndex(r.realm) * 3 + third;
}

/** Whether an array reaches a combatant: a foe of its side, a beast if it wants one, at its band. */
export function groundReaches(a: FightArray, c: Combatant): boolean {
  if (c.side === a.side || c.state !== 'fighting') return false;
  if (a.beastsOnly && !c.beast) return false;
  if (a.does === 'killing') return true;
  return soulBand(c) <= a.band + (c.beast ? (a.beasts ?? 0) : 0);
}

/** What a maze leaves of a combatant's aim: each one reaching them takes its share. */
function groundDull(f: Fight, c: Combatant): number {
  let left = 1;
  for (const a of f.arrays ?? [])
    if (a.does === 'maze' && groundReaches(a, c)) left *= 1 - (a.dull ?? 0);
  return left;
}

/**
 * A killing array's strike on one foe: its force through the foe's bars, never missing, protective
 * qi holding against an array a realm below them. Reads, never writes.
 */
function groundLanding(a: FightArray, target: Combatant): Landing {
  const type = a.type ?? 'physical';
  const element = elementMultiplier(damagePhase(type), target.element);
  const n: Numbers = {
    accuracy: 1,
    evasion: 1,
    attack: a.attack ?? 0,
    defense: defense(target, guardLadder(type)),
    weaken: 1,
    element,
    resist: target.resist[type] ?? 0,
    pierce: 1,
    crit: 0,
    critAttack: 1,
    sure: true,
    below: Math.floor(a.band / 3) < ownRealm(target),
  };
  const hit = force({ base: a.base ?? 0, attack: n.attack, element, result: 'hit' });
  return landing(target, hit, type, n);
}

/** What a killing array would deal a foe in one turn, for the edge's race. */
export function groundStrike(a: FightArray, target: Combatant): number {
  const l = groundLanding(a, target);
  return l.shield + l.armor + l.hp;
}

/**
 * The arrays at a turn's start: killing strikes every foe inside, binding holds those it reaches on
 * its turns (held for this turn alone), in the arrays' order.
 */
function groundTurn(f: Fight): GroundLine[] {
  const lines: GroundLine[] = [];
  for (const a of f.arrays ?? []) {
    if (a.does === 'killing') {
      for (const c of f.combatants) {
        if (!groundReaches(a, c)) continue;
        const dealt = land(c, groundLanding(a, c));
        lines.push({
          array: a.id,
          name: a.name,
          does: a.does,
          target: c.id,
          damage: dealt,
          hp: { id: c.id, hp: c.hp, max: c.maxHp },
        });
      }
    }
    if (a.does === 'binding' && (f.turn - 1) % Math.max(1, a.every ?? 2) === 0) {
      for (const c of f.combatants) {
        if (!groundReaches(a, c) || hasStatus(c, 'held')) continue;
        c.statuses = [...c.statuses, { id: 'held', turns: 1, dot: 0, since: f.turn - 1 }];
        lines.push({ array: a.id, name: a.name, does: a.does, target: c.id });
      }
    }
  }
  return lines;
}

export function combatantIn(f: Fight, id: string): Combatant | undefined {
  return f.combatants.find((c) => c.id === id);
}

/** The sides still standing. */
export function sidesStanding(f: Fight): string[] {
  return [...new Set(f.combatants.filter((c) => c.state === 'fighting').map((c) => c.side))];
}

/** Over once one side or none still fights. */
export function fightOver(f: Fight): boolean {
  return sidesStanding(f).length <= 1;
}

/** The winning side, once the fight is over and one side stands. */
export function winner(f: Fight): string | null {
  const sides = sidesStanding(f);
  return sides.length === 1 ? sides[0]! : null;
}

// ---------------------------------------------------------------- the turn

/**
 * Resolves one turn: statuses tick, then every action in Agility order, then each fighter whose
 * tempo has banked a whole action acts again (design § Combat, Speed is tempo), then durations run
 * down. An extra action comes from `again`, the fighter's profile when the engine fights it; with
 * none, or none given, it repeats the main action, at another foe if its target fell.
 */
export function resolveTurn(
  fight: Fight,
  actions: readonly Action[],
  rng: Rng,
  again?: (f: Fight, actor: string) => Action | undefined,
): TurnResult {
  const f: Fight = {
    turn: fight.turn + 1,
    combatants: fight.combatants.map((c) => ({ ...c, statuses: [...c.statuses] })),
    features: fight.features.map((x) => ({ ...x })),
    ...(fight.arrays ? { arrays: fight.arrays.map((a) => ({ ...a })) } : {}),
    ...(fight.joins ? { joins: fight.joins } : {}),
  };
  const outcomes: Outcome[] = [];
  const skipped: TurnResult['skipped'] = [];
  const ticks = startOfTurn(f);
  const ground = f.arrays?.length ? groundTurn(f) : [];

  const seen = new Set<string>();
  const order = actions
    .filter((a) => {
      if (seen.has(a.actor)) return false;
      seen.add(a.actor);
      return true;
    })
    .map((a) => ({ a, i: f.combatants.findIndex((c) => c.id === a.actor) }))
    .filter(({ a, i }) => {
      if (i < 0) skipped.push({ actor: a.actor, reason: 'not in the fight' });
      return i >= 0;
    })
    .sort(
      (x, y) => turnOrder(f, f.combatants[y.i]!) - turnOrder(f, f.combatants[x.i]!) || x.i - y.i,
    )
    .map(({ a }) => a);

  // A beast that waits on its owner acts only when someone on its side commands it this turn.
  const commanded = new Set<string>();
  for (const a of order) {
    const by = combatantIn(f, a.actor)!;
    if (a.main?.type === 'command' && by.state === 'fighting') {
      const beast = combatantIn(f, a.main.id);
      if (beast && beast.side === by.side) commanded.add(beast.id);
    }
  }

  /** One action: the minor, then the main; false when the actor couldn't act at all. */
  const perform = (a: Action): boolean => {
    const actor = combatantIn(f, a.actor)!;
    if (actor.state !== 'fighting') {
      skipped.push({ actor: a.actor, reason: actor.state });
      return false;
    }
    if (actor.needsCommand && !commanded.has(actor.id)) {
      skipped.push({ actor: a.actor, reason: 'not commanded' });
      return false;
    }
    actor.guard = 1;
    // Undertow: a foe chilled by it loses its minor action.
    const minorLost = a.minor && actor.statuses.some((s) => s.undertow);
    if (minorLost) skipped.push({ actor: a.actor, reason: 'undertow' });
    let lit: NonNullable<Outcome['features']> = [];
    if (a.minor && !minorLost) {
      if (a.minor.type === 'flurry') {
        const o = flurry(f, actor, a.minor.target, rng);
        if (typeof o === 'string') skipped.push({ actor: a.actor, reason: o });
        else outcomes.push(...o);
      } else lit = minor(f, actor, a.minor);
    }
    if (!a.main) return true;
    if (statusFlag(actor, 'skipMain')) {
      skipped.push({ actor: a.actor, reason: hasStatus(actor, 'held') ? 'held' : 'frozen' });
      return true;
    }
    const creativity = creative(f, actor, a);
    const os = main(f, actor, a.main, creativity, rng);
    if (typeof os === 'string') {
      skipped.push({ actor: a.actor, reason: os });
      return true;
    }
    if (lit.length > 0) os[0]!.features = lit;
    outcomes.push(...os);
    // Hundred Fists: a critical grants a second main action, once a fight.
    if (actor.marks.extraMain === f.turn && actor.state === 'fighting') {
      const more = retarget(f, actor, a.main);
      const res = more ? main(f, actor, more, 1, rng) : 'no target';
      if (typeof res !== 'string') outcomes.push(...res);
    }
    return true;
  };

  const acted = order.filter(perform);
  // Tempo: each who acted banks how far they outrun the fastest foe still standing, and acts again
  // on a whole action, in the turn's order, never more than twice a turn.
  for (const a of acted) {
    const actor = combatantIn(f, a.actor)!;
    if (actor.state !== 'fighting' || fightOver(f)) continue;
    if (!bank(f, actor)) continue;
    const next = again?.(f, actor.id) ?? repeat(f, actor, a);
    if (next) perform({ ...next, actor: actor.id });
  }

  endOfTurn(f);
  return { fight: f, outcomes, ticks, skipped, ...(ground.length ? { ground } : {}) };
}

/**
 * Banks this turn's tempo (design § Combat, Speed is tempo): how far the actor's tempo outruns the
 * fastest foe still standing. True when the bank reaches a whole action, which it spends; it
 * holds at most TEMPO_BANK after, so a fighter far ahead never stores turns.
 */
function bank(f: Fight, actor: Combatant): boolean {
  let fastest = 0;
  for (const c of f.combatants) {
    if (c.side !== actor.side && c.state === 'fighting') fastest = Math.max(fastest, tempo(c));
  }
  if (fastest <= 0) return false;
  let banked = (actor.marks.tempo ?? 0) + Math.max(0, tempo(actor) / fastest - 1);
  const extra = Math.min(TEMPO_MOST - 1, Math.floor(banked + 1e-9));
  banked = Math.min(TEMPO_BANK, banked - extra);
  mark(actor, 'tempo', banked);
  return extra > 0;
}

/**
 * An extra action with no profile to choose it: the same main again, at another foe if its target
 * fell. A main that spends goods (a volley, a piece blown apart, flags, a thing used) strikes
 * instead, so tempo never burns a second of what the screen priced once (review 2026-10-21).
 */
function repeat(f: Fight, actor: Combatant, a: Action): Action | undefined {
  const spends =
    a.main?.type === 'volley' ||
    a.main?.type === 'detonate' ||
    a.main?.type === 'flags' ||
    a.main?.type === 'item';
  const main: MainAction | null | undefined =
    a.main && spends
      ? { type: 'strike', target: 'target' in a.main ? (a.main.target ?? '') : '' }
      : a.main;
  const m = main && retarget(f, actor, main);
  return m ? { actor: actor.id, main: m } : undefined;
}

/**
 * Qi trickles back after the first turn, mending heals (more while a foe is rooted, with Deep
 * Roots), and damage over time ticks. Burns set by Sea of Flame tick as one: each burning foe on
 * a side takes every such burn on that side.
 */
function startOfTurn(f: Fight): Tick[] {
  const ticks: Tick[] = [];
  const sea = new Map<string, number>();
  for (const c of f.combatants) {
    if (c.state !== 'fighting') continue;
    for (const s of c.statuses) if (s.sea) sea.set(c.side, (sea.get(c.side) ?? 0) + s.dot);
  }
  for (const c of f.combatants) {
    if (c.state !== 'fighting') continue;
    if (c.burning !== undefined && f.turn > c.burning) burnedOut(c);
    if (f.turn > 1) c.qi = Math.min(c.maxQi, c.qi + Math.round(QI_REGEN * c.maxQi));
    const mend = mod(c, 'fightRegen');
    if (mend > 0 && f.turn > 1) {
      const rooted = f.combatants.some(
        (o) =>
          o.side !== c.side && o.state === 'fighting' && o.statuses.some((s) => s.id === 'rooted'),
      );
      const share = mend * (rooted ? 1 + mod(c, 'deepRoots') : 1);
      c.hp = Math.min(c.maxHp, c.hp + Math.round(share * c.maxHp));
    }
    for (const s of c.statuses) {
      if (s.dot <= 0) continue;
      const dealt = s.sea ? (sea.get(c.side) ?? s.dot) : s.dot;
      hurt(c, dealt);
      ticks.push({ id: c.id, status: s.id, damage: dealt });
    }
  }
  return ticks;
}

/**
 * Where an actor goes in the turn: Agility and Reach, First Blood ahead of everyone on the first
 * turn, and a foe slowed by Chill or Stagger behind everyone.
 */
function turnOrder(f: Fight, c: Combatant): number {
  let at = c.agility + mod(c, 'initiative');
  if (f.turn === 1 && mod(c, 'firstBlood') > 0) at += FIRST_BLOOD_ORDER;
  if (c.statuses.some((s) => s.slow)) at += SLOWED_ORDER;
  return at;
}

/** Statuses and burning features count down, except those that began this turn. */
function endOfTurn(f: Fight): void {
  for (const c of f.combatants) {
    c.statuses = c.statuses
      .map((s) => (s.since === f.turn ? s : { ...s, turns: s.turns - 1 }))
      .filter((s) => s.turns > 0);
  }
  for (const x of f.features) {
    if (x.burning === undefined || x.since === f.turn) continue;
    x.burning -= 1;
    if (x.burning <= 0) delete x.burning;
  }
}

/** Takes damage; Evergreen keeps a quarter of the HP once a fight when a blow would fell them. */
function hurt(c: Combatant, amount: number): void {
  c.hp = Math.max(0, c.hp - amount);
  if (c.hp <= 0 && mod(c, 'evergreen') > 0 && !c.marks.evergreen) {
    c.marks = { ...c.marks, evergreen: 1 };
    c.hp = Math.max(1, Math.round(EVERGREEN_HP * c.maxHp));
  }
  if (c.hp <= 0) c.state = 'down';
}

/** The minor action; returns the features it set burning. */
function minor(f: Fight, actor: Combatant, m: MinorAction): NonNullable<Outcome['features']> {
  if (m.type === 'take_cover') actor.guard *= COVER_EVASION;
  if (m.type !== 'interact' || !m.onto) return [];
  const from = f.features.find((x) => x.id === m.feature);
  const onto = f.features.find((x) => x.id === m.onto);
  if (!from || !onto) return [];
  // Fire onto something flammable sets it burning.
  if (from.tags.includes('fire') && onto.tags.includes('flammable')) {
    onto.burning = 2;
    onto.since = f.turn;
    return [{ id: onto.id, name: onto.name, burning: onto.burning }];
  }
  return [];
}

/**
 * Creativity counts only for real things (the scene's features, the actor's techniques and
 * items), and the same trick earns nothing the second time in a fight. Returns what it multiplies
 * Accuracy by.
 */
function creative(f: Fight, actor: Combatant, a: Action): number {
  const bonus = Math.min(MAX_CREATIVITY, Math.max(0, Math.round(a.creativity ?? 0)));
  if (bonus === 0) return 1;
  const real = (a.uses ?? []).filter(
    (u) => f.features.some((x) => x.id === u) || u in actor.techniques || u in actor.items,
  );
  if (real.length === 0) return 1;
  const trick = [...new Set(real)].sort().join('+');
  if (actor.tricks.includes(trick)) return 1;
  actor.tricks = [...actor.tricks, trick];
  return CREATIVITY_STEP ** bonus;
}

/** The mark an action with a Dao leaves when taken from the brink: "brink:sword". */
export const brinkMark = (dao: string) => `brink:${dao}`;

/** The Daos a combatant acted with from under a tenth of their HP this fight. */
export function brinkDaos(c: Combatant): string[] {
  return Object.keys(c.marks)
    .filter((k) => k.startsWith('brink:'))
    .map((k) => k.slice('brink:'.length));
}

/** Sets one of the fight's marks on a combatant, leaving the old marks untouched. */
function mark(c: Combatant, key: string, value = 1): void {
  c.marks = { ...c.marks, [key]: value };
}

/** What the Daos an action counts multiply Accuracy and Attack by: ×1.05 a tier. */
function daoFactor(actor: Combatant, daos: readonly string[]): number {
  const tiers = daos.reduce((sum, d) => sum + (actor.daos[d] ?? 0), 0);
  return DAO_STEP ** tiers;
}

/** One of the Daos' own stats, summed over the Daos an action counts: firePower, swordHit. */
function daoMod(actor: Combatant, daos: readonly string[], kind: DaoStatKind): number {
  let sum = 0;
  for (const d of daos) if (isCombatDao(d)) sum += mod(actor, daoStat(d, kind));
  return sum;
}

/** What an action's damage type adds beside its Dao: Fire damage and Poison damage. */
function typePower(actor: Combatant, type: DamageType): number {
  if (type === 'fire') return 1 + mod(actor, 'fireDamage');
  if (type === 'poison') return 1 + mod(actor, 'poisonDamage');
  return 1;
}

/** Which ladder an attack compares: soul for soul damage, else its own. */
function clashLadder(ladder: LadderId, type: DamageType): LadderId {
  return type === 'soul' ? 'soul' : ladder;
}

/** Which ladder sizes the target's Defense: the body, or the soul against soul damage. */
function guardLadder(type: DamageType): LadderId {
  return type === 'soul' ? 'soul' : 'body';
}

interface Attack {
  form: Form;
  type: DamageType;
  /** The base damage, sized by the technique's tier. */
  base: number;
  ladder: LadderId;
  /** The rung the attack strikes from: the actor's, or a talisman's own tier if higher. */
  rung: Rung;
  /** What multiplies the rung's size into Accuracy and into Attack. */
  accuracy: number;
  attack: number;
  qi: boolean;
  /** The Daos it counts (content/daos.ts): its tags and its damage type's element. */
  daos: readonly string[];
  /** How many foes it strikes, and the tier its reach is read at (design § Combat). */
  targets: Targets;
  tier: number;
  /** It cannot miss: a piece blown apart (K11). */
  sure?: boolean;
}

/** What a technique costs this actor in qi, its Daos' cost nodes included. */
export function techniqueCost(actor: Combatant, t: Technique): number {
  const daos = actionDaos(t.daos, t.damage);
  return Math.round(
    t.qiCost *
      tierScale(t.tier) *
      reachCost(t.targets, t.tier) *
      actor.techniqueCost *
      (actor.techniques[t.id]?.cost ?? 1) *
      Math.max(0, 1 + daoMod(actor, daos, 'Cost')),
  );
}

/** A technique as an attack: its tier sizes the base, its rarity, Daos and the weapon the rest. */
function techniqueAttack(actor: Combatant, id: string, creativity: number): Attack | string {
  const known = actor.techniques[id];
  if (!known) return `doesn't know ${id}`;
  const t: Technique = known.technique;
  const daos = actionDaos(t.daos, t.damage);
  const dao = daoFactor(actor, daos);
  const onWeapon = t.daos.includes(actor.weapon.kind);
  const physical = t.damage === 'physical' ? actor.physicalPower : 1;
  const ladder = clashLadder(t.ladder, t.damage);
  return {
    form: t.form,
    type: t.damage,
    base: t.power * tierScale(t.tier),
    ladder,
    rung: actor.rungs[ladder],
    accuracy:
      known.accuracy *
      dao *
      (1 + daoMod(actor, daos, 'Hit')) *
      rarityAccuracy(t.rarity) *
      (onWeapon ? actor.weapon.accuracy : 1) *
      creativity,
    attack:
      rarityMultiplier(t.rarity, tierStep(t.tier)) *
      dao *
      (1 + daoMod(actor, daos, 'Power')) *
      typePower(actor, t.damage) *
      actor.techniquePower *
      (known.power ?? 1) *
      physical *
      (onWeapon ? actor.weapon.technique : 1),
    qi: t.qiCost > 0,
    daos,
    targets: t.targets ?? 1,
    tier: t.tier,
  };
}

/**
 * A basic strike: physical, on the body ladder, with the weapon at its full band. Fist and Body
 * as One counts the body stages higher for a fist or bare hands.
 */
function strikeAttack(actor: Combatant, creativity: number): Attack {
  const daos = [actor.weapon.kind];
  const dao = daoFactor(actor, daos);
  const body = actor.rungs.body;
  const asOne = actor.weapon.kind === 'fist' ? mod(actor, 'bodyAsOne') : 0;
  return {
    form: STRIKE_FORM[actor.weapon.kind],
    type: 'physical',
    base: STRIKE_POWER * tierScale(realmIndex(body.realm) + 1),
    ladder: 'body',
    rung: asOne > 0 ? { ...body, stage: body.stage + asOne } : body,
    accuracy: dao * (1 + daoMod(actor, daos, 'Hit')) * actor.weapon.accuracy * creativity,
    attack: actor.weapon.strike * dao * (1 + daoMod(actor, daos, 'Power')) * actor.physicalPower,
    qi: false,
    daos,
    targets: 1,
    tier: realmIndex(body.realm) + 1,
  };
}

/** A fight item's strike: a talisman strikes at its own tier, even above yours. */
function itemAttack(actor: Combatant, it: Item, creativity: number): Attack | null {
  const use = it.uses.fight;
  if (!use) return null;
  const rung = itemRung(actor, it);
  const daos = actionDaos([], use.damage);
  return {
    form: use.form,
    type: use.damage,
    base: use.power * tierScale(it.tier),
    ladder: clashLadder('qi', use.damage),
    rung,
    accuracy: rarityAccuracy(it.rarity) * creativity,
    attack:
      rarityMultiplier(it.rarity, tierStep(it.tier)) *
      (1 + daoMod(actor, daos, 'Power')) *
      typePower(actor, use.damage),
    qi: false,
    daos,
    targets: use.targets ?? 1,
    tier: it.tier,
  };
}

/**
 * An attack's Accuracy: the rung's size times what feeds it, the Hit stat and the actor's
 * statuses, the Banners their allies carry and the sword pressure their foes carry.
 */
function attackAccuracy(f: Fight, actor: Combatant, a: Attack, quiet = false): number {
  let around = 1;
  // With no one carrying a Banner or a sword's pressure (`quiet`) it is exactly 1, and unread.
  for (const c of f.combatants) {
    if (quiet) break;
    if (c === actor || c.state !== 'fighting') continue;
    // A bearer of neither multiplies by exactly 1, so only the ones who carry it are met.
    if (c.side === actor.side) {
      const banner = mod(c, 'banner');
      if (banner !== 0) around *= 1 + banner;
    } else {
      const aura = mod(c, 'swordAura');
      if (aura !== 0) around *= Math.max(0, 1 - aura);
    }
  }
  const dull = f.arrays?.length ? groundDull(f, actor) : 1;
  return (
    rungSize(a.rung) * a.accuracy * actor.accuracy * statusFactor(actor, 'accuracy') * around * dull
  );
}

/** Everything an attack compares against one target, before the roll. */
interface Numbers {
  accuracy: number;
  evasion: number;
  attack: number;
  /** The body's Defense, or the soul's against soul damage, with what weakens it. */
  defense: number;
  /** What weakens every bar's Defense: Domain, Unbreaking on the bleeding. */
  weaken: number;
  element: number;
  /** The body's resist to the attack's type, after pierce. */
  resist: number;
  /** What remains of any resist after the attack's pierce. */
  pierce: number;
  /** Odds added to the critical chance. */
  crit: number;
  /** What a critical multiplies Attack by, beside the crit's own ×1.5. */
  critAttack: number;
  /** It cannot miss: Dragon Thrust. */
  sure: boolean;
  /** The actor stands a realm or more below the target, so the target's protective qi holds. */
  below: boolean;
}

const hasStatus = (c: Combatant, id: StatusId) => c.statuses.some((s) => s.id === id);

/** A combatant's realm, as an index: their highest ladder's (design § Scale of destruction). */
function ownRealm(c: Combatant): number {
  let top = -Infinity;
  for (const r of Object.values(c.rungs)) {
    const i = realmIndex(r.realm);
    if (i > top) top = i;
  }
  return top;
}

/**
 * Protective qi (design § Combat): what a bar lets through of a hit from a lower realm, by the
 * hit's Attack against the bar's Defense. A hundredth at or under half the Defense, a twentieth at
 * it, the full hit from a quarter past it, and straight ramps between, so a small edge moves a
 * little.
 */
export function protection(attack: number, defense: number): number {
  const r = attack / defense;
  if (r >= PROTECTIVE_FULL) return 1;
  if (r <= PROTECTIVE_DEEP_AT) return PROTECTIVE_DEEP;
  if (r <= 1) {
    return (
      PROTECTIVE_DEEP +
      ((PROTECTIVE_QI - PROTECTIVE_DEEP) * (r - PROTECTIVE_DEEP_AT)) / (1 - PROTECTIVE_DEEP_AT)
    );
  }
  return PROTECTIVE_QI + ((1 - PROTECTIVE_QI) * (r - 1)) / (PROTECTIVE_FULL - 1);
}

/**
 * What the Intent ladder does to one attack (design § The combat Daos, The Intent ladder). The
 * actor's stage in the Daos the action counts, against the target's highest in any Dao: Intent
 * lifts the action's Accuracy and Attack, Domain also lowers the target's Evasion and Defense.
 * The target's own intent, above the actor's highest, weighs on the actor's aim. A foe at your
 * stage or above cancels yours on them: intent meets intent.
 */
export function intentEdge(
  actor: Pick<Combatant, 'intent'>,
  target: Pick<Combatant, 'intent'>,
  daos: readonly string[],
): { accuracy: number; attack: number; evasion: number; defense: number } {
  const mine = daos.reduce((m, d) => Math.max(m, actor.intent[d] ?? 0), 0);
  const theirs = topStage(target.intent);
  const over = mine > theirs ? mine : 0;
  const pressed = theirs > topStage(actor.intent) ? INTENT_FOE_ACCURACY : 1;
  return {
    accuracy: (over >= INTENT ? INTENT_ACCURACY : 1) * pressed,
    attack: over >= INTENT ? INTENT_ATTACK : 1,
    evasion: over >= DOMAIN ? DOMAIN_FOE_EVASION : 1,
    defense: over >= DOMAIN ? DOMAIN_FOE_DEFENSE : 1,
  };
}

/** What `numbers` reads of the actor and the attack alone, the same against every target. */
interface Fixed {
  /** The attack's Attack through the first strike, the one sword and the saber's run. */
  attack: number;
  riptide: number;
  temperedEdge: number;
  crush: number;
  unbreaking: boolean;
  pierce: number;
  crit: number;
  woundedCrit: number;
  critDamage: number;
  executioner: number;
  sure: boolean;
  realm: number;
}

function fixedOf(f: Fight, actor: Combatant, a: Attack): Fixed {
  let attack = rungSize(a.rung) * a.attack;
  if (!actor.marks.struck) attack *= 1 + mod(actor, 'firstStrike');
  if (a.daos.includes('sword') && !actor.marks.oneSword) attack *= 1 + mod(actor, 'oneSword');
  if (a.daos.includes('saber')) attack *= 1 + mod(actor, 'momentum') * (actor.marks.momentum ?? 0);
  return {
    attack,
    riptide: 1 + mod(actor, 'riptide'),
    temperedEdge: 1 + mod(actor, 'temperedEdge'),
    crush: 1 + mod(actor, 'crush'),
    unbreaking: mod(actor, 'unbreaking') > 0,
    pierce: Math.max(0, 1 - daoMod(actor, a.daos, 'Pierce')),
    crit: daoMod(actor, a.daos, 'Crit'),
    woundedCrit: mod(actor, 'woundedCrit'),
    critDamage: 1 + mod(actor, 'critDamage'),
    executioner: 1 + mod(actor, 'executioner'),
    sure:
      a.sure === true ||
      (a.form === 'thrust' && mod(actor, 'dragonThrust') > 0 && actor.marks.dragonTurn !== f.turn),
    realm: ownRealm(actor),
  };
}

/**
 * The two sheets compared, with the Dao rules that move them: a first attack and the first sword
 * action of a fight, a saber's run of hits, water on the chilled, metal on the bleeding and earth
 * on the staggered, Unbreaking's lower armor, pierce, crits against the wounded, Dragon Thrust.
 */
function numbers(
  f: Fight,
  actor: Combatant,
  target: Combatant,
  a: Attack,
  /** The attack's Accuracy before the target's intent, when the caller already has it. */
  accuracy: number = attackAccuracy(f, actor, a),
  /** What the actor and the attack alone give, when the caller already has it. */
  fx: Fixed = fixedOf(f, actor, a),
): Numbers {
  let attack = fx.attack;
  if (a.type === 'water' && hasStatus(target, 'chilled')) attack *= fx.riptide;
  if (a.type === 'metal' && hasStatus(target, 'bleeding')) attack *= fx.temperedEdge;
  if (a.type === 'earth' && hasStatus(target, 'staggered')) attack *= fx.crush;
  const edge = intentEdge(actor, target, a.daos);
  let weaken = edge.defense;
  if (fx.unbreaking && hasStatus(target, 'bleeding')) weaken *= UNBREAKING_DEFENSE;
  const wounded = target.hp < target.maxHp / 2;
  attack *= edge.attack;
  const pierce = fx.pierce;
  return {
    accuracy: accuracy * edge.accuracy,
    evasion: evasion(target, a.ladder) * edge.evasion,
    attack,
    defense: defense(target, guardLadder(a.type)) * weaken,
    weaken,
    element: elementMultiplier(damagePhase(a.type), target.element),
    resist: (target.resist[a.type] ?? 0) * pierce,
    pierce,
    crit: fx.crit + (wounded ? fx.woundedCrit : 0),
    critAttack: fx.critDamage * (wounded ? fx.executioner : 1),
    sure: fx.sure,
    below: fx.realm < ownRealm(target),
  };
}

/** What a landed hit takes from each of a target's bars. */
interface Landing {
  shield: number;
  armor: number;
  hp: number;
}

/**
 * Where a landed hit's force goes (design § Combat, The sheet; P3.2): the qi shield first, against
 * its own Defense; what it can't hold passes to the armor, against the armor's Defense and its
 * material's resist; what is left reaches the body. Each bar that runs out passes on the share of
 * the force it didn't hold. Soul damage passes both bars and strikes the soul, taking HP as if it
 * were sized by the soul (`soulWound`). Reads, never writes.
 */
function landing(target: Combatant, hit: number, type: DamageType, n: Numbers): Landing {
  let left = hit;
  const out: Landing = { shield: 0, armor: 0, hp: 0 };
  if (type !== 'soul') {
    if (target.shield > 0) {
      const full = barFull(left, shieldDefense(target) * n.weaken, 0, n);
      if (full <= target.shield) {
        left = 0;
        out.shield = Math.round(full);
      } else {
        left *= 1 - target.shield / full;
        out.shield = target.shield;
      }
    }
    const worn = target.armor;
    if (left > 0 && worn && worn.hp > 0) {
      const full = barFull(left, worn.defense * n.weaken, (worn.resist[type] ?? 0) * n.pierce, n);
      if (full <= worn.hp) {
        left = 0;
        out.armor = Math.round(full);
      } else {
        left *= 1 - worn.hp / full;
        out.armor = worn.hp;
      }
    }
  }
  if (left > 0) {
    const wound = type === 'soul' ? soulWound(target) : 1;
    out.hp = Math.round(
      (left * (1 - Math.min(MAX_RESIST, n.resist)) * wound * ward(n, n.defense)) / n.defense,
    );
  }
  return out;
}

/** Each bar's protective qi reads the hit's plain Attack, before a crit or a combo, against it. */
const ward = (n: Numbers, def: number) => (n.below ? protection(n.attack, def) : 1);

/** What the force left would take from a bar of this Defense and resist, were it all to land. */
const barFull = (left: number, def: number, resist: number, n: Numbers): number =>
  (left * (1 - Math.min(MAX_RESIST, resist)) * ward(n, def)) / def;

/** Takes a landing off the target's bars and HP; returns everything it dealt. */
function land(target: Combatant, l: Landing): number {
  target.shield = Math.max(0, target.shield - l.shield);
  if (target.armor && l.armor > 0) {
    target.armor = { ...target.armor, hp: Math.max(0, target.armor.hp - l.armor) };
  }
  hurt(target, l.hp);
  return l.shield + l.armor + l.hp;
}

/**
 * Damage already figured, as a sweep's or a cleave's share: it meets the shield, then the armor,
 * then the body, a point for a point.
 */
function soak(target: Combatant, amount: number): Landing {
  let left = amount;
  const shield = Math.min(target.shield, left);
  left -= shield;
  const armor = Math.min(target.armor?.hp ?? 0, left);
  left -= armor;
  return { shield, armor, hp: left };
}

/** A combatant's bars after a hit, with what the hit took. */
function barsOf(c: Combatant, took: { shield: number; armor: number }): Bars {
  return {
    id: c.id,
    shield: c.shield,
    maxShield: c.maxShield,
    armor: c.armor?.hp ?? null,
    maxArmor: c.armor?.max ?? null,
    took,
  };
}

/** What an attack would do before it rolls: its chance of landing and its damage on a plain hit. */
export interface Preview {
  /** The chance of landing on the chosen foe. */
  chance: number;
  /** A plain hit's damage, summed over every foe the cast reaches. */
  damage: number;
  /** The qi it costs. */
  qi: number;
  /** The foes it reaches, the chosen one first. */
  foes: number;
  /** Expected damage over them all: each foe's chance times its plain hit. */
  expected: number;
  /** Expected damage on the chosen foe alone. */
  first: number;
}

/**
 * Prices an attacking main action against its target without rolling: the hit chance and a
 * plain hit's damage at the spread's middle, element, resist, combo and the Dao rules included,
 * over the whole cast for an art that strikes many. Null for an action that doesn't attack, can't
 * be paid, or has no standing target. The Combat screen shows this beside every technique, and
 * the profiles pick by it.
 */
export function preview(f: Fight, actorId: string, m: MainAction): Preview | null {
  const actor = combatantIn(f, actorId);
  if (!actor || actor.state !== 'fighting') return null;
  const pr = priced(f, actor, m);
  if (!pr) return null;
  const target = foe(f, actor, 'target' in m ? (m.target ?? '') : '');
  if (!target) return null;
  const { foes, share } = reached(f, actor, target, pr.spec);
  let damage = 0;
  let expected = 0;
  let chance = 0;
  let first = 0;
  foes.forEach((c, i) => {
    const { dealt, p } = priceFoe(f, actor, c, pr, share);
    if (i === 0) {
      chance = p;
      first = p * dealt;
    }
    damage += dealt;
    expected += p * dealt;
  });
  return { chance, damage, qi: pr.qi, foes: foes.length, expected, first };
}

/** An attacking main action priced but for its foes: the attack itself and what it reads of them. */
interface Priced {
  spec: Attack;
  qi: number;
  /** The attack's Accuracy before any foe's intent, the same against every foe. */
  accuracy: number;
  /** What the combo multiplies a plain hit by. */
  combo: number;
  fixed: Fixed;
}

/** The attack an action is, its qi paid for; null when it doesn't attack or can't be paid. */
function priced(f: Fight, actor: Combatant, m: MainAction, quiet = false): Priced | null {
  let a: Attack | string | null;
  let qi = 0;
  if (m.type === 'technique') {
    const known = actor.techniques[m.id];
    if (!known) return null;
    qi = techniqueCost(actor, known.technique);
    if (actor.qi < qi) return null;
    a = techniqueAttack(actor, m.id, 1);
  } else if (m.type === 'strike') {
    qi = strikeDrink(actor);
    if (actor.qi < qi) return null;
    a = strikeAttack(actor, 1);
  } else if (m.type === 'item') {
    const held = actor.items[m.id];
    a = held && held.n > 0 ? itemAttack(actor, held.item, 1) : null;
  } else if (m.type === 'detonate') {
    const held = actor.items[m.id];
    a = held && held.n > 0 && detonable(held.item) ? detonation(actor, held.item) : null;
  } else return null;
  if (!a || typeof a === 'string') return null;
  const spec = m.type === 'technique' ? rained(f, actor, a) : a;
  return {
    spec,
    qi,
    accuracy: attackAccuracy(f, actor, spec, quiet),
    combo: comboMultiplier(nextCombo(actor.combo, damagePhase(spec.type))),
    fixed: fixedOf(f, actor, spec),
  };
}

/**
 * A crowd that can't scratch you breaks (design § Combat): once a third of its side has fallen, a
 * fighter whose every hit is held to a twentieth or less, by protective qi on every bar still
 * standing of every foe it faces, flees on its turn. One who can still hurt someone holds on.
 */
export function routed(f: Fight, me: Combatant): boolean {
  let side = 0;
  let fallen = 0;
  for (const c of f.combatants) {
    if (c.side !== me.side) continue;
    side++;
    if (c.state !== 'fighting') fallen++;
  }
  if (fallen * 3 < side) return false;
  const foes = f.combatants.filter((c) => c.side !== me.side && c.state === 'fighting');
  if (foes.length === 0) return false;
  const mains: MainAction[] = [
    ...Object.keys(me.techniques).map((id) => ({ type: 'technique' as const, id, target: '' })),
    { type: 'strike', target: '' },
    ...Object.keys(me.items).map((id) => ({ type: 'item' as const, id, target: '' })),
  ];
  for (const m of mains) {
    const pr = priced(f, me, m);
    if (!pr) continue;
    for (const c of foes) {
      const n = numbers(f, me, c, pr.spec, pr.accuracy, pr.fixed);
      if (!n.below) return false;
      const bars = [n.defense];
      if (pr.spec.type !== 'soul') {
        if (c.shield > 0) bars.push(shieldDefense(c) * n.weaken);
        if (c.armor && c.armor.hp > 0) bars.push(c.armor.defense * n.weaken);
      }
      if (bars.some((d) => protection(n.attack, d) > PROTECTIVE_QI)) return false;
    }
  }
  return true;
}

/** One foe's plain hit, summed over its bars, and the chance the attack lands on it. */
function priceFoe(
  f: Fight,
  actor: Combatant,
  c: Combatant,
  pr: Priced,
  share: number,
): { dealt: number; p: number } {
  const n = numbers(f, actor, c, pr.spec, pr.accuracy, pr.fixed);
  const hit = force({
    base: pr.spec.base * share,
    attack: n.attack,
    element: n.element,
    result: 'hit',
    combo: pr.combo,
  });
  const l = landing(c, hit, pr.spec.type, n);
  return {
    dealt: l.shield + l.armor + l.hp,
    p: n.sure ? 1 : hitChance(n.accuracy, n.evasion),
  };
}

/**
 * Whether no one in the fight carries a Banner or a sword's pressure, so every attack's Accuracy
 * is the same against everyone and needs no look around the field. Read once per turn, before
 * anyone acts: nothing in a fight changes what a combatant carries.
 */
export function quietFight(f: Fight): boolean {
  return f.combatants.every((c) => mod(c, 'banner') === 0 && mod(c, 'swordAura') === 0);
}

/**
 * What pricing every foe as the target in turn shares: one foe's numbers don't depend on which foe
 * is the target, so each is priced once per attack however many foes are tried. Valid for one
 * actor, for as long as the fight stands as it did when it was made.
 */
export interface PreviewCache {
  actor: Combatant;
  /** No one in the fight carries a Banner or a sword's pressure (`quiet`). */
  quiet: boolean;
  /** The actor's living foes, in the fight's order. */
  living: Combatant[];
  index: Map<Combatant, number>;
  entries: Map<
    string,
    { pr: Priced; dealt: (number | undefined)[]; chance: (number | undefined)[] } | null
  >;
}

export function previewCache(f: Fight, actor: Combatant, quiet = false): PreviewCache {
  const living = f.combatants.filter((c) => c.side !== actor.side && c.state === 'fighting');
  return { actor, quiet, living, index: new Map(living.map((c, i) => [c, i])), entries: new Map() };
}

/**
 * `preview` for an actor and a living foe in hand, over a cache shared by the foes tried: the same
 * numbers, summed in the same order, without pricing each foe once per target.
 */
export function previewAt(
  f: Fight,
  actor: Combatant,
  m: MainAction,
  target: Combatant,
  cache: PreviewCache,
): Preview | null {
  const t = cache.index.get(target);
  if (actor !== cache.actor || actor.state !== 'fighting' || t === undefined) {
    return preview(f, actor.id, m);
  }
  const key = m.type === 'technique' || m.type === 'item' ? `${m.type}:${m.id}` : m.type;
  let e = cache.entries.get(key);
  if (e === undefined) {
    const pr = priced(f, actor, m, cache.quiet);
    e = pr && { pr, dealt: [], chance: [] };
    cache.entries.set(key, e);
  }
  if (!e) return null;
  const { living } = cache;
  const spec = e.pr.spec;
  const count = fullCount(spec.targets, spec.tier);
  const all = spec.targets === 'all';
  const share = all && living.length > count ? count / living.length : 1;
  const limit = all ? living.length : Math.min(count, living.length);
  let damage = 0;
  let expected = 0;
  let chance = 0;
  let first = 0;
  // The chosen foe first, then the rest in the fight's order, as `reached` lists them.
  for (let j = -1, taken = 0; taken < limit && j < living.length; j++) {
    const i: number = j < 0 ? t : j;
    if (j >= 0 && i === t) continue;
    let dealt = e.dealt[i];
    let p = e.chance[i];
    if (dealt === undefined || p === undefined) {
      const r = priceFoe(f, actor, living[i]!, e.pr, share);
      dealt = e.dealt[i] = r.dealt;
      p = e.chance[i] = r.p;
    }
    if (taken === 0) {
      chance = p;
      first = p * dealt;
    }
    damage += dealt;
    expected += p * dealt;
    taken++;
  }
  return { chance, damage, qi: e.pr.qi, foes: limit, expected, first };
}

/**
 * The foes a cast reaches (design § Combat, Arts that strike many): the chosen one, then the
 * nearest in the fight's order up to its count; an art that strikes all takes every foe, each at
 * its full count over their number past it.
 */
function reached(
  f: Fight,
  actor: Combatant,
  target: Combatant,
  a: Attack,
): { foes: Combatant[]; share: number } {
  const all = [target, ...others(f, actor, target)];
  const count = fullCount(a.targets, a.tier);
  if (a.targets !== 'all') return { foes: all.slice(0, count), share: 1 };
  return { foes: all, share: all.length > count ? count / all.length : 1 };
}

/**
 * Sword Rain: once a fight, a sword technique strikes all, as an art that strikes all does. It is
 * kept for a cast it widens: never on an art that strikes all already, or with no more foes
 * standing than the art reaches.
 */
function rained(f: Fight, actor: Combatant, a: Attack): Attack {
  const rain = a.daos.includes('sword') && mod(actor, 'swordRain') > 0 && !actor.marks.swordRain;
  if (!rain || a.targets === 'all') return a;
  let living = 0;
  for (const c of f.combatants) if (c.side !== actor.side && c.state === 'fighting') living++;
  return living > fullCount(a.targets, a.tier) ? { ...a, targets: 'all' } : a;
}

/** What a cast reads once for every foe it strikes: one action, one set of numbers. */
interface CastCtx {
  /** The attack's Accuracy before each foe's intent. */
  accuracy: number;
  fixed: Fixed;
  /** The combo the cast builds, which every foe's hit reads. */
  combo: Combo | null;
  /** The foes the cast strikes itself, which a sweep or a cleave never spills onto. */
  struck: ReadonlySet<Combatant>;
}

/**
 * One cast at every foe it reaches, each with its own roll for the hit and the crit and one
 * outcome each (design § Combat, Arts that strike many). The cast is one action (the code
 * review's major 4): qi deviation rolls once before it, and on a backfire no foe is struck; the
 * actor's numbers, a first strike and Dragon Thrust's sure hit are read once for every foe; it
 * stops when the caster is down; what spills over (a sweep, a cleave) spills from the chosen foe
 * onto foes the cast doesn't strike; and the combo, a saber's run and qi on a hit come from any
 * foe hit, once. Every attack, a single strike too, goes through here.
 */
function cast(
  f: Fight,
  actor: Combatant,
  target: Combatant,
  rng: Rng,
  a: Attack,
): Omit<Outcome, 'action'>[] {
  const { foes, share } = reached(f, actor, target, a);
  const spec = share < 1 ? { ...a, base: a.base * share } : a;
  const deviate = spec.qi ? backfireChance(actor.toxicity) : 0;
  if (deviate > 0 && rng.chance(deviate)) return [backfire(f, actor, target, spec)];
  const ctx: CastCtx = {
    accuracy: attackAccuracy(f, actor, spec),
    fixed: fixedOf(f, actor, spec),
    combo: nextCombo(actor.combo, damagePhase(spec.type)),
    struck: new Set(foes),
  };
  const out: Omit<Outcome, 'action'>[] = [];
  let hit = false;
  foes.forEach((c, i) => {
    if (actor.state !== 'fighting' || c.state !== 'fighting') return;
    const os = attack(f, actor, c, rng, spec, ctx, i === 0);
    if (os[0]!.result === 'hit' || os[0]!.result === 'critical') hit = true;
    out.push(...os);
  });
  if (hit) {
    actor.combo = ctx.combo;
    if (spec.daos.includes('saber')) mark(actor, 'momentum', (actor.marks.momentum ?? 0) + 1);
    const back = mod(actor, 'qiOnHit');
    if (back > 0) actor.qi = Math.min(actor.maxQi, actor.qi + Math.round(back * actor.maxQi));
  } else {
    actor.combo = null;
    if (mod(actor, 'cleavingTide') <= 0) mark(actor, 'momentum', 0);
  }
  return out;
}

/** Qi deviation: the action turns on its actor at half strength, with no element. */
function backfire(
  f: Fight,
  actor: Combatant,
  target: Combatant,
  a: Attack,
): Omit<Outcome, 'action'> {
  const n = numbers(f, actor, target, a);
  const dealt = damage({
    base: a.base * BACKFIRE_DAMAGE,
    attack: rungSize(a.rung) * a.attack,
    defense: defense(actor, guardLadder(a.type)),
    element: 1,
    resist: actor.resist[a.type] ?? 0,
    result: 'hit',
  });
  hurt(actor, dealt);
  actor.combo = null;
  return {
    turn: f.turn,
    actor: actor.id,
    target: target.id,
    id: null,
    form: a.form,
    type: a.type,
    realm: a.rung.realm,
    result: 'backfire',
    status: null,
    chance: n.sure ? 1 : hitChance(n.accuracy, n.evasion),
    damage: dealt,
    hp: { id: actor.id, hp: actor.hp, max: actor.maxHp },
  };
}

/** The qi a basic strike drinks: a weapon above your realm takes a share of the pool. */
function strikeDrink(actor: Combatant): number {
  return Math.round(actor.weapon.drink * actor.maxQi);
}

function main(
  f: Fight,
  actor: Combatant,
  m: MainAction,
  creativity: number,
  rng: Rng,
): Outcome[] | string {
  const base = {
    turn: f.turn,
    actor: actor.id,
    action: m.type,
    id: null,
    status: null,
  } as const;
  const realm = (l: LadderId) => actor.rungs[l].realm;

  switch (m.type) {
    case 'technique': {
      const known = actor.techniques[m.id];
      if (!known) return `doesn't know ${m.id}`;
      if (known.technique.volley) return 'a volley throws its talismans';
      const cost = techniqueCost(actor, known.technique);
      if (actor.qi < cost) return 'not enough qi';
      const target = foe(f, actor, m.target);
      if (!target) return 'no target';
      const art = techniqueAttack(actor, m.id, creativity);
      if (typeof art === 'string') return art;
      actor.qi -= cost;
      // Sword Rain: once a fight, a sword technique strikes all, split past its tier's full count.
      const spec = rained(f, actor, art);
      if (spec !== art) mark(actor, 'swordRain');
      const os = cast(f, actor, target, rng, spec);
      return os.map((o, i) => ({
        ...o,
        action: 'technique' as const,
        id: known.technique.id,
        ...(i === 0 ? { qi: cost, pool: { qi: actor.qi, max: actor.maxQi } } : {}),
      }));
    }

    case 'strike': {
      const target = foe(f, actor, m.target);
      if (!target) return 'no target';
      const drink = strikeDrink(actor);
      if (actor.qi < drink) return 'not enough qi';
      actor.qi -= drink;
      const os = cast(f, actor, target, rng, strikeAttack(actor, creativity));
      return os.map((o, i) => ({
        ...o,
        action: 'strike' as const,
        ...(i === 0 && drink > 0 ? { qi: drink, pool: { qi: actor.qi, max: actor.maxQi } } : {}),
      }));
    }

    case 'defend': {
      actor.guard *= DEFEND_EVASION * (1 + mod(actor, 'defendGuard'));
      // Shield Wall: the defend lends each ally Evasion too.
      const wall = mod(actor, 'shieldWall');
      if (wall > 0) {
        for (const c of f.combatants) {
          if (c !== actor && c.side === actor.side && c.state === 'fighting') c.guard *= 1 + wall;
        }
      }
      const before = actor.qi;
      actor.qi = Math.min(
        actor.maxQi,
        actor.qi + Math.round(DEFEND_QI * actor.maxQi * actor.qiRecovery),
      );
      // Then qi is poured into the shield, a qi a point (P3.2).
      const pour = Math.max(
        0,
        Math.min(
          actor.maxShield - actor.shield,
          Math.round(DEFEND_SHIELD * actor.maxShield),
          actor.qi,
        ),
      );
      actor.shield += pour;
      actor.qi -= pour;
      return [
        {
          ...base,
          target: null,
          form: 'defend',
          type: null,
          realm: realm('qi'),
          result: 'held',
          qi: before - actor.qi,
          pool: { qi: actor.qi, max: actor.maxQi },
          ...(pour > 0 ? { bars: barsOf(actor, { shield: -pour, armor: 0 }) } : {}),
        },
      ];
    }

    case 'item': {
      const held = actor.items[m.id];
      if (!held || held.n <= 0) return `holds no ${m.id}`;
      const it: Item = held.item;
      const strike = itemAttack(actor, it, creativity);
      if (strike) {
        const target = foe(f, actor, m.target ?? '');
        if (!target) return 'no target';
        spend(actor, m.id);
        return cast(f, actor, target, rng, strike).map((o) => ({
          ...o,
          action: 'item' as const,
          id: it.id,
        }));
      }
      if (it.uses.ward) {
        spend(actor, m.id);
        return [wardOf(actor, it, base)];
      }
      if (it.uses.fix) {
        const target = foe(f, actor, m.target ?? '');
        if (!target) return 'no target';
        if (it.uses.fix.keep && actor.marks[`kept:${it.id}`])
          return `${it.name} is spent this fight`;
        if (it.uses.fix.keep) mark(actor, `kept:${it.id}`);
        else spend(actor, m.id);
        return [fixWith(f, actor, target, it, creativity, rng, base)];
      }
      if (it.uses.escape) {
        spend(actor, m.id);
        return [escapeBy(f, actor, it, base)];
      }
      if (it.uses.burn) {
        const why = burnWhy(actor, it);
        if (why) return why;
        spend(actor, m.id);
        return [burnBlood(f, actor, it, base)];
      }
      const consume = it.uses.consume;
      if (!consume) return `${m.id} can't be used in a fight`;
      spend(actor, m.id);
      const scale = Math.max(0, 1 - actor.toxicity / TOXICITY_MAX);
      const qiBefore = actor.qi;
      for (const e of consume.effects) {
        if (e.effect !== 'restore') continue;
        if (e.what === 'qi')
          actor.qi = Math.min(actor.maxQi, actor.qi + Math.round(e.share * actor.maxQi * scale));
        if (e.what === 'hp')
          actor.hp = Math.min(actor.maxHp, actor.hp + Math.round(e.share * actor.maxHp * scale));
      }
      // A pill doses by your realm, your highest ladder (P3.2).
      const dose = doseAt(it, ownRealm(actor) + 1);
      actor.toxicity = Math.min(TOXICITY_MAX, actor.toxicity + dose);
      return [
        {
          ...base,
          id: it.id,
          target: null,
          form: 'item',
          type: null,
          realm: realm('qi'),
          result: 'held',
          qi: qiBefore - actor.qi,
          pool: { qi: actor.qi, max: actor.maxQi },
          hp: { id: actor.id, hp: actor.hp, max: actor.maxHp },
        },
      ];
    }

    case 'volley':
      return volley(f, actor, m, rng);

    case 'detonate':
      return detonate(f, actor, m, rng);

    case 'flags':
      return setFlags(f, actor, m.id, base);

    case 'command': {
      const beast = combatantIn(f, m.id);
      if (!beast || beast.side !== actor.side) return 'no beast of yours';
      return [
        {
          ...base,
          id: beast.id,
          target: beast.id,
          form: 'command',
          type: null,
          realm: realm('soul'),
          result: 'held',
        },
      ];
    }

    case 'talk': {
      const target = foe(f, actor, m.target);
      // A beast hears no words, and takes no surrender.
      if (!target || target.beast) return 'no one to talk to';
      // Soul against soul, feeling the square root of the gap, against the listener's resolve.
      const pressing = m.style === 'intimidate' || m.style === 'bluff';
      const mine =
        rungSize(actor.rungs.soul) ** SOFT_GAP *
        creativity *
        statusFactor(actor, 'accuracy') *
        (pressing ? 1 + mod(actor, 'intimidate') : 1);
      const theirs = rungSize(target.rungs.soul) ** SOFT_GAP * (target.resolve / RESOLVE_BASE);
      const chance = hitChance(mine, theirs);
      const swayed = rng.chance(chance);
      // Surrender, accepted, takes you out of the fight. A bluff or a threat that lands on a
      // person already hurt past half ends their fight: they yield (Fights you play). What the
      // rest win is the speaker's profile and the story's (P2.2, P3.9).
      if (swayed && m.style === 'surrender') actor.state = 'yielded';
      if (
        swayed &&
        (m.style === 'bluff' || m.style === 'intimidate') &&
        !target.beast &&
        target.hp < target.maxHp / 2
      ) {
        target.state = 'yielded';
        target.yieldedTo = actor.id;
      }
      return [
        {
          ...base,
          target: target.id,
          form: 'talk',
          type: null,
          realm: realm('soul'),
          result: swayed ? 'swayed' : 'failed',
          chance,
        },
      ];
    }

    case 'flee': {
      const foes = f.combatants.filter((c) => c.side !== actor.side && c.state === 'fighting');
      const out = { ...base, target: null, form: 'flee' as const, type: null, realm: realm('qi') };
      if (statusFlag(actor, 'noFlee')) return [{ ...out, result: 'failed' }];
      if (foes.length === 0) {
        actor.state = 'fled';
        return [{ ...out, result: 'escaped' }];
      }
      // Tempo against tempo (Agility, feeling the square root of the gap) to whichever foe is
      // hardest to outrun.
      const mine = tempo(actor) * creativity * statusFactor(actor, 'accuracy');
      const theirs = Math.max(...foes.map((c) => tempo(c)));
      const chance = hitChance(mine, theirs);
      const escaped = rng.chance(chance);
      if (escaped) actor.state = 'fled';
      return [{ ...out, result: escaped ? 'escaped' : 'failed', chance }];
    }
  }
}

type OutcomeBase = Omit<Outcome, 'target' | 'form' | 'type' | 'realm' | 'result'>;

/** A fight item works at its own tier's rung, or yours when you stand at or above it. */
function itemRung(actor: Combatant, it: Item): Rung {
  const own = actor.rungs.qi;
  return realmIndex(own.realm) + 1 >= it.tier ? own : tierRung(it.tier);
}

/**
 * Golden Light (K5): a gold ward over your qi shield, past its cap, for the fight: its share of a
 * full qi shield at the talisman's rung, times its rarity.
 */
function wardOf(actor: Combatant, it: Item, base: OutcomeBase): Outcome {
  const ward = Math.round(
    it.uses.ward!.share *
      SHIELD_PER_SIZE *
      rungSize(itemRung(actor, it)) *
      rarityMultiplier(it.rarity, tierStep(it.tier)),
  );
  actor.shield += ward;
  return {
    ...base,
    id: it.id,
    target: null,
    form: 'item',
    type: null,
    realm: actor.rungs.qi.realm,
    result: 'held',
    bars: barsOf(actor, { shield: -ward, armor: 0 }),
  };
}

/**
 * Body-Fixing and the binding rope (K5): holds a foe still, its rung and rarity's Accuracy against
 * their soul. A foe a realm above its tier shrugs it off.
 */
function fixWith(
  f: Fight,
  actor: Combatant,
  target: Combatant,
  it: Item,
  creativity: number,
  rng: Rng,
  base: OutcomeBase,
): Outcome {
  const out = {
    ...base,
    id: it.id,
    target: target.id,
    form: 'item' as const,
    type: null,
    realm: actor.rungs.soul.realm,
  };
  if (ownRealm(target) + 1 > it.tier) return { ...out, result: 'failed', chance: 0 };
  const mine = rungSize(itemRung(actor, it)) * rarityAccuracy(it.rarity) * creativity;
  const chance = hitChance(mine, rungSize(target.rungs.soul));
  if (!rng.chance(chance)) return { ...out, result: 'miss', chance };
  target.statuses = [
    ...target.statuses.filter((s) => s.id !== 'held'),
    { id: 'held', turns: it.uses.fix!.turns, dot: 0, since: f.turn },
  ];
  return { ...out, result: 'hit', status: 'held', chance };
}

/**
 * Earth Escape (K5): a sure flee from foes up to its tier, unless you are held or rooted. A foe a
 * realm above it holds the ground shut.
 */
function escapeBy(f: Fight, actor: Combatant, it: Item, base: OutcomeBase): Outcome {
  const out = {
    ...base,
    id: it.id,
    target: null,
    form: 'flee' as const,
    type: null,
    realm: actor.rungs.qi.realm,
  };
  const foes = f.combatants.filter((c) => c.side !== actor.side && c.state === 'fighting');
  if (statusFlag(actor, 'noFlee') || foes.some((c) => ownRealm(c) + 1 > it.tier))
    return { ...out, result: 'failed', chance: 0 };
  actor.state = 'fled';
  return { ...out, result: 'escaped', chance: 1 };
}

/** Flurry: a fist strike as the minor action, at the share of a strike the Fist Dao gives. */
function flurry(f: Fight, actor: Combatant, targetId: string, rng: Rng): Outcome[] | string {
  const share = Math.min(1, mod(actor, 'flurry'));
  if (share <= 0) return 'no flurry';
  if (actor.weapon.kind !== 'fist') return 'a flurry needs fists';
  const target = foe(f, actor, targetId);
  if (!target) return 'no target';
  const spec = strikeAttack(actor, 1);
  return cast(f, actor, target, rng, { ...spec, base: spec.base * share }).map((o) => ({
    ...o,
    action: 'strike' as const,
  }));
}

/** The same main action again, at another foe if its target fell: Hundred Fists' second action. */
function retarget(f: Fight, actor: Combatant, m: MainAction): MainAction | null {
  if (!('target' in m) || m.target === undefined) return m;
  if (foe(f, actor, m.target)) return m;
  const next = f.combatants.find((c) => c.side !== actor.side && c.state === 'fighting');
  return next ? { ...m, target: next.id } : null;
}

/** The named foe if it still fights. */
function foe(f: Fight, actor: Combatant, id: string): Combatant | undefined {
  const t = combatantIn(f, id);
  return t && t.state === 'fighting' && t.id !== actor.id ? t : undefined;
}

/** The other foes still standing on the target's side, nearest in the fight's order first. */
function others(f: Fight, actor: Combatant, target: Combatant): Combatant[] {
  return f.combatants.filter(
    (c) => c !== target && c.side !== actor.side && c.state === 'fighting',
  );
}

// ---------------------------------------------------------------- arts that burn goods (K11)

/**
 * A talisman volley: a volley art throws its count of one stack, each talisman a cast of its own at
 * full power and reach, at the chosen foe while it stands and then at the first still standing.
 * The art's qi is paid once; it is thrown only with the Talismans Dao held to its tier.
 */
function volley(
  f: Fight,
  actor: Combatant,
  m: Extract<MainAction, { type: 'volley' }>,
  rng: Rng,
): Outcome[] | string {
  const known = actor.techniques[m.id];
  const n = known?.technique.volley;
  if (!known || !n) return `doesn't know ${m.id}`;
  if ((actor.talismanTier ?? 0) < known.technique.tier) return 'the Talismans Dao is not held';
  const held = actor.items[m.item];
  if (!held || held.n <= 0 || !held.item.uses.fight) return `holds no ${m.item}`;
  const cost = techniqueCost(actor, known.technique);
  if (actor.qi < cost) return 'not enough qi';
  if (!foe(f, actor, m.target)) return 'no target';
  actor.qi -= cost;
  const out: Outcome[] = [];
  for (let k = 0; k < n && (actor.items[m.item]?.n ?? 0) > 0; k++) {
    if (actor.state !== 'fighting') break;
    const target = foe(f, actor, m.target) ?? firstStanding(f, actor);
    if (!target) break;
    spend(actor, m.item);
    const strike = itemAttack(actor, held.item, 1)!;
    out.push(
      ...cast(f, actor, target, rng, strike).map((o, i) => ({
        ...o,
        action: 'volley' as const,
        id: held.item.id,
        ...(k === 0 && i === 0 ? { qi: cost, pool: { qi: actor.qi, max: actor.maxQi } } : {}),
      })),
    );
  }
  return out;
}

/** The first foe still standing, in the fight's order. */
function firstStanding(f: Fight, actor: Combatant): Combatant | undefined {
  return f.combatants.find((c) => c.side !== actor.side && c.state === 'fighting');
}

/** Whether a piece can be blown apart: a weapon, armor or a treasure. */
export function detonable(it: Item): boolean {
  const slot = it.uses.equip?.slot;
  return slot === 'weapon' || slot === 'armor' || slot === 'treasure';
}

/**
 * Artifact detonation 自爆法宝: a piece from the Bag blown apart strikes its tier's blast of foes
 * (5 at tier 1), each at DETONATE_ATTACK times a basic strike sized at the piece's band, and never
 * misses. The piece is gone.
 */
function detonate(
  f: Fight,
  actor: Combatant,
  m: Extract<MainAction, { type: 'detonate' }>,
  rng: Rng,
): Outcome[] | string {
  const held = actor.items[m.id];
  if (!held || held.n <= 0) return `holds no ${m.id}`;
  const it = held.item;
  if (!detonable(it)) return `${it.name} can't be blown apart`;
  const target = foe(f, actor, m.target);
  if (!target) return 'no target';
  spend(actor, m.id);
  return cast(f, actor, target, rng, detonation(actor, it)).map((o) => ({
    ...o,
    action: 'detonate' as const,
    id: it.id,
  }));
}

/** A piece blown apart as an attack: a basic strike at its band, ×DETONATE_ATTACK, its tier's blast. */
function detonation(actor: Combatant, it: Item): Attack {
  return {
    form: 'aura',
    type: 'physical',
    base: STRIKE_POWER * tierScale(it.tier),
    ladder: 'qi',
    rung: itemRung(actor, it),
    accuracy: 1,
    attack: rarityMultiplier(it.rarity, tierStep(it.tier)) * DETONATE_ATTACK,
    qi: false,
    daos: [],
    targets: reachOf(it.tier).blast,
    tier: it.tier,
    sure: true,
  };
}

/**
 * Flags set mid-fight: an array from the Bag with a fight's shape stands for your side from the
 * next turn to the fight's end, at its rarity's band with no placing hand, its eye drawing
 * FLAGS_EYE_SHARE of its charge from your stones; one a fight. Warding stands its shield at once.
 */
function setFlags(f: Fight, actor: Combatant, id: string, base: OutcomeBase): Outcome[] | string {
  const held = actor.items[id];
  if (!held || held.n <= 0 || !held.item.uses.array) return `holds no ${id}`;
  if (actor.marks.flags) return 'one array a fight';
  const laid = { id: `set:${actor.id}:${id}`, item: baseOf(id), rarity: held.item.rarity };
  const [a] = fightArrays(
    [{ ...laid, from: laid.rarity, strength: 0, stones: 1, laid: 0 }],
    actor.side,
  );
  if (!a) return `${held.item.name} has no fight in it`;
  const cost = flagsCost(held.item);
  if ((actor.stones ?? 0) < cost) return 'not enough stones for its eye';
  actor.stones = (actor.stones ?? 0) - cost;
  spend(actor, id);
  mark(actor, 'flags');
  mark(actor, `set:${id}`);
  f.arrays = [...(f.arrays ?? []), a];
  if (a.does === 'warding' && a.ward) {
    const foes = f.combatants.filter((c) => c.side !== a.side && c.state === 'fighting');
    if (!a.beastsOnly || foes.every((c) => c.beast)) {
      const mine = f.combatants.filter((c) => c.side === a.side && c.state === 'fighting');
      for (const c of mine) c.shield += Math.round(a.ward / mine.length);
    }
  }
  return [
    {
      ...base,
      id,
      target: null,
      form: 'item',
      type: null,
      realm: actor.rungs.qi.realm,
      result: 'held',
    },
  ];
}

/** What setting an array mid-fight draws from your stones: a share of its eye's charge. */
export function flagsCost(it: Item): number {
  return FLAGS_EYE_SHARE * eyeHolds(it.tier);
}

/** Why a burning pill won't take: one a day, and only at its own tier. */
export function burnWhy(actor: Combatant, it: Item): string | null {
  if (actor.burning !== undefined || actor.marks.burned || actor.weakened)
    return 'the blood has burned already today';
  if (ownRealm(actor) + 1 !== it.tier) return `${it.name} is not of your realm`;
  return null;
}

/** How many turns a burning pill burns: its written turns, a turn more a rarity past white. */
export function burnTurns(it: Item): number {
  return it.uses.burn!.turns + Math.max(0, rarityRank(it.rarity) - rarityRank('white'));
}

/**
 * A burning pill 燃血丹: every line of the sheet a realm step up (a grade of a whole step on every
 * rung) for its turns; then weakened (`burnedOut`).
 */
function burnBlood(f: Fight, actor: Combatant, it: Item, base: OutcomeBase): Outcome {
  for (const l of LADDERS) actor.rungs = { ...actor.rungs, [l]: graded(actor.rungs[l], 1) };
  actor.burning = f.turn + burnTurns(it) - 1;
  mark(actor, 'burned');
  return {
    ...base,
    id: it.id,
    target: null,
    form: 'item',
    type: null,
    realm: actor.rungs.qi.realm,
    result: 'held',
  };
}

/** The burn runs out: the step comes off, and the sheet falls to WEAKENED for the rest of the day. */
function burnedOut(c: Combatant): void {
  for (const l of LADDERS) c.rungs = { ...c.rungs, [l]: graded(c.rungs[l], -1) };
  weaken(c);
  delete c.burning;
}

function spend(actor: Combatant, id: string): void {
  const held = actor.items[id]!;
  actor.items = { ...actor.items, [id]: { ...held, n: held.n - 1 } };
}

/** Mist Step halves the first hit against you each fight, Unmoved the first each turn. */
function guarded(f: Fight, target: Combatant, dealt: number): number {
  let d = dealt;
  if (mod(target, 'mistStep') > 0 && !target.marks.misted) {
    mark(target, 'misted');
    d *= HALVED_HIT;
  }
  if (mod(target, 'unmoved') > 0 && target.marks.unmovedTurn !== f.turn) {
    mark(target, 'unmovedTurn', f.turn);
    d *= HALVED_HIT;
  }
  return d === dealt ? dealt : Math.max(1, Math.round(d));
}

/**
 * Puts a status on a target, as the actor's Dao rules shape it: longer and harder burns, roots and
 * chills, stacking burns and bleeds, and the flags that slow, bind, steal the minor action or burn
 * as one sea. Immovable shrugs off stagger and unbalance, Clear Heart daze, and stagger resistance
 * may let a stagger slide. Returns whether it took.
 */
function applyStatus(
  f: Fight,
  actor: Combatant,
  target: Combatant,
  id: StatusId,
  dealt: number,
  rng: Rng,
): boolean {
  if (target.state !== 'fighting') return false;
  if (mod(target, 'steady') > 0 && (id === 'staggered' || id === 'unbalanced')) return false;
  if (mod(target, 'clearHeart') > 0 && id === 'dazed') return false;
  const slide = mod(target, 'staggerResist');
  if (id === 'staggered' && slide > 0 && rng.chance(Math.min(1, slide))) return false;
  const info = statusInfo(id);
  const extra =
    id === 'burning'
      ? mod(actor, 'burnTurns')
      : id === 'rooted'
        ? mod(actor, 'rootTurns')
        : id === 'chilled'
          ? mod(actor, 'chillTurns')
          : 0;
  const bite =
    id === 'burning' ? mod(actor, 'burnBite') : id === 'bleeding' ? mod(actor, 'bleedBite') : 0;
  let turns = info.turns + Math.round(extra);
  let dot = Math.round((info.dot ?? 0) * dealt * (1 + bite));
  const old = target.statuses.find((s) => s.id === id);
  const stacks =
    (id === 'burning' && mod(actor, 'stackBurn') > 0) ||
    (id === 'bleeding' && mod(actor, 'stackBleed') > 0);
  if (old && stacks) {
    dot += old.dot;
    turns = Math.max(turns, old.turns);
  }
  const flags = {
    ...(id === 'chilled' && mod(actor, 'chillSlow') > 0 ? { slow: true } : {}),
    ...(id === 'staggered' && mod(actor, 'staggerSlow') > 0 ? { slow: true } : {}),
    ...(id === 'chilled' && mod(actor, 'undertow') > 0 ? { undertow: true } : {}),
    ...(id === 'rooted' && mod(actor, 'bindingVines') > 0 ? { bind: true } : {}),
    ...(id === 'burning' && mod(actor, 'seaOfFlame') > 0 ? { sea: true } : {}),
  };
  target.statuses = [
    ...target.statuses.filter((s) => s.id !== id),
    { id, turns, dot, since: f.turn, ...flags },
  ];
  return true;
}

/**
 * Damage that spills onto another foe without a roll: a spear's sweep, a saber's cleave. From a
 * lower realm, the first bar it meets holds it by protective qi, the hit's Attack against that
 * bar's Defense.
 */
function splash(
  f: Fight,
  actor: Combatant,
  target: Combatant,
  a: Attack,
  dealt: number,
  n: Numbers,
): Omit<Outcome, 'action'> {
  const first =
    target.shield > 0
      ? shieldDefense(target)
      : target.armor && target.armor.hp > 0
        ? target.armor.defense
        : defense(target, guardLadder(a.type));
  const ward = ownRealm(actor) < ownRealm(target) ? protection(n.attack, first * n.weaken) : 1;
  const l = soak(target, Math.max(1, Math.round(guarded(f, target, dealt * ward))));
  const d = land(target, l);
  return {
    turn: f.turn,
    actor: actor.id,
    target: target.id,
    id: null,
    form: a.form,
    type: a.type,
    realm: a.rung.realm,
    result: 'hit',
    status: null,
    damage: d,
    hp: { id: target.id, hp: target.hp, max: target.maxHp },
    bars: barsOf(target, { shield: l.shield, armor: l.armor }),
  };
}

/**
 * One foe of a cast: Accuracy against Evasion, then Attack over Defense, with its status on a
 * critical, then what the Dao rules add: Severing's bleed on any metal hit, a critical's frozen
 * chill, spreading burn and falling mountain, Hundred Fists' second action, and from the chosen
 * foe the spear's sweep and the saber's cleave onto foes the cast doesn't strike. The backfire,
 * the combo, a saber's run and qi on a hit are the cast's. The first outcome is the target's; any
 * others are the foes the action spilled onto.
 */
function attack(
  f: Fight,
  actor: Combatant,
  target: Combatant,
  rng: Rng,
  a: Attack,
  ctx: CastCtx,
  spill: boolean,
): Omit<Outcome, 'action'>[] {
  const n = numbers(f, actor, target, a, ctx.accuracy, ctx.fixed);
  if (n.sure && !a.sure) mark(actor, 'dragonTurn', f.turn);
  const { result, chance } = judge(rng, n.accuracy, n.evasion, {
    fortune: actor.fortune,
    crit: n.crit,
    sure: n.sure,
  });
  mark(actor, 'struck');
  if (a.daos.includes('sword')) mark(actor, 'oneSword');
  // Acting with a Dao from under a tenth of your HP: a win after it is that Dao's moment.
  if (actor.hp < BRINK_HP * actor.maxHp) {
    for (const d of a.daos) if (isCombatDao(d)) mark(actor, brinkMark(d));
  }
  const out = {
    turn: f.turn,
    actor: actor.id,
    target: target.id,
    id: null,
    form: a.form,
    type: a.type,
    realm: a.rung.realm,
    result,
    status: null as StatusId | null,
    chance,
  };

  if (result === 'miss' || result === 'backfire') return [out];

  const crit = result === 'critical';
  const chilled = hasStatus(target, 'chilled');
  const hit = guarded(
    f,
    target,
    force({
      base: a.base,
      attack: n.attack * (crit ? n.critAttack : 1),
      element: n.element,
      result,
      combo: comboMultiplier(ctx.combo),
      spread: rollSpread(rng),
    }),
  );
  const landed = landing(target, hit, a.type, n);
  const dealt = land(target, landed);

  // Statuses: a critical applies its type's, Severing bleeds on any metal hit.
  let status: StatusId | null = null;
  const own = statusOf(a.type);
  if (crit && own && applyStatus(f, actor, target, own, dealt, rng)) status = own;
  if (!crit && a.type === 'metal' && mod(actor, 'severing') > 0) {
    if (applyStatus(f, actor, target, 'bleeding', dealt, rng)) status = 'bleeding';
  }
  if (crit && chilled && mod(actor, 'freezingEdge') > 0) {
    if (applyStatus(f, actor, target, 'frozen', dealt, rng)) status = 'frozen';
  }
  if (crit && status === 'burning' && mod(actor, 'spreadBurn') > 0) {
    const next = others(f, actor, target)[0];
    if (next) applyStatus(f, actor, next, 'burning', dealt, rng);
  }
  if (crit && mod(actor, 'mountainFalls') > 0) {
    for (const c of [target, ...others(f, actor, target)]) {
      applyStatus(f, actor, c, 'staggered', dealt, rng);
    }
  }
  if (crit && mod(actor, 'hundredFists') > 0 && !actor.marks.hundredFists) {
    mark(actor, 'hundredFists');
    mark(actor, 'extraMain', f.turn);
  }

  const outcomes: Omit<Outcome, 'action'>[] = [
    {
      ...out,
      status,
      damage: dealt,
      hp: { id: target.id, hp: target.hp, max: target.maxHp },
      bars: barsOf(target, { shield: landed.shield, armor: landed.armor }),
    },
  ];
  if (!spill) return outcomes;
  // A spear's sweep: a second foe takes a share. With Whirl every other foe does, as an art that
  // strikes all: split past the art's tier's full count. Only onto foes the cast doesn't strike.
  const rest = others(f, actor, target).filter((c) => !ctx.struck.has(c));
  const sweep = a.daos.includes('spear') ? mod(actor, 'sweep') : 0;
  if (sweep > 0) {
    const whirl = mod(actor, 'whirl') > 0;
    const count = fullCount('all', a.tier);
    const share = whirl && rest.length + 1 > count ? count / (rest.length + 1) : 1;
    for (const c of whirl ? rest : rest.slice(0, 1)) {
      outcomes.push(splash(f, actor, c, a, dealt * sweep * share, n));
    }
  }
  // A saber's critical carries a share to a second foe.
  const cleave = crit && a.daos.includes('saber') ? mod(actor, 'cleave') : 0;
  if (cleave > 0) {
    const next = rest[0];
    if (next) outcomes.push(splash(f, actor, next, a, dealt * cleave, n));
  }
  return outcomes;
}
