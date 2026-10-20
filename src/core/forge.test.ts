// Tempering at the forge (K4): a bot plays the rules as players of several kinds, and the hand they
// hold is the check that the minigame is the skill: attentive play holds 0.80 to 0.84, sloppy 0.60
// to 0.65, greedy play (sealing every point the moment it rises) about 0.2 and idle play 0. The
// heats roll on the forge stream, so a seed replays the same sitting.
import { describe, expect, it } from 'vitest';
import { QUENCH_BAND, QUENCH_COUNTS, SEAL_BAND, SEAL_S } from '../content/forge.ts';
import {
  glowAt,
  keepForgeStream,
  press,
  runeAt,
  startForge,
  tickForge,
  type Forge,
} from './forge.ts';
import { Rng } from './rng.ts';
import { newLife } from './state.ts';

/** The forge ticked as a screen does until `until` holds, or `secs` pass. */
function until(f0: Forge, ok: (f: Forge) => boolean, secs = 30): Forge {
  let f = f0;
  for (let t = 0; t < secs && !ok(f); t += 1 / 60) f = tickForge(f, 1 / 60).forge;
  return f;
}

interface Player {
  /** How long it takes to act once it sees the glow in the band, and how often a press lands. */
  react: number;
  aim: number;
  /** How far off its read of a glow is, either way. */
  misread: number;
  /** Presses the moment a point rises, whatever its glow. */
  greedy?: boolean;
}

const PLAYERS: Record<string, Player> = {
  idle: { react: 99, aim: 0, misread: 0 },
  attentive: { react: 0.25, aim: 0.9, misread: 0.02 },
  sloppy: { react: 0.45, aim: 0.7, misread: 0.06 },
  greedy: { react: 0, aim: 0.9, misread: 0, greedy: true },
};

/** The mean hand a player holds over five minutes, the first half-minute left out. */
function play(p: Player, seed: string, secs = 300): number {
  const s = newLife({ name: 'Han Li', seed });
  let f = startForge(s);
  const me = new Rng(11);
  const seen = new Map<number, number>();
  let sum = 0;
  const dt = 1 / 60;
  const read = (g: number) => g + (me.next() - 0.5) * 2 * p.misread;
  const inBand = (g: number, band: readonly [number, number]) => g >= band[0] && g <= band[1];
  while (f.t < secs) {
    f = tickForge(f, dt).forge;
    if (f.t - f.sealAt >= SEAL_S) {
      if (f.phase === 'quench' && !f.quenched) {
        // The quench is the heat's id 0 in the player's eyes.
        if (inBand(read(glowAt(f, 0)), QUENCH_BAND) || p.greedy) {
          const since = seen.get(-f.heats) ?? f.t;
          seen.set(-f.heats, since);
          if (f.t - since >= p.react) f = press(f, s.player.id, [0, 0]).forge;
        }
      } else if (f.phase === 'work') {
        const ready = f.runes
          .filter((r) => r.state === 'raised')
          .filter((r) => p.greedy || inBand(read(glowAt(f, r.x)), SEAL_BAND));
        for (const r of ready) if (!seen.has(r.id)) seen.set(r.id, f.t);
        const target = ready.find((r) => f.t - seen.get(r.id)! >= p.react);
        if (target) {
          const at = me.chance(p.aim) ? runeAt(target) : ([0, 0] as const);
          f = press(f, s.player.id, at).forge;
        }
      }
    }
    if (f.t > 30) sum += f.hand * dt;
  }
  return sum / (secs - 30);
}

describe('tempering', () => {
  it('holds a steady hand for attentive play, a middling one for sloppy, none for greed or idling', () => {
    for (const seed of ['forge-a', 'forge-b']) {
      expect(play(PLAYERS.attentive!, seed)).toBeGreaterThanOrEqual(0.75);
      const sloppy = play(PLAYERS.sloppy!, seed);
      expect(sloppy).toBeGreaterThan(0.3);
      expect(sloppy).toBeLessThan(0.75);
      expect(play(PLAYERS.greedy!, seed)).toBeLessThanOrEqual(0.25);
      expect(play(PLAYERS.idle!, seed)).toBe(0);
    }
  });

  it('a seal in the orange takes; too hot it blurs, too cold it fails', () => {
    const s = newLife({ name: 'Han Li', seed: 'seal' });
    let f = until(startForge(s), (x) => x.phase === 'work');
    expect(f.runes.length).toBeGreaterThanOrEqual(2);
    const first = f.runes[0]!;
    // Right out of the fire every point is hotter than the orange.
    expect(glowAt(f, first.x)).toBeGreaterThan(SEAL_BAND[1]);
    const hot = press({ ...f, hand: 0.5 }, s.player.id, runeAt(first));
    expect(hot.sealed?.how).toBe('blurred');
    expect(hot.forge.hand).toBeLessThan(0.5);
    // Wait for it to pass into the orange.
    f = until(f, (x) => glowAt(x, first.x) <= SEAL_BAND[1]);
    const good = press({ ...f, hand: 0.5 }, s.player.id, runeAt(first));
    expect(good.sealed?.how).toBe('took');
    expect(good.forge.hand).toBeGreaterThan(0.5);
    // A seal can't form twice inside its time, and someone else's does nothing.
    expect(press(good.forge, s.player.id, runeAt(f.runes[1]!)).sealed).toBeNull();
    expect(press(f, 'someone-else', runeAt(first)).forge).toBe(f);
    // Too cold, it fails.
    const cold = until(f, (x) => glowAt(x, first.x) < SEAL_BAND[0]);
    const r = cold.runes.find((x) => x.id === first.id)!;
    if (r.state === 'raised')
      expect(press(cold, s.player.id, runeAt(r)).sealed?.how).toBe('failed');
  });

  it('leaves a point the metal goes dark under, and the fourth heat is the quench', () => {
    const s = newLife({ name: 'Han Li', seed: 'quench' });
    const idle = until(startForge(s), (x) => x.phase === 'quench', 60);
    expect(idle.heats).toBe(4);
    // Idling left every point of the first three heats.
    expect(idle.hand).toBe(0);
    const f = until(idle, (x) => glowAt(x, 0) <= QUENCH_BAND[1]);
    const q = press({ ...f, hand: 0.5 }, s.player.id, [0, 0]);
    expect(q.quenched).toBe('took');
    expect(q.forge.hand).toBeCloseTo(1 - 0.5 * (1 - 0.09) ** QUENCH_COUNTS, 6);
    // A quench left undone fails as the piece goes dark.
    const missed = until(idle, (x) => !!x.quenched);
    expect(missed.quenched?.how).toBe('failed');
  });

  it('replays the same heats from a seed, and keeps the stream for a reload', () => {
    const s = newLife({ name: 'Han Li', seed: 'replay' });
    const a = until(startForge(s), (x) => x.heats === 3, 60);
    const b = until(startForge(s), (x) => x.heats === 3, 60);
    expect(a.runes).toEqual(b.runes);
    const kept = keepForgeStream(s, a);
    expect(startForge(kept).rng).toBe(a.rng);
  });
});
