// The feel pass's sound hooks (F1): each moment that will have a sound calls its cue, and S1's
// sound layer (docs/art-pipeline.md § Sound) plays it. Until S1 sets a player, a cue is silent.

/**
 * gain and loss: a +n by the figure; arrive: a card or an encounter's stub comes in; alert: an
 * encounter while you're off the Map; warn: a breakthrough's warning; fanfare: through the gate.
 */
export type Cue = 'gain' | 'loss' | 'arrive' | 'alert' | 'warn' | 'fanfare';

let player: ((c: Cue) => void) | null = null;

/** S1 sets what plays the cues; null silences them again. */
export function setCuePlayer(play: ((c: Cue) => void) | null): void {
  player = play;
}

export function cue(c: Cue): void {
  player?.(c);
}
