// The guides (design § UI and screens, Introductions; content/guides.ts): which guide stands now,
// where, and what ends it. A guide fires the first time you meet its feature where it lives, never
// on a timer; it runs once a lineage, so the record is the lineage's, and "I know this" ends it
// like doing it. With guides off (Settings) none fire and the screen comes whole; the firsts'
// beacons stay beneath as the fallback. The first seclusion builds Cultivate a piece at a time
// (`built`), and the first minor breakthrough waits for you until its guide is done.
import { BUILD_GUIDES, GUIDE_IDS, GUIDES, type Guide, type GuideId } from '../content/guides.ts';
import { FIRST_NODE_INSIGHT } from '../content/firsts.ts';
import { barFill, nextStep } from './cultivation.ts';
import { actNow } from './chains.ts';
import { FIRST_BREATH } from './life.ts';
import { knownMethods } from './methods.ts';
import { ownedCopies, knowsCopy } from './reading.ts';
import { knownTechniques } from './techniques.ts';
import { withPlayer, type GameState } from './state.ts';

export { GUIDE_IDS, GUIDES, type Guide, type GuideId } from '../content/guides.ts';

/** Where the player is looking, as the UI knows it: a guide fires only where its feature lives. */
export interface GuideContext {
  screen: string;
  /** Routine's tab. */
  tab?: string;
  /** An orb is on screen to draw. */
  orb?: boolean;
  /** Inside a place on the map, with its doors. */
  inside?: boolean;
  /** A shop's counter is open. */
  shop?: boolean;
}

export function guidesOn(s: GameState): boolean {
  return s.hints.on;
}

export function guideDone(s: GameState, id: GuideId): boolean {
  return s.lineage.guides.includes(id);
}

/** Whether the guide's thing is already done in the state, so it ends as soon as it is. */
function doneInState(s: GameState, id: GuideId): boolean {
  const p = s.player;
  switch (id) {
    case 'first-work':
      return s.chronicle.some((e) => e.type === 'work');
    case 'take-up':
      return p.activeMethods.qi !== null;
    case 'first-orb':
      return p.flags.includes(FIRST_BREATH);
    case 'first-minor':
      return (['qi', 'body', 'soul'] as const).some(
        (k) => p[k].realm !== 'qi-condensation' || p[k].stage > 1,
      );
    case 'study-hour':
      return p.wheel.includes('study');
    case 'first-node':
      return p.nodes.length > 0;
    case 'practice':
      return p.practicing.length > 0 && p.wheel.includes('practice');
    case 'read-copy':
      return p.reading.queue.length > 0 || ownedCopies(p).some((id) => knowsCopy(p, id));
    case 'first-course':
      return !!s.map?.course;
    case 'go-in':
      return !!s.goin || s.lineage.firsts.includes('go-in');
    default:
      return false;
  }
}

/** Whether the guide's moment has come: its feature is there to meet. */
function ready(s: GameState, id: GuideId, ctx: GuideContext): boolean {
  const g = GUIDES[id];
  if (g.form !== 'veil' && ctx.screen !== g.screen) return false;
  if (g.tab && ctx.tab !== g.tab) return false;
  const p = s.player;
  const built = BUILD_GUIDES.every((b) => guideDone(s, b));
  // Past the first seclusion's guides, nothing fires until the screen is built (but a fight, and
  // a rogue's first work, which comes before the first breath).
  if (!built && !BUILD_GUIDES.includes(id) && id !== 'fight-turn' && id !== 'first-work')
    return false;
  switch (id) {
    case 'first-work':
      return needsWork(s);
    case 'take-up':
      return p.activeMethods.qi === null && knownMethods(p, 'qi').length > 0;
    case 'qi-bar':
      return guideDone(s, 'take-up');
    case 'first-orb':
      return guideDone(s, 'qi-bar') && ctx.screen === 'cultivate' && !!ctx.orb;
    case 'focus':
      return guideDone(s, 'first-orb');
    case 'first-minor':
      return (
        built && ctx.screen === 'cultivate' && nextStep(p.qi).kind === 'minor' && barFill(p.qi) >= 1
      );
    case 'study-hour':
      return built && p.activeMethods.qi !== null;
    case 'first-node':
      return p.insight.current >= FIRST_NODE_INSIGHT;
    case 'practice':
      return knownTechniques(p).length > 0;
    case 'first-card':
      return built && s.cards.pending.length > 0;
    case 'read-copy':
      return ownedCopies(p).some((c) => !knowsCopy(p, c));
    case 'first-course':
      return !ctx.inside && !s.fight;
    case 'place-doors':
      return !!ctx.inside && !ctx.shop;
    case 'first-buy':
      return !!ctx.shop;
    case 'fight-turn':
      return !!s.fight;
    case 'sheet':
      return s.chronicle.some((e) => e.type === 'spar' && e.data.result === 'won');
    case 'sense':
      return !!s.map?.course && !ctx.inside;
    case 'go-in':
      return (
        !ctx.inside && !s.fight && (s.map?.encounters ?? []).some((e) => e.state === 'waiting')
      );
  }
}

/** A rogue's first work waits to be done: the chain's act that pays the method. */
function needsWork(s: GameState): boolean {
  const a = actNow(s);
  return !!a && 'work' in a.act;
}

/** The guide standing now, here: the first in order whose moment has come, or null. */
export function guideNow(s: GameState, ctx: GuideContext): Guide | null {
  if (!guidesOn(s) || s.ended) return null;
  for (const id of GUIDE_IDS) {
    if (guideDone(s, id) || doneInState(s, id)) continue;
    // A fight's veil outranks everything; nothing else shows over a fight.
    if (s.fight && id !== 'fight-turn') continue;
    if (ready(s, id, ctx)) return GUIDES[id];
  }
  return null;
}

/**
 * Ends a guide, done or skipped ("I know this"), for the lineage. The first minor breakthrough's
 * end hands minor breakthroughs back to the auto setting.
 */
export function finishGuide(s: GameState, id: GuideId): GameState {
  if (guideDone(s, id)) return s;
  let next: GameState = { ...s, lineage: { ...s.lineage, guides: [...s.lineage.guides, id] } };
  if (id === 'first-minor' && next.player.plan.auto === 'off') {
    next = withPlayer(next, { ...next.player, plan: { ...next.player.plan, auto: 'safe' } });
  }
  return next;
}

/** "I've played before": every guide ended for the lineage, and the screen comes whole. */
export function finishAllGuides(s: GameState): GameState {
  return GUIDE_IDS.reduce(finishGuide, s);
}

/**
 * With guides off, whether the life has passed the moment of a guide with nothing in the state to
 * end on (the qi bar, focus, the sheet, sense), so it ends there and the codex meets its entries.
 */
function passedUnguided(s: GameState, id: GuideId): boolean {
  const p = s.player;
  switch (id) {
    case 'qi-bar':
      return p.activeMethods.qi !== null;
    case 'focus':
      return p.flags.includes(FIRST_BREATH);
    case 'sheet':
      return s.chronicle.some((e) => e.type === 'spar' && e.data.result === 'won');
    case 'sense':
      return !!s.map?.course;
    default:
      return false;
  }
}

/**
 * Ends every guide whose thing the state already shows done (and, with guides off, every one whose
 * moment has passed); the same state if none.
 */
export function noteGuides(s: GameState): GameState {
  const off = !guidesOn(s);
  const fresh = GUIDE_IDS.filter(
    (id) => !guideDone(s, id) && (doneInState(s, id) || (off && passedUnguided(s, id))),
  );
  return fresh.reduce(finishGuide, s);
}

/**
 * A guided start: the first minor breakthrough waits for you (its veil), so the auto setting is
 * held at Only when I say until that guide ends.
 */
export function guidedStart(s: GameState): GameState {
  if (guideDone(s, 'first-minor')) return s;
  return withPlayer(s, { ...s.player, plan: { ...s.player.plan, auto: 'off' } });
}

/**
 * Guides turned off: the first minor breakthrough no longer waits on its veil, so a guided start's
 * hold on the auto setting is let go, as that guide's end lets it go.
 */
export function unguidedStart(s: GameState): GameState {
  if (guideDone(s, 'first-minor') || s.player.plan.auto !== 'off') return s;
  return withPlayer(s, { ...s.player, plan: { ...s.player.plan, auto: 'safe' } });
}

/** The pieces of the screen the first seclusion builds, a piece at a time. */
export type BuiltPiece = 'take-up' | 'orbs' | 'focus' | 'band' | 'tray' | 'rail' | 'rail-rest';

/**
 * What shows of the screen now. Cultivate opens on the figure and the qi bar alone, with the
 * method to take up; the orbs come once it is taken, focus with the first orb; once focus is
 * shown the build is done and the rail comes with Cultivate and Routine, the band and the tray;
 * the rest of the rail after the first minor breakthrough. Guides off, it is all there.
 */
export function built(s: GameState, piece: BuiltPiece): boolean {
  if (!guidesOn(s)) return true;
  const done = (id: GuideId) => guideDone(s, id) || doneInState(s, id);
  switch (piece) {
    case 'take-up':
      return true;
    case 'orbs':
      return done('take-up') && done('qi-bar');
    case 'focus':
      return done('first-orb');
    case 'band':
    case 'tray':
    case 'rail':
      return BUILD_GUIDES.every(done);
    case 'rail-rest':
      return BUILD_GUIDES.every(done) && done('first-minor');
  }
}
