// You do it the first time (design § UI and screens): the lineage keeps which first times are done,
// so a reborn cultivator isn't walked through them again. The rules still take a cultivator: they
// are told which firsts are done (`ALL_FIRSTS` unless the caller plays them), and while one isn't,
// the thing it covers arrives switched off: a wheel all qi, a copy unqueued, a method or art not
// taken up, a technique in no slot and no hour flipped. Here: what shows a first done, the record
// kept on the lineage, and what each waiting first wants of the player now.
import { copyManual, hasCopy } from '../content/copies.ts';
import type { LadderId } from '../content/cultivation.ts';
import {
  FIRST_IDS,
  FIRST_NODE_INSIGHT,
  FIRST_STONES,
  FIRST_STONES_LAYER,
  FIRST_WAITING,
  type FirstId,
  type HintId,
} from '../content/firsts.ts';
import { HOUR_KINDS } from '../content/hours.ts';
import { hasMethod, method } from '../content/methods.ts';
import { hasTechnique, technique } from '../content/techniques.ts';
import { knownMethods, meetsRequirements } from './methods.ts';
import { burnable, realmGrade, stonesOf } from './purse.ts';
import { ownedCopies, knowsCopy, unqueuedCopies } from './reading.ts';
import type { Cultivator, GameState } from './state.ts';
import { canPractice, knownTechniques, practiced } from './techniques.ts';

export { ALL_FIRSTS, FIRST_IDS, type FirstId } from '../content/firsts.ts';

const ART_LADDERS = ['body', 'soul'] as const satisfies readonly LadderId[];

/**
 * The firsts the cultivator's state shows done: a copy queued or read, a study hour on the wheel,
 * a qi method taken up, a technique in a slot with a practice hour, an art taken up with its hour,
 * stones burning, a node learned.
 */
export function firstsPassed(c: Cultivator): FirstId[] {
  const passed: Record<FirstId, boolean> = {
    copy: c.reading.queue.length > 0 || ownedCopies(c).some((id) => knowsCopy(c, id)),
    'study-hour': c.wheel.includes('study'),
    method: c.activeMethods.qi !== null,
    technique: c.practicing.length > 0 && c.wheel.includes('practice'),
    art: ART_LADDERS.some((l) => c.activeMethods[l] !== null && c.wheel.includes(l)),
    stones: c.plan.burnStones,
    node: c.nodes.length > 0,
    // Going in is marked on the lineage as a door opens (core/goin.ts), not read off the cultivator.
    'go-in': false,
  };
  return FIRST_IDS.filter((id) => passed[id]);
}

/** Records on the lineage every first the player's state now shows done; the same state if none. */
export function noteFirsts(s: GameState): GameState {
  const fresh = firstsPassed(s.player).filter((id) => !s.lineage.firsts.includes(id));
  if (fresh.length === 0) return s;
  return { ...s, lineage: { ...s.lineage, firsts: [...s.lineage.firsts, ...fresh] } };
}

/** A first waiting on the player: which, the step it is at (its hint), and what it is about. */
export interface FirstStep {
  first: FirstId;
  hint: Exclude<
    HintId,
    'qi-hours' | 'orbs' | 'attending' | 'insight' | 'breakthrough' | 'auto' | 'cards' | 'hints-off'
  >;
  /** The copy, method or technique it is about. */
  id?: string;
  /** An art's ladder. */
  ladder?: 'body' | 'soul';
}

/**
 * What each first not yet done wants of the player now, in hint order; a first with nothing to do
 * yet (no copy unread, no method known) waits silently. Read from the live state, so a step clears
 * the moment it is done, before the record catches up.
 */
export function firstsWaiting(s: GameState): FirstStep[] {
  const c = s.player;
  const done = s.lineage.firsts;
  const out: FirstStep[] = [];
  const todo = (id: FirstId) => !done.includes(id) && !firstsPassed(c).includes(id);
  if (todo('copy')) {
    const id = unqueuedCopies(c)[0];
    if (id) out.push({ first: 'copy', hint: 'copy', id });
  }
  // The study hour waits until there is something to study for: a method taken up (the first
  // lesson's insight) or a copy to read.
  const study = c.activeMethods.qi !== null || ownedCopies(c).some((id) => !knowsCopy(c, id));
  if (todo('study-hour') && study) out.push({ first: 'study-hour', hint: 'study-hour' });
  if (todo('method') && c.activeMethods.qi === null) {
    const m = knownMethods(c, 'qi').find((x) => meetsRequirements(c, x).ok);
    if (m) out.push({ first: 'method', hint: 'method', id: m.id });
  }
  if (todo('technique')) {
    const slotted = practiced(c);
    if (slotted.length > 0) {
      out.push({ first: 'technique', hint: 'technique-hour', id: slotted[0]! });
    } else {
      const t = knownTechniques(c).find((x) => canPractice(c, x.id));
      if (t) out.push({ first: 'technique', hint: 'technique', id: t.id });
    }
  }
  if (todo('art')) {
    const step = artStep(c);
    if (step) out.push(step);
  }
  const layer2 = c.qi.realm !== 'qi-condensation' || c.qi.stage >= FIRST_STONES_LAYER;
  if (todo('stones') && layer2 && burnable(stonesOf(c), realmGrade(c.qi.realm)) >= FIRST_STONES) {
    out.push({ first: 'stones', hint: 'stones' });
  }
  if (todo('node') && c.insight.current >= FIRST_NODE_INSIGHT) {
    out.push({ first: 'node', hint: 'node' });
  }
  // A card waiting on the road can be gone into (P3.9).
  if (todo('go-in') && (s.map?.encounters ?? []).some((e) => e.state === 'waiting')) {
    out.push({ first: 'go-in', hint: 'go-in' });
  }
  return out;
}

/** An art's step: one taken up waits for its hour, else one known waits to be taken up. */
function artStep(c: Cultivator): FirstStep | null {
  for (const ladder of ART_LADDERS) {
    const id = c.activeMethods[ladder];
    if (id && !c.wheel.includes(ladder)) return { first: 'art', hint: 'art-hour', id, ladder };
  }
  for (const ladder of ART_LADDERS) {
    if (c.activeMethods[ladder]) continue;
    const m = knownMethods(c, ladder).find((x) => meetsRequirements(c, x).ok);
    if (m) return { first: 'art', hint: 'art', id: m.id, ladder };
  }
  return null;
}

const ART_KIND = { body: 'tempering art', soul: 'nourishing art' } as const;
const ART_GROWING = { body: 'tempering your body', soul: 'nourishing your soul' } as const;

/** A first's text, hint or coming-back line, with its slots filled from the step. */
export function firstText(template: string, step: FirstStep): string {
  const id = step.id ?? '';
  const words: Record<string, string> = {};
  if (step.first === 'copy' && hasCopy(id)) words.copy = copyManual(id).name;
  if ((step.first === 'method' || step.first === 'art') && hasMethod(id)) {
    words.method = words.art = method(id).name;
  }
  if (step.first === 'technique' && hasTechnique(id)) words.technique = technique(id).name;
  if (step.ladder) {
    words.artKind = ART_KIND[step.ladder];
    words.growing = ART_GROWING[step.ladder];
    words.ladder = step.ladder;
    words.hour = HOUR_KINDS[step.ladder].name;
  }
  return template.replace(/\{(\w+)\}/g, (_, k: string) => words[k] ?? '');
}

/** The coming-back card's line for each first still waiting (content/firsts.ts). */
export function firstsWaitingLines(s: GameState): string[] {
  return firstsWaiting(s).map((step) => firstText(FIRST_WAITING[step.hint], step));
}
