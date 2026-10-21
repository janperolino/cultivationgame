// Fights you play (design § Combat; § The world, The Combat screen leaves the rail): a road
// encounter's fight and a card's that aren't a sure win are played on the stage and handed back,
// a sure win resolves on its own or is played, Bold goes into a fight while you're there, the clock
// holds while a fight runs, a reload replays it, the scene takes a fight's end through the same
// after-fight, spars are asked of people, a threat ends a hurt person's fight, the v46 save, and
// the wheel's Duty bug.
import { describe, expect, it } from 'vitest';
import { job } from '../content/jobs.ts';
import { card } from '../content/cards/index.ts';
import { combatant } from './combat/combatant.ts';
import { combatantIn, resolveTurn, startFight, type Fight } from './combat/fight.ts';
import { runFight } from './combat/profile.ts';
import { cardEdge, resolveCard } from './cards.ts';
import { createLife, type Creation } from './creation.ts';
import { advance } from './loop.ts';
import { cultivate } from './life.ts';
import {
  contact,
  chooseExit,
  exitViews,
  meet,
  playExit,
  settlePlayed,
} from './map/encounters.ts';
import type { Encounter } from './map/schema.ts';
import { ensureMap } from './map/travel.ts';
import { joinPower } from './organizations.ts';
import { fightEnd, playTurn, replay, type FightEnd } from './played.ts';
import { askSpar, currentFight, finishFight, fightStart } from './playFight.ts';
import { endSceneFight, sceneFight } from './resolver/scene.ts';
import { Rng } from './rng.ts';
import { loadSave, makeSave } from './save/format.ts';
import { groundPartners, sparWhy } from './spar.ts';
import { newLife, PLAYER_ID, withPlayer, type GameState } from './state.ts';
import { canSetHour, dutyAt, effectiveWheel, hourKindOpen, setHours } from './wheel.ts';
import { jobsDay } from './jobs.ts';

const life = (seed = 'fights'): GameState =>
  ensureMap(newLife({ name: 'Han Li', seed, origin: { id: 'conscript', choice: 'along' } }));

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

const foundation = (s: GameState): GameState =>
  withPlayer(s, {
    ...s.player,
    qi: { ...s.player.qi, realm: 'foundation-establishment', stage: 1 },
    body: { ...s.player.body, stage: 9 },
  });

const enc = (template: string, band: number): Encounter => ({
  id: 'e-test',
  template,
  seed: 7,
  band,
  at: [0, 0],
  meetAt: null,
  state: 'waiting',
  how: 'seen',
  tried: [],
  day: 0,
  where: 'the Howling Downs',
});

const withEnc = (s: GameState, e: Encounter): GameState => ({
  ...s,
  map: {
    ...s.map!,
    encounters: [...s.map!.encounters, { ...e, at: [s.map!.at[0], s.map!.at[1]] }],
  },
});

/** Strikes the first foe standing until the fight ends; the state and the fight at its end. */
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

/** The first hunt, band and layer whose fight Bold reads clear or close but isn't sure of. */
function unsureHunt(): GameState {
  for (const t of ['cave-bats', 'tide-crabs', 'ridge-wolves'])
    for (let stage = 1; stage <= 9; stage++)
      for (let band = 0; band <= 2; band++) {
        const w = withEnc(atLayer(life(), stage), enc(t, band));
        const v = exitViews(w, meet(w, w.map!.encounters[0]!))[0]!;
        if ((v.judged === 'clear' || v.judged === 'close') && !v.sure) return w;
      }
  throw new Error('no unsure hunt');
}

describe('a road fight you play', () => {
  it('opens on the stage, holds the clock, replays on a reload and hands its end to the card', () => {
    const w = withEnc(atLayer(life(), 3), enc('ridge-wolves', 1));
    const v = exitViews(w, meet(w, w.map!.encounters[0]!))[0]!;
    expect(v.exit.road).toBe('fight');
    expect(v.sure).toBe(false);
    const open = playExit(w, 'e-test', 0)!;
    expect(open.fight?.from).toEqual({ kind: 'road', enc: 'e-test', exit: 0 });
    expect(open.map!.encounters[0]!.state).toBe('waiting');
    // The clock holds while the fight runs.
    const held = advance(open, 60_000, { step: cultivate });
    expect(held.days).toBe(0);
    expect(held.state.calendar.day).toBe(open.calendar.day);
    // A second fight can't open over it.
    expect(playExit(open, 'e-test', 0)).toBeNull();
    const { s, f } = fightOut(open, fightStart(open, open.fight!.from)!);
    // A reload replays the actions to the same fight.
    expect(currentFight(s)!.combatants.map((c) => [c.hp, c.state])).toEqual(
      f.combatants.map((c) => [c.hp, c.state]),
    );
    expect(replay(s, fightStart(s, s.fight!.from)!).turn).toBe(f.turn);
    const r = finishFight(s, f)!;
    expect(r.state.fight).toBeNull();
    expect(r.state.map!.encounters).toHaveLength(0);
    expect(r.state.chronicle.at(-1)!.type).toBe('encounter');
    expect(r.text.length).toBeGreaterThan(0);
  });

  it('hands back each end: won with its loot, fled away, fallen hurt, talked down without kit', () => {
    const w = withEnc(atLayer(life(), 3), enc('ridge-wolves', 1));
    const f = fightStart(playExit(w, 'e-test', 0)!, { kind: 'road', enc: 'e-test', exit: 0 })!;
    const end = (e: FightEnd) => settlePlayed(w, 'e-test', 0, e, f)!;
    const won = end('won');
    expect(Object.keys(won.state.player.items).some((id) => id.startsWith('beast-hide'))).toBe(true);
    const fled = end('fled');
    expect(fled.text).toMatch(/break away/);
    expect(fled.state.map!.encounters).toHaveLength(0);
    expect(Object.keys(fled.state.player.items).some((id) => id.startsWith('beast-hide'))).toBe(
      false,
    );
    const lost = end('lost');
    expect(lost.verdict).toBe('short');
    expect(lost.state.world.states.some((x) => x.data.kind === 'wound')).toBe(true);
    // A fight that took most of your HP comes home as the short wound, even won.
    const me = f.combatants.find((c) => c.id === PLAYER_ID)!;
    const battered = { ...f, combatants: f.combatants.map((c) => (c === me ? { ...c, hp: 1 } : c)) };
    const hurt = settlePlayed(w, 'e-test', 0, 'won', battered)!;
    expect(hurt.state.world.states.some((x) => x.data.kind === 'wound')).toBe(true);
    // Robbers you yield to rob you; talked down, they walk off with their kit.
    const rich = withPlayer(w, { ...w.player, stones: 40 });
    const robbers = withEnc(
      { ...rich, map: { ...rich.map!, encounters: [] } },
      enc('pine-deserters', 1),
    );
    const rf = fightStart(playExit(robbers, 'e-test', 0)!, { kind: 'road', enc: 'e-test', exit: 0 })!;
    expect(settlePlayed(robbers, 'e-test', 0, 'yielded', rf)!.state.player.stones).toBe(20);
    const talked = settlePlayed(robbers, 'e-test', 0, 'talked', rf)!;
    expect(talked.state.player.stones).toBe(40);
  });

  it('lets a sure win resolve on its own, or be played', () => {
    const w = withEnc(foundation(atLayer(life(), 9)), enc('ridge-wolves', 0));
    const v = exitViews(w, meet(w, w.map!.encounters[0]!))[0]!;
    expect(v.sure).toBe(true);
    expect(chooseExit(w, 'e-test', 0)!.state.map!.encounters).toHaveLength(0);
    expect(contact(w, 'e-test', true).map!.encounters).toHaveLength(0);
    expect(playExit(w, 'e-test', 0)!.fight).not.toBeNull();
  });

  it('Bold goes into a fight it isn’t sure of while you’re there; away it settles by the verdict', () => {
    const w0 = unsureHunt();
    const w = { ...w0, map: { ...w0.map!, stance: 'bold' as const } };
    const there = contact(w, 'e-test', true);
    expect(there.fight?.from.kind).toBe('road');
    const away = contact(w, 'e-test', false);
    expect(away.fight).toBeNull();
    expect(away.map!.encounters).toHaveLength(0);
    // Careful, there, waits for you rather than settle a fight it isn't sure of.
    const careful = contact({ ...w, map: { ...w.map!, stance: 'careful' } }, 'e-test', true);
    expect(careful.fight).toBeNull();
    expect(careful.map!.encounters[0]!.state).toBe('waiting');
  });
});

describe('a card’s fight', () => {
  const withCard = (s: GameState): GameState => ({
    ...s,
    cards: { ...s.cards, pending: [{ uid: 1, card: 'beast-sniffing', day: s.calendar.day }] },
  });
  const DRIVE = card('beast-sniffing').choices.findIndex((c) => c.fight);

  it('is written as a foe from the roster, and played when it isn’t sure', () => {
    const s = withCard(atLayer(life(), 2));
    expect(DRIVE).toBeGreaterThanOrEqual(0);
    const e = cardEdge(s, 1, DRIVE)!;
    expect(e.sure).toBe(false);
    const r = resolveCard(s, 1, DRIVE);
    expect(r).toMatchObject({ ok: true, done: false, fight: true });
    expect(r.state.cards.pending).toHaveLength(1);
    const { s: after, f } = fightOut(r.state, currentFight(r.state)!);
    const done = finishFight(after, f)!;
    expect(done.state.cards.pending).toHaveLength(0);
    expect(done.state.chronicle.at(-1)!.type).toBe('card');
    const k = card('beast-sniffing').choices[DRIVE]!;
    expect(done.text).toBe(done.end === 'won' ? k.pass.text : k.fail!.text);
  });

  it('takes its outcome from the fight’s end, or from its edge without you', () => {
    const s = withCard(atLayer(life(), 2));
    const k = card('beast-sniffing').choices[DRIVE]!;
    expect(resolveCard(s, 1, DRIVE, { played: 'won' }).text).toBe(k.pass.text);
    expect(resolveCard(s, 1, DRIVE, { played: 'lost' }).text).toBe(k.fail!.text);
    // No fled outcome written: a flight reads as the fall.
    expect(resolveCard(s, 1, DRIVE, { played: 'fled' }).text).toBe(k.fail!.text);
    const byDefault = resolveCard(s, 1, DRIVE, { byDefault: true });
    expect(byDefault.ok && byDefault.done).toBe(true);
    expect(byDefault.state.fight).toBeNull();
    expect(byDefault.check?.verdict).toBe(cardEdge(s, 1, DRIVE)!.edge.verdict);
  });
});

describe('the scene takes a fight’s end', () => {
  it('through the same after-fight, however it was fought', () => {
    const w = withEnc(atLayer(life(), 3), enc('ridge-wolves', 1));
    const m = meet(w, w.map!.encounters[0]!);
    const wolf = m.actors[0]!;
    const start = sceneFight(m.scene, m.you.id, wolf.id)!;
    expect(start.combatants.map((c) => c.id)).toContain(wolf.id);
    const r = runFight(start, new Rng(3));
    const back = endSceneFight(w, m.scene, start, r.fight, r.used);
    for (const c of r.fight.combatants) {
      const a = back.scene.actors.find((x) => x.id === c.id)!;
      expect(a.combatant?.hp).toBe(c.hp);
      if (c.state === 'down') expect(a.state).toBe('down');
    }
    expect(back.scene.log.at(-1)).toMatch(/The fight ends after/);
  });
});

describe('spars, asked of people', () => {
  const GATE = 'qm-tushou-men';
  const member = (s: GameState) => {
    const r = joinPower(s.world, PLAYER_ID, GATE, s.calendar.day, { you: true });
    if (!r.ok) throw new Error(r.why);
    return { ...s, world: r.world };
  };
  const inside = (s: GameState, place: string | null): GameState => ({
    ...s,
    map: { ...s.map!, inside: place, course: null },
  });

  it('at your power’s training ground: a senior, a fellow disciple and a junior, once a day', () => {
    const s = inside(member(atLayer(life(), 5)), GATE);
    const ps = groundPartners(s, GATE);
    expect(ps.map((p) => p.stage)).toEqual([7, 5, 3]);
    expect(groundPartners(s, GATE)).toEqual(ps);
    expect(sparWhy(inside(s, null), ps[0]!.who)).toMatch(/at their seat/);
    expect(sparWhy(atLayer(life(), 5), ps[0]!.who)).toMatch(/one of theirs/);
    const open = askSpar(s, ps[1]!.who);
    if (typeof open === 'string') throw new Error(open);
    const { s: after, f } = fightOut(open, currentFight(open)!);
    const done = finishFight(after, f)!;
    expect(done.state.chronicle.at(-1)).toMatchObject({ type: 'spar' });
    expect(done.state.chronicle.at(-1)!.data.who).toBe(ps[1]!.who);
    expect(sparWhy(done.state, ps[1]!.who)).toMatch(/tomorrow/);
    expect(sparWhy(done.state, ps[0]!.who)).toBeNull();
  });

  it('with someone you know, while they stand where you are', () => {
    const s = atLayer(life(), 5);
    const who = 'person:sergeant-lei';
    expect(sparWhy(s, who)).toMatch(/aren’t where you are/);
    const there = inside(s, s.player.people['sergeant-lei']!.where);
    expect(sparWhy(there, who)).toBeNull();
    const f = fightStart(there, { kind: 'spar', who })!;
    const lei = f.combatants.find((c) => c.id !== PLAYER_ID)!;
    expect(lei.name).toMatch(/Lei/);
    expect(lei.rungs.qi.stage).toBe(7);
    expect(sparWhy(there, 'person:nobody')).toMatch(/don’t know/);
  });
});

describe('a threat that lands ends a hurt person’s fight', () => {
  const big = { realm: 'nascent-soul' as const, stage: 1, grade: 0 };
  const small = { realm: 'qi-condensation' as const, stage: 1, grade: 0 };
  const you = combatant({ id: 'you', name: 'You', side: 'you', rungs: { qi: big, body: big, soul: big } });
  const foe = (hp: number, beast = false) =>
    combatant({
      id: 'foe',
      name: 'Foe',
      side: 'them',
      hp,
      maxHp: 100,
      rungs: { qi: small, body: small, soul: small },
      ...(beast ? { beast: true } : {}),
    });
  const threaten = (f: Fight) =>
    resolveTurn(f, [{ actor: 'you', main: { type: 'talk', style: 'intimidate', target: 'foe' } }], new Rng(1))
      .fight;

  it('yields a person past half their HP, never a whole one or a beast', () => {
    expect(combatantIn(threaten(startFight([you, foe(40)])), 'foe')!.state).toBe('yielded');
    expect(combatantIn(threaten(startFight([you, foe(100)])), 'foe')!.state).toBe('fighting');
    expect(combatantIn(threaten(startFight([you, foe(40, true)])), 'foe')!.state).toBe('fighting');
    const talked = threaten(startFight([you, foe(40)]));
    expect(fightEnd(talked, 'you')).toBe('talked');
  });
});

describe('the v47 save', () => {
  it('migrates a v46 save: no fight under way, and the Combat screen off the rail', () => {
    const s = life();
    const raw = makeSave(s, 0) as unknown as Record<string, unknown>;
    const state = { ...(raw.state as Record<string, unknown>) };
    delete state.fight;
    state.unlocks = [...(state.unlocks as string[]), 'combat'];
    state.seen = { screen: { combat: 'seen', map: 'seen' } };
    const back = loadSave({ ...raw, version: 46, state }).state;
    expect(back.fight).toBeNull();
    expect(back.unlocks).not.toContain('combat');
    expect(back.seen.screen).toEqual({ map: 'seen' });
  });

  it('keeps a fight under way across a save', () => {
    const open = playExit(withEnc(atLayer(life(), 3), enc('ridge-wolves', 1)), 'e-test', 0)!;
    const { s } = fightOut(open, currentFight(open)!);
    const back = loadSave(JSON.parse(JSON.stringify(makeSave(s, 0)))).state;
    expect(back.fight).toEqual(s.fight);
  });
});

describe('the wheel’s Duty bug', () => {
  const creation: Creation = {
    name: 'Han Li',
    pronouns: 'they/them',
    look: '',
    mode: 'ironman',
    seed: 'duty',
    choice: 'along',
    roll: {
      root: 'true',
      elements: ['wood', 'fire'],
      body: 'farmhands-frame',
      soul: 'plain-mind',
      fate: 'ordinary-fate',
      origin: 'conscript',
    },
  };

  it('puts Duty on the shift’s hours at drill, worked and paid; past drill they are Duty, locked', () => {
    const s = createLife(creation);
    const shift = job('wall-patrol').shift;
    const h = shift[0]!;
    // At drill the arc marks the hours, and Duty can go on them, and only on them.
    expect(dutyAt(s.player, h)).toBeNull();
    expect(hourKindOpen(s.player, 'duty')).toBe(true);
    expect(canSetHour(s.player, h, 'duty')).toEqual({ ok: true });
    const off = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].find((x) => !shift.includes(x) && x > 1)!;
    expect(canSetHour(s.player, off, 'duty')).toMatchObject({ ok: false });
    const set = setHours(s.player, shift, 'duty');
    expect(set.check).toEqual({ ok: true });
    const c = set.cultivator;
    expect(effectiveWheel(c)[h]).toBe('duty');
    expect(dutyAt(c, h)?.id).toBe('wall-patrol');
    // Still yours at drill: it can be given back.
    expect(canSetHour(c, h, 'qi')).toEqual({ ok: true });
    // Worked at its post, it pays a duty day.
    const at = withPlayer(s, c);
    const post = { ...at, map: at.map ? { ...at.map, inside: job('wall-patrol').place, course: null } : at.map };
    const before = post.player.jobs[0]!.kept;
    const paid = jobsDay(post, post.calendar.day, post.calendar.day + 1);
    expect(paid.player.jobs[0]!.kept).toBeGreaterThan(before);
    // Left at its default, at drill, the shift isn't worked.
    expect(jobsDay(withPlayer(post, s.player), post.calendar.day, post.calendar.day + 1).player.jobs[0]!.kept).toBe(before);
    // Past drill the shift's hours are Duty and locked.
    const posted = withPlayer(s, { ...s.player, qi: { ...s.player.qi, stage: 4 } });
    expect(effectiveWheel(posted.player)[h]).toBe('duty');
    expect(canSetHour(posted.player, h, 'qi')).toMatchObject({ ok: false });
  });
});
