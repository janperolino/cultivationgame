# Code review, 2026-10-18

A full pass over `src/` (core, content, ui, ai, the save layer, the dev console, the tests), `sim/` and `tools/`, against `docs/design.md` as it stands after the 2026-10-18 cleanup. Nine reviewers read it in slices: five checked design.md section by section against the code; four looked for bugs, speed, code that contradicts other code, and dead code. Every item below was checked by reading the code, and the numbers were measured unless marked otherwise.

The small, safe fixes are in the same commit as this file (first list). Everything after that waits for Jan: design disagreements with the side I think is right, bugs that need a call, and speed proposals with their expected gain.

## Fixed in this commit

**What Jan asked for**
- Offerings lose the clash: `CLASH_ROLL`, the clash in the major roll, `Offerings.clash`, `OfferEffect.surging` and the Breakthrough panel's warning are gone. The test now checks that two surging items simply add up, and plan.md's Open question is ticked off.
- Design citations that pointed at cut headings now point at live ones: "A manual's own tree" and the crown's "Where manuals live" at UI and screens, Manuals on the trees; "The placement pass" at Cultivation, Every tree has the same shape; and `D2.2` at Where manuals live. A sweep found no other dead `design §` heading.

**Bugs**
- A finished caravan left you on its wagon (20 li a double-hour, jostled) and its unpaid Caravan guard routine (roads only) until you changed them by hand. Arriving or walking off now drops a group's own way and routine (`core/map/travel.ts`, `alone`).
- A written price ignored the item's tier, so a Foundation beast core sold for Qi Condensation money (5 instead of 45). A variant now scales from the tier it was written at (`core/prices.ts`).
- A pristine beast bloodline made a part id that doesn't exist (`beast-core~pristine~t2`), which threw on `item()`. A part's rarity is now held to its written range (`core/loot.ts`, `kitOf`).
- A queued copy you then learned another way (a senior, a card) stayed at the head of the queue forever, so no later copy joined by itself and the 'copy' first passed early. The queue now drops known copies (`core/reading.ts`).
- An ambush from hiding fought zero turns ("the fight ends after 0 turns: them stands"), and threw if neither side was present. The two who start the fight now fight from hiding and are in the open after (`core/resolver/scene.ts`).
- Stones burned near the qi cap paid a full day's burn while the cap cut the qi, losing up to a day of stones. Only what fits under the cap burns now (`core/cultivation.ts`).
- A sect shop bought from non-members (only `buy` checked membership); `sell` checks it now (`core/shops.ts`). `repair` now refuses a piece you neither hold nor wear.
- `receive()` didn't round as `pay()` does, so four sales of tenths could show 0 stones for 1 (`core/purse.ts`).
- Migration 20 pushed into the raw save's arrays, so a v20 slot checked twice in a session doubled its ties and memories (`core/save/format.ts`).
- The route's deepest-ground sample could skip the destination (`maxBand`); a rumored area's ring was centred on its outline's first vertex, not its centroid; `roadHour` overwrote every RNG stream with the pre-encounter copy (latent, but it breaks the named-streams rule the day `arrive` rolls one); and seeded sorts used `localeCompare`, which depends on the machine's locale.
- Narrator: a tail cut off by `max_tokens` left "```json" in the prose; the strict JSON schemas lacked the `minLength` and `maxLength` Zod enforces; the SSE reader dropped a last `data:` line with no newline (usually the usage chunk) and never cancelled the reader; the interpreter's example id was `ember_palm` where real ids are kebab-case.
- UI: the Map's fog cache was keyed by region id, so two lives on one region could share a fog (now keyed by the map object); Chronicle had its own `reducedMotion()` that ignored the player's Motion setting; `formatNumber(1e15)` read "1000000.0B" (now T, Qa, then exponent); the dev console's `item` took unknown ids and NaN counts.

**Speed**
- `stats()` built a long string key on every call, several times a day-step; an identity memo in front skips it. With `effectiveWheel` reading the realm once instead of twelve times, `capstoneOf` memoized, and the catch-up loop dropping float-dust steps, the pacing sim went from 42–52 s to about 17 s with identical output (measured on a copy).
- `inRing` checks a cached bounding box first and `inMulti` stops allocating `slice(1)`: a 313-day cross-region trip went from about 0.75–1 s to about 0.3–0.45 s, and `planRoute` from 1.5 to 0.7 ms, bit-identical.
- The Map pan and wheel now call `markMoving()`, so the weather and glows pause while the map moves (checked in the browser); the Map redraws when a web font lands; the App shell no longer re-renders on every tick (it subscribed to the whole game for `unlocks`); qiCanvas reads `--accent` once instead of a style read every frame; `rollBiased` caches its table by bias.
- `TIER_PRICE` was a second copy of the realm curve that clamped at tier 5; prices now read `realmScale` (the same numbers for tiers 1 to 5).

**Dead code removed** (nothing referenced it, tests included): nine content exports (`mortalKind`, `memoryRow`, `capabilityInfo`, `LASTING_KINDS`, `GUARD_LADDER`, `hasNode`, `branchOf`, `EVENT_TYPES`, `SETBACK_TYPES`), sixteen core ones (`defaultedSince`, `eventsOf`, `bySeason`, `currentGrade`, `marginScore`, `firstDone`, `isMortalGood`, `faceValue`, `sizedAt`, `canForce`, `regionHere`, `heardOf`, `memberOf`, `giftValue`, `inspect`, `liLeft`) and five UI ones (`AgeBar`, `isPainted`, `sealWords`, `NodeEffects`, `bandSize`). Stale comments fixed: body and soul "need no gate" (they have gates), the toasts and beacons' phone layout, a pristine note in `rollBiased`.

## Design disagreements, for Jan

Ranked by how much a player would feel it. "Doc" means design.md should change, "Code" means the code should.

**High**
1. **Offline majors bank overfill for free** (Cultivation, Breakthroughs: "the bar holds at full"). Every ladder fills to 150% offline, so a major waiting while you're away banks the full +35 points of overfill odds and the grade's qi margin. The coming-back card also only announces a ready qi major, never body or soul. *Code*, if "holds at full" is the rule; *doc* if banking overfill is meant. **Settled (Jan): 150% is right.** design.md now says the bar fills on to 150% and waits, and the coming-back card names every ready ladder.
2. **Heat never raises the road's notice** (The road's encounters: ×(1 + heat/6)). It reads heat under the player's id, but heat is only ever stored under a place or power, so the factor is always ×1. *Code*: read the heat of the region or place you're in. **Done (Jan's go):** the road reads the hotter of the region's heat and the heat of the land you stand in.
3. **Villages count as towns for sleep and notice.** Written villages are `kind: 'town', sub: 'village'`, and `sleepPlace` and the sheltered test check `kind`. So a camp within 250 li of a village reads "at an inn · 20 taels" and fills no notice, where the doc gives a village a 5-tael barn bed. *Code* should test `sub`; the barn bed needs writing. **Settled (Jan): fixed.** One rule (`bedAt`) now gives a town or city its 20-tael inn and a village its 5-tael barn, each a bed indoors that fills no notice.
4. **Money is low-grade only** (Economy: "Qi hours burn the grade your realm uses"). Stone burning, wages, recruits, method upkeep, tolls and card costs all read `c.stones`; only shops use the purse across grades. Doc is the intent; this is the economy layer's to build, so it belongs in its design session. **Settled (Jan): yes**, parked in plan.md's Open questions for the economy's design session.

**Medium**

5. **An extra odds source on majors nobody wrote down.** `MAJOR_ODDS_PER_MARGIN` adds 8 points of odds per insight and other-ladder margin point, up to +24, since P1.2. The doc and the archive say margin feeds the grade, not the odds. Document it or drop it. **Done (Jan's go): kept and written into design.md** beside the grade margin.
6. **Method tier-above bonus** (Methods): the doc says ×3 / ×5.5 / ×10; the code uses the step out of your realm (×3.1, ×4.6, ×6.7, ×10), which is what Tier, rarity and pedigree says. *Doc*.
7. **Method growth totals** (Methods, Growth): the listed percentages (+130% gold, +280% pristine) are the pre-D2.0.1 curve; the doc's own formula on today's curve gives the code's (+147%, +670%). *Doc*, unless the old totals were meant.
8. **Pristine is common for chosen NPCs.** The literal b^step rule gives a chosen Foundation cultivator 4% pristine a roll and a chosen Nascent Soul one 14%, across seven rolls, so most carry something pristine; the doc says most pristine things are placed. *Doc* needs a cap or a separate pristine rule.
9. **Realm pressure** (Scale of destruction): code pins at a flat two realms, compares top ladders rather than the soul, and has no "one realm from Nascent Soul up". Combat pins nobody. *Code*, when the AI half needs it.
10. **People checks miss two rules**: a motive against the check (×2 resistance; `MOTIVE_AGAINST` is dead) and a talent or node naming the check (leverage). Nerve never moves composure (`COMPOSURE_AXIS` unread), and there's no first impression (`FIRST_LOOK_EACH` and the `first-look` memory are unused). *Code*.
11. **Bloodlines don't give the player beast abilities**, and gold and red have no unique or named ability (`ABILITY_COUNT` is 3 from purple up). *Code* (or mark it later in the doc).
12. **Domain can't open for the player**: it needs a tier 4 capstone and the Dao trees stop at tier 2. *Doc* should say it waits on Dao tiers 3 and 4.
13. **A backer's tie is never made**, so killing a charge ripples to no one and the "tie to a backer" secret is dead. The Fortune extra drop (`fortuneDrop`) isn't called either. Probably P3.9's; *code* when scenes land.
14. **Checkpoint tolls are never charged** (the route collects them, the Map only counts them); walking off a caravan costs no guild standing though its text says "the guild remembers it" (`CARAVAN_LEAVE_STANDING` unused); late debts cost no opinion (`lateDebts` is only called in a test). *Code*, or soften the texts.
15. **"A realm above finds you first"** is drawn as a red warning (`pullsIn`) but the engine decides by Perception against Stealth, so Avoid can still go round ground the Map says can't be. *Code* should follow the band rule.
16. **Hostile ground** (powers' spheres at the bottom of standing) has no code; the doc reads as built. *Doc*, mark it later.
17. **Combat Dao tier size**: the doc says 10 to 15 at the first two tiers; all nine Daos have 14 and 18. *Doc* ("12 to 18", as the content comment says).
18. **The full-screen weather loops and blurs** (rain, snow and wind animate `background-position` over the whole viewport forever; mist uses `filter: blur(12px)`). That breaks "no looping animation on anything larger than a button". *Code* (proposal S3 below), or write the weather in as an exception.
19. **The world bible in `src/ai/prompts.ts` contradicts Scale of destruction**: "each realm about tenfold" (the doc has 9, 30, 100), Qi Condensation "thousands per region" (tens of thousands), and a two-realm aura pin. P3.8 rewrites `RULES` but not the bible. *Code*.

**Settled (Jan's picks), 6 to 19 except 14:**
- *Doc fixed:* 6 (the bonus is the step out of your realm: ×3.1, ×4.6, ×6.7, ×10), 7 (growth −20% to +666%), 12 (Domain waits on Dao tiers 3 and 4), 16 (hostile ground comes with organizations), 17 (12 to 18 nodes) and 18 (weather is the one looping exception, since it moves only by transform). Also "five hundred times" is now four hundred.
- *Code fixed:* 8 (the biased roll for NPC kits, loot and shops is held at red, so pristine is placed by hand; the birth roll keeps its 0.01%) and 19 (the world bible's scale matches the table, and its realm pressure reads your soul).
- *15, flipped on Jan's note:* Avoid already scales with your stats (their Perception, from soul, against your Stealth, from body and Agility), so the engine stays. The doc's "can't be gone round" and the Map's warnings now say "likely finds you first".
- *Noted for later:* 9, 10 and 13 in plan.md for P3.9; 11 in design.md, with taming.
- *14 done (Jan's go):* a checkpoint on your course takes 1 low-grade as you pass it (renown 3 waives it, nothing to pay and you are waved through), with a Chronicle line and the toll on the course card; a guard who walks off a caravan once it has left loses 5 standing with the merchant guild (a placeholder id until the atlas names the guild). Late debts wait for the economy.

**Low**

**Done (on Jan's "do what needs no decision"):** the attending hint and its doc phrase; five notches; the UI table's unbuilt things marked with their layers; Old Soul's lost chapter, take down and write a manual marked later; the Art host rule; deviation at 140%; regions to 90,000 li and the population table to the atlas; a black market's 30% and the cloud ship written in; yin orbs through 丑; a keeper you're friendly with buys at 60%; the bounty office's posted 50% flat; staged deaths spread by telling; divine sense sweeps with no check; Nascent Soul flight at 600; a sect or clan start holds its region's map (`map:<region>` is now read). **For Jan:** whether afraid followers turn on the Memory axis's "vengeful" or the revenge motive, and whether the body and soul arts get a first each (one tutorial step today). **Later, with their phases:** core disciples' talismans, the group's best talker and a talk that fell short (P3.9), the deck and roots (P3.12).

- The attending hint says qi runs faster "while Cultivate is open" and focus "fades once you leave"; attending counts on any screen and focus drains steadily. Fix the hint and the doc's phrase.
- People notches: the doc says seven, there are five trust words. *Doc*.
- The UI table describes unbuilt things as present now that "Ships in" is gone: the key and cost meter, the mature switch, Go In and Crafts screens, the abode's store and unappraised "?" items in the Bag, sect and faction groups on People, letters and Seek them out, the steward's report. *Doc*: mark them later.
- Old Soul promises a lost chapter that doesn't exist; Sword Heart, the heat cooling rate and Unknotting are stats nothing reads; yin orbs skip 丑 though the night includes it; a goal-bound recruit ignores motives (`GOAL_MOTIVES` unused); the 60% buy rate ignores the keeper's opinion; the bounty office pays 45–57% where the doc says 50% flat; the black market buys at 30%, not 40%; death talismans go to every great-sect NPC, not core disciples; the Art host rule misses Arts with no Dao; "write a manual" and "take down" read as built.
- Staged deaths: the doc says the belief spreads by telling; `knowledgeOf` filters staged deeds out, while `tell()` spreads them and the comments say it does. Pick one.
- Afraid followers turn on "vengeful": the code reads the revenge motive, the doc may mean the Memory axis. Pick one.
- Firsts for body and soul hours are one flag, so a lineage's first body hour pre-empts the first soul art's auto-flip.
- Divine sense still needs a band check to sweep; a sect or clan start doesn't add its region's map; Nascent Soul flight is capped at Core's 300 li (doc 600); a cloud ship is 250 (doc 200); a group talks at its leader's strength only partly; a talk that fell short stays spent after trust or props change.
- The seclusion deck and roots table drift from the doc (spirit tide, the White City dream, qi deviation at 140% not 150%, the Yin-Yang and Innate Sword roots unnamed). P3.12 rewrites the deck.
- Two regions exceed the 40,000–80,000 li range (88,000 and 91,000), the population table lags the atlas, and "five hundred times" is 400.
- `RULES` in `src/ai/prompts.ts:20` still tells the narrator checks are d20, with crits and natural 1s. Left for P3.8, as asked.

## Bugs that need a call

**Done (Jan's picks), the fifteen below:**
- The detour stays owed only when you set the same course again.
- The night road plans cross-country from town to town, so water never strands it.
- A hidden site reads as never under its ground's band (`siteRating`).
- One ground rule (`groundFactor`) plans the course and walks it: a trip planned at 199.2 days arrives on day 200.
- A fear follower who travels with you stays in reach; only one posted elsewhere can drift off.
- A romance ends when the word you see reads wary.
- The sect shop's screen asks for membership, as its rules do; a token still opens the gate.
- A sealed ring keeps its own tier but never seals under its owner's realm, and opens to your soul or qi, not your body.
- A pill that feeds no ladder unsettles nothing (there is no record of the last pill fed, so "the last fuel pill's ladder" became "this pill's").
- A count at nothing leaves the Bag (save v32 cleans old ones).
- The narrator's client gives up after 90 s or 30 s of silence, and retries a busy host once before any text.
- `atlas-serve` reads the body before the file, retries the swap on Windows' locks and refuses other hosts.
- `map-paint` says what's missing and what the host said.
- The unread card flags and `carries` are noted in plan.md for P3.12 and P3.9.
- **Not done, on evidence:** shop settling stayed down-then-up. Down-only left 12% of all lots empty over 24 months, and the Gate's sect shop with no stock at all for a month, since a sect shop's stock starts above most rolls. design.md now says "the nearest above when nothing is that low".

**Done (Jan's go), the first two:** a scene fight now leaves each fighter with the HP and qi it ended on (the shield refills at every fight's start, as before), and a deceitful, wary NPC claims to know nothing instead of handing over the truth marked false, until the world can write false facts (design.md says so).

- **Fights never write HP back to the scene.** `runSceneFight` copies back only down or fled, so a victor starts the next fight whole, and `looksWeak`, `projectionDue` and the hurt check can only fire from the `hp` effect. Copy `hp`, `qi` and `shield` back, or drop the readers.
- **A deceitful NPC's "lie" is the truth flagged false**: `knows.ts` returns the true common facts with `lie: true`, so visiting the place records a lie against someone who told the truth (−25, Honesty revealed). A lie needs false facts.
- **The go-round detour carries to a new course**, but resetting it in `setCourse` would let you dodge it by re-setting the same course. Decide which.
- **A fear follower can break while travelling with you**: `bond.seen` only refreshes in scenes, so over a week on the road with no scene counts as out of reach.
- **`FORMER_LOVER_BELOW = -9`** tests the raw total while the trust word rounds: −9.4 reads "neutral" and still ends a romance.
- **The sealed ring's tier is hard-coded to 2**, so a Core elder's ring would open for a Foundation player (no such elder in the roster yet).
- **The night road is one straight line**: any sea on it says "no way over land" though a land route exists.
- **Hidden-site ratings** ignore depth rings and each area's density: on seed 'x', 18 of 30 hidden sites rate below their ground's band.
- **Planning and moving disagree** on sea (0 against 0.5) and on cross-country legs near a road, so ETAs run long.
- **A restore pill that tips toxicity to 100 unsettles qi**, though it fed no ladder.
- **Shop rarity settling** can return a rarity above the roll when nothing at or below exists.
- **`addItem` leaves zero counts forever**; the Bag's order is "first ever held".
- **The UI gates sect shops on a token, core on membership**, so a token without a membership row sees the shop and fails every purchase.
- **`atlas-serve`**: loads before reading the body (two quick saves lose one), `renameSync` can hit EPERM on Windows, no Host check.
- **Three card flags are set and never read** (`kind-to-thief`, `ning-runs-errands`, `saw-the-crate`), and six roster templates `carry` strings no code reads.
- **`openrouter.ts`**: no timeout, stall detection or retry on 429/502/503.
- **`tools/map-paint.ts`** reads `.env.local` at import (bare ENOENT) and parses JSON before checking `res.ok`.

## Speed proposals, for Jan to pick

**Done (Jan's go): S1, S2, S3, S4, S7 and most of S8 and S9.**
- S3: rain, snow and wind move by `transform` on layers a tile larger than the glass, the mist lost its blur, and the "new" glows are opacity-only rings like the jewels'.
- S2: the Trees world compares a signature of what it draws (each node's state, seal and price, each jewel's pips, each band's line) instead of the player object. Checked in the browser: no DOM change over three seconds of ticks, and buying a node still redraws it.
- S4: the rim light fills a margin past the figure with no blur.
- S1: a long time away catches up in slices of 1,000 day steps behind "Opening your abode…", the page drawing between them (`catchUpInSlices`; a test holds it to one call's result). It covers opening a slot, a laptop waking and the dev console's `away`.
- S8: the game loads `atlas-index.json`, 150 KB written by `atlas:build`, rather than the 1.37 MB atlas, and a test keeps it in step. The eight screens past Cultivate and Routine load lazily and are fetched once the page is idle. At start that is about 1.36 MB of script rather than 2.8 MB.
- S9: only the page's last write on unload trusts a save this tab wrote or checked. The regular autosave keeps its check, since `makeSave` validates nothing and that check is what keeps a broken save out of the backup.
- S7: a first-hour seed stops once every mark is set. The sim took 86 s, against 225 s before this review.
- S5 in part: map chunks and paintings draw only once decoded off the main thread, and the paintings are fetched at idle. The land's brightness lift stays as is, since baking it in changes the look.
- S6: the People web lays itself out once a day or a change, never on a tick or a pan frame.
- S10 in part: `seeFrom` skips what is seen, `roadHours` reads the realm once, `realmScale` and `realmSize` are tables, the place index builds its child lists in one pass, and a course with no road hours is refused before routing.
- Left: the land lift, the encounter card's memo, `chooseAction`'s double pricing, the deeds index and archiving old lives' chronicles.

Ranked by what you'd feel.

- **S1. Offline catch-up at high realms freezes the page.** 12 offline hours are 10% of a lifespan: 0.4 s at Qi Condensation, 1.6 s at Core, 2.3 s at Nascent Soul, 14.7 s at Mahayana, all on the main thread (about 40% less after this commit's fixes). Step in chunks of `days/2000` past 2,000 days, or yield between chunks behind the loading line. Gain: bounded at 1–2 s.
- **S2. Trees re-render every node four times a second.** `FanWorld`'s memo is defeated by the player object changing each tick and a fresh `Set` for `fresh`; with two store subscriptions per node, about 300 elements reconcile at 4 Hz. A comparator over what nodes read, and `fresh` memoized by its ids. Also put `will-change: transform` on `.tree-world` while panning only. Gain: Trees' pan and idle cost.
- **S3. Weather and glows repaint the page.** Rain, snow and wind animate `background-position` on a full-viewport layer forever; `.is-new` animates `filter: drop-shadow` on list rows; pristine text animates under a filter. Move the weather to `transform` on an oversized layer, and use the jewels' opacity-only pseudo-element for the glows. Gain: no main-thread paint on weather days or in the Bag, Techniques and Bookcase lists.
- **S4. A canvas blur every frame on Cultivate.** `drawRim` sets `ctx.filter = blur(...)` over a figure-sized rect each frame while the sun is up. Inflate the gradient rect instead, or bake the rim per quantized sun angle. Compare the look first.
- **S5. The Map's per-frame blits.** The land gain copies the whole canvas onto itself with 'lighter' each redraw (up to 3840×2160), and the fog adds four full blits. Bake the gain into the painting. Chunks are decoded synchronously in the first `drawImage`; `img.decode()` on load would remove pan hitches, and prefetching the painting removes the unpainted flash.
- **S6. People recomputes every person's full view on every render and every pan frame.** Memoize the layout on people, ties and the day; build full views only for the twelve shown; move pan state to a child.
- **S7. The sims.** `firsthour` runs every seed to 150 minutes after all marks are set (225 s); break once they are. `fights` takes 222 s and `pacing` 20 minutes at 25 seeds before this commit's fixes.
- **S8. The atlas on load.** The full 1.37 MB atlas is parsed right after init only to build the `PlaceIndex`, which needs 160 KB of it. Have `atlas:build` write `atlas-index.json`. The main chunk is 1.5 MB; lazy screens (Map, Chronicle, People, Trees, Settings, Combat, Bag) would cut about 250–300 KB of parse at start.
- **S9. Saves.** Every autosave fully parses the previous save to decide whether it may become the backup (30 ms at a 1.45 MB save; `writeNow` does it on unload); skip it for a record this tab wrote. `addEvent` copies the whole chronicle per event; archive older lives once a dynasty gets long.
- **S10. Smaller.** `seeFrom` re-probes areas already seen (about 10% more on travel); `chooseAction` prices every technique twice (0.40 to 0.31 ms a 1v1 fight); `EncounterCard` regenerates its NPCs on every render (up to 3 ms); `world.deeds` is never pruned and `tell` is O(D²) (15 ms at 2,000 deeds); `realmScale` and `realmSize` loop per call; fonts load from a render-blocking Google stylesheet (self-host them, which a desktop wrapper needs anyway); `vitest --fsModuleCache` saved about 15% of the suite's 20 s.

## Code against code

**Done:** one Agility rule (`agilityShare`) and `isBeyond` everywhere; `DAYS_PER_MONTH` and `DAYS_PER_YEAR` in content/calendar.ts and read by all; `ENTER_LI`, `sightAt` and `BANDS` read where they were copied; one `lotShape` (with mortal goods for shops) and ring pools shaped once; the map's `PLACE_KINDS` is `PLACE_KIND_INFO` and knows.ts' set `NAMED_PLACE_KINDS`; `useCloseOutside` in the tip and the offering picker; `rgba`, `lighten` and `smoothstep` shared. **Left:** the hashSeed RNGs (they replay; renaming them to named streams would change every seeded roll).

- The Agility factor is written twice (`content/combat.ts` and `content/resolver.ts`, both 10 and 0.05 today), and `isBeyond` three times (check, intent, followers).
- 360 days a year and 30 a month are bare literals in about eight places; `DAYS_PER_MONTH` beside `DAYS_PER_YEAR` would end that.
- `250` is `ENTER_LI` in five places; `senseReach` repeats `sightAt`; `onRoadAt` is inlined in `travelDays`; the stage-to-third formula is in two files; `firstBandOf` hard-codes what `BANDS` holds.
- `lotShape` is in loot and shops with different rules for mortal goods; `ringOf` rebuilds its pool every call.
- Three things are called `PLACE_KINDS` with different meanings (atlas schema, map places, knows.ts).
- The UI hand-writes close-on-outside-press three times beside `useCloseOutside`, and hex-to-rgba five times (two break on a 3-digit hex); `smoothstep` is in two files.
- Many core RNGs are `new Rng(hashSeed('<id>/…'))` rather than named streams. They replay, but aren't literally "one stream per system".

## Dead code still left

**Done:** the thirteen dead CSS classes, the unused `sheet-rise` and three orphaned comments; the made-up fixtures moved to `src/core/fixtures/`. The rest below waits on the phases that give it a reader.

- Content: `TECHNIQUE_FORMS` and `BEAST_FORMS` (they name the form vocabulary), `VOW_KARMA`, `DEBT_OPINION`, `FIRST_LOOK_EACH`, `COMPOSURE_AXIS`, `GOAL_MOTIVES`, `CARAVAN_LEAVE_STANDING`, `NPC_PACE` (test only): each is a rule to wire or drop (above).
- Test-only exports that look like unwired features: `lateDebts`, `leaveScene`, `projectionDue`, `payBloodPrice`, `heatWord`, `rosterActor`, `stageSize`, `damageArmor`, `fortuneDrop` and the unused `loot` stream.
- Twelve unused CSS classes (`.bar-label`, `.chronicle-season`, `.chronicle-when`, `.settings-row`, `.ladder-head`, `.tray-head`, `.stack-sheet`, `.away-opening`, `.away-more`, `.is-on-button`, `.study-book-body`, `.study-book-name`) and `.bar-age`.
- `core/madeUpLife.ts` and `madeUpManuals.ts` are dev and test fixtures living in `src/core`.
- `breathe()` in `core/attention.ts` is only used by the pacing sim now that the seat has no breathe key; keep it if the sim models a player.
