// P2.5: manuals on the trees (design § Cultivation, Where manuals live, The placement pass). Every
// manual's host, the Arts and their waking, an Art's passives on its technique in a fight, the
// placement pass's renames and the v13 save.
import { describe, expect, it } from 'vitest';
import {
  ART_NODES,
  ART_OWN_STATS,
  artWake,
  hostFromEffects,
  MANUALS,
  manual,
  statHost,
  techniqueArt,
} from '../content/manuals.ts';
import { method } from '../content/methods.ts';
import { anyNode } from '../content/nodes.ts';
import { STAT_IDS, statInfo } from '../content/stats.ts';
import { TECHNIQUES } from '../content/techniques.ts';
import { TREES, tree } from '../content/trees/index.ts';
import { fromCultivator } from './combat/combatant.ts';
import { techniqueCost } from './combat/fight.ts';
import { graftsOn, heldManuals, holdsManual, hostlessManuals, manualCount } from './manuals.ts';
import { loadSave, makeSave, RENAMED_NODES, SAVE_VERSION } from './save/format.ts';
import { newLife, type Cultivator } from './state.ts';
import { stats } from './stats.ts';
import { addPractice, learnTechnique, mastery, masteryNeed } from './techniques.ts';
import { activeNodes, artOwn, learnNode, nodeSealed } from './trees.ts';
import { technique } from '../content/techniques.ts';

const base = newLife({ name: 'Han Li', seed: 'grafts' });
const rich = (c: Cultivator): Cultivator => ({ ...c, insight: { current: 1e5, earned: 1e5 } });
const treeIds = new Set(TREES.map((t) => t.id));

/** The cultivator knowing a technique, practiced to a mastery level. */
function practiced(c: Cultivator, id: string, level: number): Cultivator {
  const known = learnTechnique({ ...c, practicing: null }, id);
  const days = masteryNeed(technique(id), level);
  return addPractice({ ...known, practicing: id }, days).cultivator;
}

describe('hosts', () => {
  it('gives every manual a real tree or none', () => {
    for (const m of MANUALS) {
      if (m.host !== null) expect(treeIds.has(m.host), m.id).toBe(true);
    }
  });

  it('puts the five formulas where the design says', () => {
    expect(manual('garrison-breath-count').host).toBe('qi');
    expect(manual('tide-counting').host).toBe('qi');
    expect(manual('bone-wall-watch').host).toBe('qi');
    expect(manual('butcher-sinew').host).toBe('body');
    expect(manual('stone-eyes-lamp').host).toBe('soul');
  });

  it("grafts a method on its ladder's tree, in its own tier", () => {
    for (const m of MANUALS.filter((x) => x.method)) {
      const own = method(m.method!);
      expect(m.host, m.id).toBe(own.ladder);
      expect(m.tier, m.id).toBe(own.tier);
    }
  });

  it("grafts an Art beside its technique's first Dao, or under Manuals while it has no tree", () => {
    expect(techniqueArt('sinkhole-stone-fist')!.host).toBe('earth');
    expect(techniqueArt('rampart-palm')!.host).toBe('fist');
    expect(techniqueArt('rampart-collapse-palm')!.tier).toBe(2);
    // Wind is a tag with no tree yet.
    expect(techniqueArt('alley-wind-palm')!.host).toBeNull();
    for (const t of TECHNIQUES) {
      const art = techniqueArt(t.id)!;
      const first = t.daos[0];
      expect(art.host, t.id).toBe(first && treeIds.has(first) ? first : null);
    }
  });

  it("gives a generated manual its first effect's stat's tree", () => {
    const one = (stat: Parameters<typeof statHost>[0]) => [
      { effects: [{ stat, value: 0.05 }] as const },
    ];
    expect(hostFromEffects(one('qiGain'))).toBe('qi');
    expect(hostFromEffects(one('bodyGain'))).toBe('body');
    expect(hostFromEffects(one('soulGain'))).toBe('soul');
    expect(hostFromEffects(one('insightGain'))).toBe('soul');
    expect(hostFromEffects(one('firePower'))).toBe('fire');
    expect(hostFromEffects(one('swordHit'))).toBe('sword');
    expect(hostFromEffects([{ effects: [], own: [{ stat: 'spearCost', value: -0.1 }] }])).toBe(
      'spear',
    );
    // A stat no tree uses has no host; nor does a manual with no effects.
    const used = new Set(
      TREES.flatMap((t) => t.nodes.flatMap((n) => n.effects.map((e) => e.stat))),
    );
    const unused = STAT_IDS.find((s) => !used.has(s) && !/Power|Hit|Crit|Cost|Pierce$/.test(s));
    expect(unused).toBeDefined();
    expect(statHost(unused!)).toBeNull();
    expect(hostFromEffects([])).toBeNull();
  });
});

describe('Arts', () => {
  it('gives every technique an Art sized by its rarity', () => {
    for (const t of TECHNIQUES) {
      const art = techniqueArt(t.id);
      expect(art, t.id).toBeDefined();
      expect(art!.kind).toBe('art');
      expect(art!.name).toBe(t.name);
      expect(art!.rarity).toBe(t.rarity);
      expect(art!.nodes).toHaveLength(ART_NODES[t.rarity]);
      art!.nodes.forEach((n, i) => {
        expect(n.mastery, n.id).toBe(artWake(i, art!.nodes.length));
        expect(n.tier).toBe(t.tier);
        expect(n.effects.length + (n.own?.length ?? 0), n.id).toBeGreaterThan(0);
      });
    }
    expect([1, 1, 2, 3, 4, 5, 6]).toEqual(
      (['white', 'green', 'blue', 'purple', 'gold', 'red', 'pristine'] as const).map(
        (r) => ART_NODES[r],
      ),
    );
  });

  it('wakes passives at Comprehension, Mastery, Perfection and Origin, extras sharing', () => {
    const wake = (n: number) => Array.from({ length: n }, (_, i) => artWake(i, n));
    expect(wake(1)).toEqual([1]);
    expect(wake(3)).toEqual([1, 2, 3]);
    expect(wake(4)).toEqual([1, 2, 3, 4]);
    expect(wake(5)).toEqual([1, 1, 2, 3, 4]);
    expect(wake(6)).toEqual([1, 1, 2, 2, 3, 4]);
  });

  it("keeps an Art's own effects to power, cost and Accuracy, and multipliers to purple up", () => {
    for (const m of MANUALS.filter((x) => x.technique)) {
      for (const n of m.nodes) {
        for (const e of n.own ?? []) expect(ART_OWN_STATS, n.id).toContain(e.stat);
        if (['purple', 'gold', 'red', 'pristine'].includes(m.rarity)) continue;
        for (const e of [...n.effects, ...(n.own ?? [])]) {
          expect(statInfo(e.stat).unit, n.id).not.toBe('times');
        }
      }
    }
  });

  it('comes with the technique, by whatever road taught it', () => {
    const c = base.player;
    expect(holdsManual(c, 'art-sinkhole-stone-fist')).toBe(false);
    const knows = learnTechnique(c, 'sinkhole-stone-fist');
    expect(holdsManual(knows, 'art-sinkhole-stone-fist')).toBe(true);
    expect(heldManuals(knows).map((m) => m.id)).toContain('art-sinkhole-stone-fist');
    expect(graftsOn(knows, 'earth').map((m) => m.id)).toEqual(['art-sinkhole-stone-fist']);
    expect(manualCount(knows)).toBe('2 (1 method, 1 art)');
    const windy = learnTechnique(knows, 'alley-wind-palm');
    expect(hostlessManuals(windy).map((m) => m.id)).toEqual(['art-alley-wind-palm']);
  });

  it("wakes a learned passive at the technique's Comprehension, not before", () => {
    const id = 'art-rock-underfoot';
    const glimpse = learnNode(rich(practiced(base.player, 'sinkhole-stone-fist', 0)), id);
    expect(glimpse.check.ok).toBe(true);
    let c = glimpse.cultivator;
    expect(mastery(c, 'sinkhole-stone-fist').level).toBe(0);
    expect(nodeSealed(c, anyNode(id))).toBe(true);
    expect(activeNodes(c).map((n) => n.id)).not.toContain(id);
    const hp = stats(c).hp;
    // Practice to one day short of Comprehension: still asleep.
    c = addPractice(c, masteryNeed(technique('sinkhole-stone-fist'), 1) - 1).cultivator;
    expect(nodeSealed(c, anyNode(id))).toBe(true);
    c = addPractice(c, 1).cultivator;
    expect(mastery(c, 'sinkhole-stone-fist').level).toBe(1);
    expect(nodeSealed(c, anyNode(id))).toBe(false);
    expect(stats(c).hp).toBeCloseTo(hp + 0.03);
  });

  it('puts its own passives on the technique alone in a fight', () => {
    let c = rich(practiced(base.player, 'piled-bones-thrust', 1));
    c = learnTechnique(c, 'rampart-palm');
    const before = fromCultivator(c, 'a');
    c = learnNode(c, 'art-short-recovery').cultivator;
    expect(artOwn(c, 'piled-bones-thrust')).toEqual({ power: 0, cost: -0.12, hit: 0 });
    const after = fromCultivator(c, 'a');
    const thrust = technique('piled-bones-thrust');
    const palm = technique('rampart-palm');
    expect(techniqueCost(after, thrust)).toBeLessThan(techniqueCost(before, thrust));
    expect(techniqueCost(after, palm)).toBe(techniqueCost(before, palm));
    // Rampart Palm's own power sleeps until the palm reaches Comprehension.
    c = learnNode(c, 'art-shoulder-behind-palm').cultivator;
    expect(fromCultivator(c, 'a').techniques['rampart-palm']!.power).toBe(1);
    c = addPractice({ ...c, practicing: 'rampart-palm' }, 4).cultivator;
    expect(fromCultivator(c, 'a').techniques['rampart-palm']!.power).toBeCloseTo(1.08);
    // A Hit passive multiplies that technique's Accuracy alone.
    let s = rich(practiced(base.player, 'bone-splitting-cleave', 1));
    const plain = fromCultivator(s, 'a').techniques['bone-splitting-cleave']!.accuracy;
    s = learnNode(s, 'art-finding-joint').cultivator;
    expect(fromCultivator(s, 'a').techniques['bone-splitting-cleave']!.accuracy).toBeCloseTo(
      plain * 1.05,
    );
  });
});

describe('the placement pass', () => {
  const names = TREES.flatMap((t) => t.nodes.map((n) => n.name));

  it('renames the flight path and three near-duplicates', () => {
    expect(tree('qi').branches.find((b) => b.id === 'qi2-flight')!.name).toBe(
      'Cloud-Treading Breath',
    );
    expect(anyNode('qi-treading-air').name).toBe('Treading Air');
    expect(anyNode('body-ox-hands').name).toBe('Ox Hands');
    expect(anyNode('soul-unshaking-fingers').name).toBe('Unshaking Fingers');
    expect(anyNode('fist-hard-knuckle-bones').name).toBe('Hard Knuckle Bones');
    for (const old of ['Sword-Riding Breath', 'Iron Fists', 'Furnace Hands', 'Bone Hardening']) {
      expect(names).not.toContain(old);
    }
    expect(anyNode('soul-split-attention').text).toMatch(/^One more production queue/);
  });

  it('carries a node learned under its old id into v13', () => {
    const save = makeSave(base, 1);
    const old = Object.keys(RENAMED_NODES);
    const raw = JSON.parse(
      JSON.stringify({
        ...save,
        version: 12,
        state: {
          ...save.state,
          player: { ...save.state.player, nodes: ['qi-sensing-breath', ...old] },
        },
      }),
    );
    expect(SAVE_VERSION).toBe(13);
    const nodes = loadSave(raw).state.player.nodes;
    expect(nodes).toEqual(['qi-sensing-breath', ...old.map((id) => RENAMED_NODES[id])]);
    for (const id of nodes) expect(anyNode(id).id).toBe(id);
  });
});
