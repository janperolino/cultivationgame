import { BODY_PER_DAY, PACE, TUTORIAL_PACE } from '../content/cultivation.ts';
import { describe, expect, it } from 'vitest';
import { eventText } from './chronicle.ts';
import { stepSize } from '../content/realms.ts';
import { BRANCHES, FRESH_WHEEL, SLEEP_FREED_TEXT, type HourKind } from '../content/hours.ts';
import { FIRST_ARTS, method } from '../content/methods.ts';
import { routine } from '../content/routines.ts';
import {
  cultivateDays,
  dayRates,
  hourYields,
  ladderOpen,
  nourish,
  temper,
  type LadderId,
} from './cultivation.ts';
import { cultivate, gainMethod, gainTechnique } from './life.ts';
import { advance } from './loop.ts';
import { ladderMethod, learnMethod, methodNeed, setActiveMethod } from './methods.ts';
import { Rng } from './rng.ts';
import { newLife, withPlayer, type Cultivator, type GameState, type Ladder } from './state.ts';
import {
  canFollow,
  canSetHour,
  effectiveWheel,
  followedRoutine,
  followWheel,
  hourKindOpen,
  hourToFlip,
  learnRoutine,
  openHours,
  saveRoutine,
  setHours,
} from './wheel.ts';

type LifeOpts = Partial<Parameters<typeof newLife>[0]>;

const life = (opts: LifeOpts = {}) => newLife({ name: 'Han Li', seed: 'wheel', ...opts });

/** Puts every known method at Mastery, where its speed is ×1, so a test sees the rest of the sum. */
const mastered = (c: Cultivator): Cultivator => ({
  ...c,
  methods: Object.fromEntries(
    Object.entries(c.methods).map(([id, r]) => [id, { ...r, practice: methodNeed(method(id), 2) }]),
  ),
});
const player = (opts: LifeOpts = {}) => mastered(life(opts).player);
const DAY = life().calendar.day;
const ctx = () => ({ day: DAY, rng: new Rng(1) });

const at = (c: Cultivator, which: LadderId, l: Partial<Ladder>): Cultivator => ({
  ...c,
  [which]: { ...c[which], ...l },
});

/** Sets hours directly, past the rules that guard the wheel, to build a test case. */
const withHours = (c: Cultivator, hours: Record<number, HourKind>): Cultivator => ({
  ...c,
  wheel: c.wheel.map((k, i) => hours[i] ?? k),
});

const qiAt = (c: Cultivator, hour: number) => hourYields(c, DAY)[hour]!.qi;

/** The hour index of an earthly branch, by its hanzi. */
const h = (hanzi: string) => BRANCHES.findIndex((b) => b.hanzi === hanzi);

/** A life that has opened study (layer 2) and practice (its first technique). */
function opened(opts: LifeOpts = {}): GameState {
  const s = life(opts);
  const layer2 = withPlayer(s, at(s.player, 'qi', { stage: 2 }));
  return gainTechnique(advance(layer2, 1000, { step: cultivate }).state, 'rampart-palm');
}

describe("the wheel's yields", () => {
  it('gives each hour a twelfth of a day, and sleep nothing', () => {
    const c = player();
    // Study is open from the start: a fresh true root (wood and fire) gives it 亥, worth least.
    expect(effectiveWheel(c)).toEqual([
      'sleep',
      'sleep',
      ...Array<HourKind>(9).fill('qi'),
      'study',
    ]);
    const hours = hourYields(c, DAY);
    expect(hours[h('子')]).toMatchObject({ kind: 'sleep', qi: 0, insight: 0 });
    expect(hours[h('辰')]!.qi).toBeCloseTo(TUTORIAL_PACE / 12);
    // Ten waking hours, all on qi, each leaving a twelfth of the day's trickle of 0.05 insight.
    const r = dayRates({ ...c, wheel: [...FRESH_WHEEL] }, DAY);
    expect(r.count).toMatchObject({ qi: 10, sleep: 2, study: 0 });
    expect(r.insight).toBeCloseTo((TUTORIAL_PACE * 0.05 * 10) / 12);
    // Ten qi hours, dawn's included.
    expect(r.qi).toBeCloseTo((TUTORIAL_PACE * 10.1) / 12);
    const allQi = { ...c, wheel: [...FRESH_WHEEL] };
    expect(cultivateDays(allQi, 1, ctx()).cultivator.qi.bar).toBeCloseTo(
      (TUTORIAL_PACE * 10.1) / 12,
    );
  });

  it('pays study in insight and practice in practice days', () => {
    const c = opened().player;
    const r = dayRates(c, DAY);
    expect(r.count).toMatchObject({ qi: 8, study: 1, practice: 1, sleep: 2 });
    const study = r.hours.find((x) => x.kind === 'study')!;
    expect(study.insight).toBeCloseTo((TUTORIAL_PACE * (1 + 0.05)) / 12);
    expect(r.practice).toBeCloseTo(1 / 12);
  });
});

describe('element hours', () => {
  it("pay a quarter more where the hour's element matches the root, from layer 4", () => {
    // A true root holds wood and fire by default: 寅 and 卯 are wood, 巳 and 午 fire.
    const c = at(player(), 'qi', { stage: 4 });
    expect(c.rootElements).toEqual(['wood', 'fire']);
    expect(qiAt(c, h('寅'))).toBeCloseTo((PACE * 1.25) / 12);
    expect(qiAt(c, h('午'))).toBeCloseTo((PACE * 1.25) / 12);
    expect(qiAt(c, h('辰'))).toBeCloseTo(PACE / 12);
    expect(qiAt(c, h('申'))).toBeCloseTo(PACE / 12);
    // An earth root would match all four earth hours.
    const earth = { ...c, rootElements: ['earth' as const] };
    for (const b of ['丑', '辰', '未', '戌']) {
      expect(hourYields(earth, DAY)[h(b)]!.element, b).toBe(b === '丑' ? 0 : 0.25);
    }
  });

  it('count lightning and wind as wood and ice as water', () => {
    // Common methods fit mutated roots poorly: root ×2.0 × fit ×0.6.
    const lightning = at(player({ root: 'mutated' }), 'qi', { stage: 4 });
    expect(qiAt(lightning, h('寅'))).toBeCloseTo((PACE * 1.2 * 1.25) / 12);
    expect(qiAt(lightning, h('申'))).toBeCloseTo((PACE * 1.2) / 12);
    const ice = at(player({ root: 'mutated', elements: ['ice'] }), 'qi', { stage: 4 });
    expect(qiAt(ice, h('亥'))).toBeCloseTo((PACE * 1.2 * 1.25) / 12);
    expect(qiAt(ice, h('寅'))).toBeCloseTo((PACE * 1.2) / 12);
  });

  it("match a tempering art's element on body hours", () => {
    let c = mastered(openHours(learnMethod(player(), FIRST_ARTS.body)).cultivator);
    c = at(withHours(c, { [h('辰')]: 'body', [h('申')]: 'body' }), 'body', { stage: 4 });
    // The Stone-Bearing art is earth: 辰 matches, 申 is metal.
    expect(hourYields(c, DAY)[h('辰')]!.body).toBeCloseTo((PACE * BODY_PER_DAY * 1.25) / 12);
    expect(hourYields(c, DAY)[h('申')]!.body).toBeCloseTo((PACE * BODY_PER_DAY) / 12);
  });
});

describe('dawn', () => {
  it('adds a tenth to qi at 卯, in the tutorial too, and to nothing else', () => {
    const c = player();
    expect(hourYields(c, DAY)[h('卯')]!.dawn).toBe(0.1);
    expect(qiAt(c, h('卯'))).toBeCloseTo((TUTORIAL_PACE * 1.1) / 12);
    // Past the tutorial it stacks with the element: 卯 is wood.
    expect(qiAt(at(c, 'qi', { stage: 4 }), h('卯'))).toBeCloseTo((PACE * 1.35) / 12);
    const body = withHours(openHours(learnMethod(c, FIRST_ARTS.body)).cultivator, {
      [h('卯')]: 'body',
    });
    expect(hourYields(body, DAY)[h('卯')]!.dawn).toBe(0);
    expect(hourYields(body, DAY)[h('卯')]!.body).toBeCloseTo((TUTORIAL_PACE * BODY_PER_DAY) / 12);
  });
});

describe('sleep', () => {
  it('is locked at 子 and 丑 through Qi Condensation', () => {
    const c = player();
    expect(canSetHour(c, h('子'), 'qi')).toMatchObject({ ok: false });
    expect(setHours(c, [h('丑')], 'qi').cultivator).toBe(c);
    // Whatever the wheel says, those hours sleep.
    expect(effectiveWheel(withHours(c, { 0: 'qi' }))[0]).toBe('sleep');
    expect(qiAt(withHours(c, { 0: 'qi' }), 0)).toBe(0);
  });

  it('is freed at Foundation: two more hours turn to qi, with a chronicle line', () => {
    const s = life();
    const foundation = withPlayer(s, at(s.player, 'qi', { realm: 'foundation-establishment' }));
    const after = advance(foundation, 1000, { step: cultivate }).state;
    expect(after.player.wheel.slice(0, 2)).toEqual(['qi', 'qi']);
    expect(after.chronicle.some((e) => eventText(after, e) === SLEEP_FREED_TEXT)).toBe(true);
    expect(canSetHour(after.player, 0, 'body')).toMatchObject({ ok: false });
    expect(canSetHour(after.player, 0, 'sleep')).toEqual({ ok: true });
  });
});

describe('the method gate', () => {
  it('gives qi hours nothing without a cultivation method', () => {
    const c = player({ method: null });
    expect(dayRates(c, DAY).qi).toBe(0);
    expect(cultivateDays(c, 1, ctx()).cultivator.qi.bar).toBe(0);
  });

  it('gives body and soul hours nothing without their art', () => {
    let c = learnMethod(learnMethod(player(), FIRST_ARTS.body), FIRST_ARTS.soul);
    c = openHours(c).cultivator;
    expect(dayRates(c, DAY).count).toMatchObject({ body: 1, soul: 1 });
    expect(dayRates(c, DAY).body).toBeGreaterThan(0);
    expect(dayRates(c, DAY).soul).toBeGreaterThan(0);
    const bare = setActiveMethod(
      setActiveMethod(c, 'body', null).cultivator,
      'soul',
      null,
    ).cultivator;
    expect(dayRates(bare, DAY)).toMatchObject({ body: 0, soul: 0 });
    const after = cultivateDays(bare, 30, ctx()).cultivator;
    expect([after.body.bar, after.soul.bar]).toEqual([0, 0]);
  });

  it('takes only a method of its own ladder', () => {
    const c = player();
    expect(ladderMethod(c, 'qi')?.id).toBe('garrison-standard');
    expect(ladderMethod(c, 'body')).toBeNull();
    const learned = learnMethod(c, FIRST_ARTS.body);
    expect(learned.activeMethods).toEqual({
      qi: 'garrison-standard',
      body: 'stone-bearing',
      soul: null,
    });
    expect(setActiveMethod(learned, 'soul', 'stone-bearing').cultivator).toBe(learned);
    const wrong = {
      ...learned,
      activeMethods: { ...learned.activeMethods, soul: 'stone-bearing' },
    };
    expect(ladderMethod(wrong, 'soul')).toBeNull();
  });

  it('leaves the world to temper and nourish, with no art needed', () => {
    const c = player();
    expect(ladderOpen(c, 'body')).toBe(false);
    expect(temper(c, 1.5).body.bar).toBe(1.5);
    expect(ladderOpen(temper(c, 1.5), 'body')).toBe(true);
    expect(nourish(c, 2).soul.bar).toBe(2);
    expect(temper(c, 1e6).body.bar).toBe(stepSize('qi-condensation', 1) * 1.5);
  });
});

describe('routines', () => {
  it('earn the discipline bonus on every waking hour when followed exactly', () => {
    const s = opened({ routines: ['watch-rotation'] });
    const watch = routine('watch-rotation');
    const plain = s.player;
    expect(followedRoutine(plain)).toBeNull();
    const r = followWheel(plain, watch.hours);
    expect(r.check).toEqual({ ok: true });
    const c = r.cultivator;
    expect(followedRoutine(c)?.id).toBe('watch-rotation');
    const hours = hourYields(c, DAY);
    expect(hours[h('寅')]!.qi).toBeCloseTo((TUTORIAL_PACE * 1.1) / 12);
    expect(hours[h('卯')]!.qi).toBeCloseTo((TUTORIAL_PACE * 1.2) / 12);
    expect(hours[h('未')]).toMatchObject({ kind: 'study', discipline: 0.1 });
    expect(hours[h('子')]!.discipline).toBe(0);
    // One hour off the routine, and the bonus is gone.
    const broken = setHours(c, [h('亥')], 'study').cultivator;
    expect(followedRoutine(broken)).toBeNull();
    expect(qiAt(broken, h('寅'))).toBeCloseTo(TUTORIAL_PACE / 12);
  });

  it('earn nothing from a wheel you saved yourself', () => {
    const s = opened();
    const c = followWheel(s.player, routine('watch-rotation').hours).cultivator;
    const saved = saveRoutine(c, 'My watch').cultivator;
    expect(saved.savedRoutines).toEqual([{ name: 'My watch', hours: c.wheel }]);
    expect(followedRoutine(saved)).toBeNull();
    expect(followedRoutine(learnRoutine(saved, 'watch-rotation'))?.id).toBe('watch-rotation');
  });

  it('can be followed only with every kind of hour open, and sleep where it is locked', () => {
    const fresh = player({ routines: ['watch-rotation', 'nine-midnights'] });
    expect(canFollow(fresh, routine('watch-rotation').hours)).toEqual({
      ok: false,
      reason: 'It needs practice hours.',
    });
    const c = opened().player;
    expect(canFollow(c, routine('watch-rotation').hours)).toEqual({ ok: true });
    expect(canFollow(c, routine('nine-midnights').hours)).toMatchObject({ ok: false });
  });
});

describe('the tutorial', () => {
  it('ignores fit and element hours in layers 1 to 3, and the root to 3, but not dawn or Aptitude', () => {
    const layer3 = (opts: LifeOpts) => at(player(opts), 'qi', { stage: 3 });
    const layer2 = (opts: LifeOpts) => at(player(opts), 'qi', { stage: 2 });
    const heavenly = dayRates(layer3({ root: 'heavenly' }), DAY);
    const mixed = dayRates(layer3({ root: 'mixed' }), DAY);
    expect(dayRates(layer2({ root: 'heavenly' }), DAY).qi).toBeCloseTo(
      dayRates(layer2({ root: 'mixed' }), DAY).qi,
    );
    // Layer 3's bar counts the root, nothing else.
    expect(heavenly.qi).toBeCloseTo((mixed.qi * 2.5) / 0.6);
    expect(heavenly.hours.every((x) => x.element === 0)).toBe(true);
    expect(qiAt(layer3({}), h('卯'))).toBeCloseTo((TUTORIAL_PACE * 1.1) / 12);
    expect(dayRates(layer3({ aptitude: 12 }), DAY).qi).toBeCloseTo(
      dayRates(layer3({}), DAY).qi * 1.1,
    );
    // Layer 4 counts all of it.
    const four = at(player({ root: 'heavenly' }), 'qi', { stage: 4 });
    expect(dayRates(four, DAY).qi).toBeGreaterThan(2.5 * mixed.qi);
  });
});

describe('the default rule', () => {
  it('starts with one study hour, and flips the qi hour worth least to each new kind, latest first', () => {
    let s = life();
    // A true root holds wood and fire, so 亥, 戌, 酉 and 申 match nothing and go first; study,
    // open from the start, has 亥 already.
    expect(s.player.wheel[h('亥')]).toBe('study');
    expect(hourKindOpen(s.player, 'study')).toBe(true);
    s = gainTechnique(s, 'rampart-palm');
    expect(s.player.wheel[h('戌')]).toBe('practice');
    s = gainMethod(s, FIRST_ARTS.body, 'is handed');
    expect(s.player.wheel[h('酉')]).toBe('body');
    expect(eventText(s, s.chronicle.at(-2)!)).toBe(
      'Han Li is handed the Stone-Bearing Tempering Art.',
    );
    s = gainMethod(s, FIRST_ARTS.soul);
    expect(s.player.wheel[h('申')]).toBe('soul');
    expect(effectiveWheel(s.player).filter((k) => k === 'qi')).toHaveLength(6);
  });

  it('spares hours that match the root, and dawn longest', () => {
    // A mixed root of wood, fire, metal and water matches every hour but earth's.
    const elements = ['wood', 'fire', 'metal', 'water'] as const;
    let wheel = [...FRESH_WHEEL];
    const order: string[] = [];
    for (let i = 0; i < 9; i++) {
      const hour = hourToFlip(wheel, elements)!;
      order.push(BRANCHES[hour]!.hanzi);
      wheel = wheel.map((k, j) => (j === hour ? 'study' : k));
    }
    expect(order).toEqual(['戌', '未', '辰', '亥', '酉', '申', '午', '巳', '寅']);
    expect(hourToFlip(wheel, elements)).toBe(h('卯'));
  });

  it('flips once per kind, so a rearranged wheel stays as you left it', () => {
    const s = opened();
    const c = setHours(s.player, [h('亥')], 'qi').cultivator;
    const after = cultivateDays(c, 1, ctx()).cultivator;
    expect(after.wheel[h('亥')]).toBe('qi');
    expect(dayRates(after, DAY).count.study).toBe(0);
  });

  it('refuses hours of a kind that has not opened', () => {
    expect(canSetHour(player(), h('辰'), 'practice')).toEqual({
      ok: false,
      reason: 'You have no practice hours yet.',
    });
    expect(canSetHour(player(), h('辰'), 'study')).toEqual({ ok: true });
    expect(canSetHour(opened().player, h('辰'), 'practice')).toEqual({ ok: true });
  });
});
