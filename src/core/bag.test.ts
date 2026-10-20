// Sean's playtest fixes in C2 (2026-10-20): the Bag holds no more than its squares, what it can't
// hold falls to the ground where you stand (Jan's call: marked on the map, picked up again, gone
// after a while: a month, GROUND_DAYS), a buy that won't fit is refused, and a stack splits in two.
import { describe, expect, it } from 'vitest';
import { GROUND_DAYS, PACK_SQUARES } from '../content/gear.ts';
import { ITEMS, stackSize } from '../content/items.ts';
import {
  bagCapacity,
  bagStacks,
  bagUsed,
  canUnequip,
  equip,
  mergeStacks,
  roomFor,
  splitStack,
  stow,
} from './gear.ts';
import { dropStack, gainItem, groundPiles, pickUp, pilesHere } from './map/ground.ts';
import { ensureMap } from './map/travel.ts';
import { buy, shelf } from './shops.ts';
import { addItem, newLife, withPlayer, type GameState } from './state.ts';

const PILL = ITEMS.find((i) => i.kind === 'pill' && stackSize(i) >= 20)!.id;
const BLADE = ITEMS.find((i) => i.uses.equip?.slot === 'weapon' && (i.bulk ?? 1) === 1)!.id;
const POUCH = ITEMS.find((i) => i.uses.equip?.slot === 'pouch')!.id;

/** A fresh life on the map with an empty Bag and nothing worn. */
const fresh = (): GameState => {
  const s = ensureMap(newLife({ name: 'Han Li', seed: 'bag' }));
  return withPlayer(s, {
    ...s.player,
    items: {},
    gear: { ...s.player.gear, weapon: null, armor: null, ring: null, pouch: null },
  });
};

describe('the Bag in squares', () => {
  it('holds no more than its squares: a gain takes what fits', () => {
    const c = fresh().player;
    expect(bagCapacity(c)).toBe(PACK_SQUARES);
    expect(roomFor(c, BLADE)).toBe(PACK_SQUARES);
    const r = stow(c, BLADE, PACK_SQUARES + 4);
    expect(r.left).toBe(4);
    expect(bagUsed(r.c)).toBe(PACK_SQUARES);
    expect(roomFor(r.c, BLADE)).toBe(0);
  });

  it('lets what it can’t hold fall where you stand, to pick up again until its days pass', () => {
    const s = fresh();
    const full = gainItem(s, BLADE, PACK_SQUARES + 2);
    expect(full.left).toBe(2);
    const here = pilesHere(full.state);
    expect(here).toHaveLength(1);
    expect(here[0]!.pile.items).toEqual({ [BLADE]: 2 });
    expect(here[0]!.pile.at).toEqual(s.map!.at);
    expect(full.state.map!.road.at(-1)!.text).toMatch(/left on the ground/);
    // No room: picking up is refused until something is set down.
    expect(pickUp(full.state, 0)).toMatchObject({ ok: false });
    const set = dropStack(full.state, BLADE, 0);
    if (!set.ok) throw new Error(set.reason);
    expect(groundPiles(set.state)[0]!.items[BLADE]).toBe(3);
    const back = pickUp(set.state, 0);
    if (!back.ok) throw new Error(back.reason);
    // One square was free: one comes back, two still lie there.
    expect(groundPiles(back.state)[0]!.items[BLADE]).toBe(2);
    const later = { ...back.state, calendar: { day: back.state.calendar.day + GROUND_DAYS } };
    expect(groundPiles(later)).toHaveLength(0);
  });

  it('refuses a buy that won’t fit, and a take-off with no room', () => {
    const s = gainItem(fresh(), BLADE, PACK_SQUARES).state;
    const lot = shelf(s, 'mouth-stall').find((l) => !l.thing.includes(':'))!;
    expect(buy(s, 'mouth-stall', lot.slot)).toMatchObject({
      ok: false,
      reason: 'Your pack has no room for it.',
    });
    // Wearing one blade frees its square; a pouch worn adds squares, and won't come off over them.
    const worn = withPlayer(s, {
      ...s.player,
      items: { ...s.player.items, [BLADE]: PACK_SQUARES - 1, [PILL]: 1 },
      gear: { ...s.player.gear, pouch: POUCH },
    });
    expect(bagCapacity(worn.player)).toBeGreaterThan(PACK_SQUARES);
    const filled = gainItem(worn, BLADE, roomFor(worn.player, BLADE)).state;
    expect(canUnequip(filled.player, 'pouch')).toEqual({
      ok: false,
      reason: 'Your pack has no room for it.',
    });
    const wore = equip(filled.player, BLADE, 0);
    expect(wore.check.ok).toBe(true);
  });

  it('splits a stack in two, each its own square, and stacks them together again', () => {
    const s = gainItem(fresh(), PILL, 30).state;
    expect(bagStacks(s.player).map((x) => x.n)).toEqual([30]);
    const split = splitStack(s.player, PILL, 0)!;
    expect(bagStacks(split).map((x) => x.n)).toEqual([15, 15]);
    expect(bagUsed(split)).toBe(2);
    // Splitting the split stack again.
    const again = splitStack(split, PILL, 1)!;
    expect(bagStacks(again).map((x) => x.n)).toEqual([15, 8, 7]);
    expect(bagStacks(mergeStacks(again, PILL)).map((x) => x.n)).toEqual([30]);
    // Using some up comes out of the pile first.
    const used = { ...again, items: { [PILL]: 20 } };
    expect(bagStacks(used).map((x) => x.n)).toEqual([5, 8, 7]);
    // Used to the last, its splits go with it: the next gain is one stack again.
    const gone = addItem(again, PILL, -30);
    expect(bagStacks(addItem(gone, PILL, 7)).map((x) => x.n)).toEqual([7]);
    // A stack of one doesn't split, nor anything into a full pack.
    expect(splitStack({ ...s.player, items: { [PILL]: 1 } }, PILL, 0)).toBeNull();
    const packed = gainItem(s, BLADE, PACK_SQUARES - 1).state.player;
    expect(splitStack(packed, PILL, 0)).toBeNull();
    // Setting the split stack down takes that stack only.
    const down = dropStack(withPlayer(s, split), PILL, 1);
    if (!down.ok) throw new Error(down.reason);
    expect(bagStacks(down.state.player).map((x) => x.n)).toEqual([15]);
  });
});
