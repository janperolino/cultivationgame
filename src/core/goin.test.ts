// Going in, the road (P3.9): the scene in the save and a reload landing on the same step, the
// at-stake rule (a talk at stake waits for Do it, a chat doesn't), a refused step spending nothing,
// a fight that takes you in played on the stage and handed back with the scene going on, the noise
// of it drawing strangers, Go in here and walking away, leaving as a flight and pinned, the fall by
// motive (left for dead, killed), offline time banked, and the road home's card.
import { describe, expect, it } from 'vitest';
import { combatantIn, type Fight } from './combat/fight.ts';
import { cultivate } from './life.ts';
import { advance } from './loop.ts';
import {
  checkPlan,
  endScene,
  goInHere,
  goInTemplate,
  lastAct,
  leave,
  leaveView,
  runTurn,
  setPending,
  waitTurn,
} from './goin.ts';
import { ensureMap } from './map/travel.ts';
import { fightEnd, playTurn } from './played.ts';
import { finishFight, fightStart } from './playFight.ts';
import { plainActor } from './resolver/actor.ts';
import { step } from './resolver/plan.ts';
import { woundShare } from './resolver/world.ts';
import { noteRoad } from './roadHome.ts';
import { loadSave, makeSave } from './save/format.ts';
import { newLife, withPlayer, type GameState } from './state.ts';
import { stonesOf, worthOf } from './purse.ts';

const life = (seed = 'going-in'): GameState =>
  ensureMap(newLife({ name: 'Han Li', seed, origin: { id: 'conscript', choice: 'along' } }));

/** Qi Condensation at a layer, the body and soul half of it. */
const atLayer = (s: GameState, stage: number): GameState => {
  const p = s.player;
  const half = Math.max(1, Math.ceil(stage / 2));
  return withPlayer(s, {
    ...p,
    qi: { ...p.qi, stage },
    body: { ...p.body, stage: half },
    soul: { ...p.soul, stage: half },
  });
};

/** Foundation, strong enough to win a road fight. */
const foundation = (s: GameState): GameState =>
  withPlayer(s, {
    ...s.player,
    qi: { ...s.player.qi, realm: 'foundation-establishment', stage: 3 },
    body: { ...s.player.body, realm: 'foundation-establishment', stage: 1 },
    soul: { ...s.player.soul, realm: 'foundation-establishment', stage: 1 },
  });

function inScene(s: GameState, template: string): GameState {
  const r = goInTemplate(s, template);
  if (typeof r === 'string') throw new Error(r);
  return r;
}

/** The card's people in the scene: everyone not you and not drifted in. */
const theirs = (s: GameState) =>
  s.goin!.scene.actors.filter((a) => a.id !== s.player.id && !s.goin!.roles[a.id]?.drift);

/** Strikes the first foe standing until the fight ends. */
function fightOut(s0: GameState, f0: Fight): { s: GameState; f: Fight } {
  let s = s0;
  let f = f0;
  for (let i = 0; i < 80 && fightEnd(f, s.player.id) === null; i++) {
    const me = combatantIn(f, s.player.id)!;
    const foe = f.combatants.find((c) => c.side !== me.side && c.state === 'fighting')!;
    const r = playTurn(s, f, { main: { type: 'strike', target: foe.id } })!;
    s = r.state;
    f = r.turn.fight;
  }
  return { s, f };
}

describe('the scene in the save', () => {
  it('saves after every step, and a reload lands on the same step, a plan still waiting', () => {
    let s = inScene(atLayer(life(), 3), 'salt-mule-train');
    const peddler = theirs(s)[0]!;
    const plan = { actor: s.player.id, steps: [step('threaten', { target: peddler.id })] };
    s = setPending(s, 'scare the peddler', 'Threaten the peddler', plan);
    const back = loadSave(JSON.parse(JSON.stringify(makeSave(s, 1)))).state;
    expect(back.goin!.pending!.plan).toEqual(plan);
    expect(back.goin!.scene.actors.map((a) => a.id)).toEqual(s.goin!.scene.actors.map((a) => a.id));
    expect(back.goin!.scene.tick).toBe(s.goin!.scene.tick);
  });

  it('brings a v54 save up with no scene open', () => {
    const raw = JSON.parse(JSON.stringify(makeSave(life(), 1))) as {
      version: number;
      state: Record<string, unknown>;
    };
    raw.version = 54;
    delete raw.state.goin;
    expect(loadSave(raw).state.goin).toBeNull();
  });

  it('holds the clock while open, and banks the offline time to land on leaving', () => {
    const s = inScene(life(), 'salt-mule-train');
    const online = advance(s, 60_000, { step: cultivate });
    expect(online.state.calendar.day).toBe(s.calendar.day);
    const away = advance(s, 3_600_000, { step: cultivate, offline: true });
    expect(away.state.calendar.day).toBe(s.calendar.day);
    expect(away.state.goin!.banked).toBe(3_600_000);
  });
});

describe('the loop', () => {
  it('waits for Do it on a talk at stake, and runs a chat straight through', () => {
    const s = inScene(atLayer(life(), 3), 'salt-mule-train');
    const peddler = theirs(s)[0]!;
    const chat = checkPlan(s, {
      actor: s.player.id,
      steps: [step('chat', { target: peddler.id })],
    });
    expect(chat.stake).toBe(false);
    expect(chat.previews[0]!.check).toBeNull();
    const threat = checkPlan(s, {
      actor: s.player.id,
      steps: [step('threaten', { target: peddler.id })],
    });
    expect(threat.stake).toBe(true);
    // Small talk nobody judges, an exchange of three lines to a tick (talk first).
    const chat1 = { actor: s.player.id, steps: [step('chat', { target: peddler.id })] };
    const r = runTurn(s, chat1);
    expect(r.state.goin!.scene.tick).toBe(0);
    expect(r.fight).toBe(false);
    const r3 = runTurn(runTurn(r.state, chat1).state, chat1);
    expect(r3.state.goin!.scene.tick).toBe(1);
    expect(r3.state.goin!.scene.talk).toBe(0);
    // Anything else passes its own time and starts the count afresh.
    const look = runTurn(r.state, { actor: s.player.id, steps: [step('look-around', {})] });
    expect(look.state.goin!.scene.tick).toBe(4);
    expect(look.state.goin!.scene.talk).toBe(0);
  });

  it('refuses a step it can’t try and spends no tick', () => {
    const s = inScene(atLayer(life(), 3), 'salt-mule-train');
    const c = checkPlan(s, {
      actor: s.player.id,
      steps: [step('attack', { target: 'nobody-here' })],
    });
    expect(c.refused).toBe('nobody to aim it at');
    expect(s.goin!.scene.tick).toBe(0);
    // Buying with an empty purse names nothing you can hand over (found on GLM: "buy some salt").
    const broke = withPlayer(s, { ...s.player, stones: 0, purse: undefined } as never);
    const poor = {
      ...broke,
      goin: {
        ...s.goin!,
        scene: {
          ...s.goin!.scene,
          actors: s.goin!.scene.actors.map((a) => (a.id === s.player.id ? { ...a, stones: 0 } : a)),
        },
      },
    };
    const buy = checkPlan(poor, {
      actor: s.player.id,
      steps: [step('buy', { target: theirs(s)[0]!.id })],
    });
    expect(buy.refused).toBe('you have no stones to hand over');
  });

  it('ends the scene once told when your own step takes you out of it', () => {
    const s = inScene(atLayer(life(), 3), 'salt-mule-train');
    const r = runTurn(s, { actor: s.player.id, steps: [step('leave')] });
    expect(r.state.goin!.ending).toBe('left');
    expect(endScene(r.state).goin).toBeNull();
  });

  it('plays a fight on the stage, hands it back, and the scene goes on', () => {
    const s = inScene(foundation(life()), 'ridge-wolves');
    const wolf = theirs(s)[0]!;
    const r = runTurn(s, { actor: s.player.id, steps: [step('attack', { target: wolf.id })] });
    expect(r.fight).toBe(true);
    expect(r.state.fight!.from.kind).toBe('scene');
    const { s: fought, f } = fightOut(r.state, fightStart(r.state, r.state.fight!.from)!);
    const back = finishFight(fought, f)!;
    expect(back.end).toBe('won');
    expect(back.state.fight).toBeNull();
    expect(back.state.goin).not.toBeNull();
    expect(back.scene!.results[0]!.fight).toBeDefined();
    // Nothing left stands against you: the card's scene is resolved, and you can still act in it.
    expect(back.state.goin!.resolved).toBe(true);
    const look = runTurn(back.state, { actor: s.player.id, steps: [step('look-around')] });
    expect(look.state.goin!.scene.tick).toBeGreaterThan(back.state.goin!.scene.tick);
    // Leaving closes the card on the map with its lines.
    const out = endScene(leave(look.state).state);
    expect(out.goin).toBeNull();
    expect(out.map!.encounters.some((e) => e.template === 'ridge-wolves')).toBe(false);
    expect(out.chronicle.at(-1)!.type).toBe('encounter');
  });

  it("draws strangers with a fight's noise, and Wait meets them", () => {
    let s = inScene(foundation(life()), 'ditch-bandits');
    expect(s.goin!.scene.table.length).toBeGreaterThan(0);
    const bandit = theirs(s)[0]!;
    const r = runTurn(s, { actor: s.player.id, steps: [step('attack', { target: bandit.id })] });
    const { s: fought, f } = fightOut(r.state, fightStart(r.state, r.state.fight!.from)!);
    s = finishFight(fought, f)!.state;
    expect(s.goin!.scene.noise).not.toBeNull();
    let arrived = false;
    for (let i = 0; i < 6 && !arrived; i++) {
      const w = waitTurn(s);
      s = w.state;
      arrived = w.arrivals;
    }
    expect(arrived).toBe(true);
  });
});

describe('Go in here and leaving', () => {
  it('walks away from your abode with nothing', () => {
    let s = life();
    s = withPlayer(s, { ...s.player, items: {} });
    const here = goInHere(s);
    expect(typeof here).not.toBe('string');
    const g = (here as GameState).goin!;
    expect(g.scene.open).toBe(true);
    expect(g.resolved).toBe(true);
    expect(g.scene.features.length).toBeGreaterThanOrEqual(3);
    expect(leaveView(here as GameState).kind).toBe('free');
    const out = endScene(leave(here as GameState).state);
    expect(out.goin).toBeNull();
  });

  it('makes leaving a flight when someone means to stop you, and pins you under realm pressure', () => {
    const s = inScene(atLayer(life(), 2), 'ditch-bandits');
    expect(leaveView(s).kind).toBe('flee');
    const elder = plainActor({
      id: 'elder',
      name: 'an elder',
      side: 'them',
      realm: { realm: 'core-formation', stage: 1 },
    });
    const pinned: GameState = {
      ...s,
      goin: { ...s.goin!, scene: { ...s.goin!.scene, actors: [...s.goin!.scene.actors, elder] } },
    };
    expect(leaveView(pinned).kind).toBe('pinned');
    const flee = checkPlan(pinned, { actor: s.player.id, steps: [step('flee')] });
    expect(flee.refused).toMatch(/pinned/);
    // Talk is left to you.
    const beg = checkPlan(pinned, {
      actor: s.player.id,
      steps: [step('beg', { target: 'elder' })],
    });
    expect(beg.refused).toBeNull();
  });
});

describe('falling', () => {
  /** You down in the scene, with what the card's roles mean to do. */
  function down(s: GameState): GameState {
    const g = s.goin!;
    return {
      ...s,
      goin: {
        ...g,
        down: true,
        scene: {
          ...g.scene,
          actors: g.scene.actors.map((a) => (a.id === s.player.id ? { ...a, state: 'down' } : a)),
        },
      },
    };
  }

  it('leaves you for dead when robbers stand over you, stripped of everything you carry', () => {
    let s = inScene(atLayer(life(), 2), 'ditch-bandits');
    s = withPlayer(s, { ...s.player, items: { 'travel-rations': 2 } });
    const f = lastAct(down(s), false);
    expect(f.fate).toBe('robbed');
    const after = endScene(f.state);
    expect(after.ended).toBeNull();
    expect(after.player.items).toEqual({});
    expect(worthOf(stonesOf(after.player))).toBe(0);
    expect(woundShare(after.world, after.player.id, after.calendar.day)).toBe(0.5);
  });

  it('ends the life when a hunting beast stands over you, the killer named', () => {
    const s = inScene(atLayer(life(), 1), 'ridge-wolves');
    const f = lastAct(down(s), false);
    expect(f.fate).toBe('killed');
    const after = endScene(f.state);
    expect(after.ended?.cause).toBe('killed');
    const death = after.chronicle.find((e) => e.type === 'death')!;
    expect(String(death.data.killer)).toMatch(/wol/i);
  });
});

describe('the road home', () => {
  it('starts a trip leaving home and brings its card home after three days', () => {
    let s = life();
    s = noteRoad(s, false, 300);
    expect(s.map!.out!.li).toBe(300);
    s = noteRoad({ ...s, calendar: { day: s.calendar.day + 4 } }, true, 300);
    expect(s.map!.out).toBeNull();
    const card = s.cards.pending.find((p) => p.card === 'road-home')!;
    expect(card.words!.story).toMatch(/4 days out, 300 li walked/);
  });

  it('brings no card for a short walk', () => {
    let s = noteRoad(life(), false, 50);
    s = noteRoad({ ...s, calendar: { day: s.calendar.day + 1 } }, true, 50);
    expect(s.cards.pending.some((p) => p.card === 'road-home')).toBe(false);
  });
});
