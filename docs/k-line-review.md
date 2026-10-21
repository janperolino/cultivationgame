# The K line: what to look at

The crafts' review list for Jan, kept by the K line's hub and updated at each merge. It points into `plan.md` (Open questions, Awaiting Jan's review) rather than repeating it; the crafts play checkpoint goes through all of it (Jan's call after K4). Newest phase last.

## 1. Money to tune at the checkpoint

Crafters should be clearly richer than gathering or duty from Glimpse on (D4, K1's talk). Today only alchemy is.

- **Refining doesn't pay queued** (K4). A queued Iron Sword nets 1.3–2.9 low per four craft hours at Comprehension, against alchemy's 28–46; played at a good hand, 6–7. The market wants little gear. Levers: gear's use in the baskets, gear's price by kind, fewer ore a piece.
- **Talismans don't pay queued either** (K5). A queued Ember Talisman nets 9.8–17 at Comprehension, played 19–28, against alchemy's 28–46. Levers: a talisman's price by kind, or the shops' buy rate.
- **Herb prices** (K1). Herbs dropped 2 → 0.7 low to make alchemy pay, which also cut gathering's pay. K1's suggestion: herbs back near 1, and raise batch yield to make up for it (yield only touches the crafter).
- **The clock.** Once the friends' line's opening lands (Foundation at about 2.5 attended hours), every crafts number is rerun on the new clock.

## 2. Your parked ideas

- **The minigames as the whole of an active craft** (K6). Playing could be the full making of the item, the active half apart from the idle bench, rather than lifting a queued batch. For the playtest.
- **The hand before the queue** (K5). Today a queue's first batches run before the hand is up. Your idea: play the minigame first, before the queue starts, to fill the bar.
- **Trees more tree-like** (K2). Middle ground between branches, and branches that don't all lead to the next band. With *Branches in every tree*, for a design session.
- **The gather hour and divine sense** (K1). Gathering should scale with Spirit Farming and the soul's reach. K8 decides it.
- **Crafters are respected** (K1). For P3.9's scenes and K6's renown.
- **More insight for the new sinks** (after K2). A sketch in design.md; the checkpoint measures insight earned against nodes worth buying.

## 3. Drafts awaiting your review (data)

Each is listed under *Awaiting Jan's review* in `plan.md`, with where to look.

- **K1:** the 17 pill recipes and their inputs, every herb's and material's element and properties, the 16 families, the two furnaces. Dev console `craft`, the Crafts page.
- **K2:** the five craft trees' tiers 1–2 and the tier 3–9 capstone names (a few flat ones: Ancient Recipe Slips, Fused Furnace Hand). Dev console `node alchemy`, then the Trees screen.
- **K4:** the 43 refining recipes and their inputs, the Crude Iron Forge. Dev console `craft <recipe>`, the Refining page.
- **K5:** the 25 talisman recipes, the wolf-hair brush and talisman paper, Golden Light, Body-Fixing, Earth Escape, Divine Travel and the Immortal-Binding Rope. The Talisman Drawing page.
- **K6:** the eight styles' chapter 1s (the five frontier common styles, the Pavilion's, Red Marrow's and the Valley's), the four new pills, who holds which style, and the Myriad Crafts Guild's atlas entry. The City's Examination hall and the guild's counter, with the dev console's `grade` and `craftfame`.

## 4. Small calls the phases made on their own

Under Open questions in `plan.md`, "Small calls in K1" to "K5". The ones you're most likely to feel in play:

- **K1:** a cracked tool works nothing until mended; the bench waits while you travel; a slip's node costs 25 insight.
- **K2:** tier 1 holds 13 nodes and is held at 7; Hand's tier 2 capstones were made lift +0.5.
- **K3:** fire control plays the same at every tier; Hand's perks count only when you play.
- **K4:** tempering plays the same at every tier; the numbers are in `content/forge.ts`.
- **K5:** one-breath drawing plays the same at every tier; the talisman families are Strikes, Wards and Passage.
- **K6:** only chapter 1 of each style is written; the exam takes no hours and can be resat at once; a certified grade never lapses; the mark is a count per thing, spent first when you sell; "where its people trade" is a power's shops and its trade and secret ties. The rest are under Open questions, Small calls in K6.

All three minigames play the same at every tier. Worth a look in play: should a higher tier quicken them?
