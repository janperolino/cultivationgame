// S1: the sound layer's reading of the game (the cue table, combat's layers, the soundscape, the
// moments a change plays). The engine itself is Web Audio and is checked in the browser.
import { describe, expect, it } from 'vitest';
import { ACTION_FORMS, BEAST_FORMS, DAMAGE_TYPES, TECHNIQUE_FORMS } from '../../content/combat.ts';
import { newLife, type GameState } from '../../core/state.ts';
import { shotLayers } from './combat.ts';
import { momentsOf } from './moments.ts';
import { breakMs, isNight, nextTrack, scapeOf, type Where } from './scape.ts';
import { CUES, cueInfo, ELEMENT_CUE, FORM_CUE, MUSIC_SETS } from './table.ts';

const where = (w: Partial<Where>): Where => ({
  screen: 'cultivate',
  place: null,
  night: false,
  storm: false,
  tense: false,
  ...w,
});

describe('the cue table', () => {
  it('names each cue once, and every one the code plays is in it', () => {
    const ids = CUES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    const played = [
      ...Object.values(FORM_CUE),
      ...Object.values(ELEMENT_CUE),
      ...Object.values(MUSIC_SETS).flat(),
    ].filter((x) => x !== null);
    for (const id of played) expect(cueInfo(id), id).toBeDefined();
  });

  it('gives every form and every element its sound but physical, which is the form alone', () => {
    for (const f of [...TECHNIQUE_FORMS, ...BEAST_FORMS, ...ACTION_FORMS])
      expect(FORM_CUE[f]).not.toBeNull();
    for (const t of DAMAGE_TYPES) expect(ELEMENT_CUE[t] === null).toBe(t === 'physical');
  });
});

describe("combat's layers", () => {
  it('lays an element over the form, a flourish over a critical and a fizzle on a miss', () => {
    const hit = shotLayers({
      form: 'slash',
      type: 'fire',
      realm: 'qi-condensation',
      result: 'hit',
    });
    expect(hit.map((l) => l.id)).toEqual(['hit-slash', 'el-fire']);
    const crit = shotLayers({
      form: 'palm',
      type: 'physical',
      realm: 'qi-condensation',
      result: 'critical',
    });
    expect(crit.map((l) => l.id)).toEqual(['hit-palm', 'res-critical']);
    const miss = shotLayers({
      form: 'thrust',
      type: 'ice',
      realm: 'qi-condensation',
      result: 'miss',
    });
    expect(miss.map((l) => l.id)).toEqual(['hit-thrust', 'res-miss']);
    const back = shotLayers({
      form: 'aura',
      type: 'soul',
      realm: 'qi-condensation',
      result: 'backfire',
    });
    expect(back.map((l) => l.id)).toEqual(['res-backfire', 'el-soul']);
  });

  it('plays a higher realm slower, deeper and louder, with a quake from Core Formation up', () => {
    const at = (
      realm: 'qi-condensation' | 'foundation-establishment' | 'core-formation' | 'nascent-soul',
    ) => shotLayers({ form: 'slash', type: 'metal', realm, result: 'hit' });
    const [qc, fd, cf, ns] = [
      at('qi-condensation'),
      at('foundation-establishment'),
      at('core-formation'),
      at('nascent-soul'),
    ];
    expect(qc[0]).toMatchObject({ rate: 1, low: 0, gain: 1 });
    expect(fd[0]!.rate).toBeLessThan(1);
    expect(cf[0]!.rate).toBeLessThan(fd[0]!.rate);
    expect(ns[0]!.gain).toBeGreaterThan(cf[0]!.gain);
    expect(fd.some((l) => l.id === 'res-quake')).toBe(false);
    expect(cf.some((l) => l.id === 'res-quake')).toBe(true);
  });
});

describe('the soundscape', () => {
  it('plays the cave on its screens, the road and the place on the Map, and keeps it elsewhere', () => {
    const cave = scapeOf(where({}), null);
    expect(cave).toMatchObject({ base: 'cave', music: 'cave', duck: 1 });
    expect(cave.ambience).toEqual([{ id: 'amb-cave', level: 1 }]);
    expect(scapeOf(where({ screen: 'map' }), 'cave').ambience[0]!.id).toBe('amb-wilds');
    expect(scapeOf(where({ screen: 'map', place: 'city' }), null).ambience[0]!.id).toBe(
      'amb-market',
    );
    expect(scapeOf(where({ screen: 'map', place: 'gate' }), null).ambience[0]!.id).toBe('amb-sect');
    const bag = scapeOf(where({ screen: 'bag' }), 'market');
    expect(bag).toMatchObject({ base: 'market', music: 'map' });
    expect(scapeOf(where({ screen: null }), 'cave')).toMatchObject({ music: null, ambience: [] });
  });

  it('lays insects under the night and rain over a storm', () => {
    const night = scapeOf(where({ screen: 'map', night: true }), null);
    expect(night.ambience.map((l) => l.id)).toEqual(['amb-wilds', 'amb-night']);
    const storm = scapeOf(where({ storm: true }), null);
    expect(storm.ambience.map((l) => l.id)).toEqual(['amb-cave', 'amb-storm']);
    expect(storm.ambience[0]!.level).toBeLessThan(1);
  });

  it('stands a drone in for the rest while an encounter waits, and a fight plays its own track', () => {
    const tense = scapeOf(where({ screen: 'map', tense: true }), null);
    expect(tense.ambience).toEqual([{ id: 'amb-tense', level: 1 }]);
    expect(tense.duck).toBeLessThan(1);
    expect(tense.music).toBe('map');
    expect(scapeOf(where({ screen: 'fight' }), 'cave').music).toBe('fight');
  });

  it('breaks one to three minutes between tracks and never plays one twice running', () => {
    expect(breakMs(0)).toBe(60_000);
    expect(breakMs(0.999)).toBeLessThan(180_000);
    for (const r of [0, 0.3, 0.6, 0.99]) expect(nextTrack(['a', 'b', 'c'], 'b', r)).not.toBe('b');
    expect(nextTrack(['a'], 'a', 0.5)).toBe('a');
    expect(nextTrack([], null, 0.5)).toBeNull();
  });

  it('counts night from 戌 to 寅', () => {
    expect([0, 1, 2, 10, 11].every(isNight)).toBe(true);
    expect([3, 6, 9].some(isNight)).toBe(false);
  });
});

describe('the moments a change plays', () => {
  const life = (): GameState => newLife({ name: 'Test', seed: 'sound' });

  it('plays a layer up, a great gate, a failure and a full bar', () => {
    const was = life();
    const up = { ...was, player: { ...was.player, qi: { ...was.player.qi, stage: 2 } } };
    expect(momentsOf(was, up)).toContain('feel-layer');
    const gate = {
      ...was,
      player: {
        ...was.player,
        qi: { ...was.player.qi, realm: 'foundation-establishment' as const },
      },
    };
    expect(momentsOf(was, gate)).toContain('feel-fanfare');
    const failed = {
      ...was,
      player: { ...was.player, qi: { ...was.player.qi, unsettledUntil: 9999 } },
    };
    expect(momentsOf(was, failed)).toEqual(['feel-fail']);
    expect(momentsOf(was, was)).toEqual([]);
  });

  it('plays a node bought and gear put on', () => {
    const was = life();
    const now = {
      ...was,
      player: {
        ...was.player,
        nodes: [...was.player.nodes, 'some-node'],
        gear: { ...was.player.gear, weapon: 'iron-sword' },
      },
    };
    expect(momentsOf(was, now)).toEqual(['tree-node', 'bag-equip']);
  });
});
