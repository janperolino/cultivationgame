// The craft deck (K12, design § Production, commissions and the craft deck): it joins once you
// hold a tool or a field, takes your wheel's share of Craft hours of the paced draws (at most
// half), is set where its field or market is with a real shop and keeper, and every card's every
// choice settles on the game, its stakes on the realm curve.
import { describe, expect, it } from 'vitest';
import { CARDS, card, type Card } from '../content/cards/index.ts';
import { hasItem } from '../content/items.ts';
import { REALM_IDS } from '../content/realms.ts';
import { shop } from '../content/shops.ts';
import { pushCard, resolveCard, drawCards, costStones } from './cards.ts';
import {
  atCraftTier,
  CRAFT_DECK,
  craftDeckOpen,
  craftPage,
  craftShare,
  craftTriggerHolds,
  craftWords,
} from './craftDeck.ts';
import { addCraftFame } from './craftRenown.ts';
import { takePlot } from './farming.ts';
import { addItem, newLife, withPlayer, type GameState } from './state.ts';

const DECK = CARDS.filter((k) => k.deck === CRAFT_DECK);

/** A crafter: a clay furnace, a forge and a brush, four Craft hours, a plot, a name, a batch on. */
function crafter(craftHours = 4): GameState {
  const s = newLife({ name: 'Han Li', seed: 'craft-deck' });
  let c = { ...s.player, stones: 5000 };
  for (const t of ['crude-clay-furnace', 'crude-iron-forge', 'wolf-hair-talisman-brush'])
    c = addItem(c, t, 1);
  c = { ...c, wheel: c.wheel.map((h, i) => (i >= 2 && i < 2 + craftHours ? 'craft' : h)) };
  c = takePlot(
    c,
    { place: 'spear-plow', land: 'plains', density: 3 },
    'rented',
    s.calendar.day,
  ).cultivator;
  c = addCraftFame(c, 'qm-bianhuang', 'alchemy', 7, s.calendar.day);
  c = {
    ...c,
    crafts: {
      ...c.crafts,
      front: { recipe: 'qi-gathering-pill', above: false, hours: 1 },
      recent: [
        { day: 0, recipe: 'qi-gathering-pill', made: 'qi-gathering-pill', count: 10, blew: false },
      ],
    },
  };
  return withPlayer(s, c);
}

/** A card waiting in the feed with its words, as the draw sets it. */
function waiting(s: GameState, k: Card): GameState {
  const next = pushCard(s, k.id);
  const words = craftWords(next, k)!;
  const pending = next.cards.pending.map((p) =>
    p.card === k.id ? { ...p, words, vars: { here: 1 } } : p,
  );
  return { ...next, cards: { ...next.cards, pending } };
}

describe('the craft deck', () => {
  it('joins once you hold a tool or a field, its share your Craft hours, at most half', () => {
    const plain = newLife({ name: 'Han Li', seed: 'craft-deck' });
    expect(craftDeckOpen(plain.player)).toBe(false);
    expect(craftShare(plain.player)).toBe(0);
    expect(craftShare(crafter(4).player)).toBeCloseTo(4 / 12);
    expect(craftShare(crafter(10).player)).toBe(0.5);
  });

  it('has about twelve cards, each set somewhere with a person or a door', () => {
    expect(DECK.length).toBeGreaterThanOrEqual(12);
    const s = crafter();
    for (const k of DECK) {
      expect(k.setAt, k.id).toBeTruthy();
      const w = craftWords(s, k);
      expect(w, k.id).not.toBeNull();
      if (k.setAt === 'market' || k.setAt === 'renown') {
        expect(shop(w!._shop!).name).toBe(w!.shop);
        expect(w!.keeper).toBeTruthy();
      }
      if (k.setAt === 'field') expect(w!.neighbour).toBeTruthy();
    }
  });

  it('settles every choice of every card without you, its costs on the realm curve', () => {
    for (const k of DECK)
      k.choices.forEach((ch, i) => {
        const s = waiting(crafter(), k);
        const uid = s.cards.pending.find((p) => p.card === k.id)!.uid;
        const r = resolveCard(s, uid, i, { byDefault: true });
        expect(r.ok, `${k.id} ${i} ${r.reason ?? ''}`).toBe(true);
        expect(costStones(s.player, ch)).toBe(ch.cost?.stones ?? 0);
      });
  });

  it('lights the page of a bench or field card', () => {
    const s = crafter();
    const field = card('craft-footprints-in-the-furrows');
    const bench = card('craft-fire-leaps');
    expect(craftPage(field, craftWords(s, field)!)).toBe('farming');
    expect(craftPage(bench, craftWords(s, bench)!)).toBe('alchemy');
  });

  it('a steward’s order puts a commission by name on your list, at the card’s shop', () => {
    const k = card('craft-stewards-order');
    const s = waiting(crafter(), k);
    const uid = s.cards.pending.find((p) => p.card === k.id)!.uid;
    const r = resolveCard(s, uid, 0);
    const held = r.state.player.crafts.commissions ?? [];
    expect(held).toHaveLength(1);
    expect(held[0]!.shop).toBe(s.cards.pending.find((p) => p.uid === uid)!.words!._shop);
    expect(held[0]!.n).toBe(20);
  });

  it('draws craft cards about at the share of the paced draws', () => {
    let s = crafter(4);
    // The chain's first lesson isn't begun in a bare life, so the decks are open.
    let craft = 0;
    let all = 0;
    for (let i = 0; i < 4000; i++) {
      s = { ...s, calendar: { ...s.calendar, day: s.calendar.day + 1 } };
      s = drawCards(s);
      for (const p of s.cards.pending) {
        if (card(p.card).deck === CRAFT_DECK) craft++;
        if (['craft', 'seclusion'].includes(card(p.card).deck)) all++;
      }
      s = { ...s, cards: { ...s.cards, pending: [] } };
    }
    expect(craft).toBeGreaterThan(0);
    expect(craft / all).toBeGreaterThan(0.15);
    expect(craft / all).toBeLessThan(0.5);
  });

  it('gives every thing a card lifts to your craft tier, at every realm (review 2026-10-21)', () => {
    const lifted: { id: string; rarity?: string }[] = [];
    JSON.stringify(DECK, (_k, v: unknown) => {
      const e = v as { do?: string; craftTier?: boolean; id?: string; rarity?: string } | null;
      if (e?.do === 'item' && e.craftTier && e.id) lifted.push({ id: e.id, rarity: e.rarity });
      return v;
    });
    expect(lifted.length).toBeGreaterThan(0);
    const c = newLife({ name: 'Han Li', seed: 'craft-deck' }).player;
    for (const realm of REALM_IDS) {
      const at = { ...c, qi: { ...c.qi, realm } };
      for (const e of lifted) expect(hasItem(atCraftTier(at, e.id, e.rarity))).toBe(true);
    }
  });

  it('asks for an order of your make only when one is named and there is room (review 2026-10-21)', () => {
    const t = { crafts: ['alchemy'] as const, made: true };
    const s = crafter();
    expect(craftTriggerHolds(s, t)).toBe(true);
    // Only a mend of late: nothing of your make to name.
    const mended = withPlayer(s, {
      ...s.player,
      crafts: {
        ...s.player.crafts,
        recent: [
          {
            day: 0,
            recipe: 'qi-gathering-pill',
            made: 'qi-gathering-pill',
            count: 1,
            blew: false,
            mend: true,
          },
        ],
      },
    });
    expect(craftTriggerHolds(mended, t)).toBe(false);
  });
});
