// Every deck of cards, and lookups. M1 ships the first hour's deck here; P1.8 adds the seclusion
// deck, and each milestone after adds its own (design § Story cards and events).
import { FIRST_HOUR_CARDS } from './firstHour.ts';
import type { Card } from './schema.ts';
import { SECLUSION_CARDS } from './seclusion.ts';

export type {
  Card,
  CardChoice,
  CardEffect,
  CardFight,
  CardKind,
  CardOutcome,
  CardStep,
  CheckAttribute,
  SeasonId,
  Trigger,
  VarCheck,
} from './schema.ts';

export const CARDS: readonly Card[] = [...FIRST_HOUR_CARDS, ...SECLUSION_CARDS];

/**
 * Decks that come at a pace rather than by each card's own chance: about one card every so many
 * real minutes while you idle, whatever the realm's clock (design § Story cards and events,
 * pacing). The first hour's cards and the named days add to it; sim/cards.ts measures the whole.
 * A starting value for the sims.
 */
export const DECK_PACE: Readonly<Record<string, { minutes: number }>> = {
  seclusion: { minutes: 6.5 },
};

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
