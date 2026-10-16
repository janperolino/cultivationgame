// Picking hours on a day wheel (P3.7's fix): a run the short way round, and what a press does to
// the pick, plain, with shift or with ctrl. Kept apart from the wheel so it can be tested.

/** The hours picked on a wheel, in clock order from 子. */
export type HourPick = readonly number[];

/** The hours from a to b the short way round, so 亥 to 寅 runs through midnight. */
export function hourRun(a: number, b: number): number[] {
  const fwd = (b - a + 12) % 12;
  const back = (a - b + 12) % 12;
  const step = fwd <= back ? 1 : -1;
  const n = Math.min(fwd, back);
  return Array.from({ length: n + 1 }, (_, k) => (a + step * k + 12) % 12).sort((x, y) => x - y);
}

/**
 * What a press on hour `i` makes of the pick: shift takes the run from the last hour pressed, ctrl
 * or cmd adds or drops the one hour, and a plain press takes it alone, or lets go of it if it was
 * all there was.
 */
export function pressHour(
  pick: HourPick,
  anchor: number | null,
  i: number,
  keys: { shift: boolean; add: boolean },
): { pick: number[]; anchor: number | null } {
  if (keys.shift && anchor !== null) return { pick: hourRun(anchor, i), anchor };
  if (keys.add) {
    const next = pick.includes(i) ? pick.filter((h) => h !== i) : [...pick, i];
    return { pick: next.sort((x, y) => x - y), anchor: i };
  }
  if (pick.length === 1 && pick[0] === i) return { pick: [], anchor: null };
  return { pick: [i], anchor: i };
}
