// The throw being put together on a craft page (K7, ExperimentPanels.tsx): what is in the bench's
// mouth, a thing added or counted up and down, kept apart from the panels for fast refresh.
import { EXPERIMENT, INK_KINDS, type ExperimentCraft } from '../content/found.ts';
import type { Throw } from '../core/experiment.ts';

export type Tossed = Throw['inputs'];

/** How many kinds go in at once: four, or two in a talisman's ink. */
export const kinds = (craft: ExperimentCraft) =>
  craft === 'talismans' ? INK_KINDS : EXPERIMENT.kinds;

/** A thing's first count in the mouth: half a furnace's ten, or one piece or one into the ink. */
const START: Record<ExperimentCraft, number> = { alchemy: 5, refining: 1, talismans: 1 };

/** Adds a thing to the mouth, or more of it when it is in already. */
export function addThing(tossed: Tossed, craft: ExperimentCraft, thing: string): Tossed {
  const had = tossed.find((x) => x.thing === thing);
  if (had)
    return tossed.map((x) =>
      x.thing === thing ? { ...x, count: Math.min(EXPERIMENT.most, x.count + 1) } : x,
    );
  if (tossed.length >= kinds(craft)) return tossed;
  return [...tossed, { thing, count: START[craft] }];
}

/** One more or fewer of a thing; none takes it out. */
export function countThing(tossed: Tossed, thing: string, by: number): Tossed {
  return tossed
    .map((x) => (x.thing === thing ? { ...x, count: Math.min(EXPERIMENT.most, x.count + by) } : x))
    .filter((x) => x.count > 0);
}
