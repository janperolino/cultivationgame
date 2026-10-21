// The sounds a change in the life makes (S1), read from the state before and after, the way the
// toasts and the feel pass read theirs: whatever route made the change, a click, a card, a dev
// command, the sound is the same. Moments a change can't show (a click, the square opening, a craft
// scene's stroke) call `cue` where they happen instead.
import { barFill } from '../../core/cultivation.ts';
import type { GameState } from '../../core/state.ts';
import type { EffectId } from './table.ts';

const LADDERS = ['qi', 'body', 'soul'] as const;

const gearKey = (s: GameState) => {
  const g = s.player.gear;
  return [g.weapon, g.armor, g.ring, g.pouch, ...g.treasures].join('|');
};

/** The effects a change plays, in order; none for time away, which the coming-back story tells. */
export function momentsOf(was: GameState, now: GameState): EffectId[] {
  const out: EffectId[] = [];
  const a = was.player;
  const b = now.player;
  for (const l of LADDERS) {
    const [x, y] = [a[l], b[l]];
    // Through a great gate the fanfare; a layer or a stage its own smaller sound; a failure cracks.
    if (y.realm !== x.realm) out.push('feel-fanfare');
    else if (y.stage > x.stage)
      out.push(y.realm === 'qi-condensation' ? 'feel-layer' : 'feel-stage');
    else if (y.unsettledUntil > x.unsettledUntil) out.push('feel-fail');
    else if (barFill(x) < 1 && barFill(y) >= 1) out.push('feel-settle');
  }
  // A batch out of the bench: a pill out of the furnace, or a crack when it blew.
  if (JSON.stringify(b.crafts.recent) !== JSON.stringify(a.crafts.recent)) {
    const fresh = b.crafts.recent.filter(
      (r) => !a.crafts.recent.some((q) => JSON.stringify(q) === JSON.stringify(r)),
    );
    if (fresh.some((r) => r.blew)) out.push('feel-fail');
    else if (fresh.length > 0) out.push('craft-pill');
  }
  if (b.nodes.length > a.nodes.length) out.push('tree-node');
  if (b.manuals.length > a.manuals.length) out.push('book-graft');
  if (gearKey(was) !== gearKey(now)) out.push('bag-equip');
  if (!was.map?.course && now.map?.course) out.push('map-depart');
  // An encounter that waited and is gone, or a fight left: the blade goes back.
  const waited = new Set(
    (was.map?.encounters ?? []).filter((e) => e.state === 'waiting').map((e) => e.id),
  );
  const still = new Set((now.map?.encounters ?? []).map((e) => e.id));
  const settled = [...waited].some((id) => !still.has(id));
  if (settled || (was.fight && !now.fight)) out.push('feel-sheathe');
  return out;
}
