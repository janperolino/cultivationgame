// The craft deck (K12, design § Professions, people and powers: Production, commissions and the
// craft deck). Thirteen cards, each naming a person or a door you can go into, set where its field
// or market is (`setAt`, core/craftDeck.ts): {where} is the town or market, {shop} and {keeper} a
// real shop of the craft there, {neighbour} the field's neighbour, {asker} a person in the market,
// {craft}, {crafter} and {tool} the craft. Stones run up the realm curve (`scaled`, written at Qi
// Condensation) and things come at your craft tier. Drafted in the phase talk, Jan's yes; the
// thirteenth, Asked For by Name, is his trope: people come to a crafter whose name is known.
import type { Card } from './schema.ts';

const DECK = 'craft';

export const CRAFT_CARDS: readonly Card[] = [
  {
    id: 'craft-hundred-year-root',
    deck: DECK,
    kind: 'door',
    setAt: 'market',
    title: 'The Hundred-Year Root',
    text: 'A root-digger down from the ridges has sold {keeper} of {shop} in {where} an Old Apricot Kernel a hundred years in the ground. {keeper} will let it go to a {crafter} before the sects hear of it.',
    trigger: { craft: { crafts: ['alchemy', 'farming'] } },
    defaultChoice: 2,
    cooldown: 480,
    choices: [
      {
        label: 'Buy it',
        cost: { stones: 12, scaled: true },
        pass: {
          effects: [
            { do: 'item', id: 'old-apricot-kernel', n: 1, craftTier: true, rarity: 'blue' },
          ],
          text: 'It sits in your palm like a warm stone, its skin ringed with years.',
          chronicle: '{name} buys a hundred-year root in {where}.',
        },
      },
      {
        label: 'Bargain for it',
        check: { attribute: 'fortune', against: 11 },
        cost: { stones: 8, scaled: true },
        pass: {
          effects: [
            { do: 'item', id: 'old-apricot-kernel', n: 1, craftTier: true, rarity: 'blue' },
          ],
          text: 'You talk the price down over two pots of tea, and the root is yours.',
          chronicle: '{name} bargains a hundred-year root out of {keeper} in {where}.',
        },
        fail: {
          effects: [{ do: 'item', id: 'old-apricot-kernel', n: 1, craftTier: true }],
          text: 'A sect buyer comes in mid-haggle and takes it. For your trouble you get a younger kernel.',
          chronicle: '{name} loses a hundred-year root to a sect buyer in {where}.',
        },
      },
      {
        label: 'Let it go',
        pass: {
          effects: [],
          text: 'Someone else will brew with it.',
          chronicle: '{name} lets a hundred-year root go in {where}.',
        },
      },
    ],
  },
  {
    id: 'craft-fire-leaps',
    deck: DECK,
    kind: 'within',
    setAt: 'bench',
    title: 'The Fire Leaps',
    text: 'Halfway through the batch the fire in your {tool} climbs white at its heart and roars. Push it while it burns and the batch could come out finer, or crack the vessel.',
    trigger: { craft: { crafts: ['alchemy', 'refining'], bench: true } },
    cooldown: 360,
    defaultChoice: 1,
    choices: [
      {
        label: 'Push it',
        check: { attribute: 'aptitude', against: 11 },
        pass: {
          effects: [{ do: 'bench', outcome: 'finer' }],
          text: 'You feed it qi and hold it at the edge. The batch drinks the heat and settles finer.',
          chronicle: '{name} rides a flaring fire through a batch.',
        },
        fail: {
          effects: [{ do: 'bench', outcome: 'crack' }],
          text: 'The heat outruns you. A crack runs up the {tool} with a sound like ice.',
          chronicle: '{name} cracks a {tool} pushing a fire too far.',
          kind: 'hurt',
        },
      },
      {
        label: 'Bank it',
        pass: {
          effects: [],
          text: 'You smother the flare. The batch goes on as it was.',
          chronicle: '{name} banks a flaring fire.',
        },
      },
    ],
  },
  {
    id: 'craft-stewards-order',
    deck: DECK,
    kind: 'people',
    setAt: 'market',
    title: 'The Steward’s Order',
    text: '{asker} is asking up and down {where} for a {crafter} who will fill an order without asking who it is for: two batches of what you make most, by the month’s end, through {keeper} of {shop}.',
    trigger: { craft: { crafts: ['alchemy', 'refining', 'talismans'], made: true } },
    defaultChoice: 1,
    cooldown: 480,
    choices: [
      {
        label: 'Take the order',
        pass: {
          effects: [{ do: 'commission', batches: 2, floor: 'white' }],
          text: 'The order is on your list, to hand in at {shop}.',
          chronicle: '{name} takes an order from {asker} in {where}.',
        },
      },
      {
        label: 'Turn it down',
        pass: {
          effects: [],
          text: 'Another {crafter} will take it.',
          chronicle: '{name} turns down an order in {where}.',
        },
      },
    ],
  },
  {
    id: 'craft-asked-by-name',
    deck: DECK,
    kind: 'people',
    setAt: 'renown',
    title: 'Asked For by Name',
    text: '{asker} has come to {shop} in {where} asking for you, not for any {crafter} but the one whose mark they have seen. They want a batch of your best, green or better, and they will pay for the name.',
    trigger: { craft: { crafts: ['alchemy', 'refining', 'talismans'], renown: 3, made: true } },
    defaultChoice: 1,
    cooldown: 360,
    choices: [
      {
        label: 'Accept',
        pass: {
          effects: [{ do: 'commission', batches: 1, floor: 'green' }],
          text: 'You give your word at {shop}. The commission is on your list.',
          chronicle: '{name} is asked for by name in {where}.',
        },
      },
      {
        label: 'Send your regrets',
        pass: {
          effects: [],
          text: 'They leave disappointed, but they leave your name intact.',
          chronicle: '{name} turns down a commission by name in {where}.',
        },
      },
    ],
  },
  {
    id: 'craft-undercut',
    deck: DECK,
    kind: 'door',
    setAt: 'renown',
    title: 'Undercut',
    text: 'A seller from downriver is crying {craft} wares on the street by {shop} in {where} at two thirds of what yours fetch, and {keeper} has started to listen.',
    trigger: { craft: { crafts: ['alchemy', 'refining', 'talismans'], renown: 1 } },
    cooldown: 480,
    defaultChoice: 1,
    choices: [
      {
        label: 'Buy one and look inside',
        check: { attribute: 'aptitude', against: 10 },
        pass: {
          effects: [{ do: 'renown', n: 1 }],
          text: 'Chaff and colour. You show {keeper}, and the street hears of it by evening.',
          chronicle: '{name} shows up a cheat on the street in {where}.',
        },
        fail: {
          effects: [{ do: 'renown', n: -1 }],
          text: 'You can find nothing wrong with it. Your prices look greedy for a season.',
          chronicle: '{name} is undercut on the street in {where}.',
        },
      },
      {
        label: 'Let your work speak',
        pass: {
          effects: [{ do: 'renown', n: -1 }],
          text: 'It speaks more quietly than the man with the cheap tray.',
          chronicle: '{name} is undercut on the street in {where}.',
        },
      },
    ],
  },
  {
    id: 'craft-examiners-month',
    deck: DECK,
    kind: 'named-day',
    setAt: 'market',
    title: 'The Examiner’s Month',
    text: 'The Myriad Crafts Guild’s examiners sit the {craft} tests in the City this month, and {keeper} of {shop} in {where} has a copy of last year’s examiner’s notes on the failures, for a price.',
    trigger: { craft: { crafts: ['alchemy', 'refining', 'talismans'], ungraded: true } },
    defaultChoice: 1,
    cooldown: 720,
    choices: [
      {
        label: 'Buy the notes',
        cost: { stones: 6, scaled: true },
        pass: {
          effects: [{ do: 'insight', n: 40 }],
          text: 'Most failures, the examiner writes, come from rushing the last hour. You read it twice.',
          chronicle: '{name} studies a guild examiner’s notes.',
          kind: 'learned',
        },
      },
      {
        label: 'Sit it cold',
        pass: {
          effects: [],
          text: 'Your own hands will have to do.',
          chronicle: '{name} goes to the guild’s month with nothing but {their} own hands.',
        },
      },
    ],
  },
  {
    id: 'craft-old-masters-slip',
    deck: DECK,
    kind: 'people',
    setAt: 'market',
    title: 'The Old Master’s Slip',
    text: 'In the room behind {shop} in {where}, the old {crafter} who worked there forty years is dying. The family can’t read the recipe slips in the old one’s box and want them gone.',
    trigger: { craft: { crafts: ['alchemy', 'refining', 'talismans'], slip: true } },
    cooldown: 1080,
    choices: [
      {
        label: 'Sit with the old master a day',
        pass: {
          effects: [{ do: 'slip' }],
          text: 'You listen to a life of fires and failures until the voice gives out. At dusk a slip is pressed into your hand.',
          chronicle: '{name} sits with a dying {crafter} in {where} and is given a slip.',
          kind: 'learned',
        },
      },
      {
        label: 'Buy the box from the family',
        cost: { stones: 20, scaled: true },
        pass: {
          effects: [{ do: 'slip' }],
          text: 'Most of it is wrapping paper and grudges. One slip is real.',
          chronicle: '{name} buys an old {crafter}’s slips in {where}.',
          kind: 'learned',
        },
      },
      {
        label: 'Leave them to their grief',
        pass: {
          effects: [],
          text: 'You bow and go.',
          chronicle: '{name} leaves a dying {crafter} to the family in {where}.',
        },
      },
    ],
  },
  {
    id: 'craft-footprints-in-the-furrows',
    deck: DECK,
    kind: 'door',
    setAt: 'field',
    title: 'Footprints in the Furrows',
    text: '{neighbour}, who keeps the field beside yours at {where}, sends word by a carter: someone has been walking your beds at night, and what is ripe will go in a sack within days.',
    trigger: { craft: { field: true } },
    cooldown: 360,
    urgent: { days: 5 },
    defaultChoice: 2,
    choices: [
      {
        label: 'Pay {neighbour} to sit up with a lamp',
        cost: { stones: 3, scaled: true },
        pass: {
          effects: [{ do: 'field', outcome: 'watched' }],
          text: 'The lamp burns in the furrows all week. Nobody comes.',
          chronicle: '{name} has {their} field at {where} watched.',
        },
      },
      {
        label: 'Wait for them yourself',
        when: { id: 'here', min: 1 },
        fight: { roster: 'garrison-deserter', stages: -1 },
        pass: {
          effects: [{ do: 'field', outcome: 'watched' }],
          text: 'You catch him with the sack half full and send him off without it.',
          chronicle: '{name} catches a thief in {their} field at {where}.',
          kind: 'fight',
        },
        fail: {
          effects: [{ do: 'field', outcome: 'robbed' }],
          text: 'He knocks you into the ditch and is gone with the ripest bed.',
          chronicle: '{name} is beaten in {their} own field at {where}.',
          kind: 'hurt',
        },
      },
      {
        label: 'Let it be',
        pass: {
          effects: [{ do: 'field', outcome: 'robbed' }],
          text: 'The ripest bed is dug up and gone.',
          chronicle: 'A thief takes a bed from {name}’s field at {where}.',
          kind: 'hurt',
        },
      },
    ],
  },
  {
    id: 'craft-grey-rot',
    deck: DECK,
    kind: 'door',
    setAt: 'field',
    title: 'Grey Rot',
    text: 'A grey rot is creeping down one furrow of your field at {where}. {neighbour} says the village herbwoman’s purging powder stops it, if it goes down before the rain.',
    trigger: { craft: { field: true } },
    cooldown: 480,
    defaultChoice: 2,
    choices: [
      {
        label: 'Buy the powder',
        cost: { stones: 4, scaled: true },
        pass: {
          effects: [],
          text: 'The powder goes down, and the rot browns and stops.',
          chronicle: '{name} stops a rot in {their} field at {where}.',
        },
      },
      {
        label: 'Pull up the sick bed',
        pass: {
          effects: [{ do: 'field', lose: 1 }],
          text: 'One bed burns on the headland. The rest stay green.',
          chronicle: '{name} burns a sick bed in {their} field at {where}.',
        },
      },
      {
        label: 'Trust the plants',
        check: { attribute: 'aptitude', against: 10 },
        pass: {
          effects: [],
          text: 'The roots hold, and the rot dies back on its own.',
          chronicle: '{name}’s field at {where} shrugs off a rot.',
        },
        fail: {
          effects: [{ do: 'field', lose: 2 }],
          text: 'By the time the rain stops, two beds are grey to the root.',
          chronicle: 'Rot takes two beds of {name}’s field at {where}.',
          kind: 'hurt',
        },
      },
    ],
  },
  {
    id: 'craft-spirit-rain',
    deck: DECK,
    kind: 'sky',
    setAt: 'field',
    title: 'The Spirit Rain',
    text: 'A warm spirit rain is rolling up the valley toward {where}. A field tended through it drinks a season’s growth in a night, {neighbour} says; left alone, it drinks a little.',
    trigger: { craft: { field: true } },
    cooldown: 360,
    defaultChoice: 1,
    choices: [
      {
        label: 'Tend through the night',
        when: { id: 'here', min: 1 },
        pass: {
          effects: [{ do: 'field', age: 90 }],
          text: 'You walk the beds till dawn, sleeves soaked, and they shoot up under your hands.',
          chronicle: '{name} tends {their} field at {where} through a spirit rain.',
        },
      },
      {
        label: 'Let it fall',
        pass: {
          effects: [{ do: 'field', age: 30 }],
          text: 'The beds drink what they can.',
          chronicle: 'A spirit rain falls on {name}’s field at {where}.',
        },
      },
    ],
  },
  {
    id: 'craft-prospectors-lode',
    deck: DECK,
    kind: 'door',
    setAt: 'market',
    title: 'A Prospector’s Lode',
    text: 'A prospector out of the Red Rocks has more ore than mules, and will sell it cheap at the back gate of {shop} in {where} before walking it home.',
    trigger: { craft: { crafts: ['refining'] } },
    defaultChoice: 2,
    cooldown: 480,
    choices: [
      {
        label: 'Buy the lot',
        cost: { stones: 9, scaled: true },
        pass: {
          effects: [{ do: 'item', id: 'red-rocks-iron-ore', n: 10, craftTier: true }],
          text: 'Ten pieces, sorted and wrapped in sacking.',
          chronicle: '{name} buys a prospector’s ore in {where}.',
        },
      },
      {
        label: 'Buy half',
        cost: { stones: 5, scaled: true },
        pass: {
          effects: [{ do: 'item', id: 'red-rocks-iron-ore', n: 5, craftTier: true }],
          text: 'Five pieces, the best of the pile.',
          chronicle: '{name} buys a prospector’s ore in {where}.',
        },
      },
      {
        label: 'Pass',
        pass: {
          effects: [],
          text: 'He walks it home.',
          chronicle: '{name} lets a prospector’s ore go by in {where}.',
        },
      },
    ],
  },
  {
    id: 'craft-blood-cinnabar',
    deck: DECK,
    kind: 'door',
    setAt: 'market',
    title: 'Blood Cinnabar',
    text: '{keeper} of {shop} in {where} has a jar of cinnabar so red it looks wet, ground, they say, from a beast’s heart-stone. Ink like that draws a sheet a band finer.',
    trigger: { craft: { crafts: ['talismans'] } },
    defaultChoice: 1,
    cooldown: 480,
    choices: [
      {
        label: 'Buy the jar',
        cost: { stones: 10, scaled: true },
        pass: {
          effects: [{ do: 'item', id: 'cinnabar-ore', n: 5, craftTier: true, rarity: 'green' }],
          text: 'Five measures, sealed with wax.',
          chronicle: '{name} buys blood cinnabar in {where}.',
        },
      },
      {
        label: 'Pass',
        pass: {
          effects: [],
          text: 'Your own ink will do.',
          chronicle: '{name} passes on blood cinnabar in {where}.',
        },
      },
    ],
  },
  {
    id: 'craft-brothers-complaint',
    deck: DECK,
    kind: 'people',
    setAt: 'renown',
    title: 'The Brother’s Complaint',
    text: 'A drover swears your pill turned his brother’s stomach black, and he has come to {keeper}’s counter at {shop} in {where} with two friends to say so.',
    trigger: { craft: { crafts: ['alchemy'], renown: 1 } },
    cooldown: 480,
    defaultChoice: 1,
    choices: [
      {
        label: 'Pay him off',
        cost: { stones: 6, scaled: true },
        pass: {
          effects: [],
          text: 'He takes the stones and the complaint goes with him.',
          chronicle: '{name} pays off a complaint at {shop} in {where}.',
        },
      },
      {
        label: 'Stand by your make',
        check: { attribute: 'aptitude', against: 11 },
        pass: {
          effects: [{ do: 'renown', n: 1 }],
          text: 'You name every herb in the pill before the crowd. The brother, it turns out, ate river fish.',
          chronicle: '{name} answers a slander at {shop} in {where}.',
        },
        fail: {
          effects: [{ do: 'renown', n: -1 }],
          text: 'You talk well, but the crowd remembers the black stomach.',
          chronicle: '{name} is slandered at {shop} in {where}.',
        },
      },
      {
        label: 'Run them off',
        fight: { roster: 'garrison-deserter', stages: -1 },
        pass: {
          effects: [],
          text: 'They don’t come back to that counter.',
          chronicle: '{name} runs off three men at {shop} in {where}.',
          kind: 'fight',
        },
        fail: {
          effects: [
            { do: 'renown', n: -1 },
            { do: 'injury', ladder: 'body', days: 10 },
          ],
          text: 'They leave you in the street, and the story goes round.',
          chronicle: '{name} is beaten in the street in {where}.',
          kind: 'hurt',
        },
      },
    ],
  },
];
