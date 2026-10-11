# Build plan

The game is built in phases, and each phase is sized for one Claude Code session. A new session starts clean, reads this file, does one phase, records what it did, and ends. Nothing has to be carried from one session to the next except what is written here, in the code and in the tests.

The rules live in `docs/design.md` and the world in `content/atlas/entries.json`. Both local files are the source of truth; the claude.ai design doc and atlas they came from are frozen archives since 2026-10-11.

## How each session runs

1. Open Claude Code in this folder and say: **"Do phase P0.1 from plan.md."** (Use the next unticked phase.)
2. Claude reads `CLAUDE.md` (automatic), this file's Status, Open questions and that phase, then only the `docs/design.md` sections the phase lists. It searches by heading rather than reading the whole file.
3. If the phase has a **Before the session** line, Jan does that first. The session checks it and stops if it isn't done.
4. It stays inside the phase. If something comes up that the design doesn't answer, it picks the simplest option that fits, writes it under Open questions and carries on. It stops to ask only when the answer would change the design. It adds whatever npm packages the phase needs.
5. Content a session drafts (talents, tree nodes) is committed as data and listed in the Log as awaiting review. Jan reviews it after the session and leaves notes under Open questions, and the next session applies them before its own phase.
6. The phase is finished when its "Done when" list holds and `npm test`, `npm run lint` and `npm run build` pass.
7. Before ending, it ticks the phase in Status, adds 3–5 lines to the Log (what was built, decisions made, what the next phase should know) and commits as `P0.1: <summary>`.
8. Close the session. The next phase starts in a fresh one.

**Design sessions** (D2, D3 and so on) run here like any phase: they edit `docs/design.md` and the atlas directly, then tick, log and commit. `node tools/atlas-serve.cjs` opens the atlas map for browsing and editing.

**Planning sessions** happen between phases whenever Jan wants one. They discuss the design and edit `docs/design.md`, `plan.md` and the atlas, never code. Each one adds a Log line and commits on its own as `design: <summary>`, separate from any phase commit. Only one session works in this folder at a time; branches can come later, if several agents ever run in parallel.

## Status

- [x] P0.1 Scaffold the project
- [x] P0.2 The atlas inside the game
- [x] P0.3 GLM spike
- [x] P1.1 Game state, loop and saves
- [x] P1.2 Cultivation rules
- [x] P1.3 Trees, techniques and mastery
- [ ] P1.4 The day wheel, methods and insight
- [ ] P1.5 The trees, redrawn
- [ ] P1.6 Character creation and the first hour
- [ ] P1.7 Polish, balance and share
- [ ] D2 Design: items and gear, enemies and pedigree, combat Dao nodes, the Border Wilds canon pass
- [ ] P2.1 Combat rules core
- [ ] P2.2 Enemies and the fight sim
- [ ] P2.3 Combat screen, items and the bag
- [ ] D3 Design: exploration, NPC basics, Way nodes, Border Wilds encounters
- [ ] P3.1 The Border Wilds as a playable region
- [ ] P3.2 GLM roles
- [ ] P3.3 Go-in screen and loot flowing home
- [ ] P3.4 Tone and reliability pass
- [ ] M4–M8: expanded into phases at their design sessions (outline at the end)

---

## M0: Setup, the atlas and the AI spike (weeks 1–2)

### P0.1 Scaffold the project (about 2 hours)

**Read:** `CLAUDE.md`; design.md § Tech stack and code layout; § UI and screens (Look and Layout only).

**Build:**
- `git init` and a `.gitignore` covering `node_modules`, `dist`, `.env*` and `*.local`. Check `node --version` is 20 or newer.
- Vite + React + TypeScript (strict). Dependencies: zustand, zod, dexie. Dev: vitest, eslint, prettier, tsx, d3. Later phases add their own.
- Folders as the design lays out: `src/core`, `src/content`, `src/ai`, `src/ui`, `sim/`, `tools/`, `content/`.
- A lint rule that fails if `src/core` or `src/content` imports react, react-dom, `src/ui` or `src/ai`, or if `src/core` uses `fetch`. The Node sims import both folders.
- `src/core/rng.ts`: seeded mulberry32 (the same function the atlas uses), with tests.
- The app shell: side menu (Abode only for now), main area, right context panel; the slate and gold color tokens from the design; below 900px wide the menu becomes a drawer and the context panel slides up from the bottom.
- npm scripts: `dev`, `build`, `test`, `lint`, `sim`, `atlas:build`, and `atlas:serve` for `node tools/atlas-serve.cjs`.

**Done when:** `npm run dev` shows the empty shell in slate and gold; test, lint and build pass; a React import placed in `src/core` or `src/content` makes lint fail.

### P0.2 The atlas inside the game (about 2–3 hours)

This is the "Atlas export" item from the design checklist.

**Read:** `content/atlas/README.md`; `tools/atlas-geo.cjs`; design.md § World bible and § The world map.

**Build:**
- `src/content/atlas/schema.ts`: a Zod schema for an entry, covering every field in the README and what the data adds: `top` and `map` are missing on a few entries, `years.from` can be null (the Unrecorded), `terrain` also appears on seas and forbidden lands, and `map.inner` is the Rim's inner radius.
- A strict realm field: parse each entry's free-text `top` into `{ realm, note }`, where realm is one of the nine realms from Qi Condensation to Tribulation Transcendence, `unknown` or empty (a missing `top` counts as empty). List any entry that fails to parse, and count the entries with no realm by kind for the canon pass.
- `npm run atlas:build`: read `content/atlas/entries.json`, validate it, compute fixed outlines with `tools/atlas-geo.cjs`, and write `src/content/generated/atlas.json` with entries plus geometry rounded to 10 li. Outlines cover continent coasts, region cells clipped to the coast (use a polygon clipping package), kingdom and forbidden-land shapes, and sea-zone circles. The tool skips The Scar on purpose, so store it as a circle from its `map.r`. Drop `notes`, `order`, `editedBy` and `editedAt` from the output, and keep `truth` for the narrator.
- Commit the generated file, so tests and builds never need d3 or a rebuild.
- A test that loads the generated file and checks it against the source: the same entry ids as `content/atlas/entries.json`, and 6 continents. Don't hardcode the entry count, since edits change it.

**Done when:** the build runs clean, every `top` parses or appears in the report, and the generated file loads in a test. After any atlas edit, rerun `npm run atlas:build` and commit the generated file.

### P0.3 GLM spike (about 3 hours, about $0.50 of OpenRouter credit)

**Before the session:** put `OPENROUTER_API_KEY=...` in `.env.local` and check the OpenRouter account has at least $1 of credit.

**Read:** design.md § How GLM fits in; § What the AI will cost; § Risks; the "One turn, start to finish" part of § Combat. In the atlas, the Border Wilds (`qm-bianhuang`) and the entries inside it.

**Build:**
- `src/ai/openrouter.ts`: streaming chat completions (fetch and server-sent events), using the request settings in the design and `usage.include`, recording cost. It must run in Node and in the browser.
- `src/ai/mock.ts`: canned replies for tests.
- `src/ai/schemas.ts`: the interpreter's action schema, written from the design's example JSON and kept for P3.2.
- `sim/spike.ts` (`npm run spike`, loading `.env.local` with Node's `--env-file`):
  1. Thinking off: `reasoning_tokens` must read 0. If it doesn't, retry with effort "none" and record the result.
  2. Interpreter: 40 typed actions in a short hand-written Border Wilds fight scene, sent with the JSON schema and `provider.require_parameters`, checked with Zod. Target: at least 95% valid.
  3. Narrator: 20 dark scenes in the Border Wilds, such as a robbery at the smugglers' crossing, a betrayal, a beast raid, or a senior taking your beast core. Save the transcripts, note any hedging or softening, and count how many of the 20 JSON tails parse and pass Zod.
  4. Caching: send the same fixed prefix of rules and world bible, about 2,000 tokens, several times in a row, and record the cached tokens and the discount. Every row of the cost table assumes caching works.
  5. Timing and cost: time to first token (target about 2 seconds) and cost per call.
- `docs/spike-report.md`: the numbers, the hosts used and a go/no-go line, with any fallback to take.

**Done when:** the report exists with measured numbers. Any correction to the request settings goes into design.md and the Log.

## M1: Idle core, no AI (weeks 3–5)

### P1.1 Game state, loop and saves (about 3 hours)

**Read:** design.md § Saves; § Tech stack and code layout (the five rules); § How the two halves connect (the calendar paragraphs); § Cultivation (the body and soul paragraphs, for the state's shape).

**Build:**
- `src/core/state.ts`: character, calendar, three parallel ladders (realm, stage and bar for qi, body and soul), insight, spirit stones, the chronicle and unlock flags.
- The game loop: a few ticks a second, with in-game time per tick set by the realm's calendar speed, and a debug speed multiplier (a `?speed=` URL flag) for testing. Offline time is applied on load, capped at 12 real hours. Death never happens offline: time stops at the lifespan edge.
- A Zustand store that bridges core and UI.
- Saves as the design describes, in IndexedDB through Dexie: 3 slots holding a lineage each, a version number with migrations, autosave every 30 seconds and at each breakthrough, a backup copy, export and import of one compressed file that includes the chronicle, and the gentle mode's one rewind. Ask the browser for persistent storage. One tab plays a slot at a time; a second tab on the same slot shows a take-over notice (the Web Locks API does this).
- The Settings screen's save section, with the last export date.

**Done when:** tests cover a save round trip, migrating a v0 fixture, falling back to the backup from a corrupted save, and the offline catch-up math; reloading the page keeps progress; a second tab can't autosave over the first.

### P1.2 Cultivation rules (about 3–4 hours)

**Read:** design.md § Cultivation (the realms table, seclusion budget, breakthroughs, body and soul, insight, cultivation methods, breakthrough grades); § Character creation (the spirit roots table and pacing targets); § Economy (stones as fuel); § Combat (the six attributes line, for Aptitude); § UI and screens (Look). Open `docs/mockups/glass-study.html` in a browser.

**Build:**
- The cracked-glass look first, matching the mockup: the new colors as tokens in `src/ui/theme.css`, smooth glass panels, and the cracked background drawn on a canvas from a seed kept in the life's state, redrawn on resize. Every color is a variable, since P1.5 lets players change them. The flare and the new fracture at a breakthrough come with this phase's breakthroughs.
- `src/content/realms.ts`: realms, stages, lifespans, gates and the realm curve as data.
- `src/content/methods.ts`: the common methods the origins hand out (the garrison's standard method, the cave clans' crude method, the cadet's spear method, the Gate's saber method, and the two the refusals lead to). Fit is data: full, partial or poor, starting at ×1.0, ×0.8 and ×0.6. Common methods fit every root fully except mutated roots, which fit them poorly.
- Qi gain from root speed × method fit × qi density × Aptitude. Qi density is 1 until abodes arrive, and layers 1–3 ignore root speed. Spirit stones burn during qi seclusion as § Economy describes.
- Body and soul as their own ladders beside qi: the same realms and stages, bars fed by tempering and nourishment, their own breakthroughs, each capped at one major realm above qi. Insight from seclusion, rising with realm.
- Seclusion days split among qi, body, soul, study and practice. The default plan is 60% qi, 15% body, 10% soul, 10% study and 5% practice, shared among whichever slots are open.
- Minor and major breakthroughs as § Cultivation describes: odds that rise as the bar fills past full, the auto setting for minor breakthroughs offline, no major breakthrough offline, grades from flawed to heavenly set by the margin you bring, and the insight threshold counted on insight ever earned. Major gates need a full bar, an insight threshold and the gate item. The Foundation Pill is an item count; the card that hands it over comes in P1.4, so tests grant it directly.
- The lifespan edge gives a last chance. If it fails, the life ends: the slot keeps its chronicle and offers a new life, with nothing carried over, until rebirth arrives in M8.
- The Cultivate screen and the Abode bars: qi, body, soul, and age against lifespan. The spirit pool stays hidden until M4.
- `sim/pacing.ts`: real hours to each layer and realm, per root, playing the default plan and the default breakthrough setting; it also prints a qi-only run for comparison. Tune the constants until every root reaches layer 3 in about 45 minutes, a true root reaches layer 9 in 15–20 hours and a heavenly root in about half that.

**Done when:** the shell wears the glass look at desktop and phone widths, the formulas have unit tests, and the pacing sim lands inside the targets, with its output pasted into the Log.

### P1.3 Trees, techniques and mastery (about 3–4 hours)

**Read:** design.md § Cultivation (the trees, insight, "learn with insight, use with one gate", techniques, mastery); § UI and screens (the Trees and Techniques rows).

**Build:**
- A tree data format in `src/content/trees/`: tiers, nodes, costs, effects, requirements, sealed above your level.
- Node lists for tiers 1 and 2 of the Qi, Body and Soul trees: about 8–12 nodes per tier, drafted as data in the session and committed for Jan's review (How each session runs, step 5).
- Spending insight, with node effects wired into the rules.
- Technique data, with mastery from Glimpse to Origin raised by practice, including the first technique of each origin path that P1.4 hands out.
- The Trees screen (a pannable graph in tier bands) and the Techniques screen.
- While you're there, before more code builds on the current shape:
  - Move what belongs to a cultivator (the three ladders, insight, attributes, root, method and items) into a `Cultivator` with an id, held as `player` in the game state, and make the rules in `core/cultivation.ts` take a `Cultivator` instead of the whole game state. NPCs and co-op guests later run on the same code. Save migration included.
  - Split the one random state into named streams, each seeded from the life's seed and the stream's name: breakthroughs now, combat and world later. Adding a system then never changes another system's rolls. Save migration included.
  - Add lint rules that ban `Math.random`, `Date.now` and argument-less `new Date()` in `src/core`; time and randomness come in as inputs.

**Done when:** buying a node changes the numbers it claims (tested), sealed nodes can be learned but not used, and both screens work at desktop and phone widths.

### P1.4 The day wheel, methods and insight (about 4–5 hours)

**Read:** design.md § Cultivation (the day is twelve double-hours, body and soul, every ladder needs a method, insight, lines and chapters, methods, mastery); § Tier, rarity and pedigree; § Economy (stones as fuel, where stones go); § UI and screens (Look, players pick their colors, rarity's palette, the Cultivate row). Open questions: the planning entry after P1.3.

**Build:**
- `src/content/rarity.ts`: the seven rarities with their exponents, check bonuses, property counts, price factors and the roll table, and `rarityMultiplier(rarity, gap)`; the realm gaps (×3, ×5.5, ×10) beside the realm data. The rarity colors as tokens in `theme.css`, apart from the accent and the warning color.
- `src/content/hours.ts`: the twelve branches with name, hanzi and element; the activities (qi, body, soul, study, practice, sleep); the element bonus, dawn's purple qi and the sleep hours Qi Condensation needs. `src/content/routines.ts`: a few routines drafted for Jan's review, the garrison's among them, with the discipline bonus.
- Methods reshaped for all three ladders: ladder, tier (the realm they stop at the peak of), rarity, kind (common, costly, elite), requirements, a daily cost in stones for costly ones, fit, and `line` and `chapter`. The six origin methods become white, common, tier 1 qi methods, each with a Foundation chapter for P1.6's layer 9 card; add one or two common tempering and nourishing arts for P1.6's cards. Techniques gain rarity, `line` and `chapter`.
- The Cultivator holds known methods and the active one on each ladder, and the wheel instead of the plan's shares. The rules: hours replace shares; a ladder gains only with an active method; method speed is tier × rarity, with the tier bonus counted once; a method stops at the peak of its tier, so the major breakthrough out needs the next chapter or method; costly methods drain stones and stall unfed; changing chapter or line costs bar and, across lines, unsettled qi; element hours, dawn and sleep (freed at Foundation); a learned routine followed exactly earns its bonus.
- Insight from everything: the cultivation trickle, study hours, a burst at each mastery level-up, and contemplation sources (data with a yield and a supply) for P1.6's cards to point at. Techniques: a next chapter starts one mastery level down, or two at a higher rarity; kinship speeds practice. `temper` and `nourish` let cards and items add body and soul from the world.
- The Cultivate screen: the wheel (tap an hour to set it; element and dawn markers; per-hour yields in tooltips), routines (pick, save, follow), and each ladder's method with its tier, rarity color and cost. The Techniques screen shows rarity and line.
- Save v4 with a migration: the shares become a wheel in the same proportions, the life's method becomes a white tier 1 qi method, and body and soul get no method.
- Re-tune `sim/pacing.ts` on the white tier 1 baseline and the default routine.

**Done when:** tests cover the wheel's yields, element hours, sleep freed at Foundation, method gating, the peak cap, tier × rarity speed, chapter and line costs, insight bursts and the chapter mastery drop; the pacing sim holds its targets (every root at layer 3 in about 45 minutes, a true root at layer 9 in 15–20 hours, a heavenly root in about half) with its output in the Log; and the wheel works at desktop and phone widths.

### P1.5 The trees, redrawn (about 4 hours)

**Read:** design.md § Cultivation (every tree has the same shape, the trees, learn with insight, use with one gate); § Combat (the fighting-up ledger, for the capstones' multipliers); § UI and screens (the Trees row). Open questions: Jan's notes on the P1.3 nodes, if any.

**Build:**
- Tree format v2 in `src/content/trees/`: nodes at free positions; minor, notable, starter and capstone nodes; branches, of which 2–3 are the capstone's and end in a notable that links into it; the capstone opening the next tier's starter. The Dao half-tier count stays for later Dao bonuses.
- Redraft tiers 1 and 2 of the Qi, Body and Soul trees at 25–30 nodes a tier in 4–5 branches, keeping what worked from P1.3: smaller effects per node, costs rebalanced so a player chooses branches by layer 9 instead of buying everything, and a few multiplicative fighting-up effects on capstones and late notables (stored now, read in M2). Committed for Jan's review.
- Save migration: learned P1.3 nodes map to their new ids where they survive, and the rest refund their insight.
- The Trees screen as a canvas: drag anywhere with mouse or touch, zoom with the wheel or a pinch, no scrollbars, a re-centre button, curved edges, and node details in an overlay.
- Update the pacing sim's node-buying run.

**Done when:** content tests cover every tier's shape (one starter, one capstone, the gating branches' ends feeding the capstone, every node reachable, the capstone feeding the next starter), buying a node still changes exactly the numbers it claims, sealed nodes still do nothing, the migration refunds what it drops, and the canvas pans and zooms with mouse and touch at desktop and phone widths.

### P1.6 Character creation and the first hour (about 3 hours)

**Read:** design.md § Character creation and the first hour; § Cultivation (talents); § Tier, rarity and pedigree (talents and roots); § Saves (the gentle mode); § UI and screens (the Character and Chronicle rows); § Combat (the six attributes line). In the atlas: `qm-bianhuang`, `qm-shiyan-guo`, `qm-anbian-fu`, `qm-shoukou-cheng`, `qm-tushou-men`, `qm-yeqiao-hui`, `qm-duigu-qiang`.

**Build:**
- The creation flow: name, look and pronouns; ironman or gentle mode; the five-talent roll with odds tables in `src/content/talents.ts`; three rerolls.
- Talents: about a dozen per kind spread over the seven rarities from gray to red (`content/rarity.ts`), each a stat change under its flavor, including the Agility, Fortune and Aptitude modifiers the design gives body, fate and soul talents; spirit roots include the red chaos root. Origin is rolled like the rest; in v1 it lands on one of the three Border Wilds origins, a third each. Drafted in the session and committed for Jan's review.
- Three origins with fixed childhood text, and the testing-day choice (go along or refuse), which sets the starting method, technique and flags.
- Each origin path hands out its first technique (`firstTechnique`) with `gainTechnique` at minute 20–35; drop `PLACEHOLDER_TECHNIQUE` from `startLife` and `beginNextLife`.
- Fixed event cards for what the world supplies from M3: the errand card that stands in for the first trip out, which also hands over a common tempering art; a later card with a common nourishing art; a card within the first hour that gives a method to the two refusals that start without one (the Night Bridge Society's offer to the deserter, a bounty-office job for the street cultivator); and the origin's layer 9 card that hands over a Foundation Pill and the Foundation chapter of the origin's method, with another card ten in-game years after a failed attempt. Cards can point at contemplation sources for insight.
- Unlock flags, so screens appear as they're reached, with chronicle entries.
- Make the chronicle a typed event log before this phase writes its entries: each event has a day, a type, the actors by id, a place and a data object, and its text comes from a template for that type. NPC memory, the storyteller and rumors read these events later. Migrate the existing text entries.
- The Chronicle screen, and the Character screen: talents and the six attributes, with fame and standing hidden until M5.

**Done when:** a new life reaches layer 3 in about 45 minutes of play on any root (checked with the sped-up clock), and all three origins × both choices play through to a method and the errand card.

### P1.7 Polish, balance and share (about 2–3 hours)

**Before the session:** create an empty GitHub repository, add it as this folder's `origin`, and set GitHub Pages to deploy from GitHub Actions.

**Read:** design.md § Economy (what the balance sims measure); § How the two halves connect (running the clock slower); § UI and screens ("Coming back", players pick their colors, and the Settings row); the Log.

**Build:** the coming-back card, chronicle polish, short number formats and tooltips, the Settings screen's text size and reduced motion, the clock-speed picker (any realm speed the life has reached, saved with the slot), the color and glass options (accent, crack light, the rarity colors, fine web, a new-glass reroll, presets and a picker that warns on poor contrast), a balance pass with the pacing sim, a GitHub Actions workflow that deploys to Pages, and a short README for friends. Use "Severed Heaven" as the working title until the game has a name.

**Done when:** the Pages link loads in a fresh browser profile, a new life reaches layer 3 there with the sped-up clock, and the pacing sim sits inside its targets. The other balance measures wait for M2 and M3.

## D2: Design session, before M2

Settle items and gear (slots, tier and rarity on every item, weapons and armor on the fighting-up ledger, weapons above your realm, bonding, pill toxicity, storage rings, aptitude-raising pills and rites, the upkeep costly methods drink, and the gate items for major body and soul breakthroughs) and enemies (beast and cultivator templates, behavior profiles, loot, and the pedigree tables with each realm's ordinary baseline). Check the ledger's rows and sizes against the items you settle. Draft tiers 1 and 2 of the combat Daos: the five elements, Sword, Saber, Spear and Fist. Fix the tags every combat outcome carries for effects and sound: form, element or damage type, realm and result. Do the Border Wilds canon pass.

## M2: Combat engine (weeks 6–7)

- **P2.1 Combat rules core:** attributes, d20 checks, criticals, grazes and backfires, realm and stage gaps on the one ladder the design describes, the damage formula with damage rounded to the nearest whole number, eleven damage types and their statuses, the element cycle and combos, qi costs. A turn takes actions from any number of actors on each side, every action names its actor, and combat rolls on its own random stream, so allies, beasts and co-op parties need no rewrite. Done when every rule has a test and the design's worked example reproduces exactly.
- **P2.2 Enemies and the fight sim:** templates and behavior profiles from D2; `sim/fights.ts` runs 10,000 fights per matchup; tune the rarity exponents, check bonuses, weapon rule and NPC baselines until the fighting-up ledger's targets hold (design § Combat), measured without one-shot consumables; the targets are the sim's pass/fail list.
- **P2.3 Combat screen, items and the bag:** button-only fights, the bag and gear from D2, the combat Daos wired in, and the combat effects layered from the outcome tags (design § Combat, "Effects fill the wait"), with a reduced-motion version.

## D3: Design session, before M3

Settle exploration (travel time, encounters per region, how a scene is built, ruins, fleeing, dying in the world, and the fog's rules: what travel, divine sense, maps and rumors each reveal) and NPC basics (the record, what each NPC knows, how talk changes relationships). Draft tiers 1 and 2 of the Orthodox, Demonic and Buddhist Ways, plus the Border Wilds scenes and encounter tables.

## M3: Go-in slice, the playable milestone (weeks 8–10)

- **P3.1 The Border Wilds as a playable region:** scenes, tagged features, encounters, and a fogged region map drawn from the generated geometry in the glass look, with the four fog states and the divine sense circle from the mockup.
- **P3.2 GLM roles:** interpreter, narrator and chronicler; a context builder with the fixed text first so it caches; Zod checks with one retry and a safe fallback; the mock provider in tests; the cost meter.
- **P3.3 Go-in screen and loot flowing home:** the screen as designed; the first trip out replaces the errand card; Ways grow from deeds.
- **P3.4 Tone and reliability pass:** rerun the 20 dark scenes in the game, measure the JSON failure rate and compare prose by host, then fix the prompts.

## Later milestones (outline)

Each opens with a design session that settles its topics and expands it into phases here.

- **M4 Crafts (weeks 11–14):** D4 recipes and craft Dao nodes; then alchemy and spirit farming; refining, formations and talismans; experimentation, production queues and Core Formation; the spirit pool.
- **M5 People and powers (weeks 15–18):** D5 NPC depth, sects and the organization skeleton, with a cast list of the atlas's named people and the atlas's powers tagged by type; then NPC records and memory; sects, posts and contribution; factions, fame, karma and romance basics; the other three origins; steward's reports as templates, with the Scribe's prose when a key is set.
- **M6 Living world (weeks 19–21):** D6 world simulation; then the events calendar, prosperity, markets and standing orders; map tiers and travel; beast taming, appraisal and geomancy; rumors and headlines as templates, with the Scribe's prose when a key is set.
- **M7 Big moments (weeks 22–24):** D7 tribulations and heart demons; then Nascent Soul and tribulations; heart demons as a go-in scene, with thinking on and a templated trial when there is no key.
- **M8 Rebirth and friends (weeks 25–27):** D8 death, rebirth and legacy, plus art and sound; then lifespan's end, rebirth and legacy; friends' access through OpenRouter sign-in, hosting and polish. Art and sound follow the direction in design § Still to design.
- **After v1, multiplayer:** friends as NPCs, where a friend's exported character snapshot becomes a named NPC in your world (needs M5's NPC records); then co-op go-in sessions for two to four friends through a small room server, turn-based, one narration per turn, each guest's own world advancing as if they had gone on a trip (needs M3). No shared persistent world.

---

## Open questions

Write questions here when a phase hits something the design doesn't cover, with the option picked.

- **Breakthrough rules** (settled 2026-10-11, design § Cultivation). Odds rise as the bar fills past full; minor breakthroughs run on auto offline; majors never happen offline; the insight threshold counts insight ever earned; grade follows the margin you bring.
- **Stage gaps across realms** (settled 2026-10-11, design § Combat). One ladder: −2 and ×1.2 per stage, half that per Qi Condensation layer, and −2 per major breakthrough with a damage step that grows by realm (×1.75 into Foundation, ×3.2 into Core Formation, ×5.8 from Nascent Soul up), so a realm apart is −8 and about 9×, 30× or 100× the power. Escalating gaps chosen 2026-10-11 to match the genre. The worked example still gives 33.
- **Untrained body and soul** (assumed 2026-10-11). Both start at zero like qi and stay behind when neglected; nothing lifts them to the qi realm for free.
- **Fonts** (assumed 2026-10-11, P0.1). The design asks for a serif display face, a brush face for hanzi and a plain sans, but names none. Picked Cormorant Garamond, Ma Shan Zheng and Inter from Google Fonts, with system fallbacks, as tokens in `src/ui/theme.css`.
- **Atlas outlines the plan didn't name** (assumed 2026-10-11, P0.2). The Rim (`guixu`) is stored as an `annulus` shape from `map.r` and `map.inner`, since the page draws it as a ring. Straits (`sea` entries) still get no shape, as on the page. A `top` that fails to parse would be kept as `unknown` with its text in the note, and listed by the build; none fail today.
- **GLM hosts** (Jan's call, 2026-10-11, P0.3). Test and use the cheap hosts Morph and DeepInfra; never StreamLake or Novita, which make GLM 5.2 feel dumb. Morph rarely refuses; the worry is softening, which the spike checked for and didn't find. Settled as: narrator on Morph with DeepInfra as fallback, interpreter on DeepInfra then Morph (design § How GLM fits in).
- **Narrator tail retry** (assumed 2026-10-11, P0.3). When the narrator's JSON tail fails, P3.2 should ask for the tail alone as structured output at temperature 0.2 (40/40 valid in the spike) rather than rerun the scene. The design's "one retry with the error message" becomes this for the narrator.
- **Calendar and save details** (assumed 2026-10-11, P1.1). The year is 360 days (twelve months of thirty). Lifespans past Nascent Soul are placeholders (2,000, 3,000, 5,000, 8,000, 12,000) until their realms are designed. The chronicle lives inside the game state rather than its own table, small enough until M3's adventure log. Gentle mode's rewind point starts at the beginning of the life, so the rewind works before the first breakthrough. The `?speed=` multiplier applies to live play only; offline time is real time. A gap of over a minute between ticks (a sleeping laptop) counts as offline time, cap included. Settings can erase a slot, after a confirm.
- **Look and where the AI runs** (Jan's call, 2026-10-11, planning). Black cracked glass replaces slate, with a gold accent and qi-cyan crack light (`docs/mockups/glass-study.html`), and players can change both colors. Idle play never needs the AI: the Scribe rewrites templated lines when a key is set, and the heart demon is a go-in scene with a templated fallback. Combat effects come from the engine's outcome tags, never from a model. Art is made at design time and shipped as data.
- **Cultivation details the design leaves open** (assumed 2026-10-11, P1.2). Layers 1–3 ignore method fit as well as root speed, so a mutated root also reaches layer 3 in 45 minutes. Root speed counts once qi stands at layer 4. A breakthrough uses up the bar, overfill included. Offline, a bar at a major gate keeps filling to 150% rather than stopping at full; it just never breaks. The auto setting runs minor breakthroughs online too, and "Only when I say" holds them offline. Unsettled qi means no gains on that ladder for 5 days; injuries halve a ladder's gains (180 days after a failed minor from Foundation up, 3 years after a failed major). Body and soul majors need no gate item until D2 settles theirs, and use the qi thresholds. The last chance still needs the insight threshold. Grades score 0–4: a point each for qi at 150%, insight earned at twice the threshold, and each other ladder at the new realm (flawed under 0.75, ordinary, superior from 1.75, perfect from 2.75, heavenly from 3.5 on a rare method). A death keeps the lineage, the world calendar and the chronicle; the next life is "Nameless" until P1.4.
- **Where insight comes from** (assumed 2026-10-11, P1.2). Every seclusion day leaves a trickle (0.05 a day), study days give 1, and both scale with the qi realm (×1, ×3, ×9 and up). A qi-only plan never studies, so it reaches layer 9 sooner but waits on Foundation's 500 insight (27.8 h against 22.6 h for a true root). *Superseded by planning after P1.3: insight comes from everything you do (design § Cultivation), built in P1.4.*
- **Glass fractures** (assumed 2026-10-11, P1.2). Every qi breakthrough opens a fracture and every breakthrough on any ladder flares the glass; only the newest 12 fractures are drawn, so a long life doesn't white out the screen. A new life gets new glass.
- **Talk styles** (assumed 2026-10-11, P0.3). The interpreter's talk styles are the design's four: bluff, intimidate, bargain, surrender. A taunt maps to intimidate.
- **Tree rules the design leaves open** (assumed 2026-10-11, P1.3). The big three trees hold a tier at half its nodes, as the Daos do, and a tier's starter needs the tier below held; every other node names the nodes it grows from. Each tier is a 5 × 4 grid: starter, two rows of four, capstone. Tier 1 nodes cost 10–120 insight and tier 2 nodes 150–1,000. The Trees screen opens at 10 insight earned, the Body and Soul tabs once their seclusion slots open, and every node learned gets a chronicle line. Node effects are stats (`content/stats.ts`); the cultivation ones work now, and the combat, map and crafting ones (qi pool, HP, resistances, divine sense, concealment, split attention and the rest) are stored and summed now but read only when those systems ship. ~~**Awaiting Jan's review:** the 60 nodes in `src/content/trees/`.~~ *Superseded in part by planning after P1.3: a tier now opens through the capstone, which 2–3 branch ends unlock, at 25–30 nodes a tier, and P1.5 redraws the trees. The 60 P1.3 nodes need no review; leave notes on any worth keeping. The stats file, sealing and the screen unlock stand.*
- **Mastery numbers** (assumed 2026-10-11, P1.3). Practice days to each level at tier 1: Comprehension 4, Mastery 30, Domain 150, Origin 600, three times that per tier above. With the default 5% practice share that puts Comprehension about 15 minutes after the first technique, as the first hour wants. Every level adds +2, Glimpse included, so Comprehension gives +4 as in the design's Ember Palm example. A sealed technique can't be practiced. Practice days go to one picked technique; a technique at Origin takes no more. The practice slot opens with the first technique you can use. *Planning after P1.3 adds rarity and the chapter rule (design § Cultivation, lines and chapters), and P1.4 replaces the practice share with practice hours.*
- **First techniques** (assumed 2026-10-11, P1.3). One per origin path, keyed `origin/choice` with origins `cave-orphan`, `conscript`, `frontier-orphan` and choices `along`, `refuse` for P1.4 to use: Rampart Palm, Sinkhole Stone Fist, Piled Bones Thrust, Undertow Palm, Bone-Splitting Cleave and Alley Wind Palm. Power and qi cost follow the design's Ember Palm (40–48 power, 8–11 qi) for M2 to tune. Until P1.4, every new life and every migrated P1.2 life on the garrison's method gets Rampart Palm. **Awaiting Jan's review:** the six techniques in `src/content/techniques.ts`.
- **What a Cultivator holds** (assumed 2026-10-11, P1.3). Beyond the plan's list, the name, pronouns, look, birth day, lifespan bonus, spirit stones, seclusion plan and milestone flags (seclusion slots, gates reached) moved in too, since NPCs need them all; the screen unlocks, glass, chronicle and rewind stay with the game, and gentle or ironman sits at the top as `mode`. The rules return chronicle notes, and `core/life.ts` dates and adds them. Random streams are `breakthrough`, `combat` and `world`, each seeded from the life's seed and its name; a migrated save's life seed is its glass seed, and its breakthrough stream carries on from the old single state. *Planning after P1.3: P1.4 replaces the seclusion plan and slot flags with the day wheel and an active method per ladder.*
- **The day, methods, rarity and fighting up** (Jan's call, 2026-10-11, planning after P1.3). The share sliders felt like a spreadsheet, so seclusion becomes a wheel of twelve double-hours with element hours, dawn's purple qi, sleep at Qi Condensation and named routines. Your own crafts and jobs take hours, and automation frees them. Every ladder needs a method; nobody starts with a body or soul method. A method's tier caps it at that realm's peak. Insight comes from everything. Techniques and methods have lines and chapters: a technique's next chapter starts one mastery level down, two at a higher rarity. Kinship between lines speeds practice. One rarity scale covers methods, items, techniques, talents and roots, as a fraction of a realm (gap^f, gold and red at 0.75 and 0.9). Weapons count at half exponent, and a weapon above your realm takes a penalty that heirlooms and bonds cut. NPCs have a pedigree. The fighting-up ledger is the fight sim's target table. Trees grow to 25–30 nodes a tier, and capstones open the next tier. Organizations share one skeleton, settled in D5. All of it is written into design.md; P1.4 and P1.5 build the M1 part, and D2, P2.2 and D5 pick up the rest.

## Log

Newest first. 3–5 lines per phase.

- 2026-10-11, planning after P1.3: reworked seclusion and power. design.md gains the twelve double-hours (element hours, sleep, routines; your own crafts and jobs take hours), a method on every ladder with tier caps and tier × rarity speed, insight from everything, lines, chapters and kinship, a new § Tier, rarity and pedigree (one rarity scale as a fraction of a realm, weapons at half exponent, weapons above your realm, NPC pedigree and rising baselines), the fighting-up ledger under § Combat, the new tree shape (25–30 nodes a tier, capstones gated by branch ends and opening the next tier), the canvas Trees screen, a rarity palette, and the organization skeleton with eleven types under § Professions, people and powers.
  - Phases renumbered: new P1.4 (the day wheel, methods and insight) and P1.5 (the trees, redrawn) come before character creation, now P1.6, and polish, now P1.7. Older Log lines that say P1.4 or P1.5 mean P1.6 and P1.7. D2, P2.2 and M5's outline now carry rarity, pedigree, the ledger and the organization skeleton.
  - The P1.3 tree nodes need no review now, since P1.5 redraws them; the six first techniques still await review.

- 2026-10-11, P1.3: trees, techniques and mastery. `content/trees/` holds the tree format and the Qi, Body and Soul trees, tiers 1 and 2 at 10 nodes each, with effects as stats from `content/stats.ts`. `core/trees.ts` learns nodes with insight and seals any node above its tree's ladder, and `core/stats.ts` totals the unsealed ones; qi, tempering, nourishment, insight and practice gains, stone fuel, minor and major odds, failure loss, setback time, lifespan and Aptitude feed the rules now. `content/techniques.ts` has the mastery ladder and the six first techniques, and `core/techniques.ts` practices them. The Trees screen is a pannable graph in nine tier bands, drag or swipe to pan, opening centred on the starters; the Techniques screen shows mastery and picks what practice days go to. Both were checked at desktop and 375 px with no page sideways scroll. **Awaiting review:** the 60 nodes and 6 techniques (Open questions).
  - The refactor: `state.player` is a `Cultivator` (id `player`), the rules in `core/cultivation.ts` take a Cultivator, a day and a random stream and return notes, and `core/life.ts` runs them for the game (`cultivate`, `breakThrough`, `attemptLastChance`, `endLife`, `learn`, `gainTechnique`, `practice`). The random state is named streams (`withStream`). Save v3 migrates v2 (fixture `v2.json`). ESLint now bans `Math.random`, `Date.now`, `performance.now` and argument-less `new Date()`/`Date()` in `src/core`.
  - For P1.4: hand out the origin's first technique with `gainTechnique(s, firstTechnique('cave-orphan/along')!.id, 'is taught')` at minute 20–35, and drop `PLACEHOLDER_TECHNIQUE` from `startLife`, `beginNextLife` and the v3 migration's intent. The practice slot opens on the next tick. The pacing sim now gives the technique at layer 2 to stand in for that.
  - `npm run sim -- pacing`: practice taking 5% from layer 2 moves a true root's layer 9 from 16.7 h to 17.4 h, still inside the target. Buying the cheapest node whenever insight allows brings it to 16.0 h with 24 nodes by layer 9 (heavenly 8.0 h → 7.4 h, mixed 27.8 h → 25.0 h). Layer 3 stays at 42–43 minutes for every root.

- 2026-10-11, planning after P1.2: P1.2's core has no stray randomness or clock reads, and IndexedDB sits only in `core/save/slots.ts`, but the rules take the whole game state, there is one random stream, and the chronicle is text. P1.3 now extracts a `Cultivator`, splits the random streams and adds the lint rules; P1.4 makes the chronicle typed events; P2.1 takes multi-actor turns. Multiplayer is decided: friends as NPCs and co-op sessions after v1, no shared world.
- 2026-10-11, P1.2: the shell wears black cracked glass: tokens in `theme.css` (`--accent`, `--crack` and the rest, every color a variable for P1.5), glass panels, and `GlassBackground` drawing `ui/glass.ts`'s seeded cracks on a fixed canvas, redrawn on resize, flaring and adding a fracture at breakthroughs. Checked at 1024 px and 375 px with no sideways scroll.
  - Content: `realms.ts` now carries gates, the realm curve (`realmScale`: 1, 9, 270, 27,000), insight thresholds and rates, bar sizes and odds; `roots.ts` the six roots; `methods.ts` the six common origin methods with fit as data; `cultivation.ts` every tuning constant, the default plan, auto settings, grades and when each slot opens (body and study at layer 2, soul halfway through it, practice in P1.3).
  - `core/cultivation.ts`: `cultivate` is the `DayStep`; `dayRates`, `minorOdds`, `majorCheck` (requirements, margin score, grade, odds), `attemptBreakthrough`, `lastChance`/`attemptLastChance`, `endLife`; `state.nextLife` starts the next life in the slot. Save v2 adds root, method, attributes, items, plan, glass, ended and ladder grades and setbacks, with a v1 migration. The store saves a rewind point at each breakthrough. Cultivate screen: share sliders with per-day rates, the auto setting, stone burning, and per-ladder breakthrough panels with odds, requirements and the grade as it stands.
  - For P1.3: open the practice slot with the first technique (`seclusion-practice` flag; the share is already in the plan). For P1.4: set `character.root`, `method`, `attributes` at creation and hand the Foundation Pill over at layer 9 (`addItem(s, 'foundation-pill', 1)`); `startLife` and `beginNextLife` still make "Nameless". `.claude/launch.json` gained `dev-alt` on port 5174 for when another session holds 5173.
  - `npm run sim -- pacing` (median of 25 seeds; real hours from the start of a life):

```
Default plan, safe breakthroughs, no stones
root            L2      L3      L4      L5      L6      L7      L8      L9  Found.  age@L9 insight@L9
mixed           9m     42m    1.6h    4.1h    7.7h   12.3h   18.4h   26.4h   36.4h    38.5       1474
true            9m     42m    1.6h    3.1h    5.3h    8.1h   11.7h   16.7h   22.6h    28.7        930
single          9m     42m    1.6h    2.6h    4.0h    5.9h    8.4h   11.6h   15.3h    23.6        642
mutated         9m     42m    1.6h    2.9h    4.7h    7.0h   10.1h   14.1h   19.3h    26.1        781
heavenly        9m     42m    1.6h    2.2h    3.1h    4.2h    5.7h    7.6h   10.1h    19.6        420
chaos           9m     42m    1.6h    2.1h    2.9h    3.8h    5.0h    6.6h    9.0h    18.6        364
Qi only: true root at L9 in 10.5h, heavenly 4.9h; Foundation waits on insight until 27.8h for every root.
```

- 2026-10-11, P1.1 fix: React's strict mode ran the store's start twice, and the second run found the first run's lock and showed the take-over notice over a running game. \`init\` now runs once, slot changes run one at a time through \`serial\`, a busy lock is retried three times over about a second (a reloading tab can hold it briefly), and a dev hot update of \`store.ts\` reloads the page. Checked: three reloads with no notice, and a second tab still gets it.

- 2026-10-11, planning: the look moves from slate to black cracked glass (gold accent, qi-cyan crack light, a reference mockup in `docs/mockups/`), built at the start of P1.2, with player color options and a slower-clock picker in P1.5. Idle play never needs the AI: steward's reports, rumors and headlines are templates the Scribe may rewrite, and the heart demon gets a templated fallback. Combat effects come from outcome tags (tags in D2, effects in P2.3). The fog of war has four states (seen, sketched, rumored, unknown); D3 settles what reveals what. Art is made at design time; D5 adds a cast list for portraits.

- 2026-10-11, P1.1: `src/core/state.ts` holds the life as one Zod-checked object: character (pronouns, ironman or gentle), a calendar of world days, the qi, body and soul ladders (realm, stage, bar), insight current and ever earned, stones in low-grade units, the chronicle, unlock flags, the rewind charge and the RNG state. `realms.ts` gained stages and lifespans.
  - `src/core/loop.ts`: `advance` turns real ms into days at lifespan ÷ 120 years per real hour, one day or less per step, through a `DayStep` hook that P1.2 fills with cultivation (it gets an `offline` flag). Time stops at the lifespan edge, online and off. `catchUp` applies offline time capped at 12 hours.
  - `src/core/save/`: a versioned envelope with migrations (a v0 fixture migrates), gzip export and import (plain JSON also imports), and `SaveSlots` on Dexie: three slots with current, backup, rewind point and last export date. A damaged save loads the backup with a warning and never rotates into it. `writeNow` queues a raw IndexedDB put and commits it on `pagehide`: Dexie's own put never landed before a reload.
  - `src/ui/store.ts` is the Zustand bridge: the 4-tick-a-second loop, autosave every 30 s and on hide, Web Locks per slot with a take-over notice (checked in two tabs), `navigator.storage.persist()`, and `saveNow({ rewindPoint: true })` for P1.2 to call at each breakthrough, after `noteBreakthrough` refills the gentle charge on a major one. Settings lists the slots with play, new life, export (last export date, flagged after a week), import, rewind and erase.
  - For P1.2: plug cultivation into `advance`'s `step`. Until P1.4, a new life is "Nameless" at age 12. Abode shows the ladders as text and age against lifespan; the bars need P1.2's step sizes.

- 2026-10-11, planning: one realm curve (about 9x into Foundation, 30x into Core Formation, 100x from Nascent Soul up) now drives power, qi needs, income, prices and item power. The money grades shifted down a realm at the top, and realm pressure pins at one realm from Nascent Soul up.
- 2026-10-11, planning: realm gaps now escalate, about 9x power into Foundation, 30x into Core Formation and 100x from Nascent Soul up (design § Combat). Planning sessions between phases are now a recognised kind of session: docs and atlas only, committed as design: <summary>.
- 2026-10-11, P0.3: `src/ai/openrouter.ts` streams over fetch and server-sent events in Node and the browser. It sends `reasoning: { enabled: false }` and `usage.include` by default, returns text, usage, cost, host and time to first token, and has a `CostMeter`. `src/ai/mock.ts` provides `mockProvider` and `sseResponse`. `src/ai/schemas.ts` holds the interpreter's action schema and the narrator's tail, each as Zod and as JSON Schema. `src/ai/prompts.ts` drafts the cached prefix, about 1,900 tokens of rules, world bible, a region brief built from atlas entries and the voice. `npm run spike` (`sim/spike.ts`, steps selectable, `--tag=` for reruns) wrote `docs/spike/` and `docs/spike-report.md`.
  - **Go.** Thinking is off only when asked (GLM 5.2 thinks by default). Caching bills at the listed rates. Interpreter JSON was 37/40 valid, then 39/40 once the prompt was tightened. Narrator tails went from 31/40 to 40/40, and the tail as its own structured call was 40/40. Medians: first token about 0.5 s, typed turn about 2 s. Total spend $0.26.
  - Neither host softened any of the 80 dark scenes. The drift that did show runs harsher: invented losses, and gendered guesses because the sheet had no pronouns. Morph corrupted 4 tails in run 1 and none afterwards.
  - Design § How GLM fits in and § What the AI will cost now carry the measured settings: hosts, every Zod limit mirrored in the JSON schema, the tail retry, pronouns on the sheet, and outcomes that list what the player keeps.
  - For P3.2: reuse `streamChat`, the schemas and the prompt drafts. Per-scene id enums in the interpreter schema would stop invented ids. A typed turn is slower than a clicked one because the interpreter's whole reply comes before the narrator's first token. The OpenRouter key in `.env.local` expires 2026-10-13.

- 2026-10-11, P0.2: `src/content/atlas/schema.ts` holds strict Zod schemas for source entries (unknown fields fail) and for the generated file, plus `parseTop`. `src/content/realms.ts` lists the nine realms with kebab ids (`core-formation`) for P1.2 to extend. `npm run atlas:build` validates the source, including duplicate ids, missing parents and parent loops, and writes `src/content/generated/atlas.json` (about 1.1 MB, one entry or shape per line, byte-identical on rerun).
  - Shapes are keyed by entry id: 348 `area` (6 coasts, 69 region cells clipped with `polygon-clipping`, 206 kingdoms and 67 forbidden lands), 18 `circle` (17 sea zones and the Scar) and 1 `annulus` (the Rim). Rings are open and rounded to 10 li. Line paths stay inside each entry's `map`.
  - Every `top` parses. For the canon pass, 63 entries have no realm (landmark 37, race 7, era 5, forbidden 5, cosmos 4, event 3, sea 1, route 1), and 15 are `unknown` (forbidden 11, landmark 1, sea 1, realm 1, power 1).
  - The tests read the generated file with `fs` and check it with Zod. Game code should do the same, or fetch it, rather than `import` it, since TypeScript would infer a type for 1 MB of JSON. P0.2 ran in the same session as P0.1, at Jan's request.

- 2026-10-11, P0.1: scaffolded Vite 8, React 19 and TypeScript 6 (strict, plus `noUncheckedIndexedAccess`) with zustand, zod and dexie; vitest, ESLint 10, Prettier, tsx and d3 for development. One `tsconfig.json`; `build` runs `tsc --noEmit` then `vite build` with `base: './'` for Pages.
  - `eslint.config.js` blocks React and any `ui` or `ai` path in `src/core` and `src/content` (regex patterns, so relative paths are caught), and blocks `fetch`, XHR, WebSocket and EventSource in `src/core`. A planted probe file proved it. `src/content` may import `src/core`.
  - `src/core/rng.ts` has `mulberry32`, `hashSeed` (the atlas's FNV-1a) and an `Rng` class whose whole state is one integer, so saves can store `rng.state` and resume. The tests check it against `tools/atlas-geo.cjs` itself, which loads d3, so a cold test run takes about 10 seconds.
  - The shell in `src/ui` has the menu (from `screens.ts`, Abode only), the main area and the context panel in the design's tokens. Below 900px a top bar opens the menu as a drawer and the context panel as a bottom sheet, and Escape or the scrim closes them.
  - `npm run sim -- <name>` runs `sim/<name>.ts`. `atlas:build` is a placeholder that exits 1 until P0.2 replaces `tools/atlas-build.ts`. `.claude/launch.json` has `dev` and `atlas` preview entries.

- 2026-10-11, going local: the local files are now the source of truth, and the claude.ai doc and atlas are frozen. `tools/atlas-serve.cjs` and `tools/atlas/index.html` run the atlas map locally against `entries.json`. Every remaining atlas audit item was fixed there: name-replacement damage, names, prices, travel, geography, dates, 20 kingdoms nudged inside their regions, strait radii and tags (docs/atlas-audit.md).
- 2026-10-11, audit: swapped P1.3 and P1.4 so trees and techniques exist before the first hour is tested. Filled the plan's gaps: a methods file, the Character and Chronicle screens, gentle mode at creation, event cards for the refusals and the M1 Foundation Pill, a default seclusion plan for the pacing sim, spike checks for the narrator's JSON tail and caching, a Pages deploy, and Before-the-session steps. The design doc was edited online (revision 160) and re-exported: Saber ships in v1, body and soul climb parallel ladders, eleven damage types, saves move to IndexedDB, and the price yardstick and stones-as-fuel rule were fixed. The same day Jan settled the breakthrough rules and the combat ladder (Open questions), the offline cap (12 hours), the gentle rewind, failed and last-chance breakthroughs, seven talent grades from gray to red, and three D2 rules: a Dao tier is held at half its nodes, attributes start at 10 and talents move them by grade, and HP and the qi pool climb the combat ladder. The atlas got the strait, `top`, sphere and March fixes (docs/atlas-audit.md).
- 2026-10-11, planning: design settled through M1 on claude.ai. The start corner is the Border Wilds, the atlas review is done, and design.md and the atlas were exported here.
