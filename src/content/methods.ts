// Methods: the manuals each ladder climbs with (design § Cultivation, every ladder needs a method):
// cultivation methods for qi, tempering arts for the body, nourishing arts for the soul. These are
// the common ones the Border Wilds hand out: the origins' qi methods (design § Character creation)
// and the first tempering and nourishing arts for P1.7's cards. A new method is an entry here, not
// new code.
import type { LadderId } from './cultivation.ts';
import type { Element } from './elements.ts';
import type { RootKind } from './roots.ts';

export type Fit = 'full' | 'partial' | 'poor';

/** How fast a method cultivates for a root that fits it this well. */
export const FIT_SPEED: Record<Fit, number> = { full: 1.0, partial: 0.8, poor: 0.6 };

export interface Method {
  id: string;
  name: string;
  pinyin: string;
  hanzi: string;
  /** Where it comes from, for the tooltip. */
  source: string;
  /** The ladder it climbs: a qi method, a tempering art (body) or a nourishing art (soul). */
  ladder: LadderId;
  /** A tempering or nourishing art may carry an element; its hours then match that element. */
  element?: Element;
  kind: 'common' | 'special';
  /** Fit for every root kind not listed in `fitBy`. Body and soul ignore the root. */
  fit: Fit;
  fitBy: Partial<Record<RootKind, Fit>>;
  /** Only a rare method can carry a breakthrough to the heavenly grade. */
  rare: boolean;
}

/** Common methods fit every root fully, except mutated roots, which they fit poorly. */
const common = { kind: 'common', fit: 'full', fitBy: { mutated: 'poor' }, rare: false } as const;

export const METHODS: readonly Method[] = [
  {
    id: 'garrison-standard',
    name: 'Garrison Standard Method',
    pinyin: 'Junzhen Tongfa',
    hanzi: '军镇通法',
    source: "the March's garrison school, for the cave orphan who goes along",
    ladder: 'qi',
    ...common,
  },
  {
    id: 'crude-cave',
    name: 'Crude Cave Method',
    pinyin: 'Kuxue Cufa',
    hanzi: '窟穴粗法',
    source: 'the cave clans of the Kingdom of Stone Eyes, for the orphan they hide',
    ladder: 'qi',
    ...common,
  },
  {
    id: 'cadet-spear',
    name: 'Cadet Spear Method',
    pinyin: 'Xueqiang Fa',
    hanzi: '学枪法',
    source: "the Gongsun garrison's cadet school on the Wall of Piled Bones",
    ladder: 'qi',
    ...common,
  },
  {
    id: 'butcher-saber',
    name: 'Beast-Butcher Saber Method',
    pinyin: 'Tushou Daofa',
    hanzi: '屠兽刀法',
    source: "the Beast-Butcher Gate's outer disciples",
    ladder: 'qi',
    ...common,
  },
  {
    id: 'night-bridge',
    name: 'Night Bridge Breathing Method',
    pinyin: 'Yeqiao Tuna Fa',
    hanzi: '夜桥吐纳法',
    source: 'the Night Bridge Society, for the deserter it smuggles out',
    ladder: 'qi',
    ...common,
  },
  {
    id: 'bounty-scrap',
    name: 'Bounty Office Scrap Manual',
    pinyin: 'Shangbang Canjuan',
    hanzi: '赏榜残卷',
    source: 'a torn manual taken as pay at the bounty office in the City of the Guarded Mouth',
    ladder: 'qi',
    ...common,
  },
  // The first arts, for P1.7's errand card and the later card after it. Drafted for Jan's review.
  {
    id: 'stone-bearing',
    name: 'Stone-Bearing Tempering Art',
    pinyin: 'Fushi Duanti Jue',
    hanzi: '负石锻体诀',
    source:
      'the porters and wall crews of the Border Wilds, who temper themselves hauling stone; an earth art',
    ladder: 'body',
    element: 'earth',
    ...common,
  },
  {
    id: 'still-lantern',
    name: 'Still Lantern Nourishing Art',
    pinyin: 'Jingdeng Yangshen Jue',
    hanzi: '静灯养神诀',
    source: "the frontier shrines' lamp-keepers, who sit with one flame until the mind is as still",
    ladder: 'soul',
    ...common,
  },
];

const byId = new Map(METHODS.map((m) => [m.id, m]));

export function method(id: string): Method {
  const m = byId.get(id);
  if (!m) throw new RangeError(`Unknown method ${id}`);
  return m;
}

export function hasMethod(id: string): boolean {
  return byId.has(id);
}

export function methodFit(m: Method, kind: RootKind): Fit {
  return m.fitBy[kind] ?? m.fit;
}

/** The common tempering and nourishing arts the first hour's cards hand out (P1.7). */
export const FIRST_ARTS = { body: 'stone-bearing', soul: 'still-lantern' } as const;
