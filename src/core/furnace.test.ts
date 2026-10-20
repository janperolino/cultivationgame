// Fire control at the furnace (K3, take F): burning out the dross. A bot plays the rules as players
// of several kinds, and the hand they hold is the check that the minigame is the skill: attentive
// play holds about 0.85, greedy play (clicking everything) and idle play near 0. The specks roll on
// the furnace stream, so a seed replays the same sitting.
import { describe, expect, it } from 'vitest';
import { recipe } from '../content/crafts.ts';
import { FLICK_HEAT, FLIGHT_S, ROAR_HIT } from '../content/furnace.ts';
import {
  doseOrder,
  flick,
  keepFurnaceStream,
  roaring,
  speckAt,
  startFurnace,
  tickFurnace,
  type Furnace,
  type Speck,
} from './furnace.ts';
import { Rng } from './rng.ts';
import { newLife } from './state.ts';

const QI_PILL = recipe('qi-gathering-pill');

/** The furnace after `secs`, ticked as a screen does. */
function after(f0: Furnace, secs: number): Furnace {
  let f = f0;
  for (let t = 0; t < secs; t += 1 / 60) f = tickFurnace(f, 1 / 60).furnace;
  return f;
}

interface Player {
  /** Seconds before it sees a speck, how often its click lands, its cooldown between clicks. */
  react: number;
  aim: number;
  cd: number;
  /** It stops clicking at this heat; how often it takes essence for dross; clicks everything. */
  stopAt: number;
  confuse?: number;
  greedy?: boolean;
}

const PLAYERS: Record<string, Player> = {
  idle: { react: 99, aim: 0, cd: 1, stopAt: 2 },
  attentive: { react: 0.6, aim: 0.85, cd: 0.4, stopAt: 0.8, confuse: 0.05 },
  sloppy: { react: 0.9, aim: 0.65, cd: 0.6, stopAt: 2, confuse: 0.15 },
  greedy: { react: 0.3, aim: 0.85, cd: 0.15, stopAt: 2, greedy: true },
};

/** The mean hand a player holds over five minutes, the first half-minute left out. */
function play(p: Player, seed: string, secs = 300): number {
  const s = newLife({ name: 'Han Li', seed });
  let f: Furnace = startFurnace(s, QI_PILL);
  const me = new Rng(7);
  const mistaken = new Map<number, boolean>();
  let cd = 0;
  let sum = 0;
  const dt = 1 / 60;
  while (f.t < secs) {
    f = tickFurnace(f, dt).furnace;
    cd -= dt;
    if (cd <= 0 && !roaring(f) && f.heat < p.stopAt) {
      const seen = (x: Speck) => {
        if (!mistaken.has(x.id)) mistaken.set(x.id, me.chance(p.confuse ?? 0));
        return p.greedy || x.kind === 'dross' || mistaken.get(x.id)!;
      };
      const target = f.specks.find((x) => f.t > x.born + p.react && seen(x));
      if (target || p.greedy) {
        cd = p.cd;
        const at = target && me.chance(p.aim) ? speckAt(target, f.t) : ([0, 0] as const);
        f = flick(f, s.player.id, at).furnace;
      }
    }
    if (f.t > 30) sum += f.hand * dt;
  }
  return sum / (secs - 30);
}

describe('fire control', () => {
  it('holds a steady hand for attentive play, a middling one for sloppy, none for greed or idling', () => {
    for (const seed of ['furnace-a', 'furnace-b']) {
      expect(play(PLAYERS.attentive!, seed)).toBeGreaterThanOrEqual(0.75);
      const sloppy = play(PLAYERS.sloppy!, seed);
      expect(sloppy).toBeGreaterThan(0.3);
      expect(sloppy).toBeLessThan(0.75);
      expect(play(PLAYERS.greedy!, seed)).toBeLessThanOrEqual(0.2);
      expect(play(PLAYERS.idle!, seed)).toBe(0);
    }
  });

  it('puts the recipe’s herbs in spread through the dose', () => {
    const order = doseOrder(QI_PILL);
    expect(order.filter((t) => t === 'old-apricot-kernel')).toHaveLength(6);
    expect(order.filter((t) => t === 'ridge-bitterroot')).toHaveLength(4);
    // Never three kernels in a row.
    expect(order.join(',')).not.toMatch(/(old-apricot-kernel,){2}old-apricot-kernel/);
  });

  it('burns dross toward a full hand, essence away from it, and heats with every flick', () => {
    const s = newLife({ name: 'Han Li', seed: 'flick' });
    let f = after(startFurnace(s, QI_PILL), 0.6);
    const dross = f.specks.find((x) => x.kind === 'dross');
    const essence = f.specks.find((x) => x.kind === 'essence');
    if (dross) {
      const r = flick(f, s.player.id, speckAt(dross, f.t));
      expect(r.burned?.speck.id).toBe(dross.id);
      expect(r.furnace.hand).toBeGreaterThan(f.hand);
      expect(r.furnace.heat).toBeCloseTo(f.heat + FLICK_HEAT, 9);
    }
    if (essence) {
      f = { ...f, hand: 0.5 };
      const r = flick(f, s.player.id, speckAt(essence, f.t));
      expect(r.furnace.hand).toBeLessThan(0.5);
    }
    // A miss still heats; someone else's flick does nothing.
    expect(flick(f, s.player.id, [0, 0]).furnace.heat).toBeCloseTo(f.heat + FLICK_HEAT, 9);
    expect(flick(f, 'someone-else', [0, 0]).furnace).toBe(f);
  });

  it('roars at the top: no flicks for a while, and the hand takes a blow', () => {
    const s = newLife({ name: 'Han Li', seed: 'roar' });
    const f = { ...startFurnace(s, QI_PILL), heat: 0.99, hand: 0.6 };
    const r = tickFurnace(flick(f, s.player.id, [0, 0]).furnace, 0.01);
    expect(r.events.some((e) => e.type === 'roar')).toBe(true);
    expect(roaring(r.furnace)).toBe(true);
    expect(r.furnace.hand).toBeCloseTo(0.6 - ROAR_HIT, 9);
    expect(flick(r.furnace, s.player.id, [0, 0]).furnace).toBe(r.furnace);
  });

  it('lets dross that falls back in pull the hand down, and replays from the stream', () => {
    const s = newLife({ name: 'Han Li', seed: 'fall' });
    const f = { ...startFurnace(s, QI_PILL), hand: 1 };
    const r = after(f, FLIGHT_S + 1);
    expect(r.hand).toBeLessThan(1);
    expect(after(f, FLIGHT_S + 1).specks).toEqual(r.specks);
    const kept = keepFurnaceStream(s, r);
    expect(startFurnace(kept, QI_PILL).rng).toBe(r.rng);
  });
});
