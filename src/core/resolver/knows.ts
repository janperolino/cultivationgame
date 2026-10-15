// What an NPC knows and tells (design § NPC basics, What an NPC knows; P3.4b). What someone knows
// is worked out from who they are, never stored: their home, their trade and their power, in three
// tiers. Common is the places round their home and the people of their place; private is their
// power's places and people, the kinds of site along their trade and who did the deeds they know
// of; secret is the hidden places tied to their home or power, the truths behind them and their
// own ties to a backer. Asked, they tell by their trust in you, a tier at neutral, two at friendly
// and all three at trusting, gregarious ones a tier more and reticent ones a tier less; the wary
// tell only the common, and a deceitful wary or hostile one lies, while an honest hostile one
// refuses. What you're told is heard, not known: it lists who told you, its truth hidden, until you
// see it for yourself, and a lie seen through lands as a lie found out. A staged death is a deed
// like any other, so a hunter who believes you dead tells it, and stops hunting.
//
// The atlas comes in as a `PlaceIndex`, so core never loads it: tests build one from the generated
// atlas, and P3.6's map hands in the same.
import { hasPerson, PEOPLE, person } from '../../content/people.ts';
import { TRADE_SITES } from '../../content/personality.ts';
import { HOME_REGION } from '../../content/resolver.ts';
import type { Nature } from '../../content/personality.ts';
import { revealNature } from './nature.ts';
import { lean, natureOf, opinion, powerOf, tiesOf } from './opinion.ts';
import { recordDeed, type Heard, type World } from './world.ts';

// ── Places ───────────────────────────────────────────────────────────────────────────────────

/** What knowing reads of an atlas entry. */
export interface PlaceEntry {
  id: string;
  kind: string;
  parent?: string | null;
  hidden?: boolean | string;
  ties?: readonly { to: string }[];
  truth?: string;
}

export interface PlaceIndex {
  get(id: string): PlaceEntry | undefined;
  children(id: string): PlaceEntry[];
  /** Entries tied to this one, from either end. */
  tied(id: string): PlaceEntry[];
}

/** The kinds of entry that are places someone can know the way to. */
const PLACE_KINDS = new Set([
  'region',
  'kingdom',
  'city',
  'landmark',
  'forbidden',
  'realm',
  'route',
  'sea',
  'site',
]);

export function placeIndex(entries: readonly PlaceEntry[]): PlaceIndex {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const kids = new Map<string, PlaceEntry[]>();
  const ties = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!ties.has(a)) ties.set(a, new Set());
    ties.get(a)!.add(b);
  };
  for (const e of entries) {
    if (e.parent) kids.set(e.parent, [...(kids.get(e.parent) ?? []), e]);
    for (const t of e.ties ?? []) {
      link(e.id, t.to);
      link(t.to, e.id);
    }
  }
  return {
    get: (id) => byId.get(id),
    children: (id) => kids.get(id) ?? [],
    tied: (id) =>
      [...(ties.get(id) ?? [])].map((x) => byId.get(x)).filter((x): x is PlaceEntry => !!x),
  };
}

const isPlace = (e: PlaceEntry) => PLACE_KINDS.has(e.kind);
const open = (e: PlaceEntry) => isPlace(e) && !e.hidden;

/** The region a place lies in: itself if it is one, else the nearest region above it. */
export function regionOf(places: PlaceIndex, id: string | null | undefined): string {
  let e = id ? places.get(id) : undefined;
  for (let i = 0; e && i < 12; i++) {
    if (e.kind === 'region') return e.id;
    e = e.parent ? places.get(e.parent) : undefined;
  }
  return HOME_REGION;
}

/**
 * The atlas the resolver reads when someone tells what they know: empty until the app (P3.6's map)
 * or a test hands one in. Scenes are saved, so the index lives here rather than on the scene.
 */
let PLACES: PlaceIndex = placeIndex([]);

export function setPlaces(p: PlaceIndex): void {
  PLACES = p;
}

export function currentPlaces(): PlaceIndex {
  return PLACES;
}

// ── What they know ───────────────────────────────────────────────────────────────────────────

export const TIERS = ['common', 'private', 'secret'] as const;
export type Tier = (typeof TIERS)[number];

export type Knowledge = Record<Tier, string[]>;

function homeOf(w: World, id: string): string | null {
  if (hasPerson(id)) return person(id).home;
  return w.kept[id]?.home ?? null;
}

/** What someone knows, by tier: facts as "place:<id>", "name:<id>", "sites:<kind>:<region>", "deed:<id>", "truth:<id>", "tie:<a>:<b>". */
export function knowledgeOf(
  w: World,
  places: PlaceIndex,
  id: string,
  n: Nature = natureOf(w, id),
): Knowledge {
  const home = homeOf(w, id);
  const power = powerOf(w, id);
  const common = new Set<string>();
  const priv = new Set<string>();
  const secret = new Set<string>();
  const homeEntry = home ? places.get(home) : undefined;

  if (homeEntry) {
    if (isPlace(homeEntry)) common.add(`place:${homeEntry.id}`);
    for (const c of places.children(homeEntry.id)) if (open(c)) common.add(`place:${c.id}`);
    if (homeEntry.parent) {
      for (const c of places.children(homeEntry.parent)) if (open(c)) common.add(`place:${c.id}`);
    }
    for (const c of [...places.children(homeEntry.id), ...places.tied(homeEntry.id)]) {
      if (isPlace(c) && c.hidden) secret.add(`place:${c.id}`);
    }
    if (homeEntry.truth) secret.add(`truth:${homeEntry.id}`);
  }
  for (const p of PEOPLE) {
    if (p.id === id) continue;
    if (home && p.home === home) common.add(`name:${p.id}`);
    else if (power && p.power === power) priv.add(`name:${p.id}`);
  }
  if (power) {
    const pe = places.get(power);
    for (const c of [...places.children(power), ...places.tied(power)]) {
      if (open(c)) priv.add(`place:${c.id}`);
      else if (isPlace(c) && c.hidden) secret.add(`place:${c.id}`);
    }
    if (pe?.truth) secret.add(`truth:${power}`);
  }
  if (n.trade) {
    const region = regionOf(places, home);
    for (const kind of TRADE_SITES[n.trade]) priv.add(`sites:${kind}:${region}`);
  }
  for (const d of w.deeds) {
    if (d.knownBy[id]?.who && !d.staged) priv.add(`deed:${d.id}`);
  }
  for (const t of tiesOf(w, id)) {
    if (t.kind === 'backer') secret.add(`tie:${t.other}:${id}`);
  }
  // A fact tells once, at its lowest tier.
  for (const f of common) {
    priv.delete(f);
    secret.delete(f);
  }
  for (const f of priv) secret.delete(f);
  return { common: [...common], private: [...priv], secret: [...secret] };
}

// ── What they tell ───────────────────────────────────────────────────────────────────────────

/** Tiers told by trust: none hostile, the common wary or neutral, two friendly, all trusting. */
const TOLD_BY_TRUST = { hostile: 0, wary: 1, neutral: 1, friendly: 2, trusting: 3 } as const;

export interface Telling {
  /** What they tell. */
  facts: string[];
  /** Whether it's a lie. */
  lie: boolean;
  /** They won't say. */
  refused: boolean;
  /** Tiers told, 0 to 3. */
  tiers: number;
}

/**
 * What someone tells when asked, by their trust in the asker: the tiers it opens, a tier more for
 * the gregarious and a tier less for the reticent; the wary tell only the common, a deceitful wary
 * or hostile one lies, and an honest hostile one refuses.
 */
export function telling(
  w: World,
  places: PlaceIndex,
  teller: string,
  asker: string,
  day: number,
  n: Nature = natureOf(w, teller),
): Telling {
  const word = opinion(w, teller, asker, day, { nature: n }).word;
  const honesty = lean(n, 'honesty');
  const bearing = lean(n, 'bearing');
  const shift = bearing >= 2 ? 1 : bearing <= -2 ? -1 : 0;
  const know = knowledgeOf(w, places, teller, n);
  const lies = (word === 'hostile' || word === 'wary') && honesty >= 1;
  if (lies) {
    return { facts: know.common, lie: true, refused: false, tiers: 1 };
  }
  if (word === 'hostile' && honesty <= 0) {
    return { facts: [], lie: false, refused: true, tiers: 0 };
  }
  const cap = word === 'wary' ? 1 : 3;
  const tiers = Math.max(0, Math.min(cap, TOLD_BY_TRUST[word] + shift));
  const facts = TIERS.slice(0, tiers).flatMap((t) => know[t]);
  return { facts, lie: false, refused: tiers === 0, tiers };
}

/** Facts told: what you don't already know goes into what you've heard, with who told you. */
export function hear(
  w: World,
  facts: readonly string[],
  from: string,
  day: number,
  truth: boolean,
): World {
  const fresh: Heard[] = [];
  for (const fact of facts) {
    if (truth && w.known.includes(fact)) continue;
    if (w.heard.some((h) => h.fact === fact && h.from === from)) continue;
    fresh.push({ fact, from, day, true: truth });
  }
  return fresh.length ? { ...w, heard: [...w.heard, ...fresh] } : w;
}

/** What you've heard of a fact, and from whom. */
export function heardOf(w: World, fact: string): Heard[] {
  return w.heard.filter((h) => h.fact === fact);
}

/**
 * You see a fact for yourself: it is known, and what you heard of it drops away; whoever lied to
 * you about it is caught in the lie, which you remember, and their Honesty shows.
 */
export function see(w: World, fact: string, you: string, place: string, day: number): World {
  let world: World = w.known.includes(fact) ? w : { ...w, known: [...w.known, fact] };
  const about = world.heard.filter((h) => h.fact === fact);
  if (about.length === 0) return world;
  world = { ...world, heard: world.heard.filter((h) => h.fact !== fact) };
  for (const liar of new Set(about.filter((h) => !h.true).map((h) => h.from))) {
    world = recordDeed(
      world,
      { kind: 'lie', actor: liar, victim: you, place, witnesses: [{ id: you }] },
      day,
    ).world;
    world = revealNature(world, liar, ['honesty']);
  }
  return world;
}

// ── A staged death ───────────────────────────────────────────────────────────────────────────

/** Whether someone believes another dead: they know of a death of theirs, staged or not. */
export function believesDead(w: World, holder: string, id: string): boolean {
  return w.deeds.some((d) => d.kind === 'death' && d.victim === id && !!d.knownBy[holder]);
}

/**
 * Someone who believed you dead sees you alive: the staged death was a lie told them, which they
 * now know and remember, and they no longer believe it.
 */
export function foundAlive(w: World, holder: string, id: string, place: string, day: number) {
  const staged = w.deeds.filter(
    (d) => d.kind === 'death' && d.staged && d.victim === id && d.knownBy[holder],
  );
  if (staged.length === 0) return w;
  let world: World = {
    ...w,
    deeds: w.deeds.map((d) => {
      if (!staged.includes(d)) return d;
      const knownBy = { ...d.knownBy };
      delete knownBy[holder];
      return { ...d, knownBy };
    }),
  };
  world = recordDeed(
    world,
    { kind: 'lie', actor: id, victim: holder, place, witnesses: [{ id: holder }] },
    day,
  ).world;
  return world;
}
