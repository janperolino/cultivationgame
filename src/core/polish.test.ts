// P1.9: the clock-speed choice, fresh news of people, the glass reroll and the v9 save.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { advance, clockChoices, clockRealm, setClock, yearsPerRealHour } from './loop.ts';
import { PEOPLE } from '../content/people.ts';
import { applyPersonEffect, hasNews, newsDay, peopleCircles, seePerson } from './people.ts';
import { loadSave } from './save/format.ts';
import { addEvent, newLife, rerollGlass, type GameState } from './state.ts';

const atRealm = (s: GameState, realm: GameState['player']['qi']['realm']): GameState => ({
  ...s,
  player: { ...s.player, qi: { ...s.player.qi, realm, stage: 1 } },
});

describe('the clock', () => {
  it('follows the realm until a slower reached speed is chosen', () => {
    const s = atRealm(newLife({ name: 'Clock', seed: 'clock' }), 'core-formation');
    expect(clockChoices(s)).toEqual([
      'qi-condensation',
      'foundation-establishment',
      'core-formation',
    ]);
    expect(yearsPerRealHour(s)).toBeCloseTo(500 / 120, 5);
    const slow = setClock(s, 'qi-condensation');
    expect(slow.clock).toBe('qi-condensation');
    expect(clockRealm(slow)).toBe('qi-condensation');
    expect(yearsPerRealHour(slow)).toBe(1);
    // Choosing the life's own realm goes back to following it.
    expect(setClock(slow, 'core-formation').clock).toBeNull();
  });

  it('never runs faster than the realm reached', () => {
    const s = newLife({ name: 'Clock', seed: 'clock' });
    expect(setClock(s, 'core-formation')).toBe(s);
    expect(clockChoices(s)).toEqual(['qi-condensation']);
  });

  it('a slower clock passes fewer days in the same real time', () => {
    const s = atRealm(newLife({ name: 'Clock', seed: 'clock' }), 'foundation-establishment');
    const fast = advance(s, 3_600_000).days;
    const slow = advance(setClock(s, 'qi-condensation'), 3_600_000).days;
    expect(slow).toBeCloseTo(360, 5);
    expect(fast).toBeGreaterThan(slow * 1.5);
  });
});

describe('news of people', () => {
  const cadet = () =>
    newLife({
      name: 'Han Li',
      seed: 'news',
      origin: { id: 'frontier-orphan', choice: 'along' },
    });

  it('testing day is not news; a card naming someone is, until their page is read', () => {
    let s = cadet();
    expect(hasNews(s, 'senior-zhao')).toBe(false);
    s = { ...s, calendar: { day: s.calendar.day + 40 } };
    s = addEvent(s, 'card', { card: 'x' }, [s.player.id, 'senior-zhao']);
    expect(newsDay(s, 'senior-zhao')).toBe(s.calendar.day);
    expect(hasNews(s, 'senior-zhao')).toBe(true);
    expect(hasNews(s, 'clerk-fan')).toBe(false);
    s = seePerson(s, 'senior-zhao');
    expect(hasNews(s, 'senior-zhao')).toBe(false);
  });

  it('meeting someone new is news', () => {
    const s = applyPersonEffect(cadet(), { do: 'person', who: 'peddler-gou' });
    expect(hasNews(s, 'peddler-gou')).toBe(true);
    expect(hasNews(seePerson(s, 'peddler-gou'), 'peddler-gou')).toBe(false);
  });
});

describe('the glass', () => {
  it('rerolls to a new seed the same way every time, and leaves the streams alone', () => {
    const s = newLife({ name: 'Glass', seed: 'glass' });
    const a = rerollGlass(s);
    expect(a.glass.seed).not.toBe(s.glass.seed);
    expect(rerollGlass(s).glass.seed).toBe(a.glass.seed);
    expect(a.rng).toEqual(s.rng);
    expect(a.seed).toBe(s.seed);
  });
});

describe('save v9', () => {
  it('migrates a v8 save: the clock follows the realm and nothing known is fresh', () => {
    const raw = JSON.parse(
      readFileSync(new URL('./save/fixtures/v8.json', import.meta.url), 'utf8'),
    );
    expect(raw.version).toBe(8);
    const s = loadSave(raw).state;
    expect(s.clock).toBeNull();
    for (const id of Object.keys(s.player.people)) expect(hasNews(s, id)).toBe(false);
  });
});

describe('the People screen circles', () => {
  it('groups kin first, then by where you met them, wanderers on the road', () => {
    let s = newLife({
      name: 'Han Li',
      seed: 'circles',
      origin: { id: 'cave-orphan', choice: 'along' },
      place: 'qm-anbian-fu',
    });
    s = applyPersonEffect(s, { do: 'person', who: 'peddler-gou' });
    s = { ...s, player: { ...s.player, place: 'qm-tushou-men' } };
    s = applyPersonEffect(s, { do: 'person', who: 'fang-tie' });
    const circles = peopleCircles(s.player);
    expect(circles.map((c) => c.key)).toEqual(['kin', 'qm-tushou-men', 'qm-anbian-fu', 'road']);
    expect(circles[0]!.people.map((p) => p.id)).toEqual(['aunt-yan']);
    expect(circles[1]!.label).toBe('At the Beast-Butcher Gate');
    expect(circles.at(-1)!.people.map((p) => p.id)).toEqual(['peddler-gou']);
  });

  it('every person has a one-character seal', () => {
    for (const p of PEOPLE) expect([...p.hanzi], p.id).toHaveLength(1);
  });
});
