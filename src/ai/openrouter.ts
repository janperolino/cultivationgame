// Streaming chat completions through OpenRouter: fetch plus server-sent events, no SDK, so the
// same code runs in Node (the spike, later sims) and in the browser. Every call asks for
// `usage.include`, so OpenRouter reports the call's cost in the last chunk.

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const DEFAULT_MODEL = 'z-ai/glm-5.2';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** OpenRouter's provider routing options; only the ones the game uses are typed. */
export interface ProviderPrefs {
  order?: string[];
  only?: string[];
  ignore?: string[];
  allow_fallbacks?: boolean;
  require_parameters?: boolean;
  quantizations?: string[];
  sort?: 'price' | 'throughput' | 'latency';
}

export type Reasoning = { enabled: boolean } | { effort: 'none' | 'low' | 'medium' | 'high' };

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  /** Defaults to thinking off. Pass `null` to send no reasoning field at all. */
  reasoning?: Reasoning | null;
  response_format?: {
    type: 'json_schema';
    json_schema: { name: string; strict?: boolean; schema: Record<string, unknown> };
  };
  provider?: ProviderPrefs;
}

export interface Usage {
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  /** Cache writes, where the host reports them. */
  cacheWriteTokens: number;
  reasoningTokens: number;
  /** US dollars, as OpenRouter bills it. */
  cost: number;
}

export interface ChatResult {
  text: string;
  /** Hidden reasoning text, if the host streamed any. */
  reasoning: string;
  usage: Usage;
  /** The host that served the call, such as "DeepInfra". */
  provider: string;
  model: string;
  id: string;
  finishReason: string;
  /** Milliseconds from sending the request to the first visible token. */
  ttftMs: number;
  totalMs: number;
}

export interface ChatOptions {
  apiKey: string;
  /** Called with each piece of visible text as it arrives. */
  onToken?: (text: string) => void;
  signal?: AbortSignal;
  /** Swappable for tests. Defaults to the global fetch. */
  fetch?: typeof fetch;
  /** Sent as X-Title, so calls show up by name in the OpenRouter dashboard. */
  appTitle?: string;
  /** How long to wait before the one retry of a busy or failing host; tests set 0. */
  retryWaitMs?: number;
}

/** A whole request gives up after this long. */
const REQUEST_TIMEOUT_MS = 90_000;
/** A stream that sends nothing for this long has stalled, and is dropped. */
const STALL_MS = 30_000;
/** Statuses worth one more try before the first token: rate limits and a host falling over. */
const RETRY_STATUSES = [429, 502, 503];
const RETRY_WAIT_MS = 1_500;

/** The first of several signals to abort, where the platform can merge them. */
function anySignal(signals: (AbortSignal | undefined)[]): AbortSignal | undefined {
  const live = signals.filter((x): x is AbortSignal => !!x);
  if (live.length <= 1) return live[0];
  return typeof AbortSignal.any === 'function' ? AbortSignal.any(live) : live[0];
}

/** Anything that answers a chat request: OpenRouter, or the mock provider in tests. */
export interface ChatProvider {
  chat(request: ChatRequest, options?: Partial<ChatOptions>): Promise<ChatResult>;
}

export class OpenRouterError extends Error {
  readonly status: number;
  readonly body: string;
  constructor(status: number, body: string) {
    super(`OpenRouter ${status}: ${body.slice(0, 300)}`);
    this.name = 'OpenRouterError';
    this.status = status;
    this.body = body;
  }
}

/** The request body, with the design's defaults filled in. */
export function buildBody(request: ChatRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: request.model ?? DEFAULT_MODEL,
    messages: request.messages,
    stream: true,
    temperature: request.temperature ?? 0.8,
    max_tokens: request.max_tokens ?? 600,
    usage: { include: true },
  };
  const reasoning = request.reasoning === undefined ? { enabled: false } : request.reasoning;
  if (reasoning !== null) body.reasoning = reasoning;
  if (request.response_format) body.response_format = request.response_format;
  if (request.provider) body.provider = request.provider;
  return body;
}

/** Splits a server-sent event stream into the JSON payloads of its `data:` lines. */
export async function* readSse(stream: ReadableStream<Uint8Array>): AsyncGenerator<unknown> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      // The stream's end closes its last line, so a final `data:` with no newline still counts.
      buffer += decoder.decode(value, { stream: !done }) + (done ? '\n' : '');
      let newline: number;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, '');
        buffer = buffer.slice(newline + 1);
        // Lines starting with ":" are comments; OpenRouter sends ": OPENROUTER PROCESSING".
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') return;
        if (data) yield JSON.parse(data);
      }
      if (done) return;
    }
  } finally {
    // Stopping early ([DONE], or the caller leaving) lets go of the connection too.
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

interface Chunk {
  id?: string;
  model?: string;
  provider?: string;
  error?: { message?: string; code?: number };
  choices?: {
    delta?: { content?: string | null; reasoning?: string | null };
    finish_reason?: string | null;
  }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    cost?: number;
    prompt_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number };
    completion_tokens_details?: { reasoning_tokens?: number };
  };
}

const now = () => performance.now();

/**
 * One chat over the stream. It gives up after REQUEST_TIMEOUT_MS, or when the host goes quiet for
 * STALL_MS mid-stream, and tries once more on a rate limit or a failing host before any text has
 * come (never after, so nothing is told twice).
 */
export async function streamChat(request: ChatRequest, options: ChatOptions): Promise<ChatResult> {
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const start = now();
  const stall = new AbortController();
  const timeout =
    typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(REQUEST_TIMEOUT_MS) : undefined;
  const signal = anySignal([options.signal, timeout, stall.signal]);
  const send = () =>
    doFetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': options.appTitle ?? 'Severed Heaven',
      },
      body: JSON.stringify(buildBody(request)),
      signal,
    });
  let response = await send();
  if (RETRY_STATUSES.includes(response.status)) {
    await response.body?.cancel().catch(() => {});
    await new Promise((r) => setTimeout(r, options.retryWaitMs ?? RETRY_WAIT_MS));
    response = await send();
  }
  if (!response.ok || !response.body) {
    throw new OpenRouterError(response.status, await response.text().catch(() => ''));
  }
  let quiet: ReturnType<typeof setTimeout> | undefined;
  const heard = () => {
    clearTimeout(quiet);
    quiet = setTimeout(() => stall.abort(new Error('The host went quiet.')), STALL_MS);
  };
  heard();

  const result: ChatResult = {
    text: '',
    reasoning: '',
    usage: {
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
      cacheWriteTokens: 0,
      reasoningTokens: 0,
      cost: 0,
    },
    provider: '',
    model: '',
    id: '',
    finishReason: '',
    ttftMs: -1,
    totalMs: 0,
  };

  try {
    for await (const raw of readSse(response.body)) {
      heard();
      const chunk = raw as Chunk;
      // Errors after the stream has started arrive as a chunk with a 200 status.
      if (chunk.error)
        throw new OpenRouterError(chunk.error.code ?? 500, chunk.error.message ?? '');
      if (chunk.id) result.id = chunk.id;
      if (chunk.model) result.model = chunk.model;
      if (chunk.provider) result.provider = chunk.provider;
      const choice = chunk.choices?.[0];
      if (choice?.delta?.reasoning) result.reasoning += choice.delta.reasoning;
      const text = choice?.delta?.content;
      if (text) {
        if (result.ttftMs < 0) result.ttftMs = now() - start;
        result.text += text;
        options.onToken?.(text);
      }
      if (choice?.finish_reason) result.finishReason = choice.finish_reason;
      if (chunk.usage) {
        const u = chunk.usage;
        result.usage = {
          promptTokens: u.prompt_tokens ?? 0,
          completionTokens: u.completion_tokens ?? 0,
          cachedTokens: u.prompt_tokens_details?.cached_tokens ?? 0,
          cacheWriteTokens: u.prompt_tokens_details?.cache_write_tokens ?? 0,
          reasoningTokens: u.completion_tokens_details?.reasoning_tokens ?? 0,
          cost: u.cost ?? 0,
        };
      }
    }
  } finally {
    clearTimeout(quiet);
  }
  result.totalMs = now() - start;
  return result;
}

export function openRouterProvider(defaults: ChatOptions): ChatProvider {
  return { chat: (request, options) => streamChat(request, { ...defaults, ...options }) };
}

/** What a meter has counted: calls and dollars, in all and by role. */
export interface MeterTotals {
  calls: number;
  cost: number;
  promptTokens: number;
  cachedTokens: number;
  completionTokens: number;
  byRole: Record<string, { calls: number; cost: number }>;
}

export function emptyTotals(): MeterTotals {
  return { calls: 0, cost: 0, promptTokens: 0, cachedTokens: 0, completionTokens: 0, byRole: {} };
}

/**
 * Adds up what the calls cost, every call, retries and tail calls among them, by the role that
 * made it; the Settings cost meter reads it. `onChange` lets the settings layer keep the totals.
 */
export class CostMeter implements MeterTotals {
  calls = 0;
  cost = 0;
  promptTokens = 0;
  cachedTokens = 0;
  completionTokens = 0;
  byRole: Record<string, { calls: number; cost: number }> = {};
  onChange?: (totals: MeterTotals) => void;

  constructor(start: MeterTotals = emptyTotals()) {
    Object.assign(this, structuredClone(start));
  }

  record(usage: Usage, role = 'other'): void {
    this.calls += 1;
    this.cost += usage.cost;
    this.promptTokens += usage.promptTokens;
    this.cachedTokens += usage.cachedTokens;
    this.completionTokens += usage.completionTokens;
    const r = (this.byRole[role] ??= { calls: 0, cost: 0 });
    r.calls += 1;
    r.cost += usage.cost;
    this.onChange?.(this.totals());
  }

  totals(): MeterTotals {
    const { calls, cost, promptTokens, cachedTokens, completionTokens, byRole } = this;
    return structuredClone({ calls, cost, promptTokens, cachedTokens, completionTokens, byRole });
  }

  reset(): void {
    Object.assign(this, emptyTotals());
    this.onChange?.(this.totals());
  }
}
