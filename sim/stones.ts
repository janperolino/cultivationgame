// Stones in and out (design § Economy, What the balance sims measure; E4): a working cultivator's
// month at each Border Wilds market, by realm. In: a month of wages at its realm and the market's
// prosperity. Out: the month's basket (People make and use) bought at that market's prices, each
// need shared among the goods that fill it there, priced at the common grade by the posted price
// and the market's supply. What is left is what burning, upkeep, tolls and fees draw on. The mark: positive but
// tight at Qi Condensation and Foundation, the basket taking most of the wages as the novels'
// cultivators spend them. Loot, bounties, cards, upkeep, tolls, fees, the grade premium and
// robbery wait for a sim that plays a life through.
// Run: npm run sim -- stones
import { DAYS_PER_MONTH } from '../src/content/calendar.ts';
import { BASKET, FILLED_BY, type BasketNeed } from '../src/content/markets.ts';
import { item } from '../src/content/items.ts';
import { marketSum } from '../src/core/making.ts';
import {
  goodTags,
  marketFactor,
  marketTopTier,
  MARKETS,
  prosperityOf,
  wages,
} from '../src/core/markets.ts';
import { rarity } from '../src/content/rarity.ts';
import { priceOf } from '../src/core/prices.ts';
import { emptyWorld } from '../src/core/resolver/world.ts';

/** Kept by the left-over share of the wages, across the region's markets. */
const BAND = [0.05, 0.4] as const;
const REALMS = [
  { tier: 1, name: 'Qi Condensation' },
  { tier: 2, name: 'Foundation' },
] as const;

const w = emptyWorld();
const day = 0;
const month = 0;

/** A thing's price at the common grade: a month's wear is bought white, whatever the line's best. */
const white = (thing: string) => priceOf(thing) / rarity(item(thing).rarity).price;

/** A month's basket for one cultivator of a tier at a market, at its prices, in low-grade stones. */
function basket(m: (typeof MARKETS)[number], tier: number): number | null {
  if (marketTopTier(m) < tier) return null;
  const sum = marketSum(w, m, month);
  const scale = wages(1, prosperityOf(w, m.id, day));
  let cost = 0;
  for (const need of Object.keys(BASKET) as BasketNeed[]) {
    const each = BASKET[need][tier]!;
    if (each <= 0) continue;
    const tags = FILLED_BY[need] ?? [need];
    const goods = [...sum.goods.values()].filter(
      (g) =>
        g.used > 0 &&
        item(g.thing).tier === tier &&
        item(g.thing).taels === undefined &&
        goodTags(g.thing).some((t) => tags.includes(t)),
    );
    if (goods.length === 0) continue;
    const price =
      goods.reduce((t, g) => t + white(g.thing) * marketFactor(w, m, g.thing, day), 0) /
      goods.length;
    cost += each * scale * price;
  }
  return cost;
}

const fmt = (n: number) => Math.round(n).toLocaleString('en');
console.log(
  'A month of wages against a month of the basket bought where you live (low-grade stones).',
);
let pass = true;
for (const r of REALMS) {
  console.log(`\n${r.name}`);
  console.log('market'.padEnd(32), 'in'.padStart(7), 'out'.padStart(7), 'left'.padStart(7));
  const shares: number[] = [];
  for (const m of MARKETS) {
    const out = basket(m, r.tier);
    if (out === null) continue;
    const pay = wages(r.tier, prosperityOf(w, m.id, day)) * DAYS_PER_MONTH;
    const left = (pay - out) / pay;
    shares.push(left);
    console.log(
      m.name.padEnd(32),
      fmt(pay).padStart(7),
      fmt(out).padStart(7),
      `${Math.round(left * 100)}%`.padStart(7),
    );
  }
  const mean = shares.reduce((t, x) => t + x, 0) / shares.length;
  const ok = mean >= BAND[0] && mean <= BAND[1] && shares.every((x) => x > 0);
  if (!ok) pass = false;
  console.log(
    `${r.name}: ${Math.round(mean * 100)}% left on average${ok ? '' : ' (off the mark)'}`,
  );
}
console.log(
  pass
    ? '\nPASS: stones in beat stones out, but tightly, at Qi Condensation and Foundation.'
    : '\nFAIL: stones in and out are off the mark.',
);
if (!pass) process.exitCode = 1;
