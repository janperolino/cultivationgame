// Offerings (design § Cultivation, Offerings): a major attempt on any ladder takes up to three
// items with the offer use, spent whether it succeeds or fails. A qi major's gate pill is always
// laid and counts as one of the three; body and soul majors need no gate. What an offering does
// is its tags, each sized by rarity: steadying adds odds, surging adds grade margin for the same
// odds taken away, purifying halves a failure's injury and clears toxicity, guarding keeps the
// bar on failure, and a ladder tag doubles the item on its own ladder. Tags meet: two surging
// items clash, an offering of your root's element adds a step of odds, and a gold or red one
// carries the grade to heavenly as a gold method does.
import {
  MAX_OFFERINGS,
  OFFER_DETOX,
  OFFER_ELEMENT_ODDS,
  OFFER_LADDER_MULTIPLIER,
  OFFER_MARGIN,
  OFFER_ODDS,
  type LadderId,
} from '../content/cultivation.ts';
import { hasItem, item, ITEMS } from '../content/items.ts';
import { rarityRank } from '../content/rarity.ts';
import { itemCount, type Cultivator } from './state.ts';

/** What one item does laid on a ladder's attempt, before it meets the others. */
export interface OfferEffect {
  odds: number;
  margin: number;
  /** Toxicity cleared at the attempt; a purifying item also halves a failure's injury. */
  detox: number;
  purifying: boolean;
  guarding: boolean;
  surging: boolean;
  /** Gold or better: the grade may reach heavenly. */
  heavenly: boolean;
}

export interface Offerings {
  /** Every item laid, the gate pill first when there is one. */
  laid: string[];
  /** What each laid item adds to the grade's margin, in the order laid. */
  margins: number[];
  /** False when an item isn't held, has no offer use, or there are too many. */
  valid: boolean;
  reason?: string;
  odds: number;
  margin: number;
  /** A failure's injury is halved. */
  purifying: boolean;
  /** Toxicity cleared at the attempt. */
  detox: number;
  /** A failure keeps the bar. */
  guarding: boolean;
  /** Two surging items: a natural 1 fails and injures. */
  clash: boolean;
  /** A gold or red offering lets the grade reach heavenly. */
  heavenly: boolean;
}

/** The items a cultivator holds that can be laid at an attempt, by id. */
export function offerable(c: Cultivator): string[] {
  return ITEMS.filter((i) => i.uses.offer && itemCount(c, i.id) > 0).map((i) => i.id);
}

/**
 * What an item with the offer use does on this ladder's major attempt: its tags sized by rarity,
 * doubled by a ladder tag on its own ladder, and a step of odds if it is of your root's element.
 */
export function offerEffect(c: Cultivator, which: LadderId, id: string): OfferEffect {
  const it = item(id);
  const offer = it.uses.offer;
  const out: OfferEffect = {
    odds: 0,
    margin: 0,
    detox: 0,
    purifying: false,
    guarding: false,
    surging: false,
    heavenly: false,
  };
  if (!offer) return out;
  const rank = rarityRank(it.rarity);
  const m = offer.ladder === which ? OFFER_LADDER_MULTIPLIER : 1;
  for (const tag of offer.tags) {
    if (tag === 'steadying') out.odds += OFFER_ODDS[rank]! * m;
    if (tag === 'surging') {
      out.margin += OFFER_MARGIN[rank]! * m;
      out.odds -= OFFER_ODDS[rank]! * m;
      out.surging = true;
    }
    if (tag === 'purifying') {
      out.purifying = true;
      out.detox += OFFER_DETOX[rank]! * m;
    }
    if (tag === 'guarding') out.guarding = true;
  }
  if (it.element && c.rootElements.includes(it.element)) out.odds += OFFER_ELEMENT_ODDS;
  out.heavenly = rank >= rarityRank('gold');
  return out;
}

/**
 * What the chosen items do on this ladder's major attempt, with the gate pill (null for none)
 * laid as well. The same item may be laid more than once if you hold enough.
 */
export function offerings(
  c: Cultivator,
  which: LadderId,
  chosen: readonly string[],
  gate: string | null,
): Offerings {
  const laid = gate && !chosen.includes(gate) ? [gate, ...chosen] : [...chosen];
  const out: Offerings = {
    laid,
    margins: [],
    valid: true,
    odds: 0,
    margin: 0,
    purifying: false,
    detox: 0,
    guarding: false,
    clash: false,
    heavenly: false,
  };
  const invalid = (reason: string): Offerings => ({ ...out, valid: false, reason });
  if (laid.length > MAX_OFFERINGS) return invalid(`At most ${MAX_OFFERINGS} offerings.`);
  const counts = new Map<string, number>();
  for (const id of laid) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const [id, n] of counts) {
    if (!hasItem(id) || !item(id).uses.offer) return invalid(`${id} can't be offered.`);
    if (itemCount(c, id) < n) return invalid(`You hold too few of ${item(id).name}.`);
  }
  let surging = 0;
  for (const id of laid) {
    const e = offerEffect(c, which, id);
    out.odds += e.odds;
    out.margin += e.margin;
    out.margins.push(e.margin);
    out.detox += e.detox;
    out.purifying ||= e.purifying;
    out.guarding ||= e.guarding;
    out.heavenly ||= e.heavenly;
    if (e.surging) surging += 1;
  }
  out.clash = surging >= 2;
  return out;
}
