import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { hashSeed, mulberry32, Rng } from './rng.ts';

const require = createRequire(import.meta.url);
const atlas = require('../../tools/atlas-geo.cjs') as {
  rng: (seed: number) => () => number;
  hash: (s: string) => number;
};

const take = (f: () => number, n: number) => Array.from({ length: n }, f);

describe('mulberry32', () => {
  it('matches the atlas generator', () => {
    for (const seed of [0, 1, 42, 0x6d2b79f5, 2 ** 32 - 1, hashSeed('qm-bianhuang')]) {
      expect(take(mulberry32(seed), 50)).toEqual(take(atlas.rng(seed), 50));
    }
  });

  it('gives known values for seed 1', () => {
    expect(take(mulberry32(1), 3)).toEqual([
      0.6270739405881613, 0.002735721180215478, 0.5274470399599522,
    ]);
  });

  it('stays in [0, 1)', () => {
    for (const v of take(mulberry32(7), 10_000)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('hashSeed', () => {
  it('matches the atlas hash', () => {
    for (const s of ['', 'the-scar', 'qm-bianhuang', '洞府'])
      expect(hashSeed(s)).toBe(atlas.hash(s));
  });
});

describe('Rng', () => {
  it('replays the same sequence from the same seed', () => {
    const a = new Rng(123);
    const b = new Rng(123);
    expect(take(() => a.next(), 20)).toEqual(take(() => b.next(), 20));
  });

  it('matches mulberry32 for the same seed', () => {
    const r = new Rng(99);
    expect(take(() => r.next(), 20)).toEqual(take(mulberry32(99), 20));
  });

  it('resumes from a saved state', () => {
    const r = new Rng(5);
    take(() => r.next(), 10);
    const resumed = new Rng(r.state);
    expect(take(() => resumed.next(), 10)).toEqual(take(() => r.next(), 10));
  });

  it('rolls integers inclusively and covers the range', () => {
    const r = Rng.fromString('d20');
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = r.int(1, 20);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(20);
      seen.add(v);
    }
    expect(seen.size).toBe(20);
  });

  it('rejects bad ranges', () => {
    expect(() => new Rng(1).int(5, 4)).toThrow(RangeError);
    expect(() => new Rng(1).int(0.5, 4)).toThrow(RangeError);
    expect(() => new Rng(1).pick([])).toThrow(RangeError);
  });

  it('chance and pick behave', () => {
    const r = new Rng(11);
    expect(r.chance(0)).toBe(false);
    expect(r.chance(1)).toBe(true);
    expect(['a', 'b', 'c']).toContain(r.pick(['a', 'b', 'c']));
  });
});
