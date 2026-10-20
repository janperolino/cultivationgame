// O3: backing, tutelage and what membership asks (design § Professions, people and powers, What
// membership gives and asks; Backers and traces; Ties; What an NPC knows). A member names their
// power when threatened and carries its talisman from the true seat up; a member killed lands on
// the power as one of its own, and a member who does it takes the law hall's heat; fellow members
// meet at +10; a member knows the power's private tier; an elder teaches or stands protector for
// contribution; the year's Foundation Pills go down the trial's ranking and a member well ahead
// of their years takes the true seat; the quota, struck off on the third month missed; and leave.
import { describe, expect, it } from 'vitest';
import atlas from '../content/generated/atlas.json';
import { DAYS_PER_MONTH } from '../content/calendar.ts';
import type { SeatId } from '../content/organizations.ts';
import { PLAIN_NATURE } from '../content/personality.ts';
import type { RealmId } from '../content/realms.ts';
import { attemptBreakthrough, barSize, minorOdds } from './cultivation.ts';
import { breakThrough } from './life.ts';
import {
  addBalance,
  asMember,
  countLeave,
  elderPrice,
  engageProtector,
  innerTrial,
  joinPower,
  lessonInsight,
  membership,
  protectorOf,
  raiseEarly,
  seatOf,
  setSeat,
  settleQuotas,
  takeLesson,
  yearsPills,
} from './organizations.ts';
import { Rng } from './rng.ts';
import {
  actorFromCultivator,
  plainActor,
  realmSizeOf,
  rosterActor,
  YOU,
} from './resolver/actor.ts';
import { composure } from './resolver/check.ts';
import { placeIndex, powerPrivate, setPlaces, type PlaceEntry } from './resolver/knows.ts';
import { opinion } from './resolver/opinion.ts';
import { step } from './resolver/plan.ts';
import { doStep, startScene } from './resolver/scene.ts';
import { emptyWorld, heatOf, type World } from './resolver/world.ts';
import { loadSave, makeSave } from './save/format.ts';
import { itemCount, newLife, PLAYER_ID, withPlayer, type GameState } from './state.ts';

const GATE = 'qm-tushou-men';
const LAMPS = 'qm-shoudeng-zong';
const BELL = 'qm-jingzhong-si';
const ME = PLAYER_ID;
const QC = 'qi-condensation';
const FE = 'foundation-establishment';
const NS = 'nascent-soul';

const life = (seed = 'backing'): GameState => newLife({ name: 'Han Li', seed });
const atRealm = (s: GameState, realm: RealmId, stage: number): GameState =>
  withPlayer(s, { ...s.player, qi: { ...s.player.qi, realm, stage } });
/** The player joined to a power, at a seat, with a balance. */
const member = (s: GameState, power = GATE, seat: SeatId = 'outer', balance = 0): GameState => {
  const r = joinPower(s.world, ME, power, s.calendar.day, { you: true });
  if (!r.ok) throw new Error(r.why);
  let world = setSeat(r.world, ME, power, seat);
  world = addBalance(world, ME, power, balance);
  return { ...s, world };
};
const months = (s: GameState, n = 1): GameState => ({
  ...s,
  calendar: { ...s.calendar, day: s.calendar.day + n * DAYS_PER_MONTH },
});
const balance = (s: GameState, power = GATE) => membership(s.world, ME, power)?.balance ?? 0;
const rows = (w: World, power: string) =>
  w.standing.filter((x) => x.power === power && x.about === ME).map((x) => x.row);

describe('backing', () => {
  it('a Gate disciple threatened names the Gate, and feels as safe as its head two realms up', () => {
    const s = life();
    const disciple = asMember(s.world, rosterActor('beast-butcher-disciple', QC, 5, 'g1', 'them'));
    expect(disciple.power).toBe(GATE);
    expect(disciple.backing).toEqual({ power: GATE, realm: { realm: NS, stage: 1 } });
    expect(composure(disciple)).toBeCloseTo(realmSizeOf(disciple) * 2);
    const you = plainActor({ id: ME, name: 'Han Li', side: YOU, realm: { realm: QC, stage: 9 } });
    const r = doStep(
      s,
      startScene({ place: 'test-place', actors: [you, disciple] }),
      ME,
      step('threaten', { target: 'g1' }),
    );
    expect(r.scene.log.join(' ')).toContain('names the Beast-Butcher Gate');
  });

  it('you stand as a member too, and from the true seat carry a Core-led power’s talisman', () => {
    const outer = member(life());
    const you = asMember(outer.world, actorFromCultivator(outer));
    expect(you.power).toBe(GATE);
    expect(you.backing?.power).toBe(GATE);
    expect(you.talisman).toBeUndefined();
    const truly = member(life(), GATE, 'true');
    expect(asMember(truly.world, actorFromCultivator(truly)).talisman).toEqual({
      realm: NS,
      stage: 1,
    });
    // The Lamp-Keepers' head stands at Foundation: no talisman at any seat.
    const lamps = member(life(), LAMPS, 'true');
    expect(asMember(lamps.world, actorFromCultivator(lamps)).talisman).toBeUndefined();
  });

  it('a member killed lands on the power as one of its own, and a member who kills takes the law hall’s heat', () => {
    const kill = (s: GameState) => {
      const joined = joinPower(s.world, 'brother-wu', GATE, 0);
      if (!joined.ok) throw new Error(joined.why);
      const world = joined.world;
      const victim = asMember(
        world,
        plainActor({ id: 'brother-wu', name: 'Brother Wu', side: 'them', state: 'down' }),
      );
      const witness = rosterActor('beast-butcher-disciple', QC, 3, 'g2', 'them');
      const you = plainActor({ id: ME, name: 'Han Li', side: YOU, realm: { realm: QC, stage: 9 } });
      const r = doStep(
        { ...s, world },
        startScene({ place: 'test-place', actors: [you, victim, witness] }),
        ME,
        step('finish', { target: 'brother-wu' }),
      );
      return r.state.world;
    };
    const outsider = kill(life());
    expect(rows(outsider, GATE)).toContain('killed-ours');
    const day = life().calendar.day;
    const own = kill(member(life()));
    expect(heatOf(own, GATE, day) - heatOf(outsider, GATE, day)).toBe(3);
  });
});

describe('connections and knowledge', () => {
  it('a fellow member opens at +10, "one of ours", and it goes when you leave', () => {
    const s = life();
    const day = s.calendar.day;
    expect(opinion(s.world, 'senior-zhao', ME, day).total).toBe(0);
    const joined = member(s);
    const o = opinion(joined.world, 'senior-zhao', ME, day);
    expect(o.total).toBe(10);
    expect(o.lines.map((l) => l.memory.row)).toEqual(['fellow']);
    expect(opinion(joined.world, 'senior-zhao', ME, day, { viewer: ME }).total).toBe(10);
  });

  it('a member learns the Gate’s private places and people on joining', () => {
    const places = placeIndex(atlas.entries as unknown as PlaceEntry[]);
    setPlaces(places);
    const facts = powerPrivate(places, GATE);
    expect(facts).toContain('place:qm-heiyu-mai');
    expect(facts).toContain('name:senior-zhao');
    const s = member(life());
    for (const f of facts) expect(s.world.known).toContain(f);
    setPlaces(placeIndex([]));
  });
});

describe('tutelage', () => {
  /** The player with a full bar before Qi Condensation's fourth layer. */
  const ready = (s: GameState): GameState => {
    const t = atRealm(s, QC, 3);
    return withPlayer(t, { ...t.player, qi: { ...t.player.qi, bar: barSize(t.player.qi) } });
  };

  it('a protector lifts a breakthrough’s odds by 5%, and a failure under one takes no injury', () => {
    const c = atRealm(life(), FE, 1).player;
    const full = { ...c, qi: { ...c.qi, bar: barSize(c.qi) } };
    const fail = { day: 0, rng: { next: () => 0.999 } as unknown as Rng };
    const bare = attemptBreakthrough(full, 'qi', fail);
    const kept = attemptBreakthrough(full, 'qi', fail, { protector: true });
    expect(kept.odds).toBeCloseTo(minorOdds(full, 'qi') + 0.05);
    expect(bare.success).toBe(false);
    expect(bare.cultivator.qi.injuredUntil).toBeGreaterThan(0);
    expect(kept.cultivator.qi.injuredUntil).toBe(full.qi.injuredUntil);
  });

  it('is bought with contribution, stands by the next attempt and goes with it', () => {
    const price = elderPrice('protector', QC);
    expect(price).toBe(100);
    const poor = ready(member(life(), GATE, 'outer', price - 1));
    expect(engageProtector(poor, GATE).ok).toBe(false);
    const s = ready(member(life(), GATE, 'outer', price));
    const r = engageProtector(s, GATE);
    if (!r.ok) throw new Error(r.why);
    expect(balance(r.state)).toBe(0);
    expect(protectorOf(r.state)).toBe(GATE);
    const plain = breakThrough(s, 'qi');
    const guarded = breakThrough(r.state, 'qi');
    expect(guarded.odds).toBeCloseTo(Math.min(0.98, plain.odds + 0.05));
    expect(protectorOf(guarded.state)).toBeNull();
  });

  it('an elder’s lesson teaches three days of study for 20 points, once a month', () => {
    const s = member(life(), GATE, 'outer', 50);
    const r = takeLesson(s, GATE);
    if (!r.ok) throw new Error(r.why);
    expect(r.state.player.insight.current - s.player.insight.current).toBeCloseTo(lessonInsight(s));
    expect(balance(r.state)).toBe(30);
    expect(takeLesson(r.state, GATE).ok).toBe(false);
    expect(takeLesson(months(r.state), GATE).ok).toBe(true);
  });
});

describe('investment', () => {
  /** A Gate outer disciple the world keeps, at a realm. */
  const rival = (w: World, id: string, stage: number): World => ({
    ...w,
    kept: {
      ...w.kept,
      [id]: {
        name: id,
        nature: PLAIN_NATURE,
        power: GATE,
        home: GATE,
        realm: { realm: QC, stage },
      },
    },
  });

  it('the year’s pills go by the trial’s ranking', () => {
    expect(yearsPills(GATE)).toBe(3);
    const s = atRealm(member(life()), QC, 9);
    const won = innerTrial(s, GATE);
    if (!won.ok) throw new Error(won.why);
    expect(won).toMatchObject({ passed: true, rank: 1, pill: true });
    expect(itemCount(won.state.player, 'foundation-pill')).toBe(1);
    // Three kept outer disciples stand as high, senior to you: fourth takes none.
    let world = s.world;
    for (const id of ['a', 'b', 'c']) world = rival(world, id, 9);
    const lost = innerTrial({ ...s, world }, GATE);
    if (!lost.ok) throw new Error(lost.why);
    expect(lost).toMatchObject({ passed: true, rank: 4, pill: false });
    expect(itemCount(lost.state.player, 'foundation-pill')).toBe(0);
  });

  it('a member at Foundation well before thirty takes the true seat', () => {
    const s = atRealm(member(life()), FE, 1);
    expect(seatOf(s.world, ME, GATE, { realm: FE, stage: 1 })).toBe('inner');
    const raised = raiseEarly(s);
    expect(membership(raised.world, ME, GATE)?.seat).toBe('true');
    expect(raised.chronicle.at(-1)?.type).toBe('power');
    const old = { ...s, calendar: { ...s.calendar, day: s.calendar.day + 30 * 360 } };
    expect(membership(raiseEarly(old).world, ME, GATE)?.seat).toBe('outer');
  });
});

describe('what it asks', () => {
  it('takes the quota from the balance as each month turns', () => {
    const s = member(life(), GATE, 'outer', 25);
    const paid = settleQuotas(months(s));
    expect(balance(paid)).toBe(15);
    expect(membership(paid.world, ME, GATE)?.missed).toBe(0);
    // A generous power asks none.
    const bell = member(life(), BELL, 'outer', 25);
    expect(balance(settleQuotas(months(bell)), BELL)).toBe(25);
  });

  it('a missed quota costs standing on the second month and strikes you off on the third', () => {
    const s = member(life());
    const one = settleQuotas(months(s));
    expect(membership(one.world, ME, GATE)?.missed).toBe(1);
    expect(rows(one.world, GATE)).not.toContain('missed-quota');
    const two = settleQuotas(months(one));
    expect(rows(two.world, GATE)).toContain('missed-quota');
    const three = settleQuotas(months(two));
    expect(membership(three.world, ME, GATE)).toBeUndefined();
    expect(rows(three.world, GATE)).toContain('struck-off');
    expect(rows(three.world, GATE)).not.toContain('parted');
    expect(three.world.known).not.toContain(`token:${GATE}`);
    // Three months away at once tell the same: missed while away is missed.
    expect(membership(settleQuotas(months(s, 3)).world, ME, GATE)).toBeUndefined();
  });

  it('leave runs out with its cost: a point a day and standing', () => {
    const base = member(life(), GATE, 'outer', 20);
    const away: GameState = {
      ...base,
      map: { inside: null } as unknown as GameState['map'],
    };
    const within = countLeave(away, 90);
    expect(balance(within)).toBe(20);
    expect(rows(within.world, GATE)).not.toContain('overstayed');
    const over = countLeave(within, 5);
    expect(balance(over)).toBe(15);
    expect(rows(over.world, GATE).filter((r) => r === 'overstayed')).toHaveLength(1);
    expect(over.chronicle.at(-1)?.data.what).toBe('leave-over');
    // At the Gate itself no leave is taken.
    const home = countLeave({ ...away, map: { inside: GATE } as unknown as GameState['map'] }, 200);
    expect(balance(home)).toBe(20);
  });
});

describe('the save', () => {
  it('brings a v39 membership up with its quota settled to the month last paid', () => {
    const s = member(life());
    const raw = JSON.parse(JSON.stringify(makeSave(s, 1))) as {
      version: number;
      state: { world: { members: { paid?: number; quota?: number }[] } };
    };
    raw.version = 39;
    delete raw.state.world.members[0]!.quota;
    const back = loadSave(raw);
    expect(back.version).toBe(41);
    const m = back.state.world.members[0]!;
    expect(m.quota).toBe(m.paid);
    expect(emptyWorld().members).toEqual([]);
  });
});
