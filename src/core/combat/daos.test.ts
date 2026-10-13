// The combat Daos in a fight (design § The combat Daos): Dao tiers held from the trees, each
// Dao's own stats on the actions it counts, and the rule twists the notables and capstones carry.
import { describe, expect, it } from 'vitest';
import type { Technique } from '../../content/techniques.ts';
import { DAOS, tierNodes, tree } from '../../content/trees/index.ts';
import { Rng } from '../rng.ts';
import { newLife, type Cultivator } from '../state.ts';
import { learnNode } from '../trees.ts';
import { combatant, daoTiers, fromCultivator, type CombatantInit } from './combatant.ts';
import { combatantIn, preview, resolveTurn, startFight, type Action, type Fight } from './fight.ts';

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

const EMBER = tech({ id: 'ember', daos: ['fire'], damage: 'fire', qiCost: 12 });
const THRUST = tech({ id: 'thrust', daos: ['spear'], form: 'thrust' });
const CUT = tech({ id: 'cut', daos: ['saber'], form: 'slash' });
const knows = (...ts: Technique[]) =>
  Object.fromEntries(ts.map((t) => [t.id, { technique: t, accuracy: 1 }]));

/** Sure to land and sure to crit, so the rules can be read off one turn. */
const SURE = { accuracy: 1e6 };
const CRITS = { fortune: 1000 };

function fight(me: Partial<CombatantInit>, ...foes: Partial<CombatantInit>[]): Fight {
  return startFight([
    combatant({ id: 'me', name: 'Me', side: 'a', techniques: knows(EMBER, THRUST, CUT), ...me }),
    ...foes.map((f, i) => combatant({ id: `foe${i + 1}`, name: `Foe ${i + 1}`, side: 'b', ...f })),
  ]);
}

const hit = (target = 'foe1', id = 'ember'): Action => ({
  actor: 'me',
  main: { type: 'technique', id, target },
});
const turn = (f: Fight, ...actions: Action[]) => resolveTurn(f, actions, new Rng(14));

function learnAll(c: Cultivator, ids: readonly string[]): Cultivator {
  return ids.reduce((acc, id) => {
    const r = learnNode(acc, id);
    expect(r.check, id).toEqual({ ok: true });
    return r.cultivator;
  }, c);
}

describe('Dao tiers from the trees', () => {
  const rich = () => ({
    ...newLife({ name: 'Han Li', seed: 'daos' }).player,
    insight: { current: 1e6, earned: 1e6 },
  });

  it('hold a tier once half its nodes are owned, never above the qi realm', () => {
    const fire = tree('fire');
    const half = Math.ceil(tierNodes(fire, 1).length / 2);
    const ids = tierNodes(fire, 1).map((n) => n.id);
    expect(daoTiers(learnAll(rich(), ids.slice(0, half - 1)))).toEqual({});
    const held = learnAll(rich(), ids.slice(0, half));
    expect(daoTiers(held)).toEqual({ fire: 1 });
    // Tier 2 learned in full stays sealed at Qi Condensation, and counts at Foundation.
    const both = learnAll(held, [...ids.slice(half), ...tierNodes(fire, 2).map((n) => n.id)]);
    expect(daoTiers(both)).toEqual({ fire: 1 });
    const fe = { ...both, qi: { ...both.qi, realm: 'foundation-establishment' as const } };
    expect(daoTiers(fe)).toEqual({ fire: 2 });
  });

  it('size the actions a Dao counts: its tag, or an element Dao’s own damage type', () => {
    const c = learnAll(
      rich(),
      tierNodes(tree('fire'), 1)
        .slice(0, 7)
        .map((n) => n.id),
    );
    const me = fromCultivator(c, 'a');
    expect(me.daos).toEqual({ fire: 1 });
    expect(me.mods.firePower).toBeGreaterThan(0);
    // A fire technique tagged with no Dao still counts the Fire Dao.
    const untagged = tech({ id: 'bare-fire', damage: 'fire' });
    const plain = fight({ techniques: knows(untagged) }, {});
    const daoed = fight({ ...me, id: 'me', side: 'a', techniques: knows(untagged) }, {});
    const m = { type: 'technique' as const, id: 'bare-fire', target: 'foe1' };
    const a = preview(plain, 'me', m)!;
    const b = preview(daoed, 'me', m)!;
    expect(b.damage).toBeGreaterThan(a.damage);
  });

  it('come to nine trees, each tagging its own Dao', () => {
    expect(DAOS).toHaveLength(9);
  });
});

describe('Dao stats on the actions they count', () => {
  it('power, hit, cost and pierce move only their own Dao', () => {
    const plain = fight({}, { resist: { fire: 0.5 } });
    const fire = fight(
      { mods: { firePower: 0.5, fireHit: 1, fireCost: -0.5, firePierce: 1 } },
      { resist: { fire: 0.5 } },
    );
    const a = preview(plain, 'me', hit().main!)!;
    const b = preview(fire, 'me', hit().main!)!;
    // ×1.5 power and the half resist pierced: ×3 damage, double Accuracy, half the qi.
    expect(b.damage / a.damage).toBeCloseTo(3, 1);
    expect(b.chance).toBeCloseTo(2 / 3);
    expect(b.qi).toBe(Math.round(a.qi / 2));
    // A saber cut is untouched by the Fire Dao.
    const cut = { type: 'technique' as const, id: 'cut', target: 'foe1' };
    expect(preview(fire, 'me', cut)).toEqual(preview(plain, 'me', cut));
  });
});

describe('the rule twists', () => {
  it('Dragon Thrust: the first thrust each turn cannot miss', () => {
    const f = fight({ mods: { dragonThrust: 1 } }, {});
    expect(preview(f, 'me', hit('foe1', 'thrust').main!)!.chance).toBe(1);
    expect(preview(f, 'me', hit('foe1', 'ember').main!)!.chance).toBe(0.5);
  });

  it('Mist Step halves the first hit against you each fight, Unmoved the first each turn', () => {
    const plain = turn(fight(SURE, {}), hit()).outcomes[0]!.damage!;
    const misted = turn(fight(SURE, { mods: { mistStep: 1 } }), hit());
    expect(misted.outcomes[0]!.damage).toBe(Math.round(plain / 2));
    const again = turn(misted.fight, hit());
    expect(again.outcomes[0]!.damage).toBe(plain);
    const unmoved = turn(fight(SURE, { mods: { unmoved: 1 } }), hit());
    expect(turn(unmoved.fight, hit()).outcomes[0]!.damage).toBe(Math.round(plain / 2));
  });

  it('Evergreen keeps a quarter of the HP once a fight', () => {
    const f = fight({ ...SURE, techniquePower: 1000 }, { mods: { evergreen: 1 } });
    const r = turn(f, hit());
    const foe = combatantIn(r.fight, 'foe1')!;
    expect(foe.state).toBe('fighting');
    expect(foe.hp).toBe(Math.round(foe.maxHp / 4));
    expect(combatantIn(turn(r.fight, hit()).fight, 'foe1')!.state).toBe('down');
  });

  it('Searing and Lasting Burn: burns last longer, bite harder and stack', () => {
    const plain = turn(fight({ ...SURE, ...CRITS }, { maxHp: 1e6 }), hit());
    const burn = combatantIn(plain.fight, 'foe1')!.statuses.find((s) => s.id === 'burning')!;
    const seared = turn(
      fight(
        { ...SURE, ...CRITS, mods: { burnTurns: 1, burnBite: 0.5, stackBurn: 1 } },
        { maxHp: 1e6 },
      ),
      hit(),
    );
    const s1 = combatantIn(seared.fight, 'foe1')!.statuses.find((s) => s.id === 'burning')!;
    expect(s1.turns).toBe(burn.turns + 1);
    expect(s1.dot).toBe(Math.round(burn.dot * 1.5));
    const twice = turn(seared.fight, hit());
    const s2 = combatantIn(twice.fight, 'foe1')!.statuses.find((s) => s.id === 'burning')!;
    expect(s2.dot).toBeGreaterThan(s1.dot);
  });

  it('Rising Flame spreads a critical burn to a second foe', () => {
    const r = turn(fight({ ...SURE, ...CRITS, mods: { spreadBurn: 1 } }, {}, {}), hit());
    expect(combatantIn(r.fight, 'foe2')!.statuses.map((s) => s.id)).toContain('burning');
  });

  it('a spear sweep spills onto a second foe, and Whirl onto every foe', () => {
    const sweep = turn(fight({ ...SURE, mods: { sweep: 0.5 } }, {}, {}, {}), hit('foe1', 'thrust'));
    expect(sweep.outcomes.map((o) => o.target)).toEqual(['foe1', 'foe2']);
    expect(sweep.outcomes[1]!.damage).toBe(Math.round(sweep.outcomes[0]!.damage! / 2));
    const whirl = turn(
      fight({ ...SURE, mods: { sweep: 0.5, whirl: 1 } }, {}, {}, {}),
      hit('foe1', 'thrust'),
    );
    expect(whirl.outcomes.map((o) => o.target)).toEqual(['foe1', 'foe2', 'foe3']);
  });

  it('Momentum: each saber hit in a row adds damage', () => {
    const f = fight({ ...SURE, maxQi: 1000, qi: 1000, mods: { momentum: 0.5 } }, { maxHp: 1e6 });
    const one = turn(f, hit('foe1', 'cut'));
    const two = turn(one.fight, hit('foe1', 'cut'));
    expect(two.outcomes[0]!.damage! / one.outcomes[0]!.damage!).toBeCloseTo(1.5, 1);
  });

  it('First Blood acts first in the first turn', () => {
    const f = fight({ agility: 1, mods: { firstBlood: 1 } }, { agility: 50 });
    const r = resolveTurn(
      f,
      [
        { actor: 'foe1', main: { type: 'defend' } },
        { actor: 'me', main: { type: 'defend' } },
      ],
      new Rng(1),
    );
    expect(r.outcomes.map((o) => o.actor)).toEqual(['me', 'foe1']);
  });

  it('Hundred Fists: a critical grants a second main action, once a fight', () => {
    const f = fight(
      { ...SURE, ...CRITS, maxQi: 1000, qi: 1000, mods: { hundredFists: 1 } },
      {
        maxHp: 1e6,
      },
    );
    const r = turn(f, hit());
    expect(r.outcomes.filter((o) => o.actor === 'me')).toHaveLength(2);
    expect(turn(r.fight, hit()).outcomes.filter((o) => o.actor === 'me')).toHaveLength(1);
  });

  it('Flurry strikes as the minor action with fists', () => {
    const f = fight({ ...SURE, mods: { flurry: 0.5 } }, { maxHp: 1e6 });
    const r = resolveTurn(
      f,
      [{ actor: 'me', minor: { type: 'flurry', target: 'foe1' }, main: hit().main }],
      new Rng(14),
    );
    expect(r.outcomes.map((o) => o.action)).toEqual(['strike', 'technique']);
  });

  it('Sword Rain: once a fight, a sword technique strikes every foe', () => {
    const sword = tech({ id: 'sword', daos: ['sword'], form: 'thrust' });
    const f = fight({ ...SURE, techniques: knows(sword), mods: { swordRain: 1 } }, {}, {});
    const r = turn(f, hit('foe1', 'sword'));
    expect(r.outcomes.map((o) => o.target)).toEqual(['foe1', 'foe2']);
    expect(turn(r.fight, hit('foe1', 'sword')).outcomes).toHaveLength(1);
  });

  it('Immovable and Clear Heart shrug off their statuses', () => {
    const quake = tech({ id: 'quake', damage: 'earth' });
    const f = fight({ ...SURE, ...CRITS, techniques: knows(quake) }, { mods: { steady: 1 } });
    const r = turn(f, hit('foe1', 'quake'));
    expect(combatantIn(r.fight, 'foe1')!.statuses).toEqual([]);
  });
});
