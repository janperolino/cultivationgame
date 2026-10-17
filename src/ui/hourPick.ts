// Picking hours on a day wheel (P3.7's fix, made additive in A4): a run the short way round, and what
// a press does to the pick, plain or with shift. Kept apart from the wheel so it can be tested.

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

/** Two picks together, in clock order. */
export function joinPicks(a: HourPick, b: HourPick): number[] {
  return [...new Set([...a, ...b])].sort((x, y) => x - y);
}

/**
 * What a press on hour `i` makes of the pick (A4, Jan's call: picking adds, as ctrl-click did): a
 * press adds the hour, or drops it if it was picked; shift adds the run from the last hour pressed.
 * Nothing is let go but what is pressed; a press off the wheel lets go of it all.
 */
export function pressHour(
  pick: HourPick,
  anchor: number | null,
  i: number,
  keys: { shift: boolean },
): { pick: number[]; anchor: number | null } {
  if (keys.shift && anchor !== null) return { pick: joinPicks(pick, hourRun(anchor, i)), anchor };
  if (pick.includes(i)) return { pick: pick.filter((h) => h !== i), anchor };
  return { pick: joinPicks(pick, [i]), anchor: i };
}
