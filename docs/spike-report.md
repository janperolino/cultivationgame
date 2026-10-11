# GLM 5.2 spike report (P0.3)

Measured 2026-10-11 through OpenRouter, model `z-ai/glm-5.2`, by `npm run spike` (`sim/spike.ts`). Raw numbers are in `docs/spike/results.json`, and every reply is in `docs/spike/` (interpreter replies and narrator transcripts, run 1 and run 2). The whole spike cost **$0.26 for 214 calls**.

**Go.** Thinking turns off, caching works on both hosts, JSON is reliable once the schema states every limit, first words arrive in about half a second, and neither host softened any of the 40 dark scenes. Narrate on Morph, with DeepInfra as fallback and as the cheap host for the interpreter. Ask for the narrator's tail again as a separate structured call when it fails.

## Hosts

Jan chose the hosts: Morph and DeepInfra, each pinned per call (`provider.order: [host]`, `allow_fallbacks: false`). StreamLake and Novita were left out because GLM 5.2 felt dumb on them in Jan's use. All 214 calls were served by the host asked for.

| Host | Precision | Input $/M | Output $/M | Cached input $/M |
|---|---|---|---|---|
| Morph | fp8 | 0.40 | 6.00 | 0.137 |
| DeepInfra | fp4 | 0.5625 | 1.80 | 0.105 |

Morph is cheaper on input and over three times dearer on output, so a narrator turn costs about 2.8× more there.

## 1. Thinking off

| Host | Request | Reasoning tokens | TTFT |
|---|---|---|---|
| Morph | no `reasoning` field | 147 | 2,235 ms |
| Morph | `reasoning: { enabled: false }` | **0** | 402 ms |
| DeepInfra | no `reasoning` field | 400 (hit `max_tokens` before any visible text) | none |
| DeepInfra | `reasoning: { enabled: false }` | **0** | 193 ms |

`enabled: false` works on both hosts, so `effort: "none"` was never needed. GLM 5.2 thinks by default, so every call must send the field. `buildBody` in `src/ai/openrouter.ts` sends it unless told not to. All 212 calls that sent it reported 0 reasoning tokens.

## 2. Interpreter: 40 typed actions

The fight is on the reef road at low tide: the player at layer 4 against a Night Bridge runner and his scale hound, with seven tagged features (`sim/spike/scenes.ts`). Each of the 40 actions alternated hosts, so each host got 20. Settings were temperature 0.2, `response_format` with the JSON schema in strict mode, and `provider.require_parameters`. Every reply was checked with Zod. The actions include plain moves, slang, typos, all seven main types and six infeasible ones ("I rip out his golden core", "order my beast…", "drink my healing elixir").

| | Valid (Zod) | Main type as expected | Feasible flag right | Invented ids |
|---|---|---|---|---|
| Run 1, Morph | 20/20 | 20/20 | 18/20 | 2 |
| Run 1, DeepInfra | 17/20 | 16/20 | 16/20 | 1 |
| **Run 1, total** | **37/40 (92.5%)** | 36/40 | 34/40 | 3 |
| Run 2, Morph | 19/20 | 19/20 | 19/20 | 1 |
| Run 2, DeepInfra | 20/20 | 19/20 | 19/20 | 0 |
| **Run 2, total** | **39/40 (97.5%)** | 38/40 | 38/40 | 1 |

- Every invalid reply broke a length limit that Zod enforced but the JSON schema didn't state: a `reason` over 200 characters in run 1, and in run 2 an `onto` over 60 ("scale_hound's back and the reef, spilling burning oil…"). Strict decoding can only enforce what the schema says. Both limits are in `interpretedActionJsonSchema` now; the 60-character one was added after run 2 and hasn't been rerun.
- Between runs the prompt changed: `style` is for talk only, a named thing the player doesn't have makes an action infeasible, and `reason` stays under 20 words and is null when the action is feasible. Run 1 had DeepInfra putting `style: "surrender"` on strikes and Morph calling "rip out his golden core" feasible. Run 2 fixed both.
- The misses that remain are judgment calls, and the engine has the final say on them anyway: "split the whole reef in half" read as a feasible strike, and "feint, then Ember Palm" read as a strike.
- Invented ids show up when the player describes a direction ("slope", "slope_down_at_enemies"). The engine should ignore ids it doesn't know, as the design says.

## 3. Narrator: 20 dark scenes

The 20 scenes are all in the Border Wilds: the toll robbery at the crossing, a hunting partner's betrayal, an ash-wolf raid, a senior claiming your core, conscription, a cheating bounty clerk, a hanging, captives under Gongsun banners, an abandoned guide, a Beast Court agent killing a tamer child, a cut rope at high tide, street tribute, the beast-pit trial, being sold by family, drugged wine, a Ghost Month flogging, a Foundation cultivator taking your herb, a Gu well, a village burned with the living inside, and Elder Mo. Each scene gives the engine's outcome as final. Settings were temperature 0.8 and `max_tokens` 600. Every scene ran on both hosts in both runs.

| | Tail parses and passes Zod | 80–200 words | Mean words | Hit `max_tokens` |
|---|---|---|---|---|
| Run 1, Morph | 13/20 | 15/20 | 195 | 1 |
| Run 1, DeepInfra | 18/20 | 19/20 | 172 | 0 |
| Run 2, Morph | **20/20** | 17/20 | 173 | 0 |
| Run 2, DeepInfra | **20/20** | 17/20 | 161 | 0 |
| Tail as its own call, Morph | **20/20** | | | |
| Tail as its own call, DeepInfra | **20/20** | | | |

- **Run 1 tail failures.** Five were choices over my 80-character limit, which the prompt never stated; run 2's prompt says "a button label under 10 words". Morph's other four were corrupt output: stray tokens spliced into words ("locksmithi", "survivorslock", "forcelock") and one run of `"0"0"0…` repetition that used up all 600 tokens. The prose before each of those tails was clean. Morph showed none of this in its 40 later calls, so it looks like an intermittent fault on the host.
- **Tail as its own call.** The same prose was sent back with the tail schema as structured output at temperature 0.2, and all 40 came back valid. That makes it the retry to use: when a tail fails, ask for the tail alone instead of rerunning the scene. It costs $0.0014 on Morph and $0.0008 on DeepInfra.

### Tone

All 80 scenes were read in full. Neither host refused, hedged, added a content warning or softened an outcome. Every robbery, death, flogging and burning landed as written, and the prose shows them: the boy dragged out of the pit by his ankles, the woman pushed back from the cordon, Tie Niu's neck. The regex for softening words flagged 2 of 80, and both were harmless ("five stones at least", "a body at least").

The small slips, by host:

- **Morph** writes richer, more physical prose. Its mercy beats were tiny and appeared in run 1 only: Sergeant Bao tells you to "run now", Ma Ermei speaks "not unkindly", and "almost gently" appears twice. In run 2 the only kindness the outcome didn't contain was someone leaving a bowl of water.
- **DeepInfra** is tighter and a little blunter, and it sometimes went darker than the outcome asked (the burning). It produced one garbled line of dialogue ("Sorry, Lan." from Wei Lan herself).
- **Both** sometimes drift from the state, and the drift runs harsher, not softer:
  - invented losses: the saber left on the ledge, the mirror taken at the inn, the pack carried off by soldiers;
  - invented orders: patrol the wall alone;
  - wrong counts: the fourth day instead of the third, and "fifteen layers below me";
  - one scale slip: a raft "twenty li out" moments after the rope was cut.

  The engine owns the state and the log line shows the real numbers, so none of this changes the game. The outcome text should still list what the player keeps as well as what they lose.
- **Pronouns.** The sheet gave none, so GLM guessed: "Her. Layer-four girl" in one scene, "his pocket" in another. The player sheet must carry the pronouns chosen at creation (P1.4).

## 4. Caching

The same fixed prefix (rules, world bible, the Border Wilds from the atlas and the style guide; 1,883 tokens with the question) was sent five times in a row on each host.

| Host | Call 1 | Calls 2–5 | Cached tokens | Billed cached price |
|---|---|---|---|---|
| Morph | $0.000795 | $0.000328 | 1,792 of 1,883 | $0.137/M, as listed |
| DeepInfra | $0.001074 | $0.000253 | 1,792 of 1,883 | $0.105/M, as listed |

Caching works from the second call, in blocks: 1,792 tokens is seven blocks of 256. The cached rate is 34% of the input price on Morph and 19% on DeepInfra, which makes these warm calls 59% and 76% cheaper. In the real runs, DeepInfra cached 80–97% of each prompt. Morph cached less (65–75%), and while 4 calls ran at once, 3 of its 100 role calls missed the cache entirely (DeepInfra: 1 of 100), probably by landing on another replica. The design's "about a fifth of the input price once cached" holds for DeepInfra; Morph comes nearer a third.

## 5. Timing and cost

Time to first token, median and p90, from run 2:

| Role | Morph | DeepInfra |
|---|---|---|
| Interpreter, first token | 428 / 685 ms | 1,139 / 1,722 ms |
| Interpreter, whole reply | 1,298 / 1,684 ms | 1,489 / 2,519 ms |
| Narrator, first token | 595 / 815 ms | 422 / 1,003 ms |
| Narrator, whole reply | 6.1 / 7.6 s | 4.4 / 5.5 s |

The 2-second target holds: a clicked turn shows words in about half a second. A typed turn waits for the whole interpreter reply first, so its words appear after about 2 seconds at the median and up to 3.5 seconds at p90 on DeepInfra.

Mean cost per call, measured in run 2 (prompts of about 2,300–2,600 tokens):

| Role | Morph | DeepInfra |
|---|---|---|
| Interpreter (2,600 in, 70–90 out) | $0.00095 | $0.00048 |
| Narrator (2,300 in, 320–340 out) | $0.00257 | $0.00092 |
| Tail retry (2,450 in, 165 out) | $0.00144 | $0.00080 |

Projected to the design's turn sizes (narrator 4,500 in with 2,000 cached and 380 out; interpreter 1,800 in with 1,200 cached and 120 out), at the listed prices:

| Setup | Typed turn | Clicked turn | Turns per $1 (60% typed) | 50-turn session |
|---|---|---|---|---|
| Narrator on Morph, interpreter on DeepInfra | $0.0042 | $0.0035 | ~250 | ~$0.20 |
| Everything on Morph | $0.0047 | $0.0035 | ~240 | ~$0.21 |
| Everything on DeepInfra | $0.0030 | $0.0023 | ~370 | ~$0.14 |

The 20 sessions a month the design budgets come to about $4 on the recommended setup, before chronicler calls and tail retries; those add about 5%.

## Corrections to the request settings

These went into design.md § How GLM fits in:

1. Always send `reasoning: { enabled: false }`, because GLM 5.2 thinks without it. `effort: "none"` isn't needed.
2. Route the narrator to `provider: { order: ["morph", "deepinfra"] }` and the interpreter to `{ order: ["deepinfra", "morph"], require_parameters: true }`. Never route to StreamLake or Novita (Jan's experience). Novita, Z.ai's own host and AtlasCloud don't list structured outputs anyway.
3. Every limit Zod checks must also be in the JSON schema (`maxLength`, `maxItems`), so strict decoding enforces it.
4. When a narrator tail fails, retry by asking for the tail alone as structured output at temperature 0.2 (40/40 valid), not by rerunning the scene.
5. The narrator prompt states the tail's limits (choices under 10 words, strict JSON). The player sheet carries pronouns. Outcomes list what the player keeps as well as what they lose.

## Fallbacks still open

- If Morph's corrupt tails come back, retrying the tail alone already covers it. If they show up in prose too, move the narrator to DeepInfra, which costs about a third as much and is a little plainer.
- To win back half a second on typed turns, keep the interpreter on Morph, which answers faster, at twice DeepInfra's cost.
