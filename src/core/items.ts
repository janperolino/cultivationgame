// Using items outside a fight (design § Items and gear): eating a pill or a fruit feeds a ladder or
// cuts toxicity, scaled by the toxicity already in you, and adds its own dose. Reaching the cap
// unsettles the ladder the pill fed. Fight uses live in core/combat/.
import {
  BODY_PER_DAY,
  QI_PER_DAY,
  SOUL_PER_DAY,
  TOXICITY_MAX,
  UNSETTLED_DAYS,
  type LadderId,
} from '../content/cultivation.ts';
import { hasItem, item } from '../content/items.ts';
import { rarityMultiplier } from '../content/rarity.ts';
import { REALMS, realmScale, tierStep } from '../content/realms.ts';
import { fromWorld, type Note } from './cultivation.ts';
import { addItem, itemCount, type Cultivator } from './state.ts';
import { addToxicity, pillDose, toxicityScale } from './toxicity.ts';

const PER_DAY: Record<LadderId, number> = {
  qi: QI_PER_DAY,
  body: BODY_PER_DAY,
  soul: SOUL_PER_DAY,
};

export interface ConsumeResult {
  cultivator: Cultivator;
  /** False when the item isn't held or can't be eaten; the cultivator is unchanged. */
  used: boolean;
  /** What each effect did after toxicity: fuel in bar units, detox in meter points. */
  fuel: number;
  dose: number;
  notes: Note[];
}

/** Eats or drinks one of an item, out of a fight, on this world day. */
export function consumeItem(c: Cultivator, id: string, day: number): ConsumeResult {
  const none = { cultivator: c, used: false, fuel: 0, dose: 0, notes: [] };
  if (!hasItem(id) || itemCount(c, id) <= 0) return none;
  const it = item(id);
  const use = it.uses.consume;
  if (!use) return none;
  const scale = toxicityScale(c);
  let next = addItem(c, id, -1);
  let fuel = 0;
  let fed: LadderId = 'qi';
  for (const e of use.effects) {
    if (e.effect === 'fuel') {
      const tierRealm = REALMS[Math.min(it.tier, REALMS.length) - 1]!.id;
      fuel =
        e.days *
        PER_DAY[e.ladder] *
        realmScale(tierRealm) *
        rarityMultiplier(it.rarity, tierStep(it.tier)) *
        scale;
      next = fromWorld(next, e.ladder, fuel);
      fed = e.ladder;
    }
    // A detox pill isn't poisoned by what it clears.
    if (e.effect === 'detox') next = addToxicity(next, -e.amount);
  }
  const dose = pillDose(c, it);
  next = addToxicity(next, dose);
  const notes: Note[] = [];
  if (dose > 0 && next.toxicity >= TOXICITY_MAX) {
    const l = next[fed];
    next = {
      ...next,
      [fed]: { ...l, unsettledUntil: Math.max(l.unsettledUntil, day + UNSETTLED_DAYS) },
    };
    notes.push({ type: 'toxic', data: { ladder: fed, item: id } });
  }
  return { cultivator: next, used: true, fuel, dose, notes };
}
