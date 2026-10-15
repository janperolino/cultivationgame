import { describe, expect, it } from 'vitest';
import { DAMAGE_TYPES, STATUSES, statusOf } from '../../content/combat.ts';
import { item } from '../../content/items.ts';
import { realmSize, realmSpread } from '../../content/realms.ts';
import type { Technique } from '../../content/techniques.ts';
import { Rng } from '../rng.ts';
import { newLife } from '../state.ts';
import { backfireChance, critChance, judge } from './check.ts';
import {
  armor,
  combatant,
  fromCultivator,
  sheet,
  weapon,
  type CombatantInit,
} from './combatant.ts';
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
import { logLine } from './log.ts';
import { bandOf, hitChance, rungSize, stageSize, tierScale, type Rung } from './sheet.ts';

const rung = (realm: Rung['realm'], stage: number, grade = 0): Rung => ({ realm, stage, grade });
const QC = (layer: number) => rung('qi-condensation', layer);
const FE = (stage: number, grade = 0) => rung('foundation-establishment', stage, grade);
const CF = (stage: number) => rung('core-formation', stage);
const NS = (stage: number) => rung('nascent-soul', stage);
const all = (r: Rung) => ({ qi: r, body: r, soul: r });

// Seeds found by searching the stream (scratch): what their first draws do to a check.
/** Hits at any chance above 57%, no crit, a spread of 1.057. */
const SEED_WORKED = 10;
/** Hits at any chance above 50%, no crit, a spread of 1. */
const SEED_HIT = 14;
/** Hits at any chance above 30%, no crit, a spread of 1. */
const SEED_HIT_30 = 129;
/** Hits at any chance above 50% and crits, a spread of 1. */
const SEED_CRIT = 4092;
/** Misses at any chance below 95%. */
const SEED_MISS = 36;
/** Backfires at any backfire chance above 12.5%. */
const SEED_BACKFIRE = 7;

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
  power: 40,
  qiCost: 12,
});

/** A fighter with no qi shield, so hits reach the body as these tests measure; the bars have their own. */
const fighter = (init: CombatantInit) => combatant({ maxShield: 0, ...init });
const turn = (f: Fight, actions: Action[], seed = 0) => resolveTurn(f, actions, new Rng(seed));
const hit = (target: string, technique?: string): Action['main'] =>
  technique ? { type: 'technique', id: technique, target } : { type: 'strike', target };

describe('the worked turn (design § Combat, one turn)', () => {
  it('reproduces exactly: 57%, 40 fire on his shield, Mo 176/176, qi 52/94, the grass burning', () => {
    const you = fighter({
      id: 'you',
      name: 'Han Li',
      side: 'you',
      rungs: all(QC(5)),
      qi: 64,
      // Ember Palm at Comprehension: ×1.15.
      techniques: { ember_palm: { technique: EMBER_PALM, accuracy: 1.15 } },
      daos: { fire: 1 },
    });
    expect(you.maxQi).toBe(94);
    const mo = combatant({
      id: 'elder_mo',
      name: 'Elder Mo',
      side: 'mo',
      // One layer above you, his qi shield up and his water-silk robe on behind it.
      rungs: all(QC(6)),
      armor: armor(1, 'green', 'fire'),
    });
    expect(mo).toMatchObject({ maxHp: 176, maxShield: 176 });
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
      SEED_WORKED,
    );
    const o = r.outcomes[0]!;
    // Accuracy 15.7 × 1.15 (Comprehension) × 1.05 (Fire Dao 1) × 1.21 (creativity 2) = 23.0 against Evasion 17.6.
    const accuracy = stageSize('qi-condensation', 5) * 1.15 * 1.05 * 1.1 ** 2;
    expect(hitChance(accuracy, stageSize('qi-condensation', 6))).toBeCloseTo(0.566, 3);
    expect(o).toMatchObject({ result: 'hit', damage: 40, qi: 12 });
    expect(o.chance).toBeCloseTo(0.566, 3);
    // His shield holds it all: 40 × Attack 16.5 ÷ its Defense 17.6 × 1.057 = 39.6, rounded; the
    // robe and its quarter against fire are never reached.
    const attack = stageSize('qi-condensation', 5) * 1.05;
    const def = stageSize('qi-condensation', 6);
    expect(((40 * attack) / def) * 1.057).toBeCloseTo(39.6, 1);
    const after = combatantIn(r.fight, 'elder_mo')!;
    expect(after).toMatchObject({ hp: 176, shield: 136 });
    expect(after.armor!.hp).toBe(after.armor!.max);
    expect(r.fight.features.find((x) => x.id === 'spirit_grass')!.burning).toBe(2);
    expect(logLine(r.fight, o)).toBe(
      'Hit 57% · 40 fire · shield 136/176 · Elder Mo 176/176 · Qi 52/94 · grass burning (2 turns)',
    );
    // The five tags.
    expect(o).toMatchObject({
      form: 'palm',
      type: 'fire',
      realm: 'qi-condensation',
      result: 'hit',
      status: null,
    });
  });
});

describe('sizes (design § Combat, Realms are sizes)', () => {
  it('start at 10 and step ×3.1, ×4.6, ×6.7, ×10 a realm', () => {
    expect(rungSize(QC(1))).toBe(10);
    expect(realmSize('foundation-establishment')).toBeCloseTo(31);
    expect(realmSize('core-formation')).toBeCloseTo(142.6);
    expect(realmSize('nascent-soul')).toBeCloseTo(955.4, 0);
    expect(realmSize('deity-transformation')).toBeCloseTo(9554, 0);
    expect(tierScale(1)).toBe(1);
    expect(tierScale(2)).toBeCloseTo(3.1);
  });

  it('climb a realm’s stages to four-fifths of the step out, so a peak sits just under the next realm', () => {
    expect(realmSpread('qi-condensation')).toBeCloseTo(3.1 ** 0.8);
    expect(rungSize(QC(9))).toBeCloseTo(24.7, 1);
    expect(rungSize(QC(9))).toBeLessThan(rungSize(FE(1)));
    expect(rungSize(FE(4))).toBeCloseTo(105.1, 1);
    expect(rungSize(FE(4))).toBeLessThan(rungSize(CF(1)));
    // The half-step fight: layer 9 against early Foundation hits 44%.
    expect(hitChance(rungSize(QC(9)), rungSize(FE(1)))).toBeCloseTo(0.44, 2);
    // One realm up at the same stage: 24%, 18%, 13%.
    expect(hitChance(rungSize(QC(1)), rungSize(FE(1)))).toBeCloseTo(0.24, 2);
    expect(hitChance(rungSize(FE(1)), rungSize(CF(1)))).toBeCloseTo(0.18, 2);
    expect(hitChance(rungSize(CF(1)), rungSize(NS(1)))).toBeCloseTo(0.13, 2);
  });

  it('count a breakthrough grade as stages along the climb', () => {
    expect(rungSize(FE(1, 2))).toBeCloseTo(rungSize(FE(3)));
    expect(rungSize(FE(2, -1))).toBeCloseTo(rungSize(FE(1)));
    // Heavenly at the first stage: the peak's size.
    expect(rungSize(FE(1, 3))).toBeCloseTo(rungSize(FE(4)));
  });

  it('size HP at ten times and the qi pool at six, on the body and qi ladders', () => {
    const s = newLife({ name: 'Han Li', seed: 'sizes' });
    const low = fromCultivator(s.player, 'you');
    const high = fromCultivator(
      { ...s.player, body: { ...s.player.body, realm: 'foundation-establishment', stage: 1 } },
      'you',
    );
    expect(low).toMatchObject({ maxHp: 100, maxQi: 60, hp: 100, qi: 60 });
    expect(high.maxHp).toBe(310);
    // The floor: qi untrained counts at half the body's Foundation size, 15.5, so a pool of 93.
    expect(high.maxQi).toBe(93);
  });

  it('name the band a size sits in, in stage words', () => {
    expect(bandOf(10).name).toBe('Qi Condensation, first layer');
    expect(bandOf(24.7).name).toBe('Qi Condensation, ninth layer');
    expect(bandOf(31).name).toBe('Foundation Establishment, early');
    expect(bandOf(70).name).toBe('Foundation Establishment, late');
    expect(bandOf(1000).name).toBe('Nascent Soul, early');
    expect(bandOf(1).name).toBe('Qi Condensation, first layer');
  });

  it('read the six lines of a sheet with their bands', () => {
    const orphan = sheet(fighter({ id: 'a', name: 'A', side: 'a' }));
    expect(orphan.attack.qi).toEqual({ value: 10, band: 'Qi Condensation, first layer' });
    expect(orphan.hp).toEqual({ value: 100, band: 'Qi Condensation, first layer' });
    // A gold sword art sizes Attack at the next realm: the sheet says so.
    const gold = sheet(
      fighter({ id: 'b', name: 'B', side: 'b', weapon: weapon('sword', 1, 'gold') }),
    );
    expect(gold.attack.body.value).toBeCloseTo(31);
    expect(gold.attack.body.band).toBe('Foundation Establishment, early');
    expect(gold.attack.qi.band).toBe('Qi Condensation, first layer');
    const brisk = sheet(fighter({ id: 'c', name: 'C', side: 'c', agility: 14 }));
    expect(brisk.evasion.value).toBeCloseTo(12);
  });
});

describe('checks', () => {
  it('land with Accuracy over Accuracy plus Evasion', () => {
    expect(hitChance(10, 10)).toBe(0.5);
    expect(hitChance(20, 10)).toBeCloseTo(2 / 3);
    expect(hitChance(10, 31)).toBeCloseTo(0.244, 3);
  });

  it('crit at 5% plus 1% per Fortune above 10, and backfire by the toxicity meter', () => {
    expect(critChance(10)).toBeCloseTo(0.05);
    expect(critChance(14)).toBeCloseTo(0.09);
    expect(critChance(6)).toBeCloseTo(0.05);
    expect(backfireChance(0)).toBe(0);
    expect(backfireChance(50)).toBeCloseTo(0.125);
    expect(backfireChance(100)).toBeCloseTo(0.25);
    expect(backfireChance(500)).toBeCloseTo(0.25);
  });

  it('roll the backfire first, then the hit, then the crit', () => {
    expect(judge(new Rng(SEED_HIT), 10, 10)).toEqual({ result: 'hit', chance: 0.5 });
    expect(judge(new Rng(SEED_CRIT), 10, 10).result).toBe('critical');
    expect(judge(new Rng(SEED_MISS), 10, 10).result).toBe('miss');
    expect(judge(new Rng(SEED_BACKFIRE), 10, 10, { qi: true, toxicity: 50 }).result).toBe(
      'backfire',
    );
    // A clean meter never deviates, and a strike never does.
    expect(judge(new Rng(SEED_BACKFIRE), 10, 10, { qi: true, toxicity: 0 }).result).not.toBe(
      'backfire',
    );
    expect(judge(new Rng(SEED_BACKFIRE), 10, 10, { toxicity: 100 }).result).not.toBe('backfire');
  });
});

describe('damage', () => {
  const base = {
    base: 100,
    attack: 10,
    defense: 10,
    element: 1,
    resist: 0,
    result: 'hit' as const,
  };

  it('follows the formula, rounded to the nearest whole number', () => {
    expect(damage(base)).toBe(100);
    expect(damage({ ...base, result: 'critical' })).toBe(150);
    expect(damage({ ...base, attack: 31 })).toBe(310);
    expect(damage({ ...base, defense: 31 })).toBe(32);
    expect(damage({ ...base, element: 1.25, resist: 0.2 })).toBe(100);
    expect(damage({ ...base, base: 40.4 })).toBe(40);
    expect(damage({ ...base, combo: 1.2, spread: 0.85 })).toBe(102);
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
          tide: { technique: tech({ id: 'tide', damage: 'water', power: 40 }), accuracy: 1 },
        },
      }),
      wet,
    ]);
    const r = turn(f, [{ actor: 'b', main: hit('a', 'tide') }], SEED_HIT);
    expect(r.outcomes[0]).toMatchObject({ result: 'hit', damage: 20, chance: 0.5 });
  });

  it('sizes a technique’s base and a strike’s by their tier', () => {
    const t2 = tech({ id: 'deep', tier: 2, power: 40 });
    const x = fighter({
      id: 'x',
      name: 'X',
      side: 'x',
      rungs: all(FE(1)),
      techniques: { deep: { technique: t2, accuracy: 1 } },
    });
    const y = fighter({ id: 'y', name: 'Y', side: 'y', rungs: all(FE(1)) });
    const f = startFight([x, y]);
    expect(turn(f, [{ actor: 'x', main: hit('y', 'deep') }], SEED_HIT).outcomes[0]!.damage).toBe(
      124,
    );
    // Bare hands at Foundation: 20 × 3.1.
    expect(turn(f, [{ actor: 'x', main: hit('y') }], SEED_HIT).outcomes[0]!.damage).toBe(62);
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
        palm: { technique: tech({ id: 'palm', power: 40, qiCost: 10 }), accuracy: 1 },
        flame: {
          technique: tech({ id: 'flame', damage: 'fire', power: 40, qiCost: 10 }),
          accuracy: 1,
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
    f = turn(f, [{ actor: 'a', main: hit('b') }], SEED_HIT).fight;
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

  it('weighs Evasion by Agility, guard and statuses', () => {
    const f = startFight([a(), { ...b(), agility: 14 }]);
    expect(turn(f, [{ actor: 'a', main: hit('b') }]).outcomes[0]!.chance).toBeCloseTo(
      hitChance(10, 12),
    );
    const guarded = turn(f, [{ actor: 'b', main: { type: 'defend' } }]).fight;
    expect(turn(guarded, [{ actor: 'a', main: hit('b') }]).outcomes[0]!.chance).toBeCloseTo(
      hitChance(10, 18),
    );
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
      techniques: { deep: { technique: t2, accuracy: 1 } },
    });
    const f = startFight([x, fighter({ id: 'y', name: 'Y', side: 'y' })]);
    const r = turn(f, [{ actor: 'x', main: hit('y', 'deep') }]);
    expect(r.outcomes).toEqual([]);
    expect(r.skipped).toEqual([{ actor: 'x', reason: 'not enough qi' }]);
    const rich = turn(startFight([{ ...x, qi: 400 }, f.combatants[1]!]), [
      { actor: 'x', main: hit('y', 'deep') },
    ]);
    expect(rich.outcomes[0]!.qi).toBe(31);
    const strike = turn(f, [{ actor: 'x', main: hit('y') }]);
    expect(strike.outcomes[0]).toMatchObject({ action: 'strike', type: 'physical' });
  });

  it('comes back a tenth on defend, and barely on its own', () => {
    const x = fighter({ id: 'x', name: 'X', side: 'x', qi: 0, maxQi: 100 });
    const f = startFight([x, fighter({ id: 'y', name: 'Y', side: 'y' })]);
    const r = turn(f, [{ actor: 'x', main: { type: 'defend' } }]);
    expect(r.outcomes[0]).toMatchObject({ form: 'defend', result: 'held', qi: -10 });
    expect(combatantIn(r.fight, 'x')).toMatchObject({ qi: 10, guard: 1.5 });
    // The next turn starts with 2% back, and the guard holds until the next action.
    const next = turn(r.fight, [{ actor: 'y', main: hit('x') }]);
    expect(combatantIn(next.fight, 'x')!.qi).toBe(12);
    expect(next.outcomes[0]!.chance).toBeCloseTo(hitChance(10, 15));
  });

  it('backfires by the toxicity meter, turning the technique on its user at half strength', () => {
    const x = fighter({
      id: 'x',
      name: 'X',
      side: 'x',
      toxicity: 50,
      techniques: { palm: { technique: tech({ id: 'palm', power: 40 }), accuracy: 1 } },
    });
    const f = startFight([x, fighter({ id: 'y', name: 'Y', side: 'y' })]);
    const r = turn(f, [{ actor: 'x', main: hit('y', 'palm') }], SEED_BACKFIRE);
    expect(r.outcomes[0]).toMatchObject({
      result: 'backfire',
      damage: 20,
      hp: { id: 'x', hp: 80 },
    });
    expect(combatantIn(r.fight, 'y')!.hp).toBe(100);
    expect(combatantIn(r.fight, 'x')!.qi).toBe(50);
    // Clean, the same seed lands.
    const clean = turn(
      startFight([{ ...x, toxicity: 0 }, f.combatants[1]!]),
      [{ actor: 'x', main: hit('y', 'palm') }],
      SEED_BACKFIRE,
    );
    expect(clean.outcomes[0]!.result).not.toBe('backfire');
  });
});

describe('statuses', () => {
  const burner = () =>
    fighter({
      id: 'x',
      name: 'X',
      side: 'x',
      techniques: {
        flame: { technique: tech({ id: 'flame', damage: 'fire', power: 40 }), accuracy: 1 },
        frost: { technique: tech({ id: 'frost', damage: 'ice', power: 40 }), accuracy: 1 },
        vine: { technique: tech({ id: 'vine', damage: 'wood', power: 40 }), accuracy: 1 },
      },
    });
  const y = () => fighter({ id: 'y', name: 'Y', side: 'y', agility: 5 });

  it('land on a critical, tick at the start of each turn and run out', () => {
    const f = startFight([burner(), y()]);
    const r = turn(f, [{ actor: 'x', main: hit('y', 'flame') }], SEED_CRIT);
    expect(r.outcomes[0]).toMatchObject({ result: 'critical', damage: 60, status: 'burning' });
    expect(logLine(r.fight, r.outcomes[0]!)).toBe(
      'Critical 57% · 60 fire · Y 40/100 · Y burning · Qi 50/60',
    );
    const t2 = turn(r.fight, []);
    expect(t2.ticks).toEqual([{ id: 'y', status: 'burning', damage: 6 }]);
    const t3 = turn(t2.fight, []);
    expect(t3.ticks).toHaveLength(1);
    expect(combatantIn(t3.fight, 'y')).toMatchObject({ hp: 28, statuses: [] });
    // A plain hit applies none.
    const plain = turn(f, [{ actor: 'x', main: hit('y', 'flame') }], SEED_HIT);
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
      SEED_CRIT,
    );
    expect(frozen.skipped).toEqual([{ actor: 'y', reason: 'frozen' }]);
    const rooted = turn(f, [{ actor: 'x', main: hit('y', 'vine') }], SEED_CRIT);
    const fled = turn(rooted.fight, [{ actor: 'y', main: { type: 'flee' } }]);
    expect(fled.outcomes[0]).toMatchObject({ form: 'flee', result: 'failed' });
    expect(fled.outcomes[0]!.chance).toBeUndefined();
  });

  it('weigh Accuracy and Evasion while they last', () => {
    const f = startFight([burner(), y()]);
    // Chilled: Accuracy ×0.9 on the chilled one's next attack.
    const chilled = { ...y(), statuses: [{ id: 'chilled' as const, turns: 2, dot: 0, since: 0 }] };
    const r = turn(startFight([burner(), chilled]), [{ actor: 'y', main: hit('x') }]);
    expect(r.outcomes[0]!.chance).toBeCloseTo(hitChance(10 * 0.9, 10));
    expect(turn(f, [{ actor: 'y', main: hit('x') }]).outcomes[0]!.chance).toBeCloseTo(0.5);
    // Agility 5 is Evasion ×0.75 on the slow one.
    expect(turn(f, [{ actor: 'x', main: hit('y') }]).outcomes[0]!.chance).toBeCloseTo(
      hitChance(10, 7.5),
    );
  });
});

describe('creativity, talk and flight', () => {
  const x = () =>
    fighter({
      id: 'x',
      name: 'X',
      side: 'x',
      techniques: { palm: { technique: tech({ id: 'palm' }), accuracy: 1 } },
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
    const boosted = hitChance(10 * 1.1 ** 3, 10);
    const first = turn(f, [act(['crate'])], SEED_HIT);
    expect(first.outcomes[0]!.chance).toBeCloseTo(boosted);
    const again = turn(first.fight, [act(['crate'])], SEED_HIT);
    expect(again.outcomes[0]!.chance).toBeCloseTo(0.5);
    expect(turn(f, [act(['a golden dragon'])], SEED_HIT).outcomes[0]!.chance).toBeCloseTo(0.5);
    expect(turn(f, [act(['crate'], 9)], SEED_HIT).outcomes[0]!.chance).toBeCloseTo(boosted);
  });

  it('talks soul against soul, feeling the square root of the gap, against resolve', () => {
    const f = startFight([
      { ...x(), rungs: all(FE(1)) },
      { ...y(), rungs: all(FE(3)) },
    ]);
    const r = turn(
      f,
      [{ actor: 'x', main: { type: 'talk', style: 'bluff', target: 'y' } }],
      SEED_MISS,
    );
    const chance = hitChance(Math.sqrt(rungSize(FE(1))), Math.sqrt(rungSize(FE(3))));
    expect(r.outcomes[0]).toMatchObject({ form: 'talk', result: 'failed' });
    expect(r.outcomes[0]!.chance).toBeCloseTo(chance);
    expect(chance).toBeCloseTo(0.4, 2);
    // Firm resolve halves the odds.
    const firm = startFight([x(), { ...y(), resolve: 20 }]);
    expect(
      turn(firm, [{ actor: 'x', main: { type: 'talk', style: 'bluff', target: 'y' } }]).outcomes[0]!
        .chance,
    ).toBeCloseTo(1 / 3);
    const yield_ = turn(
      f,
      [{ actor: 'x', main: { type: 'talk', style: 'surrender', target: 'y' } }],
      SEED_HIT_30,
    );
    expect(yield_.outcomes[0]!.result).toBe('swayed');
    expect(combatantIn(yield_.fight, 'x')!.state).toBe('yielded');
    expect(fightOver(yield_.fight)).toBe(true);
  });

  it('flees against the hardest foe to outrun, feeling the square root of the gap', () => {
    const f = startFight([x(), { ...y(), agility: 14 }]);
    const r = turn(f, [{ actor: 'x', main: { type: 'flee' } }], SEED_HIT_30);
    expect(r.outcomes[0]).toMatchObject({ result: 'escaped' });
    expect(r.outcomes[0]!.chance).toBeCloseTo(hitChance(1, 1.2));
    expect(combatantIn(r.fight, 'x')!.state).toBe('fled');
    // Four layers up is ×1.57 in size, felt as ×1.25.
    const up = startFight([x(), { ...y(), agility: 14, rungs: all(QC(5)) }]);
    const out = turn(up, [{ actor: 'x', main: { type: 'flee' } }], SEED_HIT_30).outcomes[0]!;
    expect(out.chance).toBeCloseTo(hitChance(Math.sqrt(10), Math.sqrt(rungSize(QC(5))) * 1.2));
    expect(out.chance).toBeLessThan(0.41);
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
      SEED_HIT,
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

  it('take gear as bands: a weapon at its full band on strikes and half on its Dao’s techniques', () => {
    const red = weapon('saber', 1, 'red');
    expect(red.strike).toBeCloseTo(3.1 ** 1.3);
    expect(red.technique).toBeCloseTo(Math.sqrt(3.1 ** 1.3));
    expect(red.accuracy).toBeCloseTo(Math.sqrt(1.4));
    expect(weapon('fist', 1, 'gold').accuracy).toBeCloseTo(Math.sqrt(1.2));
    expect(weapon('fist', 1, 'blue').accuracy).toBe(1);
    // Armor is a bar of its own: its size is its tier's realm at its band, its durability three
    // points a point of size.
    expect(armor(2, 'red').defense).toBeCloseTo(31 * 4.6 ** 1.3);
    const gold = armor(1, 'gold');
    expect(gold).toMatchObject({ hp: 93, max: 93 });
    expect(gold.defense).toBeCloseTo(31);
    // A gold robe is a Defense from the next realm: a plain strike's 20 is 6 on it, and the body
    // under it takes nothing while it holds.
    const robed = fighter({ id: 'a', name: 'A', side: 'a', armor: gold });
    const f = startFight([fighter({ id: 'b', name: 'B', side: 'b' }), robed]);
    const r = turn(f, [{ actor: 'b', main: hit('a') }], SEED_HIT);
    expect(r.outcomes[0]).toMatchObject({ damage: Math.round(20 / 3.1), hp: { hp: 100 } });
    expect(combatantIn(r.fight, 'a')!.armor!.hp).toBe(93 - 6);
  });
});
