// A typed turn in a fight inside the scene (P3.9c): the fight interpreter's reading made legal
// against the fight, the closest legal action playing when the words ask for what you can't do.
import { describe, expect, it } from 'vitest';
import { combatant } from '../core/combat/combatant.ts';
import { startFight } from '../core/combat/fight.ts';
import { fightActionOf } from './interpret.ts';
import type { FightTurn } from './schemas.ts';

describe('a typed turn in a fight', () => {
  const f = startFight([
    {
      ...combatant({ id: 'me', name: 'Lin Ye', side: 'you' }),
    },
    combatant({ id: 'mo', name: 'Elder Mo', side: 'them' }),
  ]);
  const turn = (t: Partial<FightTurn>): FightTurn => ({
    main: { type: 'strike', id: null, target: 'mo', style: null },
    minor: null,
    uses: [],
    creativity: 0,
    feasible: true,
    reason: null,
    ...t,
  });

  it('plays an act beyond you as the closest legal action, with the reason and no creativity', () => {
    const r = fightActionOf(
      f,
      'me',
      turn({ feasible: false, reason: 'far beyond your realm', creativity: 3 }),
      null,
    );
    expect(r.action.main).toEqual({ type: 'strike', target: 'mo' });
    expect(r.action.creativity).toBeUndefined();
    expect(r.why).toBe('far beyond your realm');
  });

  it("strikes in place of an art you don't know, at the foe you picked", () => {
    const r = fightActionOf(
      f,
      'me',
      turn({ main: { type: 'technique', id: 'ember-palm', target: null, style: null } }),
      'mo',
    );
    expect(r.action.main).toEqual({ type: 'strike', target: 'mo' });
    expect(r.why).toMatch(/no such art/);
  });

  it('keeps only the features the fight holds', () => {
    const r = fightActionOf(
      f,
      'me',
      turn({ minor: { type: 'interact', feature: 'brazier', onto: null, id: null } }),
      'mo',
    );
    expect(r.action.minor).toBeUndefined();
  });
});
