import { describe, expect, it } from 'vitest';
import { mockProvider, sseResponse } from './mock.ts';
import { buildBody, CostMeter, OpenRouterError, streamChat } from './openrouter.ts';
import {
  checkTail,
  interpretedActionJsonSchema,
  interpretedActionSchema,
  splitNarration,
} from './schemas.ts';

const fakeFetch = (response: Response) => (async () => response) as unknown as typeof fetch;

describe('buildBody', () => {
  it('fills in the design defaults with thinking off', () => {
    const body = buildBody({ messages: [{ role: 'user', content: 'hi' }] });
    expect(body).toMatchObject({
      model: 'z-ai/glm-5.2',
      stream: true,
      temperature: 0.8,
      max_tokens: 600,
      usage: { include: true },
      reasoning: { enabled: false },
    });
  });

  it('can leave reasoning out entirely', () => {
    expect(buildBody({ messages: [], reasoning: null })).not.toHaveProperty('reasoning');
  });
});

describe('streamChat', () => {
  it('reassembles a stream split mid-character and reads usage and cost', async () => {
    const text = 'Coals spill across the spirit-grass. 火 races up the stalks.';
    const tokens: string[] = [];
    const result = await streamChat(
      { messages: [{ role: 'user', content: 'go' }] },
      {
        apiKey: 'test',
        fetch: fakeFetch(sseResponse(text, { pieces: 5, provider: 'DeepInfra', cost: 0.0021 })),
        onToken: (t) => tokens.push(t),
      },
    );
    expect(result.text).toBe(text);
    expect(tokens.join('')).toBe(text);
    expect(result.provider).toBe('DeepInfra');
    expect(result.finishReason).toBe('stop');
    expect(result.usage).toEqual({
      promptTokens: 100,
      completionTokens: 20,
      cachedTokens: 40,
      cacheWriteTokens: 0,
      reasoningTokens: 0,
      cost: 0.0021,
    });
    expect(result.ttftMs).toBeGreaterThanOrEqual(0);
  });

  it('throws on an HTTP error', async () => {
    const response = new Response('{"error":{"message":"No credits"}}', { status: 402 });
    await expect(
      streamChat({ messages: [] }, { apiKey: 'test', fetch: fakeFetch(response) }),
    ).rejects.toBeInstanceOf(OpenRouterError);
  });

  it('tries once more on a busy host before any text, and only once', async () => {
    const busy = () => new Response('busy', { status: 503 });
    const answers = [busy(), sseResponse('Here.', { pieces: 1 })];
    let calls = 0;
    const twice: typeof fetch = async () => answers[calls++]!;
    const r = await streamChat({ messages: [] }, { apiKey: 'test', fetch: twice, retryWaitMs: 0 });
    expect(r.text).toBe('Here.');
    expect(calls).toBe(2);
    const always: typeof fetch = async () => busy();
    await expect(
      streamChat({ messages: [] }, { apiKey: 'test', fetch: always, retryWaitMs: 0 }),
    ).rejects.toBeInstanceOf(OpenRouterError);
  });

  it('throws on an error chunk mid-stream', async () => {
    const body = 'data: {"error":{"code":502,"message":"upstream died"}}\n\n';
    await expect(
      streamChat({ messages: [] }, { apiKey: 'test', fetch: fakeFetch(new Response(body)) }),
    ).rejects.toThrow('upstream died');
  });
});

describe('mockProvider', () => {
  it('replies in order, repeats the last reply and streams tokens', async () => {
    const mock = mockProvider(['one', (r) => `echo ${r.messages.length}`]);
    expect((await mock.chat({ messages: [] })).text).toBe('one');
    const tokens: string[] = [];
    const second = await mock.chat(
      { messages: [{ role: 'user', content: 'x' }] },
      { onToken: (t) => tokens.push(t) },
    );
    expect(second.text).toBe('echo 1');
    expect(tokens.join('')).toBe('echo 1');
    expect((await mock.chat({ messages: [] })).text).toBe('echo 0');
    expect(mock.requests).toHaveLength(3);
  });

  it('feeds the cost meter', async () => {
    const meter = new CostMeter();
    meter.record((await mockProvider(['x']).chat({ messages: [] })).usage);
    expect(meter.calls).toBe(1);
    expect(meter.cost).toBe(0);
  });
});

describe('interpreter schema', () => {
  it("accepts the design's example action", () => {
    const example = {
      main: { type: 'technique', id: 'ember-palm', target: 'elder-mo' },
      minor: { type: 'interact', feature: 'brazier', onto: 'spirit-grass' },
      uses: ['brazier', 'spirit-grass'],
      creativity: 2,
      feasible: true,
    };
    expect(interpretedActionSchema.parse(example).main.id).toBe('ember-palm');
  });

  it('rejects out-of-range creativity and unknown action types', () => {
    const base = { main: { type: 'strike' }, uses: [], feasible: true };
    expect(interpretedActionSchema.safeParse({ ...base, creativity: 5 }).success).toBe(false);
    expect(
      interpretedActionSchema.safeParse({ ...base, main: { type: 'summon' }, creativity: 0 })
        .success,
    ).toBe(false);
  });

  it('keeps the JSON schema keys in step with Zod', () => {
    const zodKeys = (s: { shape: object }) => Object.keys(s.shape).sort();
    const shape = interpretedActionSchema.shape;
    expect(Object.keys(interpretedActionJsonSchema.properties).sort()).toEqual(
      zodKeys(interpretedActionSchema),
    );
    expect(Object.keys(interpretedActionJsonSchema.properties.main.properties).sort()).toEqual(
      zodKeys(shape.main),
    );
    expect(Object.keys(interpretedActionJsonSchema.properties.minor.properties).sort()).toEqual(
      zodKeys(shape.minor.unwrap().unwrap()),
    );
  });
});

describe('narrator tail', () => {
  const tail = {
    choices: ['Chase him', 'Bind the wound', 'Report to the fort'],
    memory: [{ about: 'runner-hu', note: 'Took your beast core at knifepoint.' }],
    names: [{ name: 'Old Gao', kind: 'person', note: 'the ferryman who watched' }],
  };

  it('splits prose from a fenced tail and validates it', () => {
    const text = `He takes the core.\n\n\`\`\`json\n${JSON.stringify(tail)}\n\`\`\``;
    const { prose, tailText } = splitNarration(text);
    expect(prose).toBe('He takes the core.');
    expect(checkTail(tailText)).toEqual({ ok: true, tail });
  });

  it('finds a bare trailing object', () => {
    const { prose, tailText } = splitNarration(`Rain.\n${JSON.stringify(tail)}`);
    expect(prose).toBe('Rain.');
    expect(checkTail(tailText).ok).toBe(true);
  });

  it('keeps a tail cut off by the token limit out of the prose', () => {
    const { prose, tailText } = splitNarration('He takes it.\n```json\n{"choices": ["a", "b", "na');
    expect(prose).toBe('He takes it.');
    expect(checkTail(tailText)).toMatchObject({ stage: 'json' });
  });

  it('reports a missing, broken or wrong tail', () => {
    expect(checkTail(splitNarration('Just prose.').tailText)).toMatchObject({ stage: 'missing' });
    expect(checkTail('{"choices": [')).toMatchObject({ stage: 'json' });
    expect(checkTail('{"choices": ["a"], "memory": [], "names": []}')).toMatchObject({
      stage: 'schema',
    });
  });
});
