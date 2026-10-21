// E3: trading yourself and methods in the market (design § Economy, Trading yourself, Methods in
// the market). Staples stand on the shelf where they are made and sell lot by lot; a mortal shop
// trades them in taels; a found method sold at the City spreads to its shelf and Corral Town's; a
// power's own method is refused at its hall and taken by the black market; a sealed slip sells
// once and is never stocked; and a copy's form is a book or a slip. The haul's mark itself is
// `npm run sim -- haul`.
import { describe, expect, it } from 'vitest';
import { COPY_FORM_WORDS, copyForm } from '../content/copies.ts';
import { DAYS_PER_MONTH } from '../content/calendar.ts';
import { item } from '../content/items.ts';
import { bagStacks } from './gear.ts';
import { monthUse, restOf } from './making.ts';
import { goodOf, guardedBy, market, seenIn, spreads, standingCopies, supplyOf } from './markets.ts';
import { shop } from '../content/shops.ts';
import { emptyWorld, heatOf, standingOf } from './resolver/world.ts';
import { loadSave, makeSave } from './save/format.ts';
import { buy, offerFor, sell, shelf, standsAt, stockOf } from './shops.ts';
import { styleLines } from './styles.ts';
import { addItem, newLife, withPlayer, type GameState } from './state.ts';

const life = (seed = 'trading'): GameState => {
  const s = newLife({ name: 'Han Li', seed });
  return withPlayer(s, { ...s.player, stones: 5000, silver: 500, items: {} });
};
const nextMonth = (s: GameState): GameState => ({
  ...s,
  calendar: {
    ...s.calendar,
    day: (Math.floor(s.calendar.day / DAYS_PER_MONTH) + 1) * DAYS_PER_MONTH,
  },
});
const withCopy = (s: GameState, id: string): GameState =>
  withPlayer(s, { ...s.player, copies: { ...s.player.copies, [id]: 1 } });
const standing = (s: GameState, shopId: string, thing: string) =>
  shelf(s, shopId).find((l) => l.standing && l.thing === thing);

const FOUND = 'method:pillar-shadow-nourishing';
const GATE = 'method:butcher-saber';
const SEALED = 'method:bone-marrow-fire-art';

describe('staples stand on the shelf where they are made', () => {
  it('Pacified Fort’s free market stands spirit rice every month, its count falling as you buy', () => {
    // The sutler, a notable stall, always carries its street's biggest good (E5).
    for (let month = 0; month < 12; month++)
      expect(
        stockOf('march-stall', month).some((l) => l.standing && l.thing === 'spirit-rice'),
      ).toBe(true);
    let s = life();
    const small = 'pacified-fort.stall-small';
    const first = standing(s, small, 'spirit-rice')!;
    expect(first.n).toBeGreaterThan(200);
    for (let i = 0; i < 3; i++) {
      const r = buy(s, small, first.slot, 20);
      if (!r.ok) throw new Error(r.reason);
      s = r.state;
    }
    expect(standing(s, small, 'spirit-rice')!.n).toBe(first.n - 60);
    // The sutler's own count is its own: what the small shops sold doesn't empty it.
    expect(standing(s, 'march-stall', 'spirit-rice')!.n).toBe(
      standing(life(), 'march-stall', 'spirit-rice')!.n,
    );
    // Each lot leaves less: the Fort eats about 2,700 sacks a month, so three lots move it a few
    // points, under the shelf's rounding of a tenth of a stone (E4).
    const fort = market('pacified-fort')!;
    expect(supplyOf(s.world, fort, 'spirit-rice', s.calendar.day)).toBeLessThan(
      supplyOf(life().world, fort, 'spirit-rice', s.calendar.day),
    );
    // Three lots, three Bag squares.
    expect(bagStacks(s.player).filter((x) => x.id === 'spirit-rice').length).toBe(3);
  });

  it('is tiered like anything else: River-Bend’s Foundation free market stands tier 2 rice', () => {
    const s = life();
    const small = 'qm-hewan-cheng.stall-small';
    const lines = shelf(s, small).filter((l) => l.standing);
    expect(lines.some((l) => l.thing === 'spirit-rice')).toBe(true);
    const t2 = lines.find((l) => l.thing.startsWith('spirit-rice~') && item(l.thing).tier === 2);
    expect(t2).toBeDefined();
    expect(t2!.price).toBeGreaterThan(standing(s, small, 'spirit-rice')!.price * 5);
  });

  it('a trading house stands only what its market’s sum counts, its copies and its styles’ goods', () => {
    const city = market('qm-shoukou-cheng')!;
    // The Qian Clan holds the frontier's common styles, so its hall brews their goods too (K6).
    const styled = new Set(styleLines(shop('mouth-guild')).map((l) => l.thing));
    expect(styled.size).toBeGreaterThan(0);
    for (let month = 0; month < 12; month++) {
      const stands = standsAt(emptyWorld(), city, month);
      for (const l of stockOf('mouth-guild', month))
        if (l.standing)
          expect(l.endless || stands.has(goodOf(l.thing)) || styled.has(l.thing)).toBe(true);
    }
  });
});

describe('selling lot by lot', () => {
  it('ten lots sold at once fetch what ten sold one at a time do', () => {
    let s = life();
    s = withPlayer(s, addItem(s.player, 'spirit-rice', 200));
    const once = sell(s, 'eyes-alchemy', 'spirit-rice', 200);
    let apart = s;
    for (let i = 0; i < 10; i++) {
      const r = sell(apart, 'eyes-alchemy', 'spirit-rice', 20);
      if (!r.ok) throw new Error(r.reason);
      apart = r.state;
    }
    if (!once.ok) throw new Error(once.reason);
    expect(once.state.player.stones).toBeCloseTo(apart.player.stones, 1);
  });

  it('Sinkhole Terraces wants rice, and the want fades as it fills', () => {
    let s = withPlayer(life(), addItem(life().player, 'spirit-rice', 200));
    const first = offerFor(s, 'eyes-alchemy', 'spirit-rice');
    expect(first.ok && first.wanted).toBe(true);
    const r = sell(s, 'eyes-alchemy', 'spirit-rice', 200);
    if (!r.ok) throw new Error(r.reason);
    s = r.state;
    const later = offerFor(s, 'eyes-alchemy', 'spirit-rice');
    expect(later.ok && first.ok && later.each < first.each).toBe(true);
    // The terraces eat about 1,900 sacks a month, so ten lots move it 100 points a month's worth
    // (E4): about ten.
    const terraces = market('sinkhole-terraces')!;
    const month = Math.floor(s.calendar.day / DAYS_PER_MONTH);
    expect(supplyOf(s.world, terraces, 'spirit-rice', s.calendar.day)).toBeCloseTo(
      restOf(s.world, terraces, 'spirit-rice', month)! +
        (200 * 100) / monthUse(s.world, terraces, 'spirit-rice', month)!,
      1,
    );
  });
});

describe('mortal staples trade in taels', () => {
  it('a terrace store buys millet in silver, and a stall won’t touch it', () => {
    const s = withPlayer(life(), addItem(life().player, 'frontier-millet', 20));
    expect(offerFor(s, 'eyes-stall', 'frontier-millet').ok).toBe(false);
    const r = sell(s, 'eyes-mortal', 'frontier-millet', 20);
    if (!r.ok) throw new Error(r.reason);
    expect(r.state.player.silver).toBeGreaterThan(s.player.silver);
    expect(r.state.player.stones).toBe(s.player.stones);
    expect(standing(s, 'march-mortal', 'frontier-millet')).toBeDefined();
  });
});

describe('a found method spreads once sold', () => {
  it('sold at the City, it is on its shelf next month and on Corral Town’s', () => {
    let s = withCopy(life(), FOUND);
    const city = market('qm-shoukou-cheng')!;
    const offer = offerFor(s, 'mouth-guild', FOUND);
    expect(offer.ok && offer.wanted).toBe(true);
    const r = sell(s, 'mouth-guild', FOUND);
    if (!r.ok) throw new Error(r.reason);
    s = r.state;
    // Copied at once, so the next one is paid the shop's rate…
    expect(seenIn(s.world, city, FOUND).source).toBe('made');
    const again = offerFor(withCopy(s, FOUND), 'mouth-guild', FOUND);
    expect(again.ok && !again.wanted && offer.ok && again.each < offer.each).toBe(true);
    // …and on the shelves from next month, here and lent through the City's reach.
    expect(standing(s, 'mouth-stall', FOUND)).toBeUndefined();
    const next = nextMonth(s);
    expect(standing(next, 'mouth-stall', FOUND)).toBeDefined();
    expect(standing(next, 'mouth-guild', FOUND)).toBeDefined();
    expect(standing(next, 'herders-guild', FOUND)).toBeDefined();
    expect(seenIn(next.world, market('corral-town')!, FOUND).source).toBe('reach');
    // A shop that never sells copies stands none.
    expect(standingCopies(next.world, shop('mouth-alchemy'), 99)).toEqual([]);
  });
});

describe('a power’s methods are guarded', () => {
  it('the Gate’s method is the Gate’s, and Stone-Bearing, sold at a guild hall too, nobody’s', () => {
    expect(guardedBy(GATE)).toBe('qm-tushou-men');
    expect(guardedBy('method:stone-bearing-foundation')).toBeNull();
    expect(guardedBy(FOUND)).toBeNull();
  });

  it('is refused at the Gate’s own hall with heat, refused at the City, and bought at the Night Bridge', () => {
    const s = withCopy(life(), GATE);
    const day = s.calendar.day;
    const gate = sell(s, 'gate-sect', GATE);
    expect(gate.ok).toBe(false);
    if (gate.ok || !gate.state) throw new Error('the Gate should know it');
    expect(heatOf(gate.state.world, 'qm-tushou-men', day)).toBe(2);
    expect(standingOf(gate.state.world, 'qm-tushou-men', s.player.id, day).total).toBeLessThan(
      standingOf(s.world, 'qm-tushou-men', s.player.id, day).total,
    );
    expect(sell(s, 'mouth-guild', GATE).ok).toBe(false);
    const bridge = sell(s, 'bridge-black', GATE);
    if (!bridge.ok) throw new Error(bridge.reason);
    expect(bridge.state.player.copies[GATE]).toBe(0);
    // It leaks at the sea-cave market alone: never on an honest shelf, never lent.
    const next = nextMonth(bridge.state);
    expect(standing(next, 'bridge-black', GATE)).toBeDefined();
    expect(standing(next, 'bridge-stall', GATE)).toBeUndefined();
    expect(standing(next, 'wall-stall', GATE)).toBeUndefined();
  });
});

describe('sealed slips', () => {
  it('a gold slip is sealed, sells once as itself, and is never stocked', () => {
    expect(copyForm(SEALED)).toBe('sealed');
    expect(spreads(SEALED, false)).toBe(false);
    const s = withCopy(life(), SEALED);
    const r = sell(s, 'mouth-guild', SEALED);
    if (!r.ok) throw new Error(r.reason);
    const city = market('qm-shoukou-cheng')!;
    expect(r.state.world.copied[city.id]?.[SEALED]).toBeUndefined();
    // One piece at 25 points, in a market twice an ordinary one's size: 100 stands at 112.5.
    expect(supplyOf(r.state.world, city, SEALED, s.calendar.day)).toBeCloseTo(112.5, 0);
    const next = nextMonth(r.state);
    for (const id of city.shops) expect(standing(next, id, SEALED)).toBeUndefined();
  });
});

describe('a copy’s form', () => {
  it('is a book at tier 1, a jade slip from tier 2, sealed at gold', () => {
    expect(copyForm('method:crude-cave')).toBe('book');
    expect(copyForm('method:crude-cave-foundation')).toBe('slip');
    expect(copyForm('technique:collapsing-karst-palm')).toBe('book');
    expect(copyForm(SEALED)).toBe('sealed');
    expect(COPY_FORM_WORDS.slip).toBe('a jade slip');
  });

  it('the opening chapters spread; every chapter on a market shelf is one', () => {
    expect(spreads('method:cadet-spear-foundation', false)).toBe(true);
    for (let month = 0; month < 6; month++)
      for (const id of ['mouth-guild', 'herders-guild', 'bend-guild'])
        for (const l of stockOf(id, month))
          if (l.thing.startsWith('method:')) expect(spreads(l.thing, false)).toBe(true);
  });
});

describe('the save', () => {
  it('keeps a market’s copies, and a v34 save loads with none', () => {
    const r = sell(withCopy(life(), FOUND), 'mouth-guild', FOUND);
    if (!r.ok) throw new Error(r.reason);
    const back = loadSave(JSON.parse(JSON.stringify(makeSave(r.state, 1))));
    expect(back.state.world.copied).toEqual(r.state.world.copied);
    const raw = JSON.parse(JSON.stringify(makeSave(life(), 1))) as {
      version: number;
      state: { world: Record<string, unknown> };
    };
    raw.version = 34;
    delete raw.state.world.copied;
    const old = loadSave(raw);
    expect(old.version).toBe(48);
    expect(old.state.world.copied).toEqual({});
  });
});
