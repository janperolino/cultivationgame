// One-breath drawing at the desk (K5): a bot draws as players of several kinds, and the hand they
// hold is the check that the minigame is the skill. A steady hand at a good pace holds about 0.9, a
// wandering one lower, a dawdler's brush runs dry and an idle one never starts, so both fall to 0.
import { describe, expect, it } from 'vitest';
import { HAND_SETTLE, LAY_S, STEP, WAIT_S } from '../content/talisman.ts';
import { Rng } from './rng.ts';
import { newLife } from './state.ts';
import {
  bandAt,
  breathOf,
  brushDown,
  brushMove,
  brushUp,
  deskFamily,
  pathOf,
  startDesk,
  tickDesk,
  type Desk,
} from './talisman.ts';

const s = newLife({ name: 'Han Li', seed: 'desk', origin: { id: 'conscript', choice: 'along' } });
const me = s.player.id;
const DT = 1 / 60;

/** The desk ticked as a screen does until `ok` holds, or `secs` pass. */
function until(d0: Desk, ok: (d: Desk) => boolean, secs = 30): Desk {
  let d = d0;
  for (let t = 0; t < secs && !ok(d); t += DT) d = tickDesk(d, DT);
  return d;
}

interface Player {
  /** Its pace along the path, in the frame's units a second; 0 never draws. */
  pace: number;
  /** How far its hand wanders off the line, and how fast. */
  drift: number;
  wobble: number;
}

const PLAYERS: Record<string, Player> = {
  idle: { pace: 0, drift: 0, wobble: 0 },
  steady: { pace: 200, drift: 4, wobble: 1.1 },
  wandering: { pace: 210, drift: 11, wobble: 1.3 },
  dawdling: { pace: 130, drift: 3, wobble: 1 },
};

/** Draws one sheet as a player would, from the moment it lies ready to the moment it shows. */
function sheet(d0: Desk, p: Player, rng: Rng): Desk {
  let d = until(d0, (x) => x.phase === 'ready');
  if (p.pace === 0) return until(d, (x) => x.phase === 'show');
  const path = pathOf(d.family);
  d = brushDown(d, me, path[0]!);
  const phase = rng.next() * Math.PI * 2;
  let pos = 0;
  for (let t = 0; d.phase === 'draw' && t < 30; t += DT) {
    pos = Math.min(path.length - 1, pos + (p.pace * DT) / STEP);
    const at = path[Math.floor(pos)]!;
    const w = p.wobble * Math.PI * 2 * t + phase;
    d = brushMove(d, me, [at[0] + p.drift * Math.sin(w), at[1] + p.drift * Math.cos(w * 0.7)]);
    d = tickDesk(d, DT);
  }
  return d;
}

/** The hand a player holds after a sitting of sheets. */
function sitting(p: Player, sheets = 12, family = 'strikes', seed = 1): Desk {
  const rng = new Rng(seed);
  let d = startDesk(s, family);
  for (let i = 0; i < sheets; i++) d = until(sheet(d, p, rng), (x) => x.phase !== 'show');
  return d;
}

describe('one-breath drawing', () => {
  it('holds the hand by how the stroke is drawn, at every family’s path', () => {
    for (const family of ['strikes', 'wards', 'passage']) {
      expect(sitting(PLAYERS.steady!, 12, family).hand, family).toBeGreaterThan(0.88);
      const wandering = sitting(PLAYERS.wandering!, 12, family).hand;
      expect(wandering, family).toBeGreaterThan(0.4);
      expect(wandering, family).toBeLessThan(0.85);
      expect(sitting(PLAYERS.dawdling!, 12, family).hand, family).toBeLessThan(0.01);
      expect(sitting(PLAYERS.idle!, 12, family).hand, family).toBe(0);
    }
  });

  it('lasts a breath of six to ten seconds a sheet, and narrows the line as the ink thins', () => {
    for (const family of ['strikes', 'wards', 'passage']) {
      expect(breathOf(family)).toBeGreaterThan(6);
      expect(breathOf(family)).toBeLessThan(10);
    }
    expect(bandAt(1)).toBeGreaterThan(2 * bandAt(0));
  });

  it('starts only on the head, and breaks the breath on a lift or a snap', () => {
    const ready = until(startDesk(s, 'wards'), (d) => d.phase === 'ready');
    const head = pathOf('wards')[0]!;
    expect(brushDown(ready, me, [head[0] + 60, head[1]]).phase).toBe('ready');
    expect(brushDown(ready, 'someone-else', head).phase).toBe('ready');
    const down = brushDown(ready, me, head);
    expect(down.phase).toBe('draw');
    const lifted = brushUp(down, me);
    expect(lifted.last).toEqual({ end: 'lifted', quality: 0 });
    expect(brushMove(down, me, [head[0] + 200, head[1]]).last?.end).toBe('snapped');
  });

  it('dries a sheet left unstarted, so sitting idle falls toward 0', () => {
    const rng = new Rng(3);
    let d = sitting(PLAYERS.steady!, 6);
    const held = d.hand;
    d = until(d, (x) => x.phase === 'ready');
    d = until(d, (x) => x.phase === 'show', WAIT_S + 1);
    expect(d.last?.end).toBe('dry');
    expect(d.hand).toBeCloseTo(held * (1 - HAND_SETTLE));
    expect(
      sheet(
        until(d, (x) => x.phase === 'lay'),
        PLAYERS.steady!,
        rng,
      ).last?.end,
    ).toBe('drawn');
  });

  it('turns to another family’s path on the next sheet', () => {
    const d = deskFamily(startDesk(s, 'strikes'), 'passage');
    expect(d.family).toBe('passage');
    expect(d.on).toHaveLength(pathOf('passage').length - 1);
    expect(tickDesk(d, LAY_S).phase).toBe('ready');
  });
});
