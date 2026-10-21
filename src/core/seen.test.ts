import { describe, expect, it } from 'vitest';
import { tree } from '../content/trees/index.ts';
import { gainManual, gainTechnique, checkScreens } from './life.ts';
import { loadSave, makeSave } from './save/format.ts';
import {
  gains,
  heldIds,
  isNew,
  newIds,
  openScreen,
  screenDot,
  see,
  seeAll,
  SEEN_KINDS,
  shownTrees,
  treeOpen,
  treeShown,
} from './seen.ts';
import { stats } from './stats.ts';
import { addItem, newLife, withPlayer, type GameState } from './state.ts';
import { treeTotals } from './trees.ts';

/** A fresh life on the garrison's method, with nothing new. */
const fresh = (techniques: string[] = []): GameState =>
  seeAll(newLife({ name: 'Han Li', seed: 'seen', techniques }));

const shown = (s: GameState) => shownTrees(s.player).map((t) => t.id);

describe('the seen record', () => {
  it('starts a created life with everything it holds seen', () => {
    const s = fresh(['rampart-palm']);
    for (const k of SEEN_KINDS) expect(newIds(s, k)).toEqual([]);
    for (const screen of s.unlocks) expect(screenDot(s, screen)).toBe(false);
  });

  it('makes a gift new until selected, its dot going when its screen opens', () => {
    let s = checkScreens(gainTechnique(fresh(), 'rampart-palm'));
    expect(newIds(s, 'technique')).toEqual(['rampart-palm']);
    expect(screenDot(s, 'techniques')).toBe(true);
    s = openScreen(s, 'techniques');
    expect(screenDot(s, 'techniques')).toBe(false);
    expect(isNew(s, 'technique', 'rampart-palm')).toBe(true);
    s = see(s, 'technique', ['rampart-palm']);
    expect(isNew(s, 'technique', 'rampart-palm')).toBe(false);
    // Seeing never steps back to noticed.
    expect(openScreen(s, 'techniques')).toBe(s);
  });

  it('dots a newly opened screen until it is opened, and sees a method when Routine opens', () => {
    let s = checkScreens(withPlayer(fresh(), addItem(fresh().player, 'spring-returning-pill', 1)));
    expect(s.unlocks).toContain('bag');
    expect(screenDot(s, 'bag')).toBe(true);
    s = openScreen(s, 'bag');
    expect(screenDot(s, 'bag')).toBe(false);
    expect(isNew(s, 'item', 'spring-returning-pill')).toBe(true);
    s = withPlayer(s, {
      ...s.player,
      methods: { ...s.player.methods, 'stone-bearing': { practice: 0, fedUntil: 0 } },
    });
    expect(screenDot(s, 'routine')).toBe(true);
    s = openScreen(s, 'routine');
    expect(isNew(s, 'method', 'stone-bearing')).toBe(false);
  });

  it('lists what a moment gained: new things once, and more of an item by its count', () => {
    const before = fresh();
    let after = gainTechnique(before, 'rampart-palm');
    after = checkScreens(withPlayer(after, addItem(after.player, 'spring-returning-pill', 3)));
    const got = gains(before, after).map((g) => `${g.kind}:${g.id}:${g.count}:${g.fresh}`);
    expect(got).toEqual(
      expect.arrayContaining([
        'technique:rampart-palm:1:true',
        'manual:art-rampart-palm:1:true',
        'item:spring-returning-pill:3:true',
        'tree:fist:1:true',
        'screen:techniques:1:true',
        'screen:bag:1:true',
      ]),
    );
    // Taking a sword off is not a gain, and more of a known pill is not fresh.
    const known = see(after, 'item', ['spring-returning-pill']);
    const more = withPlayer(known, addItem(known.player, 'spring-returning-pill', 2));
    expect(gains(known, more)).toEqual([
      { kind: 'item', id: 'spring-returning-pill', count: 2, fresh: false },
    ]);
    const worn = withPlayer(more, {
      ...more.player,
      gear: { ...more.player.gear, weapon: 'iron-sword' },
    });
    const off = withPlayer(
      worn,
      addItem({ ...worn.player, gear: more.player.gear }, 'iron-sword', 1),
    );
    expect(gains(worn, off)).toEqual([]);
  });

  it('migrates a v13 save: everything held is seen, so nothing lights up', () => {
    let s = checkScreens(
      gainManual(gainTechnique(fresh(), 'sinkhole-stone-fist'), 'stone-eyes-lamp'),
    );
    s = withPlayer(s, addItem(s.player, 'iron-sword', 1));
    const raw = JSON.parse(JSON.stringify(makeSave(s, 1))) as {
      version: number;
      state: Record<string, unknown>;
    };
    raw.version = 13;
    delete raw.state.seen;
    const loaded = loadSave(raw).state;
    for (const k of SEEN_KINDS) expect(newIds(loaded, k)).toEqual([]);
    for (const screen of loaded.unlocks) expect(screenDot(loaded, screen)).toBe(false);
    expect(heldIds(loaded, 'tree')).toEqual(['qi', 'soul', 'earth', 'sword', 'fist']);
  });
});

describe('which trees show', () => {
  it('shows a fresh life only Qi and the Daos its technique counts, never its root element', () => {
    expect(shown(fresh())).toEqual(['qi']);
    expect(shown(fresh(['rampart-palm']))).toEqual(['qi', 'fist']);
    // Earth by its damage and its tag, Fist by its tag.
    expect(shown(fresh(['sinkhole-stone-fist']))).toEqual(['qi', 'earth', 'fist']);
    const s = fresh();
    expect(s.player.rootElements.length).toBeGreaterThan(0);
    expect(shown(s).some((id) => tree(id).dao && s.player.rootElements.includes(id as never))).toBe(
      false,
    );
  });

  it('shows a Dao for a weapon carried or worn, and for a node owned', () => {
    const s = fresh();
    const carried = addItem(s.player, 'green-steel-saber', 1);
    expect(treeShown(carried, tree('saber'))).toBe(true);
    const worn = { ...s.player, gear: { ...s.player.gear, weapon: 'ash-wood-spear' } };
    expect(treeShown(worn, tree('spear'))).toBe(true);
    const node = tree('water').nodes[0]!.id;
    expect(treeShown({ ...s.player, nodes: [node] }, tree('water'))).toBe(true);
    expect(treeShown(s.player, tree('water'))).toBe(false);
  });

  it('opens the Soul tree for a Soul formula held before the soul ladder, its own nodes shut', () => {
    const s = gainManual(fresh(), 'stone-eyes-lamp');
    const soul = tree('soul');
    expect(treeShown(fresh().player, soul)).toBe(false);
    expect(treeShown(s.player, soul)).toBe(true);
    expect(treeOpen(s.player, soul)).toBe(false);
    expect(gains(fresh(), s).map((g) => `${g.kind}:${g.id}`)).toContain('tree:soul');
    // The ladder opening fills in its own nodes.
    const opened = { ...s.player, flags: [...s.player.flags, 'hours-soul'] };
    expect(treeOpen(opened, soul)).toBe(true);
  });
});

describe('treeTotals', () => {
  it('tots up what works, what is sealed and until when, and a line per graft', () => {
    let s = gainManual(fresh(), 'tide-counting');
    s = withPlayer(s, {
      ...s.player,
      nodes: ['qi-sensing-breath', 'qi-smooth-meridians', 'qi-liquid-qi', 'man-counting-tide'],
    });
    const t = treeTotals(s.player, tree('qi'));
    expect(t.working.find((e) => e.stat === 'qiGain')?.value).toBeCloseTo(0.04);
    expect(t.sealed).toEqual([{ tier: 2, effects: [{ stat: 'qiPool', value: 0.05 }] }]);
    const tide = t.grafts.find((g) => g.manual.id === 'tide-counting')!;
    expect(tide.learned).toBe(1);
    expect(tide.working).toEqual([{ stat: 'qiGain', value: 0.06 }]);
  });

  it('matches the stats its nodes add', () => {
    const base = fresh(['rampart-palm']);
    const s = withPlayer(base, {
      ...base.player,
      nodes: ['qi-sensing-breath', 'qi-smooth-meridians', 'qi-liquid-qi'],
    });
    const t = treeTotals(s.player, tree('qi'));
    for (const e of t.working) {
      expect(stats(s.player)[e.stat] - stats(base.player)[e.stat]).toBeCloseTo(e.value);
    }
    // A sealed node adds nothing yet.
    expect(stats(s.player).qiPool).toBe(stats(base.player).qiPool);
  });
});
