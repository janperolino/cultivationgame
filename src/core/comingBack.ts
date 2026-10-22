// The coming-back story (design § UI and screens, Coming back; § Story cards and events): after
// time away, what happened is told as a story rather than a ledger. It opens on how long passed,
// says how each ladder grew and what broke, then tells the cards that settled without you by kind,
// at the door, within, under the sky, on the named days and among people, each card once with how
// many times it came, and ends on what still waits. It never mentions what attending would have
// earned. What your powers did with you while you were away is told beside the growth (O3).
import { card, type CardKind } from '../content/cards/index.ts';
import { LADDERS } from '../content/cultivation.ts';
import { encounterTemplate } from '../content/encounters/index.ts';
import { stepLabel } from '../content/chronicle.ts';
import { realm } from '../content/realms.ts';
import { capitalize, countWord, spanWords, timesWord } from '../content/words.ts';
import { renderEvent, whoFor } from './chronicle.ts';
import { barFill, majorCheck, type LadderId } from './cultivation.ts';
import { firstsWaitingLines } from './firsts.ts';
import {
  burnedGradesWords,
  fuelRanOut,
  priceWords,
  realmGrade,
  stonesOf,
  worthOf,
} from './purse.ts';
import type { GameState, Ladder } from './state.ts';

export interface StorySection {
  heading: string;
  lines: string[];
}

export interface ComingBackStory {
  /** "Two seasons pass in seclusion." */
  opening: string;
  /** How the ladders grew, what broke, what was gained and spent. */
  growth: string[];
  /** The cards settled without you, by kind. */
  sections: StorySection[];
  /** One card a kind, the one that came most, for the short telling of a long absence. */
  highlights: string[];
  /** How many cards settled without you in all. */
  settled: number;
  /** "Three cards wait for you in the tray.", or null. */
  waiting: string | null;
  /** The breakthrough waiting on you, or null. */
  ready: string | null;
  /** Each first time still waiting on you (core/firsts.ts): "Your tempering art waits for an hour." */
  firsts: string[];
}

const HEADINGS: Record<CardKind | 'story', string> = {
  door: 'At the door',
  within: 'Within',
  sky: 'Sky and season',
  'named-day': 'The days that came round',
  people: 'People',
  story: 'Along the way',
};
const ORDER: (CardKind | 'story')[] = ['story', 'door', 'within', 'sky', 'named-day', 'people'];

/** Distinct cards told per kind before the rest are summed up. */
const PER_SECTION = 3;
/** Kinds in the order a short telling reaches for them, and how many it tells. */
const HIGHLIGHT_ORDER: (CardKind | 'story')[] = [
  'story',
  'people',
  'named-day',
  'door',
  'within',
  'sky',
];
const HIGHLIGHTS = 4;

const LADDER_WORDS: Record<LadderId, { name: string; verb: string }> = {
  qi: { name: 'qi', verb: 'climbs' },
  body: { name: 'body', verb: 'tempers its way' },
  soul: { name: 'soul', verb: 'deepens' },
};

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Lines from the road told before the rest are summed up. */
const ROAD_LINES = 5;

/** "… results." told three times reads "… results (three times)." */
function withTimes(line: string, times: number): string {
  if (times <= 1) return line;
  const m = /^(.*?)([.!?]*)$/s.exec(line)!;
  return `${m[1]} (${timesWord(times)})${m[2] || '.'}`;
}

function growthLine(which: LadderId, from: Ladder, to: Ladder): string | null {
  if (from.realm === to.realm && from.stage === to.stage) return null;
  const w = LADDER_WORDS[which];
  if (from.realm !== to.realm) {
    return `Your ${w.name} breaks through to ${realm(to.realm).name}, and stands at ${stepLabel(to.realm, to.stage)}.`;
  }
  return `Your ${w.name} ${w.verb} from ${stepLabel(from.realm, from.stage)} to ${stepLabel(to.realm, to.stage)}.`;
}

/** How full the qi sea is, in words. */
function fillWords(fill: number): string {
  if (fill >= 1) return 'brimming';
  if (fill >= 0.75) return 'nearly full';
  if (fill >= 0.5) return 'more than half full';
  if (fill >= 0.25) return 'filling';
  return 'barely stirred';
}

/** When qi gathered without climbing a step: what it gathers toward and how full it is. */
function qiLine(from: Ladder, to: Ladder): string | null {
  if (from.realm !== to.realm || from.stage !== to.stage || to.bar <= from.bar) return null;
  const top = to.stage >= realm(to.realm).stages;
  const toward = top ? 'the gate of the next realm' : stepLabel(to.realm, to.stage + 1);
  return `Your qi gathers toward ${toward}; the sea in your dantian is ${fillWords(barFill(to))}.`;
}

/** The story of the time between two states of the same life. */
export function comingBackStory(before: GameState, after: GameState): ComingBackStory {
  const days = after.calendar.day - before.calendar.day;
  const span = spanWords(days);
  // On a course the time passes on the road, and what it brought is told under its own heading (P3.7).
  const road = (after.map?.road ?? []).filter((l) => l.day > before.calendar.day);
  const onRoad = !!after.map?.course || road.length > 0;
  const opening = `${capitalize(span.text)} ${span.plural ? 'pass' : 'passes'} ${onRoad ? 'on the road' : 'in seclusion'}.`;

  const since = after.chronicle.slice(before.chronicle.length);
  const growth: string[] = [];
  for (const which of ['qi', 'body', 'soul'] as const) {
    const line =
      growthLine(which, before.player[which], after.player[which]) ??
      (which === 'qi' ? qiLine(before.player.qi, after.player.qi) : null);
    if (line) growth.push(line);
    const broke = since.filter((e) => e.type === 'setback' && e.data.ladder === which).length;
    if (broke > 0) {
      growth.push(
        `${capitalize(timesWord(broke))} the ${LADDER_WORDS[which].name} broke against the next step and scattered.`,
      );
    }
  }
  const insight = after.player.insight.earned - before.player.insight.earned;
  if (insight >= 1) growth.push(`Understanding gathers: ${Math.floor(insight)} insight.`);
  const stones = worthOf(stonesOf(after.player)) - worthOf(stonesOf(before.player));
  // Burning ran the pouch dry while you were away: the toast that says so at the seat doesn't come.
  const ranOut = fuelRanOut(before.player, after.player);
  if (ranOut?.waits) {
    const burned = burnedGradesWords(realmGrade(after.player.qi.realm));
    growth.push(
      `Your ${burned} stones burned out: ${ranOut.waits} waits whole, unbroken, and the qi hours burn none until you break it or have more.`,
    );
  } else if (ranOut)
    growth.push('Your spirit stones ran out: the qi hours burn none until you have more.');
  else if (stones <= -1)
    growth.push(
      `Spirit stones worth ${priceWords(Math.floor(-stones))} are gone, burned or spent.`,
    );
  else if (stones >= 1) growth.push(`Your pouch is ${priceWords(Math.floor(stones))} heavier.`);

  // What your powers did while you were away (O3): a quota missed away is missed, and told here;
  // so are the shifts a job counted missed and a hire letting you go for them (the review's).
  const who = whoFor(after.player);
  // A power's repeated line is one line with its count (the checkpoint's fix).
  const told = new Map<string, { line: string; times: number }>();
  for (const e of since) {
    const job = e.type === 'job' && (e.data.what === 'missed' || e.data.what === 'let-go');
    if (e.type !== 'power' && !job) continue;
    const key = `${e.type}|${String(e.data.power ?? e.data.job)}|${String(e.data.what)}`;
    const g = told.get(key);
    if (g) g.times++;
    else told.set(key, { line: renderEvent(e.type, e.data, who), times: 1 });
  }
  for (const g of told.values()) growth.push(withTimes(g.line, g.times));

  // Each card settled without you, once, with the line its last coming wrote.
  const groups = new Map<string, { kind: CardKind | 'story'; line: string; times: number }>();
  for (const e of since) {
    if (e.type !== 'card' || !e.data.byDefault) continue;
    const id = String(e.data.card);
    const line = renderEvent(e.type, { ...e.data, byDefault: false }, who);
    const g = groups.get(id);
    if (g) {
      g.times++;
      g.line = line;
    } else groups.set(id, { kind: card(id).kind ?? 'story', line, times: 1 });
  }
  const sections: StorySection[] = [];
  for (const kind of ORDER) {
    const told = [...groups.values()].filter((g) => g.kind === kind);
    if (!told.length) continue;
    const lines = told.slice(0, PER_SECTION).map((g) => withTimes(g.line, g.times));
    const rest = told.slice(PER_SECTION).reduce((n, g) => n + g.times, 0);
    if (rest > 0) lines.push(`And ${rest === 1 ? 'one thing more' : `${rest} things more`}.`);
    sections.push({ heading: HEADINGS[kind], lines });
  }

  if (road.length) {
    const lines = road.slice(0, ROAD_LINES).map((l) => l.text);
    const rest = road.length - lines.length;
    if (rest > 0)
      lines.push(`And ${rest === 1 ? 'one thing more' : `${rest} things more`} on the road.`);
    sections.unshift({ heading: 'On the road', lines });
  }

  const highlights: string[] = [];
  for (const kind of HIGHLIGHT_ORDER) {
    if (highlights.length >= HIGHLIGHTS) break;
    const top = [...groups.values()]
      .filter((g) => g.kind === kind)
      .sort((a, b) => b.times - a.times)[0];
    if (top) highlights.push(withTimes(top.line, top.times));
  }
  const settled = [...groups.values()].reduce((n, g) => n + g.times, 0);

  const n = after.cards.pending.length;
  const tray =
    n === 0
      ? null
      : n === 1
        ? 'A card waits for you in the tray.'
        : `${capitalize(countWord(n))} cards wait for you in the tray.`;
  // What waits on the road has stopped the course: you camp where it met you.
  const met = (after.map?.encounters ?? []).find((e) => e.state === 'waiting');
  const onTheRoad = met
    ? `On the road, ${lowerFirst(encounterTemplate(met.template).title)} waits for you on the World screen; you camp where it met you.`
    : null;
  const waiting = [onTheRoad, tray].filter(Boolean).join(' ') || null;

  // A major waits for you on every ladder, never offline: each full one says so.
  const ready =
    LADDERS.map((l) => {
      const major = majorCheck(after.player, l);
      if (!major?.bar) return null;
      const who = l === 'qi' ? 'Qi' : `Your ${l}`;
      return major.ready
        ? `${who} presses against the gate of ${major.target.name}. The breakthrough is yours to call.`
        : `Your ${l} is full; ${major.target.name} still waits on its requirements.`;
    })
      .filter(Boolean)
      .join(' ') || null;

  const firsts = firstsWaitingLines(after);
  return { opening, growth, sections, highlights, settled, waiting, ready, firsts };
}
