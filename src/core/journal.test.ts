// The opening, built: the journal's quests (core/journal.ts), from the giver to the hand-in, the
// steps the engine finishes, the one followed, and dropping; the test quest proves it until the
// chains land.
import { describe, expect, it } from 'vitest';
import { QUESTS, quest } from '../content/quests.ts';
import { hasCopy } from '../content/copies.ts';
import { hasItem } from '../content/items.ts';
import { createLife, type Creation } from './creation.ts';
import { finishAllGuides } from './guides.ts';
import {
  dropQuest,
  followQuest,
  following,
  goalMet,
  handIn,
  handInCheck,
  noteQuests,
  offersAt,
  questPlace,
  questState,
  takeQuest,
} from './journal.ts';
import { ensureMap, homeOf, mapOf } from './map/travel.ts';
import { withPlayer, type GameState } from './state.ts';

const creation: Creation = {
  name: 'Han Li',
  pronouns: 'they/them',
  look: '',
  mode: 'ironman',
  seed: 'journal',
  choice: 'along',
  roll: {
    root: 'true',
    elements: ['wood', 'fire'],
    body: 'farmhands-frame',
    soul: 'plain-mind',
    fate: 'ordinary-fate',
    origin: 'cave-orphan',
  },
};

const life = (): GameState => ensureMap(finishAllGuides(createLife(creation)));
const ok = (r: { ok: true; state: GameState } | { ok: false; reason: string }) => {
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};
/** Walks the life a long way off, then home. */
const away = (s: GameState): GameState => ({ ...s, map: { ...s.map!, at: [0, 0], inside: null } });
const home = (s: GameState): GameState => {
  const h = homeOf(s, mapOf(s)!);
  return { ...s, map: { ...s.map!, at: [h.x, h.y], inside: null } };
};

describe('the quest record', () => {
  it('writes every quest with a giver, one to five steps, a reward and names that exist', () => {
    expect(new Set(QUESTS.map((q) => q.id)).size).toBe(QUESTS.length);
    for (const q of QUESTS) {
      expect(q.steps.length, q.id).toBeGreaterThanOrEqual(1);
      expect(q.steps.length, q.id).toBeLessThanOrEqual(5);
      expect(q.reward.text, q.id).not.toBe('');
      for (const it of q.reward.items ?? []) expect(hasItem(it.id), it.id).toBe(true);
      if (q.reward.copy) expect(hasCopy(q.reward.copy), q.reward.copy).toBe(true);
    }
  });
});

describe('a quest from its giver to its hand-in', () => {
  it('is offered where it lives, the test quest only on the dev console', () => {
    const s = life();
    const board = questPlace(s, '@home')!;
    expect(offersAt(s, { kind: 'board', place: board.id })).toEqual([]);
    expect(offersAt(s, { kind: 'board', place: board.id }, { dev: true }).map((q) => q.id)).toEqual(
      ['test-errand'],
    );
    expect(offersAt(s, { kind: 'shop', place: board.id }, { dev: true })).toEqual([]);
    const taken = ok(takeQuest(s, 'test-errand'));
    expect(offersAt(taken, { kind: 'board', place: board.id }, { dev: true })).toEqual([]);
    expect(takeQuest(taken, 'test-errand').ok).toBe(false);
  });

  it('steps on as the engine sees each thing happen, never by a tick', () => {
    let s = away(ok(takeQuest(life(), 'test-errand')));
    // Taken, it is followed, the journal opens, and the chronicle says so.
    expect(s.journal.followed).toBe('test-errand');
    expect(s.unlocks).toContain('journal');
    expect(s.chronicle.at(-1)!.type).toBe('quest');
    expect(questState(s, 'test-errand')!.step).toBe(0);
    expect(following(s)!.text).toBe('Buy a node on the Trees.');
    // A node held: the first step is done.
    s = noteQuests(withPlayer(s, { ...s.player, nodes: ['qi-sensing-breath'] }));
    expect(questState(s, 'test-errand')!.step).toBe(1);
    // Layer 3: the second; the third waits for you at the board.
    s = noteQuests(withPlayer(s, { ...s.player, qi: { ...s.player.qi, stage: 3 } }));
    expect(questState(s, 'test-errand')!.step).toBe(2);
    expect(following(s)!.place!.id).toBe(questPlace(s, '@home')!.id);
    // Not handed in from afar.
    expect(handInCheck(s, 'test-errand').ok).toBe(false);
  });

  it('is handed in at its giver for its reward, and the next under way is followed', () => {
    let s = away(ok(takeQuest(life(), 'test-errand')));
    s = withPlayer(s, {
      ...s.player,
      nodes: ['qi-sensing-breath'],
      qi: { ...s.player.qi, stage: 3 },
    });
    s = noteQuests(s);
    // The last step is the walk back, so away it isn't done yet.
    expect(handIn(s, 'test-errand')).toMatchObject({
      ok: false,
      reason: 'Its steps aren’t done yet.',
    });
    s = noteQuests(home(s));
    expect(questState(s, 'test-errand')!.step).toBe(3);
    const stones = s.player.stones;
    s = ok(handIn(s, 'test-errand'));
    expect(s.player.stones).toBe(stones + quest('test-errand').reward.stones!);
    expect(questState(s, 'test-errand')!.handed).toBe(s.calendar.day);
    expect(s.journal.followed).toBeNull();
    expect(following(s)).toBeNull();
    expect(handIn(s, 'test-errand').ok).toBe(false);
  });

  it('follows one at a time, and drops any but the origin’s', () => {
    let s = ok(takeQuest(life(), 'test-errand'));
    expect(followQuest(s, 'nothing')).toBe(s);
    s = ok(dropQuest(s, 'test-errand'));
    expect(s.journal).toEqual({ quests: [], followed: null });
    expect(dropQuest(s, 'test-errand').ok).toBe(false);
  });

  it('reads a layer past its realm as reached, and an event only after the step opened', () => {
    const s = life();
    const found = withPlayer(s, {
      ...s.player,
      qi: { ...s.player.qi, realm: 'foundation-establishment', stage: 1 },
    });
    expect(goalMet(found, { layer: { ladder: 'qi', stage: 9 } }, 0)).toBe(true);
    expect(goalMet(s, { event: 'birth' }, 0)).toBe(true);
    expect(goalMet(s, { event: 'birth' }, s.calendar.day + 1)).toBe(false);
    expect(goalMet(s, { event: 'testing', match: { choice: 'refuse' } }, 0)).toBe(false);
  });
});
