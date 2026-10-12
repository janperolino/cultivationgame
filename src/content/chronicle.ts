// The chronicle's event types (design § UI and screens, less spreadsheet): every event has a day,
// a type, the actors by id, a place and a data object, and its text comes from the template for
// its type, written as a biography. NPC memory, the storyteller, rumors and the person log read
// the events, not the text. A new kind of event is a template here.
import { card } from './cards/index.ts';
import { GRADES, type GradeId, type LadderId } from './cultivation.ts';
import { BRANCHES, HOUR_KINDS, HOUR_OPENINGS, SLEEP_FREED_TEXT, type HourKind } from './hours.ts';
import { MASTERY } from './mastery.ts';
import { method } from './methods.ts';
import { originPath, type OriginChoice, type OriginId } from './origins.ts';
import { realm, stageName, type RealmId } from './realms.ts';
import { routine } from './routines.ts';
import { talent } from './talents.ts';
import { technique } from './techniques.ts';
import { treeNode } from './trees/index.ts';

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
const FUEL: Record<LadderId, string> = { qi: 'qi', body: 'tempering', soul: 'nourishment' };

/** "the fourth layer", "middle Foundation Establishment" or "Foundation Establishment". */
export function stepLabel(id: RealmId, stage: number): string {
  if (id === 'qi-condensation') return `the ${stageName(id, stage)}`;
  return stage === 1 ? realm(id).name : `${stageName(id, stage)} ${realm(id).name}`;
}

/** The line each screen writes when it opens. */
export const SCREEN_TEXT: Record<string, string> = {
  trees: 'Enough insight gathers to grasp a first principle: the trees open.',
  techniques: 'A first technique to drill: the techniques open.',
};

const s = (v: EventValue | undefined) => String(v ?? '');
const n = (v: EventValue | undefined) => Number(v ?? 0);

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
    `${w.name}'s breakthrough to ${realm(s(d.realm) as RealmId).name} fails${d.gateItem ? `, the ${d.ladder === 'qi' ? 'pill' : 'gate item'} wasted,` : ''} and leaves ${w.their} ${s(d.ladder)} injured for years.`,
  'method-capped': (d) =>
    `The ${method(s(d.method)).name} carries ${d.ladder === 'qi' ? 'cultivation' : `the ${s(d.ladder)}`} no further; it waits on the next chapter or a new method.`,
  hours: (d) => {
    const o = HOUR_OPENINGS.find((x) => x.kind === d.kind)!;
    if (d.hour === null || d.hour === undefined) return `${o.text} Give it an hour on the wheel.`;
    const b = BRANCHES[n(d.hour)]!;
    return `${o.text} The hour of ${b.hanzi} (${b.name}) turns from qi to ${HOUR_KINDS[s(d.kind) as HourKind].name.toLowerCase()}.`;
  },
  'sleep-freed': () => SLEEP_FREED_TEXT,
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
  node: (d, w) => `${w.name} comprehends ${treeNode(s(d.node)).name}.`,
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
    const k = card(s(d.card));
    const step = d.step ? k.steps?.[s(d.step)] : undefined;
    const choice = (step ?? k).choices[n(d.choice)]!;
    const outcome = d.pass === false && choice.fail ? choice.fail : choice.pass;
    const vars = Object.fromEntries(
      Object.entries(d)
        .filter(([key]) => key.startsWith('var.'))
        .map(([key, v]) => [key, String(v)]),
    );
    // A card that settled itself says so beside the line (core/chronicle.ts, settledItself).
    return fillSlots(outcome.chronicle ?? '', { ...w, slots: { ...w.slots, ...vars } });
  },
  'talent-wakes': (d, w) => fillSlots(talent(s(d.talent)).sleeps?.text ?? '', w),
  rewind: () => 'Time folds back.',
};

export const EVENT_TYPES = Object.keys(EVENT_TEMPLATES);

/** The events a coming-back summary, the Chronicle and the sims treat as setbacks. */
export const SETBACK_TYPES: readonly string[] = ['setback', 'major-setback'];
