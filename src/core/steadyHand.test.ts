// The steady hand (design § Professions, Crafts, thin, the hands-on version; A batch; K3): a batch
// played at the bench reads the mean hand over its hours, times Steady hands' reach, and moves only
// its rarity; the reach grows with the Hand's nodes and stops at two bands; Hand's lift counts only
// by hand; and the land lends its hand, earth fire on volcanic land and a land of the recipe's
// element.
import { describe, expect, it } from 'vitest';
import { slipId } from '../content/catalogs/index.ts';
import { CRAFT_MASTERY, HAND, LAND, recipe, recipeElement } from '../content/crafts.ts';
import { item } from '../content/items.ts';
import {
  handLift,
  handReach,
  holdOdds,
  landHand,
  liftOdds,
  liftOf,
  queueBatches,
  workBench,
} from './crafts.ts';
import { Rng } from './rng.ts';
import { loadSave, makeSave } from './save/format.ts';
import { addItem, newLife, withPlayer, type Cultivator } from './state.ts';
import { learnNode } from './trees.ts';

const QI_PILL = 'qi-gathering-pill';

/** A Comprehension alchemist with herbs for `n` batches, rich in insight, the soul lagging. */
function alchemist(n = 0, o: { matched?: boolean } = {}): Cultivator {
  const s = newLife({ name: 'Han Li', seed: 'steady-hand' });
  let c: Cultivator = {
    ...s.player,
    items: {},
    insight: { current: 1e6, earned: 1e6 },
    nodes: [...s.player.nodes, `${slipId(QI_PILL)}-node`],
  };
  c = addItem(c, 'crude-clay-furnace', 1);
  c = addItem(addItem(c, 'old-apricot-kernel', 6 * n), 'ridge-bitterroot', 4 * n);
  c = { ...c, crafts: { ...c.crafts, mastery: { 'qi-pills': CRAFT_MASTERY.batches[1]! } } };
  if (!o.matched) c = { ...c, qi: { ...c.qi, stage: 5 }, soul: { ...c.soul, stage: 3 } };
  return c;
}

function learnAll(c: Cultivator, ids: readonly string[]): Cultivator {
  return ids.reduce((acc, id) => {
    const r = learnNode(acc, id);
    expect(r.check, id).toEqual({ ok: true });
    return r.cultivator;
  }, c);
}

/** Brews `n` batches on 30 craft hours a stretch at a hand; the rarities that came out. */
function brew(c0: Cultivator, n: number, hand: number, seed = 1): string[] {
  let c = queueBatches(c0, QI_PILL, n).cultivator;
  const rng = new Rng(seed);
  for (let day = 0; day < 40 && (c.crafts.bench.length > 0 || c.crafts.front); day++)
    c = workBench(c, 3, day, rng, { hand }).cultivator;
  return c.crafts.recent.filter((b) => b.made).map((b) => item(b.made!).rarity);
}

const BANDS = ['white', 'green', 'blue'];
const meanBand = (rs: string[]) => rs.reduce((t, r) => t + BANDS.indexOf(r), 0) / rs.length;

describe('the steady hand', () => {
  const r = recipe(QI_PILL);

  it('adds the hand times the reach to the lift, and nothing to whether a batch holds', () => {
    const c = alchemist();
    expect(handReach(c, 'alchemy')).toBe(HAND.base);
    expect(liftOf(c, r, false, null, 0.8)).toBeCloseTo(liftOf(c, r, false, null) + 0.8, 9);
    // Comprehension at a 0.8 hand: 1.05, green for sure and a 5% shot at blue (design § A batch).
    expect(liftOf(c, r, false, null, 0.8)).toBeCloseTo(1.05, 9);
    expect(liftOdds(r, 1.05).map((x) => x.rarity)).toEqual(['green', 'blue']);
    expect(holdOdds(c, r)).toBe(0.7);
  });

  it('lands a batch played at a good hand a band higher than one queued', () => {
    const c = alchemist(12);
    const queued = brew(c, 12, 0);
    const played = brew(c, 12, 0.85);
    expect(queued.length).toBeGreaterThan(4);
    expect(played.length).toBeGreaterThan(4);
    expect(meanBand(played) - meanBand(queued)).toBeGreaterThanOrEqual(0.75);
    expect(played.every((x) => x !== 'white')).toBe(true);
  });

  it('reads the mean hand over the batch’s hours, so a batch sat at half its hours gets half', () => {
    let c = queueBatches(alchemist(1), QI_PILL, 1).cultivator;
    const rng = new Rng(3);
    c = workBench(c, 1.5, 0, rng, { hand: 1 }).cultivator;
    expect(c.crafts.front?.hand).toBeCloseTo(1.5, 9);
    c = workBench(c, 1.5, 1, rng).cultivator;
    const done = c.crafts.recent[0]!;
    if (done.made) expect(done.hand).toBe(0.5);
    expect(c.crafts.front).toBeNull();
  });

  it('grows the reach with the Hand’s nodes, a matched soul and Steady hands, never past two', () => {
    const base = learnAll(alchemist(), ['alchemy-qi-gathering-seal']);
    const lid = learnAll(base, ['alchemy-lid-watching']);
    expect(handReach(lid, 'alchemy')).toBeCloseTo(1.25, 9);
    const flame = learnAll(lid, [
      'alchemy-steady-pinch',
      'alchemy-clean-hands',
      'alchemy-steady-flame',
    ]);
    expect(handReach(flame, 'alchemy')).toBeCloseTo(1.75, 9);
    const matched = learnAll(alchemist(0, { matched: true }), ['alchemy-qi-gathering-seal']);
    expect(handReach(matched, 'alchemy')).toBeCloseTo(1 + HAND.matched, 9);
    const steady = { ...flame, talents: [...flame.talents, 'steady-hands'] };
    const most = { ...steady, soul: { ...steady.soul, realm: flame.qi.realm, stage: 9 } };
    expect(handReach(most, 'alchemy')).toBeLessThanOrEqual(HAND.most);
    // The Hand's lift and Fire control ride the hand: none queued, all of it at a full hand.
    expect(handLift(flame, 'alchemy', 0)).toBe(0);
    expect(handLift(flame, 'alchemy', 1)).toBeCloseTo(1.75 + 0.3, 9);
  });
});

describe('the land lends a hand', () => {
  const r = recipe(QI_PILL);

  it('gives earth fire on volcanic land to alchemy: +0.25 lift and +10 holding', () => {
    const c = alchemist();
    const fire = landHand(r, { terrain: 'volcanic', place: null });
    expect(fire).toEqual({ lift: LAND.lift, hold: LAND.hold, why: ['earth fire 地火'] });
    expect(holdOdds(c, r, fire)).toBeCloseTo(0.8, 9);
    expect(liftOf(c, r, false, null, 0, fire)).toBeCloseTo(0.5, 9);
    expect(landHand(r, { terrain: 'hills', place: null }).lift).toBe(0);
    expect(landHand(r, null).lift).toBe(0);
  });

  it('gives a land of the recipe’s element the same, and only once beside earth fire', () => {
    // Six kernels and four bitterroots, both wood: the Qi-Gathering Pill is a wood pill.
    expect(recipeElement(r)).toBe('wood');
    const forest = landHand(r, { terrain: 'forest', place: null });
    expect(forest.lift).toBe(LAND.lift);
    expect(forest.why).toEqual(['a land of wood']);
    expect(landHand(r, { terrain: 'marsh', place: null }).lift).toBe(0);
  });

  it('lifts the batches the bench brews on volcanic land', () => {
    const c = queueBatches(alchemist(12), QI_PILL, 12).cultivator;
    const run = (spot: { terrain: string; place: null } | null) => {
      let x = c;
      const rng = new Rng(9);
      for (let day = 0; day < 40 && (x.crafts.bench.length > 0 || x.crafts.front); day++)
        x = workBench(x, 3, day, rng, { spot }).cultivator;
      return x.crafts.recent.filter((b) => b.made).map((b) => item(b.made!).rarity);
    };
    const plain = run({ terrain: 'hills', place: null });
    const fire = run({ terrain: 'volcanic', place: null });
    // More batches hold (80% against 70%), and each lifts a quarter band more.
    expect(meanBand(fire)).toBeGreaterThan(meanBand(plain));
  });
});

describe('the save', () => {
  it('keeps the hand put into the batch in the furnace', () => {
    let s = newLife({ name: 'Han Li', seed: 'steady-hand-save' });
    let c = queueBatches(alchemist(1), QI_PILL, 1).cultivator;
    c = workBench(c, 1, 0, new Rng(1), { hand: 0.9 }).cultivator;
    s = withPlayer(s, c);
    const back = loadSave(JSON.parse(JSON.stringify(makeSave(s, 1))));
    expect(back.state.player.crafts.front?.hand).toBeCloseTo(0.9, 9);
  });
});
