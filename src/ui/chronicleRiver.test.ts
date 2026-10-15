// The Chronicle as a river (P2.9): the world's year, every event type's kind, and the river and
// almanac cut from a made-up long life (core/madeUpLife.ts).
import { describe, expect, it } from 'vitest';
import { CARDS } from '../content/cards/index.ts';
import {
  CHRONICLE_KINDS,
  EVENT_KINDS,
  EVENT_TEMPLATES,
  STATION_KINDS,
  eventKind,
} from '../content/chronicle.ts';
import { worldWhen, worldYear, yearDigits, yearStartDay } from '../core/chronicle.ts';
import { madeUpLife } from '../core/madeUpLife.ts';
import { DAYS_PER_YEAR, newLife } from '../core/state.ts';
import {
  ageIn,
  almanacRows,
  lifeLabel,
  lineOf,
  livesOf,
  qiAfterSeason,
  qiBefore,
  quietYear,
  riverItems,
  yearCount,
  yearsOf,
  type RiverItem,
} from './chronicleRiver.ts';

const base = newLife({ name: 'Mo Ning', pronouns: 'he/him' });
const game = madeUpLife(base);
const lives = livesOf(game);
const [lan, mo] = lives as [(typeof lives)[0], (typeof lives)[0]];
const moRows = yearsOf(mo);
const lanRows = yearsOf(lan);

describe('the world’s year', () => {
  it('counts the Sealed Era from 3,115 on day 0', () => {
    expect(worldYear(0)).toBe(3115);
    expect(worldYear(DAYS_PER_YEAR - 1)).toBe(3115);
    expect(worldYear(DAYS_PER_YEAR)).toBe(3116);
    expect(yearStartDay(3127)).toBe(12 * DAYS_PER_YEAR);
    expect(yearDigits(3137)).toBe('3,137');
    expect(yearDigits(912)).toBe('912');
  });

  it('puts a first life’s first hour at 12 in 3,127', () => {
    expect(worldYear(base.calendar.day)).toBe(3127);
    expect(worldWhen(base.calendar.day)).toBe('Spring 3,127');
    expect(worldWhen(base.calendar.day + 280)).toBe('Winter 3,127');
    expect(ageIn(base.player.bornDay, 3127)).toBe(12);
  });
});

describe('the kinds', () => {
  it('names a kind for every event type, and none for a type without a template', () => {
    expect(Object.keys(EVENT_KINDS).sort()).toEqual(Object.keys(EVENT_TEMPLATES).sort());
    for (const k of STATION_KINDS) expect(CHRONICLE_KINDS).toContain(k);
  });

  it('gives every card line a known kind', () => {
    for (const card of CARDS) {
      const steps = [card, ...Object.values(card.steps ?? {})];
      for (const ch of steps.flatMap((s) => s.choices)) {
        for (const o of [ch.pass, ch.fail]) {
          if (o?.kind) expect(CHRONICLE_KINDS).toContain(o.kind);
        }
      }
    }
  });

  it('reads steps by ladder, setbacks as hurts, and cards by how they ended', () => {
    expect(eventKind('breakthrough', { ladder: 'body' })).toBe('body');
    expect(eventKind('major', { ladder: 'qi' })).toBe('qi');
    expect(eventKind('setback', { ladder: 'soul' })).toBe('hurt');
    expect(eventKind('intent', {})).toBe('mastery');
    expect(eventKind('no-such-type', {})).toBe('opening');
    const tagged = CARDS.find((c) => c.choices.some((ch) => ch.pass.kind === 'learned'))!;
    const i = tagged.choices.findIndex((ch) => ch.pass.kind === 'learned');
    expect(eventKind('card', { card: tagged.id, choice: i })).toBe('learned');
    expect(eventKind('card', { card: tagged.id, choice: i, byDefault: true })).toBe('settled');
  });
});

describe('lives', () => {
  it('cuts the slot’s chronicle at each birth line, each under its own name', () => {
    expect(lives).toHaveLength(2);
    expect(lan.name).toBe('Lan Shu');
    expect(lan.current).toBe(false);
    expect(mo.current).toBe(true);
    const death = lan.events.find((e) => e.type === 'death')!;
    expect(lineOf(lan, death)).toBe('Lan Shu dies at 63, at the third layer of Qi Condensation.');
    expect(lifeLabel(lan, 2)).toBe('The life before · Lan Shu, 3,115–3,178');
    expect(lifeLabel(mo, 2)).toBe('This life · Mo Ning, from 3,167');
  });

  it('runs a life’s years from its first hour to today, the ages counting up', () => {
    expect(moRows[0]).toMatchObject({ year: 3179, age: 12 });
    expect(moRows.at(-1)).toMatchObject({ year: 3213, age: 46 });
    expect(lanRows.at(-1)).toMatchObject({ age: 63, died: true });
    const major = moRows.find((r) => r.newRealm)!;
    expect(major.age).toBe(23);
    expect(major.qi).toEqual({ realm: 'foundation-establishment', stage: 1 });
  });
});

describe('the river', () => {
  const items = riverItems(mo, moRows);
  const of = <K extends RiverItem['kind']>(k: K) =>
    items.filter((it): it is Extract<RiverItem, { kind: K }> => it.kind === k);

  it('opens a chapter where each qi realm begins, with its ages and years', () => {
    const chapters = of('chapter').map((c) => c.chapter);
    expect(items[0]!.kind).toBe('chapter');
    expect(chapters).toEqual([
      { realm: 'foundation-establishment', ages: [23, 46], years: [3190, 3213], now: true },
      { realm: 'qi-condensation', ages: [12, 22], years: [3179, 3189], now: false },
    ]);
  });

  it('keeps long seclusion as a stretch with every year a row', () => {
    const [stretch, ...more] = of('stretch');
    expect(more).toHaveLength(0);
    expect(stretch!.ages).toEqual([24, 41]);
    expect(stretch!.rows).toHaveLength(18);
    expect(stretch!.rows.every(quietYear)).toBe(true);
    expect(stretch!.gave).toBe('2 stages of qi, a body layer');
    // Lan Shu's rented cell: eight quiet years, a body layer among them.
    const lanStretch = riverItems(lan, lanRows).find((it) => it.kind === 'stretch');
    expect(lanStretch).toMatchObject({ ages: [24, 31], gave: 'a body layer' });
  });

  it('folds the years before the first hour into one line', () => {
    expect(items.at(-1)).toEqual({ kind: 'fold', ages: [0, 11], years: [3167, 3178] });
    expect(of('fold')).toHaveLength(1);
    expect(yearCount(items)).toBe(moRows.length);
  });

  it('pages by years, the fold only once every year shows', () => {
    const page = riverItems(mo, moRows, 10);
    expect(yearCount(page)).toBe(10);
    expect(page.some((it) => it.kind === 'fold')).toBe(false);
    const into = riverItems(mo, moRows, 30);
    const cut = into.find((it) => it.kind === 'stretch')!;
    expect(cut).toMatchObject({ ages: [24, 41] });
    expect(yearCount(into)).toBe(30);
  });
});

describe('the almanac', () => {
  const items = riverItems(mo, moRows);

  it('has a row per year with four seasons, newest first, the seclusion banded', () => {
    const rows = almanacRows(items, new Set());
    const years = rows.filter((r) => r.kind === 'year');
    expect(years).toHaveLength(moRows.length);
    expect(years[0]!.row.year).toBe(3213);
    for (const r of years) expect(r.cells).toHaveLength(4);
    expect(rows.filter((r) => r.kind === 'band')).toEqual([
      { kind: 'band', years: [3191, 3208], ages: [24, 41], gave: '2 stages of qi, a body layer' },
    ]);
    expect(years.filter((r) => r.inStretch)).toHaveLength(18);
    expect(rows.at(-1)!.kind).toBe('fold');
  });

  it('edges qi steps and the new realm, and ends each year with where the qi stood', () => {
    const years = almanacRows(items, new Set()).filter((r) => r.kind === 'year');
    const realmYear = years.find((r) => r.row.age === 23)!;
    expect(realmYear.cells.filter((c) => c.newRealm)).toHaveLength(1);
    expect(realmYear.end).toBe('Foundation Establishment, early stage');
    const layer9 = years.find((r) => r.row.age === 20)!;
    expect(layer9.cells.some((c) => c.rise)).toBe(true);
    expect(layer9.end).toBe('Qi Condensation, ninth layer');
  });

  it('shows only the kinds the chips leave on', () => {
    const all = almanacRows(items, new Set()).filter((r) => r.kind === 'year');
    const kinds = all.flatMap((r) => r.cells.flatMap((c) => c.kinds));
    expect(kinds).toContain('settled');
    const off = almanacRows(items, new Set(['settled', 'qi'])).filter((r) => r.kind === 'year');
    const left = off.flatMap((r) => r.cells.flatMap((c) => c.kinds));
    expect(left).not.toContain('settled');
    expect(left).not.toContain('qi');
    expect(left.length).toBe(kinds.filter((k) => k !== 'settled' && k !== 'qi').length);
    expect(off.filter((r) => r.quiet).length).toBeGreaterThan(all.filter((r) => r.quiet).length);
  });

  it('reads where the qi stood after a picked season', () => {
    const row = moRows.find((r) => r.age === 23)!;
    const before = qiBefore(moRows, row.year);
    expect(before).toEqual({ realm: 'qi-condensation', stage: 9 });
    expect(qiAfterSeason(row, 0)).toEqual(before);
    expect(qiAfterSeason(row, 3).realm).toBe('foundation-establishment');
  });
});
