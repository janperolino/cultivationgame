// What GLM must return, checked with Zod. The interpreter turns typed text into one main and
// one minor action (design § Combat, "One turn, start to finish"); the narrator ends its prose
// with a JSON tail of next choices, memory notes and new names (design § How GLM fits in).
// GLM never decides outcomes: the engine checks every id here against the scene before use.
import { z } from 'zod';

export const MAIN_ACTIONS = [
  'technique',
  'strike',
  'defend',
  'item',
  'command',
  'talk',
  'flee',
] as const;
export const MINOR_ACTIONS = ['move', 'take_cover', 'swap_artifact', 'interact'] as const;
export const TALK_STYLES = ['bluff', 'intimidate', 'bargain', 'surrender'] as const;

// Fields the design's example leaves out may be missing or null, so both shapes parse.
const id = z.string().min(1).max(60).nullish();

export const mainActionSchema = z.object({
  type: z.enum(MAIN_ACTIONS),
  /** A technique id for `technique`, an item id for `item`, a beast id for `command`. */
  id,
  target: id,
  style: z.enum(TALK_STYLES).nullish(),
});

export const minorActionSchema = z.object({
  type: z.enum(MINOR_ACTIONS),
  /** The scene feature acted on: cover, high ground, something to knock over. */
  feature: id,
  /** Where an interaction sends it: the brazier onto the spirit grass. */
  onto: id,
  /** The artifact swapped in. */
  id,
});

export const interpretedActionSchema = z.object({
  main: mainActionSchema,
  minor: minorActionSchema.nullish(),
  /** Every scene feature, item or technique the player leaned on. */
  uses: z.array(z.string().min(1).max(60)).max(6),
  creativity: z.number().int().min(0).max(3),
  feasible: z.boolean(),
  /** Why an infeasible action fails, in a few words for the narrator. */
  reason: z.string().max(200).nullish(),
});

export type InterpretedAction = z.infer<typeof interpretedActionSchema>;

const nullableString = { type: ['string', 'null'], maxLength: 60 } as const;

/**
 * The same shape as JSON Schema for `response_format`. Strict hosts want every key required,
 * so optional fields are required-but-nullable here; a test keeps the keys in step with Zod.
 */
export const interpretedActionJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['main', 'minor', 'uses', 'creativity', 'feasible', 'reason'],
  properties: {
    main: {
      type: 'object',
      additionalProperties: false,
      required: ['type', 'id', 'target', 'style'],
      properties: {
        type: { type: 'string', enum: [...MAIN_ACTIONS] },
        id: nullableString,
        target: nullableString,
        style: { type: ['string', 'null'], enum: [...TALK_STYLES, null] },
      },
    },
    minor: {
      type: ['object', 'null'],
      additionalProperties: false,
      required: ['type', 'feature', 'onto', 'id'],
      properties: {
        type: { type: 'string', enum: [...MINOR_ACTIONS] },
        feature: nullableString,
        onto: nullableString,
        id: nullableString,
      },
    },
    uses: { type: 'array', items: { type: 'string' }, maxItems: 6 },
    creativity: { type: 'integer', minimum: 0, maximum: 3 },
    feasible: { type: 'boolean' },
    reason: { type: ['string', 'null'], maxLength: 200 },
  },
} as const;

export const NAME_KINDS = ['person', 'place', 'beast', 'item', 'group'] as const;

export const narratorTailSchema = z.object({
  /** What the player might do next, as short button labels. */
  choices: z.array(z.string().min(1).max(80)).min(3).max(4),
  /** Notes for the NPCs and places in the scene, looked up by id next time. */
  memory: z.array(z.object({ about: z.string().min(1), note: z.string().min(1).max(200) })).max(4),
  /** Names the narrator invented; they become real only when the engine registers them. */
  names: z
    .array(
      z.object({ name: z.string().min(1), kind: z.enum(NAME_KINDS), note: z.string().max(200) }),
    )
    .max(4),
});

export type NarratorTail = z.infer<typeof narratorTailSchema>;

/** The tail as JSON Schema, for asking for it in its own structured-output call. */
export const narratorTailJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['choices', 'memory', 'names'],
  properties: {
    choices: {
      type: 'array',
      items: { type: 'string', maxLength: 80 },
      minItems: 3,
      maxItems: 4,
    },
    memory: {
      type: 'array',
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['about', 'note'],
        properties: { about: { type: 'string' }, note: { type: 'string', maxLength: 200 } },
      },
    },
    names: {
      type: 'array',
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'kind', 'note'],
        properties: {
          name: { type: 'string' },
          kind: { type: 'string', enum: [...NAME_KINDS] },
          note: { type: 'string', maxLength: 200 },
        },
      },
    },
  },
} as const;

export interface NarratorReply {
  prose: string;
  /** The raw JSON text of the tail, or null if none was found. */
  tailText: string | null;
}

/**
 * Splits a narrator reply into prose and its JSON tail. The tail is the last ```json fence, or
 * failing that a trailing `{...}` block; anything after the tail is dropped.
 */
export function splitNarration(text: string): NarratorReply {
  const fence = /```(?:json)?\s*\n?([\s\S]*?)```/gi;
  let last: RegExpExecArray | null = null;
  for (let m = fence.exec(text); m; m = fence.exec(text)) last = m;
  if (last) return { prose: text.slice(0, last.index).trim(), tailText: last[1]!.trim() };
  const brace = text.lastIndexOf('\n{');
  const start = brace >= 0 ? brace + 1 : text.trimStart().startsWith('{') ? text.indexOf('{') : -1;
  if (start >= 0) return { prose: text.slice(0, start).trim(), tailText: text.slice(start).trim() };
  return { prose: text.trim(), tailText: null };
}

export type TailCheck =
  | { ok: true; tail: NarratorTail }
  | { ok: false; stage: 'missing' | 'json' | 'schema'; error: string };

export function checkTail(tailText: string | null): TailCheck {
  if (tailText === null) return { ok: false, stage: 'missing', error: 'no JSON tail' };
  let json: unknown;
  try {
    json = JSON.parse(tailText);
  } catch (e) {
    return { ok: false, stage: 'json', error: (e as Error).message };
  }
  const parsed = narratorTailSchema.safeParse(json);
  return parsed.success
    ? { ok: true, tail: parsed.data }
    : { ok: false, stage: 'schema', error: z.prettifyError(parsed.error) };
}
