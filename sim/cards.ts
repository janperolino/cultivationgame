// The card pace (design § Story cards and events, pacing): every origin path played online on the
// real clock, each card taken by its default as it comes, counting cards per real hour, by deck
// and by kind, at each realm, and how often a card repeats: the share of draws that repeat a card
// seen in the last real hour, and the median real minutes between two draws of the same card.
// Targets: one card every five to eight real minutes, two or three an in-game season at Qi
// Condensation, and repeats rare.
// Run: npm run sim -- cards [--seeds=4] [--hours=20]
import { card } from '../src/content/cards/index.ts';
import { ORIGIN_CHOICES, ORIGIN_IDS, pathKey } from '../src/content/origins.ts';
import { defaultElements } from '../src/content/roots.ts';
import { playDay, resolveByDefault } from '../src/core/cards.ts';
import { createLife } from '../src/core/creation.ts';
import { finishAllGuides } from '../src/core/guides.ts';
import { advance } from '../src/core/loop.ts';
import type { GameState } from '../src/core/state.ts';

const num = (name: string, fallback: number) => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? Number(a.split('=')[1]) : fallback;
};
const SEEDS = num('seeds', 4);
const HOURS = num('hours', 20);
const CHUNK_MS = 15_000;

interface Draw {
  card: string;
  deck: string;
  kind: string;
  min: number;
  realm: string;
  day: number;
}

function run(origin: (typeof ORIGIN_IDS)[number], choice: 'along' | 'refuse', seed: number) {
  let s: GameState = createLife({
    name: 'Sim',
    pronouns: 'they/them',
    look: '',
    mode: 'ironman',
    seed: `cards-${origin}-${choice}-${seed}`,
    choice,
    roll: {
      root: 'true',
      elements: defaultElements('true'),
      body: 'farmhands-frame',
      soul: 'plain-mind',
      fate: 'ordinary-fate',
      origin,
    },
  });
  s = finishAllGuides(s);
  const draws: Draw[] = [];
  const realmMs: Record<string, number> = {};
  const realmDays: Record<string, number> = {};
  let ms = 0;
  let seen = s.cards.nextUid;
  while (ms < HOURS * 3_600_000 && !s.ended) {
    const realm = s.player.qi.realm;
    const r = advance(s, CHUNK_MS, { step: playDay });
    s = r.state;
    ms += r.usedMs;
    realmMs[realm] = (realmMs[realm] ?? 0) + r.usedMs;
    realmDays[realm] = (realmDays[realm] ?? 0) + r.days;
    for (const p of s.cards.pending) {
      if (p.uid < seen) continue;
      const k = card(p.card);
      draws.push({
        card: k.id,
        deck: k.deck,
        kind: k.kind ?? k.deck,
        min: ms / 60_000,
        realm,
        day: p.day,
      });
    }
    seen = s.cards.nextUid;
    while (s.cards.pending.length) s = resolveByDefault(s, s.cards.pending[0]!.uid);
    // A Foundation attempt the default rules leave waiting: break through so the run climbs.
    if (r.usedMs === 0) break;
  }
  return { draws, realmMs, realmDays };
}

const median = (xs: number[]) =>
  xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]! : NaN;
const f1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '—');

console.log(`Card pace: ${SEEDS} seeds a path, ${HOURS} real hours online, defaults taken`);
console.log(
  'path'.padEnd(24) +
    'cards/h'.padStart(9) +
    'min/card'.padStart(10) +
    'seclusion/h'.padStart(13) +
    'per season'.padStart(12) +
    'repeat<1h'.padStart(11) +
    'gap (min)'.padStart(11),
);
const all: Draw[] = [];
let allMs = 0;
let allQcDays = 0;
let allQcCards = 0;
for (const origin of ORIGIN_IDS) {
  for (const choice of ORIGIN_CHOICES) {
    const runs = Array.from({ length: SEEDS }, (_, i) => run(origin, choice, i));
    const draws = runs.flatMap((r) => r.draws);
    const ms = runs.reduce((a, r) => a + Object.values(r.realmMs).reduce((x, y) => x + y, 0), 0);
    const hours = ms / 3_600_000;
    const qcDays = runs.reduce((a, r) => a + (r.realmDays['qi-condensation'] ?? 0), 0);
    const qcCards = draws.filter((d) => d.realm === 'qi-condensation').length;
    let repeats = 0;
    const gaps: number[] = [];
    for (const r of runs) {
      const last = new Map<string, number>();
      for (const d of r.draws) {
        const prev = last.get(d.card);
        if (prev !== undefined) {
          gaps.push(d.min - prev);
          if (d.min - prev < 60) repeats++;
        }
        last.set(d.card, d.min);
      }
    }
    all.push(...draws);
    allMs += ms;
    allQcDays += qcDays;
    allQcCards += qcCards;
    console.log(
      pathKey(origin, choice).padEnd(24) +
        f1(draws.length / hours).padStart(9) +
        f1(ms / 60_000 / draws.length).padStart(10) +
        f1(draws.filter((d) => d.deck === 'seclusion').length / hours).padStart(13) +
        f1((qcCards / qcDays) * 90).padStart(12) +
        `${Math.round((100 * repeats) / draws.length)}%`.padStart(11) +
        f1(median(gaps)).padStart(11),
    );
  }
}

const hours = allMs / 3_600_000;
console.log(
  `\nAll paths: ${f1(all.length / hours)} cards an hour, one every ${f1(allMs / 60_000 / all.length)} real minutes; ${f1((allQcCards / allQcDays) * 90)} a season at Qi Condensation.`,
);
const byRealm = new Map<string, number>();
for (const d of all) byRealm.set(d.realm, (byRealm.get(d.realm) ?? 0) + 1);
console.log(`By realm (draws): ${[...byRealm].map(([r, n]) => `${r} ${n}`).join(', ')}`);
const byKind = new Map<string, number>();
for (const d of all) byKind.set(d.kind, (byKind.get(d.kind) ?? 0) + 1);
console.log(
  `By kind: ${[...byKind].map(([k, n]) => `${k} ${Math.round((100 * n) / all.length)}%`).join(', ')}`,
);
const byCard = new Map<string, number>();
for (const d of all) byCard.set(d.card, (byCard.get(d.card) ?? 0) + 1);
const top = [...byCard].sort((a, b) => b[1] - a[1]).slice(0, 6);
console.log(`Most drawn: ${top.map(([k, n]) => `${k} ${n}`).join(', ')}`);
