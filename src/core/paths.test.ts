// Three paths (P3.2; design § Cultivation, Three paths; § Combat, The sheet): your realm is your
// highest ladder, no ladder counts below half of it, the major that raises your realm takes its
// path's gate, and in a fight a hit meets the qi shield, then the armor, then the body, each path
// guarding its own way at half its ladder and half its guard art.
import { describe, expect, it } from 'vitest';
import { DEFEND_SHIELD, LADDER_FLOOR, SHIELD_PER_SIZE } from '../content/combat.ts';
import { template, type CultivatorTemplate } from '../content/roster.ts';
import { realm } from '../content/realms.ts';
import { technique } from '../content/techniques.ts';
import {
  armor,
  combatant,
  evasion,
  defense,
  fromCultivator,
  guardsOf,
  NO_GUARDS,
  sheet,
  type CombatantInit,
} from './combat/combatant.ts';
import { generateCultivator, kitFighter } from './combat/generate.ts';
import { combatantIn, preview, resolveTurn, startFight } from './combat/fight.ts';
import { rungSize, stageSize, type Rung } from './combat/sheet.ts';
import { KITS } from '../content/enemies.ts';
import { barSize, lastChance, majorCheck } from './cultivation.ts';
import { attemptLastChance } from './life.ts';
import { loadSave, makeSave } from './save/format.ts';
import { Rng } from './rng.ts';
import {
  addItem,
  DAYS_PER_YEAR,
  lifespanEdgeDay,
  lifespanYears,
  newLife,
  realmOf,
  stageOf,
  topLadder,
  withPlayer,
  type Cultivator,
  type Ladder,
} from './state.ts';
import { sleepLocked } from './wheel.ts';
import { ownTier } from './toxicity.ts';

const life = () => newLife({ name: 'Han Li', seed: 'paths' });
const set = (c: Cultivator, which: 'qi' | 'body' | 'soul', l: Partial<Ladder>): Cultivator => ({
  ...c,
  [which]: { ...c[which], ...l },
});
const FE = (stage: number): Partial<Ladder> => ({ realm: 'foundation-establishment', stage });

describe('your realm', () => {
  it('is your highest ladder, by realm and then by stage', () => {
    const c = life().player;
    expect(topLadder(c)).toBe('qi');
    expect(realmOf(c)).toBe('qi-condensation');
    const body = set(c, 'body', { stage: 4 });
    expect(topLadder(body)).toBe('body');
    expect(stageOf(body)).toBe(4);
    const soul = set(set(body, 'soul', FE(1)), 'qi', { stage: 9 });
    expect(topLadder(soul)).toBe('soul');
    expect(realmOf(soul)).toBe('foundation-establishment');
  });

  it('sets lifespan, the freed sleep and the tier the Daos and pills read', () => {
    const c = set(life().player, 'body', FE(1));
    expect(lifespanYears(c)).toBe(realm('foundation-establishment').lifespan + c.lifespanBonus);
    expect(sleepLocked(c)).toBe(false);
    expect(ownTier(c)).toBe(2);
    expect(sleepLocked(life().player)).toBe(true);
  });

  it('reads from the highest ladder in a save from before the three paths', () => {
    const s = withPlayer(life(), set(life().player, 'soul', FE(2)));
    const loaded = loadSave(JSON.parse(JSON.stringify(makeSave(s, 1)))).state;
    expect(realmOf(loaded.player)).toBe('foundation-establishment');
    expect(lifespanYears(loaded.player)).toBe(lifespanYears(s.player));
  });
});

describe('the floor', () => {
  it('lifts every ladder to half your highest, on the sheet only', () => {
    const c = set(life().player, 'qi', FE(1));
    const me = fromCultivator(c, 'me');
    const top = stageSize('foundation-establishment', 1);
    expect(rungSize(me.rungs.body)).toBeCloseTo(LADDER_FLOOR * top);
    expect(rungSize(me.rungs.qi)).toBeCloseTo(top);
    expect(me.maxHp).toBe(Math.round(10 * LADDER_FLOOR * top));
    expect(sheet(me).floored).toEqual(['body', 'soul']);
    // The ladder itself stays where it was: the floor is the sheet's.
    expect(c.body.realm).toBe('qi-condensation');
    // A ladder trained past the floor counts as itself.
    const trained = fromCultivator(set(c, 'body', { stage: 9 }), 'me');
    expect(rungSize(trained.rungs.body)).toBeCloseTo(stageSize('qi-condensation', 9));
    expect(sheet(trained).floored).toEqual(['soul']);
  });
});

describe('gates on three paths', () => {
  const rich = (c: Cultivator) => ({ ...c, insight: { current: 0, earned: 1e6 } });
  const atPeak = (c: Cultivator, which: 'qi' | 'body' | 'soul') =>
    set(c, which, { stage: 9, bar: 1e6 });

  it("lay the soul's gate when the soul leads into Foundation", () => {
    const c = atPeak(rich(life().player), 'soul');
    expect(majorCheck(c, 'soul')).toMatchObject({
      raises: true,
      gateItem: 'soul-condensing-pill',
      ready: false,
    });
  });

  it('give the last chance to the ladder whose major raises your realm', () => {
    let c = atPeak(rich(life().player), 'body');
    // Below a full bar: only the last chance takes it, at worse odds.
    c = { ...c, body: { ...c.body, bar: 0.8 * barSize(c.body) } };
    expect(lastChance(c)).toMatchObject({ possible: false, ladder: 'body' });
    c = addItem(c, 'marrow-washing-pill', 1);
    const chance = lastChance(c);
    expect(chance).toMatchObject({ possible: true, ladder: 'body' });
    const s = withPlayer(life(), c);
    const edge = { ...s, calendar: { ...s.calendar, day: lifespanEdgeDay(c) } };
    // Some roll of the stream wins it, and the body is then Foundation.
    const won = Array.from({ length: 40 }, (_, i) =>
      attemptLastChance({ ...edge, rng: { ...edge.rng, breakthrough: i } }),
    ).find((r) => r.success)!;
    expect(won.state.player.body.realm).toBe('foundation-establishment');
    expect(won.state.player.items['marrow-washing-pill'] ?? 0).toBe(0);
    expect(lifespanEdgeDay(won.state.player)).toBeGreaterThan(edge.calendar.day + DAYS_PER_YEAR);
  });
});

// ---------------------------------------------------------------- the fight

const QC1: Rung = { realm: 'qi-condensation', stage: 1, grade: 0 };
const all = (r: Rung) => ({ qi: r, body: r, soul: r });
const fighter = (init: Omit<CombatantInit, 'name' | 'side'> & { side?: string }) =>
  combatant({ name: init.id, side: init.id, ...init });
const strike = (target: string) => ({ actor: 'a', main: { type: 'strike' as const, target } });
/** Hits at any chance above 50%, no crit, a spread of 1 (combat.test.ts). */
const SEED_HIT = 14;

describe('the bars', () => {
  it('take a hit on the qi shield first, against the qi rung', () => {
    const f = startFight([fighter({ id: 'a' }), fighter({ id: 'b' })]);
    const r = resolveTurn(f, [strike('b')], new Rng(SEED_HIT));
    const b = combatantIn(r.fight, 'b')!;
    expect(b.maxShield).toBe(SHIELD_PER_SIZE * 10);
    // A plain strike's 20 lands on the shield; the body is untouched.
    expect(r.outcomes[0]).toMatchObject({
      damage: 20,
      bars: { shield: b.maxShield - 20, took: { shield: 20 } },
    });
    expect(b.hp).toBe(b.maxHp);
  });

  it('pass what the shield cannot hold to the armor, then the body', () => {
    const robe = armor(1, 'white');
    const f = startFight([
      fighter({ id: 'a', physicalPower: 10 }),
      fighter({ id: 'b', maxShield: 50, armor: robe, maxHp: 1000 }),
    ]);
    const r = resolveTurn(f, [strike('b')], new Rng(SEED_HIT));
    const b = combatantIn(r.fight, 'b')!;
    // A 200 hit on Defense 10 at every bar: 50 to the shield, 30 to the robe, about 120 to the
    // body (the spread's roll is a hair off 1).
    expect(b.shield).toBe(0);
    expect(b.armor!.hp).toBe(0);
    expect(b.maxHp - b.hp).toBeCloseTo(120, -1);
    expect(r.outcomes[0]!.damage).toBe(50 + 30 + (b.maxHp - b.hp));
  });

  it('let soul damage pass the shield and the armor, to the soul', () => {
    const glance = technique('lamp-snuffing-glance');
    const f = startFight([
      fighter({ id: 'a', techniques: { g: { technique: glance, accuracy: 1 } } }),
      fighter({ id: 'b', armor: armor(1, 'white') }),
    ]);
    const r = resolveTurn(
      f,
      [{ actor: 'a', main: { type: 'technique', id: 'g', target: 'b' } }],
      new Rng(SEED_HIT),
    );
    const b = combatantIn(r.fight, 'b')!;
    expect(b.shield).toBe(b.maxShield);
    expect(b.armor!.hp).toBe(b.armor!.max);
    expect(b.hp).toBe(b.maxHp - glance.power);
  });

  it('refill the shield from qi when you defend', () => {
    const f = startFight([fighter({ id: 'a', shield: 0 })]);
    const r = resolveTurn(f, [{ actor: 'a', main: { type: 'defend' } }], new Rng(0));
    const a = combatantIn(r.fight, 'a')!;
    const pour = Math.round(DEFEND_SHIELD * a.maxShield);
    expect(a.shield).toBe(pour);
    expect(a.qi).toBe(a.maxQi - pour);
  });
});

describe('the guards', () => {
  it('read each ladder at half with no guard art, in full with a white one of your tier', () => {
    const none = fighter({ id: 'a', guards: NO_GUARDS });
    const white = fighter({ id: 'b' });
    expect(defense(none, 'body')).toBeCloseTo(5);
    expect(defense(white, 'body')).toBeCloseTo(10);
    const target = fighter({ id: 'c', maxShield: 0, guards: NO_GUARDS });
    const f = startFight([fighter({ id: 'a' }), target]);
    // No hardening art: the strike's 20 lands as 40.
    expect(preview(f, 'a', { type: 'strike', target: 'c' })!.damage).toBe(40);
  });

  it('give guard arts from what you know: a white art of your tier is 1, a realm below a step less', () => {
    let c = life().player;
    const known = { practice: 0 };
    c = {
      ...c,
      techniques: { ...c.techniques, 'iron-cloth-shirt': known, 'lamp-shadow-step': known },
    };
    expect(guardsOf(c)).toEqual({ shield: 0, hardening: 1, movement: 1 });
    const later = guardsOf(set(c, 'qi', FE(1)));
    expect(later.hardening).toBeCloseTo(1 / 3.1);
    // A guard art is never cast.
    expect(fromCultivator(c, 'me').techniques['iron-cloth-shirt']).toBeUndefined();
  });

  it('let Evasion read the soul when it stands higher, through the movement art', () => {
    const FE1: Rung = { realm: 'foundation-establishment', stage: 1, grade: 0 };
    const rungs = { qi: QC1, body: QC1, soul: FE1 };
    const stepping = fighter({ id: 'a', rungs });
    const still = fighter({ id: 'b', rungs, guards: { ...NO_GUARDS, hardening: 1 } });
    expect(evasion(stepping, 'body')).toBeCloseTo(rungSize(FE1));
    // Without the art the soul counts at half, 15.5, which still beats the body's 10.
    expect(evasion(still, 'body')).toBeCloseTo(rungSize(FE1) / 2);
    // The soul's own ladder reads the soul, art or none.
    expect(evasion(still, 'soul')).toBeCloseTo(rungSize(FE1));
    expect(evasion(fighter({ id: 'c', rungs: all(QC1) }), 'body')).toBeCloseTo(10);
  });
});

describe('NPC paths', () => {
  it('leave a pure path’s other ladders at the floor, with its own arts and every guard', () => {
    const n = generateCultivator(
      template('beast-butcher-disciple') as CultivatorTemplate,
      'foundation-establishment',
      1,
      new Rng(1),
    ).combatant;
    expect(rungSize(n.rungs.body)).toBeGreaterThan(rungSize(n.rungs.qi));
    expect(rungSize(n.rungs.qi)).toBeCloseTo(rungSize(n.rungs.body) * LADDER_FLOOR);
    // A guard art is anyone's to learn: they know one for each path, at their arts' rarity.
    expect(n.guards.shield).toBeGreaterThan(0);
    expect(n.guards.hardening).toBe(n.guards.shield);
    expect(Object.values(n.techniques).every((k) => k.technique.ladder === 'body')).toBe(true);
  });

  it('keep the ledger kits balanced, every guard known', () => {
    const k = kitFighter(KITS[0]!, 'qi-condensation', 1, { id: 'k', side: 'k' });
    expect(rungSize(k.rungs.qi)).toBeCloseTo(rungSize(k.rungs.body));
    expect(k.guards).toEqual({ shield: 1, hardening: 1, movement: 1 });
    const soul = kitFighter({ ...KITS[0]!, path: 'soul' }, 'qi-condensation', 9, {
      id: 's',
      side: 's',
    });
    expect(Object.values(soul.techniques)[0]!.technique).toMatchObject({
      ladder: 'soul',
      damage: 'soul',
    });
  });
});
