// Craft renown (design § Professions, people and powers, Styles and the craft grade; K6): renown's
// rule kept per craft and region, on the cultivator, so you can be a famed alchemist in the Border
// Wilds and an unknown refiner. It uses renown's points and levels (1, 2, 4, 7 … 37), and rises as
// your marked goods sell in a region, with a grade certified there and a gold piece made there. It
// fades a level a year while nothing of yours sells. Your mark lifts what you made by 3% a level
// where you are known; from 3 the shops know you by name, from 6 a guild offers you a seat.
import { DAYS_PER_MONTH } from '../content/calendar.ts';
import type { CraftId } from '../content/crafts.ts';
import { realmScale } from '../content/realms.ts';
import { FAME_LEVELS } from '../content/resolver.ts';
import { CRAFT_RENOWN } from '../content/styles.ts';
import { fameLevel } from './resolver/names.ts';
import { itemCount, realmOf, type Cultivator, type CraftsState } from './state.ts';

type Entry = CraftsState['renown'][string][string];

const NONE: Entry = { n: 0, day: 0, month: -1, sold: 0, given: 0 };

const monthOf = (day: number) => Math.floor(day / DAYS_PER_MONTH);

/** Points an entry holds today: a level lost for each year since anything of yours sold there. */
function pointsNow(e: Entry, day: number): number {
  const level = fameLevel(e.n);
  const lost = Math.floor(Math.max(0, day - e.day) / CRAFT_RENOWN.fadeDays);
  if (lost === 0) return e.n;
  const left = Math.max(0, level - lost);
  return left === 0 ? 0 : FAME_LEVELS[left - 1]!;
}

function entryOf(c: Cultivator, region: string, craft: CraftId): Entry {
  return c.crafts.renown[region]?.[craft] ?? NONE;
}

function withEntry(c: Cultivator, region: string, craft: CraftId, e: Entry): Cultivator {
  const here = { ...(c.crafts.renown[region] ?? {}), [craft]: e };
  return { ...c, crafts: { ...c.crafts, renown: { ...c.crafts.renown, [region]: here } } };
}

/** Your points of craft renown in a craft and region today. */
export function craftPoints(c: Cultivator, region: string, craft: CraftId, day: number): number {
  return pointsNow(entryOf(c, region, craft), day);
}

/** Your level of craft renown in a craft and region today, 0 to 9. */
export function craftLevel(c: Cultivator, region: string, craft: CraftId, day: number): number {
  return fameLevel(craftPoints(c, region, craft, day));
}

/** Adds points of craft renown, from what they stand at today; the fade starts again. */
export function addCraftFame(
  c: Cultivator,
  region: string,
  craft: CraftId,
  n: number,
  day: number,
): Cultivator {
  const e = entryOf(c, region, craft);
  return withEntry(c, region, craft, { ...e, n: Math.max(0, pointsNow(e, day) + n), day });
}

/**
 * A gold piece or better made in a region: its points, never past the month's most there, as sales
 * are held (the crafts play checkpoint; the code review's low 29: 19 gold batches reached name 9).
 */
export function madeRare(c: Cultivator, region: string, craft: CraftId, day: number): Cultivator {
  const e0 = entryOf(c, region, craft);
  const month = monthOf(day);
  const fresh = e0.month === month ? e0 : { ...e0, month, sold: 0, given: 0, rare: 0 };
  const gain = Math.min(CRAFT_RENOWN.rare, CRAFT_RENOWN.monthMost - (fresh.rare ?? 0));
  if (gain <= 0) return c;
  const n = pointsNow(fresh, day) + gain;
  return withEntry(c, region, craft, { ...fresh, n, day, rare: (fresh.rare ?? 0) + gain });
}

/** A month's wage on the realm curve by your realm: what a point of sales asks (30 low at Qi Condensation). */
export function wagePoint(c: Cultivator): number {
  return CRAFT_RENOWN.wage * realmScale(realmOf(c));
}

/**
 * Your marked goods sold in a region, worth `value` low: a point for every month's wage sold there
 * this month, at most two a month. Any sale holds off the fade.
 */
export function soldMarked(
  c: Cultivator,
  region: string,
  craft: CraftId,
  value: number,
  day: number,
): Cultivator {
  const e0 = entryOf(c, region, craft);
  const month = monthOf(day);
  const fresh = e0.month === month ? e0 : { ...e0, month, sold: 0, given: 0 };
  const sold = fresh.sold + value;
  const due = Math.min(CRAFT_RENOWN.monthMost, Math.floor(sold / wagePoint(c)));
  const gain = Math.max(0, due - fresh.given);
  const n = pointsNow(fresh, day) + gain;
  return withEntry(c, region, craft, { n, day, month, sold, given: Math.max(due, fresh.given) });
}

/** How many of a thing in the Bag carry your mark: what you made, never more than you hold. */
export function markedHeld(c: Cultivator, thing: string): number {
  return Math.min(c.crafts.marked[thing] ?? 0, itemCount(c, thing));
}

/**
 * Trims each mark to what you still hold, in the Bag, your stores and the tray (the crafts play
 * checkpoint): a piece eaten, burned, fed to an upkeep or given away takes its mark with it, so one
 * bought later never sells as yours. The day step runs it.
 */
export function keepMarks(c: Cultivator): Cultivator {
  let changed = false;
  const marked = { ...c.crafts.marked };
  for (const [thing, n] of Object.entries(marked)) {
    let held = (c.items[thing] ?? 0) + (c.crafts.tray[thing] ?? 0);
    for (const d of c.dwellings) held += d.items[thing] ?? 0;
    if (n <= held) continue;
    changed = true;
    if (held > 0) marked[thing] = held;
    else delete marked[thing];
  }
  return changed ? { ...c, crafts: { ...c.crafts, marked } } : c;
}

/** Takes the mark off pieces that left the Bag, yours first. */
export function unmark(c: Cultivator, thing: string, n: number): Cultivator {
  const left = Math.max(0, (c.crafts.marked[thing] ?? 0) - n);
  const marked = { ...c.crafts.marked };
  if (left > 0) marked[thing] = left;
  else delete marked[thing];
  return { ...c, crafts: { ...c.crafts, marked } };
}

/** What your mark adds to the price of what you made, where your name in its craft stands at `level`. */
export function markLift(level: number): number {
  return CRAFT_RENOWN.mark * level;
}

/** Your crafts known by name in a region: those at the level the shops know a name by (3). */
export function knownCrafts(c: Cultivator, region: string, day: number): CraftId[] {
  return (Object.keys(c.crafts.renown[region] ?? {}) as CraftId[]).filter(
    (k) => craftLevel(c, region, k, day) >= CRAFT_RENOWN.byName,
  );
}
