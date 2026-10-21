# The K line: what to look at

The crafts' review list for Jan, kept by the K line's hub and updated at each merge. It points into `plan.md` (Open questions, Awaiting Jan's review) rather than repeating it; the crafts play checkpoint goes through all of it (Jan's call after K4). Newest phase last.

## 1. Money to tune at the checkpoint

Crafters should be clearly richer than gathering or duty from Glimpse on (D4, K1's talk). Today only alchemy is.

- **Refining doesn't pay queued** (K4). A queued Iron Sword nets 1.3–2.9 low per four craft hours at Comprehension, against alchemy's 28–46; played at a good hand, 6–7. The market wants little gear. Levers: gear's use in the baskets, gear's price by kind, fewer ore a piece.
- **Talismans don't pay queued either** (K5). A queued Ember Talisman nets 9.8–17 at Comprehension, played 19–28, against alchemy's 28–46. Levers: a talisman's price by kind, or the shops' buy rate.
- **Herb prices** (K1). Herbs dropped 2 → 0.7 low to make alchemy pay, which also cut gathering's pay. K1's suggestion: herbs back near 1, and raise batch yield to make up for it (yield only touches the crafter).
- **The clock** (rerun at K9's merge). The opening landed (Foundation at about 2.5 attended hours), and craft mastery is anchored to the attended crafter: Comprehension at 3 batches, Mastery 12, Perfection 35, Origin 85 (were 10, 40, 120, 300). `npm run sim -- craft` still PASSes and alchemy's money hardly moved (Comprehension 30.8 and 50.7 low per four hours, was 28 and 46). Worth a look: at the City a queued Glimpse batch nets 4.4 low, under four gather hours' 7.2; only the markets' average (1.3×) keeps Glimpse above gathering.
- **Formations' money isn't measured** (K10). An array is worth 12 low at white tier 1 and its inputs about 6–8 (the jade blank, two Banner Silk, what it is drawn from), but `npm run sim -- craft gathering-flags` comes back NaN: the sim's buy-and-sell loop is written for pills. An array's worth to the player is mostly what it does at their own site, so the checkpoint can weigh whether selling arrays should pay at all.
- **What an upkeep method costs against what a crafter earns** (K11). Heavy upkeep is 2 low a day at tier 1 and 18 at tier 2 (light a quarter of that), against an alchemist's 31 to 51 low per four craft hours at Comprehension; nothing measures yet whether a crafter's day pays for a heavy method with stones to burn on top. The tide breathing's pill a day comes from the crafter's own furnace, so it costs the herbs only. Worth feeling in play. (`npm run sim -- stones` FAILs at Qi Condensation, 14% left, as it did before K11; K11 doesn't move it.)

- **What a commission pays** (K12). A posted one asks green or better, and a rarer pill's price climbs fast: Auntie Yan's notice in month 0 asks ten blue Shared-Blood Pills for 318 low (31.8 each at ×1.5, five times a white's), against a queued Comprehension crafter's 31 to 51 low per four craft hours. Four alchemy shops in the City post one each a month, so an alchemist who can land the rarity could add several hundred low a month there. Worth feeling whether that reads as the crafter's big payday or too rich; the levers are the floor's odds, the ×1.5 and the count.
- **Refiners post little** (K12). Gear runs short only at Thousand Paddocks (armor) and Heaven's Eye (weapons), so most refiners pin no notice, another face of refining paying little.

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
- **K10:** the thirteen arrays (nine on the continent, the Ward-Flag Method's two, the Pavilion's two), their recipes and inputs, Banner Silk, the Mirage Pearl and the Bronze Inscribing Plate; the eye, burn, trap and placing numbers in `content/formations.ts`; the five codex entries. Dev console `craft gathering-flags`, `item snare-disc`, `vein` and claim a cave abode, then lay into its slot on the Dwelling screen; the Map's own menu to lay on open ground, then `trap` and check it.

- **K11:** the eight upkeep methods (`src/content/catalogs/upkeep.ts`), Calm-Soul Incense and Black Iron Powder, the two burning pills, the three volley arts, the nodes that gained the three new stats, and the four codex entries. Dev console: `method pill-fed-tide-breathing` and Routine's Change, `item qi-gathering-pill 10`; for a fight, `technique five-pearl-talisman-chain`, `node talismans`, `item ember-talisman 7`, `item blood-burning-pill`, `item sword-qi-disc`, `item gutting-saber`, then `card rival-visit` and Spar with him.

- **K12:** the thirteen craft cards, their texts and stakes, the askers' roles, the commission and order numbers (`src/content/commissions.ts`), the Gate's alchemy hall post, the introduction quest A Notice on the Counter and the three codex entries. The City's Pill Street, its Commission tab, with the dev console's `commission` to fill one, and `card craft-stewards-order` and the rest by id.

## 4. Small calls the phases made on their own

Under Open questions in `plan.md`, "Small calls in K1" to "K10". The ones you're most likely to feel in play:

- **K1:** a cracked tool works nothing until mended; the bench waits while you travel; a slip's node costs 25 insight.
- **K2:** tier 1 holds 13 nodes and is held at 7; Hand's tier 2 capstones were made lift +0.5.
- **K3:** fire control plays the same at every tier; Hand's perks count only when you play.
- **K4:** tempering plays the same at every tier; the numbers are in `content/forge.ts`.
- **K5:** one-breath drawing plays the same at every tier; the talisman families are Strikes, Wards and Passage.
- **K6:** only chapter 1 of each style is written; the exam takes no hours and can be resat at once; a certified grade never lapses; the mark is a count per thing, spent first when you sell; "where its people trade" is a power's shops and its trade and secret ties. The rest are under Open questions, Small calls in K6.
- **K7:** experimenting reads your craft Dao's tiers *held*, so a fresh alchemist finds tier 1 at 1.5% a try (about nine tries with pity); a hit makes every set thrown as a batch, sure to hold; a miss gives no mastery; the panel tells you plainly whether something written lies close, and refuses a set that is your own recipe's; generated gear and talismans carry no special properties at green or blue; the shelf can run long with a full Bag. The rest are under Open questions, Small calls in K7.

- **K8:** a plot is held only at a written village or town, and every Border Wilds plot sits at qi density 3 (6 low a season); a lease running out takes the plot back with whatever grows on it; a tending sitting counts only after 10 seconds; the Wood spell is free once a season; no shop buys packets back yet; Lore's pity and seed crossing wait. The rest are under Open questions, Small calls in K8.
- **K9:** reading the land takes no clock time, once a day a spot; raiders are the land's band where the site stands, so a deep site draws Foundation raiders a Qi Condensation store rarely tempts; a raid's fight is at your realm; works only on land claimed in the wild; a hut or hidden valley holds no array slot (no vein); an abandoned abode stays in the world, hidden, its store gone. The rest are under Open questions, Small calls in K9.

- **K10:** formations' bench is queued only, the hand coming from placing when you lay; an array laid at a full hand goes up a band, its leftover lift its strength inside the band, nothing rolled; taking one up gives the flags back at the rarity they were; the eye is charged in full when laid (30 low at tier 1); a tier 1 white ward turns only Qi Condensation 1–3 raiders, so a deep site wants green or blue; arrays fight only in a raid you face at your site and in a trap's catch (flags mid-fight are K11's); a trap catches only the thunder-horned deer for now (the beast raid's roster); the guild doesn't examine formations yet. The rest are under Open questions, Small calls in K10.

- **K11:** a fed method's breakthrough bonus stays at its written rarity, only its speed and growth climb a band; the burning pill crosses no realm (a layer 9 with a blue pill still loses every time to an early Foundation: three to five turns can't take its 713 of bars, then the backlash halves you), so it is a peer-killer and a way to break off; HP, the qi pool and the shield don't burn, only the rungs; a piece is blown apart from the Bag only, never a worn one; flags set mid-fight are lost if you flee or fall; a tier 2 upkeep method run at Qi Condensation still drinks Foundation's price. The rest are under Open questions, Small calls in K11.

- **K12:** a commission is filled by any make at its rarity (your call), its price fixed the day you take it and handed in only at its counter; a by-name one and the two order cards wait for a batch of yours in the last eight; one left past its month costs the keeper's regard, nothing else; talisman shops don't make to order; the craft deck rides the seclusion deck's pace, so it adds no cards, only tilts them; the alchemy hall's furnace serves your bench wherever it works while you hold the post. The rest are under Open questions, Small calls in K12.

All five minigames play the same at every tier. Worth a look in play: should a higher tier quicken them, or, for placing, bring more currents and stones?
