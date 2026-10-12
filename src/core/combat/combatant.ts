// A combatant: everyone in a fight, the player, an NPC, a beast or a co-op guest, as one record
// the turn rules read (core/combat/fight.ts). It carries its techniques and items as records, not
// ids, so generated ones fight like authored ones. `fromCultivator` builds one from a cultivator:
// HP climbs the body ladder and the qi pool the qi ladder, with the same steps as damage, and the
// stats the trees, methods and growth add (content/stats.ts) come in here.
import {
  HP_BASE,
  MATERIAL_RESIST,
  QI_POOL_BASE,
  RESOLVE_BASE,
  statusInfo,
  type DamageType,
  type StatusId,
  type WeaponKind,
} from '../../content/combat.ts';
import type { LadderId } from '../../content/cultivation.ts';
import { phaseOf, type PhaseElement } from '../../content/elements.ts';
import { hasItem, item, type Item } from '../../content/items.ts';
import { rarityMultiplier, type RarityId } from '../../content/rarity.ts';
import { tierGap } from '../../content/realms.ts';
import { hasTechnique, technique, type Technique } from '../../content/techniques.ts';
import type { Cultivator } from '../state.ts';
import { agility, fortune, stats } from '../stats.ts';
import { masteryCheckBonus, techniqueSealed } from '../techniques.ts';
import type { Combo } from './damage.ts';
import { rungOf, rungPower, type Rung } from './ladder.ts';

/** What a held weapon does: basic strikes at its full exponent, its Dao's techniques at half. */
export interface Weapon {
  kind: WeaponKind;
  strike: number;
  technique: number;
  hit: number;
}

/** A weapon of a kind, tier and rarity: gap^f on strikes, gap^(f/2) on techniques of its Dao. */
export function weapon(kind: WeaponKind, tier: number, r: RarityId): Weapon {
  const m = rarityMultiplier(r, tierGap(tier));
  return { kind, strike: m, technique: Math.sqrt(m), hit: r === 'red' ? 2 : r === 'gold' ? 1 : 0 };
}

/** Bare hands: a white tier 1 fist weapon, so unarmed strikes run through the same rule. */
export const BARE_HANDS: Weapon = weapon('fist', 1, 'white');

/** Armor's divisor on incoming damage, its tier's gap^f, and the type its material resists. */
export function armor(
  tier: number,
  r: RarityId,
  material?: DamageType,
): { divisor: number; resist: Partial<Record<DamageType, number>> } {
  return {
    divisor: rarityMultiplier(r, tierGap(tier)),
    resist: material ? { [material]: MATERIAL_RESIST } : {},
  };
}

export interface ActiveStatus {
  id: StatusId;
  turns: number;
  /** Damage it deals at the start of each turn, fixed when it was applied. */
  dot: number;
  /** The turn it was applied; it starts counting down after that turn. */
  since: number;
}

export type CombatantState = 'fighting' | 'down' | 'fled' | 'yielded';

export interface Combatant {
  id: string;
  name: string;
  /** Any string; everyone on the same side fights together. */
  side: string;
  rungs: Record<LadderId, Rung>;
  agility: number;
  fortune: number;
  /** Talking: the target number a speaker beats is 8 + this; temperament moves it (P2.2). */
  resolve: number;
  hp: number;
  maxHp: number;
  qi: number;
  maxQi: number;
  /** The phase their own qi counts as, for the element cycle, or null. */
  element: PhaseElement | null;
  resist: Partial<Record<DamageType, number>>;
  /** Armor's divisor on incoming damage. */
  armor: number;
  weapon: Weapon;
  /** Added to every check: the Hit stat. */
  hit: number;
  /** Multipliers from stats: technique power, physical damage, technique cost, qi recovered. */
  techniquePower: number;
  physicalPower: number;
  techniqueCost: number;
  qiRecovery: number;
  /** Techniques they can use, each with what mastery adds to checks with it. */
  techniques: Record<string, { technique: Technique; check: number }>;
  /** Dao tiers held, by Dao id: sword, fire. */
  daos: Record<string, number>;
  /** Items carried into the fight, by id. */
  items: Record<string, { item: Item; n: number }>;
  toxicity: number;
  /** A beast that acts only on a turn its owner commands it. */
  needsCommand?: boolean;
  statuses: ActiveStatus[];
  /** Added to their target number until their next action: defending, cover. */
  guard: number;
  combo: Combo | null;
  /** Creative tricks already used this fight; the same one earns nothing twice. */
  tricks: string[];
  state: CombatantState;
}

export type CombatantInit = Partial<Combatant> & Pick<Combatant, 'id' | 'name' | 'side'>;

const FOOT: Rung = { realm: 'qi-condensation', stage: 1, grade: 0 };

/** A combatant from parts, everything unnamed at an ordinary Qi Condensation layer 1. */
export function combatant(init: CombatantInit): Combatant {
  const maxHp = init.maxHp ?? HP_BASE;
  const maxQi = init.maxQi ?? QI_POOL_BASE;
  return {
    rungs: { qi: FOOT, body: FOOT, soul: FOOT },
    agility: 10,
    fortune: 10,
    resolve: RESOLVE_BASE,
    hp: maxHp,
    maxHp,
    qi: maxQi,
    maxQi,
    element: null,
    resist: {},
    armor: 1,
    weapon: BARE_HANDS,
    hit: 0,
    techniquePower: 1,
    physicalPower: 1,
    techniqueCost: 1,
    qiRecovery: 1,
    techniques: {},
    daos: {},
    items: {},
    toxicity: 0,
    statuses: [],
    guard: 0,
    combo: null,
    tricks: [],
    state: 'fighting',
    ...init,
  };
}

const RESIST_STATS: Partial<
  Record<DamageType, 'physicalResist' | 'poisonResist' | 'lightningResist' | 'fireResist'>
> = {
  physical: 'physicalResist',
  poison: 'poisonResist',
  lightning: 'lightningResist',
  fire: 'fireResist',
};

/**
 * A cultivator as a combatant on a side, at full HP and qi. The element is the root's when it
 * holds one alone. Gear and Daos arrive with the bag and the Dao data (P2.3).
 */
export function fromCultivator(c: Cultivator, side: string): Combatant {
  const s = stats(c);
  const rungs = { qi: rungOf(c.qi), body: rungOf(c.body), soul: rungOf(c.soul) };
  const resist: Partial<Record<DamageType, number>> = {};
  for (const [type, stat] of Object.entries(RESIST_STATS)) {
    if (s[stat] !== 0) resist[type as DamageType] = s[stat];
  }
  const techniques: Combatant['techniques'] = {};
  for (const id of Object.keys(c.techniques)) {
    if (!hasTechnique(id)) continue;
    const t = technique(id);
    if (!techniqueSealed(c, t)) techniques[id] = { technique: t, check: masteryCheckBonus(c, id) };
  }
  const items: Combatant['items'] = {};
  for (const [id, n] of Object.entries(c.items)) {
    if (n > 0 && hasItem(id)) items[id] = { item: item(id), n };
  }
  return combatant({
    id: c.id,
    name: c.name,
    side,
    rungs,
    agility: agility(c),
    fortune: fortune(c),
    maxHp: Math.round(HP_BASE * rungPower(rungs.body) * (1 + s.hp)),
    maxQi: Math.round(QI_POOL_BASE * rungPower(rungs.qi) * (1 + s.qiPool)),
    element: c.rootElements.length === 1 ? phaseOf(c.rootElements[0]!) : null,
    resist,
    hit: s.hit,
    techniquePower: 1 + s.techniquePower,
    physicalPower: 1 + s.physicalDamage,
    techniqueCost: Math.max(0, 1 + s.techniqueCost),
    qiRecovery: 1 + s.qiRecovery,
    techniques,
    items,
    toxicity: c.toxicity,
  });
}

/** The total of one status field over everything afflicting a combatant. */
export function statusSum(c: Combatant, field: 'check' | 'tn'): number {
  let sum = 0;
  for (const a of c.statuses) sum += statusInfo(a.id)[field] ?? 0;
  return sum;
}

/** Whether any status on them sets this flag. */
export function statusFlag(c: Combatant, flag: 'skipMain' | 'noFlee'): boolean {
  return c.statuses.some((a) => statusInfo(a.id)[flag] === true);
}
