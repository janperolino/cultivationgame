// NPC pace (design § Enemies, beasts and the people you meet): an NPC's realm comes from its age
// and pedigree. It climbs at the away rate on its pedigree's typical method, read off the pacing
// sim's away row: this plays the same away life (a true root, the garrison line, the default rule
// and safe breakthroughs) through Foundation's peak and records the day each qi stage arrives, then
// scales the method's part of every stage by the typical method's speed against white. The
// tutorial layers ignore the method, Foundation waits on 500 insight ever earned (which comes from
// everything, so it arrives on the same days), and a rogue never gets a Foundation Pill, so stays
// at Qi Condensation's peak. Realms past Foundation wait on tier 3 methods (M5).
// The table is content (src/content/pace.ts) that M3's encounters and M5's rivals read; this sim
// prints it and says whether the content still matches.
// Run: npm run sim -- npcs [--seeds=9] [--years=100]
import { PEDIGREES } from '../src/content/enemies.ts';
import { method, nextChapter } from '../src/content/methods.ts';
import { NPC_PACE, NPC_STAGE_YEARS, PACE_AGES } from '../src/content/pace.ts';
import { rarityMultiplier } from '../src/content/rarity.ts';
import { defaultElements } from '../src/content/roots.ts';
import { tierStep } from '../src/content/realms.ts';
import { playDay, resolveByDefault } from '../src/core/cards.ts';
import { createLife } from '../src/core/creation.ts';
import { withoutChain } from '../src/core/chains.ts';
import { finishAllGuides } from '../src/core/guides.ts';
import { majorCheck } from '../src/core/cultivation.ts';
import { breakThrough, playFirsts, switchMethod } from '../src/core/life.ts';
import { PACE, TUTORIAL_PACE } from '../src/content/cultivation.ts';
import { inTutorial, learnMethod } from '../src/core/methods.ts';
import { advance } from '../src/core/loop.ts';
import { addItem, DAYS_PER_YEAR, withPlayer, type GameState } from '../src/core/state.ts';
import { membershipDay } from '../src/core/orgs/views.ts';
import { castDay, castIn, chooseAct, seasonIndex, wantPoints } from '../src/core/regionalCast.ts';
import { natureOf } from '../src/core/resolver/opinion.ts';

const arg = process.argv.find((a) => a.startsWith('--seeds='));
const SEEDS = arg ? Number(arg.slice(8)) : 9;
const CHUNK_MS = 60_000;
const MAX_HOURS = 150;

/** Stage keys in climbing order: q2..q9 for the layers, f1..f4 for Foundation's stages. */
/**
 * NPCs keep their pace (design § Character creation, What the faster clock moves): the faster
 * clock is the player's, so the world's people climb at the rates before it, a seat that takes
 * the faster clock's factor back off every ladder and insight (and the tutorial's own pace in it).
 */
const npcSeat = (s: GameState) => ({
  factor: 1 / (inTutorial(s.player.qi) ? TUTORIAL_PACE : PACE),
  attended: false,
});

const KEYS = [2, 3, 4, 5, 6, 7, 8, 9].map((k) => `q${k}`).concat(['f1', 'f2', 'f3', 'f4']);

function settleCards(s: GameState): GameState {
  while (s.cards.pending.length) s = resolveByDefault(s, s.cards.pending[0]!.uid);
  return s;
}

function takeChapter(s: GameState): GameState {
  const id = s.player.activeMethods.qi;
  const chapter = id ? nextChapter(method(id)) : undefined;
  if (!chapter) return s;
  // The away life holds its line's next chapter, as the pedigree's typical method runs on.
  if (!(chapter.id in s.player.methods)) s = withPlayer(s, learnMethod(s.player, chapter.id));
  return switchMethod(s, 'qi', chapter.id).state;
}

/** Days since birth at each stage, and when 500 insight had been earned. */
function play(seed: number): { at: Record<string, number>; insight500?: number } {
  let s = createLife({
    name: 'Sim',
    pronouns: 'they/them',
    look: '',
    mode: 'ironman',
    seed: `npcs-${seed}`,
    choice: 'along',
    roll: {
      root: 'true',
      elements: defaultElements('true'),
      body: 'farmhands-frame',
      soul: 'plain-mind',
      fate: 'ordinary-fate',
      origin: 'cave-orphan',
    },
  });
  // The opening's chain isn't what this sim measures: without it the seclusion deck isn't held.
  s = playFirsts(withoutChain(finishAllGuides(s)));
  const at: Record<string, number> = {};
  let insight500: number | undefined;
  let ms = 0;
  while (ms < MAX_HOURS * 3_600_000) {
    const r = advance(s, CHUNK_MS, { step: playDay, seat: npcSeat(s) });
    s = playFirsts(settleCards(r.state));
    ms += r.usedMs;
    const p = s.player;
    const lived = s.calendar.day - p.bornDay;
    if (insight500 === undefined && p.insight.earned >= 500) insight500 = lived;
    if (p.qi.realm === 'qi-condensation') {
      for (let k = 2; k <= p.qi.stage; k++) at[`q${k}`] ??= lived;
      if (p.qi.stage === 9) s = takeChapter(s);
      // The away life is handed its Foundation Pill once only the pill stands in the way: a
      // majorCheck isn't ready without it, so waiting for a failed try never handed it one.
      const check = majorCheck(s.player, 'qi');
      if (check?.bar && check.insight && !check.gate)
        s = withPlayer(s, addItem(s.player, 'foundation-pill', 1));
      if (majorCheck(s.player, 'qi')?.ready) s = breakThrough(s, 'qi').state;
    } else {
      for (let k = 1; k <= p.qi.stage; k++) at[`f${k}`] ??= lived;
      if (p.qi.stage === 4) break;
    }
    if (r.atEdge) break;
  }
  return { at, insight500 };
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const runs = Array.from({ length: SEEDS }, (_, i) => play(i));
const white: Record<string, number> = {};
for (const k of KEYS) {
  const xs = runs.map((r) => r.at[k]).filter((x): x is number => x !== undefined);
  if (xs.length) white[k] = median(xs)!;
}
const insight500 = median(runs.map((r) => r.insight500 ?? Infinity))!;

console.log(`White method, true root, away (median of ${SEEDS}): age at each qi stage`);
const age = (days: number) => days / DAYS_PER_YEAR;
console.log(
  KEYS.map((k) => `${k} ${white[k] === undefined ? '—' : age(white[k]).toFixed(1)}`).join('  '),
);
console.log(`500 insight earned at ${age(insight500).toFixed(1)}`);

/** Each pedigree's days to each stage: the tutorial as is, the method's part sped by its band. */
function paceOf(id: (typeof PEDIGREES)[number]['id'], pill = false): Record<string, number> {
  const ped = PEDIGREES.find((p) => p.id === id)!;
  const out: Record<string, number> = {};
  const tutorialEnd = white.q3!;
  let prevWhite = tutorialEnd;
  let prev = tutorialEnd;
  out.q2 = white.q2!;
  out.q3 = tutorialEnd;
  for (const k of KEYS.slice(2)) {
    if (white[k] === undefined) break;
    if (k.startsWith('f') && id === 'rogue' && !pill) break;
    const tier = k.startsWith('f') ? 2 : 1;
    const speed = rarityMultiplier(ped.typical, tierStep(tier));
    let day = prev + (white[k]! - prevWhite) / speed;
    if (k === 'f1') day = Math.max(day, insight500);
    out[k] = day;
    prevWhite = white[k]!;
    prev = day;
  }
  return out;
}

/** The stage a pace table stands at by an age: "q7", "f2", or "q1" before layer 2. */
function stageAt(pace: Record<string, number>, years: number): string {
  let stage = 'q1';
  for (const k of KEYS) if (pace[k] !== undefined && age(pace[k]) <= years) stage = k;
  return stage;
}

const table: Record<string, string[]> = {};
console.log(`\nExpected qi stage by age (q = Qi Condensation layer, f = Foundation stage)`);
console.log('pedigree'.padEnd(18) + PACE_AGES.map((a) => String(a).padStart(6)).join(''));
for (const p of PEDIGREES) {
  const pace = paceOf(p.id);
  table[p.id] = PACE_AGES.map((a) => stageAt(pace, a));
  console.log(p.name.padEnd(18) + table[p.id]!.map((x) => x.padStart(6)).join(''));
}

// The regional cast's clock (N2): the age at each stage for every pedigree, a rogue's Foundation
// too, since a cast member's purse can buy the pill an encounter's rogue never holds.
const years: Record<string, Record<string, number>> = {};
console.log(`\nThe cast's age at each stage (NPC_STAGE_YEARS)`);
for (const p of PEDIGREES) {
  const pace = paceOf(p.id, true);
  years[p.id] = Object.fromEntries(
    Object.entries(pace).map(([k, d]) => [k, Math.round(age(d) * 10) / 10]),
  );
  console.log(`  '${p.id}': ${JSON.stringify(years[p.id]).replace(/"/g, '')},`);
}

const same = PEDIGREES.every((p) => table[p.id]!.join() === NPC_PACE[p.id].join());
const sameYears = PEDIGREES.every(
  (p) => JSON.stringify(years[p.id]) === JSON.stringify(NPC_STAGE_YEARS[p.id]),
);
console.log(
  same && sameYears
    ? '\nsrc/content/pace.ts matches.'
    : '\nsrc/content/pace.ts differs; paste the tables above into it.',
);

// ── A region's cast over a century (N2; design § The regional cast) ──────────────────────────
// A seeded Border Wilds lives a hundred years month by month: the powers' month for the cast (their
// allowances, quotas and the inner trial), their purses buying their pills, and their seasons. It
// prints the realms, the deaths and the seats each decade against the design's counts.
const REGION = 'qm-bianhuang';
const YEARS = Number(process.argv.find((a) => a.startsWith('--years='))?.slice(8) ?? 100);

function castCounts(s: GameState) {
  const ids = castIn(s.world, REGION);
  const by = { qi: 0, foundation: 0, core: 0, nascent: 0, children: 0 };
  for (const id of ids) {
    const k = s.world.kept[id]!;
    const r = k.realm;
    // Children still a seed until they are tested at 12, on the parent who bore them.
    by.children += k.children?.length ?? 0;
    if (!r) continue;
    if (r.realm === 'qi-condensation') by.qi += 1;
    else if (r.realm === 'foundation-establishment') by.foundation += 1;
    else if (r.realm === 'core-formation') by.core += 1;
    else by.nascent += 1;
  }
  return { ...by, total: ids.length };
}

function century(): boolean {
  const t0 = Date.now();
  let s = createLife({
    name: 'Sim',
    pronouns: 'they/them',
    look: '',
    mode: 'ironman',
    seed: 'npcs-cast',
    choice: 'along',
    roll: {
      root: 'true',
      elements: defaultElements('true'),
      body: 'farmhands-frame',
      soul: 'plain-mind',
      fate: 'ordinary-fate',
      origin: 'cave-orphan',
    },
  });
  s = castDay(s, s.calendar.day);
  const start = castCounts(s);
  const deaths: Record<string, number> = {};
  const counted = new Set<string>();
  // One cast member's first seasons, read from their wants.
  const one = castIn(s.world, REGION).find((id) => natureOf(s.world, id).motives[0] === 'greed')!;
  const story: string[] = [];
  console.log(`\nThe Border Wilds' cast over ${YEARS} years (seeded ${JSON.stringify(start)})`);
  console.log('year     qi  found  core  nasc  child  total  dead(age/hunt/duel)  deeds  KB');
  for (let month = 1; month <= YEARS * 12; month++) {
    const from = s.calendar.day;
    s = { ...s, calendar: { ...s.calendar, day: from + 30 } };
    s = membershipDay(s, 30);

    const before = seasonIndex(from);
    if (seasonIndex(s.calendar.day) !== before && story.length < 6 && s.world.kept[one]?.realm) {
      const p = wantPoints(s, one, s.calendar.day);
      const act = chooseAct(s, one, before + 1, s.calendar.day);
      story.push(
        `  ${s.world.kept[one]!.name}, season ${before + 1}: ${Object.entries(p)
          .filter(([, n]) => n > 0)
          .map(([w, n]) => `${w} ${n}`)
          .join(
            ', ',
          )} → ${act.want}${act.up ? ' (a stage up)' : ''}${act.trade ? ' (trade)' : ''} at ${act.place}`,
      );
    }
    s = castDay(s, from);
    for (const [id, k] of Object.entries(s.world.kept)) {
      if (!k.region || !k.died || counted.has(id)) continue;
      counted.add(id);
      deaths[k.died.how] = (deaths[k.died.how] ?? 0) + 1;
    }
    if (month % 120 === 0) {
      const c = castCounts(s);
      const kb = Math.round(JSON.stringify(s.world).length / 1024);
      const dead = `${deaths.age ?? 0}/${deaths.hunt ?? 0}/${deaths.duel ?? 0}`;
      console.log(
        `${String(month / 12).padEnd(6)}${String(c.qi).padStart(5)}${String(c.foundation).padStart(7)}${String(c.core).padStart(6)}${String(c.nascent).padStart(6)}${String(c.children).padStart(7)}${String(c.total).padStart(7)}  ${dead.padEnd(19)}${String(s.world.deeds.length).padStart(7)}${String(kb).padStart(5)}`,
      );
    }
  }
  console.log(`\nOne cast member's seasons, from their wants:`);
  for (const line of story) console.log(line);
  const end = castCounts(s);
  const seats: Record<string, number> = {};
  for (const m of s.world.members)
    if (s.world.kept[m.who]?.region) seats[m.seat] = (seats[m.seat] ?? 0) + 1;
  console.log(`Seats held by the cast at the end: ${JSON.stringify(seats)}`);
  const acts: Record<string, number> = {};
  for (const k of Object.values(s.world.kept))
    for (const [kind, n] of Object.entries(k.tally ?? {})) acts[kind] = (acts[kind] ?? 0) + n;
  for (const d of s.world.deeds) acts[d.kind] = (acts[d.kind] ?? 0) + 1;
  console.log(`The century's deeds by kind (folded and kept): ${JSON.stringify(acts)}`);
  const size = Object.entries(s.world)
    .map(([key, v]) => [key, Math.round(JSON.stringify(v).length / 1024)] as const)
    .filter(([, kb]) => kb > 0)
    .sort((a, b) => b[1] - a[1]);
  console.log(`The world's size by key, KB: ${size.map(([k, kb]) => `${k} ${kb}`).join(', ')}`);
  const near = (n: number, lo: number, hi: number) => n >= lo && n <= hi;
  const checks: [string, boolean][] = [
    [`Core Formation near 30 (${end.core}, 18–45)`, near(end.core, 18, 45)],
    [`Nascent Soul near 3 (${end.nascent}, 1–6)`, near(end.nascent, 1, 6)],
    [`Foundation near 100 (${end.foundation}, 70–125)`, near(end.foundation, 70, 125)],
    [`Rising Qi Condensation near 70 (${end.qi}, 50–85)`, near(end.qi, 50, 85)],
    [
      `Deaths by age and in fights (${deaths.age ?? 0} by age, ${(deaths.hunt ?? 0) + (deaths.duel ?? 0)} in fights)`,
      (deaths.age ?? 0) > 0 && (deaths.hunt ?? 0) + (deaths.duel ?? 0) > 0,
    ],
    [
      `Every seat a power gives held (${Object.keys(seats).length} kinds)`,
      ['outer', 'inner', 'elder', 'head'].every((k) => (seats[k] ?? 0) > 0),
    ],
  ];
  console.log('\nTargets');
  for (const [what, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${what}`);
  console.log(`(${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  return checks.every(([, ok]) => ok);
}

if (!century()) process.exitCode = 1;
