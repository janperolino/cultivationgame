// Opinion, ties and standing (design § The resolver, What lasts; § NPC basics; P3.4). A person's
// opinion of someone is the memories they hold of them, each a row of the memory table with its
// value, fade and tag, weighted by the holder's motives, leans, quirks and likes; the total reads
// as the trust word that talk reads. People judge only what they know: a deed lands as a memory
// when someone learns who did it (world.ts calls `landDeed` from `learn`), on the one it was done
// to, through a tie one step to those who love them, and on a power as standing. Ties are what
// people are to each other, made by deeds. Nothing here imports world.ts at run time, so the world
// can import this.
import { z } from 'zod';
import { REALM_IDS } from '../../content/realms.ts';
import {
  DEED_MEMORY,
  DEED_RIPPLE,
  DEED_STANDING,
  ENEMY_AT,
  ENEMY_KILLED,
  EVIL_DEEDS,
  FADING_SHARE,
  FORMER_LOVER_AT,
  HEAT_CAPS,
  LIKED_GIFT,
  MEMORIES,
  MEMORY_IDS,
  MOTIVE_WEIGHT,
  STANDING_IDS,
  STANDING_ROWS,
  STANDING_WORDS,
  TRUST_AT,
  WEIGHT_MAX,
  WEIGHT_MIN,
  type MemoryId,
  type MemoryRow,
  type StandingId,
  type StandingWord,
} from '../../content/memories.ts';
import {
  AXIS_IDS,
  EVIL_BY_CONSCIENCE,
  FADE_BAD,
  FADE_GOOD,
  GIFT_KINDS,
  LEANS,
  MOTIVE_IDS,
  MOTIVES,
  PLAIN_NATURE,
  QUIRK_IDS,
  QUIRKS,
  REGISTERS,
  TAG_AXES,
  TRADE_IDS,
  type AxisFactor,
  type AxisId,
  type GiftKind,
  type Nature,
} from '../../content/personality.ts';
import {
  HALF_TIES,
  hasPerson,
  KIN_INVERSE,
  KIN_RELATIONS,
  LOVE_TIES,
  pathPeople,
  person,
  RIPPLE_HALF,
  TIE_IDS,
  TIE_INVERSE,
  type KinRelation,
  type TieId,
} from '../../content/people.ts';
import { LADDERS } from '../../content/cultivation.ts';
import { ORG_OVERRIDES, ORG_ROWS } from '../../content/organizations.ts';
import type { TrustWord } from '../../content/resolver.ts';
import type { OriginChoice, OriginId } from '../../content/origins.ts';
import { likesOf, meetingShows, revealNature } from './nature.ts';
import type { Deed, Learner, World } from './world.ts';

// ── Schemas ──────────────────────────────────────────────────────────────────────────────────

export const MemorySchema = z.object({
  id: z.number().int(),
  /** Who remembers, and who it is about. */
  holder: z.string(),
  about: z.string(),
  row: z.enum(MEMORY_IDS),
  /** Its full value when it last landed; a stacking row's running total. */
  value: z.number(),
  /** World day it last landed, which its fade runs from. */
  day: z.number(),
  /** Who knows they hold it: those who saw it land. The rest is a motive you haven't learned. */
  known: z.array(z.string()),
  /** Its own words, in place of the row's: "Raised you in the caves". */
  note: z.string().optional(),
  /** A gift's kind, which counts double if they like it. */
  like: z.enum(GIFT_KINDS).optional(),
  /** The deed it came from, so a deed lands once. */
  deed: z.number().int().optional(),
});
export type Memory = z.infer<typeof MemorySchema>;

export const StandingSchema = z.object({
  id: z.number().int(),
  power: z.string(),
  about: z.string(),
  row: z.enum(STANDING_IDS),
  value: z.number(),
  day: z.number(),
  deed: z.number().int().optional(),
  /** A blood price paid: a killing that never fades is settled. */
  paid: z.boolean().optional(),
});
export type StandingMemory = z.infer<typeof StandingSchema>;

export const TieSchema = z.object({
  /** What `a` is to `b`: a is b's master. */
  a: z.string(),
  b: z.string(),
  kind: z.enum(TIE_IDS),
  /** Kin more closely, as `a` is to `b`. */
  relation: z.enum(KIN_RELATIONS).optional(),
  /** Who knows of it besides the two of them. */
  known: z.array(z.string()),
});
export type Tie = z.infer<typeof TieSchema>;

const Lean = z.literal([...LEANS]);

export const NatureSchema = z.object({
  motives: z.array(z.enum(MOTIVE_IDS)).max(3),
  axes: z.partialRecord(z.enum(AXIS_IDS), Lean),
  quirks: z.array(z.enum(QUIRK_IDS)).max(2),
  trade: z.enum(TRADE_IDS).optional(),
  path: z.enum(LADDERS).optional(),
  voice: z.object({ register: z.enum(REGISTERS), habit: z.string(), topic: z.string() }),
});

/**
 * Someone the world keeps who isn't a named person (design § Enemies, Who stays): a seed plus pins.
 * The seed and template regenerate their kit and rolls on demand (core/kept.ts); the pins are what
 * changed: their nature, where they belong, the realm they reached and what you took from them.
 * Someone kept before P3.5 has no seed and keeps only the pins.
 */
export const KeptSchema = z.object({
  name: z.string(),
  nature: NatureSchema,
  power: z.string().nullable(),
  home: z.string().nullable(),
  /** The roster template and the seed their kit rolls from. */
  template: z.string().optional(),
  seed: z.number().int().optional(),
  /** Their realm as generated or as it changed since. */
  realm: z.object({ realm: z.enum(REALM_IDS), stage: z.number().int().min(1) }).optional(),
  /** What they no longer carry: item ids and counts you took. */
  took: z.record(z.string(), z.number().int().min(0)).optional(),
  /** Stones you took. */
  tookStones: z.number().min(0).optional(),
});
export type Kept = z.infer<typeof KeptSchema>;

// ── Natures ──────────────────────────────────────────────────────────────────────────────────

/** Someone's nature: a named person's written one, a kept person's, or none drawn. */
export function natureOf(w: World, id: string): Nature {
  if (hasPerson(id)) return person(id).nature;
  return (w.kept[id]?.nature as Nature | undefined) ?? PLAIN_NATURE;
}

/** The power someone answers to, if the world knows it. */
export function powerOf(w: World, id: string): string | null {
  if (hasPerson(id)) return person(id).power ?? null;
  return w.kept[id]?.power ?? null;
}

export function lean(n: Nature, axis: AxisId): number {
  return n.axes[axis] ?? 0;
}

/** An axis's factor: its value at ±2, halfway to 1 at ±1, 1 at 0. */
export function axisFactor(n: Nature, f: AxisFactor): number {
  const l = lean(n, f.axis);
  if (l === 0) return 1;
  const end = l < 0 ? f.low : f.high;
  return Math.abs(l) >= 2 ? end : (1 + end) / 2;
}

// ── Memories ─────────────────────────────────────────────────────────────────────────────────

/** What weighs on a memory: the holder's motives, leans, quirks and likes, held to ×0.25–×3. */
export function weightOf(m: Pick<Memory, 'row' | 'like'>, n: Nature): number {
  const row = MEMORIES[m.row];
  const tag = row.tag;
  if (tag === 'evil') {
    const c = lean(n, 'conscience');
    return c > 0 ? EVIL_BY_CONSCIENCE[c as 1 | 2] : 0;
  }
  let w = 1;
  if (tag && n.motives.some((id) => (MOTIVES[id].tags as readonly string[]).includes(tag))) {
    w *= MOTIVE_WEIGHT;
  }
  for (const f of (tag && TAG_AXES[tag]) || []) w *= axisFactor(n, f);
  for (const q of n.quirks) {
    const quirk = QUIRKS[q] as { row?: { id: MemoryId; by: number }; gifts?: number };
    if (quirk.row?.id === m.row) w *= quirk.row.by;
    if (quirk.gifts !== undefined && m.row === 'gift') w *= quirk.gifts;
  }
  if (m.like && likesOf(n).includes(m.like)) w *= LIKED_GIFT;
  return Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, w));
}

/** Days a memory takes to fade for this holder, or null for never. */
export function fadeSpan(m: Pick<Memory, 'row' | 'value'>, n: Nature): number | null {
  const fade = MEMORIES[m.row].fade;
  if (fade === null) return null;
  return fade * axisFactor(n, m.value < 0 ? FADE_BAD : FADE_GOOD);
}

/** The share of its value a memory still holds on a day: 1 down to 0. */
export function memoryShare(m: Pick<Memory, 'row' | 'value' | 'day'>, n: Nature, day: number) {
  const span = fadeSpan(m, n);
  if (span === null) return 1;
  return Math.max(0, 1 - Math.max(0, day - m.day) / span);
}

export interface MemoryLine {
  memory: Memory;
  /** What it counts today: its value, faded and weighted. */
  now: number;
  weight: number;
  /** The share of its value left, 1 down to 0; never-fading ones stay at 1. */
  share: number;
  fading: boolean;
  never: boolean;
}

export function memoryLine(m: Memory, n: Nature, day: number): MemoryLine {
  const share = memoryShare(m, n, day);
  const weight = weightOf(m, n);
  return {
    memory: m,
    now: m.value * share * weight,
    weight,
    share,
    fading: share < FADING_SHARE,
    never: MEMORIES[m.row].fade === null,
  };
}

/**
 * The powers someone belongs to, a branch hall read as its parent: their memberships (a guest
 * elder's seat is an outsider's, so not among them) and the power a named or kept person answers to.
 */
function housesOf(w: World, id: string): string[] {
  const out = w.members.filter((m) => m.who === id && !m.guest).map((m) => m.power);
  const p = powerOf(w, id);
  if (p) out.push(ORG_OVERRIDES[p]?.branchOf ?? p);
  return [...new Set(out)];
}

/** The power two people share, if any: fellow members meet each other as "one of ours" (O3). */
function fellowPower(w: World, a: string, b: string): string | null {
  const theirs = housesOf(w, b);
  return housesOf(w, a).find((p) => theirs.includes(p)) ?? null;
}

/**
 * Everything a holder remembers of someone, as lines; faded ones and ones they don't feel left out.
 * A fellow member's "One of ours" (+10) is among them while they share a power, worked out and
 * never stored, and known to both.
 */
export function memoriesOf(
  w: World,
  holder: string,
  about: string,
  day: number,
  n: Nature = natureOf(w, holder),
): MemoryLine[] {
  const held = w.memories.filter((m) => m.holder === holder && m.about === about);
  if (holder !== about && fellowPower(w, holder, about)) {
    const fellow = MEMORIES.fellow;
    held.push({
      id: -1,
      holder,
      about,
      row: 'fellow',
      value: fellow.value,
      day,
      known: [holder, about],
    });
  }
  return held.map((m) => memoryLine(m, n, day)).filter((l) => l.share > 0 && l.weight > 0);
}

/** The trust word a total reads as. */
export function trustWord(total: number): TrustWord {
  const t = Math.round(total);
  let word: TrustWord = 'hostile';
  for (const r of TRUST_AT) if (t >= r.at) word = r.word;
  return word;
}

/** The trust words, low to high, as a level from −2 (hostile) to +2 (trusting). */
export function trustLevel(word: TrustWord): number {
  return TRUST_AT.findIndex((r) => r.word === word) - 2;
}

export interface Opinion {
  lines: MemoryLine[];
  total: number;
  word: TrustWord;
  /** Memories left out because the viewer doesn't know of them. */
  unknown: number;
}

export interface OpinionOpts {
  /** Read as this person knows it: only the memories they know the holder holds. */
  viewer?: string;
  /** A live line on top, such as "beneath me" while you show a lower realm. */
  extra?: number;
  /** Their nature as it weighs: a scene's own, or as much as the viewer knows of it. */
  nature?: Nature;
}

/** A holder's opinion of someone: the sum of their memories, as the trust word. */
export function opinion(
  w: World,
  holder: string,
  about: string,
  day: number,
  o: OpinionOpts = {},
): Opinion {
  const all = memoriesOf(w, holder, about, day, o.nature);
  const lines =
    o.viewer && o.viewer !== holder ? all.filter((l) => l.memory.known.includes(o.viewer!)) : all;
  const total = lines.reduce((t, l) => t + l.now, 0) + (o.extra ?? 0);
  return { lines, total, word: trustWord(total), unknown: all.length - lines.length };
}

export interface NewMemory {
  holder: string;
  about: string;
  row: MemoryId;
  /** Its value, for a row whose value is its own; the row's otherwise. */
  value?: number;
  note?: string;
  like?: GiftKind;
  deed?: number;
  /** Who sees it land; the one it's about knows of it if they're among them. */
  known?: readonly string[];
}

/**
 * A memory lands. A stacking row adds to what's left of the last, up to its cap; any other row
 * restarts at full. Then what it makes: a life saved makes a benefactor, killing someone they love
 * a sworn enemy (and a blood feud for their kin), a never-fading memory at −80 or worse an enemy,
 * and a lover who falls to wary a former lover.
 */
export function remember(w: World, m: NewMemory, day: number): World {
  if (m.holder === m.about) return w;
  const row: MemoryRow = MEMORIES[m.row];
  const value = row.own && m.value !== undefined ? m.value : (m.value ?? row.value);
  const known = [...new Set(m.known ?? [])];
  const n = natureOf(w, m.holder);
  const same = w.memories.find(
    (x) => x.holder === m.holder && x.about === m.about && x.row === m.row && x.note === m.note,
  );
  let memories: Memory[];
  let next = w.next;
  if (same && row.cap !== undefined) {
    const left = same.value * memoryShare(same, n, day);
    const sum = left + value;
    const capped = row.cap < 0 ? Math.max(row.cap, sum) : Math.min(row.cap, sum);
    const merged: Memory = {
      ...same,
      value: capped,
      day,
      known: [...new Set([...same.known, ...known])],
    };
    memories = w.memories.map((x) => (x.id === same.id ? merged : x));
  } else if (same) {
    const fresh: Memory = { ...same, value, day, known: [...new Set([...same.known, ...known])] };
    memories = w.memories.map((x) => (x.id === same.id ? fresh : x));
  } else {
    const mem: Memory = {
      id: next,
      holder: m.holder,
      about: m.about,
      row: m.row,
      value,
      day,
      known,
      ...(m.note ? { note: m.note } : {}),
      ...(m.like ? { like: m.like } : {}),
      ...(m.deed !== undefined ? { deed: m.deed } : {}),
    };
    memories = [...w.memories, mem];
    next += 1;
  }
  return afterMemory({ ...w, memories, next }, m, value, day);
}

/** The ties a memory makes, and a lover's fall. */
function afterMemory(w: World, m: NewMemory, value: number, day: number): World {
  const n = natureOf(w, m.holder);
  let world = w;
  const row = MEMORIES[m.row];
  if (m.row === 'saved-life') {
    world = addTie(world, { a: m.about, b: m.holder, kind: 'benefactor' });
  } else if (m.row === 'killed-loved') {
    if (tieOf(world, m.holder, m.about) !== 'sworn-enemy') {
      world = addTie(world, { a: m.about, b: m.holder, kind: 'sworn-enemy' });
      // A blood feud passes to the holder's kin: the one ripple that goes a step further.
      for (const t of tiesOf(world, m.holder)) {
        if (t.kind === 'kin' && t.other !== m.about) {
          world = remember(world, { holder: t.other, about: m.about, row: 'blood-feud' }, day);
        }
      }
    }
  } else if (row.fade === null && value * weightOf(m, n) <= ENEMY_AT) {
    const now = tieOf(world, m.holder, m.about);
    if (now !== 'enemy' && now !== 'sworn-enemy') {
      world = addTie(world, { a: m.about, b: m.holder, kind: 'enemy' });
    }
  }
  const tie = tieOf(world, m.holder, m.about);
  if (tie === 'lover' || tie === 'betrothed' || tie === 'dao-companion') {
    if (FORMER_LOVER_AT.includes(opinion(world, m.holder, m.about, day).word)) {
      world = addTie(world, { a: m.about, b: m.holder, kind: 'former-lover' });
    }
  }
  return world;
}

// ── Ties ─────────────────────────────────────────────────────────────────────────────────────

/** Makes a tie between two people, replacing any tie they had: one tie a pair. */
export function addTie(
  w: World,
  t: { a: string; b: string; kind: TieId; relation?: KinRelation; known?: string[] },
): World {
  if (t.a === t.b) return w;
  const kept = w.ties.filter((x) => !pair(x, t.a, t.b));
  const tie: Tie = {
    a: t.a,
    b: t.b,
    kind: t.kind,
    ...(t.relation ? { relation: t.relation } : {}),
    known: t.known ?? [],
  };
  return { ...w, ties: [...kept, tie] };
}

export function removeTie(w: World, a: string, b: string): World {
  return { ...w, ties: w.ties.filter((x) => !pair(x, a, b)) };
}

function pair(t: Tie, a: string, b: string): boolean {
  return (t.a === a && t.b === b) || (t.a === b && t.b === a);
}

/** What `to` is to `from`, or null when they have no tie. */
export function tieOf(w: World, from: string, to: string): TieId | null {
  const t = w.ties.find((x) => pair(x, from, to));
  if (!t) return null;
  return t.a === to ? t.kind : TIE_INVERSE[t.kind];
}

export interface TieView {
  other: string;
  /** What the other is to them. */
  kind: TieId;
  relation?: KinRelation;
  tie: Tie;
}

/** Everyone someone is tied to, and what each is to them. */
export function tiesOf(w: World, id: string): TieView[] {
  const out: TieView[] = [];
  for (const t of w.ties) {
    if (t.b === id) out.push({ other: t.a, kind: t.kind, relation: t.relation, tie: t });
    else if (t.a === id) {
      const relation = t.relation ? KIN_INVERSE[t.relation] : undefined;
      out.push({ other: t.b, kind: TIE_INVERSE[t.kind], relation, tie: t });
    }
  }
  return out;
}

/** Whether a viewer knows of a tie: they are one end of it, or they have learned it. */
export function knowsTie(t: Tie, viewer: string): boolean {
  return t.a === viewer || t.b === viewer || t.known.includes(viewer);
}

/** How a deed done to a victim reaches someone through a tie: in full, at half, or not at all. */
export function rippleTo(
  w: World,
  learner: string,
  learnerPower: string | null | undefined,
  victim: string,
  victimPower: string | null,
): number {
  const t = tieOf(w, learner, victim);
  if (t && LOVE_TIES.includes(t)) return 1;
  if (t && HALF_TIES.includes(t)) return RIPPLE_HALF;
  if (learnerPower && victimPower && learnerPower === victimPower) return RIPPLE_HALF;
  return 0;
}

/**
 * Someone learns who did a deed: it lands on them as a memory if it was done to them, through a
 * tie if it was done to someone they love, as "killed my enemy" if it was done to their enemy, as
 * "did evil" for the righteous otherwise, and on their power as standing if it was done to their
 * own. Each lands once. Those who saw it done know they hold it; the rest is hidden from the doer.
 */
export function landDeed(w: World, d: Deed, by: Learner, day: number, seen: boolean): World {
  if (w.memories.some((m) => m.deed === d.id && m.holder === by.id)) return w;
  const known = seen ? [d.actor] : [];
  const base = { holder: by.id, about: d.actor, deed: d.id, known };
  let world = w;
  // A frame found out: what they held against its victim was a lie, told them by the framer.
  if (d.kind === 'frame' && d.victim) {
    const held = world.memories.filter(
      (m) => m.holder === by.id && m.about === d.victim && m.row === 'wronged-us',
    );
    if (held.length > 0) {
      world = { ...world, memories: world.memories.filter((m) => !held.includes(m)) };
      world = remember(world, { ...base, row: 'lied' }, day);
      return world;
    }
  }
  if (d.victim === by.id) {
    const row = DEED_MEMORY[d.kind];
    if (row) world = remember(world, { ...base, row }, day);
  } else if (d.victim) {
    const tie = tieOf(world, by.id, d.victim);
    const ripple = DEED_RIPPLE[d.kind];
    const share = ripple
      ? rippleTo(world, by.id, by.power ?? powerOf(world, by.id), d.victim, d.power)
      : 0;
    if (ripple && share > 0) {
      world = remember(world, { ...base, row: ripple, value: MEMORIES[ripple].value * share }, day);
    } else if ((tie === 'enemy' || tie === 'sworn-enemy') && ENEMY_KILLED.includes(d.kind)) {
      world = remember(world, { ...base, row: 'killed-enemy' }, day);
    } else if (EVIL_DEEDS.includes(d.kind)) {
      world = remember(world, { ...base, row: 'did-evil' }, day);
    }
  }
  const power = by.power;
  const srow = DEED_STANDING[d.kind];
  if (
    power &&
    srow &&
    d.power === power &&
    !world.standing.some((x) => x.deed === d.id && x.power === power)
  ) {
    world = addStanding(world, { power, about: d.actor, row: srow, deed: d.id }, day);
  }
  return world;
}

/**
 * A contest settled: the loser remembers it, and a proud loser makes a rival of the winner, but
 * never a humble one.
 */
export function contest(w: World, winner: string, loser: string, day: number): World {
  let world = remember(w, { holder: loser, about: winner, row: 'beat-me', known: [winner] }, day);
  const n = natureOf(world, loser);
  const proud = n.motives.includes('pride') || lean(n, 'pride') >= 1;
  if (proud && lean(n, 'pride') > -1 && !tieOf(world, loser, winner)) {
    world = addTie(world, { a: winner, b: loser, kind: 'rival' });
  }
  return world;
}

/**
 * Who would act on what they are to you, and how: a card at most once a season (P3.12). Nobody
 * hunts someone they believe dead.
 */
export function grudges(
  w: World,
  about: string,
  day: number,
): { who: string; how: 'hunt' | 'avenge' | 'challenge' }[] {
  const out: { who: string; how: 'hunt' | 'avenge' | 'challenge' }[] = [];
  const dead = (h: string) =>
    w.deeds.some((d) => d.kind === 'death' && d.victim === about && !!d.knownBy[h]);
  for (const t of tiesOf(w, about)) {
    if (dead(t.other)) continue;
    if (t.kind === 'enemy') out.push({ who: t.other, how: 'hunt' });
    else if (t.kind === 'sworn-enemy') out.push({ who: t.other, how: 'avenge' });
    else if (t.kind === 'rival') out.push({ who: t.other, how: 'challenge' });
  }
  for (const m of w.memories) {
    if (m.about !== about || out.some((o) => o.who === m.holder) || dead(m.holder)) continue;
    if (MEMORIES[m.row].fade === null && opinion(w, m.holder, about, day).word === 'hostile') {
      out.push({ who: m.holder, how: 'hunt' });
    }
  }
  return out;
}

// ── Standing ─────────────────────────────────────────────────────────────────────────────────

export function addStanding(
  w: World,
  s: { power: string; about: string; row: StandingId; value?: number; deed?: number },
  day: number,
): World {
  const row = STANDING_ROWS[s.row];
  const value = 'own' in row && row.own && s.value !== undefined ? s.value : (s.value ?? row.value);
  const mem: StandingMemory = {
    id: w.next,
    power: s.power,
    about: s.about,
    row: s.row,
    value,
    day,
    ...(s.deed !== undefined ? { deed: s.deed } : {}),
  };
  return { ...w, standing: [...w.standing, mem], next: w.next + 1 };
}

/** A blood price paid: the power's killings of theirs that never fade are settled. */
export function payBloodPrice(w: World, power: string, about: string): World {
  return {
    ...w,
    standing: w.standing.map((s) =>
      s.power === power && s.about === about && s.row === 'killed-ours' ? { ...s, paid: true } : s,
    ),
  };
}

export interface StandingLine {
  memory: StandingMemory;
  now: number;
  share: number;
  fading: boolean;
}

export interface Standing {
  lines: StandingLine[];
  /** The sum of its reasons, before heat's cap. */
  sum: number;
  /** What it stands at: the sum held under heat's cap. */
  total: number;
  word: StandingWord;
  /** What it counts in a people check: ×0.5 hunted to ×1.5 honored. */
  leverage: number;
  /** Heat's cap, when it holds the standing down. */
  cap: { heat: number; at: number } | null;
}

const ORG_BY_ID = new Map(ORG_ROWS.map((r) => [r.id, r]));

/** The power someone belongs to that is at feud with another (the atlas's enemy and feud ties). */
export function foeHeld(w: World, power: string, about: string): string | null {
  const row = ORG_BY_ID.get(power);
  if (!row) return null;
  for (const m of w.members) {
    if (m.who !== about || m.power === power || m.guest) continue;
    const theirs = ORG_BY_ID.get(m.power);
    if (row.foes.includes(m.power) || theirs?.foes.includes(power)) return m.power;
  }
  return null;
}

/** A power's standing with someone: its reasons, held under the cap its heat sets. */
export function readStanding(
  w: World,
  power: string,
  about: string,
  day: number,
  heat: number,
): Standing {
  const lines: StandingLine[] = [];
  for (const s of w.standing) {
    if (s.power !== power || s.about !== about || s.paid) continue;
    const fade = STANDING_ROWS[s.row].fade;
    const share = fade === null ? 1 : Math.max(0, 1 - Math.max(0, day - s.day) / fade);
    if (share > 0)
      lines.push({ memory: s, now: s.value * share, share, fading: share < FADING_SHARE });
  }
  // One of a power at feud with this one stands at the feud's chill while they belong (the
  // organizations checkpoint), worked out and never stored.
  const foe = foeHeld(w, power, about);
  if (foe) {
    const row = STANDING_ROWS['foe-member'];
    const memory: StandingMemory = {
      id: -1,
      power,
      about,
      row: 'foe-member',
      value: row.value,
      day,
    };
    lines.push({ memory, now: row.value, share: 1, fading: false });
  }
  const sum = lines.reduce((t, l) => t + l.now, 0);
  const capRow = HEAT_CAPS.find((c) => heat >= c.heat);
  const capped = capRow && sum > capRow.cap;
  const total = capped ? capRow.cap : sum;
  const t = Math.round(total);
  let info: (typeof STANDING_WORDS)[number] = STANDING_WORDS[0];
  for (const r of STANDING_WORDS) if (t >= r.at) info = r;
  return {
    lines,
    sum,
    total,
    word: info.word,
    leverage: info.leverage,
    cap: capped ? { heat, at: capRow.cap } : null,
  };
}

/** The powers that hold any reason about someone. */
export function powersKnowing(w: World, about: string): string[] {
  return [...new Set(w.standing.filter((s) => s.about === about).map((s) => s.power))];
}

// ── Testing day ──────────────────────────────────────────────────────────────────────────────

/** What an origin path's people bring to testing day, in the world: ties, memories, first looks. */
export function startingWorld(
  w: World,
  origin: { id: OriginId; choice: OriginChoice } | null,
  you: string,
  day: number,
): World {
  let world = w;
  for (const a of pathPeople(origin).knows) {
    if (a.tie) world = addTie(world, { a: a.id, b: you, kind: a.tie });
    if (a.memory) {
      world = remember(
        world,
        {
          holder: a.id,
          about: you,
          row: a.memory.row,
          value: a.memory.value,
          note: a.memory.note,
          known: [you],
        },
        day,
      );
    }
    world = revealNature(world, a.id, meetingShows(natureOf(world, a.id)));
  }
  return world;
}
