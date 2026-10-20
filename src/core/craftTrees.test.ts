// The craft Dao trees (design § Professions, The craft Dao trees; K2): five trees in the same
// three branches, Hand, Line and Lore, each branch's capstone opening its own next tier and a tier
// held at half its nodes; recipe seals teaching what K1's bench brews; the perks moving a batch's
// numbers; and Twin Furnace. The fan's wedges are ui/craftFan.test.ts's.
import { describe, expect, it } from 'vitest';
import { CRAFT_IDS, hasRecipe, recipe } from '../content/crafts.ts';
import { hasItem } from '../content/items.ts';
import { CRAFT_STAT_CRAFTS } from '../content/stats.ts';
import { CRAFT_BRANCHES, craftBranchId } from '../content/trees/craft.ts';
import {
  branchNodes,
  CRAFT_DAOS,
  TIER_COUNT,
  tierNode,
  tierNodes,
  TREE_CATEGORIES,
  type Tree,
} from '../content/trees/index.ts';
import {
  batchHours,
  blowUpShare,
  craftDao,
  craftTiersHeld,
  holdOdds,
  knowsRecipe,
  liftOf,
  queueBatches,
  workBench,
  yieldOf,
} from './crafts.ts';
import { treeShown } from './seen.ts';
import { Rng } from './rng.ts';
import { loadSave, makeSave } from './save/format.ts';
import { addItem, newLife, type Cultivator } from './state.ts';
import { stats } from './stats.ts';
import { canLearn, learnNode, nodeSealed, tierHeld } from './trees.ts';

const QI_PILL = 'qi-gathering-pill';
const ALCHEMY = craftDao('alchemy');
const ROOT = 'alchemy-qi-gathering-seal';
const LINE_1 = ['alchemy-tight-seal', 'alchemy-banked-coals', 'alchemy-vented-lid'];
const TWIN = 'alchemy-twin-furnace';

/** A Qi Condensation life rich in insight, with the crude furnace and herbs for `n` batches. */
function crafter(n = 0): Cultivator {
  const s = newLife({ name: 'Han Li', seed: 'craft-trees' });
  let c: Cultivator = { ...s.player, items: {}, insight: { current: 1e6, earned: 1e6 } };
  c = addItem(c, 'crude-clay-furnace', 1);
  c = addItem(addItem(c, 'old-apricot-kernel', 6 * n), 'ridge-bitterroot', 4 * n);
  // The soul lags the qi, as most do, so nothing here rides a matched soul.
  return { ...c, qi: { ...c.qi, stage: 5 }, soul: { ...c.soul, stage: 3 } };
}

function learnAll(c: Cultivator, ids: readonly string[]): Cultivator {
  return ids.reduce((acc, id) => {
    const r = learnNode(acc, id);
    expect(r.check, id).toEqual({ ok: true });
    return r.cultivator;
  }, c);
}

const own = (t: Tree, tier: number, b: (typeof CRAFT_BRANCHES)[number]) =>
  branchNodes(t, craftBranchId(t.id, tier, b));

describe('the five craft Daos', () => {
  it('are Alchemy, Refining, Talismans, Formations and Spirit Farming, under Crafts', () => {
    expect(CRAFT_DAOS.map((t) => t.craft)).toEqual(CRAFT_IDS);
    expect(TREE_CATEGORIES.find((k) => k.id === 'crafts')!.trees).toEqual(CRAFT_DAOS);
    expect([...CRAFT_STAT_CRAFTS]).toEqual(CRAFT_IDS);
  });

  for (const t of CRAFT_DAOS) {
    it(`${t.name}: a root seal, then three branches of two minors, a notable and a capstone`, () => {
      const root = tierNode(t, 1, 'starter')!;
      expect(root.recipe).toBeDefined();
      expect(tierNodes(t, 1)).toHaveLength(13);
      expect(tierNodes(t, 2)).toHaveLength(12);
      for (const tier of [1, 2]) {
        for (const b of CRAFT_BRANCHES) {
          const [a, c, notable, cap] = own(t, tier, b);
          const from = tier === 1 ? root.id : own(t, 1, b)[3]!.id;
          expect([a!.kind, c!.kind, notable!.kind, cap!.kind]).toEqual([
            'minor',
            'minor',
            'notable',
            'capstone',
          ]);
          expect(a!.requires).toEqual([from]);
          expect(c!.requires).toEqual([from]);
          expect(notable!.requires).toEqual([a!.id, c!.id]);
          expect(cap!.requires).toEqual([notable!.id]);
          // Seals live in Lore; Hand and Line are perks, each doing something.
          if (b !== 'lore') for (const n of [a, c, notable, cap]) expect(n!.recipe).toBeUndefined();
          for (const n of [a, c, notable, cap]) {
            expect(n!.effects.length + (n!.recipe ? 1 : 0), n!.id).toBeGreaterThan(0);
          }
        }
      }
    });

    it(`${t.name}: tiers 3 to 9 carry only their three capstones, named`, () => {
      for (let tier = 3; tier <= TIER_COUNT; tier++) {
        expect(tierNodes(t, tier)).toHaveLength(0);
        const planned = t.planned!.filter((p) => p.tier === tier);
        expect(planned.map((p) => p.branch)).toEqual(
          CRAFT_BRANCHES.map((b) => craftBranchId(t.id, tier, b)),
        );
        for (const p of planned) expect(p.name && p.hanzi && p.text).toBeTruthy();
      }
    });

    it(`${t.name}: every seal names a good of its craft`, () => {
      for (const n of t.nodes.filter((x) => x.recipe)) {
        // Formations' flags and discs are written with their phase (K10).
        if (t.craft === 'formations') continue;
        expect(hasItem(n.recipe!), n.id).toBe(true);
        if (hasRecipe(n.recipe!)) expect(recipe(n.recipe!).craft, n.id).toBe(t.craft);
      }
    });
  }

  it('teaches Alchemy’s seals as recipes the bench brews', () => {
    const seals = ALCHEMY.nodes.filter((n) => n.recipe);
    for (const n of seals) expect(hasRecipe(n.recipe!), n.id).toBe(true);
    const c = learnAll(crafter(), [ROOT, 'alchemy-qi-restoring-seal']);
    expect(knowsRecipe(c, QI_PILL)).toBe(true);
    expect(knowsRecipe(c, 'qi-restoring-pill')).toBe(true);
    expect(queueBatches(c, 'qi-restoring-pill').reason).toBeNull();
  });
});

describe('climbing a craft Dao', () => {
  it('climbs one branch on its own capstone, the others still shut', () => {
    const c = learnAll(crafter(), [ROOT, ...LINE_1, TWIN]);
    const [line2] = own(ALCHEMY, 2, 'line');
    const [hand2] = own(ALCHEMY, 2, 'hand');
    expect(canLearn(c, line2!.id).ok).toBe(true);
    expect(canLearn(c, hand2!.id).ok).toBe(false);
  });

  it('holds a tier at half its nodes, so a lone branch needs a second to hold it', () => {
    const line = learnAll(crafter(), [ROOT, ...LINE_1, TWIN]);
    expect(tierHeld(line, ALCHEMY, 1)).toBe(false);
    const two = learnAll(line, ['alchemy-steady-pinch', 'alchemy-lid-watching']);
    expect(tierHeld(two, ALCHEMY, 1)).toBe(true);
    expect(craftTiersHeld(two, 'alchemy')).toBe(1);
  });

  it('seals a node by the better of your realm and your soul', () => {
    const c = crafter();
    const [hand2] = own(ALCHEMY, 2, 'hand');
    expect(nodeSealed(c, hand2!)).toBe(true);
    const soul = {
      ...c,
      soul: { ...c.soul, realm: 'foundation-establishment' as const, stage: 1 },
    };
    expect(nodeSealed(soul, hand2!)).toBe(false);
  });

  it('shows a craft’s tree once its craft is touched: its tool, a recipe or a node', () => {
    const s = newLife({ name: 'Han Li', seed: 'craft-trees' });
    const bare: Cultivator = { ...s.player, items: {} };
    expect(treeShown(bare, ALCHEMY)).toBe(false);
    expect(treeShown(addItem(bare, 'crude-clay-furnace', 1), ALCHEMY)).toBe(true);
    expect(treeShown(addItem(bare, 'crude-clay-furnace', 1), craftDao('refining'))).toBe(false);
  });
});

describe('the perks at the bench', () => {
  const r = recipe(QI_PILL);
  const base = learnAll(crafter(2), [ROOT]);

  it('holds more, takes fewer hours and blows up less down the Line', () => {
    const c = learnAll(base, LINE_1);
    expect(holdOdds(c, r)).toBeCloseTo(holdOdds(base, r) + 0.05, 9);
    expect(batchHours(base, r)).toBe(3);
    expect(batchHours(c, r)).toBeCloseTo(2.7, 9);
    expect(blowUpShare(c, 'alchemy')).toBeCloseTo(blowUpShare(base, 'alchemy') * 0.75, 9);
  });

  it('lifts by the Hand, and by the Fire Dao’s side path into the furnace', () => {
    const hand = learnAll(base, ['alchemy-steady-pinch']);
    expect(liftOf(hand, r, false, null)).toBeCloseTo(liftOf(base, r, false, null) + 0.1, 9);
    const fire = learnAll(base, ['fire-first-spark', 'fire-warm-hands']);
    expect(stats(fire).fireControl).toBeCloseTo(0.05, 9);
    expect(liftOf(fire, r, false, null)).toBeCloseTo(liftOf(base, r, false, null) + 0.05, 9);
  });

  it('yields 5% more a tier held, as well as the Line’s own yield', () => {
    const line = learnAll(base, [...LINE_1, TWIN]);
    const held = learnAll(line, ['alchemy-steady-pinch', 'alchemy-lid-watching']);
    // Vented Lid's +10%, then a held tier's +5%: ten pills, then eleven, then twelve (11.5).
    expect(yieldOf(base, r)).toBe(10);
    expect(yieldOf(line, r)).toBe(11);
    expect(yieldOf(held, r)).toBe(Math.round(10 * 1.15));
  });

  it('brews two batches at once at a Twin Furnace, each from its own inputs', () => {
    let c = learnAll(base, [...LINE_1, TWIN]);
    c = queueBatches(c, QI_PILL, 2).cultivator;
    const done = workBench(c, batchHours(c, r), 0, new Rng(3));
    expect(done.batches).toBe(2);
    expect(done.cultivator.crafts.recent).toHaveLength(2);
    expect(done.cultivator.crafts.bench).toEqual([]);
    expect(done.cultivator.items['old-apricot-kernel'] ?? 0).toBe(0);
  });

  it('brews one at a Twin Furnace when the Bag holds inputs for only one', () => {
    let c = learnAll(learnAll(crafter(1), [ROOT]), [...LINE_1, TWIN]);
    c = queueBatches(c, QI_PILL, 2).cultivator;
    const done = workBench(c, batchHours(c, r), 0, new Rng(3));
    expect(done.batches).toBe(1);
    expect(done.cultivator.crafts.bench).toEqual([{ recipe: QI_PILL, batches: 1 }]);
  });
});

describe('the save', () => {
  it('brings a v43 life up with the Soul and Wood nodes K2 renamed', () => {
    const s = newLife({ name: 'Han Li', seed: 'save' });
    const raw = JSON.parse(JSON.stringify(makeSave(s, 1))) as {
      version: number;
      state: { player: { nodes: string[] } };
    };
    raw.version = 43;
    raw.state.player.nodes = [...raw.state.player.nodes, 'soul-steady-flame', 'wood-green-thumb'];
    const back = loadSave(raw);
    expect(back.state.player.nodes).toContain('soul-still-flame');
    expect(back.state.player.nodes).toContain('wood-rooting-hand');
  });
});
