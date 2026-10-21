// A combatant: everyone in a fight, the player, an NPC, a beast or a co-op guest, as one record
// the turn rules read (core/combat/fight.ts). It carries its techniques and items as records, not
// ids, so generated ones fight like authored ones. Its sheet (design § Combat) is six plain
// numbers built from its rungs and what feeds each line: HP and the qi pool climb the body and
// qi ladders by the realm sizes, a weapon sizes Attack, and the stats the trees, methods and
// growth add (content/stats.ts) multiply in. Every rung counts at least half the highest (the
// floor), and each path guards its own way, its ladder at half and its guard art the other half:
// the qi shield's Defense, the body's Defense, the soul's share of Evasion (P3.2). A hit meets
// three bars in turn: the qi shield, the armor, then the body's HP. `fromCultivator` builds one
// from a cultivator, `sheet` reads the lines for the Character screen.
import {
  AGILITY_BASE,
  agilityShare,
  ARMOR_PER_SIZE,
  BIND_EVASION,
  GUARD_SHARE,
  HIT_PER_POINT,
  HP_PER_SIZE,
  LADDER_FLOOR,
  MATERIAL_RESIST,
  QI_PER_SIZE,
  SHIELD_PER_SIZE,
  RESOLVE_BASE,
  SOFT_GAP,
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
import { realmSize, tierRealm, tierStep } from '../../content/realms.ts';
import {
  GUARDS,
  hasTechnique,
  technique,
  type GuardId,
  type Technique,
} from '../../content/techniques.ts';
import { topLadder, type Cultivator } from '../state.ts';
import { agility, fortune, stats } from '../stats.ts';
import { masteryAccuracy, techniqueSealed } from '../techniques.ts';
import type { Combo } from './damage.ts';
import { bandOf, floored, rungOf, rungSize, tierScale, withFloor, type Rung } from './sheet.ts';

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

/**
 * Armor worn into a fight: a bar of its own, its durability, between the qi shield and the body
 * (P3.2). Its Defense is its size, its tier's realm at its rarity's band, and its material's
 * resist turns only what strikes it.
 */
export interface ArmorBar {
  defense: number;
  hp: number;
  max: number;
  resist: Partial<Record<DamageType, number>>;
}

/** An armor bar of a size: durability ARMOR_PER_SIZE a point, and its material's resist. */
export function armorBar(size: number, material?: DamageType | null): ArmorBar {
  const max = Math.round(ARMOR_PER_SIZE * size);
  return { defense: size, hp: max, max, resist: material ? { [material]: MATERIAL_RESIST } : {} };
}

/** Armor of a tier and rarity, worn at its own tier: its realm's size at its band. */
export function armor(tier: number, r: RarityId, material?: DamageType): ArmorBar {
  return armorBar(realmSize(tierRealm(tier).id) * rarityMultiplier(r, tierStep(tier)), material);
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
  /** The qi shield: a bar over the body, sized by the qi rung, full when a fight starts. */
  shield: number;
  maxShield: number;
  /** Armor worn, as its own bar, or null. */
  armor: ArmorBar | null;
  /**
   * What each guard art gives on top of its ladder's half: its band against your realm, 0 with
   * none known (design § Combat, The sheet). A white art of your realm's tier is 1.
   */
  guards: Record<GuardId, number>;
  /** The phase their own qi counts as, for the element cycle, or null. */
  element: PhaseElement | null;
  resist: Partial<Record<DamageType, number>>;
  /** Multiplies body Defense: a beast's hide (lower than a cultivator's), bloodline passives. */
  hide: number;
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
  /** A beast: it can't be talked to, and doesn't take a surrender (Fights you play). */
  beast?: boolean;
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

/** No guard arts known: each guard reads its ladder at half. */
export const NO_GUARDS: Record<GuardId, number> = { shield: 0, hardening: 0, movement: 0 };
/** A white guard art of your tier on every path: each guard reads its ladder in full. */
export const WHITE_GUARDS: Record<GuardId, number> = { shield: 1, hardening: 1, movement: 1 };

/**
 * A combatant from parts, everything unnamed at an ordinary Qi Condensation layer 1 with a white
 * guard art on every path, so each guard reads its ladder in full.
 */
export function combatant(init: CombatantInit): Combatant {
  const rungs = init.rungs ?? { qi: FOOT, body: FOOT, soul: FOOT };
  const maxHp = init.maxHp ?? Math.round(HP_PER_SIZE * rungSize(rungs.body));
  const maxQi = init.maxQi ?? Math.round(QI_PER_SIZE * rungSize(rungs.qi));
  const maxShield = init.maxShield ?? Math.round(SHIELD_PER_SIZE * rungSize(rungs.qi));
  return {
    rungs,
    agility: AGILITY_BASE,
    fortune: 10,
    resolve: RESOLVE_BASE,
    hp: maxHp,
    maxHp,
    qi: maxQi,
    maxQi,
    shield: maxShield,
    maxShield,
    armor: null,
    guards: WHITE_GUARDS,
    element: null,
    resist: {},
    hide: 1,
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

/**
 * The armor a cultivator wears, as its bar: its size is its band for them at their realm's size,
 * so a white armor of their tier stands at their realm's first stage. Null when none is worn or
 * it won't wake.
 */
export function wornArmor(c: Cultivator): ArmorBar | null {
  const id = c.gear.armor;
  const it = id && hasItem(id) ? item(id) : null;
  const band = it ? gearBand(c, it) : null;
  if (!it || !band) return null;
  const size = band.band * realmSize(tierRealm(ownTier(c)).id);
  const bar = armorBar(size, it.uses.equip?.material ?? null);
  // Its wear carries from the last fight until a refiner mends it (P3.5).
  const wear = c.wear[it.id] ?? 0;
  return { ...bar, hp: Math.round(bar.max * (1 - wear)) };
}

/** The cultivator with the wear a fight left on their armor: the share of its bar it took. */
export function wearFrom(c: Cultivator, fought: Pick<Combatant, 'armor'>): Cultivator {
  const id = c.gear.armor;
  if (!id || !fought.armor || fought.armor.max <= 0) return c;
  const wear = Math.min(1, Math.max(0, 1 - fought.armor.hp / fought.armor.max));
  return { ...c, wear: { ...c.wear, [id]: Math.round(wear * 1000) / 1000 } };
}

/**
 * What a guard art gives on top of its ladder's half: its rarity's band, scaled by its tier
 * against your realm's, so a white art of your tier gives 1 and one a realm below a step less.
 */
export function guardArt(t: Pick<Technique, 'rarity' | 'tier'>, own: number): number {
  return (rarityMultiplier(t.rarity, tierStep(t.tier)) * tierScale(t.tier)) / tierScale(own);
}

/** The guard arts a cultivator knows and can use, the best of each guard. */
export function guardsOf(c: Cultivator): Record<GuardId, number> {
  const out = { ...NO_GUARDS };
  const own = ownTier(c);
  for (const id of Object.keys(c.techniques)) {
    if (!hasTechnique(id)) continue;
    const t = technique(id);
    if (!t.guard || techniqueSealed(c, t)) continue;
    out[t.guard] = Math.max(out[t.guard], guardArt(t, own));
  }
  return out;
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
  const rungs = withFloor(
    { qi: rungOf(c.qi), body: rungOf(c.body), soul: rungOf(c.soul) },
    LADDER_FLOOR,
  );
  const resist: Partial<Record<DamageType, number>> = {};
  for (const [type, stat] of Object.entries(RESIST_STATS)) {
    if (s[stat] !== 0) resist[type as DamageType] = s[stat];
  }
  const mods: Combatant['mods'] = {};
  for (const id of STAT_IDS) if (s[id] !== 0 && !statInfo(id).arrives) mods[id] = s[id];
  const techniques: Combatant['techniques'] = {};
  for (const id of Object.keys(c.techniques)) {
    if (!hasTechnique(id)) continue;
    const t = technique(id);
    // A guard art is never cast: it stands in `guards`.
    if (t.guard || techniqueSealed(c, t)) continue;
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
    armor: wornArmor(c),
    guards: guardsOf(c),
    weapon: wornWeapon(c),
    daos: daoTiers(c),
    intent: { ...c.intent },
    mods,
  });
}

/** Their highest rung, which is their realm (design § Cultivation, Three paths). */
export function topRung(c: Pick<Combatant, 'rungs'>): Rung {
  return c.rungs[topLadder(c.rungs)];
}

/** What Agility does to Evasion and fleeing: 5% a point above 10. */
export function agilityFactor(c: Combatant): number {
  return agilityShare(c.agility);
}

/**
 * What a movement art lifts the Agility tempo and fleeing read by (design § Combat, Speed is
 * tempo): the square root of its band against your realm, so white of your tier is ×1, purple at
 * tier 1 ×1.6 and gold ×1.8; never under 1, with none or one below your tier.
 */
export function movementLift(c: Pick<Combatant, 'guards'>): number {
  return Math.sqrt(Math.max(1, c.guards.movement));
}

/**
 * Tempo (design § Combat, Speed is tempo), which fleeing reads too: Agility, lifted by the
 * movement art, times the square root of their size, their highest rung's, so realm counts,
 * softened, as it does when you run.
 */
export function tempo(c: Combatant): number {
  return agilityFactor(c) * movementLift(c) * rungSize(topRung(c)) ** SOFT_GAP;
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

/** How much of its guard a path reads: half from the ladder, the rest from its guard art. */
export function guardFactor(c: Combatant, g: GuardId): number {
  return GUARD_SHARE + (1 - GUARD_SHARE) * c.guards[g];
}

/**
 * The size Evasion reads against an attack on this ladder: your rung on it, or your soul when it
 * stands higher, read through the movement guard (design § Combat, The sheet): a strong soul sees
 * the blow coming, and a movement art lets the body act on it.
 */
export function evasionSize(c: Combatant, ladder: LadderId): number {
  return Math.max(rungSize(c.rungs[ladder]), rungSize(c.rungs.soul) * guardFactor(c, 'movement'));
}

/**
 * What a soul strike's damage is multiplied by before it takes HP: your body's size over your
 * soul's, so your HP holds against it as if it were sized by your soul. A body refiner's soul is
 * wrecked at its floor; a strong soul shrugs a soul strike off.
 */
export function soulWound(c: Combatant): number {
  return rungSize(c.rungs.body) / rungSize(c.rungs.soul);
}

/** Their Evasion against an attack compared on this ladder, guard and statuses included. */
export function evasion(c: Combatant, ladder: LadderId): number {
  const bound = c.statuses.some((s) => s.bind) ? BIND_EVASION : 1;
  return (
    evasionSize(c, ladder) *
    agilityFactor(c) *
    (1 + mod(c, 'evasion')) *
    c.guard *
    statusFactor(c, 'evasion') *
    bound
  );
}

/**
 * Their body's Defense against an attack compared on this ladder: the body through its hardening
 * guard and their hide, or the soul against soul damage.
 */
export function defense(c: Combatant, ladder: LadderId): number {
  if (ladder === 'soul') return rungSize(c.rungs.soul);
  return rungSize(c.rungs[ladder]) * guardFactor(c, 'hardening') * c.hide;
}

/** The qi shield's Defense: the qi rung through its shield guard. */
export function shieldDefense(c: Combatant): number {
  return rungSize(c.rungs.qi) * guardFactor(c, 'shield');
}

/** One line of the sheet, with the band it is sized at in stage words. */
export interface SheetLine {
  value: number;
  band: string;
}

/**
 * The six lines of a combatant's sheet, at rest, with Attack and Accuracy per ladder where they
 * differ; then the qi shield and the armor as bars, each with its Defense; what each guard
 * reads; and the ladders counting at the floor.
 */
export interface Sheet {
  accuracy: Record<LadderId, SheetLine>;
  evasion: SheetLine;
  attack: Record<LadderId, SheetLine>;
  defense: SheetLine;
  hp: SheetLine;
  qi: SheetLine;
  shield: SheetLine & { defense: SheetLine };
  armor: (SheetLine & { defense: SheetLine }) | null;
  /** What each guard reads: 0.5 with no art, 1 with a white art of your tier, more past it. */
  guards: Record<GuardId, number>;
  floored: LadderId[];
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
    evasion: line(evasionSize(c, 'body') * agilityFactor(c) * (1 + mod(c, 'evasion'))),
    attack: per(
      (l) =>
        rungSize(c.rungs[l]) *
        (l === 'body' ? c.physicalPower * c.weapon.strike : c.techniquePower),
    ),
    defense: line(defense(c, 'body')),
    hp: { value: c.maxHp, band: bandOf(c.maxHp / HP_PER_SIZE).name },
    qi: { value: c.maxQi, band: bandOf(c.maxQi / QI_PER_SIZE).name },
    shield: {
      value: c.maxShield,
      band: bandOf(c.maxShield / SHIELD_PER_SIZE).name,
      defense: line(shieldDefense(c)),
    },
    armor: c.armor
      ? {
          value: c.armor.max,
          band: bandOf(c.armor.max / ARMOR_PER_SIZE).name,
          defense: line(c.armor.defense),
        }
      : null,
    guards: Object.fromEntries(GUARDS.map((g) => [g, guardFactor(c, g)])) as Record<
      GuardId,
      number
    >,
    floored: (['qi', 'body', 'soul'] as const).filter((l) => floored(c.rungs[l])),
  };
}
