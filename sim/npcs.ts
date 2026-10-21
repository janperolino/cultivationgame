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
// Run: npm run sim -- npcs [--seeds=9]
import { PEDIGREES } from '../src/content/enemies.ts';
import { method, nextChapter } from '../src/content/methods.ts';
import { NPC_PACE, PACE_AGES } from '../src/content/pace.ts';
import { rarityMultiplier } from '../src/content/rarity.ts';
import { defaultElements } from '../src/content/roots.ts';
import { tierStep } from '../src/content/realms.ts';
import { playDay, resolveByDefault } from '../src/core/cards.ts';
import { createLife } from '../src/core/creation.ts';
import { finishAllGuides } from '../src/core/guides.ts';
import { majorCheck } from '../src/core/cultivation.ts';
import { breakThrough, playFirsts, switchMethod } from '../src/core/life.ts';
import { PACE, TUTORIAL_PACE } from '../src/content/cultivation.ts';
import { inTutorial } from '../src/core/methods.ts';
import { advance } from '../src/core/loop.ts';
import { addItem, DAYS_PER_YEAR, withPlayer, type GameState } from '../src/core/state.ts';

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
  if (!chapter || !(chapter.id in s.player.methods)) return s;
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
  s = playFirsts(finishAllGuides(s));
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
      if (majorCheck(s.player, 'qi')?.ready) {
        s = breakThrough(s, 'qi').state;
        if (s.player.qi.realm === 'qi-condensation') {
          s = withPlayer(s, addItem(s.player, 'foundation-pill', 1));
        }
      }
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
function paceOf(id: (typeof PEDIGREES)[number]['id']): Record<string, number> {
  const ped = PEDIGREES.find((p) => p.id === id)!;
  const out: Record<string, number> = {};
  const tutorialEnd = white.q3!;
  let prevWhite = tutorialEnd;
  let prev = tutorialEnd;
  out.q2 = white.q2!;
  out.q3 = tutorialEnd;
  for (const k of KEYS.slice(2)) {
    if (white[k] === undefined) break;
    if (k.startsWith('f') && id === 'rogue') break;
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

const same = PEDIGREES.every((p) => table[p.id]!.join() === NPC_PACE[p.id].join());
console.log(
  same
    ? '\nsrc/content/pace.ts matches.'
    : '\nsrc/content/pace.ts differs; paste the table above into it.',
);
