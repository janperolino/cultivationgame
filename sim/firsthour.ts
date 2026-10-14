// The first hour (design § Character creation): every origin path on every root, from testing day,
// playing each card by its default choice as it comes. Real minutes to a qi method (the refusals
// wait on a card for theirs), the first orb drifting in to the Abode's figure, the first
// technique, layer 2, layer 3, the errand that hands over the tempering art, and the nourishing
// art; median and slowest of many seeds. Each first time is played at once, as a player would
// (core/life.ts, playFirsts): the method's copy read on one study hour, then taken up, the
// technique slotted with its hour, the art taken up with its hour, the stones burned. Talents are
// plain, so Aptitude stays at 10. The rules run
// away, as the floor; creation's own minutes (0–3) come before testing day. Targets: the first orb
// by minute 3–5 counting creation, layer 3 at about 45 minutes going along, nearer 55 on a refusal,
// and always inside the hour.
// Run: npm run sim -- firsthour [--seeds=25]
import { ORIGIN_CHOICES, ORIGIN_IDS, pathKey } from '../src/content/origins.ts';
import { defaultElements, ROOTS, type RootId } from '../src/content/roots.ts';
import { startAttention, tickAttention } from '../src/core/attention.ts';
import { playDay, resolveByDefault } from '../src/core/cards.ts';
import { createLife } from '../src/core/creation.ts';
import { playFirsts } from '../src/core/life.ts';
import { advance } from '../src/core/loop.ts';
import type { GameState } from '../src/core/state.ts';

const arg = process.argv.find((a) => a.startsWith('--seeds='));
const SEEDS = arg ? Number(arg.slice(8)) : 25;
const CHUNK_MS = 15_000;
const END_MS = 150 * 60_000;

type Mark = 'method' | 'orb' | 'technique' | 'L2' | 'L3' | 'errand' | 'soul';
const MARKS: Mark[] = ['method', 'orb', 'technique', 'L2', 'L3', 'errand', 'soul'];

function run(
  rootId: RootId,
  origin: (typeof ORIGIN_IDS)[number],
  choice: 'along' | 'refuse',
  seed: number,
) {
  let s: GameState = playFirsts(
    createLife({
      name: 'Sim',
      pronouns: 'they/them',
      look: '',
      mode: 'ironman',
      seed: `firsthour-${rootId}-${origin}-${choice}-${seed}`,
      choice,
      roll: {
        root: rootId,
        elements: defaultElements(rootId),
        body: 'farmhands-frame',
        soul: 'plain-mind',
        fate: 'ordinary-fate',
        origin,
      },
    }),
  );
  const at: Partial<Record<Mark, number>> = {};
  let ms = 0;
  let seat = startAttention(s);
  while (ms < END_MS) {
    // The seat, a second at a time, until the first orb reaches the figure.
    for (let i = 0; at.orb === undefined && i < CHUNK_MS / 1000; i++) {
      seat = tickAttention(seat, s.player, 1, { attended: true, abode: true, hour: 0 });
      if (seat.orbs.some((o) => o.arrives <= seat.t)) at.orb = (ms + i * 1000) / 60_000;
    }
    const r = advance(s, CHUNK_MS, { step: playDay });
    s = r.state;
    while (s.cards.pending.length) s = resolveByDefault(s, s.cards.pending[0]!.uid);
    s = playFirsts(s);
    ms += r.usedMs;
    const min = ms / 60_000;
    const p = s.player;
    if (p.activeMethods.qi) at.method ??= min;
    if (Object.keys(p.techniques).length) at.technique ??= min;
    if (p.qi.stage >= 2) at.L2 ??= min;
    if (p.qi.stage >= 3) at.L3 ??= min;
    if ('stone-bearing' in p.methods) at.errand ??= min;
    if ('still-lantern' in p.methods) at.soul ??= min;
  }
  return at;
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const fmt = (m: number | undefined) =>
  m === undefined ? '—' : m < 2 ? `${m.toFixed(1)}m` : `${Math.round(m)}m`;

console.log(`First hour (median / slowest of ${SEEDS} seeds, real minutes from testing day)`);
console.log('path'.padEnd(26) + 'root'.padEnd(10) + MARKS.map((m) => m.padStart(12)).join(''));
let worstL3 = { along: 0, refuse: 0 };
for (const origin of ORIGIN_IDS) {
  for (const choice of ORIGIN_CHOICES) {
    for (const r of ROOTS) {
      const runs = Array.from({ length: SEEDS }, (_, i) => run(r.id, origin, choice, i));
      const cols = MARKS.map((m) => {
        const xs = runs.map((x) => x[m] ?? Infinity);
        const slow = Math.max(...xs);
        if (m === 'L3') worstL3[choice] = Math.max(worstL3[choice], slow);
        return `${fmt(median(xs))}/${fmt(slow === Infinity ? undefined : slow)}`.padStart(12);
      });
      console.log(pathKey(origin, choice).padEnd(26) + r.id.padEnd(10) + cols.join(''));
    }
  }
}
worstL3 = { along: Math.round(worstL3.along), refuse: Math.round(worstL3.refuse) };
console.log(`\nSlowest layer 3: going along ${worstL3.along}m, refusing ${worstL3.refuse}m.`);
