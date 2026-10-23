// One role's call (design § How GLM fits in, Request settings and Guardrails): each role's settings
// and hosts as the spike measured them, every call recorded on the cost meter by its role, and a
// JSON reply checked with Zod, retried once with the error message, then handed back as failed so
// the role can fall back safely.
import type { z } from 'zod';
import type { ChatMessage, ChatProvider, ChatRequest, CostMeter } from './openrouter.ts';

export const ROLES = ['interpreter', 'fight', 'narrator', 'tail', 'chronicler'] as const;
export type Role = (typeof ROLES)[number];

/** Never StreamLake or Novita, which make GLM 5.2 feel dumb (Jan's call in P0.3). */
const IGNORE = ['streamlake', 'novita'];
/** Structured output: DeepInfra first at half Morph's cost, then Morph. */
const STRUCTURED = { order: ['deepinfra', 'morph'], require_parameters: true, ignore: IGNORE };

export const ROLE_SETTINGS: Record<Role, Omit<ChatRequest, 'messages'>> = {
  // A reading's steps carry every key, nullable: three readings of four steps is the long reply.
  interpreter: { temperature: 0.2, max_tokens: 1200, provider: STRUCTURED },
  fight: { temperature: 0.2, max_tokens: 400, provider: STRUCTURED },
  // The narrator on Morph, the richest prose, with DeepInfra as fallback.
  // Thinking on (talk first, 2026-10-23, Jan's call): it holds people to their station and the
  // player's choices to the player, for about twice the cost and a longer wait he doesn't mind.
  narrator: {
    temperature: 0.8,
    max_tokens: 3000,
    reasoning: { enabled: true },
    provider: { order: ['morph', 'deepinfra'], ignore: IGNORE },
  },
  tail: {
    temperature: 0.2,
    max_tokens: 400,
    provider: { ...STRUCTURED, order: ['morph', 'deepinfra'] },
  },
  chronicler: { temperature: 0.3, max_tokens: 700, provider: STRUCTURED },
};

/** What a role calls through: the provider (OpenRouter, or the mock in tests) and the meter. */
export interface Ai {
  provider: ChatProvider;
  meter?: CostMeter;
  signal?: AbortSignal;
}

/** One call for a role, recorded on the meter. */
export async function callRole(
  ai: Ai,
  role: Role,
  messages: ChatMessage[],
  extra: Partial<ChatRequest> = {},
  onToken?: (text: string) => void,
) {
  const result = await ai.provider.chat(
    { ...ROLE_SETTINGS[role], ...extra, messages },
    { ...(onToken ? { onToken } : {}), ...(ai.signal ? { signal: ai.signal } : {}) },
  );
  ai.meter?.record(result.usage, role);
  return result;
}

/** A reply's JSON: the object itself, or inside a ```json fence. */
export function parseJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  return JSON.parse((fenced ? fenced[1]! : text).trim());
}

export type Checked<T> =
  { ok: true; value: T; tries: number } | { ok: false; error: string; tries: number };

function check<T>(
  schema: z.ZodType<T>,
  text: string,
): { ok: true; value: T } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = parseJson(text);
  } catch (e) {
    return { ok: false, error: `not JSON: ${(e as Error).message}` };
  }
  const parsed = schema.safeParse(json);
  if (parsed.success) return { ok: true, value: parsed.data };
  return {
    ok: false,
    error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
  };
}

/**
 * A structured call checked with Zod: one retry with the error message (and the bad reply, when
 * there was one), then a failure the role falls back from. A call that throws counts as a try.
 */
export async function callJson<T>(
  ai: Ai,
  role: Role,
  messages: ChatMessage[],
  schema: z.ZodType<T>,
  jsonSchema: Record<string, unknown>,
  name: string,
): Promise<Checked<T>> {
  const format: Partial<ChatRequest> = {
    response_format: {
      type: 'json_schema',
      json_schema: { name, strict: true, schema: jsonSchema },
    },
  };
  let error = '';
  let asked = messages;
  for (let tries = 1; tries <= 2; tries++) {
    let text: string | null = null;
    try {
      text = (await callRole(ai, role, asked, format)).text;
    } catch (e) {
      if (ai.signal?.aborted) throw e;
      error = `the call failed: ${(e as Error).message}`;
    }
    if (text !== null) {
      const c = check(schema, text);
      if (c.ok) return { ok: true, value: c.value, tries };
      error = c.error;
      asked = [
        ...messages,
        { role: 'assistant', content: text },
        {
          role: 'user',
          content: `That reply failed the check: ${error}. Reply again with the corrected JSON object only.`,
        },
      ];
    }
  }
  return { ok: false, error, tries: 2 };
}
