// The Chronicle as a river and an almanac (design § UI and screens, The Chronicle screen; P2.9):
// pure helpers that cut the slot's one chronicle into lives, a life into the world's years and its
// seasons, and the years into the river's items: chapters where each qi realm begins, year rows,
// stretches of seclusion with every year a row, and the years before the first hour folded into
// one line. The screen (ChronicleScreen.tsx) draws them; the almanac reads the same items.
import { eventKind, pronounWords, type ChronicleKind, type Who } from '../content/chronicle.ts';
import { realm, stageName, type RealmId } from '../content/realms.ts';
import {
  renderEvent,
  seasonIndex,
  whoFor,
  worldYear,
  yearDigits,
  yearStartDay,
} from '../core/chronicle.ts';
import { DAYS_PER_YEAR, START_AGE, type ChronicleEvent, type GameState } from '../core/state.ts';

// ---------------------------------------------------------------- lives

/** One life in the slot, on the world's calendar. */
export interface Life {
  /** 0 for the slot's first life. */
  index: number;
  current: boolean;
  /** The name on its birth line; an old save's earlier lives have none. */
  name: string | null;
  /** Who its lines are written about. */
  who: Who;
  bornDay: number;
  /** Root-testing day, the first hour, where its chronicle begins. */
  startDay: number;
  /** Its death, the next life's first hour, or today while it runs. */
  endDay: number;
  died: boolean;
  /** Oldest first. */
  events: ChronicleEvent[];
}

/** The slot's lives, oldest first, cut from the one chronicle at each birth line. */
export function livesOf(game: GameState): Life[] {
  const groups: ChronicleEvent[][] = [];
  for (const e of game.chronicle) {
    if (e.type === 'birth' || groups.length === 0) groups.push([]);
    groups.at(-1)!.push(e);
  }
  if (groups.length === 0) groups.push([]);
  const base = whoFor(game.player);
  return groups.map((events, i) => {
    const current = i === groups.length - 1;
    const birth = events.find((e) => e.type === 'birth');
    const startDay = birth?.day ?? events[0]?.day ?? game.calendar.day;
    const death = events.findLast((e) => e.type === 'death');
    const named = typeof birth?.data.name === 'string' ? birth.data.name : null;
    const name = named ?? (current ? game.player.name : null);
    const pronouns = typeof birth?.data.pronouns === 'string' ? birth.data.pronouns : null;
    const who: Who =
      current || !named ? base : { ...base, name: named, ...pronounWords(pronouns ?? 'they') };
    const nextStart = groups[i + 1]?.[0]?.day;
    const endDay = current
      ? (game.ended?.day ?? game.calendar.day)
      : (death?.day ?? nextStart ?? startDay);
    return {
      index: i,
      current,
      name,
      who,
      bornDay: current ? game.player.bornDay : startDay - START_AGE * DAYS_PER_YEAR,
      startDay,
      endDay,
      died: current ? game.ended !== null : true,
      events,
    };
  });
}

/** An event's line, about the life it belongs to. */
export function lineOf(life: Life, e: ChronicleEvent): string {
  return renderEvent(e.type, e.data, life.who);
}

/** "This life · Mo Ning, from 3,115", "The life before · Lan Shu, 3,052–3,114". */
export function lifeLabel(life: Life, count: number): string {
  const name = life.name ?? 'name not kept';
  const born = yearDigits(worldYear(life.bornDay));
  if (life.current) {
    return life.died
      ? `This life · ${name}, ${born}–${yearDigits(worldYear(life.endDay))}`
      : `This life · ${name}, from ${born}`;
  }
  const back = count - 1 - life.index;
  const before = back === 1 ? 'The life before' : `${back} lives before`;
  return `${before} · ${name}, ${born}–${yearDigits(worldYear(life.endDay))}`;
}

// ---------------------------------------------------------------- the years

export interface QiLevel {
  realm: RealmId;
  stage: number;
}

/** One world year of a life: its age, its seasons' events, and where its qi stood at the end. */
export interface YearRow {
  year: number;
  age: number;
  /** Spring to winter, each oldest first, every line (the chips filter at drawing). */
  seasons: ChronicleEvent[][];
  qi: QiLevel;
  /** A qi step this year, and a new qi realm. */
  rise: boolean;
  newRealm: boolean;
  died: boolean;
}

const START: QiLevel = { realm: 'qi-condensation', stage: 1 };

/** Where an event leaves the qi ladder, or null when it doesn't move it. */
function qiStep(e: ChronicleEvent): QiLevel | null {
  if (e.data.ladder !== 'qi') return null;
  if (e.type === 'breakthrough') {
    return { realm: e.data.realm as RealmId, stage: Number(e.data.stage) };
  }
  if (e.type === 'major') return { realm: e.data.realm as RealmId, stage: 1 };
  return null;
}

/** The age a life reaches in a world year, counted at the year's turn. */
export function ageIn(bornDay: number, year: number): number {
  return Math.max(0, Math.round((yearStartDay(year) - bornDay) / DAYS_PER_YEAR));
}

/** A life's years from its first hour to its end, oldest first. */
export function yearsOf(life: Life): YearRow[] {
  const first = worldYear(life.startDay);
  const last = Math.max(first, worldYear(life.endDay));
  const rows: YearRow[] = [];
  let qi = START;
  let k = 0;
  for (let year = first; year <= last; year++) {
    const seasons: ChronicleEvent[][] = [[], [], [], []];
    let rise = false;
    let newRealm = false;
    let died = false;
    while (k < life.events.length && worldYear(life.events[k]!.day) <= year) {
      const e = life.events[k++]!;
      seasons[seasonIndex(e.day)]!.push(e);
      const step = qiStep(e);
      if (step) {
        qi = step;
        rise = true;
        if (e.type === 'major') newRealm = true;
      }
      if (e.type === 'death') died = true;
    }
    rows.push({ year, age: ageIn(life.bornDay, year), seasons, qi, rise, newRealm, died });
  }
  return rows;
}

/** "Qi Condensation, fifth layer", "Foundation Establishment, middle stage". */
export function levelWords(qi: QiLevel): string {
  const stage = stageName(qi.realm, qi.stage);
  return qi.realm === 'qi-condensation'
    ? `Qi Condensation, ${stage}`
    : `${realm(qi.realm).name}, ${stage} stage`;
}

// ---------------------------------------------------------------- the river's items

/** Lines that leave a year quiet: steps within a realm, mastery, and cards that settled. */
const QUIET_TYPES = new Set(['breakthrough', 'mastery']);
/** A stretch of seclusion is this many quiet years in a row, or more. */
export const STRETCH_YEARS = 3;

function quietEvent(e: ChronicleEvent): boolean {
  return QUIET_TYPES.has(e.type) || eventKind(e.type, e.data) === 'settled';
}

/** A year with nothing but steps and cards that settled themselves (or nothing at all). */
export function quietYear(r: YearRow): boolean {
  return r.seasons.every((s) => s.every(quietEvent));
}

export interface Chapter {
  realm: RealmId;
  ages: [number, number];
  years: [number, number];
  /** It runs on to today. */
  now: boolean;
}

export type RiverItem =
  | { kind: 'chapter'; chapter: Chapter }
  | { kind: 'year'; row: YearRow }
  /** Newest first; `rows` may be cut short by paging, the span and summary are the whole stretch. */
  | {
      kind: 'stretch';
      rows: YearRow[];
      years: [number, number];
      ages: [number, number];
      gave: string;
    }
  | { kind: 'fold'; ages: [number, number]; years: [number, number] };

/** "2 stages of qi, a body layer": what a stretch gave. */
export function stretchGave(rows: readonly YearRow[]): string {
  const count = (pred: (e: ChronicleEvent) => boolean) =>
    rows.reduce((n, r) => n + r.seasons.flat().filter(pred).length, 0);
  const steps = (ladder: string) =>
    count((e) => e.type === 'breakthrough' && e.data.ladder === ladder);
  const parts: string[] = [];
  const words = (n: number, one: string, many: string) => {
    if (n) parts.push(n === 1 ? one : `${n} ${many}`);
  };
  words(steps('qi'), 'a stage of qi', 'stages of qi');
  words(steps('body'), 'a body layer', 'body layers');
  words(steps('soul'), 'a soul layer', 'soul layers');
  words(
    count((e) => e.type === 'mastery'),
    'a level of mastery',
    'levels of mastery',
  );
  return parts.join(', ');
}

/** The realm's chapters over a life's years: ages and world years each realm spans. */
function chapters(rows: readonly YearRow[], current: boolean): Map<number, Chapter> {
  const byFirstYear = new Map<number, Chapter>();
  let open: Chapter | null = null;
  for (const r of rows) {
    if (!open || open.realm !== r.qi.realm) {
      open = { realm: r.qi.realm, ages: [r.age, r.age], years: [r.year, r.year], now: false };
      byFirstYear.set(r.year, open);
    }
    open.ages[1] = r.age;
    open.years[1] = r.year;
  }
  if (open && current) open.now = true;
  return byFirstYear;
}

/**
 * The river, newest first: a chapter heading each qi realm's years, the years themselves, quiet
 * runs of three or more as stretches of seclusion, and the years before the first hour as one
 * fold. `limit` pages by years: at most that many year rows, a stretch's counted one by one.
 */
export function riverItems(life: Life, rows: readonly YearRow[], limit = Infinity): RiverItem[] {
  // Chapters are keyed by their oldest year; the river meets each at its newest.
  const chapterOf = new Map<number, Chapter>();
  for (const ch of chapters(rows, life.current && !life.died).values()) {
    chapterOf.set(ch.years[1], ch);
  }
  const newest = rows.slice().reverse();
  const out: RiverItem[] = [];
  let left = limit;
  let i = 0;
  while (i < newest.length && left > 0) {
    const ch = chapterOf.get(newest[i]!.year);
    if (ch) out.push({ kind: 'chapter', chapter: ch });
    // A quiet run within this chapter, from here back.
    let j = i;
    while (
      j < newest.length &&
      quietYear(newest[j]!) &&
      (j === i || !chapterOf.has(newest[j]!.year))
    )
      j++;
    if (j - i >= STRETCH_YEARS) {
      const all = newest.slice(i, j);
      const shown = all.slice(0, left);
      out.push({
        kind: 'stretch',
        rows: shown,
        years: [all.at(-1)!.year, all[0]!.year],
        ages: [all.at(-1)!.age, all[0]!.age],
        gave: stretchGave(all),
      });
      left -= shown.length;
      i = j;
      continue;
    }
    out.push({ kind: 'year', row: newest[i]! });
    left--;
    i++;
  }
  if (i >= newest.length) {
    const first = rows[0];
    const bornYear = worldYear(life.bornDay);
    if (first && first.year > bornYear) {
      out.push({
        kind: 'fold',
        ages: [0, Math.max(0, first.age - 1)],
        years: [bornYear, first.year - 1],
      });
    }
  }
  return out;
}

/** Year rows the river holds in all, for paging. */
export function yearCount(items: readonly RiverItem[]): number {
  return items.reduce(
    (n, it) => n + (it.kind === 'year' ? 1 : it.kind === 'stretch' ? it.rows.length : 0),
    0,
  );
}

// ---------------------------------------------------------------- what shows

/** The kinds a chip has switched off. */
export type KindsOff = ReadonlySet<ChronicleKind>;

export function shows(e: ChronicleEvent, off: KindsOff): boolean {
  return !off.has(eventKind(e.type, e.data));
}

/** A year's lines that show, all seasons. */
export function shownIn(r: YearRow, off: KindsOff): ChronicleEvent[] {
  return r.seasons.flat().filter((e) => shows(e, off));
}

// ---------------------------------------------------------------- the almanac

export interface AlmanacCell {
  season: number;
  kinds: ChronicleKind[];
  /** A qi step, edged in the qi color; a new realm, edged in gilt. */
  rise: boolean;
  newRealm: boolean;
}

export type AlmanacRow =
  | {
      kind: 'year';
      row: YearRow;
      cells: AlmanacCell[];
      quiet: boolean;
      inStretch: boolean;
      end: string;
    }
  | { kind: 'band'; years: [number, number]; ages: [number, number]; gave: string }
  | { kind: 'fold'; ages: [number, number]; years: [number, number] };

/** "Qi Condensation, ninth layer", or "Died at 63" in the year a life ended. */
function yearEnd(r: YearRow): string {
  return r.died ? `Died at ${r.age}` : levelWords(r.qi);
}

function almanacYear(r: YearRow, off: KindsOff, inStretch: boolean): AlmanacRow {
  const cells = r.seasons.map((es, season) => {
    const shown = es.filter((e) => shows(e, off));
    return {
      season,
      kinds: shown.map((e) => eventKind(e.type, e.data)),
      rise: es.some((e) => qiStep(e) !== null),
      newRealm: es.some((e) => e.type === 'major' && e.data.ladder === 'qi'),
    };
  });
  const quiet = cells.every((c) => c.kinds.length === 0);
  return { kind: 'year', row: r, cells, quiet, inStretch, end: yearEnd(r) };
}

/** The almanac's rows from the river's items: a row per year, newest first, with the chips. */
export function almanacRows(items: readonly RiverItem[], off: KindsOff): AlmanacRow[] {
  const out: AlmanacRow[] = [];
  for (const it of items) {
    if (it.kind === 'year') out.push(almanacYear(it.row, off, false));
    else if (it.kind === 'stretch') {
      out.push({ kind: 'band', years: it.years, ages: it.ages, gave: it.gave });
      for (const r of it.rows) out.push(almanacYear(r, off, true));
    } else if (it.kind === 'fold') out.push({ kind: 'fold', ages: it.ages, years: it.years });
  }
  return out;
}

/** The latest season of a year with a line that shows, else winter: where a year's link lands. */
export function lastSeason(r: YearRow, off: KindsOff): number {
  for (let s = 3; s >= 0; s--) if (r.seasons[s]!.some((e) => shows(e, off))) return s;
  return 3;
}

/** Where the qi stood after a season of a year. */
export function qiAfterSeason(r: YearRow, season: number, before: QiLevel): QiLevel {
  let qi = before;
  for (let s = 0; s <= season; s++) {
    for (const e of r.seasons[s]!) qi = qiStep(e) ?? qi;
  }
  return qi;
}

/** Where the qi stood when a year opened: the year before's end, or the start. */
export function qiBefore(rows: readonly YearRow[], year: number): QiLevel {
  const i = rows.findIndex((r) => r.year === year);
  return i > 0 ? rows[i - 1]!.qi : START;
}
