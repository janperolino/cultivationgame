# Code review, 2026-10-20

A full pass over what was built since the last review (9dcf5f6, 2026-10-18): the economy layer (E1 to E5), the organizations layer (O1 to O5, its checkpoint and fixes), C1 and C2. The scope is `git diff 9dcf5f6..main -- src sim tools`: 192 files, about 21,000 lines. The spec is plan.md's phase bullets and their Small calls, and the matching design.md sections. The Small calls are taken as decisions, not bugs.

Five reviewers read it in slices: the economy, the organizations (O1 to O3), jobs, the wheel and guarded methods (O4, O5), combat and travel (C1, C2), and a cross-cutting pass (project rules, saves, UI, dead code, tests). Each was asked what the crafts layer (K1 to K12) will build on. Every major below was checked by reading the code, and the ones marked *(run)* were reproduced with a script. The timings were measured on this machine.

Unlike last time, nothing is fixed in the commit that adds this file. Each fix waits for Jan's pick, and lands in a `review:` commit per round.

**State at review.** `npm test` passes (70 files, 1,104 tests, 21 s), `tsc --noEmit` is clean and lint is clean. Nothing in `src/core` imports React, calls the network or touches storage. No `Math.random` or `Date.now` drives an outcome. The new rolls are keyed by what they roll for (a shop and month, a spot and hour), and no two systems share a stream. Save migrations 31 to 42 are version-gated, don't mutate their input and fill missing fields. Every new required field has a migration.

## Major

Ranked by what a player would feel, then by what K1 trips on.

**Round 1, Jan's picks:**
- *1 to 3 fixed as proposed.* `gathered` and a job's `owed` are held at 0, with tests that tip a sum a hair under a whole find or stone. Without the fix, the duty test's save fails to load. Struck off is a clean parting under the oath, kept as "Struck from our rolls", with the power's copies handed back, at every type. A test strikes a Night Bridge member off: no betrayal, no leak, and the slip is gone. A kept post meets the quota without touching the balance, and the post test now checks a banked 50 stays 50.
- *4 waits for the realm gap's design session* (Jan's call), since it changes what a cast at a crowd costs. Under Open questions.
- *5 dropped on evidence.* E4 makes the ration pill from nowhere at the City on purpose (`markets.test.ts:48` pins it at 25%). The reviewer's "unbounded" doesn't hold: at 0.03 points a piece, a full Bag of 990 pills moves the City about 30 points (×2 to about ×1.35). The City shop's monthly purse caps a sale, and Pacified Fort's shelves can't fill a Bag of the pill (the haul sim, with a pill row tried and taken out, stops at "no shelf left"). So it's a fat haul, not a loop.

1. **Float dust writes saves that won't load.** *(run)*
   - Where: `core/map/gather.ts:98` keeps `gathered: dug - whole`, and `core/jobs.ts:347` keeps `owed: { stones: owed.stones - stones, … }`. Both come after `Math.floor(x + 1e-9)`, so a sum sitting just under a whole number leaves about −4e-11. The schemas say `min(0)` (`map/schema.ts:193`, `state.ts:193`).
   - Failure: on a road wheel with gather hours, 143 of 4,000 irregular steps left `gathered` negative, and 11 of 80,000 duty steps left `owed` negative. `loadSave(makeSave(s))` threw "The save failed its check" each time.
   - Why it's bad: `makeSave` doesn't validate on write, so an autosave in that window is a slot that won't open. With medium 8 below, the pagehide write can then push it into the backup.
   - Fix: `Math.max(0, …)` on both. Add a test that saves and reloads after many fractional steps of gathering and duty.

2. **Struck off a gang, society, assassins' house or beast power makes you a hunted traitor.** *(run)*
   - Where: `core/organizations.ts:1067` (`strikeOff`) calls `leavePower` and then drops `standing.slice(0, -1)` as "the parting's row". Where the preset's leaving is `hunted` (those four types, and a dynasty within 10 years), `leavePower` treats the parting as a betrayal. It adds `betrayed-us` (−30, never fading), a leak deed and a mark, so the last row isn't the parting.
   - Failure: three missed months at the Night Bridge leave `missed-quota −10`, `betrayed-us −30`, `struck-off −10`, a leak and a trace mark, and the law hall hunts you. design.md: "three strikes you off". plan.md: "struck off is a parting by the rule".
   - A struck-off member also keeps the power's guarded copies, since `strikeOff` skips `partWays` (`jobs.ts:213`), which hands them back.
   - Fix: a `{ struck: true }` option on `leavePower` that writes `struck-off` in place of the parting row, with no betrayal, leak or mark. Route it through `partWays` so the guarded copies go back.

3. **A kept post still pays the quota.** *(run)*
   - Where: `core/organizations.ts:1097-1099`. `met` is true when the post was kept (`postKeptFor`), but `addBalance(-due)` runs whenever `met && due > 0`.
   - design.md § What membership gives and asks: "A monthly quota, a post kept or contribution paid in"; Duty hours: a month with half its shifts kept "counts as the power's quota kept".
   - Failure: a conscript keeps all 30 days on the Wall and the balance still drops 10 a month (21 to 12, 34 to 25). A kept post with less than the quota in the balance wipes the balance, since `addBalance` clamps.
   - Fix: take the quota from the balance only when the post didn't meet it. Extend `jobs.test.ts:361` to check the balance.

4. **A cast at many foes isn't one action.** *(run, for the first two)*
   - Where: `core/combat/fight.ts:866-889` (`cast`) calls `attack` once per foe, and each `attack` rolls the whole judge.
   - **Backfire rolls per foe.** A qi art at toxicity 100 against 10 foes backfired 2.44 times a cast, and the caster went down in 92 of 200 casts. A 100-foe blast is near-certain suicide. design.md gives each foe "its own roll for the hit and the crit", nothing about backfire.
   - **A downed caster keeps casting.** The loop checks the foe's state, never the actor's.
   - **A foe is hit twice.** A sweep, Whirl or cleave spills from the first foe to `others(…)`, which includes the foes the cast then strikes directly. Measured with a spear art at `targets: 3`: foes 1 and 2 took the spill and then the direct hit, each with its own protective-qi check.
   - **Qi on a hit refunds per foe** (`fight.ts:1335`), so a fist blast at 10 foes refunds up to 10× and can outweigh the √N cost that "pays for the reach".
   - **The last foe sets the combo and saber momentum**: a miss on foe 10 zeroes them after 9 hits.
   - Fix, one rule: backfire rolls once before the loop (on a backfire, no foe is hit and the caster takes one self-hit). Break when the caster is down. The spill skips the foes the cast reaches. Qi on a hit pays once a cast. The combo and momentum read "any foe hit". Add tests for each, as `sweeps.test.ts` has none.
   - K11 makes it worse: the talisman volley, detonation and burning pills all go through `cast`.

5. **A basket pill from nowhere is an endless 2× haul.** *(measured by the reviewer; the code checked by reading)*
   - Where: `core/making.ts:457-470` (`outsider`) treats any good whose tag and tier fit a need as "from nowhere" (rests at 25%). It never checks that nothing here fills that need (`n.fillers === 0`).
   - Failure: the City's healing need has three fillers, yet `garrison-ration-pill` (healing, not in the City's layers) rests at 25%. It asks about 2.45 at Pacified Fort and is offered about 5.0 at the City, Corral, the Wall and Ebb. At the City a piece moves supply 0.03 points (the need's use ÷ fillers), so a Bag of pills stacking 99 sells at 2× without moving the price. Herbs do the same through the makers' `herb|1` need. `sim/haul.ts` checks staples only. design.md: "a basket good from nowhere 25%".
   - Fix: count a good as from nowhere only when the need has no filler here. Add a pill row and a herb row to the haul sim.

6. **Adding the Craft hour 艺 touches about twelve places, eight of them silent.** This is K1's first job.
   - `cultivation.ts:351-367` (`hourYields`) is an if/else chain whose last `else` is practice, so a new kind silently becomes practice. `map/travel.ts:537` (`cultivationWheel`) passes unknown kinds into it, so a craft hour on the road practises. `wheel.ts` `kindPossible` defaults to `true`, so a new kind opens for everyone. `MapScreen.tsx:901` `ROAD_COLOR` is an untyped record with a qi fallback, and already paints the gather hour qi-coloured. Only `YIELD_UNITS`, `TAB_OF` and the kind lists are compile-checked.
   - Duty's lock is special-cased, not generic. It is derived by `dutyAt` and hard-coded in `effectiveWheel`, `freeWheel`, `canSetHour`, `followedRoutine`, `openHours`, `hourYields` and DayWheel's cell, note and arc. Sleep has its own parallel lock.
   - **A bug today from the same root.** The loop cultivates `onShift(s)` (`life.ts:151`), where shift hours away from the post go back to your own kind. Nine UI sites call `dayRates(game.player, …)` with the jobs on (DayWheel, Cultivate ×2, Routine ×2, Today, SeatedFigure, ShellHeader, StudyTab), so away from your post the screens show the Duty hours yielding nothing while the loop cultivates them. The bench will repeat this.
   - Fix (before K1, here): `hourYields` as a table keyed by kind (`Record<HourKind, …>`, so a missing kind fails to compile), `ROAD_COLOR` typed the same way, and `kindPossible` with no default. One `hoursPlayed(s)` (generalizing `onShift`) gives the wheel as it is played after duty, sleep and the road. The loop and every UI rate read it. K1 then adds the bench there.

7. **The economy's seams K1 will hit first.** The purse is clean (a 200k-step fuzz never went negative, and it is shaped for tool and ingredient costs), and a batch's yield enters markets correctly through `moveSupply` and `sell`. Four seams aren't:
   - **Maker inputs are keyed by need, not by thing** (`making.ts:235-244`, `MAKER_USES`; `addUse` at `:261` splits a need across every filler). "2 Spirit Grass" can't be written as an input, nor an input at another tier.
   - **The item model is closed.** `ITEM_KINDS` feeds four exhaustive tables. `itemKind()` (`items.ts`) falls back to `'pill'` for an item with no kind, so a furnace written without one is a pill sold at Pill Street. `variant()` throws past `upTo`, so a batch lifted past its pill's written range crashes `item()`. There is no tool kind, and no street buys tools.
   - **Lot size comes from the catalogs** (`markets.ts:777`, `lotSize`). An item with no catalog line has lot size 1, so selling a 20-pill batch of a new recipe pill moves 10 to 25 points a piece and pins the market at 200% after two or three.
   - **The biggest shortage exists only as a sentence** (`making.ts:510`, `whyOf`), which K12's commissions need as data.
   - Proposed split: now, here, the two cheap ones that are bugs in waiting: `itemKind` throws on a missing kind, and `shortages(w, market, month)` is pulled out of `whyOf`, which formats its head. The rest goes into K1's *Talk through first* as written seams: inputs by thing id beside needs, a `tool` kind and its street, a recipe's output held to its item's `upTo`, and lot size from a recipe's yield.

## Medium

8. **The pagehide write can back up a save it never checked** (`core/save/slots.ts:105-108, 124-128`). `write()` adds the save it writes to `checked` without loading it, and `writeNow()` trusts what is in `checked` when choosing the backup. A broken autosave (major 1) followed by closing the tab leaves no good save. *Fix:* add to `checked` only what passed `tryLoad`.
9. **Closing the tab during catch-up loses the time away** (`ui/store.ts:289-305`). `catchUpAway` is async, and `saveNow`, the autosave and the pagehide write aren't held off while `catching`, so they write the pre-gap game with `savedAt = now`. It also has no `catch`: a throwing day step leaves the phase on "loading" forever, with ticks running underneath. *Fix:* skip saving while catching; on an error, restore `playing` and keep the pre-gap state.
10. **The black market's share is 0.1, not 0.3** (`content/shops.ts:725`). design.md: "a black market 0.3". plan.md's E5 Small calls say it was set. The Night Bridge's sea-cave market holds about 24,800 low instead of about 31,900. *Fix:* 0.3, and a test pinning the shares to the design list.
11. **The March's law hall never walks** (`core/guarded.ts:236`, `content/roster.ts:151`). `lawHallRoster` matches the roster's `power`, and the March conscript's is `great-jing`, while the post's power is `qm-anbian-fu`. Only the Gate's and the Night Bridge's halls can appear, though plan.md names the March's too. A deserting cadet is marked and hunted by no one. *Fix:* the roster entry's power to `qm-anbian-fu`, or map a kingdom to its seat in `lawHallRoster` and `powersOn`.
12. **A guest elder's hall is unusable** (`core/halls.ts:47`, `organizations.ts:898`). `hallTerms` returns member terms before it checks standing, so a guest gets the points shelf with a balance of 0, no quota and no post. Points come only from `donate` at 2 low a point, so a guest pays about twice the price. As an honored outsider before the seat, they paid ×1.25 at the open counter. A guest's leaving is also judged as a house member's (a society's guest is "hunted"). *Fix:* a guest buys at the open counter in stones, or draws a points allowance (design: "an allowance and access"), and a guest's parting is always clean.
13. **The arrival chunk counts twice** (`core/life.ts:151-175`). With a course set, the chunk cultivates on the road wheel, then `travelDays` ends the course, and `jobsDay` judges `atPost` on the end state. So the chunk's shift share is paid as kept for hours spent walking in. *Fix:* judge the post at the chunk's start, or have `travelDays` report the hours it moved.
14. **A member's private tier rides a module global** (`organizations.ts:418-422` reads `currentPlaces()`, set only by `App.tsx:154` after an async import). In the sims, in tests without `setPlaces`, or in a start that joins before the index loads (`creation.ts`, `handPost`), the private places are silently not learned. They are copied into `world.known` once, so they never update and never leave when you do. *Fix:* derive a member's knowledge in `knowledgeOf` from the membership.
15. **A leak mark can shadow a death talisman's trace** (`core/resolver/intent.ts:85-86`). `traceFor` returns the power's first trace, so a face with an older mark and a newer killing reads as a leak: they demand a fine instead of attacking. `strongestTrace` (`backers.ts:90`) can pick the mark too. *Fix:* `traceFor` skips marks, and a separate `markFor` reads them.
16. **An elder taking you as a disciple doesn't exist.** design.md: "an elder taking you as their disciple makes you a true disciple". `takeAsDisciple` (`organizations.ts:567`) is called only by tests, and the true seat comes only from realm and age (`raiseEarly`). *Fix:* wire it to the master tie when one is made (P3.9's scenes or the living world), or mark it later in design.md.
17. **The one-player rule drifts.** The day rules (`payAllowances`, `settleQuotas`, `countLeave`, `raiseEarly`, `seatsByRealm`, `jobsDay`, `onShift`, `atHome`), the actions (`takeJob`, `donate`, `takeLesson`, `buyChapter`, `liftByPaying`, `pickUp`) and every shop call (`shelf`, `buy`, `sell`, `offerFor`) read `s.player`, about 40 sites. CLAUDE.md: "the rules take a cultivator, and actions name who acts". The lower layer (`joinPower(w, who…)`, `addBalance`, the purse) does take one. The shops were already like this, so this is drift rather than a regression. *Fix:* leave it until the living world gives NPC members a month to live, and note it in Open questions. Or take `who` in the day rules now, while they are small.
18. **A seat is realm and age only** (`entrySeat`, `seatOf`, `seatsByRealm`, `raiseEarly`; `organizations.ts:256-282, 1191, 1219`). K6's guild seat "needs its grade", and today a Foundation guild member is seated inner on joining and raised by realm. `raiseEarly` and `seatsByRealm` run on every bond type. *Fix in K6:* one `seatGate(who, power, seat)` hook that all four and the pavilion read.
19. **Guarding is copies only** (`core/markets.ts:614-638`, `guardedBy`). It reads a method's `guardedBy`, or infers an owner when every line is one sect's. K1's recipe slips and K6's styles "guarded as methods are" have no field, and only `sect`-kind shops count, so a guild's or an alchemy hall's own style is common. *Fix in K1/K6:* an explicit `guardedBy` on manuals and styles, read first.
20. **A posted price is rounded in four places** (`shops.ts` `stockOf`, `shelf`, `cheapestAsk`, `hallPoints`), and `offerFor` has no way to pay a set price. K12's commission at ×1.5 would make a fifth copy, or break "no loop pays". *Fix in K12:* one `askAt(shop, thing, market)` and an `offerFor` option for a fixed price.
21. **The crowd fight's target pick** (`combat/profile.ts:108-122`, `targetOf`) divides the whole cast's damage by the chosen foe's HP, so a sweep aims at the weakest foe whoever else it reaches. *Fix:* pick the target on the single-target value, then price the cast once.

## Low

**Bugs**
- `purse.ts:109` `pay`: 2 mid can't pay 1.94 mid (`pay([0,2,0,0], 1935.9)` is null). The break gives 1,100 low and the remainder at the premium is 1,123. Any remainder of 0.917 to 1 stone is unpayable with no spare lows. *Fix:* tender the whole stone and give change.
- `markets.ts:214` `addProsperity` stores `floor(day)` with the eased offset. A second deed within a year restarts the easing, so a place hit twice a year never eases.
- `organizations.ts:817` `addGiven` only climbs, so after a few months of allowance pills the hall refuses any Qi-Gathering Pill you sell it, even one bought on the market.
- `donate` and `offerGift` take negative counts (`addItem(-n)` adds items). The dev console's `org <id> donate` with no number stores NaN in a balance and fails the save. `shop … buy <slot> abc` passes NaN. *Fix:* reject `n <= 0`, non-integers and NaN.
- `addBalance` rounds to a tenth, so a standing line under 0.05 points is free.
- The law hall's dangerous-post raid is built where you stand at the month's turn (`jobs.ts:379`), so it meets you 3,000 li down the road under the post's town's name.
- A disguised user of a guarded art adds a new leak deed on every use (`guarded.ts:115-138`), so `world.deeds` grows without bound.
- The gather RNG is keyed by spot and hour only (`gather.ts:102`), so an hour split across chunks repeats its first pick, and two cultivators at one spot find the same things.
- `followWheel` writes the routine over the hours under a shift (`wheel.ts:149`), so your own choice beneath the Duty hour is lost.
- The coming-back story tells `power` events only. A hire letting you go after seven missed days, offline, is told only in the Chronicle.
- `RoadWheel` clears its pick after a refused `setRoadHours` (`DayWheel.tsx:620`); the home wheel keeps it.
- Two piles in reach give duplicate React keys in the Map's here-list (`MapScreen.tsx:368, 851`).
- `TreeFan.tsx:446` `worldSig` gives learned and locked the same letter, so a locked-to-learned change by grant (the dev `learn`) doesn't redraw.
- A gap over 60 s between ticks sets the phase to loading and unmounts every screen (`store.ts:60, 315`), so a throttled background tab loses the open door and the Map's view.
- `DoorCounter` keeps its shop tab when the month changes the door's shops (`PlaceScreen.tsx:649`).
- `gear.ts:291` splits are never pruned when a count reaches 0, so an old split comes back on the next gain. `ground.ts:36` refreshes a whole pile's day on any drop, and an unknown id falls to the ground and can never be picked up.
- Sword Rain is spent on an art that already strikes all, or with one foe left (`fight.ts:856`). Dragon Thrust's sure hit is spent on the first foe of a cast while the preview shows it on every foe.
- Ladders collapse for about 100 rows with no population: the head is Foundation and grand, elder and inner are all Qi Condensation, so every Qi Condensation member reads as an elder for guarded chapters. Four `qm-*` kingdoms with a population collapse too (`organizations.ts:176-207`).
- The v36 migration reads live shop content (`format.ts:~969`), so its result shifts when the shops change.
- `paySilver` skips the float clean the stones get.

**Design drift**
- plan.md:182 and the C2 Log line say qi × √(targets ÷ the tier's common count). design.md and `reachCost` say √targets, Jan's call in C2's talk. *Doc*: plan.md.
- design.md's Protective qi paragraph still has the old crowd numbers ("15: 47%"); the Arts paragraph and the sim say 91%. *Doc*.
- Divine sense's sweep finds a site rated above your soul, which a look-around can't (`fog.ts:91`). design.md says both "the sweep needs no check" and "a realm above your soul stays a rumor". *Doc*: one line saying which wins.
- Duty hours give no waking insight trickle (`cultivation.ts:351`); design.md doesn't say. *Doc* or code.
- Land tags on `steppe` lines make nowhere, since no Border Wilds market is steppe (`gate-tanned-hide`, `thunderhorn`, `cloud-goat-wool`), so the Herders' and the Gate's land making is inert. *Content*.

## Speed

Measured on this machine, at the branch's head.

| Run | Time | Note |
|---|---|---|
| `npm test` | 21 s | `map.test` 16.5 s summed, `economy.test`'s "stock only real things" 4 s |
| `sim haul` / `stones` / `dwelling` | 7 s / 11 s / 4 s | |
| `sim npcs` / `cards` | 16 s / 30 s | |
| `sim firsthour` | 137 s | 86 s after the last review |
| `sim pacing` (25 seeds) | 8 min 38 s | |
| `sim fights` | 9 min 24 s | about 6 min of it the crowds |

- **S1. The fights sim's crowds** (`profile.ts:108`, `fight.ts:843`). Pricing is foes × techniques × reach × foes. `targetOf` prices every foe, each preview rebuilds `[target, ...others()]`, and `numbers()` calls `ownRealm` twice. A 150-foe fight is 0.65 to 1.1 s. *Fix:* an art whose reach covers every living foe is priced once, not per candidate target. Cache `ownRealm` on the combatant and build the foe list once per `targetOf`. Expected: the crowd rows several times faster.
- **S2. Pacing is old code, not the layers.** A profile at 2 seeds: cards 64% (`cardEligible`, `triggerHolds`, `rollCandidates`), `stats()`' `cacheKey` 9% (the identity memo misses), `generateRegion` 9%. The new layers' `membershipDay` is 2.9%, and markets don't show. *Fix:* see why `stats()` misses its identity memo, and cache card eligibility by the day's inputs. Worth it only if the pacing sim gets run often (the opening redone will).
- **S3. A shelf triples in cost after any prosperity change** (`making.ts:416`, `markets.ts:195`). Eased offsets are never pruned, so the `'written'` fast path is lost for good, and every `supplyOf` re-reads all 17 markets and stringifies the population. `shelf()` goes from 0.32 to 0.92 ms. *Fix:* prune eased offsets at the month's turn, and key the sum's cache by world identity.
- **S4.** `marketOfShop` scans `MARKETS` on every purse, price and shelf call (`markets.ts:141`). The unused `shopSeat` (`content/shops.ts:964`) makes it a lookup.
- firsthour is 60% slower than after the last review. Not profiled; it plays more of the day step now (jobs, membership).

## For crafts, in one place

What K1 to K12 build on, judged ready or not.

- **Ready:** the purse (`Stones`, `pay`, `receive`, `burn`); a yield entering markets through `moveSupply` and `sell`; the supply ledger keyed by thing and tier (rarities share one); mending's home in `repair` and `repairCost` for K4; fight items with `targets`, so a volley of five is one item at `targets: 5`.
- **Fix before K1** (majors 6 and 7): the hour table and `hoursPlayed`, `itemKind` that throws, `shortages()` as data.
- **Write into the K bullets**:
  - K1: inputs by thing, a tool kind and its street, `upTo` held, lot size from yield, `guardedBy` on slips.
  - K5 and K11: a fight item has no status, flag or self effect, no count spent per use and no reach cost. A volley's reach is free where an art pays √N, so either material pays for it or the item pays qi.
  - K6: the seat gate, guarding beyond `sect` shops, and a `members` flag per power, not per shop kind (today only `sect` shops serve members, so a guild's hall serves anyone).
  - K7: a save-backed registry for generated recipes and items, since `item()` has none.
  - K12: `askAt` and a fixed-price offer.
  - Every K: the alchemy hall's furnace perk is a display string (`perk`, `gives`); it needs an id the bench can look up.
- **K1's clue:** `itemPrice` is flat by kind (every tier 1 pill 3 low, a herb 2), so a recipe's cost never touches its price. K1's net per batch is tuned there.

## Dead code

**Never read anywhere:** `PAVILION`, `PROTECTOR`, `LAW_HALL_TITLE` (`content/organizations.ts`); `shopSeat` (`content/shops.ts`, see S4); `dutyHours` (`wheel.ts:67`); `carriesGuarded` and `LeaveOpts.carries` (the "carries off its guarded methods" betrayal can never fire, and `partWays` passes `knows`, which `partingOf` ignores); `earnings(…, mortals)`'s mortal branch; `ALLOWANCE.true.stones` (60; the true seat reads the curve, 22.5 at Qi Condensation).

**Tests only:** `takeAsDisciple` (medium 16), `canJoin`, `entrySeat`, `yearsPills`, `lessonInsight`, `treatmentWords`, `membersLine`, `atPost`, `buyInPrice`, `harvestFactor`, `landYield`, `gatherLines`, `gatherRarity`, `plainLore`, `marketSize`, `seenFrom`, `claimOf`, `stockOf`, `hallPoints`, `streetCount`. Most are pieces of a live rule exported for their test, which is fine. `takeAsDisciple` and `yearsPills` are rules nobody calls.

**Exported but used only in their own file:** about 50 (types and helpers in `guarded`, `halls`, `jobs`, `joining`, `organizations`, `markets`, `making`, `shops`, the map and content). Dropping the `export` is a sweep with no decision in it.

**Duplicated:**
- A capitalize helper is written six times beside `ui/format.ts`'s `capitalize`: chronicle, comingBack, joining, making, MapScreen, PlaceScreen.
- `wordRank` is in `halls.ts:37` and `joining.ts:52`.
- `monthOf` (`shops.ts:89`) is `monthIndex` (`organizations.ts:736`).
- "Inner by realm" is written in `entrySeat`, `seatOf` and `seatsByRealm`, and the trial's month check in `innerTrial`, `eldersHall` and `trialWords`.
- The tiers list of a market is in three files. "Which catalogs a market reads" is in five functions (`seeFresh`, `linesOf`, `wideLots`, `poolOf`, `catalogsFor`), which must agree for the sum, the shelf and the price to agree. K1 adds a sixth reader.
- The "all, split past the full count" share is in `reached` and Whirl's spill.
- `MapScreen.tsx:~480` hard-codes 250 where `ENTER_LI` exists.

**Stale:** an orphaned comment over `mapPlaceOf` (`travel.ts:71`); `.place-release` has no CSS rule; `devPace` in `travel.ts:278` is a module-level dev global in core that leaks between tests in one process.

**Shape:** `organizations.ts` is 1,342 lines doing seven jobs: seats, membership, the trial, the currency, the allowance and dwelling, tutelage, the quota and leave, and the views. Splitting it by job (seats, membership, the month) before K6 adds guild seats would keep each under 500.
