// Goal encounters (P3.7, P3.9): what a bounty posting's spot holds, one per trip goal. The main
// exit's pass is the goal done. Drafted for Jan's review.
import type { Template } from './schema.ts';

export const GOAL_ENCOUNTERS: readonly Template[] = [
  {
    id: 'goal-bounty-deserter-camp',
    kind: 'cultivator',
    title: 'A deserter with a price on his head',
    where: { terrain: ['hills', 'forest', 'karst'], site: ['camp'] },
    goal: 'bounty',
    bands: [0, 3],
    weight: 2,
    place: {
      traffic: 'wilds',
      features: [
        { name: 'the cook fire', tags: ['fire', 'witnesses'] },
        { name: 'a palisade of stakes', tags: ['cover', 'burnable'] },
      ],
    },
    roles: [
      {
        id: 'mark',
        name: 'the deserter on the bounty',
        who: { roster: 'garrison-deserter' },
        band: 1,
        motives: ['greed', 'fear'],
      },
      {
        id: 'band',
        name: 'the men who follow him',
        who: { roster: 'garrison-deserter' },
        band: -1,
        count: [2, 3],
        motives: ['greed'],
      },
    ],
    exits: [
      {
        act: 'attack',
        road: 'fight',
        label: 'Take him for the bounty',
        against: 'mark',
        pass: {
          text: 'He bolts for the stakes, and you catch him against them. The rest scatter with a handful of stolen stones between them.',
          line: 'takes a deserter at his camp for the bounty',
          stakes: [{ do: 'loot' }],
        },
        short: {
          text: 'His men were closer than the posting said. They beat you into the cook fire’s ash and strip what they find.',
          line: 'is beaten and robbed at a deserters’ camp',
          stakes: [
            { do: 'wound', share: 0.3, days: 10 },
            { do: 'robbed', share: 0.5, item: true },
          ],
        },
      },
      {
        act: 'sneak',
        road: 'slip',
        label: 'Back off and come again at night',
        pass: {
          text: 'You mark where the pickets sit and slip away unseen. The camp will keep until you are ready for it.',
          line: 'scouts a deserters’ camp and backs away',
        },
      },
    ],
    opening:
      'Smoke rises from behind a palisade of sharpened stakes, and the face that looks over it is the face on the March’s posting.',
  },
  {
    id: 'goal-herb-run-ledge',
    kind: 'place',
    title: 'Herbs for the alchemy shop',
    where: { terrain: ['karst', 'hills', 'forest', 'plains'], site: ['herb-valley'] },
    goal: 'herb-run',
    bands: [0, 3],
    weight: 2,
    place: {
      traffic: 'wilds',
      features: [
        { name: 'the herb beds', tags: ['cover', 'fragile'] },
        { name: 'a stream through the valley', tags: ['water', 'crossing'] },
      ],
    },
    roles: [],
    exits: [
      {
        act: 'gather',
        road: 'take',
        label: 'Gather what the posting asked for',
        pass: {
          text: 'The beds are where the posting said. You cut them clean at the root, taking only the half you need and leaving the roots to seed.',
          line: 'gathers herbs from a hidden ledge for a posting',
          stakes: [
            {
              do: 'find',
              things: [
                'thunderhead-clover',
                'pit-edge-nettle',
                'beast-blood-vine',
                'moon-sea-grape',
              ],
              n: [3, 5],
            },
          ],
        },
      },
      {
        act: 'leave',
        road: 'pass',
        label: 'Leave it for another season',
        pass: {
          text: 'The beds are thin this year. You leave them to seed and go back the way you came.',
          line: 'leaves a thin herb bed to seed',
        },
      },
    ],
    opening:
      'A ledge opens in the rock above you, and its floor is a green so deep it looks black in the shade.',
  },
  {
    id: 'goal-patrol-checkpoint',
    kind: 'cultivator',
    title: 'A smuggler at the barrier pole',
    where: { road: 'on', site: ['checkpoint'] },
    goal: 'patrol',
    bands: [0, 3],
    weight: 2,
    place: {
      traffic: 'road',
      features: [
        { name: 'the barrier pole and the guard hut', tags: ['narrow', 'witnesses'] },
        { name: 'the beacon road', tags: ['witnesses'] },
      ],
    },
    roles: [
      {
        id: 'smuggler',
        name: 'a Night Bridge smuggler trying the barrier',
        who: { roster: 'night-bridge-smuggler' },
        motives: ['greed', 'fear'],
      },
      {
        id: 'carriers',
        name: 'the carriers behind him',
        who: { mortal: 'mortal-bandit' },
        count: [2, 3],
        motives: ['greed'],
      },
    ],
    exits: [
      {
        act: 'attack',
        road: 'fight',
        label: 'Stop him at the pole',
        against: 'smuggler',
        pass: {
          text: 'He is over the pole in one jump, and you catch him with the other foot still in the air. The carriers drop their loads and run.',
          line: 'stops a Night Bridge smuggler at a checkpoint',
          stakes: [{ do: 'loot' }, { do: 'karma', n: 1 }],
        },
        short: {
          text: 'He throws something that bursts into smoke, and by the time you can see he is long over the hill, and your purse with him.',
          line: 'loses a smuggler at the barrier pole in a cloud of smoke',
          stakes: [{ do: 'robbed', share: 0.3, item: false }],
        },
      },
      {
        act: 'threaten',
        road: 'talk',
        label: 'Make him turn back',
        against: 'smuggler',
        pass: {
          text: 'You step in front of the pole and let him feel what he is up against. He turns the mule round without a word.',
          line: 'turns a Night Bridge smuggler back from a checkpoint',
        },
      },
    ],
    opening:
      'A mule train has stopped at the barrier pole, and the man at its head has the look of someone doing sums against a guard’s patience.',
  },
  {
    id: 'goal-core-hunt-boar',
    kind: 'beast',
    title: 'A boar grown fat on a beast core',
    where: { terrain: ['forest', 'hills'], site: ['den', 'cave'] },
    goal: 'core-hunt',
    bands: [1, 3],
    weight: 2,
    place: {
      traffic: 'wilds',
      features: [
        { name: 'roots over a hollow', tags: ['cover', 'dark'] },
        { name: 'a fallen trunk', tags: ['height', 'burnable'] },
      ],
    },
    roles: [
      {
        id: 'boar',
        name: 'the stone-skin boar with a core',
        who: { roster: 'stone-skin-boar' },
        band: 1,
      },
    ],
    exits: [
      {
        act: 'attack',
        road: 'fight',
        label: 'Take it down and cut out the core',
        pass: {
          text: 'Its stone skin cracks under the third blow. You open it along the belly and find the core, warm and the size of a plum.',
          line: 'kills a core-bearing boar and cuts out its core',
          stakes: [{ do: 'loot' }],
        },
        short: {
          text: 'It goes through you like a cart through a fence, and then it is gone with its core and your dignity.',
          line: 'is gored by a core-bearing boar',
          stakes: [{ do: 'wound', share: 0.2, days: 7 }],
        },
      },
      {
        act: 'leave',
        road: 'pass',
        label: 'Leave it for now',
        pass: {
          text: 'You back out of the hollow before it turns its head, to come again with a better plan.',
          line: 'backs out of a core-bearing boar’s hollow',
        },
      },
    ],
    opening:
      'Scored bark, a wallow, and a heap of dung with a faint blue shine to it: the posting’s boar has been here.',
  },
  {
    id: 'goal-delivery-factor',
    kind: 'mortal',
    title: 'A sealed letter for a factor',
    where: { road: 'on', site: ['town', 'village', 'checkpoint'] },
    goal: 'delivery',
    bands: [0, 5],
    weight: 2,
    place: {
      traffic: 'road',
      features: [
        { name: 'a counting-house door with a lantern', tags: ['witnesses', 'fire'] },
        { name: 'bales stacked under oilcloth', tags: ['burnable', 'cover'] },
      ],
    },
    roles: [
      {
        id: 'factor',
        name: 'a salt factor at the counting-house',
        who: { mortal: 'salt-peddler' },
        motives: ['greed', 'duty'],
      },
    ],
    exits: [
      {
        act: 'deliver',
        road: 'pass',
        label: 'Hand over the letter',
        against: 'factor',
        pass: {
          text: 'He breaks the seal, reads it twice and counts out your fee from a box under the table, then writes you a receipt.',
          line: 'delivers a letter to a salt factor',
          stakes: [
            { do: 'stones', n: 18 },
            { do: 'memory', role: 'factor', row: 'service' },
          ],
        },
      },
      {
        act: 'hide',
        road: 'slip',
        label: 'Slip the letter under the door',
        pass: {
          text: 'You push it under the door, and walk on before anyone can say there is no fee for a letter not handed over.',
          line: 'slips a letter under a counting-house door',
        },
      },
    ],
    opening:
      'A lantern burns over a counting-house door in daylight, and the man beneath it has been watching the road for a letter.',
  },
  {
    id: 'goal-escort-wagons',
    kind: 'cultivator',
    title: 'Raiders on the caravan’s road',
    where: { road: 'on', terrain: ['plains', 'steppe', 'hills'] },
    goal: 'escort',
    bands: [0, 4],
    weight: 2,
    place: {
      traffic: 'road',
      features: [
        { name: 'a wagon with a broken axle', tags: ['fragile', 'burnable'] },
        { name: 'a ridge above the road', tags: ['height', 'cover'] },
      ],
    },
    roles: [
      {
        id: 'raiders',
        name: 'half-blood raiders off the grass',
        who: { roster: 'half-blood-raider' },
        count: [2, 3],
        motives: ['greed', 'pride'],
      },
    ],
    exits: [
      {
        act: 'attack',
        road: 'fight',
        label: 'Hold the wagons',
        pass: {
          text: 'They come down off the ridge screaming, and you meet them at the lead wagon. The drivers are still shaking when the last one rides away.',
          line: 'holds a caravan’s wagons against raiders off the grass',
          stakes: [{ do: 'loot' }, { do: 'karma', n: 1 }],
        },
        short: {
          text: 'The wagons burn, and the raiders take what they can ride off with. You come to under the lead wagon, ringing like a bell.',
          line: 'fails to hold a caravan against raiders',
          stakes: [{ do: 'wound', share: 0.25, days: 8 }],
        },
      },
      {
        act: 'threaten',
        road: 'talk',
        label: 'Warn them off from the road',
        against: 'raiders',
        pass: {
          text: 'You stand on the lead wagon and let them feel it. They turn their horses back toward the grass.',
          line: 'warns raiders off a caravan’s road',
        },
      },
    ],
    opening:
      'Dust rises behind the ridge, too much for a herd, and the carters begin to look at you as if you had a say in it.',
  },
];
