// The seclusion deck (design § Story cards and events, seclusion is quiet, not silent): what
// happens while you sit, in the design's five kinds: at the door, inside you, sky and season,
// named days, and people. The deck comes at its pace (DECK_PACE in index.ts), about one card every
// few real minutes, so every card here only says when it can come; named days keep their own
// daily chance on their day of the year. A few are small interactions with steps: haggling with a
// peddler, tracking a thief through the karst, sitting out a storm watch by watch, and a question
// at the yearly lecture. Every default is free, and a long absence settles them as a story.
// Cards are written in the second person, chronicle lines as a biography that opens on {name}.
// Drafted in P1.8 for Jan's review.
import type { Card } from './schema.ts';

const DECK = 'seclusion';

export const SECLUSION_CARDS: readonly Card[] = [
  // ------------------------------------------------------------ at the door
  {
    id: 'peddler-pill',
    deck: DECK,
    kind: 'door',
    title: 'A Pill at the Door',
    text: '{peddler} pulls his cart up to the mouth of your cave and opens a lacquered box: a Qi Gathering Pill, the real thing, he swears. Twenty spirit stones, and not a stone less.',
    trigger: { daysLived: [30] },
    cooldown: 600,
    choices: [
      {
        label: 'Send him on his way',
        pass: {
          effects: [{ do: 'person', who: 'peddler' }],
          text: 'He shrugs, snaps the box shut and rattles off down the slope.',
          chronicle: '{name} sends {peddler} and his pills on down the road.',
        },
      },
      {
        label: 'Pay twenty',
        cost: { stones: 20 },
        pass: {
          effects: [
            { do: 'fuel', ladder: 'qi', share: 0.25 },
            { do: 'person', who: 'peddler', regard: 1 },
          ],
          text: 'You swallow it on the spot. It is real, mostly: qi rolls through you like warm river water.',
          chronicle: '{name} buys a Qi Gathering Pill from {peddler} at full price.',
        },
      },
      {
        label: 'Haggle',
        pass: {
          effects: [{ do: 'person', who: 'peddler' }],
          text: 'You laugh at twenty. {peddler} laughs back, louder.',
          next: 'sixteen',
        },
      },
    ],
    steps: {
      sixteen: {
        text: '"Sixteen," says {peddler}, "and you are robbing a poor man\'s children."',
        choices: [
          {
            label: 'Walk away',
            pass: {
              effects: [],
              text: 'You leave him with his children and his pill.',
              chronicle: '{name} haggles {peddler} down to sixteen stones and walks away anyway.',
            },
          },
          {
            label: 'Pay sixteen',
            cost: { stones: 16 },
            pass: {
              effects: [{ do: 'fuel', ladder: 'qi', share: 0.25 }],
              text: 'Sixteen stones, one pill, and warm river water in your meridians.',
              chronicle: '{name} haggles {peddler} down to sixteen stones for a Qi Gathering Pill.',
            },
          },
          {
            label: 'Push harder',
            check: { attribute: 'fortune', against: 10 },
            pass: {
              effects: [],
              text: 'He clutches his chest as if you had stabbed him, and names a lower number.',
              next: 'twelve',
            },
            fail: {
              effects: [{ do: 'person', who: 'peddler', regard: -1 }],
              text: 'He snaps the box shut. No pill for a skinflint, and he will remember your face.',
              chronicle: '{name} haggles too hard, and {peddler} takes his pill elsewhere.',
            },
          },
        ],
      },
      twelve: {
        text: '"Twelve. Twelve, and may your meridians knot."',
        choices: [
          {
            label: 'Walk away',
            pass: {
              effects: [{ do: 'person', who: 'peddler', regard: -1 }],
              text: 'You walk away from twelve. He shouts things after you that would curdle milk.',
              chronicle:
                '{name} beats {peddler} down to twelve stones, then walks away from the pill.',
            },
          },
          {
            label: 'Pay twelve',
            cost: { stones: 12 },
            pass: {
              effects: [{ do: 'fuel', ladder: 'qi', share: 0.25 }],
              text: 'He takes your twelve stones and curses you cheerfully all the way down the slope.',
              chronicle:
                '{name} beats {peddler} down to twelve stones for a Qi Gathering Pill, and is cursed cheerfully for it.',
            },
          },
        ],
      },
    },
  },
  {
    id: 'junior-begging',
    deck: DECK,
    kind: 'door',
    title: 'A Knot in the Arm',
    text: 'A girl of eleven or so is waiting at the mouth of your cave, her sleeve wet. {junior}, she says her name is. There is a knot in her arm meridian that no one will look at, and the burn of it keeps her awake.',
    trigger: { daysLived: [90], notFlags: ['helped-ning'] },
    cooldown: 1000,
    choices: [
      {
        label: 'Tell her to find someone else',
        pass: {
          effects: [{ do: 'person', who: 'junior' }],
          text: 'She bows too low and goes. You hear her crying halfway down the slope.',
          chronicle: '{name} turns {junior} away from the door.',
        },
      },
      {
        label: 'Spend a few days on her knot',
        check: { attribute: 'aptitude', against: 8 },
        pass: {
          effects: [
            { do: 'fuel', ladder: 'qi', share: -0.05 },
            { do: 'insight', n: 8 },
            { do: 'flag', id: 'helped-ning' },
            { do: 'person', who: 'junior', tie: 'junior', regard: 2 },
          ],
          text: "Three days of easing qi along a child's arm teaches you more about your own than a month alone. The knot gives, and she bows until her forehead touches stone.",
          chronicle:
            "{name} spends three days easing the knot in {junior}'s meridian, and learns from it.",
          kind: 'learned',
        },
        fail: {
          effects: [
            { do: 'fuel', ladder: 'qi', share: -0.05 },
            { do: 'flag', id: 'helped-ning' },
            { do: 'person', who: 'junior', tie: 'junior', regard: 1 },
          ],
          text: 'You cannot shift it, but you dull the burn. She thanks you anyway, which is worse.',
          chronicle: "{name} tries to ease {junior}'s knotted meridian and only dulls the pain.",
        },
      },
    ],
  },
  {
    id: 'tax-collector',
    deck: DECK,
    kind: 'door',
    title: 'The Levy',
    text: 'A levy man climbs to your cave with a ledger and two spearmen. The March taxes cultivators by the layer, he says, and your name is on his list.',
    trigger: { daysLived: [60], choice: 'along' },
    cooldown: 480,
    choices: [
      {
        label: 'Pay the levy',
        pass: {
          effects: [{ do: 'stones', n: -5 }],
          text: 'He writes your name and a small number, and goes.',
          chronicle: "{name} pays the March's levy on cultivators.",
        },
      },
      {
        label: 'Argue that seclusion is service',
        check: { attribute: 'aptitude', against: 11 },
        pass: {
          effects: [],
          text: 'He laughs, but he writes "in service" beside your name and goes.',
          chronicle: '{name} talks the levy man into writing "in service" beside {their} name.',
        },
        fail: {
          effects: [{ do: 'stones', n: -8 }],
          text: 'He hears you out, then charges you extra for the time it took.',
          chronicle: '{name} argues with the levy man and pays extra for it.',
        },
      },
    ],
  },
  {
    id: 'gang-toll',
    deck: DECK,
    kind: 'door',
    title: 'A Toll for Quiet',
    text: 'Two lads from a street gang have found your hideout. For a small toll, they say, they will keep forgetting where it is.',
    trigger: { daysLived: [60], choice: 'refuse' },
    cooldown: 480,
    choices: [
      {
        label: 'Pay them off',
        pass: {
          effects: [{ do: 'stones', n: -4 }],
          text: 'Four stones buys a season of their bad memory.',
          chronicle: '{name} pays a street gang to forget where {they} hide.',
        },
      },
      {
        label: 'Show them your qi',
        check: { attribute: 'agility', against: 10 },
        pass: {
          effects: [],
          text: "A palm into the rock beside one lad's ear, and they remember somewhere else to be.",
          chronicle:
            "{name} puts a palm print in the rock beside a gang lad's ear, and pays no toll.",
        },
        fail: {
          effects: [
            { do: 'injury', ladder: 'qi', days: 10 },
            { do: 'stones', n: -4 },
          ],
          text: 'There are more than two of them, it turns out. They take the toll and a little extra out of your ribs.',
          chronicle:
            '{name} tries to face down a street gang and pays the toll with bruises on top.',
          kind: 'hurt',
        },
      },
    ],
  },
  {
    id: 'beast-sniffing',
    deck: DECK,
    kind: 'door',
    title: 'Something at the Mouth',
    text: 'Something heavy is snuffling round the mouth of the cave in the dark: a stone-hide boar by the smell, drawn by the qi you are leaking.',
    trigger: { daysLived: [40] },
    cooldown: 600,
    choices: [
      {
        label: 'Hold your breath small and wait',
        pass: {
          effects: [{ do: 'fuel', ladder: 'qi', share: -0.01 }],
          text: 'You sit with your breath held small until dawn, and it wanders off.',
          chronicle:
            '{name} sits out a stone-hide boar at the cave mouth with {their} breath held small.',
        },
      },
      {
        label: 'Drive it off',
        check: { attribute: 'agility', against: 10 },
        pass: {
          effects: [
            { do: 'stones', n: 6 },
            { do: 'fuel', ladder: 'body', share: 0.05 },
          ],
          text: 'It breaks a tusk on your doorpost and runs. A herbalist in the valley pays six stones for the tusk.',
          chronicle:
            '{name} drives a stone-hide boar from the cave and sells the tusk it left behind.',
          kind: 'fight',
        },
        fail: {
          effects: [{ do: 'injury', ladder: 'body', days: 20 }],
          text: 'It drives you off instead, and roots through your things before it goes.',
          chronicle: '{name} is tossed by a stone-hide boar at {their} own door.',
          kind: 'hurt',
        },
      },
    ],
  },
  {
    id: 'thief',
    deck: DECK,
    kind: 'door',
    title: 'Small Footprints',
    text: 'Your stone pouch is lighter than you left it, and there are small bare footprints in the dust by the wall.',
    trigger: { daysLived: [60], minStones: 10 },
    cooldown: 800,
    urgent: { days: 5 },
    choices: [
      {
        label: 'Let it go',
        pass: {
          effects: [{ do: 'stones', n: -8 }],
          text: 'You count what is left and move the pouch somewhere smarter.',
          chronicle: "A thief lightens {name}'s pouch by eight stones.",
          kind: 'hurt',
        },
      },
      {
        label: 'Follow the tracks',
        pass: {
          effects: [],
          text: 'The prints lead out of the cave and down into the karst.',
          next: 'karst',
        },
      },
    ],
    steps: {
      karst: {
        text: 'The karst is stone pocked like old bread, and every hollow could hold a thief. Somewhere ahead, a pebble rolls.',
        choices: [
          {
            label: 'Give it up',
            pass: {
              effects: [{ do: 'stones', n: -8 }],
              text: 'You climb back out, eight stones poorer and dusty to the knee.',
              chronicle:
                '{name} tracks a thief into the karst and gives up the trail, eight stones the poorer.',
            },
          },
          {
            label: 'Read the stone',
            check: { attribute: 'aptitude', against: 9 },
            pass: {
              effects: [],
              text: 'Scuffs on wet limestone, a thread of cloth on a thorn: you have them.',
              next: 'cornered',
            },
            fail: {
              effects: [{ do: 'stones', n: -8 }],
              text: 'The trail splits into a dozen hollows, and you lose it.',
              chronicle: "{name} loses a thief's trail in the karst, eight stones the poorer.",
            },
          },
        ],
      },
      cornered: {
        text: 'At the bottom of a sinkhole: a boy of nine with your pouch clutched to his chest, too frightened to cry.',
        choices: [
          {
            label: 'Take your stones back',
            pass: {
              effects: [],
              text: 'You take the pouch. He runs the moment you step aside.',
              chronicle:
                '{name} tracks a thief through the karst and takes {their} stones back from a frightened boy.',
            },
          },
          {
            label: 'Let him keep a few',
            pass: {
              effects: [
                { do: 'stones', n: -3 },
                { do: 'insight', n: 4 },
                { do: 'flag', id: 'kind-to-thief' },
              ],
              text: 'You take back five and leave him three. He looks at you as if you were mad.',
              chronicle: '{name} corners a thief in the karst and lets the boy keep three stones.',
            },
          },
        ],
      },
    },
  },
  {
    id: 'sect-summons',
    deck: DECK,
    kind: 'door',
    title: 'Summons',
    text: 'A runner from {place} brings a summons: every cultivator of the lower layers is to stand ten days of duty.',
    trigger: { daysLived: [180], choice: 'along', people: ['mentor'] },
    cooldown: 720,
    choices: [
      {
        label: 'Answer it',
        pass: {
          effects: [
            { do: 'fuel', ladder: 'qi', share: -0.03 },
            { do: 'stones', n: 6 },
            { do: 'person', who: 'mentor', regard: 1 },
          ],
          text: 'Ten days of standing in the wind, six stones of duty pay, and a nod from {mentor}.',
          chronicle: '{name} answers a summons from {place} and stands ten days of duty.',
        },
      },
      {
        label: 'Plead seclusion',
        check: { attribute: 'fortune', against: 10 },
        pass: {
          effects: [],
          text: 'The runner shrugs and crosses your name off.',
          chronicle: '{name} pleads seclusion and is excused from duty.',
        },
        fail: {
          effects: [{ do: 'person', who: 'mentor', regard: -1 }],
          text: 'The runner crosses your name off, and {mentor} hears of it.',
          chronicle: '{name} pleads seclusion against a summons, and {mentor} hears of it.',
        },
      },
    ],
  },

  // Formulas, the world's smallest manuals (design § Cultivation, Manuals). Drafted in P1.10.
  {
    id: 'breath-count-for-sale',
    deck: DECK,
    kind: 'door',
    title: 'A Breath-Count for Sale',
    text: "{peddler} has a scrap of paper folded into his sleeve: the March garrison's breath-count, copied out by a cadet who needed stones more than he needed his place. Any garrison sergeant would know it by heart. Twelve spirit stones.",
    trigger: { daysLived: [150], noManual: 'garrison-breath-count' },
    once: true,
    choices: [
      {
        label: 'Not today',
        pass: {
          effects: [{ do: 'person', who: 'peddler' }],
          text: 'He tucks it back into his sleeve. "It will keep. Cadets keep selling them."',
          chronicle: "{name} turns down a garrison breath-count from {peddler}'s sleeve.",
        },
      },
      {
        label: 'Pay twelve',
        cost: { stones: 12 },
        pass: {
          effects: [
            { do: 'copy', id: 'manual:garrison-breath-count' },
            { do: 'person', who: 'peddler', regard: 1 },
          ],
          text: 'In on four, hold for one, out on four. It is crude, and the cadet copied it badly; a few weeks over it on your study hours and the count will be yours.',
          chronicle: '{name} buys the Garrison Breath-Count from {peddler} for twelve stones.',
          kind: 'learned',
        },
      },
    ],
  },
  {
    id: 'fevered-courier',
    deck: DECK,
    kind: 'door',
    title: 'A Courier with River Fever',
    text: "A courier of the bounty office in the City of the Guarded Mouth stumbles to the mouth of your cave, shaking with river fever, a waxed tube clamped under his arm. The garrison healer is half a day's walk down the valley.",
    trigger: { daysLived: [300], qi: { minStage: 3 }, noManual: 'tide-counting' },
    once: true,
    choices: [
      {
        label: 'Point him down the valley',
        pass: {
          effects: [],
          text: 'You give him water and point the way. He goes, slowly, tube and all.',
          chronicle: '{name} sends a fevered courier down the valley to the garrison healer.',
        },
      },
      {
        label: 'Nurse him through it',
        pass: {
          effects: [
            { do: 'fuel', ladder: 'qi', share: -0.1 },
            { do: 'copy', id: 'manual:tide-counting' },
          ],
          text: 'Three nights of cold cloths and your own qi pressed into his chest. On the fourth morning he can stand, and he leaves you the copy he was carrying: the Tide-Counting Formula the dockside couriers breathe by.',
          chronicle:
            '{name} nurses a courier of the Guarded Mouth through river fever, and is left the Tide-Counting Formula.',
          kind: 'learned',
        },
      },
    ],
  },

  // ------------------------------------------------------------ inside you
  {
    id: 'qi-deviation-scare',
    deck: DECK,
    kind: 'within',
    title: 'The Breath Turns',
    text: 'Your qi has pressed at the gate so long it has begun to turn: a heat under the ribs, a buzzing in the teeth, the breath running backward for a heartbeat.',
    trigger: { qi: { minFill: 1.4 } },
    cooldown: 360,
    weight: 2,
    choices: [
      {
        label: 'Stop, and let it bleed off',
        pass: {
          effects: [{ do: 'fuel', ladder: 'qi', share: -0.05 }],
          text: 'You stop for three days and let the excess bleed away into the stone.',
          chronicle: '{name} lets overfull qi bleed off before it turns.',
        },
      },
      {
        label: 'Ride it round the small circuit',
        check: { attribute: 'aptitude', against: 11 },
        pass: {
          effects: [{ do: 'insight', n: 12 }],
          text: 'You ride the heat round the small circuit nine times until it runs smooth, and something about the gate makes sense that did not before.',
          chronicle: '{name} rides a qi deviation round the small circuit and comes out wiser.',
          kind: 'learned',
        },
        fail: {
          effects: [
            { do: 'injury', ladder: 'qi', days: 20 },
            { do: 'fuel', ladder: 'qi', share: -0.1 },
          ],
          text: 'It bucks you. You come to on the cave floor with a taste of iron.',
          chronicle: '{name} is thrown by a qi deviation and left lightly injured.',
          kind: 'hurt',
        },
      },
    ],
  },
  {
    id: 'epiphany',
    deck: DECK,
    kind: 'within',
    title: 'A Drop of Water',
    text: 'Watching a drop of water work its way down the cave wall, something you have circled for months suddenly lies flat and plain in front of you.',
    trigger: { daysLived: [120] },
    cooldown: 480,
    choices: [
      {
        label: 'Write it down',
        pass: {
          effects: [{ do: 'insight', n: 10 }],
          text: 'You scratch it into the wall before it can leave.',
          chronicle: '{name} glimpses a principle in a drop of water and writes it down.',
          kind: 'learned',
        },
      },
      {
        label: 'Chase it',
        check: { attribute: 'aptitude', against: 10 },
        pass: {
          effects: [{ do: 'insight', n: 25 }],
          text: 'You follow it down past the drop, past the wall, into the stone itself. When you come back the lamp is out.',
          chronicle: '{name} chases an epiphany from a drop of water down into the stone.',
        },
        fail: {
          effects: [{ do: 'insight', n: 3 }],
          text: 'It slips away the harder you look.',
          chronicle: '{name} chases an epiphany and keeps only its tail.',
        },
      },
    ],
  },
  // A moment on the Intent ladder (core/intent.ts): it comes only while a Dao's capstone has made
  // you ready, and names that Dao. Held for later, it comes again.
  {
    id: 'dao-epiphany',
    deck: DECK,
    kind: 'within',
    title: 'One Stroke',
    text: 'Your hands are running the {dao} forms they have run ten thousand times when the forms stop being forms. For one breath every stroke of the {dao} Dao is the same stroke, and {intent} is a step away.',
    trigger: { intentReady: true },
    weight: 3,
    cooldown: 60,
    choices: [
      {
        label: 'Take the step',
        pass: {
          effects: [{ do: 'moment' }],
          text: 'You step through, and the Dao steps with you. Nothing you hold will be held the same way again.',
          chronicle: '{name} stops in the middle of a form and does not move again until dusk.',
        },
      },
      {
        label: 'Let it close for now',
        pass: {
          effects: [{ do: 'insight', n: 10 }],
          text: 'You let it close. The door is still there, and now you know where it stands.',
          chronicle: '{name} glimpses the whole of a Dao and lets it close again.',
          kind: 'learned',
        },
      },
    ],
  },
  {
    id: 'white-city-dream',
    deck: DECK,
    kind: 'within',
    title: 'The White City',
    text: 'You dream of a city of white stone above the clouds, and a voice there that knows your name. You wake with the shape of a word on your tongue.',
    trigger: { daysLived: [200] },
    cooldown: 720,
    choices: [
      {
        label: 'Let it fade',
        pass: {
          effects: [{ do: 'insight', n: 4 }],
          text: 'It fades by breakfast, leaving only a taste.',
          chronicle: '{name} dreams of a white city above the clouds.',
        },
      },
      {
        label: 'Sit with it until dawn',
        check: { attribute: 'fortune', against: 11 },
        pass: {
          effects: [
            { do: 'insight', n: 15 },
            { do: 'fuel', ladder: 'soul', share: 0.05 },
          ],
          text: 'You hold the word until the sky greys. It does not stay, but it leaves a door ajar.',
          chronicle:
            '{name} dreams of a white city above the clouds, and holds its word until dawn.',
        },
        fail: {
          effects: [{ do: 'insight', n: 2 }],
          text: 'By dawn it is only a dream.',
          chronicle: '{name} dreams of a white city above the clouds, and loses its word by dawn.',
        },
      },
    ],
  },
  {
    id: 'meridian-knot',
    deck: DECK,
    kind: 'within',
    title: 'A Knotted Channel',
    text: 'A knot in the Hand Yangming channel: qi pools behind it like water behind a fallen tree.',
    trigger: { qi: { minStage: 4 } },
    cooldown: 600,
    choices: [
      {
        label: 'Work round it',
        pass: {
          effects: [{ do: 'fuel', ladder: 'qi', share: -0.01 }],
          text: 'Slow going, but it holds, and in a month the knot dissolves on its own.',
          chronicle: '{name} works patiently round a knotted channel.',
        },
      },
      {
        label: 'Force it open',
        check: { attribute: 'aptitude', against: 10 },
        pass: {
          effects: [{ do: 'fuel', ladder: 'qi', share: 0.12 }],
          text: 'It bursts, and the backed-up qi floods on down the channel all at once.',
          chronicle: '{name} forces a knotted channel open in one push.',
        },
        fail: {
          effects: [{ do: 'injury', ladder: 'qi', days: 15 }],
          text: 'The knot holds, and the channel behind it bruises.',
          chronicle: '{name} bruises a channel forcing a knot that would not give.',
          kind: 'hurt',
        },
      },
    ],
  },
  {
    id: 'whisper',
    deck: DECK,
    kind: 'within',
    title: 'A Voice Like Yours',
    text: 'In the deepest part of a sitting, a voice that sounds like yours remarks how much faster all this would go with a little blood.',
    trigger: { daysLived: [300] },
    cooldown: 960,
    choices: [
      {
        label: 'Open your eyes',
        pass: {
          effects: [],
          text: 'You open your eyes and the voice goes. You do not sleep well.',
          chronicle: '{name} hears a whisper in the deep of a sitting and opens {their} eyes.',
        },
      },
      {
        label: 'Listen a while',
        check: { attribute: 'aptitude', against: 12 },
        pass: {
          effects: [{ do: 'insight', n: 15 }],
          text: 'You listen, and learn the shape of the thing that will one day try to eat you.',
          chronicle: '{name} listens to the whisper in {their} sitting, and learns its shape.',
          kind: 'learned',
        },
        fail: {
          effects: [{ do: 'injury', ladder: 'soul', days: 30 }],
          text: 'It talks for a long time. You come back cold to the marrow.',
          chronicle:
            '{name} listens too long to a whisper in seclusion and comes back with a chill in the soul.',
          kind: 'hurt',
        },
      },
    ],
  },

  // ------------------------------------------------------------ sky and season
  {
    id: 'thunderstorm',
    deck: DECK,
    kind: 'sky',
    title: 'Storm over the Peak',
    text: 'A thunderstorm parks itself over the peak. Lightning walks the ridge, and the air in the cave tastes of metal and qi.',
    trigger: { daysLived: [60], season: ['summer'] },
    cooldown: 600,
    choices: [
      {
        label: 'Seal the cave and sit it out',
        pass: {
          effects: [],
          text: 'You pull the hide across the entrance and wait for the noise to pass.',
          chronicle: '{name} seals the cave and sits out a summer storm.',
        },
      },
      {
        label: 'Sit at the cave mouth',
        pass: {
          effects: [{ do: 'insight', n: 5 }],
          text: "You sit where the rain spits in and let the storm's qi wash through you. Your skin prickles.",
          next: 'second-watch',
        },
      },
    ],
    steps: {
      'second-watch': {
        text: 'The second watch. The storm is directly overhead, and every strike shakes dust from the ceiling.',
        choices: [
          {
            label: 'Go back in',
            pass: {
              effects: [],
              text: 'You crawl back to your mat with your hair standing on end.',
              chronicle:
                '{name} sits a watch of a summer storm at the cave mouth, and goes in with {their} hair on end.',
            },
          },
          {
            label: 'Hold your seat',
            check: { attribute: 'agility', against: 9 },
            pass: {
              effects: [
                { do: 'insight', n: 8 },
                { do: 'var', id: 'steady', n: 1 },
              ],
              text: 'A strike lands close enough to blind you. You hold your seat.',
              next: 'last-watch',
            },
            fail: {
              effects: [{ do: 'injury', ladder: 'body', days: 15 }],
              text: 'A strike lands close and throws you against the wall. You crawl back to your seat.',
              next: 'last-watch',
            },
          },
        ],
      },
      'last-watch': {
        text: 'The last watch. The storm is moving off along the ridge, slower now, grumbling.',
        choices: [
          {
            label: 'Let it go',
            pass: {
              effects: [{ do: 'insight', n: 4 }],
              text: 'You let it go, and keep what it left you.',
              chronicle:
                '{name} sits through a summer storm watch by watch, and keeps a little of its understanding.',
              kind: 'learned',
            },
          },
          {
            label: 'Climb to the ridge after it',
            when: { id: 'steady', min: 1 },
            check: { attribute: 'aptitude', against: 11 },
            pass: {
              effects: [
                { do: 'insight', n: 25 },
                { do: 'fuel', ladder: 'body', share: 0.05 },
              ],
              text: 'You stand on the ridge as the last strike comes down a hundred paces off, and for a moment you understand how lightning chooses.',
              chronicle:
                '{name} follows a storm up onto the ridge and comes down knowing how lightning chooses.',
              kind: 'learned',
            },
            fail: {
              effects: [{ do: 'injury', ladder: 'body', days: 30 }],
              text: 'The last strike chooses the rock beside you. You wake up at the bottom of the scree.',
              chronicle:
                '{name} chases a storm onto the ridge and is thrown down by its last strike.',
              kind: 'hurt',
            },
          },
        ],
      },
    },
  },
  {
    id: 'spirit-tide',
    deck: DECK,
    kind: 'sky',
    title: 'Spirit Tide',
    text: "A spirit tide: once in a few years the earth's veins swell, and for a day the qi in the cave is thick enough to taste.",
    trigger: { daysLived: [60] },
    cooldown: 720,
    choices: [
      {
        label: 'Cultivate through the day',
        pass: {
          effects: [{ do: 'fuel', ladder: 'qi', share: 0.08 }],
          text: 'You breathe steadily through the whole of it, and bank what you can.',
          chronicle: '{name} cultivates through a spirit tide.',
        },
      },
      {
        label: 'Drink deep',
        check: { attribute: 'aptitude', against: 10 },
        pass: {
          effects: [{ do: 'fuel', ladder: 'qi', share: 0.18 }],
          text: 'You open every channel and drink until the tide goes out.',
          chronicle: '{name} drinks deep of a spirit tide.',
        },
        fail: {
          effects: [
            { do: 'fuel', ladder: 'qi', share: 0.05 },
            { do: 'injury', ladder: 'qi', days: 10 },
          ],
          text: 'You swallow it too fast, and spend the next days coughing it back up.',
          chronicle: '{name} gulps at a spirit tide and chokes on it.',
          kind: 'hurt',
        },
      },
    ],
  },
  {
    id: 'yin-night',
    deck: DECK,
    kind: 'sky',
    title: 'Yin Night',
    text: 'A yin night: no moon, a cold that comes up out of the stone, and shapes at the edge of the lamplight that are not quite shadows.',
    trigger: { daysLived: [90], season: ['autumn', 'winter'] },
    cooldown: 480,
    choices: [
      {
        label: 'Keep the lamp lit',
        pass: {
          effects: [{ do: 'fuel', ladder: 'soul', share: 0.03 }],
          text: 'You feed the lamp all night and watch the shapes not come any closer.',
          chronicle: '{name} keeps a lamp lit through a yin night.',
        },
      },
      {
        label: 'Put the lamp out and sit in the dark',
        check: { attribute: 'aptitude', against: 11 },
        pass: {
          effects: [
            { do: 'fuel', ladder: 'soul', share: 0.12 },
            { do: 'insight', n: 6 },
          ],
          text: 'In the dark the cold becomes something you can hold, and your soul drinks it.',
          chronicle:
            '{name} sits through a yin night in the dark and lets the soul drink the cold.',
        },
        fail: {
          effects: [{ do: 'injury', ladder: 'soul', days: 20 }],
          text: 'Something sits down beside you in the dark. You do not remember the rest.',
          chronicle: '{name} sits out a yin night in the dark and comes back with a shaken soul.',
          kind: 'hurt',
        },
      },
    ],
  },
  {
    id: 'first-snow',
    deck: DECK,
    kind: 'sky',
    title: 'First Snow',
    text: 'The first snow seals the pass below. Nobody will climb to your cave for a season, and the silence is so complete you can hear your own qi move.',
    trigger: { daysLived: [60], season: ['winter'] },
    cooldown: 420,
    choices: [
      {
        label: 'Sit with the silence',
        pass: {
          effects: [
            { do: 'insight', n: 6 },
            { do: 'fuel', ladder: 'qi', share: 0.03 },
          ],
          text: 'You listen to your qi move until you can tell its currents apart.',
          chronicle: '{name} listens to {their} own qi through the silence of the first snow.',
        },
      },
      {
        label: 'Go down and help dig out the village',
        pass: {
          effects: [
            { do: 'fuel', ladder: 'qi', share: -0.03 },
            { do: 'fuel', ladder: 'body', share: 0.04 },
            { do: 'stones', n: 3 },
          ],
          text: 'You shovel for three days. The villagers pay you in dried persimmons and three stones.',
          chronicle: '{name} comes down through the first snow to dig out the village.',
        },
      },
    ],
  },
  {
    id: 'spring-herbs',
    deck: DECK,
    kind: 'sky',
    title: "Dragon's-Whisker Grass",
    text: "Spring on the slope below the cave: dragon's-whisker grass coming up between the rocks, worth a few stones to the right herbalist.",
    trigger: { daysLived: [60], season: ['spring'] },
    cooldown: 420,
    choices: [
      {
        label: 'Gather what is easy',
        pass: {
          effects: [{ do: 'stones', n: 2 }],
          text: 'A basket from the lower slope, two stones from the herbalist.',
          chronicle: "{name} gathers dragon's-whisker grass on the slope below the cave.",
        },
      },
      {
        label: 'Search the high ledges',
        check: { attribute: 'agility', against: 10 },
        pass: {
          effects: [{ do: 'stones', n: 7 }],
          text: 'The best of it grows where the goats will not go. You go anyway, and come back with seven stones of it.',
          chronicle: "{name} climbs the high ledges for dragon's-whisker grass and sells it well.",
        },
        fail: {
          effects: [{ do: 'injury', ladder: 'body', days: 10 }],
          text: 'A ledge gives way. You keep your neck and lose the basket.',
          chronicle: "{name} falls from a ledge gathering dragon's-whisker grass.",
          kind: 'hurt',
        },
      },
    ],
  },
  {
    id: 'red-wind',
    deck: DECK,
    kind: 'sky',
    title: 'Red Wind',
    text: 'The autumn wind off the Wilds brings red dust and the smell of something burning a long way off.',
    trigger: { daysLived: [60], season: ['autumn'] },
    cooldown: 420,
    choices: [
      {
        label: 'Seal the cave',
        pass: {
          effects: [],
          text: 'You hang a wet cloth over the entrance and breathe through it until the wind drops.',
          chronicle: '{name} seals the cave against the red wind off the Wilds.',
        },
      },
      {
        label: 'Read the wind',
        check: { attribute: 'aptitude', against: 10 },
        pass: {
          effects: [{ do: 'insight', n: 8 }],
          text: 'Smoke from the beast lands, and too early: the herds are moving. You learn more from that smell than from a month of breathing.',
          chronicle: '{name} reads the red wind off the Wilds and learns the beasts are moving.',
        },
        fail: {
          effects: [],
          text: 'It smells of smoke. That is all it will tell you.',
          chronicle:
            '{name} tries to read the red wind off the Wilds and learns only that it stinks.',
        },
      },
    ],
  },

  // ------------------------------------------------------------ named days
  {
    id: 'new-year',
    deck: DECK,
    kind: 'named-day',
    title: 'New Year',
    text: 'New year. Firecrackers echo up from the valley, and someone has pinned a red paper charm at the mouth of your cave.',
    trigger: { daysLived: [30], yearDay: [0, 4], people: ['mentor'] },
    fixed: true,
    chance: 0.08,
    cooldown: 300,
    choices: [
      {
        label: 'Keep to your seclusion',
        pass: {
          effects: [{ do: 'insight', n: 3 }],
          text: 'You light a single stick of incense and go back to your breath.',
          chronicle: '{name} sees in the new year alone in seclusion.',
        },
      },
      {
        label: 'Go down for the feast',
        pass: {
          effects: [
            { do: 'fuel', ladder: 'qi', share: -0.03 },
            { do: 'person', who: 'mentor', regard: 1 },
          ],
          text: '{mentor} pours you a cup and says you have grown.',
          chronicle:
            '{name} comes down from seclusion for the new year and shares a cup with {mentor}.',
        },
      },
      {
        label: 'Burn incense for the ancestors',
        cost: { stones: 1 },
        pass: {
          effects: [{ do: 'insight', n: 5 }],
          text: 'The smoke goes straight up. The old people say that is good luck.',
          chronicle: '{name} burns incense for the ancestors at the new year.',
        },
      },
    ],
  },
  {
    id: 'lecture-day',
    deck: DECK,
    kind: 'named-day',
    title: 'Lecture Day',
    text: 'Lecture day at {place}: once a year an elder speaks on the Dao to every disciple who can fit in the yard.',
    trigger: { yearDay: [180, 186], choice: 'along', people: ['mentor'] },
    fixed: true,
    chance: 0.06,
    cooldown: 300,
    choices: [
      {
        label: 'Listen from the back',
        pass: {
          effects: [{ do: 'insight', n: 8 }],
          text: 'You catch one word in three, and the words you catch are worth it.',
          chronicle: '{name} listens to the yearly lecture at {place} from the back of the yard.',
        },
      },
      {
        label: 'Push to the front',
        pass: {
          effects: [{ do: 'insight', n: 8 }],
          text: 'You elbow your way to the front row. The elder finishes, pauses, and asks whether anyone has a question.',
          next: 'question',
        },
      },
    ],
    steps: {
      question: {
        text: "The yard goes quiet. The elder's eyes pass along the front row, and stop on you.",
        choices: [
          {
            label: 'Keep your head down',
            pass: {
              effects: [],
              text: 'The eyes move on. You breathe out.',
              chronicle:
                '{name} pushes to the front of the yearly lecture at {place}, and holds {their} tongue when the elder asks for questions.',
            },
          },
          {
            label: 'Ask about the gate',
            check: { attribute: 'aptitude', against: 11 },
            pass: {
              effects: [
                { do: 'insight', n: 20 },
                { do: 'person', who: 'mentor', regard: 1 },
              ],
              text: 'Your question is a good one. The elder answers it for a quarter of an hour, and {mentor} looks at you differently afterwards.',
              chronicle:
                '{name} asks the elder a question at the yearly lecture at {place}, good enough to be answered at length.',
            },
            fail: {
              effects: [{ do: 'person', who: 'mentor', regard: -1 }],
              text: 'Laughter. The elder answers kindly, which is worse, and {mentor} will not meet your eye.',
              chronicle:
                '{name} asks a question at the yearly lecture at {place} that draws laughter.',
            },
          },
        ],
      },
    },
  },
  {
    id: 'ghost-festival',
    deck: DECK,
    kind: 'named-day',
    title: 'The Hungry Dead',
    text: 'The fifteenth night of the seventh month, when the gates below open and the hungry dead walk. Down in the valley they are floating lanterns on the river.',
    trigger: { daysLived: [30], yearDay: [194, 197] },
    fixed: true,
    chance: 0.1,
    cooldown: 300,
    choices: [
      {
        label: 'Bar the cave and keep a lamp lit',
        pass: {
          effects: [],
          text: 'Something scratches at the hide over the entrance, once, and goes away.',
          chronicle: '{name} bars the cave against the hungry dead.',
        },
      },
      {
        label: 'Set out an offering',
        cost: { stones: 2 },
        pass: {
          effects: [
            { do: 'insight', n: 4 },
            { do: 'fuel', ladder: 'soul', share: 0.05 },
          ],
          text: 'Something takes it. In the morning the bowl is licked clean and you feel lighter.',
          chronicle: '{name} sets out an offering for the hungry dead.',
        },
      },
      {
        label: 'Walk among the lanterns',
        check: { attribute: 'fortune', against: 10 },
        pass: {
          effects: [{ do: 'insight', n: 10 }],
          text: 'You walk the riverbank among the lanterns and the living and the not, and no one follows you home.',
          chronicle: '{name} walks among the lanterns on the night of the hungry dead.',
        },
        fail: {
          effects: [{ do: 'injury', ladder: 'soul', days: 15 }],
          text: 'Someone follows you home. It takes a week to make them leave.',
          chronicle:
            '{name} walks among the lanterns on the night of the hungry dead, and is followed home.',
          kind: 'hurt',
        },
      },
    ],
  },
  {
    id: 'beast-tide',
    deck: DECK,
    kind: 'named-day',
    title: 'The Beast Tide',
    text: 'The beast tide: once every few years they come out of the Wilds in early summer, a river of hide and horn breaking against the walls.',
    trigger: { daysLived: [300], yearDay: [90, 110] },
    fixed: true,
    chance: 0.08,
    cooldown: 1000,
    choices: [
      {
        label: 'Stay in your cave and let it pass',
        pass: {
          effects: [{ do: 'fuel', ladder: 'qi', share: -0.01 }],
          text: 'For nine days the ground shakes and dust falls from the ceiling. Then it is quiet.',
          chronicle: '{name} waits out the beast tide in {their} cave.',
        },
      },
      {
        label: 'Go to the walls',
        check: { attribute: 'agility', against: 11 },
        pass: {
          effects: [
            { do: 'stones', n: 12 },
            { do: 'fuel', ladder: 'body', share: 0.08 },
          ],
          text: 'Nine days on the walls. You come down with a share of the cores and a body that has learned what it is for.',
          chronicle:
            '{name} holds the walls through the beast tide and comes down with a share of the cores.',
          kind: 'fight',
        },
        fail: {
          effects: [
            { do: 'injury', ladder: 'body', days: 40 },
            { do: 'stones', n: 4 },
          ],
          text: 'A horned thing comes over the parapet on the fourth day. You live, which is more than some.',
          chronicle: '{name} is gored on the walls in the beast tide, and lives.',
          kind: 'hurt',
        },
      },
    ],
  },

  // ------------------------------------------------------------ people
  {
    id: 'junior-returns',
    deck: DECK,
    kind: 'people',
    title: 'Yams and Questions',
    text: '{junior} is back, taller, with a basket of mountain yams and a shy question about the third layer.',
    trigger: { daysLived: [400], flags: ['helped-ning'] },
    once: true,
    weight: 2,
    choices: [
      {
        label: 'Answer what you can',
        pass: {
          effects: [
            { do: 'insight', n: 6 },
            {
              do: 'person',
              who: 'junior',
              regard: 1,
              realm: { realm: 'qi-condensation', stage: 3 },
            },
          ],
          text: 'Explaining the third layer to someone else shows you two things you had wrong about it.',
          chronicle:
            '{junior} returns with yams and questions, and {name} answers what {they} can.',
        },
      },
      {
        label: 'Take her on to run your errands',
        pass: {
          effects: [
            { do: 'stones', n: 3 },
            { do: 'flag', id: 'ning-runs-errands' },
            {
              do: 'person',
              who: 'junior',
              regard: 1,
              realm: { realm: 'qi-condensation', stage: 3 },
            },
          ],
          text: 'She sells your herbs in the valley for better prices than you ever got.',
          chronicle: '{name} takes {junior} on to run errands, and she brings back a few stones.',
          kind: 'people',
        },
      },
    ],
  },
  {
    id: 'rival-visit',
    deck: DECK,
    kind: 'people',
    title: 'A Cultivator of Your Year',
    text: '{rival}, a cultivator of your year, turns up at your door to see how far you have come, and to make sure you know how far he has.',
    trigger: { daysLived: [240], qi: { minStage: 3 }, notFlags: ['met-rival'] },
    once: true,
    choices: [
      {
        label: 'Let him boast',
        pass: {
          effects: [
            { do: 'flag', id: 'met-rival' },
            {
              do: 'person',
              who: 'rival',
              tie: 'rival',
              realm: { realm: 'qi-condensation', stage: 4 },
            },
          ],
          text: 'He talks for an hour about the fourth layer. You learn more about him than about it.',
          chronicle: '{name} meets {rival}, a cultivator of {their} year, and lets him boast.',
          kind: 'people',
        },
      },
      {
        label: 'Spar with him',
        check: { attribute: 'agility', against: 10 },
        pass: {
          effects: [
            { do: 'flag', id: 'met-rival' },
            { do: 'insight', n: 6 },
            {
              do: 'person',
              who: 'rival',
              tie: 'rival',
              regard: -1,
              realm: { realm: 'qi-condensation', stage: 4 },
            },
          ],
          text: 'You put him on his back in the dust. He gets up smiling, which is how you know he will not forget it.',
          chronicle: '{name} puts {rival} on his back in a sparring match.',
          kind: 'fight',
        },
        fail: {
          effects: [
            { do: 'flag', id: 'met-rival' },
            { do: 'injury', ladder: 'body', days: 10 },
            {
              do: 'person',
              who: 'rival',
              tie: 'rival',
              realm: { realm: 'qi-condensation', stage: 4 },
            },
          ],
          text: 'He puts you on your back and laughs all the way down the hill.',
          chronicle: '{name} spars with {rival} and is put on {their} back.',
          kind: 'fight',
        },
      },
    ],
  },
  {
    id: 'rival-again',
    deck: DECK,
    kind: 'people',
    title: 'Louder',
    text: '{rival} again, a layer or two higher, and louder about it.',
    trigger: { daysLived: [600], flags: ['met-rival'] },
    cooldown: 960,
    choices: [
      {
        label: 'Congratulate him',
        pass: {
          effects: [{ do: 'person', who: 'rival', advance: 2 }],
          text: 'He was ready for an argument and does not know what to do with a cup of tea.',
          chronicle: '{name} congratulates {rival} on his breakthroughs.',
        },
      },
      {
        label: 'Tell him you will catch him',
        pass: {
          effects: [
            { do: 'person', who: 'rival', advance: 2, regard: -1 },
            { do: 'insight', n: 4 },
          ],
          text: 'He laughs. You sit longer that night than you have in a month.',
          chronicle: '{name} tells {rival} {they} will catch him, and sits late that night.',
        },
      },
    ],
  },
  {
    id: 'aunt-visit',
    deck: DECK,
    kind: 'people',
    title: 'Bat-Guano Rice',
    text: '{aunt} has climbed all the way to your cave with a pot of bat-guano rice and a list of everyone who has married, died or fallen down a sinkhole.',
    trigger: { daysLived: [150], people: ['aunt'] },
    cooldown: 720,
    choices: [
      {
        label: 'Eat with her',
        pass: {
          effects: [
            { do: 'person', who: 'aunt', regard: 1 },
            { do: 'fuel', ladder: 'body', share: 0.03 },
          ],
          text: 'It tastes exactly as bad as you remember. You finish the pot.',
          chronicle: '{name} shares a pot of bat-guano rice with {aunt} and hears all the news.',
        },
      },
      {
        label: 'Send her home; you are in seclusion',
        pass: {
          effects: [
            { do: 'person', who: 'aunt', regard: -1 },
            { do: 'insight', n: 3 },
          ],
          text: 'She leaves the pot at the door anyway.',
          chronicle: '{name} sends {aunt} home unfed, and she leaves the rice at the door anyway.',
        },
      },
    ],
  },
  {
    id: 'sergeant-posted',
    deck: DECK,
    kind: 'people',
    title: 'Posted to the Wall',
    text: 'Word from the garrison school: {sergeant} has been posted to the Wall of Piled Bones. He leaves you a note in his square hand: "Keep your elbows in."',
    trigger: { daysLived: [400], origin: ['cave-orphan'], choice: 'along' },
    once: true,
    choices: [
      {
        label: 'Keep the note',
        pass: {
          effects: [{ do: 'person', who: 'sergeant', regard: 1, where: 'qm-duigu-qiang' }],
          text: 'You fold it into your collar.',
          chronicle: '{sergeant} is posted to the Wall of Piled Bones, and {name} keeps his note.',
        },
      },
      {
        label: 'Ask after his realm',
        pass: {
          effects: [{ do: 'person', who: 'sergeant', advance: 1, where: 'qm-duigu-qiang' }],
          text: 'The runner says he broke through again before he left. They only post the strong to the Wall.',
          chronicle: '{sergeant} breaks through and is posted to the Wall of Piled Bones.',
        },
      },
    ],
  },
  {
    id: 'sergeant-promoted',
    deck: DECK,
    kind: 'people',
    title: 'A New Command',
    text: '{sergeant} has broken through and been given a tower of her own on the March. She sends word that she expects you to apply for its garrison.',
    trigger: { daysLived: [400], origin: ['conscript'], choice: 'along' },
    once: true,
    choices: [
      {
        label: 'Send your congratulations',
        pass: {
          effects: [
            { do: 'person', who: 'sergeant', advance: 1, regard: 1, where: 'qm-anbian-fu' },
          ],
          text: 'You write a careful note and send it with the next patrol.',
          chronicle:
            '{sergeant} breaks through and takes a tower on the March; {name} sends congratulations.',
        },
      },
    ],
  },
  {
    id: 'senior-breakthrough',
    deck: DECK,
    kind: 'people',
    title: 'Contribution',
    text: '{senior} has broken through, and makes sure the whole outer court knows it. He stops by your cell to count your cores, and finds them wanting.',
    trigger: { daysLived: [400], origin: ['frontier-orphan'], choice: 'along' },
    cooldown: 1200,
    choices: [
      {
        label: 'Promise him results',
        pass: {
          effects: [{ do: 'person', who: 'senior', advance: 1 }],
          text: 'He writes your promise down. He writes everything down.',
          chronicle: '{senior} breaks through, and {name} promises him results.',
        },
      },
      {
        label: 'Ask how he did it',
        check: { attribute: 'fortune', against: 10 },
        pass: {
          effects: [
            { do: 'person', who: 'senior', advance: 1, regard: 1 },
            { do: 'insight', n: 8 },
          ],
          text: 'He is so pleased to be asked that he tells you, at length, and some of it is even useful.',
          chronicle: '{senior} breaks through and tells {name} how, at length.',
        },
        fail: {
          effects: [{ do: 'person', who: 'senior', advance: 1, regard: -1 }],
          text: '"Cores," he says, and leaves.',
          chronicle: '{senior} breaks through and tells {name} nothing.',
        },
      },
    ],
  },
  {
    id: 'lei-hunting',
    deck: DECK,
    kind: 'people',
    title: 'The List',
    text: '{sergeant} is asking after you in the river villages, with your name still at the top of her list.',
    trigger: { daysLived: [300], origin: ['conscript'], choice: 'refuse' },
    cooldown: 960,
    choices: [
      {
        label: 'Lie low',
        pass: {
          effects: [{ do: 'fuel', ladder: 'qi', share: -0.01 }],
          text: 'A month without a lamp, breathing small, until she moves on.',
          chronicle: '{name} lies low while {sergeant} asks after {them} in the river villages.',
        },
      },
      {
        label: 'Leave a false trail',
        check: { attribute: 'agility', against: 10 },
        pass: {
          effects: [{ do: 'person', who: 'sergeant', regard: -1, where: 'qm-shoukou-cheng' }],
          text: 'You leave your old boots on a ferry bound for the City of the Guarded Mouth. She follows them.',
          chronicle:
            '{name} sends {sergeant} after a false trail to the City of the Guarded Mouth.',
        },
        fail: {
          effects: [{ do: 'injury', ladder: 'body', days: 20 }],
          text: 'She is not fooled, and you leave the river villages faster than you meant to.',
          chronicle: '{sergeant} sees through a false trail, and {name} barely gets away.',
          kind: 'hurt',
        },
      },
    ],
  },
  {
    id: 'old-sha-favor',
    deck: DECK,
    kind: 'people',
    title: 'The Favor',
    text: '{fixer} rows up at low tide with water running off his gills. The Society would like its favor now: a sealed crate, a night crossing, no questions.',
    trigger: {
      daysLived: [360],
      origin: ['conscript'],
      choice: 'refuse',
      flags: ['night-bridge-favor'],
      notFlags: ['favor-paid'],
    },
    once: true,
    choices: [
      {
        label: 'Pay what you owe',
        pass: {
          effects: [
            { do: 'flag', id: 'favor-paid' },
            { do: 'fuel', ladder: 'qi', share: -0.05 },
            { do: 'person', who: 'fixer', regard: 1, tie: 'patron' },
          ],
          text: 'One crossing, one crate, no questions. The crate is warm, and something inside it is breathing.',
          chronicle:
            '{name} pays the Night Bridge Society its favor with a night crossing for {fixer}.',
        },
      },
      {
        label: 'Look inside the crate',
        check: { attribute: 'agility', against: 11 },
        pass: {
          effects: [
            { do: 'flag', id: 'favor-paid' },
            { do: 'flag', id: 'saw-the-crate' },
            { do: 'insight', n: 6 },
            { do: 'person', who: 'fixer', tie: 'patron' },
          ],
          text: 'Halfway across you lift the lid a finger-width. A golden eye looks back. You close it and say nothing, ever.',
          chronicle:
            '{name} pays the Night Bridge Society its favor, and sees what was in the crate.',
        },
        fail: {
          effects: [
            { do: 'flag', id: 'favor-paid' },
            { do: 'person', who: 'fixer', regard: -2 },
          ],
          text: '{fixer} sees you do it. He says nothing at all, which is the worst thing he could have said.',
          chronicle: "{name} is caught looking inside the Night Bridge Society's crate.",
        },
      },
    ],
  },
  {
    id: 'clerk-job',
    deck: DECK,
    kind: 'people',
    title: 'A Runner Wanted',
    text: '{clerk} sends a boy up to your hideout: a job, if you want it, carrying sealed paper to the harbor hall.',
    trigger: { daysLived: [200], origin: ['frontier-orphan'], choice: 'refuse' },
    cooldown: 600,
    choices: [
      {
        label: 'Send word you are in seclusion',
        pass: {
          effects: [{ do: 'person', who: 'clerk' }],
          text: 'The boy shrugs and runs off to find someone hungrier.',
          chronicle: '{name} turns down a job from {clerk}.',
        },
      },
      {
        label: 'Take the job',
        check: { attribute: 'agility', against: 9 },
        pass: {
          effects: [
            { do: 'stones', n: 8 },
            { do: 'fuel', ladder: 'qi', share: -0.03 },
            { do: 'person', who: 'clerk', regard: 1 },
          ],
          text: 'Paper delivered dry and on time. {clerk} pays eight stones and says nothing, which from her is praise.',
          chronicle: '{name} runs sealed paper to the harbor hall for {clerk}.',
        },
        fail: {
          effects: [
            { do: 'stones', n: 2 },
            { do: 'fuel', ladder: 'qi', share: -0.03 },
          ],
          text: 'The rain beats you to the harbor hall. {clerk} pays two stones for wet paper.',
          chronicle: '{name} runs paper to the harbor hall for {clerk} and arrives with it wet.',
        },
      },
    ],
  },
];
