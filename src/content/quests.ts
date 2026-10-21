// The quest record (design § UI and screens, The journal 志; the opening redone, 2026-10-20): a
// one-off with steps, never a job. A giver (a person, a board, a shop or a hall) offers it where
// they are; one to five steps, each with where to go and what finishes it, finished by the engine
// when it sees the thing happen; a concrete reward, paid when you go back to the giver and hand it
// in; and the codex entries it opens. The journal only tracks what you've taken (core/journal.ts).
// The origins' chains and the introduction quests are written in The opening, built's next phase;
// until then one test quest proves the journal, offered only on the dev console.
import type { LadderId } from './cultivation.ts';
import type { RealmId } from './realms.ts';

/**
 * A place, as a map place id, or `@home` for the life's home place (its origin's), so a quest
 * written once serves every start.
 */
export type QuestPlace = string;

export interface QuestGiver {
  kind: 'board' | 'shop' | 'hall' | 'person';
  /** Where they offer it, and where it is handed in. */
  place: QuestPlace;
  /** The person's id, for a person. */
  who?: string;
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
  | { event: string; match?: Readonly<Record<string, string | number | boolean>> }
  /** A ladder at a realm's layer or past it. */
  | { layer: { ladder: LadderId; stage: number; realm?: RealmId } }
  /** This many tree nodes held. */
  | { nodes: number }
  /** A method or technique known. */
  | { knows: string };

export interface QuestStep {
  /** What to do, as the journal says it. */
  text: string;
  /** Where to go, for the map's seal; a step done anywhere has none. */
  where?: QuestPlace;
  goal: StepGoal;
}

export interface QuestReward {
  stones?: number;
  items?: readonly { id: string; n: number }[];
  /** A copy's id (content/copies.ts): `method:<id>`, `technique:<id>`. */
  copy?: string;
  technique?: string;
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
  /** Offered only on the dev console. */
  test?: boolean;
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
];

export function hasQuest(id: string): boolean {
  return QUESTS.some((q) => q.id === id);
}

export function quest(id: string): Quest {
  const q = QUESTS.find((x) => x.id === id);
  if (!q) throw new Error(`No quest ${id}`);
  return q;
}
