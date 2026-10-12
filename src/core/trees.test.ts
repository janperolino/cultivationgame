import { describe, expect, it } from 'vitest';
import { FIRST_ARTS } from '../content/methods.ts';
import { STATS, type StatId } from '../content/stats.ts';
import {
  TIER_COLS,
  TIER_ROWS,
  TREES,
  tierNodes,
  tree,
  treeNode,
  type TreeNode,
} from '../content/trees/index.ts';
import {
  aptitudeMultiplier,
  attemptBreakthrough,
  barFill,
  dayRates,
  minorOdds,
  qiSpeed,
} from './cultivation.ts';
import { checkScreens, cultivate, learn } from './life.ts';
import { advance } from './loop.ts';
import { learnMethod } from './methods.ts';
import { Rng } from './rng.ts';
import { lifespanYears, newLife, withPlayer, type Cultivator } from './state.ts';
import { stats } from './stats.ts';
import { canLearn, learnNode, nodeSealed, tierHeld } from './trees.ts';
import { openHours } from './wheel.ts';

const base = newLife({ name: 'Han Li', seed: 'trees', techniques: ['rampart-palm'] });
const DAY = base.calendar.day;

/**
 * Both first arts in hand and every kind of hour on the wheel, rich in insight, and every ladder at
 * Foundation unless asked otherwise.
 */
function cultivator(opts: { realm?: Cultivator['qi']['realm'] } = {}): Cultivator {
  const c = learnMethod(learnMethod(base.player, FIRST_ARTS.body), FIRST_ARTS.soul);
  const realm = opts.realm ?? 'foundation-establishment';
  return openHours({
    ...c,
    qi: { ...c.qi, realm, stage: 2 },
    body: { ...c.body, realm, stage: 2 },
    soul: { ...c.soul, realm, stage: 2 },
    insight: { current: 1e6, earned: 1e6 },
  }).cultivator;
}

/** Learns each listed node in order, failing the test if any can't be learned. */
function learnAll(c: Cultivator, ids: readonly string[]): Cultivator {
  return ids.reduce((acc, id) => {
    const r = learnNode(acc, id);
    expect(r.check, id).toEqual({ ok: true });
    return r.cultivator;
  }, c);
}

/** A node's requirements, in learning order: every lower tier, and the chain it grows from. */
function prerequisites(n: TreeNode): string[] {
  const t = TREES.find((x) => x.nodes.includes(n))!;
  const need = new Set<string>();
  const walk = (id: string) => {
    for (const r of treeNode(id).requires) {
      if (need.has(r)) continue;
      need.add(r);
      walk(r);
    }
  };
  walk(n.id);
  return t.nodes.filter((b) => b.tier < n.tier || need.has(b.id)).map((b) => b.id);
}

describe('tree content', () => {
  const all = TREES.flatMap((t) => t.nodes);

  it('has unique node ids across every tree', () => {
    expect(new Set(all.map((n) => n.id)).size).toBe(all.length);
  });

  for (const t of TREES) {
    for (const tier of [1, 2]) {
      it(`gives the ${t.name} tree's tier ${tier} 8 to 12 nodes, one starter and one capstone`, () => {
        const nodes = tierNodes(t, tier);
        expect(nodes.length).toBeGreaterThanOrEqual(8);
        expect(nodes.length).toBeLessThanOrEqual(12);
        expect(nodes.filter((n) => n.kind === 'starter')).toHaveLength(1);
        expect(nodes.filter((n) => n.kind === 'capstone')).toHaveLength(1);
        const cells = nodes.map((n) => `${n.at[0]},${n.at[1]}`);
        expect(new Set(cells).size).toBe(nodes.length);
        for (const n of nodes) {
          expect(n.at[0]).toBeLessThan(TIER_COLS);
          expect(n.at[1]).toBeLessThan(TIER_ROWS);
          expect(n.cost).toBeGreaterThan(0);
          expect(n.effects.length).toBeGreaterThan(0);
          for (const e of n.effects) expect(STATS).toHaveProperty(e.stat);
          // A starter grows from the tier below; every other node from nodes in its own tier.
          if (n.kind === 'starter') expect(n.requires).toEqual([]);
          else expect(n.requires.length).toBeGreaterThan(0);
          for (const r of n.requires) expect(nodes.map((x) => x.id)).toContain(r);
        }
      });
    }
  }

  it('lists each node after the nodes it grows from, so a tree can be bought in order', () => {
    for (const t of TREES) {
      const seen = new Set<string>();
      for (const n of t.nodes) {
        for (const r of n.requires) expect(seen.has(r), `${n.id} needs ${r}`).toBe(true);
        seen.add(n.id);
      }
    }
  });
});

describe('buying nodes', () => {
  it('changes exactly the numbers each node claims', () => {
    for (const t of TREES) {
      let c = cultivator();
      for (const n of t.nodes) {
        const before = stats(c);
        c = learnAll(c, [n.id]);
        const after = stats(c);
        const claimed: Partial<Record<StatId, number>> = {};
        for (const e of n.effects) claimed[e.stat] = (claimed[e.stat] ?? 0) + e.value;
        for (const id of Object.keys(STATS) as StatId[]) {
          expect(after[id] - before[id], `${n.id} ${id}`).toBeCloseTo(claimed[id] ?? 0, 9);
        }
      }
    }
  });

  it('spends insight but not insight ever earned, so breakthroughs never wait on it', () => {
    const c = { ...cultivator({ realm: 'qi-condensation' }), insight: { current: 30, earned: 30 } };
    const r = learnNode(c, 'qi-sensing-breath');
    expect(r.cultivator.insight).toEqual({ current: 20, earned: 30 });
  });

  it('says why a node cannot be learned', () => {
    const c = { ...cultivator(), insight: { current: 5, earned: 5 } };
    expect(canLearn(c, 'qi-sensing-breath')).toEqual({ ok: false, reason: 'Needs 10 insight.' });
    expect(canLearn(cultivator(), 'qi-pure-strand')).toMatchObject({
      ok: false,
      reason: 'Learn Smooth Meridians first.',
    });
    expect(canLearn(cultivator(), 'qi-foundation-circulation')).toMatchObject({
      ok: false,
      reason: 'Hold tier 1 first: learn 5 of its nodes.',
    });
    const learned = learnAll(cultivator(), ['qi-sensing-breath']);
    expect(canLearn(learned, 'qi-sensing-breath')).toMatchObject({ reason: 'Already learned.' });
  });

  it('holds a tier at half its nodes, which opens the next tier', () => {
    const qi = tree('qi');
    let c = learnAll(cultivator(), prerequisites(treeNode('qi-pure-strand')));
    c = learnAll(c, ['qi-pure-strand', 'qi-stone-swallowing']);
    expect(c.nodes).toHaveLength(4);
    expect(tierHeld(c, qi, 1)).toBe(false);
    c = learnAll(c, ['qi-deep-dantian']);
    expect(tierHeld(c, qi, 1)).toBe(true);
    expect(canLearn(c, 'qi-foundation-circulation').ok).toBe(true);
  });
});

describe('node effects in the rules', () => {
  const qc = () => cultivator({ realm: 'qi-condensation' });
  const tutorialFree = (c: Cultivator) => ({ ...c, qi: { ...c.qi, stage: 5 } });

  it('Smooth Meridians speeds qi by 5%', () => {
    const c = tutorialFree(learnAll(qc(), ['qi-sensing-breath']));
    const after = learnAll(c, ['qi-smooth-meridians']);
    expect(qiSpeed(after).total / qiSpeed(c).total).toBeCloseTo(1.09 / 1.04);
    expect(dayRates(after, DAY).qi / dayRates(c, DAY).qi).toBeCloseTo(1.09 / 1.04);
  });

  it('Stone Swallowing draws 15% more qi from each stone', () => {
    const c = tutorialFree(learnAll(qc(), ['qi-sensing-breath']));
    const after = learnAll(c, ['qi-stone-swallowing']);
    expect(dayRates(after, DAY).qiPerStone / dayRates(c, DAY).qiPerStone).toBeCloseTo(1.15);
  });

  it('Patient Gate adds 3 points to minor odds', () => {
    const c = learnAll(qc(), ['qi-sensing-breath', 'qi-stone-swallowing']);
    const full = { ...c, qi: { ...c.qi, stage: 4, bar: 1e6 } };
    const capped = { ...full, qi: { ...full.qi, bar: 260 } };
    const after = learnAll(capped, ['qi-patient-gate']);
    expect(minorOdds(after, 'qi') - minorOdds(capped, 'qi')).toBeCloseTo(0.03);
  });

  it('Marrow Cleansing adds three years of lifespan', () => {
    const c = learnAll(qc(), ['body-tempered-skin', 'body-ox-stamina']);
    expect(lifespanYears(learnAll(c, ['body-marrow-cleansing'])) - lifespanYears(c)).toBe(3);
  });

  it('Keen Comprehension adds a point of Aptitude, 5% on every seclusion day', () => {
    const c = learnAll(qc(), ['soul-inner-lamp', 'soul-quick-study']);
    const after = learnAll(c, ['soul-keen-comprehension']);
    expect(aptitudeMultiplier(after) - aptitudeMultiplier(c)).toBeCloseTo(0.05);
    expect(dayRates(after, DAY).body / dayRates(c, DAY).body).toBeCloseTo(1.05 / 1.0);
  });

  it('Clear Mind and Quick Study raise insight and practice', () => {
    const c = learnAll(qc(), ['soul-inner-lamp']);
    expect(
      dayRates(learnAll(c, ['soul-clear-mind']), DAY).insight / dayRates(c, DAY).insight,
    ).toBeCloseTo(1.06);
    expect(
      dayRates(learnAll(c, ['soul-quick-study']), DAY).practice / dayRates(c, DAY).practice,
    ).toBeCloseTo(1.1);
  });

  it('Hardy Frame shortens unsettled qi, and Ninefold Circulation saves a quarter of the loss', () => {
    const plain = { ...qc(), qi: { ...qc().qi, stage: 2, bar: 100 } };
    const hardy = learnAll(plain, [
      'body-tempered-skin',
      'body-blood-circulation',
      'body-hardy-frame',
    ]);
    const qiPath = prerequisites(treeNode('qi-ninefold-circulation'));
    const ninefold = learnAll(plain, [...qiPath, 'qi-ninefold-circulation']);
    const fail = (c: Cultivator) =>
      Array.from({ length: 50 }, (_, i) =>
        attemptBreakthrough(c, 'qi', { day: DAY, rng: new Rng(i) }),
      ).find((r) => !r.success)!.cultivator;
    expect(fail(plain).qi.unsettledUntil - DAY).toBeCloseTo(5);
    expect(fail(hardy).qi.unsettledUntil - DAY).toBeCloseTo(4);
    expect(barFill(fail(plain).qi)).toBeCloseTo(0.8);
    expect(barFill(fail(ninefold).qi)).toBeCloseTo(0.85);
  });
});

describe('sealed nodes', () => {
  it('can be learned above your level but do nothing until you grow into them', () => {
    const qi = tree('qi');
    const tier1 = tierNodes(qi, 1).map((n) => n.id);
    let c = learnAll(cultivator({ realm: 'qi-condensation' }), tier1);
    const before = stats(c);
    c = learnAll(c, ['qi-foundation-circulation']);
    expect(nodeSealed(c, treeNode('qi-foundation-circulation'))).toBe(true);
    expect(stats(c).qiGain).toBe(before.qiGain);
    // The day qi reaches Foundation, the node wakes.
    const grown = { ...c, qi: { ...c.qi, realm: 'foundation-establishment' as const, stage: 1 } };
    expect(nodeSealed(grown, treeNode('qi-foundation-circulation'))).toBe(false);
    expect(stats(grown).qiGain - before.qiGain).toBeCloseTo(0.04);
  });

  it('check their own tree’s ladder: a Body node waits on the body, not on qi', () => {
    const body = tierNodes(tree('body'), 1).map((n) => n.id);
    const c = learnAll(cultivator({ realm: 'qi-condensation' }), [
      ...body,
      'body-foundation-flesh',
    ]);
    const qiAhead = { ...c, qi: { ...c.qi, realm: 'foundation-establishment' as const } };
    expect(nodeSealed(qiAhead, treeNode('body-foundation-flesh'))).toBe(true);
    const bodyAhead = { ...c, body: { ...c.body, realm: 'foundation-establishment' as const } };
    expect(nodeSealed(bodyAhead, treeNode('body-foundation-flesh'))).toBe(false);
  });
});

describe('trees in the game', () => {
  it('opens the Trees screen once there is insight for a first node', () => {
    const s = withPlayer(base, { ...base.player, insight: { current: 9, earned: 9 } });
    expect(checkScreens(s).unlocks).not.toContain('trees');
    const rich = withPlayer(base, { ...base.player, insight: { current: 10, earned: 10 } });
    expect(checkScreens(rich).unlocks).toContain('trees');
    expect(checkScreens(rich).chronicle.at(-1)?.kind).toBe('unlock');
  });

  it('learns a node into the chronicle, and its effect shows in the next day', () => {
    const s = withPlayer(base, { ...base.player, insight: { current: 50, earned: 50 } });
    const r = learn(s, 'qi-sensing-breath');
    expect(r.check.ok).toBe(true);
    expect(r.state.player.nodes).toEqual(['qi-sensing-breath']);
    expect(r.state.chronicle.at(-1)?.text).toContain('Sensing the Breath');
    const day = (x: typeof s) => advance(x, 10_000, { step: cultivate }).state.player.qi.bar;
    expect(day(r.state) / day(s)).toBeCloseTo(1.04);
  });
});
