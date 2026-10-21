// Spirit farming (design § Spirit farming; K8): a rented plot grows spirit rice and a herb, an
// untended young herb grows at half, pests take a bed past their span, earth milk ages a bed at
// once, a harvest feeds the furnace; and the rest of the plot's rules.
import { describe, expect, it } from 'vitest';
import { CATALOGS, slipId } from '../content/catalogs/index.ts';
import { seedId } from '../content/farming.ts';
import { item, variantId } from '../content/items.ts';
import { handReach, planInputs } from './crafts.ts';
import { recipe } from '../content/crafts.ts';
import {
  ageBands,
  bedYield,
  buyOf,
  cropTop,
  digSoil,
  growPlots,
  growthOf,
  harvest,
  harvestOdds,
  isRipe,
  pestMonths,
  plant,
  plotOf,
  rentOf,
  takePlot,
  tendPlot,
  applyToPlot,
  type PlotSpot,
} from './farming.ts';
import { gatherFactor } from './map/gather.ts';
import { loadSave, makeSave } from './save/format.ts';
import { addItem, newLife, type Cultivator } from './state.ts';

const SPEAR_PLOW: PlotSpot = { place: 'spear-plow', land: 'plains', density: 3 };
const RICE = 'spirit-rice';
const GRASS = 'calm-heart-grass';
const noHeat = () => 0;

/** A farmer with stones, the Farming Dao's starter and Calm-Heart seal, and packets to sow. */
function farmer(): Cultivator {
  const s = newLife({ name: 'Han Li', seed: 'farm' });
  let c: Cultivator = {
    ...s.player,
    items: {},
    stones: 500,
    nodes: [...s.player.nodes, 'farming-spirit-rice-seal', 'farming-calm-heart-grass-seal'],
  };
  c = addItem(addItem(c, seedId(RICE), 3), seedId(GRASS), 3);
  return c;
}

/** A farmer holding a plot at Spear-Plow (rented unless said), a bed of rice and one of grass sown on day 0. */
function sown(held: 'rented' | 'bought' = 'rented'): { c: Cultivator; id: string } {
  let c = takePlot(farmer(), SPEAR_PLOW, held, 0).cultivator;
  const id = c.crafts.plots[0]!.id;
  c = plant(c, id, 0, seedId(RICE), 0).cultivator;
  c = plant(c, id, 1, seedId(GRASS), 0).cultivator;
  return { c, id };
}

/** Days of the plots, a day at a time, tended at Spear-Plow or away. */
function days(c: Cultivator, from: number, n: number, here: boolean, heat = noHeat): Cultivator {
  let next = c;
  for (let d = from; d < from + n; d++)
    next = growPlots(next, d, d + 1, here ? 'spear-plow' : null, heat).cultivator;
  return next;
}

describe('holding a plot', () => {
  it('rents for 6 low a season where tier 1 grows, buys for ten seasons, up the curve a tier', () => {
    expect(rentOf(3)).toBe(6);
    expect(buyOf(3)).toBe(60);
    expect(rentOf(4)).toBe(54);
    const c = takePlot(farmer(), SPEAR_PLOW, 'rented', 0).cultivator;
    expect(c.stones).toBe(494);
    expect(c.crafts.plots[0]).toMatchObject({
      held: 'rented',
      until: 90,
      beds: Array(9).fill(null),
    });
    expect(takePlot({ ...farmer(), stones: 2 }, SPEAR_PLOW, 'bought', 0).reason).toMatch(/purse/);
  });

  it('goes back to the village when its lease runs out', () => {
    const { c } = sown();
    const r = growPlots(c, 89.5, 90, null, noHeat);
    expect(r.cultivator.crafts.plots).toEqual([]);
    expect(r.events[0]).toEqual({ type: 'plot-lost', data: { place: 'spear-plow' } });
  });

  it('crops are recipes, sown only when known, from a packet you carry', () => {
    let c = takePlot(farmer(), SPEAR_PLOW, 'bought', 0).cultivator;
    const id = c.crafts.plots[0]!.id;
    c = addItem(c, seedId('glow-cap-mushroom'), 1);
    expect(plant(c, id, 0, seedId('glow-cap-mushroom'), 0).reason).toMatch(/don't know/);
    expect(recipe(RICE)).toMatchObject({ craft: 'farming', family: 'grain' });
    expect(recipe(GRASS).inputs).toEqual([{ thing: seedId(GRASS), count: 1 }]);
  });

  it('sells a packet where its crop sells, at about three of its crop, and its almanac beside', () => {
    const lots = CATALOGS.flatMap((cat) => cat.lots);
    const grass = lots.find((l) => l.thing === GRASS)!;
    expect(lots.find((l) => l.thing === seedId(GRASS))!.shops).toEqual(grass.shops);
    expect(lots.some((l) => l.thing === `manual:${slipId(GRASS)}`)).toBe(true);
    expect(item(seedId(GRASS))).toMatchObject({ kind: 'seed', rarity: 'white' });
    expect(item(seedId(GRASS)).price).toBeCloseTo(2.1);
  });
});

describe('growing', () => {
  it('a rented plot grows spirit rice and a herb in a season tended, and harvests 30 a bed', () => {
    const start = sown();
    const id = start.id;
    let c = start.c;
    c = days(c, 0, 78, true);
    expect(isRipe(plotOf(c, id)!.beds[0]!)).toBe(false);
    c = days(c, 78, 10, true);
    // Density 3 is a step over tier 1's need: ×1.15, so both ripen a little early.
    expect(isRipe(plotOf(c, id)!.beds[0]!)).toBe(true);
    const rice = harvest(c, id, 0, 88);
    expect(rice.made).toBe(RICE);
    expect(rice.count).toBe(30);
    expect(rice.cultivator.items[RICE]).toBe(30);
    expect(rice.packets).toEqual({ [seedId(RICE)]: 2 });
    const grass = harvest(rice.cultivator, id, 1, 88);
    expect(grass.count).toBe(30);
    expect(grass.made).toMatch(/^calm-heart-grass/);
    expect(grass.cultivator.crafts.mastery).toEqual({ grain: 1, herbs: 1 });
    expect(plotOf(grass.cultivator, id)!.beds.slice(0, 2)).toEqual([null, null]);
  });

  it('reads the qi density, not the vein: a quarter below its need, ×1.15 a step above', () => {
    const { c, id } = sown();
    const plot = plotOf(c, id)!;
    const bed = plot.beds[1]!;
    expect(growthOf(c, plot, bed, 0)).toBeCloseTo(1.15);
    expect(growthOf(c, { ...plot, density: 1 }, bed, 0)).toBeCloseTo(0.25);
    expect(growthOf(c, { ...plot, density: 6 }, bed, 0)).toBeCloseTo(1.15 ** 4);
    // A crop of the plot's element grows ×1.25: calm-heart grass is wood, a forest plot wood.
    expect(growthOf(c, { ...plot, land: 'forest' }, bed, 0)).toBeCloseTo(1.15 * 1.25);
    expect(growthOf(c, { ...plot, soil: 2 }, bed, 0)).toBeCloseTo(1.15 * 1.25 ** 2);
  });

  it('an untended young herb grows at half; Spring-Rain counts as tended', () => {
    const { c, id } = sown();
    const away = days(c, 0, 30, false);
    const there = days(c, 0, 30, true);
    const grown = (x: Cultivator) => plotOf(x, id)!.beds[1]!.grown;
    expect(grown(away) / grown(there)).toBeCloseTo(0.5);
    const rain = applyToPlot(addItem(c, 'spring-rain-talisman', 1), id, 'spring-rain-talisman', 0);
    expect(rain.reason).toBeNull();
    const rained = days(rain.cultivator, 0, 30, false);
    expect(grown(rained) / grown(there)).toBeCloseTo(1.5);
  });

  it('pests take a bed a month once a plains plot has gone three months untended', () => {
    const { c, id } = sown('bought');
    expect(pestMonths(c, plotOf(c, id)!)).toBe(3);
    const bought = days(c, 0, 119, false);
    expect(plotOf(bought, id)!.beds.filter(Boolean)).toHaveLength(2);
    const r = growPlots(bought, 119, 120, null, noHeat);
    expect(plotOf(r.cultivator, id)!.beds.filter(Boolean)).toHaveLength(1);
    expect(r.events[0]!.type).toBe('plot-pests');
    // A pest ward holds them off for its season.
    const ward = 'pest-warding-talisman';
    const warded = applyToPlot(addItem(c, ward, 1), id, ward, 0).cultivator;
    expect(plotOf(days(warded, 0, 120, false), id)!.beds.filter(Boolean)).toHaveLength(2);
  });

  it('a thief takes the ripest bed once your heat at its place reaches 3', () => {
    const start = sown('bought');
    const id = start.id;
    let c = start.c;
    c = days(c, 0, 80, true);
    const quiet = days(c, 80, 35, false, () => 2);
    const hot = days(c, 80, 35, false, () => 3);
    expect(plotOf(quiet, id)!.beds.filter(Boolean)).toHaveLength(2);
    expect(plotOf(hot, id)!.beds.filter(Boolean)).toHaveLength(1);
  });

  it('earth milk ages a bed at once by its years, and age lifts a herb past its written top', () => {
    const { c, id } = sown();
    const milk = variantId('earth-milk', 'purple');
    const r = applyToPlot(addItem(c, milk, 1), id, milk, 0, 1);
    expect(r.reason).toBeNull();
    const bed = plotOf(r.cultivator, id)!.beds[1]!;
    expect(bed.grown).toBe(100 * 360);
    expect(isRipe(bed)).toBe(true);
    expect(ageBands(bed)).toBe(2);
    // Calm-heart grass is written white to green; a hundred-year bed reaches blue, a thousand purple.
    expect(cropTop(GRASS)).toBe('purple');
    expect(harvestOdds(r.cultivator, bed)).toEqual([{ rarity: 'blue', chance: 1 }]);
    const h = harvest(r.cultivator, id, 1, 1);
    expect(h.made).toBe(variantId(GRASS, 'blue'));
    // Past a hundred years one packet back comes a band up.
    expect(h.packets).toEqual({ [seedId(GRASS)]: 1, [variantId(seedId(GRASS), 'green')]: 1 });
  });

  it('the tending hand lifts the harvest, and only its rarity', () => {
    const start = sown();
    const id = start.id;
    let c = start.c;
    const bed = () => plotOf(c, id)!.beds[1]!;
    expect(harvestOdds(c, bed())).toEqual([{ rarity: 'white', chance: 1 }]);
    c = tendPlot(tendPlot(c, id, 0.9), id, 0.5);
    expect(bed()).toMatchObject({ hand: 1.4, sat: 2 });
    expect(harvestOdds(c, bed())).toEqual([
      { rarity: 'white', chance: expect.closeTo(1 - 0.7 * handReach(c, 'farming')) },
      { rarity: 'green', chance: expect.closeTo(0.7 * handReach(c, 'farming')) },
    ]);
    expect(bedYield(c, GRASS)).toBe(30);
  });

  it('a harvest feeds the furnace', () => {
    let c = takePlot(farmer(), SPEAR_PLOW, 'bought', 0).cultivator;
    const id = c.crafts.plots[0]!.id;
    c = {
      ...c,
      nodes: [
        ...c.nodes,
        'farming-ridge-bitterroot-seal',
        `${slipId('old-apricot-kernel')}-node`,
        `${slipId('qi-gathering-pill')}-node`,
      ],
    };
    c = addItem(addItem(c, seedId('old-apricot-kernel'), 1), seedId('ridge-bitterroot'), 1);
    c = plant(
      plant(c, id, 0, seedId('old-apricot-kernel'), 0).cultivator,
      id,
      1,
      seedId('ridge-bitterroot'),
      0,
    ).cultivator;
    c = days(c, 0, 90, true);
    c = harvest(harvest(c, id, 0, 90).cultivator, id, 1, 90).cultivator;
    expect(planInputs(c, recipe('qi-gathering-pill')).short).toEqual([]);
  });

  it('digs a bought plot’s soil up as one 2×2 thing, which another plot takes', () => {
    const start = sown();
    const id = start.id;
    let c = start.c;
    expect(digSoil(c, id, 0).reason).toMatch(/village/);
    c = takePlot(addItem(c, 'spirit-soil', 1), SPEAR_PLOW, 'bought', 0).cultivator;
    const mine = c.crafts.plots[1]!.id;
    c = applyToPlot(c, mine, 'spirit-soil', 0).cultivator;
    expect(plotOf(c, mine)!.soil).toBe(1);
    const dug = digSoil(c, mine, 0);
    expect(dug.reason).toBeNull();
    expect(dug.cultivator.items['soil.1']).toBe(1);
    expect(item('soil.1')).toMatchObject({ bulk: 4, stack: 1 });
    expect(plotOf(dug.cultivator, mine)!.soil).toBe(0);
    const laid = applyToPlot(dug.cultivator, id, 'soil.1', 0);
    expect(plotOf(laid.cultivator, id)!.soil).toBe(1);
  });
});

describe('the gather hour on divine sense', () => {
  it('×3 a soul realm from Foundation, +25% a Herbs mastery level', () => {
    const c = { ...farmer(), crafts: { ...farmer().crafts, mastery: {} } };
    const base = gatherFactor(c);
    expect(
      gatherFactor({ ...c, soul: { ...c.soul, realm: 'foundation-establishment' } }) / base,
    ).toBeCloseTo(3);
    expect(
      gatherFactor({ ...c, crafts: { ...c.crafts, mastery: { herbs: 10 } } }) / base,
    ).toBeCloseTo(1.25);
  });
});

describe('the save', () => {
  it('keeps a plot and its beds, and brings a v46 life up with none', () => {
    const { c } = sown();
    const s = newLife({ name: 'Han Li', seed: 'farm' });
    const save = makeSave({ ...s, player: c }, 1);
    const back = loadSave(JSON.parse(JSON.stringify(save)));
    expect(back.state.player.crafts.plots).toEqual(c.crafts.plots);
    const raw = JSON.parse(JSON.stringify(makeSave(s, 1)));
    raw.version = 46;
    delete raw.state.player.crafts.plots;
    expect(loadSave(raw).state.player.crafts.plots).toEqual([]);
  });
});
