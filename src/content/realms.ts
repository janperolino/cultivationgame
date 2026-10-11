// The nine major realms, lowest first. P1.2 adds stages, lifespans and gates.
export const REALMS = [
  { id: 'qi-condensation', name: 'Qi Condensation' },
  { id: 'foundation-establishment', name: 'Foundation Establishment' },
  { id: 'core-formation', name: 'Core Formation' },
  { id: 'nascent-soul', name: 'Nascent Soul' },
  { id: 'deity-transformation', name: 'Deity Transformation' },
  { id: 'void-refinement', name: 'Void Refinement' },
  { id: 'body-integration', name: 'Body Integration' },
  { id: 'mahayana', name: 'Mahayana' },
  { id: 'tribulation-transcendence', name: 'Tribulation Transcendence' },
] as const;

export type RealmId = (typeof REALMS)[number]['id'];

export const REALM_IDS = REALMS.map((r) => r.id) as unknown as readonly [RealmId, ...RealmId[]];

const byName = new Map<string, RealmId>(REALMS.map((r) => [r.name, r.id]));

/** The realm id for an exact English realm name, such as "Core Formation". */
export function realmIdFromName(name: string): RealmId | undefined {
  return byName.get(name);
}
