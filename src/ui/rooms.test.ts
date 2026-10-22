// A6.1's rooms: a teahouse's passers seeded by the place and the day, a trading hall's floor by
// department, and every City door naming a room.
import { describe, expect, it } from 'vitest';
import { passersAt } from '../core/patrons.ts';
import { placeById } from '../core/map/region.ts';
import { ensureMap, mapOf } from '../core/map/travel.ts';
import { newLife } from '../core/state.ts';
import { doorsOf } from './placeDoors.ts';
import { departmentsOf, inDepartment } from './rooms.ts';
import type { StockLot } from '../core/shops.ts';

describe('the teahouse’s passers', () => {
  it('seats the same three to five all day, and others tomorrow', () => {
    const a = passersAt('qm-shoukou-cheng', 40.1);
    expect(a.length).toBeGreaterThanOrEqual(3);
    expect(a.length).toBeLessThanOrEqual(5);
    expect(passersAt('qm-shoukou-cheng', 40.9)).toEqual(a);
    expect(passersAt('qm-shoukou-cheng', 41.2)).not.toEqual(a);
    expect(new Set(a.map((p) => p.name.split(' ').at(-1))).size).toBe(a.length);
  });
});

describe('the trading hall’s floor', () => {
  const lot = (thing: string, slot: number) => ({ thing, slot, n: 1 }) as unknown as StockLot;
  it('shows All, the departments holding lots, and Imports', () => {
    const lots = [lot('qi-gathering-pill', 0), lot('qi-gathering-pill', 1)];
    const imported = (t: string) => t === 'qi-gathering-pill';
    const floor = departmentsOf(lots, imported);
    expect(floor.map((d) => d.id)).toEqual(['all', 'pills', 'imports']);
    expect(inDepartment('qi-gathering-pill', 'talismans', imported)).toBe(false);
  });
});

describe('the City’s rooms', () => {
  it('opens every door into a room of its kind', () => {
    const s = ensureMap(
      newLife({ name: 'Han Li', seed: 'a61', origin: { id: 'cave-orphan', choice: 'along' } }),
    );
    const city = placeById(mapOf(s)!, 'qm-shoukou-cheng')!;
    const rooms = Object.fromEntries(doorsOf(s, mapOf(s)!, city).map((d) => [d.art, d.room]));
    expect(rooms).toMatchObject({
      stall: 'market',
      alchemy: 'craft',
      house: 'trading',
      bounty: 'board',
      teahouse: 'teahouse',
      caravans: 'departures',
      changer: 'changer',
    });
  });
});
