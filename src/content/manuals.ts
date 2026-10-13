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
// Drafted in P1.10 for Jan's review.
import type { LadderId } from './cultivation.ts';
import { method } from './methods.ts';
import type { RarityId } from './rarity.ts';
import type { Effect } from './stats.ts';

export const MANUAL_KINDS = {
  formula: { name: 'Formula', plural: 'Formulas', hanzi: '口诀' },
  style: { name: 'Style', plural: 'Styles', hanzi: '流' },
  art: { name: 'Art', plural: 'Arts', hanzi: '术' },
  method: { name: 'Method', plural: 'Methods', hanzi: '功法' },
  scripture: { name: 'Scripture', plural: 'Scriptures', hanzi: '经' },
  inheritance: { name: 'Inheritance', plural: 'Inheritances', hanzi: '传承' },
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
  /** A method's node unseals once the method reaches this mastery level (1 is Comprehension). */
  mastery?: number;
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
  nodes: readonly ManualNode[];
}

type ManualDef = Omit<Manual, 'nodes' | 'ladder'> & {
  ladder?: LadderId;
  nodes: readonly ManualNodeDef[];
};

function defineManual(m: ManualDef): Manual {
  return {
    ...m,
    ladder: m.ladder ?? 'qi',
    nodes: m.nodes.map((n) => ({ ...n, home: 'manual', manual: m.id })),
  };
}

/** A method's own manual: its name, rarity and source are the method's. */
function forMethod(id: string, nodes: readonly ManualNodeDef[]): Manual {
  const m = method(id);
  const { name, pinyin, hanzi, rarity, source, ladder } = m;
  return defineManual({
    id,
    method: id,
    name,
    pinyin,
    hanzi,
    rarity,
    source,
    ladder,
    kind: 'method',
    nodes,
  });
}

/** A method's node, unsealed at a mastery level: 1 is Comprehension, 2 Mastery. */
const at = (mastery: number) => ({ tier: 1, mastery });

export const MANUALS: readonly Manual[] = [
  // ------------------------------------------------------------ loose formulas
  defineManual({
    id: 'garrison-breath-count',
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
];

const byId = new Map(MANUALS.map((m) => [m.id, m]));
const byMethod = new Map(MANUALS.filter((m) => m.method).map((m) => [m.method!, m]));

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
