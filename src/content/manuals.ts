// Manuals are nodes the world gives you (design § Cultivation, Manuals): trees are yours and grow
// by realm; manuals are found, bought, inherited, written or stolen. One mechanical kind with a
// `nodes` list; the fiction supplies the size and the name: a Formula is one or two nodes, a Style
// bundles craft nodes, an Art is a technique and its nodes, a Method a ladder and its nodes, a
// Scripture a big bundle of gold or better, an Inheritance a whole tree. Manual nodes cost insight like
// any node and stack without limit: small effects add, and multipliers come only from purple up.
// Manuals and trees never unlock each other: a manual's nodes grow only from its own nodes.
// A loose manual's nodes unseal as its ladder reaches their tier; a method's nodes unseal by the
// method's mastery instead, and its manual is held while the method is known.
// White to blue manuals are generated from an effect table from D4 on; these are written by hand.
// Drafted in P1.10 for Jan's review; the Arts in P2.5.
//
// Where manuals live (design § Cultivation, D2.2): every manual names a host tree and the Trees
// screen draws it grafted beside that tree, joined to none of its nodes. A Method's host is its
// ladder's tree, an Art's its technique's first Dao, a Formula's the tree its effects touch; a
// manual with none stands under the Manuals category on its own.
import type { LadderId } from './cultivation.ts';
import { COMBAT_DAO_IDS, DAO_STAT_KINDS } from './daos.ts';
import { method } from './methods.ts';
import type { RarityId } from './rarity.ts';
import type { Effect, StatId } from './stats.ts';
import { technique } from './techniques.ts';
import { BIG_THREE, TREES } from './trees/index.ts';

export const MANUAL_KINDS = {
  formula: { name: 'Formula', plural: 'Formulas', hanzi: '口诀', glyph: '诀' },
  method: { name: 'Method', plural: 'Methods', hanzi: '功法', glyph: '法' },
  art: { name: 'Art', plural: 'Arts', hanzi: '术', glyph: '术' },
  style: { name: 'Style', plural: 'Styles', hanzi: '流', glyph: '流' },
  scripture: { name: 'Scripture', plural: 'Scriptures', hanzi: '经', glyph: '经' },
  inheritance: { name: 'Inheritance', plural: 'Inheritances', hanzi: '传承', glyph: '承' },
} as const;
export type ManualKind = keyof typeof MANUAL_KINDS;
export const MANUAL_KIND_IDS = Object.keys(MANUAL_KINDS) as ManualKind[];

/** One node of a manual, learned with insight like a tree node, owned apart from any tree. */
export interface ManualNode {
  id: string;
  name: string;
  hanzi: string;
  /** Where the node lives: always a manual here, a tree for tree nodes (content/nodes.ts). */
  home: 'manual';
  /** The manual it belongs to. */
  manual: string;
  /** The realm that unseals it on the manual's ladder: 1 at Qi Condensation. */
  tier: number;
  kind: 'minor' | 'notable';
  cost: number;
  /** Nodes of the same manual that must be learned first. */
  requires: readonly string[];
  effects: readonly Effect[];
  /**
   * A method's or an Art's node unseals once the method or the technique reaches this mastery
   * level (1 is Comprehension).
   */
  mastery?: number;
  /**
   * An Art's passives on its technique alone (design § Cultivation, Where manuals live): its
   * power, qi cost and Accuracy (`ART_OWN_STATS`). `effects` are the cultivator's.
   */
  own?: readonly Effect[];
  /** Where it sits in its cluster, columns across and rows down; laid out from `requires` if unset. */
  at?: readonly [col: number, row: number];
  text: string;
}

export type ManualNodeDef = Omit<ManualNode, 'home' | 'manual'>;

export interface Manual {
  id: string;
  name: string;
  pinyin: string;
  hanzi: string;
  kind: ManualKind;
  rarity: RarityId;
  /** Where it comes from, for the tooltip. */
  source: string;
  /** The level that unseals a loose manual's nodes: qi unless it says otherwise. */
  ladder: LadderId;
  /** A method's own manual: the method it belongs to. Held whenever the method is known. */
  method?: string;
  /** An Art: the technique it is built on. Held whenever the technique is known. */
  technique?: string;
  /** The tree it grafts beside, by tree id, or null for one that stands under Manuals alone. */
  host: string | null;
  /** The tier band it grafts into: a Method's or an Art's own tier, else its first node's. */
  tier: number;
  nodes: readonly ManualNode[];
}

type ManualDef = Omit<Manual, 'nodes' | 'ladder' | 'host' | 'tier'> & {
  ladder?: LadderId;
  /** Authored manuals name it; a generated one leaves it out and takes its first effect's. */
  host?: string | null;
  tier?: number;
  nodes: readonly ManualNodeDef[];
};

/** The stats an Art's passive may put on its technique alone. */
export const ART_OWN_STATS: readonly StatId[] = ['techniquePower', 'techniqueCost', 'hit'];

/** How many passives an Art holds by rarity: 1, 1, 2, 3, 4, 5, 6 from white to pristine. */
export const ART_NODES: Record<RarityId, number> = {
  gray: 1,
  white: 1,
  green: 1,
  blue: 2,
  purple: 3,
  gold: 4,
  red: 5,
  pristine: 6,
};

/**
 * The mastery level the ith of an Art's `count` passives wakes at: Comprehension, Mastery,
 * Perfection and Origin in turn, and past four the extras share a level from the bottom up, so
 * five wake at 1, 1, 2, 3, 4 and six at 1, 1, 2, 2, 3, 4.
 */
export function artWake(i: number, count: number): number {
  const extras = Math.max(0, count - 4);
  const levels = [1, 2, 3, 4].flatMap((l) => (l <= extras ? [l, l] : [l]));
  return levels[Math.min(i, levels.length - 1)]!;
}

const daoStats = new Map<string, string>(
  COMBAT_DAO_IDS.flatMap((d) => DAO_STAT_KINDS.map((k) => [`${d}${k}`, d] as const)),
);
const bigThree = new Set(BIG_THREE.map((t) => t.id));

/**
 * The tree a stat belongs to, for a generated manual's host: a Dao's own stat (firePower) to that
 * Dao; any other to the tree whose nodes use it most, the big three first on a tie; null when no
 * tree uses it.
 */
export function statHost(stat: StatId): string | null {
  const own = daoStats.get(stat);
  if (own) return own;
  let best: string | null = null;
  let most = 0;
  for (const t of TREES) {
    const uses = t.nodes.filter((n) => n.effects.some((e) => e.stat === stat)).length;
    const tieWin = uses === most && uses > 0 && bigThree.has(t.id) && !bigThree.has(best ?? '');
    if (uses > most || tieWin) {
      best = t.id;
      most = uses;
    }
  }
  return best;
}

/** A generated manual's host: its first effect's stat's tree. */
export function hostFromEffects(
  nodes: readonly Pick<ManualNodeDef, 'effects' | 'own'>[],
): string | null {
  const first = nodes[0]?.effects[0] ?? nodes[0]?.own?.[0];
  return first ? statHost(first.stat) : null;
}

function defineManual(m: ManualDef): Manual {
  return {
    ...m,
    ladder: m.ladder ?? 'qi',
    host: m.host !== undefined ? m.host : hostFromEffects(m.nodes),
    tier: m.tier ?? Math.min(...m.nodes.map((n) => n.tier)),
    nodes: m.nodes.map((n) => ({ ...n, home: 'manual', manual: m.id })),
  };
}

/** A method's own manual: its name, rarity and source are the method's. */
function forMethod(id: string, nodes: readonly ManualNodeDef[]): Manual {
  const m = method(id);
  const { name, pinyin, hanzi, rarity, source, ladder, tier } = m;
  return defineManual({
    id,
    method: id,
    name,
    pinyin,
    hanzi,
    rarity,
    source,
    ladder,
    host: ladder,
    tier,
    kind: 'method',
    nodes,
  });
}

/** An Art's passive as its list writes it: the tier and the wake level come from the technique. */
type ArtNodeDef = Omit<ManualNodeDef, 'tier' | 'mastery'>;

/**
 * A technique's Art: the technique on its name plate, never a node, and its passives, which wake
 * as the technique masters (`artWake`). It grafts beside the technique's first Dao when that Dao
 * has a tree, and stands under Manuals alone while it has none (Wind, Lightning, Ice).
 */
function forTechnique(id: string, nodes: readonly ArtNodeDef[]): Manual {
  const t = technique(id);
  const first = t.daos[0];
  return defineManual({
    id: `art-${id}`,
    technique: id,
    name: t.name,
    pinyin: t.pinyin,
    hanzi: t.hanzi,
    rarity: t.rarity,
    source: t.source,
    ladder: t.ladder,
    host: first && TREES.some((tr) => tr.id === first) ? first : null,
    tier: t.tier,
    kind: 'art',
    nodes: nodes.map((n, i) => ({ ...n, tier: t.tier, mastery: artWake(i, nodes.length) })),
  });
}

/** A method's node, unsealed at a mastery level: 1 is Comprehension, 2 Mastery. */
const at = (mastery: number) => ({ tier: 1, mastery });

export const MANUALS: readonly Manual[] = [
  // ------------------------------------------------------------ loose formulas
  defineManual({
    id: 'garrison-breath-count',
    host: 'qi',
    name: 'Garrison Breath-Count',
    pinyin: 'Junzhong Shuxi Jue',
    hanzi: '军中数息诀',
    kind: 'formula',
    rarity: 'white',
    source:
      "the March of Pacified Borders' drill yards, where sergeants count cadets' breaths aloud",
    nodes: [
      {
        id: 'man-count-of-nine',
        name: 'The Count of Nine',
        hanzi: '九数',
        tier: 1,
        kind: 'minor',
        cost: 25,
        requires: [],
        effects: [{ stat: 'qiGain', value: 0.05 }],
        text: 'In on four, hold for one, out on four; a sergeant’s count that every cadet hears in their sleep.',
      },
    ],
  }),
  defineManual({
    id: 'stone-eyes-lamp',
    host: 'soul',
    name: 'Stone Eyes Lamp Formula',
    pinyin: 'Shiyan Deng Jue',
    hanzi: '石眼灯诀',
    kind: 'formula',
    rarity: 'white',
    source: 'the cave clans of the Kingdom of Stone Eyes, who read by one lamp for a whole tunnel',
    nodes: [
      {
        id: 'man-one-lamp',
        name: 'One Lamp, Many Readers',
        hanzi: '一灯',
        tier: 1,
        kind: 'minor',
        cost: 25,
        requires: [],
        effects: [{ stat: 'insightGain', value: 0.04 }],
        text: 'Read a line, close your eyes, and see it again before the oil runs out.',
      },
    ],
  }),
  defineManual({
    id: 'butcher-sinew',
    host: 'body',
    name: 'Beast-Butcher Sinew Formula',
    pinyin: 'Tushou Jin Jue',
    hanzi: '屠兽筋诀',
    kind: 'formula',
    rarity: 'white',
    source: "the Beast-Butcher Gate's flaying yards, chanted while hauling carcasses",
    nodes: [
      {
        id: 'man-hauling-chant',
        name: 'The Hauling Chant',
        hanzi: '拖尸号',
        tier: 1,
        kind: 'minor',
        cost: 25,
        requires: [],
        effects: [{ stat: 'bodyGain', value: 0.05 }],
        text: 'Pull on the breath out, rest on the breath in, and the sinews learn the weight.',
      },
    ],
  }),
  defineManual({
    id: 'bone-wall-watch',
    host: 'qi',
    name: 'Bone Wall Watch Formula',
    pinyin: 'Duigu Shou Jue',
    hanzi: '堆骨守诀',
    kind: 'formula',
    rarity: 'white',
    source: 'the watchmen of the Wall of Piled Bones, who sit a whole night without a lamp',
    nodes: [
      {
        id: 'man-night-watch',
        name: 'Sitting the Night Watch',
        hanzi: '坐夜',
        tier: 1,
        kind: 'minor',
        cost: 20,
        requires: [],
        effects: [{ stat: 'minorOdds', value: 0.01 }],
        text: 'Wait without waiting: the layer gives when you stop leaning on it.',
      },
      {
        id: 'man-cold-dawn',
        name: 'Cold Dawn, Warm Blood',
        hanzi: '寒晓',
        tier: 1,
        kind: 'minor',
        cost: 30,
        requires: ['man-night-watch'],
        effects: [{ stat: 'setbackTime', value: -0.05 }],
        text: 'A watchman who froze at his post still stands up at dawn. So do you.',
      },
    ],
  }),
  defineManual({
    id: 'tide-counting',
    host: 'qi',
    name: 'Tide-Counting Formula',
    pinyin: 'Shoukou Shuchao Jue',
    hanzi: '守口数潮诀',
    kind: 'formula',
    rarity: 'blue',
    source:
      "the river docks of the City of the Guarded Mouth, copied for the bounty office's couriers",
    nodes: [
      {
        id: 'man-counting-tide',
        name: 'Counting the Tide',
        hanzi: '数潮',
        tier: 1,
        kind: 'minor',
        cost: 40,
        requires: [],
        effects: [{ stat: 'qiGain', value: 0.06 }],
        text: 'The river breathes twice a day; a courier who breathes with it never tires on the towpath.',
      },
      {
        id: 'man-slack-water',
        name: 'Holding the Slack Water',
        hanzi: '平水',
        tier: 1,
        kind: 'notable',
        cost: 80,
        requires: ['man-counting-tide'],
        effects: [
          { stat: 'focusDrain', value: -0.2 },
          { stat: 'heatLimit', value: 0.2 },
        ],
        text: 'Between the tides the river stops; so does the heat in you, if you let it.',
      },
    ],
  }),

  // ------------------------------------------------------------ the origins' methods
  // Each starting method carries one or two nodes, unsealed as the method's mastery grows.
  forMethod('garrison-standard', [
    {
      id: 'man-garrison-cadence',
      name: 'Barracks Cadence',
      hanzi: '营律',
      ...at(1),
      kind: 'minor',
      cost: 20,
      requires: [],
      effects: [{ stat: 'qiGain', value: 0.03 }],
      text: 'The method’s count sinks below thought; you circulate the way you march.',
    },
    {
      id: 'man-watch-fire',
      name: 'Watch-Fire Stillness',
      hanzi: '守火',
      ...at(2),
      kind: 'minor',
      cost: 45,
      requires: ['man-garrison-cadence'],
      effects: [{ stat: 'setbackTime', value: -0.05 }],
      text: 'A sentry who flinches at every spark is no sentry. Your qi stops flinching too.',
    },
  ]),
  forMethod('crude-cave', [
    {
      id: 'man-sinkhole-draft',
      name: 'Sinkhole Draft',
      hanzi: '窟风',
      ...at(1),
      kind: 'minor',
      cost: 20,
      requires: [],
      effects: [{ stat: 'qiGain', value: 0.03 }],
      text: 'Air moves through a sinkhole even on a still day. You learn to sit where it moves.',
    },
    {
      id: 'man-rock-patience',
      name: 'Rock Patience',
      hanzi: '石忍',
      ...at(2),
      kind: 'minor',
      cost: 45,
      requires: ['man-sinkhole-draft'],
      effects: [{ stat: 'failLoss', value: -0.05 }],
      text: 'What a failed breakthrough throws loose settles back like grit in a cave pool.',
    },
  ]),
  forMethod('cadet-spear', [
    {
      id: 'man-spear-line-breath',
      name: 'Breathing in the Line',
      hanzi: '列息',
      ...at(1),
      kind: 'minor',
      cost: 20,
      requires: [],
      effects: [{ stat: 'qiGain', value: 0.03 }],
      text: 'Twenty spears breathe as one, and you are one of the twenty.',
    },
    {
      id: 'man-drill-cadence',
      name: 'Drill Cadence',
      hanzi: '操律',
      ...at(2),
      kind: 'minor',
      cost: 45,
      requires: ['man-spear-line-breath'],
      effects: [{ stat: 'practiceGain', value: 0.05 }],
      text: 'Thrust on the breath out, every time, until the body does it alone.',
    },
  ]),
  forMethod('butcher-saber', [
    {
      id: 'man-blood-warm-breath',
      name: 'Blood-Warm Breath',
      hanzi: '温血息',
      ...at(1),
      kind: 'minor',
      cost: 20,
      requires: [],
      effects: [{ stat: 'qiGain', value: 0.03 }],
      text: 'Breathe while the carcass is warm; there is qi in the steam, if you are quick.',
    },
    {
      id: 'man-cleaver-rhythm',
      name: 'Cleaver Rhythm',
      hanzi: '刀律',
      ...at(2),
      kind: 'minor',
      cost: 45,
      requires: ['man-blood-warm-breath'],
      effects: [{ stat: 'bodyGain', value: 0.04 }],
      text: 'A cleaver that falls in time tires the arm less, and hardens it more.',
    },
  ]),
  forMethod('night-bridge', [
    {
      id: 'man-under-the-bridge',
      name: 'Breath Under the Bridge',
      hanzi: '桥下息',
      ...at(1),
      kind: 'minor',
      cost: 20,
      requires: [],
      effects: [{ stat: 'qiGain', value: 0.03 }],
      text: 'Smugglers wait for the patrol to pass without a sound. So does your breath.',
    },
    {
      id: 'man-lantern-out',
      name: 'Lantern-Out Calm',
      hanzi: '灭灯静',
      ...at(2),
      kind: 'minor',
      cost: 45,
      requires: ['man-under-the-bridge'],
      effects: [{ stat: 'focusDrain', value: -0.15 }],
      text: 'The lantern goes out and you keep still in the dark, as long as it takes.',
    },
  ]),
  forMethod('bounty-scrap', [
    {
      id: 'man-torn-page',
      name: 'The Torn Page',
      hanzi: '残页',
      ...at(1),
      kind: 'minor',
      cost: 25,
      requires: [],
      effects: [{ stat: 'qiGain', value: 0.04 }],
      text: 'Half a page, read until the missing half writes itself in your head.',
    },
  ]),

  // ------------------------------------------------------------ the techniques' Arts
  // Every technique has its Art (design § Cultivation, Where manuals live), given by any road that
  // teaches it. A white Art holds one passive, waking at the technique's Comprehension; `own`
  // effects land on the technique alone. Drafted in P2.5 for Jan's review.
  forTechnique('rampart-palm', [
    {
      id: 'art-shoulder-behind-palm',
      name: 'Shoulder Behind the Palm',
      hanzi: '掌后之肩',
      kind: 'minor',
      cost: 30,
      requires: [],
      effects: [],
      own: [{ stat: 'techniquePower', value: 0.08 }],
      text: 'The shove starts in the heel and leaves through the palm; the climber never sees the shoulder.',
    },
  ]),
  forTechnique('sinkhole-stone-fist', [
    {
      id: 'art-rock-underfoot',
      name: 'Rock Underfoot',
      hanzi: '足下石',
      kind: 'minor',
      cost: 30,
      requires: [],
      effects: [{ stat: 'hp', value: 0.03 }],
      text: 'Borrow the rock’s weight often enough and the body starts keeping some of it.',
    },
  ]),
  forTechnique('piled-bones-thrust', [
    {
      id: 'art-short-recovery',
      name: 'The Short Recovery',
      hanzi: '短收',
      kind: 'minor',
      cost: 30,
      requires: [],
      effects: [],
      own: [{ stat: 'techniqueCost', value: -0.12 }],
      text: 'Draw the spear back on the breath that drove it, and the next thrust starts half-made.',
    },
  ]),
  forTechnique('undertow-palm', [
    {
      id: 'art-river-give',
      name: 'The River’s Give',
      hanzi: '河让',
      kind: 'minor',
      cost: 30,
      requires: [],
      effects: [{ stat: 'evasion', value: 0.03 }],
      text: 'A current yields and is still there; a blow slides off you like a hand off wet stone.',
    },
  ]),
  forTechnique('bone-splitting-cleave', [
    {
      id: 'art-finding-joint',
      name: 'Finding the Joint',
      hanzi: '寻节',
      kind: 'minor',
      cost: 30,
      requires: [],
      effects: [],
      own: [{ stat: 'hit', value: 1 }],
      text: 'The eye goes to the joint before the cleaver does, on a carcass or a man.',
    },
  ]),
  forTechnique('alley-wind-palm', [
    {
      id: 'art-running-draft',
      name: 'Running the Draft',
      hanzi: '乘巷风',
      kind: 'minor',
      cost: 30,
      requires: [],
      effects: [{ stat: 'agility', value: 1 }],
      text: 'A hundred errands at a run down narrow streets; the legs remember where the draft goes.',
    },
  ]),
  forTechnique('rampart-collapse-palm', [
    {
      id: 'art-whole-wall',
      name: 'The Whole Wall Behind It',
      hanzi: '全垣之重',
      kind: 'minor',
      cost: 150,
      requires: [],
      effects: [],
      own: [{ stat: 'techniquePower', value: 0.1 }],
      text: 'An officer who has held a stretch of wall for years leans all of it into one palm.',
    },
  ]),
];

const byId = new Map(MANUALS.map((m) => [m.id, m]));
const byMethod = new Map(MANUALS.filter((m) => m.method).map((m) => [m.method!, m]));
const byTechnique = new Map(MANUALS.filter((m) => m.technique).map((m) => [m.technique!, m]));

export function hasManual(id: string): boolean {
  return byId.has(id);
}

export function manual(id: string): Manual {
  const m = byId.get(id);
  if (!m) throw new RangeError(`Unknown manual ${id}`);
  return m;
}

/** A method's own manual, if it carries nodes. */
export function methodManual(methodId: string): Manual | undefined {
  return byMethod.get(methodId);
}

/** A technique's Art, if it has one written. */
export function techniqueArt(techniqueId: string): Manual | undefined {
  return byTechnique.get(techniqueId);
}
