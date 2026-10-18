// The Border Wilds' cultivators on the map (P3.7): the roster's rogues, deserters, smugglers,
// raiders and sect disciples on the roads and off them. Drafted in P3.7 for Jan's review.
import type { Template } from './schema.ts';

const ROBBED = [
  { do: 'wound', share: 0.3, days: 10 },
  { do: 'robbed', share: 0.5, item: true },
] as const;

export const CULTIVATOR_ENCOUNTERS: readonly Template[] = [
  {
    id: 'pine-deserters',
    kind: 'cultivator',
    hostile: true,
    title: 'Deserters in the pines',
    where: { terrain: ['forest', 'hills'] },
    bands: [0, 3],
    weight: 3,
    lurks: true,
    place: {
      traffic: 'wilds',
      features: [
        { name: 'blackpines close on the trail', tags: ['cover', 'dark'] },
        { name: 'a deadfall across the way', tags: ['burnable', 'narrow'] },
      ],
    },
    roles: [
      {
        id: 'talker',
        name: 'a garrison deserter, the one talking',
        who: { roster: 'garrison-deserter' },
        motives: ['greed', 'fear'],
      },
      {
        id: 'others',
        name: 'two more deserters',
        who: { roster: 'garrison-deserter' },
        band: -1,
        count: [2, 2],
        motives: ['greed'],
      },
    ],
    exits: [
      {
        act: 'attack',
        road: 'fight',
        label: 'Fight them',
        pass: {
          text: 'The talker goes down first, and the other two don’t wait to see how it ends.',
          line: 'fights off three deserters who came out of the pines',
          stakes: [{ do: 'loot' }],
        },
        short: {
          text: 'Three spears are too many. You wake in the needles with a lighter purse.',
          line: 'is beaten and robbed by deserters in the pines',
          stakes: [...ROBBED],
        },
      },
      {
        act: 'threaten',
        road: 'talk',
        label: 'Threaten them off',
        against: 'talker',
        pass: {
          text: 'You let them feel what you are. The talker remembers somewhere else he has to be.',
          line: 'stares down three deserters on a forest trail',
        },
      },
      {
        act: 'pay',
        road: 'deal',
        label: 'Pay the road toll they ask',
        cost: { stones: 12 },
        pass: {
          text: 'Twelve stones change hands. They step back into the pines as if they were never there.',
          line: 'pays deserters in the pines to let the road be',
        },
      },
      {
        act: 'flee',
        road: 'slip',
        label: 'Run for it',
        pass: {
          text: 'You are through the deadfall and gone before the third man has his spear up.',
          line: 'outruns deserters in the pines',
        },
        short: {
          text: 'They know these pines better than you. They catch you tired, and take their toll and more.',
          line: 'is run down and robbed by deserters in the pines',
          stakes: [...ROBBED],
        },
      },
    ],
    opening:
      'Three men in cut-off garrison coats step out of the blackpines across the trail, spears low.',
  },
  {
    id: 'march-patrol',
    kind: 'cultivator',
    title: 'A patrol of the March',
    where: { road: 'on', terrain: ['hills', 'plains', 'forest'] },
    bands: [0, 3],
    weight: 3,
    moves: true,
    place: {
      traffic: 'road',
      features: [
        { name: 'the beacon road', tags: ['witnesses'] },
        { name: 'a waystone with the March’s mark', tags: ['fragile'] },
      ],
    },
    roles: [
      {
        id: 'sergeant',
        name: 'a sergeant of the March',
        who: { roster: 'march-conscript' },
        band: 1,
        motives: ['duty'],
      },
      {
        id: 'file',
        name: 'conscripts of the March',
        who: { roster: 'march-conscript' },
        count: [3, 3],
        motives: ['duty'],
      },
    ],
    exits: [
      {
        act: 'ask',
        road: 'talk',
        label: 'Answer their questions',
        against: 'sergeant',
        pass: {
          text: 'He asks your business, writes it on a slip and waves you on toward the next beacon.',
          line: 'answers a March patrol’s questions on the beacon road',
        },
      },
      {
        act: 'leave',
        road: 'pass',
        label: 'Stand aside and let them pass',
        pass: {
          text: 'You step off the road. They march by without breaking step, eyes on the ridge.',
          line: 'stands aside for a patrol of the March',
        },
      },
    ],
    opening:
      'Spear points over the next rise, and then a file of conscripts in scale coats, a sergeant at their head.',
  },
  {
    id: 'night-smugglers',
    kind: 'cultivator',
    title: 'Smugglers unloading at night',
    where: { terrain: ['coast', 'marsh'], hours: 'night' },
    bands: [0, 4],
    weight: 2,
    place: {
      traffic: 'wilds',
      features: [
        { name: 'a shuttered lantern on the shingle', tags: ['dark'] },
        { name: 'crates under oilcloth', tags: ['cover', 'burnable'] },
      ],
    },
    roles: [
      {
        id: 'boss',
        name: 'a Night Bridge smuggler',
        who: { roster: 'night-bridge-smuggler' },
        motives: ['greed', 'fear'],
      },
      {
        id: 'hands',
        name: 'his hands',
        who: { mortal: 'mortal-bandit' },
        count: [2, 4],
        motives: ['greed'],
      },
    ],
    exits: [
      {
        act: 'sneak',
        road: 'slip',
        label: 'Leave them to their crates',
        pass: {
          text: 'You keep to the dark above the shingle until their lantern is a spark behind you.',
          line: 'passes a smugglers’ landing in the dark',
        },
        short: {
          text: 'A hand sees you, and the smuggler decides you saw too much.',
          line: 'is caught watching a smugglers’ landing',
          stakes: [...ROBBED],
        },
      },
      {
        act: 'bargain',
        road: 'talk',
        label: 'Ask what they’re selling',
        against: 'boss',
        pass: {
          text: 'He looks you over, then lifts the oilcloth. It is mostly black-market pills, priced for the dark.',
          line: 'buys from smugglers on a night shore',
          stakes: [
            {
              do: 'find',
              things: ['blood-tide-pill', 'pufferfish-talisman', 'hiding-talisman'],
              n: [1, 1],
            },
            { do: 'stones', n: -20 },
          ],
        },
      },
      {
        act: 'attack',
        road: 'fight',
        label: 'Take the landing',
        pass: {
          text: 'The hands scatter into the marsh, and the crates are yours.',
          line: 'breaks up a smugglers’ landing',
          stakes: [{ do: 'loot' }, { do: 'karma', n: -1 }],
        },
      },
    ],
    opening:
      'A shuttered lantern blinks twice on the shingle, and men are carrying crates up from a boat with no lamp.',
  },
  {
    id: 'half-blood-raider',
    kind: 'cultivator',
    hostile: true,
    title: 'A half-blood raider on your trail',
    where: { road: 'off', terrain: ['plains', 'hills', 'steppe'] },
    bands: [1, 5],
    weight: 2,
    place: {
      traffic: 'wilds',
      features: [
        { name: 'a lone standing stone', tags: ['height', 'cover'] },
        { name: 'trampled grass', tags: ['witnesses'] },
      ],
    },
    roles: [
      {
        id: 'raider',
        name: 'a half-blood raider',
        who: { roster: 'half-blood-raider' },
        motives: ['greed', 'pride'],
      },
    ],
    exits: [
      {
        act: 'attack',
        road: 'fight',
        label: 'Turn and fight',
        pass: {
          text: 'The beast in his blood is strong, but you are stronger. He goes down by the standing stone.',
          line: 'kills a half-blood raider who tracked them across the grass',
          stakes: [{ do: 'loot' }],
        },
        short: {
          text: 'His blood runs hotter than your qi. He leaves you in the grass and takes what he likes.',
          line: 'is beaten and robbed by a half-blood raider',
          stakes: [...ROBBED],
        },
      },
      {
        act: 'threaten',
        road: 'talk',
        label: 'Show him what he’s tracking',
        pass: {
          text: 'He reads your realm, spits, and turns his horse for the Vast Wilds.',
          line: 'turns a half-blood raider back with a look',
        },
      },
      {
        act: 'flee',
        road: 'slip',
        label: 'Lose him in the hills',
        pass: {
          text: 'You double back twice through a dry wash, and when you look again he is gone.',
          line: 'loses a half-blood raider in the hills',
        },
      },
    ],
    opening:
      'The same rider has been on the skyline behind you for three hours, and he is closer each time you look.',
  },
  {
    id: 'butcher-gate-hunters',
    kind: 'cultivator',
    title: 'Beast-Butcher Gate hunters at a kill',
    where: { terrain: ['hills', 'forest', 'karst'] },
    bands: [0, 4],
    weight: 2,
    place: {
      traffic: 'wilds',
      features: [
        { name: 'a fresh kill strung from a branch', tags: ['witnesses'] },
        { name: 'butchering knives laid out on a hide', tags: ['fragile'] },
      ],
    },
    roles: [
      {
        id: 'disciple',
        name: 'a Beast-Butcher Gate disciple',
        who: { roster: 'beast-butcher-disciple' },
        motives: ['pride', 'loyalty'],
      },
      {
        id: 'juniors',
        name: 'two juniors with the knives',
        who: { roster: 'beast-butcher-disciple' },
        band: -1,
        count: [2, 2],
        motives: ['loyalty'],
      },
    ],
    exits: [
      {
        act: 'leave',
        road: 'pass',
        label: 'Nod and walk on',
        pass: {
          text: 'The disciple watches you all the way past, a knife in his hand that he doesn’t need for the boar.',
          line: 'walks past Beast-Butcher Gate hunters at their kill',
        },
      },
      {
        act: 'bargain',
        road: 'talk',
        label: 'Offer to buy the core',
        against: 'disciple',
        pass: {
          text: 'He names a price and you pay it. The Gate never wastes a sale.',
          line: 'buys a beast core from Beast-Butcher Gate hunters',
          stakes: [
            { do: 'find', things: ['beast-core'], n: [1, 1] },
            { do: 'stones', n: -15 },
          ],
        },
      },
      {
        act: 'attack',
        road: 'fight',
        label: 'Take their kill',
        big: true,
        pass: {
          text: 'You take the kill and the knives. The Gate will hear of it.',
          line: 'robs Beast-Butcher Gate hunters of their kill',
          stakes: [{ do: 'loot' }, { do: 'heat', n: 2 }, { do: 'karma', n: -1 }],
        },
      },
    ],
    opening:
      'Three in the Gate’s grey aprons are dressing a boar at the trailside, and the eldest looks up at you without stopping his knife.',
  },
  {
    id: 'pirate-landing',
    kind: 'cultivator',
    hostile: true,
    title: 'Pirates of the Raider Isles ashore',
    where: { terrain: ['coast'] },
    bands: [1, 5],
    weight: 2,
    lurks: true,
    place: {
      traffic: 'wilds',
      features: [
        { name: 'a longboat drawn up on the sand', tags: ['cover', 'burnable'] },
        { name: 'dunes', tags: ['cover', 'height'] },
      ],
    },
    roles: [
      {
        id: 'captain',
        name: 'a Raider Isles pirate',
        who: { roster: 'raider-isles-pirate' },
        motives: ['greed'],
      },
      {
        id: 'crew',
        name: 'his crew',
        who: { roster: 'raider-isles-pirate' },
        band: -1,
        count: [2, 3],
        motives: ['greed'],
      },
    ],
    exits: [
      {
        act: 'attack',
        road: 'fight',
        label: 'Fight them on the sand',
        pass: {
          text: 'The crew breaks for the longboat. The captain does not make it.',
          line: 'drives a Raider Isles landing party back into the sea',
          stakes: [{ do: 'loot' }, { do: 'heat', n: -1 }],
        },
        short: {
          text: 'They are many and the sand is soft. You come round with the tide at your feet and your purse gone.',
          line: 'is beaten and robbed by Raider Isles pirates',
          stakes: [...ROBBED],
        },
      },
      {
        act: 'flee',
        road: 'slip',
        label: 'Get off the beach',
        pass: {
          text: 'You are over the dunes and inland before they have their boat secured.',
          line: 'slips away from a pirate landing',
        },
        short: {
          text: 'They have done this on a hundred beaches. They catch you in the dunes.',
          line: 'is caught in the dunes by Raider Isles pirates',
          stakes: [...ROBBED],
        },
      },
    ],
    opening:
      'A longboat grinds onto the sand below the dunes, and the men jumping out are already looking at you.',
  },
  {
    id: 'wounded-rogue',
    kind: 'cultivator',
    title: 'A wounded rogue by the road',
    where: { road: 'on' },
    bands: [0, 4],
    weight: 2,
    place: {
      traffic: 'road',
      features: [
        { name: 'a ditch by the road', tags: ['cover'] },
        { name: 'a broken sword in the grass', tags: ['fragile'] },
      ],
    },
    roles: [
      {
        id: 'rogue',
        name: 'a wounded rogue cultivator',
        who: { roster: 'garrison-deserter' },
        motives: ['fear', 'greed'],
      },
    ],
    exits: [
      {
        act: 'heal',
        road: 'deal',
        label: 'Give him a pill',
        cost: { item: 'wound-knitting-pill' },
        pass: {
          text: 'He takes it with shaking hands. "I won’t forget the road," he says, and you believe him.',
          line: 'saves a wounded rogue cultivator by the road',
          stakes: [
            { do: 'memory', role: 'rogue', row: 'saved-life' },
            { do: 'karma', n: 5 },
          ],
        },
      },
      {
        act: 'rob',
        road: 'fight',
        label: 'Take what he has',
        // Robbing the helpless is a choice a stance never makes for you.
        big: true,
        pass: {
          text: 'He can’t stop you. He watches you go through his things with his teeth set.',
          line: 'robs a wounded rogue in a ditch',
          stakes: [
            { do: 'loot' },
            { do: 'karma', n: -1 },
            { do: 'memory', role: 'rogue', row: 'robbed' },
          ],
        },
      },
      {
        act: 'leave',
        road: 'pass',
        label: 'Walk on',
        pass: {
          text: 'You leave him to the ditch and whoever comes next.',
          line: 'walks past a wounded man in a ditch',
        },
      },
    ],
    opening:
      'A man in a cut robe sits in the ditch holding his side together with both hands. He sees you see him.',
  },
];
