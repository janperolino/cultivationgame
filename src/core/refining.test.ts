// Artifact refining (K4; design § Professions, Recipes, A batch, Production: mending is refining):
// the same bench at a forge. A refiner forges a blade, a played one lands a band higher than one
// queued, and a piece is mended at the bench, a craft hour a tier and a piece of what it was made of.
import { describe, expect, it } from 'vitest';
import { slipId } from '../content/catalogs/index.ts';
import { CRAFT_MASTERY, recipe } from '../content/crafts.ts';
import { item, variantId } from '../content/items.ts';
import {
  benchWaits,
  cantMend,
  frontHours,
  liftOdds,
  liftOf,
  mendNeeds,
  queueBatches,
  queueMend,
  toMend,
  toolFor,
  workBench,
} from './crafts.ts';
import { Rng } from './rng.ts';
import { addItem, newLife, type Cultivator } from './state.ts';

const SWORD = 'iron-sword';
const ORE = 'red-rocks-iron-ore';

/** A fresh refiner: the crude forge, the Iron Sword known, blades at a level, ore for `n` swords. */
function refiner(level = 0, n = 0): Cultivator {
  const s = newLife({ name: 'Han Li', seed: 'forge' });
  let c: Cultivator = {
    ...s.player,
    items: {},
    nodes: [...s.player.nodes, `${slipId(SWORD)}-node`],
  };
  c = addItem(addItem(c, 'crude-iron-forge', 1), ORE, 5 * n);
  return { ...c, crafts: { ...c.crafts, mastery: { blades: CRAFT_MASTERY.batches[level]! } } };
}

describe('the forge', () => {
  it('is refining’s tool, a bulk one, and works the Iron Sword’s eight hours', () => {
    const forge = item('crude-iron-forge');
    expect(forge.uses.tool?.craft).toBe('refining');
    expect(forge.bulk).toBe(4);
    const c = refiner(0, 1);
    expect(toolFor(c, recipe(SWORD))?.id).toBe('crude-iron-forge');
    expect(item(SWORD).source).not.toMatch(/smith/);
  });

  it('a refiner forges a blade from five ore on the bench', () => {
    let c = queueBatches(refiner(3, 1), SWORD).cultivator;
    expect(benchWaits(c)).toBeNull();
    const r = workBench(c, 8, 1, new Rng(3));
    c = r.cultivator;
    expect(r.batches).toBe(1);
    expect(c.items[ORE] ?? 0).toBe(0);
    const made = c.crafts.recent[0]!;
    expect(made.recipe).toBe(SWORD);
    if (made.made) expect(c.items[made.made]).toBe(1);
  });

  it('a played piece lands a band higher than one queued', () => {
    const c = refiner(0, 1);
    const r = recipe(SWORD);
    expect(liftOdds(r, liftOf(c, r, false, toolFor(c, r), 0))).toEqual([
      { rarity: 'white', chance: 1 },
    ]);
    expect(liftOdds(r, liftOf(c, r, false, toolFor(c, r), 1))).toEqual([
      { rarity: 'green', chance: 1 },
    ]);
    // Sat at the whole eight hours with a full hand, at Perfection so it holds.
    const sat = workBench(queueBatches(refiner(3, 1), SWORD).cultivator, 8, 1, new Rng(5), {
      hand: 1,
    }).cultivator;
    const done = sat.crafts.recent[0]!;
    if (done.made) expect(item(done.made).rarity).toBe('green');
    expect(done.hand).toBe(1);
  });
});

describe('mending at the bench', () => {
  it('mends worn armor in a craft hour a tier, for a piece of what it was made of', () => {
    let c = refiner();
    c = { ...c, gear: { ...c.gear, armor: 'boar-hide-vest' }, wear: { 'boar-hide-vest': 0.6 } };
    c = addItem(c, 'beast-hide', 1);
    expect(toMend(c)).toEqual(['boar-hide-vest']);
    expect(mendNeeds('boar-hide-vest')).toEqual({ hours: 1, tier: 1, input: 'beast-hide' });
    c = queueMend(c, 'boar-hide-vest').cultivator;
    expect(queueMend(c, 'boar-hide-vest').reason).toMatch(/already/);
    const r = workBench(c, 1, 1, new Rng(1)).cultivator;
    expect(r.wear['boar-hide-vest']).toBeUndefined();
    expect(r.items['beast-hide'] ?? 0).toBe(0);
    expect(r.crafts.bench).toEqual([]);
    expect(r.crafts.recent[0]).toMatchObject({ recipe: 'boar-hide-vest', mend: true });
  });

  it('mends a damaged piece back to its rarity and a cracked furnace whole, with ore', () => {
    const dmg = variantId('iron-sword', 'white', { damaged: true });
    const crk = variantId('crude-clay-furnace', 'white', { cracked: true });
    let c = addItem(addItem(addItem(refiner(), dmg, 1), crk, 1), ORE, 2);
    expect(mendNeeds(crk).input).toBe(ORE);
    c = queueMend(queueMend(c, dmg).cultivator, crk).cultivator;
    const front = workBench(c, 1, 1, new Rng(1)).cultivator;
    expect(front.items[dmg] ?? 0).toBe(0);
    const r = workBench(front, 1, 1, new Rng(1)).cultivator;
    expect(r.items[crk] ?? 0).toBe(0);
    expect(r.items['crude-clay-furnace']).toBe(1);
  });

  it('needs a whole forge, waits on its input, and drops a mend once the piece is gone', () => {
    const dmg = variantId('iron-sword', 'white', { damaged: true });
    const bare = addItem({ ...refiner(), items: {} }, dmg, 1);
    expect(cantMend(bare, dmg)).toMatch(/forge/);
    expect(cantMend(refiner(), dmg)).toMatch(/no mending/);
    let c = queueMend(addItem(refiner(), dmg, 1), dmg).cultivator;
    expect(benchWaits(c)).toMatch(/Short 1 Red Rocks Iron Ore/);
    c = addItem(addItem(c, dmg, -1), ORE, 1);
    const r = workBench(c, 1, 1, new Rng(1)).cultivator;
    expect(r.crafts.bench).toEqual([]);
    expect(r.items[ORE]).toBe(1);
  });

  it('gives a mend’s ore back when the piece leaves mid-mend (review 2026-10-21)', () => {
    const dmg = variantId('iron-sword', 'white', { damaged: true });
    const input = mendNeeds(dmg).input;
    let c = addItem(addItem(refiner(), dmg, 1), input, 1);
    c = queueMend(c, dmg).cultivator;
    c = workBench(c, 0.5, 1, new Rng(1)).cultivator;
    expect(c.items[input] ?? 0).toBe(0);
    expect(c.crafts.front?.mend).toBe(dmg);
    // Sold while it waited.
    c = addItem(c, dmg, -1);
    const r = workBench(c, 1, 1, new Rng(1)).cultivator;
    expect(r.crafts.front).toBeNull();
    expect(r.items[input]).toBe(1);
  });

  it('counts the hours a tier: a tier 2 piece takes two', () => {
    const ring = 'storage-ring';
    expect(mendNeeds(ring).hours).toBe(2);
    expect(frontHours(refiner(), { recipe: ring, above: false, hours: 0, mend: ring })).toBe(2);
  });
});
