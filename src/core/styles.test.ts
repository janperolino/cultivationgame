// Styles, the craft grade and craft renown (design § Professions, Styles and the craft grade; K6):
// the frontier's five common styles and the powers' own; a clan's hall brewing the common style's
// pills; a power's own pill known for its own where it sells; the examination and the guild seat it
// opens; craft renown's points, fade and the mark on a price; and the guest elder seat from 6.
import { describe, expect, it } from 'vitest';
import { CRAFT_IDS, CRAFT_MASTERY, hasRecipe } from '../content/crafts.ts';
import { manual, MANUALS } from '../content/manuals.ts';
import { CRAFT_RENOWN } from '../content/styles.ts';
import { tierNodes } from '../content/trees/index.ts';
import { gradeCertified, gradeHeld, certify, examRows, examinesTo } from './craftGrade.ts';
import { addCraftFame, craftLevel, craftPoints, markedHeld, soldMarked } from './craftRenown.ts';
import { craftDao } from './crafts.ts';
import { askToJoin, entryOf } from './joining.ts';
import { guestOffered, membership, seatGate } from './organizations.ts';
import { markFor } from './resolver/marks.ts';
import { loadSave, makeSave } from './save/format.ts';
import { sell, stockOf } from './shops.ts';
import { addItem, emptyCrafts, newLife, withPlayer, type GameState } from './state.ts';
import { commonStyle, ownGood, styleGoods, styleLines, tradesAt } from './styles.ts';
import { shop } from '../content/shops.ts';

const BW = 'qm-bianhuang';
const GUILD = 'qm-wanyi-hui';
const YEAR = 360;

/** A life with stones to spend, Alchemy's tier 1 held, the frontier's pill seals and full mastery. */
function alchemist(): GameState {
  const s = newLife({ name: 'Han Li', seed: 'styles' });
  const tier1 = tierNodes(craftDao('alchemy'), 1).map((n) => n.id);
  let c = { ...s.player, stones: 500 };
  c = {
    ...c,
    nodes: [...c.nodes, ...tier1, 'sty-fp-bone-meal'],
    crafts: {
      ...c.crafts,
      mastery: { 'tempering-pills': CRAFT_MASTERY.batches[4]!, 'qi-pills': 300 },
    },
  };
  return withPlayer(s, c);
}

describe('styles as content', () => {
  const styles = MANUALS.filter((m) => m.kind === 'style');

  it('gives the Border Wilds one common style a craft, sold openly and never guarded', () => {
    for (const k of CRAFT_IDS) {
      const id = commonStyle('qm-shoukou-cheng', k);
      expect(id, k).toBeTruthy();
      const m = manual(id!);
      expect(m.host).toBe(k);
      expect(m.guardedBy).toBeUndefined();
      expect(m.chapter).toBe(1);
    }
  });

  it('writes the powers’ own styles guarded by them: the Pavilion, Red Marrow and the Valley', () => {
    const own = styles.filter((m) => m.guardedBy).map((m) => [m.id, m.guardedBy]);
    expect(own).toEqual(
      expect.arrayContaining([
        ['bone-binding-array-canon', 'qm-fugu-ge'],
        ['marrow-draining-blood-method', 'qm-chisui-dong'],
        ['apricot-grove-healing-canon', 'xinglin'],
      ]),
    );
  });

  it('seals recipes that exist for every built craft: two or three seals and two perks a chapter', () => {
    for (const m of styles) {
      const seals = m.nodes.filter((n) => n.recipe);
      const perks = m.nodes.filter((n) => !n.recipe);
      expect(seals.length, m.id).toBeGreaterThanOrEqual(2);
      expect(perks).toHaveLength(2);
      if (['alchemy', 'refining', 'talismans'].includes(m.host!))
        for (const n of seals) expect(hasRecipe(n.recipe!), n.recipe).toBe(true);
    }
  });
});

describe('a clan’s hall and a branch shop brew their styles’ goods', () => {
  it('the Qian Clan’s trading hall stands the frontier’s pills', () => {
    const lines = stockOf('mouth-guild', 0).filter((l) => l.standing);
    for (const pill of ['bone-meal-pill', 'garrison-ration-pill'])
      expect(
        lines.some((l) => l.thing.startsWith(pill)),
        pill,
      ).toBe(true);
  });

  it('Apricot Grove’s branch shop stands the Valley’s own pills, and no other shop does', () => {
    expect(styleLines(shop('mouth-alchemy')).map((l) => l.thing)).toEqual(
      expect.arrayContaining(['heart-guarding-pill', 'clear-heart-pill']),
    );
    expect(styleLines(shop('mouth-refiner'))).toEqual([]);
  });
});

describe('a power’s own good, known where its people trade', () => {
  it('reads whose a good is, and where its people trade', () => {
    expect(ownGood('heart-guarding-pill')?.power).toBe('xinglin');
    expect(ownGood('bone-meal-pill')).toBeNull();
    expect(tradesAt('xinglin').has('qm-shoukou-cheng')).toBe(true);
    expect(tradesAt('qm-chisui-dong').has('qm-wuming-ji')).toBe(true);
  });

  it('marks an outsider who sells the Valley’s pill in the City, and nobody at Pacified Fort', () => {
    let s = alchemist();
    s = withPlayer(s, addItem(s.player, 'heart-guarding-pill', 4));
    const away = sell(s, 'march-stall', 'heart-guarding-pill', 1);
    if (!away.ok) throw new Error(away.reason);
    expect(markFor(away.state.world, s.player.id, 'xinglin', s.calendar.day)).toBeUndefined();
    const here = sell(s, 'mouth-stall', 'heart-guarding-pill', 1);
    if (!here.ok) throw new Error(here.reason);
    expect(markFor(here.state.world, s.player.id, 'xinglin', s.calendar.day)).toBeDefined();
  });

  it('Red Marrow knows its blood pill at the Nameless Market’s black market', () => {
    let s = alchemist();
    s = withPlayer(s, addItem(s.player, 'red-marrow-pill', 2));
    const r = sell(s, 'nameless-black', 'red-marrow-pill', 1);
    if (!r.ok) throw new Error(r.reason);
    expect(markFor(r.state.world, s.player.id, 'qm-chisui-dong', s.calendar.day)).toBeDefined();
  });
});

describe('the craft grade', () => {
  it('reads the grade held off the craft Dao, and the frontier branch examines to 二品', () => {
    const s = alchemist();
    expect(gradeHeld(s.player, 'alchemy')).toBe(1);
    expect(gradeCertified(s.player, 'alchemy')).toBe(0);
    expect(examinesTo(GUILD)).toBe(2);
    const row = examRows(s.player, GUILD).find((r) => r.craft === 'alchemy')!;
    expect(row.shut).toBeNull();
    expect(row.recipes.map((r) => r.output)).toContain('bone-meal-pill');
    expect(examRows(s.player, GUILD).find((r) => r.craft === 'formations')!.shut).toMatch(
      /once its bench/,
    );
  });

  it('certifies first-grade by one test batch that holds, the fee paid and the name raised', () => {
    let s = alchemist();
    s = withPlayer(s, addItem(addItem(s.player, 'bone-meal', 30), 'ridge-bitterroot', 30));
    const before = s.player.stones;
    const r = certify(s, GUILD, 'bone-meal-pill', 0.8);
    if (!r.ok) throw new Error(r.reason);
    expect(r.held).toBe(true);
    expect(gradeCertified(r.state.player, 'alchemy')).toBe(1);
    expect(r.state.player.stones).toBeLessThan(before);
    expect(craftPoints(r.state.player, BW, 'alchemy', s.calendar.day)).toBe(CRAFT_RENOWN.certified);
    expect(markedHeld(r.state.player, r.state.player.crafts.recent[0]!.made!)).toBeGreaterThan(0);
  });

  it('refuses a grade not held, and a recipe not of its tier', () => {
    const s = newLife({ name: 'Han Li', seed: 'styles' });
    expect(certify(s, GUILD, 'bone-meal-pill').ok).toBe(false);
    expect(certify(alchemist(), GUILD, 'core-blood-pill').ok).toBe(false);
  });

  it('opens the guild’s member seat with a first-grade badge, and shuts it without', () => {
    let s = alchemist();
    expect(seatGate(s.player, GUILD, 'outer')).toMatch(/一品/);
    expect(entryOf(s, GUILD)!.shut).toMatch(/一品/);
    const grades = { alchemy: { grade: 1, day: 0, at: GUILD } };
    s = withPlayer(s, { ...s.player, crafts: { ...s.player.crafts, grades } });
    expect(seatGate(s.player, GUILD, 'outer')).toBeNull();
    expect(seatGate(s.player, GUILD, 'elder')).toMatch(/二品/);
    const r = askToJoin(s, GUILD);
    if (!r.ok) throw new Error(r.reason);
    expect(membership(r.state.world, s.player.id, GUILD)).toBeDefined();
  });
});

describe('craft renown', () => {
  it('gives a point a month’s wage of marked goods sold, two a month at most', () => {
    const c = alchemist().player;
    const one = soldMarked(c, BW, 'alchemy', 31, 0);
    expect(craftPoints(one, BW, 'alchemy', 0)).toBe(1);
    const many = soldMarked(one, BW, 'alchemy', 500, 1);
    expect(craftPoints(many, BW, 'alchemy', 1)).toBe(2);
    const next = soldMarked(many, BW, 'alchemy', 60, 31);
    expect(craftPoints(next, BW, 'alchemy', 31)).toBe(4);
  });

  it('fades a level a year while nothing of yours sells', () => {
    const c = addCraftFame(alchemist().player, BW, 'alchemy', 16, 0);
    expect(craftLevel(c, BW, 'alchemy', 0)).toBe(6);
    expect(craftLevel(c, BW, 'alchemy', YEAR - 1)).toBe(6);
    expect(craftLevel(c, BW, 'alchemy', YEAR)).toBe(5);
    expect(craftLevel(c, BW, 'alchemy', 3 * YEAR)).toBe(3);
  });

  it('lifts the price of what you made by 3% a level where you are known', () => {
    let s = alchemist();
    s = withPlayer(s, addItem(s.player, 'bone-meal-pill', 20));
    const plain = sell(s, 'mouth-stall', 'bone-meal-pill', 10);
    const made = { ...s.player.crafts.marked, 'bone-meal-pill': 20 };
    let m = withPlayer(s, { ...s.player, crafts: { ...s.player.crafts, marked: made } });
    m = withPlayer(m, addCraftFame(m.player, BW, 'alchemy', 4, m.calendar.day));
    const marked = sell(m, 'mouth-stall', 'bone-meal-pill', 10);
    if (!plain.ok || !marked.ok) throw new Error('no sale');
    const gain = (x: GameState) => x.player.stones - s.player.stones;
    expect(gain(marked.state) / gain(plain.state)).toBeCloseTo(1.09, 1);
    expect(marked.state.player.crafts.marked['bone-meal-pill']).toBe(10);
  });

  it('brings the guild’s guest elder seat at 6 in one of its crafts', () => {
    let s = alchemist();
    expect(guestOffered(s, GUILD)).toBe(false);
    s = withPlayer(s, addCraftFame(s.player, BW, 'alchemy', 16, s.calendar.day));
    expect(guestOffered(s, GUILD)).toBe(true);
  });
});

describe('the save', () => {
  it('brings a v44 life up with no grade, no mark and no name', () => {
    const s = newLife({ name: 'Han Li', seed: 'save' });
    const raw = JSON.parse(JSON.stringify(makeSave(s, 1))) as {
      version: number;
      state: { player: { crafts: Record<string, unknown> } };
    };
    raw.version = 44;
    delete raw.state.player.crafts.grades;
    delete raw.state.player.crafts.marked;
    delete raw.state.player.crafts.renown;
    const back = loadSave(raw);
    expect(back.version).toBe(51);
    expect(back.state.player.crafts).toEqual(emptyCrafts());
  });

  it('styles’ goods are written: every style’s good list reads', () => {
    for (const m of MANUALS.filter((x) => x.kind === 'style')) expect(styleGoods(m)).toBeDefined();
  });
});
