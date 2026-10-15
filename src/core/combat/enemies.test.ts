import { describe, expect, it } from 'vitest';
import { AURA_POWER, BEAST_DEFENSE, BEAST_HP, species } from '../../content/beasts.ts';
import { HP_PER_SIZE } from '../../content/combat.ts';
import { KITS, PEDIGREES } from '../../content/enemies.ts';
import { NPC_PACE, PACE_AGES } from '../../content/pace.ts';
import { RARITIES, rarityRank } from '../../content/rarity.ts';
import {
  BORDER_WILDS,
  template,
  type BeastTemplate,
  type CultivatorTemplate,
} from '../../content/roster.ts';
import type { Technique } from '../../content/techniques.ts';
import { Rng } from '../rng.ts';
import { combatant } from './combatant.ts';
import { combatantIn, preview, resolveTurn, startFight } from './fight.ts';
import {
  biasedTable,
  bloodlineAbilities,
  generateBeast,
  generateCultivator,
  generatePack,
  kitFighter,
  methodGrowth,
  pedigreeBias,
  rungAhead,
} from './generate.ts';
import { chooseAction, profile, runFight } from './profile.ts';
import { rungSize, stageSize } from './sheet.ts';

const kit = (id: string) => KITS.find((k) => k.id === id)!;
const cultivator = (id: string) => template(id) as CultivatorTemplate;
const beast = (id: string) => template(id) as BeastTemplate;

describe('pedigree is a bias on the shared roll', () => {
  it('leaves the table as it is at a bias of 1 and shifts it up above', () => {
    const plain = biasedTable(1);
    RARITIES.forEach((r, i) => expect(plain[i]!.p).toBeCloseTo(r.roll, 10));
    for (const b of [0.5, 1.6, 4]) {
      expect(biasedTable(b).reduce((s, x) => s + x.p, 0)).toBeCloseTo(1, 10);
    }
    const gold = (b: number) => biasedTable(b).find((x) => x.id === 'gold')!.p;
    expect(gold(0.5)).toBeLessThan(gold(1));
    expect(gold(4)).toBeGreaterThan(0.1);
  });

  it('rises with the realm baseline from Core Formation', () => {
    expect(pedigreeBias('great-sect', 'foundation-establishment')).toBe(1.6);
    expect(pedigreeBias('great-sect', 'core-formation')).toBeCloseTo(1.6 * 1.3, 10);
    expect(pedigreeBias('rogue', 'nascent-soul')).toBeCloseTo(0.5 * 1.6, 10);
  });
});

describe('growth', () => {
  it('leaves nothing at white and the band less one over a full realm', () => {
    expect(methodGrowth('white', 'qi-condensation', 9)).toBe(0);
    expect(methodGrowth('purple', 'qi-condensation', 1)).toBe(0);
    expect(methodGrowth('purple', 'qi-condensation', 9)).toBeCloseTo(3.1 ** 0.8 - 1, 10);
  });

  it('weights the realms by the realm curve, so a fresh Foundation stage dominates', () => {
    // Qi Condensation's full 1.47 at weight 1, Foundation's first quarter of 2.39 at weight 9.
    const qc = 3.1 ** 0.8 - 1;
    const fe = (4.6 ** 0.8 - 1) / 4;
    expect(methodGrowth('purple', 'foundation-establishment', 1)).toBeCloseTo(
      (qc + 9 * fe) / 10,
      10,
    );
  });
});

describe('generated cultivators', () => {
  it('replays the same person from the same seed', () => {
    const a = generateCultivator(
      cultivator('raider-isles-pirate'),
      'qi-condensation',
      5,
      new Rng(7),
    );
    const b = generateCultivator(
      cultivator('raider-isles-pirate'),
      'qi-condensation',
      5,
      new Rng(7),
    );
    expect(a).toEqual(b);
    expect(a.name).toMatch(/^\w+ \w+$/);
    expect(a.carries).toContain("White Fang Stockade's token");
  });

  it('rolls access, never rules: one art for a rogue, two for a sect, mastery a level a realm', () => {
    const rogue = generateCultivator(
      cultivator('march-conscript'),
      'qi-condensation',
      3,
      new Rng(1),
    );
    expect(Object.keys(rogue.combatant.techniques)).toHaveLength(1);
    expect(rogue.rolls.mastery).toBe(1);
    const sect = generateCultivator(
      cultivator('beast-butcher-disciple'),
      'foundation-establishment',
      2,
      new Rng(1),
    );
    expect(Object.keys(sect.combatant.techniques)).toHaveLength(2);
    expect(sect.rolls.mastery).toBe(3);
    expect(sect.storage).toBe('storage ring');
    const t = Object.values(sect.combatant.techniques)[0]!.technique;
    expect(t.tier).toBe(2);
    expect(t.daos).toContain('saber');
  });

  it('gives a chosen one a slot at gold or better, every time', () => {
    const t: CultivatorTemplate = { ...cultivator('beast-butcher-disciple'), pedigree: 'chosen' };
    for (let seed = 0; seed < 50; seed++) {
      const n = generateCultivator(t, 'foundation-establishment', 1, new Rng(seed));
      const slots = [n.rolls.method.qi, n.rolls.technique, n.rolls.weapon, n.rolls.armor];
      expect(slots.some((r) => rarityRank(r) >= rarityRank('gold'))).toBe(true);
    }
  });

  it('carries no grade at Qi Condensation, and a heavenly one only on a gold or red method', () => {
    for (let seed = 0; seed < 50; seed++) {
      const qc = generateCultivator(
        cultivator('march-conscript'),
        'qi-condensation',
        4,
        new Rng(seed),
      );
      expect(qc.combatant.rungs.qi.grade).toBe(0);
      const fe = generateCultivator(
        { ...cultivator('march-conscript'), pedigree: 'sacred-land' },
        'foundation-establishment',
        1,
        new Rng(seed),
      );
      if (fe.rolls.grade === 'heavenly') {
        expect(rarityRank(fe.rolls.method.qi)).toBeGreaterThanOrEqual(rarityRank('gold'));
      }
    }
  });

  it('turns a half-blood’s bloodline into body techniques', () => {
    let found = false;
    for (let seed = 0; seed < 40 && !found; seed++) {
      const n = generateCultivator(
        cultivator('half-blood-raider'),
        'qi-condensation',
        3,
        new Rng(seed),
      );
      const known = Object.values(n.combatant.techniques).map((k) => k.technique);
      const body = known.filter((t) => n.abilities.includes(t.id) && t.ladder !== 'qi');
      if (n.abilities.length && body.length) {
        found = true;
        expect(body[0]!.qiCost).toBeGreaterThan(0);
        // A half-blood walks the body's path (P3.2): their path art is a body art, free of qi.
        const path = known.find((t) => t.id === 'half-blood-raider-path')!;
        expect(path).toMatchObject({ ladder: 'body', qiCost: 0 });
      }
    }
    expect(found).toBe(true);
  });

  it('can skip consumables, as the ledger measures', () => {
    for (let seed = 0; seed < 20; seed++) {
      const n = generateCultivator(
        cultivator('night-bridge-smuggler'),
        'qi-condensation',
        2,
        new Rng(seed),
        {
          noConsumables: true,
        },
      );
      expect(n.consumables).toEqual([]);
    }
  });
});

describe('beasts', () => {
  it('roll abilities by bloodline, the species’ own first', () => {
    expect(bloodlineAbilities('earth', 'white', species('stone-skin-boar').first)).toEqual([]);
    expect(bloodlineAbilities('earth', 'green', ['stone-skin']).map((a) => a.id)).toEqual([
      'stone-skin',
    ]);
    expect(
      bloodlineAbilities('metal', 'blue', ['iron-scales', 'blade-feathers']).map((a) => a.id),
    ).toEqual(['iron-scales', 'blade-feathers']);
    expect(bloodlineAbilities('fire', 'purple')).toHaveLength(3);
  });

  it('are body-first: half again the HP, a hide for Defense, no armor and no qi shield', () => {
    const shark = generateBeast(beast('strait-shark'), 'foundation-establishment', 1, new Rng(3));
    const c = shark.combatant;
    const aura = rarityRank(shark.rolls.bloodline!) >= rarityRank('purple');
    expect(c).toMatchObject({ hide: BEAST_DEFENSE, armor: null, maxShield: 0, shield: 0 });
    expect(c.maxHp).toBeGreaterThanOrEqual(
      Math.round(HP_PER_SIZE * stageSize('foundation-establishment', 1) * BEAST_HP) - 1,
    );
    expect(c.techniques['strait-shark-natural-0']!.technique.qiCost).toBe(0);
    expect(c.techniquePower >= (aura ? AURA_POWER : 1)).toBe(true);
    expect(shark.carries).toContain('beast core');
  });

  it('come in packs of their range, on one side', () => {
    for (let seed = 0; seed < 20; seed++) {
      const pack = generatePack(beast('tide-crab'), 'qi-condensation', 2, new Rng(seed), 'crabs');
      expect(pack.length).toBeGreaterThanOrEqual(3);
      expect(pack.length).toBeLessThanOrEqual(5);
      expect(new Set(pack.map((n) => n.combatant.id)).size).toBe(pack.length);
      expect(pack.every((n) => n.combatant.side === 'crabs')).toBe(true);
    }
  });

  it('roll a species and an element for a raider', () => {
    const n = generateBeast(
      beast('vast-wilds-raider-beast'),
      'foundation-establishment',
      1,
      new Rng(11),
    );
    expect(n.kind).toBe('beast');
    expect(n.combatant.element).not.toBeUndefined();
  });

  it('every roster template generates at every realm of its band', () => {
    for (const t of BORDER_WILDS) {
      for (const r of t.band) {
        const n =
          t.kind === 'beast'
            ? generateBeast(t, r, 1, new Rng(1))
            : generateCultivator(t, r, 1, new Rng(1));
        expect(n.combatant.maxHp).toBeGreaterThan(0);
        expect(Object.keys(n.combatant.techniques).length).toBeGreaterThan(0);
      }
    }
  });
});

describe('the ledger kits', () => {
  it('stand a chosen one’s body a realm ahead at the same climb', () => {
    expect(rungAhead('qi-condensation', 1)).toEqual({
      realm: 'foundation-establishment',
      stage: 1,
      grade: 0,
    });
    expect(rungAhead('qi-condensation', 9)).toEqual({
      realm: 'foundation-establishment',
      stage: 4,
      grade: 0,
    });
    const c = kitFighter(kit('chosen'), 'foundation-establishment', 1, { id: 'c', side: 'c' });
    expect(c.rungs.body.realm).toBe('core-formation');
    expect(c.rungs.qi.grade).toBe(3);
    const o = kitFighter(kit('ordinary'), 'foundation-establishment', 1, { id: 'o', side: 'o' });
    expect(o.maxHp).toBe(Math.round(HP_PER_SIZE * stageSize('foundation-establishment', 1)));
  });
});

const PALM: Technique = {
  id: 'palm',
  name: 'Palm',
  pinyin: '',
  hanzi: '',
  ladder: 'qi',
  tier: 1,
  rarity: 'white',
  line: 'palm',
  chapter: 1,
  daos: [],
  form: 'palm',
  damage: 'physical',
  power: 40,
  qiCost: 10,
  source: 'test',
  text: '',
};
const fighter = (id: string, side: string, extra = {}) =>
  combatant({
    id,
    name: id,
    side,
    techniques: { palm: { technique: PALM, accuracy: 1 } },
    ...extra,
  });

describe('the preview', () => {
  it('prices a technique as the turn resolves it, before the spread', () => {
    const f = startFight([fighter('a', 'a'), fighter('b', 'b')]);
    const p = preview(f, 'a', { type: 'technique', id: 'palm', target: 'b' })!;
    expect(p).toEqual({ chance: 0.5, damage: 40, qi: 10 });
    expect(preview(f, 'a', { type: 'defend' })).toBeNull();
    const broke = startFight([fighter('a', 'a', { qi: 5 }), fighter('b', 'b')]);
    expect(preview(broke, 'a', { type: 'technique', id: 'palm', target: 'b' })).toBeNull();
  });

  it('reads the qi shield off the qi ladder and Defense off the body, whatever the attack climbs', () => {
    const high = { realm: 'foundation-establishment' as const, stage: 1, grade: 0 };
    const low = { realm: 'qi-condensation' as const, stage: 1, grade: 0 };
    const rungs = { qi: high, body: low, soul: low };
    const palm = { type: 'technique' as const, id: 'palm', target: 'b' };
    // The shield up: the palm meets Defense 31 from the qi ladder, 40 × 10 ÷ 31.
    const shielded = startFight([fighter('a', 'a'), fighter('b', 'b', { rungs })]);
    expect(preview(shielded, 'a', palm)!.damage).toBe(Math.round(400 / rungSize(high)));
    // The shield down: Defense 10 from the body, and the palm lands at full 40.
    const bare = startFight([fighter('a', 'a'), fighter('b', 'b', { rungs, maxShield: 0 })]);
    expect(preview(bare, 'a', palm)!.damage).toBe(40);
    expect(rungSize(high)).toBeCloseTo(31, 0);
  });
});

describe('profiles', () => {
  it('open as their table says and flee or guard at their HP shares', () => {
    const f = startFight([fighter('a', 'a'), fighter('b', 'b')]);
    expect(chooseAction(f, 'a', profile('cautious')).main).toEqual({ type: 'defend' });
    expect(chooseAction(f, 'a', profile('aggressive')).main).toMatchObject({
      type: 'technique',
      id: 'palm',
    });
    const hurt = startFight([fighter('a', 'a', { hp: 40 }), fighter('b', 'b')]);
    expect(chooseAction(hurt, 'a', profile('cowardly')).main).toEqual({ type: 'flee' });
    expect(chooseAction(hurt, 'a', profile('fanatical')).main).toMatchObject({ type: 'technique' });
    const pill = {
      id: 'mend',
      name: 'Mend',
      pinyin: '',
      hanzi: '',
      tier: 1,
      rarity: 'white' as const,
      uses: {
        consume: { effects: [{ effect: 'restore' as const, what: 'hp' as const, share: 0.3 }] },
      },
      source: '',
      text: '',
    };
    const held = startFight([
      fighter('a', 'a', { hp: 45, items: { mend: { item: pill, n: 1 } } }),
      fighter('b', 'b'),
    ]);
    expect(chooseAction(held, 'a', profile('cautious')).main).toEqual({ type: 'item', id: 'mend' });
  });

  it('strike when no art can be paid for', () => {
    const f = startFight([fighter('a', 'a', { qi: 0 }), fighter('b', 'b')]);
    expect(chooseAction(f, 'a', profile('aggressive')).main).toEqual({
      type: 'strike',
      target: 'b',
    });
  });

  it('play a fight out the same way from the same seed', () => {
    const start = () => startFight([fighter('a', 'a'), fighter('b', 'b', { profile: 'cautious' })]);
    const one = runFight(start(), new Rng(9));
    const two = runFight(start(), new Rng(9));
    expect(one.winner).not.toBeNull();
    expect(one).toEqual(two);
    const after = resolveTurn(
      start(),
      [chooseAction(start(), 'a', profile('fanatical'))],
      new Rng(1),
    );
    expect(combatantIn(after.fight, 'a')!.qi).toBe(50);
  });
});

describe('the NPC pace table', () => {
  it('has a stage for every age, never falling with age', () => {
    const order = (s: string) => (s[0] === 'q' ? 0 : 10) + Number(s.slice(1));
    for (const p of PEDIGREES) {
      const row = NPC_PACE[p.id];
      expect(row).toHaveLength(PACE_AGES.length);
      for (let i = 1; i < row.length; i++)
        expect(order(row[i]!)).toBeGreaterThanOrEqual(order(row[i - 1]!));
    }
    // The design's anchors: a rogue at sixty sits at Qi Condensation's peak; a great-sect
    // disciple reaches Foundation around thirty.
    expect(NPC_PACE.rogue[PACE_AGES.indexOf(60)]).toBe('q9');
    expect(NPC_PACE['great-sect'][PACE_AGES.indexOf(30)]![0]).toBe('f');
  });
});
