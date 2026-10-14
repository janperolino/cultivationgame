// Hints (design § UI and screens, You do it the first time): a hint kind of toast, one at a time,
// each shown once a life, staying until you do what it says or dismiss it, its link opening the
// control. One per first time's step (core/firsts.ts), plus breakthroughs, drawing orbs and the card
// tray, which are already yours to do, and one saying hints can be turned off. The texts are data
// (content/firsts.ts); the life keeps whether hints show and the ones acted on or dismissed.
import { HINT_IDS, HINTS, HINTS_OFF_DAYS, type HintId } from '../content/firsts.ts';
import { firstsWaiting, firstText } from '../core/firsts.ts';
import { FIRST_BREATH } from '../core/life.ts';
import { daysLived, type GameState } from '../core/state.ts';
import { practiced } from '../core/techniques.ts';
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
  const abode = open({ screen: 'abode' });
  const out: HintView[] = [];
  for (const id of HINT_IDS) {
    const step = steps.get(id);
    if (step) {
      out.push({ id, text: firstText(HINTS[id], step), to: open(linkTo(beaconFor(step))) });
      continue;
    }
    // Once a method is taken up: more qi hours, then the motes, which only settle with one.
    const climbing = s.player.activeMethods.qi !== null;
    if (id === 'qi-hours' && climbing) {
      const to = open({ screen: 'cultivate', tab: 'cultivation' });
      out.push({ id, text: HINTS['qi-hours'], to });
    }
    const drawing = climbing && !s.player.flags.includes(FIRST_BREATH);
    if (id === 'orbs' && drawing && abode) out.push({ id, text: HINTS.orbs, to: abode });
    // After the first orb: what attending does. After the first node: where more insight comes from.
    if (id === 'attending' && s.player.flags.includes(FIRST_BREATH) && abode) {
      out.push({ id, text: HINTS.attending, to: abode });
    }
    if (id === 'insight' && s.player.nodes.length > 0) {
      const to = open({ screen: 'cultivate', tab: 'cultivation' });
      out.push({ id, text: HINTS.insight, to });
    }
    if (id === 'breakthrough' && readyLadders(s).length > 0) {
      out.push({ id, text: HINTS.breakthrough, to: abode });
    }
    if (id === 'cards' && s.cards.pending.length > 0) {
      out.push({ id, text: HINTS.cards, to: abode });
    }
    if (id === 'hints-off' && daysLived(s.player, s.calendar.day) >= HINTS_OFF_DAYS) {
      out.push({ id, text: HINTS['hints-off'], to: { screen: 'settings' } });
    }
  }
  return out;
}

/** The hint to show next: the first waiting that the life hasn't been shown. */
export function nextHint(s: GameState): HintView | null {
  return hintsWaiting(s).find((h) => !s.hints.shown.includes(h.id)) ?? null;
}

/**
 * Whether the player has done what a hint asked, so it goes. Only the player's own doing counts:
 * a hint whose moment passes by itself (an auto breakthrough, a card settled while away) stays
 * until dismissed. An hour turned to qi, a breakthrough, a card chosen and the hints' own switch
 * mark theirs shown from the store's actions.
 */
export function hintDone(s: GameState, id: HintId): boolean {
  if (s.hints.shown.includes(id)) return true;
  const firsts = s.lineage.firsts;
  const p = s.player;
  switch (id) {
    case 'copy':
    case 'study-hour':
    case 'method':
    case 'stones':
    case 'node':
      return firsts.includes(id);
    case 'technique':
      return firsts.includes('technique') || practiced(p).length > 0;
    case 'technique-hour':
      return firsts.includes('technique');
    case 'art':
      return (
        firsts.includes('art') || p.activeMethods.body !== null || p.activeMethods.soul !== null
      );
    case 'art-hour':
      return firsts.includes('art');
    case 'orbs':
      return p.flags.includes(FIRST_BREATH);
    case 'qi-hours':
    case 'attending':
    case 'insight':
    case 'breakthrough':
    case 'cards':
    case 'hints-off':
      return false;
  }
}
