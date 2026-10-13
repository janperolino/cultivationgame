import { describe, expect, it } from 'vitest';
import { eventText } from './chronicle.ts';
import { FIRST_ARTS } from '../content/methods.ts';
import { STATS, statInfo, type StatId } from '../content/stats.ts';
import {
  BIG_THREE,
  branchEnd,
  DAOS,
  branchNodes,
  TIER_DEPTH,
  TIER_HALF_WIDTH,
  tierBranches,
  tierNode,
  tierNodes,
  TREE_CATEGORIES,
  TREES,
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
import { canLearn, learnNode, nodeSealed } from './trees.ts';
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

/** Everything a node grows from, near or far, in learning order. */
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
  return t.nodes.filter((b) => need.has(b.id)).map((b) => b.id);
}

/** Learns a node with everything it grows from. */
function learnWithPath(c: Cultivator, id: string): Cultivator {
  return learnAll(c, [...prerequisites(treeNode(id)), id]);
}

describe('tree content', () => {
  const all = TREES.flatMap((t) => t.nodes);

  it('has unique node and branch ids across every tree', () => {
    expect(new Set(all.map((n) => n.id)).size).toBe(all.length);
    const branches = TREES.flatMap((t) => t.branches);
    expect(new Set(branches.map((b) => b.id)).size).toBe(branches.length);
  });

  it('names every node once across every tree, so a name points at one node', () => {
    const seen = new Map<string, string>();
    for (const n of all) {
      expect(seen.get(n.name), `${n.name}: ${seen.get(n.name)} and ${n.id}`).toBeUndefined();
      seen.set(n.name, n.id);
    }
  });

  it('groups every tree under one category, the big three first', () => {
    const grouped = TREE_CATEGORIES.flatMap((k) => k.trees);
    expect(grouped.map((t) => t.id).sort()).toEqual(TREES.map((t) => t.id).sort());
    expect(TREE_CATEGORIES[0]!.trees).toEqual(BIG_THREE);
    for (const k of TREE_CATEGORIES) if (k.trees.length === 0) expect(k.opens).toBeTruthy();
  });

  for (const t of BIG_THREE) {
    for (const tier of [1, 2]) {
      describe(`the ${t.name} tree's tier ${tier}`, () => {
        // The Breath branch sits beside the tier's own count (design § Cultivation, Breath).
        const breath = new Set(
          tierBranches(t, tier)
            .filter((b) => b.breath)
            .map((b) => b.id),
        );
        const nodes = tierNodes(t, tier).filter((n) => !n.branch || !breath.has(n.branch));
        const all = tierNodes(t, tier);
        const ids = nodes.map((n) => n.id);
        const starter = tierNode(t, tier, 'starter')!;
        const capstone = tierNode(t, tier, 'capstone')!;
        const branches = tierBranches(t, tier).filter((b) => !b.breath);
        const gates = branches.filter((b) => b.gate);

        it('holds 25 to 30 nodes: one starter, one capstone and 4 or 5 branches, 2 or 3 gating', () => {
          expect(nodes.length).toBeGreaterThanOrEqual(25);
          expect(nodes.length).toBeLessThanOrEqual(30);
          expect(nodes.filter((n) => n.kind === 'starter')).toEqual([starter]);
          expect(nodes.filter((n) => n.kind === 'capstone')).toEqual([capstone]);
          expect(branches.length).toBeGreaterThanOrEqual(4);
          expect(branches.length).toBeLessThanOrEqual(5);
          expect(gates.length).toBeGreaterThanOrEqual(2);
          expect(gates.length).toBeLessThanOrEqual(3);
        });

        it('puts every minor and notable on one of its branches', () => {
          for (const n of all) {
            if (n.kind === 'starter' || n.kind === 'capstone') expect(n.branch).toBeUndefined();
            else expect(tierBranches(t, tier).map((b) => b.id)).toContain(n.branch);
          }
          for (const b of branches) expect(branchNodes(t, b.id).length).toBeGreaterThan(2);
        });

        it('ends each branch in one notable, and the gating ends alone feed the capstone', () => {
          for (const b of branches) {
            const own = branchNodes(t, b.id);
            const ends = own.filter((n) => !own.some((o) => o.requires.includes(n.id)));
            expect(ends, b.id).toHaveLength(1);
            expect(ends[0]!.kind, b.id).toBe('notable');
            // A gating end feeds the capstone and nothing else; a side path's end feeds nothing.
            const users = all.filter((n) => n.requires.includes(ends[0]!.id)).map((n) => n.id);
            expect(users, b.id).toEqual(b.gate ? [capstone.id] : []);
          }
          expect([...capstone.requires].sort()).toEqual(
            gates.map((b) => branchEnd(t, b.id)!.id).sort(),
          );
        });

        it('grows every node from the starter, so every node can be reached', () => {
          const reached = new Set([starter.id]);
          for (const n of nodes) {
            if (n === starter) continue;
            expect(n.requires.length, n.id).toBeGreaterThan(0);
            for (const r of n.requires) {
              expect(ids, `${n.id} grows from ${r}`).toContain(r);
              expect(reached.has(r), `${n.id} after ${r}`).toBe(true);
            }
            reached.add(n.id);
          }
          expect(reached.size).toBe(nodes.length);
        });

        it('opens through the capstone below, and its own capstone feeds the next starter', () => {
          const below = tierNode(t, tier - 1, 'capstone');
          expect(starter.requires).toEqual(below ? [below.id] : []);
          const next = tierNode(t, tier + 1, 'starter');
          if (next) expect(next.requires).toEqual([capstone.id]);
        });

        it('places nodes apart inside the band, each with a cost and an effect', () => {
          expect(starter.at).toEqual([0, 0]);
          expect(capstone.at).toEqual([0, TIER_DEPTH]);
          for (const n of all) {
            expect(Math.abs(n.at[0]), n.id).toBeLessThanOrEqual(TIER_HALF_WIDTH);
            expect(n.at[1], n.id).toBeGreaterThanOrEqual(0);
            expect(n.at[1], n.id).toBeLessThanOrEqual(TIER_DEPTH);
            for (const o of all) {
              if (o === n) continue;
              const d = Math.hypot(o.at[0] - n.at[0], o.at[1] - n.at[1]);
              expect(d, `${n.id} and ${o.id}`).toBeGreaterThanOrEqual(1.2);
            }
            expect(n.cost).toBeGreaterThan(0);
            expect(n.effects.length).toBeGreaterThan(0);
            for (const e of n.effects) expect(STATS).toHaveProperty(e.stat);
          }
        });

        it('has its own silhouette, not the tier below’s', () => {
          const below = new Set(tierNodes(t, tier - 1).map((n) => n.at.join(',')));
          const same = nodes.filter(
            (n) => n !== starter && n !== capstone && below.has(n.at.join(',')),
          );
          expect(same.length, same.map((n) => n.id).join(', ')).toBeLessThan(nodes.length / 4);
        });

        it('keeps multipliers to the capstone and a late notable or two', () => {
          const times = nodes.filter((n) =>
            n.effects.some((e) => statInfo(e.stat).unit === 'times'),
          );
          expect(times).toContain(capstone);
          for (const n of times) expect(['capstone', 'notable']).toContain(n.kind);
          expect(times.length).toBeLessThanOrEqual(3);
        });

        it('makes the capstone cost most of the tier but not all, so side paths are a choice', () => {
          const total = nodes.reduce((sum, n) => sum + n.cost, 0);
          const path = prerequisites(capstone).filter((id) => ids.includes(id));
          const toCapstone = path.reduce((sum, id) => sum + treeNode(id).cost, capstone.cost);
          expect(toCapstone / total).toBeGreaterThan(0.5);
          expect(toCapstone / total).toBeLessThan(0.75);
        });
      });
    }
  }

  it('gives the Qi tree a Breath branch on tier 1: six cheap nodes that pay only while you attend', () => {
    const qi = tree('qi');
    const breath = tierBranches(qi, 1).filter((b) => b.breath);
    expect(breath).toHaveLength(1);
    const own = branchNodes(qi, breath[0]!.id);
    expect(own).toHaveLength(6);
    expect(own[0]!.requires).toEqual([tierNode(qi, 1, 'starter')!.id]);
    const attending = ['breathReach', 'focusDrain', 'focusCeiling', 'twinBreath', 'heatLimit'];
    for (const n of own) {
      expect(n.cost, n.id).toBeLessThanOrEqual(100);
      for (const e of n.effects) expect([...attending, 'stillPool'], n.id).toContain(e.stat);
    }
    // Only the Qi tree carries one, and no other tree's branch is a Breath branch.
    for (const t of TREES) if (t.id !== 'qi') expect(t.branches.some((b) => b.breath)).toBe(false);
  });

  describe('the combat Daos', () => {
    it('are the nine of v1, each a tree on the qi ladder', () => {
      expect(DAOS.map((t) => t.id)).toEqual([
        'fire',
        'water',
        'wood',
        'metal',
        'earth',
        'sword',
        'saber',
        'spear',
        'fist',
      ]);
      for (const t of DAOS) expect(t.dao).toBe(t.id);
      for (const t of BIG_THREE) expect(t.dao).toBeUndefined();
    });

    for (const t of DAOS) {
      for (const tier of [1, 2]) {
        it(`${t.name} tier ${tier}: three gating branches, ${tier} side path${tier > 1 ? 's' : ''}, 12 to 18 nodes`, () => {
          const nodes = tierNodes(t, tier);
          const branches = tierBranches(t, tier);
          const gates = branches.filter((b) => b.gate);
          const sides = branches.filter((b) => !b.gate);
          const capstone = tierNode(t, tier, 'capstone')!;
          expect(nodes.length).toBeGreaterThanOrEqual(tier === 1 ? 12 : 15);
          expect(nodes.length).toBeLessThanOrEqual(18);
          expect(gates).toHaveLength(3);
          expect(sides).toHaveLength(tier);
          for (const b of gates) {
            const own = branchNodes(t, b.id);
            expect(own, b.id).toHaveLength(tier + 2);
            expect(own.at(-1)!.kind).toBe('notable');
            expect(own.slice(0, -1).every((n) => n.kind === 'minor')).toBe(true);
          }
          for (const b of sides) {
            const own = branchNodes(t, b.id);
            expect(own.length).toBeGreaterThanOrEqual(2);
            expect(own.length).toBeLessThanOrEqual(3);
            expect(nodes.some((n) => n.requires.includes(own.at(-1)!.id))).toBe(false);
          }
          expect([...capstone.requires].sort()).toEqual(
            gates.map((b) => branchEnd(t, b.id)!.id).sort(),
          );
          const below = tierNode(t, tier - 1, 'capstone');
          expect(tierNode(t, tier, 'starter')!.requires).toEqual(below ? [below.id] : []);
        });

        it(`${t.name} tier ${tier}: nodes apart inside the band, each with a real effect`, () => {
          const all = tierNodes(t, tier);
          for (const n of all) {
            expect(Math.abs(n.at[0]), n.id).toBeLessThanOrEqual(TIER_HALF_WIDTH);
            expect(n.at[1]).toBeGreaterThanOrEqual(0);
            expect(n.at[1]).toBeLessThanOrEqual(TIER_DEPTH);
            for (const o of all) {
              if (o === n) continue;
              const d = Math.hypot(o.at[0] - n.at[0], o.at[1] - n.at[1]);
              expect(d, `${n.id} and ${o.id}`).toBeGreaterThanOrEqual(1.2);
            }
            expect(n.effects.length, n.id).toBeGreaterThan(0);
            for (const e of n.effects) expect(STATS, n.id).toHaveProperty(e.stat);
          }
        });
      }
    }
  });

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
          if (statInfo(id).unit === 'times') {
            expect((1 + after[id]) / (1 + before[id]), `${n.id} ${id}`).toBeCloseTo(
              1 + (claimed[id] ?? 0),
              9,
            );
          } else {
            expect(after[id] - before[id], `${n.id} ${id}`).toBeCloseTo(claimed[id] ?? 0, 9);
          }
        }
      }
    }
  });

  it('multiplies the ledger’s multipliers instead of adding them', () => {
    const c = learnWithPath(cultivator(), 'qi-ninefold-circulation');
    // Needle-Fine Qi ×1.03, then the capstone ×1.1.
    expect(stats(c).harm).toBeCloseTo(1.03 * 1.1 - 1);
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
      reason: 'Learn Fine Qi first.',
    });
    expect(canLearn(cultivator(), 'qi-ninefold-circulation')).toMatchObject({
      ok: false,
      reason: 'Learn Meridians Like Rivers, A Sea Without Shore and Needle-Fine Qi first.',
    });
    expect(canLearn(cultivator(), 'qi-foundation-circulation')).toMatchObject({
      ok: false,
      reason: 'Learn Ninefold Circulation first.',
    });
    const learned = learnAll(cultivator(), ['qi-sensing-breath']);
    expect(canLearn(learned, 'qi-sensing-breath')).toMatchObject({ reason: 'Already learned.' });
  });

  it('opens the next tier through the capstone, never by owning nodes alone', () => {
    const qi = tree('qi');
    const allButCapstone = tierNodes(qi, 1)
      .filter((n) => n.kind !== 'capstone')
      .map((n) => n.id);
    let c = learnAll(cultivator(), allButCapstone);
    expect(canLearn(c, 'qi-foundation-circulation').ok).toBe(false);
    c = learnAll(c, ['qi-ninefold-circulation']);
    expect(canLearn(c, 'qi-foundation-circulation').ok).toBe(true);
  });

  it('opens the capstone with the gating branches alone, leaving the side paths free', () => {
    const c = learnWithPath(cultivator(), 'qi-ninefold-circulation');
    expect(c.nodes).not.toContain('qi-stone-swallowing');
    expect(c.nodes).not.toContain('qi-light-seals');
  });
});

describe('node effects in the rules', () => {
  const qc = () => cultivator({ realm: 'qi-condensation' });
  const tutorialFree = (c: Cultivator) => ({ ...c, qi: { ...c.qi, stage: 5 } });

  it('Smooth Meridians speeds qi by 2%', () => {
    const c = tutorialFree(learnAll(qc(), ['qi-sensing-breath']));
    const after = learnAll(c, ['qi-smooth-meridians']);
    expect(qiSpeed(after).total / qiSpeed(c).total).toBeCloseTo(1.04 / 1.02);
    expect(dayRates(after, DAY).qi / dayRates(c, DAY).qi).toBeCloseTo(1.04 / 1.02);
  });

  it('Stone Swallowing draws 5% more qi from each stone', () => {
    const c = tutorialFree(learnAll(qc(), ['qi-sensing-breath']));
    const after = learnAll(c, ['qi-stone-swallowing']);
    expect(dayRates(after, DAY).qiPerStone / dayRates(c, DAY).qiPerStone).toBeCloseTo(1.05);
  });

  it('Patient Gate adds a point to minor odds', () => {
    const c = learnAll(qc(), ['qi-sensing-breath', 'qi-stone-swallowing']);
    const full = { ...c, qi: { ...c.qi, stage: 4, bar: 1e6 } };
    const capped = { ...full, qi: { ...full.qi, bar: 260 } };
    const after = learnAll(capped, ['qi-patient-gate']);
    expect(minorOdds(after, 'qi') - minorOdds(capped, 'qi')).toBeCloseTo(0.01);
  });

  it('Marrow Cleansing adds two years of lifespan', () => {
    const c = learnWithPath(qc(), 'body-ash-tongue');
    expect(lifespanYears(learnAll(c, ['body-marrow-cleansing'])) - lifespanYears(c)).toBe(2);
  });

  it('Keen Comprehension adds a point of Aptitude, 5% on every seclusion day', () => {
    const c = learnWithPath(qc(), 'soul-dream-recollection');
    const after = learnAll(c, ['soul-keen-comprehension']);
    expect(aptitudeMultiplier(after) - aptitudeMultiplier(c)).toBeCloseTo(0.05);
    expect(dayRates(after, DAY).body / dayRates(c, DAY).body).toBeCloseTo(1.05 / 1.0);
  });

  it('Clear Mind and Quick Study raise insight and practice', () => {
    const c = learnAll(qc(), ['soul-inner-lamp']);
    expect(
      dayRates(learnAll(c, ['soul-clear-mind']), DAY).insight / dayRates(c, DAY).insight,
    ).toBeCloseTo(1.02);
    const read = learnWithPath(qc(), 'soul-night-reading');
    expect(
      dayRates(learnAll(read, ['soul-quick-study']), DAY).practice / dayRates(read, DAY).practice,
    ).toBeCloseTo(1.04);
  });

  it('Hardy Frame shortens unsettled qi, and Ninefold Circulation saves a tenth of the loss', () => {
    const plain = { ...qc(), qi: { ...qc().qi, stage: 2, bar: 100 } };
    const hardy = learnWithPath(plain, 'body-hardy-frame');
    const ninefold = learnWithPath(plain, 'qi-ninefold-circulation');
    const fail = (c: Cultivator) =>
      Array.from({ length: 50 }, (_, i) =>
        attemptBreakthrough(c, 'qi', { day: DAY, rng: new Rng(i) }),
      ).find((r) => !r.success)!.cultivator;
    expect(fail(plain).qi.unsettledUntil - DAY).toBeCloseTo(5);
    expect(fail(hardy).qi.unsettledUntil - DAY).toBeCloseTo(4.6);
    expect(barFill(fail(plain).qi)).toBeCloseTo(0.8);
    expect(barFill(fail(ninefold).qi)).toBeCloseTo(0.82);
  });
});

describe('sealed nodes', () => {
  it('can be learned above your level but do nothing until you grow into them', () => {
    const tier1 = tierNodes(tree('qi'), 1).map((n) => n.id);
    let c = learnAll(cultivator({ realm: 'qi-condensation' }), tier1);
    const before = stats(c);
    c = learnAll(c, ['qi-foundation-circulation']);
    expect(nodeSealed(c, treeNode('qi-foundation-circulation'))).toBe(true);
    expect(stats(c).qiGain).toBe(before.qiGain);
    // The day qi reaches Foundation, the node wakes.
    const grown = { ...c, qi: { ...c.qi, realm: 'foundation-establishment' as const, stage: 1 } };
    expect(nodeSealed(grown, treeNode('qi-foundation-circulation'))).toBe(false);
    expect(stats(grown).qiGain - before.qiGain).toBeCloseTo(0.02);
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
    expect(checkScreens(rich).chronicle.at(-1)?.type).toBe('screen');
  });

  it('learns a node into the chronicle, and its effect shows in the next day', () => {
    const s = withPlayer(base, { ...base.player, insight: { current: 50, earned: 50 } });
    const r = learn(s, 'qi-sensing-breath');
    expect(r.check.ok).toBe(true);
    expect(r.state.player.nodes).toEqual(['qi-sensing-breath']);
    expect(eventText(r.state, r.state.chronicle.at(-1)!)).toContain('Sensing the Breath');
    const day = (x: typeof s) => advance(x, 10_000, { step: cultivate }).state.player.qi.bar;
    expect(day(r.state) / day(s)).toBeCloseTo(1.02);
  });
});
