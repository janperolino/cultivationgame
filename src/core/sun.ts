// The sun on Cultivate's seat (design § Cultivation, The hour on the figure): where it stands at a
// moment of the world day, and the shadow it casts from the seated figure. The day wheel's 子 is
// 23–1, so midnight is the middle of 子, dawn the middle of 卯, noon the middle of 午 and dusk the
// middle of 酉; the sun rises on the left and sets on the right (Jan's call in A3). Pure geometry: ui/sunCanvas.ts and ui/qiCanvas.ts draw
// it, and the numbers are `docs/mockups/abode-hour-study.html`'s.
import { HOURS_PER_DAY } from '../content/hours.ts';

/** The double-hour of dawn's middle, as a fraction of the wheel: 卯 is the fourth hour, 5–7. */
export const SUNRISE_HOUR = 3.5;
/** Which side the sun rises on: 1 the right, −1 the left (the left since A3). */
export const SUN_SIDE = -1;
/** The study's default strengths, the tuning (design § Cultivation). */
export const SUN_SHADOW_STRENGTH = 0.8;
export const SUN_WASH_STRENGTH = 0.7;
/** Twilight reaches this far either side of sunrise and sunset, in double-hours. */
const TWILIGHT_HOURS = 0.8;
/** Light fades out as the sun sinks this far below the horizon, as a sine of its altitude. */
const DUSK_DEPTH = 0.12;
/** The longest the shadow grows, in figure heights, and its length at a high sun. */
const SHADOW_MAX = 2.4;
const SHADOW_BASE = 0.35;

export interface Sun {
  /** The moment on the wheel, 0 to 12: 0 the start of 子, 6.5 noon. */
  hour: number;
  /** The sun's angle along its arc: 0 at sunrise, π/2 at noon, π at sunset, −π/2 at midnight. */
  phi: number;
  /** Its altitude as a sine, −1 at midnight to 1 at noon; above the horizon when positive. */
  altitude: number;
  /** Above the horizon, 0 to 1. */
  elevation: number;
  /** Where it stands across the seat, −1 left to 1 right, and up, 0 to 1. */
  dx: number;
  dy: number;
  /** Daylight on the floor, 1 by day, fading to 0 just after sunset and before sunrise. */
  light: number;
  /** How near sunrise or sunset, 0 to 1, when the light is warm. */
  twilight: number;
  /** How much the dantian's own light shows on the floor, 0 by full day to 1 at night. */
  night: number;
}

/** The sun at a moment of the world day (whole days are dropped). */
export function sunAt(day: number, side = SUN_SIDE): Sun {
  const hour = (((day % 1) + 1) % 1) * HOURS_PER_DAY;
  const phi = ((hour - SUNRISE_HOUR) / (HOURS_PER_DAY / 2)) * Math.PI;
  const altitude = Math.sin(phi);
  const elevation = Math.max(0, altitude);
  const sunset = SUNRISE_HOUR + HOURS_PER_DAY / 2;
  const fromHorizon = Math.min(Math.abs(hour - SUNRISE_HOUR), Math.abs(hour - sunset));
  return {
    hour,
    phi,
    altitude,
    elevation,
    dx: Math.cos(phi) * side,
    dy: elevation,
    light: Math.min(1, Math.max(0, (altitude + DUSK_DEPTH) / DUSK_DEPTH)),
    twilight: Math.max(0, 1 - fromHorizon / TWILIGHT_HOURS),
    night: 1 - Math.min(1, elevation * 3),
  };
}

export interface Shadow {
  /** Its length in figure heights: long at the horizon, short at noon. */
  length: number;
  /** Which way it falls across the floor, away from the sun: −1 left to 1 right. */
  dirX: number;
  /** How far it recedes up the floor, behind the figure (always negative, so up the screen). */
  dirY: number;
}

/** The figure's shadow, or null when there is no sun to cast one. */
export function shadowOf(s: Sun): Shadow | null {
  if (s.light <= 0) return null;
  return {
    length: Math.min(
      SHADOW_MAX,
      SHADOW_BASE / Math.max(0.12, Math.tan((s.elevation * Math.PI) / 2)),
    ),
    dirX: -s.dx,
    dirY: -0.22 * Math.cos(s.phi) ** 2 - 0.12,
  };
}
