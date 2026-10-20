// A crafter's living (design § Professions, Crafts, thin: crafters are rich, as in the novels; K1,
// and Jan's call in its talk: at least as good as a life with no craft, and well past it with
// mastery). A Qi Condensation alchemist with a crude clay furnace and the Qi-Gathering Pill's
// recipe brews on four Craft hours a day for a month at a market, buying the herbs off its shelves
// each day and selling the pills each day to whichever shop offers most, the prices moving as it
// buys and sells. The net a day is set against what a life with no craft earns: a duty day (1.5
// low at Qi Condensation) and four gather hours in the wild, the herbs sold at the same market.
// The marks: Glimpse about four gather hours on average over the markets (and at least 0.4× at
// each), Comprehension at least 13.5 low (a duty day a realm up, D4), Mastery at least 25. The net
// is per four craft hours; the batches a month are what the market's shelves feed, the rein.
// Played (K3): the same months sat at the furnace at a 0.8 hand, which should beat queuing by a
// fair margin, at least ×1.5 the queued net at each level (the steady hand moves only rarity).
// Run: npm run sim -- craft
import { DAYS_PER_MONTH, DAYS_PER_YEAR } from '../src/content/calendar.ts';
import { CRAFT_MASTERY, recipe, recipeHours } from '../src/content/crafts.ts';
import { baseOf, item } from '../src/content/items.ts';
import { GATHER } from '../src/content/map/travel.ts';
import { slipId } from '../src/content/catalogs/index.ts';
import { shopsAt } from '../src/content/shops.ts';
import { batchesHeld, workBench } from '../src/core/crafts.ts';
import { stonesOf, worthOf } from '../src/core/purse.ts';
import { Rng } from '../src/core/rng.ts';
import { buy, offerFor, repair, sell, shelf } from '../src/core/shops.ts';
import { SHOPS } from '../src/content/shops.ts';
import { addItem, newLife, withPlayer, type GameState } from '../src/core/state.ts';

const RECIPE = 'qi-gathering-pill';
const HOURS = 4;
const DAYS = DAYS_PER_MONTH;
const DUTY_DAY = 1.5;
const MARKETS = [
  { id: 'qm-shoukou-cheng', name: 'the City of the Guarded Mouth' },
  { id: 'pacified-fort', name: 'Pacified Fort' },
];
const LEVELS = [
  { name: 'Glimpse', level: 0 },
  { name: 'Comprehension', level: 1 },
  { name: 'Mastery', level: 2 },
];

const purse = (s: GameState) => worthOf(stonesOf(s.player));

/** Buys one batch's inputs off the cheapest shelves; false when the market has none left. */
function buyBatch(s0: GameState, market: string, batches = 1): GameState | null {
  let s = s0;
  const r = recipe(RECIPE);
  for (const input of r.inputs) {
    let need = input.count * batches - (s.player.items[input.thing] ?? 0);
    while (need > 0) {
      const lots = shopsAt(market)
        .flatMap((id) => shelf(s, id).map((l) => ({ id, l })))
        .filter((x) => baseOf(x.l.thing) === input.thing && x.l.n > 0 && item(x.l.thing).tier === 1)
        .sort((a, b) => a.l.price - b.l.price);
      const best = lots[0];
      if (!best) return null;
      const res = buy(s, best.id, best.l.slot, Math.min(need, best.l.n));
      if (!res.ok) return null;
      s = res.state;
      need =
        input.count * batches -
        Object.entries(s.player.items)
          .filter(([id]) => baseOf(id) === input.thing)
          .reduce((t, [, n]) => t + n, 0);
    }
  }
  return s;
}

/** Sells every pill held to the best offers, a batch-sized lot at a time. */
function sellPills(s0: GameState, market: string): GameState {
  let s = s0;
  for (const [id, n] of Object.entries(s.player.items)) {
    if (baseOf(id) !== RECIPE || n <= 0) continue;
    let left = n;
    while (left > 0) {
      const offers = shopsAt(market)
        .map((sh) => ({ sh, o: offerFor(s, sh, id) }))
        .filter((x) => x.o.ok)
        .sort((a, b) => (b.o.ok ? b.o.each : 0) - (a.o.ok ? a.o.each : 0));
      let sold = false;
      for (const { sh } of offers) {
        const k = Math.min(left, 10);
        const r = sell(s, sh, id, k);
        if (r.ok) {
          s = r.state;
          left -= k;
          sold = true;
          break;
        }
      }
      if (!sold) break;
    }
  }
  return s;
}

function run(
  market: string,
  level: number,
  seed: number,
  hand = 0,
): { batches: number; herbs: number; bought: number; pills: number; mend: number } {
  const tally = { herbs: 0, bought: 0, pills: 0, mend: 0 };
  let s = newLife({ name: 'Han Li', seed: `craft-${market}-${level}-${seed}` });
  const year = Math.floor(s.calendar.day / DAYS_PER_YEAR) * DAYS_PER_YEAR;
  s = { ...s, calendar: { ...s.calendar, day: year + (2 + seed) * DAYS_PER_MONTH } };
  let p = addItem({ ...s.player, stones: 2000, items: {} }, 'crude-clay-furnace', 1);
  p = { ...p, nodes: [...p.nodes, `${slipId(RECIPE)}-node`] };
  // A qi cultivator whose soul lags, as most do: unmatched, so the odds are the table's own.
  p = { ...p, qi: { ...p.qi, stage: 5 }, soul: { ...p.soul, stage: 3 } };
  const fam = recipe(RECIPE).family;
  p = { ...p, crafts: { ...p.crafts, mastery: { [fam]: CRAFT_MASTERY.batches[level]! } } };
  s = withPlayer(s, p);
  const rng = new Rng(level * 7919 + seed * 104729 + market.length);
  let batches = 0;
  for (let d = 0; d < DAYS; d++) {
    // Herbs for two batches in hand, bought off the cheapest shelves.
    let spent = purse(s);
    const had = batchesHeld(s.player, recipe(RECIPE));
    if (had < 2) {
      const bought = buyBatch(s, market, 2);
      if (bought) s = bought;
    }
    tally.bought += batchesHeld(s.player, recipe(RECIPE)) - had;
    tally.herbs += spent - purse(s);
    // Keep the mastery where the row sets it, so each row reads one level.
    const keep = s.player.crafts.mastery;
    const queued = {
      ...s.player,
      crafts: { ...s.player.crafts, bench: [{ recipe: RECIPE, batches: 99 }] },
    };
    const r = workBench(queued, HOURS, s.calendar.day, rng, { hand });
    batches += r.batches;
    s = withPlayer(s, { ...r.cultivator, crafts: { ...r.cultivator.crafts, mastery: keep } });
    spent = purse(s);
    s = sellPills(s, market);
    tally.pills += purse(s) - spent;
    // A blow-up's cracked furnace goes to a refiner the same day.
    const cracked = Object.keys(s.player.items).find((id) => item(id).cracked);
    if (cracked) {
      const refiner = shopsAt(market).find(
        (id) => SHOPS.find((sh) => sh.id === id)?.kind === 'refiner',
      );
      const m = refiner ? repair(s, refiner, cracked) : null;
      if (m?.ok) {
        tally.mend += purse(s) - purse(m.state);
        s = m.state;
      }
    }
    s = { ...s, calendar: { ...s.calendar, day: s.calendar.day + 1 } };
  }
  return { batches, ...tally };
}

/** Four gather hours in the wild, the herbs sold where the crafter sells. */
function gatherDay(market: string): number {
  const s = newLife({ name: 'Han Li', seed: 'gather' });
  const o = offerFor(
    withPlayer(s, addItem(s.player, 'old-apricot-kernel', 1)),
    shopsAt(market).find((sh) => offerFor(s, sh, 'old-apricot-kernel').ok) ?? '',
    'old-apricot-kernel',
  );
  return o.ok ? GATHER.wild * HOURS * o.each : 0;
}

const SEEDS = 4;
const PLAYED = 0.8;
const PLAYED_MARGIN = 1.5;
const fmt = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
console.log(
  `A crafter's month: ${HOURS} Craft hours a day, the ${item(RECIPE).name}, herbs bought and pills sold each day, ${SEEDS} months a row.`,
);
console.log('The net is what four craft hours earn; the batches, what the shelves fed in a month.');
let pass = true;
const glimpse: number[] = [];
for (const m of MARKETS) {
  const gather = gatherDay(m.id);
  console.log('');
  console.log(`${m.name}: a duty day ${fmt(DUTY_DAY)} low, four gather hours ${fmt(gather)} low`);
  const netOf = (level: number, hand: number) => {
    const t = { batches: 0, herbs: 0, bought: 0, pills: 0, mend: 0 };
    for (let k = 0; k < SEEDS; k++) {
      const r = run(m.id, level, k, hand);
      for (const key of Object.keys(t) as (keyof typeof t)[]) t[key] += r[key];
    }
    const perBatch = t.pills / t.batches - t.herbs / Math.max(1, t.bought) - t.mend / t.batches;
    return { t, net: (perBatch * HOURS) / recipeHours(recipe(RECIPE)) };
  };
  for (const l of LEVELS) {
    const { t, net } = netOf(l.level, 0);
    if (l.level === 0) glimpse.push(net / gather);
    const ok = l.level === 0 ? net >= gather * 0.4 : l.level === 1 ? net >= 13.5 : net >= 25;
    if (!ok) pass = false;
    console.log(
      `  ${l.name.padEnd(14)} ${fmt(net).padStart(6)} low per four hours; ${fmt(t.batches / SEEDS)} batches a month, herbs ${fmt(t.herbs / Math.max(1, t.bought))} and pills ${fmt(t.pills / t.batches)} a batch${ok ? '' : '  (off the mark)'}`,
    );
    const played = netOf(l.level, PLAYED);
    const margin = played.net / net;
    const playedOk = margin >= PLAYED_MARGIN;
    if (!playedOk) pass = false;
    console.log(
      `  ${'  played'.padEnd(14)} ${fmt(played.net).padStart(6)} low per four hours at a ${PLAYED} hand, ×${fmt(margin)} queued; pills ${fmt(played.t.pills / played.t.batches)} a batch${playedOk ? '' : '  (off the mark)'}`,
    );
  }
}
const mean = glimpse.reduce((a, b) => a + b, 0) / glimpse.length;
if (mean < 0.75) pass = false;
console.log('');
console.log(`Glimpse earns ${fmt(mean)}× four gather hours, on average over the markets.`);
console.log(
  pass
    ? 'PASS: a crafter out-earns a life with no craft, mastery pays, and playing beats queuing.'
    : 'FAIL: off the mark.',
);
if (!pass) process.exitCode = 1;
