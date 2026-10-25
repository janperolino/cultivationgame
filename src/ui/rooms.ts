// What A6.1's rooms read beyond the counters (docs/mockups/place-rooms-study.html, Jan's calls in
// its talk): a trading hall's floor by department, only those holding lots this month (more lots
// is a stock rule, in Open questions), and what dresses a craft shop's side from its own shelf,
// the furnace's batch, the refiner's racks and the talisman wall. No React here.
import { COPY_FORM_WORDS, copyForm, copyItem, copyTitle, hasCopy } from '../content/copies.ts';
import { hasItem, item, type ItemKind } from '../content/items.ts';
import { shelf, type StockLot } from '../core/shops.ts';
import type { GameState } from '../core/state.ts';

export type DepartmentId =
  | 'all'
  | 'pills'
  | 'talismans'
  | 'arms'
  | 'materials'
  | 'herbs'
  | 'treasures'
  | 'slips'
  | 'mounts'
  | 'imports';

/** A trading hall's departments, in the floor's order, and the kinds each holds. */
export const DEPARTMENTS: readonly {
  id: DepartmentId;
  name: string;
  kinds: readonly ItemKind[];
}[] = [
  { id: 'pills', name: 'Pills', kinds: ['pill'] },
  { id: 'talismans', name: 'Talismans', kinds: ['talisman', 'array'] },
  { id: 'arms', name: 'Arms and armour', kinds: ['gear'] },
  { id: 'materials', name: 'Materials', kinds: ['material', 'beast-part', 'vessel'] },
  { id: 'herbs', name: 'Herbs', kinds: ['herb', 'seed'] },
  { id: 'treasures', name: 'Treasures', kinds: ['treasure'] },
  { id: 'slips', name: 'Slips and maps', kinds: ['manual', 'map'] },
  { id: 'mounts', name: 'Mounts and gear', kinds: ['mount', 'tool', 'beast'] },
];

/** The kind a lot's thing is: a copy is a slip. */
function kindOf(thing: string): ItemKind | null {
  if (hasCopy(thing)) return 'manual';
  return hasItem(thing) ? (item(thing).kind ?? null) : null;
}

/** Whether a lot stands in a department. */
export function inDepartment(
  thing: string,
  dept: DepartmentId,
  imported: (thing: string) => boolean,
): boolean {
  if (dept === 'all') return true;
  if (dept === 'imports') return imported(thing);
  const k = kindOf(thing);
  return !!k && !!DEPARTMENTS.find((d) => d.id === dept)?.kinds.includes(k);
}

/** The floor's tabs this month: All, then each department holding a lot, then Imports 舶. */
export function departmentsOf(
  lots: readonly StockLot[],
  imported: (thing: string) => boolean,
): { id: DepartmentId; name: string; n: number }[] {
  const out = [{ id: 'all' as DepartmentId, name: 'All', n: lots.length }];
  for (const d of DEPARTMENTS) {
    const n = lots.filter((l) => inDepartment(l.thing, d.id, imported)).length;
    if (n > 0) out.push({ id: d.id, name: d.name, n });
  }
  const im = lots.filter((l) => imported(l.thing)).length;
  if (im > 0) out.push({ id: 'imports', name: 'Imports 舶', n: im });
  return out;
}

/** A craft shop's side, from its own shelf this month: the lots of the kinds it makes. */
export function craftShelf(s: GameState, shopId: string, kinds: readonly ItemKind[]): StockLot[] {
  return shelf(s, s.player.id, shopId).filter((l) => {
    const k = kindOf(l.thing);
    return !!k && kinds.includes(k);
  });
}

/** A thing's name and rarity, a copy or an item. */
export function ware(thing: string): { name: string; rarity: string; sub: string } {
  if (hasCopy(thing)) {
    const it = copyItem(thing);
    const title = copyTitle(thing);
    // A book at tier 1, a jade slip from tier 2 (E3, Methods in the market).
    const sub = COPY_FORM_WORDS[copyForm(thing)];
    return { name: title[0]!.toUpperCase() + title.slice(1), rarity: it.rarity, sub };
  }
  const it = item(thing);
  return { name: it.name, rarity: it.rarity, sub: `tier ${it.tier}` };
}
