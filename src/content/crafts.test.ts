// The recipes as written (design § Professions, Recipes; The effect table): every made pill and
// piece of gear has one beside its catalog line, every input is a good some catalog sells, and each
// recipe's inputs could make its effect by its craft's row of the effect table.
import { describe, expect, it } from 'vitest';
import { CATALOGS } from './catalogs/index.ts';
import { RARE } from './catalogs/rare.ts';
import {
  ALCHEMY_MAKES,
  FAMILIES,
  PROPERTIES,
  RECIPES,
  REFINING_MAKES,
  REFINING_PROPERTIES,
  recipeHours,
} from './crafts.ts';
import { ITEMS, item, itemKind } from './items.ts';
import { hasManual, manual } from './manuals.ts';
import { slipId } from './catalogs/index.ts';

const lots = [...CATALOGS, RARE].flatMap((c) => c.lots);

/**
 * Gear found rather than made (K4's talk): sold off the dead, ground by stonecutters, or placed by
 * hand as a dead elder's or a ruin's.
 */
const FOUND = [
  'unclaimed-saber',
  'basalt-gauntlets',
  'cold-moon-sword',
  'tide-reading-shell',
  'sober-eye-stone',
];

describe('the recipes', () => {
  it('give every pill but the gate pills a recipe, and nothing a second one', () => {
    const pills = ITEMS.filter((i) => itemKind(i) === 'pill' && i.uses.consume);
    for (const p of pills)
      expect(
        RECIPES.some((r) => r.output === p.id),
        p.id,
      ).toBe(true);
    const gates = ITEMS.filter((i) => itemKind(i) === 'pill' && i.uses.offer);
    for (const g of gates)
      expect(
        RECIPES.some((r) => r.output === g.id),
        g.id,
      ).toBe(false);
    expect(new Set(RECIPES.map((r) => r.output)).size).toBe(RECIPES.length);
  });

  it('are written beside their lines, in the catalog that lots the good', () => {
    for (const c of [...CATALOGS, RARE])
      for (const r of c.recipes ?? [])
        expect(
          c.lots.some((l) => l.thing === r.output),
          r.output,
        ).toBe(true);
  });

  it('take only goods some catalog sells', () => {
    for (const r of RECIPES)
      for (const i of r.inputs)
        expect(
          lots.some((l) => l.thing === i.thing && l.shops.length > 0),
          `${r.output} takes ${i.thing}`,
        ).toBe(true);
  });

  it('could each make their effect by alchemy’s row of the effect table', () => {
    for (const r of RECIPES.filter((x) => x.craft === 'alchemy')) {
      const props = new Set(
        r.inputs.flatMap((i) => item(i.thing).uses.ingredient?.properties ?? []),
      );
      for (const e of item(r.output).uses.consume?.effects ?? []) {
        const key =
          e.effect === 'detox' ? 'detox' : `${e.effect}:${'ladder' in e ? e.ladder : e.what}`;
        const needs = ALCHEMY_MAKES[key as keyof typeof ALCHEMY_MAKES];
        expect(needs, `${r.output}: ${key}`).toBeDefined();
        expect(props.has(needs), `${r.output} needs ${needs}`).toBe(true);
      }
    }
  });

  it('give every piece of gear a shop sells a recipe, but what is found rather than made (K4)', () => {
    // The gold and red list is placed by hand, never made.
    const shelves = CATALOGS.flatMap((c) => c.lots).filter((l) => l.shops.length > 0);
    const sold = new Set(shelves.map((l) => l.thing));
    const gear = ITEMS.filter((i) => i.uses.equip && sold.has(i.id) && !FOUND.includes(i.id));
    for (const g of gear)
      expect(
        RECIPES.some((r) => r.output === g.id),
        g.id,
      ).toBe(true);
  });

  it('could each make their piece by refining’s row of the effect table', () => {
    for (const r of RECIPES.filter((x) => x.craft === 'refining')) {
      const ins = r.inputs.map((i) => item(i.thing));
      const props = new Set(ins.flatMap((i) => i.uses.ingredient?.properties ?? []));
      const slot = item(r.output).uses.equip?.slot;
      const needs =
        slot && slot in REFINING_MAKES ? REFINING_MAKES[slot as keyof typeof REFINING_MAKES] : null;
      if (needs) expect(props.has(needs), `${r.output} needs ${needs}`).toBe(true);
      else
        expect(
          REFINING_PROPERTIES.some((p) => props.has(p)) || ins.some((i) => i.element),
          `${r.output} needs a refining property or an element`,
        ).toBe(true);
    }
  });

  it('file each in one of its craft’s families, at its craft’s hours by tier', () => {
    for (const r of RECIPES) expect(FAMILIES[r.family].craft).toBe(r.craft);
    expect(recipeHours(RECIPES.find((r) => r.output === 'qi-gathering-pill')!)).toBe(3);
    expect(recipeHours(RECIPES.find((r) => r.output === 'core-blood-pill')!)).toBe(4.5);
    expect(recipeHours(RECIPES.find((r) => r.output === 'iron-sword')!)).toBe(8);
    expect(recipeHours(RECIPES.find((r) => r.output === 'azure-cloud-sword')!)).toBe(12);
  });

  it('each have a slip of one node teaching it, lotted where its good is', () => {
    for (const r of RECIPES) {
      const id = slipId(r.output);
      expect(hasManual(id)).toBe(true);
      const m = manual(id);
      expect(m.kind).toBe('recipe');
      expect(m.nodes.map((n) => n.recipe)).toEqual([r.output]);
      const good = lots.find((l) => l.thing === r.output)!;
      const slip = lots.find((l) => l.thing === `manual:${id}`)!;
      expect(slip.shops).toEqual(good.shops);
    }
    expect(manual(slipId('qi-gathering-pill')).hanzi).toBe('聚气丹方');
  });
});

describe('ingredients', () => {
  it('carry one or two of the eighteen properties: every herb, beast part and input', () => {
    const inputs = new Set(RECIPES.flatMap((r) => r.inputs.map((i) => i.thing)));
    for (const it of ITEMS) {
      const kind = itemKind(it);
      if (kind !== 'herb' && kind !== 'beast-part' && !inputs.has(it.id)) continue;
      const props = it.uses.ingredient?.properties ?? [];
      expect(props.length, it.id).toBeGreaterThanOrEqual(1);
      expect(props.length, it.id).toBeLessThanOrEqual(2);
      for (const p of props) expect(PROPERTIES).toContain(p);
    }
  });
});
