import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CARDS } from '../content/cards/index.ts';
import { EVENT_TEMPLATES, fillSlots, pronounWords } from '../content/chronicle.ts';
import { hasContemplationSource } from '../content/contemplation.ts';
import { hasMethod, method } from '../content/methods.ts';
import { ORIGIN_CHOICES, ORIGINS, PLACE_NAMES, pathKey } from '../content/origins.ts';
import { RARITY_IDS } from '../content/rarity.ts';
import { hasRoutine } from '../content/routines.ts';
import { root, ROOTS, rollElements, rollRoot } from '../content/roots.ts';
import { STATS } from '../content/stats.ts';
import { TALENT_KINDS, TALENTS, talentsOf } from '../content/talents.ts';
import { firstTechnique, hasTechnique } from '../content/techniques.ts';
import { lifeWhen, ordinal, whoFor } from './chronicle.ts';
import { createLife, FREE_REROLLS, rollFor, type Creation } from './creation.ts';
import { breakThrough, wakeTalents } from './life.ts';
import { Rng } from './rng.ts';
import { addItem, withPlayer } from './state.ts';
import { aptitude, fortune, stats } from './stats.ts';
import { majorCheck } from './cultivation.ts';

const creation = (over: Partial<Creation> = {}): Creation => ({
  name: 'Han Li',
  pronouns: 'she/her',
  look: 'a scar through one eyebrow',
  mode: 'gentle',
  seed: 'creation-test',
  choice: 'along',
  roll: {
    root: 'true',
    elements: ['wood', 'fire'],
    body: 'farmhands-frame',
    soul: 'plain-mind',
    fate: 'ordinary-fate',
    origin: 'cave-orphan',
  },
  ...over,
});

describe('talents', () => {
  it('cover every rarity in every kind, about a dozen each, with known stats', () => {
    for (const kind of TALENT_KINDS) {
      const all = TALENTS.filter((t) => t.kind === kind);
      expect(all.length, kind).toBeGreaterThanOrEqual(10);
      for (const r of RARITY_IDS)
        expect(talentsOf(kind, r).length, `${kind} ${r}`).toBeGreaterThan(0);
    }
    expect(new Set(TALENTS.map((t) => t.id)).size).toBe(TALENTS.length);
    for (const t of TALENTS) for (const e of t.effects) expect(STATS).toHaveProperty(e.stat);
    for (const r of ROOTS)
      for (const e of root(r.id).effects ?? []) expect(STATS).toHaveProperty(e.stat);
  });

  it('include the design’s named talents', () => {
    const names = [...TALENTS.map((t) => t.name), ...ROOTS.map((r) => r.name)];
    for (const n of [
      'Innate Sword Root',
      'Yin-Yang Twin Root',
      'Pure Yang Body',
      'Nine Yin Body',
      'Innate Dao Body',
      'Formation Eyes',
      'Sword Heart',
      'Unbreakable Dao Heart',
      'Child of Fortune',
      "Heaven's Jealousy",
      'Old Soul',
      'Chaos root',
    ]) {
      expect(names).toContain(n);
    }
  });

  it('roll roots on the root table and their elements from their kind', () => {
    expect(ROOTS.reduce((sum, r) => sum + r.odds, 0)).toBeCloseTo(1);
    const rng = new Rng(7);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 20000; i++) {
      const id = rollRoot(rng.next());
      counts[id] = (counts[id] ?? 0) + 1;
      const els = rollElements(id, rng);
      const r = ROOTS.find((x) => x.id === id)!;
      expect(els.length).toBeGreaterThanOrEqual(r.elements.count[0]);
      expect(els.length).toBeLessThanOrEqual(r.elements.count[1]);
      expect(new Set(els).size).toBe(els.length);
      if (id === 'mutated') expect(['lightning', 'ice', 'wind']).toContain(els[0]);
    }
    expect(counts.mixed! / 20000).toBeCloseTo(0.499, 1);
    expect(counts.true! / 20000).toBeCloseTo(0.35, 1);
    expect(rollElements('sword', rng)).toEqual(['metal']);
    expect(rollElements('chaos', rng)).toEqual(['wood', 'fire', 'earth', 'metal', 'water']);
  });

  it('roll all five, seeded, with origins a third each', () => {
    expect(rollFor('a', 0)).toEqual(rollFor('a', 0));
    expect(rollFor('a', 0)).not.toEqual(rollFor('a', 1));
    const origins: Record<string, number> = {};
    const rarities: Record<string, number> = {};
    for (let i = 0; i < 3000; i++) {
      const r = rollFor(`seed-${i}`, 0);
      origins[r.origin] = (origins[r.origin] ?? 0) + 1;
      const body = TALENTS.find((t) => t.id === r.body)!;
      rarities[body.rarity] = (rarities[body.rarity] ?? 0) + 1;
    }
    for (const o of ORIGINS) expect(origins[o.id]! / 3000).toBeCloseTo(1 / 3, 1);
    expect(rarities.white! / 3000).toBeCloseTo(0.4, 1);
    expect(rarities.gray! / 3000).toBeCloseTo(0.1, 1);
    expect(FREE_REROLLS).toBe(3);
  });

  it('move their kind’s attribute by rarity, and their stats', () => {
    const plain = createLife(creation()).player;
    expect([aptitude(plain), fortune(plain)]).toEqual([10, 10]);
    const gifted = createLife(
      creation({
        roll: { ...creation().roll, soul: 'unbreakable-dao-heart', fate: 'child-of-fortune' },
      }),
    ).player;
    expect(aptitude(gifted)).toBe(13);
    expect(fortune(gifted)).toBe(16);
    expect(stats(gifted).gradeMargin).toBeCloseTo(0.25);
    const flawed = createLife(creation({ roll: { ...creation().roll, soul: 'clouded-mind' } }));
    expect(aptitude(flawed.player)).toBe(8);
    expect(stats(flawed.player).insightGain).toBeCloseTo(-0.1);
  });

  it('raise a major breakthrough’s grade with the grade margin, not its odds', () => {
    const at9 = (soul: string) => {
      const s = createLife(creation({ roll: { ...creation().roll, soul } }));
      const p = addItem(
        {
          ...s.player,
          qi: { ...s.player.qi, stage: 9, bar: 1e9 },
          insight: { current: 0, earned: 5000 },
        },
        'foundation-pill',
        1,
      );
      return majorCheck(p, 'qi')!;
    };
    const plain = at9('plain-mind');
    const heart = at9('unbreakable-dao-heart');
    expect(heart.score - plain.score).toBeCloseTo(0.25);
    expect(heart.odds).toBe(plain.odds);
  });

  it('a sleeping talent wakes at Foundation with its insight', () => {
    let s = createLife(creation({ roll: { ...creation().roll, fate: 'old-soul' } }));
    expect(stats(s.player).insightGain).toBe(0);
    expect(wakeTalents(s)).toBe(s);
    s = withPlayer(
      s,
      addItem(
        {
          ...s.player,
          qi: { ...s.player.qi, stage: 9, bar: 1e9 },
          insight: { current: 0, earned: 600 },
        },
        'foundation-pill',
        5,
      ),
    );
    for (let i = 0; i < 20 && s.player.qi.realm === 'qi-condensation'; i++) {
      s = breakThrough(s, 'qi').state;
      s = withPlayer(s, {
        ...s.player,
        qi: { ...s.player.qi, bar: Math.max(s.player.qi.bar, 1e9) },
      });
    }
    expect(s.player.qi.realm).toBe('foundation-establishment');
    expect(s.player.insight.earned).toBeGreaterThanOrEqual(1100);
    expect(stats(s.player).insightGain).toBeCloseTo(0.2);
    expect(s.chronicle.some((e) => e.type === 'talent-wakes')).toBe(true);
  });
});

describe('origins', () => {
  it('give every path a real method or none, routines, a first technique and a place', () => {
    for (const o of ORIGINS) {
      for (const choice of ORIGIN_CHOICES) {
        const p = o[choice];
        if (p.method) expect(hasMethod(p.method)).toBe(true);
        for (const r of p.routines) expect(hasRoutine(r)).toBe(true);
        expect(firstTechnique(pathKey(o.id, choice))).toBeDefined();
        expect(PLACE_NAMES[p.place]).toBeDefined();
      }
    }
    // Going along gives a method; the two refusals that start without one are the deserter and
    // the street cultivator.
    const without = ORIGINS.flatMap((o) =>
      ORIGIN_CHOICES.filter((c) => !o[c].method).map((c) => pathKey(o.id, c)),
    );
    expect(without).toEqual(['conscript/refuse', 'frontier-orphan/refuse']);
  });

  it('name places as the atlas does', () => {
    const atlas = JSON.parse(
      readFileSync(new URL('../../content/atlas/entries.json', import.meta.url), 'utf8'),
    ) as { id: string; name: string }[] | { entries: { id: string; name: string }[] };
    const entries = Array.isArray(atlas) ? atlas : atlas.entries;
    for (const [id, name] of Object.entries(PLACE_NAMES)) {
      const e = entries.find((x) => x.id === id);
      expect(e, id).toBeDefined();
      expect(name.replace(/^the /, '').toLowerCase()).toBe(
        e!.name.replace(/^The /, '').toLowerCase(),
      );
    }
  });

  it('start a life with the path’s method, routines, stones, flags and place', () => {
    for (const o of ORIGINS) {
      for (const choice of ORIGIN_CHOICES) {
        const s = createLife(creation({ choice, roll: { ...creation().roll, origin: o.id } }));
        const p = s.player;
        const path = o[choice];
        expect(p.activeMethods.qi).toBe(path.method);
        expect(p.routines).toEqual(path.routines);
        expect(p.stones).toBe(path.stones);
        expect(p.flags).toEqual(path.flags);
        expect(p.place).toBe(path.place);
        expect(p.origin).toEqual({ id: o.id, choice });
        // The first technique comes as a card, not at creation.
        expect(p.techniques).toEqual({});
        expect(s.chronicle.map((e) => e.type)).toEqual(['birth', 'testing']);
      }
    }
  });
});

describe('the first hour’s cards as data', () => {
  it('point only at things that exist, and their default can always be taken', () => {
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(CARDS.length);
    for (const k of CARDS) {
      expect(k.choices.length).toBeGreaterThanOrEqual(1);
      expect(k.choices.length).toBeLessThanOrEqual(3);
      const d = k.choices[k.defaultChoice ?? 0]!;
      expect(d.cost, `${k.id} default is free`).toBeUndefined();
      for (const ch of k.choices) {
        for (const o of [ch.pass, ...(ch.fail ? [ch.fail] : [])]) {
          for (const e of o.effects) {
            if (e.do === 'method') expect(hasMethod(e.id), e.id).toBe(true);
            if (e.do === 'technique') expect(hasTechnique(e.id), e.id).toBe(true);
            if (e.do === 'routine') expect(hasRoutine(e.id), e.id).toBe(true);
            if (e.do === 'contemplate')
              expect(hasContemplationSource(e.source), e.source).toBe(true);
          }
        }
      }
    }
  });

  it('fill every slot for the origins they come to', () => {
    for (const k of CARDS.filter((c) => c.deck === 'first-hour')) {
      const origins = k.trigger.origin ?? ORIGINS.map((o) => o.id);
      for (const id of origins) {
        const s = createLife(creation({ roll: { ...creation().roll, origin: id } }));
        const who = whoFor(s.player);
        const texts = [
          k.title,
          k.text,
          ...k.choices.flatMap((c) => [
            c.label,
            c.pass.text,
            c.pass.chronicle ?? '',
            c.fail?.text ?? '',
            c.fail?.chronicle ?? '',
          ]),
        ];
        for (const t of texts)
          expect(fillSlots(t, who), `${k.id} for ${id}`).not.toMatch(/\{\w+\}/);
      }
    }
  });

  it('hand each origin path its Foundation chapter at layer 9', () => {
    for (const o of ORIGINS) {
      for (const choice of ORIGIN_CHOICES) {
        const k = CARDS.find(
          (c) =>
            c.trigger.origin?.includes(o.id) &&
            c.trigger.choice === choice &&
            c.trigger.qi?.minStage === 9,
        );
        expect(k, pathKey(o.id, choice)).toBeDefined();
        const effects = k!.choices[0]!.pass.effects;
        expect(effects).toContainEqual({ do: 'item', id: 'foundation-pill', n: 1 });
        const m = effects.find((e) => e.do === 'method');
        expect(m && m.do === 'method' && method(m.id).chapter).toBe(2);
      }
    }
  });
});

describe('the typed chronicle', () => {
  it('writes a biography: ordinals, seasons, pronouns', () => {
    expect([1, 12, 14, 21, 40, 99].map(ordinal)).toEqual([
      'first',
      'twelfth',
      'fourteenth',
      'twenty-first',
      'fortieth',
      'ninety-ninth',
    ]);
    expect(ordinal(112)).toBe('112th');
    const s = createLife(creation());
    expect(lifeWhen(s.player, s.calendar.day)).toBe('the spring of the thirteenth year');
    expect(lifeWhen(s.player, s.calendar.day + 400)).toBe('the spring of the fourteenth year');
    expect(lifeWhen(s.player, s.calendar.day + 100)).toBe('the summer of the thirteenth year');
    expect(pronounWords('she/her')).toEqual({ they: 'she', them: 'her', their: 'her' });
    expect(pronounWords('xe/xem')).toEqual({ they: 'xe', them: 'xem', their: 'their' });
    expect(Object.keys(EVENT_TEMPLATES)).toContain('card');
  });
});
