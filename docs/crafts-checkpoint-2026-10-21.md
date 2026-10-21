# The crafts play checkpoint, 2026-10-21

The last item on the K line (plan.md, The crafts layer: brew a batch queued and one played; raise a family to Comprehension; certify first-grade; rent a plot and age a herb; find a hidden vein and make a site; lay a gathering array and feel the density; survive a beast raid; take a commission; feed a heavy method with your own pills). Claude played it for Jan on dev-3 (`localhost:5175`), through the dev console and the running game, as the organizations checkpoint was played. The money was measured with `npm run sim -- craft` and a throwaway lever harness on top of it.

**Who played.** Ye Li, a fresh life (a garrison cadet of the March, single water root, gentle saves), set up with the console where an item needed a jump (`craft`, `insight`, `vein`, `farm`, `up`, `kit`) and played through the screens where the item is the screen. Lu Ning, the one existing save (slot 1, Qi Condensation 5, six years lived, no craft), for the way in to the crafts from a life that never touched them.

**All nine items play.** Each is a line here; what read wrong is numbered below.

| Item | What happened |
| --- | --- |
| A batch queued | The first queued Qi-Gathering Pill failed (63% to hold at Glimpse); three of the first five did. |
| A batch played | Sat at the furnace with an in-page bot burning dross like an attentive player (the canvas is too quick to play through screenshots). At a held 1.00 hand: one blue and three green out of four. The first two sat batches came out white (finding 11). |
| A family to Comprehension | At 3 batches (failed ones count half), in the first in-game week. The recipe card then read holds 88%, 11 pills, white 75%, green 25%. |
| Certify first-grade | The Alchemy tree's seal and six cheapest nodes bought on the Trees screen (about 205 insight), then the City's Examination hall, queued: "The batch holds. The examiners seal your 一品 badge." 10 low, instant. Renown went to 2 (mark +6%). |
| A plot and an aged herb | Spear-Plow's Fields door, rented for 6 low a season. Sowing needs the crop known (the Farming page says so). A kernel bed aged 10 years read green 100%, at 100 years blue 100%: 30 blue kernels (5 low each at Pill Street, against white's 1), its packets and a green packet back. |
| A hidden vein and a site | `vein` stood Ye Li on a tier 2 vein; the Map offered a spirit mountain, claimed free: density 5 (land 3, 2 steps), seclusion ×1.3, six land slots, two array slots, a 64-square store. |
| A gathering array, felt | Two of four sets of Qi-Gathering Flags held (queued, 63%). Laid through placing with "Set it plain" (hand 0.58, white): density 5 → 6 "rich", seclusion ×1.3 → ×1.6, the eye 30 low at 0.5 a day. Qi on the day's figure went 0.40 → 0.64 a day, ×1.6. |
| A beast raid survived | A slot sown and aged past ten years, the store emptied, the month turned while inside: the beast card came with Drive it off. A thunder-horned deer at Ye Li's own realm; an Iron Sword blown apart (107), and it fled. Beds kept. |
| A commission | Old Meng's at Pacified Fort: ten green Qi-Gathering Pills, graded, 207.8 low (×2 the market), handed in from the Bag. Renown 3, known by name. |
| A heavy method on your own pills | Pill-Fed Tide Breathing taken up on Routine: "Fed, it climbs as purple", qi 1.2 → 2.8 a day, one pill drunk a day from the Bag. |

Not played: Refining's and Talismans' benches by hand (the sims cover their money), Experiment, the craft deck's cards and made to order. The furnace, placing and tending scenes were opened and run but can't be felt from here: Jan's own hands are the test of those.

## The money

`npm run sim -- craft` today (low per four craft hours, the City and Pacified Fort; the marks are Comprehension 13.5, Mastery 25, played ×1.5 queued, Glimpse 0.75× four gather hours on average):

| Craft | Glimpse | Comprehension | Mastery | Played at Comprehension | Month at the City, Comprehension |
| --- | --- | --- | --- | --- | --- |
| Alchemy (Qi-Gathering Pill) | 4.4 / 11.6 | 30.8 / 52.0 | 59.6 / 86.2 | 65.8 / 100.5 | 28.5 batches × 23.3 net ≈ 660 low |
| Talismans (Ember) | 1.3 / 1.4 | 13.5 / 13.9 | 21.1 / 20.9 | 24.6 / 24.2 | 57 × 6.9 ≈ 390 low |
| Refining (Iron Sword) | −3.0 / −0.3 | 1.6 / 2.2 | 5.3 / 5.9 | 6.7 / 7.5 | 8 × 3.7 ≈ 30 low |

Four gather hours are 7.2 low at the City and 5.6 at the Fort; a duty day is 1.5.

**1. Refining doesn't pay at the bench, and the month is worse than the sim says.** *Did:* the sim, and counted the shelves. *Happened:* the sim's figure is the rate while working (net a batch × 4 ÷ its hours), but a refiner runs out of ore: the City's shelves held 41 tier 1 Red Rocks ore this month (8 swords at 5 a piece) and the Fort's 16 (3). A shop pays 0.4 of a sword's market price, about 18 low, for 5 ore at about 2.9 each (an import), so a piece nets 3.7 and the City's month about 30 low. *Proposed:* three levers together, measured with the harness: shops buy your own make at 0.6 (finding 2), a tier 1 piece of gear takes 3 ore (the refining recipes that write 5; scaled the same where they write more), and it takes 4 craft hours (design's 8, ×1.5 a tier as now). Then Comprehension queued is 17.5 at the City and 13.3 at the Fort, played 34.1 and 26.7, Mastery 28.0 and 25.4; the City's month is 13 pieces × 17.7 ≈ 230 low queued and about 445 played, still held by its ore. Glimpse is 4.8 and 8.3. The hours change only the working rate while ore lasts; the month is the ore.

**2. Talismans sit just under the marks.** *Happened:* Comprehension 13.5 and 13.9 (the mark is 13.5), Mastery 21 (25), Glimpse 1.3 against 7.2 gather hours. A shop pays about 2 a sheet for a 4-low talisman (0.4, nobody short of it), on 2.9 low of paper and cinnabar a batch. *Proposed:* **the maker's rate**: a shop buys your own marked make at 0.6 of the market (FRIENDLY_BUY_RATE), and 0.8 where the market needs it, as now. Talismans then read 23.1 and 24.4 at Comprehension, 35.4 and 34.5 at Mastery, Glimpse 5.4, a City month about 670 low (alike to alchemy's). Pills don't move (the City and the Fort need them, so they already sell at 0.8); loot and hauls don't move (not your make). The alternative is the friendly rate once your name is known (renown 3 at the craft's shops), which the novels fit better but leaves a new talisman master at 13.5 for a month or two.

**3. Glimpse lasts a day.** *Happened:* Comprehension came at 3 batches, about one day of four craft hours, so Glimpse's money (4.4 at the City, under four gather hours' 7.2) is felt for one day. What is felt is its 63% hold: three of my first five batches failed, the herbs gone. *Proposed:* keep the money as it is (it settles "Glimpse earns less than gathering at the City": it's one day). If the first day should sting less, Glimpse's hold 0.5 → 0.6 (×1.25 matched, 75%); at 0.7 Glimpse nets 14.1 and 33.8, almost Comprehension's, too much.

**4. Herbs stay at 0.7.** *Did:* the harness at herb 1.0. *Happened:* four gather hours rise to 10.4 and 8.0, and alchemy falls (Glimpse 1.1 at the City, Comprehension 27.5 and 49.1): the gatherer gains and the crafter loses, against Jan's standing call. *Proposed:* settle K1's suggestion as no: herbs stay at 0.7, yields stay.

**5. Commissions are the crafts' real money, and they outrun the bench.** *Did:* read every posted notice in five markets in month 148, took and handed one in. *Happened:*
- A posted notice pays ×1.5 the market's price, ×2 graded, where a shop pays 0.4 to 0.8 of it: a commission is 1.9× to 3.75× what a shop would give. Old Meng's ten green pills paid 207.8 low; Old Meng himself would have paid 8.5 a pill (85).
- Pacified Fort's four alchemy shops posted 1,404 low of Qi-Gathering Pills this month (two blue graded at 52 each, a green graded at 20.8, a green at 15.6). Three held at once, so a graded alchemist who plays for blue can take about 1,250 low a month there, twice the bench's month.
- The City's four asked green healing pills at 12.7 each (127 for ten).
- Refiners post only at Thousand Paddocks and Heaven's Eye, and there the numbers jump: a green Iron Sword 190.9 low for one piece (a shop pays about 18 for a white one), a blue green-steel saber 477, blue tier 2 robes and glaives 4,296 to 5,728.
- Queued at Comprehension nothing comes blue (white 75%, green 25%); blue needs the hand, so the blue notices are the player's payday for playing.
- *Proposed:* keep commissions as the big payday (D4's rich crafter, and they ask for the hand), and trim the graded ×2 to ×1.5 and the posted ×1.5 to ×1.25, since the grade is cheap (about 205 insight and 10 low, sure at Comprehension). That makes Old Meng's 156 low and the Fort's month about 1,070. Refiners keep posting only where gear runs short: refining's commissions draw a refiner to Heaven's Eye and the Paddocks, which is reach, as D4 has it.

**6. Spirit farming has no cap.** *Did:* rented a plot at Spear-Plow; the Fields door kept offering "Rent a season · 6 low" with one held, and a claimed spirit mountain gave six slot plots more, free. *Happened:* `takePlot` has no limit, and a bed's packets come back two for one, so a purse buys any number of nine-bed plots: about 270 white herbs a plot a season, with no craft hours (the market's depth is the only rein). *Proposed:* a village lets you one plot, a town two, each more once its power holds you "favored"; a dwelling's slots stay its own.

**7. Upkeep is cheap against a crafter, and settles.** *Happened:* the tide breathing drinks one Qi-Gathering Pill a day, a white worth 4.2 to a shop or 1.15 of herbs to brew, against an alchemist's 22 low a day over the month. Heavy tier 2 upkeep (18 low a day) against a Foundation crafter's D4 mark of 120 per four hours reads the same. *Proposed:* settle: no change. See finding 17 for which pill it drinks.

**8. Formations' money.** *Happened:* the sim can't sell an array (its loop is the pills', and comes back NaN), and an array's worth is what it does: white gathering flags lifted seclusion ×1.3 → ×1.6 (+23% qi) for 0.5 low a day. *Proposed:* settle: an array is made for your own ground, and selling them needn't pay. The sim prints "not sold" for a craft whose make no market buys, rather than NaN.

## The way in

**9. A new crafter can't find a furnace or a recipe.** *Did:* Lu Ning (six years, 1,345 low, no craft) at Pacified Fort's Pill Street, and every shelf in four markets read for tools and slips. *Happened:* Pill Street offers "Three Batches: get a furnace and a recipe", and says neither where. This month no crude clay furnace stood in the City or the Fort (one at Thousand Paddocks); the bronze pill furnace stood on two City stalls at 47 low; no wolf-hair brush stood anywhere; three recipe slips in all. The recipe comes from the Alchemy tree's seal, which shows only once you hold a tool. *Proposed:* a craft's starter tool is a standing line at its own shops (the clay furnace at every alchemy shop and refiner, the iron forge at refiners, the brush and paper at talisman shops), and Three Batches says where: "a furnace from Pill Street or Refiners' Row, the recipe from the Alchemy Dao on the Trees screen".

**10. An unlocked Crafts screen with no craft is blank.** *Happened:* Lu Ning's Crafts screen showed only its title (the screen was unlocked, the tool long gone). *Proposed:* with no tool, recipe or plot, the screen says how to begin, as finding 9's quest does.

**11. The hand before the queue (Jan's parked idea, confirmed).** *Happened:* the only way to sit is to queue first, and queuing starts the batch at once; by the time I sat, 1.7 of its 3 hours had run at no hand. The hand starts at 0 each sitting and climbs about 0.09 a speck, so even at a steady hand the first sat batches read their slow climb: my first two came out white. *Proposed:* Sit at the furnace opens before anything is queued (the hand warms on an empty furnace), and a batch queued while you sit starts at the hand you hold. Whether playing should be the whole of an active craft (the other parked idea) is Jan's feel to take after trying it.

**12. Insight for the craft trees.** *Happened:* first-grade needs the tree's tier 1 held, about 205 insight; Lu Ning had earned 279 in six years. Ye Li needed `insight 2000`. *Proposed:* data for the parked "more insight for the new sinks" sketch, nothing now.

## Feel

**13. Raid cards settle before you see them.** *Did:* claimed the mountain, went to the Dwelling screen. *Happened:* the first raid came and settled by "Let it graze" while I looked elsewhere: a beast card waits 3 game days and a thieves' card 5, at Qi Condensation's clock (a day about every 10 s) about 30 and 50 real seconds. Drive it off is offered only if you stood inside the site when the month turned. *Proposed:* a raid card waits its days counted once you have opened the feed (or 3 and 5 real minutes, whichever is longer), and Drive it off is offered whenever you stand there when you open it.

**14. A raid fights at your realm.** *Happened:* at layer 1 Drive it off read "you'd fall before they do: 7 exchanges to fell them, 4 to fell you"; after `up 5` the deer was layer 6 too (K9's call: the card shows the band that came, the fight is at your realm). *Proposed:* the raider at the band that came (here Qi Condensation 1–3, the land's), so a strong owner sweeps the land's thieves aside and a weak one should ward, as K10's wards already read the band.

**15. Cultivate doesn't name your own dwelling's seclusion.** *Happened:* inside the mountain the day's figure read 0.64 qi a day with no word of the mountain's ×1.6 (it was 0.40 outside). Only a sect's dwelling by seat gets its line (`dwellingWords`). *Proposed:* the same line for any dwelling you stand in: "Your spirit mountain: qi ×1.6 while you seclude here."

**16. Placing by screenshot didn't take.** *Happened:* eight clicks round the eye planted no flag (0 of 8); "Set it plain" laid an octagon at a 0.58 hand. Likely my clicks' frame, not the scene, since K10's bot plays it. *Proposed:* Jan tries it by hand; no change unless it misbehaves for him.

**17. Upkeep eats your best pills when the plain ones are stored.** *Happened:* the tide breathing drank greens (8.5 to a shop) because the whites sat in the mountain's store; eaten pills stayed marked (23 marked greens with 19 held), the review's open item. *Proposed:* keep "the plainest first"; marked goods eaten, burned or fed drop their mark (the review's left item, now common).

**18. A small Bag fills in a day.** *Happened:* five batches, a harvest and two flag sets overflowed a cadet's Bag into the tray within a game week. *Proposed:* no change (the tray holds them, and a dwelling's store is the answer); noted for the art overhaul's Bag.

## Words and small bugs

19. The chronicle writes "Ye Li lays qi-Gathering Flags" (the item's name lowercased mid-sentence). *Fix:* keep the name's case.
20. An empty bed raided reads "A beast comes for the fields … and eats the nothing.", and Recent shows a bare "了 · settled without you" line under it. *Fix:* "finds nothing ripe and wanders off", and the settled line carries its card's title.
21. "Your gathering arrays reach Comprehension: the fire answers the hand." Every craft's mastery line is alchemy's. *Fix:* a line a craft (the flags hold the currents; the brush keeps its line; the hammer finds the glow; the beds answer the sleeve).
22. A Formations recipe card says "Sat at with a full hand: green 75%, blue 25%" on a queued-only bench. *Fix:* "Laid at a full hand: …", from placing.
23. The Fields door's "Open it" opens the Crafts screen on Alchemy, not Farming. *Fix:* open Farming.
24. The tray says "The Bag had no room, so these wait by the furnace" for a harvest and flags too. *Fix:* "wait at your bench".
25. A site's screen says "Inside, a scene waits for P3.9. Until then a site is a place to stand: and P3.7's encounters read its band." (phase numbers to the player), and its head reads the land's "qi density 3, thin" where the dwelling reads 5 or 6. *Fix:* "Nothing more to do inside yet." and the dwelling's density in the head.
26. The Dwelling screen says "Not where you stand" while you stand on your claimed site, not yet entered. *Fix:* "You stand at it" with an Enter button.
27. Pacified Fort's Broker door reads "your a barracks bunk here" (Lu Ning). *Fix:* "your barracks bunk is here".
28. Blowing a piece apart reads "125 sure" and dealt 107 to a defending deer; the fight then ends "You bring them down." though the deer fled. *Fix:* the label reads "about 125"; a fled foe ends "It got away."
29. "Ye Li claims a spirit mountain … and moves in." while the abode stays the barracks bunk. *Fix:* "and stakes it" unless it's made the abode.
30. A March cadet claiming March land gets "a deed against the Beast-Butcher Gate: squatting on its land" (the Gate's sphere covers the spot; K9's rule takes atlas powers before kingdoms). *Proposed:* a power you belong to never takes a squatting deed from you, and the deed goes to the next sphere only if that one is a rival's; or keep, for Jan.
31. At the furnace, with the bench waiting on herbs ("Short 6 Old Apricot Kernel and 4 Ridge Bitterroot"), the scene says "Nothing on the bench yet: the next goes in on your next craft hour." *Fix:* "The bench waits for herbs."

## Dev console notes

- `at` doesn't raise the place in your fog, so the Map offers no Enter there (Spear-Plow) until `reveal`.
- `card raid-beast` queues the card without its words or vars (raw "{site}", no Drive it off).
- `craft` adds another starter tool each run (three clay furnaces in the Bag).

## The rounds with Jan

Filled in as each round is settled: money first, then the way in and feel, then the rest of Open questions and the review list.

**Round 1, the money** (Jan's calls):
- *The maker's rate* (2): yes. A shop buys your own marked make at 0.6 of the market, 0.8 where the market needs it.
- *Gear's price* (1): Jan: "Sword should be more expensive. As in cultivation novels, artifacts always have good prices." Gear doubles (a white tier 1 Iron Sword 45 → 90, storage gear 60 → 120, written gear prices ×2), and a tier 1 piece takes 3 ore, not 5 (refining recipes' ore ×0.6, rounded). A piece keeps its 8 craft hours. Measured with the maker's rate: Comprehension 22.1 (City) and 17.5 (Fort) per four craft hours, played 38.7 and 30.9; the City's month about 580 queued and 1,000 played. The stones and haul sims don't move.
- *Commissions* (5): Jan: "make the commission pills either have a quality requirement and not have too much market supply. That way it looks more like they're commissioning for a reason instead of waiting for stock." A notice asks the plainest rarity, green or better, of which its market's shelves hold under one batch's yield (10 pills, 5 talismans, a piece), and its line of why says so ("… and no shop on Pill Street has them green"). Pay stays ×1.5, ×2 graded.
- *Plots* (6): kept uncapped, the market's depth the rein.
- *Herbs at 0.7* (4), *Glimpse as it is* (3), *upkeep* (7) and *formations not sold* (8): settled as proposed.

**Round 2, the way in and feel** (Jan's calls):
- *Stock* (9, and 1's ore): Jan: "there should always be stock. It's not a rare thing. Just expensive." and "there cannot be just 8 swords for sale in a city." The cause is the shelf rule: a shop stands a tenth of a month's use (`SHELF_SHARE`), and a cultivator's basket uses 0.03 weapons and 0.03 armor a month, so the City's 5,000 cultivators get about 35 pieces of gear in all its shops and ore for 8 swords. Jan's call: **every good's shelf holds a month's use**, not a tenth (the City about 150 weapons and the ore for them). A craft's starter tool is a standing line at its craft's shops, always there at its price; Three Batches says where the furnace and the recipe are, and an empty Crafts screen says how to begin (10). The baskets don't change, so what people use and pay a month stays. For the fix session to re-measure: the haul sim (a Bag buys off deeper shelves), the craft sim's batches a month (the herbs' rein loosens; the market's buying back becomes the rein), `economy.test`'s shelf snapshots.
- *The hand before the queue* (11): Sit at the furnace opens on an empty bench and the hand warms there; a batch queued while you sit starts at the hand you hold. "Playing is the whole craft" is parked as a sketch in design.md § Still to design (it would double production while you play, undo K3's "playing never slows the bench" and touch all five minigames).
- *Raid cards* (13): a raid card's days count from when you open the feed, at least 3 and 5 real minutes, and Drive it off is offered whenever you stand at the site when you open it.
- *A raid's strength* (14): Jan: "The raid shouldn't scale or babysit the player. It's up to the area and value", and the area a soft cap, since concealment already keeps the weak from finding a site. The raider is the land's band where the site stands; a site worth ten raiders' months (300 low at Qi Condensation) draws one a band above, and never more; your own realm never enters. Concealment as now, so a rich site concealed above its land's band is safe.

**Round 3, the rest** (Jan's calls; fixes made in this session, his call):
- *15, 17, 19–31:* as proposed.
- *30:* Jan: "There should be a deed against your own side still. Unless you're high enough position." Claiming inside your own power's sphere stays a squatting deed against it, unless you hold its elder seat or higher.
- *12, 16, 18:* kept (data for the insight sketch; Jan tries placing by hand; the tray and stores hold a crafter's overflow).
- *Open questions and the review list:* the parked ideas stay parked (trees more tree-like to a design session; resource nodes, your own base, carts and a geomancer to the living world; crafters respected to P3.9; flying swords to flight; more insight keeps this checkpoint's numbers). The gather hour with divine sense is settled: a Foundation gatherer (about 22 low per four hours) stays far under a Foundation crafter (about 120). The small calls K1 to K12 stand except where this checkpoint changed them; the five minigames playing alike at every tier waits for the active-craft sketch. The code review's leftovers: a guest elder counts as a member for the leak rule; the growing array's ×2 is its density steps; gold-piece renown is capped at two points a month as sales are; `seatOf` goes through `seatGate`; commission and order actions check you stand at the counter's place; a lone cracked forge is still mended at a refiner; actions naming who acts waits for the multiplayer pass; the clay furnace one month in ten is settled by stocked tools. The dev console's three notes are fixed. The drafts stay listed under Awaiting Jan's review for him to look at in game.
