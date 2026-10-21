# The K line: what to look at

The crafts' review list for Jan, kept by the K line's hub and updated at each merge. It points into `plan.md` (Open questions, Awaiting Jan's review) rather than repeating it; the crafts play checkpoint goes through all of it (Jan's call after K4). Newest phase last.

## 1. Money to tune at the checkpoint

Crafters should be clearly richer than gathering or duty from Glimpse on (D4, K1's talk). Today only alchemy is.

- **Refining doesn't pay queued** (K4). A queued Iron Sword nets 1.3–2.9 low per four craft hours at Comprehension, against alchemy's 28–46; played at a good hand, 6–7. The market wants little gear. Levers: gear's use in the baskets, gear's price by kind, fewer ore a piece.
- **Talismans don't pay queued either** (K5). A queued Ember Talisman nets 9.8–17 at Comprehension, played 19–28, against alchemy's 28–46. Levers: a talisman's price by kind, or the shops' buy rate.
- **Herb prices** (K1). Herbs dropped 2 → 0.7 low to make alchemy pay, which also cut gathering's pay. K1's suggestion: herbs back near 1, and raise batch yield to make up for it (yield only touches the crafter).
- **The clock** (rerun at K9's merge). The opening landed (Foundation at about 2.5 attended hours), and craft mastery is anchored to the attended crafter: Comprehension at 3 batches, Mastery 12, Perfection 35, Origin 85 (were 10, 40, 120, 300). `npm run sim -- craft` still PASSes and alchemy's money hardly moved (Comprehension 30.8 and 50.7 low per four hours, was 28 and 46). Worth a look: at the City a queued Glimpse batch nets 4.4 low, under four gather hours' 7.2; only the markets' average (1.3×) keeps Glimpse above gathering.

## 2. Your parked ideas

- **The minigames as the whole of an active craft** (K6). Playing could be the full making of the item, the active half apart from the idle bench, rather than lifting a queued batch. For the playtest.
- **The hand before the queue** (K5). Today a queue's first batches run before the hand is up. Your idea: play the minigame first, before the queue starts, to fill the bar.
- **Trees more tree-like** (K2). Middle ground between branches, and branches that don't all lead to the next band. With *Branches in every tree*, for a design session.
- **The gather hour and divine sense** (K1). Settled in K8: ×3 a soul realm from Foundation's divine sense, +25% a Herbs mastery level; worth feeling in play whether a Foundation gatherer now earns too close to a crafter.
- **Sects' resource nodes** (K8's talk). Herb grounds, mines and training grounds held in rotation inside a sect's sphere, found and fought over; a sketch in design § Still to design, for the living world.
- **Building your own base** (K8's talk). Lots of ways to customize a dwelling, a wild one most. K9 built clearing land, the store dug deeper and a quiet chamber; K10 lays arrays; an alchemy room on earth fire, a spring for water crops and building at a bought dwelling still wait.
- **Carts for a store, a hired geomancer** (K9). Moving your abode carries only your Bag; carting a store and hiring a geomancer wait for the living world.
- **Crafters are respected** (K1). For P3.9's scenes and K6's renown.
- **More insight for the new sinks** (after K2). A sketch in design.md; the checkpoint measures insight earned against nodes worth buying.

## 3. Drafts awaiting your review (data)

Each is listed under *Awaiting Jan's review* in `plan.md`, with where to look.

- **K1:** the 17 pill recipes and their inputs, every herb's and material's element and properties, the 16 families, the two furnaces. Dev console `craft`, the Crafts page.
- **K2:** the five craft trees' tiers 1–2 and the tier 3–9 capstone names (a few flat ones: Ancient Recipe Slips, Fused Furnace Hand). Dev console `node alchemy`, then the Trees screen.
- **K4:** the 43 refining recipes and their inputs, the Crude Iron Forge. Dev console `craft <recipe>`, the Refining page.
- **K5:** the 25 talisman recipes, the wolf-hair brush and talisman paper, Golden Light, Body-Fixing, Earth Escape, Divine Travel and the Immortal-Binding Rope. The Talisman Drawing page.
- **K6:** the eight styles' chapter 1s (the five frontier common styles, the Pavilion's, Red Marrow's and the Valley's), the four new pills, who holds which style, and the Myriad Crafts Guild's atlas entry. The City's Examination hall and the guild's counter, with the dev console's `grade` and `craftfame`.
- **K7:** the generated recipes' names (two words an element, an effect word and a kind each, Fierce for a toxic pill), their sizes and the floor's odds, and the Experiment tab's words. Any craft page's Experiment tab: `herbs 20` fills the shelf, and after a miss `pity` makes the next throw of that set all but find.
- **K8:** the sixteen crops and their bed counts (30 at a white floor down to 1 at gold), the packets' names, the four boosters (Spirit Soil, Earth Milk, the Spring-Rain and Pest-Warding Talismans) and the Fields door's words. Dev console `at spear-plow`, then `farm` (and `farm 100` to age the beds), on the Crafts screen's Farming page.
- **K9:** the dwellings table (rents, stores, slots, the broker's lines), your quarters' names by seat, the three works, the raid cards and the chronicle's dwelling lines. Dev console `vein` then the Map's Journey to claim a cave abode; `at qm-shoukou-cheng` and the City's Broker door; the Dwelling screen 居.

## 4. Small calls the phases made on their own

Under Open questions in `plan.md`, "Small calls in K1" to "K9". The ones you're most likely to feel in play:

- **K1:** a cracked tool works nothing until mended; the bench waits while you travel; a slip's node costs 25 insight.
- **K2:** tier 1 holds 13 nodes and is held at 7; Hand's tier 2 capstones were made lift +0.5.
- **K3:** fire control plays the same at every tier; Hand's perks count only when you play.
- **K4:** tempering plays the same at every tier; the numbers are in `content/forge.ts`.
- **K5:** one-breath drawing plays the same at every tier; the talisman families are Strikes, Wards and Passage.
- **K6:** only chapter 1 of each style is written; the exam takes no hours and can be resat at once; a certified grade never lapses; the mark is a count per thing, spent first when you sell; "where its people trade" is a power's shops and its trade and secret ties. The rest are under Open questions, Small calls in K6.
- **K7:** experimenting reads your craft Dao's tiers *held*, so a fresh alchemist finds tier 1 at 1.5% a try (about nine tries with pity); a hit makes every set thrown as a batch, sure to hold; a miss gives no mastery; the panel tells you plainly whether something written lies close, and refuses a set that is your own recipe's; generated gear and talismans carry no special properties at green or blue; the shelf can run long with a full Bag. The rest are under Open questions, Small calls in K7.

- **K8:** a plot is held only at a written village or town, and every Border Wilds plot sits at qi density 3 (6 low a season); a lease running out takes the plot back with whatever grows on it; a tending sitting counts only after 10 seconds; the Wood spell is free once a season; no shop buys packets back yet; Lore's pity and seed crossing wait. The rest are under Open questions, Small calls in K8.
- **K9:** reading the land takes no clock time, once a day a spot; raiders are the land's band where the site stands, so a deep site draws Foundation raiders a Qi Condensation store rarely tempts; a raid's fight is at your realm; works only on land claimed in the wild; a hut or hidden valley holds no array slot (no vein); an abandoned abode stays in the world, hidden, its store gone. The rest are under Open questions, Small calls in K9.

All four minigames play the same at every tier. Worth a look in play: should a higher tier quicken them?
