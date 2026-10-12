// Reading the typed chronicle: an event's text from its type's template (content/chronicle.ts),
// with its subject's name, pronouns and story slots, and the biography's sense of time ("the
// spring of the fourteenth year"). The person log (P1.8) filters events by actor.
import { EVENT_TEMPLATES, pronounWords, type EventData, type Who } from '../content/chronicle.ts';
import { placeName } from '../content/origins.ts';
import { personSlots } from './people.ts';
import { ordinal } from '../content/words.ts';
import type { Note } from './cultivation.ts';
import { DAYS_PER_YEAR, type ChronicleEvent, type Cultivator, type GameState } from './state.ts';

/** What the templates need to know of a cultivator. */
export function whoFor(c: Cultivator): Who {
  return {
    name: c.name,
    ...pronounWords(c.pronouns),
    slots: { ...personSlots(c), place: c.place ? placeName(c.place) : 'the Border Wilds' },
  };
}

/** The text of an event's type, for this subject. Unknown types fall back to their data. */
export function renderEvent(type: string, data: EventData, who: Who): string {
  const template = EVENT_TEMPLATES[type];
  if (!template) return typeof data.text === 'string' ? data.text : type;
  return template(data, who);
}

/** The cultivators the game knows by id; only the player until NPCs arrive. */
function actor(s: GameState, id: string | undefined): Cultivator {
  return s.player.id === id || !id ? s.player : { ...s.player, name: id };
}

/** An event's text, written as a biography of its first actor. */
export function eventText(s: GameState, e: ChronicleEvent): string {
  return renderEvent(e.type, e.data, whoFor(actor(s, e.actors[0])));
}

/** A card that settled on its own while you were away or busy: the screens mark it quietly. */
export function settledItself(e: ChronicleEvent): boolean {
  return e.type === 'card' && e.data.byDefault === true;
}

/** A rule's note as text, before it is dated: for tests and previews. */
export function noteText(n: Note, c: Cultivator): string {
  return renderEvent(n.type, n.data, whoFor(c));
}

/** The events that name a cultivator, oldest first: the person log reads this. */
export function eventsOf(s: GameState, id: string): ChronicleEvent[] {
  return s.chronicle.filter((e) => e.actors.includes(id));
}

export { ordinal };

const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season = (typeof SEASONS)[number];

/** The season of a world day: three months each, the year opening in spring. */
export function seasonOf(day: number): Season {
  const month = Math.floor((((day % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR) / 30);
  return SEASONS[Math.floor(month / 3)]!;
}

/** "the spring of the fourteenth year": when an event happened in its subject's life. */
export function lifeWhen(c: Cultivator, day: number): string {
  const year = Math.floor((day - c.bornDay) / DAYS_PER_YEAR) + 1;
  return `the ${seasonOf(day)} of the ${ordinal(year)} year`;
}

/** Events grouped by "the spring of the fourteenth year", in the order given. */
export function bySeason(
  c: Cultivator,
  events: readonly ChronicleEvent[],
): { when: string; items: ChronicleEvent[] }[] {
  const groups: { when: string; items: ChronicleEvent[] }[] = [];
  for (const e of events) {
    const when = e.day < c.bornDay ? 'a past life' : lifeWhen(c, e.day);
    const last = groups.at(-1);
    if (last?.when === when) last.items.push(e);
    else groups.push({ when, items: [e] });
  }
  return groups;
}
