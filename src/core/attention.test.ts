// P1.10: attended seclusion. The seat's factor, focus and its drain, heat, breathing, the orbs
// stream, and that away earns exactly what idle always did.
import { describe, expect, it } from 'vitest';
import {
  ATTENTION_FLOOR,
  AWAY_FADE_S,
  BREATHE_COOLDOWN_S,
  FOCUS_DRAIN,
  HEAT_COOLING,
  HEAT_PER_BREATH,
  HEAT_TIMED,
  ORB_DRIFT_S,
  ORB_FOCUS,
  ORB_LINGER_S,
  ORB_TIMED,
} from '../content/attention.ts';
import { INSIGHT_ATTENDED } from '../content/cultivation.ts';
import { method } from '../content/methods.ts';
import { realm } from '../content/realms.ts';
import {
  attentionFactor,
  AWAY,
  breathe,
  catchAt,
  inhaling,
  keepOrbStream,
  orbPosition,
  seatOf,
  startAttention,
  tickAttention,
  type Attention,
  type Orb,
} from './attention.ts';
import { playDay } from './cards.ts';
import { cultivateDays, dayRates, qiSpeed } from './cultivation.ts';
import { advance } from './loop.ts';
import { methodNeed } from './methods.ts';
import { Rng } from './rng.ts';
import { newLife, withPlayer, type Cultivator, type GameState } from './state.ts';
import { aptitudeMultiplier } from './stats.ts';
import { learnNode } from './trees.ts';

const base = newLife({ name: 'Han Li', seed: 'seat' });
const DAY = base.calendar.day;

/** A cultivator past the tutorial layers, method at Mastery, rich in insight. */
function seated(stage = 4): Cultivator {
  const c = base.player;
  return {
    ...c,
    qi: { ...c.qi, stage },
    methods: {
      'garrison-standard': { practice: methodNeed(method('garrison-standard'), 2), fedUntil: 0 },
    },
    insight: { current: 1e5, earned: 1e5 },
  };
}

const life = (c: Cultivator): GameState => withPlayer(base, c);
const learn = (c: Cultivator, ...ids: string[]) =>
  ids.reduce((acc, id) => learnNode(acc, id).cultivator, c);

/** A seat already attending at session second `t`, with the given focus and heat. */
function sitting(c: Cultivator, patch: Partial<Attention> = {}): Attention {
  return { ...startAttention(life(c), c), attended: true, presence: 1, t: 60, ...patch };
}

/** An orb that came in at `angle` and floats on its ring by session second `t`. */
function orb(id: number, t: number, angle = Math.PI / 2): Orb {
  return {
    id,
    kind: 'element',
    tint: 'water',
    born: t - ORB_DRIFT_S - 1,
    arrives: t - 1,
    fades: t + ORB_LINGER_S,
    angle,
    wobble: 0,
  };
}

const ATTENDING = { attended: true, abode: true, hour: 5 };
const INHALE_T = 60; // 60 / 6 = 10 cycles exactly: the start of an inhale.
const EXHALE_T = 64;

describe('the attention factor', () => {
  it('is ×1.25 for being there and ×2 at full focus, ×1 away', () => {
    const c = seated();
    expect(attentionFactor(sitting(c, { focus: 0 }), c)).toBe(1 + ATTENTION_FLOOR);
    expect(attentionFactor(sitting(c, { focus: 1 }), c)).toBe(2);
    expect(attentionFactor(sitting(c, { focus: 0.5 }), c)).toBeCloseTo(1.625);
    expect(attentionFactor({ ...sitting(c, { focus: 1 }), presence: 0, attended: false }, c)).toBe(
      1,
    );
  });

  it('rises to ×2.25 with Whale Swallows the Sea, and holds the floor alone in the tutorial', () => {
    const whale = learn(
      seated(),
      'qi-sensing-breath',
      'qi-grasping-breath',
      'qi-lingering-breath',
      'qi-still-pool',
      'qi-cooling-channels',
      'qi-twin-streams',
      'qi-whale-swallows',
    );
    expect(attentionFactor(sitting(whale, { focus: 1 }), whale)).toBeCloseTo(2.25);
    const tutorial = seated(3);
    expect(attentionFactor(sitting(tutorial, { focus: 1 }), tutorial)).toBe(1.25);
  });

  it('multiplies the qi hours exactly, leaves stones alone and adds a second insight trickle', () => {
    const c = seated();
    const away = dayRates(c, DAY);
    const seat = { factor: 1.6, attended: true };
    const there = dayRates(c, DAY, [], seat);
    expect(there.qi).toBeCloseTo(away.qi * 1.6);
    expect(there.qiPerStone).toBeCloseTo(away.qiPerStone);
    expect(qiSpeed(c, seat).total).toBeCloseTo(qiSpeed(c).total * 1.6);
    const waking = 12 - there.count.sleep;
    const trickle =
      ((INSIGHT_ATTENDED * realm('qi-condensation').insightRate * aptitudeMultiplier(c)) / 12) *
      waking;
    expect(there.insight - away.insight).toBeCloseTo(trickle);
    // The factor alone, without attending, leaves no trickle: a seat fading after you left.
    expect(dayRates(c, DAY, [], { factor: 1.6, attended: false }).insight).toBeCloseTo(
      away.insight,
    );
  });
});

describe('away is exactly today', () => {
  it('gives the same rates and the same day with no seat as with the away seat', () => {
    const c = seated();
    expect(dayRates(c, DAY, [], AWAY)).toEqual(dayRates(c, DAY));
    const a = cultivateDays(c, 1, { day: DAY, rng: new Rng(7) });
    const b = cultivateDays(c, 1, { day: DAY, rng: new Rng(7), seat: AWAY });
    expect(b).toEqual(a);
  });

  it('earns a life left away exactly what it always did, whatever the seat says offline', () => {
    const s = life(seated());
    const idle = advance(s, 20 * 60_000, { step: playDay }).state;
    expect(advance(s, 20 * 60_000, { step: playDay, seat: AWAY }).state).toEqual(idle);
    // Offline time is away by definition: an attending seat counts for nothing there.
    const offline = advance(s, 20 * 60_000, { step: playDay, offline: true }).state;
    const claimed = advance(s, 20 * 60_000, {
      step: playDay,
      offline: true,
      seat: { factor: 2, attended: true },
    }).state;
    expect(claimed).toEqual(offline);
  });

  it('fills the bar faster while attending, online', () => {
    const s = life(seated());
    const idle = advance(s, 60_000, { step: playDay }).state;
    const there = advance(s, 60_000, { step: playDay, seat: { factor: 2, attended: true } }).state;
    expect(there.player.qi.bar).toBeGreaterThan(idle.player.qi.bar * 1.5);
    expect(there.player.insight.earned).toBeGreaterThan(idle.player.insight.earned);
  });
});

describe('focus and its drain', () => {
  it('drains slowly toward the floor while attending', () => {
    const c = seated();
    const a = tickAttention(sitting(c, { focus: 1 }), c, 150, ATTENDING);
    expect(a.focus).toBeCloseTo(1 - 150 * FOCUS_DRAIN);
    expect(attentionFactor(tickAttention(a, c, 1000, ATTENDING), c)).toBe(1.25);
  });

  it('drains slower with Lingering Breath, and not at all on Still Pool while resting', () => {
    const lingering = learn(
      seated(),
      'qi-sensing-breath',
      'qi-grasping-breath',
      'qi-lingering-breath',
    );
    expect(
      tickAttention(sitting(lingering, { focus: 1 }), lingering, 100, ATTENDING).focus,
    ).toBeCloseTo(1 - 100 * FOCUS_DRAIN * 0.6);
    const pool = learn(lingering, 'qi-still-pool');
    expect(
      tickAttention(sitting(pool, { focus: 0.8, still: true }), pool, 100, ATTENDING).focus,
    ).toBe(0.8);
    // Without the node, resting on the dantian is only resting.
    const plain = seated();
    expect(
      tickAttention(sitting(plain, { focus: 0.8, still: true }), plain, 100, ATTENDING).focus,
    ).toBeLessThan(0.8);
  });

  it('fades to ×1 over a minute once you are away, and comes back to the floor at once', () => {
    const c = seated();
    const away = { ...ATTENDING, attended: false };
    const half = tickAttention(sitting(c, { focus: 1 }), c, AWAY_FADE_S / 2, away);
    expect(attentionFactor(half, c)).toBeGreaterThan(1.4);
    expect(attentionFactor(half, c)).toBeLessThan(1.6);
    const gone = tickAttention(half, c, AWAY_FADE_S, away);
    expect(attentionFactor(gone, c)).toBe(1);
    expect(seatOf(gone, c)).toEqual({ factor: 1, attended: false });
    expect(attentionFactor(tickAttention(gone, c, 0.25, ATTENDING), c)).toBeGreaterThanOrEqual(
      1.25,
    );
  });

  it('starts at zero on every load: nothing of it is saved', () => {
    const a = startAttention(life(seated()));
    expect(a).toMatchObject({ focus: 0, heat: 0, presence: 0, attended: false, orbs: [] });
  });
});

describe('breathing', () => {
  it('draws in the nearest orb in reach, more on the inhale, and starts a cooldown', () => {
    const c = seated();
    const timed = breathe(sitting(c, { t: INHALE_T, orbs: [orb(1, INHALE_T)] }), c);
    expect(inhaling(INHALE_T)).toBe(true);
    expect(timed.caught.map((x) => x.orb.id)).toEqual([1]);
    expect(timed.timed).toBe(true);
    expect(timed.attention.focus).toBeCloseTo(ORB_FOCUS * ORB_TIMED);
    expect(timed.attention.heat).toBeCloseTo(HEAT_PER_BREATH * HEAT_TIMED);
    expect(timed.attention.orbs).toEqual([]);
    const late = breathe(sitting(c, { t: EXHALE_T, orbs: [orb(1, EXHALE_T)] }), c);
    expect(late.timed).toBe(false);
    expect(late.attention.focus).toBeCloseTo(ORB_FOCUS);
    expect(late.attention.heat).toBeCloseTo(HEAT_PER_BREATH);
    // A second press inside the cooldown does nothing, caught or not.
    const again = breathe({ ...timed.attention, orbs: [orb(2, INHALE_T)] }, c);
    expect(again.caught).toEqual([]);
    const later = {
      ...timed.attention,
      t: INHALE_T + BREATHE_COOLDOWN_S,
      orbs: [orb(2, INHALE_T + BREATHE_COOLDOWN_S)],
    };
    expect(breathe(later, c).caught).toHaveLength(1);
  });

  it('names who breathes: another cultivator can’t breathe on this seat', () => {
    const c = seated();
    const a = sitting(c, { t: INHALE_T, orbs: [orb(1, INHALE_T)] });
    expect(breathe(a, { ...c, id: 'guest' }).caught).toEqual([]);
  });

  it('reaches only so far, further with Grasping Breath', () => {
    const c = seated();
    // Just in from the right edge of the cave: out of `breathe`'s reach.
    const far: Orb = { ...orb(1, INHALE_T, 0), born: INHALE_T - 0.4, arrives: INHALE_T + 3.6 };
    const a = sitting(c, { t: INHALE_T, orbs: [far] });
    const d = Math.hypot(orbPosition(far, INHALE_T)[0], orbPosition(far, INHALE_T)[1] - 9);
    expect(d).toBeGreaterThan(58);
    expect(breathe(a, c).caught).toEqual([]);
    const grasping = learn(c, 'qi-sensing-breath', 'qi-grasping-breath');
    expect(breathe(a, grasping).caught).toHaveLength(1);
  });

  it('catches the orb under a pointer, and two to a breath with Twin Streams', () => {
    const c = seated();
    const two = [orb(1, INHALE_T), orb(2, INHALE_T, Math.PI / 3)];
    const [x, y] = orbPosition(two[0]!, INHALE_T);
    const one = catchAt(sitting(c, { t: INHALE_T, orbs: two }), c, x, y);
    expect(one.caught.map((o) => o.orb.id)).toEqual([1]);
    const twin = learn(
      c,
      'qi-sensing-breath',
      'qi-grasping-breath',
      'qi-lingering-breath',
      'qi-still-pool',
      'qi-cooling-channels',
      'qi-twin-streams',
    );
    const both = catchAt(sitting(twin, { t: INHALE_T, orbs: two }), twin, x, y);
    expect(both.caught.map((o) => o.orb.id).sort()).toEqual([1, 2]);
    // One breath, one breath's heat.
    expect(both.attention.heat).toBeCloseTo(HEAT_PER_BREATH * HEAT_TIMED);
  });
});

describe('heat', () => {
  /** Three greedy grabs off the breath, one right after another. */
  function greedy(c: Cultivator) {
    let a = sitting(c, { t: EXHALE_T });
    for (let i = 0; i < 3; i++) {
      a = { ...a, orbs: [orb(10 + i, a.t)] };
      const [x, y] = orbPosition(a.orbs[0]!, a.t);
      a = catchAt(a, c, x, y).attention;
      a = tickAttention(a, c, 0.2, ATTENDING);
    }
    return a;
  }

  it('tips greed into unsettled: the bonus is gone and focus empties', () => {
    const c = seated();
    const a = greedy(c);
    expect(attentionFactor(a, c)).toBe(1);
    expect(a.focus).toBe(0);
    // Steady breathing is safe: heat cools between orbs.
    const cooled = tickAttention({ ...sitting(c), heat: 0.8 }, c, 10, ATTENDING);
    expect(cooled.heat).toBeCloseTo(0.8 - 10 * HEAT_COOLING);
  });

  it('holds more with Cooling Channels, and never rises in the tutorial layers', () => {
    const cool = learn(
      seated(),
      'qi-sensing-breath',
      'qi-grasping-breath',
      'qi-lingering-breath',
      'qi-still-pool',
      'qi-cooling-channels',
    );
    expect(attentionFactor(greedy(cool), cool)).toBeGreaterThan(1.25);
    const tutorial = seated(2);
    const t = greedy(tutorial);
    expect(t.heat).toBe(0);
    expect(t.focus).toBe(0);
    expect(attentionFactor(t, tutorial)).toBe(1.25);
  });
});

describe('the orbs stream', () => {
  /** An hour of ticks a quarter-second apart with the figure on screen; every orb seen. */
  function hour(s: GameState, c: Cultivator, at = ATTENDING) {
    let a = startAttention(s, c);
    const seen = new Map<number, Orb>();
    for (let i = 0; i < 4 * 3600; i++) {
      a = tickAttention(a, c, 0.25, at);
      for (const o of a.orbs) seen.set(o.id, o);
    }
    return { a, orbs: [...seen.values()] };
  }

  it('brings an orb every ten to twenty seconds, mostly arriving on the inhale', () => {
    const c = seated();
    const { orbs } = hour(life(c), c);
    expect(orbs.length).toBeGreaterThan(3600 / 20 - 5);
    expect(orbs.length).toBeLessThan(3600 / 10 + 5);
    const onInhale = orbs.filter((o) => inhaling(o.arrives)).length / orbs.length;
    expect(onInhale).toBeGreaterThan(0.6);
  });

  it('replays the same orbs from the same seed, on its own stream', () => {
    const c = seated();
    const s = life(c);
    const one = hour(s, c);
    const two = hour(s, c);
    expect(two.orbs).toEqual(one.orbs);
    const kept = keepOrbStream(s, one.a);
    expect(kept.rng.orbs).toBe(one.a.rng);
    expect({ ...kept.rng, orbs: undefined }).toEqual({ ...s.rng, orbs: undefined });
    // A reload carries on from where the stream stood.
    expect(startAttention(kept, c).rng).not.toBe(startAttention(s, c).rng);
  });

  it('brings none while the figure is off screen, or with no qi method', () => {
    const c = seated();
    expect(hour(life(c), c, { ...ATTENDING, abode: false }).orbs).toEqual([]);
    const bare = { ...c, activeMethods: { ...c.activeMethods, qi: null } };
    expect(hour(life(bare), bare).orbs).toEqual([]);
  });
});
