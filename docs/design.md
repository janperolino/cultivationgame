<!-- The source of truth for the game's rules since 2026-10-11; edit it here. It began as an export of the claude.ai
     design doc "Cultivation Idle Game: Design & Build Plan" (revision 184), which is now a frozen archive. -->
# Cultivation Idle Game: Design & Build Plan

{date:2026-10-10} · @Jan

Build it as a web game where idle seclusion and an AI-narrated world are two views of one simulation. Your code owns every number; GLM 5.2 only interprets what you type and narrates what the rules decided. At about 12 hours a week, a playable slice lands around week 10 and the full system list around week 27.

## Decisions so far

Twelve calls are made; the rest of this plan builds on them.

| Decision | Choice | Why |
|---|---|---|
| Engine | Web: TypeScript, React, Vite | An idle game is menus and numbers, and the adventure is streamed text. Browsers do both best. |
| Players and AI bill | You and friends, on your own OpenRouter key | No accounts or backend for now; Tech stack covers how friends get access. |
| Time | About 12 hours a week | Sets the roadmap: a playable slice by week 10. |
| Cultivation | Qi is the ladder; body and soul ride along and can run a realm ahead; each ladder climbs with its own method in the twelve double-hours of your day | The Mortal's Journey model. A routine reads as a cultivator's life, not a budget sheet, and finding a body or soul method is an event. |
| Progression | The big three, each with a level and a tree, plus Dao and Way trees; insight buys nodes, and mastery is for techniques, methods and recipes | Trees hold what you understand and how you live; mastery holds what you practice. |
| Power and pedigree | One rarity scale for everything, as a band: purple is your realm's peak, gold, red and pristine the next realm; a six-line sheet with no dice, compared by ratio; a fighting-up ledger the fight sim enforces | Geniuses fight up and ordinary cultivators don't, through the same rules for players and NPCs, and the sheet says in stage words where each line stands. |
| World | Severed Heaven: a prosperous middle thousand world about a million li across, written by hand in the atlas; nested, fog of war, random start | Each area feels like everything until you outgrow it. |
| Tone | Cutthroat by default; warmth is earned | GLM leans agreeable, so the rules, not the prose, decide who betrays whom. |
| Combat | Text only: a turn-based rules engine, with free-text input on top | Creative moves earn bonuses, but your cultivation still decides who wins. |
| AI model | GLM 5.2, thinking off | Unlike GLM 5.3, its thinking can be switched off, which roughly halves the cost and cuts the wait. |
| Multiplayer | After v1: friends as NPCs in your world, then co-op go-in sessions; no shared persistent world | Most of the fun of playing with friends, with no server that owns the world, so personal calendars and editable saves stay. The core is built for it from M1: rules take any cultivator, events are typed, randomness runs in named streams and fight turns take many actors. |
| Story | One card format for everything that happens to you, idle or in the world, built in M1 without the AI; decks grow with the milestones | A seclusion event, a summons, an encounter and the coming-back summary share one engine and one screen pattern, so the game reads as a life rather than a ledger, and the AI only rewrites text. |

## How the two halves connect

> Diagram (in the online doc): seclusion turns time into qi, body, soul and insight; the world turns that power into materials, pills, methods, epiphanies and connections, which flow back into seclusion.

Seclusion turns time into power; the world turns that power into the materials, epiphanies and connections seclusion can't make. Neither half gets far alone.

Idle never stops; it changes hands. While you wander, your formations keep filling a spirit pool that you absorb when you return. Raising the pool's cap is an upgrade, and it sets how long you can stay out without waste.

**Seclusion has two states: attended and away.** You are attending while the game's tab is visible and you have touched it in the last few minutes; otherwise you are away, which is what idle has always been and keeps its name. Away is the floor and never punishes anyone. Attending pays: being there is worth ×1.25 on qi, drawing qi in by hand (Attended seclusion, under Cultivation) lifts it toward ×2, and attended hours leave insight that away hours never do. Both are rates on in-game time, so a slow clock is never stronger, and the ceiling grows later through accessories, abodes, talents, methods and nodes, but it stays a ceiling. The seat is a side income; the world is where power comes from. Go-in is uncapped because a trip brings back what seclusion can't make at all: pills, methods, manuals, epiphanies and people. The sims keep the world meatier than the seat, and the world is designed for a player who is there. Going in is away by definition, so the spirit pool fills at the away rate and nothing is counted twice. Attending counts on any screen; the planning parts of the seat, the day wheel and the trees, stay planning, with no reflex layer, and wherever the seat gets hands-on it reuses one grammar, handling qi: watch, breathe, catch, don't overheat.

The calendar runs on seclusion time: one real hour is one in-game year at Qi Condensation, close to the first guess of a minute per week. The clock speeds up with each realm so any realm's full lifespan lasts about 120 real hours: roughly 1.7 years an hour at Foundation, 4 at Core Formation, 8 at Nascent Soul. A year is 360 days, twelve months of thirty.

**The world's calendar is the Sealed Era** (封纪, the atlas's current era), settled 2026-10-14. World day 0 is the first day of Sealed Era 3,115, so a first life, born that day, reaches its first hour at 12 in 3,127, the atlas's "now". The clock never restarts: when a life ends, the world runs on and the next life in the slot starts in the world's year, which is what lets people, letters, rumors and earlier lives share one time. Years are written as numbers ("Sealed Era 3,137", "age 22"), never spelled out, since they run into the thousands.

Actions in the world spend hours or days of in-game time. Death never comes while you're offline: you wake at the edge of your lifespan with a last chance to break through. Offline time counts for up to 12 real hours, and an abode upgrade raises the cap later.

**You can run the clock slower.** Each qi realm you reach unlocks its calendar speed, and a life can run at any speed it has unlocked: a Nascent Soul cultivator can keep Qi Condensation's year an hour. Gains, costs and lifespan all count in-game time, so a slower clock is never stronger, only slower. It keeps a fast world readable, and the offline cap then covers fewer years. The choice is saved with the slot.

## World bible

The game plays out in Severed Heaven, one middle thousand world, written by hand and the same in every save; only where you're born is random. Neighboring worlds, the great worlds above and the realms past Tribulation Transcendence stay sketches until the game gets there.

**The world lives in the Severed Heaven Atlas**, `content/atlas/entries.json`, which `node tools/atlas-serve.cjs` opens as a map where every continent, region, kingdom, sect, landmark and era is an entry we both edit. The doc keeps the rules and the atlas keeps the world. Everything in it is a draft until it's marked canon.

**Scale.** Severed Heaven is a flat disc about 1,000,000 li across (1 li is half a kilometer). A kingdom is 5,000-15,000 li across, a region 40,000-80,000 and a continent 200,000-300,000. Six continents ring the Shattered Sea, where the Heaven Ladder to the great world broke 66,000 years ago.

**The tide.** Severed Heaven circles its great world, which hangs in the night sky as the Mirror, on an orbit of about 90,000 years. Close in, the Mirror's qi floods across (the High Tide); far out, it thins (the Ebb). The game is set near the peak of a High Tide, which is why sects are crowded and competition is fierce.

| World rank | What it is | In the game |
|---|---|---|
| Void sea | the endless dark between worlds | worlds drift in it, and the bigger ones' gravity gathers the smaller around them |
| Great thousand world | an immortal realm, one of many adrift in the void sea | each anchors a crowd of middle thousand worlds; where ascension leads, not expanded |
| Middle thousand world | a full world of continents, seas and sects | home: a prosperous one, with rich qi, crowded sects and fierce competition for everything |
| Small thousand world | a minor world with thin qi and a low ceiling; many crowd around each middle world | reached through secret realms and void rifts; some are broken fragments |
| Spatial cave abode | a pocket space a strong cultivator folds out of the void | inheritances hide inside them; owning one is a late-game idea for after v1 |

**History is written by hand**, big to small, along with the continents, regions, great sects and their spheres of influence. It explains the present: ruins, feuds, lost inheritances, sealed secret realms and the legends NPCs tell.

GLM gets the cosmology, the history and the powers near you in its cached context, so every scene sits in the same canon.

**Big places are written; small ones fill in.** Villages, minor sects, ruins and spirit veins fill in procedurally around the written anchors, and GLM names and describes them once, as they're made. Your birthplace is rolled from your origin talent.

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

**Money** is spirit stones, and each grade is worth 1,000 of the one below:

| Grade | Worth | Used mostly at |
|---|---|---|
| Low | the base unit | Qi Condensation, Foundation Establishment |
| Mid | 1,000 low | Core Formation |
| High | 1,000 mid, a million low | Nascent Soul, Deity Transformation |
| Top | 1,000 high, a billion low | Void Refinement and up |

Stones are also fuel: you can absorb them for qi or burn them to power arrays, so wealth and power are the same thing. Mortals trade in silver and gold, and one low-grade stone is a small fortune to them.

## Scale of destruction

The gap between realms widens as you climb, as in the novels: about ninefold from Qi Condensation to Foundation, thirtyfold to Core Formation, and a hundredfold from Nascent Soul up. The world is built around that gap. It is one number per realm, the realm curve, kept in the realms data, and everything that grows with realm follows it: power, the qi each realm needs, income, prices, and the power of items, talismans and arrays. This is a first draft to edit; GLM's world bible and the engine both read from it. Combat has its own, steeper sizes per realm (Combat, Realms are sizes), since fights should feel the full gap of the novels while the economy stays tradeable.

| Realm | All-out destruction | Senses and travel | How common | How the world treats them |
|---|---|---|---|---|
| Mortal martial master | a door, a few bones; worth ~10 soldiers | eyes and ears; a horse's pace | the strongest in most villages | heroes to mortals, insects to cultivators |
| Qi Condensation | a house; boulders shatter; worth ~50 soldiers | feels qi a few meters away; outruns a horse | thousands per region, mostly sect disciples | mortals call them immortals; sects treat them as servants and recruits |
| Foundation Establishment | a street; a hill cracks; worth ~1,000 soldiers | divine sense to ~1 km; short sword flights | hundreds per region | inner disciples and small-sect elders; mortal kings court them |
| Core Formation | a town; a hill splits, a river changes course | divine sense ~10 km; flies ~1,000 km a day | dozens per region | elders and sect masters; one can topple a mortal kingdom |
| Nascent Soul | a city; a mountain peak falls | ~100 km; blinks short distances; the soul can flee a dying body | a handful per region | sect ancestors; the strongest card a sect holds |
| Deity Transformation | a mountain range; the weather follows their mood | a whole province; crosses a continent in days | dozens per continent; every great power has several | their seclusion or anger is a political event |
| Void Refinement | a small country; space tears around them | senses through space; walks the void | a few per continent, kept in seclusion as sect ancestors | a great power's hidden foundation; whole sects exist to serve one |
| Body Integration | a great region; draws on heaven and earth | senses a continent; steps across it | about twenty in the world | a power of their own; one moving shakes a continent |
| Mahayana | a continent | senses the whole world | fewer than ten in the world | rules from behind the curtain, if at all |
| Tribulation Transcendence | the world itself strains | beyond measure | a handful, hiding from their last tribulation or waiting to ascend | heaven itself holds them back |

**Rules the world follows**

- Realm pressure: a foe two or more major realms above your soul can pin you with their aura; from Nascent Soul up, one realm is enough. You can only talk, beg or burn an escape talisman.
- A body or soul trained ahead of your realm moves that part of you up a row: a Foundation cultivator with a Core Formation body hits like Core Formation.
- No treaties, just consequences: wrecking a place inside a faction's sphere of influence costs standing with that faction. A name for killing mortals costs standing with righteous factions as far as your fame reaches; demonic sects don't care.
- Sects sit on remote spirit veins, so big fights happen in the wilds, away from mortals.
- Defenses scale with prosperity: a rich sect, city or market affords arrays rated for higher realms, while a poor village may not stop a Foundation cultivator.
- Scars stay: fights from Core Formation up leave marks the map remembers, such as a split hill or a burned valley, and the narrator brings them back.
- Cultivators can hide their realm. A stronger soul or a detection art sees through it, which keeps the weak-looking-stranger trope alive.

**How the game uses it**

- The table sits in GLM's world bible, so narration keeps scale: a Qi Condensation punch cracks a wall, never a mountain.
- The interpreter marks out-of-scale actions infeasible.
- NPC generation follows "How common": a frontier town has Qi Condensation drifters, a capital has a Core Formation patron, and a Nascent Soul arrives as a plot event.
- The engine scales area effects and collateral damage by realm.

## The world map

The world is original, enormous and nested. Each area feels like everything until you reach its top, then the map pulls back to show how small it was.

| Map tier | What it holds | Who sits at the top | How it opens |
|---|---|---|---|
| Kingdom | a mortal state 5,000-15,000 li across, a few small sects, market towns | Foundation Establishment where you can start; harsher lands hold more | where most lives start |
| Region | 40,000-80,000 li of kingdoms and wilds, rival mid-size sects, a great market city | Core Formation elders, with a handful of Nascent Soul ancestors | reach Core Formation, or a sect posts you outward |
| Continent | 200,000-300,000 li holding great sects, ancient clans and demonic strongholds | Deity Transformation, with a few Void Refinement ancestors in seclusion | reach Nascent Soul, find a teleport array, or read a great sect's maps |
| World | this whole middle thousand world: continents, seas and forbidden lands | about twenty Body Integration, fewer than ten Mahayana, a few hidden Tribulation Transcenders | reach Deity Transformation, or follow a legend |
| Beyond | the great thousand world, where immortals go | unknown | ascension, after v1 |

**Fog of war.** The in-game map shows only what you know, in four states. Seen: places you have travelled, plus a soft circle of divine sense around you (its range is in the scale table). Sketched: outlines from bought or looted maps, with nothing inside. Rumored: a mark and a name from sect libraries and rumors, with no outline. Unknown: cracked fog, the same dark glass as the rest of the game. The glass study (`docs/mockups/glass-study.html`) shows all four. The fog is kept per place, and what reveals what is under The world: travel, trips and encounters, The fog.

**Where you start is part of the roll.** A village orphan sees one kingdom and takes it for the world. A child born into a great sect starts just as weak, but with the continent's maps, its politics and its libraries. What each start knows is under The fog.

**Generation.** The big places are written by hand, as the world bible describes, and small ones fill in procedurally around them, as each kingdom's sites (The fog). The save keeps everything, so the world never changes behind your back.

**The atlas as data** (D3, 2026-10-14). Prose is the narrator's and fields are the engine's: `summary`, `lore` and `truth` stay GLM's, and anything a rule branches on is a field, never read from prose. Lore and truth are the only two layers of knowing (The fog, told and true). The fields:

- `terrain` on every land place, kingdoms included; one left out takes its region's. Sight, sites and the encounter tables read it.
- `hidden`: left out for a place anyone can see, `true` for one a Soul check or divine sense finds, or a realm for one only a soul at that realm finds.
- `access` on gated places and secret realms: what opens it (a token, a rank, an invitation, a toll in stones) and its array's realm rating, and for a secret realm an entry cap, a requirement and a cycle. The Realm of Mingled Blood: below Foundation, beast blood or a bonded beast, every 7 years for 30 days.
- `enemies` on powers, as entry ids, read by the hostile rule and the encounter tables.
- The `famous` tag, which a start reads to rumor the region's famous places.
- `features` on any place: the tagged features its scenes build from.

A generated site is the same record, kind `site` with a sub-kind (town, village, cave, den, ruin, shrine, herb valley), kept in the save; a hand-written one may join the atlas.

**Size without lag.** Regions near you simulate in detail; distant ones tick in yearly summaries until you arrive. The map view zooms between tiers, and when a new tier opens, your old world shrinks to a dot on it.

## Cultivation: the big three, Daos, Ways and techniques

Qi, Body and Soul are the big three. Qi cultivation is the ladder, as in Mortal's Journey: it sets your realm, lifespan and place in the world. Every major breakthrough needs something from the world.

| Realm | Stages | Lifespan (years) | Gate to break in | Ships in |
|---|---|---|---|---|
| Qi Condensation | layers 1–9 | 120 | none: the tutorial | M1 |
| Foundation Establishment | early, middle, late, peak | 200 | a Foundation Pill, bought, looted or brewed | M1 |
| Core Formation | 4 stages | 500 | a core-forming pill | M4 |
| Nascent Soul | 4 stages | 1,000 | a 3-wave lightning tribulation and your first heart demon | M7 |
| Deity Transformation to Tribulation Transcendence | 4 stages each | 2,000 and up | longer tribulations, stronger heart demons | after v1 |

Every major breakthrough also needs a full qi bar and an insight threshold; the gate column is the extra piece. Lifespans and gates are design values to tune, not canon.

**Breakthroughs.** When a bar fills, the next layer or stage is a check at the odds its button under the Abode's figure shows. Layers 1 and 2 always succeed, and layer 3 is the first real check. The bar keeps filling past full up to 150%, and each extra 10% raises the odds, so the choice is to go now or consolidate. An attended attempt, on any of the three ladders, is a scene on the figure: a wind-up of about four seconds where the circulation slows, the gates light round the loop one by one and the glass darkens, then for ten seconds the circulation races, a spark passes the six gates, and each one you tap or click on time adds a bounded step to the odds, like overfill (2% a gate, 10% at most); a miss costs nothing, and a tap just early spends that gate, so tapping fast never pays. The code still owns the roll. Layers 1 and 2 always succeed, so the scene teaches itself without stakes (at the figure, those steps play it on their own), and an attempt made away or on auto skips it. A failed minor breakthrough costs a fifth of the bar and a few days of unsettled qi (five), with no injury below Foundation and gains halved for 180 days from Foundation up. Offline, minor breakthroughs run on an auto setting, safe odds by default. Major breakthroughs never happen offline: the bar holds at full and the coming-back card says you are ready. A failed major breakthrough spends its offerings (the gate pill among them), halves the bar and leaves an injury that halves cultivation for three in-game years. At the lifespan edge, the last chance lets you attempt the major breakthrough below a full bar with the gate pill laid alone, at worse odds and a flawed grade at best; without the pill, or if it fails, the life ends.

**Offerings.** A major attempt on any ladder takes up to three items laid on it, spent whether it succeeds or fails. Qi majors still need their gate, the Foundation Pill or the core-forming pill, and it counts as one of the three; body and soul majors need no gate and climb on tempering alone, only slower. An offering is any item with the offer use (Items and gear), and what it does is its tags, each with a size: steadying adds odds; surging adds grade margin and costs odds; purifying halves the injury and clears toxicity; guarding keeps the bar on failure. A ladder tag, qi, body or soul, doubles the item on its own ladder: Tempered Marrow, refined from a Foundation beast, is the body offering and a Soul-Settling Pearl the soul one, and both come out of the Border Wilds' beast hunting, so M3 hands them out. Tags meet: two surging items clash, and a natural 1 on the attempt then injures as a failed major would; an offering of your root's element adds a step of odds; an offering of gold or better carries a gold method's margin to heavenly. Sizes follow rarity on the shared curve: a steadying herb gives +3 points of odds at white, +7 at purple and +12 at gold, and a surging one +0.1, +0.25 and +0.5 margin for the same odds taken away. Starting values for the pacing sim. The attempt lists everything you hold with the offer use, and the auto setting lays nothing. Settled in D2.

**The day is twelve double-hours.** Seclusion runs on a wheel of the twelve 时辰, from 子 at midnight round to 亥, and you set each hour to one thing you do with your own time: cultivate qi, temper the body, nourish the soul, study, practice a technique, or sleep. Furnace, forge, garden, beast, sect-duty and shop hours join as those systems arrive (M4 to M6). Whatever others do for you runs outside the wheel: disciples' queues, arrays, puppets and fields growing in real time. So every step of automation hands hours back to cultivation. Aptitude and talents set how fast each hour pays off, and lifespan caps the total, so spreading too thin means dying before the next breakthrough.

- Element hours: each earthly branch carries an element: 寅 and 卯 wood, 巳 and 午 fire, 申 and 酉 metal, 亥 and 子 water, and 辰, 戌, 丑 and 未 earth. Work that matches its hour's element pays about 25% more: a fire root cultivates best at 巳 and 午, alchemy is strongest at noon, and Ghost Way and other yin work belong to the night. A root matches every hour of each element it holds, so a mixed root matches most of the day and an earth root twice the hours of a fire one; that is just how it is, and the other elements find their bonuses elsewhere. Lightning and wind count as wood and ice as water, as combat does. A tempering or nourishing art may carry an element too, and then its hours match the same way; talent, resources and environment are the fast road for body and soul in any case. Dawn's purple qi at 卯 adds about 10% to everyone's qi.
- Sleep: at Qi Condensation the body is still mostly mortal, and 子 and 丑 are locked to sleep. Foundation frees them: "You no longer need sleep; two more hours are yours."
- Routines: a whole wheel can be saved as a routine, and routines are also learned from teachers, manuals and sects, such as the garrison's Watch Rotation or a hermit's Nine Midnights. Following a learned routine exactly, all twelve hours, earns a discipline bonus of about 10% on every hour; its cost is rigidity, since a routine with no body or soul hours leaves both behind. A sect can impose its own routine, morning lecture and duty hours included, and keeping it grows the Orthodox Way, so breaking routine to cultivate more is a small, real choice.
- Qi, study and sleep hours are open from the start (Jan's call, 2026-10-13, after P2.5f), and a fresh life's wheel is all qi: the first study hour is yours to set (UI and screens, You do it the first time). When a new kind of hour becomes possible, practice with the first usable technique, body or soul with its art (once it is read, if it came as a copy), and the lineage has given that kind an hour before, one hour flips to it with a chronicle line: the qi hour worth least to you, one that matches neither your root's elements nor dawn, latest in the day first. The first time in a lineage, nothing flips: you give it its hour. Rearrange freely. The same rule fills a migrated save, and the sims play the first times as a player would, at once.
- Before you know a qi method, qi hours give nothing; every life begins that way, since the origin hands over its method as a book. You read it on the study hours you set, as many as you like, and take it up once read. One study hour reads a white tier 1 method in 36 days, about six real minutes at the start; more hours read it sooner. (Until P2.8 a first copy took every waking hour by itself; Jan's call after P2.5f dropped that for the player doing it.)
- Every hour also leaves insight (see Insight below).

**Attended seclusion.** The Abode's figure shows the qi hours as they happen: motes drift in from the edge at the real qi rate, tinted by the hour's element, enter at the crown and the palms, run the circulation and settle in the dantian. Without a method the qi drifts close and slides off; unsettled, the loop jitters and sparks leak; at a full bar it runs fast and the dantian overflows. While you attend, qi speed carries one more factor, attention, from ×1.25 for being there to ×2 at full focus:

- Orbs: a steady flow, a small bright orb every three to six real seconds, each worth a little; the flow is the pleasure, not any one orb. Hover over it or drag a finger through it to draw it in; there is no breathe key, so the seat needs a pointer or a touch screen. A catch fills focus; focus drains slowly back toward the floor, and to ×1 over a minute once you're away. Orbs appear only on the Abode; the floor holds on every screen.
- The breath cycle is the skill, not aim: the figure breathes on a slow cycle, orbs tend to arrive on the inhale, and a catch timed with the inhale is worth more. A late catch still counts for its base.
- Qi heat: greedy catching warms the meridians, the circulation reddening toward the warning color, and past the threshold you tip into unsettled and lose the bonus for a while. Steady breathing is safe; greed can backfire. Nodes raise the threshold and the cooling rate.
- Orb kinds: an orb carries its hour's element, and from tier 2 nodes an orb of your root's elements is worth more; dawn's purple orbs at 卯, dark yin orbs at night, lightning orbs while a thunderstorm card is live, and knots you don't want to catch, each a data entry.
- Still Pool: resting the pointer on the dantian stops the drain, so sitting quietly is a valid way to attend. If the sim ever shows chasing beating sitting by more than the ceiling gap, the tuning is wrong.
- No tutorial layers at the seat (Jan's call after P2.8): orbs fill focus and heat builds from the first layer, so attending pays from the start and greed can burn from the start. (It was the floor only, no heat, in layers 1–3, which left the orbs hint teaching nothing.) The seat's line stays short, "Draw orbs in by hovering over them.", with the inhale and the heat behind its "?".
- Rules: orb value scales with the realm's bar so focus reaches the same ceiling at every realm; orb spawns roll on their own `orbs` stream, and a catch is an action that names who breathes; focus is never saved and starts at zero on load; under reduced motion orbs pulse in place and the circulation glows steadily; the canvas pauses when the tab is hidden, which is also how away is known, and particles are capped.

**Circulation on the figure.** The pattern the sparks run is the active qi method's `circulation`, with a default by rarity: gray a crude, uneven loop; green a clean small orbit; blue the orbit plus the two arm channels; purple the full meridian net; gold the great orbit with a second ring through the limbs and more sparks in flight; red a named pattern of its own, so the Night Bridge method lights up like nothing else; pristine the same, with the sparks run clear and rainbow-edged. Each realm then changes the vocabulary, not the count, so Nascent Soul reads as a different order of magnitude: at Qi Condensation motes from the edge of the cave and the small orbit; at Foundation strands pulled from past the frame, the great orbit through the limbs, a floor of qi under the figure; at Core Formation rivers bending toward a visible spinning core, the net pulsing from it, the air of the room moving; at Nascent Soul the cave is gone, sky and mountain behind, the region's qi leaning in, and the small figure above the head drawing with you. Rarity sets the detail inside each realm's vocabulary.

**The hour on the figure.** Nothing is added to the space round the seat: the empty dark is the realm vocabulary's headroom, and the hour shows on what is already there. The figure is a sundial. The sun lights a patch of floor round the seat and the figure's shadow is cut out of that light, since on black glass a shadow has nothing else to darken: long and falling away from the sun at dawn, a pool under the legs at noon, long the other way at dusk, gone at night, when the only light on the floor is the dantian's own, brighter as the bar fills. The same sun puts a faint wash on the glass from where it stands, warm from the horizon at dawn, pale from above at noon, orange along the floor at twilight, and the yin blue low along the floor at night, with a soft blurred rim on the figure's lit side so the body agrees with the shadow. The day runs from 卯 over 午 to 酉 and the sun rises on the right. The motes still arrive from everywhere, since this is light, not qi, and the caption still names the hour in words. Weak on purpose, felt before it is read: `docs/mockups/abode-hour-study.html` is the reference, with its default strengths (shadow 0.8, wash 0.7) as the tuning. A ring for the day wheel and a mat of the cultivator's things were tried in `docs/mockups/abode-ring-study.html` and passed over: qi arriving from one side read wrong, a lone light on a fixed path reads as a mote you can't catch, and the mat was too thin at M1.

**Body and soul cultivate alongside qi, and can run ahead.** Each climbs its own ladder of realms and stages in parallel with qi, and either can run up to one major realm, four steps of the combat ladder, ahead of your qi realm: "his body was already at Core Formation while his cultivation sat at Foundation."

- Body ahead: more HP and physical damage, and physical clashes are judged at your body level. Tribulation lightning strikes the body, so you survive tribulations more often. Artifact refining leans on body too.
- Soul ahead: wider divine sense, and you see through hidden realms. Realm pressure, illusions and heart demons are judged at your soul level. Crafting at a tier needs your soul level to reach it, so a trained soul crafts one tier above your realm.
- A failed heart demon can injure your soul and knock it back a stage or more; it heals with time and pills.

Each ladder follows the qi rules: layers 1 to 9 at Qi Condensation, then four stages per realm, a bar fed by tempering or nourishment, minor breakthroughs between stages and major ones between realms, each major one with its own insight threshold. Lifespan follows qi alone. Gate items for major body and soul breakthroughs are settled with items and gear. A body or soul you neglect stays behind, and it is judged at its own level.

**Every ladder needs a method.** Qi climbs only with a cultivation method, the body only with a tempering art and the soul only with a nourishing art, each in the hours you give it. Nobody starts with a body or soul method: your origin hands you a qi method, and the other two are found, bought or earned. Until then, body and soul grow only from the world: fights and hardship, medicinal baths and beast blood for the body; epiphanies, contemplation, near-death and heart demons for the soul. Those world sources stay the fast road even with a method, which is the slow, steady one.

**The big three have trees too.** A level is raw power and the gate; the tree beside it shapes that power, and its nodes cost insight like any other tree:

| Tree | What it shapes | Example nodes |
|---|---|---|
| Qi | how you spend your qi | cheaper techniques; faster qi recovery mid-fight; a deeper pool; purer qi for harder-hitting techniques; hiding your realm; longer flights on your own qi or any vessel (flight on a sword is the Sword Dao's) |
| Body | how your body holds up | iron skin against physical damage; blood refining for regeneration; poison immunity; endurance against tribulation lightning |
| Soul | how far and how precisely you sense and control | wider divine sense that reveals more map; soul armor against pressure and illusions; split attention for one more production queue, puppet, flying sword or practiced technique (how many swords fly is the soul's; how hard each hits is the Sword Dao's); soul search on a captive, at a karma cost; steadier crafting hands |

**The placement pass** (D2.2). Each thing sits in the tree it belongs to. The Qi tree's tier 2 flight path is Cloud-Treading Breath 踏云, flight on your own qi or any vessel, opening on Treading Air, while flight on a sword stays the Sword Dao's Sword-Riding path. Split Attention stays in the Soul tree. Names stay apart even where the uniqueness test can't see it: the Body tree's Iron Fists is Ox Hands 牛掌 (the Fist Dao owns "fist"), the Soul tree's Furnace Hands is Unshaking Fingers 不颤之指 (Fire keeps Furnace Hand) and the Fist Dao's Bone Hardening is Hard Knuckle Bones 硬骨拳 (bone tempering is the Body tree's word).

**Every tree has the same shape.** It has 9 tiers, one per realm. Each tier opens with a starter, spreads into 4 or 5 branches of small minor nodes and named notable nodes, and closes on a capstone. A tier of the big three holds about 25 to 30 nodes, laid out freely so each tree has its own silhouette; a combat Dao's tier holds 10 to 15 at the first two tiers and widens later (The combat Daos). Two or three of the branches are the capstone's: each ends in a notable that links into it, and owning those ends unlocks the capstone. The other branches are side paths, taken for their own rewards. The capstone links to the next tier's starter, so a tree climbs as one path. Capstones and a few late notables carry the multiplicative effects that help a build fight up a realm; everything else adds. A Dao's tier bonus still counts once you own half that tier's nodes. Tier 1 nodes cost 10 insight for the starter, 20 to 55 for minors, 120 to 140 for notables and 300 for the capstone, about 1,670 a tree; tier 2 costs 150, 150 to 300, 600 to 650 and 1,500, about 9,200 a tree. Starting values for the pacing sim.

**The Breath branch** is a side path of every tier of the Qi tree that only pays while you attend (Attended seclusion), a player-style branch the way Stone Eating is a resource branch, so an idler skips it with nothing lost and nobody reads it as a tax. Tier 1: Grasping Breath (wider catch reach), Lingering Breath (focus drains slower), Whale Swallows the Sea (a higher focus ceiling), Twin Streams (one breath catches two orbs), Cooling Channels (more heat before unsettling) and Still Pool (resting on the dantian stops the drain), cheap and early. Later tiers turn the orb kinds on: Attuned Breath (your root's elements worth more), Heaven and Earth Resonance (dawn and tide orbs), Circulating Thought (focus also feeds insight faster), Unknotting (knots harmless). Each is an entry with a stat the core reads as it reads `qiGain`. Tier 2, drafted in D2 as the Qi tree's Foundation side path: Even Breath (focus drains slower) and Deep Catch (wider reach) as minors; Attuned Breath (an orb of your root's elements is worth half again); Heaven and Earth Resonance (dawn's purple orbs and the night's yin orbs worth double, and dawn's come more often); Circulating Thought (the attended insight trickle grows with focus, half again at full); Unknotting (knots are harmless, and a caught one gives a little); and Long Breath (a slower breath cycle that catches more a breath). Six or seven nodes, cheap like tier 1's. The branch is added when a build next touches the Qi tree, P2.3 at the latest.

**Insight is the universal currency of understanding.** It buys nodes in every tree except the Ways, which grow only by deeds. Every major breakthrough also needs an insight threshold on top of its fuel: qi for your realm, tempering for your body, nourishment for your soul. The threshold counts insight ever earned, so spending insight on nodes never delays a breakthrough.

Insight is what attention leaves behind, so it comes from everything you do:

- every hour of cultivation leaves a trickle, rising with your realm, since higher realms understand more per day
- attended hours leave a second trickle away hours never do (How the two halves connect), a rate like the first, small enough that a weekend away costs a node or two, never a tier
- study hours add a steady stream
- practice and cultivation: each mastery level a technique, method or recipe reaches releases a burst, the moment a form finally clicks
- contemplation of a manual, an ancient Dao stele, a teacher's or sect's lecture, a waterfall or a thunder peak; each source has its own yield, some run dry, and manuals and inheritances arrive in lumps
- enlightenment pills and Dao incense
- crafting hours, from M4
- epiphanies the narrator tags, and near-death fights, from M3

Aptitude and talents multiply all of it, and an epiphany also leaves a discount on its related Dao. Insight is one currency whatever it came from. Starting values at tier 1, ×3 per tier like practice days: a technique's levels burst 5, 20, 60 and 150 insight and a method's 10, 40, 120 and 300; manuals and lectures are lumps of 10 to 50; steles and places trickle 0.5 to 2 a day with a supply that can run dry. Cultivation's trickle is 0.05 a day from the waking hours and a study day gives 1, both times the realm's rate (×1, ×3, ×9 and up), and the attended trickle matches the first.

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

**Techniques** are the moves you actually use, learned from manuals, teachers, inheritances and epiphanies: a manual is a copy you read over study days, and the rest teach at once (Reading, below). Each lists its requirements: a Dao tier, a realm, sometimes a body or soul level or a Way. Flying swords are a family of Sword techniques that also need a strong soul, and elemental spells are techniques of the element Daos.

Builds fall out on their own: the Demonic Way plus Sword techniques is a demonic swordsman, and the Demonic and Buddhist Ways together make a demon Buddha. The Orthodox Way plus the five element Daos on a five-element root is a five-element spell cultivator. Sword Dao plus a tempered body never needs a flying sword.

**Lines, chapters and kinship.** Techniques and methods belong to lines. The Clear Heaven Sword Canon is one line, and its chapters climb the realms: chapter 1 at Qi Condensation for outer disciples, chapter 2 at Foundation for inner disciples, chapter 3 at Core Formation for core disciples only. A chapter's requirements can include a sect rank, beside realm, root, talent and Dao tier. What belongs to a line is written in the data, never guessed from names.

- A technique's next chapter needs the one before at Comprehension, and starts below it: one mastery level down, or two if the new chapter is of a higher rarity, never below Glimpse. The old chapter stays known and usable.
- A method's chapters follow the same rule through the method's own mastery: the next chapter starts one level below the old one, two if it is rarer, and a method of a new line starts at Glimpse. The bar is never touched. A fresh method runs at little more than half speed and a deep one above full (Mastery below), so leaving a method costs more the deeper you were: staying in your sect's line pays, and a stolen demonic method has a real price.
- Kinship: two different lines that share a Dao and a form, two sword thrusts say, speed each other's practice by about a quarter while a kin sits at Comprehension or above, without carrying mastery over.

**Manuals are nodes the world gives you.** Trees are yours and grow by realm; manuals are found, bought, inherited, written or stolen. A manual is anything learnable that carries nodes, one mechanical kind with a `nodes` list, from a single node to a small external tree with its own branches, requirements between its nodes, a capstone, and chapters per realm tier like a method's, the next chapter coming from a sect by contribution, rank or a master's favor, or from the world. The fiction supplies the size and the name, never a new mechanic: a *Formula* (口诀) is one or two nodes; a *Style* bundles craft nodes onto a craft Dao, *Clear Fire Sect's Alchemy Style*, and holds the sect's own recipes as nodes, so its pills are brewed by nobody else without stealing the manual; an *Art* is a technique and its nodes, which wake as the technique masters; a *Method* a ladder and its nodes, unsealed by mastery rather than realm; a *Scripture* (经) a big gold or red bundle; an *Inheritance* a ruin's or dead master's whole tree. Manual nodes cost insight like any node, by rarity, with requirements where they make sense. Hold two styles and both count: a cultivator who has read a hundred manuals should feel it, so there is no slot limit, small effects add without limit on the same stat, and multipliers and rule changes come only from purple up and go through the fighting-up ledger with gear and nodes, so the ledger stays the one place that caps a build. A white formula is +5% qi gain; a gold scripture changes how overfill works. White to blue manuals are generated from an effect table and named once, by template or GLM, like the small places; purple and above are written by hand. Manuals and trees never unlock each other: trees link to trees, and a manual is self-contained. From M5, *write a manual* turns any knowledge you hold, nodes or recipes, into a manual item to teach, sell or lose.

**Where manuals live** (settled in D2.2). Every manual names a host tree, and the Trees screen draws it grafted beside that tree: on the host's canvas, joined to none of its nodes, so a Cloud Saber Art stands in the Saber Dao's canvas beside the Saber tree, the way the discoveries edge hangs found recipes off a craft Dao's rim.

- Hosts: a Method grafts beside its ladder's tree, an Art beside its technique's first Dao (Sinkhole Stone Fist's Art beside Earth), a Style beside its craft Dao, and a Formula beside the tree its effects touch: the Garrison Breath-Count, Tide-Counting and Bone Wall Watch formulas beside Qi, the Beast-Butcher Sinew Formula beside Body, the Stone Eyes Lamp Formula (insight) beside Soul. Authored manuals name their host in the data; a generated one takes it from its first effect's stat, a qi, body or soul stat to that ladder's tree and a Dao's stat to that Dao. A Scripture, an Inheritance or a Formula of mixed effects has no host and stands under the Manuals category as a small tree of its own. A manual never waits for its host (Jan's call after P2.5c): holding it opens that tree on the Trees screen even before its ladder does, showing only the manual's graft until the ladder opens the tree's own nodes (UI and screens, Only what you have touched shows). Only an Art whose Dao has no tree drawn yet (Wind, Lightning, Ice) stands under Manuals until that tree is drawn.
- Grafted means drawn beside, never joined: no requirement crosses between a manual and a tree, so losing a manual never strands a tree node.
- The layout (Jan's pick, 2026-10-13, replacing D2.2's column of clusters beside the tree): every tree is an opening fan (UI and screens, The trees are opening fans), and each manual is a jewel in the crown on the rim of the band its nodes unseal in (a Method's or an Art's own tier), never an edge into a tree node. The jewel wears its rarity's color with a soft glow, a pip under it per node (lit when learned, ringed when ready), and a slow pulse while one of its nodes is ready; a sealed band's jewels are dim.
- The crown's order: the crown runs 16° past the tree on each side, never past level, with a slot every 42 px of rim (44 at first; P2.7 tuned it). The rarest manual takes the slot just right of the peak, the next the slot just left, and so on outward, the inner row filling before the next, with the order held breaking ties, so a new white lands at the crown's end and moves nothing, and a new gold slides in near the peak and moves only the lesser ones one slot out. The peak keeps a 3° gap on each side for the climb into the next tier. A band whose manuals outgrow its rim grows another row 46 px further out and every band above steps out with it: Qi Condensation holds 54 in its first row and 110 in two, Foundation 98 in one. A line's next chapter keeps the angle of the chapter before it, one band up, and the slots beside it step round it.
- A click blooms the jewel in place: a disc over its neighbours with the jewel at its heart, its nodes on a ring above it in requirement order (a chain along the ring, a fork as two arcs from one node), lit as learned, and its name below. Its nodes act as the tree's do, and a click on the heart closes it. A hand-written manual from purple up may place its nodes in its bloom itself. The host's entry in the tree list counts its manuals ("Qi · 3 manuals"), and so does each band's name ("Tier 1 · Qi Condensation 炼气 · 72 manuals").
- An Art is one technique and a small external tree of nodes built on it. The technique is never a node: you learn it however you learn it, it is the Art's jewel, at the heart of its bloom, and the nodes are passives you buy on it with insight. They wake as the technique masters, the way a Method's do: the first at Comprehension, then Mastery, Perfection and Origin, and past four nodes the extras share a level. By rarity an Art holds 1, 1, 2, 3, 4, 5 and 6 nodes from white to pristine, so practising white Rampart Palm to Comprehension opens its one node. Its nodes can be any stat: the technique's own (+10% power, −15% qi cost, a critical staggers) or yours (+3% HP, +2% qi recovery, +4% Agility), so practising a technique grows the cultivator too. They follow the manual rule above, small adds to anything and multipliers and rule changes only from purple up, so below purple an Art never reaches the ledger. A technique's next chapter (Lines, chapters and kinship) is its own Art.
- Every technique has its Art. Learning the technique by any road, a manual, a teacher or an epiphany, gives you its Art, the way a known method keeps its manual.
- The Manuals category on the Trees screen shows the hostless manuals on top, a list of them beside one focused tree at a time (even a one-node Art), and, below, a shelf of every manual held by kind, each a link to its graft. Past eight, the list takes a search, a chip per kind and Hide finished. The focused manual's tree is a small fan like the real trees, opening upward from its first node with its tier bands in ascending order, and its nodes are read and learned in place as a tree's are, with no list of nodes under it (UI and screens, The trees are opening fans). The Character screen keeps one line, "Manuals: 7 (5 formulas, 1 method, 1 art)", linking there.
- The shelf is a bookcase (Jan's pick, 2026-10-13). A plank per kind, rarest first, with Scriptures and Inheritances together as Above the trees and short shelves sharing a plank. Each manual is a standing spine: its rarity's color as a band on top, its hanzi in brush down the spine with no box round it, a binding per kind (a Formula bamboo slips, a Method thread-bound, an Art a scroll on rods, a Style a folded album, a Scripture jade slips, an Inheritance a sealed case) and a pip per node. A manual with every node learned lies flat in a stack at its shelf's end ("62 finished"), which stands back up on a click. The English name lives on the hover card, which says what the manual is: name, hanzi, rarity, kind, host, and every node with its effect and whether it is learned, ready or waiting. A click opens its jewel, bloomed, on the host's fan, or focuses a hostless manual's tree above. The bookcase is also where every copy you own stands, read or not (Reading, below).

**Reading** (settled 2026-10-13, Jan's calls). A manual, a method or a technique handed to you as a thing, bought, given, found or stolen, arrives as a copy: an item of the manual kind with the read use. Taught to you, by a person face to face, an epiphany, an inheritance or an opportunity, it is yours at once. There are no exceptions (Jan's call after P2.5f): an origin's starting method is handed over as a book, so a life begins reading it, about half a real minute for a white method on the whole wheel; a first technique a senior shows you is taught. Each card says which it does.

- The bookcase is the book inventory. A copy never takes a Bag square: it stands on the bookcase from the moment you get it, a method's as a Method spine and a technique's as an Art spine, unread at first, with a paper band across the spine and its pips dim, and its hover card offers Read. A copy found on a trip rides home weightless and is shelved on arrival; a raid on the abode can take books.
- An unread copy grafts nowhere. A manual grafts beside its host tree only once it is yours, so the trees show what you know, and the hover card already lists what reading it would give; a click on an unread spine pins that card open with Read instead of opening a graft.
- You read a copy on your study hours, one at a time, from a queue (Jan's call, 2026-10-13: a queue, not slots, since splitting the hours would only finish every copy later). Read adds a copy to the end of the queue; when one is done the next begins by itself, and one that can't be read yet stays in the queue, skipped, saying what it waits on. A new copy joins an empty queue by itself, so nothing waits unread for want of a click. A copy takes study days by its rarity, 3, 5, 8, 12, 20, 30 and 45 from gray and white to pristine (gray as white), ×3 a tier, so two study hours a day read a white formula in about 18 days, and a tier 5 pristine scripture takes decades. The study hours still give their insight while you read, and progress stays with each copy if it leaves the head of the queue.
- Reading speed is the study days your study hours give × Aptitude × how well it suits you. Aptitude is comprehension, so it speeds reading as it speeds practice and insight; the Practice stat is drilling and leaves reading alone.
- **Suits you** (Jan's call, 2026-10-13) is one multiplier with a "?" saying why, built from the rules that already say a thing fits you: a method's fit to your root, as it scales qi speed; a technique with a kin you hold at Comprehension, the quarter that kinship gives practice; a copy of an element your root holds; and your tiers in a technique's Dao. It is capped so no fit makes a scripture an afternoon's read. Practice's kinship can fold into it later, so there is one idea of fit rather than three.
- Finishing makes it yours as any road does: a manual held, a method known (switching to it is still your choice), a technique at Glimpse or, for a line's next chapter, where the chapter rule starts it. It also gives a lump of insight, 10, 15, 20, 30, 40, 50 and 60 by rarity, ×3 a tier, as contemplating a manual always did.
- A copy checks what learning it would check before you start: a next chapter needs the one before at Comprehension, and one you already know says so.
- Reading never uses the copy up: the band comes off and the pips light, and the copy stays on the bookcase. Knowing a thing and owning copies of it are separate: a spine stands for anything you know, copy or not (a technique a teacher gave you has none), and a second copy of something you hold counts on the same spine ("×2") instead of taking another, the count showing only from two. M5 adds Take down, a copy off the shelf to sell, give or teach with, and *write a manual*, which writes a new copy of anything you know, so giving away your only copy never costs you the knowledge.

Some techniques ask for two trees at once, such as a blood-sword art that needs the Demonic Way and Sword Dao. v1 ships the Orthodox, Demonic and Buddhist Ways, the five element Daos, Sword, Saber, Spear and Fist, the four great craft Daos, and the first tiers of the Qi, Body and Soul trees.

**Methods** are the manuals each ladder climbs with: cultivation methods for qi, tempering arts for the body and nourishing arts for the soul. A method is a bundle of independent fields: a ladder, a tier, a rarity, a line and chapter, a fit, requirements, an upkeep, a growth profile, breakthrough bonuses, properties and a source, and any combination is legal: a red method with no requirements and no upkeep that is merely rare and expensive, a gold one that asks for a talent, a blue one that eats two stones a day. There are no kinds. Qi speed is root speed × method × fit × qi density × Aptitude × attention, where the method part is its tier bonus × rarity × mastery and attention is ×1 away (Attended seclusion).

- Tier caps it: a method gains nothing on a ladder above its tier. Breaking through needs nothing from the method; the pill, the full bar and the insight carry you over, and then the old method runs out, so you switch to its next chapter or a new method and gain nothing until you do. The breakthrough is the natural moment to change methods; if you already hold the next chapter, switch before the attempt, since the method active at an attempt is the one that builds the new stage (Growth below). A method whose tier sits above your realm cultivates faster, by one realm's gap (×3 at Qi Condensation, ×5.5 at Foundation, ×10 from Core Formation up). That bonus counts once, however far above you the tier sits; a higher tier mostly buys a longer road without chapter changes.
- Rarity sets speed on the curve everything shares (Tier, rarity and pedigree), so a red Qi Condensation method cultivates almost like a white Foundation one, then stops at its peak.
- Growth: every stage you climb records the growth of the method that climbed it, and it stays. A qi method leaves pool, purity (technique power) and recovery; a tempering art HP, physical damage and regeneration; a nourishing art soul defense, divine sense and perception. The total a method leaves over a full realm is its rarity on the shared curve less one, at tier 1 about −20% at gray, +10% at green, +25% at blue, +50% at purple, +130% at gold, +170% at red and +280% at pristine, and its profile splits the total: a deep-sea method is mostly pool, a pure-flame method mostly purity. Fit scales growth as it scales speed, which is how a fitting method hits harder. A stage climbed with no method active, on the world's tempering alone, takes a white method's growth. Switching never rewrites the past: your foundation is what you built it with, and a poor method's stages stay poor until a re-refining pill (M4). Across realms growth counts as a weighted average with the realm curve as the weights, so the current realm dominates, an earlier foundation still shows a little, and the total never exceeds a red band; a plain sum would run away. The Character screen shows it per realm, "Qi Condensation foundation red, Foundation white so far", never as one shrinking number. Growth is set, never rolled, since gentle mode's rewind lands at a breakthrough.
- Breakthrough bonuses: the method active at an attempt adds to the odds of any breakthrough, to a major one's grade margin and to mercy on failure, by rarity: gray −2 points of odds; green +2; blue +4; purple +7 and the injury halved; gold +12, +0.25 margin and the injury halved; red +16, +0.5 margin, the injury halved and no bar lost; pristine +20, +0.75 margin, the injury halved and no bar lost. Heavenly still needs gold or better; with red's margin it is in reach with one of body or soul ahead rather than both.
- Properties: rarity's special properties (Tier, rarity and pedigree) are a method's gear-like extras while it is active, none at white, a named unique at red and an artifact spirit at pristine: the Night Bridge method gaining more at night hours, a demonic one devouring beast cores for qi.
- Mastery: a method runs Glimpse to Origin like a technique, raised by every hour you cultivate with it, and its level scales its speed alone (Mastery below), so nobody waits at a full bar for a level before a breakthrough. Switching methods is paid in mastery, never in bar (Lines, chapters and kinship).
- Fit: a method that matches your talents cultivates faster and hits harder. A five-element root on a five-element method gets the full affinity bonus; a mismatch still works, slowly.
- Requirements run from nothing but qi density (your spirit vein and gathering arrays) to long lists: a root, a physique, a Dao, a Way, a place, a ritual.
- Upkeep: some methods drink stones, herbs, blood or karma every day and stall on an unfed day, gaining nothing; the origin methods have none. A demonic method that grows by hunting people and draining their qi or blood is the fastest climb in the game. It also sinks karma, spreads notoriety and feeds heart demons. Upkeep comes in two weights, counted in days of your realm's wage (Economy): light drinks half a day's wage each day and heavy two days', so a heavy tier 1 method eats 2 low-grade stones a day against a Qi Condensation income of a few, and nobody runs one on seclusion alone. Item upkeep is one item of the method's tier a day, blood a vial, karma a point. Settled in D2.
- Special methods come from inheritances, secret realms and sect vaults, not shops.

**Fighting a realm up** comes from stacking advantages, never from one feature, and how far a cultivator gets depends on pedigree (Tier, rarity and pedigree). A realm is a wall (Combat, Realms are sizes): an ordinary cultivator never closes one and can only flee, talk or call for help, and a great-sect disciple in purple does not either. A sacred-land genius in gold crosses about half the time at the middle realms, and a chosen of heaven, red and gold with a body a realm ahead, crosses almost always, since every line of his sheet already sits at the next realm. Against an equal pedigree the higher realm wins, and nobody fights two realms up, not even in pristine. The fighting-up ledger under Combat sets the targets the fight sim holds. Breakthrough quality is one of the advantages: every major breakthrough is graded flawed, ordinary, superior, perfect or heavenly, worth −1 to +3 stages in a fight. Heavenly needs a method of gold or better.

The rest of the stack: a body or soul ahead of your realm, the rarity of your techniques, methods and gear, technique mastery, Dao tiers, Way nodes, talismans, talents, terrain and creativity. Each closes part of the gap, enough of them close it all, and the fight sim holds the ledger's targets.

A major breakthrough's grade depends on the margin you bring, scored 0 to 4 (settled in D2.1): qi past a full bar, up to a point at 150%; insight earned past the threshold, up to a point at double it; body and soul, half a point each at the current realm's peak and a full point at the new realm; and the method's margin (gold +0.25, red +0.5, pristine +0.75) and the offerings laid on the attempt on top. Ordinary needs 0.75, superior 1.75, perfect 2.75 and heavenly 3.5, and heavenly still needs a method of gold or better, so a cultivator with body and soul at layer 9 and everything else full can lay a perfect Foundation, and heavenly needs one of them actually at the new realm. Rushing in at the bare minimum saves lifespan but leans toward a flawed grade, so the time budget matters here too.

A grade gives three things, all shown: stages in a fight on every line of the sheet (flawed −1, ordinary 0, superior +1, perfect +2, heavenly +3; Combat); cultivation speed on that ladder for the whole new realm (−15%, 0, +10%, +20%, +35%); and the odds of the next major breakthrough on that ladder (−3, 0, +3, +6, +10 points), since a sound foundation makes the next step easier. Once a later major passes it, a grade echoes on for life at a third of its speed and odds (Jan's call after P2.4), so a heavenly Foundation still gives +12% speed and +3 odds at every realm above, a flawed one stays a scar of −5% and −1, and heavenly at every realm comes to about ×1.6 speed by Nascent Soul. Fight stages take the latest grade alone: echoed there, a third of a stage tipped three rows of the fighting-up ledger off its cliff. The breakthrough panel at the Abode (UI and screens) shows a grade meter, a bar from 0 to 4 with the five thresholds marked, filling as each source lands with every segment labeled, and the grade it earns as it stands; the Character screen lists each ladder's grade per realm with what it gives ("Foundation: perfect, +20% speed, +2 stages"), and an earlier one's echo. Minor steps have no grade.

**Mastery belongs to techniques, methods and recipes.** Each runs Glimpse, Comprehension, Mastery, Perfection 圆满, Origin, raised by use (the fourth level was Domain until D2.2 gave that name to the Intent ladder's stage, The combat Daos). A technique's or recipe's level adds +2 to checks with it. A method's level scales its speed, and its levels come about six times slower than a technique's, since every hour cultivating with it counts:

| Level | Practice days at tier 1 (×3 per tier) | Method speed |
|---|---|---|
| Glimpse | 0 | ×0.6 |
| Comprehension | 30 | ×0.8 |
| Mastery | 180 | ×1.0 |
| Perfection | 720 | ×1.1 |
| Origin | 2,400 | ×1.2 |

An hour with a method or a technique is a twelfth of a practice day. At six qi hours a day Mastery lands about an hour into a life, inside the tutorial; a new line taken at Foundation runs below full speed for about two in-game years and forgoes Perfection or Origin's bonus for longer. Starting values for the pacing sim.

**Practice slots** (Jan's call, 2026-10-13, after P2.5b). Practice days go to the techniques in your practice slots, split evenly: one technique practices at the full rate, two at half each, three at a third. You start with one slot, and each point of split attention opens another, up to three in v1: the Soul tree's Split Attention and the Twin Soul talent each give one, the same point that runs one more production queue, puppet or flying sword. Slots never add practice, only spread it, and the day's total grows with the Practice stat alone (the Soul tree's practice nodes, a formula). A sealed technique or one at Origin can't sit in a slot, and reaching Origin frees its slot for the others with a toast; the slot stays empty until you fill it, so practice never picks for you (Jan's call: a queue here would play the game itself). Kinship lifts each technique's own share. Spreading pays in two ways that one slot already allowed by switching: early levels release more insight per practice day (at tier 1, Comprehension 1.25, Mastery 0.77, Perfection 0.5, Origin 0.33), and a kin can climb to Comprehension beside your main technique.

"Flowing Cloud Blade at Comprehension" means a Foundation-tier sword technique at its second mastery level.

**Talents** are rolled at birth, and each rebirth rolls them again. There should be dozens; five kinds to start:

| Kind | Examples | What it changes |
|---|---|---|
| Spirit root | single-element heavenly root, five-element root, mutated lightning or ice root; the Innate Sword Root 天生剑根 (gold: a metal root with a sword's edge, Sword Dao insight and sword checks up); the Yin-Yang Twin Root 阴阳双生根 (purple: water and fire in balance, with no clash between them) | qi speed, which methods fit, element affinity |
| Body | iron-bone frame, blazing-yang body, a beast bloodline, frail meridians; the Pure Yang Body 纯阳之体 (gold: fire hits harder, yin chill can't touch you, lightning bites less); the Nine Yin Body 九阴之体 (purple: yin methods fit, Ghost Way grows faster, fire hurts); the Innate Dao Body 先天道体 (red: every ladder trains faster and breakthroughs come easier); the Glazed Glass Body 琉璃之体 (pristine: flesh like the uncracked glass of the heavens, hard, quick to heal and proof against poison) | body training speed, HP, poison and tribulation resistance |
| Soul | innate divine sense, twin soul, a soul scarred in a past life; Formation Eyes 阵眼之瞳 (gold: you see the eye of any array at your soul tier, and Formation Dao insight rises); Sword Heart 剑心 (gold: sword techniques master faster, and sword intent can't shake you); an Unbreakable Dao Heart 道心如铁 (purple: heart demons and illusions lose their grip, grades edge up); Dao-Seeing Eyes 观道之眼 (pristine: you see the pattern under things, so insight, perception and Aptitude all rise) | soul training speed, resistance to pressure and illusions, crafting precision |
| Fate | heaven's favored, calamity star, late bloomer, karmic debt; a Child of Fortune 气运之子 (gold: Fortune up, encounters lean lucky); Heaven's Jealousy 天妒 (double-edged: tribulations hit harder, grades run higher); an Old Soul 转世之魂 (red: sleeps until Foundation, then a past life wakes with a lump of insight and a lost chapter); a Child of the Severed Heaven 断天之子 (pristine: the cut heavens have a stake in you, so luck, encounters and tribulations all bend your way); the Unsevered Thread 不断之缘 (pristine: sleeps until Core Formation, then something on the far side of the cut answers) | fortuitous encounters, disasters, tribulation strength, talents that wake late |
| Origin | village orphan, merchant's child, minor clan heir, great-sect disciple | where you start, how much of the map you know, early allies and enemies |

Every talent has a rarity, on the scale everything shares (Tier, rarity and pedigree): gray (a flaw that lowers a stat), white (plain), green, blue, purple, gold, red and pristine. Body, soul and fate talents roll their rarity on one table: gray 10%, white 40%, green 35%, blue 10%, purple 4%, gold 0.9%, red 0.1% and pristine 0.01%, out of white. Spirit roots use the table under Character creation, where white is the floor; origin has no grade. Kinds and names are mostly flavor, and each talent in the end moves stats: a spirit root its qi speed and method fit, a body talent body training speed, HP, Agility or resistances, a soul talent soul training speed, Aptitude or soul defense, and a fate talent Fortune, Aptitude or the odds of encounters. Some talents sleep until an event wakes them, and a past life's achievements buy rerolls at rebirth. Aptitude can also rise after birth, slowly and at great cost, through marrow-washing pills, spirit-spring baths and heaven-and-earth treasures, so a talentless orphan has a long road to genius. These are settled with items and gear. Talents that touch a Dao or an array, the sword root and the formation eyes, move stats nothing reads yet, Dao insight, Dao checks and array sight, stored like the combat stats until those systems arrive.

## The combat Daos

The five element Daos and the four weapon Daos of v1, with their shape settled and tiers 1 and 2 drafted in D2. P2.3 writes the nodes as data, as P1.6 did the Qi tree.

**Combat Daos are narrower than the big three.** A cultivator holds one Qi tree but several Daos, and insight is one currency across all of them, so a Dao tier holds 10 to 15 nodes at Qi Condensation and Foundation and widens from Core Formation toward the big three's 25. Tier 1 is a starter, three gating branches of three nodes each (two minors and a notable), one side path of two or three, and a capstone: 12 to 14 nodes, the tier held at 6 or 7. Tier 2 adds a second side path and a node to each gating branch: 15 to 18. Minors add small percents to the Dao's damage type, hit or cost; notables add a status or a rule twist; capstones multiply or change a rule, and each links to the next tier's starter. Every tier held also gives the Dao's own +1 to checks and +5% to effect (Cultivation, Daos). Each element Dao's side path reaches into a craft, so the Dao a crafter wants is the one their furnace or forge leans on. Every number is a starting value for the fight sim.

**Fire**, harm and burning. Tier 1: Kindling (fire damage), Searing (burn lasts longer and bites harder), Furnace Heart (fire techniques cost less qi); side path Ember Sense (heat, and alchemy's fire control); capstone Rising Flame, fire damage ×1.1 and a critical spreads the burn to a second foe. Tier 2: Blue Flame (fire ignores a share of fire resist), Lasting Burn (burns stack), Flame Heart (fire costs less, heat tolerance); side paths Ash Walk (fire resist) and Furnace Hand (alchemy precision); capstone Sea of Flame, every burn ticks on every burning foe at once.

**Water**, flow, chill and recovery. Tier 1: Deep Current (water damage), Chill (chill slows turn order), Flowing Form (evasion); side path Still Water (qi recovery); capstone Undertow, a chilled foe loses its minor action. Tier 2: Abyss (water damage), Freezing Edge (a critical on a chilled foe freezes), Mist Step (the first hit against you each fight does half); side paths Deep Spring (qi recovery out of a fight) and Tide Sense (perception and travel at sea); capstone Riptide, chilled foes take water ×1.2.

**Wood**, rooting, regrowth and poison. Tier 1: Verdant (wood damage), Rooting (roots hold longer), Regrowth (regeneration); side path Herb Sense (spirit farming, herbs found); capstone Deep Roots, regeneration ×1.5 while a foe is rooted. Tier 2: Overgrowth (wood damage), Binding Vines (a rooted foe cannot flee), Spring Return (regeneration between fights ×2); side paths Old Growth (herbs age faster in your garden) and Venom Bloom (poison damage); capstone Evergreen, once a fight you keep a quarter of your HP when a blow would fell you.

**Metal**, edge, bleed and guard. Tier 1: Edge (metal damage, +2% crit), Bleed (bleeds stack), Iron Guard (physical resist); side path Ore Sense (refining, ore found); capstone Tempered Edge, bleeding foes take metal ×1.15. Tier 2: Killing Edge (crit chance), Severing (bleed on any hit), Steel Skin (physical resist, stagger resist); side paths Forge Sense (refining precision) and Ringing Strike (hit); capstone Unbreaking, a bleeding foe's armor counts a rarity step lower.

**Earth**, weight, stagger and standing firm. Tier 1: Weight (earth damage), Stagger (staggered foes lose turn order), Mountain Stance (hold, HP); side path Vein Sense (geomancy, veins found); capstone Unmoved, the first hit against you each turn does half. Tier 2: Landslide (earth damage), Crush (staggered foes take earth ×1.15), Bedrock (hold); side paths Spirit Vein Sense (abode sites) and Burrow (cover anywhere, escape underground); capstone Mountain Falls, a critical staggers every foe.

**Sword**, precision and the single strike. Tier 1: Sword Heart (hit), Keen Edge (crit faces), Sword Qi (technique power at range); side path Sword Bearing 剑势 (intimidate, and talk checks against the timid; renamed in D2.2, since Sword Intent is the Intent ladder's); capstone One Sword, the first sword strike of a fight at ×1.5. Tier 2: Clear Heart (hit, and daze cannot touch you), Sword Light (critical damage), Flying Sword (sword qi at full power at range); side paths Sword-Riding (flight on your sword) and Sword Pressure, Sword Bearing's second step (a sword's pressure as an aura); capstone Sword Rain, once a fight a sword technique strikes every foe.

**Saber**, force, momentum and the cleave. Tier 1: Heavy Cleave (harm), Momentum (each hit in a row adds damage), Butcher's Nerve (crit faces against wounded foes); side path Roar (intimidate); capstone Cleaving Tide, momentum carries over a miss. Tier 2: Mountain-Splitting (harm), Tide of Blades (momentum climbs faster), Executioner (criticals on wounded foes ×1.25); side paths Bone-Cutter (bleed) and Tiger Roar (fear, a foe may lose its turn); capstone Unstoppable Cleave, a critical carries half its damage to a second foe.

**Spear**, reach, the first strike and the line. Tier 1: Reach (turn order), Piercing (ignores part of resist), Wall Drill (defend gives more); side path Sweep (a second foe takes half); capstone First Blood, you strike first in the first turn. Tier 2: Long Reach (turn order, the first strike each fight at ×1.25), Armor-Piercing (ignores more resist), Shield Wall (defend covers an ally); side paths Whirl (sweep hits all adjacent) and Banner (allies gain hit); capstone Dragon Thrust, your first thrust each turn cannot miss.

**Fist**, the body, speed and closeness. Tier 1: Iron Fist (physical damage), Flurry (a minor-action strike), Rooted Stance (stagger resist, hold); side path Breath of Blows (qi back on each hit); capstone Hundred Fists, a critical grants a second main action, once a fight. Tier 2: Steel Fist (physical damage), Storm of Blows (the flurry strike at full power), Immovable (stagger and unbalance cannot touch you); side paths Palm Wind (a palm at range) and Second Wind (regeneration in a fight); capstone Fist and Body as One, unarmed strikes count your body a stage higher.

**The Intent ladder** (settled in D2.2). Every combat Dao has a ladder beside its tiers, and it is the genre's signature progression, not a node: Qi, Intent, Domain and Law, Sword's 剑气, 剑意, 剑域 and 剑之法则, Saber's 刀意 and 刀域, Fire's 火意 and 火域, and so on for all nine. The stages are earned, never bought with insight.

| Stage | What it does | Earned by | Early, for a genius |
|---|---|---|---|
| Qi | the Dao's tier 1, as now | holding tier 1 | |
| Intent | the Dao's actions at ×1.15 Accuracy and ×1.15 Attack; foes below your stage in that Dao at ×0.9 Accuracy against you; about a stage in all | the Dao's tier 2 capstone (Foundation) and a moment | the tier 1 capstone (Qi Condensation) |
| Domain | Intent, and foes below your stage at ×0.9 Evasion, with their Defense counted ×0.95 against the Dao's actions | the tier 4 capstone (Nascent Soul) and a moment | the tier 3 capstone (Core Formation) |
| Law | a realm gap counts only as half a step on the Dao's actions; written, not built in v1 | past v1 | |

- A moment is an epiphany card, a fight won from under 10% of your HP, a Dao stele or an inheritance, each with that Dao in it. The capstone makes you ready; the moment breaks through.
- A genius takes each stage a realm early: a gold-or-better talent tied to the Dao (Sword Heart, the Innate Sword Root for Sword) or a rare card opens it on the capstone a tier lower, so a Qi Condensation cultivator with sword intent is a prodigy people talk about.
- A foe at your stage or above in any Dao cancels your Intent's and Domain's effects on them: intent meets intent.
- The sheet shows a line for each Dao you hold intent in, "Sword · Intent 剑意"; on the Combat screen a combatant with intent wears a mark, and the hit-chance preview counts the effects.
- NPCs carry intent on their weapon's Dao by pedigree and realm (Enemies, beasts and the people you meet, the pedigree table).
- Intent and Domain are a row of the fighting-up ledger (Combat). The four target rows stand, measured with the intent each pedigree's kit carries by that table; if a row breaks, the stage numbers move, not the targets. P2.6 moved Domain's from ×0.85 Evasion and ×0.8 Defense, which put a sacred-land genius at Core Formation, holding Domain over a foe's Intent, at 65% against the ledger's 25–45%; at ×0.9 and ×0.95 it stands at 41%.
- Saber's Roar and Tiger Roar stay: a roar is not intent. The Sword tree's intimidation side path is Sword Bearing, which leaves the name to the ladder.

Lightning, Wind and Ice stay as Daos the trees list (Cultivation, Daos) with no draft yet; the fight sim says whether v1 needs them beyond their damage types.


## Tier, rarity and pedigree

Everything you can own or be born with shares one rarity scale, and everything you can own also has a tier.

**Tier** is the realm a thing belongs to. It sets the thing's base power on the realm curve, its price band on the yardstick under Economy, and its gate: the realm to wield an artifact, the peak a method carries you to, the level to use a technique, the soul level to craft at that tier. Talents and spirit roots have no tier.

**Rarity** is how good a thing is inside its tier: gray (flawed), white, green, blue, purple, gold, red, pristine (琉璃, without a flaw). It is a band: the stage the thing is sized at, in its own tier's realm (Combat, Realms are sizes). White is the realm's first stage, blue its middle, purple its peak, gold the next realm's first stage, red the next realm's middle and pristine the next realm's peak. In numbers, with s the size step out of the thing's tier (×3.1 at tier 1, ×4.6 at tier 2, ×6.7 at tier 3, ×10 at tier 4 and on up the table under Combat): gray ×0.8, white ×1, green ×1.2, blue ×1.5, purple s^0.8, gold s, red s^1.3, pristine s^1.8. The method tier bonus under Cultivation uses the step out of your own realm instead.

| | gray | white | green | blue | purple | gold | red | pristine |
|---|---|---|---|---|---|---|---|---|
| sized at | below early | early | early-middle | middle | peak | next realm, early | next realm, middle | next realm, peak |
| tier 1 (step ×3.1) | ×0.8 | ×1 | ×1.2 | ×1.5 | ×2.5 | ×3.1 | ×4.3 | ×7.7 |
| tier 3 (step ×6.7) | ×0.8 | ×1 | ×1.2 | ×1.5 | ×4.6 | ×6.7 | ×12 | ×31 |

White to purple is steady betterment inside your own realm: purple makes an early-stage cultivator fight as a peak one, and never crosses on its own. Gold and red are heaven-defying: one line of the sheet sized at the next realm, at every realm, the way each realm's step is wider than the last. Pristine (settled in D2.0.1) is the thing without a flaw: one line sized at the next realm's peak, so a single pristine art makes a layer-1 orphan strike like a Foundation peak. It is the natural step after red on every table: one roll in ten thousand where red is one in a thousand, so most pristine things in a life are placed, an ancestor's heirloom, a ruin's inheritance, a treasure the atlas names, and a rolled one is the story of that life. Gold, red and pristine techniques also multiply Accuracy by 1.2, 1.4 and 1.6. Higher rarity brings more special properties: none at white, a minor one at green, one at blue, two at purple, two and a unique one at gold, three and a unique one at red, which is named, and four, a named unique and an artifact spirit at pristine. Price climbs much faster than power: within a tier, about ×0.5, ×1, ×2, ×5, ×15, ×50, ×200 and ×1,000 from gray to pristine. All of these are starting values for the sims.

What each kind of thing does with tier and rarity:

- Talents and spirit roots: rarity only, rolled at birth.
- Methods: tier is how far the method carries you; rarity sets its speed, the growth it leaves on every stage climbed with it, its breakthrough bonuses and its properties; mastery scales speed alone (Cultivation, methods).
- Techniques: tier is the level to use them, and rarity sizes their Attack, their Accuracy from gold up, and adds effects.
- Weapons size Attack for techniques of their own kind at half their band and basic strikes at the full one, and add Accuracy and properties from gold up. Armor sizes Defense at its full band.
- Pills, artifacts, talismans and arrays: tier comes from the recipe or the material, and crafting rolls the rarity from mastery, materials and luck.
- Loot and shops roll on the talent table (gray 10%, white 40%, green 35%, blue 10%, purple 4%, gold 0.9%, red 0.1%), shifted by source: a sect vault or a ruin rolls better than a market stall. Pristine sits on the table at 0.01%, and white gives up the hundredth.

**Above your realm.** A weapon one tier above your realm drinks qi with every strike, multiplies Accuracy by 0.8 and counts its Attack at half the step out of your realm; two tiers above, it won't wake at all. An ancestor's blessing on a lineage heirloom, a talent, a soul a realm ahead or a refining bond cuts the penalty. Consumables carry their own tier: a talisman an ancestor drew a realm above you strikes at that realm, and whatever an item burns or sacrifices is the item's own rule.

**Pedigree.** NPCs run on the same rules as you; what sets a chosen of heaven apart from a rogue cultivator is access. Every NPC has a pedigree (rogue, small sect, great sect, sacred land or chosen of heaven), and it sets only the tables they roll their methods, techniques, gear, talents and resources on: a rogue mostly rolls white and green, while a chosen one has a real shot at gold and red. Each realm's ordinary baseline rises too, since anyone who reached Nascent Soul has lived for centuries and owns blue and purple things; that is why the same chosen-one kit closes a little less of the gap higher up. You start as an orphan near the bottom and climb into the genius bracket by finding gold and red. The tables, and how an NPC is generated from them, are under Enemies, beasts and the people you meet.

## Items and gear

Everything you can carry is one record, the way a method is a bundle of fields, and what an item can do is a list of uses rather than a kind. A spirit fruit can be eaten, thrown into a furnace and sat with, and a new sort of thing is a new use or a new tag on an old one, never a new record. Settled in D2; every number is a starting value for the sims.

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
| inscribe | a formation slot for M4's enchantments | an empty slot on a blade or a robe |

A pill has consume alone; an old ginseng has consume, ingredient and contemplate; a beast core has ingredient, a dangerous consume and a price; a cart has carry alone. Anything you can consume and anything with ingredient tags can go into a recipe, so a fruit and the pill brewed from it are two items that share tags, not two systems. Unknown things show every use as "?" until appraised (M6).

**Weapons** come in kinds, one per combat Dao: sword (剑), saber (刀), spear (枪) and fist (拳: gauntlets, claws and bare hands). Bare hands are a white tier 1 fist weapon, so unarmed strikes run through the same rule. New kinds come with their Daos later, the axe, bow, dagger, hammer and staff among them, each an entry. A weapon sizes Attack for techniques tagged with its Dao at half its band and basic strikes at the full one (Tier, rarity and pedigree), multiplies Accuracy only at gold (×1.1) and red (×1.2), half a technique's, and carries its properties. A weapon of a lower tier than yours still works, only weaker, since its band counts in its own tier's realm.

**Armor** is one piece, whatever its shape: lamellar, a robe, a beast hide, a cassock. It sizes Defense at its band, so white armor is the ordinary baseline the fighting-up ledger assumes and a red robe is a Defense from the next realm's middle. Its material names one damage type it resists, a quarter off at any rarity (water-silk against fire, as in the worked turn), and its properties add the rest.

**Enchantments** (low priority, M4's artifact refining): weapons, armor and storage items carry an inscribe slot, empty until a formation is laid into it, and an inscribed formation adds one property of its own rarity. A formation on a blade is a craft like a pill; the slot is here so the record never changes.

**Storage.** The pouch slot and the ring slot both carry squares, and both count at once:

| Tier | Pouch slot | Ring slot |
|---|---|---|
| Qi Condensation | storage pouch (储物袋), +20 squares | none yet |
| Foundation | a bigger pouch, +40 | storage ring (储物戒), +60 |
| Core Formation | spatial sack or sleeve (乾坤袋), +120, holds living things | ring, +180 |
| Nascent Soul and up | a small world in a bead or jade, +360 and a garden | ring, +540 |

A pouch is cloth: anyone can open it, a thief can cut it off, and it goes with you when you die. A storage ring opens to divine sense, so it needs a soul at its tier or a qi realm there, whichever you reach first, and a dead elder's ring waits in your bag until you can; it bonds like any artifact and refuses a stranger. Both slots are storage only. Stones are a count in any of them.

**Treasure slots** hold artifacts that are properties alone: a fire bead, a warding jade, a treasure ring, a soul-calming bell. They carry no squares and no weapon rule, only their rarity's properties and a bond. You start with none, and the slots come from nodes: one notable in each tier of the Qi tree and one in each tier of the Soul tree opens a slot, so a realm is worth two and the count leans on both trees. The Bag shows them beside the four gear squares as they open.

**Bonding.** Artifacts from blue up bond to a cultivator by use, on the mastery scale, Glimpse to Origin (Cultivation, mastery): fight turns with it count as practice, and feeding it stones in seclusion counts as hours. Each level unlocks one of its properties, in the order the item lists them, and cuts the above-your-realm penalty a step: −4 to hit at Glimpse, −2 at Mastery, nothing at Perfection, and at Origin a weapon a tier up counts its full tier gap. At gold and red an artifact spirit wakes at Perfection, and a pristine artifact is born with one awake: it carries the unique property, speaks in scenes (GLM gives it a voice, the engine its wants), and can refuse an owner it hates. A bonded artifact works at white for anyone else, and a lineage heirloom's bond passes to an heir at Glimpse.

**Pills and toxicity.** Every cultivator has one toxicity meter, 0 to 100. A pill adds its dose: 10 at your own tier for a white pill, triple for a pill a tier above you, a third for one below. Higher rarity is purer, so the dose scales ×1.5 at gray, ×1 at white, ×0.9 at green, ×0.8 at blue, ×0.65 at purple, ×0.4 at gold, ×0.25 at red and ×0.15 at pristine; a red pill is almost clean. Toxicity decays about 1 a day at Qi Condensation and faster by realm, every pill's effect scales by 1 minus toxicity over 100, and reaching 100 unsettles the ladder the last pill fed. Detox pills and the Body tree's Hundred Poisons branch cut it. Toxicity is why pills are a boost and never the road.

**Talismans and other consumables.** A talisman is a consume or fight item drawn at its tier and rarity with one effect: attack, shield, escape, speed, healing, cleaning, purification, a message. An attack talisman is a technique of its tier, rarity multiplying its power, and it strikes at its own tier even above yours (Tier, rarity and pedigree). In a fight a talisman is a main action and spent; out of one, an escape or a cleaning talisman is a card choice. Poison needles, fire bombs, beast-luring incense and a vial of blood are the same fight or consume uses on other kinds. The fight sim's targets exclude all of them, since one-shots are the tricks that let anyone fight up once.

**Aptitude** moves only by opportunities, and never by the shop: a pill from purple up (+1, one such pill counts per realm), a marrow cleansing or a purification rite, a bloodline awakening, a gold manual's node, a spirit spring in a secret realm, a dao companion's paired method. Each is +1 Aptitude, worth 5% on every seclusion gain, and the rites have no cap, only rarity.

**Loot and shops.** A source has a tier band, a kind table and a bias. The band is the realm it serves: a Border Wilds stall sells tier 1, a Foundation elder's ring holds tier 1 and 2. The kind table says what it holds: a stall pills, talismans and herbs; a vault manuals and gear; a beast its parts. The bias shifts the shared rarity table (Tier, rarity and pedigree): each rarity's weight is multiplied by b to the power of its step from gray, with a stall at 0.6, a sect shop at 1, a vault or ruin at 1.6 and an inheritance at 2.5, so a stall shows blue about one lot in twenty and never gold, a vault rolls gold about one lot in 25, and an inheritance rolls gold about one in nine and red one in thirty. Loot rolls on the `loot` stream, a drop at a time.


## Generated methods, techniques, manuals and items

The world is too big to write by hand, so most of what it holds is generated and only the memorable part is authored. A method, a technique, a manual and an item are all bundles of independent fields (Cultivation, methods; Items and gear), so one rule fills any of them. Settled in D2.

**One generator.** Roll a tier and a rarity on the shared table with the source's bias (Items and gear, loot and shops), pick a theme, fill the fields from the theme's tables, name it once and store it in the save by its seed, like a filled-in village. White to blue is fully generated. Purple is generated too, since purple is 4% of rolls and too many to write, but from authored property pools and name words. Gold and red are written by hand, every one, so anything a player remembers by name was written by a person. A generated thing never changes once seen: the sword in a stall is the same sword when you come back, and two players with the same seed find the same sword.

**Themes make it local.** A theme is a tag bundle: an element, a Dao, a race or animal, and a place or power from the atlas. It picks the name words and hanzi, the property pool and the material. The karst gives Sinkhole Stone Fist, the strait gives Undertow Palm, and the Night Bridge gives a method that gains at night. A source's themes come from where it stands, so a Border Wilds stall sells Border Wilds things and a sword sect's vault holds sword things, with nobody writing them.

What each kind fills in:

- Methods: the theme sets the element, the fit by root kind, the growth profile (pool-heavy, purity-heavy or balanced), the requirements and the property pool. Upkeep is rolled, rare at green and sometimes from blue. Circulation follows rarity. A generated line gets its next chapter generated at the next tier when the world hands it over.
- Techniques: the path sets the Dao and the form, the theme the element, power is the tier's baseline times the gap to the rarity's exponent, qi cost follows power, and the name is a theme word and a form word, the way Ember Palm reads.
- Manuals: an item with the read use. The kind sets the size by rarity, a formula one or two nodes, an art a generated technique and its nodes (Cultivation, Where manuals live), a method a method and its nodes, a style craft nodes and recipes; the nodes are stat effects from the property pool, with requirements between them when there are more than three. A generated passive with no technique is a formula, hosted by its stat.
- Gear: a kind, a material from the theme that sets armor's resist and the look, and properties from the kind's pool.
- Pills and talismans: an effect from a short list for now, qi, body, soul, healing, detox, an offering, and the talisman effects, until D4's effect table replaces it.
- Materials: the tier and the ingredient tags of the beast or plant that dropped them, and an age for herbs.

**Property pools are the authored part.** Per theme and kind, a few dozen entries each, a stat effect with a size by rarity, as properties were settled (Cultivation, methods). Rarity sets how many a thing takes from the pool. That is the real content work, and it is finite: a pool is a list, and a new theme is a new list.

**Names once.** A template name by default, hanzi from the theme's word table, and GLM may rename a thing when a key is set, the way small places work. Gold and red names are never generated.


## Enemies, beasts and the people you meet

NPCs run on the player's rules, and pedigree is only access (Tier, rarity and pedigree). This is how they are made, how beasts fight, what the dead leave behind and who stays in your life. Settled in D2; every number is a starting value for the fight sim.

**A cultivator is generated, not authored.** The template is a pedigree, a realm and stage, a path (a Dao and its weapon kind), a profile, a name in the region's naming style and a seed. Everything else is rolled from the pedigree's table on the `people` stream: method rarity, which sets the growth that built their pool and HP; technique rarity and mastery; a weapon and an armor; zero to two consumables; a storage item; and a breakthrough grade. Named people from the atlas are the same record with the rolls pinned, so an elder and a bandit differ in access, never in rules.

**Pedigree is a bias on the shared roll**, the same rule as loot and shops (Items and gear): each rarity's weight is multiplied by b to the power of its step from gray.

| Pedigree | b | Typical method | Technique mastery | Intent on the weapon's Dao | Domain |
|---|---|---|---|---|---|
| Rogue | 0.5 | white | Comprehension | from Core Formation | never |
| Small sect | 1 | green | Mastery | from Foundation | from Nascent Soul |
| Great sect | 1.6 | blue | Mastery | from Foundation | from Nascent Soul |
| Sacred land | 2.5 | purple | Perfection | from Foundation | from Core Formation |
| Chosen of heaven | 4, and one slot guaranteed gold or better | gold | Perfection | from Qi Condensation | from Core Formation |

Each realm's ordinary baseline rises on top, since anyone who reached Nascent Soul has lived for centuries: the bias is multiplied by ×1 at Qi Condensation and Foundation, ×1.3 at Core Formation and ×1.6 from Nascent Soul up. Mastery rises one level for every realm past the first, up to Origin, because practice days pile up. The biases are midpoints of ranges the sim tunes; the fighting-up ledger's rows are what they must reproduce.

**NPC pace.** An NPC's realm comes from its age and pedigree: it climbs at the away rate on its pedigree's typical method, read off the pacing sim's away row, so a rogue at sixty sits at Qi Condensation's peak while a great-sect disciple reaches Foundation around thirty. The expected realm at each age per pedigree is a sim output, filled in by P2.2 and read by M3's encounters and M5's rivals. An attended player outpaces a same-pedigree NPC by up to double (How the two halves connect), and that gap is the edge for playing.

**Profiles are five numbers.** The engine owns every choice; GLM gives it a voice.

| Profile | Opens with | Picks | Defends or takes a pill at | Flees at | Talks |
|---|---|---|---|---|---|
| Aggressive | its hardest technique | the hardest hit | never | 10% HP | taunts, never begs |
| Cautious | defend, then a probe | the best element | 50% | 30% | bargains |
| Cunning | a status or a trick | statuses first, then element | 40% | 25% | bluffs, bargains, lies |
| Cowardly | a shield or a talisman | the cheapest | 60% | 50% | begs, surrenders |
| Fanatical | its hardest technique | the hardest hit | never | never | preaches |

Beasts take profiles too: predators are aggressive, herd beasts cowardly, old beasts cunning.

**Beasts.** A beast has a species, a realm on the same ladder (a Foundation beast is a Foundation foe, with the same gap), a bloodline rarity in place of pedigree, one element, a profile, a pack size and a parts table. Beasts are body-first: ×1.5 HP, no armor, physical damage plus their element, no pills. Every species has its natural attacks, bite, claw, charge, tail, crush, and its bloodline rarity rolls abilities on top from the element's table: none at white, one at green, two at blue, three and an aura at purple, a unique at gold and a named one at red; a pristine bloodline is a legend with an entry of its own, rolled once in ten thousand. The abilities are techniques on the same engine, so they take the Dao bonus, the element cycle and the effects by their tags.

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

**Bloodlines and beast paths.** A bloodline is a thing you have: born with it, as half-bloods and the beast-bloodline body talent are, or gained by a blood rite, a beast bond, or devouring a core on the Demonic Way. Holding one unlocks that element's beast abilities as body techniques, with the bloodline as the requirement and the element's Dao as the tag, so a beast path needs no tree of its own. A half-blood raider in the Border Wilds and a transformed python are one rule from two sides.

**What the dead leave.** A dead cultivator drops everything they carried: their kit, their bag and their storage item, which comes as a sealed ring until you can open it (Items and gear, storage). The only losses are the consumables they spent in the fight and the piece of gear the killing critical hit, which drops damaged, one rarity step down and repairable at a forge. A fleeing enemy keeps it all. A sect disciple's token drops too, a key item that is a hook and a danger, since the sect will ask who holds it. A beast drops by its parts table: a core from Foundation up and half the time at Qi Condensation, its tier the beast's realm and its rarity its bloodline, and hide, marrow, blood, fang or feather by species. Tempered Marrow, the body offering, is refined from a Foundation beast's marrow.

**Who stays.** The world is three layers, and nobody is simulated who hasn't touched you:

- Transient: a generated enemy or passer-by exists for its scene and is thrown away.
- Kept: a scene that ends with a thread keeps them. You talked and traded names, haggled at their stall, spared, robbed, healed or bargained with them, survived a fight with them or they with you, or a card named them. A kept person is stored as a seed plus pins: the seed regenerates their kit and rolls on demand, and the pins are what changed, regard, realm, whereabouts, what you took. That is the People screen (Professions, people and powers), dozens to a few hundred a life, mortals included. Named atlas people are kept from the start with everything pinned. From M5 they tick on a coarse clock, a season or a year: climb at the away rate on their pedigree, age, roll for death, move, and roll an event that may write to their log.
- The world: powers have strength on the realm curve and prosperity drifts (M6), and encounters generate from tables. A place's people are generated from the place's seed, so the same keeper stands at the same stall next time, and a rumor about "a Foundation elder of the Beast-Butcher Gate" carries a seed, so when you meet them they match the rumor.

**The Border Wilds roster**, drafted for P2.2's sim and P3.2's region, in the Qi Condensation and Foundation bands. The parts and names follow the atlas entries the canon pass reads.

| Template | Band | Kind | Element | Profile | Notes |
|---|---|---|---|---|---|
| Cave bat swarm | Qi Condensation | beast, pack of 6 to 12 | wind | aggressive | screech dazes; wings and guano |
| Stone-skin boar | Qi Condensation | beast | earth | aggressive | stone skin at green; hide and marrow |
| Tide crab | Qi Condensation | beast, pack of 3 to 5 | water | cautious | shell, meat |
| Karst python | Foundation | beast | soul | cunning | illusion; the Soul-Lost Stone Forest's great one is Nascent Soul |
| Reef ape | Foundation | beast, pack of 2 to 4 | metal | aggressive | Ape's Palm Reef; fists, blade feathers at blue |
| Strait shark | Foundation | beast | water | aggressive | the Shark Caves' kin; fang, fin |
| Vast Wilds raider beast | Foundation | beast, rolled species | rolled | aggressive | what the raids bring over; old and better-blooded than the local stock |
| March conscript | Qi Condensation | cultivator, rogue | none | cautious | spear; a garrison method; a token of the March |
| Garrison deserter | Qi Condensation | cultivator, rogue | none | cowardly | spear; stolen stones; a price on their head |
| Half-blood raider | Qi Condensation to Foundation | cultivator, rogue, with a bloodline | the bloodline's | aggressive | fist and beast abilities; hunted by the wall |
| Night Bridge smuggler | Qi Condensation to Foundation | cultivator, rogue | none | cunning | fist; an escape talisman; the Night Bridge method at night |
| Raider Isles pirate | Qi Condensation to Foundation | cultivator, rogue | none | cunning | saber; White Fang Stockade's token |
| Beast-Butcher Gate disciple | Qi Condensation to Foundation | cultivator, small sect | none | aggressive | saber; cores on them; the Gate's token |
| Sea-Taming Sect disciple | Foundation | cultivator, small sect | water | cautious | spear; a water-silk robe |


## Character creation and the first hour

Play opens at age 12 on root-testing day in the Border Wilds. Creation takes about 3 minutes, and by the end of the first real hour you sit at Qi Condensation layer 3 with a first technique, a first tree node and, from M3, a first trip into the frontier.

**Creation, in order**

1. Name and look: a family and given name (pinyin, with suggestions), one line of appearance, and pronouns.
2. The talent roll: one talent of each kind (spirit root, body, soul, fate, origin), most of them plain. You get three free rerolls, each rerolling all five at once, and the last roll stands. Later lives earn more rerolls, as Death and rebirth describes.
3. Childhood: a short paragraph per origin. M1 ships it as fixed text; from M3, GLM writes it from your rolls.
4. Testing day: the stone lights up, and your first choice decides where you stand when play begins.

**Spirit roots.** Everyone rolls one; the floor is a mixed root. Odds and speeds are starting values for the balance sim:

| Root | Odds | Qi speed | Notes |
|---|---|---|---|
| Mixed (four or five elements), white | 49.9% | ×0.6 | slow at single-element methods, but the only root that fits five-element methods fully |
| True (two or three elements), green | 35% | ×1.0 | the ordinary disciple |
| Single element, blue | 10% | ×1.5 | sects compete for you |
| Heavenly single, gold | 0.9% | ×2.5 | great sects send people for you |
| Mutated (lightning, ice, wind), purple | 4% | ×2.0 | rare methods fit it; ordinary ones fit badly |

The red root is the chaos root, 0.1%: every element in balance, ×3.0, and it fits every method fully. The pristine root is the Primordial Root 鸿蒙灵根, 0.01%: the qi of before the heavens were cut, every element, ×3.5, fitting every method fully, with a point of Aptitude and faster insight besides. Every root holds elements, rolled at creation from its kind: one for a single or heavenly root, two or three for a true root, four or five for a mixed root, one of lightning, ice or wind for a mutated root, and all five for the chaos root. The element hours read them, and a named root like the Innate Sword Root is a root with effects beyond its speed, like any talent.

**Three origins in the first playable**, all in the Border Wilds. The beast-ranch child, the merchant's child in the fortress city and the smuggler's ward arrive by M5, with the taming, trade and smuggling systems they need.

| Origin | Testing day | If you go along | If you refuse |
|---|---|---|---|
| Cave orphan, Kingdom of Stone Eyes | the imperial tester comes to the sinkholes, and the cave clans hide rooted children | the March's garrison school: a standard method, rations, a place on the wall | the clans hide you: a crude cave method, a map of caves no one else has, smuggler contacts |
| Conscript's child, March of Pacified Borders | the Gongsun garrison claims every rooted twelve-year-old for its cadet school | cadet: a spear method, a stipend of low-grade stones, patrols on the Wall of Piled Bones | deserter: no method yet, a bounty on you, and the Night Bridge Society offers a way out |
| Frontier orphan, City of the Guarded Mouth | the Beast-Butcher Gate's recruiter tests orphans who lost family to beasts | outer disciple: a saber method, contribution for cores, a senior who expects results | street cultivator: no method yet, odd jobs at the bounty office, and the Gate remembers you said no |

Refusing is harder but never a dead end. The two refusals that start without a method get their card after a month or two of odd jobs, about five real minutes, so they reach layer 3 nearer minute 55 than 45; the first hour's clock below is the going-along paths'. The deserter is taught the Night Bridge Society's breathing; the street cultivator is paid in a torn manual, a copy to read before it is a method, which takes the whole wheel until read (Cultivation, Reading).

**The first hour**, at one real hour to one in-game year:

| Minute | What happens | What opens |
|---|---|---|
| 0–3 | creation and testing day; your method arrives as a book and you read it, about half a minute | your origin, your method once read, the Trees |
| 3–5 | first seclusion; you sense qi and reach layer 1; the first orb drifts in and you draw it in | the day wheel, with qi, study and sleep hours; attended seclusion |
| 5–20 | layer 2; the first insight trickles in; the first node, a Breath node or a starter | the first node to buy |
| 20–35 | your origin's first technique; practice takes it to Comprehension | practice hours and technique mastery |
| 35–45 | the layer 3 breakthrough, with a small check and choice | the breakthrough screen |
| 45–60 | the first trip out, from M3: a cave guiding job, a night patrol or a core hunt with a senior | the go-in screen, the map's first fog, loot flowing home |

There are no tutorial walls. Each system appears when you first reach it, with one line of hint and a chronicle entry. In M1, which has no AI, the first trip out is a fixed errand card with set outcomes.

Body and soul methods are found, not given. In M1 the errand card hands over a copy of a common tempering art, which opens body hours once read, and a later card a common nourishing art, taught if you sit the night with the lamp-keeper and a copy if you take it and go, which opens soul hours; from M3 the world supplies them. The Foundation chapter that comes with the layer 9 pill is a copy too, read before it can be taken up. Both are tier 1, so in M1 body and soul stop at layer 9, and the Foundation grade's body and soul points wait for M3.

Layers 1 to 3 are the tutorial and ignore root speed, method fit, the method's tier, rarity and mastery, and the element hours, so every root reaches layer 3 in about 45 minutes; dawn, discipline, Aptitude and nodes still count. The rest counts from layer 4. Pacing targets for the sim, which takes an attended fraction (none, a third, all) and reports a row per schedule: away, an ordinary true root reaches layer 9 in about 15–20 real hours, around age 30; attended throughout, about half that, around age 21, with a bigger insight purse. The away row is the floor, not the goal; attended play is faster by design. Foundation then waits on a Foundation Pill from the world, and a heavenly root gets there in about half the time. Until M3 the world can't supply that pill, so in M1 your origin hands you one at layer 9, as a reward or a trade, with the next chapter of your method, since a Qi Condensation method stops at the peak of its realm.

## Story cards and events

Everything that happens to you is a card, in seclusion and in the world alike: a seclusion event, a beat of the first hour, a sect summons, a headline, a go-in encounter, the coming-back summary. One format and one engine, built in M1 without the AI; every milestone after adds decks, not systems, and the Scribe rewrites a card's text when a key is set.

**A card is data:** a trigger on your state (realm, layer, bar, age, season, hour, flags, items, standing, where you are), a weight, once-only or a cooldown, a short text with slots for names and places, one to three choices, each with a cost or a check (hours, stones, an item, a d20 check on an attribute) and effects the engine applies (stones, items, bar, insight, injury, a flag, standing, a method, technique or routine, a go-in scene), and a chronicle line. Cards draw on the `world` stream.

**A card can be a whole small interaction.** Its choices can lead to further steps instead of ending it: haggling with a peddler over a few rounds, tracking a thief through the karst, sitting out a storm watch by watch, each step with its own text, choices, checks and effects, and later steps reading what earlier ones set. The chronicle gets one line for the path taken. A card left to resolve on its own follows each step's default. Single-step cards stay the common case; a few meaty multi-step cards per deck carry the stories.

**Where they live.** The Abode carries the feed: pending cards stack in a tray under the figure, the top one open and the rest fanned behind it, each rising onto the stack as it arrives and sliding off once settled, and resolved ones fall into the Chronicle. Cards wait for you; no timer punishes absence. A few urgent ones resolve by default if ignored for some days, a thief takes the stones, and offline at most three queue while the rest resolve by default and show in the coming-back card, which becomes a story rather than a ledger.

**Pacing:** about one card every five to eight real minutes while you idle, two or three an in-game season at Qi Condensation, with the chance per season scaled down at higher realms so the real-time pace holds whatever the clock does. The orbs are the Abode's pulse (Attended seclusion), so cards don't have to be: they can be rarer and heavier than that rate as the deck grows, and meatier beats a clicker stream, so the deck needs enough cards that repeats stay rare, and a long absence tells its many small cards as a story. A starting value for the sims. No streaks, dailies or missed-out counters, ever, and the coming-back card never mentions what attending would have earned.

**Decks grow with the game:** M1 ships the first hour's cards and the seclusion deck; M2 fight cards; M3 encounter cards; M4 craft cards; M5 people cards; M6 world cards.

**Seclusion is quiet, not silent.** Five kinds of event:

- At the door: a peddler with a pill you can't afford yet, a junior begging help, a sect summons, a tax collector, a beast sniffing round the cave, a thief. Choices trade hours, stones, risk and standing, and from M3 a choice can open a go-in scene.
- Inside you: a qi deviation scare on a bar past 150%, an epiphany that lumps insight and discounts a Dao, a dream that wakes a sleeping talent.
- Sky and season: a thunderstorm over the peak, sit it out for Lightning insight at a body risk; a spirit tide that doubles qi density for a day; a yin night that favors ghost work.
- Named days: new year, the sect's lecture day, the beast tide, each a recurring card with its own choice.
- People from the start: the sergeant, your senior, the clan aunt as named people in the card text, each with a record (Professions, people and powers), so the first hour already has faces.

## The world: travel, trips and encounters

**Do whatever you want** (Jan's call, D3, 2026-10-14). Going in rests on one principle: the player can try anything, and the world answers by its own rules.

- **Free to try, not free to win.** Scale holds (Scale of destruction): a Qi Condensation punch cracks a wall, never the Wall of Piled Bones. Memory holds too: rob a Gate runner and the Gate remembers.
- **Free text on top, twelve verbs underneath,** as combat already is (Combat: rules underneath, free text on top). The interpreter turns what you write into verbs with targets and the scene's features ("wait on the cliff until the caravan passes, then cut the lead mule loose" is rest, then evade, then take); the engine resolves them (The resolver) and the narrator tells it. Going in uses GLM 5.2 fully; without a key, trips still run on the engine, but there are no scenes.
- **Priced, not gated.** Nothing says "you can't" except scale. An attempt costs time off your wheel, risk, standing, karma and fame, and every attempt changes something: time passes, or someone saw.
- **As deep as the world's memory.** Freedom reaches as far as the state the world keeps: people who remember (Who stays), places with fields and features (The world map, The atlas as data), standing with each power. An attempt whose system comes later is narrated, and says which milestone makes it real.

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
| Make | brew, refine, inscribe, plant (M4) |

**What you can do**, the menu the interpreter knows. A milestone in brackets means the action waits for it; the rest is M3's.

- **Move:** walk · march pressed · ride a horse, cart or mount · fly your own sword (Foundation) · ride someone else's sword or boat · pay smugglers for the low-tide chain · hire a guide · roads or cross-country · travel by night · walk blind into the fog · detour · turn back · camp anywhere · go home anytime · walk by day and cultivate by night · teleport arrays (M6) · the flying boat (M6)
- **Find:** look around · search a body, a room or a ruin · track a beast · tail a person · watch a place from cover · scout ahead · read the bounty board · buy a rumor at a teahouse · ask locals · buy, steal or loot maps · follow a treasure map · see through a hidden realm · appraise (M6) · divine (M6)
- **Talk:** ask · persuade · lie · bluff · flatter · threaten · press with your realm's aura · beg · haggle · bribe · trade names · insult · provoke · challenge · apologize · promise · swear brotherhood · recruit a companion · hire a guard · sell information · report someone · start a rumor · court (M5) · take a disciple (M5)
- **Fight:** attack · ambush · sneak attack · duel · spar · fight with the scene (burn the grass, drop the rocks) · talismans · command a beast · hunt beasts for cores and parts · clear a den · hunt bounties on people · defend a village · spare · take captive · finish the wounded
- **Get away:** flee · hide · sneak past · disguise yourself · hide your realm · act weaker than you are · burn an escape talisman · surrender · pay them off · leave a decoy · outfly them · go to ground in a town
- **Take:** loot the dead · gather herbs · mine ore · butcher a beast · open a sealed ring once your soul can · rob a caravan · pickpocket · burgle · steal from a sect's store · rob graves · poach on sect land · claim a cave as your abode (M4)
- **Give and trade:** buy · sell · barter · pay or refuse tolls · give gifts · return lost things · pay debts · pay ransoms · fund a village · donate to a temple for merit · auctions (M6) · standing orders (M6)
- **Help or harm:** heal · save · escort · deliver a letter · avenge · protect mortals · free captives · kidnap · frame · assassinate · interrogate · search a captive's soul (karma) · poison · betray
- **Places:** enter towns, cities and markets · get into a gated place by token, rank, invitation, toll, force or stealth · cross hostile land while hunted · enter a deadly land past its warning · enter a secret realm while it is open · take an inheritance trial · open a tomb · break an array (M4) · wreck a place (standing, and scars from Core Formation up) · found a sect (M5)
- **Cultivate out there:** sit at a waterfall or a thunder peak · comprehend a stele or a sword scar (an Intent moment) · drink from a spirit vein · seclude in a cave you found · break through in the wild, where someone may come · meet a tribulation where you choose (M7)
- **Work:** take a bounty · herb runs · patrol the Wall · deliver · guard a caravan · core hunts · a day's guarding, guiding or hunting for a stone · sect missions and posts (M5) · sell what you craft (M4)
- **Be someone:** keep a vow (Buddhist) · walk the demonic road (devour cores, drain cultivators) · keep or break promises · build a name or stay unknown · make friends and grudges that remember · take a side in a feud

The map is the go-in's board, and travel reuses the wheel.

**Travel is a kind of hour.** On foot or on your own sword, travel hours move you and the rest of your day is yours, so "walk by day, cultivate by night" is a travel routine saved like any other. Riding something, a horse, a cart, a boat, a beast, a flying boat, someone else's sword, moves you without your hours, and your wheel turns at a jostled penalty, about half for qi, body and soul, study untouched on a boat. Pressed travel sets all waking hours to travel and rolls more encounters.

**Going somewhere.** Pick a known place, a point in the fog or "follow the road", and the engine routes along the atlas's roads where they exist and cross-country where they don't, with days from your pace. Each travel day rolls encounters by the terrain under you, the hour, the danger band between the region's top realm and yours, your fame and the calendar.

| How | Li per double-hour of travel | A kingdom of 10,000 li |
|---|---|---|
| Mortal on foot | 20 | half a year |
| Qi Condensation on foot | 40 | a season at five hours a day |
| Horse or cart, hours free | 30 | two months |
| Foundation sword flight, costs qi | 200 | ten days |
| Core Formation sustained flight | 300 | a week |
| Nascent Soul, blinks and flight | 600 | days |

A region of 60,000 li is half a year on foot at Qi Condensation and a month at Core Formation. Starting values for the sims.

**Look around** costs an hour wherever you are. Without divine sense your eyes search 2 li, and each hidden site there takes a Soul check: tracks, a herb, a cave mouth, a watcher. With divine sense, from Foundation, it sweeps the scale table's range with no roll: 2 li at Foundation, 20 at Core Formation, 200 at Nascent Soul, a soul ahead of your realm using the next row. A site hidden by an array or a realm above your soul stays a rumor whatever you roll. Travel alone marks places seen; looking around finds what is hidden and lists each site's features.

**The fog** (D3, 2026-10-14). What you know of the map is kept per place, never as a fog picture: each place, an atlas entry or a site inside one, holds one of the four states (The world map, Fog of war), and a state only rises, Unknown to Rumored to Sketched to Seen. An area, a kingdom or a forbidden land, shows its outline once Sketched and its inside once Seen; a point, a town, a cave or a sect's gate, shows its mark.

- **Sites.** The atlas stops at kingdoms, cities, landmarks and powers, so each kingdom holds 12 to 20 sites, seeded from the world and the kingdom's id the first time anything needs them and kept in the save: about a third towns and villages, the rest wild sites from its terrain (a cave, a herb valley, a beast den, a ruin, a shrine), each with tagged features for scenes, and roads joining its towns to each other and to the next kingdom's. Sites belong to the world, so every life in the slot finds the same ones.
- **Travel** turns Seen every visible place within sight of the route: 20 li on open ground, 5 li in forest, jungle, karst or marsh. Hidden sites never show from the road. From Foundation the divine sense circle sweeps as you travel, so hidden sites within its range of the route turn up without stopping.
- **Maps** are items with the chart use: used, they Sketch their places at once, and they stay in the Bag. A kingdom map gives its outline, towns, roads and named landmarks, sold in its towns for about a month's wage at Qi Condensation (30 low-grade stones); a region map gives its kingdoms and named places, a city's for about a year's wage (360 low-grade) or a sect's for contribution; a treasure map gives one hidden site, exactly. Only a treasure map shows a hidden site.
- **Rumors** mark one place by name somewhere inside a dashed ring about 100 li across, found by going there and looking around. They come from cards that name a place, from asking a person, who knows the places round their home and their trade, and from an hour in a town's teahouse, one rumor a visit.
- **Told and true.** A Rumored or Sketched place shows its atlas `lore`, what the world believes; being there shows what is there; a place's `truth` comes out only in scenes.
- **Every start knows** its home kingdom Sketched, a day's walk round its home Seen and the region's famous places Rumored; a start with a sect or clan behind it adds that power's region map. What you know is the life's: a new life starts from its own origin's knowledge.

**Wherever you like, if you're strong enough.** Every place has a top realm and sits in some power's sphere, both in the atlas, and travel reads them:

- Open: anyone walks in. Roads, towns, the wilds.
- Gated: a sect mountain behind its array and gate guards, a city's inner ward, a clan's valley. You need a token, a rank, an invitation or a toll, or you force it, which works only if your realm beats the array's rating, since defenses scale with prosperity, and costs standing either way.
- Hostile: inside the sphere of a power at the bottom of its standing with you, or whose enemy you serve. You can cross, but encounters there are hunts for you, and the map says so.
- Deadly: a land whose own hazard sits above your realm, the forbidden lands and the beast ranges. The fog shows the warning, and going in anyway is how most cultivators die.

Checkpoints inside a sphere charge tolls from the Economy's fee list, and your fame decides whether the guard knows your face.

**A trip** is what gives going in its shape: a goal card, a bounty, a herb run, a patrol, a core hunt, a delivery; travel with its encounter rolls; the goal's scene plus one to three side encounters; and the return, with loot home, a coming-back story and a chronicle entry. While you're out your wheel is the trip's, so going in costs cultivation, and the spirit pool fills instead from M4. Free text and the narrator live inside scenes; between them the engine writes the travel line itself.

**Encounters** are tables per region keyed by terrain tags, the hour, the danger band, fame and the calendar, in six kinds: beast, cultivator, mortal, place, omen and plot, the last seeded by your origin, talents and grudges. Each is a scene template: tagged features, NPCs carrying intents from the motive list, stakes, and exits, fight, talk, flee, sneak, trade. It is a card like any other, with the scene panel and the narrator attached. The tables themselves, ruins and inheritances, dying in the world and the fog's exact rules are settled at D3.

## The resolver

How going in decides what happens (D3, 2026-10-14). Everything you try, from a lie to a formation round a city, runs through one pipeline, and NPCs run through the same one, since the rules take a cultivator and actions name who acts.

**The pipeline.** You type, and the interpreter turns your words into a plan of verbs with targets, the scene's features and the things you use (The world, Do whatever you want). The engine checks the plan can be tried at all, by scale and by what you hold, then shows each step's odds and stakes with **Do it** and **Change it**. Do it rolls and saves at once, the effects land, lasting states take hold, and the narrator tells it. GLM touches only the first step and the telling. A plan of several steps runs in order and hands back to you at the first fail or surprise. When your words could mean two things, the interpreter offers two or three readings as buttons instead of guessing. The scene's exits and the narrator's suggestions are clicks that skip the interpreter.

**Going in is GLM's** (Jan's call). It uses GLM 5.2 fully and has no templated version. Without a key, trips still run, resolved by the engine as they are while you're away and told by the chronicle's templated lines, but there are no scenes to go into. Tests drive the resolver with plans directly and the narrator through the mock provider.

**Chance has a narrow job:** close contests, what you couldn't have known (a guard's mood, whether a herb is ripe, who walks past), and keeping the same move on the same foe from always playing out the same. Wherever the world is a hierarchy, the outcome is certain.

**Power checks** are sized by realm, on the sheet's sizes (Combat, Realms are sizes):

| Check | Your number | Theirs |
|---|---|---|
| Notice someone sneaking | perception: your soul × (1 + Perception) | their stealth |
| Sneak, hide | stealth: your body × Agility | their perception |
| Threaten, press with your aura | your soul | their soul |
| Force: break, lift, hold, endure | your body | the foe's body, or the feature's own realm |
| Chase, flee, outrun | speed: your qi × Agility | their speed |
| Find, without divine sense | your soul | the site's danger realm |

Agility counts as it does in a fight, 5% a point above 10. A check with no opponent faces a size: the feature's own realm when it names one ("a sheer karst wall, Foundation"), else the site's danger realm.

- **Certain past a realm.** When one side's number is a full realm's step above the other's (×3.1 at Qi Condensation, ×4.6 at Foundation, as the steps run), the stronger side wins with no roll.
- **Rolled when close**, on a steep curve: chance = yours⁴ ÷ (yours⁴ + theirs⁴). Equal sides 50%, a fifth ahead 67%, half again 84%, double 94%. A Qi Condensation layer is about ×1.12 (61%) and a Foundation stage about ×1.5 (84%), so a stage weighs more the higher you climb.
- **What counts on your side**, multiplied onto the base and capped at ×2 together: a technique the action uses, ×1.05 a mastery level (×1.25 at Origin; this is what mastery gives checks, in place of "+2 to checks"); a node, talent or Way that names the check; the scene's things you use, ×1.1 each and three at most, as combat's creativity; a helper ×1.2, two at most. Their side counts the same sources, and a place's features count for whoever they favor (darkness for the one sneaking).

**Reading a realm** is never rolled. With your perception at or above their soul you read their true realm. Below it you read them as beyond you ("you can't see through his cultivation"), or, if they veil it, as the realm they choose to show, as many stages down as their concealment allows (Veiled Aura, Hidden Realm, a masking jade). A Foundation deacon never sees through a Nascent Soul; a Nascent Soul elder always sees through a Foundation disciple's veil. Perception from nodes, talents and detection arts is how a weaker soul closes part of a gap.

**The odds you see are the odds your character can judge.** Against someone whose realm you can't read, the step shows "?" and the engine rolls the true odds unseen. A certain step says so: "Sneak past the drunk porter · sure".

**People checks** are not sized by realm: a Qi Condensation con man with a forged token can fool a Foundation noble, and a mortal merchant can out-haggle you. Persuade, ask, lie, bargain, recruit and calm weigh your leverage against their resistance, both starting at 1, on a gentle curve, since people are fickle: chance = leverage ÷ (leverage + resistance).

- **Leverage:** trust (hostile ×0.25, wary ×0.5, neutral ×1, friendly ×1.5, trusting ×2; block 3 settles trust); an offer that meets one of their motives ×2; proof or a prop ×1.5 (a token, a sect's robe); standing with their power, ×0.5 at its worst to ×1.5 at its best; a talent, node or Way that names the check. Capped at ×8, so talk never passes 89%.
- **Resistance:** a motive against it ×2, suspicion of you ×2, their own talents.
- **Two things make talk certain.** A soul two realms above yours reads your lies, so a lie to it fails and it knows. And leaning on your aura turns talk into a power check: a realm above, it is certain, but what you get is obedience from fear, a fear bond (block 3), with karma for using it on the weak.

**Three grades.** A rolled check passes, passes at a cost, or fails; the quarter of the passing range nearest the line passes at a cost. The cost comes from the verb's own list (time doubled, a witness, a wound, heat, a thing spent or broken, trust lost, noise) and shows before you roll: "Sneak past the gate · 74% · at a cost: the dog barks · fail: caught at the gate". A certain check has no grades.

**No retries.** A failed check can't be tried again on the same target in the same way until something changes: a new day, a new approach (another verb, a new prop, a helper), or a move in trust, heat or the scene.

**Rolls** run on their own stream, `scene`. They roll on Do it and save at once, so a reload resumes after the roll and never rolls again. Change it re-reads your words and never rolls.

**Symmetry.** NPCs make every one of these checks against you: the rival's lie, the bandit's sneak, the elder reading your veil.

**The playbook:** the cases every D3 block is checked against. A case that can't play through marks a gap.

- Hide your realm, pose as an untested orphan and join the Beast-Butcher Gate, then keep the cover through spars, inspections and a breakthrough.
- Earn a half-blood's trust, go into the Realm of Mingled Blood on their blood, and betray them for the loot or leave them inside when the gate shuts.
- Drain a city for a demonic method: a hidden formation planted node by node, heat rising, and the city's Nascent Soul answering when it fires (M4).
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

**Experimentation** is the gamble: throw in any ingredients and the engine rolls against hidden recipes. Most tries fail or blow up the furnace, but each failure raises the odds of the next. A hit is a recipe that's yours to name, and it lands as an owned solitary node on the craft Dao's **discoveries edge** at the recipe's tier: a ring at the tier's rim where found recipes are laid automatically, unlinked, so the hand-laid part never moves and a furnace full of hits makes that tier visibly fatter on one side. Discovered recipes are the craft Daos' deeds, the way Ways grow by deeds. The hidden pool is every recipe you don't know: the ones sitting unbought in your tree, the ones inside manuals you haven't found (rare, and a scandal when it's a sect's secret pill), and wild recipes that exist only to be found. Each recipe carries ingredient tags, and the roll weighs how many of yours match (nothing in common and it isn't in the pool, so blind throwing finds only the commonest things), tier on the table below, a pity counter per ingredient set on the `craft` stream, and rarity on the shared table shifted by the furnace and the ingredients' own rarity. If nothing authored matches well, the pool holds a generated recipe, so experimenting never dead-ends: a recipe is a bundle of fields (tier, rarity, ingredient tags, an effect, a name), and generating one picks an effect the tags can make from the effect table, sizes it by tier and rarity, and names it once, kept in the save like a filled-in village. Generated recipes stop at blue; gold, red and pristine are always written by hand. Attended, throwing the ingredients in is the fire-control scene, keeping the furnace in its band by the same breathing grammar as the seat, and a steady hand is a bounded bonus on the roll, never the roll. The effect table, which tags make which effects at what size, is D4's real work, and alchemy needs it anyway to judge whether a recipe's ingredients make sense.

The odds per attempt:

- Base chance from your craft Dao tier against the recipe's tier: 25% two or more tiers below, 15% one below, 6% at your tier, 1.5% one above (only if your soul reaches it).
- Multiplied by your best mastery in that recipe family (×1 at Glimpse up to ×2 at Origin), by +20% per realm you sit above the recipe, and by +10% per tier in the recipe's element Dao.
- More materials help with diminishing returns: four batches count as about two tries.
- Each failure on that recipe line adds 1 point, up to 95%, and near misses give GLM a hint to narrate.

A Foundation alchemist at their own tier, with Comprehension in the recipe family and Fire Dao tier 1, has about 8% with one batch, 16% with four, and 33% with four after ten failures. Reaching one tier up with four batches is about 4%.

Each profession leans on part of you for quality, while your soul level gates its tier. A body-first cultivator can still brew pills, just slowly and badly.

| Profession | What it gives you | Leans on | While you idle | Ships in |
|---|---|---|---|---|
| Alchemy | pills for cultivation, breakthroughs, healing and poison | qi, soul | furnace queues brew | M4 |
| Artifact refining | weapons, armor, storage rings, flying boats | body, qi | forge queues run; artifacts bond as you nurture them | M4 |
| Formations | arrays for abodes, sects, traps and fights | soul, qi | arrays keep gathering qi, growing herbs and guarding | M4 |
| Talisman making | single-use spells: attack, shield, escape, message | soul | drawing queues | M4 |
| Spirit farming | herbs, spirit rice and spirit trees; an old herb is worth far more than a young one | qi | fields grow in real time, and patience raises herb age | M4 |
| Beast taming | captured, raised, bred and evolved beasts: mounts, scouts, fighters, materials | soul, body | beasts grow, breed and shed materials | M6 |
| Appraisal | identifying treasures, spotting fakes, judging auction lots | soul | standing orders snap up underpriced goods | M6 |
| Geomancy | finding spirit veins, hidden caves and good abode sites | soul | surveys reveal the land around your abode | M6 |
| Gu raising | venom insects for poison, curses, healing and control | soul | sealed jars fight it out; the survivor becomes the Gu | after v1 |
| Puppetry | puppets that fight, guard and work | soul, body | puppets work production lines without wages | after v1 |
| Divination | glimpses of coming events and calamities | soul | a daily reading warns of what's coming | after v1 |
| Medicine | healing wounds, soul injuries and poisons | qi, soul | a clinic earns income and favor | after v1 |

Formation puzzles show the engine-and-GLM split well. The engine hides which node is the array's eye, GLM describes the clues, Soul checks reveal hints, and a wrong strike backfires.

**People and powers** run on the same idle-and-world split:

| System | In seclusion (idle) | In the world (go in) | Ships in |
|---|---|---|---|
| Techniques | practice raises each technique's mastery from Glimpse to Origin; your cultivation method sets the qi rate | find manuals and inheritances; learn from masters | M1 |
| Sects | duties earn contribution while you idle; spend it in the library and shop | missions, politics, masters and rivals; rank from outer disciple to elder | M5 |
| Factions | standing drifts with world events | trade, quests and feuds across 7 standing tiers, Mortal Enemy to Revered | M5 |
| Fame | fades slowly while you stay in seclusion | grows with deeds, good or bad; strangers know your name, and factions react by their own values | M5 |
| NPCs and relationships | disciples and allies work for you | talk in free text and they remember it; friend, rival, sworn sibling, master, dao companion | M5 |
| Karma | hidden; shifts with your choices | changes encounters, tribulation strength and how factions treat you | M5 |
| World events | the calendar runs wars, auctions, tournaments and secret realm openings | show up and take part; rumors point the way | M6 |
| Prosperity | drifts while you idle: trade raises it, war drains it | sets the defenses, market size and prices of every sect, city and market; your deeds move it | M6 |

**Organizations share one skeleton.** Sects, clans, guilds, gangs and the rest are one kind of record: how you join, how you rise, the currency you rise by, what it asks, how you leave and what it gives. Each has its own rank names, halls or branches, and the chapters each rank unlocks. A type is a preset for that skeleton, and any organization can mix parts: a sect run like a gang, or a clan that owns a guild. The details are settled with sects before M5, and the atlas's powers will carry their type.

| Type | How you join | How you rise | What it asks | How you leave | What it gives | In the atlas |
|---|---|---|---|---|---|---|
| Sect, gate or palace | a test | contribution | duties, quotas | released or expelled | methods, a library | Waking Thunder Sect, Gate of Beast Craft |
| Clan | birth, adoption, marriage | bloodline, seniority | blood duty | never quite | inheritance, protection | Baili Clan, Nangong Clan |
| Guild or works | buying in, apprenticeship | capital, shares, craft rank | dues, trade quotas | selling out | markets, caravans, workshops | Geomancers' Guild, Cloud-Bearing Works |
| Gang | a blood oath | force, loyalty | territory, tribute | in a box | streets, fences | Tusk-Saw Gang, Jarless Gang |
| Society | recruited or sponsored | trust, secrets kept | silence, favors | hunted | intelligence, smuggling, contacts | Night Bridge Society, Core-Takers' Society |
| Assassins | recruited | kills, contracts | contracts, silence | hunted | poisons, marks | none yet |
| Academy | an exam | grades, exams | attendance, tests | graduating | teachers, alumni | Vermilion Brush Academy, Academy of the Chalk Line |
| Temple or abbey | vows | piety, merit | vows, service | breaking your vows | sanctuary, Buddhist arts | River Lamp Temple, Abbey of Settled Souls |
| Dynasty or army | conscription, office | merit, rank | service, taxes, war | deserting (hunted) or retiring | stipends, garrisons, authority | Great Jing Dynasty (the Gongsun garrison is written inside the March of Pacified Borders entry, not as its own) |
| Tribe | birth, a trial | deeds, age | the hunt, feuds | exile | land, beasts, old rites | Tribe of the Shark Caves |
| Beast power | bloodline, or a beast bond | strength | tribute, territory | devoured | beast lore, mounts, bloodline gifts | Beast Court of Ten Thousand Mountains |

**People, from the first hour.** Every person you've met has a record: name, where you met, what they are to you, friend, rival, senior, master, sworn sibling, dao companion, enemy, how they feel about you in words rather than a number, and their last known realm and whereabouts, which is only what you've seen or heard, so the same fog applies to people as to places. Who gets a record is the kept rule under Enemies, beasts and the people you meet. Each has a log: everything in your chronicle they were part of, since the typed chronicle stores actors by id, plus updates about them. In M1 updates come only from cards that name them, a letter from your senior, the sergeant posted to the wall. In M5 their lives tick on their own and bonded people send a yearly letter card; in M6 rumors and headlines feed the same log; after v1 a friend's exported snapshot writes its real progress there. The People screen shows them as circles and a web of threads (§ UI and screens, The People screen), with portraits once the cast list arrives.

**Romance and dao companions** are in, and the engine tracks every NPC you meet: affinity, history, promises and grudges. A dao companion is a bond with mechanics: paired cultivation methods, shared danger, and grief if they fall.

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

**Where you live matters.** An abode is a site with four properties: its spirit vein grade, which sets qi density; its defenses, which decide who can raid you; its market reach; and its neighbors. Reach is how far your goods and your news travel: which markets your standing orders can use, what price you get, since distance adds courier fees and risk, how fast a line's outputs sell, what the steward can source and how soon rumors reach you. It cuts both ways, since a market at the door means thieves and taxes and a remote cave means beasts and no help.

| Abode | Spirit vein | Defenses | Market reach | Neighbors |
|---|---|---|---|---|
| A wild cave | what you find, poor to fair | the rock | none; a caravan passes once a season | beasts, hermits, bandits |
| A sect cave, outer or inner | by rank | the sect's arrays | the sect shop; a town a day off | fellow disciples, your senior, rivals |
| A rented room in a cultivation market | thin | the market's guards | everything, at fees | merchants and every rumor |
| A city estate, rented or bought | fair | the city's arrays and your own guards | most, a day off | patrons, nobles, the sect's branch |
| A flying boat, from Core Formation | its own small array | its formations | wherever you park | your crew |
| A spatial cave abode, after v1 | the best | its own world | none, until you step out | nobody |

Rent is a seasonal fee; a sect cave is free with duties; a wild cave is free with risk. Moving a static abode is a trip: your bag and ring go with you and the rest stays in the abode's own store until you fetch it, hire a cart or pay a caravan, with robbery on the road as the risk. A mobile abode carries its store. A line that needs a market stalls when none is in reach. Sites arrive with M4 and moving with them; the flying boat comes with M6.

**Automation grows in four steps:**

1. You queue crafts yourself, spending hours of your day on them.
2. A disciple or hired hand runs a queue, at lower quality than you.
3. Standing orders buy inputs and sell outputs at a reachable market, within price limits you set.
4. A full chain, garden to furnace to shop, runs while you wander, as long as every link holds.

**The world pushes back:** prices swing with events, so a border war doubles healing-pill prices. Gardens draw thieves unless formations guard them, and disciples have loyalties of their own. When a link breaks, the line stalls until you fix it.

When you come back, a short steward's report sums up the engine's ledger, as templated lines the Scribe rewrites as prose when a key is set: "The garden yielded 40 Jade Dew Grass. Disciple Lin brewed 12 Qi-Gathering Pills; 2 batches failed. Healing pills doubled in the Jing Capital after the border clash."

An example chain: as Alchemy Hall head of Apricot Grove Valley, you draw the sect's herbs and two apprentices brew Qi-Gathering Pills. The sect keeps 70% for its quota, and your 30% sells through a consignment house in the Jing Capital while you're in seclusion.

Production ships across M4 to M6: queues and gardens with the arts, posts and disciples with the sects, markets and standing orders with the living world.

## Economy

Spirit stones are money and fuel at once, sect contribution is each sect's own currency, and progress splits about half from the world and half from seclusion. The balance sims hold that split: with gate items supplied, playing only one half should take about twice as long.

**Price yardstick.** Most atlas entries already agree on it, and the rest get brought into line:

| What | Price |
|---|---|
| Exchange with mortals | 1 low-grade stone ≈ 100 silver taels; a farm family lives on about 20 taels a year, and a mortal laborer earns about a tenth of a tael a day |
| A Qi Condensation cultivator's day of work (guard, guide, hunter) | 1 low-grade stone |
| Qi Condensation goods: a talisman, a common pill, a herb | 1–10 low |
| Foundation goods: a blade, rare herbs | 100–1,000 low; a Foundation-grade blade is about 400 |
| A Foundation Pill | about 1 mid at an auction, if one comes up; most are won, looted or brewed |
| Core Formation goods | 1–30 mid |
| Nascent Soul goods | 30–3,000 mid |
| Ransoms posted in the isles | a Qi Condensation disciple 100 low, a Foundation elder 1 mid |

Income follows the realm curve. A Qi Condensation cultivator earns a few low-grade stones a day, a Foundation cultivator a few tens, a Core Formation cultivator about a mid-grade stone, a Nascent Soul cultivator about a hundred mid, and a Deity Transformation cultivator a few high-grade stones.

**Stones as fuel.** Stones speed seclusion; they don't replace it. At Qi Condensation each low-grade stone burned during a day of qi seclusion adds about a fifth of that day's qi, up to about five stones a day, so a well-stocked day yields about twice the qi. That takes more than a day's wages, so working never beats secluding for raw qi; the world's share comes from what seclusion can't make. The qi each realm needs follows the realm curve, like income, so a day's wages buy about the same share of a day's qi at every realm, and a low-grade stone is worth a ninth as much at Foundation and almost nothing by Core Formation. That is why every realm hungers for the next grade. A day here means a full day of qi hours; with fewer qi hours on the wheel, the cap shrinks in step. Burning is a choice, off in a new life (Jan's call after P2.5f); when burning empties the pouch a toast says so, and the coming-back card when it happens while you are away.

**Where stones go:**

- Fuel: stones and pills for qi, body and soul, and the daily upkeep of methods that drink them.
- Upkeep: gathering, guarding and growing arrays burn stones every day.
- Crafting: materials, failed experiments and cracked furnaces.
- Fees: Armillary Pavilion array tolls, market fees, passage, taxes and bribes.
- Auctions, the biggest sink, where you bid against NPCs who want the same lot.
- Losses: robbery, raided gardens, repairs after fights, and everything you carried when you die.

**Sect contribution** comes from duties while you idle, missions in the world and donated goods. It buys the sect's manuals, methods, pills, a better cave abode and a master's time. Stones buy contribution only by donation, at a poor rate, so a rich outsider can't buy a sect's vault.

**What the balance sims measure:**

- real hours to each realm, by spirit root, a row per attended schedule (none, a third, all)
- the seat against the world: attended seclusion never outearns a trip of the same real time
- stone income against spending, per realm: positive but tight
- the world's share of progress, kept between 40% and 60%
- deaths per trip out, by the realm gap to the region's dangers
- win rates per matchup, in the fight sims

## Combat: rules underneath, free text on top

Combat is turn-based code you can play with buttons; typed free text is a layer on top, not a separate system. Letting GLM run fights alone was ruled out: it favors whoever writes best, loses track of HP over long fights, and can't be balance-tested.

**The rules.** Settled in D2.0.1: no dice, no gap tables, one sheet. Every fighter has six numbers, every source of power feeds one of them, and a fight compares two sheets.

- Six attributes. Qi, Body and Soul come from cultivation: qi pool and technique power; HP and physical damage; perception and soul defense, each shaped by the methods that climbed your stages (Cultivation, growth). Agility (Evasion, turn order, fleeing), Fortune (crits, loot) and Aptitude (how fast seclusion time pays off) come from birth, techniques and items. Each starts at a base value that talents move: body talents move Agility, fate talents Fortune, and soul and fate talents Aptitude. The base is 10, and a talent's grade sets how far it moves one: gray −2, white 0, green +1, blue +2, purple +3, gold +4, red +5, pristine +6. Each point of Agility above 10 adds 5% to Evasion and to fleeing; crits are 5% plus 1% per point of Fortune above 10, and each point also adds a 2% chance of an extra drop; each point of Aptitude is worth 5% on all seclusion gains.
- Each turn: one main action (technique, strike, defend, item, command beast, talk, flee) plus one minor action (move, take cover, swap artifact).
- **The sheet** is six lines, all plain numbers: **Accuracy**, **Evasion**, **Attack**, **Defense**, **HP** and **Qi**. Attack and Accuracy are sized by the ladder the action uses (qi for techniques, body for strikes and body arts, soul for soul techniques); Defense and HP by the body ladder, with the soul ladder as Defense against soul damage. The Character screen shows the sheet with each line's band beside it ("Attack 31 · Foundation early"), and the Combat screen shows every technique's hit chance and damage against the foe you've selected.
- **Two formulas.** Hit chance is Accuracy ÷ (Accuracy + Evasion): equal sheets hit 50%, double hits 67%. Damage is the technique's base × Attack ÷ Defense, with a ±15% spread; a crit is ×1.5. Defending adds 50% to Evasion and taking cover 25% until your next action. A qi technique can backfire, qi deviation turning it on you at half strength: the chance is a quarter of the toxicity meter's share, so a clean cultivator never deviates and a full meter deviates one cast in four (Items and gear, toxicity). Fleeing compares Agility and feels only the square root of the size gap, and talking compares soul sizes the same way, so escaping a stronger foe stays possible.
- **Realms are sizes.** Each realm has a size, and the sheet is that size times the quality of what feeds each line. The size steps ×3.1 into Foundation and widens every realm after, and a fight feels the step five times over, since the foe's hit chance, their tier's base, their Attack, your Defense and your HP each move by it: one realm up at the same stage is about ×300 in kill time into Foundation and ×200 million at the top (settled brutal in D2.1). A realm's stages climb to about four-fifths of the step out of it, so a peak sits just under the next realm's first stage: a Qi Condensation layer 9 against an early Foundation foe is the half-step fight of the novels, hard but real, and the half-step gets harder with every realm. The sizes live in the realms data.

| Realm | Step in | Kill time, one realm up | Size, first stage → peak | HP | Hit chance, one realm up at the same stage | Peak vs the next realm's first stage |
|---|---|---|---|---|---|---|
| Qi Condensation | | | 10 → 25 | 100 → 250 | | 44% |
| Foundation Establishment | ×3.1 | ×300 | 31 → 105 | 310 → 1,050 | 24% | 42% |
| Core Formation | ×4.6 | ×2,000 | 143 → 660 | 1,430 → 6,600 | 18% | 42% |
| Nascent Soul | ×6.7 | ×13,000 | 955 → 6,000 | 9,550 → 60,000 | 13% | 41% |
| Deity Transformation | ×10 | ×100,000 | 9,550 → 80,000 | 95k → 800k | 9% | 39% |
| Void Refinement | ×14 | ×500,000 | 134k → 1.5M | 1.3M → 15M | 7% | 37% |
| Body Integration | ×22 | ×5 million | 2.9M → 45M | 29M → 450M | 4% | 35% |
| Mahayana | ×31 | ×30 million | 91M → 2B | 910M → 20B | 3% | 33% |
| Tribulation Transcendence | ×46 | ×200 million | 4.2B → 90B | 42B → 900B | 2% | |

HP is ten times the size and the qi pool six times it, before growth. A technique's base damage is sized by its tier the same way: 40 at tier 1, and ×3.1, ×4.6 and so on at each tier above (124 at tier 2, 570 at tier 3), so a realm's first-stage art kills an equal foe in about four hits and the same art needs about nine by the peak, which is the push to find a better one. Kill time is how many times longer you take to bring them down than they take to bring you down, white kit against white kit, about the step to the fifth; P2.2's sim measured ×286 into Foundation. Fights across a realm last a turn or two, and the first hit that lands decides them. Big numbers display in 万 and 亿 (or K, M, B). This curve is steeper than the realm curve that sizes qi needs, income and prices (Scale of destruction); the two stay separate on purpose, since an economy that grew a hundred-thousandfold a realm would have nothing to sell.

- Techniques cost qi, which barely regenerates mid-fight. Defend and pills restore it; with an empty pool you only have basic strikes.
- Eleven damage types: Physical, Metal, Wood, Water, Fire, Earth, Lightning, Wind, Ice, Soul, Poison. Each has its own resistance, and most carry a status: fire burns, metal bleeds, wood roots, water chills, earth staggers, lightning paralyzes, wind unbalances, ice freezes, soul dazes, poison poisons. A crit applies its type's status.
- The five-element cycle adds tactics: an element that overcomes the target's deals 25% more, and chaining elements in generating order (Wood, then Fire) builds a combo bonus. Lightning and Wind join the cycle as Wood, and Ice as Water.

Damage, once a hit lands:

```latex
\text{damage} = \text{base} \times \frac{\text{Attack}}{\text{Defense}} \times m_{\text{element}} \times (1 - \text{resist}) \times m_{\text{crit}} \times \text{spread}
```

The element multiplier is 1.25 when your element overcomes the target's, 0.8 when theirs overcomes yours, and 1 otherwise; the spread is a roll between 0.85 and 1.15 on the `combat` stream. Everything else, rarity, Daos, growth, grade, the realm, is already inside Attack and Defense. Every size and multiplier is a starting value for the balance sim to tune.

**Rarity is a band.** A thing's rarity says which stage its line is sized at, in the thing's own tier (Tier, rarity and pedigree): white is early, blue is middle, purple is your realm's peak, gold is the next realm's first stage, red its middle and pristine its peak. So a gold sword art in Qi Condensation hands is a Foundation-sized Attack, and the sheet says so. This is how the novels talk ("his sword intent is already at Foundation"), and it is the whole fighting-up rule: a line of your sheet crosses a realm when something gold, red or pristine, or a body a realm ahead, or a heavenly grade, sizes it there.

**The fighting-up ledger.** A foe one realm up leads on every line by the step. Each advantage sizes one line, and lines multiply within themselves, so stacking on one line can push it two realms up (a red art, a red sword and ten Dao tiers put a Qi Condensation Attack at Core Formation) while the others stay home: a glass cannon whose hits land like an elder's, one time in seven, from a body that can't take one of his, which the sim scores at 0%. Crossing takes most of the sheet, and the body a realm ahead is the biggest single piece, since it sizes HP, Defense and Evasion at once.

| Advantage | Line | Size |
|---|---|---|
| Technique rarity | Attack; Accuracy ×1.2 at gold, ×1.4 at red, ×1.6 at pristine | up to the next realm's peak at pristine |
| Weapon rarity | Attack, at half share on techniques of its Dao and full on basic strikes; Accuracy ×1.1 at gold, ×1.2 at red, ×1.26 at pristine | a red sword alone is never a red art |
| Armor rarity | Defense | up to the next realm's peak at pristine |
| Method rarity and tier | Qi, Attack (purity) and HP, built stage by stage by the method that climbed each | about the next realm's first stage at red and its middle at pristine, over a full realm |
| Technique mastery | Accuracy | ×1.15 a level, ×1.75 at Origin |
| Breakthrough grade | every line | −1 to +3 stages |
| Body or soul a realm ahead | HP and Defense, or soul Attack and Defense | the next realm's size on those lines |
| Dao tiers | Accuracy and Attack | ×1.05 a tier |
| Intent and Domain (The combat Daos, the Intent ladder) | Accuracy and Attack on the Dao's actions; the foe's Accuracy, then Evasion and Defense | Intent ×1.15 and the foe ×0.9, about a stage; Domain adds the foe's Evasion ×0.9 and Defense ×0.95 |
| Element advantage | damage | ×1.25 |
| Creativity | Accuracy | ×1.1 a point, 0 to +3 |
| Tree and Way nodes | various | a few percent each; capstones a stage |
| Gear properties and enchantments | various | a few percent each; a red artifact's named unique may carry a stage |
| Offerings at the breakthrough | the grade | +0.5 margin at red and +0.75 at pristine, so a stage of grade |
| A weapon above your realm | Attack | half its tier's step, at a qi cost and ×0.8 Accuracy; the bond cuts the penalty, and at Origin the whole step counts |

Win rate follows the two sheets line by line, and under the brutal curve it is a cliff: a kit a fifth of a realm short loses nearly always, and a kit over the line wins nearly always. Four rows mark the cliff, kits rather than pedigrees: an ordinary kit has every line a step behind; a great-sect kit in purple with a perfect grade sizes its lines at its own realm's peak, a step short; a sacred-land genius in gold with a perfect grade stands at the next realm's first stage on Attack and Defense and fights it about even in the middle realms; a chosen of heaven in red and gold, Perfection, a heavenly grade and a body a realm ahead stands at the next realm on every line and wins.

The fight sim's targets (settled in D2.1 from the measurements, 10,000 fights a cell), as win rates against an ordinary foe one realm up at the same first stage, measured without one-shot consumables; the ordinary foe's own kit rises by realm (green at Core Formation, blue at Nascent Soul, purple arts at Deity Transformation), which is why every row falls off at Nascent Soul:

| Attacker | Qi Condensation → Foundation | Foundation → Core Formation | Core Formation → Nascent Soul | Nascent Soul and up |
|---|---|---|---|---|
| Ordinary: white gear, ordinary grade | about 0 | about 0 | about 0 | about 0 |
| Great-sect disciple: purple, Mastery, perfect grade | about 0 | under 10% | under 5% | about 0 |
| Sacred-land genius: gold, Mastery, perfect grade | about 0 | 40–60% | 25–45% | under 5% |
| Chosen of heaven: red art, gold gear and method, Perfection, body ahead, heavenly grade | over 95% | over 95% | over 95% | over 90% |

The Qi Condensation column is its own case: no major breakthrough has happened, so no grade exists, and tier 1 arts strike at tier 1 bases against Foundation HP, so nothing but a body a realm ahead crosses out of it; that is the half-step fight's job, and a layer 9 against an early Foundation foe (44% to hit) is where a Qi Condensation cultivator fights up. The rows are kits, not pedigrees: a typical great-sect disciple on the pedigree table (Enemies, beasts and the people you meet) sits between the first two rows. Beasts are their own foe: ×1.5 HP and no armor, so they lead on HP and fall on Defense, and a bloodline's abilities count as technique rarity. Within a pedigree the higher realm wins: a chosen one against a chosen one a realm up, or a great-sect disciple against another, wins under 5%. Two realms up is about 0 for everyone, and 5% in pristine from head to foot. At the same realm and stage, a chosen one or a great-sect disciple beats a rogue over 95% of the time, the sect disciple crushing the rogue as the novels have it, and a single stage up is easy to overcome. The sim holds these; what it tunes when content arrives is each realm's NPC baseline and the roster.

**Free text and creativity**

GLM maps what you type to legal actions and may add a creativity bonus of 0 to +3, under rules the engine enforces:

- Only real things count: scene features (tagged flammable, water, cover, high ground, fragile, dark), your items and your techniques. Invented items are ignored.
- Novelty: the same trick earns nothing the second time in a fight, and high-Soul enemies adapt.
- Bonuses never make the impossible possible. "I rip out his golden core" fails, and the story says why.
- Talk is a real move: bluff ("my master is the Azure Peak ancestor"), intimidate, bargain or surrender, rolled against the enemy's Soul and temperament.
- Enemies act from code. Each has a profile (aggressive, cautious, cunning, cowardly, fanatical) that picks techniques and decides when to flee or beg; GLM gives them a voice.

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

**The engine** confirms the brazier and grass exist and sets the grass burning for 2 turns. You stand at layer 5 (size 15.7) and Mo at layer 6 (17.6). Ember Palm's Accuracy is 15.7 × 1.15 (Comprehension) × 1.05 (Fire Dao tier 1) × 1.21 (creativity 2) = 22.9 against Mo's Evasion of 17.6: a 57% chance, and the roll lands. Damage is Ember Palm's base 40 × Attack 16.5 (15.7 × 1.05 for the Dao) ÷ Defense 21.1 (17.6 × 1.2 for his green water-silk robe) = 31, less the robe's quarter against fire, times a spread roll of 1.06: 25 fire. Ember Palm costs 12 qi.

**The narrator** writes from that outcome alone: "Coals spill across the spirit-grass and flame races up the stalks. Your palm drives through the smoke into his ribs; steam hisses off his water-silk robe, drinking part of the heat. He stumbles into the burning grass. 'Brat. You will pay for that.'"

**The log line** always follows the prose and shows the math: `Hit 57% · 25 fire · Elder Mo 151/176 · Qi 52/94 · grass burning (2 turns)`

**Effects fill the wait.** Every outcome carries five tags, fixed in D2: the form (slash, thrust, palm, projectile, aura, and for beasts bite, claw, charge, tail, breath; a talisman takes its technique's form, and defend, flee, talk and item are forms of their own), the element or damage type (the eleven), the attacker's realm, the result (hit, critical, miss, backfire, and for defend, flee and talk a held, escaped, failed or swayed), and the status it applied, if any. A multi-target action carries one outcome per target. Effects, sound and the log line read nothing else. The screen layers those into one effect, with no model involved. Form sets the shape, element the color and particles, and realm the scale: close to the target at Qi Condensation, across the screen at Foundation, a shaking screen at Core Formation and the whole view from Nascent Soul up, as Scale of destruction describes. A critical flares, a miss fizzles and a backfire turns the effect on you. The outcome arrives before the narrator's first word, so the effect plays in that gap. Reduced motion swaps it for a still flash, and sound hangs off the same tags.

A later upgrade, low priority, is the fight seen from far away: the camera pulls back by realm until the two cultivators are points of light with the land between them, and the same four tags drive what passes between the orbs and what the ground remembers. `docs/mockups/orb-fight-study.html` is the study (2026-10-12). It needs the effects honed well before it earns its place, so the screen effects above ship first.

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

1. Rules, world bible (with the scale of destruction) and style guide. They're identical every call, so hosts bill them at about a fifth of the input price once cached.
2. Player sheet: realm, body and soul levels, key techniques and items.
3. Scene: location, features with tags, the NPCs present and their memory notes.
4. Recent: the last 6 turns word for word, plus the chronicle summary.
5. The task: your words (interpreter) or the engine's outcome (narrator).

Memory needs no vector database: the game looks up notes for the NPCs and place in the scene by id.

**Guardrails**

- GLM never edits numbers or inventory. The narrator sees the outcome first and may not add rewards.
- Every JSON reply is validated with Zod: one retry with the error message, then a safe fallback such as a basic action and default choices.
- Names GLM invents (an innkeeper, a valley) become real only when the engine registers them, with stats from the region's templates.
- A cost meter in Settings: OpenRouter returns each call's cost when the request sets `usage.include`.
- A mock provider replays canned replies, so tests and UI work run offline and free.
- Use AI at design time too: draft herb descriptions, pill lists and tree nodes once, review them, and ship them as data.

**Tone: cutthroat by default.** The strong prey on the weak, treasure gets people killed, and warmth is rare and earned. GLM leans agreeable and sanitizes, so the game never depends on its goodwill:

- The engine decides the harsh parts: robberies, betrayals, executions. GLM narrates what happened and can't soften the outcome.
- NPCs carry motives as data (greed, ambition, grudges) and intents the narrator must play out, such as "Elder Mo means to take the herb from you."
- The style guide shows the voice with short examples and bans softeners, moralizing and default happy endings.
- The week-1 spike runs 20 dark scenes and checks GLM plays them straight. If it hedges, tighten the prompt or try another host.

**Request settings** (measured in the P0.3 spike; numbers in `docs/spike-report.md`)

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
- Interpreter calls add `response_format` with a JSON schema in strict mode and `provider.require_parameters: true`; Z.ai's own host, Novita and AtlasCloud don't list structured outputs. Every limit Zod checks (string lengths, list sizes) must also be in the JSON schema, or strict decoding can't enforce it: that one gap caused every invalid reply in the spike. The interpreter's schema lives in `src/ai/schemas.ts`.
- The narrator's tail failed 9 of 40 times in the first run: choices longer than the prompt asked, and Morph sometimes corrupting the JSON. With the tail's limits stated in the prompt, 40 of 40 passed. If a tail still fails, the retry asks for the tail alone as structured output at temperature 0.2, which passed 40 of 40. The scene is not rerun.
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

The game is dark glowing slate with a gold accent, built for desktop first and usable on a phone. Your cave abode is home, and a side menu reaches everything else. Screens appear in the menu as you unlock them.

**Only what you have touched shows, and what is new says so** (settled 2026-10-13, Jan's call after a sped-up playthrough missed every gift). **A thing opens where it lives** (Jan's call after P2.5f), one rule instead of timed unlocks: a method opens Cultivate and the Trees, since its manual grafts on its ladder's tree; a technique opens Cultivate › Practice, its Dao's tree and Combat; a copy opens the bookcase under Trees › Manuals; a loose manual opens the Trees beside its host; an item opens the Bag; insight enough to buy a first node (10) opens the Trees; a person opens People. A new life's starting gifts, its copy, technique, items and stones, toast once after testing day, though the life holds them as seen. A combat Dao's tree appears once you hold something of it: a technique that counts it, a weapon of its kind carried or worn, a manual grafted on it, or a node in it. A root's element doesn't count. A manual opens any tree it grafts on, Qi, Body or Soul as much as a Dao, even before that tree's ladder opens: the tree then shows the manual's graft alone, with a line saying its own nodes open with that ladder, and they fill in when it does. A Trees category appears once it holds a tree, so Ways and Crafts stay out of sight until their milestones fill them. Anything gained, a technique, a method, a manual, a copy, an item, a screen or a tree, is new until you look at it:

- a toast in the corner names it with a link to it, at most three at once, each gone after about six seconds; a burst folds into one ("+4 more"), and time away is told by the coming-back card, not by toasts;
- a dot on its screen in the menu stays until you open that screen, the way the Abode's mark stays while a breakthrough is ready, and a screen just opened also glows faintly in the menu until you first look at it (a tab the same, on its screen);
- on the screen, the new thing keeps a faint glow until you select it: a Bag square, a technique's row, a manual's jewel, a spine on the bookcase (a new copy's toast links to its spine).

**You do it the first time** (settled 2026-10-13, Jan's call after P2.5f; P2.8 builds it). The game teaches by having you use each control once. The first time in a lineage that a feature reaches you, it arrives switched off, a hint points at the control, and progress on it waits until you do it yourself; after that first time the defaults help as they do now (an hour flips to a new kind, a technique takes a free slot, a copy joins an empty queue). The record is the lineage's, so a reborn cultivator isn't walked through it again. You are never locked out: everything is on the screen to do early or another way. The first times built in P2.8:

| First… | Arrives | You do it |
|---|---|---|
| study hour | a fresh wheel is all qi | turn an hour to Study on the wheel |
| copy | unread, not queued (your method, at birth) | Read now on Cultivate › Study or its spine, and give it study hours |
| method read | known, not taken up: its ladder's hours give nothing | pick it under Climb with on Cultivate |
| technique | known, in no slot, no practice hour | Practice this, and give it an hour |
| tempering or nourishing art | known, not taken up, no hour | Climb with, and give it an hour |
| node within reach (50 insight; the Trees open at 10) | nothing changes | buy it on the Trees |
| stones worth burning (5 held, from layer 2) | burning off | turn it on in Cultivate |

Breakthroughs, drawing orbs and cards in the tray are already yours to do, and get a hint only. **The beacon**: while a first-time action waits, its screen's whole menu button glows lightly with motes drifting along its edges, the tab it lives in glows the same, and the exact control wears a soft ring; all clear the moment you act. Under reduced motion it is a steady glow with no motes. **Hints** are a hint kind of toast (`raiseToast`): one at a time, each shown once a life, staying until you do what it says or dismiss it (never gone because its moment passed by itself, an auto breakthrough or a card settled while away), with a link to the control. Hints are each life's own (Jan's call after P2.8): Settings has Hints on or off and Show hints again for the open life, and about five minutes in (30 days lived) a hint says so. The method's hint ("You have learned your first cultivation method… Take it up under Climb with") comes first, then one of its own to give the day more qi hours (gone when you turn an hour to qi), then drawing orbs, whose hint waits for a method taken up, and after the first orb one on what attending does (focus toward ×2, the inhale, fading once you leave); burning stones waits for layer 2, after them. After the first node, a hint says where more insight comes from, study hours first. The coming-back card names any first time still waiting ("Your tempering art waits for an hour"). The wheel stays set an hour at a time: no shortcut to fill it.

**Look.** Black cracked glass. A few long fractures cross the background from impact points, a fine web of cracks sits only around those impacts and away from text, and qi light leaks faintly through every crack. Panels are obsidian, a deep black with a slow lacquer sheen, so text never sits on a crack; their edge glows. A thin rim catches the crack light with a still bloom behind it, and a slow light walks round the rim, quicker while the panel waits on you, like the card tray with a card in it. A panel you can act on wears the accent on its rim and a warning the warning color. Under reduced motion the rim stands still, brightest at the top corners. `docs/mockups/obsidian-study.html` is the reference (direction B, with A for reduced motion); a rim that follows the qi bar was dropped, since the bar is progress toward the next step, not the qi you hold. Gold marks anything you can act on or have just gained. The crack light is the qi glow, and the qi, body and soul bars use it too, so qi reads as the light behind the glass. A breakthrough makes the cracks flare and opens a new fracture. The pattern is seeded per life and redrawn to fit the screen. A serif display face for names and realm titles, with hanzi set in a brush font as flavor, and a plain sans for numbers and menus: Cormorant Garamond, Ma Shan Zheng and Inter from Google Fonts, with system fallbacks. Starting colors to tune in the build: background #040507, panel glass rgba(10, 12, 16, 0.8), edge rgba(255, 255, 255, 0.075), text #e9e5da, muted #8d949d, gold #d6ab4c, crack light #7fc7d9. `docs/mockups/glass-study.html` is the reference mockup. The atlas keeps its own ink-and-silk look, since it is the authoring tool, not the game.

**Players pick their colors.** Settings changes the accent and the crack light, sets how much fine web the glass carries, and rerolls the glass, with presets and a free color picker that warns when a color is hard to read on black. Each color keeps its job whatever it looks like: the accent always means something you can act on, and the crack light always means qi. The defaults are gold, qi cyan and a light web.

**Rarity has its own palette,** never the accent's color or the warning color, since the accent must keep meaning "act on this": gray, white, green, blue, purple, an amber-orange gold with a soft glow, a deep crimson red, and pristine as clear glass: near-white with a faint rainbow refraction drifting across the name and a soft glow, the one glass in Severed Heaven without a crack; reduced motion holds the sheen still. All are tokens players can recolor, the sheen aside. A thing's name wears its rarity color, and its tier is a word beside it ("Foundation").

**Layout.** On desktop, the side menu is on the left, the screen in the middle, and a context panel on the right with tooltips, the latest chronicle lines and active queues. On a phone the menu becomes a drawer, and the context panel slides up from the bottom.

**The trees are opening fans** (Jan's pick, 2026-10-13, from the Trees screen mockups; it replaces the vertical tier bands). Every tree, the big three and the Daos now and the Ways and Crafts when they come, draws as a fan opening upward from its root at the hub. Each realm is a band further out, and all nine bands from Qi Condensation to Tribulation Transcendence are always drawn: a tier not yet written is an empty band with its realm's name and its capstone's place marked.

- **Shape.** Each band opens wider than the last, 150° at Qi Condensation (half-opening 75° + 6.25° a tier) until it is a half circle from Nascent Soul on, so a Dao reads mostly up and fills out as you climb. The fan is one half of the circle (Jan's call after P2.7): no band, crown or node lies below the root, and the canvas can't be panned below it. Each branch is a straight spoke (Jan's call after P2.7; the authored across as an angle wobbled): a branch stands where it was drawn, its spoke on the angle of its nodes' mean across (the tier's widest at 90% of the half-opening), neighbouring spokes kept at least 120 px apart at the band's middle and the rest of the band left empty for what comes later; its nodes run straight out along it at their authored depth, side by side only where it forks, a rejoining node between its parents, and nodes on one spoke kept a label apart (a side path drawn running sideways folds onto its spoke, sliding inward if it would pass the band's deepest ring). The starter and the capstone stand on the middle spoke. Sizes as tuned in P2.7, loosened at Jan's call so the names breathe: tier 1's starter at the hub and its other nodes from 150 px out at 54 px for each step of `at`, tier 2 from 840 px at 46, and each tier after from 1,460 px, 460 px further out a tier, at 34, each band stepping out by any rows its crown adds (Cultivation, Where manuals live).
- **Edges and labels.** Edges run along the spokes: nodes on one spoke join straight, and so does anything from the hub; where a node's branches part, or several meet in one node, the edge goes straight out to a ring between them, round it and straight out again, every edge from one parent (or into one child) turning on the same ring, so a parting reads as one arc, the way Path of Exile's orbits do. A label sits across its spoke, beside its node on an upright spoke and under it on a level one, so nodes along a spoke never collide.
- **Look: gilded.** A learned node is a ring of gilt with a soft glow, a notable a double rim, the starter and capstone medallions with a hanzi; a node you can buy now rings in the accent with its cost; a locked one is dark iron; a learned path is a gilt line with a fine bright core. Gilt is its own token, warm gold by default, so the accent keeps meaning act on this, and the three states differ in lightness as well as hue. Manuals are the only jewels, so a glow on a tree always means something found.
- **A manual's own tree.** A manual with no host draws as a small fan of its own at the top of the Manuals tab (Jan's call after P2.5c), in the same look: opening upward from its first node, its tier bands in ascending order, tier 1 innermost and each named for its realm. Its nodes act as a tree's do, details on hover or focus and Learn in them, so the tab carries no list of its nodes.
- **Moving round.** Drag or pinch to pan, wheel or pinch to zoom toward the pointer, + and −. The screen opens on the band you cultivate in at 100% (the hub low and centred at Qi Condensation; Jan's call after P2.8, since fitting the band left the names too small to read), Re-centre comes back to it, and a dropdown of the nine realms ("you are here", "next") jumps to any band. Lines keep their width at any zoom, the band names grow with their rings so the far realms read when zoomed out, and tooltips stay screen-sized.

| Screen | What it shows | Ships in |
|---|---|---|
| Abode (home) | your silhouette seated cross-legged, qi drifting in, circulating and settling in the dantian, which glows brighter as the qi bar fills; orbs to draw in by hover or touch, and the focus meter (Attended seclusion); realm and stage, qi, body and soul bars, age against lifespan, today's wheel and routine, the card feed, the spirit pool from M4, alerts | M1 |
| Cultivate | what your hours do (Jan's call, 2026-10-13, from the "Cultivate as three tabs" mockups): a strip of the day's twelve hours with their counts across the top, and three tabs, one per kind of work, which an hour on the strip opens. **Cultivation**: the day wheel with its element hours and routines, the method on each ladder with its switch (shown even with one known), and the auto setting for minor breakthroughs and stone burning; the breakthroughs themselves are called at the Abode, a button per ladder under the figure and a panel for a major one. **Practice**: what was the Techniques screen, whole (below). **Study**: the copy being read, with its bar, time left, lump and "suits you"; the queue after it, reordered and pruned; the unread copies on the shelf with Queue and a link to their spine; and what study gives. Cultivation and Study show from the start, since qi and study hours are open from the start; Practice shows with the first technique. On a phone the tabs are a segmented row | M1 |
| Trees | pick a category, Cultivation (Qi, Body, Soul), Daos, Ways, Crafts or Manuals, each showing once it holds something, then a tree, with a "?" by its name totting up what its learned nodes give (sealed ones apart, its grafts on their own lines): an opening fan you drag and zoom (The trees are opening fans, above), each tree's manuals as jewels in its bands' crowns, sealed nodes dimmed, opening on the band you cultivate in, with Re-centre back to it and a ladder to any realm; a node's details open in an overlay. Manuals holds the hostless manuals and a bookcase of every manual held, a spine each with a hover card (Cultivation, Where manuals live) | M1, Daos M2, Ways M3 |
| Cultivate › Practice (the Techniques screen until P2.5f) | what you practice and what it gives; it left the menu for Cultivate's Practice tab, and links to a technique land there. A Practicing panel on top (each technique practiced, its bar, the time to its next level and the insight that level releases); a list of every technique beside one technique's page. The list keeps a line's later chapters under the earlier, edges a technique in its rarity's color from blue and makes it glow from purple, orders by rarity, tier or order learned, and past eight techniques adds a search and tier and Dao filters. The page: its mastery as five steps with each level's practice days and insight and the time to the next, requirements, what is still sealed, the line's known chapters, and one line on its Art (learned, awake, when the next wakes) linking to the tree: an Art's passives are bought on its tree, never here | M1 |
| Character | talents, the six attributes, fame and standing, and one line counting manuals by kind, linking to the Trees screen's Manuals | M1 |
| Chronicle | your life as a river: the milestones as stations on a fine gold line, everything else as prose beside it, a chapter for each realm, with an almanac of seasons as the second view; breakthroughs, fights, rumors and steward reports all land here; `docs/mockups/chronicle-river.html` is the reference | M1, redrawn in P2.9 |
| Settings | OpenRouter key and cost meter, saves, clock speed, colors and glass, text size, reduced motion, the mature content switch | M1, AI parts M3 |
| Bag | a grid of squares with names in rarity colors and tiers as words, gear on the figure's squares, the abode's store as a second grid, stones as a count; `docs/mockups/inventory-study.html` is the reference | M2 |
| Go In | the adventure screen, described below | M3 |
| Map | the zoomable world map with fog of war; tiers open with M6 | M3 |
| Crafts | furnace, forge, array and drawing queues, recipes and experimentation | M4 |
| People | everyone you've met as circles (grouped by where you met them) or a web of threads, with the chosen person's page beside them; your sect and factions from M5; `docs/mockups/people-study.html` is the reference | M1, full in M5 |

**The go-in screen.** The narration streams down the middle, each turn followed by its log line with the math. Three or four suggested actions sit under it as buttons, with a free-text box below them. A scene panel beside it shows where you are, the tagged features, who is present and your HP, qi and statuses. Leaving returns you to the abode with a summary of what you brought home.

**The People screen.** Two columns: the people on the left, the chosen person's page on the right, so opening someone never hides the list. The left has two views. **Circles** is the default: a list grouped by where you met them (the Gate, kin and home, the road), each row a seal, a name, their bond and how they feel in words; from M5 the groups are your sect and factions. **The web of threads** is the second view: you at the centre, everyone joined to you by a crack of qi light. Distance is how they feel about you, the warm close and glowing in the crack light, the hostile at the rim in the warning color, the indifferent dim between; the bond sets which side of the web they sit on. Past a dozen or so people the web shows your nearest and the rest stay in the circles. Until portraits arrive, a person's seal is their surname in the brush face inside a carved square, tinted by their feeling. The feeling is always words, with seven quiet notches behind them as a glance, never a number. Fresh news is a gold dot on the seal and the newest line at the top of their page; there is no separate feed, since the context panel's chronicle carries it. A person's page: the seal, name and bond, their one-line summary in the display face, feeling, realm, whereabouts and where you met, then their log as a thread, with "Write a letter" and "Seek them out" waiting for M5 and M3. `docs/mockups/people-study.html` is the reference (B and C; A and D were passed over).

**The Chronicle screen** (settled 2026-10-14, P2.9 builds it). Every line has a **kind**, shown as a brush character in its color, so what happened reads at a glance: 气 qi, 体 body, 魂 soul, 关 gate, 精 mastery, 学 learned, 战 fight, 伤 hurt, 人 people, 事 choice, 了 settled itself (dim), 生 birth and origin, 终 death, 开 an opening. The kinds are data beside the event templates, and a chip per kind filters the screen. Two views share the chips and link to each other:
- **The river**, the default, newest at the top. One fine gold line (the trees' gilt, apart from the accent) runs down the middle of a margin and the text. The milestones (qi, body and soul steps, mastery, gates, birth, death) are **stations** on it: a ringed brush mark, the line in the display face beside it. Everything else that season is one **paragraph of prose** beside the line, each sentence led by its kind's mark, with the season's brush character (春 夏 秋 冬) in the margin. Each year opens with the age in faint numerals in the margin and the world's year as its heading ("Sealed Era 3,137", the realm under it in small type). Each qi realm is a **chapter**: a header where the life enters it, with the realm's hanzi, its name and its span ("ages 12–22 · Sealed Era 3,127–3,137"); a major breakthrough is a large station with the realm's hanzi (筑基). The line keeps one width throughout and does not glow more with level; the chapters carry the level.
- **The almanac**: a row per year, newest first, a column per season, a brush mark per line in each square, breakthrough seasons edged in the qi color and a new realm's in gold, and where the year ended at the right. Picking a square reads it out beside the grid, with "Read it in the river"; each year in the river links back to its row.
- **Long seclusion keeps its years.** Three or more years in a row with nothing but steps and cards that settled themselves are a stretch of seclusion: a shaded band with its span and what it gave ("18 years: 2 stages of qi, a body layer"), every year in it a row, the quiet ones as thin ticks, so eighteen years look long. Only the years before a life's first hour fold into one line.
- **Earlier lives** in the slot are a picker in the header, each on the same calendar ("Lan Shu, 3,052–3,114"). On a phone the river keeps its margin narrow and the almanac drops the year's-end column. The line is still, with no blur or looping animation, so long lives scroll smoothly.

**Coming back.** After time away, a story card tells what happened while you were in seclusion: qi gained, breakthroughs, queue output, and the cards that resolved on their own, with the rest waiting in the feed. From M5 it includes the steward's report.

Numbers use short forms past ten thousand (12.4k, 3.1M), and every number that matters has a small "?" beside it that shows how it was worked out, on hover or a tap, so the sums stay out of the way.

**Less spreadsheet.** Words first, numbers behind the "?", including the bars: "qi thick as river mist" with the number on hover. The Abode is home: the figure, always seated cross-legged, with the hour as the sun on it (§ Cultivation, The hour on the figure) and the cards arriving under it. Every number that changes has a moment: a full bar puts its breakthrough under the figure, now or wait and let it fill, a card says what happened, and the typed chronicle reads as a biography, its lines in prose under the season and the world's year ("Winter 3,137"). Realms and layers are words everywhere, "Qi Condensation, fifth layer". The glass carries a season tint and weather from the calendar. Named days and named people from the first hour, with portraits once the cast list arrives. The cave itself does not change with your things; that would need a design per kind of abode, and waits.

**The Bag.** Squares, not volume: the grid is the capacity, and bulk is a thing taking more than one square. Pills, talismans, herbs and materials stack to 99 a square, ores and bulk materials to 20, gear takes one, and a cauldron, a corpse or a beast takes several. Your pack on foot is small; a mortal cart or mount adds squares while you travel with it, and losing the cart loses what is in it; a storage pouch at Qi Condensation, a storage ring at Foundation, bigger rings and spatial items above. Stones are a count, never an item, and a ring holds any amount, as mortals' silver does. The abode's store is a large separate grid, so "carry what you can, leave the rest" is two grids. Gear squares sit beside the figure, weapon, armor, ring, pouch, and dragging onto them equips; the same figure stands on the Character screen. An item shows a glyph from design-time art, its name in its rarity color, its tier as a word and a stack count, with the "?" for the rest, and unknown things show as "?" until appraised in M6. `docs/mockups/inventory-study.html` is the reference.

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
- Randomness is seeded, so the same seed replays the same fight and bugs reproduce.
- Saves carry a version number and migrations from day one.
- The loop ticks a few times a second. On load it applies offline time, capped, and shows what happened while you were in seclusion.

**Your key, and your friends' access**

- Now: paste your OpenRouter key into Settings. It stays in your browser; never commit it.
- Friends, option A: a "Connect OpenRouter" button. OpenRouter's PKCE sign-in gives each friend's browser its own key, so each pays their own cents and you run no server.
- Friends, option B: a small Cloudflare Worker that holds your key behind a daily spending cap, if you'd rather cover them.

## Roadmap

| Milestone | Weeks | Contents |
|---|---|---|
| M0 Lore, setup, AI spike | 1–2 | world bible; GLM spike: JSON, thinking off |
| M1 Idle core | 3–5 | Qi to Foundation, body, soul, insight; story cards and the first decks; no AI |
| M2 Combat engine | 6–7 | rolls, damage types, v1 Daos; fight sim |
| M3 Go-in slice | 8–10 | one fogged region; free text; loot flows home (the playable slice) |
| M4 Crafts | 11–14 | four great arts, spirit farming; Core Formation |
| M5 People and powers | 15–18 | NPC memory, romance, sect posts, factions |
| M6 Living world | 19–21 | map tiers, markets, events, beast taming |
| M7 Big moments | 22–24 | Nascent Soul, tribulations, heart demons |
| M8 Rebirth and friends | 25–27 | lifespan, reincarnation, friends build |
| After v1 | | friends as NPCs, then co-op go-in sessions |

Each milestone ends playable, so stopping at any point still leaves you a game. Each milestone opens with a design session that works down the Still to design checklist for its topics.

## Risks

The biggest unknowns are how GLM behaves through OpenRouter, so the week-1 spike tests them before any game code depends on them.

| Risk | Early warning | Fallback |
|---|---|---|
| Thinking-off doesn't reach GLM 5.2 through OpenRouter | `reasoning_tokens` above 0 in the spike | try effort "none", pin a host where it works, or swap the narrator model in config |
| JSON drift | Zod failures on more than 5% of turns | a tighter schema with fewer fields, one retry, a safe fallback action |
| Prose quality varies by host | flat or repetitive scenes from some hosts | pin preferred hosts; require fp8 |
| GLM contradicts the state | narration mentions loot the engine didn't grant | outcome-first prompts; drop unlisted rewards from the tail |
| Content volume: many trees, 9 tiers each, many nodes per tier | node lists hold up a milestone | draft nodes with AI at design time, curate them, and ship only tiers 1 and 2 in v1 |
| Scope: the full list is ~27 weeks | a milestone runs past twice its estimate | ship the next playable gate; move the rest after v1 |
| The two economies fight | the sims show world loot outpacing seclusion, or the reverse | tune drop tables and rates in data, then rerun the sims |

## Still to design

Settle each before the milestone that needs it. World content is drafted and checked in the atlas. The week-1 test and the M3 slice play in the Border Wilds, the Morning Star Continent's beast frontier.

**Before M0 and M1**

- [x] World bible basics: cosmology, naming style, currency, races, random start
- [x] World content: drafted in the atlas, with 6 continents, 86 regions, about 200 kingdoms, about 150 sects and clans, history and cosmology
- [x] Atlas review: consistency pass done (borders, names, prices, realm ceilings, the top tier); the start corner is the Border Wilds
- [ ] Canon pass: mark atlas entries canon as you read them, the Border Wilds first
- [ ] Atlas export for the game (a build task for plan.md): a JSON download, coastlines and borders saved as fixed outlines, and a strict realm field instead of free text
- [x] Character creation and the first hour: talent roll, origin, tutorial, first breakthrough, first trip out
- [x] UI and screens: abode dashboard, tree views, crafting, inventory, world map, go-in screen, chronicle, settings, visual style
- [x] Economy: spirit stones, sect contribution, prices, money sinks, what the balance sims measure; then bring the atlas's dozen luxury prices into line
- [x] Saves: format, versioning, export and import, save slots
- [ ] Node lists: tiers 1 and 2 of each v1 tree, 25 to 30 nodes a tier for the big three and 10 to 15 for the combat Daos (skeletons drafted in D2 under The combat Daos, the nodes written in P2.3), drafted with AI help and curated. The Qi, Body and Soul trees in the M1 build, reviewed by Jan, the combat Daos before M2, the Ways before M3, the craft Daos before M4
- [x] plan.md for Claude Code: the build split into one-session phases, written once planning is done

**Before M2 and M3**

- [x] Items and gear (D2, § Items and gear, with offerings under § Cultivation): slots, grades, artifact bonding and artifact spirits, pill toxicity, storage rings; item, talisman and array power on the realm curve, with a higher-realm talisman priced by its own realm; tier and rarity on every item (Tier, rarity and pedigree), weapons and armor on the fighting-up ledger's axes, weapons above your realm; aptitude-raising pills and rites; the upkeep some methods drink
- [x] Enemies (D2, § Enemies, beasts and the people you meet): beast and cultivator templates, behavior profiles, loot; pedigree tables and each realm's ordinary baseline, tuned to the fighting-up ledger
- [x] Combat outcome tags for effects and sound (D2, § Combat, Effects fill the wait): form, element or damage type, realm and result on every outcome
- [ ] Exploration: travel, trips, look around, the fog and the open, gated, hostile and deadly rule are settled under The world; left for D3: the encounter tables per region in the six kinds, scene building from the card format, ruins and inheritances, fleeing, dying in the world, and ways to flee, hide or talk past foes a realm or more above you
- [ ] NPC basics: the person record and its log are settled under Professions, people and powers; left for D3: what each NPC knows, how talk changes relationships, the intents and motives scenes draw on
- [ ] Story decks: the seclusion deck in M1, then a deck per milestone; what each card trades and how often it comes
- [x] Procedural methods and items (D2, § Generated methods, techniques, manuals and items): a method is already a bundle of independent fields, so white-to-blue methods and items can be generated from tables and named once, as manuals are; gold and red written by hand. Loot and shops hand them out on the shared table
- [ ] NPC pace (D2): NPCs progress at the away rate, so an attended player outpaces a same-pedigree NPC by about double; the pedigree tables are tuned against the away row, and that gap is the player's edge for playing
- [ ] The Breath branch beyond tier 1 (tier 2 drafted in D2 under The Breath branch; Core Formation up later): Attuned Breath, Heaven and Earth Resonance, Circulating Thought, Unknotting, and what each realm's vocabulary adds
- [ ] Hands-on crafts (D4): alchemy's fire control and formations as placing, laying nodes on the abode's grid so the lines close, on the qi-handling grammar; the effect table behind generated recipes; styles and their chapters; technique forms in practice hours as a maybe, the first thing to cut if it feels like filler

**Before M5 to M8, sketched now**

- [ ] NPC depth: aging and death, NPCs who climb on their own, rivals who return stronger, disciple loyalty and betrayal; a cast list of the atlas's named people (a person kind or a people file) with fixed looks, so portraits can follow
- [ ] Write a manual (M5): turning knowledge you hold into a manual item to teach, sell or lose, and sects handing out a style's next chapter by contribution, rank or favor
- [ ] Sects: ranks, politics, founding your own, sect wars; faction strength weighted by the realm curve, so a sect is mostly its ancestor; every organization on the shared skeleton (Professions, people and powers), with the atlas's powers tagged by type and an assassins' organization added
- [ ] World simulation: events calendar, secret realms, auctions, tournaments, wars
- [ ] Death, rebirth and legacy: what carries over, how much time passes, what the world remembers
- [ ] Art and sound: how much, and from where. Settled so far: location art and portraits are made at design time and shipped as data, never generated in play, with shared art by tag for filled-in places; portraits wait for the cast list; sound hangs off the same engine events as combat effects

**Anytime**

- [ ] The game's name

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
