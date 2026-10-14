// P2.8: the beacons and hints of the first times (ui/beacons.ts, ui/hints.ts).
import { describe, expect, it } from 'vitest';
import { comingBackStory } from '../core/comingBack.ts';
import { createLife, type Creation } from '../core/creation.ts';
import { gainMethod, giveHour, readCopy, switchMethod } from '../core/life.ts';
import type { GameState } from '../core/state.ts';
import { hourToFlip } from '../core/wheel.ts';
import { beacons, rings } from './beacons.ts';
import { HINTS_OFF_DAYS } from '../content/firsts.ts';
import { hintDone, hintsWaiting, nextHint } from './hints.ts';

const creation: Creation = {
  name: 'Han Li',
  pronouns: 'they/them',
  look: '',
  mode: 'ironman',
  seed: 'beacons',
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

const s0 = () => createLife(creation);

const study = (s: GameState) =>
  giveHour(s, hourToFlip(s.player.wheel, s.player.rootElements)!, 'study').state;

describe('beacons', () => {
  it('stand on Cultivate for a new life: Read now on Study and the wheel; stones from layer 2', () => {
    const s = createLife(creation);
    const bs = beacons(s);
    expect(bs).toEqual([
      { screen: 'cultivate', tab: 'study', control: 'read-now', id: 'method:garrison-standard' },
      { screen: 'cultivate', tab: 'cultivation', control: 'wheel', kind: 'study' },
    ]);
    const layer2 = { ...s, player: { ...s.player, qi: { ...s.player.qi, stage: 2 } } };
    expect(rings(beacons(layer2), 'burn-stones')).toBe(true);
    expect(rings(bs, 'read-now', { id: 'method:garrison-standard' })).toBe(true);
    expect(rings(bs, 'read-now', { id: 'method:other' })).toBe(false);
  });

  it('clear the moment the action is done', () => {
    let s = readCopy(createLife(creation), 'method:garrison-standard').state;
    expect(rings(beacons(s), 'read-now')).toBe(false);
    s = study(s);
    expect(rings(beacons(s), 'wheel')).toBe(false);
    // An art: Climb with on its ladder, then the wheel for its hour.
    s = gainMethod(s, 'stone-bearing');
    expect(rings(beacons(s), 'climb-with', { ladder: 'body' })).toBe(true);
    s = switchMethod(s, 'body', 'stone-bearing').state;
    expect(beacons(s).find((b) => b.control === 'wheel')).toMatchObject({ kind: 'body' });
    // The coming-back card names it.
    expect(comingBackStory(s, s).firsts).toContain('Your tempering art waits for an hour.');
  });
});

describe('hints', () => {
  it('come one at a time in order, once a life, with a link to the control', () => {
    const s = createLife(creation);
    const first = nextHint(s)!;
    expect(first.id).toBe('copy');
    expect(first.text).toBe(
      'Your Garrison Standard Method waits on the shelf. Read now puts it on your study hours.',
    );
    expect(first.to).toEqual({ screen: 'cultivate', tab: 'study' });
    expect(hintsWaiting(s).map((h) => h.id)).toEqual(['copy', 'study-hour']);
    // Shown once: a life that dismissed it is shown the next.
    const shown = { ...s, hints: { on: true, shown: ['copy'] } };
    expect(nextHint(shown)!.id).toBe('study-hour');
    // Done, its moment passes.
    expect(
      hintsWaiting(readCopy(s, 'method:garrison-standard').state).map((h) => h.id),
    ).not.toContain('copy');
  });

  it('ask to take up a first method before the orbs, which wait on one taken up', () => {
    const read = {
      ...s0(),
      player: { ...s0().player, methods: { 'garrison-standard': { practice: 0, fedUntil: 0 } } },
    };
    const ids = hintsWaiting(read).map((h) => h.id);
    expect(ids).toContain('method');
    expect(ids).not.toContain('orbs');
    expect(hintsWaiting(read).find((h) => h.id === 'method')!.text).toMatch(
      /^You have learned your first cultivation method, the Garrison Standard Method. Take it up under Climb with to start cultivating.$/,
    );
    const taken = switchMethod(read, 'qi', 'garrison-standard').state;
    // Taken up, more qi hours come next, then the orbs, before the stones.
    const after = hintsWaiting(taken).map((h) => h.id);
    expect(after.indexOf('qi-hours')).toBeGreaterThanOrEqual(0);
    expect(after.indexOf('orbs')).toBe(after.indexOf('qi-hours') + 1);
    expect(after).not.toContain('method');
    const layer2 = { ...taken, player: { ...taken.player, qi: { ...taken.player.qi, stage: 2 } } };
    const order = hintsWaiting(layer2).map((h) => h.id);
    expect(order.indexOf('stones')).toBeGreaterThan(order.indexOf('orbs'));
  });

  it('go only when the player does what they say, not when the moment passes by itself', () => {
    const s = s0();
    const pending = {
      ...s,
      cards: { ...s.cards, pending: [{ uid: 1, card: 'lamp-keeper', day: 0 }] },
    };
    expect(hintDone(pending, 'cards')).toBe(false);
    // The tray emptied by itself: the hint still stands until chosen or dismissed.
    expect(hintDone({ ...pending, cards: s.cards }, 'cards')).toBe(false);
    expect(hintDone(s, 'copy')).toBe(false);
    expect(hintDone(readCopy(s, 'method:garrison-standard').state, 'copy')).toBe(true);
    expect(hintDone({ ...s, hints: { on: true, shown: ['cards'] } }, 'cards')).toBe(true);
  });

  it('say hints can be turned off once a life has lived about five minutes', () => {
    const s = s0();
    expect(hintsWaiting(s).map((h) => h.id)).not.toContain('hints-off');
    const later = { ...s, calendar: { day: s.calendar.day + HINTS_OFF_DAYS } };
    expect(hintsWaiting(later).find((h) => h.id === 'hints-off')!.to).toEqual({
      screen: 'settings',
    });
  });

  it('point at the card tray and a breakthrough, which are already yours to do', () => {
    const s = createLife(creation);
    const pending = {
      ...s,
      cards: { ...s.cards, pending: [{ uid: 1, card: 'lamp-keeper', day: 0 }] },
    };
    expect(hintsWaiting(pending).map((h) => h.id)).toContain('cards');
    const full = {
      ...s,
      player: { ...s.player, qi: { ...s.player.qi, bar: 1e9 } },
    };
    expect(hintsWaiting(full).map((h) => h.id)).toContain('breakthrough');
  });
});
