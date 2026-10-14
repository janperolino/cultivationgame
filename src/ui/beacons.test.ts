// P2.8: the beacons and hints of the first times (ui/beacons.ts, ui/hints.ts).
import { describe, expect, it } from 'vitest';
import { comingBackStory } from '../core/comingBack.ts';
import { createLife, type Creation } from '../core/creation.ts';
import { gainMethod, giveHour, readCopy, switchMethod } from '../core/life.ts';
import type { GameState } from '../core/state.ts';
import { hourToFlip } from '../core/wheel.ts';
import { beacons, rings } from './beacons.ts';
import { hintsWaiting, nextHint } from './hints.ts';

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

const study = (s: GameState) =>
  giveHour(s, hourToFlip(s.player.wheel, s.player.rootElements)!, 'study').state;

describe('beacons', () => {
  it('stand on Cultivate for a new life: Read now on Study, the wheel, the stones', () => {
    const s = createLife(creation);
    const bs = beacons(s);
    expect(bs).toEqual([
      { screen: 'cultivate', tab: 'study', control: 'read-now', id: 'method:garrison-standard' },
      { screen: 'cultivate', tab: 'cultivation', control: 'wheel', kind: 'study' },
      { screen: 'cultivate', tab: 'cultivation', control: 'burn-stones' },
    ]);
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
  it('come one at a time in order, once a lineage, with a link to the control', () => {
    const s = createLife(creation);
    const first = nextHint(s)!;
    expect(first.id).toBe('copy');
    expect(first.text).toBe(
      'Your Garrison Standard Method waits on the shelf. Read now puts it on your study hours.',
    );
    expect(first.to).toEqual({ screen: 'cultivate', tab: 'study' });
    expect(hintsWaiting(s).map((h) => h.id)).toEqual(['copy', 'study-hour', 'orbs', 'stones']);
    // Shown once: a lineage that dismissed it is shown the next.
    const shown = { ...s, lineage: { ...s.lineage, hints: ['copy'] } };
    expect(nextHint(shown)!.id).toBe('study-hour');
    // Done, its moment passes.
    expect(
      hintsWaiting(readCopy(s, 'method:garrison-standard').state).map((h) => h.id),
    ).not.toContain('copy');
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
