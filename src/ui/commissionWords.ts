// Words the commission UI shares (K12): a commission's ask in a line, whole days, and whether a
// shop's counter has a Commission tab.
import { item } from '../content/items.ts';
import { RARITY_IDS, rarityRank, type RarityId } from '../content/rarity.ts';
import { commissionsOf, makesToOrder, offeredAt, ordersAt } from '../core/commissions.ts';
import type { GameState } from '../core/state.ts';

const COUNT_WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const countWord = (n: number) => COUNT_WORDS[n] ?? String(n);
/** Whole days, rounded up: "1 day", "3 days". */
export const days = (n: number) => {
  const d = Math.max(1, Math.ceil(n));
  return `${d} ${d === 1 ? 'day' : 'days'}`;
};

/** "Ten Spring-Returning Pills, tier 1, green or better". */
export function commissionAsk(k: { thing: string; n: number; floor: RarityId }): string {
  const it = item(k.thing);
  const name = k.n > 1 && !it.name.endsWith('s') ? `${it.name}s` : it.name;
  const n = k.n === 10 ? 'Ten' : k.n === 20 ? 'Twenty' : countWord(k.n);
  const top = rarityRank(k.floor) >= RARITY_IDS.length - 1;
  return `${n} ${name}, tier ${it.tier}, ${k.floor}${top ? '' : ' or better'}`;
}

/** Whether a shop's counter has a Commission tab: it posts, makes to order, or holds yours. */
export function hasCommissionTab(game: GameState, shopId: string): boolean {
  return (
    offeredAt(game, shopId).length > 0 ||
    !!makesToOrder(shopId) ||
    commissionsOf(game.player).some((k) => k.shop === shopId && !k.done) ||
    ordersAt(game.player, shopId).length > 0
  );
}
