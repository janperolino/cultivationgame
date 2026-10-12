import { describe, expect, it } from 'vitest';
import { MAX_ODDS, SCENE_ODDS_CAP, SCENE_ODDS_STEP } from '../content/cultivation.ts';
import { stepSize } from '../content/realms.ts';
import { SCENE_EARLY_S, SCENE_GATES, SCENE_SECONDS, SCENE_WINDOW_S } from '../content/scene.ts';
import {
  attemptBreakthrough,
  cultivateDays,
  majorCheck,
  minorOdds,
  sceneOdds,
  type LadderId,
} from './cultivation.ts';
import { breakThrough } from './life.ts';
import { Rng } from './rng.ts';
import {
  GATE_TIMES,
  gateLap,
  newScene,
  nextGate,
  sceneBonus,
  sceneHits,
  sceneLaps,
  sceneOver,
  tapScene,
  type Scene,
} from './scene.ts';
import { addItem, newLife, withPlayer, type Cultivator, type Ladder } from './state.ts';

const life = () => newLife({ name: 'Han Li', seed: 'scene' });
const DAY = life().calendar.day;
const ctx = (seed = 0) => ({ day: DAY, rng: new Rng(seed) });

function at(c: Cultivator, which: LadderId, l: Partial<Ladder>): Cultivator {
  return { ...c, [which]: { ...c[which], ...l } };
}
function filled(c: Cultivator, fill: number): Cultivator {
  return at(c, 'qi', { bar: stepSize(c.qi.realm, c.qi.stage) * fill });
}
/** Taps at each moment in turn. */
const tapAll = (times: number[], s: Scene = newScene()) =>
  times.reduce((x, t) => tapScene(x, t).scene, s);

describe('the scene', () => {
  it('races: the gates come closer together, all inside the ten seconds', () => {
    expect(GATE_TIMES).toHaveLength(SCENE_GATES);
    for (let k = 0; k < SCENE_GATES; k++) {
      expect(sceneLaps(GATE_TIMES[k]!)).toBeCloseTo(gateLap(k));
      if (k > 1) {
        expect(GATE_TIMES[k]! - GATE_TIMES[k - 1]!).toBeLessThan(
          GATE_TIMES[k - 1]! - GATE_TIMES[k - 2]!,
        );
      }
    }
    expect(GATE_TIMES[0]).toBeGreaterThan(1);
    expect(GATE_TIMES.at(-1)! + SCENE_WINDOW_S).toBeLessThan(SCENE_SECONDS);
    expect(sceneOver(SCENE_SECONDS - 0.01)).toBe(false);
    expect(sceneOver(SCENE_SECONDS)).toBe(true);
  });

  it('catches a gate tapped on time, a step each', () => {
    let s = newScene();
    const t0 = GATE_TIMES[0]!;
    const r = tapScene(s, t0 + SCENE_WINDOW_S * 0.9);
    expect(r).toMatchObject({ gate: 0, hit: true });
    s = r.scene;
    expect(sceneHits(s)).toBe(1);
    expect(sceneBonus(s)).toBeCloseTo(SCENE_ODDS_STEP);
    // A second tap can't take the same gate again; it waits for the next.
    expect(tapScene(s, t0 + 0.1).gate).toBeNull();
    expect(nextGate(s, t0)).toBe(1);
  });

  it('spends a gate on an early tap, ignores taps far from any, and never charges a miss', () => {
    const t1 = GATE_TIMES[1]!;
    const early = tapScene(newScene(), t1 - SCENE_EARLY_S + 0.01);
    // Gate 0 has passed by then, untapped; gate 1 is spent.
    expect(early).toMatchObject({ gate: 1, hit: false });
    expect(early.scene.gates[1]).toBe('early');
    expect(sceneBonus(early.scene)).toBe(0);
    const far = tapScene(newScene(), 0.1);
    expect(far.gate).toBeNull();
    expect(far.scene).toEqual(newScene());
    // A late tap, past every window, does nothing either.
    expect(tapScene(newScene(), SCENE_SECONDS - 0.05).gate).toBeNull();
  });

  it('pays nothing for tapping as fast as you can', () => {
    const spam = Array.from({ length: SCENE_SECONDS * 20 }, (_, i) => i / 20);
    expect(sceneHits(tapAll(spam))).toBe(0);
  });

  it('never passes the cap, however many gates are caught', () => {
    const all = tapAll([...GATE_TIMES]);
    expect(sceneHits(all)).toBe(SCENE_GATES);
    expect(SCENE_GATES * SCENE_ODDS_STEP).toBeGreaterThan(SCENE_ODDS_CAP);
    expect(sceneBonus(all)).toBe(SCENE_ODDS_CAP);
    // Every subset of gates stays under it.
    for (let mask = 0; mask < 1 << SCENE_GATES; mask++) {
      const times = GATE_TIMES.filter((_, k) => mask & (1 << k));
      expect(sceneBonus(tapAll(times))).toBeLessThanOrEqual(SCENE_ODDS_CAP);
    }
    // And the odds never take more than the cap, whatever they are handed.
    expect(sceneOdds(0.5, 1)).toBeCloseTo(0.5 + SCENE_ODDS_CAP);
    expect(sceneOdds(0.5, -1)).toBe(0.5);
    expect(sceneOdds(0.95, SCENE_ODDS_CAP)).toBe(MAX_ODDS);
    expect(sceneOdds(1, SCENE_ODDS_CAP)).toBe(1);
  });
});

describe('the roll after a scene', () => {
  const l3 = () => filled(at(life().player, 'qi', { stage: 2 }), 1);

  it('is the same roll: no scene and a scene with nothing caught are identical', () => {
    const c = l3();
    for (let seed = 0; seed < 20; seed++) {
      expect(attemptBreakthrough(c, 'qi', ctx(seed), { scene: 0 })).toEqual(
        attemptBreakthrough(c, 'qi', ctx(seed)),
      );
    }
  });

  it('draws one roll and compares it with the raised odds', () => {
    const c = l3();
    const base = minorOdds(c, 'qi');
    for (let seed = 0; seed < 200; seed++) {
      const rng = new Rng(seed);
      const r = attemptBreakthrough(c, 'qi', { day: DAY, rng }, { scene: SCENE_ODDS_CAP });
      const roll = new Rng(seed).next();
      expect(r.odds).toBeCloseTo(base + SCENE_ODDS_CAP);
      expect(r.success).toBe(roll < base + SCENE_ODDS_CAP);
      // One draw from the stream, as without a scene.
      const plain = new Rng(seed);
      attemptBreakthrough(c, 'qi', { day: DAY, rng: plain });
      expect(rng.state).toBe(plain.state);
    }
  });

  it('caps whatever bonus is passed, on minor and major attempts', () => {
    const c = l3();
    expect(attemptBreakthrough(c, 'qi', ctx(), { scene: 5 }).odds).toBeCloseTo(
      minorOdds(c, 'qi') + SCENE_ODDS_CAP,
    );
    const ready = addItem(
      { ...filled(at(life().player, 'qi', { stage: 9 }), 1), insight: { current: 0, earned: 500 } },
      'foundation-pill',
      1,
    );
    const check = majorCheck(ready, 'qi')!;
    expect(check.ready).toBe(true);
    const r = attemptBreakthrough(ready, 'qi', ctx(), { scene: 5 });
    expect(r.odds).toBeCloseTo(Math.min(MAX_ODDS, check.odds + SCENE_ODDS_CAP));
    // The grade is the margin's, scene or not.
    const plain = attemptBreakthrough(ready, 'qi', ctx());
    if (r.success && plain.success) expect(r.grade).toBe(plain.grade);
  });

  it('leaves the steps that always hold certain, with no stakes', () => {
    const c = filled(life().player, 1);
    expect(minorOdds(c, 'qi')).toBe(1);
    const s = withPlayer(life(), c);
    const r = breakThrough(s, 'qi', { scene: SCENE_ODDS_CAP });
    expect(r).toMatchObject({ success: true, odds: 1 });
    expect(r.state).toEqual(breakThrough(s, 'qi').state);
  });
});

describe('the auto setting at the figure', () => {
  const step = (c: Cultivator, scene?: 'ready' | 'playing') =>
    cultivateDays(c, 0.01, { ...ctx(), seat: { factor: 1, attended: !!scene, scene } });

  it('leaves the certain steps to the scene while you sit with the figure', () => {
    const c = filled(life().player, 1);
    expect(step(c).cultivator.qi.stage).toBe(2);
    expect(step(c, 'ready').cultivator.qi.stage).toBe(1);
    expect(step(c, 'playing').cultivator.qi.stage).toBe(1);
  });

  it('still runs the uncertain steps on auto at the figure, but not while a scene plays', () => {
    const c = filled(at(life().player, 'qi', { stage: 2 }), 1.4);
    expect(step(c).breakthroughs).toHaveLength(1);
    expect(step(c, 'ready').breakthroughs).toHaveLength(1);
    expect(step(c, 'playing').breakthroughs).toHaveLength(0);
  });
});
