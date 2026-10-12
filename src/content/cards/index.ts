// Every deck of cards, and lookups. M1 ships the first hour's deck here; P1.8 adds the seclusion
// deck, and each milestone after adds its own (design § Story cards and events).
import { FIRST_HOUR_CARDS } from './firstHour.ts';
import type { Card } from './schema.ts';

export type {
  Card,
  CardChoice,
  CardEffect,
  CardOutcome,
  CheckAttribute,
  Trigger,
} from './schema.ts';

export const CARDS: readonly Card[] = [...FIRST_HOUR_CARDS];

const byId = new Map(CARDS.map((c) => [c.id, c]));

export function card(id: string): Card {
  const c = byId.get(id);
  if (!c) throw new RangeError(`Unknown card ${id}`);
  return c;
}

export function hasCard(id: string): boolean {
  return byId.has(id);
}

/** Offline, at most this many cards wait in the feed; the rest resolve by their default. */
export const OFFLINE_QUEUE = 3;
