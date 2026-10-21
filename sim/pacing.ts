// Pacing: real hours to each Qi Condensation layer and to Foundation, per spirit root, playing the
// day wheel by its default rule on the default (safe) breakthrough setting with no stones; then the
// same buying tree nodes toward the nearest one that speeds qi; then following the garrison's Watch
// Rotation whenever it can, for the discipline bonus; then a wheel kept all qi for comparison.
// Each run is a created life, the cave orphan who went along with plain talents, playing the first
// hour's cards as they come by their default choices: the first technique at minute 20–35, the
// errand's tempering art near the hour, the lamp-keeper's nourishing art near two hours, and at
// layer 9 the Foundation Pill with a copy of the Foundation chapter, taken up once read (P2.5f).
// Each first time is played at once, as a player would (core/life.ts, playFirsts): the method's
// copy read on one study hour and taken up, each technique and art given its slot and hour. A
// failed Foundation attempt gets another pill at once rather than the card's ten years. Every
// method starts white, tier 1 and at Glimpse, and climbs in mastery with the hours cultivated with it.
// Each row is the median of many seeds.
// The attended rows (design § How the two halves connect) sit with the seat for none, a third
// (twenty minutes of every real hour) or all of the time: a steady player on Cultivate who takes
// four orbs in five, each on the first inhale it is in reach, and never grabs into the heat.
// Targets (design § Character creation, the opening redone): every root at layer 3 near minute 15
// attended; attended throughout, a true root reaches Foundation in about 2.5 real hours, around age
// 14.5, a heavenly root in about half that and a mixed root in about 4; away, at a quarter of the
// attended rate, about 10 hours. Then the three paths (design § Economy, What the balance sims
// measure): a pure body life and a pure soul life, given their art at birth and every waking hour
// on it, its Foundation chapter and its gate pill at layer 9, reach layer 9 and Foundation within
// 15% of the pure qi life (every waking hour on qi), on the true root.
// Run: npm run sim -- pacing [--seeds=25] [--paths]   (--paths: only the three paths' rows)
import { HEAT_PER_BREATH, HEAT_TIMED } from '../src/content/attention.ts';
import type { LadderId } from '../src/content/cultivation.ts';
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
import { withoutChain } from '../src/core/chains.ts';
import { contemplate } from '../src/core/insight.ts';
import { finishAllGuides } from '../src/core/guides.ts';
import { TREES, treeNode, type TreeNode } from '../src/content/trees/index.ts';
import { barFill, majorCheck } from '../src/core/cultivation.ts';
import {
  breakThrough,
  gainCopy,
  gainMethod,
  learn,
  moveRead,
  readCopy,
  playFirsts,
  switchMethod,
} from '../src/core/life.ts';
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

type Play = 'default' | 'nodes' | 'routine' | 'qi-only' | 'body-only' | 'soul-only';

/** The ladder a play climbs: the pure body and soul lives their own, every other play qi. */
const ladderOf = (how: Play): LadderId =>
  how === 'body-only' ? 'body' : how === 'soul-only' ? 'soul' : 'qi';
/** The art a pure body or soul life is given at birth. */
const PATH_ART: Partial<Record<LadderId, string>> = {
  body: 'stone-bearing',
  soul: 'still-lantern',
};
/** Each path's Foundation gate (content/realms.ts). */
const GATE: Record<LadderId, string> = {
  qi: 'foundation-pill',
  body: 'marrow-washing-pill',
  soul: 'soul-condensing-pill',
};
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
    a = tickAttention(a, c, 1, { attended, figure: attended, hour: 0 });
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

/** The arts the origin's chain hands over as copies. */
const TEMPERING = 'method:stone-bearing';
const NOURISHING = 'method:still-lantern';
const givePill = (s: GameState, which: LadderId = 'qi') =>
  withPlayer(s, addItem(s.player, GATE[which], 1));

/**
 * Takes up the Foundation chapter of the ladder's method: the qi's once its copy from the layer 9
 * card is read, or, when `given`, handed over at once, as a pure path's is and the pure qi life's
 * too, so the three compare alike (a pure life keeps no study hour to read it on).
 */
function takeChapter(s: GameState, which: LadderId = 'qi', given = which !== 'qi'): GameState {
  const id = s.player.activeMethods[which];
  const chapter = id ? nextChapter(method(id)) : undefined;
  if (!chapter) return s;
  if (given) s = gainMethod(s, chapter.id, 'is given');
  if (!(chapter.id in s.player.methods)) return s;
  return switchMethod(s, which, chapter.id).state;
}

/** Keeps every waking hour on one ladder. */
function allOn(s: GameState, which: LadderId): GameState {
  const wheel = s.player.wheel.map((k) => (k === 'sleep' ? 'sleep' : which));
  return withPlayer(s, { ...s.player, wheel });
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

/** Keeps every waking hour on qi once a method is taken up, whatever the default rule flipped. */
function allQi(s: GameState): GameState {
  if (!s.player.activeMethods.qi) return s;
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
  ageAtF?: number;
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
  // The guides are a player's, not the sim's: every one ended, so minor breakthroughs run on auto.
  // The opening's chain isn't what this sim measures: without it the seclusion deck isn't held.
  // Nor is a post: the cadet's watch takes four Duty hours from layer 4 (it stood only until the
  // quota struck the cadet off by minute 15, fixed in The opening, built), so the life holds none.
  s = playFirsts(withoutChain(finishAllGuides(s)));
  s = withPlayer(s, { ...s.player, jobs: [] });
  const L = ladderOf(how);
  const art = PATH_ART[L];
  if (art) {
    s = gainMethod(s, art, 'is given');
    s = allOn(switchMethod(s, L, art).state, L);
  }
  const at: (number | undefined)[] = [];
  const run: Run = { at, fails: 0 };
  let ms = 0;
  let chronicleSeen = s.chronicle.length;
  /** The wheel set aside while the bought chapter is read on every waking hour. */
  let reading: GameState['player']['wheel'] | null = null;
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
    s = playFirsts(settleCards(r.state));
    ms += r.usedMs;
    const hours = ms / 3_600_000;
    for (const c of s.chronicle.slice(chronicleSeen)) if (c.type.endsWith('setback')) run.fails++;
    chronicleSeen = s.chronicle.length;
    // The origin's chain hands over the tempering art at the board (about minute 25) and the
    // nourishing art at Your place (about minute 40), as copies read on the study hours.
    if (!art) {
      if (hours >= 25 / 60 && !s.player.copies[TEMPERING] && !('stone-bearing' in s.player.methods))
        s = gainCopy(s, TEMPERING, 'is given');
      if (
        hours >= 40 / 60 &&
        !s.player.copies[NOURISHING] &&
        !('still-lantern' in s.player.methods)
      ) {
        // Handed over with a night's talk on stillness, as the lamp-keeper's card once did.
        s = gainCopy(s, NOURISHING, 'is given');
        s = withPlayer(s, contemplate(s.player, 'shrine-lecture').cultivator);
      }
    }
    if (how === 'nodes') s = buyNodes(s);
    if (how === 'routine') s = followRoutine(s);
    if (how === 'qi-only') s = allQi(s);
    if (art) s = allOn(s, L);
    const p = s.player;
    const l = p[L];
    if (l.realm === 'qi-condensation') {
      for (let k = 2; k <= l.stage; k++) at[k] ??= hours;
      if (l.stage >= 4) run.masteryAt4 ??= qiMastery(s);
      if (l.stage === 9 && run.ageAt9 === undefined) {
        run.ageAt9 = ageYears(p, s.calendar.day);
        run.insightAt9 = p.insight.earned;
        run.bodyAt9 = `${p.body.realm === 'qi-condensation' ? 'L' : 'F'}${p.body.stage}`;
        run.soulAt9 = `${p.soul.realm === 'qi-condensation' ? 'L' : 'F'}${p.soul.stage}`;
        run.nodesAt9 = p.nodes.length;
        run.masteryAt9 = qiMastery(s);
      }
      // At layer 9 the life finds its Foundation Pill and next chapter in the world (since The
      // opening, built: chains, rogue, knobs, no card hands them over; a player buys them), so the
      // sim hands them over: the chapter as a copy read on the study hours, as bought; a pure path
      // is handed its chapter and its own gate.
      if (l.stage === 9) {
        const given = art !== undefined || how === 'qi-only';
        const id = s.player.activeMethods[L];
        const chapter = id ? nextChapter(method(id)) : undefined;
        const copy = chapter ? `method:${chapter.id}` : null;
        if (!given && copy && !(chapter!.id in s.player.methods) && !s.player.copies[copy]) {
          s = readCopy(gainCopy(s, copy, 'buys'), copy).state;
          // A player reads the chapter they bought first.
          for (let i = 0; i < 4; i++) s = moveRead(s, copy, -1);
        }
        // With the bar full and the chapter unread, a player turns the idle qi hours to Study until
        // it is read, then puts the wheel back.
        const unread = !!copy && !(chapter!.id in s.player.methods) && !!s.player.copies[copy];
        if (unread && barFill(s.player[L]) >= 1 && !reading) {
          reading = [...s.player.wheel];
          s = withPlayer(s, {
            ...s.player,
            wheel: s.player.wheel.map((k) => (k === 'qi' ? 'study' : k)),
          });
        }
        if (!unread && reading) {
          s = withPlayer(s, { ...s.player, wheel: reading });
          reading = null;
        }
        s = takeChapter(s, L, given);
        if (!s.player.items[GATE[L]]) s = givePill(s, L);
      }
      // The sim breaks through as soon as it may, at the bare minimum.
      if (majorCheck(s.player, L)?.ready) {
        s = breakThrough(s, L).state;
        if (s.player[L].realm !== 'qi-condensation') {
          at[10] = hours;
          run.ageAtF = ageYears(s.player, s.calendar.day);
        } else s = givePill(s, L); // a failed attempt costs a pill; the sim gives another
      }
    } else {
      at[10] ??= hours;
      run.ageAtF = ageYears(s.player, s.calendar.day);
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
  ageF?: number;
}

function table(
  title: string,
  how: Play,
  schedule: Schedule = 'none',
  roots: readonly (typeof ROOTS)[number][] = ROOTS,
): Record<string, Medians> {
  const out: Record<string, Medians> = {};
  console.log(`\n${title} (median of ${SEEDS} seeds; m = real minutes, h = real hours)`);
  const head = ['root', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'Found.', 'age@L9'];
  head.push('insight@L9', 'body', 'soul', 'nodes', 'fails', 'mast@L4', 'mast@L9');
  console.log(head.map((h, i) => (i === 0 ? h.padEnd(10) : h.padStart(i >= 11 ? 11 : 8))).join(''));
  for (const r of roots) {
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
    const ageF = median(runs.map((x) => x.ageAtF).filter((x): x is number => x !== undefined));
    out[r.id] = { l3: at(3), l9: at(9), found: at(10), age, ageF };
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

const within = (x: number | undefined, lo: number, hi: number) =>
  x !== undefined && x >= lo && x <= hi;
const checks: [string, string, boolean][] = [];
const printChecks = () => {
  console.log('\nTargets');
  for (const [what, got, ok] of checks) console.log(`  ${ok ? 'ok ' : 'OFF'}  ${what}: ${got}`);
};

// The three paths first (design § Economy, What the balance sims measure).
const ONLY_PATHS = process.argv.includes('--paths');
const trueRoot = ROOTS.filter((r) => r.id === 'true');
const qiOnly = table(
  'Every waking hour on qi, safe breakthroughs, no stones',
  'qi-only',
  'none',
  ONLY_PATHS ? trueRoot : ROOTS,
);
const bodyOnly = table(
  'A pure body life, every waking hour tempering',
  'body-only',
  'none',
  trueRoot,
);
const soulOnly = table(
  'A pure soul life, every waking hour nourishing',
  'soul-only',
  'none',
  trueRoot,
);
for (const [name, row] of [
  ['body', bodyOnly],
  ['soul', soulOnly],
] as const) {
  for (const [at, key] of [
    ['layer 9', 'l9'],
    ['Foundation', 'found'],
  ] as const) {
    const r = (row.true?.[key] ?? NaN) / (qiOnly.true?.[key] ?? NaN);
    checks.push([
      `A pure ${name} life reaches ${at} within 15% of a pure qi life (0.85–1.15)`,
      `${fmt(row.true?.[key])} against ${fmt(qiOnly.true?.[key])}, ${Number.isFinite(r) ? r.toFixed(2) : '—'}`,
      within(r, 0.85, 1.15),
    ]);
  }
}
if (ONLY_PATHS) {
  printChecks();
  process.exit(0);
}

const away = table('Default rule, safe breakthroughs, no stones', 'default');
const nodes = table('Default rule, buying tree nodes toward the nearest that speeds qi', 'nodes');
const routineRow = table('Following the Watch Rotation once it can be followed', 'routine');
const third = table(
  'Attended a third of the time (20 minutes an hour), default rule',
  'default',
  'third',
);
const attended = table('Attended throughout, default rule', 'default', 'all');
const engaged = table('Attended throughout, buying tree nodes', 'nodes', 'all');

// The pacing targets (design § Character creation and the first hour, the opening redone): the
// attended row is the goal, the away row the floor.
checks.push([
  'Attended, a true root reaches Foundation in about 2.5 real hours (2–3)',
  fmt(attended.true?.found),
  within(attended.true?.found, 2, 3),
]);
checks.push([
  'Attended, a true root is about 14.5 at Foundation (14–15.5)',
  attended.true?.ageF?.toFixed(1) ?? '—',
  within(attended.true?.ageF, 14, 15.5),
]);
const ratio = (attended.heavenly?.found ?? NaN) / (attended.true?.found ?? NaN);
checks.push([
  'Attended, a heavenly root reaches Foundation in about half the time (0.4–0.6)',
  Number.isFinite(ratio) ? ratio.toFixed(2) : '—',
  within(ratio, 0.4, 0.6),
]);
checks.push([
  'Attended, a mixed root reaches Foundation in about 4 hours (3.3–4.8)',
  fmt(attended.mixed?.found),
  within(attended.mixed?.found, 3.3, 4.8),
]);
const l3s = Object.values(attended).map((m) => m.l3);
checks.push([
  'Attended, every root reaches layer 3 near minute 15 (12–18)',
  `${fmt(Math.min(...l3s.map((x) => x ?? Infinity)))}–${fmt(Math.max(...l3s.map((x) => x ?? 0)))}`,
  l3s.every((x) => within(x, 0.2, 0.3)),
]);
checks.push([
  'Away, a true root reaches Foundation in about 10 real hours (8–12)',
  fmt(away.true?.found),
  within(away.true?.found, 8, 12),
]);
const quarter = (attended.true?.found ?? NaN) / (away.true?.found ?? NaN);
checks.push([
  'Away runs at about a quarter of the attended pace (0.2–0.3)',
  Number.isFinite(quarter) ? quarter.toFixed(2) : '—',
  within(quarter, 0.2, 0.3),
]);
checks.push([
  'Playing the wheel never runs slower than the floor (true root, Foundation)',
  `nodes ${fmt(nodes.true?.found)}, routine ${fmt(routineRow.true?.found)}`,
  (nodes.true?.found ?? Infinity) <= (away.true?.found ?? 0) &&
    (routineRow.true?.found ?? Infinity) <= (away.true?.found ?? 0),
]);
checks.push([
  'A third attended sits between away and attended throughout',
  fmt(third.true?.found),
  (third.true?.found ?? 0) < (away.true?.found ?? 0) &&
    (third.true?.found ?? 0) > (attended.true?.found ?? Infinity),
]);
checks.push([
  'Attended and buying nodes lands no lower than 0.8 of attended throughout',
  fmt(engaged.true?.found),
  (engaged.true?.found ?? 0) >= 0.8 * (attended.true?.found ?? Infinity),
]);
printChecks();
console.log(
  '\nFoundation needs 500 insight ever earned and the pill; the sim tries at the bare minimum.' +
    "\nmast@L4 and mast@L9: the qi method's mastery (Glimpse, Comprehension, Mastery, Domain, Origin).",
);
