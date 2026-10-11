// The nine major realms, lowest first, with their stages and lifespans (design § Cultivation).
// Lifespans past Nascent Soul are placeholders for "2,000 and up". P1.2 adds gates and the curve.
export const REALMS = [
  { id: 'qi-condensation', name: 'Qi Condensation', stages: 9, lifespan: 120 },
  { id: 'foundation-establishment', name: 'Foundation Establishment', stages: 4, lifespan: 200 },
  { id: 'core-formation', name: 'Core Formation', stages: 4, lifespan: 500 },
  { id: 'nascent-soul', name: 'Nascent Soul', stages: 4, lifespan: 1000 },
  { id: 'deity-transformation', name: 'Deity Transformation', stages: 4, lifespan: 2000 },
  { id: 'void-refinement', name: 'Void Refinement', stages: 4, lifespan: 3000 },
  { id: 'body-integration', name: 'Body Integration', stages: 4, lifespan: 5000 },
  { id: 'mahayana', name: 'Mahayana', stages: 4, lifespan: 8000 },
  {
    id: 'tribulation-transcendence',
    name: 'Tribulation Transcendence',
    stages: 4,
    lifespan: 12000,
  },
] as const;

export type RealmId = (typeof REALMS)[number]['id'];
export type Realm = (typeof REALMS)[number];

export const REALM_IDS = REALMS.map((r) => r.id) as unknown as readonly [RealmId, ...RealmId[]];

const byName = new Map<string, RealmId>(REALMS.map((r) => [r.name, r.id]));
const byId = new Map<RealmId, Realm>(REALMS.map((r) => [r.id, r]));

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

const STAGE_NAMES = ['early', 'middle', 'late', 'peak'] as const;

/** "layer 3" at Qi Condensation, "middle" stage above it. Stages count from 1. */
export function stageName(id: RealmId, stage: number): string {
  if (id === 'qi-condensation') return `layer ${stage}`;
  return STAGE_NAMES[stage - 1] ?? `stage ${stage}`;
}
