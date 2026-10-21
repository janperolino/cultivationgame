// P3.1, the atlas as data: the new fields' parse, terrain falling back, ties on both ends, and
// the Border Wilds carrying them in the generated atlas.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkAtlas, resolveTerrain, resolveVein, type CheckedEntry } from './checks.ts';
import { generatedAtlasSchema, siteSchema, sourceEntrySchema, type Tie } from './schema.ts';

const read = (path: string): unknown =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

const source = (read('../../../content/atlas/entries.json') as unknown[]).map((e) =>
  sourceEntrySchema.parse(e),
);
const atlas = generatedAtlasSchema.parse(read('../generated/atlas.json'));
const byId = new Map(atlas.entries.map((e) => [e.id, e]));
const borderWilds = atlas.entries.filter(
  (e) => e.id === 'qm-bianhuang' || e.parent === 'qm-bianhuang',
);

const base = {
  id: 'x-place',
  name: 'A Place',
  pinyin: '',
  hanzi: '',
  kind: 'kingdom',
  parent: null,
  status: 'draft',
  summary: '',
  lore: '',
  truth: '',
  tags: [],
  editedBy: 'claude',
  editedAt: '2026-10-15T00:00:00Z',
};
const parses = (fields: Record<string, unknown>) =>
  sourceEntrySchema.safeParse({ ...base, ...fields }).success;

describe('the new fields parse', () => {
  it('takes hidden, access, ties, features and a site sub-kind', () => {
    expect(
      parses({
        kind: 'realm',
        hidden: true,
        access: {
          by: ['toll'],
          of: 'x-power',
          toll: { stones: 10, grade: 'low' },
          below: 'foundation-establishment',
          needs: ['beast-blood'],
          cycle: { every: 7, days: 30, anchor: 3110 },
        },
        ties: [{ to: 'x-power', kind: 'patron', open: true, why: 'They hold the gate.' }],
        features: [{ name: 'the gate cave', tags: ['dark', 'narrow'] }],
      }),
    ).toBe(true);
    expect(parses({ hidden: 'core-formation' })).toBe(true);
    expect(parses({ kind: 'site', site: 'cave', tags: ['famous'] })).toBe(true);
    expect(parses({ access: { by: ['token', 'invitation'], array: 'core-formation' } })).toBe(true);
    expect(parses({ access: { by: ['rank'], rank: 'outer disciple' } })).toBe(true);
  });

  it('refuses what a field does not allow', () => {
    expect(parses({ kind: 'site' })).toBe(false); // a site needs its sub-kind
    expect(parses({ site: 'cave' })).toBe(false); // only a site has one
    expect(parses({ hidden: 'golden-core' })).toBe(false);
    expect(parses({ kind: 'era', features: [{ name: 'x', tags: ['dark'] }] })).toBe(false);
    expect(parses({ kind: 'era', tags: ['famous'] })).toBe(false);
    expect(parses({ features: [{ name: 'x', tags: ['shiny'] }] })).toBe(false);
    expect(parses({ features: [{ name: 'x', tags: [] }] })).toBe(false);
    expect(parses({ access: { by: ['toll'] } })).toBe(false); // a toll with no amount
    expect(parses({ access: { by: ['token'], toll: { stones: 1, grade: 'low' } } })).toBe(false);
    expect(parses({ access: { by: ['rank'] } })).toBe(false);
    expect(parses({ access: {} })).toBe(false);
    // An entry cap, needs and a cycle are a secret realm's.
    expect(parses({ access: { cycle: { every: 7, days: 30, anchor: 3110 } } })).toBe(false);
    expect(parses({ ties: [{ to: 'y', kind: 'rival', open: true, why: '' }] })).toBe(false);
  });
});

const entry = (
  id: string,
  kind: CheckedEntry['kind'],
  parent: string | null,
  more: Partial<CheckedEntry> = {},
): CheckedEntry => ({ id, kind, parent, status: 'draft', map: { x: 0, y: 0 }, ...more });

describe('terrain', () => {
  const t = resolveTerrain([
    entry('w', 'world', null),
    entry('c', 'continent', 'w', { terrain: 'plains' }),
    entry('r', 'region', 'c', { terrain: 'karst' }),
    entry('k', 'kingdom', 'r'),
    entry('k2', 'kingdom', 'r', { terrain: 'hills' }),
    entry('city', 'city', 'k2'),
    entry('r2', 'region', 'c', { terrain: '' }),
    entry('k3', 'kingdom', 'r2'),
    entry('e', 'era', 'w'),
  ]);

  it('falls back to the region, then further up', () => {
    expect(t.get('k')).toBe('karst');
    expect(t.get('k2')).toBe('hills');
    expect(t.get('city')).toBe('hills');
    expect(t.get('r2')).toBe('plains');
    expect(t.get('k3')).toBe('plains');
  });

  it('gives none to what is not a place', () => {
    expect(t.has('w')).toBe(false);
    expect(t.has('e')).toBe(false);
  });

  it('warns on a place on the map with none anywhere up', () => {
    const r = checkAtlas([entry('w', 'world', null), entry('k', 'kingdom', 'w')]);
    expect(r.warnings).toContain('k: on the map with no terrain, and none up its parents');
  });

  it('is written into the generated atlas for every Border Wilds place', () => {
    // The region and its nine places, the fourteen A5.2 added straight under it, O1's Low-Tide Tower
    // and K6's Myriad Crafts Guild.
    expect(borderWilds).toHaveLength(26);
    for (const e of borderWilds) expect(e.terrain, e.id).toBeTruthy();
    expect(byId.get('qm-shiyan-guo')?.terrain).toBe('karst');
    expect(byId.get('qm-anbian-fu')?.terrain).toBe('hills');
    expect(byId.get('qm-muling-guo')?.terrain).toBe('plains');
    // No terrain of its own in the source, so the region's.
    expect(source.find((e) => e.id === 'qm-mihun-shilin')?.terrain).toBeFalsy();
    expect(byId.get('qm-mihun-shilin')?.terrain).toBe('karst');
  });
});

describe('ties', () => {
  const tie = (to: string, kind: Tie['kind'] = 'trade', open = true, why = 'a reason'): Tie => ({
    to,
    kind,
    open,
    why,
  });

  it('warns on an empty why, a mismatch, one end and an untied canon entry', () => {
    const r = checkAtlas([
      entry('a', 'power', null, { terrain: 'hills', ties: [tie('b'), tie('c', 'enemy')] }),
      entry('b', 'power', null, { terrain: 'hills', ties: [tie('a', 'trade', true, ' ')] }),
      entry('c', 'power', null, { terrain: 'hills', ties: [tie('a', 'feud')] }),
      entry('d', 'power', null, { terrain: 'hills', status: 'canon' }),
      entry('e', 'power', null, { terrain: 'hills' }),
    ]);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toContain('b → a: the why is empty');
    expect(r.warnings).toContain('a ↔ c: the ends disagree (enemy, open against feud, open)');
    expect(r.warnings).toContain('d: no ties');
    expect(r.untiedDrafts).toEqual({ power: 1 });
    const oneEnd = checkAtlas([
      entry('a', 'power', null, { terrain: 'hills', ties: [tie('b')] }),
      entry('b', 'power', null, { terrain: 'hills' }),
    ]);
    expect(oneEnd.warnings).toContain('a → b: written on one end only');
  });

  it('stops on a tie or an access to nothing, a tie to itself and two ties to one entry', () => {
    const r = checkAtlas([
      entry('a', 'power', null, { ties: [tie('nobody'), tie('a')], access: { of: 'ghost' } }),
      entry('b', 'power', null, { ties: [tie('a'), tie('a')] }),
    ]);
    expect(r.errors).toContain('a: tie to "nobody", which doesn\'t exist');
    expect(r.errors).toContain('a: tied to itself');
    expect(r.errors).toContain('a: access.of "ghost" doesn\'t exist');
    expect(r.errors).toContain('b: two ties to a; keep one a pair');
  });

  it('holds in the atlas, with the Border Wilds tied on both ends', () => {
    const r = checkAtlas(source);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    for (const e of borderWilds) expect(e.ties?.length, e.id).toBeGreaterThan(0);
    const secret = byId.get('qm-anbian-fu')?.ties?.find((t) => t.to === 'gongqi');
    expect(secret).toMatchObject({ kind: 'secret', open: false });
    expect(byId.get('gongqi')?.ties?.find((t) => t.to === 'qm-anbian-fu')?.open).toBe(false);
  });
});

describe('veins and top', () => {
  it('warns on a top above its vein with no reason, reading a region by its strongest place', () => {
    const r = checkAtlas([
      entry('w', 'world', null),
      entry('c', 'continent', 'w', { terrain: 'hills' }),
      entry('r', 'region', 'c', { top: 'Nascent Soul' }),
      entry('bare', 'city', 'r', { terrain: 'hills', vein: 2, top: 'Core Formation' }),
      entry('told', 'city', 'r', { terrain: 'hills', vein: 2, top: 'Core Formation (duty)' }),
      entry('fed', 'city', 'r', { terrain: 'hills', vein: 3, top: 'Core Formation' }),
      entry('rich', 'city', 'r', { terrain: 'hills', vein: 5, top: 'Foundation Establishment' }),
    ]);
    expect(resolveVein([entry('x', 'region', null)]).size).toBe(0);
    expect(r.warnings.filter((w) => w.includes('vein'))).toEqual([
      "bare: its top needs a tier 3 vein and it sits on tier 2; say why in the top's note (duty, gain, a dead end, hiding, a beast's lair)",
    ]);
    const written = checkAtlas([entry('r', 'region', null, { terrain: 'hills', vein: 4 })]);
    expect(written.errors).toContain(
      "r: a region's vein is its strongest place's, so don't write one",
    );
  });

  it('gives the Border Wilds the tier 4 vein its Nascent Souls need', () => {
    expect(byId.get('qm-bianhuang')?.vein).toBe(4);
    expect(byId.get('qm-shoukou-cheng')?.vein).toBe(4);
  });
});

describe('the Border Wilds as data', () => {
  it('has the Realm of Mingled Blood hidden behind its access', () => {
    const realm = byId.get('qm-hexue-jing');
    expect(realm?.hidden).toBe(true);
    expect(realm?.access).toEqual({
      by: ['toll'],
      of: 'qm-yeqiao-hui',
      toll: { stones: 10, grade: 'low' },
      below: 'foundation-establishment',
      needs: ['beast-blood', 'bonded-beast'],
      cycle: { every: 7, days: 30, anchor: 3110 },
    });
  });

  it('marks its four famous places and gives each child features', () => {
    const famous = atlas.entries.filter((e) => e.tags.includes('famous')).map((e) => e.id);
    expect(famous.sort()).toEqual(
      ['qm-duigu-qiang', 'qm-mihun-shilin', 'qm-shoukou-cheng', 'qm-tushou-men'].sort(),
    );
    for (const e of borderWilds.filter((x) => x.parent === 'qm-bianhuang'))
      expect(e.features?.length, e.id).toBeGreaterThanOrEqual(2);
  });

  it('parses a generated site as the same record', () => {
    const site = {
      ...byId.get('qm-shiyan-guo')!,
      ties: undefined,
      id: 'qm-shiyan-guo-site-1',
      kind: 'site',
      site: 'cave',
      parent: 'qm-shiyan-guo',
      features: [{ name: 'a cave mouth', tags: ['dark'] }],
    };
    expect(siteSchema.safeParse(site).success).toBe(true);
    expect(siteSchema.safeParse({ ...site, kind: 'city', site: undefined }).success).toBe(false);
  });
});
