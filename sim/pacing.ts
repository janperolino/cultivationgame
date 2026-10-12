// Pacing: real hours to each Qi Condensation layer and to Foundation, per spirit root, playing the
// day wheel by its default rule on the default (safe) breakthrough setting with no stones; then the
// same buying tree nodes toward the nearest one that speeds qi; then following the garrison's Watch
// Rotation whenever it can, for the discipline bonus; then a wheel kept all qi for comparison.
// Each run is a created life, the cave orphan who went along with plain talents, playing the first
// hour's cards as they come by their default choices: the first technique at minute 20–35, the
// errand's tempering art near the hour, the lamp-keeper's nourishing art near two hours, and at
// layer 9 the Foundation Pill with the Foundation chapter of the qi method, taken up at once. A
// failed Foundation attempt gets another pill at once rather than the card's ten years. Every
// method starts white, tier 1 and at Glimpse, and climbs in mastery with the hours cultivated with it.
// Each row is the median of many seeds.
// The attended rows (design § How the two halves connect) sit with the seat for none, a third
// (twenty minutes of every real hour) or all of the time: a steady player at the Abode who takes
// four orbs in five, each on the first inhale it is in reach, and never grabs into the heat.
// Targets (design § Character creation): every root at layer 3 in about 45 minutes; a true root at
// layer 9 in 15–20 hours away and about half that attended throughout; a heavenly root in about
// half the true root's time.
// Run: npm run sim -- pacing [--seeds=25]
import { HEAT_PER_BREATH, HEAT_TIMED } from '../src/content/attention.ts';
import { MASTERY } from '../src/content/mastery.ts';
import { method, nextChapter } from '../src/content/methods.ts';
import { defaultElements, ROOTS, type RootId } from '../src/content/roots.ts';
import { routine } from '../src/content/routines.ts';
import {
  breathe,
  canBreathe,
  heatLimit,
  inhaling,
  seatOf,
  startAttention,
  tickAttention,
  type Attention,
  type Seat,
} from '../src/core/attention.ts';
import { playDay, resolveByDefault } from '../src/core/cards.ts';
import { createLife } from '../src/core/creation.ts';
import { TREES, treeNode, type TreeNode } from '../src/content/trees/index.ts';
import { majorCheck } from '../src/core/cultivation.ts';
import { breakThrough, learn, switchMethod } from '../src/core/life.ts';
import { advance } from '../src/core/loop.ts';
import { methodMastery } from '../src/core/methods.ts';
import { Rng } from '../src/core/rng.ts';
import {
  addItem,
  ageYears,
  withPlayer,
  type Cultivator,
  type GameState,
} from '../src/core/state.ts';
import { canLearn, hasLearned, nodeSealed } from '../src/core/trees.ts';
import { followWheel } from '../src/core/wheel.ts';

type Play = 'default' | 'nodes' | 'routine' | 'qi-only';
/** How much of the time the player sits with the seat. */
type Schedule = 'none' | 'third' | 'all';

/** The share of orbs the steady player takes. */
const TAKES = 0.8;

/** Whether the schedule sits with the seat at this real minute. */
function attending(schedule: Schedule, minute: number): boolean {
  if (schedule === 'all') return true;
  if (schedule === 'third') return minute % 60 < 20;
  return false;
}

/**
 * A minute at the seat, a second at a time: the steady player breathes when an orb they mean to
 * take is in reach on the inhale, if the breath won't tip the heat. Returns the minute's average
 * seat, which the day step reads.
 */
function sitMinute(
  a: Attention,
  c: Cultivator,
  attended: boolean,
  rng: Rng,
  skip: Set<number>,
): { a: Attention; seat: Seat } {
  let factor = 0;
  for (let i = 0; i < 60; i++) {
    a = tickAttention(a, c, 1, { attended, abode: attended, hour: 0 });
    for (const o of a.orbs) if (o.born > a.t - 1 && rng.next() > TAKES) skip.add(o.id);
    const safe = a.heat + HEAT_PER_BREATH * HEAT_TIMED < heatLimit(c);
    if (attended && canBreathe(a) && inhaling(a.t) && safe && a.orbs.some((o) => !skip.has(o.id))) {
      const r = breathe(a, c);
      if (r.caught.length) a = r.attention;
    }
    factor += seatOf(a, c).factor;
  }
  return { a, seat: { factor: factor / 60, attended } };
}

/** Nodes a player chasing qi speed wants: qi gain or Aptitude, which the sim's run feels. */
const SPEED_NODES = TREES.flatMap((t) => t.nodes).filter((n) =>
  n.effects.some((e) => e.stat === 'qiGain' || e.stat === 'aptitude'),
);

/** The unlearned nodes on the way to a node, itself last, in learning order. */
function pathTo(s: GameState, n: TreeNode): TreeNode[] {
  const out: TreeNode[] = [];
  const walk = (id: string) => {
    if (hasLearned(s.player, id) || out.some((x) => x.id === id)) return;
    const node = treeNode(id);
    for (const r of node.requires) walk(r);
    out.push(node);
  };
  walk(n.id);
  return out;
}

/**
 * Buys toward the cheapest-to-reach node that speeds qi now (not sealed), one affordable step at a
 * time, saving up when the next step costs more than the insight in hand.
 */
function buyNodes(s: GameState): GameState {
  for (;;) {
    const paths = SPEED_NODES.filter((n) => !hasLearned(s.player, n.id) && !nodeSealed(s.player, n))
      .map((n) => pathTo(s, n))
      .map((p) => ({ p, cost: p.reduce((sum, n) => sum + n.cost, 0) }))
      .sort((a, b) => a.cost - b.cost);
    const step = paths[0]?.p[0];
    if (!step || !canLearn(s.player, step.id).ok) return s;
    s = learn(s, step.id).state;
  }
}

const givePill = (s: GameState) => withPlayer(s, addItem(s.player, 'foundation-pill', 1));

/** Takes up the Foundation chapter of the qi method once the layer 9 card has handed it over. */
function takeChapter(s: GameState): GameState {
  const id = s.player.activeMethods.qi;
  const chapter = id ? nextChapter(method(id)) : undefined;
  if (!chapter || !(chapter.id in s.player.methods)) return s;
  return switchMethod(s, 'qi', chapter.id).state;
}

/** Plays every waiting card by its default choice. */
function settleCards(s: GameState): GameState {
  while (s.cards.pending.length) s = resolveByDefault(s, s.cards.pending[0]!.uid);
  return s;
}

/** The qi method's mastery level, as its first letter. */
function qiMastery(s: GameState): string {
  const id = s.player.activeMethods.qi;
  return id ? MASTERY[methodMastery(s.player, id).level]!.name.charAt(0) : '—';
}

/** Follows the Watch Rotation once every kind of hour it needs has opened. */
function followRoutine(s: GameState): GameState {
  const r = followWheel(s.player, routine('watch-rotation').hours);
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

interface Run {
  /** Real hours at which qi reached each layer, index 2..9, and Foundation as index 10. */
  at: (number | undefined)[];
  ageAt9?: number;
  insightAt9?: number;
  bodyAt9?: string;
  soulAt9?: string;
  nodesAt9?: number;
  /** The qi method's mastery at layers 4 and 9. */
  masteryAt4?: string;
  masteryAt9?: string;
  fails: number;
}

function play(rootId: RootId, seed: number, how: Play, schedule: Schedule): Run {
  let s = createLife({
    name: 'Sim',
    pronouns: 'they/them',
    look: '',
    mode: 'ironman',
    seed: `pacing-${rootId}-${seed}`,
    choice: 'along',
    roll: {
      root: rootId,
      elements: defaultElements(rootId),
      body: 'farmhands-frame',
      soul: 'plain-mind',
      fate: 'ordinary-fate',
      origin: 'cave-orphan',
    },
  });
  const at: (number | undefined)[] = [];
  const run: Run = { at, fails: 0 };
  let ms = 0;
  let chronicleSeen = s.chronicle.length;
  let seat = startAttention(s);
  const sitter = new Rng(seed * 7919 + 1);
  const skip = new Set<number>();
  while (ms < MAX_HOURS * 3_600_000) {
    let opts: { step: typeof playDay; seat?: Seat } = { step: playDay };
    if (schedule !== 'none') {
      const sat = sitMinute(seat, s.player, attending(schedule, ms / 60_000), sitter, skip);
      seat = sat.a;
      opts = { step: playDay, seat: sat.seat };
    }
    const r = advance(s, CHUNK_MS, opts);
    s = settleCards(r.state);
    ms += r.usedMs;
    const hours = ms / 3_600_000;
    for (const c of s.chronicle.slice(chronicleSeen)) if (c.type.endsWith('setback')) run.fails++;
    chronicleSeen = s.chronicle.length;
    if (how === 'nodes') s = buyNodes(s);
    if (how === 'routine') s = followRoutine(s);
    if (how === 'qi-only') s = allQi(s);
    const p = s.player;
    if (p.qi.realm === 'qi-condensation') {
      for (let k = 2; k <= p.qi.stage; k++) at[k] ??= hours;
      if (p.qi.stage >= 4) run.masteryAt4 ??= qiMastery(s);
      if (p.qi.stage === 9 && run.ageAt9 === undefined) {
        run.ageAt9 = ageYears(p, s.calendar.day);
        run.insightAt9 = p.insight.earned;
        run.bodyAt9 = `${p.body.realm === 'qi-condensation' ? 'L' : 'F'}${p.body.stage}`;
        run.soulAt9 = `${p.soul.realm === 'qi-condensation' ? 'L' : 'F'}${p.soul.stage}`;
        run.nodesAt9 = p.nodes.length;
        run.masteryAt9 = qiMastery(s);
      }
      // In M1 the origin's layer 9 card hands over a Foundation Pill and the next chapter.
      if (p.qi.stage === 9) s = takeChapter(s);
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

/** What a table measured per root: real hours to layers 3 and 9 and Foundation, and age at 9. */
interface Medians {
  l3?: number;
  l9?: number;
  found?: number;
  age?: number;
}

function table(title: string, how: Play, schedule: Schedule = 'none'): Record<string, Medians> {
  const out: Record<string, Medians> = {};
  console.log(`\n${title} (median of ${SEEDS} seeds; m = real minutes, h = real hours)`);
  const head = ['root', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'Found.', 'age@L9'];
  head.push('insight@L9', 'body', 'soul', 'nodes', 'fails', 'mast@L4', 'mast@L9');
  console.log(head.map((h, i) => (i === 0 ? h.padEnd(10) : h.padStart(i >= 11 ? 11 : 8))).join(''));
  for (const r of ROOTS) {
    const runs = Array.from({ length: SEEDS }, (_, i) => play(r.id, i, how, schedule));
    const cols = [2, 3, 4, 5, 6, 7, 8, 9, 10].map((k) =>
      fmt(median(runs.map((x) => x.at[k]).filter((x): x is number => x !== undefined))),
    );
    const age = median(runs.map((x) => x.ageAt9).filter((x): x is number => x !== undefined));
    const insight = median(
      runs.map((x) => x.insightAt9).filter((x): x is number => x !== undefined),
    );
    const at = (k: number) =>
      median(runs.map((x) => x.at[k]).filter((x): x is number => x !== undefined));
    out[r.id] = { l3: at(3), l9: at(9), found: at(10), age };
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
        String(fails).padStart(11) +
        (mid.masteryAt4 ?? '—').padStart(11) +
        (mid.masteryAt9 ?? '—').padStart(11),
    );
  }
  return out;
}

const away = table('Default rule, safe breakthroughs, no stones', 'default');
const nodes = table('Default rule, buying tree nodes toward the nearest that speeds qi', 'nodes');
const routineRow = table('Following the Watch Rotation once it can be followed', 'routine');
table('Every waking hour on qi, safe breakthroughs, no stones', 'qi-only');
const third = table(
  'Attended a third of the time (20 minutes an hour), default rule',
  'default',
  'third',
);
const attended = table('Attended throughout, default rule', 'default', 'all');
const engaged = table('Attended throughout, buying tree nodes', 'nodes', 'all');

// The pacing targets (design § Character creation and the first hour), checked on the away row,
// which is the floor: the default rule with nobody at the wheel.
const within = (x: number | undefined, lo: number, hi: number) =>
  x !== undefined && x >= lo && x <= hi;
const checks: [string, string, boolean][] = [];
const trueL9 = away.true?.l9;
checks.push([
  'True root reaches layer 9 in 15–20 real hours, away',
  fmt(trueL9),
  within(trueL9, 15, 20),
]);
checks.push([
  'True root is about 30 at layer 9 (25–35)',
  away.true?.age?.toFixed(1) ?? '—',
  within(away.true?.age, 25, 35),
]);
const ratio = (away.heavenly?.found ?? NaN) / (away.true?.found ?? NaN);
checks.push([
  'A heavenly root reaches Foundation in about half the time (0.4–0.6)',
  Number.isFinite(ratio) ? ratio.toFixed(2) : '—',
  within(ratio, 0.4, 0.6),
]);
const l3s = Object.values(away).map((m) => m.l3);
checks.push([
  'Every root reaches layer 3 in about 45 minutes (30–60)',
  `${fmt(Math.min(...l3s.map((x) => x ?? Infinity)))}–${fmt(Math.max(...l3s.map((x) => x ?? 0)))}`,
  l3s.every((x) => within(x, 0.5, 1)),
]);
checks.push([
  'Playing the wheel never runs slower than the floor (true root, layer 9)',
  `nodes ${fmt(nodes.true?.l9)}, routine ${fmt(routineRow.true?.l9)}`,
  (nodes.true?.l9 ?? Infinity) <= (trueL9 ?? 0) &&
    (routineRow.true?.l9 ?? Infinity) <= (trueL9 ?? 0),
]);
// The attended rows (design § Character creation, the pacing targets' attended row).
const halfOf = (attended.true?.l9 ?? NaN) / (trueL9 ?? NaN);
checks.push([
  'Attended throughout reaches layer 9 in about half the away hours (0.4–0.6)',
  `${fmt(attended.true?.l9)}, ${Number.isFinite(halfOf) ? halfOf.toFixed(2) : '—'} of away`,
  within(halfOf, 0.4, 0.6),
]);
checks.push([
  'Attended throughout is around 21 at layer 9 (18–25)',
  attended.true?.age?.toFixed(1) ?? '—',
  within(attended.true?.age, 18, 25),
]);
checks.push([
  'A third attended sits between away and attended throughout',
  fmt(third.true?.l9),
  (third.true?.l9 ?? 0) < (trueL9 ?? 0) && (third.true?.l9 ?? 0) > (attended.true?.l9 ?? Infinity),
]);
checks.push([
  'Attended and buying nodes lands no lower than 0.4 of the away floor',
  fmt(engaged.true?.l9),
  (engaged.true?.l9 ?? 0) >= 0.4 * (trueL9 ?? Infinity),
]);
console.log('\nTargets');
for (const [what, got, ok] of checks) console.log(`  ${ok ? 'ok ' : 'OFF'}  ${what}: ${got}`);
console.log(
  '\nFoundation needs 500 insight ever earned and the pill; the sim tries at the bare minimum.' +
    "\nmast@L4 and mast@L9: the qi method's mastery (Glimpse, Comprehension, Mastery, Domain, Origin).",
);
