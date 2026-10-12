import { describe, expect, it } from 'vitest';
import { DAMAGE_TYPES, STATUSES, statusOf } from '../../content/combat.ts';
import { item } from '../../content/items.ts';
import { MASTERY_CHECK_BONUS } from '../../content/mastery.ts';
import type { Technique } from '../../content/techniques.ts';
import { Rng } from '../rng.ts';
import { newLife } from '../state.ts';
import { critFaces, judge } from './check.ts';
import { armor, combatant, fromCultivator, weapon, type CombatantInit } from './combatant.ts';
import { comboMultiplier, damage, damagePhase, elementMultiplier, nextCombo } from './damage.ts';
import {
  combatantIn,
  fightOver,
  resolveTurn,
  startFight,
  winner,
  type Action,
  type Feature,
  type Fight,
} from './fight.ts';
import { ladderGap, rungPower, tierScale, type Rung } from './ladder.ts';
import { logLine } from './log.ts';

const rung = (realm: Rung['realm'], stage: number, grade = 0): Rung => ({ realm, stage, grade });
const QC = (layer: number) => rung('qi-condensation', layer);
const FE = (stage: number, grade = 0) => rung('foundation-establishment', stage, grade);
const CF = (stage: number) => rung('core-formation', stage);
const NS = (stage: number) => rung('nascent-soul', stage);
const all = (r: Rung) => ({ qi: r, body: r, soul: r });

/** A seed whose first d20 rolls lands on each number asked for, in order. */
function seedFor(...rolls: number[]): number {
  for (let seed = 0; seed < 1_000_000; seed++) {
    const rng = new Rng(seed);
    if (rolls.every((r) => rng.int(1, 20) === r)) return seed;
  }
  throw new Error(`no seed rolls ${rolls.join(', ')}`);
}

const tech = (t: Partial<Technique> & Pick<Technique, 'id'>): Technique => ({
  name: t.id,
  pinyin: '',
  hanzi: '',
  ladder: 'qi',
  tier: 1,
  rarity: 'white',
  line: t.id,
  chapter: 1,
  daos: [],
  form: 'palm',
  damage: 'physical',
  power: 40,
  qiCost: 10,
  source: 'test',
  text: 'test',
  ...t,
});

const EMBER_PALM = tech({
  id: 'ember_palm',
  name: 'Ember Palm',
  daos: ['fire'],
  form: 'palm',
  damage: 'fire',
  power: 50,
  qiCost: 12,
});

const fighter = (init: CombatantInit) => combatant(init);
const turn = (f: Fight, actions: Action[], seed = 0) => resolveTurn(f, actions, new Rng(seed));
const hit = (target: string, technique?: string): Action['main'] =>
  technique ? { type: 'technique', id: technique, target } : { type: 'strike', target };

describe('the worked turn (design § Combat, one turn)', () => {
  it('reproduces exactly: 21 vs 18, 33 fire, Mo 117/150, qi 52/90, the grass burning', () => {
    const you = fighter({
      id: 'you',
      name: 'Han Li',
      side: 'you',
      rungs: all(FE(1)),
      qi: 64,
      maxQi: 90,
      // Ember Palm at Comprehension: +4.
      techniques: { ember_palm: { technique: EMBER_PALM, check: 2 * MASTERY_CHECK_BONUS } },
      daos: { fire: 1 },
    });
    const robe = armor(1, 'white', 'fire');
    const mo = fighter({
      id: 'elder_mo',
      name: 'Elder Mo',
      side: 'mo',
      // One stage above you.
      rungs: all(FE(2)),
      maxHp: 150,
      resist: robe.resist,
      armor: robe.divisor,
    });
    const features: Feature[] = [
      { id: 'brazier', name: 'brazier', tags: ['fire'] },
      { id: 'spirit_grass', name: 'grass', tags: ['flammable'] },
    ];
    const r = turn(
      startFight([you, mo], features),
      [
        {
          actor: 'you',
          main: { type: 'technique', id: 'ember_palm', target: 'elder_mo' },
          minor: { type: 'interact', feature: 'brazier', onto: 'spirit_grass' },
          uses: ['brazier', 'spirit_grass'],
          creativity: 2,
        },
      ],
      seedFor(16),
    );
    const o = r.outcomes[0]!;
    // 16 + 4 (Comprehension) + 1 (Fire Dao tier 1) + 2 (creativity) − 2 (one stage below) = 21.
    expect(o).toMatchObject({ roll: 16, total: 21, tn: 18, result: 'hit', damage: 33, qi: 12 });
    // 50 × 1.05 × 0.75 × 1/1.2 = 32.8, rounded.
    expect(50 * 1.05 * 0.75 * (1 / 1.2)).toBeCloseTo(32.81);
    expect(combatantIn(r.fight, 'elder_mo')).toMatchObject({ hp: 117, maxHp: 150 });
    expect(r.fight.features.find((x) => x.id === 'spirit_grass')!.burning).toBe(2);
    expect(logLine(r.fight, o)).toBe(
      'Hit · 21 vs 18 · 33 fire · Elder Mo 117/150 · Qi 52/90 · grass burning (2 turns)',
    );
    // The five tags.
    expect(o).toMatchObject({
      form: 'palm',
      type: 'fire',
      realm: 'foundation-establishment',
      result: 'hit',
      status: null,
    });
  });
});

describe('the one ladder', () => {
  it('is −2 a stage, −1 a Qi Condensation layer and −2 a major breakthrough', () => {
    expect(ladderGap(FE(1), FE(2)).check).toBe(-2);
    expect(ladderGap(QC(3), QC(4)).check).toBe(-1);
    expect(ladderGap(QC(5), QC(3)).check).toBe(2);
    expect(ladderGap(FE(1), QC(9))).toMatchObject({ stages: 0, breaks: 1, check: 2 });
    // One realm apart at the same stage: three stages and a break.
    expect(ladderGap(FE(1), CF(1)).check).toBe(-8);
    expect(ladderGap(CF(3), FE(3)).check).toBe(8);
  });

  it('swings damage about 3×, 5.5× and 10× a realm, on the escalating steps', () => {
    expect(ladderGap(FE(1), FE(2)).damage).toBeCloseTo(1 / 1.2);
    expect(ladderGap(QC(3), QC(1)).damage).toBeCloseTo(1.2);
    expect(ladderGap(FE(1), QC(9)).damage).toBeCloseTo(1.75);
    expect(ladderGap(FE(4), QC(9)).damage).toBeCloseTo(1.75 * 1.2 ** 3); // about 3
    expect(ladderGap(CF(2), FE(2)).damage).toBeCloseTo(3.2 * 1.2 ** 3); // about 5.5
    expect(ladderGap(NS(2), CF(2)).damage).toBeCloseTo(5.8 * 1.2 ** 3); // about 10
    expect(ladderGap(FE(2), CF(2)).damage).toBeCloseTo(1 / (3.2 * 1.2 ** 3));
  });

  it('counts a breakthrough grade as stages', () => {
    // Perfect is +2 stages: +4 to checks and ×1.44 against an ordinary peer.
    expect(ladderGap(FE(1, 2), FE(1))).toMatchObject({ stages: 2, check: 4 });
    expect(ladderGap(FE(1, 2), FE(1)).damage).toBeCloseTo(1.44);
    expect(ladderGap(FE(1, -1), FE(1)).check).toBe(-2);
  });

  it('scales HP, the qi pool and a tier on the same steps', () => {
    expect(rungPower(QC(1))).toBe(1);
    expect(tierScale(1)).toBe(1);
    expect(tierScale(2)).toBeCloseTo(1.75 * 1.2 ** 4);
    const s = newLife({ name: 'Han Li', seed: 'ladder' });
    const low = fromCultivator(s.player, 'you');
    const high = fromCultivator(
      { ...s.player, body: { ...s.player.body, realm: 'foundation-establishment', stage: 1 } },
      'you',
    );
    expect(low).toMatchObject({ maxHp: 100, maxQi: 60, hp: 100, qi: 60 });
    expect(high.maxHp).toBe(Math.round(100 * tierScale(2)));
  });
});

describe('checks', () => {
  it('crit by 10 or on a natural 20, graze within 3, miss past that', () => {
    expect(judge(12, 28, 18)).toBe('critical');
    expect(judge(12, 27, 18)).toBe('hit');
    expect(judge(20, 10, 18)).toBe('critical');
    expect(judge(12, 18, 18)).toBe('hit');
    expect(judge(12, 17, 18)).toBe('graze');
    expect(judge(12, 15, 18)).toBe('graze');
    expect(judge(12, 14, 18)).toBe('miss');
  });

  it('backfire on a natural 1 when qi is used, and plainly miss otherwise', () => {
    expect(judge(1, 30, 18, { qi: true })).toBe('backfire');
    expect(judge(1, 30, 18)).toBe('miss');
  });

  it('widen the crit range a face per 4 Fortune above 10', () => {
    expect(critFaces(10)).toBe(1);
    expect(critFaces(13)).toBe(1);
    expect(critFaces(14)).toBe(2);
    expect(critFaces(18)).toBe(3);
    expect(critFaces(6)).toBe(1);
    expect(judge(19, 5, 18, { fortune: 14 })).toBe('critical');
    expect(judge(19, 5, 18, { fortune: 13 })).toBe('miss');
  });
});

describe('damage', () => {
  const base = { power: 100, dao: 0, element: 1, resist: 0, result: 'hit' as const, gap: 1 };

  it('follows the formula, rounded to the nearest whole number', () => {
    expect(damage(base)).toBe(100);
    expect(damage({ ...base, result: 'critical' })).toBe(150);
    expect(damage({ ...base, result: 'graze' })).toBe(50);
    expect(damage({ ...base, dao: 0.1, element: 1.25, resist: 0.2 })).toBe(110);
    expect(damage({ ...base, power: 41, result: 'graze' })).toBe(21);
    expect(damage({ ...base, power: 40.4 })).toBe(40);
    expect(damage({ ...base, armor: 2, combo: 1.2 })).toBe(60);
    expect(damage({ ...base, resist: 5 })).toBe(10);
  });

  it('runs the five-element cycle, with lightning and wind as wood and ice as water', () => {
    expect(elementMultiplier('water', 'fire')).toBe(1.25);
    expect(elementMultiplier('fire', 'water')).toBe(0.8);
    expect(elementMultiplier('wood', 'earth')).toBe(1.25);
    expect(elementMultiplier('earth', 'water')).toBe(1.25);
    expect(elementMultiplier('fire', 'metal')).toBe(1.25);
    expect(elementMultiplier('metal', 'wood')).toBe(1.25);
    expect(elementMultiplier('fire', 'fire')).toBe(1);
    expect(elementMultiplier('fire', null)).toBe(1);
    expect(damagePhase('lightning')).toBe('wood');
    expect(damagePhase('wind')).toBe('wood');
    expect(damagePhase('ice')).toBe('water');
    expect(damagePhase('physical')).toBeNull();
    expect(damagePhase('soul')).toBeNull();
    expect(damagePhase('poison')).toBeNull();
  });

  it('builds a combo in generating order, capped, and breaks it out of order', () => {
    let c = nextCombo(null, 'wood');
    expect(comboMultiplier(c)).toBe(1);
    c = nextCombo(c, 'fire');
    expect(comboMultiplier(c)).toBeCloseTo(1.1);
    c = nextCombo(nextCombo(nextCombo(c, 'earth'), 'metal'), 'water');
    expect(c).toEqual({ element: 'water', chain: 3 });
    expect(comboMultiplier(nextCombo(c, 'fire'))).toBe(1);
    expect(nextCombo(c, null)).toBeNull();
  });

  it('gives each of the eleven types its resistance, and all but physical a status', () => {
    expect(DAMAGE_TYPES).toHaveLength(11);
    expect(DAMAGE_TYPES.filter((t) => !statusOf(t))).toEqual(['physical']);
    expect(new Set(STATUSES.map((s) => s.from)).size).toBe(STATUSES.length);
    const wet = fighter({ id: 'a', name: 'A', side: 'a', resist: { water: 0.5 } });
    const f = startFight([
      fighter({
        id: 'b',
        name: 'B',
        side: 'b',
        techniques: {
          tide: { technique: tech({ id: 'tide', damage: 'water', power: 40 }), check: 0 },
        },
      }),
      wet,
    ]);
    const r = turn(f, [{ actor: 'b', main: hit('a', 'tide') }], seedFor(18));
    expect(r.outcomes[0]).toMatchObject({ result: 'hit', damage: 20 });
  });
});

describe('a turn', () => {
  const a = () =>
    fighter({
      id: 'a',
      name: 'A',
      side: 'left',
      agility: 12,
      techniques: {
        palm: { technique: tech({ id: 'palm', power: 40, qiCost: 10 }), check: 0 },
        flame: {
          technique: tech({ id: 'flame', damage: 'fire', power: 40, qiCost: 10 }),
          check: 0,
        },
      },
    });
  const b = () => fighter({ id: 'b', name: 'B', side: 'right', agility: 8 });
  const c = () => fighter({ id: 'c', name: 'C', side: 'left', agility: 10 });

  it('takes actions from any number of actors on each side, in Agility order, each naming its actor', () => {
    const f = startFight([b(), c(), a()]);
    const r = turn(f, [
      { actor: 'b', main: hit('a') },
      { actor: 'c', main: hit('b') },
      { actor: 'a', main: hit('b') },
    ]);
    expect(r.outcomes.map((o) => o.actor)).toEqual(['a', 'c', 'b']);
    expect(r.outcomes.map((o) => o.target)).toEqual(['b', 'b', 'a']);
    expect(r.fight.turn).toBe(1);
  });

  it('rolls on the stream it is given, so a seed replays the same fight', () => {
    const f = startFight([a(), b(), c()]);
    const acts: Action[] = [
      { actor: 'a', main: hit('b', 'palm') },
      { actor: 'b', main: hit('a') },
      { actor: 'c', main: hit('b') },
    ];
    expect(turn(f, acts, 42)).toEqual(turn(f, acts, 42));
    expect(turn(f, acts, 42)).not.toEqual(turn(f, acts, 43));
    // The turn leaves the fight it was given untouched.
    expect(f.combatants.map((x) => x.hp)).toEqual([100, 100, 100]);
  });

  it('ends when one side stands', () => {
    let f = startFight([a(), { ...b(), hp: 1 }]);
    f = turn(f, [{ actor: 'a', main: hit('b') }], seedFor(15)).fight;
    expect(combatantIn(f, 'b')!.state).toBe('down');
    expect(fightOver(f)).toBe(true);
    expect(winner(f)).toBe('left');
  });

  it('lets a beast that waits on its owner act only when commanded', () => {
    const wolf = fighter({ id: 'wolf', name: 'Wolf', side: 'left', needsCommand: true });
    const f = startFight([a(), wolf, b()]);
    const idle = turn(f, [{ actor: 'wolf', main: hit('b') }]);
    expect(idle.outcomes).toEqual([]);
    expect(idle.skipped).toEqual([{ actor: 'wolf', reason: 'not commanded' }]);
    const told = turn(f, [
      { actor: 'a', main: { type: 'command', id: 'wolf' } },
      { actor: 'wolf', main: hit('b') },
    ]);
    expect(told.outcomes.map((o) => [o.actor, o.form])).toEqual([
      ['a', 'command'],
      ['wolf', 'palm'],
    ]);
  });
});

describe('qi', () => {
  it('pays a technique’s cost, scaled by its tier, and leaves basic strikes when empty', () => {
    const t2 = tech({ id: 'deep', tier: 2, qiCost: 10 });
    const x = fighter({
      id: 'x',
      name: 'X',
      side: 'x',
      qi: 30,
      maxQi: 400,
      techniques: { deep: { technique: t2, check: 0 } },
    });
    const f = startFight([x, fighter({ id: 'y', name: 'Y', side: 'y' })]);
    const r = turn(f, [{ actor: 'x', main: hit('y', 'deep') }]);
    expect(r.outcomes).toEqual([]);
    expect(r.skipped).toEqual([{ actor: 'x', reason: 'not enough qi' }]);
    const rich = turn(startFight([{ ...x, qi: 400 }, f.combatants[1]!]), [
      { actor: 'x', main: hit('y', 'deep') },
    ]);
    expect(rich.outcomes[0]!.qi).toBe(Math.round(10 * tierScale(2)));
    const strike = turn(f, [{ actor: 'x', main: hit('y') }]);
    expect(strike.outcomes[0]).toMatchObject({ action: 'strike', type: 'physical' });
  });

  it('comes back a tenth on defend, and barely on its own', () => {
    const x = fighter({ id: 'x', name: 'X', side: 'x', qi: 0, maxQi: 100 });
    const f = startFight([x, fighter({ id: 'y', name: 'Y', side: 'y' })]);
    const r = turn(f, [{ actor: 'x', main: { type: 'defend' } }]);
    expect(r.outcomes[0]).toMatchObject({ form: 'defend', result: 'held', qi: -10 });
    expect(combatantIn(r.fight, 'x')).toMatchObject({ qi: 10, guard: 4 });
    // The next turn starts with 2% back, and the guard holds until the next action.
    const next = turn(r.fight, [{ actor: 'y', main: hit('x') }]);
    expect(combatantIn(next.fight, 'x')!.qi).toBe(12);
    expect(next.outcomes[0]!.tn).toBe(22);
  });

  it('backfires on a natural 1, turning the technique on its user', () => {
    const x = fighter({
      id: 'x',
      name: 'X',
      side: 'x',
      techniques: { palm: { technique: tech({ id: 'palm', power: 40 }), check: 0 } },
    });
    const f = startFight([x, fighter({ id: 'y', name: 'Y', side: 'y' })]);
    const r = turn(f, [{ actor: 'x', main: hit('y', 'palm') }], seedFor(1));
    expect(r.outcomes[0]).toMatchObject({
      result: 'backfire',
      damage: 20,
      hp: { id: 'x', hp: 80 },
    });
    expect(combatantIn(r.fight, 'y')!.hp).toBe(100);
    expect(combatantIn(r.fight, 'x')!.qi).toBe(50);
  });
});

describe('statuses', () => {
  const burner = () =>
    fighter({
      id: 'x',
      name: 'X',
      side: 'x',
      techniques: {
        flame: { technique: tech({ id: 'flame', damage: 'fire', power: 40 }), check: 0 },
        frost: { technique: tech({ id: 'frost', damage: 'ice', power: 40 }), check: 0 },
        vine: { technique: tech({ id: 'vine', damage: 'wood', power: 40 }), check: 0 },
      },
    });
  const y = () => fighter({ id: 'y', name: 'Y', side: 'y', agility: 5 });

  it('land on a critical, tick at the start of each turn and run out', () => {
    const f = startFight([burner(), y()]);
    const r = turn(f, [{ actor: 'x', main: hit('y', 'flame') }], seedFor(20));
    expect(r.outcomes[0]).toMatchObject({ result: 'critical', damage: 60, status: 'burning' });
    expect(logLine(r.fight, r.outcomes[0]!)).toBe(
      'Critical · 20 vs 13 · 60 fire · Y 40/100 · Y burning · Qi 50/60',
    );
    const t2 = turn(r.fight, []);
    expect(t2.ticks).toEqual([{ id: 'y', status: 'burning', damage: 6 }]);
    const t3 = turn(t2.fight, []);
    expect(t3.ticks).toHaveLength(1);
    expect(combatantIn(t3.fight, 'y')).toMatchObject({ hp: 28, statuses: [] });
    // A plain hit applies none.
    const plain = turn(f, [{ actor: 'x', main: hit('y', 'flame') }], seedFor(15));
    expect(plain.outcomes[0]).toMatchObject({ result: 'hit', status: null });
  });

  it('freeze a later actor out of their main action, and root a fleer', () => {
    const f = startFight([{ ...burner(), agility: 20 }, y()]);
    const frozen = turn(
      f,
      [
        { actor: 'x', main: hit('y', 'frost') },
        { actor: 'y', main: hit('x') },
      ],
      seedFor(20),
    );
    expect(frozen.skipped).toEqual([{ actor: 'y', reason: 'frozen' }]);
    const rooted = turn(f, [{ actor: 'x', main: hit('y', 'vine') }], seedFor(20));
    const fled = turn(rooted.fight, [{ actor: 'y', main: { type: 'flee' } }]);
    expect(fled.outcomes[0]).toMatchObject({ form: 'flee', result: 'failed' });
    expect(fled.outcomes[0]!.roll).toBeUndefined();
  });
});

describe('creativity, talk and flight', () => {
  const x = () =>
    fighter({
      id: 'x',
      name: 'X',
      side: 'x',
      techniques: { palm: { technique: tech({ id: 'palm' }), check: 0 } },
    });
  const y = () => fighter({ id: 'y', name: 'Y', side: 'y' });
  const crate: Feature = { id: 'crate', name: 'crate', tags: ['cover'] };

  it('counts creativity once per trick and only for real things', () => {
    const f = startFight([x(), y()], [crate]);
    const act = (uses: string[], creativity = 3): Action => ({
      actor: 'x',
      main: hit('y'),
      uses,
      creativity,
    });
    const seed = seedFor(10, 10);
    const first = turn(f, [act(['crate'])], seed);
    expect(first.outcomes[0]!.total).toBe(13);
    const again = turn(first.fight, [act(['crate'])], seed);
    expect(again.outcomes[0]!.total).toBe(10);
    expect(turn(f, [act(['a golden dragon'])], seed).outcomes[0]!.total).toBe(10);
    expect(turn(f, [act(['crate'], 9)], seed).outcomes[0]!.total).toBe(13);
  });

  it('talks against resolve, feeling half the soul gap', () => {
    const f = startFight([
      { ...x(), rungs: all(FE(1)) },
      { ...y(), rungs: all(FE(3)) },
    ]);
    const r = turn(
      f,
      [{ actor: 'x', main: { type: 'talk', style: 'bluff', target: 'y' } }],
      seedFor(19),
    );
    // 19 − half of 4 against 18.
    expect(r.outcomes[0]).toMatchObject({ form: 'talk', total: 17, tn: 18, result: 'failed' });
    const yield_ = turn(
      f,
      [{ actor: 'x', main: { type: 'talk', style: 'surrender', target: 'y' } }],
      seedFor(20),
    );
    expect(yield_.outcomes[0]!.result).toBe('swayed');
    expect(combatantIn(yield_.fight, 'x')!.state).toBe('yielded');
    expect(fightOver(yield_.fight)).toBe(true);
  });

  it('flees against the fastest foe, feeling half the gap', () => {
    const f = startFight([x(), { ...y(), agility: 14 }]);
    const r = turn(f, [{ actor: 'x', main: { type: 'flee' } }], seedFor(16));
    expect(r.outcomes[0]).toMatchObject({ total: 16, tn: 16, result: 'escaped' });
    expect(combatantIn(r.fight, 'x')!.state).toBe('fled');
    const up = startFight([x(), { ...y(), agility: 14, rungs: all(QC(5)) }]);
    // Four layers up is −4, felt as −2.
    expect(
      turn(up, [{ actor: 'x', main: { type: 'flee' } }], seedFor(16)).outcomes[0],
    ).toMatchObject({
      total: 14,
      result: 'failed',
    });
  });
});

describe('items in a fight', () => {
  it('strike with a talisman at its own tier, spent on use', () => {
    const x = fighter({
      id: 'x',
      name: 'X',
      side: 'x',
      items: { 'ember-talisman': { item: item('ember-talisman'), n: 1 } },
    });
    const f = startFight([x, fighter({ id: 'y', name: 'Y', side: 'y' })]);
    const r = turn(
      f,
      [{ actor: 'x', main: { type: 'item', id: 'ember-talisman', target: 'y' } }],
      seedFor(18),
    );
    expect(r.outcomes[0]).toMatchObject({
      form: 'projectile',
      type: 'fire',
      result: 'hit',
      damage: 45,
    });
    expect(combatantIn(r.fight, 'x')!.items['ember-talisman']!.n).toBe(0);
    expect(
      turn(r.fight, [{ actor: 'x', main: { type: 'item', id: 'ember-talisman', target: 'y' } }])
        .skipped,
    ).toHaveLength(1);
  });

  it('restore qi with a pill, scaled by toxicity, which the dose raises', () => {
    const pill = { item: item('qi-restoring-pill'), n: 2 };
    const x = fighter({
      id: 'x',
      name: 'X',
      side: 'x',
      qi: 0,
      maxQi: 100,
      toxicity: 50,
      items: { 'qi-restoring-pill': pill },
    });
    const f = startFight([x, fighter({ id: 'y', name: 'Y', side: 'y' })]);
    const r = turn(f, [{ actor: 'x', main: { type: 'item', id: 'qi-restoring-pill' } }]);
    expect(r.outcomes[0]).toMatchObject({ form: 'item', result: 'held', qi: -15 });
    expect(combatantIn(r.fight, 'x')).toMatchObject({ qi: 15, toxicity: 60 });
  });

  it('take gear on the weapon rule: strikes at the full exponent, Dao techniques at half', () => {
    const red = weapon('saber', 1, 'red');
    expect(red.strike).toBeCloseTo(3 ** 0.9);
    expect(red.technique).toBeCloseTo(3 ** 0.45);
    expect(red.hit).toBe(2);
    expect(weapon('fist', 1, 'gold').hit).toBe(1);
    expect(armor(2, 'red').divisor).toBeCloseTo(5.5 ** 0.9);
  });
});
