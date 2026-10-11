# Atlas audit, 2026-10-11

The atlas is structurally clean but its text needs a pass: 105 items below, 52 of them should-fix. Every entry parses, every parent and `[[link]]` resolves, every `top` names a real realm, and all 564 placed land entries sit inside their region and on land. Two problems run through the whole world: a name-replacement pass that mangled about 40 entries, and lore written for shorter distances than the map.

Seven Sonnet readers covered one continent or sea each, and a script confirmed that every one of their 209 quotes appears in the atlas word for word. Their findings were then judged one by one: seven weak ones were dropped and duplicates were merged. Mechanical checks over all 795 entries added the rest.

Status: every item below is fixed. The three decisions went into both the claude.ai atlas and the local file; everything else was fixed in `content/atlas/entries.json`, which is now the source of truth. The 79 entries without a realm are covered by the README's definition: empty means no cultivator of note, unknown a deliberate mystery.

## Decisions for Jan

Applied 2026-10-11 to the online atlas and the local export: the strait lore was rewritten to the map's distances, the top rule was adopted and 15 parents raised, the Great Jing sphere is now 125,000 li, and the March charter is in.

These change many entries at once, so they need a call before the fixes below.

- **jade-strait, qm-bianhuang, qm-yeqiao-hui, sea-suomen-xia, cm-wangsha, cm-dushou**: The lore treats the straits as narrow, but the map puts neighbouring continents 31,000 to 68,000 li apart, coast to coast. The Jade Strait is 31,000 li at its narrowest and 43,600 li from the Border Wilds coast, yet the lore has smugglers crossing at low tide and by night, beasts swimming over, and a month's walk along the island chain. Even a Foundation flyer needs about six weeks. Fix: Keep the map, which matches the design's scale and travel speeds, and rewrite the distance lore. For the Border Wilds: the low-tide crossing joins the first islands of a chain that runs on for a season's travel, and only strong beasts make the whole crossing. The alternative, moving continents closer, would shift every coordinate and region cell.
- **beast-court, qiming, changmu, xuanshuang, wuya, fy-guiying, hs-baqu, hs-wuyan, fy-chuiyin, sea-huiliu, cm-yuxie, sea-tigen, qm-huangji, qm-jianyu, qm-yaoling, cm-suyuan, xs-heiyao, sea-jiaoyuan**: `top` means different things in different entries. The README calls it the strongest present, but 21 children outrank their parents. Seven of those are asleep or sealed. The other 14 are awake, for example the Morning Star Continent at Deity Transformation over the Ancestor Emperor at Body Integration and two Void Refinement regions. Fix: Define `top` as the strongest being awake and present, counting everything below it, and keep sleepers and seals in the note. Then raise each parent to at least its strongest awake child. The 14 awake cases are: cm-suyuan, isles-league, nine-clans, qiandeng, qm-huangji, qm-jianyu, qm-yaoling, sea-jiaoyuan, seal-watch, star-dial, thousand-puppets, tianping, xs-heiyao and xuanji.
- **great-jing**: The Great Jing Dynasty's sphere of influence, 95,000 li, misses 27 Morning Star entries that call themselves imperial, among them the Border Wilds, the March of Pacified Borders, the City of the Guarded Mouth and the southern fleet's ports. The design makes spheres matter: wrecking a place inside one costs standing. Fix: Raise the sphere to about 125,000 li, or decide that a sphere marks the heartland only and say so in the README.

## The Border Wilds first

The first playable slice and the M1 origins read these entries.

- **qm-anbian-fu, qm-bianhuang, qm-lingji-yuan, qm-huangji**: The design has the Gongsun garrison claim every rooted twelve-year-old for its cadet school. The atlas sends the March's rooted children to the Registry, conscripts one child per family at sixteen, and tests children at six across the empire. The region says every family owes a son to the wall. Fix: Decided: keep the design. Give the March a frontier charter: the Registry's frontier office tests at twelve, the age the March can put a child on the wall, and the Gongsuns keep their rooted children for the cadet school. Keep sixteen as the levy for everyone else. Make the region say "a child".
- **qm-anbian-fu, qm-duigu-qiang** (nit): The design table has March cadets patrolling the Wall of Piled Bones, but the Wall (176000,196000) is about 23,000 li from the March's centre (183000,218000) and outside its radius of 6,000. No entry ties the March to the Wall. Fix: Add a line to the Wall (or the March) saying the March garrisons that stretch of the wall, or move the Wall's coordinates to the March.
- **qm-bianhuang, qm-yeqiao-hui, gongqi** (nit): Border Wilds smugglers are said to cross to Shared Roost City 'by night', but the city is about 114,000 li away on the map (mortal travel 60 li/day, Foundation 1,000 li/day), so the trip is months even for flyers. Fix: Say smugglers cross to the island chain by night, and make the trip on to Shared Roost City a long run.
- **qm-hexue-jing, qm-yeqiao-hui** (nit): The Night Bridge Society guards the Realm of Mingled Blood's cave, but the realm (195000,222000) is about 25,000 li from the Society's centre (183000,200000), beyond its sphere of 15,000. Fix: Widen the Society's sphere or move the gate nearer to it.

## Find-and-replace damage

An earlier pass that swapped pinyin for English names left these. Every one reaches the narrator as written.

- **cm-chenyao, cm-chuguang, cm-cunguang, cm-duanying, cm-fanzhao, cm-xiaoya, cm-yanxue, cm-yishou**: "Sun-Reflecting Gate Gate" appears 10 times in 9 entries. Fix: Replace with "Sun-Reflecting Gate".
- **xs-songtao, xs-xunlu**: "The Deer Call River River" and "the River of Passing Water River". Fix: Drop the extra "River".
- **cg-fenglin, cg-genhai, cg-zhanggu, cm-suyuan, xs-liuli, cm-yuxie** (nit): Links echoed by their own name, such as "the [[Court of No Light]], the Court of No Light" and "[[Thousand Puppet Gate]], the Gate of a Thousand Puppets". Fix: Keep the link and drop the echo.
- **cg-qiaoji-ling, cg-zhenling, cm-anxing, cm-baigu, cm-canjun, cm-jiuque, cm-lushi, cm-muyang, cm-qiongque, fy-bingji-ling, fy-youfeng, hs-dinghun-guan, hs-jingping-an, qm-tongbao-hang, xs-ranji**: 15 phrases such as "western the Vast Wilds Continent", "old the Long Dusk Continent" and "three the Society of Corpse Drivers columns". Fix: Reword each, for example "the western Vast Wilds Continent" and "old Long Dusk".
- **cg-woye, cm-luoxia, cm-ruhai, fy-liangtian-guo, fy-shengmo-yuan, hs-jieshou, qm-baicao-guo, sea-jiaogu-yu** (nit): "a" before a vowel: "a Armillary Pavilion", "a Evening Sun", "a Apricot Grove Valley", "a Azure Wave Palace", "a Iron Bone Tribes". Fix: Use "an".
- **qm-jieshou-zhen, qm-zhufu-zong, cm-songhun**: Places pronounced "Jieshou" were renamed "the Precept Watch", which is hs-jieshou, a region on another continent. Boundary Head Town calls itself the Precept Watch, the Vermilion Talisman Sect sells there, and the Soul-Sending River waters its rice terraces. Fix: Boundary Head Town in the first two; the Kingdom of Borrowed Years (cm-jieshou) in cm-songhun.
- **sea-yanbo-guo, sea-chaosheng-ge**: The Kingdom of Hazy Waters is called the Kingdom of Misty Waves, the name of qm-yanbo-guo, because the two share an id stem. Fix: Kingdom of Hazy Waters in both.
- **sea-hanzhu-guo**: The Kingdom of the Pearl Crescent calls itself the Kingdom of the Held Pearl, which is qm-hanzhu-guo. Fix: Kingdom of the Pearl Crescent.
- **sea-zhuguang-cheng**: The City of Pearl Light calls itself the Kingdom of Candlelight, which is hs-zhuguang-guo. Fix: City of Pearl Light.
- **sea-chengu** (nit): The bead-makers are said to be in the Water-Parting Realm (cm-bishui, a secret realm on another continent), not the Market of Water-Parting Beads below it. Fix: Market of Water-Parting Beads.
- **qm-zhiyuan-guo, qm-bingyuan**: The kingdom is named Kingdom of Lingzhi Gardens (hanzi 芝园国), but its own lore and the Sick Gardens' summary call it 'Spirit Plants Gardens' / 'Kingdom of Spirit Plants Gardens'. Fix: Use 'Kingdom of Lingzhi Gardens' in the lore and in qm-bingyuan's summary.

## Names

English names that disagree with each other or with their hanzi, and names that collide.

- **cg-lieyuan, cg-gulei-guo, qm-gulei-guo**: Hunting Park names the Kingdom of the Old Ramparts as a frontier claimant on the Vast Wilds Continent. That is a different Morning Star kingdom far to the north-east. The frontier kingdom is the Kingdom of Bone Ramparts. Fix: In cg-lieyuan, change the link to [[Kingdom of Bone Ramparts]].
- **cm-yusha, cm-guangyan, cm-mingyan, cm-jingtan**: The river's English name is Jade Silt River, but 玉沙 means jade sand, and three other entries call it the Jade Sand River. Fix: Rename the entry to Jade Sand River.
- **cg-shouqiao-men, thousand-puppets** (nit): The same sect is called the Gate of a Thousand Puppets here and the Thousand Puppet Gate elsewhere. Fix: Use Thousand Puppet Gate in the summary.
- **cm-hedeng, qiandeng** (nit): The parent temple is called 'the Temple of a Thousand Lamps' and 'the Thousand Lamps Temple', while the atlas entry is Thousand Lamps Temple. Fix: Use 'Thousand Lamps Temple' everywhere.
- **cg-fuxu, cg-xiangdu, cg-woye, cg-mangjiang** (nit): The river's entry name is Untamed River, but the summaries of Floating Market, Elephant Ford and others call it the Great River. Fix: Use Untamed River everywhere.
- **hs-yuhui, hs-dinghun-guan, hs-wanzhao-cheng** (nit): The region is named The Last Light Shore (残光岸), but two entries call the same coast the 'Afterglow coast', a second English name that is not recorded anywhere. Fix: Use 'the Last Light Shore' in both.
- **xs-baigu** (nit): The English name says 'Sky Burial' but the hanzi 白骨滩 means white bone flats and carries no sky burial. Fix: Rename it 'White Bone Flats' or change the hanzi to 天葬滩.
- **xs-haiyan, xs-xuelang** (nit): The Petrel Kingdom calls the Snow Wolf chief a khan, but all other entries call him a young chief or claimant who is not yet Great Khan. Fix: Say 'the Snow Wolf claimant'.
- **fy-lizhu-feng, fy-yuwen** (nit): The Yuwen peak is named for a Black Dragon's Pearl, but the Yuwen are the torch-dragon bloodline and the pearl was a torch-dragon ancestor's own. The dragon's color is inconsistent. Fix: Rename the peak after the torch dragon (for example Peak of the Torch Dragon's Pearl), or add a line saying the torch dragon was black.
- **qm-xiyang-guo, hs-huyang-guo, qm-zicai-guo, cg-jiaomen-wu** (nit): "King Wen" is the name of two unrelated kings on different continents, and "Tide Mother" is the title of two different rulers. This will confuse the narrator if it is not marked as deliberate. Fix: Rename one King Wen (for example King Yan in the Desert Poplars), and add an "of the Shark-Gate Hold" style tag or rename one of the Tide Mothers.
- **cm-douku** (nit): The pinyin for 斗傀台 is wrong. 傀 is kui, as in Qiankui Men for the Thousand Puppet Gate. Fix: Change to 'Doukui Tai'.
- **cg-gulei-guo, qm-gulei-guo, cm-yusha, fy-yusha-he, qm-haiyan-guo, xs-haiyan** (nit): Three pairs share a pinyin with different hanzi: Gulei Guo, Yusha He and Haiyan Guo. Two of them caused the swaps above, and the two Yusha rivers are both named for jade sand. Fix: Rename one of each pair in English, for example Jade Grit River for fy-yusha-he.
- **sea-bianhuang, qm-bianhuang**: The Borderwild Isles share the Border Wilds' hanzi but lie 160,000 li away, off the Vast Wilds. Players and the narrator will confuse them with the first slice. Fix: Rename the isles, for example the Raider Isles.
- **great-jing** (nit): The pinyin "Dajing" covers only half of 大靖皇朝. Fix: Dajing Huangchao.
- **qm-tongbao-hang** (nit): "Tongbao Trading House" leaves a place name in pinyin. Fix: Translate it, for example the Coin-Through Trading House.

## Realms and tops

Besides the `top` rule under Decisions.

- **beast-court, cg-jinpan-ku, cg-jiaqiu, cg-fenglin**: The Beast Court's top note puts four beast kings at Deity Transformation. Its own lore says the Ape King and the Roc reached it and the Python and the Tortoise are close behind, and their lairs give both at Nascent Soul. The Court Forest's note reads as if the Ape King and Roc were Body Integration. Fix: Note: "two beast kings at Deity Transformation". Reword cg-fenglin's note as the readers suggest.
- **sea-tigen, seal-watch, suihai**: The Seal Watch's Warden is Deity Transformation in the Sea of the Ladder's Root but Void Refinement in the Seal Watch's own entry. Fix: Pick one realm for the Warden and make sea-tigen and seal-watch (and suihai's Seal Watch note) agree.
- **fy-leiyuan, fy-kuimian-ling**: The Thunder Plateau's top says the sleeping beast is rumored to be Deity Transformation, but the Ridge of the Sleeping Kui gives the same sleeper as Body Integration, both in its top and in its truth. Fix: Make the Thunder Plateau top note say Body Integration (a beast asleep), or mark it as a plain wrong rumor in lore.
- **sea-tingyuan-shuyuan, sea-guishu-yuan**: The academy's master is a turtle sage in human form, which spirit beasts only reach at Nascent Soul, yet the entry's top is Core Formation. Fix: Make top Nascent Soul (the master), or say the master hides his realm.
- **fy-fanzhuan-jing, fy-kexing-jing**: Two secret realms admit only those below Core Formation, yet their top is Core Formation. Every other realm uses its entry cap as top (the Ice Tower Gate is Foundation Establishment for Foundation and below). Fix: Set both tops to Foundation Establishment (gate cap), as the Ice Tower Gate does.
- **fy-xuewu-gu** (nit): Blood Mist Valley has an empty top, but its truth names a living Nascent Soul elder inside it. Fix: Set top to Nascent Soul (the blood-array elder).

## Prices

Checked against the design's yardstick as revised today: mortal labour is paid in silver, a Qi Condensation cultivator's day of work is 1 low-grade stone, and income runs a few low a day at Qi Condensation, a few tens at Foundation and a few hundred at Core Formation.

- **fy-bilei-lin**: A Nascent Soul tribulation among the rods costs a hundred high-grade stones, 100,000 mid, far above Nascent Soul goods at 10 to 1,000 mid. The entry also gives Foundation a tribulation, which the design reserves for Nascent Soul and up. Fix: Drop the Foundation tribulation and price a Nascent Soul slot at a few hundred mid.
- **fy-yuxue-ling**: The cheapest crane egg costs a high-grade stone, a million low. A cloud-crane egg elsewhere sells for one mid. Fix: A few mid.
- **cg-liuyan-jing**: A pass into a realm for Core Formation and below costs a high-grade stone, about three years of a Core Formation income. Fix: A few mid.
- **cm-youquan** (nit): A month beside a high-grade yin vein costs a high-grade stone, the very top of the Nascent Soul range. Fix: A few hundred mid, unless the spring is meant for Deity Transformation cultivators.
- **sea-huanfang-gang**: Laborers earn a low-grade stone a day, "more than most kingdoms pay a Foundation guard". A Foundation cultivator earns tens a day, and a mortal laborer about a tenth of a tael. Fix: Make them Qi Condensation laborers, paid a low-grade stone a day plus board, double a kingdom's rate.
- **qm-caokou, qm-jingzhao-fu**: A forged test slip costs three mid-grade stones (3,000 low, about 300,000 taels), against a family bounty of ten low in the Capital Prefecture and a yardstick of 1-10 low for Qi Condensation-level goods. Mortal buyers could not pay it. Fix: Price the slips at a few low-grade stones (for example 'three low-grade stones apiece').
- **xs-jinhuo**: An entry token to a realm only Foundation and below can enter sells for a High-grade stone, which is a million low stones, a Void Refinement-scale price against a Foundation income of tens of low a day. Fix: Change to a Mid spirit stone, or a few hundred low stones.
- **xs-chaoxi**: Passage into a realm that only Qi Condensation cultivators can enter costs a Mid spirit stone (1,000 low), far above Qi Condensation goods at 1-10 low and a Qi Condensation income of a few low a day. Fix: Change to some low spirit stones (for example 10-50 Low).
- **xs-ninghui** (nit): A stele seat for a week costs a Mid stone (1,000 low), well above Foundation-level income of tens of low a day, for seats whose payoff is a Foundation technique. Fix: Make it some tens of low stones a week.
- **xs-yaling** (nit): A frost roc egg from a Core Formation-level ledge sells for a High stone (1,000 mid), the top of the Nascent Soul price range, against the 1-10 mid Core Formation yardstick. Fix: Change to a few Mid spirit stones.
- **sea-muhe-jie** (nit): A tamed adult crane from a herd led by Core Formation beasts sells for 100 Mid-grade stones, Nascent Soul goods pricing (10-1,000 mid) against Core Formation goods at 1-10 mid. Fix: Lower the adult price to about 5-10 Mid-grade stones.
- **qm-panyun-tian**: Cloud-Silk spirit rice at one mid-grade stone a catty (1,000 low) is priced like Foundation-grade goods or above, per catty of food, against the yardstick of 1-10 low for Qi Condensation goods like herbs. Fix: Change to 'a low-grade stone a catty' (or a few low-grade stones).
- **cm-chuguang, fy-bilei-lin, fy-qiexue-men, fy-tanxu-hui, fy-yuxue-ling, sea-bingti, sea-canyu-jiao, sea-danlu-gu, sea-fuling-lian, sea-huanfang-gang, sea-kunzhong-dao, sea-leigu-dao, sea-muhe-jie** (nit): About a dozen entries capitalise grades ("Low-grade", "Mid spirit stone") where the design writes "low-grade". Fix: Lower-case them.

## Scale, travel and range

Abilities and journeys out of line with the design's scale table.

- **cg-leisun-zu**: A Core Formation clan is said to cross the continent (about 300,000 li wide) in nine days, roughly 33,000 li a day. The scale gives Core Formation 2,000 li a day and Nascent Soul 8,000. Fix: Say the falcons cross it in a month or more, or in a few weeks for the chief.
- **cg-jiangtun-zu, cg-xiangdu, cg-jiaqiu**: The Core Formation porpoise clan runs from the delta (Shell Mound, y 244000) to the falls (y 289000, about 51,000 li) in two days, about 25,000 li a day. That is far above the Core Formation (2,000) and Nascent Soul (8,000) travel rates. Fix: Change to about three weeks, or have the messages carried by relay.
- **qm-mingchong-zhai** (nit): The Stockade's top is Core Formation (senses about 10 km, or 20 li), yet its curses kill from a hundred li, which is a Nascent Soul-scale range. Fix: Reduce the range to about twenty li, or say the curse needs a hair or name token.
- **hs-benlei-bu, hs-hanxue-qun** (nit): Horses with only a trace of spirit blood are said to run a thousand li a day, which is Foundation-cultivator flight speed, against Qi Condensation's 150 li and a mortal horse's 60 to 100. That erases the gap to the wild blood-sweat herd, which is said to outpace Foundation flight. Fix: Cut the Running Thunder horses to about 300 li a day.

## Geography

Directions and distances in the text that the coordinates contradict.

- **suihai, cg-hunshui-wan, cg-woye, cg-yangti-guo**: The Shattered Sea's circle has a radius of 140,000 li, but the continents' inner coasts lie 166,000 to 204,000 li from the Stump, so a ring of water belongs to no sea entry. Three Vast Wilds entries put the Shattered Sea at their shore. Fix: Raise suihai's r to about 165,000 li, the nearest inner coast.
- **qm-caokou, great-jing, jingdu**: Grain-Barge Mouth is called a day west of the capital by barge, but the map puts it about 24,000 li (12,000 km) west of the Jing Capital, which is months by barge or by foot. Fix: Change to a distance that fits the map (for example 'weeks west of the capital by barge') or move Grain-Barge Mouth much closer to the capital.
- **qm-kuhuang-yuan, qm-hongjiang, qm-mailang-guo**: The Withered Plain is said to lie east of the Flood River, but its centre (296000, 200000, r 9000) is west of the river, whose path runs (322000,162000) to (292000,290000) and is near x 313000 at y 200000. Fix: Say 'west of the Flood River', or move the Plain's coordinates east of the river line.
- **qm-shengdou-cheng, qm-hongjiang** (nit): The City of Pecks and Bushels is said to sit on the Flood River, but its coordinates (281000,214000) are about 29,000 li west of the river's line, which is near x 310000 at y 214000. Fix: Move the city onto the river line or redraw the river path through it.
- **hs-yunzhou-mu, hs-chuanzhong, hs-jinggu-gang, hs-tuichao-dong**: The Tomb of the Cloud Ship is said to lie two hundred li inland, but at x=-340000 it is about 20,000 to 25,000 li east of the coast entries (Whalebone Harbor and the Cave of the Ebb Tide at x=-364000, the Ambergris Strand at -360000). Fix: Move the ship to about x=-364000 or change the distance to match.
- **hs-liuli-yuan, hs-baqu**: The Glass Plain is said to extend a day's ride beyond the crater rim and to be crossed in a night, but its map radius is 7,000 li, which is weeks of travel even at Foundation speed. Fix: Shrink the plain's radius to a few hundred li or change the text to 'a month's ride'.
- **xs-yaling, xs-xiangtai, xs-panya**: Tusk Ridge is said to wall the tableland on its north and east, but its path runs from (78000,-346000) to (122000,-280000), which lies on the west and south-west side of the tableland centred at (122000,-300000); the ramps are also placed on the south-western cliffs. Fix: Say the ridge walls the tableland on its west and south-west, or move the ridge path east of x=122000.
- **cg-zoulin, cg-yudao**: The walking mangroves are said to have come from the Evergreen Deep three thousand years ago at a few li a year, which is about 10,000 li at most. The Evergreen Deep is about 80,000 li from the grove on the map. Fix: Raise the rate to tens of li a year, or say the walk began at the marsh's southern edge.
- **cm-xiaoya, cm-yishou, cm-chenyao** (nit): The Kingdom of Added Years is called 'next door' to and 'beside' the rebel kingdom, but their centres are about 40,000 li apart (x -251783 vs -212096) and their radii are 5,500-6,500. Fix: Say 'on the same coast' or move the kingdoms closer.
- **xs-tunyun, xs-ranji** (nit): Cloud-Swallowing Fjord (at -112000,-296000) is said to have its head where the Burning Spine meets the sea, but the Spine's western end is at (-122000,-336000), about 40,000 li north, and the fjord is only 2,000 li long. Fix: Say the fjord's head is fed by hot springs, or move the fjord marker to the Spine's west end.
- **xs-huotang, xs-rongdong** (nit): The Hearth Clan (x=-35000) is placed at the eastern end of the Burning Spine, but the Spine's eastern end is at about x=4000, where it runs under the glacier at the Melt Caves. Fix: Say the clan lives in the eastern half of the Spine, or move its marker east.
- **cm-huilin, cm-tishou** (nit): The Grey Forest is said to lie northwest of the Ladder's head, but its centre (-341404,138735) is almost due north of the head (-338018,195803). Fix: Say 'north of the Ladder's head'.
- **cg-benlei-he** (nit): The text gives the river's length as less than forty thousand li, but its two path ends are about 42,500 li apart in a straight line. Fix: Say about forty-five thousand li.
- **sea-jieyun-zhen, sea-xuanyu, sea-xisuo-men** (nit): The town sits on the 'lowest shard' at two thousand feet, but the region says its low shards hang a few hundred feet up; and it drifts while the Tethering Gate has chained the lower shards to the sea floor. Fix: Say 'a low shard' at a few hundred feet, or drop the drift.
- **qm-shuguang-guo, qm-taoshi-guo** (nit): Dawnlight is called the easternmost kingdom, but the Kingdom of Surf Rocks is further east (x 360000 against 356000). Fix: Say 'a far eastern kingdom' or 'the easternmost of the old eastern kingdoms'.
- **sea-suhai-bao, sea-guanchuan-zhong** (nit): The fort is on the 'northernmost reef' of the Black Rock Isles, but the Graveyard of the Tax Barges reef (y 308000) lies north of the fort (y 310000). Fix: Say 'on a northern reef'.
- **20 kingdoms** (nit): 20 kingdoms' discs cross into a neighbouring region's cell, for example cg-banlan-ling and qm-changning-guo. Their outlines will straddle two regions on the map. Fix: Nudge them inward or shrink their radius; the list is in the audit scripts.

## Dates

Against the era canon.

- **hs-chama-shi, hs-fengma, hs-benlei-bu**: The Tea-Horse Market says this autumn's fair is the first under the khan's rule, but the khan has already ruled the Running Thunder Horde long enough to unite three other tribes over four years, so several autumn fairs have passed under him. Fix: Change the market line to something like 'the first fair since he united the tribes' or 'the first where he sets the taxes'.
- **xs-guya** (nit): The tusks are of mammoths dead a hundred thousand years, which is before the Age of the Ascent (98,000 to 66,000 years ago), yet the lore calls them Ascent Age mammoth kings. Fix: Change the summary to 'dead seventy thousand years' or drop the Ascent Age label.
- **sea-baichuan-zhong** (nit): The oldest hulls are said to be Rekindling warships (sunk before 3,297 years ago), yet the hull at the very bottom was sunk in the Outer Demon War, which is later. Fix: Make the bottom hull a Rekindling wreck, or put the Seal Watch ship in the middle layers.

## Contradictions between entries

Both sides stated as plain fact, or truth against truth.

- **great-jing, qm-huangji, qm-jinqiang-wei**: The Ancestor Emperor is stated to have been unseen and in the palace for three centuries, yet the Golden Spear Guard's commander last saw him forty years ago. Fix: Change the commander line to 'whom she has never seen' or 'in three centuries', keeping the forty years only for the sealed orders.
- **event-demon-war, seal-watch, sea-quming-bei**: The Seal Watch is said to have been founded at the Second Sealing, which ended the war, yet the war entry's truth has the Seal Watch already holding the Scar during the war. The founding stele also dates from the Second Sealing. Fix: In the war truth, change "the Seal Watch" to "the Scar's defenders" (or "the garrison that became the Seal Watch").
- **xs-linxu, demon-glacier**: Two entries give different routes by which the Frozen Host entered the world: the Ice Stair (far north, y -453000) versus the Cliff Over the Ruin (y -370000). Fix: In xs-linxu truth say outer demons still climb the Rim near here and the beacon flickers when they do, and that the Frozen Host came up the Ice Stair; drop the claim that the Host came up this cliff.
- **cg-jiulu-shan, cg-liuyan-jing**: The Ninth Furnace crater is the hottest fire, used for melting spirit iron, and erupts in turn with the others. The realm entry calls the same crater dormant and cold. Fix: In cg-liuyan-jing, make the gate sit in a different crater, or make the Ninth the dormant one in cg-jiulu-shan.
- **xs-heiyao, xs-huotang, xs-yinhuo**: The Obsidian Ranges entry says the Palace holds every vent, but the Hearth Clan and Yin Fire Sect entries say the Hearth Clan owns the best and deepest vents and refuses the Palace's lease. Fix: In xs-heiyao say the Palace holds every pass and most vents, except those of the Hearth Clan.
- **hs-chuilian-pu, hs-juebi**: Hanging Curtain Falls is said to pour off the Roof in a fall 3,000 zhang high, but the Sheer Wall that the Roof drops over is only 2,000 zhang high, so the fall is higher than the cliff. Fix: Make the falls two thousand zhang high, or the Wall three thousand.
- **hs-kuchuan, hs-yanzhen-ge**: Two truths give different shares of Grand Auction relics made in the Withered Rivers. Kuchuan says half pass through and a third of those were made there, which is about one sixth of the total. Yanzhen-ge says a third of all of them were made there. Fix: Make Kuchuan read 'and a third of all of them were made here', or change Yanzhen-ge to one sixth.
- **fy-guiying, fy-xianze-guo, fy-mingji-guo**: The Shadow of the Dial says the Pavilion's Prefects appoint the kings, but the Kingdom of the Brine Marsh is called a free kingdom with its own royal house. The Kingdom of Fate Registers is governed by a council of temple elders under the Wenren. Fix: Change the region lore to say the Prefects appoint or oversee the kings of the Dial's nearest kingdoms, or drop 'appoint the kings'.
- **hs-baizhou-guo, hs-fengma, hs-huangmai-guo**: The White Delta is called the only rain-fed farmland on the continent, but its own lore has river silt flooding the fields, and Wind Horse says the only reliable rain falls on the steppe, where the Kingdom of Yellow Wheat farms. Fix: Change the summary to 'the only river-flooded farmland that never needs the water court'.
- **hs-gangfeng, hs-moding-feng, hengsha**: The Hard Wind and Crown-Touching Peak are called the highest ground and the highest mountain in the world, but the continent entry says only the floating peaks stand higher than the Roof. Fix: Say 'the highest ground anyone lives on' and 'the highest mountain that touches the ground'.
- **sea-duhun-jin, sea-tishen-hui, sea-wanghun** (nit): Soul-Ferry Landing says ghosts cannot touch salt water, yet the Sea of Lost Souls is full of drowned ghosts, water ghosts and a ghost fleet that live on the sea. Fix: Say ghost clerks cannot haul nets (living hands are needed) instead of 'cannot touch salt water'.
- **cg-yinhe-dong, cg-fuliu-he**: The cave domain is said to be hollow for only a thousand li, but the river that surfaces from it is said to run underground for twenty thousand li. Fix: Make both figures the same, e.g. twenty thousand li in cg-yinhe-dong.
- **cg-suoxue-bang**: A blood-lock leaves its wearer as weak as a mortal. The boss Aunt Lan is given as a Core Formation woman and also wears her own lock. Fix: Say her lock is a special partial seal that hides her beast blood but not her cultivation, or give her a mortal-weak public realm.
- **cm-chuguang, cm-baizhou**: First Light Cliff is called the only place the dawn lotus grows, but the Realm of Broad Daylight is said to export dawn lotus seeds. Fix: Drop 'only place' from the First Light Cliff summary, or change the realm's export to another sun herb.
- **cg-xinmai-quan, cg-woye, cg-fenglin** (nit): The spring entry says all four kings bathe before every council. The Old Tortoise is said not to have attended court in sixty years and sends only a carved shell. Fix: Say the kings who attend bathe here, or name the Ape King and the Roc.
- **cm-jiuque** (nit): The fief's lord is a king in lore, but the truth refers to him as the Marquis. Fix: Say 'The old king remembers' in the truth, or give the lord a Court rank of Marquis in the lore.
- **cm-tishou, no-light** (nit): The envoy at Body Integration is called the strongest on the continent after the Pale Sovereign, but the Court's Chief Judge is also Body Integration, and the Court also has two Void Refinement judges. Fix: Say 'among the strongest' or 'equal to the Chief Judge'.
- **cm-xianwang** (nit): Nine royal ghosts sit beside the living king, but the kingdom is said to have had only nine reigns, which would make the living king the tenth. Fix: Say eight royal ghosts, or ten reigns.
- **cm-chideng, cm-lanjie, cm-qianjie** (nit): Two different powers are said to control which crews may enter the Ladder's lower halls. The Lamp-Bearers' Society decides, while the Barred Stair Marquis licenses every sanctioned breach. Fix: Make the Society assign crews and sell maps and rescues, with the Marquis holding the legal licence.
- **cm-suyuan, cm-jiuque, cm-shoudeng** (nit): The Pale Plain is said to grow nothing but ash-grass and orchids, yet living serfs farm fields in the Prefecture of the Old Towers and a living kingdom of lamplighters lives on the plain. Fix: Say 'Nothing grows here outside light arrays but ash-grass and ghost-lamp orchids'.
- **hs-baqu** (nit): The Eight Roads names eight roads, but the list gives only seven: the Roof, two coasts, salt flats, steppe, Buried Cities and Dusk Shore. 'Dusk Shore' is also not a name used elsewhere for the Last Light Shore. Fix: Add the missing road, for example the Withered Rivers, or say 'seven roads'.
- **xs-changdeng, xs-jijing** (nit): The single escaped outer demon is said to feed in two places: the Silent Plain and, wearing the lord's body, the Keep of the Long Lamp, 19,000 li apart, with no link between the two. Fix: Say the Silent Plain is where the demon first fed, or that it feeds on the plain and the lamp is its lure.
- **xs-qianzhang, xs-zushan** (nit): The Court of a Thousand Tents holds stone-lifting every summer, but stone-lifting at Ancestor Mountain happens only at the gathering every third midsummer. Fix: Say the camp swells each summer for trade and hosts the stone-lifting every third summer.

## README and schema

For the claude.ai export, so P0.2 can trust the README.

- **README**: `map.inner` is documented as `true`, but its only user, the Rim, holds a number, the ring's inner radius. Fix: Document it as the inner radius of a ring.
- **README** (nit): Not documented: `years.from` can be null (the Unrecorded), `terrain` appears on seas and forbidden lands, `sphere` is a radius in li, the geometry tool skips The Scar, and the tool does not clip region cells to the coast although the README says the cells are clipped. Fix: Add a line for each.
- **the eight sea entries** (nit): Only the Shattered Sea has a radius, so the straits, the Jade Strait among them, get no shape on the map. Five straits sit under the Shoreless Sea while the Jade Strait sits under the world. Fix: Give the straits a radius or a path, and one parent.

## Hygiene

Cheap to fix in one pass.

- **tags** (nit): 993 distinct tags, 620 used once, with 47 case or plural pairs such as "Fire Dao" and "fire dao". Fix: Lower-case and singularise before any code reads tags.
- **79 entries** (nit): 79 entries have no usable realm: 23 lack `top`, 41 leave it empty and 15 say unknown, mostly landmarks and forbidden lands. Fix: Fill them in the canon pass.
- **cg-houmen-zhen, cg-muyin, cg-wengtian-jie, cg-xinmai-quan, hs-shihou-yuan, qm-shanlu-bang** (nit): Six summaries run to three sentences; the README asks for one or two. Fix: Trim them.

