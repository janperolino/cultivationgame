// C3, the realm gap built (design § Combat: Speed is tempo, Protective qi, A crowd that can't
// scratch you breaks; the code review's major 4, a cast at many foes as one action). Tempo banked
// against the fastest foe and its cap; the rout; and the cast's backfire, spill, qi on a hit,
// combo, Sword Rain and Dragon Thrust read once a cast. The sizes, the grade's share and the
// second floor are in combat.test.ts.
import { describe, expect, it } from 'vitest';
import { KITS } from '../../content/enemies.ts';
import type { Technique } from '../../content/techniques.ts';
import { Rng } from '../rng.ts';
import { combatant, movementLift, tempo, type CombatantInit } from './combatant.ts';
import {
  combatantIn,
  preview,
  resolveTurn,
  routed,
  startFight,
  type Action,
  type Fight,
} from './fight.ts';
import { kitFighter, movementRarity } from './generate.ts';
import { runFight } from './profile.ts';
import type { Rung } from './sheet.ts';

const art = (id: string, extra: Partial<Technique> = {}): Technique => ({
  id,
  name: id,
  pinyin: '',
  hanzi: '',
  ladder: 'qi',
  tier: 1,
  rarity: 'white',
  line: id,
  chapter: 1,
  daos: [],
  form: 'palm',
  damage: 'physical',
  power: 40,
  qiCost: 10,
  source: 'test',
  text: '',
  ...extra,
});
const knows = (...ts: Technique[]) =>
  Object.fromEntries(ts.map((t) => [t.id, { technique: t, accuracy: 1 }]));
const at = (realm: Rung['realm'], stage: number): Rung => ({ realm, stage, grade: 0 });
const all = (r: Rung) => ({ qi: r, body: r, soul: r });
const kit = (id: string) => KITS.find((k) => k.id === id)!;

const fighter = (id: string, side: string, extra: Partial<CombatantInit> = {}) =>
  combatant({ id, name: id, side, maxHp: 1e9, hp: 1e9, ...extra });
const defendAll = (f: Fight): Action[] =>
  f.combatants.map((c) => ({ actor: c.id, main: { type: 'defend' } }));

/** How many actions each fighter took on each of `turns` turns. */
function actions(f: Fight, turns: number): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  let fight = f;
  for (let i = 0; i < turns; i++) {
    const r = resolveTurn(fight, defendAll(fight), new Rng(i));
    for (const c of fight.combatants) {
      (out[c.id] ??= []).push(r.outcomes.filter((o) => o.actor === c.id).length);
    }
    fight = r.fight;
  }
  return out;
}

describe('speed is tempo', () => {
  it('reads Agility, the movement art’s square root and the square root of the size', () => {
    const plain = fighter('a', 'a');
    expect(tempo(plain)).toBeCloseTo(Math.sqrt(10));
    expect(tempo(fighter('a', 'a', { rungs: all(at('foundation-establishment', 1)) }))).toBeCloseTo(
      Math.sqrt(31),
    );
    expect(tempo(fighter('a', 'a', { agility: 20 }))).toBeCloseTo(1.5 * Math.sqrt(10));
    // A purple movement art at tier 1 is ×1.6, gold of the next tier ×2.1; none lifts nothing.
    expect(movementLift({ guards: { shield: 1, hardening: 1, movement: 3.1 ** 0.8 } })).toBeCloseTo(
      1.57,
      2,
    );
    expect(movementLift({ guards: { shield: 1, hardening: 1, movement: 4.6 } })).toBeCloseTo(
      2.14,
      2,
    );
    expect(movementLift({ guards: { shield: 0, hardening: 0, movement: 0 } })).toBe(1);
  });

  it('gives a generated cultivator a movement art a band below their arts, from green', () => {
    expect(
      ['gray', 'white', 'green', 'purple', 'gold'].map((r) => movementRarity(r as never)),
    ).toEqual(['gray', 'white', 'white', 'blue', 'purple']);
    const purple = kitFighter(kit('great-sect'), 'qi-condensation', 9, { id: 'p', side: 'p' });
    expect(purple.guards.movement).toBeCloseTo(1.5);
    expect(purple.guards.hardening).toBeCloseTo(3.1 ** 0.8);
  });

  it('acts twice every turn at twice a foe’s tempo, every other turn at ×1.5, every fourth at ×1.25', () => {
    const vs = (agility: number) =>
      actions(startFight([fighter('quick', 'a', { agility }), fighter('slow', 'b')]), 4);
    expect(vs(30).quick).toEqual([2, 2, 2, 2]);
    expect(vs(20).quick).toEqual([1, 2, 1, 2]);
    expect(vs(15).quick).toEqual([1, 1, 1, 2]);
    expect(vs(30).slow).toEqual([1, 1, 1, 1]);
    // An early Core against an early Foundation: √4.6 = ×2.1, twice every turn.
    const core = actions(
      startFight([
        fighter('core', 'a', { rungs: all(at('core-formation', 1)) }),
        fighter('fe', 'b', { rungs: all(at('foundation-establishment', 1)) }),
      ]),
      3,
    );
    expect(core.core).toEqual([2, 2, 2]);
  });

  it('never acts more than twice a turn, and the bank never stores turns past one', () => {
    let f = startFight([fighter('quick', 'a', { agility: 70 }), fighter('slow', 'b')]);
    for (let i = 0; i < 5; i++) {
      const r = resolveTurn(f, defendAll(f), new Rng(i));
      expect(r.outcomes.filter((o) => o.actor === 'quick')).toHaveLength(2);
      f = r.fight;
      expect(combatantIn(f, 'quick')!.marks.tempo).toBeLessThanOrEqual(1);
    }
  });

  it('banks against the fastest foe still standing', () => {
    const slow = fighter('slow', 'b');
    const fast = fighter('fast', 'b', { agility: 30 });
    // Against a foe as quick as you, nothing banks; once that foe is down, you outrun the rest.
    const both = actions(startFight([fighter('me', 'a', { agility: 30 }), slow, fast]), 2);
    expect(both.me).toEqual([1, 1]);
    const left = actions(
      startFight([fighter('me', 'a', { agility: 30 }), slow, { ...fast, state: 'down' }]),
      2,
    );
    expect(left.me).toEqual([2, 2]);
  });

  it('lets a profile choose the extra action, or repeats the main action at another foe', () => {
    const palm = art('palm');
    const f = startFight([
      fighter('me', 'a', { agility: 30, accuracy: 1e9, techniques: knows(palm) }),
      fighter('f0', 'b', { hp: 1, maxHp: 1, maxShield: 0 }),
      fighter('f1', 'b'),
    ]);
    const r = resolveTurn(
      f,
      [{ actor: 'me', main: { type: 'technique', id: 'palm', target: 'f0' } }],
      new Rng(1),
    );
    expect(r.outcomes.filter((o) => o.actor === 'me').map((o) => o.target)).toEqual(['f0', 'f1']);
  });
});

describe('a crowd that can’t scratch you breaks', () => {
  const layer9 = (id: string, extra: Partial<CombatantInit> = {}) => ({
    ...kitFighter(kit('ordinary'), 'qi-condensation', 9, { id, side: 'b' }),
    ...extra,
  });
  const senior = () =>
    kitFighter(kit('ordinary'), 'foundation-establishment', 1, { id: 'fe', side: 'a' });

  it('flees once a third of its side has fallen and every hit it has is held to a twentieth', () => {
    const crowd = (down: number) =>
      startFight([
        senior(),
        ...Array.from({ length: 6 }, (_, i) =>
          layer9(`b${i}`, i < down ? { state: 'down' as const } : {}),
        ),
      ]);
    expect(routed(crowd(1), combatantIn(crowd(1), 'b5')!)).toBe(false);
    expect(routed(crowd(2), combatantIn(crowd(2), 'b5')!)).toBe(true);
  });

  it('holds on while it can still hurt someone: a purple disciple, or a peer', () => {
    const purple = kitFighter(kit('great-sect'), 'qi-condensation', 9, { id: 'p', side: 'b' });
    const f = startFight([
      senior(),
      layer9('b0', { state: 'down' }),
      layer9('b1', { state: 'down' }),
      purple,
    ]);
    expect(routed(f, combatantIn(f, 'p')!)).toBe(false);
    // At the same realm protective qi never holds, so a peer never breaks.
    const peers = startFight([
      kitFighter(kit('ordinary'), 'qi-condensation', 9, { id: 'me', side: 'a' }),
      layer9('b0', { state: 'down' }),
      layer9('b1'),
    ]);
    expect(routed(peers, combatantIn(peers, 'b1')!)).toBe(false);
  });

  it('breaks and runs in a fight: an early Foundation scatters a crowd of layer 9s', () => {
    const f = startFight([senior(), ...Array.from({ length: 12 }, (_, i) => layer9(`b${i}`))]);
    const r = runFight(f, Rng.fromString('rout'), 200);
    expect(r.winner).toBe('a');
    expect(r.fled.length).toBeGreaterThan(0);
  });
});

describe('a cast at many foes is one action (the code review’s major 4)', () => {
  const foes = (n: number, extra: (i: number) => Partial<CombatantInit> = () => ({})) =>
    Array.from({ length: n }, (_, i) => fighter(`f${i}`, 'b', { maxShield: 0, ...extra(i) }));
  const me = (techniques: Technique[], extra: Partial<CombatantInit> = {}) =>
    fighter('me', 'a', {
      techniques: knows(...techniques),
      qi: 10_000,
      maxQi: 10_000,
      accuracy: 1e9,
      ...extra,
    });
  const castAt = (f: Fight, id: string, seed = 1) =>
    resolveTurn(f, [{ actor: 'me', main: { type: 'technique', id, target: 'f0' } }], new Rng(seed));

  it('rolls qi deviation once, and a backfire strikes no foe', () => {
    const blast = art('blast', { targets: 10 });
    let backfires = 0;
    for (let seed = 0; seed < 200; seed++) {
      const r = castAt(startFight([me([blast], { toxicity: 100 }), ...foes(10)]), 'blast', seed);
      const bf = r.outcomes.filter((o) => o.result === 'backfire');
      expect(bf.length).toBeLessThanOrEqual(1);
      if (bf.length) {
        backfires++;
        expect(r.outcomes).toHaveLength(1);
      } else expect(r.outcomes).toHaveLength(10);
    }
    // A full meter deviates about one cast in four, not one foe in four.
    expect(backfires / 200).toBeGreaterThan(0.15);
    expect(backfires / 200).toBeLessThan(0.35);
  });

  it('stops when the caster is down', () => {
    const blast = art('blast', { targets: 10 });
    for (let seed = 0; seed < 50; seed++) {
      const r = castAt(
        startFight([me([blast], { toxicity: 100, hp: 1, maxHp: 1e9 }), ...foes(10)]),
        'blast',
        seed,
      );
      if (combatantIn(r.fight, 'me')!.state === 'down') {
        expect(r.outcomes.every((o) => o.target === 'f0' && o.result === 'backfire')).toBe(true);
      }
    }
  });

  it('spills a sweep only onto foes the cast doesn’t strike, each foe once', () => {
    const spear = art('spear', { daos: ['spear'], targets: 3 });
    const r = castAt(startFight([me([spear], { mods: { sweep: 0.5 } }), ...foes(5)]), 'spear');
    const targets = r.outcomes.map((o) => o.target);
    expect(new Set(targets).size).toBe(targets.length);
    expect(targets).toEqual(['f0', 'f3', 'f1', 'f2']);
  });

  it('pays qi on a hit once a cast, and keeps the combo from any foe hit', () => {
    const fire = art('fire', { damage: 'fire', targets: 3 });
    const f = startFight([
      me([fire], { mods: { qiOnHit: 0.01 }, accuracy: 1000, qi: 5000 }),
      ...foes(3, (i) => (i === 2 ? { agility: 1e7 } : {})),
    ]);
    const r = castAt(f, 'fire');
    expect(r.outcomes.map((o) => o.result === 'miss')).toEqual([false, false, true]);
    const after = combatantIn(r.fight, 'me')!;
    expect(after.qi).toBe(5000 - r.outcomes[0]!.qi! + 100);
    // The last foe missed, and the combo still stands on the hits before it.
    expect(after.combo).toEqual({ element: 'fire', chain: 0 });
  });

  it('reads Dragon Thrust’s sure hit on every foe of the cast, as the preview shows', () => {
    const thrust = art('thrust', { form: 'thrust', targets: 3 });
    const f = startFight([
      me([thrust], { accuracy: 1, mods: { dragonThrust: 1 } }),
      ...foes(3, () => ({ agility: 1e6 })),
    ]);
    const p = preview(f, 'me', { type: 'technique', id: 'thrust', target: 'f0' })!;
    expect(p.chance).toBe(1);
    const r = castAt(f, 'thrust');
    expect(r.outcomes.map((o) => o.chance)).toEqual([1, 1, 1]);
    expect(r.outcomes.every((o) => o.result !== 'miss')).toBe(true);
  });

  it('keeps Sword Rain for a cast it widens', () => {
    const sword = art('cut', { daos: ['sword'] });
    const rain = art('rain', { daos: ['sword'], targets: 'all' });
    const rained = (ts: Technique[], id: string, n: number) =>
      combatantIn(
        castAt(startFight([me(ts, { mods: { swordRain: 1 } }), ...foes(n)]), id).fight,
        'me',
      )!.marks.swordRain;
    expect(rained([sword], 'cut', 1)).toBeUndefined();
    expect(rained([rain], 'rain', 5)).toBeUndefined();
    expect(rained([sword], 'cut', 5)).toBe(1);
  });

  it('prices the chosen foe alone beside the whole cast, which the crowd pick reads', () => {
    const sweep = art('sweep', { targets: 3 });
    const f = startFight([me([sweep, art('palm')]), ...foes(5)]);
    const p = preview(f, 'me', { type: 'technique', id: 'sweep', target: 'f0' })!;
    const one = preview(f, 'me', { type: 'technique', id: 'palm', target: 'f0' })!;
    expect(p.first).toBeCloseTo(one.expected);
    expect(p.expected).toBeCloseTo(3 * one.expected);
  });
});
