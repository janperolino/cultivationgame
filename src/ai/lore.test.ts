// The world book as GLM gets it (P3.9w): the spec's case, a mortal innkeeper and a Gate elder asked
// about Foundation Pills, answering from different entries; who-knows tags; the mechanics half
// read off the game's own numbers; and each person's regard for you by realm.
import { describe, expect, it } from 'vitest';
import { LORE_PER_PERSON, WRITTEN_LORE } from '../content/lore.ts';
import { item } from '../content/items.ts';
import { goInHour, goInPlace } from '../core/goinPlace.ts';
import { ticksUntil, waitUntilTurn } from '../core/goin.ts';
import type { DoorRef } from '../core/frames.ts';
import { knowerOf, loreFor, meetsTag, stonePrice, topicsAt, worldBook } from '../core/lore.ts';
import { enterAt } from '../core/map/gate.ts';
import { placeById } from '../core/map/region.ts';
import { ensureMap, mapOf } from '../core/map/travel.ts';
import { priceOf } from '../core/prices.ts';
import { plainActor, type Actor } from '../core/resolver/actor.ts';
import { newLife, type GameState } from '../core/state.ts';
import { atlasOf, buildView } from './context.ts';

const FORT = 'pacified-fort';
const GATE = 'qm-tushou-men';
const DOORS: DoorRef[] = [{ id: 'inn', name: 'the Lantern Inn', art: 'inn', group: 'hear' }];

function atInn(seed: string): GameState {
  const s = ensureMap(
    newLife({ name: 'Han Li', seed, origin: { id: 'conscript', choice: 'along' } }),
  );
  const p = placeById(mapOf(s)!, FORT)!;
  const at: GameState = {
    ...s,
    map: { ...s.map!, at: [p.x, p.y], course: null, notice: { n: 0, next: 1e9 } },
  };
  const r = enterAt(at, mapOf(s)!, p);
  if (!r.ok) throw new Error(r.reason);
  const g = goInPlace(r.state, { place: placeById(mapOf(s)!, FORT)!, doors: DOORS, door: 'inn' });
  if (typeof g === 'string') throw new Error(g);
  return g;
}

/** A Gate elder sitting in the inn: Foundation, the Gate's. */
function withElder(s: GameState): { s: GameState; elder: Actor } {
  const elder = plainActor({
    id: 'gate-elder',
    name: 'Elder Mo',
    side: 'gate',
    realm: { realm: 'foundation-establishment', stage: 2 },
    power: GATE,
  });
  const scene = { ...s.goin!.scene, actors: [...s.goin!.scene.actors, elder] };
  return { s: { ...s, goin: { ...s.goin!, scene } }, elder };
}

const ASKED = 'What does a Foundation Pill go for these days?';

describe('the world book', () => {
  it('has the mortal innkeeper and the Gate elder answer about Foundation Pills from different entries', () => {
    const { s, elder } = withElder(atInn('book'));
    const scene = s.goin!.scene;
    const keeper = scene.actors.find((a) => a.id.startsWith('keeper:'))!;
    const book = worldBook(s, FORT, [GATE]);
    const topics = topicsAt([ASKED], ['pills', 'prices'], 'inn');
    const inn = loreFor(knowerOf(s, scene, keeper), book, topics, [ASKED]);
    const gate = loreFor(knowerOf(s, scene, elder), book, topics, [ASKED]);
    const ids = (l: typeof inn) => l.entries.map((e) => e.id);
    expect(ids(inn)).toContain('pills-to-mortals');
    expect(ids(inn).some((id) => id.startsWith('price-'))).toBe(false);
    expect(ids(gate)).toContain(`years-pills-${GATE}`);
    expect(ids(gate).some((id) => id.startsWith('price-foundation-pill'))).toBe(true);
    expect(ids(gate)).not.toContain('pills-to-mortals');
    expect(gate.entries.length).toBeLessThanOrEqual(LORE_PER_PERSON);
  });

  it('puts each person’s entries and their regard by realm in the context', () => {
    const { s } = withElder(atInn('context'));
    const view = buildView({ state: s, scene: s.goin!.scene, atlas: atlasOf([]), said: ASKED });
    expect(view.scene).toContain('a mortal, no cultivation');
    expect(view.scene).toContain('to them you are an immortal');
    expect(view.scene).toContain('they stand a realm above you');
    expect(view.scene).toContain('[pills-to-mortals]');
    expect(view.scene).toContain(`[years-pills-${GATE}]`);
  });

  it('sends only the door’s own talk on a turn that asks nothing', () => {
    const { s } = withElder(atInn('quiet'));
    const view = buildView({ state: s, scene: s.goin!.scene, atlas: atlasOf([]) });
    expect(view.scene).not.toContain('Knows nothing of');
    expect(view.scene).not.toContain('[pills-to-mortals]');
    expect(view.scene).toContain('[bw-keepers-hear]');
  });

  it('reads who-knows tags, a `&` needing every part', () => {
    const k = {
      mortal: false,
      realm: 'qi-condensation' as const,
      places: [FORT, 'qm-bianhuang'],
      powers: [GATE],
      trades: ['inn'],
    };
    expect(meetsTag(k, 'cultivator&region:qm-bianhuang')).toBe(true);
    expect(meetsTag(k, 'mortal&region:qm-bianhuang')).toBe(false);
    expect(meetsTag(k, `power:${GATE}`)).toBe(true);
    expect(meetsTag(k, 'trade:inn')).toBe(true);
    expect(meetsTag(k, 'realm:foundation-establishment+')).toBe(false);
    expect(meetsTag(k, 'realm:qi-condensation+')).toBe(true);
  });

  it('writes the mechanics half from the game’s own numbers', () => {
    const s = atInn('numbers');
    const book = worldBook(s, FORT, [GATE]);
    const posted = book.find((e) => e.id === 'price-foundation-pill')!;
    expect(posted.text).toContain(stonePrice(priceOf('foundation-pill')));
    expect(posted.text).toContain(item('foundation-pill').name);
    expect(book.find((e) => e.id === 'realm-core-formation')!.knownBy).toEqual([
      'realm:foundation-establishment+',
    ]);
  });

  it('keeps the written half well formed', () => {
    const ids = new Set<string>();
    for (const e of WRITTEN_LORE) {
      expect(ids.has(e.id)).toBe(false);
      ids.add(e.id);
      expect(e.text.split(/\s+/).length).toBeLessThanOrEqual(50);
      expect(e.about.length).toBeGreaterThan(0);
      for (const t of e.knownBy)
        for (const part of t.split('&'))
          expect(part).toMatch(
            /^(everyone|mortal|cultivator|(region|place|power|trade):[a-z-]+|realm:[a-z-]+\+)$/,
          );
    }
  });
});

describe('the hour before you go in, and Wait until', () => {
  it('words a door’s hour by its kind: an inn shut deep in the night, the streets the hour alone', () => {
    const night = 1.5 / 12; // 丑
    expect(goInHour(night)).toBe('丑 the small hours');
    expect(goInHour(night, 'bounty')).toBe('丑 the small hours');
    expect(goInHour(10 + 6.5 / 12)).toMatch(/^午 noon/);
  });

  it('waits to the next dawn, noon or dusk, and an arrival stops it', () => {
    let s = atInn('wait');
    s = {
      ...s,
      calendar: { day: Math.floor(s.calendar.day) + 2.5 / 12 },
      goin: { ...s.goin!, scene: { ...s.goin!.scene, tick: 0, due: null } },
    };
    expect(ticksUntil(s, 'dawn')).toBe(2); // 寅's middle to 卯
    expect(ticksUntil(s, 'noon')).toBe(14);
    const r = waitUntilTurn(s, 'noon');
    expect(r.state.goin!.scene.tick).toBe(14);
    // Someone on the way stops it at their arrival.
    const coming = { ...s.goin!.scene, due: 5, table: r.state.goin!.scene.actors.slice(0, 1) };
    const stopped = waitUntilTurn({ ...s, goin: { ...s.goin!, scene: coming } }, 'noon');
    expect(stopped.state.goin!.scene.tick).toBe(5);
  });
});
