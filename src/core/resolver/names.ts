// Karma, renown, infamy and membership (design § The resolver, What lasts; § NPC basics; P3.4b).
// Karma is heaven's ledger, a number per actor that moves as a deed is done, seen or not, and that
// no person reads. Renown and infamy are how far your name has carried, in points per region: a
// deed's points land once someone learns who did it, once per deed and region, and a point fades
// each season after the last gain. A thin membership is a record of who belongs to which power;
// joining gives the power's token, standing as one of theirs and the region map. Nothing here
// imports world.ts at run time, so the world can import this.
import {
  deedInfo,
  FAME_COOL_DAYS,
  FAME_LEVELS,
  FAME_WORDS,
  HOME_REGION,
  NAME_KNOWN_AT,
  VILLAIN_AT,
  VILLAIN_RENOWN,
} from '../../content/resolver.ts';
import { addStanding } from './opinion.ts';
import type { Deed, Fame, World } from './world.ts';

// ── Karma ────────────────────────────────────────────────────────────────────────────────────

export function karmaOf(w: World, who: string): number {
  return w.karma[who] ?? 0;
}

export function addKarma(w: World, who: string, n: number): World {
  if (n === 0) return w;
  return { ...w, karma: { ...w.karma, [who]: karmaOf(w, who) + n } };
}

// ── Renown and infamy ────────────────────────────────────────────────────────────────────────

export type FameKind = 'renown' | 'infamy';

const NONE = { n: 0, day: 0 };

/** Points today: their value at the last gain, less one for each season since. */
function pointsNow(p: { n: number; day: number }, day: number): number {
  return Math.max(0, p.n - Math.floor(Math.max(0, day - p.day) / FAME_COOL_DAYS));
}

/** Someone's points of renown or infamy in a region today. */
export function famePoints(
  w: World,
  who: string,
  region: string,
  kind: FameKind,
  day: number,
): number {
  const f = w.fame[who]?.[region];
  return f ? pointsNow(f[kind], day) : 0;
}

/** The level points read as, 0 to 9. */
export function fameLevel(points: number): number {
  let level = 0;
  for (const at of FAME_LEVELS) if (points >= at) level += 1;
  return level;
}

/** Someone's level of renown or infamy in a region today, 0 to 9. */
export function fameOf(w: World, who: string, region: string, kind: FameKind, day: number) {
  return fameLevel(famePoints(w, who, region, kind, day));
}

/** How far a level carries a name, in words. */
export function fameWord(level: number): string {
  let word: string = FAME_WORDS[0].word;
  for (const f of FAME_WORDS) if (level >= f.at) word = f.word;
  return word;
}

/** Adds points of renown or infamy in a region, from what they stand at today. */
export function addFame(
  w: World,
  who: string,
  region: string,
  kind: FameKind,
  n: number,
  day: number,
): World {
  if (n === 0) return w;
  const mine = w.fame[who] ?? {};
  const f: Fame = mine[region] ?? { renown: NONE, infamy: NONE };
  const value = Math.max(0, pointsNow(f[kind], day) + n);
  return {
    ...w,
    fame: { ...w.fame, [who]: { ...mine, [region]: { ...f, [kind]: { n: value, day } } } },
  };
}

/** The regions someone's name is known in at all, with their levels today. */
export function namesOf(
  w: World,
  who: string,
  day: number,
): { region: string; renown: number; infamy: number }[] {
  return Object.keys(w.fame[who] ?? {})
    .map((region) => ({
      region,
      renown: fameOf(w, who, region, 'renown', day),
      infamy: fameOf(w, who, region, 'infamy', day),
    }))
    .filter((r) => r.renown > 0 || r.infamy > 0);
}

/**
 * A deed's renown or infamy carries across its region once someone learns who did it, once. Killing
 * someone already infamous there is renown, not infamy.
 */
export function landFame(w: World, d: Deed, day: number): World {
  const region = d.region ?? HOME_REGION;
  const key = `fame:${region}`;
  if (d.landed.includes(key) || d.staged) return w;
  const info = deedInfo(d.kind);
  let renown = info.renown ?? 0;
  let infamy = info.infamy ?? 0;
  if (
    (d.kind === 'killing' || d.kind === 'massacre') &&
    d.victim &&
    fameOf(w, d.victim, region, 'infamy', day) >= VILLAIN_AT
  ) {
    renown = VILLAIN_RENOWN;
    infamy = 0;
  }
  let world: World = {
    ...w,
    deeds: w.deeds.map((x) => (x.id === d.id ? { ...x, landed: [...x.landed, key] } : x)),
  };
  world = addFame(world, d.actor, region, 'renown', renown, day);
  world = addFame(world, d.actor, region, 'infamy', infamy, day);
  return world;
}

/**
 * Whether someone knows your name: they have met you (they hold a memory of you), or your renown
 * or infamy carries across a town there. A disguise or a false name hides it; the caller says so.
 */
export function knowsName(
  w: World,
  viewer: string,
  who: string,
  region: string,
  day: number,
): boolean {
  if (w.memories.some((m) => m.holder === viewer && m.about === who)) return true;
  return (
    Math.max(fameOf(w, who, region, 'renown', day), fameOf(w, who, region, 'infamy', day)) >=
    NAME_KNOWN_AT
  );
}

// ── Membership ───────────────────────────────────────────────────────────────────────────────

export function memberOf(w: World, who: string): string[] {
  return w.members.filter((m) => m.who === who).map((m) => m.power);
}

export function isMember(w: World, who: string, power: string): boolean {
  return w.members.some((m) => m.who === who && m.power === power);
}

/**
 * Joining a power: its token opens its gate ("token:<power>"), standing as one of its own (+10
 * while you belong), and its region map ("map:<region>", which P3.6's fog reads) when the one
 * joining is the player, whose learning is `known`.
 */
export function join(
  w: World,
  who: string,
  power: string,
  day: number,
  opts: { you?: boolean; region?: string } = {},
): World {
  if (isMember(w, who, power)) return w;
  let world: World = { ...w, members: [...w.members, { who, power, since: day }] };
  world = addStanding(world, { power, about: who, row: 'member' }, day);
  if (opts.you) {
    const learned = [`token:${power}`, `map:${opts.region ?? HOME_REGION}`];
    world = { ...world, known: [...world.known, ...learned.filter((k) => !w.known.includes(k))] };
  }
  return world;
}

/** Leaving a power: the membership and its standing go, the token with them. */
export function leave(w: World, who: string, power: string, opts: { you?: boolean } = {}): World {
  if (!isMember(w, who, power)) return w;
  return {
    ...w,
    members: w.members.filter((m) => !(m.who === who && m.power === power)),
    standing: w.standing.filter(
      (s) => !(s.power === power && s.about === who && s.row === 'member'),
    ),
    known: opts.you ? w.known.filter((k) => k !== `token:${power}`) : w.known,
  };
}
