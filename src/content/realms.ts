// The nine major realms, lowest first (design § Cultivation): stages, lifespans, gates, the realm
// curve, insight thresholds, step sizes and breakthrough odds. Every number is a starting value
// the pacing sim tunes. Lifespans past Nascent Soul and every number past Foundation are
// placeholders until those realms are designed.
import { ordinal } from './words.ts';

/**
 * The realm curve: how much more power, qi, income and price a realm carries than the one below
 * (design § Combat and § Economy): about 9x into Foundation, 30x into Core Formation and 100x
 * from Nascent Soul up.
 */
const CURVE = [1, 9, 30, 100, 100, 100, 100, 100, 100] as const;

/** Bar sizes in qi units at Qi Condensation scale; the realm curve multiplies them. */
const QC_STEPS = [50, 100, 165, 260, 345, 455, 595, 780, 1200];
const HIGH_STEPS = [1300, 1700, 2200, 2800];

export const REALMS = [
  {
    id: 'qi-condensation',
    name: 'Qi Condensation',
    hanzi: '炼气',
    stages: 9,
    lifespan: 120,
    /**
     * The item each path's major into this realm lays, when that major raises your realm, or null
     * (design § Cultivation, Offerings). Body and soul share the Core-Forming Pill until M4.
     */
    gates: { qi: null, body: null, soul: null },
    gate: 'none: the tutorial',
    /** The size step into this realm (design § Combat, Realms are sizes): 1 at the foot. */
    step: 1,
    /** Insight ever earned that a major breakthrough into this realm needs. */
    insightThreshold: 0,
    /** Insight per day of study at this realm; higher realms understand more per day. */
    insightRate: 1,
    /** steps[k - 1] is the bar that stage k fills; the last one is the major breakthrough out. */
    steps: QC_STEPS,
    /** minorOdds[k - 1] is the base chance to break into stage k from a full bar. */
    minorOdds: [1, 1, 0.75, 0.72, 0.7, 0.68, 0.66, 0.64, 0.62],
    /** The base chance of the major breakthrough into this realm. */
    majorOdds: 1,
  },
  {
    id: 'foundation-establishment',
    name: 'Foundation Establishment',
    hanzi: '筑基',
    stages: 4,
    lifespan: 200,
    gates: { qi: 'foundation-pill', body: 'marrow-washing-pill', soul: 'soul-condensing-pill' },
    gate: 'a Foundation Pill',
    step: 3.1,
    insightThreshold: 500,
    insightRate: 3,
    steps: HIGH_STEPS,
    minorOdds: [1, 0.6, 0.58, 0.55],
    majorOdds: 0.55,
  },
  {
    id: 'core-formation',
    name: 'Core Formation',
    hanzi: '结丹',
    stages: 4,
    lifespan: 500,
    gates: { qi: 'core-forming-pill', body: 'core-forming-pill', soul: 'core-forming-pill' },
    gate: 'a core-forming pill',
    step: 4.6,
    insightThreshold: 4_000,
    insightRate: 9,
    steps: HIGH_STEPS,
    minorOdds: [1, 0.58, 0.55, 0.52],
    majorOdds: 0.45,
  },
  {
    id: 'nascent-soul',
    name: 'Nascent Soul',
    hanzi: '元婴',
    stages: 4,
    lifespan: 1000,
    gates: { qi: null, body: null, soul: null },
    gate: 'a 3-wave lightning tribulation and your first heart demon',
    step: 6.7,
    insightThreshold: 40_000,
    insightRate: 27,
    steps: HIGH_STEPS,
    minorOdds: [1, 0.55, 0.52, 0.5],
    majorOdds: 0.35,
  },
  {
    id: 'deity-transformation',
    name: 'Deity Transformation',
    hanzi: '化神',
    stages: 4,
    lifespan: 2000,
    gates: { qi: null, body: null, soul: null },
    gate: 'a longer tribulation and a stronger heart demon',
    step: 10,
    insightThreshold: 400_000,
    insightRate: 81,
    steps: HIGH_STEPS,
    minorOdds: [1, 0.55, 0.52, 0.5],
    majorOdds: 0.3,
  },
  {
    id: 'void-refinement',
    name: 'Void Refinement',
    hanzi: '炼虚',
    stages: 4,
    lifespan: 3000,
    gates: { qi: null, body: null, soul: null },
    gate: 'a longer tribulation and a stronger heart demon',
    step: 14,
    insightThreshold: 4_000_000,
    insightRate: 243,
    steps: HIGH_STEPS,
    minorOdds: [1, 0.55, 0.52, 0.5],
    majorOdds: 0.3,
  },
  {
    id: 'body-integration',
    name: 'Body Integration',
    hanzi: '合体',
    stages: 4,
    lifespan: 5000,
    gates: { qi: null, body: null, soul: null },
    gate: 'a longer tribulation and a stronger heart demon',
    step: 22,
    insightThreshold: 40_000_000,
    insightRate: 729,
    steps: HIGH_STEPS,
    minorOdds: [1, 0.55, 0.52, 0.5],
    majorOdds: 0.3,
  },
  {
    id: 'mahayana',
    name: 'Mahayana',
    hanzi: '大乘',
    stages: 4,
    lifespan: 8000,
    gates: { qi: null, body: null, soul: null },
    gate: 'a longer tribulation and a stronger heart demon',
    step: 31,
    insightThreshold: 400_000_000,
    insightRate: 2187,
    steps: HIGH_STEPS,
    minorOdds: [1, 0.55, 0.52, 0.5],
    majorOdds: 0.3,
  },
  {
    id: 'tribulation-transcendence',
    name: 'Tribulation Transcendence',
    hanzi: '渡劫',
    stages: 4,
    lifespan: 12000,
    gates: { qi: null, body: null, soul: null },
    gate: 'the last tribulation',
    step: 46,
    insightThreshold: 4_000_000_000,
    insightRate: 6561,
    steps: HIGH_STEPS,
    minorOdds: [1, 0.55, 0.52, 0.5],
    majorOdds: 0.3,
  },
] as const;

export type RealmId = (typeof REALMS)[number]['id'];
export type Realm = (typeof REALMS)[number];

export const REALM_IDS = REALMS.map((r) => r.id) as unknown as readonly [RealmId, ...RealmId[]];

const byName = new Map<string, RealmId>(REALMS.map((r) => [r.name, r.id]));
const byId = new Map<RealmId, Realm>(REALMS.map((r) => [r.id, r]));
const indexOf = new Map<RealmId, number>(REALMS.map((r, i) => [r.id, i]));

/** The realm id for an exact English realm name, such as "Core Formation". */
export function realmIdFromName(name: string): RealmId | undefined {
  return byName.get(name);
}

/** The realm with this id. */
export function realm(id: RealmId): Realm {
  const r = byId.get(id);
  if (!r) throw new RangeError(`Unknown realm ${id}`);
  return r;
}

/** 0 for Qi Condensation, 1 for Foundation, and so on. */
export function realmIndex(id: RealmId): number {
  const i = indexOf.get(id);
  if (i === undefined) throw new RangeError(`Unknown realm ${id}`);
  return i;
}

/** The realm above, or null at the top. */
export function nextRealm(id: RealmId): Realm | null {
  return REALMS[realmIndex(id) + 1] ?? null;
}

/**
 * The realm curve, cumulative: 1 at Qi Condensation, 9 at Foundation, 270 at Core Formation.
 * Qi needs, qi gained per day and income all scale by it, so a low-grade stone is worth a ninth
 * as much at Foundation.
 */
export function realmScale(id: RealmId): number {
  let scale = 1;
  for (let i = 1; i <= realmIndex(id); i++) scale *= CURVE[i] ?? 1;
  return scale;
}

/** The bar a ladder at this realm and stage fills before its next breakthrough, in qi units. */
export function stepSize(id: RealmId, stage: number): number {
  const r = realm(id);
  const units = r.steps[Math.min(stage, r.stages) - 1] ?? r.steps[r.steps.length - 1]!;
  return units * realmScale(id);
}

/** The sheet's size at Qi Condensation layer 1: every line of a fresh cultivator starts here. */
export const SIZE_BASE = 10;
/** A realm's stages climb to this share of the step out of it, so a peak sits just under the next realm. */
export const SPREAD_SHARE = 0.8;

/** The size of this realm's first stage: 10 at Qi Condensation, 31 at Foundation, 143 at Core Formation. */
export function realmSize(id: RealmId): number {
  let size = SIZE_BASE;
  for (let i = 1; i <= realmIndex(id); i++) size *= REALMS[i]!.step;
  return size;
}

/** The step out of a realm: ×3.1 at Qi Condensation, ×4.6 at Foundation; the top realm repeats its own. */
export function stepOut(id: RealmId): number {
  const i = realmIndex(id);
  return (REALMS[i + 1] ?? REALMS[i]!).step;
}

/** The step out of a thing's own tier, which its rarity band is measured in: ×3.1 at tier 1, ×4.6 at tier 2. */
export function tierStep(tier: number): number {
  return stepOut(tierRealm(tier).id);
}

/** The realm a tier belongs to: tier 1 is Qi Condensation. */
export function tierRealm(tier: number): Realm {
  return REALMS[Math.min(Math.max(tier, 1), REALMS.length) - 1]!;
}

/** How far a realm's stages climb, first stage to peak: the step out of it to SPREAD_SHARE. */
export function realmSpread(id: RealmId): number {
  return stepOut(id) ** SPREAD_SHARE;
}

/**
 * The stages a ladder climbs inside a realm, each by a breakthrough: layers 2–9 at Qi
 * Condensation, since a life starts at layer 1, and every stage of the realms above.
 */
export function climbsIn(id: RealmId): number {
  return id === 'qi-condensation' ? realm(id).stages - 1 : realm(id).stages;
}

const STAGE_NAMES = ['early', 'middle', 'late', 'peak'] as const;

/** "third layer" at Qi Condensation, "middle" stage above it: words, never numerals. Stages count from 1. */
export function stageName(id: RealmId, stage: number): string {
  if (id === 'qi-condensation') return `${ordinal(stage)} layer`;
  return STAGE_NAMES[stage - 1] ?? `stage ${stage}`;
}
