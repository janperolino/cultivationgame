// Every deck of cards, and lookups. M1 ships the first hour's deck here; P1.8 adds the seclusion
// deck, and each milestone after adds its own (design § Story cards and events).
import { CRAFT_CARDS } from './craft.ts';
import { FIRST_HOUR_CARDS } from './firstHour.ts';
import { RETIRED_CARDS } from './retired.ts';
import type { Card } from './schema.ts';
import { SECLUSION_CARDS } from './seclusion.ts';
import { ROAD_CARDS } from './road.ts';
import { SITE_CARDS } from './site.ts';

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

export const CARDS: readonly Card[] = [
  ...FIRST_HOUR_CARDS,
  ...SECLUSION_CARDS,
  ...SITE_CARDS,
  ...ROAD_CARDS,
  ...CRAFT_CARDS,
];

/**
 * Decks that come at a pace rather than by each card's own chance: about one card every so many
 * real minutes while you idle, whatever the realm's clock (design § Story cards and events,
 * pacing). The first hour's cards and the named days add to it; sim/cards.ts measures the whole.
 * A starting value for the sims.
 */
export const DECK_PACE: Readonly<Record<string, { minutes: number }>> = {
  // About four real minutes a card once the chain's first lesson is in (The opening, built: the
  // knobs, the design's three to five). Today's 35-card deck caps the draw near one every five and
  // a half minutes, its cards on their cooldowns and seasons; P3.12's larger deck reaches the pace.
  seclusion: { minutes: 3 },
};

/** The seclusion deck, held until the origin's chain's first lesson is handed in (core/cards.ts). */
export const SECLUSION_DECK = 'seclusion';

// Retired cards are found by id for an older life's chronicle and feed, never drawn.
const byId = new Map([...CARDS, ...RETIRED_CARDS].map((c) => [c.id, c]));

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
