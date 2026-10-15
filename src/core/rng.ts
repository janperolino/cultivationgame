// Seeded randomness. mulberry32 is the same generator the atlas uses (tools/atlas-geo.cjs),
// so a seed replays the same fight, roll or outline everywhere.

/** One step of mulberry32: advances the 32-bit state and returns the new state and a float in [0, 1). */
export function mulberry32Step(state: number): { state: number; value: number } {
  const a = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return { state: a, value: ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
}

/** mulberry32 as a plain function, matching the atlas's rng(seed). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    const step = mulberry32Step(a);
    a = step.state;
    return step.value;
  };
}

/** FNV-1a string hash, as the atlas uses to seed from ids. */
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Named streams, one per system. Each is seeded from the life's seed and its own name, so adding
 * a system, or rolling more in one, never shifts another's rolls.
 */
export const STREAMS = [
  'breakthrough',
  'combat',
  'world',
  'orbs',
  'people',
  'scene',
  'loot',
] as const;
export type StreamName = (typeof STREAMS)[number];

/** The starting state of a named stream for a life's seed. */
export function streamSeed(lifeSeed: number, name: StreamName): number {
  return hashSeed(`${lifeSeed >>> 0}/${name}`) | 0;
}

/** A generator whose state is one integer, so saves can store it and resume the same sequence. */
export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed | 0;
  }

  static fromString(seed: string): Rng {
    return new Rng(hashSeed(seed));
  }

  /** The current state; `new Rng(rng.state)` continues the same sequence. */
  get state(): number {
    return this.s;
  }

  /** A float in [0, 1). */
  next(): number {
    const step = mulberry32Step(this.s);
    this.s = step.state;
    return step.value;
  }

  /** An integer in [min, max], both inclusive. */
  int(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new RangeError(`Rng.int needs integers with min <= max, got ${min}..${max}`);
    }
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** True with probability p. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** One element of a non-empty array. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new RangeError('Rng.pick needs a non-empty array');
    return items[this.int(0, items.length - 1)] as T;
  }
}
