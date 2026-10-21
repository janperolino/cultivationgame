# Code review: the friends' line, 2026-10-21

This review covers what the friends' line added to `main` before P3.9 Going in, and nothing else. The K line (K5 to K10) and the side line's P3.8 are left out. The friends' line came in as four merges, and each one's first-parent diff is its own work:

- `cfad8d8`: Fights you play (save v47).
- `3e71fcd`: The opening, built: the clock, the journal and the guides (save v49).
- `bca192a`: The opening, built: the chains, the rogue and the knobs (save v52).
- `1177314`: fix: the heavenly root's pace.

That is about 10,600 lines in `src` and `tools`. The review also covers the conflict fixes made against K8 to K10 in `d3cba55` (merged by `bca192a`) and in the v47 and v49 renumbering.

Three reviewers read one merge each, and a fourth pass covered the conflict fixes, the save migrations and the pace fix. Every finding below was checked by reading the code path at `1177314`. None was reproduced with a script, so the failure cases are traced, not run. Findings marked *(plausible)* depend on how play goes, and say on what. The Small calls in `plan.md` count as decisions, not bugs.

Nothing is fixed in the commit that adds this file. Jan and the hub pick what to fix and where. Jan chose 1 to 12, fixed in `18ed9a2`; 13 to 17 and the Simplifications stay recorded.

**State at review.** At `1177314`, `npm test` passes (92 files, 1,369 tests, 41 s) and `tsc --noEmit` is clean. Lint was not run.

Nothing the friends' line added to `src/core` imports React, calls the network or touches storage. No `Math.random` or `Date.now` drives an outcome:
- A played fight's rolls start from one draw off the `combat` stream.
- Fight starts are keyed by what they roll for (`card/uid/…`, `spar/who`, the encounter's seed).
- The quest road beast is seeded by `hashSeed(id/lineage)`.

The three migrations (46→47, 48→49, 51→52) don't mutate their input, and they fill what they add.

## Major

None. Nothing found loses a save, pays twice, or leaves the clock held with no way out in normal play. The closest is medium 3, which needs a content change between builds.

## Medium

Ranked by what a player would feel.

1. **The rogue's "take the day hire" step can't finish if the hire is already held.**
   - Where: the step's goal is `{ event: 'job', match: { job: p.hire, what: 'taken' } }` (`content/quests/chains.ts:190`). An event goal counts only events from the day the step opened (`core/journal.ts:142-148`, `e.day >= opened`). `canTakeJob` refuses a job you hold: "You hold it already." (`core/jobs.ts:149`).
   - Failure: a rogue takes `dock-carrying` or `stall-minding` early for income. Hires open from layer 1, and the board quest pays only 20 stones. They then walk to the hideout, and step 2 opens. The old `taken` event predates `opened`, and the hire can't be taken again. The quest is `origin: true`, so it can't be dropped either. The only way on is to quit the hire and take it again, and nothing says so.
   - Fix: make the goal read state, a held hire (`p.jobs.some(h => h.id === hire)`), or let `goalMet` accept the hire already held.
   - **Fixed in `18ed9a2`**: the step is a `job` goal, a hire held.

2. **The place quests' "keep three days" stalls at drill.** *(plausible: it depends on the layer the player has reached when the place quest opens)*
   - Where: both place quests ask `{ kept: 3 }` (`chains.ts:159`, `:192`). Through layers 1 to 3 a shift counts only on the hours you set to Duty yourself (`core/jobs.ts:334`, `drilling` in `core/wheel.ts:44`).
   - Failure: a player who reaches "Your Place" or "Your Own Way" at layer 3 or below sees `kept` stay at 0, and `balance: 5` stays too for a post. That lasts until they paint Duty on the shift's hours or reach layer 4. The step text says "stand at it as its Duty hours pass", which reads as automatic. `chains.test.ts` sets `stage: 4` before these steps, so the tests don't meet the case.
   - Also: `kept` isn't counted from the step's opening (`journal.ts:117` reads this month's and last month's `kept`). A cadet who already kept shifts finishes the step the moment it opens.
   - Fix: say "set Duty on its hours" in the step text while drilling, or count kept days from `opened`. Either way, add a test at stage 3.
   - **Fixed in `18ed9a2`**: kept days count from the step's opening (`keptAt`, save v53), and both steps say to set Duty at drill.

3. **A save that names content a later build no longer has can stop the life.**
   - Fights: if `currentFight(s)` returns null while `s.fight` is set, `syncFight` returns quietly (`ui/fight.ts:94`). `App.tsx` still hides the rail behind the fight shell, `CombatScreen` renders nothing, and the clock stays held. Nothing offers a way off the stage. `card()` and `encounterTemplate()` throw on an unknown id inside `fightStart`, so on a missing id the screen crashes rather than going blank.
   - Quests: `quest(id)` throws on an unknown id (`content/quests.ts:181`). `noteQuests` calls it for every quest under way (`journal.ts:179`, and also `:69`, `:106`, `:155`, `:167`, `:288`) in the day step and in the store's subscriber. `waitsOn` and `didDeed` guard with `hasQuest`, but these don't.
   - Failure: a friend saves mid-fight on a seclusion card, or with a quest under way. Then a build renames that card, roster template or quest id, as `bca192a` did when it rewrote the first-hour deck. On load the stage is blank and the clock is held, or every day step throws ("leaves the game where it was").
   - Why it matters now: the friends play deployed builds while the opening's content is still moving, and the chains will be rewritten again in P3.12.
   - Fix:
     - When the start can't be rebuilt, clear `s.fight` in `syncFight`, and have `openFight` or `askSpar` refuse when `fightStart` is null.
     - Drop unknown quest ids in `noteQuests`, the way `hasJob` guards the jobs loop.
     - Or add a rule: a content rename ships with a migration.
   - **Fixed in `18ed9a2`**: `dropLostFight` from `syncFight`, `openFight` takes the built start and refuses without one, and `noteQuests` drops unknown quest ids (the journal's other lookups guard).

4. **A coward's own surrender reads as "talked down", and the road takes your loot for it.**
   - Where: `fightEnd` returns `'talked'` when no foe is down and any foe yielded (`core/played.ts:89-90`). It doesn't check that the yield came from your words. A cowardly foe that can't flee surrenders on its own (`core/combat/profile.ts:163-165`, `talk` with style `surrender`), and an accepted surrender sets the speaker `yielded` (`combat/fight.ts:1601`).
   - Failure: you root a lone cowardly bandit with a wood art (`rooted` is `noFlee`) and beat it below its flee line, and it surrenders. The fight ends `'talked'`. `settlePlayed` (`map/encounters.ts:859-861`) strips every `loot` stake from the pass, and the screen says "You talk them down". You won the fight and get a talker's share.
   - Fix: `'talked'` only when a foe yielded to a bluff or a threat of yours (mark it on the combatant in `fight.ts:1608`). A foe's own surrender counts as `'won'`.
   - **Fixed in `18ed9a2`**: the combatant carries `yieldedTo`.

5. **A rogue's first-work paragraph follows you into the next life.**
   - Where: `FirstWorkButton` takes the oldest `work` event in the chronicle (`ui/ChainOffer.tsx:109`), and `nextLife` carries the chronicle over (`core/state.ts:881`).
   - Failure: a rogue's life ends, and the next is a cadet. Every start opens with its qi method not yet taken up. Until the cadet presses Take it up, Cultivate shows the dead rogue's "You carry it up the wharves…" text, and a "Reading X: n%" line if a copy is on the stand.
   - Fix: read the work event of the current chain quest (`data.quest` against `s.journal`), or events since the life's `bornDay`.
   - **Fixed in `18ed9a2`**: `firstWorkDone`: this life's work line, for a quest in this life's journal.

## Low

6. **A card fight's outcome can be dropped when its cost is spent in the fight.** *(latent: no card choice today has both `fight` and `cost`)* `resolveCard` checks `canChoose` again when the fight hands back (`core/cards.ts:383`), but charges the cost only after the fight. If the cost is a pill you drank in the fight, `finishFight` gets `ok: false` (`core/playFight.ts:100-103`). The fight is closed, the card stays pending with no text, and choosing it again opens a new fight. *Fix:* skip `canChoose` when `opts.played` is set, or charge the cost when the fight opens. **Fixed in `18ed9a2`**: the cost is paid as the fight opens, and the hand-back skips `canChoose` and the cost.

7. **A foe neither side can hurt reads as a sure win.** In `fightEdge`, a foe with `need = Infinity` (your blow is 0) and `hits = 0` adds `Infinity * 0 = NaN` to `taken` (`core/combat/edge.ts:86`). `taken > 0` is false for NaN, so `ratio` is `Infinity`, and `isSure` passes without the stage. *Fix:* treat an unhurtable foe as a draw or as short, before the sum. **Fixed in `18ed9a2`**: an unfellable foe returns short before the sum.

8. **The Routine page still says layers 1–3 ignore the root.** After `1177314`, layer 3's bar counts the root, but `ui/RoutineScreen.tsx:137-141` still reads "Layers 1–3 ignore the root, …". At layer 3 a heavenly root shows ×2.5 in the breakdown next to that line. The doc comment on `inTutorial` (`core/methods.ts:35`) says the same. *Fix:* "Layers 1–3 ignore the method's tier, rarity and mastery, its fit and the element hours, and layers 1–2 the root." **Fixed in `18ed9a2`**.

9. **With guides off, four codex entries never appear.** `guideNow` returns null with guides off (`core/guides.ts:128`). `noteGuides` ends only the guides with a `doneInState` case, and `qi-bar`, `focus`, `sheet` and `sense` have none. Their entries are met by `{ guide: … }` (`core/codex.ts:114`), so `seat`, `focus`, `character-sheet` and `look-gather-sense` stay hidden after you've done all four things. The UI-ended guides (`place-doors`, `first-buy`, `first-card`, `fight-turn`) still end through `endGuide`. Also, `guidedStart` holds auto at "Only when I say" with guides off, until the first minor breakthrough is pressed by hand. *Fix:* turning guides off runs `finishAllGuides`, or `metNow` counts a guide as met when guides are off. **Fixed in `18ed9a2`**: with guides off, `noteGuides` ends the four at their moments, and turning guides off lets auto go (`unguidedStart`).

10. **Two codex entries can never be met.** `came-back` (`content/codex/cultivation.ts:402`) and `site` (`content/codex/map.ts:331`) use tests that are always false (`core/codex.ts:53`, `:87`). The only `meetCodex` caller passes `'shop'`. The hand-over named this, so it is recorded here for the list. *Fix:* call `meetCodex` from the coming-back story and the site panel, or give them state tests. **Fixed in `18ed9a2`**: `site` is a state test (standing in one); the coming-back story calls `meetCodex`.

11. **"Buy at this counter" finishes with a buy anywhere.** `intro-gear` ("Buy a piece at this counter", `content/quests/intro.ts:21`) and `intro-sect-shop` ("Buy something at this hall", `:100`) use `{ event: 'bought' }` with no `match`. The `bought` event carries `where` and `thing` (`core/shops.ts:710`). Taken at the refiner, the gear quest is done by a pill bought at the alchemy shop. *Fix:* match the shop the quest was taken at (`q.at`), or reword the steps. **Fixed in `18ed9a2`**: `here` on the step's goal: a buy at a shop of the giver's kind at the place it was taken.

12. **A stray Duty hour is out of the flip pool.** `freeWheel` maps only `dutyAt` hours to Duty (`core/wheel.ts:71`). A wheel hour left on `duty` after its job is gone stays `duty` there. `effectiveWheel` cultivates it as qi. `hourToFlip` and `flipHour` read `freeWheel` (`life.ts:502`, `wheel.ts:316`; `flipHour` at `wheel.ts:253`), so a card that flips an hour never picks that one. *Fix:* the same `duty → qi` mapping in `freeWheel`. **Fixed in `18ed9a2`**.

13. **The `layer` goal is wrong past Qi Condensation.** *(latent: no content asks it)* `journal.ts:139` returns true only for a qi goal met by a later realm. A goal of `{ realm: 'foundation', stage: 2 }` with the ladder already in Core Formation returns false. *Fix:* compare by realm order, then stage.

14. **Renting a room moves the chain's people.** *(design call)* `@home` resolves through `homeOf`, which takes your abode first (`core/map/travel.ts:80-84`). The chain's teacher, the lesson's giver and the place quest's giver are all `@home` (`content/quests/chains.ts:77-78`). A first rented room in another town moves where they stand and where you hand in, mid-chain. The board quest's posting is safe, since it stores its board id. If the people should stay where they live, they need their place resolved at the chain's start.

15. **The v52 migration's "past its first seclusion" is the build's end.** `51:` keys on `focus` (`core/save/format.ts:1124-1135`), the last of the four build guides, reached a few minutes into a life. A v49 to v51 life that has built its screen but not yet sparred gets `sheet` marked done and never sees it. Only Jan's and the friends' test lives from the last day are affected.

16. **A single-player seam in the played fight.** `played.ts` (`playTurn`, `replay`, `afterFight`), `playFight.ts` (`foeNames`, `finishFight`) and `ui/fight.ts` read `s.player`. The saved record (`PlayedFightSchema`) and `YourAction` name no actor. The rest of the core reads `s.player` too, so this is consistent, not a break. But a scene fight with a companion in P3.9 will need the record to say who acts.

17. **A content special case in core.** `core/map/board.ts:274` picks grade 0 for a posting by its id prefix, `p.id.startsWith('quest:')`. A `grade` (or `pays`) field on the quest's posting keeps it data.

## Simplifications

- `QuestOffers.tsx:45-51` and `JournalScreen.tsx:75` run the action on the render-time `game` and then call `applyLife(() => r.state)`. That replaces any tick since the last render. It's at most one tick, but `applyLife((s) => …)` with the reason read on the side is simpler and exact.
- The played-fight edge (`cards.ts`, `viewCard` → `fightWords`) builds the foe and previews every technique for each fight choice on every card render. Caching by `uid/choice` until the state's player changes would help.
- `played.ts:88` (`foes.some((c) => c.state === 'fighting')` → `'lost'`) can't be reached: while you fight and a foe fights, `fightOver` is false.
- `wheel.ts:64` (`dutyAt`): its `if (!c.jobs.length) return null` repeats what `shiftAt` already does.
- `jobs.ts:257-258`: an orphaned doc comment ("Duty-hours of a shift falling between two world days…") now sits above `dutyHours`.
- `codex.ts:~37` has two doc blocks stacked on `MET`.
- `questPostingsAt`'s doc says "at its first step", but it lists the posting until it is paid.
- `CHAIN_SPAR.roster` is read only for the partner's name. `chainSpar` never uses the template.
- An import cycle, `journal → codex → guides → chains → journal`, works only because every use is inside a function.
- Per-frame chronicle scans: `doneInState('first-work')` (`guides.ts:45`) scans the whole chronicle on every `guideNow` for every life that isn't a rogue, and that guide never ends there. `ready('sheet')` does the same until the first won spar. The chronicle is in day order, so scanning back from the end and stopping at the first match, or at `opened` for goals, would be cheaper.

## The merge fixes

All four checked by reading the combined diff of `d3cba55`, and fine:

- **Save renumbering.** The order is K7 `45→46`, Fights `46→47`, K8 `47→48`, the clock `48→49`, K9 `49→50`, K10 `50→51`, the chains `51→52`. Each step writes the next version, and none is skipped or doubled. One note: the clock's `48→49` writes `guides: [...GUIDE_IDS]` from live content. So a v48 save gets every guide that exists at load, including the chains' three. `51→52` then adds nothing, which is the right outcome. But any future migration that adds guides must not assume `48→49` left them out.
- **`applyEffect` exported with `uid = -1`.** Only `raid` reads `uid`. `settleRaid` finds no dwelling with raid uid −1 and returns the state unchanged (`core/dwellings.ts:759-760`). No quest act's work effects carry a `raid`. Safe.
- **The deck filter.** K's `k.queued` check, the chains' `k.pushed` skip and the held seclusion deck stack in the right order. `deckHeld` matches `chain-<key>-lesson`, and all six starts build a `lesson` (`chains.ts:93-94`), so no start holds the deck forever.
- **The board check beside the broker.** `hasBoard(p)` covers the kind's board, a mission hall and `NOTICE_BOARDS`, so the Wall's notice board shows. The `!isMissionHall` guard keeps a sect seat on its own hall row. K9's broker row sits above, and is unchanged.

## Checked and fine

- **Clock hold:** `advance` breaks while `state.fight` is set (`loop.ts:97`), and the store's tick returns first. Away catch-up runs the away seat, so fights settle by verdict and none opens on load.
- **Replay:** `openFight` draws the start once. `playTurn` and `replay` both run from `new Rng(rec.start)`, and foes choose with no rng, so a reload lands on the same turn.
- **Hand-backs:** a card's fight maps won or talked to pass, lost or yielded to fail, and fled or draw to `fled ?? fail`. The road's `settlePlayed` applies its stakes once. A spar writes one chronicle line with `who`. A second "Go on" is a no-op.
- **Quests:** `handInCheck` needs every step and the giver's place. `handed` is set with the reward, so nothing pays twice. Origin quests can't be dropped, and `nextLife` starts a fresh journal.
- **Chains:** each next quest is offered once, after the last is handed in. Work acts can't repeat, `pushCard` dedupes a waiting card, and chain spars are once a day. The quest road beast is placed once and cleared when the course ends.
- **Content ids:** every chain and intro reward, technique, copy, encounter template, roster template, card, hire and `qm-op-*` site resolves. All six homes have boards.
- **Guides:** `finishGuide` is idempotent, the build order holds, and every `data-guide` control the guides name exists in the UI.
- **The pace fix:** `PACE` and attention are applied once per ladder. The root counts from `c.qi.stage >= 3`. The codex numbers moved with it, and the tests pin layers 2 and 3.
