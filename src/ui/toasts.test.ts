// P2.5d: what a moment's gains toast, and how a burst folds. P2.5f: a technique's toast lands on
// Routine › Practice, and one reaching Origin raises its own.
import { describe, expect, it } from 'vitest';
import { gainCopy, gainManual, gainTechnique, checkScreens } from '../core/life.ts';
import { gains, seeAll } from '../core/seen.ts';
import { newLife, unlock } from '../core/state.ts';
import { masteryNeed } from '../core/techniques.ts';
import { technique } from '../content/techniques.ts';
import { cultivateDays } from '../core/cultivation.ts';
import { withPlayer } from '../core/state.ts';
import { leftSlots, startingGains, toastsFor } from './toasts.ts';

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
    // Routine › Practice and Combat open too, folded into the third.
    expect(t.map((x) => x.more)).toEqual([0, 0, 2]);
    expect(t[0]!.to).toEqual({
      screen: 'routine',
      tab: 'practice',
      select: 'sinkhole-stone-fist',
    });
    const all = toastsFor(gains(before, after), after).length;
    expect(all).toBe(3);
  });

  it('name the Practice tab where the Techniques screen opened', () => {
    const before = fresh();
    const after = checkScreens(gainTechnique(before, 'sinkhole-stone-fist'));
    const screen = gains(before, after).find((g) => g.kind === 'screen' && g.id === 'techniques');
    expect(screen).toBeDefined();
    const [t] = toastsFor([screen!], after);
    expect(`${t!.label} · ${t!.name}`).toBe('New tab · Routine › Practice');
    expect(t!.to).toEqual({ screen: 'routine', tab: 'practice' });
  });

  it('notice a technique that reached Origin and left its slot, not one stopped by hand', () => {
    const t = technique('rampart-palm');
    const s = gainTechnique(fresh(), t.id);
    const near = withPlayer(s, {
      ...s.player,
      techniques: { [t.id]: { practice: masteryNeed(t, 4) - 0.01 } },
    });
    const day = near.calendar.day;
    const done = cultivateDays(near.player, 1, { day, rng: { next: () => 0.5 } as never });
    const after = withPlayer(near, done.cultivator);
    expect(after.player.practicing).toEqual([]);
    expect(leftSlots(near, after)).toEqual([t.id]);
    const stopped = withPlayer(s, { ...s.player, practicing: [] });
    expect(leftSlots(s, stopped)).toEqual([]);
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

  it('name what a new life starts with, though it holds everything seen', () => {
    const s = fresh();
    expect(gains(s, s)).toEqual([]);
    const start = startingGains(s);
    const methods = Object.keys(s.player.methods);
    expect(methods.length).toBeGreaterThan(0);
    expect(start.filter((g) => g.kind === 'method').map((g) => g.id)).toEqual(methods);
    expect(toastsFor(start, s)[0]!.label).toBe('New method');
  });
});
