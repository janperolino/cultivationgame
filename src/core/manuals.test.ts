// P1.10: manuals, the nodes the world gives you. Content rules, holding and learning, sealing by
// realm or by a method's mastery, the formula cards, and the v10 save.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CARDS } from '../content/cards/index.ts';
import { MANUALS, manual } from '../content/manuals.ts';
import { hasMethod, method } from '../content/methods.ts';
import { anyNode } from '../content/nodes.ts';
import { ORIGINS } from '../content/origins.ts';
import { statInfo } from '../content/stats.ts';
import { TREES } from '../content/trees/index.ts';
import { eventText } from './chronicle.ts';
import { resolveCard } from './cards.ts';
import { gainManual } from './life.ts';
import { heldManuals, holdsManual } from './manuals.ts';
import { learnMethod, methodNeed } from './methods.ts';
import { loadSave } from './save/format.ts';
import { newLife, withPlayer, type Cultivator } from './state.ts';
import { stats } from './stats.ts';
import { activeNodes, canLearn, learnNode, nodeSealed } from './trees.ts';
import { CATALOG_MANUALS, CATALOG_TECHNIQUES } from '../content/catalogs/index.ts';

const base = newLife({ name: 'Han Li', seed: 'manuals' });
const rich = (c: Cultivator): Cultivator => ({ ...c, insight: { current: 1e5, earned: 1e5 } });

describe('manual content', () => {
  const treeIds = new Set(TREES.flatMap((t) => t.nodes.map((n) => n.id)));

  it('gives every node a home and an id no tree or other manual uses', () => {
    const ids = MANUALS.flatMap((m) => m.nodes.map((n) => n.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(treeIds.has(id), id).toBe(false);
    for (const m of MANUALS) for (const n of m.nodes) expect(anyNode(n.id)).toBe(n);
    for (const t of TREES) for (const n of t.nodes) expect(anyNode(n.id).home).toBe('tree');
  });

  it('never lets manuals and trees unlock each other', () => {
    for (const m of MANUALS) {
      const own = new Set(m.nodes.map((n) => n.id));
      for (const n of m.nodes) {
        expect(n.home).toBe('manual');
        expect(n.manual).toBe(m.id);
        for (const r of n.requires) expect(own.has(r), `${n.id} needs ${r}`).toBe(true);
      }
    }
    const manualIds = new Set(MANUALS.flatMap((m) => m.nodes.map((n) => n.id)));
    for (const t of TREES) {
      for (const n of t.nodes) {
        for (const r of n.requires) expect(manualIds.has(r), `${n.id} needs ${r}`).toBe(false);
      }
    }
  });

  it('keeps multipliers to purple and up, so small manuals only add', () => {
    for (const m of MANUALS) {
      if (['purple', 'gold', 'red', 'pristine'].includes(m.rarity)) continue;
      for (const n of m.nodes) {
        for (const e of n.effects) expect(statInfo(e.stat).unit, n.id).not.toBe('times');
      }
    }
  });

  it('ships three or four white formulas and a blue one, and nodes on every starting method', () => {
    // The written list's own (P1.10); the catalogs' formulas and Arts are P3.5's.
    const catalog = new Set([
      ...CATALOG_MANUALS.map((m) => m.id),
      ...CATALOG_TECHNIQUES.map((t) => `art-${t.id}`),
    ]);
    const loose = MANUALS.filter((m) => !m.method && m.kind !== 'recipe' && !catalog.has(m.id));
    const white = loose.filter((m) => m.kind === 'formula' && m.rarity === 'white');
    expect(white.length).toBeGreaterThanOrEqual(3);
    expect(white.length).toBeLessThanOrEqual(4);
    expect(loose.filter((m) => m.rarity === 'blue')).toHaveLength(1);
    const starting = new Set(
      ORIGINS.flatMap((o) => [o.along.method, o.refuse.method]).filter(
        (id): id is string => !!id && hasMethod(id),
      ),
    );
    for (const id of starting) {
      const m = MANUALS.find((x) => x.method === id);
      expect(m, id).toBeDefined();
      expect(m!.nodes.length).toBeGreaterThanOrEqual(1);
      expect(m!.nodes.length).toBeLessThanOrEqual(2);
      expect(m!.name).toBe(method(id).name);
      for (const n of m!.nodes) expect(n.mastery, n.id).toBeGreaterThan(0);
    }
  });
});

describe('holding and learning', () => {
  it('holds a loose manual once given, and a method’s own with the method', () => {
    const c = base.player;
    expect(holdsManual(c, 'garrison-standard')).toBe(true);
    expect(holdsManual(c, 'crude-cave')).toBe(false);
    expect(holdsManual(learnMethod(c, 'crude-cave'), 'crude-cave')).toBe(true);
    expect(holdsManual(c, 'garrison-breath-count')).toBe(false);
    const s = gainManual(base, 'garrison-breath-count', 'is handed');
    expect(s.player.manuals).toEqual(['garrison-breath-count']);
    expect(heldManuals(s.player).map((m) => m.id)).toEqual([
      'garrison-breath-count',
      'garrison-standard',
    ]);
    expect(eventText(s, s.chronicle.at(-1)!)).toBe('Han Li is handed the Garrison Breath-Count.');
    // Gaining it twice changes nothing.
    expect(gainManual(s, 'garrison-breath-count')).toBe(s);
  });

  it('learns a manual’s nodes only while holding it, in its own order, for insight', () => {
    const c = rich(base.player);
    expect(canLearn(c, 'man-count-of-nine')).toMatchObject({ ok: false });
    const held = rich(gainManual(base, 'bone-wall-watch').player);
    expect(canLearn(held, 'man-cold-dawn')).toEqual({
      ok: false,
      reason: 'Learn Sitting the Night Watch first.',
    });
    const r = learnNode(held, 'man-night-watch');
    expect(r.check).toEqual({ ok: true });
    expect(r.cultivator.insight.current).toBe(1e5 - manual('bone-wall-watch').nodes[0]!.cost);
    expect(stats(r.cultivator).minorOdds).toBeCloseTo(stats(held).minorOdds + 0.01);
  });

  it('stacks with the trees: a formula adds to a tree node on the same stat', () => {
    let c = rich(gainManual(base, 'garrison-breath-count').player);
    c = learnNode(c, 'qi-sensing-breath').cultivator;
    c = learnNode(c, 'man-count-of-nine').cultivator;
    expect(stats(c).qiGain).toBeCloseTo(0.02 + 0.05);
  });

  it('seals a method’s nodes until the method’s mastery reaches them', () => {
    const c = rich(base.player);
    const n = anyNode('man-garrison-cadence');
    const learned = learnNode(c, n.id).cultivator;
    expect(nodeSealed(learned, n)).toBe(true);
    expect(activeNodes(learned).map((x) => x.id)).not.toContain(n.id);
    expect(stats(learned).qiGain).toBe(stats(c).qiGain);
    const practiced: Cultivator = {
      ...learned,
      methods: {
        ...learned.methods,
        'garrison-standard': {
          practice: methodNeed(method('garrison-standard'), 1),
          fedUntil: 0,
        },
      },
    };
    expect(nodeSealed(practiced, n)).toBe(false);
    expect(stats(practiced).qiGain).toBeCloseTo(stats(c).qiGain + 0.03);
  });

  it('seals a loose manual’s node above the realm, as the trees do', () => {
    // Every M1 manual is tier 1, so a made-up tier 2 node stands in for a later chapter.
    const c = rich(gainManual(base, 'tide-counting').player);
    const n = { ...anyNode('man-counting-tide'), tier: 2 };
    expect(nodeSealed(c, n)).toBe(true);
    const foundation = { ...c, qi: { ...c.qi, realm: 'foundation-establishment' as const } };
    expect(nodeSealed(foundation, n)).toBe(false);
  });
});

describe('the formula cards', () => {
  it('hand a copy of a formula over for its price, and default to keeping the stones', () => {
    const k = CARDS.find((x) => x.id === 'breath-count-for-sale')!;
    expect(k.defaultChoice ?? 0).toBe(0);
    let s = withPlayer(base, { ...base.player, stones: 20 });
    s = {
      ...s,
      cards: { ...s.cards, pending: [{ uid: 1, card: k.id, day: s.calendar.day }], nextUid: 2 },
    };
    const r = resolveCard(s, 1, 1);
    expect(r.ok).toBe(true);
    // A bought formula is a copy to read, not a manual held (design § Reading).
    expect(r.state.player.manuals).not.toContain('garrison-breath-count');
    expect(r.state.player.copies['manual:garrison-breath-count']).toBe(1);
    expect(r.state.player.stones).toBe(8);
  });
});

describe('save v10', () => {
  it('migrates a v9 save: an old life holds no loose manuals', () => {
    const raw = JSON.parse(
      readFileSync(new URL('./save/fixtures/v9.json', import.meta.url), 'utf8'),
    );
    expect(raw.version).toBe(9);
    const s = loadSave(raw).state;
    expect(s.player.manuals).toEqual([]);
    expect(heldManuals(s.player).every((m) => m.method || m.technique)).toBe(true);
  });
});
