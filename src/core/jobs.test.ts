// O4's jobs, posts and duty hours (design § Cultivation, Duty hours; § Professions, people and
// powers, Posts): the cadet's patrols on the wheel and paid, a hire taken in the City setting its
// shift, the Gate's mission hall paying a bounty in contribution, a missed shift's standing,
// leaving by the giver's rule, the quota kept by a post, and the gather hour's rule.
import { describe, expect, it } from 'vitest';
import { DAYS_PER_MONTH } from '../content/calendar.ts';
import { STONE_QI } from '../content/cultivation.ts';
import { HOURS_PER_DAY } from '../content/hours.ts';
import { DUTY_PAY, job } from '../content/jobs.ts';
import { EDGE_LI, GATHER, RING_LI } from '../content/map/travel.ts';
import { realmScale } from '../content/realms.ts';
import { createLife, type Creation } from './creation.ts';
import { atPost, jobPay, jobsDay, quitJob, takeJob } from './jobs.ts';
import { cultivate } from './life.ts';
import { claimPosting, isMissionHall, postingsAt, takePosting } from './map/board.ts';
import { peopleLi } from './map/depth.ts';
import { gatherHour, gatherLines, gatherRarity, landYield } from './map/gather.ts';
import { placeById, type RegionMap } from './map/region.ts';
import { stancePick, type ExitView } from './map/encounters.ts';
import { encounterTemplate } from '../content/encounters/index.ts';
import { ensureMap, mapOf } from './map/travel.ts';
import {
  addBalance,
  joinPower,
  membership,
  monthIndex,
  setSeat,
  settleQuotas,
} from './organizations.ts';
import { worthOf, stonesOf } from './purse.ts';
import { loadSave, makeSave } from './save/format.ts';
import { newLife, PLAYER_ID, withPlayer, type GameState } from './state.ts';
import { canSetHour, effectiveWheel, followedRoutine } from './wheel.ts';
import type { Pt } from './map/geometry.ts';

const MARCH = 'qm-anbian-fu';
const GATE = 'qm-tushou-men';
const QIAN = 'qm-qian-shi';
const CITY = 'qm-shoukou-cheng';
const YOU = PLAYER_ID;

const creation = (
  origin: Creation['roll']['origin'],
  choice: Creation['choice'] = 'along',
): Creation => ({
  name: 'Han Li',
  pronouns: 'they/them',
  look: '',
  mode: 'ironman',
  seed: 'jobs',
  choice,
  roll: {
    root: 'true',
    elements: ['wood', 'fire'],
    body: 'farmhands-frame',
    soul: 'plain-mind',
    fate: 'ordinary-fate',
    origin,
  },
});

/** Out of the tutorial layers, where posts are worked: Qi Condensation 4. */
const posted = (s: GameState): GameState =>
  withPlayer(s, { ...s.player, qi: { ...s.player.qi, stage: 4 } });

/** Days at home on the day step, the calendar moved first as the loop moves it. */
const days = (s: GameState, n: number): GameState => {
  let st = s;
  for (let i = 0; i < n; i++)
    st = cultivate({ ...st, calendar: { ...st.calendar, day: st.calendar.day + 1 } }, 1, {
      offline: false,
    });
  return st;
};
const balance = (s: GameState, power: string) => membership(s.world, YOU, power)?.balance ?? 0;
const rows = (s: GameState, power: string, row: string) =>
  s.world.standing.filter((x) => x.power === power && x.about === YOU && x.row === row).length;
/** Standing inside a place, as the place screen has you. */
const inside = (s: GameState, place: string | null): GameState => {
  const m = ensureMap(s);
  return { ...m, map: { ...m.map!, inside: place, course: null } };
};
const member = (s: GameState, power: string) => {
  const r = joinPower(s.world, YOU, power, s.calendar.day, { you: true });
  if (!r.ok) throw new Error(r.why);
  return { ...s, world: r.world };
};

describe('the cadet’s patrols', () => {
  it('stand on the wheel as Duty, locked, and keep Wall Drill’s discipline', () => {
    const s = posted(createLife(creation('conscript')));
    expect(s.player.jobs.map((h) => h.id)).toEqual(['wall-patrol']);
    expect(membership(s.world, YOU, MARCH)?.seat).toBe('outer');
    const wheel = effectiveWheel(s.player);
    for (const h of job('wall-patrol').shift) expect(wheel[h]).toBe('duty');
    expect(canSetHour(s.player, job('wall-patrol').shift[0]!, 'qi')).toMatchObject({ ok: false });
    // Wall Drill followed underneath: the shift's hours count as kept.
    const drilled = withPlayer(s, {
      ...s.player,
      wheel: [
        'sleep',
        'sleep',
        'qi',
        'qi',
        'practice',
        'body',
        'qi',
        'qi',
        'practice',
        'qi',
        'study',
        'qi',
      ],
    });
    expect(followedRoutine(drilled.player)?.id).toBe('wall-drill');
  });

  it('never pay more, burned as stones, than the same four hours give secluding', () => {
    // A low-grade stone burned is a fifth of a Qi Condensation day's qi, and pay rides the same
    // realm curve as a day's qi, so the share holds at every realm.
    const shift = job('wall-patrol').shift.length;
    expect(DUTY_PAY * STONE_QI).toBeLessThan(shift / HOURS_PER_DAY);
  });

  it('pay a duty day at the Wall: half in military merit, half in stones, on the realm curve', () => {
    const s = posted(createLife(creation('conscript')));
    const pay = jobPay(job('wall-patrol'), 'qi-condensation');
    expect(pay).toEqual({ points: DUTY_PAY / 2, stones: DUTY_PAY / 2 });
    expect(jobPay(job('wall-patrol'), 'foundation-establishment').points).toBe(
      (DUTY_PAY / 2) * realmScale('foundation-establishment'),
    );
    const before = worthOf(stonesOf(s.player));
    const after = days(s, 20);
    const held = after.player.jobs[0]!;
    const kept = held.kept + (held.last?.kept ?? 0);
    expect(kept).toBeGreaterThanOrEqual(20);
    expect(held.missed).toBe(0);
    expect(balance(after, MARCH) + held.owed.points).toBeCloseTo(kept * (DUTY_PAY / 2), 1);
    expect(worthOf(stonesOf(after.player)) - before).toBeGreaterThanOrEqual(14);
    expect(after.chronicle.some((e) => e.type === 'job' && e.data.what === 'taken')).toBe(true);
  });
});

describe('drill', () => {
  it('holds the post through the tutorial layers without working it', () => {
    const s = createLife(creation('conscript'));
    expect(s.player.jobs.map((h) => h.id)).toEqual(['wall-patrol']);
    expect(effectiveWheel(s.player)).not.toContain('duty');
    const after = days(s, 3);
    expect(after.player.jobs[0]!.kept + after.player.jobs[0]!.missed).toBe(0);
    expect(effectiveWheel(posted(s).player)).toContain('duty');
  });
});

describe('a job in the City of the Guarded Mouth', () => {
  it('sets its shift on the wheel the day it is taken, and pays a hire in stones', () => {
    const s = posted(inside(newLife({ name: 'Han Li', seed: 'city' }), CITY));
    expect(effectiveWheel(s.player)[3]).not.toBe('duty');
    const r = takeJob(s, 'bounty-runner');
    if (!r.ok) throw new Error(r.reason);
    const wheel = effectiveWheel(r.state.player);
    for (const h of job('bounty-runner').shift) expect(wheel[h]).toBe('duty');
    expect(jobPay(job('bounty-runner'), 'qi-condensation')).toEqual({
      points: 0,
      stones: DUTY_PAY,
    });
    // A second job can't fall on the same hours.
    const guard = takeJob(r.state, 'qian-warehouse');
    expect(guard.ok).toBe(true);
    expect(takeJob(r.state, 'gate-garden')).toMatchObject({ ok: false });
  });

  it('turns a post away from those who aren’t the power’s own, or not at its seat', () => {
    const s = newLife({ name: 'Han Li', seed: 'gate' });
    expect(takeJob(s, 'gate-garden')).toMatchObject({ ok: false });
    const m = member(s, GATE);
    expect(takeJob(m, 'gate-garden').ok).toBe(true);
    expect(takeJob(m, 'gate-law-deacon')).toMatchObject({ ok: false });
    const inner = { ...m, world: setSeat(m.world, YOU, GATE, 'inner') };
    expect(takeJob(inner, 'gate-law-deacon').ok).toBe(true);
  });
});

describe('the Gate’s mission hall', () => {
  it('posts the bounties to members only and pays them in contribution, less the harsh tithe', () => {
    let s = ensureMap(newLife({ name: 'Han Li', seed: 'mission' }));
    const map = mapOf(s)!;
    const hall = placeById(map, GATE)!;
    expect(isMissionHall(GATE)).toBe(true);
    const posts = postingsAt(s, map, hall);
    expect(posts.length).toBeGreaterThan(0);
    expect(posts.every((p) => p.power === GATE)).toBe(true);
    expect(takePosting(s, map, hall, posts[0]!.id)).toMatchObject({ ok: false });
    s = member(s, GATE);
    const took = takePosting(s, map, hall, posts[0]!.id);
    if (!took.ok) throw new Error(took.reason);
    s = took.state;
    s = {
      ...s,
      map: {
        ...s.map!,
        inside: GATE,
        postings: s.map!.postings.map((p) => ({ ...p, done: true })),
      },
    };
    const stones = worthOf(stonesOf(s.player));
    const paid = claimPosting(s, map, posts[0]!.id);
    if (!paid.ok) throw new Error(paid.reason);
    // The Gate is harsh: its outer seat gives up 30% of what it brings in.
    expect(balance(paid.state, GATE)).toBeCloseTo(posts[0]!.pay * 0.7, 1);
    expect(worthOf(stonesOf(paid.state.player))).toBe(stones);
  });
});

describe('a missed shift', () => {
  it('costs standing with its giver, a row a duty day, and a hire lets you go after seven', () => {
    let s = posted(inside(newLife({ name: 'Han Li', seed: 'miss' }), CITY));
    const r = takeJob(s, 'qian-warehouse');
    if (!r.ok) throw new Error(r.reason);
    s = inside(r.state, null);
    s = { ...s, map: { ...s.map!, inside: 'qm-tushou-men' } };
    expect(atPost(s, job('qian-warehouse'))).toBe(false);
    const three = days(s, 3);
    expect(rows(three, QIAN, 'missed-shift')).toBe(3);
    const eight = days(three, 5);
    expect(eight.player.jobs).toEqual([]);
    expect(eight.chronicle.some((e) => e.type === 'job' && e.data.what === 'let-go')).toBe(true);
  });

  it('is excused while a house’s leave lasts, and costs standing past it', () => {
    const s = posted(createLife(creation('conscript')));
    const away = { ...ensureMap(s), map: { ...ensureMap(s).map!, inside: CITY } };
    expect(rows(days(away, 3), MARCH, 'missed-shift')).toBe(0);
    const year = Math.floor(away.calendar.day / 360);
    const spent = {
      ...away,
      world: {
        ...away.world,
        members: away.world.members.map((m) =>
          m.power === MARCH ? { ...m, leave: { year, days: 200 } } : m,
        ),
      },
    };
    expect(rows(days(spent, 3), MARCH, 'missed-shift')).toBe(3);
  });
});

describe('leaving a job', () => {
  it('drops a sect’s post freely, but a soldier’s post only by deserting the March', () => {
    const gate = member(newLife({ name: 'Han Li', seed: 'leave' }), GATE);
    const took = takeJob(gate, 'gate-mine');
    if (!took.ok) throw new Error(took.reason);
    const dropped = quitJob(took.state, 'gate-mine');
    if (!dropped.ok) throw new Error(dropped.reason);
    expect(dropped.state.player.jobs).toEqual([]);
    expect(membership(dropped.state.world, YOU, GATE)).toBeDefined();

    const cadet = posted(createLife(creation('conscript')));
    const deserted = quitJob(cadet, 'wall-patrol');
    if (!deserted.ok) throw new Error(deserted.reason);
    expect(membership(deserted.state.world, YOU, MARCH)).toBeUndefined();
    expect(rows(deserted.state, MARCH, 'betrayed-us')).toBe(1);
  });
});

describe('a post kept', () => {
  it('counts as the quota kept, and is remembered by its power', () => {
    let s = posted(createLife(creation('conscript')));
    s = { ...s, world: addBalance(s.world, YOU, MARCH, -balance(s, MARCH)) };
    s = days(s, DAYS_PER_MONTH + 1);
    const held = s.player.jobs[0]!;
    expect(held.last?.kept).toBeGreaterThanOrEqual(DAYS_PER_MONTH / 2);
    expect(rows(s, MARCH, 'kept-watch')).toBe(1);
    // Nothing banked would miss the quota; the post kept it.
    const m = membership(s.world, YOU, MARCH)!;
    expect(m.missed ?? 0).toBe(0);
    const broke = { ...s, world: addBalance(s.world, YOU, MARCH, -m.balance) };
    expect(membership(settleQuotas(broke).world, YOU, MARCH)!.missed ?? 0).toBe(0);
    expect(monthIndex(s.calendar.day)).toBeGreaterThan(0);
  });

  it('pays nothing and misses nothing in a stretch with no shift hours in it', () => {
    const s = posted(createLife(creation('conscript')));
    const day = Math.floor(s.calendar.day);
    const night = jobsDay({ ...s, calendar: { ...s.calendar, day: day + 0.1 } }, day, day + 0.1);
    expect(night.player.jobs[0]!.kept).toBe(0);
    expect(night.player.jobs[0]!.missed).toBe(0);
  });
});

describe('the gather hour', () => {
  /** A spot in the wilds the land grows something at, by how far it is from people. */
  function spot(map: RegionMap, near: boolean): Pt {
    const [x0, y0, x1, y1] = map.bbox;
    for (let i = 1; i < 40; i++)
      for (let j = 1; j < 40; j++) {
        const p: Pt = [x0 + ((x1 - x0) * i) / 40, y0 + ((y1 - y0) * j) / 40];
        const li = peopleLi(map, p);
        const ok = near ? li < EDGE_LI : li >= EDGE_LI + RING_LI;
        if (ok && gatherLines(map, p).length) return p;
      }
    throw new Error('no spot');
  }

  it('finds the land’s yield an hour, deep over near, times (1 + Perception)', () => {
    const s = ensureMap(newLife({ name: 'Han Li', seed: 'gather' }));
    const map = mapOf(s)!;
    const deep = spot(map, false);
    const near = spot(map, true);
    expect(landYield(map, deep)).toBe(GATHER.deep);
    expect(landYield(map, near)).toBe(GATHER.near);
    const count = (at: Pt, hours: number) => {
      let life = { ...s.map!, at: [at[0], at[1]] as [number, number], gathered: 0 };
      let player = s.player;
      let n = 0;
      for (let h = 0; h < hours; h++) {
        const g = gatherHour(map, life, player, 0, h, 1);
        life = g.life;
        player = g.player;
        n += Object.values(g.finds).reduce((a, b) => a + b, 0);
      }
      return { n, lines: gatherLines(map, at) };
    };
    const d = count(deep, 4);
    expect(d.n).toBe(4 * GATHER.deep);
    expect(count(near, 4).n).toBe(4 * GATHER.near);
    // Half an hour carries its share to the next.
    const half = gatherHour(
      map,
      { ...s.map!, at: [near[0], near[1]] as [number, number], gathered: 0 },
      s.player,
      0,
      0,
      0.5,
    );
    expect(half.life.gathered).toBeCloseTo(0.5);
  });

  it('reads the rarity off your soul against the land, never above purple unless your soul leads', () => {
    const c = newLife({ name: 'Han Li', seed: 'r' }).player;
    // Layers 7 to 9 find green and blue.
    expect(gatherRarity(c, 2, 2)).toBe('blue');
    expect(gatherRarity(c, 1, 2)).toBe('green');
    expect(gatherRarity(c, 0, 2)).toBe('white');
    // Core Formation's late band finds purple and gold; a soul that doesn't lead stops at purple.
    expect(gatherRarity(c, 8, 8)).toBe('purple');
  });

  it('leaves a find on the road to a wheel with a gather hour: a stance no longer gathers', () => {
    const t = encounterTemplate('clover-in-the-grass');
    const views: ExitView[] = t.exits.map((exit, i) => ({
      i,
      exit,
      judged: 'clear',
      refused: false,
    })) as unknown as ExitView[];
    expect(stancePick(t, views, 'careful', true)).toBe(0);
    expect(stancePick(t, views, 'careful', false)).toBe(1);
  });
});

describe('the save', () => {
  it('brings a v40 life up holding no job, its road carrying nothing gathered', () => {
    const s = ensureMap(newLife({ name: 'Han Li', seed: 'save' }));
    const raw = JSON.parse(JSON.stringify(makeSave(s, 1))) as {
      version: number;
      state: { player: { jobs?: unknown }; map: { gathered?: number } };
    };
    raw.version = 40;
    delete raw.state.player.jobs;
    delete raw.state.map.gathered;
    const back = loadSave(raw);
    expect(back.version).toBe(41);
    expect(back.state.player.jobs).toEqual([]);
    expect(back.state.map!.gathered).toBe(0);
  });
});
