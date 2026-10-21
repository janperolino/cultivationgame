// P2.8: the beacons and hints of the first times (ui/beacons.ts, ui/hints.ts).
import { describe, expect, it } from 'vitest';
import { comingBackStory } from '../core/comingBack.ts';
import { createLife, type Creation } from '../core/creation.ts';
import { finishAllGuides } from '../core/guides.ts';
import { gainMethod, giveHours, readCopy, switchMethod } from '../core/life.ts';
import type { GameState } from '../core/state.ts';
import { freeWheel, hourToFlip } from '../core/wheel.ts';
import { beacons, rings } from './beacons.ts';
import { GUIDED_HINTS, HINT_CODEX, HINTS_OFF_DAYS } from '../content/firsts.ts';
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

/**
 * A start handed its method as a copy to read, as the rogue's torn manual is (since The opening,
 * built a start that goes along holds its method known).
 */
const s0 = (): GameState => {
  const s = finishAllGuides(createLife(creation));
  return { ...s, player: { ...s.player, methods: {}, copies: { 'method:garrison-standard': 1 } } };
};

const study = (s: GameState) =>
  giveHours(s, [hourToFlip(freeWheel(s.player), s.player.rootElements)!], 'study').state;

describe('beacons', () => {
  it('stand on Routine for a new life: Read now on Study and the wheel; stones from layer 2', () => {
    const s = s0();
    const bs = beacons(s);
    expect(bs).toEqual([
      { screen: 'routine', tab: 'study', control: 'read-now', id: 'method:garrison-standard' },
      { screen: 'routine', tab: 'day', control: 'wheel', kind: 'study' },
    ]);
    const layer2 = { ...s, player: { ...s.player, qi: { ...s.player.qi, stage: 2 } } };
    expect(rings(beacons(layer2), 'burn-stones')).toBe(true);
    expect(rings(bs, 'read-now', { id: 'method:garrison-standard' })).toBe(true);
    expect(rings(bs, 'read-now', { id: 'method:other' })).toBe(false);
  });

  it('clear the moment the action is done', () => {
    let s = readCopy(s0(), 'method:garrison-standard').state;
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
  it('come one at a time in order, once a life, with a link to the control and the codex', () => {
    const taken = switchMethod(
      finishAllGuides(createLife(creation)),
      'qi',
      'garrison-standard',
    ).state;
    const climbed = { ...taken, player: { ...taken.player, qi: { ...taken.player.qi, stage: 2 } } };
    const first = nextHint(climbed)!;
    expect(first.id).toBe('qi-hours');
    expect(first.to).toEqual({ screen: 'routine', tab: 'day' });
    expect(HINT_CODEX['qi-hours']).toBe('wheel');
    // Shown once: a life that dismissed it is shown the next.
    const shown = { ...climbed, hints: { on: true, shown: ['qi-hours'] } };
    expect(nextHint(shown)!.id).toBe(hintsWaiting(climbed)[1]!.id);
  });

  it('leave what a guide speaks to the guide: the copy, the method, the orbs, cards and breakthroughs', () => {
    const s = s0();
    const pending = {
      ...s,
      cards: { ...s.cards, pending: [{ uid: 1, card: 'lamp-keeper', day: 0 }] },
      player: { ...s.player, qi: { ...s.player.qi, bar: 1e9 }, flags: ['drew-orb'] },
    };
    const ids = hintsWaiting(pending).map((h) => h.id);
    for (const id of GUIDED_HINTS) expect(ids, id).not.toContain(id);
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
});

describe('hints after a first', () => {
  it('say where insight comes from after the first node', () => {
    const s = s0();
    const ids = (x: GameState) => hintsWaiting(x).map((h) => h.id);
    expect(ids(s)).not.toContain('insight');
    const node = { ...s, player: { ...s.player, nodes: ['qi-sensing-breath'] } };
    expect(hintsWaiting(node).find((h) => h.id === 'insight')!.text).toMatch(/study hours/);
    // Only dismissing it answers it.
    expect(hintDone(node, 'insight')).toBe(false);
  });
});

describe('the auto setting', () => {
  it('is hinted after the first step on any ladder, its control lit until the hint is dismissed', () => {
    const s = s0();
    expect(rings(beacons(s), 'auto')).toBe(false);
    expect(hintsWaiting(s).map((h) => h.id)).not.toContain('auto');
    const climbed = { ...s, player: { ...s.player, qi: { ...s.player.qi, stage: 2 } } };
    expect(hintsWaiting(climbed).find((h) => h.id === 'auto')!.to).toEqual({
      screen: 'routine',
      tab: 'day',
    });
    expect(beacons(climbed)).toContainEqual({
      screen: 'routine',
      tab: 'day',
      control: 'auto',
    });
    // Dismiss only: the glow goes with the hint, and never shows with hints off.
    expect(hintDone(climbed, 'auto')).toBe(false);
    const dismissed = { ...climbed, hints: { on: true, shown: ['auto'] } };
    expect(rings(beacons(dismissed), 'auto')).toBe(false);
    const off = { ...climbed, hints: { on: false, shown: [] } };
    expect(rings(beacons(off), 'auto')).toBe(false);
  });
});
