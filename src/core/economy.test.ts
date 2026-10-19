// P3.5: the catalogs, quality variants, prices, the purse by grade and silver, shops (stock by
// month, buying, selling, haggling, stolen goods, repairs), loot (an NPC's real kit, an elder's
// ring, beast parts, the lucky rogue's find), the kept rule, armor's wear and save v23.
import { describe, expect, it } from 'vitest';
import { CATALOGS } from '../content/catalogs/index.ts';
import { RARE } from '../content/catalogs/rare.ts';
import { copyOf, hasCopy } from '../content/copies.ts';
import { hasItem, item, ITEMS, rarityRange, variantId } from '../content/items.ts';
import { hasMethod, method } from '../content/methods.ts';
import { rarity, rarityRank } from '../content/rarity.ts';
import { template } from '../content/roster.ts';
import { SHOPS } from '../content/shops.ts';
import { STATS } from '../content/stats.ts';
import { hasTechnique, technique, TECHNIQUES } from '../content/techniques.ts';
import { techniqueArt } from '../content/manuals.ts';
import { fromCultivator, wearFrom, wornArmor } from './combat/combatant.ts';
import { generateBeast, generateCultivator } from './combat/generate.ts';
import { keep, keptHaul, keptNpc, noteTaken, threaded } from './kept.ts';
import { damageArmor, findOf, kitOf, openRings, opensRing, ringOf, ringTier } from './loot.ts';
import { priceOf } from './prices.ts';
import {
  changeDown,
  changeUp,
  pay,
  priceWords,
  purseWords,
  toSilver,
  toStones,
  type Stones,
} from './purse.ts';
import { actorFromNpc, plainActor, rosterActor } from './resolver/actor.ts';
import { remember } from './resolver/opinion.ts';
import { leaveScene, startScene } from './resolver/scene.ts';
import { Rng } from './rng.ts';
import { loadSave, makeSave } from './save/format.ts';
import { buy, haggle, offerFor, repair, repairCost, sell, shelf, stockOf } from './shops.ts';
import { addItem, newLife, withPlayer, type GameState } from './state.ts';

const life = (seed = 'economy'): GameState => newLife({ name: 'Han Li', seed });
const rich = (s: GameState, low = 10_000): GameState => withPlayer(s, { ...s.player, stones: low });
const FE = (s: GameState): GameState =>
  withPlayer(s, {
    ...s.player,
    qi: { ...s.player.qi, realm: 'foundation-establishment', stage: 1 },
  });

/** Whether a thing a shop or a ring names is real: an item variant or a copy the game holds. */
function real(thing: string): boolean {
  if (hasCopy(thing)) {
    const of = copyOf(thing)!;
    return of.kind === 'method'
      ? hasMethod(of.id)
      : of.kind === 'technique'
        ? hasTechnique(of.id)
        : true;
  }
  return hasItem(thing);
}

describe('the catalogs', () => {
  it('name only real things, each stocked by a shop kind or found as loot', () => {
    for (const c of [...CATALOGS, RARE]) {
      for (const lot of c.lots) {
        expect(real(lot.thing), `${c.at}: ${lot.thing}`).toBe(true);
        if (lot.count) expect(lot.count[0]).toBeLessThanOrEqual(lot.count[1]);
      }
    }
  });

  it('write every thing they hold into a lot, and every property and node on a real stat', () => {
    for (const c of [...CATALOGS, RARE]) {
      const lots = new Set(c.lots.map((l) => l.thing));
      for (const it of c.items ?? []) {
        expect(lots.has(it.id), it.id).toBe(true);
        expect(it.kind, it.id).toBeDefined();
        for (const p of it.properties ?? [])
          for (const e of p.effects) expect(STATS).toHaveProperty(e.stat);
      }
      for (const m of c.methods ?? []) {
        expect(lots.has(`method:${m.id}`), m.id).toBe(true);
        for (const p of m.properties)
          for (const e of p.effects) expect(STATS).toHaveProperty(e.stat);
      }
      for (const t of c.techniques ?? []) {
        expect(lots.has(`technique:${t.id}`), t.id).toBe(true);
        expect(techniqueArt(t.id), t.id).toBeDefined();
      }
    }
  });

  it('keep the gold and red list to written gold and red, every technique with its Art', () => {
    for (const lot of RARE.lots) {
      const r = hasCopy(lot.thing)
        ? (copyOf(lot.thing)!.kind === 'method'
            ? method(copyOf(lot.thing)!.id)
            : technique(copyOf(lot.thing)!.id)
          ).rarity
        : item(lot.thing).rarity;
      expect(['gold', 'red'], lot.thing).toContain(r);
    }
    expect(TECHNIQUES.every((t) => techniqueArt(t.id))).toBe(true);
  });
});

describe('quality variants', () => {
  it('take the properties their rarity grants, from the written list in order', () => {
    expect(item('water-silk-robe').properties).toHaveLength(1);
    const purple = item(variantId('water-silk-robe', 'purple'));
    expect(purple.id).toBe('water-silk-robe~purple');
    expect(purple.properties!.map((p) => p.name)).toEqual(['Light Weave', 'Never Quite Dry']);
    expect(item('shark-tooth-spear').properties).toHaveLength(0);
    expect(item('shark-tooth-spear~blue').properties).toHaveLength(1);
  });

  it('exist only inside the written range, and the plain id is the written rarity', () => {
    expect(variantId('iron-sword', 'white')).toBe('iron-sword');
    expect(hasItem('iron-sword~green')).toBe(true);
    expect(hasItem('iron-sword~blue')).toBe(false);
    expect(hasItem('cold-moon-sword~gold')).toBe(false);
    expect(rarityRange(item('qi-gathering-pill'))).toEqual(['white', 'green', 'blue']);
  });

  it('carry a tier for a beast part or a pill drawn at its maker’s tier, and stand damaged a step down', () => {
    const core = item(variantId('beast-core', 'blue', { tier: 2 }));
    expect(core).toMatchObject({ tier: 2, rarity: 'blue' });
    expect(hasItem('iron-sword~white~t2')).toBe(false);
    const d = item(variantId('crab-shell-vest', 'white', { damaged: true }));
    expect(d).toMatchObject({ damaged: true, name: 'Damaged Crab-Shell Vest' });
  });
});

describe('prices', () => {
  it('follow the yardstick: a few low for a pill, about 400 for a Foundation blade', () => {
    expect(priceOf('qi-gathering-pill')).toBe(3);
    expect(priceOf('qi-gathering-pill~blue')).toBe(15);
    expect(priceOf('azure-cloud-sword')).toBe(45 * 9 * 5);
    expect(priceOf('iron-sword')).toBe(45);
    expect(priceOf('storage-pouch')).toBe(60);
    expect(priceOf('beast-core')).toBe(2.5);
    expect(priceOf('beast-core~white')).toBe(5);
    // A written price moves with the tier too: a Foundation beast's core is Foundation money.
    expect(priceOf('beast-core~white~t2')).toBe(5 * 9);
  });

  it('price a region’s gates as Jan’s note has it, and a copy by what it teaches', () => {
    expect(priceOf('foundation-pill')).toBe(1000);
    expect(priceOf('foundation-pill', 'qm-bianhuang')).toBe(1500);
    expect(priceOf('soul-condensing-pill', 'qm-bianhuang')).toBe(2000);
    expect(priceOf('marrow-washing-pill', 'qm-bianhuang')).toBe(600);
    expect(priceOf('method:garrison-standard')).toBe(60);
    expect(priceOf('technique:reef-road-thrust')).toBe(30 * 2);
  });
});

describe('the purse', () => {
  const at = (low: number, mid = 0, high = 0): Stones => [low, mid, high, 0];

  it('reads prices in the largest grade that reads cleanly, and the purse grade by grade', () => {
    expect(priceWords(40)).toBe('40 low');
    expect(priceWords(2400)).toBe('2.4 mid');
    const s = life().player;
    expect(
      purseWords({ ...s, stones: 240, higherStones: { mid: 3, high: 0, top: 0 }, silver: 85 }),
    ).toBe('3 mid · 240 low · 85 taels');
  });

  it('pays the posted grade first, then lower grades at 1,200 a stone above', () => {
    expect(pay(at(100), 40)).toEqual(at(60));
    expect(pay(at(0, 3), 2000)).toEqual(at(0, 1));
    // 2.4 mid paid with 2 mid and the rest in low at the premium: 0.4 mid is 480 low.
    expect(pay(at(1000, 2), 2400)).toEqual(at(520, 0));
    // With only low stones a mid price costs 1,200 a mid.
    expect(pay(at(3000), 2000)).toEqual(at(600));
    expect(pay(at(100), 101)).toBeNull();
  });

  it('breaks a higher stone into 1,100 of the grade below to make change', () => {
    expect(pay(at(0, 1), 40)).toEqual(at(1060, 0));
    expect(pay(at(0, 0, 1), 2000)).toEqual(at(0, 1098, 0));
  });

  it('costs both ways at a changer: 1,200 up, 1,100 down, 110 taels a stone out and 120 back', () => {
    expect(changeUp(at(1200), 'mid')).toEqual(at(0, 1));
    expect(changeUp(at(1199), 'mid')).toBeNull();
    expect(changeDown(at(0, 1), 'mid')).toEqual(at(1100, 0));
    const c = { stones: 10, silver: 0 };
    expect(toSilver(c, 2)).toEqual({ stones: 8, silver: 220 });
    expect(toStones({ stones: 0, silver: 240 }, 2)).toEqual({ stones: 2, silver: 0 });
    expect(toStones({ stones: 0, silver: 100 }, 1)).toBeNull();
  });
});

describe('shops', () => {
  it('stock the same lots for the same shop and month, and another month differs', () => {
    for (const s of SHOPS) {
      expect(stockOf(s.id, 1300)).toEqual(stockOf(s.id, 1300));
    }
    expect(stockOf('mouth-guild', 1300)).not.toEqual(stockOf('mouth-guild', 1301));
    // The seeded stall, pinned: a change to the catalogs or the roll shows here.
    expect(stockOf('mouth-stall', 1300).map((l) => l.thing)).toMatchInlineSnapshot(`
      [
        "qi-gathering-pill~green",
        "technique:porters-charge",
        "ash-wood-spear",
        "ember-talisman",
        "method:market-stall",
        "shark-marrow-pill",
      ]
    `);
  });

  it('stock only real things, inside their ranges, at the shop’s tiers', () => {
    for (const s of SHOPS) {
      for (let m = 1290; m < 1300; m++) {
        for (const lot of stockOf(s.id, m)) {
          expect(real(lot.thing), `${s.id}: ${lot.thing}`).toBe(true);
          expect(lot.price).toBeGreaterThan(0);
          if (!hasCopy(lot.thing)) expect(s.tiers).toContain(item(lot.thing).tier);
          if (s.kind === 'mortal') expect(item(lot.thing).taels).toBeDefined();
        }
      }
    }
  });

  it('roll a stall’s rarities low and a black market’s higher', () => {
    const rank = (id: string) => {
      let sum = 0;
      let n = 0;
      for (let m = 1000; m < 1100; m++) {
        for (const l of stockOf(id, m)) {
          if (hasCopy(l.thing)) continue;
          sum += rarityRank(item(l.thing).rarity);
          n++;
        }
      }
      return sum / n;
    };
    expect(rank('bridge-black')).toBeGreaterThan(rank('mouth-stall'));
  });

  it('sell a lot once a month, at its price, paid from the purse', () => {
    let s = rich(life());
    const lot = shelf(s, 'mouth-refiner')[0]!;
    const r = buy(s, 'mouth-refiner', lot.slot);
    expect(r.ok).toBe(true);
    s = (r as { state: GameState }).state;
    expect(s.player.stones).toBeCloseTo(10_000 - lot.price * lot.n);
    expect(s.player.items[lot.thing]).toBe(lot.n);
    expect(shelf(s, 'mouth-refiner').some((l) => l.slot === lot.slot)).toBe(false);
    expect(buy(s, 'mouth-refiner', lot.slot)).toMatchObject({ ok: false });
    // The month turns and the shelf is full again.
    const later = { ...s, calendar: { day: s.calendar.day + 30 } };
    expect(shelf(later, 'mouth-refiner')).toHaveLength(
      stockOf('mouth-refiner', Math.floor(later.calendar.day / 30)).length,
    );
  });

  it('hands a copy to the bookcase, and a mortal shop takes only silver', () => {
    let s = rich(life());
    const copyLot = (() => {
      for (let d = 0; d < 3000; d += 30) {
        const t = { ...s, calendar: { day: s.calendar.day + d } };
        const l = shelf(t, 'mouth-guild').find((x) => hasCopy(x.thing));
        if (l) return { t, l };
      }
      return null;
    })()!;
    const bought = buy(copyLot.t, 'mouth-guild', copyLot.l.slot) as { ok: true; state: GameState };
    expect(bought.state.player.copies[copyLot.l.thing]).toBe(copyLot.l.n);
    const mortal = shelf(s, 'mouth-mortal')[0]!;
    expect(buy(s, 'mouth-mortal', mortal.slot)).toMatchObject({ ok: false });
    s = withPlayer(s, { ...s.player, silver: 100 });
    const r = buy(s, 'mouth-mortal', mortal.slot) as { ok: true; state: GameState };
    expect(r.state.player.silver).toBeCloseTo(100 - mortal.price * mortal.n);
  });

  it('buy back at 40%, only what they deal in, out of a finite purse', () => {
    let s = withPlayer(life(), addItem(life().player, 'iron-sword', 120));
    const offer = offerFor(s, 'mouth-refiner', 'iron-sword');
    expect(offer.ok && offer.each).toBeCloseTo(45 * 0.4 * 1, 0);
    expect(offerFor(s, 'mouth-alchemy', 'iron-sword')).toMatchObject({ ok: false });
    const r = sell(s, 'mouth-refiner', 'iron-sword', 10) as { ok: true; state: GameState };
    expect(r.ok).toBe(true);
    s = r.state;
    expect(s.player.items['iron-sword']).toBe(110);
    expect(s.player.stones).toBeGreaterThan(150);
    // A refiner's 1,500 a month runs out before a hundred more swords are bought.
    expect(sell(s, 'mouth-refiner', 'iron-sword', 100)).toMatchObject({ ok: false });
  });

  it('serve a sect shop’s members only', () => {
    const s = rich(life());
    const lot = shelf(s, 'gate-sect')[0]!;
    expect(buy(s, 'gate-sect', lot.slot)).toMatchObject({
      ok: false,
      reason: 'It sells only to its own.',
    });
    const member = {
      ...s,
      world: { ...s.world, members: [{ who: s.player.id, power: 'qm-tushou-men', since: 0 }] },
    };
    expect(buy(member, 'gate-sect', lot.slot).ok).toBe(true);
  });

  it('haggle once a visit: a pass takes its share off, the keeper is kept', () => {
    const s = rich(life());
    const h = haggle(s, 'mouth-stall');
    expect(h.ok).toBe(true);
    const after = (h as { state: GameState }).state;
    expect(after.world.kept['keeper:mouth-stall']).toBeDefined();
    expect(haggle(after, 'mouth-stall')).toMatchObject({ ok: false });
    expect(haggle(s, 'mouth-bounty')).toMatchObject({ ok: false });
    const off = h.off!;
    expect([0, 0.1, 0.2]).toContain(off);
    const lot = shelf(after, 'mouth-stall')[0]!;
    const r = buy(after, 'mouth-stall', lot.slot) as { ok: true; state: GameState };
    expect(r.state.player.stones).toBeCloseTo(10_000 - lot.price * lot.n * (1 - off));
  });

  it('know a stolen thing sold back to the power it was taken from', () => {
    let s = withPlayer(life(), addItem(life().player, 'gutting-saber', 1));
    s = { ...s, world: { ...s.world, taken: { 'gutting-saber': 'qm-tushou-men' } } };
    s = {
      ...s,
      world: { ...s.world, members: [{ who: s.player.id, power: 'qm-tushou-men', since: 0 }] },
    };
    const r = sell(s, 'gate-sect', 'gutting-saber');
    expect(r).toMatchObject({ ok: false, reason: 'The keeper knows whose that was.' });
    expect(r.state!.world.heat['qm-tushou-men']).toBeDefined();
    // The black market never asks.
    expect(sell(s, 'bridge-black', 'gutting-saber').ok).toBe(true);
  });
});

describe('armor’s wear and repairs', () => {
  it('carries from fight to fight until a refiner mends it for a fifth of its price', () => {
    let s = rich(withPlayer(life(), addItem(life().player, 'boar-hide-vest', 1)));
    s = withPlayer(s, {
      ...s.player,
      gear: { ...s.player.gear, armor: 'boar-hide-vest' },
      items: {},
    });
    const fresh = wornArmor(s.player)!;
    expect(fresh.hp).toBe(fresh.max);
    const after = wearFrom(s.player, { armor: { ...fresh, hp: fresh.max / 2 } });
    expect(after.wear['boar-hide-vest']).toBe(0.5);
    expect(wornArmor(after)!.hp).toBe(Math.round(fresh.max / 2));
    expect(fromCultivator(after, 'a').armor!.hp).toBe(Math.round(fresh.max / 2));
    s = withPlayer(s, after);
    expect(repairCost(s, 'boar-hide-vest')).toBeCloseTo(45 * 0.2 * 0.5);
    expect(repair(s, 'mouth-stall', 'boar-hide-vest')).toMatchObject({ ok: false });
    const r = repair(s, 'mouth-refiner', 'boar-hide-vest') as { ok: true; state: GameState };
    expect(r.state.player.wear['boar-hide-vest']).toBeUndefined();
  });

  it('mends a damaged piece back to its rarity at half the price between', () => {
    const dmg = variantId('crab-shell-vest', 'white', { damaged: true });
    const s = rich(withPlayer(life(), addItem(life().player, dmg, 1)));
    expect(repairCost(s, dmg)).toBeCloseTo((priceOf('crab-shell-vest~green') - priceOf(dmg)) * 0.5);
    const r = repair(s, 'mouth-refiner', dmg) as { ok: true; state: GameState };
    expect(r.state.player.items['crab-shell-vest~green']).toBe(1);
    expect(r.state.player.items[dmg] ?? 0).toBe(0);
  });
});

describe('loot', () => {
  const elder = () =>
    generateCultivator(
      template('beast-butcher-disciple') as never,
      'foundation-establishment',
      3,
      new Rng(4242),
    );

  it('gives a cultivator their kit as written things: a weapon of their kind, armor, pills, stones', () => {
    const n = generateCultivator(
      template('march-conscript') as never,
      'qi-condensation',
      5,
      new Rng(7),
    );
    const kit = kitOf(n);
    const ids = Object.keys(kit.items);
    const weapon = ids.map(item).find((i) => i.uses.equip?.slot === 'weapon')!;
    expect(weapon.uses.equip!.weapon).toBe('spear');
    expect(weapon.rarity).toBe(
      rarityRank(n.rolls.weapon) <= rarityRank(weapon.upTo ?? weapon.rarity)
        ? n.rolls.weapon
        : weapon.rarity,
    );
    expect(ids.map(item).some((i) => i.uses.equip?.slot === 'armor')).toBe(true);
    expect(kit.stones).toBeGreaterThanOrEqual(5);
    expect(kit.stones).toBeLessThanOrEqual(30);
    for (const c of n.consumables) expect(hasItem(c.id)).toBe(true);
    expect(kitOf(n)).toEqual(kit);
  });

  it('fills a seeded elder’s ring the same way every time, at their tier and the one below', () => {
    const ring = ringOf(elder())!;
    expect(ring).toEqual(ringOf(elder()));
    const lots = Object.keys(ring.items);
    expect(lots.length).toBeGreaterThanOrEqual(1);
    for (const t of lots) {
      expect(real(t), t).toBe(true);
      if (!hasCopy(t)) expect(item(t).tier).toBeLessThanOrEqual(2);
    }
    expect(ring.stones).toBeGreaterThanOrEqual(50);
    // The pinned ring: a change to the catalogs or the roll shows here.
    expect(ring).toMatchInlineSnapshot(`
      {
        "items": {
          "antler-velvet-pill~green": 1,
          "beast-core": 1,
          "beast-fang": 3,
          "method:butcher-saber": 1,
          "python-skin-jerkin": 1,
        },
        "stones": 181,
      }
    `);
    expect(
      ringOf(
        generateCultivator(template('march-conscript') as never, 'qi-condensation', 5, new Rng(7)),
      ),
    ).toBeNull();
  });

  it('leaves a beast’s parts and core at its realm’s tier and its bloodline’s rarity', () => {
    const b = generateBeast(
      template('strait-shark') as never,
      'foundation-establishment',
      2,
      new Rng(9),
    );
    const kit = kitOf(b);
    for (const id of Object.keys(kit.items)) {
      expect(item(id)).toMatchObject({ tier: 2, rarity: b.rolls.bloodline });
    }
    expect(Object.keys(kit.items).some((id) => id.startsWith('beast-fin'))).toBe(true);
  });

  it('names the lucky rogue’s find from the gold and red list, and it drops with them', () => {
    let n = null;
    for (let i = 1; i < 5000 && !n; i++) {
      const x = generateCultivator(
        template('night-bridge-smuggler') as never,
        'qi-condensation',
        6,
        new Rng(i),
      );
      if (x.find) n = x;
    }
    expect(n).not.toBeNull();
    const find = findOf(n!)!;
    expect(RARE.lots.map((l) => l.thing)).toContain(find);
    expect(kitOf(n!).items[find]).toBe(1);
  });

  it('drops the armor the killing blow fell on one rarity lower and damaged', () => {
    const h = damageArmor(
      { items: { 'crab-shell-vest~blue': 1 }, stones: 0 },
      'crab-shell-vest~blue',
    );
    expect(h.items).toEqual({ 'crab-shell-vest~green~dmg': 1 });
  });

  it('keeps a ring you can’t open sealed until your realm reaches it', () => {
    const s = life();
    const sealed = { from: 'x', name: 'an elder', tier: 2, items: { 'iron-sword': 1 }, stones: 80 };
    const held = { ...s, world: { ...s.world, sealed: [sealed] } };
    expect(openRings(held)).toBe(held);
    const opened = openRings(FE(held));
    expect(opened.world.sealed).toEqual([]);
    expect(opened.player.items['iron-sword']).toBe(1);
    expect(opened.player.stones).toBe(80);
  });
});

describe('the kept rule', () => {
  it('keeps who a scene left a thread to, as a seed plus pins, and throws the rest away', () => {
    const s = life();
    const a = rosterActor('garrison-deserter', 'qi-condensation', 4, 'deserter-1', 'them');
    const b = rosterActor('garrison-deserter', 'qi-condensation', 4, 'deserter-2', 'them');
    const you = plainActor({ id: s.player.id, name: 'you', side: 'you' });
    const scene = startScene({ place: 'qm-anbian-fu', actors: [you, a, b] });
    const w = remember(
      s.world,
      { holder: a.id, about: s.player.id, row: 'spared' },
      s.calendar.day,
    );
    expect(threaded(w, a.id, s.player.id)).toBe(true);
    const left = leaveScene({ ...s, world: w }, scene);
    expect(left.world.kept[a.id]).toMatchObject({
      template: 'garrison-deserter',
      realm: { stage: 4 },
    });
    expect(left.world.kept[b.id]).toBeUndefined();
    // The seed regenerates the same person.
    expect(keptNpc(left.world, a.id)!.name).toBe(a.name);
  });

  it('pins what you took, and their haul regenerates without it', () => {
    const n = generateCultivator(
      template('march-conscript') as never,
      'qi-condensation',
      5,
      new Rng(11),
    );
    const a = actorFromNpc(n);
    const weapon = Object.keys(kitOf(n).items).find(
      (id) => item(id).uses.equip?.slot === 'weapon',
    )!;
    let w = life().world;
    w = noteTaken(w, { ...a, power: 'qm-anbian-fu' }, { [weapon]: 1 }, 3, 'qm-anbian-fu');
    expect(w.kept[a.id]!.took).toEqual({ [weapon]: 1 });
    expect(w.taken[weapon]).toBe('qm-anbian-fu');
    const haul = keptHaul(w, a.id)!;
    expect(haul.items[weapon]).toBeUndefined();
    expect(haul.stones).toBe(kitOf(n).stones - 3);
    expect(keep(w, a, null)).toBe(w);
  });
});

describe('save v23', () => {
  it('holds every old stone as low, an empty silver purse and no wear, and renames the Mending Pill', () => {
    const s = withPlayer(life(), { ...life().player, stones: 42 });
    const raw = JSON.parse(JSON.stringify(makeSave(s, 1))) as {
      version: number;
      state: { player: Record<string, unknown>; world: Record<string, unknown> };
    };
    raw.version = 22;
    delete raw.state.player.higherStones;
    delete raw.state.player.silver;
    delete raw.state.player.wear;
    raw.state.player.items = { 'mending-pill': 2 };
    delete raw.state.world.shops;
    delete raw.state.world.taken;
    delete raw.state.world.sealed;
    const loaded = loadSave(raw).state;
    expect(loaded.player).toMatchObject({
      stones: 42,
      higherStones: { mid: 0, high: 0, top: 0 },
      silver: 0,
      wear: {},
      items: { 'spring-returning-pill': 2 },
    });
    expect(loaded.world).toMatchObject({ shops: {}, taken: {}, sealed: [] });
  });
});

describe('rarity grants', () => {
  it('match the written properties at each rarity the variants reach', () => {
    for (const it of ITEMS) {
      if (!it.upTo || !it.uses.equip) continue;
      for (const r of rarityRange(it)) {
        const v = item(variantId(it.id, r));
        expect(v.properties?.filter((p) => !p.unique).length ?? 0, v.id).toBe(rarity(r).properties);
      }
    }
  });
});

describe('a dead cultivator’s ring', () => {
  it('is sealed at its owner’s realm, never under its own tier, and opens to soul or qi', () => {
    expect(ringTier('storage-ring', 'qi-condensation')).toBe(2);
    expect(ringTier('storage-ring', 'core-formation')).toBe(3);
    const p = newLife({ name: 'Han Li', seed: 'ring' }).player;
    const FE = 'foundation-establishment' as const;
    expect(opensRing(p, 2)).toBe(false);
    expect(opensRing({ ...p, body: { ...p.body, realm: FE } }, 2)).toBe(false);
    expect(opensRing({ ...p, soul: { ...p.soul, realm: FE } }, 2)).toBe(true);
    expect(opensRing({ ...p, qi: { ...p.qi, realm: FE } }, 2)).toBe(true);
  });
});
