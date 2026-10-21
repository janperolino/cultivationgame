// The sound hooks: each moment with a sound calls its cue, and the sound layer (S1, ui/sound/)
// plays it. Until the layer sets a player, and for a cue with no file shipped, a cue is silent.
// The ids are the cue table's effects (ui/sound/table.ts); F1 left the first six: feel-gain and
// feel-loss for a +n by the figure, feel-arrive for a card's stub, feel-alert for an encounter
// while you're off the Map, feel-warn for a breakthrough's warning, feel-fanfare through the gate.
import type { EffectId } from './sound/table.ts';

export type Cue = EffectId;

let player: ((c: Cue) => void) | null = null;

/** The sound layer sets what plays the cues; null silences them again. */
export function setCuePlayer(play: ((c: Cue) => void) | null): void {
  player = play;
}

export function cue(c: Cue): void {
  player?.(c);
}
