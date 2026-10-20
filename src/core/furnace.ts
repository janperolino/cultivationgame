// Fire control at the furnace (design § Professions, Crafts, thin, the hands-on version; K3): the
// steady hand's minigame, burning out the dross 去杂 (content/furnace.ts has the rules' numbers).
// Like the seat's attention, a sitting is the session's and never saved: the hand starts at zero
// each time you sit down, and only the furnace stream's position goes back into the game, so a
// reload continues the sequence. The specks roll on their own `furnace` stream. The hand it keeps
// is what the bench reads (core/crafts.ts, `workBench`'s `hand`); it moves only a batch's rarity.
import type { Recipe } from '../content/catalogs/types.ts';
import {
  COOLING,
  DRIFT,
  ESSENCE,
  ESSENCE_BURNED_COUNTS,
  FIRST_HERB_S,
  FLICK_AFTER_S,
  FLICK_HEAT,
  FLICK_REACH,
  FLIGHT_S,
  FURNACE_BREATH_S,
  FURNACE_INHALE,
  HAND_SETTLE,
  HERB_EVERY_S,
  HERB_PUFF,
  MOUTH,
  MOUTH_SPREAD,
  PUFF,
  PUFF_GAP_S,
  RISE,
  ROAR_AT,
  ROAR_HEAT,
  ROAR_HIT,
  ROAR_S,
} from '../content/furnace.ts';
import { Rng, streamSeed } from './rng.ts';
import type { GameState } from './state.ts';

export type SpeckKind = 'essence' | 'dross';

export interface Speck {
  id: number;
  kind: SpeckKind;
  /** Session seconds it leaves the mouth. */
  born: number;
  /** Its sideways drift, its height and where off the mouth's middle it starts. */
  dx: number;
  up: number;
  x0: number;
}

export interface Furnace {
  /** The cultivator who sits; a flick names them. */
  who: string;
  /** Session time in real seconds. */
  t: number;
  heat: number;
  /** The steady hand, 0 to 1. */
  hand: number;
  specks: Speck[];
  /** The herbs going in, in the recipe's order, and the next one's place in it. */
  doses: string[];
  dose: number;
  nextHerb: number;
  /** Session second the roar ends: no flicks till then. */
  roarUntil: number;
  /** Breaths taken, so each breath puffs once. */
  breaths: number;
  nextId: number;
  /** Where the furnace stream stands. */
  rng: number;
}

/**
 * The order the herbs go in: each input as often as its count, spread through the dose so the
 * commonest never bunch (six kernels and four bitterroots: K K R K R K K R K R).
 */
export function doseOrder(r: Recipe): string[] {
  const total = r.inputs.reduce((t, i) => t + i.count, 0);
  const placed = r.inputs.map(() => 0);
  const out: string[] = [];
  for (let k = 0; k < total; k++) {
    let best = 0;
    let gap = -Infinity;
    r.inputs.forEach((i, n) => {
      const g = (i.count * (k + 1)) / total - placed[n]!;
      if (g > gap + 1e-9) {
        gap = g;
        best = n;
      }
    });
    placed[best]!++;
    out.push(r.inputs[best]!.thing);
  }
  return out;
}

/** Sits down at the furnace for a recipe: no hand yet, the furnace warm, the first herb soon. */
export function startFurnace(s: GameState, r: Recipe): Furnace {
  return {
    who: s.player.id,
    t: 0,
    heat: 0.2,
    hand: 0,
    specks: [],
    doses: doseOrder(r),
    dose: 0,
    nextHerb: FIRST_HERB_S,
    roarUntil: -Infinity,
    breaths: 0,
    nextId: 1,
    rng: s.rng.furnace ?? streamSeed(s.seed, 'furnace'),
  };
}

/** Writes the furnace stream's position back into the game, so a reload continues it. */
export function keepFurnaceStream(s: GameState, f: Furnace): GameState {
  return s.rng.furnace === f.rng ? s : { ...s, rng: { ...s.rng, furnace: f.rng } };
}

/** Takes a new recipe's herbs into the dose, keeping the hand and the heat. */
export function changeRecipe(f: Furnace, r: Recipe): Furnace {
  return { ...f, doses: doseOrder(r), dose: 0 };
}

/** Where the lid's breath stands: 0 to 1, the inhale first. */
export function furnaceBreath(t: number): number {
  return (((t / FURNACE_BREATH_S) % 1) + 1) % 1;
}

/** How far the lid lifts, 0 to 1: up and down through the inhale, shut the rest of the breath. */
export function lidLift(t: number): number {
  const p = furnaceBreath(t);
  return p < FURNACE_INHALE ? Math.sin((p / FURNACE_INHALE) * Math.PI) : 0;
}

/** Whether the furnace roars now, so nothing can be flicked. */
export function roaring(f: Furnace): boolean {
  return f.t < f.roarUntil;
}

/** How far through its flight a speck is, 0 leaving the mouth to 1 falling back in. */
export function speckFlight(s: Speck, t: number): number {
  return Math.min(1, Math.max(0, (t - s.born) / FLIGHT_S));
}

/**
 * A speck's place in the furnace's frame: up out of the mouth on a parabola, drifting sideways,
 * and back down into it. `still` reads it at its flight's peak, as reduced motion draws it.
 */
export function speckAt(s: Speck, t: number, still = false): [number, number] {
  const p = still ? 0.5 : speckFlight(s, t);
  return [MOUTH[0] + s.x0 + s.dx * Math.sin(p * Math.PI), MOUTH[1] - s.up * 4 * p * (1 - p)];
}

const settle = (hand: number, q: number) => hand + (q - hand) * HAND_SETTLE;

function puff(f: Furnace, n: number): Furnace {
  const rng = new Rng(f.rng);
  const specks = [...f.specks];
  let id = f.nextId;
  for (let i = 0; i < n; i++)
    specks.push({
      id: id++,
      kind: rng.chance(ESSENCE) ? 'essence' : 'dross',
      born: f.t + i * PUFF_GAP_S,
      dx: (rng.next() - 0.5) * 2 * DRIFT,
      up: RISE[0] + rng.next() * (RISE[1] - RISE[0]),
      x0: (rng.next() - 0.5) * 2 * MOUTH_SPREAD,
    });
  return { ...f, specks, nextId: id, rng: rng.state };
}

/** Something a stretch of the furnace did, for the canvas. */
export type FurnaceEvent =
  { type: 'herb'; thing: string } | { type: 'fell'; speck: Speck } | { type: 'roar' };

/**
 * The furnace after `dt` real seconds: it cools, puffs on each breath and each herb, and the
 * specks that fall back in move the hand (dross toward 0; essence nothing). At the top it roars.
 */
export function tickFurnace(f0: Furnace, dt: number): { furnace: Furnace; events: FurnaceEvent[] } {
  if (dt <= 0) return { furnace: f0, events: [] };
  const events: FurnaceEvent[] = [];
  let f: Furnace = { ...f0, t: f0.t + dt, heat: Math.max(0, f0.heat - COOLING * dt) };
  if (f.heat >= ROAR_AT && !roaring(f)) {
    f = { ...f, roarUntil: f.t + ROAR_S, heat: ROAR_HEAT, hand: Math.max(0, f.hand - ROAR_HIT) };
    events.push({ type: 'roar' });
  }
  const breaths = Math.floor(f.t / FURNACE_BREATH_S) + 1;
  if (breaths > f.breaths) {
    const rng = new Rng(f.rng);
    const n = PUFF[0] + Math.floor(rng.next() * (PUFF[1] - PUFF[0] + 1));
    f = puff({ ...f, breaths, rng: rng.state }, n);
  }
  if (f.t >= f.nextHerb && f.doses.length > 0) {
    events.push({ type: 'herb', thing: f.doses[f.dose]! });
    f = puff(
      { ...f, dose: (f.dose + 1) % f.doses.length, nextHerb: f.t + HERB_EVERY_S },
      HERB_PUFF,
    );
  }
  let hand = f.hand;
  const left: Speck[] = [];
  for (const s of f.specks) {
    if (f.t <= s.born + FLIGHT_S) left.push(s);
    else {
      if (s.kind === 'dross') hand = settle(hand, 0);
      events.push({ type: 'fell', speck: s });
    }
  }
  return { furnace: { ...f, specks: left, hand }, events };
}

export interface Flick {
  furnace: Furnace;
  /** The speck burned, where it was, or null for a miss (or a roaring furnace). */
  burned: { speck: Speck; at: [number, number] } | null;
}

/**
 * `who` flicks fire at a point in the furnace's frame: it heats the furnace, hit or miss, and burns
 * the nearest speck in reach. Dross burned moves the hand toward 1; essence burned toward 0, twice.
 * Nothing flicks while the furnace roars. `still` reads the specks where reduced motion draws them.
 */
export function flick(
  f: Furnace,
  who: string,
  at: readonly [number, number],
  still = false,
): Flick {
  if (who !== f.who || roaring(f)) return { furnace: f, burned: null };
  const heated = { ...f, heat: f.heat + FLICK_HEAT };
  const near = f.specks
    .filter((s) => f.t > s.born + FLICK_AFTER_S)
    .map((s) => ({ s, p: speckAt(s, f.t, still) }))
    .map((x) => ({ ...x, d: Math.hypot(x.p[0] - at[0], x.p[1] - at[1]) }))
    .filter((x) => x.d <= FLICK_REACH)
    .sort((a, b) => a.d - b.d)[0];
  if (!near) return { furnace: heated, burned: null };
  let hand = f.hand;
  if (near.s.kind === 'dross') hand = settle(hand, 1);
  else for (let i = 0; i < ESSENCE_BURNED_COUNTS; i++) hand = settle(hand, 0);
  return {
    furnace: { ...heated, hand, specks: f.specks.filter((s) => s.id !== near.s.id) },
    burned: { speck: near.s, at: near.p },
  };
}

/** The herb going in next, and the seconds till it does. */
export function nextHerb(f: Furnace): { thing: string; in: number } | null {
  const thing = f.doses[f.dose];
  return thing ? { thing, in: f.nextHerb - f.t } : null;
}
