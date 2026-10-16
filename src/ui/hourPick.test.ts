// Picking hours on the day wheel: runs go the short way round, and a press with shift, ctrl or
// neither does what the editor says.
import { describe, expect, it } from 'vitest';
import { hourRun, pressHour } from './hourPick.ts';

const plain = { shift: false, add: false };

describe('hour picks', () => {
  it('run the short way round, through midnight when that is shorter', () => {
    expect(hourRun(4, 7)).toEqual([4, 5, 6, 7]);
    expect(hourRun(7, 4)).toEqual([4, 5, 6, 7]);
    expect(hourRun(11, 2)).toEqual([0, 1, 2, 11]);
    expect(hourRun(5, 5)).toEqual([5]);
  });

  it('take one hour on a plain press, and let it go on a second', () => {
    const one = pressHour([], null, 4, plain);
    expect(one).toEqual({ pick: [4], anchor: 4 });
    expect(pressHour(one.pick, one.anchor, 4, plain)).toEqual({ pick: [], anchor: null });
    expect(pressHour([2, 3, 4], 2, 3, plain)).toEqual({ pick: [3], anchor: 3 });
  });

  it('take a run from the last press with shift, and add or drop one with ctrl', () => {
    expect(pressHour([4], 4, 8, { shift: true, add: false }).pick).toEqual([4, 5, 6, 7, 8]);
    expect(pressHour([4], 4, 9, { shift: false, add: true }).pick).toEqual([4, 9]);
    expect(pressHour([4, 9], 9, 4, { shift: false, add: true }).pick).toEqual([9]);
    // Shift with nothing pressed yet is a plain press.
    expect(pressHour([], null, 6, { shift: true, add: false }).pick).toEqual([6]);
  });
});
