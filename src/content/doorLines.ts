// A door's flavor line, the one line under its name in a place's preview (A6's talk, Jan's yes):
// one line for each kind of door everywhere, and a place's own hand-written line over it where its
// art brief is written (the City of the Guarded Mouth and Pacified Fort first). Keys are the door's
// piece on the place's sheet (ui/placeDoors.ts `art`): a street's or a firm's kind, else the door.
// Drafted in A6 for Jan's review (docs/review-queue.md).

/** The line every place's door of a kind shows, unless the place writes its own. */
export const DOOR_LINES: Readonly<Record<string, string>> = {
  stall: 'Mats on the flagstones, anything at all, and nobody asks where it came from.',
  alchemy: 'Furnace smoke and bitter steam; every shop swears its pills were brewed this morning.',
  refiner: 'Hammers from dawn, quench hiss by noon; the racks hang what the forges finished.',
  talisman: 'Cinnabar on every sill, and paper drying on lines strung across the lane.',
  parts: 'Hides pegged out to cure, horn sawn on the street, and the smell of it carried far.',
  mortal: 'Grain by the cartload, bolts of cloth, salt and oil, all of it weighed in silver.',
  house: 'One roof over every department, imports counted twice, and a factor who remembers faces.',
  'house-2': 'A second house, smaller and hungrier, that matches the first on any price you name.',
  bounty: 'Cores laid on the scale by grade, paid at posted rates, never haggled.',
  'black-market': 'Lanterns hooded, faces covered; what was stolen last month sells here this one.',
  sect: 'The sect’s exchange hall: its own buy in contribution, and only what it lets go to outsiders.',
  changer: 'Spirit stones broken to silver and silver raised to stones, at the house’s rate.',
  teahouse: 'A pot of tea buys a seat, and a seat buys whatever the teller heard last night.',
  elder: 'The elder trades what he has heard for news of your own, under the village tree.',
  maps: 'Rolled hides and silk sheets, the region’s and every kingdom’s, inked by surveyors.',
  guides: 'Hunters, herb-gatherers and grave-robbers, each knowing a month’s walk of their trade.',
  caravans: 'Wagons loading at the yard; each sets off at 辰 on its day, guard or passenger.',
  broker: 'The broker lets rooms, chambers and courtyards by the season, sealed with his chop.',
  farmhouse: 'A house with two fields of its own, let to whoever pays the season.',
  board: 'Postings nailed three deep, each with its pay and the seal of whoever is paying.',
  mission: 'The sect’s postings on lacquered boards, paid in contribution on your return.',
  inn: 'A bed, a bath and a lock on the door, paid by the night from your silver.',
  barn: 'Clean straw in the barn loft, and the dogs know you by morning.',
  work: 'Posts and day hires, by the shift: the pay is small, the standing grows.',
  fields: 'Spirit fields in rows of nine beds, rented by the season or bought outright.',
  ground: 'A drill ground where seniors spar with juniors, once a day each.',
  elders: 'Where the elders sit: a lesson, a protector, a seat raised or a release.',
  join: 'Where the way in is asked for, and the answer given at the gate.',
  gift: 'A gift laid before the steward is remembered as tribute.',
  exam: 'One test batch at the guild’s bench, and a badge for the grade it shows.',
  counter: 'The common styles of the area, sold openly to any crafter.',
  pavilion: 'The sect’s own chapters, on shelves that open by seat.',
  'law-hall': 'Where a marked face kneels and makes restitution.',
  seat: 'What the power wants of you this month, and what it gives.',
};

/** A place's own lines, over the kind's, by the door's piece. */
export const PLACE_DOOR_LINES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  'qm-shoukou-cheng': {
    stall:
      'Two hundred stalls on the flagstones under the skull walls, and whatever came off the island chain this week.',
    alchemy:
      'A street of furnace houses under the Apricot Grove’s branch shop, brewing what the bounty hunters buy before they sail.',
    refiner:
      'Quench smoke over the beast-part market: the Row works the hides and bones the hunters bring in, and frontier saber steel goes out from here.',
    talisman:
      'Cinnabar and beast-blood ink, and wards for every hull that leaves the harbour mouth.',
    parts:
      'Beast-king hides pegged out along the harbour street, horn sawn on the cobbles, and the whole quarter smelling of it.',
    house:
      'The Qian Clan’s hall, whose cut of every core that leaves the region built the tallest roof inside the walls.',
    bounty:
      'Cores on the scale by grade, paid at posted rates to anyone who comes back across the strait.',
    mortal:
      'Grain ships and cloth bales for eight million mouths, weighed in silver on the harbour street.',
    changer:
      'The garrison’s own changer by the Sea Gate, where soldiers break their pay into silver.',
    teahouse: 'Bounty hunters drinking off the crossing, and a teller who listens to all of them.',
  },
  'pacified-fort': {
    stall:
      'A sutler’s stall by the watchtower and the soldiers selling on what they drew from stores.',
    alchemy:
      'A street of furnace houses under the drill grounds. Every drill day the cadets come down it bleeding.',
    refiner: 'The armouries’ overflow: saber blanks and mended plate, hammered under the walls.',
    house:
      'The Guo house, which feeds and clothes four hundred thousand under arms and sells to anyone else.',
    bounty: 'The March’s bounty office, paying for cores at the rate the generals set.',
    mortal: 'Grain wagons from every county in the March, weighed out for the garrison first.',
    work: 'Posts on the walls and in the stores, by the shift, under a sergeant’s eye.',
  },
};

/** A door's flavor line at a place: the place's own, else its kind's. */
export function doorLine(place: string, art: string): string | null {
  return PLACE_DOOR_LINES[place]?.[art] ?? DOOR_LINES[art] ?? null;
}
