// F1: the feel pass's reading of the game (ui/feel.ts, ui/square.ts, ui/scene.ts's warning).
import { beforeEach, describe, expect, it } from 'vitest';
import { barSize } from '../core/cultivation.ts';
import { createLife, type Creation } from '../core/creation.ts';
import { finishAllGuides } from '../core/guides.ts';
import { giveHours, ratesHere, switchMethod } from '../core/life.ts';
import { knownMethods } from '../core/methods.ts';
import { freeWheel, hourToFlip } from '../core/wheel.ts';
import { ensureMap } from '../core/map/travel.ts';
import type { Encounter } from '../core/map/schema.ts';
import { addItem, type GameState } from '../core/state.ts';
import {
  dayBurn,
  deltas,
  deltaWords,
  lowStonesRearms,
  lowStonesWords,
  mergeDeltas,
} from './feel.ts';
import { useScene, warnThenStart, WARN_MS } from './scene.ts';
import { popNow } from './square.ts';

const creation: Creation = {
  name: 'Han Li',
  pronouns: 'they/them',
  look: '',
  mode: 'ironman',
  seed: 'feel',
  choice: 'along',
  roll: {
    root: 'true',
    elements: ['wood', 'fire'],
    body: 'farmhands-frame',
    soul: 'plain-mind',
    fate: 'ordinary-fate',
    origin: 'cave-orphan',
  },
};

const s0 = (): GameState => finishAllGuides(createLife(creation));
const withPlayer = (s: GameState, p: Partial<GameState['player']>): GameState => ({
  ...s,
  player: { ...s.player, ...p },
});

describe('the +n', () => {
  it('reads what a choice gave and took: stones by grade, insight, the qi bar and the bag', () => {
    const a = s0();
    const c = a.player;
    const b = withPlayer(a, {
      ...addItem(c, 'qi-gathering-pill', 1),
      stones: c.stones - 20,
      higherStones: { ...c.higherStones, mid: c.higherStones.mid + 2 },
      insight: { ...c.insight, current: c.insight.current + 3 },
      qi: { ...c.qi, bar: c.qi.bar + 40 },
    });
    expect(deltas(a, b).map(deltaWords)).toEqual([
      '−20',
      '+2 mid',
      '+3',
      '+40 qi',
      '+1 Qi-Gathering Pill',
    ]);
    expect(deltas(a, a)).toEqual([]);
  });

  it('leaves out a part-drunk stone, and the bar across a breakthrough', () => {
    const a = s0();
    const b = withPlayer(a, {
      stones: a.player.stones - 0.3,
      qi: { ...a.player.qi, stage: a.player.qi.stage + 1, bar: 0 },
    });
    expect(deltas(a, b)).toEqual([]);
  });

  it('sums the same thing from several steps, and drops what cancels', () => {
    expect(
      mergeDeltas([
        { kind: 'insight', n: 9 },
        { kind: 'stones', n: 5, grade: 0 },
        { kind: 'insight', n: 5 },
        { kind: 'stones', n: -5, grade: 0 },
      ]),
    ).toEqual([{ kind: 'insight', n: 14 }]);
  });
});

describe('the low-stones hint', () => {
  // A life with a qi hour on its wheel, burning stones in it.
  const qiDay = () => {
    const s0m = s0();
    const s = switchMethod(s0m, 'qi', knownMethods(s0m.player, 'qi')[0]!.id).state;
    return giveHours(s, [hourToFlip(freeWheel(s.player), s.player.rootElements)!], 'qi').state;
  };
  const burning = (stones: number) => {
    const s = qiDay();
    return withPlayer(s, { stones, plan: { ...s.player.plan, burnStones: true } });
  };

  it('counts a full qi day of burning as a day’s burn, and nothing when burning is off', () => {
    const s = burning(100);
    expect(dayBurn(s)).toBeCloseTo(ratesHere(s).stoneCap);
    expect(dayBurn(withPlayer(s, { plan: { ...s.player.plan, burnStones: false } }))).toBe(0);
  });

  it('fires once on the way under a day’s burn, and re-arms past two days’ worth', () => {
    const burn = dayBurn(burning(100));
    expect(burn).toBeGreaterThan(0);
    const above = burning(burn + 1);
    const under = burning(burn / 2);
    expect(lowStonesWords(above, under, true)).toMatch(/less than a day's burn/);
    expect(lowStonesWords(above, under, false)).toBeNull();
    expect(lowStonesWords(under, burning(burn / 3), true)).toBeNull();
    expect(lowStonesRearms(burning(burn * 1.5))).toBe(false);
    expect(lowStonesRearms(burning(burn * 2))).toBe(true);
  });
});

describe('the square pops up only what you can’t avoid', () => {
  const withEncounters = (s: GameState, states: Encounter['state'][]): GameState => {
    const m = ensureMap(s);
    const encounters = states.map((state, i) => ({ id: `e${i}`, state }) as unknown as Encounter);
    return { ...m, map: { ...m.map!, encounters } };
  };

  it('pops an encounter that stopped your road, not one sensed ahead', () => {
    expect(popNow(withEncounters(s0(), ['sensed']), [])).toBeNull();
    const s = withEncounters(s0(), ['sensed', 'waiting']);
    expect(popNow(s, [])).toEqual({ open: { kind: 'encounter', id: 'e1' }, key: 'enc:e1' });
    expect(popNow(s, ['enc:e1'])).toBeNull();
  });

  it('pops an urgent card on itself, and leaves a card that waits for you', () => {
    const s = s0();
    const quiet = {
      ...s,
      cards: { ...s.cards, pending: [{ uid: 7, card: 'rival-visit', day: 0 }] },
    };
    expect(popNow(quiet, [])).toBeNull();
    const thief = {
      ...s,
      cards: {
        ...s.cards,
        pending: [
          { uid: 7, card: 'rival-visit', day: 0 },
          { uid: 8, card: 'thief', day: 0 },
        ],
      },
    };
    expect(popNow(thief, [])).toEqual({ open: { kind: 'card', uid: 8 }, key: 'card:8' });
    expect(popNow(thief, ['card:8'])).toBeNull();
  });
});

describe('the breakthrough’s warning', () => {
  beforeEach(() => useScene.setState({ play: null, warn: null, panel: null }));

  it('stands WARN_MS over the figure before a certain step starts by itself', () => {
    const s = s0();
    const full = withPlayer(s, { qi: { ...s.player.qi, bar: barSize(s.player.qi) } });
    expect(warnThenStart(full, 'qi', 1000)).toBe(false);
    expect(useScene.getState().warn?.ladder).toBe('qi');
    expect(warnThenStart(full, 'qi', 1000 + WARN_MS - 1)).toBe(false);
    expect(warnThenStart(full, 'qi', 1000 + WARN_MS)).toBe(true);
    expect(useScene.getState().warn).toBeNull();
    expect(useScene.getState().play?.ladder).toBe('qi');
  });

  it('is taken down when nothing is due any more', () => {
    const s = s0();
    warnThenStart(s, 'qi', 0);
    warnThenStart(s, null, 10);
    expect(useScene.getState().warn).toBeNull();
  });
});
