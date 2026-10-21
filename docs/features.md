# The feature list

Every feature a player can touch in the game today (built in code, not only designed), where it lives, how a player first meets it, what it needs first and what teaches it now. Drafted 2026-10-20 for the opening redone (design § Still to design, The opening redone), awaiting Jan's review; the introductions, the codex's entries and the origin's chain are designed from it. A phase that adds a feature the player touches adds its row here.

**Way in** (The opening, built, 2026-10-20) names how the row is introduced: a guide (`src/content/guides.ts`), an introduction quest offered where the feature lives (`src/content/quests/intro.ts`, or the origin's chain for the four rows every chain teaches, The opening, built: chains, rogue, knobs), or the codex alone. Every row has a codex entry (`src/content/codex`), its first column copied word for word; a test holds the two together. The other columns describe the game before the guides: since then a guided feature drops its hint, and the rail builds itself during the first seclusion.

**Taught by** names a first-time hint from `src/content/firsts.ts` (`hint:`), a "?" explainer (`Why:`), a beacon, the new-screen glow and dot, a caption, or nothing.

**Open from the first minute:** the rail shows Cultivate, Routine, Map, Character, People, Chronicle and Settings. The rest open where they live: the Trees at 10 insight earned or a method or copy, the Practice tab and Combat at the first technique, the Bag at the first item, Crafts at the first tool or recipe.

**The seven firsts** (copy, study hour, method, technique, art, stones, node) arrive switched off with a beacon. The 17 hints, in order: copy, study hour, method, qi hours, orbs, attending, technique, technique hour, art, art hour, stones, node, insight, breakthrough, auto, cards, hints off.

**Worth having on the table:** an origin that goes along starts already holding a post (Duty hours), a seat in a power and a dwelling. The post panel and the Character screen's membership line show it, and nothing introduces it.

## Cultivation (Cultivate)

| Feature | Where | First met today | Needs first | Taught by | Way in |
|---|---|---|---|---|---|
| Creation: name, look, pronouns, ironman or gentle | A New Life | The first screen | nothing | Captions (gentle is one rewind) | codex |
| The talent roll: root, elements, talents, three free rerolls | Creation | After who you are | nothing | Row captions | codex |
| Childhood and testing day, going along or refusing (three origins) | Creation | End of creation | sets method, routines, stones, post, home | Story text | codex |
| The qi bar and cultivating qi | Cultivate, the ladder bar | The bar sits empty | a method taken up | hint:method, hint:qi-hours, Why, beacon | guide: taking up your method |
| The seat: the figure, the sun-hand of the hour, its caption | Cultivate | Opens on it | nothing | Caption | guide: the qi bar |
| Orbs: pass the pointer through to draw qi | Cultivate, the figure | Motes drift in once a method is up | a qi method | hint:orbs, Why | guide: drawing an orb |
| Focus and attending (×2.5 to ×4, on any screen) | Cultivate's ring, every screen | The first orb drawn | an orb | hint:attending, Why | guide: focus |
| The breath cycle and heat (greedy catching goes unsettled) | Cultivate's ring | Late, by feel | orbs | Why only | codex |
| The body and soul ladders | Cultivate, more bars | A bar appears | a tempering or nourishing art | hint:art, hint:art-hour | codex |
| A minor breakthrough and its scene (tap as the spark passes each gate) | Cultivate | A full bar and a rail mark | a full bar | hint:breakthrough, rail mark | guide: the first minor breakthrough |
| The major breakthrough: grade meter, odds, offerings, pill, waiting to fill | Cultivate, right panel | At a realm's top layer | its requirements, the gate pill | Why ×3 (grade, odds, failure) | codex |
| The auto setting for minor breakthroughs (Safe, Balanced, Bold, Only when I say) | Routine › Day | After a ladder's first step | nothing | hint:auto, beacon | codex |
| Insight | The top bar | The number appears | nothing | hint:insight, Why | codex |
| Spirit stones, burned in qi hours | Top bar, Routine › Day | The count at the top | 5 stones held, layer 2 | hint:stones, beacon, Why ×2 | codex |
| Story cards: choices, defaults, urgent cards, settled while away | Cultivate's tray | A card arrives | days lived, origin, flags | hint:cards | guide: the first card |
| The first-hour cards (the refusal's method, the first technique, the errand's copy, the lamp-keeper's art, the Foundation exam) | Cultivate's tray | By days lived (about minutes 8, 20, 45, 100) | origin and path | Card text | codex |
| The seclusion deck (50 cards) | Cultivate's tray | After the first-hour cards | days lived, season, ties | Card text | codex |
| Today and the recent chronicle lines | Cultivate's band | When no card waits | nothing | Row links | codex |
| The coming-back story (up to 12 hours away counts) | Cultivate's band | On reopening | time away | The card itself | codex |
| Lifespan's edge, a last breakthrough, letting go, the next life | Cultivate's rise card | Near the lifespan | age | Card text | codex |
| Weather and season on the glass | The background | Always | nothing | nothing | codex |

## The day wheel (Routine)

| Feature | Where | First met today | Needs first | Taught by | Way in |
|---|---|---|---|---|---|
| The 12-hour wheel: Qi, Body, Soul, Study, Practice, Sleep, Duty, Craft | Routine › Day | All qi, two hours of sleep | each kind its thing (a technique, an art, a tool, a post) | hint:study-hour, hint:qi-hours, Why | guide: turning an hour to study |
| An hour's bonuses: element match (from layer 4), dawn, night qi | Routine › Day | The hour picker | picking an hour | Why | codex |
| Learned routines and discipline (+10% for keeping one to the hour) | Routine › Day fold | A path may hand one | a routine from a path, manual or sect | Why | codex |
| Your own wheel saved, renamed, forgotten | Routine › Day fold | The fold | nothing | nothing | codex |
| The methods panel: Climb with, Change, mastery, upkeep, properties | Routine › Day column | The method row | a method | hint:method, Why ×4 | codex |
| Sleep freed at Foundation (two more hours) | Routine › Day | A line when it lands | Foundation | Chronicle line | codex |
| The road wheel (travel, look, guard, home, gather) | Routine › Day toggle, the Map | The Map's Journey tab | a course | Why | codex |
| Your post | Routine › Day column | There from the start on a path that went along | a post | nothing | codex |
| The Study tab: the reading stand, the queue, Read now | Routine › Study | A copy on the shelf | a copy | hint:copy, hint:study-hour, beacon | guide: reading a copy |
| What study gives (insight a day, Aptitude) | Routine › Study | The column panel | nothing | Caption | codex |
| The Practice tab: techniques, Practice this, slots (1 to 3) | Routine › Practice | The tab appears | the first technique | hint:technique, hint:technique-hour, Why | guide: a technique put to practice |
| Mastery, Glimpse to Origin (techniques, methods, bonded gear) | Practice page, the method card | A ring and bar | practice hours | Why | codex |
| Lines, chapters, kinship | Practice page | A technique's page | a line of several chapters | Why ×2 | codex |
| Arts: a technique's passive tree | Practice page, the Trees | The art line | a technique | Why | codex |

## Trees and manuals

| Feature | Where | First met today | Needs first | Taught by | Way in |
|---|---|---|---|---|---|
| The Qi, Body and Soul trees as fans: pan, zoom, the realm ladder | Trees › Cultivation | The screen opens | 10 insight, or a method or copy | glow and dot, Why | codex |
| Buying nodes with insight | Trees | A node's ring | 50 insight for the first node's hint | hint:node, beacon | guide: the first node |
| Sealed nodes above your level, the tier bonus, capstones | Trees | A node's tip | a tier above your realm | Node tip | codex |
| The Breath branch (pays only while attending) | Trees › Qi | A side branch | the Qi tree | nothing | codex |
| The nine combat Daos (fire, water, wood, earth, metal, sword, saber, spear, fist) | Trees › Daos | Its category once touched | a technique or weapon of that Dao | glow | codex |
| The craft Daos: Hand, Line, Lore | Trees › Crafts | Its category once touched | a craft tool | glow | codex |
| Manuals on the trees as jewels, and manuals with no host | Trees › Manuals | A jewel in a band's crown | a manual read | glow, the spine's hover card | codex |
| The bookcase: spines, filters, search, the finished stack | Trees › Manuals | The shelf | a copy or manual | The spine's hover card | codex |
| The Intent ladder (Qi, Intent, Domain) | Character sheet | A row, late | a tier 2 or 4 Dao capstone, then a moment | Why | codex |
| Treasure slots, opened by notables | Bag | A caption on Worn | the Qi and Soul notables | Why | codex |
| Veiled Aura (showing a lower realm) | Map, travel veiled | A greyed toggle | the node | Tooltip | codex |

## Fighting

| Feature | Where | First met today | Needs first | Taught by | Way in |
|---|---|---|---|---|---|
| Sparring: foes at your realm, nothing dies or drops | Combat | The list of spars | a technique | Screen caption | introduction quest (the chain’s first lesson) |
| Techniques, Strike, Flurry, Defend, Take cover | Combat, your move | Buttons priced against the foe | a technique | Why (the odds) | guide: the first turn of a fight |
| Items in a fight (pills, fight items) | Combat | The items row | an item with a fight use | nothing | codex |
| Words and feet: bluff, intimidate, bargain, surrender, flee | Combat | Quiet buttons | nothing | nothing | codex |
| Gear bonding a little each exchange | Combat's caption, the Bag | The spar's caption | worn gear | Caption | codex |
| The realm gap, protective qi, arts that strike many | Under every fight | Only in the log | a realm's difference | nothing | codex |
| Fights from encounters and cards, settled by the engine, not played | A map card, the tray | Verdict tags | a fight card | The exit's verdict | codex |

## Bag and gear

| Feature | Where | First met today | Needs first | Taught by | Way in |
|---|---|---|---|---|---|
| The pack's grid, stacks, its squares; kinds (pill, herb, material, beast part, map, tool, mount) | Bag | The screen opens | the first item | glow, Why | codex |
| Wearing gear: weapon, armor, ring, pouch; requirements | Bag | Four squares glow | gear | Glow and the lock's reason | introduction quest |
| Eating pills and the toxicity meter | Bag | Eat one | a pill | Why | codex |
| Bonding and properties on blue-and-up artifacts, feeding stones | Bag, the detail | The bond line | blue or better | Why | codex |
| Ground piles: picking up what overflowed | Bag, map marks | When something falls | overflow | Why | codex |
| Offerings laid at a major breakthrough | Cultivate's panel | Its slots | items with an offering use | Panel text | codex |

## The map and travel

| Feature | Where | First met today | Needs first | Taught by | Way in |
|---|---|---|---|---|---|
| The painted map: pan, zoom, fog, all you have charted | Map | Open from the start | nothing | nothing | codex |
| Click to set a course, and the clock carries you | Map | A click | nothing | nothing | guide: setting a course |
| The right-click menu: go here, pin, stay and cultivate, go home, search for it, go and enter | Map | A right-click | nothing | nothing | codex |
| Knowing a place: unknown, rumored, sketched, seen; rumor rings | Map, place pages | Pins and rings | rumors, maps, walking | nothing | codex |
| The Journey tab: where you are, where to, ahead, the course card, stop, turn back | Map's column | The left column | a course | Labels | codex |
| Road routines: by day, pressed march, night road, caravan guard | Map's column | The picker | nothing | Why | codex |
| Ways to go: light step, mount, flying, wagon, ship, someone's sword | Map | Greyed, with why | a mount, Foundation to fly | The greyed reason | codex |
| Stance: Avoid, Careful, Bold (settles what the road brings) | Map's column | Chips and a note | nothing | The stance's note | introduction quest (the chain’s board road) |
| Encounter seals on the map; the Card tab (exits with verdicts, going round) | Map, the Card tab | A seal, a rail mark | travel | The card's foot line | codex |
| Encounter kinds: beast, cultivator, mortal, place, omen, plot (41 templates) | Map | Seals | travel | The card's opening | codex |
| Looking, gathering and sensing (Look and Gather hours, sensing by realm) | The road wheel | The hour kinds | road hours | The hour's tooltip | codex |
| Depth bands and the "a realm above you" warning | Map's column | Pips and a warning | travel | Warning text | codex |
| Gates, tolls, the watch reading your realm | The place's strip | The gate strip | cities and gates | Strip text | codex |
| Travelling with a group (a caravan, a cloud ship), and leaving it | A map card | The group card | a caravan or ship | Card text | codex |
| Sites: caves, huts, shrines; staying to cultivate | A place screen | The site's counter | a site found or seen | Counter text | codex |
| Bounty postings pinned on the map | Map, the board | Gold marks | taking a posting | The board's caption | introduction quest (the chain’s board) |

## Places, shops and money

| Feature | Where | First met today | Needs first | Taught by | Way in |
|---|---|---|---|---|---|
| The place screen: the gate strip, doors grouped Trade, Own, Work, Hear, Rest | Map › enter | Entering | being there | Door subtitles | guide: a place’s doors |
| Shop kinds: stall, alchemy shop, refiner, talisman shop, part dealer, sect shop, trading house, black market, bounty office, mortal shop | Place doors | Door names | the place and district | Door subtitles and tags | codex |
| Buy, Sell, Mend and Restore | The shop's counter | Tabs | stones or silver | nothing | guide: the first buy |
| Haggling (once a visit) | The shop's counter | The keeper's line | nothing | The button's label | codex |
| Market labels: made here, imported, scarce, the month's purse | Shop rows | Row tags | nothing | nothing | codex |
| Selling copies and methods; staples by the lot | Shop › Sell | Rows | a copy or a staple | nothing | codex |
| Money: stones by grade, silver taels, the money changer | Top bar, the changer's door | The count | nothing | Why | introduction quest |
| The teahouse or the village elder: a rumor a day | Place › Hear | A door | a town or village | Door subtitle | codex |
| The map seller (the region, the kingdoms) | Place › Hear | A door | a map shop | Door subtitle | codex |
| Guides for hire, a stone a day | Place › Hear | A door | towns and cities | Door subtitle | codex |
| Caravans leaving weekly | Place › Hear | A door | cities | Door subtitle | introduction quest |
| The bounty board (three postings a month), the mission hall | Place › Hear or Work | A door | a board | Counter text | codex |
| An inn or barn bed: sleep by rule, taels a night | Place › Rest | A door | a place with a bed | Counter text | introduction quest |

## Organizations and jobs

| Feature | Where | First met today | Needs first | Taught by | Way in |
|---|---|---|---|---|---|
| The rogue's way: no power behind you, day hires, your own place | Place › Work, a found cave or hut | Refusing at testing day | refusing | the chain's Your own way | introduction quest |
| Joining a power (its way in: a test, a buy-in, a trial) | The seat's place › Join | A door | being at its seat | Door subtitle | introduction quest |
| A gift to a power (monthly tribute) | The seat's place | A door | an outsider at a seat | Door subtitle | codex |
| Seats and titles, contribution, the monthly allowance, the tithe, the quota | Character › memberships, People | A line | membership | Caption | codex |
| The elders' hall: a lesson, a protector, release, the inner trial | The seat's place | A door | a member | Counter text | introduction quest |
| The hall's sect shop: members' terms, donating | The shop's counter | The terms line | a member | Counter text | introduction quest |
| The open counter and the guest elder (an outsider at ×1.25) | The shop's counter | The terms line | a power's hall | Counter text | codex |
| The scripture pavilion: chapters by seat | Place › Own | A door | a member of rank | Door subtitle | codex |
| The dwelling: seclusion in your seat's richer qi | Place, Routine's rates | The place's line | a member at the seat | The place's line | codex |
| Posts and hires: the Work door, shifts as Duty hours, pay, perk, kept or missed, leaving | Place › Work, Routine's column | The post panel | a post | Panel rows | introduction quest (the chain’s Your place, or Your own way) |
| A dangerous post's monthly raid | A map card | The raid encounter | a post with danger | Card text | codex |
| Backing by your power (named in trouble) | Under encounters | Unseen | membership | nothing | codex |
| Guarded methods: seen using one, you are marked; the law hall's restitution; hunted on the roads | The place's strip, the law hall's door | The mark strip | using a guarded method | Strip text | codex |
| Leaving or being struck off; betrayal, parting | The elders' hall, the Chronicle | A door | membership | Counter text | codex |

## People

| Feature | Where | First met today | Needs first | Taught by | Way in |
|---|---|---|---|---|---|
| The People screen: circles or web, a person's page (nature, wants, likes, trust, memories, ties, log) | People | Open from the start | nothing | Labels | codex |
| The fresh-news dot | People | A dot on someone | news | The dot | codex |
| The powers that know you, your name's reach by region | People | Under the list | nothing | nothing | codex |
| Ties and opinion moving through cards and scenes | Cards | Card choices | meeting someone | Memory lines | codex |
| Followers and their bonds (pay, loyalty, fear, a goal) | A person's page | The "follows you" row | a recruit, in scenes only, no door | nothing | codex |
| Rumors about people and places | Teahouse, People | The counter | a town | Door subtitle | codex |

## Crafts

| Feature | Where | First met today | Needs first | Taught by | Way in |
|---|---|---|---|---|---|
| The Crafts screen: Alchemy and Refining (Talismans, Formations, Farming greyed until their phases) | Crafts | glow and dot | a tool or a recipe | glow, a tooltip on the greyed pages | codex |
| Recipes known, and a formula slip read on study hours | Crafts, Study | The recipe list | a slip | nothing | codex |
| The bench queue: batches run untended on Craft hours | Crafts | Sit at the furnace | Craft hours | The hours' caption | introduction quest |
| Sitting at the furnace: burning out the dross (fire control, the steady hand) | Crafts, its scene | Clicking the dark specks | a queued batch | Scene text, the Steady hands panel | introduction quest |
| The forge: sealing rune points, quenching on the cherry (tempering) | Crafts, the refining scene | Clicking at the glow | a queued piece | Scene text | codex |
| Mending your gear at the bench | Crafts › Refining | The list | worn pieces | nothing | introduction quest |
| Mastery by family, the soul gate, the land that lends | Crafts' right column | Panels | crafting | Panel headings | codex |
| The tray and the last batches | Crafts | The tray | a batch done | nothing | codex |
| Shops brewing and refining what they sell | Alchemy shop, refiner | The shelf | markets | nothing | codex |

## Dwellings and sites (K9)

| Feature | Where | First met today | Needs first | Taught by |
|---|---|---|---|---|
| The Dwelling screen 居: the one where you stand (its qi on the ladder, vein, concealment, defenses, worth, reach, neighbors), greyed elsewhere with the ones you hold | Dwelling, on the rail under Crafts | glow and dot | a dwelling you take or claim, or a month at your seat's quarters | Panel lines |
| Your seat's quarters: a bunk or cave by seat, its footlocker, a dynasty's at your post | Dwelling | The screen opening after a month | membership | Panel lines |
| The broker 牙行: rooms, cultivation chambers, courtyards, a medicine garden, a mansion, the spirit hill's caves; a village's farmhouse | Place › Hear and hire | A door | a town or city | Counter text |
| The store, a second grid opened only at its dwelling | Dwelling | The store panel | a dwelling with a store | Panel line |
| A dwelling's land as plot slots, each a farming plot | Dwelling, then Crafts › Farming | The Land panel | a dwelling with slots | Panel line |
| Your abode: home, a free bed, moving it | Dwelling, the map's Go home | The abode chip | a dwelling | nothing |
| Hidden veins and reading the land 堪舆 (soul and Earth Dao, once a day) | Map › Journey, where you stand | A button | nothing | Button subtitle |
| Claiming: a thatched hut on bare land, a cave abode or spirit mountain on a vein read, a hidden valley at falls or a sinkhole; a deed inside a power's sphere | Map › Journey and right-click, a site's screen | Buttons | standing there | Button subtitle |
| Building your base: clearing land, digging the store, a quiet chamber | Dwelling › Build | The panel | land claimed in the wild | Panel lines |
| Raids by thieves and beasts on a site in the wild | A card | The card | a claimed site worth taking, or raised qi and old beds | Card text |
| Rent taken as its time turns, a lapsed lease's store kept a month | Dwelling, the Chronicle | A line | a rented dwelling | Panel lines |

## Formations (K10)

| Feature | Where | First met today | Needs first | Taught by | Way in |
|---|---|---|---|---|---|
| Formation Inscribing: flags 阵旗 and discs 阵盘 made at the bench, queued | Crafts › Formations | The recipe list | an inscribing plate or an array diagram | Page line | codex |
| Placing 布阵: laying an array by reading the currents, the hand lifting its rarity | Dwelling › Arrays, the map's own menu | The placing veil | an array in the Bag | Scene text | codex |
| Arrays at a site: gathering under the vein's cap, warding, concealing, alarm, growing; their eyes fed and taken up | Dwelling › Arrays | The Arrays panel | land claimed on a vein | Panel lines | codex |
| Arrays in a fight on their ground: warding, binding, killing, maze | Combat | Log lines | a raid at your site, or a trap's catch | Log lines | codex |
| Prepared ground and traps: an array on open ground, what walks in held until you check it | Map, your own menu | A 阵 seal on the map | an array on open ground | Menu subtitles | codex |

## Methods that eat resources, arts that burn goods (K11)

| Feature | Where | First met today | Needs first | Taught by | Way in |
|---|---|---|---|---|---|
| Methods that eat resources: fed a band rarer for light upkeep, two for heavy | Routine › Day column | The method row's Fed line | an upkeep method's slip | Why ×1 | codex |
| Stone swallowing 吞灵石: twice the stones a day, those past the cap at half worth | Cultivate, the day's line | The day's qi line | a swallowing method or node | Codex | codex |
| The talisman volley: 3, 5 or 10 talismans thrown in one action | Combat › Burn goods | A Burn goods button | a volley art, the Talismans Dao held | Why ×1 | codex |
| Arts that burn goods: a piece blown apart, flags set mid-fight, the burning pill | Combat › Burn goods, Items | A Burn goods button | a spare piece, an array or a burning pill in the Bag | Why ×1 | codex |

## Commissions and the craft deck (K12)

| Feature | Where | First met today | Needs first | Taught by | Way in |
|---|---|---|---|---|---|
| Commissions 托: a shop's notice for its market's shortage, and by name from craft renown 3 | A craft shop's counter › Commission | The notice on the tab | nothing; graded ones a certified grade | Quest: A Notice on the Counter | quest |
| Made to order 订做: a recipe made at an alchemy shop or refiner, your inputs or theirs | An alchemy shop or refiner › Commission | Made to order under the notice | stones, or the inputs | Codex | codex |
| The craft deck: cards of the bench, the field and the market, at your Craft hours' share | Cultivate, the tray | A craft card | a tool or a field held | Codex | codex |

## Chronicle and the rest

| Feature | Where | First met today | Needs first | Taught by | Way in |
|---|---|---|---|---|---|
| The Chronicle's river (stations, season prose, realm chapters), the almanac, kind chips, earlier lives | Chronicle | Open from the start | nothing | Chips | codex |
| The Character screen: talents, attributes, the sheet, growth, grades, memberships, manuals held | Character | Open from the start | nothing | Why | codex |
| Toasts for gifts, the new-screen glow, dots, beacons | Everywhere | Corner toasts | gaining things | Themselves | codex |
| Settings: eight slots, a new life, export, import, delete, rewind (gentle) | Settings | The rail | nothing | Dialog text | codex |
| The clock speeding with your realm; the cap on time away | Settings | A panel | a realm reached | Caption | codex |
| Look: the accent, rarity colors, glass, text size, motion, fullscreen | Settings | A panel | nothing | Why | codex |
| Hints on or off, replaying them | Settings | A panel | nothing | hint:hints-off (day 30) | codex |
| One tab a slot (take over) | A dialog | A second tab | nothing | The dialog | codex |

## Never taught today

No hint, card, tooltip or "?" at all:

- **The map:** click to go, the right-click menu, fog, pins, rumor rings, Look and Gather hours.
- **Fights:** that the Combat screen exists, words and feet, fight items.
- **Organizations:** the starting post and its Duty hours, the membership a path that went along begins with (its quarters open the Dwelling screen after a month, K9), the elders' hall, backing, the pavilion, a guarded method's mark.
- **People:** followers, the powers list, your name's reach.
- **Shops:** buying, selling, mending, the market labels, selling copies and staples, the changer.
- **Crafts:** the bench queue, formula slips, mending, the greyed pages (a tooltip only).
- **Trees:** the Breath branch, the craft Daos, a Dao appearing once touched.
- **The bag:** wearing gear, ground piles (a "?" but no hint), treasure slots opening.
- **The rest:** the Chronicle, the Character screen, saves, rewind, gentle mode, clock speeds, sleep freed at Foundation, the realm gap, backing.

What does teach today: the 17 hints (the cultivation loop, the first technique, the first node, auto, cards), about 35 "?" explainers (mostly numbers), and the new-screen glow and dots. Past the seven firsts, everything is carried by captions or by nothing.
