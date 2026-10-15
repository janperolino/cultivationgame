// The playbook (design § The resolver, The playbook): every case as plans fed straight to the core,
// as far as the resolver takes them. Each case says where it stops: the steps that need opinion
// and motives run on them since P3.4, followers' bonds, karma and what people tell since P3.4b,
// the Realm of Mingled Blood waits for P3.11, the city's formation for M4, and a fight played as a mode
// of the scene for P3.9.
import { describe, expect, it } from 'vitest';
import { createLife, type Creation } from '../creation.ts';
import { withPlayer, type GameState } from '../state.ts';
import { bondOf, followersDay } from './followers.ts';
import { believesDead } from './knows.ts';
import { karmaOf } from './names.ts';
import { plainActor, YOU, type Actor } from './actor.ts';
import { PlanSchema, step } from './plan.ts';
import { doStep, leaveScene, round, runPlan, startScene, type SceneInit } from './scene.ts';
import type { Nature } from '../../content/personality.ts';
import { revealNature } from './nature.ts';
import { opinion, remember, tieOf } from './opinion.ts';
import {
  addProject,
  heatOf,
  knows,
  learn,
  standingOf,
  statesOf,
  sweep,
  tell,
  type Project,
} from './world.ts';

/** A nature for a test's NPC: motives and leans, no quirks, a plain voice. */
const nature = (motives: Nature['motives'], axes: Nature['axes'] = {}): Nature => ({
  motives,
  axes,
  quirks: [],
  voice: { register: 'plain', habit: '', topic: '' },
});

const life = (): GameState =>
  createLife({
    name: 'Han Li',
    pronouns: 'they/them',
    look: '',
    mode: 'ironman',
    seed: 'playbook',
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

const GATE = 'qm-tushou-men';
const COURT = 'beast-court';

type Init = Partial<Parameters<typeof plainActor>[0]>;
const you = (s: GameState, extra: Init = {}): Actor =>
  plainActor({ id: s.player.id, name: 'Han Li', side: YOU, ...extra });
const npc = (id: string, extra: Init = {}): Actor =>
  plainActor({ id, name: id, side: 'them', ...extra });
const at = (place: string, actors: Actor[], init: Partial<SceneInit> = {}) =>
  startScene({ place, actors, ...init });
const plan = (s: GameState, ...steps: ReturnType<typeof step>[]) =>
  PlanSchema.parse({ actor: s.player.id, steps });

/** Someone you saved learns it: in this test, told by the scene that saw it. */
const learnSaved = (w: GameState['world'], holder: string, you: string, day: number) =>
  remember(w, { holder, about: you, row: 'saved-life', known: [you] }, day);

describe('the playbook', () => {
  it('hides your realm and joins the Beast-Butcher Gate as an untested orphan', () => {
    const s = life();
    const me = you(s, { realm: FE(1), stats: { concealment: 4 } });
    const deacon = npc('deacon', { realm: QC(9), power: GATE });
    const sc = at(GATE, [me, deacon], { kind: 'sect', power: GATE });
    // Veil to the lowest the concealment allows, then tell the deacon you're an orphan.
    let r = runPlan(
      s,
      sc,
      plan(
        s,
        step('veil', { shown: QC(1), as: 'an untested orphan' }),
        step('lie', { target: 'deacon' }),
      ),
    );
    expect(r.stopped).toBeNull();
    expect(r.scene.actors[0]!.shown).toEqual(QC(6));
    // The lie is believed: a people check, close at the deacon's neutral trust (nobody he knows of).
    expect(r.results.find((x) => x.step.act === 'lie')!.check!.verdict).toBe('close');
    expect(knows(r.state.world, r.results.at(-1)!.deeds[0]!, 'deacon').deed).toBe(false);
    // An inspection by a senior who can't read your soul believes the shown realm.
    const look = doStep(r.state, r.scene, 'deacon', step('read-realm', { target: s.player.id }));
    expect(look.result.read).toEqual({ kind: 'shown', realm: QC(6) });
    const cover = statesOf(look.state.world, s.player.id, 'cover', s.calendar.day)[0]!;
    expect(cover.data).toMatchObject({ fooled: ['deacon'] });
    // A Core Formation elder arrives on the sect's traffic, sees through it, and the cover blows.
    const elder = npc('elder', { realm: CF(1), power: GATE });
    r = runPlan(
      look.state,
      { ...look.scene, open: true, traffic: 'busy', table: [elder] },
      plan(s, step('wait')),
    );
    expect(r.stopped).toMatch(/cover is blown/);
    expect(heatOf(r.state.world, GATE, s.calendar.day)).toBe(1);
    // The deacon it fooled learns the lie: it lands as a memory, and he trusts you less.
    const lied = opinion(r.state.world, 'deacon', s.player.id, s.calendar.day);
    // The lie passed close, at the cost of pressing him; then he found it out.
    expect(lied.lines.map((l) => l.memory.row)).toEqual(['bad-turn', 'lied']);
    expect(lied.word).toBe('wary');
    // The Gate learns of the cover blown: a lie to the sect, held under the heat it raised.
    expect(standingOf(r.state.world, GATE, s.player.id, s.calendar.day).word).toBe('cold');
    // Stops here: spars as fights in the scene (P3.9) and a breakthrough under cover.
  });

  it("earns a half-blood's trust as a clock, toward the Realm of Mingled Blood", () => {
    const s = life();
    const trust: Project = {
      id: 'half-blood-trust',
      name: "a half-blood's trust",
      owner: s.player.id,
      size: 4,
      progress: 0,
      hidden: true,
      heat: 0,
      onFail: 'step',
      check: null,
    };
    let st: GameState = { ...s, world: addProject(s.world, trust) };
    let sc = at('qm-shoukou-cheng', [you(s), npc('half-blood', { realm: QC(4) })], {
      kind: 'city',
    });
    for (let i = 0; i < 4; i++) {
      const r = round(st, sc, { [s.player.id]: step('step', { target: 'half-blood-trust' }) });
      st = r.state;
      sc = r.scene;
    }
    expect(st.world.projects[0]!.progress).toBe(4);
    // The trust itself is opinion: fighting beside them, a liked gift, a life saved.
    const halfBlood = {
      ...npc('half-blood', { realm: QC(4) }),
      nature: nature(['greed'], { trust: -1 }),
    };
    sc = at('qm-shoukou-cheng', [you(s, { stones: 60 }), halfBlood], { kind: 'city' });
    const ask = step('persuade', { target: 'half-blood', offer: 'greed' });
    // Guarded at first: a stranger to be watched, and greed you don't know of.
    let before = runPlan(st, sc, plan(s, ask)).results[0]!.check!;
    expect(before.judged).toBe('close');
    const deeds = runPlan(
      st,
      sc,
      plan(s, step('gift', { target: 'half-blood', thing: 'stones', n: 30 })),
    );
    st = deeds.state;
    sc = deeds.scene;
    st = {
      ...st,
      world: learnSaved(st.world, 'half-blood', s.player.id, st.calendar.day),
    };
    const feels = opinion(st.world, 'half-blood', s.player.id, st.calendar.day);
    expect(feels.word).toBe('trusting');
    // Greed met (a stones gift counts double to the greedy): asked now, they take you in.
    before = runPlan(st, sc, plan(s, ask)).results[0]!.check!;
    expect(before.verdict).toBe('clear');
    // A life saved makes you their benefactor.
    expect(tieOf(st.world, 'half-blood', s.player.id)).toBe('benefactor');
    // Stops here: the realm and the betrayal inside it are P3.11's.
  });

  it('plants a hidden formation in a city node by node, the firing waiting for M4', () => {
    const s = life();
    const formation: Project = {
      id: 'blood-drain',
      name: 'a draining formation under the city',
      owner: s.player.id,
      size: 8,
      progress: 0,
      hidden: true,
      heat: 0,
      onFail: 'heat',
      check: { yours: 'stealth', faces: FE(1) },
    };
    const st: GameState = { ...s, world: addProject(s.world, formation) };
    const sc = at('qm-shoukou-cheng', [you(s, { realm: FE(2) })], { kind: 'city' });
    const clear = doStep(st, sc, s.player.id, step('step', { target: 'blood-drain' }));
    expect(clear.result.check!.verdict).toBe('clear');
    expect(clear.state.world.projects[0]!.progress).toBe(1);
    // A weaker hand fails its night and the project's own heat rises.
    const weak = doStep(
      st,
      at('qm-shoukou-cheng', [you(s, { realm: QC(5) })]),
      s.player.id,
      step('step', { target: 'blood-drain' }),
    );
    expect(weak.state.world.projects[0]).toMatchObject({ progress: 0, heat: 1 });
    expect(doStep(st, sc, s.player.id, step('plant')).result.refused).toBe('plant waits for M4');
  });

  it('frames a rival with a Beast Court token, then reports him', () => {
    const s = life();
    const courier = npc('courier', { realm: QC(1), items: { 'court-token': 1 }, power: COURT });
    const rival = npc('rival', { realm: QC(4), side: 'rival', power: GATE });
    const deacon = npc('deacon', { realm: QC(9), side: 'gate', power: GATE });
    let r = runPlan(
      s,
      at('qm-shoukou-cheng', [you(s, { realm: QC(6) }), courier]),
      plan(s, step('steal', { target: 'courier', thing: 'court-token' })),
    );
    expect(r.scene.actors[0]!.items['court-token']).toBe(1);
    // Nobody saw the theft.
    expect(Object.keys(r.state.world.deeds[0]!.knownBy)).toEqual([]);
    r = runPlan(
      r.state,
      at(GATE, [r.scene.actors[0]!, rival, deacon], { kind: 'sect', power: GATE }),
      plan(
        s,
        step('slip', { target: 'rival', thing: 'court-token' }),
        step('report', { target: 'deacon', about: 'rival' }),
      ),
    );
    expect(r.scene.actors.find((a) => a.id === 'rival')!.items['court-token']).toBe(1);
    expect(r.state.world.deeds.at(-1)!.kind).toBe('frame');
    expect(r.results.at(-1)!.check!.verdict).toBe('close');
    // The deacon believes it: the rival wronged the Gate, and you did him a service.
    const day = s.calendar.day;
    expect(opinion(r.state.world, 'deacon', 'rival', day).lines.map((l) => l.memory.row)).toEqual([
      'wronged-us',
    ]);
    // Believed close, at the cost of pressing him: the service and the pressing nearly cancel.
    expect(
      opinion(r.state.world, 'deacon', s.player.id, day).lines.map((l) => l.memory.row),
    ).toEqual(['bad-turn', 'service']);
    // The rival, vengeful, finds the frame out: never forgiven, and doubled by revenge, an enemy.
    const frame = r.state.world.deeds.at(-1)!;
    let world = { ...r.state.world, kept: { ...r.state.world.kept } };
    world.kept.rival = {
      name: 'rival',
      nature: nature(['revenge']),
      power: GATE,
      home: null,
    };
    world = learn(world, frame.id, { id: 'rival', power: GATE }, true, day);
    expect(opinion(world, 'rival', s.player.id, day).word).toBe('hostile');
    expect(tieOf(world, 'rival', s.player.id)).toBe('enemy');
    // He tells the deacon: the accusation was a lie, and the deacon holds it against you instead.
    world = tell(world, 'rival', { id: 'deacon', power: GATE }, day);
    const told = opinion(world, 'deacon', s.player.id, day);
    expect(told.lines.map((l) => l.memory.row).sort()).toEqual(['bad-turn', 'lied', 'service']);
    expect(opinion(world, 'deacon', 'rival', day).lines).toEqual([]);
  });

  it('sells one map to three crews and ambushes whoever reaches the cave first', () => {
    const s = life();
    const crews = ['crew-a', 'crew-b', 'crew-c'].map((id) =>
      npc(id, {
        realm: QC(2),
        side: id,
        stones: 30,
        plan: [step('pay', { target: s.player.id, n: 20 })],
      }),
    );
    const me = you(s, { realm: QC(7), items: { 'treasure-map': 3 } });
    let st = s;
    let sc = at('qm-shoukou-cheng', [me, ...crews], { kind: 'city' });
    for (const c of crews) {
      const r = round(st, sc, {
        [s.player.id]: step('sell', { target: c.id, thing: 'treasure-map' }),
      });
      st = r.state;
      sc = r.scene;
    }
    // Each crew paid you through the same resolver: symmetry.
    expect(st.player.stones).toBe(s.player.stones + 60);
    expect(sc.actors.filter((a) => a.items['treasure-map'] === 1)).toHaveLength(3);
    // At the cave, the first crew walks into you.
    const first = { ...sc.actors.find((a) => a.id === 'crew-a')!, plan: [] };
    const cave = at('karst-cave', [{ ...sc.actors[0]!, side: YOU }, first]);
    const r = runPlan(st, cave, plan(s, step('ambush', { target: 'crew-a' })));
    expect(r.results[0]!.check!.verdict).toBe('clear');
    expect(r.results[0]!.fight!.winner).toBe(YOU);
  });

  it("kidnaps the Spirit Herders' speaking stallion and ransoms it to the Beast Court", () => {
    const s = life();
    const stallion = npc('stallion', { realm: QC(6), power: 'qm-muling-guo' });
    const envoy = npc('envoy', { realm: FE(1), side: 'court', stones: 200, power: COURT });
    let r = runPlan(
      s,
      at('qm-muling-guo', [you(s, { realm: FE(1) }), stallion], { kind: 'wilds' }),
      plan(s, step('seize', { target: 'stallion' })),
    );
    expect(r.results[0]!.check!.verdict).toBe('clear');
    expect(statesOf(r.state.world, 'stallion', 'captive', s.calendar.day)[0]!.data).toMatchObject({
      by: s.player.id,
    });
    expect(r.state.world.people.stallion).toBe('captured');
    // The Court's envoy pays the ransom: an NPC's step through the same resolver.
    const meet = at(COURT, [
      r.scene.actors[0]!,
      { ...envoy, plan: [step('ransom', { target: s.player.id, n: 150 })] },
    ]);
    r = runPlan(r.state, meet, plan(s, step('wait')));
    expect(r.state.player.stones).toBe(s.player.stones + 150);
    // Nobody saw the seizing, so the herders hold nothing against you, until one of theirs learns.
    const herders = 'qm-muling-guo';
    const day = s.calendar.day;
    expect(standingOf(r.state.world, herders, s.player.id, day).word).toBe('unknown');
    const seized = r.state.world.deeds.find((d) => d.kind === 'kidnapping')!;
    const world = learn(r.state.world, seized.id, { id: 'herder', power: herders }, true, day);
    const st = standingOf(world, herders, s.player.id, day);
    expect(st.lines.map((l) => l.memory.row)).toEqual(['captive-ours']);
    expect(st.word).toBe('hostile');
    // Stops here: the Court's own view waits for its people to learn it.
  });

  it('fakes your death with a corpse in your robes to shake a hunter', () => {
    const s = life();
    const hunter = npc('hunter', { realm: QC(7) });
    const dark = { id: 'ravine', name: 'a dark ravine', tags: [], favors: ['stealth' as const] };
    const r = runPlan(
      s,
      at(
        'qm-duigu-qiang',
        [you(s, { realm: QC(5), agility: 12, items: { corpse: 1, robes: 1 } }), hunter],
        {
          features: [dark],
        },
      ),
      plan(s, step('decoy', { uses: ['corpse', 'robes'] })),
    );
    const check = r.results[0]!.check!;
    // Your stealth with two things used and the dark against his perception, no roll.
    expect(check.verdict).not.toBe('short');
    expect(r.scene.actors[0]!.items.corpse).toBe(0);
    // He believes you dead, and tells whoever he meets.
    expect(believesDead(r.state.world, 'hunter', s.player.id)).toBe(true);
    const told = tell(r.state.world, 'hunter', { id: 'his-employer' }, s.calendar.day);
    expect(believesDead(told, 'his-employer', s.player.id)).toBe(true);
  });

  it("loots the Wall's dead after a beast tide, posing as a corpse collector", () => {
    const s = life();
    const fallen = npc('fallen', {
      realm: QC(3),
      state: 'down',
      stones: 12,
      items: { 'spring-returning-pill': 1 },
    });
    const sergeant = npc('sergeant', { realm: QC(8), side: 'wall', knows: [s.player.id] });
    let r = runPlan(
      s,
      at('qm-duigu-qiang', [you(s, { realm: QC(6), agility: 14 }), fallen]),
      plan(s, step('disguise', { as: 'a corpse collector' }), step('loot', { target: 'fallen' })),
    );
    expect(r.stopped).toBeNull();
    expect(r.state.player.stones).toBe(s.player.stones + 12);
    expect(r.state.player.items['spring-returning-pill']).toBe(1);
    // A sergeant who knows your face comes by: perception against your stealth, and he knows you.
    r = runPlan(
      r.state,
      { ...r.scene, open: true, traffic: 'busy', table: [sergeant] },
      plan(s, step('wait')),
    );
    expect(r.stopped).toMatch(/recognizes/);
    expect(statesOf(r.state.world, s.player.id, 'disguise', s.calendar.day)).toEqual([]);
  });

  it("steals your own sect's Foundation Pill the night before the tournament", () => {
    const s = life();
    const vault = { id: 'vault', name: 'the pill vault', tags: [], realm: FE(1) };
    const night = { id: 'night', name: 'a moonless night', tags: [], favors: ['stealth' as const] };
    const me = you(s, { realm: QC(9), agility: 12 });
    const brother = plainActor({ id: 'brother', name: 'a sworn brother', side: YOU, realm: QC(9) });
    const r = runPlan(
      s,
      at(GATE, [me, brother], {
        kind: 'sect',
        power: GATE,
        danger: FE(1),
        features: [vault, night],
      }),
      plan(s, step('burgle', { target: 'vault', thing: 'foundation-pill', helpers: ['brother'] })),
    );
    expect(r.results[0]!.check!.verdict).not.toBe('short');
    expect(r.state.player.items['foundation-pill']).toBe(1);
    // Nobody saw. Then the elder sweeps the vault with divine sense and knows who.
    const id = r.results[0]!.deeds[0]!;
    expect(heatOf(r.state.world, GATE, s.calendar.day)).toBe(0);
    const swept = sweep(
      r.state.world,
      GATE,
      { id: 'elder', power: GATE },
      s.calendar.day,
      s.calendar.day,
    );
    expect(knows(swept, id, 'elder').who).toBe(true);
    expect(heatOf(swept, GATE, s.calendar.day)).toBe(1);
  });

  it('gathers a crew by pay, loyalty and fear, and coerces a village into hiding you', () => {
    const s = life();
    const sword = { ...npc('sword', { realm: QC(5) }), nature: nature(['greed']) };
    const thug = npc('thug', { realm: QC(3), side: 'thug' });
    const crewScene = () =>
      at('qm-shoukou-cheng', [you(s, { realm: FE(1), stones: 50, weapon: 'plain' }), sword, thug], {
        kind: 'city',
      });
    // Not knowing the sword is greedy, you judge the offer close; it goes clear, a surprise.
    const recruit = step('recruit', { target: 'sword', offer: 'greed' });
    const blind = runPlan(s, crewScene(), plan(s, recruit));
    expect(blind.results[0]!.check!.judged).toBe('close');
    expect(blind.results[0]!.surprise).toMatch(/clear, not close/);
    // Knowing it, the plan runs through.
    // An old friend from the caves follows out of loyalty.
    const friend = { ...npc('friend', { realm: QC(4) }), nature: nature([], { fidelity: 1 }) };
    let world = revealNature(s.world, 'sword', ['motive:greed']);
    world = remember(
      world,
      { holder: 'friend', about: s.player.id, row: 'from-before', value: 25, known: [s.player.id] },
      0,
    );
    const knowing = { ...s, world };
    // Out on the road, where no garrison answers a threat.
    const scene = () =>
      at('a-road', [you(s, { realm: FE(1), stones: 50, weapon: 'plain' }), sword, friend, thug]);
    const r = runPlan(
      knowing,
      scene(),
      plan(
        s,
        step('recruit', { target: 'sword', offer: 'greed', bond: 'pay' }),
        step('recruit', { target: 'friend', bond: 'loyalty' }),
        step('recruit', { target: 'thug', bond: 'fear', show: ['weapon'] }),
      ),
    );
    expect(r.stopped).toBeNull();
    expect(r.results.filter((x) => x.actor === s.player.id).map((x) => x.check!.verdict)).toEqual([
      'clear',
      'clear',
      'clear',
    ]);
    // The sword took a month's wage at Qi Condensation up front.
    expect(bondOf(r.state.world, 'sword')).toMatchObject({ kind: 'pay', wage: 30 });
    expect(r.scene.actors[0]!.stones).toBe(20);
    expect(bondOf(r.state.world, 'friend')!.kind).toBe('loyalty');
    expect(bondOf(r.state.world, 'thug')!.kind).toBe('fear');
    expect(tieOf(r.state.world, s.player.id, 'thug')).toBe('follower');
    // The thug obeys while hating you, and heaven counts the cruelty to someone weaker.
    expect(opinion(r.state.world, 'thug', s.player.id, s.calendar.day).word).toBe('wary');
    expect(karmaOf(r.state.world, s.player.id)).toBe(-1);
    // With three followers at your back, the headman bends and hides you.
    const headman = npc('headman', { realm: QC(4), side: 'village' });
    const crew = r.scene.actors.filter((x) => x.follows === s.player.id);
    expect(crew).toHaveLength(3);
    const village = runPlan(
      r.state,
      at('a-village', [you(s, { realm: FE(1) }), ...crew, headman], { kind: 'village' }),
      plan(s, step('threaten', { target: 'headman' })),
    );
    expect(village.results.find((x) => x.actor === s.player.id)!.check!.verdict).toBe('clear');

    // Each bond breaks as written. Down in a fight, you look weak: the afraid thug's bond breaks
    // in the scene, and, not being reckless or vengeful, he runs.
    const down = { ...you(s, { realm: FE(1) }), state: 'down' as const };
    const thugNow = { ...crew.find((x) => x.id === 'thug')!, nature: nature([]) };
    const fall = round(village.state, at('a-road', [down, thugNow]), {});
    expect(fall.broke).toEqual([{ follower: 'thug', why: 'fear', how: 'leave' }]);
    expect(fall.scene.actors.find((x) => x.id === 'thug')!.state).toBe('gone');
    // A month on, with 20 stones against a wage of 30, the pay stops and the sword leaves; the
    // thug, a week and more out of your reach, slips away as well.
    const month = { ...village.state, calendar: { day: s.calendar.day + 31 } };
    const later = followersDay(withPlayer(month, { ...month.player, stones: 20 }));
    expect(bondOf(later.world, 'sword')).toBeUndefined();
    expect(bondOf(later.world, 'thug')).toBeUndefined();
    expect(later.chronicle.slice(-2).map((e) => e.data)).toEqual([
      { name: 'sword', why: 'unpaid' },
      { name: 'thug', why: 'fear' },
    ]);
    // The friend stays through the month; humiliated in public, their opinion falls under the
    // floor their Fidelity sets, and they leave.
    expect(bondOf(later.world, 'friend')!.kind).toBe('loyalty');
    const hurt = remember(
      later.world,
      { holder: 'friend', about: s.player.id, row: 'humiliated' },
      later.calendar.day,
    );
    expect(bondOf(followersDay({ ...later, world: hurt }).world, 'friend')).toBeUndefined();
  });

  it("draws strangers with a fight's noise, and your backup arrives", () => {
    const s = life();
    const backup = plainActor({
      id: 'backup',
      name: 'your sworn brother',
      side: YOU,
      realm: QC(6),
    });
    const sc = at('a-road', [you(s, { realm: QC(6) }), npc('bandit', { realm: QC(2) })], {
      traffic: 'road',
      table: [backup],
    });
    let r = runPlan(s, sc, plan(s, step('attack', { target: 'bandit' })));
    expect(r.scene.due).toBe(6);
    r = runPlan(r.state, r.scene, plan(s, step('wait')));
    expect(r.stopped).toBe('1 arrive');
    expect(r.scene.actors.some((a) => a.id === 'backup')).toBe(true);
    // Stops here: arriving mid-fight and a trap firing need the fight as a mode of the scene (P3.9).
  });

  it('runs a stall, chats with customers, and walks away', () => {
    const s = life();
    const customers = ['aunt', 'porter', 'scholar'].map((id) =>
      npc(id, { realm: QC(1), stones: 5 }),
    );
    let sc = at('qm-shoukou-cheng', [you(s, { items: { 'spring-returning-pill': 2 } })], {
      kind: 'city',
      open: true,
      traffic: 'busy',
      table: customers,
    });
    let st = s;
    const r1 = round(st, sc, { [s.player.id]: step('wait') });
    expect(r1.arrivals).toHaveLength(1);
    const who = r1.arrivals[0]!;
    const r2 = runPlan(
      r1.state,
      r1.scene,
      plan(
        s,
        step('ask', { target: who }),
        step('sell', { target: who, thing: 'spring-returning-pill' }),
      ),
    );
    expect(r2.results[0]!.check!.verdict).toBe('close');
    st = r2.state;
    sc = r2.scene;
    const left = round(st, sc, { [s.player.id]: step('leave') });
    expect(left.scene.actors[0]!.state).toBe('gone');
    const after = leaveScene(left.state, left.scene);
    expect(after.calendar.day).toBeGreaterThan(s.calendar.day);
  });
});
