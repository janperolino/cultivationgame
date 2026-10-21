// The first hour's cards (design § Character creation and the first hour). Since The opening, built
// (chains, rogue, knobs) the origin's chain carries the first hour (content/quests/chains.ts) and
// took up these cards' old text: the refusals' method, the first techniques, the errand, the
// lamp-keeper and the Foundation exams. What stays is what the chain doesn't do: each rogue's thread
// of trouble (design § The rogue start), the rogue's first big job, brought by its chain's step
// (`pushed`), and the card at the peak of Qi Condensation that says what Foundation takes, since
// the pill is the world's to find (Jan's call in the talk, 2026-10-21). Texts read roles, never
// names (NPC basics). Drafted for Jan's review.
import type { Card } from './schema.ts';

const DECK = 'first-hour';

export const FIRST_HOUR_CARDS: readonly Card[] = [
  // ------------------------------------------------------------ the threads of trouble
  {
    id: 'bounty-hunters',
    deck: DECK,
    title: 'Asking After You',
    text: 'Two bounty hunters off a garrison barge are drinking on the River-Bend wharves and asking after a lit child who ran from the cadet oath. {fixer} says they will be at the reeds by the next tide. If you do nothing, you will have to run anyway.',
    trigger: { origin: ['conscript'], choice: 'refuse', flags: ['bounty'], daysLived: [150] },
    chance: 1 / 120,
    once: true,
    urgent: { days: 5 },
    defaultChoice: 1,
    choices: [
      {
        label: 'Pay the ferryman to send them the wrong way',
        cost: { stones: 3 },
        pass: {
          effects: [],
          text: 'The hunters take the morning barge downriver to the wrong county. The ferryman keeps the change.',
          chronicle: '{name} pays a ferryman to send two bounty hunters the wrong way.',
        },
      },
      {
        label: 'Run for the reed channels',
        check: { attribute: 'agility', against: 8 },
        pass: {
          effects: [{ do: 'fuel', ladder: 'body', share: 0.1 }],
          text: 'You are three channels deep before they reach the bank, and you sleep in the reeds for a week.',
          chronicle: '{name} runs from two bounty hunters into the river reeds.',
        },
        fail: {
          effects: [{ do: 'injury', ladder: 'qi', days: 15 }],
          text: 'One of them sees you go. You lose him in the channels, and a fair amount of skin on the reed stems.',
          chronicle: '{name} escapes two bounty hunters through the river reeds, cut up by them.',
          kind: 'hurt',
        },
      },
      {
        label: 'Meet them on the wharf',
        fight: { roster: 'garrison-deserter', stages: 1 },
        pass: {
          effects: [{ do: 'stones', n: 6 }],
          text: 'They came for a child of twelve. They leave without their purses, and the ferryman laughs for a day.',
          chronicle:
            '{name} sends two bounty hunters off the River-Bend wharf without their purses.',
          kind: 'fight',
        },
        fail: {
          effects: [{ do: 'injury', ladder: 'body', days: 20 }],
          text: 'They beat you into the river. The ferryman fishes you out downstream, before they think to look.',
          chronicle: '{name} is beaten into the river by bounty hunters and fished out downstream.',
          kind: 'hurt',
        },
      },
    ],
  },
  {
    id: 'gate-taunt',
    deck: DECK,
    title: 'The One Who Said No',
    text: 'An outer disciple of the Beast-Butcher Gate in a new robe sits on the bounty office stairs where you used to sleep, asking the runners where the orphan is who turned the Gate down. "The recruiter remembers," he says when he finds you. "The Gate’s trial stays open. Crawl to it, if you like."',
    trigger: {
      origin: ['frontier-orphan'],
      choice: 'refuse',
      flags: ['gate-grudge'],
      daysLived: [150],
    },
    chance: 1 / 120,
    once: true,
    choices: [
      {
        label: 'Let him talk',
        pass: {
          effects: [{ do: 'insight', n: 3 }],
          text: 'He talks until he is bored of it. You learn how the Gate drills its outer disciples, which he didn’t mean to tell you.',
          chronicle: '{name} lets a Gate disciple taunt {them} on the bounty office stairs.',
        },
      },
      {
        label: 'Ask him down off the stairs',
        fight: { roster: 'beast-butcher-disciple' },
        pass: {
          effects: [
            { do: 'flag', id: 'beat-gate-taunt' },
            { do: 'fuel', ladder: 'qi', share: 0.1 },
          ],
          text: 'The runners watch him go back to the Gate holding his ribs. The recruiter will hear of it.',
          chronicle:
            '{name} puts a Gate disciple off the bounty office stairs, and the Gate hears of it.',
          kind: 'fight',
        },
        fail: {
          effects: [{ do: 'injury', ladder: 'body', days: 15 }],
          text: 'He puts you on the stairs instead, and steps over you on his way out.',
          chronicle: '{name} is beaten on the bounty office stairs by a Gate disciple.',
          kind: 'hurt',
        },
      },
    ],
  },
  {
    id: 'tester-asking',
    deck: DECK,
    title: 'The Tester’s Men',
    text: 'Two of the imperial tester’s men have come back to the Terraces with the grey stone in a box, asking the terrace wardens which families hid children this year. {aunt} sends word up the ledges: keep out of sight until they go.',
    trigger: { origin: ['cave-orphan'], choice: 'refuse', daysLived: [150] },
    chance: 1 / 120,
    once: true,
    urgent: { days: 5 },
    choices: [
      {
        label: 'Sit it out behind the Breathing Crack',
        pass: {
          effects: [{ do: 'fuel', ladder: 'qi', share: -0.05 }],
          text: 'You sit in the dark behind the crack for nine days on dried bat-rice, and they go away with the box still dark.',
          chronicle:
            '{name} hides behind the Breathing Crack while the tester’s men search the Terraces.',
        },
      },
      {
        label: 'Pay the factor to tell them a better story',
        cost: { stones: 4 },
        pass: {
          effects: [],
          text: 'The smugglers’ factor tells them about a rooted child seen on the road to Heaven’s Eye, and they leave that afternoon.',
          chronicle: '{name} pays the smugglers’ factor to send the tester’s men to Heaven’s Eye.',
        },
      },
    ],
  },

  // ------------------------------------------------------------ the rogue's first big job
  {
    id: 'job-smuggling-run',
    deck: DECK,
    pushed: true,
    title: 'The Factor’s Crate',
    text: 'The smugglers’ factor has a crate that must go down the karst to the Lower Caves tonight, past a terrace where the tester’s escort has set a watch. It is heavier than it looks and nobody will say what is in it.',
    // Brought by its chain's step, never drawn: the trigger only says whose it is.
    trigger: { origin: ['cave-orphan'], choice: 'refuse' },
    choices: [
      {
        label: 'Carry it down the back ledges in the dark',
        check: { attribute: 'agility', against: 10 },
        pass: {
          effects: [
            { do: 'flag', id: 'job-smuggling-run' },
            { do: 'stones', n: 8 },
          ],
          text: 'You go down the ledges by touch with the crate on your back, past the watch’s fire, and the Lower Caves’ factor pays without opening it.',
          chronicle: '{name} carries a smugglers’ crate down the karst past the tester’s watch.',
        },
        fail: {
          effects: [{ do: 'injury', ladder: 'body', days: 10 }],
          text: 'A ledge goes under your foot and you come down a terrace with the crate on top of you. The factor says try again when you can walk.',
          chronicle: '{name} falls down a terrace with a smugglers’ crate.',
          kind: 'hurt',
        },
      },
      {
        label: 'Go through the watch',
        fight: { roster: 'march-conscript' },
        pass: {
          effects: [
            { do: 'flag', id: 'job-smuggling-run' },
            { do: 'stones', n: 8 },
          ],
          text: 'The watchman never sees your face, and wakes up beside his own fire. The crate gets where it was going.',
          chronicle: '{name} goes through the tester’s watch with a smugglers’ crate.',
          kind: 'fight',
        },
        fail: {
          effects: [{ do: 'injury', ladder: 'body', days: 15 }],
          text: 'He was awake. You drop the crate and run, and the factor sends a boy for it before dawn. Try again when you heal.',
          chronicle: '{name} is driven off by the tester’s watch and drops a smugglers’ crate.',
          kind: 'hurt',
        },
      },
    ],
  },
  {
    id: 'job-night-run',
    deck: DECK,
    pushed: true,
    title: 'A Night Bridge Run',
    text: '{fixer} has a boat of crates to go upriver past the March’s river patrol tonight, and needs someone on the bow who can keep a lamp dark and a patrolman quiet.',
    // Brought by its chain's step, never drawn: the trigger only says whose it is.
    trigger: { origin: ['conscript'], choice: 'refuse' },
    choices: [
      {
        label: 'Keep to the reeds and the dark',
        check: { attribute: 'agility', against: 10 },
        pass: {
          effects: [
            { do: 'flag', id: 'job-night-run' },
            { do: 'stones', n: 8 },
          ],
          text: 'You pole the boat through the reeds with the lamp dark while the patrol’s lantern goes by on the river.',
          chronicle: '{name} makes a Night Bridge run past the March’s river patrol.',
        },
        fail: {
          effects: [{ do: 'injury', ladder: 'qi', days: 10 }],
          text: 'The patrol’s lantern finds you. You put the boat on the bank and run, and the ferryman says try again when they’ve forgotten your face.',
          chronicle:
            '{name} runs from the March’s river patrol, leaving a Night Bridge boat on the bank.',
          kind: 'hurt',
        },
      },
      {
        label: 'Board the patrol boat first',
        fight: { roster: 'march-conscript' },
        pass: {
          effects: [
            { do: 'flag', id: 'job-night-run' },
            { do: 'stones', n: 8 },
          ],
          text: 'The patrolman goes in the river and his lantern with him. The run goes through.',
          chronicle: '{name} puts a March patrolman in the river on a Night Bridge run.',
          kind: 'fight',
        },
        fail: {
          effects: [{ do: 'injury', ladder: 'body', days: 15 }],
          text: 'He puts you in the river instead. The ferryman fishes you out and takes the run himself. Next time.',
          chronicle: '{name} is put in the river by a March patrolman on a Night Bridge run.',
          kind: 'hurt',
        },
      },
    ],
  },
  {
    id: 'job-runaway-bounty',
    deck: DECK,
    pushed: true,
    title: 'The Gate’s Runaway',
    text: 'Under the counter {clerk} keeps a bounty the Beast-Butcher Gate posts quietly: an outer disciple who ran with a sack of the Gate’s cores, and is hiding in the fens a day out. "They won’t send their own after a runaway. They’ll pay us to."',
    // Brought by its chain's step, never drawn: the trigger only says whose it is.
    trigger: { origin: ['frontier-orphan'], choice: 'refuse' },
    choices: [
      {
        label: 'Talk him into coming back',
        check: { attribute: 'fortune', against: 10 },
        pass: {
          effects: [
            { do: 'flag', id: 'job-runaway-bounty' },
            { do: 'stones', n: 8 },
          ],
          text: 'He is cold, hungry and tired of the fens. He walks back with you, and the clerk pays.',
          chronicle: '{name} talks the Gate’s runaway out of the fens for the bounty office.',
        },
        fail: {
          effects: [],
          text: 'He laughs and slips into the fen lamps. The clerk shrugs: he’ll still be there tomorrow.',
          chronicle: '{name} fails to talk the Gate’s runaway out of the fens.',
        },
      },
      {
        label: 'Bring him in',
        fight: { roster: 'beast-butcher-disciple', stages: -1 },
        pass: {
          effects: [
            { do: 'flag', id: 'job-runaway-bounty' },
            { do: 'stones', n: 8 },
          ],
          text: 'You bring him in tied to his own sack of cores, and the clerk pays before the Gate’s man arrives.',
          chronicle: '{name} brings in the Gate’s runaway for the bounty office.',
          kind: 'fight',
        },
        fail: {
          effects: [{ do: 'injury', ladder: 'body', days: 15 }],
          text: 'He was a butcher before he ran. You crawl back to the office. Next time.',
          chronicle: '{name} is beaten in the fens by the Gate’s runaway.',
          kind: 'hurt',
        },
      },
    ],
  },

  // ------------------------------------------------------------ the gate of Foundation
  {
    id: 'gate-of-foundation',
    deck: DECK,
    title: 'The Gate of Foundation',
    text: 'Your qi stands at the peak of Qi Condensation and goes no further: the method you cultivate stops here, as every method does at the edge of its realm. To lay a foundation you need two things. The next chapter of your method, which your power keeps for those who reach this far, or a trading house or a black market sells to those who don’t belong to one. And a Foundation Pill, which most who break through break through on: an alchemy shop’s back shelf has one now and then, a black market more often, and a power hands out a few a year to the best of its own. Foundation comes in grades, and how full and steady your qi stands when you go in decides which; there is no hurry worth a poor grade.',
    trigger: { qi: { realm: 'qi-condensation', minStage: 9 } },
    once: true,
    choices: [
      {
        label: 'I understand',
        pass: {
          effects: [],
          text: 'You sit with the peak of the realm under you and think about where a pill comes from.',
          chronicle:
            '{name} reaches the peak of Qi Condensation and looks for the way to Foundation.',
        },
      },
    ],
  },
];
