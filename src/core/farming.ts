// Spirit farming (design § Professions, people and powers: Spirit farming; K8's talk): a plot is a
// plot however it is held, nine beds locked to their place. A bed is one crop sown from one packet;
// it grows on the qi density where it lies, its element, its soil and the season's boosters, at
// its hardiness while you're away; a ripe bed left in the ground keeps aging, a band at 10, 100 and
// 1,000 years. Pests come once a plot has gone untended past its span, and a thief once your heat
// at its place is high. You plant, harvest and tend only where you stand; the page lists every plot.
// The batch's rules are the bench's (core/crafts.ts): the family's mastery and the tending hand
// lift a harvest's rarity, a bed counts as a batch, and its yield gains as a batch's does.
import type { Recipe } from '../content/catalogs/types.ts';
import { LAND_ELEMENT, hasRecipe, recipe } from '../content/crafts.ts';
import {
  AGE_BANDS,
  AGED_PAST_TOP,
  BED_YIELD,
  BOOST,
  BRED_AT,
  CROPS,
  DENSITY,
  EARTH_MILK_YEARS,
  ELEMENT_MATCH,
  HARDINESS,
  PACKETS_BACK,
  PEST_MONTHS,
  PEST_MONTHS_ELSE,
  PLOT,
  RIPEN,
  SOIL_STEP,
  THIEF_HEAT,
  WOOD_SPELL_NODE,
  cropOfSeed,
  seedId,
  type Held,
} from '../content/farming.ts';
import { DAYS_PER_MONTH, DAYS_PER_YEAR } from '../content/calendar.ts';
import { hasItem, item, itemKind, variantId } from '../content/items.ts';
import { RARITY_IDS, rarityRank, type RarityId } from '../content/rarity.ts';
import { realmScale, tierRealm } from '../content/realms.ts';
import {
  countBatches,
  familyLevel,
  knowsRecipe,
  liftOf,
  withCrafts,
  yieldShare,
  type BenchEvent,
} from './crafts.ts';
import { stow } from './gear.ts';
import { pay, stonesOf, withStones } from './purse.ts';
import { hashSeed, Rng } from './rng.ts';
import { addItem, type Bed, type Cultivator, type Plot } from './state.ts';
import { stats } from './stats.ts';

// ---------------------------------------------------------------- holding a plot

/** Where a plot can be held: a written village or town, its land and the qi density there. */
export interface PlotSpot {
  place: string;
  land: string;
  density: number;
}

/** The highest tier a density grows at its need: tier 1 from 2, tier 2 from 4. */
export function densityTier(density: number): number {
  return Math.max(1, Math.floor(density / DENSITY.perTier));
}

/** A season's rent where a plot lies: 6 low where it grows tier 1, up the realm curve a tier. */
export function rentOf(density: number): number {
  return PLOT.rent * realmScale(tierRealm(densityTier(density)).id);
}

/** A plot bought: ten seasons' rent. */
export function buyOf(density: number): number {
  return rentOf(density) * PLOT.buySeasons;
}

export const plotsOf = (c: Cultivator): readonly Plot[] => c.crafts.plots;
export const plotsAt = (c: Cultivator, place: string): Plot[] =>
  c.crafts.plots.filter((p) => p.place === place);

export function plotOf(c: Cultivator, id: string): Plot | null {
  return c.crafts.plots.find((p) => p.id === id) ?? null;
}

const withPlots = (c: Cultivator, plots: Plot[]): Cultivator => withCrafts(c, { plots });
const withPlot = (c: Cultivator, plot: Plot): Cultivator =>
  withPlots(
    c,
    c.crafts.plots.map((p) => (p.id === plot.id ? plot : p)),
  );

export interface FarmCheck {
  cultivator: Cultivator;
  /** Why it couldn't be done, or null when it was. */
  reason: string | null;
}

function spendStones(c: Cultivator, price: number): Cultivator | null {
  const left = pay(stonesOf(c), price);
  return left ? withStones(c, left) : null;
}

/** Takes a plot where you stand: rented to a season from today, or bought. */
export function takePlot(c: Cultivator, spot: PlotSpot, held: Held, day: number): FarmCheck {
  const price = held === 'rented' ? rentOf(spot.density) : buyOf(spot.density);
  const paid = spendStones(c, price);
  if (!paid)
    return { cultivator: c, reason: `It costs ${price} low, and your purse can't cover it.` };
  const n = c.crafts.plots.filter((p) => p.place === spot.place).length + 1;
  const plot: Plot = {
    id: `${spot.place}#${n}-${Math.floor(day)}`,
    place: spot.place,
    held,
    until: held === 'rented' ? day + PLOT.season : null,
    land: spot.land,
    density: spot.density,
    soil: 0,
    beds: Array.from({ length: PLOT.beds }, () => null),
    there: day,
    pests: 0,
  };
  return { cultivator: withPlots(paid, [...c.crafts.plots, plot]), reason: null };
}

/** Pays a rented plot's rent for another season, or buys it outright. */
export function keepPlot(c: Cultivator, id: string, held: Held): FarmCheck {
  const plot = plotOf(c, id);
  if (!plot || plot.held === 'bought') return { cultivator: c, reason: 'You own it already.' };
  const price = held === 'rented' ? rentOf(plot.density) : buyOf(plot.density);
  const paid = spendStones(c, price);
  if (!paid)
    return { cultivator: c, reason: `It costs ${price} low, and your purse can't cover it.` };
  const next: Plot =
    held === 'rented'
      ? { ...plot, until: (plot.until ?? 0) + PLOT.season }
      : { ...plot, held: 'bought', until: null };
  return { cultivator: withPlot(paid, next), reason: null };
}

// ---------------------------------------------------------------- crops and growth

/** Whether a thing can be planted (K8's crops). */
export const isCrop = (id: string): boolean => id in CROPS && hasRecipe(id);

/** The crops you know how to plant: Grain and Herbs recipes taught by the tree, slips or finds. */
export function knownCrops(c: Cultivator): string[] {
  return Object.keys(CROPS).filter((id) => hasRecipe(id) && knowsRecipe(c, id));
}

/** The packets you carry for a crop, by id, worst first. */
export function packetsOf(c: Cultivator, crop: string): { id: string; n: number }[] {
  return Object.entries(c.items)
    .filter(([id, n]) => n > 0 && cropOfSeed(id) === crop && hasItem(id))
    .sort((a, b) => rarityRank(item(a[0]).rarity) - rarityRank(item(b[0]).rarity))
    .map(([id, n]) => ({ id, n }));
}

/** Days of growth a crop needs to ripen: a season at tier 1, ×1.5 a tier. */
export function ripenDays(crop: string): number {
  return RIPEN.days * RIPEN.perTier ** (item(crop).tier - 1);
}

export const bedYears = (b: Bed): number => b.grown / DAYS_PER_YEAR;
export const isRipe = (b: Bed): boolean => b.grown >= ripenDays(b.crop);

/** Whether a season's booster still runs on a plot. */
const runs = (until: number | undefined, day: number): boolean =>
  until !== undefined && day < until;

/** A plant's hardiness untended, by its age, plus the Farming tree's Hold (Line's perks). */
export function hardiness(c: Cultivator, b: Bed): { grows: number; word: string } {
  const years = bedYears(b);
  let at: (typeof HARDINESS)[number] = HARDINESS[0];
  for (const h of HARDINESS) if (years >= h.from) at = h;
  return { grows: Math.min(1, at.grows + stats(c).farmingHold), word: at.word };
}

/** Whether a plot counts as tended on a day: you're there, or a Spring-Rain talisman runs. */
export function tended(plot: Plot, here: boolean, day: number): boolean {
  return here || runs(plot.rain, day);
}

/**
 * How fast a bed grows a day, tended (design § Spirit farming): the qi density against twice its
 * tier (×0.25 below, ×1.15 a step above), its element on the plot's land ×1.25, the soil ×1.25 a
 * tier, Spring-Rain and the Wood spell ×1.5 each while they run; a ripe herb ages faster by Old
 * growth (`herbAge`).
 */
export function growthOf(c: Cultivator, plot: Plot, b: Bed, day: number): number {
  const it = item(b.crop);
  const need = DENSITY.perTier * it.tier;
  const density = plot.density < need ? DENSITY.below : DENSITY.step ** (plot.density - need);
  const element = it.element && LAND_ELEMENT[plot.land] === it.element ? ELEMENT_MATCH : 1;
  const soil = SOIL_STEP ** plot.soil;
  const rain = runs(plot.rain, day) ? BOOST.rain : 1;
  const wood = runs(plot.wood, day) ? BOOST.wood : 1;
  const age = isRipe(b) ? 1 + Math.max(0, stats(c).herbAge) : 1;
  return density * element * soil * rain * wood * age;
}

/** Months a plot goes untended before pests come: by its land, a month more a soil tier. */
export function pestMonths(c: Cultivator, plot: Plot): number {
  return (PEST_MONTHS[plot.land] ?? PEST_MONTHS_ELSE) + plot.soil + stats(c).farmingSafety;
}

/** The day pests count from: the last you stood there, or the end of a pest ward. */
const untendedFrom = (plot: Plot): number => Math.max(plot.there, plot.ward ?? -Infinity);

/** Something the plots did worth a line: a bed lost to pests or a thief, a lease run out. */
export type FarmEvent =
  | BenchEvent
  | { type: 'plot-pests'; data: { place: string; crop: string } }
  | { type: 'plot-thief'; data: { place: string; crop: string } }
  | { type: 'plot-lost'; data: { place: string } };

const keyed = (...parts: (string | number)[]) => new Rng(hashSeed(parts.join('/')));

/**
 * The plots across a stretch of days (`from` to `to`, at most a day): each bed grows, tended where
 * you stand (`here`, the place you stand at) and at its hardiness elsewhere; pests take a bed a
 * month once a plot has gone untended past its span; a thief takes the ripest bed a month where
 * your heat (`heatAt`) has reached 3; a rented plot whose lease has run out goes back.
 */
export function growPlots(
  c: Cultivator,
  from: number,
  to: number,
  here: string | null,
  heatAt: (place: string) => number,
): { cultivator: Cultivator; events: FarmEvent[] } {
  if (!c.crafts.plots.length || to <= from) return { cultivator: c, events: [] };
  const events: FarmEvent[] = [];
  const kept: Plot[] = [];
  for (const p0 of c.crafts.plots) {
    if (p0.held === 'rented' && p0.until !== null && to >= p0.until) {
      events.push({ type: 'plot-lost', data: { place: p0.place } });
      continue;
    }
    const isHere = here === p0.place;
    const care = tended(p0, isHere, to);
    let plot: Plot = {
      ...p0,
      beds: p0.beds.map((b) => {
        if (!b) return b;
        const rate = growthOf(c, p0, b, to) * (care ? 1 : hardiness(c, b).grows);
        return { ...b, grown: b.grown + rate * (to - from) };
      }),
    };
    if (isHere) plot = { ...plot, there: to, pests: 0 };
    else {
      // Pests, a bed a month past the plot's span.
      const months = Math.floor((to - untendedFrom(plot)) / DAYS_PER_MONTH);
      const due = Math.max(0, months - Math.floor(pestMonths(c, plot)));
      let pests = plot.pests;
      const beds = [...plot.beds];
      while (pests < due) {
        const sown = beds.flatMap((b, i) => (b ? [i] : []));
        pests += 1;
        if (!sown.length) continue;
        const i = keyed('pests', plot.id, pests, Math.floor(to)).pick(sown);
        events.push({ type: 'plot-pests', data: { place: plot.place, crop: beds[i]!.crop } });
        beds[i] = null;
      }
      plot = { ...plot, beds, pests };
      // A thief, once your heat at its place has reached 3: the ripest bed, a month at most.
      const month = Math.floor(to / DAYS_PER_MONTH);
      const away = to - plot.there >= DAYS_PER_MONTH;
      if (away && plot.thief !== month && heatAt(plot.place) >= THIEF_HEAT) {
        const ripe = plot.beds
          .map((b, i) => ({ b, i }))
          .filter((x): x is { b: Bed; i: number } => !!x.b && isRipe(x.b))
          .sort((a, b) => b.b.grown - a.b.grown)[0];
        if (ripe) {
          events.push({ type: 'plot-thief', data: { place: plot.place, crop: ripe.b.crop } });
          plot = {
            ...plot,
            thief: month,
            beds: plot.beds.map((b, i) => (i === ripe.i ? null : b)),
          };
        }
      }
    }
    kept.push(plot);
  }
  return { cultivator: withPlots(c, kept), events };
}

// ---------------------------------------------------------------- planting and harvest

/** Sows a bed with a packet you carry, of a crop you know. */
export function plant(
  c: Cultivator,
  id: string,
  bed: number,
  packet: string,
  day: number,
): FarmCheck {
  const plot = plotOf(c, id);
  const crop = cropOfSeed(packet);
  if (!plot || bed < 0 || bed >= plot.beds.length) return { cultivator: c, reason: 'No such bed.' };
  if (plot.beds[bed]) return { cultivator: c, reason: 'Something grows there already.' };
  if (!crop || !isCrop(crop)) return { cultivator: c, reason: 'That sows nothing.' };
  if (!knowsRecipe(c, crop))
    return { cultivator: c, reason: `You don't know how to grow ${item(crop).name}.` };
  if ((c.items[packet] ?? 0) <= 0) return { cultivator: c, reason: 'You carry no packet of it.' };
  const sown: Bed = {
    crop,
    floor: item(packet).rarity,
    sown: day,
    grown: 0,
    hand: 0,
    sat: 0,
    again: 0,
  };
  const beds = plot.beds.map((b, i) => (i === bed ? sown : b));
  return { cultivator: withPlot(addItem(c, packet, -1), { ...plot, beds }), reason: null };
}

/** A crop's highest band: its written top, and two past it for a herb aged in a plot. */
export function cropTop(crop: string): RarityId {
  const it = item(crop);
  const top = rarityRank(it.upTo ?? it.rarity) + (itemKind(it) === 'herb' ? AGED_PAST_TOP : 0);
  return RARITY_IDS[Math.min(RARITY_IDS.length - 1, top)]!;
}

/** Age bands a bed has reached: one at 10, 100 and 1,000 years. */
export const ageBands = (b: Bed): number => AGE_BANDS.filter((y) => bedYears(b) >= y).length;

/** The mean hand of a bed's sittings since sowing (K3's reading, a sitting at a time). */
export const bedHand = (b: Bed): number => (b.sat > 0 ? b.hand / b.sat : 0);

/** The lift a bed's harvest carries: the family's mastery and the tending hand (none unplayed). */
export function bedLift(c: Cultivator, b: Bed): number {
  return liftOf(c, recipe(b.crop), false, null, bedHand(b));
}

/**
 * The rarities a ripe bed lands on, with the chance of each: from its packet's floor the lift's
 * whole bands for sure and its fraction rolled, held to the crop's written top, then its age bands
 * on top, to the aged top.
 */
export function harvestOdds(c: Cultivator, b: Bed): { rarity: RarityId; chance: number }[] {
  const lift = bedLift(c, b);
  const whole = Math.floor(lift);
  const frac = lift - whole;
  const out = new Map<RarityId, number>();
  const at = (bands: number) => bandFrom(b, bands);
  out.set(at(whole), (out.get(at(whole)) ?? 0) + 1 - frac);
  if (frac > 0) out.set(at(whole + 1), (out.get(at(whole + 1)) ?? 0) + frac);
  return [...out].map(([rarity, chance]) => ({ rarity, chance }));
}

/** A bed's rarity a number of lift bands up from its floor, then its age bands. */
function bandFrom(b: Bed, bands: number): RarityId {
  const it = item(b.crop);
  const floor = rarityRank(b.floor as RarityId);
  const written = rarityRank(it.upTo ?? it.rarity);
  const lifted = floor >= written ? floor : Math.min(written, floor + bands);
  const top = rarityRank(cropTop(b.crop));
  return RARITY_IDS[Math.min(top, lifted + ageBands(b))]!;
}

/** Pieces a ripe bed gives: its crop's own count or its floor's, gaining as a batch's yield does. */
export function bedYield(c: Cultivator, crop: string): number {
  const r = recipe(crop);
  const base = CROPS[crop]?.count ?? BED_YIELD[item(crop).rarity];
  return Math.max(1, Math.round(base * (1 + yieldShare(c, r))));
}

export interface Harvest extends FarmCheck {
  made: string | null;
  count: number;
  /** The packets it gave back, by id. */
  packets: Record<string, number>;
  events: FarmEvent[];
}

/**
 * Harvests a ripe bed where you stand: its pieces at their rarity to the Bag (or the bench's tray
 * when it is full), two packets back at its floor (past a hundred years one a band up, and Lore's
 * odds may lift the spare), a batch toward its family. A grain bed with Second Harvest heads again.
 */
export function harvest(c: Cultivator, id: string, bed: number, day: number): Harvest {
  const none = (reason: string): Harvest => ({
    cultivator: c,
    reason,
    made: null,
    count: 0,
    packets: {},
    events: [],
  });
  const plot = plotOf(c, id);
  const b = plot?.beds[bed];
  if (!plot || !b) return none('Nothing grows there.');
  if (!isRipe(b))
    return none(`It ripens in ${Math.ceil(ripenDays(b.crop) - b.grown)} days of growth.`);
  const r: Recipe = recipe(b.crop);
  const rng = keyed('harvest', c.id, plot.id, bed, Math.floor(day), b.sown);
  const lift = bedLift(c, b);
  const bands = Math.floor(lift) + (rng.chance(lift - Math.floor(lift)) ? 1 : 0);
  const made = variantId(b.crop, bandFrom(b, bands));
  const count = bedYield(c, b.crop);
  let next = c;
  const s = stow(next, made, count);
  next = s.c;
  if (s.left > 0)
    next = withCrafts(next, {
      tray: { ...next.crafts.tray, [made]: (next.crafts.tray[made] ?? 0) + s.left },
    });
  // The packets back, at the bed's floor; an old bed's seed comes a band up, and Lore's odds the spare.
  const packets: Record<string, number> = {};
  const floor = rarityRank(b.floor as RarityId);
  const top = rarityRank(cropTop(b.crop));
  for (let i = 0; i < PACKETS_BACK; i++) {
    const up = (i === 0 && bedYears(b) >= BRED_AT) || (i === 1 && rng.chance(stats(c).farmingOdds));
    const rar = RARITY_IDS[Math.min(top, floor + (up ? 1 : 0))]!;
    const pid = variantId(seedId(b.crop), rar);
    packets[pid] = (packets[pid] ?? 0) + 1;
  }
  for (const [pid, n] of Object.entries(packets)) next = stow(next, pid, n).c;
  const events: BenchEvent[] = [];
  next = countBatches(next, r, 1, events);
  // A grain bed with Second Harvest (Line's capstones) heads again without sowing.
  const again = r.family === 'grain' && b.again < Math.floor(stats(c).secondHarvest);
  const beds = next.crafts.plots
    .find((p) => p.id === id)!
    .beds.map((x, i) =>
      i !== bed
        ? x
        : again
          ? { ...b, grown: 0, hand: 0, sat: 0, again: b.again + 1, sown: day }
          : null,
    );
  next = withPlot(next, { ...plotOf(next, id)!, beds });
  return { cultivator: next, reason: null, made, count, packets, events };
}

// ---------------------------------------------------------------- boosters and soil

/**
 * Uses a thing at a plot where you stand: spirit soil lifts its soil to the soil's tier, earth milk
 * ages a bed at once by its years, a talisman covers the plot for a season (Spring-Rain's growth or
 * a pest ward), dug-up soil is laid down and the plot takes its tier.
 */
export function applyToPlot(
  c: Cultivator,
  id: string,
  thing: string,
  day: number,
  bed?: number,
): FarmCheck {
  const plot = plotOf(c, id);
  if (!plot) return { cultivator: c, reason: 'No such plot.' };
  if ((c.items[thing] ?? 0) <= 0) return { cultivator: c, reason: 'You carry none.' };
  const it = item(thing);
  const use = it.uses.field;
  if (!use) return { cultivator: c, reason: 'It does nothing for a plot.' };
  let next: Plot | null = null;
  if (use.soil) {
    if (plot.soil >= it.tier) return { cultivator: c, reason: 'The soil is already that good.' };
    next = { ...plot, soil: it.tier };
  } else if (use.dug !== undefined) {
    next = { ...plot, soil: use.dug };
  } else if (use.milk) {
    const b = bed !== undefined ? plot.beds[bed] : null;
    if (!b) return { cultivator: c, reason: 'Pour it on a bed that grows something.' };
    const years = EARTH_MILK_YEARS[it.rarity] ?? 0;
    next = {
      ...plot,
      beds: plot.beds.map((x, i) =>
        i === bed && x ? { ...x, grown: x.grown + years * DAYS_PER_YEAR } : x,
      ),
    };
  } else if (use.season) {
    const key = use.season === 'rain' ? 'rain' : 'ward';
    if (runs(plot[key], day)) return { cultivator: c, reason: 'One already runs on this plot.' };
    next = { ...plot, [key]: day + BOOST.days };
  }
  if (!next) return { cultivator: c, reason: 'It does nothing for a plot.' };
  return { cultivator: withPlot(addItem(c, thing, -1), next), reason: null };
}

/** Whether you can cast the Wood spell on a plot (Wood's Rooting Hand), and why not. */
export function woodSpellCheck(c: Cultivator, plot: Plot, day: number): string | null {
  if (!c.nodes.includes(WOOD_SPELL_NODE)) return "The Wood Dao's Rooting Hand casts it.";
  if (runs(plot.wood, day)) return 'It runs here this season already.';
  return null;
}

/** Casts the Wood spell on a plot where you stand: ×1.5 growth for a season. */
export function castWood(c: Cultivator, id: string, day: number): FarmCheck {
  const plot = plotOf(c, id);
  if (!plot) return { cultivator: c, reason: 'No such plot.' };
  const why = woodSpellCheck(c, plot, day);
  if (why) return { cultivator: c, reason: why };
  return { cultivator: withPlot(c, { ...plot, wood: day + BOOST.days }), reason: null };
}

/**
 * Digs a bought plot's soil up as one 2×2 thing carrying its tier (Soil moves): what is ripe is
 * harvested first and the rest is lost, and the plot is left plain earth.
 */
export function digSoil(
  c: Cultivator,
  id: string,
  day: number,
): FarmCheck & { events: FarmEvent[] } {
  const plot = plotOf(c, id);
  if (!plot) return { cultivator: c, reason: 'No such plot.', events: [] };
  if (plot.held !== 'bought')
    return { cultivator: c, reason: "A rented plot's soil is the village's.", events: [] };
  let next = c;
  const events: FarmEvent[] = [];
  plot.beds.forEach((b, i) => {
    if (b && isRipe(b)) {
      const h = harvest(next, id, i, day);
      next = h.cultivator;
      events.push(...h.events);
    }
  });
  const soil = `soil.${plot.soil}`;
  const s = stow(next, soil, 1);
  if (s.left > 0)
    return { cultivator: c, reason: 'Your Bag has no room for a 2×2 bundle.', events: [] };
  const left = plotOf(s.c, id)!;
  next = withPlot(s.c, { ...left, soil: 0, beds: left.beds.map(() => null) });
  return { cultivator: next, reason: null, events };
}

// ---------------------------------------------------------------- tending

/** A tending sitting at a plot where you stand: its hand joins every sown bed's mean. */
export function tendPlot(c: Cultivator, id: string, hand: number): Cultivator {
  const plot = plotOf(c, id);
  if (!plot) return c;
  const h = Math.max(0, Math.min(1, hand));
  return withPlot(c, {
    ...plot,
    beds: plot.beds.map((b) => (b ? { ...b, hand: b.hand + h, sat: b.sat + 1 } : b)),
  });
}

/** The page's word for a bed: ripe, its hardiness's word, or the days it still needs. */
export function bedWord(c: Cultivator, b: Bed): string {
  return hardiness(c, b).word;
}

/** The family a crop's mastery is kept by, and its level. */
export function cropMastery(c: Cultivator, crop: string): number {
  return familyLevel(c, recipe(crop).family);
}
