// The road home (P3.9, design § The world, A trip): reaching home after three or more days out, or
// handing a goal in at its board, brings a coming-back card for the trip in the seclusion card's
// format. Never drawn: core/roadHome.ts queues it with its words, the trip told from what the road,
// the chronicle and the world kept.
import type { Card } from './schema.ts';

export const ROAD_CARDS: readonly Card[] = [
  {
    id: 'road-home',
    deck: 'road',
    kind: 'door',
    queued: true,
    title: '{title}',
    text: '{story}',
    trigger: {},
    choices: [
      {
        label: 'Go on',
        pass: { effects: [], text: '{after}', chronicle: '{line}' },
      },
    ],
  },
];
