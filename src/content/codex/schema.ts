// The codex's entry record (design § UI and screens, The journal 志; the opening redone,
// 2026-10-20): the mechanics a player has met, in plain words with the real numbers behind them.
// One entry a row of `docs/features.md`, shown once its feature is met (core/codex.ts reads
// `met`), so the codex spoils nothing. Each entry also names its row's way in: a guide, an
// introduction quest offered where the feature lives, or the codex alone.
import type { FirstId } from '../firsts.ts';
import type { GuideId } from '../guides.ts';

/** The codex's areas, one a section of the feature list, in the order the codex lists them. */
export const CODEX_AREAS = [
  { id: 'cultivation', name: 'Cultivation', hanzi: '修炼' },
  { id: 'wheel', name: 'The day wheel', hanzi: '日课' },
  { id: 'trees', name: 'Trees and manuals', hanzi: '道树' },
  { id: 'fighting', name: 'Fighting', hanzi: '战' },
  { id: 'bag', name: 'Bag and gear', hanzi: '行囊' },
  { id: 'map', name: 'The map and travel', hanzi: '舆图' },
  { id: 'places', name: 'Places, shops and money', hanzi: '市' },
  { id: 'organizations', name: 'Organizations and jobs', hanzi: '宗门' },
  { id: 'people', name: 'People', hanzi: '人物' },
  { id: 'crafts', name: 'Crafts', hanzi: '艺' },
  { id: 'dwellings', name: 'Dwellings and sites', hanzi: '居' },
  { id: 'rest', name: 'Chronicle and the rest', hanzi: '杂' },
] as const;
export type CodexAreaId = (typeof CODEX_AREAS)[number]['id'];

/**
 * A named check on the life (core/codex.ts, `MET_TESTS`), for features no screen, first or guide
 * marks. Each is true once the thing has happened or is held.
 */
export const MET_TESTS = [
  'qi-method', // a qi method taken up
  'art', // a tempering or nourishing art known
  'minor', // a minor breakthrough made, on any ladder
  'major-near', // a ladder at its realm's top layer
  'stones', // spirit stones held
  'insight', // insight earned
  'card', // a story card drawn
  'came-back', // a coming-back story told
  'lifespan', // within a tenth of the lifespan's end
  'technique', // a combat technique known
  'mastery', // a technique or method past Glimpse
  'line', // a technique of a line with several chapters
  'routine', // a learned routine held
  'foundation', // Foundation reached on any ladder
  'node', // a tree node bought
  'breath-branch', // a Breath branch node bought
  'dao-tree', // a combat Dao's tree open
  'craft-tree', // a craft Dao's tree open
  'manual', // a manual grafted on a tree
  'copy', // a copy on the shelf
  'intent', // an Intent stage reached
  'treasure-slot', // a treasure slot opened
  'veiled-aura', // the Veiled Aura node bought
  'item', // anything in the bag
  'gear', // gear worn
  'pill', // a pill held
  'bonded', // a blue-or-better artifact held
  'ground', // a ground pile left somewhere
  'offering', // an item with an offering use held
  'travelled', // a course set on the map
  'encounter', // a road encounter met
  'group', // travelling with a group
  'site', // a site found or seen
  'posting', // a bounty posting taken
  'place', // a place's screen entered
  'shop', // a shop's counter opened
  'member', // a member of a power
  'post', // a post or hire held
  'marked', // marked for a guarded method
  'follower', // someone follows you
  'fight', // a fight played or sparred
  'fight-item', // an item with a fight use held
  'tool', // a craft tool held
  'batch', // a craft batch finished
  'quest', // a quest taken
  'dwelling', // a dwelling held (K9)
  'claimed', // a site claimed in the wild
  'array', // an array's flags or disc held, or one laid (K10)
  'laid', // an array laid at a site or on open ground
  'prepared', // an array laid on open ground
  'upkeep', // a method that drinks an upkeep known (K11)
  'swallowing', // stone swallowing held, from a method or a node
  'volley', // a volley art known
  'burn-goods', // a burning pill, or an array with a fight in it, held; or the blood burned
  'rogue', // a start that refused, belonging to no power
] as const;
export type MetTest = (typeof MET_TESTS)[number];

/** What meets an entry, so it shows. */
export type CodexMet =
  /** From the first minute. */
  | { start: true }
  /** Its screen opened (the seen record's screen id: core/seen.ts). */
  | { screen: string }
  | { first: FirstId }
  | { guide: GuideId }
  | { test: MetTest };

/** How a feature list row is introduced (design § UI and screens, Introductions). */
export type WayIn = { guide: GuideId } | 'quest' | 'codex';

export interface CodexEntry {
  id: string;
  /** In English, with its hanzi beside it. */
  title: string;
  hanzi: string;
  area: CodexAreaId;
  /**
   * How it works in plain words, a paragraph each. `{slot}` fills from the live numbers
   * (content/codex/slots.ts), so a tuned number stays true here.
   */
  text: readonly string[];
  /** The numbers behind it, a row each: what, and how much (slots fill here too). */
  numbers?: readonly (readonly [what: string, value: string])[];
  /** Where it lives: the screen (and Routine's tab), as the link names it. */
  where: { screen: string; tab?: string; label: string };
  met: CodexMet;
  way: WayIn;
  /** The feature list row it covers, its first column, word for word. */
  feature: string;
}
