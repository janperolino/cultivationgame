// A scene you went into, as GLM gets it (P3.9; design § The resolver, Narration; § The world,
// Going in: Mature mode). The view of the saved scene with its last turns, notes and summary; the
// words each moment is told in; where you stand, under a card's opening line, so a one-line seed
// doesn't read thin once told; and the tone setting, which only says which tone and carries no
// refusal lines (Jan's call). Nothing here changes the game.
import { ARRIVAL_WORDS, GOIN_LENGTHS, type GoInLength } from '../content/goin.ts';
import type { Setting } from '../core/goin.ts';
import type { GameState } from '../core/state.ts';
import { buildView, type Atlas, type Turn, type View } from './context.ts';

/**
 * The view of the scene you are in: your eyes, its last turns, the notes and the summary; with
 * your words this turn and the topics read from them, for the world book (P3.9w).
 */
export function sceneView(
  s: GameState,
  atlas: Atlas,
  now: { said?: string; about?: readonly string[] } = {},
): View {
  const g = s.goin!;
  const recent: Turn[] = g.turns.map((t) => ({
    said: t.said ?? 'You go in.',
    told: t.told,
    ...(t.about ? { about: t.about } : {}),
  }));
  return buildView({
    state: s,
    scene: g.scene,
    atlas,
    recent,
    summary: g.summary || undefined,
    notes: g.notes,
    ...now,
  });
}

/** The words a moment is told in, 30 more with an arrival, the law or a cover blown. */
export function wordsFor(length: GoInLength, arrival = false): [number, number] {
  const [lo, hi] = GOIN_LENGTHS[length];
  return arrival ? [lo + ARRIVAL_WORDS, hi + ARRIVAL_WORDS] : [lo, hi];
}

/** Where you stand, for the narrator: what the land, the hour and the card give it to build on. */
export function settingText(set: Setting): string {
  const lines = ['# Where you stand'];
  if (set.title) lines.push(`The card: ${set.title}.`);
  lines.push(
    `${set.hour}, ${set.season}, the weather ${set.weather}. ${capital(set.land)}${set.inside ? '' : `, ${set.road ? 'on the road' : 'off the road'}${set.headed ? `, on your way to ${set.headed}` : ''}`}.`,
  );
  if (set.opening)
    lines.push(
      `The opening, a seed to grow from (keep its facts, tell it in your own words): ${set.opening}`,
    );
  if (set.quiet) lines.push('Nobody else is here: tell the place, not people.');
  // Going in, a person the telling leaves out is gone for every turn after (P3.9w, on GLM).
  else lines.push('Everyone under People here is here now, but the hidden: show each of them.');
  return lines.join('\n');
}

const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * The tone setting (design § Mature mode): off, intimacy fades to black and cruelty and death keep
 * the cutthroat tone without lingering on gore; on, the narrator may be explicit in both.
 */
export function toneText(mature: boolean): string {
  return mature
    ? '# Tone\nMature: on. Intimacy and violence may be told explicitly when the scene goes there.'
    : '# Tone\nMature: off. Intimacy fades to black. Cruelty and death keep the cutthroat tone without lingering on gore.';
}
