// Formation Inscribing (K10; design § Sites and formations): a gathering array lifts a site's
// density and seclusion feels it, the vein a soft cap; a guard turns a weaker raider; a trap on
// open ground holds a beast for you to find and you fight it bound; each array's numbers play in a
// fight on its ground; and the rest of the rules.
import { describe, expect, it } from 'vitest';
import { DAYS_PER_MONTH } from '../content/calendar.ts';
import { variantId } from '../content/items.ts';
import { arrayBand, burnOf, eyeHolds, fightArrays, gatheringSteps } from './arrays.ts';
import { fromCultivator } from './combat/combatant.ts';
import { combatantIn, onGround, resolveTurn, startFight } from './combat/fight.ts';
import { generateBeast } from './combat/generate.ts';
import { claim, claimsHere, densityOf, readSite, stepMult, toStore } from './dwellings.ts';
import {
  cantLay,
  feedArray,
  formationsDay,
  laidAt,
  layArray,
  settleTrap,
  takeUp,
  trapFight,
} from './formations.ts';
import { handLift } from './crafts.ts';
import { cardFight } from './cards.ts';
import { cultivate } from './life.ts';
import { bandAt } from './map/depth.ts';
import { placeById } from './map/region.ts';
import { ensureMap, mapOf } from './map/travel.ts';
import { readLand, veinsOf, type Vein } from './map/veins.ts';
import { densityHere } from './organizations.ts';
import { loadSave, makeSave } from './save/format.ts';
import { template } from '../content/roster.ts';
import { Rng } from './rng.ts';
import { addItem, newLife, withPlayer, type GameState, type LaidArray } from './state.ts';

const life = (seed = 'arrays'): GameState => {
  const s = ensureMap(newLife({ name: 'Han Li', seed }));
  return withPlayer(s, { ...s.player, stones: 10_000 });
};
const inside = (s: GameState, place: string): GameState => {
  const p = placeById(mapOf(s)!, place)!;
  return { ...s, map: { ...s.map!, at: [p.x, p.y], inside: place, course: null } };
};
const standAt = (s: GameState, at: readonly [number, number]): GameState => ({
  ...s,
  map: { ...s.map!, at: [at[0], at[1]], inside: null, course: null },
});
const ok = (r: { ok: true; state: GameState } | { ok: false; reason: string }): GameState => {
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};
const give = (s: GameState, id: string, n = 1) => withPlayer(s, addItem(s.player, id, n));
const days = (s: GameState, n: number): GameState => {
  let next = s;
  for (let i = 0; i < n; i++) {
    next = { ...next, calendar: { ...next.calendar, day: next.calendar.day + 1 } };
    next = cultivate(next, 1, { offline: true });
  }
  return next;
};
const veins = (s: GameState): Vein[] => veinsOf(mapOf(s)!, s.lineage.id);

/** A cave abode claimed on a tier 1 vein, stood in. */
function cave(s: GameState, where: (v: Vein) => boolean = () => true): GameState {
  const v = veins(s).find((x) => x.tier === 1 && where(x));
  if (!v) throw new Error('no vein');
  let t = standAt(withPlayer(s, { ...s.player, soul: { ...s.player.soul, stage: 9 } }), [v.x, v.y]);
  t = { ...t, map: readLand(mapOf(t)!, t.lineage.id, t.map!, t.player, t.calendar.day).life };
  t = ok(
    claim(
      t,
      claimsHere(t).findIndex((c) => c.vein?.id === v.id),
    ),
  );
  return inside(t, t.player.dwellings[0]!.place);
}
const site = (s: GameState) => s.player.dwellings[0]!;
const at = (s: GameState) => ({ dwelling: site(s).id });

describe('laying an array', () => {
  it('takes it from the Bag, charges its eye from the purse, and the hand lifts it', () => {
    let s = cave(life());
    s = give(s, 'gathering-flags');
    const purse = s.player.stones;
    s = ok(layArray(s, at(s), 'gathering-flags', 0));
    const a = site(s).arrays[0]!;
    expect(a).toMatchObject({
      item: 'gathering-flags',
      rarity: 'white',
      from: 'white',
      stones: 30,
    });
    expect(s.player.items['gathering-flags'] ?? 0).toBe(0);
    expect(s.player.stones).toBe(purse - eyeHolds(1));
    // A tier 1 vein holds one array: the slot is taken.
    s = give(s, 'warding-flags');
    expect(cantLay(s, at(s), 'warding-flags')).toMatch(/taken/);
    // Steady hands' reach (a band, and a quarter for a matched soul): a full hand lays a band up
    // with a quarter of the next toward blue, half a hand most of the way to green.
    expect(handLift(s.player, 'formations', 1)).toBe(1.25);
    expect(laidAt(s.player, 'white', 1)).toEqual({ rarity: 'green', strength: 0.25 });
    expect(laidAt(s.player, 'white', 0.5)).toEqual({ rarity: 'white', strength: 0.625 });
  });

  it('is taken up as the flags it was, its stones lost, and fed back to full', () => {
    let s = cave(life());
    s = give(s, 'gathering-flags');
    s = ok(layArray(s, at(s), 'gathering-flags', 1));
    const id = site(s).arrays[0]!.id;
    expect(site(s).arrays[0]!.rarity).toBe('green');
    s = days(s, 10);
    expect(site(s).arrays[0]!.stones).toBeCloseTo(30 - 10 * 0.5, 5);
    s = ok(feedArray(s, at(s), id));
    expect(site(s).arrays[0]!.stones).toBeCloseTo(30, 5);
    s = ok(takeUp(s, at(s), id));
    expect(site(s).arrays).toHaveLength(0);
    expect(s.player.items['gathering-flags']).toBe(1);
  });

  it('only on land claimed on a vein, or on open ground', () => {
    const s = give(inside(life(), 'qm-shoukou-cheng'), 'gathering-flags');
    expect(cantLay(s, 'ground', 'gathering-flags')).toMatch(/open/);
    expect(cantLay(s, 'ground', 'warding-flags')).toMatch(/carry/);
  });
});

describe('a gathering array', () => {
  it('lifts a site’s density a step and seclusion feels it, until its eye runs dry', () => {
    let s = cave(life());
    expect(densityOf(s, site(s))).toBe(4);
    expect(densityHere(s)).toBe(stepMult(1));
    s = ok(layArray(give(s, 'gathering-flags'), at(s), 'gathering-flags', 0));
    expect(densityOf(s, site(s))).toBe(5);
    expect(densityHere(s)).toBe(stepMult(2));
    s = days(s, 60);
    expect(site(s).arrays[0]!.stones).toBe(0);
    expect(densityOf(s, site(s))).toBe(4);
    expect(s.chronicle.some((e) => e.type === 'dwelling' && e.data.what === 'dark')).toBe(true);
  });

  it('meets the vein as a soft cap: only gold reaches past it, at double upkeep', () => {
    const s = cave(life());
    const d = site(s);
    const laid = (
      id: string,
      rarity: LaidArray['rarity'],
      item = 'gathering-flags',
    ): LaidArray => ({
      id,
      item,
      rarity,
      from: rarity,
      strength: 0,
      stones: 30,
      laid: 0,
    });
    // A tier 1 vein holds a step again: two plain arrays lift one.
    expect(gatheringSteps({ ...d, arrays: [laid('a', 'white'), laid('b', 'blue')] })).toEqual({
      steps: 1,
      pastCap: false,
    });
    // A gold one adds two (its step and gold's) past the cap, and pays double for it.
    const gold = { ...d, arrays: [laid('a', 'white'), laid('g', 'gold')] };
    expect(gatheringSteps(gold)).toEqual({ steps: 3, pastCap: true });
    expect(burnOf(laid('g', 'gold'), { pastCap: true })).toBe(1);
    // A sleeping trap burns a tenth, one holding a beast five times.
    expect(burnOf(laid('t', 'white', 'snare-disc'))).toBeCloseTo(0.05);
    expect(burnOf(laid('t', 'white', 'snare-disc'), { holding: true })).toBeCloseTo(2.5);
  });
});

describe('a guarding array', () => {
  it('turns a raider at its band or under, and no card comes', () => {
    const base = life();
    const map = mapOf(base)!;
    // A cave the land's thieves can find: deep enough that their band meets its concealment.
    let s: GameState | null = null;
    for (const v of veins(base).filter((x) => x.tier === 1)) {
      let t: GameState;
      try {
        t = cave(base, (x) => x.id === v.id);
      } catch {
        continue;
      }
      const r = readSite(t, site(t))!;
      if (r.thievesFind && bandAt(map, [v.x, v.y]) <= 2) {
        s = t;
        break;
      }
    }
    expect(s).not.toBeNull();
    let t = give(s!, 'qi-gathering-pill', 99);
    t = ok(toStore(t, site(t).id, 'qi-gathering-pill', 0));
    const before = readSite(t, site(t))!;
    expect(before.thievesCome).toBe(true);
    // Warding flags at the land's band: blue is Qi Condensation's late third.
    t = give(t, variantId('warding-flags', 'blue'));
    t = ok(layArray(t, at(t), variantId('warding-flags', 'blue'), 0));
    expect(arrayBand(site(t).arrays[0]!)).toBe(2);
    const after = readSite(t, site(t))!;
    expect(after.guard).toBeGreaterThanOrEqual(after.land);
    expect(after.thievesCome).toBe(false);
    const month = days({ ...t, calendar: { ...t.calendar, day: DAYS_PER_MONTH - 1 } }, 2);
    expect(month.cards.pending.some((p) => p.card === 'raid-thieves')).toBe(false);
  });
});

describe('a trap on open ground', () => {
  /** A snare set on open wild ground at the land's edge band. */
  function snared(): GameState {
    const s = life('trap');
    const map = mapOf(s)!;
    const v = veins(s).find((x) => Math.max(0, bandAt(map, [x.x, x.y])) === 0)!;
    let t = standAt(give(s, 'snare-disc'), [v.x + 20, v.y]);
    t = ok(layArray(t, 'ground', 'snare-disc', 0));
    return t;
  }

  it('holds a beast that walks in, for you to find and fight bound', () => {
    let s = snared();
    const g0 = s.player.grounds[0]!;
    expect(g0.held).toBeNull();
    // About one day in ten something crosses it; a beast of the land's band is held.
    for (let i = 0; i < 60 && !s.player.grounds[0]!.held; i++) {
      const day = s.calendar.day;
      s = formationsDay({ ...s, calendar: { ...s.calendar, day: day + 1 } }, day, day + 1);
      s = { ...s, calendar: { ...s.calendar, day: day + 1 } };
    }
    const g = s.player.grounds[0]!;
    expect(g.held).not.toBeNull();
    expect(g.held!.band).toBe(0);
    expect(s.chronicle.some((e) => e.type === 'dwelling' && e.data.what === 'trapped')).toBe(true);
    // The fight: you against it on the snare's ground; it is held on the first turn, free the next.
    const f = trapFight(s, g.id)!;
    expect(f.arrays?.map((a) => a.does)).toEqual(['binding']);
    const foe = f.combatants[1]!;
    const me = s.player.id;
    const acts = [
      { actor: me, main: { type: 'defend' as const } },
      { actor: foe.id, main: { type: 'strike' as const, target: me } },
    ];
    const t1 = resolveTurn(f, acts, new Rng(1));
    expect(t1.ground?.map((l) => l.target)).toEqual([foe.id]);
    expect(t1.skipped.some((x) => x.actor === foe.id && x.reason === 'held')).toBe(true);
    const t2 = resolveTurn(t1.fight, acts, new Rng(2));
    expect(t2.ground ?? []).toEqual([]);
    // Won, its parts come home and the snare is set again.
    const won = settleTrap(s, g.id, 'won');
    expect(won.state.player.grounds[0]!.held).toBeNull();
    expect(Object.keys(won.state.player.items).some((id) => id.startsWith('beast-'))).toBe(true);
  });

  it('is laid only once a spot, and taken up where it lies', () => {
    const s = snared();
    expect(cantLay(give(s, 'snare-disc'), 'ground', 'snare-disc')).toMatch(/already/);
    const away = standAt(s, [s.map!.at[0] + 5000, s.map!.at[1]]);
    expect(takeUp(away, { ground: s.player.grounds[0]!.id }, s.player.grounds[0]!.id).ok).toBe(
      false,
    );
  });
});

describe('arrays in a fight', () => {
  const fightOn = (s: GameState, item: string, rarity: LaidArray['rarity'] = 'white') => {
    const t = template('thunder-deer');
    const beast =
      t.kind === 'beast'
        ? generateBeast(t, 'qi-condensation', 2, new Rng(7), { id: 'deer', side: 'them' })
        : null;
    const a: LaidArray = { id: 'x', item, rarity, from: rarity, strength: 0, stones: 30, laid: 0 };
    return onGround(
      startFight([fromCultivator(s.player, 'you'), beast!.combatant]),
      fightArrays([a], 'you'),
    );
  };

  it('a killing array strikes every foe each turn and never misses', () => {
    const f = fightOn(life(), 'sword-qi-disc');
    const hp = combatantIn(f, 'deer')!.hp + combatantIn(f, 'deer')!.shield;
    const t1 = resolveTurn(f, [], new Rng(3));
    expect(t1.ground?.[0]).toMatchObject({ does: 'killing', target: 'deer' });
    expect(t1.ground![0]!.damage).toBeGreaterThan(0);
    const deer = combatantIn(t1.fight, 'deer')!;
    expect(deer.hp + deer.shield).toBeLessThan(hp);
  });

  it('a warding array stands its shield over you, a maze dulls their aim', () => {
    const s = life();
    const plain = fromCultivator(s.player, 'you');
    const warded = fightOn(s, 'warding-flags');
    expect(combatantIn(warded, s.player.id)!.shield).toBeGreaterThan(plain.shield);
    const maze = fightOn(s, 'maze-flags');
    expect(maze.arrays?.[0]).toMatchObject({ does: 'maze', dull: 1 / 3 });
  });

  it('pays a day of its stones for each turn fought', async () => {
    const { burnFought } = await import('./formations.ts');
    let s = cave(life());
    s = ok(layArray(give(s, 'warding-flags'), at(s), 'warding-flags', 0));
    const f = { ...onGround(startFight([]), fightArrays(site(s).arrays, 'you')), turn: 4 };
    expect(site(burnFought(s, f)).arrays[0]!.stones).toBeCloseTo(30 - 4 * 0.5);
  });
});

describe('a raid at your site', () => {
  it('is fought on the site’s ground: its arrays stand in the card’s fight, and only there', () => {
    let s = cave(life());
    s = ok(layArray(give(s, 'warding-flags'), at(s), 'warding-flags', 0));
    const uid = s.cards.nextUid;
    const raid = (here: number): GameState => ({
      ...withPlayer(s, {
        ...s.player,
        dwellings: s.player.dwellings.map((d) =>
          d.id === site(s).id ? { ...d, raid: { uid, kind: 'thieves' as const, band: 0 } } : d,
        ),
      }),
      cards: {
        ...s.cards,
        nextUid: uid + 1,
        pending: [
          ...s.cards.pending,
          { uid, card: 'raid-thieves', day: s.calendar.day, vars: { here, band: 0 } },
        ],
      },
    });
    const there = cardFight(raid(1), uid, 1)!;
    expect(there.arrays?.map((a) => a.does)).toEqual(['warding']);
    const plain = fromCultivator(s.player, 'you').shield;
    expect(combatantIn(there, s.player.id)!.shield).toBeGreaterThan(plain);
    expect(cardFight(raid(0), uid, 1)!.arrays).toBeUndefined();
  });
});

describe('the save', () => {
  it('keeps the arrays laid and the prepared ground (v51)', () => {
    let s = cave(life());
    s = ok(layArray(give(s, 'gathering-flags'), at(s), 'gathering-flags', 0));
    const back = loadSave(JSON.parse(JSON.stringify(makeSave(s, 1))));
    expect(back.version).toBe(51);
    expect(back.state.player.dwellings[0]!.arrays).toHaveLength(1);
    expect(back.state.player.grounds).toEqual([]);
  });
});
