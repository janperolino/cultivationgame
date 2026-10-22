// People (P3.4): memories and their fades, the weights of motives, leans, quirks and likes, people
// judging only what they know, ties and ripples, standing under heat, talk on real opinion, what
// NPCs do by their motives, natures rolled and learned, and the v21 migration.
import { describe, expect, it } from 'vitest';
import type { Nature } from '../../content/personality.ts';
import { createLife, type Creation } from '../creation.ts';
import { loadSave, makeSave } from '../save/format.ts';
import type { GameState } from '../state.ts';
import { plainActor, YOU, type Actor } from './actor.ts';
import { intentOf } from './intent.ts';
import { knownNature, likesOf, rollNature } from './nature.ts';
import {
  addTie,
  contest,
  memoryShare,
  opinion,
  payBloodPrice,
  remember,
  tieOf,
  tiesOf,
  trustWord,
  weightOf,
} from './opinion.ts';
import { step } from './plan.ts';
import { doStep, previewStep, round, startScene, type SceneInit } from './scene.ts';
import {
  addHeat,
  discover,
  emptyWorld,
  learn,
  recordDeed,
  standingOf,
  type World,
} from './world.ts';

const life = (): GameState =>
  createLife({
    name: 'Han Li',
    pronouns: 'they/them',
    look: '',
    mode: 'ironman',
    seed: 'people',
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
const nature = (
  motives: Nature['motives'],
  axes: Nature['axes'] = {},
  quirks: Nature['quirks'] = [],
): Nature => ({
  motives,
  axes,
  quirks,
  voice: { register: 'plain', habit: '', topic: '' },
});
/** A world that keeps these people with these natures. */
const keeping = (
  w: World,
  natures: Record<string, Nature>,
  power: string | null = null,
): World => ({
  ...w,
  kept: {
    ...w.kept,
    ...Object.fromEntries(
      Object.entries(natures).map(([id, n]) => [id, { name: id, nature: n, power, home: null }]),
    ),
  },
});
const npc = (id: string, extra: Partial<Parameters<typeof plainActor>[0]> = {}): Actor =>
  plainActor({ id, name: id, side: 'them', ...extra });
const you = (s: GameState, extra: Partial<Parameters<typeof plainActor>[0]> = {}): Actor =>
  plainActor({ id: s.player.id, name: 'Han Li', side: YOU, ...extra });
const scene = (actors: Actor[], init: Partial<SceneInit> = {}) =>
  startScene({ place: 'test-place', actors, ...init });

describe('memories', () => {
  it('fade in a straight line over their span, and never-fading ones hold', () => {
    const w = remember(emptyWorld(), { holder: 'a', about: 'b', row: 'threatened' }, 0);
    const m = w.memories[0]!;
    const plain = nature([]);
    expect(memoryShare(m, plain, 0)).toBe(1);
    expect(memoryShare(m, plain, 45)).toBeCloseTo(0.5);
    expect(memoryShare(m, plain, 90)).toBe(0);
    expect(opinion(w, 'a', 'b', 60).lines[0]!.fading).toBe(true);
    expect(opinion(w, 'a', 'b', 90).lines).toEqual([]);
    const saved = remember(emptyWorld(), { holder: 'a', about: 'b', row: 'saved-life' }, 0);
    expect(opinion(saved, 'a', 'b', 10_000).total).toBe(40);
  });

  it('stack to their cap, and other rows restart at full', () => {
    let w = emptyWorld();
    for (let i = 0; i < 8; i++) w = remember(w, { holder: 'a', about: 'b', row: 'paid-fairly' }, 0);
    expect(w.memories).toHaveLength(1);
    expect(opinion(w, 'a', 'b', 0).total).toBe(15);
    w = remember(emptyWorld(), { holder: 'a', about: 'b', row: 'threatened' }, 0);
    w = remember(w, { holder: 'a', about: 'b', row: 'threatened' }, 80);
    expect(opinion(w, 'a', 'b', 80).total).toBe(-20);
  });

  it('read as the trust words', () => {
    expect([-40, -39, -10, -9, 9, 10, 39, 40].map(trustWord)).toEqual([
      'hostile',
      'wary',
      'wary',
      'neutral',
      'neutral',
      'friendly',
      'friendly',
      'trusting',
    ]);
  });
});

describe('weights', () => {
  it('double a motive’s tags, and scale by the leans', () => {
    const insult = { row: 'insulted' as const };
    expect(weightOf(insult, nature([]))).toBe(1);
    expect(weightOf(insult, nature(['pride']))).toBe(2);
    expect(weightOf(insult, nature([], { temper: 2 }))).toBe(1.5);
    expect(weightOf(insult, nature([], { temper: 1 }))).toBe(1.25);
    expect(weightOf(insult, nature([], { temper: -2 }))).toBe(0.5);
    expect(weightOf({ row: 'paid-fairly' }, nature(['greed'], { hand: -2 }))).toBe(3);
  });

  it('count quirks and likes, and the righteous alone feel evil done to strangers', () => {
    expect(weightOf({ row: 'shared-drink' }, nature([], {}, ['drinker']))).toBe(3);
    const ferry: Nature = { ...nature(['greed']), trade: 'ferryman' };
    expect(likesOf(ferry)).toEqual(['wine', 'jade']);
    // A liked gift counts double; to the greedy a gift doubles again, held to ×3.
    const plainFerry: Nature = { ...nature([]), trade: 'ferryman' };
    expect(weightOf({ row: 'gift', like: 'wine' }, plainFerry)).toBe(2);
    expect(weightOf({ row: 'gift', like: 'jade' }, plainFerry)).toBe(1);
    expect(weightOf({ row: 'gift', like: 'wine' }, ferry)).toBe(3);
    expect(weightOf({ row: 'did-evil' }, nature([]))).toBe(0);
    expect(weightOf({ row: 'did-evil' }, nature([], { conscience: 1 }))).toBe(0.5);
    expect(weightOf({ row: 'did-evil' }, nature([], { conscience: 2 }))).toBe(1);
  });

  it('let the vengeful hold a grudge twice as long, and the forgiving half', () => {
    let w = remember(emptyWorld(), { holder: 'grudge', about: 'b', row: 'threatened' }, 0);
    w = remember(w, { holder: 'easy', about: 'b', row: 'threatened' }, 0);
    w = keeping(w, { grudge: nature([], { memory: 2 }), easy: nature([], { memory: -2 }) });
    expect(opinion(w, 'grudge', 'b', 120).total).toBeLessThan(0);
    expect(opinion(w, 'easy', 'b', 50).total).toBe(0);
  });
});

describe('people judge only what they know', () => {
  it('a theft nobody saw moves nothing until it is found out, and then lands hidden from you', () => {
    const s = life();
    const day = s.calendar.day;
    let w = recordDeed(
      s.world,
      {
        kind: 'theft',
        actor: 'player',
        victim: 'merchant',
        place: 'stall',
        evidence: ['technique:alley-wind-palm'],
        witnesses: [],
      },
      day,
    ).world;
    expect(opinion(w, 'merchant', 'player', day).lines).toEqual([]);
    w = discover(w, 'stall', { id: 'merchant', techniques: ['alley-wind-palm'] }, day + 3);
    const o = opinion(w, 'merchant', 'player', day + 3);
    expect(o.lines.map((l) => l.memory.row)).toEqual(['stole']);
    // You don't know they found out: as you read it, they still think nothing of you.
    const seen = opinion(w, 'merchant', 'player', day + 3, { viewer: 'player' });
    expect(seen.lines).toEqual([]);
    expect(seen.unknown).toBe(1);
  });

  it('a deed done in front of them lands, and you know it did', () => {
    const s = life();
    const day = s.calendar.day;
    const w = recordDeed(
      s.world,
      {
        kind: 'robbery',
        actor: 'player',
        victim: 'merchant',
        place: 'stall',
        witnesses: [{ id: 'merchant' }],
      },
      day,
    ).world;
    expect(opinion(w, 'merchant', 'player', day, { viewer: 'player' }).word).toBe('wary');
  });
});

describe('ties', () => {
  it('read from both ends, kin with its relation', () => {
    let w = addTie(emptyWorld(), { a: 'mo', b: 'ning', kind: 'master' });
    expect(tieOf(w, 'ning', 'mo')).toBe('master');
    expect(tieOf(w, 'mo', 'ning')).toBe('disciple');
    w = addTie(w, { a: 'wu', b: 'sha', kind: 'kin', relation: 'child' });
    expect(tiesOf(w, 'wu')).toEqual([
      expect.objectContaining({ other: 'sha', kind: 'kin', relation: 'parent' }),
    ]);
  });

  it('carry a killing one step: in full to kin, half to a friend, nothing further', () => {
    const s = life();
    const day = s.calendar.day;
    let w = addTie(s.world, { a: 'brother', b: 'victim', kind: 'kin', relation: 'sibling' });
    w = addTie(w, { a: 'friend', b: 'victim', kind: 'friend' });
    w = addTie(w, { a: 'cousin', b: 'brother', kind: 'kin', relation: 'cousin' });
    const id = recordDeed(
      w,
      { kind: 'killing', actor: 'player', victim: 'victim', place: 'road', witnesses: [] },
      day,
    );
    w = id.world;
    for (const who of ['brother', 'friend', 'cousin']) w = learn(w, id.id, { id: who }, true, day);
    expect(opinion(w, 'brother', 'player', day).total).toBe(-100);
    expect(opinion(w, 'friend', 'player', day).total).toBe(-50);
    // Not his kin, so the killing only reaches him through the blood feud his cousin swears.
    expect(opinion(w, 'cousin', 'player', day).lines.map((l) => l.memory.row)).toEqual([
      'blood-feud',
    ]);
    expect(tieOf(w, 'brother', 'player')).toBe('sworn-enemy');
  });

  it('are made by deeds: a life saved, a betrayal, a proud loser, a lover who falls', () => {
    let w = remember(emptyWorld(), { holder: 'a', about: 'me', row: 'saved-life' }, 0);
    expect(tieOf(w, 'a', 'me')).toBe('benefactor');
    w = remember(w, { holder: 'b', about: 'me', row: 'betrayed' }, 0);
    expect(tieOf(w, 'b', 'me')).toBe('enemy');
    w = keeping(w, { proud: nature(['pride']), humble: nature(['pride'], { pride: -1 }) });
    w = contest(w, 'me', 'proud', 0);
    w = contest(w, 'me', 'humble', 0);
    expect(tieOf(w, 'proud', 'me')).toBe('rival');
    expect(tieOf(w, 'humble', 'me')).toBeNull();
    w = addTie(w, { a: 'me', b: 'love', kind: 'lover' });
    w = remember(w, { holder: 'love', about: 'me', row: 'humiliated' }, 0);
    expect(tieOf(w, 'love', 'me')).toBe('former-lover');
  });
});

describe('standing', () => {
  it('lands when one of the power learns who did it to its own, and heat caps it', () => {
    const s = life();
    const day = s.calendar.day;
    let w = addTie(s.world, { a: 'x', b: 'y', kind: 'friend' });
    w = { ...w, standing: [] };
    w = recordDeed(
      w,
      {
        kind: 'assault',
        actor: 'player',
        victim: 'guard',
        place: 'gate',
        power: 'gate-sect',
        witnesses: [{ id: 'guard', power: 'gate-sect' }],
      },
      day,
    ).world;
    let st = standingOf(w, 'gate-sect', 'player', day);
    expect(st.lines.map((l) => l.memory.row)).toEqual(['attacked-ours']);
    expect(st.word).toBe('cold');
    // A mission for them would lift it, but the heat they feel holds it down.
    w = { ...w, standing: [...w.standing] };
    w = addHeat(w, 'gate-sect', 6, day);
    st = standingOf(w, 'gate-sect', 'player', day);
    // The attack's own heat (1) and six more.
    expect(st.cap).toEqual({ heat: 7, at: -30 });
    expect(st.word).toBe('hostile');
    expect(st.leverage).toBe(0.67);
    // As the heat cools, a point a month, the cap eases and then lifts.
    expect(standingOf(w, 'gate-sect', 'player', day + 120).cap).toEqual({ heat: 3, at: -10 });
    expect(standingOf(w, 'gate-sect', 'player', day + 240).cap).toBeNull();
  });

  it('forgets a killing that never fades only when the blood price is paid', () => {
    const s = life();
    const day = s.calendar.day;
    let w = recordDeed(
      s.world,
      {
        kind: 'killing',
        actor: 'player',
        victim: 'disciple',
        place: 'gate',
        power: 'gate-sect',
        witnesses: [{ id: 'elder', power: 'gate-sect' }],
      },
      day,
    ).world;
    expect(standingOf(w, 'gate-sect', 'player', day + 3000).sum).toBe(-30);
    w = payBloodPrice(w, 'gate-sect', 'player');
    expect(standingOf(w, 'gate-sect', 'player', day + 3000).sum).toBe(0);
  });
});

describe('talk on real opinion', () => {
  it('reads trust, a motive met and the leans that resist', () => {
    const s = life();
    const keeper = { ...npc('keeper'), nature: nature(['curiosity'], { hand: -2 }) };
    let st: GameState = s;
    const sc = scene([you(s), keeper], { kind: 'town' });
    const ask = step('bargain', { target: 'keeper' });
    // A stingy keeper: a bargain's resistance ×1.5 against a stranger's ×1.
    expect(previewStep(st, sc, s.player.id, ask).check!.verdict).toBe('short');
    st = {
      ...st,
      world: remember(
        st.world,
        { holder: 'keeper', about: s.player.id, row: 'saved-life' },
        s.calendar.day,
      ),
    };
    expect(previewStep(st, sc, s.player.id, ask).check!.verdict).toBe('clear');
    // A greedy keeper holds a motive against a bargain (×2, P3.9): short even trusting you.
    const greedy = { ...keeper, nature: nature(['greed'], { hand: -2 }) };
    const sc2 = scene([you(s), greedy], { kind: 'town' });
    expect(previewStep(st, sc2, s.player.id, ask).check!.verdict).toBe('short');
  });

  it('makes ties only at the trust each needs, and from where each needs', () => {
    const s = life();
    const day = s.calendar.day;
    const friend = npc('friend', { realm: QC(1) });
    let st = s;
    const sc = scene([you(s, { realm: FE(1) }), friend]);
    expect(
      doStep(st, sc, s.player.id, step('swear', { target: 'friend' })).result.check!.verdict,
    ).toBe('short');
    st = {
      ...st,
      world: remember(st.world, { holder: 'friend', about: s.player.id, row: 'saved-life' }, day),
    };
    const sworn = doStep(st, sc, s.player.id, step('swear', { target: 'friend' }));
    expect(tieOf(sworn.state.world, s.player.id, 'friend')).toBe('sworn-sibling');
    expect(previewStep(st, sc, s.player.id, step('oath', { target: 'friend' })).refused).toMatch(
      /only from lover/,
    );
    const peer = scene([you(s, { realm: QC(1) }), friend]);
    expect(
      previewStep(st, peer, s.player.id, step('take-disciple', { target: 'friend' })).refused,
    ).toBe('you need a realm above them');
  });
});

describe('what NPCs do by their motives', () => {
  it('flee, strike, loot and call the law, each on their strongest motive whose moment has come', () => {
    const s = life();
    const day = s.calendar.day;
    const big = you(s, { realm: FE(3) });
    const coward = { ...npc('coward', { realm: QC(3) }), nature: nature(['fear']) };
    expect(intentOf(s, scene([big, coward]), coward)!.step!.act).toBe('flee');
    const hater = { ...npc('hater', { realm: QC(9) }), nature: nature(['revenge']) };
    const hating = {
      ...s,
      world: remember(s.world, { holder: 'hater', about: s.player.id, row: 'betrayed' }, day),
    };
    const near = you(s, { realm: QC(8) });
    expect(intentOf(hating, scene([near, hater]), hater)!.step).toMatchObject({
      act: 'attack',
      target: s.player.id,
    });
    // Beyond them, revenge waits.
    const huge = you(s, { realm: { realm: 'core-formation', stage: 1 } });
    expect(intentOf(hating, scene([huge, hater]), hater)).toBeNull();
    const greedy = { ...npc('greedy'), nature: nature(['greed']) };
    const body = { ...npc('body', { stones: 10 }), state: 'dead' as const };
    expect(intentOf(s, scene([near, greedy, body]), greedy)!.step).toMatchObject({
      act: 'loot',
      target: 'body',
    });
    const watchman = { ...npc('watchman'), nature: nature(['duty']) };
    const deed = recordDeed(
      s.world,
      {
        kind: 'theft',
        actor: s.player.id,
        victim: 'body',
        place: 'test-place',
        witnesses: [{ id: 'watchman' }],
      },
      day,
    );
    expect(
      intentOf({ ...s, world: deed.world }, scene([near, watchman], { kind: 'town' }), watchman)!
        .law,
    ).toBe(true);
  });

  it('act on it in a round, and show you what moved them', () => {
    const s = life();
    const coward = { ...npc('coward', { realm: QC(3) }), nature: nature(['fear']) };
    const r = round(s, scene([you(s, { realm: FE(3) }), coward]), {});
    // They try to run, and you, far faster, catch them up.
    const ran = r.results.find((x) => x.actor === 'coward')!;
    expect(ran.step.act).toBe('flee');
    expect(ran.check!.verdict).toBe('short');
    expect(knownNature(r.state.world, 'coward', coward.nature).motives).toEqual(['fear']);
  });
});

describe('natures', () => {
  it('roll the same from the same seed: two or three leans, one to three motives, a voice', () => {
    expect(rollNature('bandit-7', { trade: 'bandit' })).toEqual(
      rollNature('bandit-7', { trade: 'bandit' }),
    );
    for (let i = 0; i < 200; i++) {
      const n = rollNature(`p${i}`, { trade: 'monk', path: 'soul' });
      expect(Object.keys(n.axes).length).toBeGreaterThanOrEqual(2);
      expect(Object.keys(n.axes).length).toBeLessThanOrEqual(3);
      expect(n.motives.length).toBeGreaterThanOrEqual(1);
      expect(n.motives.length).toBeLessThanOrEqual(3);
      expect(n.quirks.includes('amorous') && n.quirks.includes('chaste')).toBe(false);
      expect(n.voice.habit.length).toBeGreaterThan(0);
      expect(n.voice.topic).toBe('karma, and what it asks');
    }
  });

  it('lean by their trade', () => {
    let merciful = 0;
    let cruel = 0;
    for (let i = 0; i < 400; i++) {
      const h = rollNature(`monk-${i}`, { trade: 'monk' }).axes.heart ?? 0;
      if (h > 0) merciful++;
      if (h < 0) cruel++;
    }
    expect(merciful).toBeGreaterThan(cruel * 2);
  });

  it('show the outer leans at first meeting and the inner ones only when acted on', () => {
    const s = life();
    // Senior Zhao, met on testing day: his arrogance shows; his stinginess waits for a bargain.
    const zhao = knownNature(s.world, 'senior-zhao', {
      ...nature(['ambition', 'pride'], { pride: 2, hand: -1 }),
    });
    expect(zhao.words).toEqual(['arrogant']);
    expect(zhao.hidden).toBe(1);
    expect(zhao.unknownMotives).toBe(2);
  });
});

describe('the save', () => {
  it('moves v20 regard and bonds into memories and ties', () => {
    const s = life();
    const raw = JSON.parse(JSON.stringify(makeSave(s, 1))) as {
      version: number;
      state: {
        player: { people: Record<string, Record<string, unknown>> };
        world: Record<string, unknown>;
      };
    };
    raw.version = 20;
    raw.state.world = {
      ...raw.state.world,
      memories: [],
      ties: [],
      standing: [],
      kept: {},
      known: [],
    };
    delete (raw.state.world as Record<string, unknown>).memories;
    delete (raw.state.world as Record<string, unknown>).ties;
    raw.state.player.people['senior-zhao'] = {
      ...raw.state.player.people['senior-zhao'],
      bond: 'senior',
      regard: 2,
    };
    raw.state.player.people['clerk-fan'] = {
      ...raw.state.player.people['clerk-fan'],
      bond: 'acquaintance',
      regard: -1,
    };
    const loaded = loadSave(raw).state;
    expect(tieOf(loaded.world, 'player', 'senior-zhao')).toBe('senior');
    expect(tieOf(loaded.world, 'player', 'clerk-fan')).toBeNull();
    expect(opinion(loaded.world, 'senior-zhao', 'player', loaded.calendar.day).total).toBe(25);
    expect(opinion(loaded.world, 'clerk-fan', 'player', loaded.calendar.day).word).toBe('wary');
    expect(loaded.player.people['senior-zhao']).not.toHaveProperty('regard');
    expect(loaded.world.known).toContain('nature:senior-zhao:pride');
  });
});
