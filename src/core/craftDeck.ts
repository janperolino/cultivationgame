// The craft deck (K12, design § Professions, people and powers: Production, commissions and the
// craft deck; § Story cards and events). It joins Cultivate's tray once you hold a tool or a
// field, riding the seclusion deck's pace: its share of the paced draws is your wheel's share of
// Craft hours, at most half. A card is set where its field or market is (`setAt`), its words
// naming the place, a real shop and its keeper or the field's neighbour, and the craft; its stakes
// run on the realm curve and the craft tier. A card about your bench or field lights its page on
// the Crafts screen, and an urgent one takes its default if left, as urgent cards do.
import type { Card, CardEffect, Trigger } from '../content/cards/index.ts';
import { DAYS_PER_MONTH } from '../content/calendar.ts';
import { CRAFTS, CRAFT_IDS, recipe, recipeFor, type CraftId } from '../content/crafts.ts';
import { copyId, hasCopy } from '../content/copies.ts';
import { slipId } from '../content/catalogs/index.ts';
import { baseOf, item, variantId } from '../content/items.ts';
import { realmScale } from '../content/realms.ts';
import { BORDER_WILDS_NAMES } from '../content/roster.ts';
import { keeperName, shop as shopById } from '../content/shops.ts';
import { CRAFTER } from '../content/styles.ts';
import { askedCommission, askerFor, holdCommission, postsFor } from './commissions.ts';
import { gradeCertified } from './craftGrade.ts';
import { addCraftFame, craftLevel } from './craftRenown.ts';
import {
  craftReach,
  craftTiersHeld,
  knowsRecipe,
  lentTools,
  toolsHeld,
  withCrafts,
} from './crafts.ts';
import { RECIPES } from '../content/crafts.ts';
import { gainItem } from './map/ground.ts';
import { guardedBy, MARKETS, market, type Market } from './markets.ts';
import { receive, spend, stonesOf, withStones } from './purse.ts';
import { hashSeed, Rng } from './rng.ts';
import { gainCopy } from './life.ts';
import { effectiveWheel } from './wheel.ts';
import { addItem, realmOf, withPlayer, type Cultivator, type GameState } from './state.ts';

/** The craft deck's id. */
export const CRAFT_DECK = 'craft';

/** The most of the paced draws the craft deck takes, however many Craft hours you keep. */
export const CRAFT_SHARE_MOST = 0.5;

/** The crafts whose tool you hold, yours or a post's. */
function toolCrafts(c: Cultivator): CraftId[] {
  return CRAFT_IDS.filter((k) => toolsHeld(c, k).length > 0 || lentTools(c, k).length > 0);
}

/** Whether the craft deck draws for you: a tool held, or a field. */
export function craftDeckOpen(c: Cultivator): boolean {
  return toolCrafts(c).length > 0 || c.crafts.plots.length > 0;
}

/** The craft deck's share of the paced draws: your wheel's Craft hours, at most half. */
export function craftShare(c: Cultivator): number {
  if (!craftDeckOpen(c)) return 0;
  const wheel = effectiveWheel(c);
  return Math.min(CRAFT_SHARE_MOST, wheel.filter((h) => h === 'craft').length / wheel.length);
}

/** The craft a card is about: the bench's front batch's when it fits, else the first held. */
function cardCraft(c: Cultivator, t: Trigger['craft']): CraftId | null {
  const held = [...toolCrafts(c), ...(c.crafts.plots.length ? (['farming'] as const) : [])];
  const fit = held.filter((k) => !t?.crafts || t.crafts.includes(k));
  const front = c.crafts.front ? recipe(c.crafts.front.recipe).craft : null;
  return front && fit.includes(front) ? front : (fit[0] ?? null);
}

/** Whether the craft deck's part of a trigger holds. */
export function craftTriggerHolds(s: GameState, t: Trigger['craft']): boolean {
  if (!t) return true;
  const c = s.player;
  if (!craftDeckOpen(c)) return false;
  if (t.field && c.crafts.plots.length === 0) return false;
  if (t.bench && (!c.crafts.front || c.crafts.front.mend || c.crafts.front.experiment))
    return false;
  const craft = cardCraft(c, t);
  if (!craft) return false;
  if (t.ungraded && craftTiersHeld(c, craft) <= gradeCertified(c, craft)) return false;
  if (t.renown !== undefined && !bestRegion(s, craft, t.renown)) return false;
  if (t.made && !c.crafts.recent.some((b) => b.made && recipeFor(b.made)?.craft === craft))
    return false;
  return true;
}

/** The region where your name in a craft stands highest, at least `least`. */
function bestRegion(s: GameState, craft: CraftId, least: number): string | null {
  let best: { region: string; level: number } | null = null;
  for (const region of Object.keys(s.player.crafts.renown)) {
    const level = craftLevel(s.player, region, craft, s.calendar.day);
    if (level >= least && (!best || level > best.level)) best = { region, level };
  }
  return best?.region ?? null;
}

/** The markets with a shop that posts for a craft, nearest first to where you stand. */
function marketsFor(s: GameState, craft: CraftId, region?: string): Market[] {
  const at = s.map?.at ?? null;
  const here = s.map?.region ?? null;
  const shops = (m: Market) => m.shops.some((id) => postsFor(id) === craft);
  const dist = (m: Market) =>
    at && m.region === here ? Math.hypot(m.x - at[0], m.y - at[1]) : Number.POSITIVE_INFINITY;
  return MARKETS.filter((m) => shops(m) && (!region || m.region === region)).sort(
    (a, b) => dist(a) - dist(b) || (a.id < b.id ? -1 : 1),
  );
}

/** A plain name for a place a plot or market stands at. */
function placeName(id: string): string {
  return market(id)?.name ?? id;
}

/**
 * The words a craft card is set with (its `setAt`), or null when it can't be set: the place, a
 * shop and its keeper or the field's neighbour, the craft. Kept on the waiting card; the keys
 * starting `_` are ids its effects read.
 */
export function craftWords(s: GameState, k: Card): Record<string, string> | null {
  const c = s.player;
  const craft = cardCraft(c, k.trigger.craft);
  if (!craft) return null;
  const rng = new Rng(hashSeed(`craft-card/${k.id}/${Math.floor(s.calendar.day)}`));
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(rng.next() * xs.length)]!;
  const words: Record<string, string> = {
    craft: CRAFTS[craft].name.toLowerCase(),
    crafter: CRAFTER[craft].name,
    tool: CRAFTS[craft].tool,
    _craft: craft,
  };
  if (k.setAt === 'field') {
    const plot = c.crafts.plots[0];
    if (!plot) return null;
    return {
      ...words,
      where: placeName(plot.place),
      neighbour: `${pick(['Old', 'Granny', 'Uncle'])} ${pick(BORDER_WILDS_NAMES.surnames)}`,
      _plot: plot.id,
      _place: plot.place,
    };
  }
  if (k.setAt === 'market' || k.setAt === 'renown') {
    // A market card about a craft you only farm reads the alchemy shops, who buy your herbs.
    const dealt = craft === 'farming' ? 'alchemy' : craft;
    const region = k.setAt === 'renown' ? bestRegion(s, dealt, k.trigger.craft?.renown ?? 0) : null;
    if (k.setAt === 'renown' && !region) return null;
    const m = marketsFor(s, dealt, region ?? undefined)[0];
    if (!m) return null;
    const shops = m.shops.filter((id) => postsFor(id) === dealt);
    const sh = shopById(pick(shops));
    return {
      ...words,
      where: m.name,
      shop: sh.name,
      keeper: keeperName(sh),
      asker: askerFor(`${k.id}/${sh.id}/${Math.floor(s.calendar.day)}`, dealt),
      _shop: sh.id,
      _region: m.region,
      _market: m.id,
      _craft: dealt,
    };
  }
  return { ...words, where: s.map?.inside ? placeName(s.map.inside) : 'your bench' };
}

/** The Crafts page a waiting card lights: its bench's craft, or Farming for a field. */
export function craftPage(k: Card, words: Readonly<Record<string, string>> | undefined) {
  if (k.deck !== CRAFT_DECK) return null;
  if (k.setAt === 'field') return 'farming' as CraftId;
  if (k.setAt === 'bench') return (words?._craft as CraftId | undefined) ?? null;
  return null;
}

/** Sets each waiting field card's `here`: whether you stand at its field with no course set. */
export function craftCardsHere(s: GameState): GameState {
  let changed = false;
  const pending = s.cards.pending.map((p) => {
    const place = p.words?._place;
    if (!place) return p;
    const here = s.map?.inside === place && !s.map.course ? 1 : 0;
    if (p.vars?.here === here) return p;
    changed = true;
    return { ...p, vars: { ...p.vars, here } };
  });
  return changed ? { ...s, cards: { ...s.cards, pending } } : s;
}

/** A thing at your craft tier: the reach of your craft, at least the thing's own tier. */
function atCraftTier(c: Cultivator, id: string, rarity?: string): string {
  const tier = Math.max(item(id).tier, craftReach(c).tier);
  return variantId(id, (rarity as never) ?? undefined, { tier });
}

/** A recipe slip of a craft you don't hold, at your craft tier or under, the lowest first; never a power's own. */
function slipFor(c: Cultivator, craft: CraftId): string | null {
  const reach = craftReach(c).tier;
  const r = RECIPES.filter(
    (x) => x.craft === craft && !knowsRecipe(c, x.output) && item(x.output).tier <= reach,
  ).sort((a, b) => item(a.output).tier - item(b.output).tier || (a.output < b.output ? -1 : 1));
  for (const x of r) {
    const id = copyId('manual', slipId(x.output));
    if (hasCopy(id) && !guardedBy(id) && !c.copies[id]) return id;
  }
  return null;
}

/**
 * One of the craft deck's effects on the game, on the card's words (K12). Stones and things scale
 * here too, since a craft card's stakes run on the realm curve and the craft tier.
 */
export function applyCraftEffect(
  s: GameState,
  e: CardEffect,
  words: Readonly<Record<string, string>>,
): GameState | null {
  const c = s.player;
  const day = s.calendar.day;
  switch (e.do) {
    case 'stones': {
      if (!e.scaled) return null;
      const n = e.n * realmScale(realmOf(c));
      return withPlayer(s, withStones(c, n < 0 ? spend(stonesOf(c), -n) : receive(stonesOf(c), n)));
    }
    case 'item': {
      if (!e.craftTier && !e.rarity) return null;
      const id = e.craftTier ? atCraftTier(c, e.id, e.rarity) : variantId(e.id, e.rarity);
      return gainItem(s, id, e.n).state;
    }
    case 'bench': {
      const front = c.crafts.front;
      if (!front) return s;
      if (e.outcome === 'finer')
        return withPlayer(s, withCrafts(c, { front: { ...front, above: true } }));
      const r = recipe(front.recipe);
      const tool = toolsHeld(c, r.craft).find((t) => !t.cracked && t.tier >= item(r.output).tier);
      if (!tool) return s;
      const cracked = variantId(baseOf(tool.id), tool.rarity, { cracked: true });
      return withPlayer(s, addItem(addItem(c, tool.id, -1), cracked, 1));
    }
    case 'field': {
      const plot = c.crafts.plots.find((p) => p.id === words._plot);
      if (!plot) return s;
      let beds = [...plot.beds];
      let next = plot;
      if ('age' in e) beds = beds.map((b) => (b ? { ...b, grown: b.grown + e.age } : b));
      else if ('lose' in e) {
        const sown = beds.flatMap((b, i) => (b ? [i] : []));
        for (const i of sown.slice(0, e.lose)) beds[i] = null;
      } else if (e.outcome === 'robbed') {
        const ripest = beds
          .map((b, i) => ({ b, i }))
          .filter((x) => x.b)
          .sort((a, b) => b.b!.grown - a.b!.grown)[0];
        if (ripest) beds[ripest.i] = null;
      } else next = { ...next, thief: Math.floor(day / DAYS_PER_MONTH) };
      next = { ...next, beds };
      const plots = c.crafts.plots.map((p) => (p.id === plot.id ? next : p));
      return withPlayer(s, withCrafts(c, { plots }));
    }
    case 'renown': {
      const region = words._region;
      const craft = words._craft as CraftId | undefined;
      if (!region || !craft) return s;
      return withPlayer(s, addCraftFame(c, region, craft, e.n, day));
    }
    case 'commission': {
      const shop = words._shop;
      const craft = words._craft as CraftId | undefined;
      if (!shop || !craft) return s;
      const k = askedCommission(s, shop, craft, e.batches, e.floor, words.asker ?? '');
      if (!k) return s;
      const r = holdCommission(s, k);
      return r.ok ? r.state : s;
    }
    case 'slip': {
      const craft = words._craft as CraftId | undefined;
      const id = craft ? slipFor(c, craft) : null;
      return id ? gainCopy(s, id, 'comes by') : s;
    }
    default:
      return null;
  }
}
