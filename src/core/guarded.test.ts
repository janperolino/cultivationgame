// O5's guarded methods (design § Professions, people and powers, Guarded methods; § Economy,
// Methods in the market): an art seen in use marks the face, a fine or restitution lifts it, a
// black market sale tells the power and empties the shelf in a season, the law hall walks the
// roads in its sphere, and a clean parting keeps what was learned under an oath never to sell it.
import { describe, expect, it } from 'vitest';
import { DAYS_PER_MONTH } from '../content/calendar.ts';
import { shop } from '../content/shops.ts';
import { template as rosterTemplate } from '../content/roster.ts';
import { generateCultivator } from './combat/generate.ts';
import {
  huntOf,
  lawHallAt,
  liftByPaying,
  marksHere,
  recognizes,
  seeUse,
  yourMark,
} from './guarded.ts';
import { guardedBy, standingCopies } from './markets.ts';
import { COPY_PRICE } from '../content/money.ts';
import { chooseExit, contact, draw, exitViews, meet } from './map/encounters.ts';
import { gateOf } from './map/gate.ts';
import { placeById } from './map/region.ts';
import type { Encounter } from './map/schema.ts';
import { ensureMap, mapOf } from './map/travel.ts';
import { priceOf } from './prices.ts';
import { asMember, joinPower, leavePower, setSeat } from './organizations.ts';
import { stonesOf, worthOf } from './purse.ts';
import { actorFromCultivator, actorFromNpc, type Actor } from './resolver/actor.ts';
import { intentOf } from './resolver/intent.ts';
import { markFor, oathFor, secretsOf } from './resolver/marks.ts';
import { addStanding } from './resolver/opinion.ts';
import { standingOf } from './resolver/world.ts';
import { Rng } from './rng.ts';
import { loadSave, makeSave } from './save/format.ts';
import { sell } from './shops.ts';
import { newLife, PLAYER_ID, withPlayer, type GameState } from './state.ts';

const GATE = 'qm-tushou-men';
const NIGHT_BRIDGE = 'qm-yeqiao-hui';
const YOU = PLAYER_ID;
const CLEAVE = 'technique:bone-splitting-cleave';
const SABER = 'method:butcher-saber';
const SABER_2 = 'method:butcher-saber-foundation';
const GATE_SEAT: [number, number] = [174000, 210000];
const NAMELESS: [number, number] = [183000, 242000];

/** A layer 9 street cultivator who knows the Gate's Bone-Splitting Cleave and nothing else. */
const life = (seed = 'guarded'): GameState => {
  const s = ensureMap(newLife({ name: 'Han Li', seed }));
  const p = s.player;
  return withPlayer(s, {
    ...p,
    qi: { ...p.qi, stage: 9 },
    body: { ...p.body, stage: 5 },
    soul: { ...p.soul, stage: 5 },
    techniques: { 'bone-splitting-cleave': { practice: 0 } },
    practicing: [],
    stones: 10_000,
  });
};

const enc = (template: string, band: number, extra: Partial<Encounter> = {}): Encounter => ({
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
  ...extra,
});

const withEnc = (s: GameState, e: Encounter): GameState => ({
  ...s,
  map: { ...s.map!, encounters: [{ ...e, at: [s.map!.at[0], s.map!.at[1]] }] },
});

/** A Gate disciple of the road, at a realm, as their power stands behind them. */
const gateDisciple = (s: GameState, id: string, realm: string, stage: number): Actor => {
  const npc = generateCultivator(
    rosterTemplate('beast-butcher-disciple') as never,
    realm as never,
    stage,
    new Rng(1),
    { id, side: 'them' },
  );
  return asMember(s.world, actorFromNpc(npc, { name: 'a Gate disciple' }));
};

/** Marked by the Gate for its chapter 1 cleave, seen by an outer disciple. */
const marked = (s = life()): GameState => {
  const r = seeUse(
    s.world,
    actorFromCultivator(s),
    [CLEAVE],
    [gateDisciple(s, 'd1', 'qi-condensation', 5)],
    { place: 'road' },
    s.calendar.day,
  );
  return { ...s, world: r.world };
};

const fightExit = (s: GameState) =>
  exitViews(s, meet(s, s.map!.encounters[0]!)).find((v) => v.exit.road === 'fight')!;

describe('seen in use', () => {
  it('a Gate art used before a Gate disciple marks you, cold, on the road', () => {
    const w = withEnc(life(), enc('butcher-gate-hunters', 2));
    const r = chooseExit(w, 'e-test', fightExit(w).i)!;
    const m = markFor(r.state.world, YOU, GATE, r.state.calendar.day)!;
    expect(m.data.method).toBe(CLEAVE);
    expect(m.data.strength.realm).toBe('nascent-soul');
    expect(standingOf(r.state.world, GATE, YOU, r.state.calendar.day).word).toBe('cold');
    expect(r.state.chronicle.some((e) => e.type === 'power' && e.data.what === 'marked')).toBe(
      true,
    );
    // The Gate hunts it now, a chapter 1 leak.
    expect(huntOf(r.state.world, GATE, r.state.calendar.day)).toBe(1);
  });

  it('a member knows chapters up to their seat; a disguise hides the face, not the leak', () => {
    const s = life();
    const outer = gateDisciple(s, 'o', 'qi-condensation', 5);
    const elder = gateDisciple(s, 'e', 'core-formation', 2);
    expect(recognizes(s.world, outer, CLEAVE)).toBe(true);
    expect(recognizes(s.world, outer, SABER_2)).toBe(false);
    expect(recognizes(s.world, elder, SABER_2)).toBe(true);
    const you = { ...actorFromCultivator(s), disguised: true };
    const r = seeUse(s.world, you, [CLEAVE], [outer], { place: 'road' }, s.calendar.day);
    expect(markFor(r.world, YOU, GATE, s.calendar.day)).toBeUndefined();
    expect(huntOf(r.world, GATE, s.calendar.day)).toBe(1);
    // Seen again veiled, the same leak is news to no one: no new deed.
    const again = seeUse(r.world, you, [CLEAVE], [outer], { place: 'road' }, s.calendar.day);
    expect(again.world.deeds.length).toBe(r.world.deeds.length);
  });

  it('a Gate member or an outsider who saw nothing is never marked, and one grudge a power', () => {
    const s = life();
    const joined = { ...s, world: joinPower(s.world, YOU, GATE, 0).world };
    const watcher = [gateDisciple(s, 'o', 'qi-condensation', 5)];
    const at = { place: 'road' };
    expect(
      seeUse(joined.world, actorFromCultivator(joined), [CLEAVE], watcher, at, 0).seen,
    ).toEqual([]);
    const twice = seeUse(marked(s).world, actorFromCultivator(s), [CLEAVE], watcher, at, 0);
    expect(twice.seen).toEqual([]);
    expect(twice.world.standing.filter((x) => x.row === 'stole-our-method')).toHaveLength(1);
  });

  it('in a scene, a Gate disciple at cold standing demands the method back instead of striking', () => {
    const s = withEnc(marked(), enc('butcher-gate-hunters', 2));
    const m = meet(s, s.map!.encounters[0]!);
    const intent = intentOf(s, m.scene, m.actors[0]!)!;
    expect(intent.step).toBeUndefined();
    expect(intent.means).toContain('demands the method back');
    const hostile = {
      ...s,
      world: addStanding(s.world, { power: GATE, about: YOU, row: 'massacre' }, 0),
    };
    expect(intentOf(hostile, m.scene, m.actors[0]!)!.step?.act).toBe('attack');
  });
});

describe('the mark paid off', () => {
  it('a law hall that knows your face waits for you the first time a season, whatever the stance', () => {
    const s = marked();
    const w = {
      ...withEnc(s, enc('law-hall-outer', 2, { power: GATE, state: 'sensed' })),
    };
    const avoid = { ...w, map: { ...w.map!, stance: 'avoid' as const } };
    const first = contact(avoid, 'e-test');
    expect(first.map!.encounters[0]!.state).toBe('waiting');
    expect(first.map!.lawMet?.[GATE]).toBe(s.calendar.day);
    // Met once this season, the next party is the stance's again.
    const views = exitViews(first, meet(first, first.map!.encounters[0]!));
    expect(views.find((v) => v.exit.road === 'deal')!.refused).toBeNull();
  });

  it('a marked face is known at its gate and makes restitution there', () => {
    const s = marked();
    const map = mapOf(s)!;
    const gate = placeById(map, GATE)!;
    const g = gateOf(s, map, gate);
    expect(g.kind).toBe('shut');
    expect(g.words).toContain('know your face');
    const r = liftByPaying(s, GATE, 'restitution');
    if (!r.ok) throw new Error(r.reason);
    expect(gateOf(r.state, map, gate).words).not.toContain('know your face');
  });
});

describe('lifting the mark', () => {
  it('the law hall’s fine on the road: twice the price, the slip handed over, the oath sworn', () => {
    let s = marked();
    s = withPlayer(s, { ...s.player, copies: { ...s.player.copies, [CLEAVE]: 1 } });
    const w = withEnc(s, enc('law-hall-outer', 2, { power: GATE }));
    const views = exitViews(w, meet(w, w.map!.encounters[0]!));
    expect(views.find((v) => v.exit.road === 'pass')!.refused).toContain('know your face');
    const fine = views.find((v) => v.exit.road === 'deal')!;
    expect(fine.refused).toBeNull();
    const before = worthOf(stonesOf(w.player));
    const r = chooseExit(w, 'e-test', fine.i)!;
    expect(before - worthOf(stonesOf(r.state.player))).toBe(yourMark(w, GATE)!.fine);
    expect(yourMark(w, GATE)!.fine).toBe(2 * priceOf(CLEAVE));
    expect(r.state.player.copies[CLEAVE]).toBe(0);
    expect(markFor(r.state.world, YOU, GATE, 0)).toBeUndefined();
    expect(standingOf(r.state.world, GATE, YOU, 0).word).not.toBe('cold');
    expect(oathFor(r.state.world, YOU, GATE, 0)).toBeDefined();
    // Sworn, the art is yours to use: seen again, nothing new.
    const again = seeUse(
      r.state.world,
      actorFromCultivator(r.state),
      [CLEAVE],
      [gateDisciple(r.state, 'o', 'qi-condensation', 5)],
      { place: 'road' },
      0,
    );
    expect(again.seen).toEqual([]);
  });

  it('restitution at its hall is three times the price; at hostile no fine is taken', () => {
    const s = marked();
    const m = yourMark(s, GATE)!;
    expect(m.restitution).toBe(1.5 * m.fine);
    const r = liftByPaying(s, GATE, 'restitution');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(worthOf(stonesOf(s.player)) - worthOf(stonesOf(r.state.player))).toBe(m.restitution);
      expect(markFor(r.state.world, YOU, GATE, 0)).toBeUndefined();
    }
    const hostile = {
      ...s,
      world: addStanding(s.world, { power: GATE, about: YOU, row: 'betrayed-us' }, 0),
    };
    expect(liftByPaying(hostile, GATE, 'fine').ok).toBe(false);
    const w = withEnc(hostile, enc('law-hall-outer', 2, { power: GATE }));
    const fine = exitViews(w, meet(w, w.map!.encounters[0]!)).find((v) => v.exit.road === 'deal')!;
    expect(fine.refused).toContain('won’t take a fine');
  });

  it('joining the Gate lifts it; the place screen shows it inside the sphere only', () => {
    const s = marked();
    expect(marksHere(s, GATE_SEAT)).toHaveLength(1);
    expect(marksHere(s, NAMELESS)).toHaveLength(0);
    expect(marksHere(s, null, GATE)).toHaveLength(1);
    const joined = joinPower(s.world, YOU, GATE, 0).world;
    expect(markFor(joined, YOU, GATE, 0)).toBeUndefined();
    expect(joined.standing.some((x) => x.row === 'stole-our-method')).toBe(false);
  });
});

describe('a black market sale', () => {
  it('tells the Gate that it leaked, never who, and its copy is bought out in a season', () => {
    let s = life();
    s = withPlayer(s, { ...s.player, copies: { ...s.player.copies, [SABER]: 1 } });
    const r = sell(s, 'nameless-black', SABER);
    expect(r.ok).toBe(true);
    const after = r.state!;
    const day = after.calendar.day;
    expect(huntOf(after.world, GATE, day)).toBe(1);
    expect(markFor(after.world, YOU, GATE, day)).toBeUndefined();
    const month = Math.floor(day / DAYS_PER_MONTH);
    const sh = shop('nameless-black');
    expect(standingCopies(after.world, sh, month + 1)).toContain(SABER);
    expect(standingCopies(after.world, sh, month + 2)).toContain(SABER);
    expect(standingCopies(after.world, sh, month + 3)).not.toContain(SABER);
  });
});

describe('the law hall on the road', () => {
  it('walks inside the Gate’s sphere while it hunts, its size by the leak, cooling a season', () => {
    const s = marked();
    const powers = [GATE, 'qm-yeqiao-hui', 'qm-shoudeng-zong'];
    expect(lawHallAt(s.world, powers, GATE_SEAT, 0)).toEqual({ power: GATE, chapter: 1 });
    expect(lawHallAt(s.world, [GATE], NAMELESS, 0)).toBeNull();
    const day = s.calendar.day;
    expect(lawHallAt(s.world, [GATE], GATE_SEAT, day + 89)).not.toBeNull();
    expect(lawHallAt(s.world, [GATE], GATE_SEAT, day + 90)).toBeNull();
    // A chapter 3 leak sends an elder.
    const deep = seeUse(
      s.world,
      actorFromCultivator(s),
      ['method:butcher-saber-foundation'],
      [gateDisciple(s, 'e', 'core-formation', 2)],
      { place: 'road' },
      0,
    ).world;
    expect(lawHallAt(deep, [GATE], GATE_SEAT, 0)!.chapter).toBe(2);
  });

  it('walks for the March after a deserter, its conscripts written under the March', () => {
    const MARCH = 'qm-anbian-fu';
    const s = life('desert');
    const day = s.calendar.day;
    const joined = joinPower(s.world, YOU, MARCH, day, { you: true });
    if (!joined.ok) throw new Error(joined.why);
    const deserted = leavePower(joined.world, YOU, MARCH, day, { you: true });
    expect(deserted.parting?.kind).toBe('betrayal');
    const fort = placeById(mapOf(s)!, 'pacified-fort')!;
    // The March has no seat and radius: its land is its sphere.
    const map = mapOf(s)!;
    expect(lawHallAt(deserted.world, [MARCH], [fort.x, fort.y], day, map)).toMatchObject({
      power: MARCH,
    });
  });

  it('meets you on a road in its sphere, as two of the Gate’s own disciples', () => {
    const s = marked();
    const map = mapOf(s)!;
    // A road point inside the Gate's twenty thousand li.
    const pt = map.roads
      .flatMap((r) => r.pts)
      .find((p) => Math.hypot(p[0] - GATE_SEAT[0], p[1] - GATE_SEAT[1]) < 15_000)!;
    expect(pt).toBeDefined();
    let found: { id: string; power?: string; band: number } | null = null;
    for (let i = 0; i < 400 && !found; i++) {
      const d = draw(s, map, pt, 6, 2, new Rng(i));
      if (d?.template.where.lawHall) found = { id: d.template.id, power: d.power, band: d.band };
    }
    expect(found).toMatchObject({ id: 'law-hall-outer', power: GATE });
    const w = withEnc(s, enc(found!.id, found!.band, { power: GATE }));
    const met = meet(w, w.map!.encounters[0]!);
    expect(met.actors).toHaveLength(2);
    expect(met.actors.every((a) => a.power === GATE)).toBe(true);
  });
});

describe('leaving and what you learned', () => {
  it('a disciple released cleanly keeps the Butcher Saber but can’t sell it anywhere', () => {
    let s = life();
    s = { ...s, world: joinPower(s.world, YOU, GATE, 0).world };
    s = withPlayer(s, {
      ...s.player,
      copies: { ...s.player.copies, [SABER]: 1 },
    });
    const left = leavePower(s.world, YOU, GATE, 0, { you: true, knows: [SABER] });
    expect(left.parting!.kind).toBe('clean');
    s = { ...s, world: left.world };
    expect(oathFor(s.world, YOU, GATE, 0)).toBeDefined();
    expect(markFor(s.world, YOU, GATE, 0)).toBeUndefined();
    const black = sell(s, 'nameless-black', SABER);
    expect(black.ok).toBe(false);
    if (!black.ok) expect(black.reason).toContain('heart-demon oath');
    expect(huntOf(s.world, GATE, 0)).toBe(0);
  });

  it('a betrayal guards all of it against you, marked for the highest chapter you know', () => {
    let s = life();
    // Released once and sworn, then back and walking out: the betrayal breaks the oath.
    const once = leavePower(joinPower(s.world, YOU, GATE, 0).world, YOU, GATE, 0, { you: true });
    expect(oathFor(once.world, YOU, GATE, 0)).toBeDefined();
    s = { ...s, world: setSeat(joinPower(once.world, YOU, GATE, 0).world, YOU, GATE, 'inner') };
    const left = leavePower(s.world, YOU, GATE, 0, {
      you: true,
      to: 'qm-baijiang-zong',
      knows: [SABER, SABER_2],
    });
    expect(left.parting!.kind).toBe('betrayal');
    const m = markFor(left.world, YOU, GATE, 0)!;
    expect(m.data.method).toBe(SABER_2);
    expect(oathFor(left.world, YOU, GATE, 0)).toBeUndefined();
    expect(['hostile', 'hunted']).toContain(standingOf(left.world, GATE, YOU, 0).word);
    // The traitor is hunted: the law hall walks for the highest chapter they know.
    expect(huntOf(left.world, GATE, 0)).toBe(2);
    expect(lawHallAt(left.world, [GATE], GATE_SEAT, 0)?.chapter).toBe(2);
  });

  it('going over to a foe sets the hunt, and a society’s own breathing method is guarded', () => {
    const s = life();
    const joined = joinPower(s.world, YOU, GATE, 0).world;
    const left = leavePower(joined, YOU, GATE, 0, {
      you: true,
      to: 'qm-baijiang-zong',
      knows: [SABER],
    });
    expect(left.parting!.kind).toBe('betrayal');
    expect(huntOf(left.world, GATE, 0)).toBe(1);
    expect(guardedBy('method:night-bridge')).toBe(NIGHT_BRIDGE);
  });

  it('a hunted rule marks a traitor who knows none of its methods for its secrets', () => {
    const s = life();
    const left = leavePower(joinPower(s.world, YOU, NIGHT_BRIDGE, 0).world, YOU, NIGHT_BRIDGE, 0, {
      you: true,
    });
    expect(left.parting!.kind).toBe('betrayal');
    const m = markFor(left.world, YOU, NIGHT_BRIDGE, 0)!;
    expect(m.data.method).toBe(secretsOf(NIGHT_BRIDGE));
    expect(huntOf(left.world, NIGHT_BRIDGE, 0)).toBe(1);
    const view = yourMark({ ...s, world: left.world }, NIGHT_BRIDGE)!;
    expect(view.method).toBe('its secrets');
    expect(view.restitution).toBe(COPY_PRICE.method * 3);
  });
});

describe('the save', () => {
  it('brings a v41 clean parting up sworn to the oath', () => {
    const s = life();
    const left = leavePower(joinPower(s.world, YOU, GATE, 0).world, YOU, GATE, 0, { you: true });
    const raw = JSON.parse(JSON.stringify(makeSave({ ...s, world: left.world }, 1))) as {
      version: number;
      state: { world: { states: { data: { kind: string } }[] } };
    };
    raw.version = 41;
    raw.state.world.states = raw.state.world.states.filter((x) => x.data.kind !== 'vow');
    const back = loadSave(raw);
    expect(back.version).toBe(47);
    expect(oathFor(back.state.world, YOU, GATE, 0)).toBeDefined();
  });
});
