// The haul's mark (design § Economy, Trading yourself; E3): a full Bag of ten lots of a staple,
// bought where it is made and carried across a kingdom to where it is needed, pays about one and a
// half times the wages for the same days. A fresh Qi Condensation life buys ten Bag squares of
// spirit rice off the shelves of Pacified Fort's free market (since E5, from whichever shop there
// holds the most), walks the road to Sinkhole Terraces at its own pace paying the tolls, and sells
// lot by lot to whichever shop there offers most, the price falling
// as the terraces fill. The profit is set against the days' wages at an ordinary place (1 low a day
// at Qi Condensation). A second row hauls the mortal staple the same way, millet from Spear-Plow to
// Sinkhole Terraces, against a laborer's 0.1 tael a day. Since E4 the harvest moves both ends, so
// each haul runs twice: set out in spring, when the granaries are emptying, and just after the
// autumn harvest, when the March's rice is cheapest and the terraces' least short.
// Run: npm run sim -- haul
import { DAYS_PER_MONTH, DAYS_PER_YEAR } from '../src/content/calendar.ts';
import { CHECKPOINT_TOLL_LOW } from '../src/content/map/travel.ts';
import { PACK_SQUARES } from '../src/content/gear.ts';
import { item } from '../src/content/items.ts';
import { bagStacks } from '../src/core/gear.ts';
import { placeById } from '../src/core/map/region.ts';
import { planRoute } from '../src/core/map/route.ts';
import { ensureMap, liPerDay, mapOf } from '../src/core/map/travel.ts';
import { mortalWages, wages } from '../src/core/markets.ts';
import { stonesOf, worthOf } from '../src/core/purse.ts';
import { shopsAt } from '../src/content/shops.ts';
import { buy, offerFor, sell, shelf } from '../src/core/shops.ts';
import { newLife, withPlayer, type GameState } from '../src/core/state.ts';

const LOTS = PACK_SQUARES;
const MARK = 1.5;
const BAND = [1.3, 1.7] as const;

interface Haul {
  name: string;
  staple: string;
  from: string;
  to: string;
  silver: boolean;
}

const HAULS: readonly Haul[] = [
  {
    name: 'spirit rice, Pacified Fort to Sinkhole Terraces',
    staple: 'spirit-rice',
    from: 'pacified-fort',
    to: 'sinkhole-terraces',
    silver: false,
  },
  {
    name: 'millet, Spear-Plow to Sinkhole Terraces',
    staple: 'frontier-millet',
    from: 'spear-plow',
    to: 'sinkhole-terraces',
    silver: true,
  },
];

const purse = (s: GameState, silver: boolean) =>
  silver ? s.player.silver : worthOf(stonesOf(s.player));

/** The seasons a haul sets out in: spring's first month and autumn's harvest month. */
const SEASONS = [
  { name: 'spring', month: 0 },
  { name: 'autumn', month: 7 },
] as const;

function run(
  h: Haul,
  month: number,
): { days: number; cost: number; paid: number; profit: number; ratio: number } {
  let s = ensureMap(newLife({ name: 'Han Li', seed: 'haul' }));
  s = withPlayer(s, { ...s.player, stones: 2000, silver: 200, items: {} });
  const year = Math.floor(s.calendar.day / DAYS_PER_YEAR) * DAYS_PER_YEAR;
  s = { ...s, calendar: { ...s.calendar, day: year + month * DAYS_PER_MONTH } };
  const map = mapOf(s)!;
  const before = purse(s, h.silver);
  // Ten Bag squares off the shelves, each dearer than the last, from the shop holding the most.
  const lot = item(h.staple).stack ?? 20;
  for (let i = 0; i < LOTS; i++) {
    const lines = shopsAt(h.from)
      .flatMap((id) => shelf(s, id).map((l) => ({ id, l })))
      .filter((x) => x.l.standing && x.l.thing === h.staple && x.l.n >= lot)
      .sort((x, y) => y.l.n - x.l.n);
    const best = lines[0];
    if (!best) throw new Error(`${h.from} has no shelf of ${h.staple} left`);
    const r = buy(s, best.id, best.l.slot, lot);
    if (!r.ok) throw new Error(r.reason);
    s = r.state;
  }
  const squares = bagStacks(s.player).reduce((t, x) => t + x.squares, 0);
  if (squares !== LOTS) throw new Error(`the haul fills ${squares} squares, not ${LOTS}`);
  const cost = before - purse(s, h.silver);
  // The road, at this life's own pace, and its tolls.
  const a = placeById(map, h.from)!;
  const b = placeById(map, h.to)!;
  const route = planRoute(map, [a.x, a.y], [b.x, b.y]);
  if (!route.ok) throw new Error(route.reason);
  const li = route.route.roadLi + route.route.crossLi;
  const days = Math.ceil(li / liPerDay(s));
  const tolls = h.silver ? 0 : route.route.tolls.length * CHECKPOINT_TOLL_LOW;
  s = { ...s, calendar: { ...s.calendar, day: s.calendar.day + days } };
  // Sold lot by lot to the best offer that can pay.
  const start = purse(s, h.silver);
  for (let i = 0; i < LOTS; i++) {
    const best = shopsAt(h.to)
      .map((id) => ({ id, o: offerFor(s, id, h.staple) }))
      .filter((x) => x.o.ok)
      .sort((x, y) => (y.o.ok ? y.o.each : 0) - (x.o.ok ? x.o.each : 0));
    let sold = false;
    for (const { id } of best) {
      const r = sell(s, id, h.staple, lot);
      if (r.ok) {
        s = r.state;
        sold = true;
        break;
      }
    }
    if (!sold) break;
  }
  const paid = purse(s, h.silver) - start;
  const profit = paid - cost - tolls;
  const wage = h.silver ? mortalWages(5) : wages(1, 5);
  return { days, cost, paid, profit, ratio: profit / (days * wage) };
}

const fmt = (n: number) => (Math.round(n * 100) / 100).toString();
console.log(
  `The haul's mark: a full Bag of ${LOTS} lots pays about ${MARK}× the wages for its days.`,
);
console.log(
  'haul'.padEnd(56),
  'days',
  'cost'.padStart(8),
  'paid'.padStart(8),
  'profit'.padStart(8),
  'ratio',
);
let pass = true;
for (const h of HAULS)
  for (const season of SEASONS) {
    const r = run(h, season.month);
    const ok = r.ratio >= BAND[0] && r.ratio <= BAND[1];
    if (h === HAULS[0] && !ok) pass = false;
    console.log(
      `${h.name}, ${season.name}`.padEnd(56),
      String(r.days).padStart(4),
      fmt(r.cost).padStart(8),
      fmt(r.paid).padStart(8),
      fmt(r.profit).padStart(8),
      `${fmt(r.ratio)}×${ok ? '' : '  (off the mark)'}`,
    );
  }
console.log(
  pass
    ? 'PASS: the spirit rice haul is on the mark in both seasons.'
    : 'FAIL: the spirit rice haul is off the mark.',
);
if (!pass) process.exitCode = 1;
