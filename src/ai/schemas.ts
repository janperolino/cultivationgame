// What GLM must return, checked with Zod, each beside the same shape as JSON Schema for strict
// structured output (every limit Zod checks is in the JSON Schema too, or strict decoding can't
// enforce it; P0.3). The interpreter turns typed text into the resolver's plans, one reading or two
// or three when the words are unclear (design § The resolver, The pipeline); in a fight it turns
// them into one main and one minor action (design § Combat, "One turn, start to finish"). The
// narrator ends its prose with a JSON tail of next choices, memory notes and new names, and the
// chronicler sums up a stretch of scene (design § How GLM fits in). GLM never decides outcomes:
// the engine checks every ref here against the scene before use (ai/interpret.ts).
import { z } from 'zod';
import { BOND_IDS } from '../content/bonds.ts';
import { OFFERS } from '../content/personality.ts';
import { REALM_IDS } from '../content/realms.ts';
import { TOPIC_IDS } from '../content/lore.ts';
import { MEMORY_TAGS } from '../content/memories.ts';
import { ACT_IDS, HELPER_MAX, MANNERS, USE_MAX, type ActId } from '../content/resolver.ts';

// ── The interpreter's plans ──────────────────────────────────────────────────────────────────

/** A plan GLM reads from your words runs to this many steps; the resolver hands back sooner anyway. */
export const PLAN_STEPS_MAX = 4;
/** Readings offered when the words are unclear. */
export const READINGS_MAX = 3;
/** Who sneaks along with you. */
export const GROUP_MAX = 4;
export const SHOW_IDS = ['weapon', 'technique'] as const;

/**
 * Acts as GLM names them. Strict decoding holds GLM to the enum token by token, so an id that is
 * the only one starting with a verb traps it: GLM begins "go" for "go after him" and can only
 * finish "go-home" (P3.8's run on GLM). Those acts go by another name here and map back.
 */
export const GLM_ACT_NAMES: Partial<Record<ActId, string>> = {
  'go-home': 'return-home',
  'look-around': 'survey',
  'take-disciple': 'accept-disciple',
};
export const GLM_ACTS = ACT_IDS.map((a) => GLM_ACT_NAMES[a] ?? a) as [string, ...string[]];
const FROM_GLM = new Map<string, ActId>(ACT_IDS.map((a) => [GLM_ACT_NAMES[a] ?? a, a]));

/** The act id GLM's name stands for. */
export function actFromGlm(name: string): ActId {
  return FROM_GLM.get(name)!;
}

const ref = z.string().min(1).max(60);
const refs = (max: number) => z.array(ref).max(max).nullish();

/** One step as GLM writes it: an act and the refs it names. The engine fills in the verb. */
export const readStepSchema = z.object({
  act: z.enum(GLM_ACTS),
  target: ref.nullish(),
  manner: z.enum(MANNERS).nullish(),
  uses: refs(USE_MAX),
  helpers: refs(HELPER_MAX),
  group: refs(GROUP_MAX),
  thing: ref.nullish(),
  n: z.number().int().min(1).max(1_000_000).nullish(),
  offer: z.enum(OFFERS).nullish(),
  about: ref.nullish(),
  prop: ref.nullish(),
  show: z.array(z.enum(SHOW_IDS)).max(2).nullish(),
  as: z.string().min(1).max(80).nullish(),
  who: z.string().min(1).max(80).nullish(),
  shown: z.object({ realm: z.enum(REALM_IDS), stage: z.number().int().min(1).max(9) }).nullish(),
  bond: z.enum(BOND_IDS).nullish(),
  goal: ref.nullish(),
});
export type ReadStep = z.infer<typeof readStepSchema>;

export const readingSchema = z.object({
  /** A button label in the player's voice: "Bribe the guard". */
  label: z.string().min(1).max(60),
  steps: z.array(readStepSchema).min(1).max(PLAN_STEPS_MAX),
});

export const interpretationSchema = z.object({
  /** One when the words are clear, two or three when they could fairly mean different plans. */
  readings: z.array(readingSchema).max(READINGS_MAX),
  /** Why the words ask for nothing the character could try here; null otherwise. */
  nothing: z.string().max(200).nullish(),
  /** What of the world the words touch, for the world book (P3.9w); unknown ones dropped. */
  topics: z
    .array(z.string())
    .nullish()
    .transform((t) =>
      (t ?? []).filter((x) => (TOPIC_IDS as readonly string[]).includes(x)).slice(0, 3),
    ),
});
export type InterpretationReply = z.infer<typeof interpretationSchema>;

const str = (maxLength: number) => ({ type: ['string', 'null'], minLength: 1, maxLength });
const refJson = str(60);
const refsJson = (maxItems: number) => ({
  type: ['array', 'null'],
  items: { type: 'string', minLength: 1, maxLength: 60 },
  maxItems,
});
const enumJson = (values: readonly string[]) => ({
  type: ['string', 'null'],
  enum: [...values, null],
});

const READ_STEP_PROPERTIES = {
  act: { type: 'string', enum: [...GLM_ACTS] },
  target: refJson,
  manner: enumJson(MANNERS),
  uses: refsJson(USE_MAX),
  helpers: refsJson(HELPER_MAX),
  group: refsJson(GROUP_MAX),
  thing: refJson,
  n: { type: ['integer', 'null'], minimum: 1, maximum: 1_000_000 },
  offer: enumJson(OFFERS),
  about: refJson,
  prop: refJson,
  show: { type: ['array', 'null'], items: { type: 'string', enum: [...SHOW_IDS] }, maxItems: 2 },
  as: str(80),
  who: str(80),
  shown: {
    type: ['object', 'null'],
    additionalProperties: false,
    required: ['realm', 'stage'],
    properties: {
      realm: { type: 'string', enum: [...REALM_IDS] },
      stage: { type: 'integer', minimum: 1, maximum: 9 },
    },
  },
  bond: enumJson(BOND_IDS),
  goal: refJson,
};

/** The interpreter's reply as JSON Schema: every key required, the optional ones nullable. */
export const interpretationJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['readings', 'nothing', 'topics'],
  properties: {
    readings: {
      type: 'array',
      maxItems: READINGS_MAX,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'steps'],
        properties: {
          label: { type: 'string', minLength: 1, maxLength: 60 },
          steps: {
            type: 'array',
            minItems: 1,
            maxItems: PLAN_STEPS_MAX,
            items: {
              type: 'object',
              additionalProperties: false,
              required: Object.keys(READ_STEP_PROPERTIES),
              properties: READ_STEP_PROPERTIES,
            },
          },
        },
      },
    },
    nothing: { type: ['string', 'null'], maxLength: 200 },
    topics: {
      type: ['array', 'null'],
      items: { type: 'string', enum: [...TOPIC_IDS] },
      maxItems: 3,
    },
  },
};

// ── A fight's turn ───────────────────────────────────────────────────────────────────────────

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

export const fightTurnSchema = z.object({
  main: mainActionSchema,
  minor: minorActionSchema.nullish(),
  /** Every scene feature, item or technique the player leaned on. */
  uses: z.array(z.string().min(1).max(60)).max(6),
  creativity: z.number().int().min(0).max(3),
  feasible: z.boolean(),
  /** Why an infeasible action fails, in a few words for the narrator. */
  reason: z.string().max(200).nullish(),
});

export type FightTurn = z.infer<typeof fightTurnSchema>;

const nullableString = { type: ['string', 'null'], minLength: 1, maxLength: 60 } as const;

/**
 * The same shape as JSON Schema for `response_format`. Strict hosts want every key required,
 * so optional fields are required-but-nullable here; a test keeps the keys in step with Zod.
 */
export const fightTurnJsonSchema = {
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
    uses: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 60 }, maxItems: 6 },
    creativity: { type: 'integer', minimum: 0, maximum: 3 },
    feasible: { type: 'boolean' },
    reason: { type: ['string', 'null'], maxLength: 200 },
  },
} as const;

// ── The narrator's tail ──────────────────────────────────────────────────────────────────────

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
  /**
   * What lasts of the turn's people (P3.9b; design § Memories carry their story, A voice is kept):
   * a line each said that sounds most like them, how they address the player the first time they do,
   * a memory's own words in the holder's voice (up to 40), and at most one moment, the blank row.
   */
  said: z
    .array(z.object({ about: z.string().min(1), line: z.string().min(1).max(200) }))
    .max(4)
    .default([]),
  address: z
    .array(z.object({ about: z.string().min(1), address: z.string().min(1).max(40) }))
    .max(4)
    .default([]),
  felt: z
    .array(z.object({ about: z.string().min(1), felt: z.string().min(1).max(300) }))
    .max(4)
    .default([]),
  moment: z
    .object({
      about: z.string().min(1),
      reason: z.string().min(1).max(100),
      story: z.string().min(1).max(300),
      tag: z.enum(MEMORY_TAGS),
      sign: z.enum(['good', 'bad']),
    })
    .nullish(),
});

export type NarratorTail = z.infer<typeof narratorTailSchema>;

/** The tail as JSON Schema, for asking for it in its own structured-output call. */
export const narratorTailJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['choices', 'memory', 'names', 'said', 'address', 'felt', 'moment'],
  properties: {
    choices: {
      type: 'array',
      items: { type: 'string', minLength: 1, maxLength: 80 },
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
        properties: {
          about: { type: 'string', minLength: 1 },
          note: { type: 'string', minLength: 1, maxLength: 200 },
        },
      },
    },
    said: {
      type: 'array',
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['about', 'line'],
        properties: {
          about: { type: 'string', minLength: 1 },
          line: { type: 'string', minLength: 1, maxLength: 200 },
        },
      },
    },
    address: {
      type: 'array',
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['about', 'address'],
        properties: {
          about: { type: 'string', minLength: 1 },
          address: { type: 'string', minLength: 1, maxLength: 40 },
        },
      },
    },
    felt: {
      type: 'array',
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['about', 'felt'],
        properties: {
          about: { type: 'string', minLength: 1 },
          felt: { type: 'string', minLength: 1, maxLength: 300 },
        },
      },
    },
    moment: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object',
          additionalProperties: false,
          required: ['about', 'reason', 'story', 'tag', 'sign'],
          properties: {
            about: { type: 'string', minLength: 1 },
            reason: { type: 'string', minLength: 1, maxLength: 100 },
            story: { type: 'string', minLength: 1, maxLength: 300 },
            tag: { type: 'string', enum: [...MEMORY_TAGS] },
            sign: { type: 'string', enum: ['good', 'bad'] },
          },
        },
      ],
    },
    names: {
      type: 'array',
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'kind', 'note'],
        properties: {
          name: { type: 'string', minLength: 1 },
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
  // A tail cut off by the token limit leaves its opening fence unclosed: keep it out of the prose.
  const prose = (s: string) => s.replace(/```(?:json)?\s*$/i, '').trim();
  if (start >= 0) return { prose: prose(text.slice(0, start)), tailText: text.slice(start).trim() };
  return { prose: prose(text), tailText: null };
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

// ── The chronicler ───────────────────────────────────────────────────────────────────────────

/** Notes on the people and places in a scene, looked up by id next time (design § How GLM fits in). */
export const CHRONICLE_NOTES_MAX = 6;

export const chronicleSchema = z.object({
  /** The scene so far, for the next calls' context: what happened, who did what, what is owed. */
  summary: z.string().min(1).max(900),
  /** One line for the Chronicle, past tense, in the river's voice. */
  line: z.string().min(1).max(200),
  notes: z
    .array(z.object({ about: z.string().min(1).max(60), note: z.string().min(1).max(200) }))
    .max(CHRONICLE_NOTES_MAX),
});
export type ChronicleReply = z.infer<typeof chronicleSchema>;

export const chronicleJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'line', 'notes'],
  properties: {
    summary: { type: 'string', minLength: 1, maxLength: 900 },
    line: { type: 'string', minLength: 1, maxLength: 200 },
    notes: {
      type: 'array',
      maxItems: CHRONICLE_NOTES_MAX,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['about', 'note'],
        properties: {
          about: { type: 'string', minLength: 1, maxLength: 60 },
          note: { type: 'string', minLength: 1, maxLength: 200 },
        },
      },
    },
  },
} as const;
