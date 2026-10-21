// The codex's Formations entries (K10), one a row of docs/features.md; drafted, awaiting Jan's
// review.
import type { CodexEntry } from './schema.ts';

export const FORMATIONS: readonly CodexEntry[] = [
  {
    id: 'formation-inscribing',
    title: 'Formation Inscribing',
    hanzi: '阵',
    area: 'crafts',
    text: [
      'An array is made at the bench like any recipe: a set of flags 阵旗 to plant round a jade eye, or a disc 阵盘 complete in itself. Inscribing is queued, never sat at; the hands-on part comes when you lay it.',
      'Every array is drawn from what its inputs carry: nourishing gathers qi, hard wards, concealing hides, resonant rings an alarm, binding traps, sharp or burning kills, illusory makes a maze, and nourishing with wood grows a field.',
    ],
    numbers: [
      ['A batch', 'One set or disc in 4 craft hours at tier 1'],
      ['The tool', 'A bronze inscribing plate, 30 low at talisman shops'],
      ['Families', 'Gathering 聚, Guarding and concealing 守, Trapping and killing 杀'],
    ],
    where: { screen: 'crafts', label: 'Crafts' },
    met: { test: 'array' },
    way: 'codex',
    feature: 'Formation Inscribing: flags 阵旗 and discs 阵盘 made at the bench, queued',
  },
  {
    id: 'placing',
    title: 'Placing',
    hanzi: '布阵',
    area: 'crafts',
    text: [
      'Laying an array is reading the ground. The eye sits in the middle and the vein’s currents run across the ground round it, seen only within your divine sense of your hand and round each flag you have planted. Plant the flags one at a time where the currents run, so each flag and each line between them draws on them; the last closes the ring, which must hold the eye and cross neither itself nor a stone.',
      'Nothing is timed and nothing is rolled. The hand lifts the array’s rarity through Steady hands, a whole band for a full hand at the base, and what is left over is its strength inside the band. A flag pulled up spills a little qi. The ground is the spot’s own, so a site reads the same each time you lay there.',
    ],
    numbers: [
      ['Flags a set, a disc', '8, 4'],
      ['The hand', 'Flags 0.4, the lines 0.6; an open ring ×0.9'],
      ['A flag pulled up', '−0.04'],
      ['Your sense', '150 at Qi Condensation, ×1.5 a soul realm'],
    ],
    where: { screen: 'dwelling', label: 'Dwelling' },
    met: { test: 'laid' },
    way: 'codex',
    feature: 'Placing 布阵: laying an array by reading the currents, the hand lifting its rarity',
  },
  {
    id: 'arrays-at-a-site',
    title: 'Arrays at a site',
    hanzi: '护山大阵',
    area: 'dwellings',
    text: [
      'Land you claimed on a vein holds arrays: one on a tier 1 vein, one more a tier, one more for One More Array. Each runs while its eye holds stones, here or away, and goes dark when they run out; feed it while you stand there. Taking one up gives its flags back as they were, the stones lost.',
      'A gathering array lifts the site’s qi a step at tier 1, a step more a tier and a step more at gold, and seclusion feels it. The vein is a soft cap: it holds as many steps again as its own tier, and only a gold array reaches past it, at double upkeep. A warding array turns raiders at its band or under; concealing flags hide the site a band deeper; an alarm lets a raid’s card wait twice as long; growing flags make the fields in its slots grow a step denser.',
    ],
    numbers: [
      ['An eye', '30 low at tier 1, up the realm curve'],
      ['Burn', '0.5 low a day at tier 1; a sleeping trap a tenth'],
      ['A band', 'White early, green middle, blue late, gold the next realm'],
    ],
    where: { screen: 'dwelling', label: 'Dwelling' },
    met: { test: 'laid' },
    way: 'codex',
    feature:
      "Arrays at a site: gathering under the vein's cap, warding, concealing, alarm, growing; their eyes fed and taken up",
  },
  {
    id: 'arrays-in-a-fight',
    title: 'Arrays in a fight',
    hanzi: '阵战',
    area: 'fighting',
    text: [
      'An array fights for whoever laid it, on its own ground: a raid fought at your site, or what a trap of yours holds. Each reads its band against a foe’s soul, as Body-Fixing does.',
      'A warding array stands a full qi shield at its rung over your side. A binding array holds every foe at its band or under one turn in two. A killing array strikes every foe inside at each turn’s start and never misses. A maze takes a third of the aim of foes at its band or under. Each turn of the fight burns a day of its eye.',
    ],
    numbers: [
      ['Warding', 'A full qi shield at its rung'],
      ['Binding', 'Held one turn in two'],
      ['Killing', 'Its strike every turn, never missing'],
      ['Maze', '−⅓ Accuracy'],
    ],
    where: { screen: 'dwelling', label: 'Dwelling' },
    met: { test: 'laid' },
    way: 'codex',
    feature: 'Arrays in a fight on their ground: warding, binding, killing, maze',
  },
  {
    id: 'prepared-ground',
    title: 'Prepared ground and traps',
    hanzi: '伏',
    area: 'map',
    text: [
      'Flags or a disc can be laid anywhere in the open, off your sites: right where you stand on the map, through placing. It needs no slot and lasts while its eye holds stones; one a spot.',
      'A binding array there is a trap. About one day in ten something of the land’s band walks across it: one at the trap’s band or under is held until you come, and a stronger one breaks through and takes the eye’s stones with it. Holding a beast burns five times the stones, so one left long enough eats the eye dry and walks off. Its 阵 seal turns red on the map while something waits; check it from your own menu there and fight it bound.',
    ],
    numbers: [
      ['Something walks in', 'About one day in ten'],
      ['Holding', '×5 the burn'],
      ['Within reach', '60 li'],
    ],
    where: { screen: 'map', label: 'Map' },
    met: { test: 'prepared' },
    way: 'codex',
    feature:
      'Prepared ground and traps: an array on open ground, what walks in held until you check it',
  },
];
