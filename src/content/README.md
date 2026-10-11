# src/content

Game content as data: realms, trees and nodes, techniques, recipes, items, talents, regions, factions. Never imports React, `src/ui` or `src/ai` (lint enforces it).

- `atlas/schema.ts`: Zod schemas for the atlas source and the generated file, and `parseTop`.
- `generated/atlas.json`: written by `npm run atlas:build`, never by hand. Rerun it after any atlas edit and commit the result.
- `realms.ts`: the nine realms with stages, lifespans, gates, insight thresholds, bar sizes, odds and the realm curve (`realmScale`).
- `roots.ts`: spirit roots with odds, grade and qi speed.
- `methods.ts`: cultivation methods and how well each fits each kind of root.
- `cultivation.ts`: the seclusion and breakthrough constants that `sim/pacing.ts` tunes, the default plan, the auto settings, grades and when each seclusion slot opens.
- `stats.ts`: every stat a node, talent or item can move, with its unit and, for stats no rule reads yet, the system that will (`arrives`).
- `trees/`: the tree format (`schema.ts`: nine tiers, a starter and a capstone per tier, nodes on a 5 × 4 grid per tier band) and the Qi, Body and Soul trees, tiers 1 and 2. A tier is held at half its nodes, and a tier's starter needs the tier below held.
- `techniques.ts`: mastery levels and the techniques, starting with each origin path's first one (`firstFor: origin/choice`).
