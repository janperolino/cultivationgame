// The people you fight (design § Enemies, beasts and the people you meet; § Tier, rarity and
// pedigree): pedigree as a bias on the shared rarity roll, the realm baselines, the five
// profiles, the fighting-up ledger's four kits, and the shapes a generated cultivator's arts and
// consumables take. Beasts are in content/beasts.ts and the Border Wilds roster in
// content/roster.ts; core/combat/generate.ts rolls them all on the `people` stream. Every number
// is a starting value the fight sim (sim/fights.ts) tunes.
import type { LadderId } from './cultivation.ts';
import type { RarityId } from './rarity.ts';
import type { RealmId } from './realms.ts';
import type { DamageType, Form } from './techniques.ts';
import type { WeaponKind } from './combat.ts';

// ---------------------------------------------------------------- pedigree

export const PEDIGREE_IDS = ['rogue', 'small-sect', 'great-sect', 'sacred-land', 'chosen'] as const;
export type PedigreeId = (typeof PEDIGREE_IDS)[number];

/**
 * What a cultivator cultivates (design § Cultivation, Three paths): one ladder, its path art and
 * its guard art, the others left at the floor; or all three, balanced, the strongest and slowest.
 */
export const NPC_PATHS = ['qi', 'body', 'soul', 'balanced'] as const;
export type NpcPath = (typeof NPC_PATHS)[number];

export interface Pedigree {
  id: PedigreeId;
  name: string;
  /**
   * The path they walk unless their template says otherwise (P3.2): rogues and small sects learn
   * what they can get, qi; the great sects and above teach all three.
   */
  path: NpcPath;
  /**
   * The bias on the shared roll (content/rarity.ts): each rarity's weight is multiplied by b to
   * the power of its step from gray, as loot and shops are.
   */
  bias: number;
  /** The method rarity the bias makes typical, for tooltips and the pace table. */
  typical: RarityId;
  /** Technique mastery at Qi Condensation: 1 Comprehension up to 3 Perfection; a level more each realm. */
  mastery: number;
  /**
   * The realm from which they carry Intent on their weapon's Dao, and Domain (design § The combat
   * Daos, the Intent ladder); null for never.
   */
  intentFrom: RealmId | null;
  domainFrom: RealmId | null;
  /** A chosen one has one slot (method, art, weapon or armor) guaranteed gold or better. */
  guaranteedGold: boolean;
}

export const PEDIGREES: readonly Pedigree[] = [
  {
    id: 'rogue',
    name: 'Rogue',
    path: 'qi',
    bias: 0.5,
    typical: 'white',
    mastery: 1,
    guaranteedGold: false,
    intentFrom: 'core-formation',
    domainFrom: null,
  },
  {
    id: 'small-sect',
    name: 'Small sect',
    path: 'qi',
    bias: 1,
    typical: 'green',
    mastery: 2,
    guaranteedGold: false,
    intentFrom: 'foundation-establishment',
    domainFrom: 'nascent-soul',
  },
  {
    id: 'great-sect',
    name: 'Great sect',
    path: 'balanced',
    bias: 1.6,
    typical: 'blue',
    mastery: 2,
    guaranteedGold: false,
    intentFrom: 'foundation-establishment',
    domainFrom: 'nascent-soul',
  },
  {
    id: 'sacred-land',
    name: 'Sacred land',
    path: 'balanced',
    bias: 2.5,
    typical: 'purple',
    mastery: 3,
    guaranteedGold: false,
    intentFrom: 'foundation-establishment',
    domainFrom: 'core-formation',
  },
  {
    id: 'chosen',
    name: 'Chosen of heaven',
    path: 'balanced',
    bias: 4,
    typical: 'gold',
    mastery: 3,
    guaranteedGold: true,
    intentFrom: 'qi-condensation',
    domainFrom: 'core-formation',
  },
];

/**
 * Each realm's ordinary baseline rises, since anyone who reached Nascent Soul has lived for
 * centuries: the bias is multiplied by this, by realm from Qi Condensation.
 */
export const REALM_BASELINE = [1, 1, 1.3, 1.6] as const;

/** Mastery rises this many levels for every realm past the first, up to Origin. */
export const MASTERY_PER_REALM = 1;

/**
 * A breakthrough grade from the shared roll, by the rarity it lands on: gray is flawed, white and
 * green ordinary, blue superior, purple perfect, gold and red heavenly (heavenly only on a gold or
 * red method, as for the player; otherwise perfect).
 */
export const GRADE_BY_RARITY: Record<
  RarityId,
  'flawed' | 'ordinary' | 'superior' | 'perfect' | 'heavenly'
> = {
  gray: 'flawed',
  white: 'ordinary',
  green: 'ordinary',
  blue: 'superior',
  purple: 'perfect',
  gold: 'heavenly',
  red: 'heavenly',
  pristine: 'heavenly',
};

// ---------------------------------------------------------------- profiles

export const PROFILE_IDS = ['aggressive', 'cautious', 'cunning', 'cowardly', 'fanatical'] as const;
export type ProfileId = (typeof PROFILE_IDS)[number];

/** How a profile picks its main action (design § Enemies, profiles are five numbers). */
export type Pick = 'hardest' | 'element' | 'status' | 'cheapest';

export interface Profile {
  id: ProfileId;
  name: string;
  /** Its first action: its hardest technique, a defend then a probe, a status, a shield or talisman. */
  opens: 'hardest' | 'defend' | 'status' | 'talisman';
  picks: Pick;
  /** At or under this share of HP it takes a pill if it holds one, else defends every other turn. */
  guardAt: number | null;
  /** At or under this share of HP it flees. */
  fleeAt: number | null;
  /** What it says; the engine rolls surrender when it can't run, GLM voices the rest. */
  talks: string;
  /** How hard it is to talk round: its soul size is multiplied by this over 10 (content/combat.ts). */
  resolve: number;
}

export const PROFILES: readonly Profile[] = [
  {
    id: 'aggressive',
    name: 'Aggressive',
    opens: 'hardest',
    picks: 'hardest',
    guardAt: null,
    fleeAt: 0.1,
    talks: 'taunts, never begs',
    resolve: 12,
  },
  {
    id: 'cautious',
    name: 'Cautious',
    opens: 'defend',
    picks: 'element',
    guardAt: 0.5,
    fleeAt: 0.3,
    talks: 'bargains',
    resolve: 10,
  },
  {
    id: 'cunning',
    name: 'Cunning',
    opens: 'status',
    picks: 'status',
    guardAt: 0.4,
    fleeAt: 0.25,
    talks: 'bluffs, bargains, lies',
    resolve: 12,
  },
  {
    id: 'cowardly',
    name: 'Cowardly',
    opens: 'talisman',
    picks: 'cheapest',
    guardAt: 0.6,
    fleeAt: 0.5,
    talks: 'begs, surrenders',
    resolve: 6,
  },
  {
    id: 'fanatical',
    name: 'Fanatical',
    opens: 'hardest',
    picks: 'hardest',
    guardAt: null,
    fleeAt: null,
    talks: 'preaches',
    resolve: 20,
  },
];

/** A hard-hit profile picks the hardest hit unless another does at least this much more damage for its pick. */
export const PICK_SLACK = 0.8;

// ---------------------------------------------------------------- kits

/**
 * The fighting-up ledger's four rows (design § Combat), as kits rather than pedigrees: the
 * rarity of each source, the art's mastery, the breakthrough grade, and whether the body stands a
 * realm ahead. The sim measures each against an ordinary foe one realm up.
 */
export interface Kit {
  id: string;
  name: string;
  /** The pedigree whose table gives the kit its intent on the sword's Dao. */
  pedigree: PedigreeId;
  method: RarityId;
  technique: RarityId;
  weapon: RarityId;
  armor: RarityId;
  /** 0 Glimpse up to 4 Origin. */
  mastery: number;
  grade: 'flawed' | 'ordinary' | 'superior' | 'perfect' | 'heavenly';
  bodyAhead: boolean;
  /** The path the kit walks; the ledger's four rows are balanced, the sim's path rows pure. */
  path?: NpcPath;
}

export const KITS: readonly Kit[] = [
  {
    id: 'ordinary',
    pedigree: 'rogue',
    name: 'Ordinary',
    method: 'white',
    technique: 'white',
    weapon: 'white',
    armor: 'white',
    mastery: 1,
    grade: 'ordinary',
    bodyAhead: false,
  },
  {
    id: 'great-sect',
    pedigree: 'great-sect',
    name: 'Great-sect disciple',
    method: 'purple',
    technique: 'purple',
    weapon: 'purple',
    armor: 'purple',
    mastery: 2,
    grade: 'perfect',
    bodyAhead: false,
  },
  {
    id: 'genius',
    pedigree: 'sacred-land',
    name: 'Sacred-land genius',
    method: 'gold',
    technique: 'gold',
    weapon: 'gold',
    armor: 'gold',
    mastery: 2,
    grade: 'perfect',
    bodyAhead: false,
  },
  {
    id: 'chosen',
    pedigree: 'chosen',
    name: 'Chosen of heaven',
    method: 'gold',
    technique: 'red',
    weapon: 'gold',
    armor: 'gold',
    mastery: 3,
    grade: 'heavenly',
    bodyAhead: true,
  },
];

// ---------------------------------------------------------------- generated arts and kit

/**
 * The arts a generated cultivator knows until P3.5's generator writes real ones: a path art on
 * their weapon's Dao, and from small sect up a lighter second art, in their element when they hold
 * one. Power and cost are tier 1's; the tier scales both.
 */
export interface ArtShape {
  key: string;
  name: string;
  form: Form;
  power: number;
  qiCost: number;
}

export const PATH_ART: ArtShape = {
  key: 'path',
  name: 'path art',
  form: 'slash',
  power: 40,
  qiCost: 10,
};
/**
 * A soul art strikes the soul, past the qi shield and the armor, so it hits at this share of an
 * art's power (P3.2): what the fight sim's path rows hold.
 */
export const SOUL_ART_POWER = 0.33;
export const SECOND_ART: ArtShape = {
  key: 'second',
  name: 'second art',
  form: 'projectile',
  power: 30,
  qiCost: 6,
};

/** The form each weapon kind's art takes. */
export const ART_FORM: Record<WeaponKind, Form> = {
  sword: 'thrust',
  saber: 'slash',
  spear: 'thrust',
  fist: 'palm',
};

/** How a generated method splits its growth among its ladder's stats (core/growth.ts). */
export const NPC_GROWTH: Record<LadderId, Record<string, number>> = {
  qi: { qiPool: 0.35, techniquePower: 0.4, qiRecovery: 0.25 },
  body: { hp: 0.5, physicalDamage: 0.3, regeneration: 0.2 },
  soul: { soulDefense: 0.4, divineSense: 0.2, perception: 0.4 },
};

/** A generated consumable: a restoring pill or an attack talisman of the carrier's tier. */
export interface ConsumableShape {
  key: string;
  name: string;
  kind: 'pill' | 'talisman';
  restore?: { what: 'qi' | 'hp'; share: number };
  strike?: { form: Form; damage: DamageType; power: number };
}

export const CONSUMABLES: readonly ConsumableShape[] = [
  { key: 'mending-pill', name: 'Mending Pill', kind: 'pill', restore: { what: 'hp', share: 0.3 } },
  { key: 'qi-pill', name: 'Qi-Restoring Pill', kind: 'pill', restore: { what: 'qi', share: 0.3 } },
  {
    key: 'strike-talisman',
    name: 'Strike Talisman',
    kind: 'talisman',
    strike: { form: 'projectile', damage: 'fire', power: 45 },
  },
];

/** The storage a cultivator carries, by realm: a pouch at Qi Condensation, a ring from Foundation. */
export const STORAGE_BY_REALM = [
  'storage pouch',
  'storage ring',
  'storage ring',
  'storage ring',
] as const;

/**
 * The ordinary foe the ledger measures against, by realm from Qi Condensation: each realm's
 * ordinary baseline, which rises (blue and purple things by Nascent Soul) as its mastery does, a
 * level a realm. The sim tunes these.
 */
export const FOE_BASELINE: readonly Kit[] = [
  { ...KITS[0]!, id: 'foe-qc', name: 'Ordinary foe' },
  { ...KITS[0]!, id: 'foe-fe', name: 'Ordinary foe', mastery: 2 },
  {
    ...KITS[0]!,
    id: 'foe-cf',
    name: 'Ordinary foe',
    method: 'green',
    technique: 'green',
    weapon: 'green',
    armor: 'green',
    mastery: 3,
  },
  {
    ...KITS[0]!,
    id: 'foe-ns',
    name: 'Ordinary foe',
    method: 'blue',
    technique: 'blue',
    weapon: 'blue',
    armor: 'blue',
    mastery: 4,
  },
  {
    ...KITS[0]!,
    id: 'foe-dt',
    name: 'Ordinary foe',
    method: 'blue',
    technique: 'purple',
    weapon: 'blue',
    armor: 'purple',
    mastery: 4,
  },
];
