// Generated foes (design § Enemies, beasts and the people you meet): a cultivator is a template
// (pedigree, realm and stage, weapon, path, profile) and a seed, and everything else is rolled from the
// pedigree's table on the `people` stream: the method's rarity on each ladder, which sets the
// growth behind their pool and HP; the arts' rarity and mastery; a weapon and an armor; zero to
// two consumables; a storage item; a breakthrough grade; and intent on the weapon's Dao by the
// pedigree's table, which nothing rolls. Their path (P3.2) says which ladders they cultivate,
// the others standing at the floor, and which path art and guard arts they know. A beast is a
// species, a realm and a
// bloodline rarity that rolls abilities from its element's table. Both come out as the same
// combatant the player is, so an elder and a bandit differ in access, never in rules. `kitFighter`
// builds the fighting-up ledger's kits the same way with every roll pinned.
import {
  ability,
  ABILITY_COUNT,
  AURA_POWER,
  BEAST_DEFENSE,
  BEAST_ELEMENTS,
  BEAST_HP,
  elementAbilities,
  species as speciesOf,
  SPECIES,
  type Ability,
  type BeastElement,
  type Species,
} from '../../content/beasts.ts';
import {
  HP_PER_SIZE,
  LADDER_FLOOR,
  QI_PER_SIZE,
  RESOLVE_BASE,
  reachOf,
  type DamageType,
  type WeaponKind,
} from '../../content/combat.ts';
import type { GradeId, LadderId } from '../../content/cultivation.ts';
import {
  ART_FORM,
  CONSUMABLES,
  GRADE_BY_RARITY,
  MASTERY_PER_REALM,
  NPC_GROWTH,
  BLAST_ART,
  PATH_ART,
  PEDIGREES,
  PROFILES,
  REALM_BASELINE,
  SECOND_ART,
  SWEEP_ART,
  SOUL_ART_POWER,
  STORAGE_BY_REALM,
  type ArtShape,
  type Kit,
  type NpcPath,
  type PedigreeId,
  type ProfileId,
} from '../../content/enemies.ts';
import { baseOf, item, variantId, type Item } from '../../content/items.ts';
import { consumableId } from '../../content/loot.ts';
import { MASTERY_ACCURACY, MAX_MASTERY } from '../../content/mastery.ts';
import { RARITIES, rarityMultiplier, rarityRank, type RarityId } from '../../content/rarity.ts';
import {
  climbsIn,
  REALMS,
  realm as realmOf,
  realmIndex,
  realmScale,
  REALM_IDS,
  tierStep,
  type RealmId,
} from '../../content/realms.ts';
import { BACKER_ONE_IN, HEAVY_ONE_IN, LUCKY_ROGUE_ONE_IN } from '../../content/resolver.ts';
import {
  BORDER_WILDS_NAMES,
  type BeastTemplate,
  type CultivatorTemplate,
} from '../../content/roster.ts';
import { GUARDS, type Technique } from '../../content/techniques.ts';
import { gradesShare } from '../grades.ts';
import { npcIntent } from '../intent.ts';
import { Rng } from '../rng.ts';
import { armor, combatant, guardArt, NO_GUARDS, weapon, type Combatant } from './combatant.ts';
import { damagePhase } from './damage.ts';
import { rungSize, withFloor, type Rung } from './sheet.ts';

// ---------------------------------------------------------------- the shared roll, biased

/** The shared rarity table with each weight multiplied by b to the power of its step from gray. */
export function biasedTable(bias: number): { id: RarityId; p: number }[] {
  const w = RARITIES.map((r, i) => r.roll * bias ** i);
  const total = w.reduce((a, b) => a + b, 0);
  return RARITIES.map((r, i) => ({ id: r.id, p: w[i]! / total }));
}

/** The tables rolled on so far, by bias: a pedigree at a realm always brings the same few. */
const TABLES = new Map<number, readonly { id: RarityId; p: number }[]>();

/**
 * One roll on the shared table at this bias, held at red: the world places its pristine things by
 * hand, so a roll that would land pristine lands red (design § Tier, rarity and pedigree).
 */
export function rollBiased(rng: Rng, bias: number): RarityId {
  let table = TABLES.get(bias);
  if (!table) TABLES.set(bias, (table = biasedTable(bias)));
  const u = rng.next();
  let acc = 0;
  for (const { id, p } of table) {
    acc += p;
    if (u < acc) return id === 'pristine' ? 'red' : id;
  }
  // Only float rounding gets here, past the table's last step.
  return 'red';
}

/** A pedigree's bias at a realm: the pedigree's own, times the realm's baseline. */
export function pedigreeBias(p: PedigreeId, realmId: RealmId): number {
  const ped = PEDIGREES.find((x) => x.id === p)!;
  const i = realmIndex(realmId);
  return ped.bias * (REALM_BASELINE[Math.min(i, REALM_BASELINE.length - 1)] ?? 1);
}

// ---------------------------------------------------------------- growth

/**
 * What a method of this rarity has left on a ladder standing at this rung, as core/growth.ts
 * counts it for the player: each realm's stages climbed with a method of that realm's tier, its
 * band less one over a full realm, weighted by the realm curve so the current realm dominates.
 */
export function methodGrowth(r: RarityId, realmId: RealmId, stage: number): number {
  const top = realmIndex(realmId);
  let sum = 0;
  let weight = 0;
  for (let i = 0; i <= top; i++) {
    const at = REALMS[i]!;
    const of = climbsIn(at.id);
    const climbed = i < top ? of : at.id === 'qi-condensation' ? stage - 1 : stage;
    const total = rarityMultiplier(r, tierStep(i + 1)) - 1;
    sum += total * (climbed / of) * realmScale(at.id);
    weight += realmScale(at.id);
  }
  return sum / weight;
}

// ---------------------------------------------------------------- arts

/** A generated art of a tier and rarity, on a Dao, in a damage type. */
export function art(
  id: string,
  shape: ArtShape,
  o: { tier: number; rarity: RarityId; dao: string; damage: DamageType; ladder?: LadderId },
): Technique {
  return {
    id,
    name: shape.name,
    pinyin: '',
    hanzi: '',
    ladder: o.ladder ?? (o.damage === 'soul' ? 'soul' : 'qi'),
    tier: o.tier,
    rarity: o.rarity,
    line: id,
    chapter: 1,
    daos: [o.dao],
    form: shape.form,
    damage: o.damage,
    power: shape.power,
    qiCost: shape.qiCost,
    ...(shape.reach ? { targets: reachOf(o.tier)[shape.reach] } : {}),
    source: 'generated',
    text: '',
  };
}

/** A beast ability as a technique: on the body ladder (soul for soul damage), its element's Dao. */
function abilityArt(a: Ability, tier: number, r: RarityId): Technique | null {
  if (!a.attack) return null;
  return art(
    a.id,
    { key: a.id, name: a.name, ...a.attack },
    {
      tier,
      rarity: r,
      dao: a.element,
      damage: a.attack.damage,
      ladder: a.attack.damage === 'soul' ? 'soul' : 'body',
    },
  );
}

/** The abilities a bloodline of this rarity rolls: the species' own first, then the element's table. */
export function bloodlineAbilities(
  element: BeastElement,
  r: RarityId,
  first: readonly string[] = [],
): Ability[] {
  const order = [
    ...first.map(ability),
    ...elementAbilities(element).filter((a) => !first.includes(a.id)),
  ];
  return order.slice(0, ABILITY_COUNT[r]);
}

// ---------------------------------------------------------------- the record

export interface Rolls {
  method: Record<LadderId, RarityId>;
  technique: RarityId;
  weapon: RarityId;
  armor: RarityId;
  grade: GradeId;
  /** 0 Glimpse to 4 Origin. */
  mastery: number;
  /** A beast's or a half-blood's bloodline. */
  bloodline?: RarityId;
}

/** A generated foe: what was rolled, what they carry, and the combatant that fights. */
export interface Npc {
  template: string;
  seed: number;
  kind: 'cultivator' | 'beast';
  name: string;
  pedigree?: PedigreeId;
  profile: ProfileId;
  realm: RealmId;
  stage: number;
  rolls: Rolls;
  /** The bloodline abilities they hold, by id. */
  abilities: string[];
  consumables: Item[];
  storage: string | null;
  /** Key items and parts that drop with them. */
  carries: string[];
  /** A lucky rogue's find: the slot rolled at the chosen's bias, at least gold (P3.5 names it). */
  find?: { slot: LuckySlot };
  /** A great-sect young master's backer: the "my father is…" tie (P3.4b). */
  backer?: { id: string; name: string; realm: RealmId; stage: number };
  /**
   * A young master running a heavy method (K11): its qi growth two bands past the rolled method, a
   * month of its upkeep among their stones, and a burning pill for the brink.
   */
  heavy?: boolean;
  combatant: Combatant;
}

export type LuckySlot = 'method' | 'technique' | 'weapon' | 'armor';

/** Luck has its own stream, keyed off the NPC's seed, so it never shifts their other rolls. */
const LUCK_SALT = 0x5bd1e995;

/**
 * Luck, rolled apart from everything else: one rogue in 50 has found something, one slot at the
 * chosen's bias and at least gold; one great-sect young master in 5 has a backer two realms up.
 */
function rollLuck(
  seed: number,
  pedigree: PedigreeId,
  realmId: RealmId,
  id: string,
): { find?: { slot: LuckySlot; rarity: RarityId }; backer?: Npc['backer'] } {
  const luck = new Rng((seed ^ LUCK_SALT) >>> 0);
  if (pedigree === 'rogue' && luck.int(1, LUCKY_ROGUE_ONE_IN) === 1) {
    const slot = pickOne(luck, ['method', 'technique', 'weapon', 'armor'] as const);
    const r = rollBiased(luck, pedigreeBias('chosen', realmId));
    return { find: { slot, rarity: rarityRank(r) >= rarityRank('gold') ? r : 'gold' } };
  }
  if (pedigree === 'great-sect' && luck.int(1, BACKER_ONE_IN) === 1) {
    const i = Math.min(REALM_IDS.length - 1, realmIndex(realmId) + 2);
    return {
      backer: { id: `${id}-backer`, name: `Elder ${name(luck)}`, realm: REALM_IDS[i]!, stage: 1 },
    };
  }
  return {};
}

/** The heavy method's roll has its own stream, keyed off the seed, so it shifts no other roll. */
const HEAVY_SALT = 0x2c1b3c6d;

/**
 * Whether a young master runs a heavy method (K11, design § Professions, people and powers, The
 * world uses them): one great-sect cultivator in HEAVY_ONE_IN, and every sacred land's and chosen
 * one's.
 */
export function runsHeavy(seed: number, pedigree: PedigreeId): boolean {
  if (pedigree === 'sacred-land' || pedigree === 'chosen') return true;
  if (pedigree !== 'great-sect') return false;
  return new Rng((seed ^ HEAVY_SALT) >>> 0).int(1, HEAVY_ONE_IN) === 1;
}

/** A rarity this many bands up, held at red as generated things are. */
function bandsUp(r: RarityId, n: number): RarityId {
  return RARITIES[Math.min(rarityRank('red'), rarityRank(r) + n)]!.id as RarityId;
}

/** The burning pill a young master carries at their tier: the written one, at its tier. */
function burningPill(tier: number): Item {
  const base = tier <= 1 ? 'blood-burning-pill' : 'marrow-burning-pill';
  return item(variantId(base, item(base).rarity, { tier }));
}

/** An untrained ladder: Qi Condensation's first layer, which the floor lifts. */
const UNTRAINED: Rung = { realm: 'qi-condensation', stage: 1, grade: 0 };

/** The ladder a path's arts strike from: its own, or qi for the balanced. */
export function pathLadder(path: NpcPath): LadderId {
  return path === 'balanced' ? 'qi' : path;
}

/**
 * A path's art shape and damage: a body art costs no qi; a soul art strikes the soul, past the
 * qi shield and the armor, at SOUL_ART_POWER of the shape's power.
 */
function pathArt(path: NpcPath, shape: ArtShape, damage: DamageType) {
  const ladder = pathLadder(path);
  const soul = { ...shape, power: Math.round(shape.power * SOUL_ART_POWER) };
  return {
    shape: ladder === 'body' ? { ...shape, qiCost: 0 } : ladder === 'soul' ? soul : shape,
    ladder,
    damage: ladder === 'soul' ? ('soul' as const) : damage,
  };
}

/** A major breakthrough's grade sits on the rung from Foundation up; Qi Condensation has none. */
function rungAt(realmId: RealmId, stage: number, grade: GradeId): Rung {
  return {
    realm: realmId,
    stage,
    grade: realmId === 'qi-condensation' ? 0 : gradesShare([grade]),
  };
}

/** The rung one realm up at the same climb: Qi Condensation layer 1 sits under Foundation early. */
export function rungAhead(realmId: RealmId, stage: number): Rung {
  const next = REALMS[realmIndex(realmId) + 1] ?? realmOf(realmId);
  const from = realmOf(realmId).stages;
  const climb = from > 1 ? (stage - 1) / (from - 1) : 0;
  return { realm: next.id, stage: 1 + Math.round(climb * (next.stages - 1)), grade: 0 };
}

interface Build {
  id: string;
  name: string;
  side: string;
  realm: RealmId;
  stage: number;
  rolls: Rolls;
  weaponKind: WeaponKind;
  element: BeastElement | null;
  bodyAhead?: boolean;
  /** Which ladders they cultivate; beasts are balanced. */
  path: NpcPath;
  techniques: Technique[];
  /** Passives from bloodline abilities. */
  abilities?: Ability[];
  beast?: { scale?: { hp: number; attack: number } };
  resists?: DamageType;
  consumables?: Item[];
  profile?: ProfileId;
  /** Their Intent ladder stage on the weapon's Dao (core/intent.ts, npcIntent). */
  intent?: number;
}

/**
 * The movement art a generated cultivator knows: a band below their other arts from green
 * (C3: movement arts are the rare ones, and tempo and fleeing read them).
 */
export function movementRarity(arts: RarityId): RarityId {
  const rank = rarityRank(arts);
  return rank <= rarityRank('white') ? arts : (RARITIES[rank - 1]!.id as RarityId);
}

/** Puts the rolls together into a combatant on the player's rules. */
function build(b: Build): Combatant {
  const tier = realmIndex(b.realm) + 1;
  const top = rungAt(b.realm, b.stage, b.rolls.grade);
  const trained = (l: LadderId) => b.path === 'balanced' || b.path === l;
  const own = (l: LadderId): Rung =>
    !trained(l) ? UNTRAINED : l === 'body' && b.bodyAhead ? rungAhead(b.realm, b.stage) : top;
  const rungs = withFloor({ qi: own('qi'), body: own('body'), soul: own('soul') }, LADDER_FLOOR);
  const { qi, body } = rungs;
  const growth = (l: LadderId, r: Rung) => methodGrowth(b.rolls.method[l], r.realm, r.stage);
  const gQi = growth('qi', qi);
  const gBody = growth('body', body);
  // A guard art is a technique anyone can learn, so they know one for every path at their arts'
  // rarity, whatever ladders they cultivate; a beast's hide is its guard, and it raises no qi shield.
  // Movement arts are the rare ones, so theirs is a band below (C3, Jan's call: tempo reads it).
  const guards = { ...NO_GUARDS };
  for (const g of GUARDS) {
    if (b.beast) guards[g] = g === 'hardening' ? 1 : 0;
    else {
      const rarity = g === 'movement' ? movementRarity(b.rolls.technique) : b.rolls.technique;
      guards[g] = guardArt({ rarity, tier }, tier);
    }
  }
  const share = (l: LadderId, stat: string) => NPC_GROWTH[l][stat] ?? 0;
  const passives = (b.abilities ?? []).map((a) => a.passive).filter((p) => p !== undefined);
  const product = (f: (p: (typeof passives)[number]) => number | undefined) =>
    passives.reduce((m, p) => m * (f(p) ?? 1), 1);
  const aura =
    b.rolls.bloodline && rarityRank(b.rolls.bloodline) >= rarityRank('purple') ? AURA_POWER : 1;
  const scale = b.beast?.scale ?? { hp: 1, attack: 1 };
  const resist: Partial<Record<DamageType, number>> = {};
  for (const p of passives) {
    if (p.resist) resist[p.resist.type] = (resist[p.resist.type] ?? 0) + p.resist.share;
  }
  const masteryAcc = MASTERY_ACCURACY ** b.rolls.mastery;
  const techniques: Combatant['techniques'] = {};
  for (const t of b.techniques) techniques[t.id] = { technique: t, accuracy: masteryAcc };
  const items: Combatant['items'] = {};
  for (const it of b.consumables ?? []) items[it.id] = { item: it, n: (items[it.id]?.n ?? 0) + 1 };
  const daos: Record<string, number> = { [b.weaponKind]: tier };
  if (b.element) daos[b.element] = tier;
  for (const a of b.abilities ?? []) daos[a.element] = tier;
  return combatant({
    id: b.id,
    name: b.name,
    side: b.side,
    rungs,
    agility: 10 + passives.reduce((s, p) => s + (p.agility ?? 0), 0),
    maxHp: Math.round(
      HP_PER_SIZE *
        rungSize(body) *
        (1 + gBody * share('body', 'hp')) *
        (b.beast ? BEAST_HP : 1) *
        scale.hp *
        product((p) => p.hp),
    ),
    maxQi: Math.round(QI_PER_SIZE * rungSize(qi) * (1 + gQi * share('qi', 'qiPool'))),
    ...(b.beast ? { maxShield: 0 } : {}),
    element: b.element ? damagePhase(b.element) : null,
    resist,
    armor: b.beast ? null : armor(tier, b.rolls.armor, b.resists),
    guards,
    hide: (b.beast ? BEAST_DEFENSE : 1) * product((p) => p.armor),
    weapon: weapon(b.weaponKind, tier, b.rolls.weapon),
    accuracy: product((p) => p.accuracy),
    techniquePower: (1 + gQi * share('qi', 'techniquePower')) * aura * scale.attack,
    physicalPower: (1 + gBody * share('body', 'physicalDamage')) * aura * scale.attack,
    qiRecovery: 1 + gQi * share('qi', 'qiRecovery'),
    techniques,
    daos,
    intent: b.intent ? { [b.weaponKind]: b.intent } : {},
    items,
    profile: b.profile,
    ...(b.beast ? { beast: true } : {}),
    resolve: PROFILES.find((x) => x.id === b.profile)?.resolve ?? RESOLVE_BASE,
  });
}

// ---------------------------------------------------------------- generators

function pickOne<T>(rng: Rng, xs: readonly T[]): T {
  return xs[rng.int(0, xs.length - 1)]!;
}

function name(rng: Rng): string {
  return `${pickOne(rng, BORDER_WILDS_NAMES.surnames)} ${pickOne(rng, BORDER_WILDS_NAMES.given)}`;
}

/**
 * A consumable of a shape, tier and rarity, as the written pill or talisman it is (P3.5,
 * content/loot.ts) drawn at the NPC's tier, its rarity held inside the item's range.
 */
function consumable(key: string, tier: number, r: RarityId): Item {
  const id = consumableId(key, r);
  return item(variantId(baseOf(id), item(id).rarity, { tier }));
}

export interface GenerateOptions {
  id?: string;
  side?: string;
  /** Without consumables, as the fighting-up ledger measures. */
  noConsumables?: boolean;
}

/**
 * A cultivator from a template at a realm and stage, rolled on the stream given (the `people`
 * stream in play). A chosen one has one of the method, art, weapon and armor guaranteed gold or
 * better.
 */
export function generateCultivator(
  t: CultivatorTemplate,
  realmId: RealmId,
  stage: number,
  rng: Rng,
  opts: GenerateOptions = {},
): Npc {
  const seed = rng.state;
  const ped = PEDIGREES.find((p) => p.id === t.pedigree)!;
  const bias = pedigreeBias(t.pedigree, realmId);
  const roll = () => rollBiased(rng, bias);
  const rolls: Rolls = {
    method: { qi: roll(), body: roll(), soul: roll() },
    technique: roll(),
    weapon: roll(),
    armor: roll(),
    grade: 'ordinary',
    mastery: Math.min(MAX_MASTERY, ped.mastery + MASTERY_PER_REALM * realmIndex(realmId)),
  };
  if (ped.guaranteedGold) {
    const slot = pickOne(rng, ['method', 'technique', 'weapon', 'armor'] as const);
    const atLeastGold = (r: RarityId): RarityId =>
      rarityRank(r) >= rarityRank('gold') ? r : 'gold';
    if (slot === 'method') rolls.method.qi = atLeastGold(rolls.method.qi);
    else rolls[slot] = atLeastGold(rolls[slot]);
  }
  const id = opts.id ?? `${t.id}-${seed >>> 0}`;
  const luck = rollLuck(seed, t.pedigree, realmId, id);
  const heavy = runsHeavy(seed, t.pedigree);
  if (luck.find) {
    const { slot, rarity } = luck.find;
    if (slot === 'method') rolls.method.qi = rarity;
    else rolls[slot] = rarity;
  }
  const gradeRoll = GRADE_BY_RARITY[roll()];
  const heavenlyOk = rarityRank(rolls.method.qi) >= rarityRank('gold');
  rolls.grade = gradeRoll === 'heavenly' && !heavenlyOk ? 'perfect' : gradeRoll;

  const tier = realmIndex(realmId) + 1;
  const path = t.path ?? ped.path;
  const main = pathArt(path, { ...PATH_ART, form: ART_FORM[t.weapon] }, t.element ?? 'physical');
  const techniques = [
    art(`${t.id}-path`, main.shape, {
      tier,
      rarity: rolls.technique,
      dao: t.weapon,
      damage: main.damage,
      ladder: main.ladder,
    }),
  ];
  if (t.pedigree !== 'rogue') {
    const second = pathArt(path, SECOND_ART, t.element ?? 'physical');
    techniques.push(
      art(`${t.id}-second`, second.shape, {
        tier,
        rarity: rolls.technique,
        dao: t.element ?? t.weapon,
        damage: second.damage,
        ladder: second.ladder,
      }),
    );
  }
  // Arts that strike many: the common count from Qi Condensation, a blast from small sect up or
  // from Foundation.
  const sweeps = [SWEEP_ART, ...(t.pedigree !== 'rogue' || tier >= 2 ? [BLAST_ART] : [])];
  for (const shape of sweeps) {
    const s = pathArt(path, shape, t.element ?? 'physical');
    techniques.push(
      art(`${t.id}-${shape.key}`, s.shape, {
        tier,
        rarity: rolls.technique,
        dao: t.element ?? t.weapon,
        damage: s.damage,
        ladder: s.ladder,
      }),
    );
  }

  let abilities: Ability[] = [];
  let element: BeastElement | null = t.element;
  if (t.bloodline) {
    const blood = t.bloodline === 'rolled' ? pickOne(rng, BEAST_ELEMENTS) : t.bloodline;
    rolls.bloodline = roll();
    abilities = bloodlineAbilities(blood, rolls.bloodline);
    element ??= blood;
    for (const a of abilities) {
      const tech = abilityArt(a, tier, rolls.bloodline);
      if (tech) techniques.push(tech);
    }
  }

  const consumables: Item[] = [];
  if (!opts.noConsumables) {
    const n = rng.int(0, 2);
    for (let i = 0; i < n; i++) {
      consumables.push(consumable(pickOne(rng, CONSUMABLES).key, tier, roll()));
    }
    if (heavy) consumables.push(burningPill(tier));
  }
  const who = name(rng);
  return {
    template: t.id,
    seed,
    kind: 'cultivator',
    name: who,
    pedigree: t.pedigree,
    profile: t.profile,
    realm: realmId,
    stage,
    rolls,
    abilities: abilities.map((a) => a.id),
    consumables,
    storage: STORAGE_BY_REALM[Math.min(realmIndex(realmId), STORAGE_BY_REALM.length - 1)]!,
    carries: [...(t.carries ?? [])],
    ...(luck.find ? { find: { slot: luck.find.slot } } : {}),
    ...(luck.backer ? { backer: luck.backer } : {}),
    ...(heavy ? { heavy: true } : {}),
    combatant: build({
      id,
      name: who,
      side: opts.side ?? id,
      realm: realmId,
      stage,
      // A heavy method fed climbs two bands rarer, and its growth with it.
      rolls: heavy
        ? { ...rolls, method: { ...rolls.method, qi: bandsUp(rolls.method.qi, 2) } }
        : rolls,
      weaponKind: t.weapon,
      element,
      path,
      techniques,
      abilities,
      resists: t.resists,
      consumables,
      profile: t.profile,
      intent: npcIntent(t.pedigree, realmId),
    }),
  };
}

/**
 * A beast from a template at a realm and stage: its species (rolled among the lone ones when the
 * template names none), its element (rolled when the species has none), its bloodline on the
 * shared table at the species' bias, and the abilities that bloodline rolls. A pack template
 * makes one member; `generatePack` makes the pack.
 */
export function generateBeast(
  t: BeastTemplate,
  realmId: RealmId,
  stage: number,
  rng: Rng,
  opts: GenerateOptions = {},
): Npc {
  const seed = rng.state;
  const sp: Species = t.species
    ? speciesOf(t.species)
    : pickOne(
        rng,
        SPECIES.filter((s) => s.pack[1] === 1),
      );
  const element: BeastElement = sp.element ?? pickOne(rng, BEAST_ELEMENTS);
  const blood = rollBiased(rng, (sp.bloodline ?? 1) * pedigreeBias('small-sect', realmId));
  const abilities = bloodlineAbilities(element, blood, sp.first);
  const tier = realmIndex(realmId) + 1;
  const techniques: Technique[] = sp.natural.map((n, i) =>
    art(
      `${sp.id}-natural-${i}`,
      { key: n.name, name: n.name, form: n.form, power: n.power, qiCost: 0 },
      {
        tier,
        rarity: blood,
        dao: 'fist',
        damage: n.damage ?? 'physical',
        ladder: n.damage === 'soul' ? 'soul' : 'body',
      },
    ),
  );
  for (const a of abilities) {
    const tech = abilityArt(a, tier, blood);
    if (tech) techniques.push(tech);
  }
  const rolls: Rolls = {
    method: { qi: blood, body: blood, soul: blood },
    technique: blood,
    weapon: blood,
    armor: 'white',
    grade: 'ordinary',
    mastery: Math.min(MAX_MASTERY, 1 + MASTERY_PER_REALM * realmIndex(realmId)),
    bloodline: blood,
  };
  const id = opts.id ?? `${t.id}-${seed >>> 0}`;
  return {
    template: t.id,
    seed,
    kind: 'beast',
    name: sp.name,
    profile: sp.profile,
    realm: realmId,
    stage,
    rolls,
    abilities: abilities.map((a) => a.id),
    consumables: [],
    storage: null,
    carries: [...sp.parts, ...(tier >= 2 || rng.chance(0.5) ? ['beast core'] : [])],
    combatant: build({
      id,
      name: sp.name,
      side: opts.side ?? id,
      realm: realmId,
      stage,
      rolls,
      // Claws and fangs are a beast's weapon: its bloodline's band on natural attacks.
      weaponKind: 'fist',
      element,
      path: 'balanced',
      techniques,
      abilities,
      beast: { scale: sp.scale },
      profile: sp.profile,
    }),
  };
}

/** A pack: its size rolled from the species' range, every member on one side. */
export function generatePack(
  t: BeastTemplate,
  realmId: RealmId,
  stage: number,
  rng: Rng,
  side: string,
): Npc[] {
  const sp = t.species ? speciesOf(t.species) : null;
  const n = sp ? rng.int(sp.pack[0], sp.pack[1]) : 1;
  const out: Npc[] = [];
  for (let i = 0; i < n; i++) {
    out.push(generateBeast(t, realmId, stage, rng, { id: `${t.id}-${i + 1}`, side }));
  }
  return out;
}

// ---------------------------------------------------------------- kits

/**
 * One of the fighting-up ledger's kits at a realm and stage, every roll pinned: a path art on the
 * sword's Dao, physical, so the cycle and statuses stay out of the measure.
 */
export function kitFighter(
  kit: Kit,
  realmId: RealmId,
  stage: number,
  o: { id: string; side: string; profile?: ProfileId },
): Combatant {
  const tier = realmIndex(realmId) + 1;
  const path = kit.path ?? 'balanced';
  const main = pathArt(path, { ...PATH_ART, form: 'thrust' }, 'physical');
  const blast = pathArt(path, BLAST_ART, 'physical');
  const rolls: Rolls = {
    method: { qi: kit.method, body: kit.method, soul: kit.method },
    technique: kit.technique,
    weapon: kit.weapon,
    armor: kit.armor,
    grade: kit.grade,
    mastery: kit.mastery,
  };
  return build({
    id: o.id,
    name: kit.name,
    side: o.side,
    realm: realmId,
    stage,
    rolls,
    weaponKind: 'sword',
    element: null,
    bodyAhead: kit.bodyAhead,
    path,
    // The path art, and its blast for the crowds (C2): one foe alone takes the cheaper art.
    techniques: [
      art(`${kit.id}-art`, main.shape, {
        tier,
        rarity: kit.technique,
        dao: 'sword',
        damage: main.damage,
        ladder: main.ladder,
      }),
      art(`${kit.id}-blast`, blast.shape, {
        tier,
        rarity: kit.technique,
        dao: 'sword',
        damage: blast.damage,
        ladder: blast.ladder,
      }),
    ],
    profile: o.profile ?? 'fanatical',
    intent: npcIntent(kit.pedigree, realmId),
  });
}
