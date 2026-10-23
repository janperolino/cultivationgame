// The fight inside the scene (P3.9c): who joins a fight under way and when (the law on its kind's
// turn against whoever started it, a follower left nearby or within call, a friend in the frame),
// a backer's projection arriving the turn after its charge falls low, saying its line, fading after
// three turns or taking its charge away when you give face, the backer remembering it; the joins
// replaying the same from the save (the typed turn's tests are in src/ai/fightTurn.test.ts).
import { describe, expect, it } from 'vitest';
import { PROJECTION } from '../content/resolver.ts';
import { combatant, topRung } from './combat/combatant.ts';
import { combatantIn, startFight, type Fight } from './combat/fight.ts';
import { arrive, faceAsked, giveFace, projectionFighter, speaking } from './combat/joins.ts';
import { runTurn } from './goin.ts';
import { goInPlace } from './goinPlace.ts';
import { enterAt } from './map/gate.ts';
import { placeById } from './map/region.ts';
import { ensureMap, mapOf } from './map/travel.ts';
import { fightEnd, playTurn, type YourAction } from './played.ts';
import { currentFight, finishFight, fightStart } from './playFight.ts';
import { plainActor, type Actor } from './resolver/actor.ts';
import { step } from './resolver/plan.ts';
import { newLife, withPlayer, type GameState } from './state.ts';

const FORT = 'pacified-fort';

/** Inside a place at its free market: Pacified Fort, a town, or the City of the Guarded Mouth. */
function atTheMarket(seed = 'scene-fight', id = FORT): GameState {
  const s0 = ensureMap(
    newLife({ name: 'Han Li', seed, origin: { id: 'conscript', choice: 'along' } }),
  );
  const q = { ...s0, map: { ...s0.map!, notice: { n: 0, next: 1e9 } } };
  // Stones for a city's toll at the gate.
  const s = withPlayer(q, { ...q.player, stones: 600 });
  const p = placeById(mapOf(s)!, id)!;
  const at = { ...s, map: { ...s.map!, at: [p.x, p.y] as [number, number], course: null } };
  const inside = enterAt(at, mapOf(s)!, p);
  if (!inside.ok) throw new Error(inside.reason);
  const doors = [
    { id: 'stall', name: 'the free market', art: 'stall', group: 'market' },
    { id: 'teahouse', name: 'the Quiet Moon', art: 'teahouse', group: 'hear' },
  ];
  const r = goInPlace(inside.state, { place: p, doors, door: 'stall' });
  if (typeof r === 'string') throw new Error(r);
  return r;
}

/** Someone set into your frame, at a realm, on their own side. */
function withActor(s: GameState, a: Actor): GameState {
  const g = s.goin!;
  return { ...s, goin: { ...g, scene: { ...g.scene, actors: [...g.scene.actors, a] } } };
}

const thug = (extra: Partial<Actor> = {}): Actor =>
  plainActor({
    id: 'thug',
    name: 'a cutpurse',
    side: 'them',
    realm: { realm: 'qi-condensation', stage: 3 },
    ...extra,
  });

/** You attack the cutpurse: the fight opens inside the scene. */
function opened(s: GameState): { s: GameState; f: Fight } {
  const r = runTurn(s, { actor: s.player.id, steps: [step('attack', { target: 'thug' })] });
  expect(r.fight).toBe(true);
  return { s: r.state, f: fightStart(r.state, r.state.fight!.from)! };
}

/** Plays these actions, one an exchange, while the fight runs. */
function play(s0: GameState, f0: Fight, actions: YourAction[]): { s: GameState; f: Fight } {
  let s = s0;
  let f = f0;
  for (const a of actions) {
    if (fightEnd(f, s.player.id)) break;
    const r = playTurn(s, f, a)!;
    s = r.state;
    f = r.turn.fight;
  }
  return { s, f };
}

const defend: YourAction = { main: { type: 'defend' } };

describe('who joins a fight inside the scene', () => {
  it('brings the town watch in on the 5th exchange, against whoever started it', () => {
    const { s, f } = opened(withActor(atTheMarket(), thug()));
    const law = `law:${FORT}`;
    expect(f.joins!.find((j) => j.why === 'law')).toMatchObject({ turn: 5 });
    const four = play(s, f, [defend, defend, defend, defend]);
    expect(combatantIn(four.f, law)).toBeUndefined();
    const five = play(four.s, four.f, [defend]);
    // You struck first, so the watch fights on the cutpurse's side.
    expect(combatantIn(five.f, law)?.side).toBe(combatantIn(five.f, 'thug')?.side);
    // The save's record replays the same fight, the watch in it.
    expect(combatantIn(currentFight(five.s)!, law)).toBeDefined();
  });

  it('puts the watch at your side when the other started it', () => {
    const s = withActor(atTheMarket(), thug());
    const from = { actor: 'thug', step: step('attack', { target: s.player.id }) };
    const f = fightStart(
      { ...s, fight: { from: { kind: 'scene', ...from }, start: 1, now: 1, actions: [] } },
      { kind: 'scene', ...from },
    )!;
    const me = combatantIn(f, s.player.id)!;
    expect(f.joins!.find((j) => j.why === 'law')!.who.side).toBe(me.side);
  });

  /** A follower of yours left in the frame `pick` finds, as you open a fight. */
  function leftIn(
    s0: GameState,
    pick: (here: string, district: string) => (x: { id: string; district: string }) => boolean,
  ) {
    const g = s0.goin!;
    const here = g.place!.frames.find((x) => x.id === g.place!.at)!;
    const there = g.place!.frames.find(pick(here.id, here.district))!;
    const follower = plainActor({ id: 'ning', name: 'Ning', side: 'you', follows: s0.player.id });
    const s = { ...s0, goin: { ...g, place: { ...g.place!, left: { [there.id]: [follower] } } } };
    return opened(s).f.joins!.find((j) => j.who.id === 'ning')!;
  }

  it('calls a follower left in another room of the district on the 3rd', () => {
    const j = leftIn(
      withActor(atTheMarket(), thug()),
      (here, d) => (x) => x.id !== here && x.district === d,
    );
    expect(j).toMatchObject({ turn: 3, why: 'follower' });
  });

  it('calls a follower left in another district on the 6th, and a city garrison on the 3rd', () => {
    const s = withActor(atTheMarket('city', 'qm-shoukou-cheng'), thug());
    const j = leftIn(s, (_, d) => (x) => x.district !== d);
    expect(j).toMatchObject({ turn: 6, why: 'follower' });
    expect(opened(s).f.joins!.find((x) => x.why === 'law')!.turn).toBe(3);
  });
});

describe("a backer's projection", () => {
  const charge = combatant({
    id: 'zhao',
    name: 'Zhao Qian',
    side: 'them',
    rungs: {
      qi: { realm: 'qi-condensation', stage: 7, grade: 0 },
      body: { realm: 'qi-condensation', stage: 7, grade: 0 },
      soul: { realm: 'qi-condensation', stage: 7, grade: 0 },
    },
  });
  const backer = {
    id: 'han',
    name: 'Elder Han',
    realm: { realm: 'core-formation' as const, stage: 1 },
  };
  const me = combatant({ id: 'me', name: 'Lin Ye', side: 'you' });
  const ghost = projectionFighter(backer, 'them');
  const fight = (hp: number): Fight => ({
    ...startFight([me, { ...charge, hp }]),
    joins: [{ turn: null, why: 'projection', charge: 'zhao', who: ghost }],
  });

  it('fights at a third of the backer, from the turn after its charge falls under a quarter', () => {
    expect(topRung(ghost).realm).toBe('core-formation');
    expect(ghost.maxHp).toBeLessThan(
      combatant({
        id: 'x',
        name: 'x',
        side: 'x',
        rungs: {
          qi: { realm: 'core-formation', stage: 1, grade: 0 },
          body: { realm: 'core-formation', stage: 1, grade: 0 },
          soul: { realm: 'core-formation', stage: 1, grade: 0 },
        },
      }).maxHp / 2,
    );
    expect(arrive(fight(charge.maxHp)).came).toEqual([]);
    const low = fight(Math.floor(charge.maxHp * PROJECTION.below) - 1);
    const a = arrive(low);
    expect(a.came.map((j) => j.why)).toEqual(['projection']);
    // It says its line the turn it arrives, and no blow.
    expect(speaking(low, ghost.id) || speaking(a.fight, ghost.id)).toBe(true);
    // Its three turns run out, and it fades.
    let f = { ...a.fight, turn: a.fight.turn + PROJECTION.turns + 1 };
    f = arrive(f).fight;
    expect(combatantIn(f, ghost.id)!.state).toBe('fled');
  });

  it('takes its charge away when you give face, the turn after it asks', () => {
    const a = arrive(fight(5)).fight;
    const asked = { ...a, turn: a.turn + 1 };
    expect(faceAsked(asked)?.id).toBe(ghost.id);
    const g = giveFace(asked);
    expect(combatantIn(g, 'zhao')!.state).toBe('fled');
    expect(combatantIn(g, ghost.id)!.state).toBe('fled');
    // A turn later the ask has passed.
    expect(faceAsked({ ...asked, turn: asked.turn + 1 })).toBeUndefined();
  });

  it('arrives in a scene fight, and the backer remembers the face you gave', () => {
    const young = thug({ backer, combatant: { ...charge, id: 'thug', hp: 4 } });
    const { s, f } = opened(withActor(atTheMarket('backer'), young));
    expect(f.joins!.some((j) => j.why === 'projection')).toBe(true);
    // Already low, its projection arrives on the first exchange and speaks; then you give face.
    const one = play(s, f, [defend]);
    const id = `projection:${backer.id}`;
    expect(combatantIn(one.f, id)).toBeDefined();
    expect(faceAsked(one.f)?.id).toBe(id);
    const back = play(one.s, one.f, [{ face: true }]);
    expect(fightEnd(back.f, s.player.id)).toBe('won');
    const done = finishFight(back.s, back.f)!;
    expect(done.text).toMatch(/gave face/);
    expect(
      done.state.world.memories.some(
        (m) => m.holder === backer.id && m.about === s.player.id && m.row === 'gave-face',
      ),
    ).toBe(true);
    expect(done.state.goin!.scene.actors.find((a) => a.id === 'thug')!.state).toBe('fled');
  });
});
