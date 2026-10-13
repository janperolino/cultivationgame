// A full bookcase of made-up manuals, for the dev console's `shelf` and for tests: about the mix
// of kinds and rarities a long life gathers (most of them formulas, a few scriptures above the
// trees), most of them finished. Seeded, so the same count gives the same shelf. Nothing here is
// game content; the game's manuals are in content/manuals.ts.
import { ART_NODES, type Manual, type ManualKind, type ManualNode } from '../content/manuals.ts';
import { RARITY_IDS, rarityRank, type RarityId } from '../content/rarity.ts';
import type { StatId } from '../content/stats.ts';
import { TREES } from '../content/trees/index.ts';
import { hashSeed, mulberry32 } from './rng.ts';

/** Out of 150: 4 scriptures, 2 inheritances, 14 methods, 30 arts, 8 styles, the rest formulas. */
const MIX: readonly [ManualKind, number][] = [
  ['scripture', 4],
  ['inheritance', 2],
  ['method', 14],
  ['art', 30],
  ['style', 8],
];

/** The chance of each rarity from gray up; a scripture or an inheritance is purple at least. */
const ODDS: Record<RarityId, number> = {
  gray: 0.12,
  white: 0.35,
  green: 0.25,
  blue: 0.15,
  purple: 0.07,
  gold: 0.04,
  red: 0.015,
  pristine: 0.005,
};

const FIRST: readonly [string, string][] = [
  ['Cold Pool', '寒潭'],
  ['Green Cloud', '青云'],
  ['Falling Goose', '落雁'],
  ['Listening Wind', '听风'],
  ['Lantern Moth', '灯蛾'],
  ['Grey Heron', '苍鹭'],
  ['Frost Window', '霜窗'],
  ['Pine Needle', '松针'],
  ['Red Dusk', '赤霞'],
  ['Night Rain', '夜雨'],
  ['Iron Robe', '铁衣'],
  ['Willow Root', '柳根'],
  ['Salt Road', '盐道'],
  ['Hollow Reed', '空苇'],
  ['Bell Tower', '钟楼'],
  ['Mill Wheel', '磨轮'],
];
const SECOND: readonly [string, string][] = [
  ['', ''],
  ['Dawn', '晓'],
  ['Ninefold', '九重'],
  ['Silent', '寂'],
  ['Old', '古'],
  ['Hidden', '隐'],
  ['Twin', '双'],
  ['Far', '远'],
  ['Deep', '深'],
  ['Last', '末'],
];
const SUFFIX: Record<ManualKind, [string, string]> = {
  formula: ['Formula', '诀'],
  method: ['Method', '功'],
  art: ['Art', '术'],
  style: ['Style', '流'],
  scripture: ['Scripture', '经'],
  inheritance: ['Legacy', '遗承'],
};
const NODE_NAMES: readonly [string, string][] = [
  ['First Count', '初数'],
  ['Held Breath', '屏息'],
  ['Quiet Hour', '静时'],
  ['Long Exhale', '长呼'],
  ['Low Fire', '文火'],
  ['Turning Wheel', '转轮'],
  ['Open Gate', '开门'],
  ['Still Water', '止水'],
  ['Cold Hands', '寒手'],
  ['Deep Root', '深根'],
  ['Far Bell', '远钟'],
  ['Slow Tide', '缓潮'],
];
const EFFECTS: Record<string, readonly [StatId, number][]> = {
  qi: [
    ['qiGain', 0.04],
    ['stoneQi', 0.05],
    ['minorOdds', 0.01],
  ],
  body: [
    ['bodyGain', 0.04],
    ['hp', 0.03],
  ],
  soul: [
    ['soulGain', 0.04],
    ['insightGain', 0.03],
  ],
  dao: [
    ['hp', 0.03],
    ['agility', 1],
  ],
  none: [
    ['qiGain', 0.06],
    ['insightGain', 0.05],
    ['practiceGain', 0.05],
  ],
};

const BIG = ['qi', 'body', 'soul'];
const DAO_IDS = TREES.filter((t) => t.dao).map((t) => t.id);

/** `count` made-up manuals and the nodes learned on them: about three in five finished. */
export function madeUpManuals(
  count = 150,
  seed = 'bookcase',
): { manuals: Manual[]; learned: string[] } {
  const roll = mulberry32(hashSeed(seed));
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(roll() * xs.length)]!;
  const kinds: ManualKind[] = MIX.flatMap(([k, n]) =>
    Array.from({ length: Math.round((n * count) / 150) }, () => k),
  ).slice(0, count);
  while (kinds.length < count) kinds.push('formula');

  const manuals: Manual[] = [];
  const learned: string[] = [];
  kinds.forEach((kind, i) => {
    let rarity = rollFrom(roll());
    if ((kind === 'scripture' || kind === 'inheritance') && rarityRank(rarity) < 4)
      rarity = 'purple';
    const [first, firstHanzi] = FIRST[i % FIRST.length]!;
    const [second, secondHanzi] = SECOND[Math.floor(i / FIRST.length) % SECOND.length]!;
    const [suffix, suffixHanzi] = SUFFIX[kind];
    const host =
      kind === 'formula' || kind === 'method' ? pick(BIG) : kind === 'art' ? pick(DAO_IDS) : null;
    const size =
      kind === 'formula'
        ? 1 + Math.floor(roll() * 2)
        : kind === 'method'
          ? 2 + Math.floor(roll() * 3)
          : kind === 'art'
            ? ART_NODES[rarity]
            : kind === 'style'
              ? 3 + Math.floor(roll() * 3)
              : 5 + Math.floor(roll() * 8);
    const id = `made-up-${i}`;
    const pool = EFFECTS[host === null ? 'none' : BIG.includes(host) ? host : 'dao']!;
    const nodes: ManualNode[] = Array.from({ length: size }, (_, j) => {
      const [name, hanzi] = NODE_NAMES[(i * 5 + j * 7) % NODE_NAMES.length]!;
      const [stat, value] = pool[(i + j) % pool.length]!;
      // A big manual forks: each node past the first grows from the one halfway back.
      const parent = size > 4 ? Math.floor((j - 1) / 2) : j - 1;
      return {
        id: `${id}-${j}`,
        name,
        hanzi,
        home: 'manual',
        manual: id,
        tier: size > 4 && j >= 4 ? 2 : 1,
        kind: j === size - 1 && size > 2 ? 'notable' : 'minor',
        cost: 25,
        requires: j === 0 ? [] : [`${id}-${parent}`],
        effects: [{ stat, value }],
        text: `${name}, as the ${first.toLowerCase()} teaches it.`,
      };
    });
    manuals.push({
      id,
      name: [second, first, suffix].filter(Boolean).join(' '),
      pinyin: '',
      hanzi: `${secondHanzi}${firstHanzi}${suffixHanzi}`,
      kind,
      rarity,
      source: 'the dev console',
      ladder: host === 'body' || host === 'soul' ? host : 'qi',
      host,
      tier: 1,
      nodes,
    });
    const done = roll() < 0.6 ? size : Math.floor(roll() * size);
    for (const n of nodes.slice(0, done)) learned.push(n.id);
  });
  return { manuals, learned };
}

function rollFrom(x: number): RarityId {
  let acc = 0;
  for (const r of RARITY_IDS) {
    acc += ODDS[r];
    if (x < acc) return r;
  }
  return 'white';
}
