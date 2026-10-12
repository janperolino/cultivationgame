// The coming-back story (design § UI and screens, Coming back; § Story cards and events): after
// time away, what happened is told as a story rather than a ledger. It opens on how long passed,
// says how each ladder grew and what broke, then tells the cards that settled without you by kind,
// at the door, within, under the sky, on the named days and among people, each card once with how
// many times it came, and ends on what still waits. It never mentions what attending would have
// earned.
import { card, type CardKind } from '../content/cards/index.ts';
import { stepLabel } from '../content/chronicle.ts';
import { realm } from '../content/realms.ts';
import { countWord, spanWords, timesWord } from '../content/words.ts';
import { renderEvent, whoFor } from './chronicle.ts';
import { majorCheck, type LadderId } from './cultivation.ts';
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
  /** "Three cards wait for you in the tray.", or null. */
  waiting: string | null;
  /** The breakthrough waiting on you, or null. */
  ready: string | null;
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

const LADDER_WORDS: Record<LadderId, { name: string; verb: string }> = {
  qi: { name: 'qi', verb: 'climbs' },
  body: { name: 'body', verb: 'tempers its way' },
  soul: { name: 'soul', verb: 'deepens' },
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function growthLine(which: LadderId, from: Ladder, to: Ladder): string | null {
  if (from.realm === to.realm && from.stage === to.stage) return null;
  const w = LADDER_WORDS[which];
  if (from.realm !== to.realm) {
    return `Your ${w.name} breaks through to ${realm(to.realm).name}, and stands at ${stepLabel(to.realm, to.stage)}.`;
  }
  return `Your ${w.name} ${w.verb} from ${stepLabel(from.realm, from.stage)} to ${stepLabel(to.realm, to.stage)}.`;
}

/** The story of the time between two states of the same life. */
export function comingBackStory(before: GameState, after: GameState): ComingBackStory {
  const days = after.calendar.day - before.calendar.day;
  const span = spanWords(days);
  const opening = `${capitalize(span.text)} ${span.plural ? 'pass' : 'passes'} in seclusion.`;

  const since = after.chronicle.slice(before.chronicle.length);
  const growth: string[] = [];
  for (const which of ['qi', 'body', 'soul'] as const) {
    const line = growthLine(which, before.player[which], after.player[which]);
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
  const stones = after.player.stones - before.player.stones;
  if (stones <= -1) growth.push(`${Math.floor(-stones)} spirit stones are gone, burned or spent.`);
  else if (stones >= 1) growth.push(`Your pouch is ${Math.floor(stones)} spirit stones heavier.`);

  // Each card settled without you, once, with the line its last coming wrote.
  const who = whoFor(after.player);
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
    const lines = told
      .slice(0, PER_SECTION)
      .map((g) => (g.times > 1 ? `${g.line} (${timesWord(g.times)})` : g.line));
    const rest = told.slice(PER_SECTION).reduce((n, g) => n + g.times, 0);
    if (rest > 0) lines.push(`And ${rest === 1 ? 'one thing more' : `${rest} things more`}.`);
    sections.push({ heading: HEADINGS[kind], lines });
  }

  const n = after.cards.pending.length;
  const waiting =
    n === 0
      ? null
      : n === 1
        ? 'A card waits for you in the tray.'
        : `${capitalize(countWord(n))} cards wait for you in the tray.`;

  const major = majorCheck(after.player, 'qi');
  const ready = major?.bar
    ? major.ready
      ? `Qi presses against the gate of ${major.target.name}. The breakthrough is yours to call.`
      : `Your qi is full; ${major.target.name} still waits on its requirements.`
    : null;

  return { opening, growth, sections, waiting, ready };
}
