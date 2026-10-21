// Experimentation (design § Professions, Experimentation; The effect table and experimentation;
// K7): what a throw leans to, what it aims at, the design's odds and pity, a blind throw finding
// only the commonest (a generated recipe at its things' tier), matched things finding a written
// recipe, the find kept in the save and laid on the edge, and a guarded recipe found with no leak.
import { describe, expect, it } from 'vitest';
import { RECIPES, recipe } from '../content/crafts.ts';
import {
  EFFECT_WORDS,
  ELEMENT_WORDS,
  FOUND_EFFECTS,
  foundId,
  foundItem,
  foundName,
  isFound,
  parseFound,
  rollFloor,
} from '../content/found.ts';
import { ITEMS, hasItem, item } from '../content/items.ts';
import { MANUALS } from '../content/manuals.ts';
import { tierNodes, tree } from '../content/trees/index.ts';
import { craftTiersHeld, knowsRecipe, knownRecipes, queueBatches, workBench } from './crafts.ts';
import {
  baseOdds,
  cantThrow,
  experimentHours,
  lean,
  queueExperiment,
  setKey,
  target,
  tryOdds,
  type Throw,
} from './experiment.ts';
import { Rng } from './rng.ts';
import { loadSave, makeSave } from './save/format.ts';
import { addItem, newLife, withPlayer, type Cultivator } from './state.ts';

const ALCHEMY_TIER_1 = [
  'alchemy-steady-pinch',
  'alchemy-lid-watching',
  'alchemy-clean-hands',
  'alchemy-steady-flame',
  'alchemy-tight-seal',
  'alchemy-banked-coals',
  'alchemy-vented-lid',
];

/** A Qi Condensation alchemist with the crude furnace and what's given, nothing known. */
function alchemist(things: Record<string, number> = {}, o: { held?: boolean } = {}): Cultivator {
  const s = newLife({ name: 'Han Li', seed: 'experiment' });
  let c: Cultivator = { ...s.player, items: {} };
  c = addItem(c, 'crude-clay-furnace', 1);
  c = addItem(c, 'wolf-hair-talisman-brush', 1);
  for (const [k, n] of Object.entries(things)) c = addItem(c, k, n);
  if (o.held) c = { ...c, nodes: [...c.nodes, ...ALCHEMY_TIER_1] };
  return c;
}

const throwOf = (craft: Throw['craft'], inputs: Record<string, number>): Throw => ({
  craft,
  inputs: Object.entries(inputs).map(([thing, count]) => ({ thing, count })),
});

/** Works the bench's front throw to its end. */
function work(c: Cultivator, seed = 'k7'): ReturnType<typeof workBench> {
  return workBench(
    c,
    experimentHours(c, c.crafts.bench[0]!.experiment!),
    100,
    Rng.fromString(seed),
  );
}

/** Pity enough that a try lands at its cap. */
const certain = (c: Cultivator, t: Throw): Cultivator => ({
  ...c,
  crafts: { ...c.crafts, pity: { [setKey(t)]: 500 } },
});

describe('what a throw leans to', () => {
  it('reads the property its craft makes most and the element most of it carries, by pieces', () => {
    const l = lean(throwOf('alchemy', { 'old-apricot-kernel': 6, 'thunderhead-clover': 4 }));
    expect(l.property).toBe('nourishing');
    expect(l.element).toBe('wood');
    expect(l.effect).toBe('qi');
    expect(l.tier).toBe(1);
    // A tie leads no element; a property the row doesn't make is passed over.
    const tie = lean(throwOf('alchemy', { 'old-apricot-kernel': 5, 'moon-sea-grape': 5 }));
    expect(tie.element).toBeNull();
    expect(lean(throwOf('alchemy', { 'beast-hide': 3 })).effect).toBeNull();
  });

  it('counts toxic as tenths of a pill’s pieces, and turns swift of earth or water to an escape', () => {
    const toxic = lean(throwOf('alchemy', { 'raider-beast-blood': 3, 'old-apricot-kernel': 7 }));
    expect(toxic.toxic).toBe(3);
    expect(toxic.effect).toBe('qi');
    expect(lean(throwOf('talismans', { 'beast-wing': 1 })).effect).toBe('stride');
    expect(lean(throwOf('talismans', { 'beast-fin': 1 })).effect).toBe('flee');
  });
});

describe('what it aims at', () => {
  it('finds only the commonest blind: a generated recipe at its things’ tier', () => {
    const t = throwOf('alchemy', { 'old-apricot-kernel': 6, 'thunderhead-clover': 4 });
    const aim = target(alchemist(), t);
    expect(aim.kind).toBe('made');
    if (aim.kind === 'made')
      expect(aim.key).toEqual({ effect: 'qi', element: 'wood', tier: 1, toxic: 0 });
  });

  it('aims at a written recipe when half or more of the things are its', () => {
    const aim = target(
      alchemist(),
      throwOf('alchemy', { 'calm-heart-grass': 6, 'bend-water-lotus-seed': 4 }),
    );
    expect(aim.kind).toBe('written');
    if (aim.kind === 'written') {
      expect(aim.recipe.output).toBe('fen-yin-pill');
      expect(aim.overlap).toBe(1);
    }
    // Two of three things shared is close; one of three is not.
    const far = target(
      alchemist(),
      throwOf('alchemy', { 'old-apricot-kernel': 4, 'ridge-bitterroot': 3, 'blood-salt-kelp': 3 }),
    );
    expect(far.kind).toBe('written');
    const third = target(
      alchemist(),
      throwOf('alchemy', { 'old-apricot-kernel': 5, 'calm-heart-grass': 5 }),
    );
    expect(third.kind).toBe('made');
  });

  it('runs no experiment on a recipe you know, nor on what makes nothing here', () => {
    const c = alchemist({ 'old-apricot-kernel': 6, 'ridge-bitterroot': 4 });
    const known = { ...c, nodes: [...c.nodes, 'alchemy-qi-gathering-seal'] };
    const t = throwOf('alchemy', { 'old-apricot-kernel': 6, 'ridge-bitterroot': 4 });
    expect(target(known, t).kind).toBe('known');
    expect(cantThrow(known, t, 1)).toMatch(/Qi-Gathering Pill/);
    expect(
      cantThrow(alchemist({ 'beast-hide': 3 }), throwOf('alchemy', { 'beast-hide': 3 }), 1),
    ).toMatch(/nothing/);
  });

  it('leaves a talisman’s sheet out of what is shared', () => {
    const aim = target(alchemist(), throwOf('talismans', { 'beast-wing': 1 }));
    expect(aim.kind).toBe('written');
    // The Roc-Feather Talisman's ink is a wing, as Divine Travel's and the Storm-Hawk's are.
    if (aim.kind === 'written')
      expect([
        'roc-feather-talisman',
        'divine-travel-talisman',
        'storm-hawk-pinion-talisman',
      ]).toContain(aim.recipe.output);
    const guano = target(alchemist(), throwOf('talismans', { 'bat-guano': 1 }));
    expect(guano.kind).toBe('made');
    if (guano.kind === 'made') expect(guano.key.effect).toBe('searing');
  });
});

describe('the odds', () => {
  const t = throwOf('alchemy', { 'old-apricot-kernel': 6, 'thunderhead-clover': 4 });

  it('go by the craft Dao’s tiers held: a tier above at 1.5%, at your tier 6%', () => {
    expect(craftTiersHeld(alchemist(), 'alchemy')).toBe(0);
    expect(baseOdds(alchemist(), 'alchemy', 1)).toBe(0.015);
    expect(baseOdds(alchemist(), 'alchemy', 2)).toBe(0);
    expect(baseOdds(alchemist({}, { held: true }), 'alchemy', 1)).toBe(0.06);
  });

  it('match the design’s example: about 8% a try, 16% with four sets, 33% after ten misses', () => {
    let c = alchemist({}, { held: true });
    const wood = tree('wood');
    const half = tierNodes(wood, 1).slice(0, Math.ceil(tierNodes(wood, 1).length / 2));
    c = { ...c, nodes: [...c.nodes, ...half.map((n) => n.id)] };
    c = { ...c, crafts: { ...c.crafts, mastery: { 'qi-pills': 10 } } };
    const aim = target(c, t);
    expect(tryOdds(c, t, aim, 1).chance).toBeCloseTo(0.0825, 3);
    expect(tryOdds(c, t, aim, 4).chance).toBeCloseTo(0.158, 2);
    const missed = { ...c, crafts: { ...c.crafts, pity: { [setKey(t)]: 10 } } };
    expect(tryOdds(missed, t, aim, 4).chance).toBeCloseTo(0.33, 2);
  });

  it('read the overlap, and never pass 95% a try', () => {
    const c = alchemist({}, { held: true });
    const full = throwOf('alchemy', { 'old-apricot-kernel': 6, 'ridge-bitterroot': 4 });
    const part = throwOf('alchemy', {
      'old-apricot-kernel': 4,
      'ridge-bitterroot': 3,
      'beast-hide': 3,
    });
    const aim = target(c, part);
    expect(aim.kind).toBe('written');
    const one = tryOdds(c, full, target(c, full)).perTry;
    expect(tryOdds(c, part, aim).perTry).toBeCloseTo((one * 2) / 3, 6);
    expect(tryOdds(certain(c, t), t, target(c, t), 1).perTry).toBe(0.95);
  });
});

describe('a throw at the bench', () => {
  it('finds a generated recipe blind, kept in the save, its thing made and named', () => {
    const t = throwOf('alchemy', { 'old-apricot-kernel': 6, 'thunderhead-clover': 4 });
    let c = certain(alchemist({ 'old-apricot-kernel': 6, 'thunderhead-clover': 4 }), t);
    c = queueExperiment(c, t, 1).cultivator;
    expect(c.crafts.bench[0]?.experiment).toBeDefined();
    const r = work(c);
    const after = r.cultivator;
    expect(r.events.some((e) => e.type === 'recipe-found')).toBe(true);
    const found = after.crafts.found[0]!;
    expect(isFound(found)).toBe(true);
    expect(parseFound(found)).toMatchObject({ effect: 'qi', element: 'wood', tier: 1, toxic: 0 });
    expect(after.crafts.recipes[0]!.inputs).toEqual(t.inputs);
    expect(knowsRecipe(after, found)).toBe(true);
    expect(after.crafts.pity[setKey(t)]).toBeUndefined();
    // Its batch came out of the furnace, and its things were spent.
    expect(Object.keys(after.items).some((id) => id.startsWith(found))).toBe(true);
    expect(after.items['old-apricot-kernel'] ?? 0).toBe(0);
    expect(item(found).name).toMatch(/-Nourishing Pill$/);
    // Through a save and back, it brews again like any recipe.
    const s = withPlayer(newLife({ name: 'Han Li', seed: 'experiment' }), after);
    const back = loadSave(JSON.parse(JSON.stringify(makeSave(s, 1)))).state.player;
    expect(knownRecipes(back).map((x) => x.output)).toContain(found);
    const more = addItem(addItem(back, 'old-apricot-kernel', 6), 'thunderhead-clover', 4);
    expect(queueBatches(more, found).reason).toBeNull();
  });

  it('finds a written recipe from its things, its craft Dao seal lit in its place', () => {
    const t = throwOf('alchemy', { 'old-apricot-kernel': 5, 'moon-sea-grape': 5 });
    let c = certain(alchemist({ 'old-apricot-kernel': 5, 'moon-sea-grape': 5 }), t);
    c = queueExperiment(c, t, 1).cultivator;
    const after = work(c).cultivator;
    expect(after.crafts.found).toEqual(['qi-restoring-pill']);
    expect(after.nodes).toContain('alchemy-qi-restoring-seal');
    expect(knowsRecipe(after, 'qi-restoring-pill')).toBe(true);
  });

  it('spends the things on a miss, a pity point on the set, no mastery', () => {
    const t = throwOf('alchemy', { 'old-apricot-kernel': 6, 'thunderhead-clover': 4 });
    let c = alchemist({ 'old-apricot-kernel': 6, 'thunderhead-clover': 4 });
    c = queueExperiment(c, t, 1).cultivator;
    // At 1.5% a miss is all but sure on this seed.
    const after = work(c, 'miss').cultivator;
    expect(after.crafts.found).toEqual([]);
    expect(after.crafts.pity[setKey(t)]).toBe(1);
    expect(after.crafts.mastery).toEqual({});
    expect(after.items['old-apricot-kernel'] ?? 0).toBe(0);
    expect(after.crafts.recent[0]?.experiment?.inputs).toEqual(t.inputs);
    expect(after.crafts.bench).toEqual([]);
  });

  it('finds a guarded recipe with no leak: nothing of the style is learned', () => {
    const t = throwOf('alchemy', { 'raider-beast-blood': 3, 'beast-marrow': 4 });
    let c = certain(alchemist({ 'raider-beast-blood': 3, 'beast-marrow': 4 }), t);
    const before = c.nodes.length;
    c = queueExperiment(c, t, 1).cultivator;
    const after = work(c).cultivator;
    expect(knowsRecipe(after, 'red-marrow-pill')).toBe(true);
    expect(after.nodes.length).toBe(before);
    const styleNodes = MANUALS.filter((m) => m.nodes.some((n) => n.recipe === 'red-marrow-pill'))
      .flatMap((m) => m.nodes)
      .map((n) => n.id);
    expect(after.nodes.some((n) => styleNodes.includes(n))).toBe(false);
  });
});

describe('generated recipes', () => {
  it('stop at blue: the floor never past it, nor a variant', () => {
    expect(rollFloor(0.999, 9)).toBe('blue');
    expect(rollFloor(0, 0)).toBe('white');
    expect(rollFloor(0.45, 1)).toBe('green');
    const id = foundId({ effect: 'qi', element: 'wood', tier: 1, floor: 'white', toxic: 0 });
    expect(hasItem(`${id}~blue`)).toBe(true);
    expect(hasItem(`${id}~purple`)).toBe(false);
    expect(parseFound(id.replace('white', 'gold'))).toBeNull();
  });

  it('are sized as the common written one, toxic stronger and more poisonous', () => {
    const qi = foundItem(
      foundId({ effect: 'qi', element: 'wood', tier: 1, floor: 'white', toxic: 0 }),
    )!;
    expect(qi.uses.consume).toEqual({
      effects: [{ effect: 'fuel', ladder: 'qi', days: 3 }],
      dose: 10,
    });
    const fierce = foundItem(
      foundId({ effect: 'qi', element: null, tier: 1, floor: 'white', toxic: 3 }),
    )!;
    expect(fierce.uses.consume).toEqual({
      effects: [{ effect: 'fuel', ladder: 'qi', days: 5 }],
      dose: 25,
    });
    expect(fierce.name).toMatch(/^Fierce /);
    const strike = foundItem(
      foundId({ effect: 'searing', element: null, tier: 1, floor: 'white', toxic: 0 }),
    )!;
    expect(strike.uses.fight).toEqual({ form: 'projectile', damage: 'fire', power: 44 });
  });

  it('take no written thing’s name, and two signatures never share one', () => {
    const written = new Set(ITEMS.map((i) => i.name));
    const names = new Set<string>();
    const elements = Object.keys(ELEMENT_WORDS).map((e) => (e === 'none' ? null : e));
    let n = 0;
    for (const effect of FOUND_EFFECTS)
      for (const element of elements)
        for (const toxic of EFFECT_WORDS[effect].kind.en === 'Pill' ? [0, 3] : [0]) {
          const { name } = foundName({ effect, element: element as never, tier: 1, toxic });
          expect(written.has(name), name).toBe(false);
          names.add(name);
          n++;
        }
    expect(names.size).toBe(n);
  });

  it('never stand among the written recipes', () => {
    expect(RECIPES.some((r) => isFound(r.output))).toBe(false);
    expect(() => recipe('found.cleanse.ice.t3.white')).toThrow();
  });
});
