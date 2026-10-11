<!-- The source of truth for the game's rules since 2026-10-11; edit it here. It began as an export of the claude.ai
     design doc "Cultivation Idle Game: Design & Build Plan" (revision 184), which is now a frozen archive. -->
# Cultivation Idle Game: Design & Build Plan

{date:2026-10-10} · @Jan

Build it as a web game where idle seclusion and an AI-narrated world are two views of one simulation. Your code owns every number; GLM 5.2 only interprets what you type and narrates what the rules decided. At about 12 hours a week, a playable slice lands around week 10 and the full system list around week 27.

## Decisions so far

Nine calls are made; the rest of this plan builds on them.

| Decision | Choice | Why |
|---|---|---|
| Engine | Web: TypeScript, React, Vite | An idle game is menus and numbers, and the adventure is streamed text. Browsers do both best. |
| Players and AI bill | You and friends, on your own OpenRouter key | No accounts or backend for now; Tech stack covers how friends get access. |
| Time | About 12 hours a week | Sets the roadmap: a playable slice by week 10. |
| Cultivation | Qi is the ladder; body and soul ride along and can run a realm ahead | The Mortal's Journey model, with a reason to spend seclusion time on body and soul. |
| Progression | The big three, each with a level and a tree, plus Dao and Way trees; insight buys nodes, and mastery is for techniques and recipes | Trees hold what you understand and how you live; mastery holds what you practice. |
| World | Severed Heaven: a prosperous middle thousand world about a million li across, written by hand in the atlas; nested, fog of war, random start | Each area feels like everything until you outgrow it. |
| Tone | Cutthroat by default; warmth is earned | GLM leans agreeable, so the rules, not the prose, decide who betrays whom. |
| Combat | Text only: a turn-based rules engine, with free-text input on top | Creative moves earn bonuses, but your cultivation still decides who wins. |
| AI model | GLM 5.2, thinking off | Unlike GLM 5.3, its thinking can be switched off, which roughly halves the cost and cuts the wait. |

## How the two halves connect

> Diagram (in the online doc): seclusion turns time into qi, body, soul and insight; the world turns that power into materials, pills, methods, epiphanies and connections, which flow back into seclusion.

Seclusion turns time into power; the world turns that power into the materials, epiphanies and connections seclusion can't make. Neither half gets far alone.

Idle never stops; it changes hands. While you wander, your formations keep filling a spirit pool that you absorb when you return. Raising the pool's cap is an upgrade, and it sets how long you can stay out without waste.

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

**Breakthroughs.** When a bar fills, the next layer or stage is a check at the odds the Cultivate screen shows. Layers 1 and 2 always succeed, and layer 3 is the first real check. The bar keeps filling past full up to 150%, and each extra 10% raises the odds, so the choice is to go now or consolidate. A failed minor breakthrough costs a fifth of the bar and a few days of unsettled qi, with no injury below Foundation. Offline, minor breakthroughs run on an auto setting, safe odds by default. Major breakthroughs never happen offline: the bar holds at full and the coming-back card says you are ready. A failed major breakthrough uses up the gate item, halves the bar and leaves an injury that slows cultivation for a few in-game years. At the lifespan edge, the last chance lets you attempt the major breakthrough below a full bar if you hold the gate item, at worse odds and a flawed grade at best; without the item, or if it fails, the life ends.

**Seclusion time is the budget.** Every in-game day in seclusion goes to whatever you assign: qi cultivation, body tempering, soul nourishment, studying for insight, or practicing a technique or recipe. Aptitude and talents set how fast each day pays off, and lifespan caps the total, so spreading too thin means dying before the next breakthrough.

**Body and soul cultivate alongside qi, and can run ahead.** Each climbs its own ladder of realms and stages in parallel with qi, and either can run up to one major realm, four steps of the combat ladder, ahead of your qi realm: "his body was already at Core Formation while his cultivation sat at Foundation."

- Body ahead: more HP and physical damage, and physical clashes are judged at your body level. Tribulation lightning strikes the body, so you survive tribulations more often. Artifact refining leans on body too.
- Soul ahead: wider divine sense, and you see through hidden realms. Realm pressure, illusions and heart demons are judged at your soul level. Crafting at a tier needs your soul level to reach it, so a trained soul crafts one tier above your realm.
- A failed heart demon can injure your soul and knock it back a stage or more; it heals with time and pills.

Each ladder follows the qi rules: layers 1 to 9 at Qi Condensation, then four stages per realm, a bar fed by tempering or nourishment, minor breakthroughs between stages and major ones between realms, each major one with its own insight threshold. Lifespan follows qi alone. Gate items for major body and soul breakthroughs are settled with items and gear. A body or soul you neglect stays behind, and it is judged at its own level.

**The big three have trees too.** A level is raw power and the gate; the tree beside it shapes that power, and its nodes cost insight like any other tree:

| Tree | What it shapes | Example nodes |
|---|---|---|
| Qi | how you spend your qi | cheaper techniques; faster qi recovery mid-fight; a deeper pool; purer qi for harder-hitting techniques; hiding your realm; longer flights |
| Body | how your body holds up | iron skin against physical damage; blood refining for regeneration; poison immunity; endurance against tribulation lightning |
| Soul | how far and how precisely you sense and control | wider divine sense that reveals more map; soul armor against pressure and illusions; split attention for one more flying sword, puppet or production queue; soul search on a captive, at a karma cost; steadier crafting hands |

**Insight is the universal currency of understanding.** It buys nodes in every tree except the Ways, which grow only by deeds. Every major breakthrough also needs an insight threshold on top of its fuel: qi for your realm, tempering for your body, nourishment for your soul. The threshold counts insight ever earned, so spending insight on nodes never delays a breakthrough.

Insight comes from:

- seclusion time and your realm, since higher realms understand more per day
- teachers and sect lectures
- enlightenment pills and Dao incense
- places: waterfalls, thunder peaks, ancient Dao steles
- manuals and inheritances, which arrive in lumps
- epiphanies the narrator tags, and near-death fights

Aptitude and talents multiply all of it, and an epiphany also leaves a discount on its related Dao.

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

Vow nodes pay big while a vow holds, such as sparing every foe who surrenders, and break hard when you fail. Every tree shares one shape: 9 tiers, one per realm, each opening with a starter node and ending in a capstone. Nodes above your matching level stay sealed until you grow into them.

**Techniques** are the moves you actually use, learned from manuals, teachers, inheritances and epiphanies. Each lists its requirements: a Dao tier, a realm, sometimes a body or soul level or a Way. Flying swords are a family of Sword techniques that also need a strong soul, and elemental spells are techniques of the element Daos.

Builds fall out on their own: the Demonic Way plus Sword techniques is a demonic swordsman, and the Demonic and Buddhist Ways together make a demon Buddha. The Orthodox Way plus the five element Daos on a five-element root is a five-element spell cultivator. Sword Dao plus a tempered body never needs a flying sword.

Some techniques ask for two trees at once, such as a blood-sword art that needs the Demonic Way and Sword Dao. v1 ships the Orthodox, Demonic and Buddhist Ways, the five element Daos, Sword, Saber, Spear and Fist, the four great craft Daos, and the first tiers of the Qi, Body and Soul trees.

**Cultivation methods** are the manuals you cultivate qi with. Some are common and some are special, and each has a fit, requirements and costs.

- Fit: a method that matches your talents cultivates faster and hits harder. A five-element root on a five-element method gets the full affinity bonus; a mismatch still works, slowly.
- Requirements run from nothing but qi density (your spirit vein and gathering arrays) to long lists: a root, a physique, a Dao, a Way, a place, a ritual.
- Costs come with power. A demonic method that grows by hunting people and draining their qi or blood is the fastest climb in the game. It also sinks karma, spreads notoriety and feeds heart demons.
- Special methods come from inheritances, secret realms and sect vaults, not shops.

**Fighting a realm up** comes from stacking advantages, never from one feature, and it is a low-realm feat. A stacked genius at Qi Condensation can beat a Foundation cultivator, one at Foundation rarely beats a Core Formation cultivator, and from Nascent Soul up the gap cannot be closed: the weaker side can only flee, talk or call for help. Breakthrough quality is one of them: every major breakthrough is graded flawed, ordinary, superior, perfect or heavenly, worth −1 to +3 stages in a fight. Heavenly needs a rare method.

The rest of the stack: a body or soul ahead of your realm, special methods, technique mastery, Dao tiers, Way nodes, artifacts and talismans, talents, terrain and creativity. Each closes part of the gap, enough of them close it all, and the balance sim decides how many that takes.

A major breakthrough's grade depends on the margin you bring: qi past a full bar, insight earned past the threshold, and body and soul at or above the new realm. Rushing in at the bare minimum saves lifespan but leans toward a flawed grade, so the time budget matters here too.

**Mastery belongs to techniques and recipes.** Each runs Glimpse, Comprehension, Mastery, Domain, Origin, raised by use, and each level adds +2 to checks with it.

"Flowing Cloud Blade at Comprehension" means a Foundation-tier sword technique at its second mastery level.

**Talents** are rolled at birth, and each rebirth rolls them again. There should be dozens; five kinds to start:

| Kind | Examples | What it changes |
|---|---|---|
| Spirit root | single-element heavenly root, five-element root, mutated lightning or ice root | qi speed, which methods fit, element affinity |
| Body | iron-bone frame, blazing-yang body, a beast bloodline, frail meridians | body training speed, HP, poison and tribulation resistance |
| Soul | innate divine sense, twin soul, a soul scarred in a past life | soul training speed, resistance to pressure and illusions, crafting precision |
| Fate | heaven's favored, calamity star, late bloomer, karmic debt | fortuitous encounters, disasters, tribulation strength, talents that wake late |
| Origin | village orphan, merchant's child, minor clan heir, great-sect disciple | where you start, how much of the map you know, early allies and enemies |

Every talent has a grade: gray (a flaw that lowers a stat), white (plain), green, blue, purple, gold and red. Body, soul and fate talents roll their grade on one table: gray 10%, white 40%, green 35%, blue 10%, purple 4%, gold 0.9% and red 0.1%. Spirit roots use the table under Character creation, where white is the floor; origin has no grade. Kinds and names are mostly flavor, and each talent in the end moves stats: a spirit root its qi speed and method fit, a body talent body training speed, HP, Agility or resistances, a soul talent soul training speed, Aptitude or soul defense, and a fate talent Fortune, Aptitude or the odds of encounters. Some talents sleep until an event wakes them, and a past life's achievements buy rerolls at rebirth.

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

The red root is the chaos root, 0.1%: every element in balance, ×3.0, and it fits every method fully.

**Three origins in the first playable**, all in the Border Wilds. The beast-ranch child, the merchant's child in the fortress city and the smuggler's ward arrive by M5, with the taming, trade and smuggling systems they need.

| Origin | Testing day | If you go along | If you refuse |
|---|---|---|---|
| Cave orphan, Kingdom of Stone Eyes | the imperial tester comes to the sinkholes, and the cave clans hide rooted children | the March's garrison school: a standard method, rations, a place on the wall | the clans hide you: a crude cave method, a map of caves no one else has, smuggler contacts |
| Conscript's child, March of Pacified Borders | the Gongsun garrison claims every rooted twelve-year-old for its cadet school | cadet: a spear method, a stipend of low-grade stones, patrols on the Wall of Piled Bones | deserter: no method yet, a bounty on you, and the Night Bridge Society offers a way out |
| Frontier orphan, City of the Guarded Mouth | the Beast-Butcher Gate's recruiter tests orphans who lost family to beasts | outer disciple: a saber method, contribution for cores, a senior who expects results | street cultivator: no method yet, odd jobs at the bounty office, and the Gate remembers you said no |

Refusing is harder but never a dead end: each refusal leads to a method within the first hour.

**The first hour**, at one real hour to one in-game year:

| Minute | What happens | What opens |
|---|---|---|
| 0–3 | creation and testing day | your method and origin |
| 3–5 | first seclusion; you sense qi and reach layer 1 | the seclusion screen with one slot: qi |
| 5–20 | layer 2; the first insight trickles in | body tempering, then the Qi tree |
| 20–35 | your origin's first technique; practice takes it to Comprehension | soul nourishment and technique mastery |
| 35–45 | the layer 3 breakthrough, with a small check and choice | the breakthrough screen |
| 45–60 | the first trip out, from M3: a cave guiding job, a night patrol or a core hunt with a senior | the go-in screen, the map's first fog, loot flowing home |

There are no tutorial walls. Each system appears when you first reach it, with one line of hint and a chronicle entry. In M1, which has no AI, the first trip out is a fixed errand card with set outcomes.

Layers 1 to 3 are the tutorial and ignore root speed, so every root reaches layer 3 in about 45 minutes; root speed counts from layer 4. Pacing targets for the sim: an ordinary true root reaches layer 9 in about 15–20 real hours, around age 30. Foundation then waits on a Foundation Pill from the world, and a heavenly root gets there in about half the time. Until M3 the world can't supply that pill, so in M1 your origin hands you one at layer 9, as a reward or a trade.

## Professions, people and powers

Every system has an idle half and a world half, and each half supplies the other.

**Professions** are the Hundred Arts, and each is a craft Dao: a tree with 9 tiers, one per realm, grown by insight and seclusion time. You can study higher tiers early, but crafting at a tier needs your soul level to reach it.

Basic recipes are scattered through each tier as nodes, and every tier's first node hands you one starter recipe. Other nodes improve success, yield, quality and speed, and each tier ends in a capstone perk, like brewing two batches at once.

Unique recipes have to be found: some sit in any sect library, others only in ruins, inheritances or a dying master's hands.

**Recipes carry mastery**, Glimpse to Origin, raised by crafting them. Higher mastery means better odds, higher grades, bigger yields and fewer explosions. A disciple running your recipe on a production line works one level below your mastery.

**Experimentation** is the gamble: throw in any ingredients and the engine rolls against hidden recipes. Most tries fail or blow up the furnace, but each failure raises the odds of the next. A hit is a recipe that's yours to name.

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
| Worker | you in seclusion, disciples, hired hands, puppets, formations | recruit disciples, hire in town, refine puppets, lay arrays |
| Outlet | your own breakthroughs, a shop or consignment house, sect quotas, auctions | own a shop, sign with a merchant guild, hold a sect post |

**Posts bundle all three links**, with duties attached:

- Herb garden keeper: sect plots and junior disciples, against a harvest quota.
- Alchemy Hall head: the sect's herbs, furnaces and apprentices. You keep a cut of every batch and answer for the failures.
- Formation Hall master: the sect's arrays and materials; repairs after an attack come first.
- Shop owner in a market town: no sect needed, but you buy your own inputs and pay your own guards.
- Your own sect, later: every hall is yours, and so is every problem.

**Where you live matters:** your cave abode's location sets the spirit vein grade, which markets you can reach and who might raid you. Moving it is a world action, and a line that needs a market stalls when none is in reach.

**Automation grows in four steps:**

1. You queue crafts yourself, spending seclusion time.
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

**Stones as fuel.** Stones speed seclusion; they don't replace it. At Qi Condensation each low-grade stone burned during a day of qi seclusion adds about a fifth of that day's qi, up to about five stones a day, so a well-stocked day yields about twice the qi. That takes more than a day's wages, so working never beats secluding for raw qi; the world's share comes from what seclusion can't make. The qi each realm needs follows the realm curve, like income, so a day's wages buy about the same share of a day's qi at every realm, and a low-grade stone is worth a ninth as much at Foundation and almost nothing by Core Formation. That is why every realm hungers for the next grade.

**Where stones go:**

- Fuel: stones and pills for qi, body and soul.
- Upkeep: gathering, guarding and growing arrays burn stones every day.
- Crafting: materials, failed experiments and cracked furnaces.
- Fees: Armillary Pavilion array tolls, market fees, passage, taxes and bribes.
- Auctions, the biggest sink, where you bid against NPCs who want the same lot.
- Losses: robbery, raided gardens, repairs after fights, and everything you carried when you die.

**Sect contribution** comes from duties while you idle, missions in the world and donated goods. It buys the sect's manuals, methods, pills, a better cave abode and a master's time. Stones buy contribution only by donation, at a poor rate, so a rich outsider can't buy a sect's vault.

**What the balance sims measure:**

- real hours to each realm, by spirit root
- stone income against spending, per realm: positive but tight
- the world's share of progress, kept between 40% and 60%
- deaths per trip out, by the realm gap to the region's dangers
- win rates per matchup, in the fight sims

## Combat: rules underneath, free text on top

Combat is turn-based code you can play with buttons; typed free text is a layer on top, not a separate system. Letting GLM run fights alone was ruled out: it favors whoever writes best, loses track of HP over long fights, and can't be balance-tested.

**The rules**

- Six attributes. Qi, Body and Soul come from cultivation: qi pool and technique power; HP and physical damage; perception and soul defense. Agility (turn order, evasion, fleeing), Fortune (crits, loot) and Aptitude (how fast seclusion time pays off) come from birth, techniques and items. Each starts at a base value that talents move: body talents move Agility, fate talents Fortune, and soul and fate talents Aptitude. The base is 10, and a talent's grade sets how far it moves one: gray −2, white 0, green +1, blue +2, purple +3, gold +4, red +5. Crits start on a natural 20, and every 4 points of Fortune above 10 adds one more face, so 14 Fortune crits on 19 or 20; each point above 10 also adds a 2% chance of an extra drop. Each point of Aptitude is worth 5% on all seclusion gains.
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

One realm up, at the same stage, is about a 3× damage swing into Foundation, 5.5× into Core Formation and 10× from Nascent Soul up, on top of the check penalty. HP and the qi pool climb the same ladder with the same steps on the body and qi ladders, so a realm up is about 9× the power into Foundation, 30× into Core Formation and 100× from Nascent Soul up. Fighting up a realm takes tricks, allies or running. Every multiplier is a starting value for the balance sim to tune.

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

**Look.** Black cracked glass. A few long fractures cross the background from impact points, a fine web of cracks sits only around those impacts and away from text, and qi light leaks faintly through every crack. Panels are smooth, darker glass with a thin bright edge, so text never sits on a crack. Gold marks anything you can act on or have just gained. The crack light is the qi glow, and the qi, body and soul bars use it too, so qi reads as the light behind the glass. A breakthrough makes the cracks flare and opens a new fracture. The pattern is seeded per life and redrawn to fit the screen. A serif display face for names and realm titles, with hanzi set in a brush font as flavor, and a plain sans for numbers and menus. Starting colors to tune in the build: background #040507, panel glass rgba(10, 12, 16, 0.8), edge rgba(255, 255, 255, 0.075), text #e9e5da, muted #8d949d, gold #d6ab4c, crack light #7fc7d9. `docs/mockups/glass-study.html` is the reference mockup. The atlas keeps its own ink-and-silk look, since it is the authoring tool, not the game.

**Players pick their colors.** Settings changes the accent and the crack light, sets how much fine web the glass carries, and rerolls the glass, with presets and a free color picker that warns when a color is hard to read on black. Each color keeps its job whatever it looks like: the accent always means something you can act on, and the crack light always means qi. The defaults are gold, qi cyan and a light web.

**Layout.** On desktop, the side menu is on the left, the screen in the middle, and a context panel on the right with tooltips, the latest chronicle lines and active queues. On a phone the menu becomes a drawer, and the context panel slides up from the bottom.

| Screen | What it shows | Ships in |
|---|---|---|
| Abode (home) | realm and stage, qi, body and soul bars, age against lifespan, today's seclusion plan, the spirit pool from M4, alerts | M1 |
| Cultivate | split seclusion days among qi, body, soul, study and practice; breakthrough checks and their odds | M1 |
| Trees | the Qi, Body and Soul trees, then the Daos and Ways: a pannable graph in nine tier bands, sealed nodes dimmed | M1, Daos M2, Ways M3 |
| Techniques | every technique with its mastery level, requirements and what is still sealed | M1 |
| Character | talents, the six attributes, fame and standing | M1 |
| Chronicle | your life as a log: breakthroughs, fights, rumors and steward reports | M1 |
| Settings | OpenRouter key and cost meter, saves, clock speed, colors and glass, text size, reduced motion, the mature content switch | M1, AI parts M3 |
| Bag | items, pills and storage ring space | M2 |
| Go In | the adventure screen, described below | M3 |
| Map | the zoomable world map with fog of war; tiers open with M6 | M3 |
| Crafts | furnace, forge, array and drawing queues, recipes and experimentation | M4 |
| People | NPCs and relationships, your sect, factions | M5 |

**The go-in screen.** The narration streams down the middle, each turn followed by its log line with the math. Three or four suggested actions sit under it as buttons, with a free-text box below them. A scene panel beside it shows where you are, the tagged features, who is present and your HP, qi and statuses. Leaving returns you to the abode with a summary of what you brought home.

**Coming back.** After time away, a card shows what happened while you were in seclusion: qi gained, breakthroughs, queue output, events. From M5 it includes the steward's report.

Numbers use short forms past ten thousand (12.4k, 3.1M), and every number that matters has a tooltip with how it was worked out.

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
| M1 Idle core | 3–5 | Qi to Foundation, body, soul, insight; no AI |
| M2 Combat engine | 6–7 | rolls, damage types, v1 Daos; fight sim |
| M3 Go-in slice | 8–10 | one fogged region; free text; loot flows home (the playable slice) |
| M4 Crafts | 11–14 | four great arts, spirit farming; Core Formation |
| M5 People and powers | 15–18 | NPC memory, romance, sect posts, factions |
| M6 Living world | 19–21 | map tiers, markets, events, beast taming |
| M7 Big moments | 22–24 | Nascent Soul, tribulations, heart demons |
| M8 Rebirth and friends | 25–27 | lifespan, reincarnation, friends build |

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
- [ ] Node lists: tiers 1 and 2 of each v1 tree, drafted with AI help and curated. The Qi, Body and Soul trees in the M1 build, reviewed by Jan, the combat Daos before M2, the Ways before M3, the craft Daos before M4
- [x] plan.md for Claude Code: the build split into one-session phases, written once planning is done

**Before M2 and M3**

- [ ] Items and gear: slots, grades, artifact bonding and artifact spirits, pill toxicity, storage rings; item, talisman and array power on the realm curve, with a higher-realm talisman priced by its own realm
- [ ] Enemies: beast and cultivator templates, behavior profiles, loot
- [ ] Combat outcome tags for effects and sound: form, element or damage type, realm and result on every outcome
- [ ] Exploration: travel and its time cost, encounters per region, scene building, ruins and inheritances, fleeing, dying in the world; ways to flee, hide or talk past foes a realm or more above you; the fog's rules, meaning what travel, divine sense, maps and rumors each reveal
- [ ] NPC basics: what an NPC record holds, what each NPC knows, how talk changes relationships

**Before M5 to M8, sketched now**

- [ ] NPC depth: aging and death, NPCs who climb on their own, rivals who return stronger, disciple loyalty and betrayal; a cast list of the atlas's named people (a person kind or a people file) with fixed looks, so portraits can follow
- [ ] Sects: ranks, politics, founding your own, sect wars; faction strength weighted by the realm curve, so a sect is mostly its ancestor
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
