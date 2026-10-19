// Loot (design § Enemies, What the dead leave; § Items and gear, Loot and shops): what a generated
// NPC carries, as the written things their rolls name, and what they leave when they fall. A
// cultivator's weapon and armor are the written pieces of their kind and tier at the rarity they
// rolled, their consumables the pills and talismans they fought with, their stones a count by
// realm, and from Foundation up a storage ring holding lots at their pedigree's bias. A beast leaves
// its parts and its core, at its realm's tier and its bloodline's rarity. All of it comes from the
// NPC's seed, so the same elder carries the same ring every time; only a Fortune drop draws the
// `loot` stream. The lucky rogue's find (P3.4b) is named here from the gold and red list.
import { CATALOGS } from '../content/catalogs/index.ts';
import { RARE } from '../content/catalogs/rare.ts';
import type { Lot } from '../content/catalogs/types.ts';
import { FORTUNE_DROP } from '../content/combat.ts';
import { copyOf, hasCopy } from '../content/copies.ts';
import { hasItem, item, ITEMS, rarityRange, variantId, type Item } from '../content/items.ts';
import { CARRIED_STONES, PART_ITEM, RING_LOTS } from '../content/loot.ts';
import { manual } from '../content/manuals.ts';
import { method } from '../content/methods.ts';
import { RARITY_IDS, rarityRank, type RarityId } from '../content/rarity.ts';
import { realmIndex, type RealmId } from '../content/realms.ts';
import { technique } from '../content/techniques.ts';
import { pedigreeBias, rollBiased, type LuckySlot, type Npc } from './combat/generate.ts';
import { receive, stonesOf, tierGrade, withStones } from './purse.ts';
import { gainCopy as ownCopy } from './reading.ts';
import { hashSeed, Rng } from './rng.ts';
import { addEvent, addItem, withPlayer, type Cultivator, type GameState } from './state.ts';

/** What someone carries or leaves: item ids with counts, and low-grade stones. */
export interface Haul {
  items: Record<string, number>;
  stones: number;
}

function add(h: Haul, id: string, n = 1): void {
  h.items[id] = (h.items[id] ?? 0) + n;
}

function npcTier(n: Npc): number {
  return realmIndex(n.realm) + 1;
}

/** A stream of its own for each thing an NPC carries, keyed off their seed. */
function rngFor(n: Npc, what: string): Rng {
  return new Rng(hashSeed(`${what}/${n.seed >>> 0}`));
}

/**
 * The written piece of gear an NPC's roll names: among the pieces of the slot (and the weapon's
 * kind) at their tier whose range holds the rarity, or the nearest rarity below that has one.
 */
function gearFor(
  rng: Rng,
  tier: number,
  slot: 'weapon' | 'armor',
  r: RarityId,
  kind?: string,
): string | null {
  const fits = (it: Item) =>
    it.uses.equip?.slot === slot &&
    it.tier === tier &&
    (kind === undefined || it.uses.equip.weapon === kind) &&
    !it.damaged;
  const pool = ITEMS.filter(fits);
  for (let i = rarityRank(r); i >= 0; i--) {
    const at = RARITY_IDS[i]!;
    const here = pool.filter((it) => rarityRange(it).includes(at));
    if (here.length) return variantId(rng.pick(here).id, at);
  }
  return null;
}

/** What a find would be: the gold and red list's things of a slot at a tier or below. */
function rareOfSlot(slot: LuckySlot, tier: number, kind?: string): string[] {
  return RARE.lots
    .map((l) => l.thing)
    .filter((t) => {
      if (slot === 'method' || slot === 'technique') {
        const of = copyOf(t);
        if (!of || of.kind !== slot) return false;
        return (slot === 'method' ? method(of.id) : technique(of.id)).tier <= tier;
      }
      if (!hasItem(t)) return false;
      const it = item(t);
      return (
        it.uses.equip?.slot === slot &&
        it.tier <= tier &&
        (kind === undefined || slot !== 'weapon' || it.uses.equip.weapon === kind)
      );
    });
}

/**
 * The lucky rogue's find, named: a written gold or red thing for the slot, a weapon of their own
 * kind when one is written, at their tier or below. Null for anyone without a find.
 */
export function findOf(n: Npc): string | null {
  if (!n.find) return null;
  const tier = npcTier(n);
  const weapon = n.combatant.weapon.kind;
  const own = rareOfSlot(n.find.slot, tier, weapon);
  const any = own.length ? own : rareOfSlot(n.find.slot, tier);
  return any.length ? rngFor(n, 'find').pick(any) : null;
}

/** The stones an NPC carries: a count by realm, from their seed. */
export function carriedStones(n: Npc): number {
  if (n.kind === 'beast') return 0;
  const [lo, hi] = CARRIED_STONES[Math.min(realmIndex(n.realm), CARRIED_STONES.length - 1)]!;
  return rngFor(n, 'stones').int(lo, hi);
}

/** Every catalog's lots and the rare list's: what a ring can hold, sold anywhere or nowhere. */
function allLots(): Lot[] {
  return [...CATALOGS.flatMap((c) => c.lots), ...RARE.lots];
}

/**
 * A lot's thing as the rolls see it: its tier and the rarities it comes at; null for what isn't
 * written, and for mortal goods unless `mortal` (a shop sells them; a ring or a drop never holds them).
 */
export function lotShape(
  thing: string,
  opts: { mortal?: boolean } = {},
): { tier: number; rarities: RarityId[] } | null {
  if (hasCopy(thing)) {
    const of = copyOf(thing)!;
    const t =
      of.kind === 'method'
        ? method(of.id)
        : of.kind === 'technique'
          ? technique(of.id)
          : manual(of.id);
    return { tier: t.tier, rarities: [t.rarity] };
  }
  if (!hasItem(thing)) return null;
  const it = item(thing);
  if (it.taels !== undefined && !opts.mortal) return null;
  return { tier: it.tier, rarities: rarityRange(it) };
}

/** Every lot with its shape, worked out once: the catalogs never change. */
let shaped: { lot: Lot; shape: ReturnType<typeof lotShape> }[] | null = null;
function shapedLots() {
  return (shaped ??= allLots().map((lot) => ({ lot, shape: lotShape(lot.thing) })));
}

/**
 * An elder's ring, from Foundation up: three to eight lots at their pedigree's bias, from their
 * tier and the one below, and what stones they kept in it. The same elder's ring is always the
 * same ring.
 */
export function ringOf(n: Npc): Haul | null {
  if (n.kind === 'beast' || n.storage !== 'storage ring') return null;
  const rng = rngFor(n, 'ring');
  const tier = npcTier(n);
  const bias = pedigreeBias(n.pedigree ?? 'rogue', n.realm);
  const pool = shapedLots().filter(
    (x) => x.shape && x.shape.tier <= tier && x.shape.tier >= tier - 1,
  );
  const h: Haul = { items: {}, stones: 0 };
  const lots = rng.int(RING_LOTS[0], RING_LOTS[1]);
  for (let i = 0; i < lots; i++) {
    const r = rollBiased(rng, bias);
    for (let k = rarityRank(r); k >= 0; k--) {
      const at = RARITY_IDS[k]!;
      const here = pool.filter((x) => x.shape!.rarities.includes(at));
      if (!here.length) continue;
      const total = here.reduce((t, x) => t + (x.lot.weight ?? 1), 0);
      let u = rng.next() * total;
      const pick = here.find((x) => (u -= x.lot.weight ?? 1) < 0) ?? here[here.length - 1]!;
      const [lo, hi] = pick.lot.count ?? [1, 1];
      const id = hasCopy(pick.lot.thing) ? pick.lot.thing : variantId(pick.lot.thing, at);
      add(h, id, rng.int(lo, hi));
      break;
    }
  }
  h.stones = carriedStones(n);
  return h;
}

/**
 * What an NPC carries: for a cultivator their weapon and armor as written pieces at their rolls
 * (a find in its slot), their consumables, their pouch or ring and their stones; for a beast its
 * parts and its core. A ring's contents are `ringOf`, apart, since a ring may not open.
 */
export function kitOf(n: Npc): Haul {
  const h: Haul = { items: {}, stones: 0 };
  const tier = npcTier(n);
  if (n.kind === 'beast') {
    const blood = n.rolls.bloodline ?? 'white';
    for (const p of n.carries) {
      const id = PART_ITEM[p];
      if (!id) continue;
      // A part comes only in its written range: a pristine bloodline leaves a red part.
      const range = rarityRange(item(id));
      const at = rarityRank(blood) - rarityRank(range[0]!);
      add(h, variantId(id, range[Math.max(0, Math.min(range.length - 1, at))], { tier }));
    }
    return h;
  }
  const rng = rngFor(n, 'kit');
  const find = findOf(n);
  const slotOf = (t: string) =>
    hasItem(t) ? item(t).uses.equip?.slot : (copyOf(t)?.kind as string | undefined);
  const weapon =
    find && slotOf(find) === 'weapon'
      ? find
      : gearFor(rng, tier, 'weapon', n.rolls.weapon, n.combatant.weapon.kind);
  const armor =
    find && slotOf(find) === 'armor' ? find : gearFor(rng, tier, 'armor', n.rolls.armor);
  if (weapon) add(h, weapon);
  if (armor) add(h, armor);
  if (find && (slotOf(find) === 'method' || slotOf(find) === 'technique')) add(h, find);
  for (const c of n.consumables) add(h, c.id);
  if (n.storage === 'storage pouch') add(h, 'storage-pouch');
  if (n.storage === 'storage ring') add(h, 'storage-ring');
  for (const p of n.carries) {
    const id = PART_ITEM[p];
    if (id) add(h, variantId(id, n.rolls.method.qi, { tier }));
  }
  h.stones = n.storage === 'storage ring' ? 0 : carriedStones(n);
  return h;
}

/**
 * Whether a cultivator can open a storage ring of a tier: it opens to divine sense, so their soul or
 * their qi reaches the tier, whichever is first; a body ahead of both doesn't (Items and gear).
 */
export function opensRing(c: Cultivator, tier: number): boolean {
  return Math.max(realmIndex(c.soul.realm), realmIndex(c.qi.realm)) + 1 >= tier;
}

/**
 * The tier a dead cultivator's ring is sealed at: its own, and never under its owner's realm, since
 * an elder's ring holds an elder's things.
 */
export function ringTier(ringId: string, ownerRealm: RealmId): number {
  const own = hasItem(ringId) ? item(ringId).tier : 1;
  return Math.max(own, realmIndex(ownerRealm) + 1);
}

/**
 * The armor the killing blow fell on, damaged: it drops one rarity lower, a refiner's to mend
 * (What the dead leave). The haul with that piece swapped.
 */
export function damageArmor(h: Haul, armorId: string): Haul {
  if (!(armorId in h.items)) return h;
  const it = item(armorId);
  const down = RARITY_IDS[Math.max(0, rarityRank(it.rarity) - 1)]!;
  const items = { ...h.items };
  items[armorId] = items[armorId]! - 1;
  if (items[armorId] === 0) delete items[armorId];
  const id = variantId(armorId.split('~')[0]!, down, { damaged: true });
  items[id] = (items[id] ?? 0) + 1;
  return { ...h, items };
}

/**
 * A Fortune drop when a foe falls: each point of Fortune above 10 adds FORTUNE_DROP, rolled on the
 * `loot` stream, and the drop is one more lot of the dead's tier at their bias.
 */
export function fortuneDrop(rng: Rng, n: Npc, fortune: number): string | null {
  if (!rng.chance(Math.max(0, fortune - 10) * FORTUNE_DROP)) return null;
  const tier = npcTier(n);
  const r = rollBiased(rng, pedigreeBias(n.pedigree ?? 'rogue', n.realm));
  const pool = shapedLots()
    .filter(({ shape: s }) => s && s.tier === tier && s.rarities.includes(r))
    .map((x) => x.lot);
  if (!pool.length) return null;
  const lot = rng.pick(pool);
  return hasCopy(lot.thing) ? lot.thing : variantId(lot.thing, r);
}

/**
 * Opens every sealed ring the player's realm now reaches: its lots go into the Bag with the ring
 * itself, its stones into the purse, and a chronicle line names whose it was.
 */
export function openRings(s: GameState): GameState {
  const ready = s.world.sealed.filter((r) => opensRing(s.player, r.tier));
  if (!ready.length) return s;
  let c = s.player;
  for (const r of ready) {
    for (const [id, n] of Object.entries(r.items)) {
      if (hasCopy(id)) c = ownCopy(c, id, n);
      else if (hasItem(id)) c = addItem(c, id, n);
    }
    // Its stones as its owner counted them, in the grade of the ring's tier at most.
    c = withStones(c, receive(stonesOf(c), r.stones, tierGrade(r.tier)));
  }
  let next: GameState = {
    ...withPlayer(s, c),
    world: { ...s.world, sealed: s.world.sealed.filter((r) => !ready.includes(r)) },
  };
  for (const r of ready) next = addEvent(next, 'ring-opened', { name: r.name });
  return next;
}
