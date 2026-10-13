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
  MAX_CREATIVITY,
  QI_REGEN,
  RESOLVE_BASE,
  SOFT_GAP,
  STRIKE_FORM,
  STRIKE_POWER,
  statusInfo,
  statusOf,
  type DamageType,
  type OutcomeForm,
  type OutcomeResult,
  type StatusId,
} from '../../content/combat.ts';
import { TOXICITY_MAX, type LadderId } from '../../content/cultivation.ts';
import type { Item } from '../../content/items.ts';
import { rarityAccuracy, rarityMultiplier } from '../../content/rarity.ts';
import { realmIndex, tierStep, type RealmId } from '../../content/realms.ts';
import type { Form, Technique } from '../../content/techniques.ts';
import type { Rng } from '../rng.ts';
import { doseAt } from '../toxicity.ts';
import { judge } from './check.ts';
import {
  agilityFactor,
  defense,
  evasion,
  statusFactor,
  statusFlag,
  type Combatant,
} from './combatant.ts';
import {
  comboMultiplier,
  damage,
  damagePhase,
  elementMultiplier,
  nextCombo,
  rollSpread,
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
  /** Lets a beast on your side act this turn. */
  | { type: 'command'; id: string }
  | { type: 'talk'; style: TalkStyle; target: string }
  | { type: 'flee' };

export type MinorAction =
  | { type: 'move' }
  | { type: 'take_cover' }
  | { type: 'swap_artifact'; id?: string }
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

export interface Fight {
  /** Turns resolved so far. */
  turn: number;
  combatants: Combatant[];
  features: Feature[];
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
  /** The actor's qi after, and their pool. */
  pool?: { qi: number; max: number };
  /** Features this action's minor set burning. */
  features?: { id: string; name: string; burning: number }[];
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
  /** Actions that did nothing, and why: a down actor, a frozen one, a technique they can't pay. */
  skipped: { actor: string; reason: string }[];
}

/** A fight between these combatants, in this order (ties in Agility go by it). */
export function startFight(combatants: Combatant[], features: Feature[] = []): Fight {
  return { turn: 0, combatants: combatants.map((c) => ({ ...c })), features: [...features] };
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

/** Resolves one turn: statuses tick, then every action in Agility order, then durations run down. */
export function resolveTurn(fight: Fight, actions: readonly Action[], rng: Rng): TurnResult {
  const f: Fight = {
    turn: fight.turn + 1,
    combatants: fight.combatants.map((c) => ({ ...c, statuses: [...c.statuses] })),
    features: fight.features.map((x) => ({ ...x })),
  };
  const outcomes: Outcome[] = [];
  const skipped: TurnResult['skipped'] = [];
  const ticks = startOfTurn(f);

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
    .sort((x, y) => f.combatants[y.i]!.agility - f.combatants[x.i]!.agility || x.i - y.i)
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

  for (const a of order) {
    const actor = combatantIn(f, a.actor)!;
    if (actor.state !== 'fighting') {
      skipped.push({ actor: a.actor, reason: actor.state });
      continue;
    }
    if (actor.needsCommand && !commanded.has(actor.id)) {
      skipped.push({ actor: a.actor, reason: 'not commanded' });
      continue;
    }
    actor.guard = 1;
    const lit = a.minor ? minor(f, actor, a.minor) : [];
    if (!a.main) continue;
    if (statusFlag(actor, 'skipMain')) {
      skipped.push({ actor: a.actor, reason: 'frozen' });
      continue;
    }
    const creativity = creative(f, actor, a);
    const o = main(f, actor, a.main, creativity, rng);
    if (typeof o === 'string') {
      skipped.push({ actor: a.actor, reason: o });
      continue;
    }
    if (lit.length > 0) o.features = lit;
    outcomes.push(o);
  }

  endOfTurn(f);
  return { fight: f, outcomes, ticks, skipped };
}

/** Qi trickles back after the first turn, and damage over time ticks. */
function startOfTurn(f: Fight): Tick[] {
  const ticks: Tick[] = [];
  for (const c of f.combatants) {
    if (c.state !== 'fighting') continue;
    if (f.turn > 1) c.qi = Math.min(c.maxQi, c.qi + Math.round(QI_REGEN * c.maxQi));
    for (const s of c.statuses) {
      if (s.dot <= 0) continue;
      hurt(c, s.dot);
      ticks.push({ id: c.id, status: s.id, damage: s.dot });
    }
  }
  return ticks;
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

function hurt(c: Combatant, amount: number): void {
  c.hp = Math.max(0, c.hp - amount);
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

/** What the Daos an action is tagged with multiply Accuracy and Attack by: ×1.05 a tier. */
function daoFactor(actor: Combatant, daos: readonly string[]): number {
  const tiers = daos.reduce((sum, d) => sum + (actor.daos[d] ?? 0), 0);
  return DAO_STEP ** tiers;
}

/** Which ladder an attack compares: soul for soul damage, else its own. */
function clashLadder(ladder: LadderId, type: DamageType): LadderId {
  return type === 'soul' ? 'soul' : ladder;
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
}

function main(
  f: Fight,
  actor: Combatant,
  m: MainAction,
  creativity: number,
  rng: Rng,
): Outcome | string {
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
      const t: Technique = known.technique;
      const cost = Math.round(t.qiCost * tierScale(t.tier) * actor.techniqueCost);
      if (actor.qi < cost) return 'not enough qi';
      const target = foe(f, actor, m.target);
      if (!target) return 'no target';
      actor.qi -= cost;
      const dao = daoFactor(actor, t.daos);
      const onWeapon = t.daos.includes(actor.weapon.kind);
      const physical = t.damage === 'physical' ? actor.physicalPower : 1;
      const ladder = clashLadder(t.ladder, t.damage);
      const o = attack(f, actor, target, rng, {
        form: t.form,
        type: t.damage,
        base: t.power * tierScale(t.tier),
        ladder,
        rung: actor.rungs[ladder],
        accuracy:
          known.accuracy *
          dao *
          rarityAccuracy(t.rarity) *
          (onWeapon ? actor.weapon.accuracy : 1) *
          creativity,
        attack:
          rarityMultiplier(t.rarity, tierStep(t.tier)) *
          dao *
          actor.techniquePower *
          physical *
          (onWeapon ? actor.weapon.technique : 1),
        qi: true,
      });
      return {
        ...o,
        action: 'technique',
        id: t.id,
        qi: cost,
        pool: { qi: actor.qi, max: actor.maxQi },
      };
    }

    case 'strike': {
      const target = foe(f, actor, m.target);
      if (!target) return 'no target';
      const dao = daoFactor(actor, [actor.weapon.kind]);
      return {
        ...attack(f, actor, target, rng, {
          form: STRIKE_FORM[actor.weapon.kind],
          type: 'physical',
          base: STRIKE_POWER * tierScale(realmIndex(actor.rungs.body.realm) + 1),
          ladder: 'body',
          rung: actor.rungs.body,
          accuracy: dao * actor.weapon.accuracy * creativity,
          attack: actor.weapon.strike * dao * actor.physicalPower,
          qi: false,
        }),
        action: 'strike',
      };
    }

    case 'defend': {
      actor.guard *= DEFEND_EVASION;
      const before = actor.qi;
      actor.qi = Math.min(
        actor.maxQi,
        actor.qi + Math.round(DEFEND_QI * actor.maxQi * actor.qiRecovery),
      );
      return {
        ...base,
        target: null,
        form: 'defend',
        type: null,
        realm: realm('qi'),
        result: 'held',
        qi: before - actor.qi,
        pool: { qi: actor.qi, max: actor.maxQi },
      };
    }

    case 'item': {
      const held = actor.items[m.id];
      if (!held || held.n <= 0) return `holds no ${m.id}`;
      const it: Item = held.item;
      const fightUse = it.uses.fight;
      if (fightUse) {
        const target = foe(f, actor, m.target ?? '');
        if (!target) return 'no target';
        spend(actor, m.id);
        // A talisman strikes at its own tier, even above yours.
        const own = actor.rungs.qi;
        const rung = realmIndex(own.realm) + 1 >= it.tier ? own : tierRung(it.tier);
        const o = attack(f, actor, target, rng, {
          form: fightUse.form,
          type: fightUse.damage,
          base: fightUse.power * tierScale(it.tier),
          ladder: clashLadder('qi', fightUse.damage),
          rung,
          accuracy: rarityAccuracy(it.rarity) * creativity,
          attack: rarityMultiplier(it.rarity, tierStep(it.tier)),
          qi: false,
        });
        return { ...o, action: 'item', id: it.id };
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
      const dose = doseAt(it, realmIndex(actor.rungs.qi.realm) + 1);
      actor.toxicity = Math.min(TOXICITY_MAX, actor.toxicity + dose);
      return {
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
      };
    }

    case 'command': {
      const beast = combatantIn(f, m.id);
      if (!beast || beast.side !== actor.side) return 'no beast of yours';
      return {
        ...base,
        id: beast.id,
        target: beast.id,
        form: 'command',
        type: null,
        realm: realm('soul'),
        result: 'held',
      };
    }

    case 'talk': {
      const target = foe(f, actor, m.target);
      if (!target) return 'no one to talk to';
      // Soul against soul, feeling the square root of the gap, against the listener's resolve.
      const mine =
        rungSize(actor.rungs.soul) ** SOFT_GAP * creativity * statusFactor(actor, 'accuracy');
      const theirs = rungSize(target.rungs.soul) ** SOFT_GAP * (target.resolve / RESOLVE_BASE);
      const chance = hitChance(mine, theirs);
      const swayed = rng.chance(chance);
      // Surrender, accepted, takes you out of the fight; what the other styles win is the
      // speaker's profile and the story's (P2.2, P3.2).
      if (swayed && m.style === 'surrender') actor.state = 'yielded';
      return {
        ...base,
        target: target.id,
        form: 'talk',
        type: null,
        realm: realm('soul'),
        result: swayed ? 'swayed' : 'failed',
        chance,
      };
    }

    case 'flee': {
      const foes = f.combatants.filter((c) => c.side !== actor.side && c.state === 'fighting');
      const out = { ...base, target: null, form: 'flee' as const, type: null, realm: realm('qi') };
      if (statusFlag(actor, 'noFlee')) return { ...out, result: 'failed' };
      if (foes.length === 0) {
        actor.state = 'fled';
        return { ...out, result: 'escaped' };
      }
      // Agility against Agility, feeling the square root of the gap to whichever foe is hardest to outrun.
      const mine =
        rungSize(actor.rungs.qi) ** SOFT_GAP *
        agilityFactor(actor) *
        creativity *
        statusFactor(actor, 'accuracy');
      const theirs = Math.max(
        ...foes.map((c) => rungSize(c.rungs.qi) ** SOFT_GAP * agilityFactor(c)),
      );
      const chance = hitChance(mine, theirs);
      const escaped = rng.chance(chance);
      if (escaped) actor.state = 'fled';
      return { ...out, result: escaped ? 'escaped' : 'failed', chance };
    }
  }
}

/** The named foe if it still fights. */
function foe(f: Fight, actor: Combatant, id: string): Combatant | undefined {
  const t = combatantIn(f, id);
  return t && t.state === 'fighting' && t.id !== actor.id ? t : undefined;
}

function spend(actor: Combatant, id: string): void {
  const held = actor.items[id]!;
  actor.items = { ...actor.items, [id]: { ...held, n: held.n - 1 } };
}

/** An attack: Accuracy against Evasion, then Attack over Defense, with its status on a critical and the backfire. */
function attack(
  f: Fight,
  actor: Combatant,
  target: Combatant,
  rng: Rng,
  a: Attack,
): Omit<Outcome, 'action'> {
  const accuracy = rungSize(a.rung) * a.accuracy * actor.accuracy * statusFactor(actor, 'accuracy');
  const { result, chance } = judge(rng, accuracy, evasion(target, a.ladder), {
    fortune: actor.fortune,
    qi: a.qi,
    toxicity: actor.toxicity,
  });
  const attackValue = rungSize(a.rung) * a.attack;
  const phase = damagePhase(a.type);
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

  if (result === 'miss') {
    actor.combo = null;
    return out;
  }
  if (result === 'backfire') {
    // Qi deviation: the action turns on its actor at half strength, with no element.
    const dealt = damage({
      base: a.base * BACKFIRE_DAMAGE,
      attack: attackValue,
      defense: defense(actor, a.ladder),
      element: 1,
      resist: actor.resist[a.type] ?? 0,
      result: 'hit',
    });
    hurt(actor, dealt);
    actor.combo = null;
    return { ...out, damage: dealt, hp: { id: actor.id, hp: actor.hp, max: actor.maxHp } };
  }

  const combo = nextCombo(actor.combo, phase);
  actor.combo = combo;
  const dealt = damage({
    base: a.base,
    attack: attackValue,
    defense: defense(target, a.ladder),
    element: elementMultiplier(phase, target.element),
    resist: target.resist[a.type] ?? 0,
    result,
    combo: comboMultiplier(combo),
    spread: rollSpread(rng),
  });
  hurt(target, dealt);
  let status: StatusId | null = null;
  if (result === 'critical' && target.state === 'fighting') {
    status = statusOf(a.type);
    if (status) {
      const info = statusInfo(status);
      target.statuses = [
        ...target.statuses.filter((s) => s.id !== status),
        { id: status, turns: info.turns, dot: Math.round((info.dot ?? 0) * dealt), since: f.turn },
      ];
    }
  }
  return { ...out, status, damage: dealt, hp: { id: target.id, hp: target.hp, max: target.maxHp } };
}
