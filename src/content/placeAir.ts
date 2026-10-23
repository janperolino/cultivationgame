// A place's air and crowd (design.md, Entering a place: A place's air and crowd): every Border
// Wilds place you can walk into carries `air`, two or three sentences at street level for GLM's
// scene context (what you see, hear and smell, who defers to whom, what gets you killed), and
// `crowd`, three to five weighted tags saying who fills its streets. A door can carry its own line
// where it matters. Flavor for the narrator, not rules: the engine reads none of it.
// Skipped, because they have no streets: Field of the Broken Tide, Black Jade Vein, Realm of
// Mingled Blood, Starfall Remnant, Ruins of the Starfall Sect, Red Marrow Cave, Low-Tide Tower.
// Drafted in P3.9b for Jan's review (docs/review-queue.md).
import type { CrowdTag } from './crowd.ts';

export interface PlaceAir {
  /** Two or three sentences at street level, for GLM's scene context. */
  air: string;
  /** Three to five weighted tags: who fills its streets. */
  crowd: Partial<Record<CrowdTag, number>>;
  /** A door's own line where it matters, by door kind id. */
  doors?: Partial<Record<string, string>>;
}

/** The air and crowd of each place, by place id. */
export const PLACE_AIR: Readonly<Record<string, PlaceAir>> = {
  'qm-shoukou-cheng': {
    air:
      'Walls rise out of the surf as tall as sea cliffs, faced with beast-king skulls, and the ' +
      'harbour ward array hums overhead. The streets smell of salt, brined hides and cores bagged ' +
      'by grade; soldiers step aside for any officer, and everyone steps aside for a cultivator ' +
      'in the garrison’s grey. Drawing a blade inside the walls brings the watch down on you.',
    crowd: { soldiers: 3, merchants: 3, rogues: 2, 'beast-hunters': 2, officials: 1 },
  },
  'pacified-fort': {
    air:
      'The drill horn sounds at 辰 and the cadets run the lanes under walls as tall as cliffs, ' +
      'sabers still sheathed, while sutlers sell on what the stores issued. Every civilian steps ' +
      'off the road for a marching column, and the watch checks every token at the gate. Walk near ' +
      'the armouries at night without leave and no one will ask twice who you are.',
    crowd: { soldiers: 3, conscripts: 3, officials: 2, merchants: 1, crafters: 1 },
  },
  'spear-plow': {
    air:
      'Farmers plow with a spear laid across the harness, and the beast-pit by the road is fenced ' +
      'with the horns of whatever fell into it last. The county store weighs grain for the patrols ' +
      'before anyone else, and the county elder is obeyed over any passing sergeant. Work the ' +
      'outer fields at dusk unarmed and the valley beasts will not care that you were warned.',
    crowd: { farmers: 3, conscripts: 2, soldiers: 1, hunters: 1 },
  },
  'ninth-beacon': {
    air:
      'The spirit-fire pillar on the peak throws light on the road at midnight, and the border ' +
      'post at its foot counts every cart and cultivator heading for Stone Eyes. The beacon keepers ' +
      'answer to the March alone and the villagers answer to the keepers. Light the fire out of ' +
      'turn and every garrison within a thousand li wakes.',
    crowd: { soldiers: 3, officials: 2, farmers: 2, caravaneers: 1 },
  },
  'grain-ford': {
    air:
      'Granary tiers climb the ford’s bank under a faint gold net of warding talismans, and the ' +
      'tally clerks’ abacus never stops. Grain is counted, taxed and stolen in that order, so the ' +
      'clerks bow to the intendant’s men and the carters bow to the clerks. A carried flame near ' +
      'the granaries is the quickest way to hang.',
    crowd: { officials: 3, farmers: 2, merchants: 2, soldiers: 1, smugglers: 1 },
  },
  'qm-hewan-cheng': {
    air:
      'Markets run fifty li along the bend and the wharves load barges for the capital day and ' +
      'night: iron ingots, wool bales and sixteen-year-olds in lines. The Gongsun intendant’s ' +
      'clerks stamp every manifest, and the Qian clan’s agents are the polite ones in good silk. ' +
      'Slip out of a muster line and the levy sergeants find you before the barge casts off.',
    crowd: { merchants: 3, conscripts: 3, officials: 2, caravaneers: 2, soldiers: 1 },
  },
  'sinkhole-terraces': {
    air:
      'Terraces drop down the sinkhole walls to farms that never see noon, with cloud pooling in ' +
      'the hole at dawn and damp stone under every stair. The cave clans keep to their own ' +
      'stretches of wall, and on the rim the Registry’s testing stone draws a queue of children ' +
      'and frightened parents. The stairs have no rails, and a stranger asking what is kept below ' +
      'the bottom terrace is not seen climbing back up.',
    crowd: { farmers: 3, merchants: 2, officials: 1, pilgrims: 1, rogues: 1 },
  },
  'bat-roost': {
    air:
      'Guano diggers hang on ropes down a cave mouth a li high, and at dusk the swarms pour out ' +
      'overhead like smoke while everyone below pulls a cloth over their face. The smell is a wall ' +
      'you stop noticing on the third day. The rope-master’s word is law on the cliff, and a cut ' +
      'rope is the whole of the village’s justice.',
    crowd: { farmers: 3, hunters: 1, smugglers: 1, caravaneers: 1 },
  },
  'lower-caves': {
    air:
      'Cool dark passages lit only by the guides’ own lamps, children who know every turn and ' +
      'elders who will not say them. The cave clans lead the Night Bridge’s runners through at ' +
      'night and take payment in stones or silence. A stranger who follows a runner uninvited ' +
      'into the caves is not found again.',
    crowd: { smugglers: 3, hunters: 2, servants: 1, rogues: 1 },
  },
  'qm-tianyan': {
    air:
      'Five million live on terraces down a sinkhole sixty li across, and the council hall hangs ' +
      'in the north cliff, reached only by the clans’ own stairs. Everyone defers to the clan ' +
      'whose stretch of wall they stand on, and the council’s one law is that nobody asks what ' +
      'is kept below the bottom terrace. Two li of stairs drain a climber’s qi, so the unwary ' +
      'arrive winded and robbed.',
    crowd: { merchants: 2, farmers: 2, officials: 2, crafters: 1, rogues: 1 },
  },
  'qm-hu-shi': {
    air:
      'Caves held by a clan of forty thousand, handsome and quick, who marry inside the clan and ' +
      'bury their dead where no outsider walks. Children guide travelers through the lower ' +
      'passages, and the matriarch’s kin are deferred to at every fork. No mirror array hangs ' +
      'where a Hu face is, and a stranger who lingers by one is moved along.',
    crowd: { servants: 2, hunters: 2, smugglers: 2, merchants: 1 },
  },
  'corral-town': {
    air:
      'Array-fenced corrals ring the town and the auction ring is loud with brokers selling ' +
      'thunder-horned deer and scale-horses by the hundred head, dung and hot hide in every ' +
      'breath. The herder families’ riders yield to no one on foot, and the empire’s remount ' +
      'buyers in their standing hall defer to the herd masters. Slip into a corral at night and ' +
      'the mounts kill you before the fence array does.',
    crowd: { herders: 3, merchants: 3, caravaneers: 2, soldiers: 1, officials: 1 },
  },
  'hatchling-barns': {
    air:
      'Long barns sunk into the valley under an amber warmth array, crates arriving after dark ' +
      'and never opened in the lane. Chirping and scratching leak from the straw, and the ' +
      'barn-keepers answer only to the Night Bridge crews who unload them. Asking what hatches ' +
      'gets you a pleasant answer and a different road home.',
    crowd: { smugglers: 3, herders: 2, farmers: 1, rogues: 1 },
  },
  'thunderhorn-camp': {
    air:
      'Yurts stand on open grass to the horizon, with a herd of a hundred thousand thunder-horned ' +
      'deer beyond them and sparks off their horns on stormy nights. Young riders are broken to ' +
      'the saddle here as much as the deer are, and the camp elder rules by who has ridden ' +
      'longest. A herd spooked in a storm kills anyone on foot.',
    crowd: { herders: 3, hunters: 1, caravaneers: 1, servants: 1 },
  },
  'qm-qianlan-cheng': {
    air:
      'Three million live inside a ring of array-fenced paddocks sixty li across, and the king ' +
      'holds court on horseback, riding between the stud paddocks by season. Every herder family ' +
      'keeps a hall here, the Hundred Reins Sect’s tamers bond the royal stud, and everyone ' +
      'yields the road to a mounted rider. The Beast Court has twice sent killers into the palace ' +
      'paddocks, so strangers near the stud are searched.',
    crowd: { herders: 3, merchants: 2, soldiers: 2, officials: 2, disciples: 1 },
  },
  'qm-baijiang-zong': {
    air:
      'Disciples walk their bonded beasts through the courtyards, a storm-hawk on the Sect ' +
      'Master’s perch and thunder-hounds at the gate, and the hatchery smells of warm straw and ' +
      'raw meat. Outer disciples step aside for an inner disciple’s sleeve badge, and everyone ' +
      'steps aside for a bonded pair at full gallop. A butcher found here is dead before the ' +
      'Beast-Butcher Gate hears of it.',
    crowd: { disciples: 3, herders: 2, servants: 2, 'beast-hunters': 1 },
  },
  'qm-tushou-men': {
    air:
      'Three peaks sheared flat by one cut, drill yards echoing with saber strokes and beast hides ' +
      'drying on every rail. Rank is cores taken, so a disciple with a belt of fresh cores is ' +
      'yielded to even by an elder’s servants. A tamer’s beast is killed on sight at the gate, ' +
      'and a half-blood caught beside it is killed with it.',
    crowd: { disciples: 3, 'beast-hunters': 3, servants: 1, merchants: 1, soldiers: 1 },
    doors: {
      gate:
        'The gate disciples read your belt of cores before your face, and a tamer’s beast is ' +
        'killed where it stands.',
    },
  },
  'foot-of-the-wall': {
    air:
      'The Wall’s bone-faced flank runs out of sight in both directions and the carters’ kilns ' +
      'smoke under it, while women ladle rice for patrols coming off the Wall. Bone heaps wait for ' +
      'the builders, and stealing a rib from one is a hanging offense. The patrol sergeant eats ' +
      'first, the carters second, and a stranger asking about the heaps last.',
    crowd: { soldiers: 3, crafters: 2, servants: 2, farmers: 1, 'beast-hunters': 1 },
  },
  'qm-duigu-qiang': {
    air:
      'The Wall runs 9,000 li of rammed earth and beast-king bone, its skull sockets the size of ' +
      'gates and a binding array glowing as a thread along the top. The garrison’s notice board ' +
      'by the sutler stands thick with cadet work. Cadets obey their sergeants and everyone obeys ' +
      'the array keepers; in the seventh month the bones howl and nobody walks the top at night.',
    crowd: { soldiers: 3, conscripts: 2, 'beast-hunters': 2, disciples: 1, crafters: 1 },
  },
  'qm-fugu-ge': {
    air:
      'The hall sits in the eye socket of the greatest skull on the Wall, array plates stacked ' +
      'outside for the relay walkers to carry along the top. Disciples bow only to the Pavilion ' +
      'Master’s seal and speak of little but the arrays. Cracking a binding plate is treated as ' +
      'murder, and in Ghost Month the arrays are let down on purpose and the monks and walkers ' +
      'go out together to quiet what rises.',
    crowd: { disciples: 3, crafters: 2, servants: 1, soldiers: 1 },
  },
  'qm-jingzhong-si': {
    air:
      'Monks in grey bury the raids’ dead, mortal and beast alike, in rows that fill the ' +
      'Bonefields, and incense drifts from a bell tower cut from a single bone. The bell is ' +
      'struck once at the start of Ghost Month and never otherwise, so the courtyard is silent. ' +
      'The abbot asks no fee from anyone, and anyone who robs a grave is left to the Wall.',
    crowd: { pilgrims: 3, beggars: 2, disciples: 2, soldiers: 1 },
    doors: {
      temple: 'Incense and the dead’s names on strips of cloth, and the bell above stays still.',
    },
  },
  'qm-shoudeng-zong': {
    air:
      'Ten thousand lamps on poles cross the water, burning yin fire the drowned follow in ' +
      'circles, and keepers in dark robes trim wicks from flat boats. Every keeper defers to the ' +
      'Lamp Mother, and every lamp is counted. A lamp put out, even by accident, is how the dead ' +
      'walk to the City of the Guarded Mouth.',
    crowd: { disciples: 3, servants: 2, merchants: 1, pilgrims: 1 },
  },
  'qm-yeqiao-hui': {
    air:
      'A low-tide crossing of reefs and rope bridges, crews gathering by the tide-table, runners ' +
      'with beast-sharp eyes and long grudges, and eggs wrapped in wet cloth. Each crew knows only ' +
      'its own stretch, and a runner never speaks of the next. Cheat a crew and the next tide ' +
      'takes you; passage costs five low-grade stones or a favor.',
    crowd: { smugglers: 3, rogues: 2, merchants: 1, beggars: 1, caravaneers: 1 },
    doors: {
      market:
        'The Night Bridge’s black market: lanterns hooded, faces covered, and no one asks ' +
        'what the cargo was.',
    },
  },
  'qm-tuichao-gang': {
    air:
      'The harbour drains to mud twice a day and the ships sit tilted on it, behind breakwaters ' +
      'of lifted reef bound by a dead sect’s array. Dockhands haul salt, hides and the March’s ' +
      'grain down the east quay, whose warehouses are the Night Bridge’s under other names. The ' +
      'City’s inspectors are paid to count only what they see, and a stranger who counts more ' +
      'does not stay.',
    crowd: { merchants: 3, caravaneers: 2, smugglers: 2, officials: 1, crafters: 1 },
    doors: {
      market:
        'The east quay’s warehouses, where honest cargo goes out on the tide and the rest goes ' +
        'out on the Night Bridge.',
    },
  },
  'qm-wuming-ji': {
    air:
      'No walls, no tax and no name: mats of cores, herbs and maps of ruins, and the belongings ' +
      'of people who did not come back, sold by rogue cultivators sitting on their wares. Nobody ' +
      'asks whose a thing was. Blood spilled in the valley is paid for, and Uncle Ash, a Core ' +
      'Formation rogue, collects.',
    crowd: { rogues: 3, merchants: 2, smugglers: 2, beggars: 1 },
  },
  'qm-qian-shi': {
    air:
      'A core exchange with a scale on every table and agents in good silk who bow to everyone ' +
      'and owe nobody. Cores are graded under a lamp and the best go on to Apricot Grove ' +
      'Valley’s hall. A cultivator short of stones is offered a future to sell, and the clan ' +
      'keeps its debts as carefully as its books.',
    crowd: { merchants: 3, officials: 2, servants: 2, 'beast-hunters': 1 },
  },
  'qm-xinglin-bianguan': {
    air:
      'A pill shop, a clinic and a buying office under one green roof, with medicinal steam in ' +
      'the lane and physicians who treat garrison soldiers free once a year. The hall master, ' +
      'posted from the Valley, defers to the Valley and to nobody here. Prices are posted high ' +
      'and no one has haggled one down.',
    crowd: { merchants: 2, soldiers: 2, servants: 2, 'beast-hunters': 1 },
  },
  reedwater: {
    air:
      'Salt-reed cutters bundle reeds on the last dry ground before the fens, and salt pans ' +
      'glitter grey and white beyond the huts. The wind off the fens carries rot and now and then ' +
      'a lamp-flicker. The reed bosses decide who cuts where, and a cutter who strays past the ' +
      'last stake is not seen again.',
    crowd: { farmers: 3, hunters: 1, beggars: 1 },
  },
  thornpost: {
    air:
      'A thorn hedge as tall as a tower rings the post forty li round, grown by a wood-root ' +
      'cultivator a century ago against what comes out of the fens. Hunters sit by the gate ' +
      'gutting what they killed, and the headman checks every pack. Whatever follows a hunter ' +
      'in from the fens gets no second chance at the hedge.',
    crowd: { hunters: 3, 'beast-hunters': 2, farmers: 1, caravaneers: 1 },
  },
};
