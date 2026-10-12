import { describe, expect, it } from 'vitest';
import type { PersonRecord } from '../core/state.ts';
import {
  anyOverlap,
  labelAngle,
  nearest,
  nodeBox,
  ringFor,
  WEB_MAX,
  WEB_SIZE,
  webLayout,
} from './peopleWeb.ts';

const rec = (bond: PersonRecord['bond'], regard: number, heard = 0): PersonRecord => ({
  met: 0,
  place: null,
  bond,
  regard,
  realm: null,
  where: null,
  heard,
  seen: 0,
});

describe('the web of threads', () => {
  it('puts the warm close and the hostile far', () => {
    expect(ringFor(3)).toBeLessThan(ringFor(0));
    expect(ringFor(0)).toBeLessThan(ringFor(-3));
  });

  it('keeps everyone on the web and apart from each other', () => {
    const people = [
      { id: 'a', record: rec('acquaintance', 0) },
      { id: 'b', record: rec('acquaintance', 1) },
      { id: 'c', record: rec('acquaintance', -1) },
      { id: 'd', record: rec('kin', 3) },
      { id: 'e', record: rec('rival', -3) },
      { id: 'f', record: rec('senior', 0) },
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
    const bonds: PersonRecord['bond'][] = ['acquaintance', 'senior', 'kin', 'rival', 'junior'];
    const names = ['Senior Brother Zhao', 'Aunt Yan', 'Little Ning', 'Peddler Gou', 'Fang Tie'];
    const people = Array.from({ length: WEB_MAX }, (_, i) => ({
      id: `p${i}`,
      name: names[i % names.length]!,
      bond: 'an acquaintance',
      record: rec(bonds[i % bonds.length]!, (i % 3) - 1),
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
      { id: 'a', record: rec('senior', 0) },
      { id: 'b', record: rec('kin', 2) },
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
      record: rec('acquaintance', (i % 7) - 3, i),
    }));
    const shown = nearest(many);
    expect(shown).toHaveLength(WEB_MAX);
    expect(shown[0]!.record.regard).toBe(3);
  });
});
