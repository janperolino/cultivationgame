// Going in: places and people, as GLM gets them (P3.9b): a person met last week named with what
// you did and in their own voice, a shared past that isn't there missing from the context (so
// "remember when" reads as a lie), and the crowd's faces as refs, made the moment they are aimed at.
import { describe, expect, it } from 'vitest';
import { runTurn } from '../core/goin.ts';
import { goInPlace } from '../core/goinPlace.ts';
import type { DoorRef } from '../core/frames.ts';
import { enterAt } from '../core/map/gate.ts';
import { placeById } from '../core/map/region.ts';
import { ensureMap, mapOf } from '../core/map/travel.ts';
import { remember } from '../core/resolver/opinion.ts';
import { step } from '../core/resolver/plan.ts';
import { actorIn } from '../core/resolver/scene.ts';
import { newLife, type GameState } from '../core/state.ts';
import { keepLasts } from '../core/voices.ts';
import { atlasOf, buildView } from './context.ts';

const FORT = 'pacified-fort';

const DOORS: DoorRef[] = [
  { id: 'stall', name: 'the free market', art: 'stall', group: 'market' },
  { id: 'teahouse', name: 'the Quiet Moon', art: 'teahouse', group: 'hear' },
];

/** Inside Pacified Fort, at 巳. */
function life(seed: string): GameState {
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
  return { ...r.state, calendar: { day: Math.floor(r.state.calendar.day) + 5.5 / 12 } };
}

function goIn(s: GameState, door: string | null): GameState {
  const r = goInPlace(s, { place: placeById(mapOf(s)!, FORT)!, doors: DOORS, door });
  if (typeof r === 'string') throw new Error(r);
  return r;
}

describe('places as GLM sees them', () => {
  it('names what you did last week in their voice, and holds no past that never happened', () => {
    let s = goIn(life('remember'), 'teahouse');
    const keeper = s.goin!.scene.actors.find((a) => a.id.startsWith('keeper:'))!;
    s = {
      ...s,
      world: remember(
        s.world,
        {
          holder: keeper.id,
          about: s.player.id,
          row: 'paid-fairly',
          what: 'bought a pot of Cloud Mist and asked about Black Pine',
          felt: 'He tipped like a lord.',
          known: [s.player.id],
        },
        s.calendar.day - 7,
      ),
    };
    s = keepLasts(s, {
      said: [{ about: keeper.id, line: 'Price is the price.' }],
      address: [{ about: keeper.id, address: 'young master' }],
      felt: [],
      moment: null,
    });
    const view = buildView({ state: s, scene: s.goin!.scene, atlas: atlasOf([]) });
    expect(view.scene).toContain('bought a pot of Cloud Mist');
    expect(view.scene).toContain('He tipped like a lord.');
    expect(view.scene).toContain('Price is the price.');
    expect(view.scene).toContain('They call you: young master');
    expect(view.scene).not.toContain('saved my life');
  });

  it('gives the crowd’s faces as refs, made the moment one is aimed at', () => {
    const s = goIn(life('faces'), null);
    const view = buildView({ state: s, scene: s.goin!.scene, atlas: atlasOf([]) });
    expect(view.scene).toContain('face-1');
    const id = view.refs['face-1']!;
    expect(id).toMatch(/^face:/);
    expect(actorIn(s.goin!.scene, id)).toBeUndefined();
    const t = runTurn(s, { actor: s.player.id, steps: [step('chat', { target: id })] });
    expect(actorIn(t.state.goin!.scene, id)).toBeDefined();
    expect(t.results[0]?.refused).toBeNull();
  });

  it('lists the moves from where you stand as frames the interpreter can enter', () => {
    const s = goIn(life('moves'), 'teahouse');
    const view = buildView({ state: s, scene: s.goin!.scene, atlas: atlasOf([]) });
    expect(view.scene).toContain('You can go to');
    expect(view.things.has('door:stall')).toBe(true);
  });
});
