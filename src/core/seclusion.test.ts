import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { card, CARDS, DECK_PACE, type Card, type CardOutcome } from '../content/cards/index.ts';
import { EVENT_TEMPLATES, fillSlots } from '../content/chronicle.ts';
import {
  ORIGIN_CHOICES,
  ORIGIN_IDS,
  type OriginChoice,
  type OriginId,
} from '../content/origins.ts';
import { hasPerson, PATH_PEOPLE, person, regardWords } from '../content/people.ts';
import { stageName } from '../content/realms.ts';
import {
  defaultChoice,
  drawCards,
  paceChance,
  playDay,
  resolveByDefault,
  resolveCard,
  triggerHolds,
  viewCard,
} from './cards.ts';
import { eventText, settledItself, whoFor } from './chronicle.ts';
import { comingBackStory } from './comingBack.ts';
import { createLife } from './creation.ts';
import { catchUp } from './loop.ts';
import { knownPeople, peopleFeed, personLog, resolveWho } from './people.ts';
import { loadSave } from './save/format.ts';
import { DAYS_PER_YEAR, daysLived, withPlayer, type GameState } from './state.ts';

const life = (
  origin: OriginId = 'cave-orphan',
  choice: OriginChoice = 'along',
  seed = 'seclusion',
): GameState =>
  createLife({
    name: 'Han Li',
    pronouns: 'he/him',
    look: '',
    mode: 'ironman',
    seed,
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

const atLived = (s: GameState, lived: number): GameState => ({
  ...s,
  calendar: { day: s.calendar.day + lived - daysLived(s.player, s.calendar.day) },
  cards: {
    ...s.cards,
    checked: Math.floor(s.calendar.day + lived - daysLived(s.player, s.calendar.day)),
  },
});

const pend = (s: GameState, id: string, uid = 1): GameState => ({
  ...s,
  cards: {
    ...s.cards,
    pending: [...s.cards.pending, { uid, card: id, day: s.calendar.day }],
    drawn: { ...s.cards.drawn, [id]: s.calendar.day },
    nextUid: Math.max(s.cards.nextUid, uid + 1),
  },
});

const SECLUSION = CARDS.filter((k) => k.deck === 'seclusion');
const PATHS = ORIGIN_IDS.flatMap((o) => ORIGIN_CHOICES.map((c) => [o, c] as const));

/** Every outcome of a card, opening and steps, with the step it belongs to. */
function outcomes(k: Card): { step: string | undefined; o: CardOutcome; def: boolean }[] {
  const steps = [[undefined, k] as const, ...Object.entries(k.steps ?? {})];
  return steps.flatMap(([id, st]) =>
    st.choices.flatMap((ch, i) =>
      [ch.pass, ...(ch.fail ? [ch.fail] : [])].map((o) => ({
        step: id,
        o,
        def: i === (st.defaultChoice ?? 0),
      })),
    ),
  );
}

/** Whether the parts of a trigger that a fresh life of this path can't change hold. */
const pathFits = (k: Card, s: GameState) =>
  (!k.trigger.origin || (s.player.origin && k.trigger.origin.includes(s.player.origin.id))) &&
  (!k.trigger.choice || s.player.origin?.choice === k.trigger.choice) &&
  triggerHolds(s, { people: k.trigger.people ?? [] });

describe('the seclusion deck as data', () => {
  it('holds the five kinds, about 25 cards a path, a few of them multi-step', () => {
    expect(new Set(SECLUSION.map((k) => k.kind))).toEqual(
      new Set(['door', 'within', 'sky', 'named-day', 'people']),
    );
    for (const [o, c] of PATHS) {
      const s = life(o, c);
      const n = SECLUSION.filter((k) => pathFits(k, s)).length;
      expect(n, `${o}/${c}`).toBeGreaterThanOrEqual(22);
      expect(n, `${o}/${c}`).toBeLessThanOrEqual(30);
    }
    expect(SECLUSION.filter((k) => k.steps).length).toBeGreaterThanOrEqual(3);
    expect(DECK_PACE.seclusion).toBeDefined();
  });

  it('every step leads somewhere real, every ending writes a line, and every default is free', () => {
    for (const k of CARDS) {
      const steps = [k, ...Object.values(k.steps ?? {})];
      for (const st of steps) {
        expect(st.choices.length, k.id).toBeGreaterThanOrEqual(1);
        expect(st.choices.length, k.id).toBeLessThanOrEqual(3);
        const d = st.choices[st.defaultChoice ?? 0]!;
        expect(d.cost, `${k.id} default is free`).toBeUndefined();
        expect(d.when, `${k.id} default is always offered`).toBeUndefined();
      }
      for (const { o } of outcomes(k)) {
        if (o.next) expect(k.steps?.[o.next], `${k.id} → ${o.next}`).toBeDefined();
        else expect(o.chronicle, `${k.id} ending has a line`).toBeTruthy();
      }
      // Every later step is reached by some outcome.
      const reached = new Set(outcomes(k).map(({ o }) => o.next));
      for (const id of Object.keys(k.steps ?? {}))
        expect(reached.has(id), `${k.id}.${id}`).toBe(true);
    }
  });

  it('fills every slot, and names only real people, on every path it can come to', () => {
    for (const k of SECLUSION) {
      for (const [o, c] of PATHS) {
        const s = life(o, c);
        if (!pathFits(k, s)) continue;
        const who = whoFor(s.player);
        const texts = [
          k.title,
          k.text,
          ...Object.values(k.steps ?? {}).map((st) => st.text),
          ...[k, ...Object.values(k.steps ?? {})].flatMap((st) => st.choices.map((ch) => ch.label)),
          ...outcomes(k).flatMap(({ o: x }) => [x.text, x.chronicle ?? '']),
        ];
        for (const t of texts) {
          expect(fillSlots(t, who), `${k.id} for ${o}/${c}`).not.toMatch(/\{[\w.]+\}/);
        }
        for (const { o: x } of outcomes(k)) {
          for (const e of x.effects) {
            if (e.do !== 'person') continue;
            expect(resolveWho(s.player, e.who), `${k.id}: ${e.who}`).toBeDefined();
          }
        }
      }
    }
  });

  it('names people the content knows, with a mentor on every path', () => {
    for (const [key, p] of Object.entries(PATH_PEOPLE)) {
      for (const a of p.knows) expect(hasPerson(a.id), `${key}: ${a.id}`).toBe(true);
      expect(p.mentor, key).toBeTruthy();
      const [o, c] = key.split('/') as [OriginId, OriginChoice];
      expect(resolveWho(life(o, c).player, 'mentor'), key).toBeDefined();
    }
  });
});

describe('drawing the seclusion deck', () => {
  it('paces by real time: lower odds a day where the clock runs faster', () => {
    const s = life();
    const qc = paceChance(s, 6.5);
    // One real hour is a year at Qi Condensation: about 9 cards an hour is 1 in 39 days.
    expect(qc).toBeCloseTo(1 - Math.exp(-10 / 390), 5);
    const fe = withPlayer(s, {
      ...s.player,
      qi: { ...s.player.qi, realm: 'foundation-establishment' },
    });
    expect(paceChance(fe, 6.5)).toBeLessThan(qc);
  });

  it('draws by trigger and season on the world stream, the same for the same seed', () => {
    let s = atLived(life(), 400);
    const a = drawCards(
      { ...s, calendar: { day: s.calendar.day + 400 } },
      { decks: ['seclusion'] },
    );
    const b = drawCards(
      { ...s, calendar: { day: s.calendar.day + 400 } },
      { decks: ['seclusion'] },
    );
    expect(a.cards).toEqual(b.cards);
    expect(a.rng.breakthrough).toBe(s.rng.breakthrough);
    // Over many years, seasonal cards come only in their season, and named days on their days.
    s = atLived(life('frontier-orphan', 'along', 'seasons'), 60);
    const seen: { id: string; day: number }[] = [];
    for (let i = 0; i < 3000; i++) {
      s = drawCards({ ...s, calendar: { day: s.calendar.day + 1 } }, { decks: ['seclusion'] });
      for (const p of s.cards.pending) seen.push({ id: p.card, day: p.day });
      while (s.cards.pending.length) s = resolveByDefault(s, s.cards.pending[0]!.uid);
    }
    const yearDay = (d: number) => Math.floor(d % DAYS_PER_YEAR);
    for (const { id, day } of seen) {
      const k = card(id);
      if (k.trigger.season?.includes('summer')) expect(yearDay(day)).toBeGreaterThanOrEqual(90);
      if (k.trigger.season?.includes('summer')) expect(yearDay(day)).toBeLessThan(180);
      if (k.trigger.yearDay) {
        expect(yearDay(day)).toBeGreaterThanOrEqual(k.trigger.yearDay[0]);
        expect(yearDay(day)).toBeLessThan(k.trigger.yearDay[1]);
      }
    }
    // Two or three a season, near enough, and many different cards.
    expect(seen.length / (3000 / 90)).toBeGreaterThan(1.5);
    expect(seen.length / (3000 / 90)).toBeLessThan(3.5);
    expect(new Set(seen.map((x) => x.id)).size).toBeGreaterThan(15);
    // A once-only card came at most once; cooldowns hold.
    for (const k of SECLUSION) {
      const days = seen.filter((x) => x.id === k.id).map((x) => x.day);
      if (k.once) expect(days.length, k.id).toBeLessThanOrEqual(1);
      for (let i = 1; i < days.length; i++) {
        expect(days[i]! - days[i - 1]!, k.id).toBeGreaterThanOrEqual(k.cooldown ?? 0);
      }
    }
  });
});

describe('multi-step cards', () => {
  it('go from step to step, carry their state, and write one line for the path', () => {
    let s = pend(withPlayer(life(), { ...life().player, stones: 20 }), 'thief');
    const n = s.chronicle.length;
    let r = resolveCard(s, 1, 1);
    expect(r).toMatchObject({ ok: true, done: false });
    s = r.state;
    expect(s.cards.pending[0]).toMatchObject({ card: 'thief', step: 'karst', path: [1] });
    expect(viewCard(s, s.cards.pending[0]!).text).toMatch(/karst/);
    expect(s.chronicle).toHaveLength(n);
    // Find a seed whose stone-reading passes, then take the stones back.
    let cornered: GameState | null = null;
    for (let i = 0; i < 60 && !cornered; i++) {
      const t = resolveCard({ ...s, rng: { ...s.rng, world: i * 7919 } }, 1, 1);
      if (!t.done) cornered = t.state;
    }
    if (!cornered) throw new Error('no passing roll');
    expect(cornered.cards.pending[0]).toMatchObject({ step: 'cornered', path: [1, 1] });
    r = resolveCard(cornered, 1, 0);
    expect(r.done).toBe(true);
    s = r.state;
    expect(s.cards.pending).toEqual([]);
    expect(s.player.stones).toBe(20);
    const lines = s.chronicle.slice(n);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.data).toMatchObject({ card: 'thief', step: 'cornered', path: '1.1.0' });
    expect(eventText(s, lines[0]!)).toBe(
      'Han Li tracks a thief through the karst and takes his stones back from a frightened boy.',
    );
  });

  it('offer a later choice only when an earlier step set its variable', () => {
    let s = pend(life(), 'thunderstorm');
    s = resolveCard(s, 1, 1).state;
    let steady: GameState | null = null;
    let shaken: GameState | null = null;
    for (let i = 0; i < 60 && (!steady || !shaken); i++) {
      const t = resolveCard({ ...s, rng: { ...s.rng, world: i * 104729 } }, 1, 1);
      if (t.pass) steady ??= t.state;
      else shaken ??= t.state;
    }
    if (!steady || !shaken) throw new Error('no rolls of both kinds');
    expect(steady.cards.pending[0]!.vars).toEqual({ steady: 1 });
    expect(viewCard(steady, steady.cards.pending[0]!).choices.map((c) => c.index)).toEqual([0, 1]);
    expect(viewCard(shaken, shaken.cards.pending[0]!).choices.map((c) => c.index)).toEqual([0]);
    expect(resolveCard(shaken, 1, 1)).toMatchObject({ ok: false });
  });

  it('settle by their defaults step by step when left alone', () => {
    let s = pend(withPlayer(life(), { ...life().player, stones: 20 }), 'thief');
    s = resolveCard(s, 1, 1).state; // follow the tracks, then walk off
    expect(defaultChoice(s.player, card('thief'), 'karst')).toBe(0);
    const done = resolveByDefault(s, 1);
    expect(done.cards.pending).toEqual([]);
    expect(done.player.stones).toBe(12);
    const e = done.chronicle.at(-1)!;
    expect(e.data).toMatchObject({ card: 'thief', step: 'karst', path: '1.0', byDefault: true });
    expect(eventText(done, e)).toMatch(/gives up the trail/);
    expect(settledItself(e)).toBe(true);
    // An urgent multi-step card defaults after its days, whatever step it stands at.
    const due = drawCards({ ...s, calendar: { day: s.calendar.day + 5 } }, { decks: [] });
    expect(due.cards.pending).toEqual([]);
  });
});

describe('people', () => {
  it('start with the people of their path, named on testing day', () => {
    const s = life('cave-orphan', 'along');
    expect(Object.keys(s.player.people).sort()).toEqual(['aunt-yan', 'sergeant-hou', 'tester-qiu']);
    expect(s.player.people['aunt-yan']).toMatchObject({ bond: 'kin', regard: 2, realm: null });
    const testing = s.chronicle.find((e) => e.type === 'testing')!;
    expect(testing.actors).toEqual(expect.arrayContaining(['player', 'aunt-yan']));
    expect(personLog(s, 'aunt-yan')).toEqual([testing]);
  });

  it('change only through cards that name them, and keep a log of everything they were part of', () => {
    let s = pend(atLived(life('frontier-orphan', 'along'), 500), 'senior-breakthrough');
    const before = s.player.people['senior-zhao']!;
    s = resolveCard(s, 1, 0).state;
    const after = s.player.people['senior-zhao']!;
    expect(after.realm).toEqual({ realm: 'qi-condensation', stage: before.realm!.stage + 1 });
    expect(after.heard).toBe(s.calendar.day);
    const log = personLog(s, 'senior-zhao');
    expect(log.at(-1)!.data.card).toBe('senior-breakthrough');
    expect(eventText(s, log.at(-1)!)).toBe(
      'Senior Brother Zhao breaks through, and Han Li promises him results.',
    );
    expect(peopleFeed(s)[0]).toBe(log.at(-1));
    expect(knownPeople(s.player)[0]!.id).toBe('senior-zhao');
    // A card through the {mentor} slot reaches the path's mentor; feelings move in words.
    s = pend(s, 'sect-summons', 2);
    s = resolveCard(s, 2, 0).state;
    expect(s.player.people['senior-zhao']!.regard).toBe(before.regard + 1);
    expect(regardWords(s.player.people['senior-zhao']!.regard)).toBe('thinks well of you');
    // Meeting someone new starts a record; a mortal has no realm.
    s = pend(s, 'junior-begging', 3);
    s = resolveCard(s, 3, 0).state;
    expect(s.player.people['little-ning']).toMatchObject({ bond: 'acquaintance', regard: 0 });
    expect(person('aunt-yan').mortal).toBe(true);
  });
});

describe('the coming-back story', () => {
  it('tells an hour away as a story: time, growth, what settled by kind, what waits', () => {
    const s = atLived(life('conscript', 'along', 'away'), 30);
    const away = catchUp(s, 0, 3_600_000, { step: playDay });
    const story = comingBackStory(s, away.state);
    expect(story.opening).toBe('A year passes in seclusion.');
    expect(story.growth.join(' ')).toMatch(/Your qi climbs from the first layer to the/);
    expect(away.state.cards.pending.length).toBeLessThanOrEqual(3);
    if (away.state.cards.pending.length) expect(story.waiting).toMatch(/wait/);
    const told = story.sections.flatMap((x) => x.lines);
    const settled = away.state.chronicle.filter((e) => e.type === 'card' && e.data.byDefault);
    expect(settled.length).toBeGreaterThan(0);
    expect(told.length).toBeGreaterThan(0);
    for (const l of told) expect(l).not.toMatch(/settled without you|\{/);
    for (const x of story.sections) expect(x.lines.length).toBeLessThanOrEqual(4);
  });

  it('a long absence groups many small cards', () => {
    const s = atLived(life('cave-orphan', 'refuse', 'long'), 30);
    const away = catchUp(s, 0, 12 * 3_600_000, { step: playDay });
    const story = comingBackStory(s, away.state);
    expect(story.opening).toBe('Twelve years pass in seclusion.');
    expect(story.sections.length).toBeGreaterThanOrEqual(3);
    expect(story.sections.flatMap((x) => x.lines).join(' ')).toMatch(/\((twice|\w+ times)\)/);
    // The short telling: one card a kind, at most four, out of everything that settled.
    expect(story.settled).toBeGreaterThan(5);
    expect(story.highlights.length).toBeGreaterThan(0);
    expect(story.highlights.length).toBeLessThanOrEqual(4);
  });

  it('tells qi gathered when no step was climbed', () => {
    const s = atLived(life(), 30);
    const away = catchUp(s, 0, 60_000, { step: playDay });
    const story = comingBackStory(s, away.state);
    expect(away.state.player.qi.stage).toBe(s.player.qi.stage);
    expect(story.growth.join(' ')).toMatch(/Your qi gathers toward the \w+ layer; the sea/);
  });
});

describe('save v8', () => {
  it('migrates a v7 save: people from the path, named on their old events', () => {
    const raw = JSON.parse(
      readFileSync(new URL('./save/fixtures/v7.json', import.meta.url), 'utf8'),
    );
    const s = loadSave(raw).state;
    expect(Object.keys(s.player.people).sort()).toEqual(['clerk-fan', 'senior-zhao']);
    const log = personLog(s, 'senior-zhao').map((e) => e.type);
    expect(log[0]).toBe('testing');
    expect(log).toContain('card');
    for (const e of s.chronicle) {
      expect(EVENT_TEMPLATES).toHaveProperty(e.type);
      expect(eventText(s, e)).not.toMatch(/\{\w+\}|undefined/);
    }
  });
});

describe('words', () => {
  it('names layers and stages in words', () => {
    expect(stageName('qi-condensation', 5)).toBe('fifth layer');
    expect(stageName('foundation-establishment', 2)).toBe('middle');
  });
});
