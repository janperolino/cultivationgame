// Combat's numbers (design § Combat): the sheet of six lines and the sizes that feed it, hit and
// crit chances, the damage spread, the eleven damage types and the statuses they carry, the
// five-element cycle and its combos, qi and HP, and the five tags every outcome carries. The
// rules that read them live in src/core/combat/. Every number is a starting value for the fight
// sim (P2.2) to tune.
import type { PhaseElement } from './elements.ts';
import { DAMAGE_TYPES, type DamageType, type Form } from './techniques.ts';

export { DAMAGE_TYPES, type DamageType };

// ---------------------------------------------------------------- the sheet

/**
 * HP and the qi pool per point of size: a fresh cultivator (size 10) has 100 HP and 60 qi, and
 * both climb the body and qi ladders with the realm sizes (content/realms.ts).
 */
export const HP_PER_SIZE = 10;
export const QI_PER_SIZE = 6;
/** Each point of Agility above 10 adds this to Evasion and to fleeing. */
export const AGILITY_BASE = 10;
export const AGILITY_PER_POINT = 0.05;
/** Each point of the Hit stat (nodes, gear) adds this to Accuracy. */
export const HIT_PER_POINT = 0.05;
/** Crits: this plus CRIT_PER_FORTUNE per point of Fortune above 10, at ×1.5 damage. */
export const FORTUNE_BASE = 10;
export const CRIT_BASE = 0.05;
export const CRIT_PER_FORTUNE = 0.01;
export const CRIT_DAMAGE = 1.5;
/** Each point of Fortune above 10 adds this chance of an extra drop (loot reads it, P3.3). */
export const FORTUNE_DROP = 0.02;
/** Damage lands anywhere from 1 − this to 1 + this of the formula. */
export const DAMAGE_SPREAD = 0.15;
/** Defending multiplies Evasion by this until your next action, and taking cover by COVER_EVASION. */
export const DEFEND_EVASION = 1.5;
export const COVER_EVASION = 1.25;
/** Talking: the listener's resolve over this is what their soul size is multiplied by. */
export const RESOLVE_BASE = 10;
/** Fleeing and talking feel only the square root of the size gap. */
export const SOFT_GAP = 0.5;
/** The most creativity a free-text action can earn, each point multiplying Accuracy by CREATIVITY_STEP. */
export const MAX_CREATIVITY = 3;
export const CREATIVITY_STEP = 1.1;
/** Each Dao tier an action is tagged with multiplies Accuracy and Attack by this. */
export const DAO_STEP = 1.05;
/**
 * Qi deviation: a qi technique backfires with this share of the toxicity meter's share, so a full
 * meter deviates one cast in four (design § Combat; assumed in P2.1b).
 */
export const BACKFIRE_PER_TOXICITY = 0.25;
/** A backfire turns the action on its actor at this strength, with no element. */
export const BACKFIRE_DAMAGE = 0.5;

// ---------------------------------------------------------------- damage

/** Your element overcoming the target's, and theirs overcoming yours. */
export const ELEMENT_ADVANTAGE = 1.25;
export const ELEMENT_DISADVANTAGE = 0.8;
/**
 * Chaining elements in generating order (wood, then fire) builds a combo: each link adds this to
 * damage, up to COMBO_MAX links (assumed in P2.1).
 */
export const COMBO_STEP = 0.1;
export const COMBO_MAX = 3;
/** A basic strike's base damage at tier 1: physical, on the body ladder, with whatever weapon you hold. */
export const STRIKE_POWER = 20;
/** Armor's material turns aside this much of one damage type, at any rarity. */
export const MATERIAL_RESIST = 0.25;
/** No resistance turns aside more than this. */
export const MAX_RESIST = 0.9;

// ---------------------------------------------------------------- the Dao rules

/**
 * What the combat Daos' rule twists do (design § The combat Daos; their stats in content/stats.ts
 * turn them on, core/combat/fight.ts reads them). Assumed in P2.3, starting values for the sim.
 */
/** Binding Vines: a foe you root keeps this share of its Evasion besides. */
export const BIND_EVASION = 0.8;
/** Unbreaking: a bleeding foe's armor a rarity step lower, read as its Defense times this. */
export const UNBREAKING_DEFENSE = 0.8;
/** Mist Step and Unmoved: the hit they catch does this share. */
export const HALVED_HIT = 0.5;
/** Evergreen: the HP a blow that would fell you leaves, as a share of your HP. */
export const EVERGREEN_HP = 0.25;
/** Turn order: First Blood puts you ahead of everyone, a slowing status behind everyone. */
export const FIRST_BLOOD_ORDER = 1000;
export const SLOWED_ORDER = -1000;

// ---------------------------------------------------------------- qi

/** Qi barely regenerates mid-fight: this share of the pool at the start of each turn. */
export const QI_REGEN = 0.02;
/** Defending restores this share of the pool. */
export const DEFEND_QI = 0.1;

// ---------------------------------------------------------------- elements

/** Each phase overcomes one: wood parts earth, earth dams water, water quenches fire, and so on. */
export const OVERCOMES: Record<PhaseElement, PhaseElement> = {
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
  metal: 'wood',
};
/** Each phase generates the next: wood feeds fire, fire makes earth, and so on. */
export const GENERATES: Record<PhaseElement, PhaseElement> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
};

// ---------------------------------------------------------------- statuses

/**
 * What a status does while it lasts: damage each turn as a share of the hit that applied it, a
 * multiplier on your own Accuracy and on your Evasion, a lost main action, no fleeing.
 */
export interface StatusInfo {
  id: string;
  name: string;
  /** The damage type that applies it. */
  from: DamageType;
  turns: number;
  dot?: number;
  accuracy?: number;
  evasion?: number;
  skipMain?: boolean;
  noFlee?: boolean;
}

/**
 * Most damage types carry a status (design § Combat); physical carries none. A critical applies
 * its type's status (assumed in P2.1; techniques may name their own later).
 */
export const STATUSES = [
  { id: 'burning', name: 'burning', from: 'fire', turns: 2, dot: 0.1 },
  { id: 'bleeding', name: 'bleeding', from: 'metal', turns: 3, dot: 0.1 },
  { id: 'rooted', name: 'rooted', from: 'wood', turns: 2, evasion: 0.9, noFlee: true },
  { id: 'chilled', name: 'chilled', from: 'water', turns: 2, accuracy: 0.9 },
  { id: 'staggered', name: 'staggered', from: 'earth', turns: 1, evasion: 0.85 },
  { id: 'paralyzed', name: 'paralyzed', from: 'lightning', turns: 1, accuracy: 0.8, evasion: 0.8 },
  { id: 'unbalanced', name: 'unbalanced', from: 'wind', turns: 1, accuracy: 0.9, evasion: 0.9 },
  { id: 'frozen', name: 'frozen', from: 'ice', turns: 1, skipMain: true },
  { id: 'dazed', name: 'dazed', from: 'soul', turns: 2, accuracy: 0.85 },
  { id: 'poisoned', name: 'poisoned', from: 'poison', turns: 4, dot: 0.08 },
] as const satisfies readonly StatusInfo[];

export type StatusId = (typeof STATUSES)[number]['id'];

const statusById = new Map<string, StatusInfo>(STATUSES.map((s) => [s.id, s]));
const statusByType = new Map<DamageType, StatusInfo>(STATUSES.map((s) => [s.from, s]));

export function statusInfo(id: StatusId): StatusInfo {
  const s = statusById.get(id);
  if (!s) throw new RangeError(`Unknown status ${id}`);
  return s;
}

/** The status a damage type carries, or null for physical. */
export function statusOf(type: DamageType): StatusId | null {
  return (statusByType.get(type)?.id as StatusId | undefined) ?? null;
}

// ---------------------------------------------------------------- outcome tags

/**
 * The five tags every outcome carries (design § Combat, "Effects fill the wait"): form, damage
 * type, the attacker's realm, the result and the status applied. Effects, sound and the log line
 * read nothing else.
 */
export const TECHNIQUE_FORMS = ['slash', 'thrust', 'palm', 'projectile', 'aura'] as const;
export const BEAST_FORMS = ['bite', 'claw', 'charge', 'tail', 'breath'] as const;
export const ACTION_FORMS = ['defend', 'flee', 'talk', 'item', 'command'] as const;
export type OutcomeForm = Form | (typeof ACTION_FORMS)[number];

export const ATTACK_RESULTS = ['hit', 'critical', 'miss', 'backfire'] as const;
export const ACTION_RESULTS = ['held', 'escaped', 'failed', 'swayed'] as const;
export type OutcomeResult = (typeof ATTACK_RESULTS)[number] | (typeof ACTION_RESULTS)[number];

/** How the log line names each result. */
export const RESULT_NAMES: Record<OutcomeResult, string> = {
  hit: 'Hit',
  critical: 'Critical',
  miss: 'Miss',
  backfire: 'Backfire',
  held: 'Held',
  escaped: 'Escaped',
  failed: 'Failed',
  swayed: 'Swayed',
};

/** The weapon kinds, one per combat Dao, and the form a basic strike with each takes. */
export const WEAPON_KINDS = ['sword', 'saber', 'spear', 'fist'] as const;
export type WeaponKind = (typeof WEAPON_KINDS)[number];
export const STRIKE_FORM: Record<WeaponKind, Form> = {
  sword: 'thrust',
  saber: 'slash',
  spear: 'thrust',
  fist: 'palm',
};
