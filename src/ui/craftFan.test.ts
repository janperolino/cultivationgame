// A craft Dao on the Trees screen (K2, Jan's take B): each band split into Hand, Line and Lore
// wedges, each branch standing in its wedge's middle, and the later bands' capstones named.
import { describe, expect, it } from 'vitest';
import { CRAFT_BRANCHES } from '../content/trees/craft.ts';
import { CRAFT_DAOS } from '../content/trees/index.ts';
import { fan } from './treeLayout.ts';

const ALCHEMY = CRAFT_DAOS.find((t) => t.craft === 'alchemy')!;
const FARMING = CRAFT_DAOS.find((t) => t.craft === 'farming')!;

describe('the fan', () => {
  it('splits each band into Hand, Line and Lore wedges, the branches in their middles', () => {
    const f = fan(ALCHEMY);
    for (const b of f.bands) expect(b.wedges.map((w) => w.branch)).toEqual(CRAFT_BRANCHES);
    const angle = (id: string) => f.nodes.get(id)!.angle;
    expect(angle('alchemy-twin-furnace')).toBeCloseTo(0, 6);
    expect(angle('alchemy-steady-flame')).toBeLessThan(-30);
    expect(angle('alchemy-pill-sense')).toBeGreaterThan(30);
  });

  it('marks each later band’s three capstones by name', () => {
    const f = fan(ALCHEMY);
    for (const b of f.bands.filter((x) => x.tier >= 3)) {
      expect(b.planned).toHaveLength(3);
      expect(b.planned[0]!.x).toBeLessThan(b.planned[1]!.x);
      expect(b.planned[1]!.x).toBeLessThan(b.planned[2]!.x);
    }
    expect(fan(FARMING).bands[0]!.planned).toEqual([]);
  });
});
