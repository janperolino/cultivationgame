// P2.5d: what a moment's gains toast, and how a burst folds.
import { describe, expect, it } from 'vitest';
import { gainCopy, gainManual, gainTechnique, checkScreens } from '../core/life.ts';
import { gains, seeAll } from '../core/seen.ts';
import { newLife, unlock } from '../core/state.ts';
import { toastsFor } from './toasts.ts';

const fresh = () => unlock(seeAll(newLife({ name: 'Han Li', seed: 'toasts' })), 'trees');

describe('toasts', () => {
  it('name a technique first, leave its Art to it, and fold a burst into the third', () => {
    const before = fresh();
    const after = checkScreens(gainTechnique(before, 'sinkhole-stone-fist'));
    const t = toastsFor(gains(before, after), after);
    expect(t.map((x) => `${x.label} · ${x.name}`)).toEqual([
      'New technique · Sinkhole Stone Fist',
      'New tree · Earth Dao',
      'New tree · Fist Dao',
    ]);
    // Techniques and Combat open too, folded into the third.
    expect(t.map((x) => x.more)).toEqual([0, 0, 2]);
    expect(t[0]!.to).toEqual({ screen: 'techniques', select: 'sinkhole-stone-fist' });
  });

  it('link a formula to its graft, and its tree to the Trees screen', () => {
    const before = fresh();
    const after = gainManual(before, 'stone-eyes-lamp');
    const t = toastsFor(gains(before, after), after);
    expect(t.map((x) => `${x.label} · ${x.name}`)).toEqual([
      'New formula · Stone Eyes Lamp Formula',
      'New tree · Soul tree',
    ]);
    expect(t[0]!.to).toEqual({
      screen: 'trees',
      trees: { pick: 'soul', focus: 'stone-eyes-lamp' },
    });
  });

  it('name a copy, count a second, and link both to its spine on the bookcase', () => {
    const before = fresh();
    const after = gainCopy(before, 'manual:tide-counting');
    const t = toastsFor(gains(before, after), after);
    // A copy grafts nowhere until read, so no tree appears with it.
    expect(t.map((x) => `${x.label} · ${x.name}`)).toEqual(['New copy · Tide-Counting Formula']);
    expect(t[0]!.to).toEqual({
      screen: 'trees',
      trees: { pick: 'manuals', focus: 'tide-counting' },
    });
    const seen = seeAll(after);
    const twice = gainCopy(seen, 'manual:tide-counting');
    const again = toastsFor(gains(seen, twice), twice);
    expect(again.map((x) => `${x.label} · ${x.name}`)).toEqual(['Copy · Tide-Counting Formula']);
  });
});
