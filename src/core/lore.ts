// The world book (P3.9w; design § The resolver, What GLM sees, What a person brings to the scene).
// Who knows what of the world and its systems: each person present is read as a knower (mortal or
// cultivator, where they live, their powers, their trade, their realm), and gets the entries whose
// tags they meet that touch the topic at hand. The mechanics half is written here from the game's
// own numbers, so a Foundation Pill's price, a realm's lifespan or a sect's allowance never drifts
// from what the engine charges; the lore and customs half is data (content/lore/). Nothing rolls.
import {
  DOOR_TOPICS,
  LORE_PER_PERSON,
  TOPIC_IDS,
  TOPICS,
  WRITTEN_LORE,
  type LoreEntry,
  type Topic,
} from '../content/lore.ts';
import { DAYS_PER_MONTH } from '../content/calendar.ts';
import { item } from '../content/items.ts';
import { GRADE_FACE, SILVER_TO_STONE, STONE_TO_SILVER } from '../content/money.ts';
import { ALLOWANCE_PILL, YEARS_PILLS } from '../content/organizations.ts';
import { realmIndex, REALMS, type RealmId } from '../content/realms.ts';
import { CRAFT_GRADES } from '../content/styles.ts';
import { POSTED_GOALS } from './map/board.ts';
import { POSTING_LI, POSTING_PAY, POSTINGS_PER_MONTH } from '../content/encounters/pace.ts';
import {
  market,
  MARKETS,
  marketFactor,
  mortalWages,
  prosperityOf,
  seenIn,
  type Market,
} from './markets.ts';
import { allowanceOf } from './orgs/contribution.ts';
import { houseOf, isOrganization, organization, theName } from './orgs/identity.ts';
import { priceOf } from './prices.ts';
import { isMortal, realmOfActor, type Actor } from './resolver/actor.ts';
import { currentPlaces, homeOf } from './resolver/knows.ts';
import { powerOf } from './resolver/opinion.ts';
import type { Scene } from './resolver/scene.ts';
import type { GameState } from './state.ts';

// ── Who they are, as the book reads them ──────────────────────────────────────────────────────

export interface Knower {
  mortal: boolean;
  realm: RealmId;
  /** Where they live, and every place above it: a `region:` or `place:` tag matches any of these. */
  places: string[];
  powers: string[];
  /** Their door kind, their mortal kind, their craft. */
  trades: string[];
}

/** A place and every place above it in the atlas. */
function chainOf(id: string | null): string[] {
  const out: string[] = [];
  const places = currentPlaces();
  for (let at = id; at && out.length < 12; at = places.get(at)?.parent ?? null) out.push(at);
  return out;
}

/** The crafts a craft door's name gives away, for its master's trade. */
const CRAFT_WORDS: readonly [RegExp, string][] = [
  [/alchem|pill|herb|medicin/i, 'alchemy'],
  [/refin|forge|smith|weapon/i, 'refining'],
  [/talisman/i, 'talismans'],
  [/array|formation/i, 'formations'],
];

/**
 * Someone as the world book reads them, by `who` (N1): the place they live, else where they stand
 * (a keeper or a face lives where you meet them); a keeper's door kind and a face's mortal kind
 * as their trade.
 */
export function knowerOf(s: GameState, scene: Scene, who: Actor): Knower {
  const at = s.goin?.place?.id ?? scene.place;
  const home = homeOf(s.world, who.id);
  const places = [...new Set([...chainOf(home), ...chainOf(at), scene.region])];
  const powers = new Set<string>();
  const own = who.power ?? powerOf(s.world, who.id);
  if (own) powers.add(own);
  for (const m of s.world.members) if (m.who === who.id) powers.add(m.power);
  const trades = new Set<string>();
  if (who.id.startsWith('keeper:')) {
    const door = who.id.split(':')[2];
    const f = s.goin?.place?.frames.find((x) => x.door === door);
    if (f) {
      trades.add(f.kind);
      if (f.kind === 'craft')
        for (const [re, craft] of CRAFT_WORDS) if (re.test(`${f.name} ${door}`)) trades.add(craft);
      if (f.kind === 'hall' && scene.power) powers.add(scene.power);
    }
  }
  if (who.face?.mortal) trades.add(who.face.mortal);
  return {
    mortal: isMortal(who),
    realm: realmOfActor(who).realm,
    places,
    powers: [...powers],
    trades: [...trades],
  };
}

/** Whether a knower meets one tag: `cultivator&region:qm-bianhuang` needs both parts. */
export function meetsTag(k: Knower, tag: string): boolean {
  return tag.split('&').every((part) => {
    const [kind, id = ''] = part.split(':');
    switch (kind) {
      case 'everyone':
        return true;
      case 'mortal':
        return k.mortal;
      case 'cultivator':
        return !k.mortal;
      case 'region':
      case 'place':
        return k.places.includes(id);
      case 'power':
        return k.powers.includes(id) || k.powers.some((p) => houseOf(p) === id);
      case 'trade':
        return k.trades.includes(id);
      case 'realm':
        return !k.mortal && realmIndex(k.realm) >= realmIndex(id.replace(/\+$/, '') as RealmId);
      default:
        return false;
    }
  });
}

export const knows = (k: Knower, e: LoreEntry) => e.knownBy.some((t) => meetsTag(k, t));

// ── The mechanics half, from the game's own numbers ──────────────────────────────────────────

/** A price in stones as people say it: low-grade up to a mid, mid-grade past it. */
export function stonePrice(low: number): string {
  if (low < GRADE_FACE) {
    const n = low < 20 ? Math.max(1, Math.round(low)) : Math.round(low / 10) * 10;
    return `${n.toLocaleString('en')} low-grade stone${n === 1 ? '' : 's'}`;
  }
  const mid = Math.round((low / GRADE_FACE) * 10) / 10;
  return `${mid.toLocaleString('en')} mid-grade stone${mid === 1 ? '' : 's'}`;
}

/** The market you stand in: the place's own, or the nearest place above it that keeps one. */
export function marketAt(at: string | null): Market | undefined {
  for (const id of chainOf(at)) {
    const m = market(id) ?? MARKETS.find((x) => x.place === id);
    if (m) return m;
  }
  return undefined;
}

function realmEntries(): LoreEntry[] {
  return REALMS.map((r, i) => {
    const prev = REALMS[i - 1];
    const way = prev ? ` The way in from ${prev.name} takes ${r.gate}.` : '';
    const steps = i === 0 ? `${r.stages} layers` : `${r.stages} stages`;
    const knownBy = i <= 1 ? ['cultivator'] : [`realm:${REALMS[Math.max(1, i - 1)]!.id}+`];
    return {
      id: `realm-${r.id}`,
      text: `${r.name} (${r.hanzi}) has ${steps}, and a life at it runs about ${r.lifespan.toLocaleString('en')} years.${way}`,
      about: ['realms', 'breakthrough', 'lifespan'],
      knownBy,
      words: [r.name.toLowerCase()],
    };
  });
}

/** A gate pill's and the allowance pill's price where you stand, and posted anywhere. */
function priceEntries(s: GameState, m: Market | undefined): LoreEntry[] {
  const out: LoreEntry[] = [];
  const day = s.calendar.day;
  for (const thing of ['foundation-pill', ALLOWANCE_PILL]) {
    const it = item(thing);
    out.push({
      id: `price-${thing}`,
      text: `A ${it.name} is posted at about ${stonePrice(priceOf(thing))} where it's sold at all; it comes from ${it.source ?? 'alchemists'}.`,
      about: ['pills', 'prices'],
      knownBy: ['cultivator', 'trade:craft', 'trade:trading', 'trade:alchemy'],
      words: [it.name.toLowerCase()],
    });
    if (!m) continue;
    const seen = seenIn(s.world, m, thing);
    const text =
      seen.source === 'none'
        ? `Nobody in ${m.name}'s market sells a ${it.name}; you'd have to go to ${it.source ?? 'a bigger market'}.`
        : `In ${m.name}'s market a ${it.name}, when one is to be had, goes for about ${stonePrice(priceOf(thing) * marketFactor(s.world, m, thing, day))}.`;
    out.push({
      id: `price-${thing}-here`,
      text,
      over: `price-${thing}`,
      about: ['pills', 'prices'],
      knownBy: [
        `cultivator&place:${m.place}`,
        `cultivator&place:${m.id}`,
        'trade:craft',
        'trade:trading',
        'trade:market',
        'trade:alchemy',
      ],
      words: [it.name.toLowerCase()],
    });
  }
  if (m) {
    const taels = Math.max(
      1,
      Math.round(mortalWages(prosperityOf(s.world, m.id, day)) * DAYS_PER_MONTH),
    );
    out.push({
      id: 'wages-here',
      text: `In ${m.name} a mortal laborer earns about ${taels} tael${taels === 1 ? '' : 's'} of silver a month.`,
      about: ['money', 'prices', 'mortals'],
      knownBy: [`place:${m.place}`, `place:${m.id}`],
      words: ['wage', 'wages', 'earn'],
    });
  }
  return out;
}

function moneyEntries(): LoreEntry[] {
  return [
    {
      id: 'stone-grades',
      text: `Spirit stones come in four grades, low, mid, high and top, each worth ${GRADE_FACE.toLocaleString('en')} of the grade below. A money changer gives ${STONE_TO_SILVER} taels of silver for a low-grade stone and asks ${SILVER_TO_STONE} for one.`,
      about: ['money'],
      knownBy: ['cultivator', 'trade:trading', 'trade:merchant', 'trade:market', 'trade:den'],
      words: ['spirit stone', 'money changer'],
    },
  ];
}

function boardEntries(): LoreEntry[] {
  const goals = POSTED_GOALS.map((g) => g.replace('-', ' ')).join(', ');
  return [
    {
      id: 'bounty-board',
      text: `A bounty board posts ${POSTINGS_PER_MONTH} goals a month (${goals}), ${POSTING_LI[0].toLocaleString('en')} to ${POSTING_LI[1].toLocaleString('en')} li out, paid in stones at the board on your return: about ${POSTING_PAY} low-grade at the wilds' edge, more the deeper it lies. A sect's mission hall posts the same and pays in contribution.`,
      about: ['board', 'money'],
      knownBy: ['cultivator', 'trade:bounty'],
      words: ['bounty', 'board', 'posting'],
    },
  ];
}

function craftEntries(): LoreEntry[] {
  const [one, two, three] = CRAFT_GRADES;
  return [
    {
      id: 'craft-grades',
      text: `A crafter's grade, ${one.name.toLowerCase()} (${one.hanzi}) to ${CRAFT_GRADES[8].name.toLowerCase()} (${CRAFT_GRADES[8].hanzi}), is the tier of their craft they hold, certified at a guild hall: a ${one.name.toLowerCase()} alchemist makes pills for Qi Condensation, a ${two.name.toLowerCase()} for Foundation, a ${three.name.toLowerCase()} for Core Formation.`,
      about: ['crafts'],
      knownBy: ['cultivator', 'trade:craft'],
      words: ['grade'],
    },
  ];
}

/** A power's own numbers: its year's Foundation Pills, told anyone, and its allowance, told a friend. */
function powerEntries(power: string): LoreEntry[] {
  if (!isOrganization(power)) return [];
  const house = houseOf(power);
  const org = organization(house);
  const name = theName(house);
  const The = name.charAt(0).toUpperCase() + name.slice(1);
  const out: LoreEntry[] = [];
  const qi = org.row.population?.qi ?? 0;
  if (qi) {
    const n = Math.max(
      YEARS_PILLS.min,
      Math.min(YEARS_PILLS.max, Math.floor(qi / YEARS_PILLS.per)),
    );
    out.push({
      id: `years-pills-${house}`,
      text: `Each year ${name} hands ${n} Foundation Pill${n === 1 ? '' : 's'} to the top of its trial's ranking; everyone else buys one, earns one or waits.`,
      about: ['pills', 'breakthrough', 'powers'],
      knownBy: [`power:${house}`],
      words: [YEARS_PILLS.pill.replace('-', ' '), 'trial', 'ranking'],
    });
  }
  const outer = allowanceOf(house, 'outer', 'qi-condensation');
  const inner = allowanceOf(house, 'inner', 'qi-condensation');
  const pill = item(ALLOWANCE_PILL).name;
  const pay = (a: { stones: number; pills: number }) =>
    `${stonePrice(a.stones)}${a.pills ? ` and ${a.pills} ${pill}${a.pills === 1 ? '' : 's'}` : ''}`;
  out.push({
    id: `allowance-${house}`,
    text: `${The} pays its outer disciples ${pay(outer)} a month and its inner disciples ${pay(inner)}; from the true seat up it rises with the holder's realm. Duties, missions and donations earn contribution, spent at its hall.`,
    about: ['contribution', 'money', 'powers', 'seats'],
    knownBy: [`power:${house}`],
    tells: 'friend',
  });
  return out;
}

/** The mechanics half for a scene: the realms, prices where you stand, money, the board, crafts and the powers here. */
export function mechanicsLore(
  s: GameState,
  at: string | null,
  powers: readonly string[],
): LoreEntry[] {
  return [
    ...realmEntries(),
    ...priceEntries(s, marketAt(at)),
    ...moneyEntries(),
    ...boardEntries(),
    ...craftEntries(),
    ...[...new Set(powers.map(houseOf))].flatMap(powerEntries),
  ];
}

// ── The topic at hand, and who knows what of it ───────────────────────────────────────────────

const wordRe = (w: string) =>
  new RegExp(`(^|[^a-z])${w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z])`);

/** The topics some words touch, by each topic's words. */
export function topicsIn(words: string): Topic[] {
  const t = words.toLowerCase();
  return TOPIC_IDS.filter((id) => TOPICS[id].some((w) => wordRe(w).test(t)));
}

/**
 * The topic at hand: what the interpreter named, your words this turn and the last two turns'
 * (with what was named then), and what the door you stand at is about.
 */
export function topicsAt(
  words: readonly string[],
  named: readonly string[],
  door: string | null,
): Topic[] {
  const out = new Set<Topic>();
  for (const t of named) if ((TOPIC_IDS as readonly string[]).includes(t)) out.add(t as Topic);
  for (const w of words) for (const t of topicsIn(w)) out.add(t);
  for (const t of (door && DOOR_TOPICS[door]) || []) out.add(t);
  return [...out];
}

/** How sure an entry is to be theirs in particular: a power's or a trade's first, everyone's last. */
function specificity(e: LoreEntry, k: Knower): number {
  const best = e.knownBy
    .filter((t) => meetsTag(k, t))
    .map((t) =>
      /power:|trade:|place:/.test(t) ? 3 : /region:|realm:/.test(t) ? 2 : t === 'everyone' ? 0 : 1,
    );
  return Math.max(0, ...best);
}

export interface LoreFor {
  /** What they know that touches the topic at hand, at most `LORE_PER_PERSON`. */
  entries: LoreEntry[];
  /** The topics at hand they know nothing of. */
  blank: Topic[];
}

/**
 * What someone knows of the topic at hand, by `who` (N1): the entries they'd know that touch it,
 * the ones your own words named first, then the most their own; and the topics they know nothing
 * of, so the narrator has them not know rather than invent.
 */
export function loreFor(
  k: Knower,
  book: readonly LoreEntry[],
  topics: readonly Topic[],
  words: readonly string[],
  /** The topics someone asked after, not merely the door's: a blank is told only for these. */
  asked: readonly Topic[] = topics,
): LoreFor {
  const said = words.join(' ').toLowerCase();
  const named = (e: LoreEntry) => (e.words ?? []).some((w) => wordRe(w).test(said));
  const known = book.filter((e) => knows(k, e));
  const better = new Set(known.flatMap((e) => (e.over ? [e.over] : [])));
  const theirs = known.filter((e) => !better.has(e.id));
  const touching = theirs
    .filter((e) => named(e) || e.about.some((t) => topics.includes(t)))
    .map((e) => ({ e, score: (named(e) ? 10 : 0) + specificity(e, k) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, LORE_PER_PERSON)
    .map((x) => x.e);
  const blank = asked.filter((t) => !theirs.some((e) => e.about.includes(t)));
  return { entries: touching, blank };
}

/** The whole book for a scene: the written half and the mechanics half. */
export function worldBook(s: GameState, at: string | null, powers: readonly string[]): LoreEntry[] {
  return [...WRITTEN_LORE, ...mechanicsLore(s, at, powers)];
}
