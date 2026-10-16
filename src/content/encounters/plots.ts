// Plot encounters (P3.7): the people the world keeps for you come up the road. A grudge's holder
// and someone from your home are filled from the people the world has, never named here, and both
// roles are big, so the card always waits. Drafted for Jan's review.
import type { Template } from './schema.ts';

export const PLOT_ENCOUNTERS: readonly Template[] = [
  {
    id: 'grudge-waits-at-the-ford',
    kind: 'plot',
    title: 'Someone who hates you waits ahead',
    where: { needs: 'grudge' },
    bands: [0, 5],
    weight: 2,
    lurks: true,
    place: {
      traffic: 'road',
      features: [
        { name: 'a ford with stepping stones', tags: ['water', 'crossing'] },
        { name: 'a willow on the far bank', tags: ['cover'] },
      ],
    },
    roles: [
      {
        id: 'enemy',
        name: 'someone who hates you',
        who: { person: 'grudge' },
        motives: ['revenge'],
        big: true,
      },
    ],
    exits: [
      {
        act: 'attack',
        road: 'fight',
        label: 'Settle it at the ford',
        big: true,
        pass: {
          text: 'The water takes the first blow and your hands take the rest. When it is over you stand alone in the shallows with their blood running past your boots.',
          line: 'settles an old grudge at a ford',
          stakes: [{ do: 'loot' }, { do: 'heat', n: 1 }, { do: 'karma', n: -2 }],
        },
        short: {
          text: 'They know you too well, and have planned it for months. You come round on the far bank, purse gone and ribs cracked.',
          line: 'is beaten at a ford by someone who hates them',
          stakes: [
            { do: 'wound', share: 0.3, days: 10 },
            { do: 'robbed', share: 0.5, item: true },
            { do: 'memory', role: 'enemy', row: 'beat-me' },
          ],
        },
      },
      {
        act: 'persuade',
        road: 'talk',
        label: 'Try to talk it down',
        against: 'enemy',
        big: true,
        pass: {
          text: 'You say what happened, plainly, and what you would have done differently. They do not forgive you, but the hand on the hilt loosens.',
          line: 'talks down someone who hates them at a ford',
          stakes: [{ do: 'memory', role: 'enemy', row: 'spared' }],
        },
      },
      {
        act: 'flee',
        road: 'slip',
        label: 'Back off the way you came',
        pass: {
          text: 'You are out of sight in the willows before they have finished crossing.',
          line: 'slips away from someone who hates them at a ford',
        },
        short: {
          text: 'They are faster than you remembered. You are run down a li from the ford and made to pay for it.',
          line: 'is run down by someone who hates them',
          stakes: [
            { do: 'wound', share: 0.2, days: 7 },
            { do: 'robbed', share: 0.3, item: false },
          ],
        },
      },
    ],
    opening:
      'A figure waits on the far bank of the ford under a willow, and does not move when you stop. You know the stance.',
  },
  {
    id: 'home-comes-up-the-road',
    kind: 'plot',
    title: 'Someone from home on the road',
    where: { needs: 'home' },
    bands: [0, 3],
    weight: 2,
    moves: true,
    place: {
      traffic: 'road',
      features: [
        { name: 'a waystone with the March’s mark', tags: ['witnesses', 'fragile'] },
        { name: 'a roadside tea stall', tags: ['burnable', 'witnesses'] },
      ],
    },
    roles: [
      {
        id: 'kin',
        name: 'someone from your home',
        who: { person: 'home' },
        motives: ['family'],
        big: true,
      },
    ],
    exits: [
      {
        act: 'ask',
        road: 'talk',
        label: 'Sit down and ask after home',
        against: 'kin',
        big: true,
        pass: {
          text: 'You sit at the tea stall for an hour. They tell you who has married, who has died, and what the harvest looked like, and you tell them nothing, which they notice.',
          line: 'takes tea with someone from home and asks after the village',
          stakes: [
            { do: 'memory', role: 'kin', row: 'told-new' },
            { do: 'hours', n: 1 },
          ],
        },
      },
      {
        act: 'gift',
        road: 'deal',
        label: 'Press a purse into their hands',
        cost: { stones: 20 },
        big: true,
        pass: {
          text: 'They try to refuse, then take it, eyes down. "For the roof," they say, and you do not say it is for much more.',
          line: 'gives someone from home a purse for the family',
          stakes: [
            { do: 'memory', role: 'kin', row: 'service' },
            { do: 'karma', n: 1 },
          ],
        },
      },
      {
        act: 'hide',
        road: 'slip',
        label: 'Turn your face and keep walking',
        big: true,
        pass: {
          text: 'You pull your hat low and cross the road. They call a name that is not yours, then go quiet.',
          line: 'turns away from someone from home on the road',
          stakes: [{ do: 'memory', role: 'kin', row: 'spurned' }],
        },
        short: {
          text: 'They know the way you walk. "You," they say, and it is half a question, and you see in their face that they will not forget.',
          line: 'is recognised on the road by someone from home',
          stakes: [{ do: 'memory', role: 'kin', row: 'cost-face' }],
        },
      },
    ],
    opening:
      'Someone at the tea stall looks up from their cup, and then keeps looking. It is a face from home, older than you remember.',
  },
];
