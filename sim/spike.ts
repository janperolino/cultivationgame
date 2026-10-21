// P0.3 GLM spike: `npm run spike` (loads .env.local), or `npm run spike -- narrator cache` to rerun
// some steps. Measures thinking-off, interpreter JSON validity, narrator tone and tails, caching,
// time to first token and cost on the hosts under test, and writes docs/spike/.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { z } from 'zod';
import {
  OpenRouterError,
  streamChat,
  type ChatRequest,
  type ChatResult,
  type Reasoning,
} from '../src/ai/openrouter.ts';
import {
  fixedPrefix,
  FIGHT_TASK,
  NARRATOR_TASK,
  TAIL_TASK,
  regionBrief,
  type BriefEntry,
} from '../src/ai/prompts.ts';
import {
  checkTail,
  fightTurnJsonSchema,
  fightTurnSchema,
  narratorTailJsonSchema,
  splitNarration,
} from '../src/ai/schemas.ts';
import {
  DARK_SCENES,
  FIGHT_SCENE,
  KNOWN_IDS,
  PLAYER_SHEET,
  TYPED_ACTIONS,
} from './spike/scenes.ts';

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error('No OPENROUTER_API_KEY. Put it in .env.local and run `npm run spike`.');
  process.exit(1);
}

/** Hosts under test, pinned one at a time. Jan's picks: cheap, and they don't sanitize. */
const HOSTS = ['morph', 'deepinfra'] as const;
type Host = (typeof HOSTS)[number];
const pin = (host: Host, extra: Partial<ChatRequest['provider']> = {}) => ({
  order: [host],
  allow_fallbacks: false,
  ...extra,
});

// `--tag=run2` keeps a rerun's results and transcripts beside the earlier ones.
const args = process.argv.slice(2);
const tag = args.find((a) => a.startsWith('--tag='))?.slice(6) ?? '';
const sfx = tag ? `-${tag}` : '';

const OUT = new URL('../docs/spike/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const resultsFile = new URL('results.json', OUT);
const results: Record<string, unknown> = existsSync(resultsFile)
  ? JSON.parse(readFileSync(resultsFile, 'utf8'))
  : {};
const save = () => writeFileSync(resultsFile, JSON.stringify(results, null, 2) + '\n');

// The fixed prefix: rules, world bible, the Border Wilds from the atlas, the voice.
const entries = JSON.parse(
  readFileSync(new URL('../content/atlas/entries.json', import.meta.url), 'utf8'),
) as (BriefEntry & { parent?: string })[];
const region = entries.find((e) => e.id === 'qm-bianhuang')!;
const PREFIX = fixedPrefix(
  regionBrief(
    region,
    entries.filter((e) => e.parent === region.id),
  ),
);

let spent = 0;
interface CallRecord {
  host: string;
  provider: string;
  ttftMs: number;
  totalMs: number;
  promptTokens: number;
  cachedTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  cost: number;
  finishReason: string;
}
const record = (host: string, r: ChatResult): CallRecord => {
  spent += r.usage.cost;
  return {
    host,
    provider: r.provider,
    ttftMs: Math.round(r.ttftMs),
    totalMs: Math.round(r.totalMs),
    promptTokens: r.usage.promptTokens,
    cachedTokens: r.usage.cachedTokens,
    completionTokens: r.usage.completionTokens,
    reasoningTokens: r.usage.reasoningTokens,
    cost: r.usage.cost,
    finishReason: r.finishReason,
  };
};

/** One call with a single retry on network or 5xx/429 errors. */
async function call(request: ChatRequest): Promise<ChatResult> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await streamChat(request, { apiKey: apiKey!, appTitle: 'Severed Heaven spike' });
    } catch (e) {
      const retryable = !(e instanceof OpenRouterError) || e.status >= 500 || e.status === 429;
      if (attempt >= 1 || !retryable) throw e;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

async function pool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!, i);
      }
    }),
  );
  return out;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor((s.length - 1) / 2)]! : NaN;
};
const p90 = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.ceil(s.length * 0.9) - 1)]! : NaN;
};
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
function summarize(calls: CallRecord[]) {
  return {
    calls: calls.length,
    ttftMedianMs: median(calls.map((c) => c.ttftMs)),
    ttftP90Ms: p90(calls.map((c) => c.ttftMs)),
    meanCost: mean(calls.map((c) => c.cost)),
    meanPromptTokens: Math.round(mean(calls.map((c) => c.promptTokens))),
    meanCachedTokens: Math.round(mean(calls.map((c) => c.cachedTokens))),
    meanCompletionTokens: Math.round(mean(calls.map((c) => c.completionTokens))),
    maxReasoningTokens: Math.max(0, ...calls.map((c) => c.reasoningTokens)),
  };
}

// Step 0: host prices, from OpenRouter's public endpoint list.
async function prices() {
  const res = await fetch('https://openrouter.ai/api/v1/models/z-ai/glm-5.2/endpoints');
  const json = (await res.json()) as {
    data: { endpoints: { tag: string; quantization: string; pricing: Record<string, string> }[] };
  };
  const perM = (s?: string) => (s ? Math.round(Number(s) * 1e6 * 1000) / 1000 : null);
  results.prices = json.data.endpoints
    .filter((e) => HOSTS.some((h) => e.tag.split('/')[0] === h))
    .map((e) => ({
      tag: e.tag,
      quantization: e.quantization,
      inputPerM: perM(e.pricing.prompt),
      outputPerM: perM(e.pricing.completion),
      cachedPerM: perM(e.pricing.input_cache_read),
    }));
  console.log('Prices:', results.prices);
}

// Step 1: is thinking really off?
async function thinking() {
  const ask: ChatRequest['messages'] = [
    { role: 'user', content: 'In one sentence: why would a beast cross the Jade Strait at night?' },
  ];
  const variants: { label: string; reasoning: Reasoning | null }[] = [
    { label: 'no reasoning field', reasoning: null },
    { label: 'enabled: false', reasoning: { enabled: false } },
  ];
  const rows = [];
  for (const host of HOSTS) {
    for (const v of variants) {
      const r = await call({
        messages: ask,
        reasoning: v.reasoning,
        max_tokens: 400,
        provider: pin(host),
      });
      rows.push({ variant: v.label, ...record(host, r), reasoningChars: r.reasoning.length });
    }
    const off = rows.at(-1)!;
    if (off.reasoningTokens > 0 || off.reasoningChars > 0) {
      const r = await call({
        messages: ask,
        reasoning: { effort: 'none' },
        max_tokens: 400,
        provider: pin(host),
      });
      rows.push({
        variant: 'effort: none',
        ...record(host, r),
        reasoningChars: r.reasoning.length,
      });
    }
  }
  results.thinking = rows;
  console.table(
    rows.map((r) => ({
      host: r.host,
      variant: r.variant,
      reasoningTokens: r.reasoningTokens,
      reasoningChars: r.reasoningChars,
      ttftMs: r.ttftMs,
    })),
  );
}

// Step 2: interpreter, 40 typed actions, alternating hosts.
async function interpreter() {
  const system = `${PREFIX}\n\n${FIGHT_TASK}`;
  const rows = await pool(TYPED_ACTIONS, 4, async (action, i) => {
    const host = HOSTS[i % HOSTS.length]!;
    const r = await call({
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `${PLAYER_SHEET}\n\n${FIGHT_SCENE}\n\n# Player types\n${action.text}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 300,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'action', strict: true, schema: fightTurnJsonSchema },
      },
      provider: pin(host, { require_parameters: true }),
    });
    let json: unknown = null;
    let error = '';
    try {
      json = JSON.parse(r.text);
    } catch (e) {
      error = `JSON: ${(e as Error).message}`;
    }
    const parsed = json === null ? null : fightTurnSchema.safeParse(json);
    if (parsed && !parsed.success) error = z.prettifyError(parsed.error);
    const action_ = parsed?.success ? parsed.data : null;
    const ids = action_
      ? [
          action_.main.id,
          action_.main.target,
          action_.minor?.feature,
          action_.minor?.onto,
          action_.minor?.id,
          ...action_.uses,
        ].filter((x): x is string => !!x)
      : [];
    return {
      text: action.text,
      ...record(host, r),
      valid: !!action_,
      error,
      reply: r.text,
      mainType: action_?.main.type ?? null,
      typeOk: action_
        ? action.expect.length === 0 || action.expect.includes(action_.main.type)
        : false,
      feasibleOk: action_ ? action_.feasible === !action.infeasible : false,
      unknownIds: ids.filter((id) => !KNOWN_IDS.has(id)),
    };
  });
  const byHost = Object.fromEntries(
    HOSTS.map((h) => {
      const rs = rows.filter((r) => r.host === h);
      return [
        h,
        {
          ...summarize(rs),
          valid: rs.filter((r) => r.valid).length,
          typeOk: rs.filter((r) => r.typeOk).length,
          feasibleOk: rs.filter((r) => r.feasibleOk).length,
          withUnknownIds: rs.filter((r) => r.unknownIds.length).length,
        },
      ];
    }),
  );
  results[`interpreter${sfx}`] = { byHost, rows };
  console.log('Interpreter:', byHost);
  const lines = ['# Interpreter replies (P0.3 spike)', ''];
  for (const r of rows) {
    lines.push(
      `- **${r.text}** (${r.host}${r.valid ? '' : ', INVALID'}${r.typeOk ? '' : ', type?'}${r.feasibleOk ? '' : ', feasible?'})`,
      `  \`${r.reply.replace(/\s+/g, ' ')}\``,
    );
    if (r.error) lines.push(`  error: ${r.error.replace(/\s+/g, ' ')}`);
  }
  writeFileSync(new URL(`interpreter${sfx}.md`, OUT), lines.join('\n') + '\n');
}

// Step 3: narrator, 20 dark scenes on each host.
const SOFTENERS =
  /\b(fortunately|luckily|thankfully|somehow|miraculously|just in time|at least|lesson|hope|mercy|spare[sd]?|relent|i can(?:'|no)t|as an ai|content warning|it'?s important|safe|consent)\b/gi;
async function narrator() {
  const system = `${PREFIX}\n\n${NARRATOR_TASK}`;
  const jobs = HOSTS.flatMap((host) => DARK_SCENES.map((scene) => ({ host, scene })));
  const rows = await pool(jobs, 4, async ({ host, scene }) => {
    const r = await call({
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `${PLAYER_SHEET}\n\n# Scene\n${scene.scene}\n\n# Engine outcome (final; play it exactly)\n${scene.outcome}`,
        },
      ],
      temperature: 0.8,
      max_tokens: 600,
      provider: pin(host),
    });
    const { prose, tailText } = splitNarration(r.text);
    const tail = checkTail(tailText);
    return {
      scene: scene.id,
      title: scene.title,
      ...record(host, r),
      words: prose.split(/\s+/).filter(Boolean).length,
      tailOk: tail.ok,
      tailError: tail.ok ? '' : `${tail.stage}: ${tail.error}`,
      softeners: [...new Set((prose.match(SOFTENERS) ?? []).map((s) => s.toLowerCase()))],
      text: r.text,
    };
  });
  const byHost = Object.fromEntries(
    HOSTS.map((h) => {
      const rs = rows.filter((r) => r.host === h);
      return [
        h,
        {
          ...summarize(rs),
          tailOk: rs.filter((r) => r.tailOk).length,
          inWordRange: rs.filter((r) => r.words >= 80 && r.words <= 200).length,
          meanWords: Math.round(mean(rs.map((r) => r.words))),
          flaggedSofteners: rs.filter((r) => r.softeners.length).length,
          truncated: rs.filter((r) => r.finishReason === 'length').length,
        },
      ];
    }),
  );
  results[`narrator${sfx}`] = { byHost, rows: rows.map((r) => ({ ...r, text: undefined })) };
  console.log('Narrator:', byHost);
  narrations = rows.map((r) => ({
    host: r.host as Host,
    scene: DARK_SCENES.find((s) => s.id === r.scene)!,
    prose: splitNarration(r.text).prose,
  }));
  for (const host of HOSTS) {
    const lines = [`# Narrator transcripts: ${host}${sfx} (P0.3 spike)`, ''];
    for (const r of rows.filter((x) => x.host === host)) {
      lines.push(
        `## ${r.title} (\`${r.scene}\`)`,
        '',
        `${r.provider} · ${r.words} words · tail ${r.tailOk ? 'ok' : `FAILED (${r.tailError.replace(/\s+/g, ' ')})`} · TTFT ${r.ttftMs} ms · $${r.cost.toFixed(5)}${r.softeners.length ? ` · flagged: ${r.softeners.join(', ')}` : ''}`,
        '',
        r.text.trim(),
        '',
      );
    }
    writeFileSync(new URL(`narrator-${host}${sfx}.md`, OUT), lines.join('\n'));
  }
}

// Step 3b: the tail as its own structured-output call at low temperature, written from the prose
// the narrator step just produced (run it in the same invocation, after `narrator`).
let narrations: { host: Host; scene: (typeof DARK_SCENES)[number]; prose: string }[] = [];
async function tail() {
  if (!narrations.length) throw new Error('Run `narrator` before `tail` in the same invocation.');
  const system = `${PREFIX}\n\n${TAIL_TASK}`;
  const rows = await pool(narrations, 4, async ({ host, scene, prose }) => {
    const r = await call({
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `${PLAYER_SHEET}\n\n# Scene\n${scene.scene}\n\n# Engine outcome\n${scene.outcome}\n\n# The scene as written\n${prose}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 400,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'scene_notes', strict: true, schema: narratorTailJsonSchema },
      },
      provider: pin(host, { require_parameters: true }),
    });
    const check = checkTail(r.text);
    return {
      scene: scene.id,
      ...record(host, r),
      tailOk: check.ok,
      tailError: check.ok ? '' : `${check.stage}: ${check.error}`,
      reply: r.text,
    };
  });
  const byHost = Object.fromEntries(
    HOSTS.map((h) => {
      const rs = rows.filter((r) => r.host === h);
      return [h, { ...summarize(rs), tailOk: rs.filter((r) => r.tailOk).length }];
    }),
  );
  results[`tail${sfx}`] = { byHost, rows };
  console.log('Separate tail:', byHost);
}

// Step 4: caching, the same fixed prefix five times in a row on each host.
async function cache() {
  const rows = [];
  for (const host of HOSTS) {
    for (let i = 1; i <= 5; i++) {
      const r = await call({
        messages: [
          { role: 'system', content: PREFIX },
          {
            role: 'user',
            content: `Question ${i}: name one place in the Border Wilds, in five words.`,
          },
        ],
        temperature: 0.2,
        max_tokens: 30,
        provider: pin(host),
      });
      rows.push({ call: i, ...record(host, r) });
    }
  }
  results.cache = rows;
  console.table(
    rows.map((r) => ({
      host: r.host,
      call: r.call,
      prompt: r.promptTokens,
      cached: r.cachedTokens,
      cost: r.cost,
      ttftMs: r.ttftMs,
    })),
  );
}

const STEPS = { prices, thinking, interpreter, narrator, tail, cache } as const;
const named = args.filter((a) => !a.startsWith('--'));
const chosen = named.length ? named : (Object.keys(STEPS) as (keyof typeof STEPS)[]);
for (const name of chosen) {
  const step = STEPS[name as keyof typeof STEPS];
  if (!step) throw new Error(`Unknown step "${name}". Steps: ${Object.keys(STEPS).join(', ')}`);
  console.log(`\n== ${name} ==`);
  await step();
  results.prefixChars = PREFIX.length;
  save();
  console.log(`Spent so far this run: $${spent.toFixed(4)}`);
}
