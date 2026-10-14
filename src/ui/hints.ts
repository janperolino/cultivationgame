// Hints (design § UI and screens, You do it the first time): a hint kind of toast, one at a time,
// each shown once a lineage, staying until you act or dismiss it, its link opening the control.
// One per first time's step (core/firsts.ts), plus breakthroughs, drawing orbs and the card tray,
// which are already yours to do. The texts are data (content/firsts.ts); the lineage keeps the
// hints acted on or dismissed, and Settings turns them off or shows them again.
import { HINT_IDS, HINTS, type HintId } from '../content/firsts.ts';
import { firstsWaiting, firstText } from '../core/firsts.ts';
import { FIRST_BREATH } from '../core/life.ts';
import type { GameState } from '../core/state.ts';
import { beaconFor, type Beacon } from './beacons.ts';
import { readyLadders } from './scene.ts';
import type { ToastLink } from './toasts.ts';

export interface HintView {
  id: HintId;
  text: string;
  to: ToastLink | null;
}

/** Where a beacon's hint links: its screen and tab, the technique picked on Practice. */
function linkTo(b: Beacon): ToastLink {
  if (b.screen === 'trees') return { screen: 'trees', trees: { pick: 'qi' } };
  return {
    screen: b.screen,
    ...(b.tab ? { tab: b.tab } : {}),
    ...(b.control === 'practice-this' && b.id ? { select: b.id } : {}),
  };
}

/** Every hint whose moment is here, in order, shown or not. */
export function hintsWaiting(s: GameState): HintView[] {
  if (s.ended) return [];
  const open = (to: ToastLink) => (s.unlocks.includes(to.screen) ? to : null);
  const steps = new Map(firstsWaiting(s).map((st) => [st.hint as HintId, st]));
  const out: HintView[] = [];
  for (const id of HINT_IDS) {
    const step = steps.get(id);
    if (step) {
      out.push({ id, text: firstText(HINTS[id], step), to: open(linkTo(beaconFor(step))) });
      continue;
    }
    const abode = open({ screen: 'abode' });
    if (id === 'orbs' && !s.player.flags.includes(FIRST_BREATH) && abode) {
      out.push({ id, text: HINTS.orbs, to: abode });
    }
    if (id === 'breakthrough' && readyLadders(s).length > 0) {
      out.push({ id, text: HINTS.breakthrough, to: abode });
    }
    if (id === 'cards' && s.cards.pending.length > 0) {
      out.push({ id, text: HINTS.cards, to: abode });
    }
  }
  return out;
}

/** The hint to show next: the first waiting that the lineage hasn't been shown. */
export function nextHint(s: GameState): HintView | null {
  return hintsWaiting(s).find((h) => !s.lineage.hints.includes(h.id)) ?? null;
}

/** Whether a hint's moment is still here: its action not yet done. */
export function hintStillWaiting(s: GameState, id: HintId): boolean {
  return hintsWaiting(s).some((h) => h.id === id);
}
