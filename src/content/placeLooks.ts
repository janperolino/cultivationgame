// A place’s visual character for its art brief (A6; tools/place-brief.ts): what it is built of,
// its shapes and colours, how it feels, and what it must not have, so no two places are painted
// alike. Written from each place’s data and its painting on the world map; drafted for Jan’s review.
export interface PlaceLook {
  /** What it is built of and its shapes, the signature sights, two to four sentences. */
  look: string;
  colours: string;
  feels: string;
  /** What to leave out, chosen to keep it apart from its neighbours and from a stock xianxia city. */
  not: string;
}

export const PLACE_LOOKS: Readonly<Record<string, PlaceLook>> = {
  // The coast
  'qm-shoukou-cheng': {
    look: 'A harbour fortress and a bazaar: grey-green sea stone streaked with salt, walls rising straight out of the surf faced with bleached beast-king skulls, a waterfront crush of awnings, hide-curing racks and fish smoke, junks and war galleys at the quays, a pale ward over the harbour mouth.',
    colours: 'sea grey, bone white, rust-red sails, salt haze',
    feels: 'loud, crowded, rich, brine and blood',
    not: 'gardens, quiet courtyards, mountain peaks',
  },
  'qm-qian-shi': {
    look: 'A merchant clan’s compound in the middle of the City’s waterfront: a tall counting house with a gilded roof, its exchange hall lit by rows of graded lamps over long tables of sorted cores, strongrooms of dressed stone below, clerks and porters in the yard, wax-sealed crates and brass scales everywhere.',
    colours: 'lamp gold, lacquered dark wood, brass, ledger-paper cream',
    feels: 'orderly, polite, quietly rich, watchful',
    not: 'skulls and rough walls, soldiers, open sea, temple halls, green roofs',
  },
  'qm-xinglin-bianguan': {
    look: 'A pill shop, clinic and buying office under one broad green-glazed roof among the City’s streets: a wide clinic hall with rows of cots and screens, a long pill counter fronted with rows of small lacquered drawers and jars, a courtyard of drying herbs and an apricot tree in a stone planter.',
    colours: 'celadon green roof, apricot pink, white linen, herb brown',
    feels: 'calm, clean, medicinal, busy with patients',
    not: 'skulls, ledgers and lamps, weapons, sea and ships, grandeur',
  },
  'qm-tuichao-gang': {
    look: 'A strait port of a million on a shore that drains twice a day: crescent breakwaters of lifted old reef bound by a faint array, a harbour floor of bright mud with hulls sitting tilted on it, stilt-legged cranes and mud-sleds between the ships, rows of east-quay warehouses in dark timber, salt stacked in white pyramids.',
    colours: 'wet-mud silver, reef coral grey, tar black, pale salt white',
    feels: 'tidal, shabby, shifty, everyone waiting on the water',
    not: 'skull-faced walls, gilded halls, gardens, deep water at the quays, a fortress',
  },
  'qm-duanchao-yuan': {
    look: 'Salt flats three hundred li across, white with salt and bone to the horizon: the ribs and skulls of beast-kings the size of hills half sunk in the crust, old rusted blades and armour standing where soldiers fell, scavengers’ pits and sledges, and on still nights faint grey ranks of ghost soldiers drawn up in the haze.',
    colours: 'salt white, bone ivory, rust brown, ghost grey',
    feels: 'empty, silent, bleached, haunted',
    not: 'buildings, walls, green growth, crowds, fire, mountains',
  },
  'qm-yeqiao-hui': {
    look: 'A smugglers’ chain of low reef islands: tide pools, wet black rock, sea caves with lantern-lit ledges, crude plank landings and rope bridges across the reef at low tide, a few crews’ lean-to huts, small flat boats pulled up on shingle. Nothing grand, everything hidden.',
    colours: 'wet black rock, tide-pool teal, dim lantern amber, night blue',
    feels: 'furtive, damp, nocturnal, tide-timed',
    not: 'a city, grand halls, daylight crowds, walls, banners, soldiers',
  },
  'qm-luochao-lou': {
    look: 'A drowned watchtower of old black stone, barnacled and slick, standing clear of the sea only at the lowest tide, with a causeway of reef leading out to it and a wall inside scratched with names. Open grey sea on every side, no town.',
    colours: 'barnacle grey, wet black, cold sea green, one dim lamp',
    feels: 'cold, secret, hushed, lethal',
    not: 'crowds, ships, banners, towns, daylight warmth, any hall above water',
  },
  // The March of Pacified Borders
  'pacified-fort': {
    look: 'A war city cut into a flattened hill crown: walls of the hill’s own rock, barracks in long identical rows, drill grounds as vast bare plazas with soldiers in ranks, armouries and spear racks, black-and-red Gongsun banners, the March’s beacon burning on the highest bastion.',
    colours: 'dun stone, iron, black and red',
    feels: 'square, disciplined, austere',
    not: 'gilt, ponds and gardens, bazaar clutter, the sea',
  },
  'spear-plow': {
    look: 'The seat of a farming county in a hill valley: terraced spirit-grain fields running up the slopes, farmers ploughing with spears slung or planted at the field edge, a plain timber-and-rammed-earth town of long granary roofs and a county store, a beast-pit fenced with stakes, and a beacon peak standing over it all.',
    colours: 'barley gold, ploughed brown, rammed-earth ochre, iron grey spear heads',
    feels: 'tough, practical, alert, rural',
    not: 'barracks ranks, black-and-red banners, big walls, bazaar crowds, ornament',
  },
  'ninth-beacon': {
    look: 'A lone steep peak with a tall stone beacon tower on its summit and a pillar of spirit-fire rising from it, the March’s border post and a great stone road gate at its foot, long watch-barracks, and the county seat’s forty thousand herders and carters spread down the slopes beside the road.',
    colours: 'fire orange, dark rock, ash grey, sky blue',
    feels: 'remote, watchful, windy, lonely',
    not: 'fields, large crowds, markets, water, parades or drill grounds',
  },
  'grain-ford': {
    look: 'Granaries in long tiers along a river ford: great windowless storehouses with deep thatched or tiled roofs stepped up the bank, each hung with faint gold warding talismans, ox-carts and barges queued at the crossing, tally clerks at counting sheds and tax-gate barriers across the road.',
    colours: 'grain gold, river brown, thatch straw, faint talisman gold',
    feels: 'orderly, fat, bureaucratic, guarded against theft',
    not: 'soldiers drilling, skulls, rock peaks, sea, ornament, towers',
  },
  'qm-hewan-cheng': {
    look: 'A city of three million laid fifty li along a river bend: wharves and barge lines like a dark comb on the water, grain warehouses and iron yards, vast muster yards where lines of sixteen-year-olds stand in rows, tax wharves piled with levy sacks, endless low roofs along the bank under the March’s beacon pillars on the hills.',
    colours: 'river brown-green, iron grey, grain gold, black and red banners',
    feels: 'working, heavy, commercial, conscription and cargo',
    not: 'skull walls, sea, karst, gardens, a single fortress, elegance',
  },
  'qm-tushou-men': {
    look: 'A sect on three sheared flat peaks joined by arched bridges: sabre racks, a red-lit drill yard on a peak top, core furnaces glowing in the halls, rank-boards of cores taken, hides and bleached beast bones stacked at the foot, all under a blood-red sect array.',
    colours: 'blood red, black rock, furnace orange, hide brown',
    feels: 'brutal, proud, martial, hungry',
    not: 'soft pavilions, gardens, bells and incense, a city, water',
  },
  // The Kingdom of Stone Eyes
  'sinkhole-terraces': {
    look: 'A town of two million terraced down the wall of a sinkhole thirty li across: farms at the bottom, stacked rings of pale stone houses and stair-streets cut into the walls, hanging bridges across the void, cloud pooling in the pit at dawn, and the Registry’s testing stone on the top terrace.',
    colours: 'limestone cream, terrace green, cloud white, shadow blue',
    feels: 'vertical, enclosed, hushed, vertiginous',
    not: 'open plains, a council hall in the cliff, walls and gates, sea, a pit sixty li across',
  },
  'qm-tianyan': {
    look: 'The greatest sinkhole city: a pit sixty li across ringed by karst teeth, its walls cut into ring upon ring of stone terraces for five million people with roofs packed edge to edge, golden lamps in every window, stair-streets and bridges, a council hall carved into the north cliff face halfway down, and green fields at the bottom lost in cloud.',
    colours: 'grey limestone, lamp gold, cloud white, dark pine green',
    feels: 'vast, vertiginous, dense, a bowl of lights',
    not: 'plains, walls and gates, the sea, red banners, a single tower',
  },
  'qm-hu-shi': {
    look: 'A stretch of the sinkhole’s wall held by a clan: narrow cave-mouth doorways cut in a pale cliff, handsome carved lintels and stair-landings, family shrines in alcoves and bare mirrorless rooms, and sealed burial caves at the dark end, with children guiding lantern parties along ledges.',
    colours: 'pale cave stone, soot black, lantern amber, deep red cloth',
    feels: 'close-knit, private, nimble, wary of mirrors',
    not: 'open terraced streets, market stalls, grand halls, mirrors or polished metal, farms',
  },
  'bat-roost': {
    look: 'A cave mouth a li high in a karst cliff, with rope ladders, plank scaffolds and basket hoists up the face, guano heaped in brown mounds and sacked at the foot, diggers’ lean-to huts, and swarms of bats pouring from the mouth at dusk like smoke.',
    colours: 'guano brown, cave black, dusk purple, pale cliff grey',
    feels: 'foul, dim, industrious, acrid',
    not: 'terraces, grand buildings, gardens, clean water, banners',
  },
  'lower-caves': {
    look: 'A web of dark cave passages with a few lantern-lit cave-mouth homes: low arches, narrow ledges, dripping flowstone, rope lines and chalk marks, a clan’s hearth room carved into the rock, and a runner’s bundle on a shelf. The whole place is under the ground.',
    colours: 'wet flowstone grey, soot black, a single lantern gold, moss green',
    feels: 'cramped, secret, silent, no map to it',
    not: 'sky, towns, towers, the sinkhole’s terraces, open water, banners',
  },
  'qm-wuming-ji': {
    look: 'A free market in a deep karst valley between stone pillars: no wall or gate, hundreds of stalls on the valley floor under awnings and tarpaulins slung between the pillars, cookfire and incense haze, caves rented by the night in the cliff, and a plain tea shed at the centre.',
    colours: 'haze brown, stone grey, lamp-speckled orange, patched tarp colours',
    feels: 'anarchic, wary, bustling, neither safe nor hostile',
    not: 'walls, banners, arrays, grand halls, gardens, uniformed guards',
  },
  'qm-chisui-dong': {
    look: 'A grey karst valley that looks empty, with one cave mouth stained iron-red and a faint red haze hanging over it on still nights; below, pens cut into the rock hold chained beasts above shallow blood-dark pools. Seen only as a cave and a smell.',
    colours: 'iron red, cave black, grey karst, dull rust',
    feels: 'sinister, rumoured, airless, sickly',
    not: 'proud halls, banners, markets, gardens, any comfort or crowds',
  },
  'qm-heiyu-mai': {
    look: 'The foot of needle peaks cut through with mine galleries: black jade exposed as a glinting dark seam, timber-braced gallery mouths with spoil heaps at their feet, rope hoists and ore sleds, upper galleries and lower galleries held by two camps, rockfalls and thunder-ape shadows high above.',
    colours: 'black jade glint, spoil grey, timber brown, dust haze',
    feels: 'harsh, contested, dangerous, dusty',
    not: 'towns, gardens, temples, crowds, water, ornamental halls',
  },
  'qm-hexue-jing': {
    look: 'A green shard world: a gate cave in the karst opens on endless lush meadows under a green sky, with the vine-grown ruins of a village of the one people, round bloodline altars carved with beast and human faces, and herb fields in bloom, no walls and no road.',
    colours: 'jade green, sky green, moss and vine, altar stone grey',
    feels: 'ancient, lush, still, otherworldly',
    not: 'cities, soldiers, red banners, smoke, sea, any karst town',
  },
  // The Kingdom of Spirit Herders
  'qm-qianlan-cheng': {
    look: 'The herders’ royal city of three million inside rings of array-fenced paddocks sixty li across: the king’s riding court as an open ring of sand under awnings, felted-tent and timber halls of the great herder families, the remount officers’ long hall, herds moving between rings like cloud shadow, and riders everywhere on thunder-horned deer and scale-horses.',
    colours: 'grass green, horse and hide brown, felt white, saddle red',
    feels: 'open, equestrian, boisterous, sprawling',
    not: 'stone walls, skulls, terraces, ships, narrow lanes, towers',
  },
  'corral-town': {
    look: 'The herders’ trading post: ring upon ring of fenced corrals packed with thunder-horned deer and scale-horses, a great round auction ring with banked seats, buyers’ halls with standing tents, hay and dung heaps, hitching posts, dust and sparks flickering off the horns.',
    colours: 'dust yellow, hay gold, fence-timber brown, spark blue-white',
    feels: 'noisy, dusty, haggling, animal',
    not: 'stone walls, towers, skulls, clean streets, temples, water',
  },
  'hatchling-barns': {
    look: 'Long low barns sunk into a valley floor under a warmth array that hangs a faint amber haze, crates stacked at doors that open only after dark, lamps shuttered, ramps down to warm hatching pens, and carts that come in empty-looking at night.',
    colours: 'amber haze, barn timber brown, night blue, straw yellow',
    feels: 'secretive, warm, humid, uneasy',
    not: 'crowds, markets, banners, grand halls, towers, daytime bustle',
  },
  'thunderhorn-camp': {
    look: 'A summer camp of round felt yurts on open grass, riders breaking thunder-horned deer to the saddle in a ring, a herd a hundred thousand strong sweeping over the plain with sparks jumping between their horns, picket lines and cookfires under a huge sky.',
    colours: 'grass green, felt cream, storm grey, spark white-blue',
    feels: 'wild, windswept, nomadic, free',
    not: 'walls, stone, towers, streets, ships, any city',
  },
  'qm-baijiang-zong': {
    look: 'A beast-taming sect spread over rolling grass in rings of stables and sparring fields: round bonding stables with high roofs, a warm array-kept hatchery, riders and beasts bonded as pairs sparring on open grass, storm-hawks circling above in a slow wheel.',
    colours: 'green grass, stable timber brown, hawk grey, blue-white spark',
    feels: 'bonded, airy, athletic, trusting',
    not: 'sheared peaks, red arrays, walls, saber racks, auction rings, ships',
  },
  // The wilds between
  'foot-of-the-wall': {
    look: 'A sprawl in the Wall’s long shadow: carts of bones queuing to the wall, the bone-carters’ kilns smoking, cook-tents and long benches where women feed the patrols, heaps of beast-king bones waiting to be built in, and the Wall itself rising like a cliff behind every roof.',
    colours: 'bone white, kiln smoke grey, mud brown, cook-fire orange',
    feels: 'grim, working, dusty, in shadow',
    not: 'gardens, gilding, markets of luxury, sea, banners, skull-eye gates',
  },
  'qm-duigu-qiang': {
    look: 'A rampart of rammed earth and beast-king bone running to the horizon over coastal hills, as tall as cliffs, its oldest stretches faced with hill-sized skulls whose eye sockets are the gates, a patrol walk along the top, a thread of binding-array light along the crest, and bone heaps waiting to be built in.',
    colours: 'bone ivory, earth tan, black hills, thread of pale gold light',
    feels: 'immense, ancient, mournful, vigilant',
    not: 'a town, towers of tiled roofs, gardens, sea fleets, colour banners',
  },
  'qm-fugu-ge': {
    look: 'A hall standing in the eye socket of the greatest skull in the Wall, a hill-sized beast-king skull of ivory bone with the sect’s lacquered pavilion set inside it; array plates glimmer in lines along the Wall top and a thread of light runs away along it in both directions; a dim bone-reading room within.',
    colours: 'ivory bone, lacquer black, array thread gold-white, shadow',
    feels: 'solemn, ritual, eerie, patient',
    not: 'towns, markets, red martial banners, gardens, fields, water',
  },
  'qm-jingzhong-si': {
    look: 'A hill temple of a few hundred monks: burial fields in neat rows of low mounds across the slopes, a single pale tower cut from one bone holding a great bronze bell, small meditation caves, plain grey monastic halls, and once a year a ring of gold light spreading from the tower.',
    colours: 'bone white, monk grey, earth brown, pale gold',
    feels: 'still, humble, mournful, quiet',
    not: 'bustle, markets, weapons, red banners, gilded halls, skulls, walls',
  },
  thornpost: {
    look: 'A hunters’ post ringed by a dark thorn hedge as tall as a tower, forty li round, grown by a wood-root cultivator: the outer rind a wall of black thorn with a narrow gap-gate, huts of fen timber and hide inside, drying racks of game, and the fens beyond fading into mist.',
    colours: 'thorn black-green, mist grey, hide brown, damp straw',
    feels: 'wary, defensive, rough, edge of the wild',
    not: 'stone walls, towers, bazaars, ornament, open water, banners',
  },
  reedwater: {
    look: 'Salt-reed cutters on the last dry ground before the fens: silvery salt-reed beds in great swathes, rectangular salt pans glittering, stacked bundles of reed and flat punts on narrow channels, thatched huts on low mounds, and the fens as a grey line beyond.',
    colours: 'reed silver, salt white, thatch gold, flat water grey',
    feels: 'flat, quiet, windy, damp',
    not: 'stone, towers, crowds, peaks, banners, thorn hedge, lamps',
  },
  'qm-shoudeng-zong': {
    look: 'A ghost-way sect on a black fen: ten thousand pale-green lamps on poles in lines across black water, with the drowned circling beneath them, and a multi-roofed stilt hall at the centre lit warm amber among small pine islets. Mist, no roads, all of it on water.',
    colours: 'black water, pale lamp green, stilt-hall amber, mist grey-blue',
    feels: 'eerie, hushed, cold, patient',
    not: 'streets, walls, red banners, dry ground, peaks, bright daylight, crowds',
  },
  'qm-xingyun-yizhi': {
    look: 'A broken mountain’s pieces scattered over a hundred and fifty li under black pine: shattered halls and fallen roofs furred with moss, stair flights climbing to nothing, star-iron glinting dark blue in the rubble, a crater at the heart faintly glowing, scavengers’ camps in the gaps.',
    colours: 'blackpine green-black, rubble grey, star-iron blue, faint crater glow',
    feels: 'ruined, overgrown, haunted, forgotten',
    not: 'intact buildings, crowds, banners, lamps, water, bright colour',
  },
  'qm-xingyun-jing': {
    look: 'A pocket of space holding the sect’s halls as they were the night the mountain fell: whole white-stone halls with intact roofs hung with star-dust, a library, a vault at the centre holding a captive star as a burning bead, guardians standing motionless. A sky of stars with no ground horizon.',
    colours: 'starlight silver, deep indigo, white stone, a single star’s gold-white',
    feels: 'frozen in time, solemn, luminous, empty',
    not: 'ruin, forest, rubble, crowds, banners, ordinary daylight or sky',
  },
};
