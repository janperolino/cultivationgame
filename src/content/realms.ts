// The nine major realms, lowest first (design § Cultivation): stages, lifespans, gates, the realm
// curve, insight thresholds, step sizes and breakthrough odds. Every number is a starting value
// the pacing sim tunes. Lifespans past Nascent Soul and every number past Foundation are
// placeholders until those realms are designed.

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
    /** The item a major breakthrough into this realm uses up, or null. */
    gateItem: null,
    gate: 'none: the tutorial',
    /** The damage step b for crossing into this realm (design § Combat). */
    breakStep: 1,
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
    gateItem: 'foundation-pill',
    gate: 'a Foundation Pill',
    breakStep: 1.75,
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
    gateItem: 'core-forming-pill',
    gate: 'a core-forming pill',
    breakStep: 3.2,
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
    gateItem: null,
    gate: 'a 3-wave lightning tribulation and your first heart demon',
    breakStep: 5.8,
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
    gateItem: null,
    gate: 'a longer tribulation and a stronger heart demon',
    breakStep: 5.8,
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
    gateItem: null,
    gate: 'a longer tribulation and a stronger heart demon',
    breakStep: 5.8,
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
    gateItem: null,
    gate: 'a longer tribulation and a stronger heart demon',
    breakStep: 5.8,
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
    gateItem: null,
    gate: 'a longer tribulation and a stronger heart demon',
    breakStep: 5.8,
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
    gateItem: null,
    gate: 'the last tribulation',
    breakStep: 5.8,
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

const STAGE_NAMES = ['early', 'middle', 'late', 'peak'] as const;

/** "layer 3" at Qi Condensation, "middle" stage above it. Stages count from 1. */
export function stageName(id: RealmId, stage: number): string {
  if (id === 'qi-condensation') return `layer ${stage}`;
  return STAGE_NAMES[stage - 1] ?? `stage ${stage}`;
}
