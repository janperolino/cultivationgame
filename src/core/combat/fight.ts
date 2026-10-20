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
  EVERGREEN_HP,
  FIRST_BLOOD_ORDER,
  HALVED_HIT,
  MAX_CREATIVITY,
  MAX_RESIST,
  PROTECTIVE_QI,
  QI_REGEN,
  RESOLVE_BASE,
  SLOWED_ORDER,
  SOFT_GAP,
  STRIKE_FORM,
  STRIKE_POWER,
  UNBREAKING_DEFENSE,
  statusInfo,
  statusOf,
  type DamageType,
  type OutcomeForm,
  type OutcomeResult,
  type StatusId,
} from '../../content/combat.ts';
import { TOXICITY_MAX, type LadderId } from '../../content/cultivation.ts';
import { actionDaos, isCombatDao, type DaoStatKind } from '../../content/daos.ts';
import type { Item } from '../../content/items.ts';
import { rarityAccuracy, rarityMultiplier, rarityReach } from '../../content/rarity.ts';
import { realmIndex, tierStep, type RealmId } from '../../content/realms.ts';
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
import { topStage } from '../intent.ts';
import { doseAt } from '../toxicity.ts';
import { judge } from './check.ts';
import {
  agilityFactor,
  defense,
  evasion,
  mod,
  shieldDefense,
  soulWound,
  statusFactor,
  statusFlag,
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
    if (!a.main) continue;
    if (statusFlag(actor, 'skipMain')) {
      skipped.push({ actor: a.actor, reason: 'frozen' });
      continue;
    }
    const creativity = creative(f, actor, a);
    const os = main(f, actor, a.main, creativity, rng);
    if (typeof os === 'string') {
      skipped.push({ actor: a.actor, reason: os });
      continue;
    }
    if (lit.length > 0) os[0]!.features = lit;
    outcomes.push(...os);
    // Hundred Fists: a critical grants a second main action, once a fight.
    if (actor.marks.extraMain === f.turn && actor.state === 'fighting') {
      const again = retarget(f, actor, a.main);
      const more = again ? main(f, actor, again, 1, rng) : 'no target';
      if (typeof more !== 'string') outcomes.push(...more);
    }
  }

  endOfTurn(f);
  return { fight: f, outcomes, ticks, skipped };
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
  /** The realm the art, weapon or talisman reaches by itself, 0 for Qi Condensation (Protective qi). */
  reach: number;
}

/** What a technique costs this actor in qi, its Daos' cost nodes included. */
export function techniqueCost(actor: Combatant, t: Technique): number {
  const daos = actionDaos(t.daos, t.damage);
  return Math.round(
    t.qiCost *
      tierScale(t.tier) *
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
    reach: t.tier - 1 + rarityReach(t.rarity),
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
    rung: asOne > 0 ? { ...body, grade: body.grade + asOne } : body,
    accuracy: dao * (1 + daoMod(actor, daos, 'Hit')) * actor.weapon.accuracy * creativity,
    attack: actor.weapon.strike * dao * (1 + daoMod(actor, daos, 'Power')) * actor.physicalPower,
    qi: false,
    daos,
    reach: actor.weapon.reach,
  };
}

/** A fight item's strike: a talisman strikes at its own tier, even above yours. */
function itemAttack(actor: Combatant, it: Item, creativity: number): Attack | null {
  const use = it.uses.fight;
  if (!use) return null;
  const own = actor.rungs.qi;
  const rung = realmIndex(own.realm) + 1 >= it.tier ? own : tierRung(it.tier);
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
    reach: it.tier - 1 + rarityReach(it.rarity),
  };
}

/**
 * An attack's Accuracy: the rung's size times what feeds it, the Hit stat and the actor's
 * statuses, the Banners their allies carry and the sword pressure their foes carry.
 */
function attackAccuracy(f: Fight, actor: Combatant, a: Attack): number {
  let around = 1;
  for (const c of f.combatants) {
    if (c === actor || c.state !== 'fighting') continue;
    if (c.side === actor.side) around *= 1 + mod(c, 'banner');
    else around *= Math.max(0, 1 - mod(c, 'swordAura'));
  }
  return rungSize(a.rung) * a.accuracy * actor.accuracy * statusFactor(actor, 'accuracy') * around;
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
  /** What the target's protective qi leaves of the hit: 1, or a twentieth. */
  ward: number;
}

const hasStatus = (c: Combatant, id: StatusId) => c.statuses.some((s) => s.id === id);

/** A combatant's realm, as an index: their highest ladder's (design § Scale of destruction). */
function ownRealm(c: Combatant): number {
  return Math.max(...Object.values(c.rungs).map((r) => realmIndex(r.realm)));
}

/**
 * Protective qi (design § Combat): a hit on a foe of a higher realm does a twentieth, unless the
 * art, weapon or talisman behind it reaches their realm on its own, as gold and up reach a realm
 * past their tier's. Your own realm always reaches itself, so it only bites from below.
 */
export function protection(actor: Combatant, target: Combatant, reach: number): number {
  return Math.max(ownRealm(actor), reach) >= ownRealm(target) ? 1 : PROTECTIVE_QI;
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

/**
 * The two sheets compared, with the Dao rules that move them: a first attack and the first sword
 * action of a fight, a saber's run of hits, water on the chilled, metal on the bleeding and earth
 * on the staggered, Unbreaking's lower armor, pierce, crits against the wounded, Dragon Thrust.
 */
function numbers(f: Fight, actor: Combatant, target: Combatant, a: Attack): Numbers {
  let attack = rungSize(a.rung) * a.attack;
  if (!actor.marks.struck) attack *= 1 + mod(actor, 'firstStrike');
  if (a.daos.includes('sword') && !actor.marks.oneSword) attack *= 1 + mod(actor, 'oneSword');
  if (a.daos.includes('saber')) attack *= 1 + mod(actor, 'momentum') * (actor.marks.momentum ?? 0);
  if (a.type === 'water' && hasStatus(target, 'chilled')) attack *= 1 + mod(actor, 'riptide');
  if (a.type === 'metal' && hasStatus(target, 'bleeding')) attack *= 1 + mod(actor, 'temperedEdge');
  if (a.type === 'earth' && hasStatus(target, 'staggered')) attack *= 1 + mod(actor, 'crush');
  const edge = intentEdge(actor, target, a.daos);
  let weaken = edge.defense;
  if (hasStatus(target, 'bleeding') && mod(actor, 'unbreaking') > 0) weaken *= UNBREAKING_DEFENSE;
  const wounded = target.hp < target.maxHp / 2;
  const ward = protection(actor, target, a.reach);
  attack *= edge.attack * ward;
  const pierce = Math.max(0, 1 - daoMod(actor, a.daos, 'Pierce'));
  return {
    accuracy: attackAccuracy(f, actor, a) * edge.accuracy,
    evasion: evasion(target, a.ladder) * edge.evasion,
    attack,
    defense: defense(target, guardLadder(a.type)) * weaken,
    weaken,
    element: elementMultiplier(damagePhase(a.type), target.element),
    resist: (target.resist[a.type] ?? 0) * pierce,
    pierce,
    crit: daoMod(actor, a.daos, 'Crit') + (wounded ? mod(actor, 'woundedCrit') : 0),
    critAttack: (1 + mod(actor, 'critDamage')) * (wounded ? 1 + mod(actor, 'executioner') : 1),
    sure:
      a.form === 'thrust' && mod(actor, 'dragonThrust') > 0 && actor.marks.dragonTurn !== f.turn,
    ward,
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
  const take = (pool: number, def: number, resist: number): number => {
    const full = (left * (1 - Math.min(MAX_RESIST, resist))) / def;
    if (full <= pool) {
      left = 0;
      return Math.round(full);
    }
    left *= 1 - pool / full;
    return pool;
  };
  const out: Landing = { shield: 0, armor: 0, hp: 0 };
  if (type !== 'soul') {
    if (target.shield > 0) out.shield = take(target.shield, shieldDefense(target) * n.weaken, 0);
    const worn = target.armor;
    if (left > 0 && worn && worn.hp > 0) {
      out.armor = take(worn.hp, worn.defense * n.weaken, (worn.resist[type] ?? 0) * n.pierce);
    }
  }
  if (left > 0) {
    const wound = type === 'soul' ? soulWound(target) : 1;
    out.hp = Math.round((left * (1 - Math.min(MAX_RESIST, n.resist)) * wound) / n.defense);
  }
  return out;
}

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
  chance: number;
  damage: number;
  /** The qi it costs. */
  qi: number;
}

/**
 * Prices an attacking main action against its target without rolling: the hit chance and a
 * plain hit's damage at the spread's middle, element, resist, combo and the Dao rules included.
 * Null for an action that doesn't attack, can't be paid, or has no standing target. The Combat
 * screen shows this beside every technique, and the profiles pick by it.
 */
export function preview(f: Fight, actorId: string, m: MainAction): Preview | null {
  const actor = combatantIn(f, actorId);
  if (!actor || actor.state !== 'fighting') return null;
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
  } else return null;
  if (!a || typeof a === 'string') return null;
  const target = foe(f, actor, 'target' in m ? (m.target ?? '') : '');
  if (!target) return null;
  const n = numbers(f, actor, target, a);
  const hit = force({
    base: a.base,
    attack: n.attack,
    element: n.element,
    result: 'hit',
    combo: comboMultiplier(nextCombo(actor.combo, damagePhase(a.type))),
  });
  const l = landing(target, hit, a.type, n);
  const dealt = l.shield + l.armor + l.hp;
  return { chance: n.sure ? 1 : hitChance(n.accuracy, n.evasion), damage: dealt, qi };
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
      const cost = techniqueCost(actor, known.technique);
      if (actor.qi < cost) return 'not enough qi';
      const target = foe(f, actor, m.target);
      if (!target) return 'no target';
      const spec = techniqueAttack(actor, m.id, creativity);
      if (typeof spec === 'string') return spec;
      actor.qi -= cost;
      const os = attack(f, actor, target, rng, spec);
      // Sword Rain: once a fight, a sword technique strikes every foe.
      if (spec.daos.includes('sword') && mod(actor, 'swordRain') > 0 && !actor.marks.swordRain) {
        mark(actor, 'swordRain');
        for (const other of f.combatants) {
          if (other === target || other.side === actor.side || other.state !== 'fighting') continue;
          os.push(...attack(f, actor, other, rng, spec));
        }
      }
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
      const os = attack(f, actor, target, rng, strikeAttack(actor, creativity));
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
        return attack(f, actor, target, rng, strike).map((o) => ({
          ...o,
          action: 'item' as const,
          id: it.id,
        }));
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
      if (!target) return 'no one to talk to';
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
      // Surrender, accepted, takes you out of the fight; what the other styles win is the
      // speaker's profile and the story's (P2.2, P3.9).
      if (swayed && m.style === 'surrender') actor.state = 'yielded';
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
      return [{ ...out, result: escaped ? 'escaped' : 'failed', chance }];
    }
  }
}

/** Flurry: a fist strike as the minor action, at the share of a strike the Fist Dao gives. */
function flurry(f: Fight, actor: Combatant, targetId: string, rng: Rng): Outcome[] | string {
  const share = Math.min(1, mod(actor, 'flurry'));
  if (share <= 0) return 'no flurry';
  if (actor.weapon.kind !== 'fist') return 'a flurry needs fists';
  const target = foe(f, actor, targetId);
  if (!target) return 'no target';
  const spec = strikeAttack(actor, 1);
  return attack(f, actor, target, rng, { ...spec, base: spec.base * share }).map((o) => ({
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
 * Damage that spills onto another foe without a roll: a spear's sweep, a saber's cleave. `dealt`
 * is the share before protective qi, which this foe's own realm then meets.
 */
function splash(
  f: Fight,
  actor: Combatant,
  target: Combatant,
  a: Attack,
  dealt: number,
): Omit<Outcome, 'action'> {
  const warded = dealt * protection(actor, target, a.reach);
  const l = soak(target, Math.max(1, Math.round(guarded(f, target, warded))));
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
 * An attack: Accuracy against Evasion, then Attack over Defense, with its status on a critical
 * and the backfire, then what the Dao rules add: a run of saber hits, qi back on a hit, Severing's
 * bleed on any metal hit, a critical's frozen chill, spreading burn and falling mountain, Hundred
 * Fists' second action, and the spear's sweep and the saber's cleave onto other foes. The first
 * outcome is the target's; any others are the foes the action spilled onto.
 */
function attack(
  f: Fight,
  actor: Combatant,
  target: Combatant,
  rng: Rng,
  a: Attack,
): Omit<Outcome, 'action'>[] {
  const n = numbers(f, actor, target, a);
  if (n.sure) mark(actor, 'dragonTurn', f.turn);
  const { result, chance } = judge(rng, n.accuracy, n.evasion, {
    fortune: actor.fortune,
    qi: a.qi,
    toxicity: actor.toxicity,
    crit: n.crit,
    sure: n.sure,
  });
  mark(actor, 'struck');
  if (a.daos.includes('sword')) mark(actor, 'oneSword');
  // Acting with a Dao from under a tenth of your HP: a win after it is that Dao's moment.
  if (actor.hp < BRINK_HP * actor.maxHp) {
    for (const d of a.daos) if (isCombatDao(d)) mark(actor, brinkMark(d));
  }
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
    if (mod(actor, 'cleavingTide') <= 0) mark(actor, 'momentum', 0);
    return [out];
  }
  if (result === 'backfire') {
    // Qi deviation: the action turns on its actor at half strength, with no element.
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
    return [{ ...out, damage: dealt, hp: { id: actor.id, hp: actor.hp, max: actor.maxHp } }];
  }

  const crit = result === 'critical';
  const chilled = hasStatus(target, 'chilled');
  const combo = nextCombo(actor.combo, phase);
  actor.combo = combo;
  const hit = guarded(
    f,
    target,
    force({
      base: a.base,
      attack: n.attack * (crit ? n.critAttack : 1),
      element: n.element,
      result,
      combo: comboMultiplier(combo),
      spread: rollSpread(rng),
    }),
  );
  const landed = landing(target, hit, a.type, n);
  const dealt = land(target, landed);
  if (a.daos.includes('saber')) mark(actor, 'momentum', (actor.marks.momentum ?? 0) + 1);
  const back = mod(actor, 'qiOnHit');
  if (back > 0) actor.qi = Math.min(actor.maxQi, actor.qi + Math.round(back * actor.maxQi));

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
  // A spear's sweep: a second foe takes a share, every other foe with Whirl.
  const sweep = a.daos.includes('spear') ? mod(actor, 'sweep') : 0;
  if (sweep > 0) {
    const rest = others(f, actor, target);
    for (const c of mod(actor, 'whirl') > 0 ? rest : rest.slice(0, 1)) {
      outcomes.push(splash(f, actor, c, a, (dealt / n.ward) * sweep));
    }
  }
  // A saber's critical carries a share to a second foe.
  const cleave = crit && a.daos.includes('saber') ? mod(actor, 'cleave') : 0;
  if (cleave > 0) {
    const next = others(f, actor, target)[0];
    if (next) outcomes.push(splash(f, actor, next, a, (dealt / n.ward) * cleave));
  }
  return outcomes;
}
