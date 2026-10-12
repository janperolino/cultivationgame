// Pacing: real hours to each Qi Condensation layer and to Foundation, per spirit root, playing the
// day wheel by its default rule on the default (safe) breakthrough setting with no stones; then the
// same buying the cheapest tree node whenever insight allows; then following the garrison's Watch
// Rotation whenever it can, for the discipline bonus; then a wheel kept all qi for comparison.
// Each run stands in for P1.7's first hour: its origin's first technique at layer 2, the errand
// card's tempering art at minute 50 and the later card's nourishing art at two hours.
// Each row is the median of many seeds.
// Targets (design § Character creation): every root at layer 3 in about 45 minutes; a true root at
// layer 9 in 15–20 hours; a heavenly root in about half that.
// Run: npm run sim -- pacing [--seeds=25]
import { FIRST_ARTS } from '../src/content/methods.ts';
import { ROOTS, type RootId } from '../src/content/roots.ts';
import { PLACEHOLDER_ROUTINE, routine } from '../src/content/routines.ts';
import { PLACEHOLDER_TECHNIQUE } from '../src/content/techniques.ts';
import { TREES } from '../src/content/trees/index.ts';
import { majorCheck } from '../src/core/cultivation.ts';
import { breakThrough, cultivate, gainMethod, gainTechnique, learn } from '../src/core/life.ts';
import { advance } from '../src/core/loop.ts';
import { addItem, ageYears, newLife, withPlayer, type GameState } from '../src/core/state.ts';
import { canLearn } from '../src/core/trees.ts';
import { followWheel } from '../src/core/wheel.ts';

type Play = 'default' | 'nodes' | 'routine' | 'qi-only';

const ALL_NODES = TREES.flatMap((t) => t.nodes).sort((a, b) => a.cost - b.cost);

/** Learns the cheapest nodes the player can, until none is affordable. */
function buyNodes(s: GameState): GameState {
  for (;;) {
    const next = ALL_NODES.find((n) => canLearn(s.player, n.id).ok);
    if (!next) return s;
    s = learn(s, next.id).state;
  }
}

const givePill = (s: GameState) => withPlayer(s, addItem(s.player, 'foundation-pill', 1));

/** Follows the Watch Rotation once every kind of hour it needs has opened. */
function followRoutine(s: GameState): GameState {
  const r = followWheel(s.player, routine(PLACEHOLDER_ROUTINE).hours);
  return r.check.ok ? withPlayer(s, r.cultivator) : s;
}

/** Keeps every waking hour on qi, whatever the default rule flipped. */
function allQi(s: GameState): GameState {
  const wheel = s.player.wheel.map((k) => (k === 'sleep' ? 'sleep' : 'qi'));
  return withPlayer(s, { ...s.player, wheel });
}

const arg = process.argv.find((a) => a.startsWith('--seeds='));
const SEEDS = arg ? Number(arg.slice(8)) : 25;
const CHUNK_MS = 60_000;
const MAX_HOURS = 60;
/** When the stand-ins for P1.7's cards hand over the first arts, in real hours. */
const TEMPERING_AT = 50 / 60;
const NOURISHING_AT = 2;

interface Run {
  /** Real hours at which qi reached each layer, index 2..9, and Foundation as index 10. */
  at: (number | undefined)[];
  ageAt9?: number;
  insightAt9?: number;
  bodyAt9?: string;
  soulAt9?: string;
  nodesAt9?: number;
  fails: number;
}

function play(rootId: RootId, seed: number, how: Play): Run {
  let s = newLife({
    name: 'Sim',
    root: rootId,
    seed: `pacing-${rootId}-${seed}`,
    routines: [PLACEHOLDER_ROUTINE],
  });
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
    if (s.player.qi.stage >= 2) s = gainTechnique(s, PLACEHOLDER_TECHNIQUE);
    if (hours >= TEMPERING_AT) s = gainMethod(s, FIRST_ARTS.body);
    if (hours >= NOURISHING_AT) s = gainMethod(s, FIRST_ARTS.soul);
    if (how === 'nodes') s = buyNodes(s);
    if (how === 'routine') s = followRoutine(s);
    if (how === 'qi-only') s = allQi(s);
    const p = s.player;
    if (p.qi.realm === 'qi-condensation') {
      for (let k = 2; k <= p.qi.stage; k++) at[k] ??= hours;
      if (p.qi.stage === 9 && run.ageAt9 === undefined) {
        run.ageAt9 = ageYears(p, s.calendar.day);
        run.insightAt9 = p.insight.earned;
        run.bodyAt9 = `${p.body.realm === 'qi-condensation' ? 'L' : 'F'}${p.body.stage}`;
        run.soulAt9 = `${p.soul.realm === 'qi-condensation' ? 'L' : 'F'}${p.soul.stage}`;
        run.nodesAt9 = p.nodes.length;
        // In M1 the origin hands over a Foundation Pill at layer 9.
        s = givePill(s);
      }
      // The sim breaks through as soon as it may, at the bare minimum.
      if (majorCheck(s.player, 'qi')?.ready) {
        s = breakThrough(s, 'qi').state;
        if (s.player.qi.realm !== 'qi-condensation') at[10] = hours;
        else s = givePill(s); // a failed attempt costs a pill; the sim gives another
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

function table(title: string, how: Play) {
  console.log(`\n${title} (median of ${SEEDS} seeds; m = real minutes, h = real hours)`);
  const head = ['root', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'Found.', 'age@L9'];
  head.push('insight@L9', 'body', 'soul', 'nodes', 'fails');
  console.log(head.map((h, i) => (i === 0 ? h.padEnd(10) : h.padStart(i >= 11 ? 11 : 8))).join(''));
  for (const r of ROOTS) {
    const runs = Array.from({ length: SEEDS }, (_, i) => play(r.id, i, how));
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
        String(mid.nodesAt9 ?? '—').padStart(11) +
        String(fails).padStart(11),
    );
  }
}

table('Default rule, safe breakthroughs, no stones', 'default');
table('Default rule, buying the cheapest node whenever insight allows', 'nodes');
table('Following the Watch Rotation once it can be followed', 'routine');
table('Every waking hour on qi, safe breakthroughs, no stones', 'qi-only');
console.log(
  '\nFoundation needs 500 insight ever earned and the pill; the sim tries at the bare minimum.',
);
