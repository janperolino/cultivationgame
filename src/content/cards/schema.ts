// The card format (design § Story cards and events): everything that happens to you is a card, one
// data format for every deck. A card has a trigger on your state, a weight, once-only or a
// cooldown, a short text with slots, one to three choices with costs, checks and effects, and a
// chronicle line per outcome. core/cards.ts draws them on the `world` stream, keeps the feed and
// applies the effects. A new card is an entry in a deck, not new code.
import type { LadderId } from '../cultivation.ts';
import type { OriginChoice, OriginId } from '../origins.ts';
import type { RealmId } from '../realms.ts';

/** The attributes a card's d20 check can read (design § Combat, the six attributes). */
export type CheckAttribute = 'agility' | 'fortune' | 'aptitude';

/**
 * When a card can come. Every field given must hold; an empty trigger always holds. Days lived
 * count from root-testing day, at one real hour to a year at Qi Condensation.
 */
export interface Trigger {
  /** Days lived since testing day: at least the first, and less than the second if given. */
  daysLived?: readonly [min: number, max?: number];
  /** The qi ladder's realm, and its stage within it. */
  qi?: { realm?: RealmId; minStage?: number; maxStage?: number };
  origin?: readonly OriginId[];
  choice?: OriginChoice;
  /** Story flags the cultivator must hold, and must not. */
  flags?: readonly string[];
  notFlags?: readonly string[];
  /** Holds none of this item. */
  noItem?: string;
  /** No method on this ladder. */
  noMethod?: LadderId;
  /** A mark (core/cards.ts) set at least this many days ago. */
  mark?: { id: string; days: number };
}

/** What a choice does, applied in order. Fuel is a share of the ladder's current bar. */
export type CardEffect =
  | { do: 'stones'; n: number }
  | { do: 'item'; id: string; n: number }
  | { do: 'fuel'; ladder: LadderId; share: number }
  | { do: 'insight'; n: number }
  | { do: 'injury'; ladder: LadderId; days: number }
  | { do: 'flag'; id: string }
  | { do: 'method'; id: string }
  | { do: 'technique'; id: string }
  /** The origin path's first technique (content/techniques.ts, `firstFor`). */
  | { do: 'first-technique' }
  | { do: 'routine'; id: string }
  /** Insight from a contemplation source (content/contemplation.ts): a lump, or days of a trickle. */
  | { do: 'contemplate'; source: string; days?: number }
  /** Marks the day, for a later card's trigger; `clear-mark` forgets it. */
  | { do: 'mark'; id: string }
  | { do: 'clear-mark'; id: string };

export interface CardOutcome {
  effects: readonly CardEffect[];
  /** What the card says once chosen, in the second person. */
  text: string;
  /** The chronicle line, a biography in the third person. */
  chronicle: string;
}

export interface CardChoice {
  label: string;
  /** What it costs up front; it can't be chosen without it. */
  cost?: { stones?: number; item?: { id: string; n: number } };
  /** A d20 plus (attribute − 10) against the difficulty; `fail` applies when it misses. */
  check?: { attribute: CheckAttribute; dc: number };
  /** What happens, or what happens on a pass when there is a check. */
  pass: CardOutcome;
  fail?: CardOutcome;
}

export interface Card {
  id: string;
  /** The deck it belongs to: the first hour's in M1, seclusion's in P1.8, and so on. */
  deck: string;
  title: string;
  /**
   * The card's text, in the second person. Slots in braces fill in at draw: {name}, {they},
   * {them}, {their}, {place} and the origin's people ({aunt}, {sergeant}, {senior} and the rest).
   */
  text: string;
  trigger: Trigger;
  /** How often it comes against the others drawn on the same day; 1 when absent. */
  weight?: number;
  /** The chance each day, once its trigger holds; 1 when absent. */
  chance?: number;
  /** Days lived by which it comes for certain, once its trigger holds. */
  sureAt?: number;
  /** Comes once a life. */
  once?: boolean;
  /** Days before it can come again. */
  cooldown?: number;
  /** An urgent card resolves by its default choice once it has waited this many days. */
  urgent?: { days: number };
  /** The choice taken when it resolves without you; the first when absent. */
  defaultChoice?: number;
  choices: readonly CardChoice[];
}
