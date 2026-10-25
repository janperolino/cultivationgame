// N2 The regional cast: about 200 notables seeded with the Border Wilds, each living a season at a
// time by their wants. The seeding against the powers' counts, a season read from the wants, the
// climb and its gate, the edge, a duel to the death, only the region you stand in ticking in
// detail, the year's folding and trimming, and the save.
import { describe, expect, it } from 'vitest';
import { DAYS_PER_YEAR } from '../content/calendar.ts';
import { CAST_SEEDING, SEASON_DAYS } from '../content/cast.ts';
import { HOME_MAP_REGION } from '../content/map/index.ts';
import { realm } from '../content/realms.ts';
import { membership } from './organizations.ts';
import {
  castDay,
  castIn,
  castSeason,
  chooseAct,
  doAct,
  lifespanEdge,
  promoteMade,
  seasonIndex,
  seedRegion,
  stageAge,
  stageYears,
  wantPoints,
  workedOut,
} from './regionalCast.ts';
import { addTie, remember, tieOf } from './resolver/opinion.ts';
import type { Nature } from '../content/personality.ts';
import type { Kept } from './resolver/opinion.ts';
import type { World } from './resolver/world.ts';
import { loadSave, makeSave } from './save/format.ts';
import { newLife, type GameState } from './state.ts';
import { heldOf } from './who.ts';

const BW = HOME_MAP_REGION;
const GATE = 'qm-tushou-men';
const YEAR = DAYS_PER_YEAR;

const life = (seed = 'cast'): GameState => newLife({ name: 'Han Li', seed });
const seeded = (seed = 'cast'): GameState => seedRegion(life(seed), BW);

const nature = (motives: Nature['motives'], axes: Nature['axes'] = {}): Nature => ({
  motives,
  axes,
  quirks: [],
  voice: { register: 'plain', habit: '', topic: '' },
});

/** A made-up cast member of the region, standing at a realm with a nature. */
function withCast(s: GameState, id: string, k: Partial<Kept>): GameState {
  const day = s.calendar.day;
  const base: Kept = {
    name: id,
    nature: nature([]),
    power: null,
    home: 'qm-hewan-cheng',
    template: 'cast-small-sect',
    seed: 7,
    realm: { realm: 'qi-condensation', stage: 8 },
    born: Math.floor(day / YEAR) - 20,
    region: BW,
    pedigree: 'small-sect',
    since: day,
    at: 'qm-hewan-cheng',
  };
  return { ...s, world: { ...s.world, kept: { ...s.world.kept, [id]: { ...base, ...k } } } };
}

const realmCount = (s: GameState, r: string) =>
  castIn(s.world, BW).filter((id) => s.world.kept[id]!.realm?.realm === r).length;

describe('the regional cast: who is seeded', () => {
  it('seeds the Border Wilds against its powers’ counts', () => {
    const s = seeded();
    const ids = castIn(s.world, BW);
    // The powers' 19 Core and the Gate master, with 8 unaffiliated Core and a hermit Nascent Soul;
    // Abbot Jingkong of the Quiet Bell, a written Core its population doesn't count, besides.
    expect(realmCount(s, 'core-formation')).toBe(19 + CAST_SEEDING.unaffiliated.core + 1);
    expect(realmCount(s, 'nascent-soul')).toBe(1 + CAST_SEEDING.unaffiliated.nascent);
    const f = realmCount(s, 'foundation-establishment');
    const q = realmCount(s, 'qi-condensation');
    expect(f).toBeGreaterThanOrEqual(100);
    expect(f).toBeLessThanOrEqual(115);
    expect(q).toBeGreaterThanOrEqual(70);
    expect(q).toBeLessThanOrEqual(85);
    expect(ids.length).toBeGreaterThan(190);
    expect(ids.length).toBeLessThan(240);
    expect(s.world.cast?.[BW]).toBe(seasonIndex(s.calendar.day));
  });

  it('seats them: the Gate master its head, Elder Mo among its own, three prospects a sect', () => {
    const s = seeded();
    const head = s.world.members.find((m) => m.power === GATE && m.seat === 'head')!;
    expect(s.world.kept[head.who]!.realm!.realm).toBe('nascent-soul');
    expect(s.world.kept['elder:qm-tushou-men']!.name).toBe('Elder Mo');
    expect(membership(s.world, 'elder:qm-tushou-men', GATE)).toBeDefined();
    const nightBridge = castIn(s.world, BW).filter(
      (id) =>
        s.world.kept[id]!.power === 'qm-yeqiao-hui' &&
        s.world.kept[id]!.realm!.realm === 'qi-condensation',
    );
    expect(nightBridge.length).toBeGreaterThanOrEqual(CAST_SEEDING.risingSect);
    // The Gate's head is a Nascent Soul, so its own are a great sect's.
    expect(s.world.kept[head.who]!.pedigree).toBe('great-sect');
  });

  it('seeds the same cast from the same world, and every one younger than their edge', () => {
    const a = seeded();
    const b = seeded();
    expect(castIn(a.world, BW)).toEqual(castIn(b.world, BW));
    for (const id of castIn(a.world, BW)) {
      const k = a.world.kept[id]!;
      const age = a.calendar.day / YEAR - k.born!;
      expect(age).toBeLessThan(lifespanEdge(id, k.realm!.realm));
    }
  });
});

describe('the regional cast: a season read from the wants', () => {
  it('Hu Wei, greedy and proud and short of his pill, hunts a stage up', () => {
    const s = withCast(life(), 'hu-wei', {
      nature: nature(['greed', 'pride'], { pride: 1 }),
      purse: 400,
      realm: { realm: 'qi-condensation', stage: 8 },
    });
    const p = wantPoints(s, 'hu-wei', s.calendar.day);
    expect(p.greed).toBe(3 + 1);
    expect(p.ambition).toBe(2);
    expect(p.home).toBe(1);
    const act = chooseAct(s, 'hu-wei', 1, s.calendar.day);
    expect(act.want).toBe('greed');
    expect(act.up).toBe(true);
  });

  it('a cautious greedy one trades instead; a loyal one stays home', () => {
    let s = withCast(life(), 'cautious', { nature: nature(['greed'], { nerve: -1 }), purse: 0 });
    s = withCast(s, 'loyal', { nature: nature(['loyalty', 'duty']), purse: 0 });
    expect(chooseAct(s, 'cautious', 1, s.calendar.day).trade).toBe(true);
    // Home 1 + 3 + 2 beats greed's lone "short" point.
    expect(chooseAct(s, 'loyal', 1, s.calendar.day).want).toBe('home');
  });

  it('the same person and season take the same act', () => {
    const s = withCast(life(), 'even', { nature: nature(['curiosity', 'greed']), purse: 0 });
    const a = chooseAct(s, 'even', 9, s.calendar.day);
    const b = chooseAct(s, 'even', 9, s.calendar.day);
    expect(a).toEqual(b);
  });

  it('a hunt pays a season’s take into the purse and is a deed the Ways can count', () => {
    const s = withCast(life(), 'hunter', { nature: nature(['greed']), purse: 0 });
    const act = chooseAct(s, 'hunter', 1, s.calendar.day);
    const after = doAct(s, 'hunter', act, 1, s.calendar.day);
    expect(after.world.kept['hunter']!.purse).toBe(90);
    expect(after.world.deeds.at(-1)).toMatchObject({ kind: 'hunt', actor: 'hunter' });
    expect(after.world.kept['hunter']!.at).toBe(act.place);
  });

  it('never acts on you: every act names a place or one of the cast', () => {
    const s = seeded();
    const you = s.player.id;
    for (const id of castIn(s.world, BW).slice(0, 80)) {
      const act = chooseAct(s, id, 1, s.calendar.day);
      expect(act.target).not.toBe(you);
    }
  });
});

describe('the regional cast: climbing, the edge and fights', () => {
  it('reads the pace table through Foundation and the flat years past it', () => {
    expect(stageYears('great-sect', { realm: 'core-formation', stage: 1 })).toBe(24);
    expect(stageYears('small-sect', { realm: 'core-formation', stage: 4 })).toBeNull();
    expect(stageYears('chosen', { realm: 'core-formation', stage: 4 })).toBe(0);
    expect(stageAge('great-sect', { realm: 'foundation-establishment', stage: 1 })).toBeCloseTo(
      20.4,
    );
  });

  it('waits at layer 9 for the Foundation Pill, then breaks through and eats it', () => {
    const day = 100 * SEASON_DAYS;
    let s = { ...life(), calendar: { ...life().calendar, day } };
    s = withCast(s, 'waiting', {
      nature: nature(['loyalty']),
      realm: { realm: 'qi-condensation', stage: 9 },
      since: day - 10 * YEAR,
    });
    s = { ...s, world: { ...s.world, cast: { [BW]: 100 } } };
    const stuck = castSeason(s, BW, 101);
    expect(stuck.world.kept['waiting']!.realm!.realm).toBe('qi-condensation');
    const held = {
      ...s,
      world: {
        ...s.world,
        kept: {
          ...s.world.kept,
          waiting: { ...s.world.kept['waiting']!, held: { 'foundation-pill': 1 } },
        },
      },
    };
    const through = castSeason(held, BW, 101);
    expect(through.world.kept['waiting']!.realm).toEqual({
      realm: 'foundation-establishment',
      stage: 1,
    });
    expect(heldOf(through, 'waiting', 'foundation-pill')).toBe(0);
  });

  it('dies at the lifespan’s edge, struck from their power', () => {
    let s = seeded();
    const id = castIn(s.world, BW).find((x) => s.world.kept[x]!.power === GATE)!;
    const k = s.world.kept[id]!;
    const old = Math.floor(s.calendar.day / YEAR - realm(k.realm!.realm).lifespan) - 1;
    s = withCast(s, id, { ...k, born: old });
    const after = castSeason(s, BW, seasonIndex(s.calendar.day) + 1);
    expect(after.world.people[id]).toBe('dead');
    expect(after.world.kept[id]!.died!.how).toBe('age');
    expect(membership(after.world, id, GATE)).toBeUndefined();
  });

  it('a sworn enemy’s duel is to the death, and the dead one’s companion swears it on', () => {
    let s = withCast(life(), 'strong', {
      nature: nature(['revenge']),
      realm: { realm: 'foundation-establishment', stage: 4 },
    });
    s = withCast(s, 'weak', {
      nature: nature(['loyalty']),
      realm: { realm: 'qi-condensation', stage: 3 },
    });
    s = withCast(s, 'mate', { nature: nature(['loyalty']) });
    s = { ...s, world: addTie(s.world, { a: 'weak', b: 'strong', kind: 'sworn-enemy' }) };
    s = { ...s, world: addTie(s.world, { a: 'mate', b: 'weak', kind: 'dao-companion' }) };
    const act = chooseAct(s, 'strong', 1, s.calendar.day);
    expect(act).toMatchObject({ want: 'revenge', target: 'weak' });
    const after = doAct(s, 'strong', act, 1, s.calendar.day);
    expect(after.world.people['weak']).toBe('dead');
    expect(after.world.kept['weak']!.died).toMatchObject({ how: 'duel', by: 'strong' });
    expect(tieOf(after.world, 'mate', 'strong')).toBe('sworn-enemy');
  });
});

describe('the regional cast: ticking', () => {
  it('seeds the Border Wilds on the first day step and ticks only the region you stand in', () => {
    let s = castDay(life(), life().calendar.day);
    expect(s.world.cast?.[BW]).toBeDefined();
    // A far region with one cast member, seeded as of now: it lives a year at a time.
    const now = seasonIndex(s.calendar.day);
    s = withCast(s, 'far', {
      region: 'qm-far',
      nature: nature(['curiosity']),
      at: 'home-far',
      home: 'home-far',
    });
    s = { ...s, world: { ...s.world, cast: { ...s.world.cast, 'qm-far': now } } };
    const next = (now + 1) % 4 === 0 ? now + 2 : now + 1;
    const from = s.calendar.day;
    const one = castDay({ ...s, calendar: { ...s.calendar, day: next * SEASON_DAYS } }, from);
    expect(one.world.kept['far']!.at).toBe('home-far');
    expect(one.world.cast?.['qm-far']).toBe(next);
    // The Border Wilds lived its season: someone is somewhere other than home.
    const moved = castIn(one.world, BW).some(
      (id) => one.world.kept[id]!.at !== one.world.kept[id]!.home,
    );
    expect(moved).toBe(true);
  });

  it('folds a cast deed into the actor’s tally once it is a year old', () => {
    let s = withCast(life(), 'hunter', { nature: nature(['greed']), purse: 0 });
    s = doAct(s, 'hunter', chooseAct(s, 'hunter', 1, s.calendar.day), 1, s.calendar.day);
    const first = s.world.deeds.find((d) => d.actor === 'hunter')!.id;
    const year = (Math.floor(seasonIndex(s.calendar.day) / 4) + 2) * 4;
    s = { ...s, world: { ...s.world, cast: { [BW]: year - 1 } } };
    const after = castSeason(
      { ...s, calendar: { ...s.calendar, day: year * SEASON_DAYS } },
      BW,
      year,
    );
    expect(after.world.deeds.some((d) => d.id === first)).toBe(false);
    expect(after.world.kept['hunter']!.tally?.hunt).toBeGreaterThanOrEqual(1);
  });

  it('lets the least notable fall out of a band past its count', () => {
    let s = seeded();
    for (let i = 0; i < 40; i++)
      s = withCast(s, `extra-${i}`, {
        nature: nature(['loyalty']),
        realm: { realm: 'qi-condensation', stage: 2 },
        since: s.calendar.day,
      });
    const year = (Math.floor(seasonIndex(s.calendar.day) / 4) + 1) * 4;
    const after = castSeason(
      { ...s, calendar: { ...s.calendar, day: year * SEASON_DAYS } },
      BW,
      year,
    );
    expect(realmCount(after, 'qi-condensation')).toBeLessThanOrEqual(
      CAST_SEEDING.rising + CAST_SEEDING.unaffiliated.rising,
    );
    expect(after.world.kept['extra-0']).toBeUndefined();
  });
});

describe('the regional cast: made people and promotion', () => {
  /** A soldier you only met, and a guard you robbed, both made people a year apart in age. */
  function twoMade(s: GameState): GameState {
    const day = s.calendar.day;
    const made = (seed: number): Kept => ({
      name: 'made',
      nature: nature(['loyalty']),
      power: null,
      home: 'qm-hewan-cheng',
      template: 'march-conscript',
      seed,
      realm: { realm: 'qi-condensation', stage: 4 },
      born: Math.floor(day / YEAR) - 25,
      made: day,
    });
    let w: World = { ...s.world, kept: { ...s.world.kept, soldier: made(1), robbed: made(2) } };
    w = remember(w, { holder: 'robbed', about: s.player.id, row: 'robbed' }, day);
    return { ...s, world: w };
  }

  it('works a made person out from the seed and the years, the same every time', () => {
    const s = twoMade(life());
    const later = { ...s, calendar: { ...s.calendar, day: s.calendar.day + 30 * YEAR } };
    const a = workedOut(later, 'soldier')!;
    expect(a).toEqual(workedOut(later, 'soldier'));
    expect(a.alive).toBe(true);
    // A rogue at 55 stands at Qi Condensation's peak on the pace table.
    expect(a.realm).toEqual({ realm: 'qi-condensation', stage: 9 });
    const old = { ...s, calendar: { ...s.calendar, day: s.calendar.day + 120 * YEAR } };
    expect(workedOut(old, 'soldier')!.alive).toBe(false);
    expect(workedOut(old, 'soldier')!.gone).toMatch(/^died of age in [0-9]+$/);
  });

  it('promotes the one you robbed into the cast, and leaves the soldier made', () => {
    const s = promoteMade(twoMade(life()), BW);
    expect(s.world.kept['robbed']!.region).toBe(BW);
    expect(s.world.kept['robbed']!.pedigree).toBe('rogue');
    expect(s.world.kept['soldier']!.region).toBeUndefined();
    expect(castIn(s.world, BW)).toContain('robbed');
  });
});

describe('the regional cast: the save', () => {
  it('keeps the cast and its seeded regions (v58), and an old save seeds on its next day step', () => {
    const s = seeded();
    const back = loadSave(JSON.parse(JSON.stringify(makeSave(s, 0))));
    expect(back.version).toBe(58);
    expect(castIn(back.state.world, BW)).toEqual(castIn(s.world, BW));
    expect(back.state.world.cast).toEqual(s.world.cast);
    const old = { ...makeSave(life(), 0), version: 57 };
    const loaded = loadSave(JSON.parse(JSON.stringify(old))).state;
    expect(loaded.world.cast).toBeUndefined();
    expect(castDay(loaded, loaded.calendar.day).world.cast?.[BW]).toBeDefined();
  });

  it('keeps a seeded region’s save small', () => {
    const kb = JSON.stringify(seeded().world).length / 1024;
    expect(kb).toBeLessThan(250);
  });
});
