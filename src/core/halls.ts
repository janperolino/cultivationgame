// A power's halls (design § Professions, people and powers, What membership gives and asks;
// § Economy, Methods in the market, Sect contribution; § Cultivation, Lines, chapters and kinship;
// O2). The exchange hall sells to its members in the power's currency, at the market's price and
// never above it, its members' lines among the rest; from friendly standing an outsider buys at its
// open counter in stones at ×1.25, never the members' lines or the chapters; a guest elder in
// stones at the market's price, the members' lines among them (the review's call). The scripture
// pavilion keeps the power's own chapters, every copy its hall alone sells, and sells them by
// seat. The shop rules that price and take the coin are core/shops.ts's.
import { CATALOGS } from '../content/catalogs/index.ts';
import { copyChapter, hasCopy } from '../content/copies.ts';
import { baseOf } from '../content/items.ts';
import { wordRank } from '../content/memories.ts';
import { OPEN_COUNTER, PAVILION_SEAT, type SeatId } from '../content/organizations.ts';
import { SHOP_KIND_INFO, type Shop } from '../content/shops.ts';
import { gainCopy } from './life.ts';
import { guardedBy } from './markets.ts';
import {
  addBalance,
  houseOf,
  isOrganization,
  membership,
  membershipsOf,
  realmStageOf,
  seatOf,
  seatRank,
  theName,
  titheOf,
} from './organizations.ts';
import { priceOf } from './prices.ts';
import { foeHeld } from './resolver/opinion.ts';
import { standingOf } from './resolver/world.ts';
import type { GameState } from './state.ts';

/** How a members' shop serves you: as its own, as its guest elder, at its open counter, or not. */
type HallTerms =
  { as: 'member' } | { as: 'guest' } | { as: 'counter' } | { as: 'shut'; why: string };

/**
 * How a sect's hall serves the player (O2): its members in its currency; a guest elder, who earns
 * none, in stones at the market's price with the members' lines; an outsider its power stands
 * friendly with or better at the open counter. Null for a shop that serves anyone.
 */
export function hallTerms(s: GameState, sh: Shop): HallTerms | null {
  if (!SHOP_KIND_INFO[sh.kind].members || !sh.power) return null;
  const house = isOrganization(sh.power) ? houseOf(sh.power) : sh.power;
  const m = membership(s.world, s.player.id, house);
  if (m) return m.guest ? { as: 'guest' } : { as: 'member' };
  const word = standingOf(s.world, house, s.player.id, s.calendar.day).word;
  if (wordRank(word) >= wordRank(OPEN_COUNTER.from)) return { as: 'counter' };
  const foe = foeHeld(s.world, house, s.player.id);
  if (foe)
    return {
      as: 'shut',
      why: `It sells nothing to one of ${theName(foe)}'s people: they are at feud.`,
    };
  return { as: 'shut', why: 'It sells only to its own, and its people don’t know you.' };
}

/** Whether a thing on a hall's shelf is one of its members' lines (its place catalog's `members`). */
export function membersLine(sh: Shop, thing: string): boolean {
  const base = baseOf(thing);
  return CATALOGS.some(
    (c) =>
      c.layer === 'place' &&
      c.at === sh.at &&
      c.lots.some((l) => l.members && l.thing === base && l.shops.includes(sh.kind)),
  );
}

/** Whether the open counter sells a thing: never a members' line, never a copy (the chapters). */
export function counterSells(sh: Shop, thing: string): boolean {
  return !hasCopy(thing) && !membersLine(sh, thing);
}

/**
 * Whether a copy on a hall's shelf is the pavilion's instead: the power's own chapters, which its
 * scripture pavilion sells by seat rather than the hall by the month's lots.
 */
export function pavilionKeeps(sh: Shop, thing: string): boolean {
  return !!sh.power && hasCopy(thing) && guardedBy(thing) === sh.power;
}

/**
 * The share a harsh power takes of what its outer and inner seats bring in (design: a tithe of
 * 30% on bounties and loot brought in): a bounty paid, or loot sold at its own hall.
 */
export function titheFor(s: GameState, sh: Shop): number {
  const r = realmStageOf(s);
  let share = 0;
  for (const m of membershipsOf(s.world, s.player.id)) {
    if (!isOrganization(m.power)) continue;
    const ours = !!sh.power && isOrganization(sh.power) && houseOf(sh.power) === m.power;
    if (sh.kind !== 'bounty' && !ours) continue;
    share = Math.max(share, titheOf(s.world, s.player.id, m.power, r));
  }
  return share;
}

// ── The scripture pavilion ───────────────────────────────────────────────────────────────────

const ownCache = new Map<string, readonly string[]>();

/** A power's own chapters: every copy its hall alone keeps, in the catalogs' order. */
export function pavilionChapters(power: string): readonly string[] {
  const house = houseOf(power);
  let out = ownCache.get(house);
  if (!out) {
    const seen = new Set<string>();
    for (const c of CATALOGS)
      for (const l of c.lots)
        if (hasCopy(l.thing) && guardedBy(l.thing) === house) seen.add(l.thing);
    out = [...seen];
    ownCache.set(house, out);
  }
  return out;
}

/** The lowest seat that buys a chapter: 1 any member, 2 from inner, 3 from true, past it elder. */
function chapterSeat(thing: string): SeatId {
  return PAVILION_SEAT[copyChapter(thing)] ?? 'elder';
}

interface PavilionLine {
  thing: string;
  chapter: number;
  seat: SeatId;
  /** Its price in the power's currency: the copy's posted price, a point a low-grade stone. */
  points: number;
  /** Whether your seat reaches it. */
  open: boolean;
}

/** The pavilion's shelves as the player sees them, or null for one who isn't its member. */
export function pavilion(s: GameState, power: string): PavilionLine[] | null {
  const house = houseOf(power);
  const m = membership(s.world, s.player.id, house);
  if (!m || m.guest) return null;
  const yours = seatOf(s.world, s.player.id, house, realmStageOf(s))!;
  return pavilionChapters(house).map((thing) => {
    const seat = chapterSeat(thing);
    return {
      thing,
      chapter: copyChapter(thing),
      seat,
      points: Math.round(priceOf(thing) * 10) / 10,
      open: seatRank(yours) >= seatRank(seat),
    };
  });
}

/**
 * Buys a chapter's copy at the pavilion in the power's currency (design: chapter 2 to inner
 * disciples, chapter 3 to true disciples). A guest elder's seat opens the hall, never the pavilion.
 */
export function buyChapter(
  s: GameState,
  power: string,
  thing: string,
): { ok: true; state: GameState } | { ok: false; reason: string } {
  const house = houseOf(power);
  const lines = pavilion(s, house);
  if (!lines) return { ok: false, reason: 'The pavilion is for its own disciples.' };
  const line = lines.find((l) => l.thing === thing);
  if (!line) return { ok: false, reason: 'The pavilion keeps no such chapter.' };
  if (!line.open) return { ok: false, reason: `Chapter ${line.chapter} is for higher seats.` };
  const m = membership(s.world, s.player.id, house)!;
  if (m.balance < line.points) return { ok: false, reason: 'Your balance won’t cover it.' };
  const paid = { ...s, world: addBalance(s.world, s.player.id, house, -line.points) };
  return { ok: true, state: gainCopy(paid, thing, 'buys') };
}
