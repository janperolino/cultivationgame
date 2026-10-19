// The dwelling against the world's share (design § Economy, What the balance sims measure; § What
// membership gives and asks: "the balance sims recheck the world's share against it"; O2).
// Progress splits about half from the world and half from seclusion: a month of seclusion with a
// full burn of stones, the world's half bought with wages, against the same month without them.
// The world's share is the part of the month's qi the stones brought. Each row secludes inside the
// Beast-Butcher Gate at a seat's dwelling (×1.1 outer to ×2 elder, its tier 4 vein capping none),
// at Qi Condensation layer 5 and at Foundation 1, every waking hour on qi. The mark: 40% to 60% at
// every seat. A stone's qi follows the day's draw, density included (O2's talk), so the dwelling
// lifts both halves alike and the share holds.
// Run: npm run sim -- dwelling
import { DAYS_PER_MONTH } from '../src/content/calendar.ts';
import { method, nextChapter } from '../src/content/methods.ts';
import type { SeatId } from '../src/content/organizations.ts';
import type { RealmId } from '../src/content/realms.ts';
import { cultivateDays } from '../src/core/cultivation.ts';
import { gainMethod, switchMethod } from '../src/core/life.ts';
import { dwellingDensity } from '../src/core/organizations.ts';
import { Rng } from '../src/core/rng.ts';
import { newLife, withPlayer, type Cultivator } from '../src/core/state.ts';

const GATE = 'qm-tushou-men';
const BAND = [0.4, 0.6] as const;
const SEATS: (SeatId | null)[] = [null, 'outer', 'inner', 'true', 'elder'];
const REALMS: { realm: RealmId; stage: number; name: string }[] = [
  { realm: 'qi-condensation', stage: 5, name: 'Qi Condensation 5' },
  { realm: 'foundation-establishment', stage: 1, name: 'Foundation 1' },
];

/** A cultivator at a realm, every waking hour on qi, burning stones or not, with a deep purse. */
function sitter(realm: RealmId, stage: number, burn: boolean): Cultivator {
  let s = newLife({ name: 'Sim', seed: 'dwelling' });
  s = withPlayer(s, { ...s.player, qi: { ...s.player.qi, realm, stage } });
  // Past Qi Condensation the origin's method needs its next chapter, handed over as pacing does.
  const chapter = nextChapter(method(s.player.activeMethods.qi!));
  if (realm !== 'qi-condensation' && chapter) {
    s = gainMethod(s, chapter.id, 'is given');
    s = switchMethod(s, 'qi', chapter.id).state;
  }
  const p = s.player;
  const wheel = p.wheel.map((k) => (k === 'sleep' ? 'sleep' : 'qi'));
  return withPlayer(s, {
    ...p,
    wheel,
    qi: { ...p.qi, realm, stage, bar: 0 },
    stones: 10_000_000,
    plan: { ...p.plan, burnStones: burn },
  }).player;
}

/** Qi gathered over a month of seclusion at a density, a day at a time. */
function monthQi(realm: RealmId, stage: number, burn: boolean, density: number): number {
  let c = sitter(realm, stage, burn);
  let qi = 0;
  for (let day = 0; day < DAYS_PER_MONTH; day++) {
    const before = c.qi.bar;
    c = cultivateDays(c, 1, { day, rng: new Rng(day + 1), density }).cultivator;
    qi += c.qi.bar - before;
    c = { ...c, qi: { ...c.qi, bar: 0 } };
  }
  return qi;
}

const checks: [string, string, boolean][] = [];
console.log('World share of a month secluding at the Gate, by seat (stones / all qi)\n');
console.log(
  `  ${'seat'.padEnd(8)} ${'density'.padEnd(8)} ${REALMS.map((r) => r.name.padEnd(20)).join('')}`,
);
for (const seat of SEATS) {
  const density = seat ? dwellingDensity(seat, GATE) : 1;
  const shares = REALMS.map((r) => {
    const all = monthQi(r.realm, r.stage, true, density);
    const air = monthQi(r.realm, r.stage, false, density);
    return all > 0 ? (all - air) / all : NaN;
  });
  console.log(
    `  ${(seat ?? 'none').padEnd(8)} ${`×${density}`.padEnd(8)} ${shares.map((x) => `${(x * 100).toFixed(1)}%`.padEnd(20)).join('')}`,
  );
  REALMS.forEach((r, i) =>
    checks.push([
      `${r.name}, ${seat ?? 'no dwelling'}: the world's share 40%–60%`,
      `${(shares[i]! * 100).toFixed(1)}%`,
      shares[i]! >= BAND[0] && shares[i]! <= BAND[1],
    ]),
  );
}
console.log('');
for (const [what, got, ok] of checks) console.log(`  ${ok ? 'ok ' : 'OFF'}  ${what}: ${got}`);
