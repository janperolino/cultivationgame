import { describe, expect, it } from 'vitest';
import { ACTS, VERBS } from '../../content/resolver.ts';
import { createLife, type Creation } from '../creation.ts';
import { loadSave, makeSave, SAVE_VERSION } from '../save/format.ts';
import type { GameState } from '../state.ts';
import { plainActor, sizeAt, stagesDown, YOU, type Actor } from './actor.ts';
import {
  capability,
  composure,
  helpFactor,
  isBeyond,
  leverage,
  masteryHelp,
  presence,
  readRealm,
  resistance,
  verdict,
} from './check.ts';
import { applyEffects, EffectSchema } from './effects.ts';
import { PlanSchema, step } from './plan.ts';
import {
  doStep,
  leaveScene,
  previewStep,
  round,
  runPlan,
  startScene,
  type Scene,
  type SceneInit,
} from './scene.ts';
import {
  addHeat,
  addProject,
  discover,
  emptyWorld,
  heatOf,
  heatWord,
  knows,
  lateDebts,
  learn,
  recordDeed,
  soulLamp,
  startState,
  sweep,
  tell,
  woundShare,
  workProject,
  type Project,
} from './world.ts';

const life = (): GameState =>
  createLife({
    name: 'Han Li',
    pronouns: 'they/them',
    look: '',
    mode: 'ironman',
    seed: 'resolver',
    choice: 'along',
    roll: {
      root: 'true',
      elements: ['wood', 'fire'],
      body: 'farmhands-frame',
      soul: 'plain-mind',
      fate: 'ordinary-fate',
      origin: 'cave-orphan',
    },
  } satisfies Creation);

const QC = (stage: number) => ({ realm: 'qi-condensation' as const, stage });
const FE = (stage: number) => ({ realm: 'foundation-establishment' as const, stage });
const CF = (stage: number) => ({ realm: 'core-formation' as const, stage });
const NS = (stage: number) => ({ realm: 'nascent-soul' as const, stage });

/** The player as an actor from parts, at a realm. */
const you = (
  s: GameState,
  extra: Parameters<typeof plainActor>[0] extends infer T ? Partial<T> : never = {},
) => plainActor({ id: s.player.id, name: 'Han Li', side: YOU, ...extra });

const them = (id: string, extra: Partial<Parameters<typeof plainActor>[0]> = {}): Actor =>
  plainActor({ id, name: id, side: 'them', ...extra });

const scene = (actors: Actor[], init: Partial<SceneInit> = {}): Scene =>
  startScene({ place: 'test-place', actors, ...init });

describe('the verdict', () => {
  it('is clear at ×1.25, close at ×1 and short below, with no roll', () => {
    expect(verdict(125, 100)).toBe('clear');
    expect(verdict(124, 100)).toBe('close');
    expect(verdict(100, 100)).toBe('close');
    expect(verdict(99, 100)).toBe('short');
  });

  it('calls a whole realm short beyond you', () => {
    expect(isBeyond(10, 31)).toBe(true);
    expect(isBeyond(10, 30)).toBe(false);
  });
});

describe('what helps', () => {
  it('counts mastery at ×1.05 a level and ×1.25 at Origin', () => {
    expect(masteryHelp(0)).toBe(1);
    expect(masteryHelp(2)).toBeCloseTo(1.1025);
    expect(masteryHelp(4)).toBe(1.25);
  });

  it('caps everything that helps at ×2', () => {
    expect(helpFactor({ uses: 2, helpers: 1 })).toBeCloseTo(1.1 * 1.1 * 1.2);
    expect(helpFactor({ stat: 0.5, mastery: 4, uses: 3, helpers: 2 })).toBe(2);
    // Past three things used and two helpers, more count for nothing.
    expect(helpFactor({ uses: 9 })).toBeCloseTo(1.1 ** 3);
    expect(helpFactor({ helpers: 5 })).toBeCloseTo(1.2 ** 2);
  });

  it('never carries skill across a realm', () => {
    const peak = plainActor({ id: 'a', name: 'a', side: 'a', realm: QC(1), stats: { force: 5 } });
    expect(capability(peak, 'force', { uses: 3, helpers: 2 })).toBe(20);
    expect(verdict(20, sizeAt(FE(1)))).toBe('short');
    const deacon = plainActor({ id: 'd', name: 'd', side: 'd', realm: FE(4), stats: { force: 5 } });
    expect(isBeyond(capability(deacon, 'force'), sizeAt(NS(1)))).toBe(true);
  });

  it('reads Agility where the capability counts it, and wounds off the line', () => {
    const quick = plainActor({ id: 'q', name: 'q', side: 'q', agility: 14 });
    expect(capability(quick, 'stealth')).toBeCloseTo(12);
    expect(capability(quick, 'force')).toBeCloseTo(10);
    expect(capability({ ...quick, wound: 0.1 }, 'force')).toBeCloseTo(9);
  });
});

describe('reading a realm', () => {
  it('sees the true realm with perception at or above their soul', () => {
    const elder = them('elder', { realm: NS(1) });
    const disciple = them('disciple', { realm: FE(1), shown: QC(5) });
    expect(readRealm(elder, disciple)).toEqual({ kind: 'true', realm: FE(1) });
  });

  it('reads the shown realm, or beyond you, below it', () => {
    const deacon = them('deacon', { realm: FE(4) });
    const veiled = them('veiled', { realm: NS(1), shown: CF(1) });
    expect(readRealm(deacon, veiled)).toEqual({ kind: 'shown', realm: CF(1) });
    expect(readRealm(deacon, { ...veiled, shown: undefined })).toEqual({ kind: 'beyond' });
  });

  it('lets Perception close part of a gap', () => {
    const peak = them('peak', { realm: QC(9) });
    const early = them('early', { realm: FE(1) });
    expect(readRealm(peak, early).kind).toBe('beyond');
    expect(readRealm({ ...peak, stats: { perception: 0.3 } }, early).kind).toBe('true');
  });

  it('veils as many stages down as concealment allows', () => {
    expect(stagesDown(FE(1), 1)).toEqual(QC(9));
    expect(stagesDown(FE(2), 3)).toEqual(QC(8));
    expect(stagesDown(QC(2), 5)).toEqual(QC(1));
  });
});

describe('intimidation', () => {
  it('weighs the danger you show against the safety they feel', () => {
    const me = them('me', { realm: FE(1), weapon: 'gold' });
    const guard = them('guard', { realm: QC(9) });
    const p = presence(me, guard, { weapon: true });
    expect(p.value).toBeCloseTo(31 * 1.5);
    expect(verdict(p.value, composure(guard))).toBe('clear');
    // A cornered man doesn't scare, and a sect behind him counts.
    expect(composure({ ...guard, desperate: true, backing: 'sect' })).toBeCloseTo(
      composure(guard) * 2,
    );
  });

  it('frightens only as much as the realm shown, and pins two realms up', () => {
    const veiled = them('v', { realm: NS(1), shown: QC(3) });
    const deacon = them('d', { realm: FE(1) });
    expect(presence(veiled, deacon).value).toBeCloseTo(sizeAt(QC(3)));
    expect(presence(them('c', { realm: CF(1) }), them('q', { realm: QC(4) })).pinned).toBe(true);
    // Beyond them reads as the next realm's first stage, but the pressure is felt in full.
    const beyond = presence(them('n', { realm: NS(1) }), deacon);
    expect(beyond.value).toBeCloseTo(sizeAt(CF(1)));
    expect(beyond.pinned).toBe(true);
    // Veiled down to Foundation, the same elder pins nobody at Foundation.
    expect(presence(them('n', { realm: NS(1), shown: FE(4) }), deacon).pinned).toBe(false);
  });
});

describe('people checks', () => {
  it('weigh leverage against resistance, sized by no realm', () => {
    expect(verdict(leverage(), resistance())).toBe('close');
    expect(verdict(leverage({ motive: true }), resistance())).toBe('clear');
    expect(verdict(leverage({ prop: true }), resistance())).toBe('clear');
    expect(verdict(leverage(), resistance({ suspicion: true }))).toBe('short');
    expect(leverage({ trust: 'hostile' })).toBe(0.25);
  });

  it('turns suspicious once they know you lied to them', () => {
    const s = life();
    const host = them('host', { realm: QC(3) });
    const sc = scene([you(s), host]);
    const ask = step('persuade', { target: 'host' });
    expect(previewStep(s, sc, s.player.id, ask).judged).toBe('close');
    const lied = recordDeed(
      s.world,
      { kind: 'lie', actor: s.player.id, place: 'x', witnesses: [{ id: 'host' }] },
      s.calendar.day,
    );
    const after = { ...s, world: lied.world };
    expect(previewStep(after, sc, s.player.id, ask).judged).toBe('short');
  });

  it('fails a lie to a soul two realms above yours, and they know', () => {
    const s = life();
    const elder = them('elder', { realm: CF(1) });
    const sc = scene([you(s), elder]);
    const r = doStep(s, sc, s.player.id, step('lie', { target: 'elder' }));
    expect(r.result.check).toMatchObject({ verdict: 'short', read: true });
    expect(knows(r.state.world, r.result.deeds[0]!, 'elder')).toEqual({ deed: true, who: true });
  });
});

describe('a step', () => {
  it('shows the verdict your character can judge, "?" against a realm you can\'t read', () => {
    const s = life();
    const sc = scene([you(s, { realm: QC(3) }), them('watcher', { realm: FE(1) })]);
    const p = previewStep(s, sc, s.player.id, step('sneak'));
    expect(p.judged).toBe('?');
    expect(p.refused).toBeNull();
    // The engine compares the true numbers unseen.
    expect(p.check!.verdict).toBe('short');
    // Not knowing, you still see what it would cost.
    expect(p.line).toBe('sneak past · ? · someone sees · if short: you are caught');
  });

  it("can't fail with nobody watching, and says so", () => {
    const s = life();
    const p = previewStep(s, scene([you(s)]), s.player.id, step('sneak'));
    expect(p.judged).toBe('clear');
    expect(p.line).toBe('sneak past · clear');
  });

  it('shows its stakes when it is close', () => {
    const s = life();
    const sc = scene([you(s, { realm: QC(3) }), them('porter', { realm: QC(3) })]);
    expect(previewStep(s, sc, s.player.id, step('sneak')).line).toBe(
      'sneak past · close · someone sees · if short: you are caught',
    );
  });

  it('refuses what is beyond you, what you lack, and what waits for a milestone', () => {
    const s = life();
    const wall = { id: 'wall', name: 'the Wall', tags: [], realm: NS(1) };
    const sc = scene([you(s)], { features: [wall] });
    expect(previewStep(s, sc, s.player.id, step('break', { target: 'wall' })).refused).toMatch(
      /beyond you/,
    );
    expect(previewStep(s, sc, s.player.id, step('brew')).refused).toBe('brew waits for M4');
    expect(
      previewStep(s, sc, s.player.id, step('lift', { target: 'wall', uses: ['rope'] })).refused,
    ).toMatch(/no rope/);
  });

  it('gives the same answer until something changes', () => {
    const s = life();
    const sc = scene([you(s, { realm: QC(3) }), them('guard', { realm: QC(4) })]);
    const a = doStep(s, sc, s.player.id, step('sneak'));
    const b = doStep(s, sc, s.player.id, step('sneak'));
    expect(a.result.check).toEqual(b.result.check);
    const helped = doStep(
      s,
      scene([...sc.actors], {
        features: [{ id: 'dark', name: 'darkness', tags: [], favors: ['stealth'] }],
      }),
      s.player.id,
      step('sneak'),
    );
    expect(helped.result.check!.yours).toBeGreaterThan(a.result.check!.yours);
  });

  it("pays a close pass with the act's cost", () => {
    const s = life();
    const sc = scene([you(s, { realm: QC(3) }), them('porter', { realm: QC(3) })], {
      kind: 'town',
    });
    const r = doStep(s, sc, s.player.id, step('sneak'));
    expect(r.result).toMatchObject({ cost: 'witness' });
    expect(knows(r.state.world, r.result.deeds[0]!, 'porter').who).toBe(true);
    const timed = doStep(s, sc, s.player.id, step('hide'));
    expect(timed.result).toMatchObject({ cost: 'time', ticks: 2 });
  });
});

describe('scenes and ticks', () => {
  it('runs everyone in Agility order, and NPCs act through the same resolver', () => {
    const s = life();
    const bandit = them('bandit', {
      realm: QC(3),
      agility: 14,
      plan: [step('sneak')],
    });
    const r = round(s, scene([you(s, { realm: QC(2) }), bandit]), {
      [s.player.id]: step('look-around'),
    });
    expect(r.results.map((x) => x.actor)).toEqual(['bandit', s.player.id]);
    // The bandit sneaks against your perception, as you would against theirs.
    expect(r.results[0]!.check!.faced).toEqual([s.player.id]);
    expect(r.scene.tick).toBe(4);
  });

  it('adds its ticks to the world clock off the wheel when you leave', () => {
    const s = life();
    const r = round(s, scene([you(s)]), { [s.player.id]: step('look-around') });
    const left = leaveScene(r.state, r.scene);
    expect(left.calendar.day).toBeCloseTo(s.calendar.day + 4 / 48);
    expect(left.player.qi).toEqual(s.player.qi);
  });

  it('hands a fight to the combat engine, and its noise calls someone on the road', () => {
    const s = life();
    const stranger = them('stranger', { side: 'strangers', realm: QC(5) });
    let sc = scene([you(s, { realm: QC(5) }), them('wolf', { realm: QC(1) })], {
      traffic: 'road',
      table: [stranger],
    });
    let r = round(s, sc, { [s.player.id]: step('attack', { target: 'wolf' }) });
    const fight = r.results[0]!;
    expect(fight.fight?.winner).toBe(YOU);
    expect(r.scene.noise).toEqual({ li: 1, until: 2 });
    expect(r.scene.due).toBe(6);
    sc = r.scene;
    // Waiting skips to the arrival.
    r = round(r.state, sc, { [s.player.id]: step('wait') });
    expect(r.arrivals).toEqual(['stranger']);
    expect(r.scene.tick).toBe(6);
  });

  it('brings no one to a quiet scene, and someone every two ticks to a busy open one', () => {
    const s = life();
    const quiet = round(s, scene([you(s)], { table: [them('x')] }), {
      [s.player.id]: step('camp'),
    });
    expect(quiet.arrivals).toEqual([]);
    let sc = scene([you(s)], {
      open: true,
      traffic: 'busy',
      table: [them('a'), them('b'), them('c')],
    });
    let st = s;
    const came: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = round(st, sc, { [s.player.id]: step('wait') });
      st = r.state;
      sc = r.scene;
      came.push(...r.arrivals);
    }
    // Each Wait skips to the next arrival, two ticks on.
    expect(came).toHaveLength(3);
    expect(sc.tick).toBe(6);
    // Who comes is the scene stream's draw, the same for the same seed.
    let again = scene([you(s)], {
      open: true,
      traffic: 'busy',
      table: [them('a'), them('b'), them('c')],
    });
    let st2 = s;
    const came2: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = round(st2, again, { [s.player.id]: step('wait') });
      st2 = r.state;
      again = r.scene;
      came2.push(...r.arrivals);
    }
    expect(came2).toEqual(came);
  });

  it('calls the law on a deed someone saw, and the law heats its power', () => {
    const s = life();
    const merchant = them('merchant', { realm: QC(4), stones: 30, power: 'guarded-mouth' });
    const sc = scene([you(s, { realm: QC(3) }), merchant], {
      kind: 'town',
      power: 'guarded-mouth',
    });
    const plan = PlanSchema.parse({
      actor: s.player.id,
      steps: [step('steal', { target: 'merchant', thing: 'stones' })],
    });
    const r = runPlan(s, sc, plan);
    expect(r.stopped).toBe('you are caught');
    // The merchant saw it: the town is warier, and the power heard it from him.
    expect(heatOf(r.state.world, 'test-place', s.calendar.day)).toBe(1);
    expect(heatOf(r.state.world, 'guarded-mouth', s.calendar.day)).toBe(1);
    // A town's watch answers in a tick: it came at the round's end and learned what he saw.
    expect(r.scene.actors.some((a) => a.id === 'law:test-place')).toBe(true);
    const deed = r.state.world.deeds[0]!;
    expect(deed.knownBy['law:test-place']).toEqual({ who: true, power: 'guarded-mouth' });
  });
});

describe('effects', () => {
  it('apply to you, the world and the scene, karma included', () => {
    const s = life();
    const sc = scene([you(s), them('ally')]);
    const effects = [
      { do: 'stones', who: s.player.id, n: 5 },
      { do: 'item', who: 'ally', id: 'spring-returning-pill', n: 1, how: 'gained' },
      { do: 'knowledge', kind: 'name', id: 'elder-mo' },
      { do: 'heat', holder: 'test-place', n: 2 },
      { do: 'wound', who: s.player.id, share: 0.2, days: 3 },
      { do: 'place', id: 'test-place', state: 'damaged' },
      { do: 'memory', who: 'ally', about: s.player.id, row: 'saved-life' },
      { do: 'karma', who: s.player.id, n: 5 },
    ].map((e) => EffectSchema.parse(e));
    const r = applyEffects(s, sc, effects);
    expect(r.state.player.stones).toBe(s.player.stones + 5);
    expect(r.scene!.actors[1]!.items['spring-returning-pill']).toBe(1);
    expect(r.state.world.known).toContain('name:elder-mo');
    expect(heatOf(r.state.world, 'test-place', s.calendar.day)).toBe(2);
    expect(woundShare(r.state.world, s.player.id, s.calendar.day)).toBe(0.2);
    expect(woundShare(r.state.world, s.player.id, s.calendar.day + 3)).toBe(0);
    expect(r.state.world.places['test-place']).toBe('damaged');
    // The memory lands, seen by the players in the scene; karma lands on heaven's ledger.
    expect(r.state.world.memories.at(-1)).toMatchObject({
      holder: 'ally',
      about: s.player.id,
      row: 'saved-life',
      value: 40,
      known: [s.player.id],
    });
    expect(r.state.world.karma[s.player.id]).toBe(5);
  });

  it('take nothing off the fixed list', () => {
    expect(EffectSchema.safeParse({ do: 'win', who: 'player' }).success).toBe(false);
  });
});

describe('heat', () => {
  it('rises to 9, cools a point a month and reads as a word', () => {
    let w = addHeat(emptyWorld(), 'town', 4, 0);
    w = addHeat(w, 'town', 7, 0);
    expect(heatOf(w, 'town', 0)).toBe(9);
    expect(heatOf(w, 'town', 30)).toBe(8);
    expect(heatOf(w, 'town', 400)).toBe(0);
    expect([0, 3, 6, 9].map(heatWord)).toEqual([
      'quiet',
      'watched',
      'hunted locally',
      'hunted by the power',
    ]);
  });
});

describe('who knows', () => {
  it('spreads only through witnesses, the telling, evidence, divine sense and soul lamps', () => {
    let w = emptyWorld();
    const done = recordDeed(
      w,
      {
        kind: 'killing',
        actor: 'you',
        victim: 'courier',
        place: 'pass',
        power: 'gate',
        evidence: ['body', 'technique:rampart-palm'],
        witnesses: [],
      },
      10,
    );
    w = done.world;
    const id = done.id;
    // Unseen: nobody knows, and no heat lands.
    expect(heatOf(w, 'pass', 10)).toBe(0);
    // A body tells a passer-by a deed was done; the technique's mark tells who to one who knows it.
    w = discover(w, 'pass', { id: 'herder' }, 11);
    expect(knows(w, id, 'herder')).toEqual({ deed: true, who: false });
    w = discover(w, 'pass', { id: 'disciple', power: 'gate', techniques: ['rampart-palm'] }, 11);
    expect(knows(w, id, 'disciple').who).toBe(true);
    expect(heatOf(w, 'gate', 11)).toBe(3);
    // The disciple tells a friend.
    w = tell(w, 'disciple', { id: 'friend' }, 12);
    expect(knows(w, id, 'friend').who).toBe(true);
    // Divine sense sweeps the place.
    const swept = sweep(emptyWorld(), 'pass', { id: 'elder' }, 0, 12);
    expect(swept.deeds).toEqual([]);
    expect(knows(sweep(w, 'pass', { id: 'elder' }, 0, 12), id, 'elder').who).toBe(true);
    // A soul lamp: the sect knows at once, and a Core elder's lamp shows the face.
    const lamp = soulLamp(done.world, id, 'beast-court', true, 10);
    expect(heatOf(lamp, 'beast-court', 10)).toBe(3);
    expect(heatOf(soulLamp(done.world, id, 'beast-court', false, 10), 'beast-court', 10)).toBe(0);
    // Learning who twice lands the heat once.
    expect(
      heatOf(learn(lamp, id, { id: 'x', power: 'beast-court' }, true, 10), 'beast-court', 10),
    ).toBe(3);
  });
});

describe('lasting states', () => {
  it('blow a cover when you act above your shown realm where someone sees', () => {
    const s = life();
    const me = you(s, { realm: FE(1), stats: { concealment: 4 } });
    let sc = scene([me, them('deacon', { realm: QC(5) })]);
    let r = doStep(s, sc, s.player.id, step('veil', { shown: QC(6) }));
    expect(r.scene.actors[0]!.shown).toEqual(QC(6));
    // Held to the shown realm, the cover holds.
    const crate = { id: 'crate', name: 'an iron crate', tags: [], realm: QC(5) };
    sc = { ...r.scene, features: [crate] };
    const held = doStep(
      r.state,
      sc,
      s.player.id,
      step('lift', { target: 'crate', manner: 'veiled' }),
    );
    expect(held.result.surprise).toBeNull();
    // Unheld, the act shows what you are.
    r = doStep(r.state, sc, s.player.id, step('lift', { target: 'crate' }));
    expect(r.result.surprise).toMatch(/cover is blown/);
    expect(r.state.world.states.filter((x) => x.data.kind === 'cover')).toEqual([]);
  });

  it('track debts past due, by the month', () => {
    const w = startState(
      emptyWorld(),
      'you',
      { kind: 'debt', to: 'smuggler', stones: 50, due: 100 },
      0,
    ).world;
    expect(lateDebts(w, 99)).toEqual([]);
    expect(lateDebts(w, 165)[0]).toMatchObject({ to: 'smuggler', months: 2 });
  });
});

describe('projects', () => {
  const p: Project = {
    id: 'trust',
    name: "a half-blood's trust",
    owner: 'you',
    size: 4,
    progress: 0,
    hidden: false,
    heat: 0,
    onFail: 'step',
    check: null,
  };

  it('run as clocks: clear and close go a step on, short costs a step or adds heat', () => {
    expect(workProject(p, 'clear').progress).toBe(1);
    expect(workProject({ ...p, hidden: true }, 'close')).toMatchObject({ progress: 1, heat: 1 });
    expect(workProject({ ...p, progress: 2 }, 'short').progress).toBe(1);
    expect(workProject({ ...p, onFail: 'heat' }, 'short')).toMatchObject({ progress: 0, heat: 1 });
  });

  it('step on through the Work verb', () => {
    const s = life();
    const st = { ...s, world: addProject(s.world, p) };
    const r = doStep(st, scene([you(s)]), s.player.id, step('step', { target: 'trust' }));
    expect(r.state.world.projects[0]!.progress).toBe(1);
  });
});

describe('plans', () => {
  it('check against the schema, so words grant nothing', () => {
    expect(
      PlanSchema.safeParse({ actor: 'player', steps: [{ verb: 'fight', act: 'sneak' }] }).success,
    ).toBe(false);
    expect(
      PlanSchema.safeParse({ actor: 'player', steps: [{ verb: 'win', act: 'win' }] }).success,
    ).toBe(false);
    expect(PlanSchema.safeParse({ actor: 'player', steps: [step('sneak')] }).success).toBe(true);
  });

  it('cover all twelve verbs, Make waiting for M4', () => {
    for (const v of VERBS) expect(Object.values(ACTS).some((a) => a.verb === v)).toBe(true);
    expect(
      Object.values(ACTS)
        .filter((a) => a.verb === 'make')
        .every((a) => 'waits' in a),
    ).toBe(true);
  });
});

describe('the save', () => {
  it('carries the world from v20, and a v19 save loads with an empty one', () => {
    const s = life();
    expect(SAVE_VERSION).toBe(34);
    const raw = JSON.parse(JSON.stringify(makeSave(s, 1))) as {
      version: number;
      state: Record<string, unknown>;
    };
    delete raw.state.world;
    raw.version = 19;
    // Empty but for what v21 brings forward: the outer leans of the people you'd met.
    expect({ ...loadSave(raw).state.world, known: [] }).toEqual(emptyWorld());
  });
});
