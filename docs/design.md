<!-- The source of truth for the game's rules; edit it here. The claude.ai copy it came from is a frozen archive. -->
# Severed Heaven: Design

Build it as a web game where idle seclusion and an AI-narrated world are two views of one simulation. Your code owns every number; GLM 5.2 only interprets what you type and narrates what the rules decided.

Numbers are starting values the sims tune; when a sim moves one, change it here too.

## Decisions so far

The calls everything else builds on.

| Decision | Choice | Why |
|---|---|---|
| Engine | Web: TypeScript, React, Vite | An idle game is menus and numbers, and the adventure is streamed text. Browsers do both best. |
| Players and AI bill | You and friends, on your own OpenRouter key | No accounts or backend for now; Tech stack covers how friends get access. |
| Cultivation | Three paths, qi, body and soul: your realm is your highest ladder and the others never count below half of it; each ladder climbs with its own method in the twelve double-hours of your day | The Mortal's Journey model. A routine reads as a cultivator's life, not a budget sheet, and finding a body or soul method is an event. |
| Progression | The big three, each with a level and a tree, plus Dao and Way trees; insight buys nodes, and mastery is for techniques, methods and recipes | Trees hold what you understand and how you live; mastery holds what you practice. |
| Power and pedigree | One rarity scale for everything, as a band: purple is the half-step, gold, red and pristine the next realm; a six-line sheet with no dice, compared by ratio; a fighting-up ledger the fight sim enforces | Geniuses fight up and ordinary cultivators don't, through the same rules for players and NPCs, and the sheet says in stage words where each line stands. |
| World | Severed Heaven: a prosperous middle thousand world about a million li across, written by hand in the atlas; nested, fog of war, random start | Each area feels like everything until you outgrow it. |
| Tone | Cutthroat by default; warmth is earned | GLM leans agreeable, so the rules, not the prose, decide who betrays whom. |
| Combat | Text only: a turn-based rules engine, with free-text input on top | Creative moves earn bonuses, but your cultivation still decides who wins. |
| AI model | GLM 5.2, thinking off | Unlike GLM 5.3, its thinking can be switched off, which roughly halves the cost and cuts the wait. |
| Multiplayer | After v1: friends as NPCs in your world, then co-op go-in sessions; no shared persistent world | Most of the fun of playing with friends, with no server that owns the world, so personal calendars and editable saves stay. The core is built for it: rules take any cultivator, events are typed, randomness runs in named streams and fight turns take many actors. |
| Story | One card format for everything that happens to you, idle or in the world, working without the AI | A seclusion event, a summons, an encounter and the coming-back summary share one engine and one screen pattern, so the game reads as a life rather than a ledger, and the AI only rewrites text. |

## How the two halves connect

Seclusion turns time into power; the world turns that power into the materials, epiphanies and connections seclusion can't make. Neither half gets far alone.

Idle never stops; it changes hands. While you wander, your formations keep filling a spirit pool that you absorb when you return. Raising the pool's cap is an upgrade, and it sets how long you can stay out without waste.

**Seclusion has two states: attended and away.** You are attending while the game's tab is visible and you have touched it in the last few minutes; otherwise you are away. Away is the floor and never punishes anyone. Attending pays: being there is worth ×1.25 on qi, drawing qi in by hand (Attended seclusion, under Cultivation) lifts it toward ×2, and attended hours leave insight that away hours never do. Both are rates on in-game time, and the ceiling grows later through accessories, abodes, talents, methods and nodes, but it stays a ceiling. Attending counts on any screen; the planning parts of the seat, the day wheel and the trees, stay planning, with no reflex layer, and wherever the seat gets hands-on it reuses one grammar, handling qi: watch, breathe, catch, don't overheat.

**The seat is a side income; the world is where power comes from.** Go-in is uncapped because a trip brings back what seclusion can't make at all: pills, methods, manuals, epiphanies and people. The sims keep the world meatier than the seat, and the world is designed for a player who is there. Going in is away by definition, so the spirit pool fills at the away rate and nothing is counted twice.

The calendar runs on seclusion time: one real hour is one in-game year at Qi Condensation. The clock speeds up with each realm so any realm's full lifespan lasts about 120 real hours: roughly 1.7 years an hour at Foundation, 4 at Core Formation, 8 at Nascent Soul. A year is 360 days, twelve months of thirty.

**The world's calendar is the Sealed Era** (封纪, the atlas's current era). World day 0 is the first day of Sealed Era 3,115, so a first life, born that day, reaches its first hour at 12 in 3,127, the atlas's "now". The clock never restarts: when a life ends, the world runs on and the next life in the slot starts in the world's year, which is what lets people, letters, rumors and earlier lives share one time. Years are written as numbers ("Sealed Era 3,137", "age 22"), never spelled out, since they run into the thousands.

Actions in the world spend hours or days of in-game time. Death never comes while you're offline: you wake at the edge of your lifespan with a last chance to break through. Offline time counts for up to 12 real hours, and an abode upgrade raises the cap later.

**You can run the clock slower.** Each qi realm you reach unlocks its calendar speed, and a life can run at any speed it has unlocked: a Nascent Soul cultivator can keep Qi Condensation's year an hour. Gains, costs and lifespan all count in-game time, so a slower clock is never stronger, only slower. It keeps a fast world readable, and the offline cap then covers fewer years. The choice is saved with the slot.

## World bible

The game plays out in Severed Heaven, one middle thousand world, written by hand and the same in every save; only where you're born is random. Neighboring worlds, the great worlds above and the realms past Tribulation Transcendence stay sketches until the game gets there.

**The world lives in the Severed Heaven Atlas**, `content/atlas/entries.json`, which `node tools/atlas-serve.cjs` opens as a map where every continent, region, kingdom, sect, landmark and era is an entry we both edit. The doc keeps the rules and the atlas keeps the world. Everything in it is a draft until it's marked canon.

**Scale.** Severed Heaven is a flat disc about 1,000,000 li across (1 li is half a kilometer). Six continents ring the Shattered Sea, where the Heaven Ladder to the great world broke 66,000 years ago.

**The world at its true size.** This is the yardstick every session reads before writing lore, a prompt or a scene. Severed Heaven is not medieval fantasy: it is vast, crowded at its heart and empty at its edges, and what stands out on it is what cultivation built.

| Thing | li | km | For a sense of it |
|---|---|---|---|
| The world, a disc | 1,000,000 | 500,000 | about 385 Earths of surface |
| A continent (Morning Star) | 250,000 × 280,000 | 125,000 × 140,000 | about 90 times Earth's land |
| A region (the Border Wilds) | about 60,000 | about 30,000 | about 5 times Earth's land |
| A kingdom (the March of Pacified Borders) | 12,000 | 6,000 | Australia |
| A square of the map painting, cut round a place | 6,000 | 3,000 | 1,024 px, about 3 km a pixel |
| A pixel at the map's closest zoom | 6 | 3 | a city 150 li across is 25 px |

- **Kingdoms are islands in the wilds.** A region's kingdoms cover under a tenth of it; the rest is beast wilds, karst, forest and forbidden land, which is why the beasts own the frontier and why a road matters.
- **A written town or village is a seat.** Two of the March's written villages stand 2,700 km apart; each is the seat of a county the size of a country. `town` and `village` say which doors it has (Entering a place), never how small it is.
- **What the map's height shows** is what cultivation built, never a mortal building: a place under about 10 li across vanishes. Walls as tall as cliffs, formation arrays as domes of light, beacon spirit-fire as pillars, sect halls on peaks, beast-king bones the size of hills, rivers cut by a sword. The painting draws a place at the size of one of its own peaks, as it draws the peaks larger than they are; an atlas place's `fromAbove` says what that is.
- **Sizes in prose** are in li or in things of their own scale (a skull the size of a hill, a wall a day's flight long), never in mortal yardsticks (carts, houses, a watchtower) for something meant to be grand. Close in, a scene still has its doors and stalls: the patrol walk, the drill yard, the bounty office stay person-sized.
- **Distance is time.** Crossing a kingdom on foot is months and a region half a year (Travel); a Core Formation flies a region in a month. Nobody pops over to the next county.

**How many live there.** Approximate, for the narrator and the atlas's `population`; nothing counts heads.

- **Mortals,** per km² of a kingdom's land, by the land's qi density (fat land feeds more): 1 0.1, 2 0.5, 3 2, 4 5, 5 12, 6 30, 7 60, 8 100, 9 150. Terrain moves it: river plains ×2; mountains, volcanic land, steppe, karst and ranchland ×0.5; marsh ×0.3. The wilds hold about a hundredth of their kingdoms' rate: hunters, hermits, hidden clans. So the March holds about 44 million, the whole Border Wilds about 110 million (its 750 million km² mostly wild), the Imperial Domain, the heartland, about 20 billion and the Morning Star Continent about 75 billion. The atlas names only a few of a region's kingdoms; in a settled region the unnamed ones hold most of its people, while on the frontier the named few are nearly all there is.
- **Rooted children,** found on testing day, by qi density: 1 in 3,000 at 3 (thin), 1 in 2,500 at 4, 1 in 2,000 at 5 (ordinary), 1 in 1,500 at 6, 1 in 1,000 at 7 (abundant), 1 in 700 at 8, 1 in 500 at 9 (heaven-touched). Most of them never leave Qi Condensation.
- **Each realm holds a share of the one below,** narrowing as heaven narrows it (gate pills, tribulations, heart demons): Foundation 1/30 of Qi Condensation, Core Formation 1/60, Nascent Soul 1/50, Deity Transformation 1/20, Void Refinement 1/10. Past that the world counts by name: about twenty Body Integration, under ten Mahayana, a few hidden Tribulation Transcenders.

| | Qi Condensation | Foundation | Core Formation | Nascent Soul | Deity Transformation | Void Refinement |
|---|---|---|---|---|---|---|
| A frontier region (the Border Wilds) | about 50,000 | about 1,700 | about 30 | about 3 | | |
| The heartland (the Imperial Domain) | about 20 million | about 670,000 | about 11,000 | about 220 | about 11 | |
| The Morning Star Continent | about 55 million | about 1.9 million | about 31,000 | about 620 | about 20 | about 2, and the Ancestor Emperor at Body Integration |

The bottom of the pyramid grows with the mortals and the qi; the top is held by heaven, so the heartland holds four hundred times the frontier's Qi Condensation and only some sixty times its Nascent Souls. A frontier town meets Qi Condensation drifters and a Nascent Soul is an event there; in the heartland a Core Formation elder is a district's patron.

**The tide.** Severed Heaven circles its great world, which hangs in the night sky as the Mirror, on an orbit of about 90,000 years. Close in, the Mirror's qi floods across (the High Tide); far out, it thins (the Ebb). The game is set near the peak of a High Tide, which is why sects are crowded and competition is fierce.

| World rank | What it is | In the game |
|---|---|---|
| Void sea | the endless dark between worlds | worlds drift in it, and the bigger ones' gravity gathers the smaller around them |
| Great thousand world | an immortal realm, one of many adrift in the void sea | each anchors a crowd of middle thousand worlds; where ascension leads, not expanded |
| Middle thousand world | a full world of continents, seas and sects | home: a prosperous one, with rich qi, crowded sects and fierce competition for everything |
| Small thousand world | a minor world with thin qi and a low ceiling; many crowd around each middle world | reached through secret realms and void rifts; some are broken fragments |
| Spatial cave abode | a pocket space a strong cultivator folds out of the void | inheritances hide inside them; owning one is a late-game idea for after v1 |

**History is written by hand**, big to small, along with the continents, regions, great sects and their spheres of influence. It explains the present: ruins, feuds, lost inheritances, sealed secret realms and the legends NPCs tell.

**Big places are in the atlas; small ones are written or seeded.** The atlas holds the kingdoms, cities, landmarks and powers, and their veins; a region's towns and villages are written by hand as data, and its wild sites are seeded from written tables by terrain (The world, The fog, Sites). Nothing is invented in play. The save keeps everything, so the world never changes behind your back. Your birthplace is rolled from your origin talent.

**Names are translated**, the way webnovel translations do it: Clear Heaven Sword Sect, Morning Star Continent, the Shattered Sea. Pinyin and hanzi sit underneath as flavor (Qingxiao Jianzong, 清霄剑宗). People and family names stay in pinyin: Elder Mo, the Huyan clan.

**Races** of a prosperous middle thousand world:

| Race | What they are | Where you meet them |
|---|---|---|
| Humans | most cultivators and every mortal kingdom | everywhere |
| Spirit beasts | animals that cultivate; at Nascent Soul they can take human form | beast mountain ranges and wild forests; some ally with sects |
| Sea clans | aquatic beasts and their transformed kin, with dragon bloodlines at the top | the seas between continents |
| Ghosts | dead souls cultivating yin qi; the strong ones remember who they were | yin lands, old battlefields, ghost markets |
| Spirit plants | herbs and trees that wake after millennia, part treasure and part character | deep forests and secret realms |
| Half-bloods | humans carrying a beast or ghost bloodline, prized and feared | anywhere, often hidden |
| Outer demons | beings from beyond the world barrier that whisper through heart demons and break in during calamities | rarely, and the world shakes when they do |

You play a human in v1; a bloodline can come with a talent roll.

## Scale of destruction

The gap between realms widens as you climb, as in the novels: about ninefold from Qi Condensation to Foundation, thirtyfold to Core Formation, and a hundredfold from Nascent Soul up. The world is built around that gap. It is one number per realm, the realm curve, kept in `src/content/realms.ts`, and everything that grows with realm follows it: power, the qi each realm needs, income, prices, and the power of items, talismans and arrays. GLM's world bible and the engine both read from it. Combat has its own, steeper sizes per realm (Combat, Realms are sizes), since fights should feel the full gap of the novels while the economy stays tradeable.

| Realm | All-out destruction | Senses and travel | How common | How the world treats them |
|---|---|---|---|---|
| Mortal martial master | a door, a few bones; worth ~10 soldiers | eyes and ears; a horse's pace | the strongest in most villages | heroes to mortals, insects to cultivators |
| Qi Condensation | a house; boulders shatter; worth ~50 soldiers | feels qi a few meters away; outruns a horse | tens of thousands in a frontier region, tens of millions in a heartland one, mostly sect disciples | mortals call them immortals; sects treat them as servants and recruits |
| Foundation Establishment | a street; a hill cracks; worth ~1,000 soldiers | divine sense to ~1 km; short sword flights | thousands in a frontier region, hundreds of thousands in a heartland one | inner disciples and small-sect elders; mortal kings court them |
| Core Formation | a town; a hill splits, a river changes course | divine sense ~10 km; flies ~1,000 km a day | dozens in a frontier region, about ten thousand in a heartland one | elders and sect masters; one can topple a mortal kingdom |
| Nascent Soul | a city; a mountain peak falls | ~100 km; blinks short distances; the soul can flee a dying body | a handful in a frontier region, a couple of hundred in a heartland one | sect ancestors; the strongest card a sect holds |
| Deity Transformation | a mountain range; the weather follows their mood | a whole province, ~1,000 km; crosses a continent in days | dozens per continent; every great power has several | their seclusion or anger is a political event |
| Void Refinement | a country-sized region; space tears around them | ~5,000 km, through space; walks the void | a few per continent, kept in seclusion as sect ancestors | a great power's hidden foundation; whole sects exist to serve one |
| Body Integration | a great region, ~10,000 km across; draws on heaven and earth | ~20,000 km; steps across regions | about twenty in the world | a power of their own; one moving shakes a continent |
| Mahayana | a fifth of a continent, ~30,000 km; holds a continent's balance | ~50,000 km, a third of a continent | fewer than ten in the world | rules from behind the curtain, if at all |
| Tribulation Transcendence | a continent at most, scarred, never erased | the whole continent, never past it | a handful, hiding from their last tribulation or waiting to ascend | heaven itself holds them back |

**Rules the world follows**

- The world holds. A middle thousand world never breaks under its own cultivators: the most anyone below True Immortal does is scar a continent, and only True Immortals, the next world's first realm, strain a world. The top rows follow A Record of a Mortal's Journey, whose Spirit World keeps many continents with a dozen Mahayanas to a great race and senses them at about 10,000 to 100,000 km (readers' tables; our continent, Morning Star, is 125,000 × 140,000 km).
- Realm pressure: a foe two or more major realms above your soul can pin you with their aura; from Nascent Soul up, one realm is enough. You can only talk, beg or burn an escape talisman.
- Protective qi: from a lower realm, a hit whose Attack doesn't beat your Defense does a twentieth, so a crowd of juniors can't wear down one cultivator a realm up (Combat, Protective qi).
- Your realm is your highest ladder, body and soul included: a cultivator with a Core Formation body and Foundation qi is a Core Formation body refiner, and hits like one (Cultivation, Three paths).
- No treaties, just consequences: wrecking a place inside a faction's sphere of influence costs standing with that faction. A name for killing mortals costs standing with righteous factions as far as your fame reaches; demonic sects don't care.
- Sects sit on remote spirit veins, so big fights happen in the wilds, away from mortals.
- Defenses scale with the vein: a place's arrays burn its stones and are rated to its vein's realm (`vein`, The atlas as data), so a sect on a strong vein stops what a village on none can't, and a Foundation cultivator walks through a village's.
- Scars stay: fights from Core Formation up leave marks the map remembers, such as a split hill or a burned valley, and the narrator brings them back.
- Cultivators can hide their realm. A stronger soul or a detection art sees through it, which keeps the weak-looking-stranger trope alive.

**How the game uses it**

- The table sits in GLM's world bible, so narration keeps scale: a Qi Condensation punch cracks a wall, never a mountain.
- The interpreter marks out-of-scale actions infeasible.
- NPC generation follows "How common" (and How many live there): a frontier town has Qi Condensation drifters, a capital has a Core Formation patron, and on the frontier a Nascent Soul arrives as a plot event.
- The engine scales area effects and collateral damage by realm.

## The world map

The world is original, enormous and nested. Each area feels like everything until you reach its top, then the map pulls back to show how small it was.

| Map tier | What it holds | Who sits at the top | How it opens |
|---|---|---|---|
| Kingdom | a mortal state 5,000-15,000 li across (2,500-7,500 km), tens of millions of mortals to billions, a few small sects, county seats | Foundation Establishment where you can start; harsher lands hold more | where most lives start |
| Region | 40,000-90,000 li of kingdoms and wilds, rival mid-size sects, a great market city | on the frontier, Core Formation elders and a handful of Nascent Soul ancestors; in the heartland, Nascent Soul ancestors and a Deity Transformation or two | reach Core Formation, or a sect posts you outward |
| Continent | 200,000-300,000 li holding great sects, ancient clans and demonic strongholds | Deity Transformation, with a few Void Refinement ancestors in seclusion | reach Nascent Soul, find a teleport array, or read a great sect's maps |
| World | this whole middle thousand world: continents, seas and forbidden lands | about twenty Body Integration, fewer than ten Mahayana, a few hidden Tribulation Transcenders | reach Deity Transformation, or follow a legend |
| Beyond | the great thousand world, where immortals go | unknown | ascension, after v1 |

**Fog of war.** The in-game map shows only what you know, in four states. Seen: places you have travelled, plus a soft circle of divine sense around you (its range is in the scale table). Sketched: outlines from bought or looted maps, with nothing inside. Rumored: a mark and a name from sect libraries and rumors, with no outline. Unknown: cracked fog, the same dark glass as the rest of the game. The glass study (`docs/mockups/glass-study.html`) shows all four. The fog is kept per place, and what reveals what is under The world: travel, trips and encounters, The fog.

**Where you start is part of the roll.** A village orphan sees one kingdom and takes it for the world. A child born into a great sect starts just as weak, but with the continent's maps, its politics and its libraries. What each start knows is under The fog.

**The atlas as data.** Prose is the narrator's and fields are the engine's: `summary`, `lore` and `truth` stay GLM's, and anything a rule branches on is a field, never read from prose. Lore and truth are the only two layers of knowing (The fog, told and true). The fields:

- `terrain` on every land place, kingdoms included; one left out takes its region's. Sight, sites and the encounter tables read it.
- `hidden`: left out for a place anyone can see, `true` for one a Soul check or divine sense finds, or a realm for one only a soul at that realm finds.
- `access` on gated places and secret realms: what opens it (a token, a rank, an invitation, a toll in stones) and its array's realm rating, and for a secret realm an entry cap, a requirement and a cycle. The Realm of Mingled Blood: below Foundation, beast blood or a bonded beast, every 7 years for 30 days.
- `ties` on any entry: each names another entry, a kind (enemy, ally, trade, kin, patron, debt, feud, secret), whether it is open or hidden, and a one-line why, written on both ends. The hostile rule reads enemy ties, and rumors and plot encounters travel along them.
- The `famous` tag, which a start reads to rumor the region's famous places.
- `features` on any place: the tagged features its scenes build from.
- The scale fields, on places and powers; World bible, The world at its true size, has the numbers they follow:
  - `vein`, 0 to 9: **the tier of the strongest spirit vein a place or power sits on** on the same tiers as methods, techniques and artifacts: tier n keeps realm n, 1 Qi Condensation, 2 Foundation, 3 Core Formation, 4 Nascent Soul, 5 Deity Transformation, 6 Void Refinement, 7 Body Integration, 8 Mahayana, 9 Tribulation Transcendence, and 0 is no vein, mortals only. A cultivator climbs only as far as the vein under them feeds, so the strong, and the sects, clans and crowns they lead, are drawn to veins as the one resource that lasts, and pool toward a continent's heart where the veins run strongest. A region's or continent's vein is never written: `atlas:build` takes its strongest place's. A vein sets three things: an array's realm rating where `access` gives none (Scale of destruction, Defenses scale with the vein), so a tier 2's stop Foundation and break to Core Formation; the grade of spirit stone it yields, tiers 1 and 2 low-grade, 3 mid, 4 and 5 high, 6 and up top, as the money table (Economy) uses them; and so what a market's purse can hold. Veins are things in the world: fought over (the Black Jade Vein), found (a hidden vein is a treasure map's best find), new (the Red Rocks' vein that broke the surface last year) or tapped out.
  - **`top` above the vein is a story.** `top` says who is there now and `vein` who the place can keep, so someone stronger than the vein feeds needs a reason, written in `top`'s note: duty (a sword-sect elder posted to the foothills), gain (there for the cores), a dead end (an old cultivator who stopped climbing and went home), hiding, or a beast's lair (the Stone Forest's python). `npm run atlas:build` warns on a gap with no note. `top` below the vein needs nothing: the strong of a rich place are often away.
  - **Qi density and veins are two jobs.** Qi density is the land's ambient qi, owned by nobody: it sets how strong the wilds run, how many children are born rooted and how many mortals the land holds. A vein is a point a place or power sits on and can lose: it sets who can be kept there, the stones mined and the arrays. Prosperity, how well-off a place is from trade and war, says how much of its vein's scale its market fills (Economy, Prosperity).
  - `prosperity`, 1 to 9, on a place or power: ruined, poor, lean, modest, ordinary, thriving, rich, flourishing, golden. A place without one takes its nearest ancestor's, ordinary (5) when none is written, so a region's value is what most of its places read. It is the written value play drifts back to (Economy, Prosperity).
  - `population`: about how many live there, mortals and cultivators by realm (`mortals`, `qi`, `foundation`, `core`, `nascent`, `deity`, `void`); a kingdom or region counts its whole land, a city or town its seat, a power its members. Round numbers for the narrator; no rule counts heads.
  - `size`: li across, or li long for a wall, a road or a river work.
  - `fromAbove`: one line on what shows from the map's height, which a place painted into the map is painted from (`docs/art-pipeline.md` § The travel map).

A seeded site is the same record, kind `site` with a sub-kind (town, village, cave, den, ruin, shrine, herb valley), kept in the save; a hand-written one may join the atlas.

**Connected, not forced.** Places, powers, people and plots tie together through wants that both sides act on, a public layer and a hidden one, grown from the map outward and mostly ordinary, and in play the generator and GLM draw on the ties already there rather than inventing new conflicts. The guide and the writing workflow are in `content/atlas/README.md`, How things connect, which every session and agent writing the atlas reads first.

**Size without lag.** Regions near you simulate in detail; distant ones tick in yearly summaries until you arrive. The map view zooms between tiers, and when a new tier opens, your old world shrinks to a dot on it.

## Cultivation: the big three, Daos, Ways and techniques

Qi, Body and Soul are the big three. Qi cultivation is the ladder, as in Mortal's Journey: it sets your realm, lifespan and place in the world. Every major breakthrough needs something from the world.

| Realm | Stages | Lifespan (years) | Gate to break in |
|---|---|---|---|
| Qi Condensation | layers 1–9 | 120 | none: the tutorial |
| Foundation Establishment | early, middle, late, peak | 200 | a Foundation Pill, bought, looted or brewed |
| Core Formation | 4 stages | 500 | a core-forming pill |
| Nascent Soul | 4 stages | 1,000 | a 3-wave lightning tribulation and your first heart demon |
| Deity Transformation to Tribulation Transcendence | 4 stages each | 2,000 and up | longer tribulations, stronger heart demons |

Every major breakthrough also needs a full qi bar and an insight threshold; the gate column is the extra piece. Lifespans and gates are design values to tune, not canon.

**Breakthroughs.** When a bar fills, the next layer or stage is a check at the odds its button under Cultivate's figure shows. Layers 1 and 2 always succeed, and layer 3 is the first real check. The bar keeps filling past full up to 150%, and each extra 10% raises the odds 7 points, so the choice is to go now or consolidate.

An attended attempt, on any of the three ladders, is a scene on the figure: a wind-up of about four seconds where the circulation slows, the gates light round the loop one by one and the glass darkens, then for ten seconds the circulation races, a spark passes the six gates, and each one you tap or click on time adds a bounded step to the odds, like overfill (2% a gate, 10% at most); a miss costs nothing, and a tap just early spends that gate, so tapping fast never pays. The code still owns the roll. At layers 1 and 2, which always succeed, the scene teaches itself without stakes (at the figure, those steps play it on their own), and an attempt made away or on auto skips it.

A failed minor breakthrough costs a fifth of the bar and a few days of unsettled qi (five), with no injury below Foundation and gains halved for 180 days from Foundation up. Offline, minor breakthroughs run on an auto setting, safe odds by default. Major breakthroughs never happen offline: the bar fills on to its 150% and waits there, and the coming-back card says which ladders are ready. A failed major breakthrough spends its offerings (the gate pill among them), halves the bar and leaves an injury that halves cultivation for three in-game years. At the lifespan edge, the last chance lets you attempt the major breakthrough below a full bar with the gate pill laid alone, at worse odds and a flawed grade at best; without the pill, or if it fails, the life ends.

**Offerings.** A major attempt on any ladder takes up to three items laid on it, spent whether it succeeds or fails. The major that takes your realm into a new realm needs its path's gate, and it counts as one of the three: the Foundation Pill or the core-forming pill on qi, a body gate on body and a soul gate on soul (Three paths). Foundation's are the Foundation Pill, the Marrow-Washing Pill 洗髓丹 and the Soul-Condensing Pill 凝魂丹, priced alike; body and soul share the core-forming pill for now. When two ladders stand at the same top realm, the first to break through pays the gate and the other then catches up free. The last chance at the lifespan edge is tried on whichever ladder's major would raise your realm, laying that path's gate. A ladder catching up below your realm needs no gate and climbs on tempering or nourishment alone, only slower, so leading costs a gate and catching up stays cheap. An offering is any item with the offer use (Items and gear), and what it does is its tags, each with a size: steadying adds odds; surging adds grade margin and costs odds; purifying halves the injury and clears toxicity; guarding keeps the bar on failure. A ladder tag, qi, body or soul, doubles the item on its own ladder: Tempered Marrow, refined from a Foundation beast, is the body offering and a Soul-Settling Pearl the soul one, and both come out of the Border Wilds' beast hunting. An offering of your root's element adds 7 points of odds, as a tenth of overfill does; an offering of gold or better carries a gold method's margin to heavenly. Sizes follow rarity on the shared curve: a steadying herb gives +3 points of odds at white, +7 at purple and +12 at gold, and a surging one +0.1, +0.25 and +0.5 margin for the same odds taken away. The attempt lists everything you hold with the offer use, and the auto setting lays nothing.

**The day is twelve double-hours.** Seclusion runs on a wheel of the twelve 时辰, from 子 at midnight round to 亥, and you set each hour to one thing you do with your own time: cultivate qi, temper the body, nourish the soul, study, practice a technique, or sleep. Furnace, forge, garden, beast and shop hours join as those systems arrive, and so do a job's duty hours (Duty hours, below). Whatever others do for you runs outside the wheel: disciples' queues, arrays, puppets and fields growing in real time. So every step of automation hands hours back to cultivation. Aptitude and talents set how fast each hour pays off, and lifespan caps the total, so spreading too thin means dying before the next breakthrough.

- Element hours: each earthly branch carries an element: 寅 and 卯 wood, 巳 and 午 fire, 申 and 酉 metal, 亥 and 子 water, and 辰, 戌, 丑 and 未 earth. Work that matches its hour's element pays about 25% more: a fire root cultivates best at 巳 and 午, alchemy is strongest at noon, and Ghost Way and other yin work belong to the night. A root matches every hour of each element it holds, so a mixed root matches most of the day and an earth root twice the hours of a fire one; that is just how it is, and the other elements find their bonuses elsewhere. Lightning and wind count as wood and ice as water, as combat does. A tempering or nourishing art may carry an element too, and then its hours match the same way; talent, resources and environment are the fast road for body and soul in any case. Dawn's purple qi at 卯 adds about 10% to everyone's qi.
- Sleep: at Qi Condensation the body is still mostly mortal, and 子 and 丑 are locked to sleep. Foundation frees them: "You no longer need sleep; two more hours are yours."
- Duty hours: a job you hold puts its work on your wheel, as the Caravan guard routine already does on the road. A job is a data entry, not code: who gives it (a garrison, a sect, a guild, a shop, an office), its shift as hours on the home wheel, its pay and what it grows (standing with its power, and a sect's duty the Orthodox Way). While you hold it, its hours are a **Duty** 值 kind of their own, named for the work ("Patrol the Wall") and locked like sleep: the 值 seal over a lock on the wheel, and an arc on the bezel naming the work, dashed red while the shift goes unkept. Your own choice for the hour stays underneath and comes back when you leave the job, and a Duty hour counts as kept for any learned routine, so the cadet keeps Wall Drill's discipline. A shift is kept by standing at the job's place with no course set as its hours pass; each duty day pays (Professions, people and powers, Posts). Missing a shift (away on the road, or anywhere but its place) costs standing with the giver, "Missed our shifts", −1 a duty day to −10, fading over a season, unless a house's leave still covers you; a hire lets you go after seven missed in a month. A month with half its shifts kept is remembered ("Keeps our watch", +2, to +10) and counts as the power's quota kept. Leaving is the giver's own way out (Professions, people and powers: a dynasty's deserter is hunted): a sect's post is dropped freely, and a soldier's goes only with the March. Through the tutorial layers (Qi Condensation 1 to 3) a post is held but not worked, still at drill, so the first hour's pace holds. The conscript's child's cadet patrols are the first, handed with the oath at the outer seat, and posts and sect duties are the same rule.
- Routines: a whole wheel can be saved as a routine, and routines are also learned from teachers, manuals and sects, such as the garrison's Watch Rotation or a hermit's Nine Midnights. Following a learned routine exactly, all twelve hours, earns a discipline bonus of about 10% on every hour; its cost is rigidity, since a routine with no body or soul hours leaves both behind. A sect can impose its own routine, morning lecture and duty hours included, and keeping it grows the Orthodox Way, so breaking routine to cultivate more is a small, real choice.
- Qi, study and sleep hours are open from the start, and a fresh life's wheel is all qi: the first study hour is yours to set (UI and screens, You do it the first time). When a new kind of hour becomes possible, practice with the first usable technique, body or soul with its art (once it is read, if it came as a copy), and the lineage has given that kind an hour before, one hour flips to it with a chronicle line: the qi hour worth least to you, one that matches neither your root's elements nor dawn, latest in the day first. The first time in a lineage, nothing flips: you give it its hour. Rearrange freely. The same rule fills a migrated save, and the sims play the first times as a player would, at once.
- Before you know a qi method, qi hours give nothing; every life begins that way, since the origin hands over its method as a book, read on the study hours you set and taken up once read (Reading, below).
- Every hour also leaves insight (see Insight below).

**Attended seclusion.** Cultivate's figure shows the qi hours as they happen: motes drift in from the edge at the real qi rate, tinted by the hour's element, enter at the crown and the palms, run the circulation and settle in the dantian. Without a method the qi drifts close and slides off; unsettled, the loop jitters and sparks leak; at a full bar it runs fast and the dantian overflows. While you attend, qi speed carries one more factor, attention, from ×1.25 for being there to ×2 at full focus:

- Orbs: a steady flow, a small bright orb every one and a half to three real seconds, drifting in from well out round the figure; the flow is the pleasure, not any one orb. Hover over it to draw it in; there is no breathe key, so the seat needs a pointer. A catch fills focus; focus drains slowly back toward the floor, and to ×1 over a minute once you're away. Orbs appear only on Cultivate; the floor holds on every screen.
- The breath cycle is the skill, not aim: the figure breathes on a slow cycle, orbs tend to arrive on the inhale, and a catch timed with the inhale is worth more. A late catch still counts for its base.
- Qi heat: greedy catching warms the meridians, the circulation reddening toward the warning color, and past the threshold you tip into unsettled and lose the bonus for a while. Steady breathing is safe; greed can backfire. Nodes raise the threshold and the cooling rate.
- Orb kinds: an orb carries its hour's element, and from tier 2 nodes an orb of your root's elements is worth more; dawn's purple orbs at 卯, dark yin orbs at night, lightning orbs while a thunderstorm card is live, and knots you don't want to catch, each a data entry.
- Still Pool: resting the pointer on the dantian stops the drain, so sitting quietly is a valid way to attend. If the sim ever shows chasing beating sitting by more than the ceiling gap, the tuning is wrong.
- The ring: focus and heat show as a faint ring round the figure, about 65% of a circle centred on the dantian and open toward the floor, outside the sun's hand. Focus is the outer arc in gold, rising clockwise from the lower left, where the factor stands, to the ceiling at the lower right; heat is a fainter arc just inside it in red, brighter near its limit. The seat's one line of words and its "?" sit under the figure; during a breakthrough scene the ring steps aside for the gates.
- No tutorial layers at the seat: orbs fill focus and heat builds from the first layer, so attending pays from the start and greed can burn from the start. The seat's line stays short, "Draw orbs in by hovering over them.", with the inhale and the heat behind its "?".
- Rules: orb value scales with the realm's bar so focus reaches the same ceiling at every realm; orb spawns roll on their own `orbs` stream, and a catch is an action that names who breathes; focus is never saved and starts at zero on load; under reduced motion orbs pulse in place and the circulation glows steadily; the canvas pauses when the tab is hidden, which is also how away is known, and particles are capped.

**Circulation on the figure.** The pattern the sparks run is the active qi method's `circulation`, with a default by rarity: gray a crude, uneven loop; green a clean small orbit; blue the orbit plus the two arm channels; purple the full meridian net; gold the great orbit with a second ring through the limbs and more sparks in flight; red a named pattern of its own, so the Night Bridge method lights up like nothing else; pristine the same, with the sparks run clear and rainbow-edged. Each realm then changes the vocabulary, not the count, so Nascent Soul reads as a different order of magnitude: at Qi Condensation motes from the edge of the cave and the small orbit; at Foundation strands pulled from past the frame, the great orbit through the limbs, a floor of qi under the figure; at Core Formation rivers bending toward a visible spinning core, the net pulsing from it, the air of the room moving; at Nascent Soul the cave is gone, sky and mountain behind, the region's qi leaning in, and the small figure above the head drawing with you. Rarity sets the detail inside each realm's vocabulary.

**The hour on the figure.** Nothing is added to the space round the seat: the empty dark is the realm vocabulary's headroom, and the hour shows on what is already there. The figure is a sundial. The sun lights a patch of floor round the seat and the figure's shadow is cut out of that light, since on black glass a shadow has nothing else to darken: long and falling away from the sun at dawn, a pool under the legs at noon, long the other way at dusk, gone at night, when the only light on the floor is the dantian's own, brighter as the bar fills. The same sun puts a faint wash on the glass from where it stands, warm from the horizon at dawn, pale from above at noon, orange along the floor at twilight, and the yin blue low along the floor at night, with a soft blurred rim on the figure's lit side so the body agrees with the shadow. The day runs from 卯 over 午 to 酉, the sun rising on the left and setting on the right, and behind the figure a faint gilt hand points from the dantian toward it, round the day like a clock's. The motes still arrive from everywhere, since this is light, not qi, and the caption still names the hour in words. Weak on purpose, felt before it is read: `docs/mockups/abode-hour-study.html` is the reference, with its default strengths (shadow 0.8, wash 0.7) as the tuning.

**Three paths: qi, body and soul.** Each climbs its own ladder of realms and stages, and you may cultivate any one of them or all three: the pure body refiner 炼体 and the soul cultivator 炼魂 of the novels stand alone as fully as the qi cultivator.

- **Your realm is your highest ladder.** Your lifespan, your tribulations, what the scale table says you can do and the realm others read on you all come from it. Only the realm does: every line still reads its own ladder's stage, so a body a stage ahead of your qi still shows in your HP.
- **The floor.** No ladder counts below ×0.5 of your highest ladder's size, however neglected, since a cultivator's body is never a mortal's. A pure qi cultivator early in Foundation (31) has a body like Qi Condensation's fifth layer (15.5); at Foundation's peak (105), like its second stage, so the others stay closer the higher you climb. The floor only lifts: a ladder trained past it counts as itself.
- **Each path fights its own way:** body strikes and body arts read the body, qi techniques the qi, and soul attacks the soul, striking the foe's soul. **And survives its own way:** the body absorbs, with HP and Defense; the qi shields, as damage meets your qi before your body (Combat, The sheet); the soul avoids, as your Evasion reads your soul when it stands higher. The rest follows: a soul specialist wrecks a body refiner's soul at half, raw force breaks qi shields, and a qi cultivator's range and areas catch a soul specialist who lives by dodging.
- **A balanced cultivator**, all three at the top, is the strongest at a realm and the slowest to reach it, since the day's hours split three ways.
- The body takes tribulation lightning, so a strong body survives tribulations more often, and artifact refining leans on it. Divine sense, seeing through hidden realms, realm pressure, illusions and heart demons read the soul, and crafting at a tier needs your soul to reach it.
- A failed heart demon can injure your soul and knock it back a stage or more; it heals with time and pills.

Each ladder follows the qi rules: layers 1 to 9 at Qi Condensation, then four stages per realm, a bar fed by tempering or nourishment, minor breakthroughs between stages and major ones between realms, each major one with its own insight threshold. Lifespan follows your realm, your highest ladder. The major that raises your realm needs its path's gate (Offerings). A ladder you neglect stays behind, and its lines count at its own level, never below the floor.

**Every ladder needs a method.** Qi climbs only with a cultivation method, the body only with a tempering art and the soul only with a nourishing art, each in the hours you give it. Nobody starts with a body or soul method: your origin hands you a qi method, and the other two are found, bought or earned. Until then, body and soul grow only from the world: fights and hardship, medicinal baths and beast blood for the body; epiphanies, contemplation, near-death and heart demons for the soul. Those world sources stay the fast road even with a method, which is the slow, steady one.

**The big three have trees too.** A level is raw power and the gate; the tree beside it shapes that power, and its nodes cost insight like any other tree:

| Tree | What it shapes | Example nodes |
|---|---|---|
| Qi | how you spend your qi | cheaper techniques; faster qi recovery mid-fight; a deeper pool; purer qi for harder-hitting techniques; hiding your realm; longer flights on your own qi or any vessel (flight on a sword is the Sword Dao's) |
| Body | how your body holds up | iron skin against physical damage; blood refining for regeneration; poison immunity; endurance against tribulation lightning |
| Soul | how far and how precisely you sense and control | wider divine sense that reveals more map; soul armor against pressure and illusions; split attention for one more production queue, puppet, flying sword or practiced technique (how many swords fly is the soul's; how hard each hits is the Sword Dao's); soul search on a captive, at a karma cost; steadier crafting hands |

**Every tree has the same shape.** It has 9 tiers, one per realm. Each tier opens with a starter, spreads into 4 or 5 branches of small minor nodes and named notable nodes, and closes on a capstone. A tier of the big three holds about 25 to 30 nodes, laid out freely so each tree has its own silhouette; a combat Dao's tier holds 12 to 18 at the first two tiers (14 and 18 as drafted) and widens later (The combat Daos). Two or three of the branches are the capstone's: each ends in a notable that links into it, and owning those ends unlocks the capstone. The other branches are side paths, taken for their own rewards. The capstone links to the next tier's starter, so a tree climbs as one path. Capstones and a few late notables carry the multiplicative effects that help a build fight up a realm; everything else adds. A Dao's tier bonus still counts once you own half that tier's nodes. Tier 1 nodes cost 10 insight for the starter, 20 to 55 for minors, 120 to 140 for notables and 300 for the capstone, about 1,670 a tree; tier 2 costs 150, 150 to 300, 600 to 650 and 1,500, about 9,200 a tree. A word belongs to one tree across them all, even where the uniqueness test can't see it: the Fist Dao owns "fist" and the Body tree bone tempering.

**The Breath branch** is a side path of every tier of the Qi tree that only pays while you attend (Attended seclusion), a player-style branch the way Stone Eating is a resource branch, so an idler skips it with nothing lost and nobody reads it as a tax. Each node is an entry with a stat the core reads as it reads `qiGain`, and the nodes are in `src/content/trees/qi.ts`. Tier 1 is cheap and early and works the seat itself: catch reach, a slower drain, a higher focus ceiling, two orbs a breath, more heat before unsettling, and Still Pool. Tier 2, as cheap, turns the orb kinds on: your root's elements worth more, dawn's and the night's orbs worth double, focus feeding the insight trickle, knots made harmless, and a slower breath that catches more.

**Insight is the universal currency of understanding.** It buys nodes in every tree except the Ways, which grow only by deeds. Every major breakthrough also needs an insight threshold on top of its fuel: qi for your realm, tempering for your body, nourishment for your soul. The threshold counts insight ever earned, so spending insight on nodes never delays a breakthrough.

Insight is what attention leaves behind, so it comes from everything you do:

- every hour of cultivation leaves a trickle, rising with your realm, since higher realms understand more per day
- attended hours leave a second trickle away hours never do (How the two halves connect), a rate like the first, small enough that a weekend away costs a node or two, never a tier
- study hours add a steady stream
- practice and cultivation: each mastery level a technique, method or recipe reaches releases a burst, the moment a form finally clicks
- contemplation of a manual, an ancient Dao stele, a teacher's or sect's lecture, a waterfall or a thunder peak; each source has its own yield, some run dry, and manuals and inheritances arrive in lumps
- enlightenment pills and Dao incense
- crafting hours
- epiphanies the narrator tags, and near-death fights

Aptitude and talents multiply all of it, and an epiphany also leaves a discount on its related Dao. Insight is one currency whatever it came from. At tier 1, ×3 per tier like practice days: a technique's levels burst 5, 20, 60 and 150 insight and a method's 10, 40, 120 and 300; manuals and lectures are lumps of 10 to 50; steles and places trickle 0.5 to 2 a day with a supply that can run dry. Cultivation's trickle is 0.05 a day from the waking hours and a study day gives 1, both times the realm's rate (×1, ×3, ×9 and up), and the attended trickle matches the first.

**Learn with insight, use with one gate.** Learning costs only insight, with no cap. Using checks one matching level: qi techniques check your realm, body arts your body level, soul arts and every craft your soul level.

Anything above that stays sealed until you grow into it. A manual memorized at Qi Condensation can become your trump card the day you break through.

Geniuses come from talents and training that push body or soul ahead. A rare soul talent that lets the soul run two realms ahead means a Foundation cultivator brewing tier 3 or 4 pills.

**Everything else grows off the big three.** Daos are what you understand, Ways are how you live, and techniques and recipes are what you practice. They all stack, and time and talent are the only limits.

**Daos** are skill trees for everything you can understand:

- Elements: Fire, Water, Wood, Metal, Earth, Lightning, Wind, Ice.
- Weapons: Sword, Saber, Spear, Fist.
- Concepts: Space, Time, Life, Death, Karma, Slaughter.
- Crafts: Alchemy, Formations, Refining, Talismans and the rest of the Hundred Arts, covered under Professions.

Insight grows them: meditation, practice, using the Dao in a fight, and moments in the world the narrator tags, like a thunderstorm over the peak. Each Dao does three jobs:

- Bonuses: every action carries Dao tags, and each tier you hold in a tagged Dao adds +1 to the check and +5% to the effect. You hold a tier once you own half its nodes, and a tier above your realm counts once you reach it. Nodes add more; a Wind node makes Wind movement faster and harder to catch.
- Requirements: Flowing Cloud Blade needs Sword Dao at Foundation tier; Great Dragon Flame needs Fire Dao at Nascent Soul tier.
- Recipes: a craft Dao scatters its basic recipes through each tier as nodes, and every tier's first node gives a starter recipe.

**Ways** are four trees grown by deeds, not insight: Orthodox, Demonic, Buddhist and Ghost. They color everything you do, and most of their nodes aren't about fighting:

| Way | Grows from | Cultivation nodes | Combat nodes | World nodes |
|---|---|---|---|---|
| Orthodox | keeping sect rules and duties, protecting mortals | better breakthrough grades; off-element methods lose less | five-element combos hit harder; bonus damage to demonic foes | righteous standing rises faster; disciples join you more readily |
| Demonic | killing, devouring, intimidation | the blood and qi of the slain feed your cultivation; beast cores and treasures can be devoured for qi | attacks steal qi; damage climbs as your HP falls; weaker foes may flee or kneel | black markets and demonic sects open up; defeated foes can be bound as thralls who work your lines, until you look weak |
| Buddhist | sparing, healing, keeping vows | meditation yields more insight; merit eases breakthroughs and tribulations | a vajra body; extra damage to ghosts and demons; a roar that dazes souls | spared foes may turn allies; temples shelter you and reveal the map around them |
| Ghost | yin places, the night, handling the dead | faster cultivation in graveyards and yin veins; corpses refine into puppets and materials | evasion in darkness; soul-chilling attacks; a slain foe's shade fights for you | question the dead for clues; curse a rival's market; ghost markets sell forbidden goods |

Vow nodes pay big while a vow holds, such as sparing every foe who surrenders, and break hard when you fail. Way trees share the shape every tree has, and nodes above your matching level stay sealed until you grow into them.

**How deeds grow a Way.** Each Way has a list of deeds that earn its points, and its points buy its nodes, its tiers unsealing with your realm: Orthodox for duties done for your power, mortals protected and sect rules kept; Demonic for kills, devoured cores and blood, and intimidation that works; Buddhist for foes spared, healing and vows kept. Heaven counts the deeds as it counts karma, seen or not, while standing moves only by what people know. A deed is worth what its target is to you, in full at your realm and a tenth a realm below, so butchering mortals barely feeds a Foundation cultivator's Demonic Way while draining a city does. Ways mix (a demon Buddha), and some deeds cut across them: killing a foe who surrendered feeds the Demonic Way and breaks a Buddhist vow. A Way tree has the combat Daos' shape, 10 to 15 nodes a tier.

**Techniques** are the moves you actually use, learned from manuals, teachers, inheritances and epiphanies: a manual is a copy you read over study days, and the rest teach at once (Reading, below). Each lists its requirements: a Dao tier, a realm, sometimes a body or soul level or a Way. Flying swords are a family of Sword techniques that also need a strong soul, and elemental spells are techniques of the element Daos.

Builds fall out on their own: the Demonic Way plus Sword techniques is a demonic swordsman, and the Demonic and Buddhist Ways together make a demon Buddha. The Orthodox Way plus the five element Daos on a five-element root is a five-element spell cultivator. Sword Dao plus a tempered body never needs a flying sword.

**Lines, chapters and kinship.** Techniques and methods belong to lines. The Clear Heaven Sword Canon is one line, and its chapters climb the realms: chapter 1 at Qi Condensation for outer disciples, chapter 2 at Foundation for inner disciples, chapter 3 at Core Formation for core disciples only. A chapter's requirements can include a sect rank, beside realm, root, talent and Dao tier. What belongs to a line is written in the data, never guessed from names.

- A technique's next chapter needs the one before at Comprehension, and starts below it: one mastery level down, or two if the new chapter is of a higher rarity, never below Glimpse. The old chapter stays known and usable.
- A method's chapters follow the same rule through the method's own mastery: the next chapter starts one level below the old one, two if it is rarer, and a method of a new line starts at Glimpse. The bar is never touched. A fresh method runs at little more than half speed and a deep one above full (Mastery below), so leaving a method costs more the deeper you were: staying in your sect's line pays, and a stolen demonic method has a real price.
- Kinship: two different lines that share a Dao and a form, two sword thrusts say, speed each other's practice by about a quarter while a kin sits at Comprehension or above, without carrying mastery over.

**Manuals are nodes the world gives you.** Trees are yours and grow by realm; manuals are found, bought, inherited, written or stolen. A manual is anything learnable that carries nodes, one mechanical kind with a `nodes` list, from a single node to a small external tree with its own branches, requirements between its nodes, a capstone, and chapters per realm tier like a method's, the next chapter coming from a sect by contribution, rank or a master's favor, or from the world. The fiction supplies the size and the name, never a new mechanic: a *Formula* (口诀) is one or two nodes; a *Style* bundles craft nodes onto a craft Dao, *Clear Fire Sect's Alchemy Style*, and holds the sect's own recipes as nodes, so its pills are brewed by nobody else without stealing the manual; an *Art* is a technique and its nodes, which wake as the technique masters; a *Method* a ladder and its nodes, unsealed by mastery rather than realm; a *Scripture* (经) a big gold or red bundle; an *Inheritance* a ruin's or dead master's whole tree. Manual nodes cost insight like any node, by rarity, with requirements where they make sense. Hold two styles and both count: a cultivator who has read a hundred manuals should feel it, so there is no slot limit, small effects add without limit on the same stat, and multipliers and rule changes come only from purple up and go through the fighting-up ledger with gear and nodes, so the ledger stays the one place that caps a build. A white formula is +5% qi gain; a gold scripture changes how overfill works. Every manual is written by hand, a place at a time (Catalogs by place). Manuals and trees never unlock each other: trees link to trees, and a manual is self-contained. *Write a manual* turns any knowledge you hold, nodes or recipes, into a manual item to teach, sell or lose.

**Where manuals live.** Every manual names a host tree, and the Trees screen draws it grafted beside that tree: on the host's canvas, joined to none of its nodes, so a Cloud Saber Art stands in the Saber Dao's canvas beside the Saber tree, the way the discoveries edge hangs found recipes off a craft Dao's rim.

- Hosts: a Method grafts beside its ladder's tree, an Art beside its technique's first Dao (Sinkhole Stone Fist's Art beside Earth), a Style beside its craft Dao, and a Formula beside the tree its effects touch: the Garrison Breath-Count, Tide-Counting and Bone Wall Watch formulas beside Qi, the Beast-Butcher Sinew Formula beside Body, the Stone Eyes Lamp Formula (insight) beside Soul. A manual names its host in the data, and one you write takes the host of the knowledge it holds. A Scripture, an Inheritance or a Formula of mixed effects has no host and stands under the Manuals category as a small tree of its own. A manual never waits for its host: holding it opens that tree on the Trees screen even before its ladder does, showing only the manual's graft until the ladder opens the tree's own nodes (UI and screens, Only what you have touched shows). Only an Art whose Dao has no tree drawn yet (Wind, Lightning, Ice), or an Art of no Dao at all, stands under Manuals until that tree is drawn.
- Grafted means drawn beside, never joined: no requirement crosses between a manual and a tree, so losing a manual never strands a tree node.
- An Art is one technique and a small external tree of nodes built on it. The technique is never a node: you learn it however you learn it, it is the Art's jewel, at the heart of its bloom, and the nodes are passives you buy on it with insight. They wake as the technique masters, the way a Method's do: the first at Comprehension, then Mastery, Perfection and Origin, and past four nodes the extras share a level. By rarity an Art holds 1, 1, 2, 3, 4, 5 and 6 nodes from white to pristine, so practising white Rampart Palm to Comprehension opens its one node. Its nodes can be any stat: the technique's own (+10% power, −15% qi cost, a critical staggers) or yours (+3% HP, +2% qi recovery, +4% Agility), so practising a technique grows the cultivator too. They follow the manual rule above, small adds to anything and multipliers and rule changes only from purple up, so below purple an Art never reaches the ledger. A technique's next chapter (Lines, chapters and kinship) is its own Art.
- Every technique has its Art. Learning the technique by any road, a manual, a teacher or an epiphany, gives you its Art, the way a known method keeps its manual.

**Reading.** A manual, a method or a technique handed to you as a thing, bought, given, found or stolen, arrives as a copy: an item of the manual kind with the read use. Taught to you, by a person face to face, an epiphany, an inheritance or an opportunity, it is yours at once. There are no exceptions: an origin's starting method is handed over as a book (a tier 1 manual is a book or a scroll, a higher one a jade slip; Economy, Methods in the market), so a life begins reading it, about half a real minute for a white method on the whole wheel; a first technique a senior shows you is taught. Each card says which it does.

- The bookcase is the book inventory. A copy never takes a Bag square: it stands on the bookcase from the moment you get it, a method's as a Method spine and a technique's as an Art spine, unread at first, with a paper band across the spine and its pips dim, and its hover card offers Read. A copy found on a trip rides home weightless and is shelved on arrival; a raid on the abode can take books.
- An unread copy grafts nowhere. A manual grafts beside its host tree only once it is yours, so the trees show what you know, and the hover card already lists what reading it would give; a click on an unread spine pins that card open with Read instead of opening a graft.
- You read a copy on your study hours, one at a time, from a queue, not slots, since splitting the hours would only finish every copy later. Read adds a copy to the end of the queue; when one is done the next begins by itself, and one that can't be read yet stays in the queue, skipped, saying what it waits on. A new copy joins an empty queue by itself, so nothing waits unread for want of a click. A copy takes study days by its rarity, 3, 5, 8, 12, 20, 30 and 45 from gray and white to pristine (gray as white), ×3 a tier, so two study hours a day read a white formula in about 18 days, and a tier 5 pristine scripture takes decades. The study hours still give their insight while you read, and progress stays with each copy if it leaves the head of the queue.
- Reading speed is the study days your study hours give × Aptitude × how well it suits you. Aptitude is comprehension, so it speeds reading as it speeds practice and insight; the Practice stat is drilling and leaves reading alone.
- **Suits you** is one multiplier with a "?" saying why, built from the rules that already say a thing fits you: a method's fit to your root, as it scales qi speed; a technique with a kin you hold at Comprehension, the quarter that kinship gives practice; a copy of an element your root holds; and your tiers in a technique's Dao. It is capped so no fit makes a scripture an afternoon's read. Practice's kinship can fold into it later, so there is one idea of fit rather than three.
- Finishing makes it yours as any road does: a manual held, a method known (switching to it is still your choice), a technique at Glimpse or, for a line's next chapter, where the chapter rule starts it. It also gives a lump of insight, 10, 15, 20, 30, 40, 50 and 60 by rarity, ×3 a tier, as contemplating a manual does.
- A copy checks what learning it would check before you start: a next chapter needs the one before at Comprehension, and one you already know says so.
- Reading never uses the copy up: the band comes off and the pips light, and the copy stays on the bookcase. Knowing a thing and owning copies of it are separate: a spine stands for anything you know, copy or not (a technique a teacher gave you has none), and a second copy of something you hold counts on the same spine ("×2") instead of taking another, the count showing only from two. Take down takes a copy off the shelf to sell, give or teach with, and *write a manual* writes a new copy of anything you know, so giving away your only copy never costs you the knowledge; neither is built yet (Still to design, Write a manual).

Some techniques ask for two trees at once, such as a blood-sword art that needs the Demonic Way and Sword Dao. v1 ships the Orthodox, Demonic and Buddhist Ways, the five element Daos, Sword, Saber, Spear and Fist, the four great craft Daos, and the first tiers of the Qi, Body and Soul trees.

**Methods** are the manuals each ladder climbs with: cultivation methods for qi, tempering arts for the body and nourishing arts for the soul. A method is a bundle of independent fields: a ladder, a tier, a rarity, a line and chapter, a fit, requirements, an upkeep, a growth profile, breakthrough bonuses, properties and a source, and any combination is legal: a red method with no requirements and no upkeep that is merely rare and expensive, a gold one that asks for a talent, a blue one that eats two stones a day. There are no kinds. Qi speed is root speed × method × fit × qi density × Aptitude × attention, where the method part is its tier bonus × rarity × mastery and attention is ×1 away (Attended seclusion).

- Tier caps it: a method gains nothing on a ladder above its tier. Breaking through needs nothing from the method; the pill, the full bar and the insight carry you over, and then the old method runs out, so you switch to its next chapter or a new method and gain nothing until you do. The breakthrough is the natural moment to change methods; if you already hold the next chapter, switch before the attempt, since the method active at an attempt is the one that builds the new stage (Growth below). A method whose tier sits above your realm cultivates faster, by the step out of your realm on the size table (Tier, rarity and pedigree): ×3.1 at Qi Condensation, ×4.6 at Foundation, ×6.7 at Core Formation, ×10 at Nascent Soul and more above. That bonus counts once, however far above you the tier sits; a higher tier mostly buys a longer road without chapter changes.
- Rarity sets speed on the curve everything shares (Tier, rarity and pedigree), so a red Qi Condensation method cultivates almost like a white Foundation one, then stops at its peak.
- Growth: every stage you climb records the growth of the method that climbed it, and it stays. A qi method leaves pool, purity (technique power) and recovery; a tempering art HP, physical damage and regeneration; a nourishing art soul defense, divine sense and perception. The total a method leaves over a full realm is its rarity on the shared curve less one, at tier 1 about −20% at gray, +20% at green, +50% at blue, +147% at purple, +210% at gold, +335% at red and +666% at pristine, and its profile splits the total: a deep-sea method is mostly pool, a pure-flame method mostly purity. Fit scales growth as it scales speed, which is how a fitting method hits harder. A stage climbed with no method active, on the world's tempering alone, takes a white method's growth. Switching never rewrites the past: your foundation is what you built it with, and a poor method's stages stay poor until a re-refining pill. Across realms growth counts as a weighted average with the realm curve as the weights, so the current realm dominates, an earlier foundation still shows a little, and the total never exceeds a red band; a plain sum would run away. The Character screen shows it per realm, "Qi Condensation foundation red, Foundation white so far", never as one shrinking number. Growth is set, never rolled, since gentle mode's rewind lands at a breakthrough.
- Breakthrough bonuses: the method active at an attempt adds to the odds of any breakthrough, to a major one's grade margin and to mercy on failure, by rarity: gray −2 points of odds; green +2; blue +4; purple +7 and the injury halved; gold +12, +0.25 margin and the injury halved; red +16, +0.5 margin, the injury halved and no bar lost; pristine +20, +0.75 margin, the injury halved and no bar lost. Heavenly still needs gold or better; with red's margin it is in reach with one of body or soul ahead rather than both.
- Properties: rarity's special properties (Tier, rarity and pedigree) are a method's gear-like extras while it is active, none at white, a named unique at red and an artifact spirit at pristine: the Night Bridge method gaining more at night hours, a demonic one devouring beast cores for qi.
- Mastery: a method runs Glimpse to Origin like a technique, raised by every hour you cultivate with it, and its level scales its speed alone (Mastery below), so nobody waits at a full bar for a level before a breakthrough. Switching methods is paid in mastery, never in bar (Lines, chapters and kinship).
- Fit: a method that matches your talents cultivates faster and hits harder. A five-element root on a five-element method gets the full affinity bonus; a mismatch still works, slowly.
- Requirements run from nothing but qi density (your spirit vein and gathering arrays) to long lists: a root, a physique, a Dao, a Way, a place, a ritual.
- Upkeep: some methods drink stones, herbs, blood or karma every day and stall on an unfed day, gaining nothing; the origin methods have none. A demonic method that grows by hunting people and draining their qi or blood is the fastest climb in the game. It also sinks karma, spreads notoriety and feeds heart demons. Upkeep comes in two weights, counted in days of your realm's wage (Economy): light drinks half a day's wage each day and heavy two days', so a heavy tier 1 method eats 2 low-grade stones a day against a Qi Condensation income of a few, and nobody runs one on seclusion alone. Item upkeep is one item of the method's tier a day, blood a vial, karma a point.
- Special methods come from inheritances, secret realms and sect vaults, not shops.

**Fighting a realm up** comes from stacking advantages, never from one feature, and how far a cultivator gets depends on pedigree (Tier, rarity and pedigree). A realm is a wall (Combat, Realms are sizes): an ordinary cultivator never closes one and can only flee, talk or call for help, and a great-sect disciple in purple does not either. A sacred-land genius in gold crosses about half the time at the middle realms, and a chosen of heaven, red and gold with a body a realm ahead, crosses almost always, since every line of their sheet already sits at the next realm. Against an equal pedigree the higher realm wins, and nobody fights two realms up, not even in pristine. The fighting-up ledger under Combat sets the targets the fight sim holds. Breakthrough quality is one of the advantages: every major breakthrough is graded flawed, ordinary, superior, perfect or heavenly, worth about −¼ to +¾ of a realm in a fight. Heavenly needs a method of gold or better.

The rest of the stack: a body or soul ahead of your realm, the rarity of your techniques, methods and gear, technique mastery, Dao tiers, Way nodes, talismans, talents, terrain and creativity. Each closes part of the gap, enough of them close it all, and the fight sim holds the ledger's targets.

A major breakthrough's grade depends on the margin you bring, scored 0 to 4: qi past a full bar, up to a point at 150%; insight earned past the threshold, up to a point at double it; your other two ladders (body and soul, on a qi major), half a point each at the current realm's peak and a full point at the new realm; and the method's margin (gold +0.25, red +0.5, pristine +0.75) and the offerings laid on the attempt on top. Ordinary needs 0.75, superior 1.75, perfect 2.75 and heavenly 3.5, and heavenly still needs a method of gold or better, so a cultivator with body and soul at layer 9 and everything else full can lay a perfect Foundation, and heavenly needs one of them actually at the new realm. The same preparation steadies the attempt: each point of the insight and other-ladder margin adds 8 points of odds, up to 24, while qi past full pays its odds as overfill instead; the method's and the offerings' margin raise the grade alone. Rushing in at the bare minimum saves lifespan but leans toward a flawed grade, so the time budget matters here too.

A grade gives three things, all shown: a share of the realm in a fight on every line of the sheet, about a quarter of the step out of the realm a grade (0.27 of it: flawed −1, ordinary 0, superior +1, perfect +2 and heavenly +3 such shares; at Foundation ×0.67, ×1.50, ×2.26 and ×3.39; Combat). It is a share of the step, not a count of stages (Jan's call in the realm gap's design, 2026-10-20), so a grade keeps its worth however the stages are spaced, and the sim measures the ledger unchanged by the shorter climb: a perfect early Foundation fights as a Foundation peak, a heavenly one at the half-step to Core, and at the peak a perfect grade stands at early Core and a heavenly one past it, which is the crossing the ledger's chosen of heaven leans on. The other two are cultivation speed on that ladder for the whole new realm (−15%, 0, +10%, +20%, +35%); and the odds of the next major breakthrough on that ladder (−3, 0, +3, +6, +10 points), since a sound foundation makes the next step easier. Once a later major passes it, a grade echoes on for life at a third of its speed and odds, so a heavenly Foundation still gives +12% speed and +3 odds at every realm above, a flawed one stays a scar of −5% and −1, and heavenly at every realm comes to about ×1.6 speed by Nascent Soul. The fight's share takes the latest grade alone: echoed there, a third of a grade tipped three rows of the fighting-up ledger off its cliff. The breakthrough panel on Cultivate (UI and screens) shows a grade meter, a bar from 0 to 4 with the five thresholds marked, filling as each source lands with every segment labeled, and the grade it earns as it stands; the Character screen lists each ladder's grade per realm with what it gives ("Foundation: perfect, +20% speed, +½ a realm"), and an earlier one's echo. Minor steps have no grade.

**Mastery belongs to techniques, methods and recipes.** Each runs Glimpse, Comprehension, Mastery, Perfection 圆满, Origin, raised by use. A technique's or recipe's level adds ×1.05 to checks with it, ×1.25 at Origin (The resolver, The check). A method's level scales its speed, and its levels come about six times slower than a technique's, since every hour cultivating with it counts:

| Level | Practice days at tier 1 (×3 per tier) | Method speed |
|---|---|---|
| Glimpse | 0 | ×0.6 |
| Comprehension | 30 | ×0.8 |
| Mastery | 180 | ×1.0 |
| Perfection | 720 | ×1.1 |
| Origin | 2,400 | ×1.2 |

An hour with a method or a technique is a twelfth of a practice day. At six qi hours a day Mastery lands about an hour into a life, inside the tutorial; a new line taken at Foundation runs below full speed for about two in-game years and forgoes Perfection or Origin's bonus for longer.

**Practice slots.** Practice days go to the techniques in your practice slots, split evenly: one technique practices at the full rate, two at half each, three at a third. You start with one slot, and each point of split attention opens another, up to three in v1: the Soul tree's Split Attention and the Twin Soul talent each give one, the same point that runs one more production queue, puppet or flying sword. Slots never add practice, only spread it, and the day's total grows with the Practice stat alone (the Soul tree's practice nodes, a formula). A sealed technique or one at Origin can't sit in a slot, and reaching Origin frees its slot for the others with a toast; the slot stays empty until you fill it, so practice never picks for you, since a queue here would play the game itself. Kinship lifts each technique's own share. Spreading pays in two ways that one slot already allowed by switching: early levels release more insight per practice day (at tier 1, Comprehension 1.25, Mastery 0.77, Perfection 0.5, Origin 0.33), and a kin can climb to Comprehension beside your main technique.

"Flowing Cloud Blade at Comprehension" means a Foundation-tier sword technique at its second mastery level.

**Talents** are rolled at birth, and each rebirth rolls them again. There should be dozens; five kinds to start:

| Kind | Examples | What it changes |
|---|---|---|
| Spirit root | single-element heavenly root, five-element root, mutated lightning or ice root; the Innate Sword Root 天生剑根 (gold: a metal root with a sword's edge, Sword Dao insight and sword checks up); the Yin-Yang Twin Root 阴阳双生根 (purple: water and fire in balance, with no clash between them) | qi speed, which methods fit, element affinity |
| Body | iron-bone frame, blazing-yang body, a beast bloodline, frail meridians; the Pure Yang Body 纯阳之体 (gold: fire hits harder, yin chill can't touch you, lightning bites less); the Nine Yin Body 九阴之体 (purple: yin methods fit, Ghost Way grows faster, fire hurts); the Innate Dao Body 先天道体 (red: every ladder trains faster and breakthroughs come easier); the Glazed Glass Body 琉璃之体 (pristine: flesh like the uncracked glass of the heavens, hard, quick to heal and proof against poison) | body training speed, HP, poison and tribulation resistance |
| Soul | innate divine sense, twin soul, a soul scarred in a past life; Formation Eyes 阵眼之瞳 (gold: you see the eye of any array at your soul tier, and Formation Dao insight rises); Sword Heart 剑心 (gold: sword techniques master faster, and sword intent can't shake you); an Unbreakable Dao Heart 道心如铁 (purple: heart demons and illusions lose their grip, grades edge up); Dao-Seeing Eyes 观道之眼 (pristine: you see the pattern under things, so insight, perception and Aptitude all rise) | soul training speed, resistance to pressure and illusions, crafting precision |
| Fate | heaven's favored, calamity star, late bloomer, karmic debt; a Child of Fortune 气运之子 (gold: Fortune up, encounters lean lucky); Heaven's Jealousy 天妒 (double-edged: tribulations hit harder, grades run higher); an Old Soul 转世之魂 (red: sleeps until Foundation, then a past life wakes with a lump of insight, and a lost chapter once inheritances exist); a Child of the Severed Heaven 断天之子 (pristine: the cut heavens have a stake in you, so luck, encounters and tribulations all bend your way); the Unsevered Thread 不断之缘 (pristine: sleeps until Core Formation, then something on the far side of the cut answers) | fortuitous encounters, disasters, tribulation strength, talents that wake late |
| Origin | village orphan, merchant's child, minor clan heir, great-sect disciple | where you start, how much of the map you know, early allies and enemies |

Every talent has a rarity, on the scale everything shares (Tier, rarity and pedigree): gray (a flaw that lowers a stat), white (plain), green, blue, purple, gold, red and pristine. Body, soul and fate talents roll their rarity on one table: gray 10%, white 40%, green 35%, blue 10%, purple 4%, gold 0.9%, red 0.1% and pristine 0.01%, out of white. Spirit roots use the table under Character creation, where white is the floor; origin has no grade. Kinds and names are mostly flavor, and each talent in the end moves stats: a spirit root its qi speed and method fit, a body talent body training speed, HP, Agility or resistances, a soul talent soul training speed, Aptitude or soul defense, and a fate talent Fortune, Aptitude or the odds of encounters. Some talents sleep until an event wakes them, and a past life's achievements buy rerolls at rebirth. Aptitude can also rise after birth, slowly and at great cost, through marrow-washing pills, spirit-spring baths and heaven-and-earth treasures, so a talentless orphan has a long road to genius. These are settled with items and gear. Talents that touch a Dao or an array, the sword root and the formation eyes, move stats nothing reads yet, Dao insight, Dao checks and array sight, stored like the combat stats until those systems arrive.

## The combat Daos

The five element Daos and the four weapon Daos of v1. Their nodes live in `src/content/trees/daos`, one file a Dao.

**Combat Daos are narrower than the big three.** A cultivator holds one Qi tree but several Daos, and insight is one currency across all of them, so a Dao tier holds 10 to 15 nodes at Qi Condensation and Foundation and widens from Core Formation toward the big three's 25. Tier 1 is a starter, three gating branches of three nodes each (two minors and a notable), one side path of two or three, and a capstone: 12 to 14 nodes, the tier held at 6 or 7. Tier 2 adds a second side path and a node to each gating branch: 15 to 18. Minors add small percents to the Dao's damage type, hit or cost; notables add a status or a rule twist; capstones multiply or change a rule, and each links to the next tier's starter. Every tier held also gives the Dao's own +1 to checks and +5% to effect (Cultivation, Daos). Each element Dao's side path reaches into a craft, so the Dao a crafter wants is the one their furnace or forge leans on.

| Dao | What it is | Side paths lead into |
|---|---|---|
| Fire | harm and burning | alchemy's fire, fire resist |
| Water | flow, chill and recovery | qi recovery, travel at sea |
| Wood | rooting, regrowth and poison | spirit farming, herbs, poison |
| Metal | edge, bleed and guard | refining, ore |
| Earth | weight, stagger and standing firm | geomancy, veins, abode sites, escape underground |
| Sword | precision and the single strike | Sword Bearing (intimidation), Sword-Riding (flight) |
| Saber | force, momentum and the cleave | roars (fear), bleed |
| Spear | reach, the first strike and the line | sweeps, a banner for allies |
| Fist | the body, speed and closeness | qi back on each hit, a palm at range |

**The Intent ladder.** Every combat Dao has a ladder beside its tiers, and it is the genre's signature progression, not a node: Qi, Intent, Domain and Law, Sword's 剑气, 剑意, 剑域 and 剑之法则, Saber's 刀意 and 刀域, Fire's 火意 and 火域, and so on for all nine. The stages are earned, never bought with insight.

| Stage | What it does | Earned by | Early, for a genius |
|---|---|---|---|
| Qi | the Dao's tier 1, as now | holding tier 1 | |
| Intent | the Dao's actions at ×1.15 Accuracy and ×1.15 Attack; foes below your stage in that Dao at ×0.9 Accuracy against you; about a stage in all | the Dao's tier 2 capstone (Foundation) and a moment | the tier 1 capstone (Qi Condensation) |
| Domain | Intent, and foes below your stage at ×0.9 Evasion, with their Defense counted ×0.95 against the Dao's actions | the tier 4 capstone (Nascent Soul) and a moment | the tier 3 capstone (Core Formation) |
| Law | a realm gap counts only as half a step on the Dao's actions | past v1 | |

- Domain waits on the Dao trees' tiers 3 and 4: they stop at tier 2 so far, so only generated cultivators carry it until those tiers are drafted.
- A moment is an epiphany card, a fight won from under 10% of your HP, a Dao stele or an inheritance, each with that Dao in it. The capstone makes you ready; the moment breaks through.
- A genius takes each stage a realm early: a gold-or-better talent tied to the Dao (Sword Heart, the Innate Sword Root for Sword) or a rare card opens it on the capstone a tier lower, so a Qi Condensation cultivator with sword intent is a prodigy people talk about.
- A foe at your stage or above in any Dao cancels your Intent's and Domain's effects on them: intent meets intent.
- The sheet shows a line for each Dao you hold intent in, "Sword · Intent 剑意"; on the Combat screen a combatant with intent wears a mark, and the hit-chance preview counts the effects.
- NPCs carry intent on their weapon's Dao by pedigree and realm (Enemies, beasts and the people you meet, the pedigree table).
- Intent and Domain are a row of the fighting-up ledger (Combat). The four target rows stand, measured with the intent each pedigree's kit carries by that table; if a row breaks, the stage numbers move, not the targets.
- Saber's Roar and Tiger Roar stay: a roar is not intent. The Sword tree's intimidation side path is Sword Bearing, which leaves the name to the ladder.

Lightning, Wind and Ice stay as Daos the trees list (Cultivation, Daos) with no draft yet; the fight sim says whether v1 needs them beyond their damage types.


## Tier, rarity and pedigree

Everything you can own or be born with shares one rarity scale, and everything you can own also has a tier.

**Tier** is the realm a thing belongs to. It sets the thing's base power on the realm curve, its price band on the yardstick under Economy, and its gate: the realm to wield an artifact, the peak a method carries you to, the level to use a technique, the soul level to craft at that tier. Talents and spirit roots have no tier.

**Rarity** is how good a thing is inside its tier: gray (flawed), white, green, blue, purple, gold, red, pristine (琉璃, without a flaw). It is a band: the stage the thing is sized at, in its own tier's realm (Combat, Realms are sizes). White is the realm's first stage, blue its middle to late stages, purple the half-step past its peak (Combat, The half-step), gold the next realm's first stage, red the next realm's middle and pristine the next realm's half-step. In numbers, with s the size step out of the thing's tier (×3.1 at tier 1, ×4.6 at tier 2, ×6.7 at tier 3, ×10 at tier 4 and on up the table under Combat): gray ×0.8, white ×1, green ×1.2, blue ×1.5, purple s^0.8, gold s, red s^1.3, pristine s^1.8. The method tier bonus under Cultivation uses the step out of your own realm instead.

| | gray | white | green | blue | purple | gold | red | pristine |
|---|---|---|---|---|---|---|---|---|
| sized at | below early | early | early-middle | middle to late | the half-step | next realm, early | next realm, middle | the next realm's half-step |
| tier 1 (step ×3.1) | ×0.8 | ×1 | ×1.2 | ×1.5 | ×2.5 | ×3.1 | ×4.3 | ×7.7 |
| tier 3 (step ×6.7) | ×0.8 | ×1 | ×1.2 | ×1.5 | ×4.6 | ×6.7 | ×12 | ×31 |

White to purple is steady betterment inside your own realm: purple carries an early-stage cultivator's line past the peak into the half-step, and never across the border from there on its own. Gold and red are heaven-defying: one line of the sheet sized at the next realm, at every realm, the way each realm's step is wider than the last. Pristine is the thing without a flaw: one line sized at the next realm's half-step, so a single pristine art makes a layer-1 orphan strike past a Foundation peak. It is the natural step after red on every table: one roll in ten thousand where red is one in a thousand, so most pristine things in a life are placed, an ancestor's heirloom, a ruin's inheritance, a treasure the atlas names, and a rolled one is the story of that life.

- **Accuracy.** Gold, red and pristine techniques also multiply Accuracy by 1.2, 1.4 and 1.6.
- **Properties.** Higher rarity brings more special properties: none at white, a minor one at green, one at blue, two at purple, two and a unique one at gold, three and a unique one at red, which is named, and four, a named unique and an artifact spirit at pristine.
- **Price** climbs much faster than power: within a tier, about ×0.5, ×1, ×2, ×5, ×15, ×50, ×200 and ×1,000 from gray to pristine.

What each kind of thing does with tier and rarity:

- Talents and spirit roots: rarity only, rolled at birth.
- Methods: tier is how far the method carries you; rarity sets its speed, the growth it leaves on every stage climbed with it, its breakthrough bonuses and its properties; mastery scales speed alone (Cultivation, Methods).
- Techniques: tier is the level to use them, and rarity sizes their Attack, their Accuracy from gold up, and adds effects.
- Weapons size Attack for techniques of their own kind at half their band and basic strikes at the full one, and add Accuracy and properties from gold up. Armor sizes Defense at its full band.
- Pills, artifacts, talismans and arrays: tier comes from the recipe or the material, and crafting rolls the rarity from mastery, materials and luck.
- Loot and shops roll on the talent table (gray 10%, white 40%, green 35%, blue 10%, purple 4%, gold 0.9%, red 0.1%), shifted by source: a sect vault or a ruin rolls better than a market stall. Pristine sits on the table at 0.01%, and white gives up the hundredth; that is for what you are born with. Loot, shops and generated cultivators never roll it: their roll is held at red, however strong the bias, so the world's pristine things are placed by hand.

**Above your realm.** A weapon one tier above your realm drinks qi with every strike, multiplies Accuracy by 0.8 and counts its Attack at half the step out of your realm; two tiers above, it won't wake at all. An ancestor's blessing on a lineage heirloom, a talent, a soul a realm ahead or a refining bond cuts the penalty. Consumables carry their own tier: a talisman an ancestor drew a realm above you strikes at that realm, and whatever an item burns or sacrifices is the item's own rule.

**Pedigree.** NPCs run on the same rules as you; what sets a chosen of heaven apart from a rogue cultivator is access. Every NPC has a pedigree (rogue, small sect, great sect, sacred land or chosen of heaven), and it sets only the tables they roll their methods, techniques, gear, talents and resources on: a rogue mostly rolls white and green, while a chosen one has a real shot at gold and red. Each realm's ordinary baseline rises too, since anyone who reached Nascent Soul has lived for centuries and owns blue and purple things; that is why the same chosen-one kit closes a little less of the gap higher up. Most lives start near the bottom and climb into the genius bracket by finding gold and red. The tables, and how an NPC is generated from them, are under Enemies, beasts and the people you meet.

## Items and gear

Everything you can carry is one record, the way a method is a bundle of fields, and what an item can do is a list of uses rather than a kind. A spirit fruit can be eaten, thrown into a furnace and sat with, and a new sort of thing is a new use or a new tag on an old one, never a new record.

**The item record.** An item has an id, a name with pinyin and hanzi, a tier and a rarity (Tier, rarity and pedigree), the properties its rarity grants, a source, a kind for the Bag's glyph and stacking (gear, pill, talisman, herb, material, beast part, manual, treasure, vessel, mount, beast), its bulk in squares and stack size, and its uses. Each use is a field with its own shape, and an item holds any set of them:

| Use | What the field carries | Examples |
|---|---|---|
| equip | a slot (weapon, armor, ring, pouch or treasure) and what it does worn | a saber, a water-silk robe, a storage ring, a fire bead |
| consume | an effect, a dose for toxicity, and which ladder or stat it feeds | a Qi-Gathering Pill, a spirit fruit, a vial of beast blood |
| fight | a one-shot action in combat: form, element or damage type, power, spent on use | an attack talisman, a shield talisman, a poison needle, beast-luring incense |
| contemplate | a contemplation source (Cultivation, insight): lump or trickle, yield and supply | a jade slip, a sword scar on a cliff stone, a hundred-year herb |
| ingredient | recipe tags for the furnace, forge and brush, and an age for herbs | herbs, ores, beast cores, blood |
| read | a manual, a method or a technique, read on your study hours over study days by rarity and kept after; it stands on the bookcase, never in a Bag square (Cultivation, Reading) | a formula, a style, a scripture, a technique scroll |
| offer | what it does at a breakthrough attempt (Cultivation, breakthroughs) | the Foundation Pill, a steadying herb |
| carry | squares it adds while it is with you | a storage pouch, a cart, a mount |
| key | opens a place, a card or a lock | a sect token, a smuggler's map, a letter |
| chart | the places it Sketches on the map when used, kept after (The world, The fog) | a kingdom map, a sect's region map, a treasure map |
| inscribe | a formation slot for enchantments | an empty slot on a blade or a robe |

A pill has consume alone; an old ginseng has consume, ingredient and contemplate; a beast core has ingredient, a dangerous consume and a price; a cart has carry alone. Anything you can consume and anything with ingredient tags can go into a recipe, so a fruit and the pill brewed from it are two items that share tags, not two systems. Unknown things show every use as "?" until appraised.

**Weapons** come in kinds, one per combat Dao: sword (剑), saber (刀), spear (枪) and fist (拳: gauntlets, claws and bare hands). Bare hands are a white tier 1 fist weapon, so unarmed strikes run through the same rule. New kinds come with their Daos later, the axe, bow, dagger, hammer and staff among them, each an entry. A weapon sizes Attack for techniques tagged with its Dao at half its band and basic strikes at the full one (Tier, rarity and pedigree), multiplies Accuracy from gold up, half a technique's: about ×1.1, ×1.2 and ×1.26 at gold, red and pristine, and carries its properties. A weapon of a lower tier than yours still works, only weaker, since its band counts in its own tier's realm.

**Armor** is one piece, whatever its shape: lamellar, a robe, a beast hide, a cassock. It is a bar of its own between the qi shield and the body (Combat, The sheet): its size is its tier's realm at its band, which is its Defense, and its durability is three times that, so white armor is the ordinary baseline the fighting-up ledger assumes and a red robe stands at the next realm's middle. Its material names one damage type it resists, a quarter off at any rarity (water-silk against fire, as in the worked turn), on the armor alone, and its properties add the rest. Its wear carries from fight to fight, and a refiner mends a full bar for a fifth of its price.

**Enchantments** come with artifact refining (Professions): weapons, armor and storage items carry an inscribe slot, empty until a formation is laid into it, and an inscribed formation adds one property of its own rarity. A formation on a blade is a craft like a pill; the slot is here so the record never changes.

**Storage.** The pouch slot and the ring slot both carry squares, and both count at once:

| Tier | Pouch slot | Ring slot |
|---|---|---|
| Qi Condensation | storage pouch (储物袋), +20 squares | none yet |
| Foundation | a bigger pouch, +40 | storage ring (储物戒), +60 |
| Core Formation | spatial sack or sleeve (乾坤袋), +120, holds living things | ring, +180 |
| Nascent Soul and up | a small world in a bead or jade, +360 and a garden | ring, +540 |

A pouch is cloth: anyone can open it, a thief can cut it off, and it goes with you when you die. A storage ring opens to divine sense, so it needs a soul at its tier or a qi realm there, whichever you reach first, and a dead elder's ring waits in your bag until you can; it bonds like any artifact and refuses a stranger. Both slots are storage only. Stones are a count in any of them.

**Treasure slots** hold artifacts that are properties alone: a fire bead, a warding jade, a treasure ring, a soul-calming bell. They carry no squares and no weapon rule, only their rarity's properties and a bond. You start with none, and the slots come from nodes: one notable in each tier of the Qi tree and one in each tier of the Soul tree opens a slot, so a realm is worth two and the count leans on both trees. The Bag shows them beside the four gear squares as they open.

**Bonding.** Artifacts from blue up bond to a cultivator by use, on the mastery scale, Glimpse to Origin (Cultivation, mastery): fight turns with it count as practice, and feeding it stones in seclusion counts as hours. Each level unlocks one of its properties, in the order the item lists them, and cuts the above-your-realm penalty: Accuracy ×0.8 at Glimpse and Comprehension, ×0.9 at Mastery and the full ×1 at Perfection, and at Origin a weapon a tier up counts its full tier step rather than half (`src/content/gear.ts`). At gold and red an artifact spirit wakes at Perfection, and a pristine artifact is born with one awake: it carries the unique property, speaks in scenes (GLM gives it a voice, the engine its wants), and can refuse an owner it hates. A bonded artifact works at white for anyone else, and a lineage heirloom's bond passes to an heir at Glimpse.

**Pills and toxicity.** Every cultivator has one toxicity meter, 0 to 100. A pill adds its dose: 10 at your own tier for a white pill, triple for a pill a tier above you, a third for one below. Higher rarity is purer, so the dose scales ×1.5 at gray, ×1 at white, ×0.9 at green, ×0.8 at blue, ×0.65 at purple, ×0.4 at gold, ×0.25 at red and ×0.15 at pristine; a red pill is almost clean. Toxicity decays about 1 a day at Qi Condensation and faster by realm, every pill's effect scales by 1 minus toxicity over 100, and reaching 100 unsettles the ladder the last pill fed. Detox pills and the Body tree's Hundred Poisons branch cut it. Toxicity is why pills are a boost and never the road.

**Talismans and other consumables.** A talisman is a consume or fight item drawn at its tier and rarity with one effect: attack, shield, escape, speed, healing, cleaning, purification, a message. An attack talisman is a technique of its tier, rarity multiplying its power, and it strikes at its own tier even above yours (Tier, rarity and pedigree). In a fight a talisman is a main action and spent; out of one, an escape or a cleaning talisman is a card choice. Written in K5: Golden Light 金光符 lays a gold ward over your qi shield, past its cap, for the fight (half a full shield at its rung, times its rarity); Body-Fixing 定身符 holds one foe still a turn, the held status 定 (no main action, no fleeing), on its rung and rarity's Accuracy against the foe's soul, and a foe a realm above its tier shrugs it off; Earth Escape 土遁符 is a sure flee from foes up to its tier unless you are held or rooted, and on the road is burned by rule when a flee would fall short; Divine Travel 神行符 is burned on the road for a day at ×2 on foot. The binding rope 捆仙绳, a refined treasure, holds a foe as Body-Fixing does, once a fight, and is kept. A talisman striking many pays its reach in material, as an art pays it in qi: it lists at ×√its reach, and its recipe takes as many more of what it is drawn from. Poison needles, fire bombs, beast-luring incense and a vial of blood are the same fight or consume uses on other kinds. The fight sim's targets exclude all of them, since one-shots are the tricks that let anyone fight up once.

**Aptitude** moves only by opportunities, and never by the shop: a pill from purple up (+1, one such pill counts per realm), a marrow cleansing or a purification rite, a bloodline awakening, a gold manual's node, a spirit spring in a secret realm, a dao companion's paired method. Each is +1 Aptitude, worth 5% on every seclusion gain, and the rites have no cap, only rarity.

**Loot and shops.** A source has a tier band, a kind table and a bias. The band is the realm it serves: a Border Wilds stall sells tier 1, a Foundation elder's ring holds tier 1 and 2. The kind table says what it holds: a stall pills, talismans and herbs; a vault manuals and gear; a beast its parts. The bias shifts the shared rarity table (Tier, rarity and pedigree): each rarity's weight is multiplied by b to the power of its step from gray, with a stall at 0.6, a sect shop at 1, a vault or ruin at 1.6 and an inheritance at 2.5, so a stall shows blue about one lot in twenty and never gold, a vault rolls gold about one lot in 25, and an inheritance rolls gold about one in nine and red one in thirty. What the dead carry comes from their seed (Catalogs by place), so a kept enemy carries the same ring when you meet them again; a Fortune drop rolls on the `loot` stream.


## Catalogs by place

The world's things are written by hand, a place at a time, and only rarity is rolled, since a written catalog is not much more work than the property pools a generator needs, and everything a player finds has been written by someone. Gold and red are on their own written list. A new place is a new catalog, not new code.

**Layers.** A catalog belongs to one atlas entry, and a shop draws on four at once, so most of a shelf is shared and each place writes only what is its own:

| Layer | What it holds | The Border Wilds |
|---|---|---|
| Continent | what every region on it sells | the Great Jing Dynasty's standard issue (the garrison method, the army's fire talisman, the iron sword), Apricot Grove Valley's pills, storage, charms, beast parts, mortal goods |
| Region | the frontier's own | wall issue, the origin methods and their chapters, the body and soul gates, the guard arts, the frontier schools' formulas |
| Place | what only that place makes | the Guarded Mouth's strait gear, the March's and the Wall's spear and bone, the Gate's sabers and blood pills, the Herders' horn and storm, the Night Bridge's contraband, Stone Eyes' fists and lamps, the Stone Forest's soul things |
| Imports | goods that travel along the atlas's ties into the region | Red Rocks steel and ore and Medicine Ridges herbs by the merchant guild, a Sword Domain blade now and then, Vast Wilds and Ink Marsh contraband over the Night Bridge |

A shop's kind weighs the layers (place 50, region 25, continent 15, imports 10; a merchant guild counts imports double, a black market takes them first). A shop reads its place's catalog and the catalogs of the places above it short of the region, so a kingdom's seat sells the kingdom's goods as made there (River-Bend City the March's) and writes only what the city itself makes (E2.1). A region without catalogs of its own falls back on its continent's. The markets in a shop's reach lend their place catalogs too, sharing 15 between them (Economy, Markets by reach).

**What a catalog writes.** Items, methods, techniques with their Arts, and loose manuals, in the records they already have (Items and gear; Cultivation, methods and Where manuals live), and its lots: each thing, the shop kinds that stock it, how often against the others of its layer, and how many come in a lot. A thing with no shop is found only on the dead, in rings and in ruins.

**Rarity as quality.** Pills, talismans, herbs, beast parts and gear come at a range of rarities: a written thing names the worst it comes at and the best (an Iron Sword white or green, a Water-Silk Robe green to purple), and a lot rolls inside it. Its properties are written in order for its best rarity, and each rarity takes as many as it grants (one at green and blue, two at purple), so a green Iron Sword is the same sword with its first property. Pills, talismans and beast parts also take the tier of their maker or their beast. Methods, techniques, Arts and formulas have one rarity each: a manual is what it is.

**The roll.** A lot rolls a rarity on the shared table at the source's bias (Items and gear, Loot and shops), then picks among the things that come at it, by weight; when nothing does, it takes the nearest rarity below that something does, and only when nothing is that low, the nearest above, so a shop whose stock starts above the roll (a sect's shop) still fills the slot. A gold or red roll draws on the written gold and red list among the things that fit the source, and lands purple when nothing fits. A shop's month of stock is seeded by the shop and the month, and an NPC's kit and ring by their seed, so the same stall shows the same lots and the same elder carries the same ring every time; only a Fortune drop draws the `loot` stream.

**Names.** English first, with pinyin and hanzi, as places and sects are; GLM never renames a written thing.

## Enemies, beasts and the people you meet

NPCs run on the player's rules, and pedigree is only access (Tier, rarity and pedigree). This is how they are made, how beasts fight, what the dead leave behind and who stays in your life.

**A cultivator is generated, not authored.** The template is a pedigree, a realm and stage, a weapon and its Dao, a path (qi, body, soul or balanced; the pedigree's unless the template names one: rogues and small sects walk qi, the great sects and above teach all three), a profile, a name in the region's naming style and a seed. Everything else is rolled from the pedigree's table on the `people` stream: method rarity, which sets the growth that built their pool and HP; technique rarity and mastery, which their path art and a guard art for every path share, the movement art a band below from green, since movement arts are the rare ones (C3, Jan's call: tempo and fleeing read it); a weapon and an armor; zero to two consumables; a storage item; and a breakthrough grade. Named people from the atlas are the same record with the rolls pinned, so an elder and a bandit differ in access, never in rules.

**Pedigree is a bias on the shared roll**, the same rule as loot and shops (Items and gear): each rarity's weight is multiplied by b to the power of its step from gray.

| Pedigree | b | Typical method | Technique mastery | Intent on the weapon's Dao | Domain |
|---|---|---|---|---|---|
| Rogue | 0.5 | white | Comprehension | from Core Formation | never |
| Small sect | 1 | green | Mastery | from Foundation | from Nascent Soul |
| Great sect | 1.6 | blue | Mastery | from Foundation | from Nascent Soul |
| Sacred land | 2.5 | purple | Perfection | from Foundation | from Core Formation |
| Chosen of heaven | 4, and one slot guaranteed gold or better | gold | Perfection | from Qi Condensation | from Core Formation |

Each realm's ordinary baseline rises on top, since anyone who reached Nascent Soul has lived for centuries: the bias is multiplied by ×1 at Qi Condensation and Foundation, ×1.3 at Core Formation and ×1.6 from Nascent Soul up. Mastery rises one level for every realm past the first, up to Origin, because practice days pile up. The biases are midpoints of ranges the sim tunes; the fighting-up ledger's rows are what they must reproduce.

**NPC pace.** An NPC's realm comes from its age and pedigree: it climbs at the away rate on its pedigree's typical method, read off the pacing sim's away row, so a rogue at sixty sits at Qi Condensation's peak while a great-sect disciple reaches Foundation around thirty. The expected realm at each age per pedigree is a sim output in `src/content/pace.ts`, read by encounters and rivals. An attended player outpaces a same-pedigree NPC by up to double (How the two halves connect), and that gap is the edge for playing.

**Profiles are five numbers.** The engine owns every choice; GLM gives it a voice.

| Profile | Opens with | Picks | Defends or takes a pill at | Flees at | Talks |
|---|---|---|---|---|---|
| Aggressive | its hardest technique | the hardest hit | never | 10% HP | taunts, never begs |
| Cautious | defend, then a probe | the best element | 50% | 30% | bargains |
| Cunning | a status or a trick | statuses first, then element | 40% | 25% | bluffs, bargains, lies |
| Cowardly | a shield or a talisman | the cheapest | 60% | 50% | begs, surrenders |
| Fanatical | its hardest technique | the hardest hit | never | never | preaches |

Beasts take profiles too: predators are aggressive, herd beasts cowardly, old beasts cunning.

**Beasts.** A beast has a species, a realm on the same ladder (a Foundation beast is a Foundation foe, with the same gap), a bloodline rarity in place of pedigree, one element, a profile, a pack size and a parts table. Beasts are body-first: ×1.5 HP, no armor and no qi shield, a hide for Defense below a cultivator's, physical damage plus their element, no pills. Every species has its natural attacks, bite, claw, charge, tail, crush, and its bloodline rarity rolls abilities on top from the element's table: none at white, one at green, two at blue, three and an aura at purple, a unique at gold and a named one at red; a pristine bloodline is a legend with an entry of its own, rolled once in ten thousand. The abilities are techniques on the same engine, so they take the Dao bonus, the element cycle and the effects by their tags.

| Element | Abilities |
|---|---|
| Fire | ember breath, burning hide, heat sense |
| Water | tide pull, mist veil, chill |
| Earth | stone skin, quake stomp, burrow |
| Wood | root grasp, regrowth, venom thorn |
| Metal | iron scales, blade feathers |
| Lightning | lightning dash, paralyzing bite |
| Wind | gale wing, uncatchable |
| Ice | freezing breath, frost armor |
| Soul | illusion, fear roar, soul gaze |
| Poison | venom fang, miasma |

At Nascent Soul a beast takes human form and becomes a cultivator record on a beast path: its abilities are its techniques and its bloodline is its tempering art (World bible, spirit beasts).

**Bloodlines and beast paths.** A bloodline is a thing you have: born with it, as half-bloods and the beast-bloodline body talent are, or gained by a blood rite, a beast bond, or devouring a core on the Demonic Way. Holding one unlocks that element's beast abilities as body techniques, with the bloodline as the requirement and the element's Dao as the tag, so a beast path needs no tree of its own. A half-blood raider in the Border Wilds and a transformed python are one rule from two sides. Only generated beasts and half-bloods carry their abilities so far: a bloodline unlocking them for you, and the unique and named abilities at gold and red, come with taming (Professions, people and powers).

**What the dead leave.** A dead cultivator drops everything they carried: their kit, their bag and their storage item, which comes as a sealed ring until you can open it (Items and gear, storage). The only losses are the consumables they spent in the fight and the piece of gear the killing critical hit, which drops damaged, one rarity step down, and a refiner mends it back for half the price between the two. A fleeing enemy keeps it all. A sect disciple's token drops too, a key item that is a hook and a danger, since the sect will ask who holds it. A beast drops by its parts table: a core from Foundation up and half the time at Qi Condensation, its tier the beast's realm and its rarity its bloodline, and hide, marrow, blood, fang or feather by species. Tempered Marrow, the body offering, is refined from a Foundation beast's marrow.

**Who stays.** The world is three layers, and nobody is simulated who hasn't touched you:

- Transient: a generated enemy or passer-by exists for its scene and is thrown away.
- Kept: a scene that ends with a thread keeps them. You talked and traded names, haggled at their stall, spared, robbed, healed or bargained with them, survived a fight with them or they with you, or a card named them. A kept person is stored as a seed plus pins: the seed regenerates their kit and rolls on demand, and the pins are what changed, regard, realm, whereabouts, what you took. That is the People screen (Professions, people and powers), dozens to a few hundred a life, mortals included. Named atlas people are kept from the start with everything pinned. They tick on a coarse clock, a season or a year: climb at the away rate on their pedigree, age, roll for death, move, and roll an event that may write to their log.
- The world: powers have strength on the realm curve and prosperity drifts, and encounters generate from tables. A place's people are generated from the place's seed, so the same keeper stands at the same stall next time, and a rumor about "a Foundation elder of the Beast-Butcher Gate" carries a seed, so when you meet them they match the rumor.

**The Border Wilds roster**, the beasts and cultivators its encounters draw on in the Qi Condensation and Foundation bands, is in `src/content/roster.ts`.

## Character creation and the first hour

Play opens at age 12 on root-testing day in the Border Wilds. Creation takes about 3 minutes; by minute 15 you have won your first spar for your first technique and broken through to Qi Condensation layer 3, and by the half hour you have walked your first road and come back with a gathering bounty (the origin's chain, below).

**Creation, in order**

1. Name and look: a family and given name (pinyin, with suggestions), one line of appearance, and pronouns.
2. The talent roll: one talent of each kind (spirit root, body, soul, fate, origin), most of them plain. You get three free rerolls, each rerolling all five at once, and the last roll stands. Later lives earn more rerolls, as Death and rebirth describes.
3. Childhood: a short paragraph per origin, fixed text that GLM rewrites from your rolls when a key is set.
4. Testing day: the stone lights up, and your first choice decides where you stand when play begins.

**Spirit roots.** Everyone rolls one; the floor is a mixed root:

| Root | Odds | Qi speed | Notes |
|---|---|---|---|
| Mixed (four or five elements), white | 49.9% | ×0.6 | slow at single-element methods, but the only root that fits five-element methods fully |
| True (two or three elements), green | 35% | ×1.0 | the ordinary disciple |
| Single element, blue | 10% | ×1.5 | sects compete for you |
| Heavenly single, gold | 0.9% | ×2.5 | great sects send people for you |
| Mutated (lightning, ice, wind), purple | 4% | ×2.0 | rare methods fit it; ordinary ones fit badly |

The red root is the chaos root, 0.1%: every element in balance, ×3.0, and it fits every method fully. The pristine root is the Primordial Root 鸿蒙灵根, 0.01%: the qi of before the heavens were cut, every element, ×3.5, fitting every method fully, with a point of Aptitude and faster insight besides. Every root holds elements, rolled at creation from its kind: one for a single or heavenly root, two or three for a true root, four or five for a mixed root, one of lightning, ice or wind for a mutated root, and all five for the chaos root. The element hours read them, and a named root like the Innate Sword Root is a root with effects beyond its speed, like any talent.

**Three origins**, all in the Border Wilds. More come with the systems they need: the beast-ranch child with taming, the merchant's child in the fortress city with trade, the smuggler's ward with smuggling.

| Origin | Testing day | If you go along | If you refuse |
|---|---|---|---|
| Cave orphan, Kingdom of Stone Eyes | the imperial tester comes to the sinkholes, and the cave clans hide rooted children | the March's garrison school: a standard method, rations, a place on the wall | the clans hide you: a crude cave method, a map of caves no one else has, smuggler contacts |
| Conscript's child, March of Pacified Borders | the Gongsun garrison claims every rooted twelve-year-old for its cadet school | cadet: a spear method, a stipend of low-grade stones, patrols on the Wall of Piled Bones | deserter: no method yet, a bounty on you, and the Night Bridge Society offers a way out |
| Frontier orphan, City of the Guarded Mouth | the Beast-Butcher Gate's recruiter tests orphans who lost family to beasts | outer disciple: a saber method, contribution for cores, a senior who expects results | street cultivator: no method yet, odd jobs at the bounty office, and the Gate remembers you said no |

Refusing is harder but never a dead end. The two refusals that start without a method find it in the rogue's first work by about minute 6 (The rogue start), so their chain runs on the same minutes as going along. The deserter is taught the Night Bridge Society's breathing; the street cultivator is paid in a torn manual, a copy to read before it is a method, which takes the whole wheel until read (Cultivation, Reading).

**The origin's chain** (the opening redone, 2026-10-20, Jan's calls). Every origin runs five quests on one skeleton, carried by the journal (UI and screens, The journal) and introduced as UI and screens, Introductions sets out; each origin writes its own givers, places and text, so a start in another region reuses the skeleton. It replaces the first-hour cards (the refusal's method, the first technique, the errand's copy, the lamp-keeper and the Foundation exam), whose text the quests take up. It is your origin's chain, so it can't be dropped, and nothing in it is timed. **Every quest has a reason in the world**: someone you know needs the thing done, and you are the one sent (the garrison's wounded on the wall need fever herb and the stores are bare; the cave clans' winter store came up short; the Gate's senior owes the bounty office a delivery), never a quest to learn the map. Past minute 15 its minutes scale with the clock.

| Quest | Minutes | What you do | What it gives |
|---|---|---|---|
| The first breath | 0–6 | the screen builds itself: read your method, take it up, watch the bar, draw the first orb (the veil), focus | layer 1, and the wheel fades in |
| The first lesson | 6–15 | an hour turned to Study, the first node bought, then a spar with a senior played as a fight (the veil on its first turn), then layer 3's breakthrough (the veil) | the payoff: your origin's first technique, then layer 3 |
| The board | 15–30 | a gathering posting at your place's board, a walk to a place within a day's road, gathering there, back to hand it in, then a first buy at a counter | stones, and the tempering art's copy, which opens body hours |
| Your place | 30–50 | going along: your post and its Duty hours, your seat and contribution, the dwelling and the sect shop; refusing: the rogue's work (The rogue start) | the nourishing art, earned by your first contribution or the rogue's first pay, which opens soul hours |
| The road to Foundation | 60–150 | at layer 9, your origin's exam, a hunt or a trial played as a fight at your depth | the Foundation Pill, earned rather than handed over, and Foundation near 2.5 hours |

- **The spar always teaches.** The senior holds back; lost, it is "again tomorrow", sparred again the next day, so the technique comes from winning and the quest never dead-ends.
- **The board's road teaches the stances by doing.** The road out holds one fixed encounter, a beast below you to go round (Avoid) or take on (Bold); you travel Careful by default, and the stance chips get a ring the first time you walk. Gather hours, sensing by your realm and fog lifting as you walk come on the same road.
- **Each piece of the screen is taught where it first matters**: focus in the first breath, the stats after the spar (a ring on Character, why you won: your sheet against theirs), divine sense on the board's road.
- **An origin that goes along meets what it already holds.** The post, the seat and the dwelling it starts with are walked through in Your place, when they matter, rather than sitting on the Character screen from minute 0.

Each origin's five quests, their text, givers, places and reasons, and the board's fixed encounter, are The opening, built's to write for Jan's review.

**The rogue start** (the opening redone, 2026-10-20, Jan's calls). A rogue is any start that belongs to no power: today the street cultivator (the Gate refused), the deserter (the garrison refused) and the cave orphan hidden by the clans. Creation marks refusing as **harder, for a player who knows the game**, beside the choice (for now). A rogue runs the same chain with its own givers, and Your place becomes **Your own way**.

- **The first work brings the method**, one step with a ring before the first breath, by minute 6: the street cultivator minds a stall for the bounty office's clerk and is paid in the torn manual; the deserter carries a message across the Night Bridge and is paid in the Society's breathing; the cave orphan already holds the clans' method. Layer 3 lands near minute 15–18.
- **Paid work with no post**: day hires at a place's Work door (carrying, stall-minding, a cart guarded, herbs sorted), the board's bounties and selling what you gather, on the hires and Duty hours already written (Professions, people and powers, Posts), paid by the day, never a stipend. The board's reason, for a rogue, is that it needs the stones.
- **Freedom is the payoff, and it costs.** No quota, tithe or leave, so you go anywhere; the black market and the world's work are open. No stipend, no dwelling, no pavilion, no senior to back you; the rogue's codex entry says plainly what was given up.
- **Your own way**: a place of your own to cultivate in, a cave or hut you find (a site you stay at, as today's caves, huts and shrines are), in place of a seat's dwelling; and the nourishing art paid for your first big job (a Night Bridge run, a bounty for the Gate's orphan, a smuggling run for the cave orphan).
- **A thread of trouble each**: the deserter's bounty, garrison hunters as road encounters, paid off as a mark is (Guarded methods); the Gate's grudge, a Gate disciple who comes to taunt, the Gate's trial still open later; the clans' secret, the imperial tester's men still asking after hidden children. Any rogue can join a power later by its way in; the March stays shut to the deserter until the bounty is paid.
- **The rogue earns its own Foundation Pill**: no exam, but the pill bought at the black market, won as a high bounty or paid for a Society job, at a price the rogue's work reaches by layer 9. The pill's price and the hire rates are measured in The opening, built's talk against the sims.

There are no tutorial walls. Each system appears when you first reach it, introduced as UI and screens, Introductions sets out, with a chronicle entry.

Layers 1 to 3 are the tutorial and ignore root speed, method fit, the method's tier, rarity and mastery, and the element hours, so every root reaches layer 3 near minute 15; dawn, discipline, Aptitude and nodes still count. The rest counts from layer 4. Pacing targets for the sim, which takes an attended fraction (none, a third, all) and reports a row per schedule (the opening redone, 2026-10-20, from Sean's playtest): attended throughout, an ordinary true root reaches Foundation in about 2.5 real hours, around age 14.5; a heavenly root in about half that, and a mixed root in about 4. Away it takes about twice as long, about 5 hours; the away row is the floor, not the goal, and attended play is faster by design. One speed factor, about ×3.5 on the rates before the redo, lifts qi, body, soul and insight together, so the three paths and each layer's insight purse keep their balance; the sim sets it. One real hour stays one game year, and the world's own people keep their pace, reaching Foundation near 30, so the player is a prodigy and the world takes them as one. The clock may stretch to 4–5 attended hours once there is enough to do on the way (Jan's call): the factor is the knob, and what there is to do sets it, never the reverse. Foundation then waits on a Foundation Pill from the world.

**Stand-ins until the world supplies them.** Body and soul methods are found, not given, and the Foundation Pill comes from the world; until going in can hand them out, the origin's chain does: the board hands over a copy of a common tempering art, which opens body hours once read; Your place a common nourishing art, which opens soul hours; and the exam at layer 9 the Foundation Pill with the next chapter of your method, since a Qi Condensation method stops at the peak of its realm; that chapter is a copy too, read before it can be taken up. Both arts are tier 1, so body and soul stop at layer 9, and the Foundation grade's body and soul points wait for higher arts.

## Story cards and events

Everything that happens to you is a card, in seclusion and in the world alike: a seclusion event, a beat of the first hour, a sect summons, a headline, a go-in encounter, the coming-back summary. One format and one engine, working without the AI; new systems add decks, not new kinds of card, and the Scribe rewrites a card's text when a key is set.

**Every card is concrete.** Every card is grounded in the atlas's places, powers and beasts, scaled by realm band so a threat is a threat at your realm, and carries a concrete stake and payoff, never mystery alone; a card with a person or a place is a hook you can go into (The world, Encounters on the map); its checks are the resolver's comparisons, not a d20; and the first-hour cards and the origins' text read roles, never names (NPC basics).

**A card is data:** a trigger on your state (realm, layer, bar, age, season, hour, flags, items, standing, where you are), a weight, once-only or a cooldown, a short text with slots for names and places, one to three choices, each with a cost or a check (hours, stones, an item, a check on the resolver) and effects the engine applies (stones, items, bar, insight, injury, a flag, standing, a method, technique or routine, a go-in scene), and a chronicle line. Cards draw on the `world` stream.

**A card can be a whole small interaction.** Its choices can lead to further steps instead of ending it: haggling with a peddler over a few rounds, tracking a thief through the karst, sitting out a storm watch by watch, each step with its own text, choices, checks and effects, and later steps reading what earlier ones set. The chronicle gets one line for the path taken. A card left to resolve on its own follows each step's default. Single-step cards stay the common case; a few meaty multi-step cards per deck carry the stories.

**Where they live.** Cultivate carries the feed: pending cards stack in a tray under the figure, the top one open and the rest fanned behind it, each rising onto the stack as it arrives and sliding off once settled, and resolved ones fall into the Chronicle. Cards wait for you; no timer punishes absence. A few urgent ones resolve by default if ignored for some days, a thief takes the stones, and offline at most three queue while the rest resolve by default and show in the coming-back card, which becomes a story rather than a ledger.

**Pacing:** about one card every five to eight real minutes while you idle, two or three an in-game season at Qi Condensation, with the chance per season scaled down at higher realms so the real-time pace holds whatever the clock does. The orbs are Cultivate's pulse (Attended seclusion), so cards don't have to be: they can be rarer and heavier than that rate as the deck grows, and meatier beats a clicker stream, so the deck needs enough cards that repeats stay rare, and a long absence tells its many small cards as a story. No streaks, dailies or missed-out counters, ever, and the coming-back card never mentions what attending would have earned.

**Decks grow with the game:** the first hour's cards and the seclusion deck, then fight, encounter, craft, people and world cards as each system arrives.

**Seclusion is quiet, not silent.** Five kinds of event:

- At the door: a peddler with a pill you can't afford yet, a junior begging help, a sect summons, a tax collector, a beast sniffing round the cave, a thief. Choices trade hours, stones, risk and standing, and a choice can open a go-in scene.
- Inside you: a qi deviation scare on a bar past 140%, an epiphany that lumps insight and discounts a Dao, a dream that wakes a sleeping talent.
- Sky and season: a thunderstorm over the peak, sit it out for Lightning insight at a body risk; a spirit tide that doubles qi density for a day; a yin night that favors ghost work.
- Named days: new year, the sect's lecture day, the beast tide, each a recurring card with its own choice.
- People from the start: the sergeant, your senior, the clan aunt as named people in the card text, each with a record (Professions, people and powers), so the first hour already has faces.

## The world: travel, trips and encounters

**Do whatever you want.** Going in rests on one principle: the player can try anything, and the world answers by its own rules.

- **Free to try, not free to win.** Scale holds (Scale of destruction): a Qi Condensation punch cracks a wall, never the Wall of Piled Bones. Memory holds too: rob a Gate runner and the Gate remembers.
- **Free text on top, twelve verbs underneath,** as combat already is (Combat: rules underneath, free text on top). The interpreter turns what you write into verbs with targets and the scene's features ("wait on the cliff until the caravan passes, then cut the lead mule loose" is rest, then evade, then take); the engine resolves them (The resolver) and the narrator tells it. Going in uses GLM 5.2 fully; without a key, trips still run on the engine, but there are no scenes.
- **Priced, not gated.** Nothing says "you can't" except scale. An attempt costs time off your wheel, risk, standing, karma and fame, and every attempt changes something: time passes, or someone saw.
- **As deep as the world's memory.** Freedom reaches as far as the state the world keeps: people who remember (Who stays), places with fields and features (The world map, The atlas as data), standing with each power. An attempt whose system isn't built yet is narrated, and says it isn't real yet.

| Verb | What it covers |
|---|---|
| Go | travel, enter, leave, follow, turn back, go home |
| Look | look around, search, track, watch, scout |
| Talk | ask, persuade, lie, threaten, bargain, beg, recruit, challenge |
| Fight | attack, ambush, duel, hunt, defend |
| Evade | flee, hide, sneak, disguise, hide your realm |
| Take | loot, gather, mine, steal, rob, claim |
| Give | buy, sell, pay, gift, bribe, ransom, deliver, donate |
| Use | an item, a technique, a scene's feature; heal, open, break |
| Cultivate | sit at a source, comprehend a stele, break through, seclude |
| Work | bounties, jobs, patrols, escorts, missions |
| Rest | wait, camp, recover, let time pass |
| Make | brew, refine, inscribe, plant |

**What you can do**, the menu the interpreter knows; an act whose system isn't built yet is narrated (Do whatever you want).

- **Move:** walk · march pressed · ride a horse, cart or mount · fly your own sword (Foundation) · ride someone else's sword or boat · pay smugglers for the low-tide chain · hire a guide · roads or cross-country · travel by night · walk blind into the fog · detour · turn back · camp anywhere · go home anytime · walk by day and cultivate by night · teleport arrays · the flying boat
- **Find:** look around · search a body, a room or a ruin · track a beast · tail a person · watch a place from cover · scout ahead · read the bounty board · buy a rumor at a teahouse · ask locals · buy, steal or loot maps · follow a treasure map · see through a hidden realm · appraise · divine
- **Talk:** ask · persuade · lie · bluff · flatter · threaten · press with your realm's aura · beg · haggle · bribe · trade names · insult · provoke · challenge · apologize · promise · swear brotherhood · recruit a companion · hire a guard · sell information · report someone · start a rumor · court · take a disciple
- **Fight:** attack · ambush · sneak attack · duel · spar · fight with the scene (burn the grass, drop the rocks) · talismans · command a beast · hunt beasts for cores and parts · clear a den · hunt bounties on people · defend a village · spare · take captive · finish the wounded
- **Get away:** flee · hide · sneak past · disguise yourself · hide your realm · act weaker than you are · burn an escape talisman · surrender · pay them off · leave a decoy · outfly them · go to ground in a town
- **Take:** loot the dead · gather herbs · mine ore · butcher a beast · open a sealed ring once your soul can · rob a caravan · pickpocket · burgle · steal from a sect's store · rob graves · poach on sect land · claim a cave as your abode
- **Give and trade:** buy · sell · barter · pay or refuse tolls · give gifts · return lost things · pay debts · pay ransoms · fund a village · donate to a temple for merit · auctions · standing orders
- **Help or harm:** heal · save · escort · deliver a letter · avenge · protect mortals · free captives · kidnap · frame · assassinate · interrogate · search a captive's soul (karma) · poison · betray
- **Places:** enter towns, cities and markets · get into a gated place by token, rank, invitation, toll, force or stealth · cross hostile land while hunted · enter a deadly land past its warning · enter a secret realm while it is open · take an inheritance trial · open a tomb · break an array · wreck a place (standing, and scars from Core Formation up) · found a sect
- **Cultivate out there:** sit at a waterfall or a thunder peak · comprehend a stele or a sword scar (an Intent moment) · drink from a spirit vein · seclude in a cave you found · break through in the wild, where someone may come · meet a tribulation where you choose
- **Work:** take a bounty · herb runs · patrol the Wall · deliver · guard a caravan · core hunts · a day's guarding, guiding or hunting for a stone · sect missions and posts · sell what you craft
- **Be someone:** keep a vow (Buddhist) · walk the demonic road (devour cores, drain cultivators) · keep or break promises · build a name or stay unknown · make friends and grudges that remember · take a side in a feud

The map is the go-in's board, and travel reuses the wheel.

**The travel map.** The world map is the main go-in mode and its own screen, the Map 舆图, and the Chronicle column hides on it so the map has the room. Travel is as easy as a click: left-click where you want to go and a dotted course runs from you to there, and you set off as the clock turns; a click again changes course at any time. The map fills the screen, and one narrow column against the rail holds the rest, over the void sky coming in from the left and fading out into the map (take P of `docs/mockups/map-layout-study.html`): Routine's tabs showing one thing at a time: **Journey** 途 (where you stand, then the course card with what's ahead), **Travel** 行 (the road wheel with its routine, the mode of travel as a list of every way, those not open to you greyed with why, a horse and a spirit mount one entry, Mount, riding the best you own, and the stance) or **Card** 遇, the card the road brought, lit like a glowing row (a gilt hairline over its top). The Card tab is always there; it opens itself when a card starts waiting, and the column goes back to Journey once the card is answered. Journey's top, Currently at, says where you stand: the place or the land, its terrain, its qi density, how far you see, and how deep you are, with what lives there ("ring 2 of 5 toward the Wolf King's ridge: beasts of Foundation, early · blue finds"), its lore, and what you can do there (enter, stay and cultivate, go home); a place's picture stands at its top. A realm above you shows in red over the tabs.

- **Right-click is for choices; routine things run by rule.** A place, a town, a cave or a sect's gate, is only entered: everything done in it is done on its own screen (Entering a place). Bare land offers Go here and a pin, and leaves room for what a pin can become: a stash, an abode, a sect or a faction. Where you stand offers staying to cultivate, hiding your realm and going home. Looking around and making camp are never buttons: the road wheel holds a look-around hour, you look around on arriving, and where you sleep is picked by rule.
- **The look** (the pipeline is in docs/art-pipeline.md, § The travel map). The land is painted, one painting a region by GPT from a guide drawn off the atlas: its peaks and stone pillars jut up out of the map with real height and shadow, small and many so the land reads vast, seen from high and tilted like a carved relief model, moonlit, in a xianxia mood (take D, `docs/mockups/map-takes/bw-take-D.png`). Detail tiles, the same land painted again closer and upscaled, stand over it at every zoom, so the map is one picture near and far and stays sharp to the closest zoom. The land is lifted half again under the fog, its colors ×1.5. A region not painted yet shows plain land, each terrain a dim flat tint of the guide's colors, under the same fog. The painting has no roads. The fixed places, the atlas places and the written towns, are painted into it (A5.3), each drawn larger than life as the painting draws its peaks, in Chinese cultivation-game xianxia: pagodas, halls and pavilions, cliff-high walls, arrays as domes of light; close in its seal gives way to the painting, under a soft gold glow, which also shows on hover from afar. Seeded sites move between worlds, so they stay seals, except the few that read as land from that height (herb valleys, springs, waterfalls, ancient trees), which stand as transparent pieces, one of several variants of their kind picked by the site's seed. The roads, seals, names, depth rings, your course, you and your sight ring are drawn over it. Sites are hanzi seals (镇 town, 村 village, 洞 cave, 穴 den, 墟 ruin, 祠 shrine, 谷 herb valley, 泉 spring, 瀑 waterfall, 峰 peak, 寨 camp, 庐 hut, 矿 mine, 冢 graves, 木 ancient tree, 碑 stele, 卡 checkpoint, 渡 ferry, 王 a heart), the small ones shrinking to dots when you zoom out.
- **The land is the region's own.** The wild tracts' cells, and so the terrain the rules read, are seeded by the region's land seed, the same in every world, so one painting fits every save; what stands on the land (wild sites, road bends, hearts) still varies by world.
- **The fog's look** (`docs/mockups/map-ground-study.ts`). Seen land is clear to its edge. Sketched land you haven't seen keeps a light veil, a little dark and drained, with a rare thin wisp. Past what you know the dark comes on slowly, outward only, over some 7,000 li, with the land beyond still faint under it, drained of color. Painted cloud banks, eight shapes, are laid by a rule on what you know: heaped in irregular clumps where the dark comes on, thinning out with distance from what you know, each placed, sized and turned by a seed on its spot, so nothing repeats, the same knowledge gives the same clouds, and as you chart more they move out with it.
- **How far out you can zoom:** only as far as fits everything you have charted (the places at least sketched, and your trail) with a little room round it, in the part of the map the column leaves open, so the unknown is never the map; it grows as you chart more. The closest zoom stops where the upscaled tiles run out.
- **Next door:** every region and sea that touches your region's border shows faintly through the dark, its name in the middle of it (a sea's in a watery tint) and a region's edge dotted, since you would have heard of them; nothing further.

**Travel is a kind of hour.** Two wheels: the home wheel turns while you are at rest, and the road wheel takes over when you set a course. The road wheel has three hour kinds of its own, travel, look around and gather, and is yours to edit, on Routine's Road side (the Map's Journey tab shows it and switches its routine, and an hour tapped there opens Routine on it): editing a saved one copies it into your own road routines, which you can rename and forget; sleep stays locked at Qi Condensation. Four come saved, and three are yours to pick: Caravan guard is kept only while you guard a caravan, which sets it, since alone it is the caravan's pace with no wage:

| Road routine | Hours | What it does |
|---|---|---|
| Travel by day, cultivate by night | travel 辰 to 酉, look around 戌 | open, on the roads |
| Pressed march | travel every waking hour | more encounters |
| The night road | travel 寅 and 酉 to 亥, look around 卯 | hidden: off the roads and round the checkpoints |
| Caravan guard | guard 辰 to 酉 at 20 li, look around 戌 | paid a low-grade stone a day, slow and safe, roads only |

By light step or on your own sword the travel hours move you and the rest of the day is yours. A cultivator doesn't walk: from Qi Condensation they outrun a horse (Scale of destruction), so the way on your own legs is **Light step** 轻功, and the map says "on the road". Riding moves you without your hours, and your wheel turns at a jostled half for qi, body and soul, study untouched on a boat.

| Going by | Li a double-hour | Hours a day | Your hours |
|---|---|---|---|
| Light step (Qi Condensation) | 40 | the routine's | spent |
| Horse (bought) | 30 | 6 | free, at half |
| Mount (a spirit mount, bought or tamed) | 45 | 8 | free, at half |
| Passage by boat, along a coast or a river | 30 | 12 | free, at half; study whole |
| Fly: on your sword from Foundation, stopping to refill your qi; sustained from Core Formation | 200; 300 | the routine's | spent; seen from afar |
| Someone else's sword or ship, hired for stones | 200 | 6 | free, at half |
| A cloud ship, a sect's, sailing with its group through the night | 250 | 12 | free, at half |
| Nascent Soul, blinks and flight | 600 | the routine's | spent; seen from afar |

**Travelling with a group.** With a caravan or on a ship's passage the group owns the course and its stops, and you own your wheel outside its duties. A click on the map asks whether you want to leave it, and says the cost: a guard who walks off loses the pay owed and the merchant guild's regard (standing −5); stepping off a sect's cloud ship two thousand li up is refused without flight of your own, and walking out on a sect's errand is desertion. A flying ship sails through the night and stops only where its trip does, and a trip may have several stops; it gathers nothing unless its leader would stop for it, and meets only what could rival its leader, since beasts read a cultivator's realm. When you lead the group, those calls are yours.

**Going somewhere.** Pick a known place, a point in the fog or a pin, and the engine routes along the roads where they exist and cross-country where they don't, with days from your pace: off the road your pace is ×0.8 on plains or coast, ×0.6 in hills, ×0.5 in forest, ×0.45 in karst, ×0.4 in marsh or jungle and ×0.35 in mountains. The course card gives the li by road and cross-country, the days, the arrival date, the real time at your clock (a day is ten real seconds at Qi Condensation), the checkpoints and their tolls, and a warning when the course crosses ground a realm above you. Each travel day rolls encounters by the terrain under you, the hour, the band where you stand, your fame and the calendar (The road's encounters).

A mortal on foot makes 20 li a double-hour. A kingdom of 10,000 li is half a year on foot for a mortal, a season at five hours a day at Qi Condensation, two months by horse, ten days on a Foundation sword, a week in Core Formation flight and days at Nascent Soul; a region of 60,000 li is half a year on foot at Qi Condensation and a month at Core Formation.

**The map's distances are ×30 a scene's.** The scale table's sight, a look around and divine sense are scene distances; at region scale they would be smaller than a pixel, so the map reads every sensing distance at thirty times, since a map day is a whole day of looking. On the map you see 600 li on open ground and 150 li in forest, jungle, karst or marsh; looking around covers 60 li; divine sense sweeps 60 li at Foundation, 600 at Core Formation and 6,000 at Nascent Soul; a rumor's ring is 3,000 li across. Scenes keep the scale table.

**Gather** 采 takes an hour (O4; Jan's call after A5.1): you stop and search the land where you stand, gaining nothing on the wheel. It finds the herb, material and staple lines the land grows there (the catalogs' land lines for its terrain, in its region and continent, on a vein strong enough): 3 pieces an hour in the deep wilds (a ring or more past the edge), 2 in the wilds, 1 near people, where the land is picked over, times (1 + your Perception), a part carried to the next hour. How good is your soul against the land's band, a comparison: at or above its band you find its best rarity, a band below its lesser, further below a step under that, and nothing past purple unless your soul leads your realm. Which line it finds is seeded by the spot and the hour. The stances no longer gather: a find met on the road is taken only on a road wheel that keeps a gather hour, and otherwise left.

**Look around** takes an hour, which the road wheel spends at its look-around hour, and once on arriving. It finds what is hidden within 60 li, each hidden site taking a Soul check against its rating, and the rumored place whose ring you stand in. With divine sense, from Foundation, the sweep needs no check. A site hidden by an array or a realm above your soul stays a rumor whatever you roll. Travel alone marks places seen; looking around finds what is hidden and lists each site's features.

**Where you sleep** is picked by rule when the wheel sleeps on the road: an inn if you stand in a town (20 taels a night, paid by rule while you are inside one away from home), a cave, hut or shrine you have found within 300 li, else a camp in the open, where night encounters roll.

**Depth and qi density.** How strong a place's life runs is two fields, never one number:

- **Qi density** is an atlas field (`qiDensity`), 1 to 9: barren, sparse, thin, modest, ordinary, rich, abundant, blessed, heaven-touched. A place without one takes its parent's. It rises toward a continent's heart and its great powers' seats and falls at the frontiers: the Border Wilds are 3, thin, and the Soul-Lost Stone Forest 5. It sets a land's edge band, what lives at its edge near people: qi density minus 3.
- **Bands** are a third of a realm each: layers 1 to 3, 4 to 6 and 7 to 9 of Qi Condensation, then each later realm's early, middle and late, on to Tribulation Transcendence. A band below 0 holds nothing past mortal beasts.
- **Hearts.** Each wild has its centres: a beast king's lair, a vein, a forbidden land. A tract seeds one, two if it is large; a forbidden land is its own, named by the atlas. A heart carries its own rank: a named one fixes it (the Stone Forest's python, Nascent Soul); a seeded one stands two to five bands above the land's edge by its tract's size, and more as qi density rises, so a heaven-touched land's heart runs past Deity Transformation. A stronger heart holds more ground.
- **Depth** counts the bands from the land's edge up to a heart, one ring a band, drawn on the map as dashed lines. Near people it stays shallow (the edge, within 1,500 li of a road or settlement), across the open wilds it is one ring, and it rises only toward a heart; each 1,200 li from the nearest road or settlement allows one more ring, so roads carve the hearts back, and a heart's ground is a ragged shape that fills its wild. What lives at a spot is its band: the edge band plus its ring.
- **A realm above you likely finds you first.** Whether something on the road notices you before you notice it is its Perception (soul) against your Stealth (body and Agility), and it finds you once its Perception stands a realm beyond your Stealth. Avoid trouble goes round only what hasn't found you, so on ground whose band is a whole realm above yours it rarely holds unless you have built for stealth. The line under the date says so in red, and so does a course that crosses such ground.

**The fog.** What you know of the map is kept per place for the rules: each place, an atlas entry or a site inside one, holds one of the four states (The world map, Fog of war), and a state only rises, Unknown to Rumored to Sketched to Seen. An area, a kingdom, a tract of wilds or a forbidden land, shows its outline once Sketched and its inside once Seen; a point, a town, a cave or a sect's gate, shows its mark. The one picture kept is the trail you walked: the save keeps it, and the map lights a band along it as wide as your sight. How the fog looks is under The travel map, The fog's look.

- **Sites.** The atlas stops at kingdoms, cities, landmarks and powers. Below it, a region's towns and villages are written by hand as data, a few to each kingdom and a few in the wilds, with the roads that join them and their shops standing in them; a road crossing into a kingdom passes a checkpoint, and a road crossing a river a ferry. The wilds between the kingdoms are tracts, named stretches with a terrain of their own, their names written and their cells seeded by the region's land seed (The travel map, The land is the region's own). Wild sites are seeded from written tables by terrain, about nine to a tract or a kingdom, one in five hidden: a cave, a den, a ruin, a shrine, a herb valley, a spring, a waterfall, a peak, a camp, a hut, a mine, graves, an ancient tree, each with tagged features for scenes. Seeded from the world and the region's id the first time anything needs them and kept in the save, they belong to the world, so every life in the slot finds the same ones. A region without written towns seeds its towns from the same tables.
- **Travel** turns Seen every visible place within sight of the route, 600 li on open ground and 150 li in forest, jungle, karst or marsh, and the tract you cross. Hidden sites never show from the road. From Foundation the divine sense circle sweeps as you travel, so hidden sites within its range of the route turn up without stopping.
- **Maps** are items with the chart use: used, they Sketch their places at once, and they stay in the Bag. A kingdom map gives its outline, towns, roads and named landmarks, sold in its towns for about a month's wage at Qi Condensation (30 low-grade stones); a region map gives its kingdoms and named places, a city's for about a year's wage (360 low-grade) or a sect's for contribution; a treasure map gives one hidden site, exactly. Only a treasure map shows a hidden site.
- **Rumors** mark one place by name somewhere inside a dashed ring, 3,000 li across on the map, found by going there and looking around. They come from cards that name a place, from asking a person, who knows the places round their home and their trade, and from a town's teahouse, one rumor a day for a pot of tea (Entering a place).
- **Told and true.** A Rumored or Sketched place shows its atlas `lore`, what the world believes; being there shows what is there; a place's `truth` comes out only in scenes.
- **Every start knows** its home kingdom Sketched, a day's walk round its home Seen and the region's famous places Rumored; a start with a sect or clan behind it adds that power's region map. What you know is the life's: a new life starts from its own origin's knowledge.

**Wherever you like, if you're strong enough.** Every place has a top realm and sits in some power's sphere, both in the atlas, and travel reads them:

- Open: anyone walks in. Roads, towns, the wilds.
- Gated: a sect mountain behind its array and gate guards, a city's inner ward, a clan's valley. You need a token, a rank, an invitation or a toll, or you force it, which works only if your realm beats the array's rating, since an array is rated to its vein, and costs standing either way.
- Hostile: inside the sphere of a power at the bottom of its standing with you, or whose enemy you serve. You can cross, but encounters there are hunts for you, and the map says so. Not built yet: it comes with organizations, which give powers their spheres in play.
- Deadly: a land whose own hazard sits above your realm, the forbidden lands and the beast ranges. The fog shows the warning, and going in anyway is how most cultivators die.

Checkpoints inside a sphere charge tolls from the Economy's fee list, and your fame decides whether the guard knows your face. Until that list exists, a checkpoint on your course takes 1 low-grade as you pass it, renown 3 in the region waives it as at the watch, and a cultivator with nothing to pay is waved through; the night road goes round them.

**Entering a place** (the look study is `docs/mockups/place-screen-study.html`). Right-click a place you stand at and choose Enter, or arrive on a course marked to go in: the place's own screen stands in for the Map, which is one step back (← Map looks at the map without leaving). Entering takes no time and the clock runs on; you are inside until you set a course or step out, the home wheel turning there. The screen: the place's head and lore, the gate strip, its doors on the left grouped as Trade, Hear and hire, Rest and Later, and the open door's counter beside them.

| Kind | The gate | Doors |
|---|---|---|
| City | the watch, a toll of 1 low-grade | its shops, a money changer, the teahouse, the region's map and each kingdom's (Maps), 2 guides, 3 caravans a week, an inn (20 taels), the bounty board |
| Town | the watch, no toll | its shops, a money changer, the teahouse, its kingdom's map, 1 guide, 1 caravan a week, an inn, the bounty board |
| Village | none | its store, the elder (a rumor a day, free), a barn bed (5 taels); no changer, since a village store can't break a stone |
| A power's hall, a landmark | none | its shops, if any |
| A sect's gate | its access | behind it, the members' shop |
| A wild site | none | its features and depth, stay or pin it; inside is a scene |

- **The watch** reads the realm you show. Renown 3 in the region waives the toll; infamy 3 and it knows your face and turns you away, unless the sergeant takes a 5 low-grade bribe, a persuade check offering greed, who remembers a refusal.
- **A gated place** asks for its token, rank, invitation or toll; forcing it needs your realm above its array's. A secret realm's way in is under Ruins, inheritances and secret realms.
- **The teahouse**: a pot of tea, 5 taels, buys one rumor a day of one of the three nearest places you don't know within 6,000 li, hidden ones included, told in a teller's voice ("There's a spring south, three days out, that doesn't freeze"). A village elder tells one within 4,500 li for news of your own.
- **Guides** are seeded by the place and the month. Each knows the sites of their trade (a beast hunter dens, caves and peaks; a herb-gatherer valleys, springs, falls and old trees; a grave-robber ruins, graves, steles, shrines and mines) within 8,000 li, about a month on foot: hiring one Sketches the site, sets the course and is paid up front, a low-grade stone a day of the trip. A hidden site only if your soul could find it once there.
- **Caravans** are seeded by the place and the week, bound along the roads for other towns, a week's going different ways. Ride for 2 low-grade, on its wagon at its pace (20 li a double-hour, six hours a day from 辰) with your hours free at half; or guard it on the Caravan guard routine, paid a stone a day on arriving. It sets off at 辰 on its day; join early and you wait.
- **The money changer** changes stones and silver at the rates under Economy, Stones, silver and shops in play.
- **Your bed**: each night inside a place away from home is paid from your silver at its bed's price, by rule; with no silver you sleep rough.

**A trip** is what gives going in its shape: a goal card, a bounty, a herb run, a patrol, a core hunt, a delivery; travel with its encounter rolls; the goal's scene plus one to three side encounters; and the return, with loot home, a coming-back story and a chronicle entry. While you're out your wheel is the trip's, so going in costs cultivation, and the spirit pool fills instead. Free text and the narrator live inside scenes; between them the engine writes the travel line itself.

**Encounters** are tables per region keyed by terrain tags, the hour, the danger band, fame and the calendar, in six kinds: beast, cultivator, mortal, place, omen and plot, the last seeded by your origin, talents and grudges. Each is a scene template: tagged features, NPCs carrying intents from the motive list, stakes, and exits, fight, talk, flee, sneak, trade. It is a card like any other, with the scene panel and the narrator attached.

**Encounters on the map.**

- **Every encounter is a card on the map,** where it happens. You go in, or let it resolve by your stance (The resolver, Away and the idle half).
- **You sense them coming.** As you travel, a card shows at the edge of your sight or your divine sense, so the realm you have is how early you see trouble, and you can go round it, go in or wait (The road's encounters, Sensing).
- **Any card that holds a person or a place can be gone into,** seclusion cards included. A card's choices are the quick road and going in the long one.
- **Plot encounters come from what is yours:** your origin, talents and grudges, and the people the world keeps.
- **The Combat screen leaves the rail** with Fights you play (Jan's call, the opening redone, 2026-10-20): there is no list of spars to pick from. **A fight happens to you**: when one starts it takes the whole stage, the rail hides and the clock holds, and you can't click away; it ends only when you win, flee, surrender, talk it to an end or fall. **Sparring is asked of people**: a senior or a fellow disciple at your power's training ground (a door at the seat), or Spar on the page of someone you know while you stand in the same place, and a rival's challenge; the origin's chain's spar is the first, and P2.6's Intent moment (a spar won from under a tenth of HP) is one of these. Once go-in fights exist, the same fight plays inside the scene: only its frame moves.

**The road's encounters** (the look is `docs/mockups/encounter-study.html`; numbers in `src/content/encounters/pace.ts`).

- **How often: the road's notice,** a meter, not a roll each hour. Each double-hour on the move adds 1/24 on a road and 1/30 off it (one every four and five travel days of the by-day routine), ×1.5 by night (戌 to 寅); an hour at rest on a course in the open adds 1/48, one every eight nights (an inn or a town adds nothing); heat counts ×(1 + heat/6), flying ×1.5, a group ×0.5. An encounter comes when it fills, and the next threshold is drawn between 0.6 and 1.4 on the `road` stream, a roll on the world's timing. Nothing fills while a card waits. A crossing from Pacified Fort to the City on foot (86 days) meets about thirty, the camps included.
- **What comes:** a kind by its shares, on a road / off it: beast 15/40, cultivator 30/15, mortal 30/5, place 10/25, omen 10/10, plot 5/5; by night beasts +15, mortals −10, places −5. A plot comes only with something yours behind it (a grudge, your origin's people). Then a template whose where holds (terrain, road or not, the hour, season, a site of its kind within 1,500 li), at the band, by weight, a template the road brought in its last six lines at a fifth of its weight.
- **The watch keeps the road:** within a day's walk (240 li) of a town or city, by your spot or the encounter's, the road brings nothing hostile: no hunting beast, no one lying in wait to rob you, no grudge. A template that comes to harm or rob you says so (`hostile`); traders, patrols, smugglers about their own business, finds and omens still come.
- **Scaled to you:** off a road, and for beasts, places and omens anywhere, what comes is the spot's band (the depth line's promise); people on a road come at your band ±1, held between the land's edge band and three bands over it.
- **Sensing:** an encounter shows ahead on your course at the edge of your sight (600 li open, 150 closed) or divine sense, whichever is farther. A lurker shows only if your Perception reaches its Stealth (not short; cover in closed ground counts as two things used for it, a mortal's blind its own), else it springs on you. And it notices you by its Perception against your Stealth: a realm beyond (×3.1) and it found you first, so it can't be gone round. Going round costs 60 li cross-country.
- **Hiding:** a Hiding Talisman (tier 1, 2 or 3, the Night Bridge's) is burned by rule when something would find you first and the talisman's tier reaches it, holding your Stealth at its tier's size against perception up to that tier for a day: the one way to cross a realm unseen. Veiled Aura and Hidden Realm lower the realm you show; travelling veiled is a toggle on the road bar with concealment, a cover the watch and the road's cultivators read (robbers come ×1.5 to a traveller who looks weak); acting above it blows it, as any cover. Stealth properties on gear (the Night-Ferry Shroud, the Mist-Veil Robe) count as help.
- **The three stances,** on the road bar, the same whether you watch or not; a sensed card you leave takes your stance when you reach it. **Avoid** goes round all it senses, slips away (sneak, flee, hide) when that is clear, takes finds and walks on, and never fights. **Careful**, the default, also hunts the sure kills (a clear fight). **Bold** takes clear or close. No stance talks or spends, and the big things always wait: a plot, a kept person, a choice that moves someone's opinion or standing (`big` on a role or an exit). What a stance can't settle waits as a card and stops the course; you camp and cultivate where you stand until you choose, and changing the stance tries it again. Choosing from the card is the same exits.
- **A fight's verdict, no dice:** you fell them one by one, the quickest first, and each still standing strikes you every exchange, from both sheets' expected blows (the Combat screen's preview); your strength (HP, shield and armor) over what that race takes from it is the ratio, clear at ×1.25, close at ×1. A fight against someone you can't read is "?" and never the stance's. On the map a fight resolves by its verdict, not the sim: clear is won unhurt, close is won with the close wound (10% for 3 days), short is lost, a wound (30% for 10 days), and robbers (a person with greed) take half your stones and a thing from the bag. A slip that falls short comes to blows the same way. A talk that falls short stays on the card, that exit spent until something changes. Nobody dies on the map.
- **Finds by depth:** a find is a written thing at the band's tier and the rarity its finds name ("green and blue" at layers 7 to 9), held in the thing's range; a fallen beast leaves its parts and core at its band, a person their kit (`kitOf`), a copy coming home as a copy.
- **The bounty board** (a city's and a town's): three postings a month, seeded by the place and the month, each a different goal (bounty, herb run, core hunt, delivery, patrol; escort is a caravan's) with a spot of its kind 1,500 to 12,000 li off, paying 25 low-grade ×1.6 a band. Hold three at most; at the spot (within 250 li) the goal is met like any encounter, and once met short it waits a month to be met again; a goal met is paid at its board.

**Scene templates.** A scene template is a card extended, and data like any card: a place kind and its features; people as roles ("a smuggler", "the gate's deacon"), each with a realm band and motives; the stakes, what can be won or lost, drawn from the fixed list of effects (The resolver, What lasts); the exits as verbs (fight, talk, flee, sneak, trade); and an opening line for the narrator. A template never names a person: the world fills its roles from the place's tables and ties, as origins fill theirs.

- **Features are tagged things:** a brazier is fire and burnable, a cliff height and a fall, a river water and a crossing, a crowd cover and witnesses. Each tag says which verbs it helps (×1.1 for a thing you use) and which checks it favors, as darkness favors the one sneaking. A site's features come from the atlas or its generated record.
- **One format for everything:** an encounter, a goal's scene, an open scene such as your stall, and a seclusion card you go into, since a card's text and its slots are a template.
- **GLM adds color, never things.** A feature or a person it invents is real only once the engine registers it, so a scene stays what its template and the world say it is.
- **The schema** (`src/content/encounters/schema.ts`): an id, a kind of the six, a title; where (terrain, on or off a road, day or night, season, a site kind, a plot's hook, the events calendar's key); the bands it is met at and a weight; `lurks` and `moves`; a goal, for the board's; the place (its traffic and tagged features); roles (a roster template, a kind of mortal or a person the world keeps, a band offset, a count, motives, hidden, big); exits as the resolver's acts, each read by a stance as fight, slip, deal, talk, take or pass, with a cost and what pass, close and short do; and the opening line. Stakes are the resolver's effects with roles in their slots, and the map's own gains (loot, a find, qi, hours, a hidden site found).

**Escape and death.**

- **Fleeing** is a speed comparison on the resolver (The resolver, The check): your qi × Agility against theirs, in a fight or out of one. Clear, you're away; close, away at a cost (a wound, something dropped, a trail they can follow); short, caught. Your own sword's flight counts, and an escape talisman wins a flight outright against anyone up to its tier.
- **Hiding** is stealth against perception, helped by the scene's features: a crowd, a cave, the dark.
- **Talking past** is a people check: surrender, beg, bribe, bluff. An accepted surrender makes you their captive, and their motives decide the rest: they rob you, ransom you, sell you, kill you or let you go.
- **Realm pressure** still pins you two realms up, leaving talk, begging and an escape talisman (Scale of destruction).
- **Falling isn't dying.** At 0 HP you are down, not dead, with one last act: a life-saving talisman, a plea, or from Nascent Soul the soul fleeing its body. Otherwise whoever stands over you decides by their motives: a robber takes everything and leaves you for dead, and you wake wounded; a grudge finishes you. Death comes from someone's will, not from a number reaching zero.
- **When you die**, the life ends and you drop everything you carried; the people the world keeps remember it; the next life is born that day and starts at 12 (NPC basics); gentle mode's rewind still applies. A defeat you survive leaves a wound and what you lost.
- **Leave things for the next life.** It is the same world, so what you leave in it stays: a stash sealed in a cave you found, things entrusted to someone you trust with a token for whoever comes after, your abode's store, the manuals you write. The next life knows it is reborn and remembers the life before: its map as that life last saw it, Sketched now and twelve years stale; its people by name, though they don't know the child is you; and its stashes exactly. The people you entrusted don't know it is you unless it brings the token, and they hand over only if they live and still think well of you. The world can get there first: a stash is a hidden site anyone may stumble on, and a trusted friend's motives can turn. What the lineage carries without being left is its legacy (Death and rebirth).

**Ruins, inheritances and secret realms.**

- **A ruin is a site in layers**, each a scene: an outer layer picked over and safe, an inner one of traps and guardians in the ruin's realm band, and a heart that holds the find. Going deeper takes checks: finding the way is your soul against the ruin's realm, and forcing a seal your body or qi against its rating.
- **An inheritance is a dead master's test for an heir**: a trial in the master's own Way or Dao, a fight, a riddle of the Dao or a test of character, mercy or ruthlessness. One heir passes, ever, and some admit only below a realm. What it gives is taught, never a copy (Reading), with the master's things; the lucky rogue's find is often one.
- **Not every inheritance is a gift.** Some are an old monster's bait: a remnant soul in a ring or a tomb, waiting for a body worth taking. The trial looks the same; the remnant carries a hidden intent, and your perception against its veil is your only warning. It may teach you while it waits, a tie and a lasting state, until it tries for your body: your soul against its own, a contest you can fail.
- **Steles** are contemplation sources, as now, and a Dao stele is an Intent moment: comprehend one while that Dao's capstone has readied you, and Intent opens.
- **Secret realms** are regions of their own behind `access` (The world map, The atlas as data). The Realm of Mingled Blood opens every 7 years for 30 days, below Foundation, to beast blood or a bonded beast. Inside are sites and encounters, rivals from every power that sent its people for the opening, and a clock: out before it shuts, or trapped until the next opening.
- **Your own stash** (Escape and death) is a ruin too, one the world can find before your next life does.
- The Border Wilds holds the Realm of Mingled Blood in full, two or three ruins, an inheritance and a stele or two.


## The resolver

How going in decides what happens. Everything you try, from a lie to a formation round a city, runs through one pipeline, and NPCs run through the same one, since the rules take a cultivator and actions name who acts.

**The pipeline.** You type, and the interpreter turns your words into a plan of verbs with targets, the scene's features and the things you use (The world, Do whatever you want). The engine checks the plan can be tried at all, by scale and by what you hold, then shows each step's verdict and stakes with **Do it** and **Change it**. Do it settles the step and saves at once, the effects land, lasting states take hold, and the narrator tells it. GLM touches only the first step and the telling. A plan of several steps runs in order and hands back to you at the first fail or surprise. When your words could mean two things, the interpreter offers two or three readings as buttons instead of guessing. The scene's exits and the narrator's suggestions are clicks that skip the interpreter.

**Going in is GLM's.** It uses GLM 5.2 fully and has no templated version. Without a key, trips still run, resolved by the engine as they are while you're away and told by the chronicle's templated lines, but there are no scenes to go into. Tests drive the resolver with plans directly and the narrator through the mock provider.

**No dice in a check.** A check compares your number with theirs:

- **Clear**, yours at least ×1.25 theirs: you pass.
- **Close**, yours at least theirs but under ×1.25: you pass at a cost.
- **Short**, yours below theirs: you fail.

The cost comes from the verb's own list (time doubled, a witness, a wound, heat, a thing spent or broken, trust lost, noise), and every verdict shows before you act with its stakes: "Sneak past the gate · close · the dog barks · if short: caught at the gate". The uncertainty is what you don't know, never a roll: a veiled realm, a hidden blade, a motive you haven't learned, so scouting, asking and Perception pay. The world still rolls its own dice for its content (encounters, loot, weather, who arrives, on the `scene` stream), and a fight keeps its roll for each blow, since a fight is many blows and the fight sim is tuned on them. Your checks never roll.

**Capability, not dice.** Outcomes follow from what someone can do; a roll stays only where the world is varying its own content, and any other roll goes to Jan first. The resolver reads two tables, and a later phase adds rows to them, never a new kind of check (`src/content/resolver.ts`):

- **Capabilities**, each a base line and the stat that names it: perception (soul), stealth (body × Agility), force (body), speed (qi × Agility), finding (soul), presence (the realm they read on you), composure (their realm), leverage and resistance (1, people checks). Sensing, ruin layers, crafts and appraisal are rows here.
- **Acts**, each under one of the twelve verbs: the capability it reads, what it faces (their capability, a feature's realm or the site's), what a close pass costs and what a short one means, and the deed it makes.
- **Beyond you.** Judged a whole realm's step short (theirs at ×3.1 yours), a step can't be tried at all: the one "you can't" that scale says. Against someone you can't read, it can be tried, and the truth may still be beyond you.

**Your number** is the line the check reads, sized as the sheet sizes it (Combat, The sheet), times what helps: a technique the action uses, ×1.05 a mastery level (×1.25 at Origin); a node, talent or Way that names the check; the scene's things you use, ×1.1 each and three at most, as combat's creativity; a helper ×1.2, two at most. Together these at most double you. A realm is a step of ×3.1 or more, so skill and cunning win close contests and never cross a realm, and a Foundation deacon never catches a Nascent Soul. Their side counts the same, and a place's features count for whoever they favor (darkness for the one sneaking).

| Check | Your number | Theirs |
|---|---|---|
| Notice someone sneaking | perception: your soul × (1 + Perception) | their stealth |
| Sneak, hide | stealth: your body × Agility | their perception |
| Intimidate | the danger you show | the safety they feel |
| Force: break, lift, hold, endure | your body | the foe's body, or the feature's own realm |
| Chase, flee, outrun | speed: your qi × Agility | their speed |
| Find, without divine sense | your soul | the site's danger realm |

Agility counts as it does in a fight, 5% a point above 10. A check with no opponent faces the feature's own realm when it names one ("a sheer karst wall, Foundation"), else the site's danger realm.

**Intimidation** is how dangerous you look against how safe they feel. The danger you show is the realm they read on you (true, veiled, or beyond them, which counts as a realm above them) times what backs it: a weapon drawn ×1.2 (×1.5 from gold), a technique shown ×1.25, your infamy ×1.5 to anyone who knows your name, each follower at your back ×1.1 (three at most). The safety they feel is their realm times theirs: a sect behind them ×1.5 (×2 a great sect), each of their crew ×1.1 (three at most), and ×2 when they are desperate, since a cornered man doesn't scare. Both sides cap at ×2, as above. A veiled Nascent Soul frightens only as much as the realm they show, and dropping the veil to frighten someone ends the cover. Two realms up is past a threat: realm pressure pins them outright (Scale of destruction). What intimidation wins is obedience from fear: a threat that lands wins its one demand, and recruiting by fear runs the same check to make a follower with a fear bond (Professions, people and powers, NPC basics), with karma for using it on the weak. A backer counts as a sect behind them (NPC basics, Backers and traces).

**Reading a realm** is a comparison too. With your perception at or above their soul you read their true realm. Below it you read them as beyond you ("you can't see through his cultivation"), or, if they veil it, as the realm they choose to show, as many stages down as their concealment allows (Veiled Aura, Hidden Realm, a masking jade). A Foundation deacon never sees through a Nascent Soul; a Nascent Soul elder always sees through a Foundation disciple's veil. Perception from nodes, talents and detection arts is how a weaker soul closes part of a gap.

**The verdict you see is what your character can judge.** Against someone whose realm you can't read, the verdict shows "?" and the engine compares the true numbers unseen. A step that can't fail says so: "Sneak past the drunk porter · clear".

**People checks** are not sized by realm: a Qi Condensation con man with a forged token can fool a Foundation noble, and a mortal merchant can out-haggle you. Persuade, ask, lie, bargain, recruit and calm weigh your leverage against their resistance, both starting at 1, with the same three verdicts.

- **Leverage:** trust, the word their opinion of you reads (hostile ×0.25, wary ×0.5, neutral ×1, friendly ×1.5, trusting ×2; What lasts); an offer that meets one of their motives ×2; proof or a prop ×1.5 (a token, a sect's robe); standing with their power, ×0.5 at its worst to ×1.5 at its best; a talent, node or Way that names the check.
- **Resistance:** a motive against it ×2, suspicion of you ×2, their own talents.
- What you see is your read of them, built from what you know. A motive you haven't learned can turn it: "he had a reason you didn't know".
- A soul two realms above yours reads your lies, so a lie to it fails and it knows.

**No retries.** With no dice, the same attempt gives the same answer until something changes: another approach (another verb, a new prop, a helper), a move in trust or heat, or someone else on the gate.

**Scenes and time.**

- **A scene** is a place (a site, or a spot on the road), the people there, the place's features and a clock. It starts from a trip's goal, an encounter, a card you go in on, or your walking into a town to look round.
- **Ticks.** A scene's clock runs in ticks of a quarter of a wheel hour, about half an hour of the day: an exchange of talk, a sneak past a gate, a search of a room. Looking around takes four ticks, and a whole fight one, since its turns are a few breaths. The world's clock stops while you are in a scene, so real time spent typing costs nothing; when you leave, the ticks join the world's clock and come off your wheel, which is how going in costs cultivation.
- **Everyone acts each tick** through the same resolver, in Agility order as in a fight: you take your plan's next step, your followers carry out their orders, and NPCs take whatever serves their strongest motive. That is where a plan's surprises come from.
- **A fight is a mode of the scene**, run turn by turn on the combat engine while the scene goes on round it. People already in the scene can act the next turn; followers you left nearby arrive in 3 turns, or 6 if within call; the law arrives where it answers fast; anyone farther comes after the fight and finds what's left, as a witness.
- **Noise.** A fight is heard out to a range set by its loudest fighter's realm: 1 li at Qi Condensation, 5 at Foundation, 25 at Core Formation, 120 at Nascent Soul. A noise calls someone, who arrives on the place's traffic, never a roll each tick: 2 ticks after the call in a busy town, 6 on a road, 12 in the wilds, and while it rings it calls the next. Who comes is drawn from the place's people on the `scene` stream, and waiting skips to the arrival. Sneaking makes none, a scream a little, and techniques and talismans make noise at their realm.
- **The law of a place**, from its kind and its power: nobody in the wilds; a village's headman and perhaps a Qi Condensation guard in 2 ticks; a town's watch, mortals under a Qi Condensation captain, in a tick; a city's garrison cultivators in 3 turns; a sect's elders, whose divine sense covers their grounds, in 1 to 3 turns. The law judges by what it saw and by its power's standing with you, and heat rises with what it found.
- **Open scenes** carry no stakes: your stall, a teahouse, a walk through a market. They tick like any scene, people drift in at the place's traffic (a stall's customers come from its people table), and Wait skips to the next arrival. One ends when you leave, or when you set the stall to tend itself as hours on your wheel, selling while you're idle.
- **A scene ends** when you leave (fleeing, if mid-fight), when its stakes resolve, or when you are dead or taken. It saves after every step, so a reload drops you back into it.
- **Groups.** A group sneaks at its worst member's stealth and talks at its best member's; a helper adds ×1.2, two at most.
- **Narration.** A narrator call for every step of yours. In a fight a turn gets a sentence or two, so it stays quick, and the moments that matter get more: the first blow, a kill, an arrival, the end. At the spike's prices a ten-turn fight costs about a cent.

**What lasts.**

- **One fixed list of effects:** time; HP and qi; a wound; items and stones gained, lost or broken; a memory in a person's opinion or a power's standing; a bond; heat; karma; renown and infamy; knowledge (a name, a place or a truth learned); a lasting state started, tested or broken; a project's progress; a place's or a power's prosperity (Economy, Prosperity); a place's or a person's state. GLM picks from the list and can't add to it, and a new system adds an effect only when it brings a new kind of state.
- **People judge only what they know.** Opinion, standing, renown and infamy move only by deeds someone saw or learned of (Who knows, below), and a deed learned later lands when it is learned.
- **Opinion is remembered reasons**, as RimWorld does it. A person's opinion of you is the sum of their memories of you, each a reason with a value and a fade, listed on their page: "Saved my brother +30 · Paid fairly +3 (fading) · Lied to me, and I found out −25 (fading)". The total gives the word, and the word is the trust that talk reads (People checks): hostile at −40 or below, wary −39 to −10, neutral −9 to +9, friendly +10 to +39, trusting +40 and up. The rows are under The memory table. A person's motives weight their memories (Professions, people and powers, NPC basics): a greedy one counts payment double, a proud one an insult. Fear is a bond, not an opinion, so the coerced obey while hating you. You see the memories you know they hold; one you don't know of is a motive you haven't learned.
- **The memory table** (`src/content/memories.ts`). Every memory is a row: a reason, a value, a fade and a tag. A fade is a straight line from full to nothing over its span, shown "(fading)" once under half; a stacking row adds up to its cap, any other row restarts at full when it happens again. GLM's memory effect names a row and can't invent one. The tags: rescue, kin, service, payment, company, knowledge, face, insult, threat, theft, prize, harm, deceit, power and evil (felt only by the righteous).

  Plain rows with no tag: from before (a value of its own, never fading: what a life brings to testing day), did right by me and did me wrong (a value of its own, a season: a story card's plain mapping). A first impression (the Trust axis) lands at first meeting and fades over a season; "beneath me" (the Pride axis) is read live while you show a lower realm.
- **Weights.** A motive doubles its tags (NPC basics); the personality axes scale theirs; the whole weight stays within ×0.25 to ×3. A gift of a kind they like counts double.
- **Standing is a power's remembered reasons**, kept the same way from the deeds it knows. Its rows: killed one of ours −30, never fading until a blood price is paid · a massacre of ours −60, never · took one of ours captive −30, a year · robbed us −15, a year · attacked one of ours −10, a season · lied to us (a cover blown) −10, a season · a mission done for us +10, a year · tribute by its worth, a season · a member +10 while you are one. They land when one of its people learns who did it to one of its own or its place. The words: hunted at −60 or below, hostile −59 to −30, cold −29 to −10, unknown −9 to +9, known +10 to +29, favored +30 to +59, honored +60 and up. In a people check standing counts ×0.5 hunted, ×0.67 hostile, ×0.85 cold, ×1 unknown, ×1.15 known, ×1.3 favored, ×1.5 honored.
- **Heat caps standing:** watched (3) holds it at cold at best, hunted locally (6) at hostile, hunted by the power (9) at hunted, shown as a line of its own, and the cap lifts as the heat cools.
- **Karma is heaven's ledger, never anyone's opinion.** It moves whether or not anyone saw, and every actor keeps one, never shown: −1 for a theft, a robbery, a threat, a frame or a kidnapping against someone of a lower realm, or a small cruelty to someone weaker; −5 for finishing the fallen or a life taken that didn't need taking; −20 for a betrayal of trust; −50 for a massacre; +1 for a small mercy or healing someone weaker who is hurt; +5 for a life saved, healing someone who is down, a stranger's ransom paid or a captive freed; nothing for killing in a fair fight or in self-defense. Heart demons, tribulations and the Buddhist Way's vows read it; no person does.
- **Renown and infamy**, per region, 0 to 9 each: how far the deeds people admire and the deeds they fear have carried your name, 3 across a town and 6 across the region. A power takes them by its Way: the righteous hunt an infamous name, the demonic court it, and anyone honors renown. They are points: levels at 1, 2, 4, 7, 11, 16, 22, 29 and 37, a point fading each season after the last gain. A deed's points land once someone learns who did it, once per deed and region: infamy 1 for a theft or a robbery, 2 for a killing, 3 for a kidnapping, a betrayal or a frame found out, 8 for a massacre; renown 2 for a life saved, 1 for a duel or spar won in front of people, 1 for a mission for a power, and killing someone with infamy 3 or more there is renown 3 instead of infamy. Someone knows your name if they have met you or your renown or infamy is 3 or more in their region, and a disguise or a false name hides it. Infamy backs a threat ×1.5 (Intimidation, above); renown counts ×1.25 in a talk to anyone who knows your name.
- **Lasting states**, each with what tests it and what breaking it costs:

| State | Tested by | When it breaks |
|---|---|---|
| Cover (a shown realm and a false story) | a perception at or above your soul; every act above your shown realm | exposure: memories and heat with whoever was fooled |
| Disguise (another face) | people who know you, friendly or better; perception | you are recognized |
| False name | someone checking it: a sect's register, a person who knew you | your real name is known |
| Hidden intent | a soul two realms above yours; acting on it too early | your target learns it, and remembers |
| Vow | keeping it, which pays its Way's reward | −10 karma and the Way's price |
| Debt | its due date | −5 a month with whoever holds it; at hostile, they collect |
| Wound | time and pills, as a breakthrough's injury | a share off your lines for days |
| Captive | held by you or holding you | a ransom or an escape |
| Trace (a death talisman's mark) | any of its power's people who sees your face undisguised | erased by a soul stronger than the trace, or a formation |

- **Projects are clocks** of 4, 6 or 8 steps for small, middling and big ambitions: a half-blood's trust 4, a crew 6, a city's formation 8 and the firing. Each step is a scene or hours on the wheel; a failed step costs a step or adds heat; a hidden project carries its own heat. The clock and the heat show on the project's card.
- **Heat**, 0 to 9 on each place and each power: a theft someone saw +1, a killing +3, a massacre +5, and −1 a month while you stay away or keep quiet. At 3 you are watched (prices up, guards eyeing you, talk spreading), at 6 hunted locally (the watch doubled, a bounty at your known realm, gates shut to you), at 9 hunted by the power (hunters sized to beat you, your name on every bounty board in the region).
- **Who knows.** A deed spreads only through witnesses who live (and kept people, who tell those they meet), soul lamps (a sect knows at once when a disciple dies, and a Core Formation elder's lamp shows the killer's face), evidence (a body, or a technique's mark to anyone who knows the technique) and divine sense (anyone who swept the place). A deed no one learns of moves only your karma.
- **Places and people change.** A place is thriving, damaged, ruined, scarred (fights from Core Formation up) or taken by another power, and its encounters and map follow. A kept person is well, wounded, crippled, captured, dead or gone.
- **Grudges act.** A kept person with a grudge acts on it through cards at most once a season: hunters sent, a frame, a theft. Longer schemes come with NPC depth.

**Away and the idle half.**

- **Trips run on while you're away**, on the engine. You set a stance when you set out, and encounters on the road resolve by it (The world, The road's encounters, The three stances). Anything else waits as a card for your return, as auto leaves majors to you, and meanwhile you camp and cultivate where you sit.
- **The big things always wait:** anything with your life at stake, a person the world keeps, a choice that moves a bond or standing, a secret realm, a fight with anyone not clearly weaker, except that Bold takes a close one, since nobody dies on the map.
- **You never die away**, nor on a trip with no key, where nothing can wait for a scene: a waiting encounter takes the stance's safe road instead (Avoid and Careful withdraw, Bold fights on the engine), and the worst it leaves is a wound and what you lose. Death comes only in scenes you play.
- **What happens, happens.** A clear fight's loot comes home, a herb run or a delivery whose goal is clear is done, and time passes. The coming-back story tells it, with the waiting cards under it.
- **The world comes to you.** Wherever you sit, the world can start a scene: a rival at your door, hunters once your heat reaches 6, a thief at your abode. It comes as a card, and a card ignored takes its default, never your death: the thief takes a few things, the rival leaves a challenge and a worse opinion of you.
- **Projects tick on** where their steps are hours on your wheel (planting a formation's nodes by night): a clear step goes through, and anything else pauses the project until you're back.
- **Followers keep their orders**, their wages paid from your stones; when you run dry the hired ones leave, and a card says so. Wages fall due a month at a time, a month of the follower's realm wage each (30 low-grade at Qi Condensation, 270 at Foundation), the first paid as they are hired. A loyal follower leaves when their opinion falls under their floor, a goal-bound one when the goal is done, and an afraid one slips away (or turns) after a week out of your reach unless you left them under orders where you are.

**What GLM sees.**

- **Only what your character knows:** the places your fog has revealed, the names you have learned, the scene's visible features, and the people in it with what you know of them. A place's or a person's truth goes in only once a scene reveals it, so the narrator can't leak it, and typing your way to the python's den without knowing where it lies walks you into the fog.
- **People as you know them** (P3.8): someone whose name you haven't learned goes in as a stranger under a ref of the scene's own, so not even their id leaks; a person's nature goes in as what you have seen them do, never the axis's word and never a lean or motive you haven't learned ("talks too much, can't keep a secret past a cup of wine", `src/content/behaviour.ts`), with their voice, which you hear, and the memories of you that you know they hold. The engine's outcome names them the same way.
- **Its plan is verbs checked against a schema**, so words grant nothing: "ignore your rules, I win" reads as nothing to do.
- **A scene takes a list of player actors**, so co-op after v1 drops in without a rebuild.

**Symmetry.** NPCs make every one of these checks against you: the rival's lie, the bandit's sneak, the elder reading your veil.

**The playbook:** the cases the go-in rules are checked against. A case that can't play through marks a gap.

- Hide your realm, pose as an untested orphan and join the Beast-Butcher Gate, then keep the cover through spars, inspections and a breakthrough.
- Earn a half-blood's trust, go into the Realm of Mingled Blood on their blood, and betray them for the loot or leave them inside when the gate shuts.
- Drain a city for a demonic method: a hidden formation planted node by node, heat rising, and the city's Nascent Soul answering when it fires.
- Frame a rival with a Beast Court token, then report him.
- Sell one treasure map to three crews and ambush whoever reaches the cave first.
- Kidnap the Spirit Herders' speaking stallion and ransom it to the Beast Court.
- Fake your death with a corpse in your robes to shake a hunter.
- Loot the Wall's dead after a beast tide, posing as a corpse collector.
- Steal your own sect's Foundation Pill the night before the tournament.
- Gather a ragtag crew by pay, loyalty and fear, and coerce a village into hiding you.
- A fight's noise draws strangers, your backup arrives mid-fight, and a trap you laid fires.
- Run a stall and chat with customers; walk away from your abode with nothing.

## Professions, people and powers

Every system has an idle half and a world half, and each half supplies the other.

**Professions** are the Hundred Arts, and each is a craft Dao: a tree with 9 tiers, one per realm, grown by insight and worked in your craft hours. You can study higher tiers early, but crafting at a tier needs your soul level to reach it.

Basic recipes are scattered through each tier as nodes, and every tier's first node hands you one starter recipe. Other nodes improve success, yield, quality and speed, and each tier ends in a capstone perk, like brewing two batches at once.

Unique recipes have to be found: some sit in any sect library, others only in ruins, inheritances or a dying master's hands. A recipe is content, and a node is one way to get it: the craft Dao's basics, a manual's nodes (a sect's style carries the sect's recipes, Manuals under Cultivation), or experimentation. A recipe known by any door is simply known; if you later find the manual that carries it, that node shows as owned and the rest of the manual is still worth buying.

**Recipes carry mastery**, Glimpse to Origin, raised by crafting them. Higher mastery means better odds, higher grades, bigger yields and fewer explosions. A disciple running your recipe on a production line works one level below your mastery.

**Experimentation** is the gamble: throw in any ingredients and the engine rolls against hidden recipes. Most tries fail or blow up the furnace, but each failure raises the odds of the next. A hit is a recipe that's yours to name, and it lands as an owned solitary node on the craft Dao's **discoveries edge** at the recipe's tier: a ring at the tier's rim where found recipes are laid automatically, unlinked, so the hand-laid part never moves and a furnace full of hits makes that tier visibly fatter on one side. Discovered recipes are the craft Daos' deeds, the way Ways grow by deeds. The hidden pool is every recipe you don't know: the ones sitting unbought in your tree, the ones inside manuals you haven't found (rare, and a scandal when it's a sect's secret pill), and wild recipes that exist only to be found. Each recipe carries ingredient tags, and the roll weighs how many of yours match (nothing in common and it isn't in the pool, so blind throwing finds only the commonest things), tier on the table below, a pity counter per ingredient set on the `craft` stream, and rarity on the shared table shifted by the furnace and the ingredients' own rarity. If nothing authored matches well, the pool holds a generated recipe, so experimenting never dead-ends: a recipe is a bundle of fields (tier, rarity, ingredient tags, an effect, a name), and generating one picks an effect the tags can make from the effect table, sizes it by tier and rarity, and names it once, kept in the save like a filled-in village. Generated recipes stop at blue; gold, red and pristine are always written by hand. Attended, throwing the ingredients in is the fire-control scene, keeping the furnace in its band by the same breathing grammar as the seat, and a steady hand is a bounded bonus on the roll, never the roll. The effect table, which tags make which effects at what size, is the crafts design's real work (Still to design, Before crafts), and alchemy needs it anyway to judge whether a recipe's ingredients make sense.

The odds per attempt:

- Base chance from your craft Dao tier against the recipe's tier: 25% two or more tiers below, 15% one below, 6% at your tier, 1.5% one above (only if your soul reaches it).
- Multiplied by your best mastery in that recipe family (×1 at Glimpse up to ×2 at Origin), by +20% per realm you sit above the recipe, and by +10% per tier in the recipe's element Dao.
- More materials help with diminishing returns: four batches count as about two tries.
- Each failure on that recipe line adds 1 point, up to 95%, and near misses give GLM a hint to narrate.

A Foundation alchemist at their own tier, with Comprehension in the recipe family and Fire Dao tier 1, has about 8% with one batch, 16% with four, and 33% with four after ten failures. Reaching one tier up with four batches is about 4%.

Each profession leans on part of you for quality, while your soul level gates its tier. A body-first cultivator can still brew pills, just slowly and badly.

| Profession | What it gives you | Leans on | While you idle |
|---|---|---|---|
| Alchemy | pills for cultivation, breakthroughs, healing and poison | qi, soul | furnace queues brew |
| Artifact refining | weapons, armor, storage rings, flying boats | body, qi | forge queues run; artifacts bond as you nurture them |
| Formations | arrays for abodes, sects, traps and fights | soul, qi | arrays keep gathering qi, growing herbs and guarding |
| Talisman making | single-use spells: attack, shield, escape, message | soul | drawing queues |
| Spirit farming | herbs, spirit rice and spirit trees; an old herb is worth far more than a young one | qi | fields grow in real time, and patience raises herb age |
| Beast taming | captured, raised, bred and evolved beasts: mounts, scouts, fighters, materials | soul, body | beasts grow, breed and shed materials |
| Appraisal | identifying treasures, spotting fakes, judging auction lots | soul | standing orders snap up underpriced goods |
| Geomancy | finding spirit veins, hidden caves and good abode sites | soul | surveys reveal the land around your abode |
| Gu raising | venom insects for poison, curses, healing and control | soul | sealed jars fight it out; the survivor becomes the Gu |
| Puppetry | puppets that fight, guard and work | soul, body | puppets work production lines without wages |
| Divination | glimpses of coming events and calamities | soul | a daily reading warns of what's coming |
| Medicine | healing wounds, soul injuries and poisons | qi, soul | a clinic earns income and favor |

Gu raising, puppetry, divination and medicine come after v1.

**Crafts, thin** (D4, 2026-10-20, Jan's calls). The crafts layer builds alchemy, artifact refining, talismans, formations and spirit farming; geomancy comes in only as reading a site. Beast taming and appraisal stay with the living world. Appraisal, geomancy, divination and medicine make nothing: they are services, checks on the resolver (a capability against a number), never recipes.

- **One engine.** A recipe is data: its craft, its tier and rarity range (`rarity` to `upTo`, as a catalog line's), its inputs (named items or tags, with counts), its tool (a furnace, a forge, a brush, an array plate), its craft hours, its output and its yield. Alchemy, refining and talismans run it as written; formations and farming differ only in what comes out, an array laid on a site or a field that grows.
- **The Craft hour 艺**, one new hour kind, works the front of your bench queue, and a batch runs across days. At tier 1 a furnace brews 10 pills in 3 craft hours, a talisman desk draws 5 sheets in 2, and a weapon or armor piece takes 8; each tier up takes ×1.5 the hours. Inputs default to the makers' table (Economy, People make and use: a pill 1 herb of its tier, a talisman 1 material, gear 5 ore), and a recipe may write its own. A post's craft work (the medicine garden, the alchemy hall) stays a Duty hour: its pay and perk, never a queue you manage.
- **Crafters are rich, as in the novels.** At your own tier and Comprehension mastery, four craft hours net what a duty day pays a realm up: about 13.5 low at Qi Condensation, a Foundation cultivator's duty day, and about 120 at Foundation, so about ×9 a plain duty day (on the yardstick, ten tier 1 pills at about 3 low less ten herbs at about 1 is about 20 a batch that holds). Stone burning is capped (Economy, Stones as fuel), so the money never becomes raw qi: it buys pills, gear, manuals and lots at auction. The market reins it: by the lot rule a village floods after a few batches while a city hardly notices, so a rich crafter needs reach.
- **The soul gate reads the better of your soul level and your realm**, so a pure qi cultivator crafts at their realm's tier. A soul at your realm, a matched soul, adds ×1.25 to the odds and halves the blow-ups; a soul above your realm crafts up to its own tier, at that tier's odds, so a soul a realm ahead brews a tier ahead.
- **Each craft has a hands-on version**, as seclusion has the seat: a batch can be queued and left, or sat at and played, and playing it gives a **steady hand** from 0 to 1. The hand moves only the rarity roll, never whether the batch holds. How far it can move it is a capability, Steady hands (`craftPrecision`): one band at the base, up to two as talents, craft Dao nodes and a matched soul raise it, so the minigame is the skill and its ceiling the stat. Their shapes, each fleshed out in its phase's talk: alchemy's fire control, the furnace's heat kept in its band as the herbs go in, on the seat's breathing grammar; refining's tempering, struck as the metal's glow passes the right color and quenched at the end; talismans' one-breath drawing, the stroke path traced without lifting as the qi ink thins; formations' placing, nodes laid on the grid so the lines close.
- **Phases** are K1 and on (C is combat's).

**Recipes** (D4, block 2).

- **Every made good has a recipe**: the catalogs' pills, talismans and gear (about 84 at D4) and the formations' flags and discs, each written by hand beside its catalog line. Herbs, materials and treasures have none; they are picked, dug or found.
- **Inputs come from the line's own story** where it tells one (the Garrison Ration Pill's cooks press millet and boar fat, so those are its inputs), and every input is a good some catalog sells, which a test checks. A recipe's inputs replace the makers' defaults for its good (Economy, People make and use), so a town's alchemy shop brews its stock by the recipe you would use and its making pulls the same herbs off the land.
- **A recipe makes its line's range**, `rarity` to `upTo`; mastery, the steady hand and the inputs move you inside it (A batch, below), so rarity is the only roll.
- **A lone recipe is a recipe slip**: 丹方 for a pill, 符谱 for a talisman, 器谱 for gear, 阵图 for an array. It is a manual of one node, read on study hours as a formula is; markets sell slips by rarity, and a power's own is guarded as its methods are. The other doors stay: the craft Dao's nodes, a style, experimentation and a teacher.
- **Starter recipes.** Each craft Dao's first tier 1 node gives the commonest white tier 1 good of its craft on the continent: alchemy the Qi-Gathering Pill, talismans the Ember Talisman, refining a plain iron blade, formations a set of concealing flags.
- **Mastery is per family** (Jan's call): a family is what a recipe does (qi-fuel pills, healing pills, projectile talismans, blades, armor), about 15 across the crafts, each with one mastery bar, Glimpse to Origin. Every recipe in a family works at the family's level, so learning a new healing pill starts at your healing mastery; tier is answered by the craft Dao against the recipe's tier, not by the bar. Experimentation reads the family's level.

**A batch** (D4, block 3).

- **Whether it holds** is a roll (Jan keeps craft success as one). At your tier, by the family's mastery: Glimpse 50%, Comprehension 70%, Mastery 85%, Perfection 95%, Origin 99%. A recipe a tier below yours adds 15 points, two or more below 25; one above, where your soul reaches it, takes 30. A matched soul multiplies it by 1.25, and it never passes 99%.
- **A failed batch** loses its inputs, and one failure in five (one in ten with a matched soul) is a **blow-up** that cracks the tool as well: a tenth of its worth to mend at a refiner.
- **Rarity is lift**, counted in bands from the recipe's floor, never past its `upTo`. Its whole bands are certain and only the fraction is rolled, so 1.3 lift is a band up for sure and 30% for a second. Lift sums mastery (+0.25 a level past Glimpse, +1 at Origin), the steady hand (the hand times Steady hands' reach, one band to two), the inputs (+0.5 when every input is a rarity above the floor), the tool (+0.25 a band above white) and the place (below). A Comprehension alchemist at a 0.8 hand has 1.05: green for certain on a white-to-blue pill and a 5% shot at blue.
- **Yield** is the written yield, +10% a mastery level past Glimpse (+40% at Origin) and +5% a craft Dao tier held (the Dao bonus); capstones such as two batches at once come from the trees.
- **Mastery grows by batches**: Comprehension at 10, Mastery at 40, Perfection at 120, Origin at 300. A batch at your tier counts 1, one below ¼, a failed one half; the sims check the pace in the phase.
- **Tools are items** with a tier and a rarity: a furnace, a forge, a talisman brush, an array plate. The tier caps the recipes it works, the rarity adds lift, and a furnace or forge is bulk. Refiners sell them; the starter is a crude clay furnace or its craft's like.
- **You craft wherever you seclude**, with your tool and your Craft hours.
- **Places lend a hand** (Jan's call). Earth fire 地火 on volcanic land, and an alchemy or refining room over it, adds +0.25 lift and 10 points to whether a batch holds for alchemy and refining; a place whose element matches a recipe's (a thunder peak for lightning talismans, a cold spring for ice pills) does the same for those recipes; and a written site, a famous furnace cave or a sect's earth-fire hall, may give up to +0.5 lift. A power's hall rents its rooms by the day, in its currency to members and in stones at the open counter. Which places carry what is written in the atlas, settled with sites (block 8).

**The craft Dao trees** (D4, block 4).

- **Five trees**: Alchemy 丹道, Refining 器道, Talismans 符道, Formations 阵道 and Spirit Farming 灵植, whose recipes are its crops and whose perks are growth. Geomancy has no tree yet; its site reading leans on the Earth Dao's geomancy side.
- **Three branches, the same in every craft** (Jan's call), so one breath explains all five: **Hand 手**, the hands-on side (lift, Steady hands' reach, the minigame's forgiveness); **Line 炉**, the idle side (whether a batch holds, yield, speed, fewer blow-ups, what makes a queue or a hired hand pay); **Lore 方**, the recipes (their nodes, experimentation's odds, the discoveries edge).
- **Each branch has its own capstone a tier, and it opens that branch's next tier**, so a branch climbs on its own: a pure Line alchemist or a pure Hand one. A tier is held at half of all its nodes, as every tree's is, so touching two branches pays. About 12 nodes a tier, four a branch with its capstone. Perks: whether a batch holds +5 points, yield +10%, lift +0.1, Steady hands' reach +0.25 band, speed −10% hours, blow-ups fewer.
- **Tier 1's capstones:**

| Craft | Hand | Line | Lore |
|---|---|---|---|
| Alchemy | Steady Flame: reach +0.5 band | Twin Furnace: two batches at once | Pill Sense: experimentation's pity ×2 |
| Refining | Clear Tempering: reach +0.5 | Second Piece: a second piece from the same ore | Pattern Memory: pity ×2 |
| Talismans | One Breath: reach +0.5 | The Stack: ×2 sheets | Brush Lore: pity ×2 |
| Formations | True Placement: reach +0.5 | One More Array: an array more held at a site | Array Sight: +1 array sight |
| Spirit Farming | Green Thumb: tending's hand +0.5 | Second Harvest: a plot's second harvest a year | Seed Lore: crossing crops finds new strains |

- **A recipe node is a square seal**, as a slip is, where a perk is a round jewel; discoveries on the edge are seals too, so a tier's recipes read at a glance whatever door they came by.
- **Insight is the one pool.** A Craft hour leaves the trickle every hour leaves, and a family's mastery level releases its burst as a technique's does.
- **The element Daos' craft side paths** (`stats.ts`, waiting for crafting) switch on: Fire's into the furnace, Wood's and Water's into the fields.
- **Drafting.** Tiers 1 and 2 of all five go in as data in their build phases, drafted by a cheap agent to the combat Daos' pattern for Jan's review; tiers 3 to 9 carry only their names and capstones.

**Styles and the craft grade** (D4, block 5).

- **A style is a small grafted tree** beside its craft Dao, a chapter a realm. Chapter 1 is about five nodes: two or three recipes as seals and two perks that lean one branch, which is the style's character (a guild's leans Line, a hands-on master's Hand).
- **Most powers use a common style** (Jan's call): styles are written in layers as catalogs are. Each area keeps one common style a craft, sold in its markets and taught openly, never guarded, and most powers that craft at all, a clan, a gang, a garrison, simply hold it, mostly bought; the clans of one area brew alike. Only a power whose trade is the craft (an alchemy sect, a refining works) writes its own, and a few hold a bought or inherited style from elsewhere, written as an import along an atlas tie. The Border Wilds: five common styles, one a craft, and two or three of its own.
- **An own style's chapters and guarding work as a method's**: chapter 2 for inner disciples and 3 for true at the pavilion, markets selling chapters 1 and 2 as fragments, the leak, the mark and the hunt unchanged. Its recipes are why its hall stocks lines found nowhere else, and selling its guarded goods where its people trade is seen in use: they know their own pill. A common style's later chapters come from a guild.
- **The craft grade, first-grade 一品 to ninth-grade 九品,** is the craft Dao tier you hold (a second-grade alchemist 二品丹师 holds Alchemy's tier 2), certified at a guild's hall by one test batch of that tier that holds, played or queued. Its badge opens doors: a guild seat needs the grade of its own realm's tier (a guild whose elders are Core Formation wants third-grade for elder), and a graded commission asks for it.
- **Who holds what** (K6's talk). The Border Wilds' five common styles are the Frontier Pill Method 边荒丹法, the Frontier Forging Method 边荒器法, the Frontier Talisman Script 边荒符箓, the Frontier Ward-Flag Method 边荒阵法 and the Frontier Field Method 边荒灵植; chapter 1 is two or three recipe seals the craft trees don't teach and two perks leaning one branch (the pills lean Line, the forging Hand, the script Line, the flags Lore, the fields Line). Two powers write their own: the Pavilion of Bound Bones (the Bone-Binding Array Canon 缚骨阵典, Formations) and Red Marrow Cave (the Marrow-Draining Blood Method 赤髓血丹法, Alchemy, its pills reaching the world only through the Nameless Market); Apricot Grove's Frontier Hall holds the Valley's Apricot Grove Healing Canon 杏林丹经 as an import along its patron tie. The other sects' members' goods stay guarded recipe slips (K1), since their trade isn't the craft. A shop a power owns stands the goods of the styles that power holds, so the Qian Clan's trading hall brews the frontier's pills and Apricot Grove's branch shop the Valley's.
- **They know their own pill.** Selling a power's own style's good where its people trade (a market its shops stand in, or one its trade or secret ties name) is seen in use: a leak at the style's chapter, its grudge and the mark, unless you are a member or sworn.
- **The examination 考品.** One batch of the grade's tier at the guild's own bench, your own inputs and a fee of 10 low a grade, that holds: sat at, the craft's own minigame handed in when you will; queued, at no hand. What it makes is yours and marked. A guild examines to the tier of its strongest realm, so the Foundation-led frontier branch grades to 二品. Formations and Spirit Farming are examined once their benches exist.
- **A guild where there is one** (Jan's call in K6's talk). On the Morning Star Continent the Myriad Crafts Guild 万艺公会 grades crafters, its frontier branch in the City of the Guarded Mouth; other continents may have no governing body for crafts, as some novels have none, and there craft renown does the job. A guild seat needs the grade of its realm's tier, certified in any of the guild's crafts (one gate, `seatGate`, read at joining and by the seats taken by realm).
- **In the atlas** a guild or works carries `crafts`, what it practices; new crafting powers wait for the atlas fill.
- **Craft renown** (Jan's idea) is renown's rule (The resolver, What lasts) kept per craft: 0 to 9 a region, 3 across a town and 6 across the region, beside your renown, so you can be a famed alchemist in the Border Wilds and an unknown refiner. It rises as your marked goods sell there (a little a lot, by its worth to that market), with commissions done, a gold piece or better made and a grade certified, and fades a step a year while nothing of yours sells there. Your maker's mark adds +3% a point to the price (+27% at 9); from 3, the shops and halls you stand in offer commissions by name; from 6, a guild or a power offers you its guest elder seat. The numbers (K6's talk): renown's points and levels, kept on the cultivator; each month a point for every month's wage of your marked goods sold in a region (30 low on the realm curve), at most two a month, two for a grade certified there and two for a gold piece made there, so steady brewing is known across a town in about two months and across the region in about eight. It fades a level a year while nothing of yours sells. What you made carries your mark 记, counted by the piece and spent first when you sell. The world coming to you for it, a card asking a commission, a robber who knows a rich crafter's face on the road, waits for the living world (Still to design).

**The effect table and experimentation** (D4, block 6).

- **Every herb and material carries tags**: one element (the eight, or neutral) and one or two of eighteen properties: nourishing, tempering, soul-calming, restoring, mending, purging, toxic, sharp, hard, light, swift, binding, burning, chilling, concealing, spatial, resonant, illusory.
- **The effect table** says what properties make in each craft, on the effect vocabulary items already carry, adding only what is missing. What the novels' crafts make (Jan asked for the fuller list):

| Craft | Properties → what they make |
|---|---|
| Alchemy | nourishing → qi fuel; tempering → body fuel; soul-calming → soul fuel; restoring → qi restored; mending → HP restored; purging → detox; toxic → poison (new) |
| Talismans | burning, chilling, sharp → a strike of the input's element (fireball, ice spike, wind blade, rockfall, lightning); hard → a shield (Golden Light 金光符); swift → speed (Divine Travel 神行符); light → lightness, crossing water and walls (Feather-Body 轻身符); swift with earth or water → escape (Earth Escape 土遁符, Thousand-Li Escape 千里遁符); binding → holding a foe still (Body-Fixing 定身符); purging with yang → driving off ghosts and evil (驱邪符); resonant → a message (Sound-Sending 传音符); concealing → hiding; illusory → a decoy double; spatial → a short blink |
| Refining | sharp → weapon power; hard → armor; light → speed on gear; swift → a flying sword or boat; spatial → a storage pouch or ring 储物袋; binding → a binding rope 捆仙绳; resonant → a soul-striking bell or mirror; concealing → a hidden weapon, flying needles 暗器; an element → its rune on a piece (a flame blade) |
| Formations | nourishing → gathering qi 聚灵阵; hard → a guarding barrier 护阵; binding → trapping 困阵; sharp or burning → a killing array 杀阵; illusory → an illusion array 幻阵; concealing → hiding a site 隐匿阵; resonant → an alarm 警戒阵; spatial → a teleport array 传送阵, from Core Formation; tempering or nourishing with wood → growing a field 育灵阵 |

- **Size** follows tier and rarity on the curves that exist: a white tier 1 qi-fuel pill gives 3 days, as the Bone-Meal Pill does.
- **A generated recipe** takes its effect from your inputs' dominant property and its element from their dominant element, and is named once from a pattern (element word, property word, kind: an Ember-Nourishing Pill) and kept in the save. Up to blue; gold, red and pristine are written.
- **Written recipes are checked against the table**: a test finds any authored recipe whose inputs could not make its effect, which is the table's other job.
- **Experimenting** is a batch of the unknown on Craft hours, the inputs thrown in and spent, at the odds above (Experimentation) with its pity per ingredient set; attended, the hand's lift applies to whatever is found.
- **Finding a power's guarded recipe yourself is no leak**: you stole nothing. Selling its goods where its people trade is still seen in use, the novels' scandal.

**Where crafts live** (D4, Jan's call). One **Crafts 艺** screen on the rail, under Routine, a hub with a page a craft flipped between: Alchemy, Artifact Refining, Talisman Drawing, Formation Inscribing and Spirit Farming. Each page holds its bench's queue, the tool, the recipes known, experimenting, and its minigame when you sit at it; Spirit Farming's page holds your fields, each locked to its place. Which hours are Craft hours stays on Routine. The screen opens where it lives, and a page the first time you hold its tool or a field.

**Spirit farming** (D4, block 7).

- **Three ways to hold a field**, and as many as you like: **rent a plot** in a village or town with farmland, by the season (a tier 1 plot of 9 beds about 6 low a season, up the realm curve with the place's vein); **buy one** for about ten seasons' rent; or **make your own** at a site you hold (Sites, block 8). A post's fields stay its Duty hours.
- **A plot** has beds, a soil tier (from the place's vein) and an element (from its land: a marsh plot water, a volcanic one fire); a crop of the plot's element grows ×1.25.
- **Crops** are spirit rice and the catalogs' herbs, from seeds or cuttings sold where the herb sells at a tenth of its price, or a live herb dug up on a trip and replanted. Spirit rice and a tier 1 herb ripen in a season.
- **Seeds carry rarity**, inside their herb's written range, and a seed's rarity is its crop's floor. A harvest gives back seeds at the plant's floor, and a plant past a hundred years gives one a band up, so a patient farmer breeds a line upward; a rare seed is a treasure in its own right.
- **Herb age is the payoff.** A ripe herb left in the ground keeps aging, its rarity a band up at 10, 100 and 1,000 years, never past its written top. On the clock (about a year an attended hour) a hundred-year herb is most of a life, which is what the boosters are for.
- **Boosters** multiply a bed's growth and its aging: soil a tier above the vein ×1.25 a tier, raised with spirit soil sold by tier; aged earth milk 地乳, which adds its own years at once (a dose of twelve-year milk ages a bed twelve years); a growing array 育灵阵 ×2 while its stones last; a Spring-Rain talisman ×1.5 on a bed for a season; a Wood spell cast at the field ×1.5 for a season; and the Farming tree's Line perks.
- **Tending is its minigame and needs you there** (Jan's call): clearing the knots of foul qi as they rise from the beds, the hand adding lift to the harvest's rarity. Planting and harvesting are done at the plot too; the page lists every field anywhere and acts only where you stand.
- **How long a field goes untended**, three spans a plot, each with its own covers (Jan's call):
  - *Growth* never stops (Jan's call: it shouldn't be much of a problem). Untended, a plant grows at its **hardiness**, which rises with its age: ×0.5 under ten years, ×0.75 from ten, ×1 from a hundred, when it stands alone as the novels' old herbs do. The page shows it in a word: needs tending, hardy, stands alone. A growing array or a Spring-Rain talisman counts as tended.
  - *Pests*: a month on forest, jungle and marsh, three on plains, two elsewhere, and a month more for each soil tier above the vein; past it pests take a bed a month. Covered by a pest-warding talisman 驱虫符 for a season or a warding array.
  - *Thieves*: none at a rented or bought plot, which its village watches, until your heat there reaches 3; at your own site, a field worth more than its guard brings a thief as a card (The world comes to you). Covered by a guarding array or a concealing one (they never find it).
  - A hired keeper waits with the other hired hands (Production, below).
- **Soil moves** (Jan's idea): a plot's worth of spirit soil dug up is one bulk item, 2×2 in the Bag, carrying its soil tier, and laid down at a site you hold. Digging it up ends what grows there (ripe crops harvested, the rest lost); carrying a living field is for spatial storage, far off. Rented soil is the village's and never moves.
- **What it's worth**: a plain tier 1 plot nets about 7 low a month with no hours spent; it feeds your furnace, and the aged herbs are the fortune.

**Sites and formations** (D4, block 8).

- **A site is a pin made a site**: any spot where you have laid something, a field, an array, a stash. One site at a time is your **abode**, where you live and seclude, and you may move it. A site is entered as a place is, with its own place screen and its doors: Seclude, Store, Fields, Arrays.
- **Claiming.** Unclaimed wild land is free; settling inside a power's sphere is a deed against it unless you rent or buy; in a town you buy a courtyard. A sect's dwelling stays the power's, with no arrays of yours but through a formation post.
- **Its properties**, read from what exists: its **vein**, the place's, or on bare land a hidden local vein; its **defenses**, its arrays and the place's guards; its **concealment** (below); its **reach**, the markets-by-reach rule from that spot; its **neighbors**, the place's people and powers and the beasts of the land's danger band.
- **Hidden veins, more of them on the frontier** (Jan's call). Bare land seeds hidden local veins with the world, most tier 1 and a few a tier above the region's, three times as thick in undeveloped land as in settled, so the Border Wilds, mostly empty, is the place to find one. The atlas fill may write named ones. Geomancy finds them.
- **Arrays held**: one on a tier 1 vein, one more a tier, and one more from One More Array. Each is laid from its flags and disc (Formation Inscribing's recipes) through the placing minigame, the hand setting its strength, and burns stones a day while it runs.
- **Gathering arrays 聚灵阵 move the site's qi density** on the ladder (1 barren to 9 heaven-touched; The world, Depth and qi density) while they run, and it falls back when the stones run out: a step at tier 1, a step more a tier, and a step more at gold or better. Seclusion reads the site's density, about ×1.15 qi a step, tuned against the dwelling table in its phase. The vein is a soft cap, not a wall (Jan's call): a step above the vein's own level costs double upkeep, and only a gold array or better reaches past it, so a great array at a high tier can lift a place above its vein. A tier 1 array's upkeep is about 0.5 low a day against about 1.25 low of qi it adds.
- **The other arrays**: guarding, a barrier on the realm curve by its tier and rarity that the weaker turn from and the stronger break in a scene; trapping and killing; concealing; growing, for fields (Spirit farming).
- **Concealment** (Jan's call) is a site's own number, from its spot (a cave behind a waterfall, a karst forest, an entry's `hidden`), concealing arrays and nodes. A thief, a raider or a beast must find the site first, its search against your concealment, before its worth against your defenses matters.
- **Raids.** A site worth more than its defenses draws thieves and raiders as cards (The world comes to you), once they find it. **Beasts raid too**, at the land's danger band, drawn not by worth but by what beasts want: a site's raised qi density and its old herbs, as the novels' beasts guard a hundred-year herb. So a gathering array in deep wilds needs a guard.
- **Prepared ground.** Flags can be laid at any spot, not only a site. A laid array lasts as long as the stones in its disc hold out, its tier setting how fast it burns them, and nodes and techniques stretch it (Jan's call). **Passive traps** catch what walks in, a beast, a thief, a pursuer, held by the trap's strength against theirs until you come to check; **active arrays** run during a fight on their ground. How an active array plays in a fight is the build phase's talk (Jan's call: not yet known); starting shapes: a killing array strikes the foes inside each turn at its power, a trapping one costs them turns, a guarding one shields your side, an illusion one dulls their aim. P3.9's scenes read the ground a fight starts on.
- **Geomancy, thin**: your soul with the Earth Dao against a spot's hidden number, a few hours at the spot, revealing its local vein, its soil and any ore or herb beds; a geomancer can be hired for the same reading.
- **Dwellings are sites** (the opening redone, 2026-10-20, Jan's calls; K9 builds them whole). One record for every place you live and cultivate: a seat's dwelling (Professions, people and powers, What membership gives and asks), a room or a cultivation chamber 密室 rented from a broker, a courtyard, a cave abode on a vein, and one you make in the wild. A **broker 牙行** in every town and city, under its Own doors, rents and sells them, more and better in a bigger and richer place: a rented room by the month at the place's density; a chamber by the day or month, its small gathering array a step above it (the novels' rented secret rooms); in a city a courtyard by the season or bought, with a store; and a cave abode on the city's spirit hill by the season from whoever holds the hill, at the vein's density. You hold at most one a place, and one of them is your abode. **The Dwelling screen 居** on the rail shows the one where you stand; anywhere else it is greyed, listing those you hold and saying a broker here can rent you one. It opens the first time you hold one. A dwelling carries land only where its place has land to farm (a courtyard in a farming town has beds, a city chamber none, a cave abode's beds by its vein). How a dwelling's land and Spirit farming's plots meet is open for K9's talk, with K8's: make the two clearly distinct, or keep one.
- **The store and moving** stay as written (Idle production): the site's store is the Bag's second grid, opened only there, and moving your abode is a trip, by cart or caravan, robbery the road's risk.

**Methods that eat resources, and arts that burn goods** (D4, block 9).

- **What upkeep buys** (Jan's call: methods that are costly to run but good). While fed, an upkeep method cultivates and leaves its growth as if it were rarer, a band for light upkeep and two for heavy, on the curve everything shares; unfed, it stalls as written (Cultivation, Methods). It is priced at its written rarity, so the poor can buy the slip and not feed it, and the rich climb like a sect's genius.
- **What they drink**, tied to the crafts: qi methods stones by the day or a pill a day, so an alchemist's furnace feeds their own method; tempering arts an herb bath 药浴 (an herb of their tier a day), a vial of beast blood or ore powder for a metal body; nourishing arts incense or soul-calming herbs; demonic methods blood or others' qi, as written.
- **About eight written** at tiers 1 and 2, three qi, three body and two soul, placed in the Border Wilds' catalogs where they belong (the Gate's beast-blood tempering, the Night Bridge's pill-fed breathing) and a few as rare finds.
- **Stone swallowing 吞灵石** is a method property: it doubles the stone-burning cap (Economy, Stones as fuel), at half the worth a stone past the old cap, so a crafter's fortune at last becomes qi.
- **Arts whose cost is goods**, combat content beside qi: a talisman volley, a talisman master's art throwing 3, 5 or 10 talismans in one action, each at full power; artifact detonation 自爆法宝, a piece destroyed for one strike at ×5 its power; flags set mid-fight, an active array from the flags you carry for a turn and its disc's stones; a burning pill 燃血丹, a realm step for three turns and weakened for the rest of the day.
- **The world uses them**: a great-sect young master runs a heavy method and carries the stones for it.

**Production, commissions and the craft deck** (D4, block 10).

- **You do the work, for now** (Jan's call). The layer builds only the first of the four automation steps (Idle production), your own queue on Craft hours, so you gather enough inputs before you leave it to run. Standing orders (buying inputs under a price and selling outputs over one at markets in your reach, a courier's fee of 2% a day of road), hired hands, keepers and disciples running a queue, and the full chain wait for the living world or founding your own power (Still to design, Sects).
- **Where it sells**: you carry your goods to market yourself (Economy, Trading yourself), and they move it by the lot rule, so a village floods and a city hardly notices, and a crafter who wants to stay rich travels.
- **Commissions posted.** Each alchemy shop, refiner and talisman stall posts one a month for its market's biggest shortage, the one its line of why already names (Economy, People make and use), so a commission always has a reason you can see: "Ten Wound-Knitting Pills, green or better, by the month's end, at ×1.5 the market." A graded one asks for the badge, and from craft renown 3 the shops you stand in offer some by name.
- **Commissions you place**, a piece made to your wants: at a refiner or an alchemy shop you pick a recipe it knows and bring the inputs or pay for its own, at ×1.25 the market, ready after the crafter's hours, its rarity from their mastery; rarer inputs you bring add their lift.
- **Mending is refining**: P3.5's refiner's mend is a refining action, a craft hour a tier of the piece, and you mend your own once you refine.
- **The craft deck**, about twelve cards, each naming a person or a place you can go into: a peddler with a hundred-year herb, a furnace's fire flaring (push it or bank it), a sect's steward wanting the whole batch, a rival's pill undercutting yours, a guild's exam this month, a dying alchemist's slip, a thief eyeing your field.
- **Where the cards come** (Story cards and events, Where they live): in Cultivate's tray as every card does. The craft deck joins the draw once you hold a tool or a field, its share of draws the share of your wheel's Craft hours (at most half), so a crafter's feed tilts toward the bench; a card about a field or a market is set where that field or market is. A card about your bench or fields also lights its page on the Crafts screen, and the urgent ones (the thief at the field) take their default if left, as urgent cards do.

Formation puzzles show the engine-and-GLM split well. The engine hides which node is the array's eye, GLM describes the clues, Soul checks reveal hints, and a wrong strike backfires.

**People and powers** run on the same idle-and-world split:

| System | In seclusion (idle) | In the world (go in) |
|---|---|---|
| Techniques | practice raises each technique's mastery from Glimpse to Origin; your cultivation method sets the qi rate | find manuals and inheritances; learn from masters |
| Sects | duties earn contribution while you idle; spend it in the library and shop | missions, politics, masters and rivals; rank from outer disciple to elder |
| Factions | standing drifts with world events | trade, quests and feuds across the 7 standing words, hunted to honored (The resolver, What lasts) |
| Fame | fades slowly while you stay in seclusion | grows with deeds, good or bad; strangers know your name, and factions react by their own values |
| NPCs and relationships | disciples and allies work for you | talk in free text and they remember it; friend, rival, sworn sibling, master, dao companion |
| Karma | hidden; shifts with your choices | changes encounters, tribulation strength and how factions treat you |
| World events | the calendar runs wars, auctions, tournaments and secret realm openings | show up and take part; rumors point the way |
| Prosperity | eases back toward its written value while you idle; trade raises it and war drains it | sets how full every sect's, city's and town's market is on its vein's scale (Economy, Prosperity); your deeds move it |

**Organizations share one skeleton.** Sects, clans, guilds, gangs and the rest are one kind of record: how you join, how you rise, the currency you rise by, what it asks, how you leave and what it gives. Each has its own rank names, halls or branches, and the chapters each rank unlocks. A type is a preset for that skeleton, and any organization can mix parts: a sect run like a gang, or a clan that owns a guild. Settled in the organizations design (2026-10-19):

- **Every atlas power carries a `type`**, one of the eleven below. A kingdom with no ruling power written reads as a dynasty, so the March's garrison takes the conscript's child without an entry of its own. A kingdom a council rules is none: Stone Eyes' cave clans pay no tax and give no soldiers (O1's talk). The assassins get one entry, a house in the Border Wilds hidden behind the Night Bridge Society.
- **A type is a preset in content** (`src/content/organizations.ts`), its fields the table's columns and its seats' names (Seats, below). A power overrides any field, keyed by its id; the atlas keeps only the type. Rank names stay in the cultivation world's words (outer disciple 外门弟子, inner disciple 内门弟子, true disciple 真传弟子, deacon 执事, elder 长老, grand elder 太上长老, sect master 宗主, and their clan, guild and court equivalents), never a fantasy title; an override renames within that vocabulary (a palace's palace disciples, the Gate's Gate disciples).
- **Mixing is an override, not a second type.** The Qian Clan is a clan whose "what it gives" adds the guild hall it runs.
- **Houses and the rest.** You serve one house at a time: a sect, academy, temple, dynasty or assassins' house. Guilds, societies and gangs stack, and your clan comes by birth, adoption or marriage and stays. Joining a second house means leaving the first by its rule.
- **Leaving is not betrayal by itself.** Leaving by the type's rule (released, graduating, retiring, selling out) is a clean parting, kept as a memory, not a grudge. Betrayal is leaving where the rule says hunted (a society, assassins, deserting a dynasty), going over to a power the first is hostile to, or carrying off its guarded methods (Economy, Methods in the market).
- **NPCs are members by the same rule.** A membership holds a rank and a balance of the type's currency (a save change), so Elder Mo is an elder as you would be.
- **Beast powers and tribes take outsiders.** Their own join by bloodline, birth or a beast bond, and anyone else joins as they would, by a trial or tribute, the same skeleton. An outsider of another race carries "not of our blood" on every member's opinion, −15, never fading; the rule runs the other way too, so a beast in a human sect carries it with the humans.

| Type | How you join | Its currency | What it asks | How you leave | What it gives | In the atlas |
|---|---|---|---|---|---|---|
| Sect, gate or palace | a test | contribution | duties, quotas | released or expelled | methods, a library | Waking Thunder Sect, Gate of Beast Craft |
| Clan | birth, adoption, marriage | contribution | blood duty | never quite | inheritance, protection | Baili Clan, Nangong Clan |
| Guild or works | buying in, apprenticeship | contribution, beside a craft grade | dues, trade quotas | selling out | markets, caravans, workshops | Geomancers' Guild, Cloud-Bearing Works |
| Gang | a blood oath | face | territory, tribute | in a box | streets, fences | Tusk-Saw Gang, Jarless Gang |
| Society | recruited or sponsored | trust | silence, favors | hunted | intelligence, smuggling, contacts | Night Bridge Society, Core-Takers' Society |
| Assassins | recruited | trust | contracts, silence | hunted | poisons, marks | none yet |
| Academy | an exam | contribution | attendance, tests | graduating | teachers, alumni | Vermilion Brush Academy, Academy of the Chalk Line |
| Temple or abbey | vows | merit 功德 | vows, service | breaking your vows | sanctuary, Buddhist arts | River Lamp Temple, Abbey of Settled Souls |
| Dynasty or army | conscription, office | military merit 军功 | service, taxes, war | deserting (hunted) or retiring | stipends, garrisons, authority | Great Jing Dynasty |
| Tribe | birth, a trial | deeds | the hunt, feuds | exile | land, beasts, old rites | Tribe of the Shark Caves |
| Beast power | bloodline, or a beast bond | tribute | tribute, territory | devoured | beast lore, mounts, bloodline gifts | Beast Court of Ten Thousand Mountains |

**Seats and the currency.** Every organization has the same six seats, as Tale of Immortal's sects do, and a greater power fills them with stronger cultivators.

- **Rank is realm and a deed; the currency only buys.** As the novels have it, contribution is spent at the exchange hall, and promotion is the realm and a trial: you are eligible for a seat on reaching its realm, and take it by its trial (the yearly inner trial in the first month, one try a year: your strongest ladder through your wounds against the size of the outer seat's top stage, passed at close or better, so a plain Qi Condensation 9 or a layer 7 with a perfect breakthrough wins the Gate's; never a roll) or by appointment (an elder taking you as their disciple makes you a true disciple; the elder and head seats are appointed). Reaching the inner seat's realm makes you an inner disciple outright. A seat sets what you may buy and which posts you may hold.
- **A seat's realm is read from its power's population, top down:** the head and grand elders at its top realm, the head its strongest (when one alone stands at the top, the grand elders are the strongest of the realm below); elders the realm below the top, or the top itself when ten or more stand there; true and inner the realm below the elders; outer everything under that, and when nothing is under, one realm splits at layer 7, inner above and outer below. A power without a population yet reads its written top as one standing at the top (head at the top, grand elders and elders the realm below, true and inner two below, outer the rest), and one with neither takes its top realm from its vein (O1's talk). A power overrides any seat's range or name: Apricot Grove Valley, whose few at the very top would seat Nascent Soul as inner disciples, keeps elders at Nascent Soul and true and inner at Core Formation. A branch hall (Apricot Grove's Frontier Hall) has no seats of its own: joining it is joining the power it answers to.

| | Lamp-Keeper Sect | Beast-Butcher Gate | Great Jing Dynasty |
|---|---|---|---|
| Head | Foundation | Nascent Soul | Body Integration (the Ancestor Emperor) |
| Grand elders | Foundation | the strongest Core Formation | the strongest Deity Transformation |
| Elders | Foundation | Core Formation | Deity Transformation |
| True and inner | Qi Condensation 7–9 | Foundation | Nascent Soul |
| Outer | Qi Condensation 1–6 | Qi Condensation | Core Formation and below |

- **The seats by type**, drafted for review in the build phase. A guild's seat also needs its craft grade, first-grade 一品 to ninth-grade, read from the craft Dao (crafts).

| Type | Outer | Inner | True | Elder | Grand elder | Head |
|---|---|---|---|---|---|---|
| Sect | outer disciple 外门弟子 | inner disciple 内门弟子 | true disciple 真传弟子 | elder 长老 | grand elder 太上长老 | sect master 宗主 |
| Clan | branch clansman 旁系 | direct-line 嫡系 | heir 嫡传 | clan elder 族老 | old ancestor 老祖 | patriarch 家主 |
| Guild | member 会员 | senior member 高级会员 | guild steward 执事 | guild elder 长老 | guest elder 客卿 | guild master 会长 |
| Dynasty | soldier 兵卒 | captain 校尉 | commander 统领 | general 将军 | great general 大将军 | king 王, emperor 皇帝 |
| Gang | gang member 帮众 | incense master 香主 | hall master 堂主 | elder 长老 | great elder 大长老 | gang chief 帮主 |
| Society | informant 眼线 | member 会众 | hall master 堂主 | elder 长老 | great elder 大长老 | society head 会首 |
| Assassins | bronze-medal killer 铜牌 | silver-medal 银牌 | gold-medal 金牌 | elder 长老 | great elder 大长老 | house master 楼主 |
| Academy | student 学子 | inner student 内院 | personal student 亲传 | teacher 教习 | grand teacher 大教习 | academy head 院长 |
| Temple | novice 沙弥 | monk 比丘 | abbot's disciple 亲传 | elder monk 长老 | first seat 首座 | abbot 方丈 |
| Tribe | tribesman 族人 | warrior 勇士 | chosen warrior 神选 | elder 长老 | shaman 巫, great shaman 大巫 | chief 族长 |
| Beast power | by realm | by realm | by realm | by realm | by realm | by realm |

- **A title that claims greatness needs the realm for it.** A beast power's titles are its holders' realms, as the novels' beast ranks are: beast soldier 兽兵 at Qi Condensation, beast captain 兽将 at Foundation, beast commander 兽帅 at Core Formation, beast king 兽王 at Nascent Soul, great king 大王 at Deity Transformation, beast sovereign 兽皇 from Void Refinement; so a Core Formation beast at the head of its power is a beast commander, never a sovereign. Likewise a tribe's shaman is a great shaman only from Nascent Soul, and a dynasty's head is a king below Deity Transformation and an emperor from it.
- **Each type's currency** (the table's column) works the same underneath: contribution 贡献 in a sect, clan, guild or academy, merit 功德 in a temple, military merit 军功 in a dynasty, trust in a society or an assassins' house, face in a gang, deeds in a tribe, tribute in a beast power. **One point is about a low-grade stone's worth**, so it follows the realm curve as income does: a day's duty earns 1.5 at Qi Condensation and 13.5 at Foundation. It comes from posts, the mission hall and donations (goods at half their sell price, stones at 2 low a point; Economy, Sect contribution). The balance stays with the power, and leaving gives it up.
- **NPCs take their seat by their realm** through the same rule; named people keep the seat written for them.

**Posts.** A job (Cultivation, Duty hours) whose giver is an organization is a post; a job at a shop or office with no power behind it is a hire, paid in stones, with no seat or currency, and otherwise the same rule. A post is held from its seat and a hire from a realm and stage (the City's hires and the caravan guard from Qi Condensation's fourth layer), and its posting says which before you take it (Sean's playtest, 2026-10-20).

- **A post names** its power, its hall, the lowest seat that holds it, its shift (Duty hours on the wheel), its pay (the power's currency, and stones where the type pays them, a dynasty or a guild) and its perk (What membership gives, below). Some are open to outsiders as hires at the outer seat's pay: a guard on the Qian Clan's caravan, a runner at the bounty office.
- **Halls group a power's posts**, as the novels' sects keep them. A sect's preset: the medicine garden 药园, the mine 矿脉, the alchemy hall 丹房, the scripture pavilion 藏经阁, the law hall 执法堂, the mission hall 任务堂 and the exchange hall, the sect's shop; a dynasty's garrisons and offices, a guild's workshops and caravans. Outer disciples work the garden and the mine, a deacon runs a hall's daily work (the seat a Foundation member earns more by), and an elder heads a hall.
- **Pay under the economy's rule.** A duty day is four double-hours and pays a day and a half's work on the realm curve (1.5 at Qi Condensation, 13.5 at Foundation): all in the currency at a sect, clan, academy or temple, half in the currency and half in low-grade stones at a dynasty or guild, all in stones for a hire. Burned as stones it is 0.3 of a day's qi, under the third of a day the same four hours give secluding, so working never beats secluding for raw qi; a post is worth its currency, its perk and what only its power sells. Points and stones come due whole, the rest carried to the next shift, the stones in the place's vein's grade.
- **The mission hall is the sect's bounty office**, the same bounties paid in contribution, a point a low-grade stone, less a harsh power's tithe; only members take them, and a sect's seat keeps one as a door beside its Work. It posts its own power's kinds of work in its sphere, never a town's (the Gate's core hunts and raids across the strait; any other sect's core hunts and herb runs), and says its pay in the currency (the checkpoint's fix). A mission is one-off, not a post. Turning in beast cores, the orphan's "contribution for cores", is a donation at half their sell price.
- **A dangerous post** (the checkpoint, Jan's call): a harsh power's lower seats hold one, its pay doubled and its risk real rather than rolled. The Gate's raid across the strait meets one raid fight a month its shifts are kept, at the strongest band of its seat, settled by your stance as a road card is or waiting for you. The membership line names a power's treatment ("a harsh sect: half the allowance, a 30% tithe on what you bring in"), and a hall's Sell list shows what you keep after the tithe.
- **Posts have holders.** Outer posts hold everyone; a deacon's or elder's post has one holder, filled by the world's people through the seat rule, and you take it when it falls vacant or you are appointed.

**What membership gives and asks**, as a power in the novels gives its own; each is a hook into a system that exists:

- **Access.** The token opens the gate. The **exchange hall** sells to members in contribution, at the market's price and never above it, and stocks lines found nowhere else. The **scripture pavilion** sells the style's chapters by seat, chapter 2 to inner disciples and chapter 3 to true disciples (Cultivation, Lines, chapters and kinship), where a market sells only the first two. The power's secret realm, when it opens, by quota.
- **A dwelling by seat**, qi density's first use in seclusion: outer disciples share a hall on the power's vein (×1.1), inner disciples a cave (×1.3), true disciples ×1.6, elders a peak (×2), counted only while you seclude there and capped by the vein's tier, so a thin vein gives less. It is the novels' first reason to join a sect; the balance sims recheck the world's share against it. The place's head names it while you stand in it ("Your cave on the Beast-Butcher Gate's vein: qi ×1.3 while you seclude here"), and every day's qi figure reads it.
- **A monthly allowance 月例 by seat**, from the power's purse: outer 3 low and a Qi-Gathering Pill, inner 15 low and three pills, and from the true seat up 60 low on the realm curve by the holder's realm (60 at Foundation), each seat at least ×1.5 the one below, so a head never draws a disciple's (the checkpoint's fix). What a power hands out, the allowance's pills and the year's Foundation Pills, is its gift, and its own hall won't buy it back.
- **Backing.** Threatened, you name your power, on the backer rule (×1.5 a realm above, ×2 two or more; Backers and traces), and a member killed lands on the power as killing one of its own. True disciples of a Core-led power and up carry its death talisman.
- **Connections.** Fellow members meet you at +10, "one of ours"; ripples pass half to members of the same power (Ties). The other way, a member of a power at feud with another (the atlas's enemy and feud ties) stands at "One of our enemies' people", −20, with it while they belong, so cold at least, and its gate and hall say why (the checkpoint's fix).
- **Knowledge.** A member knows the power's private tier (What an NPC knows): its places, its people and the kinds of site along its trade, and its region map.
- **Tutelage.** A true disciple's master teaches (Ties). Any member buys an elder's time with contribution: insight hours, or an elder as **protector 护法** at a breakthrough, +5% to the odds and a failure softened a step.
- **Investment.** A power pours resources into its best: each year it hands out a few Foundation Pills by the inner trial's ranking, and a member who reaches a realm well before the seat's usual age is offered a true disciple's treatment early: an inner member of a year's standing, and where the inner seat is held within one realm only one who won it by the trial, so it never comes on joining day or skips the trial (the checkpoint's fix).
- **A post's perk**, a line of data: the medicine garden's herbs at cost, the mine's share of ore, the alchemy hall's furnace and recipes, the scripture pavilion's free reading hours, the law hall's authority (heat against offenders), the mission hall's first pick of bounties.
- **How a power treats its own**: generous, fair or harsh, from its way and overridden per power. Fair is the numbers above (orthodox, Buddhist, most clans and guilds). Harsh (demonic sects, gangs, assassins): the outer and inner seats get half the allowance or none, a tithe of 30% takes the bounties and loot they bring in, and they hold the dangerous posts, the novels' cannon fodder, while the top seats take ×1.5. Generous (a clan to its blood, a sect short of disciples): the allowance ×1.5 and no quota.
- **What it asks.** A monthly quota, a post kept or contribution paid in (outer 10 points); missed two months running costs standing, three strikes you off. The law: no killing or robbing fellow members, the law hall's heat. Leave: three months a year at the outer and inner seats, more as you climb; past it a point a day and standing, and long missions run on a time limit. Home, where no leave is spent, is the power's seat, a branch hall, the place of a post you hold, and for a dynasty any town or garrison of its kingdom (the checkpoint's fix).
- **Outsiders at the hall.** From friendly standing an outsider buys at the exchange hall's open counter, in stones at ×1.25, never the members' lines or the chapters. An honored outsider may be offered the **guest elder 客卿** seat: an allowance and access, no quota, backing both ways.
- **Membership's doors** (the organizations checkpoint, Jan's call). The way in is asked at the power's seat, at a shut gate from the map, and for a dynasty at any town of its kingdom: a sect's entrance test 入门考核, an academy's exam and a tribe's or a beast power's trial weigh your strongest ladder against the outer seat's bottom (Qi Condensation 1, passed at close or better, so any rooted child passes); a temple takes your vows, a dynasty enlists anyone, a guild takes 30 low on the realm curve to buy in, a gang a blood oath; a society or an assassins' house sponsors only one it stands favored with, and a clan never takes you at a door. A member's seat is settled at its elders' hall 长老院 (a dynasty's commandery 军府, a gang's incense hall, and so on by type): an elder's lesson, a protector, the inner trial in the first month (the place's head says when it is this month), and asking to be released, which first names what it gives up (the balance, the dwelling, the post, the pavilion's copies handed back) and whether it is clean or a betrayal. A member donates at the exchange hall, the points shown before giving.
- **How an outsider earns standing** (the checkpoint, Jan's call). A town board posts for the power whose land the town stands in, the nearest up its atlas parents (Pacified Fort's board for the March), and a posting paid out is "A mission done for us", +10 for a year: one brings a stranger to known, six in a year to honored. A gift at a power's gate or hall worth 15 low on the realm curve by your realm (135 at Foundation) is "Tribute", +5 for a season, one gift a month counted; a member donates instead.

**Guarded methods**, as the novels have it ("That's our sect's Thunder Palm! Where did you learn it?"), on the trace's rule:

- **How a power learns of a leak.** Seen in use: you use one of its methods or techniques where its members see, and a member knows its chapters up to their own seat (an outer disciple chapter 1, an elder all of them); the commonest way. Offered at its own hall: evidence, heat +2 (Economy, Methods in the market). Sold to a black market: the power learns that it leaked, never who, and within a season buys out that shelf's copy. A witness who belongs to it tells it, and the rest spreads as What an NPC knows tells.
- **The mark.** A leak traced to you marks your face for that power, as a death talisman does (Backers and traces): its people who see you undisguised demand the method back, and by their strength against yours attack or call the law. By its standing word: at wary a fine, twice the copy's price and the slip handed over; at hostile and below, on sight.
- **Lifting it.** Restitution at its hall (three times the copy's price, the slip handed back), joining the power (a member may hold its methods), or erasing it as a trace is erased. Leaving its sphere lifts nothing; fewer of its people see you.
- **Paying it off** (the checkpoint, Jan's call). A law hall that knows your face waits for you like a plot the first time it meets you in a season, so no stance slips it and the fine is put to you (pay, fight or flee). Its gate knows a marked face too: it refuses and names the mark, at hostile the guards draw, and restitution is made at the gate itself, the guards fetching the law hall's deacon, so a marked outsider needs no token to make amends.
- **The hunt** never seeks you out: inside its sphere its law hall walks the roads as encounters, sized by what leaked (a chapter 1 leak a pair of outer disciples, a chapter 3 leak an elder), and the heat cools a step a season, as infamy does.
- **Leaving and what you learned.** A clean parting keeps what you learned but may not teach or sell it, and a sale later is a leak; betrayal makes all of it guarded against you, the mark included. The same holds for anyone.
- **A traitor is hunted** (the checkpoint, Jan's call). A betrayal is a leak the power's law hall knows of, at the highest chapter of its own the traitor knows, so its law hall walks its sphere for them as for a thief and the heat cools a chapter a season. One who knows none of its methods, or a power that guards none (a gang), is marked for "its secrets", a chapter 1 leak priced as a white chapter 1 method's copy. A method written as a power's own in content is guarded whoever sells it, so the Night Bridge's breathing method is the Society's.
- **Later:** sect wars over a stolen inheritance and a power hiring assassins against a leak, with trade and the living world.

**People, from the first hour.** Every person you've met has a record: name, where you met, what they are to you, friend, rival, senior, master, sworn sibling, dao companion, enemy, how they feel about you, a word read off the reasons they remember, each listed with its weight (The resolver, What lasts), and their last known realm and whereabouts, which is only what you've seen or heard, so the same fog applies to people as to places. Who gets a record is the kept rule under Enemies, beasts and the people you meet. Each has a log: everything in your chronicle they were part of, since the typed chronicle stores actors by id, plus updates about them. Updates come from cards that name them (a letter from your senior, the sergeant posted to the wall), from their own lives ticking on (bonded people send a yearly letter card), from rumors and headlines, and after v1 from a friend's exported snapshot of their real progress. The People screen shows them as circles and a web of threads (§ UI and screens, The People screen), with portraits.

**Romance and dao companions** are in (NPC basics, Ties). A dao companion is a bond with mechanics: paired cultivation methods, shared danger, and grief if they fall.

**NPC basics.**

- **Motives are data:** one to three of greed, ambition, fear, loyalty to a power, family, revenge, duty or faith, pride and curiosity, the strongest first. They weight the memories in a person's opinion, pick what the person does each tick, and give a scene its intents ("Elder Mo means to take the herb"). Each doubles its tags in the memory table (What lasts): greed payment and theft, ambition service and prize, fear threat and rescue, loyalty power, family kin, revenge harm, duty or faith deceit, pride insult, threat and face, curiosity knowledge. An offer meets a motive only if they truly have it; what you see judges by the motives you know, so one you haven't learned turns the verdict. In a scene each acts on their strongest motive whose moment has come, else waits: fear flees anyone read above them, revenge attacks someone they're hostile to if it isn't beyond them, duty calls the law on a deed they saw, loyalty and family join a fight against a member or kin, greed loots the fallen, ambition takes the scene's prize, pride answers an insult or a threat, curiosity watches. A plan given them overrides it.
- **A person's nature**, so every kind of person exists. Beside the motives, eleven personality axes, each from −2 to +2, and most people 0 on most: a person rolls two or three leans and sits at 0 on the rest, so you remember them by their leans (Old Sha: gregarious, a little vengeful, a little stingy, a gambler). ±1 reads softened ("a little hot-tempered"), ±2 plain, and an effect is half at ±1 and full at ±2. A role or power leans the roll (bandits cruel and ruthless, monks merciful and honest, merchants stingy and gregarious, sect elders arrogant), never fixes it. Named people have theirs written.

| Axis | − ↔ + | What it moves |
|---|---|---|
| Temper | calm ↔ hot-tempered | insult and face weigh ×0.5 to ×1.5; at +2 an insult or threat is answered with blows |
| Nerve | craven ↔ reckless | composure ×0.75 to ×1.25; the craven flee anyone at their realm (−2) or above it (−1); the reckless fight even what is beyond them |
| Honesty | honest ↔ deceitful | deceit weighs ×1.5 to ×0.5; how freely and how well they lie |
| Heart | cruel ↔ merciful | rescue weighs ×0.5 to ×1.5; the cruel finish the fallen, the merciful never do |
| Hand | stingy ↔ generous | payment weighs ×1.5 to ×0.75; a bargain's resistance ×1.5 to ×0.75 |
| Trust | guarded ↔ open | a first impression −10 to +10; a lie's resistance ×1.5 to ×0.5; at −2 always suspicious |
| Memory | forgiving ↔ vengeful | bad memories fade over ×0.5 to ×2 their span, good ones the other way round |
| Pride | humble ↔ arrogant | insult and face weigh ×0.75 to ×1.25; "beneath me" −5 or −10 while you show a lower realm; the humble never make a rival of a loss |
| Bearing | reticent ↔ gregarious | company and knowledge weigh ×0.5 to ×1.5; how freely they tell and how far your deeds spread through them |
| Conscience | ruthless ↔ righteous | the righteous feel "did evil, I hear" at ×0.5 and ×1 for deeds done to strangers |
| Fidelity | fickle ↔ loyal | how far a loyalty bond bends |

- **Quirks:** none, one, or now and then two discrete tags for what really is on or off: gambler (a wager meets them as a motive), drinker (a shared drink counts ×3), glutton (a shared meal ×2), superstitious (a talisman shown is proof), vain (flattery meets them as a motive), amorous (a confession's resistance ×0.5), chaste (×2, and gifts count half), pious (a promise kept counts ×2), collector, bookish (something new told counts ×2).
- **Likes are read from who they are, never rolled:** their quirks (wine, delicacies, talismans, incense, curios, books), their trade (a sword cultivator blades, an alchemist herbs, a ferryman wine), their strongest motives (greed jade, ambition manuals, curiosity curios, fear talismans) and their path (qi pills, body beast cores, soul incense); the first two count. A gift of a liked kind counts double, so a gift that suits someone says you know them.
- **What you know of them.** The outer leans, Temper, Bearing and Pride, and the quirks show at first meeting; the inner, Heart, Conscience, Fidelity and Memory, show only when they act on them or someone tells you; the rest when they come up, Nerve in danger, Hand in a bargain, Honesty once you catch a lie. A motive shows when they act on it or tell you. A like shows once you know what it comes from.
- **A voice each,** so the narrator can't make everyone sound alike: a register (courtly, plain, coarse, clipped or florid), a speech habit and what they keep coming back to, seeded from their leans, trade and region from pools and kept, so a person sounds the same each time. The narrator gets a nature as behaviour rather than adjectives, with the voice and their memories of you.
- **What an NPC knows** comes from their home, their trade and their power: the places round their home and along their trade, the people they have met, their power's affairs if they belong to it, and what they saw. Asked, they tell it as their opinion of you allows; a wary one holds back or lies. It is worked out, never stored, in three tiers: *common*, the places round their home that aren't hidden and the people of their place; *private*, their power's places and people, the kinds of site along their trade (a herbalist herb valleys, a hunter dens, a ferryman crossings) and who did the deeds they know of; *secret*, the hidden places tied to their home or power, the truths behind them and their tie to a backer. Asked and passed, they tell a tier at neutral or wary, two at friendly, all three at trusting, a tier more if gregarious (Bearing +2) and a tier less if reticent (−2), the wary never past the common. A deceitful one (Honesty +1 or more) who is wary or hostile lies: until the world can write false facts to tell, that means claiming to know nothing; an honest or plain hostile one refuses. What you're told is **heard, not known**: it lists who told you, its truth hidden, until you see it yourself, and a lie seen through lands as "lied to me, and I found out" and shows their Honesty. A faked death is a death deed that never happened, believed by whoever saw the decoy and spread by the same telling: nobody hunts someone they believe dead, until they see them alive and know the lie.
- **Ties.** What someone is to you, apart from how they feel about you: kin (a parent, child, sibling, spouse or cousin), master and disciple, senior and junior, superior, patron, guardian and ward, benefactor (a life-debt, made by saving a life), sworn siblings, friend, rival, enemy, sworn enemy (a blood feud), lover, betrothed, former lover, dao companion, follower, debtor, and a backer. Ripples go one step: kin, sworn siblings, lovers, the betrothed, dao companions, masters, disciples, guardians and wards take the "someone I love" rows, friends and members of the same power half of them, and nothing passes further, except that a sworn enemy's blood feud passes to their kin. Swearing brotherhood, a confession and a dao companion's oath are people checks at trusting; taking a disciple needs friendly and a realm above them; a never-fading memory weighing −80 or worse makes an enemy, killing someone they love a sworn enemy; a loss in a contest makes a rival of the proud but never the humble; a lover who falls to wary becomes a former lover. A tie is made by a deed (swearing brotherhood at trusting, taking a disciple, a grudge that never fades), and it acts: kin and sworn siblings avenge you, a master teaches, a rival comes back stronger, an enemy hunts you. Kept people hold ties to each other too, family, sect-mates, rivals and lovers, so a deed ripples: kill a man and his brother remembers it as "killed someone I love". The People screen's web draws them. **Romance needs nothing of its own:** courting is talk, gifts and time building their opinion of you, a lover's or a dao companion's tie is made by a deed at trusting (a confession, an oath), and their motives decide whether they would have you. Only paired cultivation, an hour cultivated together paying both, is a system of its own.
- **Bonds** are why a follower follows: pay, loyalty, fear or a shared goal, and your orders are verbs they carry out. The paid leave when the pay stops, the loyal when their opinion falls below friendly, and the afraid run or turn on you when you look weak or they are out of your reach. How they work:
  - A bond is made by **recruiting**, which names it: *pay* is a people check and a month's wage up front; *loyalty* needs friendly; a *shared goal* is a project you both work, met by ambition or revenge; *fear* runs the intimidation check in place of the people check, and is a threat they remember. The bond keeps the follower tie while it holds.
  - **Loyalty's floor** is set by Fidelity: the opinion they must keep is +40 at −2 (only trust holds the fickle), +25 at −1, +10 at 0 (the design's "below friendly"), −10 at +1, −40 at +2 (the loyal stay to hostile).
  - **Fear** runs the threat again each round of a scene, your presence counting at half below half HP; down, you scare nobody. A week out of your reach breaks it too.
  - **Leave or turn.** Most leave. The treacherous turn: Fidelity −2, or −1 with a cruel Heart or a hostile opinion of you; the afraid turn if reckless (Nerve +1 or more) or vengeful. In a scene a turncoat takes a side of their own and attacks you unless you are beyond them; away, they betray you (a deed, −20 karma) and tell what they know of your deeds to the power that hates you most.
  - **Orders** are steps they take on their own. Nobody takes an order beyond them, and the paid won't fight anyone they read above them; the loyal, the afraid and the goal-bound take the rest.
- **The lucky rogue.** One rogue in 50 has found something: one slot (a method, an art, a weapon or armor) rolled at the chosen's bias and at least gold, every other slot a rogue's. The generator names the find ("an inheritance in a collapsed cave") as a hook for the narrator, and a kept or named person pins it.
- **Origin people are roles.** A senior at the Gate, an aunt on the terraces: the world fills each role with whoever holds it that year, today's named people are only the first life's defaults, and a start's text and cards read the role, never the name.
- **Years between lives.** The next life is born on the day the last one dies and starts at 12, so the world has moved on twelve years and no childhood overlaps the life before.
- **Membership, thin for now:** you belong to a power, its token opens its gate, membership is a standing memory (+10 while you belong), and it gives you its region map. Seats, the currency, posts and what membership gives are under Organizations share one skeleton, above. Joining or leaving is its own effect, kept for anyone; the fog reads the map, and a start with a power behind it hands it out.
- **Backers and traces.** A **backer** is the "my father is…" tie: someone a realm or more above their charge, who makes the charge feel as safe as a sect would (×1.5 a realm above, ×2 two or more, not stacking with a sect's); threatened, the charge names them, and killing the charge lands on the backer as killing someone they love. One generated great-sect young master in 5 has one, two realms up. When the charge falls under a quarter of their HP, the backer's **projection** arrives: a third of the backer's lines for three turns, opening with "fellow daoist, give me some face". A **death talisman** is a trace: a great sect's (Core Formation) or a sacred land's (Nascent Soul) core disciples carry one as strong as their sect, or as their backer if that is stronger, and killing them marks the killer's face for that power, which learns who as a soul lamp with a face would. Its people who see that face undisguised attack, or call the law if the killer is past them. The trace lasts until it is **erased**: by a soul stronger than it, your soul against its strength as a check, which takes the Soul tree's Severing the Trace (Foundation, tier 2) for you and a Foundation soul for anyone else, or by a formation. Temples can't erase one.

Intimate scenes fade to black by default. A mature setting is opt-in, sits behind an age check, and only works with hosts whose rules allow it.

Three moments carry the genre and get special treatment:

- **Tribulations**: multi-wave lightning fights against Heaven, from Nascent Soul up. Preparation decides most of it: protective formations, artifacts, pills and a tempered body. Failure means grave injury or death.
- **Heart demons**: before a major breakthrough, you face an illusion built from your own chronicle, such as an enemy you killed or a promise you broke, played as a go-in scene. GLM writes it when a key is set, and a templated trial from the same entries stands in otherwise. A Soul check plus how you answer decides it. This is where AI personalization pays off most.
- **Death and rebirth** (the prestige loop): when a life ends, you reincarnate with fresh talent rolls and part of your insight and karma. The world moves on but remembers your old cave abode, your disciples and your killers.

## Idle production and automation

Idle production is earned in the world. A line runs only while it has a source, a worker and an outlet, and you win all three by going in.

| Link | Examples | How you get it |
|---|---|---|
| Source | a spirit garden, a beast farm, a mine share, sect stores, standing market orders | buy or win land, tame beasts, take a sect post, live near a market |
| Worker | you, in the hours of your day, then disciples, hired hands, puppets, formations | recruit disciples, hire in town, refine puppets, lay arrays |
| Outlet | your own breakthroughs, a shop or consignment house, sect quotas, auctions | own a shop, sign with a merchant guild, hold a sect post |

**Posts bundle all three links**, with duties attached:

- Herb garden keeper: sect plots and junior disciples, against a harvest quota.
- Alchemy Hall head: the sect's herbs, furnaces and apprentices. You keep a cut of every batch and answer for the failures.
- Formation Hall master: the sect's arrays and materials; repairs after an attack come first.
- Shop owner in a market town: no sect needed, but you buy your own inputs and pay your own guards.
- Your own sect, later: every hall is yours, and so is every problem.

**Where you live matters.** An abode is a site with four properties: its spirit vein's tier, which sets who can be kept there and what its arrays hold (`vein`, The world map, The atlas as data); its defenses, which decide who can raid you; its market reach; and its neighbors. Reach is how far your goods and your news travel: which markets your standing orders can use, what price you get, since distance adds courier fees and risk, how fast a line's outputs sell, what the steward can source and how soon rumors reach you. It cuts both ways, since a market at the door means thieves and taxes and a remote cave means beasts and no help.

| Abode | Spirit vein | Defenses | Market reach | Neighbors |
|---|---|---|---|---|
| A wild cave | what you find, poor to fair | the rock | none; a caravan passes once a season | beasts, hermits, bandits |
| A sect cave, outer or inner | by rank | the sect's arrays | the sect shop; a town a day off | fellow disciples, your senior, rivals |
| A rented room in a cultivation market | thin | the market's guards | everything, at fees | merchants and every rumor |
| A city estate, rented or bought | fair | the city's arrays and your own guards | most, a day off | patrons, nobles, the sect's branch |
| A flying boat, from Core Formation | its own small array | its formations | wherever you park | your crew |
| A spatial cave abode, after v1 | the best | its own world | none, until you step out | nobody |

Rent is a seasonal fee; a sect cave is free with duties; a wild cave is free with risk. Moving a static abode is a trip: your bag and ring go with you and the rest stays in the abode's own store until you fetch it, hire a cart or pay a caravan, with robbery on the road as the risk. A mobile abode carries its store. A line that needs a market stalls when none is in reach.

**Automation grows in four steps:**

1. You queue crafts yourself, spending hours of your day on them.
2. A disciple or hired hand runs a queue, at lower quality than you.
3. Standing orders buy inputs and sell outputs at a reachable market, within price limits you set.
4. A full chain, garden to furnace to shop, runs while you wander, as long as every link holds.

**The world pushes back:** prices swing with events, so a border war doubles healing-pill prices. Gardens draw thieves unless formations guard them, and disciples have loyalties of their own. When a link breaks, the line stalls until you fix it.

When you come back, a short steward's report sums up the engine's ledger, as templated lines the Scribe rewrites as prose when a key is set: "The garden yielded 40 Jade Dew Grass. Disciple Lin brewed 12 Qi-Gathering Pills; 2 batches failed. Healing pills doubled in the Jing Capital after the border clash."

An example chain: as Alchemy Hall head of Apricot Grove Valley, you draw the sect's herbs and two apprentices brew Qi-Gathering Pills. The sect keeps 70% for its quota, and your 30% sells through a consignment house in the Jing Capital while you're in seclusion.

## Economy

Spirit stones are money and fuel at once, sect contribution is each sect's own currency, and progress splits about half from the world and half from seclusion. The balance sims hold that split: with gate items supplied, playing only one half should take about twice as long.

**Money** is spirit stones, and each grade is worth 1,000 of the one below:

| Grade | Worth | Used mostly at |
|---|---|---|
| Low | the base unit | Qi Condensation, Foundation Establishment |
| Mid | 1,000 low | Core Formation |
| High | 1,000 mid, a million low | Nascent Soul, Deity Transformation |
| Top | 1,000 high, a billion low | Void Refinement and up |

Stones are also fuel: you can absorb them for qi or burn them to power arrays, so wealth and power are the same thing. Mortals trade in silver and gold, and one low-grade stone is a small fortune to them.

**Stones, silver and shops in play.**

- **Each grade is held as its own count** and shown as such ("3 mid · 240 low"), a price reading in the largest grade that reads cleanly ("2.4 mid"). A price is a worth in low-grade stones, read in whatever grade it is posted in.
- **Changing grades always costs, both ways:** a higher stone is purer and does more for a higher cultivator, so 1,200 of a grade buy one of the next, and a price in a higher grade paid in a lower one costs the same premium; one stone breaks into 1,100 of the grade below, at a money changer or a shop making change. A round trip loses about 8%, so no loop pays.
- **Everything you pay, you pay one way:** whole stones of the price's posted grade first, then the grades below at the premium a step, then a higher stone broken for change. Shops, tolls, a follower's wages and recruiting, a method's upkeep, a card's cost, fees, repairs, guides and passage all pay so; none reads the low-grade count alone.
- **What you are paid arrives as the payer counts it:** whole stones of the largest grade the sum reads in, never above the payer's own grade, and the rest in the grades below. A shop's or a power's grade is its vein's (a place on no vein deals in low), a person's is their realm's, and a mortal pays in silver. So a village on a tier 1 vein pays a big sale all in low, and a Core Formation elder's purse holds mid.
- **Silver is the mortal purse.** A low-grade stone is worth 100 taels on the yardstick; inns, ferries, food and mortal shops deal in silver and can't make change for a stone, so a town's money changer breaks one into 110 taels, and 120 taels buy one back.
- **Shops** follow the loot and shop rules (Items and gear) and draw on the catalogs (Catalogs by place). The kinds, each standing in its district (What a market holds, Districts and shops): a stall in the free market (which also buys pills and talismans, E2), an alchemy shop on Pill Street, a refiner on Refiners' Row (gear, and repairs), a talisman shop in Talisman Lane, a part dealer in the beast-part market, a sect shop for its members, a trading house (商行, the big general firm that carries goods from region to region, E5's name for the merchant guild), a black market (better rolls, prices half again, imports first, and it never asks whose a thing was), the bounty office and a mortal shop in silver, which buys the mortal staples (Trading yourself). Stock refreshes monthly; they buy from you at 40% of their own price, 60% once you are friendly with the keeper or favored by their power, and a black market at 30%, the price of not asking; any but the black market pays 80% for what its market needs (Supply and prices, below); haggling is a people check once a visit, 20% off on a clear pass and 10% on a close one, and the keeper remembers being pressed on a short one; a stolen thing sold to its owner's own power is recognized, which is evidence and heat; and a place's money is finite, so a village can't buy a sack of cores.
- **Loot sells** at posted rates: cores and beast parts to the bounty office (50%, never haggled), alchemy shops and refiners, and bounties pay on proof.
- **Your stall:** you set the prices, a customer buys at or under what their wants say a thing is worth, regulars become people the world keeps, and the stall's hours on your wheel go on selling while you are idle.

**Prosperity.** The vein says how high a market reaches, prosperity how much of it there is.

- **One job each.** A place's vein sets the grade its market pays in and the highest tier its shops may stock; its prosperity (`prosperity`, 1 to 9, ruined to golden; The world map, The atlas as data) sets how full that market is: its purses, its lots and its wages. Prosperity never caps or lifts the vein: a golden village on a tier 1 vein is a full tier 1 market.
- **Whose it is.** A shop reads its place's prosperity; a sect shop reads its power's, so a sect's wealth shows in its own shop wherever it stands.
- **What moves it.** Effects only: `prosperity ±n` on a place or a power is one of the resolver's effects (The resolver, What lasts), so any deed or event can name it; war drains it and trade raises it once the living world runs them. A place eases back a step a year toward its written value, and the save keeps only the places that differ from it.
- **Seen in play.** The place screen's head names it: a lean town, a thriving city.

**What a market holds.** A place's shops together are its market. Who lives there says how many shops it keeps, how high they reach and how deep it is (Shops by people, below), and prosperity sizes three things in it:

| Prosperity | Purse | Lots | Wages |
|---|---|---|---|
| 1 ruined | ×0.25 | ×0.5 | ×0.6 |
| 2 poor | ×0.4 | ×0.6 | ×0.7 |
| 3 lean | ×0.6 | ×0.75 | ×0.8 |
| 4 modest | ×0.8 | ×0.9 | ×0.9 |
| 5 ordinary | ×1 | ×1 | ×1 |
| 6 thriving | ×1.3 | ×1.15 | ×1.1 |
| 7 rich | ×1.7 | ×1.3 | ×1.2 |
| 8 flourishing | ×2.2 | ×1.5 | ×1.3 |
| 9 golden | ×3 | ×1.75 | ×1.4 |

- **A shop's purse** is the money it has each month to buy from you; once it is spent, the shop buys nothing more until the month turns and it refills. It comes from what its market's people earn (E4): a month of each cultivator's wages at their realm and its prosperity, counting only the realms whose tier the market stocks (a Nascent Soul's spending doesn't pass through tier 3 shops), half of which passes through its shops, paid out in its market's grade. Since E5 that money is its doors' (Districts and shops, below): the bounty office 0.3 of it, a black market 0.3, a trading house 0.2 (two share it), Pill Street 0.2, Refiners' Row 0.15, Talisman Lane, the beast-part market and the free market 0.05 each, a missing district's share going to the free market where the market grows its own shops, and the shares present scaled to the whole; and a district's purse is split among its shops as its stock is, a shop 1 and a notable shop 3, the small shops sharing the rest as the street's deep pocket. A sect's hall reads its power's members. The mortals' money is a month of what they buy, their basket's worth (about 0.2 taels a head at ordinary), not half their earnings, since a farmer eats what he grows. So the City's bounty office holds about 48 mid, the Qian Clan's hall 32, Pill Street 32, of which Apricot Grove's branch can pay out about 3 and Old Liu about 2.5, a stall in the free market about 100 low, and its biggest grain store about 29,000 taels. The City's eight Core Formation cultivators earn about 65 mid a month between them, so a tier 3 piece of 12 mid sells to the bounty office or the Qians' hall, or a street's small shops, and a run of them waits for the auctions. A purse never limits what a shop sells you; its shelves do.
- **Lots** are the few display lots a notable shop rolls (Districts and shops, Shelves, below): its kind's lots times prosperity, rounded, never under one. Its common goods stand on the shelf by the count instead.
- **Districts and shops** (E5, after the play checkpoint found a door was one keeper with a few sampled lots: the 坊市, a market quarter of streets named by what they sell). The stock lives in the market and a shop is a window onto it: city → district → shop.
  - **A door is a district**, named by what it sells, and its pool is its market's goods of those wares at the tiers the market stocks. Catalog lines stop choosing shop kinds: a line's `shops` marks only its exceptions (none, loot only; only `sect`, a power's own; only `black-market`, contraband), and everything else is the market's, stocked by the district that sells its ware. A ware with no district of its own at a market falls to the free market, so Pacified Fort's talismans sell on stalls and the City's in Talisman Lane.

    | District | Sells | Its shops | Opens from |
    |---|---|---|---|
    | The free market 散市 | copies, and every ware with no district of its own here | stalls | 100 cultivators, or a written stall |
    | Pill Street 丹街 | pills, herbs | alchemy shops | 500 cultivators |
    | Refiners' Row 器街 | gear, treasures, ore; mending | refiners | 500 |
    | Talisman Lane 符巷 | talismans, ink, array blanks | talisman shops | 2,500 |
    | The beast-part market 兽市 | beast parts, cores, hides, horn | part dealers | 2,500 |
    | The grain and cloth market 粮布市 | mortal goods, in taels | mortal shops | 100,000 mortals |
    | A trading house 商行 | everything, imports counted double | one firm, a door of its own | 1,000 (one each 5,000, at most two) |
    | The bounty office 赏榜 | buys parts and cores at posted rates | one | 1,000 |
    | A black market, a sect's hall | as before | written only | |

    So the City of the Guarded Mouth has eight doors (the free market, Pill Street, Refiners' Row, Talisman Lane, the beast-part market, the Qian Clan's trading hall, the bounty office, and the grain and cloth market), as has Thousand Paddocks; the Nameless Market seven; Pacified Fort, River-Bend, Heaven's Eye and Ebb Harbor six; Sinkhole Terraces four; Corral Town three; Grain Ford, the Foot of the Wall and the Night Bridge two; Spear-Plow and each sect one. A power's seat keeps just its own, and who keeps a black market or a hall is a power's business, not a crowd's.
  - **How many shops a district really has**, so a scene can seed any of them: a stall each 25 cultivators, an alchemy shop or a refiner each 200, a talisman shop or a part dealer each 400, a mortal shop each 50,000 mortals. The City has about 216 stalls, 27 alchemy shops and 13 talisman shops; Grain Ford 6 stalls and 12 stores.
  - **What a district lists:** up to three notable shops, its written ones first and then the biggest, seeded from the district, and "the small shops" as one counter for the rest; three or fewer it lists whole. A power's written shop is a notable shop in its district, so Apricot Grove's branch is Pill Street's first. Every written town and atlas city keeps a market this way.
  - **Shelves.** Every good in the monthly sum (People make and use) that a district sells stands on its shelves all month, at its line's lowest rarity and each tier the market stocks. The district has on hand a tenth of its market's month of use of it, about three days' trade, times its supply ÷ 100, fixed as the month opens. A trading house takes a fifth of every good it sells off the top (two fifths of an import), and the rest is split among the district's shops, a shop counting 1 and a notable shop 3. A notable shop carries each good on an even chance seeded by its id, at twice its share, so the totals hold; the small shops carry everything. So the City's Pill Street has about 500 Qi-Gathering Pills on hand (7,500 used a month, at 67%), the Qians' hall a fifth of them, Apricot Grove's branch about 40 and the small shops about 320; a healing pill about 30 at a notable shop; a notable grain store about 9,500 sacks of millet and the small shops half a million, since 8 million mortals eat 6.4 million a month; a notable shop always carries its district's biggest good, so a grain store its grain; the Foot of the Wall's two stalls about 5 healing pills each.
  - **Display lots.** The better rarities and what the sum doesn't count (gear above wear, treasures, coveted things, mounts, the gold and red list) roll as before: a notable shop shows its kind's lots times prosperity's (Lots, above) at its kind's bias, a trading house eight, the free market's stalls copies and odd lots; the small shops none. A black market and a sect's hall keep their rolled stock and their hall's staples whole until organizations. The menu shows only a shop's front: a back room, the rare lot a keeper brings out, is seeded from the shop when you go in (P3.9).
  - **Buying draws on the pool.** You buy one, ten or a Bag square at a time; the shop's count falls by what you bought from it this month and its market's supply by the same, so every shop's price there climbs. Counts reset as the month turns, and what you sell raises supply but stands on no shelf until then.
  - **Owners.** A shop names its atlas power where it has one (Apricot Grove's branch, the Qian Clan's trading hall, the Night Bridge's sea-cave market); every other keeper is independent, texture rather than a power, and refiners are mostly lone masters, as in the novels. Merchant guilds as powers wait for the organizations layer, which keeps every faction; until then nothing is "the merchant guild": the guild kind is a trading house (商行), and one without an atlas owner is named for its family (the Zhou trading house).
  - **Names.** A district's door reads its kind's name (Pill Street), and a market may write its own as data. A notable shop is named for its keeper or keeping family, a pinyin name seeded by the shop's id with its kind's noun: Old Liu's furnace house, the Hu family pill shop, Master Gu's refinery, an ink house, a bone-and-hide house, a grain store, Granny Bai's mat in the free market. Written shops keep their written names. The keeper is someone the world keeps from your first haggle, named for the shop, with a nature seeded by it.
- **Tiers** follow who lives there (E2.2): a market's shops stock tier 3 where a Core Formation cultivator lives, tier 2 where twenty Foundation cultivators do, tier 1 otherwise, within its place's vein, never above it (a place on no vein stocks tier 1 at most), and a stall's wares stop at tier 2 and a mortal shop's at mortal goods. So Pacified Fort's 120 Foundation officers make it a tier 2 market, and Corral Town's ten don't. A pill, a talisman or a beast part comes at any tier the shop stocks, since it takes its maker's or its beast's; a gate pill, a hiding talisman and a mortal good keep their own.
- **Higher tiers are rare on a shelf** (Jan's call in E2's talk, for every region), as the realms above are few: a lot weighs a tenth for each tier it stands above Foundation's, and a tenth more when its maker raised it above its written tier, and a good made here weighs a step less, since that place makes it as a matter of course. In the Border Wilds, two tier 4 veins (the City, the Gate) and eight tier 3 ones for about thirty Core Formation cultivators, every shop but a stall or a store stocks tier 3 where a Core Formation cultivator lives on a tier 3 vein or better (the City, the Gate, the Night Bridge, Thousand Paddocks, the Nameless Market, the Hundred Reins and the Pavilion of Bound Bones), and each shows three to five tier 3 lots a year; nobody stocks tier 4, which three Nascent Souls don't make a market for.
- **Wages:** a day's work is 1 low-grade stone times the realm curve times prosperity's wages, so at an ordinary place Qi Condensation earns 1 low, Foundation 9, Core Formation 270 and Nascent Soul 27,000; mortal work pays in taels the same way, a laborer 0.1 tael at ordinary. Jobs, posts and hires read it.
- **A vein yields** 1,000 low-grade stones' worth a month times the realm curve at its tier, in its own grade, to whoever holds it: 1,000 low at tier 1, 9,000 low at tier 2, 270 mid at tier 3, 27 high at tier 4. Prosperity doesn't touch it, since a vein is rock, not trade. A power's treasury and an abode on a vein read it.

**Supply and prices.** A market keeps a supply of each good, 25% to 200%, and its price follows it.

- **A market needs what it can't get.** A good's written supply comes from the catalogs, seen from the market, so rarity between regions is geography and needs no table of its own:

| The good, seen from this market | Supply | Price |
|---|---|---|
| Made here: its place's own catalog | 150% | ×0.8 |
| From a market in its reach, or its region's or continent's layer | 100% | ×1, and ×1.1 for the road from a market in reach |
| Imported along a tie | 100% | ×1.2 for the road |
| Written as one of its needs, or in none of its layers | 50% | ×1.4 |

  A market writes two to four needs, as item kinds or tags (the Wall of Piled Bones: healing pills and talismans); a tag is what a thing does as well as what it is written with: `healing`, `qi-restoring`, `qi-fuel`, `body-fuel`, `soul-fuel`, `detox`, `weapon`, `armor`, `hiding`, `coveted`, and a staple's kind: `grain`, `salt`, `hide`, `horn`, `wool`, `oil`, `ore`, `bone-meal` (E3). A good's supply is kept by its written thing and its tier, so rarities share one and a tier 3 pill keeps its own. A thing above every tier a market stocks is in none of its layers, so it is wanted there, but only a purse that can hold it buys it: a Foundation pill sells in the City, not at the Wall's stall. Medicine Ridges herbs are made in the Ridges, an import in the Border Wilds and scarce where no tie reaches.
- **Coveted things are needed everywhere.** What raises talent, aptitude, a root, lifespan or a breakthrough's odds carries the `coveted` tag (the Foundation Pill, marrow and root washing, a lifespan pill): every market needs it, and where it is made it stands at 100%, since no maker keeps up. In E2 the four gate pills and the Thousand-Year Ginseng carry it; the lesser offerings (calm-heart grass, a storm-peach stone) are ordinary goods. A region's dearer or cheaper written price is this, said by tags: the Border Wilds want the Foundation Pill because it is coveted, and the Gate's Marrow-Washing Pill is cheap there because the Gate makes it.
- **The price** is the posted price times √(100 ÷ supply): ×2 at 25%, ×1.4 at 50%, ×1 at 100%, ×0.8 at 150%, ×0.7 at 200%, and the road's share on top. **A market buys what it needs at 80% of that price**, whatever the good; everything else sells at the shop's rate (40%, 60%), and a black market pays its 30% for anything, the price of not asking. So loot is worth carrying to where it is wanted. A market needs a good while it is written at half supply (a need, a coveted thing, or in none of its layers) and still stands under 100%; once filled, it pays the shop's rate. **No loop pays** (found by a trade check after E5): no shop offers more for a thing than the cheapest it is on sale for in the same market, so nothing bought from one keeper sells back to the next for more, and a keeper won't haggle over what the market is short of at rest (a good resting under 100%), while for anything else the cap sits a full haggle under that price.
- **What moves it.** Each lot you sell a market raises its supply of that thing, and each lot you buy lowers it, by the good's depth, divided by prosperity's lots and by the market's size, so a bigger market moves less (a lot is as many as its catalog line comes in, at the middle of its range). A market's size is log10 of its cultivators ÷ 50, ×0.5 under about 150 to ×2 at 5,000 and up (E2.2): the Foot of the Wall's sixty move twice as far as an ordinary market, Pacified Fort's 1,620 about two thirds as far, and the City takes a Bag at half the move:

| Good | Supply a lot | So |
|---|---|---|
| Staples, the `trade` tag | 2 points | a haul of about fifteen lots pays |
| Pills, talismans, herbs, parts and gear, white to blue | 10 points | a few lots fill a need |
| Purple and up, and treasures | 25 points | one sale fills a need for months |

  Ten lots of herbs sold where an ordinary market needs them take it from 50% to 150%, and the price from ×1.4 to ×0.8 (the City takes twenty): with the purse, that is why a village can't buy a sack of cores.
- **It eases back** a tenth of the way to its written supply each month, and the save keeps only the goods off theirs; the goods a basket, a pressure or a maker uses rest where the monthly sum says instead (People make and use, below), and this table is where they come to rest. The later layers' caravans and guilds move these same supplies from market to market, so trade between powers is supply carried, not new prices.

**People make and use** (E4; the review after E2.2, Jan's call: people make things, people use things up, and the gap is the price). Once a month each market adds up what its people make, what they use and what is carried in, and its supplies move by it: arithmetic per market, never simulated shoppers.

- **Who lives there** is a place's population read through the world: its written value plus an offset the save keeps, as prosperity is, so a place that grows or empties moves its shops, tiers, baskets and making with it (Still to design, Lasting changes to places). E4 sets no offsets.
- **Needs** are the tags goods already carry (Supply and prices), and a need is filled at its people's own level: mortals by mortal goods in taels, cultivators by goods at their realm's tier, so grain is millet to a farmer and spirit rice to a Qi Condensation cultivator.
- **The monthly basket**, in pieces a head:

| Need | Mortal | Qi Condensation (tier 1) | Foundation (tier 2) | Core Formation (tier 3) |
|---|---|---|---|---|
| grain | 0.8 sack | 2 sacks of spirit rice | 1, as fasting begins | none, fasting |
| salt | 0.05 | | | |
| oil | 0.1 jar | | | |
| cloth (wool or hide) | 0.02 bale | | | |
| qi-fuel | | 2 | 2 | 2 |
| qi-restoring | | 1 | 1 | 1 |
| healing | | 1 | 1 | 1 |
| talisman | | 1 | 1 | 1 |
| detox | | 0.2 | 0.2 | 0.2 |
| body-fuel, soul-fuel | | 0.3, 0.2: few walk those paths | the same | the same |
| weapon, armor | | 0.03 each, a piece every three years or so | the same | the same |

  Prosperity scales a basket by its wages (×0.6 ruined to ×1.4 golden), since the rich use more, and a need's use is shared evenly among the goods that fill it at that market, so a market whose layers hold three healing pills uses a third of its healing from each. On the realm curve a Qi Condensation basket costs about 23 low a month of the 30 earned and a Foundation one about 200 of 270, nearly everything, as the novels' cultivators spend it; a mortal's costs about 0.2 taels of the 3 earned. So the City's 5,000 Qi Condensation cultivators use about 5,000 healing pills a month and Pacified Fort's 1.5 million farmers 1.2 million sacks of millet, which is why a Bag barely moves a city and a village of forty cultivators floods after two lots.

- **Pressures** turn parts of a basket up. A market's written needs (Supply and prices) are its pressures: each doubles its need's use and keeps its written reason, which the place screen shows ("the cadet school eats gathering pills faster than the sutler stocks them"). Two come from the atlas unwritten: marsh or jungle land doubles detox, and thin qi (a density of 3 or less) raises qi-fuel by half, which is the whole Border Wilds. Pressures multiply, at most ×3: Pacified Fort's written qi-fuel and the region's thin qi make ×3. A mortal good is pressed only by its staple's own need (grain, salt), never by a cultivator's kind, so the City's makers' `material` leaves its millet alone (E4).
- **What makers use**, one step deep: each piece a place makes uses its inputs that month, so making pulls on the land.

| Made | Uses, a piece |
|---|---|
| a pill | 1 herb of its tier |
| a talisman | 1 material (paper, cinnabar ink) |
| a weapon or armor | 5 ore |
| a sack of spirit grain | 0.1 sack of bone meal, for the spirit fields |

  These are defaults by family, and a catalog line may write its own (the City's refiners cut thunderhorn for grips, so their blades use a horn each). Inputs use nothing: herbs are picked, ore dug, horn cut. A pressure on an input doubles what the makers use of it.
- **Needs the sum doesn't count** stay as written, at 50%: mounts, carts and a herd's beast-part feed (Spear-Plow, Corral Town, the Hundred Reins) are a place's habits, as coveted things are needed everywhere, not baskets.

- **Making.** A place makes its own catalog's goods (its place's and its kingdom's, as since E2.1) and what its land gives: a herb, material or staple line may name the land that yields it (`land`, and `landVein` for jade), and every market on that land in its catalog's region makes it unwritten (a continent's line: anywhere on the continent), its vein capping the tier (a tier 1 vein digs tier 1 ore). Since the Border Wilds' goods are written on place lines, E4 tags those: the March's grain on plains, Stone Eyes' glow-caps and lamp oil in karst, the Broken Tide's salt on coasts, isles and desert, the City's pearls on coasts and isles, the Herders' horn and wool and the Gate's hides on steppe, and the continent's root-binding jade in hills and mountains on a vein of 2 or more. The land feeds the sum only: what a shop stocks is still its catalogs and its reach. The guide the land tags are drafted from:

| Land | Gives |
|---|---|
| plains, river plains | grain |
| hills, mountains | ore; jade on a vein of tier 2 or more |
| forest, jungle | herbs, spirit wood |
| marsh | herbs (the poisonous ones), reed |
| coast, islands | salt, pearls |
| steppe | hides, horn, wool |
| karst | cave herbs, lamp oil from the bat roosts |
| volcanic | fire ore, sulfur |
| desert | salt, sand jade |
| ice, tundra | furs |

  A maker makes half again what its own people use, its makers' inputs counted as use, so a good rests at 150% where it is made; one its own people don't use it makes at half again what the markets in its reach use, and it stands at the 200% cap there (the Gate's bone meal). Beast parts and cores come from hunting, yours and the bounty office's, and keep the written supply until the living world's hunters.
- **Harvests.** Grain is reaped in autumn and herbs picked through spring and summer, at the same yearly total: a seasonal good is made at ×1.4 just after its harvest, falling to ×0.6 just before the next, as granaries fill and empty. Grain counts from autumn's middle month and herbs from midsummer, and what is carried in follows its makers' harvest. So rice runs about ×0.7 at a maker after the harvest and about ×1 by spring, and where it is needed climbs from ×1.2 toward ×2 before the next: hauling rice has a season, bought in autumn and sold in spring.

- **The monthly sum.** A good in the sum rests at a market at 100 × (made + carried in) ÷ used, within 25% and 200%. Markets in its reach that make it carry in up to its unpressured use at ×1.1, an import along a tie the same at ×1.2, and a line of its region's or continent's catalog the same by that wider land's own trade (E4: the Qi-Gathering Pill, which no Border Wilds place writes), unseen until guild trade gives them caravans; a market that makes a good carries none of it in. So the written table falls out of it: made here 150% (×0.8), from reach or a tie unpressured 100%, from reach where a pressure doubles it 50% (×1.4, the Wall's healing), and a basket good from nowhere 25% (×2). Each month a supply moves a third of the way to its rest, so a market flooded or emptied is mostly back in about six months, with the harvest's swing on top; the save keeps only the goods off their rest.
- **How far a lot moves it**, for a good in the sum: 100 × the lot's pieces ÷ that market's month of use of it, at most the table's points (2, 10, 25), in place of the market's size. The City's healing pills, used about 10,000 a month across its three healing goods, move about 0.1 points a lot of three; the Foot of the Wall's, about 100 a month and one good, move about 3 a lot, so about fifty pills fill its need (E4: the design's "two lots" counted lots of about ten, and the cap of 10 points a lot holds two lots under 20 either way); spirit rice at Sinkhole Terraces, about 1,900 sacks a month, moves about 10 points for a full Bag, so a haul's margin holds for the trip. Goods outside the sum (gear above wear, treasures, coveted things, copies, mounts) keep the written supply, the table and the market's size.

- **The guards**, from what sank other games' economies:
  - **No agents.** The sum is arithmetic per market; named people live their own lives in the living world, and nobody simulates a shopper.
  - **One line of why.** The place screen names a market's biggest gap and its cause, made from the sum's own terms: "Grain runs short: the terraces eat more than they grow, and the March is far", "Frontier millet is cheap: Grain Ford grows half again what it eats", or a pressure's written reason ("Gathering pills run short: the cadet school eats them faster than the sutler stocks them, on thin qi"). A shortage of a written need comes first, the biggest by worth (pieces short times their price); otherwise the biggest gap by worth, a shortage or a surplus (E4). So Sinkhole Terraces' line names its gathering pills, pressed ×3, before its grain. A price you can't explain is a bug.
  - **Partial steps.** A supply moves a third of the way a month and prosperity a step a year, so a shortage never spirals.
  - **The haul keeps its mark**, about one and a half times the wages for its days (`npm run sim -- haul`), and the stones sim counts what the world mints and drains (What the balance sims measure).
  - **Prosperity doesn't drift with trade yet.** "Sold its surplus" can't be measured honestly until guild trade moves goods; war and deeds still move it as effects.

**Trading yourself.** Staples are the bulk end of the kinds that already exist, sold by the lot: salt, spirit rice, hides, horn, ore, lamp oil, common herbs, each marked `trade` on its catalog line and tiered like anything else, so a Foundation trader hauls tier 2 ore; mortal staples trade in taels, real money to a child of twelve and small change by Qi Condensation. Bought where they are made at ×0.8 and sold where they are needed at 80% of ×1.4, a lot clears about 38%, less as both supplies move. The mark: a full Bag of ten lots carried across a kingdom pays about one and a half times the wages for the same days (Pacified Fort to Sinkhole Terraces, 11,245 li by road or 47 days at a fresh life's walk, earns about 74 low over 47 of wages; `npm run sim -- haul`). What bounds it is already built: the Bag's squares, a hand cart or a ring, the tolls on the road, the road's encounters (a robbery takes what you carry), and the need itself, which pays only the shop's rate once you have filled it.

- **A lot is a Bag square** (E3's talk): twenty sacks, bales or jars, a staple stacking twenty to a square, so a full Bag is ten lots. A tier 1 spirit staple is about a low-grade stone a piece (spirit rice 0.9, the dearest thunderhorn 3), a mortal one a tenth of a tael (millet 0.09), sized so the haul makes the mark in both seasons (E5: spring's 1.66× and autumn's 1.44×, once a district's many shops bid for a Bag; rice was 0.95 in E4).
- **Staples stand on the shelf by the count** (E5, Districts and shops, Shelves): wherever the monthly sum counts a staple, made there or carried in, its district stands a tenth of a month's use of it, at each tier it stocks, and you buy a Bag square at a time while it lasts, each dearer than the last as the supply falls. A sect's hall still stands the staples its place makes without end (the Gate's hides and bone meal).
- **Everything sells lot by lot:** each lot raises the market's supply before the next is priced, so a sack of cores sold at once fetches what it would sold a lot at a time.
- **Mortal staples go to the mortal shop**, which buys them in taels out of half its mortals' earnings (E4; a hundred taels a month in E3); no cultivator's shop deals in mortal goods, and a mortal shop in nothing else.
- **The Border Wilds' ten** (E3, for Jan's review), each where it is made and the markets that need it: the March's spirit rice (Sinkhole Terraces, the Foot of the Wall) and millet (Ebb Harbor, Sinkhole Terraces); the Gate's tanned hides (Corral Town, by its beast parts) and bone meal (Pacified Fort's spirit fields); the Herders' thunderhorn (the City's refiners) and cloud-goat wool (River-Bend's levy); Stone Eyes' bat-fat lamp oil (Thousand Paddocks); the Broken Tide's sea salt out of Ebb Harbor (Corral Town, Heaven's Eye); and Red Rocks iron ore and Medicine Ridges bitterroot as imports (the City, by its materials and herbs).

**Methods in the market.** Jade slips copy easily, so a method's worth is that others haven't got it, as the novels have it: common methods sell in any market, the best are a sect's and an auction's, and a sect hunts its leaks.

- **A book or a slip.** A tier 1 manual is a bound book or a scroll, copied by hand; from tier 2 up it is a jade slip, read and copied by divine sense. Only a slip can be sealed.
- **Common methods are cheap.** White to blue copies sell like any good, by supply.
- **A found method spreads once sold.** A market that buys a copy copies it and sells it from then on, made there and lent through its reach, so you are paid its scarce price once, 80% of ×1.4, and the method turns common: the loose cultivator's quick money. From the next month it stands on its market's stalls and guild halls, at the tiers each stocks, and on those of every market its own reach takes in, so a method sold at the City is on Corral Town's shelf too (E3).
- **A power's methods are guarded.** A copy of a power's own method is recognized as stolen goods are: an honest shop refuses it, a sale the power learns of is heat and standing with it, and the black market takes it at 30% without asking and lets it leak. How a power hears of a leak and hunts it is under Professions, people and powers, Guarded methods. A power's own is a copy only its hall stocks in the catalogs (the Gate's Butcher Saber; not Stone-Bearing, which a guild hall carries too). Offered at that hall it is evidence, heat +2 and "offered one of our methods for sale" on its standing; the leak stands on that black market's shelf alone and is never lent (E3).
- **Sealed slips.** A slip at gold and up, and any written as sealed (禁制), can't be copied: it fades after its readings or breaks once read, and sells as itself, one piece at 25 points. An inheritance is never sold, since it passes to one heir.
- **Fragments.** A market sells a style's opening chapters, its first two (Qi Condensation's and Foundation's; E3's talk); the later chapters are a sect's for contribution, a ruin's, or an auction's, so a market neither stocks nor copies them, and one sold to it is bought once, as a sealed slip is.
- **On the card.** A copy names its form: a bound book, a jade slip, or a sealed jade slip.

**Markets by reach.** A market draws on the markets around it, as far as its kind reaches, in a straight line: a village only its own goods; a town or a power's seat 15,000 li, about a kingdom and its edges; a city 30,000 li, about half a region. So in the Border Wilds, where each kingdom's seat stands a few thousand li from its written town (E2.1), Pacified Fort reaches River-Bend City, Heaven's Eye, the Beast-Butcher Gate, Sinkhole Terraces and Spear-Plow Village; Corral Town reaches Thousand Paddocks, the Hundred Reins Sect, Ebb Harbor, the Pavilion of Bound Bones and the Foot of the Wall; the Nameless Market, far down the Southern Karst, only the March (River-Bend, Pacified Fort, Spear-Plow); and the City of the Guarded Mouth half the region, from the Lamp-Keeper Sect at 9,800 li to Spear-Plow Village at 29,500.

- **On the shelf.** Each market in reach lends its place catalog as its own shops stock it (no loot-only line, and no method's copy, which is Methods in the market's), the lot sharing 15 of the place weight between them beside the market's own 50 (Catalogs by place), at ×1.1 for the road and 100% supply, since it isn't made here: the City's stalls carry a little of the Gate's sabers and the Herders' horn, and a village sells only its own. A lent lot goes to the shops that sell its kind of thing anywhere, so the Gate's sabers, sold at home only in its exchange hall, reach the City's stall, refiner and guild hall. A sect shop stocks only its power's, and a black market already takes imports first, so neither borrows.
- **For later.** Reach is also how far a market's prices and news carry: standing orders, your stall's customers and the living world's rumors read it.

**Price yardstick.**

| What | Price |
|---|---|
| Mortal money | a farm family lives on about 20 taels a year, and a mortal laborer earns about a tenth of a tael a day (100 taels to a low-grade stone) |
| A Qi Condensation cultivator's day of work (guard, guide, hunter) | 1 low-grade stone |
| Qi Condensation goods: a talisman, a common pill, a herb | 1–10 low |
| Foundation goods: a blade, rare herbs | 100–1,000 low; a Foundation-grade blade is about 400 |
| A Foundation Pill | about 1 mid at an auction, if one comes up; most are won, looted or brewed |
| Core Formation goods | 1–30 mid |
| Nascent Soul goods | 30–3,000 mid |
| Ransoms posted in the isles | a Qi Condensation disciple 100 low, a Foundation elder 1 mid |

Income follows the realm curve. A Qi Condensation cultivator earns a few low-grade stones a day, a Foundation cultivator a few tens, a Core Formation cultivator about a mid-grade stone, a Nascent Soul cultivator about a hundred mid, and a Deity Transformation cultivator a few high-grade stones.

**Stones as fuel.** Stones speed seclusion; they don't replace it. At Qi Condensation each low-grade stone burned during a day of qi seclusion adds about a fifth of that day's qi, up to about five stones a day, so a well-stocked day yields about twice the qi. That takes more than a day's wages, so working never beats secluding for raw qi; the world's share comes from what seclusion can't make. The qi each realm needs follows the realm curve, like income, so a day's wages buy about the same share of a day's qi at every realm, and a low-grade stone is worth a ninth as much at Foundation and almost nothing by Core Formation. That is why every realm hungers for the next grade. A day here means a full day of qi hours; with fewer qi hours on the wheel, the cap shrinks in step. Burning pays for its fuel as any price is paid, by the stone's worth against your realm's day: your realm's grade first, then the grades below at the premium a step, but it never breaks a higher stone, so a mid-grade stone saved at Qi Condensation stays whole. A low-grade stone is a fifth of a day at Qi Condensation and a mid-grade stone about three quarters of one at Core Formation; the purse keeps a stone part drunk as a fraction of its grade. Burning is a choice, off in a new life; when burning empties the pouch a toast says so, and the coming-back card when it happens while you are away; when it runs dry at your grade while a higher stone waits whole, the toast names that stone (E1's talk), and the screens show the purse by grade.

**Where stones go:**

- Fuel: stones and pills for qi, body and soul, and the daily upkeep of methods that drink them.
- Upkeep: gathering, guarding and growing arrays burn stones every day.
- Crafting: materials, failed experiments and cracked furnaces.
- Fees: Armillary Pavilion array tolls, market fees, passage, taxes and bribes.
- Auctions, the biggest sink, where you bid against NPCs who want the same lot.
- Losses: robbery, raided gardens, repairs after fights, and everything you carried when you die.

**Sect contribution** comes from duties while you idle, missions in the world and donated goods. It buys the sect's manuals, methods, pills, a better cave abode and a master's time. Stones buy contribution only by donation, at a poor rate (2 low a point, goods at half their sell price; Professions, people and powers, Seats and the currency), so a rich outsider can't buy a sect's vault.

**What the balance sims measure:**

- real hours to each realm, by spirit root, a row per attended schedule (none, a third, all), and a row per path: a pure body life and a pure soul life reach layer 9 and Foundation within 15% of a pure qi life, and a balanced life's later arrival is measured, not targeted
- the seat against the world: attended seclusion never outearns a trip of the same real time
- stone income against spending, per realm: positive but tight, counted by `npm run sim -- stones` (E4) as stones in (wages, loot and goods sold to shops, bounties, cards) and out (burning, upkeep, purchases, tolls, fees, the grade premium, robbery), as EVE counts its taps and drains. E4's sim counts the two biggest, a month of wages against a month of the basket bought at each Border Wilds market's prices at the common grade, and leaves about 18% at Qi Condensation and 17% at Foundation for burning and the rest; the other terms wait for a sim that plays a life through
- the world's share of progress, kept between 40% and 60%
- deaths per trip out, by the realm gap to the region's dangers
- win rates per matchup, in the fight sims, with the path rows: pure qi, body and soul at the same top rung each win 35–65% against the others, and a balanced cultivator beats a pure one about 75%

## Combat: rules underneath, free text on top

Combat is turn-based code you can play with buttons; typed free text is a layer on top, not a separate system. Letting GLM run fights alone was ruled out: it favors whoever writes best, loses track of HP over long fights, and can't be balance-tested.

**The rules.** No dice, no gap tables, one sheet. Every fighter has six numbers, every source of power feeds one of them, and a fight compares two sheets.

- Six attributes. Qi, Body and Soul come from cultivation: qi pool and technique power; HP and physical damage; perception and soul defense, each shaped by the methods that climbed your stages (Cultivation, growth). Agility (Evasion, turn order and tempo, fleeing), Fortune (crits, loot) and Aptitude (how fast seclusion time pays off) come from birth, techniques and items. Each starts at a base value that talents move: body talents move Agility, fate talents Fortune, and soul and fate talents Aptitude. The base is 10, and a talent's grade sets how far it moves one: gray −2, white 0, green +1, blue +2, purple +3, gold +4, red +5, pristine +6. Each point of Agility above 10 adds 5% to Evasion and to fleeing; crits are 5% plus 1% per point of Fortune above 10, and each point also adds a 2% chance of an extra drop; each point of Aptitude is worth 5% on all seclusion gains.
- Each turn: one main action (technique, strike, defend, item, command beast, talk, flee) plus one minor action (move, take cover, swap artifact).
- **Speed is tempo** (the realm gap's design, Jan's call, 2026-10-20). A fighter's tempo is the fleeing rule's: Agility times the square root of their size, their highest ladder's, so realm counts, softened, as it does when you run. Each turn a fighter banks how far their tempo outruns the fastest foe still standing, and acts again that turn whenever the bank reaches a whole action: ×1.25 an extra action every fourth turn, ×1.5 every other turn, ×2 every turn, and never more than twice a turn; the bank holds at most one action after it acts, so a fighter far ahead never stores turns. The extra action comes after everyone's first, in the turn's order: an engine-fought fighter picks it on its profile, and the player's repeats their main action, at another foe if theirs fell (C3). So an early Foundation against layer 9s acts again every third turn, and an early Core against an early Foundation acts twice every turn. A movement art lifts the Agility both tempo and fleeing read, by the square root of its band (white of your tier ×1, purple ×1.6 at tier 1, gold of the next tier ×2.1), so a gold movement art keeps pace with the next realm, as gold does everywhere; none, or one below white of your tier, lifts nothing. Generated cultivators carry theirs a band below their other arts (Enemies, A cultivator is generated): at their arts' band a great-sect disciple's purple footwork outran an early Foundation and a sacred-land genius's gold carried the ledger's genius row over its mark, and a band below every row holds (C3, Jan's call, measured 2,000 fights a cell). Tempo in full, Agility times the size, was weighed and put aside as too strong (a sixth power on the realm gap), kept as a sketch should the ledger want it; C3 measured it landing where no tempo does, so it buys nothing.
- **The sheet** is six lines, all plain numbers: **Accuracy**, **Evasion**, **Attack**, **Defense**, **HP** and **Qi**. Attack and Accuracy are sized by the ladder the action uses (qi for techniques, body for strikes and body arts, soul for soul techniques); Defense and HP by the body ladder, with the soul ladder as Defense against soul damage. Every line reads its ladder at the floor or above, ×0.5 of your highest ladder (Cultivation, Three paths). The Character screen shows the sheet with each line's band beside it ("Attack 31 · Foundation early"), and the Combat screen shows every technique's hit chance and damage against the foe you've selected.
- **Three bars, and each path guards its own way** (Cultivation, Three paths). A hit meets three bars in turn, each against its own Defense: the **qi shield**, a bar of its own ten times the qi rung's size, full when a fight starts, with the qi rung as its Defense; then the **armor**, a bar whose durability is three times its size and whose Defense is that size (its tier's realm at its rarity's band), its material's resist turning only what strikes it; then the body's **HP**, against the body's Defense. A bar that runs out passes on the share of the hit it didn't hold. Defending pours qi into the shield, a qi a point, up to a quarter of it, so qi still pays for defense, as a choice on your turn. Soul damage passes the shield and the armor and strikes the soul: the soul's Defense, and HP as if it were sized by the soul, so a body refiner's soul is wrecked at its floor and a strong soul shrugs a soul strike off; since it passes two bars, a soul art hits at a third of an art's power. Statuses' damage over time goes to HP.
- **Guards, half the ladder and half the art.** Each path's guard reads its ladder at half and takes the other half from its guard art at the art's band against your realm: the qi's **shield art** (the shield's Defense), the body's **hardening art** (the body's Defense), the soul's **movement art** (the soul's share of Evasion). A white guard art of your realm's tier reads the guard in full, so the numbers above are a white kit's; with none, the guard is at half; a rarer one carries it past your realm, as a rarer art carries Attack. A guard art is a technique anyone can learn, never cast. Your Evasion reads the higher of your rung on the attacker's ladder and your soul through its movement guard: a strong soul sees the blow coming, and the movement art lets the body act on it.
- **Two formulas.** Hit chance is Accuracy ÷ (Accuracy + Evasion): equal sheets hit 50%, double hits 67%. Damage is the technique's base × Attack ÷ Defense, with a ±15% spread; a crit is ×1.5. Defending adds 50% to Evasion and taking cover 25% until your next action. A qi technique can backfire, qi deviation turning it on you at half strength: the chance is a quarter of the toxicity meter's share, so a clean cultivator never deviates and a full meter deviates one cast in four (Items and gear, toxicity). Fleeing compares Agility and feels only the square root of the size gap, and talking compares soul sizes the same way, so escaping a stronger foe stays possible.
- **Realms are sizes.** Each realm has a size, and the sheet is that size times the quality of what feeds each line. The size steps ×3.1 into Foundation and widens every realm after, and a fight feels the step five times over, since the foe's hit chance, their tier's base, their Attack, your Defense and your HP each move by it: one realm up at the same first stage is about ×300 in kill time into Foundation and ×200 million at the top.
- **A climb, then a jump** (Jan's call in the realm gap's design, 2026-10-20, from his "Qi Condensation 1 to 9, then Foundation 50 to 1,000"). A realm's stages climb half the step out of it, and the other half is the border: a Qi Condensation layer 9 stands at 17.6 and early Foundation at 31, a jump of ×1.76 that a fight feels as ×17 in kill time, so breaking through is worth about eight layers at once. The border widens with the step, ×2.15 out of Foundation and ×6.8 out of Mahayana, so every realm is more of a wall than the last, while a stage inside a realm stays small (×1.07 a layer, ×1.29 a Foundation stage), so peers stay close and the realms split apart. The first stages are where they were, so the steps, the kill time one realm up and the gold band hold.
- **The half-step** 半步 is the gap: a line of the sheet sized past your realm's peak and under the next realm's first stage reads "half-step Foundation" in the sheet's stage words (Character screen). Climbing never reaches it; only what lifts a line does (Fighting a realm up): a rarer art or weapon on Attack, a rarer guard art or armor on Defense, a body ahead on HP and Defense, mastery, Daos and Intent, and from Foundation up the breakthrough grade on every line. So it is per line, as the novels say it: a great-sect disciple at layer 9 with a purple sword art and a purple hardening art strikes at early Foundation (43), guards at the half-step (30.6) and still bleeds as a layer 9 (176 HP). The sizes live in `src/content/realms.ts`.

| Realm | Step in | Kill time, one realm up | Size, first stage → peak | HP | Hit chance, one realm up at the first stage | The border out: jump, kill time | Hit chance, peak vs the next first stage |
|---|---|---|---|---|---|---|---|
| Qi Condensation | | | 10 → 17.6 | 100 → 176 | | ×1.76, ×17 | 36% |
| Foundation Establishment | ×3.1 | ×300 | 31 → 66 | 310 → 665 | 24% | ×2.15, ×45 | 32% |
| Core Formation | ×4.6 | ×2,000 | 143 → 370 | 1,430 → 3,700 | 18% | ×2.6, ×115 | 28% |
| Nascent Soul | ×6.7 | ×13,000 | 955 → 3,020 | 9,550 → 30,200 | 13% | ×3.2, ×320 | 24% |
| Deity Transformation | ×10 | ×100,000 | 9,550 → 35,700 | 95k → 357k | 9% | ×3.7, ×730 | 21% |
| Void Refinement | ×14 | ×500,000 | 134k → 627k | 1.3M → 6.3M | 7% | ×4.7, ×2,300 | 18% |
| Body Integration | ×22 | ×5 million | 2.9M → 16M | 29M → 164M | 4% | ×5.6, ×5,400 | 15% |
| Mahayana | ×31 | ×30 million | 91M → 620M | 910M → 6.2B | 3% | ×6.8, ×14,000 | 13% |
| Tribulation Transcendence | ×46 | ×200 million | 4.2B → 28B | 42B → 285B | 2% | | |

HP is ten times the size, the qi pool six times it and the qi shield ten times the qi rung's, before growth. A technique's base damage is sized by its tier the same way: 40 at tier 1, and ×3.1, ×4.6 and so on at each tier above (124 at tier 2, 570 at tier 3), so a realm's first-stage art kills an equal foe in about four hits and the same art needs about seven by the peak, which is the push to find a better one. Kill time is how many times longer you take to bring them down than they take to bring you down, white kit against white kit, about the step to the fifth; the sim measures ×286 into Foundation. Fights across a realm last a turn or two, and the first hit that lands decides them. Big numbers display in 万 and 亿 (or K, M, B). This curve is steeper than the realm curve that sizes qi needs, income and prices (Scale of destruction); the two stay separate on purpose, since an economy that grew a hundred-thousandfold a realm would have nothing to sell.

**Protective qi.** A higher realm's qi guards its body by itself, and each of the three bars guards by its own Defense. A hit from a cultivator of a lower realm (your realm is your highest ladder) meets each bar with its plain Attack, the sheet's Attack for that action with Daos and Intent in but before a crit, a combo or the element: at or under half that bar's Defense the bar takes a hundredth of the hit (×0.01), at its Defense a twentieth (×0.05), from a quarter past it (×1.25) the full hit, and straight ramps between, so a small edge moves the result a little rather than twentyfold. Far below barely scratches, the gap scratches, and across the border hurts (the second floor is the realm gap's design's, Jan's call, 2026-10-20: with the jump at the border a white layer 9 strikes at 0.57 of an early Foundation's guard). It is Tale of Immortal's rule in our numbers: there a junior whose Attack doesn't beat your Defense does 1 damage. The shield meets the hit first against the shield's Defense, then the armor against its own, then the body, and a sweep or cleave meets the first bar standing on each foe it spills onto. So each path walls juniors out its own way: a qi cultivator's shield holds them until it breaks and a thin body lets them through after, a body refiner's hardened body holds them at the HP, good armor holds them while it lasts, and better guard arts and armor raise the wall. One on one at the same realm or from above it never applies, and it leaves the fighting-up ledger where it was, since the kits that cross beat the Defense on their numbers and the rest lose anyway. What it decides is crowds: in the fight sim's crowds (`npm run sim -- fights`), one white cultivator against others a realm below, all at once, an early Foundation beats 80 at Qi Condensation layer 9 (98%) and 100 at layer 5, a Foundation peak 150 at layer 9, and an early Core Formation 100 Foundation peaks (measured in the realm gap's design on its sizes, 100 fights a cell). Past those the limit is time, not harm: a white crowd can't bring a Foundation cultivator down, only keep him busy, so it breaks (below). A great-sect disciple's purple at layer 9 beats an early Foundation's Defense, so that half-step fight stays on the sheets: the Foundation wins about two in three (66% in C3, with tempo and the disciple's movement art a band below his arts), and two such disciples win; a Foundation peak still holds 10 of them. This is the novels' gap between realms: the climb inside a realm stays short (×2.1 from Foundation early to peak), the border jumps, and a junior's blow loses ninety-nine parts in a hundred once it falls far short of the guard.

**A crowd that can't scratch you breaks** (the realm gap's design, Jan's call, 2026-10-20). In the novels the juniors scatter once the first of them fall. A fighter flees on its turn once a third of its side has fallen and every hit it has is held to a twentieth or less against every bar still standing of every foe it faces (Protective qi above); a rooted one can't, and fights on; fleeing reads Agility as always, so the slow are cut down as they run. A fighter who can still hurt you, a purple disciple whose Attack crosses your guard, holds on.

**Arts that strike many.** An art names how many foes it strikes, `targets`, 1 by default, and each takes the full hit with its own roll for the hit and the crit, so a crit's status lands on each it crits. The first is the foe you chose and the rest are the nearest in the fight's order, and a multi-target action carries one outcome per target. Splitting the power among them would gain nothing: damage is linear, so ten foes at a tenth each fall as slowly as one at a time, while all ten strike back. An art's reach follows its tier, as the realm's area of destruction does (Scale of destruction), never the realm you cast it at, so an old art keeps its old reach:

| Tier | Area | Common art | Blast, stomp or roar | Strikes all |
|---|---|---|---|---|
| 1, Qi Condensation | a house | 3 | 5 | full to 10, split past |
| 2, Foundation | a street | 5 | 10 | full to 20, split past |
| 3, Core Formation | a town | 10 | 30 | full to 50, split past |
| 4, Nascent Soul | a city | 20 | 100 | every foe in sight |
| 5 and up | a range and beyond | every foe in sight | every foe | every foe |

Past its full count an art that strikes all splits the hit: each of n foes takes the full count over n of it. Rarity never adds reach: it adds power, as everywhere (Jan's call in C2's talk). What pays for the reach is qi (Jan's call in C2's talk: every foe takes the full hit, never a weaker one): an art's written qi is what one foe costs, and it pays that times the square root of the foes it strikes, so a common art of 3 costs ×1.7, a blast of 10 ×3.2 and one that strikes all pays for its full count. A single art is the cheap one, and against one foe, which every art harms the same, a fighter takes it; against a crowd the sweep is far cheaper a foe. Sword Rain (once a fight, a sword technique strikes all) and the spear's Whirl (the sweep reaches every other foe) read the same rule, split past the art's tier's full count, and a fight item can strike many too (`targets` on its fight use). Every path has them from Qi Condensation up, in its own forms: the qi's wind blades, sword wind, icicle volleys and fireballs; the body's sweeping strikes, palm wind and ground-shaking stomps; the soul's roar that shakes souls and needles of divine sense, soul damage at a third as always. Arts that strike many are at least as common as single ones, at every tier and rarity; flying swords, which strike all, are rare. Every generated cultivator knows their path's art at its tier's common count from Qi Condensation, and a blast from small sect up or from Foundation. C2 measured the old sizes at 15 layer 9s to a white early Foundation with its blast of 10: a Foundation hit felled a layer 9 in three or four, and the qi paid for a blast or two. The realm gap's jump at the border (Realms are sizes) makes it two, and protective qi's second floor leaves the crowd nothing to win with but time, so the novels' fifty to one holds (Protective qi).

- Techniques cost qi, which barely regenerates mid-fight. Defend and pills restore it; with an empty pool you only have basic strikes.
- Eleven damage types: Physical, Metal, Wood, Water, Fire, Earth, Lightning, Wind, Ice, Soul, Poison. Each has its own resistance, and most carry a status: fire burns, metal bleeds, wood roots, water chills, earth staggers, lightning paralyzes, wind unbalances, ice freezes, soul dazes, poison poisons. A crit applies its type's status.
- The five-element cycle adds tactics: an element that overcomes the target's deals 25% more, and chaining elements in generating order (Wood, then Fire) builds a combo bonus. Lightning and Wind join the cycle as Wood, and Ice as Water.

Damage, once a hit lands:

```latex
\text{damage} = \text{base} \times \frac{\text{Attack}}{\text{Defense}} \times m_{\text{element}} \times (1 - \text{resist}) \times m_{\text{crit}} \times \text{spread}
```

The element multiplier is 1.25 when your element overcomes the target's, 0.8 when theirs overcomes yours, and 1 otherwise; the spread is a roll between 0.85 and 1.15 on the `combat` stream. Everything else, rarity, Daos, growth, grade, the realm, is already inside Attack and Defense.

**Rarity is a band.** A thing's rarity says which stage its line is sized at, in the thing's own tier (Tier, rarity and pedigree): white is early, blue is middle to late, purple is the half-step past your realm's peak, gold is the next realm's first stage, red its middle and pristine its half-step. The multipliers are the table's under Tier, rarity and pedigree; the realm gap's design moved only the words, since the shorter climb put purple's s^0.8 in the gap (Jan's call, 2026-10-20). So a gold sword art in Qi Condensation hands is a Foundation-sized Attack, and the sheet says so. This is how the novels talk ("his sword intent is already at Foundation"), and it is the whole fighting-up rule: a line of your sheet crosses a realm when something gold, red or pristine, or a body a realm ahead, or a heavenly grade, sizes it there.

**The fighting-up ledger.** A foe one realm up leads on every line by the step. Each advantage sizes one line, and lines multiply within themselves, so stacking on one line can push it two realms up (a red art, a red sword and ten Dao tiers put a Qi Condensation Attack at Core Formation) while the others stay home: a glass cannon whose hits land like an elder's, one time in seven, from a body that can't take one of his, which the sim scores at 0%. Crossing takes most of the sheet, and the body a realm ahead is the biggest single piece, since it sizes HP, Defense and Evasion at once.

| Advantage | Line | Size |
|---|---|---|
| Technique rarity | Attack; Accuracy ×1.2 at gold, ×1.4 at red, ×1.6 at pristine | up to the next realm's half-step at pristine |
| Weapon rarity | Attack, at half share on techniques of its Dao and full on basic strikes; Accuracy ×1.1 at gold, ×1.2 at red, ×1.26 at pristine | a red sword alone is never a red art |
| Armor rarity | its own bar: durability and the bar's Defense | up to the next realm's half-step at pristine |
| Guard art rarity | the body's Defense (hardening), the shield's Defense (shield), the soul's Evasion (movement) | half the guard, up to the next realm's half-step at pristine |
| Method rarity and tier | Qi, Attack (purity) and HP, built stage by stage by the method that climbed each | about the next realm's first stage at red and its middle at pristine, over a full realm |
| Technique mastery | Accuracy | ×1.15 a level, ×1.75 at Origin |
| Breakthrough grade | every line | 0.27 of the step out of the realm a grade, −1 flawed to +3 heavenly |
| Body or soul a realm ahead | HP and Defense, or soul Attack and Defense | the next realm's size on those lines |
| Dao tiers | Accuracy and Attack | ×1.05 a tier |
| Intent and Domain (The combat Daos, the Intent ladder) | Accuracy and Attack on the Dao's actions; the foe's Accuracy, then Evasion and Defense | Intent ×1.15 and the foe ×0.9, about a stage; Domain adds the foe's Evasion ×0.9 and Defense ×0.95 |
| Element advantage | damage | ×1.25 |
| Creativity | Accuracy | ×1.1 a point, 0 to +3 |
| Tree and Way nodes | various | a few percent each; capstones a stage |
| Gear properties and enchantments | various | a few percent each; a red artifact's named unique may carry a stage |
| Offerings at the breakthrough | the grade | +0.5 margin at red and +0.75 at pristine, up to most of a grade |
| A weapon above your realm | Attack | half its tier's step, at a qi cost and ×0.8 Accuracy; the bond cuts the penalty, and at Origin the whole step counts |

Win rate follows the two sheets line by line, and under the brutal curve it is a cliff: a kit a fifth of a realm short loses nearly always, and a kit over the line wins nearly always. Four rows mark the cliff, kits rather than pedigrees: an ordinary kit has every line a step behind; a great-sect kit in purple with a perfect grade sizes its lines at its own realm's peak and the half-step, short of the border; a sacred-land genius in gold with a perfect grade stands at the next realm's first stage on Attack and Defense and fights it about even in the middle realms; a chosen of heaven in red and gold, Perfection, a heavenly grade and a body a realm ahead stands at the next realm on every line and wins.

The fight sim's targets (from the measurements, 10,000 fights a cell), as win rates against an ordinary foe one realm up at the same first stage, measured without one-shot consumables; the ordinary foe's own kit rises by realm (green at Core Formation, blue at Nascent Soul, purple arts at Deity Transformation), which is why every row falls off at Nascent Soul:

| Attacker | Qi Condensation → Foundation | Foundation → Core Formation | Core Formation → Nascent Soul | Nascent Soul and up |
|---|---|---|---|---|
| Ordinary: white gear, ordinary grade | about 0 | about 0 | about 0 | about 0 |
| Great-sect disciple: purple, Mastery, perfect grade | about 0 | under 10% | under 5% | about 0 |
| Sacred-land genius: gold, Mastery, perfect grade | about 0 | 40–60% | 25–45% | under 5% |
| Chosen of heaven: red art, gold gear and method, Perfection, body ahead, heavenly grade | over 95% | over 95% | over 95% | over 90% |

The Qi Condensation column is its own case: no major breakthrough has happened, so no grade exists, and tier 1 arts strike at tier 1 bases against Foundation HP, so nothing but a body a realm ahead crosses out of it; that is the half-step fight's job, and a layer 9 against an early Foundation foe (36% to hit, across the border's jump) is where a Qi Condensation cultivator fights up, and only from the half-step. The rows are kits, not pedigrees: a typical great-sect disciple on the pedigree table (Enemies, beasts and the people you meet) sits between the first two rows. Beasts are their own foe: ×1.5 HP and no armor, so they lead on HP and fall on Defense, and a bloodline's abilities count as technique rarity. Within a pedigree the higher realm wins: a chosen one against a chosen one a realm up, or a great-sect disciple against another, wins under 5%. Two realms up is about 0 for everyone, and 5% in pristine from head to foot. At the same realm and stage, a chosen one or a great-sect disciple beats a rogue over 95% of the time, the sect disciple crushing the rogue as the novels have it, and a single stage up is easy to overcome. The sim holds these; what it tunes when content arrives is each realm's NPC baseline and the roster.

**Free text and creativity**

GLM maps what you type to legal actions and may add a creativity bonus of 0 to +3, under rules the engine enforces:

- Only real things count: scene features (tagged flammable, water, cover, high ground, fragile, dark), your items and your techniques. Invented items are ignored.
- Novelty: the same trick earns nothing the second time in a fight, and high-Soul enemies adapt.
- Bonuses never make the impossible possible. "I rip out his golden core" fails, and the story says why.
- Talk is a real move: bluff ("my master is the Azure Peak ancestor"), intimidate, bargain or surrender, compared with the enemy's Soul and temperament (The resolver, People checks).
- Enemies act from code, by their profile (Enemies, beasts and the people you meet, Profiles); GLM gives them a voice.

**One turn, start to finish**

**You type:** "I kick the brazier into the dry spirit-grass and charge through the smoke with Ember Palm."

**The interpreter returns** this, checked against a schema:

```json
{
  "main": { "type": "technique", "id": "ember_palm", "target": "elder_mo" },
  "minor": { "type": "interact", "feature": "brazier", "onto": "spirit_grass" },
  "uses": ["brazier", "spirit_grass"],
  "creativity": 2,
  "feasible": true
}
```

**The engine** confirms the brazier and grass exist and sets the grass burning for 2 turns. You stand at layer 8 (size 16.4) and Mo at layer 9 (17.6). Ember Palm's Accuracy is 16.4 × 1.15 (Comprehension) × 1.05 (Fire Dao tier 1) × 1.21 (creativity 2) = 24.0 against Mo's Evasion of 17.6: a 58% chance, and the roll lands. The hit meets Mo's qi shield first (176, ten times his size, with his qi as its Defense): Ember Palm's base 40 × Attack 17.2 (16.4 × 1.05 for the Dao) ÷ Defense 17.6, times a spread roll of 1.06, is 41 fire, all of it held, so his green water-silk robe behind it, and its quarter against fire, are never reached. Ember Palm costs 12 qi.

**The narrator** writes from that outcome alone: "Coals spill across the spirit-grass and flame races up the stalks. Your palm drives through the smoke and stops a finger short of his ribs, on the qi he has drawn round himself; it shudders and thins under the heat. He steps back into the burning grass. 'Brat. You will pay for that.'"

**The log line** always follows the prose and shows the math: `Hit 58% · 41 fire · shield 135/176 · Elder Mo 176/176 · Qi 52/98 · grass burning (2 turns)`

**Effects fill the wait.** Every outcome carries five tags: the form (slash, thrust, palm, projectile, aura, and for beasts bite, claw, charge, tail, breath; a talisman takes its technique's form, and defend, flee, talk and item are forms of their own), the element or damage type (the eleven), the attacker's realm, the result (hit, critical, miss, backfire, and for defend, flee and talk a held, escaped, failed or swayed), and the status it applied, if any. A multi-target action carries one outcome per target. Effects, sound and the log line read nothing else. The screen layers those into one effect, with no model involved. Form sets the shape, element the color and particles, and realm the scale: close to the target at Qi Condensation, across the screen at Foundation, a shaking screen at Core Formation and the whole view from Nascent Soul up, as Scale of destruction describes. A critical flares, a miss fizzles and a backfire turns the effect on you. The outcome arrives before the narrator's first word, so the effect plays in that gap. Reduced motion swaps it for a still flash, and sound hangs off the same tags.

**The fight from far away** comes after the screen effects: the camera pulls back by realm until the two cultivators are points of light with the land between them, and the same tags drive what passes between the orbs and what the ground remembers. `docs/mockups/orb-fight-study.html` is the study.

## How GLM fits in

GLM gets five jobs, all with thinking off except the rare heart-demon scene. None of them can change a number or an item; the engine applies everything.

| Role | Runs when | Returns | Settings |
|---|---|---|---|
| Interpreter | you type free text; clicked choices skip it | action JSON, checked against a schema | temperature 0.2, structured output |
| Narrator | every turn | 80–200 words, streamed, then a JSON tail: 3–4 next actions, memory notes, new names | temperature 0.8, max 600 tokens |
| Chronicler | every 10 turns, and when you leave the world | a short summary plus NPC memory updates | temperature 0.3 |
| Scribe | at world-calendar ticks and when you return | rumors, headlines and steward's reports on what the engine already decided, rewritten from the game's templated lines | one batched call per tick; optional |
| Heart-demon author | before a major breakthrough, from Nascent Soul | a personal trial scene built from your chronicle, played like a go-in scene | thinking on: rare and worth the depth; a templated trial stands in without a key |

> One adventure turn: typed text → interpreter (GLM, action JSON checked with Zod) → engine (rolls, damage, state changes) → narrator (GLM, prose from the outcome only) → log line with the math. Clicked choices skip the interpreter.

**Idle play never needs the AI.** The interpreter, narrator and chronicler work inside go-in. Everything the idle side shows, from steward's reports to rumors and headlines, exists first as a templated line written from the engine's ledger, so the game is whole offline and without a key. With a key and the setting on, the Scribe rewrites those lines as prose. The heart-demon trial is played as a go-in scene; without a key, a templated trial built from the same chronicle entries takes its place, so reaching Nascent Soul never depends on GLM.

GLM only reads the game state; every change passes through your code. A clever sentence can earn a bonus, never a free treasure.

**Context, in the order it's sent**, fixed text first so it caches:

1. Rules, world bible (with the scale of destruction), style guide and the acts a plan picks from. They're identical every call, so hosts bill them at about a fifth of the input price once cached; the region as you know it and the role's job follow.
2. Player sheet: realm, body and soul levels, key techniques and items.
3. Scene: location, features with tags, the NPCs present and their memory notes.
4. Recent: the last 6 turns word for word, plus the chronicle summary.
5. The task: your words (interpreter) or the engine's outcome (narrator).

Memory needs no vector database: the game looks up notes for the NPCs and place in the scene by id.

**Guardrails**

- GLM never edits numbers or inventory. The narrator sees the outcome first and may not add rewards.
- Every JSON reply is validated with Zod: one retry with the error message, then a safe fallback that never acts for you (P3.8, Jan's call): words that can't be read ask you to say it another way and spend no tick, a narrator's tail that fails twice gives the scene's own clicks, a narrator that can't be had tells the engine's plain lines, and a chronicler that fails keeps the summary so far and the templated line.
- Names GLM invents (an innkeeper, a valley) become real only when the engine registers them, with stats from the region's templates.
- A cost meter in Settings: OpenRouter returns each call's cost when the request sets `usage.include`.
- A mock provider replays canned replies, so tests and UI work run offline and free.
- Use AI at design time too: draft herb descriptions, pill lists and tree nodes once, review them, and ship them as data.

**Tone: cutthroat by default.** The strong prey on the weak, treasure gets people killed, and warmth is rare and earned. GLM leans agreeable and sanitizes, so the game never depends on its goodwill:

- The engine decides the harsh parts: robberies, betrayals, executions. GLM narrates what happened and can't soften the outcome.
- NPCs carry motives as data (greed, ambition, grudges) and intents the narrator must play out, such as "Elder Mo means to take the herb from you."
- The style guide shows the voice with short examples and bans softeners, moralizing and default happy endings.
- The spike played 20 dark scenes and GLM played them straight (`docs/spike-report.md`); if a host starts to hedge, tighten the prompt or change host.

**Request settings** (measured in the spike; numbers in `docs/spike-report.md`)

```json
{
  "model": "z-ai/glm-5.2",
  "reasoning": { "enabled": false },
  "stream": true,
  "temperature": 0.8,
  "max_tokens": 600,
  "usage": { "include": true },
  "provider": { "order": ["morph", "deepinfra"] }
}
```

- Thinking is off only when the request says so. Without the `reasoning` field GLM 5.2 thinks (147–400 hidden tokens); with `enabled: false`, `reasoning_tokens` read 0 on all 212 calls on both hosts.
- Hosts: the narrator runs on Morph (fp8; the richest prose, and it never softened a dark scene) with DeepInfra (fp4) as fallback. The interpreter runs on DeepInfra first, at half Morph's cost, then Morph. Never StreamLake or Novita, which make GLM 5.2 feel dumb.
- Interpreter calls add `response_format` with a JSON schema in strict mode and `provider.require_parameters: true`; Z.ai's own host, Novita and AtlasCloud don't list structured outputs. Every limit Zod checks (string lengths, list sizes) must also be in the JSON schema, or strict decoding can't enforce it. The interpreter's schema lives in `src/ai/schemas.ts`.
- The narrator's prompt states the tail's limits (choices that long, that many). If a tail still fails, the retry asks for the tail alone as structured output at temperature 0.2; the scene is not rerun.
- Caching works on both hosts from the second call: the cached prefix bills at a fifth of the input price on DeepInfra and about a third on Morph.
- First words arrive in about 0.5 seconds on a clicked turn and about 2 seconds on a typed one, since a typed turn waits for the interpreter's whole reply first.
- The player sheet carries the pronouns picked at creation, or the narrator guesses. Engine outcomes list what the player keeps as well as what they lose, since the narrator tends to invent extra losses.

## What the AI will cost

With thinking off, a turn costs a quarter of a cent to under a cent, so 20 sessions a month run about $3–7.

| Setup | Typed turn | Clicked turn | Turns per $1 | 50-turn session |
|---|---|---|---|---|
| **The chosen setup:** GLM 5.2, narrator on Morph, interpreter on DeepInfra, thinking off | $0.0042 | $0.0035 | ~250 | $0.20 |
| GLM 5.2 on a budget host (DeepInfra), thinking off | $0.0032 | $0.0025 | ~350 | $0.14 |
| GLM 5.3 FlashX (thinking stays on) | $0.0048 | $0.0031 | ~240 | $0.21 |
| GLM 5.2 on Z.ai's own host, thinking off | $0.0078 | $0.0061 | ~140 | $0.36 |
| GLM 5.2 on Z.ai's own host, thinking on | $0.0171 | $0.0110 | ~70 | $0.73 |

- Prices per million tokens (input / output / cached input): Morph $0.40 / $6.00 / $0.137; DeepInfra $0.5625 / $1.80 / $0.105; GLM 5.3 FlashX $0.37 / $1.25 / $0.09; Z.ai $1.40 / $4.40 / $0.26. GLM 5.2's price varies widely across its 25 hosts. Morph's output price makes a narrator turn there about 2.8× DeepInfra's.
- Assumptions: narrator 4,500 tokens in (2,000 cached) and 380 out; interpreter 1,800 in (1,200 cached) and 120 out; a chronicle call every 10 turns; 60% of turns typed; thinking adds about 1,000 tokens a call. The spike billed exactly the listed prices, cached input included. The spike's own calls were smaller (narrator 2,300 in and 330 out, at $0.0026 on Morph and $0.0009 on DeepInfra; interpreter $0.0010 on Morph and $0.0005 on DeepInfra), and its 214 calls cost $0.26.
- Thinking also costs time: 1,000 hidden tokens add 2.6–18.5 seconds before the first word, at hosts' measured 54–383 tokens a second.
- A month of 20 sessions of 50 turns: about $3–7 for you, $12–29 for four players.
- No free tier to lean on: a GLM 5.2 `:free` listing exists, but no host serves it right now. If one appears, free variants allow 20 requests a minute and 50 a day, or 1,000 a day after buying 10 credits.

## UI and screens

The game is obsidian and gilt over a cracked, starry void, sleek and thin, a PC game for monitors only: no phone or tablet layouts. Your cave abode is home, and a side menu reaches everything else. Screens appear in the menu as you unlock them.

**Only what you have touched shows, and what is new says so**. **A thing opens where it lives**, one rule instead of timed unlocks: a method opens Routine and the Trees, since its manual grafts on its ladder's tree; a technique opens Routine › Practice, its Dao's tree and Combat; a copy opens the bookcase under Trees › Manuals; a loose manual opens the Trees beside its host; an item opens the Bag; insight enough to buy a first node (10) opens the Trees; a person opens People. A new life's starting gifts, its copy, technique, items and stones, toast once after testing day, though the life holds them as seen. A combat Dao's tree appears once you hold something of it: a technique that counts it, a weapon of its kind carried or worn, a manual grafted on it, or a node in it. A root's element doesn't count. A manual opens any tree it grafts on, Qi, Body or Soul as much as a Dao, even before that tree's ladder opens: the tree then shows the manual's graft alone, with a line saying its own nodes open with that ladder, and they fill in when it does. A Trees category appears once it holds a tree, so Ways and Crafts stay out of sight until something fills them. Anything gained, a technique, a method, a manual, a copy, an item, a screen or a tree, is new until you look at it:

- a toast at the top right names it with a link to it, at most three at once, each gone after about six seconds; a burst folds into one ("+4 more"), and time away is told by the coming-back card, not by toasts;
- a dot on its screen in the menu stays until you open that screen, the way Cultivate's mark stays while a breakthrough is ready, and a screen just opened also glows faintly in the menu until you first look at it (a tab the same, on its screen);
- on the screen, the new thing keeps a faint glow until you select it: a Bag square, a technique's row, a manual's jewel, a spine on the bookcase (a new copy's toast links to its spine).

**You do it the first time.** The game teaches by having you use each control once. The first time in a lineage that a feature reaches you, it arrives switched off, a hint points at the control, and progress on it waits until you do it yourself; after that first time the defaults help as they do now (an hour flips to a new kind, a technique takes a free slot, a copy joins an empty queue). The record is the lineage's, so a reborn cultivator isn't walked through it again. You are never locked out: everything is on the screen to do early or another way. The first times:

| First… | Arrives | You do it |
|---|---|---|
| study hour | a fresh wheel is all qi | turn an hour to Study on the wheel |
| copy | unread, not queued (your method, at birth) | Read now on Routine › Study or its spine, and give it study hours |
| method read | known, not taken up: its ladder's hours give nothing | pick it under Climb with on Routine |
| technique | known, in no slot, no practice hour | Practice this, and give it an hour |
| tempering or nourishing art | known, not taken up, no hour | Climb with, and give it an hour |
| node within reach (50 insight; the Trees open at 10) | nothing changes | buy it on the Trees |
| stones worth burning (5 held, from layer 2) | burning off | turn it on in Routine |

Breakthroughs, drawing orbs and cards in the tray are already yours to do, and get a hint only. **The beacon**: while a first-time action waits, its screen's whole menu button glows lightly with motes drifting along its edges, the tab it lives in glows the same, and the exact control wears a soft ring; all clear the moment you act. Under reduced motion it is a steady glow with no motes. **Hints** are a hint kind of toast (`raiseToast`): one at a time, each shown once a life, staying until you do what it says or dismiss it (never gone because its moment passed by itself, an auto breakthrough or a card settled while away), with a link to the control. Hints are each life's own: Settings has Hints on or off and Show hints again for the open life, and about five minutes in (30 days lived) a hint says so. The method's hint ("You have learned your first cultivation method… Take it up under Climb with") comes first, then one of its own to give the day more qi hours (gone when you turn an hour to qi), then drawing orbs, whose hint waits for a method taken up, and after the first orb one on what attending does (focus toward ×2, the inhale, focus draining while you are away from the game; attending counts on any screen); burning stones waits for layer 2, after them. After the first node, a hint says where more insight comes from, study hours first. The coming-back card names any first time still waiting ("Your tempering art waits for an hour"). The wheel stays set an hour at a time: no shortcut to fill it.

**The journal 志** (the opening redone, 2026-10-20, Jan's calls). A glyph on the rail opens it, with two tabs, Quests and Codex; a small seal by the figure on Cultivate names the quest you follow.

- **A quest** is a one-off with steps, never a job: a job stays repeatable work paid by the hour, and a board may post both. A quest has a giver (a person, a board, a shop or a hall), where it is offered, one to five steps (each with where to go and what finishes it), a concrete reward (a technique, a copy, stones, an item, standing) and the codex entries it opens. Quests are offered where they live; the journal only tracks them.
- **Steps finish themselves**: the engine sees the thing happen (you reach the place, the item is in your bag, you win the fight, you buy the node), never a box you tick. A quest ends when you go back to its giver and hand it in, as the novels report to the board.
- **You follow one quest at a time.** Its next step's place is a seal on the map, and it gives Cultivate's Today line when nothing else waits. Any number can be taken, and any dropped but your origin's.
- **A codex entry** has a title in English with its hanzi, an area, how the thing works in plain words with the real numbers behind it (the qi rate, the odds, what a stat does), and where it lives, linked to that screen. An entry shows only once you have met its feature, so the codex spoils nothing; a new one carries a dot.

**Introductions** (the opening redone, 2026-10-20, Jan's calls). Every feature a player can touch is written down first, in `docs/features.md`, and each row is introduced one of three ways: **guided**, for the loop and any control you must use to get on; an **introduction quest** offered where the feature lives, for the world (the map, shops, organizations, crafts); or **the codex alone**, for depth (the breath's heat, toxicity, the realm gap, bonding), with its "?" beside it. A guide fires the first time you meet its feature where it lives, never on a timer, and runs one to four steps, each finished by the action itself; an "I know this" skips it whole. A plain narrator speaks every guide, a UI voice and no one in the world, so a start in any region reads the same (Jan's call, for now). A guide comes in one of three forms:

- **The screen builds itself** for the first seclusion. Cultivate opens on the figure and the qi bar alone, and each piece fades in as it is introduced: the orbs, focus, the wheel, the tray, then the rail a glyph at a time. Nothing shows before its moment.
- **The veil**, for what must not be missed: the first orb, the first minor breakthrough and the first turn of a fight you play. The screen dims under a still dark veil (no blur, no animation, for the paint cost), one control is lit in a gilt ring with at most two lines beside it, and nothing else answers until you do it. The game's clock holds while a veil waits; the first orb's breath runs at half instead, since orbs need motion. A pointer motion is shown once by a ghost hand (passing through an orb, tapping a gate as the spark passes, and later the furnace and the forge), then it is yours.
- **The ring** for the rest: a gilt ring and a short line at the control, no veil, nothing held, the step waiting until you do it. An introduction quest's step can open with one where it lands (the first shop quest lights the Buy tab).

About fourteen guides at first: reading your method, taking it up, the qi bar filling, drawing an orb, focus, turning an hour to Study, the first minor breakthrough (its first spark at half speed), the first node bought, a technique put to practice, the first card in the tray; and the first course set on the map, the first place's doors, the first buy at a counter and the first turn of a fight you play. A guided feature drops its hint; every other hint links to its codex entry, and each guide ends by adding its entry with a dot, never opened for you. The firsts that arrive switched off with a beacon (You do it the first time) stay beneath it all as the fallback. Guides run once a lineage, as firsts do; Settings' hints toggle becomes Guides, on or off, and replays any guide, and with guides off the beacons still come. Which way each row of the feature list is introduced is The opening, built's to write, from the list.

**Look: obsidian and gilt** (`docs/mockups/shell-study.html` and `art/concepts/shell-1.webp` are the reference). Sleek and clean: thin type, single hairlines, a lot of dark. A black void with a quiet starry sky, the cracked glass over it: a few long fractures cross the screen from impact points, a fine web of cracks only around those impacts and away from text, qi light leaking faintly through every crack. The cracks are code over the painted sky, seeded per life and redrawn to fit the screen; a breakthrough makes them flare and opens a new fracture. Panels are obsidian, a little see-through, edged by a single gilt hairline with a small radius, so text never sits on a crack; a panel inside a panel is lighter still. Nothing on a panel loops. A panel that waits on you or that you can act on keeps a still glow in the accent, a warning in the warning color, which Settings' Panel rims brightens or dims. The card that waits on you is dark like the panels, its title in the display face and each choice a row with a chevron, the first edged in the accent. A screen with a scene paints its place behind everything, the panels floating over it on still scrims that fade to clear, never a blur. Cultivate's is the cave abode: a hall cut in a cliff, its mouth open on misty peaks under the void, the painting the stage's full height and centred on the figure, its sides fading into the void sky on a wide screen. Its seat holds a featureless black silhouette painted into the cave, and that painted silhouette is the figure: the code's own shape is kept unseen, sized and placed exactly over it, as the outline the qi runs in and the sun's shadow is cast from, so the meridians, the orbs, the ring and the hour's light line up with the painting (the scene still never paints a face or a body you would recognise). The hour is a still wash over the painting: the night dims it by about a third toward the yin blue, and the figure's shadow darkens the painted floor. Gold marks anything you can act on or have just gained; the gilt hairlines are their own token and stay gold whatever accent you pick. The crack light is the qi glow, and the qi, body and soul bars use it too, so qi reads as the light behind the glass. Art is still and cheap to paint: no live blur, no looping animation on anything larger than a button, one scene per screen. The one exception is the weather on the glass, which loops but moves only by transform on its own layers, so it never repaints the page (`docs/art-pipeline.md`, Paint cost). A serif display face for names, titles, headings, the card and the numbers that stand alone, with hanzi in a brush font as flavor, and a plain sans for body text and controls: Cormorant Garamond, Ma Shan Zheng and Inter from Google Fonts, with system fallbacks. Starting colors: background #040507, panel rgb(7, 8, 11) at 84%, text #e9e5da, muted #8d949d, accent gold #d6ab4c, gilt #d9b46a, hairline the gilt at 16% (40% where it marks), crack light #7fc7d9. The atlas keeps its own ink-and-silk look, since it is the authoring tool, not the game.

**Players pick their colors.** Settings changes the accent and the crack light, sets how much fine web the glass carries, and rerolls the glass, with presets and a free color picker that warns when a color is hard to read on black. Each color keeps its job whatever it looks like: the accent always means something you can act on, and the crack light always means qi. The defaults are gold, qi cyan and a light web.

**Rarity has its own palette,** never the accent's color or the warning color, since the accent must keep meaning "act on this": gray, white, green, blue, purple, an amber-orange gold with a soft glow, a deep crimson red, and pristine as clear glass: near-white with a faint rainbow refraction drifting across the name and a soft glow, the one glass in Severed Heaven without a crack; reduced motion holds the sheen still. All are tokens players can recolor, the sheen aside. A thing's name wears its rarity color, and its tier is a word beside it ("Foundation").

**Layout.** A narrow rail on the left (72 px on the stage), flush on the stage's edge: the abode's mark at its head, then a glyph a screen, the one you are on lit in the accent with a bar, its name and hanzi as a tip on hover or focus, the new and first-time marks on the glyphs. No bar runs across the top: the brand floats on the left and the season, the hour, the spirit stones and the insight, each with its "?", on the right, over whatever the screen shows. There is no context panel: the screen takes every pixel right of the rail. Each screen but Cultivate opens with its name and hanzi (Routine at the head of its own column). **Cultivate** (`docs/mockups/cultivate-bottom-study.html` and `cultivate-empty-study.html`) is the scene with the top floating over it and a thin band along its foot, dark glass fading to clear with no line. The figure sits low in the middle at a fixed height, the breakthrough buttons and one line of words under it; behind it the sun's hand, and round it focus and heat as a ring (§ Cultivation, The hour on the figure, Attended seclusion). The band holds three columns: you on the left (name, realm with your age beside it, the qi, body and soul cells as each opens, today's routine), then the one thing that waits on you, and Recent on the right, the Chronicle's last five lines each led by its kind's mark. The middle shows, first to last: a great realm's breakthrough panel once opened (the gate, the grade and the buttons beside what it asks and the offering slots; an empty slot opens a floating picker of what can be laid), the coming-back story (its opening and what grew, with Read it all raising the whole story over the scene), the oldest waiting card ("1 of 4", its choices side by side; the others come up one at a time, with no tray), or **Today** when nothing waits: the copy being read, what is practiced and the qi a day with when the bar fills, a row saying so with a link to Study or Practice when nothing is. The lifespan's edge rises over the scene's right. Nothing on Cultivate scrolls, and a "?" in the band opens upward over everything. Toasts and hints stand at the top right, under the season and the stones. **Routine** (`docs/mockups/routine-art-study.html` layout B and `routine-day-band-study.html` take B) stands in the same cave, in the same place, under still scrims darker toward the right; its layout is the Routine row below. Moving between Cultivate and Routine, the cave holds still while what stands in front of it sinks and fades, and the next screen's parts rise into place as they come in, once each way; any other change of screen is at once, and so is this one under reduced motion.

**The stage**, for a full-fledged game played fullscreen on monitors. Every screen is laid out on a stage 1080 px tall, and the whole UI scales by one factor, the window's height over 1080, so 1280×720 shows it at two thirds, 1440p at four thirds and 4K at double, with the layout never changing. The stage's width follows the window's shape: 1728 at 16:10, 1920 at 16:9, 2520 at 21:9. Everything a screen needs sits in the centre 1728×1080, so a 16:10 monitor loses nothing, and a wider stage gives the extra room to scenes, the map and the void sky; past 21:9 the stage stops at 2520 and the void fills the sides, and a window narrower than 16:10 letterboxes top and bottom in the void. There are no width breakpoints. 1280×720 is the smallest size the game is built and checked at. The stage scales by CSS `zoom`, so text is laid out at its final size and stays crisp at any factor, and the stage holds the overlays (toasts, hints, modals) inside it. Past 1728 the rail keeps its width at the stage's left edge and the screen takes the rest (1,656 px at 16:10, 1,848 at 16:9, 2,448 at 21:9). Canvases (the map, the trees' pan and zoom, the qi and the sun, the day wheel, the people web, combat's effects) read the pointer through the same factor and draw at the screen's density times it, so 4K stays sharp. Nothing inside the stage sizes by the window (`vw`, `vh` or `innerWidth`), and at 1280×720 the body text is about 9 px on the screen, which Settings' text size answers. Settings has a Fullscreen button, and F11 works as in any browser. A desktop app around the same build (Tauri or Electron, saves unchanged behind the save layer) is possible later.

**The trees are opening fans.** Every tree, the big three, the Daos, the Ways and the Crafts, draws as a fan opening upward from its root at the hub. Each realm is a band further out, and all nine bands from Qi Condensation to Tribulation Transcendence are always drawn: a tier not yet written is an empty band with its realm's name and its capstone's place marked.

- **Shape.** Each band opens wider than the last, 150° at Qi Condensation (half-opening 75° + 6.25° a tier) until it is a half circle from Nascent Soul on, so a Dao reads mostly up and fills out as you climb. The fan is one half of the circle: no band, crown or node lies below the root, and the canvas can't be panned below it. Each branch is a straight spoke: a branch stands where it was drawn, its spoke on the angle of its nodes' mean across (the tier's widest at 90% of the half-opening), neighbouring spokes kept apart at the band's middle and the rest of the band left empty for what comes later; its nodes run straight out along it at their authored depth, side by side only where it forks, a rejoining node between its parents, and nodes on one spoke kept a label apart (a side path drawn running sideways folds onto its spoke, sliding inward if it would pass the band's deepest ring). The starter and the capstone stand on the middle spoke. The spacing along the spokes, from the hub out a tier at a time, is in `src/ui/treeLayout.ts`, each band stepping out by any rows its crown adds (Manuals on the trees, below).
- **Edges and labels.** Edges run along the spokes: nodes on one spoke join straight, and so does anything from the hub; where a node's branches part, or several meet in one node, the edge goes straight out to a ring between them, round it and straight out again, every edge from one parent (or into one child) turning on the same ring, so a parting reads as one arc, the way Path of Exile's orbits do. A label sits across its spoke, beside its node on an upright spoke and under it on a level one, so nodes along a spoke never collide.
- **Look: gilded.** A learned node is a ring of gilt with a soft glow, a notable a double rim, the starter and capstone medallions with a hanzi; a node you can buy now rings in the accent with its cost; a locked one is dark iron; a learned path is a gilt line with a fine bright core. Gilt is its own token, warm gold by default, so the accent keeps meaning act on this, and the three states differ in lightness as well as hue. Manuals are the only jewels, so a glow on a tree always means something found.
- **Moving round.** Drag or pinch to pan, wheel or pinch to zoom toward the pointer, + and −. The screen opens on the band you cultivate in at 100% (the hub low and centred at Qi Condensation, since fitting the band leaves the names too small to read), Re-centre comes back to it, and a dropdown of the nine realms ("you are here", "next") jumps to any band. Lines keep their width at any zoom, the band names grow with their rings so the far realms read when zoomed out, and tooltips stay screen-sized.

**Manuals on the trees** (Cultivation, Where manuals live, has the rules they draw):

- The layout: every tree is an opening fan (above), and each manual is a jewel in the crown on the rim of the band its nodes unseal in (a Method's or an Art's own tier), never an edge into a tree node. The jewel wears its rarity's color with a soft glow, a pip under it per node (lit when learned, ringed when ready), and a slow pulse while one of its nodes is ready; a sealed band's jewels are dim.
- The crown's order: the crown runs a little past the tree on each side, never past level, with slots at a fixed pitch along the rim (the angles and pitches are in `src/ui/treeLayout.ts`). The rarest manual takes the slot just right of the peak, the next the slot just left, and so on outward, the inner row filling before the next, with the order held breaking ties, so a new white lands at the crown's end and moves nothing, and a new gold slides in near the peak and moves only the lesser ones one slot out. The peak keeps a gap on each side for the climb into the next tier. A band whose manuals outgrow its rim grows another row further out and every band above steps out with it. A line's next chapter keeps the angle of the chapter before it, one band up, and the slots beside it step round it.
- A click blooms the jewel in place: a disc over its neighbours with the jewel at its heart, its nodes on a ring above it in requirement order (a chain along the ring, a fork as two arcs from one node), lit as learned, and its name below. Its nodes act as the tree's do, and a click on the heart closes it. A hand-written manual from purple up may place its nodes in its bloom itself. The host's entry in the tree list counts its manuals ("Qi · 3 manuals"), and so does each band's name ("Tier 1 · Qi Condensation 炼气 · 72 manuals").
- The Manuals category on the Trees screen shows the hostless manuals on top, a list of them beside one focused tree at a time (even a one-node Art), and, below, a shelf of every manual held by kind, each a link to its graft. Past eight, the list takes a search, a chip per kind and Hide finished. The focused manual's tree is a small fan like the real trees, opening upward from its first node with its tier bands in ascending order, tier 1 innermost and each named for its realm, and its nodes are read and learned in place as a tree's are, details on hover or focus, with no list of nodes under it. The Character screen keeps one line, "Manuals: 7 (5 formulas, 1 method, 1 art)", linking there.
- The shelf is a bookcase. A plank per kind, rarest first, with Scriptures and Inheritances together as Above the trees and short shelves sharing a plank. Each manual is a standing spine: its rarity's color as a band on top, its hanzi in brush down the spine with no box round it, a binding per kind (a Formula bamboo slips, a Method thread-bound, an Art a scroll on rods, a Style a folded album, a Scripture jade slips, an Inheritance a sealed case) and a pip per node. A manual with every node learned lies flat in a stack at its shelf's end ("62 finished"), which stands back up on a click. The English name lives on the hover card, which says what the manual is: name, hanzi, rarity, kind, host, and every node with its effect and whether it is learned, ready or waiting. A click opens its jewel, bloomed, on the host's fan, or focuses a hostless manual's tree above. The bookcase is also where every copy you own stands, read or not (Cultivation, Reading).

| Screen | What it shows |
|---|---|
| Cultivate 修炼 (home) | your silhouette seated cross-legged, qi drifting in, circulating and settling in the dantian, which glows brighter as the qi bar fills; orbs to draw in by hover, and focus and heat as a ring round the figure (Attended seclusion); realm and stage, qi, body and soul bars, age against lifespan, today's wheel and routine, the card feed, the spirit pool, alerts |
| Routine 日课 | what your hours do: three tabs, one per kind of work, and a strip of the day's twelve hours with their counts, an hour on the strip opening its tab. **The scene**: each tab has one ring on the left in a gilt bezel drawn in code (ticks, studs, and on Day the five phases at the quarters), the same size in the same place on every tab, and its page in a band under it; a column on the right holds the title, the tabs, the strip and the tab's own controls, and never scrolls (only a list inside it does, fading at its foot). A small gilt star circles just outside the bezel at the hour of the day, a turn a day, spinning as it goes. Floating lists open over the column as obsidian slips, and pickers replace the browser's selects. **Day 日**: the day wheel with its element hours, the method on each ladder with its switch (shown even with one known), and the auto setting for minor breakthroughs and stone burning; the breakthroughs themselves are called on Cultivate, a button per ladder under the figure and a panel for a major one. A Home 居 / Road 途 switch heads the wheel (`docs/mockups/routine-study.html`): Road shows the road wheel, edited the same way, any time, so a road day can be set before you leave; it opens on the road while a course is set. Routines fold under the wheel: one line names the routine you keep (a learned one, one of your own, or your own day; on the road, a way of the road or your own), and Change opens the list, learned and your own with saving this wheel, or the four ways of the road and your own with rename and forget. On either wheel picks build up: a tap adds an hour or drops it, a drag adds every hour it crosses, shift adds the run from the last tap, and a tap off the wheel lets them all go; a kind sets them all, and hours locked to sleep are passed over. On Routine the day sits under the wheel: Home or Road centred over three columns, what a day gives (a figure a line in its ladder's color), the routine kept with Change, and minor breakthroughs with the stone switch; picked hours swap in the hour editor there. The methods stand in the column, each with its mastery and speed beside its line and a bar its full width, and Climb with folded to one line; Change lifts that ladder alone to the head of the column and opens its methods under it like the known techniques (a line's chapters under it, rarest lines first, a search and a tier picker past six), a tap on one taking it up. **Practice**: what was the Techniques screen, whole (below). **Study**: the copy being read, as the ring filling toward done with its time left, lump and "suits you" under it; the queue after it, reordered and pruned; the unread copies on the shelf with Queue and a link to their spine; and what study gives. Day and Study show from the start, since qi and study hours are open from the start; Practice shows with the first technique. |
| Trees | pick a category, Cultivation (Qi, Body, Soul), Daos, Ways, Crafts or Manuals, each showing once it holds something, then a tree, with a "?" by its name totting up what its learned nodes give (sealed ones apart, its grafts on their own lines): an opening fan you drag and zoom (The trees are opening fans, above), each tree's manuals as jewels in its bands' crowns, sealed nodes dimmed, opening on the band you cultivate in, with Re-centre back to it and a ladder to any realm; a node's details open in an overlay. Manuals holds the hostless manuals and a bookcase of every manual held, a spine each with a hover card (Manuals on the trees, above) |
| Routine › Practice | what you practice and what it gives; it left the menu for the Practice tab, and links to a technique land there. A Practicing panel on top (each technique practiced, its bar, the time to its next level and the insight that level releases); a list of every technique beside one technique's page. The list keeps a line's later chapters under the earlier, edges a technique in its rarity's color from blue and makes it glow from purple, the one selected lit by a gilt edge fading right, one line a technique on Routine, orders by rarity, tier or order learned, and past eight techniques adds a search, a Hide finished chip (those at Origin) and tier, Dao and order pickers. The page: its mastery as five steps with each level's practice days and insight and the time to the next (on Routine the ring), requirements, what is still sealed, the line's known chapters, and one line on its Art (learned, awake, when the next wakes) linking to the tree: an Art's passives are bought on its tree, never here |
| Character | talents, the six attributes, fame and standing, and one line counting manuals by kind, linking to the Trees screen's Manuals |
| Chronicle | your life as a river: the milestones as stations on a fine gold line, everything else as prose beside it, a chapter for each realm, with an almanac of seasons as the second view; breakthroughs, fights, rumors and steward reports all land here; `docs/mockups/chronicle-river.html` is the reference |
| Settings | OpenRouter key and cost meter, saves, clock speed, colors and glass, text size, reduced motion, the mature content switch |
| Bag | a grid of squares with names in rarity colors and tiers as words, gear on the figure's squares, the abode's store as a second grid, stones as a count; `docs/mockups/inventory-study.html` is the reference |
| Go In | the adventure screen, described below |
| Map | the zoomable world map with fog of war; tiers open as you climb |
| Crafts | furnace, forge, array and drawing queues, recipes and experimentation |
| People | everyone you've met as circles (grouped by where you met them) or a web of threads, with the chosen person's page beside them, and your sect and factions; `docs/mockups/people-study.html` is the reference |

Not built yet, each with the layer that brings it: the OpenRouter key, the cost meter and the Go In screen with the AI half (P3.8, P3.9); the mature content switch with its tone pass (P3.13); Crafts with crafts (M4); the abode's store and appraising "?" items with crafts and trade; sect and faction groups on People, letters and Seek them out with organizations and the living world; steward's reports, rumors and headlines with the living world.

**The go-in screen.** The narration streams down the middle, each turn followed by its log line with the math. Three or four suggested actions sit under it as buttons, with a free-text box below them. A scene panel beside it shows where you are, the tagged features, who is present and your HP, qi and statuses. Leaving returns you to the abode with a summary of what you brought home.

**The People screen.** Two columns: the people on the left, the chosen person's page on the right, so opening someone never hides the list. The left has two views. **Circles** is the default: a list grouped by where you met them (the Gate, kin and home, the road), each row a seal, a name, their bond and how they feel in words; your sect and factions get groups of their own. **The web of threads** is the second view: you at the centre, everyone joined to you by a crack of qi light. Distance is how they feel about you, the warm close and glowing in the crack light, the hostile at the rim in the warning color, the indifferent dim between; the bond sets which side of the web they sit on. Past a dozen or so people the web shows your nearest and the rest stay in the circles. Without a portrait, a person's seal is their surname in the brush face inside a carved square, tinted by their feeling. The feeling is always words, with five quiet notches behind them, hostile to trusting as a glance, never a number. Fresh news is a gold dot on the seal and the newest line at the top of their page; there is no separate feed, since Cultivate's Recent and the Chronicle carry it. A person's page: the seal, name and bond, their one-line summary in the display face, feeling, realm, whereabouts and where you met, then their log as a thread, with "Write a letter" and "Seek them out". `docs/mockups/people-study.html` is the reference (B and C).

**The Chronicle screen.** Every line has a **kind**, shown as a brush character in its color, so what happened reads at a glance: 气 qi, 体 body, 魂 soul, 关 gate, 精 mastery, 学 learned, 战 fight, 伤 hurt, 人 people, 事 choice, 了 settled itself (dim), 生 birth and origin, 终 death, 开 an opening. The kinds are data beside the event templates, and a chip per kind filters the screen. Two views share the chips and link to each other:
- **The river**, the default, newest at the top. One fine gold line (the trees' gilt, apart from the accent) runs down the middle of a margin and the text. The milestones (qi, body and soul steps, mastery, gates, birth, death) are **stations** on it: a ringed brush mark, the line in the display face beside it. Everything else that season is one **paragraph of prose** beside the line, each sentence led by its kind's mark, with the season's brush character (春 夏 秋 冬) in the margin. Each year opens with the age in faint numerals in the margin and the world's year as its heading ("Sealed Era 3,137", the realm under it in small type). Each qi realm is a **chapter**: a header where the life enters it, with the realm's hanzi, its name and its span ("ages 12–22 · Sealed Era 3,127–3,137"); a major breakthrough is a large station with the realm's hanzi (筑基). The line keeps one width throughout and does not glow more with level; the chapters carry the level.
- **The almanac**: a row per year, newest first, a column per season, a brush mark per line in each square, breakthrough seasons edged in the qi color and a new realm's in gold, and where the year ended at the right. Picking a square reads it out beside the grid, with "Read it in the river"; each year in the river links back to its row.
- **Long seclusion keeps its years.** Three or more years in a row with nothing but steps and cards that settled themselves are a stretch of seclusion: a shaded band with its span and what it gave ("18 years: 2 stages of qi, a body layer"), every year in it a row, the quiet ones as thin ticks, so eighteen years look long. Only the years before a life's first hour fold into one line.
- **Earlier lives** in the slot are a picker in the header, each on the same calendar ("Lan Shu, 3,052–3,114"). The line is still, with no blur or looping animation, so long lives scroll smoothly.

**Coming back.** After time away, a story card tells what happened while you were in seclusion: qi gained, breakthroughs, queue output, and the cards that resolved on their own, with the rest waiting in the feed. It includes the steward's report.

Numbers use short forms past ten thousand (12.4k, 3.1M), and every number that matters has a small "?" beside it that shows how it was worked out, on hover or a tap, so the sums stay out of the way.

**Less spreadsheet.** Words first, numbers behind the "?", including the bars: "qi thick as river mist" with the number on hover. Cultivate is home: the figure, always seated cross-legged, with the hour as the sun on it (§ Cultivation, The hour on the figure) and the cards arriving under it. Every number that changes has a moment: a full bar puts its breakthrough under the figure, now or wait and let it fill, a card says what happened, and the typed chronicle reads as a biography, its lines in prose under the season and the world's year ("Winter 3,137"). Realms and layers are words everywhere, "Qi Condensation, fifth layer". The glass carries a season tint and weather from the calendar. Named days and named people from the first hour, with portraits. The cave itself does not change with your things, which would need a design per kind of abode.

**The Bag.** Squares, not volume: the grid is the capacity, and bulk is a thing taking more than one square. It holds no more than its squares (Sean's playtest, 2026-10-20): a buy that won't fit is refused, and anything else that comes to you (loot, a find, a gift, a card's) takes what fits and the rest falls to the ground where you stand, as does anything you leave there. A pile on the ground is marked on the map and listed under the pack while you stand within 250 li of it, picked up as far as the pack has room, and gone a month after it fell (Jan's call in C2). A stack can be split in two, the half its own square, and stacked together again. Pills, talismans, herbs and materials stack to 99 a square, ores and bulk materials to 20, gear takes one, and a cauldron, a corpse or a beast takes several. Your pack on foot is small; a mortal cart or mount adds squares while you travel with it, and losing the cart loses what is in it; a storage pouch at Qi Condensation, a storage ring at Foundation, bigger rings and spatial items above. Stones are a count, never an item, and a ring holds any amount, as mortals' silver does. The abode's store is a large separate grid, so "carry what you can, leave the rest" is two grids. Gear squares sit beside the figure, weapon, armor, ring, pouch, and dragging onto them equips; the same figure stands on the Character screen. An item shows a glyph from design-time art, its name in its rarity color, its tier as a word and a stack count, with the "?" for the rest, and unknown things show as "?" until appraised. `docs/mockups/inventory-study.html` is the reference.

## Saves

Saves are ironman by default: one autosave per slot, so deaths and betrayals stick. A gentle mode, picked at creation and shown on the slot, allows one rewind to your latest breakthrough of any kind, and the charge refills only at your next major breakthrough.

- Eight slots, each holding a lineage: a life and every rebirth after it.
- The autosave writes every 30 seconds, at each breakthrough and whenever you leave a scene. There are no manual saves, and one tab plays a slot at a time: a second tab on the same slot offers to take over, so two autosaves never overwrite each other.
- Each slot lives in IndexedDB through Dexie: the game state, its backup, the rewind snapshot, the chronicle and the adventure log. localStorage keeps only settings, since its few megabytes would run out once the world fills in. Everything is checked with Zod on load and carries a version number with migrations.
- The previous autosave is kept as a backup. If the latest fails its check, the game loads the backup and says so.
- Export downloads a slot as one compressed file, and import checks and migrates it. That is the only way to move a life between devices, since there is no server. The game asks the browser to keep its storage and reminds you to export, because Safari can clear a site's data after a week without a visit.
- A save file can be edited, and that's fine. There are no leaderboards to protect.

## Tech stack and code layout

The game is a static web app with no server, and its rules live in a folder that never touches React or the network.

| Layer | Pick | Why |
|---|---|---|
| Build | Vite + TypeScript | instant dev server; types catch save and schema bugs early |
| UI | React | the most examples and libraries to borrow from |
| State | Zustand | small, and the game loop can update it outside React |
| Validation | Zod | checks GLM's JSON and your save files |
| Storage | IndexedDB (Dexie), localStorage for settings | saves and the growing adventure log in one, settings in the other |
| Tests | Vitest | unit tests for rules and formulas |
| Hosting | GitHub Pages or Netlify | free static hosting and a link to send friends |

Plain JavaScript numbers are enough. The realm curve multiplies the qi needed about 3 × 10¹⁴ times from Qi Condensation to Tribulation Transcendence, so totals stay near 10¹⁸, far below the 1.8 × 10³⁰⁸ ceiling. Daily gains grow on the same curve, so adding them to large totals loses no precision that matters.

```text
src/
  core/      rules, combat, checks, seeded RNG, game loop, saves and migrations
  content/   realms, trees and nodes, techniques, recipes, items, talents, regions, factions
  ai/        OpenRouter client, prompts, Zod schemas, interpreter, narrator, chronicler, cost meter, mock
  ui/        abode, trees, crafting, world map, go-in screen, character, inventory, sects, chronicle, settings
sim/         Node scripts: a month of idle in a second, 10,000 fights per matchup
```

Five rules keep it sane:

- `core/` never imports React or calls the network, so the same code runs in tests and in the Node sims.
- Content is data: a new pill, node, beast or region is an entry, not new code.
- Randomness is seeded (mulberry32): a system rolls from its own named stream (a fight, a breakthrough, the cards, the road), or from a seed keyed by what it rolls for (a shop and its month, an NPC's seed, a region and the lineage), so the same seed replays the same fight, bugs reproduce and a new system never shifts another's rolls.
- Saves carry a version number and migrations.
- The loop ticks a few times a second. On load it applies offline time, capped, and shows what happened while you were in seclusion.

**Your key, and your friends' access**

- Now: paste your OpenRouter key into Settings. It stays in your browser; never commit it.
- Friends, option A: a "Connect OpenRouter" button. OpenRouter's PKCE sign-in gives each friend's browser its own key, so each pays their own cents and you run no server.
- Friends, option B: a small Cloudflare Worker that holds your key behind a daily spending cap, if you'd rather cover them.

## Roadmap

Built bottom-up: what other systems read comes first, each layer thin (the least the layers after it need) and ending with a play session, and a screen is painted once its features stop changing. `plan.md` holds the order and the phases.

| Stage | Contents |
|---|---|
| M0 to M2, done | world bible and GLM spike; the idle core with Qi, body, soul, insight and the first decks; the combat engine, breakthroughs, manuals, the trees and the Chronicle |
| M3's first half, done | the atlas as data, three paths, the resolver, people and followers, catalogs and shops, the travel map, places and encounters; the art overhaul's A1 to A5.2, the world at its true size |
| The economy, thin | money by grade, prosperity, what a market holds, supply and prices, markets by reach, trading yourself and methods in the market |
| Organizations, thin | one skeleton for every organization, seats and the currency, what membership gives and asks, guarded methods; jobs as posts, duty hours and the gather hour (O1 to O5) |
| M4 Crafts | four great arts, spirit farming, abodes as sites; Core Formation |
| The atlas fill | the other continents, on the Morning Star Continent's pattern |
| M3's AI half | GLM roles, the opening, going in, the Ways, ruins and inheritances, the decks and rebirth, the tone pass |
| Guild trade and the living world | the rest of M5 and M6: guilds trading, caravans, commissions, the black market, auctions, events, NPC depth, romance, founding a sect, map tiers and long travel, beast taming |
| M7 Big moments | Nascent Soul, tribulations, heart demons |
| M8 Rebirth and friends | lifespan, reincarnation, friends build |
| After v1 | friends as NPCs, then co-op go-in sessions |
| Backlog | the art overhaul's rest, A5.3 to A9, as each screen settles |

Each stage ends playable, so stopping at any point still leaves you a game. Each opens with a design session that works down the Still to design checklist for its topics.

## Risks

The biggest unknowns are how GLM behaves through OpenRouter. The spike settled the first of them (thinking off, structured output, caching; `docs/spike-report.md`), and these stay watched.

| Risk | Early warning | Fallback |
|---|---|---|
| JSON drift | Zod failures on more than 5% of turns | a tighter schema with fewer fields, one retry, a safe fallback action |
| Prose quality varies by host | flat or repetitive scenes from some hosts | pin preferred hosts; require fp8 |
| GLM contradicts the state | narration mentions loot the engine didn't grant | outcome-first prompts; drop unlisted rewards from the tail |
| Content volume: many trees, 9 tiers each, many nodes per tier | node lists hold up a milestone | draft nodes with AI at design time, curate them, and ship only tiers 1 and 2 in v1 |
| Scope runs long | a layer runs past twice its estimate | ship the next playable layer; move the rest after v1 |
| The two economies fight | the sims show world loot outpacing seclusion, or the reverse | tune drop tables and rates in data, then rerun the sims |

## Still to design

Settle each before the stage that needs it (Roadmap), grouped by the layer that settles them. World content is drafted and checked in the atlas. The first slice plays in the Border Wilds, the Morning Star Continent's beast frontier.

**Before the economy layer**

- [x] The economy in play: settled in Economy (money by grade, prosperity, what a market holds, supply and prices, markets by reach, trading yourself, methods in the market); a sect hunting its leaked methods waits for the organizations layer

**Before the organizations layer**

- [x] A power's methods guarded (settled in Professions, people and powers, Guarded methods): how a sect learns of a leak and hunts it, and what a copy of its method costs whoever holds it (Economy, Methods in the market)
- [ ] Sects: politics, founding your own, sect wars (the skeleton, seats, posts, contribution and the atlas's types settled in Professions, people and powers, 2026-10-19); faction strength weighted by the realm curve, so a sect is mostly its ancestor; every organization on the shared skeleton (Professions, people and powers), with the atlas's powers tagged by type and an assassins' organization added (the skeleton, ranks, posts and contribution in the thin layer; politics, wars and founding in trade and the living world)

**Before crafts**

- [x] Hands-on crafts (settled in D4, 2026-10-20, under Professions, people and powers: Crafts, thin, to Production, commissions and the craft deck; technique forms in practice hours dropped): alchemy's fire control and formations as placing, laying nodes on the abode's grid so the lines close, on the qi-handling grammar; the effect table behind generated recipes; styles and their chapters; technique forms in practice hours as a maybe, the first thing to cut if it feels like filler
- [ ] The craft Daos' node lists, tiers 1 and 2, drafted with AI help and curated (their shape settled in D4: Hand, Line and Lore; drafted in K2)
- [ ] Core Formation, its own layer (Jan's call in D4: not part of crafts). Tier 3 chapters for the written methods (no qi method reaches it today), the Core-Forming Pill brewed, Core's own breakthrough. With it, Jan's thought to weigh there: breakthrough pills as supplements, not requirements, so a genius who "needs no pill" breaks through to Foundation or Core Formation without one, as the novels have it, and a pill adds safety and about 25–30% to the odds
- [ ] More insight for the new sinks (a sketch, Jan's note after K2): five craft trees and their branches now share the one insight pool with the Qi, Body and Soul trees and the combat Daos, so the sources should grow with them. Candidates beside what Insight already lists (a family's mastery burst, contemplation, lectures as in Tutelage as lectures): contemplating a masterwork you hold (a gold piece, a hundred-year herb) as a contemplation source that runs dry, a guild's or sect's archive read on study hours, a first batch of a new recipe as a small burst. The crafts checkpoint measures insight earned against the nodes worth buying by realm and settles it
- [ ] Branches in every tree (a sketch, Jan's idea in D4): the Qi, Body and Soul trees and the combat Daos split into distinct branches, as the craft trees' Hand, Line and Lore (the Qi tree's combat, growth both attended and idle, stone swallowing, utility), each with its own capstone a tier opening its next. Rebuilds P1.3, P1.6 and P2.7's fans, so it waits until the craft trees have proved the shape in play; then its own phase after the crafts checkpoint

**Before guild trade and the living world**

- [ ] NPC depth: aging and death, NPCs who climb on their own, rivals who return stronger, disciple loyalty and betrayal; a cast list of the atlas's named people (a person kind or a people file) with fixed looks, so portraits can follow
- [ ] A regional cast that lives on its own (a sketch, as in Tale of Immortal), widening Who stays: about 200 notables a region, seeded with the world, live whether or not you have met them: all its Core Formation and Nascent Soul cultivators, about 100 Foundation elders and inner disciples, and about 70 rising Qi Condensation cultivators (geniuses, clan heirs, sect prospects), the atlas's named people among them. Each season they cultivate at their pedigree's pace and roll at most one life event: a breakthrough on your rules, travel, joining or leaving a power, taking a disciple, a dao companion or a child, a feud or a duel along an enemy tie, a death. Each event is a deed on the resolver, so their ties and opinions move among themselves. They never seek you out: they go where their own wants take them, and you cross paths where they are, a rival bidding on the same lot because they want it, an elder at the gate you walk through. The famous reach you first as rumors and headlines; once met they are kept, their log already written. The cast outlives your lives, since the world's clock never restarts, and only the region you stand in ticks in detail, the rest in yearly summaries.
- [ ] Spirit fishing (a sketch, Jan's note in D4): a gathering trade like herb picking, from spirit lakes and seas, beside beast taming in the living world
- [ ] The world comes to you for your name (a sketch, Jan's note in D4): renown and craft renown bring cards, as heat brings hunters (The resolver, The world comes to you): someone asking a commission of a known crafter, a robber who knows a rich crafter's face on the road, a rival come to test a famed fighter. Cards and encounters, never the regional cast seeking you out
- [ ] Tutelage as lectures (Jan's note to try, after O3, 2026-10-19; kept from the organizations checkpoint's spec at the compaction): an elder's lecture attended a week or a month at a time, held only by an elder with the skill or a higher mastery of it, its points spent for as long as you sit there, in place of O3's bought insight hours (Professions, people and powers, What membership gives and asks, Tutelage)
- [ ] Relationships by kind (a sketch, Jan's idea after the code review): no one-size-fits-all tie. Each tie kind is data listing what it opens and how gifts, talk and opinion read through it, so each has its own verbs without new code for each: a lover, a betrothed or a dao companion opens courting, gifts that mean more, marriage, a family and children (heirs a next life can play), and for a dao companion dual cultivation and shared tribulations; sworn siblings an oath and fighting side by side; master and disciple teaching and an inheritance; a rival challenges. The shape is the organizations' skeleton turned on people: one tie record, its kind's row of acts.
- [ ] Write a manual: turning knowledge you hold into a manual item to teach, sell or lose, and sects handing out a style's next chapter by contribution, rank or favor
- [ ] World simulation: events calendar, secret realms, auctions, tournaments, wars
- [ ] Powers' events (a sketch, Jan's idea in O3, 2026-10-19): organizations act between themselves, as the novels' sects do. Sect wars, tournaments between sects, knowledge exchanges (a library opened to another sect's disciples for a season), alliances and their breaking; for clans, marriage alliances that bind two clans by a match. Each is an event on the calendar between powers along their ties, a deed on the resolver that moves their standing with each other, and you take part where you belong or stand: a disciple fights in the tournament, a clan child is the match. The regional cast and NPC lives take part too; sect wars share their rules with the Sects item (Before the organizations layer).
- [ ] Lasting changes to places (a sketch, Jan's idea after E2): events that move a place for good, not by an offset that eases back. A power taking a town, or a clan settling in it, moves its written prosperity in the save (so it eases back toward the new value) and can hand its shops to the newcomer, whose catalog then lends through reach. A spirit vein dug up and carried off, stolen, dying or planted, as the novels move them, makes the save hold a place's vein, and its market's grade, top tier, purses, vein yield and qi density follow (Economy, Prosperity). Growth and decline, as Starsector's colonies grow (Jan's question in E4's talk): a place's population is its written value plus an offset the save keeps (E4), so a place gains people each year it is fed (its basket at or above rest) and safe, up to what its vein and land carry, and loses them when it starves, is raided or its vein dies; its shops open and close by Shops by people as it does, a town emptied of people becomes a ruin site on the map, and a power can plant a new one. Slow, a step a year, and the place screen says why ("thinning: two years short of rice").

**Before M3's AI half**

- [ ] Story decks: a deck per system; what each card trades and how often it comes
- [ ] The Ways' node lists, tiers 1 and 2, at the combat Daos' shape

- [x] The realm gap (found in C2, 2026-10-20; settled in its design session the same day, under Combat: A climb, then a jump; The half-step; Protective qi's second floor; A crowd that can't scratch you breaks; Speed is tempo; and Cultivation, grades as a share of the step; C3 builds it): a realm's stages climb half the step out and the border jumps the other half, the half-step is the gap, per line, reached only by what lifts a line; grades keep their worth as 0.27 of the step a grade; purple names the half-step and pristine the next realm's, the multipliers unchanged; a junior under half a bar's Defense does a hundredth and a crowd that can't scratch you breaks, so an early Foundation beats 80 layer 9s; speed is tempo on the fleeing rule, a movement art lifting it.
- [ ] The opening redone (Sean's playtest, 2026-10-20; its design session first on the friends' line, built by The opening, built): settled so far, the clock (Character creation and the first hour: Foundation at about 2.5 attended hours on one speed factor over qi, body, soul and insight, away twice that, stretching to 4–5 once there is enough to do), a payoff by minute 10–15, the world taking a prodigy as one, and the game less idle and more a sim; it rewrites Character creation and the first hour's table and pacing targets, and adds first tasks that teach by doing (a spar for a technique, a gathering bounty, the travel stances), the rogue start with work it can find, and how a first time is shown when it appears. The journal's quest and codex formats are settled (UI and screens, The journal); the feature list is written (`docs/features.md`) and the introductions are settled (UI and screens, Introductions: the screen building itself for the first seclusion, the veil for what must not be missed, the ring for the rest, a plain narrator); and the origin's chain replaces the first-hour table (Character creation and the first hour: five quests on one skeleton, each with a reason in the world); and the rogue start (Character creation and the first hour, The rogue start: the first work bringing the method, paid work with no post, Your own way, a thread of trouble each, refusing marked harder)

**Before M7 and M8**

- [ ] Death, rebirth and legacy: what carries over, what the world remembers (the twelve years between lives and leaving things for the next life are settled under The world, Escape and death)
- [ ] Art and sound: how much, and from where. Settled so far: location art and portraits are made at design time and shipped as data, never generated in play, with shared art by tag for filled-in places; portraits wait for the cast list; sound hangs off the same engine events as combat effects. Waiting here from Sean's playtest, 2026-10-20 (Jan's call), the feel pass: a chime and a +n by the figure on every gain from a card or encounter, a chime when one arrives, an alert when an encounter comes while you are on another screen and a chime for one you can pass by, a breakthrough's fanfare and a warning before its first circle, a hint when stones run low, stones and insight placed where they are seen, your affiliation shown, warmer sunlight and godrays (still, no looping paint), pictures on cards and encounters,, a voiced intro in painted stills for each start (skippable or not, open), and coming back as a haul (Jan's note in D4): not a daily reward but what your character truly gained while away, counted up with a reveal, qi and layers, each batch's pills flipping to their rarity, herbs aged, mastery levels reached, stones in and out, nodes now affordable

**Anytime**

- [ ] Canon pass: mark atlas entries canon as you read them, the Border Wilds first
- [ ] The Breath branch from Core Formation up, and what each realm's vocabulary adds

## Sources

Prices, hosts and speeds were read from OpenRouter on 10 Oct 2026 and change often.

- [GLM 5.2 model page](https://openrouter.ai/z-ai/glm-5.2), OpenRouter
- [GLM 5.2 hosts and prices](https://openrouter.ai/api/v1/models/z-ai/glm-5.2/endpoints), OpenRouter API
- [GLM 5.2 :free listing, no hosts](https://openrouter.ai/api/v1/models/z-ai/glm-5.2:free/endpoints), OpenRouter API
- [GLM 5.3 FlashX model page](https://openrouter.ai/z-ai/glm-5.3-flashx), OpenRouter
- [GLM 5.3 FlashX hosts and prices](https://openrouter.ai/api/v1/models/z-ai/glm-5.3-flashx/endpoints), OpenRouter API
- [GLM-5.2 thinking parameter](https://evolink.ai/docs/en/api-manual/language-series/glm-5.2/glm-5.2-messages.md), Evolink API docs
- [Z.ai thinking mode configuration](https://go.tabbit.ai/model/glm-5-2/prompts/z-ai-thinking-mode-configuration), Tabbit
- [Reasoning tokens](https://openrouter.ai/docs/use-cases/reasoning-tokens), OpenRouter docs
- [Prompt caching](https://openrouter.ai/docs/features/prompt-caching), OpenRouter docs
- [Structured outputs](https://openrouter.ai/docs/features/structured-outputs), OpenRouter docs
- [Provider routing](https://openrouter.ai/docs/features/provider-routing), OpenRouter docs
- [Usage accounting](https://openrouter.ai/docs/use-cases/usage-accounting), OpenRouter docs
- [OAuth PKCE](https://openrouter.ai/docs/use-cases/oauth-pkce), OpenRouter docs
- [Rate limits](https://openrouter.ai/docs/api-reference/limits), OpenRouter docs
