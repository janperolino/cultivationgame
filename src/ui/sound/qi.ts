// Qi's sounds (S1.1, Jan's calls in its talk): a faint hum under Cultivate while qi flows, swelling
// as the bar fills; through a breakthrough's scene a charge that rises with the race; and each gate
// caught a plucked note a step higher up the five-note scale, so a clean run climbs like a tune.
// Pure numbers here; ui/sound/index.ts holds the loops and plays the notes.
import { SCENE_RACE_S, SCENE_WINDUP_S } from '../../content/scene.ts';

/** The five-note scale in semitones over two octaves: gate n is the nth step up. */
export const GATE_STEPS = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21] as const;

/** The playback rate for the nth gate caught (1 the first). */
export function gateRate(n: number): number {
  const step = GATE_STEPS[Math.max(0, Math.min(GATE_STEPS.length - 1, n - 1))]!;
  return 2 ** (step / 12);
}

export interface Held {
  level: number;
  rate: number;
}

/**
 * The charge at scene second `t`: low and a little slow through the wind-up, then rising in level
 * and pitch through the race to its end; a great gate's runs a shade deeper.
 */
export function chargeAt(t: number, major: boolean): Held {
  const deep = major ? 0.85 : 1;
  if (t < SCENE_WINDUP_S) {
    const w = Math.max(0, t) / SCENE_WINDUP_S;
    return { level: 0.2 + 0.2 * w, rate: 0.9 * deep };
  }
  const r = Math.min(1, (t - SCENE_WINDUP_S) / SCENE_RACE_S);
  return { level: 0.4 + 0.6 * r * r, rate: (0.9 + 0.3 * r) * deep };
}

/** The hum at a qi bar's fill: faint when empty, fuller and a touch higher as it fills. */
export function humAt(fill: number): Held {
  const f = Math.max(0, Math.min(1, fill));
  return { level: 0.25 + 0.45 * f, rate: 1 + 0.06 * f };
}
