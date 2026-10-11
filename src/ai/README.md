# src/ai

The GLM layer. Nothing here changes game state; the engine applies everything.

- `openrouter.ts`: streaming chat completions over fetch and server-sent events, for Node and the browser. Thinking is off by default, every call asks for `usage.include`, and `CostMeter` adds up the cost.
- `mock.ts`: `mockProvider` replays canned replies for tests and UI work; `sseResponse` fakes a raw OpenRouter stream.
- `schemas.ts`: the interpreter's action schema and the narrator's JSON tail, as Zod and as JSON Schema, plus `splitNarration` and `checkTail`.
- `prompts.ts`: first drafts of the fixed, cached prompt text (rules, world bible, region brief, voice) and the role tasks.

`npm run spike` (`sim/spike.ts`) measures all of it against OpenRouter; see `docs/spike-report.md`.
