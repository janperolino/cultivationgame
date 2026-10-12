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

export interface Offerings {
  /** Every item laid, the gate pill first when there is one. */
  laid: string[];
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
    const it = item(id);
    const offer = it.uses.offer!;
    const rank = rarityRank(it.rarity);
    const m = offer.ladder === which ? OFFER_LADDER_MULTIPLIER : 1;
    for (const tag of offer.tags) {
      if (tag === 'steadying') out.odds += OFFER_ODDS[rank]! * m;
      if (tag === 'surging') {
        out.margin += OFFER_MARGIN[rank]! * m;
        out.odds -= OFFER_ODDS[rank]! * m;
        surging += 1;
      }
      if (tag === 'purifying') {
        out.purifying = true;
        out.detox += OFFER_DETOX[rank]! * m;
      }
      if (tag === 'guarding') out.guarding = true;
    }
    if (it.element && c.rootElements.includes(it.element)) out.odds += OFFER_ELEMENT_ODDS;
    if (rank >= rarityRank('gold')) out.heavenly = true;
  }
  out.clash = surging >= 2;
  return out;
}
