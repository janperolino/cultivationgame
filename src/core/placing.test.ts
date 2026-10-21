// Placing 布阵 (K10): the ground is the spot's, the rules hold, and a bot that reads the currents
// lays a far better ring than one that plants a plain octagon without looking.
import { describe, expect, it } from 'vitest';
import { PLACING } from '../content/formations.ts';
import {
  EMPTY,
  cantPlant,
  placingGround,
  placingHand,
  plant,
  pull,
  type Node,
  type Placing,
  type PlacingGround,
} from './placing.ts';
import { Rng } from './rng.ts';

const MID = (PLACING.side - 1) / 2;

/** Plants a ring in order; null when any flag won't stand or the ring won't close. */
function ring(g: PlacingGround, nodes: readonly Node[]): Placing | null {
  let p = EMPTY;
  for (const n of nodes) {
    const r = plant(g, p, n);
    if (r.why && r.placing.flags.length !== p.flags.length + 1) return null;
    p = r.placing;
  }
  return p.closed ? p : null;
}

/** A ring round the eye: a node at each of the count's angles, at its own distance. */
function around(count: number, radii: readonly number[], turn = 0): Node[] {
  return radii.map((r, k) => {
    const a = turn + (2 * Math.PI * k) / count;
    return [Math.round(MID + r * Math.cos(a)), Math.round(MID + r * Math.sin(a))] as Node;
  });
}

/**
 * The reader: it sees the whole ground, tries rings round the eye and keeps nudging the best one a
 * flag at a time, as a player reading the currents does.
 */
function reader(g: PlacingGround, seed: number): number {
  const rng = new Rng(seed);
  let best = 0;
  let nodes: Node[] = [];
  const keep = (ns: Node[]) => {
    const p = ring(g, ns);
    const h = p ? placingHand(g, p) : 0;
    if (h > best) {
      best = h;
      nodes = ns;
    }
  };
  for (let t = 0; t < 200; t++)
    keep(
      around(
        g.nodes,
        Array.from({ length: g.nodes }, () => 1.5 + rng.next() * 3.5),
        rng.next() * Math.PI,
      ),
    );
  for (let t = 0; t < 1500 && nodes.length; t++) {
    const i = rng.int(0, g.nodes - 1);
    keep(
      nodes.map((n, k) => (k === i ? ([n[0] + rng.int(-1, 1), n[1] + rng.int(-1, 1)] as Node) : n)),
    );
  }
  return best;
}

/** The blind: a plain octagon at three points out, never looking. */
function blind(g: PlacingGround): number {
  for (const r of [3, 4, 2, 5]) {
    const p = ring(g, around(g.nodes, Array(g.nodes).fill(r)));
    if (p) return placingHand(g, p);
  }
  return 0;
}

describe('placing', () => {
  it('reads the same ground on the same spot, and another elsewhere', () => {
    const a = placingGround('cave@x', 'flags');
    expect(placingGround('cave@x', 'flags')).toEqual(a);
    expect(placingGround('cave@y', 'flags').rocks).not.toEqual(a.rocks);
    expect(a.nodes).toBe(8);
    expect(placingGround('cave@x', 'disc').nodes).toBe(4);
  });

  it('keeps flags off stones, the eye and each other, and lines from crossing', () => {
    const g = placingGround('rules', 'flags');
    const stone = g.rocks[0]!.split(',').map(Number) as [number, number];
    expect(cantPlant(g, EMPTY, stone)).toMatch(/stone/);
    expect(cantPlant(g, EMPTY, g.eye)).toMatch(/eye/);
    const p = { ...EMPTY, flags: [[0, 0] as Node, [10, 10] as Node] };
    expect(cantPlant(g, p, [0, 0])).toMatch(/already/);
    // From (10,10) back across to (0,10) is clear; then (10,0) would cross the first line.
    const crossing = { ...EMPTY, flags: [[0, 0] as Node, [10, 10] as Node, [0, 10] as Node] };
    if (!g.rocks.length || cantPlant(g, crossing, [10, 0]) !== 'a stone stands in the way')
      expect(cantPlant(g, crossing, [10, 0])).toMatch(/cross|stone/);
  });

  it('closes the ring only round the eye, and pulling a flag spills', () => {
    const g = placingGround('closing', 'disc');
    const off: Node[] = [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
    ];
    const r = off.reduce((p: Placing, n) => plant(g, p, n).placing, EMPTY);
    expect(r.closed).toBe(false);
    const back = pull(r);
    expect(back.flags.length).toBe(3);
    expect(back.spilt).toBeCloseTo(PLACING.spill);
  });

  it('gives a reader 0.85 and more, a blind octagon half that, and an empty ground nothing', () => {
    const readers: number[] = [];
    const blinds: number[] = [];
    for (let k = 0; k < 8; k++) {
      const g = placingGround(`bot-${k}`, 'flags');
      readers.push(reader(g, k + 1));
      blinds.push(blind(g));
    }
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(readers)).toBeGreaterThan(0.85);
    expect(mean(blinds)).toBeLessThan(0.5);
    expect(placingHand(placingGround('bot-0', 'flags'), EMPTY)).toBe(0);
  });
});
