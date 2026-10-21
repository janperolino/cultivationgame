// C2, arts that strike many (design § Combat, Arts that strike many): the count by tier, the
// nearest foes after the chosen one, a roll each, the qi paid as √ of the foes, an art that strikes
// all splitting past its tier's full count, Sword Rain and Whirl on the same rule, the profiles
// sweeping a crowd and striking one foe alone, and the catalogs' sweeps at least as common as
// single arts at every tier and rarity.
import { describe, expect, it } from 'vitest';
import { REACH, fullCount, reachCost } from '../../content/combat.ts';
import { TECHNIQUES, type Technique } from '../../content/techniques.ts';
import { Rng } from '../rng.ts';
import { combatant } from './combatant.ts';
import { preview, resolveTurn, startFight, techniqueCost } from './fight.ts';
import { chooseAction, profile } from './profile.ts';

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
const SINGLE = art('palm');
const SWEEP = art('sweep', { targets: 3 });
const ALL = art('rain', { targets: 'all' });
const knows = (...ts: Technique[]) =>
  Object.fromEntries(ts.map((t) => [t.id, { technique: t, accuracy: 1 }]));

const me = (extra = {}) =>
  combatant({
    id: 'me',
    name: 'me',
    side: 'a',
    techniques: knows(SINGLE, SWEEP, ALL),
    qi: 10_000,
    maxQi: 10_000,
    ...extra,
  });
const foes = (n: number) =>
  Array.from({ length: n }, (_, i) =>
    combatant({ id: `f${i}`, name: `f${i}`, side: 'b', hp: 1e6, maxHp: 1e6 }),
  );
const cast = (id: string, n: number, target = 'f0', extra = {}) =>
  resolveTurn(
    startFight([me(extra), ...foes(n)]),
    [{ actor: 'me', main: { type: 'technique', id, target } }],
    new Rng(4),
  );

describe('arts that strike many', () => {
  it('reach by tier, never by rarity: 3, 5 or 10 at tier 1, 5, 10 or 20 at tier 2', () => {
    expect(REACH[0]).toEqual({ common: 3, blast: 5, all: 10 });
    expect(REACH[1]).toEqual({ common: 5, blast: 10, all: 20 });
    expect(fullCount('all', 1)).toBe(10);
    expect(fullCount('all', 3)).toBe(50);
    expect(fullCount(undefined, 2)).toBe(1);
  });

  it('strike the chosen foe, then the nearest in the fight’s order, one outcome each', () => {
    const r = cast('sweep', 6, 'f2');
    expect(r.outcomes.map((o) => o.target)).toEqual(['f2', 'f0', 'f1']);
    expect(cast('sweep', 2).outcomes).toHaveLength(2);
    expect(cast('palm', 6).outcomes).toHaveLength(1);
  });

  it('roll the hit and the crit for each foe, each taking the full hit', () => {
    const r = cast('rain', 10);
    const results = new Set(r.outcomes.map((o) => o.result));
    expect(results.size).toBeGreaterThan(1);
    const single = cast('palm', 1);
    const hits = r.outcomes.filter((o) => o.result === 'hit').map((o) => o.damage!);
    const plain = single.outcomes[0]!.result === 'hit' ? single.outcomes[0]!.damage! : null;
    if (plain !== null) for (const d of hits) expect(d / plain).toBeGreaterThan(0.8);
  });

  it('pay qi as the square root of the foes they strike, so a single art is the cheap one', () => {
    const c = me();
    expect(techniqueCost(c, SINGLE)).toBe(10);
    expect(techniqueCost(c, SWEEP)).toBe(Math.round(10 * Math.sqrt(3)));
    expect(techniqueCost(c, ALL)).toBe(Math.round(10 * Math.sqrt(10)));
    expect(reachCost(10, 2)).toBeCloseTo(Math.sqrt(10));
    const r = cast('sweep', 5);
    expect(r.outcomes[0]!.qi).toBe(17);
  });

  it('split the hit past the full count when they strike all: twenty foes take half each', () => {
    const p10 = preview(startFight([me(), ...foes(10)]), 'me', {
      type: 'technique',
      id: 'rain',
      target: 'f0',
    })!;
    const p20 = preview(startFight([me(), ...foes(20)]), 'me', {
      type: 'technique',
      id: 'rain',
      target: 'f0',
    })!;
    expect(p10.foes).toBe(10);
    expect(p20.foes).toBe(20);
    // The same total over twice the foes: each takes half.
    expect(p20.damage).toBeCloseTo(p10.damage, -1);
    expect(cast('rain', 20).outcomes).toHaveLength(20);
  });

  it('price the whole cast in the preview, and the profiles sweep a crowd but strike one foe alone', () => {
    const crowd = startFight([me(), ...foes(5)]);
    const p = preview(crowd, 'me', { type: 'technique', id: 'sweep', target: 'f0' })!;
    const one = preview(crowd, 'me', { type: 'technique', id: 'palm', target: 'f0' })!;
    expect(p.foes).toBe(3);
    expect(p.expected).toBeCloseTo(3 * one.expected);
    const pick = (f: ReturnType<typeof startFight>) => {
      const m = chooseAction(f, 'me', profile('aggressive')).main;
      return m && m.type === 'technique' ? m.id : m?.type;
    };
    expect(['sweep', 'rain']).toContain(pick(crowd));
    // One foe: every art does it the same harm, so the cheapest is taken.
    expect(pick(startFight([me(), ...foes(1)]))).toBe('palm');
  });

  it('read Sword Rain and Whirl on the same rule: all foes once a fight, split past the full count', () => {
    const sword = art('cut', { daos: ['sword'] });
    const rain = (n: number) =>
      resolveTurn(
        startFight([me({ techniques: knows(sword), mods: { swordRain: 1 } }), ...foes(n)]),
        [{ actor: 'me', main: { type: 'technique', id: 'cut', target: 'f0' } }],
        new Rng(9),
      );
    expect(rain(4).outcomes).toHaveLength(4);
    expect(rain(30).outcomes).toHaveLength(30);
    const spear = art('thrust', { daos: ['spear'] });
    const sure = { accuracy: 1e9 };
    const whirl = (n: number) =>
      resolveTurn(
        startFight([
          me({ techniques: knows(spear), mods: { sweep: 0.5, whirl: 1 }, ...sure }),
          ...foes(n),
        ]),
        [{ actor: 'me', main: { type: 'technique', id: 'thrust', target: 'f0' } }],
        new Rng(9),
      ).outcomes;
    const few = whirl(5);
    const many = whirl(40);
    expect(many).toHaveLength(40);
    // Forty foes against a full count of ten: each spill is a quarter of what five foes take.
    const share = (os: typeof few) => os[1]!.damage! / os[0]!.damage!;
    expect(share(many) / share(few)).toBeCloseTo(0.25, 1);
  });

  it('are at least as common as single arts at every tier and rarity in the catalogs', () => {
    const cells = new Map<string, { one: number; many: number }>();
    for (const t of TECHNIQUES) {
      // A guard art is never cast, and a volley throws talismans, each its own reach (K11).
      if (t.guard || t.volley) continue;
      const k = `${t.tier}/${t.rarity}`;
      const cell = cells.get(k) ?? { one: 0, many: 0 };
      if (fullCount(t.targets, t.tier) > 1) cell.many++;
      else cell.one++;
      cells.set(k, cell);
    }
    for (const [k, c] of cells) expect(c.many, k).toBeGreaterThanOrEqual(c.one);
    // Every path sweeps from Qi Condensation: a white tier 1 sweep on each ladder.
    for (const ladder of ['qi', 'body', 'soul'] as const)
      expect(
        TECHNIQUES.some(
          (t) =>
            t.tier === 1 && t.rarity === 'white' && t.ladder === ladder && (t.targets ?? 1) !== 1,
        ),
        ladder,
      ).toBe(true);
  });
});
