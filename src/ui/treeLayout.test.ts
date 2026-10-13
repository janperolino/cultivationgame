// P2.5: grafts sit beside their host tree in its tier band, never over the tree or each other.
import { describe, expect, it } from 'vitest';
import { MANUALS, type Manual, type ManualNode } from '../content/manuals.ts';
import { TREES } from '../content/trees/index.ts';
import { cluster, layout, NODE_HALF_W, OWN_COL, OWN_R, ownTree, TREE_W } from './treeLayout.ts';

/** A made-up manual: `shape` lists each node's parents by index, so [[], [0], [0]] forks. */
function fake(id: string, tier: number, shape: number[][]): Manual {
  const nodes: ManualNode[] = shape.map((parents, i) => ({
    id: `${id}-${i}`,
    name: `${id} ${i}`,
    hanzi: '',
    home: 'manual',
    manual: id,
    tier,
    kind: 'minor',
    cost: 10,
    requires: parents.map((p) => `${id}-${p}`),
    effects: [],
    text: '',
  }));
  return {
    id,
    name: `The ${id} Scripture of Far Too Long a Name`,
    pinyin: '',
    hanzi: '',
    kind: 'scripture',
    rarity: 'pristine',
    source: '',
    ladder: 'qi',
    host: 'qi',
    tier,
    nodes,
  };
}

const chain6 = fake('chain', 1, [[], [0], [1], [2], [3], [4]]);
const chain4 = fake('again', 1, [[], [0], [1], [2]]);
const fork = fake('fork', 1, [[], [0], [0], [0], [1, 2, 3]]);
const lone = fake('lone', 3, [[]]);

describe('the graft layout', () => {
  it('lays a chain down and siblings across', () => {
    const k = cluster(fork);
    const at = new Map(k.nodes.map((n) => [n.node.id, n.at]));
    expect(at.get('fork-1')!.y).toBe(at.get('fork-2')!.y);
    expect(at.get('fork-1')!.x).toBeLessThan(at.get('fork-2')!.x);
    expect(at.get('fork-4')!.y).toBeGreaterThan(at.get('fork-1')!.y);
    const ys = cluster(chain6).nodes.map((n) => n.at.y);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
    expect(new Set(cluster(chain6).nodes.map((n) => n.at.x)).size).toBe(1);
  });

  it('keeps every graft right of its tree, inside its band, and apart from the others', () => {
    for (const t of TREES) {
      const real = MANUALS.filter((m) => m.host === t.id);
      const grafts = [...real, chain6, fork, lone, chain4];
      const l = layout(t, grafts);
      const treeRight = Math.max(...t.nodes.map((n) => l.pos(n).x + NODE_HALF_W));
      expect(treeRight, t.id).toBeLessThanOrEqual(TREE_W);
      expect(l.grafts).toHaveLength(grafts.length);
      for (const g of l.grafts) {
        const bandTop = l.top[g.tier]!;
        const bandBottom = bandTop + l.bandHeight[g.tier]!;
        expect(g.bracket.x, g.manual.id).toBeGreaterThan(treeRight);
        expect(g.y).toBeGreaterThan(bandTop);
        expect(g.y + g.height, g.manual.id).toBeLessThanOrEqual(g.bracket.bottom);
        expect(g.bracket.bottom).toBeLessThan(bandBottom);
        expect(g.x + g.width).toBeLessThanOrEqual(l.width);
        for (const n of g.nodes) {
          const p = l.graftPos.get(n.node.id)!;
          expect(p.x - NODE_HALF_W, n.node.id).toBeGreaterThanOrEqual(g.x);
          expect(p.x + NODE_HALF_W, n.node.id).toBeLessThanOrEqual(g.x + g.width);
          expect(p.y).toBeLessThan(g.y + g.height);
        }
        for (const o of l.grafts) {
          if (o === g || o.tier !== g.tier) continue;
          const apart = o.x >= g.x + g.width || g.x >= o.x + o.width;
          expect(apart, `${g.manual.id} and ${o.manual.id}`).toBe(true);
        }
      }
      // A band holding only grafts opens to full height, and the tree's own nodes don't move.
      expect(l.bandHeight[3]).toBe(l.bandHeight[1]);
      const bare = layout(t);
      for (const n of t.nodes) expect(l.pos(n)).toEqual(bare.pos(n));
    }
  });
});

describe("a hostless manual's own tree", () => {
  it('lays its nodes inside its box, a chain down and a fork centred across', () => {
    for (const m of [chain6, fork, lone, chain4]) {
      const t = ownTree(m);
      for (const { at } of t.nodes) {
        expect(at.x - OWN_COL / 2).toBeGreaterThanOrEqual(0);
        expect(at.x + OWN_COL / 2).toBeLessThanOrEqual(t.width);
        expect(at.y - OWN_R).toBeGreaterThanOrEqual(0);
        expect(at.y + OWN_R).toBeLessThanOrEqual(t.height);
      }
    }
    const at = new Map(ownTree(fork).nodes.map((n) => [n.node.id, n.at]));
    expect(at.get('fork-0')!.x).toBe(at.get('fork-2')!.x);
    expect(at.get('fork-4')!.x).toBe(at.get('fork-2')!.x);
    expect(at.get('fork-1')!.y).toBe(at.get('fork-3')!.y);
    expect(at.get('fork-4')!.y).toBeGreaterThan(at.get('fork-1')!.y);
    const ys = ownTree(chain6).nodes.map((n) => n.at.y);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
  });
});
