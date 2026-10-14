// P2.7: every tree is an opening fan, each node inside its band, labels clear along a spoke, and
// the manuals' jewels in each band's crown in rarity order, rows stepping the bands above out.
import { describe, expect, it } from 'vitest';
import { MANUALS, type Manual, type ManualNode } from '../content/manuals.ts';
import type { RarityId } from '../content/rarity.ts';
import { madeUpManuals } from '../core/madeUpManuals.ts';
import { TIER_COUNT, TREES } from '../content/trees/index.ts';
import {
  bloom,
  BLOOM_DISC,
  crown,
  crownSpan,
  fan,
  halfOpening,
  JEWEL,
  nameBox,
  OWN_LABEL_W,
  ownFan,
  placeTip,
  TIP_W,
  PEAK_GAP,
  type CrownItem,
  type Rect,
} from './treeLayout.ts';

/** A made-up manual: `shape` lists each node's parents by index, so [[], [0], [0]] forks. */
function fake(id: string, tier: number, shape: number[][], tiers: number[] = []): Manual {
  const nodes: ManualNode[] = shape.map((parents, i) => ({
    id: `${id}-${i}`,
    name: `${id} ${i}`,
    hanzi: '',
    home: 'manual',
    manual: id,
    tier: tiers[i] ?? tier,
    kind: 'minor',
    cost: 10,
    requires: parents.map((p) => `${id}-${p}`),
    effects: [],
    text: '',
  }));
  return {
    id,
    name: `The ${id} Scripture`,
    pinyin: '',
    hanzi: '',
    kind: 'scripture',
    rarity: 'gold',
    source: '',
    ladder: 'qi',
    host: null,
    tier,
    nodes,
  };
}

const whites = (n: number, tier = 1): CrownItem[] =>
  Array.from({ length: n }, (_, i) => ({ id: `w${i}`, tier, rarity: 'white' as RarityId }));

const inside = (a: Rect, b: Rect) =>
  a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
const hits = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('the opening fan', () => {
  it('opens each band wider, from 150° at Qi Condensation to 250° at the top', () => {
    expect(halfOpening(1) * 2).toBe(150);
    expect(halfOpening(TIER_COUNT) * 2).toBe(250);
  });

  it('puts every node inside its band and its opening, and everything inside the world', () => {
    for (const t of TREES) {
      const grafts = MANUALS.filter((m) => m.host === t.id);
      const f = fan(t, grafts);
      const world = { x: 0, y: 0, w: f.width, h: f.height };
      expect(f.bands).toHaveLength(TIER_COUNT);
      for (const p of f.nodes.values()) {
        const b = f.bands[p.node.tier - 1]!;
        expect(p.r, p.node.id).toBeGreaterThanOrEqual(b.inner);
        expect(p.r, p.node.id).toBeLessThan(b.rim);
        expect(Math.abs(p.angle), p.node.id).toBeLessThanOrEqual(b.half * 0.9 + 1e-9);
        expect(inside(p.label, world), p.node.id).toBe(true);
      }
      for (const b of f.bands) {
        expect(b.outer).toBeGreaterThan(b.rim);
        if (b.tier > 1) expect(b.ring).toBeGreaterThan(f.bands[b.tier - 2]!.outer);
        expect(inside(nameBox(b), world), `${t.id} band ${b.tier}`).toBe(true);
      }
      for (const j of f.jewels.values()) {
        expect(inside({ x: j.x - JEWEL / 2, y: j.y - JEWEL / 2, w: JEWEL, h: JEWEL }, world)).toBe(
          true,
        );
      }
      // Every edge joins two placed nodes.
      for (const e of f.edges) expect(f.nodes.has(e.from) && f.nodes.has(e.to)).toBe(true);
    }
  });

  it('keeps labels clear of each other along a spoke', () => {
    for (const t of TREES) {
      const ps = [...fan(t).nodes.values()];
      for (const a of ps) {
        for (const b of ps) {
          if (a === b || Math.abs(a.angle - b.angle) >= 1) continue;
          expect(hits(a.label, b.label), `${a.node.id} and ${b.node.id}`).toBe(false);
        }
      }
    }
  });

  it("keeps a tree's own nodes where they are when manuals are grafted on a far band", () => {
    const t = TREES[0]!;
    const bare = fan(t);
    const grafted = fan(
      t,
      Array.from({ length: 90 }, (_, i) => ({
        ...fake(`far${i}`, 3, [[]]),
        rarity: 'white' as const,
      })),
    );
    for (const n of t.nodes) {
      const a = bare.nodes.get(n.id)!;
      const b = grafted.nodes.get(n.id)!;
      expect(b.r).toBe(a.r);
      expect(b.angle).toBe(a.angle);
    }
  });
});

describe('the crown', () => {
  it('sits 80 whites on Qi Condensation in two rows, and steps the bands above out', () => {
    const { rows, jewels } = crown(whites(80));
    expect(rows[1]).toBe(2);
    expect(rows.slice(2)).toEqual(Array(TIER_COUNT - 1).fill(1));
    expect(new Set([...jewels.values()].map((j) => j.row))).toEqual(new Set([0, 1]));
    // The inner row fills first.
    const inner = [...jewels.values()].filter((j) => j.row === 0).length;
    expect(crown(whites(inner)).rows[1]).toBe(1);

    const t = TREES[0]!;
    const one = fan(t, []);
    const two = fan(
      t,
      whites(80).map((w) => ({ ...fake(w.id, 1, [[]]), rarity: 'white' as const })),
    );
    expect(two.bands[0]!.rows).toBe(2);
    for (let tier = 2; tier <= TIER_COUNT; tier++) {
      expect(two.bands[tier - 1]!.ring - one.bands[tier - 1]!.ring).toBe(46);
    }
  });

  it('keeps every slot in its crown and clear of the peak, the jewels apart', () => {
    const { jewels } = crown(whites(80));
    const all = [...jewels.values()];
    for (const j of all) {
      expect(Math.abs(j.angle)).toBeLessThanOrEqual(crownSpan(1));
      expect(Math.abs(j.angle)).toBeGreaterThan(PEAK_GAP);
    }
    for (const a of all) {
      for (const b of all) {
        if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(JEWEL);
      }
    }
  });

  it('puts the rarest right of the peak, the next left, and so on outward', () => {
    const items: CrownItem[] = [
      { id: 'w', tier: 1, rarity: 'white' },
      { id: 'b', tier: 1, rarity: 'blue' },
      { id: 'g', tier: 1, rarity: 'gold' },
    ];
    const j = crown(items).jewels;
    expect(j.get('g')!.angle).toBeGreaterThan(0);
    expect(j.get('b')!.angle).toBeLessThan(0);
    expect(j.get('w')!.angle).toBeGreaterThan(j.get('g')!.angle);
    expect(Math.abs(j.get('g')!.angle)).toBeCloseTo(Math.abs(j.get('b')!.angle));
  });

  it('lands a later white at the end without moving the rest, and a later gold by the peak', () => {
    const before = crown(whites(20)).jewels;
    const more = crown([...whites(20), { id: 'late', tier: 1, rarity: 'white' }]).jewels;
    for (const [id, j] of before) expect(more.get(id)).toEqual(j);
    const late = more.get('late')!;
    expect(Math.abs(late.angle)).toBeGreaterThan(
      Math.max(...[...before.values()].map((j) => Math.abs(j.angle))) - 1e-9,
    );

    const gold = crown([...whites(20), { id: 'gold', tier: 1, rarity: 'gold' }]).jewels;
    const first = Math.min(...[...before.values()].map((j) => Math.abs(j.angle)));
    expect(gold.get('gold')!.angle).toBeCloseTo(first);
    expect(gold.get('gold')!.angle).toBeGreaterThan(0);
    // The whites keep their order, each one slot further out.
    expect(gold.get('w0')).toEqual({ ...before.get('w1')!, id: 'w0' });
  });

  it("sets a line's next chapter on its first chapter's angle, one band up, the slots round it", () => {
    const items: CrownItem[] = [
      ...whites(5),
      { id: 'garrison-1', tier: 1, rarity: 'white', line: 'method:garrison-standard' },
      { id: 'other-2', tier: 2, rarity: 'gold' },
      { id: 'garrison-2', tier: 2, rarity: 'white', line: 'method:garrison-standard' },
      ...whites(6, 2).map((w) => ({ ...w, id: `${w.id}-t2` })),
    ];
    const j = crown(items).jewels;
    const one = j.get('garrison-1')!;
    const two = j.get('garrison-2')!;
    expect(two.tier).toBe(2);
    expect(two.angle).toBe(one.angle);
    expect(two.r).toBeGreaterThan(one.r);
    for (const x of j.values()) {
      if (x.tier !== 2 || x === two) continue;
      expect(Math.hypot(x.x - two.x, x.y - two.y), x.id).toBeGreaterThanOrEqual(JEWEL);
    }
  });
});

describe('a bloom', () => {
  it('lays one node at the top, two at ±45°, three at −60°, 0° and +60°, inside its disc', () => {
    const top = bloom(fake('one', 1, [[]])).nodes;
    expect(top[0]!.x).toBeCloseTo(0);
    expect(top[0]!.y).toBeLessThan(0);
    const two = bloom(fake('two', 1, [[], [0]])).nodes;
    expect(two[0]!.out).toBe(-135);
    expect(two[1]!.out).toBe(-45);
    const three = bloom(fake('three', 1, [[], [0], [1]])).nodes;
    expect(three.map((n) => n.out)).toEqual([-150, -90, -30]);
    for (const shape of [[[]], [[], [0], [1], [2], [3], [4]], [[], [0], [0], [0], [1, 2, 3]]]) {
      for (const p of bloom(fake('x', 1, shape)).nodes) {
        expect(Math.hypot(p.x, p.y)).toBeLessThan(BLOOM_DISC / 2);
        expect(p.y).toBeLessThan(0);
      }
    }
  });

  it('sets a fork as two arcs from one node: the parent between its children', () => {
    const at = new Map(bloom(fake('fork', 1, [[], [0], [0]])).nodes.map((n) => [n.node.id, n.out]));
    expect(at.get('fork-1')!).toBeLessThan(at.get('fork-0')!);
    expect(at.get('fork-2')!).toBeGreaterThan(at.get('fork-0')!);
  });
});

describe("a node's card", () => {
  it('sits right of the node, else left, else under it, inside the area', () => {
    const area = { w: 800, h: 600 };
    expect(placeTip({ x: 100, y: 200 }, 10, area).left).toBeGreaterThan(100);
    expect(placeTip({ x: 700, y: 200 }, 10, area).left).toBeLessThan(700 - TIP_W);
    const phone = placeTip({ x: 150, y: 100 }, 10, { w: 307, h: 550 });
    expect(phone.top).toBeGreaterThan(100);
    expect(phone.left).toBeGreaterThanOrEqual(8);
    expect(phone.left + phone.width).toBeLessThanOrEqual(307 - 8);
  });
});

describe("a hostless manual's own fan", () => {
  it('opens upward from its first node, tier 1 innermost, every node inside its box', () => {
    const m = fake('two-tier', 1, [[], [0], [0], [1], [2, 3], [4]], [1, 1, 1, 2, 2, 2]);
    const f = ownFan(m);
    const at = new Map(f.nodes.map((p) => [p.node.id, p]));
    const root = at.get('two-tier-0')!;
    expect(root).toMatchObject(f.hub);
    for (const p of f.nodes) {
      expect(p.y, p.node.id).toBeLessThanOrEqual(root.y);
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(f.width);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(f.height);
    }
    // Tier 2 lies beyond tier 1, both bands drawn in ascending order.
    expect(f.bands.map((b) => b.tier)).toEqual([1, 2]);
    expect(f.bands[1]!.outer).toBeGreaterThan(f.bands[0]!.outer);
    const dist = (id: string) => Math.hypot(at.get(id)!.x - f.hub.x, at.get(id)!.y - f.hub.y);
    const tier1 = Math.max(...[0, 1, 2].map((i) => dist(`two-tier-${i}`)));
    const tier2 = Math.min(...[3, 4, 5].map((i) => dist(`two-tier-${i}`)));
    expect(tier2).toBeGreaterThan(tier1);
    expect(tier1).toBeLessThan(f.bands[0]!.outer);
    // A one-tier manual draws one band.
    expect(ownFan(fake('lone', 1, [[]])).bands).toHaveLength(1);
  });

  it('grows each node past its parents, keeps labels on a ring apart, and fits a desktop box', () => {
    const big = madeUpManuals().manuals.filter((m) => m.host === null && m.nodes.length > 4);
    expect(big.length).toBeGreaterThan(5);
    for (const m of [...big, fake('wide', 1, [[], [0], [0], [0], [1, 2, 3]])]) {
      const f = ownFan(m);
      const at = new Map(f.nodes.map((p) => [p.node.id, p]));
      const r = (id: string) => Math.hypot(at.get(id)!.x - f.hub.x, at.get(id)!.y - f.hub.y);
      for (const n of m.nodes) {
        for (const q of n.requires) expect(r(n.id), `${m.id} ${n.id}`).toBeGreaterThan(r(q));
      }
      for (const a of f.nodes) {
        for (const b of f.nodes) {
          if (a === b || Math.abs(r(a.node.id) - r(b.node.id)) > 1) continue;
          expect(
            Math.hypot(a.x - b.x, a.y - b.y),
            `${a.node.id} ${b.node.id}`,
          ).toBeGreaterThanOrEqual(OWN_LABEL_W);
        }
      }
      expect(f.width, m.id).toBeLessThan(800);
    }
  });
});
