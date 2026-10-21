// The card format (design § Story cards and events): everything that happens to you is a card, one
// data format for every deck. A card has a trigger on your state, a weight, once-only or a
// cooldown, a short text with slots, one to three choices with costs, checks and effects, and a
// chronicle line per outcome. A card can be a small interaction: a choice can lead to a further
// step, each with its own text, choices and default, reading what earlier steps set in the card's
// variables, and the chronicle gets one line for the path. core/cards.ts draws them on the `world`
// stream, keeps the feed and applies the effects. A new card is an entry in a deck, not new code.
import type { LadderId } from '../cultivation.ts';
import type { OriginChoice, OriginId } from '../origins.ts';
import type { TieId } from '../people.ts';
import type { RealmId } from '../realms.ts';

/** The attributes a card's check can read (design § Combat, the six attributes). */
export type CheckAttribute = 'agility' | 'fortune' | 'aptitude';

/** The four seasons, three months each, the year opening in spring. */
export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';

/**
 * When a card can come. Every field given must hold; an empty trigger always holds. Days lived
 * count from root-testing day, at one real hour to a year at Qi Condensation.
 */
export interface Trigger {
  /** Days lived since testing day: at least the first, and less than the second if given. */
  daysLived?: readonly [min: number, max?: number];
  /** The qi ladder's realm, its stage within it, and how full its bar is (1 is full, up to 1.5). */
  qi?: { realm?: RealmId; minStage?: number; maxStage?: number; minFill?: number };
  origin?: readonly OriginId[];
  choice?: OriginChoice;
  /** Story flags the cultivator must hold, and must not. */
  flags?: readonly string[];
  notFlags?: readonly string[];
  /** Holds none of this item. */
  noItem?: string;
  /** No method on this ladder. */
  noMethod?: LadderId;
  /** A method active on this ladder. */
  hasMethod?: LadderId;
  /** Doesn't hold this manual yet (content/manuals.ts). */
  noManual?: string;
  /** A mark (core/cards.ts) set at least this many days ago. */
  mark?: { id: string; days: number };
  /** The season of the world day. */
  season?: readonly SeasonId[];
  /** The day of the year, 0–359: at least the first and less than the second. A named day. */
  yearDay?: readonly [min: number, max: number];
  /** People slots ({senior}, {aunt}, {mentor}) the origin path must know someone in. */
  people?: readonly string[];
  /** At least this many spirit stones. */
  minStones?: number;
  /**
   * Ready for the Intent ladder's next stage in some combat Dao (core/intent.ts): its capstone
   * learned, a moment away. The card's text names that Dao as {dao} and the stage as {intent}.
   */
  intentReady?: boolean;
}

/** What a choice does, applied in order. Fuel is a share of the ladder's current bar. */
export type CardEffect =
  | { do: 'stones'; n: number }
  | { do: 'item'; id: string; n: number }
  /** A share of the bar; a negative share spills fuel, never below empty. */
  | { do: 'fuel'; ladder: LadderId; share: number }
  | { do: 'insight'; n: number }
  | { do: 'injury'; ladder: LadderId; days: number }
  | { do: 'flag'; id: string }
  | { do: 'method'; id: string }
  | { do: 'technique'; id: string }
  /** The origin path's first technique (content/techniques.ts, `firstFor`). */
  | { do: 'first-technique' }
  | { do: 'routine'; id: string }
  /** A loose manual (content/manuals.ts): a formula, a style, a scripture. Taught, held at once. */
  | { do: 'manual'; id: string }
  /**
   * A copy (content/copies.ts, "manual:tide-counting"): a manual, method or technique handed over
   * as a thing, bought, given, found or stolen, read on the study hours (design § Reading).
   */
  | { do: 'copy'; id: string }
  /** Insight from a contemplation source (content/contemplation.ts): a lump, or days of a trickle. */
  | { do: 'contemplate'; source: string; days?: number }
  /**
   * A moment on the Intent ladder (core/intent.ts) in the Dao the card names ({dao}): the next
   * stage opens. An epiphany card's breakthrough.
   */
  | { do: 'moment' }
  /** Marks the day, for a later card's trigger; `clear-mark` forgets it. */
  | { do: 'mark'; id: string }
  | { do: 'clear-mark'; id: string }
  /** Adds to one of the card's own variables, for its later steps and its chronicle line. */
  | { do: 'var'; id: string; n: number }
  /**
   * What you learn of a person, by slot ({senior}, {mentor}) or id (content/people.ts): `regard`
   * lands as a memory of ±10 a step that fades over a season (a plain mapping until P3.12 names
   * memory rows), `tie` is what they become to you, then their realm as you last heard it or a
   * step up from it, and where they are. Meeting someone new starts their record.
   */
  | {
      do: 'person';
      who: string;
      regard?: number;
      tie?: TieId;
      realm?: { realm: RealmId; stage: number };
      advance?: number;
      where?: string;
    };

/** The kinds a card's chronicle line can name beside the plain choice (事). */
export type CardLineKind = 'fight' | 'hurt' | 'people' | 'learned';

export interface CardOutcome {
  effects: readonly CardEffect[];
  /** What the card says once chosen, in the second person. Variables fill in as {var.id}. */
  text: string;
  /**
   * The chronicle line, a biography in the third person, written when the card ends; variables
   * fill in as {var.id}. An outcome that leads on to a step writes none.
   */
  chronicle?: string;
  /**
   * The chronicle line's kind when it is more than a choice (content/chronicle.ts): a fight, a
   * hurt, a person met or something learned. A card that settled itself reads as settled whatever
   * this says.
   */
  kind?: CardLineKind;
  /** The step the card goes on to, in `steps`; the card ends here when absent. */
  next?: string;
}

/**
 * A fight a choice goes into (Fights you play): a foe from the roster at your realm, played on the
 * stage unless it is a sure win. Won or talked down is `pass`; fallen or yielded is `fail`; fled
 * or drawn off is `fled`, or `fail` when it isn't written. Settled by its edge's verdict, as a
 * check is, when the card resolves without you.
 */
export interface CardFight {
  /** A roster template (content/roster.ts): a beast or a cultivator. */
  roster: string;
  /** Stages from yours, held inside your realm: 1 is a layer above you. 0 when absent. */
  stages?: number;
  /** A people slot ({rival}) the foe is, by name. */
  person?: string;
}

/** Offers a choice only while one of the card's variables is in range (0 when unset). */
export interface VarCheck {
  id: string;
  min?: number;
  max?: number;
}

export interface CardChoice {
  label: string;
  /** Offered only while a card variable is in range. */
  when?: VarCheck;
  /** What it costs up front; it can't be chosen without it. */
  cost?: { stones?: number; item?: { id: string; n: number } };
  /**
   * Your attribute against a number, the resolver's comparison with no roll (design § The resolver;
   * P3.3): clear at ×1.25 of it, close at ×1, short below. A card is you against yourself, so it
   * reads no realm. `fail` applies when short. P3.3 converted the old d20 difficulty as `dc − 2`.
   */
  check?: { attribute: CheckAttribute; against: number };
  /** A fight in place of a check (Fights you play). */
  fight?: CardFight;
  /** What happens, or what happens on a pass when there is a check. */
  pass: CardOutcome;
  /** What a close pass does, its cost paid; `pass` when absent (P3.12 writes them). */
  close?: CardOutcome;
  fail?: CardOutcome;
  /** A fight you broke away from, or drew off; `fail` when absent. */
  fled?: CardOutcome;
}

/** A later step of a multi-step card: its own text, choices and default. */
export interface CardStep {
  text: string;
  choices: readonly CardChoice[];
  /** The choice taken without you; the first one offered that you can pay for when absent. */
  defaultChoice?: number;
}

/** The seclusion deck's five kinds of event (design § Story cards and events). */
export type CardKind = 'door' | 'within' | 'sky' | 'named-day' | 'people';

export interface Card {
  id: string;
  /** The deck it belongs to: the first hour's in M1, seclusion's in P1.8, and so on. */
  deck: string;
  /** Which of the seclusion deck's five kinds it is. */
  kind?: CardKind;
  title: string;
  /**
   * The card's text, in the second person. Slots in braces fill in at draw: {name}, {they},
   * {them}, {their}, {place} and the origin's people ({aunt}, {sergeant}, {senior}, {mentor}
   * and the rest).
   */
  text: string;
  trigger: Trigger;
  /** How often it comes against the others drawn on the same day; 1 when absent. */
  weight?: number;
  /**
   * The chance each day, once its trigger holds; 1 when absent. A paced deck's cards
   * (content/cards/index.ts, DECK_PACE) come only on days the deck's pace allows, unless fixed.
   */
  chance?: number;
  /** In a paced deck, a card that keeps its own daily chance instead: a named day. */
  fixed?: boolean;
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
  /** Later steps, by id, that outcomes lead on to. */
  steps?: Readonly<Record<string, CardStep>>;
}
