// Contemplation sources (design § Cultivation, insight): manuals and lectures arrive in lumps,
// steles and places trickle a little a day, and some run dry. Story cards point at them (P1.7),
// and the world from M3. Aptitude and talents multiply what they give; the supply counts what was
// drawn before that. A new source is an entry here, not new code. Starting values at tier 1:
// lumps of 10 to 50, trickles of 0.5 to 2 a day. Drafted in P1.5 for Jan's review.

export interface ContemplationSource {
  id: string;
  name: string;
  hanzi: string;
  /** A lump comes all at once; a trickle comes by the day spent with it. */
  kind: 'lump' | 'trickle';
  /** Insight a lump gives, or a trickle gives each day. */
  yield: number;
  /** Insight it holds in all before it runs dry, or null when it never does. */
  supply: number | null;
  text: string;
}

export const CONTEMPLATION: readonly ContemplationSource[] = [
  {
    id: 'garrison-drill-manual',
    name: "the garrison school's drill manual",
    hanzi: '军镇操典',
    kind: 'lump',
    yield: 15,
    supply: 15,
    text: 'Read cover to cover once, it has nothing more to say.',
  },
  {
    id: 'shrine-lecture',
    name: "a lamp-keeper's lecture at a frontier shrine",
    hanzi: '灯前讲道',
    kind: 'lump',
    yield: 30,
    supply: 30,
    text: 'An old keeper talks about stillness for a whole night.',
  },
  {
    id: 'cracked-stele',
    name: 'a cracked Dao stele',
    hanzi: '残碑',
    kind: 'trickle',
    yield: 1,
    supply: 120,
    text: 'Half its strokes are lost to the crack; the other half still hold a Dao.',
  },
  {
    id: 'mountain-waterfall',
    name: 'a mountain waterfall',
    hanzi: '飞瀑',
    kind: 'trickle',
    yield: 0.5,
    supply: null,
    text: 'Water falls the same way forever, and there is always more to see in it.',
  },
  {
    id: 'thunder-peak',
    name: 'a thunder peak',
    hanzi: '雷峰',
    kind: 'trickle',
    yield: 2,
    supply: 200,
    text: 'Storms gather on it every evening until the season turns.',
  },
];

const byId = new Map(CONTEMPLATION.map((s) => [s.id, s]));

export function contemplationSource(id: string): ContemplationSource {
  const s = byId.get(id);
  if (!s) throw new RangeError(`Unknown contemplation source ${id}`);
  return s;
}

export function hasContemplationSource(id: string): boolean {
  return byId.has(id);
}
