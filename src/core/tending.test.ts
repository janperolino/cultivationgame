// Tending, the sleeve's ring (K8): played by a bot on the rules, an attentive hand that threads its
// rings between the sprouts holds high, a slow one sinks knots, a careless one that rings through
// the sprouts bruises them, and an idle one falls to nothing.
import { describe, expect, it } from 'vitest';
import { TEND } from '../content/farming.ts';
import { Rng } from './rng.ts';
import { letGo, startTending, stepTending, type Pt, type Tending } from './tending.ts';

const ALL = Array(9).fill(true) as boolean[];

function circle(cx: number, cy: number, r: number): Pt[] {
  const p: Pt[] = [];
  for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.2)
    p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  return p;
}

function clearOfSprouts(s: Tending, p: Pt[]): boolean {
  return s.sprouts.every((sp) =>
    p.every((q, i) => {
      if (!i) return true;
      const a = p[i - 1]!;
      const dx = q[0] - a[0];
      const dy = q[1] - a[1];
      const k = Math.max(
        0,
        Math.min(1, ((sp.x - a[0]) * dx + (sp.y - a[1]) * dy) / (dx * dx + dy * dy || 1)),
      );
      return Math.hypot(sp.x - a[0] - k * dx, sp.y - a[1] - k * dy) >= TEND.bruiseR + 2;
    }),
  );
}

/** A bot: it rings the oldest knot past `react` seconds, as wide as `most` and, careful, clear of sprouts. */
function play(
  react: number,
  o: { careless?: boolean; idle?: boolean; secs?: number } = {},
): Tending {
  const rng = new Rng(7);
  const s = startTending(ALL, rng);
  let next = 0;
  for (let i = 0; i < (o.secs ?? 180) * 60; i++) {
    stepTending(s, 1 / 60, rng);
    if (o.idle || s.t < next) continue;
    const old = s.knots.filter((k) => s.t - k.born > react).sort((a, b) => a.born - b.born)[0];
    if (!old) continue;
    let ring: Pt[] | null = null;
    for (let r = 14; r <= (o.careless ? 110 : 60); r += 4) {
      const near = s.knots.filter((k) => Math.hypot(k.x - old.x, k.y - old.y) < r - 6);
      const cx = near.reduce((a, k) => a + k.x, 0) / near.length;
      const cy = near.reduce((a, k) => a + k.y, 0) / near.length;
      const p = circle(cx, cy, r);
      if (o.careless || clearOfSprouts(s, p)) ring = p;
    }
    if (ring) letGo(s, ring);
    next = s.t + react;
  }
  return s;
}

describe('tending, the sleeve’s ring', () => {
  it('holds an attentive hand high, a slow one lower, a careless or idle one low', () => {
    expect(play(1).hand).toBeGreaterThanOrEqual(0.85);
    const slow = play(3);
    expect(slow.hand).toBeGreaterThan(0.3);
    expect(slow.hand).toBeLessThan(0.8);
    expect(slow.tally.sank).toBeGreaterThan(0);
    const careless = play(1, { careless: true });
    expect(careless.hand).toBeLessThan(0.5);
    expect(careless.tally.bruised).toBeGreaterThan(careless.tally.swept / 2);
    expect(play(1, { idle: true }).hand).toBe(0);
  });

  it('sweeps only on a closed ring with sleeve left, and counts a ring of three', () => {
    const rng = new Rng(3);
    const s = startTending([true], rng);
    s.sprouts = [];
    s.knots = [0, 1, 2].map((i) => ({
      x: 300 + i * 5,
      y: 300,
      vx: 0,
      vy: 0,
      born: 0,
      bed: 0,
      ph: 0,
    }));
    const open = circle(305, 300, 30).slice(0, 20);
    expect(letGo(s, open).swept).toEqual([]);
    expect(letGo(s, circle(305, 300, 30)).swept).toHaveLength(3);
    expect(s.tally.rings).toBe(1);
    expect(s.hand).toBeCloseTo(1 - (1 - TEND.share) ** 4);
  });

  it('starts six sprouts a sown bed, and raises knots only from sown beds', () => {
    const rng = new Rng(5);
    const s = startTending([true, false, true], rng);
    expect(s.sprouts).toHaveLength(12);
    for (let i = 0; i < 600; i++) stepTending(s, 1 / 60, rng);
    expect(s.knots.length).toBeGreaterThan(0);
    expect(s.knots.every((k) => k.bed === 0 || k.bed === 2)).toBe(true);
  });
});
