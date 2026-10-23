// O1's skeleton (design § Professions, people and powers, Organizations share one skeleton, Seats
// and the currency; § NPC basics, Membership): every power typed, seats read top down from the
// population, titles held to their realm, one house at a time, partings clean or betrayals,
// "not of our blood", donations at their rate, the inner trial, and the save.
import { describe, expect, it } from 'vitest';
import { ORG_ROWS } from '../content/organizations.ts';
import { priceOf } from './prices.ts';
import {
  canJoin,
  donate,
  donationPoints,
  entrySeat,
  innerTrial,
  isOrganization,
  joinPower,
  ladderOf,
  leavePower,
  membership,
  monthIndex,
  monthOfYear,
  organization,
  seatByRealm,
  seatOf,
  seatRanges,
  seatTitle,
  takeAsDisciple,
} from './organizations.ts';
import { stonesOf, worthOf, withStones } from './purse.ts';
import { emptyWorld, type World } from './resolver/world.ts';
import { loadSave, makeSave } from './save/format.ts';
import { addItem, itemCount, newLife, PLAYER_ID, withPlayer, type GameState } from './state.ts';
import type { RealmId } from '../content/realms.ts';

const GATE = 'qm-tushou-men';
const LAMPS = 'qm-shoudeng-zong';
const JING = 'great-jing';
const REINS = 'qm-baijiang-zong';
const YOU = PLAYER_ID;
const QC = 'qi-condensation';
const FE = 'foundation-establishment';
const CF = 'core-formation';

const life = (seed = 'orgs'): GameState => newLife({ name: 'Han Li', seed });
const at = (realm: RealmId, stage: number) => ({ realm, stage });
const join = (w: World, power: string, o = {}) => {
  const r = joinPower(w, YOU, power, 0, o);
  if (!r.ok) throw new Error(r.why);
  return r.world;
};
/** What a power remembers of you. */
const rows = (w: World, power: string) =>
  w.standing.filter((x) => x.power === power && x.about === YOU);
/** The player at a realm and stage on their qi ladder. */
const atRealm = (s: GameState, realm: RealmId, stage: number): GameState =>
  withPlayer(s, { ...s.player, qi: { ...s.player.qi, realm, stage } });

describe('every power has a type', () => {
  it('in the generated table, and every one reads a ladder', () => {
    const powers = ORG_ROWS.filter((r) => r.type);
    expect(powers.length).toBe(160);
    for (const p of powers) {
      expect(isOrganization(p.id), p.id).toBe(true);
      expect(() => seatRanges(p.id), p.id).not.toThrow();
    }
    expect(organization('qm-luochao-lou').type).toBe('assassins');
  });

  it('reads a kingdom no power rules as a dynasty, and not Stone Eyes’ council', () => {
    expect(organization('qm-anbian-fu').type).toBe('dynasty');
    expect(seatTitle('qm-anbian-fu', 'head').name).toBe('Border-Pacifying Marquis');
    expect(isOrganization('qm-shiyan-guo')).toBe(false);
  });
});

describe('seats read top down from the population', () => {
  it('the Gate: a Nascent Soul head, Core Formation elders, Foundation inner, outer the rest', () => {
    expect(ladderOf(GATE)).toEqual({
      head: 'nascent-soul',
      grand: CF,
      elder: CF,
      inner: FE,
      split: false,
    });
    expect(seatRanges(GATE).outer.to).toEqual(at(QC, 9));
    expect(entrySeat(GATE, at(QC, 3))).toBe('outer');
    expect(seatTitle(GATE, 'outer').name).toBe('outer Gate disciple');
    expect(seatByRealm(GATE, at(CF, 2))).toBe('elder');
    expect(seatTitle(GATE, 'elder').name).toBe('elder');
  });

  it('the Lamp-Keepers: all Foundation at the top, Qi Condensation split at layer 7', () => {
    const r = seatRanges(LAMPS);
    expect(ladderOf(LAMPS)).toMatchObject({
      head: FE,
      grand: FE,
      elder: FE,
      inner: QC,
      split: true,
    });
    expect(r.inner.from).toEqual(at(QC, 7));
    expect(r.outer.to).toEqual(at(QC, 6));
  });

  it('the Great Jing: the Ancestor Emperor, Deity Transformation generals, Nascent Soul captains', () => {
    expect(ladderOf(JING)).toEqual({
      head: 'body-integration',
      grand: 'deity-transformation',
      elder: 'deity-transformation',
      inner: 'nascent-soul',
      split: false,
    });
    expect(seatRanges(JING).outer.to.realm).toBe(CF);
    expect(seatTitle(JING, 'head').name).toBe('emperor');
  });

  it('holds a title to its realm: a Core Formation beast heads its power as a commander', () => {
    expect(ladderOf('qm-leilang-zu').head).toBe(CF);
    expect(seatTitle('qm-leilang-zu', 'head').name).toBe('beast commander');
    expect(seatTitle('beast-court', 'head').name).toBe('beast sovereign');
    // A dynasty's head is a king below Deity Transformation; a tribe's shaman great from Nascent Soul.
    expect(seatTitle('qm-muling-guo', 'head').name).toBe('king');
    expect(seatTitle('fy-jiaoku-bu', 'grand', FE).name).toBe('shaman');
    expect(seatTitle('fy-jiaoku-bu', 'grand', 'nascent-soul').name).toBe('great shaman');
  });

  it('reads a written top alone as one at the top', () => {
    const p = ORG_ROWS.find((r) => r.id === 'fy-jingzhe-zong')!;
    expect(p.population).toBeUndefined();
    expect(ladderOf(p.id)).toEqual({
      head: 'nascent-soul',
      grand: CF,
      elder: CF,
      inner: FE,
      split: false,
    });
  });

  it('seats the Frontier Hall’s joiners in Apricot Grove Valley, by its override', () => {
    expect(ladderOf('xinglin')).toMatchObject({ elder: 'nascent-soul', inner: CF });
    const w = join(emptyWorld(), 'qm-xinglin-bianguan', { you: true });
    expect(membership(w, YOU, 'xinglin')?.seat).toBe('outer');
    expect(w.known).toContain('token:qm-xinglin-bianguan');
  });

  it('keeps a named person’s written seat', () => {
    expect(seatOf(emptyWorld(), 'senior-zhao', GATE)).toBe('outer');
    expect(seatOf(emptyWorld(), 'senior-zhao', LAMPS)).toBeNull();
  });
});

describe('membership', () => {
  it('joins at outer, or inner outright on reaching its realm', () => {
    expect(membership(join(emptyWorld(), GATE, { realm: at(QC, 5) }), YOU, GATE)?.seat).toBe(
      'outer',
    );
    const w = join(emptyWorld(), GATE, { realm: at(FE, 1) });
    expect(membership(w, YOU, GATE)?.seat).toBe('inner');
    // An outer disciple who breaks through holds the inner seat from then on.
    const outer = join(emptyWorld(), GATE, { realm: at(QC, 9) });
    expect(seatOf(outer, YOU, GATE, at(QC, 9))).toBe('outer');
    expect(seatOf(outer, YOU, GATE, at(FE, 1))).toBe('inner');
  });

  it('serves one house at a time: a second can’t be joined without leaving the first', () => {
    let w = join(emptyWorld(), GATE);
    const refused = canJoin(w, YOU, LAMPS);
    expect(refused).toMatchObject({ ok: false, holds: GATE });
    // Guilds, societies and gangs stack.
    expect(canJoin(w, YOU, 'qm-yeqiao-hui').ok).toBe(true);
    // A clan only by birth, adoption or marriage.
    expect(canJoin(w, YOU, 'qm-qian-shi').ok).toBe(false);
    expect(canJoin(w, YOU, 'qm-qian-shi', { by: 'marriage' }).ok).toBe(true);
    const left = leavePower(w, YOU, GATE, 10);
    expect(left.parting).toEqual({ kind: 'clean', why: 'released' });
    w = left.world;
    expect(rows(w, GATE).some((s) => s.row === 'parted')).toBe(true);
    expect(canJoin(w, YOU, LAMPS).ok).toBe(true);
  });

  it('reads betrayal: a hunted rule, a foe, a deserter, guarded methods', () => {
    const w = join(join(emptyWorld(), GATE), 'qm-yeqiao-hui');
    expect(leavePower(w, YOU, 'qm-yeqiao-hui', 10).parting?.kind).toBe('betrayal');
    const toReins = leavePower(w, YOU, GATE, 10, { to: REINS });
    expect(toReins.parting).toEqual({
      kind: 'betrayal',
      why: 'going over to the Hundred Reins Sect',
    });
    expect(rows(toReins.world, GATE).some((s) => s.row === 'betrayed-us')).toBe(true);
    const soldier = join(emptyWorld(), 'qm-anbian-fu');
    expect(leavePower(soldier, YOU, 'qm-anbian-fu', 360).parting?.why).toBe('deserting');
    expect(leavePower(soldier, YOU, 'qm-anbian-fu', 3600).parting?.kind).toBe('clean');
  });

  it('gives up the balance on leaving', () => {
    const s = life();
    const w = join(s.world, GATE);
    const r = donate({ ...s, world: w }, GATE, { stones: 0, things: {} });
    expect(r.ok).toBe(true);
    expect(leavePower(w, YOU, GATE, 10).world.members).toEqual([]);
  });

  it('marks "not of our blood" both ways while they belong', () => {
    const w = join(emptyWorld(), 'qm-leilang-zu');
    const row = rows(w, 'qm-leilang-zu').find((s) => s.row === 'not-our-blood');
    expect(row?.value).toBe(-15);
    const beast = join(emptyWorld(), GATE, { blood: 'race-beasts' });
    expect(rows(beast, GATE).some((s) => s.row === 'not-our-blood')).toBe(true);
    expect(rows(join(emptyWorld(), GATE), GATE).some((s) => s.row === 'not-our-blood')).toBe(false);
    const gone = leavePower(w, YOU, 'qm-leilang-zu', 10).world;
    expect(rows(gone, 'qm-leilang-zu').some((s) => s.row === 'not-our-blood')).toBe(false);
  });

  it('makes a true disciple by an elder’s master tie', () => {
    let w = join(emptyWorld(), GATE);
    w = joinPower(w, 'elder-x', GATE, 0, { realm: at(CF, 1) }).world;
    expect(takeAsDisciple(w, 'elder-x', YOU, GATE)).toBeNull();
    w = {
      ...w,
      members: w.members.map((m) => (m.who === 'elder-x' ? { ...m, seat: 'elder' as const } : m)),
    };
    expect(membership(takeAsDisciple(w, 'elder-x', YOU, GATE)!, YOU, GATE)?.seat).toBe('true');
  });
});

describe('the currency', () => {
  it('pays a donation in at its rate: stones at 2 low a point, goods at half their sell price', () => {
    expect(donationPoints({ stones: 10 })).toBe(5);
    const pill = 'spring-returning-pill';
    expect(donationPoints({ things: { [pill]: 1 } })).toBeCloseTo(priceOf(pill) * 0.2, 1);
    let s = life();
    s = withPlayer(s, addItem(withStones(s.player, [20, 0, 0, 0]), pill, 2));
    s = { ...s, world: join(s.world, GATE) };
    const r = donate(s, GATE, { stones: 10, things: { [pill]: 2 } });
    if (!r.ok) throw new Error(r.why);
    expect(worthOf(stonesOf(r.state.player))).toBeCloseTo(10);
    expect(itemCount(r.state.player, pill)).toBe(0);
    expect(membership(r.state.world, YOU, GATE)?.balance).toBe(r.points);
    expect(donate(life(), GATE, { stones: 2 }).ok).toBe(false);
  });
});

describe('the inner trial', () => {
  const member = (realm: RealmId, stage: number) => {
    const s = atRealm(life(), realm, stage);
    return { ...s, world: join(s.world, GATE) };
  };

  it('is held in the first month, once a year, and a QC 9 sheet passes where QC 3 does not', () => {
    const s = member(QC, 9);
    expect(monthOfYear(s.calendar.day)).toBe(1);
    const r = innerTrial(s, GATE);
    if (!r.ok) throw new Error(r.why);
    expect(r.passed).toBe(true);
    expect(membership(r.state.world, YOU, GATE)?.seat).toBe('inner');
    const weak = innerTrial(member(QC, 3), GATE);
    expect(weak.ok && !weak.passed).toBe(true);
    if (weak.ok) expect(innerTrial(weak.state, GATE).ok).toBe(false);
    const later = { ...member(QC, 9), calendar: { day: s.calendar.day + 40 } };
    expect(innerTrial(later, GATE).ok).toBe(false);
  });
});

describe('the save', () => {
  it('brings a v37 membership up at the outer seat with nothing banked', () => {
    const raw = JSON.parse(JSON.stringify(makeSave(life(), 1))) as {
      version: number;
      state: { world: { members: unknown[] } };
    };
    raw.version = 37;
    raw.state.world.members = [{ who: YOU, power: GATE, since: 5 }];
    const back = loadSave(raw);
    expect(back.version).toBe(56);
    expect(back.state.world.members).toEqual([
      {
        who: YOU,
        power: GATE,
        since: 5,
        seat: 'outer',
        balance: 0,
        paid: monthIndex(back.state.calendar.day),
        quota: monthIndex(back.state.calendar.day),
      },
    ]);
  });
});
