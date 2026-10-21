// Styles as the world holds them (design § Professions, people and powers, Styles and the craft
// grade; K6). Each area's common style a craft, sold openly; the styles a power holds, whose goods
// a shop it owns stands as its hall's own lines (a clan's hall brews the frontier's pills alike);
// and a power's own style, guarded as its methods are, whose goods its people know for their own
// where they trade: selling one there is a leak seen in use.
import { copyId } from '../content/copies.ts';
import type { CraftId } from '../content/crafts.ts';
import { hasRecipe, recipe } from '../content/crafts.ts';
import { baseOf, hasItem, item, itemKind, variantId } from '../content/items.ts';
import { MANUALS, type Manual } from '../content/manuals.ts';
import { ORG_ROWS } from '../content/organizations.ts';
import { parentsOf } from '../content/map/index.ts';
import { SHOP_KIND_INFO, SHOPS, type Shop } from '../content/shops.ts';
import { COMMON_STYLES, STYLES_HELD } from '../content/styles.ts';
import { market, marketOfShop, shopTiers } from './markets.ts';
import { houseOf, isOrganization } from './organizations.ts';

const STYLES: readonly Manual[] = MANUALS.filter((m) => m.kind === 'style');

/** Every style written, common and own. */
export function allStyles(): readonly Manual[] {
  return STYLES;
}

/** A style's craft: the craft Dao it grafts beside. */
export function styleCraft(m: Manual): CraftId {
  return m.host as CraftId;
}

/** The goods a style's seals teach that have a recipe written today. */
export function styleGoods(m: Manual): string[] {
  return m.nodes.map((n) => n.recipe).filter((r): r is string => !!r && hasRecipe(r));
}

/** The common style of a craft where a place stands: the nearest ancestor that writes one. */
export function commonStyle(place: string, craft: CraftId): string | null {
  for (const id of [place, ...parentsOf(place)]) {
    const s = COMMON_STYLES[id]?.[craft];
    if (s) return s;
  }
  return null;
}

/** The styles a power holds (`STYLES_HELD`). */
export function stylesHeld(power: string): readonly string[] {
  return STYLES_HELD[power] ?? [];
}

// ---------------------------------------------------------------- a power's own

/** The guarded style each good belongs to: its seal's recipe, the style's power and its copy. */
const OWN = new Map<string, { power: string; copy: string; style: string }>();
for (const m of STYLES)
  if (m.guardedBy)
    for (const good of styleGoods(m))
      OWN.set(good, { power: m.guardedBy, copy: copyId('manual', m.id), style: m.id });

/**
 * Whose own a good is, when a guarded style teaches its recipe (design: they know their own pill):
 * the power and the style's copy, which a leak names.
 */
export function ownGood(thing: string): { power: string; copy: string; style: string } | null {
  if (!hasItem(thing)) return null;
  return OWN.get(baseOf(thing)) ?? null;
}

/**
 * The markets where a power's people trade, so its own goods are known there: those its shops
 * stand in, a branch's included, and the market places its atlas ties of trade or secret name
 * (Red Marrow Cave's at the Nameless Market).
 */
export function tradesAt(power: string): ReadonlySet<string> {
  const house = isOrganization(power) ? houseOf(power) : power;
  const out = new Set<string>();
  for (const sh of SHOPS) {
    if (!sh.power) continue;
    const owner = isOrganization(sh.power) ? houseOf(sh.power) : sh.power;
    if (owner !== house) continue;
    const m = marketOfShop(sh.id);
    if (m) out.add(m.id);
  }
  for (const id of [power, house])
    for (const to of ORG_ROWS.find((r) => r.id === id)?.trades ?? []) if (market(to)) out.add(to);
  return out;
}

// ---------------------------------------------------------------- a hall's own lines

/** How many of a style's good a power's shop stands a month: about a batch's worth. */
export const STYLE_LINE = 5;

/**
 * The goods a shop stands because its power holds a style (K6's done-when: a clan's hall brews
 * the common style's pills): each style good of a kind the shop deals in, at each tier it stocks.
 */
export function styleLines(sh: Shop): { thing: string; n: number }[] {
  if (!sh.power) return [];
  const deals = SHOP_KIND_INFO[sh.kind].buys;
  const tiers = shopTiers(sh);
  const out: { thing: string; n: number }[] = [];
  const seen = new Set<string>();
  for (const id of stylesHeld(sh.power)) {
    const m = STYLES.find((x) => x.id === id);
    if (!m) continue;
    for (const good of styleGoods(m)) {
      if (seen.has(good) || !hasItem(good)) continue;
      const it = item(good);
      if (!deals.includes(itemKind(it))) continue;
      seen.add(good);
      // Brewed at its written tier only: a hall's furnace makes what the style teaches.
      if (tiers.includes(it.tier)) out.push({ thing: variantId(good, it.rarity), n: STYLE_LINE });
    }
  }
  return out;
}

/** A recipe's style seal, for a card: the style that teaches it, if any. */
export function styleTeaching(output: string): Manual | null {
  if (!hasRecipe(output)) return null;
  const r = recipe(output);
  return STYLES.find((m) => m.nodes.some((n) => n.recipe === r.output)) ?? null;
}
