// Gear and the Bag (design § Items and gear, § UI and screens): what a cultivator wears, how many
// squares they carry, and how an artifact bonds to them. The four gear squares hold a weapon, an
// armor, a ring and a pouch; treasure slots open from the Qi and Soul trees. A worn item leaves
// `items` for `gear` and goes back when taken off. Artifacts from blue up bond by use on the
// mastery scale: fight turns and stones fed in seclusion count, each level unlocks one property in
// the order the item lists them and eases the penalty for a weapon above your realm.
import {
  ABOVE_ACCURACY,
  ABOVE_QI,
  ABOVE_STEP_SHARE,
  BOND_FROM,
  BOND_MASTERY,
  BOND_PER_TURN,
  BOND_STONES_PER_DAY,
  PACK_SQUARES,
  SPIRIT_WAKES,
} from '../content/gear.ts';
import {
  hasItem,
  item,
  stackSize,
  type EquipSlot,
  type Item,
  type ItemProperty,
} from '../content/items.ts';
import { rarityAccuracy, rarityMultiplier, rarityRank } from '../content/rarity.ts';
import { realmIndex, tierStep } from '../content/realms.ts';
import type { Effect } from '../content/stats.ts';
import { masteryAt, type Mastery } from './mastery.ts';
import { tierScale } from './combat/sheet.ts';
import { pay, stonesOf, withStones } from './purse.ts';
import { realmOf, type Cultivator } from './state.ts';
import { ownTier } from './toxicity.ts';

export type GearCheck = { ok: true } | { ok: false; reason: string };

/** Every item worn, squares first, then the treasures. */
export function wornIds(c: Cultivator): string[] {
  const g = c.gear;
  return [g.weapon, g.armor, g.ring, g.pouch, ...g.treasures].filter(
    (id): id is string => id !== null && hasItem(id),
  );
}

// ---------------------------------------------------------------- bonding

/** Whether an item bonds to its owner: an artifact from blue up. */
export function bonds(it: Item): boolean {
  return rarityRank(it.rarity) >= rarityRank(BOND_FROM);
}

/** How far the bond with an item has come, Glimpse to Origin. */
export function bondMastery(c: Cultivator, id: string): Mastery {
  return masteryAt(BOND_MASTERY, item(id).tier, c.bonds[id] ?? 0);
}

/** Its properties that work for this owner: all of them below blue, one a bond level from blue up. */
export function activeProperties(c: Cultivator, it: Item): readonly ItemProperty[] {
  const all = it.properties ?? [];
  if (!bonds(it)) return all;
  return all.slice(0, bondMastery(c, it.id).level + 1);
}

/** Whether its artifact spirit is awake: from Perfection at gold and red, always at pristine. */
export function spiritAwake(c: Cultivator, it: Item): boolean {
  if (it.rarity === 'pristine') return true;
  if (it.rarity !== 'gold' && it.rarity !== 'red') return false;
  return bondMastery(c, it.id).level >= SPIRIT_WAKES;
}

/** Bond days added to each worn artifact from blue up: a fight's turns, or stones fed. */
export function addBond(c: Cultivator, ids: readonly string[], days: number): Cultivator {
  if (days <= 0) return c;
  const next = { ...c.bonds };
  let changed = false;
  for (const id of ids) {
    if (!hasItem(id) || !bonds(item(id))) continue;
    next[id] = (next[id] ?? 0) + days;
    changed = true;
  }
  return changed ? { ...c, bonds: next } : c;
}

/** Bond days a fight of this many turns adds to everything worn. */
export function bondFromFight(c: Cultivator, turns: number): Cultivator {
  return addBond(c, wornIds(c), turns * BOND_PER_TURN);
}

/** Stones that buy one bond day with an item: five at tier 1, three times that a tier up. */
export function stonesPerBondDay(it: Item): number {
  return BOND_STONES_PER_DAY * 3 ** (it.tier - 1);
}

/** Feeds a worn or carried artifact this many stones in seclusion; unchanged if it can't. */
export function feedArtifact(c: Cultivator, id: string, stones: number): Cultivator {
  if (!hasItem(id) || !bonds(item(id)) || stones <= 0) return c;
  if (!wornIds(c).includes(id) && (c.items[id] ?? 0) <= 0) return c;
  // Paid as any price is, across the grades.
  const after = pay(stonesOf(c), stones);
  if (!after) return c;
  return withStones(addBond(c, [id], stones / stonesPerBondDay(item(id))), after);
}

// ---------------------------------------------------------------- above your realm

/** How many tiers a thing sits above the wearer's qi realm: 0 at or below. */
export function tiersAbove(c: Cultivator, it: Item): number {
  return Math.max(0, it.tier - ownTier(c));
}

/**
 * What a weapon or armor counts as for this wearer, relative to their own tier: its band in its
 * own tier's realm, so a lower tier is weaker, and one tier above counts only part of the step
 * until the bond grows. Null when it won't wake: two tiers above.
 */
export function gearBand(
  c: Cultivator,
  it: Item,
): { band: number; accuracy: number; qi: number } | null {
  const above = tiersAbove(c, it);
  if (above >= 2) return null;
  const own = ownTier(c);
  const band = rarityMultiplier(it.rarity, tierStep(it.tier));
  if (above === 0) {
    return { band: (band * tierScale(it.tier)) / tierScale(own), accuracy: 1, qi: 0 };
  }
  const level = bonds(it) ? bondMastery(c, it.id).level : 0;
  const step = tierScale(it.tier) / tierScale(own);
  return {
    band: band * step ** ABOVE_STEP_SHARE[level]!,
    accuracy: ABOVE_ACCURACY[level]!,
    qi: level >= 4 ? 0 : ABOVE_QI,
  };
}

/** A weapon's Accuracy multiplier: half a technique's at gold and up, times the above-realm one. */
export function weaponAccuracy(it: Item, above: number): number {
  return Math.sqrt(rarityAccuracy(it.rarity)) * above;
}

// ---------------------------------------------------------------- equipping

/** Treasure slots the trees have opened (stats.treasureSlots), as a whole count. */
export function treasureSlots(opened: number): number {
  return Math.max(0, Math.floor(opened + 1e-9));
}

/**
 * Whether the item can be worn now: held, wearable, a ring at a tier your soul or qi realm
 * reaches, a weapon or armor that will wake, and a treasure slot free. `opened` is the treasure
 * slots the trees give (stats.treasureSlots).
 */
export function canEquip(c: Cultivator, id: string, opened: number): GearCheck {
  if (!hasItem(id)) return { ok: false, reason: 'No such thing.' };
  const it = item(id);
  const use = it.uses.equip;
  if (!use) return { ok: false, reason: `${it.name} isn't worn.` };
  if ((c.items[id] ?? 0) <= 0) return { ok: false, reason: `You hold no ${it.name}.` };
  if (use.slot === 'ring') {
    const reach = realmIndex(realmOf(c)) + 1;
    if (reach < it.tier)
      return { ok: false, reason: `${it.name} opens only to a soul at its tier.` };
  }
  if ((use.slot === 'weapon' || use.slot === 'armor') && tiersAbove(c, it) >= 2) {
    return { ok: false, reason: `${it.name} won't wake for you: two realms above yours.` };
  }
  if (use.slot === 'treasure') {
    if (c.gear.treasures.includes(id)) return { ok: false, reason: 'Already worn.' };
    if (c.gear.treasures.length >= treasureSlots(opened)) {
      return {
        ok: false,
        reason:
          opened < 1
            ? 'No treasure slot is open yet: the Qi and Soul trees open them.'
            : 'Every treasure slot is full.',
      };
    }
  }
  return { ok: true };
}

const take = (items: Cultivator['items'], id: string, n: number) => ({
  ...items,
  [id]: Math.max(0, (items[id] ?? 0) + n),
});

/** Wears the item, putting whatever held its square back in the Bag; unchanged when it can't. */
export function equip(
  c: Cultivator,
  id: string,
  opened: number,
): { cultivator: Cultivator; check: GearCheck } {
  const check = canEquip(c, id, opened);
  if (!check.ok) return { cultivator: c, check };
  const slot = item(id).uses.equip!.slot;
  let items = take(c.items, id, -1);
  const gear = { ...c.gear, treasures: [...c.gear.treasures] };
  if (slot === 'treasure') gear.treasures.push(id);
  else {
    const old = gear[slot];
    if (old) items = take(items, old, 1);
    gear[slot] = id;
  }
  const next = { ...c, items, gear };
  if (!packHolds(c, next)) {
    return {
      cultivator: c,
      check: { ok: false, reason: 'Your pack has no room for what it holds now.' },
    };
  }
  return { cultivator: next, check };
}

/** Takes off what a square or slot holds into the Bag; unchanged when the Bag has no room for it. */
export function unequip(c: Cultivator, slot: EquipSlot, id?: string): Cultivator {
  let next: Cultivator;
  if (slot === 'treasure') {
    if (!id || !c.gear.treasures.includes(id)) return c;
    next = {
      ...c,
      items: take(c.items, id, 1),
      gear: { ...c.gear, treasures: c.gear.treasures.filter((t) => t !== id) },
    };
  } else {
    const old = c.gear[slot];
    if (!old) return c;
    next = { ...c, items: take(c.items, old, 1), gear: { ...c.gear, [slot]: null } };
  }
  return packHolds(c, next) ? next : c;
}

/** Whether what a square or slot holds can come off: the Bag needs room for it. */
export function canUnequip(c: Cultivator, slot: EquipSlot, id?: string): GearCheck {
  const held = slot === 'treasure' ? id : c.gear[slot];
  if (!held) return { ok: false, reason: 'Nothing is worn there.' };
  return unequip(c, slot, id) === c
    ? { ok: false, reason: 'Your pack has no room for it.' }
    : { ok: true };
}

/** Treasures past the slots the trees give (a node sealed again, say) stop working. */
export function workingTreasures(c: Cultivator, opened: number): string[] {
  return c.gear.treasures.slice(0, treasureSlots(opened));
}

/**
 * The effects worn gear gives: each worn item's working properties. A weapon or armor that
 * won't wake gives none, and treasures past the open slots give none.
 */
export function gearEffects(c: Cultivator, opened: number): Effect[] {
  const out: Effect[] = [];
  const g = c.gear;
  const worn = [g.weapon, g.armor, g.ring, g.pouch, ...workingTreasures(c, opened)];
  for (const id of worn) {
    if (!id || !hasItem(id)) continue;
    const it = item(id);
    if (
      gearBand(c, it) === null &&
      (it.uses.equip?.slot === 'weapon' || it.uses.equip?.slot === 'armor')
    )
      continue;
    for (const p of activeProperties(c, it)) out.push(...p.effects);
  }
  return out;
}

// ---------------------------------------------------------------- the Bag in squares

/** Squares the pack, pouch and ring hold together; a ring counts once it opens to you. */
export function bagCapacity(c: Cultivator): number {
  let n = PACK_SQUARES;
  for (const id of [c.gear.pouch, c.gear.ring]) {
    if (id && hasItem(id)) n += item(id).uses.equip?.squares ?? 0;
  }
  return n;
}

/** One stack in the Bag: an item, how many, and the squares it fills. */
export interface BagStack {
  id: string;
  n: number;
  squares: number;
  /** Which of its item's split stacks it is, or null for one of the pile's whole stacks. */
  split: number | null;
}

/**
 * An item's split stacks as they stand: none counts past the item's count, the last ones going
 * first as the pile is used up, so what is spent comes out of the pile, then the newest split.
 */
export function splitsOf(c: Cultivator, id: string): number[] {
  const n = c.items[id] ?? 0;
  const out: number[] = [];
  let left = n;
  for (const k of c.splits?.[id] ?? []) {
    if (left <= 0) break;
    out.push(Math.min(k, left));
    left -= Math.min(k, left);
  }
  return out;
}

/**
 * The Bag's stacks in the order gained: each fills a square per stack-full, times its bulk, and
 * each stack split off fills its own.
 */
export function bagStacks(c: Cultivator): BagStack[] {
  const out: BagStack[] = [];
  for (const [id, n] of Object.entries(c.items)) {
    if (n <= 0 || !hasItem(id)) continue;
    const it = item(id);
    const size = stackSize(it);
    const squares = it.bulk ?? 1;
    const splits = splitsOf(c, id);
    const pile = n - splits.reduce((a, b) => a + b, 0);
    for (let i = 0; i < Math.ceil(pile / size); i++) {
      out.push({ id, n: Math.min(size, pile - i * size), squares, split: null });
    }
    splits.forEach((k, i) => out.push({ id, n: k, squares, split: i }));
  }
  return out;
}

/** Squares in use. */
export function bagUsed(c: Cultivator): number {
  return bagStacks(c).reduce((sum, s) => sum + s.squares, 0);
}

/** How many more of an item the Bag takes: the room in its pile's last stack, then free squares. */
export function roomFor(c: Cultivator, id: string): number {
  if (!hasItem(id)) return 0;
  const it = item(id);
  const size = stackSize(it);
  const n = c.items[id] ?? 0;
  const pile = n - splitsOf(c, id).reduce((a, b) => a + b, 0);
  const partial = pile % size === 0 ? 0 : size - (pile % size);
  const free = Math.max(0, bagCapacity(c) - bagUsed(c));
  return partial + Math.floor(free / (it.bulk ?? 1)) * size;
}

/**
 * Puts things in the Bag as far as it holds them (Sean's playtest: the Bag held past its squares):
 * what fits goes in, and what doesn't is handed back to fall where you stand (core/map/ground.ts).
 */
export function stow(c: Cultivator, id: string, n: number): { c: Cultivator; left: number } {
  const kept = Math.max(0, Math.min(n, roomFor(c, id)));
  return { c: kept > 0 ? { ...c, items: take(c.items, id, kept) } : c, left: n - kept };
}

/**
 * Splits one of the Bag's stacks in two, the smaller half its own square (Sean's playtest): the
 * `at`-th stack of the item as bagStacks lists it. Null when it holds one, or no square is free.
 */
export function splitStack(c: Cultivator, id: string, at: number): Cultivator | null {
  const stack = bagStacks(c).filter((s) => s.id === id)[at];
  if (!stack || stack.n < 2) return null;
  if (bagUsed(c) + stack.squares > bagCapacity(c)) return null;
  const half = Math.floor(stack.n / 2);
  const splits = splitsOf(c, id);
  if (stack.split === null) splits.push(half);
  else splits.splice(stack.split, 1, stack.n - half, half);
  return { ...c, splits: { ...c.splits, [id]: splits } };
}

/** Puts an item's split stacks back on its pile, which fills whole stacks again. */
export function mergeStacks(c: Cultivator, id: string): Cultivator {
  if (!c.splits?.[id]) return c;
  const splits = { ...c.splits };
  delete splits[id];
  return { ...c, splits };
}

/** Whether a change to what is worn leaves the Bag no fuller past its squares than it was. */
function packHolds(before: Cultivator, after: Cultivator): boolean {
  const over = (c: Cultivator) => Math.max(0, bagUsed(c) - bagCapacity(c));
  return over(after) <= over(before);
}
