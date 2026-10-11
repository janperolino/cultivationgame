# Cultivation idle game

A xianxia cultivation idle game with an AI-narrated "go in" mode (GLM 5.2 through OpenRouter). Web: TypeScript, React, Vite. Built by Jan, for Jan and friends; there is no backend.

## Where things are

- `plan.md`: the build split into one-session phases, with Status, Open questions and a Log.
- `docs/design.md`: the rules, and their source of truth. Read only the sections your phase lists.
- `content/atlas/entries.json`: the world, Severed Heaven, one entry per place, power, era and race, and its source of truth. `content/atlas/README.md` explains the fields, `tools/atlas-geo.cjs` computes the outlines, and `node tools/atlas-serve.cjs` serves the map viewer and editor at http://localhost:4321.

## Rules

- `src/core` never imports React or calls the network, so the same code runs in tests and in the Node sims.
- Edit the local files. The claude.ai design doc and atlas they came from are frozen archives since 2026-10-11.
- Content is data: a new pill, node, beast or region is an entry, not new code.
- Randomness is seeded (mulberry32) and runs in named streams, one per system, so a seed replays the same fight and a new system never shifts another's rolls.
- Never assume one player: the rules take a cultivator, and actions name who acts.
- Browser storage (IndexedDB and localStorage) is touched only by the save layer and settings, so a desktop or mobile wrapper can swap it.
- Saves carry a version number and migrations.
- Never commit API keys. The OpenRouter key lives in `.env.local` or the browser.
- Place and sect names are English first (Clear Heaven Sword Sect), with pinyin and hanzi underneath as flavor. People keep pinyin names (Elder Mo).
- Jan works on Windows, so npm scripts must also run in PowerShell.
- Keep `npm test`, `npm run lint` and `npm run build` passing at the end of every phase.

## Each session

Do one phase from `plan.md`. Then tick it, add a Log entry and commit. Don't start the next phase in the same session.

A planning session, with no phase named, edits only the docs and the atlas, never code, and commits on its own as `design: <summary>`.
