// Pacing: real hours to each Qi Condensation layer and to Foundation, per spirit root, playing the
// default seclusion plan on the default (safe) breakthrough setting with no stones, and then a
// qi-only plan for comparison. Each row is the median of many seeds.
// Targets (design § Character creation): every root at layer 3 in about 45 minutes; a true root at
// layer 9 in 15–20 hours; a heavenly root in about half that.
// Run: npm run sim -- pacing [--seeds=25]
import { DEFAULT_SHARES } from '../src/content/cultivation.ts';
import { ROOTS, type RootId } from '../src/content/roots.ts';
import { attemptBreakthrough, majorCheck } from '../src/core/cultivation.ts';
import { cultivate } from '../src/core/cultivation.ts';
import { advance } from '../src/core/loop.ts';
import { addItem, ageYears, newLife, type GameState } from '../src/core/state.ts';

const arg = process.argv.find((a) => a.startsWith('--seeds='));
const SEEDS = arg ? Number(arg.slice(8)) : 25;
const CHUNK_MS = 60_000;
const MAX_HOURS = 60;

interface Run {
  /** Real hours at which qi reached each layer, index 2..9, and Foundation as index 10. */
  at: (number | undefined)[];
  ageAt9?: number;
  insightAt9?: number;
  bodyAt9?: string;
  soulAt9?: string;
  fails: number;
}

function play(rootId: RootId, seed: number, shares: GameState['plan']['shares']): Run {
  let s = newLife({ name: 'Sim', root: rootId, seed: `pacing-${rootId}-${seed}` });
  s = { ...s, plan: { ...s.plan, shares } };
  const at: (number | undefined)[] = [];
  const run: Run = { at, fails: 0 };
  let ms = 0;
  let chronicleSeen = s.chronicle.length;
  while (ms < MAX_HOURS * 3_600_000) {
    const r = advance(s, CHUNK_MS, { step: cultivate });
    s = r.state;
    ms += r.usedMs;
    const hours = ms / 3_600_000;
    for (const c of s.chronicle.slice(chronicleSeen)) if (c.kind === 'setback') run.fails++;
    chronicleSeen = s.chronicle.length;
    if (s.qi.realm === 'qi-condensation') {
      for (let k = 2; k <= s.qi.stage; k++) at[k] ??= hours;
      if (s.qi.stage === 9 && run.ageAt9 === undefined) {
        run.ageAt9 = ageYears(s);
        run.insightAt9 = s.insight.earned;
        run.bodyAt9 = `${s.body.realm === 'qi-condensation' ? 'L' : 'F'}${s.body.stage}`;
        run.soulAt9 = `${s.soul.realm === 'qi-condensation' ? 'L' : 'F'}${s.soul.stage}`;
        // In M1 the origin hands over a Foundation Pill at layer 9.
        s = addItem(s, 'foundation-pill', 1);
      }
      // The sim breaks through as soon as it may, at the bare minimum.
      if (majorCheck(s, 'qi')?.ready) {
        s = attemptBreakthrough(s, 'qi').state;
        if (s.qi.realm !== 'qi-condensation') at[10] = hours;
        else s = addItem(s, 'foundation-pill', 1); // a failed attempt costs a pill; the sim gives another
      }
    } else {
      at[10] ??= hours;
      break;
    }
    if (r.atEdge) break;
  }
  return run;
}

function median(xs: number[]): number | undefined {
  if (!xs.length) return undefined;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function fmt(h: number | undefined): string {
  if (h === undefined) return '—';
  return h < 1 ? `${Math.round(h * 60)}m` : `${h.toFixed(1)}h`;
}

function table(title: string, shares: GameState['plan']['shares']) {
  console.log(`\n${title} (median of ${SEEDS} seeds; m = real minutes, h = real hours)`);
  const head = ['root', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'Found.', 'age@L9'];
  head.push('insight@L9', 'body', 'soul', 'fails');
  console.log(head.map((h, i) => (i === 0 ? h.padEnd(10) : h.padStart(i >= 11 ? 11 : 8))).join(''));
  for (const r of ROOTS) {
    const runs = Array.from({ length: SEEDS }, (_, i) => play(r.id, i, shares));
    const cols = [2, 3, 4, 5, 6, 7, 8, 9, 10].map((k) =>
      fmt(median(runs.map((x) => x.at[k]).filter((x): x is number => x !== undefined))),
    );
    const age = median(runs.map((x) => x.ageAt9).filter((x): x is number => x !== undefined));
    const insight = median(
      runs.map((x) => x.insightAt9).filter((x): x is number => x !== undefined),
    );
    const mid = runs[Math.floor(SEEDS / 2)]!;
    const fails = median(runs.map((x) => x.fails)) ?? 0;
    console.log(
      r.id.padEnd(10) +
        cols.map((c) => c.padStart(8)).join('') +
        (age === undefined ? '—' : age.toFixed(1)).padStart(8) +
        (insight === undefined ? '—' : Math.round(insight).toString()).padStart(11) +
        (mid.bodyAt9 ?? '—').padStart(11) +
        (mid.soulAt9 ?? '—').padStart(11) +
        String(fails).padStart(11),
    );
  }
}

table('Default plan, safe breakthroughs, no stones', { ...DEFAULT_SHARES });
table('Qi only, safe breakthroughs, no stones', {
  qi: 100,
  body: 0,
  soul: 0,
  study: 0,
  practice: 0,
});
console.log(
  '\nFoundation needs 500 insight ever earned and the pill; the sim tries at the bare minimum.',
);
