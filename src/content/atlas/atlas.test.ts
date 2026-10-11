import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generatedAtlasSchema, parseTop, sourceEntrySchema, type Shape } from './schema.ts';

const read = (path: string): unknown =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

const source = (read('../../../content/atlas/entries.json') as unknown[]).map((e) =>
  sourceEntrySchema.parse(e),
);
const atlas = generatedAtlasSchema.parse(read('../generated/atlas.json'));
const byId = new Map(atlas.entries.map((e) => [e.id, e]));

describe('parseTop', () => {
  it('parses a realm with a note', () => {
    expect(parseTop('Void Refinement (the dowager queen, newly woken; two beast kings)')).toEqual({
      ok: true,
      top: { realm: 'void-refinement', note: 'the dowager queen, newly woken; two beast kings' },
    });
  });

  it('parses a bare realm, unknown and empty', () => {
    expect(parseTop('Core Formation')).toEqual({
      ok: true,
      top: { realm: 'core-formation', note: '' },
    });
    expect(parseTop('unknown (sealed)')).toEqual({
      ok: true,
      top: { realm: 'unknown', note: 'sealed' },
    });
    expect(parseTop('')).toEqual({ ok: true, top: { realm: '', note: '' } });
    expect(parseTop(undefined)).toEqual({ ok: true, top: { realm: '', note: '' } });
  });

  it('keeps nested parentheses in the note', () => {
    expect(parseTop('Mahayana (rumored (twice))')).toEqual({
      ok: true,
      top: { realm: 'mahayana', note: 'rumored (twice)' },
    });
  });

  it('rejects text that is not a realm', () => {
    expect(parseTop('Golden Core').ok).toBe(false);
    expect(parseTop('core formation').ok).toBe(false);
    expect(parseTop('Core Formation (unclosed').ok).toBe(false);
  });
});

describe('generated atlas', () => {
  it('has the same entry ids as the source', () => {
    expect([...byId.keys()].sort()).toEqual(source.map((e) => e.id).sort());
  });

  it('has 6 continents, each with a coast', () => {
    const continents = atlas.entries.filter((e) => e.kind === 'continent');
    expect(continents).toHaveLength(6);
    for (const c of continents) expect(atlas.shapes[c.id]?.type).toBe('area');
  });

  it('drops bookkeeping, keeps truth and parses every top', () => {
    for (const e of atlas.entries) {
      expect(e).not.toHaveProperty('notes');
      expect(e).not.toHaveProperty('editedAt');
      expect(e).toHaveProperty('truth');
    }
    for (const s of source) {
      const parsed = parseTop(s.top);
      expect(parsed.ok, `${s.id}: ${s.top}`).toBe(true);
      if (parsed.ok) expect(byId.get(s.id)?.top).toEqual(parsed.top);
    }
  });

  it('gives every land region, kingdom and forbidden land a shape', () => {
    for (const e of atlas.entries) {
      if (!e.map || e.map.x === undefined) continue;
      if (['region', 'kingdom', 'forbidden'].includes(e.kind)) {
        expect(atlas.shapes[e.id], e.id).toBeDefined();
      }
    }
    expect(atlas.shapes['the-scar']?.type).toBe('circle');
    expect(atlas.shapes['guixu']?.type).toBe('annulus');
  });

  it('only has shapes for real entries, rounded to the precision', () => {
    const coords = (s: Shape): number[] =>
      s.type === 'area'
        ? s.polygons.flat(3)
        : Object.values(s).filter((v) => typeof v === 'number');
    for (const [id, shape] of Object.entries(atlas.shapes)) {
      expect(byId.has(id), id).toBe(true);
      for (const v of coords(shape)) expect(Math.abs(v % atlas.precision), id).toBe(0);
    }
  });

  it('clips region cells to their continent', () => {
    const inBox = (id: string) => {
      const coast = atlas.shapes[id];
      if (coast?.type !== 'area') throw new Error(`${id} has no coast`);
      const pts = coast.polygons.flat(2);
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] as const;
    };
    for (const e of atlas.entries) {
      const parent = e.parent ? byId.get(e.parent) : undefined;
      if (e.kind !== 'region' || parent?.kind !== 'continent') continue;
      const cell = atlas.shapes[e.id];
      if (cell?.type !== 'area') throw new Error(`${e.id} has no cell`);
      const [x0, y0, x1, y1] = inBox(parent.id);
      for (const [x, y] of cell.polygons.flat(2)) {
        expect(x >= x0 && x <= x1 && y >= y0 && y <= y1, e.id).toBe(true);
      }
    }
  });
});
