// The crafts' engine (design § Professions, people and powers: Crafts, thin; Recipes; A batch;
// K1). One engine for every craft: a recipe is data (content/crafts.ts), the bench is a queue
// worked from the front on Craft hours 艺, and a batch rolls whether it holds by the family's
// mastery and the tier, then lifts its rarity in bands from the recipe's floor with only the
// fraction rolled. The furnace is an item in the Bag; a blow-up cracks it until a refiner mends it.
// Rolls come from the `craft` stream (core/rng.ts), so a seed replays the same batches. The craft
// Dao trees (K2) teach recipes by their seals and move a batch's numbers by their perks: holding,
// lift, yield, speed and blow-ups by the craft's own stats, +5% yield a tier held, and Twin Furnace.
// The steady hand (K3) is played at the bench: each batch reads the mean hand over its hours, times
// Steady hands' reach and Hand's lift, and the land lends its hand (earth fire, a matching element,
// a written site). Refining (K4) runs the same bench at a forge, and mends gear there too: a bench
// entry that mends a piece takes a craft hour a tier and a piece of what it was made of.
// Experimenting (K7, core/experiment.ts) runs on the same bench: an entry that throws things in
// loads them as a batch does, and on its last hour finds a recipe or spends them for nothing.
import type { Recipe } from '../content/catalogs/types.ts';
import {
  BLOW_UP,
  CRAFTS,
  CRAFT_IDS,
  CRAFT_MASTERY,
  CRAFT_SITES,
  EARTH_FIRE_CRAFTS,
  EARTH_FIRE_TERRAIN,
  FAMILIES,
  HAND,
  HOLDS,
  LAND,
  LAND_ELEMENT,
  LIFT,
  MATCHED_SOUL,
  MEND,
  MAX_HOLD,
  RECENT_BATCHES,
  TIER_ODDS,
  YIELD_BY_MASTERY,
  hasRecipe,
  recipe,
  recipeElement,
  recipeFor,
  recipeHours,
  recipeTier,
  recipeYield,
  type CraftId,
  type FamilyId,
} from '../content/crafts.ts';
import { baseOf, hasItem, item, rarityRange, variantId, type Item } from '../content/items.ts';
import { MANUALS } from '../content/manuals.ts';
import { MAX_MASTERY } from '../content/mastery.ts';
import { CRAFT_RENOWN } from '../content/styles.ts';
import { RARITY_IDS, rarityRank, type RarityId } from '../content/rarity.ts';
import { realmIndex } from '../content/realms.ts';
import { craftStat, type CraftStatKind, type StatId } from '../content/stats.ts';
import { CRAFT_DAOS, tierNodes, type Tree } from '../content/trees/index.ts';
import { stow, wornIds } from './gear.ts';
import type { Rng } from './rng.ts';
import { addItem, type Cultivator, type CraftsState } from './state.ts';
import { stats } from './stats.ts';
import {
  experimentHours,
  experimentWaits,
  finishExperiment,
  keepFound,
  loadExperiment,
} from './experiment.ts';
import { tierHeld } from './trees.ts';

// ---------------------------------------------------------------- what you know and reach

/** The recipe each node teaches: a slip's one node, or a craft Dao's seal. */
const TEACHES = new Map(
  [...MANUALS.flatMap((m) => m.nodes), ...CRAFT_DAOS.flatMap((t) => t.nodes)]
    .filter((n) => n.recipe)
    .map((n) => [n.id, n.recipe!] as const),
);

/**
 * The recipes a cultivator knows, in the order their nodes were learned, then those found by
 * experiment (K7) in the order found.
 */
export function knownRecipes(c: Cultivator): Recipe[] {
  keepFound(c);
  const ids = c.nodes.map((n) => TEACHES.get(n)).filter((r): r is string => !!r);
  return [...new Set([...ids, ...(c.crafts?.found ?? [])])].filter(hasRecipe).map(recipe);
}

/** The craft Dao seal that teaches a recipe, if one does (K7: a find lights it in its place). */
export function sealFor(id: string): string | null {
  const n = CRAFT_DAOS.flatMap((t) => t.nodes).find((x) => x.recipe === id);
  return n?.id ?? null;
}

export function knowsRecipe(c: Cultivator, id: string): boolean {
  return knownRecipes(c).some((r) => r.output === id);
}

/** A rung, comparable across realms: the realm's index, then the stage. */
const rung = (l: { realm: Parameters<typeof realmIndex>[0]; stage: number }) =>
  realmIndex(l.realm) * 100 + l.stage;

export interface CraftReach {
  /** The tier your realm crafts at: your qi's or your body's, the higher. */
  tier: number;
  /** The highest tier you can craft: the better of that and your soul's (the soul gate). */
  reach: number;
  /** A soul at your realm's rung or above: ×1.25 the odds and half the blow-ups. */
  matched: boolean;
}

/**
 * The soul gate (A batch): the better of your soul level and your realm, so a pure qi cultivator
 * crafts at their realm's tier and a soul a realm ahead crafts a tier ahead. A soul keeping pace
 * with your highest other ladder is matched (K1's small call: matched reads the rung).
 */
export function craftReach(c: Cultivator): CraftReach {
  const top = rung(c.qi) >= rung(c.body) ? c.qi : c.body;
  const tier = realmIndex(top.realm) + 1;
  const soul = realmIndex(c.soul.realm) + 1;
  return { tier, reach: Math.max(tier, soul), matched: rung(c.soul) >= rung(top) };
}

/** Whether the crafts are open to you: a tool held or a recipe known (Where crafts live). */
export function craftsOpen(c: Cultivator): boolean {
  return knownRecipes(c).length > 0 || CRAFT_IDS.some((k) => toolsHeld(c, k).length > 0);
}

// ---------------------------------------------------------------- the craft Dao

/** A craft's Dao tree. */
export function craftDao(craft: CraftId): Tree {
  return CRAFT_DAOS.find((t) => t.craft === craft)!;
}

/** The craft Dao's tiers held, from tier 1 up while each is held at half its nodes. */
export function craftTiersHeld(c: Cultivator, craft: CraftId): number {
  const t = craftDao(craft);
  let n = 0;
  while (tierNodes(t, n + 1).length > 0 && tierHeld(c, t, n + 1)) n++;
  return n;
}

/** Yield a craft Dao tier held adds (A batch, the Dao bonus). */
export const DAO_YIELD = 0.05;

/**
 * The element Daos' craft side paths (design § The combat Daos): Fire control adds to alchemy's
 * lift one for one, and Metal's forge sense to refining's.
 */
const ELEMENT_LIFT: Partial<Record<CraftId, StatId>> = {
  alchemy: 'fireControl',
  refining: 'forgeSense',
};

/** A craft's own stat from the trees, talents and gear: `own(c, 'alchemy', 'Hold')`. */
export function own(c: Cultivator, craft: CraftId, kind: CraftStatKind): number {
  return stats(c)[craftStat(craft, kind)];
}

// ---------------------------------------------------------------- mastery

/** Batches counted toward a family's mastery. */
export function familyBatches(c: Cultivator, family: FamilyId): number {
  return c.crafts.mastery[family] ?? 0;
}

/** A family's mastery level, 0 Glimpse to 4 Origin, by its batches. */
export function familyLevel(c: Cultivator, family: FamilyId): number {
  const b = familyBatches(c, family);
  let level = 0;
  CRAFT_MASTERY.batches.forEach((need, i) => {
    if (b >= need) level = i;
  });
  return level;
}

/** Batches to the family's next level, or null at Origin. */
export function nextLevelAt(c: Cultivator, family: FamilyId): number | null {
  const level = familyLevel(c, family);
  return level >= MAX_MASTERY ? null : CRAFT_MASTERY.batches[level + 1]!;
}

// ---------------------------------------------------------------- tools

/** Whether an item is a tool for a craft. */
export function isTool(it: Item, craft?: CraftId): boolean {
  return !!it.uses.tool && (!craft || it.uses.tool.craft === craft);
}

/** The tools of a craft you carry, whole or cracked. */
export function toolsHeld(c: Cultivator, craft: CraftId): Item[] {
  return Object.keys(c.items)
    .filter((id) => (c.items[id] ?? 0) > 0 && hasItem(id) && isTool(item(id), craft))
    .map(item);
}

/** The best whole tool of a craft whose tier reaches this one. */
export function toolAt(c: Cultivator, craft: CraftId, tier: number): Item | null {
  const fit = toolsHeld(c, craft).filter((t) => !t.cracked && t.tier >= tier);
  fit.sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity) || b.tier - a.tier);
  return fit[0] ?? null;
}

/** The tool a batch is worked with: the best whole one whose tier reaches the recipe's. */
export function toolFor(c: Cultivator, r: Recipe): Item | null {
  return toolAt(c, r.craft, recipeTier(r));
}

/** What a refiner asks to mend a cracked tool: a tenth of its worth. */
export const CRACK_MEND_SHARE = BLOW_UP.mend;

// ---------------------------------------------------------------- mending (K4)

/** Whether a piece you carry or wear needs mending: a cracked tool, a damaged piece, worn armor. */
export function needsMend(c: Cultivator, thing: string): boolean {
  if (!hasItem(thing)) return false;
  if ((c.items[thing] ?? 0) <= 0 && !wornIds(c).includes(thing)) return false;
  const it = item(thing);
  return !!it.cracked || !!it.damaged || (c.wear[thing] ?? 0) > 0;
}

/** The pieces you carry or wear that need mending. */
export function toMend(c: Cultivator): string[] {
  return [...new Set([...wornIds(c), ...Object.keys(c.items)])].filter((id) => needsMend(c, id));
}

/** The id a piece mends to: whole, its rarity back, or itself once its wear is gone. */
export function mendedId(thing: string): string {
  const it = item(thing);
  if (it.cracked) return variantId(baseOf(thing), it.rarity);
  if (it.damaged) return variantId(thing.split('~')[0]!, RARITY_IDS[rarityRank(it.rarity) + 1]!);
  return thing;
}

/**
 * The piece mended, wherever it is (Bag or worn): the refiner's shop and your own forge alike
 * (design § Production, commissions and the craft deck: mending is refining).
 */
export function mended(c: Cultivator, thing: string): Cultivator {
  const it = item(thing);
  const whole = mendedId(thing);
  if (it.cracked || it.damaged) {
    const worn = Object.entries(c.gear).find(([, v]) => v === thing)?.[0];
    if (worn && worn !== 'treasures') return { ...c, gear: { ...c.gear, [worn]: whole } };
    return addItem(addItem(c, thing, -1), whole, 1);
  }
  const wear = { ...c.wear };
  delete wear[thing];
  return { ...c, wear };
}

/** What mending a piece takes at the forge: a craft hour a tier, and a piece of what it was made of. */
export function mendNeeds(thing: string): { hours: number; tier: number; input: string } {
  const it = item(thing);
  const r = recipeFor(thing);
  return { hours: MEND.hours * it.tier, tier: it.tier, input: r?.inputs[0]?.thing ?? MEND.ore };
}

/** Why a piece can't go on the bench to be mended, or null when it can. */
export function cantMend(c: Cultivator, thing: string): string | null {
  if (!toMend(c).includes(thing)) return 'It needs no mending.';
  const tier = item(thing).tier;
  if (!toolAt(c, 'refining', tier))
    return `You carry no whole forge that holds a tier ${tier} fire.`;
  return null;
}

/** Queues a piece to be mended at the bench's end. */
export function queueMend(
  c: Cultivator,
  thing: string,
): { cultivator: Cultivator; reason: string | null } {
  const why = cantMend(c, thing);
  if (why) return { cultivator: c, reason: why };
  if (c.crafts.bench.some((e) => e.mend === thing))
    return { cultivator: c, reason: 'It is on the bench already.' };
  const bench = [...c.crafts.bench, { recipe: baseOf(thing), batches: 1, mend: thing }];
  return { cultivator: withCrafts(c, { bench }), reason: null };
}

// ---------------------------------------------------------------- a batch's numbers

/** Why a recipe can't go on the bench, or null when it can. */
export function cantBrew(c: Cultivator, id: string): string | null {
  if (!hasRecipe(id)) return 'There is no such recipe.';
  if (!knowsRecipe(c, id)) return 'You don’t know that recipe.';
  const r = recipe(id);
  if (recipeTier(r) > craftReach(c).reach)
    return `Your soul doesn’t reach tier ${recipeTier(r)}: the gate is your realm or your soul, the better.`;
  return null;
}

// ---------------------------------------------------------------- the steady hand and the land

/**
 * Steady hands' reach for a craft (K3): one band, the craft's Hand nodes, `craftPrecision` one for
 * one and a matched soul, never past two.
 */
export function handReach(c: Cultivator, craft: CraftId): number {
  const reach =
    HAND.base +
    own(c, craft, 'Reach') +
    stats(c).craftPrecision +
    (craftReach(c).matched ? HAND.matched : 0);
  return Math.min(HAND.most, Math.max(0, reach));
}

/**
 * The lift a hand adds (K3's talk): the hand times the reach and what Hand's nodes and the element
 * Daos' side paths add, so a queued batch, at no hand, gets none of them.
 */
export function handLift(c: Cultivator, craft: CraftId, hand: number): number {
  const element = ELEMENT_LIFT[craft];
  const known = own(c, craft, 'Lift') + (element ? stats(c)[element] : 0);
  return Math.max(0, Math.min(1, hand)) * (handReach(c, craft) + known);
}

/** What the land lends a recipe where you work (design § A batch, Places lend a hand). */
export interface LandHand {
  lift: number;
  hold: number;
  /** Why, for the page: earth fire, the land's element, a written site. */
  why: string[];
}

export const NO_LAND: LandHand = { lift: 0, hold: 0, why: [] };

/** Where the bench stands: the terrain under you and the atlas place you are at, if any. */
export interface BenchSpot {
  terrain: string;
  place: string | null;
}

/**
 * The land's hand for a recipe: earth fire on volcanic land for alchemy and refining, a land of
 * the recipe's element, each +0.25 lift and +10 holding (once, not twice, on volcanic land for a
 * fire pill), and a written site's lift beside them.
 */
export function landHand(r: Recipe, spot: BenchSpot | null): LandHand {
  if (!spot) return NO_LAND;
  const why: string[] = [];
  const earthFire = spot.terrain === EARTH_FIRE_TERRAIN && EARTH_FIRE_CRAFTS.includes(r.craft);
  if (earthFire) why.push('earth fire 地火');
  const element = recipeElement(r);
  const matched = !!element && LAND_ELEMENT[spot.terrain] === element;
  if (matched && !earthFire) why.push(`a land of ${element}`);
  let lift = earthFire || matched ? LAND.lift : 0;
  const hold = earthFire || matched ? LAND.hold : 0;
  const site = spot.place ? CRAFT_SITES[spot.place] : undefined;
  if (site && site.crafts.includes(r.craft)) {
    lift += Math.min(LAND.siteMost, site.lift);
    why.push(site.name);
  }
  return { lift, hold, why };
}

/** Whether a batch holds (A batch): the family's mastery, the tier against yours, a matched soul. */
export function holdOdds(c: Cultivator, r: Recipe, land: LandHand = NO_LAND): number {
  const { tier, matched } = craftReach(c);
  const gap = tier - recipeTier(r);
  const adj =
    gap >= 2 ? TIER_ODDS.farBelow : gap === 1 ? TIER_ODDS.below : gap < 0 ? TIER_ODDS.above : 0;
  const base = HOLDS[familyLevel(c, r.family)]! + adj;
  const odds = base * (matched ? MATCHED_SOUL : 1) + own(c, r.craft, 'Hold') + land.hold;
  return Math.max(0, Math.min(MAX_HOLD, odds));
}

/** A failed batch's share that blows up and cracks the tool, fewer by the craft's safety. */
export function blowUpShare(c: Cultivator, craft: CraftId): number {
  const share = craftReach(c).matched ? BLOW_UP.matched : BLOW_UP.share;
  return share * Math.max(0, 1 - own(c, craft, 'Safety'));
}

/**
 * The lift a batch carries, in bands from the recipe's floor (A batch, Rarity is lift): mastery,
 * the inputs, the tool, the steady hand it was played at and the land.
 */
export function liftOf(
  c: Cultivator,
  r: Recipe,
  above: boolean,
  tool: Item | null,
  hand = 0,
  land: LandHand = NO_LAND,
): number {
  const mastery = LIFT.mastery[familyLevel(c, r.family)]!;
  const inputs = above ? LIFT.inputs : 0;
  const toolBands = tool ? Math.max(0, rarityRank(tool.rarity) - rarityRank('white')) : 0;
  return mastery + inputs + toolBands * LIFT.toolBand + handLift(c, r.craft, hand) + land.lift;
}

/**
 * The pieces a batch that holds makes: the recipe's yield, +10% a mastery level, +5% a craft Dao
 * tier held and the craft's own yield.
 */
export function yieldOf(c: Cultivator, r: Recipe): number {
  const share =
    YIELD_BY_MASTERY[familyLevel(c, r.family)]! +
    DAO_YIELD * craftTiersHeld(c, r.craft) +
    own(c, r.craft, 'Yield');
  return Math.round(recipeYield(r) * (1 + share));
}

/** The fewest hours speed can bring a batch to, as a share of its own. */
export const FASTEST = 0.5;

/** Craft hours a batch takes for you: the recipe's, less the craft's speed. */
export function batchHours(c: Cultivator, r: Recipe): number {
  return recipeHours(r) * Math.max(FASTEST, 1 + own(c, r.craft, 'Speed'));
}

/** Batches brewed at once: one, and one more a Twin Furnace, for alchemy (K2). */
export function atOnce(c: Cultivator, r: Recipe): number {
  return 1 + (r.craft === 'alchemy' ? Math.floor(stats(c).twinFurnace) : 0);
}

/**
 * The rarities a lift lands on: its whole bands for sure, the fraction rolled for one more, never
 * past the recipe's `upTo` (the output's range), with the chance of each.
 */
export function liftOdds(r: Recipe, lift: number): { rarity: RarityId; chance: number }[] {
  const range = rarityRange(item(r.output));
  const whole = Math.floor(lift);
  const frac = lift - whole;
  const at = (bands: number) => range[Math.min(range.length - 1, bands)]!;
  const out = new Map<RarityId, number>();
  out.set(at(whole), (out.get(at(whole)) ?? 0) + 1 - frac);
  if (frac > 0) out.set(at(whole + 1), (out.get(at(whole + 1)) ?? 0) + frac);
  return [...out].map(([rarity, chance]) => ({ rarity, chance }));
}

// ---------------------------------------------------------------- inputs

/** The pieces of an input you hold at a tier, by id, worst rarity first. */
export function heldOf(
  c: Cultivator,
  thing: string,
  tier: number,
): { id: string; n: number; rank: number }[] {
  return Object.entries(c.items)
    .filter(([id, n]) => n > 0 && baseOf(id) === thing && hasItem(id))
    .map(([id, n]) => ({ id, n, it: item(id) }))
    .filter((x) => x.it.tier === tier && !x.it.damaged)
    .map((x) => ({ id: x.id, n: x.n, rank: rarityRank(x.it.rarity) }))
    .sort((a, b) => a.rank - b.rank);
}

export interface InputPlan {
  /** What a batch takes from the Bag, by id. */
  take: Record<string, number>;
  /** Every input stands a rarity above the recipe's floor. */
  above: boolean;
  /** What is missing, by input, when the Bag can't fill a batch. */
  short: { thing: string; need: number }[];
}

/**
 * What a batch takes (K1's small call): the inputs above the recipe's floor when every one of them
 * can be filled so, for the lift; otherwise the worst first, so the good herbs wait.
 */
export function planInputs(c: Cultivator, r: Recipe): InputPlan {
  const tier = recipeTier(r);
  const floor = rarityRank(item(r.output).rarity);
  const held = r.inputs.map((i) => ({ i, have: heldOf(c, i.thing, tier) }));
  const short = held
    .map(({ i, have }) => ({ thing: i.thing, need: i.count - have.reduce((t, h) => t + h.n, 0) }))
    .filter((x) => x.need > 0);
  const aboveOk = held.every(
    ({ i, have }) => have.filter((h) => h.rank > floor).reduce((t, h) => t + h.n, 0) >= i.count,
  );
  const take: Record<string, number> = {};
  for (const { i, have } of held) {
    const pool = aboveOk ? have.filter((h) => h.rank > floor).reverse() : have;
    let left = i.count;
    for (const h of pool) {
      if (left <= 0) break;
      const n = Math.min(left, h.n);
      take[h.id] = (take[h.id] ?? 0) + n;
      left -= n;
    }
  }
  return { take, above: aboveOk, short };
}

/** How many batches the Bag's inputs fill for a recipe, at the worst-first plan. */
export function batchesHeld(c: Cultivator, r: Recipe): number {
  const tier = recipeTier(r);
  return Math.min(
    ...r.inputs.map((i) =>
      Math.floor(heldOf(c, i.thing, tier).reduce((t, h) => t + h.n, 0) / i.count),
    ),
  );
}

// ---------------------------------------------------------------- the bench

export const withCrafts = (c: Cultivator, crafts: Partial<CraftsState>): Cultivator => ({
  ...c,
  crafts: { ...c.crafts, ...crafts },
});

/** Queues batches of a recipe at the bench's end, onto its last entry when that is the same. */
export function queueBatches(
  c: Cultivator,
  id: string,
  batches = 1,
): { cultivator: Cultivator; reason: string | null } {
  const why = cantBrew(c, id);
  if (why) return { cultivator: c, reason: why };
  const bench = [...c.crafts.bench];
  const last = bench[bench.length - 1];
  if (last?.recipe === id && !last.mend)
    bench[bench.length - 1] = { ...last, batches: last.batches + batches };
  else bench.push({ recipe: id, batches });
  return { cultivator: withCrafts(c, { bench }), reason: null };
}

/**
 * Takes an entry off the bench. The front batch's inputs are already in the tool, so taking the
 * front entry leaves its batch to finish.
 */
export function unqueue(c: Cultivator, at: number): Cultivator {
  const bench = c.crafts.bench.filter((_, i) => i !== at);
  return withCrafts(c, { bench });
}

/** Moves an entry one place up or down the bench; the batch already in the tool stays first. */
export function moveOnBench(c: Cultivator, at: number, by: -1 | 1): Cultivator {
  const to = at + by;
  const bench = [...c.crafts.bench];
  if (to < 0 || to >= bench.length) return c;
  if (c.crafts.front && (at === 0 || to === 0)) return c;
  [bench[at], bench[to]] = [bench[to]!, bench[at]!];
  return withCrafts(c, { bench });
}

/** Puts what waits in the tray into the Bag as far as it holds it. */
export function takeTray(c: Cultivator): Cultivator {
  let next = c;
  const tray: Record<string, number> = {};
  for (const [id, n] of Object.entries(c.crafts.tray)) {
    const r = stow(next, id, n);
    next = r.c;
    if (r.left > 0) tray[id] = r.left;
  }
  return withCrafts(next, { tray });
}

/** Something the bench did worth a line in the chronicle. */
export type BenchEvent =
  | { type: 'craft-level'; data: { family: string; level: number } }
  | { type: 'blow-up'; data: { recipe: string; tool: string } }
  /** A gold piece or better made (K6): craft renown where it was made. */
  | { type: 'made-rare'; data: { made: string; craft: CraftId } }
  /** A recipe found by experiment (K7); `made` when the furnace made its own. */
  | { type: 'recipe-found'; data: { recipe: string; craft: CraftId; made: boolean } };

export interface BenchResult {
  cultivator: Cultivator;
  events: BenchEvent[];
  /** Batches finished this stretch: held and failed alike. */
  batches: number;
}

/**
 * Loads the front batch: the tool must be whole and the Bag must fill it. A Twin Furnace loads a
 * second batch of the same entry beside it when the entry and the Bag hold one, each from its own
 * inputs; the inputs' lift counts only when every batch has them above the floor.
 */
function load(c: Cultivator): Cultivator | null {
  const entry = c.crafts.bench[0];
  if (!entry) return null;
  if (entry.mend) return loadMend(c, entry.mend);
  if (entry.experiment) return loadExperiment(c, entry);
  const r = recipe(entry.recipe);
  if (cantBrew(c, r.output) || !toolFor(c, r)) return null;
  let next = c;
  let batches = 0;
  let above = true;
  while (batches < Math.min(entry.batches, atOnce(c, r))) {
    const plan = planInputs(next, r);
    if (plan.short.length > 0) break;
    for (const [id, n] of Object.entries(plan.take)) next = addItem(next, id, -n);
    above &&= plan.above;
    batches++;
  }
  if (batches === 0) return null;
  return withCrafts(next, { front: { recipe: r.output, above, hours: 0, batches } });
}

/** Loads a mend: the piece still needing it, a whole forge, and a piece of what it was made of. */
function loadMend(c: Cultivator, thing: string): Cultivator | null {
  if (cantMend(c, thing)) return null;
  const need = mendNeeds(thing);
  const have = heldOf(c, need.input, need.tier)[0];
  if (!have) return null;
  const front = { recipe: baseOf(thing), above: false, hours: 0, mend: thing };
  return withCrafts(addItem(c, have.id, -1), { front });
}

/** Mastery from one batch: 1 at your tier, a quarter below it, half that when it failed. */
function masteryFrom(c: Cultivator, r: Recipe, held: boolean): number {
  const at = recipeTier(r) >= craftReach(c).tier ? 1 : CRAFT_MASTERY.below;
  return at * (held ? 1 : CRAFT_MASTERY.failed);
}

/** Where a stretch of the bench is worked: the hand you sit with, and the spot it stands on. */
export interface BenchAt {
  /** The steady hand while you sit at the bench, 0 to 1; 0 away (K3). */
  hand?: number;
  spot?: BenchSpot | null;
}

/**
 * Resolves one batch: whether it holds, a blow-up, the lift, the yield and mastery. What it makes
 * carries your mark (K6). At a guild's bench (`atGuild`) your own tool is neither used nor cracked.
 * An experiment's hit (K7) is `sure` to hold: it is the find.
 */
export function resolve(
  c: Cultivator,
  r: Recipe,
  above: boolean,
  hand: number,
  land: LandHand,
  day: number,
  rng: Rng,
  events: BenchEvent[],
  atGuild = false,
  sure = false,
): Cultivator {
  const tool = atGuild ? null : toolFor(c, r);
  let next = c;
  const held = sure || rng.chance(holdOdds(c, r, land));
  let made: string | null = null;
  let count = 0;
  let blew = false;
  if (held) {
    const lift = liftOf(c, r, above, tool, hand, land);
    const range = rarityRange(item(r.output));
    const bands = Math.floor(lift) + (rng.chance(lift - Math.floor(lift)) ? 1 : 0);
    const rar = range[Math.min(range.length - 1, bands)]!;
    made = variantId(r.output, rar);
    count = yieldOf(c, r);
    const s = stow(next, made, count);
    next = s.c;
    next = withCrafts(next, {
      marked: { ...next.crafts.marked, [made]: (next.crafts.marked[made] ?? 0) + count },
    });
    if (rarityRank(rar) >= rarityRank(CRAFT_RENOWN.rareFrom))
      events.push({ type: 'made-rare', data: { made, craft: r.craft } });
    if (s.left > 0)
      next = withCrafts(next, {
        tray: { ...next.crafts.tray, [made]: (next.crafts.tray[made] ?? 0) + s.left },
      });
  } else if (tool && rng.chance(blowUpShare(c, r.craft))) {
    blew = true;
    const cracked = variantId(baseOf(tool.id), tool.rarity, { cracked: true });
    next = addItem(addItem(next, tool.id, -1), cracked, 1);
    events.push({ type: 'blow-up', data: { recipe: r.output, tool: baseOf(tool.id) } });
  }
  // Mastery, and the insight each level reached releases.
  const before = familyLevel(next, r.family);
  const mastery = {
    ...next.crafts.mastery,
    [r.family]: familyBatches(next, r.family) + masteryFrom(c, r, held),
  };
  next = withCrafts(next, { mastery });
  const after = familyLevel(next, r.family);
  for (let level = before + 1; level <= after; level++) {
    const burst = CRAFT_MASTERY.burst[level]! * 3 ** (recipeTier(r) - 1);
    next = {
      ...next,
      insight: { current: next.insight.current + burst, earned: next.insight.earned + burst },
    };
    events.push({ type: 'craft-level', data: { family: r.family, level } });
  }
  const played = hand > 0 ? { hand: Math.round(hand * 100) / 100 } : {};
  const recent = [
    { day, recipe: r.output, made, count, blew, ...played },
    ...next.crafts.recent,
  ].slice(0, RECENT_BATCHES);
  return withCrafts(next, { recent });
}

/**
 * The guild's test batch (K6; Styles and the craft grade): one batch of a recipe at the guild's
 * bench, its inputs from your Bag, resolved at once at the hand you sat it with (none queued), the
 * guild's furnace standing in for yours. Null when the Bag can't fill it.
 */
export function examBatch(
  c: Cultivator,
  r: Recipe,
  hand: number,
  day: number,
  rng: Rng,
): { cultivator: Cultivator; held: boolean; events: BenchEvent[] } | null {
  const plan = planInputs(c, r);
  if (plan.short.length > 0) return null;
  let next = c;
  for (const [id, n] of Object.entries(plan.take)) next = addItem(next, id, -n);
  const events: BenchEvent[] = [];
  const h = Math.max(0, Math.min(1, hand));
  next = resolve(next, r, plan.above, h, NO_LAND, day, rng, events, true);
  return { cultivator: next, held: next.crafts.recent[0]?.made != null, events };
}

/** The mean steady hand a batch was played at over its hours. */
export function meanHand(c: Cultivator, front: NonNullable<CraftsState['front']>): number {
  const hours = frontHours(c, front);
  return hours > 0 ? Math.min(1, (front.hand ?? 0) / hours) : 0;
}

/** Craft hours the front takes: its batch's, or a mend's craft hour a tier. */
export function frontHours(c: Cultivator, front: NonNullable<CraftsState['front']>): number {
  if (front.experiment) return experimentHours(c, front.experiment);
  return front.mend ? mendNeeds(front.mend).hours : batchHours(c, recipe(front.recipe));
}

/** Finishes a mend: the piece mended if you still have it, and the bench moves on. */
function finishMend(c: Cultivator, day: number): Cultivator {
  const thing = c.crafts.front!.mend!;
  const still = needsMend(c, thing);
  const next = still ? mended(c, thing) : c;
  const done = {
    day,
    recipe: baseOf(thing),
    made: mendedId(thing),
    count: 1,
    blew: false,
    mend: true,
  };
  const recent = (still ? [done, ...next.crafts.recent] : next.crafts.recent).slice(
    0,
    RECENT_BATCHES,
  );
  const [entry, ...rest] = next.crafts.bench;
  const bench = entry?.mend === thing ? rest : next.crafts.bench;
  return withCrafts(next, { bench, front: null, recent });
}

/** Resolves the front's batches, each rolled alone, and moves the bench on past them. */
function finish(
  c: Cultivator,
  day: number,
  rng: Rng,
  events: BenchEvent[],
  spot: BenchSpot | null,
): Cultivator {
  const front = c.crafts.front!;
  if (front.mend) return finishMend(c, day);
  if (front.experiment) return finishExperiment(c, day, rng, events, spot);
  const r = recipe(front.recipe);
  const batches = front.batches ?? 1;
  const hand = meanHand(c, front);
  const land = landHand(r, spot);
  let next = c;
  for (let i = 0; i < batches; i++)
    next = resolve(next, r, front.above, hand, land, day, rng, events);
  // The bench moves on.
  const [entry, ...rest] = next.crafts.bench;
  const bench =
    entry && entry.recipe === r.output && entry.batches > batches
      ? [{ ...entry, batches: entry.batches - batches }, ...rest]
      : entry?.recipe === r.output
        ? rest
        : next.crafts.bench;
  return withCrafts(next, { bench, front: null });
}

/**
 * Works the bench for this many Craft hours: the front batch loads its inputs when its first hour
 * starts, runs its hours, and resolves; the next one loads after it. A batch that can't load (no
 * whole tool, the Bag short) leaves the hours idle. The hours carry no further than the day step.
 * Each hour a batch runs takes the hand you sit with (`at.hand`), and it resolves at their mean.
 */
export function workBench(
  c: Cultivator,
  hours: number,
  day: number,
  rng: Rng,
  at: BenchAt = {},
): BenchResult {
  const hand = Math.max(0, Math.min(1, at.hand ?? 0));
  const spot = at.spot ?? null;
  keepFound(c);
  let next = c;
  let left = hours;
  let batches = 0;
  const events: BenchEvent[] = [];
  while (left > 1e-9) {
    if (!next.crafts.front) {
      next = dropStaleMends(next);
      const loaded = load(next);
      if (!loaded) break;
      next = loaded;
    }
    const front = next.crafts.front!;
    const need = frontHours(next, front) - front.hours;
    if (left + 1e-9 < need) {
      next = withCrafts(next, { front: withHand(front, left, hand) });
      break;
    }
    left -= need;
    if (!front.mend) batches += front.batches ?? 1;
    next = finish(withCrafts(next, { front: withHand(front, need, hand) }), day, rng, events, spot);
  }
  return { cultivator: next, events, batches };
}

/** Mends at the bench's head for pieces no longer needing it (sold, or mended in town) leave it. */
function dropStaleMends(c: Cultivator): Cultivator {
  let i = 0;
  while (c.crafts.bench[i]?.mend && !needsMend(c, c.crafts.bench[i]!.mend!)) i++;
  return i === 0 ? c : withCrafts(c, { bench: c.crafts.bench.slice(i) });
}

/** The front after `hours` more at a hand: its hours, and the hand put in beside them. */
function withHand(
  front: NonNullable<CraftsState['front']>,
  hours: number,
  hand: number,
): NonNullable<CraftsState['front']> {
  const put = (front.hand ?? 0) + hand * hours;
  return { ...front, hours: front.hours + hours, ...(put > 0 ? { hand: put } : {}) };
}

/** What the bench waits on, for the page: nothing, the tool, the inputs or the soul. */
export function benchWaits(c: Cultivator): string | null {
  if (c.crafts.front) return null;
  const entry = c.crafts.bench[0];
  if (!entry) return null;
  if (entry.mend) {
    const why = cantMend(c, entry.mend);
    if (why) return why;
    const need = mendNeeds(entry.mend);
    return heldOf(c, need.input, need.tier).length > 0 ? null : `Short 1 ${item(need.input).name}.`;
  }
  if (entry.experiment) return experimentWaits(c, entry.experiment);
  const r = recipe(entry.recipe);
  const why = cantBrew(c, r.output);
  if (why) return why;
  if (!toolFor(c, r)) {
    const tool = CRAFTS[r.craft].tool;
    const cracked = toolsHeld(c, r.craft).some((t) => t.cracked);
    return cracked
      ? `Your ${tool} is cracked: a refiner mends it for a tenth of its worth, or mend it at a forge.`
      : `You carry no ${tool} that holds a tier ${recipeTier(r)} fire.`;
  }
  const short = planInputs(c, r).short;
  if (short.length > 0)
    return `Short ${short.map((s) => `${s.need} ${item(s.thing).name}`).join(' and ')}.`;
  return null;
}

/** The family a recipe is filed under, for the page. */
export function familyName(id: FamilyId): string {
  return FAMILIES[id].name;
}
