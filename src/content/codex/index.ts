// The codex (design § UI and screens, The journal 志): every entry, one a row of
// `docs/features.md`, in the areas' order. Drafted 2026-10-20 for The opening, built, awaiting
// Jan's review; a phase that adds a feature the player touches adds its entry here.
import { BAG } from './bag.ts';
import { COMMISSIONS } from './commissions.ts';
import { CRAFTS } from './crafts.ts';
import { CULTIVATION } from './cultivation.ts';
import { DWELLINGS } from './dwellings.ts';
import { FORMATIONS } from './formations.ts';
import { FIGHTING } from './fighting.ts';
import { MAP } from './map.ts';
import { ORGANIZATIONS } from './organizations.ts';
import { PEOPLE } from './people.ts';
import { PLACES } from './places.ts';
import { REST } from './rest.ts';
import type { CodexEntry } from './schema.ts';
import { TREES } from './trees.ts';
import { UPKEEP } from './upkeep.ts';
import { WHEEL } from './wheel.ts';

export * from './schema.ts';
export { CODEX_SLOTS, fillSlots } from './slots.ts';

export const CODEX: readonly CodexEntry[] = [
  ...CULTIVATION,
  ...WHEEL,
  ...TREES,
  ...FIGHTING,
  ...BAG,
  ...MAP,
  ...PLACES,
  ...ORGANIZATIONS,
  ...PEOPLE,
  ...CRAFTS,
  ...DWELLINGS,
  ...FORMATIONS,
  ...UPKEEP,
  ...COMMISSIONS,
  ...REST,
];

const byId = new Map(CODEX.map((e) => [e.id, e]));

export function hasCodexEntry(id: string): boolean {
  return byId.has(id);
}

export function codexEntry(id: string): CodexEntry {
  const e = byId.get(id);
  if (!e) throw new RangeError(`No codex entry ${id}`);
  return e;
}
