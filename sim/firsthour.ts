// The first hour (design § Character creation and the first hour, The origin's chain; The opening,
// built: chains, rogue, knobs): every origin path on every root, played attended as a steady player
// plays it, through the origin's chain: the rogue's first work, the method taken up, the first
// minor breakthrough, the first lesson (a Study hour, the cheapest node, the spar played with plain
// strikes until won, layer 3), the board (its posting taken, the road walked on Avoid, the goal cut,
// paid at the board, a first buy) and Your place or Your own way. Real minutes from testing day to
// each mark; median and slowest of the seeds. Talents are plain. Targets: a rogue's method by
// minute 6, the payoff (the origin's technique) by about minute 15, layer 3 near minute 15–18, the
// board's hand-in near minute 30.
// Run: npm run sim -- firsthour [--seeds=6]
import { ORIGIN_CHOICES, ORIGIN_IDS, pathKey } from '../src/content/origins.ts';
import { HEAT_PER_BREATH, HEAT_TIMED } from '../src/content/attention.ts';
import { quest } from '../src/content/quests.ts';
import { defaultElements, type RootId } from '../src/content/roots.ts';
import { shopsAt } from '../src/content/shops.ts';
import { TREES } from '../src/content/trees/index.ts';
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
import { playDay, resolveByDefault, resolveCard } from '../src/core/cards.ts';
import {
  actNow,
  chainOf,
  chainOffer,
  doAct,
  handInHere,
  takeChainOffer,
} from '../src/core/chains.ts';
import { combatantIn } from '../src/core/combat/fight.ts';
import { createLife } from '../src/core/creation.ts';
import { finishAllGuides } from '../src/core/guides.ts';
import { takeJob } from '../src/core/jobs.ts';
import { handInCheck, noteQuests, questState, stepsDone } from '../src/core/journal.ts';
import { switchMethod } from '../src/core/life.ts';
import { advance } from '../src/core/loop.ts';
import { claimPosting, questPostingId, takePosting } from '../src/core/map/board.ts';
import { chooseExit, setStance, waiting } from '../src/core/map/encounters.ts';
import { ensureMap, goToPlace, homeOf, mapOf } from '../src/core/map/travel.ts';
import { fightEnd, playTurn } from '../src/core/played.ts';
import { currentFight, finishFight } from '../src/core/playFight.ts';
import { Rng } from '../src/core/rng.ts';
import { buy, sell, shelf } from '../src/core/shops.ts';
import { encounterTemplate } from '../src/content/encounters/index.ts';
import { membershipsOf } from '../src/core/orgs/membership.ts';
import { stonesOf, worthOf } from '../src/core/purse.ts';
import { sparWhy } from '../src/core/spar.ts';
import { withPlayer, type Cultivator, type GameState } from '../src/core/state.ts';
import { canLearn, learnNode } from '../src/core/trees.ts';
import { setHours } from '../src/core/wheel.ts';

const arg = process.argv.find((a) => a.startsWith('--seeds='));
const SEEDS = arg ? Number(arg.slice(8)) : 6;
const ROOTS_RUN: RootId[] = ['mixed', 'true', 'heavenly'];
const END_MIN = 120;

type Mark = 'method' | 'L2' | 'technique' | 'L3' | 'board' | 'soul';
const MARKS: Mark[] = ['method', 'L2', 'technique', 'L3', 'board', 'soul'];

/** A minute at the seat, breathing on the inhale when an orb is in reach (sim/pacing.ts's sitter). */
function sitMinute(a0: Attention, c: Cultivator, rng: Rng): { a: Attention; seat: Seat } {
  let a = a0;
  let factor = 0;
  for (let i = 0; i < 60; i++) {
    a = tickAttention(a, c, 1, { attended: true, figure: true, hour: 0 });
    const safe = a.heat + HEAT_PER_BREATH * HEAT_TIMED < heatLimit(c);
    if (canBreathe(a) && inhaling(a.t) && safe && a.orbs.length && rng.next() < 0.8) {
      const r = breathe(a, c);
      if (r.caught.length) a = r.attention;
    }
    factor += seatOf(a, c).factor;
  }
  return { a, seat: { factor: factor / 60, attended: true } };
}

/** Plays the open fight out with plain strikes, and hands it back. */
function fightOut(s: GameState): GameState {
  let st = s;
  const start = currentFight(st);
  if (!start) return st;
  let f = start;
  for (let i = 0; i < 120 && fightEnd(f, st.player.id) === null; i++) {
    const me = combatantIn(f, st.player.id)!;
    const foe = f.combatants.find((c) => c.side !== me.side && c.state === 'fighting')!;
    const r = playTurn(st, f, { main: { type: 'strike', target: foe.id } })!;
    st = r.state;
    f = r.turn.fight;
  }
  return finishFight(st, f)?.state ?? st;
}

const atHome = (s: GameState): GameState => {
  const h = homeOf(s, mapOf(s)!);
  return { ...s, map: { ...s.map!, at: [h.x, h.y], course: null, inside: h.id } };
};

/** One player's move on the chain, as a steady player makes it each minute. */
function playChain(s0: GameState): GameState {
  let s = noteQuests(s0);
  // What the road brought: go round it, or take what it offers first.
  for (const e of waiting(s.map)) {
    // The first exit that settles it: a deal it can't pay or a slip it can't make leaves it waiting.
    // A steady player slips or passes first, takes what's offered, fights last and never pays.
    const exits = encounterTemplate(e.template).exits;
    const order = ['slip', 'pass', 'take', 'talk', 'fight', 'deal'];
    const tries = exits
      .map((x, i) => ({ i, rank: order.indexOf(x.road) }))
      .sort((a, b) => a.rank - b.rank)
      .map((x) => x.i);
    for (const i of tries) {
      if (!waiting(s.map).some((x) => x.id === e.id)) break;
      const r = chooseExit(s, e.id, i);
      s = r ? r.state : s;
      if (s.fight) s = fightOut(s);
    }
  }
  for (const p of s.cards.pending) {
    s = p.card.startsWith('job-') ? resolveCard(s, p.uid, 0).state : resolveByDefault(s, p.uid);
    if (s.fight) s = fightOut(s);
  }
  const known = Object.keys(s.player.methods);
  if (!s.player.activeMethods.qi && known.length) s = switchMethod(s, 'qi', known[0]!).state;
  if (chainOffer(s)) {
    const r = takeChainOffer(s);
    if (r.ok) s = r.state;
  }
  const id = s.journal.followed;
  const q = id ? questState(s, id) : undefined;
  if (!q || q.handed !== null || !chainOf(s).includes(q.id)) return s;
  if (stepsDone(q)) {
    if (!handInCheck(s, q.id).ok && s.map && !s.map.course) s = atHome(s);
    const r = handInHere(s, q.id);
    return r.ok ? r.state : s;
  }
  const def = quest(q.id);
  const goal = def.steps[q.step]!.goal;
  const act = actNow(s);
  if (act && act.quest.id === q.id) {
    if (
      'spar' in act.act &&
      sparWhy(s, `chain:${pathKey(s.player.origin!.id, s.player.origin!.choice)}`)
    )
      return s;
    const r = doAct(s, q.id);
    if (typeof r !== 'string') s = s.fight || !r.fight ? r : fightOut(r);
    if (s.fight) s = fightOut(s);
    return s;
  }
  if ('hour' in goal) return withPlayer(s, setHours(s.player, [2], goal.hour).cultivator);
  if ('nodes' in goal) {
    const node = TREES.flatMap((t) => t.nodes)
      .filter((n) => canLearn(s.player, n.id).ok)
      .sort((a, b) => a.cost - b.cost)[0];
    return node ? withPlayer(s, learnNode(s.player, node.id).cultivator) : s;
  }
  const map = mapOf(s)!;
  const home = homeOf(s, map);
  if ('posting' in goal && def.posting) {
    const pid = questPostingId(q.id);
    if (goal.posting === 'taken') {
      const r = takePosting(atHome(s), map, home, pid);
      return r.ok ? setStance(r.state, 'avoid') : s;
    }
    if (goal.posting === 'met' && !s.map!.course) {
      const r = goToPlace(s, def.posting.spot);
      return r.ok ? r.state : s;
    }
    if (goal.posting === 'paid' && !s.map!.course) {
      const here = Math.hypot(s.map!.at[0] - home.x, s.map!.at[1] - home.y) < 50;
      if (!here) {
        const r = goToPlace(s, home.id);
        return r.ok ? r.state : s;
      }
      const r = claimPosting(atHome(s), map, pid);
      return r.ok ? r.state : s;
    }
    return s;
  }
  if ('event' in goal && goal.event === 'bought') {
    let st = atHome(s);
    // What the road gave sells first: the posting's herb and anything gathered.
    const herb = def.posting ? encounterTemplate(def.posting.template) : null;
    const things = new Set(
      herb?.exits.flatMap(
        (x) => x.pass?.stakes?.flatMap((k) => (k.do === 'find' ? k.things : [])) ?? [],
      ),
    );
    for (const id of Object.keys(st.player.items))
      if (things.has(id.split('~')[0]!))
        for (const sh of shopsAt(home.id)) {
          const r = sell(st, sh, id, st.player.items[id]!);
          if (r.ok) {
            st = r.state;
            break;
          }
        }
    for (const sh of shopsAt(home.id)) {
      const lot = shelf(st, sh).find(
        (l) => l.price * (l.standing ? 1 : l.n) <= 5 && !l.thing.includes(':'),
      );
      if (!lot) continue;
      const r = buy(st, sh, lot.slot, 1);
      if (r.ok) return r.state;
    }
    return s;
  }
  if ('reach' in goal && !s.map!.course) {
    const r = goToPlace(s, goal.reach);
    return r.ok ? r.state : s;
  }
  // The hire is taken at home, as its step says, not from the road: taken on the way back from the
  // hideout, a fast root crossed layer 4 before home, missed the shifts and was let go.
  if ('event' in goal && goal.event === 'job' && !s.map!.course) {
    const st = atHome(s);
    const r = takeJob(st, String(goal.match!.job));
    return r.ok ? r.state : st;
  }
  // A member's post is taken at home's Work door, as the post quest's first step says.
  if ('job' in goal && !s.map!.course) {
    const st = atHome(s);
    const r = takeJob(st, goal.job);
    return r.ok ? noteQuests(r.state) : st;
  }
  // Shifts and currency: stand at home with no course set.
  if (('kept' in goal || 'balance' in goal) && !s.map!.course) {
    const here = Math.hypot(s.map!.at[0] - home.x, s.map!.at[1] - home.y) < 50;
    if (!here) {
      const r = goToPlace(s, home.id);
      return r.ok ? r.state : s;
    }
    return { ...s, map: { ...s.map!, inside: null } };
  }
  return s;
}

function run(
  root: RootId,
  origin: (typeof ORIGIN_IDS)[number],
  choice: 'along' | 'refuse',
  seed: number,
) {
  let s = ensureMap(
    finishAllGuides(
      createLife({
        name: 'Sim',
        pronouns: 'they/them',
        look: '',
        mode: 'ironman',
        seed: `firsthour-${root}-${origin}-${choice}-${seed}`,
        choice,
        roll: {
          root,
          elements: defaultElements(root),
          body: 'farmhands-frame',
          soul: 'plain-mind',
          fate: 'ordinary-fate',
          origin,
        },
      }),
    ),
  );
  // Stones held, not burned, so the minute-30 count is what came in (design § The knobs).
  s = withPlayer(s, { ...s.player, plan: { ...s.player.plan, burnStones: false } });
  let last = worthOf(stonesOf(s.player));
  const ids = chainOf(s);
  const at: Partial<Record<Mark, number>> = {};
  // What came in by minute 30: every rise in stones and a member's currency (a mission hall and a
  // sect's post pay points), counted as it comes, whatever is spent or lost after.
  let purse = 0;
  let a = startAttention(s);
  const rng = new Rng(seed * 7919 + 3);
  for (let min = 0; min < END_MIN; min++) {
    const tally = () => {
      const held =
        worthOf(stonesOf(s.player)) +
        membershipsOf(s.world, s.player.id).reduce((t, x) => t + x.balance, 0);
      if (min < 30) purse += Math.max(0, held - last);
      last = held;
    };
    s = playChain(s);
    tally();
    const sat = sitMinute(a, s.player, rng);
    a = sat.a;
    s = advance(s, 60_000, { step: playDay, seat: sat.seat }).state;
    tally();
    s = playChain(s);
    tally();
    const p = s.player;
    const m = min + 1;
    if (Object.keys(p.methods).length) at.method ??= m;
    if (p.qi.stage >= 2) at.L2 ??= m;
    if (Object.keys(p.techniques).length) at.technique ??= m;
    if (p.qi.stage >= 3) at.L3 ??= m;
    if (questState(s, ids[2]!)?.handed != null) at.board ??= m;
    if (questState(s, ids[3]!)?.handed != null) at.soul ??= m;
    if (m >= 30 && MARKS.every((k) => at[k] !== undefined)) break;
  }
  return { at, purse };
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
const fmt = (m: number | undefined) =>
  m === undefined || !Number.isFinite(m) ? '—' : `${Math.round(m)}m`;

console.log(`First hour, played attended through the chain (median / slowest of ${SEEDS} seeds)`);
console.log(
  'path'.padEnd(26) +
    'root'.padEnd(10) +
    MARKS.map((m) => m.padStart(12)).join('') +
    'earned@30'.padStart(10),
);
const worst: Partial<Record<Mark, number>> = {};
let rogueMethod = 0;
let poorest = Infinity;
let poorestRun = Infinity;
for (const origin of ORIGIN_IDS) {
  for (const choice of ORIGIN_CHOICES) {
    for (const root of ROOTS_RUN) {
      const played = Array.from({ length: SEEDS }, (_, i) => run(root, origin, choice, i));
      const runs = played.map((x) => x.at);
      const purses = played.map((x) => x.purse);
      poorest = Math.min(poorest, median(purses));
      poorestRun = Math.min(poorestRun, ...purses);
      const cols = MARKS.map((m) => {
        const xs = runs.map((x) => x[m] ?? Infinity);
        const slow = Math.max(...xs);
        worst[m] = Math.max(worst[m] ?? 0, slow);
        if (m === 'method' && choice === 'refuse') rogueMethod = Math.max(rogueMethod, slow);
        return `${fmt(median(xs))}/${fmt(slow)}`.padStart(12);
      });
      console.log(
        pathKey(origin, choice).padEnd(26) +
          root.padEnd(10) +
          cols.join('') +
          `${Math.round(median(purses))}/${Math.round(Math.min(...purses))}`.padStart(10),
      );
    }
  }
}
const check = (label: string, ok: boolean) => console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
console.log('');
check(`a rogue's method by minute 6 (slowest ${fmt(rogueMethod)})`, rogueMethod <= 6);
check(
  `the payoff, the origin's technique, by about minute 15 (slowest ${fmt(worst.technique)})`,
  (worst.technique ?? Infinity) <= 18,
);
check(`layer 3 near minute 15–18 (slowest ${fmt(worst.L3)})`, (worst.L3 ?? Infinity) <= 20);
check(
  `the board handed in near minute 30 (slowest ${fmt(worst.board)})`,
  (worst.board ?? Infinity) <= 40,
);
// A Qi-Gathering Pill and stones still worth burning (design § The knobs).
check(
  `at least 20 low come in by minute 30, the median of each row (poorest row ${Math.round(poorest)}, poorest run ${Math.round(poorestRun)}, a road lost)`,
  poorest >= 20,
);
