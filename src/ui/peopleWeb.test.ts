import { describe, expect, it } from 'vitest';
import type { TieId } from '../content/people.ts';
import {
  anyOverlap,
  labelAngle,
  nearest,
  nodeBox,
  ringFor,
  tieLinks,
  WEB_MAX,
  WEB_SIZE,
  webLayout,
} from './peopleWeb.ts';

const rec = (tie: TieId | null, level: number, heard = 0) => ({ tie, level, heard });

describe('the web of threads', () => {
  it('puts the trusting close and the hostile far', () => {
    expect(ringFor(2)).toBeLessThan(ringFor(0));
    expect(ringFor(0)).toBeLessThan(ringFor(-2));
  });

  it('keeps everyone on the web and apart from each other', () => {
    const people = [
      { id: 'a', ...rec(null, 0) },
      { id: 'b', ...rec(null, 1) },
      { id: 'c', ...rec(null, -1) },
      { id: 'd', ...rec('kin', 2) },
      { id: 'e', ...rec('rival', -2) },
      { id: 'f', ...rec('senior', 0) },
    ];
    const nodes = webLayout(people);
    for (const n of nodes) {
      expect(n.x).toBeGreaterThan(20);
      expect(n.x).toBeLessThan(WEB_SIZE.w - 20);
      expect(n.y).toBeGreaterThan(20);
      expect(n.y + 52).toBeLessThan(WEB_SIZE.h);
    }
    expect(anyOverlap(nodes)).toBe(false);
  });

  it('keeps a full, crowded web clear of overlaps too', () => {
    const ties: (TieId | null)[] = [null, 'senior', 'kin', 'rival', 'junior'];
    const names = ['Senior Brother Zhao', 'Aunt Yan', 'Little Ning', 'Peddler Gou', 'Fang Tie'];
    const people = Array.from({ length: WEB_MAX }, (_, i) => ({
      id: `p${i}`,
      name: names[i % names.length]!,
      bond: 'an acquaintance',
      ...rec(ties[i % ties.length]!, (i % 3) - 1),
    }));
    const nodes = webLayout(people);
    expect(anyOverlap(nodes)).toBe(false);
    for (const n of nodes) {
      const box = nodeBox(n);
      expect(box.l).toBeGreaterThan(0);
      expect(box.r).toBeLessThan(WEB_SIZE.w);
      expect(box.t).toBeGreaterThan(0);
      expect(box.b).toBeLessThan(WEB_SIZE.h);
    }
  });

  it('labels the rings where nobody sits', () => {
    const nodes = webLayout([
      { id: 'a', ...rec('senior', 0) },
      { id: 'b', ...rec('kin', 2) },
    ]);
    const at = labelAngle(nodes);
    for (const n of nodes) {
      const d = Math.abs(((((at - n.angle) % 360) + 540) % 360) - 180);
      expect(d).toBeGreaterThan(60);
    }
  });

  it('shows the nearest dozen, warmest first', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      id: `p${i}`,
      ...rec(null, (i % 5) - 2, i),
    }));
    const shown = nearest(many);
    expect(shown).toHaveLength(WEB_MAX);
    expect(shown[0]!.level).toBe(2);
  });

  it('draws a thread between two people it shows who are tied', () => {
    const nodes = webLayout([
      { id: 'a', ...rec(null, 0) },
      { id: 'b', ...rec('kin', 1) },
    ]);
    expect(
      tieLinks(nodes, [
        { a: 'a', b: 'b' },
        { a: 'a', b: 'gone' },
      ]),
    ).toHaveLength(1);
  });
});
