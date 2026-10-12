// A fight, turn by turn (design § Combat). A turn takes one action from any number of actors on
// any number of sides, and every action names its actor, so allies, beasts and co-op parties need
// no rewrite. Each action is one main (technique, strike, defend, item, command, talk, flee) and
// one minor (move, take cover, swap artifact, interact). Actors go in Agility order, ties in the
// fight's own order, the minor before the main. Every roll comes from the rng passed in, the
// life's `combat` stream, so a seed replays the same fight. Every outcome carries the five tags
// (form, damage type, realm, result, status) that effects, sound and the log line read.
import {
  ATTACK_TN_BASE,
  BACKFIRE_DAMAGE,
  COVER_TN,
  DAO_CHECK,
  DAO_DAMAGE,
  DEFEND_QI,
  DEFEND_TN,
  FLEE_TN_BASE,
  MAX_CREATIVITY,
  QI_REGEN,
  SOFT_GAP,
  STRIKE_FORM,
  STRIKE_POWER,
  TALK_TN_BASE,
  statusInfo,
  statusOf,
  type DamageType,
  type OutcomeForm,
  type OutcomeResult,
  type StatusId,
} from '../../content/combat.ts';
import { TOXICITY_MAX, type LadderId } from '../../content/cultivation.ts';
import type { Item } from '../../content/items.ts';
import { rarity, rarityMultiplier } from '../../content/rarity.ts';
import { realmIndex, tierGap, type RealmId } from '../../content/realms.ts';
import type { Form, Technique } from '../../content/techniques.ts';
import type { Rng } from '../rng.ts';
import { doseAt } from '../toxicity.ts';
import { judge, rollD20, type CheckResult } from './check.ts';
import { statusFlag, statusSum, type Combatant } from './combatant.ts';
import { comboMultiplier, damage, damagePhase, elementMultiplier, nextCombo } from './damage.ts';
import { ladderGap, tierRung, tierScale, type Rung } from './ladder.ts';

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
  roll?: number;
  total?: number;
  tn?: number;
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
    actor.guard = 0;
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
  if (m.type === 'take_cover') actor.guard += COVER_TN;
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
 * items), and the same trick earns nothing the second time in a fight.
 */
function creative(f: Fight, actor: Combatant, a: Action): number {
  const bonus = Math.min(MAX_CREATIVITY, Math.max(0, Math.round(a.creativity ?? 0)));
  if (bonus === 0) return 0;
  const real = (a.uses ?? []).filter(
    (u) => f.features.some((x) => x.id === u) || u in actor.techniques || u in actor.items,
  );
  if (real.length === 0) return 0;
  const trick = [...new Set(real)].sort().join('+');
  if (actor.tricks.includes(trick)) return 0;
  actor.tricks = [...actor.tricks, trick];
  return bonus;
}

/** The check bonus and damage bonus from the Daos an action is tagged with. */
function daoBonus(actor: Combatant, daos: readonly string[]): { check: number; damage: number } {
  const tiers = daos.reduce((sum, d) => sum + (actor.daos[d] ?? 0), 0);
  return { check: DAO_CHECK * tiers, damage: DAO_DAMAGE * tiers };
}

/** Which ladder an attack compares: soul for soul damage, else its own. */
function clashLadder(ladder: LadderId, type: DamageType): LadderId {
  return type === 'soul' ? 'soul' : ladder;
}

interface Attack {
  form: Form;
  type: DamageType;
  power: number;
  ladder: LadderId;
  /** The rung the attack strikes from: the actor's, or a talisman's own tier if higher. */
  rung: Rung;
  check: number;
  dao: number;
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
      const daos = daoBonus(actor, t.daos);
      const onWeapon = t.daos.includes(actor.weapon.kind);
      const physical = t.damage === 'physical' ? actor.physicalPower : 1;
      const ladder = clashLadder(t.ladder, t.damage);
      const o = attack(f, actor, target, rng, {
        form: t.form,
        type: t.damage,
        power:
          t.power *
          rarityMultiplier(t.rarity, tierGap(t.tier)) *
          tierScale(t.tier) *
          actor.techniquePower *
          physical *
          (onWeapon ? actor.weapon.technique : 1),
        ladder,
        rung: actor.rungs[ladder],
        check:
          known.check +
          daos.check +
          rarity(t.rarity).check +
          (onWeapon ? actor.weapon.hit : 0) +
          creativity,
        dao: daos.damage,
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
      const daos = daoBonus(actor, [actor.weapon.kind]);
      return {
        ...attack(f, actor, target, rng, {
          form: STRIKE_FORM[actor.weapon.kind],
          type: 'physical',
          power: STRIKE_POWER * actor.weapon.strike * actor.physicalPower,
          ladder: 'body',
          rung: actor.rungs.body,
          check: daos.check + actor.weapon.hit + creativity,
          dao: daos.damage,
          qi: false,
        }),
        action: 'strike',
      };
    }

    case 'defend': {
      actor.guard += DEFEND_TN;
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
          power:
            fightUse.power * rarityMultiplier(it.rarity, tierGap(it.tier)) * tierScale(it.tier),
          ladder: clashLadder('qi', fightUse.damage),
          rung,
          check: rarity(it.rarity).check + creativity,
          dao: 0,
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
      const gap = ladderGap(actor.rungs.soul, target.rungs.soul);
      const roll = rollD20(rng);
      const total =
        roll + creativity + Math.trunc(SOFT_GAP * gap.check) + statusSum(actor, 'check');
      const tn = TALK_TN_BASE + target.resolve;
      const swayed = roll !== 1 && total >= tn;
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
        roll,
        total,
        tn,
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
      // Fleeing feels half the gap to the strongest foe, and must outrun the fastest.
      const strongest = foes.reduce((a, b) =>
        ladderGap(b.rungs.qi, a.rungs.qi).check > 0 ? b : a,
      );
      const gap = ladderGap(actor.rungs.qi, strongest.rungs.qi);
      const roll = rollD20(rng);
      const total =
        roll +
        (actor.agility - 10) +
        creativity +
        Math.trunc(SOFT_GAP * gap.check) +
        statusSum(actor, 'check');
      const tn = FLEE_TN_BASE + Math.max(...foes.map((c) => c.agility));
      const escaped = roll !== 1 && total >= tn;
      if (escaped) actor.state = 'fled';
      return { ...out, result: escaped ? 'escaped' : 'failed', roll, total, tn };
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

/** An attack's check and damage, with its status on a critical and the backfire on a natural 1. */
function attack(
  f: Fight,
  actor: Combatant,
  target: Combatant,
  rng: Rng,
  a: Attack,
): Omit<Outcome, 'action'> {
  const gap = ladderGap(a.rung, target.rungs[a.ladder]);
  const roll = rollD20(rng);
  const total = roll + a.check + actor.hit + gap.check + statusSum(actor, 'check');
  const tn = ATTACK_TN_BASE + target.agility + target.guard + statusSum(target, 'tn');
  const result: CheckResult = judge(roll, total, tn, { fortune: actor.fortune, qi: a.qi });
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
    roll,
    total,
    tn,
  };

  if (result === 'miss') {
    actor.combo = null;
    return out;
  }
  if (result === 'backfire') {
    // Qi deviation: the action turns on its actor at half strength, with no gap and no element.
    const dealt = damage({
      power: a.power,
      dao: a.dao,
      element: 1,
      resist: actor.resist[a.type] ?? 0,
      result: 'hit',
      gap: BACKFIRE_DAMAGE,
      armor: actor.armor,
    });
    hurt(actor, dealt);
    actor.combo = null;
    return { ...out, damage: dealt, hp: { id: actor.id, hp: actor.hp, max: actor.maxHp } };
  }

  const combo = nextCombo(actor.combo, phase);
  actor.combo = combo;
  const dealt = damage({
    power: a.power,
    dao: a.dao,
    element: elementMultiplier(phase, target.element),
    resist: target.resist[a.type] ?? 0,
    result,
    gap: gap.damage,
    combo: comboMultiplier(combo),
    armor: target.armor,
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
