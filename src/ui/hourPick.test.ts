// Picking hours on the day wheel: runs go the short way round, and a press adds or drops an hour,
// with shift adding the run from the last press, so picks build up (A4).
import { describe, expect, it } from 'vitest';
import { hourRun, joinPicks, pressHour } from './hourPick.ts';

const plain = { shift: false };
const shift = { shift: true };

describe('hour picks', () => {
  it('run the short way round, through midnight when that is shorter', () => {
    expect(hourRun(4, 7)).toEqual([4, 5, 6, 7]);
    expect(hourRun(7, 4)).toEqual([4, 5, 6, 7]);
    expect(hourRun(11, 2)).toEqual([0, 1, 2, 11]);
    expect(hourRun(5, 5)).toEqual([5]);
  });

  it('add an hour on a press and drop it on a second, keeping the rest', () => {
    const one = pressHour([], null, 4, plain);
    expect(one).toEqual({ pick: [4], anchor: 4 });
    const two = pressHour(one.pick, one.anchor, 9, plain);
    expect(two).toEqual({ pick: [4, 9], anchor: 9 });
    expect(pressHour(two.pick, two.anchor, 4, plain).pick).toEqual([9]);
  });

  it('add the run from the last press with shift, keeping what was picked', () => {
    expect(pressHour([1, 4], 4, 7, shift).pick).toEqual([1, 4, 5, 6, 7]);
    // Shift with nothing pressed yet is a plain press.
    expect(pressHour([], null, 6, shift).pick).toEqual([6]);
  });

  it('join two picks in clock order', () => {
    expect(joinPicks([9, 2], [2, 11, 0])).toEqual([0, 2, 9, 11]);
  });
});
