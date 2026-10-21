// The origins' board quests' postings (The opening, built: chains, rogue, knobs): one gathering a
// start, met at its gathering ground a few days' road from home (content/atlas, the `qm-op-*`
// sites) and paid at the board. They stand only on the quest's own posting (content/quests), never
// in a month's draw or on the road, so they are kept out of `ENCOUNTERS`. Drafted for Jan's review.
import type { Template } from './schema.ts';

const gather = (
  id: string,
  title: string,
  herb: string,
  features: Template['place']['features'],
  text: string,
  line: string,
  opening: string,
): Template => ({
  id,
  kind: 'place',
  title,
  where: {},
  goal: 'herb-run',
  bands: [-1, 9],
  place: { traffic: 'wilds', features },
  roles: [],
  exits: [
    {
      act: 'gather',
      road: 'take',
      label: 'Cut what the posting asked for',
      pass: { text, line, stakes: [{ do: 'find', things: [herb], n: [5, 7] }] },
    },
  ],
  opening,
});

export const QUEST_ENCOUNTERS: readonly Template[] = [
  gather(
    'quest-nettle-ravine',
    'Nettle for the infirmary',
    'pit-edge-nettle',
    [
      { name: 'the seeping ledges', tags: ['water', 'height'] },
      { name: 'a stream along the floor', tags: ['water', 'crossing'] },
    ],
    'You work along the wet ledges with the stream loud below, cutting the nettle at the stem and leaving the roots, the way the cadets before you left them.',
    'cuts nettle for the garrison infirmary in Weeping Ravine',
    'The ravine walls weep, and every ledge you can see is furred green with nettle.',
  ),
  gather(
    'quest-nettle-gully',
    'Nettle for the healer',
    'pit-edge-nettle',
    [
      { name: 'nettle thick as a hedge', tags: ['cover', 'fragile'] },
      { name: 'bones the Wall shed', tags: ['fragile', 'fall'] },
    ],
    'You cut a path into the nettle with your sleeves over your hands and come out with an armful, and a rash to the elbow.',
    'cuts nettle below the Wall for the healer at its foot',
    'The gully under the Wall is a hedge of nettle growing out of old bones.',
  ),
  gather(
    'quest-glowcap',
    'Caps for the winter store',
    'glow-cap-mushroom',
    [
      { name: 'the rope ladders down the wall', tags: ['height', 'fall', 'narrow'] },
      { name: 'the glowing floor', tags: ['dark', 'fragile'] },
    ],
    'You go down the ladders with a sack on your back and pick by the caps’ own light, the soft ones only, as the clans pick.',
    'picks glow-caps for the clans’ winter store in Glow-Cap Sinkhole',
    'The sinkhole’s floor glows below you like a sky turned over.',
  ),
  gather(
    'quest-lotus',
    'Lotus seed for the dockside shop',
    'bend-water-lotus-seed',
    [
      { name: 'the lotus beds', tags: ['water', 'cover', 'fragile'] },
      { name: 'reed channels', tags: ['water', 'narrow'] },
    ],
    'You wade the channels to your chest and cut the pods that have gone brown, and shell them on the ferryman’s mooring post.',
    'cuts lotus seed in the backwater below River-Bend for a debt of the ferryman’s',
    'The backwater is still as a pond, lotus from bank to bank, and the river’s noise is somewhere else.',
  ),
  gather(
    'quest-blood-vine',
    'Vine for the mission hall',
    'beast-blood-vine',
    [
      { name: 'red vine on the walls', tags: ['cover', 'fragile', 'height'] },
      { name: 'the runoff from the yards', tags: ['water'] },
    ],
    'You climb the red walls and cut the vine where it is darkest, which is where the yards’ runoff runs thickest. Your hands are red to the wrist.',
    'cuts beast-blood vine in Blood-Vine Gorge for a debt of a senior’s',
    'The gorge smells of the Gate’s yards, and the vine on its walls is the color of what drains down them.',
  ),
  gather(
    'quest-kelp',
    'Kelp for Pill Street',
    'blood-salt-kelp',
    [
      { name: 'the flats at low tide', tags: ['water', 'crossing'] },
      { name: 'the tide coming in', tags: ['water', 'fall'] },
    ],
    'You run out over the flats with the tide at its lowest and cut kelp until the water is at your ankles, then run back with it before it is at your knees.',
    'cuts blood-salt kelp on the flats for the bounty office',
    'The tide is out, and the flats run grey to the strait with kelp lying on them in dark stripes.',
  ),
];
