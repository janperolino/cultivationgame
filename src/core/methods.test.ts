import { describe, expect, it } from 'vitest';
import { eventText, noteText } from './chronicle.ts';
import { GROWTH_STATS, METHODS, method, nextChapter, previousChapter } from '../content/methods.ts';
import { METHOD_MASTERY, TECHNIQUE_MASTERY } from '../content/mastery.ts';
import { RARITIES, rarity, rarityMultiplier, rollRarity } from '../content/rarity.ts';
import { realmSize, realmSpread, stepSize, tierStep } from '../content/realms.ts';
import { MAJOR_INJURY_DAYS } from '../content/cultivation.ts';
import {
  attemptBreakthrough,
  cultivateDays,
  dayRates,
  majorCheck,
  minorOdds,
  qiSpeed,
  temper,
  type LadderId,
} from './cultivation.ts';
import { ladderGrowth, realmGrowth, stageGrowth } from './growth.ts';
import { contemplate, contemplationLeft, masteryBurst } from './insight.ts';
import { gainTechnique, switchMethod } from './life.ts';
import { burstAt, chapterStartLevel } from './mastery.ts';
import {
  canTakeUp,
  learnMethod,
  methodMastery,
  methodNeed,
  methodSpeed,
  setActiveMethod,
  tierBonus,
} from './methods.ts';
import type { Rng } from './rng.ts';
import {
  addItem,
  freshLadder,
  newLife,
  withPlayer,
  type Cultivator,
  type Ladder,
} from './state.ts';
import { stats } from './stats.ts';
import {
  canLearnTechnique,
  kinshipBonus,
  learnTechnique,
  mastery,
  techniqueKin,
} from './techniques.ts';
import { openHours } from './wheel.ts';

type LifeOpts = Partial<Parameters<typeof newLife>[0]>;

const life = (opts: LifeOpts = {}) => newLife({ name: 'Han Li', seed: 'methods', ...opts });
const player = (opts: LifeOpts = {}) => life(opts).player;
const DAY = life().calendar.day;
/** A rule context whose one roll is `x`: 0 always succeeds, 0.999 almost always fails. */
const roll = (x: number, day = DAY) => ({ day, rng: { next: () => x } as unknown as Rng });

const at = (c: Cultivator, which: LadderId, l: Partial<Ladder>): Cultivator => ({
  ...c,
  [which]: { ...c[which], ...l },
});

/** Learns a method and climbs its ladder with it at a mastery level (2 is Mastery, ×1). */
function on(c: Cultivator, id: string, level = 2): Cultivator {
  const m = method(id);
  const learned = learnMethod(c, id);
  return {
    ...learned,
    methods: { ...learned.methods, [id]: { practice: methodNeed(m, level), fedUntil: 0 } },
    activeMethods: { ...learned.activeMethods, [m.ladder]: id },
  };
}

/** Qi at layer 9 with its bar at `fill`, `earned` insight and a Foundation Pill. */
function ready(c: Cultivator, fill = 1, earned = 500): Cultivator {
  const qi = { stage: 9, bar: stepSize('qi-condensation', 9) * fill };
  return addItem({ ...at(c, 'qi', qi), insight: { current: 0, earned } }, 'foundation-pill', 1);
}

const ORIGIN_METHODS = [
  'garrison-standard',
  'crude-cave',
  'cadet-spear',
  'butcher-saber',
  'night-bridge',
  'bounty-scrap',
];

describe('rarity', () => {
  it('is a band in stage words, measured in the step out of the thing’s own tier', () => {
    expect([1, 2, 3, 4, 9].map(tierStep)).toEqual([3.1, 4.6, 6.7, 10, 46]);
    // The design's rows: tier 1 (step ×3.1) and tier 3 (step ×6.7).
    const rows = {
      3.1: [0.8, 1, 1.2, 1.5, 2.5, 3.1, 4.35, 7.65],
      6.7: [0.8, 1, 1.2, 1.5, 4.6, 6.7, 11.85, 30.65],
    };
    for (const [step, row] of Object.entries(rows)) {
      RARITIES.forEach((r, i) => {
        expect(rarityMultiplier(r.id, Number(step)), `${r.id} at ×${step}`).toBeCloseTo(row[i]!, 1);
      });
    }
    // Purple is the realm's peak, gold the next realm's first stage.
    expect(rarityMultiplier('purple', 3.1)).toBeCloseTo(realmSpread('qi-condensation'));
    expect(10 * rarityMultiplier('gold', 3.1)).toBeCloseTo(realmSize('foundation-establishment'));
  });

  it('rolls on the talent and loot table', () => {
    expect(RARITIES.reduce((sum, r) => sum + r.roll, 0)).toBeCloseTo(1);
    expect([0, 0.0999, 0.1, 0.849, 0.998, 0.9995, 0.99995].map(rollRarity)).toEqual([
      'gray',
      'gray',
      'white',
      'green',
      'gold',
      'red',
      'pristine',
    ]);
  });

  it('brings more properties, Accuracy and price as it climbs', () => {
    expect(RARITIES.map((r) => r.properties + (r.unique ? 1 : 0))).toEqual([
      0, 0, 1, 1, 2, 3, 4, 5,
    ]);
    expect(RARITIES.map((r) => r.accuracy)).toEqual([1, 1, 1, 1, 1, 1.2, 1.4, 1.6]);
    expect(RARITIES.map((r) => r.price)).toEqual([0.5, 1, 2, 5, 15, 50, 200, 1000]);
  });
});

describe('method content', () => {
  it('gives each origin a white tier 1 qi method with a Foundation chapter', () => {
    for (const id of ORIGIN_METHODS) {
      const m = method(id);
      expect(m, id).toMatchObject({ ladder: 'qi', tier: 1, rarity: 'white', chapter: 1 });
      expect(m.upkeep).toBeNull();
      const next = nextChapter(m)!;
      expect(next, id).toMatchObject({ ladder: 'qi', tier: 2, rarity: 'white', line: m.line });
      expect(previousChapter(next)).toBe(m);
    }
  });

  it('keeps every method’s fields whole', () => {
    expect(new Set(METHODS.map((m) => m.id)).size).toBe(METHODS.length);
    for (const m of METHODS) {
      // The profile splits growth among the ladder's three stats.
      const stats: readonly string[] = GROWTH_STATS[m.ladder];
      expect(
        Object.keys(m.growth).every((s) => stats.includes(s)),
        m.id,
      ).toBe(true);
      expect(
        Object.values(m.growth).reduce((a, b) => a + (b ?? 0), 0),
        m.id,
      ).toBeCloseTo(1);
      // Properties by rarity, one unique at gold and red.
      const r = rarity(m.rarity);
      expect(m.properties.length, m.id).toBe(r.properties + (r.unique ? 1 : 0));
      expect(m.properties.filter((p) => p.unique).length, m.id).toBe(r.unique ? 1 : 0);
      // A chapter after the first follows one of its line on the same ladder.
      if (m.chapter > 1) expect(previousChapter(m)?.ladder, m.id).toBe(m.ladder);
    }
  });
});

describe('method speed', () => {
  const l4 = at(player(), 'qi', { stage: 4 });

  it('is tier bonus × rarity × mastery, times the fit, from layer 4', () => {
    const speeds = [0, 1, 2, 3, 4].map((lv) => qiSpeed(on(l4, 'garrison-standard', lv)).total);
    expect(speeds).toEqual([0.6, 0.8, 1, 1.1, 1.2].map((x) => expect.closeTo(x, 5)));
    // A gold method on the mutated root it fits: root ×2 × the next realm's size, 3.1.
    const gold = on(at(player({ root: 'mutated' }), 'qi', { stage: 4 }), 'thunder-swallowing');
    expect(methodSpeed(gold, 'qi').rarity).toBeCloseTo(3.1);
    expect(qiSpeed(gold).total).toBeCloseTo(2 * 3.1);
    // A gray method that fits a mutated root poorly: ×2 × 0.8 × 0.6.
    const gray = on(at(player({ root: 'mutated' }), 'qi', { stage: 4 }), 'market-stall');
    expect(qiSpeed(gray).total).toBeCloseTo(2 * 0.8 * 0.6);
  });

  it('ignores the method part in layers 1 to 3', () => {
    expect(methodSpeed(on(player(), 'market-stall', 0), 'qi').total).toBe(1);
    expect(methodSpeed(on(at(player(), 'qi', { stage: 3 }), 'pine-wind', 0), 'qi').total).toBe(1);
  });

  it('counts the tier bonus once, by the step out of the ladder’s realm', () => {
    const chapter = on(l4, 'garrison-standard-foundation');
    expect(methodSpeed(chapter, 'qi')).toMatchObject({
      tier: 3.1,
      rarity: 1,
      mastery: 1,
      total: 3.1,
    });
    const far = { ...method('garrison-standard-foundation'), tier: 5 };
    expect(tierBonus(l4, far)).toBe(3.1);
    const foundation = at(l4, 'qi', { realm: 'foundation-establishment', stage: 1 });
    expect(tierBonus(foundation, { ...far, tier: 3 })).toBe(4.6);
  });
});

describe('the tier cap', () => {
  const foundation = at(on(player(), 'garrison-standard'), 'qi', {
    realm: 'foundation-establishment',
  });

  it('gains nothing above the method’s tier until the next chapter is taken up', () => {
    expect(methodSpeed(foundation, 'qi').capped).toBe(true);
    const rates = dayRates(foundation, DAY);
    expect(rates.qi).toBe(0);
    expect(rates.methodPractice.qi).toBe(0);
    const after = cultivateDays(foundation, 10, roll(0.5)).cultivator;
    expect(after.qi.bar).toBe(0);
    expect(after.methods['garrison-standard']).toEqual(foundation.methods['garrison-standard']);
    const id = 'garrison-standard-foundation';
    const chapter = setActiveMethod(learnMethod(foundation, id), 'qi', id).cultivator;
    expect(dayRates(chapter, DAY).qi).toBeGreaterThan(0);
  });

  it('says so at the breakthrough that runs the method out', () => {
    const r = attemptBreakthrough(ready(on(player(), 'garrison-standard')), 'qi', roll(0));
    expect(r.success).toBe(true);
    expect(noteText(r.notes.at(-1)!, player())).toMatch(
      /Garrison Standard Method carries cultivation no further/,
    );
    // Switching before the attempt avoids the wait, and the chapter builds the new stage.
    const id = 'garrison-standard-foundation';
    const early = setActiveMethod(learnMethod(ready(player()), id), 'qi', id).cultivator;
    const r2 = attemptBreakthrough(early, 'qi', roll(0));
    expect(r2.notes).toHaveLength(1);
    expect(r2.cultivator.qi.growth.at(-1)).toMatchObject({ stage: 1, method: id });
  });
});

describe('chapters and lines', () => {
  it('drop a level into the next chapter, two when it is rarer, never below Glimpse', () => {
    expect(chapterStartLevel(2, 'white', 'white')).toBe(1);
    expect(chapterStartLevel(4, 'white', 'blue')).toBe(2);
    expect(chapterStartLevel(2, 'gold', 'white')).toBe(1);
    expect(chapterStartLevel(1, 'white', 'gold')).toBe(0);
    expect(chapterStartLevel(0, 'white', 'white')).toBe(0);
  });

  it('start a method’s next chapter below the old one, and a new line at Glimpse', () => {
    const id = 'garrison-standard-foundation';
    const origin = learnMethod(on(player(), 'garrison-standard', 4), id);
    expect(methodMastery(origin, id)).toMatchObject({ level: 3, practice: 720 * 3 });
    const glimpse = learnMethod(on(player(), 'garrison-standard', 0), id);
    expect(methodMastery(glimpse, id).level).toBe(0);
    expect(learnMethod(origin, 'pine-wind').methods['pine-wind']!.practice).toBe(0);
  });

  it('catch a chapter up to its floor when taken up, and never touch the bar', () => {
    const id = 'garrison-standard-foundation';
    let c = learnMethod(on(at(player(), 'qi', { bar: 42 }), 'garrison-standard', 1), id);
    expect(c.methods[id]!.practice).toBe(0);
    // The first chapter climbs to Origin before the switch.
    c = { ...c, methods: { ...c.methods, 'garrison-standard': { practice: 2400, fedUntil: 0 } } };
    const r = setActiveMethod(c, 'qi', id);
    expect(r.cultivator.methods[id]!.practice).toBe(methodNeed(method(id), 3));
    expect(r.cultivator.qi.bar).toBe(42);
    expect(r.cultivator.activeMethods.qi).toBe(id);
  });

  it('switch with a chronicle line', () => {
    const s = life();
    const learned = withPlayer(s, learnMethod(s.player, 'pine-wind'));
    const r = switchMethod(learned, 'qi', 'pine-wind');
    expect(r.check.ok).toBe(true);
    const line = r.state.chronicle.findLast((e) => e.type === 'method-switch')!;
    expect(eventText(r.state, line)).toBe('Han Li takes up the Pine Wind Breathing Method.');
    expect(switchMethod(learned, 'qi', 'not-known').check.ok).toBe(false);
  });
});

describe('requirements', () => {
  it('gate a method on its roots', () => {
    const c = learnMethod(player({ method: null }), 'thunder-swallowing');
    // Known, but a true root can't take it up, even with nothing else on the ladder.
    expect(c.activeMethods.qi).toBeNull();
    expect(canTakeUp(c, 'qi', 'thunder-swallowing')).toEqual({
      ok: false,
      reason: 'It needs a mutated or chaos root.',
    });
    const mutated = learnMethod(player({ root: 'mutated', method: null }), 'thunder-swallowing');
    expect(mutated.activeMethods.qi).toBe('thunder-swallowing');
  });
});

describe('upkeep', () => {
  const base = on(at(player(), 'qi', { stage: 4 }), 'ember-furnace');
  const furnace = { ...base, plan: { ...base.plan, burnStones: false } };

  it('stalls a method on an unfed day', () => {
    const r = cultivateDays({ ...furnace, stones: 0 }, 1, roll(0.5));
    expect(r.cultivator.qi.bar).toBe(0);
    expect(r.cultivator.methods['ember-furnace']!.practice).toBe(
      furnace.methods['ember-furnace']!.practice,
    );
    expect(dayRates(furnace, DAY, ['qi'])).toMatchObject({ qi: 0, unfed: ['qi'] });
  });

  it('pays a whole day at a time from stones', () => {
    const fed = cultivateDays({ ...furnace, stones: 3 }, 1, roll(0.5)).cultivator;
    expect(fed.stones).toBe(2);
    expect(fed.qi.bar).toBeGreaterThan(0);
    expect(fed.methods['ember-furnace']!.fedUntil).toBe(DAY + 1);
    // Two half days are one day's upkeep.
    const half = cultivateDays({ ...furnace, stones: 3 }, 0.5, roll(0.5)).cultivator;
    const two = cultivateDays(half, 0.5, roll(0.5, DAY + 0.5)).cultivator;
    expect(two.stones).toBe(2);
  });

  it('drinks nothing on a day with no hours for its ladder', () => {
    const idle = { ...furnace, stones: 3, wheel: furnace.wheel.map(() => 'study' as const) };
    expect(cultivateDays(idle, 1, roll(0.5)).cultivator.stones).toBe(3);
  });
});

describe('kinship', () => {
  const both = learnTechnique(learnTechnique(player(), 'rampart-palm'), 'sinkhole-stone-fist');
  const practiced = (c: Cultivator, id: string, days: number): Cultivator => ({
    ...c,
    techniques: { ...c.techniques, [id]: { practice: days } },
  });

  it('speeds practice by a quarter while a kin of another line sits at Comprehension', () => {
    // Rampart Palm and Sinkhole Stone Fist share the Fist Dao and the palm form.
    expect(kinshipBonus(both, 'rampart-palm')).toBe(0);
    const kin = practiced(both, 'sinkhole-stone-fist', 4);
    expect(techniqueKin(kin, 'rampart-palm').map((t) => t.id)).toEqual(['sinkhole-stone-fist']);
    expect(kinshipBonus(kin, 'rampart-palm')).toBe(0.25);
    const open = (c: Cultivator) => openHours(c).cultivator;
    // Kinship lifts the technique's own share of the day's practice, not the day's total.
    expect(dayRates(open(kin), DAY).practiceEach['rampart-palm']).toBeCloseTo(
      dayRates(open(both), DAY).practiceEach['rampart-palm']! * 1.25,
    );
    // Mastery doesn't carry over.
    expect(mastery(kin, 'rampart-palm').practice).toBe(0);
  });

  it('needs a shared Dao, not just a form, and another line', () => {
    const water = practiced(learnTechnique(both, 'undertow-palm'), 'undertow-palm', 30);
    expect(techniqueKin(water, 'rampart-palm')).toEqual([]);
    const chapters = learnTechnique(practiced(both, 'rampart-palm', 30), 'rampart-collapse-palm');
    expect(techniqueKin(chapters, 'rampart-collapse-palm')).toEqual([]);
  });
});

describe('technique chapters', () => {
  const c = learnTechnique(player(), 'rampart-palm');
  const withPractice = (days: number): Cultivator => ({
    ...c,
    techniques: { ...c.techniques, 'rampart-palm': { practice: days } },
  });

  it('need the one before at Comprehension', () => {
    expect(canLearnTechnique(player(), 'rampart-collapse-palm').ok).toBe(false);
    expect(canLearnTechnique(c, 'rampart-collapse-palm')).toEqual({
      ok: false,
      reason: 'It needs Rampart Palm at Comprehension first.',
    });
    expect(canLearnTechnique(withPractice(4), 'rampart-collapse-palm').ok).toBe(true);
    const s = life();
    expect(gainTechnique(s, 'rampart-collapse-palm')).toBe(s);
  });

  it('start a level below the one before, and leave it known', () => {
    const next = learnTechnique(withPractice(30), 'rampart-collapse-palm');
    // Rampart Palm at Mastery: the second chapter starts at Comprehension, at its own tier.
    expect(next.techniques['rampart-collapse-palm']!.practice).toBe(4 * 3);
    expect(mastery(next, 'rampart-collapse-palm').level).toBe(1);
    expect(learnTechnique(withPractice(4), 'rampart-collapse-palm').techniques).toMatchObject({
      'rampart-palm': { practice: 4 },
      'rampart-collapse-palm': { practice: 0 },
    });
  });
});

describe('insight bursts', () => {
  it('come with each mastery level a technique reaches', () => {
    const t = openHours(learnTechnique(player(), 'rampart-palm')).cultivator;
    const near = {
      ...t,
      techniques: { 'rampart-palm': { practice: 3.99 } },
    };
    const r = cultivateDays(near, 1, roll(0.5));
    const gained = r.cultivator.insight.earned - near.insight.earned;
    expect(gained).toBeCloseTo(dayRates(near, DAY).insight + 5);
    expect(r.notes.map((n) => noteText(n, near))).toContain(
      'Rampart Palm reaches Comprehension; the form finally clicks.',
    );
  });

  it('come with each mastery level a method reaches, larger than a technique’s', () => {
    const c = player();
    const near = { ...c, methods: { 'garrison-standard': { practice: 29.99, fedUntil: 0 } } };
    const r = cultivateDays(near, 1, roll(0.5));
    expect(methodMastery(r.cultivator, 'garrison-standard').level).toBe(1);
    const gained = r.cultivator.insight.earned - near.insight.earned;
    expect(gained).toBeCloseTo(dayRates(near, DAY).insight + 10);
    expect(r.notes.some((n) => n.type === 'mastery')).toBe(true);
  });

  it('grow three times a tier, and with Aptitude', () => {
    expect([1, 2, 3, 4].map((lv) => burstAt(TECHNIQUE_MASTERY, 1, lv))).toEqual([5, 20, 60, 150]);
    expect([1, 2, 3, 4].map((lv) => burstAt(METHOD_MASTERY, 1, lv))).toEqual([10, 40, 120, 300]);
    expect(burstAt(METHOD_MASTERY, 2, 1)).toBe(30);
    expect(masteryBurst(player({ aptitude: 12 }), TECHNIQUE_MASTERY, 1, 1)).toBeCloseTo(5.5);
  });
});

describe('contemplation', () => {
  it('gives a lump once, then runs dry', () => {
    const r = contemplate(player(), 'garrison-drill-manual');
    expect(r).toMatchObject({ gained: 15, dry: true });
    expect(r.cultivator.insight).toEqual({ current: 15, earned: 15 });
    expect(contemplate(r.cultivator, 'garrison-drill-manual').gained).toBe(0);
  });

  it('trickles by the day until its supply runs out, or forever', () => {
    const ten = contemplate(player(), 'cracked-stele', 10);
    expect(ten).toMatchObject({ gained: 10, dry: false });
    expect(contemplationLeft(ten.cultivator, 'cracked-stele')).toBe(110);
    expect(contemplate(ten.cultivator, 'cracked-stele', 500)).toMatchObject({
      gained: 110,
      dry: true,
    });
    const falls = contemplate(player(), 'mountain-waterfall', 1000);
    expect(falls).toMatchObject({ gained: 500, dry: false });
    expect(contemplationLeft(falls.cultivator, 'mountain-waterfall')).toBe(Infinity);
  });

  it('is multiplied by Aptitude, while the supply counts what was drawn', () => {
    const r = contemplate(player({ aptitude: 12 }), 'shrine-lecture');
    expect(r.gained).toBeCloseTo(33);
    expect(r.cultivator.contemplation['shrine-lecture']).toBe(30);
  });
});

describe('growth', () => {
  const redShare = (3.1 ** 1.3 - 1) / 8;

  it('records the growth of the method that climbed each stage, split by its profile', () => {
    const c = on(player(), 'primordial-origin');
    const layer1 = at(c, 'qi', { bar: stepSize('qi-condensation', 1) });
    const r = attemptBreakthrough(layer1, 'qi', roll(0));
    expect(r.cultivator.qi.growth).toEqual([
      {
        realm: 'qi-condensation',
        stage: 2,
        method: 'primordial-origin',
        rarity: 'red',
        growth: {
          qiPool: expect.closeTo(redShare * 0.4, 6),
          techniquePower: expect.closeTo(redShare * 0.4, 6),
          qiRecovery: expect.closeTo(redShare * 0.2, 6),
        },
      },
    ]);
    // Set, never rolled: another roll that succeeds records the same.
    expect(attemptBreakthrough(layer1, 'qi', roll(0.5)).cultivator.qi.growth).toEqual(
      r.cultivator.qi.growth,
    );
  });

  it('takes a white method’s growth when none is active, and scales by fit', () => {
    const tempered = temper(player(), stepSize('qi-condensation', 1));
    const body = attemptBreakthrough(tempered, 'body', roll(0)).cultivator.body.growth[0]!;
    expect(body).toMatchObject({ method: null, rarity: 'white' });
    expect(Object.values(body.growth)).toEqual([0, 0, 0]);
    // Common methods fit a mutated root poorly: ×0.6 − 1 over a realm, an eighth a layer.
    const g = stageGrowth(method('garrison-standard'), 0.6, 'qi', 'qi-condensation', 2);
    expect(g.growth.qiPool).toBeCloseTo((-0.4 / 8) * 0.4);
  });

  it('sums each realm’s stages and weights the realms by the realm curve', () => {
    const red = method('primordial-origin');
    const qc = [2, 3, 4, 5, 6, 7, 8, 9].map((k) => stageGrowth(red, 1, 'qi', 'qi-condensation', k));
    const l: Ladder = {
      ...freshLadder(),
      realm: 'foundation-establishment',
      growth: [...qc, stageGrowth(null, 1, 'qi', 'foundation-establishment', 1)],
    };
    const realms = realmGrowth(l);
    expect(realms[0]).toMatchObject({ climbed: 8, of: 8, methods: ['primordial-origin'] });
    expect(realms[0]!.growth.qiPool).toBeCloseTo((3.1 ** 1.3 - 1) * 0.4);
    expect(realms[1]).toMatchObject({ climbed: 1, of: 4, methods: [null] });
    // Qi Condensation weighs 1 and Foundation 9: a red foundation still shows a little.
    expect(ladderGrowth(l).qiPool).toBeCloseTo(((3.1 ** 1.3 - 1) * 0.4) / 10);
  });

  it('folds into the stats beside the active method’s properties', () => {
    const c = on(player(), 'primordial-origin');
    expect(stats(c)).toMatchObject({ aptitude: 2, qiGain: 0.05, setbackTime: -0.2 });
    const climbed = attemptBreakthrough(
      at(c, 'qi', { bar: stepSize('qi-condensation', 1) }),
      'qi',
      roll(0),
    ).cultivator;
    expect(stats(climbed).qiPool).toBeCloseTo(redShare * 0.4);
    // Properties count only while the method is active; growth stays.
    const aside = setActiveMethod(climbed, 'qi', null).cultivator;
    expect(stats(aside)).toMatchObject({ aptitude: 0, qiGain: 0 });
    expect(stats(aside).qiPool).toBeCloseTo(redShare * 0.4);
  });
});

describe('breakthrough bonuses', () => {
  const layer3 = (c: Cultivator) => at(c, 'qi', { stage: 3, bar: stepSize('qi-condensation', 3) });

  it('add to the odds by rarity, gray to red', () => {
    const odds = (id: string, opts: LifeOpts = {}) => minorOdds(layer3(on(player(opts), id)), 'qi');
    expect(odds('garrison-standard')).toBeCloseTo(0.72);
    expect(odds('market-stall')).toBeCloseTo(0.7);
    expect(odds('pine-wind')).toBeCloseTo(0.74);
    expect(odds('ember-furnace')).toBeCloseTo(0.76);
    // Gold's +12, and its Storm Patience property's +2.
    expect(odds('thunder-swallowing', { root: 'mutated' })).toBeCloseTo(0.86);
    expect(odds('primordial-origin')).toBeCloseTo(0.88);
    const major = (id: string) => majorCheck(ready(on(player(), id)), 'qi')!.odds;
    expect(major('primordial-origin') - major('garrison-standard')).toBeCloseTo(0.16);
  });

  it('add margin at gold and red, and only those reach the heavenly grade', () => {
    // Qi at 150%, twice the insight, the body at Foundation: a margin of 3.
    const strong = (id: string, opts: LifeOpts = {}) => {
      const c = ready(on(player(opts), id), 1.5, 1000);
      return majorCheck(at(c, 'body', { realm: 'foundation-establishment' }), 'qi')!;
    };
    expect(strong('garrison-standard')).toMatchObject({ score: 3, grade: 'perfect' });
    expect(strong('thunder-swallowing', { root: 'mutated' })).toMatchObject({
      score: 3.25,
      methodMargin: 0.25,
      grade: 'perfect',
    });
    expect(strong('primordial-origin')).toMatchObject({ score: 3.5, grade: 'heavenly' });
  });

  it('show mercy on failure: the injury halved from purple, the bar kept at red', () => {
    const fail = (c: Cultivator) => attemptBreakthrough(c, 'qi', roll(0.999)).cultivator;
    const white = fail(ready(on(player(), 'garrison-standard')));
    expect(white.qi.injuredUntil).toBe(DAY + MAJOR_INJURY_DAYS);
    const gold = fail(ready(on(player({ root: 'mutated' }), 'thunder-swallowing')));
    expect(gold.qi.injuredUntil).toBe(DAY + MAJOR_INJURY_DAYS / 2);
    const red = layer3(on(player(), 'primordial-origin'));
    const after = fail(red);
    expect(after.qi.bar).toBe(red.qi.bar);
    expect(after.qi.unsettledUntil).toBeGreaterThan(DAY);
  });
});
