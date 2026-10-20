// The crafts' engine (design § Professions, Crafts, thin; Recipes; A batch; K1): the soul gate,
// whether a batch holds, lift in bands, yield, blow-ups cracking the furnace and a refiner mending
// it, mastery by batches, the bench across days on Craft hours, and a Qi Condensation life that
// buys a furnace and herbs, learns the Qi-Gathering Pill, brews and sells.
import { describe, expect, it } from 'vitest';
import { slipId } from '../content/catalogs/index.ts';
import { CRAFT_MASTERY, recipe } from '../content/crafts.ts';
import { HOURS_PER_DAY } from '../content/hours.ts';
import { baseOf, item, variantId } from '../content/items.ts';
import { shopsAt, SHOPS } from '../content/shops.ts';
import {
  batchesHeld,
  benchWaits,
  cantBrew,
  craftReach,
  familyLevel,
  holdOdds,
  knowsRecipe,
  liftOdds,
  liftOf,
  planInputs,
  queueBatches,
  takeTray,
  workBench,
  yieldOf,
} from './crafts.ts';
import { cultivate, learn } from './life.ts';
import { ensureMap } from './map/travel.ts';
import { stonesOf, worthOf } from './purse.ts';
import { Rng } from './rng.ts';
import { loadSave, makeSave } from './save/format.ts';
import { buy, offerFor, repair, repairCost, sell, shelf } from './shops.ts';
import { addItem, newLife, withPlayer, type Cultivator, type GameState } from './state.ts';
import { hourKindOpen, openHours } from './wheel.ts';

const QI_PILL = 'qi-gathering-pill';
const slipNode = (id: string) => `${slipId(id)}-node`;

/** A fresh alchemist: the crude furnace, the recipe known, its mastery at a level, herbs for `n`. */
function alchemist(level = 0, n = 0, o: { matched?: boolean } = {}): Cultivator {
  const s = newLife({ name: 'Han Li', seed: 'craft' });
  let c: Cultivator = { ...s.player, items: {}, nodes: [...s.player.nodes, slipNode(QI_PILL)] };
  c = addItem(c, 'crude-clay-furnace', 1);
  c = addItem(addItem(c, 'old-apricot-kernel', 6 * n), 'ridge-bitterroot', 4 * n);
  const mastery = { 'qi-pills': CRAFT_MASTERY.batches[level]! };
  c = { ...c, crafts: { ...c.crafts, mastery } };
  // Most qi cultivators' souls lag; a matched soul is the soul keeping pace.
  if (!o.matched) c = { ...c, qi: { ...c.qi, stage: 5 }, soul: { ...c.soul, stage: 3 } };
  return c;
}

describe('the soul gate', () => {
  it('crafts at your realm’s tier, a matched soul keeping pace, a soul ahead reaching a tier up', () => {
    expect(craftReach(alchemist(0, 0, { matched: true }))).toEqual({
      tier: 1,
      reach: 1,
      matched: true,
    });
    expect(craftReach(alchemist()).matched).toBe(false);
    const c = alchemist();
    const ahead = {
      ...c,
      soul: { ...c.soul, realm: 'foundation-establishment' as const, stage: 1 },
    };
    expect(craftReach(ahead)).toEqual({ tier: 1, reach: 2, matched: true });
  });

  it('refuses a recipe you don’t know, or one above your reach', () => {
    const c = alchemist();
    expect(cantBrew(c, 'spring-returning-pill')).toMatch(/don’t know/);
    const knows = { ...c, nodes: [...c.nodes, slipNode('core-blood-pill')] };
    expect(knowsRecipe(knows, 'core-blood-pill')).toBe(true);
    expect(cantBrew(knows, 'core-blood-pill')).toMatch(/tier 2/);
    expect(queueBatches(knows, 'core-blood-pill').reason).toMatch(/tier 2/);
  });
});

describe('a batch', () => {
  it('holds by the family’s mastery, a matched soul ×1.25, a recipe below yours easier', () => {
    const r = recipe(QI_PILL);
    expect(holdOdds(alchemist(0), r)).toBeCloseTo(0.5);
    expect(holdOdds(alchemist(1), r)).toBeCloseTo(0.7);
    expect(holdOdds(alchemist(1, 0, { matched: true }), r)).toBeCloseTo(0.875);
    expect(holdOdds(alchemist(4, 0, { matched: true }), r)).toBeCloseTo(0.99);
    const c = alchemist(0);
    const foundation = {
      ...c,
      qi: { ...c.qi, realm: 'foundation-establishment' as const, stage: 1 },
    };
    expect(holdOdds(foundation, r)).toBeCloseTo(0.65);
  });

  it('lifts its rarity in bands, the whole ones certain and the fraction rolled, held to upTo', () => {
    const r = recipe(QI_PILL);
    const c = alchemist(1);
    expect(liftOf(c, r, false, item('crude-clay-furnace'))).toBeCloseTo(0.25);
    expect(liftOdds(r, 0.25)).toEqual([
      { rarity: 'white', chance: 0.75 },
      { rarity: 'green', chance: 0.25 },
    ]);
    // Inputs above the floor and a green furnace: 1.0, green for sure.
    expect(liftOf(c, r, true, item(variantId('bronze-pill-furnace', 'green')))).toBeCloseTo(1);
    // Origin, fine herbs and a blue furnace reach past blue; the pill stops at its upTo.
    const origin = alchemist(4);
    const lift = liftOf(origin, r, true, item(variantId('bronze-pill-furnace', 'blue')));
    expect(lift).toBeCloseTo(2);
    expect(liftOdds(r, lift + 1)).toEqual([{ rarity: 'blue', chance: 1 }]);
  });

  it('yields the written ten and 10% more a mastery level', () => {
    const r = recipe(QI_PILL);
    expect(yieldOf(alchemist(0), r)).toBe(10);
    expect(yieldOf(alchemist(1), r)).toBe(11);
    expect(yieldOf(alchemist(4), r)).toBe(14);
  });

  it('takes inputs above the floor only when every one can be, else the worst first', () => {
    // Ridge bitterroot comes only white, so the Qi-Gathering Pill never takes the inputs' lift;
    // the Spring-Returning Pill's kelp and kernel both come green.
    const r = recipe('spring-returning-pill');
    let c = addItem(addItem(alchemist(0), 'blood-salt-kelp', 6), 'old-apricot-kernel', 4);
    c = addItem(c, variantId('blood-salt-kelp', 'green'), 6);
    expect(planInputs(c, r).above).toBe(false);
    expect(planInputs(c, r).take['blood-salt-kelp']).toBe(6);
    c = addItem(c, variantId('old-apricot-kernel', 'green'), 4);
    expect(planInputs(c, r).above).toBe(true);
    expect(planInputs(c, r).take[variantId('blood-salt-kelp', 'green')]).toBe(6);
    expect(planInputs(alchemist(0, 0), recipe(QI_PILL)).short).toEqual([
      { thing: 'old-apricot-kernel', need: 6 },
      { thing: 'ridge-bitterroot', need: 4 },
    ]);
  });
});

describe('the bench', () => {
  it('runs a batch across days: inputs in at its first hour, done on its third', () => {
    let c = queueBatches(alchemist(1, 2), QI_PILL, 2).cultivator;
    const rng = new Rng(7);
    let r = workBench(c, 2, 0, rng);
    c = r.cultivator;
    expect(r.batches).toBe(0);
    expect(c.crafts.front).toMatchObject({ recipe: QI_PILL, hours: 2 });
    expect(batchesHeld(c, recipe(QI_PILL))).toBe(1);
    r = workBench(c, 2, 1, rng);
    c = r.cultivator;
    expect(r.batches).toBe(1);
    expect(c.crafts.front).toMatchObject({ hours: 1 });
    expect(c.crafts.bench).toEqual([{ recipe: QI_PILL, batches: 1 }]);
    expect(c.crafts.recent).toHaveLength(1);
  });

  it('waits, and says why, with no herbs or no furnace', () => {
    const c = queueBatches(alchemist(0, 0), QI_PILL).cultivator;
    expect(benchWaits(c)).toMatch(/Short 6 Old Apricot Kernel and 4 Ridge Bitterroot/);
    expect(workBench(c, 12, 0, new Rng(1)).batches).toBe(0);
    const bare = addItem(addItem(c, 'crude-clay-furnace', -1), 'old-apricot-kernel', 6);
    expect(benchWaits(bare)).toMatch(/no furnace/);
  });

  it('fails and blows up at Glimpse, cracking the furnace until a refiner mends it', () => {
    let c = queueBatches(alchemist(0, 40), QI_PILL, 40).cultivator;
    const r = workBench(c, 3 * 40, 0, new Rng(3));
    c = r.cultivator;
    const failed = c.crafts.recent.filter((b) => !b.made);
    expect(r.events.some((e) => e.type === 'blow-up')).toBe(true);
    expect(failed.length).toBeGreaterThan(0);
    const cracked = Object.keys(c.items).find((id) => item(id).cracked)!;
    expect(baseOf(cracked)).toBe('crude-clay-furnace');
    expect(benchWaits(c)).toMatch(/cracked/);
    // A refiner mends it for a tenth of its worth.
    let s = withPlayer(newLife({ name: 'Han Li', seed: 'craft' }), { ...c, stones: 100 });
    const refiner = SHOPS.find((sh) => sh.kind === 'refiner')!.id;
    expect(repairCost(s, cracked)).toBeCloseTo(3, 0);
    const mended = repair(s, refiner, cracked);
    expect(mended.ok).toBe(true);
    if (mended.ok) s = mended.state;
    expect(s.player.items['crude-clay-furnace']).toBe(1);
  });

  it('raises the family to Comprehension near ten batches', () => {
    let c = queueBatches(alchemist(0, 30), QI_PILL, 30).cultivator;
    let batches = 0;
    const rng = new Rng(11);
    const cracked = variantId('crude-clay-furnace', 'white', { cracked: true });
    for (let tries = 0; familyLevel(c, 'qi-pills') < 1 && tries < 60; tries++) {
      // A blow-up's cracked furnace is mended before the next batch.
      if (c.items[cracked]) c = addItem(addItem(c, cracked, -1), 'crude-clay-furnace', 1);
      const r = workBench(c, 3, tries, rng);
      c = r.cultivator;
      batches += r.batches;
    }
    expect(familyLevel(c, 'qi-pills')).toBe(1);
    expect(batches).toBeGreaterThanOrEqual(10);
    expect(batches).toBeLessThanOrEqual(20);
    // The level releases its insight, and the chronicle says so.
    expect(c.insight.earned).toBeGreaterThanOrEqual(CRAFT_MASTERY.burst[1]);
  });

  it('puts what a full Bag can’t hold in the tray, and takes it out when there is room', () => {
    let c = queueBatches(alchemist(1, 1), QI_PILL).cultivator;
    // A Bag with no room: every square full of something.
    c = { ...c, items: { ...c.items, 'travel-rations': 99 * 20 } };
    const r = workBench(c, 3, 0, new Rng(2));
    const made = r.cultivator.crafts.recent[0]!.made;
    if (made) {
      expect(r.cultivator.crafts.tray[made]).toBeGreaterThan(0);
      const room = { ...r.cultivator, items: { ...r.cultivator.items, 'travel-rations': 0 } };
      expect(takeTray(room).crafts.tray).toEqual({});
    }
  });
});

describe('in play', () => {
  it('opens Craft hours without taking one, the first time you hold a furnace', () => {
    const s = newLife({ name: 'Han Li', seed: 'craft' });
    const c = addItem(s.player, 'crude-clay-furnace', 1);
    const opened = openHours(c).cultivator;
    expect(hourKindOpen(opened, 'craft')).toBe(true);
    expect(opened.wheel).toEqual(c.wheel);
  });

  it('a Qi Condensation life buys a furnace and herbs, learns the pill, brews and sells', () => {
    let s: GameState = ensureMap(newLife({ name: 'Han Li', seed: 'brewer' }));
    s = withPlayer(s, { ...s.player, stones: 300, items: {} });
    const market = 'qm-shoukou-cheng';
    const shelves = () => shopsAt(market).flatMap((id) => shelf(s, id).map((l) => ({ id, l })));
    const buyAll = (thing: string, n: number) => {
      let need = n;
      for (const { id, l } of shelves().filter((x) => baseOf(x.l.thing) === thing)) {
        if (need <= 0) break;
        if (l.thing !== thing) continue;
        const r = buy(s, id, l.slot, Math.min(need, l.n));
        if (!r.ok) continue;
        need -= Math.min(need, l.n);
        s = r.state;
      }
      return need <= 0;
    };
    expect(buyAll('crude-clay-furnace', 1)).toBe(true);
    expect(buyAll('old-apricot-kernel', 12)).toBe(true);
    expect(buyAll('ridge-bitterroot', 8)).toBe(true);
    // The slip, read and learned: the reading itself is the copies' (core/reading.ts), so the
    // test hands the node its insight.
    s = withPlayer(s, {
      ...s.player,
      manuals: [...s.player.manuals, slipId(QI_PILL)],
      insight: { current: 100, earned: 100 },
    });
    const learned = learn(s, slipNode(QI_PILL));
    expect(learned.check.ok).toBe(true);
    s = learned.state;
    expect(knowsRecipe(s.player, QI_PILL)).toBe(true);
    // Four Craft hours on the wheel and two batches on the bench.
    const wheel = s.player.wheel.map((k, i) => (i >= 4 && i < 8 ? 'craft' : k));
    s = withPlayer(s, queueBatches({ ...s.player, wheel }, QI_PILL, 2).cultivator);
    for (let d = 0; d < 3; d++) {
      s = cultivate({ ...s, calendar: { ...s.calendar, day: s.calendar.day + 1 } }, 1);
    }
    expect(s.player.crafts.recent.length).toBe(2);
    expect(s.player.crafts.bench).toEqual([]);
    const pills = Object.keys(s.player.items).filter((id) => baseOf(id) === QI_PILL);
    if (pills.length > 0) {
      const before = worthOf(stonesOf(s.player));
      for (const id of pills) {
        const shop = shopsAt(market).find((sh) => offerFor(s, sh, id).ok)!;
        const r = sell(s, shop, id, s.player.items[id]!);
        expect(r.ok).toBe(true);
        if (r.ok) s = r.state;
      }
      expect(worthOf(stonesOf(s.player))).toBeGreaterThan(before);
    }
    expect(s.unlocks).toContain('crafts');
  });
});

describe('the save', () => {
  it('brings a v42 life up with an empty bench', () => {
    const s = newLife({ name: 'Han Li', seed: 'save' });
    const raw = JSON.parse(JSON.stringify(makeSave(s, 1))) as {
      version: number;
      state: { player: { crafts?: unknown } };
    };
    raw.version = 42;
    delete raw.state.player.crafts;
    const back = loadSave(raw);
    expect(back.version).toBe(43);
    expect(back.state.player.crafts).toEqual({
      bench: [],
      front: null,
      tray: {},
      mastery: {},
      recent: [],
    });
  });

  it('keeps a bench, a cracked furnace and the mastery through a save', () => {
    const c = queueBatches(alchemist(1, 2), QI_PILL, 3).cultivator;
    const worked = workBench(
      addItem(c, variantId('crude-clay-furnace', 'white', { cracked: true }), 1),
      HOURS_PER_DAY / 6,
      0,
      new Rng(5),
    ).cultivator;
    const s = withPlayer(newLife({ name: 'Han Li', seed: 'save' }), worked);
    const back = loadSave(JSON.parse(JSON.stringify(makeSave(s, 1))));
    expect(back.state.player.crafts).toEqual(worked.crafts);
    expect(back.state.player.items['crude-clay-furnace~white~crk']).toBe(1);
  });
});
