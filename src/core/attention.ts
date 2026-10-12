// Attended seclusion (design § Cultivation, Attended seclusion): the seat's two states. Away is
// idle as it always was, the floor, and earns exactly today's rates. Attending adds a factor to qi
// speed, ×1.25 for being there up to ×2 at full focus, and leaves a second insight trickle. Orbs
// drift in on their own `orbs` stream while the Abode's figure is on screen; drawing one in (by
// pointer, finger or the breathe key) fills focus, more on the inhale; focus drains slowly back
// toward the floor, and every breath warms the meridians until greed tips them into unsettled.
//
// An `Attention` is the session's, never saved: focus starts at zero on every load. Time here is
// real seconds, since focus multiplies in-game rates and a slower clock is never stronger. Only
// the orbs stream's position goes back into the game state, so a reload continues the sequence.
import {
  ATTENTION_CEILING,
  ATTENTION_FLOOR,
  AWAY_FADE_S,
  BREATH_S,
  BREATHE_COOLDOWN_S,
  BREATHE_REACH,
  DANTIAN,
  FOCUS_DRAIN,
  HEAT_COOLING,
  HEAT_LIMIT,
  HEAT_PER_BREATH,
  HEAT_TIMED,
  HEAT_UNSETTLED_S,
  INHALE_SHARE,
  ORB_CAP,
  ORB_DRIFT_S,
  ORB_EDGE,
  ORB_EVERY_S,
  ORB_FOCUS,
  ORB_INHALE_LEAN,
  ORB_KINDS,
  ORB_LINGER_S,
  ORB_RING,
  ORB_TIMED,
  POINTER_REACH,
  YIN_HOURS,
  type OrbKindId,
  type QiTint,
} from '../content/attention.ts';
import { BRANCHES, DAWN_HOUR } from '../content/hours.ts';
import { inTutorial, ladderMethod } from './methods.ts';
import { Rng, streamSeed } from './rng.ts';
import type { Cultivator, GameState } from './state.ts';
import { stats } from './stats.ts';

/** What the day step needs from the seat: the qi factor, and whether you attend now. */
export interface Seat {
  /** Multiplies qi speed: 1 away, 1.25 for being there, up to 2 at full focus. */
  factor: number;
  /** Attended hours leave a second insight trickle. */
  attended: boolean;
}

/** Away: exactly today's rates. Offline time and the sims' away rows run on this. */
export const AWAY: Seat = { factor: 1, attended: false };

export interface Orb {
  id: number;
  kind: OrbKindId;
  tint: QiTint;
  /** Session seconds it appeared, reaches its ring near the figure, and fades. */
  born: number;
  arrives: number;
  fades: number;
  /** Where on the edge it came in, in radians, and its float's phase. */
  angle: number;
  wobble: number;
}

export interface Attention {
  /** The cultivator who sits; breathing names them. */
  who: string;
  /** Session time in real seconds. */
  t: number;
  /** The tab is visible and touched lately. */
  attended: boolean;
  /** How much of being there remains: 1 while attending, fading to 0 over a minute away. */
  presence: number;
  /** The focus meter, 0 at the floor to 1 at the ceiling. */
  focus: number;
  heat: number;
  /** Session second until which heat has the meridians unsettled: no bonus at all. */
  unsettledUntil: number;
  /** Session second the breathe key works again. */
  cooldownUntil: number;
  /** Resting the pointer on the dantian, or holding breathe. Stops the drain with Still Pool. */
  still: boolean;
  orbs: Orb[];
  nextOrbAt: number;
  nextId: number;
  /** Where the orbs stream stands. */
  rng: number;
  /** Orbs drawn in this session, and how many of them on the inhale. */
  caught: number;
  timed: number;
}

/** A fresh seat for a session: away, no focus, the first orb ten to twenty seconds off. */
export function startAttention(s: GameState, who: Cultivator = s.player): Attention {
  const rng = new Rng(s.rng.orbs ?? streamSeed(s.seed, 'orbs'));
  const first = between(rng, ORB_EVERY_S);
  return {
    who: who.id,
    t: 0,
    attended: false,
    presence: 0,
    focus: 0,
    heat: 0,
    unsettledUntil: 0,
    cooldownUntil: 0,
    still: false,
    orbs: [],
    nextOrbAt: first,
    nextId: 1,
    rng: rng.state,
    caught: 0,
    timed: 0,
  };
}

/** Writes the orbs stream's position back into the game, so a reload continues it. */
export function keepOrbStream(s: GameState, a: Attention): GameState {
  return s.rng.orbs === a.rng ? s : { ...s, rng: { ...s.rng, orbs: a.rng } };
}

const between = (rng: Rng, [lo, hi]: readonly [number, number]) => lo + rng.next() * (hi - lo);

// ---------------------------------------------------------------- the numbers

/** The most attention adds at full focus: +100%, more with Whale Swallows the Sea. */
export function attentionCeiling(c: Cultivator): number {
  return ATTENTION_CEILING * (1 + stats(c).focusCeiling);
}

/** Heat the meridians hold before they unsettle. */
export function heatLimit(c: Cultivator): number {
  return HEAT_LIMIT * (1 + stats(c).heatLimit);
}

/** The tutorial layers keep it simple: the floor only, no heat, so the first hour can't unsettle. */
export function seatTutorial(c: Cultivator): boolean {
  return inTutorial(c.qi);
}

export function heatUnsettled(a: Attention): boolean {
  return a.t < a.unsettledUntil;
}

/**
 * The qi factor now: ×1 away or while heat has you unsettled; otherwise the floor for being
 * there, and focus's share of the ceiling above it, both fading together once you're away.
 */
export function attentionFactor(a: Attention, c: Cultivator): number {
  if (heatUnsettled(a)) return 1;
  const span = seatTutorial(c) ? 0 : Math.max(0, attentionCeiling(c) - ATTENTION_FLOOR);
  return 1 + a.presence * (ATTENTION_FLOOR + span * a.focus);
}

/** What the day step reads from the seat. */
export function seatOf(a: Attention, c: Cultivator): Seat {
  return { factor: attentionFactor(a, c), attended: a.attended };
}

/** Where the breath cycle stands: 0 to 1, the inhale first. */
export function breathPhase(t: number): number {
  return (((t / BREATH_S) % 1) + 1) % 1;
}

export function inhaling(t: number): boolean {
  return breathPhase(t) < INHALE_SHARE;
}

/** The next moment an inhale begins at or after `t`. */
function nextInhale(t: number): number {
  return Math.ceil(t / BREATH_S - 1e-9) * BREATH_S;
}

/** Orbs come only while a qi method draws qi in; without one the qi slides off. */
export function orbsCanCome(c: Cultivator): boolean {
  return ladderMethod(c, 'qi') !== null;
}

/** The tint of the hour's orbs: dawn's purple at 卯, dark yin at night, else the hour's element. */
export function hourTint(hour: number): { kind: OrbKindId; tint: QiTint } {
  if (hour === DAWN_HOUR) return { kind: 'dawn', tint: 'dawn' };
  if (YIN_HOURS.includes(hour)) return { kind: 'yin', tint: 'yin' };
  return { kind: 'element', tint: BRANCHES[hour]!.element };
}

// ---------------------------------------------------------------- where an orb is

const ease = (p: number) => 1 - (1 - p) ** 3;

/** An orb's place in figure units at session time `t`: in from the edge, then floating on its ring. */
export function orbPosition(o: Orb, t: number): [number, number] {
  const ex = Math.cos(o.angle) * ORB_EDGE[0];
  const ey = Math.sin(o.angle) * ORB_EDGE[1] - 6;
  const p = Math.min(1, Math.max(0, (t - o.born) / (o.arrives - o.born)));
  const k = 1 - (1 - ORB_RING) * ease(p);
  const float = Math.max(0, t - o.arrives);
  const fx = Math.sin(float * 0.9 + o.wobble) * 5;
  const fy = Math.cos(float * 0.7 + o.wobble * 1.3) * 4;
  return [ex * k + fx, ey * k + fy];
}

/** How bright an orb is: fading in, then out at the end of its life. */
export function orbAlpha(o: Orb, t: number): number {
  return Math.max(0, Math.min(1, (t - o.born) / 0.8, (o.fades - t) / 2));
}

// ---------------------------------------------------------------- time

export interface TickInput {
  /** The tab is visible and touched lately (ATTENDED_INPUT_MS). */
  attended: boolean;
  /** The Abode's figure is on screen, so orbs can come. */
  abode: boolean;
  /** The hour of the day wheel now, for the orbs' tint. */
  hour: number;
}

/**
 * The seat after `dt` real seconds: presence follows attending, focus drains (unless Still Pool
 * holds it), heat cools, old orbs fade and a new one may drift in on the orbs stream.
 */
export function tickAttention(a: Attention, c: Cultivator, dt: number, at: TickInput): Attention {
  if (dt <= 0) return { ...a, attended: at.attended };
  const m = stats(c);
  const t = a.t + dt;
  const presence = at.attended ? 1 : Math.max(0, a.presence - dt / AWAY_FADE_S);
  const holding = at.attended && a.still && m.stillPool > 0;
  const drain = holding ? 0 : FOCUS_DRAIN * Math.max(0, 1 + m.focusDrain) * dt;
  const unsettled = t < a.unsettledUntil;
  const focus = unsettled ? 0 : Math.max(0, a.focus - drain);
  const heat = Math.max(0, a.heat - HEAT_COOLING * dt);
  let orbs = a.orbs.filter((o) => o.fades > t);
  let { nextOrbAt, nextId } = a;
  let rngState = a.rng;
  if (!at.abode || !orbsCanCome(c)) {
    orbs = [];
    nextOrbAt = Math.max(nextOrbAt, t);
  } else if (t >= nextOrbAt) {
    const rng = new Rng(rngState);
    if (orbs.length < ORB_CAP) {
      // Most orbs are timed to arrive on an inhale, so a breath with the figure catches them best.
      let arrives = t + ORB_DRIFT_S;
      if (rng.chance(ORB_INHALE_LEAN)) {
        arrives = nextInhale(arrives) + rng.next() * INHALE_SHARE * BREATH_S * 0.6;
      }
      const { kind, tint } = hourTint(at.hour);
      orbs = [
        ...orbs,
        {
          id: nextId++,
          kind,
          tint,
          born: arrives - ORB_DRIFT_S,
          arrives,
          fades: arrives + ORB_LINGER_S,
          angle: rng.next() * Math.PI * 2,
          wobble: rng.next() * Math.PI * 2,
        },
      ];
    }
    nextOrbAt = t + between(rng, ORB_EVERY_S);
    rngState = rng.state;
  }
  return {
    ...a,
    t,
    attended: at.attended,
    presence,
    focus,
    heat,
    orbs,
    nextOrbAt,
    nextId,
    rng: rngState,
  };
}

// ---------------------------------------------------------------- drawing qi in

export interface Breath {
  attention: Attention;
  /** The orbs drawn in, where they were when caught. */
  caught: { orb: Orb; at: [number, number] }[];
  /** The breath fell on the inhale. */
  timed: boolean;
  /** The breath tipped the meridians into unsettled. */
  overheated: boolean;
  /** Drawn in, but in the tutorial layers or unsettled, so it adds nothing. */
  wasted: boolean;
}

const distance = (p: readonly [number, number], q: readonly [number, number]) =>
  Math.hypot(p[0] - q[0], p[1] - q[1]);

/**
 * Orbs that can be drawn in now (faded in enough to see), nearest to a point first. `inPlace`
 * reads each orb where it arrives and stays, as reduced motion draws them.
 */
function orbsNear(a: Attention, p: readonly [number, number], reach: number, inPlace = false) {
  return a.orbs
    .filter((o) => a.t >= o.born + 0.3)
    .map((o) => {
      const at = orbPosition(o, inPlace ? o.arrives : a.t);
      return { orb: o, at, d: distance(at, p) };
    })
    .filter((x) => x.d <= reach)
    .sort((x, y) => x.d - y.d);
}

/**
 * One breath draws the given orbs in, as one: focus fills by each orb's worth (more on the inhale),
 * and the breath warms the meridians, less on the inhale. Past the heat limit you tip into
 * unsettled and lose the bonus for a while. The tutorial layers take orbs for nothing, with no heat.
 */
function drawIn(a: Attention, c: Cultivator, picked: { orb: Orb; at: [number, number] }[]): Breath {
  const timed = inhaling(a.t);
  const left = a.orbs.filter((o) => !picked.some((p) => p.orb.id === o.id));
  const base = {
    ...a,
    orbs: left,
    caught: a.caught + picked.length,
    timed: a.timed + (timed ? picked.length : 0),
  };
  if (picked.length === 0) {
    return { attention: a, caught: [], timed, overheated: false, wasted: false };
  }
  if (seatTutorial(c) || heatUnsettled(a)) {
    return { attention: base, caught: picked, timed, overheated: false, wasted: true };
  }
  const worth = picked.reduce((sum, p) => sum + ORB_KINDS[p.orb.kind].value, 0);
  const focus = Math.min(1, a.focus + ORB_FOCUS * worth * (timed ? ORB_TIMED : 1));
  const heat = a.heat + HEAT_PER_BREATH * (timed ? HEAT_TIMED : 1);
  const limit = heatLimit(c);
  if (heat >= limit) {
    return {
      attention: { ...base, focus: 0, heat: limit, unsettledUntil: a.t + HEAT_UNSETTLED_S },
      caught: picked,
      timed,
      overheated: true,
      wasted: false,
    };
  }
  return {
    attention: { ...base, focus, heat },
    caught: picked,
    timed,
    overheated: false,
    wasted: false,
  };
}

/** How many orbs one breath draws in: one, and one more for each Twin Streams. */
function perBreath(c: Cultivator): number {
  return 1 + Math.max(0, Math.floor(stats(c).twinBreath));
}

/** Whether the breathe key works now. */
export function canBreathe(a: Attention): boolean {
  return a.t >= a.cooldownUntil;
}

/**
 * `who` presses breathe (space or B): draws in the nearest orb within reach of the dantian, two
 * with Twin Streams. Every press starts the cooldown, caught or not, so it can't be mashed.
 */
export function breathe(a: Attention, who: Cultivator): Breath {
  const none = { attention: a, caught: [], timed: inhaling(a.t), overheated: false, wasted: false };
  if (who.id !== a.who || !canBreathe(a)) return none;
  const reach = BREATHE_REACH * (1 + stats(who).breathReach);
  const picked = orbsNear(a, DANTIAN, reach).slice(0, perBreath(who));
  const r = drawIn({ ...a, cooldownUntil: a.t + BREATHE_COOLDOWN_S }, who, picked);
  return r;
}

/**
 * `who` draws in the orb under the pointer or finger at (x, y), in figure units; with Twin Streams
 * the same breath takes the nearest others within the breathe key's reach. `inPlace` when the
 * orbs are drawn still where they float (reduced motion).
 */
export function catchAt(
  a: Attention,
  who: Cultivator,
  x: number,
  y: number,
  inPlace = false,
): Breath {
  const none = { attention: a, caught: [], timed: inhaling(a.t), overheated: false, wasted: false };
  if (who.id !== a.who) return none;
  const reach = 1 + stats(who).breathReach;
  const hit = orbsNear(a, [x, y], POINTER_REACH * reach, inPlace)[0];
  if (!hit) return none;
  const more = orbsNear(a, DANTIAN, BREATHE_REACH * reach, inPlace)
    .filter((o) => o.orb.id !== hit.orb.id)
    .slice(0, perBreath(who) - 1);
  return drawIn(a, who, [hit, ...more]);
}

/** Rest on the dantian, or hold breathe: with Still Pool, focus stops draining. */
export function setStill(a: Attention, still: boolean): Attention {
  return a.still === still ? a : { ...a, still };
}

/** Whether the pointer at (x, y), in figure units, rests on the dantian. */
export function onDantian(x: number, y: number): boolean {
  return distance([x, y], DANTIAN) <= 12;
}
