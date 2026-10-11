# src/content

Game content as data: realms, trees and nodes, techniques, recipes, items, talents, regions, factions. Never imports React, `src/ui` or `src/ai` (lint enforces it).

- `atlas/schema.ts`: Zod schemas for the atlas source and the generated file, and `parseTop`.
- `generated/atlas.json`: written by `npm run atlas:build`, never by hand. Rerun it after any atlas edit and commit the result.
- `realms.ts`: the nine realms with stages, lifespans, gates, insight thresholds, bar sizes, odds and the realm curve (`realmScale`).
- `roots.ts`: spirit roots with odds, grade and qi speed.
- `methods.ts`: cultivation methods and how well each fits each kind of root.
- `cultivation.ts`: the seclusion and breakthrough constants that `sim/pacing.ts` tunes, the default plan, the auto settings, grades and when each seclusion slot opens.
