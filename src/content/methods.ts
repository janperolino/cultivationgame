// Cultivation methods: the manuals you cultivate qi with (design § Cultivation). These are the
// common ones the Border Wilds origins hand out (design § Character creation). A new method is
// an entry here, not new code.
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
  kind: 'common' | 'special';
  /** Fit for every root kind not listed in `fitBy`. */
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
    ...common,
  },
  {
    id: 'crude-cave',
    name: 'Crude Cave Method',
    pinyin: 'Kuxue Cufa',
    hanzi: '窟穴粗法',
    source: 'the cave clans of the Kingdom of Stone Eyes, for the orphan they hide',
    ...common,
  },
  {
    id: 'cadet-spear',
    name: 'Cadet Spear Method',
    pinyin: 'Xueqiang Fa',
    hanzi: '学枪法',
    source: "the Gongsun garrison's cadet school on the Wall of Piled Bones",
    ...common,
  },
  {
    id: 'butcher-saber',
    name: 'Beast-Butcher Saber Method',
    pinyin: 'Tushou Daofa',
    hanzi: '屠兽刀法',
    source: "the Beast-Butcher Gate's outer disciples",
    ...common,
  },
  {
    id: 'night-bridge',
    name: 'Night Bridge Breathing Method',
    pinyin: 'Yeqiao Tuna Fa',
    hanzi: '夜桥吐纳法',
    source: 'the Night Bridge Society, for the deserter it smuggles out',
    ...common,
  },
  {
    id: 'bounty-scrap',
    name: 'Bounty Office Scrap Manual',
    pinyin: 'Shangbang Canjuan',
    hanzi: '赏榜残卷',
    source: 'a torn manual taken as pay at the bounty office in the City of the Guarded Mouth',
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
