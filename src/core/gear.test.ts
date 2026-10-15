// Gear, the Bag and bonding (design § Items and gear), the spar flow the Combat screen drives, and
// save v12.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PACK_SQUARES } from '../content/gear.ts';
import { item, ITEMS } from '../content/items.ts';
import { rarityMultiplier } from '../content/rarity.ts';
import { tierStep } from '../content/realms.ts';
import { STATS } from '../content/stats.ts';
import { fromCultivator } from './combat/combatant.ts';
import { preview } from './combat/fight.ts';
import {
  activeProperties,
  bagCapacity,
  bagStacks,
  bagUsed,
  bondFromFight,
  bondMastery,
  canEquip,
  equip,
  feedArtifact,
  gearBand,
  spiritAwake,
  unequip,
} from './gear.ts';
import { checkScreens, takeOff, wearItem } from './life.ts';
import { loadSave } from './save/format.ts';
import { endSpar, playTurn, sparFoes, sparResult, startSpar, YOU } from './spar.ts';
import { addItem, newLife, withPlayer, type Cultivator, type GameState } from './state.ts';
import { stats } from './stats.ts';
import { learnNode } from './trees.ts';

const life = () => newLife({ name: 'Han Li', seed: 'gear', techniques: ['rampart-palm'] });
const holding = (c: Cultivator, ...ids: string[]) =>
  ids.reduce((acc, id) => addItem(acc, id, 1), c);
const wear = (c: Cultivator, id: string, opened = 0) => {
  const r = equip(c, id, opened);
  expect(r.check).toEqual({ ok: true });
  return r.cultivator;
};
const FE = (c: Cultivator): Cultivator => ({
  ...c,
  qi: { ...c.qi, realm: 'foundation-establishment', stage: 1 },
});

describe('the item record', () => {
  it('gives every authored item a kind, and every property a real stat', () => {
    for (const it of ITEMS) {
      expect(it.kind, it.id).toBeDefined();
      for (const p of it.properties ?? []) {
        for (const e of p.effects) expect(STATS, it.id).toHaveProperty(e.stat);
      }
      if (it.uses.equip?.slot === 'weapon') expect(it.uses.equip.weapon, it.id).toBeDefined();
    }
  });

  it('grants properties by rarity: none at white, one at green or blue, two at purple, a unique at gold', () => {
    const count = { white: 0, green: 1, blue: 1, purple: 2 } as Record<string, number>;
    for (const it of ITEMS) {
      if (!it.uses.equip) continue;
      const n = it.properties?.length ?? 0;
      if (it.rarity in count) expect(n, it.id).toBe(count[it.rarity]);
      if (it.rarity === 'gold') expect(it.properties!.filter((p) => p.unique)).toHaveLength(1);
    }
  });
});

describe('wearing gear', () => {
  it('moves the item out of the Bag, and the old one back', () => {
    let c = holding(life().player, 'iron-sword', 'green-steel-saber');
    c = wear(c, 'iron-sword');
    expect(c.gear.weapon).toBe('iron-sword');
    expect(c.items['iron-sword']).toBe(0);
    c = wear(c, 'green-steel-saber');
    expect(c.gear.weapon).toBe('green-steel-saber');
    expect(c.items['iron-sword']).toBe(1);
    c = unequip(c, 'weapon');
    expect(c.gear.weapon).toBeNull();
    expect(c.items['green-steel-saber']).toBe(1);
  });

  it('refuses what isn’t held or isn’t worn, and a ring before its soul or realm', () => {
    const c = holding(life().player, 'storage-ring', 'mending-pill');
    expect(canEquip(c, 'iron-sword', 0)).toMatchObject({ ok: false });
    expect(canEquip(c, 'mending-pill', 0)).toMatchObject({ ok: false });
    expect(canEquip(c, 'storage-ring', 0)).toMatchObject({ ok: false });
    expect(canEquip(FE(c), 'storage-ring', 0)).toEqual({ ok: true });
  });

  it('opens treasure slots from the Qi and Soul trees', () => {
    const rich = {
      ...holding(life().player, 'warding-jade', 'fire-bead'),
      insight: { current: 1e6, earned: 1e6 },
    };
    expect(canEquip(rich, 'warding-jade', stats(rich).treasureSlots)).toMatchObject({ ok: false });
    const path = [
      'qi-sensing-breath',
      'qi-deep-dantian',
      'qi-wide-sea',
      'qi-steady-return',
      'qi-guarded-breath',
      'qi-shoreless-sea',
    ];
    const opened = path.reduce((acc, id) => {
      const r = learnNode(acc, id);
      expect(r.check, id).toEqual({ ok: true });
      return r.cultivator;
    }, rich);
    expect(stats(opened).treasureSlots).toBe(1);
    const worn = wear(opened, 'warding-jade', 1);
    expect(stats(worn).physicalResist - stats(opened).physicalResist).toBeCloseTo(0.03);
    expect(canEquip(worn, 'fire-bead', 1)).toMatchObject({
      ok: false,
      reason: 'Every treasure slot is full.',
    });
  });

  it('feeds the sheet: the weapon sizes strikes, the armor its own bar with its material’s resist', () => {
    const bare = fromCultivator(life().player, 'a');
    let c = holding(life().player, 'cold-moon-sword', 'water-silk-robe');
    c = wear(wear(c, 'cold-moon-sword'), 'water-silk-robe');
    const me = fromCultivator(c, 'a');
    expect(me.weapon.kind).toBe('sword');
    expect(me.weapon.strike).toBeCloseTo(rarityMultiplier('purple', tierStep(1)));
    // A green robe of your tier: Defense 12 (Qi Condensation's 10 at its band), 36 durability,
    // and its water-silk turns a quarter of fire, on the robe alone.
    expect(me.armor!.defense).toBeCloseTo(12);
    expect(me.armor).toMatchObject({ hp: 36, max: 36, resist: { fire: 0.25 } });
    expect(me.resist.fire).toBeUndefined();
    expect(bare.weapon.kind).toBe('fist');
    expect(bare.armor).toBeNull();
  });
});

describe('a weapon above your realm', () => {
  it('counts half its step, at ×0.8 Accuracy, and drinks qi with every strike', () => {
    const c = wear(holding(life().player, 'azure-cloud-sword'), 'azure-cloud-sword');
    const band = gearBand(c, item('azure-cloud-sword'))!;
    expect(band.accuracy).toBe(0.8);
    expect(band.band).toBeCloseTo(1.5 * Math.sqrt(3.1), 2);
    expect(band.qi).toBeGreaterThan(0);
    // At Foundation it is its own realm's blade: no penalty, no drink.
    const home = gearBand(FE(c), item('azure-cloud-sword'))!;
    expect(home).toMatchObject({ accuracy: 1, qi: 0 });
    // A strike prices its qi on the Combat screen.
    const s = withPlayer(life(), c);
    const start = startSpar(s, sparFoes(s).find((t) => t.kind === 'cultivator')!.id)!;
    const foe = start.fight.combatants.find((x) => x.side !== YOU)!;
    expect(preview(start.fight, 'player', { type: 'strike', target: foe.id })!.qi).toBeGreaterThan(
      0,
    );
  });
});

describe('bonding', () => {
  it('unlocks one property a level from blue up; below blue they simply work', () => {
    let c = holding(life().player, 'cold-moon-sword', 'green-steel-saber');
    expect(activeProperties(c, item('green-steel-saber'))).toHaveLength(1);
    expect(activeProperties(c, item('cold-moon-sword'))).toHaveLength(1);
    c = wear(c, 'cold-moon-sword');
    c = bondFromFight(c, 16); // four bond days: Comprehension
    expect(bondMastery(c, 'cold-moon-sword').level).toBe(1);
    expect(activeProperties(c, item('cold-moon-sword'))).toHaveLength(2);
    expect(stats(c).swordCrit).toBeCloseTo(0.03);
  });

  it('feeds on stones in seclusion, and a gold spirit wakes at Perfection', () => {
    let c = { ...holding(life().player, 'soul-calming-bell'), stones: 1000 };
    expect(spiritAwake(c, item('soul-calming-bell'))).toBe(false);
    c = feedArtifact(c, 'soul-calming-bell', 750); // 150 bond days at 5 stones a day
    expect(c.stones).toBe(250);
    expect(bondMastery(c, 'soul-calming-bell').level).toBe(3);
    expect(spiritAwake(c, item('soul-calming-bell'))).toBe(true);
    expect(feedArtifact(c, 'soul-calming-bell', 5000)).toBe(c);
  });
});

describe('the Bag in squares', () => {
  it('stacks pills to 99 a square, counts bulk, and grows with a pouch', () => {
    let c = life().player;
    c = addItem(c, 'mending-pill', 150);
    c = addItem(c, 'ash-wood-spear', 1);
    c = addItem(c, 'storage-pouch', 1);
    expect(bagStacks(c).map((s) => [s.id, s.n, s.squares])).toEqual([
      ['mending-pill', 99, 1],
      ['mending-pill', 51, 1],
      ['ash-wood-spear', 1, 2],
      ['storage-pouch', 1, 1],
    ]);
    expect(bagUsed(c)).toBe(5);
    expect(bagCapacity(c)).toBe(PACK_SQUARES);
    c = wear(c, 'storage-pouch');
    expect(bagCapacity(c)).toBe(PACK_SQUARES + 20);
    expect(bagUsed(c)).toBe(4);
  });

  it('opens the Bag screen once something is held, and the Combat screen with a technique', () => {
    const s = checkScreens(life());
    expect(s.unlocks).toContain('combat');
    expect(s.unlocks).not.toContain('bag');
    const held = checkScreens(withPlayer(s, addItem(s.player, 'iron-sword', 1)));
    expect(held.unlocks).toContain('bag');
  });

  it('wears and takes off through the life', () => {
    const s = withPlayer(life(), addItem(life().player, 'iron-sword', 1));
    const worn = wearItem(s, 'iron-sword');
    expect(worn.check).toEqual({ ok: true });
    expect(takeOff(worn.state, 'weapon').player.items['iron-sword']).toBe(1);
  });
});

describe('sparring', () => {
  function spar(s: GameState) {
    const id = sparFoes(s).find((t) => t.kind === 'cultivator')!.id;
    return startSpar(s, id)!;
  }

  it('rolls a foe from the roster at your realm, the same for the same seed', () => {
    const s = life();
    expect(sparFoes(s).every((t) => t.band.includes('qi-condensation'))).toBe(true);
    const a = spar(s);
    const b = spar(s);
    expect(a.foe).toBe(b.foe);
    expect(a.fight.combatants.map((c) => c.maxHp)).toEqual(b.fight.combatants.map((c) => c.maxHp));
    expect(a.state.rng.people).not.toBe(s.rng.people);
  });

  it('plays turns on the combat stream and brings home pills, toxicity and bond', () => {
    let s = life();
    s = withPlayer(
      s,
      wear(holding(addItem(s.player, 'mending-pill', 2), 'cold-moon-sword'), 'cold-moon-sword'),
    );
    const start = spar(s);
    s = start.state;
    let f = start.fight;
    const r = playTurn(s, f, { actor: 'player', main: { type: 'item', id: 'mending-pill' } });
    expect(r.state.rng.combat).not.toBe(s.rng.combat);
    s = r.state;
    f = r.turn.fight;
    while (sparResult(f, 'player') === null) {
      const foe = f.combatants.find((c) => c.side !== YOU && c.state === 'fighting')!;
      const t = playTurn(s, f, { actor: 'player', main: { type: 'strike', target: foe.id } });
      s = t.state;
      f = t.turn.fight;
    }
    const end = endSpar(s, f, start.foe);
    expect(end.player.items['mending-pill']).toBe(1);
    expect(end.player.toxicity).toBe(10);
    expect(end.player.bonds['cold-moon-sword']).toBeCloseTo(f.turn * 0.25);
    expect(end.chronicle.at(-1)!.type).toBe('spar');
  });
});

describe('save v12', () => {
  it('migrates a v11 save: nothing worn, nothing bonded', () => {
    const raw = JSON.parse(
      readFileSync(new URL('./save/fixtures/v11.json', import.meta.url), 'utf8'),
    );
    const p = loadSave(raw).state.player;
    expect(p.gear).toEqual({ weapon: null, armor: null, ring: null, pouch: null, treasures: [] });
    expect(p.bonds).toEqual({});
    expect(p.items['qi-restoring-pill']).toBe(2);
  });
});
