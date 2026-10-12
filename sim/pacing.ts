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
// Targets (design § Character creation): every root at layer 3 in about 45 minutes; a true root at
// layer 9 in 15–20 hours; a heavenly root in about half that.
// Run: npm run sim -- pacing [--seeds=25]
import { MASTERY } from '../src/content/mastery.ts';
import { method, nextChapter } from '../src/content/methods.ts';
import { defaultElements, ROOTS, type RootId } from '../src/content/roots.ts';
import { routine } from '../src/content/routines.ts';
import { playDay, resolveByDefault } from '../src/core/cards.ts';
import { createLife } from '../src/core/creation.ts';
import { TREES, treeNode, type TreeNode } from '../src/content/trees/index.ts';
import { majorCheck } from '../src/core/cultivation.ts';
import { breakThrough, learn, switchMethod } from '../src/core/life.ts';
import { advance } from '../src/core/loop.ts';
import { methodMastery } from '../src/core/methods.ts';
import { addItem, ageYears, withPlayer, type GameState } from '../src/core/state.ts';
import { canLearn, hasLearned, nodeSealed } from '../src/core/trees.ts';
import { followWheel } from '../src/core/wheel.ts';

type Play = 'default' | 'nodes' | 'routine' | 'qi-only';

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

function play(rootId: RootId, seed: number, how: Play): Run {
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
  while (ms < MAX_HOURS * 3_600_000) {
    const r = advance(s, CHUNK_MS, { step: playDay });
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

function table(title: string, how: Play) {
  console.log(`\n${title} (median of ${SEEDS} seeds; m = real minutes, h = real hours)`);
  const head = ['root', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'Found.', 'age@L9'];
  head.push('insight@L9', 'body', 'soul', 'nodes', 'fails', 'mast@L4', 'mast@L9');
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
        String(fails).padStart(11) +
        (mid.masteryAt4 ?? '—').padStart(11) +
        (mid.masteryAt9 ?? '—').padStart(11),
    );
  }
}

table('Default rule, safe breakthroughs, no stones', 'default');
table('Default rule, buying tree nodes toward the nearest that speeds qi', 'nodes');
table('Following the Watch Rotation once it can be followed', 'routine');
table('Every waking hour on qi, safe breakthroughs, no stones', 'qi-only');
console.log(
  '\nFoundation needs 500 insight ever earned and the pill; the sim tries at the bare minimum.' +
    "\nmast@L4 and mast@L9: the qi method's mastery (Glimpse, Comprehension, Mastery, Domain, Origin).",
);
