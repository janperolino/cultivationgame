// The quest record (design § UI and screens, The journal 志; the opening redone, 2026-10-20): a
// one-off with steps, never a job. A giver (a person, a board, a shop or a hall) offers it where
// they are; one to five steps, each with where to go and what finishes it, finished by the engine
// when it sees the thing happen; a concrete reward, paid when you go back to the giver and hand it
// in; and the codex entries it opens. The journal only tracks what you've taken (core/journal.ts).
// The origins' chains (content/quests/chains.ts) and the introduction quests offered where their
// features live (content/quests/intro.ts) are written in The opening, built (chains, rogue, knobs);
// the test quest proves the journal on the dev console.
import type { CardEffect } from './cards/schema.ts';
import type { MetTest } from './codex/schema.ts';
import type { LadderId } from './cultivation.ts';
import type { HourKind } from './hours.ts';
import type { RealmId } from './realms.ts';
import type { ShopKind } from './shops.ts';
import { CHAIN_QUESTS } from './quests/chains.ts';
import { INTRO_QUESTS } from './quests/intro.ts';

/**
 * A place, as a map place id, or `@home` for the life's home place (its origin's), so a quest
 * written once serves every start; or `@any` for a giver of its kind anywhere (an introduction
 * quest at any refiner's counter), handed in where it was taken.
 */
export type QuestPlace = string;

export interface QuestGiver {
  kind: 'board' | 'shop' | 'hall' | 'person';
  /** Where they offer it, and where it is handed in. */
  place: QuestPlace;
  /** The person's id, for a person; a shop's id, for a shop or hall at one place. */
  who?: string;
  /** For `@any`: the kind of shop whose counter offers it. */
  shopKind?: ShopKind;
  /** As the journal names them: "the bounty board", "Senior Brother Zhao". */
  name: string;
}

/** What finishes a step; the engine checks it each day and on every action. */
export type StepGoal =
  /** Stand at a place. */
  | { reach: QuestPlace }
  /** Hold this many of an item in the bag. */
  | { hold: string; n: number }
  /** A chronicle line of this type after the step opened, its data matching (a fight won, a spar). */
  | {
      event: string;
      match?: Readonly<Record<string, string | number | boolean>>;
      /** At the counter the quest was taken at: its place (`at`), a shop of its giver's kind. */
      here?: true;
    }
  /** A ladder at a realm's layer or past it. */
  | { layer: { ladder: LadderId; stage: number; realm?: RealmId } }
  /** This many tree nodes held. */
  | { nodes: number }
  /** A method or technique known. */
  | { knows: string }
  /** A story flag held (a card's pass sets it: the rogue's first big job). */
  | { flag: string }
  /** The quest's own posting (`Quest.posting`): taken from its board, its goal met, or paid. */
  | { posting: 'taken' | 'met' | 'paid' }
  /** A method active on a ladder: the first breath's taking it up. */
  | { active: LadderId }
  /** An hour of this kind on your day's wheel. */
  | { hour: HourKind }
  /** Duty days kept at one post or hire since the step opened. */
  | { kept: number }
  /** A post or hire held: taken now, or held already. */
  | { job: string }
  /** Points of your power's currency on its ledger. */
  | { balance: number }
  /** One of the codex's named checks on the life holds (gear worn, a member, with a caravan). */
  | { met: MetTest }
  /** Batches finished at your bench since the step opened: any, played at the furnace, or mends. */
  | { craft: 'batch' | 'played' | 'mended'; n: number }
  /** A thing done that writes no line of its own, heard only while a step waits on it. */
  | { deed: Deed };

/** What an introduction quest's step can wait on that writes no chronicle line of its own. */
export type Deed = 'changed' | 'slept' | 'lesson';

/**
 * What a step lets you do from Cultivate's Today line, lit with a ring: the rogue's first work
 * (its effects, as a card's), the chain's spar with its teacher, or a card brought to you now
 * (the rogue's first big job, its fight a card's `fight`).
 */
export type QuestAct =
  | { label: string; work: string; effects: readonly CardEffect[]; text: string }
  | { label: string; spar: true }
  | { label: string; card: string };

export interface QuestStep {
  /** What to do, as the journal says it. */
  text: string;
  /** Where to go, for the map's seal; a step done anywhere has none. */
  where?: QuestPlace;
  goal: StepGoal;
  act?: QuestAct;
}

/**
 * A quest's own posting at a board (the board quest of an origin's chain): it stands on its
 * board's list beside the month's while the quest is under way, its goal met at its spot as any
 * posting's, and paid at the board.
 */
export interface QuestPosting {
  /** Its board: a quest place. */
  board: QuestPlace;
  /** Where its goal waits: a map place id. */
  spot: string;
  /** A goal template (content/encounters/quests.ts). */
  template: string;
  title: string;
  /** Low-grade stones it pays at the board. */
  pay: number;
  /** A beast met on the road out, once (Avoid round it, Bold through it): an encounter template. */
  road?: string;
}

export interface QuestReward {
  stones?: number;
  items?: readonly { id: string; n: number }[];
  /** A copy's id (content/copies.ts): `method:<id>`, `technique:<id>`. */
  copy?: string;
  technique?: string;
  /** A method handed over known. */
  method?: string;
  /** A contemplation source sat with as it is handed over (content/contemplation.ts). */
  contemplate?: string;
  /** As the journal and the offer show it. */
  text: string;
}

export interface Quest {
  id: string;
  title: string;
  giver: QuestGiver;
  /** Why it needs doing: someone you know needs the thing done, and you are the one sent. */
  reason: string;
  steps: readonly QuestStep[];
  reward: QuestReward;
  /** What the giver says as you hand it in. */
  thanks: string;
  /** Codex entries handing it in opens. */
  codex?: readonly string[];
  /** Your origin's chain: it can't be dropped. */
  origin?: boolean;
  /** The origin path whose chain it is, "cave-orphan/along"; its order is `CHAINS`'. */
  chain?: string;
  posting?: QuestPosting;
  /** Offered only on the dev console. */
  test?: boolean;
  /** Not offered while this holds (a power's way in, to one who already belongs to one). */
  unless?: MetTest;
}

export const QUESTS: readonly Quest[] = [
  {
    id: 'test-errand',
    title: 'A test errand',
    giver: { kind: 'board', place: '@home', name: 'the bounty board' },
    reason:
      'A placeholder until the origins’ chains are written: it proves the journal tracks a quest from its giver to its hand-in.',
    steps: [
      { text: 'Buy a node on the Trees.', goal: { nodes: 1 } },
      { text: 'Break through to layer 3.', goal: { layer: { ladder: 'qi', stage: 3 } } },
      { text: 'Go back to the board.', where: '@home', goal: { reach: '@home' } },
    ],
    reward: { stones: 5, text: '5 low-grade spirit stones' },
    thanks: 'The board’s clerk counts out your stones.',
    test: true,
  },
  ...CHAIN_QUESTS,
  ...INTRO_QUESTS,
];

/** Each origin path's chain, in order (content/quests/chains.ts). */
export const CHAINS: Readonly<Record<string, readonly string[]>> = (() => {
  const out: Record<string, string[]> = {};
  for (const q of CHAIN_QUESTS) if (q.chain) (out[q.chain] ??= []).push(q.id);
  return out;
})();

export function hasQuest(id: string): boolean {
  return QUESTS.some((q) => q.id === id);
}

export function quest(id: string): Quest {
  const q = QUESTS.find((x) => x.id === id);
  if (!q) throw new Error(`No quest ${id}`);
  return q;
}
