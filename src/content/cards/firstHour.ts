// The first hour's cards (design § Character creation, the first hour; § Story cards and events).
// They stand in for what the world supplies from M3: the refusals' method after a month or two of
// odd jobs, each origin path's first technique at minute 20–35, the errand that stands in for the
// first trip out and hands over a common tempering art, a later card with a common nourishing art,
// and at layer 9 a Foundation Pill with the Foundation chapter of the origin's method, with another
// pill ten years after a failed attempt. Days lived run one real hour to a year at Qi
// Condensation, so day 30 is about minute 5. Drafted in P1.7 for Jan's review.
import type { Card, CardEffect } from './schema.ts';

const DECK = 'first-hour';

/** The tempering art every errand hands over, and the nourishing art the later card does. */
const TEMPERING: CardEffect = { do: 'method', id: 'stone-bearing' };
const NOURISHING: CardEffect = { do: 'method', id: 'still-lantern' };

export const FIRST_HOUR_CARDS: readonly Card[] = [
  // ------------------------------------------------------------ the refusals' method, minute 5–10
  {
    id: 'night-bridge-offer',
    deck: DECK,
    title: 'The Night Bridge',
    text: 'A month of sleeping in ditches with the bounty posted in every village. Then {fixer}, a half-blood ferryman with gills behind his ears, finds you at the low-tide reef. The Night Bridge Society will hide a lit child, he says, and teach you to breathe the way their runners do, for five low-grade stones of passage or a favor owed.',
    trigger: { origin: ['conscript'], choice: 'refuse', noMethod: 'qi', daysLived: [45] },
    chance: 1 / 15,
    sureAt: 75,
    once: true,
    choices: [
      {
        label: 'Owe them a favor',
        pass: {
          effects: [
            { do: 'method', id: 'night-bridge' },
            { do: 'routine', id: 'lantern-hours' },
            { do: 'flag', id: 'night-bridge' },
            { do: 'flag', id: 'night-bridge-favor' },
          ],
          text: 'You shake his wet hand. The Society teaches you its breathing in a cave that floods twice a day, and it will want something back one day.',
          chronicle: '{name} falls in with the Night Bridge Society, a favor owed.',
        },
      },
      {
        label: 'Work the tide crossing for your passage',
        check: { attribute: 'agility', dc: 11 },
        pass: {
          effects: [
            { do: 'method', id: 'night-bridge' },
            { do: 'routine', id: 'lantern-hours' },
            { do: 'flag', id: 'night-bridge' },
            { do: 'stones', n: 3 },
          ],
          text: 'You run a crate of beast eggs across the reef ahead of the tide and owe them nothing. They teach you the breathing anyway, and slip you three stones.',
          chronicle:
            '{name} works a tide crossing for the Night Bridge Society and owes them nothing.',
        },
        fail: {
          effects: [
            { do: 'method', id: 'night-bridge' },
            { do: 'routine', id: 'lantern-hours' },
            { do: 'flag', id: 'night-bridge' },
            { do: 'flag', id: 'night-bridge-favor' },
          ],
          text: 'The tide beats you to the third island and a crate goes into the sea. {fixer} hauls you out by the collar. They teach you the breathing anyway; now you owe them a crate and a favor.',
          chronicle: '{name} loses a crate to the tide and ends up owing the Night Bridge Society.',
        },
      },
    ],
  },
  {
    id: 'bounty-office-job',
    deck: DECK,
    title: 'Pay in Paper',
    text: 'Two months of running errands for {clerk} at the bounty office. Today the job is a sealed case of beast cores to the harbor hall before the tide turns, and the pay is a torn manual someone pawned and never came back for. {clerk} says it is a cultivation method. Half of one, anyway.',
    trigger: { origin: ['frontier-orphan'], choice: 'refuse', noMethod: 'qi', daysLived: [45] },
    chance: 1 / 15,
    sureAt: 75,
    once: true,
    choices: [
      {
        label: 'Run it across the rooftops',
        check: { attribute: 'agility', dc: 11 },
        pass: {
          effects: [
            { do: 'method', id: 'bounty-scrap' },
            { do: 'flag', id: 'bounty-runner' },
            { do: 'stones', n: 3 },
          ],
          text: 'You beat the tide by a quarter hour. {clerk} adds three stones to the manual without a word.',
          chronicle:
            '{name} runs cores across the rooftops of the City of the Guarded Mouth and is paid in a torn manual.',
        },
        fail: {
          effects: [
            { do: 'method', id: 'bounty-scrap' },
            { do: 'flag', id: 'bounty-runner' },
          ],
          text: 'A gutter gives way and you arrive late, bruised and limping. {clerk} hands over the manual anyway, and nothing else.',
          chronicle:
            '{name} limps into the harbor hall late, and is paid in a torn manual all the same.',
        },
      },
      {
        label: 'Take the long way, safely',
        pass: {
          effects: [
            { do: 'method', id: 'bounty-scrap' },
            { do: 'flag', id: 'bounty-runner' },
          ],
          text: 'You take the main streets and arrive as the tide turns. The manual is yours: torn, stained, and still breathing.',
          chronicle:
            '{name} carries a case of cores to the harbor hall and is paid in a torn manual.',
        },
      },
    ],
  },

  // ------------------------------------------------------------ the deserter's bounty, urgent
  {
    id: 'bounty-hunters',
    deck: DECK,
    title: 'Asking After You',
    text: 'Two bounty hunters are drinking in the ferry village and asking after a lit child who ran from the cadet oath. The ferryman says they will be at the reef caves by the next tide. If you do nothing, you will have to run anyway.',
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
          text: 'The hunters take the morning boat to the wrong island. The ferryman keeps the change.',
          chronicle: '{name} pays a ferryman to send two bounty hunters the wrong way.',
        },
      },
      {
        label: 'Run for the reef caves',
        check: { attribute: 'agility', dc: 10 },
        pass: {
          effects: [{ do: 'fuel', ladder: 'body', share: 0.1 }],
          text: 'You are three caves deep before they reach the shore, and you sleep in the dark for a week.',
          chronicle: '{name} runs from two bounty hunters into the reef caves.',
        },
        fail: {
          effects: [{ do: 'injury', ladder: 'qi', days: 15 }],
          text: 'One of them sees you go. You lose him in the flooded passages, and a fair amount of skin.',
          chronicle:
            '{name} escapes two bounty hunters through the flooded reef caves, torn up by the rock.',
        },
      },
    ],
  },

  // ------------------------------------------------------------ first techniques, minute 20–35
  {
    id: 'first-technique-cave-along',
    deck: DECK,
    title: 'Palm Drill',
    text: '{sergeant} lines the new cadets up on the parade ground at dawn. "The wall doesn\'t care about your root. It cares whether you can push a beast off it." The drill is a palm strike called Rampart Palm, and the quartermaster sells the drill manual for five stones to anyone who wants to read why it works.',
    trigger: { origin: ['cave-orphan'], choice: 'along', daysLived: [120] },
    chance: 1 / 30,
    sureAt: 210,
    once: true,
    choices: [
      {
        label: 'Drill with the squad',
        pass: {
          effects: [{ do: 'first-technique' }],
          text: 'By the hundredth repetition your palm stops hurting. By the thousandth it starts to mean something.',
          chronicle: '{name} drills the Rampart Palm with the cadets of the garrison school.',
        },
      },
      {
        label: 'Buy the drill manual too',
        cost: { stones: 5 },
        pass: {
          effects: [
            { do: 'first-technique' },
            { do: 'contemplate', source: 'garrison-drill-manual' },
          ],
          text: 'You read the manual cover to cover in a night. Half of it is about latrines, the other half is worth the stones.',
          chronicle:
            "{name} drills the Rampart Palm and reads the garrison school's manual cover to cover.",
        },
      },
    ],
  },
  {
    id: 'first-technique-cave-refuse',
    deck: DECK,
    title: 'Stone Fist',
    text: '{aunt} takes you down to the lowest terrace, where the cave clans break limestone by hand. "The stone has a grain. Find it, and your fist goes through." She shows you the Sinkhole Stone Fist, and leaves you alone with the wall.',
    trigger: { origin: ['cave-orphan'], choice: 'refuse', daysLived: [120] },
    chance: 1 / 30,
    sureAt: 210,
    once: true,
    choices: [
      {
        label: 'Find the grain',
        pass: {
          effects: [{ do: 'first-technique' }],
          text: 'Your knuckles bleed for a week. On the eighth day a slab splits clean.',
          chronicle: '{name} learns the Sinkhole Stone Fist from {aunt} on the lowest terrace.',
        },
      },
    ],
  },
  {
    id: 'first-technique-conscript-along',
    deck: DECK,
    title: 'Spear on the Wall',
    text: '{sergeant} walks the cadets along the Wall of Piled Bones at dusk. "Thrust between the ribs, where the bone wall is thin. Every beast up here came to the same end." The thrust has a name: Piled Bones Thrust.',
    trigger: { origin: ['conscript'], choice: 'along', daysLived: [120] },
    chance: 1 / 30,
    sureAt: 210,
    once: true,
    choices: [
      {
        label: 'Drill until dark',
        pass: {
          effects: [{ do: 'first-technique' }],
          text: 'You drill until the bones on the wall start to look like targets.',
          chronicle: '{name} learns the Piled Bones Thrust on the Wall of Piled Bones.',
        },
      },
    ],
  },
  {
    id: 'first-technique-conscript-refuse',
    deck: DECK,
    title: 'Undertow',
    text: "The Society's runners fight in knee-deep water, where footing is a lie. {fixer} shows you how to move with the pull of the tide instead of against it, and turn it into a palm: the Undertow Palm.",
    trigger: { origin: ['conscript'], choice: 'refuse', flags: ['night-bridge'], daysLived: [120] },
    chance: 1 / 30,
    sureAt: 210,
    once: true,
    choices: [
      {
        label: 'Learn it in the shallows',
        pass: {
          effects: [{ do: 'first-technique' }],
          text: 'You fall in the sea forty times. The forty-first, the sea falls instead.',
          chronicle: '{name} learns the Undertow Palm from the Night Bridge runners.',
        },
      },
    ],
  },
  {
    id: 'first-technique-frontier-along',
    deck: DECK,
    title: 'The First Cleave',
    text: '{senior} drops a beast carcass the size of a cart in the yard. "Saber Dao starts at the butcher\'s block. Split the bone, not the meat." The cut is the Bone-Splitting Cleave, and the carcass is yours until it is in pieces.',
    trigger: { origin: ['frontier-orphan'], choice: 'along', daysLived: [120] },
    chance: 1 / 30,
    sureAt: 210,
    once: true,
    choices: [
      {
        label: 'Start cutting',
        pass: {
          effects: [{ do: 'first-technique' }],
          text: 'By the time the carcass is in pieces, you can hear the bone before the blade reaches it.',
          chronicle: "{name} learns the Bone-Splitting Cleave on a carcass in the Gate's yard.",
        },
      },
    ],
  },
  {
    id: 'first-technique-frontier-refuse',
    deck: DECK,
    title: 'Alley Wind',
    text: "Running for the bounty office, you learn where the wind goes in the city's alleys, and a retired hunter who drinks at the office stairs shows you how to put it behind a palm. He calls it the Alley Wind Palm. He doesn't charge you.",
    trigger: {
      origin: ['frontier-orphan'],
      choice: 'refuse',
      flags: ['bounty-runner'],
      daysLived: [120],
    },
    chance: 1 / 30,
    sureAt: 210,
    once: true,
    choices: [
      {
        label: 'Learn it between errands',
        pass: {
          effects: [{ do: 'first-technique' }],
          text: 'Every corner you take at a run, you push the wind ahead of you a little harder.',
          chronicle: '{name} learns the Alley Wind Palm between errands for the bounty office.',
        },
      },
    ],
  },

  // ------------------------------------------------------------ the errand, minute 45–60
  {
    id: 'errand-cave-along',
    deck: DECK,
    title: 'Survey Party',
    text: '{sergeant} needs someone who knows caves to guide a survey party under the Kingdom of Stone Eyes, where raiders have been hiding. Everyone looks at you. The party is slow, loud and carries too many torches.',
    trigger: { origin: ['cave-orphan'], choice: 'along', qi: { minStage: 3 }, daysLived: [270] },
    chance: 1 / 20,
    sureAt: 330,
    once: true,
    choices: [
      {
        label: 'Take the short way through the breathing cave',
        check: { attribute: 'agility', dc: 12 },
        pass: {
          effects: [TEMPERING, { do: 'stones', n: 8 }, { do: 'fuel', ladder: 'body', share: 0.2 }],
          text: 'You get them through the breathing cave between gusts and find the raiders\' cache. {sergeant} pays you eight stones and hands you a garrison tempering art: "You climb like you were born on a rope. Make it count."',
          chronicle:
            "{name} guides a garrison survey party through the caves under the Kingdom of Stone Eyes and finds a raiders' cache.",
        },
        fail: {
          effects: [TEMPERING, { do: 'injury', ladder: 'qi', days: 20 }],
          text: 'A gust snuffs every torch, and you lead them out by feel with a gash down your arm. {sergeant} gives you a tempering art and orders you to bed.',
          chronicle:
            '{name} leads a garrison survey party out of the dark, hurt, under the Kingdom of Stone Eyes.',
        },
      },
      {
        label: 'Take the long, safe way',
        pass: {
          effects: [TEMPERING, { do: 'stones', n: 3 }],
          text: 'Three days in the caves, nothing found, everyone home. {sergeant} gives you three stones and a tempering art, and looks disappointed.',
          chronicle:
            '{name} guides a garrison survey party safely through the caves under the Kingdom of Stone Eyes.',
        },
      },
    ],
  },
  {
    id: 'errand-cave-refuse',
    deck: DECK,
    title: 'A Guide for Smugglers',
    text: '{aunt} has a job for you: a smuggler crew needs a guide through the caves under the Kingdom of Stone Eyes, with a garrison patrol somewhere above. They pay in stones, and their leader carries a tempering art he says he never reads.',
    trigger: { origin: ['cave-orphan'], choice: 'refuse', qi: { minStage: 3 }, daysLived: [270] },
    chance: 1 / 20,
    sureAt: 330,
    once: true,
    choices: [
      {
        label: 'Take them under the patrol',
        check: { attribute: 'fortune', dc: 12 },
        pass: {
          effects: [TEMPERING, { do: 'stones', n: 10 }, { do: 'fuel', ladder: 'body', share: 0.2 }],
          text: "You hear the patrol's boots through the rock above and the crew never does. The leader pays ten stones and throws in the tempering art.",
          chronicle:
            '{name} guides a smuggler crew under a garrison patrol in the Kingdom of Stone Eyes.',
        },
        fail: {
          effects: [TEMPERING, { do: 'injury', ladder: 'qi', days: 20 }],
          text: 'A lamp gives you away and you run the crew out through the flooding cave. They get away; you get the tempering art and a cracked rib.',
          chronicle:
            "{name} runs a smuggler crew out of a garrison patrol's reach, and pays for it with a cracked rib.",
        },
      },
      {
        label: 'Take the long way round the patrol',
        pass: {
          effects: [TEMPERING, { do: 'stones', n: 4 }],
          text: 'Two extra days underground. The crew grumbles and pays four stones, and the leader gives you the tempering art to be rid of it.',
          chronicle:
            '{name} guides a smuggler crew the long way through the caves under the Kingdom of Stone Eyes.',
        },
      },
    ],
  },
  {
    id: 'errand-conscript-along',
    deck: DECK,
    title: 'Night Patrol',
    text: 'Your first night patrol on the Wall of Piled Bones. {sergeant} hears something below the southern stretch: claws on bone. "Cadet. Down the rope and look. Or stay up here and watch my back."',
    trigger: { origin: ['conscript'], choice: 'along', qi: { minStage: 3 }, daysLived: [270] },
    chance: 1 / 20,
    sureAt: 330,
    once: true,
    choices: [
      {
        label: 'Go down the rope',
        check: { attribute: 'agility', dc: 12 },
        pass: {
          effects: [TEMPERING, { do: 'stones', n: 8 }, { do: 'fuel', ladder: 'body', share: 0.2 }],
          text: 'A bone-gnawer pup, half grown, digging at the wall. You drive it off with the spear and bring back the tooth it broke. {sergeant} pays the bounty out of pocket and hands you the garrison tempering art.',
          chronicle:
            '{name} goes down the Wall of Piled Bones on a rope at night and drives off a bone-gnawer.',
        },
        fail: {
          effects: [TEMPERING, { do: 'injury', ladder: 'qi', days: 20 }],
          text: 'The rope burns your hands and the beast opens your leg before {sergeant} hauls you up. "Brave and stupid. Here," and hands you a tempering art.',
          chronicle: '{name} is clawed below the Wall of Piled Bones on a first night patrol.',
        },
      },
      {
        label: "Watch the sergeant's back",
        pass: {
          effects: [TEMPERING, { do: 'stones', n: 3 }],
          text: 'The claws go quiet by dawn. {sergeant} gives you three stones and a tempering art: "Steady is good. Steady and strong is better."',
          chronicle: '{name} stands a first night patrol on the Wall of Piled Bones.',
        },
      },
    ],
  },
  {
    id: 'errand-conscript-refuse',
    deck: DECK,
    title: 'Night Run',
    text: '{fixer} needs a runner for one stretch of the island chain tonight: a crate of beast cubs from the third island to the fifth, with a garrison skiff on the water and the bounty on you still posted in every fort.',
    trigger: { origin: ['conscript'], choice: 'refuse', qi: { minStage: 3 }, daysLived: [270] },
    chance: 1 / 20,
    sureAt: 330,
    once: true,
    choices: [
      {
        label: 'Run it past the skiff',
        check: { attribute: 'agility', dc: 12 },
        pass: {
          effects: [TEMPERING, { do: 'stones', n: 10 }, { do: 'fuel', ladder: 'body', share: 0.2 }],
          text: 'You run it waist-deep in the dark and the skiff never turns its lamp. {fixer} pays ten stones and a tempering art the Society teaches its runners.',
          chronicle:
            '{name} runs a crate of beast cubs past a garrison skiff for the Night Bridge Society.',
        },
        fail: {
          effects: [TEMPERING, { do: 'injury', ladder: 'qi', days: 20 }],
          text: "The lamp finds you and a crossbow bolt finds your shoulder. You get the crate there anyway. {fixer} patches you up and gives you the runners' tempering art.",
          chronicle:
            '{name} takes a garrison bolt on a night run for the Night Bridge Society, and delivers anyway.',
        },
      },
      {
        label: 'Wait for the fog',
        pass: {
          effects: [TEMPERING, { do: 'stones', n: 4 }],
          text: "The fog comes at the third watch and you walk the crate across. Four stones and the runners' tempering art.",
          chronicle:
            '{name} carries a crate across the island chain in the fog for the Night Bridge Society.',
        },
      },
    ],
  },
  {
    id: 'errand-frontier-along',
    deck: DECK,
    title: 'Core Hunt',
    text: '{senior} takes you across the reef road at low tide to hunt a stone-hide boar on the first island. "You drive it, I kill it, the core goes in the ledger under both our names. Or you can carry the bags."',
    trigger: {
      origin: ['frontier-orphan'],
      choice: 'along',
      qi: { minStage: 3 },
      daysLived: [270],
    },
    chance: 1 / 20,
    sureAt: 330,
    once: true,
    choices: [
      {
        label: 'Drive the boar',
        check: { attribute: 'agility', dc: 12 },
        pass: {
          effects: [TEMPERING, { do: 'stones', n: 8 }, { do: 'fuel', ladder: 'body', share: 0.2 }],
          text: 'You drive it into {senior}\'s saber like you have done it all your life. Your share of the core is eight stones, and {senior} tosses you the Gate\'s tempering art: "Get heavier."',
          chronicle: "{name} drives a stone-hide boar onto {senior}'s saber on the first island.",
        },
        fail: {
          effects: [TEMPERING, { do: 'injury', ladder: 'qi', days: 20 }],
          text: "The boar turns on you and you go into a tide pool with a tusk in your thigh. {senior} kills it, laughs, and gives you the Gate's tempering art.",
          chronicle: '{name} is gored by a stone-hide boar on a first core hunt with {senior}.',
        },
      },
      {
        label: 'Carry the bags',
        pass: {
          effects: [TEMPERING, { do: 'stones', n: 3 }],
          text: "{senior} kills the boar alone and gives you three stones for the bags, and the Gate's tempering art so you can carry more next time.",
          chronicle: '{name} carries the bags on a first core hunt with {senior}.',
        },
      },
    ],
  },
  {
    id: 'errand-frontier-refuse',
    deck: DECK,
    title: 'Bait',
    text: "{clerk} has a bounty hunter who needs bait: someone small and fast to draw a reef viper out of its hole on the first island while she waits with a net. She pays in stones, and she has a tempering art she's outgrown.",
    trigger: {
      origin: ['frontier-orphan'],
      choice: 'refuse',
      qi: { minStage: 3 },
      daysLived: [270],
    },
    chance: 1 / 20,
    sureAt: 330,
    once: true,
    choices: [
      {
        label: 'Be the bait',
        check: { attribute: 'agility', dc: 12 },
        pass: {
          effects: [TEMPERING, { do: 'stones', n: 10 }, { do: 'fuel', ladder: 'body', share: 0.2 }],
          text: 'The viper strikes where you were a heartbeat ago and the net drops. Ten stones and the tempering art, and a nod that means more.',
          chronicle: '{name} baits a reef viper for a bounty hunter on the first island.',
        },
        fail: {
          effects: [TEMPERING, { do: 'injury', ladder: 'qi', days: 20 }],
          text: 'Not quite fast enough: the fang grazes your calf and you spend a week sweating poison. The hunter gives you the tempering art and a little respect.',
          chronicle: '{name} is bitten baiting a reef viper on the first island, and lives.',
        },
      },
      {
        label: 'Hold the net instead',
        pass: {
          effects: [TEMPERING, { do: 'stones', n: 4 }],
          text: 'She does the baiting herself, and you hold the net. Four stones, and the tempering art because she is in a good mood.',
          chronicle: '{name} holds the net for a bounty hunter on the first island.',
        },
      },
    ],
  },

  // ------------------------------------------------------------ the nourishing art, about two hours
  {
    id: 'lamp-keeper',
    deck: DECK,
    title: 'The Lamp-Keeper',
    text: 'At a frontier shrine on the road, an old lamp-keeper sits with one flame and does not look up. "You breathe like someone who is always about to run. Sit. Or take this and go." She holds out a thin, much-copied nourishing art.',
    trigger: { daysLived: [600] },
    chance: 1 / 60,
    sureAt: 840,
    once: true,
    choices: [
      {
        label: 'Sit the night with her',
        pass: {
          effects: [NOURISHING, { do: 'contemplate', source: 'shrine-lecture' }],
          text: 'She talks about stillness until dawn, and somewhere in the third watch your mind goes as still as the flame.',
          chronicle:
            '{name} sits a night with a lamp-keeper at a frontier shrine and learns to be still.',
        },
      },
      {
        label: 'Take the manual and go',
        pass: {
          effects: [NOURISHING],
          text: 'You take the manual with a bow. She is already looking at the flame again.',
          chronicle: '{name} is given a nourishing art by a lamp-keeper at a frontier shrine.',
        },
      },
    ],
  },

  // ------------------------------------------------------------ layer 9: the pill and the chapter
  {
    id: 'foundation-cave-along',
    deck: DECK,
    title: 'The Garrison Exam',
    text: "{sergeant} calls you to the commandant's office. A cadet at the peak of Qi Condensation is worth a Foundation Pill to the March: here is one, and the Foundation chapter of the garrison method, and a stretch of wall with your name on it when you come back.",
    trigger: {
      origin: ['cave-orphan'],
      choice: 'along',
      qi: { realm: 'qi-condensation', minStage: 9 },
    },
    once: true,
    choices: [
      {
        label: 'Take the pill and the chapter',
        pass: {
          effects: [
            { do: 'item', id: 'foundation-pill', n: 1 },
            { do: 'method', id: 'garrison-standard-foundation' },
          ],
          text: 'The pill sits in its jade box like a held breath. The chapter is three pages long and took a hundred years to write.',
          chronicle:
            '{name} is given a Foundation Pill by the garrison school, and the next chapter of its method.',
        },
      },
    ],
  },
  {
    id: 'foundation-cave-refuse',
    deck: DECK,
    title: 'The Lowest Cave',
    text: '{aunt} takes you to a sinkhole no tester has found. On the wall, under the guano, the rest of the cave method is scratched into the stone, and in a niche sits a Foundation Pill the smugglers paid the clans for something nobody will name.',
    trigger: {
      origin: ['cave-orphan'],
      choice: 'refuse',
      qi: { realm: 'qi-condensation', minStage: 9 },
    },
    once: true,
    choices: [
      {
        label: 'Copy the wall and take the pill',
        pass: {
          effects: [
            { do: 'item', id: 'foundation-pill', n: 1 },
            { do: 'method', id: 'crude-cave-foundation' },
          ],
          text: 'It takes you a week to copy the wall by lamplight. {aunt} puts the pill in your hand herself.',
          chronicle:
            '{name} is given a Foundation Pill by the cave clans, and the rest of their method from a sinkhole wall.',
        },
      },
    ],
  },
  {
    id: 'foundation-conscript-along',
    deck: DECK,
    title: 'A Patrol of Your Own',
    text: '{sergeant} hands you a jade box and a thin book. "A Foundation Pill, from the Gongsun household, and the Foundation chapter of the spear method. Break through, and you lead a patrol on the southern stretch."',
    trigger: {
      origin: ['conscript'],
      choice: 'along',
      qi: { realm: 'qi-condensation', minStage: 9 },
    },
    once: true,
    choices: [
      {
        label: 'Salute and take it',
        pass: {
          effects: [
            { do: 'item', id: 'foundation-pill', n: 1 },
            { do: 'method', id: 'cadet-spear-foundation' },
          ],
          text: 'You salute. {sergeant} salutes back, for the first time.',
          chronicle:
            '{name} is given a Foundation Pill by the Gongsun household, and the next chapter of the cadet spear method.',
        },
      },
    ],
  },
  {
    id: 'foundation-conscript-refuse',
    deck: DECK,
    title: 'Worth the Next Chapter',
    text: '{fixer} finds you at the reef with a jade box. "The Society thinks you are worth the next chapter now. And a Foundation Pill, which came across the strait in a crate nobody asked about. Your favor is still owed."',
    trigger: {
      origin: ['conscript'],
      choice: 'refuse',
      qi: { realm: 'qi-condensation', minStage: 9 },
    },
    once: true,
    choices: [
      {
        label: 'Take it',
        pass: {
          effects: [
            { do: 'item', id: 'foundation-pill', n: 1 },
            { do: 'method', id: 'night-bridge-foundation' },
            { do: 'flag', id: 'night-bridge-favor' },
          ],
          text: 'The box is still wet with seawater.',
          chronicle:
            '{name} is given a Foundation Pill by the Night Bridge Society, and the next chapter of its breathing.',
        },
      },
    ],
  },
  {
    id: 'foundation-frontier-along',
    deck: DECK,
    title: 'The Inner Hall',
    text: '{senior} brings you before the Gate\'s ledger. "Your cores add up. An outer disciple at the peak of Qi Condensation earns a Foundation Pill and the next chapter of the saber method, and a place in the inner hall if you live."',
    trigger: {
      origin: ['frontier-orphan'],
      choice: 'along',
      qi: { realm: 'qi-condensation', minStage: 9 },
    },
    once: true,
    choices: [
      {
        label: 'Take what you earned',
        pass: {
          effects: [
            { do: 'item', id: 'foundation-pill', n: 1 },
            { do: 'method', id: 'butcher-saber-foundation' },
          ],
          text: '{senior} grins. "Don\'t die. I\'d have to train another one."',
          chronicle:
            '{name} earns a Foundation Pill from the Beast-Butcher Gate, and the next chapter of its saber method.',
        },
      },
    ],
  },
  {
    id: 'foundation-frontier-refuse',
    deck: DECK,
    title: 'The Missing Half',
    text: '{clerk} slides a package across the counter. "Someone pawned the other half of your manual. I bought it. And this came in with a dead hunter\'s effects, unclaimed." It is a Foundation Pill.',
    trigger: {
      origin: ['frontier-orphan'],
      choice: 'refuse',
      qi: { realm: 'qi-condensation', minStage: 9 },
    },
    once: true,
    choices: [
      {
        label: 'Thank {clerk} and take it',
        pass: {
          effects: [
            { do: 'item', id: 'foundation-pill', n: 1 },
            { do: 'method', id: 'bounty-scrap-foundation' },
          ],
          text: '{clerk} waves the thanks away. "You ran a hundred errands. Call it a bonus."',
          chronicle:
            "{name} is given a Foundation Pill and the torn manual's missing half at the bounty office.",
        },
      },
    ],
  },
  {
    id: 'foundation-again',
    deck: DECK,
    title: 'Another Pill',
    text: 'Ten years after the failed breakthrough, word comes from the people who raised you: one more Foundation Pill, saved for you against the day you were ready to try again.',
    trigger: {
      qi: { realm: 'qi-condensation', minStage: 9 },
      noItem: 'foundation-pill',
      mark: { id: 'foundation-failed', days: 3600 },
    },
    choices: [
      {
        label: 'Take it',
        pass: {
          effects: [
            { do: 'item', id: 'foundation-pill', n: 1 },
            { do: 'clear-mark', id: 'foundation-failed' },
          ],
          text: 'You hold it a long time before you put it away.',
          chronicle:
            '{name} is given another Foundation Pill, ten years after the first one failed.',
        },
      },
    ],
  },
];
