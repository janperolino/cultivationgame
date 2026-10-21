// Every encounter template (P3.7): 30 the road brings over the six kinds, one for each trip goal
// the bounty board posts, and a law hall's walk at each size (O5). A new encounter is an entry in
// one of these files, not new code.
import { BEAST_ENCOUNTERS } from './beasts.ts';
import { CULTIVATOR_ENCOUNTERS } from './cultivators.ts';
import { OMEN_ENCOUNTERS, PLACE_ENCOUNTERS } from './finds.ts';
import { GOAL_ENCOUNTERS } from './goals.ts';
import { LAW_HALL_ENCOUNTERS } from './lawHall.ts';
import { PLOT_ENCOUNTERS } from './plots.ts';
import { QUEST_ENCOUNTERS } from './quests.ts';
import { MORTAL_ENCOUNTERS } from './road-folk.ts';
import type { Template } from './schema.ts';

export const ENCOUNTERS: readonly Template[] = [
  ...BEAST_ENCOUNTERS,
  ...CULTIVATOR_ENCOUNTERS,
  ...MORTAL_ENCOUNTERS,
  ...PLACE_ENCOUNTERS,
  ...OMEN_ENCOUNTERS,
  ...PLOT_ENCOUNTERS,
  ...GOAL_ENCOUNTERS,
  ...LAW_HALL_ENCOUNTERS,
];

// The quests' own postings' templates are found by id but never drawn (content/encounters/quests.ts).
const byId = new Map([...ENCOUNTERS, ...QUEST_ENCOUNTERS].map((t) => [t.id, t]));

export function encounterTemplate(id: string): Template {
  const t = byId.get(id);
  if (!t) throw new RangeError(`Unknown encounter template: ${id}`);
  return t;
}

export function hasEncounterTemplate(id: string): boolean {
  return byId.has(id);
}
