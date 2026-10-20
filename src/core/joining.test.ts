// Membership's doors (the organizations checkpoint's fixes): the way in by type at a power's seat,
// the elders' hall's trial and release, and a gift remembered as tribute.
import { describe, expect, it } from 'vitest';
import { DAYS_PER_MONTH, DAYS_PER_YEAR } from '../content/calendar.ts';
import { copyId } from '../content/copies.ts';
import {
  askRelease,
  askToJoin,
  buyInPrice,
  eldersHall,
  entryOf,
  giftFloor,
  offerGift,
  releaseView,
  seatPowerAt,
} from './joining.ts';
import { takeJob } from './jobs.ts';
import { claimPosting, postingsAt, takePosting } from './map/board.ts';
import { placeById, plainLore } from './map/region.ts';
import { possessive } from '../content/words.ts';
import { gateOf } from './map/gate.ts';
import { ensureMap, mapOf, mapPlaceOf } from './map/travel.ts';
import { innerTrial, joinPower, membership, rangeWords, seatsByRealm } from './organizations.ts';
import { renderEvent } from './chronicle.ts';
import { receive, stonesOf, withStones, worthOf } from './purse.ts';
import { addStanding } from './resolver/opinion.ts';
import { standingOf } from './resolver/world.ts';
import { newLife, PLAYER_ID, withPlayer, type GameState } from './state.ts';

const GATE = 'qm-tushou-men';
const REINS = 'qm-baijiang-zong';
const NIGHT_BRIDGE = 'qm-yeqiao-hui';
const MARCH = 'qm-anbian-fu';
const GUILD = 'qm-haisi-fang';
const YOU = PLAYER_ID;

const rich = (s: GameState, low = 1000): GameState =>
  withPlayer(s, withStones(s.player, receive(stonesOf(s.player), low)));
const life = () => rich(ensureMap(newLife({ name: 'Ye Chen', seed: 'doors' })));
const joined = (s: GameState, power: string): GameState => {
  const r = askToJoin(s, power);
  if (!r.ok || !r.joined) throw new Error(r.ok ? 'short' : r.reason);
  return r.state;
};

describe('the way in', () => {
  it('lets a rooted child sit the Gate’s entrance test and walk in with its token', () => {
    const s = life();
    const e = entryOf(s, GATE)!;
    expect(e.by).toBe('test');
    expect(e.title.name).toBe('Ask to sit the entrance test');
    const r = askToJoin(s, GATE);
    if (!r.ok) throw new Error(r.reason);
    expect(r.joined).toBe(true);
    expect(r.verdict).not.toBe('short');
    expect(membership(r.state.world, YOU, GATE)?.seat).toBe('outer');
    expect(r.state.world.known).toContain(`token:${GATE}`);
    expect(r.state.chronicle.at(-1)?.data).toMatchObject({ power: GATE, what: 'joined' });
    expect(entryOf(r.state, GATE)).toBeNull();
  });

  it('keeps one house at a time: a Gate disciple can’t join the Reins without leaving', () => {
    const s = joined(life(), GATE);
    expect(askToJoin(s, REINS)).toMatchObject({ ok: false });
  });

  it('has a society sponsor only one it favors', () => {
    const s = life();
    expect(entryOf(s, NIGHT_BRIDGE)?.shut).toBeTruthy();
    const favored = {
      ...s,
      world: addStanding(
        s.world,
        { power: NIGHT_BRIDGE, about: YOU, row: 'tribute', value: 40 },
        s.calendar.day,
      ),
    };
    expect(entryOf(favored, NIGHT_BRIDGE)?.shut).toBeNull();
    expect(askToJoin(favored, NIGHT_BRIDGE)).toMatchObject({ ok: true, joined: true });
  });

  it('enlists at a town of a dynasty’s kingdom, and a guild takes its buying-in price', () => {
    const s = life();
    const map = mapOf(s)!;
    const fort = mapPlaceOf(map, MARCH)!;
    expect(seatPowerAt(map, fort)).toBe(MARCH);
    expect(seatPowerAt(map, placeById(map, GATE)!)).toBe(GATE);
    expect(entryOf(s, MARCH)?.by).toBe('enlist');
    expect(membership(joined(s, MARCH).world, YOU, MARCH)?.seat).toBe('outer');
    const before = worthOf(stonesOf(s.player));
    const guild = joined(s, GUILD);
    expect(before - worthOf(stonesOf(guild.player))).toBeCloseTo(buyInPrice(s), 5);
  });
});

describe('the elders’ hall', () => {
  it('holds the inner trial in the first month only', () => {
    const s = joined(life(), GATE);
    const year = Math.ceil(s.calendar.day / DAYS_PER_YEAR) * DAYS_PER_YEAR;
    const first = { ...s, calendar: { ...s.calendar, day: year + 3 } };
    expect(eldersHall(first, GATE)?.trial).toMatchObject({ open: true });
    const later = { ...s, calendar: { ...s.calendar, day: year + 3 * DAYS_PER_MONTH } };
    expect(eldersHall(later, GATE)?.trial).toMatchObject({ open: false });
  });

  it('tells what being released gives up, then hands the pavilion’s copies back', () => {
    let s = joined(life(), GATE);
    s = {
      ...s,
      world: {
        ...s.world,
        members: s.world.members.map((m) => (m.power === GATE ? { ...m, balance: 40 } : m)),
      },
    };
    const took = takeJob(s, 'gate-garden');
    if (!took.ok) throw new Error(took.reason);
    const saber = copyId('method', 'butcher-saber');
    s = withPlayer(took.state, { ...took.state.player, copies: { [saber]: 1 } });
    const view = releaseView(s, GATE)!;
    expect(view.parting.kind).toBe('clean');
    expect(view.balance).toBe(40);
    expect(view.posts).toHaveLength(1);
    expect(view.copies.length).toBe(1);
    const r = askRelease(s, GATE);
    if (!r.ok) throw new Error(r.reason);
    expect(membership(r.state.world, YOU, GATE)).toBeUndefined();
    expect(r.state.player.jobs).toEqual([]);
    expect(r.state.player.copies[saber]).toBeUndefined();
    expect(r.state.chronicle.at(-1)?.data).toMatchObject({ power: GATE, what: 'left' });
  });
});

describe('a town board’s posting', () => {
  it('is posted for the power whose land it is, and paid out brings a stranger to known', () => {
    let s = life();
    const map = mapOf(s)!;
    const fort = mapPlaceOf(map, MARCH)!;
    const posts = postingsAt(s, map, fort);
    expect(posts.length).toBeGreaterThan(0);
    expect(posts.every((p) => p.patron === MARCH)).toBe(true);
    const took = takePosting(s, map, fort, posts[0]!.id);
    if (!took.ok) throw new Error(took.reason);
    s = took.state;
    s = {
      ...s,
      map: {
        ...s.map!,
        inside: fort.id,
        postings: s.map!.postings.map((p) => ({ ...p, done: true })),
      },
    };
    const paid = claimPosting(s, map, posts[0]!.id);
    if (!paid.ok) throw new Error(paid.reason);
    expect(standingOf(paid.state.world, MARCH, YOU, s.calendar.day).word).toBe('known');
  });
});

describe('a gift', () => {
  it('is remembered as tribute, one a month, and brings a stranger toward known', () => {
    const s = life();
    const floor = giftFloor(s);
    const small = offerGift(s, REINS, { stones: floor - 1 });
    expect(small).toMatchObject({ ok: true, counted: false });
    const r = offerGift(s, REINS, { stones: floor });
    if (!r.ok) throw new Error(r.reason);
    expect(r.counted).toBe(true);
    expect(standingOf(r.state.world, REINS, YOU, s.calendar.day).total).toBe(5);
    const again = offerGift(r.state, REINS, { stones: floor });
    expect(again).toMatchObject({ ok: true, counted: false });
    const m = joinPower(s.world, YOU, REINS, s.calendar.day, { you: true });
    if (!m.ok) throw new Error(m.why);
    expect(offerGift({ ...s, world: m.world }, REINS, { stones: floor })).toMatchObject({
      ok: false,
    });
  });
});

describe('the chronicle', () => {
  const who = { name: 'Ye Chen', they: 'they', them: 'them', their: 'their', slots: {} };
  const line = (s: GameState) => {
    const e = s.chronicle.at(-1)!;
    return renderEvent(e.type, e.data, who);
  };

  it('tells the join, the trial passed or short, a seat raised and the parting', () => {
    let s = joined(life(), GATE);
    expect(line(s)).toBe('Ye Chen is taken into the Beast-Butcher Gate.');
    const year = Math.ceil(s.calendar.day / DAYS_PER_YEAR) * DAYS_PER_YEAR;
    s = { ...s, calendar: { ...s.calendar, day: year + 1 } };
    const short = innerTrial(s, GATE);
    if (!short.ok) throw new Error(short.why);
    expect(line(short.state)).toBe(
      "Ye Chen sits the Beast-Butcher Gate's inner trial and falls short.",
    );
    const strong = withPlayer(s, {
      ...s.player,
      qi: { ...s.player.qi, realm: 'foundation-establishment', stage: 1 },
    });
    expect(line(seatsByRealm(strong))).toBe(
      'The Beast-Butcher Gate seats Ye Chen as its inner Gate disciple.',
    );
    const r = askRelease(s, GATE);
    if (!r.ok) throw new Error(r.reason);
    expect(line(r.state)).toBe('Ye Chen leaves the Beast-Butcher Gate by its rule.');
  });
});

describe('a feud', () => {
  it('stands a Gate disciple cold with the Reins, and its gate says why', () => {
    const s = joined(life(), GATE);
    expect(standingOf(s.world, REINS, YOU, s.calendar.day).word).toBe('cold');
    const map = mapOf(s)!;
    expect(gateOf(s, map, placeById(map, REINS)!).words).toContain('at feud');
    expect(standingOf(life().world, REINS, YOU, 0).word).toBe('unknown');
  });
});

describe('small words', () => {
  it('read right: ranges, possessives, links and a clean parting', () => {
    expect(rangeWords({ from: null, to: { realm: 'qi-condensation', stage: 6 } })).toBe(
      'Qi Condensation 1–6',
    );
    expect(rangeWords({ from: null, to: { realm: 'qi-condensation', stage: 9 } })).toBe(
      'Qi Condensation',
    );
    expect(possessive('the Spirit Herders')).toBe("the Spirit Herders'");
    expect(possessive('the Gate', '’')).toBe('the Gate’s');
    expect(plainLore('the [[Wall of Piled Bones]] and [[x|the coast]]')).toBe(
      'the Wall of Piled Bones and the coast',
    );
    const s = joined(life(), GATE);
    expect(releaseView(s, GATE)!.parting.why).toBe('released');
  });
});
