// Tempering at the forge (design § Professions, Crafts, thin, the hands-on version; K4): refining's
// steady hand (content/forge.ts has the rules' numbers). Like fire control's sitting, it is the
// session's and never saved: the hand starts at zero each time you sit down, and only the forge
// stream's position goes back into the game, so a reload continues the sequence. The heats roll on
// their own `forge` stream. The hand it keeps is what the bench reads (core/crafts.ts, `workBench`'s
// `hand`); it moves only a piece's rarity.
import {
  COOL_FLOOR,
  COOLING,
  DARK,
  FIRE_S,
  HAND_SETTLE,
  HEAT_BASE,
  HOT,
  HOT_WIDTH,
  BLURRED,
  PIECE,
  QUENCH_BAND,
  QUENCH_COUNTS,
  QUENCH_EVERY,
  QUENCH_GLOW,
  QUENCH_REST_S,
  REST_S,
  RUNE_GAP,
  RUNE_GLYPHS,
  RUNE_RISE,
  RUNES,
  SEAL_BAND,
  SEAL_COOLS_S,
  SEAL_REACH,
  SEAL_S,
} from '../content/forge.ts';
import { Rng, streamSeed } from './rng.ts';
import type { GameState } from './state.ts';

/** How a seal or a quench came out: took 妙, blurred 粗, or failed 失. */
export type Temper = 'took' | 'blurred' | 'failed';

export interface RunePoint {
  id: number;
  /** Its place along the piece, in the scene's frame. */
  x: number;
  glyph: string;
  /** Raised until sealed; `left` when the metal went dark under it unsealed. */
  state: 'raised' | Temper | 'left';
}

export type ForgePhase = 'fire' | 'work' | 'quench';

export interface Forge {
  /** The cultivator who sits; a seal names them. */
  who: string;
  /** Session time in real seconds. */
  t: number;
  /** The steady hand, 0 to 1. */
  hand: number;
  phase: ForgePhase;
  /** Session second the phase began. */
  phaseAt: number;
  /** Heats begun, so every `QUENCH_EVERY`th is the quench. */
  heats: number;
  /** This heat's glow out of the fire: its base, and its hot spot's place along the piece. */
  base: number;
  hotX: number | null;
  /** Seconds of cooling since the piece left the fire, a seal's knock included. */
  cooled: number;
  runes: RunePoint[];
  /** Session second the last seal formed: none faster than `SEAL_S`. */
  sealAt: number;
  /** The quench's outcome and when, once it is done this heat. */
  quenched: { t: number; how: Temper } | null;
  nextId: number;
  /** Where the forge stream stands. */
  rng: number;
}

/** Sits down at the forge: no hand yet, the piece in the fire. */
export function startForge(s: GameState): Forge {
  return {
    who: s.player.id,
    t: 0,
    hand: 0,
    phase: 'fire',
    phaseAt: 0,
    heats: 0,
    base: HEAT_BASE,
    hotX: null,
    cooled: 0,
    runes: [],
    sealAt: -Infinity,
    quenched: null,
    nextId: 1,
    rng: s.rng.forge ?? streamSeed(s.seed, 'forge'),
  };
}

/** Writes the forge stream's position back into the game, so a reload continues it. */
export function keepForgeStream(s: GameState, f: Forge): GameState {
  return s.rng.forge === f.rng ? s : { ...s, rng: { ...s.rng, forge: f.rng } };
}

/** The glow of the piece at a place along it now: its heat out of the fire, cooled since. */
export function glowAt(f: Forge, x: number): number {
  const out =
    f.hotX === null ? f.base : f.base + HOT * Math.exp(-(((x - f.hotX) / HOT_WIDTH) ** 2));
  return (out + COOL_FLOOR) * Math.exp(-COOLING * f.cooled) - COOL_FLOOR;
}

/** Where a rune point stands in the scene's frame. */
export function runeAt(r: RunePoint): [number, number] {
  return [r.x, PIECE.y - RUNE_RISE];
}

const settle = (hand: number, q: number, times = 1) => {
  let h = hand;
  for (let i = 0; i < times; i++) h += (q - h) * HAND_SETTLE;
  return h;
};

/** What a glow makes of a seal: in the orange it takes, too hot it blurs, too cold it fails. */
function sealed(glow: number): Temper {
  return glow > SEAL_BAND[1] ? 'blurred' : glow >= SEAL_BAND[0] ? 'took' : 'failed';
}

/** What a glow makes of a quench: in the cherry it takes, too hot it warps, too cold it goes soft. */
function quenchOf(glow: number): Temper {
  return glow > QUENCH_BAND[1] ? 'failed' : glow >= QUENCH_BAND[0] ? 'took' : 'blurred';
}
const MOVES: Record<Temper, number> = { took: 1, blurred: BLURRED, failed: 0 };

/** The piece rises out of the fire for its next heat: rune points, or the quench. */
function nextHeat(f: Forge): Forge {
  const heats = f.heats + 1;
  const rng = new Rng(f.rng);
  const fresh = { ...f, heats, phaseAt: f.t, cooled: 0, quenched: null };
  if (heats % QUENCH_EVERY === 0) {
    const base = QUENCH_GLOW[0] + rng.next() * (QUENCH_GLOW[1] - QUENCH_GLOW[0]);
    return { ...fresh, phase: 'quench', base, hotX: null, runes: [], rng: rng.state };
  }
  const span = PIECE.x1 - PIECE.x0;
  const hotX = PIECE.x0 + 40 + rng.next() * (span - 80);
  const n = RUNES[0] + Math.floor(rng.next() * (RUNES[1] - RUNES[0] + 1));
  const runes: RunePoint[] = [];
  let id = f.nextId;
  for (let tries = 0; runes.length < n && tries < 50; tries++) {
    const x = PIECE.x0 + 30 + rng.next() * (span - 50);
    const glyph = RUNE_GLYPHS[Math.floor(rng.next() * RUNE_GLYPHS.length)]!;
    if (runes.every((r) => Math.abs(r.x - x) > RUNE_GAP))
      runes.push({ id: id++, x, glyph, state: 'raised' });
  }
  return {
    ...fresh,
    phase: 'work',
    base: HEAT_BASE,
    hotX,
    runes,
    nextId: id,
    rng: rng.state,
  };
}

/** Something a stretch of the forge did, for the canvas. */
export type ForgeEvent =
  | { type: 'heat'; quench: boolean }
  | { type: 'left'; rune: RunePoint }
  | { type: 'quenched'; how: Temper };

/**
 * The forge after `dt` real seconds: the piece sinks into the fire and rises for its next heat;
 * out of it, it cools, and a point the metal goes dark under unsealed is left (toward 0). A quench
 * never made before the piece goes dark fails three times over.
 */
export function tickForge(f0: Forge, dt: number): { forge: Forge; events: ForgeEvent[] } {
  if (dt <= 0) return { forge: f0, events: [] };
  const events: ForgeEvent[] = [];
  let f: Forge = { ...f0, t: f0.t + dt };
  if (f.phase === 'fire') {
    if (f.t - f.phaseAt >= FIRE_S) {
      f = nextHeat(f);
      events.push({ type: 'heat', quench: f.phase === 'quench' });
    }
    return { forge: f, events };
  }
  f = { ...f, cooled: f.cooled + dt };
  const sink = (rest: number, since: number) =>
    f.t - since >= rest ? { ...f, phase: 'fire' as const, phaseAt: f.t, runes: [] } : f;
  if (f.phase === 'work') {
    let hand = f.hand;
    const runes = f.runes.map((r) => {
      if (r.state !== 'raised' || glowAt(f, r.x) >= DARK) return r;
      hand = settle(hand, 0);
      const left = { ...r, state: 'left' as const };
      events.push({ type: 'left', rune: left });
      return left;
    });
    f = { ...f, hand, runes };
    if (runes.every((r) => r.state !== 'raised')) f = sink(REST_S, Math.max(f.sealAt, f.phaseAt));
  } else {
    if (!f.quenched && glowAt(f, 0) < DARK) {
      f = { ...f, hand: settle(f.hand, 0, QUENCH_COUNTS), quenched: { t: f.t, how: 'failed' } };
      events.push({ type: 'quenched', how: 'failed' });
    }
    if (f.quenched) f = sink(QUENCH_REST_S, f.quenched.t);
  }
  return { forge: f, events };
}

export interface Press {
  forge: Forge;
  /** The rune point a seal went into and how it took, or the quench's outcome; null for nothing. */
  sealed: { rune: RunePoint; how: Temper } | null;
  quenched: Temper | null;
}

/**
 * `who` presses a hand seal at a point in the scene's frame. At the quench it plunges the piece
 * into the spring, wherever the press: in the cherry it takes, too hot it warps, too cold it goes
 * soft, each three times over. Out of the fire
 * a seal forms (none faster than `SEAL_S`), knocks a little heat out of the piece and goes into
 * the nearest raised point in reach: in the orange it takes, too hot it blurs, too cold it fails.
 */
export function press(f: Forge, who: string, at: readonly [number, number]): Press {
  const none = { forge: f, sealed: null, quenched: null };
  if (who !== f.who || f.t - f.sealAt < SEAL_S) return none;
  if (f.phase === 'quench') {
    if (f.quenched) return none;
    const how = quenchOf(glowAt(f, 0));
    const hand = settle(f.hand, MOVES[how], QUENCH_COUNTS);
    return { forge: { ...f, hand, quenched: { t: f.t, how } }, sealed: null, quenched: how };
  }
  if (f.phase !== 'work') return none;
  const formed = { ...f, sealAt: f.t, cooled: f.cooled + SEAL_COOLS_S };
  const near = f.runes
    .filter((r) => r.state === 'raised')
    .map((r) => ({ r, d: Math.hypot(r.x - at[0], runeAt(r)[1] - at[1]) }))
    .filter((x) => x.d <= SEAL_REACH)
    .sort((a, b) => a.d - b.d)[0];
  if (!near) return { forge: formed, sealed: null, quenched: null };
  const how = sealed(glowAt(f, near.r.x));
  const rune = { ...near.r, state: how };
  return {
    forge: {
      ...formed,
      hand: settle(f.hand, MOVES[how]),
      runes: f.runes.map((r) => (r.id === rune.id ? rune : r)),
    },
    sealed: { rune, how },
    quenched: null,
  };
}
