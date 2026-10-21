// Cards a site you hold brings (K9, design § Sites and formations, Raids; The world comes to you).
// Never drawn: once a month the world asks of each site you hold in the wild whether thieves find
// it and its worth is past its guard, or the land's beasts find it and something draws them (its
// raised qi, a bed past ten years), and queues the card there (core/dwellings.ts). Away, the card
// settles by its default; there, or back before it does, you can face them.
import type { Card } from './schema.ts';
import { RAIDERS, RAIDS } from '../dwellings.ts';

const DECK = 'site';

export const SITE_CARDS: readonly Card[] = [
  {
    id: 'raid-thieves',
    deck: DECK,
    kind: 'door',
    queued: true,
    title: 'Tracks at {where}',
    text: 'Men of the wilds have followed a trail to your {site} at {where}, and they are wondering what is behind the door. Away, you won’t stop them; back before they finish, you can.',
    trigger: {},
    urgent: { days: RAIDS.thievesDays },
    defaultChoice: 0,
    choices: [
      {
        label: 'Let them be',
        pass: {
          effects: [{ do: 'raid', outcome: 'taken' }],
          text: 'They take what they came for, the dearest things first, and are gone by morning.',
          kind: 'hurt',
        },
      },
      {
        label: 'Drive them off',
        when: { id: 'here', min: 1 },
        fight: { roster: RAIDERS.thieves },
        pass: {
          effects: [{ do: 'raid', outcome: 'driven' }],
          text: 'They run with nothing, and they won’t be back this month.',
          chronicle: '{name} drives thieves from {their} own door.',
          kind: 'fight',
        },
        fail: {
          effects: [
            { do: 'raid', outcome: 'taken' },
            { do: 'injury', ladder: 'body', days: 15 },
          ],
          text: 'They put you down and help themselves while you lie there.',
          chronicle: '{name} is beaten at {their} own door by thieves.',
          kind: 'hurt',
        },
      },
    ],
  },
  {
    id: 'raid-beast',
    deck: DECK,
    kind: 'door',
    queued: true,
    title: 'A Beast at the Beds',
    text: 'Something of the wilds has scented the qi at your {site} at {where} and is pawing at the soft earth by the beds. Left to it, it eats the oldest.',
    trigger: {},
    urgent: { days: RAIDS.beastDays },
    defaultChoice: 0,
    choices: [
      {
        label: 'Let it graze',
        pass: {
          effects: [{ do: 'raid', outcome: 'taken' }],
          text: 'It eats its fill and wanders off.',
          kind: 'hurt',
        },
      },
      {
        label: 'Drive it off',
        when: { id: 'here', min: 1 },
        fight: { roster: RAIDERS.beast },
        pass: {
          effects: [{ do: 'raid', outcome: 'driven' }],
          text: 'It breaks off and crashes away into the dark.',
          chronicle: '{name} drives a beast from {their} fields.',
          kind: 'fight',
        },
        fail: {
          effects: [
            { do: 'raid', outcome: 'taken' },
            { do: 'injury', ladder: 'body', days: 15 },
          ],
          text: 'It tramples you into the mud and eats anyway.',
          chronicle: '{name} is trampled by a beast in {their} own fields.',
          kind: 'hurt',
        },
      },
    ],
  },
];
