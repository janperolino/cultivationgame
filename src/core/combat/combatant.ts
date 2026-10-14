// A combatant: everyone in a fight, the player, an NPC, a beast or a co-op guest, as one record
// the turn rules read (core/combat/fight.ts). It carries its techniques and items as records, not
// ids, so generated ones fight like authored ones. Its sheet (design § Combat) is six plain
// numbers built from its rungs and what feeds each line: HP and the qi pool climb the body and
// qi ladders by the realm sizes, armor sizes Defense, a weapon sizes Attack, and the stats the
// trees, methods and growth add (content/stats.ts) multiply in. `fromCultivator` builds one from
// a cultivator, `sheet` reads the six lines for the Character screen.
import {
  AGILITY_BASE,
  AGILITY_PER_POINT,
  BIND_EVASION,
  HIT_PER_POINT,
  HP_PER_SIZE,
  MATERIAL_RESIST,
  QI_PER_SIZE,
  RESOLVE_BASE,
  statusInfo,
  type DamageType,
  type StatusId,
  type WeaponKind,
} from '../../content/combat.ts';
import type { LadderId } from '../../content/cultivation.ts';
import type { ProfileId } from '../../content/enemies.ts';
import { phaseOf, type PhaseElement } from '../../content/elements.ts';
import { hasItem, item, type Item } from '../../content/items.ts';
import { statInfo, STAT_IDS, type StatId } from '../../content/stats.ts';
import { DAOS, tierNodes } from '../../content/trees/index.ts';
import { gearBand, weaponAccuracy } from '../gear.ts';
import { ownTier } from '../toxicity.ts';
import { artOwn, tierHeld } from '../trees.ts';
import { rarityAccuracy, rarityMultiplier, type RarityId } from '../../content/rarity.ts';
import { tierStep } from '../../content/realms.ts';
import { hasTechnique, technique, type Technique } from '../../content/techniques.ts';
import type { Cultivator } from '../state.ts';
import { agility, fortune, stats } from '../stats.ts';
import { masteryAccuracy, techniqueSealed } from '../techniques.ts';
import type { Combo } from './damage.ts';
import { bandOf, rungOf, rungSize, type Rung } from './sheet.ts';

/** What a held weapon does: sizes basic strikes at its full band, its Dao's techniques at half. */
export interface Weapon {
  kind: WeaponKind;
  strike: number;
  technique: number;
  /** What it multiplies Accuracy by: half a technique's at gold and red. */
  accuracy: number;
  /** The share of the qi pool each strike drinks: a weapon above your realm. */
  drink: number;
}

/** A weapon of a kind, tier and rarity: its band on strikes, the square root on techniques of its Dao. */
export function weapon(kind: WeaponKind, tier: number, r: RarityId): Weapon {
  const m = rarityMultiplier(r, tierStep(tier));
  return {
    kind,
    strike: m,
    technique: Math.sqrt(m),
    accuracy: Math.sqrt(rarityAccuracy(r)),
    drink: 0,
  };
}

/** Bare hands: a white tier 1 fist weapon, so unarmed strikes run through the same rule. */
export const BARE_HANDS: Weapon = weapon('fist', 1, 'white');

/** Armor: Defense at its band, and the one damage type its material resists. */
export function armor(
  tier: number,
  r: RarityId,
  material?: DamageType,
): { defense: number; resist: Partial<Record<DamageType, number>> } {
  return {
    defense: rarityMultiplier(r, tierStep(tier)),
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
  /** Set by the Dao rules of whoever applied it (core/combat/fight.ts): acts last, loses its minor, loses Evasion, burns as one sea. */
  slow?: boolean;
  undertow?: boolean;
  bind?: boolean;
  sea?: boolean;
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
  /** Talking: the listener's soul size is multiplied by this over 10; temperament moves it (P2.2). */
  resolve: number;
  hp: number;
  maxHp: number;
  qi: number;
  maxQi: number;
  /** The phase their own qi counts as, for the element cycle, or null. */
  element: PhaseElement | null;
  resist: Partial<Record<DamageType, number>>;
  /** Armor's band on Defense. */
  armor: number;
  weapon: Weapon;
  /** Multiplies Accuracy: the Hit stat. */
  accuracy: number;
  /** Multipliers from stats: technique power, physical damage, technique cost, qi recovered. */
  techniquePower: number;
  physicalPower: number;
  techniqueCost: number;
  qiRecovery: number;
  /**
   * Techniques they can use, each with what mastery multiplies Accuracy with it by, and what its
   * Art's passives multiply its power and qi cost by (1 when unset).
   */
  techniques: Record<
    string,
    { technique: Technique; accuracy: number; power?: number; cost?: number }
  >;
  /** Dao tiers held, by Dao id: sword, fire. */
  daos: Record<string, number>;
  /** The Intent ladder's stage in each Dao, by Dao id (core/intent.ts): 1 Intent, 2 Domain. */
  intent: Record<string, number>;
  /** Items carried into the fight, by id. */
  items: Record<string, { item: Item; n: number }>;
  toxicity: number;
  /** How it picks its actions when the engine fights it (content/enemies.ts); the player has none. */
  profile?: ProfileId;
  /** A beast that acts only on a turn its owner commands it. */
  needsCommand?: boolean;
  /**
   * The stats that shape a fight beyond the sheet (content/stats.ts): each Dao's power, hit, crit,
   * cost and pierce, and the rule twists the Dao nodes carry. Nonzero ones only; NPCs carry none yet.
   */
  mods: Partial<Record<StatId, number>>;
  /** What this fight remembers of them: once-a-fight rules spent, a saber's run of hits. */
  marks: Record<string, number>;
  statuses: ActiveStatus[];
  /** Multiplies their Evasion until their next action: defending, cover. */
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
  const rungs = init.rungs ?? { qi: FOOT, body: FOOT, soul: FOOT };
  const maxHp = init.maxHp ?? Math.round(HP_PER_SIZE * rungSize(rungs.body));
  const maxQi = init.maxQi ?? Math.round(QI_PER_SIZE * rungSize(rungs.qi));
  return {
    rungs,
    agility: AGILITY_BASE,
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
    accuracy: 1,
    techniquePower: 1,
    physicalPower: 1,
    techniqueCost: 1,
    qiRecovery: 1,
    techniques: {},
    daos: {},
    intent: {},
    items: {},
    toxicity: 0,
    mods: {},
    marks: {},
    statuses: [],
    guard: 1,
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
 * The weapon a cultivator wields: the worn one at its band for them (core/gear.ts), or bare hands
 * when none is worn or it won't wake.
 */
export function wornWeapon(c: Cultivator): Weapon {
  const id = c.gear.weapon;
  const it = id && hasItem(id) ? item(id) : null;
  const kind = it?.uses.equip?.weapon;
  const band = it ? gearBand(c, it) : null;
  if (!it || !kind || !band) return BARE_HANDS;
  return {
    kind,
    strike: band.band,
    technique: Math.sqrt(band.band),
    accuracy: weaponAccuracy(it, band.accuracy),
    drink: band.qi,
  };
}

/** The armor a cultivator wears: Defense at its band for them, and its material's resist. */
export function wornArmor(c: Cultivator): { defense: number; material: DamageType | null } {
  const id = c.gear.armor;
  const it = id && hasItem(id) ? item(id) : null;
  const band = it ? gearBand(c, it) : null;
  if (!it || !band) return { defense: 1, material: null };
  return { defense: band.band, material: it.uses.equip?.material ?? null };
}

/**
 * The combat Dao tiers a cultivator holds, by Dao id: tiers in a row from the first, each held
 * once half its nodes are owned, and none above their realm (design § Cultivation, Daos).
 */
export function daoTiers(c: Cultivator): Record<string, number> {
  const out: Record<string, number> = {};
  const top = ownTier(c);
  for (const t of DAOS) {
    let n = 0;
    while (n < top && tierNodes(t, n + 1).length > 0 && tierHeld(c, t, n + 1)) n++;
    if (n > 0) out[t.id] = n;
  }
  return out;
}

/**
 * A cultivator as a combatant on a side, at full HP and qi, with their gear, Dao tiers and the
 * stats the trees, gear and talents give. The element is the root's when it holds one alone.
 */
export function fromCultivator(c: Cultivator, side: string): Combatant {
  const s = stats(c);
  const rungs = { qi: rungOf(c.qi), body: rungOf(c.body), soul: rungOf(c.soul) };
  const resist: Partial<Record<DamageType, number>> = {};
  for (const [type, stat] of Object.entries(RESIST_STATS)) {
    if (s[stat] !== 0) resist[type as DamageType] = s[stat];
  }
  const worn = wornArmor(c);
  if (worn.material) resist[worn.material] = (resist[worn.material] ?? 0) + MATERIAL_RESIST;
  const mods: Combatant['mods'] = {};
  for (const id of STAT_IDS) if (s[id] !== 0 && !statInfo(id).arrives) mods[id] = s[id];
  const techniques: Combatant['techniques'] = {};
  for (const id of Object.keys(c.techniques)) {
    if (!hasTechnique(id)) continue;
    const t = technique(id);
    if (techniqueSealed(c, t)) continue;
    const own = artOwn(c, id);
    techniques[id] = {
      technique: t,
      accuracy: masteryAccuracy(c, id) * (1 + HIT_PER_POINT * own.hit),
      power: 1 + own.power,
      cost: Math.max(0, 1 + own.cost),
    };
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
    maxHp: Math.round(HP_PER_SIZE * rungSize(rungs.body) * (1 + s.hp) * (1 + s.hold)),
    maxQi: Math.round(QI_PER_SIZE * rungSize(rungs.qi) * (1 + s.qiPool)),
    element: c.rootElements.length === 1 ? phaseOf(c.rootElements[0]!) : null,
    resist,
    accuracy: 1 + HIT_PER_POINT * s.hit,
    techniquePower: (1 + s.techniquePower) * (1 + s.harm),
    physicalPower: (1 + s.physicalDamage) * (1 + s.harm),
    techniqueCost: Math.max(0, 1 + s.techniqueCost),
    qiRecovery: 1 + s.qiRecovery,
    techniques,
    items,
    toxicity: c.toxicity,
    armor: worn.defense,
    weapon: wornWeapon(c),
    daos: daoTiers(c),
    intent: { ...c.intent },
    mods,
  });
}

/** What Agility does to Evasion and fleeing: 5% a point above 10. */
export function agilityFactor(c: Combatant): number {
  return Math.max(0.1, 1 + AGILITY_PER_POINT * (c.agility - AGILITY_BASE));
}

/** The product of one status field over everything afflicting a combatant, 1 with none. */
export function statusFactor(c: Combatant, field: 'accuracy' | 'evasion'): number {
  let f = 1;
  for (const a of c.statuses) f *= statusInfo(a.id)[field] ?? 1;
  return f;
}

/** Whether any status on them sets this flag. */
export function statusFlag(c: Combatant, flag: 'skipMain' | 'noFlee'): boolean {
  return c.statuses.some((a) => statusInfo(a.id)[flag] === true);
}

/** A combat stat they carry (content/stats.ts), 0 when they carry none. */
export function mod(c: Combatant, stat: StatId): number {
  return c.mods[stat] ?? 0;
}

/** Their Evasion against an attack compared on this ladder, guard and statuses included. */
export function evasion(c: Combatant, ladder: LadderId): number {
  const bound = c.statuses.some((s) => s.bind) ? BIND_EVASION : 1;
  return (
    rungSize(c.rungs[ladder]) *
    agilityFactor(c) *
    (1 + mod(c, 'evasion')) *
    c.guard *
    statusFactor(c, 'evasion') *
    bound
  );
}

/** Their Defense against an attack compared on this ladder: the rung's size at their armor's band. */
export function defense(c: Combatant, ladder: LadderId): number {
  return rungSize(c.rungs[ladder]) * c.armor;
}

/** One line of the sheet, with the band it is sized at in stage words. */
export interface SheetLine {
  value: number;
  band: string;
}

/** The six lines of a combatant's sheet, at rest: Attack and Accuracy per ladder where they differ. */
export interface Sheet {
  accuracy: Record<LadderId, SheetLine>;
  evasion: SheetLine;
  attack: Record<LadderId, SheetLine>;
  defense: SheetLine;
  hp: SheetLine;
  qi: SheetLine;
}

const line = (value: number): SheetLine => ({ value, band: bandOf(value).name });

/** The sheet the Character screen shows: every line a plain number beside its band. */
export function sheet(c: Combatant): Sheet {
  const per = (f: (l: LadderId) => number): Record<LadderId, SheetLine> => ({
    qi: line(f('qi')),
    body: line(f('body')),
    soul: line(f('soul')),
  });
  return {
    accuracy: per((l) => rungSize(c.rungs[l]) * c.accuracy),
    evasion: line(rungSize(c.rungs.body) * agilityFactor(c) * (1 + mod(c, 'evasion'))),
    attack: per(
      (l) =>
        rungSize(c.rungs[l]) *
        (l === 'body' ? c.physicalPower * c.weapon.strike : c.techniquePower),
    ),
    defense: line(defense(c, 'body')),
    hp: { value: c.maxHp, band: bandOf(c.maxHp / HP_PER_SIZE).name },
    qi: { value: c.maxQi, band: bandOf(c.maxQi / QI_PER_SIZE).name },
  };
}
