# src/content

Game content as data: realms, trees and nodes, techniques, recipes, items, talents, regions, factions. Never imports React, `src/ui` or `src/ai` (lint enforces it).

- `atlas/schema.ts`: Zod schemas for the atlas source and the generated file, and `parseTop`.
- `generated/atlas.json`: written by `npm run atlas:build`, never by hand. Rerun it after any atlas edit and commit the result.
- `realms.ts`: the nine realms with stages, lifespans, gates, insight thresholds, bar sizes, odds, the realm curve (`realmScale`) and the gap out of each realm (`realmGap`, `tierGap`).
- `rarity.ts`: the seven rarities from gray to red, with their exponents (`rarityMultiplier`), check bonuses, property counts, prices, the roll table and what a method of each adds at a breakthrough.
- `roots.ts`: spirit roots with odds, grade, qi speed, and how many elements each kind holds, with a default list until P1.7 rolls them.
- `elements.ts`: the five phases and the three mutated elements; lightning and wind count as wood, ice as water.
- `hours.ts`: the twelve double-hours with their elements, the kinds of hour, the element, dawn and discipline bonuses, sleep at 子 and 丑, and when each kind of hour opens.
- `routines.ts`: routines learned from teachers, manuals and sects, each a whole wheel.
- `methods.ts`: methods for each ladder (cultivation methods, tempering and nourishing arts), each a bundle of tier, rarity, line and chapter, fit, requirements, upkeep, growth profile, properties and source, and what each ladder's growth builds (`GROWTH_STATS`).
- `mastery.ts`: the mastery levels, the practice days and insight bursts for techniques and methods, a method's speed by level, and kinship.
- `contemplation.ts`: contemplation sources, lumps and trickles of insight with a supply.
- `cultivation.ts`: the seclusion and breakthrough constants that `sim/pacing.ts` tunes, the auto settings and grades.
- `stats.ts`: every stat a node, talent or item can move, with its unit and, for stats no rule reads yet, the system that will (`arrives`).
- `trees/`: the tree format (`schema.ts`: nine tiers, each a starter, 4 or 5 branches of minor and notable nodes at free positions, and a capstone that 2 or 3 gating branches unlock and that opens the next tier's starter) and the Qi, Body and Soul trees, tiers 1 and 2, 27 nodes a tier. Half a tier held is kept for the Daos' bonus.
- `techniques.ts`: the techniques with their rarity, line and chapter, starting with each origin path's first one (`firstFor: origin/choice`).
