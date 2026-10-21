# src/ai

The GLM layer (design § How GLM fits in; § The resolver, What GLM sees). Nothing here changes game state; the engine applies everything. `src/core` never imports it.

- `openrouter.ts`: streaming chat completions over fetch and server-sent events, for Node and the browser. Thinking is off by default, every call asks for `usage.include`, and `CostMeter` adds up the cost by role.
- `keys.ts`: where the key comes from (`KeySource`): `.env.local` for the Node scripts, the key typed in Settings for the browser (`ui/ai.ts`); M8's sign-in is another source. Never a `VITE_` env.
- `call.ts`: each role's settings and hosts, every call on the meter, and `callJson`: a reply checked with Zod, retried once with the error, then failed so the role falls back.
- `context.ts`: the context builder. The fixed text first so it caches, then the region, your sheet, the scene, the recent turns and the task, holding only what your character knows. Strangers go in under the scene's own refs (`stranger-1`), and people as behaviour (`content/behaviour.ts`).
- `interpret.ts`: your words as the resolver's plans, one reading or two or three; a fight's turn as a main and a minor action.
- `outcome.ts`: the engine's outcome as the narrator gets it, named as the context names people.
- `narrate.ts`: the narrator (streamed prose, the tail, the tail alone as a retry, the scene's clicks as a fallback) and the chronicler.
- `prompts.ts`: the fixed text (rules, world bible, voice, the acts) and each role's job.
- `schemas.ts`: what each role returns, as Zod and as JSON Schema for strict structured output.
- `mock.ts`: `mockProvider` replays canned replies for tests and UI work; `sseResponse` fakes a raw OpenRouter stream.
- `playbook.ts`: the playbook's sentences in one scene, for the tests and `npm run glm`.

`npm run spike` (`sim/spike.ts`) was P0.3's measurement (`docs/spike-report.md`); `npm run glm` (`sim/glm.ts`) runs P3.8's roles on GLM by hand and writes `docs/spike/p3.8-roles.md`.
