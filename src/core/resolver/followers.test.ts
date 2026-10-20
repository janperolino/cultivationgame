// Followers, names and backers (P3.4b): bonds made by recruiting and broken their own ways, wages
// through the days, the treacherous turning, orders refused; karma as heaven's ledger; renown and
// infamy per region, landing only when someone learns who, fading a point a season, infamy backing
// a threat and renown a talk; what an NPC knows and tells by trust, lies and seeing for yourself,
// a staged death; membership; backers, their projection and traces; the lucky rogue; and the v22
// migration.
import { describe, expect, it } from 'vitest';
import atlas from '../../content/generated/atlas.json';
import type { Nature } from '../../content/personality.ts';
import { template } from '../../content/roster.ts';
import { generateCultivator } from '../combat/generate.ts';
import { createLife, type Creation } from '../creation.ts';
import { Rng } from '../rng.ts';
import { loadSave, makeSave } from '../save/format.ts';
import { withPlayer, type GameState } from '../state.ts';
import { actorFromNpc, plainActor, realmSizeOf, YOU, type Actor } from './actor.ts';
import { projection, projectionDue, traceFor } from './backers.ts';
import { startMark } from './marks.ts';
import { composure, presence } from './check.ts';
import { applyEffects, EffectSchema } from './effects.ts';
import { bondOf, followersDay, loyaltyFloor, makeBond, treacherous } from './followers.ts';
import { intentOf } from './intent.ts';
import {
  believesDead,
  hear,
  knowledgeOf,
  placeIndex,
  regionOf,
  see,
  setPlaces,
  telling,
  type PlaceEntry,
} from './knows.ts';
import { addFame, famePoints, fameLevel, fameOf, isMember, karmaOf, knowsName } from './names.ts';
import { addTie, grudges, opinion, remember } from './opinion.ts';
import { PlanSchema, step } from './plan.ts';
import { doStep, previewStep, round, runPlan, startScene, type SceneInit } from './scene.ts';
import {
  addProject,
  emptyWorld,
  knows,
  learn,
  recordDeed,
  standingOf,
  statesOf,
  type World,
} from './world.ts';

const life = (): GameState =>
  createLife({
    name: 'Han Li',
    pronouns: 'they/them',
    look: '',
    mode: 'ironman',
    seed: 'followers',
    choice: 'along',
    roll: {
      root: 'true',
      elements: ['wood', 'fire'],
      body: 'farmhands-frame',
      soul: 'plain-mind',
      fate: 'ordinary-fate',
      origin: 'frontier-orphan',
    },
  } satisfies Creation);

const QC = (stage: number) => ({ realm: 'qi-condensation' as const, stage });
const FE = (stage: number) => ({ realm: 'foundation-establishment' as const, stage });
const CF = (stage: number) => ({ realm: 'core-formation' as const, stage });
const nature = (motives: Nature['motives'], axes: Nature['axes'] = {}): Nature => ({
  motives,
  axes,
  quirks: [],
  voice: { register: 'plain', habit: '', topic: '' },
});

type Init = Partial<Parameters<typeof plainActor>[0]>;
const you = (s: GameState, extra: Init = {}): Actor =>
  plainActor({ id: s.player.id, name: 'Han Li', side: YOU, ...extra });
const npc = (id: string, extra: Init = {}): Actor =>
  plainActor({ id, name: id, side: 'them', ...extra });
const at = (actors: Actor[], init: Partial<SceneInit> = {}) =>
  startScene({ place: 'test-place', actors, ...init });
const plan = (s: GameState, ...steps: ReturnType<typeof step>[]) =>
  PlanSchema.parse({ actor: s.player.id, steps });

const places = placeIndex(atlas.entries as unknown as PlaceEntry[]);
setPlaces(places);

/** The player marked by a power for a leaked chapter 1, before anything else happens. */
const withMarkFirst = (s: GameState, power: string, day: number): GameState => ({
  ...s,
  world: startMark(
    s.world,
    s.player.id,
    power,
    'method:butcher-saber',
    { realm: 'foundation-establishment', stage: 1 },
    day,
  ),
});

describe('bonds', () => {
  it('pay wages from a purse with no low, breaking a mid for change (E1)', () => {
    const s = life();
    const w = makeBond(
      s.world,
      { follower: 'guard', leader: s.player.id, kind: 'pay', wage: 30 },
      0,
    );
    const mid = { ...s.player, stones: 0, higherStones: { mid: 1, high: 0, top: 0 } };
    const st = followersDay({ ...withPlayer({ ...s, world: w }, mid), calendar: { day: 61 } });
    expect(st.player.stones).toBe(1040);
    expect(st.player.higherStones.mid).toBe(0);
    expect(bondOf(st.world, 'guard')!.paidTo).toBe(90);
  });

  it('pay wages each month from your stones, and the paid leave when you run dry', () => {
    const s = life();
    let w = makeBond(s.world, { follower: 'guard', leader: s.player.id, kind: 'pay', wage: 30 }, 0);
    let st = withPlayer({ ...s, world: w }, { ...s.player, stones: 70 });
    // Two months fall due by day 61: 60 stones paid, 10 left.
    st = followersDay({ ...st, calendar: { day: 61 } });
    expect(st.player.stones).toBe(10);
    expect(bondOf(st.world, 'guard')!.paidTo).toBe(90);
    // The third month can't be paid.
    st = followersDay({ ...st, calendar: { day: 90 } });
    expect(bondOf(st.world, 'guard')).toBeUndefined();
    expect(st.player.stones).toBe(10);
    w = st.world;
    expect(w.ties.some((t) => t.a === 'guard')).toBe(false);
  });

  it('hold loyalty above the floor Fidelity sets', () => {
    expect(
      [-2, -1, 0, 1, 2].map((f) => loyaltyFloor(nature([], { fidelity: f } as Nature['axes']))),
    ).toEqual([40, 25, 10, -10, -40]);
  });

  it('turn the treacherous: away, they betray you to the power that hates you most', () => {
    const s = life();
    const day = s.calendar.day;
    const rat = { name: 'Rat', nature: nature([], { fidelity: -2 }), power: null, home: null };
    let w: World = { ...s.world, kept: { rat } };
    w = makeBond(w, { follower: 'rat', leader: s.player.id, kind: 'loyalty' }, day);
    w = remember(w, { holder: 'rat', about: s.player.id, row: 'from-before', value: 45 }, day);
    // A robbery of yours the rat saw, and a killing that made the Gate hate you.
    const robbery = recordDeed(
      w,
      {
        kind: 'robbery',
        actor: s.player.id,
        victim: 'merchant',
        place: 'p',
        witnesses: [{ id: 'rat' }],
      },
      day,
    );
    w = recordDeed(
      robbery.world,
      {
        kind: 'killing',
        actor: s.player.id,
        victim: 'disciple',
        place: 'p',
        power: 'qm-tushou-men',
        witnesses: [{ id: 'watcher', power: 'qm-tushou-men' }],
      },
      day,
    ).world;
    expect(followersDay({ ...s, world: w }).world.bonds).toHaveLength(1);
    // Insulted, the fickle rat falls under his floor of +40, and turns.
    w = remember(w, { holder: 'rat', about: s.player.id, row: 'insulted' }, day);
    expect(treacherous(w, bondOf(w, 'rat')!, day)).toBe(true);
    const st = followersDay({ ...s, world: w });
    expect(bondOf(st.world, 'rat')).toBeUndefined();
    expect(st.chronicle.at(-1)!.data).toMatchObject({ name: 'Rat', why: 'turned' });
    // The Gate now knows who robbed the merchant, and you know he betrayed you.
    expect(knows(st.world, robbery.id, 'told:qm-tushou-men').who).toBe(true);
    expect(opinion(st.world, s.player.id, 'rat', day).lines.map((l) => l.memory.row)).toContain(
      'betrayed',
    );
    expect(karmaOf(st.world, 'rat')).toBe(-20);
  });

  it('turn in a scene: a fickle follower who comes to hate you attacks you', () => {
    const s = life();
    const day = s.calendar.day;
    const rat = { ...npc('rat', { realm: QC(5) }), nature: nature([], { fidelity: -2 }) };
    let w = makeBond(s.world, { follower: 'rat', leader: s.player.id, kind: 'loyalty' }, day);
    w = remember(w, { holder: 'rat', about: s.player.id, row: 'from-before', value: 45 }, day);
    const follower = { ...rat, side: YOU, follows: s.player.id };
    const sc = at([you(s, { realm: QC(5) }), follower]);
    // Trusting, he stays.
    expect(round({ ...s, world: w }, sc, {}).broke).toEqual([]);
    // Insulted, he falls under the fickle's floor of +40 and turns.
    w = remember(w, { holder: 'rat', about: s.player.id, row: 'insulted' }, day);
    const r = round({ ...s, world: w }, sc, {});
    expect(r.broke).toEqual([{ follower: 'rat', why: 'loyalty', how: 'turn' }]);
    const turned = r.scene.actors.find((x) => x.id === 'rat')!;
    expect(turned.side).toBe('rat');
    expect(turned.plan?.[0]).toMatchObject({ act: 'attack', target: s.player.id });
    // The betrayal is a deed you saw, and heaven counts it against him.
    expect(karmaOf(r.state.world, 'rat')).toBe(-20);
  });

  it('end a shared goal with "fought beside me" when the project is done', () => {
    const s = life();
    let w = addProject(s.world, {
      id: 'crew-job',
      name: 'the job',
      owner: s.player.id,
      size: 4,
      progress: 0,
      hidden: false,
      heat: 0,
      onFail: 'step',
      check: null,
    });
    w = makeBond(
      w,
      { follower: 'partner', leader: s.player.id, kind: 'goal', goal: 'crew-job' },
      0,
    );
    let st = followersDay({ ...s, world: w });
    expect(bondOf(st.world, 'partner')).toBeDefined();
    st = { ...st, world: addProject(st.world, { ...st.world.projects[0]!, progress: 4 }) };
    st = followersDay(st);
    expect(bondOf(st.world, 'partner')).toBeUndefined();
    expect(opinion(st.world, 'partner', s.player.id, st.calendar.day).lines[0]!.memory.row).toBe(
      'fought-beside',
    );
  });

  it("refuse orders: the paid aren't paid to die", () => {
    const s = life();
    let w = makeBond(s.world, { follower: 'guard', leader: s.player.id, kind: 'pay', wage: 30 }, 0);
    w = makeBond(w, { follower: 'brother', leader: s.player.id, kind: 'loyalty' }, 0);
    const guard = { ...npc('guard', { realm: QC(5) }), side: YOU, follows: s.player.id };
    const brother = { ...npc('brother', { realm: QC(5) }), side: YOU, follows: s.player.id };
    const strong = npc('strong', { realm: FE(1) });
    const order = [step('attack', { target: 'strong' })];
    const me = you(s, { realm: FE(2) });
    const paid = round({ ...s, world: w }, at([me, { ...guard, plan: order }, strong]), {});
    expect(paid.scene.log).toContain("guard refuses: they aren't paid to die.");
    expect(paid.results).toEqual([]);
    const loyal = round({ ...s, world: w }, at([me, { ...brother, plan: order }, strong]), {});
    expect(loyal.results.map((x) => [x.actor, x.step.act])).toEqual([['brother', 'attack']]);
  });

  it('are made by recruiting: a paid recruit needs the wage, a loyal one friendly trust', () => {
    const s = life();
    const sc = at([you(s, { realm: QC(5), stones: 10 }), npc('hand', { realm: QC(3) })]);
    expect(previewStep(s, sc, s.player.id, step('recruit', { target: 'hand' })).refused).toBe(
      "you can't pay their wage, 30 stones a month",
    );
    const loyal = doStep(s, sc, s.player.id, step('recruit', { target: 'hand', bond: 'loyalty' }));
    expect(loyal.result.check!.verdict).toBe('short');
    expect(bondOf(loyal.state.world, 'hand')).toBeUndefined();
  });
});

describe('karma', () => {
  it('moves with what is done, seen or not, and counts cruelty only to the weaker', () => {
    const s = life();
    const day = s.calendar.day;
    let w = recordDeed(
      s.world,
      { kind: 'theft', actor: 'x', victim: 'y', place: 'p', witnesses: [], weaker: true },
      day,
    ).world;
    expect(karmaOf(w, 'x')).toBe(-1);
    w = recordDeed(
      w,
      { kind: 'theft', actor: 'x', victim: 'z', place: 'p', witnesses: [] },
      day,
    ).world;
    expect(karmaOf(w, 'x')).toBe(-1);
    w = recordDeed(w, { kind: 'massacre', actor: 'x', place: 'p', witnesses: [] }, day).world;
    expect(karmaOf(w, 'x')).toBe(-51);
    // Nobody knows of any of it.
    expect(w.deeds.every((d) => Object.keys(d.knownBy).length === 0)).toBe(true);
  });

  it('counts finishing the fallen, and a life saved', () => {
    const s = life();
    const fallen = npc('fallen', { realm: QC(3), state: 'down' });
    const killed = doStep(
      s,
      at([you(s, { realm: QC(5) }), fallen]),
      s.player.id,
      step('finish', { target: 'fallen' }),
    );
    expect(karmaOf(killed.state.world, s.player.id)).toBe(-5);
    const saved = doStep(
      s,
      at([you(s, { realm: QC(5) }), fallen]),
      s.player.id,
      step('heal', { target: 'fallen' }),
    );
    expect(karmaOf(saved.state.world, s.player.id)).toBe(5);
    expect(saved.scene.actors[1]!.state).toBe('present');
    expect(
      opinion(saved.state.world, 'fallen', s.player.id, s.calendar.day).lines[0]!.memory.row,
    ).toBe('saved-life');
  });
});

describe('renown and infamy', () => {
  it('read their levels at 1, 2, 4, 7, 11, 16, 22, 29 and 37 points', () => {
    expect([0, 1, 2, 3, 4, 6, 7, 11, 16, 22, 29, 36, 37, 99].map(fameLevel)).toEqual([
      0, 1, 2, 2, 3, 3, 4, 5, 6, 7, 8, 8, 9, 9,
    ]);
  });

  it('land only when someone learns who, once per deed, and fade a point a season', () => {
    const s = life();
    const day = s.calendar.day;
    const r = recordDeed(
      s.world,
      {
        kind: 'kidnapping',
        actor: 'x',
        victim: 'y',
        place: 'p',
        witnesses: [],
        region: 'qm-bianhuang',
      },
      day,
    );
    expect(famePoints(r.world, 'x', 'qm-bianhuang', 'infamy', day)).toBe(0);
    let w = learn(r.world, r.id, { id: 'a' }, true, day);
    expect(famePoints(w, 'x', 'qm-bianhuang', 'infamy', day)).toBe(3);
    w = learn(w, r.id, { id: 'b' }, true, day);
    expect(famePoints(w, 'x', 'qm-bianhuang', 'infamy', day)).toBe(3);
    expect(famePoints(w, 'x', 'qm-bianhuang', 'infamy', day + 90)).toBe(2);
    expect(famePoints(w, 'x', 'qm-bianhuang', 'infamy', day + 270)).toBe(0);
  });

  it('turn killing an infamous name into renown', () => {
    const s = life();
    const day = s.calendar.day;
    let w = addFame(s.world, 'villain', 'qm-bianhuang', 'infamy', 4, day);
    w = recordDeed(
      w,
      { kind: 'killing', actor: 'hero', victim: 'villain', place: 'p', witnesses: [{ id: 'a' }] },
      day,
    ).world;
    expect(fameOf(w, 'hero', 'qm-bianhuang', 'renown', day)).toBe(2);
    expect(fameOf(w, 'hero', 'qm-bianhuang', 'infamy', day)).toBe(0);
  });

  it('back a threat with infamy, to anyone who knows your name, unless a disguise hides it', () => {
    const s = life();
    const day = s.calendar.day;
    const w = addFame(s.world, s.player.id, 'qm-bianhuang', 'infamy', 4, day);
    const target = npc('mark', { realm: QC(5) });
    expect(knowsName(w, 'mark', s.player.id, 'qm-bianhuang', day)).toBe(true);
    const me = you(s, { realm: QC(5) });
    const bare = presence(me, target).value;
    const sc = at([me, target]);
    const st = { ...s, world: w };
    const loud = previewStep(st, sc, s.player.id, step('threaten', { target: 'mark' })).check!;
    expect(loud.yours).toBeCloseTo(bare * 1.5);
    const veiled = at([{ ...me, disguised: true }, target]);
    expect(
      previewStep(st, veiled, s.player.id, step('threaten', { target: 'mark' })).check!.yours,
    ).toBeCloseTo(bare);
  });

  it('honor renown in a talk, ×1.25', () => {
    const s = life();
    const day = s.calendar.day;
    const sc = at([you(s), npc('listener')]);
    const plain = previewStep(s, sc, s.player.id, step('persuade', { target: 'listener' })).check!;
    const famous = { ...s, world: addFame(s.world, s.player.id, 'qm-bianhuang', 'renown', 4, day) };
    const known = previewStep(
      famous,
      sc,
      s.player.id,
      step('persuade', { target: 'listener' }),
    ).check!;
    expect(known.yours).toBeCloseTo(plain.yours * 1.25);
  });

  it('carry a win in front of people', () => {
    const s = life();
    const sc = at([
      you(s, { realm: FE(1) }),
      npc('rival', { realm: QC(3) }),
      npc('crowd', { side: 'crowd' }),
    ]);
    const r = doStep(s, sc, s.player.id, step('duel', { target: 'rival' }));
    expect(r.result.fight!.winner).toBe(YOU);
    expect(famePoints(r.state.world, s.player.id, 'qm-bianhuang', 'renown', s.calendar.day)).toBe(
      1,
    );
  });
});

describe('what an NPC knows and tells', () => {
  it('works out the tiers from home, power and trade', () => {
    const s = life();
    const k = knowledgeOf(s.world, places, 'old-sha');
    // The Night Bridge Society is a power, not a place: Old Sha knows the places round it and its
    // own as private.
    expect(k.common).toContain('place:qm-anbian-fu');
    expect(k.private.some((f) => f.startsWith('place:'))).toBe(true);
    expect(k.private).toContain('sites:village:qm-bianhuang');
    expect(regionOf(places, 'qm-yeqiao-hui')).toBe('qm-bianhuang');
    // Nothing tells twice.
    const all = [...k.common, ...k.private, ...k.secret];
    expect(new Set(all).size).toBe(all.length);
  });

  it('tells by trust: gregarious Old Sha two tiers at neutral, all at trusting, the common wary', () => {
    const s = life();
    const day = s.calendar.day;
    const k = knowledgeOf(s.world, places, 'old-sha');
    const neutral = telling(s.world, places, 'old-sha', s.player.id, day);
    expect(neutral).toMatchObject({ tiers: 2, lie: false });
    expect(neutral.facts).toEqual([...k.common, ...k.private]);
    const trusting = remember(
      s.world,
      { holder: 'old-sha', about: s.player.id, row: 'saved-life' },
      day,
    );
    expect(telling(trusting, places, 'old-sha', s.player.id, day).tiers).toBe(3);
    const wary = remember(
      s.world,
      { holder: 'old-sha', about: s.player.id, row: 'threatened' },
      day,
    );
    expect(telling(wary, places, 'old-sha', s.player.id, day)).toMatchObject({
      tiers: 1,
      lie: false,
    });
    const hostile = remember(
      s.world,
      { holder: 'old-sha', about: s.player.id, row: 'framed' },
      day,
    );
    expect(telling(hostile, places, 'old-sha', s.player.id, day).refused).toBe(true);
  });

  it('feigns knowing nothing when deceitful and wary, and a lie seen through is remembered', () => {
    const s = life();
    const day = s.calendar.day;
    const liar = nature([], { honesty: 2 });
    let w: World = {
      ...s.world,
      kept: { liar: { name: 'Liar', nature: liar, power: null, home: 'qm-yeqiao-hui' } },
    };
    w = remember(w, { holder: 'liar', about: s.player.id, row: 'threatened' }, day);
    const t = telling(w, places, 'liar', s.player.id, day);
    // No truth handed over marked false: a liar tells nothing until the world can write a lie.
    expect(t).toMatchObject({ lie: true, facts: [], refused: false });
    // A false thing heard from them, seen for yourself, catches them.
    const fact = 'place:qm-yeqiao-hui';
    w = hear(w, [fact], 'liar', day, false);
    expect(w.heard[0]).toMatchObject({ from: 'liar', true: false });
    w = see(w, fact, s.player.id, 'qm-yeqiao-hui', day);
    expect(w.known).toContain(fact);
    expect(w.heard.some((h) => h.fact === fact)).toBe(false);
    expect(opinion(w, s.player.id, 'liar', day).lines[0]!.memory.row).toBe('lied');
  });

  it('answers an ask in a scene: what you hear and what you learn', () => {
    const s = life();
    const r = runPlan(s, at([you(s), npc('old-sha')]), plan(s, step('ask', { target: 'old-sha' })));
    expect(r.results[0]!.check!.verdict).not.toBe('short');
    expect(r.state.world.heard.length).toBeGreaterThan(0);
    expect(r.state.world.heard.every((h) => h.from === 'old-sha' && h.true)).toBe(true);
  });

  it('carries a staged death: the hunter tells it and stops hunting, until he sees you alive', () => {
    const s = life();
    const dark = { id: 'ravine', name: 'a dark ravine', tags: [], favors: ['stealth' as const] };
    const world = addTie(s.world, { a: 'hunter', b: s.player.id, kind: 'enemy' });
    const st = { ...s, world };
    expect(grudges(world, s.player.id, s.calendar.day)).toEqual([{ who: 'hunter', how: 'hunt' }]);
    const r = runPlan(
      st,
      at(
        [
          you(s, { realm: QC(5), agility: 12, items: { corpse: 1, robes: 1 } }),
          npc('hunter', { realm: QC(7) }),
        ],
        {
          features: [dark],
        },
      ),
      plan(s, step('decoy', { uses: ['corpse', 'robes'] })),
    );
    expect(believesDead(r.state.world, 'hunter', s.player.id)).toBe(true);
    expect(grudges(r.state.world, s.player.id, s.calendar.day)).toEqual([]);
    // He meets you again, alive.
    const met = round(r.state, at([you(s, { realm: QC(5) }), npc('hunter', { realm: QC(7) })]), {});
    expect(believesDead(met.state.world, 'hunter', s.player.id)).toBe(false);
    expect(
      opinion(met.state.world, 'hunter', s.player.id, s.calendar.day).lines.map(
        (l) => l.memory.row,
      ),
    ).toContain('lied');
  });
});

describe('membership', () => {
  it('gives the token, standing as one of theirs, and the region map', () => {
    const s = life();
    const fx = [
      EffectSchema.parse({ do: 'member', who: s.player.id, power: 'qm-tushou-men', joins: true }),
    ];
    const r = applyEffects(s, null, fx);
    expect(isMember(r.state.world, s.player.id, 'qm-tushou-men')).toBe(true);
    expect(r.state.world.known).toEqual(
      expect.arrayContaining(['token:qm-tushou-men', 'map:qm-bianhuang']),
    );
    expect(standingOf(r.state.world, 'qm-tushou-men', s.player.id, s.calendar.day).total).toBe(10);
    const left = applyEffects(r.state, null, [
      EffectSchema.parse({ do: 'member', who: s.player.id, power: 'qm-tushou-men', joins: false }),
    ]);
    expect(isMember(left.state.world, s.player.id, 'qm-tushou-men')).toBe(false);
    expect(left.state.world.known).not.toContain('token:qm-tushou-men');
  });
});

describe('backers and traces', () => {
  const backer = { id: 'elder-li', name: 'Elder Li', realm: FE(3) };

  it('make their charge feel safe, and name themselves when threatened', () => {
    const s = life();
    const charge = npc('young-master', { realm: QC(5), backer });
    expect(composure(charge)).toBeCloseTo(realmSizeOf(charge) * 1.5);
    const far = { ...charge, backer: { ...backer, realm: CF(1) } };
    expect(composure(far)).toBeCloseTo(realmSizeOf(charge) * 2);
    const r = doStep(
      s,
      at([you(s, { realm: QC(9) }), charge]),
      s.player.id,
      step('threaten', { target: 'young-master' }),
    );
    expect(r.state.world.known).toContain('truth:backer:young-master');
  });

  it("send a projection when the charge's life is at stake, at a third of the backer", () => {
    const charge = npc('young-master', { realm: QC(5), backer });
    expect(projectionDue(charge)).toBe(false);
    expect(projectionDue({ ...charge, state: 'down' })).toBe(true);
    const p = projection(charge)!;
    expect(p).toMatchObject({ id: 'projection:elder-li', side: 'them' });
    expect(realmSizeOf(p)).toBeCloseTo(realmSizeOf(npc('x', { realm: FE(3) })) / 3);
  });

  it('mark the killer with a trace their power knows by sight, until a stronger soul erases it', () => {
    const s = life();
    const day = s.calendar.day;
    const SECT = 'clear-heaven';
    const disciple = npc('core-disciple', {
      realm: QC(6),
      power: SECT,
      talisman: CF(1),
      state: 'down',
    });
    const r = doStep(
      s,
      at([you(s, { realm: QC(9) }), disciple]),
      s.player.id,
      step('finish', { target: 'core-disciple' }),
    );
    const trace = traceFor(r.state.world, s.player.id, SECT, day)!;
    expect(trace.data).toMatchObject({ power: SECT, strength: CF(1) });
    expect(knows(r.state.world, r.result.deeds[0]!, `lamp:${SECT}`).who).toBe(true);
    // One of the sect's people sees your face and comes at you; a disguise hides it.
    const elder = npc('elder', { realm: FE(1), power: SECT, nature: nature([]) });
    const face = at([you(s, { realm: QC(9) }), elder]);
    expect(intentOf(r.state, face, elder)).toMatchObject({ why: 'trace', step: { act: 'attack' } });
    const masked = at([you(s, { realm: QC(9), disguised: true }), elder]);
    expect(intentOf(r.state, masked, elder)).toBeNull();
    // A leak's mark made first doesn't hide the killing's trace behind it.
    const leaked = withMarkFirst(s, SECT, day);
    const both = doStep(
      leaked,
      at([you(leaked, { realm: QC(9) }), disciple]),
      leaked.player.id,
      step('finish', { target: 'core-disciple' }),
    );
    expect(traceFor(both.state.world, s.player.id, SECT, day)!.data.method).toBeUndefined();
    // You don't know how to erase it; a Foundation soul knows how but is weaker than it; a
    // Core Formation soul above it burns it off.
    const self = at([you(s, { realm: QC(9) }), elder]);
    expect(
      previewStep(r.state, self, s.player.id, step('erase', { target: s.player.id })).refused,
    ).toBe("you don't know how to erase a trace");
    const weak = at([you(s, { realm: QC(9) }), npc('healer', { realm: FE(3) })]);
    const held = doStep(r.state, weak, 'healer', step('erase', { target: s.player.id }));
    expect(held.result.check!.verdict).toBe('short');
    expect(statesOf(held.state.world, s.player.id, 'trace', day)).toHaveLength(1);
    const strong = at([you(s, { realm: QC(9) }), npc('master', { realm: CF(3) })]);
    const erased = doStep(r.state, strong, 'master', step('erase', { target: s.player.id }));
    expect(erased.result.check!.verdict).toBe('clear');
    expect(statesOf(erased.state.world, s.player.id, 'trace', day)).toEqual([]);
    // With Severing the Trace and a soul above it, you erase your own.
    const skilled = at([you(s, { realm: CF(3), stats: { traceSevering: 1 } })]);
    expect(
      doStep(r.state, skilled, s.player.id, step('erase', { target: s.player.id })).result.check!
        .verdict,
    ).toBe('clear');
  });

  it('come with great-sect young masters one in five, carrying a trace as strong as the backer', () => {
    const t = { ...template('march-conscript'), pedigree: 'great-sect' as const };
    const npcs = Array.from({ length: 200 }, (_, i) =>
      generateCultivator(t as never, 'qi-condensation', 5, Rng.fromString(`ym-${i}`)),
    );
    const backed = npcs.filter((n) => n.backer);
    expect(backed.length).toBeGreaterThan(20);
    expect(backed.length).toBeLessThan(60);
    const a = actorFromNpc(backed[0]!);
    expect(a.backer!.realm).toEqual({ realm: 'core-formation', stage: 1 });
    expect(a.talisman).toEqual(CF(1));
  });
});

describe('the lucky rogue', () => {
  it('is one rogue in 50, its find at least gold, rolled apart from the rest', () => {
    const t = template('march-conscript');
    if (t.kind !== 'cultivator') throw new Error('a cultivator template');
    const npcs = Array.from({ length: 2000 }, (_, i) =>
      generateCultivator(t, 'qi-condensation', 5, Rng.fromString(`rogue-${i}`)),
    );
    const lucky = npcs.filter((n) => n.find);
    expect(lucky.length).toBeGreaterThan(20);
    expect(lucky.length).toBeLessThan(65);
    const rank = ['gray', 'white', 'green', 'blue', 'purple', 'gold', 'red', 'pristine'];
    for (const n of lucky) {
      const slot = n.find!.slot;
      const r = slot === 'method' ? n.rolls.method.qi : n.rolls[slot];
      expect(rank.indexOf(r)).toBeGreaterThanOrEqual(rank.indexOf('gold'));
    }
    // The luck draws on its own stream: the unlucky roll exactly what they rolled before it.
    const plain = npcs.find((n) => !n.find)!;
    expect(plain.name).toBe(
      generateCultivator(t, 'qi-condensation', 5, Rng.fromString(`rogue-${npcs.indexOf(plain)}`))
        .name,
    );
  });
});

describe('the v22 save', () => {
  it('carries a follower tie as a loyal bond, and starts karma, names, heard and members empty', () => {
    const s = life();
    const raw = JSON.parse(JSON.stringify(makeSave(s, 1))) as {
      version: number;
      state: { world: Record<string, unknown> };
    };
    const w = raw.state.world;
    for (const k of ['bonds', 'karma', 'fame', 'heard', 'members']) delete w[k];
    w.ties = [{ a: 'old-friend', b: s.player.id, kind: 'follower', known: [] }];
    raw.version = 21;
    const loaded = loadSave(raw).state.world;
    expect(loaded.bonds).toEqual([
      {
        follower: 'old-friend',
        leader: s.player.id,
        kind: 'loyalty',
        since: s.calendar.day,
        seen: s.calendar.day,
      },
    ]);
    expect({
      karma: loaded.karma,
      fame: loaded.fame,
      heard: loaded.heard,
      members: loaded.members,
    }).toEqual({
      karma: {},
      fame: {},
      heard: [],
      members: [],
    });
    expect(emptyWorld().bonds).toEqual([]);
  });
});
