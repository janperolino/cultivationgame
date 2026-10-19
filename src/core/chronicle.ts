// Reading the typed chronicle: an event's text from its type's template (content/chronicle.ts),
// with its subject's name, pronouns and story slots, and the world's calendar ("Winter 3,137", the
// Sealed Era). The person log (P1.8) filters events by actor.
import { EVENT_TEMPLATES, pronounWords, type EventData, type Who } from '../content/chronicle.ts';
import { ERA_START_YEAR } from '../content/calendar.ts';
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

export { ordinal };

const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season = (typeof SEASONS)[number];

/** The season of a world day: three months each, the year opening in spring. */
export function seasonOf(day: number): Season {
  return SEASONS[seasonIndex(day)]!;
}

/** The season of a world day as 0–3, spring first. */
export function seasonIndex(day: number): number {
  const month = Math.floor((((day % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR) / 30);
  return Math.floor(month / 3);
}

/** The world's year on a world day: the Sealed Era, day 0 the first day of 3,115. */
export function worldYear(day: number): number {
  return ERA_START_YEAR + Math.floor(day / DAYS_PER_YEAR);
}

/** The world day a Sealed Era year begins on. */
export function yearStartDay(year: number): number {
  return (year - ERA_START_YEAR) * DAYS_PER_YEAR;
}

/** A year as digits: "3,137". Years are never spelled out. */
export function yearDigits(year: number): string {
  return String(year).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** "Winter 3,137": when an event happened, on the world's calendar. */
export function worldWhen(day: number): string {
  return `${capitalize(seasonOf(day))} ${yearDigits(worldYear(day))}`;
}

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
