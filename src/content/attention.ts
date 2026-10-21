// Attended seclusion (design § Cultivation, Attended seclusion; § How the two halves connect).
// While you attend, cultivation carries one more factor, attention: ×2.5 for being there, up to ×4
// at full focus (the opening redone, 2026-10-20: away is a quarter of the attended rate). Orbs drift in now and then; drawing one in fills focus, focus drains slowly back
// toward the floor, and greedy catching heats the meridians until they tip into unsettled. Every
// number here is a starting value that sim/pacing.ts's attended rows tune; core/attention.ts reads
// them. Times are real seconds: focus is a multiplier on in-game rates, so a slower clock is never
// stronger.
import type { PhaseElement } from './elements.ts';
import { NIGHT_HOURS } from './hours.ts';

/** Being there: the attention factor's floor, ×2.5 on qi, body, soul and insight. */
export const ATTENTION_FLOOR = 1.5;
/** Full focus: ×4. The Breath branch raises it (stat `focusCeiling`); it stays a ceiling. */
export const ATTENTION_CEILING = 3;

/**
 * You attend while the tab is visible and you have touched it this recently, so a tab left open on
 * a second monitor drifts to away.
 */
export const ATTENDED_INPUT_MS = 3 * 60_000;
/** Once away, what attending added fades to ×1 over this many seconds. */
export const AWAY_FADE_S = 60;
/** Focus drains back toward the floor: the share of the meter lost each second (empty in 5 min). */
export const FOCUS_DRAIN = 1 / 300;

/** A slow breath cycle; orbs tend to arrive on the inhale, its first part. */
export const BREATH_S = 6;
export const INHALE_SHARE = 0.45;

/**
 * An orb drifts in every one to two seconds, while Cultivate's figure is on screen: a steady flow
 * of small orbs rather than a few big ones (Jan's call after P1.10, the design's first guess was
 * ten to twenty), twice as many and each worth half since Jan's note after A4, and half as many
 * again since The opening, built (chains, rogue, knobs: the knobs). Each catch fills and heats in
 * step, so a minute of catching fills and heats about the same.
 */
export const ORB_EVERY_S: readonly [min: number, max: number] = [1, 2];
/** The share of orbs whose arrival is moved onto an inhale. */
export const ORB_INHALE_LEAN = 0.7;
/** Seconds an orb takes to drift in from far out round the figure (from 7 when they came nearer). */
export const ORB_DRIFT_S = 10;
/** Seconds it then floats near the figure before it fades. */
export const ORB_LINGER_S = 10;
/** With Heaven and Earth Resonance, dawn's orbs come this much sooner (the wait is multiplied by it). */
export const RESONANCE_DAWN_EVERY = 0.6;
/** At most this many orbs at once, so a long look away doesn't fill the cave. */
export const ORB_CAP = 16;

/** A catch fills this share of the focus meter; a catch on the inhale is worth this much more. */
export const ORB_FOCUS = 0.0133;
export const ORB_TIMED = 1.75;

/** A breath without a pointer (`breathe`) draws in the nearest orb this close to the dantian. */
export const BREATHE_REACH = 58;
/** A pointer or finger draws in an orb this close to it, in figure units. */
export const POINTER_REACH = 15;
/** Seconds before breathe works again: about a breath and a half, so it can't be mashed. */
export const BREATHE_COOLDOWN_S = 1.5;

/**
 * Heat a breath adds; a breath on the inhale adds this share of it. Past the limit, unsettled.
 * Catching half the orbs on the inhale stays just under the cooling; grabbing every orb off the
 * breath tips over in about three minutes.
 */
export const HEAT_PER_BREATH = 0.04;
export const HEAT_TIMED = 0.5;
export const HEAT_LIMIT = 1;
/** Heat lost each second. */
export const HEAT_COOLING = 0.02;
/** Seconds the bonus is lost once the meridians tip into unsettled. */
export const HEAT_UNSETTLED_S = 40;

/**
 * The figure, in its own units: the head at (0, −41), the dantian below the navel at (0, 9), the
 * crossed legs reaching y 42. Orbs come in from an ellipse well out round it (further since Jan's note
 * after A4, and out toward the scene's edges since The opening, built's knobs) and float on a ring
 * nearer in, where they floated before.
 */
export const DANTIAN: readonly [x: number, y: number] = [0, 9];
export const ORB_EDGE: readonly [rx: number, ry: number] = [240, 180];
export const ORB_RING = 0.2;

/**
 * What an orb carries (design § Attended seclusion, orb kinds). The hour's element is the common
 * kind; dawn's purple qi comes at 卯 and dark yin orbs at night. Tier 2 Breath nodes turn their
 * worth on (D2), so in M1 every kind is worth the same and only the color differs. Lightning orbs
 * and knots wait for the thunderstorm card and Unknotting.
 */
export interface OrbKind {
  id: string;
  name: string;
  /** Worth this many catches of the hour's own orb. */
  value: number;
}

export const ORB_KINDS = {
  element: { id: 'element', name: 'qi of the hour', value: 1 },
  dawn: { id: 'dawn', name: "dawn's purple qi", value: 1 },
  yin: { id: 'yin', name: 'dark yin qi', value: 1 },
} as const satisfies Record<string, OrbKind>;
export type OrbKindId = keyof typeof ORB_KINDS;

/** The hours whose orbs are dark yin: the night's, 亥 to 丑 (content/hours.ts). */
export const YIN_HOURS: readonly number[] = NIGHT_HOURS;

/** The tint of an orb or a mote: an element's, or dawn's purple and the night's yin. */
export type QiTint = PhaseElement | 'dawn' | 'yin';
