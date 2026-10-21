// Experimentation (design § Professions, Experimentation; The effect table and experimentation;
// K7). Throw any things in: the bench reads what they carry most, aims at the unknown recipe of
// that craft whose inputs lie closest to them (half or more shared), or, when nothing written lies
// close, at the recipe the furnace would make of its own (content/found.ts). A throw is a batch of
// the unknown on Craft hours, its things spent, rolled at the design's odds on the `craft` stream:
// your craft Dao's tiers held against the recipe's tier, mastery, realm, the element's Dao, Lore's
// perks, and a pity point each miss on that set. A hit teaches the recipe and makes its batches,
// lifted the usual way (the steady hand among it, never the odds); a miss may crack the tool.
// Finding a power's guarded recipe yourself is no leak: nothing is learned from its pages.
import type { Recipe } from '../content/catalogs/types.ts';
import {
  BATCH,
  PROPERTIES,
  RECENT_BATCHES,
  RECIPES,
  TIER_HOURS,
  addFoundRecipes,
  recipeElement,
  recipeTier,
  type FamilyId,
  type Property,
} from '../content/crafts.ts';
import type { Element } from '../content/elements.ts';
import {
  EXPERIMENT,
  FLEE_THROUGH,
  FOUND_FAMILY,
  FOUND_MAKES,
  TALISMAN_SHEET,
  foundId,
  foundSignature,
  parseFound,
  rollFloor,
  type ExperimentCraft,
  type FoundEffect,
  type FoundKey,
} from '../content/found.ts';
import { baseOf, item, variantId } from '../content/items.ts';
import { rarityRank } from '../content/rarity.ts';
import { tree } from '../content/trees/index.ts';
import {
  FASTEST,
  blowUpShare,
  craftReach,
  craftTiersHeld,
  familyLevel,
  heldOf,
  knownRecipes,
  landHand,
  meanHand,
  own,
  resolve,
  sealFor,
  toolAt,
  withCrafts,
  type BenchEvent,
  type BenchSpot,
} from './crafts.ts';
import type { Rng } from './rng.ts';
import { addItem, type Cultivator, type CraftsState } from './state.ts';
import { tierHeld } from './trees.ts';

/** The id a bench entry carries when it throws things in. */
export const EXPERIMENT_ENTRY = 'experiment';

/** What you throw in: the craft and the things you chose, the talisman sheet not among them. */
export interface Throw {
  craft: ExperimentCraft;
  inputs: readonly { thing: string; count: number }[];
}

/** What a throw takes from the Bag: what you chose, and a talisman's sheet. */
export function thrown(t: Throw): { thing: string; count: number }[] {
  return [...(t.craft === 'talismans' ? TALISMAN_SHEET : []), ...t.inputs];
}

/** A set's key for its pity: the craft and the things chosen, whatever their counts. */
export function setKey(t: Throw): string {
  const things = [...new Set(t.inputs.map((i) => baseOf(i.thing)))].sort();
  return `${t.craft}:${things.join('+')}`;
}

// ---------------------------------------------------------------- what it leans to

/** What a throw carries most (K7's talk), counted by pieces among the things you chose. */
export interface Lean {
  /** Each property, by pieces, most first. */
  properties: { property: Property; n: number }[];
  /** Each element, by pieces, most first. */
  elements: { element: Element; n: number }[];
  /** The property its craft's row makes most of, or null when it makes nothing here yet. */
  property: Property | null;
  /** The element most of it carries, or null when none leads. */
  element: Element | null;
  /** Tenths of a pill's pieces carrying toxic. */
  toxic: number;
  /** What the furnace would make of it, or null. */
  effect: FoundEffect | null;
  /** Its tier: the highest of what goes in. */
  tier: number;
}

const ranked = <K>(m: Map<K, number>) =>
  [...m].map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n);

export function lean(t: Throw): Lean {
  const props = new Map<Property, number>();
  const els = new Map<Element, number>();
  let pieces = 0;
  let toxic = 0;
  for (const i of t.inputs) {
    const it = item(i.thing);
    pieces += i.count;
    for (const p of it.uses.ingredient?.properties ?? [])
      props.set(p, (props.get(p) ?? 0) + i.count);
    if (it.uses.ingredient?.properties.includes('toxic')) toxic += i.count;
    if (it.element) els.set(it.element, (els.get(it.element) ?? 0) + i.count);
  }
  const row = FOUND_MAKES[t.craft];
  const makes = [...props]
    .filter(([p]) => row[p])
    .sort((a, b) => b[1] - a[1] || PROPERTIES.indexOf(a[0]) - PROPERTIES.indexOf(b[0]));
  const property = makes[0]?.[0] ?? null;
  const elements = ranked(els);
  const element = elements.length > 0 && elements[1]?.n !== elements[0]!.n ? elements[0]!.k : null;
  let effect = property ? row[property]! : null;
  if (effect === 'stride' && element && FLEE_THROUGH.includes(element)) effect = 'flee';
  const tier = Math.max(1, ...thrown(t).map((i) => item(i.thing).tier));
  return {
    properties: ranked(props).map((x) => ({ property: x.k, n: x.n })),
    elements: elements.map((x) => ({ element: x.k, n: x.n })),
    property,
    element,
    toxic: t.craft === 'alchemy' && pieces > 0 ? Math.round((10 * toxic) / pieces) : 0,
    effect,
    tier,
  };
}

// ---------------------------------------------------------------- what it aims at

/** What a throw aims at (K7's talk). */
export type Target =
  /** Nothing chosen yet. */
  | { kind: 'empty' }
  /** What it carries makes nothing at this bench yet, and nothing written lies close. */
  | { kind: 'nothing'; lean: Lean }
  /** It lies closest to a recipe you know: no experiment. */
  | { kind: 'known'; recipe: Recipe; lean: Lean }
  /** A written recipe you don't know lies close: the share of things shared. */
  | { kind: 'written'; recipe: Recipe; overlap: number; lean: Lean }
  /** Nothing written lies close: the furnace would make its own. */
  | { kind: 'made'; key: Omit<FoundKey, 'floor'>; lean: Lean };

/** The things a recipe takes that a throw chooses: a talisman's without its sheet. */
function chosenOf(r: Recipe): Set<string> {
  const sheet = r.craft === 'talismans' ? TALISMAN_SHEET.map((i) => i.thing) : [];
  return new Set(r.inputs.map((i) => i.thing).filter((x) => !sheet.includes(x)));
}

/** Things shared over all things on either side. */
export function overlap(t: Throw, r: Recipe): number {
  const mine = new Set(t.inputs.map((i) => baseOf(i.thing)));
  const its = chosenOf(r);
  const both = [...mine].filter((x) => its.has(x)).length;
  const either = new Set([...mine, ...its]).size;
  return either === 0 ? 1 : both / either;
}

export function target(c: Cultivator, t: Throw): Target {
  if (t.inputs.length === 0) return { kind: 'empty' };
  const l = lean(t);
  const known = new Set(knownRecipes(c).map((r) => r.output));
  const close = [...RECIPES, ...foundRecipes(c)]
    .filter((r) => r.craft === t.craft)
    .map((r) => ({ r, o: overlap(t, r), knew: known.has(r.output) }))
    .filter((x) => x.o >= EXPERIMENT.close && (x.knew || baseOdds(c, t.craft, recipeTier(x.r)) > 0))
    .sort(
      (a, b) => b.o - a.o || Number(a.knew) - Number(b.knew) || recipeTier(a.r) - recipeTier(b.r),
    );
  const best = close[0];
  if (best?.knew) return { kind: 'known', recipe: best.r, lean: l };
  if (best) return { kind: 'written', recipe: best.r, overlap: best.o, lean: l };
  if (!l.effect) return { kind: 'nothing', lean: l };
  const key = { effect: l.effect, element: l.element, tier: l.tier, toxic: l.toxic };
  const had = foundRecipes(c).find((r) => signatureOf(r.output) === foundSignature(key));
  if (had) return { kind: 'known', recipe: had, lean: l };
  return { kind: 'made', key, lean: l };
}

/** A generated recipe's signature, from its id. */
function signatureOf(id: string): string | null {
  const k = parseFound(id);
  return k ? foundSignature(k) : null;
}

// ---------------------------------------------------------------- the odds

/**
 * The base chance by your craft Dao's tiers held against the recipe's tier (K7's call: the tiers
 * you hold): two or more below 25%, one below 15%, at it 6%, one above 1.5% where your craft reach
 * gets there, and none past that.
 */
export function baseOdds(c: Cultivator, craft: ExperimentCraft, tier: number): number {
  const gap = craftTiersHeld(c, craft) - tier;
  const o = EXPERIMENT.odds;
  if (gap >= 2) return o.farBelow;
  if (gap === 1) return o.below;
  if (gap === 0) return o.at;
  if (gap === -1 && craftReach(c).reach >= tier) return o.above;
  return 0;
}

/** Tiers held in an element's Dao, for a recipe of that element (the five phases have trees). */
function elementTiers(c: Cultivator, element: Element | null): number {
  if (!element || !['wood', 'fire', 'earth', 'metal', 'water'].includes(element)) return 0;
  const t = tree(element);
  let n = 0;
  while (t.nodes.some((x) => x.tier === n + 1) && tierHeld(c, t, n + 1)) n++;
  return n;
}

export interface TryOdds {
  /** One try's chance, the pity in it. */
  perTry: number;
  /** The throw's chance over its sets: √sets tries. */
  chance: number;
  tries: number;
  /** One try's chance before the pity. */
  before: number;
  /** The pity's points in it, and the misses they come from. */
  pity: number;
  misses: number;
}

const NONE: TryOdds = { perTry: 0, chance: 0, tries: 0, before: 0, pity: 0, misses: 0 };

/** The odds of a throw finding what it aims at, over `sets` sets. */
export function tryOdds(c: Cultivator, t: Throw, aim: Target, sets = 1): TryOdds {
  if (aim.kind !== 'written' && aim.kind !== 'made') return NONE;
  const tier = aim.kind === 'written' ? recipeTier(aim.recipe) : aim.key.tier;
  const family: FamilyId =
    aim.kind === 'written' ? aim.recipe.family : FOUND_FAMILY[aim.key.effect];
  const element = aim.kind === 'written' ? recipeElement(aim.recipe) : aim.key.element;
  const share = aim.kind === 'written' ? aim.overlap : 1;
  const base = baseOdds(c, t.craft, tier);
  if (base <= 0) return NONE;
  const above = Math.max(0, craftReach(c).tier - tier);
  const before =
    (base *
      EXPERIMENT.mastery[familyLevel(c, family)]! *
      (1 + EXPERIMENT.realm * above) *
      (1 + EXPERIMENT.elementTier * elementTiers(c, element)) +
      own(c, t.craft, 'Odds')) *
    share;
  const misses = c.crafts.pity[setKey(t)] ?? 0;
  const pity = misses * EXPERIMENT.pity * (1 + own(c, t.craft, 'Pity'));
  const perTry = Math.min(EXPERIMENT.cap, before + pity);
  const tries = Math.sqrt(Math.max(1, sets));
  return { perTry, chance: 1 - (1 - perTry) ** tries, tries, before, pity, misses };
}

// ---------------------------------------------------------------- generated recipes in the save

/** A cultivator's generated recipes, as recipes. */
export function foundRecipes(c: Cultivator): Recipe[] {
  return c.crafts.recipes.map((g) => ({
    output: g.output,
    craft: g.craft,
    family: g.family,
    inputs: g.inputs,
  }));
}

/** Puts a cultivator's generated recipes into the recipe lookup, so `recipe()` finds them. */
export function keepFound(c: Cultivator): void {
  // An old save's migrations read known recipes before v46 gave the crafts their finds.
  if ((c.crafts?.recipes ?? []).length > 0) addFoundRecipes(foundRecipes(c));
}

// ---------------------------------------------------------------- the bench

/** Craft hours a throw takes: its craft's batch at its tier, less the craft's speed. */
export function experimentHours(c: Cultivator, t: Throw): number {
  const hours = BATCH[t.craft].hours * TIER_HOURS ** (lean(t).tier - 1);
  return hours * Math.max(FASTEST, 1 + own(c, t.craft, 'Speed'));
}

/** How many sets of a throw the Bag holds. */
export function setsHeld(c: Cultivator, t: Throw): number {
  return Math.min(
    ...thrown(t).map((i) => {
      const tier = item(i.thing).tier;
      return Math.floor(heldOf(c, i.thing, tier).reduce((n, h) => n + h.n, 0) / i.count);
    }),
  );
}

/** Why a throw can't go on the bench, or null when it can. */
export function cantThrow(c: Cultivator, t: Throw, sets: number): string | null {
  const aim = target(c, t);
  if (aim.kind === 'empty') return 'Throw something in first.';
  if (aim.kind === 'nothing') return 'What these carry makes nothing at this bench yet.';
  if (aim.kind === 'known') return `These are your ${item(aim.recipe.output).name}’s.`;
  if (tryOdds(c, t, aim, sets).perTry <= 0) return 'That is beyond your reach in this craft.';
  return experimentWaits(c, t, sets);
}

/** What a throw waits on at the bench: a whole tool of its tier, or the things themselves. */
export function experimentWaits(c: Cultivator, t: Throw, sets = 1): string | null {
  const tier = lean(t).tier;
  if (!toolAt(c, t.craft, tier))
    return `You carry no whole ${TOOL_WORD[t.craft]} that holds a tier ${tier} fire.`;
  if (setsHeld(c, t) < sets) return 'The Bag doesn’t hold that much of what you chose.';
  return null;
}

const TOOL_WORD: Record<ExperimentCraft, string> = {
  alchemy: 'furnace',
  refining: 'forge',
  talismans: 'brush',
};

/** Queues a throw at the bench's end, its sets as the entry's batches. */
export function queueExperiment(
  c: Cultivator,
  t: Throw,
  sets: number,
): { cultivator: Cultivator; reason: string | null } {
  const n = Math.max(1, Math.min(EXPERIMENT.sets, Math.floor(sets)));
  const why = cantThrow(c, t, n);
  if (why) return { cultivator: c, reason: why };
  const experiment = { craft: t.craft, inputs: t.inputs.map((i) => ({ ...i })) };
  const bench = [...c.crafts.bench, { recipe: EXPERIMENT_ENTRY, batches: n, experiment }];
  return { cultivator: withCrafts(c, { bench }), reason: null };
}

type Entry = CraftsState['bench'][number];

/** Loads a throw: a whole tool, and every set of it from the Bag, worst first. */
export function loadExperiment(c: Cultivator, entry: Entry): Cultivator | null {
  const t = entry.experiment!;
  if (experimentWaits(c, t, entry.batches)) return null;
  let next = c;
  let above = true;
  for (const i of thrown(t)) {
    let left = i.count * entry.batches;
    for (const h of heldOf(next, i.thing, item(i.thing).tier)) {
      if (left <= 0) break;
      const n = Math.min(left, h.n);
      next = addItem(next, h.id, -n);
      above &&= h.rank > rarityRank('white');
      left -= n;
    }
  }
  const front = {
    recipe: EXPERIMENT_ENTRY,
    above,
    hours: 0,
    batches: entry.batches,
    experiment: t,
  };
  return withCrafts(next, { front });
}

/**
 * Resolves a throw on its last hour: the find and its batches, or the things spent for nothing,
 * a pity point on the set, and perhaps a cracked tool. The bench moves on past it.
 */
export function finishExperiment(
  c: Cultivator,
  day: number,
  rng: Rng,
  events: BenchEvent[],
  spot: BenchSpot | null,
): Cultivator {
  const front = c.crafts.front!;
  const t = front.experiment!;
  const sets = front.batches ?? 1;
  const hand = meanHand(c, front);
  const aim = target(c, t);
  const odds = tryOdds(c, t, aim, sets);
  const tool = toolAt(c, t.craft, lean(t).tier);
  let next = withCrafts(c, { front: null, bench: c.crafts.bench.slice(1) });
  const inputs = t.inputs.map((i) => ({ ...i }));
  if ((aim.kind === 'written' || aim.kind === 'made') && rng.chance(odds.chance)) {
    let r: Recipe;
    if (aim.kind === 'written') {
      r = aim.recipe;
      next = learnFound(next, r.output);
    } else {
      const steps =
        (tool && rarityRank(tool.rarity) > rarityRank('white') ? 1 : 0) + (front.above ? 1 : 0);
      const key: FoundKey = { ...aim.key, floor: rollFloor(rng.next(), steps) };
      r = {
        output: foundId(key),
        craft: t.craft,
        family: FOUND_FAMILY[key.effect],
        inputs: thrown(t),
      };
      addFoundRecipes([r]);
      next = withCrafts(next, {
        recipes: [...next.crafts.recipes, { ...r, craft: t.craft, inputs: thrown(t), day }],
        found: [...next.crafts.found, r.output],
      });
    }
    const pity = { ...next.crafts.pity };
    delete pity[setKey(t)];
    next = withCrafts(next, { pity });
    events.push({
      type: 'recipe-found',
      data: { recipe: r.output, craft: t.craft, made: aim.kind === 'made' },
    });
    const land = landHand(r, spot);
    for (let i = 0; i < sets; i++)
      next = resolve(next, r, front.above, hand, land, day, rng, events, false, true);
    const [last, ...rest] = next.crafts.recent;
    const recent = last ? [{ ...last, experiment: { inputs, found: r.output } }, ...rest] : rest;
    return withCrafts(next, { recent });
  }
  // A miss: the things are spent, the set's pity grows, and the tool may burst.
  const key = setKey(t);
  next = withCrafts(next, {
    pity: { ...next.crafts.pity, [key]: (next.crafts.pity[key] ?? 0) + 1 },
  });
  let blew = false;
  if (tool && rng.chance(blowUpShare(next, t.craft))) {
    blew = true;
    const cracked = variantId(baseOf(tool.id), tool.rarity, { cracked: true });
    next = addItem(addItem(next, tool.id, -1), cracked, 1);
    events.push({ type: 'blow-up', data: { recipe: EXPERIMENT_ENTRY, tool: baseOf(tool.id) } });
  }
  const near = aim.kind === 'written' && aim.overlap >= EXPERIMENT.near;
  const recent = [
    {
      day,
      recipe: EXPERIMENT_ENTRY,
      made: null,
      count: 0,
      blew,
      ...(hand > 0 ? { hand: Math.round(hand * 100) / 100 } : {}),
      experiment: { inputs, ...(near ? { near: true } : {}) },
    },
    ...next.crafts.recent,
  ].slice(0, RECENT_BATCHES);
  return withCrafts(next, { recent });
}

/**
 * A written recipe found (K7): known from now on, and a craft Dao seal that teaches it lit in its
 * place, owned as if bought (design: a recipe known by any door is simply known).
 */
export function learnFound(c: Cultivator, id: string): Cultivator {
  const seal = sealFor(id);
  const nodes = seal && !c.nodes.includes(seal) ? [...c.nodes, seal] : c.nodes;
  const found = c.crafts.found.includes(id) ? c.crafts.found : [...c.crafts.found, id];
  return withCrafts({ ...c, nodes }, { found });
}
