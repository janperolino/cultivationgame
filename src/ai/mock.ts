// Canned replies, so tests and UI work run offline and free. `mockProvider` answers like
// OpenRouter would; `sseResponse` builds a raw OpenRouter stream to test the client itself.
import type { ChatOptions, ChatProvider, ChatRequest, ChatResult } from './openrouter.ts';

export type CannedReply = string | ((request: ChatRequest) => string);

/** Replies in order and then repeats the last one. Each reply streams in word-sized pieces. */
export function mockProvider(replies: CannedReply[]): ChatProvider & { requests: ChatRequest[] } {
  if (replies.length === 0) throw new Error('mockProvider needs at least one reply');
  const requests: ChatRequest[] = [];
  return {
    requests,
    async chat(request: ChatRequest, options?: Partial<ChatOptions>): Promise<ChatResult> {
      const reply = replies[Math.min(requests.length, replies.length - 1)]!;
      requests.push(request);
      const text = typeof reply === 'function' ? reply(request) : reply;
      for (const piece of text.match(/\S+\s*|\s+/g) ?? []) options?.onToken?.(piece);
      return {
        text,
        reasoning: '',
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          cachedTokens: 0,
          cacheWriteTokens: 0,
          reasoningTokens: 0,
          cost: 0,
        },
        provider: 'Mock',
        model: request.model ?? 'mock',
        id: `mock-${requests.length}`,
        finishReason: 'stop',
        ttftMs: 0,
        totalMs: 0,
      };
    },
  };
}

/** A fetch Response carrying an OpenRouter-style event stream of `text`, split into `pieces`. */
export function sseResponse(
  text: string,
  { pieces = 3, provider = 'Mock', cost = 0.001, reasoningTokens = 0 } = {},
): Response {
  const size = Math.max(1, Math.ceil(text.length / pieces));
  const lines = [': OPENROUTER PROCESSING', ''];
  const chunk = (body: object) => lines.push(`data: ${JSON.stringify(body)}`, '');
  for (let i = 0; i < text.length; i += size) {
    chunk({
      id: 'gen-mock',
      provider,
      model: 'z-ai/glm-5.2',
      choices: [{ delta: { content: text.slice(i, i + size) }, finish_reason: null }],
    });
  }
  chunk({ id: 'gen-mock', provider, choices: [{ delta: {}, finish_reason: 'stop' }] });
  chunk({
    id: 'gen-mock',
    provider,
    choices: [],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 20,
      cost,
      prompt_tokens_details: { cached_tokens: 40 },
      completion_tokens_details: { reasoning_tokens: reasoningTokens },
    },
  });
  lines.push('data: [DONE]', '');
  // Split the bytes at awkward places, as a network would.
  const bytes = new TextEncoder().encode(lines.join('\n'));
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}
