// P2.5c: the Manuals shelf as a bookcase. The planks' order, rarest first and the other orders,
// finished manuals apart, and the strip's counts, on the manuals a new life holds and on a
// bookcase of 150 made-up ones.
import { describe, expect, it } from 'vitest';
import { manual } from '../content/manuals.ts';
import { registerManuals } from '../content/nodes.ts';
import { rarityRank } from '../content/rarity.ts';
import { gainManual } from './life.ts';
import { madeUpManuals } from './madeUpManuals.ts';
import {
  heldManuals,
  manualFinished,
  manualReady,
  PLANKS,
  shelf,
  shelfTally,
  type Shelf,
} from './manuals.ts';
import { eventText } from './chronicle.ts';
import { chronicleEvent, newLife, withPlayer, type Cultivator } from './state.ts';

const life = newLife({ name: 'Han Li', seed: 'bookcase' });
// A life with nothing on its bookcase: no method, technique or manual.
const base = withPlayer(life, { ...life.player, methods: {}, techniques: {}, manuals: [] });
const made = madeUpManuals(150);
registerManuals(made.manuals);
const full: Cultivator = {
  ...base.player,
  manuals: [...base.player.manuals, ...made.manuals.map((m) => m.id)],
  nodes: [...base.player.nodes, ...made.learned],
  insight: { current: 1e5, earned: 1e5 },
};

const ids = (s: Shelf | undefined, part: 'open' | 'finished') =>
  s ? s[part].map((m) => m.id) : [];

describe('the bookcase', () => {
  it('holds 150 made-up manuals in the mix a long life gathers, most finished', () => {
    expect(made.manuals).toHaveLength(150);
    const kinds = (k: string) => made.manuals.filter((m) => m.kind === k).length;
    expect([kinds('scripture'), kinds('inheritance'), kinds('method')]).toEqual([4, 2, 14]);
    expect([kinds('art'), kinds('style'), kinds('formula')]).toEqual([30, 8, 92]);
    expect(madeUpManuals(150)).toEqual(made);
    const finished = made.manuals.filter((m) => manualFinished(full, m)).length;
    expect(finished).toBeGreaterThan(70);
    expect(finished).toBeLessThan(110);
  });

  it('lays the planks out Above the trees, Methods, Formulas, Arts, Styles', () => {
    expect(shelf(full).map((s) => s.plank.id)).toEqual(PLANKS.map((p) => p.id));
    const above = shelf(full)[0]!;
    for (const m of [...above.open, ...above.finished]) {
      expect(['scripture', 'inheritance']).toContain(m.kind);
    }
  });

  it('shows no shelf for a kind with nothing held', () => {
    const c = gainManual(base, 'garrison-breath-count', 'is handed').player;
    expect(shelf(c).map((s) => s.plank.id)).toEqual(['formula']);
    expect(shelf(base.player)).toEqual([]);
  });

  it('keeps finished manuals apart from the open ones, rarest first', () => {
    for (const s of shelf(full)) {
      for (const m of s.finished) expect(manualFinished(full, m)).toBe(true);
      for (const m of s.open) expect(manualFinished(full, m)).toBe(false);
      const ranks = s.finished.map((m) => rarityRank(m.rarity));
      expect(ranks).toEqual([...ranks].sort((a, b) => b - a));
    }
  });

  it('puts the rarest first and keeps the order gained on a tie', () => {
    const order = heldManuals(full);
    for (const s of shelf(full, 'rarity')) {
      const ranks = s.open.map((m) => rarityRank(m.rarity));
      expect(ranks).toEqual([...ranks].sort((a, b) => b - a));
      for (let i = 1; i < s.open.length; i++) {
        const [a, b] = [s.open[i - 1]!, s.open[i]!];
        if (a.rarity === b.rarity) expect(order.indexOf(a)).toBeLessThan(order.indexOf(b));
      }
    }
  });

  it('orders by host tree, newest first, and with a node waiting first', () => {
    const formulas = (o: Parameters<typeof shelf>[1]) =>
      shelf(full, o).find((s) => s.plank.id === 'formula');
    const hosts = formulas('host')!.open.map((m) => m.host);
    expect(hosts).toEqual(
      [...hosts].sort(
        (a, b) => ['qi', 'body', 'soul'].indexOf(a!) - ['qi', 'body', 'soul'].indexOf(b!),
      ),
    );
    expect(ids(formulas('newest'), 'open')).toEqual(
      [...ids(formulas('rarity'), 'open')].sort(
        (a, b) => Number(b.split('-')[2]) - Number(a.split('-')[2]),
      ),
    );
    const waiting = formulas('waiting')!.open.map((m) => manualReady(full, m));
    expect(waiting).toEqual([...waiting].sort((a, b) => Number(b) - Number(a)));
    expect(waiting).toContain(true);
  });

  it('counts the strip: open, finished and each rarity', () => {
    const shelves = shelf(full);
    const t = shelfTally(shelves);
    const held = heldManuals(full);
    expect(t.open + t.finished).toBe(held.length);
    expect(t.finished).toBe(held.filter((m) => manualFinished(full, m)).length);
    expect(t.rarities.reduce((n, r) => n + r.count, 0)).toBe(held.length);
    for (const { rarity, count } of t.rarities) {
      expect(count).toBe(held.filter((m) => m.rarity === rarity).length);
    }
    const ranks = t.rarities.map((r) => rarityRank(r.rarity));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it('finishes a manual when its last node is learned', () => {
    const m = manual('garrison-breath-count');
    const c = gainManual(base, m.id, 'is handed').player;
    expect(manualFinished(c, m)).toBe(false);
    expect(manualReady({ ...c, insight: { current: 100, earned: 100 } }, m)).toBe(true);
    const done = withPlayer(base, { ...c, nodes: [...c.nodes, ...m.nodes.map((n) => n.id)] });
    expect(manualFinished(done.player, m)).toBe(true);
    expect(shelfTally(shelf(done.player))).toMatchObject({ open: 0, finished: 1 });
  });
});

describe('a save naming what the game no longer holds', () => {
  it('words a chronicle line on an unknown node or manual instead of throwing', () => {
    const who = [base.player.id];
    const node = chronicleEvent(0, 'node', { node: 'made-up-9999-0' }, who, null);
    const book = chronicleEvent(
      0,
      'manual',
      { manual: 'made-up-9999', how: 'is handed' },
      who,
      null,
    );
    expect(eventText(base, node)).toBe('Han Li comprehends a node no longer written.');
    expect(eventText(base, book)).toBe('Han Li is handed a manual no longer written.');
    const known = chronicleEvent(0, 'node', { node: made.manuals[0]!.nodes[0]!.id }, who, null);
    expect(eventText(base, known)).toBe(`Han Li comprehends ${made.manuals[0]!.nodes[0]!.name}.`);
  });
});
