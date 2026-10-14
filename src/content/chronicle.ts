// The chronicle's event types (design § UI and screens, less spreadsheet): every event has a day,
// a type, the actors by id, a place and a data object, and its text comes from the template for
// its type, written as a biography. NPC memory, the storyteller, rumors and the person log read
// the events, not the text. A new kind of event is a template here.
import { card } from './cards/index.ts';
import type { CardOutcome } from './cards/schema.ts';
import { GRADES, type GradeId, type LadderId } from './cultivation.ts';
import { BRANCHES, HOUR_KINDS, HOUR_OPENINGS, SLEEP_FREED_TEXT, type HourKind } from './hours.ts';
import { copyTitle } from './copies.ts';
import { COMBAT_DAOS, type CombatDaoId } from './daos.ts';
import { INTENT_HANZI, INTENT_STAGES } from './intent.ts';
import { hasManual, manual } from './manuals.ts';
import { MASTERY } from './mastery.ts';
import { method } from './methods.ts';
import { originPath, type OriginChoice, type OriginId } from './origins.ts';
import { realm, stageName, type RealmId } from './realms.ts';
import { routine } from './routines.ts';
import { talent } from './talents.ts';
import { technique } from './techniques.ts';
import { anyNode, hasAnyNode } from './nodes.ts';

export type EventValue = string | number | boolean | null;
export type EventData = Readonly<Record<string, EventValue>>;

/** What a template knows of the event's first actor: names, pronouns and story slots. */
export interface Who {
  name: string;
  they: string;
  them: string;
  their: string;
  /** Slots the cards use: the origin's people, the place. */
  slots: Readonly<Record<string, string>>;
}

const PRONOUN_SETS: Record<string, { they: string; them: string; their: string }> = {
  they: { they: 'they', them: 'them', their: 'their' },
  she: { they: 'she', them: 'her', their: 'her' },
  he: { they: 'he', them: 'him', their: 'his' },
};

/** "she/her" → she, her, her. Anything unknown takes its own words, and "their". */
export function pronounWords(pronouns: string): { they: string; them: string; their: string } {
  const [a = 'they', b] = pronouns
    .toLowerCase()
    .split('/')
    .map((x) => x.trim());
  return PRONOUN_SETS[a] ?? { they: a, them: b || a, their: 'their' };
}

/**
 * Fills {slot} markers from the actor: {name}, {they}, {them}, {their}, then the story slots,
 * which include a card's variables as {var.id}.
 */
export function fillSlots(text: string, who: Who): string {
  return text.replace(/\{([\w.]+)\}/g, (whole, key: string) => {
    if (key === 'name') return who.name;
    if (key === 'they' || key === 'them' || key === 'their') return who[key];
    return who.slots[key] ?? whole;
  });
}

const LADDER_NAMES: Record<LadderId, string> = { qi: 'qi', body: 'body', soul: 'soul' };
/** What a failed major attempt wasted: the gate pill, the offerings laid beside it. */
function spent(d: EventData): string {
  const others = typeof d.offerings === 'number' ? d.offerings : 0;
  if (d.gateItem && others > 0) return ', the pill and the offerings wasted,';
  if (d.gateItem) return ', the pill wasted,';
  if (others > 0) return ', the offerings wasted,';
  return '';
}
const FUEL: Record<LadderId, string> = { qi: 'qi', body: 'tempering', soul: 'nourishment' };

/** "the fourth layer", "middle Foundation Establishment" or "Foundation Establishment". */
export function stepLabel(id: RealmId, stage: number): string {
  if (id === 'qi-condensation') return `the ${stageName(id, stage)}`;
  return stage === 1 ? realm(id).name : `${stageName(id, stage)} ${realm(id).name}`;
}

/** The line each screen writes when it opens. */
export const SCREEN_TEXT: Record<string, string> = {
  trees: 'The trees open: what you hold grafts on them, and insight buys their nodes.',
  techniques: 'A first technique to drill: the techniques open.',
};

/** How a spar ended, from the subject's side (core/spar.ts). */
const SPAR_ENDS: Record<string, string> = {
  won: 'and brings them down',
  lost: 'and is brought down',
  fled: 'and breaks away',
  yielded: 'and yields',
  draw: 'until neither can go on',
};

const s = (v: EventValue | undefined) => String(v ?? '');
const n = (v: EventValue | undefined) => Number(v ?? 0);

/** The outcome a card event's line came from: the last step's choice, passed or failed. */
function cardOutcome(d: EventData): CardOutcome {
  const k = card(s(d.card));
  const step = d.step ? k.steps?.[s(d.step)] : undefined;
  const choice = (step ?? k).choices[n(d.choice)]!;
  return d.pass === false && choice.fail ? choice.fail : choice.pass;
}

type Template = (d: EventData, who: Who) => string;

export const EVENT_TEMPLATES: Record<string, Template> = {
  /** A line written before the chronicle was typed, kept as it was. */
  legacy: (d) => s(d.text),
  birth: (d, w) =>
    d.next
      ? `A new life: ${w.name} comes of age on root-testing day.`
      : `${w.name} comes of age on root-testing day.`,
  testing: (d, w) =>
    fillSlots(originPath(s(d.origin) as OriginId, s(d.choice) as OriginChoice).chronicle, w),
  breakthrough: (d, w) =>
    `${w.name}'s ${LADDER_NAMES[s(d.ladder) as LadderId]} ${d.ladder === 'qi' ? 'breaks through to' : 'reaches'} ${stepLabel(s(d.realm) as RealmId, n(d.stage))}.`,
  setback: (d, w) =>
    `${w.name}'s ${FUEL[s(d.ladder) as LadderId]} breaks against ${stepLabel(s(d.realm) as RealmId, n(d.stage))} and scatters${d.injured ? ', leaving a light injury' : ''}.`,
  major: (d, w) => {
    const grade = GRADES.find((g) => g.id === (s(d.grade) as GradeId))!.name.toLowerCase();
    const target = realm(s(d.realm) as RealmId).name;
    return d.ladder === 'qi'
      ? `${d.lastChance ? 'At the edge of death, ' : ''}${w.name} breaks through to ${target}: a ${grade} foundation.`
      : `${w.name}'s ${s(d.ladder)} breaks through to ${target}, a ${grade} breakthrough.`;
  },
  'major-setback': (d, w) =>
    `${w.name}'s breakthrough to ${realm(s(d.realm) as RealmId).name} fails${spent(d)} and leaves ${w.their} ${s(d.ladder)} injured for years.`,
  toxic: (d, w) =>
    `Pill residue thickens in ${w.name}'s blood until ${w.their} ${LADDER_NAMES[s(d.ladder) as LadderId]} unsettles.`,
  'method-capped': (d) =>
    `The ${method(s(d.method)).name} carries ${d.ladder === 'qi' ? 'cultivation' : `the ${s(d.ladder)}`} no further; it waits on the next chapter or a new method.`,
  hours: (d) => {
    const o = HOUR_OPENINGS.find((x) => x.kind === d.kind)!;
    if (d.hour === null || d.hour === undefined) return `${o.text} Give it an hour on the wheel.`;
    const b = BRANCHES[n(d.hour)]!;
    return `${o.text} The hour of ${b.hanzi} (${b.name}) turns from qi to ${HOUR_KINDS[s(d.kind) as HourKind].name.toLowerCase()}.`;
  },
  'sleep-freed': () => SLEEP_FREED_TEXT,
  // A first copy before layer 2 takes the whole wheel until it is read (core/wheel.ts).
  'study-all': (d) =>
    `A copy wants reading before it is any use: every waking hour turns to study until ${copyTitle(s(d.copy))} is read.`,
  'study-back': (d) => {
    if (d.hour === null || d.hour === undefined)
      return 'The reading done, the wheel goes back to what it was.';
    const b = BRANCHES[n(d.hour)]!;
    return `The reading done, the wheel goes back to what it was, with the hour of ${b.hanzi} (${b.name}) kept for study.`;
  },
  gate: (d) => {
    const r = realm(s(d.realm) as RealmId);
    return d.gate
      ? `Qi presses against the gate of ${r.name}. The breakthrough waits on you.`
      : `Qi presses against the gate of ${r.name}, but you hold no ${r.gate.replace(/^an? /, '')}.`;
  },
  screen: (d) => SCREEN_TEXT[s(d.screen)] ?? `The ${s(d.screen)} open.`,
  mastery: (d) =>
    d.technique
      ? `${technique(s(d.technique)).name} reaches ${MASTERY[n(d.level)]!.name}; the form finally clicks.`
      : `The ${method(s(d.method)).name} reaches ${MASTERY[n(d.level)]!.name}; the breath runs deeper, and understanding with it.`,
  spar: (d, w) =>
    `${w.name} spars with ${s(d.foe)} ${SPAR_ENDS[s(d.result)] ?? 'and walks away'}${n(d.turns) > 0 ? ` in ${n(d.turns)} exchange${n(d.turns) === 1 ? '' : 's'}` : ''}.`,
  // A node or manual a save names but the game no longer holds (a made-up one, a removed one) is
  // worded, never thrown on, so one old line never blanks the chronicle.
  node: (d, w) =>
    `${w.name} comprehends ${hasAnyNode(s(d.node)) ? anyNode(s(d.node)).name : 'a node no longer written'}.`,
  'first-breath': (_d, w) =>
    `${w.name} draws a bright orb of qi in from the air of the cave, and the breath after it runs deeper.`,
  manual: (d, w) =>
    `${w.name} ${s(d.how)} ${hasManual(s(d.manual)) ? `the ${manual(s(d.manual)).name}` : 'a manual no longer written'}.`,
  // A copy is a thing owned, not yet known: reading it writes the manual's, method's or
  // technique's own line, "finishes reading".
  copy: (d, w) => `${w.name} ${s(d.how)} a copy of ${copyTitle(s(d.copy))}.`,
  reading: (d, w) => `${w.name} begins reading ${copyTitle(s(d.copy))}.`,
  technique: (d, w) => `${w.name} ${s(d.how)} ${technique(s(d.technique)).name}.`,
  method: (d, w) => `${w.name} ${s(d.how)} the ${method(s(d.method)).name}.`,
  'method-switch': (d, w) =>
    d.method
      ? `${w.name} takes up the ${method(s(d.method)).name}.`
      : `${w.name} sets the ${method(s(d.from)).name} aside.`,
  routine: (d, w) => `${w.name} ${s(d.how)} the ${routine(s(d.routine)).name}.`,
  death: (d, w) => {
    const r = s(d.realm) as RealmId;
    return `${w.name} dies at ${n(d.age)}, at ${stepLabel(r, n(d.stage))}${r === 'qi-condensation' ? ' of Qi Condensation' : ''}.`;
  },
  // One line for the path a card took: the last step's outcome, with the card's variables.
  card: (d, w) => {
    const outcome = cardOutcome(d);
    const vars = Object.fromEntries(
      Object.entries(d)
        .filter(([key]) => key.startsWith('var.'))
        .map(([key, v]) => [key, String(v)]),
    );
    // A card that settled itself says so beside the line (core/chronicle.ts, settledItself).
    return fillSlots(outcome.chronicle ?? '', { ...w, slots: { ...w.slots, ...vars } });
  },
  // A stage of the Intent ladder opening (core/intent.ts): an epiphany or a fight won from the brink.
  intent: (d, w) => {
    const dao = s(d.dao) as CombatDaoId;
    const stage = n(d.stage);
    const name = `${COMBAT_DAOS[dao].name} ${INTENT_STAGES[stage]!.name} ${INTENT_HANZI[dao][stage]!}`;
    return d.how === 'brink'
      ? `Down to the last of ${w.their} blood, ${w.name} finds ${name} and wins with it.`
      : `${w.name} sees the whole of the Dao in one stroke: ${name} wakes.`;
  },
  'talent-wakes': (d, w) => fillSlots(talent(s(d.talent)).sleeps?.text ?? '', w),
  rewind: () => 'Time folds back.',
};

export const EVENT_TYPES = Object.keys(EVENT_TEMPLATES);

// ---------------------------------------------------------------- kinds

/**
 * What a line is, shown as a brush character in its color (design § UI and screens, The
 * Chronicle screen); a chip on the screen filters by it.
 */
export const CHRONICLE_KINDS = [
  'qi',
  'body',
  'soul',
  'gate',
  'mastery',
  'learned',
  'fight',
  'hurt',
  'people',
  'choice',
  'settled',
  'birth',
  'death',
  'opening',
] as const;
export type ChronicleKind = (typeof CHRONICLE_KINDS)[number];

export const KIND_WORDS: Record<ChronicleKind, { hanzi: string; name: string }> = {
  qi: { hanzi: '气', name: 'Qi' },
  body: { hanzi: '体', name: 'Body' },
  soul: { hanzi: '魂', name: 'Soul' },
  gate: { hanzi: '关', name: 'Gates' },
  mastery: { hanzi: '精', name: 'Mastery' },
  learned: { hanzi: '学', name: 'Learned' },
  fight: { hanzi: '战', name: 'Fights' },
  hurt: { hanzi: '伤', name: 'Hurts' },
  people: { hanzi: '人', name: 'People' },
  choice: { hanzi: '事', name: 'Choices' },
  settled: { hanzi: '了', name: 'Settled itself' },
  birth: { hanzi: '生', name: 'Birth' },
  death: { hanzi: '终', name: 'Death' },
  opening: { hanzi: '开', name: 'Openings' },
};

/** The milestones, which ride the river's line as stations; every other kind is prose. */
export const STATION_KINDS: ReadonlySet<ChronicleKind> = new Set<ChronicleKind>([
  'qi',
  'body',
  'soul',
  'gate',
  'mastery',
  'birth',
  'death',
]);

type KindOf = ChronicleKind | ((d: EventData) => ChronicleKind);

/** A step takes its ladder's kind. */
const ladderKind = (d: EventData): ChronicleKind =>
  d.ladder === 'body' || d.ladder === 'soul' ? d.ladder : 'qi';

/**
 * Each event type's kind, beside its template (a test fails on a type without one): a fixed kind
 * or one read from the event. A card is a choice, settled when it resolved by default, or the
 * kind its outcome names.
 */
export const EVENT_KINDS: Readonly<Record<string, KindOf>> = {
  legacy: 'opening',
  birth: 'birth',
  testing: 'birth',
  'talent-wakes': 'birth',
  breakthrough: ladderKind,
  major: ladderKind,
  setback: 'hurt',
  'major-setback': 'hurt',
  toxic: 'hurt',
  gate: 'gate',
  mastery: 'mastery',
  intent: 'mastery',
  death: 'death',
  spar: 'fight',
  node: 'learned',
  manual: 'learned',
  copy: 'learned',
  reading: 'learned',
  technique: 'learned',
  method: 'learned',
  'method-switch': 'learned',
  routine: 'learned',
  'first-breath': 'learned',
  hours: 'opening',
  'sleep-freed': 'opening',
  'study-all': 'opening',
  'study-back': 'opening',
  screen: 'opening',
  'method-capped': 'opening',
  rewind: 'opening',
  card: (d) => (d.byDefault === true ? 'settled' : (cardOutcome(d).kind ?? 'choice')),
};

/** An event's kind; a type with none written (an old save's) reads as an opening. */
export function eventKind(type: string, data: EventData): ChronicleKind {
  const k = EVENT_KINDS[type];
  if (!k) return 'opening';
  return typeof k === 'function' ? k(data) : k;
}

/** The events a coming-back summary, the Chronicle and the sims treat as setbacks. */
export const SETBACK_TYPES: readonly string[] = ['setback', 'major-setback'];
