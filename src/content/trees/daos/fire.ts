// The Fire Dao: harm and burning (design § The combat Daos). Its side paths reach into alchemy's
// fire control. Drafted in P2.3 from the D2 skeleton; **awaiting Jan's review**.
import { defineDao } from '../dao.ts';

export const FIRE_DAO = defineDao({
  id: 'fire',
  name: 'Fire',
  hanzi: '火',
  what: 'Harm and burning: what your fire does, how long it clings, and what it costs. An action counts the Fire Dao when it is tagged fire or deals fire.',
  lean: 'left',
  tiers: [
    // Tier 1: Qi Condensation
    {
      starter: {
        id: 'fire-first-spark',
        name: 'First Spark',
        hanzi: '初火',
        effects: [{ stat: 'firePower', value: 0.03 }],
        text: 'You learn to hold a flame in the palm without it holding you.',
      },
      gates: [
        {
          id: 'fire1-kindling',
          name: 'Kindling',
          nodes: [
            {
              id: 'fire-dry-tinder',
              name: 'Dry Tinder',
              hanzi: '干柴',
              effects: [{ stat: 'firePower', value: 0.04 }],
              text: 'Qi laid like dry grass in the channels, waiting for the spark.',
            },
            {
              id: 'fire-coal-bed',
              name: 'Coal Bed',
              hanzi: '炭床',
              effects: [{ stat: 'firePower', value: 0.04 }],
              text: 'A bed of embers under the dantian that never quite goes out.',
            },
            {
              id: 'fire-kindling',
              name: 'Kindling',
              hanzi: '引火',
              effects: [
                { stat: 'firePower', value: 0.08 },
                { stat: 'fireHit', value: 0.04 },
              ],
              text: 'Fire leaves you already burning, and finds what it was thrown at.',
            },
          ],
        },
        {
          id: 'fire1-searing',
          name: 'Searing',
          nodes: [
            {
              id: 'fire-hot-breath',
              name: 'Hot Breath',
              hanzi: '热息',
              effects: [{ stat: 'burnBite', value: 0.15 }],
              text: 'Your fire breathes out heat after it lands.',
            },
            {
              id: 'fire-clinging-heat',
              name: 'Clinging Heat',
              hanzi: '附热',
              effects: [{ stat: 'fireCrit', value: 0.01 }],
              text: 'The flame looks for the seam in a robe and stays there.',
            },
            {
              id: 'fire-searing',
              name: 'Searing',
              hanzi: '灼烧',
              effects: [
                { stat: 'burnTurns', value: 1 },
                { stat: 'burnBite', value: 0.25 },
              ],
              text: 'A burn of yours lasts a turn longer and bites harder each turn it lasts.',
            },
          ],
        },
        {
          id: 'fire1-furnace',
          name: 'Furnace Heart',
          nodes: [
            {
              id: 'fire-banked-fire',
              name: 'Banked Fire',
              hanzi: '封火',
              effects: [{ stat: 'fireCost', value: -0.05 }],
              text: 'You cover the fire between casts instead of letting it go out.',
            },
            {
              id: 'fire-steady-draft',
              name: 'Steady Draft',
              hanzi: '稳风',
              effects: [{ stat: 'fireCost', value: -0.05 }],
              text: 'An even draft through the meridians, so no qi roars away up the flue.',
            },
            {
              id: 'fire-furnace-heart',
              name: 'Furnace Heart',
              hanzi: '炉心',
              effects: [
                { stat: 'fireCost', value: -0.1 },
                { stat: 'qiRecovery', value: 0.05 },
              ],
              text: 'Your heart is a furnace that feeds itself: fire costs less, and a defend stokes it.',
            },
          ],
        },
      ],
      sides: [
        {
          id: 'fire1-ember',
          name: 'Ember Sense',
          nodes: [
            {
              id: 'fire-warm-hands',
              name: 'Warm Hands',
              hanzi: '暖手',
              effects: [{ stat: 'fireControl', value: 0.05 }],
              text: 'You can tell a fire’s heat by holding a hand to it, a span away.',
            },
            {
              id: 'fire-reading-coals',
              name: 'Reading Coals',
              hanzi: '观炭',
              effects: [{ stat: 'fireControl', value: 0.05 }],
              text: 'The colour of a coal tells you how long it has left.',
            },
            {
              id: 'fire-ember-sense',
              name: 'Ember Sense',
              hanzi: '识火',
              effects: [
                { stat: 'fireControl', value: 0.1 },
                { stat: 'fireResist', value: 0.05 },
              ],
              text: 'Any alchemist would pay to have your eye on their furnace.',
            },
          ],
        },
      ],
      capstone: {
        id: 'fire-rising-flame',
        name: 'Rising Flame',
        hanzi: '升焰',
        effects: [
          { stat: 'firePower', value: 0.1 },
          { stat: 'spreadBurn', value: 1 },
        ],
        text: 'Your flame climbs: a critical that sets a foe burning leaps to the nearest other.',
      },
    },

    // Tier 2: Foundation Establishment
    {
      starter: {
        id: 'fire-foundation-fire',
        name: 'Foundation Fire',
        hanzi: '筑基火',
        effects: [{ stat: 'firePower', value: 0.04 }],
        text: 'The fire has a hearth now, laid in the foundation itself.',
      },
      gates: [
        {
          id: 'fire2-blue',
          name: 'Blue Flame',
          nodes: [
            {
              id: 'fire-hotter-core',
              name: 'Hotter Core',
              hanzi: '炽芯',
              effects: [{ stat: 'firePower', value: 0.05 }],
              text: 'The heart of the flame whitens.',
            },
            {
              id: 'fire-white-edge',
              name: 'White Edge',
              hanzi: '白缘',
              effects: [{ stat: 'firePierce', value: 0.1 }],
              text: 'A white rim round your fire that water-silk does not turn.',
            },
            {
              id: 'fire-thin-flame',
              name: 'Thin Flame',
              hanzi: '细焰',
              effects: [{ stat: 'firePower', value: 0.05 }],
              text: 'Less flame, more heat: a needle where there was a torch.',
            },
            {
              id: 'fire-blue-flame',
              name: 'Blue Flame',
              hanzi: '青焰',
              effects: [{ stat: 'firePierce', value: 0.3 }],
              text: 'Blue fire, the colour of a hot sky. Fire wards and robes stop a good part less of it.',
            },
          ],
        },
        {
          id: 'fire2-lasting',
          name: 'Lasting Burn',
          nodes: [
            {
              id: 'fire-slow-coals',
              name: 'Slow Coals',
              hanzi: '慢炭',
              effects: [{ stat: 'burnBite', value: 0.1 }],
              text: 'What you set burning burns down slowly, and hot.',
            },
            {
              id: 'fire-deep-heat',
              name: 'Deep Heat',
              hanzi: '深热',
              effects: [{ stat: 'burnTurns', value: 1 }],
              text: 'The burn goes below the skin, where a roll in the dirt won’t reach it.',
            },
            {
              id: 'fire-ash-under-skin',
              name: 'Ash Under the Skin',
              hanzi: '皮下灰',
              effects: [{ stat: 'fireCrit', value: 0.02 }],
              text: 'You strike where the last burn left the flesh thin.',
            },
            {
              id: 'fire-lasting-burn',
              name: 'Lasting Burn',
              hanzi: '久燃',
              effects: [{ stat: 'stackBurn', value: 1 }],
              text: 'A new burn of yours adds to the old instead of replacing it.',
            },
          ],
        },
        {
          id: 'fire2-heart',
          name: 'Flame Heart',
          nodes: [
            {
              id: 'fire-bellows-breath',
              name: 'Bellows Breath',
              hanzi: '风箱息',
              effects: [{ stat: 'fireCost', value: -0.05 }],
              text: 'Each breath pumps the fire; none is wasted.',
            },
            {
              id: 'fire-kiln-lungs',
              name: 'Kiln Lungs',
              hanzi: '窑肺',
              effects: [{ stat: 'fireResist', value: 0.05 }],
              text: 'You breathe smoke the way others breathe mist.',
            },
            {
              id: 'fire-fire-eating',
              name: 'Fire-Eating',
              hanzi: '吞火',
              effects: [{ stat: 'fireCost', value: -0.05 }],
              text: 'Some of the heat you throw comes back down your arm.',
            },
            {
              id: 'fire-flame-heart',
              name: 'Flame Heart',
              hanzi: '焰心',
              effects: [
                { stat: 'fireCost', value: -0.1 },
                { stat: 'fireResist', value: 0.1 },
              ],
              text: 'The flame lives in your heart now; it costs less to call and burns you less.',
            },
          ],
        },
      ],
      sides: [
        {
          id: 'fire2-ash',
          name: 'Ash Walk',
          nodes: [
            {
              id: 'fire-cinder-skin',
              name: 'Cinder Skin',
              hanzi: '烬肤',
              effects: [{ stat: 'fireResist', value: 0.05 }],
              text: 'Your skin takes a coal like a callus takes a nail.',
            },
            {
              id: 'fire-ash-walk',
              name: 'Ash Walk',
              hanzi: '行灰',
              effects: [{ stat: 'fireResist', value: 0.15 }],
              text: 'You walk through a burning hall the way others walk through rain.',
            },
          ],
        },
        {
          id: 'fire2-hand',
          name: 'Furnace Hand',
          nodes: [
            {
              id: 'fire-even-heat',
              name: 'Even Heat',
              hanzi: '匀火',
              effects: [{ stat: 'fireControl', value: 0.05 }],
              text: 'You hold a furnace one breath from too hot for a whole night.',
            },
            {
              id: 'fire-furnace-hand',
              name: 'Furnace Hand',
              hanzi: '炉手',
              effects: [
                { stat: 'fireControl', value: 0.1 },
                { stat: 'craftPrecision', value: 0.08 },
              ],
              text: 'The fire under a cauldron answers your hand before your thought.',
            },
          ],
        },
      ],
      capstone: {
        id: 'fire-sea-of-flame',
        name: 'Sea of Flame',
        hanzi: '火海',
        effects: [
          { stat: 'firePower', value: 0.1 },
          { stat: 'seaOfFlame', value: 1 },
        ],
        text: 'Every burn you set ticks on every burning foe at once: one fire, one sea.',
      },
    },
  ],
});
