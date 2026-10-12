// Combat's numbers (design § Combat): checks, criticals and grazes, the one ladder of realm and
// stage gaps, the damage tiers, the eleven damage types and the statuses they carry, the
// five-element cycle and its combos, qi and HP, and the five tags every outcome carries. The
// rules that read them live in src/core/combat/. Every number is a starting value for the fight
// sim (P2.2) to tune.
import type { PhaseElement } from './elements.ts';
import { DAMAGE_TYPES, type DamageType, type Form } from './techniques.ts';

export { DAMAGE_TYPES, type DamageType };

// ---------------------------------------------------------------- checks

/** Every check is d20 plus bonuses against a target number. */
export const DIE = 20;
/** Beat the target by this much for a critical. */
export const CRIT_MARGIN = 10;
/** Miss by this much or less for a half-damage graze. */
export const GRAZE_MARGIN = 3;
/** Fortune above this widens the critical range... */
export const FORTUNE_BASE = 10;
/** ...by one face for every this many points, so 14 Fortune crits on 19 or 20. */
export const FORTUNE_PER_FACE = 4;
/** Each point of Fortune above 10 adds this chance of an extra drop (loot reads it, P3.3). */
export const FORTUNE_DROP = 0.02;

/**
 * The target number of an attack: this plus the defender's Agility, so an ordinary foe at
 * Agility 10 stands at 18, as in the worked turn (assumed in P2.1).
 */
export const ATTACK_TN_BASE = 8;
/** Defending adds this to your target number until your next action. */
export const DEFEND_TN = 4;
/** Taking cover adds this to your target number until your next action. */
export const COVER_TN = 2;
/** Fleeing: d20 + your Agility above 10 against this plus the fastest foe's Agility. */
export const FLEE_TN_BASE = 2;
/** Talking: d20 against this plus the listener's resolve, which temperament sets (P2.2). */
export const TALK_TN_BASE = 8;
export const RESOLVE_BASE = 10;
/** Fleeing and talking feel the gap less: this share of it. */
export const SOFT_GAP = 0.5;
/** The most creativity a free-text action can earn. */
export const MAX_CREATIVITY = 3;
/** Each Dao tier an action is tagged with adds this to checks and DAO_DAMAGE to damage. */
export const DAO_CHECK = 1;
export const DAO_DAMAGE = 0.05;

// ---------------------------------------------------------------- the one ladder

/** Checks: −2 per stage between you, −1 per Qi Condensation layer, −2 per major breakthrough. */
export const CHECK_PER_STAGE = 2;
export const CHECK_PER_BREAK = 2;
/** Damage: ×1.2 per stage between you; each major breakthrough has its own step (realms.ts). */
export const DAMAGE_PER_STAGE = 1.2;
/** A Qi Condensation layer is worth this much of a stage. */
export const QC_LAYER_STAGE = 0.5;

// ---------------------------------------------------------------- damage

/** The tier multiplier: what each result does to damage. */
export const RESULT_DAMAGE = { critical: 1.5, hit: 1, graze: 0.5 } as const;
/** A backfire turns the action on its actor at this tier, with no gap and no element. */
export const BACKFIRE_DAMAGE = 0.5;
/** Your element overcoming the target's, and theirs overcoming yours. */
export const ELEMENT_ADVANTAGE = 1.25;
export const ELEMENT_DISADVANTAGE = 0.8;
/**
 * Chaining elements in generating order (wood, then fire) builds a combo: each link adds this to
 * damage, up to COMBO_MAX links (assumed in P2.1).
 */
export const COMBO_STEP = 0.1;
export const COMBO_MAX = 3;
/** A basic strike's power: physical, on the body ladder, with whatever weapon you hold. */
export const STRIKE_POWER = 20;
/** Armor's material turns aside this much of one damage type, at any rarity. */
export const MATERIAL_RESIST = 0.25;
/** No resistance turns aside more than this. */
export const MAX_RESIST = 0.9;

// ---------------------------------------------------------------- HP and qi

/**
 * HP and the qi pool at Qi Condensation layer 1, before stats. They climb the body and qi ladders
 * with the damage steps, so a realm up is about 9×, 30× or 100× the power (assumed in P2.1).
 */
export const HP_BASE = 100;
export const QI_POOL_BASE = 60;
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
 * change to your own checks and to your target number, a lost main action, no fleeing.
 */
export interface StatusInfo {
  id: string;
  name: string;
  /** The damage type that applies it. */
  from: DamageType;
  turns: number;
  dot?: number;
  check?: number;
  tn?: number;
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
  { id: 'rooted', name: 'rooted', from: 'wood', turns: 2, tn: -2, noFlee: true },
  { id: 'chilled', name: 'chilled', from: 'water', turns: 2, check: -2 },
  { id: 'staggered', name: 'staggered', from: 'earth', turns: 1, tn: -3 },
  { id: 'paralyzed', name: 'paralyzed', from: 'lightning', turns: 1, check: -4, tn: -4 },
  { id: 'unbalanced', name: 'unbalanced', from: 'wind', turns: 1, check: -2, tn: -2 },
  { id: 'frozen', name: 'frozen', from: 'ice', turns: 1, skipMain: true },
  { id: 'dazed', name: 'dazed', from: 'soul', turns: 2, check: -3 },
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
export type OutcomeForm = Form | (typeof BEAST_FORMS)[number] | (typeof ACTION_FORMS)[number];

export const ATTACK_RESULTS = ['hit', 'critical', 'graze', 'miss', 'backfire'] as const;
export const ACTION_RESULTS = ['held', 'escaped', 'failed', 'swayed'] as const;
export type OutcomeResult = (typeof ATTACK_RESULTS)[number] | (typeof ACTION_RESULTS)[number];

/** How the log line names each result. */
export const RESULT_NAMES: Record<OutcomeResult, string> = {
  hit: 'Hit',
  critical: 'Critical',
  graze: 'Graze',
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
