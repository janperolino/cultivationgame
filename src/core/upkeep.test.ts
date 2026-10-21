// K11: methods that eat resources, and arts that burn goods (design § Professions, people and
// powers). A fed upkeep method climbs and leaves its growth a band rarer for light upkeep and two
// for heavy, and stalls unfed; it drinks stones, a thing by name or any thing of a kind; stone
// swallowing widens the burn at half worth past the old cap; the volley, detonation, flags set
// mid-fight and the burning pill; great-sect young masters run heavy methods.
import { describe, expect, it } from 'vitest';
import { DETONATE_ATTACK, REACH } from '../content/combat.ts';
import { stepSize, tierStep } from '../content/realms.ts';
import { item } from '../content/items.ts';
import { method } from '../content/methods.ts';
import { rarityMultiplier } from '../content/rarity.ts';
import { technique } from '../content/techniques.ts';
import { combatant, fromCultivator, type CombatantInit } from './combat/combatant.ts';
import { combatantIn, resolveTurn, startFight, type Action, type Fight } from './combat/fight.ts';
import { generateCultivator, runsHeavy } from './combat/generate.ts';
import { rungSize, type Rung } from './combat/sheet.ts';
import { BORDER_WILDS, type CultivatorTemplate } from '../content/roster.ts';
import { carriedStones } from './loot.ts';
import {
  attemptBreakthrough,
  cultivateDays,
  dayRates,
  stonesQi,
  type LadderId,
} from './cultivation.ts';
import { slipId } from '../content/catalogs/index.ts';
import { CRAFT_MASTERY } from '../content/crafts.ts';
import { queueBatches, workBench } from './crafts.ts';
import { consumeItem } from './items.ts';
import { learnMethod, methodNeed, methodSpeed, runningRarity } from './methods.ts';
import { afterFight, takeUpFlags } from './played.ts';
import { stonesOf, worthOf } from './purse.ts';
import { Rng } from './rng.ts';
import { addItem, newLife, withPlayer, type Cultivator, type Ladder } from './state.ts';

const life = () => newLife({ name: 'Han Li', seed: 'upkeep' });
const DAY = life().calendar.day;
const roll = (x: number, day = DAY) => ({ day, rng: { next: () => x } as unknown as Rng });
const at = (c: Cultivator, which: LadderId, l: Partial<Ladder>): Cultivator => ({
  ...c,
  [which]: { ...c[which], ...l },
});
/** Climbs a ladder with a method at Mastery, its stones off unless asked. */
function on(c: Cultivator, id: string, burn = false): Cultivator {
  const m = method(id);
  const learned = learnMethod(c, id);
  return {
    ...learned,
    plan: { ...learned.plan, burnStones: burn },
    methods: { ...learned.methods, [id]: { practice: methodNeed(m, 2), fedUntil: 0 } },
    activeMethods: { ...learned.activeMethods, [m.ladder]: id },
  };
}
const qi4 = (c: Cultivator) => at(c, 'qi', { stage: 4 });

describe('what upkeep buys', () => {
  it('climbs a band rarer fed on light upkeep, at its written price', () => {
    const c = { ...on(qi4(life().player), 'counting-stone-breathing'), stones: 10 };
    expect(runningRarity(c, method('counting-stone-breathing'))).toBe('green');
    expect(methodSpeed(c, 'qi').rarity).toBeCloseTo(rarityMultiplier('green', tierStep(1)));
    const fed = cultivateDays(c, 1, roll(0.5)).cultivator;
    expect(worthOf(stonesOf(fed))).toBeCloseTo(9.5);
    expect(fed.qi.bar).toBeGreaterThan(0);
  });

  it('climbs two bands rarer fed on heavy upkeep, and stalls unfed', () => {
    const c = addItem(on(qi4(life().player), 'pill-fed-tide-breathing'), 'qi-gathering-pill', 3);
    expect(runningRarity(c, method('pill-fed-tide-breathing'))).toBe('purple');
    const fed = cultivateDays(c, 1, roll(0.5)).cultivator;
    expect(fed.items['qi-gathering-pill']).toBe(2);
    expect(fed.qi.bar).toBeGreaterThan(0);
    const starved = cultivateDays({ ...c, items: {} }, 1, roll(0.5)).cultivator;
    expect(starved.qi.bar).toBe(0);
    expect(starved.methods['pill-fed-tide-breathing']!.starved).toBe(true);
    expect(runningRarity(starved, method('pill-fed-tide-breathing'))).toBe('green');
  });

  it('feeds on an alchemist’s own pills at any rarity, the plainest first', () => {
    let c = on(qi4(life().player), 'pill-fed-tide-breathing');
    c = addItem(addItem(c, 'qi-gathering-pill~green', 1), 'qi-gathering-pill~blue', 1);
    const fed = cultivateDays(c, 1, roll(0.5)).cultivator;
    expect(fed.items['qi-gathering-pill~green']).toBeUndefined();
    expect(fed.items['qi-gathering-pill~blue']).toBe(1);
  });

  it('feeds from the alchemist’s own furnace: pills brewed at the bench, then drunk', () => {
    const s = newLife({ name: 'Han Li', seed: 'craft' });
    let c: Cultivator = {
      ...s.player,
      items: {},
      nodes: [...s.player.nodes, `${slipId('qi-gathering-pill')}-node`],
    };
    c = addItem(c, 'crude-clay-furnace', 1);
    c = addItem(addItem(c, 'old-apricot-kernel', 12), 'ridge-bitterroot', 8);
    c = { ...c, crafts: { ...c.crafts, mastery: { 'qi-pills': CRAFT_MASTERY.batches[2]! } } };
    c = { ...qi4(c), soul: { ...c.soul, stage: 4 } };
    c = queueBatches(c, 'qi-gathering-pill', 2).cultivator;
    const rng = new Rng(7);
    for (let day = 0; day < 4; day++) c = workBench(c, 4, day, rng).cultivator;
    const brewed = Object.entries(c.items)
      .filter(([id]) => id.startsWith('qi-gathering-pill'))
      .reduce((n, [, k]) => n + k, 0);
    expect(brewed).toBeGreaterThan(0);
    const fed = cultivateDays(on(c, 'pill-fed-tide-breathing'), 1, roll(0.5)).cultivator;
    expect(fed.methods['pill-fed-tide-breathing']!.starved).toBeUndefined();
    expect(fed.qi.bar).toBeGreaterThan(0);
  });

  it('leaves the fed band’s growth on a stage climbed, the written one starved', () => {
    const ready = (c: Cultivator) =>
      at(c, 'qi', { stage: 4, bar: stepSize('qi-condensation', 4) * 1.2 });
    const fed = ready(on(life().player, 'pill-fed-tide-breathing'));
    const r = attemptBreakthrough(fed, 'qi', roll(0));
    expect(r.cultivator.qi.growth.at(-1)!.rarity).toBe('purple');
    const starved = {
      ...fed,
      methods: {
        ...fed.methods,
        'pill-fed-tide-breathing': { ...fed.methods['pill-fed-tide-breathing']!, starved: true },
      },
    };
    expect(attemptBreakthrough(starved, 'qi', roll(0)).cultivator.qi.growth.at(-1)!.rarity).toBe(
      'green',
    );
  });

  it('takes an herb bath of any three tier 1 herbs', () => {
    let c = on(at(life().player, 'body', { stage: 4 }), 'hundred-herb-bath-art');
    c = { ...c, wheel: c.wheel.map(() => 'body' as const) };
    c = addItem(addItem(c, 'calm-heart-grass', 2), 'beast-blood-vine', 2);
    const fed = cultivateDays(c, 1, roll(0.5)).cultivator;
    const left = (fed.items['calm-heart-grass'] ?? 0) + (fed.items['beast-blood-vine'] ?? 0);
    expect(left).toBe(1);
  });

  it('goes further with Frugal upkeep: a day paid feeds 1 ÷ (1 − the cut)', () => {
    const fe = at(life().player, 'qi', { realm: 'foundation-establishment', stage: 1 });
    const c = { ...on(fe, 'whale-swallowing-stone-scripture'), stones: 100 };
    const frugal = { ...c, nodes: [...c.nodes, 'qi-vein-drinking'] };
    const r = cultivateDays(frugal, 1, roll(0.5)).cultivator;
    expect(worthOf(stonesOf(r))).toBeCloseTo(100 - 18);
    expect(r.methods['whale-swallowing-stone-scripture']!.fedUntil).toBeCloseTo(DAY + 1 / 0.9);
  });
});

describe('stone swallowing 吞灵石', () => {
  it('doubles the stones a day can burn, those past the old cap at half worth', () => {
    const base = at(life().player, 'qi', { realm: 'foundation-establishment', stage: 1 });
    const plain = { ...on(base, 'garrison-standard-foundation', true), stones: 10_000 };
    const whale = {
      ...on(base, 'whale-swallowing-stone-scripture', true),
      stones: 10_000,
    };
    const p = dayRates(plain, DAY);
    const w = dayRates(whale, DAY);
    expect(w.stoneCap).toBeCloseTo(2 * w.baseCap);
    expect(w.baseCap).toBeCloseTo(p.baseCap);
    // The second half of the cap gives half: 1.5 × the plain cap's qi in all.
    expect(stonesQi(w, 1, w.stoneCap)).toBeCloseTo(1.5 * stonesQi(w, 1, w.baseCap));
  });

  it('feeds a pill’s days further with Pill fuel', () => {
    const c = life().player;
    const plain = consumeItem(addItem(c, 'qi-gathering-pill', 1), 'qi-gathering-pill', DAY).fuel;
    const tide = on(addItem(c, 'qi-gathering-pill', 1), 'pill-fed-tide-breathing');
    expect(consumeItem(tide, 'qi-gathering-pill', DAY).fuel).toBeCloseTo(plain * 1.05);
  });
});

// ---------------------------------------------------------------- the arts that burn goods

const QC = (stage: number): Rung => ({ realm: 'qi-condensation', stage, grade: 0 });
const all = (r: Rung) => ({ qi: r, body: r, soul: r });
const fighter = (init: CombatantInit) => combatant({ maxShield: 0, ...init });
const turn = (f: Fight, actions: Action[], seed = 0) => resolveTurn(f, actions, new Rng(seed));
const foes = (n: number) =>
  Array.from({ length: n }, (_, i) =>
    fighter({ id: `f${i}`, name: `F${i}`, side: 'foes', rungs: all(QC(5)), maxHp: 5000 }),
  );

describe('the talisman volley', () => {
  const thrower = (tier: number) =>
    fighter({
      id: 'me',
      name: 'Me',
      side: 'me',
      rungs: all(QC(5)),
      talismanTier: tier,
      techniques: {
        'five-pearl-talisman-chain': {
          technique: technique('five-pearl-talisman-chain'),
          accuracy: 1,
        },
      },
      items: { 'ember-talisman': { item: item('ember-talisman'), n: 7 } },
    });

  it('throws five talismans in one action, each a cast of its own, for the art’s qi once', () => {
    const f = startFight([thrower(1), ...foes(3)]);
    const r = turn(f, [
      {
        actor: 'me',
        main: {
          type: 'volley',
          id: 'five-pearl-talisman-chain',
          item: 'ember-talisman',
          target: 'f0',
        },
      },
    ]);
    expect(r.outcomes).toHaveLength(5);
    expect(r.outcomes.every((o) => o.action === 'volley' && o.id === 'ember-talisman')).toBe(true);
    expect(r.outcomes.filter((o) => o.qi !== undefined)).toHaveLength(1);
    expect(combatantIn(r.fight, 'me')!.items['ember-talisman']!.n).toBe(2);
  });

  it('turns tempo’s extra action into a strike, never a second volley (review 2026-10-21)', () => {
    const f = startFight([thrower(1), ...foes(3)]);
    // A whole action banked: the turn's tempo acts again.
    combatantIn(f, 'me')!.marks.tempo = 1;
    const r = turn(f, [
      {
        actor: 'me',
        main: {
          type: 'volley',
          id: 'five-pearl-talisman-chain',
          item: 'ember-talisman',
          target: 'f0',
        },
      },
    ]);
    expect(combatantIn(r.fight, 'me')!.items['ember-talisman']!.n).toBe(2);
    expect(
      r.outcomes.filter((o) => o.actor === 'me' && o.action !== 'volley').length,
    ).toBeGreaterThan(0);
  });

  it('is thrown only with the Talismans Dao held to its tier', () => {
    const f = startFight([thrower(0), ...foes(1)]);
    const r = turn(f, [
      {
        actor: 'me',
        main: {
          type: 'volley',
          id: 'five-pearl-talisman-chain',
          item: 'ember-talisman',
          target: 'f0',
        },
      },
    ]);
    expect(r.skipped).toContainEqual({ actor: 'me', reason: 'the Talismans Dao is not held' });
  });
});

describe('artifact detonation 自爆法宝', () => {
  it('strikes its tier’s blast of foes at ×5, never misses, and the piece is gone', () => {
    const me = fighter({
      id: 'me',
      name: 'Me',
      side: 'me',
      rungs: all(QC(5)),
      items: { 'iron-sword': { item: item('iron-sword'), n: 1 } },
    });
    const f = startFight([me, ...foes(7)]);
    const r = turn(
      f,
      [{ actor: 'me', main: { type: 'detonate', id: 'iron-sword', target: 'f0' } }],
      36,
    );
    expect(r.outcomes).toHaveLength(REACH[0]!.blast);
    expect(r.outcomes.every((o) => o.result === 'hit' || o.result === 'critical')).toBe(true);
    expect(combatantIn(r.fight, 'me')!.items['iron-sword']!.n).toBe(0);
    expect(DETONATE_ATTACK).toBe(5);
  });
});

describe('flags set mid-fight', () => {
  it('stand a killing array for your side from the next turn, its eye drawn from your stones', () => {
    const me = fighter({
      id: 'me',
      name: 'Me',
      side: 'me',
      rungs: all(QC(5)),
      stones: 10,
      items: { 'sword-qi-disc': { item: item('sword-qi-disc'), n: 1 } },
    });
    const f = startFight([me, ...foes(2)]);
    const r = turn(f, [{ actor: 'me', main: { type: 'flags', id: 'sword-qi-disc' } }]);
    expect(r.fight.arrays).toHaveLength(1);
    expect(combatantIn(r.fight, 'me')!.stones).toBeCloseTo(7);
    const next = turn(r.fight, []);
    expect(next.ground?.filter((g) => g.does === 'killing')).toHaveLength(2);
    // One a fight.
    const again = turn(r.fight, [{ actor: 'me', main: { type: 'flags', id: 'sword-qi-disc' } }]);
    expect(again.skipped[0]!.reason).toMatch(/holds no|one array/);
  });

  it('are taken up again by whoever holds the field, and the stones are paid', () => {
    const s0 = life();
    const s = withPlayer(s0, addItem({ ...s0.player, stones: 10 }, 'sword-qi-disc', 1));
    const me = { ...fromCultivator(s.player, 'you') };
    const f = startFight([me, ...foes(1)]);
    const r = turn(f, [{ actor: s.player.id, main: { type: 'flags', id: 'sword-qi-disc' } }]);
    const after = afterFight(s, r.fight);
    expect(after.player.items['sword-qi-disc']).toBeUndefined();
    expect(worthOf(stonesOf(after.player))).toBeCloseTo(7);
    expect(takeUpFlags(after, r.fight, 'won', false).player.items['sword-qi-disc']).toBe(1);
    expect(
      takeUpFlags(after, r.fight, 'fled', false).player.items['sword-qi-disc'],
    ).toBeUndefined();
  });
});

describe('the burning pill 燃血丹', () => {
  const burner = (n = 1) =>
    fighter({
      id: 'me',
      name: 'Me',
      side: 'me',
      rungs: all(QC(9)),
      items: { 'blood-burning-pill': { item: item('blood-burning-pill'), n } },
    });

  it('lifts every rung a realm step for three turns, then weakens to half for the day', () => {
    const f = startFight([burner(), ...foes(1)]);
    const size = rungSize(QC(9));
    let r = turn(f, [{ actor: 'me', main: { type: 'item', id: 'blood-burning-pill' } }]);
    const lifted = rungSize(combatantIn(r.fight, 'me')!.rungs.qi);
    expect(lifted / size).toBeCloseTo(tierStep(1), 1);
    r = turn(r.fight, []);
    r = turn(r.fight, []);
    expect(rungSize(combatantIn(r.fight, 'me')!.rungs.body) / size).toBeCloseTo(tierStep(1), 1);
    r = turn(r.fight, []);
    const me = combatantIn(r.fight, 'me')!;
    expect(rungSize(me.rungs.qi) / size).toBeCloseTo(0.5, 2);
    expect(me.weakened).toBe(true);
    // A second pill does nothing that day.
    const again = turn(startFight([burner(2), ...foes(1)]), [
      { actor: 'me', main: { type: 'item', id: 'blood-burning-pill' } },
    ]);
    const twice = turn(again.fight, [
      { actor: 'me', main: { type: 'item', id: 'blood-burning-pill' } },
    ]);
    expect(twice.skipped[0]!.reason).toMatch(/burned already/);
  });

  it('works only at its own tier', () => {
    const fe = fighter({
      id: 'me',
      name: 'Me',
      side: 'me',
      rungs: all({ realm: 'foundation-establishment', stage: 1, grade: 0 }),
      items: { 'blood-burning-pill': { item: item('blood-burning-pill'), n: 1 } },
    });
    const r = turn(startFight([fe, ...foes(1)]), [
      { actor: 'me', main: { type: 'item', id: 'blood-burning-pill' } },
    ]);
    expect(r.skipped[0]!.reason).toMatch(/not of your realm/);
  });

  it('burns longer a rarity up: white 3 turns, blue 5', () => {
    const blue = fighter({
      id: 'me',
      name: 'Me',
      side: 'me',
      rungs: all(QC(9)),
      items: { x: { item: item('blood-burning-pill~blue'), n: 1 } },
    });
    const r = turn(startFight([blue, ...foes(1)]), [
      { actor: 'me', main: { type: 'item', id: 'x' } },
    ]);
    expect(combatantIn(r.fight, 'me')!.burning).toBe(5);
  });

  it('leaves you weakened until the day ends, out of the fight too', () => {
    const s0 = life();
    const s = withPlayer(s0, addItem(at(s0.player, 'qi', { stage: 9 }), 'blood-burning-pill', 1));
    const f = startFight([fromCultivator(s.player, 'you'), ...foes(1)]);
    const r = turn(f, [{ actor: s.player.id, main: { type: 'item', id: 'blood-burning-pill' } }]);
    const after = afterFight(s, r.fight);
    expect(after.player.weakUntil).toBe(Math.floor(s.calendar.day) + 1);
    expect(fromCultivator(after.player, 'you').weakened).toBe(true);
  });
});

describe('great-sect young masters', () => {
  it('run a heavy method one in three, every sacred land’s and chosen one’s, never a rogue', () => {
    let heavy = 0;
    for (let seed = 0; seed < 3000; seed++) if (runsHeavy(seed, 'great-sect')) heavy++;
    expect(heavy / 3000).toBeGreaterThan(0.28);
    expect(heavy / 3000).toBeLessThan(0.39);
    expect(runsHeavy(1, 'chosen')).toBe(true);
    expect(runsHeavy(1, 'rogue')).toBe(false);
  });

  it('carry a month of its stones and a burning pill', () => {
    const great = BORDER_WILDS.find((x) => x.kind === 'cultivator')!;
    const t = { ...great, kind: 'cultivator' as const, pedigree: 'sacred-land' as const };
    const n = generateCultivator(t as CultivatorTemplate, 'qi-condensation', 9, new Rng(4));
    expect(n.heavy).toBe(true);
    expect(n.consumables.some((c) => c.uses.burn)).toBe(true);
    expect(carriedStones(n)).toBeGreaterThanOrEqual(60);
  });
});
