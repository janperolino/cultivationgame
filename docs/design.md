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
| Power and pedigree | One rarity scale for everything, as a fraction of a realm; gold and red nearly jump a realm at every realm; a fighting-up ledger the fight sim enforces | Geniuses fight up and ordinary cultivators don't, through the same rules for players and NPCs. |
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

The calendar runs on seclusion time: one real hour is one in-game year at Qi Condensation, close to the first guess of a minute per week. The clock speeds up with each realm so any realm's full lifespan lasts about 120 real hours: roughly 1.7 years an hour at Foundation, 4 at Core Formation, 8 at Nascent Soul.

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

The gap between realms widens as you climb, as in the novels: about ninefold from Qi Condensation to Foundation, thirtyfold to Core Formation, and a hundredfold from Nascent Soul up. The world is built around that gap. It is one number per realm, the realm curve, kept in the realms data, and everything that grows with realm follows it: power, the qi each realm needs, income, prices, and the power of items, talismans and arrays. This is a first draft to edit; GLM's world bible and the engine both read from it.

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

**Fog of war.** The in-game map shows only what you know, in four states. Seen: places you have travelled, plus a soft circle of divine sense around you (its range is in the scale table). Sketched: outlines from bought or looted maps, with nothing inside. Rumored: a mark and a name from sect libraries and rumors, with no outline. Unknown: cracked fog, the same dark glass as the rest of the game. The mockup shows all four. Exactly what reveals what, and how much, is settled with exploration.

**Where you start is part of the roll.** A village orphan sees one kingdom and takes it for the world. A child born into a great sect starts just as weak, but with the continent's maps, its politics and its libraries.

**Generation.** The big places are written by hand, as the world bible describes, and small ones fill in procedurally around them. The save keeps everything, so the world never changes behind your back.

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

**Breakthroughs.** When a bar fills, the next layer or stage is a check at the odds the Cultivate screen shows. Layers 1 and 2 always succeed, and layer 3 is the first real check. The bar keeps filling past full up to 150%, and each extra 10% raises the odds, so the choice is to go now or consolidate. An attended attempt is a scene: for ten seconds the circulation races, sparks pass the gates, and each one you breathe in on time adds a bounded step to the odds, like overfill, up to a cap; a miss costs nothing. The code still owns the roll. Layers 1 and 2 always succeed, so the scene teaches itself without stakes, and an attempt made away or on auto skips it. A failed minor breakthrough costs a fifth of the bar and a few days of unsettled qi, with no injury below Foundation. Offline, minor breakthroughs run on an auto setting, safe odds by default. Major breakthroughs never happen offline: the bar holds at full and the coming-back card says you are ready. A failed major breakthrough uses up the gate item, halves the bar and leaves an injury that slows cultivation for a few in-game years. At the lifespan edge, the last chance lets you attempt the major breakthrough below a full bar if you hold the gate item, at worse odds and a flawed grade at best; without the item, or if it fails, the life ends.

**The day is twelve double-hours.** Seclusion runs on a wheel of the twelve 时辰, from 子 at midnight round to 亥, and you set each hour to one thing you do with your own time: cultivate qi, temper the body, nourish the soul, study, practice a technique, or sleep. Furnace, forge, garden, beast, sect-duty and shop hours join as those systems arrive (M4 to M6). Whatever others do for you runs outside the wheel: disciples' queues, arrays, puppets and fields growing in real time. So every step of automation hands hours back to cultivation. Aptitude and talents set how fast each hour pays off, and lifespan caps the total, so spreading too thin means dying before the next breakthrough.

- Element hours: each earthly branch carries an element: 寅 and 卯 wood, 巳 and 午 fire, 申 and 酉 metal, 亥 and 子 water, and 辰, 戌, 丑 and 未 earth. Work that matches its hour's element pays about 25% more: a fire root cultivates best at 巳 and 午, alchemy is strongest at noon, and Ghost Way and other yin work belong to the night. A root matches every hour of each element it holds, so a mixed root matches most of the day and an earth root twice the hours of a fire one; that is just how it is, and the other elements find their bonuses elsewhere. Lightning and wind count as wood and ice as water, as combat does. A tempering or nourishing art may carry an element too, and then its hours match the same way; talent, resources and environment are the fast road for body and soul in any case. Dawn's purple qi at 卯 adds about 10% to everyone's qi.
- Sleep: at Qi Condensation the body is still mostly mortal, and 子 and 丑 are locked to sleep. Foundation frees them: "You no longer need sleep; two more hours are yours."
- Routines: a whole wheel can be saved as a routine, and routines are also learned from teachers, manuals and sects, such as the garrison's Watch Rotation or a hermit's Nine Midnights. Following a learned routine exactly, all twelve hours, earns a discipline bonus of about 10% on every hour; its cost is rigidity, since a routine with no body or soul hours leaves both behind. A sect can impose its own routine, morning lecture and duty hours included, and keeping it grows the Orthodox Way, so breaking routine to cultivate more is a small, real choice.
- A fresh life's wheel is all qi. When a new kind of hour becomes possible, study at layer 2, practice with the first usable technique, body or soul with its art, one hour flips to it with a chronicle line: the qi hour worth least to you, one that matches neither your root's elements nor dawn, latest in the day first. Rearrange freely. The same rule fills a migrated save and the pacing sim's day.
- Every hour also leaves insight (see Insight below).

**Attended seclusion.** The Abode's figure shows the qi hours as they happen: motes drift in from the edge at the real qi rate, tinted by the hour's element, enter at the crown and the palms, run the circulation and settle in the dantian. Without a method the qi drifts close and slides off; unsettled, the loop jitters and sparks leak; at a full bar it runs fast and the dantian overflows. While you attend, qi speed carries one more factor, attention, from ×1.25 for being there to ×2 at full focus:

- Orbs: now and then, every ten to twenty real seconds, a bright orb drifts in. Hover over it, drag a finger through it, or press breathe (space or B: the nearest orb within reach, about a breath and a half of cooldown so it can't be mashed) to draw it in. A catch fills focus; focus drains slowly back toward the floor, and to ×1 over a minute once you're away. Orbs appear only on the Abode; the floor holds on every screen.
- The breath cycle is the skill, not aim: the figure breathes on a slow cycle, orbs tend to arrive on the inhale, and a catch timed with the inhale is worth more. A late catch still counts for its base.
- Qi heat: greedy catching warms the meridians, the circulation reddening toward the warning color, and past the threshold you tip into unsettled and lose the bonus for a while. Steady breathing is safe; greed can backfire. Nodes raise the threshold and the cooling rate.
- Orb kinds: an orb carries its hour's element, and from tier 2 nodes an orb of your root's elements is worth more; dawn's purple orbs at 卯, dark yin orbs at night, lightning orbs while a thunderstorm card is live, and knots you don't want to catch, each a data entry.
- Still Pool: resting the pointer on the dantian, or holding breathe, stops the drain, so sitting quietly is a valid way to attend. If the sim ever shows chasing beating sitting by more than the ceiling gap, the tuning is wrong.
- The tutorial layers keep it simple: the floor only, no heat, so the first hour can't unsettle you.
- Rules: orb value scales with the realm's bar so focus reaches the same ceiling at every realm; orb spawns roll on their own `orbs` stream, and a catch is an action that names who breathes; focus is never saved and starts at zero on load; under reduced motion orbs pulse in place and the circulation glows steadily; the canvas pauses when the tab is hidden, which is also how away is known, and particles are capped.

**Circulation on the figure.** The pattern the sparks run is the active qi method's `circulation`, with a default by rarity: gray a crude, uneven loop; green a clean small orbit; blue the orbit plus the two arm channels; purple the full meridian net; gold the great orbit with a second ring through the limbs and more sparks in flight; red a named pattern of its own, so the Night Bridge method lights up like nothing else. Each realm then changes the vocabulary, not the count, so Nascent Soul reads as a different order of magnitude: at Qi Condensation motes from the edge of the cave and the small orbit; at Foundation strands pulled from past the frame, the great orbit through the limbs, a floor of qi under the figure; at Core Formation rivers bending toward a visible spinning core, the net pulsing from it, the air of the room moving; at Nascent Soul the cave is gone, sky and mountain behind, the region's qi leaning in, and the small figure above the head drawing with you. Rarity sets the detail inside each realm's vocabulary.

**Body and soul cultivate alongside qi, and can run ahead.** Each climbs its own ladder of realms and stages in parallel with qi, and either can run up to one major realm, four steps of the combat ladder, ahead of your qi realm: "his body was already at Core Formation while his cultivation sat at Foundation."

- Body ahead: more HP and physical damage, and physical clashes are judged at your body level. Tribulation lightning strikes the body, so you survive tribulations more often. Artifact refining leans on body too.
- Soul ahead: wider divine sense, and you see through hidden realms. Realm pressure, illusions and heart demons are judged at your soul level. Crafting at a tier needs your soul level to reach it, so a trained soul crafts one tier above your realm.
- A failed heart demon can injure your soul and knock it back a stage or more; it heals with time and pills.

Each ladder follows the qi rules: layers 1 to 9 at Qi Condensation, then four stages per realm, a bar fed by tempering or nourishment, minor breakthroughs between stages and major ones between realms, each major one with its own insight threshold. Lifespan follows qi alone. Gate items for major body and soul breakthroughs are settled with items and gear. A body or soul you neglect stays behind, and it is judged at its own level.

**Every ladder needs a method.** Qi climbs only with a cultivation method, the body only with a tempering art and the soul only with a nourishing art, each in the hours you give it. Nobody starts with a body or soul method: your origin hands you a qi method, and the other two are found, bought or earned. Until then, body and soul grow only from the world: fights and hardship, medicinal baths and beast blood for the body; epiphanies, contemplation, near-death and heart demons for the soul. Those world sources stay the fast road even with a method, which is the slow, steady one.

**The big three have trees too.** A level is raw power and the gate; the tree beside it shapes that power, and its nodes cost insight like any other tree:

| Tree | What it shapes | Example nodes |
|---|---|---|
| Qi | how you spend your qi | cheaper techniques; faster qi recovery mid-fight; a deeper pool; purer qi for harder-hitting techniques; hiding your realm; longer flights |
| Body | how your body holds up | iron skin against physical damage; blood refining for regeneration; poison immunity; endurance against tribulation lightning |
| Soul | how far and how precisely you sense and control | wider divine sense that reveals more map; soul armor against pressure and illusions; split attention for one more flying sword, puppet or production queue; soul search on a captive, at a karma cost; steadier crafting hands |

**Every tree has the same shape.** It has 9 tiers, one per realm. Each tier opens with a starter, spreads into 4 or 5 branches of small minor nodes and named notable nodes, and closes on a capstone. A tier holds about 25 to 30 nodes, laid out freely so each tree has its own silhouette. Two or three of the branches are the capstone's: each ends in a notable that links into it, and owning those ends unlocks the capstone. The other branches are side paths, taken for their own rewards. The capstone links to the next tier's starter, so a tree climbs as one path. Capstones and a few late notables carry the multiplicative effects that help a build fight up a realm; everything else adds. A Dao's tier bonus still counts once you own half that tier's nodes.

**The Breath branch** is a side path of every tier of the Qi tree that only pays while you attend (Attended seclusion), a player-style branch the way Stone Eating is a resource branch, so an idler skips it with nothing lost and nobody reads it as a tax. Tier 1: Grasping Breath (wider catch reach), Lingering Breath (focus drains slower), Whale Swallows the Sea (a higher focus ceiling), Twin Streams (one breath catches two orbs), Cooling Channels (more heat before unsettling) and Still Pool (resting on the dantian stops the drain), cheap and early. Later tiers turn the orb kinds on: Attuned Breath (your root's elements worth more), Heaven and Earth Resonance (dawn and tide orbs), Circulating Thought (focus also feeds insight faster), Unknotting (knots harmless). Each is an entry with a stat the core reads as it reads `qiGain`.

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

Aptitude and talents multiply all of it, and an epiphany also leaves a discount on its related Dao. Insight is one currency whatever it came from. Starting values at tier 1, ×3 per tier like practice days: a technique's levels burst 5, 20, 60 and 150 insight and a method's 10, 40, 120 and 300; manuals and lectures are lumps of 10 to 50; steles and places trickle 0.5 to 2 a day with a supply that can run dry. Cultivation's trickle and study's stream keep their rates, times the realm's rate.

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

**Techniques** are the moves you actually use, learned from manuals, teachers, inheritances and epiphanies. Each lists its requirements: a Dao tier, a realm, sometimes a body or soul level or a Way. Flying swords are a family of Sword techniques that also need a strong soul, and elemental spells are techniques of the element Daos.

Builds fall out on their own: the Demonic Way plus Sword techniques is a demonic swordsman, and the Demonic and Buddhist Ways together make a demon Buddha. The Orthodox Way plus the five element Daos on a five-element root is a five-element spell cultivator. Sword Dao plus a tempered body never needs a flying sword.

**Lines, chapters and kinship.** Techniques and methods belong to lines. The Clear Heaven Sword Canon is one line, and its chapters climb the realms: chapter 1 at Qi Condensation for outer disciples, chapter 2 at Foundation for inner disciples, chapter 3 at Core Formation for core disciples only. A chapter's requirements can include a sect rank, beside realm, root, talent and Dao tier. What belongs to a line is written in the data, never guessed from names.

- A technique's next chapter needs the one before at Comprehension, and starts below it: one mastery level down, or two if the new chapter is of a higher rarity, never below Glimpse. The old chapter stays known and usable.
- A method's chapters follow the same rule through the method's own mastery: the next chapter starts one level below the old one, two if it is rarer, and a method of a new line starts at Glimpse. The bar is never touched. A fresh method runs at little more than half speed and a deep one above full (Mastery below), so leaving a method costs more the deeper you were: staying in your sect's line pays, and a stolen demonic method has a real price.
- Kinship: two different lines that share a Dao and a form, two sword thrusts say, speed each other's practice by about a quarter while a kin sits at Comprehension or above, without carrying mastery over.

**Manuals are nodes the world gives you.** Trees are yours and grow by realm; manuals are found, bought, inherited, written or stolen. A manual is anything learnable that carries nodes, one mechanical kind with a `nodes` list, from a single node to a small external tree with its own branches, requirements between its nodes, a capstone, and chapters per realm tier like a method's, the next chapter coming from a sect by contribution, rank or a master's favor, or from the world. The fiction supplies the size and the name, never a new mechanic: a *Formula* (口诀) is one or two nodes; a *Style* bundles craft nodes onto a craft Dao, *Clear Fire Sect's Alchemy Style*, and holds the sect's own recipes as nodes, so its pills are brewed by nobody else without stealing the manual; an *Art* is a technique and its nodes; a *Method* a ladder and its nodes, unsealed by mastery rather than realm; a *Scripture* (经) a big gold or red bundle; an *Inheritance* a ruin's or dead master's whole tree. Manual nodes cost insight like any node, by rarity, with requirements where they make sense. Hold two styles and both count: a cultivator who has read a hundred manuals should feel it, so there is no slot limit, small effects add without limit on the same stat, and multipliers and rule changes come only from purple up and go through the fighting-up ledger with gear and nodes, so the ledger stays the one place that caps a build. A white formula is +5% qi gain; a gold scripture changes how overfill works. White to blue manuals are generated from an effect table and named once, by template or GLM, like the small places; purple and above are written by hand. Manuals and trees never unlock each other: trees link to trees, and a manual is self-contained. The Character screen lists them under Manuals, by kind. From M5, *write a manual* turns any knowledge you hold, nodes or recipes, into a manual item to teach, sell or lose.

Some techniques ask for two trees at once, such as a blood-sword art that needs the Demonic Way and Sword Dao. v1 ships the Orthodox, Demonic and Buddhist Ways, the five element Daos, Sword, Saber, Spear and Fist, the four great craft Daos, and the first tiers of the Qi, Body and Soul trees.

**Methods** are the manuals each ladder climbs with: cultivation methods for qi, tempering arts for the body and nourishing arts for the soul. A method is a bundle of independent fields: a ladder, a tier, a rarity, a line and chapter, a fit, requirements, an upkeep, a growth profile, breakthrough bonuses, properties and a source, and any combination is legal: a red method with no requirements and no upkeep that is merely rare and expensive, a gold one that asks for a talent, a blue one that eats two stones a day. There are no kinds. Qi speed is root speed × method × fit × qi density × Aptitude × attention, where the method part is its tier bonus × rarity × mastery and attention is ×1 away (Attended seclusion).

- Tier caps it: a method gains nothing on a ladder above its tier. Breaking through needs nothing from the method; the pill, the full bar and the insight carry you over, and then the old method runs out, so you switch to its next chapter or a new method and gain nothing until you do. The breakthrough is the natural moment to change methods; if you already hold the next chapter, switch before the attempt, since the method active at an attempt is the one that builds the new stage (Growth below). A method whose tier sits above your realm cultivates faster, by one realm's gap (×3 at Qi Condensation, ×5.5 at Foundation, ×10 from Core Formation up). That bonus counts once, however far above you the tier sits; a higher tier mostly buys a longer road without chapter changes.
- Rarity sets speed on the curve everything shares (Tier, rarity and pedigree), so a red Qi Condensation method cultivates almost like a white Foundation one, then stops at its peak.
- Growth: every stage you climb records the growth of the method that climbed it, and it stays. A qi method leaves pool, purity (technique power) and recovery; a tempering art HP, physical damage and regeneration; a nourishing art soul defense, divine sense and perception. The total a method leaves over a full realm is its rarity on the shared curve less one, at tier 1 about −20% at gray, +10% at green, +25% at blue, +50% at purple, +130% at gold and +170% at red, and its profile splits the total: a deep-sea method is mostly pool, a pure-flame method mostly purity. Fit scales growth as it scales speed, which is how a fitting method hits harder. A stage climbed with no method active, on the world's tempering alone, takes a white method's growth. Switching never rewrites the past: your foundation is what you built it with, and a poor method's stages stay poor until a re-refining pill (M4). Across realms growth counts as a weighted average with the realm curve as the weights, so the current realm dominates, an earlier foundation still shows a little, and the total never exceeds the ledger's gap^0.9; a plain sum would run away. The Character screen shows it per realm, "Qi Condensation foundation red, Foundation white so far", never as one shrinking number. Growth is set, never rolled, since gentle mode's rewind lands at a breakthrough.
- Breakthrough bonuses: the method active at an attempt adds to the odds of any breakthrough, to a major one's grade margin and to mercy on failure, by rarity: gray −2 points of odds; green +2; blue +4; purple +7 and the injury halved; gold +12, +0.25 margin and the injury halved; red +16, +0.5 margin, the injury halved and no bar lost. Heavenly still needs gold or red; with red's margin it is in reach with one of body or soul ahead rather than both.
- Properties: rarity's special properties (Tier, rarity and pedigree) are a method's gear-like extras while it is active, none at white and a named unique at red: the Night Bridge method gaining more at night hours, a demonic one devouring beast cores for qi.
- Mastery: a method runs Glimpse to Origin like a technique, raised by every hour you cultivate with it, and its level scales its speed alone (Mastery below), so nobody waits at a full bar for a level before a breakthrough. Switching methods is paid in mastery, never in bar (Lines, chapters and kinship).
- Fit: a method that matches your talents cultivates faster and hits harder. A five-element root on a five-element method gets the full affinity bonus; a mismatch still works, slowly.
- Requirements run from nothing but qi density (your spirit vein and gathering arrays) to long lists: a root, a physique, a Dao, a Way, a place, a ritual.
- Upkeep: some methods drink stones, herbs, blood or karma every day and stall on an unfed day, gaining nothing; the origin methods have none. A demonic method that grows by hunting people and draining their qi or blood is the fastest climb in the game. It also sinks karma, spreads notoriety and feeds heart demons.
- Special methods come from inheritances, secret realms and sect vaults, not shops.

**Fighting a realm up** comes from stacking advantages, never from one feature, and how far a cultivator gets depends on pedigree (Tier, rarity and pedigree). An ordinary cultivator never closes a realm and can only flee, talk or call for help. A great-sect disciple sometimes does, mostly at low realms. A chosen of heaven stacked with gold and red does at every realm, a little less often higher up, because the ordinary foes up there own better things. Against an equal pedigree the higher realm wins, and nobody fights two realms up without burning something precious. The fighting-up ledger under Combat sets the targets the fight sim holds. Breakthrough quality is one of the advantages: every major breakthrough is graded flawed, ordinary, superior, perfect or heavenly, worth −1 to +3 stages in a fight. Heavenly needs a gold or red method.

The rest of the stack: a body or soul ahead of your realm, the rarity of your techniques, methods and gear, technique mastery, Dao tiers, Way nodes, talismans, talents, terrain and creativity. Each closes part of the gap, enough of them close it all, and the fight sim holds the ledger's targets.

A major breakthrough's grade depends on the margin you bring: qi past a full bar, insight earned past the threshold, and body and soul at or above the new realm. Rushing in at the bare minimum saves lifespan but leans toward a flawed grade, so the time budget matters here too.

**Mastery belongs to techniques, methods and recipes.** Each runs Glimpse, Comprehension, Mastery, Domain, Origin, raised by use. A technique's or recipe's level adds +2 to checks with it. A method's level scales its speed, and its levels come about six times slower than a technique's, since every hour cultivating with it counts:

| Level | Practice days at tier 1 (×3 per tier) | Method speed |
|---|---|---|
| Glimpse | 0 | ×0.6 |
| Comprehension | 30 | ×0.8 |
| Mastery | 180 | ×1.0 |
| Domain | 720 | ×1.1 |
| Origin | 2,400 | ×1.2 |

An hour with a method or a technique is a twelfth of a practice day. At six qi hours a day Mastery lands about an hour into a life, inside the tutorial; a new line taken at Foundation runs below full speed for about two in-game years and forgoes Domain or Origin's bonus for longer. Starting values for the pacing sim.

"Flowing Cloud Blade at Comprehension" means a Foundation-tier sword technique at its second mastery level.

**Talents** are rolled at birth, and each rebirth rolls them again. There should be dozens; five kinds to start:

| Kind | Examples | What it changes |
|---|---|---|
| Spirit root | single-element heavenly root, five-element root, mutated lightning or ice root; the Innate Sword Root 天生剑根 (gold: a metal root with a sword's edge, Sword Dao insight and sword checks up); the Yin-Yang Twin Root 阴阳双生根 (purple: water and fire in balance, with no clash between them) | qi speed, which methods fit, element affinity |
| Body | iron-bone frame, blazing-yang body, a beast bloodline, frail meridians; the Pure Yang Body 纯阳之体 (gold: fire hits harder, yin chill can't touch you, lightning bites less); the Nine Yin Body 九阴之体 (purple: yin methods fit, Ghost Way grows faster, fire hurts); the Innate Dao Body 先天道体 (red: every ladder trains faster and breakthroughs come easier) | body training speed, HP, poison and tribulation resistance |
| Soul | innate divine sense, twin soul, a soul scarred in a past life; Formation Eyes 阵眼之瞳 (gold: you see the eye of any array at your soul tier, and Formation Dao insight rises); Sword Heart 剑心 (gold: sword techniques master faster, and sword intent can't shake you); an Unbreakable Dao Heart 道心如铁 (purple: heart demons and illusions lose their grip, grades edge up) | soul training speed, resistance to pressure and illusions, crafting precision |
| Fate | heaven's favored, calamity star, late bloomer, karmic debt; a Child of Fortune 气运之子 (gold: Fortune up, encounters lean lucky); Heaven's Jealousy 天妒 (double-edged: tribulations hit harder, grades run higher); an Old Soul 转世之魂 (red: sleeps until Foundation, then a past life wakes with a lump of insight and a lost chapter) | fortuitous encounters, disasters, tribulation strength, talents that wake late |
| Origin | village orphan, merchant's child, minor clan heir, great-sect disciple | where you start, how much of the map you know, early allies and enemies |

Every talent has a rarity, on the scale everything shares (Tier, rarity and pedigree): gray (a flaw that lowers a stat), white (plain), green, blue, purple, gold and red. Body, soul and fate talents roll their rarity on one table: gray 10%, white 40%, green 35%, blue 10%, purple 4%, gold 0.9% and red 0.1%. Spirit roots use the table under Character creation, where white is the floor; origin has no grade. Kinds and names are mostly flavor, and each talent in the end moves stats: a spirit root its qi speed and method fit, a body talent body training speed, HP, Agility or resistances, a soul talent soul training speed, Aptitude or soul defense, and a fate talent Fortune, Aptitude or the odds of encounters. Some talents sleep until an event wakes them, and a past life's achievements buy rerolls at rebirth. Aptitude can also rise after birth, slowly and at great cost, through marrow-washing pills, spirit-spring baths and heaven-and-earth treasures, so a talentless orphan has a long road to genius. These are settled with items and gear. Talents that touch a Dao or an array, the sword root and the formation eyes, move stats nothing reads yet, Dao insight, Dao checks and array sight, stored like the combat stats until those systems arrive.

## Tier, rarity and pedigree

Everything you can own or be born with shares one rarity scale, and everything you can own also has a tier.

**Tier** is the realm a thing belongs to. It sets the thing's base power on the realm curve, its price band on the yardstick under Economy, and its gate: the realm to wield an artifact, the peak a method carries you to, the level to use a technique, the soul level to craft at that tier. Talents and spirit roots have no tier.

**Rarity** is how good a thing is inside its tier: gray (flawed), white, green, blue, purple, gold, red. It works as a fraction of a realm. The gap is how much more a foe one realm up hits for: about ×3 into Foundation, ×5.5 into Core Formation and ×10 from Nascent Soul up, close to the swing combat uses. A thing of rarity f multiplies by gap^f, where the gap is the one out of the thing's own tier: ×3 for a tier 1 thing, ×5.5 at tier 2 and ×10 from tier 3 up. The method tier bonus under Cultivation uses the gap out of your own realm instead.

| | gray | white | green | blue | purple | gold | red |
|---|---|---|---|---|---|---|---|
| f | −0.2 | 0 | 0.1 | 0.2 | 0.35 | 0.75 | 0.9 |
| into Foundation (gap ×3) | ×0.8 | ×1 | ×1.1 | ×1.25 | ×1.5 | ×2.3 | ×2.7 |
| from Nascent Soul up (gap ×10) | ×0.6 | ×1 | ×1.25 | ×1.6 | ×2.2 | ×5.6 | ×7.9 |

White to purple is steady betterment inside the ordinary world, growing a little with realm while staying far short of one. Gold and red are heaven-defying: about 80% and 90% of a realm, at every realm, the way each realm's gap is wider than the last. Gold and red techniques also add +2 and +4 to checks. Higher rarity brings more special properties: none at white, a minor one at green, one at blue, two at purple, two and a unique one at gold, and three and a unique one at red, which is named. Price climbs much faster than power: within a tier, about ×0.5, ×1, ×2, ×5, ×15, ×50 and ×200 from gray to red. All of these are starting values for the sims.

What each kind of thing does with tier and rarity:

- Talents and spirit roots: rarity only, rolled at birth.
- Methods: tier is how far the method carries you; rarity sets its speed, the growth it leaves on every stage climbed with it, its breakthrough bonuses and its properties; mastery scales speed alone (Cultivation, methods).
- Techniques: tier is the level to use them, and rarity multiplies their power and adds effects.
- Weapons multiply techniques of their own kind at half their rarity exponent, and basic strikes at the full one, and add hit and properties. Armor carries the defense at its full exponent.
- Pills, artifacts, talismans and arrays: tier comes from the recipe or the material, and crafting rolls the rarity from mastery, materials and luck.
- Loot and shops roll on the talent table (gray 10%, white 40%, green 35%, blue 10%, purple 4%, gold 0.9%, red 0.1%), shifted by source: a sect vault or a ruin rolls better than a market stall.

**Above your realm.** A weapon one tier above your realm drinks qi with every strike, takes −4 to hit and counts its power at half the tier gap; two tiers above, it won't wake at all. An ancestor's blessing on a lineage heirloom, a talent, a soul a realm ahead or a refining bond cuts the penalty. Consumables carry their own tier: a talisman an ancestor drew a realm above you strikes at that realm, and whatever an item burns or sacrifices is the item's own rule.

**Pedigree.** NPCs run on the same rules as you; what sets a chosen of heaven apart from a rogue cultivator is access. Every NPC has a pedigree (rogue, small sect, great sect, sacred land or chosen of heaven), and it sets only the tables they roll their methods, techniques, gear, talents and resources on: a rogue mostly rolls white and green, while a chosen one has a real shot at gold and red. Each realm's ordinary baseline rises too, since anyone who reached Nascent Soul has lived for centuries and owns blue and purple things; that is why the same chosen-one kit closes a little less of the gap higher up. You start as an orphan near the bottom and climb into the genius bracket by finding gold and red.

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

The red root is the chaos root, 0.1%: every element in balance, ×3.0, and it fits every method fully. Every root holds elements, rolled at creation from its kind: one for a single or heavenly root, two or three for a true root, four or five for a mixed root, one of lightning, ice or wind for a mutated root, and all five for the chaos root. The element hours read them, and a named root like the Innate Sword Root is a root with effects beyond its speed, like any talent.

**Three origins in the first playable**, all in the Border Wilds. The beast-ranch child, the merchant's child in the fortress city and the smuggler's ward arrive by M5, with the taming, trade and smuggling systems they need.

| Origin | Testing day | If you go along | If you refuse |
|---|---|---|---|
| Cave orphan, Kingdom of Stone Eyes | the imperial tester comes to the sinkholes, and the cave clans hide rooted children | the March's garrison school: a standard method, rations, a place on the wall | the clans hide you: a crude cave method, a map of caves no one else has, smuggler contacts |
| Conscript's child, March of Pacified Borders | the Gongsun garrison claims every rooted twelve-year-old for its cadet school | cadet: a spear method, a stipend of low-grade stones, patrols on the Wall of Piled Bones | deserter: no method yet, a bounty on you, and the Night Bridge Society offers a way out |
| Frontier orphan, City of the Guarded Mouth | the Beast-Butcher Gate's recruiter tests orphans who lost family to beasts | outer disciple: a saber method, contribution for cores, a senior who expects results | street cultivator: no method yet, odd jobs at the bounty office, and the Gate remembers you said no |

Refusing is harder but never a dead end. The two refusals that start without a method get their card after a month or two of odd jobs, about five real minutes, so they reach layer 3 nearer minute 55 than 45; the first hour's clock below is the going-along paths'.

**The first hour**, at one real hour to one in-game year:

| Minute | What happens | What opens |
|---|---|---|
| 0–3 | creation and testing day | your method and origin |
| 3–5 | first seclusion; you sense qi and reach layer 1; the first orb drifts in and you draw it in | the day wheel, with qi and sleep hours; attended seclusion |
| 5–20 | layer 2; the first insight trickles in; the first node, a Breath node or a starter | study hours, then the Qi tree |
| 20–35 | your origin's first technique; practice takes it to Comprehension | practice hours and technique mastery |
| 35–45 | the layer 3 breakthrough, with a small check and choice | the breakthrough screen |
| 45–60 | the first trip out, from M3: a cave guiding job, a night patrol or a core hunt with a senior | the go-in screen, the map's first fog, loot flowing home |

There are no tutorial walls. Each system appears when you first reach it, with one line of hint and a chronicle entry. In M1, which has no AI, the first trip out is a fixed errand card with set outcomes.

Body and soul methods are found, not given. In M1 the errand card hands over a common tempering art, which opens body hours, and a later card a common nourishing art, which opens soul hours; from M3 the world supplies them. Both are tier 1, so in M1 body and soul stop at layer 9, and the Foundation grade's body and soul points wait for M3.

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

**Look around** costs an hour wherever you are. Without divine sense it is your eyes and a Soul check: tracks, a herb, a cave mouth, a watcher. With divine sense, from Foundation, it sweeps the circle the map draws, at the range the scale table gives, and finds more. Travel alone marks places seen; looking around makes them detailed.

**Wherever you like, if you're strong enough.** Every place has a top realm and sits in some power's sphere, both in the atlas, and travel reads them:

- Open: anyone walks in. Roads, towns, the wilds.
- Gated: a sect mountain behind its array and gate guards, a city's inner ward, a clan's valley. You need a token, a rank, an invitation or a toll, or you force it, which works only if your realm beats the array's rating, since defenses scale with prosperity, and costs standing either way.
- Hostile: inside the sphere of a power at the bottom of its standing with you, or whose enemy you serve. You can cross, but encounters there are hunts for you, and the map says so.
- Deadly: a land whose own hazard sits above your realm, the forbidden lands and the beast ranges. The fog shows the warning, and going in anyway is how most cultivators die.

Checkpoints inside a sphere charge tolls from the Economy's fee list, and your fame decides whether the guard knows your face.

**A trip** is what gives going in its shape: a goal card, a bounty, a herb run, a patrol, a core hunt, a delivery; travel with its encounter rolls; the goal's scene plus one to three side encounters; and the return, with loot home, a coming-back story and a chronicle entry. While you're out your wheel is the trip's, so going in costs cultivation, and the spirit pool fills instead from M4. Free text and the narrator live inside scenes; between them the engine writes the travel line itself.

**Encounters** are tables per region keyed by terrain tags, the hour, the danger band, fame and the calendar, in six kinds: beast, cultivator, mortal, place, omen and plot, the last seeded by your origin, talents and grudges. Each is a scene template: tagged features, NPCs carrying intents from the motive list, stakes, and exits, fight, talk, flee, sneak, trade. It is a card like any other, with the scene panel and the narrator attached. The tables themselves, ruins and inheritances, dying in the world and the fog's exact rules are settled at D3.

## Professions, people and powers

Every system has an idle half and a world half, and each half supplies the other.

**Professions** are the Hundred Arts, and each is a craft Dao: a tree with 9 tiers, one per realm, grown by insight and worked in your craft hours. You can study higher tiers early, but crafting at a tier needs your soul level to reach it.

Basic recipes are scattered through each tier as nodes, and every tier's first node hands you one starter recipe. Other nodes improve success, yield, quality and speed, and each tier ends in a capstone perk, like brewing two batches at once.

Unique recipes have to be found: some sit in any sect library, others only in ruins, inheritances or a dying master's hands. A recipe is content, and a node is one way to get it: the craft Dao's basics, a manual's nodes (a sect's style carries the sect's recipes, Manuals under Cultivation), or experimentation. A recipe known by any door is simply known; if you later find the manual that carries it, that node shows as owned and the rest of the manual is still worth buying.

**Recipes carry mastery**, Glimpse to Origin, raised by crafting them. Higher mastery means better odds, higher grades, bigger yields and fewer explosions. A disciple running your recipe on a production line works one level below your mastery.

**Experimentation** is the gamble: throw in any ingredients and the engine rolls against hidden recipes. Most tries fail or blow up the furnace, but each failure raises the odds of the next. A hit is a recipe that's yours to name, and it lands as an owned solitary node on the craft Dao's **discoveries edge** at the recipe's tier: a ring at the tier's rim where found recipes are laid automatically, unlinked, so the hand-laid part never moves and a furnace full of hits makes that tier visibly fatter on one side. Discovered recipes are the craft Daos' deeds, the way Ways grow by deeds. The hidden pool is every recipe you don't know: the ones sitting unbought in your tree, the ones inside manuals you haven't found (rare, and a scandal when it's a sect's secret pill), and wild recipes that exist only to be found. Each recipe carries ingredient tags, and the roll weighs how many of yours match (nothing in common and it isn't in the pool, so blind throwing finds only the commonest things), tier on the table below, a pity counter per ingredient set on the `craft` stream, and rarity on the shared table shifted by the furnace and the ingredients' own rarity. If nothing authored matches well, the pool holds a generated recipe, so experimenting never dead-ends: a recipe is a bundle of fields (tier, rarity, ingredient tags, an effect, a name), and generating one picks an effect the tags can make from the effect table, sizes it by tier and rarity, and names it once, kept in the save like a filled-in village. Generated recipes stop at blue; gold and red are always written by hand. Attended, throwing the ingredients in is the fire-control scene, keeping the furnace in its band by the same breathing grammar as the seat, and a steady hand is a bounded bonus on the roll, never the roll. The effect table, which tags make which effects at what size, is D4's real work, and alchemy needs it anyway to judge whether a recipe's ingredients make sense.

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

**People, from the first hour.** Every person you've met has a record: name, where you met, what they are to you, friend, rival, senior, master, sworn sibling, dao companion, enemy, how they feel about you in words rather than a number, and their last known realm and whereabouts, which is only what you've seen or heard, so the same fog applies to people as to places. Each has a log: everything in your chronicle they were part of, since the typed chronicle stores actors by id, plus updates about them. In M1 updates come only from cards that name them, a letter from your senior, the sergeant posted to the wall. In M5 their lives tick on their own and bonded people send a yearly letter card; in M6 rumors and headlines feed the same log; after v1 a friend's exported snapshot writes its real progress there. The People screen shows them as circles and a web of threads (§ UI and screens, The People screen), with portraits once the cast list arrives.

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

**Stones as fuel.** Stones speed seclusion; they don't replace it. At Qi Condensation each low-grade stone burned during a day of qi seclusion adds about a fifth of that day's qi, up to about five stones a day, so a well-stocked day yields about twice the qi. That takes more than a day's wages, so working never beats secluding for raw qi; the world's share comes from what seclusion can't make. The qi each realm needs follows the realm curve, like income, so a day's wages buy about the same share of a day's qi at every realm, and a low-grade stone is worth a ninth as much at Foundation and almost nothing by Core Formation. That is why every realm hungers for the next grade. A day here means a full day of qi hours; with fewer qi hours on the wheel, the cap shrinks in step.

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

**The rules**

- Six attributes. Qi, Body and Soul come from cultivation: qi pool and technique power; HP and physical damage; perception and soul defense, each shaped by the methods that climbed your stages (Cultivation, growth). Agility (turn order, evasion, fleeing), Fortune (crits, loot) and Aptitude (how fast seclusion time pays off) come from birth, techniques and items. Each starts at a base value that talents move: body talents move Agility, fate talents Fortune, and soul and fate talents Aptitude. The base is 10, and a talent's grade sets how far it moves one: gray −2, white 0, green +1, blue +2, purple +3, gold +4, red +5. Crits start on a natural 20, and every 4 points of Fortune above 10 adds one more face, so 14 Fortune crits on 19 or 20; each point above 10 also adds a 2% chance of an extra drop. Each point of Aptitude is worth 5% on all seclusion gains.
- Each turn: one main action (technique, strike, defend, item, command beast, talk, flee) plus one minor action (move, take cover, swap artifact).
- Every check is d20 plus bonuses against a target number. Beat it by 10 or roll a 20 for a critical; miss by 1–3 for a half-damage graze; a natural 1 means qi deviation backfires on you.
- The realm gap shows up everywhere, counted on one ladder: −2 to checks per stage below the foe, −1 per Qi Condensation layer, and another −2 for each major breakthrough between you, so one realm apart at the same stage is −8. Physical clashes compare body levels and soul clashes compare soul levels. Fleeing and talking feel the gap less, so escaping a stronger foe stays possible.
- Techniques cost qi, which barely regenerates mid-fight. Defend and pills restore it; with an empty pool you only have basic strikes.
- Eleven damage types: Physical, Metal, Wood, Water, Fire, Earth, Lightning, Wind, Ice, Soul, Poison. Each has its own resistance, and most carry a status: fire burns, metal bleeds, wood roots, water chills, earth staggers, lightning paralyzes, wind unbalances, ice freezes, soul dazes, poison poisons.
- The five-element cycle adds tactics: an element that overcomes the target's deals 25% more, and chaining elements in generating order (Wood, then Fire) builds a combo bonus. Lightning and Wind join the cycle as Wood, and Ice as Water.

Damage, once a check hits:

```latex
\text{damage} = \text{power} \times (1 + d_{\text{Dao}}) \times m_{\text{element}} \times (1 - \text{resist}) \times m_{\text{tier}} \times \prod_{\text{breaks}} b \times 1.2^{\Delta \text{stage}}
```

The Dao bonus is 0.05 per tier of each Dao the action is tagged with, plus whatever its nodes add. The element multiplier is 1.25 when your element overcomes the target's, 0.8 when theirs overcomes yours, and 1 otherwise.

The tier multiplier is 1.5 for a critical, 1 for a hit and 0.5 for a graze. Each major breakthrough between attacker and defender multiplies by its own step b: ×1.75 into Foundation, ×3.2 into Core Formation, and ×5.8 into Nascent Soul and every realm after. Δstage counts the stages, with each Qi Condensation layer worth half a stage. The steps live in the realms data. Both count attacker minus defender, using body or soul levels for physical or soul attacks.

One realm up, at the same stage, is about a 3× damage swing into Foundation, 5.5× into Core Formation and 10× from Nascent Soul up, on top of the check penalty. HP and the qi pool climb the same ladder with the same steps on the body and qi ladders, so a realm up is about 9× the power into Foundation, 30× into Core Formation and 100× from Nascent Soul up. Fighting up a realm takes tricks, allies, running or a genius's stack. Every multiplier is a starting value for the balance sim to tune.

**The fighting-up ledger.** A foe one realm up at the same stage leads on three axes: Hit, −8 on every check; Harm, your damage divided by the gap; and Hold, their damage multiplied by it and their HP larger by it. Harm and Hold together are why a realm is about 9×, 30× or 100× the power. Every advantage closes part of one axis:

| Advantage | Axis | Biggest size |
|---|---|---|
| Technique rarity | Harm | gap^0.9 at red, plus +4 to checks |
| Weapon rarity | Harm | half its exponent on techniques of its kind, the full one on basic strikes |
| Armor rarity | Hold | gap^0.9 at red |
| Method rarity and tier | the qi pool and purity, built stage by stage by the method that climbed each | gap^0.9 at red over a full realm |
| Technique mastery | Hit | +2 a level, up to +10 |
| Breakthrough grade | all three | −1 to +3 stages, each +2 to checks and ×1.2 |
| Body or soul a realm ahead | the whole gap, in physical or soul clashes | the whole gap |
| Dao tiers | Hit and Harm | +1 to checks and +5% per tier |
| Element advantage | Harm | ×1.25 |
| Creativity | Hit | +0 to +3 |
| Tree and Way nodes | various | small additions; capstones carry a few multipliers |
| A weapon above your realm | Harm | half a tier, at a qi cost and −4 to hit |

Each axis takes one big multiplier: technique rarity for Harm and armor rarity for Hold. A weapon counts at half its exponent, so a red sword and a red technique never add up to two realms. Everything else adds.

The fight sim's targets, as win rates against an ordinary foe one realm up, measured without one-shot consumables:

| Attacker | Qi Condensation → Foundation | Foundation → Core Formation | Core Formation → Nascent Soul | Nascent Soul and up |
|---|---|---|---|---|
| Ordinary: white gear, ordinary grade | under 2% | under 1% | about 0 | about 0 |
| Great-sect disciple: purple, Mastery, perfect grade | 40–50% | 25–35% | 10–20% | 5–10% |
| Chosen of heaven: gold and red, Domain, body ahead, heavenly grade | about 75% | about 65% | about 55% | about 45% |

Within a pedigree the higher realm wins: a chosen one against a chosen one a realm up, or a great-sect disciple against another, wins under 5%. Two realms up is under 1% for anyone not burning something precious. At the same realm and stage, a chosen one beats a rogue about 95% of the time and a great-sect disciple beats one about 75%, and a single stage up is easy to overcome. The sims tune the rarity exponents, the check bonuses, the weapon rule and each realm's NPC baseline until the table holds.

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

**The engine** confirms the brazier and grass exist and sets the grass burning for 2 turns. It rolls 16 + 4 (Ember Palm at Comprehension) + 1 (Fire Dao tier 1) + 2 (creativity) − 2 (Mo is one stage above you) = 21 against 18: a hit. Damage is 50 fire × 1.05 (Fire Dao) × 0.75 (his water-silk robe resists fire) × 0.83 (stage gap) = 33, and Ember Palm costs 12 qi.

**The narrator** writes from that outcome alone: "Coals spill across the spirit-grass and flame races up the stalks. Your palm drives through the smoke into his ribs; steam hisses off his water-silk robe, drinking part of the heat. He stumbles into the burning grass. 'Brat. You will pay for that.'"

**The log line** always follows the prose and shows the math: `Hit · 21 vs 18 · 33 fire · Elder Mo 117/150 · Qi 52/90 · grass burning (2 turns)`

**Effects fill the wait.** Every outcome already carries what an effect needs: the technique's form (slash, thrust, palm, projectile, aura), its element or damage type, the attacker's realm, and the result (hit, critical, graze, miss, backfire). The screen layers those into one effect, with no model involved. Form sets the shape, element the color and particles, and realm the scale: close to the target at Qi Condensation, across the screen at Foundation, a shaking screen at Core Formation and the whole view from Nascent Soul up, as Scale of destruction describes. A critical flares, a graze fizzles and a backfire turns the effect on you. The outcome arrives before the narrator's first word, so the effect plays in that gap. Reduced motion swaps it for a still flash, and sound hangs off the same tags.

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

**Look.** Black cracked glass. A few long fractures cross the background from impact points, a fine web of cracks sits only around those impacts and away from text, and qi light leaks faintly through every crack. Panels are obsidian, a deep black with a slow lacquer sheen, so text never sits on a crack; their edge glows. A thin rim catches the crack light with a still bloom behind it, and a slow light walks round the rim, quicker while the panel waits on you, like the card tray with a card in it. A panel you can act on wears the accent on its rim and a warning the warning color. Under reduced motion the rim stands still, brightest at the top corners. `docs/mockups/obsidian-study.html` is the reference (direction B, with A for reduced motion); a rim that follows the qi bar was dropped, since the bar is progress toward the next step, not the qi you hold. Gold marks anything you can act on or have just gained. The crack light is the qi glow, and the qi, body and soul bars use it too, so qi reads as the light behind the glass. A breakthrough makes the cracks flare and opens a new fracture. The pattern is seeded per life and redrawn to fit the screen. A serif display face for names and realm titles, with hanzi set in a brush font as flavor, and a plain sans for numbers and menus. Starting colors to tune in the build: background #040507, panel glass rgba(10, 12, 16, 0.8), edge rgba(255, 255, 255, 0.075), text #e9e5da, muted #8d949d, gold #d6ab4c, crack light #7fc7d9. `docs/mockups/glass-study.html` is the reference mockup. The atlas keeps its own ink-and-silk look, since it is the authoring tool, not the game.

**Players pick their colors.** Settings changes the accent and the crack light, sets how much fine web the glass carries, and rerolls the glass, with presets and a free color picker that warns when a color is hard to read on black. Each color keeps its job whatever it looks like: the accent always means something you can act on, and the crack light always means qi. The defaults are gold, qi cyan and a light web.

**Rarity has its own palette,** never the accent's color or the warning color, since the accent must keep meaning "act on this": gray, white, green, blue, purple, an amber-orange gold with a soft glow, and a deep crimson red, all tokens players can recolor. A thing's name wears its rarity color, and its tier is a word beside it ("Foundation").

**Layout.** On desktop, the side menu is on the left, the screen in the middle, and a context panel on the right with tooltips, the latest chronicle lines and active queues. On a phone the menu becomes a drawer, and the context panel slides up from the bottom.

| Screen | What it shows | Ships in |
|---|---|---|
| Abode (home) | your silhouette seated cross-legged, qi drifting in, circulating and settling in the dantian, which glows brighter as the qi bar fills; orbs to draw in by hover, touch or the breathe key, and the focus meter (Attended seclusion); realm and stage, qi, body and soul bars, age against lifespan, today's wheel and routine, the card feed, the spirit pool from M4, alerts | M1 |
| Cultivate | the day wheel of twelve hours with its element hours and routines, the method on each ladder, and breakthrough checks and their odds | M1 |
| Trees | the Qi, Body and Soul trees, then the Daos and Ways: a canvas you drag and zoom, with nine tier bands of branching paths, sealed nodes dimmed and a re-centre button; a node's details open in an overlay | M1, Daos M2, Ways M3 |
| Techniques | every technique with its mastery level, requirements and what is still sealed | M1 |
| Character | talents, the six attributes, fame and standing, manuals by kind | M1 |
| Chronicle | your life as a log: breakthroughs, fights, rumors and steward reports | M1 |
| Settings | OpenRouter key and cost meter, saves, clock speed, colors and glass, text size, reduced motion, the mature content switch | M1, AI parts M3 |
| Bag | a grid of squares with names in rarity colors and tiers as words, gear on the figure's squares, the abode's store as a second grid, stones as a count; `docs/mockups/inventory-study.html` is the reference | M2 |
| Go In | the adventure screen, described below | M3 |
| Map | the zoomable world map with fog of war; tiers open with M6 | M3 |
| Crafts | furnace, forge, array and drawing queues, recipes and experimentation | M4 |
| People | everyone you've met as circles (grouped by where you met them) or a web of threads, with the chosen person's page beside them; your sect and factions from M5; `docs/mockups/people-study.html` is the reference | M1, full in M5 |

**The go-in screen.** The narration streams down the middle, each turn followed by its log line with the math. Three or four suggested actions sit under it as buttons, with a free-text box below them. A scene panel beside it shows where you are, the tagged features, who is present and your HP, qi and statuses. Leaving returns you to the abode with a summary of what you brought home.

**The People screen.** Two columns: the people on the left, the chosen person's page on the right, so opening someone never hides the list. The left has two views. **Circles** is the default: a list grouped by where you met them (the Gate, kin and home, the road), each row a seal, a name, their bond and how they feel in words; from M5 the groups are your sect and factions. **The web of threads** is the second view: you at the centre, everyone joined to you by a crack of qi light. Distance is how they feel about you, the warm close and glowing in the crack light, the hostile at the rim in the warning color, the indifferent dim between; the bond sets which side of the web they sit on. Past a dozen or so people the web shows your nearest and the rest stay in the circles. Until portraits arrive, a person's seal is their surname in the brush face inside a carved square, tinted by their feeling. The feeling is always words, with seven quiet notches behind them as a glance, never a number. Fresh news is a gold dot on the seal and the newest line at the top of their page; there is no separate feed, since the context panel's chronicle carries it. A person's page: the seal, name and bond, their one-line summary in the display face, feeling, realm, whereabouts and where you met, then their log as a thread, with "Write a letter" and "Seek them out" waiting for M5 and M3. `docs/mockups/people-study.html` is the reference (B and C; A and D were passed over).

**Coming back.** After time away, a story card tells what happened while you were in seclusion: qi gained, breakthroughs, queue output, and the cards that resolved on their own, with the rest waiting in the feed. From M5 it includes the steward's report.

Numbers use short forms past ten thousand (12.4k, 3.1M), and every number that matters has a small "?" beside it that shows how it was worked out, on hover or a tap, so the sums stay out of the way.

**Less spreadsheet.** Words first, numbers behind the "?", including the bars: "qi thick as river mist" with the number on hover. The Abode is home: the figure, whose pose follows the current hour, asleep at 子, drilling in a practice hour, still in seclusion, with the cards arriving under it. Every number that changes has a moment: a breakthrough flares and asks "now or consolidate", a card says what happened, and the typed chronicle reads as a biography, "in the spring of his fourteenth year". Realms and layers are words everywhere, "Qi Condensation, fifth layer". The glass carries a season tint and weather from the calendar. Named days and named people from the first hour, with portraits once the cast list arrives. The cave itself does not change with your things; that would need a design per kind of abode, and waits.

**The Bag.** Squares, not volume: the grid is the capacity, and bulk is a thing taking more than one square. Pills, talismans, herbs and materials stack to 99 a square, ores and bulk materials to 20, gear takes one, and a cauldron, a corpse or a beast takes several. Your pack on foot is small; a mortal cart or mount adds squares while you travel with it, and losing the cart loses what is in it; a storage pouch at Qi Condensation, a storage ring at Foundation, bigger rings and spatial items above. Stones are a count, never an item, and a ring holds any amount, as mortals' silver does. The abode's store is a large separate grid, so "carry what you can, leave the rest" is two grids. Gear squares sit beside the figure, weapon, armor, ring, pouch, and dragging onto them equips; the same figure stands on the Character screen. An item shows a glyph from design-time art, its name in its rarity color, its tier as a word and a stack count, with the "?" for the rest, and unknown things show as "?" until appraised in M6. `docs/mockups/inventory-study.html` is the reference.

## Saves

Saves are ironman by default: one autosave per slot, so deaths and betrayals stick. A gentle mode, picked at creation and shown on the slot, allows one rewind to your latest breakthrough of any kind, and the charge refills only at your next major breakthrough.

- Three slots, each holding a lineage: a life and every rebirth after it.
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

Each milestone ends playable, so stopping at any point still leaves you a game. Design comes first, working down the Still to design checklist. Then scaffold the project in your cultivationGame2 folder and run the week-1 GLM spike.

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
- [ ] Node lists: tiers 1 and 2 of each v1 tree, 25 to 30 nodes a tier in the shape under Cultivation, drafted with AI help and curated. The Qi, Body and Soul trees in the M1 build, reviewed by Jan, the combat Daos before M2, the Ways before M3, the craft Daos before M4
- [x] plan.md for Claude Code: the build split into one-session phases, written once planning is done

**Before M2 and M3**

- [ ] Items and gear: slots, grades, artifact bonding and artifact spirits, pill toxicity, storage rings; item, talisman and array power on the realm curve, with a higher-realm talisman priced by its own realm; tier and rarity on every item (Tier, rarity and pedigree), weapons and armor on the fighting-up ledger's axes, weapons above your realm; aptitude-raising pills and rites; the upkeep some methods drink
- [ ] Enemies: beast and cultivator templates, behavior profiles, loot; pedigree tables and each realm's ordinary baseline, tuned to the fighting-up ledger
- [ ] Combat outcome tags for effects and sound: form, element or damage type, realm and result on every outcome
- [ ] Exploration: travel, trips, look around and the open, gated, hostile and deadly rule are settled under The world; left for D3: the encounter tables per region in the six kinds, scene building from the card format, ruins and inheritances, fleeing, dying in the world, ways to flee, hide or talk past foes a realm or more above you, and the fog's rules, meaning what travel, divine sense, maps and rumors each reveal
- [ ] NPC basics: the person record and its log are settled under Professions, people and powers; left for D3: what each NPC knows, how talk changes relationships, the intents and motives scenes draw on
- [ ] Story decks: the seclusion deck in M1, then a deck per milestone; what each card trades and how often it comes
- [ ] Procedural methods and items (D2): a method is already a bundle of independent fields, so white-to-blue methods and items can be generated from tables and named once, as manuals are; gold and red written by hand. Loot and shops hand them out on the shared table
- [ ] NPC pace (D2): NPCs progress at the away rate, so an attended player outpaces a same-pedigree NPC by about double; the pedigree tables are tuned against the away row, and that gap is the player's edge for playing
- [ ] The Breath branch beyond tier 1 (D2 and later): Attuned Breath, Heaven and Earth Resonance, Circulating Thought, Unknotting, and what each realm's vocabulary adds
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
